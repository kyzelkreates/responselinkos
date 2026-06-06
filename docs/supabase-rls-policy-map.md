# ResponseLink OS™ — RLS Policy Map

**ResponseLink OS™**
AI-Assisted Community Welfare & Mobile Response Platform
Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™

Run 11 — Complete Supabase Backend SQL + RLS + Realtime

---

> ⚠️ **Human Review Boundaries**
> These policies control DATA ACCESS only.
> They do NOT automate welfare decisions, safeguarding actions, clinical judgements, or emergency responses.
> All escalations must be reviewed by a human supervisor before any action is taken.
> AI reviews are advisory only — they are not decisions.

---

## Role Hierarchy

| Role | Access Level | Description |
|------|-------------|-------------|
| `owner` | Full org | Can manage all org data, settings, members |
| `admin` | Full operational | Full access within org, cannot change org ownership |
| `coordinator` | Operational | Manages missions, responders, reports, reviews |
| `supervisor` | Oversight | Reviews escalations, incidents, ai_reviews, reports |
| `responder` | Field only | Views assigned missions, submits check-ins/evidence |
| `service_user` | Own records only | View own status, submit check-ins, help signals |
| `viewer` | Read-only | Limited dashboard read access where allowed |

---

## Policy Map by Table

---

### `organisations`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT | Any active org member | Can only see their own org |
| UPDATE | owner, admin | Cannot see other orgs |
| DELETE | owner only | Destructive — use with caution |
| INSERT | Via Supabase dashboard / setup | Not user-created |

**RLS: ENABLED** — No cross-org access. Anon blocked.

---

### `profiles`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT | Own profile; org members via staff lookup | No cross-org profile access |
| UPDATE | Own profile only | |
| INSERT | Own profile only (on signup) | Auto-created by trigger |

**RLS: ENABLED** — Profile is personal. Staff can see org members' profiles for operational context.

---

### `organisation_members`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT | Active org members + own membership | |
| INSERT | owner, admin | Can invite users to org |
| UPDATE | owner, admin | Can change roles/status |
| DELETE | owner, admin; or user removing self | |

**RLS: ENABLED** — Role changes are restricted to org owners/admins.

---

### `service_users`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT (staff) | coordinator, supervisor, admin, owner | All org service users, `demo_record = false` |
| SELECT (own) | service_user via auth | Own record only |
| SELECT (responder) | responder | Only service users linked to their assigned missions |
| INSERT | coordinator, supervisor, admin, owner | `demo_record = false` enforced |
| UPDATE | coordinator, supervisor, admin, owner | |

**RLS: ENABLED** — Service users cannot see each other. Responders only see service users relevant to their missions. Staff notes (`notes` field) are in the staff view only — never shown in Service User PWA.

> ⚠️ Service user records contain welfare-sensitive information. Access is strictly scoped. No cross-org access.

---

### `responders`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT | All org members; responder can see own record | `demo_record = false` |
| INSERT | coordinator, supervisor, admin, owner | |
| UPDATE | Staff (coordinator+) OR own record (for location/status) | |

**RLS: ENABLED** — Responders can update their own location and status. Cross-org: blocked.

---

### `missions`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT (staff) | coordinator, supervisor, admin, owner, viewer | Org missions, `demo_record = false` |
| SELECT (responder) | responder | ONLY assigned missions — `is_assigned_responder()` check |
| INSERT | coordinator, supervisor, admin, owner | `demo_record = false` |
| UPDATE | Staff (coordinator+) OR assigned responder | Responder can update status of their missions |

**RLS: ENABLED** — Responders cannot see missions not assigned to them. Mission workflow: `assigned → travelling → arrived → in_progress → completed`.

---

### `mission_assignments`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT | All org members | Assignment history |
| INSERT | coordinator, supervisor, admin, owner | |

**RLS: ENABLED** — Tracks full assignment history including reassignments.

---

### `responder_status`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT (staff) | coordinator, supervisor, admin, owner, viewer | Current field status |
| SELECT (own) | responder | Own status only |
| ALL (upsert) | Staff + own responder | One row per responder |

**RLS: ENABLED** — Realtime target. Used by Command Dashboard for live responder tracking.

---

### `service_user_status`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT (staff) | coordinator, supervisor, admin, owner, viewer | |
| SELECT (own) | service_user | Own status only |
| ALL (upsert) | Staff + own service user | One row per service user |

**RLS: ENABLED** — Realtime target. Service users cannot see each other's status.

---

### `check_ins`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT (staff) | coordinator, supervisor, admin, owner, viewer | |
| SELECT (responder) | responder | Own check-ins only |
| SELECT (su) | service_user | Own check-ins only |
| INSERT | Any org member | `demo_record = false` |

**RLS: ENABLED** — Check-ins are scoped by role. Service users cannot see other users' check-ins.

