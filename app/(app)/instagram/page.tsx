'use client'

import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Button,
  Checkbox,
  InlineNotification,
  Link,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  Select,
  SelectItem,
  Stack,
  Tag,
} from '@carbon/react'
import { LogoInstagram } from '@carbon/icons-react'
import PageHeader from '@/components/page-header'
import DataList, { EmptyState, type Column } from '@/components/data-list'
import ConfirmDeleteModal from '@/components/confirm-delete-modal'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/contexts/toast-context'
import { clubLabel, useClubs } from '@/hooks/use-clubs'
import { formatDate } from '@/lib/format'
import { nextTokenRefresh } from '@/lib/instagram-token'
import {
  disconnectInstagramAccount,
  listInstagramAccounts,
  startInstagramConnect,
  syncInstagramAccount,
} from '@/lib/instagram-client'
import type { InstagramAccount } from '@/lib/types'

const DAY_MS = 24 * 60 * 60 * 1000
/** Seçim kutusunda kulüpten bağımsız okul hesabını temsil eder; API'ye `null` olarak gider. */
const SCHOOL = '__okul__'
const SCHOOL_LABEL = 'Okul hesabı'

/** Token durumu yükleme anında hesaplanır; render sırasında saat okunmaz. */
interface AccountRow extends InstagramAccount {
  expired: boolean
  expiresSoon: boolean
  nextRefresh: Date
}

async function loadAccounts(): Promise<AccountRow[] | null> {
  const now = Date.now()
  const { available, accounts } = await listInstagramAccounts()
  if (!available) return null
  return accounts.map((account) => {
    const left = new Date(account.token_expires_at).getTime() - now
    return {
      ...account,
      expired: left < 0,
      expiresSoon: left < 7 * DAY_MS,
      nextRefresh: nextTokenRefresh(account.token_expires_at, account.token_refreshed_at),
    }
  })
}

/**
 * Token'lar senkronizasyon sırasında kendiliğinden yenilendiği için elle yeniden bağlama normalde gerekmez.
 * Yenileme başarısız olursa (şifre değişti, izin kaldırıldı, senkronizasyon durdu) son tarih token bitişidir.
 */
function ReconnectCell({ account }: { account: AccountRow }) {
  if (account.expired) return <span className="text-error">Şimdi gerekli</span>
  return (
    <>
      <div>Gerekmiyor</div>
      <div className="helper">Otomatik yenileme: {formatDate(account.nextRefresh.toISOString())}</div>
      <div className={account.expiresSoon ? 'helper text-error' : 'helper'}>
        Yenilenmezse en geç: {formatDate(account.token_expires_at)}
      </div>
    </>
  )
}

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

function StatusTag({ account }: { account: AccountRow }) {
  if (account.expired) {
    return <Tag type="red" size="sm">Yeniden bağlanmalı</Tag>
  }
  if (account.last_error) {
    return (
      <Tag type="red" size="sm" title={account.last_error}>
        Hata
      </Tag>
    )
  }
  if (!account.last_synced_at) return <Tag type="gray" size="sm">Bekliyor</Tag>
  return <Tag type="green" size="sm">Çalışıyor</Tag>
}

