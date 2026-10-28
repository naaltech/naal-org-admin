import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import { canManageClub } from '@/lib/roles'
import { createAdminClient } from '@/lib/supabase-admin'
import { SYNC_BUDGET_MS, syncAccount, type InstagramAccountRow } from '@/lib/instagram-sync'

/** Tek bir hesabı hemen senkronize eder (paneldeki "Şimdi senkronize et"). */
export async function POST(request: NextRequest) {
  const user = await requireUser(request)
  if (user instanceof NextResponse) return user

  const { id } = (await request.json().catch(() => ({}))) as { id?: number }
  try {
    const db = createAdminClient()
    const { data } = await db.from('instagram_accounts').select('*').eq('id', id ?? 0).maybeSingle()
    const account = data as InstagramAccountRow | null
    if (!account || !canManageClub(user.email, account.club_code)) {
      return NextResponse.json({ error: 'Hesap bulunamadı' }, { status: 404 })
    }
    const result = await syncAccount(db, account, Date.now() + SYNC_BUDGET_MS)
    return NextResponse.json({ result })
  } catch (error) {
    console.error('Instagram manual sync error:', error)
    return NextResponse.json({ error: 'Senkronizasyon başarısız' }, { status: 500 })
  }
}
