create function ci_private.next_calendar_month(start_at timestamptz,anchor_day integer) returns timestamptz language sql immutable set search_path='' as $$
 select (date_trunc('month',start_at at time zone 'Asia/Kuala_Lumpur')+interval '1 month'
 + (least(anchor_day,extract(day from date_trunc('month',start_at at time zone 'Asia/Kuala_Lumpur')+interval '2 months'-interval '1 day')::integer)-1)*interval '1 day'
 + (start_at at time zone 'Asia/Kuala_Lumpur')::time) at time zone 'Asia/Kuala_Lumpur';
$$;
revoke all on function ci_private.next_calendar_month(timestamptz,integer) from public;
create or replace function ci_private.record_payment(target_user uuid,payment_reference text) returns void language plpgsql security definer set search_path='' set timezone='Asia/Kuala_Lumpur' as $$
declare start_at timestamptz; end_at timestamptz; anchor_at timestamptz;
begin
 if not ci_private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if length(trim(payment_reference)) not between 3 and 200 then raise exception 'Verified payment reference required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_user::text,0));
 select greatest(now(),period_end),case when period_end>now() then period_start else now() end into start_at,anchor_at from ci_private.plans where user_id=target_user;
 start_at:=coalesce(start_at,now());anchor_at:=coalesce(anchor_at,now());
 end_at:=ci_private.next_calendar_month(start_at,extract(day from anchor_at)::integer);
 insert into ci_private.payments(user_id,amount_sen,reference,period_start,period_end,recorded_by) values(target_user,1990,trim(payment_reference),start_at,end_at,(select auth.uid()));
 insert into ci_private.plans(user_id,period_start,period_end) values(target_user,anchor_at,end_at) on conflict(user_id) do update set period_start=anchor_at,period_end=end_at,updated_at=now();
 update ci_private.pro_requests set status='activated' where user_id=target_user;
 insert into ci_private.admin_audit(actor,action,target) values((select auth.uid()),'record_verified_payment',target_user);
end;$$;
