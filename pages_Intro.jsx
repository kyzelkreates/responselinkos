/**
 * ============================================================
 * ResponseLink OS™ — Premium Homepage / Investor Explainer
 * Run 11 — Full Investor/Funder Homepage
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™
 *
 * SAFE RULES APPLIED:
 * - Replaces Run 10 lightweight intro page only
 * - Does NOT touch dashboard, PWAs, SSOT, sync, or demo/live logic
 * - All CTAs route to existing working routes (unchanged)
 * - Safe beforeinstallprompt PWA logic preserved from Run 10
 * - iOS Add to Home Screen fallback preserved
 * - No backend secrets, no unsafe claims, advisory wording throughout
 * ============================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Persistent key — isolated from app state ─────────────────
const INSTALL_DISMISSED_KEY = 'responselink_intro_install_prompt_dismissed'

// ─── Self-contained SVG icon renderer ─────────────────────────
// Uses pre-defined path data — no dependency on Icon component or app shell
function Ico({ d, size = 20, color = 'currentColor', className = '', strokeWidth = 2 }) {
  const paths = Array.isArray(d) ? d : [d]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
      strokeLinejoin="round" className={className} aria-hidden="true">
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

// ─── Icon path library ────────────────────────────────────────
const I = {
  dashboard:   ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z','M9 22V12h6v10'],
  phone:       ['M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z','M12 18h.01'],
  heart:       ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'],
  users:       ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'],
  brain:       ['M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.84A2.5 2.5 0 0 1 9.5 2','M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.84A2.5 2.5 0 0 0 14.5 2'],
  shield:      ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  layers:      ['M12 2L2 7l10 5 10-5-10-5z','M2 17l10 5 10-5','M2 12l10 5 10-5'],
  zap:         ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  building:    ['M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18','M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2','M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2','M10 6h4','M10 10h4','M10 14h4','M10 18h4'],
  check:       ['M20 6L9 17l-5-5'],
  download:    ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4','M7 10l5 5 5-5','M12 15V3'],
  arrow:       ['M5 12h14','M12 5l7 7-7 7'],
  x:           ['M18 6L6 18','M6 6l12 12'],
  alert:       ['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z','M12 9v4','M12 17h.01'],
  settings:    ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z','M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'],
  database:    ['M12 2C6.48 2 2 4.02 2 6.5S6.48 11 12 11s10-2.02 10-4.5S17.52 2 12 2z','M2 6.5v5C2 13.98 6.48 16 12 16s10-2.02 10-4.5v-5','M2 11.5v5C2 18.98 6.48 21 12 21s10-2.02 10-4.5v-5'],
  code:        ['M16 18l6-6-6-6','M8 6l-6 6 6 6'],
  star:        ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  map:         ['M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z','M8 2v16','M16 6v16'],
  refresh:     ['M23 4v6h-6','M1 20v-6h6','M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15'],
  lock:        ['M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z','M7 11V7a5 5 0 0 1 10 0v4'],
  eye:         ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0'],
  git:         ['M18 3a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z','M6 21a3 3 0 0 0 3-3 3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3z','M9 18H7a2 2 0 0 1-2-2V5','M15 6h2a2 2 0 0 1 2 2v1'],
  award:       ['M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z','M8.21 13.89L7 23l5-3 5 3-1.21-9.12'],
  trending:    ['M23 6l-9.5 9.5-5-5L1 18','M17 6h6v6'],
}

// ─── Brand colours ────────────────────────────────────────────
const GOLD   = '#C9A84C'
const SILVER = '#B0BEC5'
const PURPLE = '#a78bfa'
const GREEN  = '#34d399'
const CYAN   = '#22d3ee'
const RED    = '#f87171'
const DIM    = '#1e1e2a'

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

// Section wrapper
function Section({ id, children, className = '' }) {
  return (
    <section id={id} className={`px-5 sm:px-8 max-w-6xl mx-auto ${className}`}>
      {children}
    </section>
  )
}

// Section heading
function SectionHead({ title, sub, accent = GOLD }) {
  return (
    <div className="text-center mb-12">
      <div className="inline-block h-0.5 w-12 rounded mb-4" style={{ background: accent }} />
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-3 leading-tight">{title}</h2>
      {sub && <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">{sub}</p>}
    </div>
  )
}

// Glass card
function Card({ children, accent, className = '', style = {} }) {
  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 ${className}`}
      style={{
        background:   'rgba(13,14,20,0.85)',
        backdropFilter: 'blur(12px)',
        borderColor:  accent ? accent + '33' : '#2a2a3a',
        boxShadow:    accent ? `0 0 30px ${accent}0a` : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// Icon badge
function IconBadge({ icon, color, size = 18 }) {
  return (
    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: color + '18', border: `1px solid ${color}33` }}>
      <Ico d={I[icon]} size={size} color={color} />
    </div>
  )
}

// ─── Nav bar ──────────────────────────────────────────────────
function TopBar({ onDashboard }) {
  return (
    <nav className="sticky top-0 z-40 w-full border-b flex items-center justify-between px-5 sm:px-8 py-3"
      style={{ background: 'rgba(8,8,12,0.92)', backdropFilter: 'blur(12px)', borderColor: '#1a1a2a' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: GOLD + '20', border: `1px solid ${GOLD}44` }}>
          <Ico d={I.shield} size={14} color={GOLD} />
        </div>
        <span className="text-sm font-bold text-white tracking-tight">ResponseLink OS™</span>
      </div>
      <div className="flex items-center gap-2">
        <a href="#demo"
          className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
          Demo
        </a>
        <a href="#architecture"
          className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
          Architecture
        </a>
        <button onClick={onDashboard}
          className="flex items-center gap-1.5 text-xs font-bold text-black rounded-lg px-3 py-1.5 transition-all hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-amber-300"
          style={{ background: `linear-gradient(135deg,${GOLD},#E5C97E)` }}>
          <Ico d={I.dashboard} size={13} color="#000" />
          Dashboard
        </button>
      </div>
    </nav>
  )
}

// ─── PWA Install Modal ────────────────────────────────────────
function InstallModal({ onInstall, onDismiss, onDashboard, available, isIOS, success }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="rl-install-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}>
      <div className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{ background: '#0d0d14', borderColor: GOLD + '44' }}>
        <button onClick={onDismiss} aria-label="Close"
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-amber-400">
          <Ico d={I.x} size={18} />
        </button>
        <div className="h-0.5 w-12 rounded mb-5" style={{ background: `linear-gradient(90deg,${GOLD},#E5C97E)` }} />
        <h2 id="rl-install-title" className="text-lg font-bold text-white mb-2">Install ResponseLink OS™</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-5">
          Install the app on this device for faster access, PWA-style use, and local-first demo access where supported.
        </p>
        {success ? (
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-5">
            <Ico d={I.check} size={15} color={GREEN} /> App installed successfully
          </div>
        ) : isIOS ? (
          <div className="rounded-xl p-4 mb-5 text-sm text-amber-300 border" style={{ background: '#1a1200', borderColor: GOLD + '44' }}>
            <p className="font-semibold mb-1">iPhone / iPad</p>
            <p>Open <strong>Safari</strong>, tap the <strong>Share menu</strong> (⎋), then choose <strong>Add to Home Screen</strong>.</p>
          </div>
        ) : !available ? (
          <div className="rounded-xl p-4 mb-5 text-sm text-slate-400 border" style={{ background: '#111', borderColor: '#333' }}>
            Install is not supported in this browser. Use your browser menu and choose <strong>Add to Home Screen</strong> or <strong>Install App</strong> if available.
          </div>
        ) : null}
        <div className="flex flex-col gap-3">
          {available && !success && (
            <button onClick={onInstall}
              className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all"
              style={{ background: `linear-gradient(135deg,${GOLD},#E5C97E)` }}>
              <Ico d={I.download} size={16} color="#000" /> Install App
            </button>
          )}
          <button onClick={onDashboard}
            className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-semibold text-white border border-slate-700 hover:border-amber-500/40 hover:bg-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400">
            <Ico d={I.dashboard} size={16} /> Open Dashboard
          </button>
          {!success && (
            <button onClick={onDismiss}
              className="text-xs text-slate-600 hover:text-slate-400 py-1 transition-colors focus:outline-none focus:underline">
              Not Now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function IntroPage() {
  const navigate = useNavigate()

  // PWA install state — safe, isolated
  const [deferredPrompt,   setDeferredPrompt]   = useState(null)
  const [installAvailable, setInstallAvailable] = useState(false)
  const [installSuccess,   setInstallSuccess]   = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [isIOS,            setIsIOS]            = useState(false)

  useEffect(() => {
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream)
    const onBefore = (e) => { e.preventDefault(); setDeferredPrompt(e); setInstallAvailable(true) }
    const onDone   = () => { setInstallSuccess(true); setDeferredPrompt(null); setInstallAvailable(false) }
    window.addEventListener('beforeinstallprompt', onBefore)
    window.addEventListener('appinstalled',         onDone)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore)
      window.removeEventListener('appinstalled',         onDone)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstallSuccess(true)
    setDeferredPrompt(null); setInstallAvailable(false)
  }, [deferredPrompt])

  const handleInstallDismiss  = () => { setShowInstallModal(false); try { localStorage.setItem(INSTALL_DISMISSED_KEY, '1') } catch {} }
  const handleInstallDashboard = () => { setShowInstallModal(false); navigate('/dashboard') }
  const onInstallClick         = () => { installAvailable ? handleInstall() : setShowInstallModal(true) }

  const goTo = (path) => navigate(path)

  // ── Scroll anchor helper ─────────────────────────────────
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <>
      {showInstallModal && (
        <InstallModal
          onInstall={handleInstall}
          onDismiss={handleInstallDismiss}
          onDashboard={handleInstallDashboard}
          available={installAvailable}
          isIOS={isIOS}
          success={installSuccess}
        />
      )}

      <div className="min-h-screen w-full overflow-x-hidden" style={{ background: '#08080c', fontFamily: "'Inter', sans-serif" }}>

        {/* Gradient sky */}
        <div className="fixed inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(167,139,250,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(201,168,76,0.05) 0%, transparent 50%)',
        }} />

        {/* Top accent bar */}
        <div className="w-full h-px" style={{ background: `linear-gradient(90deg,transparent,${PURPLE},${GOLD},${PURPLE},transparent)` }} />

        {/* Nav */}
        <TopBar onDashboard={() => goTo('/dashboard')} />

        {/* ════════════════════════════════════════════════
            SECTION 1 — HERO
        ════════════════════════════════════════════════ */}
        <section id="hero" className="relative px-5 sm:px-8 pt-20 pb-20 sm:pt-28 sm:pb-28 max-w-6xl mx-auto text-center">

          {/* Brand pill */}
          <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold mb-8"
            style={{ borderColor: GOLD + '55', background: 'rgba(201,168,76,0.06)', color: GOLD }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
            Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-5 leading-none"
            style={{ background: `linear-gradient(135deg,${GOLD} 0%,#E5C97E 45%,${SILVER} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            ResponseLink OS™
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl lg:text-2xl text-slate-300 font-medium mb-5 leading-snug">
            AI-Assisted Community Welfare &amp; Mobile Response Platform
          </p>

          {/* Hero body */}
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed mb-4">
            ResponseLink OS™ helps community organisations coordinate welfare visits, outreach tasks, responder check-ins, service user check-ins, incident reports, escalation workflows, and evidence capture through a command dashboard, responder PWA, and service user PWA.
          </p>
          <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed mb-12">
            Built from a reusable modular 4P3X architecture, it demonstrates how one controlled software base can be refactored into sector-specific products using structured prompting, single-source-of-truth thinking, demo/live mode separation, PWA-first design, AI oversight, and backend-ready planning.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 mb-10">
            <button onClick={() => goTo('/dashboard')}
              className="flex items-center gap-2 rounded-xl py-3.5 px-7 text-sm font-bold text-black shadow-lg transition-all hover:scale-[1.02] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-amber-300 w-full sm:w-auto"
              style={{ background: `linear-gradient(135deg,${GOLD},#E5C97E)` }}>
              <Ico d={I.dashboard} size={16} color="#000" /> Open Command Dashboard
            </button>
            <button onClick={() => goTo('/responder-app')}
              className="flex items-center gap-2 rounded-xl py-3.5 px-7 text-sm font-semibold transition-all hover:bg-violet-500/10 focus:outline-none focus:ring-2 focus:ring-violet-400 w-full sm:w-auto"
              style={{ color: PURPLE, border: `1px solid ${PURPLE}44` }}>
              <Ico d={I.phone} size={16} color={PURPLE} /> Open Responder PWA
            </button>
            <button onClick={() => goTo('/service-user-pwa')}
              className="flex items-center gap-2 rounded-xl py-3.5 px-7 text-sm font-semibold transition-all hover:bg-green-500/10 focus:outline-none focus:ring-2 focus:ring-green-400 w-full sm:w-auto"
              style={{ color: GREEN, border: `1px solid ${GREEN}44` }}>
              <Ico d={I.heart} size={16} color={GREEN} /> Open Service User PWA
            </button>
            <button onClick={() => scrollTo('demo')}
              className="flex items-center gap-2 rounded-xl py-3.5 px-7 text-sm font-semibold text-slate-400 border border-slate-800 hover:border-slate-600 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-slate-500 w-full sm:w-auto">
              <Ico d={I.eye} size={16} /> View Demo Section
            </button>
          </div>

          {/* Advisory wording */}
          <p className="text-xs text-slate-700 max-w-xl mx-auto">
            ResponseLink OS™ is advisory software. It does not replace emergency services, safeguarding professionals, clinical judgement, or legal duties.{' '}
            <strong className="text-slate-600">If someone is in immediate danger, contact emergency services.</strong>
          </p>
        </section>

        {/* Divider */}
        <div className="w-full h-px max-w-6xl mx-auto" style={{ background: `linear-gradient(90deg,transparent,#1e1e2a,transparent)` }} />

        {/* ════════════════════════════════════════════════
            SECTION 2 — WHAT IT DOES
        ════════════════════════════════════════════════ */}
        <Section id="what-it-does" className="py-20">
          <SectionHead
            title="What It Does"
            sub="A coordination layer for teams that look after people in the community — giving supervisors visibility and field teams a structured workflow."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon:'dashboard', color:GOLD,   title:'Mission Coordination',     desc:'Create and assign welfare visits, outreach tasks, and check-in missions. Track status from assigned through to completed.' },
              { icon:'eye',       color:CYAN,   title:'Real-time Visibility',     desc:'Supervisors can see active missions, responder positions, service user signals, and risk flags — all from one command screen.' },
              { icon:'phone',     color:PURPLE, title:'Responder Workflows',      desc:'Field responders update mission status, submit welfare checklists, log incidents, add notes, and confirm outcomes from a mobile-first PWA.' },
              { icon:'heart',     color:GREEN,  title:'Service User Check-ins',   desc:'Service users send wellbeing updates, help signals, visit confirmations, and support need changes directly to the dashboard.' },
              { icon:'shield',    color:GOLD,   title:'Incident & Risk Handling', desc:'Responders and supervisors log incidents, raise risk flags, and route cases to supervisor review. All advisory — human judgement remains in control.' },
              { icon:'database',  color:CYAN,   title:'Evidence & Reporting',     desc:'Welfare checklists, incident records, escalation logs, and audit trails build a structured evidence layer to support organisational accountability.' },
            ].map(f => (
              <Card key={f.title} accent={f.color}>
                <IconBadge icon={f.icon} color={f.color} />
                <h3 className="text-sm font-bold text-white mt-4 mb-2">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border p-5 sm:p-6" style={{ background: 'rgba(201,168,76,0.04)', borderColor: GOLD + '22' }}>
            <p className="text-sm text-slate-400 leading-relaxed text-center max-w-3xl mx-auto">
              The platform helps teams see <strong className="text-white">what is happening</strong>, who needs attention, what tasks are active, what information is missing, and which issues may need human review. It does not guarantee safety, diagnose, or make legal decisions.
            </p>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════
            SECTION 3 — WHO IT SERVES
        ════════════════════════════════════════════════ */}
        <Section id="who" className="py-20">
          <SectionHead title="Who It Serves" sub="Built for organisations that coordinate welfare, outreach, and community support operations." />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              ['building','Charities'],
              ['building','Councils'],
              ['map','Housing Associations'],
              ['users','Community Welfare Teams'],
              ['heart','Outreach Organisations'],
              ['users','Volunteer Response Groups'],
              ['phone','Mobile Care Teams'],
              ['star','Public-Benefit Pilots'],
              ['trending','Social Impact Organisations'],
              ['award','Funded Community Safety Projects'],
            ].map(([icon, label]) => (
              <div key={label} className="flex flex-col items-center gap-2.5 rounded-2xl border px-3 py-4 text-center"
                style={{ background: 'rgba(13,14,20,0.7)', borderColor: '#1e1e2a' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: GOLD + '15', border: `1px solid ${GOLD}30` }}>
                  <Ico d={I[icon]} size={15} color={GOLD} />
                </div>
                <span className="text-xs text-slate-300 font-medium leading-snug">{label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ════════════════════════════════════════════════
            SECTION 4 — WHY IT IS NEEDED
        ════════════════════════════════════════════════ */}
        <Section id="why" className="py-20">
          <SectionHead title="Why It Is Needed" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card accent={RED} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: RED + '18', border: `1px solid ${RED}33` }}>
                  <Ico d={I.alert} size={17} color={RED} />
                </div>
                <h3 className="text-base font-bold text-white">The Problem</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Many welfare and outreach operations rely on fragmented communication — paper notes, disconnected spreadsheets, phone calls, and delayed updates. This can make it harder to see missed check-ins, overdue visits, repeated concerns, incomplete records, responder safety issues, and service user help signals.
              </p>
              <ul className="space-y-2">
                {['Missed check-ins go unnoticed','Responder safety is hard to monitor','Incomplete records create accountability gaps','Help signals get lost in manual processes'].map(p => (
                  <li key={p} className="flex items-start gap-2.5 text-xs text-slate-500">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0" style={{ background: RED + '18', border: `1px solid ${RED}33` }}>
                      <Ico d={I.x} size={8} color={RED} />
                    </div>
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
            <Card accent={GREEN} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GREEN + '18', border: `1px solid ${GREEN}33` }}>
                  <Ico d={I.check} size={17} color={GREEN} />
                </div>
                <h3 className="text-base font-bold text-white">The Coordination Layer</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                ResponseLink OS™ gives organisations a clearer coordination layer: a command dashboard for supervisors, a responder PWA for field teams, and a service user PWA for check-ins and help requests.
              </p>
              <ul className="space-y-2">
                {['Supervisors see active missions and alerts','Responders have a structured field workflow','Service users can send help signals directly','Evidence and records build audit accountability'].map(p => (
                  <li key={p} className="flex items-start gap-2.5 text-xs text-slate-500">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0" style={{ background: GREEN + '18', border: `1px solid ${GREEN}33` }}>
                      <Ico d={I.check} size={8} color={GREEN} />
                    </div>
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════
            SECTION 5 — ARCHITECTURE
        ════════════════════════════════════════════════ */}
        <Section id="architecture" className="py-20">
          <SectionHead title="Architecture" sub="Three interconnected interfaces built on a single local-first state layer with a backend-ready design." />

          {/* Three pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon:'dashboard', color:GOLD,   num:'01', title:'Command Dashboard',    role:'Supervisors & Coordinators',
                points:['Monitor missions, responders, and service user signals','Risk flags, incidents, escalation review','Demo/live mode, backend config, sync status','AI-assisted advisory oversight panel','Evidence, reports, and audit trail'] },
              { icon:'phone',     color:PURPLE, num:'02', title:'Responder PWA',         role:'Field Responders',
                points:['View assigned missions on mobile','Update travel → arrived → in-progress → completed','Submit welfare checklists and notes','Log incidents, safety concerns, offline submissions','Mission completion and outcome capture'] },
              { icon:'heart',     color:GREEN,  num:'03', title:'Service User PWA',      role:'Service Users',
                points:['Submit wellbeing check-ins','Send "I need help" signals to dashboard','Confirm or decline visits','Update support needs and raise concerns','Dashboard-visible alerts and messages'] },
            ].map(p => (
              <Card key={p.title} accent={p.color} className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <IconBadge icon={p.icon} color={p.color} />
                  <span className="text-3xl font-black" style={{ color: p.color + '30' }}>{p.num}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: p.color }}>{p.role}</p>
                  <h3 className="text-base font-bold text-white mb-3">{p.title}</h3>
                  <ul className="space-y-1.5">
                    {p.points.map(pt => (
                      <li key={pt} className="flex items-start gap-2 text-xs text-slate-500">
                        <Ico d={I.check} size={10} color={p.color} className="mt-0.5 flex-shrink-0" /> {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>

          {/* Technical layer pills */}
          <div className="rounded-2xl border p-5 sm:p-6" style={{ background: 'rgba(13,14,20,0.7)', borderColor: '#1e1e2a' }}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Technical Foundation</p>
            <div className="flex flex-wrap gap-2">
              {['Local-first demo structure','Demo / live mode separation','Backend-ready design','PWA installability','Role-based interfaces','Dashboard ↔ PWA sync pattern','Evidence & reporting layer','Advisory AI oversight','Human review boundaries','Safe API configuration layer'].map(t => (
                <span key={t} className="text-xs px-3 py-1.5 rounded-full border font-medium"
                  style={{ color: SILVER, borderColor: '#2a2a3a', background: 'rgba(255,255,255,0.03)' }}>{t}</span>
              ))}
            </div>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════
            SECTION 6 — MODULAR 4P3X BASE
        ════════════════════════════════════════════════ */}
        <Section id="modular" className="py-20">
          <SectionHead title="The 4P3X Modular Architecture" sub="ResponseLink OS™ is not a one-off demo. It is a working example of a reusable product base." accent={PURPLE} />
          <Card accent={PURPLE} className="mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: PURPLE + '18', border: `1px solid ${PURPLE}33` }}>
                <Ico d={I.layers} size={20} color={PURPLE} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-3">4P3X Verse™ — Reusable Product Architecture</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  ResponseLink OS™ is part of the wider <strong className="text-white">4P3X Verse™</strong> product architecture: a reusable modular software base that can be refactored into different industry-specific platforms through controlled prompt runs, preserved state logic, reusable dashboard structures, PWA workflows, demo/live mode switching, AI guidance layers, reporting modules, and backend-ready configuration.
                </p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  The value is not only in one application. The value is in the <strong className="text-slate-300">repeatable architecture behind it</strong> — the patterns, the discipline, and the structured approach to building production-ready software concepts.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {['Welfare & outreach','Fleet & routing','Training & onboarding','Wellbeing support','Crisis communication','Compliance reporting','Community operations','Education platforms','Field workforce coordination','Client / service-user support'].map(s => (
              <div key={s} className="rounded-xl border px-3 py-3 text-center"
                style={{ background: 'rgba(167,139,250,0.04)', borderColor: PURPLE + '22' }}>
                <span className="text-xs text-slate-400 leading-snug">{s}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ════════════════════════════════════════════════
            SECTION 7 — CONTROLLED REFACTOR POSITIONING
        ════════════════════════════════════════════════ */}
        <Section id="refactor" className="py-20">
          <SectionHead title="One Modular Base. Many Product Directions." sub="Structured product transformation — not random rebuilding." accent={CYAN} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card accent={CYAN}>
              <IconBadge icon="git" color={CYAN} />
              <h3 className="text-base font-bold text-white mt-4 mb-3">Controlled Product Transformation</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Because ResponseLink OS™ is built from a modular 4P3X base, it can itself become the foundation for other controlled product directions. With a structured 15–20 prompt refactor process, the same architecture can be safely adapted into a new sector-specific dashboard + PWA product while preserving the core ideas of role-based access, demo/live mode, sync workflows, reporting, AI oversight, and backend-readiness.
              </p>
              <p className="text-sm text-slate-500 leading-relaxed">
                This is not uncontrolled copying or random rebuilding. It is <strong className="text-slate-300">controlled product transformation</strong>: preserve the working system, change the domain model, update the user roles, reframe the workflows, validate the data layer, then polish the experience.
              </p>
            </Card>
            <div className="flex flex-col gap-4">
              {[
                { step:'01', title:'Preserve',    desc:'Keep working state logic, SSOT patterns, PWA structure, and routing intact',           color:GOLD   },
                { step:'02', title:'Reframe',     desc:'Change the domain model, update entity schemas, redefine user roles and workflows',    color:PURPLE },
                { step:'03', title:'Adapt',       desc:'Update dashboard panels, field PWA flows, and demo data to the new sector context',    color:CYAN   },
                { step:'04', title:'Validate',    desc:'Test each layer, check demo/live separation, confirm advisory wording and boundaries', color:GREEN  },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-4 rounded-xl border p-4" style={{ background: 'rgba(13,14,20,0.7)', borderColor: '#1e1e2a' }}>
                  <span className="text-xl font-black flex-shrink-0" style={{ color: s.color + '60' }}>{s.step}</span>
                  <div>
                    <p className="text-sm font-bold text-white mb-1" style={{ color: s.color }}>{s.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════
            SECTION 8 — ABOUT CIARAN / KYZEL KREATES™
        ════════════════════════════════════════════════ */}
        <Section id="creator" className="py-20">
          <SectionHead title="Built by Ciaran — Kyzel Kreates™" sub="Systems thinking, AI-assisted development, and modular product engineering." accent={GOLD} />
          <Card accent={GOLD} className="mb-6">
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              ResponseLink OS™ was created by <strong className="text-white">Ciaran</strong> through <strong className="text-white">Kyzel Kreates™</strong> as part of the 4P3X Verse™ ecosystem. The work demonstrates rapid self-directed learning, AI-assisted development, systems thinking, modular product design, prompt-controlled refactoring, and the ability to turn complex service workflows into understandable software structures.
            </p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Rather than building disconnected demos, the focus has been on creating reusable foundations: dashboard systems, PWA flows, demo/live toggles, reporting structures, AI guidance layers, and backend-ready patterns that can be adapted across sectors.
            </p>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon:'code',     color:GOLD,   title:'Systems Thinking',          desc:'Breaking complex operational problems into reusable software patterns that hold across sector changes.' },
              { icon:'layers',   color:PURPLE, title:'Modular Architecture',       desc:'Designing frameworks where the core logic persists while the domain, roles, and workflows adapt to new contexts.' },
              { icon:'zap',      color:CYAN,   title:'AI-Assisted Build Workflow', desc:'Using AI tools effectively — not to shortcut thinking, but to extend reach and build more structured products faster.' },
              { icon:'refresh',  color:GREEN,  title:'Controlled Refactoring',     desc:'Preserving working systems through disciplined prompt runs rather than risky full rebuilds.' },
              { icon:'trending', color:GOLD,   title:'Investor-Ready Thinking',    desc:'Creating product concepts that are explainable to funders, scalable in architecture, and demonstrable in demo mode.' },
              { icon:'lock',     color:PURPLE, title:'Safety Consciousness',       desc:'Building advisory wording, human review boundaries, demo/live separation, and evidence structures into the product from the start.' },
            ].map(c => (
              <Card key={c.title} accent={c.color}>
                <IconBadge icon={c.icon} color={c.color} />
                <h3 className="text-sm font-bold text-white mt-4 mb-2">{c.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{c.desc}</p>
              </Card>
            ))}
          </div>
        </Section>

        {/* ════════════════════════════════════════════════
            SECTION 9 — AI AGENTS
        ════════════════════════════════════════════════ */}
        <Section id="ai" className="py-20">
          <SectionHead title="4P3X Intelligent AI™ Oversight Agents" sub="Advisory AI — supporting human supervisors, not replacing them." accent={PURPLE} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            {[
              { title:'Welfare Risk AI',
                purpose:'Advisory monitoring of mission risk, responder status, service user signals, overdue check-ins, repeated concerns, missing welfare data, and escalation triggers.',
                points:['Mission risk classification','Overdue responder check-in detection','Missed service user check-in alerts','Evidence gap identification','Escalation trigger prompts'] },
              { title:'Safeguarding & Evidence AI',
                purpose:'Advisory review of notes, checklists, evidence completeness, incident reports, escalation records, and supervisor-ready reporting support.',
                points:['Welfare checklist completeness review','Incident evidence quality prompts','Supervisor review queue support','Escalation record advisory review','Audit trail quality indicators'] },
            ].map(a => (
              <Card key={a.title} accent={PURPLE} className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: PURPLE + '18', border: `1px solid ${PURPLE}33` }}>
                    <Ico d={I.brain} size={17} color={PURPLE} />
                  </div>
                  <div>
                    <p className="text-2xs font-semibold uppercase tracking-widest mb-1" style={{ color: PURPLE, fontSize: 10 }}>4P3X Intelligent AI™</p>
                    <h3 className="text-sm font-bold text-white">{a.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{a.purpose}</p>
                <ul className="space-y-1.5">
                  {a.points.map(p => (
                    <li key={p} className="flex items-start gap-2 text-xs text-slate-600">
                      <Ico d={I.check} size={10} color={PURPLE} className="mt-0.5 flex-shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <div className="rounded-xl border p-4 flex items-start gap-3" style={{ background: 'rgba(167,139,250,0.04)', borderColor: PURPLE + '33' }}>
            <Ico d={I.alert} size={16} color={PURPLE} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-300">Advisory only.</strong> These AI agents do not make final safeguarding, legal, emergency, or clinical decisions. Human supervisors remain responsible for judgement, escalation, and action at all times.
            </p>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════
            SECTION 10 — DEMO / LIVE MODE
        ════════════════════════════════════════════════ */}
        <Section id="demo-live" className="py-20">
          <SectionHead title="Demo Mode shows the product. Live Mode runs the product." accent={CYAN} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            <Card accent={CYAN}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: CYAN + '18', border: `1px solid ${CYAN}33` }}>
                  <Ico d={I.eye} size={17} color={CYAN} />
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: CYAN }}>DEMO MODE</div>
                  <h3 className="text-sm font-bold text-white">See the Product</h3>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                In Demo Mode, ResponseLink OS™ uses clearly labelled demo data so investors, funders, partners, and stakeholders can understand the workflow without needing real service users or real operational records.
              </p>
            </Card>
            <Card accent={GREEN}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GREEN + '18', border: `1px solid ${GREEN}33` }}>
                  <Ico d={I.zap} size={17} color={GREEN} />
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: GREEN }}>LIVE MODE</div>
                  <h3 className="text-sm font-bold text-white">Run the Product</h3>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                In Live Mode, demo data can be switched off and the platform can be connected to a suitable backend such as Supabase, Firebase, or another approved provider. This enables real users, authentication, persistent records, dashboards, sync, reporting, and operational data flows.
              </p>
            </Card>
          </div>
          <div className="rounded-xl border p-4 flex items-start gap-3" style={{ background: 'rgba(248,113,113,0.04)', borderColor: RED + '33' }}>
            <Ico d={I.lock} size={16} color={RED} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Live Mode must not mix demo data with real data. Backend-only secrets must never be exposed in frontend or public code. Connection settings must use the existing safe API configuration patterns.
            </p>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════
            SECTION 11 — INVESTOR / FUNDER VALUE
        ════════════════════════════════════════════════ */}
        <Section id="investor" className="py-20">
          <SectionHead title="Why This Matters to Investors &amp; Funders" accent={GOLD} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            <Card accent={GOLD}>
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Ico d={I.heart} size={16} color={GOLD} /> For Funders
              </h3>
              <ul className="space-y-2.5">
                {['Public-benefit technology with real welfare coordination use','Safer workflows for mobile responders and field teams','Better visibility of missed check-ins and incomplete information','Strong evidence and accountability structures','Safer advisory AI that keeps humans in control'].map(v => (
                  <li key={v} className="flex items-start gap-2.5 text-xs text-slate-400">
                    <Ico d={I.check} size={10} color={GOLD} className="mt-0.5 flex-shrink-0" /> {v}
                  </li>
                ))}
              </ul>
            </Card>
            <Card accent={PURPLE}>
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Ico d={I.trending} size={16} color={PURPLE} /> For Investors
              </h3>
              <ul className="space-y-2.5">
                {['Reusable modular architecture adaptable across sectors','Multi-sector product transformation potential','PWA-first deployment with low infrastructure overhead','Backend-ready design for SaaS-style productisation','Creator capability: fast learning, structured thinking, AI-assisted build velocity'].map(v => (
                  <li key={v} className="flex items-start gap-2.5 text-xs text-slate-400">
                    <Ico d={I.check} size={10} color={PURPLE} className="mt-0.5 flex-shrink-0" /> {v}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════
            SECTION 12 — DEMO SHORTCUTS
        ════════════════════════════════════════════════ */}
        <section id="demo" className="px-5 sm:px-8 py-20 max-w-6xl mx-auto">
          <SectionHead title="Open the Demo" sub="Three interconnected interfaces — open any one to explore ResponseLink OS™ in Demo Mode." />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon:'dashboard', color:GOLD,   route:'/dashboard',       title:'Command Dashboard',
                desc:'Mission control, responder oversight, service user signals, incident reports, AI advisory flags, demo/live settings, sync visibility, and reports.',
                btn:'Open Command Dashboard' },
              { icon:'phone',     color:PURPLE, route:'/responder-app',   title:'Responder PWA',
                desc:'Field responder workflow for assigned missions, status updates, welfare checklists, incident notes, safety check-ins, and offline-safe submissions.',
                btn:'Open Responder PWA' },
              { icon:'heart',     color:GREEN,  route:'/service-user-pwa',title:'Service User PWA',
                desc:'Service user check-ins, help signals, visit confirmations, support updates, wellbeing status, and dashboard-visible alerts.',
                btn:'Open Service User PWA' },
            ].map(d => (
              <Card key={d.title} accent={d.color} className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <IconBadge icon={d.icon} color={d.color} size={20} />
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: d.color + '15', color: d.color, border: `1px solid ${d.color}33`, fontSize: 10 }}>DEMO READY</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white mb-2">{d.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{d.desc}</p>
                </div>
                <button
                  onClick={() => goTo(d.route)}
                  className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.99] focus:outline-none focus:ring-2"
                  style={{
                    background: `linear-gradient(135deg, ${d.color}22, ${d.color}11)`,
                    border: `1px solid ${d.color}44`,
                    color: d.color,
                    ['--tw-ring-color']: d.color,
                  }}>
                  <Ico d={I.arrow} size={15} color={d.color} /> {d.btn}
                </button>
              </Card>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            SECTION 13 — INSTALL PWA
        ════════════════════════════════════════════════ */}
        <Section id="install" className="py-16">
          <div className="rounded-2xl border p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6"
            style={{ background: 'rgba(201,168,76,0.04)', borderColor: GOLD + '33' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: GOLD + '18', border: `1px solid ${GOLD}44` }}>
              <Ico d={I.download} size={22} color={GOLD} />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-base font-bold text-white mb-1">Install ResponseLink OS™ Locally</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {installAvailable
                  ? 'Your browser supports PWA installation. Install for faster access, offline-capable demo use, and Add to Home Screen support.'
                  : isIOS
                    ? 'On iPhone or iPad: open in Safari, tap the Share menu (⎋), and choose Add to Home Screen.'
                    : 'To install: use your browser menu and choose Add to Home Screen or Install App where supported.'
                }
              </p>
            </div>
            <button
              onClick={onInstallClick}
              className="flex items-center gap-2 rounded-xl py-3 px-6 text-sm font-bold text-black flex-shrink-0 transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-300"
              style={{ background: installSuccess ? '#34d399' : `linear-gradient(135deg,${GOLD},#E5C97E)`, color: installSuccess ? '#fff' : '#000', minWidth: 160 }}>
              <Ico d={installSuccess ? I.check : I.download} size={16} color={installSuccess ? '#fff' : '#000'} />
              {installSuccess ? 'Installed ✓' : 'Install App'}
            </button>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════
            SECTION 14 — SAFETY DISCLAIMER
        ════════════════════════════════════════════════ */}
        <Section id="safety" className="pb-20">
          <div className="rounded-2xl border p-6 sm:p-8" style={{ background: 'rgba(248,113,113,0.04)', borderColor: RED + '33' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: RED + '18', border: `1px solid ${RED}33` }}>
                <Ico d={I.alert} size={18} color={RED} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-3">Safety &amp; Professional Boundaries</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  ResponseLink OS™ is advisory and coordination-support software. It does not replace emergency services, safeguarding professionals, clinical judgement, legal duties, or human supervision. If someone is in immediate danger, users must contact the appropriate emergency services or responsible professional channels.
                </p>
                <ul className="space-y-2">
                  {[
                    'Human review is always required before any safeguarding, legal, clinical, or emergency decision.',
                    'AI does not make final safeguarding, legal, clinical, or emergency decisions.',
                    'The platform cannot guarantee safety or the accuracy of offline or delayed records.',
                    'Users must follow their organisation\'s policies, professional duties, and procedures.',
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-500">
                      <Ico d={I.check} size={10} color={RED} className="mt-0.5 flex-shrink-0" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Section>

        {/* ── FINAL CTA STRIP ──────────────────────────── */}
        <section className="px-5 sm:px-8 py-16 max-w-6xl mx-auto text-center border-t" style={{ borderColor: '#1a1a2a' }}>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Ready to explore ResponseLink OS™?</h2>
          <p className="text-sm text-slate-500 mb-8 max-w-xl mx-auto">Open the Command Dashboard to see the full command interface, or explore the field and service user PWAs.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => goTo('/dashboard')}
              className="flex items-center gap-2 rounded-xl py-3.5 px-8 text-sm font-bold text-black shadow-lg transition-all hover:scale-[1.02] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-amber-300 w-full sm:w-auto"
              style={{ background: `linear-gradient(135deg,${GOLD},#E5C97E)` }}>
              <Ico d={I.dashboard} size={16} color="#000" /> Open Command Dashboard
              <Ico d={I.arrow} size={14} color="#000" />
            </button>
            <button onClick={onInstallClick}
              className="flex items-center gap-2 rounded-xl py-3.5 px-8 text-sm font-semibold text-white border border-slate-700 hover:border-amber-500/40 hover:bg-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-auto">
              <Ico d={I.download} size={16} /> {installSuccess ? 'Installed ✓' : 'Install App'}
            </button>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────── */}
        <footer className="border-t px-5 py-8 text-center" style={{ borderColor: '#111116' }}>
          <p className="text-xs text-slate-700 mb-1">ResponseLink OS™ — AI-Assisted Community Welfare &amp; Mobile Response Platform</p>
          <p className="text-xs text-slate-800">Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™</p>
        </footer>

        {/* App installed toast */}
        {installSuccess && !showInstallModal && (
          <div role="status" aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold text-green-300 shadow-xl whitespace-nowrap"
            style={{ background: '#001a00', borderColor: GREEN + '55' }}>
            <Ico d={I.check} size={15} color={GREEN} /> App installed successfully
          </div>
        )}

      </div>
    </>
  )
}
