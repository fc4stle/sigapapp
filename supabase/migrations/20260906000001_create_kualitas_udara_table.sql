-- Tabel kualitas_udara: menyimpan data kualitas udara terbaru dari OpenAQ (v3 API)
create table if not exists public.kualitas_udara (
  id uuid primary key default gen_random_uuid(),
  location_id text not null,
  location_name text not null,
  parameter text not null,
  value numeric not null,
  unit text,
  lintang numeric not null,
  bujur numeric not null,
  waktu timestamptz not null,
  created_at timestamptz not null default now(),
  constraint kualitas_udara_location_parameter_key unique (location_id, parameter)
);

alter table public.kualitas_udara enable row level security;

create policy "Public read access on kualitas_udara"
  on public.kualitas_udara
  for select
  to anon, authenticated
  using (true);
