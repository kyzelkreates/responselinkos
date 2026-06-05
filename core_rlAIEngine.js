/**
 * ============================================================
 * ResponseLink OS™ — 4P3X Intelligent AI™ Engine
 * core_rlAIEngine.js
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 8 — AI Oversight Agents + Reports
 *
 * LOCAL RULE-BASED ADVISORY SYSTEM — NO EXTERNAL API KEYS
 *
 * ⚠ MANDATORY ADVISORY NOTICE:
 *   4P3X Intelligent AI™ provides advisory prompts based on
 *   recorded data only. It does NOT:
 *     • verify facts independently
 *     • diagnose people
 *     • replace safeguarding professionals
 *     • replace emergency services
 *     • make final safeguarding, legal, clinical, or welfare decisions
 *     • accuse individuals
 *     • create or alter evidence records
 *     • delete audit records
 *     • contact emergency services automatically
 *     • override human supervisors
 *     • decide someone is safe or unsafe as a final fact
 *
 *   All prompts require human review.
 *   If someone is in immediate danger, contact emergency services.
 *
 * ARCHITECTURE:
 *   This is a fully local, rule-based advisory engine.
 *   No external AI/LLM API is called.
 *   No API keys are used or required.
 *   No secrets are stored.
 *   All analysis reads from SSOT via existing selectors.
 *
 *   Future optional AI provider:
 *     4P3X API Config Guard™ — future optional AI provider placeholder.
 *     Not required for demo. Configured in Run 9 if needed.
 *     Keys must NEVER be hardcoded here.
 * ============================================================
 */

import { getDemoMode } from './core_rlData'
import {
  getMissions, getResponders, getServiceUsers,
  getOpenIncidents, getOpenRiskFlags, getHighRiskMissions,
  getOpenHelpRequests, getDashboardMetrics,
  getRiskLevelColor,
} from './core_rlSelectors'
import {
  getDashboardRiskStatus, detectEvidenceGaps,
  detectDataFreshnessWarnings, getSupervisorReviewQueue,
  getOverdueResponderCheckIns as getRiskOverdueResponders,
  getMissedServiceUserCheckIns as getRiskMissedSU,
  getUrgentHelpRequests,
} from './core_rlRiskEngine'
import {
  getSyncQueueSummary, getLatestSyncedActivity,
} from './core_rlSyncEngine'

// ─── Engine constants ──────────────────────────────────────────
export const AI_ENGINE_VERSION = 'Run 8 — Local Rule-Based Advisory'
export const ADVISORY_NOTICE = '4P3X Intelligent AI™ provides advisory prompts based on recorded data. It does not verify facts independently, diagnose people, replace safeguarding professionals, replace emergency services, or make final decisions.'
export const EVIDENCE_LIMITATION = 'Records are only as complete as the information entered and synced. AI summaries do not verify facts independently. Gaps may exist for valid reasons. Human review is required.'

// ─── Agent 1 — Welfare Risk AI ────────────────────────────────

