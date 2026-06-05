/**
 * ============================================================
 * ResponseLink OS™ — Dashboard Selectors & Mutations
 * /src/core/rlSelectors.js
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 3 — Command Dashboard and Mission Control
 *
 * All reads/writes go through core_rlData.js (SSOT).
 * No new storage keys. No duplicate state system.
 * No backend. No Supabase. No secrets.
 *
 * ⚠️  ADVISORY NOTICE:
 *   ResponseLink OS™ is advisory and coordination-support software.
 *   It does not replace emergency services, safeguarding professionals,
 *   clinical judgement, or legal duties.
 * ============================================================
 */

import {
  missionTable,
  responderTable,
  serviceUserTable,
  riskFlagTable,
  incidentTable,
  checkInTable,
  messageTable,
  evidenceTable,
  syncQueueTable,
  organisationTable,
  welfareVisitTable,
  getDemoMode,
  MISSION_STATUS,
  MISSION_TYPE,
  RISK_LEVEL,
  SYNC_STATUS,
  RESPONDER_STATUS,
  SERVICE_USER_STATUS,
  createSyncQueueItem,
} from './core_rlData'

// ─── Internal Helpers ─────────────────────────────────────────
const uid  = () => `rl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const now  = () => new Date().toISOString()

// ─── Read Selectors ───────────────────────────────────────────

/** All missions, filtered by demo mode */
export function getMissions() {
  const demo = getDemoMode()
  return demo ? missionTable.list() : missionTable.listLive()
}

/** Active missions (not draft, cancelled, completed) */
export function getActiveMissions() {
  const inactive = [MISSION_STATUS.DRAFT, MISSION_STATUS.CANCELLED, MISSION_STATUS.COMPLETED]
  return getMissions().filter(m => !inactive.includes(m.status))
}

/** Single mission by id */
export function getMissionById(id) {
  return missionTable.get(id)
}

/** All responders, filtered by demo mode */
export function getResponders() {
  const demo = getDemoMode()
  return demo ? responderTable.list() : responderTable.listLive()
}

/** Responder by id */
export function getResponderById(id) {
  return responderTable.get(id)
}

/** All service users, filtered by demo mode */
export function getServiceUsers() {
  const demo = getDemoMode()
  return demo ? serviceUserTable.list() : serviceUserTable.listLive()
}

/** Service user by id */
export function getServiceUserById(id) {
  return serviceUserTable.get(id)
}

/** All organisations, filtered by demo mode */
export function getOrganisations() {
  const demo = getDemoMode()
  return demo ? organisationTable.list() : organisationTable.listLive()
}

/** Open help requests */
export function getOpenHelpRequests() {
  return getServiceUsers().filter(su =>
    su.helpRequestStatus === 'support_requested' ||
    su.wellbeingStatus   === SERVICE_USER_STATUS.URGENT_HELP_REQUESTED ||
    su.wellbeingStatus   === SERVICE_USER_STATUS.SAFETY_CONCERN
  )
}

/** Overdue responder check-ins */
export function getOverdueResponderCheckIns() {
  return getResponders().filter(r =>
    r.status === RESPONDER_STATUS.OVERDUE ||
    r.status === RESPONDER_STATUS.CHECK_IN_DUE ||
    r.safetyStatus === 'check_in_overdue'
  )
}

/** Missed service user check-ins */
export function getMissedServiceUserCheckIns() {
  return getServiceUsers().filter(su =>
    su.wellbeingStatus === SERVICE_USER_STATUS.MISSED_CHECK_IN
  )
}

/** High and critical risk missions */
export function getHighRiskMissions() {
  return getMissions().filter(m =>
    m.riskLevel === RISK_LEVEL.HIGH || m.riskLevel === RISK_LEVEL.CRITICAL
  )
}

/** Open (unresolved) incidents */
export function getOpenIncidents() {
  const demo = getDemoMode()
  const list = demo ? incidentTable.list() : incidentTable.listLive()
  return list.filter(i => i.supervisorReviewStatus !== 'closed')
}

/** All risk flags filtered by demo mode */
export function getRiskFlags() {
  const demo = getDemoMode()
  return demo ? riskFlagTable.list() : riskFlagTable.listLive()
}

/** Open risk flags (not acknowledged/resolved) */
export function getOpenRiskFlags() {
  return getRiskFlags().filter(rf => rf.status === 'open')
}

/** Sync health summary */
export function getSyncHealth() {
  const demo = getDemoMode()
  const items = demo ? syncQueueTable.list() : syncQueueTable.listLive()
  const summary = {
    total: items.length,
    synced:  0, pending: 0, offline: 0,
    conflict: 0, failed: 0, needs_retry: 0,
    supervisor_review_required: 0,
  }
  items.forEach(i => {
    const s = i.syncStatus
    if (s === SYNC_STATUS.SYNCED)    summary.synced++
    else if (s === SYNC_STATUS.PENDING)  summary.pending++
    else if (s === SYNC_STATUS.OFFLINE)  summary.offline++
    else if (s === SYNC_STATUS.CONFLICT) summary.conflict++
    else if (s === SYNC_STATUS.FAILED)   summary.failed++
    else if (s === SYNC_STATUS.NEEDS_RETRY) summary.needs_retry++
    else if (s === SYNC_STATUS.SUPERVISOR_REVIEW_REQUIRED) summary.supervisor_review_required++
  })
  summary.unhealthy = summary.pending + summary.offline +
                      summary.conflict + summary.failed + summary.needs_retry
  return summary
}

/** Latest activity feed — composite from multiple tables, sorted desc */
export function getLatestActivity(limit = 20) {
  const demo = getDemoMode()

  const missions  = demo ? missionTable.list()  : missionTable.listLive()
  const checkIns  = demo ? checkInTable.list()  : checkInTable.listLive()
  const incidents = demo ? incidentTable.list() : incidentTable.listLive()
  const messages  = demo ? messageTable.list()  : messageTable.listLive()
  const evidence  = demo ? evidenceTable.list() : evidenceTable.listLive()

  const feed = []

  missions.slice(0, 8).forEach(m => feed.push({
    id:    `mission-${m.id}`,
    type:  'mission',
    icon:  'ClipboardList',
    color: '#C9A84C',
    title: m.title || 'Mission update',
    sub:   `Status: ${m.status?.replace(/_/g, ' ')}`,
    ts:    m.updatedAt || m.createdAt,
    demoRecord: m.demoRecord,
  }))

  checkIns.slice(0, 6).forEach(ci => feed.push({
    id:    `checkin-${ci.id}`,
    type:  'check_in',
    icon:  'CheckSquare',
    color: '#22c55e',
    title: `Check-in — ${ci.checkInType?.replace(/_/g, ' ')}`,
    sub:   ci.message?.slice(0, 60) || '',
    ts:    ci.createdAt,
    demoRecord: ci.demoRecord,
  }))

  incidents.slice(0, 4).forEach(inc => feed.push({
    id:    `incident-${inc.id}`,
    type:  'incident',
    icon:  'AlertOctagon',
    color: '#ef4444',
    title: inc.title || 'Incident',
    sub:   `${inc.severity || ''} · ${inc.category?.replace(/_/g, ' ')}`,
    ts:    inc.createdAt,
    demoRecord: inc.demoRecord,
  }))

  messages.slice(0, 4).forEach(msg => feed.push({
    id:    `message-${msg.id}`,
    type:  'message',
    icon:  'MessageSquare',
    color: '#a855f7',
    title: msg.subject || 'Message',
    sub:   msg.body?.slice(0, 60) || '',
    ts:    msg.createdAt,
    demoRecord: msg.demoRecord,
  }))

  evidence.slice(0, 4).forEach(ev => feed.push({
    id:    `evidence-${ev.id}`,
    type:  'evidence',
    icon:  'FileText',
    color: '#64748b',
    title: ev.title || 'Evidence record',
    sub:   `${ev.recordType?.replace(/_/g, ' ')}`,
    ts:    ev.createdAt,
    demoRecord: ev.demoRecord,
  }))

  return feed
    .filter(f => demo ? true : !f.demoRecord)
    .sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
    .slice(0, limit)
}

/** Overview metric summary for KPI cards */
export function getDashboardMetrics() {
  const missions   = getMissions()
  const responders = getResponders()
  const sus        = getServiceUsers()
  const incidents  = getOpenIncidents()
  const flags      = getOpenRiskFlags()
  const sync       = getSyncHealth()

  return {
    activeMissions:       getActiveMissions().length,
    respondersAvailable:  responders.filter(r => r.status === RESPONDER_STATUS.AVAILABLE).length,
    respondersOverdue:    getOverdueResponderCheckIns().length,
    serviceUsersStable:   sus.filter(su => su.wellbeingStatus === SERVICE_USER_STATUS.STABLE ||
                                           su.wellbeingStatus === SERVICE_USER_STATUS.CHECK_IN_RECEIVED).length,
    helpRequestsOpen:     getOpenHelpRequests().length,
    missedCheckIns:       getMissedServiceUserCheckIns().length,
    incidentsOpen:        incidents.length,
    highCriticalRisk:     getHighRiskMissions().length,
    syncUnhealthy:        sync.unhealthy,
    syncPending:          sync.pending,
    syncOffline:          sync.offline,
    syncFailed:           sync.failed,
    totalMissions:        missions.length,
    totalResponders:      responders.length,
    totalServiceUsers:    sus.length,
    openRiskFlags:        flags.length,
  }
}

// ─── Mutations (write through SSOT) ──────────────────────────

/**
 * createMission(data)
 * Creates a mission through the SSOT missionTable.
 * Automatically sets demoRecord based on current mode.
 * Also adds a sync queue item.
 */
export function createMission(data) {
  const isDemo = getDemoMode()
  const mission = missionTable.create({
    organisationId:      data.organisationId   || null,
    title:               data.title            || 'Untitled Mission',
    missionType:         data.missionType      || MISSION_TYPE.WELFARE_CHECK,
    priority:            data.priority         || 'routine',
    riskLevel:           data.riskLevel        || RISK_LEVEL.LOW,
    assignedResponderId: data.assignedResponderId || null,
    linkedServiceUserId: data.linkedServiceUserId || null,
    locationLabel:       data.locationLabel    || '',
    area:                data.area             || '',
    scheduledTime:       data.scheduledTime    || null,
    dueTime:             data.dueTime          || null,
    checkInRequired:     data.checkInRequired  !== false,
    checklistTemplateId: null,
    safetyNotes:         data.safetyNotes      || '',
    caseNotes:           data.caseNotes        || '',
    status:              data.status           || MISSION_STATUS.DRAFT,
    escalationState:     null,
    completionOutcome:   null,
    evidenceRecordIds:   [],
    demoRecord:          isDemo,
    createdAt:           now(),
    updatedAt:           now(),
  })

  // Update assigned responder's currentMissionId
  if (mission.assignedResponderId) {
    try {
      responderTable.update(mission.assignedResponderId, {
        currentMissionId: mission.id,
        status: RESPONDER_STATUS.ASSIGNED,
      })
    } catch {}
  }

  // Queue for sync
  createSyncQueueItem('mission', mission.id, 'create', { title: mission.title }, isDemo)

  return mission
}

/**
 * updateMission(id, data)
 * Updates mission fields through SSOT.
 */
export function updateMission(id, data) {
  const updated = missionTable.update(id, { ...data, updatedAt: now() })
  const isDemo = getDemoMode()
  createSyncQueueItem('mission', id, 'update', { status: updated.status }, isDemo)
  return updated
}

/**
 * updateMissionStatus(id, status)
 * Updates only the status field.
 */
export function updateMissionStatus(id, status) {
  return updateMission(id, { status })
}

/**
 * assignResponderToMission(missionId, responderId)
 * Links a responder to a mission in SSOT.
 */
export function assignResponderToMission(missionId, responderId) {
  const mission = updateMission(missionId, { assignedResponderId: responderId })
  if (responderId) {
    try {
      responderTable.update(responderId, {
        currentMissionId: missionId,
        status: RESPONDER_STATUS.ASSIGNED,
      })
    } catch {}
  }
  return mission
}

/**
 * linkServiceUserToMission(missionId, serviceUserId)
 * Links a service user to a mission in SSOT.
 */
export function linkServiceUserToMission(missionId, serviceUserId) {
  return updateMission(missionId, { linkedServiceUserId: serviceUserId })
}

// ─── Label helpers ────────────────────────────────────────────

export const MISSION_TYPE_LABELS = {
  welfare_check:                'Welfare Check',
  outreach_visit:               'Outreach Visit',
  supply_delivery:              'Supply Delivery',
  follow_up_visit:              'Follow-Up Visit',
  safety_check:                 'Safety Check',
  incident_response:            'Incident Response',
  volunteer_task:               'Volunteer Task',
  vulnerable_person_support:    'Vulnerable Person Support',
  community_support_assignment: 'Community Support',
}

export const MISSION_STATUS_LABELS = {
  draft:                   'Draft',
  scheduled:               'Scheduled',
  assigned:                'Assigned',
  travelling:              'Travelling',
  arrived:                 'Arrived',
  in_progress:             'In Progress',
  check_in_due:            'Check-In Due',
  overdue:                 'Overdue',
  escalating:              'Escalating',
  completed:               'Completed',
  cancelled:               'Cancelled',
  needs_supervisor_review: 'Supervisor Review',
}

export const RISK_LEVEL_LABELS = {
  low:      'Low',
  medium:   'Medium',
  high:     'High',
  critical: 'Critical',
}

export const PRIORITY_LABELS = {
  routine:  'Routine',
  medium:   'Medium',
  high:     'High',
  urgent:   'Urgent',
}

export const RESPONDER_STATUS_LABELS = {
  available:               'Available',
  assigned:                'Assigned',
  travelling:              'Travelling',
  arrived:                 'Arrived',
  active_visit:            'Active Visit',
  check_in_due:            'Check-In Due',
  overdue:                 'Overdue',
  escalating:              'Escalating',
  completed:               'Completed',
  offline:                 'Offline',
  needs_supervisor_review: 'Supervisor Review',
}

export const SU_STATUS_LABELS = {
  stable:                  'Stable',
  check_in_received:       'Check-In Received',
  support_requested:       'Support Requested',
  missed_check_in:         'Missed Check-In',
  visit_confirmed:         'Visit Confirmed',
  visit_declined:          'Visit Declined',
  wellbeing_concern:       'Wellbeing Concern',
  safety_concern:          'Safety Concern',
  urgent_help_requested:   'Urgent Help',
  offline:                 'Offline',
  needs_follow_up:         'Needs Follow-Up',
  needs_supervisor_review: 'Supervisor Review',
}

/** Get status colour tokens for missions */
export function getMissionStatusColor(status) {
  const map = {
    draft:                   { text: '#64748b', bg: '#64748b15', border: '#64748b30' },
    scheduled:               { text: '#a855f7', bg: '#a855f715', border: '#a855f730' },
    assigned:                { text: '#3b82f6', bg: '#3b82f615', border: '#3b82f630' },
    travelling:              { text: '#06b6d4', bg: '#06b6d415', border: '#06b6d430' },
    arrived:                 { text: '#22c55e', bg: '#22c55e15', border: '#22c55e30' },
    in_progress:             { text: '#C9A84C', bg: '#C9A84C15', border: '#C9A84C30' },
    check_in_due:            { text: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b30' },
    overdue:                 { text: '#ef4444', bg: '#ef444415', border: '#ef444430' },
    escalating:              { text: '#ef4444', bg: '#ef444415', border: '#ef444430' },
    completed:               { text: '#22c55e', bg: '#22c55e10', border: '#22c55e20' },
    cancelled:               { text: '#374151', bg: '#37415115', border: '#37415130' },
    needs_supervisor_review: { text: '#ef4444', bg: '#ef444415', border: '#ef444430' },
  }
  return map[status] || { text: '#A8A9AD', bg: '#A8A9AD15', border: '#A8A9AD30' }
}

/** Get colour tokens for risk levels */
export function getRiskLevelColor(level) {
  const map = {
    low:      { text: '#22c55e', bg: '#22c55e15', border: '#22c55e30' },
    medium:   { text: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b30' },
    high:     { text: '#f97316', bg: '#f9731615', border: '#f9731630' },
    critical: { text: '#ef4444', bg: '#ef444415', border: '#ef444430' },
  }
  return map[level] || { text: '#A8A9AD', bg: '#A8A9AD15', border: '#A8A9AD30' }
}

/** Get colour tokens for responder status */
export function getResponderStatusColor(status) {
  const map = {
    available:               { text: '#22c55e', dot: 'bg-green-400' },
    assigned:                { text: '#3b82f6', dot: 'bg-blue-400' },
    travelling:              { text: '#06b6d4', dot: 'bg-cyan-400' },
    arrived:                 { text: '#a855f7', dot: 'bg-purple-400' },
    active_visit:            { text: '#C9A84C', dot: 'bg-yellow-400' },
    check_in_due:            { text: '#f59e0b', dot: 'bg-amber-400 animate-pulse' },
    overdue:                 { text: '#ef4444', dot: 'bg-red-400 animate-pulse' },
    escalating:              { text: '#ef4444', dot: 'bg-red-500 animate-ping' },
    completed:               { text: '#22c55e', dot: 'bg-green-400' },
    offline:                 { text: '#374151', dot: 'bg-slate-600' },
    needs_supervisor_review: { text: '#ef4444', dot: 'bg-red-400' },
  }
  return map[status] || { text: '#A8A9AD', dot: 'bg-slate-600' }
}

/** Get colour tokens for service user wellbeing status */
export function getSUStatusColor(status) {
  const map = {
    stable:                  { text: '#22c55e', bg: '#22c55e15' },
    check_in_received:       { text: '#3b82f6', bg: '#3b82f615' },
    support_requested:       { text: '#f59e0b', bg: '#f59e0b15' },
    missed_check_in:         { text: '#f97316', bg: '#f9731615' },
    visit_confirmed:         { text: '#a855f7', bg: '#a855f715' },
    visit_declined:          { text: '#64748b', bg: '#64748b15' },
    wellbeing_concern:       { text: '#f59e0b', bg: '#f59e0b15' },
    safety_concern:          { text: '#ef4444', bg: '#ef444415' },
    urgent_help_requested:   { text: '#ef4444', bg: '#ef444415' },
    offline:                 { text: '#374151', bg: '#37415115' },
    needs_follow_up:         { text: '#C9A84C', bg: '#C9A84C15' },
    needs_supervisor_review: { text: '#ef4444', bg: '#ef444415' },
  }
  return map[status] || { text: '#A8A9AD', bg: '#A8A9AD15' }
}

/** Relative time formatter */
export function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default {
  getMissions, getActiveMissions, getMissionById,
  getResponders, getResponderById,
  getServiceUsers, getServiceUserById,
  getOrganisations,
  getOpenHelpRequests, getOverdueResponderCheckIns, getMissedServiceUserCheckIns,
  getHighRiskMissions, getOpenIncidents, getRiskFlags, getOpenRiskFlags,
  getSyncHealth, getLatestActivity, getDashboardMetrics,
  createMission, updateMission, updateMissionStatus,
  assignResponderToMission, linkServiceUserToMission,
  MISSION_TYPE_LABELS, MISSION_STATUS_LABELS, RISK_LEVEL_LABELS,
  PRIORITY_LABELS, RESPONDER_STATUS_LABELS, SU_STATUS_LABELS,
  getMissionStatusColor, getRiskLevelColor, getResponderStatusColor, getSUStatusColor,
  timeAgo,
}
