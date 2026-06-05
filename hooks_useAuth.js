/**
 * ============================================================
 * ResponseLink OS™ — useAuth Hook
 * Run 9 — No Auth — Safe stubs for demo deployment
 *
 * Auth is removed for demo. This hook returns safe defaults
 * so existing components that call useAuth() don't crash.
 * ============================================================
 */

export function useAuth() {
  return {
    user:            null,
    role:            'admin',          // treat everyone as admin for demo
    session:         null,
    isAuthenticated: true,             // always authenticated in demo mode
    isLoading:       false,
    roleLabel:       'Administrator',
    can:             () => true,       // all permissions granted
    isDriver:        false,
    isAdmin:         true,
    isSuperAdmin:    true,
    signOut:         async () => {},   // no-op
  }
}

export default useAuth
