-- Server-owned administrator membership, billing ledger and feature enforcement.
create table ci_private.admins(user_id uuid primary key references auth.users(id));
create table ci_private.plans(
 user_id uuid primary key references auth.users(id), period_start timestamptz not null,
 period_end timestamptz not null, updated_at timestamptz not null default now()
);
create table ci_private.payments(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 amount_sen integer not null check(amount_sen=1990), currency text not null default 'MYR' check(currency='MYR'),
 reference text unique not null check(length(reference) between 3 and 200),
 period_start timestamptz not null, period_end timestamptz not null,
 recorded_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table ci_private.pro_requests(user_id uuid primary key references auth.users(id), requested_at timestamptz not null default now(), status text not null default 'pending');
create table ci_private.admin_audit(id bigint generated always as identity primary key, actor uuid not null, action text not null, target uuid, created_at timestamptz not null default now());
revoke all on all tables in schema ci_private from public,anon,authenticated;
alter table ci_private.admins enable row level security;
alter table ci_private.plans enable row level security;
alter table ci_private.payments enable row level security;
alter table ci_private.pro_requests enable row level security;
alter table ci_private.admin_audit enable row level security;
create function ci_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and ((select auth.jwt())->'app_metadata'->>'provider')='google'
 and exists(select 1 from ci_private.admins where user_id=(select auth.uid()));
$$;
create function ci_private.has_pro(workspace uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ci_workspaces w join ci_private.plans p on p.user_id=w.owner_id where w.id=workspace and p.period_start<=now() and p.period_end>now());
$$;
create function ci_private.plan_status(workspace uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p ci_private.plans; owner uuid;
begin
 if not ci_private.is_staff(workspace) then raise exception 'Workspace access required' using errcode='42501'; end if;
 select owner_id into owner from public.ci_workspaces where id=workspace;
 select * into p from ci_private.plans where user_id=owner;
 return jsonb_build_object('pro',ci_private.has_pro(workspace),'periodEnd',p.period_end,'owner',owner=(select auth.uid()),'requestStatus',(select status from ci_private.pro_requests where user_id=owner));
end;$$;
create function ci_private.request_pro(workspace uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not ci_private.is_owner(workspace) then raise exception 'Only the school owner can request Pro' using errcode='42501'; end if;
 insert into ci_private.pro_requests(user_id) values((select auth.uid())) on conflict(user_id) do update set requested_at=now(),status='pending';
end;$$;
-- Canonical paid data comparison permits free class/subject/schedule setup,
-- but blocks adding/editing paid records, imports and direct API bypasses.
create function ci_private.paid_data(p jsonb) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('students',coalesce((select jsonb_agg(jsonb_build_object('class',c->>'id','students',c->'students') order by c->>'id') from jsonb_array_elements(coalesce(p->'classes','[]')) c where jsonb_array_length(coalesce(c->'students','[]'))>0),'[]'),
 'sessions',coalesce(p->'sessions','[]'),'interventions',coalesce(p->'interventions','[]'),
 'syllabus',coalesce((select jsonb_agg(jsonb_build_object('class',c->>'id','subject',s->>'id','topics',s->'syllabus') order by c->>'id',s->>'id') from jsonb_array_elements(coalesce(p->'classes','[]')) c cross join lateral jsonb_array_elements(coalesce(c->'subjects','[]')) s where jsonb_array_length(coalesce(s->'syllabus','[]'))>0),'[]'));
$$;
create function ci_private.enforce_pro() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if ci_private.paid_data(new.payload)<>ci_private.paid_data('{}') then raise exception 'Start with free setup. Pro is required for students and assessments.' using errcode='42501'; end if;
 elsif not ci_private.has_pro(old.id) and ci_private.paid_data(new.payload) is distinct from ci_private.paid_data(old.payload) then
  raise exception 'Pro required: RM19.90 per calendar month. Your existing records are preserved.' using errcode='42501';
 end if;
 return new;
end;$$;
create trigger workspace_pro before insert or update on public.ci_workspaces for each row execute function ci_private.enforce_pro();
alter policy share_insert on public.ci_shares with check(ci_private.is_staff(workspace_id) and ci_private.has_pro(workspace_id));
alter policy staff_insert on public.ci_staff with check(ci_private.is_owner(workspace_id) and ci_private.has_pro(workspace_id));
create function ci_private.admin_overview(search_text text default '') returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not ci_private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 return jsonb_build_object(
 'metrics',jsonb_build_object('users',(select count(*) from auth.users),'workspaces',(select count(*) from public.ci_workspaces),'activePro',(select count(*) from ci_private.plans where period_end>now()),'paymentsSen',(select coalesce(sum(amount_sen),0) from ci_private.payments)),
 'users',(select coalesce(jsonb_agg(x),'[]') from (select u.id,u.email,u.created_at,u.last_sign_in_at,p.period_end,
 exists(select 1 from ci_private.plans a where a.user_id=u.id and a.period_end>now()) as pro,
 (select status from ci_private.pro_requests r where r.user_id=u.id) as request_status,
 (select count(*) from public.ci_workspaces w where w.owner_id=u.id) as workspace_count
 from auth.users u left join ci_private.plans p on p.user_id=u.id where u.email ilike '%'||left(search_text,100)||'%' order by u.created_at desc limit 100) x),
 'workspaces',(select coalesce(jsonb_agg(x),'[]') from (select w.id,w.owner_id,u.email,w.payload->'settings'->>'school' as school,w.revision,w.created_at,
 jsonb_array_length(w.payload->'classes') as classes,
 (select coalesce(sum(jsonb_array_length(c->'students')),0) from jsonb_array_elements(w.payload->'classes') c) as students,
 jsonb_array_length(w.payload->'sessions') as assessments
 from public.ci_workspaces w join auth.users u on u.id=w.owner_id where u.email ilike '%'||left(search_text,100)||'%' order by w.created_at desc limit 100) x),
 'payments',(select coalesce(jsonb_agg(x),'[]') from (select p.*,u.email from ci_private.payments p join auth.users u on u.id=p.user_id where u.email ilike '%'||left(search_text,100)||'%' order by p.created_at desc limit 100) x),
 'audit',(select coalesce(jsonb_agg(x),'[]') from (select * from ci_private.admin_audit order by created_at desc limit 30) x));
end;$$;
create function ci_private.admin_workspace(workspace uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not ci_private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select to_jsonb(w) into result from public.ci_workspaces w where w.id=workspace;
 insert into ci_private.admin_audit(actor,action,target) values((select auth.uid()),'view_workspace',workspace);
 return result;
end;$$;
create function ci_private.record_payment(target_user uuid,payment_reference text) returns void language plpgsql security definer set search_path='' set timezone='Asia/Kuala_Lumpur' as $$
declare start_at timestamptz; end_at timestamptz;
begin
 if not ci_private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if length(trim(payment_reference)) not between 3 and 200 then raise exception 'Verified payment reference required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_user::text,0));
 select greatest(now(),period_end) into start_at from ci_private.plans where user_id=target_user;
 start_at:=coalesce(start_at,now()); end_at:=start_at+interval '1 month';
 insert into ci_private.payments(user_id,amount_sen,reference,period_start,period_end,recorded_by) values(target_user,1990,trim(payment_reference),start_at,end_at,(select auth.uid()));
 insert into ci_private.plans(user_id,period_start,period_end) values(target_user,start_at,end_at) on conflict(user_id) do update set period_end=end_at,updated_at=now();
 update ci_private.pro_requests set status='activated' where user_id=target_user;
 insert into ci_private.admin_audit(actor,action,target) values((select auth.uid()),'record_verified_payment',target_user);
end;$$;
-- Public invoker wrappers. Private definers are narrowly authorized above.
create function public.ci_is_admin() returns boolean language sql stable security invoker set search_path='' as $$select ci_private.is_admin();$$;
create function public.ci_plan(workspace uuid) returns jsonb language sql stable security invoker set search_path='' as $$select ci_private.plan_status(workspace);$$;
create function public.ci_request_pro(workspace uuid) returns void language sql security invoker set search_path='' as $$select ci_private.request_pro(workspace);$$;
create function public.ci_admin_overview(search_text text default '') returns jsonb language sql security invoker set search_path='' as $$select ci_private.admin_overview(search_text);$$;
create function public.ci_admin_workspace(workspace uuid) returns jsonb language sql security invoker set search_path='' as $$select ci_private.admin_workspace(workspace);$$;
create function public.ci_record_payment(target_user uuid,payment_reference text) returns void language sql security invoker set search_path='' as $$select ci_private.record_payment(target_user,payment_reference);$$;
revoke all on function ci_private.is_admin(),ci_private.has_pro(uuid),ci_private.plan_status(uuid),ci_private.request_pro(uuid),ci_private.paid_data(jsonb),ci_private.enforce_pro(),ci_private.admin_overview(text),ci_private.admin_workspace(uuid),ci_private.record_payment(uuid,text) from public;
revoke all on function public.ci_is_admin(),public.ci_plan(uuid),public.ci_request_pro(uuid),public.ci_admin_overview(text),public.ci_admin_workspace(uuid),public.ci_record_payment(uuid,text) from public;
grant execute on function ci_private.is_admin(),ci_private.has_pro(uuid),ci_private.plan_status(uuid),ci_private.request_pro(uuid),ci_private.admin_overview(text),ci_private.admin_workspace(uuid),ci_private.record_payment(uuid,text) to authenticated;
grant execute on function public.ci_is_admin(),public.ci_plan(uuid),public.ci_request_pro(uuid),public.ci_admin_overview(text),public.ci_admin_workspace(uuid),public.ci_record_payment(uuid,text) to authenticated;
