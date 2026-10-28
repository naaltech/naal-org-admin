export const ADMIN_EMAIL = 'admin@naal.org.tr'

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL
}

/** Kulüp hesapları `<kulüp kodu>@naal.org.tr` biçimindedir. */
export function clubCodeFromEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase().split('@')[0] ?? ''
}
