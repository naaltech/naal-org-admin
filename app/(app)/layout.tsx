'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loading } from '@carbon/react'
import AppShell from '@/components/app-shell'
import { useAuth } from '@/contexts/auth-context'

/** Bu gruptaki tüm sayfalar oturum gerektirir; kontrol sayfa başına değil burada yapılır. */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, editorClub } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  // Dergi editörleri yalnızca dergi sayfasına erişir.
  const editorElsewhere = Boolean(editorClub) && pathname !== '/magazine'

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
    else if (!loading && editorElsewhere) router.replace('/magazine')
  }, [loading, user, editorElsewhere, router])

  if (loading || !user || editorElsewhere) {
    return <Loading description="Oturum kontrol ediliyor" withOverlay />
  }

  return <AppShell>{children}</AppShell>
}
