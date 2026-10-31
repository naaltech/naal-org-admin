'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button, Loading } from '@carbon/react'
import { Logout } from '@carbon/icons-react'
import AppShell from '@/components/app-shell'
import { useAuth } from '@/contexts/auth-context'

function NoAccess() {
  const { user, signOut } = useAuth()
  return (
    <main className="no-access">
      <h1 className="login__title">Panel yetkiniz yok</h1>
      <p className="helper">
        {user?.email} hesabının bu panelde görevi görünmüyor. Yetki kulüp başkanı, başkan yardımcısı ve danışman
        öğretmenlere okulun kayıt sisteminden kendiliğinden verilir. Görevliyseniz kulüp danışmanınıza ya da okul
        yöneticisine başvurun.
      </p>
      <Button kind="tertiary" renderIcon={Logout} onClick={() => void signOut()}>
        Çıkış yap
      </Button>
    </main>
  )
}

/** Bu gruptaki tüm sayfalar oturum gerektirir; kontrol sayfa başına değil burada yapılır. */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, editorClub, noAccess } = useAuth()
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
  if (noAccess) return <NoAccess />

  return <AppShell>{children}</AppShell>
}
