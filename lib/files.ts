import 'server-only'

const REQUEST_TIMEOUT_MS = 20_000

function config() {
  const { FILES_URL, FILES_TOKEN } = process.env
  if (!FILES_URL || !FILES_TOKEN) throw new Error('FILES_URL / FILES_TOKEN tanımlı değil')
  return {
    filesUrl: `${FILES_URL.replace(/\/+$/, '')}/files`,
    headers: { Authorization: `Bearer ${FILES_TOKEN}` },
  }
}

/** Dosya servisindeki nesneyi siler; başka adresler (eski i.ibb.co linkleri gibi) yok sayılır. */
export async function deletePublicObject(url: string): Promise<void> {
  const { filesUrl, headers } = config()
  if (!url.startsWith(`${filesUrl}/`)) return
  const response = await fetch(url, { method: 'DELETE', headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (!response.ok && response.status !== 404) {
    throw new Error(`Dosya silme hatası (HTTP ${response.status})`)
  }
}

/** Dosyayı dosya servisine yazar (aynı anahtar varsa üzerine) ve herkese açık URL'ini döndürür. */
export async function putPublicObject(key: string, body: Uint8Array, contentType: string): Promise<string> {
  const { filesUrl, headers } = config()
  const url = `${filesUrl}/${key}`
  const response = await fetch(url, {
    method: 'PUT',
    body: body as BodyInit,
    headers: { ...headers, 'content-type': contentType },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Dosya yükleme hatası (HTTP ${response.status}): ${(await response.text()).slice(0, 200)}`)
  }
  return url
}
