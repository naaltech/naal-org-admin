import NextLink from 'next/link'

interface LegalPageProps {
  title: string
  updated: string
  children: React.ReactNode
}

/** Giriş gerektirmeyen hukuki metin sayfalarının çerçevesi (KVKK, veri silme). */
export default function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <main className="legal">
      <p className="legal__brand">
        <NextLink href="/">NAAL Etkileşim Ağı</NextLink>
      </p>
      <h1 className="legal__title">{title}</h1>
      <p className="helper">Son güncelleme: {updated}</p>
      <div className="legal__body">{children}</div>
      <nav className="legal__nav" aria-label="Hukuki metinler">
        <NextLink href="/gizlilik">KVKK Aydınlatma Metni ve Gizlilik Politikası</NextLink>
        <NextLink href="/veri-silme">Veri silme</NextLink>
      </nav>
    </main>
  )
}
