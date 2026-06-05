/**
 * ============================================================
 * ResponseLink OS™ — Application Router
 * Run 1 — Identity, Shell, Navigation, Safe Refactor Foundation
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * ARCHITECTURE NOTE (Run 1):
 * Route PATHS are preserved from the original Fleet Control OS
 * to avoid breaking any existing logic, storage keys, or deeplinks.
 * Display labels and page content have been rebranded.
 * New placeholder routes added: /service-user-pwa, /reports, /demo-live,
 * /responder-app.
 * The /ai route now loads AIOverview (ResponseLink OS™ AI Oversight hub).
 * All other page components are preserved (safety, compliance, analytics,
 * incidents, messaging, settings, dispatch, fleet, vehicles, drivers).
 * First-run redirects to /auth/setup as before.
 * ============================================================
 */

import { createHashRouter, Navigate } from 'react-router-dom'

import AppShell      from './layouts_AppShell'
import AuthGuard     from './components_auth_AuthGuard'

// ── Auth Pages (preserved) ────────────────────────────────────
import Login         from './pages_auth_Login'
import DriverLogin   from './pages_auth_DriverLogin'
import ResetConfirm  from './pages_auth_ResetConfirm'
import Setup         from './pages_auth_Setup'
import DriverImport  from './pages_DriverImport'
import DriverSetup   from './pages_DriverSetup'
import DriverApp     from './pages_DriverApp'     // Responder PWA app — preserved

// ── Command Dashboard ─────────────────────────────────────────
import Dashboard          from './pages_Dashboard'
import CommandDashboard  from './pages_CommandDashboard'  // Run 3 — Mission Control

// ── Field Operations (preserved, labels rebranded) ────────────
import Fleet         from './pages_Fleet'
import Drivers       from './pages_Drivers'       // Responders
import Vehicles      from './pages_Vehicles'      // Support Units
import Dispatch      from './pages_Dispatch'      // Missions

// ── Mobile Apps ───────────────────────────────────────────────
import Navigation    from './pages_Navigation'
import AP3X          from './pages_AP3X'
import ResponderPWA  from './pages_ResponderPWA'      // NEW Run 1
import ServiceUserPWA from './pages_ServiceUserPWA'   // NEW Run 1 placeholder

// ── Intelligence ──────────────────────────────────────────────
import AIOverview    from './pages_AIOverview'    // NEW Run 1 (replaces pages_AI for /ai route)
import Safety        from './pages_Safety'        // Risk & Escalation
import Compliance    from './pages_Compliance'
import Analytics     from './pages_Analytics'

// ── Reporting ─────────────────────────────────────────────────
import Reports       from './pages_Reports'       // NEW Run 1 placeholder
import Incidents     from './pages_Incidents'
import Messaging     from './pages_Messaging'

// ── System ────────────────────────────────────────────────────
import DemoLive      from './pages_DemoLive'      // NEW Run 1 placeholder
import Settings      from './pages_Settings'
import NotFound      from './pages_NotFound'

// Helper — read setup flag without importing full service
const setupDone = () => localStorage.getItem('apex:setup_complete') === 'true'

// Root redirects: first-run → setup, otherwise → dashboard
const RootRedirect = () =>
  setupDone()
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/auth/setup" replace />

// Login redirect: if setup not done, go to setup first
const LoginOrSetup = ({ element }) =>
  !setupDone() ? <Navigate to="/auth/setup" replace /> : element

export const router = createHashRouter([

  // ── First-run Setup (public, before any account exists) ───
  { path: '/auth/setup',         element: <Setup /> },

  // ── Auth Routes (public) ──────────────────────────────────
  { path: '/auth/login',         element: <LoginOrSetup element={<Login />} /> },
  { path: '/auth/driver',        element: <LoginOrSetup element={<DriverLogin />} /> },
  { path: '/auth/reset-confirm', element: <ResetConfirm /> },
  { path: '/driver-import',      element: <DriverImport /> },

  // ── Responder PWA (standalone — no auth guard — mobile-first) ─
  // Route path preserved: /driver-app (original)
  { path: '/driver-app',         element: <DriverApp /> },
  // New alias for ResponseLink OS™ branding
  { path: '/responder-app-direct', element: <DriverApp /> },

  // ── AP3X (legacy standalone — preserved) ─────────────────
  { path: '/ap3x',               element: <AP3X /> },

  // ── Protected App Shell ────────────────────────────────────
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <RootRedirect /> },

      // ── Command Dashboard ──────────────────────────────────
      { path: 'dashboard',              element: <CommandDashboard /> },  // Run 3 Mission Control

      // ── Field Operations (routes preserved, labels rebranded) ─
      { path: 'fleet',                  element: <Fleet /> },
      { path: 'fleet/:vehicleId',       element: <Fleet /> },
      { path: 'drivers',                element: <Drivers /> },       // Responders
      { path: 'drivers/:driverId',      element: <Drivers /> },
      { path: 'vehicles',               element: <Vehicles /> },      // Support Units
      { path: 'vehicles/:vehicleId',    element: <Vehicles /> },
      { path: 'dispatch',               element: <Dispatch /> },      // Missions
      { path: 'driver-setup',           element: <DriverSetup /> },   // Responder Setup

      // ── Mobile Apps ───────────────────────────────────────
      { path: 'navigation',             element: <Navigation /> },
      // Responder PWA landing (Command Dashboard view)
      { path: 'responder-app',          element: <ResponderPWA /> },
      // Service User PWA placeholder (Run 5)
      { path: 'service-user-pwa',       element: <ServiceUserPWA /> },

      // ── Intelligence ──────────────────────────────────────
      // /ai now loads ResponseLink OS™ AI Oversight hub
      { path: 'ai',                     element: <AIOverview /> },
      { path: 'safety',                 element: <Safety /> },        // Risk & Escalation
      { path: 'compliance',             element: <Compliance /> },
      { path: 'analytics',              element: <Analytics /> },

      // ── Reporting ─────────────────────────────────────────
      { path: 'reports',                element: <Reports /> },       // Evidence/Reports placeholder
      { path: 'incidents',              element: <Incidents /> },
      { path: 'incidents/:incidentId',  element: <Incidents /> },
      { path: 'messaging',              element: <Messaging /> },

      // ── System ────────────────────────────────────────────
      { path: 'demo-live',              element: <DemoLive /> },      // Demo/Live Settings placeholder
      { path: 'settings',               element: <Settings /> },
      { path: 'settings/:section',      element: <Settings /> },
    ]
  },

  // ── 404 ───────────────────────────────────────────────────
  { path: '*', element: <NotFound /> }
])

export default router
