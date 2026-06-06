/**
 * ============================================================
 * ResponseLink OS™ — useRLAuth Hook
 * hooks_useRLAuth.js
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 10 — Supabase Auth + Realtime Wiring
 *
 * PURPOSE:
 *   Unified auth hook for all ResponseLink OS™ surfaces.
 *   Works in Demo Mode (returns demo stubs) and Live Mode
 *   (returns real Supabase auth state).
 *
 * USAGE:
 *   const { user, role, profile, isAuthenticated, isLoading,
 *           isDemo, noBackend, signIn, signOut, can } = useRLAuth()
 *
 * ROLE CHECKS:
 *   can('coordinator')     → true if role >= coordinator
 *   can('responder')       → true if role >= responder
 *   isAdmin                → shorthand for can('admin')
 *   isCoordinator          → shorthand for can('coordinator')
 *   isResponder            → shorthand for can('responder')
 *   isServiceUser          → role === 'service_user'
 *
 * COMPONENT USAGE:
 *   Use AuthGatePanel for rendering access-denied / login states.
 *
 * ⚠️  ADVISORY:
 *   This hook does not enforce emergency escalation.
 *   All critical decisions require human supervisor review.
 * ============================================================
 */

import { useState, useEffect, useCallback } from 'react'
import { rlAuthService, RL_ROLES, RL_ROLE_LABELS, hasRole } from './services_supabase_rlAuthService'
import { getDemoMode } from './core_rlData'

// ─── Hook ─────────────────────────────────────────────────────
export function useRLAuth() {
  const [user,            setUser]            = useState(null)
  const [profile,         setProfile]         = useState(null)
  const [role,            setRole]            = useState(null)
  const [isLoading,       setIsLoading]       = useState(true)
  const [error,           setError]           = useState(null)
  const [isDemo,          setIsDemo]          = useState(false)
  const [noBackend,       setNoBackend]       = useState(false)

  // ── Load user + profile ──────────────────────────────────
  const loadAuth = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const demoMode = getDemoMode()
      setIsDemo(demoMode)

      const { session, error: sessErr, _noBackend } = await rlAuthService.getSession()

      if (_noBackend) {
        setNoBackend(true)
        setUser(null)
        setProfile(null)
        setRole(null)
        setIsLoading(false)
        return
      }

      setNoBackend(false)

      if (sessErr && !session) {
        setError(sessErr)
        setUser(null)
        setProfile(null)
        setRole(null)
        setIsLoading(false)
        return
      }

      const sessionUser = session?.user || null
      setUser(sessionUser)

      if (sessionUser?.id) {
        const { profile: p, error: pErr } = await rlAuthService.getProfile(sessionUser.id)
        if (!pErr && p) {
          setProfile(p)
          setRole(p.role || RL_ROLES.VIEWER)
        } else {
          // Fallback role from user_metadata (Supabase custom claims)
          const metaRole = sessionUser?.user_metadata?.role || RL_ROLES.VIEWER
          setProfile(null)
          setRole(metaRole)
        }
      } else {
        setProfile(null)
        setRole(null)
      }
    } catch (e) {
      setError({ message: e.message || 'Auth check failed' })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ── Mount: load auth + subscribe to changes ──────────────
  useEffect(() => {
    loadAuth()

    const unsub = rlAuthService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadAuth()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setRole(null)
        setError(null)
      }
    })

    return () => { try { unsub() } catch {} }
  }, [loadAuth])

  // ── Sign in ───────────────────────────────────────────────
  const signIn = useCallback(async (email, password) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await rlAuthService.signIn(email, password)
      if (result.error) setError(result.error)
      else await loadAuth()
      return result
    } finally {
      setIsLoading(false)
    }
  }, [loadAuth])

  // ── Sign out ──────────────────────────────────────────────
  const signOut = useCallback(async () => {
    setIsLoading(true)
    try {
      await rlAuthService.signOut()
      setUser(null)
      setProfile(null)
      setRole(null)
      setError(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ── Permission check ──────────────────────────────────────
  const can = useCallback((requiredRole) => {
    if (!role) return false
    if (isDemo) return true  // Demo mode: all permissions
    return hasRole(role, requiredRole)
  }, [role, isDemo])

  // ── Derived flags ─────────────────────────────────────────
  const isAuthenticated = isDemo ? true : !!user
  const isAdmin         = can(RL_ROLES.ADMIN)
  const isCoordinator   = can(RL_ROLES.COORDINATOR)
  const isSupervisor    = can(RL_ROLES.SUPERVISOR)
  const isResponder     = can(RL_ROLES.RESPONDER)
  const isServiceUser   = role === RL_ROLES.SERVICE_USER
  const roleLabel       = role ? (RL_ROLE_LABELS[role] || role) : (isDemo ? 'Demo Admin' : null)

  return {
    // State
    user,
    profile,
    role,
    roleLabel,
    isLoading,
    error,
    isDemo,
    noBackend,
    isAuthenticated,

    // Permission shortcuts
    isAdmin,
    isCoordinator,
    isSupervisor,
    isResponder,
    isServiceUser,
    can,

    // Actions
    signIn,
    signOut,
    reload: loadAuth,

    // Context
    organisationId: profile?.organisation_id || null,
    orgName:        profile?.org_name || null,
    fullName:       profile?.full_name || user?.user_metadata?.full_name || null,
  }
}

export default useRLAuth
