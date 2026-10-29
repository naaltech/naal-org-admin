// Başvuru sonucu e-postası: alıcıyı ve adı başvurudan bulur, metin ve HTML gövdesini oluşturur.

export interface Question {
  id: string
  title: string
  type: string
}

export interface Email {
  to: string
  subject: string
  text: string
  html: string
}

export const answerText = (answer: string | string[] | undefined) =>
  Array.isArray(answer) ? answer.join(', ') : (answer ?? '')

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Önce e-posta tipindeki soru, yoksa başlığında "e-posta" geçen soru; cevap geçerli bir adres olmalı. */
export function findEmail(questions: Question[], answers: Record<string, string | string[]>): string | null {
  const candidates = [
    ...questions.filter((q) => q.type === 'INPUT_EMAIL'),
    ...questions.filter((q) => q.type !== 'INPUT_EMAIL' && /e-?\s?posta|e-?mail/i.test(q.title)),
  ]
  for (const q of candidates) {
    const value = answerText(answers[q.id]).trim()
    if (EMAIL_PATTERN.test(value)) return value
  }
  return null
}

/** "Ad, soyad" tek soruysa onu, "Ad" ve "Soyad" ayrıysa ikisini birleştirir. */
export function findName(questions: Question[], answers: Record<string, string | string[]>): string {
  const byTitle = (pattern: RegExp) => questions.find((q) => pattern.test(q.title.trim()))
  const full = byTitle(/^(ad,?\s*soyad|ad\s+soyad|isim|ad[ıi]n[ıi]z\s+soyad[ıi]n[ıi]z)/i)
  if (full) return answerText(answers[full.id]).trim()
  const first = byTitle(/^ad[ıi]?n?[ıi]?z?$/i)
  const last = byTitle(/^soyad[ıi]?n?[ıi]?z?$/i)
  return [first, last].map((q) => (q ? answerText(answers[q.id]).trim() : '')).filter(Boolean).join(' ')
}

const escapeHtml = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

function formatDate(value: string) {
  return new Date(value).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

const RESULT_TEXT: Record<'accepted' | 'rejected', string> = {
  accepted: 'Başvurunuz kabul edildi.',
  rejected: 'Değerlendirme sonucunda başvurunuz maalesef olumlu sonuçlanmadı. İlginiz için teşekkür ederiz.',
}

export function buildEmail(input: {
  to: string
  clubName: string
  formTitle: string
  status: 'accepted' | 'rejected'
  message: string
  name: string
  submittedAt: string
  details: { title: string; value: string }[]
}): Email {
  const { to, clubName, formTitle, status, message, name, submittedAt, details } = input
  const greeting = name ? `Merhaba ${name},` : 'Merhaba,'
  const intro = `${formatDate(submittedAt)} tarihinde ${clubName} için yaptığınız başvuru (${formTitle}) değerlendirildi.`
  const footer = `Bu e-posta ${clubName} adına NAAL Etkileşim Ağı (naal.org.tr) üzerinden gönderildi. Lütfen bu e-postayı yanıtlamayın; sorularınız için kulüple doğrudan iletişime geçin.`

  const text = [
    greeting,
    '',
    intro,
    '',
    `Sonuç: ${RESULT_TEXT[status]}`,
    ...(message ? ['', `${clubName} ekibinin mesajı:`, message] : []),
    '',
    'Başvurunuzda ilettiğiniz bilgiler:',
    ...details.map((d) => `- ${d.title}: ${d.value}`),
    '',
    '—',
    footer,
  ].join('\n')

  const resultColor = status === 'accepted' ? '#198038' : '#da1e28'
  const rows = details
    .map(
      (d) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#525252;vertical-align:top;width:40%">${escapeHtml(d.title)}</td>` +
        `<td style="padding:6px 0;vertical-align:top;white-space:pre-wrap">${escapeHtml(d.value)}</td></tr>`,
    )
    .join('')
  const html = `<!doctype html><html lang="tr"><body style="margin:0;padding:24px;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#161616">
<div style="max-width:560px;margin:0 auto;background:#ffffff;padding:32px">
<p style="margin:0 0 16px;font-size:13px;color:#525252">${escapeHtml(clubName)}</p>
<p style="margin:0 0 16px">${escapeHtml(greeting)}</p>
<p style="margin:0 0 16px;line-height:1.5">${escapeHtml(intro)}</p>
<p style="margin:0 0 24px;padding:12px 16px;border:1px solid ${resultColor};color:${resultColor};font-weight:bold">${escapeHtml(RESULT_TEXT[status])}</p>
${message ? `<p style="margin:0 0 4px;font-weight:bold">${escapeHtml(clubName)} ekibinin mesajı:</p><p style="margin:0 0 24px;line-height:1.5;white-space:pre-wrap">${escapeHtml(message)}</p>` : ''}
<p style="margin:0 0 8px;font-weight:bold">Başvurunuzda ilettiğiniz bilgiler</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
<p style="margin:32px 0 0;font-size:12px;color:#6f6f6f;line-height:1.5">${escapeHtml(footer)}</p>
</div></body></html>`

  return { to, subject: `${clubName}: ${formTitle} sonucu`, text, html }
}
