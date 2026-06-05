/**
 * ============================================================
 * ResponseLink OS™ — Route Registry
 * Run 1 — Identity, Shell, Navigation, Safe Refactor Foundation
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * ARCHITECTURE NOTE (Run 1):
 * This file was previously the Fleet Control OS route registry.
 * Safely rebranded and extended for ResponseLink OS™ in Run 1.
 * Technical route paths preserved to avoid breaking existing logic.
 * Display labels converted to welfare/mobile-response language.
 * New placeholder routes added for: Service User PWA, AI Oversight,
 * Reports, Demo/Live Settings.
 * Run 2 will handle full data model conversion.
 * ============================================================
 */

export const ROUTES = {
  // ── Core ──────────────────────────────────────────────────
  ROOT:       '/',
  DASHBOARD:  '/dashboard',       // → Command Dashboard

  // ── Responders (was: Drivers) ─────────────────────────────
  RESPONDERS:         '/drivers',           // route path preserved, label changed
  RESPONDER_PROFILE:  '/drivers/:driverId', // route path preserved

  // ── Support Units (was: Vehicles) ─────────────────────────
  VEHICLES:        '/vehicles',
  VEHICLE_DETAIL:  '/vehicles/:vehicleId',

  // ── Missions / Visits (was: Fleet / Dispatch) ─────────────
  FLEET:           '/fleet',
  FLEET_VEHICLE:   '/fleet/:vehicleId',
  MISSIONS:        '/dispatch',    // route path preserved, label changed

  // ── Responder Setup (was: Driver Setup) ───────────────────
  RESPONDER_SETUP: '/driver-setup', // route path preserved

  // ── Live Map ──────────────────────────────────────────────
  NAVIGATION: '/navigation',

  // ── Responder PWA (was: AP3X / Driver App) ────────────────
  RESPONDER_PWA:      '/responder-app',   // NEW — alias for Responder PWA landing
  RESPONDER_PWA_LEGACY: '/ap3x',          // preserve legacy route

  // ── Service User PWA (Run 5 — placeholder only in Run 1) ──
  SERVICE_USER_PWA: '/service-user-pwa',

  // ── AI Oversight (was: AI — extended for Run 1) ───────────
  AI_OVERSIGHT: '/ai',            // route path preserved

  // ── Risk & Escalation (was: Safety) ───────────────────────
  RISK:       '/safety',          // route path preserved, label changed

  // ── Compliance ────────────────────────────────────────────
  COMPLIANCE: '/compliance',

  // ── Evidence / Reports (was: Analytics + Incidents) ───────
  ANALYTICS:        '/analytics',
  INCIDENTS:        '/incidents',
  INCIDENT_DETAIL:  '/incidents/:incidentId',
  REPORTS:          '/reports',   // NEW placeholder

  // ── Messaging ─────────────────────────────────────────────
  MESSAGING: '/messaging',

  // ── Demo / Live Settings (NEW placeholder) ────────────────
  DEMO_LIVE: '/demo-live',

  // ── Settings ──────────────────────────────────────────────
  SETTINGS:               '/settings',
  SETTINGS_PROFILE:       '/settings/profile',
  SETTINGS_FLEET:         '/settings/fleet',
  SETTINGS_AI:            '/settings/ai',
  SETTINGS_SECURITY:      '/settings/security',
  SETTINGS_INTEGRATIONS:  '/settings/integrations',

  // ── Auth ──────────────────────────────────────────────────
  AUTH_LOGIN:   '/auth/login',
  AUTH_LOGOUT:  '/auth/logout',
  AUTH_DRIVER:  '/auth/driver',  // driver/responder login — preserved

  // ── Error ─────────────────────────────────────────────────
  NOT_FOUND: '*'
}

