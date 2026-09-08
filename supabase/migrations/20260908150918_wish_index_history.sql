-- Wish North v0.6: private daily snapshots for historical and year-over-year reporting.
create table if not exists public.wish_index_snapshots (
  snapshot_date date primary key,
  generated_at timestamptz not null,
  sample_wishes integer not null default 0 check (sample_wishes >= 0),
  total_wishes integer not null default 0 check (total_wishes >= 0),
  total_lists integer not null default 0 check (total_lists >= 0),
  median_price_cents integer check (median_price_cents is null or median_price_cents >= 0),
  claim_intent_percent numeric(5,2) not null default 0 check (claim_intent_percent between 0 and 100),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wish_index_snapshots_generated_at_idx
  on public.wish_index_snapshots (generated_at desc);

alter table public.wish_index_snapshots enable row level security;
revoke all on table public.wish_index_snapshots from anon, authenticated;
grant select, insert, update on table public.wish_index_snapshots to service_role;
