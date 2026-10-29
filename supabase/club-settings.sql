-- Kulübe özel, herkese açık olmayan ayarlar (ör. yalnızca kabul edilen üyelere gönderilen WhatsApp topluluk linki).
-- policies.sql'den sonra SQL Editor'da bir kez çalıştırın; tekrar çalıştırmak güvenlidir.
--
-- `clubs` herkese açık okunduğu için bu bilgiler ayrı tabloda durur: yalnızca kulübün kendisi ve süper yönetici
-- okuyup yazabilir. tally-applications fonksiyonu kabul e-postasını kulübün oturumuyla oluşturduğu için linki okuyabilir.

create table if not exists public.club_settings (
  club_code    text primary key,
  whatsapp_url text not null default '',
  updated_at   timestamptz not null default now()
);

alter table public.club_settings enable row level security;

drop policy if exists "club_settings manage own" on public.club_settings;
create policy "club_settings manage own" on public.club_settings
  for all to authenticated
  using ((select public.is_super_admin()) or club_code = (select public.session_club_code()))
  with check ((select public.is_super_admin()) or club_code = (select public.session_club_code()));