// ─── Nav structure for sidebar ────────────────────────────────
// Visible labels use ResponseLink OS™ welfare/mobile-response language.
// Route paths preserved from original to avoid breaking logic.
export const NAV_ITEMS = [
  // ── CORE ──────────────────────────────────────────────────
  {
    id:    'dashboard',
    label: 'Command Dashboard',
    route: ROUTES.DASHBOARD,
    icon:  'LayoutDashboard',
    group: 'core'
  },

  // ── FIELD OPERATIONS ──────────────────────────────────────
  {
    id:    'missions',
    label: 'Missions / Visits',
    route: ROUTES.MISSIONS,
    icon:  'ClipboardList',
    group: 'operations',
  },
  {
    id:    'responders',
    label: 'Responders',
    route: ROUTES.RESPONDERS,
    icon:  'Users',
    group: 'operations'
  },
  {
    id:    'vehicles',
    label: 'Support Units',
    route: ROUTES.VEHICLES,
    icon:  'Car',
    group: 'operations'
  },
  {
    id:        'responder-setup',
    label:     'Set Responder Up With App',
    route:     ROUTES.RESPONDER_SETUP,
    icon:      'Smartphone',
    group:     'operations',
    highlight: true,
  },

  // ── MOBILE APPS ───────────────────────────────────────────
  {
    id:    'navigation',
    label: 'Live Map',
    route: ROUTES.NAVIGATION,
    icon:  'Map',
    group: 'mobile'
  },
  {
    id:    'responder-pwa',
    label: 'Responder PWA',
    route: ROUTES.RESPONDER_PWA,
    icon:  'Smartphone',
    group: 'mobile',
  },
  {
    id:    'service-user-pwa',
    label: 'Service User PWA',
    route: ROUTES.SERVICE_USER_PWA,
    icon:  'HeartHandshake',
    group: 'mobile',
    badge: 'Run 5',
  },

  // ── INTELLIGENCE ──────────────────────────────────────────
  {
    id:        'ai-oversight',
    label:     'AI Oversight',
    route:     ROUTES.AI_OVERSIGHT,
    icon:      'Brain',
    group:     'intelligence',
    highlight: true
  },
  {
    id:    'risk',
    label: 'Risk & Escalation',
    route: ROUTES.RISK,
    icon:  'ShieldAlert',
    group: 'intelligence'
  },
  {
    id:    'compliance',
    label: 'Compliance',
    route: ROUTES.COMPLIANCE,
    icon:  'ClipboardCheck',
    group: 'intelligence'
  },
  {
    id:    'analytics',
    label: 'Analytics',
    route: ROUTES.ANALYTICS,
    icon:  'BarChart3',
    group: 'intelligence'
  },

  // ── REPORTING ─────────────────────────────────────────────
  {
    id:    'reports',
    label: 'Evidence / Reports',
    route: ROUTES.REPORTS,
    icon:  'FileText',
    group: 'reporting'
  },
  {
    id:    'incidents',
    label: 'Incidents',
    route: ROUTES.INCIDENTS,
    icon:  'AlertTriangle',
    group: 'reporting'
  },
  {
    id:    'messaging',
    label: 'Messaging',
    route: ROUTES.MESSAGING,
    icon:  'MessageSquare',
    group: 'reporting'
  },

  // ── SYSTEM ────────────────────────────────────────────────
  {
    id:    'demo-live',
    label: 'Demo / Live Settings',
    route: ROUTES.DEMO_LIVE,
    icon:  'ToggleLeft',
    group: 'system'
  },
  {
    id:    'settings',
    label: 'Settings',
    route: ROUTES.SETTINGS,
    icon:  'Settings',
    group: 'system'
  }
]

export const NAV_GROUPS = {
  core:         { label: null,                  order: 0 },
  operations:   { label: 'Field Operations',    order: 1 },
  mobile:       { label: 'Mobile Apps',         order: 2 },
  intelligence: { label: 'Intelligence',        order: 3 },
  reporting:    { label: 'Reporting',           order: 4 },
  system:       { label: 'System',              order: 5 }
}

export default ROUTES
