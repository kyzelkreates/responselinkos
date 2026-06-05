/**
 * ============================================================
 * ResponseLink OS™ — Command Dashboard (Mission Control)
 * /src/pages/CommandDashboard.jsx
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 3 — Command Dashboard and Mission Control
 *
 * Local-first. Reads from core_rlData.js (SSOT).
 * No backend. No Supabase. No secrets.
 *
 * ⚠️  ADVISORY NOTICE:
 *   ResponseLink OS™ is advisory and coordination-support software.
 *   It does not replace emergency services, safeguarding professionals,
 *   clinical judgement, or legal duties.
 *   If someone is in immediate danger, contact emergency services.
 * ============================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './components_ui_Icon'
import { ROUTES } from './config_routes'
import { formatDateTime } from './utils_format'
import {
  getDemoMode, appSettings, getLiveModeStatus,
  MISSION_STATUS, MISSION_TYPE, RISK_LEVEL, RESPONDER_STATUS,
  missionTable, responderTable, serviceUserTable,
  organisationTable,
} from './core_rlData'
import { seedDemoData } from './core_rlDemoData'
import {
  getDashboardMetrics, getActiveMissions, getMissions,
  getResponders, getServiceUsers, getOpenHelpRequests,
  getOverdueResponderCheckIns, getMissedServiceUserCheckIns,
  getHighRiskMissions, getOpenIncidents, getRiskFlags, getOpenRiskFlags,
  getSyncHealth, getLatestActivity,
  createMission, updateMissionStatus,
  getMissionStatusColor, getRiskLevelColor, getResponderStatusColor, getSUStatusColor,
  MISSION_TYPE_LABELS, MISSION_STATUS_LABELS, RISK_LEVEL_LABELS,
  PRIORITY_LABELS, RESPONDER_STATUS_LABELS, SU_STATUS_LABELS,
  timeAgo,
} from './core_rlSelectors'
import {
  getDashboardRiskStatus, detectEvidenceGaps, detectDataFreshnessWarnings,
  getRiskColor, markRiskFlagReviewed, markHelpRequestReviewed,
} from './core_rlRiskEngine'
import {
  getSyncQueueSummary, getPendingSyncItems, getFailedSyncItems,
  getConflictSyncItems, getSupervisorReviewItems, getLatestSyncedActivity,
  retrySyncEvent,
  propagateMissionAssignment,
  recalculateDashboardStatus, getOnlineStatus,
  scenarioSeedEndToEnd, scenarioSimulateTravelling, scenarioSimulateArrived,
  scenarioSimulateResponderCheckIn, scenarioSimulateSUWellbeing,
  scenarioSimulateHelpRequest, scenarioSimulateIncident,
  scenarioSimulateSUVisitDeclined, scenarioSimulateFailedSync,
  scenarioSimulateConflict, scenarioClearDemoSyncQueue, scenarioProcessLocalSync,
} from './core_rlSyncEngine'

// ─── Colour tokens ────────────────────────────────────────────
const GOLD   = '#C9A84C'
const GREEN  = '#22c55e'
const PURPLE = '#a855f7'
const RED    = '#ef4444'
const CYAN   = '#06b6d4'
const SLATE  = '#A8A9AD'
const AMBER  = '#f59e0b'

// ─── Tiny shared components ───────────────────────────────────
function Pill({ label, color, bg, border }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold"
          style={{ color, background: bg, border: `1px solid ${border}` }}>
      {label}
    </span>
  )
}

function StatusBadge({ status, map, label }) {
  const tok = map(status)
  return <Pill label={label || status?.replace(/_/g,' ')} color={tok.text} bg={tok.bg} border={tok.border || tok.bg} />
}

function SectionPanel({ title, icon, count, children, action, accent, className = '' }) {
  return (
    <div className={`rounded-xl border flex flex-col ${className}`}
         style={{ background: '#0a050a', borderColor: accent ? `${accent}30` : '#C9A84C18' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b"
           style={{ borderColor: accent ? `${accent}20` : '#C9A84C15' }}>
        <div className="flex items-center gap-2">
          <Icon name={icon} size={14} style={{ color: accent || GOLD }} />
          <span className="text-sm font-semibold text-white">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="text-2xs px-1.5 py-0.5 rounded-full font-mono font-bold"
                  style={{ background: accent ? `${accent}20` : '#C9A84C20', color: accent || GOLD }}>
              {count}
            </span>
          )}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-none" style={{ maxHeight: 340 }}>
        {children}
      </div>
    </div>
  )
}

function EmptyPanel({ icon, message, sub, accent }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <Icon name={icon} size={28} style={{ color: accent || GOLD, opacity: 0.2 }} />
      <p className="text-sm font-semibold text-white opacity-40">{message}</p>
      {sub && <p className="text-xs text-slate-600 text-center px-6">{sub}</p>}
    </div>
  )
}

function KpiCard({ label, value, sub, icon, color, urgent, onClick }) {
  return (
    <button onClick={onClick}
      className={`rounded-xl border p-4 flex flex-col gap-1 text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{
        background: urgent && value > 0 ? `${color}08` : '#0a050a',
        borderColor: urgent && value > 0 ? `${color}35` : '#C9A84C18',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <Icon name={icon} size={14} style={{ color: value > 0 ? color : '#374151' }} />
        {urgent && value > 0 && (
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
        )}
      </div>
      <div className="text-2xl font-bold font-mono" style={{ color: value > 0 ? color : '#374151' }}>
        {value}
      </div>
      <div className="text-2xs font-semibold text-white opacity-70">{label}</div>
      {sub && <div className="text-2xs text-slate-600">{sub}</div>}
    </button>
  )
}

// ─── Mission Form ─────────────────────────────────────────────
const EMPTY_FORM = {
  title: '', missionType: 'welfare_check', priority: 'routine',
  riskLevel: 'low', assignedResponderId: '', linkedServiceUserId: '',
  locationLabel: '', area: '', scheduledTime: '', dueTime: '',
  checkInRequired: true, safetyNotes: '', caseNotes: '', status: 'draft',
}

function MissionForm({ responders, serviceUsers, onSave, onCancel, isDemo, initialData }) {
  const [form, setForm]   = useState(initialData || EMPTY_FORM)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('Mission title is required.'); return }
    try {
      const m = createMission({
        ...form,
        assignedResponderId:  form.assignedResponderId  || null,
        linkedServiceUserId:  form.linkedServiceUserId  || null,
        scheduledTime:        form.scheduledTime  ? new Date(form.scheduledTime).toISOString()  : null,
        dueTime:              form.dueTime        ? new Date(form.dueTime).toISOString()        : null,
      })
      // Run 6: Propagate assignment through sync engine
      try { if (m?.id) propagateMissionAssignment(m.id) } catch {}
      setSaved(true)
      setTimeout(() => { onSave(m); setSaved(false) }, 600)
    } catch(err) {
      setError('Failed to save mission: ' + err.message)
    }
  }

  const inputCls = "w-full bg-[#0a050a] border border-[#C9A84C25] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#C9A84C60] transition-colors"
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Live mode warning */}
      {!isDemo && (
        <div className="rounded-lg border px-3 py-2.5"
             style={{ background: '#ef444408', borderColor: '#ef444430' }}>
          <p className="text-xs font-semibold" style={{ color: '#fca5a5' }}>
            ⚠ Live Mode Active — No Backend Configured
          </p>
          <p className="text-2xs text-slate-500 mt-0.5 leading-relaxed">
            This local draft will not sync to a live organisation. Do not enter real sensitive welfare
            data until a secure backend, authentication, access controls, and data protection process
            are configured. (Run 9)
          </p>
        </div>
      )}

      {/* Title */}
      <div>
        <label className={labelCls}>Mission Title *</label>
        <input className={inputCls} value={form.title}
               onChange={e => set('title', e.target.value)}
               placeholder="e.g. Welfare Check — Service User A" required />
      </div>

      {/* Type + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Mission Type</label>
          <select className={inputCls} value={form.missionType}
                  onChange={e => set('missionType', e.target.value)}>
            {Object.entries(MISSION_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select className={inputCls} value={form.priority}
                  onChange={e => set('priority', e.target.value)}>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Risk Level + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Risk Level</label>
          <select className={inputCls} value={form.riskLevel}
                  onChange={e => set('riskLevel', e.target.value)}>
            {Object.entries(RISK_LEVEL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={form.status}
                  onChange={e => set('status', e.target.value)}>
            {Object.entries(MISSION_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assigned Responder */}
      <div>
        <label className={labelCls}>Assigned Responder</label>
        <select className={inputCls} value={form.assignedResponderId}
                onChange={e => set('assignedResponderId', e.target.value)}>
          <option value="">— Unassigned —</option>
          {responders.map(r => (
            <option key={r.id} value={r.id}>
              {r.displayName} · {RESPONDER_STATUS_LABELS[r.status] || r.status}
            </option>
          ))}
        </select>
        {responders.length === 0 && (
          <p className="text-2xs text-slate-600 mt-1">No responders in SSOT yet. Add responders first.</p>
        )}
      </div>

      {/* Linked Service User */}
      <div>
        <label className={labelCls}>Linked Service User</label>
        <select className={inputCls} value={form.linkedServiceUserId}
                onChange={e => set('linkedServiceUserId', e.target.value)}>
          <option value="">— None —</option>
          {serviceUsers.map(su => (
            <option key={su.id} value={su.id}>
              {su.displayName} · {SU_STATUS_LABELS[su.wellbeingStatus] || su.wellbeingStatus}
            </option>
          ))}
        </select>
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Location Label</label>
          <input className={inputCls} value={form.locationLabel}
                 onChange={e => set('locationLabel', e.target.value)}
                 placeholder="e.g. Community Hub" />
        </div>
        <div>
          <label className={labelCls}>Area</label>
          <input className={inputCls} value={form.area}
                 onChange={e => set('area', e.target.value)}
                 placeholder="e.g. North Zone" />
        </div>
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Scheduled Time</label>
          <input type="datetime-local" className={inputCls} value={form.scheduledTime}
                 onChange={e => set('scheduledTime', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Due Time</label>
          <input type="datetime-local" className={inputCls} value={form.dueTime}
                 onChange={e => set('dueTime', e.target.value)} />
        </div>
      </div>

      {/* Check-in required */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={form.checkInRequired}
               onChange={e => set('checkInRequired', e.target.checked)}
               className="w-4 h-4 rounded accent-yellow-500" />
        <span className="text-sm text-slate-300">Responder check-in required during mission</span>
      </label>

      {/* Safety notes */}
      <div>
        <label className={labelCls}>Safety Notes</label>
        <textarea className={inputCls} rows={2} value={form.safetyNotes}
                  onChange={e => set('safetyNotes', e.target.value)}
                  placeholder="Advisory notes for the responder. No medical diagnosis or safeguarding decisions." />
      </div>

      {/* Case notes */}
      <div>
        <label className={labelCls}>Case Notes</label>
        <textarea className={inputCls} rows={2} value={form.caseNotes}
                  onChange={e => set('caseNotes', e.target.value)}
                  placeholder="Contextual notes. Advisory only." />
      </div>

      {/* Advisory reminder */}
      <p className="text-2xs text-slate-600 leading-relaxed px-1">
        ⚠ Advisory: Do not enter safeguarding decisions, medical diagnoses, or emergency-service
        replacement instructions. These fields support coordination only.
      </p>

      {error && (
        <div className="rounded-lg border px-3 py-2"
             style={{ background: '#ef444408', borderColor: '#ef444430' }}>
          <p className="text-xs" style={{ color: RED }}>{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button type="submit"
          className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
          style={{ background: saved ? GREEN : GOLD, color: '#000' }}>
          {saved ? '✓ Saved' : 'Save Mission'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: '#ffffff10', color: SLATE }}>
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Mission Card (compact) ───────────────────────────────────
function MissionCard({ mission, responders, serviceUsers, onView, onStatusChange }) {
  const responder  = responders.find(r => r.id === mission.assignedResponderId)
  const su         = serviceUsers.find(s => s.id === mission.linkedServiceUserId)
  const sTok       = getMissionStatusColor(mission.status)
  const rTok       = getRiskLevelColor(mission.riskLevel)
  const isUrgent   = ['overdue','escalating','needs_supervisor_review','check_in_due'].includes(mission.status)

  return (
    <div className="p-3 border-b last:border-0 hover:bg-white/[0.02] transition-colors"
         style={{ borderColor: '#C9A84C10' }}>
      <div className="flex items-start gap-3">
        {/* Risk indicator */}
        <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5"
             style={{ background: rTok.text }} />

        <div className="flex-1 min-w-0">
          {/* Title + badges */}
          <div className="flex items-start gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-white flex-1 min-w-0 truncate">
              {mission.title}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
              <Pill label={MISSION_STATUS_LABELS[mission.status] || mission.status}
                    color={sTok.text} bg={sTok.bg} border={sTok.border} />
              <Pill label={RISK_LEVEL_LABELS[mission.riskLevel] || mission.riskLevel}
                    color={rTok.text} bg={rTok.bg} border={rTok.border} />
            </div>
          </div>

          {/* Type + Priority */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-2xs text-slate-500">
              {MISSION_TYPE_LABELS[mission.missionType] || mission.missionType}
            </span>
            <span className="text-2xs text-slate-700">·</span>
            <span className="text-2xs" style={{ color: GOLD }}>
              {PRIORITY_LABELS[mission.priority] || mission.priority}
            </span>
          </div>

          {/* Responder + Service User */}
          <div className="flex items-center gap-3 flex-wrap mb-1.5">
            {responder && (
              <span className="text-2xs flex items-center gap-1" style={{ color: CYAN }}>
                <Icon name="User" size={10} />
                {responder.displayName}
              </span>
            )}
            {su && (
              <span className="text-2xs flex items-center gap-1" style={{ color: PURPLE }}>
                <Icon name="Heart" size={10} />
                {su.preferredName || su.displayName}
              </span>
            )}
            {mission.locationLabel && (
              <span className="text-2xs flex items-center gap-1 text-slate-600">
                <Icon name="MapPin" size={10} />
                {mission.locationLabel}
              </span>
            )}
          </div>

          {/* Times + actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {mission.scheduledTime && (
              <span className="text-2xs text-slate-600">
                Scheduled: {formatDateTime(mission.scheduledTime)}
              </span>
            )}
            {mission.dueTime && isUrgent && (
              <span className="text-2xs" style={{ color: RED }}>
                Due: {formatDateTime(mission.dueTime)}
              </span>
            )}
            <span className="text-2xs text-slate-700 ml-auto">
              {timeAgo(mission.updatedAt)}
            </span>
          </div>

          {/* Escalation notice */}
          {(mission.escalationState || mission.status === 'needs_supervisor_review') && (
            <div className="mt-1.5 text-2xs px-2 py-1 rounded"
                 style={{ background: '#ef444410', color: '#fca5a5' }}>
              Advisory: Supervisor review required · {mission.escalationState || 'needs_supervisor_review'}
            </div>
          )}
        </div>

        {/* View button */}
        <button onClick={() => onView(mission)}
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: '#C9A84C10', border: '1px solid #C9A84C25' }}>
          <Icon name="ChevronRight" size={13} style={{ color: GOLD }} />
        </button>
      </div>
    </div>
  )
}

// ─── Mission Detail Drawer ────────────────────────────────────
function MissionDetailDrawer({ mission, responders, serviceUsers, onClose, onStatusChange }) {
  if (!mission) return null
  const responder = responders.find(r => r.id === mission.assignedResponderId)
  const su        = serviceUsers.find(s => s.id === mission.linkedServiceUserId)
  const sTok      = getMissionStatusColor(mission.status)
  const rTok      = getRiskLevelColor(mission.riskLevel)
  const [newStatus, setNewStatus] = useState(mission.status)
  const [saved, setSaved] = useState(false)

  const handleStatusSave = () => {
    if (newStatus === mission.status) return
    onStatusChange(mission.id, newStatus)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.7)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
           style={{ background: '#0a050a', border: '1px solid #C9A84C30' }}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b"
             style={{ borderColor: '#C9A84C20' }}>
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base font-bold text-white mb-1">{mission.title}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Pill label={MISSION_STATUS_LABELS[mission.status]} color={sTok.text} bg={sTok.bg} border={sTok.border} />
              <Pill label={RISK_LEVEL_LABELS[mission.riskLevel]} color={rTok.text} bg={rTok.bg} border={rTok.border} />
              {mission.demoRecord && (
                <Pill label="Demo" color={GOLD} bg="#C9A84C12" border="#C9A84C30" />
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#ffffff10' }}>
            <Icon name="X" size={16} className="text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Advisory notice */}
          <div className="rounded-lg border px-3 py-2"
               style={{ background: '#C9A84C05', borderColor: '#C9A84C20' }}>
            <p className="text-2xs leading-relaxed" style={{ color: SLATE }}>
              <strong style={{ color: GOLD }}>Advisory:</strong> Mission details are coordination
              support only. This does not represent a clinical, legal, safeguarding, or emergency decision.
            </p>
          </div>

          {/* Details grid */}
          {[
            ['Type', MISSION_TYPE_LABELS[mission.missionType] || mission.missionType],
            ['Priority', PRIORITY_LABELS[mission.priority] || mission.priority],
            ['Location', mission.locationLabel || '—'],
            ['Area', mission.area || '—'],
            ['Check-in Required', mission.checkInRequired ? 'Yes' : 'No'],
            ['Escalation', mission.escalationState || 'None'],
            ['Scheduled', formatDateTime(mission.scheduledTime)],
            ['Due', formatDateTime(mission.dueTime)],
            ['Created', formatDateTime(mission.createdAt)],
            ['Updated', formatDateTime(mission.updatedAt)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between border-b border-slate-800/30 pb-2 last:border-0">
              <span className="text-xs text-slate-500 flex-shrink-0 w-28">{label}</span>
              <span className="text-xs text-white text-right flex-1 truncate">{value}</span>
            </div>
          ))}

          {/* Responder */}
          {responder && (
            <div className="rounded-lg border px-3 py-2.5"
                 style={{ borderColor: `${CYAN}25`, background: `${CYAN}06` }}>
              <p className="text-2xs text-slate-500 mb-0.5">Assigned Responder</p>
              <p className="text-sm font-semibold" style={{ color: CYAN }}>{responder.displayName}</p>
              <p className="text-2xs text-slate-500">{responder.role} · {RESPONDER_STATUS_LABELS[responder.status]}</p>
            </div>
          )}

          {/* Service User */}
          {su && (
            <div className="rounded-lg border px-3 py-2.5"
                 style={{ borderColor: `${PURPLE}25`, background: `${PURPLE}06` }}>
              <p className="text-2xs text-slate-500 mb-0.5">Linked Service User</p>
              <p className="text-sm font-semibold" style={{ color: PURPLE }}>{su.displayName}</p>
              <p className="text-2xs text-slate-500">{SU_STATUS_LABELS[su.wellbeingStatus]} · Risk: {RISK_LEVEL_LABELS[su.riskLevel]}</p>
            </div>
          )}

          {/* Safety notes */}
          {mission.safetyNotes && (
            <div>
              <p className="text-2xs font-semibold text-slate-500 mb-1">Safety Notes</p>
              <p className="text-xs text-slate-300 leading-relaxed">{mission.safetyNotes}</p>
            </div>
          )}

          {/* Case notes */}
          {mission.caseNotes && (
            <div>
              <p className="text-2xs font-semibold text-slate-500 mb-1">Case Notes</p>
              <p className="text-xs text-slate-300 leading-relaxed">{mission.caseNotes}</p>
            </div>
          )}

          {/* Status update */}
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-2">Update Status</p>
            <div className="flex items-center gap-2">
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="flex-1 bg-[#0a050a] border border-[#C9A84C25] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C9A84C60]">
                {Object.entries(MISSION_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <button onClick={handleStatusSave}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                style={{ background: saved ? GREEN : GOLD, color: '#000' }}>
                {saved ? '✓' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sync Health Panel ────────────────────────────────────────
function SyncHealthPanel({ sync }) {
  const items = [
    { key: 'synced',    label: 'Synced',    color: GREEN,  count: sync.synced },
    { key: 'pending',   label: 'Pending',   color: AMBER,  count: sync.pending },
    { key: 'offline',   label: 'Offline',   color: SLATE,  count: sync.offline },
    { key: 'conflict',  label: 'Conflict',  color: '#f97316', count: sync.conflict },
    { key: 'failed',    label: 'Failed',    color: RED,    count: sync.failed },
    { key: 'needs_retry', label: 'Retry',   color: AMBER,  count: sync.needs_retry },
    { key: 'supervisor_review_required', label: 'Sup. Review', color: RED, count: sync.supervisor_review_required },
  ]
  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {items.map(({ key, label, color, count }) => (
          <div key={key} className="rounded-lg border p-2 text-center"
               style={{ background: count > 0 ? `${color}08` : '#0a050a', borderColor: count > 0 ? `${color}25` : '#C9A84C15' }}>
            <div className="text-lg font-bold font-mono" style={{ color: count > 0 ? color : '#374151' }}>
              {count}
            </div>
            <div className="text-2xs" style={{ color: count > 0 ? color : '#374151' }}>{label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border px-3 py-2"
           style={{ background: '#ef444406', borderColor: '#ef444420' }}>
        <p className="text-2xs leading-relaxed" style={{ color: '#fca5a5' }}>
          ⚠ Offline or pending records may not have reached the dashboard.
          Do not assume missing updates mean a person is safe.
          Backend sync is planned for a later run.
        </p>
      </div>
    </div>
  )
}


// ─── Sync Simulation Panel ───────────────────────────────────
function SyncSimPanel({ syncQ, isDemo, onRefresh }) {
  const [scenarioResult, setScenarioResult] = useState(null)
  const [running, setRunning]               = useState(false)
  const [expanded, setExpanded]             = useState(false)

  const run = async (fn, label) => {
    setRunning(label)
    setScenarioResult(null)
    try { const r = fn(); setScenarioResult({ ok: r?.ok, label, msg: r?.error || (r?.ok ? 'Done' : 'Error') }) }
    catch (e) { setScenarioResult({ ok: false, label, msg: e.message }) }
    setRunning(null)
    setTimeout(onRefresh, 100)
  }

  const SCENARIOS = [
    { label: 'Seed End-to-End Demo',          fn: scenarioSeedEndToEnd,          color: GREEN,  icon: 'Play' },
    { label: 'Simulate Travelling',            fn: scenarioSimulateTravelling,    color: '#06b6d4', icon: 'Navigation' },
    { label: 'Simulate Arrived',               fn: scenarioSimulateArrived,       color: '#a855f7', icon: 'MapPin' },
    { label: 'Simulate Responder Check-in',    fn: scenarioSimulateResponderCheckIn, color: GREEN, icon: 'CheckSquare' },
    { label: 'Simulate SU Wellbeing Check-in', fn: scenarioSimulateSUWellbeing,   color: '#22c55e', icon: 'Heart' },
    { label: 'Simulate Help Request',          fn: scenarioSimulateHelpRequest,   color: '#f59e0b', icon: 'LifeBuoy' },
    { label: 'Simulate Incident',              fn: scenarioSimulateIncident,      color: '#ef4444', icon: 'AlertOctagon' },
    { label: 'Simulate Visit Declined (+ Conflict)', fn: scenarioSimulateSUVisitDeclined, color: '#f97316', icon: 'CalendarX' },
    { label: 'Simulate Failed Sync',           fn: scenarioSimulateFailedSync,    color: '#ef4444', icon: 'WifiOff' },
    { label: 'Simulate Conflict',              fn: scenarioSimulateConflict,      color: '#f97316', icon: 'GitMerge' },
    { label: 'Process Local Sync Queue',       fn: scenarioProcessLocalSync,      color: GREEN,  icon: 'RefreshCw' },
    { label: 'Clear Demo Sync Queue',          fn: scenarioClearDemoSyncQueue,    color: '#374151', icon: 'Trash2' },
  ]

  if (!isDemo) {
    return (
      <div className="p-4">
        <div className="rounded-xl border px-4 py-4"
             style={{ background: '#a855f708', borderColor: '#a855f730' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#a855f7' }}>Live Mode Active</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Live Mode is active. Real sync requires a configured backend, authentication, access controls,
            and data protection setup. Backend setup is completed in a later run.
            Demo scenarios are only available in Demo Mode.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {/* Simulation notice */}
      <div className="rounded-xl border px-3 py-2.5"
           style={{ background: '#C9A84C06', borderColor: '#C9A84C25' }}>
        <p className="text-2xs text-slate-500 leading-relaxed">
          This is a local-first demo sync simulation. It shows how dashboard, responder PWA, and service user
          PWA updates flow through the shared state layer.
          Real backend sync is configured in a later run.
          <strong style={{ color: '#C9A84C' }}> Demo scenarios only affect demo records.</strong>
        </p>
      </div>

      {/* Result banner */}
      {scenarioResult && (
        <div className="rounded-xl border px-3 py-2.5 flex items-center gap-2"
             style={{ background: scenarioResult.ok ? '#22c55e10' : '#ef444410',
                      borderColor: scenarioResult.ok ? '#22c55e30' : '#ef444430' }}>
          <Icon name={scenarioResult.ok ? 'CheckCircle2' : 'AlertCircle'} size={14}
                style={{ color: scenarioResult.ok ? GREEN : RED }} />
          <span className="text-xs font-semibold" style={{ color: scenarioResult.ok ? GREEN : RED }}>
            {scenarioResult.label}: {scenarioResult.msg}
          </span>
          <button onClick={() => setScenarioResult(null)} className="ml-auto">
            <Icon name="X" size={12} className="text-slate-600" />
          </button>
        </div>
      )}

      {/* Scenario buttons */}
      <div>
        <button onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left"
          style={{ background: '#C9A84C08', borderColor: '#C9A84C25' }}>
          <span className="text-xs font-semibold" style={{ color: '#C9A84C' }}>Demo Scenario Runner</span>
          <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={14} style={{ color: '#C9A84C' }} />
        </button>
        {expanded && (
          <div className="mt-2 space-y-1.5">
            {SCENARIOS.map(s => (
              <button key={s.label}
                disabled={!!running}
                onClick={() => run(s.fn, s.label)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: `${s.color}0a`, borderColor: `${s.color}25` }}>
                <Icon name={running === s.label ? 'Loader2' : s.icon} size={14} style={{ color: s.color }} />
                <span className="text-xs text-slate-300">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Data freshness warning */}
      <div className="rounded-xl border px-3 py-2.5"
           style={{ background: '#ef444406', borderColor: '#ef444418' }}>
        <p className="text-2xs leading-relaxed" style={{ color: '#fca5a5' }}>
          ⚠ Offline, pending, failed, or conflict records may not reflect the latest real-world situation.
          Human review is required for safety-sensitive decisions.
        </p>
      </div>
    </div>
  )
}

// ─── Cross-App Activity Feed (enhanced) ──────────────────────
function CrossAppActivityFeed({ items, onRetry }) {
  const SOURCE_LABELS = {
    command_dashboard: 'Dashboard',
    responder_pwa:     'Responder PWA',
    service_user_pwa:  'Service User PWA',
    system:            'System',
  }
  const SOURCE_COLORS = {
    command_dashboard: '#C9A84C',
    responder_pwa:     '#22c55e',
    service_user_pwa:  '#a855f7',
    system:            '#64748b',
  }
  const STATUS_ICONS = {
    synced:                    { icon: 'Check',         color: GREEN },
    pending:                   { icon: 'Clock',         color: AMBER },
    offline:                   { icon: 'WifiOff',       color: SLATE },
    conflict:                  { icon: 'GitMerge',      color: '#f97316' },
    failed:                    { icon: 'AlertCircle',   color: RED },
    needs_retry:               { icon: 'RefreshCw',     color: AMBER },
    supervisor_review_required:{ icon: 'Flag',          color: RED },
  }

  if (items.length === 0) {
    return (
      <div className="p-4 text-center">
        <Icon name="Activity" size={24} className="mx-auto mb-2 text-slate-700" style={{ opacity: 0.3 }} />
        <p className="text-xs text-slate-600">No sync events yet.</p>
        <p className="text-2xs text-slate-700 mt-1">Run a demo scenario or perform field actions to see cross-app activity.</p>
      </div>
    )
  }

  return (
    <div className="divide-y" style={{ divideColor: '#C9A84C10' }}>
      {items.map(item => {
        const srcColor = SOURCE_COLORS[item.sourceSurface] || '#64748b'
        const stIcon   = STATUS_ICONS[item.syncStatus] || { icon: 'Circle', color: '#374151' }
        const isRetriable = ['failed','needs_retry','offline'].includes(item.syncStatus)
        return (
          <div key={item.id} className="px-4 py-3 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                 style={{ background: `${srcColor}15` }}>
              <Icon name={stIcon.icon} size={12} style={{ color: stIcon.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-2xs font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${srcColor}18`, color: srcColor }}>
                  {SOURCE_LABELS[item.sourceSurface] || item.sourceSurface}
                </span>
                <span className="text-2xs text-slate-600">
                  {item.action?.replace(/_/g,' ')}
                </span>
              </div>
              <p className="text-xs text-white">{item.entityType} · {item.entityId?.slice(0,12)}…</p>
              {item.errorMessage && (
                <p className="text-2xs mt-0.5" style={{ color: '#fca5a5' }}>
                  {item.errorMessage.slice(0, 80)}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-2xs text-slate-700">
                  {item.updatedAt ? timeAgo(item.updatedAt) : timeAgo(item.createdAt)}
                </span>
                <span className="text-2xs font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: `${stIcon.color}15`, color: stIcon.color }}>
                  {item.syncStatus?.replace(/_/g,' ')}
                </span>
                {isRetriable && onRetry && (
                  <button onClick={() => { onRetry(item.id); }}
                    className="text-2xs px-1.5 py-0.5 rounded transition-all hover:brightness-125"
                    style={{ background: '#C9A84C15', color: '#C9A84C' }}>
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Supervisor Review Queue ──────────────────────────────────
function SupervisorReviewQueue({ items }) {
  if (items.length === 0) {
    return (
      <div className="p-4 text-center">
        <Icon name="ShieldCheck" size={20} className="mx-auto mb-2 text-slate-700" style={{ opacity: 0.3 }} />
        <p className="text-xs text-slate-600">No items requiring supervisor review.</p>
      </div>
    )
  }
  return (
    <div className="divide-y" style={{ divideColor: '#ef444415' }}>
      {items.map(item => (
        <div key={item.id} className="px-4 py-3 flex items-start gap-3">
          <Icon name="Flag" size={14} style={{ color: RED, flexShrink: 0, marginTop: 1 }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white mb-0.5">
              {item.action?.replace(/_/g,' ')} — {item.entityType}
            </p>
            <p className="text-2xs text-slate-500">{item.errorMessage?.slice(0, 80)}</p>
            <p className="text-2xs text-slate-700 mt-0.5">{timeAgo(item.createdAt)}</p>
            <p className="text-2xs mt-1 px-2 py-1 rounded" style={{ background: '#ef444408', color: '#fca5a5' }}>
              Advisory: Human supervisor review required before treating this record as final.
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Online Status Badge ──────────────────────────────────────
function OnlineStatusBadge({ status }) {
  const online = status?.online !== false
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-2xs font-semibold"
         style={{
           background: online ? '#22c55e10' : '#ef444410',
           border: `1px solid ${online ? '#22c55e30' : '#ef444430'}`,
           color: online ? GREEN : RED,
         }}>
      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'animate-pulse' : ''}`}
            style={{ background: online ? GREEN : RED }} />
      {status?.label || 'Unknown'}
    </div>
  )
}

// ─── Live Mode Empty State ────────────────────────────────────
function LiveModeEmpty({ onDemoToggle }) {
  return (
    <div className="rounded-xl border p-6 mx-0"
         style={{ background: `${PURPLE}06`, borderColor: `${PURPLE}25` }}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: `${PURPLE}15`, border: `1px solid ${PURPLE}40` }}>
          <Icon name="Zap" size={18} style={{ color: PURPLE }} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold mb-1.5" style={{ color: PURPLE }}>
            Live Mode Active — No Records Yet
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Live Mode is active. Demo data is hidden or cleared.
            Connect a backend such as Supabase, Firebase, AWS/custom, or REST API in a later setup
            run to enable real users, persistent records, authentication, dashboards, and sync.
          </p>
          <div className="rounded-lg border px-3 py-2 mb-3"
               style={{ background: '#ef444408', borderColor: '#ef444425' }}>
            <p className="text-2xs leading-relaxed" style={{ color: '#fca5a5' }}>
              ⚠ Do not enter real sensitive welfare data until a secure backend, authentication,
              access controls, and data protection process are configured.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={onDemoToggle}
              className="px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background: GREEN, color: '#000' }}>
              Switch to Demo Mode
            </button>
            <span className="text-2xs text-slate-600">or configure a backend in Run 9</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard Component ─────────────────────────────────
export default function CommandDashboard() {
  const navigate = useNavigate()

  // ── State ──────────────────────────────────────────────────
  const [isDemo,       setIsDemo]       = useState(getDemoMode)
  const [metrics,      setMetrics]      = useState({})
  const [missions,     setMissions]     = useState([])
  const [responders,   setResponders]   = useState([])
  const [serviceUsers, setServiceUsers] = useState([])
  const [riskFlags,    setRiskFlags]    = useState([])
  const [incidents,    setIncidents]    = useState([])
  const [syncHealth,   setSyncHealth]   = useState({})
  const [activity,     setActivity]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [lastRefresh,  setLastRefresh]  = useState(null)

  // ── Run 6: Sync engine state ───────────────────────────────
  const [syncQueue,       setSyncQueue]       = useState({ total:0, synced:0, pending:0, offline:0, conflict:0, failed:0, needs_retry:0, supervisor_review_required:0, unhealthy:0, bySource:{} })
  const [crossAppFeed,    setCrossAppFeed]    = useState([])
  const [pendingItems,    setPendingItems]    = useState([])
  const [failedItems,     setFailedItems]     = useState([])
  const [conflictItems,   setConflictItems]   = useState([])
  const [supervisorItems, setSupervisorItems] = useState([])
  const [onlineStatus,    setOnlineStatus]    = useState({ online: true, label: 'Online (local demo)' })
  const [dashStatus,      setDashStatus]      = useState({})

  // Run 7: Risk engine state
  const [riskStatus7,   setRiskStatus7]   = useState({})

  // Mission create
  const [showCreate,    setShowCreate]    = useState(false)
  const [selectedMission, setSelectedMission] = useState(null)

  // Filter state
  const [statusFilter,   setStatusFilter]   = useState('active')
  const [missionSearch,  setMissionSearch]  = useState('')

  // ── Load data from SSOT ────────────────────────────────────
  const loadData = useCallback(() => {
    try {
      const dm = getDemoMode()
      setIsDemo(dm)
      setMetrics(getDashboardMetrics())
      setMissions(getMissions())
      setResponders(getResponders())
      setServiceUsers(getServiceUsers())
      setRiskFlags(getOpenRiskFlags())
      setIncidents(getOpenIncidents())
      setSyncHealth(getSyncHealth())
      setActivity(getLatestActivity(15))
      setLastRefresh(new Date())
      // Run 6: Sync engine reads
      try {
        setSyncQueue(getSyncQueueSummary())
        setCrossAppFeed(getLatestSyncedActivity(25))
        setPendingItems(getPendingSyncItems(15))
        setFailedItems(getFailedSyncItems(15))
        setConflictItems(getConflictSyncItems(10))
        setSupervisorItems(getSupervisorReviewItems(10))
        setOnlineStatus(getOnlineStatus())
        setDashStatus(recalculateDashboardStatus())
      } catch {}
      // Run 7: Risk engine
      try { setRiskStatus7(getDashboardRiskStatus()) } catch {}
    } catch (err) {
      console.error('[RLDash] loadData error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  // ── Check if SSOT has any data ─────────────────────────────
  const hasData = missions.length > 0 || responders.length > 0 || serviceUsers.length > 0

  // ── Filtered missions ──────────────────────────────────────
  const inactiveMissionStatus = [MISSION_STATUS.DRAFT, MISSION_STATUS.CANCELLED, MISSION_STATUS.COMPLETED]
  const filteredMissions = missions.filter(m => {
    const matchSearch = !missionSearch ||
      m.title?.toLowerCase().includes(missionSearch.toLowerCase()) ||
      m.area?.toLowerCase().includes(missionSearch.toLowerCase())
    const matchStatus = statusFilter === 'all' ? true :
      statusFilter === 'active' ? !inactiveMissionStatus.includes(m.status) :
      statusFilter === 'overdue' ? (m.status === 'overdue' || m.status === 'escalating') :
      statusFilter === 'completed' ? m.status === 'completed' :
      m.status === statusFilter
    return matchSearch && matchStatus
  })

  // ── Handlers ───────────────────────────────────────────────
  const handleMissionSaved = (mission) => {
    setShowCreate(false)
    loadData()
  }

  const handleStatusChange = (missionId, newStatus) => {
    try {
      updateMissionStatus(missionId, newStatus)
      // Update selected mission if open
      if (selectedMission?.id === missionId) {
        setSelectedMission(prev => ({ ...prev, status: newStatus }))
      }
      loadData()
    } catch (err) {
      console.error('[RLDash] status change error:', err)
    }
  }

  const handleSeedDemo = () => {
    seedDemoData()
    setTimeout(loadData, 100)
  }

  // Safe demo toggle for live empty state button
  const handleDemoToggle = () => {
    if (!getDemoMode()) toggleDemoMode()
    seedDemoData()
    setTimeout(loadData, 100)
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading Command Dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full flex flex-col" style={{ background: '#070407' }}>

      {/* ── Command Bar ──────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-4 border-b flex items-start justify-between gap-4 flex-wrap"
           style={{ borderColor: '#C9A84C20', background: '#0a050a' }}>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold" style={{ color: GOLD }}>Command Dashboard</h1>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                 style={{ background: isDemo ? '#22c55e12' : '#a855f712',
                          border: `1px solid ${isDemo ? '#22c55e30' : '#a855f730'}` }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse"
                   style={{ background: isDemo ? GREEN : PURPLE }} />
              <span className="text-2xs font-semibold" style={{ color: isDemo ? GREEN : PURPLE }}>
                {isDemo ? 'Demo Mode' : 'Live Mode'}
              </span>
            </div>
            {syncHealth.unhealthy > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                   style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-2xs font-semibold text-red-400">
                  {syncHealth.unhealthy} sync issue{syncHealth.unhealthy !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
          <p className="text-2xs mt-0.5" style={{ color: SLATE }}>
            ResponseLink OS™ · AI-Assisted Community Welfare &amp; Mobile Response Platform ·
            Powered by 4P3X Intelligent AI™ · Created by Kyzel Kreates™
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={loadData}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: '#C9A84C12', border: '1px solid #C9A84C25' }}
            title="Refresh data">
            <Icon name="RefreshCw" size={13} style={{ color: GOLD }} />
          </button>
          {lastRefresh && (
            <span className="text-2xs text-slate-700 hidden sm:block">
              {timeAgo(lastRefresh)}
            </span>
          )}
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={{ background: GOLD, color: '#000' }}>
            <Icon name="Plus" size={14} />
            New Mission
          </button>
          <button onClick={() => navigate(ROUTES.DEMO_LIVE)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: '#ffffff08', border: '1px solid #C9A84C20', color: SLATE }}>
            <Icon name="Settings" size={12} />
            Settings
          </button>
        </div>
      </div>

      {/* ── Safety Advisory ──────────────────────────────────── */}
      <div className="mx-4 sm:mx-6 mt-4 rounded-xl border px-4 py-2.5 flex items-start gap-3"
           style={{ background: '#C9A84C06', borderColor: '#C9A84C25' }}>
        <Icon name="ShieldAlert" size={13} style={{ color: GOLD, marginTop: 1, flexShrink: 0 }} />
        <p className="text-2xs leading-relaxed flex-1" style={{ color: SLATE }}>
          <strong style={{ color: GOLD }}>ResponseLink OS™ Advisory:</strong>{' '}
          This is advisory and coordination-support software. It does not replace emergency services,
          safeguarding professionals, clinical judgement, or legal duties.
          If someone is in immediate danger, contact emergency services.
        </p>
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-5">

        {/* ── Live Mode Empty State ────────────────────────────── */}
        {!isDemo && !hasData && (
          <LiveModeEmpty onDemoToggle={handleDemoToggle} />
        )}

        {/* ── Demo: seed prompt if demo mode but no data ─────── */}
        {isDemo && !hasData && (
          <div className="rounded-xl border p-5"
               style={{ background: '#22c55e06', borderColor: '#22c55e25' }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold mb-1" style={{ color: GREEN }}>
                  Demo Mode is ON — No Data Seeded Yet
                </h3>
                <p className="text-xs text-slate-400">
                  Seed safe demo data to see the Command Dashboard populated.
                </p>
              </div>
              <button onClick={() => { seedDemoData(); setTimeout(loadData, 100) }}
                className="px-5 py-2.5 rounded-lg text-sm font-bold"
                style={{ background: GREEN, color: '#000' }}>
                Seed Demo Data
              </button>
            </div>
          </div>
        )}

        {/* ── Overview Metrics ─────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
            Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
            <KpiCard label="Active Missions"       value={metrics.activeMissions     || 0} icon="ClipboardList"  color={GOLD}   urgent onClick={() => setStatusFilter('active')} />
            <KpiCard label="Available Responders"  value={metrics.respondersAvailable || 0} icon="UserCheck"     color={GREEN}  />
            <KpiCard label="Responders Overdue"    value={metrics.respondersOverdue   || 0} icon="UserX"         color={RED}    urgent />
            <KpiCard label="Service Users Stable"  value={metrics.serviceUsersStable  || 0} icon="Heart"         color={GREEN}  />
            <KpiCard label="Help Requests"         value={metrics.helpRequestsOpen    || 0} icon="LifeBuoy"      color={RED}    urgent />
            <KpiCard label="Missed Check-Ins"      value={metrics.missedCheckIns      || 0} icon="Clock"         color={AMBER}  urgent />
            <KpiCard label="Open Incidents"        value={metrics.incidentsOpen       || 0} icon="AlertOctagon"  color={RED}    urgent />
            <KpiCard label="High/Critical Risk"    value={metrics.highCriticalRisk    || 0} icon="AlertTriangle" color="#f97316" urgent />
            <KpiCard label="Sync Issues"           value={metrics.syncUnhealthy       || 0} icon="CloudOff"      color={AMBER}  urgent />
          </div>
        </div>

        {/* ── Mission Control ──────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Mission Control
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Icon name="Search" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
                <input value={missionSearch} onChange={e => setMissionSearch(e.target.value)}
                  className="pl-7 pr-3 py-1.5 bg-[#0a050a] border border-[#C9A84C20] rounded-lg text-xs text-white placeholder-slate-700 focus:outline-none focus:border-[#C9A84C40] w-36"
                  placeholder="Search…" />
              </div>
              {/* Status filter */}
              {['active','all','overdue','completed'].map(f => (
                <button key={f}
                  onClick={() => setStatusFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={statusFilter === f
                    ? { background: GOLD, color: '#000' }
                    : { background: '#ffffff08', color: SLATE, border: '1px solid #C9A84C20' }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: '#C9A84C15', border: '1px solid #C9A84C30', color: GOLD }}>
                <Icon name="Plus" size={12} /> Mission
              </button>
            </div>
          </div>

          <SectionPanel title="Missions" icon="ClipboardList" count={filteredMissions.length}>
            {filteredMissions.length === 0 ? (
              <EmptyPanel icon="ClipboardList" message="No missions"
                sub={statusFilter === 'active'
                  ? "No active missions yet. Create one above."
                  : "No missions match this filter."} />
            ) : (
              filteredMissions.map(m => (
                <MissionCard key={m.id} mission={m}
                  responders={responders} serviceUsers={serviceUsers}
                  onView={setSelectedMission}
                  onStatusChange={handleStatusChange} />
              ))
            )}
          </SectionPanel>
        </div>

        {/* ── Three-column grid: Responders | Service Users | Risk ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Responders */}
          <SectionPanel title="Responders" icon="Users" count={responders.length}
            accent={CYAN}
            action={
              <button onClick={() => navigate(ROUTES.RESPONDERS)}
                className="text-2xs flex items-center gap-1 transition-colors"
                style={{ color: CYAN }}>
                All <Icon name="ArrowRight" size={10} />
              </button>
            }>
            {responders.length === 0
              ? <EmptyPanel icon="Users" message="No responders" sub="Add responders via the SSOT." accent={CYAN} />
              : responders.slice(0, 8).map(r => {
                  const sc = getResponderStatusColor(r.status)
                  const isOverdue = r.status === 'overdue' || r.status === 'check_in_due' || r.status === 'escalating'
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0 hover:bg-white/[0.02] transition-colors"
                         style={{ borderColor: '#C9A84C10' }}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">{r.displayName}</span>
                          {isOverdue && (
                            <span className="text-2xs px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                                  style={{ background: '#ef444415', color: RED }}>Overdue</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-2xs text-slate-600">{r.role?.replace(/_/g, ' ')}</span>
                          <span className="text-2xs font-semibold" style={{ color: sc.text }}>
                            {RESPONDER_STATUS_LABELS[r.status]}
                          </span>
                        </div>
                        {r.lastCheckInAt && (
                          <span className="text-2xs text-slate-700">
                            Last check-in: {timeAgo(r.lastCheckInAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
            }
          </SectionPanel>

          {/* Service Users */}
          <SectionPanel title="Service Users" icon="Heart" count={serviceUsers.length}
            accent={PURPLE}
            action={
              <span className="text-2xs text-slate-600">Wellbeing status</span>
            }>
            {serviceUsers.length === 0
              ? <EmptyPanel icon="Heart" message="No service users" sub="Add service users via the SSOT." accent={PURPLE} />
              : serviceUsers.slice(0, 8).map(su => {
                  const sc = getSUStatusColor(su.wellbeingStatus)
                  const isUrgent = ['urgent_help_requested','safety_concern','missed_check_in','needs_supervisor_review'].includes(su.wellbeingStatus)
                  return (
                    <div key={su.id} className="px-3 py-2.5 border-b last:border-0 hover:bg-white/[0.02] transition-colors"
                         style={{ borderColor: '#C9A84C10' }}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-sm font-semibold text-white truncate">
                              {su.preferredName || su.displayName}
                            </span>
                            <span className="text-2xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                                  style={{ background: sc.bg, color: sc.text }}>
                              {SU_STATUS_LABELS[su.wellbeingStatus]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-2xs" style={{ color: getRiskLevelColor(su.riskLevel).text }}>
                              {RISK_LEVEL_LABELS[su.riskLevel]} risk
                            </span>
                            {su.helpRequestStatus === 'support_requested' && (
                              <span className="text-2xs font-bold" style={{ color: RED }}>⚡ Help Request</span>
                            )}
                          </div>
                          {su.lastCheckInAt && (
                            <p className="text-2xs text-slate-700 mt-0.5">
                              Last check-in: {timeAgo(su.lastCheckInAt)}
                            </p>
                          )}
                          {isUrgent && (
                            <p className="text-2xs mt-1 px-2 py-0.5 rounded"
                               style={{ background: '#ef444410', color: '#fca5a5' }}>
                              Advisory: supervisor review prompt
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
            }
          </SectionPanel>

          {/* Risk & Escalation — Run 7 Upgraded */}
          {(() => {
            const rs   = riskStatus7
            const ORc  = (() => {
              const l = rs.overallRisk || 'low'
              return { critical:RED, high:'#f97316', medium:'#f59e0b', low:GREEN }[l] || GREEN
            })()
            const totalItems = (rs.reviewQueueCount||0) + (rs.overdueResponders||0) + (rs.urgentHelpRequests||0)
            return (
              <SectionPanel title="Risk & Escalation" icon="ShieldAlert"
                count={totalItems} accent={RED}
                action={
                  <button onClick={() => navigate(ROUTES.RISK)}
                    className="text-2xs flex items-center gap-1 font-semibold"
                    style={{ color: RED }}>
                    Risk Centre <Icon name="ArrowRight" size={10} />
                  </button>
                }>

                {/* Overall risk badge */}
                <div className="mx-3 mt-3 mb-2 rounded-lg border px-3 py-2 flex items-center gap-2"
                     style={{ background: `${ORc}08`, borderColor: `${ORc}25` }}>
                  <Icon name={{ critical:'Flame', high:'AlertTriangle', medium:'ShieldAlert', low:'ShieldCheck' }[rs.overallRisk || 'low'] || 'ShieldAlert'}
                        size={13} style={{ color: ORc }} />
                  <span className="text-xs font-bold" style={{ color: ORc }}>
                    Overall: {(rs.overallRisk || 'low').charAt(0).toUpperCase() + (rs.overallRisk || 'low').slice(1)} Risk
                  </span>
                  <span className="ml-auto text-2xs text-slate-600">Advisory only</span>
                </div>

                {/* Advisory notice */}
                <div className="mx-3 mb-2 rounded-lg border px-3 py-2"
                     style={{ background: '#ef444406', borderColor: '#ef444420' }}>
                  <p className="text-2xs leading-relaxed" style={{ color: '#fca5a5' }}>
                    Advisory prompts for human review. ResponseLink OS™ does not make safeguarding,
                    legal, clinical, or emergency decisions. If someone is in immediate danger,
                    contact emergency services.
                  </p>
                </div>

                {/* Review queue count */}
                {(rs.reviewQueueCount || 0) > 0 && (
                  <div className="flex items-center gap-3 px-3 py-2.5 border-b"
                       style={{ borderColor: '#ef444415' }}>
                    <Icon name="ClipboardCheck" size={13} style={{ color: RED, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">Supervisor Review Required</p>
                      <p className="text-2xs text-slate-500">{rs.reviewQueueCount} item(s) in review queue</p>
                    </div>
                    <button onClick={() => navigate(ROUTES.RISK)}
                      className="text-2xs px-2 py-1 rounded font-bold"
                      style={{ background: '#ef444415', color: RED }}>Review</button>
                  </div>
                )}

                {/* Overdue responders */}
                {getOverdueResponderCheckIns().slice(0, 3).map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 border-b"
                       style={{ borderColor: '#ef444415' }}>
                    <Icon name="UserX" size={13} style={{ color: RED, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">Overdue Check-In</p>
                      <p className="text-2xs text-slate-500">{r.displayName} · {r.lastCheckInAt ? timeAgo(r.lastCheckInAt) : 'unknown'}</p>
                    </div>
                    <span className="text-2xs px-1.5 rounded font-bold"
                          style={{ background: '#ef444415', color: RED }}>Review</span>
                  </div>
                ))}

                {/* Urgent help */}
                {getOpenHelpRequests().slice(0, 3).map(su => (
                  <div key={su.id} className="flex items-center gap-3 px-3 py-2.5 border-b"
                       style={{ borderColor: '#ef444415' }}>
                    <Icon name="LifeBuoy" size={13} style={{ color: AMBER, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">Urgent Help Request</p>
                      <p className="text-2xs text-slate-500">{su.displayName}</p>
                    </div>
                    <span className="text-2xs px-1.5 rounded font-bold"
                          style={{ background: '#f59e0b15', color: AMBER }}>Review</span>
                  </div>
                ))}

                {/* Risk flags summary */}
                {riskFlags.slice(0, 4).map(rf => {
                  const rc = getRiskColor(rf.riskLevel)
                  return (
                    <div key={rf.id} className="px-3 py-2.5 border-b last:border-0"
                         style={{ borderColor: '#ef444415' }}>
                      <div className="flex items-start gap-2">
                        <Icon name="Flag" size={12} style={{ color: rc.text, flexShrink: 0, marginTop: 1 }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-xs font-semibold text-white flex-1 min-w-0">{rf.title}</p>
                            <span className="text-2xs px-1.5 py-0.5 rounded font-bold"
                                  style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>
                              {rf.riskLevel}
                            </span>
                          </div>
                          <p className="text-2xs text-slate-500">{rf.description?.slice(0, 70)}{rf.description?.length > 70 ? '…' : ''}</p>
                          {rf.requiresSupervisorReview && !rf.humanReviewed && (
                            <span className="text-2xs mt-0.5 inline-block px-2 py-0.5 rounded"
                                  style={{ background: '#ef444412', color: '#fca5a5' }}>
                              Supervisor review required
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Evidence gaps warning */}
                {(rs.evidenceGapCount || 0) > 0 && (
                  <div className="flex items-center gap-3 px-3 py-2.5 border-t"
                       style={{ borderColor: '#a855f715' }}>
                    <Icon name="FileX" size={13} style={{ color: PURPLE, flexShrink: 0 }} />
                    <p className="text-2xs text-slate-500 flex-1">{rs.evidenceGapCount} evidence gap(s) detected</p>
                    <button onClick={() => navigate(ROUTES.RISK)}
                      className="text-2xs font-semibold" style={{ color: PURPLE }}>View</button>
                  </div>
                )}

                {/* Data freshness warning */}
                {rs.freshnessWarning && (
                  <div className="flex items-center gap-3 px-3 py-2.5 border-t"
                       style={{ borderColor: '#f59e0b15' }}>
                    <Icon name="Clock" size={13} style={{ color: AMBER, flexShrink: 0 }} />
                    <p className="text-2xs text-slate-500 flex-1">{rs.freshnessWarningCount} data freshness warning(s)</p>
                    <button onClick={() => navigate(ROUTES.RISK)}
                      className="text-2xs font-semibold" style={{ color: AMBER }}>View</button>
                  </div>
                )}

                {totalItems === 0 && riskFlags.length === 0 && (
                  <EmptyPanel icon="ShieldCheck" message="No open risk flags"
                    sub="All clear — no advisory escalations at this time." accent={GREEN} />
                )}

                {/* Link to full Risk Centre */}
                <div className="px-3 py-2.5 border-t" style={{ borderColor: '#C9A84C15' }}>
                  <button onClick={() => navigate(ROUTES.RISK)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold"
                    style={{ background: '#ef444410', color: RED, border: '1px solid #ef444425' }}>
                    <Icon name="ShieldAlert" size={13} />
                    Open Risk & Escalation Centre
                  </button>
                </div>
              </SectionPanel>
            )
          })()}
        </div>

        {/* ── Incident Queue + Activity + Sync ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Incident Queue */}
          <SectionPanel title="Incident Queue" icon="AlertOctagon"
            count={incidents.length} accent={RED}
            action={
              <button onClick={() => navigate(ROUTES.INCIDENTS)}
                className="text-2xs flex items-center gap-1" style={{ color: RED }}>
                View all <Icon name="ArrowRight" size={10} />
              </button>
            }>
            {incidents.length === 0
              ? <EmptyPanel icon="CheckCircle2" message="No open incidents" sub="All incidents are resolved or closed." accent={GREEN} />
              : incidents.slice(0, 6).map(inc => (
                  <div key={inc.id} className="px-3 py-2.5 border-b last:border-0"
                       style={{ borderColor: '#ef444415' }}>
                    <div className="flex items-start gap-2">
                      <div className="w-1 self-stretch rounded-full flex-shrink-0"
                           style={{ background: inc.severity === 'high' || inc.severity === 'critical' ? RED : AMBER }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-semibold text-white flex-1 truncate">{inc.title}</span>
                          <span className="text-2xs px-1.5 rounded font-bold capitalize"
                                style={{ background: `${inc.severity === 'high' ? RED : AMBER}15`,
                                         color: inc.severity === 'high' ? RED : AMBER }}>
                            {inc.severity}
                          </span>
                        </div>
                        <p className="text-2xs text-slate-500">
                          {inc.category?.replace(/_/g, ' ')} · {timeAgo(inc.createdAt)}
                        </p>
                        <p className="text-2xs mt-0.5" style={{ color: inc.supervisorReviewStatus === 'pending' ? AMBER : GREEN }}>
                          Review: {inc.supervisorReviewStatus}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
            }
          </SectionPanel>

          {/* Latest Activity */}
          <SectionPanel title="Latest Field Updates" icon="Activity" accent={CYAN}>
            {activity.length === 0
              ? (
                isDemo
                  ? <EmptyPanel icon="Activity" message="No activity yet" sub="Seed demo data to see the activity feed." accent={CYAN} />
                  : <EmptyPanel icon="Activity" message="No live activity" sub="Live mode is active. Activity appears when field updates arrive." accent={CYAN} />
              )
              : activity.map(item => (
                  <div key={item.id} className="flex items-start gap-3 px-3 py-2.5 border-b last:border-0 hover:bg-white/[0.02] transition-colors"
                       style={{ borderColor: '#C9A84C10' }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                         style={{ background: `${item.color}15` }}>
                      <Icon name={item.icon} size={11} style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                      {item.sub && <p className="text-2xs text-slate-500 truncate">{item.sub}</p>}
                      <p className="text-2xs text-slate-700">{timeAgo(item.ts)}</p>
                    </div>
                    {item.demoRecord && (
                      <span className="text-2xs px-1 rounded flex-shrink-0"
                            style={{ background: '#C9A84C10', color: '#C9A84C80' }}>Demo</span>
                    )}
                  </div>
                ))
            }
          </SectionPanel>

          {/* Sync Health */}
          <SectionPanel title="Sync Health" icon="CloudOff" accent={AMBER}
            action={
              <button onClick={() => navigate(ROUTES.DEMO_LIVE)}
                className="text-2xs flex items-center gap-1" style={{ color: AMBER }}>
                Settings <Icon name="ArrowRight" size={10} />
              </button>
            }>
            <SyncHealthPanel sync={syncHealth} />
          </SectionPanel>
        </div>

        {/* ── Run 6: Sync Simulation ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Cross-App Activity Feed */}
          <SectionPanel title="Cross-App Sync Activity" icon="Activity" accent={CYAN}
            count={crossAppFeed.length}
            action={
              <OnlineStatusBadge status={onlineStatus} />
            }>
            <CrossAppActivityFeed
              items={crossAppFeed.slice(0, 15)}
              onRetry={(id) => { retrySyncEvent(id); setTimeout(loadData, 80) }}
            />
          </SectionPanel>

          {/* Pending / Failed / Conflict queue */}
          <SectionPanel title="Pending & Failed Queue" icon="CloudOff" accent={AMBER}
            count={syncQueue.unhealthy}
            action={
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: syncQueue.conflict > 0 ? '#f9730010' : '#f59e0b10',
                             color: syncQueue.conflict > 0 ? '#f97316' : AMBER }}>
                {syncQueue.conflict > 0 ? `${syncQueue.conflict} conflict` : `${syncQueue.pending} pending`}
              </span>
            }>
            <div className="divide-y" style={{ divideColor: '#C9A84C10' }}>
              {/* Conflicts first */}
              {conflictItems.length > 0 && (
                <div className="px-4 py-2">
                  <p className="text-2xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#f97316' }}>
                    Conflicts ({conflictItems.length})
                  </p>
                  {conflictItems.map(item => (
                    <div key={item.id} className="rounded-lg border px-3 py-2 mb-1.5 text-left"
                         style={{ background: '#f9730008', borderColor: '#f9730028' }}>
                      <p className="text-xs font-semibold" style={{ color: '#f97316' }}>
                        {item.action?.replace(/_/g,' ')}
                      </p>
                      <p className="text-2xs text-slate-500">{item.errorMessage?.slice(0,80)}</p>
                      <p className="text-2xs mt-1 px-2 py-1 rounded" style={{ background: '#f9730008', color: '#fdba74' }}>
                        Conflict detected. Human review required before treating this record as final.
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {/* Failed / needs retry */}
              {failedItems.length > 0 && (
                <div className="px-4 py-2">
                  <p className="text-2xs font-bold uppercase tracking-wider mb-1.5" style={{ color: RED }}>
                    Failed / Needs Retry ({failedItems.length})
                  </p>
                  {failedItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 mb-1.5"
                         style={{ background: '#ef444408', borderColor: '#ef444428' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white">{item.action?.replace(/_/g,' ')} · {item.entityType}</p>
                        <p className="text-2xs text-slate-600">{item.errorMessage?.slice(0,60)}</p>
                      </div>
                      <button onClick={() => { retrySyncEvent(item.id); setTimeout(loadData, 80) }}
                        className="text-2xs px-2 py-1 rounded"
                        style={{ background: '#C9A84C15', color: '#C9A84C' }}>
                        Retry
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Pending */}
              {pendingItems.length > 0 && (
                <div className="px-4 py-2">
                  <p className="text-2xs font-bold uppercase tracking-wider mb-1.5" style={{ color: AMBER }}>
                    Pending ({pendingItems.length})
                  </p>
                  {pendingItems.slice(0,5).map(item => (
                    <div key={item.id} className="flex items-center gap-2 py-1.5 border-b last:border-0"
                         style={{ borderColor: '#C9A84C10' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: AMBER }} />
                      <p className="text-xs text-slate-400 flex-1">{item.action?.replace(/_/g,' ')} · {item.entityType}</p>
                      <p className="text-2xs text-slate-700">{timeAgo(item.createdAt)}</p>
                    </div>
                  ))}
                  {pendingItems.length > 5 && (
                    <p className="text-2xs text-slate-700 mt-1">+{pendingItems.length - 5} more pending</p>
                  )}
                </div>
              )}
              {/* All clear */}
              {conflictItems.length === 0 && failedItems.length === 0 && pendingItems.length === 0 && (
                <div className="p-4 text-center">
                  <Icon name="CheckCircle2" size={20} className="mx-auto mb-1" style={{ color: GREEN, opacity: 0.5 }} />
                  <p className="text-xs text-slate-600">No pending or failed items.</p>
                </div>
              )}
            </div>
          </SectionPanel>

          {/* Supervisor Review + Demo Scenarios */}
          <div className="space-y-6">
            <SectionPanel title="Supervisor Review Required" icon="Flag" accent={RED}
              count={supervisorItems.length + syncQueue.supervisor_review_required}>
              <SupervisorReviewQueue items={supervisorItems} />
              <div className="px-4 pb-3">
                <div className="rounded-lg border px-3 py-2"
                     style={{ background: '#ef444406', borderColor: '#ef444418' }}>
                  <p className="text-2xs leading-relaxed" style={{ color: '#fca5a5' }}>
                    Risk prompts are advisory and require human review.
                    ResponseLink OS™ does not make safeguarding, clinical, or emergency decisions.
                  </p>
                </div>
              </div>
            </SectionPanel>

            <SectionPanel title="Sync Simulation" icon="Cpu" accent={CYAN}
              action={
                <span className="text-2xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: '#C9A84C12', color: '#C9A84C' }}>Demo only</span>
              }>
              <SyncSimPanel syncQ={syncQueue} isDemo={isDemo} onRefresh={loadData} />
            </SectionPanel>
          </div>

        </div>

        {/* ── Quick Actions ────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'New Mission',     icon: 'ClipboardList', color: GOLD,   onClick: () => setShowCreate(true) },
              { label: 'Mission Control', icon: 'Radio',         color: CYAN,   route: ROUTES.MISSIONS   },
              { label: 'Responders',      icon: 'Users',         color: GREEN,  route: ROUTES.RESPONDERS },
              { label: 'Report Incident', icon: 'AlertOctagon',  color: RED,    route: ROUTES.INCIDENTS  },
              { label: 'AI Oversight',    icon: 'Brain',         color: PURPLE, route: ROUTES.AI_OVERSIGHT },
              { label: 'Demo / Live',     icon: 'ToggleLeft',    color: SLATE,  route: ROUTES.DEMO_LIVE  },
            ].map(a => (
              <button key={a.label}
                onClick={a.onClick || (() => navigate(a.route))}
                className="flex items-center gap-2.5 rounded-xl px-4 py-3.5 text-left group transition-all hover:scale-[1.02]"
                style={{ background: '#0a050a', border: '1px solid #C9A84C18' }}>
                <Icon name={a.icon} size={15} style={{ color: a.color }} />
                <span className="text-xs font-medium text-slate-400 group-hover:text-white transition-colors">{a.label}</span>
                <Icon name="ArrowRight" size={11} className="text-slate-700 ml-auto" />
              </button>
            ))}
          </div>
        </div>

        {/* ── Safety Notice ────────────────────────────────────── */}
        <div className="rounded-xl border px-5 py-4"
             style={{ background: '#C9A84C05', borderColor: '#C9A84C20' }}>
          <div className="flex items-start gap-3">
            <Icon name="ShieldAlert" size={16} style={{ color: GOLD, flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: GOLD }}>
                Safety Notice — ResponseLink OS™ Advisory Platform
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                ResponseLink OS™ is advisory and coordination-support software. It does not replace
                emergency services, safeguarding professionals, clinical judgement, or legal duties.
                If someone is in immediate danger, contact emergency services immediately.
                All AI outputs from 4P3X Intelligent AI™ are advisory summaries only — they are not
                verified facts, clinical assessments, safeguarding decisions, or legal determinations.
                Human review is required for all decisions.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-2">
          <p className="text-2xs" style={{ color: '#374151' }}>
            ResponseLink OS™ · Run 3 · Local-first · Backend pending (Run 9)
          </p>
        </div>
      </div>

      {/* ── Mission Create Modal ──────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.75)' }}
             onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
               style={{ background: '#0a050a', border: '1px solid #C9A84C35' }}>
            <div className="flex items-center justify-between p-5 border-b"
                 style={{ borderColor: '#C9A84C20' }}>
              <div>
                <h2 className="text-base font-bold text-white">New Mission</h2>
                <p className="text-2xs mt-0.5" style={{ color: SLATE }}>
                  Saved through ResponseLink OS™ SSOT · {isDemo ? 'Demo record' : 'Local draft'}
                </p>
              </div>
              <button onClick={() => setShowCreate(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: '#ffffff10' }}>
                <Icon name="X" size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="p-5">
              <MissionForm
                responders={responders}
                serviceUsers={serviceUsers}
                isDemo={isDemo}
                onSave={handleMissionSaved}
                onCancel={() => setShowCreate(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Mission Detail Drawer ─────────────────────────────── */}
      {selectedMission && (
        <MissionDetailDrawer
          mission={selectedMission}
          responders={responders}
          serviceUsers={serviceUsers}
          onClose={() => setSelectedMission(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
