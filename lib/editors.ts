import { supabase } from '@/lib/supabase'
import type { ClubEditor } from '@/lib/types'

async function request<T>(method: 'POST' | 'PATCH' | 'DELETE', query: string, body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Oturum süresi dolmuş, lütfen tekrar giriş yapın')

  const response = await fetch(`/api/editors${query}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw new Error(result.error ?? `İstek başarısız (HTTP ${response.status})`)
  return result
}

/** Editör hesabını açar; şifre yalnızca bu yanıtta döner. */
export const createEditor = (input: { club_code: string; name: string; email: string }) =>
  request<{ editor: ClubEditor; password: string }>('POST', '', input)

export const resetEditorPassword = (id: number) => request<{ password: string }>('PATCH', `?id=${id}`)

export const deleteEditor = (id: number) => request<{ ok: true }>('DELETE', `?id=${id}`)
