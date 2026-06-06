/**
 * ============================================================
 * ResponseLink OS™ — Supabase Auth Service
 * services_supabase_rlAuthService.js
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 10 — Supabase Auth + Realtime Wiring
 *
 * PURPOSE:
 *   Provides Supabase-backed authentication for Live Mode.
 *   In Demo Mode, returns safe demo stubs — no Supabase needed.
 *   Falls back gracefully if Supabase is not configured.
 *
 * ROLES (org-scoped via organisation_members table):
 *   owner | admin | coordinator | supervisor | responder | service_user | viewer
 *
 * SECURITY RULES:
 *   - NEVER log or expose full API keys.
 *   - NEVER use service_role key in frontend.
 *   - Only VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in frontend.
 *   - Auth state is session-persisted by Supabase client.
 *   - RLS enforced server-side — client just reads what it can see.
 *
 * ⚠️  ADVISORY NOTICE:
 *   ResponseLink OS™ is advisory and coordination-support software.
 *   It does not replace emergency services, safeguarding professionals,
 *   clinical judgement, or legal duties.
 * ============================================================
 */

import {
  getSupabaseClient,
  isConfigValid,
  getSupabaseSettings,
} from './services_supabase_supabaseClient'
import { getDemoMode } from './core_rlData'

// ─── Role constants ───────────────────────────────────────────
export const RL_ROLES = {
  OWNER:        'owner',
  ADMIN:        'admin',
  COORDINATOR:  'coordinator',
  SUPERVISOR:   'supervisor',
  RESPONDER:    'responder',
  SERVICE_USER: 'service_user',
  VIEWER:       'viewer',
}

export const RL_ROLE_LABELS = {
  owner:        'Owner',
  admin:        'Administrator',
  coordinator:  'Coordinator',
  supervisor:   'Supervisor',
  responder:    'Responder',
  service_user: 'Service User',
  viewer:       'Viewer',
}

// Role hierarchy — higher index = more permissions
const ROLE_ORDER = [
  RL_ROLES.VIEWER,
  RL_ROLES.SERVICE_USER,
  RL_ROLES.RESPONDER,
  RL_ROLES.COORDINATOR,
  RL_ROLES.SUPERVISOR,
  RL_ROLES.ADMIN,
  RL_ROLES.OWNER,
]

export function hasRole(userRole, requiredRole) {
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(requiredRole)
}

export function canAccessDashboard(role) {
  return hasRole(role, RL_ROLES.COORDINATOR)
}

export function canAccessResponderPWA(role) {
  return hasRole(role, RL_ROLES.RESPONDER)
}

// ─── Demo stubs ───────────────────────────────────────────────
// Returned when Demo Mode is ON — clearly labelled, no real auth.
const DEMO_USER = {
  id:    'demo-user-admin-001',
  email: 'demo@responselink.os',
  user_metadata: {
    full_name: 'Demo Administrator',
    role:      RL_ROLES.ADMIN,
    is_demo:   true,
  },
  _isDemo: true,
}

const DEMO_SESSION = {
  user:        DEMO_USER,
  access_token: 'demo-token-not-real',
  token_type:   'demo',
  _isDemo:      true,
}

const DEMO_PROFILE = {
  id:              'demo-user-admin-001',
  full_name:       'Demo Administrator',
  role:            RL_ROLES.ADMIN,
  organisation_id: 'demo-org-001',
  is_demo:         true,
}

// ─── Internal state ───────────────────────────────────────────
let _authStateListeners = new Set()

function _notifyListeners(event, session) {
  _authStateListeners.forEach(fn => {
    try { fn(event, session) } catch {}
  })
}

