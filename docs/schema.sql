-- ClassInsights v2. Additive schema; existing unrelated tables are untouched.
create schema if not exists ci_private;
revoke all on schema ci_private from public;
create table public.ci_workspaces (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 payload jsonb not null check (payload->>'version'='2' and jsonb_typeof(payload)='object' and octet_length(payload::text)<10000000),
 revision integer not null default 0 check(revision>=0), created_at timestamptz not null default now()
);
create index ci_workspace_owner on public.ci_workspaces(owner_id);
create table public.ci_staff (
 workspace_id uuid not null references public.ci_workspaces(id) on delete cascade,
 email text not null check(email=lower(email) and length(email)<=254), primary key(workspace_id,email)
);
create index ci_staff_email on public.ci_staff(email);
create table public.ci_shares (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.ci_workspaces(id) on delete cascade,
 kind text not null check(kind in ('leaderboard','parent')), payload jsonb not null,
 parent_email text, expires_at timestamptz not null default now()+interval '7 days', created_at timestamptz not null default now(),
 check(expires_at<=created_at+interval '7 days'),
 check((kind='parent' and parent_email is not null and parent_email=lower(parent_email)) or (kind='leaderboard' and parent_email is null)),
 check(payload->>'kind'=kind and octet_length(payload::text)<1000000)
);
create index ci_shares_workspace on public.ci_shares(workspace_id);
alter table public.ci_workspaces enable row level security;
alter table public.ci_staff enable row level security;
alter table public.ci_shares enable row level security;
create function ci_private.is_staff(workspace uuid) returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and ((select auth.jwt())->'app_metadata'->>'provider')='google' and
 (exists(select 1 from public.ci_workspaces w where w.id=workspace and w.owner_id=(select auth.uid()))
 or exists(select 1 from public.ci_staff s where s.workspace_id=workspace and s.email=lower((select auth.jwt())->>'email')));
$$;
create function ci_private.is_owner(workspace uuid) returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists(select 1 from public.ci_workspaces where id=workspace and owner_id=(select auth.uid()));
$$;
revoke all on function ci_private.is_staff(uuid),ci_private.is_owner(uuid) from public;
grant usage on schema ci_private to authenticated;
grant execute on function ci_private.is_staff(uuid),ci_private.is_owner(uuid) to authenticated;
create policy workspace_select on public.ci_workspaces for select to authenticated using(ci_private.is_staff(id));
create policy workspace_insert on public.ci_workspaces for insert to authenticated with check(owner_id=(select auth.uid()) and ((select auth.jwt())->'app_metadata'->>'provider')='google');
create policy workspace_update on public.ci_workspaces for update to authenticated using(ci_private.is_staff(id)) with check(ci_private.is_staff(id));
create policy staff_select on public.ci_staff for select to authenticated using(ci_private.is_owner(workspace_id) or email=lower((select auth.jwt())->>'email'));
create policy staff_insert on public.ci_staff for insert to authenticated with check(ci_private.is_owner(workspace_id));
create policy staff_delete on public.ci_staff for delete to authenticated using(ci_private.is_owner(workspace_id));
create policy share_select on public.ci_shares for select to authenticated using(ci_private.is_staff(workspace_id));
create policy share_insert on public.ci_shares for insert to authenticated with check(ci_private.is_staff(workspace_id));
create policy share_delete on public.ci_shares for delete to authenticated using(ci_private.is_staff(workspace_id));
revoke all on public.ci_workspaces,public.ci_staff,public.ci_shares from anon,authenticated;
grant select,insert on public.ci_workspaces to authenticated;
grant update(payload,revision) on public.ci_workspaces to authenticated;
grant select,insert,delete on public.ci_staff,public.ci_shares to authenticated;
create function ci_private.check_revision() returns trigger language plpgsql set search_path='' as $$
begin
 if new.revision<>old.revision+1 then raise exception 'Revision must advance by one'; end if;
 return new;
end;$$;
revoke all on function ci_private.check_revision() from public;
create trigger workspace_revision before update on public.ci_workspaces for each row execute function ci_private.check_revision();
-- Intentional capability-link access: anon can read only a non-expired leaderboard
-- snapshot for an unguessable UUID. Parent snapshots additionally require a Google
-- session matching the designated parent email. No workspace data is returned.
create function ci_private.read_share(token uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.ci_shares;
begin
 select * into s from public.ci_shares where id=token and expires_at>now();
 if not found then return null; end if;
 if s.kind='parent' and ((select auth.uid()) is null or
   ((select auth.jwt())->'app_metadata'->>'provider') is distinct from 'google' or
   lower((select auth.jwt())->>'email') is distinct from s.parent_email) then return null; end if;
 return s.payload;
end;$$;
revoke all on function ci_private.read_share(uuid) from public;
grant usage on schema ci_private to anon;
grant execute on function ci_private.read_share(uuid) to anon,authenticated;
create function public.ci_read_share(token uuid) returns jsonb language sql stable security invoker set search_path='' as $$select ci_private.read_share(token);$$;
revoke all on function public.ci_read_share(uuid) from public;
grant execute on function public.ci_read_share(uuid) to anon,authenticated;
