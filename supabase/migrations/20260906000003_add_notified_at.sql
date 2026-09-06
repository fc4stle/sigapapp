-- Tracks whether a row has already triggered a Telegram notification,
-- so the notification engine doesn't re-notify subscribers on every cron run.
alter table public.gempa
  add column if not exists notified_at timestamptz;

alter table public.kualitas_udara
  add column if not exists notified_at timestamptz;
