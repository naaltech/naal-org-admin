import { supabase } from '@/lib/supabase'

/** Kısa link adresi kullanılabiliyorsa `null`, kullanılamıyorsa nedenini döndürür. */
export async function checkShortPath(clubCode: string, path: string): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return 'Oturum süresi dolmuş, lütfen tekrar giriş yapın'

  try {
    const response = await fetch('/api/urls/check', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ club_code: clubCode, path }),
    })
    const result = (await response.json().catch(() => ({}))) as { available?: boolean; reason?: string; error?: string }
    if (!response.ok) return result.error ?? `Adres kontrol edilemedi (HTTP ${response.status})`
    return result.available ? null : (result.reason ?? 'Bu adres kısa link için kullanılamaz.')
  } catch {
    return 'Adres kontrol edilemedi, bağlantınızı kontrol edip tekrar deneyin'
  }
}
