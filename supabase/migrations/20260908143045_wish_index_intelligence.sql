alter table public.wish_items add column if not exists category text, add column if not exists brand text;
alter table public.trend_events add column if not exists category text, add column if not exists brand text,
  add column if not exists geo_country text, add column if not exists geo_region text,
  add column if not exists geo_region_code text, add column if not exists geo_city text;
create index if not exists wish_items_category_idx on public.wish_items(category);
create index if not exists wish_items_retailer_domain_idx on public.wish_items(retailer_domain);
create index if not exists trend_events_category_created_idx on public.trend_events(category,created_at desc);
create index if not exists trend_events_retailer_created_idx on public.trend_events(retailer_domain,created_at desc);
create index if not exists trend_events_geo_region_created_idx on public.trend_events(geo_country,geo_region_code,created_at desc);
create index if not exists trend_events_item_id_idx on public.trend_events(item_id);
