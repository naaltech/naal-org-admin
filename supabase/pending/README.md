# Supabase geçişi: en sona bırakılan işler

Faz 2 ve Faz 3'ün kodu hazır, ama bu dosyadaki adımlar yapılana kadar devreye girmez. Hepsi canlı Supabase projesinde (`website`, `istmoscvorgtmbzfffbb`) yapılır. Adımları sırayla izleyin.

**Durum (31 Ekim 2026):** 2. adım canlıda uygulandı (`panel_roles_additive`, `fix_certificate_batches_undo`). Aynı gün `storage.sql` ve `instagram.sql` dosyalarının canlıda eksik kalan kısımları da eklendi (`live_schema_gaps`: `club-logos` bucket'ı ve politikaları, `posts_instagram.ig_user_id`). Ara geçiş de canlıda (`dual_access`, `01b-dual-access.sql`) ve `tally-applications` 8. sürümle `enroll` eylemini içeriyor. Canlıdaki bu sürüm e-postayı hâlâ Resend ile gönderir; depodaki SMTP sürümü "E-posta" bölümünde dağıtılır. `02-cutover.sql` henüz uygulanmadı. Canlıdaki 7 `drop policy` adı dosyayla karşılaştırıldı, hepsi mevcut.

**Ara geçiş:** Eski e-posta yetkisi ile `panel_roles` yetkisi şu an birlikte çalışır. Eski panel ve kulüp hesapları aynen kullanılır. Yeni panel Netlify önizlemesinde ya da yerelde canlı veriyle denenebilir; Google girişi (3. adım) ve dolu `panel_roles` (4. adım) gerekir. `02-cutover.sql` ara politikaları kaldırır ve eski yetkiyi kapatır.

**Dikkat:** `naal-org-admin` dalındaki yeni kod `main`'e 5. adımdan önce girmemeli. Netlify her `main` push'unu yayına aldığı için kod erken girerse şifreyle giren kulüp hesapları yeni panele giremez.

## 1. Hazırlık

- [ ] Supabase panelinden veritabanı yedeği alın ve geri yükleme yöntemini doğrulayın.
- [ ] Canlı şemayı temel migration olarak alın:

```bash
npx supabase link --project-ref <project id>
npx supabase db pull
```

- [ ] Oluşan dosyayı gözden geçirip commit edin. Bu dosya, `schema.sql` dosyasının eksik kaldığı canlı politika ve işlevleri de içerir.
- [x] Temel dosyayla `02-cutover.sql` içindeki politika adlarını karşılaştırın. `drop policy` satırları `if exists` kullanmaz: canlıda ad farklıysa dosya durur ve hiçbir şey uygulanmaz.
- [ ] `club_editors` listesine bakın. Canlıdaki iki editör de okul dışı adreste (gmail ve icloud), ikisi de kapanacak. Okul hesabı varsa 4. adımdan sonra yeniden ekleyin. Bilim kulübüne önceden haber verin.

## 2. Tabloları ekleyin

- [x] `01-panel-roles.sql` dosyasını çalıştırın. Mevcut panel bu adımdan etkilenmez.
- [x] `club_forms` listesinde `adds_members` değerlerini kontrol edin. `tech` ve `bilim` üyelik formları açık, iki Naal'Hack formu kapalı.
- [x] `01b-dual-access.sql` dosyasını çalıştırın. Eski politikalara dokunmaz, yanlarına `panel_roles` politikalarını ekler.
- [ ] Bu dosya `clubs.is_active` kolonunu ve toplu sertifika tablolarını da ekler. Tüm kulüpler başlangıçta açık sayılır; `naal-org` kolonun varlığına bağlı olmadığı için sırası önemli değildir.

## 3. Google girişini kurun

- [ ] Google Cloud projesini Workspace yönetici hesabıyla, kuruluşun altında açın; kişisel hesapla açılan projede **Internal** seçeneği çıkmaz.
- [ ] Google Cloud'da OAuth izin ekranını **Internal** yapın. Dışarıdan kimsenin girememesini bu ayar sağlar; Workspace dışı hesap giriş ekranını geçemez.
- [ ] Web uygulaması türünde OAuth istemcisi açın. Yetkili yönlendirme adresi: `https://<project id>.supabase.co/auth/v1/callback`.
- [ ] Supabase'de Authentication > Providers > Google'ı istemci kimliği ve gizli anahtarıyla açın.
- [ ] Authentication > URL Configuration'a `https://admin.naal.org.tr/**` ekleyin. Yeni paneli önceden denemek için Netlify önizleme adresini ve `http://localhost:3000/**` adresini de ekleyin. Site URL `https://admin.naal.org.tr` olmalı.
- [ ] "Allow new users to sign up" canlıda kapalı; yeni paneli denemeden hemen önce açın, Google ile ilk giriş kayıt sayılır. "Confirm email" açık kalmalı, yoksa biri `<kod>@naal.org.tr` adresiyle kayıt olup eski yetkiyi alabilir. E-postayla girişi 5. adımda kapatıyoruz.

## 4. Dizini bağlayın

- [ ] Dizinin yeni sürümünü kurun. `bash deploy/deploy.sh <commit>` yedek alır ve `008_panel_year_cycle` migration'ını uygular.
- [ ] Sunucudaki `naal-directory/.env` dosyasına `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` ve `CERT_EMAIL_FROM` yazıp `pm2 restart naal-worker` çalıştırın.
- [ ] Dizinde kapalı kulüplerin `clubs.is_active` değeri `false` olmalı; bu kulüpler `naal-org` sitesinden kaybolur. Görünmesi gereken bir kulüp varsa dizinde açın.
- [ ] Birkaç dakika sonra `panel_roles` tablosunu kontrol edin. Her açık kulübün başkanı, başkan yardımcısı ve danışmanı `club`, dizindeki aktif `SUPER_ADMIN` hesapları `super` olarak görünmeli.
- [ ] En az bir `super` satırı okul hesabı olmalı. `admin@naal.org.tr` artık özel bir hesap değil. Satır yoksa dizin yöneticisinin e-postası okul alan adlarından biri değildir; önce bunu düzeltin, yoksa panele kimse tam yetkiyle giremez.
- [ ] Görevlisi ve danışmanı olmayan kulüpler panelde "Sistem durumu" altında listelenir. Bu kulüplere 5. adımdan önce görevli atayın, yoksa kimse o kulübü yönetemez.

## E-posta: Resend'den SMTP'ye

Bu bölüm 5. adımı beklemez. Sırayı bozmayın: gizli değişkenler girilmeden fonksiyon dağıtılırsa eski panelin başvuru bildirimleri durur.

- [ ] Google Workspace'te gönderen hesap için uygulama şifresi alın. `SMTP_HOST=smtp.gmail.com` kullanın. `basvuru@`, `sertifika@` ve `panel@` o hesabın takma adı ve Gmail'de "Postayı şu adresten gönder" adresi olmalı, yoksa Gmail gönderen adresini değiştirir.
- [ ] SMTP relay hizmetini kapalı tutun. Kimlik doğrulamalı relay, uygulama şifresi alan her okul hesabının alan adındaki herhangi bir adres adına mail atmasına izin verir.
- [ ] Supabase Edge Function secrets'a `SMTP_HOST`, `SMTP_USER` ve `SMTP_PASSWORD` ekleyin. Port 465 sabittir; Edge Function'lar 25 ve 587'ye çıkamaz.
- [ ] Fonksiyonu dağıtın, panelden kendi adresinize bir başvuru sonucu gönderip deneyin:

```bash
npx supabase functions deploy tally-applications --project-ref <project id>
```

- [ ] Çalıştığını gördükten sonra Supabase'den `RESEND_API_KEY` secret'ını silin.
- [ ] Cloudflare'dan Resend'in DKIM, `send` ve `rsend` kayıtlarını, sonra Resend hesabındaki alan adını ve anahtarı kaldırın. `_dmarc` kaydı kalsın.

## 5. Geçiş

Bu adımlar arasında panel kısa süre kullanılamaz. Okul saatleri dışında yapın.

- [ ] `naal-files` servisini kurun (kurulum `naal-files/README.md` dosyasında) ve Netlify'a `FILES_URL` ile `FILES_TOKEN` yazın. Yeni PDF yükleme ve Instagram görselleri bu servise gider. Gecelik yedeği de kurun; sunucu tek kopyadır.
- [ ] `naal-org-admin` dalını `main`'e birleştirin ve yayınlanmasını bekleyin.
- [ ] `02-cutover.sql` dosyasını çalıştırın.
- [ ] Süper yönetici ve bir kulüp görevlisiyle Google'dan giriş yapıp deneyin: kulüp bilgisi kaydetme, kısa link ekleme, sertifika ekleme, başvuru okuma, logo yükleme.
- [ ] Editörü olan bir hesapla yalnızca Dergi sayfasına girebildiğini ve dergi PDF'i yükleyebildiğini deneyin.
- [ ] Toplu sertifika sayfasından kendi okul adresinize bir sertifika gönderin. Bir dakika içinde e-posta gelmeli, bağlantı `naal.org.tr` üzerinde açılmalı ve sertifika panelde görünmeli.
- [ ] Eski fonksiyonu kaldırın:

```bash
npx supabase functions delete editor-accounts --project-ref <project id>
```

- [x] Yeni `enroll` eylemini dağıtın. `tally-applications` 8. sürüm canlıda; eski panel bu eylemi çağırmadığı için etkilenmez.

- [ ] Authentication > Providers > Email'i kapatın. Şifreyle giriş böylece biter.
- [ ] Eski şifreli hesapları önce listeleyin, sonra silin. Silme geri alınamaz:

```sql
select u.email from auth.users u
where exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email')
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google');
```

```sql
delete from auth.users u
where exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email')
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google');
```

- [ ] Netlify'dan `NEXT_PUBLIC_TURNSTILE_SITE_KEY` ve `CATBOX_USERHASH` değişkenlerini silin.

## 6. Eski PDF'ler

- [x] Taşınacak dosya kalmadı. 31 Ekim 2026'da 87 PDF'in hepsi ölü bulundu (Glitch kapalı, Catbox 404). Kayıtlar aynı numarayla `cert` tablosuna geçti (`move_lost_pdf_certificates_to_digital`), özgün satırlar `cert_pdf_moved` arşivinde. Arşiv herkese kapalıdır. Yeni PDF sertifikalar `naal-files` servisine yüklenir.

## 7. Migration düzenine geçiş

- [ ] `01-panel-roles.sql`, `01b-dual-access.sql` ve `02-cutover.sql` içeriğini `supabase migration new` ile birer migration yapın. Canlıda zaten çalıştıkları için `npx supabase migration repair --status applied <sürüm>` ile uygulanmış işaretleyin. Canlı geçmişte `panel_roles_additive`, `live_schema_gaps`, `fix_certificate_batches_undo` ve `dual_access` kayıtları zaten var; önce `db pull` ile hizalayın.
- [ ] `supabase/*.sql` dosyalarını ve bu klasörü silin; README'deki dosya listesini `supabase db push` ile değiştirin.
- [ ] Bilim sitesinin dergi okumasını, `naal.org.tr` kulüp sayfalarını ve sertifika doğrulamayı son kez deneyin. Bu okumalar anonim olduğu için geçişten etkilenmemeli.

## Geçişte bilinmesi gerekenler

- Yeni kod `session_club_code()` kullanmaz; bu işlev 2. dosyada silinir. `naal-org` bu işlevi kullanmıyor.
- `cert` ve `cert_pdf` kayıtlarındaki `uploader_mail` değişmez. Eski kulüp kayıtları zaten `<kod>@naal.org.tr` biçiminde olduğu için kulüpte kalır. Editör ya da başka adresle yazılmış kayıtlar yalnızca süper yöneticiye görünür.
- Dizinde kapatılan kulübün yetkileri biter, sayfası ve alt alan adı sitede gizlenir. Kısa linkleri çalışmaz. Supabase `clubs` satırı, profili ve sertifikaları silinmez; kulüp yeniden açılınca her şey geri gelir ve sertifikalar kapalıyken de doğrulanır. Yeni açılan kulübün satırını dizin kendisi ekler; kulüp profilini ezmez.
- Toplu sertifika e-postasının gönderim sınırı Google hesabına bağlıdır. Sınıra takılan satırlar beklemede kalır ve sonraki dakikalarda kendiliğinden gönderilir.
