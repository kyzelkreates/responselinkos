-- ============================================================
-- ResponseLink OS™ — RLS Policies
-- supabase/rls-policies.sql
--
-- ResponseLink OS™
-- AI-Assisted Community Welfare & Mobile Response Platform
-- Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
--
-- Run 11 — Complete Supabase Backend SQL + RLS + Realtime
--
-- ⚠ EXECUTION ORDER: Run AFTER supabase/schema.sql
--
-- ⚠ RLS STATUS: ENABLED FOR ALL PRIVATE PRODUCTION TABLES
--
-- ⚠ HUMAN REVIEW REQUIRED:
--   All escalation and safeguarding decisions must be reviewed
--   by a human supervisor. These policies enforce data isolation
--   but do NOT automate welfare decisions.
--
-- ⚠ EXECUTION STATUS:
--   SQL setup pack PREPARED but NOT EXECUTED.
--   Run in Supabase SQL Editor after schema.sql.
-- ============================================================


-- ============================================================
-- 8. RLS ENABLE STATEMENTS
-- ============================================================
-- ⚠ ALL private production tables must have RLS enabled.

alter table public.organisations        enable row level security;
alter table public.profiles             enable row level security;
alter table public.organisation_members enable row level security;
alter table public.service_users        enable row level security;
alter table public.responders           enable row level security;
alter table public.missions             enable row level security;
alter table public.mission_assignments  enable row level security;
alter table public.responder_status     enable row level security;
alter table public.service_user_status  enable row level security;
alter table public.check_ins            enable row level security;
alter table public.help_signals         enable row level security;
alter table public.incidents            enable row level security;
alter table public.evidence_items       enable row level security;
alter table public.escalation_events    enable row level security;
alter table public.ai_reviews           enable row level security;
alter table public.reports              enable row level security;
alter table public.offline_sync_queue   enable row level security;
alter table public.backend_config_audit enable row level security;
alter table public.activity_log         enable row level security;
alter table public.notification_events  enable row level security;


-- ============================================================
-- 9. RLS POLICIES
-- ============================================================

-- ── Convenience: drop + recreate helper ──────────────────────
-- Run each policy block idempotently.


-- ── organisations ────────────────────────────────────────────

-- Members can read their own organisation
drop policy if exists "org_members_select" on public.organisations;
create policy "org_members_select"
  on public.organisations for select
  to authenticated
  using ( id in (select public.current_user_org_ids()) );

-- Owners/admins can update their organisation
drop policy if exists "org_admin_update" on public.organisations;
create policy "org_admin_update"
  on public.organisations for update
  to authenticated
  using ( public.has_org_role(id, array['owner','admin']) );

-- Owners can delete their organisation
drop policy if exists "org_owner_delete" on public.organisations;
create policy "org_owner_delete"
  on public.organisations for delete
  to authenticated
  using ( public.has_org_role(id, array['owner']) );

-- No anon access
-- (RLS enabled with no anon policy = anon blocked by default)


-- ── profiles ──────────────────────────────────────────────────

-- Users can read their own profile
drop policy if exists "profiles_own_select" on public.profiles;
create policy "profiles_own_select"
  on public.profiles for select
  to authenticated
  using ( id = auth.uid() );

-- Org admins/coordinators can read profiles of org members
drop policy if exists "profiles_org_select" on public.profiles;
create policy "profiles_org_select"
  on public.profiles for select
  to authenticated
  using (
    id in (
      select user_id from public.organisation_members
      where organisation_id in (select public.current_user_org_ids())
        and status = 'active'
    )
  );

-- Users can update their own profile
drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update"
  on public.profiles for update
  to authenticated
  using ( id = auth.uid() );

-- Profiles are auto-created by trigger — no manual insert policy needed for users
-- Admins can create profiles for invited users
drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
  on public.profiles for insert
  to authenticated
  with check ( id = auth.uid() );  -- only insert own profile


-- ── organisation_members ──────────────────────────────────────

