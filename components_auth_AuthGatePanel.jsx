/**
 * ============================================================
 * ResponseLink OS™ — AuthGatePanel
 * components_auth_AuthGatePanel.jsx
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 10 — Supabase Auth + Realtime Wiring
 *
 * PURPOSE:
 *   Renders an appropriate gate panel for any auth state:
 *   - Loading: spinner
 *   - Demo Mode: passes through (renders children)
 *   - No backend configured: setup guidance
 *   - Not authenticated: login form
 *   - Insufficient role: access denied
 *   - Authenticated: renders children
 *
 * USAGE:
 *   <AuthGatePanel requiredRole="coordinator">
 *     <CommandDashboard />
 *   </AuthGatePanel>
 *
 *   <AuthGatePanel surface="responder">
 *     <ResponderPWA />
 *   </AuthGatePanel>
 *
 * ⚠️  ADVISORY:
 *   This gate is advisory — it complements server-side RLS.
 *   RLS in Supabase is the authoritative access control layer.
 * ============================================================
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './components_ui_Icon'
import { useRLAuth } from './hooks_useRLAuth'
import { RL_ROLES, RL_ROLE_LABELS, hasRole } from './services_supabase_rlAuthService'
import { getDemoMode } from './core_rlData'
import { ROUTES } from './config_routes'

// ─── Colour tokens ─────────────────────────────────────────────
const GOLD   = '#C9A84C'
const CYAN   = '#06b6d4'
const RED    = '#ef4444'
const PURPLE = '#a855f7'
const GREEN  = '#22c55e'

// ─── Shared tiny UI ───────────────────────────────────────────
function GateWrap({ children }) {
  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}

function GateCard({ children, accent = GOLD }) {
  return (
    <div className="rounded-2xl border p-6"
         style={{ background: '#0a0515', borderColor: `${accent}30` }}>
      {children}
    </div>
  )
}

function BrandMark() {
  return (
    <div className="flex flex-col items-center gap-2 mb-6">
      <div className="w-14 h-14 rounded-xl flex items-center justify-center"
           style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}30` }}>
        <span className="font-bold text-xl" style={{ color: GOLD }}>RL</span>
      </div>
      <div className="text-center">
        <div className="text-sm font-bold text-white">ResponseLink OS™</div>
        <div className="text-2xs text-slate-600">Powered by 4P3X Intelligent AI™</div>
      </div>
    </div>
  )
}

// ─── Loading panel ────────────────────────────────────────────
function LoadingPanel() {
  return (
    <GateWrap>
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-slate-500 text-xs">Loading…</span>
      </div>
    </GateWrap>
  )
}

// ─── No backend panel ─────────────────────────────────────────
function NoBackendPanel({ surface }) {
  const navigate = useNavigate()
  return (
    <GateWrap>
      <GateCard accent={GOLD}>
        <BrandMark />
        <div className="rounded-lg p-4 mb-5"
             style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}25` }}>
          <div className="flex items-center gap-2 mb-2">
            <Icon name="Database" size={14} style={{ color: GOLD }} />
            <span className="text-xs font-bold" style={{ color: GOLD }}>Live Mode — No Backend Configured</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Live Mode is active. No live backend is connected yet. Configure Supabase or
            another backend provider to enable real users, authentication, persistent records,
            realtime dashboards, responder updates, service user check-ins, evidence records,
            and sync.
          </p>
        </div>
        <button
          onClick={() => navigate(ROUTES.DEMO_LIVE || '/demo-live')}
          className="w-full py-2.5 rounded-lg text-xs font-semibold text-black transition-opacity hover:opacity-90"
          style={{ background: GOLD }}>
          Configure Backend → Demo/Live Settings
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full mt-2 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors">
          ← Return to homepage
        </button>
      </GateCard>
    </GateWrap>
  )
}

// ─── Login panel ─────────────────────────────────────────────
function LoginPanel({ surface, onSuccess }) {
  const { signIn, isLoading, error } = useRLAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [localErr, setLocalErr] = useState('')

  const label = surface === 'responder'
    ? 'Responder Login'
    : surface === 'service_user'
      ? 'Service User Access'
      : 'Coordinator Login'

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalErr('')
    if (!email.trim() || !password) {
      setLocalErr('Email and password are required.')
      return
    }
    const result = await signIn(email.trim(), password)
    if (result?.error) {
      setLocalErr(result.error.message || 'Sign in failed.')
    } else if (onSuccess) {
      onSuccess(result)
    }
  }

  const displayErr = localErr || error?.message

  return (
    <GateWrap>
      <GateCard accent={CYAN}>
        <BrandMark />
        <h2 className="text-sm font-bold text-white text-center mb-5">{label}</h2>

        {displayErr && (
          <div className="rounded-lg p-3 mb-4"
               style={{ background: `${RED}10`, border: `1px solid ${RED}30` }}>
            <p className="text-xs text-red-400">{displayErr}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-2xs text-slate-500 uppercase tracking-wider block mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              required
              className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="text-2xs text-slate-500 uppercase tracking-wider block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: CYAN }}>
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800 space-y-2">
          <p className="text-2xs text-slate-600 text-center leading-relaxed">
            ⚠ ResponseLink OS™ is advisory and coordination-support software. It does not
            replace emergency services, safeguarding professionals, or clinical judgement.
          </p>
          <p className="text-2xs text-slate-600 text-center">
            If someone is in immediate danger, contact emergency services.
          </p>
        </div>
      </GateCard>
    </GateWrap>
  )
}

// ─── Access denied panel ─────────────────────────────────────
function AccessDeniedPanel({ requiredRole, userRole }) {
  const navigate = useNavigate()
  return (
    <GateWrap>
      <GateCard accent={RED}>
        <BrandMark />
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-3"
               style={{ background: `${RED}12`, border: `1px solid ${RED}30` }}>
            <Icon name="ShieldOff" size={20} style={{ color: RED }} />
          </div>
          <h2 className="text-sm font-bold text-white">Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-1">
            This section requires a <strong className="text-slate-300">{RL_ROLE_LABELS[requiredRole] || requiredRole}</strong> account
            {userRole ? ` (you have: ${RL_ROLE_LABELS[userRole] || userRole})` : ''}.
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full py-2.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-300 hover:border-slate-500 transition-colors">
          ← Return to homepage
        </button>
      </GateCard>
    </GateWrap>
  )
}

// ─── AuthGatePanel — main export ─────────────────────────────
/**
 * AuthGatePanel
 *
 * Props:
 *   children       — content to render when authenticated + authorised
 *   requiredRole   — minimum role required (default: 'viewer')
 *   surface        — 'dashboard' | 'responder' | 'service_user' | 'admin'
 *   allowDemo      — if true, always passes through in Demo Mode (default: true)
 *   showLoginForm  — if true, shows login form when not authed (default: true)
 */
export default function AuthGatePanel({
  children,
  requiredRole = RL_ROLES.VIEWER,
  surface      = 'dashboard',
  allowDemo    = true,
  showLoginForm = true,
}) {
  const {
    user, role, isLoading, noBackend, isAuthenticated, isDemo, can, reload,
  } = useRLAuth()

  // ── Demo Mode → always pass through if allowed ────────────
  if (isDemo && allowDemo) return children

  // ── Loading ───────────────────────────────────────────────
  if (isLoading) return <LoadingPanel />

  // ── No backend configured in Live Mode ────────────────────
  if (noBackend && !isDemo) return <NoBackendPanel surface={surface} />

  // ── Not authenticated ─────────────────────────────────────
  if (!isAuthenticated) {
    if (showLoginForm) return <LoginPanel surface={surface} onSuccess={reload} />
    return <NoBackendPanel surface={surface} />
  }

  // ── Insufficient role ─────────────────────────────────────
  if (!can(requiredRole)) {
    return <AccessDeniedPanel requiredRole={requiredRole} userRole={role} />
  }

  // ── Authorised ────────────────────────────────────────────
  return children
}
