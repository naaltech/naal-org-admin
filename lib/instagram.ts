import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// Instagram API with Instagram Login. Hesapların Business veya Creator olması gerekir.
const GRAPH_URL = 'https://graph.instagram.com'
const GRAPH_VERSION = 'v24.0'
const SCOPE = 'instagram_business_basic'

export const OAUTH_NONCE_COOKIE = 'ig_oauth_nonce'
const STATE_TTL_MS = 10 * 60 * 1000

const REQUIRED_ENV = [
  'INSTAGRAM_APP_ID',
  'INSTAGRAM_APP_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'FILES_URL',
  'FILES_TOKEN',
]

/** Meta uygulaması, service role ve dosya servisi ayarlanmadıysa entegrasyon panelde "bakımda" gösterilir. */
export function instagramConfigured(): boolean {
  return REQUIRED_ENV.every((name) => Boolean(process.env[name]))
}

function appCredentials() {
  const appId = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET
  if (!appId || !appSecret) throw new Error('INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET tanımlı değil')
  return { appId, appSecret }
}

/** Meta uygulamasında kayıtlı yönlendirme adresiyle birebir aynı olmalı. */
export function redirectUri(origin: string): string {
  return process.env.INSTAGRAM_REDIRECT_URI || `${origin}/api/instagram/callback`
}

// --- OAuth state ---------------------------------------------------------------------------------
// State, hangi kulübe (okul hesabı için null) bağlanılacağını taşır ve uygulama secret'ıyla imzalanır. İçindeki nonce ayrıca
// httpOnly çerezde tutulur; böylece callback yalnızca akışı başlatan tarayıcıda kabul edilir.

interface StatePayload {
  club: string | null
  nonce: string
  exp: number
}

function sign(data: string): string {
  return createHmac('sha256', appCredentials().appSecret).update(data).digest('base64url')
}

export function createOAuthState(club: string | null): { state: string; nonce: string } {
  const nonce = randomBytes(16).toString('base64url')
  const payload: StatePayload = { club, nonce, exp: Date.now() + STATE_TTL_MS }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return { state: `${data}.${sign(data)}`, nonce }
}

export function verifyOAuthState(state: string, nonceCookie: string | undefined): StatePayload | null {
  const [data, signature] = state.split('.')
  if (!data || !signature || !nonceCookie) return null
  const expected = Buffer.from(sign(data))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as StatePayload
  if (payload.exp < Date.now() || payload.nonce !== nonceCookie) return null
  return payload
}

// --- Meta callback'leri (deauthorize, veri silme) ---------------------------------------------
// Gövde `signed_request=<imza>.<veri>` biçimindedir; imza uygulama secret'ıyla HMAC-SHA256'dır.

export function parseSignedRequest(signedRequest: string): { user_id: string } | null {
  const [signature, data] = signedRequest.split('.')
  if (!signature || !data) return null
  const expected = createHmac('sha256', appCredentials().appSecret).update(data).digest()
  const actual = Buffer.from(signature, 'base64url')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as { user_id?: string | number }
  return payload.user_id ? { user_id: String(payload.user_id) } : null
}

export function authorizeUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: appCredentials().appId,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: SCOPE,
    state,
    // Aynı tarayıcıdan farklı kulüp hesapları bağlanabilsin diye her seferinde giriş istenir.
    force_reauth: 'true',
  })
  return `https://www.instagram.com/oauth/authorize?${params}`
}

// --- API çağrıları -------------------------------------------------------------------------------

export class InstagramApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store' })
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string } | string
    error_message?: string
  }
  if (!response.ok) {
    const message =
      typeof body.error === 'object' ? body.error.message : (body.error_message ?? body.error ?? response.statusText)
    throw new InstagramApiError(message || `Instagram HTTP ${response.status}`, response.status)
  }
  return body
}

export interface LongLivedToken {
  accessToken: string
  expiresAt: Date
}

function toLongLived(body: { access_token: string; expires_in: number }): LongLivedToken {
  return { accessToken: body.access_token, expiresAt: new Date(Date.now() + body.expires_in * 1000) }
}

/** Yetkilendirme kodunu 60 günlük token'a çevirir. */
export async function exchangeCode(origin: string, code: string): Promise<LongLivedToken> {
  const { appId, appSecret } = appCredentials()
  const shortLived = await request<{ access_token?: string; data?: { access_token: string }[] }>(
    'https://api.instagram.com/oauth/access_token',
    {
      method: 'POST',
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri(origin),
        code,
      }),
    },
  )
  // Dokümanda yanıt `data` dizisi içinde gösteriliyor, pratikte düz nesne dönüyor; ikisini de kabul et.
  const shortToken = shortLived.access_token ?? shortLived.data?.[0]?.access_token
  if (!shortToken) throw new InstagramApiError('Instagram token döndürmedi', 502)

  const params = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: appSecret, access_token: shortToken })
  return toLongLived(await request(`${GRAPH_URL}/access_token?${params}`))
}

/** 60 günlük token'ı yeniler. Token en az 24 saatlik ve süresi dolmamış olmalı. */
export async function refreshToken(accessToken: string): Promise<LongLivedToken> {
  const params = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: accessToken })
  return toLongLived(await request(`${GRAPH_URL}/refresh_access_token?${params}`))
}

export interface InstagramProfile {
  user_id: string
  username: string
  name?: string
}

export async function fetchProfile(accessToken: string): Promise<InstagramProfile> {
  const params = new URLSearchParams({ fields: 'user_id,username,name', access_token: accessToken })
  return request(`${GRAPH_URL}/${GRAPH_VERSION}/me?${params}`)
}

export interface InstagramMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  // Telif hakkı olan müzik içeren Reels'lerde media_url gelmeyebilir.
  media_url?: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
  username?: string
  children?: { data: Omit<InstagramMedia, 'children' | 'caption' | 'permalink' | 'timestamp' | 'username'>[] }
}

const MEDIA_FIELDS =
  'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username,children{id,media_type,media_url,thumbnail_url}'

/** En yeni postlar, yeniden eskiye. */
export async function fetchRecentMedia(accessToken: string, limit: number): Promise<InstagramMedia[]> {
  const params = new URLSearchParams({ fields: MEDIA_FIELDS, limit: String(limit), access_token: accessToken })
  const body = await request<{ data: InstagramMedia[] }>(`${GRAPH_URL}/${GRAPH_VERSION}/me/media?${params}`)
  return body.data ?? []
}