-- Members can read membership for their orgs
drop policy if exists "org_members_read" on public.organisation_members;
create policy "org_members_read"
  on public.organisation_members for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    or user_id = auth.uid()
  );

-- Owners/admins can insert members
drop policy if exists "org_members_insert" on public.organisation_members;
create policy "org_members_insert"
  on public.organisation_members for insert
  to authenticated
  with check (
    public.has_org_role(organisation_id, array['owner','admin'])
  );

-- Owners/admins can update members
drop policy if exists "org_members_update" on public.organisation_members;
create policy "org_members_update"
  on public.organisation_members for update
  to authenticated
  using (
    public.has_org_role(organisation_id, array['owner','admin'])
  );

-- Owners/admins can remove members
drop policy if exists "org_members_delete" on public.organisation_members;
create policy "org_members_delete"
  on public.organisation_members for delete
  to authenticated
  using (
    public.has_org_role(organisation_id, array['owner','admin'])
    or user_id = auth.uid()  -- users can remove themselves
  );


-- ── service_users ─────────────────────────────────────────────

-- Coordinators/supervisors/admins can read all service users in their org
drop policy if exists "su_staff_select" on public.service_users;
create policy "su_staff_select"
  on public.service_users for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and public.has_org_role(organisation_id,
          array['owner','admin','coordinator','supervisor'])
    and demo_record = false
  );

-- Service users can read only their own record
drop policy if exists "su_own_select" on public.service_users;
create policy "su_own_select"
  on public.service_users for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    and demo_record = false
  );

-- Responders can read service users linked to their assigned missions
drop policy if exists "su_responder_select" on public.service_users;
create policy "su_responder_select"
  on public.service_users for select
  to authenticated
  using (
    id in (
      select m.service_user_id from public.missions m
      join public.responders r on r.id = m.assigned_to
      where r.user_id = auth.uid()
        and m.service_user_id is not null
    )
    and demo_record = false
  );

-- Coordinators/admins can insert/update service users
drop policy if exists "su_staff_insert" on public.service_users;
create policy "su_staff_insert"
  on public.service_users for insert
  to authenticated
  with check (
    public.has_org_role(organisation_id,
      array['owner','admin','coordinator','supervisor'])
    and demo_record = false
  );

drop policy if exists "su_staff_update" on public.service_users;
create policy "su_staff_update"
  on public.service_users for update
  to authenticated
  using (
    public.has_org_role(organisation_id,
      array['owner','admin','coordinator','supervisor'])
  );


-- ── responders ────────────────────────────────────────────────

-- Staff can read responders in their org
drop policy if exists "resp_staff_select" on public.responders;
create policy "resp_staff_select"
  on public.responders for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and demo_record = false
  );

-- Responders can read their own record
drop policy if exists "resp_own_select" on public.responders;
create policy "resp_own_select"
  on public.responders for select
  to authenticated
  using (
    user_id = auth.uid()
    and demo_record = false
  );

-- Coordinators/admins can insert/update responders
drop policy if exists "resp_staff_insert" on public.responders;
create policy "resp_staff_insert"
  on public.responders for insert
  to authenticated
  with check (
    public.has_org_role(organisation_id,
      array['owner','admin','coordinator','supervisor'])
  );

drop policy if exists "resp_staff_update" on public.responders;
create policy "resp_staff_update"
  on public.responders for update
  to authenticated
  using (
    public.has_org_role(organisation_id,
      array['owner','admin','coordinator','supervisor'])
    or user_id = auth.uid()  -- responders can update own location/status
  );


-- ── missions ──────────────────────────────────────────────────

-- Coordinators/supervisors/admins can read all org missions
drop policy if exists "missions_staff_select" on public.missions;
create policy "missions_staff_select"
  on public.missions for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and public.has_org_role(organisation_id,
          array['owner','admin','coordinator','supervisor','viewer'])
    and demo_record = false
  );

