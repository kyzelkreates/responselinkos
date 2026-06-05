/**
 * ============================================================
 * ResponseLink OS™ — Core Data Layer (SSOT Extension)
 * /src/core/rlData.js
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 2 — Core Data Model and Demo/Live Separation
 *
 * ⚠️  DESIGN RULES:
 *   - This is the SINGLE SOURCE OF TRUTH for all ResponseLink OS™
 *     entity data (organisations, responders, serviceUsers, missions,
 *     welfareVisits, checkIns, riskFlags, incidents, messages,
 *     evidenceRecords, syncQueue, appSettings).
 *   - It extends the existing localStorage pattern from services_local_localDB.js.
 *   - It does NOT replace or duplicate core_storage.js (Zustand UI state).
 *   - It does NOT replace services_local_localDB.js (legacy fleet/driver tables — preserved).
 *   - No backend, no Supabase, no Firebase in this run.
 *   - All demo data is labelled demoRecord: true.
 *   - Demo data must never appear in live mode.
 *
 * ⚠️  ADVISORY NOTICE:
 *   ResponseLink OS™ is advisory and coordination-support software.
 *   It does not replace emergency services, safeguarding professionals,
 *   clinical judgement, or legal duties.
 *   If someone is in immediate danger, contact emergency services.
 * ============================================================
 */

// ─── Storage Keys ─────────────────────────────────────────────
export const RL_KEYS = {
  ORGANISATIONS:   'rl:db:organisations',
  RESPONDERS:      'rl:db:responders',
  SERVICE_USERS:   'rl:db:serviceUsers',
  MISSIONS:        'rl:db:missions',
  WELFARE_VISITS:  'rl:db:welfareVisits',
  CHECK_INS:       'rl:db:checkIns',
  RISK_FLAGS:      'rl:db:riskFlags',
  INCIDENTS:       'rl:db:incidents',
  MESSAGES:        'rl:db:messages',
  EVIDENCE:        'rl:db:evidenceRecords',
  SYNC_QUEUE:      'rl:db:syncQueue',
  APP_SETTINGS:    'rl:settings:app',
}

// ─── Allowed Status/Type Enums ────────────────────────────────
export const RESPONDER_STATUS = {
  AVAILABLE:             'available',
  ASSIGNED:              'assigned',
  TRAVELLING:            'travelling',
  ARRIVED:               'arrived',
  ACTIVE_VISIT:          'active_visit',
  CHECK_IN_DUE:          'check_in_due',
  OVERDUE:               'overdue',
  ESCALATING:            'escalating',
  COMPLETED:             'completed',
  OFFLINE:               'offline',
  NEEDS_SUPERVISOR_REVIEW: 'needs_supervisor_review',
}

export const SERVICE_USER_STATUS = {
  STABLE:                   'stable',
  CHECK_IN_RECEIVED:        'check_in_received',
  SUPPORT_REQUESTED:        'support_requested',
  MISSED_CHECK_IN:          'missed_check_in',
  VISIT_CONFIRMED:          'visit_confirmed',
  VISIT_DECLINED:           'visit_declined',
  WELLBEING_CONCERN:        'wellbeing_concern',
  SAFETY_CONCERN:           'safety_concern',
  URGENT_HELP_REQUESTED:    'urgent_help_requested',
  OFFLINE:                  'offline',
  NEEDS_FOLLOW_UP:          'needs_follow_up',
  NEEDS_SUPERVISOR_REVIEW:  'needs_supervisor_review',
}

export const MISSION_STATUS = {
  DRAFT:                    'draft',
  SCHEDULED:                'scheduled',
  ASSIGNED:                 'assigned',
  TRAVELLING:               'travelling',
  ARRIVED:                  'arrived',
  IN_PROGRESS:              'in_progress',
  CHECK_IN_DUE:             'check_in_due',
  OVERDUE:                  'overdue',
  ESCALATING:               'escalating',
  COMPLETED:                'completed',
  CANCELLED:                'cancelled',
  NEEDS_SUPERVISOR_REVIEW:  'needs_supervisor_review',
}

export const MISSION_TYPE = {
  WELFARE_CHECK:                'welfare_check',
  OUTREACH_VISIT:               'outreach_visit',
  SUPPLY_DELIVERY:              'supply_delivery',
  FOLLOW_UP_VISIT:              'follow_up_visit',
  SAFETY_CHECK:                 'safety_check',
  INCIDENT_RESPONSE:            'incident_response',
  VOLUNTEER_TASK:               'volunteer_task',
  VULNERABLE_PERSON_SUPPORT:    'vulnerable_person_support',
  COMMUNITY_SUPPORT_ASSIGNMENT: 'community_support_assignment',
}

