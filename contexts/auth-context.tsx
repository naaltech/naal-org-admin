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
  /** Dergi editörüyse dergisini yönettiği kulübün kodu. */
  editorClub: string | null
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
  // Editör kaydı yüklenene kadar menü ve yönlendirme kararı verilmez.
  const [editor, setEditor] = useState<{ email: string; club: string | null } | null>(null)

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

  const sessionEmail = session?.user.email?.trim().toLowerCase() ?? null
  const needsEditorLookup = Boolean(sessionEmail && !clubCodeFromEmail(sessionEmail) && !isAdminEmail(sessionEmail))

  useEffect(() => {
    if (!sessionEmail || !needsEditorLookup) return
    let cancelled = false
    void supabase
      .from('club_editors')
      .select('club_code')
      .eq('email', sessionEmail)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Error fetching editor role:', error)
        if (!cancelled) setEditor({ email: sessionEmail, club: (data?.club_code as string | undefined) ?? null })
      })
    return () => {
      cancelled = true
    }
  }, [sessionEmail, needsEditorLookup])

  const editorLoading = needsEditorLookup && editor?.email !== sessionEmail

  const value = useMemo<AuthContextType>(() => {
    const user = session?.user ?? null
    return {
      user,
      session,
      loading: loading || editorLoading,
      isAdmin: isAdminEmail(user?.email),
      clubCode: clubCodeFromEmail(user?.email),
      editorClub: needsEditorLookup && editor?.email === sessionEmail ? editor.club : null,
      signOut: async () => {
        await supabase.auth.signOut()
        setSession(null)
      },
    }
  }, [session, loading, editorLoading, needsEditorLookup, editor, sessionEmail])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
