import { NextResponse, type NextRequest } from 'next/server'
import { parseSignedRequest } from '@/lib/instagram'
import { forgetInstagramUser } from '@/lib/instagram-deletion'
import { createAdminClient } from '@/lib/supabase-admin'

/** Meta "Deauthorize callback URL": hesap sahibi uygulamayı Instagram'dan kaldırdı. */
export async function POST(request: NextRequest) {
  const signed = (await request.formData().catch(() => null))?.get('signed_request')
  try {
    const payload = typeof signed === 'string' ? parseSignedRequest(signed) : null
    if (!payload) return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })

    await forgetInstagramUser(createAdminClient(), payload.user_id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Instagram deauthorize error:', error)
    return NextResponse.json({ error: 'İşlenemedi' }, { status: 500 })
  }
}
