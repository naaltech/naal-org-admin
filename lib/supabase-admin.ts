import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * RLS'i atlayan service role istemcisi. Yalnızca API route'larında, yetki kontrolünden sonra kullanılır.
 * `instagram_accounts` tablosu (token'lar) sadece bununla okunabilir.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY tanımlı değil')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
