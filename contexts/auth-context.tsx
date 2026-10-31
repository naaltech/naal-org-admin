'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSuper, type PanelRole } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

/** Kişinin panelde yetkili olduğu kulüp. Hem yönetici hem editörse yönetici sayılır. */
export interface Membership {
  code: string
  editor: boolean
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  /** Süper yönetici mi. */
  isAdmin: boolean
  /** Şu an yönetilen kulübün kodu; süper yönetici ve yalnızca editör olanlar için boş. */
  clubCode: string
  /** Dergi editörüyse dergisini yönettiği kulübün kodu. */
  editorClub: string | null
  /** Birden çok kulüpte görevli olanlar (ör. iki kulübün danışmanı) kulüpler arasında geçer. */
  memberships: Membership[]
  activeClub: string | null
  selectClub: (code: string) => void
  /** Oturum açık ama dizinde bu hesaba tanımlı yetki yok. */
  noAccess: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ACTIVE_CLUB_KEY = 'naal.activeClub'

function storedClub(): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(ACTIVE_CLUB_KEY)
  } catch {
    return null
  }
}

function toMemberships(roles: PanelRole[]): Membership[] {
  const byCode = new Map<string, Membership>()
  for (const { club_code: code, role } of roles) {
    if (role === 'super') continue
    if (role === 'club' || !byCode.has(code)) byCode.set(code, { code, editor: role === 'editor' })
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code, 'tr'))
}

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
  // Roller yüklenene kadar menü ve yönlendirme kararı verilmez.
  const [loaded, setLoaded] = useState<{ email: string; roles: PanelRole[] } | null>(null)
  const [picked, setPicked] = useState<string | null>(storedClub)

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

  useEffect(() => {
    if (!sessionEmail) return
    let cancelled = false
    void supabase
      .from('panel_roles')
      .select('club_code, role')
      .eq('email', sessionEmail)
      .then(({ data, error }) => {
        if (error) console.error('Error fetching roles:', error)
        if (!cancelled) setLoaded({ email: sessionEmail, roles: (data ?? []) as PanelRole[] })
      })
    return () => {
      cancelled = true
    }
  }, [sessionEmail])

  const rolesLoading = Boolean(sessionEmail) && loaded?.email !== sessionEmail

  const value = useMemo<AuthContextType>(() => {
    const user = session?.user ?? null
    const roles = sessionEmail && loaded?.email === sessionEmail ? loaded.roles : []
    const isAdmin = isSuper(roles)
    const memberships = toMemberships(roles)
    const active = isAdmin ? undefined : (memberships.find((m) => m.code === picked) ?? memberships[0])
    return {
      user,
      session,
      loading: loading || rolesLoading,
      isAdmin,
      clubCode: active && !active.editor ? active.code : '',
      editorClub: active?.editor ? active.code : null,
      memberships: isAdmin ? [] : memberships,
      activeClub: active?.code ?? null,
      selectClub: (code) => {
        setPicked(code)
        try {
          window.localStorage.setItem(ACTIVE_CLUB_KEY, code)
        } catch {
          // Seçim yalnızca bu oturumda kalır.
        }
      },
      noAccess: Boolean(user) && !rolesLoading && !isAdmin && memberships.length === 0,
      signOut: async () => {
        await supabase.auth.signOut()
        setSession(null)
      },
    }
  }, [session, loading, rolesLoading, loaded, sessionEmail, picked])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
