import { supabase } from '@/lib/supabase'
import type { ClubEditor } from '@/lib/types'

/** Hesap işlemleri `editor-accounts` Edge Function'ında yapılır; giriş bilgilerini editöre e-postayla da gönderir. */
async function invoke<T>(body: Record<string, string | number>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('editor-accounts', { body })
  if (error) {
    // Fonksiyonun döndürdüğü hata mesajı yanıt gövdesindedir.
    const context = (error as { context?: unknown }).context
    const detail = context instanceof Response ? await context.json().catch(() => null) : null
    throw new Error((detail as { error?: string } | null)?.error ?? error.message)
  }
  return data as T
}

/** Editör hesabını açar; şifre yalnızca bu yanıtta döner. `emailed` giriş bilgilerinin gönderilip gönderilmediğidir. */
export const createEditor = (input: { club_code: string; name: string; email: string }) =>
  invoke<{ editor: ClubEditor; password: string; emailed: boolean }>({ action: 'create', ...input })

export const resetEditorPassword = (id: number) =>
  invoke<{ password: string; emailed: boolean }>({ action: 'reset', id })

export const deleteEditor = (id: number) => invoke<{ ok: true }>({ action: 'delete', id })
