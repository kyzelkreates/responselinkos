/**
 * ============================================================
 * ResponseLink OS™ — Service User PWA (Full Workflow)
 * /src/pages/ServiceUserPWA.jsx
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 5 — Service User PWA Full Workflow
 *
 * Local-first. All reads/writes through SSOT (core_rlData.js).
 * No backend. No Supabase. No secrets.
 *
 * Privacy: Only service-user-facing fields are shown.
 * Staff-only notes, risk levels, case notes, and internal
 * audit fields are NEVER exposed here.
 *
 * ⚠️  ADVISORY NOTICE:
 *   This does not replace emergency services, safeguarding
 *   professionals, clinical judgement, or legal duties.
 *   If you are in immediate danger, contact emergency services.
 * ============================================================
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './components_ui_Icon'
import { ROUTES } from './config_routes'
import { formatDateTime } from './utils_format'
import {
  getDemoMode,
  SERVICE_USER_STATUS,
} from './core_rlData'
import { seedDemoData } from './core_rlDemoData'
import {
  timeAgo,
  getMissionStatusColor,
  MISSION_TYPE_LABELS,
  MISSION_STATUS_LABELS,
} from './core_rlSelectors'
import {
  getCurrentServiceUserId, setCurrentServiceUserId,
  getCurrentServiceUser, getAllServiceUsers,
  getLinkedMissionsForServiceUser,
  submitServiceUserWellbeingCheckIn,
  submitServiceUserHelpRequest,
  confirmServiceUserVisit,
  updateServiceUserSupportNeeds,
  submitServiceUserSafetyConcern,
  sendServiceUserMessage,
  getSUSyncSummary,
  WELLBEING_STATUS_LABELS,
  SUPPORT_NEED_LABELS,
  CONTACT_METHOD_LABELS,
  SUPPORT_TYPE_LABELS,
  HELP_REASON_LABELS,
  URGENCY_LABELS,
  CONCERN_TYPE_LABELS,
  CONCERN_LEVEL_LABELS,
  CONSENT_STATUS_LABELS,
} from './core_rlSUHelpers'
import { getOnlineStatus } from './core_rlSyncEngine'
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

// ─── Screen states ────────────────────────────────────────────
const SCREEN = {
  HOME:         'home',
  PROFILE:      'profile',
  VISITS:       'visits',
  WELLBEING:    'wellbeing',
  HELP:         'help',
  VISIT_CONFIRM:'visit_confirm',
  SUPPORT_NEEDS:'support_needs',
  SAFETY:       'safety',
  MESSAGE:      'message',
  SETTINGS:     'settings',
}

// ─── Wellbeing status display map ─────────────────────────────
const SU_STATUS_DISPLAY = {
  stable:                  { label: 'Stable',            color: GREEN,  icon: 'CheckCircle2' },
  check_in_received:       { label: 'Check-in received', color: GREEN,  icon: 'CheckCircle2' },
  support_requested:       { label: 'Support requested', color: AMBER,  icon: 'LifeBuoy' },
  missed_check_in:         { label: 'Missed check-in',   color: AMBER,  icon: 'Clock' },
  visit_confirmed:         { label: 'Visit confirmed',   color: PURPLE, icon: 'CalendarCheck' },
  visit_declined:          { label: 'Visit declined',    color: SLATE,  icon: 'CalendarX' },
  wellbeing_concern:       { label: 'Wellbeing concern', color: AMBER,  icon: 'Heart' },
  safety_concern:          { label: 'Safety concern',    color: RED,    icon: 'AlertTriangle' },
  urgent_help_requested:   { label: 'Help requested',    color: RED,    icon: 'Siren' },
  offline:                 { label: 'Offline',           color: SLATE,  icon: 'WifiOff' },
  needs_follow_up:         { label: 'Follow-up needed',  color: AMBER,  icon: 'Bell' },
  needs_supervisor_review: { label: 'Under review',      color: RED,    icon: 'Flag' },
}

// ─── Shared tiny components ───────────────────────────────────
function Pill({ label, color, bg }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ color, background: bg || `${color}15`, border: `1px solid ${color}30` }}>
      {label}
    </span>
  )
}

function AdvisoryBox({ text, color = AMBER, icon = 'AlertTriangle', large }) {
  return (
    <div className={`rounded-2xl border flex items-start gap-3 ${large ? 'px-5 py-4' : 'px-4 py-3'}`}
         style={{ background: `${color}08`, borderColor: `${color}30` }}>
      <Icon name={icon} size={large ? 18 : 14} style={{ color, flexShrink: 0, marginTop: 2 }} />
      <p className={`leading-relaxed flex-1 ${large ? 'text-sm' : 'text-xs'}`} style={{ color: SLATE }}>
        {text}
      </p>
    </div>
  )
}

function EmergencyWarning() {
  return (
    <div className="rounded-2xl border-2 px-5 py-5"
         style={{ background: '#ef444412', borderColor: '#ef444455' }}>
      <div className="flex items-start gap-3">
        <Icon name="Siren" size={24} style={{ color: RED, flexShrink: 0 }} />
        <div>
          <p className="text-base font-bold mb-1.5" style={{ color: RED }}>
            If you are in immediate danger
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#fca5a5' }}>
            Contact emergency services now.
            <br />
            This app does not replace emergency services.
            <br />
            ResponseLink OS™ is not monitored by emergency services.
          </p>
          <p className="text-xs mt-2 text-slate-500">
            In the UK: call 999. For non-emergency: 101 or your local support number.
          </p>
        </div>
      </div>
    </div>
  )
}

function SuccessBanner({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div className="rounded-2xl border px-4 py-3.5 flex items-center gap-3 mb-4"
         style={{ background: '#22c55e10', borderColor: '#22c55e40' }}>
      <Icon name="CheckCircle2" size={18} style={{ color: GREEN }} />
      <p className="text-sm font-semibold flex-1" style={{ color: GREEN }}>{message}</p>
      <button onClick={onDismiss}><Icon name="X" size={14} className="text-slate-600" /></button>
    </div>
  )
}

function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="rounded-2xl border px-4 py-3.5 flex items-center gap-3 mb-4"
         style={{ background: '#ef444410', borderColor: '#ef444440' }}>
      <Icon name="AlertCircle" size={18} style={{ color: RED }} />
      <p className="text-sm flex-1" style={{ color: '#fca5a5' }}>{message}</p>
      {onDismiss && <button onClick={onDismiss}><Icon name="X" size={14} className="text-slate-600" /></button>}
    </div>
  )
}

function SyncPill({ sync }) {
  if (!sync || sync.total === 0) return null
  const color = sync.failed > 0 ? RED : sync.pending > 0 ? AMBER : GREEN
  const label = sync.failed > 0 ? `${sync.failed} failed` :
                sync.pending > 0 ? `${sync.pending} pending` : 'Sent'
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
      <span className={`w-1.5 h-1.5 rounded-full ${sync.pending > 0 ? 'animate-pulse' : ''}`}
            style={{ background: color }} />
      {label}
    </span>
  )
}

// Input styles — large, accessible
const inputCls = "w-full bg-[#0d080d] border border-[#C9A84C25] rounded-2xl px-4 py-4 text-base text-white placeholder-slate-600 focus:outline-none focus:border-[#C9A84C60] transition-colors"
const labelCls = "block text-sm font-semibold text-slate-300 mb-2"

// ─── Large action button ──────────────────────────────────────
function BigActionBtn({ icon, label, sub, color, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full flex items-center gap-4 rounded-2xl border px-5 py-5 text-left transition-all
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110 active:scale-[0.98]'}`}
      style={{
        background: disabled ? '#ffffff05' : `${color}10`,
        borderColor: disabled ? '#ffffff15' : `${color}35`,
        minHeight: 72,
      }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
           style={{ background: `${color}18` }}>
        <Icon name={icon} size={22} style={{ color: disabled ? '#374151' : color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold" style={{ color: disabled ? '#374151' : 'white' }}>{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {!disabled && <Icon name="ChevronRight" size={18} className="text-slate-600 flex-shrink-0" />}
    </button>
  )
}

// ─── Profile Selector ─────────────────────────────────────────
function ProfileSelector({ users, currentId, onSelect, onClose, isDemo }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
         style={{ background: 'rgba(0,0,0,0.8)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl"
           style={{ background: '#0a050a', border: '1px solid #C9A84C30' }}>
        <div className="flex items-center justify-between px-5 py-5 border-b"
             style={{ borderColor: '#C9A84C20' }}>
          <h2 className="text-lg font-bold text-white">Choose Your Profile</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: '#ffffff10' }}>
            <Icon name="X" size={18} className="text-slate-400" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {!isDemo && (
            <AdvisoryBox color={PURPLE} icon="Zap"
              text="Live Mode is active. No service user profile is available yet. Connect a secure backend in a later setup run to enable real user accounts, authentication, and persistent records." />
          )}
          {isDemo && users.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500 mb-3">No demo profiles seeded yet.</p>
              <button onClick={() => { seedDemoData(); onClose() }}
                className="px-6 py-3 rounded-2xl text-sm font-bold"
                style={{ background: GREEN, color: '#000' }}>
                Seed Demo Data
              </button>
            </div>
          )}
          {users.map(su => {
            const disp = SU_STATUS_DISPLAY[su.wellbeingStatus] || { label: su.wellbeingStatus, color: SLATE, icon: 'User' }
            return (
              <button key={su.id} onClick={() => onSelect(su.id)}
                className="w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all hover:brightness-110"
                style={{
                  background: su.id === currentId ? '#C9A84C10' : CARD,
                  borderColor: su.id === currentId ? '#C9A84C45' : '#C9A84C20',
                }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                     style={{ background: `${PURPLE}15` }}>
                  <Icon name="User" size={22} style={{ color: PURPLE }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white">
                    {su.preferredName || su.displayName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {SUPPORT_TYPE_LABELS[su.supportType] || su.supportType}
                    {su.consentStatus === 'pending' ? ' · Consent pending' : ''}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Icon name={disp.icon} size={11} style={{ color: disp.color }} />
                    <span className="text-xs" style={{ color: disp.color }}>{disp.label}</span>
                  </div>
                </div>
                {su.id === currentId && <Icon name="Check" size={18} style={{ color: GREEN }} />}
              </button>
            )
          })}
        </div>
        <div className="px-5 pb-5">
          <AdvisoryBox compact color={GOLD} icon="ShieldAlert"
            text="Demo profiles only. No real personal data. Do not enter real service user information until a secure backend is configured." />
        </div>
      </div>
    </div>
  )
}

// ─── Screen: Home ─────────────────────────────────────────────
function HomeScreen({ su, missions, sync, isDemo, setScreen, onSelectProfile }) {
  const disp = su ? (SU_STATUS_DISPLAY[su.wellbeingStatus] || { label: 'Unknown', color: SLATE, icon: 'User' }) : null
  const linkedMission = missions[0] || null

  return (
    <div className="space-y-5">
      <LiveModeStatusPanel variant="serviceuser" compact={true} />
      {/* Profile card */}
      {su ? (
        <div className="rounded-2xl border p-5" style={{ background: CARD, borderColor: '#C9A84C28' }}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                   style={{ background: `${PURPLE}15`, border: `1px solid ${PURPLE}30` }}>
                <Icon name="User" size={26} style={{ color: PURPLE }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {su.preferredName ? `Hi, ${su.preferredName}` : su.displayName}
                </h2>
                <p className="text-xs text-slate-500">
                  {SUPPORT_TYPE_LABELS[su.supportType] || su.supportType}
                </p>
              </div>
            </div>
            <button onClick={onSelectProfile}
              className="text-xs px-3 py-1.5 rounded-xl"
              style={{ background: '#ffffff08', color: SLATE, border: '1px solid #ffffff15' }}>
              Switch
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 p-3 rounded-xl mb-3"
               style={{ background: `${disp.color}10`, border: `1px solid ${disp.color}25` }}>
            <Icon name={disp.icon} size={18} style={{ color: disp.color, flexShrink: 0 }} />
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: disp.color }}>
                {disp.label}
              </p>
              <p className="text-xs text-slate-500">
                Your current status
              </p>
            </div>
          </div>

          {/* Last check-in */}
          {su.lastCheckInAt && (
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <Icon name="Clock" size={12} />
              Last update: {timeAgo(su.lastCheckInAt)}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border p-6 text-center"
             style={{ background: CARD, borderColor: '#C9A84C22' }}>
          <Icon name="UserCircle" size={44} className="mx-auto mb-3 text-slate-700" />
          <p className="text-base font-bold text-white mb-1">Choose your profile</p>
          <p className="text-sm text-slate-600 mb-5">
            Select your support profile to get started.
          </p>
          <button onClick={onSelectProfile}
            className="w-full py-4 rounded-2xl text-base font-bold"
            style={{ background: GOLD, color: '#000' }}>
            Select Profile
          </button>
        </div>
      )}

      {/* Live mode notice */}
      {!isDemo && (
        <AdvisoryBox color={PURPLE} icon="Zap"
          text="Your organisation hasn't connected this app to a live system yet. You can use Demo Mode to see how it works. Do not enter real personal information until a secure system is set up." />
      )}

      {/* Upcoming visit */}
      {linkedMission && (
        <button onClick={() => setScreen(SCREEN.VISITS)}
          className="w-full rounded-2xl border p-5 text-left transition-all hover:brightness-110"
          style={{ background: `${PURPLE}08`, borderColor: `${PURPLE}30` }}>
          <div className="flex items-center gap-2 mb-2">
            <Icon name="Calendar" size={14} style={{ color: PURPLE }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: PURPLE }}>
              Upcoming Visit
            </span>
          </div>
          <h3 className="text-base font-bold text-white mb-1">{linkedMission.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {(() => {
              const st = getMissionStatusColor(linkedMission.status)
              return <Pill label={MISSION_STATUS_LABELS[linkedMission.status]} color={st.text} />
            })()}
            {linkedMission.scheduledTime && (
              <span className="text-xs text-slate-500">
                {formatDateTime(linkedMission.scheduledTime)}
              </span>
            )}
          </div>
          <p className="text-xs mt-2 text-slate-600">Tap to view or confirm this visit</p>
        </button>
      )}

      {/* Help request banner */}
      {su?.helpRequestStatus === 'support_requested' && (
        <div className="rounded-2xl border px-4 py-4 flex items-start gap-3"
             style={{ background: '#f59e0b10', borderColor: '#f59e0b35' }}>
          <Icon name="LifeBuoy" size={18} style={{ color: AMBER, flexShrink: 0 }} />
          <div>
            <p className="text-sm font-bold" style={{ color: AMBER }}>Support requested</p>
            <p className="text-xs text-slate-500 mt-0.5">Your support team has been notified. They will be in touch.</p>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 px-1">
          What would you like to do?
        </h3>
        <BigActionBtn icon="Heart" label="Wellbeing Check-in"
          sub="Let your support team know how you're doing"
          color={GREEN} disabled={!su}
          onClick={() => setScreen(SCREEN.WELLBEING)} />
        <BigActionBtn icon="LifeBuoy" label="I Need Help"
          sub="Request support from your team"
          color={AMBER} disabled={!su}
          onClick={() => setScreen(SCREEN.HELP)} />
        <BigActionBtn icon="CalendarCheck" label="Confirm or Change a Visit"
          sub="Confirm, decline or rearrange your visit"
          color={PURPLE} disabled={!su || !linkedMission}
          onClick={() => setScreen(SCREEN.VISIT_CONFIRM)} />
        <BigActionBtn icon="ClipboardList" label="Update Support Needs"
          sub="Tell us what kind of support you need"
          color={CYAN} disabled={!su}
          onClick={() => setScreen(SCREEN.SUPPORT_NEEDS)} />
        <BigActionBtn icon="ShieldAlert" label="Safety Concern"
          sub="Tell us if you feel unsafe"
          color={RED} disabled={!su}
          onClick={() => setScreen(SCREEN.SAFETY)} />
        <BigActionBtn icon="MessageSquare" label="Send an Update"
          sub="Send a message to your support team"
          color={SLATE} disabled={!su}
          onClick={() => setScreen(SCREEN.MESSAGE)} />
      </div>

      {/* Sync status */}
      <div className="rounded-2xl border px-4 py-4" style={{ background: CARD, borderColor: '#C9A84C18' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-500">Sync status</span>
          <SyncPill sync={sync} />
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          {sync.unhealthy > 0
            ? `${sync.pending} update${sync.pending !== 1 ? 's' : ''} waiting to sync. Your support team may not have seen them yet.`
            : sync.total > 0 ? 'Updates sent and visible to your support team locally.'
            : 'No updates sent yet.'}
        </p>
        {sync.unhealthy > 0 && (
          <p className="text-xs mt-2 leading-relaxed"
             style={{ color: '#fca5a5', background: '#ef444408', borderRadius: 8, padding: '6px 10px' }}>
            If you need urgent help or are in danger, contact emergency services or your support organisation directly — do not rely on this app alone.
          </p>
        )}
      </div>

      {/* Safety notice */}
      <AdvisoryBox icon="ShieldAlert" color={GOLD} large
        text="ResponseLink OS™ helps your support organisation receive updates. It is not monitored by emergency services. If you are in immediate danger, contact emergency services. Offline or pending updates may not be seen straight away." />
    </div>
  )
}

// ─── Screen: Visits ───────────────────────────────────────────
function VisitsScreen({ su, missions, setScreen, setActiveMission }) {
  if (!su) return (
    <AdvisoryBox color={PURPLE} icon="Zap" text="Please select a profile to view your visits." />
  )
  return (
    <div className="space-y-4">
      <AdvisoryBox compact color={PURPLE} icon="Calendar"
        text="Your visit information is shown below. Support notes and internal staff information are not shown here." />

      {missions.length === 0 ? (
        <div className="text-center py-10">
          <Icon name="Calendar" size={40} className="mx-auto mb-3 text-slate-700" style={{ opacity: 0.3 }} />
          <p className="text-base font-semibold text-white mb-1">No visits scheduled</p>
          <p className="text-sm text-slate-600">Your support team will let you know when a visit is arranged.</p>
        </div>
      ) : (
        missions.map(m => {
          const st = getMissionStatusColor(m.status)
          return (
            <div key={m.id} className="rounded-2xl border p-5"
                 style={{ background: CARD, borderColor: `${PURPLE}25` }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: `${PURPLE}15` }}>
                  <Icon name="Calendar" size={18} style={{ color: PURPLE }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white mb-1">
                    {MISSION_TYPE_LABELS[m.missionType] || m.missionType}
                  </h3>
                  <Pill label={MISSION_STATUS_LABELS[m.status]} color={st.text} />
                </div>
              </div>
              {[
                ['When', m.scheduledTime ? formatDateTime(m.scheduledTime) : '—'],
                ['Location', [m.locationLabel, m.area].filter(Boolean).join(', ') || '—'],
                ['Last updated', timeAgo(m.updatedAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-slate-800/30 last:border-0">
                  <span className="text-xs text-slate-500">{k}</span>
                  <span className="text-xs text-white">{v}</span>
                </div>
              ))}
              <button
                onClick={() => { setActiveMission(m); setScreen(SCREEN.VISIT_CONFIRM) }}
                className="w-full mt-4 py-3.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: `${PURPLE}20`, color: PURPLE, border: `1px solid ${PURPLE}35` }}>
                Confirm or Change this Visit
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── Screen: Wellbeing Check-in ───────────────────────────────
function WellbeingScreen({ su, missions, onBack, onSuccess }) {
  const [wellbeing,    setWellbeing]    = useState('')
  const [supportNeed,  setSupportNeed]  = useState('no_support_needed')
  const [message,      setMessage]      = useState('')
  const [result,       setResult]       = useState(null)
  const [saving,       setSaving]       = useState(false)

  const WELLBEING_OPTIONS = [
    { v: 'okay',         label: "I'm okay",             color: GREEN,  icon: 'Smile' },
    { v: 'unsure',       label: "I'm not sure",          color: AMBER,  icon: 'HelpCircle' },
    { v: 'need_support', label: "I need some support",   color: AMBER,  icon: 'LifeBuoy' },
    { v: 'worried',      label: "I'm worried",           color: '#f97316', icon: 'Frown' },
    { v: 'unsafe',       label: "I feel unsafe",         color: RED,    icon: 'AlertTriangle' },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!wellbeing) { setResult({ ok: false, error: 'Please tell us how you are feeling.' }); return }
    setSaving(true)
    const linkedMission = missions[0]
    const r = submitServiceUserWellbeingCheckIn({
      serviceUserId:   su.id,
      missionId:       linkedMission?.id || null,
      wellbeingStatus: wellbeing,
      message,
      supportNeed,
      needsReview:     wellbeing === 'unsafe' || wellbeing === 'worried',
    })
    setSaving(false)
    if (r.ok) {
      onSuccess("Your check-in has been sent to your support team.")
      onBack()
    } else {
      setResult({ ok: false, error: r.error })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AdvisoryBox color={GREEN} icon="Heart"
        text="Wellbeing check-ins help your support organisation understand your current situation. This app is not an emergency service. If you are in immediate danger, contact emergency services." />

      {/* Wellbeing selector */}
      <div>
        <label className={labelCls}>How are you feeling right now?</label>
        <div className="space-y-2">
          {WELLBEING_OPTIONS.map(opt => (
            <button key={opt.v} type="button"
              onClick={() => setWellbeing(opt.v)}
              className="w-full flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all"
              style={{
                background: wellbeing === opt.v ? `${opt.color}15` : CARD,
                borderColor: wellbeing === opt.v ? `${opt.color}55` : '#C9A84C20',
                minHeight: 60,
              }}>
              <Icon name={opt.icon} size={22} style={{ color: wellbeing === opt.v ? opt.color : '#374151', flexShrink: 0 }} />
              <span className="text-base font-semibold"
                    style={{ color: wellbeing === opt.v ? opt.color : '#94a3b8' }}>
                {opt.label}
              </span>
              {wellbeing === opt.v && <Icon name="Check" size={18} style={{ color: opt.color, marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Emergency warning */}
      {wellbeing === 'unsafe' && <EmergencyWarning />}

      {/* Support need */}
      <div>
        <label className={labelCls}>Do you need any support?</label>
        <select className={inputCls} value={supportNeed}
                onChange={e => setSupportNeed(e.target.value)}>
          {Object.entries(SUPPORT_NEED_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Optional message */}
      <div>
        <label className={labelCls}>Anything else you'd like to share? (optional)</label>
        <textarea className={inputCls} rows={3} value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="A brief note for your support team. Don't share anything you wouldn't want your support organisation to see." />
      </div>

      {result && !result.ok && <ErrorBanner message={result.error} onDismiss={() => setResult(null)} />}

      <button type="submit" disabled={saving || !wellbeing}
        className="w-full py-5 rounded-2xl text-base font-bold transition-all"
        style={{ background: wellbeing ? GREEN : '#374151', color: '#000', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Sending…' : 'Send Check-in'}
      </button>
    </form>
  )
}

// ─── Screen: I Need Help ──────────────────────────────────────
function HelpScreen({ su, missions, onBack, onSuccess }) {
  const [form, setForm] = useState({
    helpReason: '', urgency: 'routine', message: '',
    safeToContact: true, preferredContactMethod: 'phone',
  })
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)

  const URGENCY_OPTS = [
    { v: 'routine',         label: 'When available',   sub: 'No rush',               color: GREEN,  icon: 'Clock' },
    { v: 'soon',            label: 'Within a day',     sub: 'Please prioritise',      color: CYAN,   icon: 'Bell' },
    { v: 'urgent',          label: 'As soon as possible', sub: 'Urgent support needed', color: AMBER, icon: 'AlertTriangle' },
    { v: 'immediate_danger', label: 'Immediate danger', sub: 'Contact emergency services first', color: RED, icon: 'Siren' },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.helpReason) { setResult({ ok: false, error: 'Please tell us what kind of help you need.' }); return }
    setSaving(true)
    const r = submitServiceUserHelpRequest({
      serviceUserId:          su.id,
      missionId:              missions[0]?.id || null,
      helpReason:             form.helpReason,
      urgency:                form.urgency,
      message:                form.message,
      safeToContact:          form.safeToContact,
      preferredContactMethod: form.preferredContactMethod,
    })
    setSaving(false)
    if (r.ok) {
      onSuccess("Your request has been sent to your support team.")
      onBack()
    } else {
      setResult({ ok: false, error: r.error })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Emergency first — always shown */}
      <EmergencyWarning />

      <AdvisoryBox compact color={AMBER} icon="LifeBuoy"
        text="Your help request will be sent to your support team. This app is not monitored 24/7 without a live backend. If you need urgent help, also contact your support organisation directly." />

      {/* Urgency */}
      <div>
        <label className={labelCls}>How urgent is this?</label>
        <div className="space-y-2">
          {URGENCY_OPTS.map(opt => (
            <button key={opt.v} type="button"
              onClick={() => setForm(f => ({ ...f, urgency: opt.v }))}
              className="w-full flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all"
              style={{
                background: form.urgency === opt.v ? `${opt.color}15` : CARD,
                borderColor: form.urgency === opt.v ? `${opt.color}55` : '#C9A84C20',
                minHeight: 64,
              }}>
              <Icon name={opt.icon} size={20} style={{ color: form.urgency === opt.v ? opt.color : '#374151', flexShrink: 0 }} />
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: form.urgency === opt.v ? opt.color : '#94a3b8' }}>{opt.label}</p>
                <p className="text-xs text-slate-600">{opt.sub}</p>
              </div>
              {form.urgency === opt.v && <Icon name="Check" size={16} style={{ color: opt.color }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Emergency expanded warning */}
      {form.urgency === 'immediate_danger' && (
        <div className="rounded-2xl border-2 px-5 py-4"
             style={{ background: '#ef444418', borderColor: '#ef444460' }}>
          <p className="text-base font-bold mb-2" style={{ color: RED }}>
            ⚠ Contact emergency services now
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#fca5a5' }}>
            If you are in immediate danger, call 999 (UK) or your local emergency number.
            ResponseLink OS™ does not replace emergency services and is not monitored in real time.
          </p>
          <p className="text-xs mt-2 text-slate-600">
            Your request will still be sent to your support team, but do not wait — contact emergency services first.
          </p>
        </div>
      )}

      {/* Reason */}
      <div>
        <label className={labelCls}>What kind of help do you need?</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(HELP_REASON_LABELS).map(([v, l]) => (
            <button key={v} type="button"
              onClick={() => setForm(f => ({ ...f, helpReason: v }))}
              className="rounded-2xl border px-3 py-3.5 text-sm font-semibold text-left transition-all"
              style={{
                background: form.helpReason === v ? '#C9A84C15' : CARD,
                borderColor: form.helpReason === v ? '#C9A84C55' : '#C9A84C20',
                color: form.helpReason === v ? GOLD : '#64748b',
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className={labelCls}>Any details to share? (optional)</label>
        <textarea className={inputCls} rows={3} value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Tell your support team more about what you need." />
      </div>

      {/* Safe to contact */}
      <label className="flex items-start gap-3 cursor-pointer rounded-2xl border p-4"
             style={{ borderColor: '#C9A84C20', background: CARD }}>
        <input type="checkbox" checked={form.safeToContact}
               onChange={e => setForm(f => ({ ...f, safeToContact: e.target.checked }))}
               className="w-5 h-5 rounded accent-yellow-500 mt-0.5 flex-shrink-0" />
        <span className="text-sm text-slate-300 leading-relaxed">
          It is safe for my support team to contact me
        </span>
      </label>

      {/* Contact method */}
      <div>
        <label className={labelCls}>Best way to reach you</label>
        <select className={inputCls} value={form.preferredContactMethod}
                onChange={e => setForm(f => ({ ...f, preferredContactMethod: e.target.value }))}>
          {Object.entries(CONTACT_METHOD_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {result && !result.ok && <ErrorBanner message={result.error} onDismiss={() => setResult(null)} />}

      <button type="submit" disabled={saving}
        className="w-full py-5 rounded-2xl text-base font-bold"
        style={{ background: AMBER, color: '#000', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Sending…' : 'Send Help Request'}
      </button>
    </form>
  )
}

// ─── Screen: Visit Confirmation ───────────────────────────────
function VisitConfirmScreen({ su, missions, activeMission, onBack, onSuccess }) {
  const mission = activeMission || missions[0]
  const [status, setStatus]       = useState('')
  const [note, setNote]           = useState('')
  const [altTime, setAltTime]     = useState('')
  const [result, setResult]       = useState(null)
  const [saving, setSaving]       = useState(false)

  const OPTS = [
    { v: 'visit_confirmed',        label: 'Yes, confirm the visit',      icon: 'CalendarCheck', color: GREEN  },
    { v: 'visit_declined',         label: 'No, I can\'t make this visit', icon: 'CalendarX',     color: RED    },
    { v: 'rearrangement_requested', label: 'I\'d like to rearrange it',   icon: 'CalendarClock', color: AMBER  },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!status)   { setResult({ ok: false, error: 'Please choose an option.' }); return }
    if (!mission)  { setResult({ ok: false, error: 'No visit linked to your profile yet.' }); return }
    setSaving(true)
    const r = confirmServiceUserVisit({
      serviceUserId:            su.id,
      missionId:                mission.id,
      confirmationStatus:       status,
      note,
      preferredAlternativeTime: altTime || null,
    })
    setSaving(false)
    if (r.ok) {
      onSuccess("Your response has been sent to your support team.")
      onBack()
    } else {
      setResult({ ok: false, error: r.error })
    }
  }

  if (!mission) {
    return (
      <AdvisoryBox color={PURPLE} icon="Calendar"
        text="No visit is currently linked to your profile. Your support team will be in touch when a visit is arranged." />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Visit info */}
      <div className="rounded-2xl border p-5" style={{ background: CARD, borderColor: `${PURPLE}30` }}>
        <p className="text-xs font-semibold text-slate-500 mb-1">Your visit</p>
        <h3 className="text-base font-bold text-white mb-2">{MISSION_TYPE_LABELS[mission.missionType] || mission.missionType}</h3>
        {mission.scheduledTime && (
          <p className="text-sm text-slate-400 flex items-center gap-2">
            <Icon name="Clock" size={14} /> {formatDateTime(mission.scheduledTime)}
          </p>
        )}
        {(mission.locationLabel || mission.area) && (
          <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
            <Icon name="MapPin" size={14} /> {[mission.locationLabel, mission.area].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      <AdvisoryBox compact color={PURPLE} icon="Info"
        text="Your response will be sent to your support team. It does not automatically change the visit — your team will confirm any changes with you." />

      {/* Options */}
      <div>
        <label className={labelCls}>What would you like to do?</label>
        <div className="space-y-2">
          {OPTS.map(opt => (
            <button key={opt.v} type="button"
              onClick={() => setStatus(opt.v)}
              className="w-full flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all"
              style={{
                background: status === opt.v ? `${opt.color}15` : CARD,
                borderColor: status === opt.v ? `${opt.color}55` : '#C9A84C20',
                minHeight: 64,
              }}>
              <Icon name={opt.icon} size={20} style={{ color: status === opt.v ? opt.color : '#374151', flexShrink: 0 }} />
              <span className="text-base font-semibold"
                    style={{ color: status === opt.v ? opt.color : '#94a3b8' }}>{opt.label}</span>
              {status === opt.v && <Icon name="Check" size={16} style={{ color: opt.color, marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Alt time for rearrangement */}
      {status === 'rearrangement_requested' && (
        <div>
          <label className={labelCls}>Preferred alternative time (optional)</label>
          <input type="datetime-local" className={inputCls} value={altTime}
                 onChange={e => setAltTime(e.target.value)} />
        </div>
      )}

      {/* Note */}
      <div>
        <label className={labelCls}>Any message for your support team? (optional)</label>
        <textarea className={inputCls} rows={2} value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. 'I won't be in until afternoon'" />
      </div>

      {result && !result.ok && <ErrorBanner message={result.error} onDismiss={() => setResult(null)} />}

      <button type="submit" disabled={saving}
        className="w-full py-5 rounded-2xl text-base font-bold"
        style={{ background: PURPLE, color: 'white', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Sending…' : 'Send Response'}
      </button>
    </form>
  )
}

// ─── Screen: Support Needs ────────────────────────────────────
function SupportNeedsScreen({ su, onBack, onSuccess }) {
  const [form, setForm] = useState({
    supportNeed:        su?.supportType || '',
    contactMethod:      su?.contactMethod || 'phone',
    accessibilityNote:  '',
    generalNote:        '',
  })
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    const r = updateServiceUserSupportNeeds({
      serviceUserId:     su.id,
      supportNeed:       form.supportNeed || null,
      contactMethod:     form.contactMethod || null,
      accessibilityNote: form.accessibilityNote,
      generalNote:       form.generalNote,
    })
    setSaving(false)
    if (r.ok) {
      onSuccess("Your support needs have been updated.")
      onBack()
    } else {
      setResult({ ok: false, error: r.error })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AdvisoryBox compact color={CYAN} icon="ClipboardList"
        text="Telling us about your support needs helps us provide better support. We will only use this information to coordinate your care." />

      <div>
        <label className={labelCls}>What kind of support do you receive?</label>
        <select className={inputCls} value={form.supportNeed}
                onChange={e => setForm(f => ({ ...f, supportNeed: e.target.value }))}>
          <option value="">— No change —</option>
          {Object.entries(SUPPORT_NEED_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Best way for us to contact you</label>
        <select className={inputCls} value={form.contactMethod}
                onChange={e => setForm(f => ({ ...f, contactMethod: e.target.value }))}>
          {Object.entries(CONTACT_METHOD_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Accessibility or communication needs (optional)</label>
        <textarea className={inputCls} rows={2} value={form.accessibilityNote}
                  onChange={e => setForm(f => ({ ...f, accessibilityNote: e.target.value }))}
                  placeholder="e.g. 'I prefer text messages', 'I need more time to answer the door'" />
      </div>

      <div>
        <label className={labelCls}>Anything else we should know? (optional)</label>
        <textarea className={inputCls} rows={2} value={form.generalNote}
                  onChange={e => setForm(f => ({ ...f, generalNote: e.target.value }))}
                  placeholder="A short note for your support team." />
      </div>

      {result && !result.ok && <ErrorBanner message={result.error} onDismiss={() => setResult(null)} />}

      <button type="submit" disabled={saving}
        className="w-full py-5 rounded-2xl text-base font-bold"
        style={{ background: CYAN, color: '#000', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Updating…' : 'Update My Needs'}
      </button>
    </form>
  )
}

// ─── Screen: Safety Concern ───────────────────────────────────
function SafetyScreen({ su, missions, onBack, onSuccess }) {
  const [form, setForm] = useState({
    concernType: '', concernLevel: 'medium', message: '',
    safeToContact: true, preferredContactMethod: 'phone',
  })
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const isCritical = form.concernLevel === 'immediate_danger'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.concernType) { setResult({ ok: false, error: 'Please tell us what the concern is.' }); return }
    setSaving(true)
    const r = submitServiceUserSafetyConcern({
      serviceUserId:          su.id,
      missionId:              missions[0]?.id || null,
      concernType:            form.concernType,
      concernLevel:           form.concernLevel,
      message:                form.message,
      safeToContact:          form.safeToContact,
      preferredContactMethod: form.preferredContactMethod,
    })
    setSaving(false)
    if (r.ok) {
      onSuccess("Your concern has been sent to your support team for review.")
      onBack()
    } else {
      setResult({ ok: false, error: r.error })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <EmergencyWarning />

      <AdvisoryBox compact color={RED} icon="ShieldAlert"
        text="Your concern will be flagged for human review by your support team. This app does not make any decisions — a person will review your concern." />

      {/* Concern level */}
      <div>
        <label className={labelCls}>How serious is the concern?</label>
        <div className="space-y-2">
          {Object.entries(CONCERN_LEVEL_LABELS).map(([v, l]) => {
            const c = v === 'immediate_danger' ? RED : v === 'high' ? '#f97316' : v === 'medium' ? AMBER : GREEN
            return (
              <button key={v} type="button"
                onClick={() => setForm(f => ({ ...f, concernLevel: v }))}
                className="w-full flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all"
                style={{
                  background: form.concernLevel === v ? `${c}15` : CARD,
                  borderColor: form.concernLevel === v ? `${c}55` : '#C9A84C20',
                  minHeight: 60,
                }}>
                <span className="text-sm font-bold flex-1"
                      style={{ color: form.concernLevel === v ? c : '#94a3b8' }}>{l}</span>
                {form.concernLevel === v && <Icon name="Check" size={16} style={{ color: c }} />}
              </button>
            )
          })}
        </div>
      </div>

      {isCritical && (
        <div className="rounded-2xl border-2 px-5 py-4"
             style={{ background: '#ef444418', borderColor: '#ef444460' }}>
          <p className="text-base font-bold" style={{ color: RED }}>Contact emergency services now.</p>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: '#fca5a5' }}>
            Call 999 or your local emergency number. Do not wait for this app — it is not monitored by emergency services.
          </p>
        </div>
      )}

      {/* Concern type */}
      <div>
        <label className={labelCls}>What is the concern?</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(CONCERN_TYPE_LABELS).map(([v, l]) => (
            <button key={v} type="button"
              onClick={() => setForm(f => ({ ...f, concernType: v }))}
              className="rounded-2xl border px-3 py-4 text-sm font-semibold text-left transition-all"
              style={{
                background: form.concernType === v ? '#C9A84C15' : CARD,
                borderColor: form.concernType === v ? '#C9A84C55' : '#C9A84C20',
                color: form.concernType === v ? GOLD : '#64748b',
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className={labelCls}>Tell us more (optional)</label>
        <textarea className={inputCls} rows={3} value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Any details that help your support team understand the situation." />
      </div>

      {/* Safe to contact */}
      <label className="flex items-start gap-3 cursor-pointer rounded-2xl border p-4"
             style={{ borderColor: '#C9A84C20', background: CARD }}>
        <input type="checkbox" checked={form.safeToContact}
               onChange={e => setForm(f => ({ ...f, safeToContact: e.target.checked }))}
               className="w-5 h-5 rounded accent-yellow-500 mt-0.5 flex-shrink-0" />
        <span className="text-sm text-slate-300 leading-relaxed">
          It is safe for my support team to contact me
        </span>
      </label>

      {/* Contact method */}
      <div>
        <label className={labelCls}>Best way to reach you</label>
        <select className={inputCls} value={form.preferredContactMethod}
                onChange={e => setForm(f => ({ ...f, preferredContactMethod: e.target.value }))}>
          {Object.entries(CONTACT_METHOD_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {result && !result.ok && <ErrorBanner message={result.error} onDismiss={() => setResult(null)} />}

      <button type="submit" disabled={saving}
        className="w-full py-5 rounded-2xl text-base font-bold"
        style={{ background: RED, color: 'white', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Sending…' : 'Send Safety Concern'}
      </button>
    </form>
  )
}

// ─── Screen: Send Message ─────────────────────────────────────
function MessageScreen({ su, missions, onBack, onSuccess }) {
  const [form, setForm] = useState({
    subject: '', body: '', contactMethod: 'phone',
  })
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    const r = sendServiceUserMessage({
      serviceUserId:          su.id,
      missionId:              missions[0]?.id || null,
      subject:                form.subject,
      body:                   form.body,
      preferredContactMethod: form.contactMethod,
    })
    setSaving(false)
    if (r.ok) {
      onSuccess("Your message has been sent to your support team.")
      onBack()
    } else {
      setResult({ ok: false, error: r.error })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AdvisoryBox compact color={SLATE} icon="MessageSquare"
        text="Your message will be sent to your support team. This is not a real-time chat. Your team will read it when they are available." />

      <div>
        <label className={labelCls}>Subject (optional)</label>
        <input className={inputCls} value={form.subject}
               onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
               placeholder="e.g. 'Question about my visit'" />
      </div>

      <div>
        <label className={labelCls}>Your message *</label>
        <textarea className={inputCls} rows={5} required value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Write your message here." />
      </div>

      <div>
        <label className={labelCls}>Best way for us to reply</label>
        <select className={inputCls} value={form.contactMethod}
                onChange={e => setForm(f => ({ ...f, contactMethod: e.target.value }))}>
          {Object.entries(CONTACT_METHOD_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {result && !result.ok && <ErrorBanner message={result.error} onDismiss={() => setResult(null)} />}

      <button type="submit" disabled={saving}
        className="w-full py-5 rounded-2xl text-base font-bold"
        style={{ background: GOLD, color: '#000', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  )
}

// ─── Screen: Settings / Consent ───────────────────────────────
function SettingsScreen({ su, sync, isDemo }) {
  return (
    <div className="space-y-5">
      {/* Consent */}
      <div className="rounded-2xl border p-5" style={{ background: CARD, borderColor: '#C9A84C25' }}>
        <div className="flex items-center gap-2 mb-3">
          <Icon name="Shield" size={16} style={{ color: GOLD }} />
          <h3 className="text-base font-bold" style={{ color: GOLD }}>Consent & Data</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b border-slate-800/30">
            <span className="text-sm text-slate-400">Consent status</span>
            <span className="text-sm font-semibold text-white">
              {CONSENT_STATUS_LABELS[su?.consentStatus || 'not_configured']}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/30">
            <span className="text-sm text-slate-400">Contact preference</span>
            <span className="text-sm text-white">
              {CONTACT_METHOD_LABELS[su?.contactMethod] || '—'}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-slate-400">Data mode</span>
            <span className="text-sm font-semibold" style={{ color: isDemo ? GREEN : PURPLE }}>
              {isDemo ? 'Demo (no real data)' : 'Live mode'}
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-4 leading-relaxed">
          Consent and data protection settings must be configured properly before using ResponseLink OS™ with real service users.
          Full consent management is planned for a later setup run.
        </p>
      </div>

      {/* Sync */}
      <div className="rounded-2xl border p-5" style={{ background: CARD, borderColor: '#C9A84C18' }}>
        <div className="flex items-center gap-2 mb-3">
          <Icon name="CloudOff" size={16} style={{ color: AMBER }} />
          <h3 className="text-base font-bold text-white">Sync Status</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Sent',    value: sync.synced,  color: GREEN },
            { label: 'Waiting', value: sync.pending, color: AMBER },
            { label: 'Failed',  value: sync.failed,  color: RED   },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border p-3 text-center"
                 style={{ background: '#0a050a', borderColor: '#C9A84C15' }}>
              <div className="text-xl font-bold font-mono" style={{ color: value > 0 ? color : '#374151' }}>{value}</div>
              <div className="text-2xs text-slate-600">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-700 mt-3 leading-relaxed">
          Updates are stored locally first. Live sync with your support team's system will be available in a future setup run.
        </p>
      </div>

      {/* Safety notice */}
      <AdvisoryBox icon="ShieldAlert" color={GOLD} large
        text="ResponseLink OS™ is advisory and coordination-support software. It does not replace emergency services, safeguarding professionals, clinical judgement, or legal duties. If you are in immediate danger, contact emergency services." />

      {/* Notification placeholder */}
      <div className="rounded-2xl border px-4 py-4 flex items-center gap-3"
           style={{ background: '#ffffff05', borderColor: '#C9A84C15' }}>
        <Icon name="Bell" size={18} style={{ color: '#374151' }} />
        <div>
          <p className="text-sm font-semibold text-slate-600">Notifications</p>
          <p className="text-xs text-slate-700">Available in a later setup run.</p>
        </div>
      </div>

      <p className="text-center text-xs text-slate-700">
        ResponseLink OS™ · Service User PWA · Run 5<br />
        Powered by 4P3X Intelligent AI™ · Created by Kyzel Kreates™
      </p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function ServiceUserPWA() {
  const navigate = useNavigate()

  const [screen,       setScreenRaw]   = useState(SCREEN.HOME)
  const [suId,         setSuId]        = useState(getCurrentServiceUserId)
  const [su,           setSu]          = useState(null)
  const [missions,     setMissions]    = useState([])
  const [allUsers,     setAllUsers]    = useState([])
  const [sync,         setSync]        = useState({ pending: 0, failed: 0, offline: 0, synced: 0, total: 0, unhealthy: 0 })
  const [isDemo,       setIsDemo]      = useState(getDemoMode)
  const [successMsg,   setSuccessMsg]  = useState('')
  const [showSelector, setShowSelector] = useState(false)
  const [activeMission, setActiveMission] = useState(null)

  const SCREEN_TITLES = {
    [SCREEN.HOME]:          'Support App',
    [SCREEN.PROFILE]:       'Your Profile',
    [SCREEN.VISITS]:        'Your Visits',
    [SCREEN.WELLBEING]:     'Wellbeing Check-in',
    [SCREEN.HELP]:          'I Need Help',
    [SCREEN.VISIT_CONFIRM]: 'Visit Response',
    [SCREEN.SUPPORT_NEEDS]: 'Support Needs',
    [SCREEN.SAFETY]:        'Safety Concern',
    [SCREEN.MESSAGE]:       'Send an Update',
    [SCREEN.SETTINGS]:      'Settings & Consent',
  }

  const loadData = useCallback(() => {
    const dm  = getDemoMode()
    setIsDemo(dm)
    const id  = getCurrentServiceUserId()
    setSuId(id)
    const suRec = id ? getCurrentServiceUser() : null
    setSu(suRec)
    setMissions(id ? getLinkedMissionsForServiceUser(id) : [])
    setAllUsers(getAllServiceUsers())
    setSync(getSUSyncSummary())
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const setScreen = (s) => {
    setScreenRaw(s)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    if ([SCREEN.VISITS, SCREEN.WELLBEING, SCREEN.HELP, SCREEN.VISIT_CONFIRM,
         SCREEN.SUPPORT_NEEDS, SCREEN.SAFETY, SCREEN.MESSAGE, SCREEN.SETTINGS].includes(screen)) {
      setScreen(SCREEN.HOME)
      return
    }
    setScreen(SCREEN.HOME)
  }

  const handleSelectUser = (id) => {
    setCurrentServiceUserId(id)
    setSuId(id)
    setShowSelector(false)
    setTimeout(loadData, 50)
  }

  const handleSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(loadData, 50)
  }

  const sharedProps = { su, missions, onBack: goBack, onSuccess: handleSuccess, isDemo }

  return (
    <div className="min-h-full flex flex-col" style={{ background: BG }}>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3.5 border-b flex items-center gap-3"
           style={{ background: '#0a050a', borderColor: '#C9A84C20' }}>
        {screen !== SCREEN.HOME ? (
          <button onClick={goBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#ffffff08' }}>
            <Icon name="ChevronLeft" size={20} className="text-slate-400" />
          </button>
        ) : (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: `${PURPLE}15`, border: `1px solid ${PURPLE}30` }}>
            <Icon name="HeartHandshake" size={18} style={{ color: PURPLE }} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate" style={{ color: GOLD }}>
            {SCREEN_TITLES[screen]}
          </h1>
          <p className="text-2xs truncate" style={{ color: SLATE }}>
            ResponseLink OS™ · Support App
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
               style={{ background: isDemo ? '#22c55e12' : '#a855f712',
                        border: `1px solid ${isDemo ? '#22c55e30' : '#a855f730'}` }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: isDemo ? GREEN : PURPLE }} />
            <span className="text-2xs font-semibold" style={{ color: isDemo ? GREEN : PURPLE }}>
              {isDemo ? 'Demo' : 'Live'}
            </span>
          </div>

          <button onClick={() => setScreen(SCREEN.SETTINGS)}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#ffffff08' }} title="Settings">
            <Icon name="Settings" size={16} className="text-slate-500" />
          </button>

          <button onClick={() => navigate(ROUTES.DASHBOARD)}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#ffffff08' }} title="Command Dashboard">
            <Icon name="LayoutDashboard" size={15} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">
        {successMsg && (
          <SuccessBanner message={successMsg} onDismiss={() => setSuccessMsg('')} />
        )}

        {screen === SCREEN.HOME && (
          <HomeScreen
            su={su} missions={missions} sync={sync} isDemo={isDemo}
            setScreen={setScreen} onSelectProfile={() => setShowSelector(true)}
          />
        )}
        {screen === SCREEN.VISITS && (
          <VisitsScreen
            su={su} missions={missions} setScreen={setScreen}
            setActiveMission={setActiveMission}
          />
        )}
        {screen === SCREEN.WELLBEING    && <WellbeingScreen    {...sharedProps} />}
        {screen === SCREEN.HELP         && <HelpScreen         {...sharedProps} />}
        {screen === SCREEN.VISIT_CONFIRM && (
          <VisitConfirmScreen {...sharedProps} activeMission={activeMission} />
        )}
        {screen === SCREEN.SUPPORT_NEEDS && <SupportNeedsScreen {...sharedProps} />}
        {screen === SCREEN.SAFETY       && <SafetyScreen       {...sharedProps} />}
        {screen === SCREEN.MESSAGE      && <MessageScreen      {...sharedProps} />}
        {screen === SCREEN.SETTINGS     && (
          <SettingsScreen su={su} sync={sync} isDemo={isDemo} />
        )}

        {/* Footer */}
        <div className="mt-8 pt-5 border-t text-center" style={{ borderColor: '#C9A84C15' }}>
          <p className="text-2xs" style={{ color: '#374151' }}>
            ResponseLink OS™ · Service User PWA · Run 5
          </p>
          <p className="text-2xs mt-0.5" style={{ color: '#374151' }}>
            Powered by 4P3X Intelligent AI™ · Created by Kyzel Kreates™
          </p>
        </div>
      </div>

      {/* Profile selector */}
      {showSelector && (
        <ProfileSelector
          users={allUsers} currentId={suId}
          onSelect={handleSelectUser}
          onClose={() => setShowSelector(false)}
          isDemo={isDemo}
        />
      )}
    </div>
  )
}
