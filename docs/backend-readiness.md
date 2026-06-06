# ResponseLink OS™ — Backend Readiness Documentation

**ResponseLink OS™**
AI-Assisted Community Welfare & Mobile Response Platform
Powered by 4P3X Intelligent AI™ · Created by Kyzel Kreates™

**Status:** Run 9 — Backend-ready architecture defined. Full backend wiring in Run 10.

---

## ⚠ Advisory Notice

ResponseLink OS™ is advisory and coordination-support software.
It does not replace emergency services, safeguarding professionals, clinical judgement, or legal duties.
If someone is in immediate danger, contact emergency services.

---

## Demo Mode vs Live Mode

| Feature | Demo Mode | Live Mode |
|---|---|---|
| Data source | Local sample data | Configured backend |
| Backend required | No | Yes (for multi-user) |
| Real user accounts | No | Yes (with auth) |
| Data persists across sessions | Local only | Backend + local cache |
| Records visible to others | No | Yes (with RLS) |
| Suitable for investor demos | Yes | No (empty until configured) |
| Suitable for real operations | No | Yes (after full setup) |

**Rule:** Demo records and live records must never be mixed.
All demo records carry `demoRecord: true`. Live queries must exclude `demoRecord: true`.

---

## Backend Provider Options

### 1. Supabase (Recommended)
- Open source, PostgreSQL-backed, built-in Auth, Row Level Security (RLS), Realtime subscriptions
- ANON (public) key is safe for frontend use
- Service role key MUST NEVER be placed in frontend code
- Setup: https://supabase.com

### 2. Firebase / Firestore
- Google-hosted NoSQL database with Auth and offline sync
- Future option — architecture supports it
- Use client SDK keys only in frontend

### 3. Custom REST API
- Any REST-based backend (Node.js, Laravel, Django, etc.)
- Endpoint URL and public API key only in frontend
- Authentication tokens must be short-lived and scoped

### 4. AWS / Custom Backend
- DynamoDB, Amplify, AppSync or custom microservices
- Use public/scoped keys only in frontend
- IAM credentials MUST NEVER be placed in frontend code

### 5. Local-only fallback
- All data stored in localStorage / IndexedDB
- No backend required
- Suitable for demo, training, and offline use
- Not suitable for multi-user real operations

---

## 4P3X API Config Guard™ — Frontend Key Rules

The following keys MUST NEVER appear in frontend code, localStorage, or any client-side configuration:

| Key | Reason |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Admin bypass of RLS — server-side only |
| `OPENAI_API_KEY` | AI provider secret — server-side only |
| `GROQ_API_KEY` | AI provider secret — server-side only |
| `DATABASE_URL` | Direct DB access — server-side only |
| `JWT_SECRET` | Token signing — server-side only |
| `PRIVATE_KEY` | Cryptographic secret — server-side only |
| `WEBHOOK_SECRET` | Webhook validation — server-side only |
| `STRIPE_SECRET_KEY` | Payment secret — server-side only |
| `ADMIN_TOKEN` | Admin API access — server-side only |

**Safe for frontend:**
- `SUPABASE_ANON_KEY` (anon/public key only)
- `VITE_SUPABASE_URL` (project URL, not credentials)
- `VITE_API_MODE` (demo/live toggle)
- `VITE_APP_NAME` (branding)

---

## Live Entity Model

### organisations
- Purpose: Top-level tenant — a charity, council, outreach team, or care provider
- Key fields: `id`, `name`, `type`, `contact_email`, `created_at`
- Used by: All modules — all data scoped to org

### users
- Purpose: Staff accounts — supervisors, coordinators, admins
- Key fields: `id`, `org_id`, `email`, `full_name`, `role`, `created_at`
- Used by: Auth, Command Dashboard, AI Oversight

### service_users
- Purpose: People receiving welfare visits or outreach support
- Key fields: `id`, `org_id`, `full_name`, `risk_level`, `status`, `last_seen`, `created_at`
- Used by: Service User PWA, Command Dashboard, Missions

### responders
- Purpose: Field responders — outreach workers, support staff
- Key fields: `id`, `org_id`, `user_id`, `full_name`, `status`, `current_location`, `created_at`
- Used by: Responder PWA, Command Dashboard, Missions