export function runWelfareRiskAI() {
  const demo       = getDemoMode()
  const missions   = getMissions()
  const responders = getResponders()
  const sus        = getServiceUsers()
  const incidents  = getOpenIncidents()
  const riskFlags  = getOpenRiskFlags()
  const highRisk   = getHighRiskMissions()
  const overdueR   = getRiskOverdueResponders()
  const missedSU   = getRiskMissedSU()
  const urgentHelp = getUrgentHelpRequests()
  const syncQ      = getSyncQueueSummary()
  const freshness  = detectDataFreshnessWarnings()
  const riskStatus = getDashboardRiskStatus()
  const reviewQ    = getSupervisorReviewQueue()

  const prompts   = []
  const actions   = []

  // ── Overdue responder check-ins ──
  overdueR.forEach(r => {
    prompts.push({
      id:        `overdue-r-${r.id}`,
      severity:  r.status === 'escalating' ? 'critical' : 'high',
      icon:      'UserX',
      title:     `Overdue check-in — ${r.displayName}`,
      summary:   `Responder ${r.displayName} has not checked in within the expected window. Status: ${r.status?.replace(/_/g,' ')}. Last check-in time is not confirmed.`,
      prompt:    'Supervisor review is recommended. Contact the responder through your organisation\'s lone-working procedure. Do not assume the responder is safe or unsafe without human verification.',
      source:    'responder',
      entityId:  r.id,
      advisory:  true,
    })
    actions.push({
      id:       `action-overdue-r-${r.id}`,
      label:    `Contact ${r.displayName} — overdue check-in`,
      detail:   'Follow your organisation\'s lone-working and escalation procedures.',
      icon:     'Phone',
      priority: r.status === 'escalating' ? 1 : 2,
    })
  })

  // ── Missed service user check-ins ──
  missedSU.forEach(su => {
    prompts.push({
      id:        `missed-su-${su.id}`,
      severity:  'high',
      icon:      'HeartOff',
      title:     `Missed check-in — ${su.displayName}`,
      summary:   `Service user ${su.displayName} has a missed check-in recorded. Wellbeing status: ${su.wellbeingStatus?.replace(/_/g,' ')}.`,
      prompt:    'Review service user record. Consider contacting their linked responder or support worker through your organisation\'s procedure. This is an advisory prompt — human judgement is required.',
      source:    'serviceUser',
      entityId:  su.id,
      advisory:  true,
    })
    actions.push({
      id:       `action-missed-su-${su.id}`,
      label:    `Review missed check-in — ${su.displayName}`,
      detail:   'Check linked mission and responder. Follow your organisation\'s contact procedure.',
      icon:     'HeartHandshake',
      priority: 2,
    })
  })

  // ── Urgent help requests ──
  urgentHelp.forEach(su => {
    const isCritical = su.helpRequestStatus === 'urgent_help_requested'
    prompts.push({
      id:        `urgent-${su.id}`,
      severity:  isCritical ? 'critical' : 'high',
      icon:      'LifeBuoy',
      title:     `Help request — ${su.displayName}`,
      summary:   `Service user ${su.displayName} has submitted a help request (${su.helpRequestStatus?.replace(/_/g,' ')}). Supervisor review and direct contact are recommended.`,
      prompt:    isCritical
        ? 'This is classified as urgent. If the person is in immediate danger, contact emergency services first. Then follow your organisation\'s escalation procedure. This app does not contact emergency services automatically.'
        : 'Review this help request. Contact the service user or their linked responder through your organisation\'s procedure. This is an advisory prompt — human judgement is required.',
      source:    'serviceUser',
      entityId:  su.id,
      advisory:  true,
    })
    actions.push({
      id:       `action-help-${su.id}`,
      label:    `Review urgent help request — ${su.displayName}`,
      detail:   isCritical ? 'If immediate danger — contact emergency services first. Then follow your organisation\'s escalation procedure.' : 'Contact service user or linked responder through your organisation\'s procedure.',
      icon:     'LifeBuoy',
      priority: isCritical ? 1 : 2,
    })
  })

  // ── High / critical risk missions ──
  highRisk.slice(0, 5).forEach(m => {
    prompts.push({
      id:        `high-risk-m-${m.id}`,
      severity:  m.riskLevel === 'critical' ? 'critical' : 'high',
      icon:      m.riskLevel === 'critical' ? 'Flame' : 'AlertTriangle',
      title:     `${m.riskLevel === 'critical' ? 'Critical' : 'High'} risk mission — ${m.title}`,
      summary:   `Mission "${m.title}" is classified as ${m.riskLevel} risk. Status: ${m.status?.replace(/_/g,' ')}. Assigned to: ${responders.find(r => r.id === m.assignedResponderId)?.displayName || 'unassigned'}.`,
      prompt:    'Supervisor review is recommended. Review the mission record, linked responder, and service user. This is an advisory risk classification — human judgement is required before any action.',
      source:    'mission',
      entityId:  m.id,
      advisory:  true,
    })
    if (!['completed','cancelled'].includes(m.status)) {
      actions.push({
        id:       `action-hr-${m.id}`,
        label:    `Review high-risk mission — ${m.title}`,
        detail:   'Review mission record, assigned responder, and linked service user. Add supervisor review note.',
        icon:     'AlertTriangle',
        priority: m.riskLevel === 'critical' ? 1 : 2,
      })
    }
  })

  // ── Unresolved incidents ──
  incidents.slice(0, 5).forEach(inc => {
    prompts.push({
      id:        `inc-${inc.id}`,
      severity:  inc.severity === 'critical' ? 'critical' : inc.severity === 'high' ? 'high' : 'medium',
      icon:      'AlertOctagon',
      title:     `Unresolved incident — ${inc.title}`,
      summary:   `Incident "${inc.title}" (${inc.category?.replace(/_/g,' ')}) has not been marked reviewed. Severity: ${inc.severity}. Action taken field is ${inc.actionTaken ? 'recorded' : 'MISSING'}.`,
      prompt:    `Supervisor review is recommended. ${!inc.actionTaken ? 'No action taken has been recorded — this should be addressed before the record is closed.' : ''} Human review is required before treating this as resolved.`,
      source:    'incident',
      entityId:  inc.id,
      advisory:  true,
    })
    actions.push({
      id:       `action-inc-${inc.id}`,
      label:    `Review incident — ${inc.title}`,
      detail:   !inc.actionTaken ? 'Add "action taken" note and complete supervisor review.' : 'Complete supervisor review and mark reviewed.',
      icon:     'AlertOctagon',
      priority: inc.severity === 'critical' ? 1 : 3,
    })
  })

  // ── Supervisor review queue ──
  if (reviewQ.length > 0) {
    prompts.push({
      id:       'review-queue',
      severity: reviewQ.some(r => r.riskLevel === 'critical') ? 'critical' : 'high',
      icon:     'ClipboardCheck',
      title:    `${reviewQ.length} item(s) require supervisor review`,
      summary:  `${reviewQ.length} record(s) are in the supervisor review queue. These include risk flags, incidents, and help requests requiring human assessment.`,
      prompt:   'Open the Risk & Escalation Centre to review each item. All items require human judgement — the system cannot close or resolve these automatically.',
      source:   'system',
      advisory: true,
    })
    actions.push({
      id:       'action-review-queue',
      label:    `Review ${reviewQ.length} item(s) in supervisor queue`,
      detail:   'Open Risk & Escalation Centre and review each item individually.',
      icon:     'ClipboardCheck',
      priority: 1,
    })
  }

  // ── Sync health warnings ──
  if (freshness.hasWarning) {
    freshness.warnings.forEach((w, i) => {
      prompts.push({
        id:       `fresh-${i}`,
        severity: w.type === 'failed' || w.type === 'conflict' ? 'high' : 'medium',
        icon:     'WifiOff',
        title:    `Data freshness: ${w.type.replace(/_/g,' ')} (${w.count})`,
        summary:  w.message,
        prompt:   'Offline or pending records may not have reached the dashboard. Do not assume missing updates mean a person is safe. Human review of sync records is recommended.',
        source:   'sync',
        advisory: true,
      })
    })
  }

  // ── Overall summary ──
  const criticalCount  = prompts.filter(p => p.severity === 'critical').length
  const highCount      = prompts.filter(p => p.severity === 'high').length
  const totalMissions  = missions.length
  const activeMissions = missions.filter(m => !['completed','cancelled','draft'].includes(m.status)).length

  const overallRisk = criticalCount > 0 ? 'critical' : highCount > 0 ? 'high' : prompts.length > 0 ? 'medium' : 'low'

  const summaryText =
    criticalCount > 0
      ? `CRITICAL: ${criticalCount} critical advisory prompt(s) require immediate supervisor attention. All are advisory — human review is required before any action.`
    : highCount > 0
      ? `HIGH ADVISORY: ${highCount} high-priority prompt(s) identified. Supervisor review recommended across missions, responders, and service users.`
    : prompts.length > 0
      ? `MEDIUM ADVISORY: ${prompts.length} advisory prompt(s) detected. No critical alerts at this time. Routine supervisor monitoring recommended.`
      : totalMissions > 0
        ? `LOW/CLEAR: No critical or high advisory prompts detected at this time. ${activeMissions} active mission(s) being monitored. Routine checks recommended.`
        : `NO DATA: No missions found in ${demo ? 'demo' : 'live'} mode. ${demo ? 'Use demo scenarios to see agent analysis.' : 'Configure backend and real data to enable live monitoring.'}`

  // Sort actions by priority
  const sortedActions = actions.sort((a, b) => (a.priority || 9) - (b.priority || 9))

  return {
    agentId:       '4P3X-AI-1',
    agentName:     '4P3X Intelligent AI™ 1 — Welfare Risk AI',
    version:       AI_ENGINE_VERSION,
    runAt:         new Date().toISOString(),
    demoMode:      demo,
    overallRisk,
    summaryText,
    criticalCount,
    highCount,
    promptCount:   prompts.length,
    prompts:       prompts.sort((a, b) => {
      const ord = { critical:0, high:1, medium:2, low:3 }
      return (ord[a.severity]||3) - (ord[b.severity]||3)
    }),
    recommendedActions: sortedActions,
    metrics: {
      totalMissions, activeMissions,
      highRiskMissions: highRisk.length,
      overdueResponders: overdueR.length,
      missedCheckIns: missedSU.length,
      urgentHelpRequests: urgentHelp.length,
      unresolvedIncidents: incidents.length,
      openRiskFlags: riskFlags.length,
      supervisorReviewRequired: reviewQ.length,
      syncPending: syncQ.pending || 0,
      syncFailed: syncQ.failed || 0,
      syncConflict: syncQ.conflict || 0,
    },
    advisoryNotice: ADVISORY_NOTICE,
    limitation:     EVIDENCE_LIMITATION,
  }
}

