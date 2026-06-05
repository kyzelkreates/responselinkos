/**
 * ============================================================
 * ResponseLink OS™ — Local-First Sync Engine
 * /src/core/rlSyncEngine.js
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 6 — Dashboard-to-PWA Sync Simulation
 *
 * LOCAL-FIRST SIMULATION ONLY.
 * No backend. No Supabase. No Firebase. No AWS. No secrets.
 * No real cloud sync. No authentication bypass.
 *
 * This engine manages sync events between:
 *   - Command Dashboard
 *   - Responder PWA
 *   - Service User PWA
 *   through the shared SSOT localStorage layer.
 *
 * All reads/writes go through core_rlData.js tables.
 * No new storage keys except existing syncQueue key.
 *
 * ⚠️  ADVISORY NOTICE:
 *   ResponseLink OS™ is advisory and coordination-support software.
 *   It does not replace emergency services, safeguarding professionals,
 *   clinical judgement, or legal duties.
 * ============================================================
 */

import {
  syncQueueTable,
  missionTable,
  responderTable,
  serviceUserTable,
  checkInTable,
  messageTable,
  riskFlagTable,
  incidentTable,
  evidenceTable,
  getDemoMode,
  SYNC_STATUS,
  RISK_LEVEL,
  SERVICE_USER_STATUS,
  RESPONDER_STATUS,
} from './core_rlData'

