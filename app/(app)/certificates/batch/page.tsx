'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Form,
  InlineLoading,
  InlineNotification,
  Link,
  Modal,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from '@carbon/react'
import { Renew, Send } from '@carbon/icons-react'
import DataList, { EmptyState, type Column } from '@/components/data-list'
import DateField from '@/components/date-field'
import PageHeader from '@/components/page-header'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'
import { clubLabel, useClubs } from '@/hooks/use-clubs'
import { createCertificateBatch, fetchCertificateBatches, MAX_RECIPIENTS } from '@/lib/certificate-batches'
import { certificateUrl, formatDate, isSchoolEmail, parseAttendance, todayISO } from '@/lib/format'
import type { CertificateBatch, CertificateRecipient } from '@/lib/types'

type FailedRow = CertificateRecipient & { title: string }

/** Dizinin yazdığı hata: sertifika var, yalnızca e-posta gitmemiş */
const CERTIFICATE_MADE = 'Sertifika oluştu, e-posta gönderilemedi.'

const count = (batch: CertificateBatch, status: CertificateRecipient['status']) =>
  batch.certificate_recipients.filter((r) => r.status === status).length

function BatchStatus({ batch }: { batch: CertificateBatch }) {
  const sent = count(batch, 'sent')
  const pending = count(batch, 'pending')
  const failed = count(batch, 'failed')
  return (
    <>
      {sent > 0 && <Tag type="green" size="sm">{sent} gönderildi</Tag>}
      {pending > 0 && <Tag type="gray" size="sm">{pending} bekliyor</Tag>}
      {failed > 0 && <Tag type="red" size="sm">{failed} sorunlu</Tag>}
    </>
  )
}

