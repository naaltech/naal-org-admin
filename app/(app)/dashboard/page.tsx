'use client'

import NextLink from 'next/link'
import { Tile } from '@carbon/react'
import {
  Add,
  ArrowRight,
  Book,
  Certificate,
  Document,
  Edit,
  Link as LinkIcon,
  LogoInstagram,
  UserMultiple,
} from '@carbon/icons-react'
import PageHeader from '@/components/page-header'
import { useAuth } from '@/contexts/auth-context'
import { hasMagazine } from '@/lib/roles'

const ACTIONS = [
  {
    href: '/club-info',
    icon: Edit,
    title: 'Kulüp bilgileri',
    body: 'Kulüp adını, açıklamasını, logosunu ve sosyal medya hesaplarını güncelleyin.',
  },
  {
    href: '/applications',
    icon: UserMultiple,
    title: 'Başvurular',
    body: 'Tally formunuza gelen başvuruları filtreleyin, değerlendirin; Excel ya da PDF olarak indirin.',
  },
  {
    href: '/magazine',
    icon: Book,
    title: 'Dergi',
    body: 'Derginin yeni sayısını PDF olarak yükleyin; kapak, açıklama ve önceki sayılar sitede güncellensin.',
  },
  {
    href: '/certificates/create',
    icon: Add,
    title: 'Yeni sertifika',
    body: 'Üyeleriniz için dijital sertifika oluşturun ya da hazır bir PDF yükleyin.',
  },
  {
    href: '/certificates',
    icon: Certificate,
    title: 'Sertifikalar',
    body: 'Oluşturulan sertifikaları arayın, düzenleyin, linklerini paylaşın.',
  },
  {
    href: '/urls/manage',
    icon: LinkIcon,
    title: 'Kısa linkler',
    body: 'kulup.naal.org.tr/… biçiminde kısa yönlendirme linkleri oluşturun.',
  },
  {
    href: '/instagram',
    icon: LogoInstagram,
    title: 'Instagram',
    body: 'Kulübün Instagram hesabını bağlayın; yeni postlar siteye otomatik aktarılsın.',
  },
] as const

// ClickableTile `as` desteklemediği için Next Link'e Carbon'un tıklanabilir kutu sınıfları verilir.
const TILE_CLASS = 'cds--tile cds--tile--clickable action-tile'

const ADMIN_SCOPE = [
  ['Kısa link yönetimi', 'Tüm kulüplerin kısa linklerini yönetebilirsiniz.'],
  ['Kulüp bilgileri', 'Tüm kulüplerin bilgilerini düzenleyebilirsiniz.'],
  ['Başvurular', 'Tüm kulüplerin başvuru formlarını görüp değerlendirebilirsiniz.'],
  ['Dergi', 'Dergi yayımlayan kulüplerin sayılarını ekleyip düzenleyebilirsiniz.'],
  ['Sertifika yönetimi', 'Tüm sertifikaları görüntüleyip düzenleyebilirsiniz.'],
  ['Sistem yöneticisi', 'Sistem genelinde tam yetkiye sahipsiniz.'],
] as const

export default function DashboardPage() {
  const { isAdmin, clubCode } = useAuth()
  const actions = ACTIONS.filter(({ href }) => href !== '/magazine' || isAdmin || hasMagazine(clubCode))

  return (
    <div className="page">
      <PageHeader
        title="Hoş geldiniz"
        description="Kulüp bilgilerinizi güncelleyin, sertifikalarınızı oluşturun ve kısa linklerinizi yönetin."
      />

      {isAdmin && (
        <Tile className="section">
          <h2 className="section__title">Süper yönetici yetkileri</h2>
          <ul className="admin-scope">
            {ADMIN_SCOPE.map(([title, body]) => (
              <li key={title}>
                <strong>{title}</strong>
                <span>{body}</span>
              </li>
            ))}
          </ul>
        </Tile>
      )}

      <section className="section" aria-labelledby="actions-title">
        <h2 id="actions-title" className="section__title">
          Hızlı erişim
        </h2>
        <div className="dashboard-grid">
          {actions.map(({ href, icon: Icon, title, body }) => (
            <NextLink key={href} href={href} className={TILE_CLASS}>
              <Icon size={24} className="action-tile__icon" aria-hidden />
              <h3 className="action-tile__title">{title}</h3>
              <p className="action-tile__body">{body}</p>
              <ArrowRight size={20} className="action-tile__arrow" aria-hidden />
            </NextLink>
          ))}
          <a href="/email-merge-guide.pdf" target="_blank" rel="noopener noreferrer" className={TILE_CLASS}>
            <Document size={24} className="action-tile__icon" aria-hidden />
            <h3 className="action-tile__title">E-posta birleştirme rehberi</h3>
            <p className="action-tile__body">E-posta birleştirme kılavuzunu yeni sekmede açın (PDF).</p>
            <ArrowRight size={20} className="action-tile__arrow" aria-hidden />
          </a>
        </div>
      </section>
    </div>
  )
}
