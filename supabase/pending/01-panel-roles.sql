-- Faz 2, birinci adım: mevcut düzeni bozmadan yeni tabloları ekler. Sıra ve kontroller için README.md.
--
-- panel_roles panelin tek yetki kaynağıdır; satırları yalnızca dizin (naal-directory) yazar, panelden
-- değiştirilemez. Politikalar tabloyu her sorguda okuduğu için dizin satırı silince yetki hemen biter.
-- directory_commands panelin dizinden istekleridir; işçi dakikada bir okur ve sonucu aynı satıra yazar.

create table if not exists public.panel_roles (
  email      text not null,
  -- süper yöneticide boş
  club_code  text not null default '',
  role       text not null check (role in ('super', 'club', 'editor')),
  name       text not null default '',
  updated_at timestamptz not null default now(),
  primary key (email, club_code, role)
);

alter table public.panel_roles enable row level security;

create or replace function public.can_manage_club(code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.panel_roles r
    where r.email = public.session_email()
      and (r.role = 'super' or (r.role = 'club' and r.club_code = code))
  )
$$;

drop policy if exists "panel_roles read" on public.panel_roles;
create policy "panel_roles read" on public.panel_roles
  for select to authenticated
  using (email = (select public.session_email()) or public.can_manage_club(club_code));

create table if not exists public.directory_commands (
  id           bigint generated always as identity primary key,
  kind         text not null check (kind in ('grant_editor', 'revoke_editor', 'add_member')),
  club_code    text not null,
  email        text not null,
  requested_by text not null default public.session_email(),
  status       text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  error        text,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);

-- Aynı istek bekliyorken ikinci kez eklenmez (ör. kabul iki kez işaretlendi)
create unique index if not exists directory_commands_pending
  on public.directory_commands (kind, club_code, email) where status = 'pending';

alter table public.directory_commands enable row level security;

drop policy if exists "directory_commands read" on public.directory_commands;
create policy "directory_commands read" on public.directory_commands
  for select to authenticated
  using (public.can_manage_club(club_code));

drop policy if exists "directory_commands request" on public.directory_commands;
create policy "directory_commands request" on public.directory_commands
  for insert to authenticated
  with check (
    public.can_manage_club(club_code)
    and status = 'pending'
    and error is null
    and finished_at is null
    and requested_by = (select public.session_email())
  );

-- Kabul edilen başvuru yalnızca üyelik formlarında kulübe üye yapar; etkinlik formları üyelik değildir
alter table public.club_forms add column if not exists adds_members boolean not null default false;
update public.club_forms set adds_members = true where title = 'Üyelik başvurusu';

-- Tally formunu kulübe panelden bağlama
drop policy if exists "club_forms admin write" on public.club_forms;
create policy "club_forms admin write" on public.club_forms
  for all to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- Dizinde kapatılan kulüp sitede gizlenir. Değeri dizin yazar; satır ve sertifikalar silinmez.
alter table public.clubs add column if not exists is_active boolean not null default true;

-- Toplu sertifika: kulüp listeyi bırakır, dizin kişiyi doğrulayıp sertifikayı üretir ve e-postayı gönderir.
-- Okul dışı kişinin adını kulüp yazar; okulda kayıtlı kişide dizin bu adı yok sayar.
-- cert tablosu herkese açık okunduğu için adresler orada değil burada durur; gönderilen satırın adresi silinir.
create table if not exists public.certificate_batches (
  id           bigint generated always as identity primary key,
  club_code    text not null,
  title        text not null check (btrim(title) <> ''),
  event_date   date not null,
  issuer       text not null check (btrim(issuer) <> ''),
  requested_by text not null default public.session_email(),
  created_at   timestamptz not null default now()
);

create table if not exists public.certificate_recipients (
  id         bigint generated always as identity primary key,
  batch_id   bigint not null references public.certificate_batches (id) on delete cascade,
  email      text,
  name       text not null default '',
  file_id    text not null unique,
  status     text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error      text,
  attempts   integer not null default 0,
  sent_at    timestamptz,
  unique (batch_id, email)
);

create index if not exists certificate_recipients_pending
  on public.certificate_recipients (id) where status = 'pending';

alter table public.certificate_batches enable row level security;
alter table public.certificate_recipients enable row level security;

drop policy if exists "certificate_batches read" on public.certificate_batches;
create policy "certificate_batches read" on public.certificate_batches
  for select to authenticated
  using (public.can_manage_club(club_code));

drop policy if exists "certificate_batches request" on public.certificate_batches;
create policy "certificate_batches request" on public.certificate_batches
  for insert to authenticated
  with check (public.can_manage_club(club_code) and requested_by = (select public.session_email()));

-- Yarıda kalan toplu istek geri alınabilsin; yalnızca satırı olmayan yığın silinir
drop policy if exists "certificate_batches undo" on public.certificate_batches;
create policy "certificate_batches undo" on public.certificate_batches
  for delete to authenticated
  using (
    public.can_manage_club(club_code)
    and not exists (select 1 from public.certificate_recipients r where r.batch_id = certificate_batches.id)
  );

drop policy if exists "certificate_recipients read" on public.certificate_recipients;
create policy "certificate_recipients read" on public.certificate_recipients
  for select to authenticated
  using (exists (
    select 1 from public.certificate_batches b
    where b.id = batch_id and public.can_manage_club(b.club_code)
  ));

drop policy if exists "certificate_recipients request" on public.certificate_recipients;
create policy "certificate_recipients request" on public.certificate_recipients
  for insert to authenticated
  with check (
    status = 'pending'
    and char_length(name) <= 120
    and error is null
    and attempts = 0
    and sent_at is null
    and exists (
      select 1 from public.certificate_batches b
      where b.id = batch_id and public.can_manage_club(b.club_code)
    )
  );
