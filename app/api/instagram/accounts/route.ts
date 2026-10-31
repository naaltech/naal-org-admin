import { NextResponse, type NextRequest } from 'next/server'
import { panelRoles, requireUser } from '@/lib/server-auth'
import { instagramConfigured } from '@/lib/instagram'
import { canManageClub, isSuper, managedClubs } from '@/lib/roles'
import { createAdminClient } from '@/lib/supabase-admin'

// Token sütunu asla tarayıcıya gönderilmez.
const PUBLIC_COLUMNS =
  'id, club_code, username, token_expires_at, token_refreshed_at, connected_at, last_synced_at, last_error'

/** Kullanıcının görebildiği bağlı hesaplar. */
export async function GET(request: NextRequest) {
  const user = await requireUser(request)
  if (user instanceof NextResponse) return user
  if (!instagramConfigured()) return NextResponse.json({ available: false, accounts: [] })

  try {
    const roles = await panelRoles(user)
    let query = createAdminClient()
      .from('instagram_accounts')
      .select(PUBLIC_COLUMNS)
      .order('club_code', { nullsFirst: true })
      .order('username')
    if (!isSuper(roles)) query = query.in('club_code', managedClubs(roles))
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return NextResponse.json({ available: true, accounts: data })
  } catch (error) {
    console.error('Instagram accounts error:', error)
    return NextResponse.json({ error: 'Hesaplar yüklenemedi' }, { status: 500 })
  }
}

/** Bağlantıyı kaldırır. Daha önce aktarılan postlar ve görseller silinmez. */
export async function DELETE(request: NextRequest) {
  const user = await requireUser(request)
  if (user instanceof NextResponse) return user

  const id = Number(request.nextUrl.searchParams.get('id'))
  try {
    const db = createAdminClient()
    const { data: account } = await db.from('instagram_accounts').select('club_code').eq('id', id).maybeSingle()
    if (!account || !canManageClub(await panelRoles(user), account.club_code)) {
      return NextResponse.json({ error: 'Hesap bulunamadı' }, { status: 404 })
    }
    const { error } = await db.from('instagram_accounts').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Instagram disconnect error:', error)
    return NextResponse.json({ error: 'Bağlantı kaldırılamadı' }, { status: 500 })
  }
}
