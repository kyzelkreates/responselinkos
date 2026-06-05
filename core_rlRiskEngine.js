/**
 * ============================================================
 * ResponseLink OS™ — Risk & Escalation Engine
 * core_rlRiskEngine.js
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 7 — Risk, Escalation & Safeguarding-Aware Workflow
 * LOCAL-FIRST ONLY. No backend. No AI agents yet. No secrets.
 *
 * ⚠ ADVISORY NOTICE:
 *   This engine provides ADVISORY RISK PROMPTS only.
 *   It does NOT:
 *     • make safeguarding decisions
 *     • diagnose anyone
 *     • determine that a person is safe or unsafe
 *     • contact emergency services
 *     • auto-close cases
 *     • replace professional judgement
 *     • replace organisational procedures
 *     • replace legal duties
 *
 *   If someone is in immediate danger, contact emergency services.
 *   All prompts require human review.
 * ============================================================
 */

import {
  getDemoMode,
  riskFlagTable,
  incidentTable,
  checkInTable,
  missionTable,
  responderTable,
  serviceUserTable,
  evidenceTable,
  syncQueueTable,
  RISK_LEVEL,
  SYNC_STATUS,
  RECORD_TYPE,
} from './core_rlData'

// ─── Internal helpers ──────────────────────────────────────────
const now    = () => new Date().toISOString()
const MS_MIN = 60 * 1000
const MS_HR  = 60 * MS_MIN
const isDemo = () => getDemoMode()

function _table(tbl) {
  return isDemo() ? tbl.list() : tbl.listLive()
}

// ─── Risk levels ───────────────────────────────────────────────
export const RISK_LEVELS = {
  LOW:      'low',
  MEDIUM:   'medium',
  HIGH:     'high',
  CRITICAL: 'critical',
}

// ─── Escalation states ─────────────────────────────────────────
export const ESCALATION_STATE = {
  NONE:                          'none',
  MONITOR:                       'monitor',
  SUPERVISOR_REVIEW_RECOMMENDED: 'supervisor_review_recommended',
  SUPERVISOR_REVIEW_REQUIRED:    'supervisor_review_required',
  ESCALATING:                    'escalating',
  RESOLVED:                      'resolved',
  CLOSED_WITH_REVIEW:            'closed_with_review',
}

// ─── Review statuses ───────────────────────────────────────────
export const REVIEW_STATUS = {
  NOT_REQUIRED:   'not_required',
  REQUIRED:       'required',
  PENDING:        'pending',
  IN_REVIEW:      'in_review',
  REVIEWED:       'reviewed',
  ACTION_REQUIRED:'action_required',
  CLOSED:         'closed',
}

// ─── Trigger types ─────────────────────────────────────────────
export const TRIGGER_TYPE = {
  OVERDUE_RESPONDER_CHECK_IN:            'overdue_responder_check_in',
  MISSED_SERVICE_USER_CHECK_IN:          'missed_service_user_check_in',
  HIGH_RISK_MISSION:                     'high_risk_mission',
  SAFEGUARDING_CONCERN:                  'safeguarding_concern',
  RESPONDER_ESCALATION:                  'responder_escalation',
  SERVICE_USER_HELP_REQUEST:             'service_user_help_request',
  MISSING_EVIDENCE:                      'missing_evidence',
  REPEATED_FAILED_CONTACT:               'repeated_failed_contact',
  VULNERABLE_PERSON_RISK_MARKER:         'vulnerable_person_risk_marker',
  OFFLINE_TOO_LONG:                      'offline_too_long',
  INCOMPLETE_WELFARE_CHECKLIST:          'incomplete_welfare_checklist',
  UNRESOLVED_INCIDENT:                   'unresolved_incident',
  REPEATED_WELLBEING_DECLINE:            'repeated_wellbeing_decline',
  SYNC_CONFLICT:                         'sync_conflict',
  FAILED_SYNC_FOR_SAFETY_RECORD:         'failed_sync_for_safety_record',
  URGENT_HELP_REQUESTED:                 'urgent_help_requested',
  IMMEDIATE_DANGER_SELECTED:             'immediate_danger_selected_by_service_user',
  LOCATION_RISK_NOTE:                    'location_risk_note',
}