---

### `help_signals`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT (staff) | coordinator, supervisor, admin, owner, viewer | All org signals |
| SELECT (own) | service_user | Own signals only |
| INSERT | service_user (own) | `is_own_service_user()` check |
| UPDATE | coordinator, supervisor, admin, owner | For review/resolution |

**RLS: ENABLED** — Service users can submit their own help signals. Staff review and resolve. No automatic action taken — human review required.

> ⚠️ Help signals are **not** emergency alerts. They are welfare coordination signals reviewed by human coordinators. If someone is in immediate danger, they must contact emergency services.

---

### `incidents`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT (staff) | coordinator, supervisor, admin, owner, viewer | |
| SELECT (responder) | responder | Own submitted incidents |
| INSERT | Any org member | `demo_record = false` |
| UPDATE | coordinator, supervisor, admin, owner | For review/resolution |

**RLS: ENABLED** — Incident reports require human review before action.

---

### `evidence_items`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT | coordinator, supervisor, admin, owner, viewer | |
| INSERT | Any org member | `demo_record = false` |

**RLS: ENABLED** — Evidence is stored in private Supabase Storage. No public file access.

---

### `escalation_events`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT | coordinator, supervisor, admin, owner | **Supervisors+ only** |
| INSERT | Any org member | For raising escalations |
| UPDATE | coordinator, supervisor, admin, owner | For review/action |

**RLS: ENABLED** — Escalations are **advisory**. `status = 'pending_review'` until a human supervisor explicitly reviews and actions.

> ⚠️ **HUMAN REVIEW REQUIRED** — Escalation events do not trigger automatic actions. A supervisor must review every escalation before any operational response.

---

### `ai_reviews`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT | Any org member | Advisory content only |
| INSERT | Any org member | AI system inserts advisory notes |

**RLS: ENABLED** — AI reviews are advisory summaries only. They are not clinical assessments, legal determinations, or safeguarding decisions.

> ⚠️ 4P3X Intelligent AI™ outputs are advisory. They do not constitute clinical, legal, safeguarding, or emergency judgements.

---

### `reports`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT | coordinator, supervisor, admin, owner, viewer | |
| INSERT | coordinator, supervisor, admin, owner | |
| UPDATE | coordinator, supervisor, admin, owner | |

**RLS: ENABLED** — Reports contain sensitive operational data. Viewer role has read access where allowed by org policy.

---

### `offline_sync_queue`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT | Own queue items; admin for org view | |
| INSERT | Own items only | |
| UPDATE | Own items only | For retry/status updates |

**RLS: ENABLED** — Each user's offline queue is private. Admins can view org-level queue for debugging.

---

### `backend_config_audit`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT | owner, admin | |
| INSERT | owner, admin | **Masked values only — NEVER full keys** |

**RLS: ENABLED** — Contains only masked key fingerprints. No full API keys stored here.

---

### `activity_log`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT | coordinator, supervisor, admin, owner | |
| INSERT | Any org member | Append-only |
| UPDATE | **No one** | Immutable audit trail |
| DELETE | **No one** | Immutable audit trail |

**RLS: ENABLED** — Activity log is append-only. No modifications permitted.

---

### `notification_events`

| Operation | Who can | Notes |
|-----------|---------|-------|
| SELECT | Target user (own notifications) | |
| UPDATE | Target user | For marking read |
| INSERT | Any org member | For sending notifications |

**RLS: ENABLED** — Users can only see notifications addressed to them.

> ⚠️ Notification events are **not** emergency alerts. They are operational coordination messages.

---

## Anon Access Policy

**Default: BLOCKED on all tables.**

The anon role (unauthenticated requests) cannot access any private production data. All RLS policies require `to authenticated`. No exceptions unless a specific public access flow is deliberately and carefully designed for your use case.

---

## Cross-Organisation Isolation

Every sensitive table has an `organisation_id` column. All SELECT policies filter using `current_user_org_ids()` — a function that returns only the orgs the current authenticated user belongs to.

This means:
- A coordinator at Charity A cannot see data for Charity B.
- A responder at Org 1 cannot see missions for Org 2.
- No shared data between organisations unless explicitly designed.

---

## Storage Policy Summary

| Bucket | Access | Notes |
|--------|--------|-------|
| `evidence-items` | Private — staff read, responder upload | No public URLs |
| `report-exports` | Private — staff read/write | Admin delete only |
| `organisation-assets` | Private — members read, admin write | Change to public for branding if needed |

File paths use `{org_id}/{entity_id}/{filename}` structure so RLS on `storage.objects` can use the org ID from the path.

---

*ResponseLink OS™ · 4P3X Intelligent AI™ · Created by Kyzel Kreates™*
*Advisory and coordination-support software only.*
