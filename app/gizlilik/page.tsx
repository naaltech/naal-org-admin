import type { Metadata } from 'next'
import NextLink from 'next/link'
import LegalPage from '@/components/legal-page'
import { CONTACT_EMAIL } from '@/lib/roles'

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni ve Gizlilik Politikası | NAAL Etkileşim Ağı',
  robots: { index: true, follow: true },
}

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>

export default function PrivacyPage() {
  return (
    <LegalPage title="KVKK Aydınlatma Metni ve Gizlilik Politikası" updated="28 Ekim 2026">
      <p>
        Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) 10. maddesi uyarınca, NAAL Etkileşim Ağı yönetici
        arayüzünde (admin.naal.org.tr) ve bu arayüze bağlanan Instagram hesaplarına ilişkin olarak işlenen kişisel veriler
        hakkında sizi bilgilendirmek için hazırlanmıştır.
      </p>

      <h2>1. Veri sorumlusu</h2>
      <p>
        Nevzat Ayaz Anadolu Lisesi Etkileşim Ağı (naal.org.tr). İletişim: {mail}
      </p>

      <h2>2. İşlenen kişisel veriler</h2>
      <ul>
        <li>
          <strong>Panel kullanıcıları:</strong> kulüp hesabının e-posta adresi, oturum bilgileri.
        </li>
        <li>
          <strong>Sertifikalar:</strong> sertifika verilen kişinin adı soyadı, sertifika adı, tarihi ve düzenleyen kulüp. Toplu
          sertifikada kişinin okul e-posta adresi yalnızca sertifika bağlantısını göndermek için kullanılır ve gönderimden
          sonra silinir.
        </li>
        <li>
          <strong>Bağlanan Instagram hesapları:</strong> Instagram kullanıcı kimliği, kullanıcı adı, profil adı ve
          Instagram&apos;ın verdiği erişim anahtarı (token).
        </li>
        <li>
          <strong>Instagram paylaşımları:</strong> bağlanan hesabın herkese açık gönderilerinin açıklaması, görselleri,
          videoların kapak görseli, paylaşım tarihi ve gönderi bağlantısı. Video dosyaları, yorumlar, beğeniler, takipçi
          bilgileri ve doğrudan mesajlar <strong>alınmaz</strong>.
        </li>
      </ul>

      <h2>3. İşleme amaçları</h2>
      <ul>
        <li>Kulüp ve okul etkinliklerinin naal.org.tr ve kulüp sayfalarında yayımlanması,</li>
        <li>kulüp bilgilerinin, kısa bağlantıların ve sertifikaların yönetilmesi ve doğrulanabilmesi,</li>
        <li>panelin güvenliğinin sağlanması ve kötüye kullanımın önlenmesi.</li>
      </ul>

      <h2>4. Toplama yöntemi ve hukuki sebepler</h2>
      <p>
        Veriler panele girilen bilgilerden ve hesap sahibinin Instagram ile giriş yaparak açıkça izin verdiği Instagram API
        aracılığıyla otomatik olarak toplanır. Hukuki sebepler: Instagram gönderileri bakımından ilgili kişi tarafından
        alenileştirilmiş olması (KVKK m.5/2-d), panelin işletilmesi bakımından veri sorumlusunun meşru menfaati (m.5/2-f) ve
        hesabın bağlanması sırasında verilen onay.
      </p>

      <h2>5. Aktarım ve yurt dışına aktarım</h2>
      <p>
        Veriler yalnızca hizmetin sunulması için gereken altyapı sağlayıcılarıyla paylaşılır: Supabase (veritabanı ve
        oturum yönetimi), Google (okul hesabıyla giriş ve e-posta), Netlify (barındırma) ve
        Meta Platforms (Instagram API). Bu sağlayıcıların sunucuları yurt dışında bulunabilir; aktarım KVKK m.9 kapsamında yapılır.
        Görseller ve sertifika dosyaları kendi sunucumuzda saklanır. Veriler satılmaz, reklam veya profilleme amacıyla kullanılmaz.
      </p>

      <h2>6. Saklama süresi</h2>
      <ul>
        <li>Instagram erişim anahtarı, hesap bağlantısı panelden veya Instagram&apos;dan kaldırıldığında silinir.</li>
        <li>
          Aktarılan gönderiler sitede yayımda kaldıkları sürece saklanır; silme talebi üzerine görselleriyle birlikte
          silinir.
        </li>
        <li>Panel ve sertifika kayıtları, kulüp faaliyetleri sürdükçe ve doğrulama amacıyla gerektiği sürece saklanır.</li>
      </ul>

      <h2>7. Haklarınız (KVKK m.11)</h2>
      <p>
        Kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, işleme amacını öğrenme, aktarıldığı
        üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini, silinmesini veya yok edilmesini isteme, bu
        işlemlerin aktarıldığı kişilere bildirilmesini isteme, otomatik sistemlerle analiz sonucu aleyhinize bir sonuç
        çıkmasına itiraz etme ve kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme haklarına sahipsiniz.
      </p>
      <p>
        Başvurularınızı {mail} adresine iletebilirsiniz; en geç 30 gün içinde yanıtlanır. Instagram verilerinin silinmesi
        için <NextLink href="/veri-silme">veri silme</NextLink> sayfasına bakın.
      </p>

      <h2 lang="en">Privacy Policy (English summary)</h2>
      <div lang="en">
        <p>
          NAAL Etkileşim Ağı, the club management panel of Nevzat Ayaz Anatolian High School, uses the Instagram API with
          Instagram Login only to display the public posts of the school&apos;s and its clubs&apos; own Instagram accounts
          on naal.org.tr. With the account owner&apos;s permission we store the Instagram user ID, username, profile name,
          access token, and each post&apos;s caption, images (video cover images only), timestamp and permalink. We do not
          collect comments, likes, followers or messages, and we never sell data or use it for advertising.
        </p>
        <p>
          Data is stored with Supabase, Cloudflare and Netlify. Access tokens are deleted when an account is
          disconnected or the app is removed from Instagram. To delete all imported data, remove the app in Instagram
          (Settings › Apps and websites) or email {mail}; see the <NextLink href="/veri-silme">data deletion</NextLink>{' '}
          page.
        </p>
      </div>
    </LegalPage>
  )
}
