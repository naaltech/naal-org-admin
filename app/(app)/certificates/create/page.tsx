'use client'

import { useMemo, useState } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Button,
  Form,
  InlineLoading,
  InlineNotification,
  RadioTile,
  Select,
  SelectItem,
  Stack,
  TileGroup,
} from '@carbon/react'
import { Add, CheckmarkFilled, Copy, Launch } from '@carbon/icons-react'
import PageHeader from '@/components/page-header'
import { DigitalCertFields, PdfCertFields, type DigitalCertForm, type PdfCertForm } from '@/components/certificate-fields'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'
import { clubLabel, useClubs } from '@/hooks/use-clubs'
import { certificateUrl, formatDate, generateCertId, todayISO } from '@/lib/format'
import { clubAddress } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

type Kind = 'digital' | 'pdf'

const emptyDigital = (): DigitalCertForm => ({ creator: '', head: '', given: '', date: todayISO(), file_id: '' })
const emptyPdf = (): PdfCertForm => ({ from: '', cert_name: '', given: '', date: todayISO(), uid: '', pdf_link: '' })

interface PreviewProps {
  kind: Kind
  title: string
  given: string
  issuer: string
  date: string
  id: string
  hasPdf: boolean
}

/** Formdaki bilgilerin özeti; boş alanlar soluk yer tutucuyla görünür. */
function CertificatePreview({ kind, title, given, issuer, date, id, hasPdf }: PreviewProps) {
  return (
    <aside className="cert-preview" aria-label="Sertifika önizlemesi">
      <p className="cert-preview__caption">Önizleme</p>
      <div className="cert-preview__sheet">
        <p className="cert-preview__issuer">{issuer || 'Veren kulüp'}</p>
        <p className="cert-preview__overline">Bu sertifika</p>
        <p className={given ? 'cert-preview__name' : 'cert-preview__name cert-preview__empty'}>{given || 'Ad Soyad'}</p>
        <p className="cert-preview__overline">adına düzenlenmiştir</p>
        <p className={title ? 'cert-preview__title' : 'cert-preview__title cert-preview__empty'}>{title || 'Sertifika başlığı'}</p>
        <p className="cert-preview__date">{formatDate(date)}</p>
      </div>
      <dl className="cert-preview__meta">
        <div>
          <dt>Tür</dt>
          <dd>{kind === 'digital' ? 'Dijital' : hasPdf ? 'PDF, dosya yüklendi' : 'PDF, dosya bekleniyor'}</dd>
        </div>
        <div>
          <dt>Bağlantı</dt>
          <dd className="mono">naal.org.tr/certificates/{id.trim() || 'otomatik'}</dd>
        </div>
      </dl>
    </aside>
  )
}

