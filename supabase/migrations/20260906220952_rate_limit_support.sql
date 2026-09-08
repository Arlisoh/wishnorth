create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  window_start timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.rate_limit_buckets enable row level security;
revoke all on table public.rate_limit_buckets from anon, authenticated;

create or replace function public.consume_rate_limit(p_bucket_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_now timestamptz:=now(); v_window timestamptz; v_count integer;
begin
  insert into public.rate_limit_buckets(bucket_key,window_start,request_count,updated_at) values(p_bucket_key,v_now,1,v_now)
  on conflict(bucket_key) do update set
    request_count=case when public.rate_limit_buckets.window_start<=v_now-make_interval(secs=>p_window_seconds) then 1 else public.rate_limit_buckets.request_count+1 end,
    window_start=case when public.rate_limit_buckets.window_start<=v_now-make_interval(secs=>p_window_seconds) then v_now else public.rate_limit_buckets.window_start end,
    updated_at=v_now
  returning window_start,request_count into v_window,v_count;
  return v_count<=p_limit;
end; $$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;
