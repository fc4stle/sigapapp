-- Tabel gempa: menyimpan data gempa terbaru dari BMKG (autogempa.json)
create table if not exists public.gempa (
  id uuid primary key default gen_random_uuid(),
  tanggal text not null,
  jam text not null,
  date_time timestamptz not null unique,
  magnitude numeric not null,
  kedalaman text not null,
  wilayah text not null,
  potensi text,
  lintang numeric not null,
  bujur numeric not null,
  created_at timestamptz not null default now()
);

alter table public.gempa enable row level security;

create policy "Public read access on gempa"
  on public.gempa
  for select
  to anon, authenticated
  using (true);