-- Responders can read only their assigned missions
drop policy if exists "missions_responder_select" on public.missions;
create policy "missions_responder_select"
  on public.missions for select
  to authenticated
  using (
    public.is_assigned_responder(id)
    and demo_record = false
  );

-- Coordinators/admins can create missions
drop policy if exists "missions_staff_insert" on public.missions;
create policy "missions_staff_insert"
  on public.missions for insert
  to authenticated
  with check (
    public.has_org_role(organisation_id,
      array['owner','admin','coordinator','supervisor'])
    and demo_record = false
  );

-- Coordinators/admins can update missions; responders can update status for assigned missions
drop policy if exists "missions_update" on public.missions;
create policy "missions_update"
  on public.missions for update
  to authenticated
  using (
    (
      public.has_org_role(organisation_id,
        array['owner','admin','coordinator','supervisor'])
    ) or (
      public.is_assigned_responder(id)
    )
  );


-- ── mission_assignments ───────────────────────────────────────

drop policy if exists "ma_staff_select" on public.mission_assignments;
create policy "ma_staff_select"
  on public.mission_assignments for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and demo_record = false
  );

drop policy if exists "ma_staff_insert" on public.mission_assignments;
create policy "ma_staff_insert"
  on public.mission_assignments for insert
  to authenticated
  with check (
    public.has_org_role(organisation_id,
      array['owner','admin','coordinator','supervisor'])
  );


-- ── responder_status ──────────────────────────────────────────

drop policy if exists "rs_staff_select" on public.responder_status;
create policy "rs_staff_select"
  on public.responder_status for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and public.has_org_role(organisation_id,
          array['owner','admin','coordinator','supervisor','viewer'])
  );

drop policy if exists "rs_responder_select" on public.responder_status;
create policy "rs_responder_select"
  on public.responder_status for select
  to authenticated
  using ( responder_id in (
    select id from public.responders where user_id = auth.uid()
  ));

drop policy if exists "rs_upsert" on public.responder_status;
create policy "rs_upsert"
  on public.responder_status for all
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and (
      public.has_org_role(organisation_id, array['owner','admin','coordinator','supervisor'])
      or responder_id in (select id from public.responders where user_id = auth.uid())
    )
  );


-- ── service_user_status ───────────────────────────────────────

drop policy if exists "sus_staff_select" on public.service_user_status;
create policy "sus_staff_select"
  on public.service_user_status for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and public.has_org_role(organisation_id,
          array['owner','admin','coordinator','supervisor','viewer'])
  );

drop policy if exists "sus_own_select" on public.service_user_status;
create policy "sus_own_select"
  on public.service_user_status for select
  to authenticated
  using ( public.is_own_service_user(service_user_id) );

drop policy if exists "sus_upsert" on public.service_user_status;
create policy "sus_upsert"
  on public.service_user_status for all
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and (
      public.has_org_role(organisation_id, array['owner','admin','coordinator','supervisor'])
      or public.is_own_service_user(service_user_id)
    )
  );


-- ── check_ins ─────────────────────────────────────────────────

drop policy if exists "ci_staff_select" on public.check_ins;
create policy "ci_staff_select"
  on public.check_ins for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and public.has_org_role(organisation_id,
          array['owner','admin','coordinator','supervisor','viewer'])
    and demo_record = false
  );

-- Responders can read check-ins for their assigned missions
drop policy if exists "ci_responder_select" on public.check_ins;
create policy "ci_responder_select"
  on public.check_ins for select
  to authenticated
  using (
    responder_id in (select id from public.responders where user_id = auth.uid())
    and demo_record = false
  );

-- Service users can read their own check-ins
drop policy if exists "ci_su_select" on public.check_ins;
create policy "ci_su_select"
  on public.check_ins for select
  to authenticated
  using (
    public.is_own_service_user(service_user_id)
    and demo_record = false
  );