export default function InstagramPage() {
  const { isAdmin, clubCode } = useAuth()
  const notify = useToast()
  const router = useRouter()
  const { clubs } = useClubs()

  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [maintenance, setMaintenance] = useState(false)
  const [connectClub, setConnectClub] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [removing, setRemoving] = useState<AccountRow | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadAccounts().then(
      (rows) => {
        if (cancelled) return
        if (rows) setAccounts(rows)
        else setMaintenance(true)
        setLoading(false)
      },
      (error: unknown) => {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : 'Hesaplar yüklenemedi.')
        setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  // Instagram'dan dönüşte callback sonucu sorgu parametresiyle gelir.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const error = params.get('error')
    if (!connected && !error) return
    if (connected) notify('success', 'Instagram hesabı bağlandı', `@${connected} postları kısa süre içinde aktarılacak.`)
    if (error) notify('error', 'Instagram bağlanamadı', error)
    router.replace('/instagram')
  }, [notify, router])

  const connect = async (club: string | null) => {
    setBusy(true)
    try {
      await startInstagramConnect(club)
    } catch (error) {
      setBusy(false)
      notify('error', 'Bağlantı başlatılamadı', error instanceof Error ? error.message : undefined)
    }
  }

  // Bağlamadan önce her seferinde KVKK onayı alınır; yeniden bağlamada kulüp seçili gelir.
  const openConnect = (club?: string | null) => {
    setConsent(false)
    if (club !== undefined) setConnectClub(club ?? SCHOOL)
    else setConnectClub(isAdmin ? (clubs[0]?.code ?? SCHOOL) : clubCode)
  }

  const sync = async (account: AccountRow) => {
    notify('info', `@${account.username} senkronize ediliyor…`)
    try {
      const result = await syncInstagramAccount(account.id)
      if (result.error) {
        notify('error', 'Senkronizasyon başarısız', result.error)
      } else {
        const rest = result.complete ? '' : ' Kalan postlar otomatik senkronizasyonda aktarılacak.'
        notify('success', `${result.added} yeni post aktarıldı`, `${result.failed ? `${result.failed} post aktarılamadı: ${result.failure}.` : ''}${rest}`)
      }
    } catch (error) {
      notify('error', 'Senkronizasyon başarısız', error instanceof Error ? error.message : undefined)
    }
    // Son senkronizasyon zamanı ve hata durumu tabloda güncellensin.
    loadAccounts().then((rows) => rows && setAccounts(rows), () => {})
  }

  const handleRemove = async () => {
    if (!removing) return
    setBusy(true)
    try {
      await disconnectInstagramAccount(removing.id)
      setAccounts((prev) => prev.filter((a) => a.id !== removing.id))
      notify('success', 'Bağlantı kaldırıldı', `@${removing.username}`)
      setRemoving(null)
    } catch (error) {
      notify('error', 'Bağlantı kaldırılamadı', error instanceof Error ? error.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  const columns: Column<AccountRow>[] = [
    ...(isAdmin
      ? [
          {
            key: 'club',
            header: 'Kulüp',
            render: (r: AccountRow) => r.club_code ?? <Tag type="purple" size="sm">{SCHOOL_LABEL}</Tag>,
          },
        ]
      : []),
    {
      key: 'account',
      header: 'Hesap',
      render: (r) => (
        <Link href={`https://www.instagram.com/${r.username}/`} target="_blank" rel="noopener noreferrer">
          @{r.username}
        </Link>
      ),
    },
    { key: 'synced', header: 'Son senkronizasyon', render: (r) => formatDateTime(r.last_synced_at) },
    { key: 'reconnect', header: 'Yeniden bağlama', render: (r) => <ReconnectCell account={r} /> },
    { key: 'status', header: 'Durum', render: (r) => <StatusTag account={r} /> },
  ]

  const connectButton = (
    <Button renderIcon={LogoInstagram} size="lg" onClick={() => openConnect()} disabled={busy}>
      Instagram hesabı bağla
    </Button>
  )

  return (
    <div className="page">
      <PageHeader
        title="Instagram"
        description={
          isAdmin
            ? 'Kulüplerin ve okulun Instagram hesaplarını bağlayın. Bir kulübe birden fazla hesap bağlanabilir; yeni postlar her 20 dakikada bir siteye aktarılır.'
            : 'Kulübünüzün Instagram hesaplarını bağlayın (birden fazla olabilir). Yeni postlar her 20 dakikada bir siteye aktarılır.'
        }
        actions={maintenance ? undefined : connectButton}
      />

      {maintenance && (
        <InlineNotification
          kind="info"
          title="Bu özellik şu an bakımdadır"
          subtitle="Instagram entegrasyonu hazırlanıyor. Hazır olduğunda kulübünüzün hesabını buradan bağlayabileceksiniz."
          hideCloseButton
          lowContrast
        />
      )}

      {loadError && (
        <InlineNotification kind="error" title="Hata" subtitle={loadError} onClose={() => setLoadError(null)} lowContrast />
      )}

      <DataList
        rows={accounts}
        columns={columns}
        loading={loading}
        searchPlaceholder="Kulüp veya hesap ara"
        searchText={(r) => `${r.club_code ?? SCHOOL_LABEL} ${r.username}`}
        emptyState={
          loadError || maintenance ? null : (
            <EmptyState
              title="Henüz bağlı Instagram hesabı yok"
              body="Hesabın Business veya Creator hesap olması gerekir (Instagram › Ayarlar › Hesap türü). Bağladıktan sonra son postlar otomatik aktarılır."
              action={
                <Button kind="tertiary" renderIcon={LogoInstagram} onClick={() => openConnect()} disabled={busy}>
                  Hesap bağla
                </Button>
              }
            />
          )
        }
        renderActions={(row) => (
          <OverflowMenu aria-label={`@${row.username} eylemleri`} flipped size="md">
            <OverflowMenuItem itemText="Şimdi senkronize et" onClick={() => void sync(row)} />
            <OverflowMenuItem itemText="Yeniden bağla" onClick={() => openConnect(row.club_code)} />
            <OverflowMenuItem itemText="Bağlantıyı kaldır" isDelete hasDivider onClick={() => setRemoving(row)} />
          </OverflowMenu>
        )}
      />

      <Modal
        open={connectClub !== null}
        modalHeading="Instagram hesabı bağla"
        primaryButtonText={busy ? 'Yönlendiriliyor…' : 'Instagram ile devam et'}
        secondaryButtonText="Vazgeç"
        primaryButtonDisabled={busy || !connectClub || !consent}
        onRequestClose={() => setConnectClub(null)}
        onRequestSubmit={() => connectClub && consent && void connect(connectClub === SCHOOL ? null : connectClub)}
        size="sm"
      >
        <Stack gap={6}>
          {isAdmin ? (
            <Select
              id="instagram-club"
              labelText="Hesabın sahibi"
              helperText="Açılan Instagram girişinde bağlanacak hesapla oturum açın. Aynı kulübe birden fazla hesap bağlanabilir."
              value={connectClub ?? ''}
              onChange={(e) => setConnectClub(e.target.value)}
            >
              <SelectItem value={SCHOOL} text={`${SCHOOL_LABEL} (kulüplerden bağımsız)`} />
              {clubs.map((c) => (
                <SelectItem key={c.id} value={c.code} text={`${c.code} — ${clubLabel(c)}`} />
              ))}
            </Select>
          ) : (
            <p>Açılan Instagram girişinde kulübünüzün hesabıyla oturum açın. Birden fazla hesap bağlayabilirsiniz.</p>
          )}
          <p className="helper">
            Bağlanan hesabın kullanıcı adı, profil adı ve herkese açık gönderileri (açıklama, görseller, tarih, bağlantı)
            naal.org.tr&apos;de yayımlanmak üzere aktarılır. Yorumlar, mesajlar ve takipçi bilgileri alınmaz.
          </p>
          <Checkbox
            id="instagram-consent"
            checked={consent}
            onChange={(_event, { checked }) => setConsent(checked)}
            labelText={
              <>
                <NextLink href="/gizlilik" target="_blank">
                  KVKK Aydınlatma Metni
                </NextLink>
                &apos;ni okudum; bu hesabı yönetme yetkim var ve gönderilerin sitede yayımlanmasını onaylıyorum.
              </>
            }
          />
        </Stack>
      </Modal>

      <ConfirmDeleteModal
        open={removing !== null}
        heading="Instagram bağlantısını kaldır"
        busy={busy}
        onClose={() => setRemoving(null)}
        onConfirm={() => void handleRemove()}
      >
        {removing && (
          <>
            <strong>@{removing.username}</strong> hesabından yeni postlar aktarılmayacak. Daha önce aktarılan postlar sitede
            kalır.
          </>
        )}
      </ConfirmDeleteModal>
    </div>
  )
}
