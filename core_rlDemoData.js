/**
 * ============================================================
 * ResponseLink OS™ — Demo Data Seed
 * /src/core/rlDemoData.js
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 2 — Core Data Model and Demo/Live Separation
 *
 * ⚠️  DEMO DATA RULES:
 *   - ALL records must have demoRecord: true
 *   - All data is obviously fake / generic
 *   - No real addresses, real identities, real sensitive details
 *   - No medical diagnosis fields
 *   - No emergency dispatch fields
 *   - No automatic safeguarding decisions
 *   - No fake evidence that looks real
 *   - Demo data must never appear in live mode
 *   - Generic area names only: "North Zone", "Community Hub", etc.
 *
 * ⚠️  ADVISORY NOTICE:
 *   ResponseLink OS™ is advisory and coordination-support software.
 *   It does not replace emergency services, safeguarding professionals,
 *   clinical judgement, or legal duties.
 *   If someone is in immediate danger, contact emergency services.
 * ============================================================
 */

import {
  organisationTable,
  responderTable,
  serviceUserTable,
  missionTable,
  welfareVisitTable,
  checkInTable,
  riskFlagTable,
  incidentTable,
  messageTable,
  evidenceTable,
  syncQueueTable,
  appSettings,
  getDemoMode,
  validateNoDemoDataInLiveMode,
} from './core_rlData'

// ─── Internal Helpers ─────────────────────────────────────────
const now   = () => new Date().toISOString()
const ago   = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString()
const ahead = (minutes) => new Date(Date.now() + minutes * 60 * 1000).toISOString()

// ─── seedDemoData() ───────────────────────────────────────────
/**
 * Seeds safe labelled demo data for ResponseLink OS™.
 * All records have demoRecord: true.
 * Skips seeding if demo data already exists (idempotent).
 */
