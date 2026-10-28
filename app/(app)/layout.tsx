'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@carbon/react'
import AppShell from '@/components/app-shell'
import { useAuth } from '@/contexts/auth-context'

/** Bu gruptaki tüm sayfalar oturum gerektirir; kontrol sayfa başına değil burada yapılır. */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  if (loading || !user) {
    return <Loading description="Oturum kontrol ediliyor" withOverlay />
  }

  return <AppShell>{children}</AppShell>
}
