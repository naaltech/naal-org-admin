import { NextResponse, type NextRequest } from 'next/server'
import { putPublicObject } from '@/lib/files'
import { isSuper, managedClubs } from '@/lib/roles'
import { panelRoles, requireUser } from '@/lib/server-auth'
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from '@/lib/upload-limits'

export async function POST(request: NextRequest) {
  const user = await requireUser(request)
  if (user instanceof NextResponse) return user

  try {
    const roles = await panelRoles(user)
    if (!isSuper(roles) && managedClubs(roles).length === 0) {
      return NextResponse.json({ error: 'Yükleme yetkiniz yok' }, { status: 403 })
    }

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

    const key = `certificates/${crypto.randomUUID()}.pdf`
    const url = await putPublicObject(key, new Uint8Array(await file.arrayBuffer()), 'application/pdf')
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Yükleme başarısız' }, { status: 500 })
  }
}
