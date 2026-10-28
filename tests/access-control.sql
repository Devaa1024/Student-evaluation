-- Run against the dedicated ClassInsights Supabase database. All fixtures roll back.
begin;
insert into auth.users(id,email,aud,role) values
('10000000-0000-4000-8000-000000000001','ci-owner@example.invalid','authenticated','authenticated'),
('10000000-0000-4000-8000-000000000002','ci-parent@example.invalid','authenticated','authenticated'),
('10000000-0000-4000-8000-000000000003','ci-other@example.invalid','authenticated','authenticated');
insert into public.ci_workspaces(id,owner_id,payload) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','{"version":2}');
insert into public.ci_shares(id,workspace_id,kind,parent_email,payload) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','leaderboard',null,'{"kind":"leaderboard","rows":[{"alias":"Test Owl","score":80}]}'),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','parent','ci-parent@example.invalid','{"kind":"parent","studentName":"Test Learner"}');
set local role anon;
do $$begin
 if public.ci_read_share('30000000-0000-4000-8000-000000000001')->>'kind' is distinct from 'leaderboard' then raise exception 'Anonymous leaderboard failed'; end if;
 if public.ci_read_share('30000000-0000-4000-8000-000000000002') is not null then raise exception 'Anonymous parent leakage'; end if;
 if public.ci_read_share('39999999-0000-4000-8000-000000000001') is not null then raise exception 'Unknown token leakage'; end if;
 begin perform * from public.ci_workspaces; raise exception 'Anon workspace exposure'; exception when insufficient_privilege then null; end;
 begin perform * from public.ci_shares; raise exception 'Anon share-list exposure'; exception when insufficient_privilege then null; end;
end;$$;
reset role;
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000002","email":"ci-parent@example.invalid","app_metadata":{"provider":"google"},"role":"authenticated"}';
set local role authenticated;
do $$begin
 if (select count(*) from public.ci_workspaces)<>0 then raise exception 'Parent sees workspace'; end if;
 if public.ci_read_share('30000000-0000-4000-8000-000000000002')->>'studentName' is distinct from 'Test Learner' then raise exception 'Intended parent cannot read'; end if;
end;$$;
reset role;
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000003","email":"ci-other@example.invalid","app_metadata":{"provider":"google"},"role":"authenticated"}';
set local role authenticated;
do $$begin
 if (select count(*) from public.ci_workspaces)<>0 then raise exception 'Unrelated account sees workspace'; end if;
 if public.ci_read_share('30000000-0000-4000-8000-000000000002') is not null then raise exception 'Wrong parent leakage'; end if;
end;$$;
reset role;
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000001","email":"ci-owner@example.invalid","app_metadata":{"provider":"google"},"role":"authenticated"}';
set local role authenticated;
do $$declare affected int; begin
 if (select count(*) from public.ci_workspaces)<>1 then raise exception 'Owner cannot read'; end if;
 update public.ci_workspaces set payload='{"version":2,"test":true}',revision=1 where id='20000000-0000-4000-8000-000000000001' and revision=0;
 get diagnostics affected=row_count;
 if affected<>1 then raise exception 'Owner save failed'; end if;
 update public.ci_workspaces set payload='{"version":2,"stale":true}',revision=1 where id='20000000-0000-4000-8000-000000000001' and revision=0;
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Stale save succeeded'; end if;
 insert into public.ci_staff(workspace_id,email) values('20000000-0000-4000-8000-000000000001','ci-other@example.invalid');
end;$$;
reset role;
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000003","email":"ci-other@example.invalid","app_metadata":{"provider":"google"},"role":"authenticated"}';
set local role authenticated;
do $$begin
 if (select count(*) from public.ci_workspaces)<>1 then raise exception 'Invited staff cannot read'; end if;
 begin insert into public.ci_staff(workspace_id,email) values('20000000-0000-4000-8000-000000000001','uninvited@example.invalid'); raise exception 'Staff expanded own access'; exception when insufficient_privilege then null; end;
end;$$;
reset role;
delete from public.ci_shares where id='30000000-0000-4000-8000-000000000001';
update public.ci_shares set expires_at=now()-interval '1 minute' where id='30000000-0000-4000-8000-000000000002';
set local role anon;
do $$begin
 if public.ci_read_share('30000000-0000-4000-8000-000000000001') is not null then raise exception 'Revoked link still reads'; end if;
 if public.ci_read_share('30000000-0000-4000-8000-000000000002') is not null then raise exception 'Expired link still reads'; end if;
end;$$;
reset role;
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000002","email":"ci-parent@example.invalid","app_metadata":{"provider":"google"},"role":"authenticated"}';
set local role authenticated;
do $$begin
 if public.ci_read_share('30000000-0000-4000-8000-000000000002') is not null then raise exception 'Intended parent can read expired link'; end if;
end;$$;
reset role;
insert into public.ci_shares(id,workspace_id,kind,parent_email,payload) values('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','leaderboard',null,'{"kind":"leaderboard"}');
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000001","email":"ci-owner@example.invalid","app_metadata":{"provider":"google"},"role":"authenticated"}';
set local role authenticated;
update public.ci_workspaces set payload='{"version":2,"classes":[{"id":"class","students":[{"id":"student","shareConsent":false}]}]}',revision=2 where id='20000000-0000-4000-8000-000000000001' and revision=1;
do $$begin
 if (select count(*) from public.ci_shares)<>0 then raise exception 'Roster change did not revoke snapshots'; end if;
end;$$;
reset role;
rollback;
