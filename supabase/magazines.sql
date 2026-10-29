-- Kulüp dergileri (ör. Bilim Kulübü'nün Naal Bilim dergisi): sayılar, PDF'ler ve kapaklar.
-- policies.sql'den sonra SQL Editor'da bir kez çalıştırın; tekrar çalıştırmak güvenlidir.
--
-- Her sayı bir satırdır. Sitede yayındaki en yüksek numaralı sayı güncel sayı, diğerleri önceki sayılar
-- olarak gösterilir. PDF ve PDF'in ilk sayfasından üretilen kapak `magazines/<kulüp kodu>/` altına yazılır.

create table if not exists public.magazines (
  id           bigint generated always as identity primary key,
  club_code    text not null,
  issue_number integer not null check (issue_number > 0),
  title        text not null default '',
  published_on date,
  description  text not null default '',
  -- Ana sayfadaki kısa tanıtım; boşsa açıklama kullanılır.
  summary      text not null default '',
  -- Öne çıkan yazılar: [{ "title": "...", "detail": "..." }]
  stories      jsonb not null default '[]'::jsonb,
  pdf_url      text,
  cover_url    text,
  -- PDF'i olmayan eski sayılar için dış bağlantı.
  external_url text,
  published    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (club_code, issue_number)
);

alter table public.magazines enable row level security;

-- Yayındaki sayıları herkes okur; taslakları ve yazmayı yalnızca kulübün kendisi ve süper yönetici görür.
drop policy if exists "magazines read published" on public.magazines;
create policy "magazines read published" on public.magazines
  for select to public
  using (published);

drop policy if exists "magazines manage own" on public.magazines;
create policy "magazines manage own" on public.magazines
  for all to authenticated
  using ((select public.is_super_admin()) or club_code = (select public.session_club_code()))
  with check ((select public.is_super_admin()) or club_code = (select public.session_club_code()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'magazines',
  'magazines',
  true,
  52428800, -- 50 MB
  array['application/pdf', 'image/webp', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "magazines select own" on storage.objects;
drop policy if exists "magazines insert own" on storage.objects;
drop policy if exists "magazines update own" on storage.objects;
drop policy if exists "magazines delete own" on storage.objects;

-- Silme işlemi API tarafında select yetkisi de gerektirir; herkese açık okuma public URL üzerinden yapılır.
create policy "magazines select own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'magazines'
    and ((select public.is_super_admin()) or (storage.foldername(name))[1] = (select public.session_club_code()))
  );

create policy "magazines insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'magazines'
    and ((select public.is_super_admin()) or (storage.foldername(name))[1] = (select public.session_club_code()))
  );

create policy "magazines update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'magazines'
    and ((select public.is_super_admin()) or (storage.foldername(name))[1] = (select public.session_club_code()))
  )
  with check (
    bucket_id = 'magazines'
    and ((select public.is_super_admin()) or (storage.foldername(name))[1] = (select public.session_club_code()))
  );

create policy "magazines delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'magazines'
    and ((select public.is_super_admin()) or (storage.foldername(name))[1] = (select public.session_club_code()))
  );

-- Mevcut sayılar. Sayı II'nin dosyaları sitenin kendi klasöründe durur; panelden yeni PDF yüklenince
-- Storage'a taşınır.
insert into public.magazines
  (club_code, issue_number, title, published_on, description, summary, stories, pdf_url, cover_url, external_url, published)
values
  (
    'bilim', 1, 'Naal Bilim 2025', null, '', '', '[]'::jsonb, null, null,
    'https://nevzatayazal.meb.k12.tr/meb_iys_dosyalar/34/21/964159/fotograf_galerisi_3859407.html',
    true
  ),
  (
    'bilim', 2, 'Işık Sayısı', '2026-11-01',
    'Kulübümüzün dergisi Naal Bilim''in ikinci sayısı, 2026 Nobel ödüllerinden yola çıkarak ışığın üç hikâyesini anlatıyor. Biyoloji, fizik ve kimya bölümlerinde öğrencilerimizin yazdığı makaleler, bulmacalar ve kaynakçayla 48 sayfa.',
    'Öğrencilerimizin yazdığı bilim makalelerini ve bulmacaları yayımladığımız dergimizin ikinci sayısı ışığın üç hikâyesini anlatıyor.',
    '[
      {"title": "Işıkla Beyin Kontrolü", "detail": "Optogenetik · Tıp"},
      {"title": "Buzun Altında Hayalet Avı", "detail": "IceCube · Fizik"},
      {"title": "Ayna Görüntüsü Moleküller", "detail": "Kiralite · Kimya"}
    ]'::jsonb,
    'https://bilim.naal.org.tr/dergi/naal-bilim-sayi-02.pdf',
    'https://bilim.naal.org.tr/dergi-kapak.webp',
    null,
    true
  )
on conflict (club_code, issue_number) do nothing;
