// Kulüp başvurularını Tally'den okur, siler ve sonucu başvurana e-postayla bildirir. Tally anahtarı
// ve SMTP hesabı yalnızca bu fonksiyonun gizli değişkenlerinde (`TALLY_API_KEY`, `SMTP_*`) durur.
// Yetki, kullanıcının oturumuyla `club_forms` tablosundan gelir: RLS kulübe yalnızca kendi formlarını
// döndürür, süper yöneticiye hepsini.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import nodemailer, { type Transporter } from 'npm:nodemailer@7.0.13'
import { answerText, buildEmail, type Email, findEmail, findName, type Question } from './email.ts'

const TALLY_API = 'https://api.tally.so'
const PAGE_SIZE = 500
const SENDER = 'basvuru@naal.org.tr'
const SENDER_DOMAIN = 'naal.org.tr'
// Edge Function'lar 25 ve 587 portlarına çıkamaz.
const SMTP_PORT = 465
const MAX_NOTIFY = 25

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Status = 'pending' | 'accepted' | 'rejected'

interface TallyQuestion {
  id: string
  type: string
  title: string | null
  fields?: { title?: string | null }[]
}

interface TallySubmission {
  id: string
  submittedAt: string
  responses: { questionId: string; answer: unknown }[]
}

interface ClubForm {
  form_id: string
  club_code: string
  title: string
  since: string
  adds_members: boolean
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function tally(path: string, init?: RequestInit) {
  return fetch(`${TALLY_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${Deno.env.get('TALLY_API_KEY')}` },
  })
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>
    return String(object.url ?? object.name ?? JSON.stringify(object))
  }
  return String(value)
}

/** Seçenek listeleri (çoklu seçim, dosyalar) dizi olarak kalır ki panel seçeneğe göre filtreleyebilsin. */
function formatAnswer(answer: unknown): string | string[] {
  return Array.isArray(answer) ? answer.map(formatValue).filter(Boolean) : formatValue(answer)
}

function toQuestion(q: TallyQuestion): Question {
  return { id: q.id, type: q.type, title: q.title ?? q.fields?.[0]?.title ?? '' }
}

function toAnswers(s: TallySubmission) {
  return Object.fromEntries(s.responses.map((r) => [r.questionId, formatAnswer(r.answer)]))
}

/**
 * `draft` yalnızca önizlemede verilir: panel durumu kaydetmeden önce gidecek e-postayı gösterir.
 * Gönderimde her zaman kayıtlı durum ve mesaj kullanılır.
 */
async function prepareEmail(
  supabase: SupabaseClient,
  form: ClubForm,
  submissionId: string,
  draft?: { status: Status; message: string },
) {
  const { data: review } = await supabase
    .from('application_reviews')
    .select('status, message, notified_status')
    .eq('form_id', form.form_id)
    .eq('submission_id', submissionId)
    .maybeSingle()
  const status = draft?.status ?? (review?.status as Status | undefined)
  const message = draft ? draft.message : ((review?.message as string | undefined) ?? '')
  if (status !== 'accepted' && status !== 'rejected') {
    return { error: 'Önce başvuruyu Kabul ya da Red olarak işaretleyin.' }
  }

  const response = await tally(`/forms/${form.form_id}/submissions/${submissionId}`)
  if (!response.ok) return { error: `Başvuru Tally'den alınamadı (HTTP ${response.status})` }
  const data = (await response.json()) as { questions: TallyQuestion[]; submission: TallySubmission }
  const questions = data.questions.map(toQuestion)
  const answers = toAnswers(data.submission)

  const to = findEmail(questions, answers)
  if (!to) return { error: 'Başvuruda geçerli bir e-posta adresi yok.' }

  const { data: club } = await supabase.from('clubs').select('title').eq('code', form.club_code).maybeSingle()
  const clubName = (club?.title as string | undefined)?.trim() || form.club_code
  // club_settings yalnızca kulübün kendisine ve süper yöneticiye açık; link herkese açık profilde durmaz.
  const { data: settings } = await supabase
    .from('club_settings')
    .select('whatsapp_url')
    .eq('club_code', form.club_code)
    .maybeSingle()

  const email = buildEmail({
    to,
    clubName,
    formTitle: form.title,
    status,
    message: message.trim(),
    name: findName(questions, answers),
    submittedAt: data.submission.submittedAt,
    communityUrl: (settings?.whatsapp_url as string | undefined) ?? '',
    details: questions
      .map((q) => ({ title: q.title, value: answerText(answers[q.id]).trim() }))
      .filter((d) => d.title && d.value),
  })
  return { email, clubName, status, alreadyNotified: review?.notified_status === status }
}

function smtpTransport() {
  const host = Deno.env.get('SMTP_HOST')
  const user = Deno.env.get('SMTP_USER')
  const pass = Deno.env.get('SMTP_PASSWORD')
  if (!host || !user || !pass) return null
  return nodemailer.createTransport({
    host,
    port: SMTP_PORT,
    secure: true,
    // Google EHLO'da alan adı ister.
    name: SENDER_DOMAIN,
    auth: { user, pass },
    pool: true,
    maxConnections: 1,
  })
}