/** Etkinlik katılım listesinden sertifika üretir ve kişilerin e-postasına gönderir. */
export default function CertificateBatchPage() {
  const { isAdmin, clubCode } = useAuth()
  const notify = useToast()
  const { clubs: allClubs, error: clubsError, loading: clubsLoading } = useClubs()
  const clubs = useMemo(() => allClubs.filter((c) => c.is_active !== false), [allClubs])

  const [selectedClubId, setClubId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayISO)
  const [issuer, setIssuer] = useState('')
  const [list, setList] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [batches, setBatches] = useState<CertificateBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const club = clubs.find((c) => c.id === selectedClubId) ?? clubs[0]
  const clubFilter = isAdmin ? null : clubCode
  const { people, ignored } = useMemo(() => parseAttendance(list), [list])
  const outsiders = useMemo(() => people.filter((p) => !isSchoolEmail(p.email)), [people])
  const unnamed = outsiders.filter((p) => !p.name)
  const tooMany = people.length > MAX_RECIPIENTS
  const ready = Boolean(club && title.trim() && date && people.length > 0 && !tooMany && unnamed.length === 0)

  const load = useCallback(async () => {
    setBatches(await fetchCertificateBatches(clubFilter))
  }, [clubFilter])

  useEffect(() => {
    let cancelled = false
    void fetchCertificateBatches(clubFilter)
      .then((rows) => {
        if (!cancelled) setBatches(rows)
      })
      .catch((error: unknown) => {
        console.error('Error fetching certificate batches:', error)
        if (!cancelled) setLoadError('Geçmiş gönderimler yüklenemedi. Sayfayı yenileyip tekrar deneyin.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clubFilter])

  const refresh = async () => {
    setBusy(true)
    try {
      await load()
      setLoadError(null)
    } catch (error) {
      notify('error', 'Yenilenemedi', error instanceof Error ? error.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const handleSend = async () => {
    if (!club || !ready) return
    setBusy(true)
    try {
      await createCertificateBatch(
        { club_code: club.code, title: title.trim(), event_date: date, issuer: issuer.trim() || clubLabel(club) },
        people,
      )
      await load()
      setConfirming(false)
      setTitle('')
      setIssuer('')
      setList('')
      notify('success', 'Liste iletildi', 'Sertifikalar birkaç dakika içinde üretilip gönderilir.')
    } catch (error) {
      notify('error', 'Liste iletilemedi', error instanceof Error ? error.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const readFile = async (file: File | undefined) => {
    if (file) setList(await file.text())
  }

  const columns: Column<CertificateBatch>[] = [
    { key: 'title', header: 'Etkinlik', render: (b) => <span className="cell-truncate" title={b.title}>{b.title}</span> },
    { key: 'date', header: 'Tarih', render: (b) => formatDate(b.event_date) },
    { key: 'status', header: 'Durum', render: (b) => <BatchStatus batch={b} /> },
  ]

  const failed: FailedRow[] = batches.flatMap((b) =>
    b.certificate_recipients.filter((r) => r.status === 'failed').map((r) => ({ ...r, title: b.title })),
  )

  const failedColumns: Column<FailedRow>[] = [
    { key: 'who', header: 'Kişi', render: (r) => <span className="mono">{r.email ?? r.name}</span> },
    { key: 'title', header: 'Etkinlik', render: (r) => <span className="cell-truncate" title={r.title}>{r.title}</span> },
    { key: 'error', header: 'Sorun', render: (r) => r.error },
    {
      key: 'link',
      header: 'Sertifika',
      render: (r) =>
        r.error === CERTIFICATE_MADE ? (
          <Link href={certificateUrl(r.file_id)} target="_blank" rel="noopener noreferrer" size="sm">
            Aç
          </Link>
        ) : (
          '—'
        ),
    },
  ]

  return (
    <div className="page page--narrow">
      <PageHeader
        title="Toplu sertifika"
        description="Katılımcıların e-postalarını yapıştırın. Okuldaki kişilerin adı okul kaydından alınır, okul dışı kişilerin adını listeye siz yazarsınız. Sertifika bağlantısı her kişiye e-postayla gider."
      />

      {clubsError && !clubsLoading && (
        <InlineNotification kind="error" title="Hata" subtitle={clubsError} hideCloseButton lowContrast />
      )}

      <Tile className="form-tile section">
        <Form
          aria-label="Toplu sertifika"
          onSubmit={(e) => {
            e.preventDefault()
            if (ready) setConfirming(true)
          }}
        >
          <Stack gap={6}>
            {isAdmin && clubs.length > 0 && (
              <Select
                id="batch-club"
                labelText="Sertifikayı veren kulüp"
                value={club?.id ?? ''}
                onChange={(e) => setClubId(Number(e.target.value))}
              >
                {clubs.map((c) => (
                  <SelectItem key={c.id} value={c.id} text={clubLabel(c)} />
                ))}
              </Select>
            )}
            <TextInput
              id="batch-title"
              labelText="Sertifika başlığı"
              placeholder="Ör. Robotik Atölyesi Katılım Sertifikası"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <DateField id="batch-date" labelText="Etkinlik tarihi" value={date} onChange={setDate} />
            <TextInput
              id="batch-issuer"
              labelText="Veren kurum veya kişi"
              placeholder={club ? clubLabel(club) : undefined}
              helperText="Boş bırakılırsa kulüp adı kullanılır."
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
            />
            <TextArea
              id="batch-list"
              labelText="Katılım listesi"
              helperText={`Her satırda bir kişi: "Ad Soyad, e-posta". Excel'den yapıştırabilirsiniz. Okul adreslerinde ad gerekmez, okul dışı adreslerde gerekir. En fazla ${MAX_RECIPIENTS} kişi.`}
              rows={8}
              value={list}
              onChange={(e) => setList(e.target.value)}
              invalid={tooMany}
              invalidText={`Tek listede en fazla ${MAX_RECIPIENTS} kişi olabilir.`}
            />
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              aria-label="Listeyi CSV dosyasından al"
              onChange={(e) => void readFile(e.target.files?.[0])}
            />
            {list.trim() && (
              <p className="helper">
                {people.length} kişi bulundu{outsiders.length > 0 && `, ${outsiders.length} kişi okul dışı`}.
                {ignored.length > 0 && ` E-posta adresi olmayan ${ignored.length} satır atlanacak: ${ignored.slice(0, 3).join(' · ')}`}
              </p>
            )}
            {unnamed.length > 0 && (
              <InlineNotification
                kind="warning"
                title="Ad eksik"
                subtitle={`Okul dışı ${unnamed.length} kişinin adı yok: ${unnamed.slice(0, 3).map((p) => p.email).join(' · ')}`}
                hideCloseButton
                lowContrast
              />
            )}
            <div className="form-actions">
              <Button type="submit" renderIcon={Send} disabled={!ready}>
                Sertifikaları gönder
              </Button>
            </div>
          </Stack>
        </Form>
      </Tile>

      <section className="section editors-section" aria-labelledby="batches-title">
        <div className="editors-section__header">
          <div>
            <h2 id="batches-title" className="section__title">
              Son gönderimler
            </h2>
            <p className="helper">Okulda kayıtlı olmayıp adı da yazılmayan adresler işlenmez ve burada listelenir.</p>
          </div>
          <Button kind="ghost" renderIcon={Renew} disabled={busy} onClick={() => void refresh()}>
            Yenile
          </Button>
        </div>

        {loadError && (
          <InlineNotification kind="error" title="Hata" subtitle={loadError} onClose={() => setLoadError(null)} lowContrast />
        )}

        <DataList
          rows={batches}
          columns={columns}
          loading={loading}
          searchPlaceholder="Etkinlik ara"
          searchText={(b) => b.title}
          emptyState={loadError ? null : <EmptyState title="Henüz gönderim yok" body="Gönderdiğiniz listeler burada izlenir." />}
        />

        {failed.length > 0 && (
          <div className="section" style={{ marginTop: '1.5rem' }}>
            <DataList
              title="Sorunlu kişiler"
              rows={failed}
              columns={failedColumns}
              searchPlaceholder="Kişi ara"
              searchText={(r) => `${r.email ?? ''} ${r.name} ${r.title}`}
              emptyState={null}
            />
          </div>
        )}
      </section>

      <Modal
        open={confirming}
        modalHeading="Sertifikaları gönder"
        primaryButtonText={busy ? 'İletiliyor…' : `${people.length} kişiye gönder`}
        secondaryButtonText="Vazgeç"
        primaryButtonDisabled={busy}
        onRequestClose={() => !busy && setConfirming(false)}
        onRequestSubmit={() => void handleSend()}
        size="sm"
      >
        {busy ? (
          <InlineLoading description="İletiliyor…" />
        ) : (
          <Stack gap={4}>
            <p>
              <strong>{title.trim()}</strong> sertifikası {people.length} kişi için üretilecek ve herkese e-posta gidecek. Bu işlem
              geri alınamaz; yanlış verilen sertifika Sertifikalar sayfasından tek tek silinir.
            </p>
            {outsiders.length > 0 && (
              <p>
                Okul dışı kişilerin adı listedeki gibi yazılacak: {outsiders.slice(0, 5).map((p) => p.name).join(', ')}
                {outsiders.length > 5 && ` ve ${outsiders.length - 5} kişi daha`}
              </p>
            )}
          </Stack>
        )}
      </Modal>
    </div>
  )
}
