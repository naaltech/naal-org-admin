import { supabase } from '@/lib/supabase'
import type { DirectoryCommand, PanelEditor } from '@/lib/types'

/** Editör eklemek dizinden istenir; kişinin okul hesabı orada doğrulanır ve rol oradan gelir. */
export async function requestCommand(kind: DirectoryCommand['kind'], clubCode: string, email: string) {
  const { error } = await supabase
    .from('directory_commands')
    .insert({ kind, club_code: clubCode, email: email.trim().toLowerCase() })
  // Aynı istek zaten bekliyorsa ikincisi gerekmez.
  if (error && error.code !== '23505') throw new Error(error.message)
}

export async function fetchEditors(clubCode: string | null) {
  let query = supabase.from('panel_roles').select('email, name, club_code').eq('role', 'editor').order('name')
  if (clubCode) query = query.eq('club_code', clubCode)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as PanelEditor[]
}

/** Dizinin henüz işlemediği ve son reddettiği editör istekleri. */
export async function fetchEditorRequests(clubCode: string | null) {
  let query = supabase
    .from('directory_commands')
    .select('id, kind, club_code, email, status, error, created_at')
    .in('kind', ['grant_editor', 'revoke_editor'])
    .neq('status', 'done')
    .order('id', { ascending: false })
    .limit(10)
  if (clubCode) query = query.eq('club_code', clubCode)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as DirectoryCommand[]
}
