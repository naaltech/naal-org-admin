import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import { canManageClub } from '@/lib/roles'
import { OAUTH_NONCE_COOKIE, authorizeUrl, createOAuthState } from '@/lib/instagram'

/** Instagram yetkilendirme adresini üretir; tarayıcı bu adrese yönlendirilir. */
export async function POST(request: NextRequest) {
  const user = await requireUser(request)
  if (user instanceof NextResponse) return user

  const body = (await request.json().catch(() => ({}))) as { club?: string | null }
  // Boş kulüp okulun kendi hesabıdır.
  const club = body.club || null
  if (!canManageClub(user.email, club)) {
    return NextResponse.json({ error: 'Bu kulüp için yetkiniz yok' }, { status: 403 })
  }

  try {
    const { state, nonce } = createOAuthState(club)
    const response = NextResponse.json({ url: authorizeUrl(request.nextUrl.origin, state) })
    response.cookies.set(OAUTH_NONCE_COOKIE, nonce, {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/api/instagram',
      maxAge: 10 * 60,
    })
    return response
  } catch (error) {
    console.error('Instagram connect error:', error)
    return NextResponse.json({ error: 'Instagram bağlantısı yapılandırılmamış' }, { status: 500 })
  }
}
