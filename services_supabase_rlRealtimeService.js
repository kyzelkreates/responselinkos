/**
 * ============================================================
 * ResponseLink OS™ — Supabase Realtime Sync Service
 * services_supabase_rlRealtimeService.js
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 10 — Supabase Auth + Realtime Wiring
 *
 * PURPOSE:
 *   Wraps Supabase Realtime subscriptions for Live Mode.
 *   In Demo Mode, no Supabase calls are made — local BroadcastChannel
 *   and the existing rlSyncEngine handle cross-tab sync.
 *
 * REALTIME TABLES SUPPORTED:
 *   missions, mission_assignments, responder_status,
 *   service_user_status, check_ins, help_signals,
 *   incidents, evidence_items, escalation_events,
 *   ai_reviews, reports, notification_events
 *
 * SECURITY:
 *   - Realtime respects RLS — clients only receive rows they
 *     can SELECT. The anon key + Supabase RLS handles this.
 *   - No service role key used here.
 *   - No cross-org data leakage via realtime (RLS enforced server-side).
 *   - Each subscription is named and tracked for clean teardown.
 *
 * OFFLINE BEHAVIOUR:
 *   - Subscriptions are skipped if no backend configured.
 *   - Offline queue is managed in core_rlSyncEngine.js (SSOT).
 *   - On reconnect, app re-fetches from Supabase (future: Run 11+).
 *
 * ⚠️  ADVISORY:
 *   ResponseLink OS™ does not replace emergency services.
 *   Escalations require human supervisor review.
 * ============================================================
 */

import { getSupabaseClient, isConfigValid, getSupabaseSettings } from './services_supabase_supabaseClient'
import { getDemoMode } from './core_rlData'

// ─── Tables that support realtime in this app ─────────────────
export const RT_TABLES = {
  MISSIONS:           'missions',
  MISSION_ASSIGNMENTS: 'mission_assignments',
  RESPONDER_STATUS:   'responder_status',
  SERVICE_USER_STATUS: 'service_user_status',
  CHECK_INS:          'check_ins',
  HELP_SIGNALS:       'help_signals',
  INCIDENTS:          'incidents',
  EVIDENCE_ITEMS:     'evidence_items',
  ESCALATION_EVENTS:  'escalation_events',
  AI_REVIEWS:         'ai_reviews',
  REPORTS:            'reports',
  NOTIFICATION_EVENTS: 'notification_events',
}

// ─── Connection status ────────────────────────────────────────
let _realtimeStatus = 'disconnected'
const _statusListeners = new Set()

export function getRealtimeStatus() { return _realtimeStatus }

function _setStatus(s) {
  if (_realtimeStatus === s) return
  _realtimeStatus = s
  _statusListeners.forEach(fn => { try { fn(s) } catch {} })
}

export function onRealtimeStatusChange(fn) {
  _statusListeners.add(fn)
  return () => _statusListeners.delete(fn)
}

// ─── Channel registry ─────────────────────────────────────────
// Tracks all active channels so we can clean up properly.
const _channels = new Map()

function _trackChannel(name, channel) {
  _channels.set(name, channel)
  return channel
}

// ─── Core subscribe helper ────────────────────────────────────
/**
 * Subscribe to postgres_changes on a specific table.
 *
 * @param {object} options
 * @param {string} options.table       - Table name from RT_TABLES
 * @param {string} [options.event]     - 'INSERT' | 'UPDATE' | 'DELETE' | '*'
 * @param {string} [options.filter]    - e.g. 'organisation_id=eq.xxx'
 * @param {string} [options.channelName] - Unique channel identifier
 * @param {function} options.onEvent   - Called with the realtime event payload
 * @param {function} [options.onError] - Called on channel error
 *
 * @returns {function} unsubscribe — call to remove the subscription
 */
export function subscribeToTable({
  table,
  event = '*',
  filter = null,
  channelName = null,
  onEvent,
  onError,
}) {
  // Never subscribe in Demo Mode
  if (getDemoMode()) {
    return () => {}
  }

  const sb = getSupabaseClient()
  if (!sb) {
    _setStatus('not_configured')
    return () => {}
  }

  const name = channelName || `rl-rt-${table}-${Date.now()}`

  // Tear down existing channel with same name
  if (_channels.has(name)) {
    try {
      sb.removeChannel(_channels.get(name))
    } catch {}
    _channels.delete(name)
  }

  const pgConfig = { event, schema: 'public', table }
  if (filter) pgConfig.filter = filter

  const channel = sb
    .channel(name)
    .on('postgres_changes', pgConfig, (payload) => {
      try { onEvent(payload) } catch (e) {
        console.error(`[RL:Realtime] Error in ${table} handler:`, e)
      }
    })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        _setStatus('connected')
        console.debug(`[RL:Realtime] ✓ Subscribed: ${name}`)
      } else if (status === 'CHANNEL_ERROR') {
        _setStatus('error')
        console.warn(`[RL:Realtime] Channel error: ${name}`, err)
        if (onError) try { onError(err) } catch {}
      } else if (status === 'TIMED_OUT') {
        _setStatus('timeout')
        console.warn(`[RL:Realtime] Timeout: ${name}`)
      } else if (status === 'CLOSED') {
        _setStatus('disconnected')
      }
    })

  _trackChannel(name, channel)

  return () => {
    try {
      sb.removeChannel(channel)
      _channels.delete(name)
    } catch {}
  }
}

