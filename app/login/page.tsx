'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Turnstile } from '@marsidev/react-turnstile'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const turnstileRef = useRef<any>(null)

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Check if captcha is completed
    if (!captchaToken) {
      setError('Lütfen güvenlik doğrulamasını tamamlayın')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken
        }
      })

      if (error) {
        setError(error.message)
        // Reset captcha on error
        setCaptchaToken(null)
        turnstileRef.current?.reset()
      } else if (data.user) {
        // Redirect will happen automatically via useEffect when user state updates
        router.push('/dashboard')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      // Reset captcha on error
      setCaptchaToken(null)
      turnstileRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  const onCaptchaVerify = (token: string) => {
    setCaptchaToken(token)
    setError(null)
  }

  const onCaptchaExpire = () => {
    setCaptchaToken(null)
  }

  const onCaptchaError = () => {
    setCaptchaToken(null)
    setError('Güvenlik doğrulamasında hata oluştu. Lütfen tekrar deneyin.')
  }

  // Show loading while checking auth status
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-slate-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-zinc-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo or Brand Area */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-800 to-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hoş Geldiniz</h1>
          <p className="text-gray-600 text-sm">Yönetici arayüzüne erişim için giriş yapın</p>
        </div>

        <Card className="backdrop-blur-sm bg-white/80 border-gray-200/50 shadow-2xl shadow-black/5">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center text-gray-900">
              Yönetici Giriş
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Kulüp bilgilerinizi, kısa linklerinizi ve sertifikalarınızı tek bir yerden yönetin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  E-posta Adresi
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                  className="h-11 border-gray-300 focus:border-gray-500 focus:ring-gray-500/20 transition-all duration-200"
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Şifre
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 border-gray-300 focus:border-gray-500 focus:ring-gray-500/20 transition-all duration-200 pr-10"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Cloudflare Turnstile */}
              <div className="flex justify-center">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                  onSuccess={onCaptchaVerify}
                  onExpire={onCaptchaExpire}
                  onError={onCaptchaError}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 bg-gray-900 hover:bg-gray-800 focus:ring-gray-500/20 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50" 
                disabled={loading || !captchaToken}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Giriş yapılıyor...
                  </span>
                ) : !captchaToken ? (
                  'Güvenlik doğrulamasını tamamlayın'
                ) : (
                  'Giriş Yap'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Nevzat Ayaz Anadolu Lisesi Etkileşim Ağı<br/>Kulüp Yönetim Sistemi
          </p>
          <p className="text-sm text-gray-500">
            Bu proje <a href="https://raw.githubusercontent.com/naaltech/naal-org-admin/refs/heads/main/LICENSE" className="hover:text-gray-600 underline">GPLv3</a> ile lisanslanmıştır.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Açık Kaynak: <a href="https://github.com/naaltech/naal-org-admin" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 underline">GitHub</a>
          </p>
        </div>
      </div>
    </div>
  )
}
