-- «IQWealth برو» · a refunded or reversed payment takes its days back.
-- Called by lib/pro.ts confirmPaid when Wayl reports a paid order as
-- returned/refunded/reversed. Idempotent per order (revoked_at).

alter table public.pro_orders add column if not exists revoked_at timestamptz;

create or replace function public.pro_revoke(ref text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.pro_orders;
  until timestamptz;
begin
  update public.pro_orders
     set status = 'returned', revoked_at = now()
   where reference_id = ref and paid_at is not null and revoked_at is null
  returning * into o;
  if not found then return null; end if;

  update public.pro_entitlements
     set pro_until = pro_until - make_interval(days => o.days), updated_at = now()
   where user_id = o.user_id
  returning pro_until into until;
  return until;
end;
$$;

revoke all on function public.pro_revoke(text) from public, anon, authenticated;
grant execute on function public.pro_revoke(text) to service_role;
