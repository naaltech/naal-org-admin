/** Yetkiler `panel_roles` tablosundan gelir; tabloyu dizin (naal-directory) yazar, panelden değiştirilemez. */
export type PanelRoleName = 'super' | 'club' | 'editor'

export interface PanelRole {
  club_code: string
  role: PanelRoleName
}

const CLUB_DOMAIN = '@naal.org.tr'

/** Yasal sayfalardaki iletişim adresi. Yetki vermez. */
export const CONTACT_EMAIL = 'admin@naal.org.tr'

/** Dergi yayımlayan kulüpler; sayfaları bu kulüplerin sitelerinde gösterilir. */
export const MAGAZINE_CLUBS = ['bilim'] as const

export function hasMagazine(clubCode: string): boolean {
  return (MAGAZINE_CLUBS as readonly string[]).includes(clubCode)
}

export function isSuper(roles: PanelRole[]): boolean {
  return roles.some((r) => r.role === 'super')
}

/** Yönetilen kulüpler; dergi editörlüğü kulüp yönetimi sayılmaz. */
export function managedClubs(roles: PanelRole[]): string[] {
  return roles.filter((r) => r.role === 'club').map((r) => r.club_code)
}

/**
 * Süper yönetici her kulübü, kulüp yönetimi yalnızca kendi kulüplerini yönetebilir.
 * `null` kulüpten bağımsız okul kaynaklarıdır (ör. okulun Instagram hesabı); onları yalnızca süper yönetici yönetir.
 */
export function canManageClub(roles: PanelRole[], clubCode: string | null): boolean {
  return isSuper(roles) || (Boolean(clubCode) && managedClubs(roles).includes(clubCode!))
}

/** Kulübün grup adresi. Sertifikalar bu adresle tutulur; görevli değişse de kayıtlar kulüpte kalır. */
export function clubAddress(clubCode: string): string {
  return `${clubCode}${CLUB_DOMAIN}`
}
