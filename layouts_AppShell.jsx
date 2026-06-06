/**
 * ============================================================
 * ResponseLink OS™ — Application Shell
 * Run 1 — Identity, Shell, Navigation, Safe Refactor Foundation
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Burger menu mode: sidebar is a slide-over drawer on all sizes.
 * Overlay dims the page when drawer is open.
 * Visual identity: black base background (#0a0000).
 * ============================================================
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import Sidebar from './layouts_Sidebar'
import TopNav  from './layouts_TopNav'
import { useAppStore } from './core_storage'
import { BackendWarningBanner } from './components_ui_ConnectionStatus'

export default function AppShell() {
  const sidebarExpanded = useAppStore(s => s.sidebarExpanded)
  const closeSidebar    = useAppStore(s => s.closeSidebar  || (() => s.sidebarExpanded && s.toggleSidebar?.()))
  const location        = useLocation()

  // Close drawer on route change
  useEffect(() => {
    useAppStore.getState().closeSidebar?.()
  }, [location.pathname])

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden" style={{ background: '#0a0000' }}>

      {/* Drawer overlay */}
      {sidebarExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => useAppStore.getState().closeSidebar?.()}
        />
      )}

      {/* Sidebar drawer */}
      <Sidebar />

      {/* Main content — always full width */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* TopNav is hidden on the Intro (/) route — it has its own self-contained header */}
        {location.pathname !== '/' && <TopNav />}
        {location.pathname !== '/' && <BackendWarningBanner />}
        <main className="flex-1 overflow-auto scrollbar-none">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