// ─── Internal helpers ─────────────────────────────────────────
const now    = () => new Date().toISOString()
const uid    = () => `sync-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
const isDemo = () => getDemoMode()

// ─── Surface / Action constants ───────────────────────────────
export const SOURCE_SURFACE = {
  COMMAND_DASHBOARD: 'command_dashboard',
  RESPONDER_PWA:     'responder_pwa',
  SERVICE_USER_PWA:  'service_user_pwa',
  SYSTEM:            'system',
}

export const TARGET_SURFACE = {
  COMMAND_DASHBOARD: 'command_dashboard',
  RESPONDER_PWA:     'responder_pwa',
  SERVICE_USER_PWA:  'service_user_pwa',
  SHARED_STATE:      'shared_state',
  BACKEND_FUTURE:    'backend_future',
}

export const SYNC_ACTION = {
  MISSION_CREATED:                'mission_created',
  MISSION_ASSIGNED:               'mission_assigned',
  MISSION_UPDATED:                'mission_updated',
  RESPONDER_STATUS_UPDATED:       'responder_status_updated',
  RESPONDER_CHECK_IN_SUBMITTED:   'responder_check_in_submitted',
  WELFARE_CHECKLIST_SAVED:        'welfare_checklist_saved',
  RESPONDER_NOTE_ADDED:           'responder_note_added',
  RISK_FLAG_CREATED:              'risk_flag_created',
  INCIDENT_REPORTED:              'incident_reported',
  ESCALATION_REQUESTED:           'escalation_requested',
  SERVICE_USER_CHECK_IN_SUBMITTED:'service_user_check_in_submitted',
  SERVICE_USER_HELP_REQUESTED:    'service_user_help_requested',
  VISIT_CONFIRMED:                'visit_confirmed',
  VISIT_DECLINED:                 'visit_declined',
  SUPPORT_NEEDS_UPDATED:          'support_needs_updated',
  SAFETY_CONCERN_SUBMITTED:       'safety_concern_submitted',
  MESSAGE_SENT:                   'message_sent',
  SYNC_RETRY_REQUESTED:           'sync_retry_requested',
  SUPERVISOR_REVIEW_REQUIRED:     'supervisor_review_required',
}

// ─── Core sync event creator ──────────────────────────────────

/**
 * createSyncEvent({ entityType, entityId, sourceSurface, targetSurface, action, payload, syncStatus })
 * Creates a rich sync queue item with full surface + action metadata.
 * Returns the created sync queue item.
 */
export function createSyncEvent({
  entityType, entityId,
  sourceSurface = SOURCE_SURFACE.SYSTEM,
  targetSurface = TARGET_SURFACE.SHARED_STATE,
  action,
  payload = {},
  syncStatus = SYNC_STATUS.PENDING,
}) {
  const demo = isDemo()
  const ts   = now()
  return syncQueueTable.create({
    entityType,
    entityId:      entityId || uid(),
    sourceSurface,
    targetSurface,
    action,
    payload,
    syncStatus,
    attempts:      0,
    lastAttemptAt: null,
    errorMessage:  null,
    demoRecord:    demo,
    createdAt:     ts,
    updatedAt:     ts,
  })
}

// ─── Sync status mutators ─────────────────────────────────────

export function markSyncEventSynced(syncItemId) {
  return syncQueueTable.update(syncItemId, {
    syncStatus:    SYNC_STATUS.SYNCED,
    lastAttemptAt: now(),
    errorMessage:  null,
    updatedAt:     now(),
  })
}

export function markSyncEventFailed(syncItemId, errorMessage = 'Sync failed') {
  const item = syncQueueTable.get(syncItemId)
  return syncQueueTable.update(syncItemId, {
    syncStatus:    SYNC_STATUS.FAILED,
    lastAttemptAt: now(),
    errorMessage,
    attempts:      (item?.attempts || 0) + 1,
    updatedAt:     now(),
  })
}

export function markSyncEventOffline(syncItemId) {
  return syncQueueTable.update(syncItemId, {
    syncStatus:    SYNC_STATUS.OFFLINE,
    lastAttemptAt: now(),
    errorMessage:  'No network connection — queued for when connection is restored.',
    updatedAt:     now(),
  })
}

export function markSyncEventConflict(syncItemId, errorMessage = 'Conflict detected. Human review required.') {
  return syncQueueTable.update(syncItemId, {
    syncStatus:    SYNC_STATUS.CONFLICT,
    lastAttemptAt: now(),
    errorMessage,
    updatedAt:     now(),
  })
}

export function markSyncEventNeedsRetry(syncItemId) {
  const item = syncQueueTable.get(syncItemId)
  return syncQueueTable.update(syncItemId, {
    syncStatus:    SYNC_STATUS.NEEDS_RETRY,
    lastAttemptAt: now(),
    attempts:      (item?.attempts || 0) + 1,
    updatedAt:     now(),
  })
}

export function markSyncEventSupervisorReview(syncItemId) {
  return syncQueueTable.update(syncItemId, {
    syncStatus:    SYNC_STATUS.SUPERVISOR_REVIEW_REQUIRED,
    lastAttemptAt: now(),
    errorMessage:  'Supervisor review required before this record is treated as final.',
    updatedAt:     now(),
  })
}

/**
 * retrySyncEvent(syncItemId)
 * Moves a failed/needs_retry/offline item back to pending.
 * Does NOT delete the record.
 */
export function retrySyncEvent(syncItemId) {
  const item = syncQueueTable.get(syncItemId)
  if (!item) return null
  const retriable = [SYNC_STATUS.FAILED, SYNC_STATUS.NEEDS_RETRY, SYNC_STATUS.OFFLINE]
  if (!retriable.includes(item.syncStatus)) return item
  return syncQueueTable.update(syncItemId, {
    syncStatus:    SYNC_STATUS.PENDING,
    errorMessage:  null,
    updatedAt:     now(),
  })
}

// ─── Queue reads ──────────────────────────────────────────────

function _getSyncItems() {
  const demo = isDemo()
  return demo ? syncQueueTable.list() : syncQueueTable.listLive()
}

export function getSyncQueueSummary() {
  const items = _getSyncItems()
  const byStatus = { synced: 0, pending: 0, offline: 0, conflict: 0, failed: 0, needs_retry: 0, supervisor_review_required: 0 }
  const bySource = { command_dashboard: 0, responder_pwa: 0, service_user_pwa: 0, system: 0 }
  items.forEach(i => {
    if (byStatus[i.syncStatus] !== undefined) byStatus[i.syncStatus]++
    else byStatus.pending++
    if (i.sourceSurface && bySource[i.sourceSurface] !== undefined) bySource[i.sourceSurface]++
  })
  return {
    total:   items.length,
    ...byStatus,
    bySource,
    unhealthy: byStatus.pending + byStatus.offline + byStatus.conflict + byStatus.failed + byStatus.needs_retry,
  }
}

export function getPendingSyncItems(limit = 20) {
  return _getSyncItems()
    .filter(i => i.syncStatus === SYNC_STATUS.PENDING || i.syncStatus === SYNC_STATUS.OFFLINE)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
}

export function getFailedSyncItems(limit = 20) {
  return _getSyncItems()
    .filter(i => i.syncStatus === SYNC_STATUS.FAILED || i.syncStatus === SYNC_STATUS.NEEDS_RETRY)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit)
}

export function getConflictSyncItems(limit = 20) {
  return _getSyncItems()
    .filter(i => i.syncStatus === SYNC_STATUS.CONFLICT)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit)
}

export function getSupervisorReviewItems(limit = 20) {
  return _getSyncItems()
    .filter(i => i.syncStatus === SYNC_STATUS.SUPERVISOR_REVIEW_REQUIRED)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
}

export function getLatestSyncedActivity(limit = 30) {
  const items = _getSyncItems()
  return items
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, limit)
}

// ─── Propagation helpers ──────────────────────────────────────

/**
 * propagateMissionAssignment(missionId)
 * Creates sync events when dashboard assigns a mission.
 * Updates mission + responder + service user as needed.
 */
export function propagateMissionAssignment(missionId) {
  const mission = missionTable.get(missionId)
  if (!mission) return { ok: false, error: 'Mission not found' }

  const demo = isDemo()
  const ts   = now()

  // Sync event: dashboard → responder_pwa
  const evResp = createSyncEvent({
    entityType:    'mission',
    entityId:      missionId,
    sourceSurface: SOURCE_SURFACE.COMMAND_DASHBOARD,
    targetSurface: TARGET_SURFACE.RESPONDER_PWA,
    action:        SYNC_ACTION.MISSION_ASSIGNED,
    payload: {
      missionTitle:       mission.title,
      assignedResponderId: mission.assignedResponderId,
      riskLevel:          mission.riskLevel,
      scheduledTime:      mission.scheduledTime,
    },
    syncStatus: SYNC_STATUS.SYNCED, // local-first: immediately visible
  })

  // Sync event: dashboard → service_user_pwa (if linked)
  let evSU = null
  if (mission.linkedServiceUserId) {
    evSU = createSyncEvent({
      entityType:    'mission',
      entityId:      missionId,
      sourceSurface: SOURCE_SURFACE.COMMAND_DASHBOARD,
      targetSurface: TARGET_SURFACE.SERVICE_USER_PWA,
      action:        SYNC_ACTION.MISSION_ASSIGNED,
      payload: {
        missionType:   mission.missionType,
        scheduledTime: mission.scheduledTime,
        locationLabel: mission.locationLabel,
      },
      syncStatus: SYNC_STATUS.SYNCED,
    })
  }

  // Update responder's currentMissionId if assigned
  if (mission.assignedResponderId) {
    try {
      responderTable.update(mission.assignedResponderId, {
        currentMissionId: missionId,
        status:           RESPONDER_STATUS.ASSIGNED,
        updatedAt:        ts,
      })
    } catch {}
  }

  return { ok: true, syncEvents: [evResp, evSU].filter(Boolean) }
}

/**
 * propagateResponderUpdate({ missionId, responderId, action, payload })
 * Called after any responder action — creates a sync event from responder_pwa → command_dashboard.
 */
export function propagateResponderUpdate({ missionId, responderId, action, payload = {} }) {
  const demo = isDemo()
  return createSyncEvent({
    entityType:    'responder_update',
    entityId:      missionId || responderId || uid(),
    sourceSurface: SOURCE_SURFACE.RESPONDER_PWA,
    targetSurface: TARGET_SURFACE.COMMAND_DASHBOARD,
    action,
    payload,
    syncStatus: SYNC_STATUS.SYNCED, // local-first: shared state is immediately readable
  })
}

/**
 * propagateServiceUserUpdate({ serviceUserId, missionId, action, payload })
 * Called after any service user action — creates a sync event from service_user_pwa → command_dashboard.
 */
export function propagateServiceUserUpdate({ serviceUserId, missionId, action, payload = {} }) {
  const demo = isDemo()
  return createSyncEvent({
    entityType:    'service_user_update',
    entityId:      serviceUserId || missionId || uid(),
    sourceSurface: SOURCE_SURFACE.SERVICE_USER_PWA,
    targetSurface: TARGET_SURFACE.COMMAND_DASHBOARD,
    action,
    payload,
    syncStatus: SYNC_STATUS.SYNCED,
  })
}

// ─── Risk recalculation ───────────────────────────────────────

/**
 * recalculateMissionRisk(missionId)
 * Reads current state and returns an advisory risk summary.
 * Does NOT make safeguarding decisions. Advisory prompts only.
 */
export function recalculateMissionRisk(missionId) {
  const mission  = missionTable.get(missionId)
  if (!mission) return null

  const flags    = riskFlagTable.list().filter(f => f.missionId === missionId && f.status === 'open')
  const incidents = incidentTable.list().filter(i => i.missionId === missionId && i.supervisorReviewStatus === 'pending')
  const checks   = checkInTable.list().filter(c => c.missionId === missionId)
  const lastCheck = checks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]

  const hasHighRisk = flags.some(f => f.riskLevel === RISK_LEVEL.HIGH || f.riskLevel === RISK_LEVEL.CRITICAL)
  const hasOpenIncidents = incidents.length > 0
  const isOverdue = mission.dueTime && new Date(mission.dueTime) < new Date() && mission.status !== 'completed'
  const missedCheckIn = !lastCheck && mission.checkInRequired

  const advisoryFlags = []
  if (hasHighRisk)      advisoryFlags.push('High/critical risk flag open — supervisor review required')
  if (hasOpenIncidents) advisoryFlags.push('Open incident pending supervisor review')
  if (isOverdue)        advisoryFlags.push('Mission is overdue')
  if (missedCheckIn)    advisoryFlags.push('Check-in required but not received')

  return {
    missionId,
    missionStatus: mission.status,
    riskLevel:     mission.riskLevel,
    openFlagCount: flags.length,
    openIncidentCount: incidents.length,
    isOverdue,
    missedCheckIn,
    hasHighRisk,
    advisoryFlags,
    requiresSupervisorReview: hasHighRisk || hasOpenIncidents || advisoryFlags.length > 0,
    // ADVISORY ONLY — not a safeguarding decision
    advisoryNote: 'Risk prompts are advisory and require human review. ResponseLink OS™ does not make safeguarding, clinical, or emergency decisions.',
  }
}

/**
 * recalculateDashboardStatus()
 * Reads all open state and returns an advisory dashboard health summary.
 * Returns plain data — no side effects.
 */
export function recalculateDashboardStatus() {
  const demo = isDemo()
  const missions    = demo ? missionTable.list()     : missionTable.listLive()
  const responders  = demo ? responderTable.list()   : responderTable.listLive()
  const sus         = demo ? serviceUserTable.list() : serviceUserTable.listLive()
  const flags       = demo ? riskFlagTable.list()    : riskFlagTable.listLive()
  const incidents   = demo ? incidentTable.list()    : incidentTable.listLive()
  const syncItems   = demo ? syncQueueTable.list()   : syncQueueTable.listLive()

  const now_ts = new Date()
  const msMin  = 60 * 1000

  return {
    activeMissions:        missions.filter(m => !['completed','cancelled'].includes(m.status)).length,
    overdueM:              missions.filter(m => m.dueTime && new Date(m.dueTime) < now_ts && !['completed','cancelled'].includes(m.status)).length,
    highRiskFlags:         flags.filter(f => [RISK_LEVEL.HIGH, RISK_LEVEL.CRITICAL].includes(f.riskLevel) && f.status === 'open').length,
    openIncidents:         incidents.filter(i => i.supervisorReviewStatus === 'pending').length,
    helpRequests:          sus.filter(su => su.helpRequestStatus === 'support_requested' || su.helpRequestStatus === 'urgent_help_requested').length,
    overdueResponders:     responders.filter(r => r.lastCheckInAt && (now_ts - new Date(r.lastCheckInAt)) > 90 * msMin).length,
    syncUnhealthy:         syncItems.filter(i => ![SYNC_STATUS.SYNCED].includes(i.syncStatus)).length,
    syncConflicts:         syncItems.filter(i => i.syncStatus === SYNC_STATUS.CONFLICT).length,
    supervisorReviewItems: syncItems.filter(i => i.syncStatus === SYNC_STATUS.SUPERVISOR_REVIEW_REQUIRED).length,
    // Advisory only
    advisoryNote: 'Risk prompts are advisory and require human review.',
    dataFreshnessWarning:  'Offline, pending, failed, or conflict records may not reflect the latest real-world situation. Human review is required for safety-sensitive decisions.',
  }
}

// ─── Conflict detection ───────────────────────────────────────

/**
 * detectMissionConflict(missionId)
 * Checks for conflicting mission states across surfaces.
 * Returns { conflict, reason } — advisory only.
 */
export function detectMissionConflict(missionId) {
  const mission  = missionTable.get(missionId)
  if (!mission) return { conflict: false }

  const syncItems = syncQueueTable.list().filter(i => i.entityId === missionId)
  const hasCompletedEvent   = syncItems.some(i => i.action === 'mission_updated' && i.payload?.status === 'completed')
  const hasCancelledInSU    = syncItems.some(i => i.sourceSurface === SOURCE_SURFACE.SERVICE_USER_PWA && i.action === SYNC_ACTION.VISIT_DECLINED)
  const hasResponderArrived = syncItems.some(i => i.sourceSurface === SOURCE_SURFACE.RESPONDER_PWA && i.payload?.status === 'arrived')

  if (hasCompletedEvent && hasCancelledInSU) {
    return {
      conflict: true,
      reason: 'Responder marked mission complete but service user declined visit. Human review required before treating either record as final.',
    }
  }
  if (hasResponderArrived && hasCancelledInSU) {
    return {
      conflict: true,
      reason: 'Responder marked arrived but service user declined visit. Human review required.',
    }
  }
  return { conflict: false }
}

// ─── Offline detection ────────────────────────────────────────

/**
 * getOnlineStatus()
 * Uses navigator.onLine if available. Returns { online, status, label }.
 */
export function getOnlineStatus() {
  try {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true
    return {
      online,
      status: online ? 'online' : 'offline',
      label:  online ? 'Online (local demo)' : 'Offline — updates queued locally',
    }
  } catch {
    return { online: true, status: 'online', label: 'Online (local demo)' }
  }
}

/**
 * processLocalSyncQueue()
 * Simulates local processing — marks all PENDING items as SYNCED
 * (local-first: shared state is immediately readable by all surfaces).
 * Demo only — does NOT call any backend.
 * Returns { processed, count }
 */
export function processLocalSyncQueue() {
  if (!isDemo()) return { processed: false, count: 0, reason: 'Live mode — backend sync required' }

  const pending = syncQueueTable.list().filter(
    i => i.demoRecord && i.syncStatus === SYNC_STATUS.PENDING
  )
  pending.forEach(i => markSyncEventSynced(i.id))
  return { processed: true, count: pending.length }
}

// ─── Demo Scenario Runner ─────────────────────────────────────
// All operations are demo-only. They check isDemo() before running.

const DEMO_GUARD = (fn) => () => {
  if (!isDemo()) return { ok: false, error: 'Demo scenarios can only run in Demo Mode.' }
  return fn()
}

/**
 * scenarioSeedEndToEnd()
 * Creates a complete end-to-end demo scenario with sync events.
 * Builds on existing demo data — reads first, then adds sync events.
 */
export const scenarioSeedEndToEnd = DEMO_GUARD(() => {
  const missions   = missionTable.list().filter(m => m.demoRecord)
  const responders = responderTable.list().filter(r => r.demoRecord)
  const sus        = serviceUserTable.list().filter(s => s.demoRecord)

  if (missions.length === 0 || responders.length === 0) {
    return { ok: false, error: 'No demo data found. Seed demo data first.' }
  }

  const m1 = missions[0]
  const r1 = responders[0]
  const su1 = sus[0]
  const events = []

  // Dashboard created mission
  events.push(createSyncEvent({
    entityType: 'mission', entityId: m1.id,
    sourceSurface: SOURCE_SURFACE.COMMAND_DASHBOARD, targetSurface: TARGET_SURFACE.SHARED_STATE,
    action: SYNC_ACTION.MISSION_CREATED, payload: { missionTitle: m1.title, riskLevel: m1.riskLevel },
    syncStatus: SYNC_STATUS.SYNCED,
  }))

  // Dashboard assigned mission
  const assign = propagateMissionAssignment(m1.id)
  if (assign.ok) events.push(...assign.syncEvents)

  // Responder: travelling
  events.push(propagateResponderUpdate({
    missionId: m1.id, responderId: r1.id,
    action: SYNC_ACTION.RESPONDER_STATUS_UPDATED,
    payload: { status: 'travelling', missionTitle: m1.title },
  }))

  // Responder: check-in
  events.push(propagateResponderUpdate({
    missionId: m1.id, responderId: r1.id,
    action: SYNC_ACTION.RESPONDER_CHECK_IN_SUBMITTED,
    payload: { safetyStatus: 'safe', message: '[DEMO] On route, all fine.' },
  }))

  // Responder: arrived
  events.push(propagateResponderUpdate({
    missionId: m1.id, responderId: r1.id,
    action: SYNC_ACTION.RESPONDER_STATUS_UPDATED,
    payload: { status: 'arrived', missionTitle: m1.title },
  }))

  // SU: wellbeing check-in
  if (su1) {
    events.push(propagateServiceUserUpdate({
      serviceUserId: su1.id, missionId: m1.id,
      action: SYNC_ACTION.SERVICE_USER_CHECK_IN_SUBMITTED,
      payload: { wellbeingStatus: 'okay', message: '[DEMO] Feeling okay today.' },
    }))

    // SU: visit confirmed
    events.push(propagateServiceUserUpdate({
      serviceUserId: su1.id, missionId: m1.id,
      action: SYNC_ACTION.VISIT_CONFIRMED,
      payload: { confirmationStatus: 'visit_confirmed' },
    }))
  }

  // Responder: welfare checklist saved
  events.push(propagateResponderUpdate({
    missionId: m1.id, responderId: r1.id,
    action: SYNC_ACTION.WELFARE_CHECKLIST_SAVED,
    payload: { checklistStatus: 'completed', itemCount: 8 },
  }))

  return { ok: true, events }
})

export const scenarioSimulateTravelling = DEMO_GUARD(() => {
  const missions   = missionTable.list().filter(m => m.demoRecord && m.status !== 'completed')
  const responders = responderTable.list().filter(r => r.demoRecord)
  if (!missions[0]) return { ok: false, error: 'No demo missions available.' }
  const m = missions[0], r = responders[0]
  missionTable.update(m.id, { status: 'travelling', updatedAt: now() })
  if (r) responderTable.update(r.id, { status: RESPONDER_STATUS.TRAVELLING, updatedAt: now() })
  propagateResponderUpdate({ missionId: m.id, responderId: r?.id, action: SYNC_ACTION.RESPONDER_STATUS_UPDATED, payload: { status: 'travelling' } })
  return { ok: true, mission: m.title }
})

export const scenarioSimulateArrived = DEMO_GUARD(() => {
  const missions   = missionTable.list().filter(m => m.demoRecord && ['travelling','assigned'].includes(m.status))
  const responders = responderTable.list().filter(r => r.demoRecord)
  if (!missions[0]) return { ok: false, error: 'No travelling demo mission found.' }
  const m = missions[0], r = responders[0]
  missionTable.update(m.id, { status: 'arrived', updatedAt: now() })
  if (r) responderTable.update(r.id, { status: RESPONDER_STATUS.ARRIVED, updatedAt: now() })
  propagateResponderUpdate({ missionId: m.id, responderId: r?.id, action: SYNC_ACTION.RESPONDER_STATUS_UPDATED, payload: { status: 'arrived' } })
  return { ok: true, mission: m.title }
})

export const scenarioSimulateResponderCheckIn = DEMO_GUARD(() => {
  const missions   = missionTable.list().filter(m => m.demoRecord)
  const responders = responderTable.list().filter(r => r.demoRecord)
  if (!missions[0] || !responders[0]) return { ok: false, error: 'No demo data.' }
  const m = missions[0], r = responders[0]
  const ci = checkInTable.create({
    missionId: m.id, responderId: r.id, serviceUserId: null,
    checkInType: 'responder_safety', safetyStatus: 'safe',
    message: '[DEMO] Simulated responder safety check-in. All clear.',
    riskLevel: 'low', needsReview: false,
    syncStatus: 'pending', demoRecord: true, createdAt: now(), updatedAt: now(),
  })
  responderTable.update(r.id, { lastCheckInAt: now(), updatedAt: now() })
  propagateResponderUpdate({ missionId: m.id, responderId: r.id, action: SYNC_ACTION.RESPONDER_CHECK_IN_SUBMITTED, payload: { safetyStatus: 'safe' } })
  return { ok: true, checkIn: ci.id }
})

export const scenarioSimulateSUWellbeing = DEMO_GUARD(() => {
  const sus      = serviceUserTable.list().filter(s => s.demoRecord)
  const missions = missionTable.list().filter(m => m.demoRecord)
  if (!sus[0]) return { ok: false, error: 'No demo service users.' }
  const su = sus[0], m = missions[0]
  serviceUserTable.update(su.id, { wellbeingStatus: SERVICE_USER_STATUS.CHECK_IN_RECEIVED, lastCheckInAt: now(), updatedAt: now() })
  checkInTable.create({
    missionId: m?.id || null, responderId: null, serviceUserId: su.id,
    checkInType: 'service_user_wellbeing', safetyStatus: 'okay',
    message: '[DEMO] Simulated service user wellbeing check-in.',
    riskLevel: 'low', needsReview: false,
    syncStatus: 'pending', demoRecord: true, createdAt: now(), updatedAt: now(),
  })
  propagateServiceUserUpdate({ serviceUserId: su.id, missionId: m?.id, action: SYNC_ACTION.SERVICE_USER_CHECK_IN_SUBMITTED, payload: { wellbeingStatus: 'okay' } })
  return { ok: true, su: su.displayName }
})

export const scenarioSimulateHelpRequest = DEMO_GUARD(() => {
  const sus      = serviceUserTable.list().filter(s => s.demoRecord)
  const missions = missionTable.list().filter(m => m.demoRecord)
  if (!sus[0]) return { ok: false, error: 'No demo service users.' }
  const su = sus[0], m = missions[0]
  serviceUserTable.update(su.id, { helpRequestStatus: 'support_requested', wellbeingStatus: SERVICE_USER_STATUS.SUPPORT_REQUESTED, lastCheckInAt: now(), updatedAt: now() })
  messageTable.create({
    fromType: 'service_user', fromId: su.id, toType: 'dashboard', toId: 'coordinator',
    missionId: m?.id || null,
    subject: '[DEMO] Help Request — practical support',
    body: '[DEMO] Simulated help request. Advisory only — no real request sent.',
    priority: 'normal', readStatus: 'unread', syncStatus: 'pending', demoRecord: true, createdAt: now(),
  })
  propagateServiceUserUpdate({ serviceUserId: su.id, missionId: m?.id, action: SYNC_ACTION.SERVICE_USER_HELP_REQUESTED, payload: { helpReason: 'practical_support', urgency: 'routine' } })
  return { ok: true, su: su.displayName }
})

export const scenarioSimulateIncident = DEMO_GUARD(() => {
  const missions   = missionTable.list().filter(m => m.demoRecord)
  const responders = responderTable.list().filter(r => r.demoRecord)
  if (!missions[0]) return { ok: false, error: 'No demo missions.' }
  const m = missions[0], r = responders[0]
  const inc = incidentTable.create({
    missionId: m.id, responderId: r?.id || null, serviceUserId: m.linkedServiceUserId || null,
    title: '[DEMO] Simulated Welfare Concern',
    category: 'welfare_concern', severity: 'medium',
    description: '[DEMO] Advisory scenario only — no real incident. Simulated for demo purposes.',
    actionTaken: '[DEMO] Demo action recorded.',
    supervisorReviewStatus: 'pending',
    evidenceRecordIds: [], syncStatus: 'pending', demoRecord: true, createdAt: now(), updatedAt: now(),
  })
  propagateResponderUpdate({ missionId: m.id, responderId: r?.id, action: SYNC_ACTION.INCIDENT_REPORTED, payload: { severity: 'medium', category: 'welfare_concern' } })
  return { ok: true, incident: inc.id }
})

export const scenarioSimulateSUVisitDeclined = DEMO_GUARD(() => {
  const sus      = serviceUserTable.list().filter(s => s.demoRecord)
  const missions = missionTable.list().filter(m => m.demoRecord)
  if (!sus[0]) return { ok: false, error: 'No demo service users.' }
  const su = sus[0], m = missions[0]
  serviceUserTable.update(su.id, { wellbeingStatus: SERVICE_USER_STATUS.VISIT_DECLINED, updatedAt: now() })
  propagateServiceUserUpdate({ serviceUserId: su.id, missionId: m?.id, action: SYNC_ACTION.VISIT_DECLINED, payload: { confirmationStatus: 'visit_declined', note: '[DEMO] Simulated visit decline.' } })
  // Check for conflict with responder state
  if (m) {
    const { conflict, reason } = detectMissionConflict(m.id)
    if (conflict) {
      const conflictItems = syncQueueTable.list().filter(i => i.entityId === m.id)
      if (conflictItems[0]) markSyncEventConflict(conflictItems[0].id, reason)
    }
  }
  return { ok: true, su: su.displayName }
})

export const scenarioSimulateFailedSync = DEMO_GUARD(() => {
  const items = syncQueueTable.list().filter(i => i.demoRecord && i.syncStatus === SYNC_STATUS.PENDING)
  if (items.length === 0) {
    // Create a synthetic failed item
    const fail = createSyncEvent({
      entityType: 'checkIn', entityId: uid(),
      sourceSurface: SOURCE_SURFACE.RESPONDER_PWA, targetSurface: TARGET_SURFACE.BACKEND_FUTURE,
      action: SYNC_ACTION.RESPONDER_CHECK_IN_SUBMITTED,
      payload: { note: '[DEMO] Simulated failed sync event.' },
      syncStatus: SYNC_STATUS.PENDING,
    })
    markSyncEventFailed(fail.id, '[DEMO] Simulated backend unavailable. This is a demo scenario only.')
    return { ok: true, item: fail.id }
  }
  markSyncEventFailed(items[0].id, '[DEMO] Simulated backend unavailable. This is a demo scenario only.')
  return { ok: true, item: items[0].id }
})

export const scenarioSimulateConflict = DEMO_GUARD(() => {
  const missions = missionTable.list().filter(m => m.demoRecord)
  if (!missions[0]) return { ok: false, error: 'No demo missions.' }
  const ev = createSyncEvent({
    entityType: 'mission', entityId: missions[0].id,
    sourceSurface: SOURCE_SURFACE.SERVICE_USER_PWA, targetSurface: TARGET_SURFACE.COMMAND_DASHBOARD,
    action: SYNC_ACTION.VISIT_DECLINED,
    payload: { note: '[DEMO] Service user declined — responder already marked arrived.' },
    syncStatus: SYNC_STATUS.CONFLICT,
  })
  syncQueueTable.update(ev.id, {
    errorMessage: '[DEMO] Conflict detected. Human review required before treating either record as final.',
  })
  return { ok: true, item: ev.id }
})

export const scenarioClearDemoSyncQueue = DEMO_GUARD(() => {
  const items = syncQueueTable.list().filter(i => i.demoRecord)
  items.forEach(i => syncQueueTable.delete(i.id))
  return { ok: true, cleared: items.length }
})

export const scenarioProcessLocalSync = DEMO_GUARD(() => {
  return processLocalSyncQueue()
})

// ─── Validation ───────────────────────────────────────────────

/**
 * validateEndToEndSyncState()
 * Non-blocking check — returns advisory issues.
 * Does not throw.
 */
export function validateEndToEndSyncState() {
  const issues = []
  const items = _getSyncItems()
  const missions   = isDemo() ? missionTable.list()     : missionTable.listLive()
  const responders = isDemo() ? responderTable.list()   : responderTable.listLive()
  const sus        = isDemo() ? serviceUserTable.list() : serviceUserTable.listLive()

  const conflicts    = items.filter(i => i.syncStatus === SYNC_STATUS.CONFLICT)
  const failed       = items.filter(i => i.syncStatus === SYNC_STATUS.FAILED)
  const supReview    = items.filter(i => i.syncStatus === SYNC_STATUS.SUPERVISOR_REVIEW_REQUIRED)
  const orphanedSQ   = items.filter(i => i.entityType === 'mission' && i.entityId && !missionTable.get(i.entityId))

  if (conflicts.length)    issues.push(`${conflicts.length} sync conflict(s) require human review.`)
  if (failed.length)       issues.push(`${failed.length} sync item(s) failed — backend not yet configured.`)
  if (supReview.length)    issues.push(`${supReview.length} item(s) require supervisor review.`)
  if (orphanedSQ.length)   issues.push(`${orphanedSQ.length} orphaned sync item(s) reference deleted missions.`)

  const missingResponderId = missions.filter(m => m.assignedResponderId && !responderTable.get(m.assignedResponderId))
  if (missingResponderId.length) issues.push(`${missingResponderId.length} mission(s) reference missing responder records.`)

  return {
    ok:     issues.length === 0,
    issues,
    counts: { conflicts: conflicts.length, failed: failed.length, supReview: supReview.length },
    advisoryNote: 'Validation issues are advisory only. Human review is required for safety-sensitive decisions.',
  }
}

export default {
  SOURCE_SURFACE, TARGET_SURFACE, SYNC_ACTION,
  createSyncEvent,
  markSyncEventSynced, markSyncEventFailed, markSyncEventOffline,
  markSyncEventConflict, markSyncEventNeedsRetry, markSyncEventSupervisorReview,
  retrySyncEvent,
  getSyncQueueSummary, getPendingSyncItems, getFailedSyncItems,
  getConflictSyncItems, getSupervisorReviewItems, getLatestSyncedActivity,
  propagateMissionAssignment, propagateResponderUpdate, propagateServiceUserUpdate,
  recalculateMissionRisk, recalculateDashboardStatus,
  detectMissionConflict, getOnlineStatus,
  processLocalSyncQueue,
  scenarioSeedEndToEnd, scenarioSimulateTravelling, scenarioSimulateArrived,
  scenarioSimulateResponderCheckIn, scenarioSimulateSUWellbeing,
  scenarioSimulateHelpRequest, scenarioSimulateIncident,
  scenarioSimulateSUVisitDeclined, scenarioSimulateFailedSync,
  scenarioSimulateConflict, scenarioClearDemoSyncQueue, scenarioProcessLocalSync,
  validateEndToEndSyncState,
}
