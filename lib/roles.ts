export const ADMIN_EMAIL = 'admin@naal.org.tr'

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL
}

/** Kulüp hesapları `<kulüp kodu>@naal.org.tr` biçimindedir. */
export function clubCodeFromEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase().split('@')[0] ?? ''
}

/**
 * Süper yönetici her kulübü, kulüp hesabı yalnızca kendisini yönetebilir.
 * `null` kulüpten bağımsız okul kaynaklarıdır (ör. okulun Instagram hesabı); onları yalnızca süper yönetici yönetir.
 */
export function canManageClub(email: string | null | undefined, clubCode: string | null): boolean {
  return isAdminEmail(email) || (Boolean(clubCode) && clubCodeFromEmail(email) === clubCode)
}