// ─── High-level subscription helpers ─────────────────────────
// Each function returns an unsubscribe function.

/**
 * Subscribe to mission changes for an organisation.
 * Used by: Command Dashboard
 */
export function subscribeMissions({ organisationId, onEvent }) {
  return subscribeToTable({
    table:       RT_TABLES.MISSIONS,
    channelName: `rl-missions-${organisationId}`,
    filter:      organisationId ? `organisation_id=eq.${organisationId}` : null,
    onEvent,
  })
}

/**
 * Subscribe to missions assigned to a specific responder.
 * Used by: Responder PWA
 */
export function subscribeResponderMissions({ responderId, onEvent }) {
  return subscribeToTable({
    table:       RT_TABLES.MISSIONS,
    channelName: `rl-missions-responder-${responderId}`,
    filter:      responderId ? `assigned_to=eq.${responderId}` : null,
    onEvent,
  })
}

/**
 * Subscribe to responder status changes.
 * Used by: Command Dashboard
 */
export function subscribeResponderStatus({ organisationId, onEvent }) {
  return subscribeToTable({
    table:       RT_TABLES.RESPONDER_STATUS,
    channelName: `rl-responder-status-${organisationId}`,
    filter:      organisationId ? `organisation_id=eq.${organisationId}` : null,
    onEvent,
  })
}

/**
 * Subscribe to service user status changes.
 * Used by: Command Dashboard
 */
export function subscribeServiceUserStatus({ organisationId, onEvent }) {
  return subscribeToTable({
    table:       RT_TABLES.SERVICE_USER_STATUS,
    channelName: `rl-su-status-${organisationId}`,
    filter:      organisationId ? `organisation_id=eq.${organisationId}` : null,
    onEvent,
  })
}

/**
 * Subscribe to check-ins.
 * Used by: Command Dashboard, Responder PWA
 */
export function subscribeCheckIns({ organisationId, responderId, onEvent }) {
  const filter = responderId
    ? `responder_id=eq.${responderId}`
    : organisationId
      ? `organisation_id=eq.${organisationId}`
      : null
  return subscribeToTable({
    table:       RT_TABLES.CHECK_INS,
    channelName: `rl-checkins-${responderId || organisationId}`,
    filter,
    onEvent,
  })
}

/**
 * Subscribe to help signals.
 * Used by: Command Dashboard, Service User PWA
 */
export function subscribeHelpSignals({ organisationId, serviceUserId, onEvent }) {
  const filter = serviceUserId
    ? `service_user_id=eq.${serviceUserId}`
    : organisationId
      ? `organisation_id=eq.${organisationId}`
      : null
  return subscribeToTable({
    table:       RT_TABLES.HELP_SIGNALS,
    channelName: `rl-helpsignals-${serviceUserId || organisationId}`,
    filter,
    onEvent,
  })
}

/**
 * Subscribe to incidents.
 * Used by: Command Dashboard
 */
export function subscribeIncidents({ organisationId, onEvent }) {
  return subscribeToTable({
    table:       RT_TABLES.INCIDENTS,
    channelName: `rl-incidents-${organisationId}`,
    filter:      organisationId ? `organisation_id=eq.${organisationId}` : null,
    onEvent,
  })
}

/**
 * Subscribe to escalation events.
 * Used by: Command Dashboard (supervisors/admins only — RLS enforced)
 */
export function subscribeEscalations({ organisationId, onEvent }) {
  return subscribeToTable({
    table:       RT_TABLES.ESCALATION_EVENTS,
    channelName: `rl-escalations-${organisationId}`,
    filter:      organisationId ? `organisation_id=eq.${organisationId}` : null,
    onEvent,
  })
}

/**
 * Subscribe to notification events.
 * Used by: all surfaces
 */
export function subscribeNotifications({ userId, organisationId, onEvent }) {
  const filter = userId
    ? `target_user_id=eq.${userId}`
    : organisationId
      ? `organisation_id=eq.${organisationId}`
      : null
  return subscribeToTable({
    table:       RT_TABLES.NOTIFICATION_EVENTS,
    channelName: `rl-notifications-${userId || organisationId}`,
    filter,
    onEvent,
  })
}

// ─── Bulk unsubscribe ─────────────────────────────────────────
export function unsubscribeAll() {
  const sb = getSupabaseClient()
  if (!sb) return
  _channels.forEach((channel, name) => {
    try { sb.removeChannel(channel) } catch {}
  })
  _channels.clear()
  _setStatus('disconnected')
  console.debug('[RL:Realtime] All subscriptions removed')
}

// ─── Status summary ───────────────────────────────────────────
export function getRealtimeSummary() {
  const isDemo = getDemoMode()
  const sb     = getSupabaseClient()
  return {
    mode:               isDemo ? 'demo' : 'live',
    configured:         !isDemo && !!sb,
    status:             isDemo ? 'demo_mode' : _realtimeStatus,
    activeChannels:     _channels.size,
    activeChannelNames: [..._channels.keys()],
  }
}
