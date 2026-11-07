-- =====================================================================
-- FitFlow production: multi-gym (tenant) isolation hardening
-- Date: 2026-11-07   Project: FitFlowProd (dbtdarmxvgbxeinwcxka)
-- Rollback material: backup-2026-11-07-*.sql / *.json in this folder
--
-- Principle: every change only REMOVES access. A logged-in user can only
-- see/change rows of the gym they belong to; anonymous visitors can only
-- write pre-login telemetry logs and read nothing.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 0. Helpers
-- ---------------------------------------------------------------------
alter function public.get_current_gym_id() stable set search_path = public, pg_temp;

create or replace function public.current_gym_role()
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select role from gym_users where auth_user_id = auth.uid() and is_active limit 1;
$$;

create or replace function public.gym_has_no_users(p_gym_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select not exists (select 1 from gym_users where gym_id = p_gym_id);
$$;

revoke all on function public.current_gym_role() from public, anon;
revoke all on function public.gym_has_no_users(uuid) from public, anon;
grant execute on function public.current_gym_role() to authenticated, service_role;
grant execute on function public.gym_has_no_users(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 1. record_versions (change history) - was readable by every login
-- ---------------------------------------------------------------------
drop policy if exists "Allow read access to version history" on public.record_versions;
drop policy if exists "Allow system inserts to version history" on public.record_versions;
-- Inserts come only from trigger log_record_version() (SECURITY DEFINER, table owner).
create policy record_versions_select_own_gym on public.record_versions
  for select to authenticated
  using (
    coalesce(new_data->>'gym_id', old_data->>'gym_id') = (select public.get_current_gym_id())::text
    or (table_name = 'gym_gyms' and record_id = (select public.get_current_gym_id())::text)
  );

-- ---------------------------------------------------------------------
-- 2. v_recent_changes - was readable WITHOUT login (ran as owner)
-- ---------------------------------------------------------------------
alter view public.v_recent_changes set (security_invoker = true);
revoke all on public.v_recent_changes from anon;

-- ---------------------------------------------------------------------
-- 3. gym_users - any login could attach itself to any gym
-- ---------------------------------------------------------------------
drop policy if exists "Allow gym user creation during signup" on public.gym_users;
drop policy if exists "Authenticated users can create gym user" on public.gym_users;
create policy gym_users_insert_secure on public.gym_users
  for insert to authenticated
  with check (
    -- owner adds staff to their own gym
    (gym_id = (select public.get_current_gym_id()) and (select public.current_gym_role()) = 'owner')
    or
    -- self sign-up: become owner of a brand-new gym that has no users yet
    (auth_user_id = auth.uid()
     and role = 'owner'
     and (select public.get_current_gym_id()) is null
     and public.gym_has_no_users(gym_id))
  );

drop policy if exists gym_users_update_own_gym on public.gym_users;
create policy gym_users_update_own_gym on public.gym_users
  for update to authenticated
  using (gym_id = (select public.get_current_gym_id()))
  with check (gym_id = (select public.get_current_gym_id()));

drop policy if exists gym_users_delete_own_gym on public.gym_users;
create policy gym_users_delete_own_gym on public.gym_users
  for delete to authenticated
  using (gym_id = (select public.get_current_gym_id()) and (select public.current_gym_role()) = 'owner');

-- ---------------------------------------------------------------------
-- 4. gym_gyms - remove anonymous demo access, restrict creation
-- ---------------------------------------------------------------------
drop policy if exists "Demo gyms - allow anonymous delete" on public.gym_gyms;
drop policy if exists "Demo gyms - allow anonymous update" on public.gym_gyms;
drop policy if exists "Allow gym creation during signup" on public.gym_gyms;
create policy gym_gyms_insert_signup on public.gym_gyms
  for insert to authenticated
  with check ((select public.get_current_gym_id()) is null);

drop policy if exists gym_gyms_update_own on public.gym_gyms;
create policy gym_gyms_update_own on public.gym_gyms
  for update to authenticated
  using (id = (select public.get_current_gym_id()))
  with check (id = (select public.get_current_gym_id()));

-- ---------------------------------------------------------------------
-- 5. Remove anonymous "demo" write policies on business tables
-- ---------------------------------------------------------------------
drop policy if exists "Demo members - allow anonymous delete" on public.gym_members;
drop policy if exists "Demo members - allow anonymous insert" on public.gym_members;
drop policy if exists "Demo members - allow anonymous update" on public.gym_members;
drop policy if exists "Demo plans - allow anonymous delete" on public.gym_membership_plans;
drop policy if exists "Demo plans - allow anonymous insert" on public.gym_membership_plans;
drop policy if exists "Demo plans - allow anonymous update" on public.gym_membership_plans;
drop policy if exists "Demo payments - allow anonymous delete" on public.gym_payments;
drop policy if exists "Demo payments - allow anonymous insert" on public.gym_payments;
drop policy if exists "Demo payments - allow anonymous update" on public.gym_payments;

-- ---------------------------------------------------------------------
-- 6. Log tables - rows with NULL gym_id were readable by everyone
--    (api logs contain full response bodies). Read = own gym only.
--    Insert policies unchanged (pre-login telemetry may have NULL gym).
-- ---------------------------------------------------------------------
drop policy if exists gym_api_logs_select_own_gym on public.gym_api_logs;
create policy gym_api_logs_select_own_gym on public.gym_api_logs
  for select to authenticated using (gym_id = (select public.get_current_gym_id()));

drop policy if exists gym_audit_logs_select_own_gym on public.gym_audit_logs;
create policy gym_audit_logs_select_own_gym on public.gym_audit_logs
  for select to authenticated using (gym_id = (select public.get_current_gym_id()));

drop policy if exists gym_click_logs_select_own_gym on public.gym_click_logs;
create policy gym_click_logs_select_own_gym on public.gym_click_logs
  for select to authenticated using (gym_id = (select public.get_current_gym_id()));

drop policy if exists gym_error_logs_select_own_gym on public.gym_error_logs;
create policy gym_error_logs_select_own_gym on public.gym_error_logs
  for select to authenticated using (gym_id = (select public.get_current_gym_id()));

drop policy if exists gym_navigation_logs_select_own_gym on public.gym_navigation_logs;
create policy gym_navigation_logs_select_own_gym on public.gym_navigation_logs
  for select to authenticated using (gym_id = (select public.get_current_gym_id()));

drop policy if exists gym_performance_logs_select_own_gym on public.gym_performance_logs;
create policy gym_performance_logs_select_own_gym on public.gym_performance_logs
  for select to authenticated using (gym_id = (select public.get_current_gym_id()));

drop policy if exists gym_sessions_select_own_gym on public.gym_sessions;
create policy gym_sessions_select_own_gym on public.gym_sessions
  for select to authenticated using (gym_id = (select public.get_current_gym_id()));

drop policy if exists gym_sessions_update_own_gym on public.gym_sessions;
create policy gym_sessions_update_own_gym on public.gym_sessions
  for update to authenticated
  using (gym_id = (select public.get_current_gym_id()))
  with check (gym_id = (select public.get_current_gym_id()));

-- ---------------------------------------------------------------------
-- 7. system_notifications - RLS was OFF (anyone could read)
--    Written only by server-side jobs (postgres), not used by the app.
-- ---------------------------------------------------------------------
alter table public.system_notifications enable row level security;
revoke all on public.system_notifications from anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. Functions that bypassed security
-- ---------------------------------------------------------------------
-- create_member_with_payment: ran as owner with caller-supplied gym id.
-- Now runs as the caller, so the per-gym insert policies apply.
alter function public.create_member_with_payment(uuid,text,text,text,text,text,text,text,date,text,numeric,text) security invoker;
alter function public.create_member_with_payment(uuid,text,text,text,text,text,text,text,date,text,numeric,text,uuid) security invoker;
alter function public.create_member_with_payment(uuid,text,text,text,text,text,text,text,date,text,numeric,text,uuid,date) security invoker;
revoke all on function public.create_member_with_payment(uuid,text,text,text,text,text,text,text,date,text,numeric,text) from public, anon;
revoke all on function public.create_member_with_payment(uuid,text,text,text,text,text,text,text,date,text,numeric,text,uuid) from public, anon;
revoke all on function public.create_member_with_payment(uuid,text,text,text,text,text,text,text,date,text,numeric,text,uuid,date) from public, anon;
grant execute on function public.create_member_with_payment(uuid,text,text,text,text,text,text,text,date,text,numeric,text) to authenticated, service_role;
grant execute on function public.create_member_with_payment(uuid,text,text,text,text,text,text,text,date,text,numeric,text,uuid) to authenticated, service_role;
grant execute on function public.create_member_with_payment(uuid,text,text,text,text,text,text,text,date,text,numeric,text,uuid,date) to authenticated, service_role;

-- get_debug_stats: any caller could read stats of any gym.
alter function public.get_debug_stats(uuid,integer) security invoker;
revoke all on function public.get_debug_stats(uuid,integer) from public, anon;
grant execute on function public.get_debug_stats(uuid,integer) to authenticated, service_role;

-- clean_old_debug_logs: anyone could wipe every gym's logs.
revoke all on function public.clean_old_debug_logs(integer) from public, anon, authenticated;
grant execute on function public.clean_old_debug_logs(integer) to service_role;

-- demo helpers: no longer referenced by policies.
revoke all on function public.is_demo_gym(uuid) from public, anon;
revoke all on function public.is_gym_protected(uuid) from public, anon;
grant execute on function public.is_demo_gym(uuid) to authenticated, service_role;
grant execute on function public.is_gym_protected(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 9. Storage (images bucket). Bucket stays public so existing photo
--    URLs keep working, but listing/browsing files and anonymous
--    uploads are removed.
-- ---------------------------------------------------------------------
drop policy if exists "Allow public read access to images" on storage.objects;
drop policy if exists "Allow service uploads to images" on storage.objects;
create policy "Gym-scoped read of images" on storage.objects
  for select to authenticated
  using (bucket_id = 'images' and name like '%' || (select public.get_current_gym_id())::text || '%');
create policy "Gym-scoped update of images" on storage.objects
  for update to authenticated
  using (bucket_id = 'images' and name like '%' || (select public.get_current_gym_id())::text || '%')
  with check (bucket_id = 'images' and name like '%' || (select public.get_current_gym_id())::text || '%');

-- ---------------------------------------------------------------------
-- 10. Defence in depth: anonymous role gets NO table access except
--     inserting pre-login telemetry. Also for future tables.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant insert on public.gym_api_logs, public.gym_audit_logs, public.gym_click_logs,
                public.gym_error_logs, public.gym_navigation_logs,
                public.gym_performance_logs, public.gym_sessions to anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;

commit;
