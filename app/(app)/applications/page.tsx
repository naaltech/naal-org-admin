'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  InlineNotification,
  MenuButton,
  MenuItem,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  RadioButton,
  RadioButtonGroup,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextArea,
} from '@carbon/react'
import { Email, Renew, TrashCan } from '@carbon/icons-react'
import PageHeader from '@/components/page-header'
import DataList, { EmptyState, type Column } from '@/components/data-list'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'
import { exportCsv, exportPdf, exportXlsx, type ExportTable } from '@/lib/application-export'
import {
  answerText,
  CHOICE_TYPES,
  deleteApplication,
  fetchApplications,
  formatDateTime,
  notifyApplicants,
  previewNotification,
  STATUS_LABELS,
} from '@/lib/applications'
import { formatDate } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type {
  ApplicationQuestion,
  ApplicationReview,
  ApplicationStatus,
  ApplicationSubmission,
  ClubForm,
  NotificationEmail,
} from '@/lib/types'

interface Row {
  id: number
  submission: ApplicationSubmission
  status: ApplicationStatus
  note: string
  message: string
  /** Mevcut sonuç başvurana bildirildi mi; durum sonradan değişirse false olur. */
  notified: boolean
}

interface Draft {
  status: ApplicationStatus
  note: string
  message: string
}

const canNotify = (row: Row) => row.status !== 'pending' && !row.notified

const STATUS_TAG: Record<ApplicationStatus, 'gray' | 'green' | 'red'> = {
  pending: 'gray',
  accepted: 'green',
  rejected: 'red',
}

/** Tabloda tarih ve durumun yanında gösterilen ilk sorular (genellikle ad ve sınıf). */
const PREVIEW_QUESTIONS = 2

