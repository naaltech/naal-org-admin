import { NextResponse, type NextRequest } from 'next/server'
import { SHORT_PATH_PATTERN, shortUrl } from '@/lib/format'
import { canManageClub } from '@/lib/roles'
import { panelRoles, requireUser } from '@/lib/server-auth'

const CLUB_CODE_PATTERN = /^[a-z0-9-]+$/

// naal-org/proxy.ts, kısa linki olmayan yolları kulübün sayfasına yönlendirir. Kısa link yalnızca
// bu yönlendirmeye düşen yollarda çalışır; gerçek sayfalar ve kendi sitesi olan alt alan adları elenir.
const FALLBACK_PREFIX = 'https://naal.org.tr/clubs/'

export async function POST(request: NextRequest) {
  const user = await requireUser(request)
  if (user instanceof NextResponse) return user

  const body = (await request.json().catch(() => null)) as { club_code?: unknown; path?: unknown } | null
  const clubCode = typeof body?.club_code === 'string' ? body.club_code : ''
  const path = typeof body?.path === 'string' ? body.path : ''
  if (!CLUB_CODE_PATTERN.test(clubCode) || !SHORT_PATH_PATTERN.test(path)) {
    return NextResponse.json({ error: 'Geçersiz kulüp ya da yol' }, { status: 400 })
  }
  const roles = await panelRoles(user).catch(() => null)
  if (!roles) return NextResponse.json({ error: 'Yetki kontrol edilemedi' }, { status: 500 })
  if (!canManageClub(roles, clubCode)) {
    return NextResponse.json({ error: 'Bu kulüp için yetkiniz yok' }, { status: 403 })
  }

  let response: Response
  try {
    response = await fetch(shortUrl(clubCode, path), {
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
  } catch (error) {
    console.error('Short path check failed:', error)
    return NextResponse.json({ error: 'Adres kontrol edilemedi, biraz sonra tekrar deneyin' }, { status: 502 })
  }

  const { status } = response
  const location = response.headers.get('location') ?? ''
  if (status >= 300 && status < 400 && location.startsWith(FALLBACK_PREFIX)) {
    return NextResponse.json({ available: true })
  }
  if (status >= 500) {
    return NextResponse.json({ error: 'Adres kontrol edilemedi, biraz sonra tekrar deneyin' }, { status: 502 })
  }
  if (status < 400) {
    return NextResponse.json({ available: false, reason: `${shortUrl(clubCode, path)} adresinde zaten bir sayfa var.` })
  }
  return NextResponse.json({
    available: false,
    reason: `${clubCode}.naal.org.tr/${path} kısa link sistemine ulaşmıyor; bu adreste kısa link çalışmaz.`,
  })
}
