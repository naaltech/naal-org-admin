import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from '@/lib/upload-limits'

const CATBOX_URL_PREFIX = 'https://files.catbox.moe/'

export async function POST(request: NextRequest) {
  const user = await requireUser(request)
  if (user instanceof NextResponse) return user

  try {
    const file = (await request.formData()).get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Dosya gönderilmedi' }, { status: 400 })
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `Dosya ${MAX_UPLOAD_LABEL}'tan büyük olamaz` }, { status: 413 })
    }
    // MIME türü istemciden gelir; asıl kontrol dosya imzasıdır.
    const magic = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer())
    if (magic !== '%PDF-') {
      return NextResponse.json({ error: 'Yalnızca PDF dosyası yüklenebilir' }, { status: 415 })
    }

    const body = new FormData()
    body.append('reqtype', 'fileupload')
    body.append('fileToUpload', file)
    // Eski adı geriye dönük uyumluluk için okunur; yalnızca sunucuda kullanılır.
    const userHash = process.env.CATBOX_USERHASH ?? process.env.NEXT_PUBLIC_CATBOX_USERHASH
    if (userHash) body.append('userhash', userHash)

    const response = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body })
    const text = (await response.text()).trim()

    if (!response.ok || !text.startsWith(CATBOX_URL_PREFIX)) {
      console.error('Catbox upload failed', { status: response.status, body: text.slice(0, 200), user: user.email })
      return NextResponse.json({ error: 'Catbox yüklemeyi reddetti' }, { status: 502 })
    }
    return NextResponse.json({ url: text })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Yükleme başarısız' }, { status: 500 })
  }
}
