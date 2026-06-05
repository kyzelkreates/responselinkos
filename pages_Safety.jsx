/**
 * ============================================================
 * ResponseLink OS™ — Risk & Escalation Centre
 * pages_Safety.jsx  (route: /safety)
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 7 — Risk, Escalation & Safeguarding-Aware Workflow
 * LOCAL-FIRST. No backend. No AI agents yet.
 *
 * ⚠ ADVISORY: ResponseLink OS™ is advisory and coordination-support
 *   software. It does not replace emergency services, safeguarding
 *   professionals, clinical judgement, legal duties, or procedures.
 *   If someone is in immediate danger, contact emergency services.
 * ============================================================
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon            from './components_ui_Icon'
import { ROUTES }      from './config_routes'
import { formatDateTime } from './utils_format'
import { getDemoMode } from './core_rlData'
import { seedDemoData } from './core_rlDemoData'
import {
  getRiskColor, getReviewColor,
  getOverdueResponderCheckIns, getMissedServiceUserCheckIns,
  getUrgentHelpRequests, getOpenEscalations,
  detectEvidenceGaps, detectDataFreshnessWarnings,
  getSupervisorReviewQueue, getDashboardRiskStatus,
  markRiskFlagInReview, markRiskFlagReviewed,
  addSupervisorReviewNote, markIncidentReviewed,
  markIncidentActionRequired, closeEscalationWithReview,
  reopenRiskFlag, markHelpRequestReviewed,
} from './core_rlRiskEngine'
import { getOpenRiskFlags, getOpenIncidents, timeAgo } from './core_rlSelectors'

// ─── Colour tokens ─────────────────────────────────────────────
const GOLD   = '#C9A84C'
const GREEN  = '#22c55e'
const RED    = '#ef4444'
const AMBER  = '#f59e0b'
const PURPLE = '#a855f7'
const CYAN   = '#06b6d4'
const ORANGE = '#f97316'
const SLATE  = '#A8A9AD'

const RISK_LABELS = { low:'Low', medium:'Medium', high:'High', critical:'Critical' }
const RISK_ICONS  = { low:'ShieldCheck', medium:'ShieldAlert', high:'AlertTriangle', critical:'Flame' }
const REVIEW_LABELS = {
  not_required:'Not Required', required:'Required', pending:'Pending',
  in_review:'In Review', reviewed:'Reviewed', action_required:'Action Required', closed:'Closed',
}

// ─── Shared mini components ────────────────────────────────────
function Pill({ label, color, bg, border }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold"
          style={{ color, background: bg, border: `1px solid ${border || bg}` }}>
      {label}
    </span>
  )
}

function RiskPill({ level }) {
  const c = getRiskColor(level)
  return <Pill label={RISK_LABELS[level] || level} color={c.text} bg={c.bg} border={c.border} />
}

function ReviewPill({ status }) {
  const c = getReviewColor(status)
  return <Pill label={REVIEW_LABELS[status] || status?.replace(/_/g,' ')} color={c.text} bg={c.bg} border={c.bg} />
}

function Card({ title, icon, count, accent = GOLD, children, className = '' }) {
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

function Advisory({ children, color = RED }) {
  const textColor = color === RED ? '#fca5a5' : color === AMBER ? '#fde68a' : color === CYAN ? '#67e8f9' : SLATE
  return (
    <div className="rounded-xl border px-4 py-3"
         style={{ background: `${color}06`, borderColor: `${color}20` }}>
      <p className="text-2xs leading-relaxed" style={{ color: textColor }}>{children}</p>
    </div>
  )
}

function EmergencyNotice() {
  return (
    <div className="rounded-xl border px-4 py-3.5 flex items-start gap-3"
         style={{ background: '#ef444408', borderColor: '#ef444330' }}>
      <Icon name="ShieldAlert" size={16} style={{ color: RED, flexShrink: 0, marginTop: 1 }} />
      <div>
        <p className="text-xs font-bold mb-1" style={{ color: RED }}>
          Advisory Platform — Emergency Notice
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          ResponseLink OS™ is advisory and coordination-support software. It does not replace emergency
          services, safeguarding professionals, clinical judgement, legal duties, or organisational procedures.
          <strong className="text-white"> If someone is in immediate danger, contact emergency services immediately.</strong>{' '}
          All risk prompts require human review. No system prompts verify facts independently.
        </p>
      </div>
    </div>
  )
}

// ─── Review Action Modal ───────────────────────────────────────
function ReviewModal({ item, onClose, onSave }) {
  const [note,   setNote]   = useState('')
  const [action, setAction] = useState('in_review')
  const [error,  setError]  = useState('')

  const baseActions = [
    { value: 'in_review',       label: 'Mark In Review',          icon: 'Eye' },
    { value: 'add_note',        label: 'Add Supervisor Note',      icon: 'MessageSquare' },
    { value: 'reviewed',        label: 'Mark Reviewed',           icon: 'CheckCircle2' },
    { value: 'action_required', label: 'Mark Action Required',    icon: 'AlertCircle' },
    { value: 'close_reviewed',  label: 'Close With Review Note',  icon: 'CheckSquare' },
    { value: 'reopen',          label: 'Reopen Flag',             icon: 'RefreshCw' },
  ]
  const helpActions = [
    { value: 'help_reviewed', label: 'Acknowledge Help Request',  icon: 'LifeBuoy' },
    { value: 'add_note',      label: 'Add Supervisor Note',       icon: 'MessageSquare' },
  ]
  const incActions = [
    { value: 'add_note',        label: 'Add Supervisor Note',     icon: 'MessageSquare' },
    { value: 'reviewed',        label: 'Mark Reviewed',           icon: 'CheckCircle2' },
    { value: 'action_required', label: 'Mark Action Required',   icon: 'AlertCircle' },
  ]

  const actions = item.sourceEntityType === 'serviceUser' ? helpActions
               :  item.sourceEntityType === 'incident'    ? incActions
               :  baseActions

  const handleSave = () => {
    setError('')
    if (action === 'close_reviewed' && !note.trim()) { setError('A review note is required to close.'); return }
    if (action === 'add_note' && !note.trim()) { setError('Please enter a note.'); return }

    const eId = item.sourceEntityId
    let result
    switch (action) {
      case 'in_review':       result = markRiskFlagInReview(eId, note); break
      case 'add_note':        result = addSupervisorReviewNote(item.sourceEntityType, eId, note); break
      case 'reviewed':        result = item.sourceEntityType === 'incident' ? markIncidentReviewed(eId, note) : markRiskFlagReviewed(eId, note); break
      case 'action_required': result = markIncidentActionRequired(eId, note); break
      case 'close_reviewed':  result = closeEscalationWithReview(eId, note); break
      case 'reopen':          result = reopenRiskFlag(eId, note); break
      case 'help_reviewed':   result = markHelpRequestReviewed(eId, note); break
      default:                result = { ok: false, error: 'Unknown action' }
    }
    if (result?.ok) onSave()
    else setError(result?.error || 'Action failed.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.85)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border"
           style={{ background: '#0a050a', borderColor: '#C9A84C35' }}>

        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#C9A84C20' }}>
          <div>
            <p className="text-2xs text-slate-500 mb-0.5 uppercase tracking-wider">Supervisor Review</p>
            <h2 className="text-sm font-bold text-white leading-snug">{item.title}</h2>
          </div>
          <button onClick={onClose}><Icon name="X" size={18} className="text-slate-500 hover:text-white" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <RiskPill level={item.riskLevel} />
            <ReviewPill status={item.reviewStatus} />
            <span className="text-2xs text-slate-600">{item.triggerType?.replace(/_/g,' ')}</span>
          </div>

          <div className="rounded-xl border px-3 py-2.5" style={{ background: '#C9A84C06', borderColor: '#C9A84C18' }}>
            <p className="text-xs text-slate-300 leading-relaxed">{item.summary}</p>
          </div>

          <div className="rounded-xl border px-3 py-2.5" style={{ background: '#22c55e06', borderColor: '#22c55e18' }}>
            <p className="text-2xs font-semibold mb-1" style={{ color: GREEN }}>Recommended Human Action</p>
            <p className="text-xs text-slate-400 leading-relaxed">{item.recommendedHumanAction}</p>
          </div>

          {item.supervisorNote && (
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Existing Notes</p>
              <div className="rounded-xl border px-3 py-2.5" style={{ background: '#a855f706', borderColor: '#a855f718' }}>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{item.supervisorNote}</p>
              </div>
            </div>
          )}

          <div>
            <p className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Choose Action</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {actions.map(a => (
                <button key={a.value} onClick={() => setAction(a.value)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all"
                  style={{ background: action === a.value ? '#C9A84C18' : '#0a050a', borderColor: action === a.value ? '#C9A84C50' : '#C9A84C18' }}>
                  <Icon name={a.icon} size={13} style={{ color: action === a.value ? GOLD : '#64748b' }} />
                  <span className="text-xs font-medium" style={{ color: action === a.value ? GOLD : '#94a3b8' }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Supervisor Note {action === 'close_reviewed' ? '(required)' : '(optional)'}
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Add supervisor review note…"
              className="w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder-slate-600 resize-none focus:outline-none"
              style={{ background: '#0a050a', borderColor: '#C9A84C25' }} />
            <p className="text-2xs text-slate-700 mt-1">
              Notes are append-only. Records are only as complete as information entered and synced.
              System prompts do not verify facts independently.
            </p>
          </div>

          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#ef444410', color: '#fca5a5' }}>{error}</p>}

          <Advisory color={AMBER}>
            This is a coordinator/supervisor review action only. It does not replace professional
            safeguarding, clinical, or legal assessment. Closing or reviewing a record does not mean
            the situation is resolved.
          </Advisory>

          <button onClick={handleSave}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: GOLD, color: '#000' }}>
            Save Review Action
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Review Queue Item ─────────────────────────────────────────
function ReviewQueueItem({ item, onAction }) {
  const rc = getRiskColor(item.riskLevel)
  return (
    <div className="px-4 py-4 border-b last:border-0" style={{ borderColor: `${rc.border}18` }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
             style={{ background: rc.bg }}>
          <Icon name={RISK_ICONS[item.riskLevel] || 'AlertTriangle'} size={14} style={{ color: rc.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-xs font-bold text-white flex-1 min-w-0">{item.title}</p>
            <RiskPill level={item.riskLevel} />
            <ReviewPill status={item.reviewStatus} />
          </div>
          <p className="text-2xs text-slate-500 leading-relaxed mb-1">{item.summary}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xs text-slate-700">{item.triggerType?.replace(/_/g,' ')}</span>
            <span className="text-2xs text-slate-800">·</span>
            <span className="text-2xs text-slate-700">{timeAgo(item.createdAt)}</span>
          </div>
          {item.supervisorNote && (
            <p className="text-2xs mt-1.5 px-2 py-1 rounded" style={{ background: '#a855f708', color: '#c084fc' }}>
              Note: {item.supervisorNote.slice(0, 70)}{item.supervisorNote.length > 70 ? '…' : ''}
            </p>
          )}
          <p className="text-2xs mt-1 px-2 py-1 rounded leading-relaxed" style={{ background: '#22c55e08', color: '#86efac' }}>
            ↳ {item.recommendedHumanAction}
          </p>
          <button onClick={() => onAction(item)}
            className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: GOLD, color: '#000' }}>
            <Icon name="Eye" size={12} /> Review
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Risk Flag Item ────────────────────────────────────────────
function RiskFlagItem({ flag, onAction }) {
  const rc = getRiskColor(flag.riskLevel)
  return (
    <div className="px-4 py-3.5 border-b last:border-0" style={{ borderColor: `${rc.border}15` }}>
      <div className="flex items-start gap-3">
        <Icon name="Flag" size={13} style={{ color: rc.text, flexShrink: 0, marginTop: 2 }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-xs font-bold text-white flex-1">{flag.title}</p>
            <RiskPill level={flag.riskLevel} />
          </div>
          <p className="text-2xs text-slate-500 leading-relaxed">
            {flag.description?.slice(0, 100)}{flag.description?.length > 100 ? '…' : ''}
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-2xs text-slate-700">{flag.triggerType?.replace(/_/g,' ')}</span>
            <span className="text-2xs text-slate-700">· {timeAgo(flag.createdAt)}</span>
            {flag.humanReviewed
              ? <span className="text-2xs font-bold" style={{ color: GREEN }}>✓ Reviewed</span>
              : flag.requiresSupervisorReview && (
                <span className="text-2xs font-bold px-1.5 py-0.5 rounded"
                      style={{ background: '#ef444412', color: RED }}>Review required</span>
              )
            }
          </div>
          {flag.supervisorNote && (
            <p className="text-2xs mt-1 px-2 py-1 rounded" style={{ background: '#a855f708', color: '#c084fc' }}>
              Note: {flag.supervisorNote.slice(0, 60)}{flag.supervisorNote.length > 60 ? '…' : ''}
            </p>
          )}
          {onAction && (
            <button onClick={() => onAction(flag)}
              className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: '#C9A84C18', color: GOLD }}>
              <Icon name="Eye" size={11} /> Review
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Live Mode Empty ───────────────────────────────────────────
function LiveEmpty({ onDemoToggle }) {
  return (
    <div className="rounded-xl border p-6 space-y-4"
         style={{ background: `${PURPLE}06`, borderColor: `${PURPLE}25` }}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: `${PURPLE}15`, border: `1px solid ${PURPLE}40` }}>
          <Icon name="ShieldAlert" size={18} style={{ color: PURPLE }} />
        </div>
        <div>
          <h3 className="text-sm font-bold mb-1" style={{ color: PURPLE }}>Live Mode — No Risk Records Yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real operational use requires a configured backend, authentication, access controls,
            data protection setup, and organisational procedures. Backend setup is in a later run.
          </p>
        </div>
      </div>
      <Advisory color={RED}>
        Do not enter real sensitive welfare data until a secure backend, authentication,
        access controls, data protection process, and organisational approval are configured.
      </Advisory>
      <button onClick={onDemoToggle}
        className="px-4 py-2 rounded-lg text-xs font-bold"
        style={{ background: GREEN, color: '#000' }}>
        Switch to Demo Mode
      </button>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────
export default function RiskEscalationCentre() {
  const navigate = useNavigate()

  const [isDemo,        setIsDemo]       = useState(getDemoMode)
  const [riskStatus,    setRiskStatus]   = useState({})
  const [reviewQueue,   setReviewQueue]  = useState([])
  const [evidenceGaps,  setEvidenceGaps] = useState([])
  const [freshness,     setFreshness]    = useState({ hasWarning: false, warnings: [], counts: {} })
  const [openFlags,     setOpenFlags]    = useState([])
  const [openIncidents, setOpenInc]      = useState([])
  const [overdueR,      setOverdueR]     = useState([])
  const [missedSU,      setMissedSU]     = useState([])
  const [urgentHelp,    setUrgentHelp]   = useState([])
  const [reviewItem,    setReviewItem]   = useState(null)
  const [tab,           setTab]          = useState('review_queue')
  const [loading,       setLoading]      = useState(true)

  const loadData = useCallback(() => {
    try {
      const demo = getDemoMode()
      setIsDemo(demo)
      setRiskStatus(getDashboardRiskStatus())
      setReviewQueue(getSupervisorReviewQueue())
      setEvidenceGaps(detectEvidenceGaps())
      setFreshness(detectDataFreshnessWarnings())
      setOpenFlags(getOpenRiskFlags())
      setOpenInc(getOpenIncidents())
      setOverdueR(getOverdueResponderCheckIns())
      setMissedSU(getMissedServiceUserCheckIns())
      setUrgentHelp(getUrgentHelpRequests())
    } catch (e) { console.error('[RL:Risk]', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData(); const t = setInterval(loadData, 30000); return () => clearInterval(t) }, [loadData])

  const hasData = reviewQueue.length > 0 || openFlags.length > 0 || openIncidents.length > 0

  const OR    = riskStatus.overallRisk || 'low'
  const ORCol = getRiskColor(OR)

  const TABS = [
    { id: 'review_queue', label: 'Review Queue',   icon: 'ClipboardCheck', count: reviewQueue.length,     color: RED },
    { id: 'risk_flags',   label: 'Risk Flags',     icon: 'Flag',           count: openFlags.length,       color: ORANGE },
    { id: 'incidents',    label: 'Incidents',       icon: 'AlertOctagon',   count: openIncidents.length,   color: AMBER },
    { id: 'evidence',     label: 'Evidence Gaps',   icon: 'FileX',          count: evidenceGaps.length,    color: PURPLE },
    { id: 'freshness',    label: 'Data Freshness',  icon: 'Clock',          count: freshness.warnings?.length || 0, color: CYAN },
  ]

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-5" style={{ background: '#020002', color: '#fff' }}>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: `${RED}15`, border: `1px solid ${RED}30` }}>
            <Icon name="ShieldAlert" size={18} style={{ color: RED }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Risk & Escalation Centre</h1>
            <p className="text-2xs" style={{ color: GOLD }}>ResponseLink OS™ · Advisory Only · Run 7</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
               style={{ background: ORCol.bg, borderColor: ORCol.border }}>
            <Icon name={RISK_ICONS[OR]} size={13} style={{ color: ORCol.text }} />
            <span className="text-xs font-bold" style={{ color: ORCol.text }}>
              {RISK_LABELS[OR]} Risk
            </span>
          </div>
          <button onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold text-slate-400 hover:text-white"
            style={{ borderColor: '#C9A84C18', background: '#C9A84C08' }}>
            <Icon name="RefreshCw" size={13} style={{ color: GOLD }} /> Refresh
          </button>
          <button onClick={() => navigate(ROUTES.DASHBOARD)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold text-slate-400 hover:text-white"
            style={{ borderColor: '#C9A84C18', background: '#C9A84C08' }}>
            <Icon name="LayoutDashboard" size={13} style={{ color: GOLD }} /> Dashboard
          </button>
        </div>
      </div>

      {/* Emergency notice */}
      <EmergencyNotice />

      {/* Live mode empty */}
      {!isDemo && !hasData && <LiveEmpty onDemoToggle={() => { setIsDemo(true); loadData() }} />}

      {/* Demo: seed prompt */}
      {isDemo && !hasData && !loading && (
        <div className="rounded-xl border px-5 py-5" style={{ background: '#C9A84C06', borderColor: '#C9A84C25' }}>
          <p className="text-sm font-bold text-white mb-1">No Demo Risk Data Yet</p>
          <p className="text-xs text-slate-400 mb-3">Seed demo data to see the risk & escalation workflow.</p>
          <button onClick={async () => { await seedDemoData(false); loadData() }}
            className="px-4 py-2 rounded-lg text-xs font-bold"
            style={{ background: GOLD, color: '#000' }}>
            Seed Demo Data
          </button>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Review Queue',   value: riskStatus.reviewQueueCount    || 0, color: RED,    icon: 'ClipboardCheck' },
          { label: 'Critical Flags', value: riskStatus.criticalFlags        || 0, color: RED,    icon: 'Flame' },
          { label: 'High Flags',     value: riskStatus.highFlags            || 0, color: ORANGE, icon: 'AlertTriangle' },
          { label: 'Overdue Resp.',  value: riskStatus.overdueResponders    || 0, color: AMBER,  icon: 'UserX' },
          { label: 'Missed SU CI',   value: riskStatus.missedCheckIns       || 0, color: AMBER,  icon: 'HeartOff' },
          { label: 'Urgent Help',    value: riskStatus.urgentHelpRequests   || 0, color: RED,    icon: 'LifeBuoy' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border p-3 text-center"
               style={{ background: k.value > 0 ? `${k.color}08` : '#0a050a', borderColor: k.value > 0 ? `${k.color}25` : '#C9A84C12' }}>
            <Icon name={k.icon} size={18} className="mx-auto mb-1" style={{ color: k.value > 0 ? k.color : '#374151' }} />
            <div className="text-2xl font-black font-mono" style={{ color: k.value > 0 ? k.color : '#374151' }}>{k.value}</div>
            <div className="text-2xs" style={{ color: k.value > 0 ? k.color : '#374151' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Advisory */}
      <Advisory color={AMBER}>
        All risk prompts are advisory and require human review. ResponseLink OS™ does not make safeguarding,
        clinical, legal, or emergency decisions. Use professional judgement and follow your organisation's
        lone working, safeguarding, and escalation procedures.
      </Advisory>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b overflow-x-auto" style={{ borderColor: '#C9A84C15' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px whitespace-nowrap"
            style={{ borderColor: tab === t.id ? t.color : 'transparent', color: tab === t.id ? t.color : '#64748b' }}>
            <Icon name={t.icon} size={13} />
            {t.label}
            {t.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-2xs font-bold"
                    style={{ background: `${t.color}20`, color: t.color }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── REVIEW QUEUE TAB ──────────────────────────────────── */}
      {tab === 'review_queue' && (
        <div className="space-y-4">
          <Card title="Supervisor Review Queue" icon="ClipboardCheck" count={reviewQueue.length} accent={RED}>
            {reviewQueue.length === 0
              ? <Empty icon="ShieldCheck" message="No items in review queue" sub="No flags, incidents, or help requests requiring supervisor review." accent={GREEN} />
              : reviewQueue.map(item => <ReviewQueueItem key={item.id} item={item} onAction={setReviewItem} />)
            }
          </Card>
          <Advisory color={SLATE}>
            Records are only as complete as the information entered and synced.
            AI or system prompts do not verify facts independently.
            Supervisor review does not replace organisational procedures, legal duties, or professional safeguarding assessment.
          </Advisory>
        </div>
      )}

      {/* ── RISK FLAGS TAB ────────────────────────────────────── */}
      {tab === 'risk_flags' && (
        <div className="space-y-4">
          <Card title="Open Risk Flags" icon="Flag" count={openFlags.length} accent={ORANGE}>
            {openFlags.length === 0
              ? <Empty icon="ShieldCheck" message="No open risk flags" sub="No advisory risk flags at this time." accent={GREEN} />
              : openFlags.map(flag => (
                  <RiskFlagItem key={flag.id} flag={flag} onAction={f => setReviewItem({
                    id: f.id, sourceEntityType: 'riskFlag', sourceEntityId: f.id,
                    title: f.title, summary: f.description, riskLevel: f.riskLevel,
                    reviewStatus: f.reviewStatus || (f.humanReviewed ? 'reviewed' : 'required'),
                    triggerType: f.triggerType, supervisorNote: f.supervisorNote,
                    recommendedHumanAction: 'Review flag, add supervisor note, and close or escalate.',
                    createdAt: f.createdAt,
                  })} />
                ))
            }
          </Card>

          <Card title="Overdue Responder Check-Ins" icon="UserX" count={overdueR.length} accent={AMBER}>
            {overdueR.length === 0
              ? <Empty icon="UserCheck" message="No overdue responder check-ins" sub="All responders within expected check-in windows." accent={GREEN} />
              : overdueR.map(r => (
                  <div key={r.id} className="px-4 py-3 border-b last:border-0 flex items-start gap-3"
                       style={{ borderColor: '#f59e0b15' }}>
                    <Icon name="UserX" size={14} style={{ color: AMBER, flexShrink: 0, marginTop: 1 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white">{r.displayName}</p>
                      <p className="text-2xs text-slate-500">Status: {r.status?.replace(/_/g,' ')} · Last: {r.lastCheckInAt ? timeAgo(r.lastCheckInAt) : 'unknown'}</p>
                      <p className="text-2xs mt-1 px-2 py-0.5 rounded"
                         style={{ background: '#f59e0b10', color: '#fde68a' }}>
                        Follow lone-working procedure · Contact responder · Add supervisor note
                      </p>
                    </div>
                    <Pill label="Review Required" color={AMBER} bg="#f59e0b10" border="#f59e0b30" />
                  </div>
                ))
            }
          </Card>

          <Card title="Missed Service User Check-Ins" icon="HeartOff" count={missedSU.length} accent={AMBER}>
            {missedSU.length === 0
              ? <Empty icon="Heart" message="No missed service user check-ins" sub="All service users have recent check-in records." accent={GREEN} />
              : missedSU.map(su => (
                  <div key={su.id} className="px-4 py-3 border-b last:border-0 flex items-start gap-3"
                       style={{ borderColor: '#f59e0b15' }}>
                    <Icon name="HeartOff" size={14} style={{ color: AMBER, flexShrink: 0, marginTop: 1 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white">{su.displayName}</p>
                      <p className="text-2xs text-slate-500">
                        {su.wellbeingStatus?.replace(/_/g,' ')} · Last: {su.lastCheckInAt ? timeAgo(su.lastCheckInAt) : 'none recorded'}
                      </p>
                      <p className="text-2xs mt-1 px-2 py-0.5 rounded"
                         style={{ background: '#f59e0b10', color: '#fde68a' }}>
                        Advisory · Supervisor review recommended
                      </p>
                    </div>
                    <Pill label="Follow Up" color={AMBER} bg="#f59e0b10" border="#f59e0b30" />
                  </div>
                ))
            }
          </Card>

          <Card title="Urgent Help Requests" icon="LifeBuoy" count={urgentHelp.length} accent={RED}>
            {urgentHelp.length === 0
              ? <Empty icon="LifeBuoy" message="No urgent help requests" sub="No service users have active urgent help requests." accent={GREEN} />
              : urgentHelp.map(su => (
                  <div key={su.id} className="px-4 py-4 border-b last:border-0"
                       style={{ borderColor: '#ef444415' }}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <Icon name="LifeBuoy" size={14} style={{ color: RED }} />
                      <p className="text-xs font-bold text-white flex-1">{su.displayName}</p>
                      <Pill label={su.wellbeingStatus?.replace(/_/g,' ')} color={RED} bg="#ef444412" border="#ef444430" />
                    </div>
                    <p className="text-2xs text-slate-500 ml-[26px]">
                      Help: {su.helpRequestStatus?.replace(/_/g,' ')} · {su.lastCheckInAt ? timeAgo(su.lastCheckInAt) : 'unknown'}
                    </p>
                    <p className="text-2xs mt-1.5 ml-[26px] px-2 py-1.5 rounded leading-relaxed"
                       style={{ background: '#ef444408', color: '#fca5a5' }}>
                      ⚠ Advisory signal only. Contact service user or linked responder.
                      If there is immediate danger, contact emergency services.
                    </p>
                    {!su.helpRequestReviewedAt
                      ? <button onClick={() => { markHelpRequestReviewed(su.id, 'Acknowledged by supervisor.'); loadData() }}
                          className="mt-2 ml-[26px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: '#C9A84C18', color: GOLD }}>
                          <Icon name="CheckCircle2" size={12} /> Acknowledge
                        </button>
                      : <p className="text-2xs mt-1 ml-[26px] font-semibold" style={{ color: GREEN }}>
                          ✓ Acknowledged {timeAgo(su.helpRequestReviewedAt)}
                        </p>
                    }
                  </div>
                ))
            }
          </Card>
        </div>
      )}

      {/* ── INCIDENTS TAB ─────────────────────────────────────── */}
      {tab === 'incidents' && (
        <div className="space-y-4">
          <Card title="Incident Review Queue" icon="AlertOctagon" count={openIncidents.length} accent={AMBER}>
            {openIncidents.length === 0
              ? <Empty icon="CheckCircle2" message="No open incidents" sub="All incidents reviewed or closed." accent={GREEN} />
              : openIncidents.map(inc => {
                  const lvl = inc.severity === 'critical' ? 'critical' : inc.severity === 'high' ? 'high' : inc.severity === 'medium' ? 'medium' : 'low'
                  const rc  = getRiskColor(lvl)
                  return (
                    <div key={inc.id} className="px-4 py-4 border-b last:border-0"
                         style={{ borderColor: `${rc.border}15` }}>
                      <div className="flex items-start gap-3">
                        <Icon name="AlertOctagon" size={13} style={{ color: rc.text, flexShrink: 0, marginTop: 1 }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-xs font-bold text-white flex-1">{inc.title}</p>
                            <RiskPill level={lvl} />
                          </div>
                          <p className="text-2xs text-slate-500 leading-relaxed">
                            {inc.description?.slice(0, 100)}{inc.description?.length > 100 ? '…' : ''}
                          </p>
                          <p className="text-2xs text-slate-700 mt-0.5">
                            {inc.category?.replace(/_/g,' ')} · {timeAgo(inc.createdAt)}
                          </p>
                          {inc.actionTaken && (
                            <p className="text-2xs mt-1.5 px-2 py-1 rounded"
                               style={{ background: '#22c55e06', color: '#86efac' }}>
                              Action: {inc.actionTaken.slice(0, 80)}
                            </p>
                          )}
                          {inc.supervisorNote && (
                            <p className="text-2xs mt-1 px-2 py-1 rounded"
                               style={{ background: '#a855f706', color: '#c084fc' }}>
                              Note: {inc.supervisorNote.slice(0, 80)}
                            </p>
                          )}
                          <span className="text-2xs mt-1.5 inline-block px-1.5 py-0.5 rounded font-bold"
                               style={{
                                 background: inc.supervisorReviewStatus === 'reviewed' ? '#22c55e12' : '#ef444412',
                                 color: inc.supervisorReviewStatus === 'reviewed' ? GREEN : RED,
                               }}>
                            {inc.supervisorReviewStatus?.replace(/_/g,' ') || 'pending review'}
                          </span>
                          {inc.supervisorReviewStatus !== 'reviewed' && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <button onClick={() => { markIncidentReviewed(inc.id); loadData() }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                style={{ background: '#22c55e15', color: GREEN }}>
                                <Icon name="CheckCircle2" size={12} /> Reviewed
                              </button>
                              <button onClick={() => { markIncidentActionRequired(inc.id, 'Action required.'); loadData() }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                style={{ background: '#ef444415', color: RED }}>
                                <Icon name="AlertCircle" size={12} /> Action Required
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
            }
          </Card>
          <Advisory color={AMBER}>
            Incident records are advisory only. Human supervisor review is required before treating
            any incident record as a final determination of events, safety, or compliance.
          </Advisory>
        </div>
      )}

      {/* ── EVIDENCE GAPS TAB ─────────────────────────────────── */}
      {tab === 'evidence' && (
        <div className="space-y-4">
          <Advisory color={PURPLE}>
            Evidence gap prompts support record quality. They do not prove wrongdoing, safety, or compliance.
            Gaps may exist for valid reasons. Human review is required before any conclusion is drawn.
          </Advisory>
          <Card title="Evidence Gap Prompts" icon="FileX" count={evidenceGaps.length} accent={PURPLE}>
            {evidenceGaps.length === 0
              ? <Empty icon="FileCheck" message="No evidence gaps detected" sub="All checked records have supporting evidence." accent={GREEN} />
              : evidenceGaps.map(gap => {
                  const rc = getRiskColor(gap.severity)
                  return (
                    <div key={gap.id} className="px-4 py-3 border-b last:border-0 flex items-start gap-3"
                         style={{ borderColor: `${rc.border}15` }}>
                      <Icon name="FileX" size={13} style={{ color: rc.text, flexShrink: 0, marginTop: 1 }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs font-bold text-white flex-1">{gap.title}</p>
                          <RiskPill level={gap.severity} />
                        </div>
                        <p className="text-2xs text-slate-500">{gap.description}</p>
                        <p className="text-2xs mt-0.5 text-slate-700">{gap.advisoryNote}</p>
                      </div>
                    </div>
                  )
                })
            }
          </Card>
        </div>
      )}

      {/* ── DATA FRESHNESS TAB ────────────────────────────────── */}
      {tab === 'freshness' && (
        <div className="space-y-4">
          <Card title="Data Freshness & Sync Warnings" icon="Clock" count={freshness.warnings?.length || 0} accent={CYAN}>
            <div className="p-4 space-y-3">
              <Advisory color={CYAN}>
                {freshness.standardWarning || 'Data may be incomplete or stale. Offline, pending, failed, or conflict records may not reflect the latest real-world situation. Human review is required for safety-sensitive decisions.'}
              </Advisory>
              {freshness.warnings?.length === 0 && (
                <Empty icon="CheckCircle2" message="No data freshness warnings" sub="All sync records appear current." accent={GREEN} />
              )}
              {freshness.warnings?.map((w, i) => {
                const col = w.type === 'conflict' ? ORANGE : w.type === 'failed' ? RED : AMBER
                const icn = w.type === 'conflict' ? 'GitMerge' : w.type === 'failed' ? 'AlertCircle' : 'Clock'
                return (
                  <div key={i} className="rounded-xl border px-4 py-3 flex items-start gap-3"
                       style={{ background: `${col}08`, borderColor: `${col}25` }}>
                    <Icon name={icn} size={14} style={{ color: col, flexShrink: 0, marginTop: 1 }} />
                    <div className="flex-1">
                      <p className="text-xs font-bold" style={{ color: col }}>
                        {w.type.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      <p className="text-2xs text-slate-400 mt-0.5">{w.message}</p>
                    </div>
                    <span className="text-lg font-black font-mono" style={{ color: col }}>{w.count}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="rounded-xl border px-5 py-4" style={{ background: '#C9A84C04', borderColor: '#C9A84C15' }}>
        <div className="flex items-start gap-3">
          <Icon name="ShieldAlert" size={14} style={{ color: GOLD, flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong style={{ color: GOLD }}>ResponseLink OS™ Risk & Escalation Centre</strong> — Advisory platform only.
            Does not replace emergency services, safeguarding professionals, clinical judgement, or legal duties.
            If someone is in immediate danger, contact emergency services. All risk prompts require human review.
            4P3X Intelligent AI™ outputs are advisory summaries — not verified facts or safeguarding determinations.
            Run 7 · Local-first · AI agents in Run 8 · Backend in Run 9.
          </p>
        </div>
      </div>

      {/* Review Modal */}
      {reviewItem && (
        <ReviewModal item={reviewItem} onClose={() => setReviewItem(null)}
          onSave={() => { setReviewItem(null); loadData() }} />
      )}
    </div>
  )
}
