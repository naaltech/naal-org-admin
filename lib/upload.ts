import { supabase } from '@/lib/supabase'

export { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from '@/lib/upload-limits'

async function postFile(endpoint: string, file: File): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Oturum süresi dolmuş, lütfen tekrar giriş yapın')

  const body = new FormData()
  body.append('file', file)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!response.ok || !result.url) {
    throw new Error(result.error ?? `Yükleme başarısız (HTTP ${response.status})`)
  }
  return result.url
}

/** PDF'i dosya servisine yükler. */
export const uploadPdf = (file: File) => postFile('/api/upload', file)