// ─── Agent 2 — Safeguarding & Evidence AI ─────────────────────

export function runSafeguardingEvidenceAI() {
  const demo      = getDemoMode()
  const missions  = getMissions()
  const incidents = getOpenIncidents()
  const flags     = getOpenRiskFlags()
  const gaps      = detectEvidenceGaps()
  const reviewQ   = getSupervisorReviewQueue()

  const prompts   = []
  const actions   = []

  // ── Missing evidence on completed missions ──
  const completedNoOutcome = missions.filter(m =>
    m.status === 'completed' && !m.outcomeNotes?.trim()
  )
  completedNoOutcome.slice(0, 5).forEach(m => {
    prompts.push({
      id:       `no-outcome-${m.id}`,
      severity: 'medium',
      icon:     'FileText',
      category: 'missing_evidence',
      title:    `No outcome notes — "${m.title}"`,
      summary:  'This mission is marked completed but has no outcome notes recorded.',
      prompt:   'Add objective outcome notes before treating this record as complete. Notes should describe what was observed, not interpret or diagnose. Do not add invented details.',
      source:   'mission', entityId: m.id, advisory: true,
    })
    actions.push({
      id: `action-outcome-${m.id}`,
      label: `Add outcome notes — ${m.title}`,
      detail: 'Record what was observed objectively. Do not interpret or diagnose.',
      icon: 'FileText', priority: 3,
    })
  })

  // ── Incidents missing actionTaken ──
  const incNoAction = incidents.filter(i => !i.actionTaken?.trim())
  incNoAction.slice(0, 5).forEach(i => {
    prompts.push({
      id:       `inc-no-action-${i.id}`,
      severity: i.severity === 'critical' ? 'critical' : 'high',
      icon:     'AlertOctagon',
      category: 'missing_evidence',
      title:    `No action recorded — "${i.title}"`,
      summary:  `Incident "${i.title}" (${i.severity} severity) has no "action taken" note. This is a required evidence field.`,
      prompt:   'Record the action taken objectively before this incident is closed. Do not leave this field blank on a high or critical severity incident.',
      source:   'incident', entityId: i.id, advisory: true,
    })
    actions.push({
      id: `action-inc-notaken-${i.id}`,
      label: `Add "action taken" note — ${i.title}`,
      detail: 'Add objective action taken note. Required before supervisor review.',
      icon: 'AlertOctagon', priority: i.severity === 'critical' ? 1 : 2,
    })
  })

  // ── High/critical risk flags without supervisor note ──
  const flagsNoNote = flags.filter(f =>
    ['high','critical'].includes(f.riskLevel) && !f.supervisorNote?.trim() && !f.humanReviewed
  )
  flagsNoNote.slice(0, 5).forEach(f => {
    prompts.push({
      id:       `flag-no-note-${f.id}`,
      severity: f.riskLevel,
      icon:     'Flag',
      category: 'missing_supervisor_note',
      title:    `No supervisor note — "${f.title}"`,
      summary:  `${f.riskLevel === 'critical' ? 'Critical' : 'High'} risk flag "${f.title}" has no supervisor review note. This record requires human assessment.`,
      prompt:   'Add a supervisor review note explaining the assessment, any action taken, and the next steps. Note that this record requires human review — the AI cannot review or close it.',
      source:   'riskFlag', entityId: f.id, advisory: true,
    })
    actions.push({
      id: `action-flag-note-${f.id}`,
      label: `Add supervisor note — ${f.title}`,
      detail: 'Required for high/critical risk flags. Describe assessment and next steps.',
      icon: 'Flag', priority: f.riskLevel === 'critical' ? 1 : 2,
    })
  })

  // ── Incidents missing supervisor review ──
  const incNoReview = incidents.filter(i => i.supervisorReviewStatus === 'pending' || !i.supervisorReviewStatus)
  incNoReview.slice(0, 3).forEach(i => {
    prompts.push({
      id:       `inc-review-${i.id}`,
      severity: 'medium',
      icon:     'ClipboardX',
      category: 'missing_review',
      title:    `Supervisor review pending — "${i.title}"`,
      summary:  `Incident "${i.title}" has not been reviewed by a supervisor. Supervisor review status: ${i.supervisorReviewStatus || 'not set'}.`,
      prompt:   'Complete supervisor review. All incidents require human supervisor sign-off — this cannot be completed automatically.',
      source:   'incident', entityId: i.id, advisory: true,
    })
    actions.push({
      id: `action-inc-review-${i.id}`,
      label: `Complete supervisor review — ${i.title}`,
      detail: 'Open Risk & Escalation Centre. Review and mark reviewed or action required.',
      icon: 'ClipboardCheck', priority: 3,
    })
  })

  // ── Evidence gap prompts from risk engine ──
  gaps.slice(0, 5).forEach(g => {
    prompts.push({
      id:       `gap-${g.id}`,
      severity: g.severity,
      icon:     'FileX',
      category: 'evidence_gap',
      title:    g.title,
      summary:  g.description,
      prompt:   `${g.advisoryNote} Human review is required before any conclusion is drawn.`,
      source:   g.entityType, entityId: g.entityId, advisory: true,
    })
    actions.push({
      id: `action-gap-${g.id}`,
      label: `Address evidence gap — ${g.title}`,
      detail: 'Add missing evidence or note. Do not fabricate missing details.',
      icon: 'FileX',
      priority: g.severity === 'critical' ? 1 : g.severity === 'high' ? 2 : 4,
    })
  })

  // ── Report readiness ──
  const completedMissions     = missions.filter(m => m.status === 'completed').length
  const mWithOutcome          = missions.filter(m => m.status === 'completed' && m.outcomeNotes?.trim()).length
  const incWithAction         = incidents.filter(i => i.actionTaken?.trim()).length
  const incWithReview         = incidents.filter(i => i.supervisorReviewStatus === 'reviewed').length
  const flagsReviewed         = flags.filter(f => f.humanReviewed).length
  const urgentHelpReviewed    = getUrgentHelpRequests().filter(su => su.helpRequestReviewedAt).length
  const urgentHelpTotal       = getUrgentHelpRequests().length

  const totalChecks = (completedMissions > 0 ? 1 : 0) + (incidents.length > 0 ? 1 : 0) + (flags.length > 0 ? 1 : 0) + (urgentHelpTotal > 0 ? 1 : 0)
  const passChecks  = (completedMissions > 0 && mWithOutcome === completedMissions ? 1 : 0)
                    + (incidents.length > 0 && incWithReview === incidents.length ? 1 : 0)
                    + (flags.length > 0 && flagsReviewed === flags.length ? 1 : 0)
                    + (urgentHelpTotal === 0 || urgentHelpReviewed === urgentHelpTotal ? 1 : 0)

  const evidenceScore = totalChecks === 0 ? null : Math.round((passChecks / totalChecks) * 100)

  const readiness =
    gaps.length === 0 && incNoAction.length === 0 && flagsNoNote.length === 0 ? 'good'
    : gaps.length > 3 || incNoAction.filter(i => ['critical','high'].includes(i.severity)).length > 0 ? 'poor'
    : 'needs_attention'

  const readinessSummary =
    readiness === 'good'
      ? 'Evidence records appear complete for current records. Routine supervisor review recommended.'
    : readiness === 'poor'
      ? `Evidence quality needs attention: ${gaps.length} gap(s), ${incNoAction.length} incident(s) missing action notes. Human review required before any records are treated as final.`
      : `Some evidence gaps detected: ${gaps.length} gap(s) found. Review and complete records before supervisor sign-off.`

  const objectivityPrompts = [
    ...(missions.filter(m => m.outcomeNotes?.toLowerCase().includes('seemed fine') || m.outcomeNotes?.toLowerCase().includes('appeared okay'))
       .map(m => ({
         id: `obj-${m.id}`, severity: 'medium', icon: 'AlertCircle', category: 'wording_review',
         title: `Subjective wording detected — "${m.title}"`,
         summary: 'Outcome notes may contain subjective or interpretive language ("seemed fine", "appeared okay"). Objective language is recommended for supervisory records.',
         prompt: 'Consider revising to objective observations: what was seen, heard, or recorded — not interpreted or assumed.',
         source: 'mission', entityId: m.id, advisory: true,
       }))),
  ]

  const allPrompts = [...prompts, ...objectivityPrompts].sort((a, b) => {
    const ord = { critical:0, high:1, medium:2, low:3 }
    return (ord[a.severity]||3) - (ord[b.severity]||3)
  })

  return {
    agentId:         '4P3X-AI-2',
    agentName:       '4P3X Intelligent AI™ 2 — Safeguarding & Evidence AI',
    version:         AI_ENGINE_VERSION,
    runAt:           new Date().toISOString(),
    demoMode:        demo,
    evidenceScore,
    readiness,
    readinessSummary,
    gapCount:        gaps.length,
    promptCount:     allPrompts.length,
    prompts:         allPrompts,
    recommendedActions: actions.sort((a, b) => (a.priority||9) - (b.priority||9)),
    metrics: {
      completedMissions, mWithOutcome, incWithAction, incWithReview,
      flagsReviewed, gapCount: gaps.length,
      urgentHelpReviewed, urgentHelpTotal,
    },
    advisoryNotice: ADVISORY_NOTICE,
    limitation:     EVIDENCE_LIMITATION,
  }
}

