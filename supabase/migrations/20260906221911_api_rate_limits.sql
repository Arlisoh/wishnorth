create table if not exists public.api_rate_limits (
  scope text not null,
  fingerprint_hash text not null,
  bucket_start timestamptz not null,
  request_count integer not null default 0 check(request_count>=0),
  updated_at timestamptz not null default now(),
  primary key(scope,fingerprint_hash,bucket_start)
);
alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from public,anon,authenticated;

create or replace function public.consume_rate_limit(p_scope text,p_fingerprint_hash text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_bucket timestamptz; v_count integer;
begin
  if p_limit<1 or p_window_seconds<1 then return false; end if;
  v_bucket:=to_timestamp(floor(extract(epoch from now())/p_window_seconds)*p_window_seconds);
  insert into public.api_rate_limits(scope,fingerprint_hash,bucket_start,request_count,updated_at)
  values(p_scope,p_fingerprint_hash,v_bucket,1,now())
  on conflict(scope,fingerprint_hash,bucket_start) do update set request_count=public.api_rate_limits.request_count+1,updated_at=now()
  returning request_count into v_count;
  return v_count<=p_limit;
end; $$;
revoke all on function public.consume_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,text,integer,integer) to service_role;
create index if not exists api_rate_limits_updated_idx on public.api_rate_limits(updated_at);
