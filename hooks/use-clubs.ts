'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Club } from '@/lib/types'
import { useAuth } from '@/contexts/auth-context'

/**
 * Kullanıcının erişebildiği kulüpler: süper yönetici için hepsi, kulüp yönetimi için seçili kulüp.
 */
export function useClubs() {
  const { isAdmin, clubCode } = useAuth()
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let query = supabase.from('clubs').select('*').order('title', { ascending: true })
    if (!isAdmin) query = query.eq('code', clubCode)

    void query.then(({ data, error: queryError }) => {
      if (cancelled) return
      if (queryError) {
        console.error('Error fetching clubs:', queryError)
        setError('Kulüp bilgileri yüklenemedi.')
      } else {
        setClubs((data ?? []) as Club[])
        setError(data?.length ? null : 'Bu hesaba bağlı bir kulüp bulunamadı.')
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [isAdmin, clubCode])

  return { clubs, setClubs, loading, error }
}

export function clubLabel(club: Pick<Club, 'title' | 'code'>): string {
  return club.title?.trim() || club.code
}