// ─── AI Oversight Summary (both agents combined) ───────────────

export function getAIOversightSummary() {
  const a1  = runWelfareRiskAI()
  const a2  = runSafeguardingEvidenceAI()
  const syncQ = getSyncQueueSummary()

  const combinedCritical = a1.criticalCount + a2.prompts.filter(p => p.severity === 'critical').length
  const combinedHigh     = a1.highCount + a2.prompts.filter(p => p.severity === 'high').length

  return {
    runAt:        new Date().toISOString(),
    demoMode:     getDemoMode(),
    overallRisk:  combinedCritical > 0 ? 'critical' : combinedHigh > 0 ? 'high' : 'low',
    agent1:       a1,
    agent2:       a2,
    combined: {
      totalPrompts:         a1.promptCount + a2.promptCount,
      criticalPrompts:      combinedCritical,
      highPrompts:          combinedHigh,
      totalMissions:        a1.metrics.totalMissions,
      activeMissions:       a1.metrics.activeMissions,
      highRiskMissions:     a1.metrics.highRiskMissions,
      unresolvedIncidents:  a1.metrics.unresolvedIncidents,
      supervisorReviewRequired: a1.metrics.supervisorReviewRequired,
      evidenceGaps:         a2.gapCount,
      syncPending:          syncQ.pending || 0,
      syncFailed:           syncQ.failed || 0,
      syncConflict:         syncQ.conflict || 0,
      urgentHelpRequests:   a1.metrics.urgentHelpRequests,
      missedCheckIns:       a1.metrics.missedCheckIns,
      overdueResponders:    a1.metrics.overdueResponders,
    },
    advisoryNotice: ADVISORY_NOTICE,
    limitation:     EVIDENCE_LIMITATION,
  }
}

