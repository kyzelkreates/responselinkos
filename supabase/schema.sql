-- ============================================================
-- ResponseLink OS™ — Supabase Schema
-- supabase/schema.sql
--
-- ResponseLink OS™
-- AI-Assisted Community Welfare & Mobile Response Platform
-- Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
--
-- Run 11 — Complete Supabase Backend SQL + RLS + Realtime
--
-- ⚠ EXECUTION ORDER:
--   1. supabase/schema.sql          ← THIS FILE
--   2. supabase/rls-policies.sql
--   3. supabase/realtime.sql
--   4. supabase/storage.sql
--
-- ⚠ SAFETY RULES:
--   - RLS MUST BE ENABLED for all private production tables.
--   - NEVER place SUPABASE_SERVICE_ROLE_KEY in frontend code.
--   - Only VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in frontend.
--   - Review RLS policies before going live with real welfare data.
--
-- ⚠ ADVISORY NOTICE:
--   ResponseLink OS™ is advisory and coordination-support software.
--   It does not replace emergency services, safeguarding professionals,
--   clinical judgement, or legal duties.
--   Escalations MUST be reviewed by a human supervisor before action.
--
-- ⚠ EXECUTION STATUS:
--   SQL setup pack PREPARED but NOT EXECUTED.
--   Run in Supabase SQL Editor in the documented order.
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "btree_gin";


-- ============================================================
-- 2. ENUMS
-- ============================================================

-- Organisation types
do $$ begin
  create type org_type_enum as enum (
    'charity', 'council', 'ngo', 'care_provider',
    'housing', 'health', 'education', 'community_group', 'other'
  );
exception when duplicate_object then null; end $$;

-- Organisation member roles
do $$ begin
  create type member_role_enum as enum (
    'owner', 'admin', 'coordinator', 'supervisor',
    'responder', 'service_user', 'viewer'
  );
exception when duplicate_object then null; end $$;

-- Membership/record status
do $$ begin
  create type status_enum as enum (
    'active', 'inactive', 'archived', 'pending', 'suspended'
  );
exception when duplicate_object then null; end $$;

-- Mission status — strict workflow order
do $$ begin
  create type mission_status_enum as enum (
    'draft', 'scheduled', 'assigned', 'travelling',
    'arrived', 'in_progress', 'check_in_due', 'overdue',
    'escalating', 'completed', 'cancelled',
    'needs_supervisor_review'
  );
exception when duplicate_object then null; end $$;

-- Mission types
do $$ begin
  create type mission_type_enum as enum (
    'welfare_check', 'outreach_visit', 'supply_delivery',
    'follow_up_visit', 'safety_check', 'incident_response',
    'volunteer_task', 'vulnerable_person_support',
    'community_support_assignment'
  );
exception when duplicate_object then null; end $$;

-- Risk levels
do $$ begin
  create type risk_level_enum as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

-- Responder availability status
do $$ begin
  create type responder_status_enum as enum (
    'available', 'assigned', 'travelling', 'arrived',
    'active_visit', 'check_in_due', 'overdue', 'escalating',
    'completed', 'offline', 'needs_supervisor_review'
  );
exception when duplicate_object then null; end $$;

-- Service user status
do $$ begin
  create type su_status_enum as enum (
    'stable', 'check_in_received', 'support_requested',
    'missed_check_in', 'visit_confirmed', 'visit_declined',
    'wellbeing_concern', 'safety_concern', 'urgent_help_requested',
    'offline', 'needs_follow_up', 'needs_supervisor_review'
  );
exception when duplicate_object then null; end $$;

-- Incident severity
do $$ begin
  create type severity_enum as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

-- Sync queue action types
do $$ begin
  create type sync_action_enum as enum (
    'create', 'update', 'delete',
    'status_change', 'check_in', 'help_signal',
    'incident_report', 'evidence_upload', 'escalation'
  );
exception when duplicate_object then null; end $$;

-- Sync status
do $$ begin
  create type sync_status_enum as enum (
    'pending', 'synced', 'failed', 'conflict',
    'needs_retry', 'supervisor_review_required'
  );
exception when duplicate_object then null; end $$;


-- ============================================================
-- 3. TABLES
-- ============================================================

