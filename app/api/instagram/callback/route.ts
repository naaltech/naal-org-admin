import { NextResponse, type NextRequest } from 'next/server'
import { OAUTH_NONCE_COOKIE, exchangeCode, fetchProfile, verifyOAuthState } from '@/lib/instagram'
import { createAdminClient } from '@/lib/supabase-admin'

/** Instagram'ın yönlendirdiği adres. Sonuç `/instagram` sayfasına sorgu parametresiyle iletilir. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const back = (query: Record<string, string>) => {
    const response = NextResponse.redirect(new URL(`/instagram?${new URLSearchParams(query)}`, request.url))
    response.cookies.delete({ name: OAUTH_NONCE_COOKIE, path: '/api/instagram' })
    return response
  }

  if (params.get('error')) {
    return back({ error: params.get('error_reason') === 'user_denied' ? 'İzin verilmedi.' : 'Instagram girişi tamamlanmadı.' })
  }

  const state = verifyOAuthState(params.get('state') ?? '', request.cookies.get(OAUTH_NONCE_COOKIE)?.value)
  // Instagram koda `#_` ekleyebiliyor.
  const code = params.get('code')?.replace(/#_$/, '')
  if (!state || !code) {
    return back({ error: 'Bağlantı isteğinin süresi dolmuş veya geçersiz. Lütfen tekrar deneyin.' })
  }

  try {
    const token = await exchangeCode(request.nextUrl.origin, code)
    const profile = await fetchProfile(token.accessToken)
    const now = new Date().toISOString()

    // Hesap daha önce başka bir kulübe bağlandıysa yeni kulübe taşınır.
    const { error } = await createAdminClient()
      .from('instagram_accounts')
      .upsert(
        {
          club_code: state.club,
          ig_user_id: profile.user_id,
          username: profile.username,
          name: profile.name ?? null,
          access_token: token.accessToken,
          token_expires_at: token.expiresAt.toISOString(),
          token_refreshed_at: now,
          connected_at: now,
          last_error: null,
        },
        { onConflict: 'ig_user_id' },
      )
    if (error) throw new Error(error.message)

    return back({ connected: profile.username })
  } catch (error) {
    console.error('Instagram callback error:', error)
    return back({ error: 'Instagram hesabı bağlanamadı. Hesabın Business veya Creator olduğundan emin olun.' })
  }
}
