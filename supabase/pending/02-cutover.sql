-- Faz 2, ikinci adım: yetkiyi e-posta adresinden panel_roles tablosuna taşır. Bu dosya çalıştığı anda kulüp
-- hesapları ve dış editörler yetkisini kaybeder; yeni panelin yayına çıkmasıyla aynı anda çalıştırın (README.md).

-- Ara adımın (01b-dual-access.sql) politikaları; aşağıdaki politikalarla aynı işi yaparlar.
drop policy if exists "clubs update panel" on public.clubs;
drop policy if exists "url manage panel" on public.url;
drop policy if exists "cert manage panel" on public.cert;
drop policy if exists "cert_pdf manage panel" on public.cert_pdf;
drop policy if exists "club_forms read panel" on public.club_forms;
drop policy if exists "application_reviews manage panel" on public.application_reviews;
drop policy if exists "club_settings manage panel" on public.club_settings;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.panel_roles r
    where r.email = public.session_email() and r.role = 'super'
  )
$$;

-- Sertifikalar kulübün adresiyle (`<kod>@naal.org.tr`) tutulur; böylece görevli değişince kayıtlar kulüpte kalır.
create or replace function public.can_manage_uploader(mail text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_super_admin()
    or (lower(btrim(mail)) like '%@naal.org.tr' and public.can_manage_club(split_part(lower(btrim(mail)), '@', 1)))
$$;

drop policy "clubs update own" on public.clubs;
create policy "clubs update own" on public.clubs
  for update to authenticated
  using (public.can_manage_club(code))
  with check (public.can_manage_club(code));

drop policy "url manage own" on public.url;
create policy "url manage own" on public.url
  for all to authenticated
  using (public.can_manage_club(club_code))
  with check (public.can_manage_club(club_code));

drop policy "cert manage own" on public.cert;
create policy "cert manage own" on public.cert
  for all to authenticated
  using (public.can_manage_uploader(uploader_mail))
  with check (public.can_manage_uploader(uploader_mail));

drop policy "cert_pdf manage own" on public.cert_pdf;
create policy "cert_pdf manage own" on public.cert_pdf
  for all to authenticated
  using (public.can_manage_uploader(uploader_mail))
  with check (public.can_manage_uploader(uploader_mail));

drop policy "club_forms read own" on public.club_forms;
create policy "club_forms read own" on public.club_forms
  for select to authenticated
  using (public.can_manage_club(club_code));

drop policy "application_reviews manage own" on public.application_reviews;
create policy "application_reviews manage own" on public.application_reviews
  for all to authenticated
  using (exists (
    select 1 from public.club_forms f
    where f.form_id = application_reviews.form_id and public.can_manage_club(f.club_code)
  ))
  with check (exists (
    select 1 from public.club_forms f
    where f.form_id = application_reviews.form_id and public.can_manage_club(f.club_code)
  ));

drop policy "club_settings manage own" on public.club_settings;
create policy "club_settings manage own" on public.club_settings
  for all to authenticated
  using (public.can_manage_club(club_code))
  with check (public.can_manage_club(club_code));

-- Dergi: kulübü yönetenler ve bilim kulübünün dergi editörleri. Politikalar bu işlevi çağırdığı için değişmez.
create or replace function public.can_manage_magazine(code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_manage_club(code)
    or exists (
      select 1 from public.panel_roles r
      where r.email = public.session_email() and r.role = 'editor' and r.club_code = code
    )
$$;

create or replace function public.can_manage_club_logo(object_name text)
returns boolean
language sql
stable
as $$
  select public.can_manage_club((storage.foldername(object_name))[1])
$$;

drop table public.club_editors;
drop function public.session_club_code();
