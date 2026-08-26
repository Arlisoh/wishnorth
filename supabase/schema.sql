-- Wish North MVP schema
create extension if not exists pgcrypto;

create table if not exists public.wish_lists (
  id uuid primary key default gen_random_uuid(),
  subject_name text not null check (char_length(subject_name) between 1 and 80),
  occasion text not null default 'Christmas',
  description text,
  is_managed boolean not null default false,
  owner_key_hash text not null,
  share_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wish_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.wish_lists(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  url text,
  image_url text,
  retailer text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text not null default 'USD',
  notes text,
  size text,
  color text,
  priority smallint not null default 1 check (priority between 1 and 3),
  created_at timestamptz not null default now()
);

create table if not exists public.gift_claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.wish_items(id) on delete cascade,
  claimer_name text not null check (char_length(claimer_name) between 1 and 80),
  claim_code_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trend_events (
  id bigserial primary key,
  item_id uuid references public.wish_items(id) on delete set null,
  event_type text not null default 'wish_added',
  title_normalized text,
  retailer text,
  price_cents integer,
  created_at timestamptz not null default now()
);

create index if not exists wish_items_list_id_idx on public.wish_items(list_id);
create index if not exists trend_events_created_at_idx on public.trend_events(created_at desc);
create index if not exists trend_events_title_idx on public.trend_events(title_normalized);

-- The browser never talks directly to Supabase in this MVP.
-- Lock all tables down; Next.js server routes use the service role.
alter table public.wish_lists enable row level security;
alter table public.wish_items enable row level security;
alter table public.gift_claims enable row level security;
alter table public.trend_events enable row level security;

revoke all on table public.wish_lists from anon, authenticated;
revoke all on table public.wish_items from anon, authenticated;
revoke all on table public.gift_claims from anon, authenticated;
revoke all on table public.trend_events from anon, authenticated;
