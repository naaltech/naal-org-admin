import { supabase } from '@/lib/supabase'
import type { InstagramAccount, InstagramSyncResult } from '@/lib/types'

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Oturum süresi dolmuş, lütfen tekrar giriş yapın')

  const response = await fetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  })
  const result = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw new Error(result.error ?? `İstek başarısız (HTTP ${response.status})`)
  return result
}

export async function listInstagramAccounts(): Promise<InstagramAccount[]> {
  return (await api<{ accounts: InstagramAccount[] }>('/api/instagram/accounts')).accounts
}

/** Tarayıcıyı Instagram girişine yönlendirir; dönüş `/instagram?connected=…` olur. `null` okul hesabıdır. */
export async function startInstagramConnect(club: string | null): Promise<void> {
  const { url } = await api<{ url: string }>('/api/instagram/connect', { method: 'POST', body: JSON.stringify({ club }) })
  window.location.assign(url)
}

export async function syncInstagramAccount(id: number): Promise<InstagramSyncResult> {
  return (await api<{ result: InstagramSyncResult }>('/api/instagram/sync', { method: 'POST', body: JSON.stringify({ id }) })).result
}

export async function disconnectInstagramAccount(id: number): Promise<void> {
  await api(`/api/instagram/accounts?id=${id}`, { method: 'DELETE' })
}
