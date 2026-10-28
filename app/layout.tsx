import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import '@/styles/globals.scss'
import { AuthProvider } from '@/contexts/auth-context'
import { ToastProvider } from '@/contexts/toast-context'

// latin-ext: ç, ğ, ı, İ, ş gibi Türkçe karakterler için gerekli.
const plexSans = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400'],
  variable: '--font-plex-mono',
  display: 'swap',
})

const title = 'Nevzat Ayaz Etkileşim Ağı | Yönetici Arayüzü'
const description = 'Nevzat Ayaz Etkileşim Ağı yönetici arayüzü; kulüp bilgileri, sertifikalar ve URL yönetimi'

export const metadata: Metadata = {
  metadataBase: new URL('https://admin.naal.org.tr'),
  title,
  description,
  authors: [{ name: 'Nevzat Ayaz Anadolu Lisesi' }],
  creator: 'Nevzat Ayaz Anadolu Lisesi',
  publisher: 'Nevzat Ayaz Anadolu Lisesi',
  icons: { icon: '/favicon.ico' },
  robots: { index: false, follow: false },
  openGraph: { type: 'website', locale: 'tr_TR', title, description, siteName: title },
  twitter: { card: 'summary', title, description },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f4f4' },
    { media: '(prefers-color-scheme: dark)', color: '#161616' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
