create table if not exists public.subscriber (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id text not null unique,
  wilayah text,
  ambang_gempa_magnitude numeric not null default 5.0,
  ambang_aqi numeric not null default 150,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriber enable row level security;

revoke all on public.subscriber from anon, authenticated;
grant all on public.subscriber to service_role;