-- ── 3.1 organisations ────────────────────────────────────────
-- RLS: ENABLED (see rls-policies.sql)
-- Purpose: Top-level tenant — charity, council, outreach team, care provider
create table if not exists public.organisations (
  id               uuid        primary key default gen_random_uuid(),
  name             text        not null,
  type             org_type_enum not null default 'charity',
  description      text,
  contact_email    text,
  contact_phone    text,
  website          text,
  address          text,
  postcode         text,
  country          text        default 'GB',
  logo_url         text,
  status           status_enum not null default 'active',
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid        references auth.users(id) on delete set null,
  demo_record      boolean     not null default false
);
comment on table public.organisations is
  'Top-level tenant organisations. All operational data is scoped to an org. RLS: ENABLED.';

-- ── 3.2 profiles ─────────────────────────────────────────────
-- RLS: ENABLED (see rls-policies.sql)
-- Purpose: App profile linked to Supabase auth.users
-- Supabase Auth creates the auth.users record; this table extends it.
create table if not exists public.profiles (
  id               uuid        primary key references auth.users(id) on delete cascade,
  full_name        text,
  avatar_url       text,
  phone            text,
  timezone         text        default 'Europe/London',
  notification_prefs jsonb     not null default '{}'::jsonb,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.profiles is
  'App profiles linked to Supabase auth.users. One profile per auth user. RLS: ENABLED.';

-- ── 3.3 organisation_members ──────────────────────────────────
-- RLS: ENABLED (see rls-policies.sql)
-- Purpose: Links users to organisations with a specific role.
-- A user may belong to multiple organisations.
create table if not exists public.organisation_members (
  id               uuid            primary key default gen_random_uuid(),
  organisation_id  uuid            not null references public.organisations(id) on delete cascade,
  user_id          uuid            not null references auth.users(id) on delete cascade,
  role             member_role_enum not null default 'viewer',
  status           status_enum     not null default 'active',
  invited_at       timestamptz,
  accepted_at      timestamptz,
  invited_by       uuid            references auth.users(id) on delete set null,
  metadata         jsonb           not null default '{}'::jsonb,
  created_at       timestamptz     not null default now(),
  updated_at       timestamptz     not null default now(),
  unique (organisation_id, user_id)
);
comment on table public.organisation_members is
  'Organisation membership and roles. Controls access and permissions via RLS. RLS: ENABLED.';

-- ── 3.4 service_users ─────────────────────────────────────────
-- RLS: ENABLED
-- Purpose: People receiving welfare visits, outreach, or support
create table if not exists public.service_users (
  id               uuid          primary key default gen_random_uuid(),
  organisation_id  uuid          not null references public.organisations(id) on delete cascade,
  auth_user_id     uuid          references auth.users(id) on delete set null,  -- if they have an app account
  full_name        text          not null,
  preferred_name   text,
  reference        text,          -- internal reference number
  risk_level       risk_level_enum not null default 'low',
  status           su_status_enum  not null default 'stable',
  date_of_birth    date,
  phone            text,
  email            text,
  address          text,
  postcode         text,
  notes            text,          -- internal coordinator notes (never shown in service user PWA)
  last_seen_at     timestamptz,
  metadata         jsonb         not null default '{}'::jsonb,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now(),
  created_by       uuid          references auth.users(id) on delete set null,
  updated_by       uuid          references auth.users(id) on delete set null,
  demo_record      boolean       not null default false
);
comment on table public.service_users is
  'People receiving welfare support. Staff notes never shown to service users. RLS: ENABLED.';

-- ── 3.5 responders ────────────────────────────────────────────
-- RLS: ENABLED
-- Purpose: Field responders — outreach workers, support staff
create table if not exists public.responders (
  id               uuid               primary key default gen_random_uuid(),
  organisation_id  uuid               not null references public.organisations(id) on delete cascade,
  user_id          uuid               references auth.users(id) on delete set null,
  full_name        text               not null,
  phone            text,
  email            text,
  status           responder_status_enum not null default 'available',
  current_location jsonb,             -- { lat, lng, timestamp } — not persisted long-term
  current_mission_id uuid,            -- denormalised shortcut
  last_seen_at     timestamptz,
  metadata         jsonb              not null default '{}'::jsonb,
  created_at       timestamptz        not null default now(),
  updated_at       timestamptz        not null default now(),
  created_by       uuid               references auth.users(id) on delete set null,
  updated_by       uuid               references auth.users(id) on delete set null,
  demo_record      boolean            not null default false
);
comment on table public.responders is
  'Field responders linked to auth accounts and organisations. RLS: ENABLED.';

-- ── 3.6 missions ──────────────────────────────────────────────
-- RLS: ENABLED
-- Purpose: Welfare missions, outreach tasks, support visits
-- Status flow: assigned → travelling → arrived → in_progress → completed
create table if not exists public.missions (
  id               uuid               primary key default gen_random_uuid(),
  organisation_id  uuid               not null references public.organisations(id) on delete cascade,
  title            text               not null,
  type             mission_type_enum  not null default 'welfare_check',
  status           mission_status_enum not null default 'assigned',
  risk_level       risk_level_enum    not null default 'low',
  priority         text               not null default 'standard',  -- low | standard | high | urgent
  service_user_id  uuid               references public.service_users(id) on delete set null,
  assigned_to      uuid               references public.responders(id) on delete set null,
  location         jsonb,             -- { address, lat, lng }
  notes            text,
  supervisor_notes text,              -- coordinator/supervisor notes — not shown in Responder PWA by default
  scheduled_at     timestamptz,
  started_at       timestamptz,
  completed_at     timestamptz,
  metadata         jsonb              not null default '{}'::jsonb,
  created_at       timestamptz        not null default now(),
  updated_at       timestamptz        not null default now(),
  created_by       uuid               references auth.users(id) on delete set null,
  updated_by       uuid               references auth.users(id) on delete set null,
  demo_record      boolean            not null default false
);
comment on table public.missions is
  'Welfare missions and field tasks. Status flow: assigned→travelling→arrived→in_progress→completed. RLS: ENABLED.';

-- ── 3.7 mission_assignments ───────────────────────────────────
-- RLS: ENABLED
-- Purpose: Assignment history — supports reassignment tracking
create table if not exists public.mission_assignments (
  id               uuid        primary key default gen_random_uuid(),
  organisation_id  uuid        not null references public.organisations(id) on delete cascade,
  mission_id       uuid        not null references public.missions(id) on delete cascade,
  responder_id     uuid        not null references public.responders(id) on delete cascade,
  assigned_at      timestamptz not null default now(),
  unassigned_at    timestamptz,
  status           text        not null default 'active',  -- active | completed | unassigned
  assigned_by      uuid        references auth.users(id) on delete set null,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  demo_record      boolean     not null default false
);
comment on table public.mission_assignments is
  'Assignment history for missions. Tracks responder changes. RLS: ENABLED.';

-- ── 3.8 responder_status ──────────────────────────────────────
-- RLS: ENABLED
-- Purpose: Current responder availability and field status (realtime target)
create table if not exists public.responder_status (
  id               uuid                  primary key default gen_random_uuid(),
  organisation_id  uuid                  not null references public.organisations(id) on delete cascade,
  responder_id     uuid                  not null references public.responders(id) on delete cascade,
  status           responder_status_enum not null default 'available',
  mission_id       uuid                  references public.missions(id) on delete set null,
  location         jsonb,
  battery_pct      smallint,
  last_check_in_at timestamptz,
  next_check_in_at timestamptz,
  metadata         jsonb                 not null default '{}'::jsonb,
  updated_at       timestamptz           not null default now(),
  unique (responder_id)
);
comment on table public.responder_status is
  'Current responder field status. One row per responder. Realtime enabled. RLS: ENABLED.';

-- ── 3.9 service_user_status ───────────────────────────────────
-- RLS: ENABLED
-- Purpose: Current service user check-in/welfare status (realtime target)
create table if not exists public.service_user_status (
  id               uuid          primary key default gen_random_uuid(),
  organisation_id  uuid          not null references public.organisations(id) on delete cascade,
  service_user_id  uuid          not null references public.service_users(id) on delete cascade,
  status           su_status_enum not null default 'stable',
  last_check_in_at timestamptz,
  next_check_in_at timestamptz,
  open_help_signals smallint      not null default 0,
  metadata         jsonb         not null default '{}'::jsonb,
  updated_at       timestamptz   not null default now(),
  unique (service_user_id)
);
comment on table public.service_user_status is
  'Current service user welfare status. One row per service user. Realtime enabled. RLS: ENABLED.';

-- ── 3.10 check_ins ────────────────────────────────────────────
-- RLS: ENABLED
-- Purpose: Responder and service user check-ins
create table if not exists public.check_ins (
  id               uuid        primary key default gen_random_uuid(),
  organisation_id  uuid        not null references public.organisations(id) on delete cascade,
  type             text        not null default 'standard',  -- standard | welfare | safety | escalation
  responder_id     uuid        references public.responders(id) on delete set null,
  service_user_id  uuid        references public.service_users(id) on delete set null,
  mission_id       uuid        references public.missions(id) on delete set null,
  status           text        not null default 'ok',  -- ok | concern | escalated | overdue
  notes            text,
  location         jsonb,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid        references auth.users(id) on delete set null,
  demo_record      boolean     not null default false
);
comment on table public.check_ins is
  'Responder and service user check-ins. Linked to missions and org. RLS: ENABLED.';

-- ── 3.11 help_signals ─────────────────────────────────────────
-- RLS: ENABLED
-- Purpose: Service user help requests / support signals
create table if not exists public.help_signals (
  id               uuid        primary key default gen_random_uuid(),
  organisation_id  uuid        not null references public.organisations(id) on delete cascade,
  service_user_id  uuid        not null references public.service_users(id) on delete cascade,
  type             text        not null default 'check_in',  -- check_in | help_request | emergency | wellbeing
  urgency          text        not null default 'low',        -- low | medium | high | urgent
  status           text        not null default 'pending',    -- pending | acknowledged | resolved | escalated
  notes            text,
  reviewed_by      uuid        references auth.users(id) on delete set null,
  reviewed_at      timestamptz,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid        references auth.users(id) on delete set null,
  demo_record      boolean     not null default false
);
comment on table public.help_signals is
  'Service user help requests. Reviewed by human coordinator — NO automatic action. RLS: ENABLED.';

-- ── 3.12 incidents ────────────────────────────────────────────
-- RLS: ENABLED
create table if not exists public.incidents (
  id               uuid          primary key default gen_random_uuid(),
  organisation_id  uuid          not null references public.organisations(id) on delete cascade,
  mission_id       uuid          references public.missions(id) on delete set null,
  responder_id     uuid          references public.responders(id) on delete set null,
  service_user_id  uuid          references public.service_users(id) on delete set null,
  type             text          not null default 'welfare_concern',
  severity         severity_enum not null default 'medium',
  status           text          not null default 'open',  -- open | under_review | resolved | closed
  title            text,
  description      text,
  location         jsonb,
  metadata         jsonb         not null default '{}'::jsonb,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now(),
  created_by       uuid          references auth.users(id) on delete set null,
  updated_by       uuid          references auth.users(id) on delete set null,
  demo_record      boolean       not null default false
);
comment on table public.incidents is
  'Incident reports. Human review required before any action. RLS: ENABLED.';

-- ── 3.13 evidence_items ───────────────────────────────────────
-- RLS: ENABLED
create table if not exists public.evidence_items (
  id               uuid        primary key default gen_random_uuid(),
  organisation_id  uuid        not null references public.organisations(id) on delete cascade,
  incident_id      uuid        references public.incidents(id) on delete set null,
  mission_id       uuid        references public.missions(id) on delete set null,
  type             text        not null default 'note',  -- note | photo | audio | file | form | observation
  title            text,
  description      text,
  notes            text,
  file_url         text,        -- Supabase Storage URL (private bucket)
  file_path        text,        -- Storage path for signed URL generation
  file_size_bytes  bigint,
  mime_type        text,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid        references auth.users(id) on delete set null,
  demo_record      boolean     not null default false
);
comment on table public.evidence_items is
  'Evidence records for incidents and missions. Files in private Supabase Storage. RLS: ENABLED.';

-- ── 3.14 escalation_events ────────────────────────────────────
-- RLS: ENABLED
-- ⚠ AI is ADVISORY ONLY. Human supervisor MUST review before any action.
create table if not exists public.escalation_events (
  id               uuid        primary key default gen_random_uuid(),
  organisation_id  uuid        not null references public.organisations(id) on delete cascade,
  mission_id       uuid        references public.missions(id) on delete set null,
  incident_id      uuid        references public.incidents(id) on delete set null,
  raised_by        uuid        references auth.users(id) on delete set null,
  reviewed_by      uuid        references auth.users(id) on delete set null,
  reason           text,
  ai_summary       text,        -- 4P3X advisory note only — NOT a decision
  status           text        not null default 'pending_review',
  -- Statuses: pending_review | under_review | actioned | closed | dismissed
  -- ⚠ 'pending_review' = human supervisor has NOT yet reviewed.
  -- ⚠ Automatic escalation actions are NOT permitted.
  reviewed_at      timestamptz,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  demo_record      boolean     not null default false
);
comment on table public.escalation_events is
  'Escalation workflow events. AI advisory only. HUMAN REVIEW REQUIRED before any action. RLS: ENABLED.';

-- ── 3.15 ai_reviews ───────────────────────────────────────────
-- RLS: ENABLED
-- ⚠ AI assessments are advisory only. Not clinical, legal, or certain.
create table if not exists public.ai_reviews (
  id               uuid        primary key default gen_random_uuid(),
  organisation_id  uuid        not null references public.organisations(id) on delete cascade,
  entity_type      text,        -- mission | incident | responder | service_user
  entity_id        uuid,
  review_type      text,        -- risk | welfare | compliance | safety
  summary          text,
  risk_level       risk_level_enum,
  confidence       text,        -- advisory only — not clinical/legal certainty
  reviewed_by      uuid        references auth.users(id) on delete set null,
  reviewed_at      timestamptz,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  demo_record      boolean     not null default false
);
comment on table public.ai_reviews is
  '4P3X advisory AI assessments. NOT clinical decisions. Human review required. RLS: ENABLED.';

-- ── 3.16 reports ──────────────────────────────────────────────
-- RLS: ENABLED
create table if not exists public.reports (
  id               uuid        primary key default gen_random_uuid(),
  organisation_id  uuid        not null references public.organisations(id) on delete cascade,
  type             text        not null default 'welfare',  -- welfare | incident | compliance | summary
  title            text,
  period           text,
  status           text        not null default 'draft',  -- draft | submitted | approved | archived
  content          jsonb       not null default '{}'::jsonb,
  file_path        text,        -- Storage path if exported to file
  generated_by     uuid        references auth.users(id) on delete set null,
  reviewed_by      uuid        references auth.users(id) on delete set null,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  demo_record      boolean     not null default false
);
comment on table public.reports is
  'Generated reports metadata and content. RLS: ENABLED.';

-- ── 3.17 offline_sync_queue ───────────────────────────────────
-- RLS: ENABLED
-- Purpose: Queued actions from PWAs waiting for sync to backend
create table if not exists public.offline_sync_queue (
  id               uuid             primary key default gen_random_uuid(),
  organisation_id  uuid             not null references public.organisations(id) on delete cascade,
  user_id          uuid             not null references auth.users(id) on delete cascade,
  action           sync_action_enum not null,
  entity_type      text             not null,
  entity_id        uuid,
  payload          jsonb            not null default '{}'::jsonb,
  status           sync_status_enum not null default 'pending',
  error_message    text,
  retry_count      smallint         not null default 0,
  max_retries      smallint         not null default 3,
  queued_at        timestamptz      not null default now(),
  synced_at        timestamptz,
  created_at       timestamptz      not null default now(),
  updated_at       timestamptz      not null default now(),
  demo_record      boolean          not null default false
);
comment on table public.offline_sync_queue is
  'Offline action queue for PWA sync. Cleared after successful sync. RLS: ENABLED.';

-- ── 3.18 backend_config_audit ─────────────────────────────────
-- RLS: ENABLED
-- Purpose: Tracks backend config test/update metadata without storing secrets
-- ⚠ MUST NOT store service_role keys, JWT secrets, or full API keys.
create table if not exists public.backend_config_audit (
  id               uuid        primary key default gen_random_uuid(),
  organisation_id  uuid        references public.organisations(id) on delete cascade,
  provider         text        not null default 'supabase',  -- supabase | firebase | rest | aws | local
  url_masked       text,        -- First 20 chars of URL only — never full key
  key_fingerprint  text,        -- Last 4 chars of key only — never full key
  status           text        not null default 'untested',  -- untested | ok | failed
  last_tested_at   timestamptz,
  tested_by        uuid        references auth.users(id) on delete set null,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.backend_config_audit is
  'Backend config test log. NEVER stores secrets. Masked values only. RLS: ENABLED.';

-- ── 3.19 activity_log ─────────────────────────────────────────
-- RLS: ENABLED
-- Purpose: General audit/event log for operations
create table if not exists public.activity_log (
  id               uuid        primary key default gen_random_uuid(),
  organisation_id  uuid        references public.organisations(id) on delete cascade,
  user_id          uuid        references auth.users(id) on delete set null,
  action           text        not null,  -- e.g. 'mission.created', 'check_in.submitted'
  entity_type      text,
  entity_id        uuid,
  details          jsonb       not null default '{}'::jsonb,
  ip_address       text,
  user_agent       text,
  created_at       timestamptz not null default now()
);
comment on table public.activity_log is
  'Operational audit log. Append-only — no updates or deletes. RLS: ENABLED.';

-- ── 3.20 notification_events ──────────────────────────────────
-- RLS: ENABLED
-- Purpose: Non-emergency notification events (realtime target)
-- ⚠ NOT a substitute for emergency services. Advisory notifications only.
create table if not exists public.notification_events (
  id               uuid        primary key default gen_random_uuid(),
  organisation_id  uuid        not null references public.organisations(id) on delete cascade,
  target_user_id   uuid        references auth.users(id) on delete cascade,
  type             text        not null default 'info',  -- info | alert | warning | system
  title            text,
  message          text,
  entity_type      text,
  entity_id        uuid,
  read_at          timestamptz,
  metadata         jsonb       not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz,
  demo_record      boolean     not null default false
);
comment on table public.notification_events is
  'Non-emergency notification events. NOT a substitute for emergency services. Realtime enabled. RLS: ENABLED.';


-- ============================================================
-- 4. INDEXES
-- ============================================================

-- organisations
create index if not exists idx_orgs_status         on public.organisations(status);
create index if not exists idx_orgs_demo           on public.organisations(demo_record);

-- profiles
create index if not exists idx_profiles_created    on public.profiles(created_at);

-- organisation_members
create index if not exists idx_org_members_user    on public.organisation_members(user_id);
create index if not exists idx_org_members_org     on public.organisation_members(organisation_id);
create index if not exists idx_org_members_role    on public.organisation_members(role);
create index if not exists idx_org_members_status  on public.organisation_members(status);

-- service_users
create index if not exists idx_su_org              on public.service_users(organisation_id);
create index if not exists idx_su_status           on public.service_users(status);
create index if not exists idx_su_risk             on public.service_users(risk_level);
create index if not exists idx_su_auth_user        on public.service_users(auth_user_id);
create index if not exists idx_su_demo             on public.service_users(demo_record);

-- responders
create index if not exists idx_resp_org            on public.responders(organisation_id);
create index if not exists idx_resp_status         on public.responders(status);
create index if not exists idx_resp_user           on public.responders(user_id);
create index if not exists idx_resp_demo           on public.responders(demo_record);

-- missions
create index if not exists idx_mis_org             on public.missions(organisation_id);
create index if not exists idx_mis_status          on public.missions(status);
create index if not exists idx_mis_assigned        on public.missions(assigned_to);
create index if not exists idx_mis_su              on public.missions(service_user_id);
create index if not exists idx_mis_risk            on public.missions(risk_level);
create index if not exists idx_mis_demo            on public.missions(demo_record);
create index if not exists idx_mis_created         on public.missions(created_at desc);

-- check_ins
create index if not exists idx_ci_org              on public.check_ins(organisation_id);
create index if not exists idx_ci_responder        on public.check_ins(responder_id);
create index if not exists idx_ci_su               on public.check_ins(service_user_id);
create index if not exists idx_ci_mission          on public.check_ins(mission_id);
create index if not exists idx_ci_created          on public.check_ins(created_at desc);

-- help_signals
create index if not exists idx_hs_org              on public.help_signals(organisation_id);
create index if not exists idx_hs_su               on public.help_signals(service_user_id);
create index if not exists idx_hs_status           on public.help_signals(status);
create index if not exists idx_hs_created          on public.help_signals(created_at desc);

-- incidents
create index if not exists idx_inc_org             on public.incidents(organisation_id);
create index if not exists idx_inc_status          on public.incidents(status);
create index if not exists idx_inc_severity        on public.incidents(severity);
create index if not exists idx_inc_mission         on public.incidents(mission_id);
create index if not exists idx_inc_created         on public.incidents(created_at desc);

-- escalation_events
create index if not exists idx_esc_org             on public.escalation_events(organisation_id);
create index if not exists idx_esc_status          on public.escalation_events(status);
create index if not exists idx_esc_created         on public.escalation_events(created_at desc);

-- activity_log
create index if not exists idx_al_org              on public.activity_log(organisation_id);
create index if not exists idx_al_user             on public.activity_log(user_id);
create index if not exists idx_al_entity           on public.activity_log(entity_type, entity_id);
create index if not exists idx_al_created          on public.activity_log(created_at desc);

-- notification_events
create index if not exists idx_notif_user          on public.notification_events(target_user_id);
create index if not exists idx_notif_org           on public.notification_events(organisation_id);
create index if not exists idx_notif_read          on public.notification_events(read_at);
create index if not exists idx_notif_created       on public.notification_events(created_at desc);

-- offline_sync_queue
create index if not exists idx_sq_user             on public.offline_sync_queue(user_id);
create index if not exists idx_sq_org              on public.offline_sync_queue(organisation_id);
create index if not exists idx_sq_status           on public.offline_sync_queue(status);
create index if not exists idx_sq_created          on public.offline_sync_queue(created_at);


-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- current_user_profile_id() — returns authenticated user's UUID
create or replace function public.current_user_profile_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

-- current_user_org_ids() — returns all org IDs the user belongs to (active only)
create or replace function public.current_user_org_ids()
returns setof uuid
language sql stable
security definer
set search_path = public
as $$
  select organisation_id
  from public.organisation_members
  where user_id = auth.uid()
    and status  = 'active';
$$;

-- current_user_role_for_org(org_id) — returns the user's role in a specific org
create or replace function public.current_user_role_for_org(p_org_id uuid)
returns text
language sql stable
security definer
set search_path = public
as $$
  select role::text
  from public.organisation_members
  where user_id        = auth.uid()
    and organisation_id = p_org_id
    and status          = 'active'
  limit 1;
$$;

-- is_org_member(org_id) — true if current user is active member
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organisation_members
    where user_id        = auth.uid()
      and organisation_id = p_org_id
      and status          = 'active'
  );
$$;

-- has_org_role(org_id, roles[]) — true if user has one of the given roles in the org
create or replace function public.has_org_role(p_org_id uuid, p_roles text[])
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organisation_members
    where user_id        = auth.uid()
      and organisation_id = p_org_id
      and status          = 'active'
      and role::text      = any(p_roles)
  );
