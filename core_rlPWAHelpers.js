/**
 * ============================================================
 * ResponseLink OS™ — Responder PWA SSOT Helpers
 * /src/core/rlPWAHelpers.js
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 4 — Responder PWA Full Workflow
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
  responderTable,
  missionTable,
  serviceUserTable,
  checkInTable,
  welfareVisitTable,
  riskFlagTable,
  incidentTable,
  evidenceTable,
  syncQueueTable,
  getDemoMode,
  RESPONDER_STATUS,
  MISSION_STATUS,
  SYNC_STATUS,
  RISK_LEVEL,
  createSyncQueueItem,
} from './core_rlData'

// ─── Internal helpers ─────────────────────────────────────────
const uid  = () => `rl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const now  = () => new Date().toISOString()
const isDemo = () => getDemoMode()

// ─── Responder Identity ───────────────────────────────────────
const CURRENT_RESPONDER_KEY = 'rl:pwa:currentResponderId'

export function getCurrentResponderId() {
  try { return localStorage.getItem(CURRENT_RESPONDER_KEY) || null } catch { return null }
}

export function setCurrentResponderId(id) {
  try { localStorage.setItem(CURRENT_RESPONDER_KEY, id) } catch {}
}

export function getCurrentResponder() {
  const id = getCurrentResponderId()
  if (!id) return null
  return responderTable.get(id)
}

// ─── Assigned Missions ────────────────────────────────────────

export function getAssignedMissionsForResponder(responderId) {
  if (!responderId) return []
  const demo = isDemo()
  const all  = demo ? missionTable.list() : missionTable.listLive()
  const closed = [MISSION_STATUS.CANCELLED]   // show completed so they can review
  return all.filter(m =>
    m.assignedResponderId === responderId &&
    !closed.includes(m.status)
  ).sort((a, b) => {
    // Sort: overdue/escalating first, then by scheduled time
    const urgent = ['overdue','escalating','needs_supervisor_review','check_in_due']
    const aU = urgent.includes(a.status) ? 0 : 1
    const bU = urgent.includes(b.status) ? 0 : 1
    if (aU !== bU) return aU - bU
    return new Date(a.scheduledTime || 0) - new Date(b.scheduledTime || 0)
  })
}

// ─── Mission Status Workflow ──────────────────────────────────

/**
 * VALID_TRANSITIONS[fromStatus] = [allowed toStatus, ...]
 * Guards against impossible state jumps.
 */
export const VALID_TRANSITIONS = {
  draft:                   ['scheduled','assigned','cancelled'],
  scheduled:               ['assigned','cancelled'],
  assigned:                ['travelling','in_progress','cancelled','needs_supervisor_review'],
  travelling:              ['arrived','in_progress','cancelled','needs_supervisor_review'],
  arrived:                 ['in_progress','cancelled','needs_supervisor_review'],
  in_progress:             ['check_in_due','completed','escalating','needs_supervisor_review','cancelled'],
  check_in_due:            ['in_progress','overdue','escalating','needs_supervisor_review'],
  overdue:                 ['in_progress','escalating','needs_supervisor_review','cancelled'],
  escalating:              ['needs_supervisor_review','cancelled'],
  needs_supervisor_review: ['in_progress','completed','cancelled'],
  completed:               [],   // terminal — no auto-transitions
  cancelled:               [],
}

/** Map mission status → responder status */
const RESPONDER_STATUS_FOR_MISSION = {
  assigned:                RESPONDER_STATUS.ASSIGNED,
  travelling:              RESPONDER_STATUS.TRAVELLING,
  arrived:                 RESPONDER_STATUS.ARRIVED,
  in_progress:             RESPONDER_STATUS.ACTIVE_VISIT,
  check_in_due:            RESPONDER_STATUS.CHECK_IN_DUE,
  overdue:                 RESPONDER_STATUS.OVERDUE,
  escalating:              RESPONDER_STATUS.ESCALATING,
  needs_supervisor_review: RESPONDER_STATUS.NEEDS_SUPERVISOR_REVIEW,
  completed:               RESPONDER_STATUS.AVAILABLE,
  cancelled:               RESPONDER_STATUS.AVAILABLE,
}

