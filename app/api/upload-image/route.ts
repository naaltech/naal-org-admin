import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from '@/lib/upload-limits'

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

export async function POST(request: NextRequest) {
  const user = await requireUser(request)
  if (user instanceof NextResponse) return user

  const apiKey = process.env.IBB_API_KEY
  if (!apiKey) {
    console.error('IBB_API_KEY is not set')
    return NextResponse.json({ error: 'Görsel yükleme yapılandırılmamış' }, { status: 500 })
  }

  try {
    const file = (await request.formData()).get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Görsel gönderilmedi' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Yalnızca PNG, JPEG, WebP veya GIF yüklenebilir' }, { status: 415 })
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `Görsel ${MAX_UPLOAD_LABEL}'tan büyük olamaz` }, { status: 413 })
    }

    const body = new FormData()
    body.append('image', file)
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      body,
    })
    const data = (await response.json().catch(() => null)) as { success?: boolean; data?: { url?: string } } | null

    if (!response.ok || !data?.success || !data.data?.url) {
      console.error('ImgBB upload failed', { status: response.status, user: user.email })
      return NextResponse.json({ error: 'ImgBB yüklemeyi reddetti' }, { status: 502 })
    }
    return NextResponse.json({ url: data.data.url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Yükleme başarısız' }, { status: 500 })
  }
}
