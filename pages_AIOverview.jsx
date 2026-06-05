/**
 * ============================================================
 * ResponseLink OS™ — 4P3X Intelligent AI™ Oversight
 * pages_AIOverview.jsx  (route: /ai)
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 8 — AI Oversight Agents + Reports
 *
 * LOCAL RULE-BASED ADVISORY SYSTEM — NO EXTERNAL API KEYS
 *
 * ⚠ ADVISORY NOTICE:
 *   4P3X Intelligent AI™ provides advisory prompts based on
 *   recorded data only. It does NOT verify facts independently,
 *   diagnose people, replace safeguarding professionals,
 *   replace emergency services, or make final decisions.
 *   All prompts require human review.
 *   If someone is in immediate danger, contact emergency services.
 * ============================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon             from './components_ui_Icon'
import { ROUTES }       from './config_routes'
import { formatDateTime } from './utils_format'
import { getDemoMode }  from './core_rlData'
import { seedDemoData } from './core_rlDemoData'
import {
  runWelfareRiskAI, runSafeguardingEvidenceAI,
  getAIOversightSummary, AI_ENGINE_VERSION, ADVISORY_NOTICE,
} from './core_rlAIEngine'
import { getRiskColor }  from './core_rlRiskEngine'
import { timeAgo }       from './core_rlSelectors'

// ─── Colour tokens ─────────────────────────────────────────────
const GOLD   = '#C9A84C'
const GREEN  = '#22c55e'
const RED    = '#ef4444'
const AMBER  = '#f59e0b'
const PURPLE = '#a855f7'
const CYAN   = '#06b6d4'
const ORANGE = '#f97316'
const SLATE  = '#A8A9AD'

const SEV_COLOR = { critical: RED, high: ORANGE, medium: AMBER, low: GREEN }
const SEV_ICON  = { critical: 'Flame', high: 'AlertTriangle', medium: 'ShieldAlert', low: 'ShieldCheck' }

// ─── Tiny shared UI ────────────────────────────────────────────
function Pill({ label, color, bg }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold"
          style={{ color, background: bg || `${color}18`, border: `1px solid ${color}30` }}>
      {label}
    </span>
  )
}

function AdvisoryBox({ children, color = AMBER }) {
  const textColor = color === RED ? '#fca5a5' : color === AMBER ? '#fde68a' : color === CYAN ? '#67e8f9' : SLATE
  return (
    <div className="rounded-xl border px-4 py-3 flex items-start gap-2.5"
         style={{ background: `${color}06`, borderColor: `${color}20` }}>
      <Icon name="ShieldAlert" size={13} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <p className="text-2xs leading-relaxed" style={{ color: textColor }}>{children}</p>
    </div>
  )
}

function SectionCard({ title, icon, count, accent = GOLD, children, action, className = '' }) {
  return (
    <div className={`rounded-xl border flex flex-col ${className}`}
         style={{ background: '#0a050a', borderColor: `${accent}28` }}>
      <div className="flex items-center justify-between px-4 py-3 border-b"
           style={{ borderColor: `${accent}18` }}>
        <div className="flex items-center gap-2">
          <Icon name={icon} size={14} style={{ color: accent }} />
          <span className="text-sm font-semibold text-white">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${accent}20`, color: accent }}>{count}</span>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function Empty({ icon, message, sub, accent = GOLD }) {
  return (
    <div className="p-6 text-center">
      <Icon name={icon} size={22} className="mx-auto mb-2" style={{ color: accent, opacity: 0.3 }} />
      <p className="text-xs font-semibold text-slate-500">{message}</p>
      {sub && <p className="text-2xs text-slate-700 mt-1">{sub}</p>}
    </div>
  )
}

// ─── AI Prompt Card ────────────────────────────────────────────
function AIPromptCard({ prompt, compact = false }) {
  const [open, setOpen] = useState(false)
  const col = SEV_COLOR[prompt.severity] || AMBER
  const icn = SEV_ICON[prompt.severity]  || 'AlertTriangle'
  return (
    <div className="border-b last:border-0" style={{ borderColor: `${col}12` }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-white/[0.01] transition-colors"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
             style={{ background: `${col}15` }}>
          <Icon name={icn} size={13} style={{ color: col }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-xs font-semibold text-white flex-1 min-w-0">{prompt.title}</p>
            <Pill label={prompt.severity} color={col} />
            {prompt.advisory && <Pill label="Advisory" color={GOLD} />}
          </div>
          {!compact && <p className="text-2xs text-slate-500 leading-relaxed">{prompt.summary}</p>}
        </div>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={13} className="text-slate-600 flex-shrink-0 mt-1" />
      </button>
      {open && (
        <div className="px-4 pb-4 ml-10 space-y-2">
          {compact && <p className="text-2xs text-slate-400 leading-relaxed">{prompt.summary}</p>}
          <div className="rounded-xl border px-3 py-2.5"
               style={{ background: `${col}06`, borderColor: `${col}18` }}>
            <p className="text-2xs font-semibold mb-1" style={{ color: col }}>Advisory Prompt</p>
            <p className="text-xs text-slate-300 leading-relaxed">{prompt.prompt}</p>
          </div>
          <p className="text-2xs text-slate-700">
            Source: {prompt.source?.replace(/_/g,' ')} {prompt.entityId ? `· ${prompt.entityId.slice(-6)}` : ''}
          </p>
          <p className="text-2xs text-slate-800">
            All prompts are advisory only. Human review is required before any action.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Recommended Action Item ───────────────────────────────────
function ActionItem({ action }) {
  const pCol = action.priority === 1 ? RED : action.priority === 2 ? ORANGE : AMBER
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b last:border-0"
         style={{ borderColor: '#C9A84C12' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ background: `${pCol}12` }}>
        <Icon name={action.icon || 'CheckCircle2'} size={13} style={{ color: pCol }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white mb-0.5">{action.label}</p>
        <p className="text-2xs text-slate-500 leading-relaxed">{action.detail}</p>
        <p className="text-2xs text-slate-700 mt-0.5">Advisory prompt — human judgement required</p>
      </div>
      <Pill label={`P${action.priority || 5}`} color={pCol} />
    </div>
  )
}

// ─── Evidence Score Widget ─────────────────────────────────────
function EvidenceScore({ score, readiness }) {
  const col = readiness === 'good' ? GREEN : readiness === 'poor' ? RED : AMBER
  const lbl = readiness === 'good' ? 'Good' : readiness === 'poor' ? 'Needs Attention' : 'Review Recommended'
  return (
    <div className="flex items-center gap-4 px-4 py-4 border-b" style={{ borderColor: '#C9A84C15' }}>
      <div className="relative flex-shrink-0">
        <div className="w-14 h-14 rounded-full flex items-center justify-center"
             style={{ background: `${col}15`, border: `2px solid ${col}` }}>
          <span className="text-sm font-black" style={{ color: col }}>
            {score !== null ? `${score}%` : '—'}
          </span>
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-white">Evidence Readiness</p>
        <p className="text-2xs mt-0.5" style={{ color: col }}>{lbl}</p>
        <p className="text-2xs text-slate-600 mt-0.5">Advisory score — not a compliance rating</p>
      </div>
    </div>
  )
}

// ─── Metric Pill Row ───────────────────────────────────────────
function MetricRow({ label, value, color, icon }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b last:border-0"
         style={{ borderColor: '#C9A84C10' }}>
      <div className="flex items-center gap-2">
        <Icon name={icon} size={12} style={{ color: color || SLATE }} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <span className="text-sm font-black font-mono" style={{ color: color || SLATE }}>{value}</span>
    </div>
  )
}

// ─── Overall Risk Banner ───────────────────────────────────────
function OverallRiskBanner({ risk, summaryText }) {
  const col = SEV_COLOR[risk] || GREEN
  const icn = SEV_ICON[risk]  || 'ShieldCheck'
  const labels = { critical:'Critical', high:'High', medium:'Medium', low:'Low / Clear' }
  return (
    <div className="rounded-xl border px-5 py-4 flex items-start gap-4"
         style={{ background: `${col}08`, borderColor: `${col}30` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ background: `${col}15` }}>
        <Icon name={icn} size={20} style={{ color: col }} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-sm font-black" style={{ color: col }}>
            {labels[risk] || risk} Advisory Risk Level
          </p>
          <Pill label="Advisory Only" color={GOLD} />
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{summaryText}</p>
        <p className="text-2xs text-slate-600 mt-1">
          Advisory classification only. Does not determine actual risk. Human review required.
        </p>
      </div>
    </div>
  )
}

// ─── Live Mode Empty ───────────────────────────────────────────
function LiveEmpty() {
  return (
    <div className="rounded-xl border p-6 space-y-3"
         style={{ background: `${PURPLE}06`, borderColor: `${PURPLE}25` }}>
      <div className="flex items-start gap-3">
        <Icon name="Brain" size={18} style={{ color: PURPLE, flexShrink: 0 }} />
        <div>
          <h3 className="text-sm font-bold mb-1" style={{ color: PURPLE }}>
            Live Mode — No Operational Data Yet
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Live Mode is active. Real operational AI oversight requires a configured backend, authentication,
            access controls, data protection setup, and organisational procedures. Backend setup is in Run 9.
          </p>
        </div>
      </div>
      <AdvisoryBox color={RED}>
        Do not enter real sensitive welfare data until a secure backend, authentication,
        access controls, data protection process, and organisational approval are configured.
      </AdvisoryBox>
      <p className="text-xs text-slate-600">
        4P3X API Config Guard™ — Future optional AI provider placeholder.
        Not required for demo. Configured in Run 9 if needed. No keys required or stored.
      </p>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────
export default function AIOverviewPage() {
  const navigate = useNavigate()

  const [isDemo,    setIsDemo]    = useState(getDemoMode)
  const [oversight, setOversight] = useState(null)
  const [a1,        setA1]        = useState(null)
  const [a2,        setA2]        = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [runningAI, setRunningAI] = useState(false)
  const [lastRun,   setLastRun]   = useState(null)

  const runAnalysis = useCallback(() => {
    setRunningAI(true)
    try {
      const demo = getDemoMode()
      setIsDemo(demo)
      const ov  = getAIOversightSummary()
      setOversight(ov)
      setA1(ov.agent1)
      setA2(ov.agent2)
      setLastRun(new Date())
    } catch (e) { console.error('[RL:AI]', e) }
    finally { setLoningAI(false); setLoading(false) }
  }, [])

  // small typo fix
  function setLoningAI(v) { setRunningAI(v) }

  useEffect(() => { runAnalysis(); const t = setInterval(runAnalysis, 60000); return () => clearInterval(t) }, [runAnalysis])

  const hasData = a1?.metrics.totalMissions > 0 || a1?.metrics.totalMissions === 0

  const TABS = [
    { id: 'overview',   label: 'AI Overview',          icon: 'Brain',         count: null },
    { id: 'agent1',     label: 'Welfare Risk AI',       icon: 'ShieldAlert',   count: a1?.promptCount || 0 },
    { id: 'agent2',     label: 'Evidence AI',           icon: 'FileSearch',    count: a2?.promptCount || 0 },
    { id: 'actions',    label: 'Recommended Actions',   icon: 'ListChecks',    count: ((a1?.recommendedActions?.length||0) + (a2?.recommendedActions?.length||0)) || null },
    { id: 'limitation', label: 'Limitations',           icon: 'Info',          count: null },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#020002' }}>
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto animate-pulse"
               style={{ background: `${PURPLE}20`, border: `1px solid ${PURPLE}40` }}>
            <Icon name="Brain" size={24} style={{ color: PURPLE }} />
          </div>
          <p className="text-sm font-bold text-white">4P3X Intelligent AI™ loading…</p>
          <p className="text-2xs text-slate-600">Local rule-based analysis · No external API</p>
        </div>
      </div>
    )
  }

  const ov = oversight?.combined || {}
  const overallRisk = oversight?.overallRisk || 'low'

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-5" style={{ background: '#020002', color: '#fff' }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: `${PURPLE}18`, border: `1px solid ${PURPLE}35` }}>
            <Icon name="Brain" size={20} style={{ color: PURPLE }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">4P3X Intelligent AI™ Oversight</h1>
            <p className="text-2xs" style={{ color: GOLD }}>
              ResponseLink OS™ · Advisory Only · {isDemo ? 'Demo Mode' : 'Live Mode'} · Run 8
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xs text-slate-600 hidden sm:block">
            {lastRun ? `Last run: ${timeAgo(lastRun.toISOString())}` : ''}
          </span>
          <button onClick={runAnalysis} disabled={runningAI}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-50"
            style={{ borderColor: '#C9A84C18', background: '#C9A84C08' }}>
            <Icon name={runningAI ? 'Loader' : 'RefreshCw'} size={13}
                  style={{ color: GOLD }} className={runningAI ? 'animate-spin' : ''} />
            {runningAI ? 'Analysing…' : 'Run Analysis'}
          </button>
          <button onClick={() => navigate(ROUTES.DASHBOARD)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold text-slate-400 hover:text-white"
            style={{ borderColor: '#C9A84C18', background: '#C9A84C08' }}>
            <Icon name="LayoutDashboard" size={13} style={{ color: GOLD }} /> Dashboard
          </button>
        </div>
      </div>

      {/* ── Mode tags ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-2xs px-2.5 py-1 rounded-full font-bold"
              style={{ background: isDemo ? '#22c55e15' : '#a855f715', color: isDemo ? GREEN : PURPLE, border: `1px solid ${isDemo ? '#22c55e30' : '#a855f730'}` }}>
          {isDemo ? '🟢 Demo Mode' : '🟣 Live Mode'}
        </span>
        <span className="text-2xs px-2.5 py-1 rounded-full font-bold"
              style={{ background: `${PURPLE}12`, color: PURPLE, border: `1px solid ${PURPLE}25` }}>
          Local Rule-Based · No External API
        </span>
        <span className="text-2xs text-slate-700">{AI_ENGINE_VERSION}</span>
      </div>

      {/* ── Advisory notice ───────────────────────────────────── */}
      <div className="rounded-xl border px-4 py-3 flex items-start gap-3"
           style={{ background: '#ef444406', borderColor: '#ef444325' }}>
        <Icon name="ShieldAlert" size={15} style={{ color: RED, flexShrink: 0, marginTop: 1 }} />
        <div>
          <p className="text-xs font-bold mb-0.5" style={{ color: RED }}>
            4P3X Intelligent AI™ Advisory Platform — Human Review Required
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">{ADVISORY_NOTICE}</p>
          <p className="text-xs text-slate-500 mt-1">
            <strong className="text-white">If someone is in immediate danger, contact emergency services immediately.</strong>
            {' '}This system does not contact emergency services automatically.
          </p>
        </div>
      </div>

      {/* ── Live Mode empty ───────────────────────────────────── */}
      {!isDemo && ov.totalMissions === 0 && <LiveEmpty />}

      {/* ── Demo seed ─────────────────────────────────────────── */}
      {isDemo && ov.totalMissions === 0 && (
        <div className="rounded-xl border px-5 py-5" style={{ background: '#C9A84C06', borderColor: '#C9A84C25' }}>
          <p className="text-sm font-bold text-white mb-1">No Demo Data Yet</p>
          <p className="text-xs text-slate-400 mb-3">Seed demo data to see AI advisory analysis in action.</p>
          <button onClick={async () => { await seedDemoData(false); runAnalysis() }}
            className="px-4 py-2 rounded-lg text-xs font-bold"
            style={{ background: GOLD, color: '#000' }}>
            Seed Demo Data
          </button>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-1 flex-wrap border-b overflow-x-auto" style={{ borderColor: '#C9A84C15' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px whitespace-nowrap"
            style={{
              borderColor: activeTab === t.id ? PURPLE : 'transparent',
              color: activeTab === t.id ? PURPLE : '#64748b',
            }}>
            <Icon name={t.icon} size={13} />
            {t.label}
            {t.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-2xs font-bold"
                    style={{ background: `${PURPLE}20`, color: PURPLE }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW TAB ═══════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Overall risk banner */}
          {a1 && (
            <OverallRiskBanner
              risk={overallRisk}
              summaryText={a1.summaryText}
            />
          )}

          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Missions',        value: ov.totalMissions||0,        color: GOLD,   icon:'ClipboardList' },
              { label: 'High/Crit Risk',  value: ov.highRiskMissions||0,     color: RED,    icon:'Flame' },
              { label: 'Incidents',       value: ov.unresolvedIncidents||0,   color: AMBER,  icon:'AlertOctagon' },
              { label: 'Review Required', value: ov.supervisorReviewRequired||0,color:RED,  icon:'ClipboardCheck' },
              { label: 'Evidence Gaps',   value: ov.evidenceGaps||0,         color: PURPLE, icon:'FileX' },
              { label: 'Urgent Help',     value: ov.urgentHelpRequests||0,   color: RED,    icon:'LifeBuoy' },
              { label: 'Missed Check-ins',value: ov.missedCheckIns||0,       color: AMBER,  icon:'HeartOff' },
              { label: 'Overdue Resp.',   value: ov.overdueResponders||0,    color: ORANGE, icon:'UserX' },
              { label: 'Sync Issues',     value: (ov.syncFailed||0)+(ov.syncConflict||0)+(ov.syncPending||0), color:CYAN, icon:'WifiOff' },
              { label: 'AI Prompts',      value: ov.totalPrompts||0,         color: PURPLE, icon:'Brain' },
            ].map(k => (
              <div key={k.label} className="rounded-xl border p-3 text-center"
                   style={{ background: k.value > 0 ? `${k.color}06` : '#0a050a', borderColor: k.value > 0 ? `${k.color}22` : '#C9A84C10' }}>
                <Icon name={k.icon} size={16} className="mx-auto mb-1"
                      style={{ color: k.value > 0 ? k.color : '#374151' }} />
                <div className="text-xl font-black font-mono" style={{ color: k.value > 0 ? k.color : '#374151' }}>{k.value}</div>
                <div className="text-2xs mt-0.5" style={{ color: k.value > 0 ? k.color : '#374151' }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Agent summary cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Agent 1 card */}
            <div className="rounded-xl border p-4 space-y-3 cursor-pointer hover:border-opacity-60 transition-all"
                 style={{ background: '#0a050a', borderColor: '#ef444328' }}
                 onClick={() => setActiveTab('agent1')}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: '#ef444415', border: '1px solid #ef444330' }}>
                  <Icon name="ShieldAlert" size={18} style={{ color: RED }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-white">4P3X Intelligent AI™ 1</p>
                  <p className="text-2xs" style={{ color: RED }}>Welfare Risk AI</p>
                </div>
                <Pill label={`${a1?.promptCount||0} prompts`} color={RED} />
              </div>
              {a1?.summaryText && (
                <p className="text-2xs text-slate-400 leading-relaxed">{a1.summaryText.slice(0, 150)}{a1.summaryText.length > 150 ? '…' : ''}</p>
              )}
              <div className="flex items-center gap-2">
                <Pill label="Advisory Only" color={GOLD} />
                <Pill label="Local Rule-Based" color={SLATE} />
                <span className="text-2xs text-slate-700 ml-auto">Click to view →</span>
              </div>
            </div>

            {/* Agent 2 card */}
            <div className="rounded-xl border p-4 space-y-3 cursor-pointer hover:border-opacity-60 transition-all"
                 style={{ background: '#0a050a', borderColor: `${PURPLE}28` }}
                 onClick={() => setActiveTab('agent2')}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: `${PURPLE}18`, border: `1px solid ${PURPLE}30` }}>
                  <Icon name="FileSearch" size={18} style={{ color: PURPLE }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-white">4P3X Intelligent AI™ 2</p>
                  <p className="text-2xs" style={{ color: PURPLE }}>Safeguarding & Evidence AI</p>
                </div>
                <Pill label={`${a2?.promptCount||0} prompts`} color={PURPLE} />
              </div>
              {a2 && (
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-lg font-black font-mono"
                         style={{ color: a2.readiness === 'good' ? GREEN : a2.readiness === 'poor' ? RED : AMBER }}>
                      {a2.evidenceScore !== null ? `${a2.evidenceScore}%` : '—'}
                    </div>
                    <div className="text-2xs text-slate-600">Evidence readiness</div>
                  </div>
                  <p className="text-2xs text-slate-400 leading-relaxed flex-1">{a2.readinessSummary?.slice(0, 120)}{a2.readinessSummary?.length > 120 ? '…' : ''}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Pill label="Advisory Only" color={GOLD} />
                <Pill label="Evidence Prompts" color={PURPLE} />
                <span className="text-2xs text-slate-700 ml-auto">Click to view →</span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Risk & Escalation Centre', icon: 'ShieldAlert', route: ROUTES.RISK, color: RED, note: 'Review supervisor queue & risk flags' },
              { label: 'Evidence / Reports',        icon: 'FileText',    route: ROUTES.REPORTS, color: GOLD, note: 'Preview mission & incident reports' },
              { label: 'Command Dashboard',         icon: 'LayoutDashboard', route: ROUTES.DASHBOARD, color: PURPLE, note: 'Mission control overview' },
            ].map(l => (
              <button key={l.label} onClick={() => navigate(l.route)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:opacity-80"
                style={{ background: `${l.color}08`, borderColor: `${l.color}25` }}>
                <Icon name={l.icon} size={16} style={{ color: l.color }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: l.color }}>{l.label}</p>
                  <p className="text-2xs text-slate-600">{l.note}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══ AGENT 1 TAB ════════════════════════════════════════ */}
      {activeTab === 'agent1' && a1 && (
        <div className="space-y-5">
          <SectionCard title="4P3X Intelligent AI™ 1 — Welfare Risk AI" icon="ShieldAlert" accent={RED}
            action={<Pill label="Advisory Only" color={GOLD} />}>
            <div className="p-4 space-y-3">
              <OverallRiskBanner risk={a1.overallRisk} summaryText={a1.summaryText} />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label:'Overdue Responders', v:a1.metrics.overdueResponders,  c:RED },
                  { label:'Missed Check-ins',    v:a1.metrics.missedCheckIns,     c:AMBER },
                  { label:'Urgent Help Reqs',    v:a1.metrics.urgentHelpRequests, c:RED },
                  { label:'High-Risk Missions',  v:a1.metrics.highRiskMissions,   c:ORANGE },
                  { label:'Open Incidents',      v:a1.metrics.unresolvedIncidents,c:AMBER },
                  { label:'Open Risk Flags',     v:a1.metrics.openRiskFlags,      c:ORANGE },
                  { label:'Review Required',     v:a1.metrics.supervisorReviewRequired,c:RED },
                  { label:'Sync Issues',         v:(a1.metrics.syncFailed||0)+(a1.metrics.syncConflict||0),c:CYAN },
                ].map(k => (
                  <div key={k.label} className="rounded-lg border px-3 py-2 text-center"
                       style={{ background: k.v > 0 ? `${k.c}06` : '#0a050a', borderColor: `${k.c}18` }}>
                    <div className="text-lg font-black font-mono" style={{ color: k.v > 0 ? k.c : '#374151' }}>{k.v}</div>
                    <div className="text-2xs" style={{ color: k.v > 0 ? k.c : '#374151' }}>{k.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Welfare Risk Advisory Prompts" icon="Brain" count={a1.prompts.length} accent={RED}>
            {a1.prompts.length === 0
              ? <Empty icon="ShieldCheck" message="No advisory prompts at this time"
                  sub="No critical or high-risk signals detected in recorded data." accent={GREEN} />
              : a1.prompts.map(p => <AIPromptCard key={p.id} prompt={p} />)
            }
          </SectionCard>

          <AdvisoryBox color={AMBER}>
            {ADVISORY_NOTICE} All prompts are generated from recorded local data only.
            Records may be incomplete, pending, or offline.
          </AdvisoryBox>
        </div>
      )}

      {/* ══ AGENT 2 TAB ════════════════════════════════════════ */}
      {activeTab === 'agent2' && a2 && (
        <div className="space-y-5">
          <SectionCard title="4P3X Intelligent AI™ 2 — Safeguarding & Evidence AI" icon="FileSearch" accent={PURPLE}
            action={<Pill label="Advisory Only" color={GOLD} />}>
            <EvidenceScore score={a2.evidenceScore} readiness={a2.readiness} />
            <div className="p-4">
              <div className="rounded-xl border px-4 py-3"
                   style={{ background: `${PURPLE}06`, borderColor: `${PURPLE}20` }}>
                <p className="text-xs font-semibold mb-1" style={{ color: PURPLE }}>Evidence Readiness Summary</p>
                <p className="text-xs text-slate-300 leading-relaxed">{a2.readinessSummary}</p>
                <p className="text-2xs text-slate-700 mt-1">
                  Advisory only. Not a compliance rating. Human review required.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-4 pb-4">
              {[
                { label:'Completed Missions',       v:a2.metrics.completedMissions,  c:GOLD },
                { label:'With Outcome Notes',        v:a2.metrics.mWithOutcome,       c:GREEN },
                { label:'Incidents w/ Action',       v:a2.metrics.incWithAction,      c:GREEN },
                { label:'Incidents Reviewed',        v:a2.metrics.incWithReview,      c:GREEN },
                { label:'Flags Reviewed',            v:a2.metrics.flagsReviewed,      c:GREEN },
                { label:'Evidence Gaps',             v:a2.gapCount,                   c:RED },
              ].map(k => (
                <div key={k.label} className="rounded-lg border px-3 py-2 text-center"
                     style={{ background: `${k.c}06`, borderColor: `${k.c}18` }}>
                  <div className="text-lg font-black font-mono" style={{ color: k.c }}>{k.v}</div>
                  <div className="text-2xs" style={{ color: k.c }}>{k.label}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Evidence & Report Quality Prompts" icon="FileSearch" count={a2.prompts.length} accent={PURPLE}>
            {a2.prompts.length === 0
              ? <Empty icon="FileCheck" message="No evidence quality prompts at this time"
                  sub="All checked records appear to have required evidence fields." accent={GREEN} />
              : a2.prompts.map(p => <AIPromptCard key={p.id} prompt={p} />)
            }
          </SectionCard>

          <AdvisoryBox color={PURPLE}>
            Evidence gap prompts support record quality. They do not prove wrongdoing, safety, or compliance.
            Gaps may exist for valid reasons. AI cannot create, alter, or verify evidence.
            Human review is required before any conclusion is drawn.
          </AdvisoryBox>
        </div>
      )}

      {/* ══ RECOMMENDED ACTIONS TAB ════════════════════════════ */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          <AdvisoryBox color={AMBER}>
            All recommended actions are advisory human review prompts. None are automated, executed,
            or actioned by the system. Human judgement and organisational procedures apply.
          </AdvisoryBox>

          {/* Combined actions sorted by priority */}
          {(() => {
            const combined = [
              ...(a1?.recommendedActions || []),
              ...(a2?.recommendedActions || []),
            ].sort((a, b) => (a.priority||9) - (b.priority||9))

            return (
              <SectionCard title="Recommended Human Actions" icon="ListChecks"
                count={combined.length} accent={GOLD}>
                {combined.length === 0
                  ? <Empty icon="CheckCircle2" message="No recommended actions at this time"
                      sub="No advisory prompts requiring immediate attention." accent={GREEN} />
                  : combined.map(action => <ActionItem key={action.id} action={action} />)
                }
              </SectionCard>
            )
          })()}

          <div className="rounded-xl border px-4 py-3"
               style={{ background: '#C9A84C06', borderColor: '#C9A84C20' }}>
            <p className="text-xs font-bold mb-1" style={{ color: GOLD }}>What these actions mean</p>
            <ul className="space-y-1">
              {[
                'P1 — Priority 1: High/Critical advisory prompt. Supervisor review strongly recommended.',
                'P2 — Priority 2: High advisory prompt. Review recommended.',
                'P3 — Priority 3: Medium prompt. Routine supervisor check recommended.',
                'P4 — Priority 4: Evidence quality prompt. Address when completing records.',
              ].map((t, i) => (
                <li key={i} className="text-2xs text-slate-500 flex items-start gap-1.5">
                  <Icon name="Dot" size={12} style={{ color: GOLD, flexShrink: 0 }} />
                  {t}
                </li>
              ))}
            </ul>
            <p className="text-2xs text-slate-700 mt-2">
              All priorities are advisory classifications only.
              They do not represent verified risk levels or compliance requirements.
            </p>
          </div>
        </div>
      )}

      {/* ══ LIMITATIONS TAB ════════════════════════════════════ */}
      {activeTab === 'limitation' && (
        <div className="space-y-4">
          <SectionCard title="4P3X Intelligent AI™ — Limitations & Advisory Boundaries"
            icon="Info" accent={GOLD}>
            <div className="p-5 space-y-4">
              <div className="space-y-3">
                {[
                  {
                    title: 'Advisory prompts only',
                    detail: '4P3X Intelligent AI™ provides advisory prompts based on recorded data. It does not verify facts independently, diagnose people, replace safeguarding professionals, replace emergency services, or make final decisions.',
                    icon: 'ShieldAlert', color: RED,
                  },
                  {
                    title: 'No autonomous actions',
                    detail: 'The AI does not send messages, contact anyone, escalate automatically, close records, accuse individuals, or take any action in the real world.',
                    icon: 'Lock', color: AMBER,
                  },
                  {
                    title: 'Local rule-based — no external AI API',
                    detail: 'This system uses local rule-based analysis only. No data is sent to external AI services. No API keys are used. 4P3X API Config Guard™ — future optional AI provider placeholder. Not required for demo. Configured in Run 9 if needed.',
                    icon: 'Database', color: CYAN,
                  },
                  {
                    title: 'Records may be incomplete',
                    detail: 'Records are only as complete as the information entered and synced. Offline, pending, failed, or conflict records may not be reflected. AI analysis is based solely on what is recorded — not real-world facts.',
                    icon: 'Database', color: PURPLE,
                  },
                  {
                    title: 'Human review is primary',
                    detail: 'All prompts require human supervisor review. AI prompts do not replace professional safeguarding judgement, clinical assessment, legal duties, or emergency services.',
                    icon: 'User', color: GREEN,
                  },
                  {
                    title: 'Evidence protection',
                    detail: 'The AI engine does not create, alter, delete, or fabricate evidence records. All evidence records are append-only through the SSOT. AI summaries are derived from recorded data — not invented.',
                    icon: 'FileCheck', color: GREEN,
                  },
                  {
                    title: 'Emergency services',
                    detail: 'If someone is in immediate danger, contact emergency services immediately. ResponseLink OS™ does not contact emergency services automatically. The system is not monitored by emergency services in real time.',
                    icon: 'Siren', color: RED,
                  },
                  {
                    title: 'No medical or safeguarding determinations',
                    detail: 'The AI does not diagnose health conditions, determine safeguarding outcomes, assess mental capacity, or make welfare decisions. These require qualified professionals.',
                    icon: 'Stethoscope', color: RED,
                  },
                  {
                    title: 'Demo mode',
                    detail: 'In Demo Mode, all analysis uses simulated/demo records only. Demo reports and AI summaries should not be used as real evidence or cited as live operational data.',
                    icon: 'TestTube', color: GOLD,
                  },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl border px-4 py-3.5 flex items-start gap-3"
                       style={{ background: `${item.color}06`, borderColor: `${item.color}20` }}>
                    <Icon name={item.icon} size={14} style={{ color: item.color, flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p className="text-xs font-bold mb-0.5" style={{ color: item.color }}>{item.title}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="rounded-xl border px-5 py-4" style={{ background: '#C9A84C04', borderColor: '#C9A84C15' }}>
        <div className="flex items-start gap-3">
          <Icon name="Brain" size={14} style={{ color: GOLD, flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong style={{ color: GOLD }}>4P3X Intelligent AI™ Oversight · ResponseLink OS™</strong> —
            Advisory platform. {ADVISORY_NOTICE}
            If someone is in immediate danger, contact emergency services.
            Run 8 · Local-first · Backend in Run 9.
          </p>
        </div>
      </div>
    </div>
  )
}
