-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.sales (
  id bigint generated always as identity primary key,
  character text not null,
  skin text not null,
  rarity text not null,
  star integer not null check (star between 1 and 6),
  price integer not null check (price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists sales_lookup_idx
  on public.sales (character, skin, rarity, star);

alter table public.sales enable row level security;

-- Shared friend-group app: open read/write via anon/publishable key.
-- Tighten these policies when you add auth.
create policy "sales_select"
  on public.sales for select
  using (true);

create policy "sales_insert"
  on public.sales for insert
  with check (true);

create policy "sales_delete"
  on public.sales for delete
  using (true);
