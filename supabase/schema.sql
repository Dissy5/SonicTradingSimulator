-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.sales (
  id bigint generated always as identity primary key,
  character text not null,
  skin text not null,
  rarity text not null,
  star integer not null check (star between 1 and 6),
  price integer not null check (price >= 0),
  type text not null default 'sale' check (type in ('sale', 'purchase')),
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

-- Skin flips (purchase now, record sale later)
create table if not exists public.flips (
  id bigint generated always as identity primary key,
  character text not null,
  skin text not null,
  rarity text not null,
  star integer not null check (star between 1 and 6),
  buy_price integer not null check (buy_price >= 0),
  planned_sell_price integer check (planned_sell_price is null or planned_sell_price >= 0),
  sell_price integer check (sell_price is null or sell_price >= 0),
  created_by uuid not null references public.profiles(id),
  recorded_by_email text,
  bought_at timestamptz not null default now(),
  sold_at timestamptz
);

create index if not exists flips_created_by_idx on public.flips (created_by);
create index if not exists flips_open_idx on public.flips (created_by) where sell_price is null;

alter table public.flips enable row level security;

create policy "flips_select_own"
  on public.flips for select
  to authenticated
  using (auth.uid() = created_by or public.is_admin());

create policy "flips_insert_own"
  on public.flips for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "flips_update_own_open"
  on public.flips for update
  to authenticated
  using (auth.uid() = created_by and sell_price is null)
  with check (auth.uid() = created_by and sell_price is not null);

create policy "flips_delete_own_open"
  on public.flips for delete
  to authenticated
  using (auth.uid() = created_by and sell_price is null);

-- Shop listings (5x5 grid of staged skins)
create table if not exists public.shop_listings (
  id bigint generated always as identity primary key,
  slot_index integer not null check (slot_index between 0 and 24),
  character text not null,
  skin text not null,
  rarity text not null,
  star integer not null check (star between 1 and 6),
  price integer not null check (price >= 0),
  created_by uuid not null references public.profiles(id),
  recorded_by_email text,
  created_at timestamptz not null default now(),
  unique (created_by, slot_index)
);

create index if not exists shop_listings_created_by_idx on public.shop_listings (created_by);

alter table public.shop_listings enable row level security;

create policy "shop_listings_select_own"
  on public.shop_listings for select
  to authenticated
  using (auth.uid() = created_by or public.is_admin());

create policy "shop_listings_insert_own"
  on public.shop_listings for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "shop_listings_update_own"
  on public.shop_listings for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "shop_listings_delete_own"
  on public.shop_listings for delete
  to authenticated
  using (auth.uid() = created_by or public.is_admin());

-- Profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  display_name text,
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Promote admins manually, e.g.:
-- update public.profiles set is_admin = true where email = 'you@example.com';

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "sales_update_own"
  on public.sales for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "flips_update_own"
  on public.flips for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Migrations for existing projects
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists theme text not null default 'dark'
    check (theme in ('dark', 'light'));

create policy "flips_delete_own"
  on public.flips for delete
  to authenticated
  using (auth.uid() = created_by);

alter table public.flips
  add column if not exists planned_sell_price integer
  check (planned_sell_price is null or planned_sell_price >= 0);

alter table public.sales
  add column if not exists type text not null default 'sale'
  check (type in ('sale', 'purchase'));