// ─── Report helpers ────────────────────────────────────────────

import {
  missionTable, responderTable, serviceUserTable,
  welfareVisitTable, checkInTable, riskFlagTable,
  incidentTable, evidenceTable, syncQueueTable,
  messageTable,
} from './core_rlData'

function _demo() { return getDemoMode() }
function _tbl(tbl) { return _demo() ? tbl.list() : tbl.listLive() }
const _now = () => new Date().toISOString()

export function getReportDataForMission(missionId) {
  const mission   = missionTable.get(missionId)
  if (!mission) return null
  const responder = mission.assignedResponderId ? responderTable.get(mission.assignedResponderId) : null
  const su        = mission.linkedServiceUserId  ? serviceUserTable.get(mission.linkedServiceUserId) : null
  const checkIns  = _tbl(checkInTable).filter(c => c.missionId === missionId)
  const flags     = _tbl(riskFlagTable).filter(f => f.missionId === missionId)
  const incidents = _tbl(incidentTable).filter(i => i.missionId === missionId)
  const evidence  = _tbl(evidenceTable).filter(e => e.missionId === missionId)
  const syncItems = _tbl(syncQueueTable).filter(s => s.entityType === 'mission' && s.entityId === missionId)
  const a1        = runWelfareRiskAI()
  const a2        = runSafeguardingEvidenceAI()
  const aiMPrompts = a1.prompts.filter(p => p.entityId === missionId)
  const ai2Prompts = a2.prompts.filter(p => p.entityId === missionId)

  return {
    reportType: 'mission', reportId: `RPT-M-${missionId.slice(-8).toUpperCase()}`,
    generatedAt: _now(), demoMode: _demo(),
    mission, responder, serviceUser: su,
    checkIns, riskFlags: flags, incidents, evidence, syncItems,
    aiWelfarePrompts: aiMPrompts,
    aiEvidencePrompts: ai2Prompts,
    evidenceCompletenessStatus: evidence.length > 0 ? 'records_present' : 'no_records',
    syncStatusSummary: syncItems.reduce((acc, s) => { acc[s.syncStatus] = (acc[s.syncStatus]||0)+1; return acc }, {}),
    limitation: EVIDENCE_LIMITATION,
  }
}

