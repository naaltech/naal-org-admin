import 'server-only'
import { AwsClient } from 'aws4fetch'

let client: AwsClient | null = null

function config() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
    throw new Error('R2_* ortam değişkenleri eksik')
  }
  client ??= new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  })
  return {
    client,
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`,
    publicUrl: R2_PUBLIC_URL.replace(/\/+$/, ''),
  }
}

/** Bu bucket'ın herkese açık URL'ine ait nesneyi siler; başka adresler yok sayılır. */
export async function deletePublicObject(url: string): Promise<void> {
  const { client, endpoint, publicUrl } = config()
  if (!url.startsWith(`${publicUrl}/`)) return
  const response = await client.fetch(`${endpoint}/${url.slice(publicUrl.length + 1)}`, { method: 'DELETE' })
  if (!response.ok && response.status !== 404) {
    throw new Error(`R2 silme hatası (HTTP ${response.status})`)
  }
}

/** Dosyayı Cloudflare R2'ye yazar (aynı anahtar varsa üzerine) ve herkese açık URL'ini döndürür. */
export async function putPublicObject(key: string, body: Uint8Array, contentType: string): Promise<string> {
  const { client, endpoint, publicUrl } = config()
  const response = await client.fetch(`${endpoint}/${key}`, {
    method: 'PUT',
    body: body as BodyInit,
    headers: {
      'content-type': contentType,
      // Anahtar medya kimliğinden türetildiği için içerik hiç değişmez.
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
  if (!response.ok) {
    throw new Error(`R2 yükleme hatası (HTTP ${response.status}): ${(await response.text()).slice(0, 200)}`)
  }
  return `${publicUrl}/${key}`
}
