'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Form,
  InlineLoading,
  InlineNotification,
  Select,
  SelectItem,
  SkeletonText,
  TextArea,
  TextInput,
} from '@carbon/react'
import { Save, Upload } from '@carbon/icons-react'
import PageHeader from '@/components/page-header'
import ListInput from '@/components/list-input'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'
import { clubLabel, useClubs } from '@/hooks/use-clubs'
import { isHttpUrl, isWhatsAppInvite, joinList, splitList } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { Club } from '@/lib/types'
import { LOGO_ACCEPT, MAX_LOGO_LABEL, removeClubLogo, uploadClubLogo } from '@/lib/logo-storage'

interface ClubForm {
  title: string
  description: string
  logo: string
  owners: string[]
  instagram: string[]
  urls: string[]
}

function toForm(club: Club): ClubForm {
  return {
    title: club.title ?? '',
    description: club.description ?? '',
    logo: club.logo ?? '',
    owners: splitList(club.owners),
    instagram: splitList(club.instagram),
    urls: splitList(club.urls),
  }
}

const normalizeInstagram = (value: string) => value.trim().replace(/^@/, '')

export default function ClubInfoPage() {
  const { isAdmin } = useAuth()
  const { clubs, setClubs, loading, error } = useClubs()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const club = clubs.find((c) => c.id === selectedId) ?? clubs[0] ?? null

  return (
    <div className="page">
      <PageHeader
        title="Kulüp bilgileri"
        description="Kulübün herkese açık profilinde görünen ad, açıklama, logo ve bağlantılar."
      />

      {error && !loading && (
        <InlineNotification kind="error" title="Hata" subtitle={error} hideCloseButton lowContrast />
      )}

      {isAdmin && clubs.length > 0 && (
        <div className="section club-picker">
          <Select
            id="club-select"
            labelText="Düzenlenecek kulüp"
            value={club?.id ?? ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            {clubs.map((c) => (
              <SelectItem key={c.id} value={c.id} text={c.is_active === false ? `${clubLabel(c)} (sitede gizli)` : clubLabel(c)} />
            ))}
          </Select>
        </div>
      )}

      {loading ? (
        <div className="editor-layout__main">
          <SkeletonText paragraph lineCount={6} />
        </div>
      ) : (
        club && (
          // key: kulüp değişince form state'i sıfırdan kurulur.
          <ClubEditor
            key={club.id}
            club={club}
            onSaved={(patch) => setClubs((prev) => prev.map((c) => (c.id === club.id ? { ...c, ...patch } : c)))}
          />
        )
      )}
    </div>
  )
}

interface FormSectionProps {
  title: string
  hint?: string
  children: React.ReactNode
}

function FormSection({ title, hint, children }: FormSectionProps) {
  return (
    <section className="form-section">
      <header className="form-section__header">
        <h2 className="form-section__title">{title}</h2>
        {hint && <p className="helper">{hint}</p>}
      </header>
      <div className="form-section__body">{children}</div>
    </section>
  )
}

/** Formdaki bilgilerin sitedeki kulüp sayfasına yakın özeti. */
function ProfilePreview({ code, form, logo }: { code: string; form: ClubForm; logo: string | null }) {
  const owners = form.owners.map((o) => o.trim()).filter(Boolean)
  const accounts = form.instagram.map(normalizeInstagram).filter(Boolean)
  const links = form.urls.map((u) => u.trim()).filter(Boolean)

  return (
    <aside className="cert-preview" aria-label="Profil önizlemesi">
      <p className="cert-preview__caption">Sitede görünümü</p>
      <div className="profile-preview">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage'daki herkese açık dosya
          <img src={logo} alt="" className="profile-preview__logo" />
        ) : (
          <div className="profile-preview__logo" aria-hidden />
        )}
        <h2 className={form.title.trim() ? 'profile-preview__title' : 'profile-preview__title cert-preview__empty'}>
          {form.title.trim() || 'Kulüp adı'}
        </h2>
        <p className="profile-preview__domain mono">{code}.naal.org.tr</p>
        <p className={form.description.trim() ? 'profile-preview__body' : 'profile-preview__body cert-preview__empty'}>
          {form.description.trim() || 'Kulübün açıklaması burada görünür.'}
        </p>
        {owners.length > 0 && (
          <dl className="cert-preview__meta">
            <div>
              <dt>Yöneticiler</dt>
              <dd>{owners.join(', ')}</dd>
            </div>
          </dl>
        )}
        {accounts.length > 0 && (
          <dl className="cert-preview__meta">
            <div>
              <dt>Instagram</dt>
              <dd>{accounts.map((a) => `@${a}`).join(', ')}</dd>
            </div>
          </dl>
        )}
        {links.length > 0 && (
          <dl className="cert-preview__meta">
            <div>
              <dt>Linkler</dt>
              <dd>{links.length} bağlantı</dd>
            </div>
          </dl>
        )}
      </div>
    </aside>
  )
}

