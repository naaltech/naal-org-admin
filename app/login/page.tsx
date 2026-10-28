'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Form, InlineLoading, InlineNotification, Link, Loading, PasswordInput, Stack, TextInput, Theme } from '@carbon/react'
import { ArrowRight } from '@carbon/icons-react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export default function LoginPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const turnstileRef = useRef<TurnstileInstance>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Oturum açıldığında (bu sayfadan ya da başka sekmeden) yönlendirme tek yerden yapılır.
  useEffect(() => {
    if (!authLoading && user) router.replace('/dashboard')
  }, [user, authLoading, router])

  const resetCaptcha = () => {
    setCaptchaToken(null)
    turnstileRef.current?.reset()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!captchaToken) {
      setError('Lütfen güvenlik doğrulamasını tamamlayın.')
      return
    }

    setSubmitting(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
      options: { captchaToken },
    })
    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials' ? 'E-posta adresi veya şifre hatalı.' : signInError.message,
      )
      resetCaptcha()
    }
    setSubmitting(false)
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
            Kulüp hesabınızın e-posta adresi ve şifresiyle giriş yapın.
          </p>

          <Form onSubmit={handleLogin} aria-label="Yönetici girişi">
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

              <TextInput
                id="email"
                type="email"
                labelText="E-posta adresi"
                placeholder="kulup@naal.org.tr"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />

              <PasswordInput
                id="password"
                labelText="Şifre"
                autoComplete="current-password"
                showPasswordLabel="Şifreyi göster"
                hidePasswordLabel="Şifreyi gizle"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />

              <div className="turnstile">
                {TURNSTILE_SITE_KEY ? (
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    options={{ language: 'tr', theme: 'auto' }}
                    onSuccess={(token) => {
                      setCaptchaToken(token)
                      setError(null)
                    }}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => {
                      setCaptchaToken(null)
                      setError('Güvenlik doğrulaması yüklenemedi. Sayfayı yenileyip tekrar deneyin.')
                    }}
                  />
                ) : (
                  <InlineNotification
                    kind="warning"
                    title="Yapılandırma eksik"
                    subtitle="NEXT_PUBLIC_TURNSTILE_SITE_KEY tanımlı değil."
                    hideCloseButton
                    lowContrast
                  />
                )}
              </div>

              {submitting ? (
                <InlineLoading description="Giriş yapılıyor…" />
              ) : (
                <Button type="submit" renderIcon={ArrowRight} disabled={!captchaToken} size="lg">
                  Giriş yap
                </Button>
              )}
            </Stack>
          </Form>

          <p className="login__footer">
            Bu proje{' '}
            <Link href="https://github.com/naaltech/naal-org-admin/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" size="sm">
              GPLv3
            </Link>{' '}
            ile lisanslanmıştır · Kaynak kod:{' '}
            <Link href="https://github.com/naaltech/naal-org-admin" target="_blank" rel="noopener noreferrer" size="sm">
              GitHub
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
