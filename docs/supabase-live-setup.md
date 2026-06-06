# ResponseLink OS™ — Supabase Live Setup Guide

**ResponseLink OS™**
AI-Assisted Community Welfare & Mobile Response Platform
Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™

Run 11 — Complete Supabase Backend SQL + RLS + Realtime

---

> ⚠️ **ADVISORY NOTICE**
> ResponseLink OS™ is advisory and coordination-support software.
> It does not replace emergency services, safeguarding professionals,
> clinical judgement, or legal duties.
> If someone is in immediate danger, contact emergency services.

---

> ⚠️ **KEY SAFETY RULE — 4P3X API Config Guard™**
> - `VITE_SUPABASE_URL` → safe for frontend ✅
> - `VITE_SUPABASE_ANON_KEY` → safe for frontend ✅
> - `SUPABASE_SERVICE_ROLE_KEY` → **NEVER in frontend** ⛔
> - All other secrets (JWT, DB URL, private keys) → **server-side only** ⛔

---

## Before You Start

**Demo Mode works without any backend.** You do not need to follow this guide to explore or demonstrate the product. Demo Mode shows the full platform with sample data and requires no configuration.

This guide is for teams ready to run ResponseLink OS™ with **real users, real data, and a live backend**.

---

## Step 1 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in or create an account.
2. Click **New Project**.
3. Choose an organisation (or create one).
4. Set a project name (e.g. `responselink-live`).
5. Set a strong database password — save it securely.
6. Choose the region closest to your users.
7. Click **Create new project** and wait for provisioning (~2 minutes).

---

## Step 2 — Copy Your Project Credentials

1. In the Supabase Dashboard, go to **Settings → API**.
2. Copy the **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`).
3. Copy the **anon public key** (long string starting with `eyJ...`).
4. ⚠️ Do **NOT** copy the `service_role` key for frontend use — it bypasses all RLS.

---

## Step 3 — Configure Your Environment

Create `.env.local` in the project root (never commit this file):

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Or configure via the app UI: **Demo/Live Settings → Backend Configuration → Supabase**.

The app reads from localStorage first (set via UI), then falls back to `VITE_` env vars.

---

## Step 4 — Run SQL Files in Order

Open **Supabase Dashboard → SQL Editor** and run each file in this exact order:

| Order | File | Purpose |
|-------|------|---------|
| 1 | `supabase/schema.sql` | Extensions, enums, tables, indexes, functions, triggers |
| 2 | `supabase/rls-policies.sql` | Enable RLS + all access policies |
| 3 | `supabase/realtime.sql` | Add tables to realtime publication |
| 4 | `supabase/storage.sql` | Create storage buckets + storage policies |

> Copy each file's content → paste into SQL Editor → Run.
> Wait for each to complete before running the next.
> Run `supabase/verification.sql` after each step to confirm it worked.

---

## Step 5 — Enable Auth Providers

1. Go to **Authentication → Providers**.
2. Enable **Email** provider (on by default).
3. Configure email confirmation settings as needed for your organisation.
4. Optional: Enable other providers (Google, Azure AD, etc.) if required.

---

## Step 6 — Create First Owner/Admin User

Option A — Supabase Dashboard:
1. Go to **Authentication → Users**.
2. Click **Invite user** or **Add user**.
3. Enter the admin email address.
4. Send invite or set password directly.

Option B — SQL (after schema is applied):
```sql
-- Run in SQL Editor after schema.sql
-- Supabase Auth handles the auth.users insert via the dashboard.
-- After the user signs up, add them to an organisation:

-- 1. First create the organisation:
INSERT INTO public.organisations (name, type, contact_email, status)
VALUES ('Your Organisation Name', 'charity', 'admin@yourorg.org', 'active');

-- 2. Get the new org ID:
SELECT id FROM public.organisations WHERE name = 'Your Organisation Name';

-- 3. Get the user ID:
SELECT id FROM auth.users WHERE email = 'admin@yourorg.org';

