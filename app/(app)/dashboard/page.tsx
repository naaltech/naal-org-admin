'use client'

import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { Button } from '@carbon/react'
import {
  Add,
  ArrowRight,
  Book,
  Certificate,
  Document,
  Edit,
  Link as LinkIcon,
  LogoInstagram,
  Send,
  UserMultiple,
} from '@carbon/icons-react'
import PageHeader from '@/components/page-header'
import StatStrip from '@/components/stat-strip'
import { useAuth } from '@/contexts/auth-context'
import { clubLabel, useClubs } from '@/hooks/use-clubs'
import { escapeLike } from '@/lib/format'
import { clubAddress, hasMagazine } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

const ACTIONS = [
  {
    href: '/club-info',
    icon: Edit,
    title: 'Kulüp bilgileri',
    body: 'Ad, açıklama, logo ve sosyal medya hesapları.',
  },
  {
    href: '/applications',
    icon: UserMultiple,
    title: 'Başvurular',
    body: 'Tally başvurularını değerlendirin ve dışa aktarın.',
  },
  {
    href: '/magazine',
    icon: Book,
    title: 'Dergi',
    body: 'Yeni sayıyı yükleyin, önceki sayıları düzenleyin.',
  },
  {
    href: '/certificates',
    icon: Certificate,
    title: 'Sertifikalar',
    body: 'Arayın, düzenleyin, linklerini paylaşın.',
  },
  {
    href: '/urls/manage',
    icon: LinkIcon,
    title: 'Kısa linkler',
    body: 'kulup.naal.org.tr/… yönlendirmeleri.',
  },
  {
    href: '/instagram',
    icon: LogoInstagram,
    title: 'Instagram',
    body: 'Hesabı bağlayın, postlar siteye aktarılsın.',
  },
] as const

function ActionRow({ icon: Icon, title, body }: { icon: React.ComponentType<{ size?: number }>; title: string; body: string }) {
  return (
    <>
      <span className="action-row__icon" aria-hidden>
        <Icon size={20} />
      </span>
      <span className="action-row__text">
        <strong className="action-row__title">{title}</strong>
        <span className="action-row__body">{body}</span>
      </span>
      <ArrowRight size={16} className="action-row__arrow" aria-hidden />
    </>
  )
}

export default function DashboardPage() {
  const { isAdmin, clubCode } = useAuth()
  const { clubs } = useClubs()
  const [counts, setCounts] = useState<{ cert: number; url: number } | null>(null)
  const actions = ACTIONS.filter(({ href }) => href !== '/magazine' || isAdmin || hasMagazine(clubCode))
  const club = clubs.find((c) => c.code === clubCode)

  useEffect(() => {
    let cancelled = false
    const count = { count: 'exact', head: true } as const
    const mail = escapeLike(clubAddress(clubCode))
    const certs = supabase.from('cert').select('id', count)
    const pdfs = supabase.from('cert_pdf').select('id', count)
    const urls = supabase.from('url').select('id', count)
    void Promise.all([
      isAdmin ? certs : certs.ilike('uploader_mail', mail),
      isAdmin ? pdfs : pdfs.ilike('uploader_mail', mail),
      isAdmin ? urls : urls.eq('club_code', clubCode),
    ]).then(([cert, pdf, url]) => {
      if (!cancelled) setCounts({ cert: (cert.count ?? 0) + (pdf.count ?? 0), url: url.count ?? 0 })
    })
    return () => {
      cancelled = true
    }
  }, [isAdmin, clubCode])

  const stats = [
    ...(isAdmin ? [{ label: 'Açık kulüp', value: clubs.filter((c) => c.is_active !== false).length }] : []),
    { label: 'Sertifika', value: counts?.cert ?? 0 },
    { label: 'Kısa link', value: counts?.url ?? 0 },
  ]

  return (
    <div className="page">
      <PageHeader
        title={isAdmin ? 'Genel bakış' : club ? clubLabel(club) : 'Kulüp yönetimi'}
        description={isAdmin ? 'Tüm kulüplerin bilgileri, sertifikaları ve kısa linkleri.' : 'Kulübünüzün bilgilerini ve içeriklerini buradan yönetin.'}
        actions={
          <>
            <Button as={NextLink} href="/certificates/batch" kind="tertiary" renderIcon={Send} size="lg">
              Toplu gönder
            </Button>
            <Button as={NextLink} href="/certificates/create" renderIcon={Add} size="lg">
              Yeni sertifika
            </Button>
          </>
        }
      />

      <StatStrip stats={stats} loading={counts === null} />

      <section aria-labelledby="actions-title">
        <h2 id="actions-title" className="section__title">
          Yönetim
        </h2>
        <div className="action-list">
          {actions.map(({ href, icon, title, body }) => (
            <NextLink key={href} href={href} className="action-row">
              <ActionRow icon={icon} title={title} body={body} />
            </NextLink>
          ))}
          <a href="/email-merge-guide.pdf" target="_blank" rel="noopener noreferrer" className="action-row">
            <ActionRow icon={Document} title="E-posta birleştirme rehberi" body="Kılavuzu yeni sekmede açın (PDF)." />
          </a>
        </div>
      </section>
    </div>
  )
}
