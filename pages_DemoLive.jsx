/**
 * ============================================================
 * ResponseLink OS™ — Demo / Live Settings & Backend Setup
 * pages_DemoLive.jsx  (route: /demo-live)
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 9 — Backend-Ready Live Mode, API Config, Final MVP
 *
 * 4P3X API Config Guard™
 * ──────────────────────
 * • Only public/client-safe keys (ANON keys) may be stored
 *   in the frontend or in localStorage.
 * • SUPABASE_SERVICE_ROLE_KEY — BLOCKED FROM FRONTEND
 * • OPENAI_API_KEY            — BLOCKED FROM FRONTEND
 * • JWT_SECRET                — BLOCKED FROM FRONTEND
 * • DATABASE_URL              — BLOCKED FROM FRONTEND
 * • PRIVATE_KEY               — BLOCKED FROM FRONTEND
 * • WEBHOOK_SECRET            — BLOCKED FROM FRONTEND
 * • Admin tokens              — BLOCKED FROM FRONTEND
 * • Only SUPABASE_ANON_KEY    — safe for frontend use
 *
 * Demo mode remains fully functional without any backend.
 *
 * ⚠ ADVISORY NOTICE:
 *   ResponseLink OS™ is advisory and coordination-support software.
 *   It does not replace emergency services, safeguarding professionals,
 *   clinical judgement, or legal duties.
 * ============================================================
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './components_ui_Icon'
import { ROUTES } from './config_routes'
import {
  getDemoMode, toggleDemoMode, clearDemoData,
  resetToEmptyLiveState, getStateCounts,
  validateResponseLinkState, appSettings, getLiveModeStatus,
} from './core_rlData'
import { seedDemoData } from './core_rlDemoData'
import {
  getSupabaseSettings, saveSupabaseSettings,
  isConfigValid, testSupabaseConnection, isSupabaseReady,
} from './services_supabase_supabaseClient'

// ─── Colour tokens ─────────────────────────────────────────────
const GOLD   = '#C9A84C'
const GREEN  = '#22c55e'
const PURPLE = '#a855f7'
const RED    = '#ef4444'
const AMBER  = '#f59e0b'
const CYAN   = '#06b6d4'
const SLATE  = '#A8A9AD'

// ─── Blocked secret names — never accepted or logged ──────────
const BLOCKED_FIELD_NAMES = [
  'service_role_key','serviceRoleKey','SERVICE_ROLE',
  'openai_api_key','OPENAI_API_KEY',
  'jwt_secret','JWT_SECRET',
  'database_url','DATABASE_URL',
  'private_key','PRIVATE_KEY',
  'webhook_secret','WEBHOOK_SECRET',
  'stripe_secret','STRIPE_SECRET_KEY',
  'admin_token','ADMIN_TOKEN',
  'groq_api_key','GROQ_API_KEY',
]
function isBlockedValue(val = '') {
  const v = val.toLowerCase()
  return BLOCKED_FIELD_NAMES.some(b => v.includes(b.toLowerCase())) ||
    /^eyJ[A-Za-z0-9_-]{20,}/.test(val) // JWT pattern — likely service token
}

// ─── Tiny shared UI ────────────────────────────────────────────
function Card({ children, accent = GOLD, className = '' }) {
  return (
    <div className={`rounded-xl border p-5 ${className}`}
         style={{ background: '#0a050a', borderColor: `${accent}25` }}>
      {children}
    </div>
  )
}

function SectionTitle({ icon, title, sub, accent = GOLD }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
        <Icon name={icon} size={15} style={{ color: accent }} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {sub && <p className="text-2xs text-slate-600">{sub}</p>}
      </div>
    </div>
  )
}

function Advisory({ children, color = AMBER }) {
  const tc = color===RED ? '#fca5a5' : color===AMBER ? '#fde68a' : color===CYAN ? '#67e8f9' : SLATE
  return (
    <div className="rounded-xl border px-4 py-3 flex items-start gap-2.5"
         style={{ background: `${color}06`, borderColor: `${color}20` }}>
      <Icon name="ShieldAlert" size={12} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <p className="text-2xs leading-relaxed" style={{ color: tc }}>{children}</p>
    </div>
  )
}

function StatusBadge({ ok, labelOk, labelNo, icon = 'Circle' }) {
  const color = ok ? GREEN : AMBER
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold"
          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
      <Icon name={ok ? 'CheckCircle2' : 'Clock'} size={11} />
      {ok ? labelOk : labelNo}
    </span>
  )
}

function MaskedField({ label, value, onChange, placeholder, helpText, blocked }) {
  const [show, setShow] = useState(false)
  const [warn, setWarn] = useState('')

  const handleChange = (e) => {
    const v = e.target.value
    if (isBlockedValue(v)) {
      setWarn('⛔ 4P3X API Config Guard™: This looks like a backend-only secret (service role key, JWT, or admin token). It must NOT be stored in the frontend. Only public anon keys are permitted here.')
      return
    }
    setWarn('')
    onChange(v)
  }

  return (
    <div>
      <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="flex-1 rounded-xl border px-3 py-2.5 text-sm text-white placeholder-slate-700 focus:outline-none font-mono"
          style={{ background: '#0a050a', borderColor: blocked ? '#ef444430' : '#C9A84C25' }}
        />
        <button onClick={() => setShow(s => !s)}
          className="flex items-center justify-center w-9 h-9 rounded-xl border"
          style={{ borderColor: '#C9A84C20', background: '#C9A84C08' }}
          title={show ? 'Hide' : 'Show'}>
          <Icon name={show ? 'EyeOff' : 'Eye'} size={14} style={{ color: GOLD }} />
        </button>
      </div>
      {warn && <p className="text-2xs mt-1 px-2 py-1 rounded" style={{ background: '#ef444410', color: '#fca5a5' }}>{warn}</p>}
      {helpText && !warn && <p className="text-2xs text-slate-700 mt-1">{helpText}</p>}
    </div>
  )
}

// ─── Backend provider options ──────────────────────────────────
const PROVIDERS = [
  {
    id:          'supabase',
    label:       'Supabase',
    sub:         'Recommended — Open source. PostgreSQL. RLS. Auth.',
    icon:        'Database',
    color:       GREEN,
    recommended: true,
    available:   true,
  },
  {
    id:    'firebase',
    label: 'Firebase',
    sub:   'Google Firebase / Firestore — future option',
    icon:  'Cloud',
    color: AMBER,
    available: false,
  },
  {
    id:    'aws',
    label: 'AWS / Custom',
    sub:   'AWS DynamoDB / Amplify / custom REST — future option',
    icon:  'Server',
    color: AMBER,
    available: false,
  },
  {
    id:    'rest',
    label: 'Generic REST / Custom Endpoint',
    sub:   'Custom REST API backend — future option',
    icon:  'Globe',
    color: CYAN,
    available: false,
  },
  {
    id:    'local',
    label: 'Local Only (No Backend)',
    sub:   'Demo and offline testing mode only',
    icon:  'HardDrive',
    color: SLATE,
    available: true,
  },
]

// ─── Supabase Config Panel ─────────────────────────────────────
function SupabasePanel({ onSave }) {
  const existing      = getSupabaseSettings()
  const [url,    setUrl]    = useState(existing.url    || '')
  const [anon,   setAnon]   = useState(existing.anonKey|| '')
  const [label,  setLabel]  = useState(existing.projectLabel || '')
  const [saved,  setSaved]  = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saveErr,  setSaveErr] = useState('')

  const handleSave = () => {
    setSaveErr('')
    if (isBlockedValue(url) || isBlockedValue(anon)) {
      setSaveErr('⛔ 4P3X API Config Guard™: Blocked secret detected. Only public anon keys are permitted.')
      return
    }
    saveSupabaseSettings({ enabled: !!(url && anon), url, anonKey: anon, projectLabel: label })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onSave?.()
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // If no real config saved, simulate safely
      const cfg = getSupabaseSettings()
      if (!isConfigValid(cfg)) {
        setTestResult({ ok: false, message: 'Configuration not complete. Enter Supabase URL and anon key first.' })
        return
      }
      const result = await testSupabaseConnection()
      setTestResult(result)
    } catch (e) {
      setTestResult({ ok: false, message: `Connection error: ${e.message}` })
    } finally {
      setTesting(false)
    }
  }

  const isValid = url.startsWith('https://') && anon.length > 20 && !isBlockedValue(url) && !isBlockedValue(anon)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border px-4 py-3"
           style={{ background: '#22c55e06', borderColor: '#22c55e20' }}>
        <p className="text-2xs font-bold mb-1" style={{ color: GREEN }}>4P3X API Config Guard™ — Supabase Safety Rules</p>
        <ul className="space-y-0.5">
          {[
            '✓ SUPABASE_ANON_KEY — safe for frontend storage',
            '⛔ SUPABASE_SERVICE_ROLE_KEY — NEVER in frontend',
            '⛔ Database passwords — NEVER in frontend',
            '⛔ JWT secrets — NEVER in frontend',
            '✓ SUPABASE_URL — safe for frontend storage',
          ].map((r, i) => (
            <li key={i} className="text-2xs" style={{ color: r.startsWith('⛔') ? '#fca5a5' : '#86efac' }}>{r}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Supabase Project URL
          </label>
          <input
            type="text" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://your-project.supabase.co"
            className="w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder-slate-700 focus:outline-none"
            style={{ background: '#0a050a', borderColor: '#C9A84C25' }}
          />
          <p className="text-2xs text-slate-700 mt-1">Your Supabase project URL (public / safe)</p>
        </div>

        <MaskedField
          label="Supabase Anon Key (Public Key Only)"
          value={anon}
          onChange={setAnon}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
          helpText="Anon/public key only. Find it in Supabase → Settings → API → anon key. Never use service_role key here."
        />

        <div>
          <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Project Label / Name (optional)
          </label>
          <input
            type="text" value={label} onChange={e => setLabel(e.target.value)}
            placeholder="e.g. My Organisation — ResponseLink OS"
            className="w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder-slate-700 focus:outline-none"
            style={{ background: '#0a050a', borderColor: '#C9A84C25' }}
          />
        </div>
      </div>

      {saveErr && (
        <div className="rounded-xl border px-4 py-3" style={{ background: '#ef444408', borderColor: '#ef444330' }}>
          <p className="text-xs text-red-300">{saveErr}</p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold"
          style={{ background: isValid ? GOLD : '#374151', color: isValid ? '#000' : '#6b7280' }}
          disabled={!url || !anon}>
          <Icon name={saved ? 'CheckCircle2' : 'Save'} size={13} />
          {saved ? 'Saved!' : 'Save Configuration'}
        </button>

        <button onClick={handleTest} disabled={testing || !isValid}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border"
          style={{ borderColor: '#22c55e25', color: GREEN, background: '#22c55e08' }}>
          <Icon name={testing ? 'Loader' : 'Wifi'} size={13}
                className={testing ? 'animate-spin' : ''} />
          {testing ? 'Testing…' : 'Test Connection'}
        </button>
      </div>

      {testResult && (
        <div className="rounded-xl border px-4 py-3"
             style={{ background: testResult.ok ? '#22c55e08' : '#ef444408', borderColor: testResult.ok ? '#22c55e25' : '#ef444325' }}>
          <div className="flex items-center gap-2">
            <Icon name={testResult.ok ? 'CheckCircle2' : 'AlertCircle'} size={14}
                  style={{ color: testResult.ok ? GREEN : RED }} />
            <p className="text-xs font-bold" style={{ color: testResult.ok ? GREEN : RED }}>
              {testResult.ok ? 'Connection successful' : 'Connection failed or not configured'}
            </p>
          </div>
          {testResult.message && <p className="text-2xs text-slate-500 mt-1">{testResult.message}</p>}
          {!testResult.ok && (
            <p className="text-2xs text-slate-700 mt-1">
              Configuration saved locally. Real connection testing requires a valid Supabase project and anon key.
              Backend features (real sync, auth, multi-device) are available via Supabase backend configuration.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Future provider placeholder ──────────────────────────────
function FutureProviderPanel({ name, fields, color = AMBER }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border px-4 py-3"
           style={{ background: `${color}06`, borderColor: `${color}20` }}>
        <p className="text-xs font-bold mb-1" style={{ color }}>
          {name} — Future Optional Backend
        </p>
        <p className="text-2xs text-slate-500 leading-relaxed">
          {name} support is planned as an optional future backend provider.
          Not required for demo mode. Configuration and authentication setup
          will be available in a future backend run.
        </p>
        <p className="text-2xs mt-1" style={{ color }}>
          4P3X API Config Guard™ — backend-only secrets must remain server-side.
          Never store service credentials, admin tokens, or database passwords in frontend.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.name}>
            <label className="block text-2xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              {f.name}
            </label>
            <input disabled placeholder={f.placeholder}
              className="w-full rounded-xl border px-3 py-2.5 text-xs text-slate-700 placeholder-slate-800 cursor-not-allowed"
              style={{ background: '#0a050a', borderColor: '#1e1e1e' }} />
            {f.note && <p className="text-2xs text-slate-800 mt-0.5">{f.note}</p>}
          </div>
        ))}
      </div>
      <p className="text-2xs text-slate-700 px-2">
        Backend implementation via Supabase is available now. Fields above are planning placeholders only.
        No data is submitted.
      </p>
    </div>
  )
}


// ─── Sync mode options ─────────────────────────────────────────
const SYNC_MODES = [
  { id: 'local_only',     label: 'Local Only',          sub: 'No backend — demo/offline use only', icon: 'HardDrive', color: '#A8A9AD' },
  { id: 'manual',         label: 'Manual Sync',         sub: 'Sync on demand — no automatic push', icon: 'RefreshCw',  color: '#f59e0b' },
  { id: 'near_realtime',  label: 'Near-Real-Time Sync', sub: 'Periodic sync every 30–60s',         icon: 'Clock',      color: '#06b6d4' },
  { id: 'realtime',       label: 'Realtime Sync',       sub: 'Supabase Realtime — live streaming', icon: 'Zap',        color: '#22c55e' },
]

// ─── Main page ─────────────────────────────────────────────────
export default function DemoLive() {
  const navigate   = useNavigate()

  const [demoMode,     setDemoModeState] = useState(getDemoMode)
  const [counts,       setCounts]        = useState(() => getStateCounts())
  const [liveStatus,   setLiveStatus]    = useState(() => getLiveModeStatus())
  const [seedResult,   setSeedResult]    = useState(null)
  const [validation,   setValidation]    = useState(null)
  const [busy,         setBusy]          = useState(false)
  const [confirmReset, setConfirmReset]  = useState(false)
  const [activeTab,    setActiveTab]     = useState('mode')
  const [sbConfigured, setSbConfigured]  = useState(() => isSupabaseReady())
  const [syncMode,       setSyncMode]     = useState(() => {
    const s = appSettings.get()
    return s.syncMode || 'local_only'
  })
  const [selectedProvider, setProvider] = useState(() => {
    const cfg = getSupabaseSettings()
    return cfg.enabled ? 'supabase' : 'local'
  })

  const refresh = useCallback(() => {
    setDemoModeState(getDemoMode())
    setCounts(getStateCounts())
    setLiveStatus(getLiveModeStatus())
    setSbConfigured(isSupabaseReady())
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleToggle = async () => {
    setBusy(true)
    setSeedResult(null)
    setValidation(null)
    try {
      const next = toggleDemoMode()
      setDemoModeState(next)
      refresh()
      if (next) {
        const c = getStateCounts()
        if (c.organisations.demo === 0) {
          const result = seedDemoData()
          setSeedResult(result)
          refresh()
        }
      }
    } finally { setBusy(false) }
  }

  const handleSeed = async () => {
    if (!demoMode) return
    setBusy(true)
    setSeedResult(null)
    try { const result = seedDemoData(); setSeedResult(result); refresh() }
    finally { setBusy(false) }
  }

  const handleClearDemo = async () => {
    setBusy(true)
    setSeedResult(null)
    setValidation(null)
    try { clearDemoData(); refresh(); setSeedResult({ ok: true, reason: 'Demo data cleared.' }) }
    finally { setBusy(false) }
  }

  const handleValidate = () => { setValidation(validateResponseLinkState().issues) }

  const handleResetAll = () => {
    if (!confirmReset) { setConfirmReset(true); return }
    setBusy(true)
    setConfirmReset(false)
    setSeedResult(null)
    setValidation(null)
    try { resetToEmptyLiveState(); refresh(); setSeedResult({ ok: true, reason: 'Full reset complete.' }) }
    finally { setBusy(false) }
  }

  const handleSyncModeChange = (mode) => {
    setSyncMode(mode)
    appSettings.set({ syncMode: mode })
    // Realtime only activates in Live Mode — guard in rlRealtimeService handles this
  }

  const totalDemo = Object.values(counts).reduce((s, c) => s + (c.demo || 0), 0)
  const totalLive = Object.values(counts).reduce((s, c) => s + (c.live || 0), 0)

  const TABS = [
    { id: 'mode',    label: 'Demo / Live Mode', icon: 'ToggleLeft' },
    { id: 'backend', label: 'Backend Setup',    icon: 'Database' },
    { id: 'guard',   label: 'API Config Guard', icon: 'Shield' },
    { id: 'envinfo', label: 'Environment Info', icon: 'Info' },
  ]

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-5 max-w-3xl mx-auto" style={{ background: '#020002', color: '#fff' }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}>
            <Icon name="Settings2" size={18} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Demo / Live Settings</h1>
            <p className="text-2xs" style={{ color: GOLD }}>ResponseLink OS™ · Global Demo/Live Toggle · Run 14</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xs px-2.5 py-1 rounded-full font-bold"
                style={{ background: demoMode ? '#22c55e15' : '#a855f715', color: demoMode ? GREEN : PURPLE, border: `1px solid ${demoMode ? '#22c55e30' : '#a855f730'}` }}>
            {demoMode ? '🟢 Demo Mode' : '🟣 Live Mode'}
          </span>
          <button onClick={() => navigate(ROUTES.DASHBOARD)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold text-slate-400 hover:text-white"
            style={{ borderColor: '#C9A84C18', background: '#C9A84C08' }}>
            <Icon name="LayoutDashboard" size={13} style={{ color: GOLD }} /> Dashboard
          </button>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-1 flex-wrap border-b overflow-x-auto" style={{ borderColor: '#C9A84C15' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px whitespace-nowrap"
            style={{ borderColor: activeTab === t.id ? GOLD : 'transparent', color: activeTab === t.id ? GOLD : '#64748b' }}>
            <Icon name={t.icon} size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ DEMO / LIVE MODE TAB ═══════════════════════════════ */}
      {activeTab === 'mode' && (
        <div className="space-y-4">
          {/* Current status */}
          <Card accent={demoMode ? GREEN : PURPLE}>
            <SectionTitle icon={demoMode ? 'ToggleRight' : 'ToggleLeft'}
              title={demoMode ? 'Demo Mode Active' : 'Live Mode Active'}
              sub={demoMode ? 'Showing simulated demo records' : 'Real data only — backend required for full functionality'}
              accent={demoMode ? GREEN : PURPLE} />

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label:'Demo Records', value: totalDemo, color: GREEN },
                { label:'Live Records', value: totalLive, color: PURPLE },
                { label:'Backend',      value: sbConfigured ? 'Configured' : 'Not set', color: sbConfigured ? GREEN : AMBER },
                { label:'Sync Ready',   value: sbConfigured ? 'Yes' : 'Demo only', color: sbConfigured ? GREEN : AMBER },
              ].map(k => (
                <div key={k.label} className="rounded-xl border px-3 py-2.5 text-center"
                     style={{ background: `${k.color}06`, borderColor: `${k.color}18` }}>
                  <div className="text-lg font-black font-mono" style={{ color: k.color }}>{k.value}</div>
                  <div className="text-2xs" style={{ color: k.color }}>{k.label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={handleToggle} disabled={busy}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: demoMode ? PURPLE : GREEN, color: '#000' }}>
                <Icon name={demoMode ? 'ToggleLeft' : 'ToggleRight'} size={14} />
                {busy ? 'Switching…' : demoMode ? 'Switch to Live Mode' : 'Switch to Demo Mode'}
              </button>
            </div>
          </Card>


          {/* ── Sync Mode selector ─────────────────────────── */}
          <Card accent={CYAN}>
            <SectionTitle icon="RefreshCw" title="Sync Mode"
              sub="Controls how data syncs between devices and backend (Live Mode only)"
              accent={CYAN} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SYNC_MODES.map(m => {
                const isActive = syncMode === m.id
                const disabled = m.id !== 'local_only' && demoMode
                return (
                  <button key={m.id}
                    onClick={() => !disabled && handleSyncModeChange(m.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
                    style={{
                      background: isActive ? `${m.color}12` : '#0a050a',
                      borderColor: isActive ? `${m.color}40` : '#ffffff10',
                    }}>
                    <Icon name={m.icon} size={15} style={{ color: isActive ? m.color : '#64748b', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div className="text-xs font-bold" style={{ color: isActive ? m.color : '#cbd5e1' }}>{m.label}</div>
                      <div className="text-2xs text-slate-600">{m.sub}</div>
                      {disabled && <div className="text-2xs text-amber-500/70 mt-0.5">Live Mode only</div>}
                    </div>
                    {isActive && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            {!demoMode && syncMode === 'realtime' && !sbConfigured && (
              <div className="mt-3 rounded-xl border px-3 py-2.5"
                   style={{ background: '#f59e0b08', borderColor: '#f59e0b25' }}>
                <p className="text-2xs text-amber-300/70">
                  ⚠ Realtime sync requires a configured Supabase backend. Configure in the Backend Setup tab.
                </p>
              </div>
            )}
            {demoMode && (
              <p className="text-2xs text-slate-600 mt-2">
                Sync mode is locked to Local Only in Demo Mode. Switch to Live Mode to enable backend sync.
              </p>
            )}
          </Card>

          {/* Live mode warning */}
          {!demoMode && (
            <Advisory color={RED}>
              Live Mode is active but {sbConfigured ? 'a backend is configured' : 'no secure backend is configured'}.
              Real operational use requires backend configuration, authentication, access controls,
              data protection setup, and organisational procedures.
              {!sbConfigured && ' Configure Supabase in the Backend Setup tab.'}
            </Advisory>
          )}
          {!demoMode && (
            <Advisory color={AMBER}>
              Do not enter real sensitive welfare data until a secure backend, authentication,
              access controls, retention rules, and data protection process are configured and reviewed.
            </Advisory>
          )}

          {/* Demo controls */}
          {demoMode && (
            <Card accent={GREEN}>
              <SectionTitle icon="TestTube" title="Demo Data Controls" sub="Seed, clear, and validate demo records" accent={GREEN} />
              <div className="flex gap-2 flex-wrap mb-3">
                <button onClick={handleSeed} disabled={busy}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
                  style={{ background: GOLD, color: '#000' }}>
                  <Icon name="Play" size={13} /> Seed Demo Data
                </button>
                <button onClick={handleClearDemo} disabled={busy}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border"
                  style={{ borderColor: '#ef444425', color: RED, background: '#ef444408' }}>
                  <Icon name="Trash2" size={13} /> Clear Demo Data
                </button>
                <button onClick={handleValidate}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border"
                  style={{ borderColor: '#a855f725', color: PURPLE, background: '#a855f708' }}>
                  <Icon name="CheckSquare" size={13} /> Validate State
                </button>
              </div>

              {seedResult && (
                <div className="rounded-xl border px-3 py-2 mb-3"
                     style={{ background: seedResult.ok ? '#22c55e08' : '#ef444408', borderColor: seedResult.ok ? '#22c55e25' : '#ef444325' }}>
                  <p className="text-xs font-bold" style={{ color: seedResult.ok ? GREEN : RED }}>
                    {seedResult.ok ? '✓ ' : '✗ '}{seedResult.reason || (seedResult.ok ? 'Done' : 'Error')}
                  </p>
                </div>
              )}

              {validation && (
                <div className="rounded-xl border px-3 py-2.5" style={{ background: '#a855f708', borderColor: '#a855f720' }}>
                  <p className="text-2xs font-bold mb-1.5" style={{ color: PURPLE }}>Validation Results</p>
                  {validation.length === 0
                    ? <p className="text-xs" style={{ color: GREEN }}>✓ No issues found</p>
                    : validation.map((v, i) => (
                        <p key={i} className="text-2xs text-red-300 mb-0.5">• {v}</p>
                      ))
                  }
                </div>
              )}

              {/* Record counts */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {Object.entries(counts).slice(0, 9).map(([key, c]) => (
                  <div key={key} className="rounded-lg border px-2 py-1.5 text-center"
                       style={{ background: '#0a050a', borderColor: '#C9A84C12' }}>
                    <div className="text-sm font-black font-mono" style={{ color: GOLD }}>{c.demo || 0}</div>
                    <div className="text-2xs text-slate-600">{key}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Reset */}
          <Card accent={RED}>
            <SectionTitle icon="AlertTriangle" title="Reset / Clear All Data" sub="Dangerous — cannot be undone" accent={RED} />
            <Advisory color={RED}>
              Reset will clear ALL demo and live local records and return the app to empty state.
              This cannot be undone. Only use for development/testing.
            </Advisory>
            <button onClick={handleResetAll} disabled={busy}
              className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border"
              style={{ borderColor: '#ef444430', color: RED, background: '#ef444408' }}>
              <Icon name="AlertTriangle" size={13} />
              {confirmReset ? '⚠ Confirm — this will erase all data' : 'Reset All Local Data'}
            </button>
          </Card>
        </div>
      )}

      {/* ══ BACKEND SETUP TAB ══════════════════════════════════ */}
      {activeTab === 'backend' && (
        <div className="space-y-4">

          {/* Status row */}
          <Card accent={GOLD}>
            <SectionTitle icon="Database" title="Backend Configuration"
              sub="ResponseLink OS™ Backend-Ready Architecture" accent={GOLD} />
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <StatusBadge ok={sbConfigured} labelOk="Backend Configured" labelNo="Not Configured" />
              <StatusBadge ok={demoMode} labelOk="Demo Mode ON" labelNo="Live Mode" />
              <span className="text-2xs text-slate-700">Run 9 · Backend-Ready Planning</span>
            </div>
            {!sbConfigured && !demoMode && (
              <Advisory color={RED}>
                Live Mode is active without a configured secure backend. Real operational use requires
                backend setup, authentication, access controls, and data protection procedures.
                Demo Mode runs fully without any backend.
              </Advisory>
            )}
          </Card>

          {/* Provider selector */}
          <Card accent={PURPLE}>
            <SectionTitle icon="Server" title="Backend Provider" sub="Select your backend for live deployment" accent={PURPLE} />
            <div className="space-y-2">
              {PROVIDERS.map(p => (
                <button key={p.id}
                  onClick={() => p.available && setProvider(p.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all"
                  style={{
                    background: selectedProvider === p.id ? `${p.color}12` : '#0a050a',
                    borderColor: selectedProvider === p.id ? `${p.color}40` : `${p.color}15`,
                    opacity: p.available ? 1 : 0.5,
                    cursor: p.available ? 'pointer' : 'not-allowed',
                  }}>
                  <Icon name={p.icon} size={16} style={{ color: p.color }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold" style={{ color: p.color }}>{p.label}</p>
                      {p.recommended && (
                        <span className="text-2xs px-1.5 py-0.5 rounded font-bold"
                              style={{ background: '#22c55e15', color: GREEN }}>Recommended</span>
                      )}
                      {!p.available && (
                        <span className="text-2xs px-1.5 py-0.5 rounded font-bold"
                              style={{ background: '#f59e0b12', color: AMBER }}>Run 10</span>
                      )}
                    </div>
                    <p className="text-2xs text-slate-600">{p.sub}</p>
                  </div>
                  {selectedProvider === p.id && <Icon name="CheckCircle2" size={14} style={{ color: p.color }} />}
                </button>
              ))}
            </div>
          </Card>

          {/* Provider config panels */}
          {selectedProvider === 'supabase' && (
            <Card accent={GREEN}>
              <SectionTitle icon="Database" title="Supabase Configuration"
                sub="PostgreSQL · Row Level Security · Auth · Realtime" accent={GREEN} />
              <SupabasePanel onSave={refresh} />
            </Card>
          )}

          {selectedProvider === 'firebase' && (
            <Card accent={AMBER}>
              <SectionTitle icon="Cloud" title="Firebase Configuration" sub="Future optional provider" accent={AMBER} />
              <FutureProviderPanel name="Firebase" color={AMBER} fields={[
                { name:'FIREBASE_API_KEY',    placeholder:'AIzaSy…',    note:'Public API key — safe for frontend' },
                { name:'FIREBASE_AUTH_DOMAIN',placeholder:'your-app.firebaseapp.com', note:'' },
                { name:'FIREBASE_PROJECT_ID', placeholder:'your-project-id', note:'' },
                { name:'FIREBASE_APP_ID',     placeholder:'1:123456:web:abc', note:'' },
              ]} />
            </Card>
          )}

          {selectedProvider === 'aws' && (
            <Card accent={AMBER}>
              <SectionTitle icon="Server" title="AWS / Custom Configuration" sub="Future optional provider" accent={AMBER} />
              <FutureProviderPanel name="AWS / Custom" color={AMBER} fields={[
                { name:'API_BASE_URL',       placeholder:'https://api.yourapp.com', note:'Public API base URL' },
                { name:'PUBLIC_API_KEY',     placeholder:'pk_…', note:'Public client key only — not admin key' },
                { name:'AWS_REGION',         placeholder:'eu-west-2', note:'AWS region (optional)' },
                { name:'PROJECT_LABEL',      placeholder:'My Organisation', note:'Label only — not a credential' },
              ]} />
            </Card>
          )}

          {selectedProvider === 'rest' && (
            <Card accent={CYAN}>
              <SectionTitle icon="Globe" title="Generic REST / Custom Endpoint" sub="Future optional provider" accent={CYAN} />
              <FutureProviderPanel name="Generic REST" color={CYAN} fields={[
                { name:'REST_API_BASE_URL',     placeholder:'https://api.example.com/v1', note:'Public base URL' },
                { name:'PUBLIC_CLIENT_TOKEN',   placeholder:'pk_…', note:'Public token only — not admin/private' },
                { name:'STATUS_ENDPOINT',       placeholder:'/health or /status', note:'Health check endpoint (optional)' },
              ]} />
            </Card>
          )}

          {selectedProvider === 'local' && (
            <Card accent={SLATE}>
              <SectionTitle icon="HardDrive" title="Local Only Mode" sub="No backend — demo and offline testing" accent={SLATE} />
              <div className="rounded-xl border px-4 py-3" style={{ background: '#64748b08', borderColor: '#64748b20' }}>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Local-only mode uses the device's localStorage for all records.
                  No data is sent to any external server. Fully functional for demo mode.
                  Multi-device sync, real authentication, and persistent records require a backend provider.
                </p>
              </div>
              <p className="text-2xs text-slate-700 mt-3">
                Demo Mode works perfectly in local-only mode. Switch to Supabase or another provider
                when you are ready for live operational use.
              </p>
            </Card>
          )}

          <Advisory color={AMBER}>
            Real operational deployment requires backend integration (Run 10), authentication setup,
            access controls, Row Level Security (RLS) enabled, data protection review,
            consent procedures, and organisational approval before entering real welfare records.
          </Advisory>
        </div>
      )}

      {/* ══ API CONFIG GUARD TAB ═══════════════════════════════ */}
      {activeTab === 'guard' && (
        <div className="space-y-4">
          <Card accent={GREEN}>
            <SectionTitle icon="Shield" title="4P3X API Config Guard™"
              sub="Security rules for API key handling in ResponseLink OS™" accent={GREEN} />

            <div className="space-y-3">
              <div className="rounded-xl border px-4 py-3"
                   style={{ background: '#22c55e06', borderColor: '#22c55e20' }}>
                <p className="text-xs font-bold mb-2" style={{ color: GREEN }}>✓ Permitted in Frontend / Browser Storage</p>
                <ul className="space-y-1">
                  {[
                    'VITE_SUPABASE_URL — Supabase project URL',
                    'VITE_SUPABASE_ANON_KEY — Supabase public anon key',
                    'VITE_BACKEND_PROVIDER — Provider name (supabase, firebase, etc.)',
                    'VITE_API_MODE — demo or live',
                    'VITE_PUBLIC_API_BASE_URL — Public REST base URL if applicable',
                    'FIREBASE_API_KEY — Firebase public API key',
                    'FIREBASE_AUTH_DOMAIN — Firebase auth domain',
                    'Public client tokens (pk_ prefix convention)',
                  ].map((r, i) => (
                    <li key={i} className="text-2xs flex items-start gap-1.5" style={{ color: '#86efac' }}>
                      <span style={{ color: GREEN }}>✓</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border px-4 py-3"
                   style={{ background: '#ef444408', borderColor: '#ef444325' }}>
                <p className="text-xs font-bold mb-2" style={{ color: RED }}>⛔ BLOCKED — Never in Frontend / Browser</p>
                <ul className="space-y-1">
                  {[
                    'SUPABASE_SERVICE_ROLE_KEY — admin bypass of RLS — server-side only',
                    'OPENAI_API_KEY / GROQ_API_KEY — AI provider secrets — server-side only',
                    'JWT_SECRET — token signing secret — server-side only',
                    'DATABASE_URL — direct database connection — server-side only',
                    'STRIPE_SECRET_KEY — payment processing — server-side only',
                    'PRIVATE_KEY / WEBHOOK_SECRET — backend secrets — server-side only',
                    'Admin tokens / service accounts — server-side only',
                    'Any credential that grants admin/bypass access',
                  ].map((r, i) => (
                    <li key={i} className="text-2xs flex items-start gap-1.5" style={{ color: '#fca5a5' }}>
                      <span style={{ color: RED }}>⛔</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border px-4 py-3"
                   style={{ background: '#C9A84C06', borderColor: '#C9A84C20' }}>
                <p className="text-xs font-bold mb-2" style={{ color: GOLD }}>4P3X API Config Guard™ Rules</p>
                <ul className="space-y-1">
                  {[
                    'Config fields auto-reject blocked secret name patterns',
                    'Keys are masked by default in all UI fields (show/hide toggle)',
                    'No secrets are ever logged to console or exported in reports',
                    'Demo mode runs fully without any API keys',
                    'Missing backend config disables live features with clear guidance',
                    'Service role keys are never requested by this UI — by design',
                    'All config is stored in localStorage only — never in code',
                    'For environment-level config, use .env.local (never commit to git)',
                  ].map((r, i) => (
                    <li key={i} className="text-2xs flex items-start gap-1.5" style={{ color: '#fde68a' }}>
                      <Icon name="CheckCircle2" size={10} style={{ color: GOLD, flexShrink: 0, marginTop: 1 }} />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card accent={PURPLE}>
            <SectionTitle icon="FileCode" title="Environment Variables Guide"
              sub="Safe naming conventions for ResponseLink OS™" accent={PURPLE} />
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#a855f720' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: '#a855f720', background: '#a855f706' }}>
                <p className="text-2xs font-mono font-bold" style={{ color: PURPLE }}>.env.local (never committed to git)</p>
              </div>
              {[
                { key:'VITE_SUPABASE_URL',        val:'https://your-project.supabase.co', safe: true },
                { key:'VITE_SUPABASE_ANON_KEY',   val:'eyJhbGci… (anon/public key only)', safe: true },
                { key:'VITE_BACKEND_PROVIDER',     val:'supabase', safe: true },
                { key:'VITE_API_MODE',             val:'demo', safe: true },
                { key:'VITE_PUBLIC_API_BASE_URL',  val:'https://api.example.com/v1', safe: true },
                { key:'SUPABASE_SERVICE_ROLE_KEY', val:'⛔ NEVER IN FRONTEND', safe: false },
                { key:'OPENAI_API_KEY',            val:'⛔ NEVER IN FRONTEND', safe: false },
                { key:'JWT_SECRET',                val:'⛔ NEVER IN FRONTEND', safe: false },
              ].map((e, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2 border-b last:border-0"
                     style={{ borderColor: '#a855f712' }}>
                  <span className="text-2xs font-mono flex-1"
                        style={{ color: e.safe ? '#c084fc' : '#fca5a5' }}>
                    {e.key}=
                  </span>
                  <span className="text-2xs text-slate-600 flex-1">{e.val}</span>
                  <span className="text-2xs font-bold" style={{ color: e.safe ? GREEN : RED }}>
                    {e.safe ? '✓ Safe' : '⛔ Blocked'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ══ ENVIRONMENT INFO TAB ════════════════════════════════ */}
      {activeTab === 'envinfo' && (
        <div className="space-y-4">
          <Card accent={CYAN}>
            <SectionTitle icon="Info" title="Runtime Environment"
              sub="Current app environment information (safe fields only)" accent={CYAN} />
            <div className="space-y-2">
              {[
                { label:'App Name',         value:'ResponseLink OS™' },
                { label:'Mode',             value: demoMode ? 'Demo Mode (local)' : 'Live Mode' },
                { label:'Backend Provider', value: selectedProvider },
                { label:'Backend Ready',    value: sbConfigured ? 'Yes — Supabase configured' : 'No — local only' },
                { label:'API Mode',         value: import.meta.env.VITE_API_MODE || 'demo (default)' },
                { label:'Build Mode',       value: import.meta.env.MODE || 'development' },
                { label:'Supabase URL Set', value: import.meta.env.VITE_SUPABASE_URL ? 'Yes (VITE env)' : getSupabaseSettings().url ? 'Yes (localStorage)' : 'No' },
                { label:'Anon Key Set',     value: (import.meta.env.VITE_SUPABASE_ANON_KEY || getSupabaseSettings().anonKey) ? 'Yes (masked)' : 'No' },
                { label:'Run',              value:'Run 9 — Backend-Ready Live Mode, Final MVP' },
                { label:'Created by',       value:'Kyzel Kreates™' },
                { label:'AI Engine',        value:'4P3X Intelligent AI™ — Local Rule-Based Advisory' },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b last:border-0"
                     style={{ borderColor: '#06b6d412' }}>
                  <span className="text-2xs text-slate-600 w-36 flex-shrink-0">{r.label}</span>
                  <span className="text-xs font-semibold text-white flex-1">{r.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border px-4 py-3" style={{ background: '#C9A84C06', borderColor: '#C9A84C20' }}>
              <p className="text-2xs font-bold mb-1" style={{ color: GOLD }}>Safe fields only</p>
              <p className="text-2xs text-slate-600">
                Only public/safe environment values are shown here.
                Backend-only secrets (service role key, database URL, JWT, etc.) are not displayed,
                not logged, and not stored in this panel.
              </p>
            </div>
          </Card>

          <Card accent={PURPLE}>
            <SectionTitle icon="FileText" title="Setup Files Reference"
              sub="Backend planning and configuration documents" accent={PURPLE} />
            <div className="space-y-2">
              {[
                { file:'.env.example',                   desc:'Safe public env var template — safe to commit', status:'Created (Run 9)' },
                { file:'RESPONSELINK_SUPABASE_SETUP.txt',desc:'Supabase backend planning and SQL schema guide', status:'Created (Run 9)' },
                { file:'README.md',                      desc:'Project documentation and setup guide',          status:'Updated (Run 9)' },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0"
                     style={{ borderColor: '#a855f712' }}>
                  <Icon name="FileCode" size={13} style={{ color: PURPLE, flexShrink: 0, marginTop: 1 }} />
                  <div className="flex-1">
                    <p className="text-xs font-mono font-bold" style={{ color: PURPLE }}>{f.file}</p>
                    <p className="text-2xs text-slate-600">{f.desc}</p>
                  </div>
                  <span className="text-2xs text-slate-700 flex-shrink-0">{f.status}</span>
                </div>
              ))}
            </div>
          </Card>

          <Advisory color={AMBER}>
            For production deployment, complete Run 10 (Full Supabase Backend + Auth + Real Sync)
            before entering real operational data. Ensure data protection, consent procedures,
            access controls, and organisational approval are in place.
          </Advisory>
        </div>
      )}

      {/* ── Footer ────────────────────────────────────────────── */}
      <div className="rounded-xl border px-5 py-4" style={{ background: '#C9A84C04', borderColor: '#C9A84C15' }}>
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong style={{ color: GOLD }}>ResponseLink OS™ · Demo/Live Settings · Run 9</strong> —
          Advisory platform only. Does not replace emergency services, safeguarding professionals,
          clinical judgement, or legal duties.
          Backend-ready architecture configured. Full live backend in Run 10.
          4P3X Intelligent AI™ · Created by Kyzel Kreates™.
        </p>
      </div>
    </div>
  )
}