### missions
- Purpose: A welfare visit, outreach task, or assigned field job
- Key fields: `id`, `org_id`, `title`, `type`, `status`, `risk_level`, `service_user_id`, `assigned_to`, `created_at`, `updated_at`, `demoRecord`
- Status flow: `assigned → travelling → arrived → in_progress → completed`
- Used by: Responder PWA, Service User PWA, Command Dashboard

### mission_assignments
- Purpose: Links a responder to a mission (supports reassignment history)
- Key fields: `id`, `mission_id`, `responder_id`, `assigned_at`, `status`
- Used by: Dispatch, Responder PWA

### check_ins
- Purpose: Responder welfare check-ins during or between missions
- Key fields: `id`, `responder_id`, `mission_id`, `type`, `notes`, `status`, `created_at`
- Used by: Responder PWA, Command Dashboard risk panels

### help_signals
- Purpose: Service user requests for help or check-in confirmation
- Key fields: `id`, `service_user_id`, `type`, `urgency`, `notes`, `status`, `created_at`
- Used by: Service User PWA, Command Dashboard

### incidents
- Purpose: Reported incidents — welfare concern, safeguarding, near-miss, hazard
- Key fields: `id`, `org_id`, `mission_id`, `responder_id`, `service_user_id`, `type`, `severity`, `description`, `status`, `created_at`
- Used by: Evidence/Reports, Command Dashboard, AI Oversight

### evidence_items
- Purpose: Evidence records attached to incidents or missions
- Key fields: `id`, `incident_id`, `mission_id`, `type`, `description`, `notes`, `created_at`
- Used by: Evidence/Reports, Safety module

### escalation_events
- Purpose: Escalation actions raised by AI advisory or supervisors
- Key fields: `id`, `org_id`, `mission_id`, `risk_flag_id`, `raised_by`, `reason`, `status`, `created_at`
- AI role: **Advisory only** — no automatic escalation decisions
- Human review required before any action
- Used by: Command Dashboard, AI Oversight

### ai_reviews
- Purpose: 4P3X Intelligent AI™ advisory assessments — risk, welfare, compliance
- Key fields: `id`, `org_id`, `entity_type`, `entity_id`, `review_type`, `summary`, `risk_level`, `created_at`
- Note: AI assessments are advisory only. Human supervisor must review before action.
- Used by: AI Oversight, Command Dashboard

### reports
- Purpose: Structured welfare, incident, and compliance reports
- Key fields: `id`, `org_id`, `type`, `period`, `generated_by`, `status`, `created_at`
- Used by: Evidence/Reports, Compliance

### backend_config
- Purpose: Persisted (client-safe) backend configuration
- Key fields: `provider`, `url`, `anon_key_masked`, `sync_mode`, `last_tested`, `status`
- Note: Only ANON key stored. Service role key NEVER stored here.
- Used by: Demo/Live Settings page

---

## Supabase First Setup — Recommended Steps

1. Create a Supabase project at https://supabase.com
2. Copy the **Project URL** and **anon (public) key** from Project Settings → API
3. **Never copy the service_role key into frontend code**
4. Run the starter schema SQL from `docs/supabase-starter-schema.sql`
5. Enable Row Level Security (RLS) on all tables — see schema file
6. Configure organisation and first admin user
7. In ResponseLink OS™ Demo/Live Settings: select Supabase, enter URL and anon key
8. Test connection using the Test Connection button
9. Switch from Demo Mode to Live Mode

---

## Data Separation Rule

All demo records carry `demoRecord: true` at creation time.

Live data queries MUST always filter:
```sql
WHERE demo_record = false
-- or
WHERE demo_record IS NULL
```

Demo data queries may include all records, but should clearly label demo data in the UI.

---

## Remaining Technical Debt (Run 9)

- Full Supabase Auth wiring (Run 10)
- Real-time sync via Supabase Realtime (Run 10)
- Multi-tenant org isolation with RLS policies (Run 10)
- Firebase / Custom REST adapters (Post Run 10)
- Offline sync queue flushing to real backend (Run 10)
- Production security audit (pre-launch)

---

*ResponseLink OS™ Run 9 — Backend Readiness Documentation*
*Created by Kyzel Kreates™ · Powered by 4P3X Intelligent AI™*