// ─── Colour helpers ────────────────────────────────────────────
export function getRiskColor(level) {
  switch (level) {
    case 'critical': return { text: '#ef4444', bg: '#ef444412', border: '#ef444430', label: 'Critical' }
    case 'high':     return { text: '#f97316', bg: '#f9731612', border: '#f9731630', label: 'High' }
    case 'medium':   return { text: '#f59e0b', bg: '#f59e0b12', border: '#f59e0b30', label: 'Medium' }
    default:         return { text: '#22c55e', bg: '#22c55e12', border: '#22c55e30', label: 'Low' }
  }
}

export function getReviewColor(status) {
  switch (status) {
    case 'required':
    case 'action_required': return { text: '#ef4444', bg: '#ef444412' }
    case 'pending':
    case 'in_review':       return { text: '#f59e0b', bg: '#f59e0b12' }
    case 'reviewed':
    case 'closed':          return { text: '#22c55e', bg: '#22c55e12' }
    default:                return { text: '#64748b', bg: '#64748b12' }
  }
}

// ─── Risk calculation ──────────────────────────────────────────

export function calculateMissionRisk(missionId) {
  const mission = missionTable.get(missionId)
  if (!mission) return null
  const flags     = _table(riskFlagTable).filter(f => f.missionId === missionId && f.status === 'open')
  const incidents = _table(incidentTable).filter(i => i.missionId === missionId && i.supervisorReviewStatus !== 'closed')
  const isOverdue = mission.dueTime && new Date(mission.dueTime) < new Date() && !['completed','cancelled'].includes(mission.status)
  const hasCrit   = flags.some(f => f.riskLevel === 'critical')
  const hasHigh   = flags.some(f => ['high','critical'].includes(f.riskLevel))

  let risk = mission.riskLevel || 'low'
  if (hasCrit || (isOverdue && hasHigh)) risk = 'critical'
  else if (hasHigh || (isOverdue && incidents.length)) risk = 'high'
  else if (incidents.length || isOverdue) risk = 'medium'

  return {
    missionId, title: mission.title, computedRisk: risk,
    openFlagCount: flags.length, incidentCount: incidents.length, isOverdue,
    requiresSupervisorReview: hasCrit || hasHigh || isOverdue,
    advisoryNote: 'Risk assessment is advisory only. Human review is required before any decision.',
  }
}

export function calculateServiceUserRisk(serviceUserId) {
  const su = serviceUserTable.get(serviceUserId)
  if (!su) return null
  const isUrgent = su.helpRequestStatus === 'urgent_help_requested'
  const isHelp   = su.helpRequestStatus === 'support_requested' || isUrgent
  const isMissed = su.wellbeingStatus === 'missed_check_in'
  const isSafety = su.wellbeingStatus === 'safety_concern' || su.wellbeingStatus === 'urgent_help_requested'

  let risk = 'low'
  if (isUrgent || isSafety)  risk = 'critical'
  else if (isHelp)            risk = 'high'
  else if (isMissed)          risk = 'medium'

  return {
    serviceUserId, displayName: su.displayName, computedRisk: risk,
    wellbeingStatus: su.wellbeingStatus, helpRequestStatus: su.helpRequestStatus,
    requiresSupervisorReview: risk === 'critical' || risk === 'high',
    advisoryNote: 'Risk assessment is advisory only. Human review is required before any decision.',
  }
}

export function calculateResponderRisk(responderId) {
  const r = responderTable.get(responderId)
  if (!r) return null
  const isOverdue = ['overdue','check_in_due'].includes(r.status)
  const risk = isOverdue && r.status === 'escalating' ? 'critical'
             : isOverdue ? 'high'
             : 'low'
  return {
    responderId, displayName: r.displayName, computedRisk: risk, status: r.status,
    requiresSupervisorReview: risk !== 'low',
    advisoryNote: 'Responder risk prompts are advisory. Use professional lone-working procedures.',
  }
}

// ─── Detection helpers ─────────────────────────────────────────

export function getOverdueResponderCheckIns() {
  return _table(responderTable).filter(r =>
    ['overdue','check_in_due','escalating'].includes(r.status) ||
    r.safetyStatus === 'check_in_overdue'
  )
}

export function getMissedServiceUserCheckIns() {
  return _table(serviceUserTable).filter(su =>
    su.wellbeingStatus === 'missed_check_in' || su.wellbeingStatus === 'safety_concern'
  )
}

