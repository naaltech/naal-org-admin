// Satır tipleri supabase/schema.sql ile eşleşir.

export interface Club {
  id: number
  code: string
  title: string | null
  description: string | null
  instagram: string | null
  owners: string | null
  logo: string | null
  urls: string | null
}

export interface DigitalCert {
  id: number
  created_at: string
  creator: string
  head: string
  given: string
  date: string | null
  file_id: string
  uploader_mail: string | null
}

export interface PdfCert {
  id: number
  created_at: string
  pdf_link: string
  given: string
  from: string
  date: string | null
  uid: string
  cert_name: string
  uploader_mail: string | null
}

/** `instagram_accounts` satırının tarayıcıya gönderilen, token içermeyen hali. */
export interface InstagramAccount {
  id: number
  /** null: kulüpten bağımsız okul hesabı. */
  club_code: string | null
  username: string
  token_expires_at: string
  token_refreshed_at: string
  connected_at: string
  last_synced_at: string | null
  last_error: string | null
}

export interface InstagramSyncResult {
  username: string
  added: number
  /** Görselleri yüklenemeyen, bir sonraki senkronizasyonda tekrar denenecek postlar. */
  failed: number
  /** Süre yetmediyse false; kalan postlar sonraki çalıştırmaya kalır. */
  complete: boolean
  error?: string
}

/** `club_forms`: kulübe bağlı Tally formu. */
export interface ClubForm {
  form_id: string
  club_code: string
  title: string
  /** Bu tarihten önceki başvurular (önceki dönem) gösterilmez. */
  since: string
}

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected'

/** `application_reviews`: kulübün başvuruya verdiği durum ve not. */
export interface ApplicationReview {
  submission_id: string
  form_id: string
  status: ApplicationStatus
  note: string
  updated_at: string
}

export interface ApplicationQuestion {
  id: string
  title: string
  /** Tally soru tipi, ör. INPUT_TEXT, MULTIPLE_CHOICE, CHECKBOXES. */
  type: string
}

export interface ApplicationSubmission {
  id: string
  submittedAt: string
  /** Soru kimliğine göre cevap; çoklu seçimler dizi olarak gelir. */
  answers: Record<string, string | string[]>
}

export interface ShortUrl {
  id: number
  created_at: string
  club_code: string
  path: string
  redirect: string
}
