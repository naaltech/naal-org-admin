import { timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { syncDueAccounts } from '@/lib/instagram-sync'

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  const given = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!secret || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Zamanlanmış senkronizasyon. `netlify/functions/instagram-sync.ts` tarafından düzenli çağrılır;
 * her çağrı süre bütçesi dolana kadar en eski senkronize edilen hesaplardan ilerler.
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }
  try {
    const results = await syncDueAccounts(createAdminClient())
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Instagram cron error:', error)
    return NextResponse.json({ error: 'Senkronizasyon başarısız' }, { status: 500 })
  }
}
