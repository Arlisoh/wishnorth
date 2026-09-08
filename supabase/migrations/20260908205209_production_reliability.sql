create or replace function public.consume_rate_limit(
  p_scope text,
  p_fingerprint_hash text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_bucket timestamptz;
  v_count integer;
begin
  if p_scope is null or length(p_scope)>100 or p_fingerprint_hash is null or length(p_fingerprint_hash)>128
    or p_limit<1 or p_limit>10000 or p_window_seconds<1 or p_window_seconds>86400 then
    return false;
  end if;
  v_bucket:=to_timestamp(floor(extract(epoch from now())/p_window_seconds)*p_window_seconds);
  insert into public.api_rate_limits(scope,fingerprint_hash,bucket_start,request_count,updated_at)
  values(p_scope,p_fingerprint_hash,v_bucket,1,now())
  on conflict(scope,fingerprint_hash,bucket_start)
  do update set request_count=public.api_rate_limits.request_count+1,updated_at=now()
  returning request_count into v_count;
  return v_count<=p_limit;
end;
$$;
revoke all on function public.consume_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,text,integer,integer) to service_role;

create or replace function public.moderate_abuse_report(
  p_report_id uuid,
  p_action text,
  p_admin_user_id uuid,
  p_note text default null
) returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_report public.abuse_reports%rowtype;
  v_target_id uuid;
  v_now timestamptz:=now();
begin
  if p_action not in ('hide','restore','dismiss','delete') then
    raise exception 'Unsupported moderation action';
  end if;
  select * into v_report from public.abuse_reports where id=p_report_id for update;
  if not found then return false; end if;
  v_target_id:=coalesce(v_report.item_id,v_report.list_id);

  if p_action='hide' then
    if v_report.target_type='item' then
      update public.wish_items set moderation_status='hidden',moderation_reason=coalesce(nullif(p_note,''),v_report.reason),moderated_at=v_now where id=v_target_id;
    else
      update public.wish_lists set moderation_status='hidden',moderation_reason=coalesce(nullif(p_note,''),v_report.reason),moderated_at=v_now where id=v_target_id;
    end if;
  elsif p_action='restore' then
    if v_report.target_type='item' then
      update public.wish_items set moderation_status='active',moderation_reason=null,moderated_at=v_now where id=v_target_id;
    else
      update public.wish_lists set moderation_status='active',moderation_reason=null,moderated_at=v_now where id=v_target_id;
    end if;
  elsif p_action='delete' then
    insert into public.moderation_actions(report_id,target_type,target_id,action,admin_user_id,note)
    values(p_report_id,v_report.target_type,v_target_id,p_action,p_admin_user_id,nullif(p_note,''));
    if v_report.target_type='item' then delete from public.wish_items where id=v_target_id;
    else delete from public.wish_lists where id=v_target_id;
    end if;
    return true;
  end if;

  insert into public.moderation_actions(report_id,target_type,target_id,action,admin_user_id,note)
  values(p_report_id,v_report.target_type,v_target_id,p_action,p_admin_user_id,nullif(p_note,''));
  update public.abuse_reports set
    status=case when p_action='dismiss' then 'dismissed' else 'resolved' end,
    admin_note=nullif(p_note,''),handled_at=v_now,handled_by=p_admin_user_id
  where id=p_report_id;
  return true;
end;
$$;
revoke all on function public.moderate_abuse_report(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.moderate_abuse_report(uuid,text,uuid,text) to service_role;

create index if not exists wish_items_uncached_images_idx
  on public.wish_items(created_at)
  where image_cached_at is null and image_source_url is not null;
