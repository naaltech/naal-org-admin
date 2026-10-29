-- Başvuru sonucunun başvurana e-postayla bildirilmesi. applications.sql'den sonra SQL Editor'da bir kez çalıştırın.
--
-- `message` başvurana giden e-postaya eklenir; `note` ise yalnızca kulübün kendi notudur.
-- `notified_status` bildirilen sonucu tutar; durum sonradan değişirse başvuru yeniden bildirilebilir.

alter table public.application_reviews
  add column if not exists message text not null default '',
  add column if not exists notified_at timestamptz,
  add column if not exists notified_status text check (notified_status in ('accepted', 'rejected'));
