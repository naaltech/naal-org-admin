'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, InlineNotification, Modal, Stack, Tag, TextInput } from '@carbon/react'
import { Renew, UserFollow } from '@carbon/icons-react'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import DataList, { EmptyState, type Column } from '@/components/data-list'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'
import { fetchEditorRequests, fetchEditors, requestCommand } from '@/lib/editors'
import { MAGAZINE_CLUBS } from '@/lib/roles'
import type { DirectoryCommand, PanelEditor } from '@/lib/types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface EditorRow extends PanelEditor {
  id: number
}

const toRows = (list: PanelEditor[]): EditorRow[] => list.map((e, id) => ({ ...e, id }))

/** Dergi editörleri okul hesabıyla giriş yapar; istekler dizinde bir dakika içinde işlenir. */
export default function MagazineEditors() {
  const { isAdmin, clubCode } = useAuth()
  const notify = useToast()
  const club = isAdmin ? MAGAZINE_CLUBS[0] : clubCode

  const [editors, setEditors] = useState<EditorRow[]>([])
  const [requests, setRequests] = useState<DirectoryCommand[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [removing, setRemoving] = useState<EditorRow | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [list, pending] = await Promise.all([fetchEditors(club), fetchEditorRequests(club)])
    setEditors(toRows(list))
    setRequests(pending)
  }, [club])

  useEffect(() => {
    let cancelled = false
    void Promise.all([fetchEditors(club), fetchEditorRequests(club)])
      .then(([list, pending]) => {
        if (cancelled) return
        setEditors(toRows(list))
        setRequests(pending)
      })
      .catch((error: unknown) => {
        console.error('Error fetching editors:', error)
        if (!cancelled) setLoadError('Editörler yüklenemedi. Sayfayı yenileyip tekrar deneyin.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [club])

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

  const invalid = !EMAIL_PATTERN.test(email.trim())

  const handleAdd = async () => {
    setTouched(true)
    if (invalid) return
    setBusy(true)
    try {
      await requestCommand('grant_editor', club, email)
      await load()
      setAdding(false)
      notify('success', 'İstek iletildi', 'Dizin bir dakika içinde işler; kişi okul hesabıyla giriş yapabilir.')
    } catch (error) {
      notify('error', 'Editör eklenemedi', error instanceof Error ? error.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    if (!removing) return
    setBusy(true)
    try {
      await requestCommand('revoke_editor', removing.club_code, removing.email)
      await load()
      setRemoving(null)
      notify('success', 'İstek iletildi', 'Yetki bir dakika içinde kalkar.')
    } catch (error) {
      notify('error', 'Editör kaldırılamadı', error instanceof Error ? error.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const columns: Column<EditorRow>[] = [
    { key: 'name', header: 'Ad soyad', render: (r) => r.name },
    { key: 'email', header: 'E-posta', render: (r) => <span className="mono">{r.email}</span> },
  ]

  return (
    <section className="section editors-section" aria-labelledby="editors-title">
      <div className="editors-section__header">
        <div>
          <h2 id="editors-title" className="section__title">
            Dergi editörleri
          </h2>
          <p className="helper">
            Editörler okul Google hesabıyla giriş yapar; yalnızca bu sayfayı görür, sayı ekleyip düzenleyebilir ve
            yayımlayabilir. Okuldan ayrılan editörün yetkisi kendiliğinden biter.
          </p>
        </div>
        <Button kind="ghost" renderIcon={Renew} disabled={busy} onClick={() => void refresh()}>
          Yenile
        </Button>
        <Button
          kind="tertiary"
          renderIcon={UserFollow}
          onClick={() => {
            setEmail('')
            setTouched(false)
            setAdding(true)
          }}
        >
          Editör ekle
        </Button>
      </div>

      {loadError && (
        <InlineNotification kind="error" title="Hata" subtitle={loadError} onClose={() => setLoadError(null)} lowContrast />
      )}

      {requests.map((r) =>
        r.status === 'failed' ? (
          <InlineNotification
            key={r.id}
            kind="warning"
            title={`${r.email} için istek işlenemedi`}
            subtitle={r.error ?? undefined}
            hideCloseButton
            lowContrast
          />
        ) : (
          <p key={r.id} className="helper">
            <Tag type="gray" size="sm">
              Bekliyor
            </Tag>{' '}
            {r.email}
          </p>
        ),
      )}

      <DataList
        rows={editors}
        columns={columns}
        loading={loading}
        searchPlaceholder="Editör ara"
        searchText={(r) => `${r.name} ${r.email}`}
        emptyState={
          loadError ? null : (
            <EmptyState title="Henüz editör yok" body="Dergiyi hazırlayan öğrencileri okul e-posta adresleriyle ekleyin." />
          )
        }
        renderActions={(row) => (
          <Button kind="ghost" size="sm" onClick={() => setRemoving(row)}>
            Kaldır
          </Button>
        )}
      />

      <Modal
        open={adding}
        modalHeading="Dergi editörü ekle"
        primaryButtonText={busy ? 'İletiliyor…' : 'Ekle'}
        secondaryButtonText="Vazgeç"
        primaryButtonDisabled={busy || (touched && invalid)}
        onRequestClose={() => !busy && setAdding(false)}
        onRequestSubmit={() => void handleAdd()}
        size="sm"
      >
        <Stack gap={6}>
          <TextInput
            id="editor-email"
            type="email"
            labelText="Okul e-postası"
            placeholder="ad.soyad@ogr.nevzatayazal.k12.tr"
            helperText="Yalnızca okulda kayıtlı hesaplar eklenebilir."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            invalid={touched && invalid}
            invalidText="Geçerli bir e-posta adresi girin."
          />
        </Stack>
      </Modal>

      <ConfirmDeleteModal
        open={removing !== null}
        heading="Editörü kaldır"
        busy={busy}
        onClose={() => setRemoving(null)}
        onConfirm={() => void handleRemove()}
      >
        {removing && (
          <>
            <strong>{removing.name}</strong> ({removing.email}) dergi yetkisini kaybedecek. Eklediği sayılar sitede kalır.
          </>
        )}
      </ConfirmDeleteModal>
    </section>
  )
}
