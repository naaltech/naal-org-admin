import { supabase } from '@/lib/supabase'
import type { ApplicationQuestion, ApplicationStatus, ApplicationSubmission, NotificationEmail } from '@/lib/types'

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Beklemede',
  accepted: 'Kabul',
  rejected: 'Red',
}

/** Panelde seçeneğe göre filtrelenebilen Tally soru tipleri. */
export const CHOICE_TYPES = new Set(['MULTIPLE_CHOICE', 'CHECKBOXES', 'DROPDOWN', 'MULTI_SELECT', 'RANKING', 'LINEAR_SCALE', 'RATING'])

/** Başvurular Tally'de durur; `tally-applications` Edge Function'ı yetkiyi kontrol edip onları getirir. */
async function invoke<T>(body: Record<string, string | string[]>): Promise<T> {
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

/**
 * Gönderilecek sonuç e-postasının sunucuda oluşturulmuş hali; alıcı Tally'deki başvurudan okunur.
 * `draft` verilirse henüz kaydedilmemiş durum ve mesajla önizlenir.
 */
export function previewNotification(
  formId: string,
  submissionId: string,
  draft?: { status: 'accepted' | 'rejected'; message: string },
) {
  return invoke<{ email: NotificationEmail; alreadyNotified: boolean }>({
    action: 'preview',
    form_id: formId,
    submission_id: submissionId,
    ...(draft ?? {}),
  })
}

/** Fonksiyon tek seferde en fazla bu kadar başvuruyu bildirir. */
const NOTIFY_CHUNK = 25

export type NotifyResult = { submission_id: string; to?: string; error?: string }

export async function notifyApplicants(formId: string, submissionIds: string[]): Promise<NotifyResult[]> {
  const results: NotifyResult[] = []
  for (let i = 0; i < submissionIds.length; i += NOTIFY_CHUNK) {
    const chunk = submissionIds.slice(i, i + NOTIFY_CHUNK)
    const response = await invoke<{ results: NotifyResult[] }>({ action: 'notify', form_id: formId, submission_ids: chunk })
    results.push(...response.results)
  }
  return results
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
