// Dergi editörü hesaplarını açar, şifrelerini yeniler ve siler; giriş bilgilerini editöre kulübün kendi
// adresinden (`<kulüp kodu>@naal.org.tr`) e-postayla gönderir. Auth yönetimi service role, e-posta
// `RESEND_API_KEY` ister; ikisi de yalnızca bu fonksiyonda durur. Yetki çağıranın oturumundan gelir:
// süper yönetici her kulübü, kulüp hesabı yalnızca kendisini yönetir, editörler hiçbir şeyi.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { buildCredentialsEmail, type Email } from './email.ts'

const ADMIN_EMAIL = 'admin@naal.org.tr'
const CLUB_DOMAIN = '@naal.org.tr'
// lib/roles.ts'deki MAGAZINE_CLUBS ile aynı olmalı.
const MAGAZINE_CLUBS = ['bilim']
const LOGIN_URL = 'https://admin.naal.org.tr'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Karışabilecek karakterler (0/o, 1/l/i) çıkarıldı; şifre elle yazılabilsin.
const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const EDITOR_COLUMNS = 'id, club_code, email, name, role, created_at'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function canManageClub(email: string, clubCode: string) {
  if (email === ADMIN_EMAIL) return true
  return email.endsWith(CLUB_DOMAIN) && email.slice(0, -CLUB_DOMAIN.length) === clubCode
}

/** xxxx-xxxx-xxxx-xxxx biçiminde ~79 bitlik rastgele şifre. */
function generatePassword() {
  const limit = 256 - (256 % PASSWORD_ALPHABET.length)
  const chars: string[] = []
  while (chars.length < 16) {
    for (const byte of crypto.getRandomValues(new Uint8Array(32))) {
      if (byte < limit && chars.length < 16) chars.push(PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length])
    }
  }
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join('')).join('-')
}

async function sendEmail(email: Email, clubName: string, clubCode: string) {
  const sender = `${clubCode}${CLUB_DOMAIN}`
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${clubName} <${sender}>`,
      reply_to: sender,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  })
  if (response.ok) return null
  const detail = (await response.json().catch(() => null)) as { message?: string } | null
  return detail?.message ?? `HTTP ${response.status}`
}

async function clubName(db: SupabaseClient, clubCode: string) {
  const { data } = await db.from('clubs').select('title').eq('code', clubCode).maybeSingle()
  return (data?.title as string | undefined)?.trim() || clubCode
}

/** Giriş bilgilerini gönderir; başarısızlık hesabı geri almaz, panel şifreyi yine de gösterir. */
async function mailCredentials(
  db: SupabaseClient,
  editor: { club_code: string; email: string; name: string },
  password: string,
  reset: boolean,
) {
  const name = await clubName(db, editor.club_code)
  const email = buildCredentialsEmail({ to: editor.email, name: editor.name, clubName: name, password, loginUrl: LOGIN_URL, reset })
  const error = await sendEmail(email, name, editor.club_code)
  if (error) console.error('Credentials email failed:', error)
  return error
}

// ───── İstek ─────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Yalnızca POST desteklenir' }, 405)

  const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1] ?? ''
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: auth } = await db.auth.getUser(token)
  const caller = auth.user?.email?.trim().toLowerCase()
  if (!caller) return json({ error: 'Oturum gerekli' }, 401)

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const action = body?.action

  try {
    if (action === 'create') {
      const clubCode = typeof body?.club_code === 'string' ? body.club_code.trim() : ''
      const name = typeof body?.name === 'string' ? body.name.trim() : ''
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

      if (!canManageClub(caller, clubCode) || !MAGAZINE_CLUBS.includes(clubCode)) {
        return json({ error: 'Bu kulüp için editör ekleme yetkiniz yok' }, 403)
      }
      if (!name) return json({ error: 'Ad soyad zorunludur' }, 400)
      if (!EMAIL_PATTERN.test(email)) return json({ error: 'Geçerli bir e-posta adresi girin' }, 400)
      if (email.endsWith(CLUB_DOMAIN)) return json({ error: '@naal.org.tr adresleri kulüp hesaplarına ayrılmıştır' }, 400)

      const password = generatePassword()
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: 'magazine_editor', club_code: clubCode },
      })
      if (createError || !created.user) {
        const exists = createError?.code === 'email_exists' || createError?.status === 422
        if (!exists) console.error('Create user failed:', createError)
        return json(
          { error: exists ? 'Bu e-posta adresiyle açılmış bir hesap zaten var' : 'Hesap açılamadı' },
          exists ? 409 : 500,
        )
      }

      const { data: editor, error: insertError } = await db
        .from('club_editors')
        .insert({ club_code: clubCode, user_id: created.user.id, email, name })
        .select(EDITOR_COLUMNS)
        .single()
      if (insertError || !editor) {
        await db.auth.admin.deleteUser(created.user.id)
        throw new Error(insertError?.message ?? 'Editör kaydedilemedi')
      }

      const emailError = await mailCredentials(db, editor, password, false)
      return json({ editor, password, emailed: !emailError })
    }

    if (action === 'reset' || action === 'delete') {
      const id = Number(body?.id)
      const { data: editor } = await db
        .from('club_editors')
        .select('club_code, user_id, email, name')
        .eq('id', id)
        .maybeSingle()
      // Yetkisiz isteklerde kaydın varlığı sızmasın.
      if (!editor || !canManageClub(caller, editor.club_code)) return json({ error: 'Editör bulunamadı' }, 404)

      if (action === 'delete') {
        // Satır auth.users'a bağlı olduğu için hesapla birlikte silinir.
        const { error } = await db.auth.admin.deleteUser(editor.user_id)
        if (error) throw new Error(error.message)
        return json({ ok: true })
      }

      const password = generatePassword()
      const { error } = await db.auth.admin.updateUserById(editor.user_id, { password })
      if (error) throw new Error(error.message)
      const emailError = await mailCredentials(db, editor, password, true)
      return json({ password, emailed: !emailError })
    }

    return json({ error: 'Bilinmeyen işlem' }, 400)
  } catch (error) {
    console.error('Editor accounts error:', error)
    return json({ error: 'İşlem tamamlanamadı' }, 500)
  }
})
