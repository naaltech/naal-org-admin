'use client'

import { useEffect, useState } from 'react'
import {
  Button,
  InlineNotification,
  Link,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  Select,
  SelectItem,
  Stack,
  TextInput,
} from '@carbon/react'
import { Add } from '@carbon/icons-react'
import PageHeader from '@/components/page-header'
import DataList, { EmptyState, type Column } from '@/components/data-list'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'
import { clubLabel, useClubs } from '@/hooks/use-clubs'
import { isHttpUrl, shortUrl } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { ShortUrl } from '@/lib/types'

interface UrlForm {
  id?: number
  club_code: string
  path: string
  redirect: string
}

// URL yolunda güvenli karakterler; `/` ile alt yollar desteklenir.
const PATH_PATTERN = /^[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*$/

function pathError(path: string): string | null {
  if (!path) return 'Kısa yol zorunludur.'
  if (!PATH_PATTERN.test(path)) return 'Yalnızca harf, rakam, - _ . ~ ve / kullanılabilir; boşluk olamaz.'
  return null
}

export default function ManageUrlsPage() {
  const { isAdmin, clubCode } = useAuth()
  const notify = useToast()
  const { clubs } = useClubs()

  const [urls, setUrls] = useState<ShortUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState<UrlForm | null>(null)
  const [touched, setTouched] = useState(false)
  const [deleting, setDeleting] = useState<ShortUrl | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    let query = supabase.from('url').select('*').order('created_at', { ascending: false })
    if (!isAdmin) query = query.eq('club_code', clubCode)

    void query.then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        console.error('Error fetching urls:', error)
        setLoadError('Kısa linkler yüklenemedi. Sayfayı yenileyip tekrar deneyin.')
      } else {
        setUrls((data ?? []) as ShortUrl[])
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [isAdmin, clubCode])

  const openForm = (row?: ShortUrl) => {
    setTouched(false)
    setForm(
      row
        ? { id: row.id, club_code: row.club_code, path: row.path, redirect: row.redirect }
        : { club_code: isAdmin ? (clubs[0]?.code ?? '') : clubCode, path: '', redirect: '' },
    )
  }

  const copy = async (row: ShortUrl) => {
    const link = shortUrl(row.club_code, row.path)
    try {
      await navigator.clipboard.writeText(link)
      notify('success', 'Kısa link kopyalandı', link)
    } catch {
      notify('error', 'Link kopyalanamadı')
    }
  }

  const formPath = form?.path.trim() ?? ''
  const formRedirect = form?.redirect.trim() ?? ''
  const errors = {
    club: form && !form.club_code ? 'Kulüp seçin.' : null,
    path: form ? pathError(formPath) : null,
    redirect: form && !isHttpUrl(formRedirect) ? 'http:// veya https:// ile başlayan geçerli bir adres girin.' : null,
  }
  const formInvalid = Boolean(errors.club || errors.path || errors.redirect)

  const handleSave = async () => {
    setTouched(true)
    if (!form || formInvalid) return
    // Kulüp hesapları yalnızca kendi kodlarıyla kayıt açabilir.
    const club_code = isAdmin ? form.club_code : clubCode

    setBusy(true)
    // Aynı kulüpte aynı yol iki kez tanımlanırsa yönlendirme belirsiz olur.
    let duplicateQuery = supabase.from('url').select('id').eq('club_code', club_code).eq('path', formPath).limit(1)
    if (form.id) duplicateQuery = duplicateQuery.neq('id', form.id)
    const { data: duplicate } = await duplicateQuery
    if (duplicate && duplicate.length > 0) {
      setBusy(false)
      notify('error', 'Bu kısa link zaten var', shortUrl(club_code, formPath))
      return
    }

    const row = { club_code, path: formPath, redirect: formRedirect }
    let request = form.id ? supabase.from('url').update(row).eq('id', form.id) : supabase.from('url').insert(row)
    if (form.id && !isAdmin) request = request.eq('club_code', clubCode)
    const { data, error } = await request.select().single()
    setBusy(false)

    if (error || !data) {
      console.error('Error saving url:', error)
      notify('error', 'Kaydedilemedi', error?.message)
      return
    }
    const saved = data as ShortUrl
    setUrls((prev) => (form.id ? prev.map((u) => (u.id === saved.id ? saved : u)) : [saved, ...prev]))
    setForm(null)
    notify('success', form.id ? 'Kısa link güncellendi' : 'Kısa link oluşturuldu', shortUrl(saved.club_code, saved.path))
  }

  const handleDelete = async () => {
    if (!deleting) return
    setBusy(true)
    let request = supabase.from('url').delete().eq('id', deleting.id)
    if (!isAdmin) request = request.eq('club_code', clubCode)
    const { error } = await request
    setBusy(false)

    if (error) {
      console.error('Error deleting url:', error)
      notify('error', 'Silinemedi', error.message)
      return
    }
    setUrls((prev) => prev.filter((u) => u.id !== deleting.id))
    setDeleting(null)
    notify('success', 'Kısa link silindi')
  }

  const columns: Column<ShortUrl>[] = [
    ...(isAdmin ? [{ key: 'club', header: 'Kulüp', render: (r: ShortUrl) => r.club_code }] : []),
    {
      key: 'short',
      header: 'Kısa link',
      render: (r) => <span className="mono">{shortUrl(r.club_code, r.path).replace('https://', '')}</span>,
    },
    {
      key: 'redirect',
      header: 'Hedef',
      render: (r) => (
        <Link href={r.redirect} target="_blank" rel="noopener noreferrer" className="cell-truncate" title={r.redirect}>
          {r.redirect}
        </Link>
      ),
    },
  ]

  const createButton = (
    <Button renderIcon={Add} size="lg" onClick={() => openForm()}>
      Yeni kısa link
    </Button>
  )

  return (
    <div className="page">
      <PageHeader
        title="Kısa linkler"
        description={
          isAdmin
            ? 'Tüm kulüplerin kulüp.naal.org.tr/… yönlendirmeleri.'
            : `${clubCode}.naal.org.tr/… adresinden uzun linklere yönlendirme oluşturun.`
        }
        actions={createButton}
      />

      {loadError && (
        <InlineNotification kind="error" title="Hata" subtitle={loadError} onClose={() => setLoadError(null)} lowContrast />
      )}

      <DataList
        rows={urls}
        columns={columns}
        loading={loading}
        searchPlaceholder="Kulüp, yol veya hedef ara"
        searchText={(r) => `${r.club_code} ${r.path} ${r.redirect}`}
        emptyState={
          loadError ? null : (
          <EmptyState
            title="Henüz kısa link yok"
            body="Etkinlik formları, başvuru sayfaları gibi uzun adresler için kolay hatırlanır linkler oluşturun."
            action={
              <Button kind="tertiary" renderIcon={Add} onClick={() => openForm()}>
                Kısa link oluştur
              </Button>
            }
          />
          )
        }
        renderActions={(row) => (
          <OverflowMenu aria-label={`${row.path} eylemleri`} flipped size="md">
            <OverflowMenuItem itemText="Kısa linki kopyala" onClick={() => void copy(row)} />
            <OverflowMenuItem itemText="Düzenle" onClick={() => openForm(row)} />
            <OverflowMenuItem itemText="Sil" isDelete hasDivider onClick={() => setDeleting(row)} />
          </OverflowMenu>
        )}
      />

      <Modal
        open={form !== null}
        modalHeading={form?.id ? 'Kısa linki düzenle' : 'Yeni kısa link'}
        primaryButtonText={busy ? 'Kaydediliyor…' : 'Kaydet'}
        secondaryButtonText="Vazgeç"
        primaryButtonDisabled={busy || (touched && formInvalid)}
        onRequestClose={() => setForm(null)}
        onRequestSubmit={() => void handleSave()}
        size="sm"
      >
        {form && (
          <Stack gap={6}>
            {isAdmin ? (
              <Select
                id="url-club"
                labelText="Kulüp"
                value={form.club_code}
                onChange={(e) => setForm({ ...form, club_code: e.target.value })}
                invalid={touched && Boolean(errors.club)}
                invalidText={errors.club ?? undefined}
              >
                {clubs.map((c) => (
                  <SelectItem key={c.id} value={c.code} text={`${c.code} — ${clubLabel(c)}`} />
                ))}
              </Select>
            ) : (
              <TextInput id="url-club" labelText="Kulüp" value={form.club_code} readOnly />
            )}
            <TextInput
              id="url-path"
              labelText="Kısa yol"
              placeholder="basvuru"
              helperText={formPath && !errors.path ? shortUrl(form.club_code || '…', formPath) : 'Ör. basvuru, etkinlik/2026'}
              value={form.path}
              onChange={(e) => setForm({ ...form, path: e.target.value })}
              onBlur={() => setTouched(true)}
              invalid={touched && Boolean(errors.path)}
              invalidText={errors.path ?? undefined}
              className="mono-input"
            />
            <TextInput
              id="url-redirect"
              type="url"
              labelText="Hedef adres"
              placeholder="https://"
              value={form.redirect}
              onChange={(e) => setForm({ ...form, redirect: e.target.value })}
              onBlur={() => setTouched(true)}
              invalid={touched && Boolean(errors.redirect)}
              invalidText={errors.redirect ?? undefined}
            />
          </Stack>
        )}
      </Modal>

      <ConfirmDeleteModal
        open={deleting !== null}
        heading="Kısa linki sil"
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      >
        {deleting && (
          <>
            <strong className="mono">{shortUrl(deleting.club_code, deleting.path)}</strong> artık yönlendirme yapmayacak.
          </>
        )}
      </ConfirmDeleteModal>
    </div>
  )
}
