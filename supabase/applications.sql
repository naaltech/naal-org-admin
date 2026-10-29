-- Kulüp başvuruları: Tally formlarının kulüplere eşleşmesi ve başvuruların değerlendirmesi.
-- policies.sql'den sonra SQL Editor'da bir kez çalıştırın.
--
-- Başvuruların kendisi Tally'de durur; panel onları `tally-applications` Edge Function'ı ile okur.
-- Burada yalnızca hangi formun hangi kulübe ait olduğu ve kulübün başvuruya verdiği durum ile not tutulur.

create table if not exists public.club_forms (
  form_id    text primary key,
  club_code  text not null,
  title      text not null,
  -- Bu tarihten önceki başvurular (önceki dönem) panelde gösterilmez.
  since      date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.application_reviews (
  submission_id text primary key,
  form_id       text not null references public.club_forms (form_id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  note          text not null default '',
  updated_at    timestamptz not null default now()
);

create index if not exists application_reviews_form on public.application_reviews (form_id);

alter table public.club_forms enable row level security;
alter table public.application_reviews enable row level security;

-- Formları yalnızca süper yönetici ekler (SQL Editor); kulüp yalnızca kendi formlarını görür.
drop policy if exists "club_forms read own" on public.club_forms;
create policy "club_forms read own" on public.club_forms
  for select to authenticated
  using ((select public.is_super_admin()) or club_code = (select public.session_club_code()));

drop policy if exists "application_reviews manage own" on public.application_reviews;
create policy "application_reviews manage own" on public.application_reviews
  for all to authenticated
  using (
    (select public.is_super_admin())
    or exists (
      select 1 from public.club_forms f
      where f.form_id = application_reviews.form_id and f.club_code = (select public.session_club_code())
    )
  )
  with check (
    (select public.is_super_admin())
    or exists (
      select 1 from public.club_forms f
      where f.form_id = application_reviews.form_id and f.club_code = (select public.session_club_code())
    )
  );

insert into public.club_forms (form_id, club_code, title, since) values
  ('meMMLk', 'tech', 'Üyelik başvurusu', '2026-10-29'),
  ('mZaeAV', 'tech', 'Naal''Hack katılımcı başvurusu', '2026-10-29'),
  ('3lrj2N', 'tech', 'Naal''Hack organizasyon ekibi başvurusu', '2026-10-29'),
  ('M11WDg', 'bilim', 'Üyelik başvurusu', '2026-10-29')
on conflict (form_id) do nothing;