export const RISK_LEVEL = {
  LOW:      'low',
  MEDIUM:   'medium',
  HIGH:     'high',
  CRITICAL: 'critical',
}

export const SYNC_STATUS = {
  SYNCED:                    'synced',
  PENDING:                   'pending',
  OFFLINE:                   'offline',
  CONFLICT:                  'conflict',
  FAILED:                    'failed',
  NEEDS_RETRY:               'needs_retry',
  SUPERVISOR_REVIEW_REQUIRED: 'supervisor_review_required',
}

export const RECORD_TYPE = {
  NOTE:                 'note',
  CHECKLIST:            'checklist',
  CHECK_IN:             'check_in',
  INCIDENT:             'incident',
  ESCALATION:           'escalation',
  SUPERVISOR_REVIEW:    'supervisor_review',
  SERVICE_USER_UPDATE:  'service_user_update',
  RESPONDER_UPDATE:     'responder_update',
  AI_ADVISORY_SUMMARY:  'ai_advisory_summary',
  HUMAN_DECISION_LOG:   'human_decision_log',
}

export const CHECK_IN_TYPE = {
  RESPONDER_SAFETY:     'responder_safety',
  SERVICE_USER_WELLBEING: 'service_user_wellbeing',
  VISIT_CONFIRMATION:   'visit_confirmation',
  HELP_REQUEST:         'help_request',
  MISSED_CONTACT:       'missed_contact',
  SUPPORT_UPDATE:       'support_update',
  SUPERVISOR_NOTE:      'supervisor_note',
}

export const RISK_TRIGGER = {
  OVERDUE_RESPONDER_CHECK_IN:    'overdue_responder_check_in',
  MISSED_SERVICE_USER_CHECK_IN:  'missed_service_user_check_in',
  HIGH_RISK_MISSION:             'high_risk_mission',
  SAFEGUARDING_CONCERN:          'safeguarding_concern',
  RESPONDER_ESCALATION:          'responder_escalation',
  SERVICE_USER_HELP_REQUEST:     'service_user_help_request',
  MISSING_EVIDENCE:              'missing_evidence',
  REPEATED_FAILED_CONTACT:       'repeated_failed_contact',
  LOCATION_RISK_NOTE:            'location_risk_note',
  VULNERABLE_PERSON_RISK_MARKER: 'vulnerable_person_risk_marker',
  OFFLINE_TOO_LONG:              'offline_too_long',
  INCOMPLETE_WELFARE_CHECKLIST:  'incomplete_welfare_checklist',
  UNRESOLVED_INCIDENT:           'unresolved_incident',
  REPEATED_WELLBEING_DECLINE:    'repeated_wellbeing_decline',
}