drop policy if exists "ci_insert" on public.check_ins;
create policy "ci_insert"
  on public.check_ins for insert
  to authenticated
  with check (
    organisation_id in (select public.current_user_org_ids())
    and demo_record = false
  );


-- ── help_signals ──────────────────────────────────────────────

-- Staff can read all help signals for their org
drop policy if exists "hs_staff_select" on public.help_signals;
create policy "hs_staff_select"
  on public.help_signals for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and public.has_org_role(organisation_id,
          array['owner','admin','coordinator','supervisor','viewer'])
    and demo_record = false
  );

-- Service users can read only their own help signals
drop policy if exists "hs_own_select" on public.help_signals;
create policy "hs_own_select"
  on public.help_signals for select
  to authenticated
  using (
    public.is_own_service_user(service_user_id)
    and demo_record = false
  );

-- Service users can create their own help signals
drop policy if exists "hs_su_insert" on public.help_signals;
create policy "hs_su_insert"
  on public.help_signals for insert
  to authenticated
  with check (
    public.is_own_service_user(service_user_id)
    and demo_record = false
  );

-- Staff can update (review/resolve) help signals
drop policy if exists "hs_staff_update" on public.help_signals;
create policy "hs_staff_update"
  on public.help_signals for update
  to authenticated
  using (
    public.has_org_role(organisation_id,
      array['owner','admin','coordinator','supervisor'])
  );


-- ── incidents ─────────────────────────────────────────────────

drop policy if exists "inc_staff_select" on public.incidents;
create policy "inc_staff_select"
  on public.incidents for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and public.has_org_role(organisation_id,
          array['owner','admin','coordinator','supervisor','viewer'])
    and demo_record = false
  );

drop policy if exists "inc_responder_select" on public.incidents;
create policy "inc_responder_select"
  on public.incidents for select
  to authenticated
  using (
    responder_id in (select id from public.responders where user_id = auth.uid())
    and demo_record = false
  );

drop policy if exists "inc_insert" on public.incidents;
create policy "inc_insert"
  on public.incidents for insert
  to authenticated
  with check (
    organisation_id in (select public.current_user_org_ids())
    and demo_record = false
  );

drop policy if exists "inc_staff_update" on public.incidents;
create policy "inc_staff_update"
  on public.incidents for update
  to authenticated
  using (
    public.has_org_role(organisation_id,
      array['owner','admin','coordinator','supervisor'])
  );


-- ── evidence_items ────────────────────────────────────────────

drop policy if exists "ev_staff_select" on public.evidence_items;
create policy "ev_staff_select"
  on public.evidence_items for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and public.has_org_role(organisation_id,
          array['owner','admin','coordinator','supervisor','viewer'])
    and demo_record = false
  );

drop policy if exists "ev_insert" on public.evidence_items;
create policy "ev_insert"
  on public.evidence_items for insert
  to authenticated
  with check (
    organisation_id in (select public.current_user_org_ids())
    and demo_record = false
  );


-- ── escalation_events ────────────────────────────────────────
-- ⚠ Supervisors/admins only — human review required

drop policy if exists "esc_supervisor_select" on public.escalation_events;
create policy "esc_supervisor_select"
  on public.escalation_events for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and public.has_org_role(organisation_id,
          array['owner','admin','coordinator','supervisor'])
    and demo_record = false
  );

drop policy if exists "esc_insert" on public.escalation_events;
create policy "esc_insert"
  on public.escalation_events for insert
  to authenticated
  with check (
    organisation_id in (select public.current_user_org_ids())
    and demo_record = false
  );

drop policy if exists "esc_supervisor_update" on public.escalation_events;
create policy "esc_supervisor_update"
  on public.escalation_events for update
  to authenticated
  using (
    public.has_org_role(organisation_id,
      array['owner','admin','coordinator','supervisor'])
  );


-- ── ai_reviews ────────────────────────────────────────────────

drop policy if exists "ai_staff_select" on public.ai_reviews;
create policy "ai_staff_select"
  on public.ai_reviews for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and demo_record = false
  );

