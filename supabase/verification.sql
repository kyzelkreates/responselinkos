-- ============================================================
-- ResponseLink OS™ — Verification Queries
-- supabase/verification.sql
--
-- ResponseLink OS™
-- AI-Assisted Community Welfare & Mobile Response Platform
-- Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
--
-- Run 11 — Complete Supabase Backend SQL + RLS + Realtime
--
-- PURPOSE:
--   Run these queries in Supabase SQL Editor to verify your
--   schema, RLS, realtime, and storage are configured correctly.
--
-- ⚠ EXECUTION STATUS:
--   These are READ-ONLY verification queries.
--   Safe to run at any time.
-- ============================================================


-- ============================================================
-- V1. TABLES EXIST
-- ============================================================
-- Expected: all 20 tables listed

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type   = 'BASE TABLE'
order by table_name;

-- Expected tables:
-- activity_log, ai_reviews, backend_config_audit, check_ins,
-- escalation_events, evidence_items, help_signals, incidents,
-- mission_assignments, missions, notification_events,
-- offline_sync_queue, organisation_members, organisations,
-- profiles, reports, responder_status, responders,
-- service_user_status, service_users


-- ============================================================
-- V2. RLS IS ENABLED
-- ============================================================
-- Expected: rowsecurity = true for all private tables

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'organisations','profiles','organisation_members',
    'service_users','responders','missions','mission_assignments',
    'responder_status','service_user_status','check_ins',
    'help_signals','incidents','evidence_items',
    'escalation_events','ai_reviews','reports',
    'offline_sync_queue','backend_config_audit',
    'activity_log','notification_events'
  )
order by tablename;


-- ============================================================
-- V3. POLICIES EXIST
-- ============================================================
-- Expected: multiple policies per table

select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;


-- ============================================================
-- V4. REALTIME PUBLICATION
-- ============================================================
-- Expected: all 12 realtime tables listed

select schemaname, tablename
from pg_publication_tables
where pubname    = 'supabase_realtime'
  and schemaname = 'public'
order by tablename;

-- Expected tables in publication:
-- ai_reviews, check_ins, escalation_events, evidence_items,
-- help_signals, incidents, mission_assignments, missions,
-- notification_events, reports, responder_status, service_user_status


-- ============================================================
-- V5. STORAGE BUCKETS EXIST
-- ============================================================
-- Expected: 3 buckets, all with public = false

select id, name, public, file_size_limit
from storage.buckets
where id in ('evidence-items','report-exports','organisation-assets')
order by id;


-- ============================================================
-- V6. HELPER FUNCTIONS EXIST
-- ============================================================

select routine_name, routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'current_user_profile_id',
    'current_user_org_ids',
    'current_user_role_for_org',
    'is_org_member',
    'has_org_role',
    'is_assigned_responder',
    'is_own_service_user',
    'touch_updated_at',
    'handle_new_user'
  )
order by routine_name;


-- ============================================================
-- V7. UPDATED_AT TRIGGERS EXIST
-- ============================================================

select trigger_name, event_object_table
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name   like 'trg_%'
order by event_object_table;


-- ============================================================
-- V8. AUTO-PROFILE TRIGGER EXISTS
-- ============================================================
-- Expected: trigger on auth.users

select trigger_name, event_object_schema, event_object_table
from information_schema.triggers
where trigger_name = 'trg_on_auth_user_created';


-- ============================================================
-- V9. ENUMS EXIST
-- ============================================================

select t.typname as enum_name,
       e.enumlabel as enum_value
from pg_type t
join pg_enum e on t.oid = e.enumtypid
where t.typnamespace = (select oid from pg_namespace where nspname = 'public')
order by t.typname, e.enumsortorder;


-- ============================================================
-- V10. INDEXES EXIST
-- ============================================================

select schemaname, tablename, indexname
from pg_indexes
where schemaname = 'public'
  and indexname  like 'idx_%'
order by tablename, indexname;


-- ============================================================
-- V11. RLS ISOLATION TEST (run as authenticated user)
-- ============================================================
-- These tests must be run as an authenticated user to verify RLS.
-- Replace 'test-user-id' with a real user ID from auth.users.

-- Test: Can a user see missions from another org?
-- Expected: empty result (RLS should block cross-org access)
/*
select id, title, organisation_id
from public.missions
where organisation_id not in (select public.current_user_org_ids())
  and demo_record = false;
-- Expected: 0 rows
*/

-- Test: Can anon see missions?
-- Expected: 0 rows (RLS blocks anon)
/*
-- Run as anon role (use Supabase API with anon key, no auth header)
select count(*) from public.missions;
-- Expected: 0
*/

-- Test: updated_at changes on update
/*
update public.missions
set title = title
where id = 'your-mission-id-here';

select id, title, updated_at from public.missions
where id = 'your-mission-id-here';
-- Expected: updated_at should be now()
*/


-- ============================================================
-- V12. DEMO DATA ISOLATION
-- ============================================================
-- Verify live queries return zero demo records

select count(*) as live_missions    from public.missions     where demo_record = false;
select count(*) as live_responders  from public.responders   where demo_record = false;
select count(*) as live_su          from public.service_users where demo_record = false;
select count(*) as demo_missions    from public.missions     where demo_record = true;

-- Expected after initial setup (no data yet):
--   live_missions:   0
--   live_responders: 0
--   live_su:         0
--   demo_missions:   0 (unless demo seed was run — only in demo project)


-- ============================================================
-- V13. SUMMARY HEALTH CHECK
-- ============================================================

select
  (select count(*) from public.organisations)        as organisations,
  (select count(*) from public.profiles)             as profiles,
  (select count(*) from public.organisation_members) as members,
  (select count(*) from public.responders)           as responders,
  (select count(*) from public.service_users)        as service_users,
  (select count(*) from public.missions)             as missions,
  (select count(*) from public.check_ins)            as check_ins,
  (select count(*) from public.help_signals)         as help_signals,
  (select count(*) from public.incidents)            as incidents;
