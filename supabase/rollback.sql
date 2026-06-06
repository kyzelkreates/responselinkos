-- ============================================================
-- ResponseLink OS™ — Rollback SQL
-- supabase/rollback.sql
--
-- ResponseLink OS™
-- AI-Assisted Community Welfare & Mobile Response Platform
-- Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
--
-- Run 11 — Complete Supabase Backend SQL + RLS + Realtime
--
-- ⚠ WARNING — DESTRUCTIVE OPERATION
--   Running this SQL will DROP all ResponseLink OS™ tables,
--   functions, triggers, enums, and policies.
--   ALL DATA WILL BE PERMANENTLY LOST.
--
-- ⚠ DO NOT RUN IN PRODUCTION unless you intend to fully
--   remove the ResponseLink OS™ schema.
--
-- ⚠ BACKUP FIRST:
--   Use Supabase Dashboard → Settings → Database → Backups
--   to create a manual backup before rolling back.
--
-- ⚠ EXECUTION STATUS:
--   NOT EXECUTED — manual run only.
-- ============================================================


-- ============================================================
-- ROLLBACK STEP 1: Remove realtime publication tables
-- ============================================================

-- NOTE: If these tables don't exist or are not in the publication,
-- these commands will error — that is safe to ignore.

do $$ begin
  alter publication supabase_realtime drop table if exists public.missions;
  alter publication supabase_realtime drop table if exists public.mission_assignments;
  alter publication supabase_realtime drop table if exists public.responder_status;
  alter publication supabase_realtime drop table if exists public.service_user_status;
  alter publication supabase_realtime drop table if exists public.check_ins;
  alter publication supabase_realtime drop table if exists public.help_signals;
  alter publication supabase_realtime drop table if exists public.incidents;
  alter publication supabase_realtime drop table if exists public.evidence_items;
  alter publication supabase_realtime drop table if exists public.escalation_events;
  alter publication supabase_realtime drop table if exists public.ai_reviews;
  alter publication supabase_realtime drop table if exists public.reports;
  alter publication supabase_realtime drop table if exists public.notification_events;
exception when others then null;
end $$;


-- ============================================================
-- ROLLBACK STEP 2: Drop RLS policies (auto-dropped with tables)
-- ============================================================
-- RLS policies are dropped automatically when their tables are dropped.
-- No manual policy drop needed.


-- ============================================================
-- ROLLBACK STEP 3: Drop triggers
-- ============================================================

drop trigger if exists trg_on_auth_user_created            on auth.users;
drop trigger if exists trg_organisations_touch_updated_at  on public.organisations;
drop trigger if exists trg_profiles_touch_updated_at       on public.profiles;
drop trigger if exists trg_organisation_members_touch_updated_at on public.organisation_members;
drop trigger if exists trg_service_users_touch_updated_at  on public.service_users;
drop trigger if exists trg_responders_touch_updated_at     on public.responders;
drop trigger if exists trg_missions_touch_updated_at       on public.missions;
drop trigger if exists trg_mission_assignments_touch_updated_at on public.mission_assignments;
drop trigger if exists trg_check_ins_touch_updated_at      on public.check_ins;
drop trigger if exists trg_help_signals_touch_updated_at   on public.help_signals;
drop trigger if exists trg_incidents_touch_updated_at      on public.incidents;
drop trigger if exists trg_evidence_items_touch_updated_at on public.evidence_items;
drop trigger if exists trg_escalation_events_touch_updated_at on public.escalation_events;
drop trigger if exists trg_reports_touch_updated_at        on public.reports;
drop trigger if exists trg_offline_sync_queue_touch_updated_at on public.offline_sync_queue;
drop trigger if exists trg_backend_config_audit_touch_updated_at on public.backend_config_audit;
drop trigger if exists trg_notification_events_touch_updated_at on public.notification_events;
drop trigger if exists trg_responder_status_updated_at     on public.responder_status;
drop trigger if exists trg_su_status_updated_at            on public.service_user_status;


