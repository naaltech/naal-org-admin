'use client'

import { useEffect, useState } from 'react'
import {
  Button,
  CodeSnippet,
  InlineNotification,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  Select,
  SelectItem,
  Stack,
  TextInput,
} from '@carbon/react'
import { UserFollow } from '@carbon/icons-react'
import DataList, { EmptyState, type Column } from '@/components/data-list'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'
import { createEditor, deleteEditor, resetEditorPassword } from '@/lib/editors'
import { formatDate } from '@/lib/format'
import { isClubEmail, MAGAZINE_CLUBS } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import type { ClubEditor } from '@/lib/types'

const LOGIN_URL = 'https://admin.naal.org.tr'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface EditorForm {
  club_code: string
  name: string
  email: string
}

interface Credentials {
  name: string
  email: string
  password: string
  emailed: boolean
  clubCode: string
}

function emailError(email: string): string | null {
  if (!EMAIL_PATTERN.test(email)) return 'Geçerli bir e-posta adresi girin.'
  if (isClubEmail(email)) return '@naal.org.tr adresleri kulüp hesaplarına ayrılmıştır.'
  return null
}

/** Kulübün dergisini yönetebilen kişisel hesaplar; yalnızca kulüp hesabı ve süper yönetici görür. */
export default function MagazineEditors() {
  const { isAdmin, clubCode } = useAuth()
  const notify = useToast()

  const [editors, setEditors] = useState<ClubEditor[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState<EditorForm | null>(null)
  const [touched, setTouched] = useState(false)
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [resetting, setResetting] = useState<ClubEditor | null>(null)
  const [deleting, setDeleting] = useState<ClubEditor | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    let query = supabase.from('club_editors').select('*').order('created_at', { ascending: true })
    if (!isAdmin) query = query.eq('club_code', clubCode)

    void query.then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        console.error('Error fetching editors:', error)
        setLoadError('Editörler yüklenemedi. Sayfayı yenileyip tekrar deneyin.')
      } else {
        setEditors((data ?? []) as ClubEditor[])
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [isAdmin, clubCode])

  const openForm = () => {
    setTouched(false)
    setForm({ club_code: isAdmin ? MAGAZINE_CLUBS[0] : clubCode, name: '', email: '' })
  }

  const formEmail = form?.email.trim().toLowerCase() ?? ''
  const errors = {
    name: form && !form.name.trim() ? 'Ad soyad zorunludur.' : null,
    email: form ? emailError(formEmail) : null,
  }
  const formInvalid = Boolean(errors.name || errors.email)

  const handleCreate = async () => {
    setTouched(true)
    if (!form || formInvalid) return
    setBusy(true)
    try {
      const { editor, password, emailed } = await createEditor({
        club_code: form.club_code,
        name: form.name.trim(),
        email: formEmail,
      })
      setEditors((prev) => [...prev, editor])
      setForm(null)
      setCredentials({ name: editor.name, email: editor.email, password, emailed, clubCode: editor.club_code })
    } catch (err) {
      notify('error', 'Editör eklenemedi', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const handleReset = async () => {
    if (!resetting) return
    setBusy(true)
    try {
      const { password, emailed } = await resetEditorPassword(resetting.id)
      setCredentials({ name: resetting.name, email: resetting.email, password, emailed, clubCode: resetting.club_code })
      setResetting(null)
    } catch (err) {
      notify('error', 'Şifre sıfırlanamadı', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteEditor(deleting.id)
      setEditors((prev) => prev.filter((e) => e.id !== deleting.id))
      setDeleting(null)
      notify('success', 'Editör kaldırıldı', 'Hesap silindi; artık giriş yapamaz.')
    } catch (err) {
      notify('error', 'Editör kaldırılamadı', err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const copyAll = async () => {
    if (!credentials) return
    const text = `Giriş adresi: ${LOGIN_URL}\nE-posta: ${credentials.email}\nŞifre: ${credentials.password}`
    try {
      await navigator.clipboard.writeText(text)
      notify('success', 'Giriş bilgileri kopyalandı')
    } catch {
      notify('error', 'Kopyalanamadı')
    }
  }

  const columns: Column<ClubEditor>[] = [
    { key: 'name', header: 'Ad soyad', render: (r) => r.name },
    { key: 'email', header: 'E-posta', render: (r) => <span className="mono">{r.email}</span> },
    ...(isAdmin ? [{ key: 'club', header: 'Kulüp', render: (r: ClubEditor) => r.club_code }] : []),
    { key: 'created', header: 'Eklenme', render: (r) => formatDate(r.created_at) },
  ]

  return (
    <section className="section editors-section" aria-labelledby="editors-title">
      <div className="editors-section__header">
        <div>
          <h2 id="editors-title" className="section__title">
            Dergi editörleri
          </h2>
          <p className="helper">
            Editörler kendi e-posta adresleri ve üretilen şifreyle {LOGIN_URL.replace('https://', '')} adresinden
            giriş yapar; yalnızca bu sayfayı görür, sayı ekleyip düzenleyebilir ve yayımlayabilir. Giriş bilgileri
            editöre kulübün e-posta adresinden gönderilir.
          </p>
        </div>
        <Button kind="tertiary" renderIcon={UserFollow} onClick={openForm}>
          Editör ekle
        </Button>
      </div>

      {loadError && (
        <InlineNotification kind="error" title="Hata" subtitle={loadError} onClose={() => setLoadError(null)} lowContrast />
      )}

      <DataList
        rows={editors}
        columns={columns}
        loading={loading}
        searchPlaceholder="Editör ara"
        searchText={(r) => `${r.name} ${r.email} ${r.club_code}`}
        emptyState={
          loadError ? null : (
            <EmptyState
              title="Henüz editör yok"
              body="Dergiyi hazırlayan öğrencilere kulüp hesabının şifresini vermeden yayımlama yetkisi verin."
            />
          )
        }
        renderActions={(row) => (
          <OverflowMenu aria-label={`${row.name} eylemleri`} flipped size="md">
            <OverflowMenuItem itemText="Yeni şifre üret" onClick={() => setResetting(row)} />
            <OverflowMenuItem itemText="Kaldır" isDelete hasDivider onClick={() => setDeleting(row)} />
          </OverflowMenu>
        )}
      />

      <Modal
        open={form !== null}
        modalHeading="Dergi editörü ekle"
        primaryButtonText={busy ? 'Hesap açılıyor…' : 'Hesap aç'}
        secondaryButtonText="Vazgeç"
        primaryButtonDisabled={busy || (touched && formInvalid)}
        onRequestClose={() => !busy && setForm(null)}
        onRequestSubmit={() => void handleCreate()}
        size="sm"
      >
        {form && (
          <Stack gap={6}>
            {isAdmin && MAGAZINE_CLUBS.length > 1 && (
              <Select
                id="editor-club"
                labelText="Kulüp"
                value={form.club_code}
                onChange={(e) => setForm({ ...form, club_code: e.target.value })}
              >
                {MAGAZINE_CLUBS.map((code) => (
                  <SelectItem key={code} value={code} text={code} />
                ))}
              </Select>
            )}
            <TextInput
              id="editor-name"
              labelText="Ad soyad"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onBlur={() => setTouched(true)}
              invalid={touched && Boolean(errors.name)}
              invalidText={errors.name ?? undefined}
            />
            <TextInput
              id="editor-email"
              type="email"
              labelText="E-posta"
              placeholder="ad.soyad@ogr.nevzatayazal.k12.tr"
              helperText="Herhangi bir e-posta adresi olabilir (@naal.org.tr hariç). Editör bu adresle giriş yapar; üretilen şifre bu adrese gönderilir."
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onBlur={() => setTouched(true)}
              invalid={touched && Boolean(errors.email)}
              invalidText={errors.email ?? undefined}
            />
          </Stack>
        )}
      </Modal>

      <Modal
        open={credentials !== null}
        modalHeading="Giriş bilgileri"
        primaryButtonText="Tamam"
        secondaryButtonText="Hepsini kopyala"
        onRequestClose={() => setCredentials(null)}
        onSecondarySubmit={() => void copyAll()}
        onRequestSubmit={() => setCredentials(null)}
        preventCloseOnClickOutside
        size="sm"
      >
        {credentials && (
          <Stack gap={5}>
            {credentials.emailed ? (
              <InlineNotification
                kind="success"
                title="Giriş bilgileri e-postayla gönderildi"
                subtitle={`${credentials.clubCode}@naal.org.tr adresinden ${credentials.email} adresine. Şifre burada bir daha gösterilmeyecek.`}
                hideCloseButton
                lowContrast
              />
            ) : (
              <InlineNotification
                kind="warning"
                title="E-posta gönderilemedi"
                subtitle={`Bilgileri ${credentials.name} ile elle paylaşmadan pencereyi kapatmayın; şifre bir daha gösterilmeyecek.`}
                hideCloseButton
                lowContrast
              />
            )}
            <div>
              <p className="helper">Giriş adresi</p>
              <CodeSnippet type="single" feedback="Kopyalandı">{LOGIN_URL}</CodeSnippet>
            </div>
            <div>
              <p className="helper">E-posta</p>
              <CodeSnippet type="single" feedback="Kopyalandı">{credentials.email}</CodeSnippet>
            </div>
            <div>
              <p className="helper">Şifre</p>
              <CodeSnippet type="single" feedback="Kopyalandı">{credentials.password}</CodeSnippet>
            </div>
          </Stack>
        )}
      </Modal>

      <Modal
        open={resetting !== null}
        modalHeading="Yeni şifre üret"
        primaryButtonText={busy ? 'Üretiliyor…' : 'Yeni şifre üret'}
        secondaryButtonText="Vazgeç"
        primaryButtonDisabled={busy}
        onRequestClose={() => !busy && setResetting(null)}
        onRequestSubmit={() => void handleReset()}
        size="xs"
      >
        {resetting && (
          <p>
            <strong>{resetting.name}</strong> için yeni şifre üretilecek; eski şifre hemen geçersiz olur.
          </p>
        )}
      </Modal>

      <ConfirmDeleteModal
        open={deleting !== null}
        heading="Editörü kaldır"
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      >
        {deleting && (
          <>
            <strong>{deleting.name}</strong> ({deleting.email}) hesabı silinecek ve artık giriş yapamayacak. Eklediği
            sayılar sitede kalır.
          </>
        )}
      </ConfirmDeleteModal>
    </section>
  )
}
