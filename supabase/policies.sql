-- Kulüp tabloları (clubs, url, cert, cert_pdf) için yazma politikaları.
-- Supabase panelinde SQL Editor'da bir kez çalıştırın; tekrar çalıştırmak güvenlidir.
--
-- Herkes okuyabilir. Süper yönetici (`admin@naal.org.tr`) her satırı, kulüp hesabı (`<kod>@naal.org.tr`)
-- yalnızca kendi kulübünün satırlarını yazabilir. Kulüp kodu oturumdaki e-postadan çıkarıldığı için
-- yeni bir kulüp hesabı açıldığında politikaları güncellemek gerekmez.

create or replace function public.session_email()
returns text
language sql
stable
set search_path = ''
as $$
  select lower(trim(auth.jwt() ->> 'email'))
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.session_email() = 'admin@naal.org.tr', false)
$$;

-- Oturumdaki kulüp hesabının kodu; okul alan adı dışındaki hesaplar için null.
create or replace function public.session_club_code()
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when public.session_email() like '%@naal.org.tr' then split_part(public.session_email(), '@', 1)
  end
$$;

-- Eski kayıtlarda e-postanın sonunda satır sonu kalmış; panel yükleyeni birebir eşleştirerek arar.
update public.cert set uploader_mail = lower(btrim(uploader_mail, E' \t\r\n'))
  where uploader_mail is distinct from lower(btrim(uploader_mail, E' \t\r\n'));
update public.cert_pdf set uploader_mail = lower(btrim(uploader_mail, E' \t\r\n'))
  where uploader_mail is distinct from lower(btrim(uploader_mail, E' \t\r\n'));

-- Sabit e-posta listesi içeren eski politikalar
drop policy if exists "ALL" on public.clubs;
drop policy if exists "ALL" on public.url;
drop policy if exists "ALL" on public.cert;
drop policy if exists "ALL" on public.cert_pdf;

-- clubs: kulüp hesabı yalnızca kendi satırını günceller, ekleme ve silme süper yöneticinin
drop policy if exists "clubs admin all" on public.clubs;
drop policy if exists "clubs update own" on public.clubs;

create policy "clubs admin all" on public.clubs
  for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

create policy "clubs update own" on public.clubs
  for update to authenticated
  using (code = (select public.session_club_code()))
  with check (code = (select public.session_club_code()));

-- url: kısa linkler `club_code` ile kulübe bağlıdır
drop policy if exists "url manage own" on public.url;

create policy "url manage own" on public.url
  for all to authenticated
  using ((select public.is_super_admin()) or club_code = (select public.session_club_code()))
  with check ((select public.is_super_admin()) or club_code = (select public.session_club_code()));

-- cert, cert_pdf: sertifikalar `uploader_mail` ile yükleyen hesaba bağlıdır
drop policy if exists "cert manage own" on public.cert;
drop policy if exists "cert_pdf manage own" on public.cert_pdf;

create policy "cert manage own" on public.cert
  for all to authenticated
  using (
    (select public.is_super_admin())
    or ((select public.session_club_code()) is not null and lower(uploader_mail) = (select public.session_email()))
  )
  with check (
    (select public.is_super_admin())
    or ((select public.session_club_code()) is not null and lower(uploader_mail) = (select public.session_email()))
  );

create policy "cert_pdf manage own" on public.cert_pdf
  for all to authenticated
  using (
    (select public.is_super_admin())
    or ((select public.session_club_code()) is not null and lower(uploader_mail) = (select public.session_email()))
  )
  with check (
    (select public.is_super_admin())
    or ((select public.session_club_code()) is not null and lower(uploader_mail) = (select public.session_email()))
  );
