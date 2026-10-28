'use client'

import { useState } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ActionableNotification,
  Button,
  CopyButton,
  Form,
  InlineLoading,
  Link,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tile,
} from '@carbon/react'
import { Add } from '@carbon/icons-react'
import PageHeader from '@/components/page-header'
import { DigitalCertFields, PdfCertFields, type DigitalCertForm, type PdfCertForm } from '@/components/certificate-fields'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'
import { clubLabel, useClubs } from '@/hooks/use-clubs'
import { certificateUrl, generateCertId, todayISO } from '@/lib/format'
import { supabase } from '@/lib/supabase'

const emptyDigital = (): DigitalCertForm => ({ creator: '', head: '', given: '', date: todayISO(), file_id: '' })
const emptyPdf = (): PdfCertForm => ({ from: '', cert_name: '', given: '', date: todayISO(), uid: '', pdf_link: '' })

export default function CreateCertificatePage() {
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const notify = useToast()
  const { clubs, loading: clubsLoading, error: clubsError } = useClubs()

  const [selectedClubId, setClubId] = useState<number | null>(null)
  const [digital, setDigital] = useState(emptyDigital)
  const [pdf, setPdf] = useState(emptyPdf)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<{ id: string; given: string } | null>(null)

  const clubId = selectedClubId ?? clubs[0]?.id ?? null
  const club = clubs.find((c) => c.id === clubId)
  const issuer = club ? clubLabel(club) : ''

  const insert = async (table: 'cert' | 'cert_pdf', row: Record<string, string | null>, id: string, given: string) => {
    setSaving(true)
    const { error } = await supabase.from(table).insert({ ...row, uploader_mail: user?.email ?? '' })
    setSaving(false)

    if (error) {
      console.error(`Error inserting into ${table}:`, error)
      notify('error', 'Sertifika oluşturulamadı', error.message)
      return false
    }
    setCreated({ id, given })
    return true
  }

  const handleDigitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!digital.head.trim() || !digital.given.trim() || !digital.date) {
      notify('error', 'Eksik bilgi', 'Başlık, alan kişi ve tarih zorunludur.')
      return
    }
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
    )
    if (ok) setDigital(emptyDigital())
  }

  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pdf.pdf_link || !pdf.cert_name.trim() || !pdf.given.trim()) {
      notify('error', 'Eksik bilgi', 'PDF, sertifika adı ve alan kişi zorunludur.')
      return
    }
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
    )
    if (ok) setPdf(emptyPdf())
  }

  const submitButton = (label: string, disabled = false) =>
    saving ? (
      <InlineLoading description="Oluşturuluyor…" />
    ) : (
      <Button type="submit" renderIcon={Add} disabled={disabled || !issuer}>
        {label}
      </Button>
    )

  return (
    <div className="page page--narrow">
      <PageHeader
        title="Yeni sertifika"
        description={issuer ? `${issuer} adına dijital sertifika oluşturun ya da hazır bir PDF yükleyin.` : undefined}
      />

      {clubsError && !clubsLoading && (
        <InlineNotification kind="error" title="Hata" subtitle={clubsError} hideCloseButton lowContrast />
      )}

      {created && (
        <ActionableNotification
          kind="success"
          title="Sertifika oluşturuldu"
          subtitle={`${created.given} · ${certificateUrl(created.id)}`}
          actionButtonLabel="Sertifikaları görüntüle"
          onActionButtonClick={() => router.push('/certificates')}
          onClose={() => setCreated(null)}
          inline
          lowContrast
          style={{ maxWidth: '100%', marginBottom: '1.5rem' }}
        >
          <CopyButton
            iconDescription="Linki kopyala"
            feedback="Kopyalandı"
            onClick={() => void navigator.clipboard.writeText(certificateUrl(created.id))}
          />
        </ActionableNotification>
      )}

      {isAdmin && clubs.length > 0 && (
        <div className="section">
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
        </div>
      )}

      <Tabs>
        <TabList aria-label="Sertifika türü" contained fullWidth>
          <Tab>Dijital sertifika</Tab>
          <Tab>PDF sertifika</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Tile className="form-tile">
            <Form onSubmit={handleDigitalSubmit} aria-label="Dijital sertifika">
              <Stack gap={7}>
                <p className="helper">
                  Sertifika naal.org.tr üzerinde web sayfası olarak oluşturulur; PDF gerekmez.
                </p>
                <DigitalCertFields idPrefix="digital" value={digital} onChange={setDigital} defaultIssuer={issuer} idOptional />
                <div className="form-actions">{submitButton('Dijital sertifika oluştur')}</div>
              </Stack>
            </Form>
            </Tile>
          </TabPanel>
          <TabPanel>
            <Tile className="form-tile">
            <Form onSubmit={handlePdfSubmit} aria-label="PDF sertifika">
              <Stack gap={7}>
                <PdfCertFields idPrefix="pdf" value={pdf} onChange={setPdf} defaultIssuer={issuer} idOptional />
                <div className="form-actions">{submitButton('PDF sertifika oluştur', !pdf.pdf_link)}</div>
              </Stack>
            </Form>
            </Tile>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <p className="helper" style={{ marginTop: '1.5rem' }}>
        Oluşturduğunuz sertifikaları <Link as={NextLink} href="/certificates" inline size="sm">
          Sertifikalar
        </Link> sayfasından düzenleyebilirsiniz.
      </p>
    </div>
  )
}
