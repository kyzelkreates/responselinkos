# ResponseLink OS™ — Live Mode Test Plan

**ResponseLink OS™**
AI-Assisted Community Welfare & Mobile Response Platform
Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™

Run 11 — Complete Supabase Backend SQL + RLS + Realtime

---

> ⚠️ **ADVISORY NOTICE**
> ResponseLink OS™ is advisory and coordination-support software.
> It does not replace emergency services, safeguarding professionals, clinical judgement, or legal duties.
> All escalations require human supervisor review. No automated welfare decisions are made.

---

## Pre-Test Checklist

Before running any test:
- [ ] `supabase/schema.sql` executed successfully
- [ ] `supabase/rls-policies.sql` executed successfully
- [ ] `supabase/realtime.sql` executed successfully
- [ ] `supabase/storage.sql` executed successfully
- [ ] `supabase/verification.sql` queries V1–V10 all pass
- [ ] `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] At least one owner/admin user created in Supabase Auth
- [ ] At least one organisation created and membership added
- [ ] `npm run build` passes with no errors

---

## TEST 1 — Demo Mode Behaviour

**Goal:** Confirm Demo Mode works without any backend configuration.

| # | Test | Expected |
|---|------|----------|
| 1.1 | Open app with no Supabase config (empty `.env.local`) | App loads — no crash |
| 1.2 | Navigate to `/#/dashboard` | Dashboard loads with demo data |
| 1.3 | Navigate to `/#/responder-app` | Responder PWA loads with demo missions |
| 1.4 | Navigate to `/#/service-user-pwa` | Service User PWA loads |
| 1.5 | Check LiveModeStatusPanel | Shows "Demo Mode" |
| 1.6 | Check auth status | "Demo (no login required)" |
| 1.7 | Check backend status | "Not configured" or "Demo" |
| 1.8 | No login prompt appears | Demo bypasses auth gate |
| 1.9 | No demo data is written to Supabase | Zero records in live tables |
| 1.10 | Safety disclaimer visible | Advisory wording present |

---

## TEST 2 — Live Mode Without Backend

**Goal:** Confirm Live Mode fails gracefully when Supabase is not configured.

| # | Test | Expected |
|---|------|----------|
| 2.1 | Turn Demo Mode OFF in Demo/Live Settings | Mode switches to Live |
| 2.2 | Open `/#/dashboard` | Shows backend setup empty state OR auth gate |
| 2.3 | No demo data visible | Demo records filtered from live views |
| 2.4 | LiveModeStatusPanel shows | "Live Mode — No backend configured" warning |
| 2.5 | App does not crash | Graceful degradation |
| 2.6 | Can navigate to Demo/Live Settings | Settings page accessible |
| 2.7 | Can turn Demo Mode back ON | Returns to demo state cleanly |

---

## TEST 3 — Admin / Owner Test

**Goal:** Confirm full admin access in Live Mode with Supabase configured.

Setup: Admin user created, org membership `role = 'admin'`, Demo Mode OFF.

| # | Test | Expected |
|---|------|----------|
| 3.1 | Navigate to `/#/dashboard` | Auth gate appears |
| 3.2 | Sign in with admin credentials | Signed in — dashboard loads |
| 3.3 | Role badge shows "Administrator" | Correct role displayed |
| 3.4 | Mode shows "Live Mode" | |
| 3.5 | Backend shows "Configured" | |
| 3.6 | Create a new mission | Mission saves to Supabase `missions` table |
| 3.7 | Create a service user | Record saved to `service_users` table |
| 3.8 | Create a responder | Record saved to `responders` table |
| 3.9 | Assign mission to responder | `mission_assignments` record created |
| 3.10 | Activity log records action | `activity_log` row created |
| 3.11 | Sign out | Auth cleared — returns to gate |

---

## TEST 4 — Coordinator Test

**Goal:** Confirm coordinator access and restrictions.

Setup: Coordinator user, org membership `role = 'coordinator'`.

| # | Test | Expected |
|---|------|----------|
| 4.1 | Sign in as coordinator | Dashboard loads |
| 4.2 | Can view all org missions | All missions visible |
| 4.3 | Can create and assign missions | Works |
| 4.4 | Can review help signals | Visible and actionable |
| 4.5 | Can view incidents | Visible |
| 4.6 | Cannot access other organisations' data | 0 rows from other orgs |
| 4.7 | Can generate reports | Report saved to `reports` table |
| 4.8 | Cannot change org settings (admin only) | Restricted or not shown |

---

## TEST 5 — Supervisor Test

**Goal:** Confirm supervisor access to escalations and review tools.

Setup: Supervisor user, `role = 'supervisor'`.

| # | Test | Expected |
|---|------|----------|
| 5.1 | Sign in as supervisor | Dashboard loads |
| 5.2 | Can view escalation events | Escalations visible |
| 5.3 | Can review and update escalation status | Update saves |
| 5.4 | Can view AI advisory reviews | AI reviews visible with advisory label |
| 5.5 | Cannot approve escalation automatically | Manual review required |
| 5.6 | Can view incidents, missions, reports | Read access confirmed |
| 5.7 | Cannot manage org members | Restricted |

---

## TEST 6 — Responder Test

**Goal:** Confirm responder sees ONLY their assigned missions.

Setup: Responder user linked to a responder record. Two missions: one assigned to them, one to another responder.

