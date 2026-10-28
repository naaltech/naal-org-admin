import type { Metadata } from 'next'
import NextLink from 'next/link'
import LegalPage from '@/components/legal-page'
import { ADMIN_EMAIL } from '@/lib/roles'

export const metadata: Metadata = {
  title: 'Veri silme | NAAL Etkileşim Ağı',
  robots: { index: true, follow: true },
}

const mail = <a href={`mailto:${ADMIN_EMAIL}`}>{ADMIN_EMAIL}</a>

/** Meta'nın veri silme callback'i kullanıcıyı `?kod=<onay kodu>` ile buraya yönlendirir. */
export default async function DataDeletionPage({ searchParams }: { searchParams: Promise<{ kod?: string }> }) {
  const { kod } = await searchParams

  return (
    <LegalPage title="Veri silme" updated="28 Ekim 2026">
      {kod && (
        <div className="legal__notice" role="status">
          <strong>Silme talebiniz işlendi.</strong> Instagram hesabınıza ait erişim anahtarı, aktarılan gönderiler ve
          görselleri silindi. Onay kodu: <span className="mono">{kod}</span>
        </div>
      )}

      <p>
        Instagram hesabınızı NAAL Etkileşim Ağı&apos;na bağladıysanız, bizde tutulan verilerin tamamını aşağıdaki
        yollardan biriyle sildirebilirsiniz. Hangi verilerin tutulduğu{' '}
        <NextLink href="/gizlilik">KVKK Aydınlatma Metni</NextLink>&apos;nde açıklanmıştır.
      </p>

      <h2>1. Instagram üzerinden (otomatik)</h2>
      <ol>
        <li>Instagram&apos;da Ayarlar › Uygulamalar ve web siteleri bölümünü açın.</li>
        <li>Etkin uygulamalar listesinde NAAL uygulamasını seçip kaldırın.</li>
        <li>
          Kaldırma işlemiyle birlikte veri silme talebi gönderin. Erişim anahtarınız, aktarılan gönderileriniz ve
          görselleri otomatik olarak silinir.
        </li>
      </ol>

      <h2>2. Panel üzerinden</h2>
      <p>
        Kulüp yöneticileri panelde Instagram sayfasından hesabın bağlantısını kaldırabilir. Bu işlem erişim anahtarını
        siler; daha önce aktarılan gönderilerin de silinmesini istiyorsanız aşağıdaki adrese yazın.
      </p>

      <h2>3. E-posta ile</h2>
      <p>
        {mail} adresine Instagram kullanıcı adınızla birlikte yazın. Talebiniz en geç 30 gün içinde sonuçlandırılır.
      </p>

      <h2 lang="en">Data deletion (English)</h2>
      <p lang="en">
        To delete all data we hold about your Instagram account, remove the app in Instagram (Settings › Apps and
        websites) and request data deletion, or email {mail} with your Instagram username. Access tokens, imported posts
        and their images are deleted.
      </p>
    </LegalPage>
  )
}
