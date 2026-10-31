'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, InlineLoading, InlineNotification, Link, Loading, Stack, Theme } from '@carbon/react'
import { ArrowRight } from '@carbon/icons-react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Oturum açıldığında (bu sayfadan ya da başka sekmeden) yönlendirme tek yerden yapılır.
  useEffect(() => {
    if (!authLoading && user) router.replace('/dashboard')
  }, [user, authLoading, router])

  const handleLogin = async () => {
    setSubmitting(true)
    setError(null)
    // Workspace dışı hesapları Google'daki dahili OAuth ekranı reddeder.
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard`, queryParams: { prompt: 'select_account' } },
    })
    if (signInError) {
      setError(signInError.message)
      setSubmitting(false)
    }
  }

  if (authLoading || user) {
    return <Loading description="Oturum kontrol ediliyor" withOverlay />
  }

  return (
    <div className="login">
      <Theme theme="g100" className="login__aside">
        <p className="login__brand">NAAL Etkileşim Ağı</p>
        <h2 className="login__headline">Kulüp bilgileri, kısa linkler ve sertifikalar tek yerde.</h2>
        <p className="helper">Nevzat Ayaz Anadolu Lisesi · Kulüp Yönetim Sistemi</p>
      </Theme>

      <div className="login__main">
        <div className="login__form">
          <h1 className="login__title">Yönetici girişi</h1>
          <p className="helper" style={{ marginBottom: '2rem' }}>
            Okul Google hesabınızla giriş yapın. Kulüp başkanı, başkan yardımcısı ve danışman öğretmenler kulübünü
            kendi hesabıyla yönetir.
          </p>

          <Stack gap={6}>
            {error && (
              <InlineNotification
                kind="error"
                title="Giriş yapılamadı"
                subtitle={error}
                onClose={() => setError(null)}
                lowContrast
              />
            )}

            {submitting ? (
              <InlineLoading description="Google'a yönlendiriliyor…" />
            ) : (
              <Button renderIcon={ArrowRight} size="lg" onClick={() => void handleLogin()}>
                Google ile giriş yap
              </Button>
            )}
          </Stack>

          <p className="login__footer">
            Bu proje{' '}
            <Link href="https://github.com/naaltech/naal-org-admin/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" size="sm">
              GPLv3
            </Link>{' '}
            ile lisanslanmıştır · Kaynak kod:{' '}
            <Link href="https://github.com/naaltech/naal-org-admin" target="_blank" rel="noopener noreferrer" size="sm">
              GitHub
            </Link>{' '}
            ·{' '}
            <Link href="/gizlilik" size="sm">
              KVKK Aydınlatma Metni
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
