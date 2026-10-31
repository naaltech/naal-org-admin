import { generateCertId, type Attendee } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { CertificateBatch } from '@/lib/types'

/** Tek listede en fazla bu kadar kişi; daha uzun liste büyük olasılıkla yanlış dosyadır. */
export const MAX_RECIPIENTS = 300

interface NewBatch {
  club_code: string
  title: string
  event_date: string
  issuer: string
}

/** Listeyi dizine bırakır; sertifikayı dizin üretir, okuldaki kişinin adını kayıttan alır ve e-postayı gönderir. */
export async function createCertificateBatch(batch: NewBatch, people: Attendee[]) {
  const { data, error } = await supabase.from('certificate_batches').insert(batch).select('id').single()
  if (error) throw new Error(error.message)

  const rows = people.map(({ email, name }) => ({ batch_id: data.id, email, name, file_id: generateCertId() }))
  const { error: recipientError } = await supabase.from('certificate_recipients').insert(rows)
  if (recipientError) {
    await supabase.from('certificate_batches').delete().eq('id', data.id)
    throw new Error(recipientError.message)
  }
}

export async function fetchCertificateBatches(clubCode: string | null) {
  let query = supabase
    .from('certificate_batches')
    .select('id, club_code, title, event_date, created_at, certificate_recipients(id, email, name, file_id, status, error)')
    .order('id', { ascending: false })
    .limit(20)
  if (clubCode) query = query.eq('club_code', clubCode)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as CertificateBatch[]
}