async function sendEmail(smtp: Transporter, email: Email, clubName: string, reference: string) {
  try {
    await smtp.sendMail({
      from: { name: clubName, address: SENDER },
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      // Aynı başvurunun aynı sonucu aynı kimlikle gider; Gmail ikinci kopyayı göstermez.
      messageId: `${reference}@${SENDER_DOMAIN}`,
    })
    return null
  } catch (e) {
    const { responseCode } = e as { responseCode?: number }
    console.error(`SMTP: ${(e as Error).message}`)
    return responseCode ? `SMTP ${responseCode}` : 'SMTP sunucusuna bağlanılamadı'
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// ───── İstek ─────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Yalnızca POST desteklenir' }, 405)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const formId = typeof body?.form_id === 'string' ? body.form_id : ''
  const { data: form } = await supabase
    .from('club_forms')
    .select('form_id, club_code, title, since, adds_members')
    .eq('form_id', formId)
    .maybeSingle<ClubForm>()
  if (!form) return json({ error: 'Form bulunamadı ya da bu forma erişim yetkiniz yok' }, 404)

  const validId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9]+$/.test(value)

  if (body?.action === 'delete') {
    const submissionId = body.submission_id
    if (!validId(submissionId)) return json({ error: 'Geçersiz başvuru' }, 400)

    const response = await tally(`/forms/${form.form_id}/submissions/${submissionId}`, { method: 'DELETE' })
    if (!response.ok && response.status !== 404) {
      return json({ error: `Tally başvuruyu silemedi (HTTP ${response.status})` }, 502)
    }
    await supabase.from('application_reviews').delete().eq('submission_id', submissionId)
    return json({ deleted: true })
  }

  if (body?.action === 'preview') {
    if (!validId(body.submission_id)) return json({ error: 'Geçersiz başvuru' }, 400)
    const draft =
      body.status === 'accepted' || body.status === 'rejected'
        ? { status: body.status as Status, message: typeof body.message === 'string' ? body.message.slice(0, 2000) : '' }
        : undefined
    const prepared = await prepareEmail(supabase, form, body.submission_id, draft)
    if ('error' in prepared) return json({ error: prepared.error }, 422)
    return json({ email: prepared.email, alreadyNotified: prepared.alreadyNotified })
  }

  // Üyelik formunda kabul edilen başvuran dizinde kulübe üye yapılır; istek kullanıcının oturumuyla yazılır.
  if (body?.action === 'enroll') {
    if (!validId(body.submission_id)) return json({ error: 'Geçersiz başvuru' }, 400)
    if (!form.adds_members) return json({ requested: false })
    const prepared = await prepareEmail(supabase, form, body.submission_id)
    if ('error' in prepared) return json({ error: prepared.error }, 422)
    if (prepared.status !== 'accepted') return json({ requested: false })

    const { error } = await supabase
      .from('directory_commands')
      .insert({ kind: 'add_member', club_code: form.club_code, email: prepared.email.to.trim().toLowerCase() })
    if (error && error.code !== '23505') return json({ error: 'Üyelik isteği yazılamadı' }, 500)
    return json({ requested: true })
  }

  if (body?.action === 'notify') {
    const ids = Array.isArray(body.submission_ids) ? body.submission_ids.filter(validId) : []
    if (ids.length === 0 || ids.length > MAX_NOTIFY) {
      return json({ error: `Tek seferde 1 ile ${MAX_NOTIFY} arasında başvuru bildirilebilir` }, 400)
    }

    const smtp = smtpTransport()
    if (!smtp) return json({ error: 'E-posta sunucusu ayarlı değil' }, 500)

    const results: { submission_id: string; to?: string; error?: string }[] = []
    for (const [index, submissionId] of ids.entries()) {
      // Google art arda gönderimi kısıtlar.
      if (index > 0) await sleep(600)
      const prepared = await prepareEmail(supabase, form, submissionId)
      if ('error' in prepared) {
        results.push({ submission_id: submissionId, error: prepared.error })
        continue
      }
      const error = await sendEmail(smtp, prepared.email, prepared.clubName, `${submissionId}-${prepared.status}`)
      if (error) {
        results.push({ submission_id: submissionId, error: `E-posta gönderilemedi: ${error}` })
        continue
      }
      await supabase
        .from('application_reviews')
        .update({ notified_at: new Date().toISOString(), notified_status: prepared.status })
        .eq('submission_id', submissionId)
      results.push({ submission_id: submissionId, to: prepared.email.to })
    }
    smtp.close()
    return json({ results })
  }

  const questions = new Map<string, Question>()
  const submissions: { id: string; submittedAt: string; answers: Record<string, string | string[]> }[] = []

  for (let page = 1; ; page++) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      filter: 'completed',
      startDate: `${form.since}T00:00:00.000Z`,
    })
    const response = await tally(`/forms/${form.form_id}/submissions?${params}`)
    if (!response.ok) return json({ error: `Tally başvuruları getiremedi (HTTP ${response.status})` }, 502)

    const data = (await response.json()) as {
      hasMore: boolean
      questions: TallyQuestion[]
      submissions: TallySubmission[]
    }
    for (const q of data.questions) questions.set(q.id, toQuestion(q))
    for (const s of data.submissions) submissions.push({ id: s.id, submittedAt: s.submittedAt, answers: toAnswers(s) })
    if (!data.hasMore) break
  }

  return json({ questions: [...questions.values()], submissions })
})