-- ============================================================
-- ROLLBACK STEP 4: Drop tables (dependency-safe order)
-- ============================================================
-- Drop child tables before parent tables.

drop table if exists public.offline_sync_queue   cascade;
drop table if exists public.backend_config_audit cascade;
drop table if exists public.activity_log         cascade;
drop table if exists public.notification_events  cascade;
drop table if exists public.ai_reviews           cascade;
drop table if exists public.reports              cascade;
drop table if exists public.escalation_events    cascade;
drop table if exists public.evidence_items       cascade;
drop table if exists public.incidents            cascade;
drop table if exists public.help_signals         cascade;
drop table if exists public.check_ins            cascade;
drop table if exists public.service_user_status  cascade;
drop table if exists public.responder_status     cascade;
drop table if exists public.mission_assignments  cascade;
drop table if exists public.missions             cascade;
drop table if exists public.responders           cascade;
drop table if exists public.service_users        cascade;
drop table if exists public.organisation_members cascade;
drop table if exists public.profiles             cascade;
drop table if exists public.organisations        cascade;


-- ============================================================
-- ROLLBACK STEP 5: Drop functions
-- ============================================================

drop function if exists public.current_user_profile_id()    cascade;
drop function if exists public.current_user_org_ids()       cascade;
drop function if exists public.current_user_role_for_org(uuid) cascade;
drop function if exists public.is_org_member(uuid)          cascade;
drop function if exists public.has_org_role(uuid, text[])   cascade;
drop function if exists public.is_assigned_responder(uuid)  cascade;
drop function if exists public.is_own_service_user(uuid)    cascade;
drop function if exists public.touch_updated_at()           cascade;
drop function if exists public.touch_status_updated_at()    cascade;
drop function if exists public.handle_new_user()            cascade;


-- ============================================================
-- ROLLBACK STEP 6: Drop enums
-- ============================================================

drop type if exists public.org_type_enum        cascade;
drop type if exists public.member_role_enum     cascade;
drop type if exists public.status_enum          cascade;
drop type if exists public.mission_status_enum  cascade;
drop type if exists public.mission_type_enum    cascade;
drop type if exists public.risk_level_enum      cascade;
drop type if exists public.responder_status_enum cascade;
drop type if exists public.su_status_enum       cascade;
drop type if exists public.severity_enum        cascade;
drop type if exists public.sync_action_enum     cascade;
drop type if exists public.sync_status_enum     cascade;


-- ============================================================
-- ROLLBACK STEP 7: Storage cleanup (manual)
-- ============================================================
-- Storage buckets must be emptied and deleted via Supabase Dashboard
-- or using the Storage API. SQL cannot delete non-empty buckets.
--
-- Manual steps:
--   1. Supabase Dashboard → Storage
--   2. Open 'evidence-items' → select all → delete
--   3. Open 'report-exports' → select all → delete
--   4. Open 'organisation-assets' → select all → delete
--   5. Delete each bucket from the Buckets list
--
-- Or via SQL (only works if buckets are empty):
-- delete from storage.objects where bucket_id in ('evidence-items','report-exports','organisation-assets');
-- delete from storage.buckets where id in ('evidence-items','report-exports','organisation-assets');


-- ============================================================
-- ROLLBACK STEP 8: Verification — confirm tables are gone
-- ============================================================

select count(*) as remaining_rl_tables
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'organisations','profiles','organisation_members',
    'service_users','responders','missions',
    'mission_assignments','responder_status',
    'service_user_status','check_ins','help_signals',
    'incidents','evidence_items','escalation_events',
    'ai_reviews','reports','offline_sync_queue',
    'backend_config_audit','activity_log','notification_events'
  );
-- Expected: 0

-- ============================================================
-- END OF ROLLBACK
-- ============================================================
