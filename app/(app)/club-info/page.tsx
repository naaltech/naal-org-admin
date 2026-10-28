'use client'

import { useRef, useState } from 'react'
import {
  Button,
  Form,
  FormGroup,
  InlineLoading,
  InlineNotification,
  Select,
  SelectItem,
  SkeletonText,
  Stack,
  TextArea,
  TextInput,
  Tile,
} from '@carbon/react'
import { Save, Upload } from '@carbon/icons-react'
import PageHeader from '@/components/page-header'
import ListInput from '@/components/list-input'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'
import { clubLabel, useClubs } from '@/hooks/use-clubs'
import { isHttpUrl, joinList, splitList } from '@/lib/format'
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
    <div className="page page--narrow">
      <PageHeader
        title="Kulüp bilgileri"
        description="Kulübün herkese açık profilinde görünen ad, açıklama, logo ve bağlantılar."
      />

      {error && !loading && (
        <InlineNotification kind="error" title="Hata" subtitle={error} hideCloseButton lowContrast />
      )}

      {isAdmin && clubs.length > 0 && (
        <div className="section">
          <Select
            id="club-select"
            labelText="Düzenlenecek kulüp"
            value={club?.id ?? ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            {clubs.map((c) => (
              <SelectItem key={c.id} value={c.id} text={`${clubLabel(c)} (${c.code})`} />
            ))}
          </Select>
        </div>
      )}

      {loading ? (
        <Tile className="form-tile">
          <SkeletonText paragraph lineCount={6} />
        </Tile>
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
    setSaving(false)

    if (updateError) {
      console.error('Error updating club:', updateError)
      notify('error', 'Kaydedilemedi', updateError.message)
      return
    }
    if (club.logo !== patch.logo) void removeClubLogo(club.logo)
    onSaved(patch)
    notify('success', 'Kulüp bilgileri güncellendi')
  }

  return (
    <Tile className="form-tile">
      <Form onSubmit={handleSave} aria-label="Kulüp bilgileri">
        <Stack gap={7}>
          <FormGroup legendText="Logo">
            <div className="logo-field">
              {form.logo && brokenLogo !== form.logo ? (
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
              <input
                ref={fileInput}
                type="file"
                accept={LOGO_ACCEPT}
                onChange={handleLogoChange}
                hidden
              />
              {uploadingLogo ? (
                <InlineLoading description="Yükleniyor…" />
              ) : (
                <Button kind="tertiary" size="md" renderIcon={Upload} onClick={() => fileInput.current?.click()}>
                  {form.logo ? 'Logoyu değiştir' : 'Logo yükle'}
                </Button>
              )}
            </div>
            {form.logo && brokenLogo === form.logo && (
              <InlineNotification
                kind="warning"
                title="Mevcut logo açılamıyor"
                subtitle="Eski görsel silinmiş olabilir. Lütfen logoyu yeniden yükleyin."
                hideCloseButton
                lowContrast
                style={{ marginTop: '0.75rem' }}
              />
            )}
            <p className="helper" style={{ marginTop: '0.5rem' }}>
              PNG, JPEG, WebP veya GIF · en fazla {MAX_LOGO_LABEL}
            </p>
          </FormGroup>

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
            rows={4}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Kulübün amacı ve etkinlikleri hakkında kısa bir açıklama"
          />

          <ListInput
            id="owners"
            legendText="Yöneticiler"
            values={form.owners}
            onChange={(v) => update('owners', v)}
            placeholder="Ad Soyad"
            addLabel="Yönetici ekle"
          />

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

          <div className="form-actions">
            {saving ? (
              <InlineLoading description="Kaydediliyor…" />
            ) : (
              <Button type="submit" renderIcon={Save} disabled={uploadingLogo}>
                Değişiklikleri kaydet
              </Button>
            )}
            <Button
              kind="ghost"
              onClick={() => {
                if (form.logo !== club.logo) void removeClubLogo(form.logo)
                setForm(toForm(club))
              }}
              disabled={saving || uploadingLogo}
            >
              Geri al
            </Button>
          </div>
        </Stack>
      </Form>
    </Tile>
  )
}
