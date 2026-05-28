-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.sales (
  id bigint generated always as identity primary key,
  character text not null,
  skin text not null,
  rarity text not null,
  star integer not null check (star between 1 and 6),
  price integer not null check (price >= 0),
  created_by uuid references public.profiles(id),
  recorded_by_email text,
  created_at timestamptz not null default now()
);

create index if not exists sales_lookup_idx
  on public.sales (character, skin, rarity, star);

create index if not exists sales_created_by_idx
  on public.sales (created_by);

alter table public.sales enable row level security;

-- Anyone can read sales; only signed-in users can record (see insert policy).
create policy "sales_select"
  on public.sales for select
  using (true);

create policy "sales_insert"
  on public.sales for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "sales_delete"
  on public.sales for delete
  to authenticated
  using (auth.uid() = created_by or public.is_admin());

-- Profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Promote admins manually, e.g.:
-- update public.profiles set is_admin = true where email = 'you@example.com';
