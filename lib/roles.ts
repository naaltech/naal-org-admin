export const ADMIN_EMAIL = 'admin@naal.org.tr'
const CLUB_DOMAIN = '@naal.org.tr'

/** Dergi yayımlayan kulüpler; sayfaları bu kulüplerin sitelerinde gösterilir. */
export const MAGAZINE_CLUBS = ['bilim'] as const

export function hasMagazine(clubCode: string): boolean {
  return (MAGAZINE_CLUBS as readonly string[]).includes(clubCode)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL
}

/** Kulüp hesapları `<kulüp kodu>@naal.org.tr` biçimindedir; başka alan adlarındaki hesaplar (ör. dergi editörleri) kulüp değildir. */
export function clubCodeFromEmail(email: string | null | undefined): string {
  const normalized = email?.trim().toLowerCase() ?? ''
  return normalized.endsWith(CLUB_DOMAIN) ? normalized.slice(0, -CLUB_DOMAIN.length) : ''
}

export function isClubEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(CLUB_DOMAIN)
}

/**
 * Süper yönetici her kulübü, kulüp hesabı yalnızca kendisini yönetebilir.
 * `null` kulüpten bağımsız okul kaynaklarıdır (ör. okulun Instagram hesabı); onları yalnızca süper yönetici yönetir.
 */
export function canManageClub(email: string | null | undefined, clubCode: string | null): boolean {
  return isAdminEmail(email) || (Boolean(clubCode) && clubCodeFromEmail(email) === clubCode)
}
