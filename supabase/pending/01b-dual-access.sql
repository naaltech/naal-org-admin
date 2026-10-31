-- Faz 2, ara adım: eski e-posta yetkisi ile panel_roles yetkisini birlikte çalıştırır. Eski panel ve kulüp hesapları
-- etkilenmez; yeni panel canlı veriyle denenebilir. RLS'de birden çok izin politikası "veya" ile birleştiği için
-- eski politikalara dokunulmaz, yanlarına yenileri eklenir. Hepsini 02-cutover.sql kaldırır.

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.session_email() = 'admin@naal.org.tr', false)
    or exists (
      select 1 from public.panel_roles r
      where r.email = public.session_email() and r.role = 'super'
    )
$$;

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

create or replace function public.can_manage_magazine(code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_super_admin()
    or code = public.session_club_code()
    or public.can_manage_club(code)
    or exists (
      select 1 from public.club_editors e
      where e.email = public.session_email() and e.club_code = code and e.role = 'magazine'
    )
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
  select public.is_super_admin()
    or (storage.foldername(object_name))[1] = public.session_club_code()
    or public.can_manage_club((storage.foldername(object_name))[1])
$$;

drop policy if exists "clubs update panel" on public.clubs;
create policy "clubs update panel" on public.clubs
  for update to authenticated
  using (public.can_manage_club(code))
  with check (public.can_manage_club(code));

drop policy if exists "url manage panel" on public.url;
create policy "url manage panel" on public.url
  for all to authenticated
  using (public.can_manage_club(club_code))
  with check (public.can_manage_club(club_code));

drop policy if exists "cert manage panel" on public.cert;
create policy "cert manage panel" on public.cert
  for all to authenticated
  using (public.can_manage_uploader(uploader_mail))
  with check (public.can_manage_uploader(uploader_mail));

drop policy if exists "cert_pdf manage panel" on public.cert_pdf;
create policy "cert_pdf manage panel" on public.cert_pdf
  for all to authenticated
  using (public.can_manage_uploader(uploader_mail))
  with check (public.can_manage_uploader(uploader_mail));

drop policy if exists "club_forms read panel" on public.club_forms;
create policy "club_forms read panel" on public.club_forms
  for select to authenticated
  using (public.can_manage_club(club_code));

drop policy if exists "application_reviews manage panel" on public.application_reviews;
create policy "application_reviews manage panel" on public.application_reviews
  for all to authenticated
  using (exists (
    select 1 from public.club_forms f
    where f.form_id = application_reviews.form_id and public.can_manage_club(f.club_code)
  ))
  with check (exists (
    select 1 from public.club_forms f
    where f.form_id = application_reviews.form_id and public.can_manage_club(f.club_code)
  ));

drop policy if exists "club_settings manage panel" on public.club_settings;
create policy "club_settings manage panel" on public.club_settings
  for all to authenticated
  using (public.can_manage_club(club_code))
  with check (public.can_manage_club(club_code));