export function canTransition(fromStatus, toStatus) {
  const allowed = VALID_TRANSITIONS[fromStatus] || []
  return allowed.includes(toStatus)
}

/**
 * updateMissionStatusFromResponder(missionId, newStatus, responderId)
 * Updates mission + responder + creates evidence + sync queue.
 * Validates transition before writing.
 * Returns { ok, mission, error }
 */
export function updateMissionStatusFromResponder(missionId, newStatus, responderId) {
  try {
    const mission = missionTable.get(missionId)
    if (!mission) return { ok: false, error: 'Mission not found.' }

    if (!canTransition(mission.status, newStatus)) {
      return {
        ok: false,
        error: `Cannot move from "${mission.status}" to "${newStatus}". Check the workflow.`
      }
    }

    const demo = isDemo()
    const ts   = now()

    // Update mission
    const updatedMission = missionTable.update(missionId, {
      status:    newStatus,
      updatedAt: ts,
      escalationState: ['escalating','needs_supervisor_review'].includes(newStatus)
        ? newStatus : mission.escalationState,
      completionOutcome: newStatus === 'completed'
        ? (mission.completionOutcome || 'visit_completed') : mission.completionOutcome,
    })

    // Update responder
    if (responderId) {
      const rStatus = RESPONDER_STATUS_FOR_MISSION[newStatus] || RESPONDER_STATUS.AVAILABLE
      responderTable.update(responderId, {
        status:          rStatus,
        updatedAt:       ts,
        currentMissionId: newStatus === 'completed' ? null : missionId,
      })
    }

    // Create evidence record for status change
    evidenceTable.create({
      missionId,
      visitId:          null,
      responderId:      responderId || null,
      serviceUserId:    mission.linkedServiceUserId || null,
      recordType:       'responder_update',
      recordedByType:   'responder',
      recordedById:     responderId || 'unknown',
      title:            `Status updated: ${newStatus.replace(/_/g,' ')}`,
      content:          `Mission status changed to "${newStatus}" by responder.`,
      timestamp:        ts,
      dataFreshness:    'current',
      syncStatus:       SYNC_STATUS.PENDING,
      demoRecord:       demo,
      createdAt:        ts,
      updatedAt:        ts,
    })

    // Sync queue
    createSyncQueueItem('mission', missionId, 'update', { status: newStatus }, demo)

    return { ok: true, mission: updatedMission }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Safety Check-in ──────────────────────────────────────────

/**
 * submitResponderCheckIn({ missionId, responderId, safetyStatus, message, riskLevel })
 * Creates checkIn + evidenceRecord + updates responder.lastCheckInAt + sync queue.
 * Returns { ok, checkIn, error }
 */
export function submitResponderCheckIn({ missionId, responderId, safetyStatus, message, riskLevel }) {
  try {
    if (!responderId) return { ok: false, error: 'Responder ID is required.' }

    const demo = isDemo()
    const ts   = now()

    const checkIn = checkInTable.create({
      missionId:   missionId || null,
      responderId,
      serviceUserId: null,
      checkInType:   'responder_safety',
      safetyStatus:  safetyStatus || 'safe',
      message:       message || '',
      riskLevel:     riskLevel || RISK_LEVEL.LOW,
      location:      null,
      locationNote:  '',
      needsReview:   ['concern','escalating','needs_support'].includes(safetyStatus),
      syncStatus:    SYNC_STATUS.PENDING,
      demoRecord:    demo,
      createdAt:     ts,
      updatedAt:     ts,
    })

    // Update responder
    responderTable.update(responderId, {
      lastCheckInAt: ts,
      safetyStatus:  safetyStatus || 'ok',
      updatedAt:     ts,
    })

    // Update mission timestamp
    if (missionId) {
      try { missionTable.update(missionId, { updatedAt: ts }) } catch {}
    }

    // Evidence record
    evidenceTable.create({
      missionId:      missionId || null,
      visitId:        null,
      responderId,
      serviceUserId:  null,
      recordType:     'check_in',
      recordedByType: 'responder',
      recordedById:   responderId,
      title:          `Safety Check-in — ${safetyStatus}`,
      content:        message || `Responder safety check-in. Status: ${safetyStatus}.`,
      timestamp:      ts,
      dataFreshness:  'current',
      syncStatus:     SYNC_STATUS.PENDING,
      demoRecord:     demo,
      createdAt:      ts,
      updatedAt:      ts,
    })

    createSyncQueueItem('checkIn', checkIn.id, 'create', { safetyStatus }, demo)

    return { ok: true, checkIn }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Welfare Checklist ────────────────────────────────────────

/**
 * Checklist items definition
 */
export const WELFARE_CHECKLIST_ITEMS = [
  { id: 'visit_purpose',    label: 'Visit purpose confirmed with organisation' },
  { id: 'person_contact',   label: 'Person/contact present, or contact attempt recorded' },
  { id: 'wellbeing_status', label: 'Basic wellbeing/support status recorded' },
  { id: 'safety_concern',   label: 'Any immediate safety concern noted (advisory)' },
  { id: 'support_need',     label: 'Support need or update recorded' },
  { id: 'outcome_notes',    label: 'Outcome notes completed' },
  { id: 'follow_up',        label: 'Follow-up required marked if needed' },
  { id: 'evidence_review',  label: 'Evidence/notes reviewed before completion' },
]

/**
 * saveWelfareChecklist({ missionId, responderId, serviceUserId, items, outcomeNotes, followUpRequired })
 * items = [{ id, status: 'complete'|'not_complete'|'not_applicable', note: '' }]
 * Returns { ok, visit, error }
 */
export function saveWelfareChecklist({
  missionId, responderId, serviceUserId,
  items, outcomeNotes, followUpRequired
}) {
  try {
    const demo = isDemo()
    const ts   = now()

    const allComplete = items.every(i =>
      i.status === 'complete' || i.status === 'not_applicable'
    )
    const checklistStatus = allComplete ? 'completed' : 'in_progress'

    // Create or update welfareVisit
    const existingVisits = welfareVisitTable.list().filter(v =>
      v.missionId === missionId && v.responderId === responderId
    )
    let visit
    if (existingVisits.length > 0) {
      visit = welfareVisitTable.update(existingVisits[0].id, {
        checklistStatus,
        checklistItems:  items,
        outcome:         outcomeNotes || null,
        followUpRequired: followUpRequired || false,
        updatedAt:       ts,
      })
    } else {
      visit = welfareVisitTable.create({
        missionId:        missionId || null,
        responderId:      responderId || null,
        serviceUserId:    serviceUserId || null,
        visitType:        'welfare_visit',
        scheduledTime:    null,
        startTime:        ts,
        endTime:          null,
        checklistStatus,
        checklistItems:   items,
        outcome:          outcomeNotes || null,
        followUpRequired: followUpRequired || false,
        riskFlags:        [],
        incidentIds:      [],
        evidenceRecordIds:[],
        syncStatus:       SYNC_STATUS.PENDING,
        demoRecord:       demo,
        createdAt:        ts,
        updatedAt:        ts,
      })
    }

    // Evidence record (append-only — never overwrite)
    evidenceTable.create({
      missionId:      missionId || null,
      visitId:        visit.id,
      responderId:    responderId || null,
      serviceUserId:  serviceUserId || null,
      recordType:     'checklist',
      recordedByType: 'responder',
      recordedById:   responderId || 'unknown',
      title:          `Welfare Checklist — ${checklistStatus}`,
      content:        JSON.stringify({ items, outcomeNotes, followUpRequired }),
      timestamp:      ts,
      dataFreshness:  'current',
      syncStatus:     SYNC_STATUS.PENDING,
      demoRecord:     demo,
      createdAt:      ts,
      updatedAt:      ts,
    })

    // Update mission checklist state
    if (missionId) {
      try { missionTable.update(missionId, { updatedAt: ts }) } catch {}
    }

    createSyncQueueItem('welfareVisit', visit.id, existingVisits.length > 0 ? 'update' : 'create', { checklistStatus }, demo)

    return { ok: true, visit, checklistStatus }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Notes / Outcome ─────────────────────────────────────────

/**
 * addResponderNote({ missionId, responderId, serviceUserId, noteType, content, followUpRequired, supervisorReviewRequired })
 * noteType: 'visit_note' | 'outcome_note' | 'general'
 * Append-only — never overwrites previous notes.
 * Returns { ok, evidence, error }
 */
export function addResponderNote({
  missionId, responderId, serviceUserId,
  noteType, content, followUpRequired, supervisorReviewRequired
}) {
  try {
    if (!content?.trim()) return { ok: false, error: 'Note content is required.' }

    const demo = isDemo()
    const ts   = now()

    const evidence = evidenceTable.create({
      missionId:      missionId || null,
      visitId:        null,
      responderId:    responderId || null,
      serviceUserId:  serviceUserId || null,
      recordType:     noteType === 'outcome_note' ? 'note' : 'responder_update',
      recordedByType: 'responder',
      recordedById:   responderId || 'unknown',
      title:          noteType === 'outcome_note' ? 'Outcome Note' : 'Responder Note',
      content:        content.trim(),
      tags:           [noteType, followUpRequired ? 'follow_up_required' : '', supervisorReviewRequired ? 'supervisor_review' : ''].filter(Boolean),
      timestamp:      ts,
      dataFreshness:  'current',
      syncStatus:     SYNC_STATUS.PENDING,
      demoRecord:     demo,
      createdAt:      ts,
      updatedAt:      ts,
    })

    // If outcome note, update mission completionOutcome field
    if (missionId && noteType === 'outcome_note') {
      try {
        const mission = missionTable.get(missionId)
        if (mission) {
          missionTable.update(missionId, {
            completionOutcome: content.slice(0, 200),
            updatedAt: ts,
          })
        }
      } catch {}
    }

    if (supervisorReviewRequired && missionId) {
      try {
        missionTable.update(missionId, {
          escalationState: 'needs_supervisor_review',
          updatedAt: ts,
        })
      } catch {}
    }

    createSyncQueueItem('evidenceRecord', evidence.id, 'create', { noteType }, demo)

    return { ok: true, evidence }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Risk Flag ────────────────────────────────────────────────

/**
 * raiseResponderRiskFlag({ missionId, responderId, linkedServiceUserId, riskLevel, triggerType, title, description, requiresSupervisorReview })
 * Returns { ok, flag, error }
 */
export function raiseResponderRiskFlag({
  missionId, responderId, linkedServiceUserId,
  riskLevel, triggerType, title, description, requiresSupervisorReview
}) {
  try {
    if (!title?.trim()) return { ok: false, error: 'Risk flag title is required.' }
    if (!riskLevel)     return { ok: false, error: 'Risk level is required.' }

    const demo = isDemo()
    const ts   = now()
    const highRisk = riskLevel === RISK_LEVEL.HIGH || riskLevel === RISK_LEVEL.CRITICAL

    const flag = riskFlagTable.create({
      missionId:               missionId || null,
      responderId:             responderId || null,
      linkedServiceUserId:     linkedServiceUserId || null,
      riskLevel,
      triggerType:             triggerType || 'responder_escalation',
      title:                   title.trim(),
      description:             description?.trim() || '',
      status:                  'open',
      requiresSupervisorReview: requiresSupervisorReview || highRisk,
      humanReviewed:           false,
      reviewedById:            null,
      reviewedAt:              null,
      demoRecord:              demo,
      createdAt:               ts,
      updatedAt:               ts,
    })

    // High/critical risk → escalate mission
    if (missionId && highRisk) {
      try {
        const mission = missionTable.get(missionId)
        if (mission && !['completed','cancelled'].includes(mission.status)) {
          missionTable.update(missionId, {
            escalationState: 'needs_supervisor_review',
            status: mission.status === 'in_progress' ? 'needs_supervisor_review' : mission.status,
            updatedAt: ts,
          })
          if (responderId) {
            responderTable.update(responderId, {
              status: RESPONDER_STATUS.NEEDS_SUPERVISOR_REVIEW,
              updatedAt: ts,
            })
          }
        }
      } catch {}
    }

    // Evidence record (append-only)
    evidenceTable.create({
      missionId:      missionId || null,
      visitId:        null,
      responderId:    responderId || null,
      serviceUserId:  linkedServiceUserId || null,
      recordType:     highRisk ? 'escalation' : 'responder_update',
      recordedByType: 'responder',
      recordedById:   responderId || 'unknown',
      title:          `Risk Flag Raised — ${riskLevel}: ${title}`,
      content:        description || '',
      timestamp:      ts,
      dataFreshness:  'current',
      syncStatus:     SYNC_STATUS.PENDING,
      demoRecord:     demo,
      createdAt:      ts,
      updatedAt:      ts,
    })

    createSyncQueueItem('riskFlag', flag.id, 'create', { riskLevel, triggerType }, demo)

    return { ok: true, flag, escalated: highRisk }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Incident Report ──────────────────────────────────────────

/**
 * submitIncidentReport({ missionId, responderId, serviceUserId, title, category, severity, description, actionTaken, supervisorReviewStatus })
 * Returns { ok, incident, error }
 */
export function submitIncidentReport({
  missionId, responderId, serviceUserId,
  title, category, severity, description, actionTaken, supervisorReviewStatus
}) {
  try {
    if (!title?.trim())       return { ok: false, error: 'Incident title is required.' }
    if (!category)            return { ok: false, error: 'Incident category is required.' }
    if (!severity)            return { ok: false, error: 'Severity is required.' }
    if (!description?.trim()) return { ok: false, error: 'Description is required.' }

    const demo    = isDemo()
    const ts      = now()
    const highSev = severity === 'high' || severity === 'critical'
    const needsReview = supervisorReviewStatus === 'required' ||
                        supervisorReviewStatus === 'pending'   || highSev

    const incident = incidentTable.create({
      missionId:              missionId || null,
      responderId:            responderId || null,
      serviceUserId:          serviceUserId || null,
      title:                  title.trim(),
      category,
      severity,
      description:            description.trim(),
      actionTaken:            actionTaken?.trim() || '',
      supervisorReviewStatus: needsReview ? 'pending' : (supervisorReviewStatus || 'not_required'),
      evidenceRecordIds:      [],
      syncStatus:             SYNC_STATUS.PENDING,
      demoRecord:             demo,
      createdAt:              ts,
      updatedAt:              ts,
    })

    // Evidence record (append-only)
    const ev = evidenceTable.create({
      missionId:      missionId || null,
      visitId:        null,
      responderId:    responderId || null,
      serviceUserId:  serviceUserId || null,
      recordType:     'incident',
      recordedByType: 'responder',
      recordedById:   responderId || 'unknown',
      title:          `Incident Report — ${severity}: ${title}`,
      content:        `${description}\n\nAction taken: ${actionTaken || 'None recorded.'}`,
      timestamp:      ts,
      dataFreshness:  'current',
      syncStatus:     SYNC_STATUS.PENDING,
      demoRecord:     demo,
      createdAt:      ts,
      updatedAt:      ts,
    })

    // Auto risk flag for high/critical
    if (highSev || needsReview) {
      try {
        raiseResponderRiskFlag({
          missionId,
          responderId,
          linkedServiceUserId: serviceUserId,
          riskLevel: highSev ? severity : RISK_LEVEL.MEDIUM,
          triggerType: 'unresolved_incident',
          title: `Incident: ${title}`,
          description: description.slice(0, 200),
          requiresSupervisorReview: needsReview,
        })
      } catch {}
    }

    // Escalate mission if needed
    if (missionId && (highSev || needsReview)) {
      try {
        const mission = missionTable.get(missionId)
        if (mission && !['completed','cancelled'].includes(mission.status)) {
          missionTable.update(missionId, {
            escalationState: 'needs_supervisor_review',
            updatedAt: ts,
          })
        }
      } catch {}
    }

    createSyncQueueItem('incident', incident.id, 'create', { severity, category }, demo)

    return { ok: true, incident, evidence: ev, needsReview }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Escalation Request ───────────────────────────────────────

/**
 * requestEscalation({ missionId, responderId, serviceUserId, reason, urgency, message, immediateDangerAcknowledgement })
 * Returns { ok, flag, checkIn, error }
 */
export function requestEscalation({
  missionId, responderId, serviceUserId,
  reason, urgency, message, immediateDangerAcknowledgement
}) {
  try {
    if (!reason?.trim()) return { ok: false, error: 'Escalation reason is required.' }

    const demo = isDemo()
    const ts   = now()

    // Update mission escalation state
    if (missionId) {
      try {
        const mission = missionTable.get(missionId)
        const newStatus = urgency === 'critical' || urgency === 'urgent'
          ? 'escalating'
          : 'needs_supervisor_review'
        if (mission && !['completed','cancelled'].includes(mission.status)) {
          missionTable.update(missionId, {
            status:         newStatus,
            escalationState: 'supervisor_review_required',
            updatedAt:       ts,
          })
        }
        if (responderId) {
          responderTable.update(responderId, {
            status:    RESPONDER_STATUS.NEEDS_SUPERVISOR_REVIEW,
            updatedAt: ts,
          })
        }
      } catch {}
    }

    // Risk flag
    const flag = riskFlagTable.create({
      missionId:               missionId || null,
      responderId:             responderId || null,
      linkedServiceUserId:     serviceUserId || null,
      riskLevel:               urgency === 'critical' ? RISK_LEVEL.CRITICAL :
                               urgency === 'urgent'   ? RISK_LEVEL.HIGH     :
                               urgency === 'priority' ? RISK_LEVEL.MEDIUM   : RISK_LEVEL.LOW,
      triggerType:             'responder_escalation',
      title:                   `Escalation Request — ${urgency}: ${reason.slice(0, 80)}`,
      description:             message?.trim() || reason,
      status:                  'open',
      requiresSupervisorReview: true,
      humanReviewed:           false,
      reviewedById:            null,
      reviewedAt:              null,
      demoRecord:              demo,
      createdAt:               ts,
      updatedAt:               ts,
    })

    // Evidence record
    evidenceTable.create({
      missionId:      missionId || null,
      visitId:        null,
      responderId:    responderId || null,
      serviceUserId:  serviceUserId || null,
      recordType:     'escalation',
      recordedByType: 'responder',
      recordedById:   responderId || 'unknown',
      title:          `Escalation Request — ${urgency}`,
      content:        `Reason: ${reason}\n\nMessage: ${message || ''}\n\nImmediate danger acknowledged: ${immediateDangerAcknowledgement ? 'Yes' : 'No'}`,
      timestamp:      ts,
      dataFreshness:  'current',
      syncStatus:     SYNC_STATUS.PENDING,
      demoRecord:     demo,
      createdAt:      ts,
      updatedAt:      ts,
    })

    // Check-in record (supervisor note)
    const checkIn = checkInTable.create({
      missionId:    missionId || null,
      responderId:  responderId || null,
      serviceUserId: serviceUserId || null,
      checkInType:  'supervisor_note',
      safetyStatus: urgency === 'critical' ? 'escalating' : 'needs_support',
      message:      `Escalation request submitted. Urgency: ${urgency}. Reason: ${reason}`,
      riskLevel:    urgency === 'critical' ? RISK_LEVEL.CRITICAL : RISK_LEVEL.HIGH,
      location:     null,
      locationNote: '',
      needsReview:  true,
      syncStatus:   SYNC_STATUS.PENDING,
      demoRecord:   demo,
      createdAt:    ts,
      updatedAt:    ts,
    })

    createSyncQueueItem('escalation', flag.id, 'create', { urgency, reason: reason.slice(0, 100) }, demo)

    return { ok: true, flag, checkIn }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Evidence helper ──────────────────────────────────────────

export function getEvidenceForMission(missionId) {
  const demo = isDemo()
  const all  = demo ? evidenceTable.list() : evidenceTable.listLive()
  return all
    .filter(e => e.missionId === missionId)
    .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0))
}

// ─── Sync summary for PWA ─────────────────────────────────────

export function getPWASyncSummary() {
  const demo  = isDemo()
  const items = demo ? syncQueueTable.list() : syncQueueTable.listLive()
  const pending  = items.filter(i => i.syncStatus === 'pending').length
  const failed   = items.filter(i => i.syncStatus === 'failed').length
  const offline  = items.filter(i => i.syncStatus === 'offline').length
  const synced   = items.filter(i => i.syncStatus === 'synced').length
  return { pending, failed, offline, synced, total: items.length, unhealthy: pending + failed + offline }
}

export default {
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
}
