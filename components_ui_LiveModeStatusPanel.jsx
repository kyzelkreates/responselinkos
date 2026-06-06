/**
 * ============================================================
 * ResponseLink OS™ — LiveModeStatusPanel
 * components_ui_LiveModeStatusPanel.jsx
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 9 — Backend-Ready Live Mode, API Config, Final MVP
 *
 * Reusable status panel used in:
 *   - Command Dashboard
 *   - Responder PWA
 *   - Service User PWA
 *
 * Props:
 *   variant: 'dashboard' | 'responder' | 'serviceuser'
 *   compact: bool (default false)
 *
 * ⚠ ADVISORY NOTICE:
 *   ResponseLink OS™ is advisory and coordination-support software.
 *   It does not replace emergency services, safeguarding professionals,
 *   clinical judgement, or legal duties.
 * ============================================================
 */

import { useState, useEffect } from 'react'
import Icon from './components_ui_Icon'
import { getDemoMode, getLiveModeStatus } from './core_rlData'
import { getSupabaseSettings } from './services_supabase_supabaseClient'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from './config_routes'

// ─── Colour tokens ────────────────────────────────────────────
const GOLD   = '#C9A84C'
const GREEN  = '#22c55e'
const AMBER  = '#f59e0b'
const RED    = '#ef4444'
const PURPLE = '#a855f7'
const CYAN   = '#06b6d4'
const SLATE  = '#94a3b8'

// ─── Panel variant configs ────────────────────────────────────
const VARIANT_CONFIG = {
  dashboard: {
    title:       'Backend / Sync Status',
    icon:        'Server',
    syncLabel:   'Mission sync',
    queueLabel:  'Sync queue',
    lastLabel:   'Last sync',
    configPath:  '/demo-live',
    configLabel: 'Configure backend',
  },
  responder: {
    title:       'Responder Sync Status',
    icon:        'Smartphone',
    syncLabel:   'Assignment sync',
    queueLabel:  'Offline queue',
    lastLabel:   'Last dashboard sync',
    configPath:  '/demo-live',
    configLabel: 'Backend settings',
  },
  serviceuser: {
    title:       'Service User Sync Status',
    icon:        'HeartHandshake',
    syncLabel:   'Check-in sync',
    queueLabel:  'Offline queue',
    lastLabel:   'Last sync',
    configPath:  '/demo-live',
    configLabel: 'Backend settings',
  },
}

