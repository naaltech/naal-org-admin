'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Button,
  FormGroup,
  IconButton,
  InlineLoading,
  InlineNotification,
  Link,
  Modal,
  NumberInput,
  OverflowMenu,
  OverflowMenuItem,
  Select,
  SelectItem,
  Stack,
  Tag,
  TextArea,
  TextInput,
  Toggle,
} from '@carbon/react'
import { Add, TrashCan, Upload } from '@carbon/icons-react'
import PageHeader from '@/components/page-header'
import DataList, { EmptyState, type Column } from '@/components/data-list'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import DateField from '@/components/date-field'
import MagazineEditors from '@/components/magazine-editors'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'
import { formatDate, isHttpUrl } from '@/lib/format'
import {
  MAX_MAGAZINE_BYTES,
  MAX_MAGAZINE_LABEL,
  removeMagazineFiles,
  renderPdfCover,
  toRoman,
  uploadMagazineFile,
} from '@/lib/magazines'
import { hasMagazine, MAGAZINE_CLUBS } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import type { Magazine, MagazineStory } from '@/lib/types'

interface IssueForm {
  id?: number
  club_code: string
  issue_number: number | ''
  title: string
  published_on: string
  description: string
  summary: string
  stories: MagazineStory[]
  external_url: string
  published: boolean
  pdf_url: string | null
  cover_url: string | null
  /** Seçilen ama henüz yüklenmemiş PDF ve ondan üretilen kapak. */
  pdfFile: File | null
  cover: Blob | null
  coverPreview: string | null
}

function emptyForm(club_code: string, issue_number: number): IssueForm {
  return {
    club_code,
    issue_number,
    title: '',
    published_on: '',
    description: '',
    summary: '',
    stories: [],
    external_url: '',
    published: false,
    pdf_url: null,
    cover_url: null,
    pdfFile: null,
    cover: null,
    coverPreview: null,
  }
}

function toForm(row: Magazine): IssueForm {
  return {
    id: row.id,
    club_code: row.club_code,
    issue_number: row.issue_number,
    title: row.title,
    published_on: row.published_on ?? '',
    description: row.description,
    summary: row.summary,
    stories: row.stories ?? [],
    external_url: row.external_url ?? '',
    published: row.published,
    pdf_url: row.pdf_url,
    cover_url: row.cover_url,
    pdfFile: null,
    cover: null,
    coverPreview: null,
  }
}

function issueLabel(row: Pick<Magazine, 'issue_number' | 'title'>): string {
  return [`Sayı ${toRoman(row.issue_number)}`, row.title.trim()].filter(Boolean).join(' · ')
}

function siteUrl(clubCode: string): string {
  return `https://${clubCode}.naal.org.tr/dergi`
}

