import type { Metadata, Viewport } from 'next'
// next/font/google Netlify derlemesinde sunucu ve istemci için farklı sınıf adları üretebiliyor; o zaman
// sayfa sistem fontuna düşer. Paketteki her ağırlık dosyası alt kümeleri unicode-range ile tanımlar.
import '@fontsource/ibm-plex-sans/300.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@/styles/globals.scss'
import { AuthProvider } from '@/contexts/auth-context'
import { ToastProvider } from '@/contexts/toast-context'

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
    <html lang="tr">
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
