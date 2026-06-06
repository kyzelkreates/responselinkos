-- =============================================================
-- ResponseLink OS™ — Supabase Starter Schema
-- docs/supabase-starter-schema.sql
--
-- ResponseLink OS™
-- AI-Assisted Community Welfare & Mobile Response Platform
-- Powered by 4P3X Intelligent AI™ · Created by Kyzel Kreates™
--
-- Run 9 — Backend-Ready Live Mode, API Config, Final MVP
--
-- ⚠ IMPORTANT NOTICES:
--   1. This is a STARTER SCHEMA for planning and setup.
--   2. RLS MUST BE ENABLED FOR ALL TABLES IN LIVE PRODUCTION.
--   3. Review and customise all policies before production use.
--   4. Do NOT use service_role keys in frontend code — ever.
--   5. Only SUPABASE_ANON_KEY is safe for frontend use.
--   6. This file is safe to commit — it contains no secrets.
--   7. Run this in Supabase SQL Editor, not from the frontend.
--
-- EXECUTION ORDER:
--   1. Extensions
--   2. Tables
--   3. Indexes
--   4. Functions
--   5. Triggers
--   6. RLS enable statements
--   7. Starter policies
--   8. Verification queries
-- =============================================================


-- =============================================================
-- 1. EXTENSIONS
-- =============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";  -- for text search


-- =============================================================
-- 2. TABLES
-- =============================================================

-- ── organisations ─────────────────────────────────────────────
create table if not exists organisations (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  type         text default 'charity',   -- charity | council | ngo | care_provider | other
  contact_email text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  demo_record  boolean default false
);

-- ── users (staff — supervisors, coordinators, admins) ─────────
-- Note: Supabase Auth handles actual authentication.
-- This table stores profile data linked to auth.users.
create table if not exists users (
  id           uuid primary key references auth.users(id) on delete cascade,
  org_id       uuid references organisations(id) on delete cascade,
  full_name    text,
  role         text default 'coordinator', -- admin | supervisor | coordinator | viewer
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  demo_record  boolean default false
);

-- ── service_users ─────────────────────────────────────────────
create table if not exists service_users (
  id             uuid primary key default uuid_generate_v4(),
  org_id         uuid references organisations(id) on delete cascade,
  full_name      text not null,
  reference      text unique,  -- internal ref number
  risk_level     text default 'low',  -- low | medium | high | critical
  status         text default 'active',  -- active | inactive | archived
  notes          text,
  last_seen_at   timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  demo_record    boolean default false
);

-- ── responders ────────────────────────────────────────────────
create table if not exists responders (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid references organisations(id) on delete cascade,
  user_id          uuid references auth.users(id) on delete set null,
  full_name        text not null,
  status           text default 'available', -- available | on_mission | off_duty | unavailable
  current_location jsonb,  -- { lat, lng, timestamp }
  phone            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  demo_record      boolean default false
);

-- ── missions ──────────────────────────────────────────────────
create table if not exists missions (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid references organisations(id) on delete cascade,
  title           text not null,
  type            text default 'welfare_check',
  -- Types: welfare_check | outreach | crisis_response | admin | follow_up | supply_delivery
  status          text default 'assigned',
  -- Status flow: assigned → travelling → arrived → in_progress → completed | cancelled
  risk_level      text default 'low',       -- low | medium | high | critical
  priority        text default 'standard',  -- low | standard | high | urgent
  service_user_id uuid references service_users(id) on delete set null,
  assigned_to     uuid references responders(id) on delete set null,
  location        jsonb,   -- { address, lat, lng }
  notes           text,
  scheduled_at    timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  demo_record     boolean default false
);

-- ── mission_assignments ────────────────────────────────────────
create table if not exists mission_assignments (
  id            uuid primary key default uuid_generate_v4(),
  mission_id    uuid references missions(id) on delete cascade,
  responder_id  uuid references responders(id) on delete cascade,
  assigned_at   timestamptz default now(),
  status        text default 'active',  -- active | completed | cancelled
  demo_record   boolean default false
);

-- ── check_ins ─────────────────────────────────────────────────
create table if not exists check_ins (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid references organisations(id) on delete cascade,
  responder_id  uuid references responders(id) on delete cascade,
  mission_id    uuid references missions(id) on delete set null,
  type          text default 'standard',  -- standard | welfare | safety | escalation
  status        text default 'ok',        -- ok | concern | escalated | overdue
  notes         text,
  location      jsonb,
  created_at    timestamptz default now(),
  demo_record   boolean default false
);

