import { randomInt } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import { canManageClub, hasMagazine, isClubEmail } from '@/lib/roles'
import { createAdminClient } from '@/lib/supabase-admin'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Karışabilecek karakterler (0/o, 1/l/i) çıkarıldı; şifre elle yazılabilsin.
const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

/** xxxx-xxxx-xxxx-xxxx biçiminde ~79 bitlik rastgele şifre. */
function generatePassword(): string {
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join(''),
  ).join('-')
}

/** Editörü ve onu yönetme yetkisini doğrular; yetkisizse 404 döner ki kayıtların varlığı sızmasın. */
async function findEditor(db: ReturnType<typeof createAdminClient>, email: string | undefined, id: number) {
  const { data } = await db.from('club_editors').select('id, club_code, user_id, email').eq('id', id).maybeSingle()
  return data && canManageClub(email, data.club_code) ? data : null
}

/** Yeni editör hesabı açar ve üretilen şifreyi bir kez döndürür. */
export async function POST(request: NextRequest) {
  const user = await requireUser(request)
  if (user instanceof NextResponse) return user

  const body = (await request.json().catch(() => ({}))) as { club_code?: string; name?: string; email?: string }
  const clubCode = body.club_code?.trim() ?? ''
  const name = body.name?.trim() ?? ''
  const email = body.email?.trim().toLowerCase() ?? ''

  if (!canManageClub(user.email, clubCode) || !hasMagazine(clubCode)) {
    return NextResponse.json({ error: 'Bu kulüp için editör ekleme yetkiniz yok' }, { status: 403 })
  }
  if (!name) return NextResponse.json({ error: 'Ad soyad zorunludur' }, { status: 400 })
  if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin' }, { status: 400 })
  if (isClubEmail(email)) {
    return NextResponse.json({ error: '@naal.org.tr adresleri kulüp hesaplarına ayrılmıştır' }, { status: 400 })
  }

  try {
    const db = createAdminClient()
    const password = generatePassword()
    const { data: created, error: createError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'magazine_editor', club_code: clubCode },
    })
    if (createError || !created.user) {
      const exists = createError?.code === 'email_exists' || createError?.status === 422
      return NextResponse.json(
        { error: exists ? 'Bu e-posta adresiyle açılmış bir hesap zaten var' : 'Hesap açılamadı' },
        { status: exists ? 409 : 500 },
      )
    }

    const { data: editor, error: insertError } = await db
      .from('club_editors')
      .insert({ club_code: clubCode, user_id: created.user.id, email, name })
      .select('id, club_code, email, name, role, created_at')
      .single()
    if (insertError) {
      await db.auth.admin.deleteUser(created.user.id)
      throw new Error(insertError.message)
    }
    return NextResponse.json({ editor, password })
  } catch (error) {
    console.error('Editor create error:', error)
    return NextResponse.json({ error: 'Editör eklenemedi' }, { status: 500 })
  }
}

/** Editöre yeni şifre üretir. */
export async function PATCH(request: NextRequest) {
  const user = await requireUser(request)
  if (user instanceof NextResponse) return user

  try {
    const db = createAdminClient()
    const editor = await findEditor(db, user.email, Number(request.nextUrl.searchParams.get('id')))
    if (!editor) return NextResponse.json({ error: 'Editör bulunamadı' }, { status: 404 })

    const password = generatePassword()
    const { error } = await db.auth.admin.updateUserById(editor.user_id, { password })
    if (error) throw new Error(error.message)
    return NextResponse.json({ password })
  } catch (error) {
    console.error('Editor password reset error:', error)
    return NextResponse.json({ error: 'Şifre sıfırlanamadı' }, { status: 500 })
  }
}

/** Editör hesabını tamamen siler; satır auth.users'a bağlı olduğu için onunla birlikte gider. */
export async function DELETE(request: NextRequest) {
  const user = await requireUser(request)
  if (user instanceof NextResponse) return user

  try {
    const db = createAdminClient()
    const editor = await findEditor(db, user.email, Number(request.nextUrl.searchParams.get('id')))
    if (!editor) return NextResponse.json({ error: 'Editör bulunamadı' }, { status: 404 })

    const { error } = await db.auth.admin.deleteUser(editor.user_id)
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Editor delete error:', error)
    return NextResponse.json({ error: 'Editör silinemedi' }, { status: 500 })
  }
}