interface ClubEditorProps {
  club: Club
  onSaved: (patch: Partial<Club>) => void
}

function ClubEditor({ club, onSaved }: ClubEditorProps) {
  const notify = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<ClubForm>(() => toForm(club))
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  // Açılamayan logo URL'i (ör. silinmiş eski ImgBB görselleri); önizleme yerine uyarı gösterilir.
  const [brokenLogo, setBrokenLogo] = useState<string | null>(null)
  // Herkese açık `clubs` yerine yalnızca kulübün okuyabildiği `club_settings` tablosunda durur.
  const [whatsapp, setWhatsapp] = useState('')
  const [savedWhatsapp, setSavedWhatsapp] = useState('')

  useEffect(() => {
    let cancelled = false
    void supabase
      .from('club_settings')
      .select('whatsapp_url')
      .eq('club_code', club.code)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Error fetching club settings:', error)
        if (cancelled || !data) return
        setWhatsapp(data.whatsapp_url)
        setSavedWhatsapp(data.whatsapp_url)
      })
    return () => {
      cancelled = true
    }
  }, [club.code])

  const whatsappValue = whatsapp.trim()
  const whatsappError = whatsappValue && !isWhatsAppInvite(whatsappValue) ? 'https://chat.whatsapp.com/… biçiminde bir davet linki girin.' : null
  const logoOk = form.logo && brokenLogo !== form.logo
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(club)) || whatsappValue !== savedWhatsapp

  const update = <K extends keyof ClubForm>(key: K, value: ClubForm[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // aynı dosya tekrar seçilebilsin
    if (!file) return

    setUploadingLogo(true)
    try {
      const url = await uploadClubLogo(club.code, file)
      // Kaydedilmemiş önceki yükleme artık kullanılmayacak.
      if (form.logo !== club.logo) void removeClubLogo(form.logo)
      update('logo', url)
      notify('success', 'Logo yüklendi', 'Kalıcı olması için değişiklikleri kaydedin.')
    } catch (err) {
      notify('error', 'Logo yüklenemedi', err instanceof Error ? err.message : undefined)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      notify('error', 'Kulüp adı boş olamaz')
      return
    }
    if (form.urls.some((u) => u.trim() && !isHttpUrl(u.trim()))) {
      notify('error', 'Geçersiz link', 'Linkler http:// veya https:// ile başlamalıdır.')
      return
    }
    if (whatsappError) {
      notify('error', 'Geçersiz WhatsApp linki', whatsappError)
      return
    }

    const patch = {
      title: form.title.trim(),
      description: form.description.trim(),
      logo: form.logo,
      owners: joinList(form.owners),
      instagram: joinList(form.instagram.map(normalizeInstagram)),
      urls: joinList(form.urls),
    }

    setSaving(true)
    const { error: updateError } = await supabase.from('clubs').update(patch).eq('id', club.id)
    if (updateError) {
      setSaving(false)
      console.error('Error updating club:', updateError)
      notify('error', 'Kaydedilemedi', updateError.message)
      return
    }
    if (whatsappValue !== savedWhatsapp) {
      const { error: settingsError } = await supabase
        .from('club_settings')
        .upsert({ club_code: club.code, whatsapp_url: whatsappValue, updated_at: new Date().toISOString() })
      if (settingsError) {
        setSaving(false)
        console.error('Error updating club settings:', settingsError)
        notify('error', 'WhatsApp linki kaydedilemedi', settingsError.message)
        return
      }
      setSavedWhatsapp(whatsappValue)
    }
    setSaving(false)

    if (club.logo !== patch.logo) void removeClubLogo(club.logo)
    onSaved(patch)
    notify('success', 'Kulüp bilgileri güncellendi')
  }

  return (
    <div className="editor-layout">
      <Form onSubmit={handleSave} aria-label="Kulüp bilgileri" className="editor-layout__main">
        <FormSection title="Kimlik" hint="Kulüp sayfasının üst bölümünde görünür.">
          <div className="logo-field">
            {logoOk ? (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage'daki herkese açık dosya
              <img
                src={form.logo}
                alt={`${clubLabel(club)} logosu`}
                className="logo-field__preview"
                onError={() => setBrokenLogo(form.logo)}
              />
            ) : (
              <div className="logo-field__preview" aria-hidden />
            )}
            <input ref={fileInput} type="file" accept={LOGO_ACCEPT} onChange={handleLogoChange} hidden />
            <div>
              {uploadingLogo ? (
                <InlineLoading description="Yükleniyor…" />
              ) : (
                <Button kind="tertiary" size="md" renderIcon={Upload} onClick={() => fileInput.current?.click()}>
                  {form.logo ? 'Logoyu değiştir' : 'Logo yükle'}
                </Button>
              )}
              <p className="helper" style={{ marginTop: '0.5rem' }}>
                PNG, JPEG, WebP veya GIF · en fazla {MAX_LOGO_LABEL}
              </p>
            </div>
          </div>
          {form.logo && brokenLogo === form.logo && (
            <InlineNotification
              kind="warning"
              title="Mevcut logo açılamıyor"
              subtitle="Eski görsel silinmiş olabilir. Lütfen logoyu yeniden yükleyin."
              hideCloseButton
              lowContrast
            />
          )}
          <TextInput
            id="title"
            labelText="Kulüp adı"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            invalid={!form.title.trim()}
            invalidText="Kulüp adı zorunludur."
            required
          />
          <TextArea
            id="description"
            labelText="Açıklama"
            rows={5}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Kulübün amacı ve etkinlikleri hakkında kısa bir açıklama"
          />
        </FormSection>

        <FormSection title="Ekip">
          <ListInput
            id="owners"
            legendText="Yöneticiler"
            values={form.owners}
            onChange={(v) => update('owners', v)}
            placeholder="Ad Soyad"
            addLabel="Yönetici ekle"
          />
        </FormSection>

        <FormSection title="Bağlantılar">
          <ListInput
            id="instagram"
            legendText="Instagram hesapları"
            values={form.instagram}
            onChange={(v) => update('instagram', v)}
            placeholder="kullanici_adi"
            addLabel="Hesap ekle"
            helperText="Başında @ olmadan kullanıcı adı, ör. naal_tech"
          />
          <ListInput
            id="urls"
            legendText="Linkler"
            type="url"
            values={form.urls}
            onChange={(v) => update('urls', v)}
            placeholder="https://"
            addLabel="Link ekle"
            validate={(v) => (isHttpUrl(v) ? null : 'http:// veya https:// ile başlamalı')}
          />
        </FormSection>

        <FormSection title="Üyelere özel" hint="Sitede gösterilmez.">
          <TextInput
            id="whatsapp"
            type="url"
            labelText="WhatsApp topluluk linki"
            placeholder="https://chat.whatsapp.com/…"
            helperText="Yalnızca başvurusu kabul edilen üyelere sonuç e-postasında gönderilir."
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            invalid={Boolean(whatsappError)}
            invalidText={whatsappError ?? undefined}
          />
        </FormSection>

        <div className="save-bar">
          <p className="helper">{dirty ? 'Kaydedilmemiş değişiklikler var.' : 'Tüm değişiklikler kaydedildi.'}</p>
          <div className="form-actions">
            <Button
              kind="ghost"
              onClick={() => {
                if (form.logo !== club.logo) void removeClubLogo(form.logo)
                setForm(toForm(club))
                setWhatsapp(savedWhatsapp)
              }}
              disabled={!dirty || saving || uploadingLogo}
            >
              Geri al
            </Button>
            {saving ? (
              <InlineLoading description="Kaydediliyor…" />
            ) : (
              <Button type="submit" renderIcon={Save} disabled={!dirty || uploadingLogo}>
                Değişiklikleri kaydet
              </Button>
            )}
          </div>
        </div>
      </Form>

      <ProfilePreview code={club.code} form={form} logo={logoOk ? form.logo : null} />
    </div>
  )
}
