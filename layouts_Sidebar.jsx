/**
 * ============================================================
 * ResponseLink OS™ — Sidebar (Burger Drawer)
 * Run 1 — Identity, Shell, Navigation, Safe Refactor Foundation
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Slides in from the left as a fixed overlay drawer.
 * Closes on nav, on overlay click, or on X button.
 * Visual identity: black, metallic gold, metallic silver, green, purple.
 * ============================================================
 */

import { useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import Icon from './components_ui_Icon'
import StatusDot from './components_ui_StatusDot'
import { useAppStore } from './core_storage'
import { NAV_ITEMS, NAV_GROUPS } from './config_routes'

// ─── ResponseLink Logo ─────────────────────────────────────────
function ResponseLinkLogo({ onClose }) {
  return (
    <div className="flex items-center justify-between px-4 py-4 border-b border-[#C9A84C]/20"
         style={{ background: 'linear-gradient(135deg, #0f0505 0%, #1a0a00 100%)' }}>
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          {/* Gold accent badge */}
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #C9A84C22 0%, #C9A84C44 100%)', border: '1px solid #C9A84C55' }}>
            <span className="font-display font-bold text-xs tracking-wider"
                  style={{ color: '#C9A84C' }}>RL</span>
          </div>
          {/* Green status dot */}
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold text-sm leading-tight"
               style={{ color: '#C9A84C' }}>ResponseLink OS™</div>
          <div className="text-2xs tracking-widest uppercase"
               style={{ color: '#A8A9AD' }}>Command Dashboard</div>
        </div>
      </div>
      {/* Close X */}
      <button
        onClick={onClose}
        className="p-1.5 rounded-md transition-colors hover:bg-white/5"
        style={{ color: '#A8A9AD' }}
        aria-label="Close menu"
      >
        <Icon name="X" size={16} />
      </button>
    </div>
  )
}

// ─── Nav Group Label ──────────────────────────────────────────
function NavGroupLabel({ label }) {
  if (!label) return null
  return (
    <div className="px-3 pt-4 pb-1">
      <span className="text-2xs font-semibold tracking-widest uppercase"
            style={{ color: '#A8A9AD', opacity: 0.6 }}>
        {label}
      </span>
    </div>
  )
}

// ─── Nav Item ─────────────────────────────────────────────────
function NavItem({ item, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer group relative',
        active
          ? 'bg-[#C9A84C]/10 text-white'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
      )}
    >
      {/* Active indicator — gold bar */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
              style={{ background: '#C9A84C', boxShadow: '0 0 8px #C9A84C99' }} />
      )}
      <Icon
        name={item.icon}
        size={16}
        className={clsx(
          'flex-shrink-0 transition-colors',
          active ? '' : 'text-slate-500 group-hover:text-slate-300'
        )}
        style={active ? { color: '#C9A84C' } : {}}
      />
      <span className="truncate">{item.label}</span>
      {/* Gold highlight pulse */}
      {item.highlight && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: '#C9A84C', boxShadow: '0 0 6px #C9A84C99' }} />
      )}
      {/* Run badge for future items */}
      {item.badge && (
        <span className="ml-auto text-2xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: '#a855f720', color: '#a855f7', border: '1px solid #a855f740' }}>
          {item.badge}
        </span>
      )}
    </button>
  )
}

// ─── Footer ───────────────────────────────────────────────────
function SidebarFooter() {
  return (
    <div className="px-3 py-3 border-t border-[#C9A84C]/15">
      <div className="flex items-center gap-2 mb-1.5">
        <StatusDot status="online" />
        <span className="text-xs text-slate-500">Systems Nominal</span>
        <span className="ml-auto text-2xs font-mono text-slate-700">v1.0.0-R1</span>
      </div>
      <div className="text-2xs text-center leading-relaxed" style={{ color: '#A8A9AD', opacity: 0.4 }}>
        Powered by 4P3X Intelligent AI™
      </div>
    </div>
  )
}

// ─── Sidebar Root ─────────────────────────────────────────────
export default function Sidebar() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const isOpen    = useAppStore(s => s.sidebarExpanded)
  const close     = useAppStore(s => s.closeSidebar)

  const groupOrder = Object.entries(NAV_GROUPS)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key]) => key)

  const grouped = groupOrder.reduce((acc, group) => {
    const items = NAV_ITEMS.filter(i => i.group === group)
    if (items.length) acc[group] = items
    return acc
  }, {})

  const handleNav = (route) => {
    navigate(route)
    close()
  }

  return (
    <aside
      className={clsx(
        'fixed top-0 left-0 h-full z-50',
        'flex flex-col border-r',
        'w-72 transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
      style={{
        background: '#0a0000',
        borderColor: '#C9A84C22'
      }}
    >
      <ResponseLinkLogo onClose={close} />

      <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none px-2 py-2">
        {groupOrder.map(group => {
          const items = grouped[group]
          if (!items) return null
          return (
            <div key={group}>
              <NavGroupLabel label={NAV_GROUPS[group].label} />
              <div className="space-y-0.5">
                {items.map(item => (
                  <NavItem
                    key={item.id}
                    item={item}
                    active={
                      location.pathname === item.route ||
                      location.pathname.startsWith(item.route + '/')
                    }
                    onClick={() => handleNav(item.route)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Responder setup shortcut */}
      <div className="px-3 pb-2">
        <a href="#/driver-setup"
           className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors group"
           style={{ border: '1px solid #a855f730', background: '#a855f708' }}
           onMouseEnter={e => e.currentTarget.style.background = '#a855f715'}
           onMouseLeave={e => e.currentTarget.style.background = '#a855f708'}>
          <Icon name="Smartphone" size={14} style={{ color: '#a855f7' }} className="flex-shrink-0" />
          <span className="text-xs font-semibold flex-1" style={{ color: '#c084fc' }}>Set Responder Up With App</span>
          <Icon name="ChevronRight" size={11} style={{ color: '#a855f7' }} />
        </a>
      </div>

      <SidebarFooter />
    </aside>
  )
}