export function getOpenEscalations() {
  return _table(riskFlagTable).filter(f => f.status === 'open' && f.requiresSupervisorReview && !f.humanReviewed)
}

export function getUrgentHelpRequests() {
  return _table(serviceUserTable).filter(su =>
    su.helpRequestStatus === 'urgent_help_requested' || su.helpRequestStatus === 'support_requested'
  )
}

// ─── Evidence gap detection ────────────────────────────────────

export function detectEvidenceGaps() {
  const demo     = isDemo()
  const gaps     = []
  const missions  = _table(missionTable)
  const incidents = _table(incidentTable)
  const flags     = _table(riskFlagTable)
  const evidence  = _table(evidenceTable)
  const sus       = _table(serviceUserTable)
  const syncItems = _table(syncQueueTable)

  missions.filter(m => m.status === 'completed').forEach(m => {
    const hasChecklist = evidence.some(e => e.missionId === m.id && e.recordType === 'checklist')
    if (!hasChecklist) gaps.push({
      id: `gap-cl-${m.id}`, type: 'missing_welfare_checklist', severity: 'medium',
      entityType: 'mission', entityId: m.id,
      title: `No welfare checklist — ${m.title || m.id}`,
      description: 'Mission completed but no welfare checklist evidence record found.',
      advisoryNote: 'Evidence gap prompts support record quality. They do not prove wrongdoing, safety, or compliance.',
      demoRecord: m.demoRecord,
    })
    if (!m.outcomeNotes?.trim()) gaps.push({
      id: `gap-out-${m.id}`, type: 'mission_missing_outcome_notes', severity: 'medium',
      entityType: 'mission', entityId: m.id,
      title: `No outcome notes — ${m.title || m.id}`,
      description: 'Mission completed without outcome notes.',
      advisoryNote: 'Evidence gap prompts support record quality. They do not prove wrongdoing, safety, or compliance.',
      demoRecord: m.demoRecord,
    })
  })

  incidents.filter(i => !i.actionTaken?.trim()).forEach(i => gaps.push({
    id: `gap-inc-${i.id}`, type: 'incident_missing_action_taken', severity: 'high',
    entityType: 'incident', entityId: i.id,
    title: `No action recorded — ${i.title || i.id}`,
    description: 'Incident record has no "action taken" note.',
    advisoryNote: 'Evidence gap prompts support record quality. They do not prove wrongdoing, safety, or compliance.',
    demoRecord: i.demoRecord,
  }))

  flags.filter(f => ['high','critical'].includes(f.riskLevel) && !f.supervisorNote?.trim()).forEach(f => gaps.push({
    id: `gap-flag-${f.id}`, type: 'high_risk_flag_missing_supervisor_note', severity: 'high',
    entityType: 'riskFlag', entityId: f.id,
    title: `No supervisor note — ${f.title}`,
    description: `Risk flag is ${f.riskLevel} but has no supervisor note.`,
    advisoryNote: 'Evidence gap prompts support record quality. They do not prove wrongdoing, safety, or compliance.',
    demoRecord: f.demoRecord,
  }))

  sus.filter(su => su.helpRequestStatus === 'urgent_help_requested' && !su.helpRequestReviewedAt).forEach(su => gaps.push({
    id: `gap-help-${su.id}`, type: 'urgent_help_unreviewed', severity: 'critical',
    entityType: 'serviceUser', entityId: su.id,
    title: `Urgent help unreviewed — ${su.displayName}`,
    description: 'Urgent help request submitted but no supervisor review recorded.',
    advisoryNote: 'Evidence gap prompts support record quality. They do not prove wrongdoing, safety, or compliance.',
    demoRecord: su.demoRecord,
  }))

  syncItems.filter(s => s.syncStatus === 'conflict').forEach(s => gaps.push({
    id: `gap-sync-${s.id}`, type: 'sync_conflict_unreviewed', severity: 'medium',
    entityType: 'syncQueue', entityId: s.id,
    title: `Sync conflict unreviewed — ${s.action?.replace(/_/g,' ')}`,
    description: s.errorMessage?.slice(0, 100) || 'A sync conflict exists and has not been reviewed.',
    advisoryNote: 'Evidence gap prompts support record quality. They do not prove wrongdoing, safety, or compliance.',
    demoRecord: s.demoRecord,
  }))

  return demo ? gaps : gaps.filter(g => !g.demoRecord)
}

