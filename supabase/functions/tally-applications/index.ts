// Kulüp başvurularını Tally'den okur ve siler. Tally API anahtarı yalnızca bu fonksiyonun gizli
// değişkeninde (`TALLY_API_KEY`) durur. Yetki, kullanıcının oturumuyla `club_forms` tablosundan gelir:
// RLS kulübe yalnızca kendi formlarını döndürür, süper yöneticiye hepsini.
import { createClient } from 'npm:@supabase/supabase-js@2'

const TALLY_API = 'https://api.tally.so'
const PAGE_SIZE = 500

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Yalnızca POST desteklenir' }, 405)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const formId = typeof body?.form_id === 'string' ? body.form_id : ''
  const { data: form } = await supabase.from('club_forms').select('form_id, since').eq('form_id', formId).maybeSingle()
  if (!form) return json({ error: 'Form bulunamadı ya da bu forma erişim yetkiniz yok' }, 404)

  if (body?.action === 'delete') {
    const submissionId = typeof body.submission_id === 'string' ? body.submission_id : ''
    if (!/^[A-Za-z0-9]+$/.test(submissionId)) return json({ error: 'Geçersiz başvuru' }, 400)

    const response = await tally(`/forms/${form.form_id}/submissions/${submissionId}`, { method: 'DELETE' })
    if (!response.ok && response.status !== 404) {
      return json({ error: `Tally başvuruyu silemedi (HTTP ${response.status})` }, 502)
    }
    await supabase.from('application_reviews').delete().eq('submission_id', submissionId)
    return json({ deleted: true })
  }

  const questions = new Map<string, { id: string; title: string; type: string }>()
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
    for (const q of data.questions) {
      questions.set(q.id, { id: q.id, type: q.type, title: q.title ?? q.fields?.[0]?.title ?? '' })
    }
    for (const s of data.submissions) {
      submissions.push({
        id: s.id,
        submittedAt: s.submittedAt,
        answers: Object.fromEntries(s.responses.map((r) => [r.questionId, formatAnswer(r.answer)])),
      })
    }
    if (!data.hasMore) break
  }

  return json({ questions: [...questions.values()], submissions })
})
