-- Wish North v0.3: adult accounts + persistent list ownership + saved claims
-- Run this ONCE in Supabase SQL Editor after the original schema.sql.

alter table public.wish_lists
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

alter table public.gift_claims
  add column if not exists claimer_user_id uuid references auth.users(id) on delete set null;

create index if not exists wish_lists_owner_user_id_idx on public.wish_lists(owner_user_id);
create index if not exists gift_claims_claimer_user_id_idx on public.gift_claims(claimer_user_id);

-- Keep direct browser table access locked down. The app verifies Supabase Auth JWTs
-- in Next.js route handlers, then performs authorized reads/writes with the server key.