export default function ApplicationsPage() {
  const { isAdmin } = useAuth()
  const notify = useToast()

  const [forms, setForms] = useState<ClubForm[] | null>(null)
  const [formId, setFormId] = useState('')
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([])
  const [submissions, setSubmissions] = useState<ApplicationSubmission[]>([])
  const [reviews, setReviews] = useState<Record<string, ApplicationReview>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')
  const [questionFilter, setQuestionFilter] = useState('')
  const [answerFilter, setAnswerFilter] = useState('')

  const [selected, setSelected] = useState<Row | null>(null)
  const [draft, setDraft] = useState<Draft>({ status: 'pending', note: '', message: '' })
  const [deleting, setDeleting] = useState<Row | null>(null)
  const [busy, setBusy] = useState(false)

  const [preview, setPreview] = useState<{ row: Row; email: NotificationEmail; alreadyNotified: boolean } | null>(null)
  const [bulkNotify, setBulkNotify] = useState<Row[] | null>(null)
  // Kabul/Red seçimi hemen kaydedilmez; önce gidecek e-posta gösterilip onay istenir.
  const [statusChange, setStatusChange] = useState<{
    row: Row
    draft: Draft
    email?: NotificationEmail
    error?: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    void supabase
      .from('club_forms')
      .select('form_id, club_code, title, since')
      .order('club_code')
      .order('created_at')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Error fetching forms:', error)
          setLoadError('Başvuru formları yüklenemedi. Sayfayı yenileyip tekrar deneyin.')
          setLoading(false)
          return
        }
        const list = (data ?? []) as ClubForm[]
        setForms(list)
        setFormId(list[0]?.form_id ?? '')
        if (list.length === 0) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!formId) return
    let cancelled = false

    void Promise.all([
      fetchApplications(formId),
      supabase.from('application_reviews').select('*').eq('form_id', formId),
    ])
      .then(([result, reviewResult]) => {
        if (cancelled) return
        if (reviewResult.error) throw reviewResult.error
        const sorted = [...result.submissions].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        setQuestions(result.questions)
        setSubmissions(sorted)
        setReviews(Object.fromEntries((reviewResult.data as ApplicationReview[]).map((r) => [r.submission_id, r])))
      })
      .catch((error: unknown) => {
        if (cancelled) return
        console.error('Error fetching applications:', error)
        setLoadError(error instanceof Error ? error.message : 'Başvurular yüklenemedi.')
        setSubmissions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [formId, reloadKey])

  const form = forms?.find((f) => f.form_id === formId)
  const choiceQuestions = questions.filter((q) => CHOICE_TYPES.has(q.type))
  const previewQuestions = questions.slice(0, PREVIEW_QUESTIONS)

  const rows = useMemo<Row[]>(
    () =>
      submissions.map((submission, index) => {
        const review = reviews[submission.id]
        const status = review?.status ?? 'pending'
        return {
          id: index,
          submission,
          status,
          note: review?.note ?? '',
          message: review?.message ?? '',
          notified: status !== 'pending' && review?.notified_status === status,
        }
      }),
    [submissions, reviews],
  )

  // Seçilen sorunun cevaplarında geçen seçenekler (çoklu seçimlerde her seçenek ayrı).
  const answerOptions = useMemo(() => {
    if (!questionFilter) return []
    const values = new Set<string>()
    for (const s of submissions) {
      const answer = s.answers[questionFilter]
      for (const value of Array.isArray(answer) ? answer : [answer]) if (value) values.add(value)
    }
    return [...values].sort((a, b) => a.localeCompare(b, 'tr'))
  }, [submissions, questionFilter])

  const filteredRows = rows.filter((row) => {
    if (statusFilter !== 'all' && row.status !== statusFilter) return false
    if (questionFilter && answerFilter) {
      const answer = row.submission.answers[questionFilter]
      if (Array.isArray(answer) ? !answer.includes(answerFilter) : answer !== answerFilter) return false
    }
    return true
  })

  const counts = rows.reduce(
    (acc, row) => ({ ...acc, [row.status]: acc[row.status] + 1 }),
    { pending: 0, accepted: 0, rejected: 0 } as Record<ApplicationStatus, number>,
  )

  // Yükleme durumu efektte değil, yeniden yüklemeyi başlatan olayda açılır.
  const reload = () => {
    setLoading(true)
    setLoadError(null)
  }

  const changeForm = (id: string) => {
    reload()
    setFormId(id)
    setQuestionFilter('')
    setAnswerFilter('')
  }

  const openReview = (row: Row) => {
    setSelected(row)
    setDraft({ status: row.status, note: row.note, message: row.message })
  }

  const saveReview = useCallback(
    async (submissionId: string, { status, note, message }: Draft) => {
      setBusy(true)
      const { data, error } = await supabase
        .from('application_reviews')
        .upsert({
          submission_id: submissionId,
          form_id: formId,
          status,
          note,
          message,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
      setBusy(false)
      if (error || !data) {
        console.error('Error saving review:', error)
        notify('error', 'Kaydedilemedi', error?.message)
        return false
      }
      setReviews((prev) => ({ ...prev, [submissionId]: data as ApplicationReview }))
      return true
    },
    [formId, notify],
  )

  const trimmedDraft = (): Draft => ({ status: draft.status, note: draft.note.trim(), message: draft.message.trim() })

  const requestStatusChange = async (row: Row, next: Draft) => {
    if (next.status === 'pending') return
    setStatusChange({ row, draft: next })
    try {
      const { email } = await previewNotification(formId, row.submission.id, {
        status: next.status,
        message: next.message,
      })
      setStatusChange((current) => (current?.row.submission.id === row.submission.id ? { ...current, email } : current))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'E-posta hazırlanamadı.'
      setStatusChange((current) =>
        current?.row.submission.id === row.submission.id ? { ...current, error: message } : current,
      )
    }
  }

  const handleSave = async () => {
    if (!selected) return
    const next = trimmedDraft()
    if (next.status !== 'pending' && next.status !== selected.status) {
      setSelected(null)
      await requestStatusChange(selected, next)
      return
    }
    if (await saveReview(selected.submission.id, next)) {
      setSelected(null)
      notify('success', 'Değerlendirme kaydedildi')
    }
  }

  const quickStatus = async (row: Row, status: ApplicationStatus) => {
    const next = { status, note: row.note, message: row.message }
    if (status !== 'pending') {
      await requestStatusChange(row, next)
      return
    }
    if (await saveReview(row.submission.id, next)) {
      notify('success', `Durum: ${STATUS_LABELS[status]}`)
    }
  }

  const confirmStatusChange = async (sendEmail: boolean) => {
    if (!statusChange) return
    const { row, draft: next } = statusChange
    if (!(await saveReview(row.submission.id, next))) return
    setStatusChange(null)
    if (sendEmail) {
      await sendNotifications([{ ...row, ...next, notified: false }])
    } else {
      notify('success', `Durum: ${STATUS_LABELS[next.status]}`, 'E-posta gönderilmedi.')
    }
  }

  // E-posta sunucuda kayıtlı durum ve mesajdan oluşturulur; önizleme gönderilecek e-postanın aynısıdır.
  const openPreview = async (row: Row) => {
    setBusy(true)
    try {
      const result = await previewNotification(formId, row.submission.id)
      setPreview({ row, ...result })
    } catch (error) {
      notify('error', 'E-posta hazırlanamadı', error instanceof Error ? error.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const sendNotifications = async (targets: Row[]) => {
    setBusy(true)
    try {
      const results = await notifyApplicants(
        formId,
        targets.map((r) => r.submission.id),
      )
      const sent = results.filter((r) => !r.error)
      const failed = results.filter((r) => r.error)
      const notifiedAt = new Date().toISOString()
      setReviews((prev) => {
        const next = { ...prev }
        for (const r of sent) {
          const review = next[r.submission_id]
          if (review && review.status !== 'pending') {
            next[r.submission_id] = { ...review, notified_at: notifiedAt, notified_status: review.status }
          }
        }
        return next
      })
      if (sent.length > 0) notify('success', `${sent.length} başvurana sonuç e-postası gönderildi`)
      if (failed.length > 0) {
        notify('error', `${failed.length} e-posta gönderilemedi`, failed[0].error)
      }
      setPreview(null)
      setBulkNotify(null)
    } catch (error) {
      notify('error', 'E-postalar gönderilemedi', error instanceof Error ? error.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const pendingNotifications = filteredRows.filter(canNotify)

  const handleDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteApplication(formId, deleting.submission.id)
      setSubmissions((prev) => prev.filter((s) => s.id !== deleting.submission.id))
      setDeleting(null)
      setSelected(null)
      notify('success', 'Başvuru silindi')
    } catch (error) {
      notify('error', 'Silinemedi', error instanceof Error ? error.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  // Dışa aktarma, durum ve soru filtrelerine uyan başvuruları içerir.
  const exportTable = (): ExportTable => {
    const filters = [
      statusFilter !== 'all' && `Durum: ${STATUS_LABELS[statusFilter]}`,
      questionFilter &&
        answerFilter &&
        `${questions.find((q) => q.id === questionFilter)?.title ?? ''}: ${answerFilter}`,
    ].filter(Boolean)
    return {
      fileName: `basvurular-${form?.club_code ?? 'kulup'}-${new Date().toISOString().slice(0, 10)}`,
      title: form ? `${form.club_code} — ${form.title}` : 'Başvurular',
      subtitle: [`${formatDateTime(new Date().toISOString())}`, `${filteredRows.length} başvuru`, ...filters].join(' · '),
      header: ['#', 'Tarih', ...questions.map((q) => q.title), 'Durum', 'Not'],
      body: filteredRows.map((row, index) => [
        String(index + 1),
        formatDateTime(row.submission.submittedAt),
        ...questions.map((q) => answerText(row.submission.answers[q.id])),
        STATUS_LABELS[row.status],
        row.note,
      ]),
    }
  }

  const runExport = async (exporter: (table: ExportTable) => void | Promise<void>) => {
    try {
      await exporter(exportTable())
    } catch (error) {
      console.error('Export error:', error)
      notify('error', 'Dosya oluşturulamadı', error instanceof Error ? error.message : undefined)
    }
  }

  const columns: Column<Row>[] = [
    { key: 'date', header: 'Tarih', render: (r) => formatDateTime(r.submission.submittedAt) },
    ...previewQuestions.map((q) => ({
      key: q.id,
      header: q.title,
      render: (r: Row) => {
        const text = answerText(r.submission.answers[q.id])
        return (
          <span className="cell-truncate" title={text}>
            {text || '—'}
          </span>
        )
      },
    })),
    {
      key: 'status',
      header: 'Durum',
      render: (r) => (
        <>
          <Tag type={STATUS_TAG[r.status]} size="sm">
            {STATUS_LABELS[r.status]}
          </Tag>
          {r.notified && (
            <Tag type="outline" size="sm">
              Bildirildi
            </Tag>
          )}
        </>
      ),
    },
  ]

  if (forms !== null && forms.length === 0 && !loadError) {
    return (
      <div className="page">
        <PageHeader title="Başvurular" />
        <EmptyState
          title="Kulübünüze bağlı bir başvuru formu yok"
          body="Tally'deki başvuru formunuzun panele bağlanması için süper yöneticiyle iletişime geçin."
        />
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        title="Başvurular"
        description={
          form
            ? `${formatDate(form.since)} tarihinden bu yana gelen başvurular. Toplam ${rows.length}: ${counts.pending} beklemede, ${counts.accepted} kabul, ${counts.rejected} red.`
            : 'Tally formlarınıza gelen başvuruları inceleyin.'
        }
        actions={
          <Button
            kind="tertiary"
            size="lg"
            renderIcon={Renew}
            disabled={loading}
            onClick={() => {
              reload()
              setReloadKey((k) => k + 1)
            }}
          >
            Yenile
          </Button>
        }
      />

      {loadError && (
        <InlineNotification kind="error" title="Hata" subtitle={loadError} onClose={() => setLoadError(null)} lowContrast />
      )}

      <div className="filter-bar">
        {forms && forms.length > 1 && (
          <Select id="app-form" labelText="Form" value={formId} onChange={(e) => changeForm(e.target.value)}>
            {forms.map((f) => (
              <SelectItem key={f.form_id} value={f.form_id} text={isAdmin ? `${f.club_code} — ${f.title}` : f.title} />
            ))}
          </Select>
        )}
        <Select
          id="app-status"
          labelText="Durum"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'all')}
        >
          <SelectItem value="all" text="Tümü" />
          {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((s) => (
            <SelectItem key={s} value={s} text={`${STATUS_LABELS[s]} (${counts[s]})`} />
          ))}
        </Select>
        {choiceQuestions.length > 0 && (
          <Select
            id="app-question"
            labelText="Soruya göre"
            value={questionFilter}
            onChange={(e) => {
              setQuestionFilter(e.target.value)
              setAnswerFilter('')
            }}
          >
            <SelectItem value="" text="Filtre yok" />
            {choiceQuestions.map((q) => (
              <SelectItem key={q.id} value={q.id} text={q.title} />
            ))}
          </Select>
        )}
        {questionFilter && (
          <Select id="app-answer" labelText="Cevap" value={answerFilter} onChange={(e) => setAnswerFilter(e.target.value)}>
            <SelectItem value="" text="Tümü" />
            {answerOptions.map((value) => (
              <SelectItem key={value} value={value} text={value} />
            ))}
          </Select>
        )}
      </div>

      <DataList
        rows={filteredRows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Başvurularda ara"
        onRowClick={openReview}
        searchText={(r) => `${questions.map((q) => answerText(r.submission.answers[q.id])).join(' ')} ${r.note}`}
        toolbarActions={
          <>
            <Button
              kind="ghost"
              size="lg"
              renderIcon={Email}
              disabled={busy || pendingNotifications.length === 0}
              onClick={() => setBulkNotify(pendingNotifications)}
            >
              Sonuçları bildir ({pendingNotifications.length})
            </Button>
            <MenuButton label="Dışa aktar" kind="ghost" size="lg" menuAlignment="bottom-end" disabled={filteredRows.length === 0}>
              <MenuItem label="Excel (.xlsx)" onClick={() => void runExport(exportXlsx)} />
              <MenuItem label="PDF" onClick={() => void runExport(exportPdf)} />
              <MenuItem label="CSV" onClick={() => void runExport(exportCsv)} />
            </MenuButton>
          </>
        }
        emptyState={
          loadError ? null : rows.length > 0 ? (
            <EmptyState title="Filtreye uyan başvuru yok" body="Durum ya da soru filtresini değiştirip tekrar deneyin." />
          ) : (
            <EmptyState
              title="Bu dönem henüz başvuru yok"
              body={form ? `${formatDate(form.since)} tarihinden sonra gelen başvurular burada görünecek.` : ''}
            />
          )
        }
        renderActions={(row) => (
          <OverflowMenu aria-label="Başvuru eylemleri" flipped size="md">
            <OverflowMenuItem itemText="İncele" onClick={() => openReview(row)} />
            {row.status !== 'pending' && (
              <OverflowMenuItem
                itemText={row.notified ? 'Sonucu yeniden bildir' : 'Sonucu e-postayla bildir'}
                onClick={() => void openPreview(row)}
              />
            )}
            {(Object.keys(STATUS_LABELS) as ApplicationStatus[])
              .filter((s) => s !== row.status)
              .map((s) => (
                <OverflowMenuItem key={s} itemText={`${STATUS_LABELS[s]} olarak işaretle`} onClick={() => void quickStatus(row, s)} />
              ))}
            <OverflowMenuItem itemText="Sil" isDelete hasDivider onClick={() => setDeleting(row)} />
          </OverflowMenu>
        )}
      />

      <Modal
        open={selected !== null}
        modalHeading="Başvuru"
        modalLabel={selected ? formatDateTime(selected.submission.submittedAt) : undefined}
        primaryButtonText={busy ? 'Kaydediliyor…' : 'Kaydet'}
        secondaryButtonText="Kapat"
        primaryButtonDisabled={busy}
        onRequestClose={() => setSelected(null)}
        onRequestSubmit={() => void handleSave()}
        size="md"
      >
        {selected && (
          <Stack gap={7}>
            <dl className="answer-list">
              {questions.map((q) => (
                <div key={q.id} className="answer-list__item">
                  <dt>{q.title}</dt>
                  <dd>{answerText(selected.submission.answers[q.id]) || '—'}</dd>
                </div>
              ))}
            </dl>
            <RadioButtonGroup
              legendText="Durum"
              name="app-review-status"
              valueSelected={draft.status}
              onChange={(value) => setDraft({ ...draft, status: value as ApplicationStatus })}
            >
              {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((s) => (
                <RadioButton key={s} id={`app-review-${s}`} value={s} labelText={STATUS_LABELS[s]} />
              ))}
            </RadioButtonGroup>
            <TextArea
              id="app-review-note"
              labelText="Not"
              helperText="Yalnızca kulüp yönetimi görür; başvurana iletilmez."
              rows={3}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
            <TextArea
              id="app-review-message"
              labelText="Başvurana mesaj"
              helperText="Sonuç e-postasına eklenir, ör. ilk toplantının günü ve yeri."
              rows={3}
              value={draft.message}
              onChange={(e) => setDraft({ ...draft, message: e.target.value })}
            />
            <div>
              <Button
                kind="danger--tertiary"
                size="md"
                renderIcon={TrashCan}
                onClick={() => {
                  // İki modal üst üste açılmasın; onay penceresi incelemenin yerine geçer.
                  setDeleting(selected)
                  setSelected(null)
                }}
              >
                Başvuruyu sil
              </Button>
            </div>
          </Stack>
        )}
      </Modal>

      <Modal
        open={statusChange !== null}
        modalHeading={statusChange ? `${STATUS_LABELS[statusChange.draft.status]} olarak işaretle` : ''}
        primaryButtonText={
          busy ? 'Kaydediliyor…' : statusChange?.email ? 'İşaretle ve e-posta gönder' : 'Sadece işaretle'
        }
        primaryButtonDisabled={busy || (!statusChange?.email && !statusChange?.error)}
        secondaryButtons={
          statusChange?.email
            ? [
                { buttonText: 'Vazgeç', onClick: () => setStatusChange(null) },
                { buttonText: 'Sadece işaretle', onClick: () => void confirmStatusChange(false) },
              ]
            : [{ buttonText: 'Vazgeç', onClick: () => setStatusChange(null) }]
        }
        onRequestClose={() => setStatusChange(null)}
        onRequestSubmit={() => void confirmStatusChange(Boolean(statusChange?.email))}
        size="md"
      >
        {statusChange && (
          <Stack gap={5}>
            {statusChange.email ? (
              <>
                <p>
                  Başvuru <strong>{STATUS_LABELS[statusChange.draft.status]}</strong> olarak işaretlenecek ve{' '}
                  <strong>{statusChange.email.to}</strong> adresine aşağıdaki e-posta gönderilecek.
                </p>
                <p>
                  <strong>Konu:</strong> {statusChange.email.subject}
                </p>
                <pre className="email-preview">{statusChange.email.text}</pre>
              </>
            ) : statusChange.error ? (
              <InlineNotification
                kind="warning"
                lowContrast
                hideCloseButton
                title="E-posta gönderilemeyecek"
                subtitle={`${statusChange.error} Başvuru yalnızca ${STATUS_LABELS[statusChange.draft.status]} olarak işaretlenir.`}
              />
            ) : (
              <p className="helper">Gönderilecek e-posta hazırlanıyor…</p>
            )}
          </Stack>
        )}
      </Modal>

      <Modal
        open={preview !== null}
        modalHeading="Sonuç e-postası"
        modalLabel={preview ? `Alıcı: ${preview.email.to}` : undefined}
        primaryButtonText={busy ? 'Gönderiliyor…' : 'Gönder'}
        secondaryButtonText="Vazgeç"
        primaryButtonDisabled={busy}
        onRequestClose={() => setPreview(null)}
        onRequestSubmit={() => preview && void sendNotifications([preview.row])}
        size="md"
      >
        {preview && (
          <Stack gap={5}>
            {preview.alreadyNotified && (
              <InlineNotification
                kind="warning"
                lowContrast
                hideCloseButton
                title="Bu sonuç daha önce bildirildi"
                subtitle="Gönderirseniz başvurana ikinci kez e-posta gider."
              />
            )}
            <p>
              <strong>Konu:</strong> {preview.email.subject}
            </p>
            <pre className="email-preview">{preview.email.text}</pre>
          </Stack>
        )}
      </Modal>

      <Modal
        open={bulkNotify !== null}
        modalHeading="Sonuçları bildir"
        primaryButtonText={busy ? 'Gönderiliyor…' : `${bulkNotify?.length ?? 0} e-posta gönder`}
        secondaryButtonText="Vazgeç"
        primaryButtonDisabled={busy}
        onRequestClose={() => setBulkNotify(null)}
        onRequestSubmit={() => bulkNotify && void sendNotifications(bulkNotify)}
        size="sm"
      >
        {bulkNotify && (
          <Stack gap={5}>
            <p>
              Henüz bildirilmemiş{' '}
              <strong>
                {bulkNotify.filter((r) => r.status === 'accepted').length} kabul ve{' '}
                {bulkNotify.filter((r) => r.status === 'rejected').length} red
              </strong>{' '}
              sonucu, başvuranların formda yazdığı e-posta adresine gönderilecek. Filtreler uygulanıyorsa yalnızca listede
              görünen başvurular dahildir.
            </p>
            <p className="helper">
              Gönderilecek e-postayı görmek için tablodan bir başvuruda &quot;Sonucu e-postayla bildir&quot;i seçin.
              E-postası olmayan ya da geçersiz olan başvurular atlanır.
            </p>
          </Stack>
        )}
      </Modal>

      <ConfirmDeleteModal
        open={deleting !== null}
        heading="Başvuruyu sil"
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      >
        {deleting && (
          <>
            <strong>{answerText(deleting.submission.answers[questions[0]?.id]) || 'Bu başvuru'}</strong> Tally&apos;den
            kalıcı olarak silinecek.
          </>
        )}
      </ConfirmDeleteModal>
    </div>
  )
}
