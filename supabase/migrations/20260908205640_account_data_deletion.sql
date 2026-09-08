create or replace function public.delete_account_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  delete from public.gift_claims where claimer_user_id=p_user_id;
  delete from public.wish_lists where owner_user_id=p_user_id;
  delete from public.account_consents where user_id=p_user_id;
end;
$$;
revoke all on function public.delete_account_data(uuid) from public,anon,authenticated;
grant execute on function public.delete_account_data(uuid) to service_role;
