-- The stable staff helper reads the statement snapshot and cannot see a workspace
-- being created in that same INSERT ... RETURNING statement. Check the new row's
-- owner directly, preserving the Google requirement and existing staff access.
alter policy workspace_select on public.ci_workspaces using (
 (owner_id=(select auth.uid()) and ((select auth.jwt())->'app_metadata'->>'provider')='google')
 or ci_private.is_staff(id)
);