export function seedDemoData() {
  // Guard: do not seed if demo mode is off
  if (!getDemoMode()) {
    console.warn('[RL:Demo] seedDemoData() called but demo mode is OFF — skipping.')
    return { ok: false, reason: 'Demo mode is OFF. Turn Demo Mode ON before seeding.' }
  }

  // Guard: skip if demo data already present (idempotent)
  if (organisationTable.countDemo() > 0) {
    console.info('[RL:Demo] Demo data already present — skipping re-seed.')
    return { ok: true, reason: 'Demo data already seeded.' }
  }

  try {
    // ── 1. Organisation (1) ──────────────────────────────────
    const org = organisationTable.create({
      name:         'Riverside Community Support',
      type:         'community_welfare',
      area:         'North Zone',
      contactName:  'Jo Coordinator (Demo)',
      contactRole:  'Welfare Coordinator',
      contactEmail: 'demo-coordinator@example.invalid',
      contactPhone: '07700 000 000',
      demoRecord:   true,
      createdAt:    ago(10080), // ~1 week ago
      updatedAt:    ago(60),
    })

    // ── 2. Responders (3) ────────────────────────────────────
    const r1 = responderTable.create({
      organisationId:   org.id,
      displayName:      'Alex Morgan (Demo)',
      role:             'welfare_responder',
      phone:            '07700 000 001',
      email:            'demo-alex@example.invalid',
      status:           'active_visit',
      currentMissionId: null, // will be set after missions created
      lastCheckInAt:    ago(25),
      safetyStatus:     'ok',
      availability:     'on_duty',
      notes:            '[DEMO] Welfare responder — North Zone. No real personal data.',
      demoRecord:       true,
      createdAt:        ago(10080),
      updatedAt:        ago(25),
    })

    const r2 = responderTable.create({
      organisationId:   org.id,
      displayName:      'Sam Taylor (Demo)',
      role:             'outreach_volunteer',
      phone:            '07700 000 002',
      email:            'demo-sam@example.invalid',
      status:           'available',
      currentMissionId: null,
      lastCheckInAt:    ago(45),
      safetyStatus:     'ok',
      availability:     'on_duty',
      notes:            '[DEMO] Outreach volunteer — Community Hub area. No real personal data.',
      demoRecord:       true,
      createdAt:        ago(10080),
      updatedAt:        ago(45),
    })

    const r3 = responderTable.create({
      organisationId:   org.id,
      displayName:      'Jordan Reed (Demo)',
      role:             'field_coordinator',
      phone:            '07700 000 003',
      email:            'demo-jordan@example.invalid',
      status:           'check_in_due',
      currentMissionId: null,
      lastCheckInAt:    ago(95),
      safetyStatus:     'check_in_overdue',
      availability:     'on_duty',
      notes:            '[DEMO] Field coordinator — Outreach Area A. Check-in overdue (demo scenario). No real personal data.',
      demoRecord:       true,
      createdAt:        ago(10080),
      updatedAt:        ago(95),
    })

    // ── 3. Service Users (5) ─────────────────────────────────
    // Generic names — no real vulnerable person details
    const su1 = serviceUserTable.create({
      organisationId:   org.id,
      displayName:      'Service User A (Demo)',
      preferredName:    'A',
      supportType:      'regular_welfare_visit',
      contactMethod:    'phone',
      consentStatus:    'consented',
      wellbeingStatus:  'stable',
      lastCheckInAt:    ago(30),
      helpRequestStatus: 'none',
      riskLevel:        'low',
      notes:            '[DEMO] Stable service user — North Zone. No real personal data.',
      demoRecord:       true,
      createdAt:        ago(10080),
      updatedAt:        ago(30),
    })

    const su2 = serviceUserTable.create({
      organisationId:   org.id,
      displayName:      'Service User B (Demo)',
      preferredName:    'B',
      supportType:      'outreach_support',
      contactMethod:    'in_person',
      consentStatus:    'consented',
      wellbeingStatus:  'wellbeing_concern',
      lastCheckInAt:    ago(90),
      helpRequestStatus: 'support_requested',
      riskLevel:        'medium',
      notes:            '[DEMO] Wellbeing concern — Community Hub. Demo scenario for advisory review. No real personal data.',
      demoRecord:       true,
      createdAt:        ago(10080),
      updatedAt:        ago(90),
    })

    const su3 = serviceUserTable.create({
      organisationId:   org.id,
      displayName:      'Service User C (Demo)',
      preferredName:    'C',
      supportType:      'vulnerable_person_support',
      contactMethod:    'phone',
      consentStatus:    'consented',
      wellbeingStatus:  'missed_check_in',
      lastCheckInAt:    ago(300),
      helpRequestStatus: 'none',
      riskLevel:        'high',
      notes:            '[DEMO] Missed check-in scenario — Outreach Area A. Human review required. No real personal data.',
      demoRecord:       true,
      createdAt:        ago(10080),
      updatedAt:        ago(300),
    })

    const su4 = serviceUserTable.create({
      organisationId:   org.id,
      displayName:      'Service User D (Demo)',
      preferredName:    'D',
      supportType:      'follow_up_support',
      contactMethod:    'message',
      consentStatus:    'consented',
      wellbeingStatus:  'check_in_received',
      lastCheckInAt:    ago(15),
      helpRequestStatus: 'none',
      riskLevel:        'low',
      notes:            '[DEMO] Recent check-in — Community Hub. No real personal data.',
      demoRecord:       true,
      createdAt:        ago(10080),
      updatedAt:        ago(15),
    })

    const su5 = serviceUserTable.create({
      organisationId:   org.id,
      displayName:      'Service User E (Demo)',
      preferredName:    'E',
      supportType:      'community_support',
      contactMethod:    'phone',
      consentStatus:    'pending',
      wellbeingStatus:  'needs_supervisor_review',
      lastCheckInAt:    null,
      helpRequestStatus: 'none',
      riskLevel:        'medium',
      notes:            '[DEMO] Consent pending — supervisor review required. No real personal data.',
      demoRecord:       true,
      createdAt:        ago(1440),
      updatedAt:        ago(120),
    })

    // ── 4. Missions (5) ──────────────────────────────────────
    const m1 = missionTable.create({
      organisationId:      org.id,
      title:               '[DEMO] Welfare Check — Service User A',
      missionType:         'welfare_check',
      priority:            'routine',
      riskLevel:           'low',
      assignedResponderId: r1.id,
      linkedServiceUserId: su1.id,
      locationLabel:       'North Zone Community Centre (Demo)',
      area:                'North Zone',
      scheduledTime:       ago(60),
      dueTime:             ahead(30),
      checkInRequired:     true,
      checklistTemplateId: null,
      safetyNotes:         '[DEMO] Standard welfare check. Advisory only — not a clinical visit.',
      caseNotes:           '[DEMO] Demo visit — no real case notes.',
      status:              'in_progress',
      escalationState:     null,
      completionOutcome:   null,
      evidenceRecordIds:   [],
      demoRecord:          true,
      createdAt:           ago(120),
      updatedAt:           ago(20),
    })

    const m2 = missionTable.create({
      organisationId:      org.id,
      title:               '[DEMO] Outreach Visit — Service User B',
      missionType:         'outreach_visit',
      priority:            'medium',
      riskLevel:           'medium',
      assignedResponderId: r2.id,
      linkedServiceUserId: su2.id,
      locationLabel:       'Community Hub — Outreach Drop-In (Demo)',
      area:                'Community Hub',
      scheduledTime:       ahead(60),
      dueTime:             ahead(120),
      checkInRequired:     true,
      checklistTemplateId: null,
      safetyNotes:         '[DEMO] Wellbeing concern flagged. Advisory review required before visit.',
      caseNotes:           '[DEMO] Demo outreach — no real case notes.',
      status:              'assigned',
      escalationState:     null,
      completionOutcome:   null,
      evidenceRecordIds:   [],
      demoRecord:          true,
      createdAt:           ago(240),
      updatedAt:           ago(30),
    })

    const m3 = missionTable.create({
      organisationId:      org.id,
      title:               '[DEMO] Safety Check — Service User C (Missed Check-In)',
      missionType:         'safety_check',
      priority:            'high',
      riskLevel:           'high',
      assignedResponderId: r3.id,
      linkedServiceUserId: su3.id,
      locationLabel:       'Outreach Area A — Home Visit (Demo)',
      area:                'Outreach Area A',
      scheduledTime:       ago(180),
      dueTime:             ago(60),
      checkInRequired:     true,
      checklistTemplateId: null,
      safetyNotes:         '[DEMO] Missed check-in scenario. Human supervisor review required. Advisory only.',
      caseNotes:           '[DEMO] Demo missed check-in — no real case notes.',
      status:              'overdue',
      escalationState:     'supervisor_notified',
      completionOutcome:   null,
      evidenceRecordIds:   [],
      demoRecord:          true,
      createdAt:           ago(480),
      updatedAt:           ago(60),
    })

    const m4 = missionTable.create({
      organisationId:      org.id,
      title:               '[DEMO] Supply Delivery — Community Hub',
      missionType:         'supply_delivery',
      priority:            'routine',
      riskLevel:           'low',
      assignedResponderId: r2.id,
      linkedServiceUserId: null,
      locationLabel:       'Community Hub — Central Point (Demo)',
      area:                'Community Hub',
      scheduledTime:       ago(30),
      dueTime:             ahead(60),
      checkInRequired:     false,
      checklistTemplateId: null,
      safetyNotes:         '[DEMO] Routine supply drop. No risk flags.',
      caseNotes:           '[DEMO] Demo delivery — no real case notes.',
      status:              'travelling',
      escalationState:     null,
      completionOutcome:   null,
      evidenceRecordIds:   [],
      demoRecord:          true,
      createdAt:           ago(90),
      updatedAt:           ago(10),
    })

    const m5 = missionTable.create({
      organisationId:      org.id,
      title:               '[DEMO] Follow-Up Visit — Service User D',
      missionType:         'follow_up_visit',
      priority:            'routine',
      riskLevel:           'low',
      assignedResponderId: null,
      linkedServiceUserId: su4.id,
      locationLabel:       'Community Hub Area (Demo)',
      area:                'Community Hub',
      scheduledTime:       ahead(240),
      dueTime:             ahead(360),
      checkInRequired:     true,
      checklistTemplateId: null,
      safetyNotes:         '[DEMO] Standard follow-up. Advisory only.',
      caseNotes:           '[DEMO] Demo follow-up — no real case notes.',
      status:              'scheduled',
      escalationState:     null,
      completionOutcome:   null,
      evidenceRecordIds:   [],
      demoRecord:          true,
      createdAt:           ago(60),
      updatedAt:           ago(60),
    })

    // Update responders with current mission IDs
    responderTable.update(r1.id, { currentMissionId: m1.id })
    responderTable.update(r2.id, { currentMissionId: m2.id })
    responderTable.update(r3.id, { currentMissionId: m3.id })

    // ── 5. Welfare Visits (3) ────────────────────────────────
    const v1 = welfareVisitTable.create({
      missionId:        m1.id,
      responderId:      r1.id,
      serviceUserId:    su1.id,
      startedAt:        ago(55),
      arrivedAt:        ago(50),
      completedAt:      null,
      checklistStatus:  'in_progress',
      outcome:          null,
      notes:            '[DEMO] Visit in progress. Advisory — no clinical outcomes recorded.',
      riskFlags:        [],
      incidentIds:      [],
      evidenceRecordIds: [],
      syncStatus:       'offline',
      demoRecord:       true,
      createdAt:        ago(55),
      updatedAt:        ago(20),
    })

    const v2 = welfareVisitTable.create({
      missionId:        m3.id,
      responderId:      r3.id,
      serviceUserId:    su3.id,
      startedAt:        ago(200),
      arrivedAt:        null,
      completedAt:      null,
      checklistStatus:  'not_started',
      outcome:          null,
      notes:            '[DEMO] Responder check-in overdue. Supervisor review required. Advisory only.',
      riskFlags:        ['overdue_responder_check_in'],
      incidentIds:      [],
      evidenceRecordIds: [],
      syncStatus:       'pending',
      demoRecord:       true,
      createdAt:        ago(200),
      updatedAt:        ago(95),
    })

    welfareVisitTable.create({
      missionId:        m2.id,
      responderId:      r2.id,
      serviceUserId:    su2.id,
      startedAt:        null,
      arrivedAt:        null,
      completedAt:      null,
      checklistStatus:  'not_started',
      outcome:          null,
      notes:            '[DEMO] Scheduled — not yet started. Advisory.',
      riskFlags:        [],
      incidentIds:      [],
      evidenceRecordIds: [],
      syncStatus:       'pending',
      demoRecord:       true,
      createdAt:        ago(240),
      updatedAt:        ago(30),
    })

    // ── 6. Check-Ins (5) ─────────────────────────────────────
    checkInTable.create({
      sourceType:      'responder',
      sourceId:        r1.id,
      missionId:       m1.id,
      serviceUserId:   su1.id,
      responderId:     r1.id,
      checkInType:     'responder_safety',
      wellbeingStatus: 'ok',
      message:         '[DEMO] Arrived at location. All ok.',
      riskLevel:       'low',
      needsReview:     false,
      syncStatus:      'offline',
      demoRecord:      true,
      createdAt:       ago(50),
    })

    checkInTable.create({
      sourceType:      'service_user',
      sourceId:        su4.id,
      missionId:       null,
      serviceUserId:   su4.id,
      responderId:     null,
      checkInType:     'service_user_wellbeing',
      wellbeingStatus: 'stable',
      message:         '[DEMO] Feeling ok today, thank you.',
      riskLevel:       'low',
      needsReview:     false,
      syncStatus:      'pending',
      demoRecord:      true,
      createdAt:       ago(15),
    })

    checkInTable.create({
      sourceType:      'responder',
      sourceId:        r2.id,
      missionId:       m4.id,
      serviceUserId:   null,
      responderId:     r2.id,
      checkInType:     'visit_confirmation',
      wellbeingStatus: 'ok',
      message:         '[DEMO] En route. ETA 10 minutes.',
      riskLevel:       'low',
      needsReview:     false,
      syncStatus:      'pending',
      demoRecord:      true,
      createdAt:       ago(10),
    })

    checkInTable.create({
      sourceType:      'dashboard',
      sourceId:        'dashboard',
      missionId:       m3.id,
      serviceUserId:   su3.id,
      responderId:     r3.id,
      checkInType:     'missed_contact',
      wellbeingStatus: null,
      message:         '[DEMO] Responder check-in overdue. Supervisor review advisory only — not automated safeguarding.',
      riskLevel:       'high',
      needsReview:     true,
      syncStatus:      'synced',
      demoRecord:      true,
      createdAt:       ago(60),
    })

    checkInTable.create({
      sourceType:      'responder',
      sourceId:        r1.id,
      missionId:       m1.id,
      serviceUserId:   su1.id,
      responderId:     r1.id,
      checkInType:     'support_update',
      wellbeingStatus: 'stable',
      message:         '[DEMO] Service user appears settled. Will complete checklist shortly.',
      riskLevel:       'low',
      needsReview:     false,
      syncStatus:      'offline',
      demoRecord:      true,
      createdAt:       ago(20),
    })

    // ── 7. Risk Flags (3) ────────────────────────────────────
    riskFlagTable.create({
      missionId:                m3.id,
      serviceUserId:            su3.id,
      responderId:              r3.id,
      riskLevel:                'high',
      triggerType:              'overdue_responder_check_in',
      title:                    '[DEMO] Responder Check-In Overdue',
      description:              '[DEMO] Responder Jordan Reed has not checked in within the expected window. Advisory flag only — supervisor review required. This is not an automated safeguarding decision.',
      status:                   'open',
      requiresSupervisorReview: true,
      humanReviewed:            false,
      demoRecord:               true,
      createdAt:                ago(60),
      updatedAt:                ago(60),
    })

    riskFlagTable.create({
      missionId:                null,
      serviceUserId:            su3.id,
      responderId:              null,
      riskLevel:                'high',
      triggerType:              'missed_service_user_check_in',
      title:                    '[DEMO] Missed Service User Check-In',
      description:              '[DEMO] Service User C has not been contacted within the expected period. Advisory flag only — supervisor review required. This is not an automated safeguarding decision.',
      status:                   'open',
      requiresSupervisorReview: true,
      humanReviewed:            false,
      demoRecord:               true,
      createdAt:                ago(300),
      updatedAt:                ago(120),
    })

    riskFlagTable.create({
      missionId:                m2.id,
      serviceUserId:            su2.id,
      responderId:              r2.id,
      riskLevel:                'medium',
      triggerType:              'high_risk_mission',
      title:                    '[DEMO] Medium Risk Outreach — Wellbeing Concern',
      description:              '[DEMO] Outreach visit flagged as medium risk due to prior wellbeing concern. Advisory only — responder to use professional judgement.',
      status:                   'acknowledged',
      requiresSupervisorReview: false,
      humanReviewed:            true,
      demoRecord:               true,
      createdAt:                ago(240),
      updatedAt:                ago(120),
    })

    // ── 8. Incidents (2) ─────────────────────────────────────
    const inc1 = incidentTable.create({
      missionId:              m3.id,
      responderId:            r3.id,
      serviceUserId:          su3.id,
      title:                  '[DEMO] Missed Responder Contact — Overdue Check-In',
      category:               'missed_contact',
      severity:               'medium',
      description:            '[DEMO] Responder did not check in at expected time during safety check mission. Advisory incident log only — not a confirmed emergency. Supervisor notified for review.',
      actionTaken:            '[DEMO] Supervisor contacted. Phone check attempted. Demo scenario — no real action taken.',
      supervisorReviewStatus: 'pending',
      evidenceRecordIds:      [],
      syncStatus:             'pending',
      demoRecord:             true,
      createdAt:              ago(60),
      updatedAt:              ago(60),
    })

    incidentTable.create({
      missionId:              m2.id,
      responderId:            r2.id,
      serviceUserId:          su2.id,
      title:                  '[DEMO] Service User Wellbeing Concern Noted',
      category:               'wellbeing_concern',
      severity:               'low',
      description:            '[DEMO] Responder noted a wellbeing concern during pre-visit assessment. Advisory note only — not a clinical or safeguarding determination.',
      actionTaken:            '[DEMO] Coordinator informed. Outreach visit scheduled. Demo scenario.',
      supervisorReviewStatus: 'reviewed',
      evidenceRecordIds:      [],
      syncStatus:             'synced',
      demoRecord:             true,
      createdAt:              ago(180),
      updatedAt:              ago(120),
    })

    // ── 9. Messages (4) ──────────────────────────────────────
    messageTable.create({
      fromType:   'dashboard',
      fromId:     'coordinator',
      toType:     'responder',
      toId:       r1.id,
      missionId:  m1.id,
      subject:    '[DEMO] Mission Briefing',
      body:       '[DEMO] Alex — welfare check for Service User A. Please check in on arrival. Advisory guidance only.',
      priority:   'normal',
      readStatus: 'read',
      syncStatus: 'synced',
      demoRecord: true,
      createdAt:  ago(90),
    })

    messageTable.create({
      fromType:   'responder',
      fromId:     r1.id,
      toType:     'dashboard',
      toId:       'coordinator',
      missionId:  m1.id,
      subject:    '[DEMO] Arrived on site',
      body:       '[DEMO] Arrived. Starting check. All looks fine so far.',
      priority:   'normal',
      readStatus: 'read',
      syncStatus: 'offline',
      demoRecord: true,
      createdAt:  ago(50),
    })

    messageTable.create({
      fromType:   'dashboard',
      fromId:     'coordinator',
      toType:     'responder',
      toId:       r3.id,
      missionId:  m3.id,
      subject:    '[DEMO] Check-In Overdue — Please Respond',
      body:       '[DEMO] Jordan — your check-in is overdue on the Outreach Area A mission. Please respond when safe. Advisory message — not an emergency dispatch.',
      priority:   'urgent',
      readStatus: 'unread',
      syncStatus: 'synced',
      demoRecord: true,
      createdAt:  ago(55),
    })

    messageTable.create({
      fromType:   'service_user',
      fromId:     su4.id,
      toType:     'dashboard',
      toId:       'coordinator',
      missionId:  null,
      subject:    '[DEMO] Check-In Message',
      body:       '[DEMO] Hi, just checking in. I am doing ok today. Thank you.',
      priority:   'normal',
      readStatus: 'read',
      syncStatus: 'pending',
      demoRecord: true,
      createdAt:  ago(15),
    })

    // ── 10. Evidence Records (5) ──────────────────────────────
    evidenceTable.create({
      missionId:       m1.id,
      visitId:         v1.id,
      incidentId:      null,
      recordType:      'check_in',
      title:           '[DEMO] Responder Arrival Check-In',
      content:         '[DEMO] Alex Morgan checked in on arrival. Service User A present. Welfare check in progress. Advisory record only.',
      recordedByType:  'responder',
      recordedById:    r1.id,
      timestamp:       ago(50),
      dataFreshness:   'live',
      syncStatus:      'offline',
      demoRecord:      true,
      createdAt:       ago(50),
    })

    evidenceTable.create({
      missionId:       m3.id,
      visitId:         v2.id,
      incidentId:      inc1.id,
      recordType:      'escalation',
      title:           '[DEMO] Supervisor Escalation — Overdue Check-In',
      content:         '[DEMO] Supervisor notified of overdue responder check-in. Advisory escalation log. No automated safeguarding action taken — human review required.',
      recordedByType:  'dashboard',
      recordedById:    'coordinator',
      timestamp:       ago(60),
      dataFreshness:   'live',
      syncStatus:      'synced',
      demoRecord:      true,
      createdAt:       ago(60),
    })

    evidenceTable.create({
      missionId:       m2.id,
      visitId:         null,
      incidentId:      null,
      recordType:      'note',
      title:           '[DEMO] Pre-Visit Assessment Note',
      content:         '[DEMO] Coordinator pre-visit note: wellbeing concern noted. Responder briefed. Advisory only — not a clinical assessment.',
      recordedByType:  'dashboard',
      recordedById:    'coordinator',
      timestamp:       ago(240),
      dataFreshness:   'live',
      syncStatus:      'synced',
      demoRecord:      true,
      createdAt:       ago(240),
    })

    evidenceTable.create({
      missionId:       m1.id,
      visitId:         v1.id,
      incidentId:      null,
      recordType:      'ai_advisory_summary',
      title:           '[DEMO] 4P3X AI Advisory Summary',
      content:         '[DEMO] Advisory AI summary: Mission M1 in progress. Responder check-in received. No risk flags at this time. THIS IS AN ADVISORY SUMMARY ONLY. Do not treat as a clinical or safeguarding determination. Human review required for any decisions.',
      recordedByType:  'responder',
      recordedById:    r1.id,
      timestamp:       ago(25),
      dataFreshness:   'live',
      syncStatus:      'offline',
      demoRecord:      true,
      createdAt:       ago(25),
    })

    evidenceTable.create({
      missionId:       null,
      visitId:         null,
      incidentId:      null,
      recordType:      'human_decision_log',
      title:           '[DEMO] Supervisor Review — Risk Flag Acknowledged',
      content:         '[DEMO] Supervisor reviewed medium risk flag for Outreach Visit B. Acknowledged and passed to outreach lead. Demo record — no real decision logged.',
      recordedByType:  'dashboard',
      recordedById:    'supervisor',
      timestamp:       ago(120),
      dataFreshness:   'historical',
      syncStatus:      'synced',
      demoRecord:      true,
      createdAt:       ago(120),
    })

    // ── 11. Sync Queue (3 examples) ───────────────────────────
    syncQueueTable.create({
      entityType:    'checkIn',
      entityId:      'demo-checkin-queue-1',
      action:        'create',
      payload:       { note: '[DEMO] Sync queue example — offline check-in awaiting backend.' },
      syncStatus:    'offline',
      attempts:      0,
      lastAttemptAt: null,
      errorMessage:  null,
      demoRecord:    true,
      createdAt:     ago(20),
      updatedAt:     ago(20),
    })

    syncQueueTable.create({
      entityType:    'welfareVisit',
      entityId:      'demo-visit-queue-1',
      action:        'update',
      payload:       { note: '[DEMO] Sync queue example — visit update pending sync.' },
      syncStatus:    'pending',
      attempts:      1,
      lastAttemptAt: ago(10),
      errorMessage:  null,
      demoRecord:    true,
      createdAt:     ago(25),
      updatedAt:     ago(10),
    })

    syncQueueTable.create({
      entityType:    'evidenceRecord',
      entityId:      'demo-evidence-queue-1',
      action:        'create',
      payload:       { note: '[DEMO] Sync queue example — evidence record failed to sync, needs retry.' },
      syncStatus:    'needs_retry',
      attempts:      2,
      lastAttemptAt: ago(5),
      errorMessage:  '[DEMO] Backend not configured. Will retry when backend is available.',
      demoRecord:    true,
      createdAt:     ago(30),
      updatedAt:     ago(5),
    })

    // ── Mark demo mode as seeded ─────────────────────────────
    appSettings.set({ demoMode: true, lastSyncAt: now() })

    console.info('[RL:Demo] Demo data seeded successfully.')
    return {
      ok:    true,
      counts: {
        organisations: 1,
        responders:    3,
        serviceUsers:  5,
        missions:      5,
        welfareVisits: 3,
        checkIns:      5,
        riskFlags:     3,
        incidents:     2,
        messages:      4,
        evidenceRecords: 5,
        syncQueue:     3,
      }
    }

  } catch (e) {
    console.error('[RL:Demo] seedDemoData failed:', e)
    return { ok: false, reason: e.message }
  }
}

// ─── Export ───────────────────────────────────────────────────
export default { seedDemoData }