export default function CreateCertificatePage() {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const notify = useToast()
  const { clubs: allClubs, loading: clubsLoading, error: clubsError } = useClubs()
  const clubs = useMemo(() => allClubs.filter((c) => c.is_active !== false), [allClubs])

  const [kind, setKind] = useState<Kind>('digital')
  const [selectedClubId, setClubId] = useState<number | null>(null)
  const [digital, setDigital] = useState(emptyDigital)
  const [pdf, setPdf] = useState(emptyPdf)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<{ id: string; given: string; title: string } | null>(null)

  const clubId = selectedClubId ?? clubs[0]?.id ?? null
  const club = clubs.find((c) => c.id === clubId)
  const issuer = club ? clubLabel(club) : ''

  const valid =
    kind === 'digital'
      ? Boolean(digital.head.trim() && digital.given.trim() && digital.date)
      : Boolean(pdf.pdf_link && pdf.cert_name.trim() && pdf.given.trim())

  const insert = async (table: 'cert' | 'cert_pdf', row: Record<string, string | null>, id: string, given: string, title: string) => {
    setSaving(true)
    const { error } = await supabase.from(table).insert({ ...row, uploader_mail: club?.code ? clubAddress(club.code) : '' })
    setSaving(false)

    if (error) {
      console.error(`Error inserting into ${table}:`, error)
      notify('error', 'Sertifika oluşturulamadı', error.message)
      return false
    }
    setCreated({ id, given, title })
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || !issuer) return
    if (kind === 'digital') {
      const id = digital.file_id.trim() || generateCertId()
      const ok = await insert(
        'cert',
        {
          creator: digital.creator.trim() || issuer,
          head: digital.head.trim(),
          given: digital.given.trim(),
          date: digital.date,
          file_id: id,
        },
        id,
        digital.given.trim(),
        digital.head.trim(),
      )
      if (ok) setDigital(emptyDigital())
    } else {
      const id = pdf.uid.trim() || generateCertId()
      const ok = await insert(
        'cert_pdf',
        {
          from: pdf.from.trim() || issuer,
          cert_name: pdf.cert_name.trim(),
          given: pdf.given.trim(),
          date: pdf.date || null,
          uid: id,
          pdf_link: pdf.pdf_link,
        },
        id,
        pdf.given.trim(),
        pdf.cert_name.trim(),
      )
      if (ok) setPdf(emptyPdf())
    }
  }

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(certificateUrl(id))
      notify('success', 'Link kopyalandı', certificateUrl(id))
    } catch {
      notify('error', 'Link kopyalanamadı')
    }
  }

  if (created) {
    const url = certificateUrl(created.id)
    return (
      <div className="page page--narrow">
        <section className="cert-success" aria-live="polite">
          <CheckmarkFilled size={32} className="cert-success__icon" />
          <h1 className="cert-success__title">Sertifika oluşturuldu</h1>
          <p className="cert-success__body">
            <strong>{created.given}</strong> · {created.title}
          </p>
          <div className="cert-success__link">
            <a href={url} target="_blank" rel="noopener noreferrer" className="mono">
              {url.replace('https://', '')}
            </a>
          </div>
          <div className="form-actions">
            <Button renderIcon={Copy} onClick={() => void copyLink(created.id)}>
              Linki kopyala
            </Button>
            <Button kind="tertiary" renderIcon={Launch} href={url} target="_blank" rel="noopener noreferrer">
              Sertifikayı aç
            </Button>
            <Button kind="ghost" renderIcon={Add} onClick={() => setCreated(null)}>
              Yeni sertifika
            </Button>
            <Button kind="ghost" onClick={() => router.push('/certificates')}>
              Sertifikalara dön
            </Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      <Button as={NextLink} href="/certificates" kind="ghost" size="sm" className="back-link">
        ← Sertifikalar
      </Button>
      <PageHeader
        title="Yeni sertifika"
        description={issuer ? `${issuer} adına tek bir sertifika oluşturun.` : undefined}
        actions={
          <Button as={NextLink} href="/certificates/batch" kind="tertiary" size="lg">
            Toplu gönder
          </Button>
        }
      />

      {clubsError && !clubsLoading && (
        <InlineNotification kind="error" title="Hata" subtitle={clubsError} hideCloseButton lowContrast />
      )}

      <div className="editor-layout">
        <Form onSubmit={(e) => void handleSubmit(e)} aria-label="Yeni sertifika" className="editor-layout__main editor-layout__main--padded">
          <Stack gap={7}>
            <TileGroup
              legend="Sertifika türü"
              name="certificate-kind"
              valueSelected={kind}
              onChange={(value) => setKind(value as Kind)}
              className="kind-picker"
            >
              <RadioTile id="kind-digital" value="digital">
                <strong className="kind-picker__title">Dijital</strong>
                <span className="kind-picker__body">naal.org.tr üzerinde web sayfası olarak oluşturulur.</span>
              </RadioTile>
              <RadioTile id="kind-pdf" value="pdf">
                <strong className="kind-picker__title">PDF</strong>
                <span className="kind-picker__body">Hazır bir PDF yüklenir ve sertifikaya eklenir.</span>
              </RadioTile>
            </TileGroup>

            {isAdmin && clubs.length > 0 && (
              <Select
                id="club-select"
                labelText="Sertifikayı veren kulüp"
                value={clubId ?? ''}
                onChange={(e) => setClubId(Number(e.target.value))}
              >
                {clubs.map((c) => (
                  <SelectItem key={c.id} value={c.id} text={clubLabel(c)} />
                ))}
              </Select>
            )}

            {kind === 'digital' ? (
              <DigitalCertFields idPrefix="digital" value={digital} onChange={setDigital} defaultIssuer={issuer} idOptional />
            ) : (
              <PdfCertFields idPrefix="pdf" value={pdf} onChange={setPdf} defaultIssuer={issuer} idOptional />
            )}

            <div className="form-actions">
              {saving ? (
                <InlineLoading description="Oluşturuluyor…" />
              ) : (
                <Button type="submit" renderIcon={Add} disabled={!valid || !issuer}>
                  Sertifikayı oluştur
                </Button>
              )}
            </div>
          </Stack>
        </Form>

        {kind === 'digital' ? (
          <CertificatePreview
            kind="digital"
            title={digital.head.trim()}
            given={digital.given.trim()}
            issuer={digital.creator.trim() || issuer}
            date={digital.date}
            id={digital.file_id}
            hasPdf={false}
          />
        ) : (
          <CertificatePreview
            kind="pdf"
            title={pdf.cert_name.trim()}
            given={pdf.given.trim()}
            issuer={pdf.from.trim() || issuer}
            date={pdf.date}
            id={pdf.uid}
            hasPdf={Boolean(pdf.pdf_link)}
          />
        )}
      </div>
    </div>
  )
}
