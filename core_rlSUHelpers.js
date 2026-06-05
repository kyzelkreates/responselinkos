/**
 * ============================================================
 * ResponseLink OS™ — Service User PWA SSOT Helpers
 * /src/core/rlSUHelpers.js
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 5 — Service User PWA Full Workflow
 *
 * All reads/writes go through core_rlData.js (SSOT).
 * No new storage keys. No duplicate state system.
 * No backend. No Supabase. No secrets.
 *
 * Privacy rule: helpers here NEVER expose staff-only fields
 * (internal risk notes, private case notes, audit logs, or
 * unrelated service user records) to the Service User PWA.
 *
 * ⚠️  ADVISORY NOTICE:
 *   ResponseLink OS™ is advisory and coordination-support software.
 *   It does not replace emergency services, safeguarding professionals,
 *   clinical judgement, or legal duties.
 * ============================================================
 */

import {
  serviceUserTable,
  missionTable,
  checkInTable,
  messageTable,
  riskFlagTable,
  evidenceTable,
  syncQueueTable,
  getDemoMode,
  SERVICE_USER_STATUS,
  RISK_LEVEL,
  SYNC_STATUS,
  CHECK_IN_TYPE,
  createSyncQueueItem,
} from './core_rlData'

// ─── Internal helpers ─────────────────────────────────────────
const now = () => new Date().toISOString()
const isDemo = () => getDemoMode()

// ─── Service User Identity ────────────────────────────────────
const CURRENT_SU_KEY = 'rl:su:currentServiceUserId'

export function getCurrentServiceUserId() {
  try { return localStorage.getItem(CURRENT_SU_KEY) || null } catch { return null }
}

export function setCurrentServiceUserId(id) {
  try { localStorage.setItem(CURRENT_SU_KEY, id) } catch {}
}

/**
 * getCurrentServiceUser()
 * Returns only SERVICE-USER-FACING fields.
 * NEVER returns internal notes, staff risk notes, or private data.
 */
export function getCurrentServiceUser() {
  const id = getCurrentServiceUserId()
  if (!id) return null
  const su = serviceUserTable.get(id)
  if (!su) return null
  return sanitiseServiceUserRecord(su)
}

/**
 * sanitiseServiceUserRecord(su)
 * Strips staff-only fields before exposing to Service User PWA.
 * Internal fields removed: notes (staff-only), raw riskLevel, organisationId internals.
 */
export function sanitiseServiceUserRecord(su) {
  if (!su) return null
  return {
    id:               su.id,
    displayName:      su.displayName,
    preferredName:    su.preferredName,
    supportType:      su.supportType,
    contactMethod:    su.contactMethod,
    consentStatus:    su.consentStatus,
    wellbeingStatus:  su.wellbeingStatus,
    helpRequestStatus: su.helpRequestStatus,
    lastCheckInAt:    su.lastCheckInAt,
    demoRecord:       su.demoRecord,
    updatedAt:        su.updatedAt,
    // DELIBERATELY EXCLUDED from Service User PWA:
    // - su.notes          (staff-only case/risk notes)
    // - su.riskLevel      (internal staff risk classification)
    // - su.organisationId (internal linking key)
  }
}

// ─── Linked Missions (service-user-facing view) ───────────────

/**
 * getLinkedMissionsForServiceUser(serviceUserId)
 * Returns service-user-safe mission fields only.
 * Strips staff-only fields: safetyNotes, caseNotes, internal risk notes.
 */
export function getLinkedMissionsForServiceUser(serviceUserId) {
  if (!serviceUserId) return []
  const demo = isDemo()
  const all  = demo ? missionTable.list() : missionTable.listLive()
  return all
    .filter(m => m.linkedServiceUserId === serviceUserId)
    .map(sanitiseMissionForServiceUser)
    .sort((a, b) => new Date(b.scheduledTime || 0) - new Date(a.scheduledTime || 0))
}

/**
 * sanitiseMissionForServiceUser(mission)
 * NEVER exposes: safetyNotes, caseNotes, escalationState (internal),
 * completionOutcome (internal), evidenceRecordIds, or staff risk notes.
 */
