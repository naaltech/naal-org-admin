import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import { canManageClub, clubCodeFromEmail, isAdminEmail } from '@/lib/roles'
import { createAdminClient } from '@/lib/supabase-admin'

// Token sütunu asla tarayıcıya gönderilmez.
const PUBLIC_COLUMNS =
  'id, club_code, username, token_expires_at, token_refreshed_at, connected_at, last_synced_at, last_error'

/** Kullanıcının görebildiği bağlı hesaplar. */
export async function GET(request: NextRequest) {
  const user = await requireUser(request)
  if (user instanceof NextResponse) return user

  try {
    let query = createAdminClient()
      .from('instagram_accounts')
      .select(PUBLIC_COLUMNS)
      .order('club_code', { nullsFirst: true })
      .order('username')
    if (!isAdminEmail(user.email)) query = query.eq('club_code', clubCodeFromEmail(user.email))
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return NextResponse.json({ accounts: data })
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
    if (!account || !canManageClub(user.email, account.club_code)) {
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
