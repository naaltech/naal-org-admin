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

export function certificateUrl(id: string): string {
  return `https://naal.org.tr/certificates/${encodeURIComponent(id)}`
}

export function shortUrl(clubCode: string, path: string): string {
  return `https://${clubCode}.naal.org.tr/${path}`
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** PostgREST `ilike` içinde `%` ve `_` joker karakterdir; e-posta gibi değerleri birebir eşlemek için kaçırılır. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}
