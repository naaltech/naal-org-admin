-- Instagram entegrasyonu (Instagram API with Instagram Login).
-- Supabase panelinde SQL Editor'da bir kez çalıştırın; tekrar çalıştırmak güvenlidir.
--
-- Bağlı hesapların erişim token'ları burada tutulur. Tabloda RLS açık ve hiç politika yok:
-- yalnızca sunucudaki service role anahtarı okuyup yazabilir, tarayıcıdan erişilemez.
-- `club_code` boş olan hesap okulun kendi hesabıdır; yalnızca süper yönetici yönetir.

create table if not exists public.instagram_accounts (
  id bigint generated always as identity primary key,
  club_code text,
  ig_user_id text not null unique,
  username text not null,
  name text,
  access_token text not null,
  token_expires_at timestamptz not null,
  token_refreshed_at timestamptz not null default now(),
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_error text
);

-- Tablo bu dosyanın eski bir sürümüyle oluşturulduysa okul hesabı için kısıtı kaldır.
alter table public.instagram_accounts alter column club_code drop not null;

create index if not exists instagram_accounts_club_code_idx on public.instagram_accounts (club_code);

alter table public.instagram_accounts enable row level security;
revoke all on public.instagram_accounts from anon, authenticated;

-- Senkronize edilen postlar mevcut tabloya yazılır. Instagram medya kimliği tekrar eklemeyi önler;
-- eski script'in eklediği satırlarda bu alan boştur, onlar post_link ile eşleştirilir.
-- media_type: IMAGE, VIDEO veya CAROUSEL_ALBUM. Videolar için yalnızca kapak görseli saklanır;
-- sitede oynatma simgesi gösterip Instagram'daki posta link verilebilir.
-- ig_user_id: veri silme talebinde hesabın postlarını bulmak için.
alter table public.posts_instagram
  add column if not exists ig_media_id text,
  add column if not exists ig_user_id text,
  add column if not exists club_code text,
  add column if not exists media_type text;

create unique index if not exists posts_instagram_ig_media_id_key on public.posts_instagram (ig_media_id);
create index if not exists posts_instagram_ig_user_id_idx on public.posts_instagram (ig_user_id);
