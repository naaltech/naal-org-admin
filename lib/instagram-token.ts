// Uzun ömürlü Instagram token'ları 60 gün geçerlidir ve senkronizasyon sırasında otomatik yenilenir.
// Sunucu (yenileme kararı) ve panel (tahmini tarih) aynı kuralı kullanır.

const DAY_MS = 24 * 60 * 60 * 1000
/** Süresinin dolmasına bu kadar kala yenilenir. */
const REFRESH_WINDOW_MS = 10 * DAY_MS
/** Instagram 24 saatten genç token'ı yenilemez. */
const MIN_TOKEN_AGE_MS = DAY_MS

/** Token'ın otomatik yenileneceği en erken zaman. */
export function nextTokenRefresh(expiresAt: string, refreshedAt: string): Date {
  const byExpiry = new Date(expiresAt).getTime() - REFRESH_WINDOW_MS
  const byAge = new Date(refreshedAt).getTime() + MIN_TOKEN_AGE_MS
  return new Date(Math.max(byExpiry, byAge))
}
