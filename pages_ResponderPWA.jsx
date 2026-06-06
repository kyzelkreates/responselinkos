/**
 * ============================================================
 * ResponseLink OS™ — Responder PWA (Full Workflow)
 * /src/pages/ResponderPWA.jsx
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 4 — Responder PWA Full Workflow
 *
 * Local-first. All reads/writes through SSOT (core_rlData.js).
 * No backend. No Supabase. No secrets.
 *
 * ⚠️  ADVISORY NOTICE:
 *   This does not replace emergency services, safeguarding
 *   professionals, clinical judgement, or legal duties.
 *   If someone is in immediate danger, contact emergency services.
 * ============================================================
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './components_ui_Icon'
import { ROUTES } from './config_routes'
import { formatDateTime } from './utils_format'
import {
  getDemoMode,
  RESPONDER_STATUS, MISSION_STATUS, RISK_LEVEL,
  responderTable, serviceUserTable, missionTable,
} from './core_rlData'
import { seedDemoData } from './core_rlDemoData'
import {
  getMissionStatusColor, getRiskLevelColor, getResponderStatusColor,
  MISSION_TYPE_LABELS, MISSION_STATUS_LABELS, RISK_LEVEL_LABELS,
  PRIORITY_LABELS, RESPONDER_STATUS_LABELS, SU_STATUS_LABELS,
  timeAgo, getResponders, getServiceUsers,
} from './core_rlSelectors'
import {
  getCurrentResponderId, setCurrentResponderId, getCurrentResponder,
  getAssignedMissionsForResponder,
  VALID_TRANSITIONS, canTransition,
  updateMissionStatusFromResponder,
  WELFARE_CHECKLIST_ITEMS,
  submitResponderCheckIn,
  saveWelfareChecklist,
  addResponderNote,
  raiseResponderRiskFlag,
  submitIncidentReport,
  requestEscalation,
  getEvidenceForMission,
  getPWASyncSummary,
} from './core_rlPWAHelpers'
import { getOnlineStatus, propagateResponderUpdate, SYNC_ACTION } from './core_rlSyncEngine'
import LiveModeStatusPanel from './components_ui_LiveModeStatusPanel'

// ─── Colour tokens ────────────────────────────────────────────
const GOLD   = '#C9A84C'
const GREEN  = '#22c55e'
const PURPLE = '#a855f7'
const RED    = '#ef4444'
const CYAN   = '#06b6d4'
const SLATE  = '#A8A9AD'
const AMBER  = '#f59e0b'
const BG     = '#070407'
const CARD   = '#0a050a'

// ─── PWA screens (view states) ────────────────────────────────
const SCREEN = {
  HOME:        'home',
  MISSIONS:    'missions',
  DETAIL:      'detail',
  CHECKIN:     'checkin',
  CHECKLIST:   'checklist',
  NOTES:       'notes',
  RISKFLAG:    'riskflag',
  INCIDENT:    'incident',
  ESCALATION:  'escalation',
}

// ─── Tiny shared components ───────────────────────────────────
function Pill({ label, color, bg, border }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold"
          style={{ color, background: bg, border: `1px solid ${border || bg}` }}>
      {label}
    </span>
  )
}

function AdvisoryBanner({ text, color = AMBER, icon = 'AlertTriangle', compact }) {
  return (
    <div className={`rounded-xl border flex items-start gap-2.5 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
         style={{ background: `${color}08`, borderColor: `${color}28` }}>
      <Icon name={icon} size={compact ? 12 : 14} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <p className={`leading-relaxed flex-1 ${compact ? 'text-2xs' : 'text-xs'}`}
         style={{ color: SLATE }}>
        {text}
      </p>
    </div>
  )
}

function SyncBadge({ sync }) {
  if (!sync || sync.total === 0) return null
  const color = sync.failed > 0 ? RED : sync.pending > 0 ? AMBER : GREEN
  const label = sync.failed > 0 ? `${sync.failed} failed` :
                sync.pending > 0 ? `${sync.pending} pending` : 'All synced'
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold"
          style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
      <span className={`w-1.5 h-1.5 rounded-full ${sync.pending > 0 ? 'animate-pulse' : ''}`}
            style={{ background: color }} />
      {label}
    </span>
  )
}

function SuccessBanner({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div className="rounded-xl border px-4 py-3 flex items-center gap-3 mb-4"
         style={{ background: '#22c55e10', borderColor: '#22c55e35' }}>
      <Icon name="CheckCircle2" size={16} style={{ color: GREEN }} />
      <p className="text-sm font-semibold flex-1" style={{ color: GREEN }}>{message}</p>
      <button onClick={onDismiss} className="text-slate-600 hover:text-slate-400">
        <Icon name="X" size={14} />
      </button>
    </div>
  )
}

function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="rounded-xl border px-4 py-3 flex items-center gap-3 mb-4"
         style={{ background: '#ef444410', borderColor: '#ef444435' }}>
      <Icon name="AlertCircle" size={16} style={{ color: RED }} />
      <p className="text-sm flex-1" style={{ color: '#fca5a5' }}>{message}</p>
      {onDismiss && <button onClick={onDismiss} className="text-slate-600 hover:text-slate-400">
        <Icon name="X" size={14} />
      </button>}
    </div>
  )
}

function BackButton({ onBack, label = 'Back' }) {
  return (
    <button onClick={onBack}
      className="flex items-center gap-2 text-sm font-semibold mb-5 transition-colors"
      style={{ color: SLATE }}>
      <Icon name="ChevronLeft" size={16} />
      {label}
    </button>
  )
}

function ActionBtn({ icon, label, color = GOLD, onClick, disabled, sub, fullWidth, large }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 rounded-xl border transition-all
        ${fullWidth ? 'w-full' : ''}
        ${large ? 'px-5 py-4' : 'px-4 py-3'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110 active:scale-[0.98]'}`}
      style={{
        background: disabled ? '#ffffff06' : `${color}10`,
        borderColor: disabled ? '#ffffff15' : `${color}35`,
      }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ background: `${color}15` }}>
        <Icon name={icon} size={18} style={{ color: disabled ? '#374151' : color }} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={`font-semibold ${large ? 'text-sm' : 'text-xs'}`}
           style={{ color: disabled ? '#374151' : 'white' }}>{label}</p>
        {sub && <p className="text-2xs mt-0.5 text-slate-600">{sub}</p>}
      </div>
      {!disabled && <Icon name="ChevronRight" size={14} className="text-slate-600 flex-shrink-0" />}
    </button>
  )
}

// ─── Input helpers ────────────────────────────────────────────
const inputCls = "w-full bg-[#0a050a] border border-[#C9A84C22] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#C9A84C55] transition-colors"
const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5"
const selectCls = inputCls

// ─── Screen: Home ─────────────────────────────────────────────
function HomeScreen({ responder, missions, sync, isDemo, navigate, setScreen, setSelectedMission, onSelectResponder }) {
  const activeMission = missions.find(m => m.status === 'in_progress' || m.status === 'arrived' || m.status === 'travelling')
  const urgentCount   = missions.filter(m => ['overdue','escalating','check_in_due','needs_supervisor_review'].includes(m.status)).length
  const suList        = getServiceUsers()

  return (
    <div className="space-y-5">
      <LiveModeStatusPanel variant="responder" compact={true} />
      {/* Responder identity */}
      {responder ? (
        <div className="rounded-xl border p-4" style={{ background: CARD, borderColor: '#C9A84C25' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                   style={{ background: '#22c55e12', border: '1px solid #22c55e35' }}>
                <Icon name="User" size={22} style={{ color: GREEN }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{responder.displayName}</h2>
                <p className="text-xs text-slate-500">{responder.role?.replace(/_/g,' ')}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {(() => {
                    const sc = getResponderStatusColor(responder.status)
                    return (
                      <span className="text-2xs font-semibold flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        <span style={{ color: sc.text }}>{RESPONDER_STATUS_LABELS[responder.status]}</span>
                      </span>
                    )
                  })()}
                  {responder.lastCheckInAt && (
                    <span className="text-2xs text-slate-700">
                      Last check-in: {timeAgo(responder.lastCheckInAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onSelectResponder}
              className="text-2xs px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ background: '#ffffff08', color: SLATE, border: '1px solid #ffffff15' }}>
              Switch
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border p-5 text-center" style={{ background: CARD, borderColor: '#C9A84C25' }}>
          <Icon name="UserCircle" size={32} className="mx-auto mb-2 text-slate-700" />
          <p className="text-sm font-semibold text-white mb-1">Select Your Responder Profile</p>
          <p className="text-xs text-slate-600 mb-4">Choose which responder you are to see your assigned missions.</p>
          <button onClick={onSelectResponder}
            className="px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: GOLD, color: '#000' }}>
            Select Responder
          </button>
        </div>
      )}

      {/* Live mode warning */}
      {!isDemo && (
        <AdvisoryBanner
          color={PURPLE}
          icon="Zap"
          text="Live Mode is active. Demo data is hidden. Connect a secure backend in a later run to enable real mission assignment and sync. Do not enter real sensitive welfare data yet."
        />
      )}

      {/* Active mission highlight */}
      {activeMission && (
        <button
          onClick={() => { setSelectedMission(activeMission); setScreen(SCREEN.DETAIL) }}
          className="w-full rounded-xl border p-4 text-left transition-all hover:brightness-110"
          style={{ background: '#C9A84C08', borderColor: '#C9A84C40' }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: GOLD }} />
            <span className="text-2xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>Active Mission</span>
          </div>
          <h3 className="text-sm font-bold text-white mb-1">{activeMission.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {(() => {
              const st = getMissionStatusColor(activeMission.status)
              return <Pill label={MISSION_STATUS_LABELS[activeMission.status]} color={st.text} bg={st.bg} border={st.border} />
            })()}
            {(() => {
              const rt = getRiskLevelColor(activeMission.riskLevel)
              return <Pill label={RISK_LEVEL_LABELS[activeMission.riskLevel]} color={rt.text} bg={rt.bg} border={rt.border} />
            })()}
          </div>
        </button>
      )}

      {/* Metrics row */}
      {responder && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Assigned', value: missions.length,  color: GOLD,  icon: 'ClipboardList' },
            { label: 'Urgent',   value: urgentCount,      color: urgentCount > 0 ? RED : '#374151', icon: 'AlertTriangle', pulse: urgentCount > 0 },
            { label: 'Sync',     value: sync.unhealthy,   color: sync.unhealthy > 0 ? AMBER : GREEN, icon: 'CloudOff' },
          ].map(({ label, value, color, icon, pulse }) => (
            <div key={label} className="rounded-xl border p-3 text-center"
                 style={{ background: CARD, borderColor: '#C9A84C18' }}>
              <Icon name={icon} size={16} style={{ color, margin: '0 auto 4px' }} />
              <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
              <div className="text-2xs text-slate-600">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Quick Actions</h3>
        <ActionBtn icon="ClipboardList" label="View Assigned Missions"
          sub={responder ? `${missions.length} mission${missions.length !== 1 ? 's' : ''}` : 'Select a responder first'}
          color={GOLD} large fullWidth
          disabled={!responder}
          onClick={() => setScreen(SCREEN.MISSIONS)} />
        <ActionBtn icon="CheckSquare" label="Safety Check-in"
          sub="Log your current safety status"
          color={GREEN} large fullWidth
          disabled={!responder}
          onClick={() => setScreen(SCREEN.CHECKIN)} />
        <ActionBtn icon="AlertOctagon" label="Report Incident"
          sub="Log a welfare or safety incident"
          color={RED} large fullWidth
          disabled={!responder}
          onClick={() => setScreen(SCREEN.INCIDENT)} />
        <ActionBtn icon="Siren" label="Request Escalation"
          sub="Escalate to supervisor"
          color={PURPLE} large fullWidth
          disabled={!responder}
          onClick={() => setScreen(SCREEN.ESCALATION)} />
      </div>

      {/* Sync status */}
      <div className="rounded-xl border px-4 py-3" style={{ background: CARD, borderColor: '#C9A84C18' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-400">Sync Status</span>
          <SyncBadge sync={sync} />
        </div>
        <p className="text-2xs text-slate-700 leading-relaxed">
          {sync.total === 0
            ? 'No sync queue items.'
            : `${sync.pending} pending · ${sync.synced} synced · ${sync.failed} failed · ${sync.conflict} conflict.`}
        </p>
        <p className="text-2xs mt-1 text-slate-700">
          Updates are stored locally and may appear in the Command Dashboard through shared state.
          Real cloud sync requires backend configuration in a later run.
        </p>
        {sync.unhealthy > 0 && (
          <p className="text-2xs mt-1.5 px-2 py-1 rounded" style={{ background: '#ef444408', color: '#fca5a5' }}>
            ⚠ Offline or pending records may not have reached the Command Dashboard.
            Do not assume missing updates mean a person is safe.
          </p>
        )}
      </div>

      {/* Safety notice */}
      <AdvisoryBanner
        color={GOLD}
        icon="ShieldAlert"
        text="ResponseLink OS™ is advisory and coordination-support software. It does not replace emergency services, safeguarding professionals, clinical judgement, or legal duties. If someone is in immediate danger, contact emergency services. Use professional judgement and follow your organisation's safeguarding, lone working, and escalation procedures."
      />
    </div>
  )
}

// ─── Responder Selector Modal ─────────────────────────────────
function ResponderSelectorModal({ responders, currentId, onSelect, onClose, isDemo }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
         style={{ background: 'rgba(0,0,0,0.75)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-t-2xl"
           style={{ background: '#0a050a', border: '1px solid #C9A84C30' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#C9A84C20' }}>
          <h2 className="text-base font-bold text-white">Select Responder</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: '#ffffff10' }}>
            <Icon name="X" size={16} className="text-slate-400" />
          </button>
        </div>
        <div className="p-4 space-y-2">
          {!isDemo && responders.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500">No live responders yet.</p>
              <p className="text-xs text-slate-700 mt-1">Enable Demo Mode or connect a backend.</p>
            </div>
          )}
          {responders.length === 0 && isDemo && (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500">No demo responders seeded yet.</p>
              <button onClick={() => { seedDemoData(); onClose() }}
                className="mt-3 px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: GREEN, color: '#000' }}>
                Seed Demo Data
              </button>
            </div>
          )}
          {responders.map(r => {
            const sc = getResponderStatusColor(r.status)
            return (
              <button key={r.id} onClick={() => onSelect(r.id)}
                className="w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:brightness-110"
                style={{
                  background: r.id === currentId ? '#22c55e10' : CARD,
                  borderColor: r.id === currentId ? '#22c55e40' : '#C9A84C20',
                }}>
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{r.displayName}</p>
                  <p className="text-xs text-slate-500">{r.role?.replace(/_/g,' ')} · <span style={{ color: sc.text }}>{RESPONDER_STATUS_LABELS[r.status]}</span></p>
                </div>
                {r.id === currentId && <Icon name="Check" size={16} style={{ color: GREEN }} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Screen: Assigned Missions ────────────────────────────────
function MissionsScreen({ missions, responder, serviceUsers, isDemo, setScreen, setSelectedMission }) {
  if (!responder) {
    return (
      <div className="text-center py-12">
        <Icon name="UserCircle" size={40} className="mx-auto mb-3 text-slate-700" />
        <p className="text-sm text-white font-semibold mb-1">No responder selected</p>
        <p className="text-xs text-slate-600">Go back and select your responder profile.</p>
      </div>
    )
  }

  if (!isDemo && missions.length === 0) {
    return (
      <AdvisoryBanner
        color={PURPLE} icon="Zap"
        text="Live Mode is active. No assigned missions are available yet. Connect a secure backend in a later setup run to enable real mission assignment and sync."
      />
    )
  }

  return (
    <div className="space-y-3">
      {missions.length === 0 ? (
        <div className="text-center py-10">
          <Icon name="ClipboardList" size={36} className="mx-auto mb-3 text-slate-700" style={{ opacity: 0.3 }} />
          <p className="text-sm text-white font-semibold mb-1">No missions assigned</p>
          <p className="text-xs text-slate-600">No missions are currently assigned to this responder.</p>
        </div>
      ) : (
        missions.map(m => {
          const su   = serviceUsers.find(s => s.id === m.linkedServiceUserId)
          const st   = getMissionStatusColor(m.status)
          const rt   = getRiskLevelColor(m.riskLevel)
          const isUrgent = ['overdue','escalating','needs_supervisor_review','check_in_due'].includes(m.status)
          return (
            <button key={m.id}
              onClick={() => { setSelectedMission(m); setScreen(SCREEN.DETAIL) }}
              className="w-full rounded-xl border p-4 text-left transition-all hover:brightness-110"
              style={{ background: isUrgent ? '#ef444406' : CARD, borderColor: isUrgent ? '#ef444430' : '#C9A84C20' }}>
              {/* Urgency strip */}
              {isUrgent && (
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: RED }} />
                  <span className="text-2xs font-bold uppercase tracking-wider" style={{ color: RED }}>Action Required</span>
                </div>
              )}
              <h3 className="text-sm font-bold text-white mb-2">{m.title}</h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Pill label={MISSION_STATUS_LABELS[m.status]} color={st.text} bg={st.bg} border={st.border} />
                <Pill label={RISK_LEVEL_LABELS[m.riskLevel]}  color={rt.text} bg={rt.bg} border={rt.border} />
                <Pill label={PRIORITY_LABELS[m.priority] || m.priority} color={GOLD} bg="#C9A84C12" border="#C9A84C25" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">
                  {MISSION_TYPE_LABELS[m.missionType] || m.missionType}
                  {m.locationLabel ? ` · ${m.locationLabel}` : ''}
                  {m.area ? `, ${m.area}` : ''}
                </p>
                {su && (
                  <p className="text-xs flex items-center gap-1" style={{ color: PURPLE }}>
                    <Icon name="Heart" size={10} /> {su.preferredName || su.displayName}
                  </p>
                )}
                {m.scheduledTime && (
                  <p className="text-xs text-slate-600">Scheduled: {formatDateTime(m.scheduledTime)}</p>
                )}
                {m.dueTime && (
                  <p className="text-xs" style={{ color: isUrgent ? RED : '#64748b' }}>
                    Due: {formatDateTime(m.dueTime)}
                  </p>
                )}
                {m.checkInRequired && (
                  <p className="text-2xs flex items-center gap-1 text-slate-600">
                    <Icon name="Bell" size={10} /> Check-in required
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-2xs text-slate-700">{timeAgo(m.updatedAt)}</span>
                <span className="text-2xs flex items-center gap-1" style={{ color: GOLD }}>
                  Open <Icon name="ChevronRight" size={12} />
                </span>
              </div>
            </button>
          )
        })
      )}
    </div>
  )
}

// ─── Screen: Mission Detail ───────────────────────────────────
function DetailScreen({ mission, responder, serviceUsers, setScreen, onStatusUpdate, onSuccessMsg }) {
  const [statusResult, setStatusResult] = useState(null)
  const su       = serviceUsers.find(s => s.id === mission.linkedServiceUserId)
  const st       = getMissionStatusColor(mission.status)
  const rt       = getRiskLevelColor(mission.riskLevel)
  const evidence = getEvidenceForMission(mission.id)

  const handleStatus = (newStatus) => {
    const r = updateMissionStatusFromResponder(mission.id, newStatus, responder?.id)
    if (r.ok) {
      onSuccessMsg(`Status updated to "${MISSION_STATUS_LABELS[newStatus]}"`)
      onStatusUpdate()
    } else {
      setStatusResult({ ok: false, error: r.error })
    }
  }

  // Workflow buttons — only show valid transitions
  const workflowButtons = [
    { label: 'Mark Travelling', status: 'travelling', icon: 'Navigation', color: CYAN },
    { label: 'Mark Arrived',    status: 'arrived',    icon: 'MapPin',     color: PURPLE },
    { label: 'Start Visit',     status: 'in_progress', icon: 'Play',      color: GREEN },
    { label: 'Complete Visit',  status: 'completed',  icon: 'CheckCircle2', color: GREEN },
    { label: 'Mark Overdue',    status: 'overdue',    icon: 'Clock',      color: RED   },
    { label: 'Request Supervisor Review', status: 'needs_supervisor_review', icon: 'Flag', color: RED },
  ].filter(b => canTransition(mission.status, b.status))

  const isTerminal = mission.status === 'completed' || mission.status === 'cancelled'

  return (
    <div className="space-y-4">
      {/* Title & badges */}
      <div className="rounded-xl border p-4" style={{ background: CARD, borderColor: '#C9A84C25' }}>
        <h2 className="text-base font-bold text-white mb-2">{mission.title}</h2>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Pill label={MISSION_STATUS_LABELS[mission.status]} color={st.text} bg={st.bg} border={st.border} />
          <Pill label={RISK_LEVEL_LABELS[mission.riskLevel]}  color={rt.text} bg={rt.bg} border={rt.border} />
          <Pill label={PRIORITY_LABELS[mission.priority] || mission.priority} color={GOLD} bg="#C9A84C12" border="#C9A84C25" />
          {mission.demoRecord && <Pill label="Demo" color={GOLD} bg="#C9A84C12" border="#C9A84C25" />}
        </div>
        {/* Detail rows */}
        {[
          ['Type', MISSION_TYPE_LABELS[mission.missionType] || mission.missionType],
          ['Location', [mission.locationLabel, mission.area].filter(Boolean).join(', ') || '—'],
          ['Scheduled', formatDateTime(mission.scheduledTime)],
          ['Due', formatDateTime(mission.dueTime)],
          ['Check-in Required', mission.checkInRequired ? 'Yes' : 'No'],
          ['Escalation', mission.escalationState || 'None'],
          ['Sync', mission.syncStatus || 'local'],
          ['Updated', timeAgo(mission.updatedAt)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-slate-800/30 py-1.5 last:border-0">
            <span className="text-xs text-slate-500">{k}</span>
            <span className="text-xs text-white">{v}</span>
          </div>
        ))}
      </div>

      {/* Service user */}
      {su && (
        <div className="rounded-xl border p-3" style={{ background: `${PURPLE}08`, borderColor: `${PURPLE}25` }}>
          <p className="text-2xs text-slate-500 mb-0.5">Linked Service User</p>
          <p className="text-sm font-bold" style={{ color: PURPLE }}>{su.displayName}</p>
          <p className="text-xs text-slate-500">{SU_STATUS_LABELS[su.wellbeingStatus]} · Risk: {RISK_LEVEL_LABELS[su.riskLevel]}</p>
        </div>
      )}

      {/* Safety notes */}
      {mission.safetyNotes && (
        <AdvisoryBanner color={AMBER} icon="AlertTriangle"
          text={`Safety Notes (Advisory): ${mission.safetyNotes}`} compact />
      )}

      {/* Escalation / high-risk notice — Run 7 */}
      {(mission.riskLevel === 'critical' || mission.riskLevel === 'high') && (
        <div className="rounded-xl border px-4 py-3 flex items-start gap-3"
             style={{ background: '#ef444408', borderColor: '#ef444330' }}>
          <Icon name="Flame" size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-xs font-bold mb-0.5" style={{ color: '#ef4444' }}>
              {mission.riskLevel === 'critical' ? 'Critical' : 'High'} Risk Mission — Human Review Recommended
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              This mission is classified as {mission.riskLevel} risk. Use professional judgement and follow your
              organisation's lone working, safeguarding, and escalation procedures.
              This is an advisory prompt — not a safeguarding determination.
            </p>
          </div>
        </div>
      )}
      {(mission.escalationState || mission.status === 'needs_supervisor_review' || mission.status === 'escalating') && (
        <div className="rounded-xl border px-4 py-3 flex items-start gap-3"
             style={{ background: '#ef444408', borderColor: '#ef444330' }}>
          <Icon name="ShieldAlert" size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-xs font-bold mb-0.5" style={{ color: '#ef4444' }}>
              Supervisor Review Requested — Advisory
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Supervisor review has been requested for this mission. Follow your organisation's escalation procedures.
              If someone is in immediate danger, contact emergency services immediately.
            </p>
          </div>
        </div>
      )}

      {/* Status workflow */}
      {statusResult && !statusResult.ok && (
        <ErrorBanner message={statusResult.error} onDismiss={() => setStatusResult(null)} />
      )}

      {!isTerminal && workflowButtons.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Update Status</h3>
          {workflowButtons.map(b => (
            <button key={b.status}
              onClick={() => handleStatus(b.status)}
              className="w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: `${b.color}10`, borderColor: `${b.color}30` }}>
              <Icon name={b.icon} size={18} style={{ color: b.color }} />
              <span className="text-sm font-semibold text-white">{b.label}</span>
              <Icon name="ChevronRight" size={14} className="text-slate-600 ml-auto" />
            </button>
          ))}
        </div>
      )}

      {isTerminal && (
        <div className="rounded-xl border px-4 py-3 text-center"
             style={{ background: '#22c55e08', borderColor: '#22c55e25' }}>
          <Icon name="CheckCircle2" size={20} style={{ color: GREEN, margin: '0 auto 4px' }} />
          <p className="text-sm font-semibold" style={{ color: GREEN }}>
            Mission {mission.status === 'completed' ? 'Completed' : 'Cancelled'}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">This mission is closed. Evidence records are preserved.</p>
        </div>
      )}

      {/* Field actions */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Field Actions</h3>
        <ActionBtn icon="CheckSquare" label="Safety Check-in"       color={GREEN}  fullWidth onClick={() => setScreen(SCREEN.CHECKIN)} />
        <ActionBtn icon="ClipboardCheck" label="Welfare Checklist"  color={CYAN}   fullWidth onClick={() => setScreen(SCREEN.CHECKLIST)} />
        <ActionBtn icon="FileText"   label="Add Note / Outcome"     color={SLATE}  fullWidth onClick={() => setScreen(SCREEN.NOTES)} />
        <ActionBtn icon="Flag"       label="Raise Risk Flag"        color={AMBER}  fullWidth onClick={() => setScreen(SCREEN.RISKFLAG)} />
        <ActionBtn icon="AlertOctagon" label="Report Incident"      color={RED}    fullWidth onClick={() => setScreen(SCREEN.INCIDENT)} />
        <ActionBtn icon="Siren"      label="Request Escalation"     color={PURPLE} fullWidth onClick={() => setScreen(SCREEN.ESCALATION)} />
      </div>

      {/* Evidence log */}
      {evidence.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#C9A84C18' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: '#C9A84C15', background: '#0a050a' }}>
            <p className="text-xs font-semibold text-slate-400">Evidence Log ({evidence.length})</p>
          </div>
          {evidence.slice(0, 5).map(ev => (
            <div key={ev.id} className="px-4 py-3 border-b last:border-0 flex items-start gap-2"
                 style={{ borderColor: '#C9A84C10' }}>
              <Icon name="FileText" size={12} style={{ color: SLATE, marginTop: 1, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white">{ev.title}</p>
                <p className="text-2xs text-slate-600">{ev.recordType?.replace(/_/g,' ')} · {timeAgo(ev.timestamp)}</p>
              </div>
            </div>
          ))}
          {evidence.length > 5 && (
            <div className="px-4 py-2 text-center">
              <span className="text-2xs text-slate-700">+{evidence.length - 5} more records</span>
            </div>
          )}
        </div>
      )}

      {/* Advisory */}
      <AdvisoryBanner compact color={GOLD} icon="ShieldAlert"
        text="All field actions are advisory records. ResponseLink OS™ does not make safeguarding, clinical, or emergency decisions. Human review is required." />
    </div>
  )
}

// ─── Screen: Safety Check-in ──────────────────────────────────
function CheckInScreen({ mission, responder, serviceUsers, onBack, onSuccess }) {
  const [form, setForm] = useState({ safetyStatus: 'safe', message: '', riskLevel: 'low' })
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)

  const SAFETY_STATUSES = [
    { v: 'safe',          label: 'Safe',           color: GREEN },
    { v: 'delayed',       label: 'Delayed',        color: AMBER },
    { v: 'needs_support', label: 'Needs Support',  color: AMBER },
    { v: 'concern',       label: 'Concern',        color: RED   },
    { v: 'escalating',    label: 'Escalating',     color: RED   },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    setResult(null)
    const r = submitResponderCheckIn({
      missionId:    mission?.id || null,
      responderId:  responder?.id,
      safetyStatus: form.safetyStatus,
      message:      form.message,
      riskLevel:    form.riskLevel,
    })
    setSaving(false)
    if (r.ok) {
      onSuccess('Safety check-in recorded.')
      onBack()
    } else {
      setResult({ ok: false, error: r.error })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AdvisoryBanner color={GREEN} icon="CheckSquare"
        text="Safety check-ins support coordination. They do not guarantee responder safety. If you are in immediate danger, call emergency services." />

      {mission && (
        <div className="rounded-xl border px-4 py-3" style={{ background: CARD, borderColor: '#C9A84C20' }}>
          <p className="text-2xs text-slate-500">Mission</p>
          <p className="text-sm font-semibold text-white">{mission.title}</p>
        </div>
      )}

      <div>
        <label className={labelCls}>Safety Status *</label>
        <div className="grid grid-cols-1 gap-2">
          {SAFETY_STATUSES.map(s => (
            <button key={s.v} type="button"
              onClick={() => setForm(f => ({ ...f, safetyStatus: s.v }))}
              className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-all"
              style={{
                background: form.safetyStatus === s.v ? `${s.color}15` : CARD,
                borderColor: form.safetyStatus === s.v ? `${s.color}50` : '#C9A84C20',
              }}>
              <div className="w-3 h-3 rounded-full flex-shrink-0"
                   style={{ background: form.safetyStatus === s.v ? s.color : '#374151' }} />
              <span className="text-sm font-semibold"
                    style={{ color: form.safetyStatus === s.v ? s.color : '#64748b' }}>{s.label}</span>
              {form.safetyStatus === s.v && <Icon name="Check" size={14} style={{ color: s.color, marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Risk Level</label>
        <select className={selectCls} value={form.riskLevel}
                onChange={e => setForm(f => ({ ...f, riskLevel: e.target.value }))}>
          {Object.entries(RISK_LEVEL_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Message / Notes (optional)</label>
        <textarea className={inputCls} rows={3} value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Advisory note — no medical diagnosis or safeguarding decisions." />
      </div>

      {result && !result.ok && <ErrorBanner message={result.error} />}

      <button type="submit" disabled={saving}
        className="w-full py-4 rounded-xl text-base font-bold transition-all"
        style={{ background: GREEN, color: '#000', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving…' : 'Submit Safety Check-in'}
      </button>
    </form>
  )
}

// ─── Screen: Welfare Checklist ────────────────────────────────
function ChecklistScreen({ mission, responder, serviceUsers, onBack, onSuccess }) {
  const [items, setItems] = useState(
    WELFARE_CHECKLIST_ITEMS.map(i => ({ ...i, status: 'not_complete', note: '' }))
  )
  const [outcomeNotes,    setOutcomeNotes]    = useState('')
  const [followUpRequired, setFollowUpRequired] = useState(false)
  const [result, setResult]                    = useState(null)
  const [saving, setSaving]                    = useState(false)

  const setItemStatus = (id, status) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  const setItemNote = (id, note) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, note } : i))

  const su = serviceUsers.find(s => s.id === mission?.linkedServiceUserId)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    setResult(null)
    const r = saveWelfareChecklist({
      missionId:       mission?.id,
      responderId:     responder?.id,
      serviceUserId:   su?.id,
      items,
      outcomeNotes,
      followUpRequired,
    })
    setSaving(false)
    if (r.ok) {
      onSuccess(`Welfare checklist saved (${r.checklistStatus}).`)
      onBack()
    } else {
      setResult({ ok: false, error: r.error })
    }
  }

  const STATUS_OPTS = [
    { v: 'complete',       label: 'Complete',       color: GREEN },
    { v: 'not_complete',   label: 'Not Complete',   color: AMBER },
    { v: 'not_applicable', label: 'N/A',            color: '#374151' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AdvisoryBanner color={CYAN} icon="ClipboardCheck"
        text="This checklist supports consistent record keeping. It does not replace professional judgement or safeguarding procedures. Advisory only." />

      {mission && (
        <div className="rounded-xl border px-4 py-3" style={{ background: CARD, borderColor: '#C9A84C20' }}>
          <p className="text-2xs text-slate-500">Mission</p>
          <p className="text-sm font-semibold text-white">{mission.title}</p>
          {su && <p className="text-xs mt-0.5" style={{ color: PURPLE }}>{su.displayName}</p>}
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="rounded-xl border p-4"
               style={{ background: CARD, borderColor: item.status === 'complete' ? '#22c55e25' : '#C9A84C18' }}>
            <p className="text-sm font-semibold text-white mb-3">{item.label}</p>
            <div className="flex gap-2 mb-2 flex-wrap">
              {STATUS_OPTS.map(s => (
                <button key={s.v} type="button"
                  onClick={() => setItemStatus(item.id, s.v)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: item.status === s.v ? `${s.color}20` : '#ffffff08',
                    border: `1px solid ${item.status === s.v ? s.color : '#ffffff15'}`,
                    color: item.status === s.v ? s.color : '#64748b',
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
            <input
              className="w-full bg-transparent border-b text-xs text-slate-400 placeholder-slate-700 focus:outline-none py-1"
              style={{ borderColor: '#C9A84C15' }}
              placeholder="Optional note (advisory — no diagnoses)"
              value={item.note}
              onChange={e => setItemNote(item.id, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Outcome */}
      <div>
        <label className={labelCls}>Outcome Notes (advisory)</label>
        <textarea className={inputCls} rows={3} value={outcomeNotes}
                  onChange={e => setOutcomeNotes(e.target.value)}
                  placeholder="Visit outcome — advisory notes only. No diagnoses or safeguarding determinations." />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={followUpRequired}
               onChange={e => setFollowUpRequired(e.target.checked)}
               className="w-4 h-4 rounded accent-yellow-500" />
        <span className="text-sm text-slate-300">Follow-up required</span>
      </label>

      {result && !result.ok && <ErrorBanner message={result.error} />}

      <button type="submit" disabled={saving}
        className="w-full py-4 rounded-xl text-base font-bold"
        style={{ background: CYAN, color: '#000', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving…' : 'Save Checklist'}
      </button>
    </form>
  )
}

// ─── Screen: Notes / Outcome ──────────────────────────────────
function NotesScreen({ mission, responder, serviceUsers, onBack, onSuccess }) {
  const [form, setForm] = useState({
    noteType: 'visit_note', content: '', followUpRequired: false, supervisorReviewRequired: false,
  })
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const su = serviceUsers.find(s => s.id === mission?.linkedServiceUserId)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    const r = addResponderNote({
      missionId:               mission?.id,
      responderId:             responder?.id,
      serviceUserId:           su?.id,
      noteType:                form.noteType,
      content:                 form.content,
      followUpRequired:        form.followUpRequired,
      supervisorReviewRequired: form.supervisorReviewRequired,
    })
    setSaving(false)
    if (r.ok) {
      onSuccess('Note saved.')
      onBack()
    } else {
      setResult({ ok: false, error: r.error })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AdvisoryBanner compact color={SLATE} icon="FileText"
        text="Notes are advisory coordination records. They are append-only. Previous notes are never overwritten. Do not record medical diagnoses or safeguarding decisions." />

      <div>
        <label className={labelCls}>Note Type</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: 'visit_note',   label: 'Visit Note' },
            { v: 'outcome_note', label: 'Outcome' },
            { v: 'general',      label: 'General' },
          ].map(t => (
            <button key={t.v} type="button"
              onClick={() => setForm(f => ({ ...f, noteType: t.v }))}
              className="py-2.5 rounded-xl text-xs font-semibold border transition-all"
              style={{
                background: form.noteType === t.v ? '#C9A84C15' : CARD,
                borderColor: form.noteType === t.v ? '#C9A84C50' : '#C9A84C20',
                color: form.noteType === t.v ? GOLD : '#64748b',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Note Content *</label>
        <textarea className={inputCls} rows={5} required value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Advisory note — no medical diagnoses or safeguarding determinations." />
      </div>

      <div className="space-y-2">
        {[
          { key: 'followUpRequired',        label: 'Follow-up required' },
          { key: 'supervisorReviewRequired', label: 'Supervisor review required (advisory)' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form[key]}
                   onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                   className="w-4 h-4 rounded accent-yellow-500" />
            <span className="text-sm text-slate-300">{label}</span>
          </label>
        ))}
      </div>

      {result && !result.ok && <ErrorBanner message={result.error} />}

      <button type="submit" disabled={saving}
        className="w-full py-4 rounded-xl text-base font-bold"
        style={{ background: GOLD, color: '#000', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving…' : 'Save Note'}
      </button>
    </form>
  )
}

// ─── Screen: Risk Flag ────────────────────────────────────────
function RiskFlagScreen({ mission, responder, serviceUsers, onBack, onSuccess }) {
  const [form, setForm] = useState({
    riskLevel: 'medium', triggerType: 'responder_escalation',
    title: '', description: '', requiresSupervisorReview: false,
  })
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const su = serviceUsers.find(s => s.id === mission?.linkedServiceUserId)

  const TRIGGERS = [
    ['responder_escalation',          'Responder Escalation'],
    ['service_user_help_request',     'Service User Help Request'],
    ['safeguarding_concern',          'Safeguarding Concern (Advisory)'],
    ['location_risk_note',            'Location Risk Note'],
    ['vulnerable_person_risk_marker', 'Vulnerable Person Risk Marker'],
    ['incomplete_welfare_checklist',  'Incomplete Welfare Checklist'],
    ['unresolved_incident',           'Unresolved Incident'],
    ['repeated_failed_contact',       'Repeated Failed Contact'],
    ['offline_too_long',              'Offline Too Long'],
    ['missing_evidence',              'Missing Evidence'],
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    const r = raiseResponderRiskFlag({
      missionId:            mission?.id,
      responderId:          responder?.id,
      linkedServiceUserId:  su?.id,
      riskLevel:            form.riskLevel,
      triggerType:          form.triggerType,
      title:                form.title,
      description:          form.description,
      requiresSupervisorReview: form.requiresSupervisorReview,
    })
    setSaving(false)
    if (r.ok) {
      onSuccess(r.escalated
        ? 'Risk flag raised — mission escalated for supervisor review.'
        : 'Risk flag raised.')
      onBack()
    } else {
      setResult({ ok: false, error: r.error })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AdvisoryBanner color={AMBER} icon="Flag"
        text="Risk flags are advisory prompts for human review. ResponseLink OS™ does not make final safeguarding, legal, clinical, or emergency decisions. High or critical flags will escalate to supervisor review." />

      <div>
        <label className={labelCls}>Risk Level *</label>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(RISK_LEVEL_LABELS).map(([v, l]) => {
            const c = getRiskLevelColor(v)
            return (
              <button key={v} type="button"
                onClick={() => setForm(f => ({ ...f, riskLevel: v }))}
                className="py-2.5 rounded-xl text-xs font-bold border transition-all"
                style={{
                  background: form.riskLevel === v ? c.bg : CARD,
                  borderColor: form.riskLevel === v ? c.text : '#C9A84C20',
                  color: form.riskLevel === v ? c.text : '#64748b',
                }}>
                {l}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className={labelCls}>Trigger Type *</label>
        <select className={selectCls} value={form.triggerType}
                onChange={e => setForm(f => ({ ...f, triggerType: e.target.value }))}>
          {TRIGGERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>Title *</label>
        <input className={inputCls} required value={form.title}
               onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
               placeholder="Brief advisory description of the flag" />
      </div>

      <div>
        <label className={labelCls}>Description (advisory)</label>
        <textarea className={inputCls} rows={3} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Advisory context only. No diagnoses or safeguarding determinations." />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={form.requiresSupervisorReview}
               onChange={e => setForm(f => ({ ...f, requiresSupervisorReview: e.target.checked }))}
               className="w-4 h-4 rounded accent-yellow-500" />
        <span className="text-sm text-slate-300">Requires supervisor review (advisory)</span>
      </label>

      {result && !result.ok && <ErrorBanner message={result.error} />}

      <button type="submit" disabled={saving}
        className="w-full py-4 rounded-xl text-base font-bold"
        style={{ background: AMBER, color: '#000', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving…' : 'Raise Risk Flag'}
      </button>
    </form>
  )
}

// ─── Screen: Incident Report ──────────────────────────────────
function IncidentScreen({ mission, responder, serviceUsers, onBack, onSuccess }) {
  const [form, setForm] = useState({
    title: '', category: 'welfare_concern', severity: 'low',
    description: '', actionTaken: '', supervisorReviewStatus: 'not_required',
  })
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const su = serviceUsers.find(s => s.id === mission?.linkedServiceUserId)

  const CATEGORIES = [
    ['welfare_concern',              'Welfare Concern'],
    ['responder_safety',             'Responder Safety'],
    ['missed_contact',               'Missed Contact'],
    ['service_user_help_request',    'Help Request'],
    ['safeguarding_sensitive',       'Safeguarding Sensitive (Advisory)'],
    ['access_issue',                 'Access Issue'],
    ['environmental_risk',           'Environmental Risk'],
    ['other',                        'Other'],
  ]
  const SEVERITIES = [
    ['low', 'Low', GREEN], ['medium', 'Medium', AMBER],
    ['high', 'High', '#f97316'], ['critical', 'Critical', RED],
  ]
  const REVIEW_STATUSES = [
    ['not_required', 'Not Required'],
    ['pending',      'Pending Review'],
    ['required',     'Required'],
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    const r = submitIncidentReport({
      missionId:             mission?.id,
      responderId:           responder?.id,
      serviceUserId:         su?.id,
      title:                 form.title,
      category:              form.category,
      severity:              form.severity,
      description:           form.description,
      actionTaken:           form.actionTaken,
      supervisorReviewStatus: form.supervisorReviewStatus,
    })
    setSaving(false)
    if (r.ok) {
      onSuccess(r.needsReview
        ? 'Incident reported — supervisor review is required.'
        : 'Incident report submitted.')
      onBack()
    } else {
      setResult({ ok: false, error: r.error })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AdvisoryBanner color={RED} icon="AlertOctagon"
        text="Incident reports are advisory coordination records. Do not accuse individuals, make legal conclusions, safeguarding determinations, or medical diagnoses. Human review is required." />

      <div>
        <label className={labelCls}>Incident Title *</label>
        <input className={inputCls} required value={form.title}
               onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
               placeholder="Brief advisory title" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Category *</label>
          <select className={selectCls} value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Supervisor Review</label>
          <select className={selectCls} value={form.supervisorReviewStatus}
                  onChange={e => setForm(f => ({ ...f, supervisorReviewStatus: e.target.value }))}>
            {REVIEW_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Severity *</label>
        <div className="grid grid-cols-4 gap-2">
          {SEVERITIES.map(([v, l, c]) => (
            <button key={v} type="button"
              onClick={() => setForm(f => ({ ...f, severity: v }))}
              className="py-2.5 rounded-xl text-xs font-bold border transition-all"
              style={{
                background: form.severity === v ? `${c}18` : CARD,
                borderColor: form.severity === v ? c : '#C9A84C20',
                color: form.severity === v ? c : '#64748b',
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Description * (advisory — no diagnoses)</label>
        <textarea className={inputCls} rows={4} required value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Factual description of the incident. Advisory only." />
      </div>

      <div>
        <label className={labelCls}>Action Taken (advisory)</label>
        <textarea className={inputCls} rows={2} value={form.actionTaken}
                  onChange={e => setForm(f => ({ ...f, actionTaken: e.target.value }))}
                  placeholder="What steps were taken? Advisory record only." />
      </div>

      {result && !result.ok && <ErrorBanner message={result.error} />}

      <button type="submit" disabled={saving}
        className="w-full py-4 rounded-xl text-base font-bold"
        style={{ background: RED, color: 'white', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving…' : 'Submit Incident Report'}
      </button>
    </form>
  )
}

// ─── Screen: Escalation Request ───────────────────────────────
function EscalationScreen({ mission, responder, serviceUsers, onBack, onSuccess }) {
  const [form, setForm] = useState({
    reason: '', urgency: 'priority', message: '', immediateDangerAcknowledgement: false,
  })
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const su = serviceUsers.find(s => s.id === mission?.linkedServiceUserId)

  const URGENCIES = [
    ['routine',  'Routine',  '#64748b'],
    ['priority', 'Priority', AMBER],
    ['urgent',   'Urgent',   '#f97316'],
    ['critical', 'Critical', RED],
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.immediateDangerAcknowledgement && form.urgency === 'critical') {
      setResult({ ok: false, error: 'For critical escalations, please acknowledge the emergency services reminder.' })
      return
    }
    setSaving(true)
    const r = requestEscalation({
      missionId:                   mission?.id,
      responderId:                 responder?.id,
      serviceUserId:               su?.id,
      reason:                      form.reason,
      urgency:                     form.urgency,
      message:                     form.message,
      immediateDangerAcknowledgement: form.immediateDangerAcknowledgement,
    })
    setSaving(false)
    if (r.ok) {
      onSuccess('Escalation request submitted — supervisor review required.')
      onBack()
    } else {
      setResult({ ok: false, error: r.error })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Emergency first */}
      <div className="rounded-xl border px-4 py-4"
           style={{ background: '#ef444410', borderColor: '#ef444445' }}>
        <div className="flex items-start gap-3">
          <Icon name="Siren" size={20} style={{ color: RED, flexShrink: 0 }} />
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: RED }}>
              Emergency First
            </p>
            <p className="text-xs leading-relaxed" style={{ color: '#fca5a5' }}>
              If someone is in immediate danger, contact emergency services first.
              This app does not replace emergency services.
              Use professional judgement and follow your organisation's escalation procedures.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>Urgency *</label>
        <div className="grid grid-cols-4 gap-2">
          {URGENCIES.map(([v, l, c]) => (
            <button key={v} type="button"
              onClick={() => setForm(f => ({ ...f, urgency: v }))}
              className="py-2.5 rounded-xl text-xs font-bold border transition-all"
              style={{
                background: form.urgency === v ? `${c}18` : CARD,
                borderColor: form.urgency === v ? c : '#C9A84C20',
                color: form.urgency === v ? c : '#64748b',
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Reason *</label>
        <input className={inputCls} required value={form.reason}
               onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
               placeholder="Why is escalation needed? (advisory)" />
      </div>

      <div>
        <label className={labelCls}>Message (advisory)</label>
        <textarea className={inputCls} rows={3} value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Additional context for the supervisor. Advisory only." />
      </div>

      <label className="flex items-start gap-3 cursor-pointer rounded-xl border p-3"
             style={{ borderColor: '#C9A84C20', background: CARD }}>
        <input type="checkbox" checked={form.immediateDangerAcknowledgement}
               onChange={e => setForm(f => ({ ...f, immediateDangerAcknowledgement: e.target.checked }))}
               className="w-4 h-4 rounded accent-yellow-500 mt-0.5 flex-shrink-0" />
        <span className="text-xs text-slate-300 leading-relaxed">
          I acknowledge that if there is immediate danger, I will contact emergency services.
          This escalation is an advisory coordination request, not an emergency call.
        </span>
      </label>

      {result && !result.ok && <ErrorBanner message={result.error} />}

      <button type="submit" disabled={saving}
        className="w-full py-4 rounded-xl text-base font-bold"
        style={{ background: PURPLE, color: 'white', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving…' : 'Submit Escalation Request'}
      </button>

      <AdvisoryBanner compact color={SLATE} icon="ShieldAlert"
        text="Escalation requests are advisory. ResponseLink OS™ does not contact emergency services, make safeguarding decisions, or guarantee supervisor response times." />
    </form>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function ResponderPWA() {
  const navigate   = useNavigate()

  // ── State ──────────────────────────────────────────────────
  const [screen,           setScreenRaw]      = useState(SCREEN.HOME)
  const [selectedMission,  setSelectedMission] = useState(null)
  const [responderId,      setResponderIdState] = useState(getCurrentResponderId)
  const [responder,        setResponder]       = useState(null)
  const [missions,         setMissions]        = useState([])
  const [serviceUsers,     setServiceUsers]    = useState([])
  const [allResponders,    setAllResponders]   = useState([])
  const [sync,             setSync]            = useState({ pending: 0, failed: 0, offline: 0, synced: 0, total: 0, unhealthy: 0 })
  const [isDemo,           setIsDemo]          = useState(getDemoMode)
  const [successMsg,       setSuccessMsg]      = useState('')
  const [showSelector,     setShowSelector]    = useState(false)

  // ── Screen title map ────────────────────────────────────────
  const SCREEN_TITLES = {
    [SCREEN.HOME]:       'Responder PWA',
    [SCREEN.MISSIONS]:   'Assigned Missions',
    [SCREEN.DETAIL]:     selectedMission?.title || 'Mission Detail',
    [SCREEN.CHECKIN]:    'Safety Check-in',
    [SCREEN.CHECKLIST]:  'Welfare Checklist',
    [SCREEN.NOTES]:      'Add Note / Outcome',
    [SCREEN.RISKFLAG]:   'Raise Risk Flag',
    [SCREEN.INCIDENT]:   'Report Incident',
    [SCREEN.ESCALATION]: 'Request Escalation',
  }

  // ── Load data ───────────────────────────────────────────────
  const loadData = useCallback(() => {
    try {
      const dm  = getDemoMode()
      setIsDemo(dm)
      const rid = getCurrentResponderId()
      setResponderIdState(rid)
      const r   = rid ? responderTable.get(rid) : null
      setResponder(r)
      const assigned = rid ? getAssignedMissionsForResponder(rid) : []
      setMissions(assigned)
      setServiceUsers(getServiceUsers())
      setAllResponders(getResponders())
      setSync(getPWASyncSummary())
      // Refresh selected mission if open
      if (selectedMission) {
        const fresh = missionTable.get(selectedMission.id)
        if (fresh) setSelectedMission(fresh)
      }
    } catch (err) {
      console.error('[RLPWA] loadData error:', err)
    }
  }, [selectedMission?.id])

  useEffect(() => { loadData() }, [loadData])

  // ── Screen navigation ───────────────────────────────────────
  const setScreen = (s) => {
    setScreenRaw(s)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    if (screen === SCREEN.DETAIL) { setScreen(SCREEN.MISSIONS); return }
    if (screen === SCREEN.MISSIONS) { setScreen(SCREEN.HOME); return }
    if ([SCREEN.CHECKIN, SCREEN.CHECKLIST, SCREEN.NOTES,
         SCREEN.RISKFLAG, SCREEN.INCIDENT, SCREEN.ESCALATION].includes(screen)) {
      setScreen(selectedMission ? SCREEN.DETAIL : SCREEN.HOME)
      return
    }
    setScreen(SCREEN.HOME)
  }

  // ── Handlers ────────────────────────────────────────────────
  const handleSelectResponder = (id) => {
    setCurrentResponderId(id)
    setResponderIdState(id)
    setShowSelector(false)
    setTimeout(loadData, 50)
  }

  const handleStatusUpdate = () => {
    setTimeout(loadData, 50)
  }

  const handleSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(loadData, 50)
  }

  // ── Shared screen props ─────────────────────────────────────
  const sharedProps = {
    mission:      selectedMission,
    responder,
    serviceUsers,
    onBack:       goBack,
    onSuccess:    handleSuccess,
    isDemo,
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-full flex flex-col" style={{ background: BG }}>

      {/* ── PWA Header ─────────────────────────────────────── */}
      <div className="sticky top-0 z-30 px-4 py-3 border-b flex items-center gap-3"
           style={{ background: '#0a050a', borderColor: '#C9A84C20' }}>
        {screen !== SCREEN.HOME ? (
          <button onClick={goBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ background: '#ffffff08' }}>
            <Icon name="ChevronLeft" size={18} className="text-slate-400" />
          </button>
        ) : (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: '#22c55e12', border: '1px solid #22c55e30' }}>
            <Icon name="Smartphone" size={18} style={{ color: GREEN }} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate" style={{ color: GOLD }}>
            {SCREEN_TITLES[screen]}
          </h1>
          <p className="text-2xs truncate" style={{ color: SLATE }}>
            ResponseLink OS™ · 4P3X Intelligent AI™
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Demo/Live badge */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full"
               style={{ background: isDemo ? '#22c55e12' : '#a855f712',
                        border: `1px solid ${isDemo ? '#22c55e30' : '#a855f730'}` }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: isDemo ? GREEN : PURPLE }} />
            <span className="text-2xs font-semibold" style={{ color: isDemo ? GREEN : PURPLE }}>
              {isDemo ? 'Demo' : 'Live'}
            </span>
          </div>
          {/* Sync/Online indicator */}
          {(() => {
            const os = getOnlineStatus()
            return !os.online ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                   style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                <Icon name="WifiOff" size={10} style={{ color: RED }} />
                <span className="text-2xs font-semibold" style={{ color: RED }}>Offline</span>
              </div>
            ) : sync.unhealthy > 0 ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                   style={{ background: '#f59e0b10', border: '1px solid #f59e0b30' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: AMBER }} />
                <span className="text-2xs font-semibold" style={{ color: AMBER }}>{sync.pending}P</span>
              </div>
            ) : null
          })()}
          {/* Back to dashboard */}
          <button onClick={() => navigate(ROUTES.DASHBOARD)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: '#ffffff08' }}
            title="Command Dashboard">
            <Icon name="LayoutDashboard" size={15} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">

        {/* Success banner */}
        {successMsg && (
          <SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg('')} />
        )}

        {/* Screen content */}
        {screen === SCREEN.HOME && (
          <HomeScreen
            responder={responder}
            missions={missions}
            sync={sync}
            isDemo={isDemo}
            navigate={navigate}
            setScreen={setScreen}
            setSelectedMission={setSelectedMission}
            onSelectResponder={() => setShowSelector(true)}
          />
        )}

        {screen === SCREEN.MISSIONS && (
          <MissionsScreen
            missions={missions}
            responder={responder}
            serviceUsers={serviceUsers}
            isDemo={isDemo}
            setScreen={setScreen}
            setSelectedMission={setSelectedMission}
          />
        )}

        {screen === SCREEN.DETAIL && selectedMission && (
          <DetailScreen
            {...sharedProps}
            setScreen={setScreen}
            onStatusUpdate={handleStatusUpdate}
            onSuccessMsg={handleSuccess}
          />
        )}

        {screen === SCREEN.CHECKIN    && <CheckInScreen    {...sharedProps} />}
        {screen === SCREEN.CHECKLIST  && <ChecklistScreen  {...sharedProps} />}
        {screen === SCREEN.NOTES      && <NotesScreen      {...sharedProps} />}
        {screen === SCREEN.RISKFLAG   && <RiskFlagScreen   {...sharedProps} />}
        {screen === SCREEN.INCIDENT   && <IncidentScreen   {...sharedProps} />}
        {screen === SCREEN.ESCALATION && <EscalationScreen {...sharedProps} />}

        {/* Footer branding */}
        <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: '#C9A84C15' }}>
          <p className="text-2xs" style={{ color: '#374151' }}>
            ResponseLink OS™ · Responder PWA · Run 4
          </p>
          <p className="text-2xs mt-0.5" style={{ color: '#374151' }}>
            Powered by 4P3X Intelligent AI™ · Created by Kyzel Kreates™
          </p>
        </div>
      </div>

      {/* ── Responder Selector Modal ──────────────────────── */}
      {showSelector && (
        <ResponderSelectorModal
          responders={allResponders}
          currentId={responderId}
          onSelect={handleSelectResponder}
          onClose={() => setShowSelector(false)}
          isDemo={isDemo}
        />
      )}
    </div>
  )
}
