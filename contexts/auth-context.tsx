'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { clubCodeFromEmail, isAdminEmail } from '@/lib/roles'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  /** Süper yönetici hesabı mı. */
  isAdmin: boolean
  /** Kulüp hesabının kodu (e-postanın @ öncesi). */
  clubCode: string
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) console.error('Error getting session:', error)
        if (active) setSession(data.session)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextType>(() => {
    const user = session?.user ?? null
    return {
      user,
      session,
      loading,
      isAdmin: isAdminEmail(user?.email),
      clubCode: clubCodeFromEmail(user?.email),
      signOut: async () => {
        await supabase.auth.signOut()
        setSession(null)
      },
    }
  }, [session, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