$$;

-- is_assigned_responder(mission_id) — true if current user is the assigned responder
create or replace function public.is_assigned_responder(p_mission_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.missions m
    join public.responders r on r.id = m.assigned_to
    where m.id    = p_mission_id
      and r.user_id = auth.uid()
  );
$$;

-- is_own_service_user(service_user_id) — true if current user owns this service user record
create or replace function public.is_own_service_user(p_su_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.service_users
    where id           = p_su_id
      and auth_user_id = auth.uid()
  );
$$;

-- touch_updated_at() — trigger function to auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================================

-- Macro to safely create trigger (won't error if already exists)
do $$ declare t text; begin
  foreach t in array array[
    'organisations','profiles','organisation_members',
    'service_users','responders','missions','mission_assignments',
    'check_ins','help_signals','incidents','evidence_items',
    'escalation_events','reports','offline_sync_queue',
    'backend_config_audit','notification_events'
  ] loop
    execute format(
      'create trigger trg_%s_touch_updated_at
       before update on public.%s
       for each row execute function public.touch_updated_at()',
      replace(t,'-','_'), t
    );
  end loop;
exception when duplicate_object then null;
end $$;

-- responder_status and service_user_status use updated_at directly
create or replace function public.touch_status_updated_at()
returns trigger language plpgsql security definer set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ begin
  create trigger trg_responder_status_updated_at
    before update on public.responder_status
    for each row execute function public.touch_status_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_su_status_updated_at
    before update on public.service_user_status
    for each row execute function public.touch_status_updated_at();
exception when duplicate_object then null; end $$;


-- ============================================================
-- 7. AUTO-CREATE PROFILE TRIGGER
-- ============================================================
-- When a new auth.users record is created, auto-create a profile row.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$ begin
  create trigger trg_on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception when duplicate_object then null; end $$;
