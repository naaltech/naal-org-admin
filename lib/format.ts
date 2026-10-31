/** Veritabanında virgülle ayrılmış tutulan listeleri diziye çevirir. */
export function splitList(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function joinList(values: string[]): string {
  return values.map((s) => s.trim()).filter(Boolean).join(', ')
}

export function todayISO(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  // `date` sütunları saat dilimsiz gelir; yerel gece yarısı olarak yorumla ki gün kaymasın.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('tr-TR')
}

/** CERT-YYYYMMDD-XXXXXX; son ek rastgeledir, aynı milisaniyede oluşturulan iki sertifika çakışmaz. */
export function generateCertId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
  return `CERT-${todayISO().replaceAll('-', '')}-${suffix}`
}

/** Katılım listesi: her satırda bir e-posta adresi aranır, Excel'den yapıştırılan diğer sütunlar yok sayılır. */
export interface Attendee {
  email: string
  name: string
}

const SCHOOL_DOMAINS = ['nevzatayazal.k12.tr', 'ogr.nevzatayazal.k12.tr', 'naal.org.tr']

export const isSchoolEmail = (email: string) => SCHOOL_DOMAINS.includes(email.split('@')[1] ?? '')

/** Satırdaki e-postanın dışında harf içeren ilk alan addır: "Ali Veli, ali@x.com" ya da Excel'den "1, Ali Veli, ali@x.com, 10-A" */
function nameOnLine(line: string, email: string): string {
  const rest = line.replace(email, ' ').replace(/[<>"']/g, ' ')
  const field = rest
    .split(/[,;\t]/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .find((part) => /\p{L}/u.test(part))
  return field?.slice(0, 120) ?? ''
}

export function parseAttendance(text: string): { people: Attendee[]; ignored: string[] } {
  const people = new Map<string, Attendee>()
  const ignored: string[] = []
  for (const line of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const email = line.match(/[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/)?.[0]
    if (email) people.set(email.toLowerCase(), { email: email.toLowerCase(), name: nameOnLine(line, email) })
    else ignored.push(line)
  }
  return { people: [...people.values()], ignored }
}

export function certificateUrl(id: string): string {
  return `https://naal.org.tr/certificates/${encodeURIComponent(id)}`
}

// URL yolunda güvenli karakterler; `/` ile alt yollar desteklenir.
export const SHORT_PATH_PATTERN = /^[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*$/

export function shortUrl(clubCode: string, path: string): string {
  return `https://${clubCode}.naal.org.tr/${path}`
}

/** Tarih bu ay içindeyse true; `date` sütunları ve zaman damgaları için. */
export function isThisMonth(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(todayISO().slice(0, 7)))
}

/** Adresin alan adı; `www.` atılır, geçersizse adres aynen döner. */
export function hostOf(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** WhatsApp grup ve topluluk davet linkleri `https://chat.whatsapp.com/<kod>` biçimindedir. */
export function isWhatsAppInvite(value: string): boolean {
  return /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+\/?(\?.*)?$/.test(value)
}

/** PostgREST `ilike` içinde `%` ve `_` joker karakterdir; e-posta gibi değerleri birebir eşlemek için kaçırılır. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}