// ─── Data freshness ────────────────────────────────────────────

export function detectDataFreshnessWarnings() {
  const items    = _table(syncQueueTable)
  const now_ms   = Date.now()
  const pending  = items.filter(i => i.syncStatus === 'pending')
  const failed   = items.filter(i => i.syncStatus === 'failed' || i.syncStatus === 'needs_retry')
  const offline  = items.filter(i => i.syncStatus === 'offline')
  const conflict = items.filter(i => i.syncStatus === 'conflict')
  const stale    = pending.filter(i => (now_ms - new Date(i.createdAt)) > 60 * MS_MIN)
  const warnings = []

  if (pending.length)  warnings.push({ type: 'pending',  count: pending.length,  message: `${pending.length} record(s) pending — may not be visible to all users yet.` })
  if (failed.length)   warnings.push({ type: 'failed',   count: failed.length,   message: `${failed.length} record(s) failed to sync. Human review recommended.` })
  if (offline.length)  warnings.push({ type: 'offline',  count: offline.length,  message: `${offline.length} record(s) captured offline and not yet confirmed.` })
  if (conflict.length) warnings.push({ type: 'conflict', count: conflict.length, message: `${conflict.length} sync conflict(s) detected. Human review required.` })
  if (stale.length)    warnings.push({ type: 'stale',    count: stale.length,    message: `${stale.length} pending record(s) are over 60 minutes old.` })

  return {
    hasWarning: warnings.length > 0, warnings,
    counts: { pending: pending.length, failed: failed.length, offline: offline.length, conflict: conflict.length, stale: stale.length },
    standardWarning: 'Data may be incomplete or stale. Offline, pending, failed, or conflict records may not reflect the latest real-world situation. Human review is required for safety-sensitive decisions.',
  }
}

// ─── Supervisor Review Queue ───────────────────────────────────

