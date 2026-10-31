'use client'

import NextLink from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  Select,
  SelectItem,
  SideNav,
  SideNavDivider,
  SideNavItems,
  SideNavLink,
  SkipToContent,
  Theme,
} from '@carbon/react'
import {
  Add,
  Book,
  Certificate,
  Dashboard,
  Document,
  Link as LinkIcon,
  LogoInstagram,
  Logout,
  Security,
  Send,
  UserAvatar,
  Edit,
  UserMultiple,
} from '@carbon/icons-react'
import { useAuth } from '@/contexts/auth-context'
import { hasMagazine } from '@/lib/roles'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Genel bakış', icon: Dashboard },
  { href: '/club-info', label: 'Kulüp bilgileri', icon: Edit },
  { href: '/applications', label: 'Başvurular', icon: UserMultiple },
  { href: '/magazine', label: 'Dergi', icon: Book },
  { href: '/certificates', label: 'Sertifikalar', icon: Certificate },
  { href: '/certificates/create', label: 'Yeni sertifika', icon: Add },
  { href: '/certificates/batch', label: 'Toplu sertifika', icon: Send },
  { href: '/urls/manage', label: 'Kısa linkler', icon: LinkIcon },
  { href: '/instagram', label: 'Instagram', icon: LogoInstagram },
] as const

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, clubCode, editorClub, memberships, activeClub, selectClub, signOut } = useAuth()
  const navItems = editorClub
    ? NAV_ITEMS.filter(({ href }) => href === '/magazine')
    : NAV_ITEMS.filter(({ href }) => href !== '/magazine' || isAdmin || hasMagazine(clubCode))
  const pathname = usePathname()
  const router = useRouter()
  const [sideNavOpen, setSideNavOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    router.replace('/login')
  }

  return (
    <>
      <Theme theme="g100">
        <Header aria-label="NAAL Yönetici Arayüzü">
          <SkipToContent href="#main-content">İçeriğe geç</SkipToContent>
          <HeaderMenuButton
            aria-label={sideNavOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            isActive={sideNavOpen}
            aria-expanded={sideNavOpen}
            onClick={() => setSideNavOpen((open) => !open)}
          />
          <HeaderName as={NextLink} href={editorClub ? '/magazine' : '/dashboard'} prefix="NAAL">
            {isAdmin ? 'Süper Yönetici' : editorClub ? 'Dergi Editörü' : 'Kulüp Yönetimi'}
          </HeaderName>
          <HeaderGlobalBar>
            {memberships.length > 1 && (
              <Select
                id="active-club"
                className="shell-club"
                labelText="Kulüp"
                hideLabel
                inline
                size="sm"
                value={activeClub ?? ''}
                onChange={(e) => selectClub(e.target.value)}
              >
                {memberships.map(({ code }) => (
                  <SelectItem key={code} value={code} text={code} />
                ))}
              </Select>
            )}
            <div className="shell-user" title={user?.email ?? undefined}>
              <UserAvatar size={20} aria-hidden />
              <span className="shell-user__email">{user?.email}</span>
            </div>
            <HeaderGlobalAction aria-label="Çıkış yap" tooltipAlignment="end" onClick={handleLogout}>
              <Logout size={20} />
            </HeaderGlobalAction>
          </HeaderGlobalBar>
          <SideNav
            aria-label="Ana menü"
            expanded={sideNavOpen}
            onOverlayClick={() => setSideNavOpen(false)}
            onSideNavBlur={() => setSideNavOpen(false)}
            href="#main-content"
          >
            <SideNavItems>
              {navItems.map(({ href, label, icon }) => (
                <SideNavLink
                  key={href}
                  as={NextLink}
                  href={href}
                  renderIcon={icon}
                  isActive={pathname === href}
                  onClick={() => setSideNavOpen(false)}
                >
                  {label}
                </SideNavLink>
              ))}
              <SideNavDivider />
              {!editorClub && (
                <SideNavLink href="/email-merge-guide.pdf" target="_blank" rel="noopener noreferrer" renderIcon={Document}>
                  E-posta birleştirme rehberi
                </SideNavLink>
              )}
              <SideNavLink href="/gizlilik" target="_blank" renderIcon={Security}>
                KVKK Aydınlatma Metni
              </SideNavLink>
            </SideNavItems>
          </SideNav>
        </Header>
      </Theme>
      <main id="main-content" className="app-content">
        {children}
      </main>
    </>
  )
}
