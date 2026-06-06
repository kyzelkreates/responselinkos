-- ============================================================
-- ResponseLink OS™ — Demo Seed Data (DISABLED)
-- supabase/seed-demo-disabled.sql
--
-- ResponseLink OS™
-- AI-Assisted Community Welfare & Mobile Response Platform
-- Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
--
-- Run 11 — Complete Supabase Backend SQL + RLS + Realtime
--
-- ⚠ WARNING — DO NOT RUN IN PRODUCTION
--   This file contains commented-out sample demo seed data only.
--   Do NOT run demo seed data in a production Supabase project
--   unless using a dedicated demo/staging project.
--
-- ⚠ DEMO DATA RULE:
--   All demo records carry demo_record = true.
--   Live queries MUST filter: WHERE demo_record = false
--   Demo data must never mix with live operational welfare data.
--
-- HOW TO USE:
--   1. Create a SEPARATE Supabase project for demos/showcases.
--   2. Uncomment the SQL blocks below.
--   3. Run in the DEMO project only.
--   4. Never run in your live production project.
-- ============================================================


-- ============================================================
-- DEMO SEED — COMMENTED OUT (do not uncomment in production)
-- ============================================================

/*

-- Demo organisation
INSERT INTO public.organisations (id, name, type, description, contact_email, status, demo_record)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'Westbridge Community Welfare Trust',
  'charity',
  'Demo organisation — sample data only. Not a real organisation.',
  'demo@responselink.os',
  'active',
  true  -- ← DEMO RECORD — never included in live queries
);

-- Demo service users
INSERT INTO public.service_users
  (id, organisation_id, full_name, risk_level, status, demo_record)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
   'Alex Thompson', 'medium', 'stable', true),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001',
   'Sarah Mitchell', 'high', 'needs_follow_up', true),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001',
   'James Okafor', 'low', 'stable', true);

-- Demo responders
INSERT INTO public.responders
  (id, organisation_id, full_name, status, demo_record)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
   'Jordan Clarke', 'available', true),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001',
   'Maria Santos', 'assigned', true);

-- Demo missions
INSERT INTO public.missions
  (id, organisation_id, title, type, status, risk_level, priority,
   service_user_id, assigned_to, demo_record)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
   'Weekly welfare check — Alex Thompson', 'welfare_check', 'assigned', 'medium', 'standard',
   'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', true),
  ('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001',
   'Urgent follow-up — Sarah Mitchell', 'follow_up_visit', 'travelling', 'high', 'urgent',
   'b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', true),
  ('d1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001',
   'Supply delivery — James Okafor', 'supply_delivery', 'assigned', 'low', 'low',
   'b1000000-0000-0000-0000-000000000003', null, true);

-- Demo help signal
INSERT INTO public.help_signals
  (id, organisation_id, service_user_id, type, urgency, status, notes, demo_record)
VALUES (
  'e1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'help_request', 'medium', 'pending',
  'Demo: Service user requested support for daily tasks.',
  true
);

-- Demo check-in
INSERT INTO public.check_ins
  (id, organisation_id, type, responder_id, mission_id, status, notes, demo_record)
VALUES (
  'f1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'standard',
  'c1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  'ok',
  'Demo: Arrived safely at service user address.',
  true
);

*/

-- ============================================================
-- LIVE QUERY FILTER REMINDER
-- ============================================================
-- All live queries MUST include: WHERE demo_record = false
-- Example:
--   SELECT * FROM public.missions WHERE demo_record = false;
--
-- RLS policies in rls-policies.sql already enforce this for
-- authenticated users. Add it to any raw SQL queries too.
-- ============================================================
