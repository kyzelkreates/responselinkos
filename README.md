# ResponseLink OS™

**AI-Assisted Community Welfare & Mobile Response Platform**
Powered by **4P3X Intelligent AI™** · Created by **Kyzel Kreates™**

---

## Overview

ResponseLink OS™ is a local-first, advisory coordination platform designed to help community organisations coordinate welfare visits, outreach tasks, responder check-ins, service user check-ins, incident reports, escalation workflows, and evidence capture.

It operates through three interfaces:

| Interface | Route | Purpose |
|---|---|---|
| **Command Dashboard** | `/dashboard` | Supervisor/coordinator mission control |
| **Responder PWA** | `/responder-app` | Field responder mobile workflow |
| **Service User PWA** | `/service-user-pwa` | Service user check-ins and help requests |

---

## ⚠ Advisory Notice

ResponseLink OS™ is **advisory and coordination-support software**. It does **not** replace:
- Emergency services
- Safeguarding professionals
- Clinical judgement
- Legal duties
- Organisational procedures

**If someone is in immediate danger, contact emergency services immediately.**

All risk prompts, AI summaries, and escalation alerts require human supervisor review.

---

## Architecture — 9-Run MVP

| Run | Description |
|---|---|
| Run 1 | Identity, shell, navigation, branding, safety wording |
| Run 2 | Local-first SSOT data model, demo/live separation |
| Run 3 | Command Dashboard mission-control interface |
| Run 4 | Responder PWA full workflow |
| Run 5 | Service User PWA full workflow |
| Run 6 | Dashboard-to-PWA local-first sync simulation |
| Run 7 | Risk, escalation, supervisor review, evidence gaps |
| Run 8 | 4P3X Intelligent AI™ advisory oversight + reports |
| Run 9 | Backend-ready live mode, API config, final MVP polish |

---

## Modes

### Demo Mode (Default)
- Shows simulated/fake labelled records only
- Full functionality without any backend
- Safe for investor, grant, and product demonstrations
- Records clearly labelled as `demoRecord: true`
- No real welfare data should be entered in Demo Mode

### Live Mode
- Hides/clears demo records
- Requires configured backend for multi-device sync and persistence
- Authentication and access controls required before entering real data
- Backend setup: see `RESPONSELINK_SUPABASE_SETUP.txt`

Toggle Demo/Live in: **Demo / Live Settings** (`/demo-live`)

---

## Backend Architecture

### Local-First (All Runs)
All data stored in browser `localStorage` via SSOT layer (`core_rlData.js`).
Works fully offline and without any backend.

### Supabase (Recommended — Run 10)
PostgreSQL · Row Level Security · Auth · Realtime

**Safe environment variables (public only):**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (anon/public key only)
```

**4P3X API Config Guard™ — BLOCKED from frontend:**
```
SUPABASE_SERVICE_ROLE_KEY  ← server-side only
DATABASE_URL               ← server-side only
JWT_SECRET                 ← server-side only
OPENAI_API_KEY             ← server-side only
```

See `.env.example` for full template.
See `RESPONSELINK_SUPABASE_SETUP.txt` for schema and RLS planning.

### Other Providers (Future — Run 10+)
- Firebase (optional)
- AWS / Custom (optional)
- Generic REST endpoint (optional)

---

## AI Oversight — 4P3X Intelligent AI™

**Advisory only. Local rule-based. No external API keys.**

| Agent | Purpose |
|---|---|
| 4P3X AI™ 1 — Welfare Risk AI | Monitors missions, check-ins, overdue alerts, escalations |
| 4P3X AI™ 2 — Safeguarding & Evidence AI | Evidence completeness, report readiness, wording review |

4P3X Intelligent AI™ does NOT:
- Make safeguarding decisions
- Diagnose people
- Contact emergency services
- Verify facts independently
- Override human supervisors
- Create or alter evidence records

---

## Reports

Available report types (all advisory, local-first):
- Mission Report
- Welfare Visit Report
- Incident Report
- Service User Summary (supervisor/internal use only)
- Grant / Impact Demo Report

All reports include:
- ResponseLink OS™ branding
- Data freshness / sync status warnings
- Evidence limitation disclaimers
- Advisory-only labels

---

## PWA (Progressive Web App)

| Feature | Status |
|---|---|
| Installable (PWA) | ✓ Supported |
| Offline-first | ✓ localStorage-based |
| Responder PWA | ✓ Mobile-optimised |
| Service User PWA | ✓ Mobile-optimised |
| Push notifications | Planned (Run 10) |
| Background sync | Planned (Run 10) |

App name: **ResponseLink OS™**
Short name: **ResponseLink**

---

## Safety Boundaries

The system explicitly does NOT:
- Guarantee safety of any person
- Make final safeguarding decisions
- Diagnose health conditions
- Contact emergency services automatically
- Replace professional judgement
- Verify facts independently
- Make autonomous welfare decisions

---

## Setup

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Environment (safe variables only)
cp .env.example .env.local
# Edit .env.local — never commit to git
```

---

## File Structure

```
pages_CommandDashboard.jsx   — Run 3 Mission Control
pages_ResponderPWA.jsx       — Run 4 Responder workflow
pages_ServiceUserPWA.jsx     — Run 5 Service User workflow
pages_DemoLive.jsx           — Run 9 Backend-ready settings
pages_AIOverview.jsx         — Run 8 AI Oversight
pages_Reports.jsx            — Run 8 Report previews
pages_Safety.jsx             — Run 7 Risk & Escalation Centre

core_rlData.js               — SSOT data model (Run 2)
core_rlDemoData.js           — Demo seed data (Run 2)
core_rlSelectors.js          — Dashboard selectors (Run 3)
core_rlSyncEngine.js         — Sync simulation (Run 6)
core_rlRiskEngine.js         — Risk engine (Run 7)
core_rlAIEngine.js           — AI advisory engine (Run 8)

.env.example                 — Safe env template (Run 9)
RESPONSELINK_SUPABASE_SETUP.txt — Backend SQL planning (Run 9)
```

---

## Known Limitations

- **No real backend** — localStorage only unless Supabase configured (Run 10)
- **No real authentication** — Run 10
- **No real multi-device sync** — Run 10
- **No real emergency dispatch** — by design (advisory only)
- **AI is advisory** — local rule-based, no external LLM
- **Demo records are fake** — clearly labelled
- **Real deployment requires** data protection/consent/access control review

---

## Optional Future Runs

| Run | Description |
|---|---|
| Run 10 | Full Supabase live backend, Auth, real sync |
| Run 11 | Portfolio / Grant / Investor case study polish |
| Run 12 | Multi-organisation / white-label version |

---

## Branding

**ResponseLink OS™**
AI-Assisted Community Welfare & Mobile Response Platform
Powered by **4P3X Intelligent AI™**
Created by **Kyzel Kreates™**

*This project was refactored from a fleet/dashboard/PWA architecture into ResponseLink OS™ as a modular local-first welfare coordination platform.*

---

*ResponseLink OS™ · 9-Run MVP Complete · Run 9 · Kyzel Kreates™*
