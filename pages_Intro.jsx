/**
 * ============================================================
 * ResponseLink OS™ — Intro / Landing Page
 * Run 10 — Non-Breaking Intro Page Addition
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™
 *
 * RULES:
 * - Does NOT rebuild the dashboard.
 * - Does NOT duplicate any existing route.
 * - Does NOT alter any existing business logic.
 * - Uses safe beforeinstallprompt PWA install logic.
 * - iOS users receive Add to Home Screen guidance.
 * - All CTAs route to existing working routes.
 * ============================================================
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate }                       from 'react-router-dom'

// ─── Storage key for dismissal ─────────────────────────────────
const DISMISSED_KEY = 'responselink_intro_install_prompt_dismissed'

// ─── Inline SVG icon (no external icon dep needed here) ───────
function Ico({ d, size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {Array.isArray(d)
        ? d.map((p, i) => <path key={i} d={p} />)
        : <path d={d} />
      }
    </svg>
  )
}

const IC = {
  dashboard: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z','M9 22V12h6v10'],
  phone:     ['M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z','M12 18h.01'],
  users:     ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'],
  brain:     ['M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.84A2.5 2.5 0 0 1 9.5 2','M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.84A2.5 2.5 0 0 0 14.5 2'],
  toggle:    ['M16 3H8a5 5 0 0 0 0 10h8a5 5 0 0 0 0-10z'],
  shield:    ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  alert:     ['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z','M12 9v4','M12 17h.01'],
  check:     ['M20 6L9 17l-5-5'],
  download:  ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4','M7 10l5 5 5-5','M12 15V3'],
  arrow:     ['M5 12h14','M12 5l7 7-7 7'],
  heart:     ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'],
  building:  ['M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18','M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2','M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2','M10 6h4','M10 10h4','M10 14h4','M10 18h4'],
  x:         ['M18 6L6 18','M6 6l12 12'],
  map:       ['M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z','M8 2v16','M16 6v16'],
}

// ─── Feature cards ─────────────────────────────────────────────
const FEATURES = [
  {
    icon: 'dashboard', color: '#C9A84C',
    title: 'Command Dashboard',
    desc:  'Monitor missions, responders, service user check-ins, alerts, incidents, evidence, reports, demo/live mode, and sync status — all in one place.',
    badge: null,
  },
  {
    icon: 'phone', color: '#7C3AED',
    title: 'Responder PWA',
    desc:  'Supports assigned visits, status updates, welfare checklists, safety check-ins, incident reports, offline-safe submissions, and mission completion.',
    badge: 'Mobile-first',
  },
  {
    icon: 'heart', color: '#22C55E',
    title: 'Service User PWA',
    desc:  'Allows service users to send wellbeing check-ins, request help, confirm visits, update support needs, and raise safety concerns.',
    badge: 'Local-first',
  },
  {
    icon: 'brain', color: '#A78BFA',
    title: '4P3X Intelligent AI™ Oversight',
    desc:  'Advisory risk awareness, missing-information checks, evidence completeness support, and supervisor-ready reporting prompts. Advisory only — human review always required.',
    badge: 'Advisory only',
  },
  {
    icon: 'toggle', color: '#38BDF8',
    title: 'Demo / Live Ready',
    desc:  'Demo Mode showcases the product with safe sample data. Live Mode runs with a connected backend, real authentication, persistent records, dashboards, and sync.',
    badge: null,
  },
]

// ─── Who it helps ──────────────────────────────────────────────
const WHO = [
  { icon: 'users',    label: 'Community welfare teams'        },
  { icon: 'heart',    label: 'Outreach services'              },
  { icon: 'building', label: 'Charities & councils'           },
  { icon: 'map',      label: 'Housing support teams'          },
  { icon: 'users',    label: 'Volunteer responder teams'      },
  { icon: 'phone',    label: 'Mobile care support workflows'  },
  { icon: 'shield',   label: 'Public-benefit pilot projects'  },
  { icon: 'building', label: 'Outreach co-ordinators'         },
]

// ─── Safety items ──────────────────────────────────────────────
const SAFETY = [
  'Human review is always required before any safeguarding, legal, clinical, or emergency decision.',
  'AI does not make final safeguarding, legal, clinical, or emergency decisions.',
  'The platform cannot guarantee safety or the accuracy of offline or delayed data.',
  'Data may be incomplete, delayed, or unavailable when offline.',
  'Users must follow their organisation\'s policies, professional duties, and lone-working procedures.',
  'If someone is in immediate danger, contact emergency services directly.',
]

// ─── Install Modal ─────────────────────────────────────────────
function InstallModal({ onInstall, onDismiss, onDashboard, installAvailable, isIOS, installSuccess }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rl-install-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{ background: '#0d0d0d', borderColor: '#C9A84C44' }}
      >
        <button
          onClick={onDismiss}
          aria-label="Close install prompt"
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <Ico d={IC.x} size={18} />
        </button>

        <div className="h-1 w-16 rounded-full mb-5" style={{ background: 'linear-gradient(90deg,#C9A84C,#E5C97E)' }} />

        <h2 id="rl-install-modal-title" className="text-lg font-bold text-white mb-2">
          Install ResponseLink OS™ locally?
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-5">
          Install the app on this device for faster access, PWA-style use, and local-first demo access where supported by your browser.
        </p>

        {installSuccess ? (
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-5">
            <Ico d={IC.check} size={16} color="#4ADE80" /> App installed successfully
          </div>
        ) : isIOS ? (
          <div className="rounded-xl p-4 mb-5 text-sm text-amber-300 leading-relaxed border" style={{ background: '#1a1200', borderColor: '#C9A84C44' }}>
            <p className="font-semibold mb-1">iPhone / iPad install</p>
            <p>Open the <strong>Share menu</strong> (⎋) in Safari and choose <strong>Add to Home Screen</strong>.</p>
          </div>
        ) : !installAvailable ? (
          <div className="rounded-xl p-4 mb-5 text-sm text-slate-400 leading-relaxed border" style={{ background: '#111', borderColor: '#333' }}>
            Install is not available in this browser yet. You can still open the dashboard or use your browser&apos;s <strong>Add to Home Screen</strong> option if available.
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {installAvailable && !installSuccess && (
            <button
              onClick={onInstall}
              className="flex items-center justify-center gap-2 w-full rounded-xl py-3 px-5 text-sm font-bold text-black transition-all focus:outline-none focus:ring-2 focus:ring-amber-300"
              style={{ background: 'linear-gradient(135deg,#C9A84C,#E5C97E)' }}
            >
              <Ico d={IC.download} size={16} color="#000" /> Install App
            </button>
          )}
          <button
            onClick={onDashboard}
            className="flex items-center justify-center gap-2 w-full rounded-xl py-3 px-5 text-sm font-semibold text-white border border-slate-700 hover:border-amber-500/50 hover:bg-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <Ico d={IC.dashboard} size={16} /> Open Dashboard
          </button>
          {!installSuccess && (
            <button
              onClick={onDismiss}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors py-1 focus:outline-none focus:underline"
            >
              Not Now
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN INTRO PAGE
// ══════════════════════════════════════════════════════════════
export default function IntroPage() {
  const navigate = useNavigate()

  const [deferredPrompt,   setDeferredPrompt]   = useState(null)
  const [installAvailable, setInstallAvailable] = useState(false)
  const [installSuccess,   setInstallSuccess]   = useState(false)
  const [showModal,        setShowModal]        = useState(false)
  const [isIOS,            setIsIOS]            = useState(false)

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setInstallAvailable(true)
    }
    const onInstalled = () => {
      setInstallSuccess(true)
      setDeferredPrompt(null)
      setInstallAvailable(false)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled',         onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled',         onInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstallSuccess(true)
    setDeferredPrompt(null)
    setInstallAvailable(false)
  }, [deferredPrompt])

  const handleDismiss  = () => {
    setShowModal(false)
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch {}
  }
  const handleDashboard = () => { setShowModal(false); navigate('/dashboard') }

  const onInstallClick  = () => {
    if (installAvailable) { handleInstall() }
    else { setShowModal(true) }
  }

  // ── Reusable button styles ──────────────────────────────────
  const btnPrimary = {
    background: 'linear-gradient(135deg,#C9A84C,#E5C97E)',
  }

  return (
    <>
      {showModal && (
        <InstallModal
          onInstall={handleInstall}
          onDismiss={handleDismiss}
          onDashboard={handleDashboard}
          installAvailable={installAvailable}
          isIOS={isIOS}
          installSuccess={installSuccess}
        />
      )}

      <div
        className="min-h-screen w-full overflow-x-hidden font-sans"
        style={{ background: 'linear-gradient(160deg,#0a0000 0%,#060612 55%,#08080a 100%)' }}
      >
        {/* Gold / purple accent bar */}
        <div className="w-full h-1" style={{ background: 'linear-gradient(90deg,#7C3AED,#C9A84C,#E5C97E,#C9A84C,#7C3AED)' }} />

        {/* ── HERO ─────────────────────────────────────── */}
        <section className="px-5 pt-16 pb-12 sm:pt-24 sm:pb-16 max-w-5xl mx-auto text-center">

          {/* Brand pill */}
          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold mb-8"
            style={{ borderColor: '#C9A84C55', background: '#1a1000', color: '#C9A84C' }}
          >
            <span style={{ fontSize: 8, color: '#C9A84C' }}>●</span>
            Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4 leading-tight"
            style={{ background: 'linear-gradient(135deg,#C9A84C 0%,#E5C97E 40%,#B8A060 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            ResponseLink OS™
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 font-medium mb-3">
            AI-Assisted Community Welfare &amp; Mobile Response Platform
          </p>

          <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
            ResponseLink OS™ helps community organisations coordinate welfare visits, outreach tasks, responder check-ins, service user check-ins, incident reports, escalation workflows, and evidence capture through a command dashboard, responder PWA, and service user PWA.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center justify-center gap-2 rounded-xl py-3.5 px-7 text-sm font-bold text-black shadow-lg transition-all hover:scale-[1.02] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-amber-300 w-full sm:w-auto"
              style={btnPrimary}
            >
              <Ico d={IC.dashboard} size={17} color="#000" />
              Open Command Dashboard
            </button>

            <button
              onClick={onInstallClick}
              className="flex items-center justify-center gap-2 rounded-xl py-3.5 px-7 text-sm font-semibold text-white border border-slate-700 hover:border-amber-500/40 hover:bg-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-auto"
            >
              <Ico d={IC.download} size={17} />
              {installSuccess ? 'App Installed ✓' : 'Install Local App'}
            </button>

            <button
              onClick={() => navigate('/responder-app')}
              className="flex items-center justify-center gap-2 rounded-xl py-3.5 px-7 text-sm font-semibold transition-all hover:bg-violet-500/10 focus:outline-none focus:ring-2 focus:ring-violet-400 w-full sm:w-auto"
              style={{ color: '#A78BFA', border: '1px solid #7C3AED44' }}
            >
              <Ico d={IC.phone} size={17} color="#A78BFA" />
              Open Responder PWA
            </button>

            <button
              onClick={() => navigate('/service-user-pwa')}
              className="flex items-center justify-center gap-2 rounded-xl py-3.5 px-7 text-sm font-semibold transition-all hover:bg-green-500/10 focus:outline-none focus:ring-2 focus:ring-green-400 w-full sm:w-auto"
              style={{ color: '#4ADE80', border: '1px solid #22C55E44' }}
            >
              <Ico d={IC.heart} size={17} color="#4ADE80" />
              Open Service User PWA
            </button>
          </div>

          {/* Hero advisory */}
          <p className="mt-8 text-xs text-slate-600 max-w-2xl mx-auto leading-relaxed">
            ResponseLink OS™ is advisory and coordination-support software. It does not replace emergency services, safeguarding professionals, clinical judgement, legal duties, or human decision-making.{' '}
            <strong className="text-slate-500">If someone is in immediate danger, contact emergency services.</strong>
          </p>
        </section>

        {/* ── WHAT IT DOES ─────────────────────────────── */}
        <section className="px-5 py-14 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">What It Does</h2>
            <p className="text-sm text-slate-500">Five integrated layers working together</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="relative rounded-2xl border p-5 flex flex-col gap-3 transition-colors"
                style={{ background: '#0d0d0d', borderColor: '#1e1e1e' }}
              >
                {f.badge && (
                  <span
                    className="absolute top-4 right-4 text-2xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: '#1a1a1a', color: '#777', border: '1px solid #333', fontSize: 10 }}
                  >
                    {f.badge}
                  </span>
                )}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: f.color + '18', border: `1px solid ${f.color}33` }}
                >
                  <Ico d={IC[f.icon]} size={18} color={f.color} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1.5">{f.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── WHO IT HELPS ─────────────────────────────── */}
        <section className="px-5 py-12 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Who It Helps</h2>
            <p className="text-sm text-slate-500">Built for organisations that coordinate people in the field</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {WHO.map((w, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-xl border px-3.5 py-3"
                style={{ background: '#0d0d0d', borderColor: '#1e1e1e' }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#C9A84C18', border: '1px solid #C9A84C33' }}
                >
                  <Ico d={IC[w.icon]} size={13} color="#C9A84C" />
                </div>
                <span className="text-xs text-slate-300 leading-snug font-medium">{w.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── SAFETY BOUNDARIES ────────────────────────── */}
        <section className="px-5 py-12 max-w-5xl mx-auto">
          <div
            className="rounded-2xl border p-6 sm:p-8"
            style={{ background: '#0d0a00', borderColor: '#C9A84C33' }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#C9A84C18', border: '1px solid #C9A84C55' }}
              >
                <Ico d={IC.shield} size={18} color="#C9A84C" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Safety &amp; Professional Boundaries</h2>
                <p className="text-xs text-slate-500">Read before operational use</p>
              </div>
            </div>

            <ul className="space-y-3">
              {SAFETY.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: '#C9A84C22', border: '1px solid #C9A84C44' }}
                  >
                    <Ico d={IC.check} size={10} color="#C9A84C" />
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{s}</p>
                </li>
              ))}
            </ul>

            <div
              className="mt-6 rounded-xl border p-4 flex items-start gap-3"
              style={{ background: '#1a0000', borderColor: '#ff444433' }}
            >
              <Ico d={IC.alert} size={18} color="#f87171" className="flex-shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-red-400 leading-relaxed">
                Emergency Notice: ResponseLink OS™ is NOT an emergency service. It does not contact emergency services automatically. If someone is in immediate danger, call emergency services directly.
              </p>
            </div>
          </div>
        </section>

        {/* ── BOTTOM CTA ───────────────────────────────── */}
        <section className="px-5 py-16 max-w-5xl mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Ready to explore?</h2>
          <p className="text-sm text-slate-500 mb-8">Open the Command Dashboard or install the app to get started.</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center justify-center gap-2 rounded-xl py-3.5 px-8 text-sm font-bold text-black shadow-lg transition-all hover:scale-[1.02] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-amber-300 w-full sm:w-auto"
              style={btnPrimary}
            >
              <Ico d={IC.dashboard} size={17} color="#000" />
              Open Command Dashboard
              <Ico d={IC.arrow} size={15} color="#000" />
            </button>

            <button
              onClick={onInstallClick}
              className="flex items-center justify-center gap-2 rounded-xl py-3.5 px-8 text-sm font-semibold text-white border border-slate-700 hover:border-amber-500/40 hover:bg-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-auto"
            >
              <Ico d={IC.download} size={17} />
              {installSuccess ? 'App Installed ✓' : 'Install Local App'}
            </button>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────── */}
        <footer className="border-t px-5 py-8 text-center" style={{ borderColor: '#1a1a1a' }}>
          <p className="text-xs text-slate-700 mb-1">
            ResponseLink OS™ — AI-Assisted Community Welfare &amp; Mobile Response Platform
          </p>
          <p className="text-xs text-slate-800">
            Powered by 4P3X Intelligent AI™ — Created by Kyzel Kreates™
          </p>
        </footer>

        {/* App-installed toast (fires after modal is closed) */}
        {installSuccess && !showModal && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold text-green-300 shadow-xl whitespace-nowrap"
            style={{ background: '#001a00', borderColor: '#22C55E55' }}
          >
            <Ico d={IC.check} size={15} color="#4ADE80" />
            App installed successfully
          </div>
        )}
      </div>
    </>
  )
}