export function sanitiseMissionForServiceUser(m) {
  if (!m) return null
  return {
    id:                m.id,
    title:             m.title,
    missionType:       m.missionType,
    priority:          m.priority,
    status:            m.status,
    locationLabel:     m.locationLabel,
    area:              m.area,
    scheduledTime:     m.scheduledTime,
    dueTime:           m.dueTime,
    checkInRequired:   m.checkInRequired,
    // Responder name is shown only if available and safe
    assignedResponderId: m.assignedResponderId || null,
    syncStatus:        m.syncStatus,
    updatedAt:         m.updatedAt,
    demoRecord:        m.demoRecord,
    // DELIBERATELY EXCLUDED from Service User PWA:
    // - m.safetyNotes          (staff-only advisory notes)
    // - m.caseNotes            (staff-only case notes)
    // - m.escalationState      (internal staff state)
    // - m.completionOutcome    (internal staff outcome field)
    // - m.evidenceRecordIds    (internal audit links)
    // - m.organisationId       (internal key)
    // - m.checklistTemplateId  (internal)
  }
}

// ─── All service users (for selector) ────────────────────────

export function getAllServiceUsers() {
  const demo = isDemo()
  const list = demo ? serviceUserTable.list() : serviceUserTable.listLive()
  return list.map(sanitiseServiceUserRecord)
}

// ─── Wellbeing Check-in ───────────────────────────────────────

/**
 * submitServiceUserWellbeingCheckIn({ serviceUserId, missionId, wellbeingStatus, message, supportNeed, needsReview })
 * Creates checkIn + updates serviceUser + evidenceRecord + syncQueue.
 * Returns { ok, checkIn, error }
 */