-- ── help_signals ──────────────────────────────────────────────
create table if not exists help_signals (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid references organisations(id) on delete cascade,
  service_user_id uuid references service_users(id) on delete cascade,
  type            text default 'check_in',  -- check_in | help_request | emergency | wellbeing
  urgency         text default 'low',       -- low | medium | high | urgent
  status          text default 'pending',   -- pending | acknowledged | resolved | escalated
  notes           text,
  reviewed_by     uuid references auth.users(id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz default now(),
  demo_record     boolean default false
);

-- ── incidents ─────────────────────────────────────────────────
create table if not exists incidents (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid references organisations(id) on delete cascade,
  mission_id      uuid references missions(id) on delete set null,
  responder_id    uuid references responders(id) on delete set null,
  service_user_id uuid references service_users(id) on delete set null,
  type            text default 'welfare_concern',
  -- Types: welfare_concern | safeguarding | near_miss | hazard | data_issue | other
  severity        text default 'medium',   -- low | medium | high | critical
  status          text default 'open',     -- open | under_review | resolved | closed
  title           text,
  description     text,
  location        jsonb,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  demo_record     boolean default false
);

-- ── evidence_items ────────────────────────────────────────────
create table if not exists evidence_items (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid references organisations(id) on delete cascade,
  incident_id uuid references incidents(id) on delete set null,
  mission_id  uuid references missions(id) on delete set null,
  type        text default 'note',  -- note | photo | audio | file | form | observation
  title       text,
  description text,
  notes       text,
  file_url    text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now(),
  demo_record boolean default false
);

-- ── escalation_events ─────────────────────────────────────────
-- ⚠ AI role is ADVISORY ONLY.
-- Human supervisor MUST review before any action is taken.
create table if not exists escalation_events (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid references organisations(id) on delete cascade,
  mission_id   uuid references missions(id) on delete set null,
  incident_id  uuid references incidents(id) on delete set null,
  raised_by    uuid references auth.users(id) on delete set null,
  reviewed_by  uuid references auth.users(id) on delete set null,
  reason       text,
  ai_summary   text,  -- 4P3X advisory note only
  status       text default 'pending_review',
  -- Statuses: pending_review | under_review | actioned | closed | dismissed
  -- NOTE: 'pending_review' means human supervisor has NOT yet reviewed.
  -- Automatic escalation actions are NOT permitted.
  reviewed_at  timestamptz,
  created_at   timestamptz default now(),
  demo_record  boolean default false
);

-- ── ai_reviews ────────────────────────────────────────────────
-- 4P3X Intelligent AI™ advisory assessments — NOT decision-making records.
-- Human review required before any action.
create table if not exists ai_reviews (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid references organisations(id) on delete cascade,
  entity_type  text,  -- mission | incident | responder | service_user
  entity_id    uuid,
  review_type  text,  -- risk | welfare | compliance | safety
  summary      text,
  risk_level   text,
  confidence   text,  -- advisory only — not a clinical/legal certainty claim
  reviewed_by  uuid references auth.users(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz default now(),
  demo_record  boolean default false
);

-- ── reports ───────────────────────────────────────────────────
create table if not exists reports (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid references organisations(id) on delete cascade,
  type         text default 'welfare',  -- welfare | incident | compliance | summary
  title        text,
  period       text,
  status       text default 'draft',   -- draft | submitted | approved | archived
  generated_by uuid references auth.users(id) on delete set null,
  content      jsonb,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  demo_record  boolean default false
);


-- =============================================================
-- 3. INDEXES
-- =============================================================

create index if not exists idx_missions_org_id        on missions(org_id);
create index if not exists idx_missions_status        on missions(status);
create index if not exists idx_missions_assigned_to   on missions(assigned_to);
create index if not exists idx_missions_demo          on missions(demo_record);
create index if not exists idx_service_users_org_id   on service_users(org_id);
create index if not exists idx_service_users_status   on service_users(status);
create index if not exists idx_responders_org_id      on responders(org_id);
create index if not exists idx_responders_status      on responders(status);
create index if not exists idx_check_ins_responder    on check_ins(responder_id);
create index if not exists idx_check_ins_mission      on check_ins(mission_id);
create index if not exists idx_help_signals_su        on help_signals(service_user_id);
create index if not exists idx_help_signals_status    on help_signals(status);
create index if not exists idx_incidents_org_id       on incidents(org_id);
create index if not exists idx_incidents_status       on incidents(status);
create index if not exists idx_escalations_status     on escalation_events(status);
create index if not exists idx_ai_reviews_entity      on ai_reviews(entity_type, entity_id);


-- =============================================================
-- 4. FUNCTIONS
-- =============================================================

-- Auto-update updated_at on row changes
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- =============================================================
-- 5. TRIGGERS
-- =============================================================

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_organisations') then
    create trigger set_updated_at_organisations before update on organisations
      for each row execute function update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_missions') then
    create trigger set_updated_at_missions before update on missions
      for each row execute function update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_incidents') then
    create trigger set_updated_at_incidents before update on incidents
      for each row execute function update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_updated_at_reports') then
    create trigger set_updated_at_reports before update on reports
      for each row execute function update_updated_at_column();
  end if;
end $$;


-- =============================================================
-- 6. RLS ENABLE STATEMENTS
-- ⚠ RLS MUST BE ENABLED FOR LIVE PRODUCTION
-- =============================================================

alter table organisations       enable row level security;
alter table users               enable row level security;
alter table service_users       enable row level security;
alter table responders          enable row level security;
alter table missions            enable row level security;
alter table mission_assignments enable row level security;
alter table check_ins           enable row level security;
alter table help_signals        enable row level security;
alter table incidents           enable row level security;
alter table evidence_items      enable row level security;
alter table escalation_events   enable row level security;
alter table ai_reviews          enable row level security;
alter table reports             enable row level security;


-- =============================================================
-- 7. STARTER POLICIES
-- ⚠ REVIEW BEFORE PRODUCTION USE
-- These are basic starter policies — customise for your org's
-- access control requirements before going live.
-- =============================================================

-- organisations: authenticated users can read their own org
create policy "Users can read own org"
  on organisations for select
  to authenticated
  using (id in (
    select org_id from users where id = auth.uid()
  ));

-- users: can read own profile and org members
create policy "Users can read own profile"
  on users for select
  to authenticated
  using (id = auth.uid() or org_id in (
    select org_id from users where id = auth.uid()
  ));

-- service_users: org-scoped read
create policy "Org members can read service users"
  on service_users for select
  to authenticated
  using (org_id in (
    select org_id from users where id = auth.uid()
  ));

-- missions: org-scoped read; exclude demo records in live queries
create policy "Org members can read missions"
  on missions for select
  to authenticated
  using (
    org_id in (select org_id from users where id = auth.uid())
    and demo_record = false
  );

-- missions: org members can insert
create policy "Org members can create missions"
  on missions for insert
  to authenticated
  with check (
    org_id in (select org_id from users where id = auth.uid())
  );

-- missions: org members can update
create policy "Org members can update missions"
  on missions for update
  to authenticated
  using (org_id in (select org_id from users where id = auth.uid()));

-- check_ins: responders can insert own check-ins
create policy "Responders can create check-ins"
  on check_ins for insert
  to authenticated
  with check (
    org_id in (select org_id from users where id = auth.uid())
  );

create policy "Org members can read check-ins"
  on check_ins for select
  to authenticated
  using (org_id in (select org_id from users where id = auth.uid()));

-- help_signals: service users can create; org members can read
create policy "Org members can read help signals"
  on help_signals for select
  to authenticated
  using (org_id in (select org_id from users where id = auth.uid()));

-- incidents: org-scoped
create policy "Org members can read incidents"
  on incidents for select
  to authenticated
  using (org_id in (select org_id from users where id = auth.uid()));

create policy "Org members can create incidents"
  on incidents for insert
  to authenticated
  with check (org_id in (select org_id from users where id = auth.uid()));

-- escalation_events: supervisors and admins only
create policy "Supervisors can read escalations"
  on escalation_events for select
  to authenticated
  using (
    org_id in (select org_id from users where id = auth.uid())
    and (select role from users where id = auth.uid()) in ('admin', 'supervisor')
  );

-- ai_reviews: org-scoped read
create policy "Org members can read AI reviews"
  on ai_reviews for select
  to authenticated
  using (org_id in (select org_id from users where id = auth.uid()));

-- reports: org-scoped
create policy "Org members can read reports"
  on reports for select
  to authenticated
  using (org_id in (select org_id from users where id = auth.uid()));


-- =============================================================
-- 8. VERIFICATION QUERIES
-- Run these after setup to verify the schema is correct.
-- =============================================================

-- List all tables
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;

-- Check RLS is enabled
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- Verify no service_role references in app code (manual check — not SQL)
-- Search your codebase for: SERVICE_ROLE_KEY, service_role
-- These must only exist in server-side code or environment secrets.


-- =============================================================
-- END OF STARTER SCHEMA
--
-- Next steps:
-- 1. Create your Supabase project
-- 2. Run this schema in Supabase SQL Editor
-- 3. Configure Auth (Email/Password or OAuth)
-- 4. Add your first organisation record
-- 5. Create the first admin user via Supabase Auth
-- 6. Enter the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in
--    ResponseLink OS™ Demo/Live Settings → Backend Configuration
-- 7. Test connection using the Test Connection button
-- 8. Switch from Demo Mode to Live Mode
--
-- ⚠ Do NOT use the service_role key in frontend code.
-- ⚠ Review and harden all RLS policies before production use.
-- ⚠ Implement a full data protection and consent process
--    before entering real personal welfare data.
--
-- ResponseLink OS™ Run 9 · Created by Kyzel Kreates™
-- Powered by 4P3X Intelligent AI™
-- =============================================================