export function getSupervisorReviewQueue() {
  const demo  = isDemo()
  const queue = []

  // Open risk flags needing review
  _table(riskFlagTable).filter(f => f.status === 'open' && f.requiresSupervisorReview && !f.humanReviewed).forEach(f => {
    queue.push({
      id: f.id, sourceEntityType: 'riskFlag', sourceEntityId: f.id,
      missionId: f.missionId, responderId: f.responderId,
      serviceUserId: f.serviceUserId || f.linkedServiceUserId,
      riskLevel: f.riskLevel, triggerType: f.triggerType, title: f.title,
      summary: f.description?.slice(0, 120),
      recommendedHumanAction: 'Review risk flag, add supervisor note, and close or escalate.',
      reviewStatus: f.reviewStatus || 'required',
      supervisorNote: f.supervisorNote || null,
      createdAt: f.createdAt, updatedAt: f.updatedAt,
      demoRecord: f.demoRecord, syncStatus: f.syncStatus || 'synced',
    })
  })

  // Incidents pending review
  _table(incidentTable).filter(i => ['pending','action_required'].includes(i.supervisorReviewStatus)).forEach(i => {
    queue.push({
      id: `inc-${i.id}`, sourceEntityType: 'incident', sourceEntityId: i.id,
      missionId: i.missionId, responderId: i.responderId, serviceUserId: i.serviceUserId,
      riskLevel: i.severity === 'critical' ? 'critical' : i.severity === 'high' ? 'high' : 'medium',
      triggerType: i.category || 'unresolved_incident', title: i.title,
      summary: i.description?.slice(0, 120),
      recommendedHumanAction: 'Review incident, confirm action taken, and mark reviewed or action required.',
      reviewStatus: i.supervisorReviewStatus === 'action_required' ? 'action_required' : 'pending',
      supervisorNote: i.supervisorNote || null,
      createdAt: i.createdAt, updatedAt: i.updatedAt,
      demoRecord: i.demoRecord, syncStatus: i.syncStatus || 'pending',
    })
  })

  // Urgent help requests unreviewed
  _table(serviceUserTable).filter(su =>
    su.helpRequestStatus === 'urgent_help_requested' && !su.helpRequestReviewedAt
  ).forEach(su => {
    queue.push({
      id: `help-${su.id}`, sourceEntityType: 'serviceUser', sourceEntityId: su.id,
      missionId: null, responderId: null, serviceUserId: su.id,
      riskLevel: 'critical', triggerType: 'urgent_help_requested',
      title: `Urgent Help Request — ${su.displayName}`,
      summary: 'Service user submitted an urgent help request. Supervisor review required.',
      recommendedHumanAction: 'Contact service user or linked responder immediately. Add supervisor review note.',
      reviewStatus: 'required', supervisorNote: null,
      createdAt: su.updatedAt || su.createdAt, updatedAt: su.updatedAt,
      demoRecord: su.demoRecord, syncStatus: 'pending',
    })
  })

  // Overdue responder check-ins
  _table(responderTable).filter(r => ['overdue','check_in_due','escalating'].includes(r.status)).forEach(r => {
    queue.push({
      id: `resp-${r.id}`, sourceEntityType: 'responder', sourceEntityId: r.id,
      missionId: r.currentMissionId || null, responderId: r.id, serviceUserId: null,
      riskLevel: r.status === 'escalating' ? 'critical' : 'high',
      triggerType: 'overdue_responder_check_in',
      title: `Overdue Check-In — ${r.displayName}`,
      summary: `Responder has not checked in within expected window. Last status: ${r.status}.`,
      recommendedHumanAction: 'Attempt contact. Follow lone-working procedure. Add supervisor note.',
      reviewStatus: 'required', supervisorNote: null,
      createdAt: r.lastCheckInAt || r.createdAt, updatedAt: r.updatedAt,
      demoRecord: r.demoRecord, syncStatus: 'pending',
    })
  })

  // Sync conflicts
  _table(syncQueueTable).filter(s => s.syncStatus === 'conflict').forEach(s => {
    queue.push({
      id: `sync-${s.id}`, sourceEntityType: 'syncQueue', sourceEntityId: s.id,
      missionId: s.entityType === 'mission' ? s.entityId : null,
      responderId: null, serviceUserId: null, riskLevel: 'medium',
      triggerType: 'sync_conflict', title: `Sync Conflict — ${s.action?.replace(/_/g,' ')}`,
      summary: s.errorMessage?.slice(0, 100) || 'Sync conflict detected.',
      recommendedHumanAction: 'Review conflicting records. Do not assume either is final without human verification.',
      reviewStatus: 'pending', supervisorNote: null,
      createdAt: s.createdAt, updatedAt: s.updatedAt,
      demoRecord: s.demoRecord, syncStatus: s.syncStatus,
    })
  })

  const order = { critical: 0, high: 1, medium: 2, low: 3 }
  return queue
    .filter(q => demo ? true : !q.demoRecord)
    .sort((a, b) => {
      const ro = (order[a.riskLevel] || 3) - (order[b.riskLevel] || 3)
      return ro !== 0 ? ro : new Date(b.createdAt) - new Date(a.createdAt)
    })
}

// ─── Dashboard overview ────────────────────────────────────────

export function getDashboardRiskStatus() {
  const reviewQ  = getSupervisorReviewQueue()
  const evGaps   = detectEvidenceGaps()
  const fresh    = detectDataFreshnessWarnings()
  const openFlags= _table(riskFlagTable).filter(f => f.status === 'open')
  const critFlags= openFlags.filter(f => f.riskLevel === 'critical')
  const highFlags= openFlags.filter(f => f.riskLevel === 'high')
  const urgentH  = getUrgentHelpRequests()
  const overdueR = getOverdueResponderCheckIns()
  const missedSU = getMissedServiceUserCheckIns()

  const overallRisk =
    critFlags.length > 0             ? 'critical'
    : highFlags.length > 0 || urgentH.length > 0  ? 'high'
    : overdueR.length > 0 || missedSU.length > 0  ? 'medium'
    : 'low'

  return {
    overallRisk,
    reviewQueueCount:    reviewQ.length,
    criticalFlags:       critFlags.length,
    highFlags:           highFlags.length,
    openFlagCount:       openFlags.length,
    overdueResponders:   overdueR.length,
    missedCheckIns:      missedSU.length,
    urgentHelpRequests:  urgentH.length,
    evidenceGapCount:    evGaps.length,
    freshnessWarning:    fresh.hasWarning,
    freshnessWarningCount: fresh.warnings.length,
    advisoryNote: 'All risk prompts are advisory and require human review. ResponseLink OS™ does not make safeguarding, clinical, legal, or emergency decisions.',
  }
}

