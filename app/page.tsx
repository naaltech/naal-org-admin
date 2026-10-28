'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@carbon/react'
import { useAuth } from '@/contexts/auth-context'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) router.replace(user ? '/dashboard' : '/login')
  }, [user, loading, router])

  return <Loading description="Yönlendiriliyor" withOverlay />
}