export function getReportDataForVisit(visitId) {
  const visit   = welfareVisitTable.get(visitId)
  if (!visit) return null
  const mission   = visit.missionId   ? missionTable.get(visit.missionId)     : null
  const responder = visit.responderId  ? responderTable.get(visit.responderId)  : null
  const su        = visit.serviceUserId? serviceUserTable.get(visit.serviceUserId): null
  const flags     = _tbl(riskFlagTable).filter(f => f.missionId === visit.missionId)
  const evidence  = _tbl(evidenceTable).filter(e => e.visitId === visitId)
  const a2        = runSafeguardingEvidenceAI()
  const gapPrompts= a2.prompts.filter(p => p.entityId === visit.missionId)

  const checklistCompleted = (() => {
    if (!visit.checklistItems || !visit.checklistItems.length) return null
    const done = visit.checklistItems.filter(i => i.completed).length
    return { total: visit.checklistItems.length, completed: done, percent: Math.round((done/visit.checklistItems.length)*100) }
  })()

  return {
    reportType: 'welfare_visit', reportId: `RPT-V-${visitId.slice(-8).toUpperCase()}`,
    generatedAt: _now(), demoMode: _demo(),
    visit, mission, responder, serviceUser: su,
    riskFlags: flags, evidence,
    checklistCompleted,
    aiEvidencePrompts: gapPrompts,
    outcomePresent: !!(visit.outcomeNotes?.trim()),
    limitation: EVIDENCE_LIMITATION,
  }
}