export default function MagazinePage() {
  const { isAdmin, clubCode: accountClub, editorClub } = useAuth()
  // Kulüp yönetimi seçili kulübü, dergi editörü bağlı olduğu kulübü yönetir.
  const clubCode = editorClub ?? accountClub
  const notify = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const allowed = isAdmin || hasMagazine(clubCode)

  const [issues, setIssues] = useState<Magazine[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState<IssueForm | null>(null)
  const [touched, setTouched] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [deleting, setDeleting] = useState<Magazine | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!allowed) return
    let cancelled = false
    let query = supabase.from('magazines').select('*').order('issue_number', { ascending: false })
    if (!isAdmin) query = query.eq('club_code', clubCode)

    void query.then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        console.error('Error fetching magazines:', error)
        setLoadError('Dergi sayıları yüklenemedi. Sayfayı yenileyip tekrar deneyin.')
      } else {
        setIssues((data ?? []) as Magazine[])
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [allowed, isAdmin, clubCode])

  // Kapak önizlemesi için açılan object URL'ler sızmasın.
  const previewUrl = form?.coverPreview
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const update = <K extends keyof IssueForm>(key: K, value: IssueForm[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))

  const openForm = (row?: Magazine) => {
    setTouched(false)
    if (row) {
      setForm(toForm(row))
      return
    }
    const club = isAdmin ? MAGAZINE_CLUBS[0] : clubCode
    const last = Math.max(0, ...issues.filter((i) => i.club_code === club).map((i) => i.issue_number))
    setForm(emptyForm(club, last + 1))
  }

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // aynı dosya tekrar seçilebilsin
    if (!file) return

    if (file.size > MAX_MAGAZINE_BYTES) {
      notify('error', 'PDF çok büyük', `Dosya en fazla ${MAX_MAGAZINE_LABEL} olabilir.`)
      return
    }
    // MIME türü tarayıcıdan gelir; asıl kontrol dosya imzasıdır.
    const magic = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer())
    if (magic !== '%PDF-') {
      notify('error', 'Yalnızca PDF dosyası yüklenebilir')
      return
    }

    setPreparing(true)
    try {
      const cover = await renderPdfCover(file)
      setForm((prev) =>
        prev ? { ...prev, pdfFile: file, cover, coverPreview: URL.createObjectURL(cover) } : prev,
      )
    } catch (err) {
      console.error('Cover render failed:', err)
      notify('error', 'PDF okunamadı', 'Kapak ilk sayfadan oluşturulamadı. Dosyanın bozuk olmadığından emin olun.')
    } finally {
      setPreparing(false)
    }
  }

  const issueNumber = form?.issue_number
  const externalUrl = form?.external_url.trim() ?? ''
  const hasFile = Boolean(form && (form.pdfFile || form.pdf_url || externalUrl))
  const errors = {
    issue: form && !(Number.isInteger(issueNumber) && Number(issueNumber) > 0) ? 'Pozitif bir sayı girin.' : null,
    external: externalUrl && !isHttpUrl(externalUrl) ? 'http:// veya https:// ile başlamalı.' : null,
    file: form?.published && !hasFile ? 'Yayımlamak için PDF yükleyin ya da bağlantı girin.' : null,
  }
  const formInvalid = Boolean(errors.issue || errors.external || errors.file)

  const handleSave = async () => {
    setTouched(true)
    if (!form || formInvalid) return
    const club_code = isAdmin ? form.club_code : clubCode
    const number = Number(form.issue_number)

    setBusy(true)
    let pdf_url = form.pdf_url
    let cover_url = form.cover_url
    const uploaded: string[] = []
    try {
      if (form.pdfFile && form.cover) {
        const name = `sayi-${String(number).padStart(2, '0')}`
        pdf_url = await uploadMagazineFile(club_code, name, form.pdfFile)
        uploaded.push(pdf_url)
        cover_url = await uploadMagazineFile(club_code, `${name}-kapak`, form.cover)
        uploaded.push(cover_url)
      }
    } catch (err) {
      setBusy(false)
      void removeMagazineFiles(uploaded)
      notify('error', 'PDF yüklenemedi', err instanceof Error ? err.message : undefined)
      return
    }

    const row = {
      club_code,
      issue_number: number,
      title: form.title.trim(),
      published_on: form.published_on || null,
      description: form.description.trim(),
      summary: form.summary.trim(),
      stories: form.stories
        .map((s) => ({ title: s.title.trim(), detail: s.detail.trim() }))
        .filter((s) => s.title),
      external_url: externalUrl || null,
      published: form.published,
      pdf_url,
      cover_url,
    }
    let request = form.id
      ? supabase.from('magazines').update({ ...row, updated_at: new Date().toISOString() }).eq('id', form.id)
      : supabase.from('magazines').insert(row)
    if (form.id && !isAdmin) request = request.eq('club_code', clubCode)
    const { data, error } = await request.select().single()
    setBusy(false)

    if (error || !data) {
      console.error('Error saving magazine:', error)
      void removeMagazineFiles(uploaded)
      notify(
        'error',
        'Kaydedilemedi',
        error?.code === '23505' ? `Sayı ${toRoman(number)} zaten var.` : error?.message,
      )
      return
    }
    const saved = data as Magazine
    if (form.pdfFile) {
      const previous = issues.find((i) => i.id === saved.id)
      if (previous) void removeMagazineFiles([previous.pdf_url, previous.cover_url])
    }
    setIssues((prev) =>
      (form.id ? prev.map((i) => (i.id === saved.id ? saved : i)) : [saved, ...prev]).sort(
        (a, b) => b.issue_number - a.issue_number,
      ),
    )
    setForm(null)
    notify(
      'success',
      form.id ? 'Sayı güncellendi' : 'Sayı eklendi',
      saved.published ? 'Sitede en geç 5 dakika içinde görünür.' : 'Taslak olarak kaydedildi.',
    )
  }

  const handleDelete = async () => {
    if (!deleting) return
    setBusy(true)
    let request = supabase.from('magazines').delete().eq('id', deleting.id)
    if (!isAdmin) request = request.eq('club_code', clubCode)
    const { error } = await request
    setBusy(false)

    if (error) {
      console.error('Error deleting magazine:', error)
      notify('error', 'Silinemedi', error.message)
      return
    }
    void removeMagazineFiles([deleting.pdf_url, deleting.cover_url])
    setIssues((prev) => prev.filter((i) => i.id !== deleting.id))
    setDeleting(null)
    notify('success', 'Sayı silindi')
  }

  if (!allowed) {
    return (
      <div className="page page--narrow">
        <PageHeader title="Dergi" />
        <InlineNotification
          kind="info"
          title="Bu kulüp için dergi yayımlama açık değil"
          subtitle="Kulübünüzün bir dergisi varsa site yöneticisiyle iletişime geçin."
          hideCloseButton
          lowContrast
        />
      </div>
    )
  }

  const coverSrc = form?.coverPreview ?? form?.cover_url ?? null

  const columns: Column<Magazine>[] = [
    {
      key: 'cover',
      header: 'Kapak',
      render: (r) =>
        r.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- Storage'daki herkese açık kapak
          <img src={r.cover_url} alt="" className="magazine-thumb" />
        ) : (
          <div className="magazine-thumb" aria-hidden />
        ),
    },
    ...(isAdmin ? [{ key: 'club', header: 'Kulüp', render: (r: Magazine) => r.club_code }] : []),
    { key: 'issue', header: 'Sayı', render: (r) => issueLabel(r) },
    { key: 'date', header: 'Yayın tarihi', render: (r) => formatDate(r.published_on) },
    {
      key: 'status',
      header: 'Durum',
      render: (r) =>
        r.published ? (
          <Tag type="green" size="sm">Yayında</Tag>
        ) : (
          <Tag type="gray" size="sm">Taslak</Tag>
        ),
    },
    {
      key: 'file',
      header: 'Dosya',
      render: (r) => {
        const href = r.pdf_url ?? r.external_url
        return href ? (
          <Link href={href} target="_blank" rel="noopener noreferrer">
            {r.pdf_url ? 'PDF' : 'Bağlantı'}
          </Link>
        ) : (
          '—'
        )
      },
    },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Dergi"
        description={
          <>
            Sayılar <Link href={siteUrl(isAdmin ? MAGAZINE_CLUBS[0] : clubCode)} target="_blank" rel="noopener noreferrer">
              {siteUrl(isAdmin ? MAGAZINE_CLUBS[0] : clubCode).replace('https://', '')}
            </Link>{' '}
            adresinde yayımlanır. Yayındaki en yüksek numaralı sayı güncel sayı, diğerleri önceki sayılar olarak
            gösterilir.
          </>
        }
        actions={
          <Button renderIcon={Add} size="lg" onClick={() => openForm()}>
            Yeni sayı
          </Button>
        }
      />

      {loadError && (
        <InlineNotification kind="error" title="Hata" subtitle={loadError} onClose={() => setLoadError(null)} lowContrast />
      )}

      <DataList
        rows={issues}
        columns={columns}
        loading={loading}
        searchPlaceholder="Sayı ara"
        searchText={(r) => `${r.club_code} ${issueLabel(r)} ${r.issue_number}`}
        onRowClick={(row) => openForm(row)}
        emptyState={
          loadError ? null : (
            <EmptyState
              title="Henüz sayı yok"
              body="Derginin PDF'ini yükleyin; kapak ilk sayfadan otomatik oluşturulur."
              action={
                <Button kind="tertiary" renderIcon={Add} onClick={() => openForm()}>
                  Sayı ekle
                </Button>
              }
            />
          )
        }
        renderActions={(row) => (
          <OverflowMenu aria-label={`${issueLabel(row)} eylemleri`} flipped size="md">
            <OverflowMenuItem itemText="Düzenle" onClick={() => openForm(row)} />
            <OverflowMenuItem itemText="Sil" isDelete hasDivider onClick={() => setDeleting(row)} />
          </OverflowMenu>
        )}
      />

      <Modal
        open={form !== null}
        modalHeading={form?.id ? issueLabel({ issue_number: Number(form.issue_number) || 0, title: form.title }) : 'Yeni sayı'}
        primaryButtonText={busy ? 'Kaydediliyor…' : 'Kaydet'}
        secondaryButtonText="Vazgeç"
        primaryButtonDisabled={busy || preparing || (touched && formInvalid)}
        onRequestClose={() => !busy && setForm(null)}
        onRequestSubmit={() => void handleSave()}
        size="lg"
        hasScrollingContent
      >
        {form && (
          <Stack gap={7}>
            <FormGroup legendText="PDF ve kapak">
              <div className="magazine-file">
                {coverSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element -- yerel önizleme ya da Storage'daki kapak
                  <img src={coverSrc} alt="Kapak önizlemesi" className="magazine-file__cover" />
                ) : (
                  <div className="magazine-file__cover" aria-hidden />
                )}
                <div className="magazine-file__body">
                  <input ref={fileInput} type="file" accept="application/pdf" onChange={handlePdfChange} hidden />
                  {preparing ? (
                    <InlineLoading description="Kapak hazırlanıyor…" />
                  ) : (
                    <Button kind="tertiary" size="md" renderIcon={Upload} onClick={() => fileInput.current?.click()}>
                      {form.pdfFile || form.pdf_url ? 'PDF’i değiştir' : 'PDF yükle'}
                    </Button>
                  )}
                  <p className="helper">
                    {form.pdfFile
                      ? `${form.pdfFile.name} kaydedince yüklenecek.`
                      : form.pdf_url
                        ? (
                          <Link href={form.pdf_url} target="_blank" rel="noopener noreferrer" size="sm">
                            Mevcut PDF’i aç
                          </Link>
                        )
                        : 'Henüz PDF yok.'}
                  </p>
                  <p className="helper">
                    Kapak PDF’in ilk sayfasından otomatik oluşturulur · en fazla {MAX_MAGAZINE_LABEL}
                  </p>
                  {touched && errors.file && <p className="text-error">{errors.file}</p>}
                </div>
              </div>
            </FormGroup>

            <div className="magazine-grid">
              {isAdmin && MAGAZINE_CLUBS.length > 1 && !form.id ? (
                <Select
                  id="magazine-club"
                  labelText="Kulüp"
                  value={form.club_code}
                  onChange={(e) => update('club_code', e.target.value)}
                >
                  {MAGAZINE_CLUBS.map((code) => (
                    <SelectItem key={code} value={code} text={code} />
                  ))}
                </Select>
              ) : null}
              <NumberInput
                id="magazine-number"
                label="Sayı numarası"
                min={1}
                step={1}
                value={form.issue_number}
                onChange={(_e, { value }) => update('issue_number', value === '' ? '' : Number(value))}
                helperText={Number(form.issue_number) > 0 ? `Sitede: Sayı ${toRoman(Number(form.issue_number))}` : undefined}
                invalid={touched && Boolean(errors.issue)}
                invalidText={errors.issue ?? undefined}
                allowEmpty
              />
              <TextInput
                id="magazine-title"
                labelText="Sayı adı"
                placeholder="Işık Sayısı"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
              />
              <DateField
                id="magazine-date"
                labelText="Yayın tarihi"
                value={form.published_on}
                onChange={(v) => update('published_on', v)}
                helperText="Sitede ay ve yıl olarak gösterilir."
              />
            </div>

            <TextArea
              id="magazine-description"
              labelText="Açıklama"
              helperText="Dergi sayfasında kapağın yanında gösterilir."
              rows={4}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />

            <TextArea
              id="magazine-summary"
              labelText="Kısa tanıtım (isteğe bağlı)"
              helperText="Ana sayfadaki dergi bölümünde gösterilir; boşsa açıklama kullanılır."
              rows={2}
              value={form.summary}
              onChange={(e) => update('summary', e.target.value)}
            />

            <FormGroup legendText="Öne çıkan yazılar">
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {form.stories.map((story, index) => (
                  <div key={index} className="magazine-story">
                    <span className="magazine-story__numeral">{toRoman(index + 1)}</span>
                    <TextInput
                      id={`story-title-${index}`}
                      labelText={`Yazı ${index + 1} başlığı`}
                      hideLabel
                      placeholder="Başlık"
                      value={story.title}
                      onChange={(e) =>
                        update('stories', form.stories.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)))
                      }
                    />
                    <TextInput
                      id={`story-detail-${index}`}
                      labelText={`Yazı ${index + 1} konusu`}
                      hideLabel
                      placeholder="Konu · Alan"
                      value={story.detail}
                      onChange={(e) =>
                        update('stories', form.stories.map((s, i) => (i === index ? { ...s, detail: e.target.value } : s)))
                      }
                    />
                    <IconButton
                      kind="ghost"
                      label="Yazıyı kaldır"
                      align="left"
                      onClick={() => update('stories', form.stories.filter((_, i) => i !== index))}
                    >
                      <TrashCan />
                    </IconButton>
                  </div>
                ))}
              </div>
              <Button
                kind="ghost"
                size="sm"
                renderIcon={Add}
                onClick={() => update('stories', [...form.stories, { title: '', detail: '' }])}
                style={{ marginTop: '0.5rem' }}
              >
                Yazı ekle
              </Button>
            </FormGroup>

            <TextInput
              id="magazine-external"
              type="url"
              labelText="Dış bağlantı (isteğe bağlı)"
              placeholder="https://"
              helperText="PDF’i olmayan eski sayılar için; PDF varsa PDF kullanılır."
              value={form.external_url}
              onChange={(e) => update('external_url', e.target.value)}
              invalid={Boolean(errors.external)}
              invalidText={errors.external ?? undefined}
            />

            <Toggle
              id="magazine-published"
              labelText="Sitede yayımla"
              labelA="Taslak"
              labelB="Yayında"
              toggled={form.published}
              onToggle={(checked) => update('published', checked)}
            />
          </Stack>
        )}
      </Modal>

      {!editorClub && <MagazineEditors />}

      <ConfirmDeleteModal
        open={deleting !== null}
        heading="Sayıyı sil"
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      >
        {deleting && (
          <>
            <strong>{issueLabel(deleting)}</strong> ve yüklenen PDF ile kapağı silinecek.
          </>
        )}
      </ConfirmDeleteModal>
    </div>
  )
}