drop policy if exists "ai_insert" on public.ai_reviews;
create policy "ai_insert"
  on public.ai_reviews for insert
  to authenticated
  with check (
    organisation_id in (select public.current_user_org_ids())
    and demo_record = false
  );


-- ── reports ───────────────────────────────────────────────────

drop policy if exists "rep_staff_select" on public.reports;
create policy "rep_staff_select"
  on public.reports for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and public.has_org_role(organisation_id,
          array['owner','admin','coordinator','supervisor','viewer'])
    and demo_record = false
  );

drop policy if exists "rep_staff_insert" on public.reports;
create policy "rep_staff_insert"
  on public.reports for insert
  to authenticated
  with check (
    public.has_org_role(organisation_id,
      array['owner','admin','coordinator','supervisor'])
    and demo_record = false
  );

drop policy if exists "rep_staff_update" on public.reports;
create policy "rep_staff_update"
  on public.reports for update
  to authenticated
  using (
    public.has_org_role(organisation_id,
      array['owner','admin','coordinator','supervisor'])
  );


-- ── offline_sync_queue ────────────────────────────────────────

drop policy if exists "sq_own_select" on public.offline_sync_queue;
create policy "sq_own_select"
  on public.offline_sync_queue for select
  to authenticated
  using (
    user_id = auth.uid()
    and demo_record = false
  );

-- Admins can view all queue items for their org
drop policy if exists "sq_admin_select" on public.offline_sync_queue;
create policy "sq_admin_select"
  on public.offline_sync_queue for select
  to authenticated
  using (
    public.has_org_role(organisation_id, array['owner','admin'])
    and demo_record = false
  );

drop policy if exists "sq_own_insert" on public.offline_sync_queue;
create policy "sq_own_insert"
  on public.offline_sync_queue for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and demo_record = false
  );

drop policy if exists "sq_own_update" on public.offline_sync_queue;
create policy "sq_own_update"
  on public.offline_sync_queue for update
  to authenticated
  using ( user_id = auth.uid() );


-- ── backend_config_audit ──────────────────────────────────────

drop policy if exists "bca_admin_select" on public.backend_config_audit;
create policy "bca_admin_select"
  on public.backend_config_audit for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and public.has_org_role(organisation_id, array['owner','admin'])
  );

drop policy if exists "bca_admin_insert" on public.backend_config_audit;
create policy "bca_admin_insert"
  on public.backend_config_audit for insert
  to authenticated
  with check (
    public.has_org_role(organisation_id, array['owner','admin'])
  );


-- ── activity_log ──────────────────────────────────────────────
-- Append-only. Admins/coordinators read.

drop policy if exists "al_staff_select" on public.activity_log;
create policy "al_staff_select"
  on public.activity_log for select
  to authenticated
  using (
    organisation_id in (select public.current_user_org_ids())
    and public.has_org_role(organisation_id,
          array['owner','admin','coordinator','supervisor'])
  );

drop policy if exists "al_insert" on public.activity_log;
create policy "al_insert"
  on public.activity_log for insert
  to authenticated
  with check (
    organisation_id in (select public.current_user_org_ids())
  );

-- No update/delete on activity_log — append only.


-- ── notification_events ───────────────────────────────────────

drop policy if exists "notif_own_select" on public.notification_events;
create policy "notif_own_select"
  on public.notification_events for select
  to authenticated
  using (
    target_user_id = auth.uid()
    and demo_record = false
  );

drop policy if exists "notif_own_update" on public.notification_events;
create policy "notif_own_update"
  on public.notification_events for update
  to authenticated
  using ( target_user_id = auth.uid() );  -- for marking as read

drop policy if exists "notif_staff_insert" on public.notification_events;
create policy "notif_staff_insert"
  on public.notification_events for insert
  to authenticated
  with check (
    organisation_id in (select public.current_user_org_ids())
    and demo_record = false
  );
