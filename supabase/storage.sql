-- Kulüp logoları için Supabase Storage kurulumu.
-- Supabase panelinde SQL Editor'da bir kez çalıştırın; tekrar çalıştırmak güvenlidir.
--
-- Dosyalar `club-logos/<kulüp kodu>/<rastgele>.<uzantı>` yoluna yazılır.
-- Kulüp hesapları (`<kod>@naal.org.tr`) yalnızca kendi klasörlerine, süper yönetici her klasöre yazabilir.
-- Bucket herkese açıktır: logolar sitede giriş yapmadan görüntülenir.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-logos',
  'club-logos',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Oturumdaki kullanıcı bu nesnenin klasörünü yönetebilir mi?
create or replace function public.can_manage_club_logo(object_name text)
returns boolean
language sql
stable
as $$
  select
    lower(auth.jwt() ->> 'email') = 'admin@naal.org.tr'
    or (storage.foldername(object_name))[1] = split_part(lower(auth.jwt() ->> 'email'), '@', 1)
$$;

drop policy if exists "club-logos select own" on storage.objects;
drop policy if exists "club-logos insert own" on storage.objects;
drop policy if exists "club-logos update own" on storage.objects;
drop policy if exists "club-logos delete own" on storage.objects;

-- Silme işlemi API tarafında select yetkisi de gerektirir. Herkese açık okuma
-- public URL üzerinden yapıldığı için bu politika gerekmez.
create policy "club-logos select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'club-logos' and public.can_manage_club_logo(name));

create policy "club-logos insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'club-logos' and public.can_manage_club_logo(name));

create policy "club-logos update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'club-logos' and public.can_manage_club_logo(name))
  with check (bucket_id = 'club-logos' and public.can_manage_club_logo(name));

create policy "club-logos delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'club-logos' and public.can_manage_club_logo(name));