export function getReportDataForIncident(incidentId) {
  const incident  = incidentTable.get(incidentId)
  if (!incident) return null
  const mission   = incident.missionId   ? missionTable.get(incident.missionId)    : null
  const responder = incident.responderId ? responderTable.get(incident.responderId) : null
  const su        = incident.serviceUserId? serviceUserTable.get(incident.serviceUserId): null
  const flags     = _tbl(riskFlagTable).filter(f => f.missionId === incident.missionId)
  const evidence  = _tbl(evidenceTable).filter(e => e.missionId === incident.missionId)
  const syncItems = _tbl(syncQueueTable).filter(s => s.entityType === 'incident' && s.entityId === incidentId)
  const a2        = runSafeguardingEvidenceAI()
  const aiGaps    = a2.prompts.filter(p => p.entityId === incidentId)

  return {
    reportType: 'incident', reportId: `RPT-I-${incidentId.slice(-8).toUpperCase()}`,
    generatedAt: _now(), demoMode: _demo(),
    incident, mission, responder, serviceUser: su,
    riskFlags: flags, evidence, syncItems,
    aiEvidenceGapPrompts: aiGaps,
    actionTakenPresent: !!(incident.actionTaken?.trim()),
    supervisorReviewed: incident.supervisorReviewStatus === 'reviewed',
    limitation: EVIDENCE_LIMITATION,
  }
}

export function getServiceUserSummaryReport(serviceUserId) {
  const su        = serviceUserTable.get(serviceUserId)
  if (!su) return null
  const missions  = _tbl(missionTable).filter(m => m.linkedServiceUserId === serviceUserId)
  const checkIns  = _tbl(checkInTable).filter(c => c.serviceUserId === serviceUserId)
  const messages  = _tbl(messageTable).filter(m => m.serviceUserId === serviceUserId)
  const flags     = _tbl(riskFlagTable).filter(f => f.serviceUserId === serviceUserId || f.linkedServiceUserId === serviceUserId)
  const incidents = _tbl(incidentTable).filter(i => i.serviceUserId === serviceUserId)
  const a1        = runWelfareRiskAI()
  const aiPrompts = a1.prompts.filter(p => p.entityId === serviceUserId)

  // Privacy: supervisor/internal report only — messages and internal notes excluded from any public-facing output
  return {
    reportType: 'service_user_summary', reportId: `RPT-SU-${serviceUserId.slice(-8).toUpperCase()}`,
    generatedAt: _now(), demoMode: _demo(),
    // Only include safe display fields — no private staff-internal notes exposed
    serviceUser: {
      id:               su.id,
      displayName:      su.displayName,
      preferredName:    su.preferredName,
      supportType:      su.supportType,
      wellbeingStatus:  su.wellbeingStatus,
      helpRequestStatus:su.helpRequestStatus,
      lastCheckInAt:    su.lastCheckInAt,
      riskLevel:        su.riskLevel,
      createdAt:        su.createdAt,
      updatedAt:        su.updatedAt,
      // Deliberately excluded: internal case notes, staff-only fields, private contact details
    },
    missions:       missions.map(m => ({ id:m.id, title:m.title, status:m.status, riskLevel:m.riskLevel, scheduledTime:m.scheduledTime, dueTime:m.dueTime })),
    checkIns:       checkIns.slice(-10).map(c => ({ id:c.id, type:c.checkInType, wellbeing:c.wellbeingStatus, safety:c.safetyStatus, timestamp:c.timestamp, syncStatus:c.syncStatus })),
    messageCount:   messages.length, // count only — not message content for privacy
    riskFlags:      flags.map(f => ({ id:f.id, title:f.title, riskLevel:f.riskLevel, status:f.status, humanReviewed:f.humanReviewed })),
    incidentCount:  incidents.length,
    reviewRequired: flags.filter(f => f.requiresSupervisorReview && !f.humanReviewed).length > 0,
    aiWelfarePrompts: aiPrompts,
    privacyNotice:  'This report is for internal supervisor/coordinator use only. Service-user-facing exports must not include private staff notes, internal risk assessments, or case records without appropriate consent and data protection procedures.',
    limitation:     EVIDENCE_LIMITATION,
  }
}

