import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL('https://admin.naal.org.tr'),
  title: "Nevzat Ayaz Etkileşim Ağı | Yönetici Arayüzü",
  description: "Nevzat Ayaz Etkileşim Ağı yönetici arayüzü - Kulüp bilgileri, sertifikalar ve URL yönetimi",
  keywords: ["NAAL", "Nevzat Ayaz", "etkileşim ağı", "yönetici", "kulüp", "sertifika", "yönetim"],
  authors: [{ name: "Nevzat Ayaz Anadolu Lisesi" }],
  creator: "Nevzat Ayaz Anadolu Lisesi",
  publisher: "Nevzat Ayaz Anadolu Lisesi",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    title: "Nevzat Ayaz Etkileşim Ağı | Yönetici Arayüzü",
    description: "Nevzat Ayaz Etkileşim Ağı yönetici arayüzü; kulüp bilgileri, sertifikalar ve URL yönetimi",
    siteName: "Nevzat Ayaz Etkileşim Ağı | Yönetici Arayüzü",
  },
  twitter: {
    card: "summary",
    title: "Nevzat Ayaz Etkileşim Ağı | Yönetici Arayüzü",
    description: "Nevzat Ayaz Etkileşim Ağı yönetici arayüzü; kulüp bilgileri, sertifikalar ve URL yönetimi",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