-- 4. Create the membership:
INSERT INTO public.organisation_members (organisation_id, user_id, role, status, accepted_at)
VALUES (
  'org-uuid-from-step-2',
  'user-uuid-from-step-3',
  'owner',
  'active',
  now()
);
```

---

## Step 7 — Add Organisation and Membership

Every real user must belong to an organisation with a role.

Roles available:
- `owner` — full access, can manage org settings
- `admin` — full operational access
- `coordinator` — can manage missions, responders, reports
- `supervisor` — can review escalations, incidents, reports
- `responder` — can view assigned missions, submit check-ins
- `service_user` — can submit wellbeing check-ins, help signals
- `viewer` — read-only access to limited dashboard data

---

## Step 8 — Test Realtime

1. Open the Command Dashboard in one browser tab.
2. Open the Responder PWA in another tab (or device).
3. Create a new mission in the dashboard.
4. Confirm the Responder PWA updates without page refresh.

If realtime doesn't update:
- Check **Supabase Dashboard → Realtime → Inspector**.
- Confirm tables are in the `supabase_realtime` publication (run `realtime.sql` again).
- Check browser console for WebSocket connection errors.

---

## Step 9 — Test RLS

Run `supabase/verification.sql` queries V11 (RLS isolation tests).

Key checks:
- A responder cannot see missions not assigned to them.
- A service user cannot see other service users.
- An anon user (no auth) cannot read any private tables.
- Cross-organisation data is not visible to other org members.

---

## Step 10 — Turn Demo Mode OFF

1. Open **Demo/Live Settings** (`/#/demo-live`).
2. Scroll to **Mode Control**.
3. Toggle **Demo Mode → OFF / Live Mode ON**.
4. Confirm the warning dialog.
5. The app will clear demo data from views and switch to live data sources.

> ⚠️ Once Demo Mode is OFF, the app will show empty states until you have real operational records. This is correct behaviour.

---

## Step 11 — Sign In as Live User

1. Open the Command Dashboard.
2. If redirected to the auth gate, sign in with your admin credentials.
3. Confirm your role badge appears in the status panel.
4. Confirm `Mode: Live` in the LiveModeStatusPanel.

---

## Step 12 — Validate Command Dashboard (Live Mode)

- [ ] Dashboard loads without demo data
- [ ] Mode shows "Live Mode"
- [ ] Auth status shows your role
- [ ] Backend shows "Configured"
- [ ] Realtime status shows "Connected"
- [ ] Creating a mission saves to Supabase
- [ ] Realtime update fires in a second browser tab

---

## Step 13 — Validate Responder PWA

- [ ] Responder PWA loads at `/#/responder-app`
- [ ] Mode shows "Live Mode"
- [ ] Auth required (not demo bypass)
- [ ] Assigned missions appear (created from dashboard)
- [ ] Status updates sync to Supabase and reflect in dashboard
- [ ] Offline queue shows when device goes offline
- [ ] Queued records sync when back online

---

## Step 14 — Validate Service User PWA

- [ ] Service User PWA loads at `/#/service-user-pwa`
- [ ] Mode shows "Live Mode"
- [ ] Service users can only see their own records
- [ ] Wellbeing check-ins submit to Supabase
- [ ] Help signals appear in Command Dashboard
- [ ] Service users cannot see other service users (RLS check)

---

## Step 15 — Validate Evidence Upload

- [ ] Responder can upload evidence file from mission workflow
- [ ] File saves to `evidence-items` private bucket
- [ ] File is NOT publicly accessible via URL
- [ ] Evidence item record appears in `evidence_items` table
- [ ] Coordinator can view evidence via signed URL (future: Run 12)

---

## Step 16 — Validate Reports

- [ ] Reports page loads in Live Mode
- [ ] Report generation creates record in `reports` table
- [ ] Report exports save to `report-exports` bucket
- [ ] Only coordinators/supervisors can access reports

---

## Step 17 — Validate Safety Disclaimers

- [ ] Safety advisory visible on all PWA forms
- [ ] Escalation screens show human review required
- [ ] "does not replace emergency services" visible in live mode
- [ ] AI reviews labelled as advisory only
- [ ] No automatic escalation actions occur without human review

---

## Troubleshooting

**App still shows demo data after switching to Live Mode:**
- Clear localStorage and reload: `localStorage.clear()` in browser console.
- Confirm `demo_record = false` filter is applied in all live queries.

**Auth fails with "No backend configured":**
- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.
- Test connection in Demo/Live Settings → Backend Configuration.
- Check Supabase project is not paused (free tier pauses after inactivity).

**Realtime not updating:**
- Confirm `realtime.sql` was run successfully.
- Check `supabase_realtime` publication includes your tables (run V4 verification query).
- Check RLS — realtime only sends rows the user can SELECT.

**RLS blocking legitimate access:**
- Check the user is in `organisation_members` with correct role.
- Run `SELECT public.current_user_org_ids()` in SQL Editor to debug.
- Run `SELECT public.has_org_role('org-id', array['coordinator'])` to test.

---

## Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is NOT in frontend code or `.env.local`
- [ ] RLS is enabled on all tables (verified via V2 query)
- [ ] Anon access returns 0 rows on all private tables
- [ ] Backend config audit does NOT store full keys (masked only)
- [ ] `.env.local` is in `.gitignore`
- [ ] Demo data is not present in live production project

---

*ResponseLink OS™ · 4P3X Intelligent AI™ · Created by Kyzel Kreates™*
*Advisory and coordination-support software. Not a replacement for emergency services.*
