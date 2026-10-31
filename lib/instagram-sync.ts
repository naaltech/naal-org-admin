import 'server-only'
import sharp from 'sharp'
import { fetchRecentMedia, refreshToken, type InstagramMedia } from '@/lib/instagram'
import { nextTokenRefresh } from '@/lib/instagram-token'
import { putPublicObject } from '@/lib/files'
import type { createAdminClient } from '@/lib/supabase-admin'
import type { InstagramSyncResult as SyncResult } from '@/lib/types'

type AdminClient = ReturnType<typeof createAdminClient>

/** Her senkronizasyonda hesap başına bakılan en yeni post sayısı. */
const POST_LIMIT = Number(process.env.INSTAGRAM_POST_LIMIT) || 20
/**
 * Bir istekte senkronizasyona ayrılan süre. Sunucusuz fonksiyonlar ~10 sn'de kesilir; süre dolunca
 * kalan postlar bir sonraki çalıştırmada devam eder.
 */
export const SYNC_BUDGET_MS = Number(process.env.INSTAGRAM_SYNC_BUDGET_MS) || 7000

export interface InstagramAccountRow {
  id: number
  club_code: string | null
  ig_user_id: string
  username: string
  name: string | null
  access_token: string
  token_expires_at: string
  token_refreshed_at: string
  connected_at: string
  last_synced_at: string | null
  last_error: string | null
}

/** Süresi yaklaşan token'ı yeniler. */
async function freshToken(db: AdminClient, account: InstagramAccountRow): Promise<string> {
  if (nextTokenRefresh(account.token_expires_at, account.token_refreshed_at).getTime() > Date.now()) {
    return account.access_token
  }

  const token = await refreshToken(account.access_token)
  const { error } = await db
    .from('instagram_accounts')
    .update({
      access_token: token.accessToken,
      token_expires_at: token.expiresAt.toISOString(),
      token_refreshed_at: new Date().toISOString(),
    })
    .eq('id', account.id)
  if (error) throw new Error(`Token kaydedilemedi: ${error.message}`)
  return token.accessToken
}

/** Videolarda yalnızca kapak görseli alınır. */
function imageSources(media: InstagramMedia): string[] {
  const items = media.media_type === 'CAROUSEL_ALBUM' ? (media.children?.data ?? []) : [media]
  return items
    .map((item) => (item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url))
    .filter((url): url is string => Boolean(url))
}

/** Eski instagrapi script'i linkleri her zaman `/p/<kod>/` biçiminde kaydediyordu. */
function legacyPostLink(permalink: string): string | null {
  const code = permalink.match(/\/(?:p|reel|tv)\/([^/?#]+)/)?.[1]
  return code ? `https://www.instagram.com/p/${code}/` : null
}

async function uploadAsWebp(sourceUrl: string, key: string): Promise<string> {
  const response = await fetch(sourceUrl)
  if (!response.ok) throw new Error(`Görsel indirilemedi (HTTP ${response.status})`)
  const webp = await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate()
    .resize({ width: 1080, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
  return putPublicObject(key, webp, 'image/webp')
}

/** Kayıtlı olmayan medya kimlikleri; eski script'in satırları post linkiyle eşleştirilir. */
async function filterNewMedia(db: AdminClient, media: InstagramMedia[]): Promise<InstagramMedia[]> {
  if (media.length === 0) return []
  const links = media.flatMap((m) => [m.permalink, legacyPostLink(m.permalink)]).filter((l): l is string => Boolean(l))
  const [byId, byLink] = await Promise.all([
    db.from('posts_instagram').select('ig_media_id').in('ig_media_id', media.map((m) => m.id)),
    db.from('posts_instagram').select('post_link').in('post_link', links),
  ])
  if (byId.error || byLink.error) throw new Error((byId.error ?? byLink.error)!.message)

  const knownIds = new Set(byId.data.map((r) => r.ig_media_id as string))
  const knownLinks = new Set(byLink.data.map((r) => r.post_link as string))
  return media.filter(
    (m) => !knownIds.has(m.id) && !knownLinks.has(m.permalink) && !knownLinks.has(legacyPostLink(m.permalink) ?? ''),
  )
}

/** Hesabın yeni postlarını dosya servisine ve `posts_instagram` tablosuna aktarır; `deadline` aşılınca durur. */
export async function syncAccount(db: AdminClient, account: InstagramAccountRow, deadline: number): Promise<SyncResult> {
  const result: SyncResult = { username: account.username, added: 0, failed: 0, complete: true }
  try {
    const token = await freshToken(db, account)
    const fresh = await filterNewMedia(db, await fetchRecentMedia(token, POST_LIMIT))

    for (const media of fresh) {
      if (Date.now() > deadline) {
        result.complete = false
        break
      }
      let imageLinks: string[]
      try {
        imageLinks = await Promise.all(
          imageSources(media).map((url, i) => uploadAsWebp(url, `instagram/${account.club_code ?? 'okul'}/${media.id}_${i + 1}.webp`)),
        )
      } catch (error) {
        console.error('Instagram image upload failed', { media: media.id, error })
        result.failed++
        continue
      }

      const { error } = await db.from('posts_instagram').upsert(
        {
          ig_media_id: media.id,
          club_code: account.club_code,
          ig_user_id: account.ig_user_id,
          name: account.name || account.username,
          user_name: media.username ?? account.username,
          time: media.timestamp,
          description: media.caption ?? '',
          image_links: { links: imageLinks },
          post_link: media.permalink,
          media_type: media.media_type,
        },
        { onConflict: 'ig_media_id', ignoreDuplicates: true },
      )
      if (error) throw new Error(`Post kaydedilemedi: ${error.message}`)
      result.added++
    }

    await db
      .from('instagram_accounts')
      .update({ last_error: null, ...(result.complete && { last_synced_at: new Date().toISOString() }) })
      .eq('id', account.id)
  } catch (error) {
    result.complete = false
    result.error = error instanceof Error ? error.message : String(error)
    console.error('Instagram sync failed', { account: account.username, error: result.error })
    await db.from('instagram_accounts').update({ last_error: result.error }).eq('id', account.id)
  }
  return result
}

/**
 * En uzun süredir senkronize edilmeyen hesaptan başlayarak süre bitene kadar ilerler. Hata veren hesapların
 * `last_synced_at` değeri güncellenmediği için en sona alınır; yoksa her çalıştırmanın süresini onlar tüketir.
 */
export async function syncDueAccounts(db: AdminClient, budgetMs = SYNC_BUDGET_MS): Promise<SyncResult[]> {
  const deadline = Date.now() + budgetMs
  const { data, error } = await db
    .from('instagram_accounts')
    .select('*')
    .order('last_synced_at', { ascending: true, nullsFirst: true })
  if (error) throw new Error(error.message)

  const accounts = (data as InstagramAccountRow[]).toSorted((a, b) => Number(Boolean(a.last_error)) - Number(Boolean(b.last_error)))

  const results: SyncResult[] = []
  for (const account of accounts) {
    if (Date.now() > deadline) break
    results.push(await syncAccount(db, account, deadline))
  }
  return results
}
