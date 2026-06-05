/**
 * ============================================================
 * ResponseLink OS™ — App Configuration
 * Run 1 — Identity, Shell, Navigation, Safe Refactor Foundation
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 * ============================================================
 */

export const APP_CONFIG = {
  name:        'ResponseLink OS™',
  shortName:   'ResponseLink',
  version:     '1.0.0',
  buildStage:  'Run 1 — Identity & Shell Foundation',
  tagline:     'AI-Assisted Community Welfare & Mobile Response Platform',

  branding: {
    full:       'ResponseLink OS™',
    powered:    'Powered by 4P3X Intelligent AI™',
    creator:    'Created by Kyzel Kreates™',
    tagline:    'AI-Assisted Community Welfare & Mobile Response Platform',
  },

  products: {
    commandDashboard: {
      name:   'ResponseLink OS™ Command Dashboard',
      short:  'Command Dashboard',
      route:  '/dashboard'
    },
    responderPWA: {
      name:   'ResponseLink OS™ Responder PWA',
      short:  'Responder PWA',
      route:  '/responder-app'
    },
    serviceUserPWA: {
      name:   'ResponseLink OS™ Service User PWA',
      short:  'Service User PWA',
      route:  '/service-user-pwa',
      status: 'reserved-run-5'
    }
  },

  // ── Safety Advisory (must be displayed on all main areas) ──
  safetyNotice: 'ResponseLink OS™ is advisory and coordination-support software. It does not replace emergency services, safeguarding professionals, clinical judgement, or legal duties. If someone is in immediate danger, contact emergency services.',

  theme: {
    default: 'dark',
    options: ['dark'],
    // ResponseLink OS™ visual identity: black, metallic gold, metallic silver, green, purple
    palette: {
      base:       '#0a0000',
      surface:    '#0f0505',
      gold:       '#C9A84C',
      silver:     '#A8A9AD',
      green:      '#22c55e',
      purple:     '#a855f7',
    }
  },

  features: {
    sidebar:      true,
    topnav:       true,
    pwa:          true,
    routing:      true,
    auth:         false,
    maps:         false,
    ai:           false,
    realtime:     false,
    offline:      false,
    notifications: false
  }
}

export default APP_CONFIG
