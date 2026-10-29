-- Dergi editörleri: kulübün dergisini yönetebilen, kulüp hesabından ayrı kişisel hesaplar.
-- magazines.sql'den sonra SQL Editor'da bir kez çalıştırın; tekrar çalıştırmak güvenlidir.
--
-- Editör hesabını kulüp hesabı ya da süper yönetici panelden açar (editor-accounts Edge Function'ı, service role). Editör
-- e-postaları @naal.org.tr olamaz; böylece session_club_code() null döner ve editör yalnızca dergi
-- kurallarındaki can_manage_magazine() ile yetki kazanır.

create table if not exists public.club_editors (
  id         bigint generated always as identity primary key,
  club_code  text not null,
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  email      text not null unique,
  name       text not null default '',
  role       text not null default 'magazine' check (role in ('magazine')),
  created_at timestamptz not null default now()
);

alter table public.club_editors enable row level security;

-- Yazma yalnızca service role ile yapılır; okuma kulübün kendisine, süper yöneticiye ve editörün kendisine açık.
drop policy if exists "club_editors read" on public.club_editors;
create policy "club_editors read" on public.club_editors
  for select to authenticated
  using (
    (select public.is_super_admin())
    or club_code = (select public.session_club_code())
    or email = (select public.session_email())
  );

create or replace function public.can_manage_magazine(code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_super_admin()
    or code = public.session_club_code()
    or exists (
      select 1 from public.club_editors e
      where e.email = public.session_email() and e.club_code = code and e.role = 'magazine'
    )
$$;

drop policy if exists "magazines manage own" on public.magazines;
create policy "magazines manage own" on public.magazines
  for all to authenticated
  using (public.can_manage_magazine(club_code))
  with check (public.can_manage_magazine(club_code));

drop policy if exists "magazines select own" on storage.objects;
drop policy if exists "magazines insert own" on storage.objects;
drop policy if exists "magazines update own" on storage.objects;
drop policy if exists "magazines delete own" on storage.objects;

create policy "magazines select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'magazines' and public.can_manage_magazine((storage.foldername(name))[1]));

create policy "magazines insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'magazines' and public.can_manage_magazine((storage.foldername(name))[1]));

create policy "magazines update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'magazines' and public.can_manage_magazine((storage.foldername(name))[1]))
  with check (bucket_id = 'magazines' and public.can_manage_magazine((storage.foldername(name))[1]));

create policy "magazines delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'magazines' and public.can_manage_magazine((storage.foldername(name))[1]));