export function recalculateAllRiskStates() {
  return {
    missions:     _table(missionTable).map(m => calculateMissionRisk(m.id)).filter(Boolean),
    responders:   _table(responderTable).map(r => calculateResponderRisk(r.id)).filter(Boolean),
    serviceUsers: _table(serviceUserTable).map(s => calculateServiceUserRisk(s.id)).filter(Boolean),
    advisoryNote: 'Risk assessments are advisory only. Human review is required before any decision.',
  }
}

// ─── Supervisor Review Actions (append-only) ───────────────────

function _appendReviewEvidence({ entityType, entityId, missionId, responderId, serviceUserId, action, reviewerNote, demoRecord, ts }) {
  try {
    evidenceTable.create({
      missionId: missionId || null,
      visitId: null,
      responderId: responderId || null,
      serviceUserId: serviceUserId || null,
      recordType: RECORD_TYPE.HUMAN_DECISION_LOG,
      recordedByType: 'supervisor',
      recordedById: 'supervisor',
      title: `Human Review — ${action.replace(/_/g,' ')} (${entityType})`,
      content: `Action: ${action}\nEntity: ${entityType}/${entityId}\nNote: ${reviewerNote}\nTimestamp: ${ts}\n\nRecords are only as complete as the information entered and synced. AI or system prompts do not verify facts independently.`,
      timestamp: ts,
      dataFreshness: 'current',
      syncStatus: SYNC_STATUS.PENDING,
      demoRecord: demoRecord || isDemo(),
      createdAt: ts,
      updatedAt: ts,
    })
  } catch (e) {
    console.warn('[RL:RiskEngine] Evidence append failed:', e.message)
  }
}

export function markRiskFlagInReview(flagId, note = '') {
  const flag = riskFlagTable.get(flagId)
  if (!flag) return { ok: false, error: 'Risk flag not found' }
  const ts = now()
  riskFlagTable.update(flagId, { reviewStatus: 'in_review', updatedAt: ts })
  _appendReviewEvidence({ entityType: 'riskFlag', entityId: flagId, missionId: flag.missionId, responderId: flag.responderId, serviceUserId: flag.serviceUserId || flag.linkedServiceUserId, action: 'marked_in_review', reviewerNote: note || 'Marked as in review.', demoRecord: flag.demoRecord, ts })
  return { ok: true }
}

export function addSupervisorReviewNote(entityType, entityId, note) {
  if (!note?.trim()) return { ok: false, error: 'Note is required.' }
  const ts = now()
  const tbl = entityType === 'riskFlag' ? riskFlagTable : entityType === 'incident' ? incidentTable : null
  if (!tbl) return { ok: false, error: 'Unsupported entity type.' }
  const rec = tbl.get(entityId)
  if (!rec) return { ok: false, error: 'Record not found.' }
  const prev = rec.supervisorNote || ''
  tbl.update(entityId, { supervisorNote: prev ? `${prev}\n\n[${ts}] ${note.trim()}` : `[${ts}] ${note.trim()}`, updatedAt: ts })
  _appendReviewEvidence({ entityType, entityId, missionId: rec.missionId, responderId: rec.responderId, serviceUserId: rec.serviceUserId || rec.linkedServiceUserId, action: 'supervisor_note_added', reviewerNote: note.trim(), demoRecord: rec.demoRecord, ts })
  return { ok: true }
}

export function markRiskFlagReviewed(flagId, note = '') {
  const flag = riskFlagTable.get(flagId)
  if (!flag) return { ok: false, error: 'Risk flag not found' }
  const ts = now()
  riskFlagTable.update(flagId, { humanReviewed: true, reviewedAt: ts, reviewStatus: 'reviewed', updatedAt: ts })
  _appendReviewEvidence({ entityType: 'riskFlag', entityId: flagId, missionId: flag.missionId, responderId: flag.responderId, serviceUserId: flag.serviceUserId || flag.linkedServiceUserId, action: 'marked_reviewed', reviewerNote: note || 'Marked as reviewed by supervisor.', demoRecord: flag.demoRecord, ts })
  return { ok: true }
}

