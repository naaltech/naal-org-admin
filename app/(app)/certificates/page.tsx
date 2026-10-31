'use client'

import { useCallback, useEffect, useState } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Button,
  InlineNotification,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
} from '@carbon/react'
import { Add } from '@carbon/icons-react'
import PageHeader from '@/components/page-header'
import DataList, { EmptyState, type Column } from '@/components/data-list'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import { DigitalCertFields, PdfCertFields, type DigitalCertForm, type PdfCertForm } from '@/components/certificate-fields'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'
import { certificateUrl, escapeLike, formatDate } from '@/lib/format'
import { clubAddress } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import type { DigitalCert, PdfCert } from '@/lib/types'

type Editing =
  | { kind: 'digital'; row: DigitalCert; form: DigitalCertForm }
  | { kind: 'pdf'; row: PdfCert; form: PdfCertForm }

type Deleting = { kind: 'digital'; row: DigitalCert } | { kind: 'pdf'; row: PdfCert }

const TABLES = { digital: 'cert', pdf: 'cert_pdf' } as const

const openInNewTab = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')

function TitleCell({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <span className="cell-truncate cell-title" title={title}>
        {title}
      </span>
      <span className="cell-truncate helper">{subtitle}</span>
    </>
  )
}

export default function CertificatesPage() {
  const router = useRouter()
  const { isAdmin, clubCode } = useAuth()
  const notify = useToast()

  const [digital, setDigital] = useState<DigitalCert[]>([])
  const [pdf, setPdf] = useState<PdfCert[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [deleting, setDeleting] = useState<Deleting | null>(null)
  const [busy, setBusy] = useState(false)

  const email = clubAddress(clubCode)

  /** Kulüp yalnızca kendi adresiyle yüklenen kayıtları görür. */
  const scoped = useCallback(
    <Q extends { ilike: (column: string, pattern: string) => Q }>(query: Q): Q =>
      isAdmin ? query : query.ilike('uploader_mail', escapeLike(email)),
    [isAdmin, email],
  )

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      scoped(supabase.from('cert').select('*')).order('created_at', { ascending: false }).limit(1000),
      scoped(supabase.from('cert_pdf').select('*')).order('created_at', { ascending: false }).limit(1000),
    ]).then(([digitalResult, pdfResult]) => {
      if (cancelled) return
      if (digitalResult.error || pdfResult.error) {
        console.error('Error fetching certificates:', digitalResult.error ?? pdfResult.error)
        setLoadError('Sertifikalar yüklenemedi. Sayfayı yenileyip tekrar deneyin.')
      }
      setDigital((digitalResult.data ?? []) as DigitalCert[])
      setPdf((pdfResult.data ?? []) as PdfCert[])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [scoped])

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(certificateUrl(id))
      notify('success', 'Link kopyalandı', certificateUrl(id))
    } catch {
      notify('error', 'Link kopyalanamadı')
    }
  }

  const openEdit = (target: Deleting) => {
    if (target.kind === 'digital') {
      const { creator, head, given, date, file_id } = target.row
      setEditing({ kind: 'digital', row: target.row, form: { creator, head, given, date: date ?? '', file_id } })
    } else {
      const { from, cert_name, given, date, uid, pdf_link } = target.row
      setEditing({ kind: 'pdf', row: target.row, form: { from, cert_name, given, date: date ?? '', uid, pdf_link } })
    }
  }

  const editInvalid =
    editing?.kind === 'digital'
      ? !editing.form.head.trim() || !editing.form.given.trim() || !editing.form.file_id.trim() || !editing.form.date
      : editing?.kind === 'pdf'
        ? !editing.form.cert_name.trim() || !editing.form.given.trim() || !editing.form.uid.trim() || !editing.form.pdf_link
        : true

  const handleSave = async () => {
    if (!editing || editInvalid) return
    setBusy(true)
    const patch = { ...editing.form, date: editing.form.date || null }
    const { data, error } = await scoped(supabase.from(TABLES[editing.kind]).update(patch).eq('id', editing.row.id))
      .select()
      .single()
    setBusy(false)

    if (error || !data) {
      console.error('Error updating certificate:', error)
      notify('error', 'Güncellenemedi', error?.message)
      return
    }
    if (editing.kind === 'digital') {
      setDigital((rows) => rows.map((r) => (r.id === editing.row.id ? (data as DigitalCert) : r)))
    } else {
      setPdf((rows) => rows.map((r) => (r.id === editing.row.id ? (data as PdfCert) : r)))
    }
    setEditing(null)
    notify('success', 'Sertifika güncellendi')
  }

  const handleDelete = async () => {
    if (!deleting) return
    setBusy(true)
    const { error } = await scoped(supabase.from(TABLES[deleting.kind]).delete().eq('id', deleting.row.id))
    setBusy(false)

    if (error) {
      console.error('Error deleting certificate:', error)
      notify('error', 'Silinemedi', error.message)
      return
    }
    if (deleting.kind === 'digital') setDigital((rows) => rows.filter((r) => r.id !== deleting.row.id))
    else setPdf((rows) => rows.filter((r) => r.id !== deleting.row.id))
    setDeleting(null)
    notify('success', 'Sertifika silindi')
  }

  const uploaderColumn = <T extends { uploader_mail: string | null }>(): Column<T>[] =>
    isAdmin ? [{ key: 'uploader', header: 'Yükleyen', render: (r) => r.uploader_mail ?? '—' }] : []

  const digitalColumns: Column<DigitalCert>[] = [
    { key: 'head', header: 'Sertifika', render: (r) => <TitleCell title={r.head} subtitle={r.creator} /> },
    { key: 'given', header: 'Alan kişi', render: (r) => r.given },
    { key: 'date', header: 'Tarih', render: (r) => formatDate(r.date) },
    { key: 'id', header: 'ID', render: (r) => <Tag type="gray" size="sm" className="mono">{r.file_id}</Tag> },
    ...uploaderColumn<DigitalCert>(),
  ]

  const pdfColumns: Column<PdfCert>[] = [
    { key: 'name', header: 'Sertifika', render: (r) => <TitleCell title={r.cert_name || '—'} subtitle={r.from} /> },
    { key: 'given', header: 'Alan kişi', render: (r) => r.given },
    { key: 'date', header: 'Tarih', render: (r) => formatDate(r.date) },
    { key: 'id', header: 'ID', render: (r) => <Tag type="gray" size="sm" className="mono">{r.uid}</Tag> },
    ...uploaderColumn<PdfCert>(),
  ]

  const createButton = (
    <Button as={NextLink} href="/certificates/create" renderIcon={Add} size="lg">
      Yeni sertifika
    </Button>
  )

  const empty = (kind: string) => (
    <EmptyState
      title={`Henüz ${kind} sertifika yok`}
      body="Oluşturduğunuz sertifikalar burada listelenir."
      action={
        <Button kind="tertiary" renderIcon={Add} onClick={() => router.push('/certificates/create')}>
          Sertifika oluştur
        </Button>
      }
    />
  )

  return (
    <div className="page">
      <PageHeader
        title="Sertifikalar"
        description={isAdmin ? 'Sistemdeki tüm sertifikalar.' : 'Kulübünüzün sertifikaları.'}
        actions={createButton}
      />

      {loadError && (
        <InlineNotification kind="error" title="Hata" subtitle={loadError} onClose={() => setLoadError(null)} lowContrast />
      )}

      <Tabs>
        <TabList aria-label="Sertifika türü">
          <Tab>Dijital ({digital.length})</Tab>
          <Tab>PDF ({pdf.length})</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <DataList
              rows={digital}
              columns={digitalColumns}
              loading={loading}
              searchPlaceholder="Ad, başlık, kulüp veya ID ara"
              searchText={(r) => [r.given, r.head, r.creator, r.file_id, r.uploader_mail].join(' ')}
              emptyState={loadError ? null : empty('dijital')}
              renderActions={(row) => (
                <OverflowMenu aria-label={`${row.head} eylemleri`} flipped size="md">
                  <OverflowMenuItem itemText="Linki kopyala" onClick={() => void copyLink(row.file_id)} />
                  <OverflowMenuItem itemText="Sertifikayı aç" onClick={() => openInNewTab(certificateUrl(row.file_id))} />
                  <OverflowMenuItem itemText="Düzenle" onClick={() => openEdit({ kind: 'digital', row })} />
                  <OverflowMenuItem itemText="Sil" isDelete hasDivider onClick={() => setDeleting({ kind: 'digital', row })} />
                </OverflowMenu>
              )}
            />
          </TabPanel>
          <TabPanel>
            <DataList
              rows={pdf}
              columns={pdfColumns}
              loading={loading}
              searchPlaceholder="Ad, sertifika, kulüp veya ID ara"
              searchText={(r) => [r.given, r.cert_name, r.from, r.uid, r.uploader_mail].join(' ')}
              emptyState={loadError ? null : empty('PDF')}
              renderActions={(row) => (
                <OverflowMenu aria-label={`${row.cert_name} eylemleri`} flipped size="md">
                  <OverflowMenuItem itemText="Linki kopyala" onClick={() => void copyLink(row.uid)} />
                  <OverflowMenuItem itemText="Sertifikayı aç" onClick={() => openInNewTab(certificateUrl(row.uid))} />
                  <OverflowMenuItem itemText="PDF'i aç" onClick={() => openInNewTab(row.pdf_link)} disabled={!row.pdf_link} />
                  <OverflowMenuItem itemText="Düzenle" onClick={() => openEdit({ kind: 'pdf', row })} />
                  <OverflowMenuItem itemText="Sil" isDelete hasDivider onClick={() => setDeleting({ kind: 'pdf', row })} />
                </OverflowMenu>
              )}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Modal
        open={editing !== null}
        modalHeading="Sertifikayı düzenle"
        modalLabel={editing?.kind === 'pdf' ? 'PDF sertifika' : 'Dijital sertifika'}
        primaryButtonText={busy ? 'Kaydediliyor…' : 'Kaydet'}
        secondaryButtonText="Vazgeç"
        primaryButtonDisabled={busy || editInvalid}
        onRequestClose={() => setEditing(null)}
        onRequestSubmit={() => void handleSave()}
        size="md"
        hasScrollingContent
      >
        {editing?.kind === 'digital' && (
          <DigitalCertFields
            idPrefix="edit-digital"
            value={editing.form}
            onChange={(form) => setEditing({ ...editing, form })}
          />
        )}
        {editing?.kind === 'pdf' && (
          <PdfCertFields idPrefix="edit-pdf" value={editing.form} onChange={(form) => setEditing({ ...editing, form })} />
        )}
      </Modal>

      <ConfirmDeleteModal
        open={deleting !== null}
        heading="Sertifikayı sil"
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      >
        {deleting && (
          <>
            <strong>{deleting.kind === 'digital' ? deleting.row.head : deleting.row.cert_name}</strong> —{' '}
            {deleting.row.given}. Sertifika linki çalışmayı bırakacak.
          </>
        )}
      </ConfirmDeleteModal>
    </div>
  )
}
