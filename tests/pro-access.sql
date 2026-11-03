begin;
do $$begin
 if ci_private.next_calendar_month('2027-01-31 10:00+08',31)<>'2027-02-28 10:00+08'::timestamptz then raise exception 'February billing clamp failed';end if;
 if ci_private.next_calendar_month('2027-02-28 10:00+08',31)<>'2027-03-31 10:00+08'::timestamptz then raise exception 'Original billing day lost';end if;
 if ci_private.next_calendar_month('2028-01-31 10:00+08',31)<>'2028-02-29 10:00+08'::timestamptz then raise exception 'Leap-year billing failed';end if;
end;$$;
insert into auth.users(id,email,aud,role) values
('91000000-0000-4000-8000-000000000001','billing-admin@example.invalid','authenticated','authenticated'),
('91000000-0000-4000-8000-000000000002','billing-teacher@example.invalid','authenticated','authenticated');
insert into ci_private.admins values('91000000-0000-4000-8000-000000000001');
insert into public.ci_workspaces(id,owner_id,payload) values('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','{"version":2,"classes":[],"sessions":[],"interventions":[]}');
set local request.jwt.claims='{"sub":"91000000-0000-4000-8000-000000000002","email":"billing-teacher@example.invalid","app_metadata":{"provider":"google"},"role":"authenticated","user_metadata":{"admin":true,"pro":true}}';
set local role authenticated;
do $$begin
 if public.ci_is_admin() then raise exception 'Self-assigned admin accepted';end if;
 begin perform public.ci_admin_overview('');raise exception 'Teacher read admin data';exception when insufficient_privilege then null;end;
 begin perform public.ci_admin_workspace('92000000-0000-4000-8000-000000000001');raise exception 'Teacher inspected admin records';exception when insufficient_privilege then null;end;
 begin perform public.ci_record_payment('91000000-0000-4000-8000-000000000002','fake-payment');raise exception 'Teacher activated Pro';exception when insufficient_privilege then null;end;
 begin update ci_private.plans set period_end=now()+interval '10 years';raise exception 'Teacher edited plan';exception when insufficient_privilege then null;end;
 update public.ci_workspaces set payload='{"version":2,"classes":[{"id":"c","students":[],"subjects":[{"id":"s","name":"Math","syllabus":[]}]}],"sessions":[],"interventions":[],"schedules":[{"day":0,"start":"08:00"}]}',revision=1 where id='92000000-0000-4000-8000-000000000001';
 begin update public.ci_workspaces set payload=jsonb_set(payload,'{classes,0,students}','[{"id":"student"}]'),revision=2 where id='92000000-0000-4000-8000-000000000001';raise exception 'Free teacher added student';exception when insufficient_privilege then null;end;
 begin update public.ci_workspaces set payload=jsonb_set(payload,'{sessions}','[{"id":"assessment"}]'),revision=2 where id='92000000-0000-4000-8000-000000000001';raise exception 'Free teacher added marks';exception when insufficient_privilege then null;end;
 begin insert into public.ci_shares(workspace_id,kind,payload) values('92000000-0000-4000-8000-000000000001','leaderboard','{"kind":"leaderboard"}');raise exception 'Free teacher published board';exception when insufficient_privilege then null;end;
 perform public.ci_request_pro('92000000-0000-4000-8000-000000000001');
 if (public.ci_plan('92000000-0000-4000-8000-000000000001')->>'pro')::boolean then raise exception 'Request activated plan';end if;
end;$$;
reset role;
set local request.jwt.claims='{"sub":"91000000-0000-4000-8000-000000000001","email":"billing-admin@example.invalid","app_metadata":{"provider":"google"},"role":"authenticated"}';
set local role authenticated;
do $$begin
 if not public.ci_is_admin() then raise exception 'Admin denied';end if;
 perform public.ci_admin_overview('billing-teacher');
 perform public.ci_record_payment('91000000-0000-4000-8000-000000000002','CI-TEST-REFERENCE');
 begin perform public.ci_record_payment('91000000-0000-4000-8000-000000000002','CI-TEST-REFERENCE');raise exception 'Duplicate payment accepted';exception when unique_violation then null;end;
end;$$;
reset role;
set local request.jwt.claims='{"sub":"91000000-0000-4000-8000-000000000002","email":"billing-teacher@example.invalid","app_metadata":{"provider":"google"},"role":"authenticated"}';
set local role authenticated;
do $$begin
 if not (public.ci_plan('92000000-0000-4000-8000-000000000001')->>'pro')::boolean then raise exception 'Paid user denied';end if;
 update public.ci_workspaces set payload=jsonb_set(payload,'{classes,0,students}','[{"id":"student"}]'),revision=2 where id='92000000-0000-4000-8000-000000000001';
end;$$;
reset role;
update ci_private.plans set period_end=now()-interval '1 second' where user_id='91000000-0000-4000-8000-000000000002';
set local role authenticated;
do $$begin
 if (public.ci_plan('92000000-0000-4000-8000-000000000001')->>'pro')::boolean then raise exception 'Expired plan active';end if;
 if (select count(*) from public.ci_workspaces where id='92000000-0000-4000-8000-000000000001')<>1 then raise exception 'Expired user lost records';end if;
 begin update public.ci_workspaces set payload=jsonb_set(payload,'{classes,0,students}','[]'),revision=3 where id='92000000-0000-4000-8000-000000000001';raise exception 'Expired user changed roster';exception when insufficient_privilege then null;end;
end;$$;
rollback;
