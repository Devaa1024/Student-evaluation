-- A roster/recipient/consent change invalidates old snapshots automatically.
create function ci_private.revoke_roster_shares() returns trigger language plpgsql set search_path='' as $$
declare old_rosters jsonb; new_rosters jsonb;
begin
 select jsonb_agg(jsonb_build_object('classId',c->>'id','students',c->'students')) into old_rosters from jsonb_array_elements(coalesce(old.payload->'classes','[]'::jsonb)) c;
 select jsonb_agg(jsonb_build_object('classId',c->>'id','students',c->'students')) into new_rosters from jsonb_array_elements(coalesce(new.payload->'classes','[]'::jsonb)) c;
 if old_rosters is distinct from new_rosters then delete from public.ci_shares where workspace_id=old.id; end if;
 return new;
end;$$;
revoke all on function ci_private.revoke_roster_shares() from public;
create trigger workspace_roster_shares before update on public.ci_workspaces for each row execute function ci_private.revoke_roster_shares();
