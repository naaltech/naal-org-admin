import { supabase } from '@/lib/supabase'
import type { ApplicationQuestion, ApplicationStatus, ApplicationSubmission } from '@/lib/types'

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Beklemede',
  accepted: 'Kabul',
  rejected: 'Red',
}

/** Panelde seçeneğe göre filtrelenebilen Tally soru tipleri. */
export const CHOICE_TYPES = new Set(['MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN', 'MULTI_SELECT', 'RANKING', 'LINEAR_SCALE', 'RATING'])

/** Başvurular Tally'de durur; `tally-applications` Edge Function'ı yetkiyi kontrol edip onları getirir. */
async function invoke<T>(body: Record<string, string>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('tally-applications', { body })
  if (error) {
    // Fonksiyonun döndürdüğü hata mesajı yanıt gövdesindedir.
    const context = (error as { context?: unknown }).context
    const detail = context instanceof Response ? await context.json().catch(() => null) : null
    throw new Error((detail as { error?: string } | null)?.error ?? error.message)
  }
  return data as T
}

export function fetchApplications(formId: string) {
  return invoke<{ questions: ApplicationQuestion[]; submissions: ApplicationSubmission[] }>({
    action: 'list',
    form_id: formId,
  })
}

export function deleteApplication(formId: string, submissionId: string) {
  return invoke<{ deleted: boolean }>({ action: 'delete', form_id: formId, submission_id: submissionId })
}

export function answerText(answer: string | string[] | undefined): string {
  return Array.isArray(answer) ? answer.join(', ') : (answer ?? '')
}

export function formatDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}