export function markIncidentReviewed(incidentId, note = '') {
  const inc = incidentTable.get(incidentId)
  if (!inc) return { ok: false, error: 'Incident not found' }
  const ts = now()
  incidentTable.update(incidentId, { supervisorReviewStatus: 'reviewed', supervisorNote: note || inc.supervisorNote || 'Reviewed by supervisor.', updatedAt: ts })
  _appendReviewEvidence({ entityType: 'incident', entityId: incidentId, missionId: inc.missionId, responderId: inc.responderId, serviceUserId: inc.serviceUserId, action: 'incident_reviewed', reviewerNote: note || 'Incident marked reviewed.', demoRecord: inc.demoRecord, ts })
  return { ok: true }
}

export function markIncidentActionRequired(incidentId, note = '') {
  const inc = incidentTable.get(incidentId)
  if (!inc) return { ok: false, error: 'Incident not found' }
  const ts = now()
  incidentTable.update(incidentId, { supervisorReviewStatus: 'action_required', supervisorNote: note || inc.supervisorNote || 'Action required — marked by supervisor.', updatedAt: ts })
  _appendReviewEvidence({ entityType: 'incident', entityId: incidentId, missionId: inc.missionId, responderId: inc.responderId, serviceUserId: inc.serviceUserId, action: 'action_required', reviewerNote: note || 'Action required marked by supervisor.', demoRecord: inc.demoRecord, ts })
  return { ok: true }
}

export function closeEscalationWithReview(flagId, note) {
  if (!note?.trim()) return { ok: false, error: 'A review note is required to close.' }
  const flag = riskFlagTable.get(flagId)
  if (!flag) return { ok: false, error: 'Risk flag not found' }
  const ts = now()
  const prev = flag.supervisorNote || ''
  riskFlagTable.update(flagId, { status: 'closed', humanReviewed: true, reviewedAt: ts, reviewStatus: 'closed', supervisorNote: prev ? `${prev}\n\n[CLOSED ${ts}] ${note.trim()}` : `[CLOSED ${ts}] ${note.trim()}`, updatedAt: ts })
  _appendReviewEvidence({ entityType: 'riskFlag', entityId: flagId, missionId: flag.missionId, responderId: flag.responderId, serviceUserId: flag.serviceUserId || flag.linkedServiceUserId, action: 'closed_with_review', reviewerNote: note.trim(), demoRecord: flag.demoRecord, ts })
  return { ok: true }
}

export function reopenRiskFlag(flagId, note = '') {
  const flag = riskFlagTable.get(flagId)
  if (!flag) return { ok: false, error: 'Risk flag not found' }
  const ts = now()
  riskFlagTable.update(flagId, { status: 'open', humanReviewed: false, reviewStatus: 'required', updatedAt: ts })
  _appendReviewEvidence({ entityType: 'riskFlag', entityId: flagId, missionId: flag.missionId, responderId: flag.responderId, serviceUserId: flag.serviceUserId || flag.linkedServiceUserId, action: 'reopened', reviewerNote: note || 'Flag reopened for further review.', demoRecord: flag.demoRecord, ts })
  return { ok: true }
}

export function markHelpRequestReviewed(serviceUserId, note = '') {
  const su = serviceUserTable.get(serviceUserId)
  if (!su) return { ok: false, error: 'Service user not found' }
  const ts = now()
  serviceUserTable.update(serviceUserId, { helpRequestReviewedAt: ts, updatedAt: ts })
  _appendReviewEvidence({ entityType: 'serviceUser', entityId: serviceUserId, missionId: null, responderId: null, serviceUserId, action: 'help_request_reviewed', reviewerNote: note || 'Help request acknowledged by supervisor.', demoRecord: su.demoRecord, ts })
  return { ok: true }
}

// ─── Default export ────────────────────────────────────────────
export default {
  RISK_LEVELS, ESCALATION_STATE, REVIEW_STATUS, TRIGGER_TYPE,
  getRiskColor, getReviewColor,
  calculateMissionRisk, calculateServiceUserRisk, calculateResponderRisk,
  getOverdueResponderCheckIns, getMissedServiceUserCheckIns,
  getOpenEscalations, getUrgentHelpRequests,
  detectEvidenceGaps, detectDataFreshnessWarnings,
  getSupervisorReviewQueue, getDashboardRiskStatus, recalculateAllRiskStates,
  markRiskFlagInReview, addSupervisorReviewNote, markRiskFlagReviewed,
  markIncidentReviewed, markIncidentActionRequired,
  closeEscalationWithReview, reopenRiskFlag, markHelpRequestReviewed,
}