// ─── Helpers ──────────────────────────────────────────────────
function timeAgoShort(ts) {
  if (!ts) return 'never'
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── StatusRow ────────────────────────────────────────────────
function StatusRow({ label, value, color = SLATE, icon = 'Circle', bold = false }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0"
         style={{ borderColor: '#ffffff08' }}>
      <div className="flex items-center gap-2">
        <Icon name={icon} size={11} style={{ color, flexShrink: 0 }} />
        <span className="text-2xs text-slate-500">{label}</span>
      </div>
      <span className={`text-2xs font-semibold ${bold ? '' : ''}`} style={{ color }}>
        {value}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────
export default function LiveModeStatusPanel({ variant = 'dashboard', compact = false, recordCount = null }) {
  const navigate     = useNavigate()
  const [status,   setStatus]   = useState({})
  const [isDemo,   setIsDemo]   = useState(getDemoMode())
  const [sbConfig, setSbConfig] = useState({})
  const [online,   setOnline]   = useState(navigator.onLine)

  const cfg = VARIANT_CONFIG[variant] || VARIANT_CONFIG.dashboard

  useEffect(() => {
    function refresh() {
      setStatus(getLiveModeStatus())
      setIsDemo(getDemoMode())
      setSbConfig(getSupabaseSettings())
      setOnline(navigator.onLine)
    }
    refresh()
    const iv = setInterval(refresh, 5000)
    window.addEventListener('online',  refresh)
    window.addEventListener('offline', refresh)
    return () => {
      clearInterval(iv)
      window.removeEventListener('online',  refresh)
      window.removeEventListener('offline', refresh)
    }
  }, [])

  // ── Derived state ──────────────────────────────────────────
  const backendConfigured = !!(sbConfig?.url && sbConfig?.anonKey) || status.backendConfigured
  const provider          = status.backendProvider || (backendConfigured ? 'supabase' : 'none')
  const providerLabel     = backendConfigured ? (provider || 'Supabase') : 'Not configured'
  const connStatus        = status.backendConnectionStatus
  const modeColor         = isDemo ? GREEN : PURPLE
  const modeLabel         = isDemo ? 'Demo Mode' : 'Live Mode'

  let connColor = SLATE
  let connLabel = 'Unknown'
  let connIcon  = 'Circle'
  if (!online)              { connColor = RED;   connLabel = 'Offline';           connIcon = 'WifiOff' }
  else if (!backendConfigured) { connColor = AMBER; connLabel = 'No backend';     connIcon = 'AlertCircle' }
  else if (connStatus === 'connected') { connColor = GREEN; connLabel = 'Connected'; connIcon = 'CheckCircle2' }
  else if (connStatus === 'failed')    { connColor = RED;   connLabel = 'Failed';    connIcon = 'XCircle' }
  else if (connStatus === 'testing')   { connColor = AMBER; connLabel = 'Testing…';  connIcon = 'Loader' }
  else                      { connColor = AMBER; connLabel = 'Not tested';        connIcon = 'Clock' }

  const syncLabel = isDemo
    ? 'Local demo (no backend)'
    : (backendConfigured ? 'Backend configured' : 'Local only')
  const syncColor = isDemo ? GREEN : (backendConfigured ? CYAN : AMBER)

  // ── Compact mode (used in PWA panels) ─────────────────────
  if (compact) {
    return (
      <div className="rounded-xl border px-3 py-2.5 flex items-center justify-between gap-3"
           style={{ background: `${modeColor}06`, borderColor: `${modeColor}20` }}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: modeColor }} />
            <span className="text-2xs font-bold" style={{ color: modeColor }}>{modeLabel}</span>
          </div>
          <span className="text-2xs text-slate-600">·</span>
          <div className="flex items-center gap-1">
            <Icon name={connIcon} size={10} style={{ color: connColor }} />
            <span className="text-2xs" style={{ color: connColor }}>{connLabel}</span>
          </div>
          {!isDemo && !backendConfigured && (
            <>
              <span className="text-2xs text-slate-600">·</span>
              <span className="text-2xs text-amber-400">Local only</span>
            </>
          )}
        </div>
        <button
          onClick={() => navigate(cfg.configPath)}
          className="text-2xs font-semibold flex-shrink-0"
          style={{ color: GOLD }}>
          Settings
        </button>
      </div>
    )
  }

  // ── Full panel ────────────────────────────────────────────
  return (
    <div className="rounded-xl border overflow-hidden"
         style={{ borderColor: `${modeColor}25`, background: '#07040a' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
           style={{ borderColor: `${modeColor}15`, background: `${modeColor}06` }}>
        <div className="flex items-center gap-2">
          <Icon name={cfg.icon} size={14} style={{ color: modeColor }} />
          <span className="text-xs font-bold" style={{ color: modeColor }}>{cfg.title}</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full ml-1"
               style={{ background: `${modeColor}15`, border: `1px solid ${modeColor}30` }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: modeColor }} />
            <span className="text-2xs font-semibold" style={{ color: modeColor }}>{modeLabel}</span>
          </div>
        </div>
        <button
          onClick={() => navigate(cfg.configPath)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-semibold transition-all"
          style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25`, color: GOLD }}>
          <Icon name="Settings" size={10} />
          {cfg.configLabel}
        </button>
      </div>

      {/* Status rows */}
      <div className="px-4 py-3 space-y-0.5">
        <StatusRow
          label="Current mode"
          value={modeLabel}
          color={modeColor}
          icon={isDemo ? 'PlayCircle' : 'Zap'}
          bold />
        <StatusRow
          label="Backend provider"
          value={providerLabel}
          color={backendConfigured ? CYAN : SLATE}
          icon="Database" />
        <StatusRow
          label="Connection status"
          value={connLabel}
          color={connColor}
          icon={connIcon} />
        <StatusRow
          label={cfg.syncLabel}
          value={syncLabel}
          color={syncColor}
          icon="RefreshCw" />
        <StatusRow
          label={cfg.queueLabel}
          value={isDemo ? '0 (demo)' : 'Simulated (no backend)'}
          color={SLATE}
          icon="Clock" />
        {recordCount !== null && (
          <StatusRow
            label="Live records"
            value={isDemo ? 'Demo data only' : (recordCount > 0 ? `${recordCount} records` : 'None yet')}
            color={recordCount > 0 && !isDemo ? GREEN : SLATE}
            icon="FileText" />
        )}
        <StatusRow
          label={cfg.lastLabel}
          value={timeAgoShort(status.lastSyncAt)}
          color={SLATE}
          icon="Timer" />
      </div>

      {/* Warning banners */}
      {!isDemo && !backendConfigured && (
        <div className="mx-4 mb-3 rounded-lg border px-3 py-2"
             style={{ background: '#f59e0b08', borderColor: '#f59e0b25' }}>
          <div className="flex items-start gap-2">
            <Icon name="AlertCircle" size={12} style={{ color: AMBER, marginTop: 1, flexShrink: 0 }} />
            <p className="text-2xs leading-relaxed" style={{ color: '#fde68a' }}>
              <strong>Live Mode — No backend configured.</strong>{' '}
              Data is local only. Configure Supabase, Firebase, or another backend provider to enable
              real users, persistent records, authentication, and sync.
              Do not enter real sensitive welfare data until a secure backend is configured.
            </p>
          </div>
        </div>
      )}

      {!online && (
        <div className="mx-4 mb-3 rounded-lg border px-3 py-2"
             style={{ background: '#ef444408', borderColor: '#ef444425' }}>
          <div className="flex items-start gap-2">
            <Icon name="WifiOff" size={12} style={{ color: RED, marginTop: 1, flexShrink: 0 }} />
            <p className="text-2xs leading-relaxed" style={{ color: '#fca5a5' }}>
              <strong>No internet connection.</strong>{' '}
              ResponseLink OS™ is running in local-first mode. Any records created will be queued
              and synced when connectivity is restored.
            </p>
          </div>
        </div>
      )}

      {isDemo && (
        <div className="mx-4 mb-3 rounded-lg border px-3 py-2"
             style={{ background: '#22c55e06', borderColor: '#22c55e20' }}>
          <div className="flex items-start gap-2">
            <Icon name="Info" size={12} style={{ color: GREEN, marginTop: 1, flexShrink: 0 }} />
            <p className="text-2xs leading-relaxed" style={{ color: '#86efac' }}>
              <strong>Demo Mode.</strong>{' '}
              All data shown is sample demo data. No real records are stored or transmitted.
              Switch to Live Mode in backend settings when ready for real operation.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