// ─── Auth Service ─────────────────────────────────────────────
export const rlAuthService = {

  // ── Is Supabase auth available? ────────────────────────────
  isLiveAuthAvailable() {
    if (getDemoMode()) return false
    const settings = getSupabaseSettings()
    return isConfigValid(settings)
  },

  // ── Current mode ──────────────────────────────────────────
  getMode() {
    return getDemoMode() ? 'demo' : 'live'
  },

  // ── Get current session ───────────────────────────────────
  async getSession() {
    if (getDemoMode()) {
      return { session: DEMO_SESSION, error: null, _isDemo: true }
    }

    const sb = getSupabaseClient()
    if (!sb) {
      return {
        session: null,
        error: { message: 'No backend configured. Configure Supabase in Demo/Live Settings to enable live auth.' },
        _noBackend: true,
      }
    }

    try {
      const { data, error } = await sb.auth.getSession()
      return { session: data?.session || null, error: error || null }
    } catch (e) {
      return { session: null, error: { message: e.message } }
    }
  },

  // ── Get current user ──────────────────────────────────────
  async getUser() {
    if (getDemoMode()) {
      return { user: DEMO_USER, error: null, _isDemo: true }
    }

    const sb = getSupabaseClient()
    if (!sb) return { user: null, error: null, _noBackend: true }

    try {
      const { data, error } = await sb.auth.getUser()
      return { user: data?.user || null, error: error || null }
    } catch (e) {
      return { user: null, error: { message: e.message } }
    }
  },

  // ── Load profile + role from Supabase ─────────────────────
  // Reads from public.profiles joined to organisation_members.
  // Returns null if not configured, returns demo profile in demo mode.
  async getProfile(userId) {
    if (getDemoMode()) return { profile: DEMO_PROFILE, error: null }

    const sb = getSupabaseClient()
    if (!sb) return { profile: null, error: null, _noBackend: true }

    try {
      const { data, error } = await sb
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          created_at,
          organisation_members (
            organisation_id,
            role,
            status,
            organisations ( name, type )
          )
        `)
        .eq('id', userId)
        .single()

      if (error) return { profile: null, error }

      // Flatten the first org membership for convenience
      const membership = data?.organisation_members?.[0] || null
      const profile = {
        ...data,
        role:            membership?.role || RL_ROLES.VIEWER,
        organisation_id: membership?.organisation_id || null,
        org_name:        membership?.organisations?.name || null,
        org_type:        membership?.organisations?.type || null,
      }

      return { profile, error: null }
    } catch (e) {
      return { profile: null, error: { message: e.message } }
    }
  },

  // ── Sign in with email + password ─────────────────────────
  async signIn(email, password) {
    if (getDemoMode()) {
      // Demo mode — never blocks, returns demo session
      return { user: DEMO_USER, session: DEMO_SESSION, error: null, _isDemo: true }
    }

    const sb = getSupabaseClient()
    if (!sb) {
      return {
        user: null,
        session: null,
        error: {
          message: 'No backend configured. Configure Supabase in Demo/Live Settings first.',
        },
        _noBackend: true,
      }
    }

    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password })
      if (error) return { user: null, session: null, error }
      _notifyListeners('SIGNED_IN', data.session)
      return { user: data.user, session: data.session, error: null }
    } catch (e) {
      return { user: null, session: null, error: { message: e.message } }
    }
  },

  // ── Sign out ──────────────────────────────────────────────
  async signOut() {
    if (getDemoMode()) return { error: null, _isDemo: true }

    const sb = getSupabaseClient()
    if (!sb) return { error: null }

    try {
      const { error } = await sb.auth.signOut()
      if (!error) _notifyListeners('SIGNED_OUT', null)
      return { error: error || null }
    } catch (e) {
      return { error: { message: e.message } }
    }
  },

  // ── Subscribe to auth state changes ───────────────────────
  onAuthStateChange(callback) {
    if (getDemoMode()) {
      // Immediately call with demo session
      setTimeout(() => callback('SIGNED_IN', DEMO_SESSION), 0)
      return () => {}
    }

    const sb = getSupabaseClient()
    if (!sb) {
      // No backend — immediately signal not authenticated
      setTimeout(() => callback('SIGNED_OUT', null), 0)
      return () => {}
    }

    const { data } = sb.auth.onAuthStateChange(callback)
    _authStateListeners.add(callback)
    return () => {
      _authStateListeners.delete(callback)
      data?.subscription?.unsubscribe?.()
    }
  },

  // ── Request password reset ────────────────────────────────
  async resetPassword(email) {
    if (getDemoMode()) {
      return { error: { message: 'Password reset not available in Demo Mode.' } }
    }
    const sb = getSupabaseClient()
    if (!sb) return { error: { message: 'No backend configured.' } }

    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/auth/reset-confirm`,
      })
      return { error: error || null }
    } catch (e) {
      return { error: { message: e.message } }
    }
  },

  // ── Update password ───────────────────────────────────────
  async updatePassword(newPassword) {
    if (getDemoMode()) return { error: null, _isDemo: true }
    const sb = getSupabaseClient()
    if (!sb) return { error: { message: 'No backend configured.' } }
    try {
      const { error } = await sb.auth.updateUser({ password: newPassword })
      return { error: error || null }
    } catch (e) {
      return { error: { message: e.message } }
    }
  },
}

export default rlAuthService