export function submitServiceUserWellbeingCheckIn({
  serviceUserId, missionId,
  wellbeingStatus, message, supportNeed, needsReview
}) {
  try {
    if (!serviceUserId) return { ok: false, error: 'Service user ID is required.' }

    const demo = isDemo()
    const ts   = now()

    // Map wellbeing status to SSOT enum
    const statusMap = {
      okay:         SERVICE_USER_STATUS.CHECK_IN_RECEIVED,
      unsure:       SERVICE_USER_STATUS.WELLBEING_CONCERN,
      need_support: SERVICE_USER_STATUS.SUPPORT_REQUESTED,
      worried:      SERVICE_USER_STATUS.WELLBEING_CONCERN,
      unsafe:       SERVICE_USER_STATUS.SAFETY_CONCERN,
    }
    const newStatus = statusMap[wellbeingStatus] || SERVICE_USER_STATUS.CHECK_IN_RECEIVED
    const helpStatus = (wellbeingStatus === 'unsafe' || wellbeingStatus === 'need_support')
      ? 'support_requested' : 'none'

    const checkIn = checkInTable.create({
      missionId:    missionId || null,
      responderId:  null,
      serviceUserId,
      checkInType:  CHECK_IN_TYPE.SERVICE_USER_WELLBEING,
      safetyStatus: wellbeingStatus,
      message:      message?.trim() || '',
      riskLevel:    wellbeingStatus === 'unsafe' ? RISK_LEVEL.HIGH :
                    wellbeingStatus === 'worried' ? RISK_LEVEL.MEDIUM : RISK_LEVEL.LOW,
      location:     null,
      locationNote: '',
      needsReview:  needsReview || wellbeingStatus === 'unsafe' || wellbeingStatus === 'worried',
      syncStatus:   SYNC_STATUS.PENDING,
      demoRecord:   demo,
      createdAt:    ts,
      updatedAt:    ts,
    })

    // Update service user
    serviceUserTable.update(serviceUserId, {
      wellbeingStatus:   newStatus,
      lastCheckInAt:     ts,
      helpRequestStatus: helpStatus !== 'none' ? helpStatus : undefined,
      updatedAt:         ts,
    })

    // Update mission timestamp
    if (missionId) {
      try { missionTable.update(missionId, { updatedAt: ts }) } catch {}
    }

    // Evidence record (append-only)
    evidenceTable.create({
      missionId:      missionId || null,
      visitId:        null,
      responderId:    null,
      serviceUserId,
      recordType:     'service_user_update',
      recordedByType: 'service_user',
      recordedById:   serviceUserId,
      title:          `Wellbeing Check-in — ${wellbeingStatus}`,
      content:        message?.trim() || `Wellbeing status: ${wellbeingStatus}. Support need: ${supportNeed || 'none'}.`,
      timestamp:      ts,
      dataFreshness:  'current',
      syncStatus:     SYNC_STATUS.PENDING,
      demoRecord:     demo,
      createdAt:      ts,
      updatedAt:      ts,
    })

    createSyncQueueItem('checkIn', checkIn.id, 'create', { wellbeingStatus, supportNeed }, demo)

    return { ok: true, checkIn }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Help Request ─────────────────────────────────────────────

/**
 * submitServiceUserHelpRequest({ serviceUserId, missionId, helpReason, urgency, message, safeToContact, preferredContactMethod })
 * Returns { ok, checkIn, message: msgRecord, error }
 */
export function submitServiceUserHelpRequest({
  serviceUserId, missionId,
  helpReason, urgency, message, safeToContact, preferredContactMethod
}) {
  try {
    if (!serviceUserId) return { ok: false, error: 'Service user ID is required.' }
    if (!helpReason)    return { ok: false, error: 'Help reason is required.' }

    const demo   = isDemo()
    const ts     = now()
    const isUrgent = urgency === 'urgent' || urgency === 'immediate_danger'
    const isCritical = urgency === 'immediate_danger'

    // Update service user status
    const newHelpStatus = isCritical ? 'urgent_help_requested' : 'support_requested'
    const newWellbeing  = isCritical
      ? SERVICE_USER_STATUS.URGENT_HELP_REQUESTED
      : SERVICE_USER_STATUS.SUPPORT_REQUESTED

    serviceUserTable.update(serviceUserId, {
      wellbeingStatus:   newWellbeing,
      helpRequestStatus: newHelpStatus,
      lastCheckInAt:     ts,
      updatedAt:         ts,
    })

    // Check-in record
    const checkIn = checkInTable.create({
      missionId:    missionId || null,
      responderId:  null,
      serviceUserId,
      checkInType:  CHECK_IN_TYPE.HELP_REQUEST,
      safetyStatus: isCritical ? 'escalating' : isUrgent ? 'needs_support' : 'needs_support',
      message:      message?.trim() || `Help requested: ${helpReason}. Urgency: ${urgency}.`,
      riskLevel:    isCritical ? RISK_LEVEL.CRITICAL : isUrgent ? RISK_LEVEL.HIGH : RISK_LEVEL.MEDIUM,
      location:     null,
      locationNote: '',
      needsReview:  true,
      syncStatus:   SYNC_STATUS.PENDING,
      demoRecord:   demo,
      createdAt:    ts,
      updatedAt:    ts,
    })

    // Message to dashboard/support team
    const msgRecord = messageTable.create({
      fromType:   'service_user',
      fromId:     serviceUserId,
      toType:     'dashboard',
      toId:       'coordinator',
      missionId:  missionId || null,
      subject:    `Help Request — ${urgency}: ${helpReason.replace(/_/g,' ')}`,
      body:       `${message?.trim() || 'No additional message.'}\n\nSafe to contact: ${safeToContact ? 'Yes' : 'No'}. Preferred contact: ${preferredContactMethod || 'not specified'}.`,
      priority:   isCritical ? 'urgent' : isUrgent ? 'high' : 'normal',
      readStatus: 'unread',
      syncStatus: SYNC_STATUS.PENDING,
      demoRecord: demo,
      createdAt:  ts,
    })

    // Risk flag for urgent/immediate danger
    if (isUrgent || helpReason === 'safety_concern') {
      riskFlagTable.create({
        missionId:               missionId || null,
        responderId:             null,
        linkedServiceUserId:     serviceUserId,
        riskLevel:               isCritical ? RISK_LEVEL.CRITICAL : RISK_LEVEL.HIGH,
        triggerType:             'service_user_help_request',
        title:                   `Help Request — ${urgency}: ${helpReason.replace(/_/g,' ')}`,
        description:             message?.trim() || `Service user submitted help request. Urgency: ${urgency}.`,
        status:                  'open',
        requiresSupervisorReview: true,
        humanReviewed:           false,
        reviewedById:            null,
        reviewedAt:              null,
        demoRecord:              demo,
        createdAt:               ts,
        updatedAt:               ts,
      })
    }

    // Evidence (append-only)
    evidenceTable.create({
      missionId:      missionId || null,
      visitId:        null,
      responderId:    null,
      serviceUserId,
      recordType:     'service_user_update',
      recordedByType: 'service_user',
      recordedById:   serviceUserId,
      title:          `Help Request — ${urgency}: ${helpReason.replace(/_/g,' ')}`,
      content:        message?.trim() || `Help request submitted. Reason: ${helpReason}. Urgency: ${urgency}.`,
      timestamp:      ts,
      dataFreshness:  'current',
      syncStatus:     SYNC_STATUS.PENDING,
      demoRecord:     demo,
      createdAt:      ts,
      updatedAt:      ts,
    })

    createSyncQueueItem('helpRequest', checkIn.id, 'create', { helpReason, urgency }, demo)

    return { ok: true, checkIn, message: msgRecord }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Visit Confirmation ───────────────────────────────────────

/**
 * confirmServiceUserVisit({ serviceUserId, missionId, confirmationStatus, note, preferredAlternativeTime })
 * confirmationStatus: 'visit_confirmed' | 'visit_declined' | 'rearrangement_requested'
 * Returns { ok, checkIn, error }
 */
export function confirmServiceUserVisit({
  serviceUserId, missionId,
  confirmationStatus, note, preferredAlternativeTime
}) {
  try {
    if (!serviceUserId)     return { ok: false, error: 'Service user ID is required.' }
    if (!confirmationStatus) return { ok: false, error: 'Confirmation status is required.' }

    const demo = isDemo()
    const ts   = now()

    // Map to SU wellbeing status
    const statusMap = {
      visit_confirmed:        SERVICE_USER_STATUS.VISIT_CONFIRMED,
      visit_declined:         SERVICE_USER_STATUS.VISIT_DECLINED,
      rearrangement_requested: SERVICE_USER_STATUS.NEEDS_FOLLOW_UP,
    }
    serviceUserTable.update(serviceUserId, {
      wellbeingStatus: statusMap[confirmationStatus] || SERVICE_USER_STATUS.CHECK_IN_RECEIVED,
      lastCheckInAt:   ts,
      updatedAt:       ts,
    })

    const checkIn = checkInTable.create({
      missionId:    missionId || null,
      responderId:  null,
      serviceUserId,
      checkInType:  CHECK_IN_TYPE.VISIT_CONFIRMATION,
      safetyStatus: 'safe',
      message:      [note?.trim(), preferredAlternativeTime ? `Preferred time: ${preferredAlternativeTime}` : ''].filter(Boolean).join(' | ') || confirmationStatus,
      riskLevel:    RISK_LEVEL.LOW,
      location:     null,
      locationNote: '',
      needsReview:  confirmationStatus === 'rearrangement_requested',
      syncStatus:   SYNC_STATUS.PENDING,
      demoRecord:   demo,
      createdAt:    ts,
      updatedAt:    ts,
    })

    // Message to support team
    messageTable.create({
      fromType:   'service_user',
      fromId:     serviceUserId,
      toType:     'dashboard',
      toId:       'coordinator',
      missionId:  missionId || null,
      subject:    `Visit ${confirmationStatus.replace(/_/g,' ')}`,
      body:       `${note?.trim() || ''}${preferredAlternativeTime ? ` Preferred alternative: ${preferredAlternativeTime}.` : ''}`.trim() || `Service user ${confirmationStatus.replace(/_/g,' ')}.`,
      priority:   'normal',
      readStatus: 'unread',
      syncStatus: SYNC_STATUS.PENDING,
      demoRecord: demo,
      createdAt:  ts,
    })

    // Evidence (append-only)
    evidenceTable.create({
      missionId:      missionId || null,
      visitId:        null,
      responderId:    null,
      serviceUserId,
      recordType:     'service_user_update',
      recordedByType: 'service_user',
      recordedById:   serviceUserId,
      title:          `Visit ${confirmationStatus.replace(/_/g,' ')}`,
      content:        note?.trim() || confirmationStatus,
      timestamp:      ts,
      dataFreshness:  'current',
      syncStatus:     SYNC_STATUS.PENDING,
      demoRecord:     demo,
      createdAt:      ts,
      updatedAt:      ts,
    })

    createSyncQueueItem('visitConfirmation', checkIn.id, 'create', { confirmationStatus }, demo)

    return { ok: true, checkIn }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Support Needs Update ─────────────────────────────────────

/**
 * updateServiceUserSupportNeeds({ serviceUserId, supportNeed, contactMethod, accessibilityNote, generalNote })
 * Returns { ok, error }
 */
export function updateServiceUserSupportNeeds({
  serviceUserId, supportNeed, contactMethod, accessibilityNote, generalNote
}) {
  try {
    if (!serviceUserId) return { ok: false, error: 'Service user ID is required.' }

    const demo = isDemo()
    const ts   = now()

    // Safe update — only update support/contact preference fields
    const updates = { updatedAt: ts }
    if (supportNeed)   updates.supportType   = supportNeed
    if (contactMethod) updates.contactMethod = contactMethod

    serviceUserTable.update(serviceUserId, updates)

    // Message + evidence (append-only)
    const content = [
      supportNeed     ? `Support need: ${supportNeed.replace(/_/g,' ')}` : '',
      contactMethod   ? `Contact method: ${contactMethod}` : '',
      accessibilityNote?.trim() ? `Accessibility/communication: ${accessibilityNote.trim()}` : '',
      generalNote?.trim()       ? `Note: ${generalNote.trim()}` : '',
    ].filter(Boolean).join('. ')

    messageTable.create({
      fromType:   'service_user',
      fromId:     serviceUserId,
      toType:     'dashboard',
      toId:       'coordinator',
      missionId:  null,
      subject:    'Support Needs Update',
      body:       content || 'Support needs updated.',
      priority:   'normal',
      readStatus: 'unread',
      syncStatus: SYNC_STATUS.PENDING,
      demoRecord: demo,
      createdAt:  ts,
    })

    evidenceTable.create({
      missionId:      null,
      visitId:        null,
      responderId:    null,
      serviceUserId,
      recordType:     'service_user_update',
      recordedByType: 'service_user',
      recordedById:   serviceUserId,
      title:          'Support Needs Update',
      content:        content || 'Support needs updated.',
      timestamp:      ts,
      dataFreshness:  'current',
      syncStatus:     SYNC_STATUS.PENDING,
      demoRecord:     demo,
      createdAt:      ts,
      updatedAt:      ts,
    })

    createSyncQueueItem('supportNeedsUpdate', serviceUserId, 'update', { supportNeed, contactMethod }, demo)

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Safety Concern ───────────────────────────────────────────

/**
 * submitServiceUserSafetyConcern({ serviceUserId, missionId, concernType, concernLevel, message, safeToContact, preferredContactMethod })
 * Returns { ok, checkIn, flag, error }
 */
export function submitServiceUserSafetyConcern({
  serviceUserId, missionId,
  concernType, concernLevel, message, safeToContact, preferredContactMethod
}) {
  try {
    if (!serviceUserId) return { ok: false, error: 'Service user ID is required.' }
    if (!concernType)   return { ok: false, error: 'Concern type is required.' }

    const demo       = isDemo()
    const ts         = now()
    const isCritical = concernLevel === 'immediate_danger'
    const isHigh     = concernLevel === 'high' || isCritical

    // Update service user status
    serviceUserTable.update(serviceUserId, {
      wellbeingStatus:   isCritical ? SERVICE_USER_STATUS.URGENT_HELP_REQUESTED : SERVICE_USER_STATUS.SAFETY_CONCERN,
      helpRequestStatus: isCritical ? 'urgent_help_requested' : 'support_requested',
      lastCheckInAt:     ts,
      updatedAt:         ts,
    })

    // Check-in
    const checkIn = checkInTable.create({
      missionId:    missionId || null,
      responderId:  null,
      serviceUserId,
      checkInType:  CHECK_IN_TYPE.HELP_REQUEST,
      safetyStatus: isCritical ? 'escalating' : 'concern',
      message:      message?.trim() || `Safety concern: ${concernType.replace(/_/g,' ')}. Level: ${concernLevel}.`,
      riskLevel:    isCritical ? RISK_LEVEL.CRITICAL : isHigh ? RISK_LEVEL.HIGH : RISK_LEVEL.MEDIUM,
      location:     null,
      locationNote: '',
      needsReview:  true,
      syncStatus:   SYNC_STATUS.PENDING,
      demoRecord:   demo,
      createdAt:    ts,
      updatedAt:    ts,
    })

    // Risk flag (advisory — not a safeguarding decision)
    const flag = riskFlagTable.create({
      missionId:               missionId || null,
      responderId:             null,
      linkedServiceUserId:     serviceUserId,
      riskLevel:               isCritical ? RISK_LEVEL.CRITICAL : isHigh ? RISK_LEVEL.HIGH : RISK_LEVEL.MEDIUM,
      triggerType:             'service_user_help_request',
      title:                   `Safety Concern — ${concernLevel}: ${concernType.replace(/_/g,' ')}`,
      description:             message?.trim() || `Service user raised safety concern. Type: ${concernType}. Level: ${concernLevel}. Safe to contact: ${safeToContact ? 'Yes' : 'No'}.`,
      status:                  'open',
      requiresSupervisorReview: true,
      humanReviewed:           false,
      reviewedById:            null,
      reviewedAt:              null,
      demoRecord:              demo,
      createdAt:               ts,
      updatedAt:               ts,
    })

    // Message to dashboard
    messageTable.create({
      fromType:   'service_user',
      fromId:     serviceUserId,
      toType:     'dashboard',
      toId:       'coordinator',
      missionId:  missionId || null,
      subject:    `Safety Concern — ${concernLevel}: ${concernType.replace(/_/g,' ')}`,
      body:       `${message?.trim() || ''}\n\nSafe to contact: ${safeToContact ? 'Yes' : 'No'}. Preferred contact: ${preferredContactMethod || 'not specified'}.\n\nAdvisory: Human supervisor review required.`.trim(),
      priority:   isCritical ? 'urgent' : 'high',
      readStatus: 'unread',
      syncStatus: SYNC_STATUS.PENDING,
      demoRecord: demo,
      createdAt:  ts,
    })

    // Evidence (append-only)
    evidenceTable.create({
      missionId:      missionId || null,
      visitId:        null,
      responderId:    null,
      serviceUserId,
      recordType:     'service_user_update',
      recordedByType: 'service_user',
      recordedById:   serviceUserId,
      title:          `Safety Concern — ${concernLevel}`,
      content:        message?.trim() || `Safety concern: ${concernType}. Level: ${concernLevel}.`,
      timestamp:      ts,
      dataFreshness:  'current',
      syncStatus:     SYNC_STATUS.PENDING,
      demoRecord:     demo,
      createdAt:      ts,
      updatedAt:      ts,
    })

    createSyncQueueItem('safetyConcern', flag.id, 'create', { concernType, concernLevel }, demo)

    return { ok: true, checkIn, flag }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Simple Message ───────────────────────────────────────────

/**
 * sendServiceUserMessage({ serviceUserId, missionId, subject, body, preferredContactMethod })
 * Returns { ok, message: msgRecord, error }
 */
export function sendServiceUserMessage({
  serviceUserId, missionId, subject, body, preferredContactMethod
}) {
  try {
    if (!serviceUserId)  return { ok: false, error: 'Service user ID is required.' }
    if (!body?.trim())   return { ok: false, error: 'Message cannot be empty.' }

    const demo = isDemo()
    const ts   = now()

    const msgRecord = messageTable.create({
      fromType:   'service_user',
      fromId:     serviceUserId,
      toType:     'dashboard',
      toId:       'coordinator',
      missionId:  missionId || null,
      subject:    subject?.trim() || 'Update from service user',
      body:       body.trim() + (preferredContactMethod ? `\n\nPreferred contact: ${preferredContactMethod}.` : ''),
      priority:   'normal',
      readStatus: 'unread',
      syncStatus: SYNC_STATUS.PENDING,
      demoRecord: demo,
      createdAt:  ts,
    })

    // Evidence (append-only)
    evidenceTable.create({
      missionId:      missionId || null,
      visitId:        null,
      responderId:    null,
      serviceUserId,
      recordType:     'service_user_update',
      recordedByType: 'service_user',
      recordedById:   serviceUserId,
      title:          subject?.trim() || 'Service User Message',
      content:        body.trim(),
      timestamp:      ts,
      dataFreshness:  'current',
      syncStatus:     SYNC_STATUS.PENDING,
      demoRecord:     demo,
      createdAt:      ts,
      updatedAt:      ts,
    })

    createSyncQueueItem('message', msgRecord.id, 'create', { subject: subject?.slice(0,80) }, demo)

    return { ok: true, message: msgRecord }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ─── Sync summary for Service User PWA ───────────────────────

export function getSUSyncSummary() {
  const demo  = isDemo()
  const items = demo ? syncQueueTable.list() : syncQueueTable.listLive()
  const pending  = items.filter(i => i.syncStatus === 'pending').length
  const failed   = items.filter(i => i.syncStatus === 'failed').length
  const offline  = items.filter(i => i.syncStatus === 'offline').length
  const synced   = items.filter(i => i.syncStatus === 'synced').length
  return { pending, failed, offline, synced, total: items.length, unhealthy: pending + failed + offline }
}

// ─── Label maps (non-clinical plain language) ─────────────────

export const WELLBEING_STATUS_LABELS = {
  okay:         'I\'m okay',
  unsure:       'I\'m not sure',
  need_support: 'I need some support',
  worried:      'I\'m worried',
  unsafe:       'I feel unsafe',
}

export const SUPPORT_NEED_LABELS = {
  no_support_needed:  'No support needed right now',
  call_requested:     'I\'d like a call',
  visit_requested:    'I\'d like a visit',
  food_or_supply_support: 'Food or supplies help',
  housing_support:    'Housing support',
  wellbeing_support:  'Wellbeing support',
  other:              'Other',
}

export const CONTACT_METHOD_LABELS = {
  phone:      'Phone call',
  in_person:  'In-person visit',
  message:    'Message / text',
  video:      'Video call',
  any:        'Any method',
}

export const SUPPORT_TYPE_LABELS = {
  regular_welfare_visit:   'Regular welfare visits',
  outreach_support:        'Outreach support',
  vulnerable_person_support: 'Vulnerable person support',
  follow_up_support:       'Follow-up support',
  community_support:       'Community support',
  supply_delivery:         'Supply delivery',
}

export const HELP_REASON_LABELS = {
  practical_support:  'Practical support',
  missed_visit:       'Missed visit',
  wellbeing_support:  'Wellbeing support',
  safety_concern:     'Safety concern',
  supplies_needed:    'Supplies needed',
  contact_requested:  'I\'d like to be contacted',
  other:              'Other',
}

export const URGENCY_LABELS = {
  routine:          'Routine — when available',
  soon:             'Soon — within a day',
  urgent:           'Urgent — as soon as possible',
  immediate_danger: 'Immediate danger — emergency',
}

export const CONCERN_TYPE_LABELS = {
  feel_unsafe:            'I feel unsafe',
  cannot_contact_support: 'Can\'t contact support',
  missed_visit:           'Visit was missed',
  urgent_practical_need:  'Urgent practical need',
  responder_not_arrived:  'Responder hasn\'t arrived',
  other:                  'Other',
}

export const CONCERN_LEVEL_LABELS = {
  low:              'Low — manageable',
  medium:           'Medium — needs attention',
  high:             'High — please prioritise',
  immediate_danger: 'Immediate danger — emergency',
}

export const CONSENT_STATUS_LABELS = {
  demo_consent:      'Demo consent (no real data)',
  consented:         'Consent given',
  consent_limited:   'Limited consent',
  consent_withdrawn: 'Consent withdrawn',
  pending:           'Consent pending',
  not_configured:    'Not configured',
}

export default {
  getCurrentServiceUserId, setCurrentServiceUserId,
  getCurrentServiceUser, sanitiseServiceUserRecord,
  getLinkedMissionsForServiceUser, sanitiseMissionForServiceUser,
  getAllServiceUsers,
  submitServiceUserWellbeingCheckIn,
  submitServiceUserHelpRequest,
  confirmServiceUserVisit,
  updateServiceUserSupportNeeds,
  submitServiceUserSafetyConcern,
  sendServiceUserMessage,
  getSUSyncSummary,
  WELLBEING_STATUS_LABELS, SUPPORT_NEED_LABELS, CONTACT_METHOD_LABELS,
  SUPPORT_TYPE_LABELS, HELP_REASON_LABELS, URGENCY_LABELS,
  CONCERN_TYPE_LABELS, CONCERN_LEVEL_LABELS, CONSENT_STATUS_LABELS,
}
