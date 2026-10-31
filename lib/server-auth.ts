import 'server-only'
import { createClient, type User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import type { PanelRole } from '@/lib/roles'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * İsteğin `Authorization: Bearer <access_token>` başlığını Supabase üzerinden doğrular.
 * Geçersizse 401 yanıtını döndürür; çağıran onu aynen geri vermelidir.
 */
export async function requireUser(request: NextRequest): Promise<User | NextResponse> {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) {
    return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
  }
  return data.user
}

/** Kullanıcının güncel rolleri; okunamazsa hata fırlatır ki yetki yok sanılmasın. */
export async function panelRoles(user: User): Promise<PanelRole[]> {
  const { data, error } = await createAdminClient()
    .from('panel_roles')
    .select('club_code, role')
    .eq('email', user.email?.trim().toLowerCase() ?? '')
  if (error) throw new Error(error.message)
  return data as PanelRole[]
}
