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

export interface ShortUrl {
  id: number
  created_at: string
  club_code: string
  path: string
  redirect: string
}
