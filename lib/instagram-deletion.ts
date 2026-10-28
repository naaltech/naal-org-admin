import 'server-only'
import { deletePublicObject } from '@/lib/r2'
import type { createAdminClient } from '@/lib/supabase-admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Uygulama Instagram'dan kaldırıldığında: yalnızca token silinir, yayımlanmış postlar kalır. */
export async function forgetInstagramUser(db: AdminClient, igUserId: string): Promise<void> {
  const { error } = await db.from('instagram_accounts').delete().eq('ig_user_id', igUserId)
  if (error) throw new Error(error.message)
}

/** Veri silme talebi: token, bu hesaptan aktarılan postlar ve R2'deki görselleri silinir. */
export async function deleteInstagramUserData(db: AdminClient, igUserId: string): Promise<void> {
  await forgetInstagramUser(db, igUserId)

  const { data: posts, error } = await db.from('posts_instagram').select('id, image_links').eq('ig_user_id', igUserId)
  if (error) throw new Error(error.message)

  const urls = posts.flatMap((post) => (post.image_links as { links?: string[] } | null)?.links ?? [])
  await Promise.all(urls.map(deletePublicObject))

  const { error: deleteError } = await db.from('posts_instagram').delete().eq('ig_user_id', igUserId)
  if (deleteError) throw new Error(deleteError.message)
}
