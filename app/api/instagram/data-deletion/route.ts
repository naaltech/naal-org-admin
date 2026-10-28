import { randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { parseSignedRequest } from '@/lib/instagram'
import { deleteInstagramUserData } from '@/lib/instagram-deletion'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Meta "Data deletion request URL". Silme hemen yapılır; Meta'nın beklediği yanıt, kullanıcının durumu
 * görebileceği adres ve bir onay kodudur.
 */
export async function POST(request: NextRequest) {
  const signed = (await request.formData().catch(() => null))?.get('signed_request')
  try {
    const payload = typeof signed === 'string' ? parseSignedRequest(signed) : null
    if (!payload) return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })

    await deleteInstagramUserData(createAdminClient(), payload.user_id)
    const code = randomBytes(6).toString('hex').toUpperCase()
    console.info('Instagram data deleted', { user: payload.user_id, code })
    return NextResponse.json({
      url: new URL(`/veri-silme?kod=${code}`, request.url).toString(),
      confirmation_code: code,
    })
  } catch (error) {
    console.error('Instagram data deletion error:', error)
    return NextResponse.json({ error: 'İşlenemedi' }, { status: 500 })
  }
}
