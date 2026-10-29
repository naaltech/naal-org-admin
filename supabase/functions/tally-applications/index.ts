// Kulüp başvurularını Tally'den okur, siler ve sonucu başvurana e-postayla bildirir. Tally ve Resend
// anahtarları yalnızca bu fonksiyonun gizli değişkenlerinde (`TALLY_API_KEY`, `RESEND_API_KEY`) durur.
// Yetki, kullanıcının oturumuyla `club_forms` tablosundan gelir: RLS kulübe yalnızca kendi formlarını
// döndürür, süper yöneticiye hepsini.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { answerText, buildEmail, type Email, findEmail, findName, type Question } from './email.ts'

const TALLY_API = 'https://api.tally.so'
const PAGE_SIZE = 500
const SENDER = 'basvuru@naal.org.tr'
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

  const email = buildEmail({
    to,
    clubName,
    formTitle: form.title,
    status,
    message: message.trim(),
    name: findName(questions, answers),
    submittedAt: data.submission.submittedAt,
    details: questions
      .map((q) => ({ title: q.title, value: answerText(answers[q.id]).trim() }))
      .filter((d) => d.title && d.value),
  })
  return { email, clubName, status, alreadyNotified: review?.notified_status === status }
}

async function sendEmail(email: Email, clubName: string, idempotencyKey: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
      // Aynı başvurunun aynı sonucu 24 saat içinde iki kez gönderilmez.
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      from: `${clubName} <${SENDER}>`,
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
    .select('form_id, club_code, title, since')
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

  if (body?.action === 'notify') {
    const ids = Array.isArray(body.submission_ids) ? body.submission_ids.filter(validId) : []
    if (ids.length === 0 || ids.length > MAX_NOTIFY) {
      return json({ error: `Tek seferde 1 ile ${MAX_NOTIFY} arasında başvuru bildirilebilir` }, 400)
    }

    const results: { submission_id: string; to?: string; error?: string }[] = []
    for (const [index, submissionId] of ids.entries()) {
      // Resend saniyede en fazla iki isteğe izin verir.
      if (index > 0) await sleep(600)
      const prepared = await prepareEmail(supabase, form, submissionId)
      if ('error' in prepared) {
        results.push({ submission_id: submissionId, error: prepared.error })
        continue
      }
      const error = await sendEmail(prepared.email, prepared.clubName, `${submissionId}-${prepared.status}`)
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
