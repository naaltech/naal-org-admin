import { supabase } from '@/lib/supabase'

// Sınırlar supabase/storage.sql'deki bucket ayarlarıyla aynı olmalı.
const BUCKET = 'club-logos'
export const MAX_LOGO_BYTES = 2 * 1024 * 1024
export const MAX_LOGO_LABEL = '2 MB'

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
export const LOGO_ACCEPT = Object.keys(EXTENSIONS).join(',')

/** Logoyu `club-logos/<kulüp kodu>/` altına yükler ve herkese açık URL'ini döndürür. */
export async function uploadClubLogo(clubCode: string, file: File): Promise<string> {
  const ext = EXTENSIONS[file.type]
  if (!ext) throw new Error('Yalnızca PNG, JPEG, WebP veya GIF yüklenebilir.')
  if (file.size > MAX_LOGO_BYTES) throw new Error(`Logo en fazla ${MAX_LOGO_LABEL} olabilir.`)

  // Her yüklemede yeni ad: CDN önbelleği eski logoyu göstermesin.
  const path = `${clubCode}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error(error.message)

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** URL bu bucket'taki bir dosyaya aitse depolama yolunu döndürür (ör. eski ImgBB linkleri için null). */
function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const index = url.indexOf(marker)
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length))
}

/** Artık kullanılmayan logoyu siler; başarısızlık yalnızca loglanır. */
export async function removeClubLogo(url: string | null | undefined): Promise<void> {
  const path = url ? pathFromPublicUrl(url) : null
  if (!path) return
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.warn('Eski logo silinemedi:', error.message)
}