export function getGrantImpactDemoReport() {
  const demo     = _demo()
  const missions = _tbl(missionTable)
  const responders= _tbl(responderTable)
  const sus      = _tbl(serviceUserTable)
  const checkIns = _tbl(checkInTable)
  const incidents= _tbl(incidentTable)
  const flags    = _tbl(riskFlagTable)
  const evidence = _tbl(evidenceTable)
  const syncQ    = getSyncQueueSummary()
  const a1       = runWelfareRiskAI()
  const a2       = runSafeguardingEvidenceAI()

  return {
    reportType: 'grant_impact_demo', reportId: `RPT-GRANT-${Date.now().toString(36).toUpperCase()}`,
    generatedAt: _now(), demoMode: demo,
    metrics: {
      totalMissions:        missions.length,
      completedMissions:    missions.filter(m => m.status === 'completed').length,
      activeMissions:       missions.filter(m => !['completed','cancelled','draft'].includes(m.status)).length,
      respondersActive:     responders.filter(r => r.status !== 'offline').length,
      respondersTotal:      responders.length,
      serviceUsersSupported:sus.length,
      checkInsReceived:     checkIns.length,
      helpRequestsHandled:  sus.filter(su => su.helpRequestStatus && su.helpRequestStatus !== 'none').length,
      incidentsLogged:      incidents.length,
      supervisorReviewItems:a1.metrics.supervisorReviewRequired,
      evidenceRecords:      evidence.length,
      syncEventsTotal:      syncQ.total || 0,
      aiPromptsGenerated:   a1.promptCount + a2.promptCount,
      riskFlagsRaised:      flags.length,
      riskFlagsReviewed:    flags.filter(f => f.humanReviewed).length,
    },
    publicBenefitSummary:
      'ResponseLink OS™ is designed to support community organisations with better visibility, structured evidence capture, responder safety prompts, service user check-ins, and human-reviewed escalation workflows. ' +
      'The platform can help improve coordination, reduce information gaps, and support supervisors in welfare and outreach operations. ' +
      'ResponseLink OS™ supports evidence capture for accountability and quality improvement, while maintaining clear advisory boundaries — human professional judgement remains primary.',
    grantWording: [
      'ResponseLink OS™ can help reduce missed check-ins through structured coordination prompts.',
      'The platform supports evidence capture for welfare visits, responder safety, and service user wellbeing.',
      'Structured AI-assisted risk prompts can help supervisors prioritise and review records.',
      'Local-first architecture ensures operational continuity in low-connectivity environments.',
      'The platform is designed around safeguarding-aware workflows with clear human review boundaries.',
    ],
    limitation:
      'This report uses ' + (demo ? 'demo/simulated' : 'live') + ' data. ' + EVIDENCE_LIMITATION + ' Impact and outcome metrics should not be cited as verified statistics without independent evaluation.',
    demoDisclaimer: demo
      ? 'DEMO MODE — All data in this report is simulated for demonstration purposes. No real service users, responders, or welfare records are represented.'
      : 'LIVE MODE — Real operational data. Ensure data protection, access controls, and consent procedures are in place before sharing this report.',
  }
}

// ─── Combined report helpers for Reports page ─────────────────

export function getReportSummaryList() {
  const demo      = _demo()
  const missions  = _tbl(missionTable)
  const sus       = _tbl(serviceUserTable)
  const incidents = _tbl(incidentTable)
  const visits    = _tbl(welfareVisitTable)

  return {
    missions:  missions.map(m => ({ id:m.id, title:m.title, status:m.status, riskLevel:m.riskLevel, scheduledTime:m.scheduledTime, demoRecord:m.demoRecord })),
    serviceUsers: sus.map(s => ({ id:s.id, displayName:s.displayName, wellbeingStatus:s.wellbeingStatus, demoRecord:s.demoRecord })),
    incidents: incidents.map(i => ({ id:i.id, title:i.title, severity:i.severity, supervisorReviewStatus:i.supervisorReviewStatus, demoRecord:i.demoRecord })),
    visits:    visits.map(v => ({ id:v.id, missionId:v.missionId, status:v.status, demoRecord:v.demoRecord })),
    grantReportAvailable: demo || missions.length > 0,
    demoMode: demo,
  }
}

export default {
  AI_ENGINE_VERSION, ADVISORY_NOTICE, EVIDENCE_LIMITATION,
  runWelfareRiskAI, runSafeguardingEvidenceAI, getAIOversightSummary,
  getReportDataForMission, getReportDataForVisit, getReportDataForIncident,
  getServiceUserSummaryReport, getGrantImpactDemoReport, getReportSummaryList,
}