// ─── Internal Helpers ─────────────────────────────────────────
const uid = () =>
  `rl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const now = () => new Date().toISOString()

// Broadcast changes across tabs (same pattern as localDB)
let rlBC = null
try { rlBC = new BroadcastChannel('rl:db') } catch {}

function broadcast(event, table, payload) {
  rlBC?.postMessage({ event, table, payload, ts: Date.now() })
}

// ─── Generic Table CRUD (matches services_local_localDB pattern) ──
function rlTable(key) {
  const read = () => {
    try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
  }
  const write = (rows) => {
    try { localStorage.setItem(key, JSON.stringify(rows)) } catch (e) {
      console.warn('[RL:DB] write failed:', key, e)
    }
  }

  return {
    list(filter = {}) {
      let rows = read()
      for (const [k, v] of Object.entries(filter)) {
        rows = rows.filter(r => r[k] === v)
      }
      return rows
    },

    listLive() {
      // Returns only non-demo records (for live mode)
      return read().filter(r => !r.demoRecord)
    },

    listDemo() {
      // Returns only demo records
      return read().filter(r => r.demoRecord === true)
    },

    get(id) {
      return read().find(r => r.id === id) || null
    },

    create(data) {
      const rows = read()
      const row = {
        id: uid(),
        createdAt: now(),
        updatedAt: now(),
        demoRecord: false,
        ...data,
      }
      rows.unshift(row)
      write(rows)
      broadcast('INSERT', key, row)
      return row
    },

    update(id, data) {
      const rows = read()
      const idx = rows.findIndex(r => r.id === id)
      if (idx === -1) throw new Error(`[RL:DB] Record ${id} not found in ${key}`)
      rows[idx] = { ...rows[idx], ...data, updatedAt: now() }
      write(rows)
      broadcast('UPDATE', key, rows[idx])
      return rows[idx]
    },

    delete(id) {
      const rows = read().filter(r => r.id !== id)
      write(rows)
      broadcast('DELETE', key, { id })
    },

    clearDemo() {
      const rows = read().filter(r => !r.demoRecord)
      write(rows)
      broadcast('CLEAR_DEMO', key, {})
    },

    clearAll() {
      write([])
      broadcast('CLEAR', key, {})
    },

    count() { return read().length },
    countDemo() { return read().filter(r => r.demoRecord === true).length },
    countLive() { return read().filter(r => !r.demoRecord).length },

    bulkInsert(records) {
      const rows = read()
      const inserted = records.map(data => ({
        id: uid(),
        createdAt: now(),
        updatedAt: now(),
        demoRecord: false,
        ...data,
      }))
      inserted.forEach(r => rows.unshift(r))
      write(rows)
      broadcast('BULK_INSERT', key, { count: inserted.length })
      return inserted
    },
  }
}

// ─── Named Tables ─────────────────────────────────────────────
export const organisationTable  = rlTable(RL_KEYS.ORGANISATIONS)
export const responderTable     = rlTable(RL_KEYS.RESPONDERS)
export const serviceUserTable   = rlTable(RL_KEYS.SERVICE_USERS)
export const missionTable       = rlTable(RL_KEYS.MISSIONS)
export const welfareVisitTable  = rlTable(RL_KEYS.WELFARE_VISITS)
export const checkInTable       = rlTable(RL_KEYS.CHECK_INS)
export const riskFlagTable      = rlTable(RL_KEYS.RISK_FLAGS)
export const incidentTable      = rlTable(RL_KEYS.INCIDENTS)
export const messageTable       = rlTable(RL_KEYS.MESSAGES)
export const evidenceTable      = rlTable(RL_KEYS.EVIDENCE)
export const syncQueueTable     = rlTable(RL_KEYS.SYNC_QUEUE)

// ─── App Settings (singleton, not an array table) ─────────────
const DEFAULT_APP_SETTINGS = {
  demoMode:                    true,   // starts in demo mode
  liveModeReady:               false,
  backendProvider:             null,   // 'supabase' | 'firebase' | 'aws' | 'custom' | null
  backendConfigured:           false,
  backendConnectionStatus:     'not_configured',
  lastSyncAt:                  null,
  dataModeWarningAccepted:     false,
  createdAt:                   now(),
  updatedAt:                   now(),
}

export const appSettings = {
  get() {
    try {
      const raw = localStorage.getItem(RL_KEYS.APP_SETTINGS)
      if (!raw) return { ...DEFAULT_APP_SETTINGS }
      return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) }
    } catch {
      return { ...DEFAULT_APP_SETTINGS }
    }
  },
  set(data) {
    try {
      const current = this.get()
      const updated = { ...current, ...data, updatedAt: now() }
      localStorage.setItem(RL_KEYS.APP_SETTINGS, JSON.stringify(updated))
      return updated
    } catch (e) {
      console.warn('[RL:Settings] set failed:', e)
      return this.get()
    }
  },
  reset() {
    try {
      localStorage.setItem(RL_KEYS.APP_SETTINGS, JSON.stringify({ ...DEFAULT_APP_SETTINGS, updatedAt: now() }))
    } catch {}
    return { ...DEFAULT_APP_SETTINGS }
  },
}

// ─── Real-time Subscription ───────────────────────────────────
export function rlSubscribe(tableKey, callback) {
  const handler = (e) => {
    if (e.data?.table === tableKey) callback(e.data)
  }
  rlBC?.addEventListener('message', handler)
  return () => rlBC?.removeEventListener('message', handler)
}

// ─── Demo Mode API ────────────────────────────────────────────

/**
 * getDemoMode()
 * Returns true if demo mode is currently active.
 */
export function getDemoMode() {
  return appSettings.get().demoMode === true
}

/**
 * getLiveModeStatus()
 * Returns an object describing current live mode readiness.
 */
export function getLiveModeStatus() {
  const s = appSettings.get()
  return {
    liveModeReady:           s.liveModeReady,
    backendProvider:         s.backendProvider,
    backendConfigured:       s.backendConfigured,
    backendConnectionStatus: s.backendConnectionStatus,
    lastSyncAt:              s.lastSyncAt,
    demoMode:                s.demoMode,
  }
}

/**
 * toggleDemoMode()
 * Toggles demo mode ON/OFF.
 * When turning OFF, calls clearDemoData() to hide/remove demo records.
 * When turning ON, does NOT auto-seed — caller should call seedDemoData().
 * Returns the new demoMode value.
 */
export function toggleDemoMode() {
  const current = getDemoMode()
  const next = !current
  if (!next) {
    // Turning demo OFF — clear demo records
    clearDemoData()
  }
  appSettings.set({ demoMode: next })
  return next
}

/**
 * setDemoMode(value: boolean)
 * Explicitly set demo mode.
 */
export function setDemoMode(value) {
  if (!value) clearDemoData()
  appSettings.set({ demoMode: !!value })
  return !!value
}

/**
 * clearDemoData()
 * Removes all records where demoRecord === true from every RL table.
 * Does NOT remove real/live records.
 */
export function clearDemoData() {
  organisationTable.clearDemo()
  responderTable.clearDemo()
  serviceUserTable.clearDemo()
  missionTable.clearDemo()
  welfareVisitTable.clearDemo()
  checkInTable.clearDemo()
  riskFlagTable.clearDemo()
  incidentTable.clearDemo()
  messageTable.clearDemo()
  evidenceTable.clearDemo()
  syncQueueTable.clearDemo()
  console.info('[RL:Data] Demo data cleared.')
}

/**
 * resetToEmptyLiveState()
 * Clears ALL RL data (demo + live) and resets settings.
 * Used for a full reset to a clean live-mode starting point.
 * WARNING: irreversible for live records.
 */
export function resetToEmptyLiveState() {
  organisationTable.clearAll()
  responderTable.clearAll()
  serviceUserTable.clearAll()
  missionTable.clearAll()
  welfareVisitTable.clearAll()
  checkInTable.clearAll()
  riskFlagTable.clearAll()
  incidentTable.clearAll()
  messageTable.clearAll()
  evidenceTable.clearAll()
  syncQueueTable.clearAll()
  appSettings.set({
    demoMode: false,
    liveModeReady: false,
    backendConfigured: false,
    backendConnectionStatus: 'not_configured',
  })
  console.info('[RL:Data] Reset to empty live state.')
}

/**
 * markRecordAsDemo(table, id)
 * Marks an existing record as a demo record.
 */
export function markRecordAsDemo(tbl, id) {
  try { tbl.update(id, { demoRecord: true }) } catch (e) {
    console.warn('[RL:Data] markRecordAsDemo failed:', e)
  }
}

/**
 * filterDemoRecords(records)
 * Returns only demo records from an array.
 */
export function filterDemoRecords(records) {
  return (records || []).filter(r => r.demoRecord === true)
}

/**
 * filterLiveRecords(records)
 * Returns only non-demo records.
 */
export function filterLiveRecords(records) {
  return (records || []).filter(r => !r.demoRecord)
}

/**
 * validateNoDemoDataInLiveMode()
 * Returns { ok: boolean, issues: string[] }
 * Non-breaking — only logs warnings.
 */
export function validateNoDemoDataInLiveMode() {
  const mode = getDemoMode()
  if (mode) return { ok: true, issues: [], note: 'Demo mode is ON — demo data is expected.' }
  const issues = []
  const tables = [
    { name: 'organisations', t: organisationTable },
    { name: 'responders', t: responderTable },
    { name: 'serviceUsers', t: serviceUserTable },
    { name: 'missions', t: missionTable },
    { name: 'welfareVisits', t: welfareVisitTable },
    { name: 'checkIns', t: checkInTable },
    { name: 'riskFlags', t: riskFlagTable },
    { name: 'incidents', t: incidentTable },
    { name: 'messages', t: messageTable },
    { name: 'evidenceRecords', t: evidenceTable },
  ]
  tables.forEach(({ name, t }) => {
    const count = t.countDemo()
    if (count > 0) issues.push(`${name}: ${count} demo record(s) found in live mode`)
  })
  if (issues.length > 0) {
    console.warn('[RL:Validate] Demo data found in live mode:', issues)
  }
  return { ok: issues.length === 0, issues }
}

// ─── Sync Queue Helpers ───────────────────────────────────────

/**
 * createSyncQueueItem(entityType, entityId, action, payload, isDemo)
 * Queues an entity change for later backend sync.
 */
export function createSyncQueueItem(entityType, entityId, action, payload = {}, isDemo = false) {
  return syncQueueTable.create({
    entityType,
    entityId,
    action,        // 'create' | 'update' | 'delete'
    payload,
    syncStatus:    SYNC_STATUS.PENDING,
    attempts:      0,
    lastAttemptAt: null,
    errorMessage:  null,
    demoRecord:    isDemo,
    createdAt:     now(),
    updatedAt:     now(),
  })
}

/**
 * updateSyncStatus(id, status, errorMessage)
 * Updates the sync status of a queue item.
 */
export function updateSyncStatus(id, status, errorMessage = null) {
  return syncQueueTable.update(id, {
    syncStatus:    status,
    lastAttemptAt: now(),
    errorMessage:  errorMessage || null,
    attempts:      (syncQueueTable.get(id)?.attempts || 0) + 1,
  })
}

// ─── State Validation ─────────────────────────────────────────
const VALID_RISK_LEVELS    = Object.values(RISK_LEVEL)
const VALID_RESPONDER_STATUS = Object.values(RESPONDER_STATUS)
const VALID_SU_STATUS       = Object.values(SERVICE_USER_STATUS)
const VALID_MISSION_STATUS  = Object.values(MISSION_STATUS)
const VALID_SYNC_STATUS     = Object.values(SYNC_STATUS)

/**
 * validateResponseLinkState()
 * Validates data integrity. Non-blocking — returns { ok, issues }.
 */
export function validateResponseLinkState() {
  const issues = []

  // 1. Check demo/live separation
  if (!getDemoMode()) {
    const dmCheck = validateNoDemoDataInLiveMode()
    if (!dmCheck.ok) issues.push(...dmCheck.issues)
  }

  // 2. Check responder statuses
  responderTable.list().forEach(r => {
    if (r.status && !VALID_RESPONDER_STATUS.includes(r.status)) {
      issues.push(`Responder ${r.id}: invalid status "${r.status}"`)
    }
  })

  // 3. Check service user statuses
  serviceUserTable.list().forEach(su => {
    if (su.wellbeingStatus && !VALID_SU_STATUS.includes(su.wellbeingStatus)) {
      issues.push(`ServiceUser ${su.id}: invalid wellbeingStatus "${su.wellbeingStatus}"`)
    }
  })

  // 4. Check mission statuses and risk levels
  const orgIds  = new Set(organisationTable.list().map(o => o.id))
  const respIds = new Set(responderTable.list().map(r => r.id))
  const suIds   = new Set(serviceUserTable.list().map(s => s.id))

  missionTable.list().forEach(m => {
    if (m.status && !VALID_MISSION_STATUS.includes(m.status)) {
      issues.push(`Mission ${m.id}: invalid status "${m.status}"`)
    }
    if (m.riskLevel && !VALID_RISK_LEVELS.includes(m.riskLevel)) {
      issues.push(`Mission ${m.id}: invalid riskLevel "${m.riskLevel}"`)
    }
    if (m.assignedResponderId && !respIds.has(m.assignedResponderId) && respIds.size > 0) {
      issues.push(`Mission ${m.id}: assignedResponderId "${m.assignedResponderId}" not found in responders`)
    }
    if (m.linkedServiceUserId && !suIds.has(m.linkedServiceUserId) && suIds.size > 0) {
      issues.push(`Mission ${m.id}: linkedServiceUserId "${m.linkedServiceUserId}" not found in serviceUsers`)
    }
  })

  // 5. Check sync queue statuses
  syncQueueTable.list().forEach(sq => {
    if (sq.syncStatus && !VALID_SYNC_STATUS.includes(sq.syncStatus)) {
      issues.push(`SyncQueue ${sq.id}: invalid syncStatus "${sq.syncStatus}"`)
    }
  })

  if (issues.length > 0) {
    console.warn('[RL:Validate] State validation issues:', issues)
  } else {
    console.info('[RL:Validate] State validation passed.')
  }

  return { ok: issues.length === 0, issues }
}

// ─── getState / setState (convenience wrappers) ───────────────

/**
 * getState()
 * Returns a snapshot of all RL entity tables and settings.
 */
export function getState() {
  return {
    settings:       appSettings.get(),
    organisations:  organisationTable.list(),
    responders:     responderTable.list(),
    serviceUsers:   serviceUserTable.list(),
    missions:       missionTable.list(),
    welfareVisits:  welfareVisitTable.list(),
    checkIns:       checkInTable.list(),
    riskFlags:      riskFlagTable.list(),
    incidents:      incidentTable.list(),
    messages:       messageTable.list(),
    evidenceRecords: evidenceTable.list(),
    syncQueue:      syncQueueTable.list(),
  }
}

/**
 * getStateCounts()
 * Returns record counts per entity, split by demo/live.
 */
export function getStateCounts() {
  const tables = [
    { key: 'organisations',   t: organisationTable },
    { key: 'responders',      t: responderTable },
    { key: 'serviceUsers',    t: serviceUserTable },
    { key: 'missions',        t: missionTable },
    { key: 'welfareVisits',   t: welfareVisitTable },
    { key: 'checkIns',        t: checkInTable },
    { key: 'riskFlags',       t: riskFlagTable },
    { key: 'incidents',       t: incidentTable },
    { key: 'messages',        t: messageTable },
    { key: 'evidenceRecords', t: evidenceTable },
    { key: 'syncQueue',       t: syncQueueTable },
  ]
  const result = {}
  tables.forEach(({ key, t }) => {
    result[key] = {
      total: t.count(),
      demo:  t.countDemo(),
      live:  t.countLive(),
    }
  })
  return result
}

/**
 * setState(partial)
 * Applies a partial state object — used for bulk imports or test resets.
 * Each top-level key maps to an entity table.
 * WARNING: This replaces table contents. Use with caution.
 */
export function setState(partial = {}) {
  if (partial.organisations)   { organisationTable.clearAll(); partial.organisations.forEach(r => organisationTable.create(r)) }
  if (partial.responders)      { responderTable.clearAll(); partial.responders.forEach(r => responderTable.create(r)) }
  if (partial.serviceUsers)    { serviceUserTable.clearAll(); partial.serviceUsers.forEach(r => serviceUserTable.create(r)) }
  if (partial.missions)        { missionTable.clearAll(); partial.missions.forEach(r => missionTable.create(r)) }
  if (partial.welfareVisits)   { welfareVisitTable.clearAll(); partial.welfareVisits.forEach(r => welfareVisitTable.create(r)) }
  if (partial.checkIns)        { checkInTable.clearAll(); partial.checkIns.forEach(r => checkInTable.create(r)) }
  if (partial.riskFlags)       { riskFlagTable.clearAll(); partial.riskFlags.forEach(r => riskFlagTable.create(r)) }
  if (partial.incidents)       { incidentTable.clearAll(); partial.incidents.forEach(r => incidentTable.create(r)) }
  if (partial.messages)        { messageTable.clearAll(); partial.messages.forEach(r => messageTable.create(r)) }
  if (partial.evidenceRecords) { evidenceTable.clearAll(); partial.evidenceRecords.forEach(r => evidenceTable.create(r)) }
  if (partial.syncQueue)       { syncQueueTable.clearAll(); partial.syncQueue.forEach(r => syncQueueTable.create(r)) }
  if (partial.settings)        { appSettings.set(partial.settings) }
  console.info('[RL:Data] setState applied.')
}

// ─── Export Default ───────────────────────────────────────────
export default {
  RL_KEYS,
  RESPONDER_STATUS,
  SERVICE_USER_STATUS,
  MISSION_STATUS,
  MISSION_TYPE,
  RISK_LEVEL,
  SYNC_STATUS,
  RECORD_TYPE,
  CHECK_IN_TYPE,
  RISK_TRIGGER,
  // Tables
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
  // Settings
  appSettings,
  // API
  getDemoMode,
  getLiveModeStatus,
  toggleDemoMode,
  setDemoMode,
  clearDemoData,
  resetToEmptyLiveState,
  markRecordAsDemo,
  filterDemoRecords,
  filterLiveRecords,
  validateNoDemoDataInLiveMode,
  validateResponseLinkState,
  createSyncQueueItem,
  updateSyncStatus,
  getState,
  getStateCounts,
  setState,
  rlSubscribe,
}
