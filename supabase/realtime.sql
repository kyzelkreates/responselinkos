-- ============================================================
-- ResponseLink OS™ — Supabase Realtime Setup
-- supabase/realtime.sql
--
-- ResponseLink OS™
-- AI-Assisted Community Welfare & Mobile Response Platform
-- Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
--
-- Run 11 — Complete Supabase Backend SQL + RLS + Realtime
--
-- ⚠ EXECUTION ORDER: Run AFTER rls-policies.sql
--
-- ⚠ REALTIME + RLS:
--   Supabase Realtime respects Row Level Security (RLS).
--   Clients only receive INSERT/UPDATE/DELETE events for rows
--   they are authorised to SELECT.
--   The anon key + Supabase RLS is the authoritative control layer.
--   NEVER use service_role key in frontend realtime subscriptions.
--
-- ⚠ EXECUTION STATUS:
--   SQL setup pack PREPARED but NOT EXECUTED.
--   Run in Supabase SQL Editor after rls-policies.sql.
-- ============================================================


-- ============================================================
-- 10. REALTIME PUBLICATION
-- ============================================================

-- The default Supabase realtime publication is 'supabase_realtime'.
-- Add each table that needs realtime change events.

-- NOTE: If 'supabase_realtime' publication doesn't exist yet,
-- Supabase manages it automatically. These ALTER statements add
-- tables to the existing publication.

-- ── Missions — Command Dashboard + Responder PWA ─────────────
alter publication supabase_realtime add table public.missions;

-- ── Mission Assignments — Command Dashboard ───────────────────
alter publication supabase_realtime add table public.mission_assignments;

-- ── Responder Status — Command Dashboard (live map + metrics) ─
alter publication supabase_realtime add table public.responder_status;

-- ── Service User Status — Command Dashboard ───────────────────
alter publication supabase_realtime add table public.service_user_status;

-- ── Check-ins — Dashboard + Responder PWA + SU PWA ───────────
alter publication supabase_realtime add table public.check_ins;

-- ── Help Signals — Dashboard + Service User PWA ───────────────
alter publication supabase_realtime add table public.help_signals;

-- ── Incidents — Command Dashboard ────────────────────────────
alter publication supabase_realtime add table public.incidents;

-- ── Evidence Items — Dashboard + Reporting ───────────────────
alter publication supabase_realtime add table public.evidence_items;

-- ── Escalation Events — Dashboard (supervisors/admins) ────────
alter publication supabase_realtime add table public.escalation_events;

-- ── AI Reviews — Dashboard + AI Overview ─────────────────────
alter publication supabase_realtime add table public.ai_reviews;

-- ── Reports — Dashboard + Reports page ───────────────────────
alter publication supabase_realtime add table public.reports;

-- ── Notification Events — All surfaces ───────────────────────
alter publication supabase_realtime add table public.notification_events;


-- ============================================================
-- VERIFICATION: Check publication tables
-- ============================================================

-- Run this to confirm realtime is configured for your tables:
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
order by tablename;