| # | Test | Expected |
|---|------|----------|
| 6.1 | Sign in as responder | Responder PWA loads |
| 6.2 | Only assigned missions visible | Mission list shows ONLY their missions |
| 6.3 | Cannot see other responders' missions | 0 unassigned missions returned |
| 6.4 | Update mission status to "travelling" | Status change saved |
| 6.5 | Update mission status to "arrived" | Status change saved |
| 6.6 | Submit welfare check-in | Check-in saved to `check_ins` |
| 6.7 | Log incident | Incident saved to `incidents` |
| 6.8 | Upload evidence | File saved to `evidence-items` bucket |
| 6.9 | Cannot access Command Dashboard sections | Access gate blocks |
| 6.10 | Realtime update received from dashboard | Mission update appears without refresh |

---

## TEST 7 — Service User Test

**Goal:** Confirm service users see only their own data and cannot access other users.

Setup: Service user with `auth_user_id` linked and `role = 'service_user'`.

| # | Test | Expected |
|---|------|----------|
| 7.1 | Sign in as service user | Service User PWA loads |
| 7.2 | Only own service user record visible | Correct |
| 7.3 | Cannot see other service users | 0 other user records returned |
| 7.4 | Submit wellbeing check-in | Check-in saved |
| 7.5 | Submit help signal | Help signal saved to `help_signals` |
| 7.6 | Help signal appears on Command Dashboard | Real-time update in dashboard |
| 7.7 | Service user can see own help signal status | Status visible |
| 7.8 | Cannot access dashboard or responder screens | Blocked by auth gate |
| 7.9 | Safety disclaimer visible on all forms | Confirmed |

---

## TEST 8 — Offline Queue Test

**Goal:** Confirm offline queueing and sync works.

| # | Test | Expected |
|---|------|----------|
| 8.1 | Go offline (disable network) | App remains usable |
| 8.2 | Submit a check-in while offline | Saved locally with "pending" status |
| 8.3 | LiveModeStatusPanel shows queue count | Pending items displayed |
| 8.4 | Reconnect network | Queue processes automatically |
| 8.5 | Check-in appears in Supabase | Record synced |
| 8.6 | Queue count returns to 0 | Confirmed |
| 8.7 | No duplicate records created | Idempotency confirmed |

---

## TEST 9 — Realtime Update Test

**Goal:** Confirm realtime subscriptions deliver updates to correct surfaces.

Setup: Admin in Tab A (dashboard), Responder signed in on Tab B (responder PWA).

| # | Test | Expected |
|---|------|----------|
| 9.1 | Admin creates mission in Tab A | Mission appears in Tab A dashboard |
| 9.2 | Admin assigns mission to responder | Assignment visible in Tab A |
| 9.3 | Responder sees assigned mission in Tab B | Without refresh — realtime delivery |
| 9.4 | Responder updates status to "travelling" | Status updates in Tab A dashboard in real time |
| 9.5 | Admin adds supervisor note | Note visible to coordinator in real time |
| 9.6 | Service user submits help signal | Help signal count updates in dashboard in real time |
| 9.7 | Disconnect Tab B network → reconnect | Subscription re-establishes |
| 9.8 | Realtime status panel shows "Connected" | Confirmed |

---

## TEST 10 — RLS Isolation Test

**Goal:** Confirm no cross-user, cross-role, or cross-org data leakage.

| # | Test | Expected |
|---|------|----------|
| 10.1 | Responder A queries missions | Only assigned missions returned |
| 10.2 | Responder A queries service_users | Only service users on their missions |
| 10.3 | Service user A queries service_users | Only their own record |
| 10.4 | Unauthenticated (anon) queries missions | 0 rows |
| 10.5 | User from Org A queries Org B data | 0 rows |
| 10.6 | Viewer queries escalation_events | 0 rows (supervisor+ only) |
| 10.7 | Admin queries backend_config_audit | Only own org record |

Verification queries in `supabase/verification.sql` cover these checks.

---

## TEST 11 — PWA Install Test

| # | Test | Expected |
|---|------|----------|
| 11.1 | Open app on mobile browser | Install prompt appears (or fallback text) |
| 11.2 | Tap install | App installs to home screen |
| 11.3 | Open from home screen | Loads correct start URL |
| 11.4 | Dismiss install prompt | App still fully usable — no blocking |
| 11.5 | iOS: "Add to Home Screen" instruction visible | Fallback text shown on iOS |

---

## TEST 12 — Backend Config Guard Test

**Goal:** Confirm 4P3X API Config Guard™ blocks dangerous secret entry.

| # | Test | Expected |
|---|------|----------|
| 12.1 | Open Demo/Live Settings → Backend Config | Config panel loads |
| 12.2 | Paste a service role key (starts `eyJ...`, long) | Blocked with warning |
| 12.3 | Enter text containing `SERVICE_ROLE_KEY` | Blocked |
| 12.4 | Enter text containing `OPENAI_API_KEY` | Blocked |
| 12.5 | Enter a valid Supabase anon key | Accepted |
| 12.6 | Enter valid project URL | Accepted |
| 12.7 | Test connection with valid config | Connection test runs |
| 12.8 | Full keys never logged in console | Confirmed — masked only |

---

## Pass / Fail Summary

After completing all tests, record results:

| Test Suite | Pass | Fail | Notes |
|-----------|------|------|-------|
| TEST 1 — Demo Mode | | | |
| TEST 2 — Live / No Backend | | | |
| TEST 3 — Admin | | | |
| TEST 4 — Coordinator | | | |
| TEST 5 — Supervisor | | | |
| TEST 6 — Responder | | | |
| TEST 7 — Service User | | | |
| TEST 8 — Offline Queue | | | |
| TEST 9 — Realtime | | | |
| TEST 10 — RLS Isolation | | | |
| TEST 11 — PWA Install | | | |
| TEST 12 — Config Guard | | | |

---

*ResponseLink OS™ · 4P3X Intelligent AI™ · Created by Kyzel Kreates™*
*Advisory and coordination-support software only.*
