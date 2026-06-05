/**
 * ============================================================
 * ResponseLink OS™ — Application Router
 * Run 9 — No Auth — Direct to Dashboard
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Auth removed for demo deployment — all routes open.
 * Root redirects straight to /dashboard.
 * ============================================================
 */

import { createHashRouter, Navigate } from 'react-router-dom'

import AppShell       from './layouts_AppShell'

// ── Command Dashboard ─────────────────────────────────────────
import CommandDashboard  from './pages_CommandDashboard'

// ── Field Operations ──────────────────────────────────────────
import Fleet          from './pages_Fleet'
import Drivers        from './pages_Drivers'
import Vehicles       from './pages_Vehicles'
import Dispatch       from './pages_Dispatch'
import DriverSetup    from './pages_DriverSetup'

// ── Mobile Apps ───────────────────────────────────────────────
import Navigation     from './pages_Navigation'
import AP3X           from './pages_AP3X'
import ResponderPWA   from './pages_ResponderPWA'
import ServiceUserPWA from './pages_ServiceUserPWA'
import DriverApp      from './pages_DriverApp'

// ── Intelligence ──────────────────────────────────────────────
import AIOverview     from './pages_AIOverview'
import Safety         from './pages_Safety'
import Compliance     from './pages_Compliance'
import Analytics      from './pages_Analytics'

// ── Reporting ─────────────────────────────────────────────────
import Reports        from './pages_Reports'
import Incidents      from './pages_Incidents'
import Messaging      from './pages_Messaging'

// ── System ────────────────────────────────────────────────────
import DemoLive       from './pages_DemoLive'
import Settings       from './pages_Settings'
import NotFound       from './pages_NotFound'

export const router = createHashRouter([

  // ── Standalone PWA routes (no shell) ─────────────────────
  { path: '/driver-app',           element: <DriverApp /> },
  { path: '/responder-app-direct', element: <DriverApp /> },
  { path: '/ap3x',                 element: <AP3X /> },

  // ── Main App Shell (no auth guard) ───────────────────────
  {
    path: '/',
    element: <AppShell />,
    children: [

      // Root → dashboard
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // ── Command Dashboard ────────────────────────────────
      { path: 'dashboard',             element: <CommandDashboard /> },

      // ── Field Operations ─────────────────────────────────
      { path: 'fleet',                 element: <Fleet /> },
      { path: 'fleet/:vehicleId',      element: <Fleet /> },
      { path: 'drivers',               element: <Drivers /> },
      { path: 'drivers/:driverId',     element: <Drivers /> },
      { path: 'vehicles',              element: <Vehicles /> },
      { path: 'vehicles/:vehicleId',   element: <Vehicles /> },
      { path: 'dispatch',              element: <Dispatch /> },
      { path: 'driver-setup',          element: <DriverSetup /> },

      // ── Mobile Apps ──────────────────────────────────────
      { path: 'navigation',            element: <Navigation /> },
      { path: 'responder-app',         element: <ResponderPWA /> },
      { path: 'service-user-pwa',      element: <ServiceUserPWA /> },

      // ── Intelligence ─────────────────────────────────────
      { path: 'ai',                    element: <AIOverview /> },
      { path: 'safety',                element: <Safety /> },
      { path: 'compliance',            element: <Compliance /> },
      { path: 'analytics',             element: <Analytics /> },

      // ── Reporting ────────────────────────────────────────
      { path: 'reports',               element: <Reports /> },
      { path: 'incidents',             element: <Incidents /> },
      { path: 'incidents/:incidentId', element: <Incidents /> },
      { path: 'messaging',             element: <Messaging /> },

      // ── System ───────────────────────────────────────────
      { path: 'demo-live',             element: <DemoLive /> },
      { path: 'settings',              element: <Settings /> },
      { path: 'settings/:section',     element: <Settings /> },
    ]
  },

  // ── 404 ──────────────────────────────────────────────────
  { path: '*', element: <NotFound /> }
])

export default router
