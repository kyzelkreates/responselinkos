/**
 * ============================================================
 * ResponseLink OS™ — Evidence / Reports
 * pages_Reports.jsx  (route: /reports)
 *
 * ResponseLink OS™
 * AI-Assisted Community Welfare & Mobile Response Platform
 * Powered by 4P3X Intelligent AI™ Created by Kyzel Kreates™
 *
 * Run 8 — AI Oversight Agents + Reports
 *
 * LOCAL-FIRST ONLY. No backend. No external AI API.
 *
 * ⚠ REPORT LIMITATION:
 *   This report is generated from recorded ResponseLink OS™ data.
 *   Records may be incomplete, pending, offline, failed, conflicted,
 *   or awaiting human review. 4P3X Intelligent AI™ summaries are
 *   advisory only and do not verify facts independently. This report
 *   does not replace professional judgement, safeguarding procedures,
 *   clinical judgement, legal duties, or emergency services.
 * ============================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon            from './components_ui_Icon'
import { ROUTES }      from './config_routes'
import { formatDateTime } from './utils_format'
import { getDemoMode } from './core_rlData'
import { seedDemoData } from './core_rlDemoData'
import { timeAgo, getRiskLevelColor } from './core_rlSelectors'
import { getRiskColor }  from './core_rlRiskEngine'
import {
  getReportSummaryList, getReportDataForMission, getReportDataForVisit,
  getReportDataForIncident, getServiceUserSummaryReport, getGrantImpactDemoReport,
  runWelfareRiskAI, runSafeguardingEvidenceAI, ADVISORY_NOTICE, EVIDENCE_LIMITATION,
} from './core_rlAIEngine'
import { getSyncQueueSummary } from './core_rlSyncEngine'

// ─── Colour tokens ─────────────────────────────────────────────
const GOLD   = '#C9A84C'
const GREEN  = '#22c55e'
const RED    = '#ef4444'
const AMBER  = '#f59e0b'
const PURPLE = '#a855f7'
const CYAN   = '#06b6d4'
const ORANGE = '#f97316'
const SLATE  = '#A8A9AD'

// ─── Shared mini components ────────────────────────────────────
function Pill({ label, color, bg }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold"
          style={{ color, background: bg || `${color}18`, border: `1px solid ${color}30` }}>
      {label}
    </span>
  )
}

function Advisory({ children, color = AMBER }) {
  const tc = color===RED ? '#fca5a5' : color===AMBER ? '#fde68a' : color===CYAN ? '#67e8f9' : color===PURPLE ? '#d8b4fe' : SLATE
  return (
    <div className="rounded-xl border px-4 py-3 flex items-start gap-2.5"
         style={{ background: `${color}06`, borderColor: `${color}20` }}>
      <Icon name="ShieldAlert" size={12} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <p className="text-2xs leading-relaxed" style={{ color: tc }}>{children}</p>
    </div>
  )
}

function ReportLimitation() {
  return (
    <div className="rounded-xl border px-4 py-3" style={{ background: '#C9A84C06', borderColor: '#C9A84C20' }}>
      <p className="text-2xs font-semibold mb-1" style={{ color: GOLD }}>Report Limitation</p>
      <p className="text-2xs text-slate-500 leading-relaxed">{EVIDENCE_LIMITATION}</p>
    </div>
  )
}

function ReportHeader({ title, reportId, generatedAt, demoMode, type }) {
  return (
    <div className="border-b pb-4 mb-4" style={{ borderColor: '#C9A84C18' }}>
      <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
        <div>
          <p className="text-2xs text-slate-600 uppercase tracking-wider mb-0.5">ResponseLink OS™</p>
          <h2 className="text-base font-black text-white">{title}</h2>
          <p className="text-2xs text-slate-500">
            Report ID: {reportId} · Generated: {formatDateTime ? formatDateTime(generatedAt) : new Date(generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Pill label={demoMode ? '🟢 DEMO MODE' : '🟣 LIVE MODE'} color={demoMode ? GREEN : PURPLE} />
          <Pill label={type} color={GOLD} />
        </div>
      </div>
      <p className="text-2xs text-slate-700">
        Powered by 4P3X Intelligent AI™ · Created by Kyzel Kreates™ · Advisory Only
      </p>
      {demoMode && (
        <p className="text-2xs mt-1 px-2 py-1 rounded" style={{ background: '#22c55e08', color: '#86efac' }}>
          DEMO MODE — All data is simulated for demonstration purposes. No real service users, responders, or welfare records are represented.
        </p>
      )}
    </div>
  )
}

function DataRow({ label, value, color }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-start gap-2 py-1.5 border-b last:border-0" style={{ borderColor: '#C9A84C10' }}>
      <span className="text-2xs text-slate-600 w-36 flex-shrink-0">{label}</span>
      <span className="text-xs font-semibold flex-1" style={{ color: color || 'white' }}>
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
      </span>
    </div>
  )
}

function AIPromptRow({ prompt }) {
  const col = { critical:RED, high:ORANGE, medium:AMBER, low:GREEN }[prompt.severity] || AMBER
  return (
    <div className="px-3 py-2.5 border-b last:border-0 flex items-start gap-2"
         style={{ borderColor: `${col}12` }}>
      <Icon name="Brain" size={12} style={{ color: col, flexShrink: 0, marginTop: 1 }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: col }}>{prompt.title}</p>
        <p className="text-2xs text-slate-500 leading-relaxed mt-0.5">{prompt.prompt}</p>
        <p className="text-2xs text-slate-700 mt-0.5">Advisory only · Human review required</p>
      </div>
      <Pill label={prompt.severity} color={col} />
    </div>
  )
}

function PrintButton({ reportId }) {
  return (
    <button onClick={() => window.print()}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold"
      style={{ background: '#C9A84C08', borderColor: '#C9A84C25', color: GOLD }}>
      <Icon name="Printer" size={13} /> Print Report
    </button>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const doCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { /* clipboard not available */ }
  }
  return (
    <button onClick={doCopy}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold"
      style={{ background: '#22c55e08', borderColor: '#22c55e25', color: GREEN }}>
      <Icon name={copied ? 'Check' : 'Copy'} size={13} /> {copied ? 'Copied!' : 'Copy Summary'}
    </button>
  )
}

// ─── Report Type Selector ──────────────────────────────────────
const REPORT_TYPES = [
  { id: 'mission',       label: 'Mission Report',            icon: 'ClipboardList', color: GOLD },
  { id: 'visit',         label: 'Welfare Visit Report',      icon: 'HeartHandshake',color: GREEN },
  { id: 'incident',      label: 'Incident Report',           icon: 'AlertOctagon',  color: RED },
  { id: 'service_user',  label: 'Service User Summary',      icon: 'User',          color: CYAN },
  { id: 'grant_impact',  label: 'Grant / Impact Demo Report',icon: 'Award',         color: PURPLE },
]

// ─── Mission Report Preview ────────────────────────────────────
function MissionReportPreview({ missionId, onBack }) {
  const [data, setData] = useState(null)
  useEffect(() => { if (missionId) setData(getReportDataForMission(missionId)) }, [missionId])
  if (!data) return <div className="p-8 text-center text-slate-600 text-xs">Loading mission report…</div>
  const { mission: m, responder, serviceUser: su, checkIns, riskFlags, incidents, evidence, syncItems, aiWelfarePrompts, aiEvidencePrompts } = data
  const rc = getRiskColor(m.riskLevel)
  const copySummary = `Mission Report: ${m.title}\nID: ${data.reportId}\nStatus: ${m.status}\nRisk: ${m.riskLevel}\nResponder: ${responder?.displayName||'Unassigned'}\nService User: ${su?.displayName||'None'}\nCheck-ins: ${checkIns.length}\nIncidents: ${incidents.length}\nEvidence records: ${evidence.length}\n\nAdvisory limitation: ${EVIDENCE_LIMITATION}`

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white">
          <Icon name="ArrowLeft" size={14} /> Back
        </button>
        <PrintButton />
        <CopyButton text={copySummary} />
      </div>

      <div className="rounded-xl border p-5" style={{ background: '#0a050a', borderColor: '#C9A84C28' }}>
        <ReportHeader title={`Mission Report — ${m.title}`} reportId={data.reportId}
          generatedAt={data.generatedAt} demoMode={data.demoMode} type="Mission Report" />

        <div className="space-y-4">
          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Mission Details</p>
            <DataRow label="Mission ID"      value={m.id} />
            <DataRow label="Title"           value={m.title} />
            <DataRow label="Type"            value={m.missionType?.replace(/_/g,' ')} />
            <DataRow label="Priority"        value={m.priority} />
            <DataRow label="Risk Level"      value={m.riskLevel} color={rc.text} />
            <DataRow label="Status"          value={m.status?.replace(/_/g,' ')} />
            <DataRow label="Area/Location"   value={m.area} />
            <DataRow label="Scheduled"       value={m.scheduledTime ? new Date(m.scheduledTime).toLocaleString() : null} />
            <DataRow label="Due"             value={m.dueTime ? new Date(m.dueTime).toLocaleString() : null} />
            <DataRow label="Outcome Notes"   value={m.outcomeNotes || '— Not recorded —'} />
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assigned Responder</p>
            {responder
              ? <><DataRow label="Name" value={responder.displayName} /><DataRow label="Role" value={responder.role} /><DataRow label="Status" value={responder.status?.replace(/_/g,' ')} /></>
              : <p className="text-xs text-slate-600">No responder assigned</p>
            }
          </div>

          {su && (
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Linked Service User</p>
              <DataRow label="Name"           value={su.displayName} />
              <DataRow label="Wellbeing"      value={su.wellbeingStatus?.replace(/_/g,' ')} />
              <DataRow label="Help Request"   value={su.helpRequestStatus?.replace(/_/g,' ')} />
            </div>
          )}

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Check-Ins ({checkIns.length})
            </p>
            {checkIns.length === 0
              ? <p className="text-xs text-slate-600">No check-ins recorded for this mission</p>
              : checkIns.slice(-5).map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-1.5 border-b last:border-0"
                       style={{ borderColor: '#C9A84C10' }}>
                    <span className="text-2xs text-slate-600 w-28 flex-shrink-0">{c.checkInType?.replace(/_/g,' ')}</span>
                    <span className="text-xs font-semibold text-white flex-1">{c.wellbeingStatus?.replace(/_/g,' ')} · {c.safetyStatus || '—'}</span>
                    <span className="text-2xs text-slate-700">{timeAgo(c.timestamp || c.createdAt)}</span>
                  </div>
                ))
            }
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Risk Flags ({riskFlags.length})
            </p>
            {riskFlags.length === 0
              ? <p className="text-xs text-slate-600">No risk flags linked to this mission</p>
              : riskFlags.map(f => {
                  const rc2 = getRiskColor(f.riskLevel)
                  return (
                    <div key={f.id} className="flex items-center gap-2 py-1.5 border-b last:border-0"
                         style={{ borderColor: `${rc2.border}15` }}>
                      <Icon name="Flag" size={12} style={{ color: rc2.text }} />
                      <span className="text-xs text-white flex-1">{f.title}</span>
                      <Pill label={f.riskLevel} color={rc2.text} />
                      {f.humanReviewed && <span className="text-2xs font-bold" style={{ color: GREEN }}>✓</span>}
                    </div>
                  )
                })
            }
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Incidents ({incidents.length})
            </p>
            {incidents.length === 0
              ? <p className="text-xs text-slate-600">No incidents linked to this mission</p>
              : incidents.map(i => (
                  <div key={i.id} className="py-1.5 border-b last:border-0" style={{ borderColor: '#ef444415' }}>
                    <div className="flex items-center gap-2">
                      <Icon name="AlertOctagon" size={12} style={{ color: RED }} />
                      <span className="text-xs text-white flex-1">{i.title}</span>
                      <Pill label={i.severity} color={RED} />
                    </div>
                    <p className="text-2xs text-slate-600 mt-0.5 ml-4">Review: {i.supervisorReviewStatus?.replace(/_/g,' ') || 'pending'}</p>
                  </div>
                ))
            }
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Evidence Records ({evidence.length})
            </p>
            {evidence.length === 0
              ? <p className="text-xs text-slate-600">No evidence records linked to this mission</p>
              : evidence.slice(0, 5).map(e => (
                  <div key={e.id} className="flex items-center gap-2 py-1.5 border-b last:border-0"
                       style={{ borderColor: '#C9A84C10' }}>
                    <Icon name="FileText" size={12} style={{ color: GOLD }} />
                    <span className="text-xs text-white flex-1">{e.title || e.recordType?.replace(/_/g,' ')}</span>
                    <span className="text-2xs text-slate-600">{timeAgo(e.timestamp || e.createdAt)}</span>
                  </div>
                ))
            }
          </div>

          {(aiWelfarePrompts?.length > 0 || aiEvidencePrompts?.length > 0) && (
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                4P3X AI™ Advisory Prompts
              </p>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${PURPLE}20` }}>
                {[...aiWelfarePrompts, ...aiEvidencePrompts].map(p => <AIPromptRow key={p.id} prompt={p} />)}
              </div>
            </div>
          )}

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sync Status</p>
            {syncItems.length === 0
              ? <p className="text-xs text-slate-600">No sync records found for this mission</p>
              : Object.entries(data.syncStatusSummary).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 py-1">
                    <span className="text-2xs text-slate-600 w-20">{k}</span>
                    <span className="text-xs font-bold text-white">{v}</span>
                  </div>
                ))
            }
          </div>

          <ReportLimitation />
        </div>
      </div>
    </div>
  )
}

// ─── Welfare Visit Report Preview ──────────────────────────────
function VisitReportPreview({ visitId, onBack }) {
  const [data, setData] = useState(null)
  useEffect(() => { if (visitId) setData(getReportDataForVisit(visitId)) }, [visitId])
  if (!data) return <div className="p-8 text-center text-slate-600 text-xs">Loading visit report…</div>
  const { visit: v, mission: m, responder, serviceUser: su, riskFlags, evidence, checklistCompleted, aiEvidencePrompts } = data

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white">
          <Icon name="ArrowLeft" size={14} /> Back
        </button>
        <PrintButton />
      </div>
      <div className="rounded-xl border p-5" style={{ background: '#0a050a', borderColor: `${GREEN}28` }}>
        <ReportHeader title="Welfare Visit Report" reportId={data.reportId}
          generatedAt={data.generatedAt} demoMode={data.demoMode} type="Welfare Visit" />
        <div className="space-y-4">
          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Visit Details</p>
            <DataRow label="Visit ID"        value={v.id} />
            <DataRow label="Status"          value={v.status?.replace(/_/g,' ')} />
            <DataRow label="Started"         value={v.startedAt ? new Date(v.startedAt).toLocaleString() : null} />
            <DataRow label="Arrived"         value={v.arrivedAt ? new Date(v.arrivedAt).toLocaleString() : null} />
            <DataRow label="Completed"       value={v.completedAt ? new Date(v.completedAt).toLocaleString() : null} />
            <DataRow label="Outcome Notes"   value={v.outcomeNotes || '— Not recorded —'} color={v.outcomeNotes ? 'white' : RED} />
            <DataRow label="Follow-up Req."  value={v.followUpRequired ? 'Yes — review required' : 'Not indicated'} color={v.followUpRequired ? AMBER : 'white'} />
          </div>
          {responder && (
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Responder</p>
              <DataRow label="Name" value={responder.displayName} />
              <DataRow label="Role" value={responder.role} />
            </div>
          )}
          {su && (
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Service User</p>
              <DataRow label="Name"       value={su.displayName} />
              <DataRow label="Wellbeing"  value={su.wellbeingStatus?.replace(/_/g,' ')} />
            </div>
          )}
          {checklistCompleted && (
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Welfare Checklist</p>
              <div className="rounded-xl border px-4 py-3" style={{ background: '#22c55e06', borderColor: '#22c55e20' }}>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-black font-mono"
                       style={{ color: checklistCompleted.percent === 100 ? GREEN : AMBER }}>
                    {checklistCompleted.percent}%
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{checklistCompleted.completed}/{checklistCompleted.total} items completed</p>
                    {checklistCompleted.percent < 100 && <p className="text-2xs text-amber-400">Incomplete checklist — human review recommended</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Evidence Completeness</p>
            <Advisory color={data.outcomePresent ? GREEN : AMBER}>
              {data.outcomePresent
                ? 'Outcome notes are recorded for this visit.'
                : 'No outcome notes recorded. Add objective outcome notes before treating this record as complete. Do not fabricate missing details.'}
            </Advisory>
          </div>
          {aiEvidencePrompts?.length > 0 && (
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">4P3X AI™ Evidence Prompts</p>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${PURPLE}20` }}>
                {aiEvidencePrompts.map(p => <AIPromptRow key={p.id} prompt={p} />)}
              </div>
            </div>
          )}
          <ReportLimitation />
        </div>
      </div>
    </div>
  )
}

// ─── Incident Report Preview ───────────────────────────────────
function IncidentReportPreview({ incidentId, onBack }) {
  const [data, setData] = useState(null)
  useEffect(() => { if (incidentId) setData(getReportDataForIncident(incidentId)) }, [incidentId])
  if (!data) return <div className="p-8 text-center text-slate-600 text-xs">Loading incident report…</div>
  const { incident: inc, mission: m, responder, serviceUser: su, riskFlags, evidence, aiEvidenceGapPrompts } = data
  const rc = getRiskColor(inc.severity || 'medium')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white">
          <Icon name="ArrowLeft" size={14} /> Back
        </button>
        <PrintButton />
      </div>
      <div className="rounded-xl border p-5" style={{ background: '#0a050a', borderColor: `${RED}28` }}>
        <ReportHeader title={`Incident Report — ${inc.title}`} reportId={data.reportId}
          generatedAt={data.generatedAt} demoMode={data.demoMode} type="Incident Report" />
        <div className="space-y-4">
          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Incident Details</p>
            <DataRow label="Incident ID"      value={inc.id} />
            <DataRow label="Title"            value={inc.title} />
            <DataRow label="Category"         value={inc.category?.replace(/_/g,' ')} />
            <DataRow label="Severity"         value={inc.severity} color={rc.text} />
            <DataRow label="Description"      value={inc.description || '— Not recorded —'} />
            <DataRow label="Action Taken"     value={inc.actionTaken || '— NOT RECORDED —'} color={inc.actionTaken ? 'white' : RED} />
            <DataRow label="Supervisor Review"value={inc.supervisorReviewStatus?.replace(/_/g,' ') || 'pending'} color={data.supervisorReviewed ? GREEN : AMBER} />
            <DataRow label="Supervisor Note"  value={inc.supervisorNote || '— No note added —'} />
          </div>
          {responder && <div><p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Responder</p><DataRow label="Name" value={responder.displayName} /></div>}
          {su && <div><p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Service User</p><DataRow label="Name" value={su.displayName} /></div>}

          {!data.actionTakenPresent && (
            <Advisory color={RED}>
              No "action taken" note has been recorded for this incident. This is a required evidence field.
              Add objective action taken before this record is closed. Do not fabricate missing details.
            </Advisory>
          )}
          {!data.supervisorReviewed && (
            <Advisory color={AMBER}>
              This incident has not been marked as reviewed by a supervisor. Supervisor review is required
              before this record is treated as closed.
            </Advisory>
          )}

          {aiEvidenceGapPrompts?.length > 0 && (
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">4P3X AI™ Evidence Gap Prompts</p>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${PURPLE}20` }}>
                {aiEvidenceGapPrompts.map(p => <AIPromptRow key={p.id} prompt={p} />)}
              </div>
            </div>
          )}
          <ReportLimitation />
        </div>
      </div>
    </div>
  )
}

// ─── Service User Summary Preview ─────────────────────────────
function ServiceUserReportPreview({ serviceUserId, onBack }) {
  const [data, setData] = useState(null)
  useEffect(() => { if (serviceUserId) setData(getServiceUserSummaryReport(serviceUserId)) }, [serviceUserId])
  if (!data) return <div className="p-8 text-center text-slate-600 text-xs">Loading service user report…</div>
  const { serviceUser: su, missions, checkIns, riskFlags, aiWelfarePrompts } = data

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white">
          <Icon name="ArrowLeft" size={14} /> Back
        </button>
        <PrintButton />
      </div>
      <div className="rounded-xl border p-5" style={{ background: '#0a050a', borderColor: `${CYAN}28` }}>
        <ReportHeader title={`Service User Summary — ${su.displayName}`} reportId={data.reportId}
          generatedAt={data.generatedAt} demoMode={data.demoMode} type="Service User Summary" />

        <Advisory color={AMBER}>
          This report is for internal supervisor/coordinator use only.
          Service-user-facing exports must not include private staff notes, internal risk assessments, or case records without appropriate consent and data protection procedures.
        </Advisory>

        <div className="space-y-4 mt-4">
          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Service User Details</p>
            <DataRow label="Display Name"    value={su.displayName} />
            <DataRow label="Preferred Name"  value={su.preferredName} />
            <DataRow label="Support Type"    value={su.supportType?.replace(/_/g,' ')} />
            <DataRow label="Wellbeing Status"value={su.wellbeingStatus?.replace(/_/g,' ')} />
            <DataRow label="Help Request"    value={su.helpRequestStatus?.replace(/_/g,' ')} />
            <DataRow label="Risk Level"      value={su.riskLevel} color={getRiskColor(su.riskLevel).text} />
            <DataRow label="Last Check-In"   value={su.lastCheckInAt ? timeAgo(su.lastCheckInAt) : 'None recorded'} />
            <DataRow label="Messages (count)"value={data.messageCount} />
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Linked Missions ({missions.length})
            </p>
            {missions.length === 0
              ? <p className="text-xs text-slate-600">No missions linked to this service user</p>
              : missions.slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center gap-2 py-1.5 border-b last:border-0"
                       style={{ borderColor: '#C9A84C10' }}>
                    <Icon name="ClipboardList" size={12} style={{ color: GOLD }} />
                    <span className="text-xs text-white flex-1">{m.title}</span>
                    <Pill label={m.status?.replace(/_/g,' ')} color={GOLD} />
                  </div>
                ))
            }
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Recent Check-Ins ({checkIns.length} shown)
            </p>
            {checkIns.length === 0
              ? <p className="text-xs text-slate-600">No check-in records found</p>
              : checkIns.map(c => (
                  <div key={c.id} className="flex items-center gap-2 py-1.5 border-b last:border-0"
                       style={{ borderColor: '#06b6d415' }}>
                    <Icon name="Heart" size={11} style={{ color: CYAN }} />
                    <span className="text-2xs text-white flex-1">{c.wellbeing?.replace(/_/g,' ')} · {c.safety || '—'}</span>
                    <span className="text-2xs text-slate-600">{timeAgo(c.timestamp)}</span>
                  </div>
                ))
            }
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Risk Flags ({riskFlags.length})
            </p>
            {riskFlags.length === 0
              ? <p className="text-xs text-slate-600">No risk flags linked</p>
              : riskFlags.map(f => {
                  const rc2 = getRiskColor(f.riskLevel)
                  return (
                    <div key={f.id} className="flex items-center gap-2 py-1.5 border-b last:border-0"
                         style={{ borderColor: `${rc2.border}12` }}>
                      <Icon name="Flag" size={11} style={{ color: rc2.text }} />
                      <span className="text-xs text-white flex-1">{f.title}</span>
                      <Pill label={f.riskLevel} color={rc2.text} />
                      {f.humanReviewed && <Icon name="CheckCircle2" size={12} style={{ color: GREEN }} />}
                    </div>
                  )
                })
            }
          </div>

          {aiWelfarePrompts?.length > 0 && (
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">4P3X AI™ Welfare Prompts</p>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${PURPLE}20` }}>
                {aiWelfarePrompts.map(p => <AIPromptRow key={p.id} prompt={p} />)}
              </div>
            </div>
          )}

          <div className="rounded-xl border px-4 py-3" style={{ background: '#a855f706', borderColor: '#a855f720' }}>
            <p className="text-2xs font-semibold mb-1" style={{ color: PURPLE }}>Privacy & Confidentiality Notice</p>
            <p className="text-2xs text-slate-500 leading-relaxed">{data.privacyNotice}</p>
          </div>
          <ReportLimitation />
        </div>
      </div>
    </div>
  )
}

// ─── Grant / Impact Report Preview ────────────────────────────
function GrantImpactReportPreview({ onBack }) {
  const [data, setData] = useState(null)
  useEffect(() => { setData(getGrantImpactDemoReport()) }, [])
  if (!data) return <div className="p-8 text-center text-slate-600 text-xs">Generating grant report…</div>
  const { metrics: m } = data
  const copySummary = `Grant/Impact Demo Report — ResponseLink OS™\nID: ${data.reportId}\nGenerated: ${new Date(data.generatedAt).toLocaleString()}\n\nMetrics:\nTotal Missions: ${m.totalMissions}\nCompleted: ${m.completedMissions}\nActive: ${m.activeMissions}\nResponders: ${m.respondersActive}/${m.respondersTotal}\nService Users Supported: ${m.serviceUsersSupported}\nCheck-ins: ${m.checkInsReceived}\nHelp Requests: ${m.helpRequestsHandled}\nIncidents Logged: ${m.incidentsLogged}\nEvidence Records: ${m.evidenceRecords}\nAI Prompts Generated: ${m.aiPromptsGenerated}\n\n${data.publicBenefitSummary}\n\n${data.limitation}`

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white">
          <Icon name="ArrowLeft" size={14} /> Back
        </button>
        <PrintButton />
        <CopyButton text={copySummary} />
      </div>

      <div className="rounded-xl border p-5" style={{ background: '#0a050a', borderColor: `${PURPLE}28` }}>
        <ReportHeader title="Grant / Impact Demo Report" reportId={data.reportId}
          generatedAt={data.generatedAt} demoMode={data.demoMode} type="Grant/Impact Report" />

        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { label:'Total Missions',       v:m.totalMissions,        c:GOLD },
              { label:'Completed',            v:m.completedMissions,    c:GREEN },
              { label:'Active',               v:m.activeMissions,       c:CYAN },
              { label:'Responders Active',    v:m.respondersActive,     c:GOLD },
              { label:'Service Users',        v:m.serviceUsersSupported,c:PURPLE },
              { label:'Check-ins Received',   v:m.checkInsReceived,     c:GREEN },
              { label:'Help Requests',        v:m.helpRequestsHandled,  c:AMBER },
              { label:'Incidents Logged',     v:m.incidentsLogged,      c:RED },
              { label:'Evidence Records',     v:m.evidenceRecords,      c:PURPLE },
              { label:'Sync Events',          v:m.syncEventsTotal,      c:CYAN },
              { label:'AI Prompts Generated', v:m.aiPromptsGenerated,   c:PURPLE },
              { label:'Risk Flags Raised',    v:m.riskFlagsRaised,      c:ORANGE },
            ].map(k => (
              <div key={k.label} className="rounded-xl border px-3 py-3 text-center"
                   style={{ background: `${k.c}06`, borderColor: `${k.c}20` }}>
                <div className="text-2xl font-black font-mono" style={{ color: k.c }}>{k.v}</div>
                <div className="text-2xs mt-0.5" style={{ color: k.c }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Public Benefit Summary</p>
            <div className="rounded-xl border px-4 py-4" style={{ background: '#C9A84C06', borderColor: '#C9A84C20' }}>
              <p className="text-sm text-slate-200 leading-relaxed">{data.publicBenefitSummary}</p>
            </div>
          </div>

          <div>
            <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Grounded Grant Wording</p>
            <div className="space-y-2">
              {data.grantWording.map((g, i) => (
                <div key={i} className="flex items-start gap-2 py-2 border-b last:border-0"
                     style={{ borderColor: '#C9A84C10' }}>
                  <Icon name="CheckCircle2" size={12} style={{ color: GREEN, flexShrink: 0, marginTop: 1 }} />
                  <p className="text-xs text-slate-300 leading-relaxed">{g}</p>
                </div>
              ))}
            </div>
          </div>

          <Advisory color={AMBER}>
            This report uses {data.demoMode ? 'demo/simulated' : 'live operational'} data.
            Impact and outcome metrics should not be cited as verified statistics without independent evaluation.
            "Can help", "designed to support", and "can improve" language reflects design intent — not proven outcome.
          </Advisory>

          <div className="rounded-xl border px-4 py-3" style={{ background: '#a855f706', borderColor: '#a855f720' }}>
            <p className="text-2xs font-semibold mb-1" style={{ color: PURPLE }}>Demo / Disclaimer</p>
            <p className="text-2xs text-slate-500 leading-relaxed">{data.demoDisclaimer}</p>
          </div>

          <ReportLimitation />
        </div>
      </div>
    </div>
  )
}

// ─── Main Reports Page ─────────────────────────────────────────
export default function ReportsPage() {
  const navigate = useNavigate()

  const [isDemo,        setIsDemo]        = useState(getDemoMode)
  const [summary,       setSummary]       = useState(null)
  const [activeType,    setActiveType]    = useState(null)
  const [selectedId,    setSelectedId]    = useState(null)
  const [loading,       setLoading]       = useState(true)

  const loadData = useCallback(() => {
    try {
      const demo = getDemoMode()
      setIsDemo(demo)
      setSummary(getReportSummaryList())
    } catch (e) { console.error('[RL:Reports]', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const hasData = summary?.missions?.length > 0 || summary?.incidents?.length > 0

  // Showing a report preview
  if (activeType === 'mission' && selectedId)
    return <div className="min-h-screen p-4 sm:p-6" style={{ background: '#020002', color: '#fff' }}><MissionReportPreview missionId={selectedId} onBack={() => { setActiveType('mission'); setSelectedId(null) }} /></div>

  if (activeType === 'visit' && selectedId)
    return <div className="min-h-screen p-4 sm:p-6" style={{ background: '#020002', color: '#fff' }}><VisitReportPreview visitId={selectedId} onBack={() => { setActiveType('visit'); setSelectedId(null) }} /></div>

  if (activeType === 'incident' && selectedId)
    return <div className="min-h-screen p-4 sm:p-6" style={{ background: '#020002', color: '#fff' }}><IncidentReportPreview incidentId={selectedId} onBack={() => { setActiveType('incident'); setSelectedId(null) }} /></div>

  if (activeType === 'service_user' && selectedId)
    return <div className="min-h-screen p-4 sm:p-6" style={{ background: '#020002', color: '#fff' }}><ServiceUserReportPreview serviceUserId={selectedId} onBack={() => { setActiveType('service_user'); setSelectedId(null) }} /></div>

  if (activeType === 'grant_impact')
    return <div className="min-h-screen p-4 sm:p-6" style={{ background: '#020002', color: '#fff' }}><GrantImpactReportPreview onBack={() => setActiveType(null)} /></div>

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-5" style={{ background: '#020002', color: '#fff' }}>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}>
            <Icon name="FileText" size={18} style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Evidence / Reports</h1>
            <p className="text-2xs" style={{ color: GOLD }}>ResponseLink OS™ · 4P3X AI™ Assisted · Run 8</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xs px-2.5 py-1 rounded-full font-bold"
                style={{ background: isDemo ? '#22c55e15' : '#a855f715', color: isDemo ? GREEN : PURPLE, border: `1px solid ${isDemo ? '#22c55e30' : '#a855f730'}` }}>
            {isDemo ? '🟢 Demo Mode' : '🟣 Live Mode'}
          </span>
          <button onClick={() => navigate(ROUTES.DASHBOARD)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold text-slate-400 hover:text-white"
            style={{ borderColor: '#C9A84C18', background: '#C9A84C08' }}>
            <Icon name="LayoutDashboard" size={13} style={{ color: GOLD }} /> Dashboard
          </button>
        </div>
      </div>

      {/* Advisory */}
      <div className="rounded-xl border px-4 py-3 flex items-start gap-3"
           style={{ background: '#C9A84C06', borderColor: '#C9A84C20' }}>
        <Icon name="FileText" size={14} style={{ color: GOLD, flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs text-slate-400 leading-relaxed">
          <strong style={{ color: GOLD }}>Report Limitation:</strong> {EVIDENCE_LIMITATION}
        </p>
      </div>

      {/* Live empty */}
      {!isDemo && !hasData && (
        <div className="rounded-xl border p-6 space-y-3" style={{ background: `${PURPLE}06`, borderColor: `${PURPLE}25` }}>
          <h3 className="text-sm font-bold" style={{ color: PURPLE }}>Live Mode — No Records Yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Live Mode is active. Real operational reporting requires a configured backend, authentication,
            access controls, data protection setup, and organisation procedures.
          </p>
          <Advisory color={RED}>
            Do not enter real sensitive welfare data until a secure backend, authentication,
            access controls, data protection process, and organisational approval are configured.
          </Advisory>
        </div>
      )}

      {/* Demo seed */}
      {isDemo && !hasData && !loading && (
        <div className="rounded-xl border px-5 py-5" style={{ background: '#C9A84C06', borderColor: '#C9A84C25' }}>
          <p className="text-sm font-bold text-white mb-1">No Demo Data Yet</p>
          <p className="text-xs text-slate-400 mb-3">Seed demo data to generate report previews.</p>
          <button onClick={async () => { await seedDemoData(false); loadData() }}
            className="px-4 py-2 rounded-lg text-xs font-bold"
            style={{ background: GOLD, color: '#000' }}>
            Seed Demo Data
          </button>
        </div>
      )}

      {/* Report type selector */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Select Report Type</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORT_TYPES.map(rt => (
            <button key={rt.id}
              onClick={() => { setActiveType(rt.id); if (rt.id !== 'grant_impact') setSelectedId(null) }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all hover:opacity-80"
              style={{
                background: activeType === rt.id ? `${rt.color}12` : '#0a050a',
                borderColor: activeType === rt.id ? `${rt.color}40` : `${rt.color}20`,
              }}>
              <Icon name={rt.icon} size={18} style={{ color: rt.color }} />
              <div>
                <p className="text-xs font-bold" style={{ color: rt.color }}>{rt.label}</p>
                <p className="text-2xs text-slate-600">
                  {rt.id === 'mission'       ? `${summary?.missions?.length || 0} available` :
                   rt.id === 'visit'         ? `${summary?.visits?.length || 0} available` :
                   rt.id === 'incident'      ? `${summary?.incidents?.length || 0} available` :
                   rt.id === 'service_user'  ? `${summary?.serviceUsers?.length || 0} available` :
                   'Generate from demo data'}
                </p>
              </div>
              <Icon name="ChevronRight" size={14} className="text-slate-600 ml-auto" />
            </button>
          ))}
        </div>
      </div>

      {/* Record selector for chosen type */}
      {activeType && activeType !== 'grant_impact' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {REPORT_TYPES.find(r => r.id === activeType)?.label} — Select Record
          </p>

          {/* Mission list */}
          {activeType === 'mission' && (
            summary?.missions?.length === 0
              ? <p className="text-xs text-slate-600 p-4">No missions found in {isDemo ? 'demo' : 'live'} mode.</p>
              : summary?.missions?.map(m => {
                  const rc = getRiskColor(m.riskLevel || 'low')
                  return (
                    <button key={m.id} onClick={() => setSelectedId(m.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:opacity-80"
                      style={{ background: '#0a050a', borderColor: '#C9A84C20' }}>
                      <Icon name="ClipboardList" size={14} style={{ color: GOLD }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white">{m.title}</p>
                        <p className="text-2xs text-slate-500">{m.status?.replace(/_/g,' ')} · {m.scheduledTime ? new Date(m.scheduledTime).toLocaleDateString() : 'No date'}</p>
                      </div>
                      <Pill label={m.riskLevel || 'low'} color={rc.text} />
                      <Icon name="ChevronRight" size={13} className="text-slate-600" />
                    </button>
                  )
                })
          )}

          {/* Visit list */}
          {activeType === 'visit' && (
            summary?.visits?.length === 0
              ? <p className="text-xs text-slate-600 p-4">No welfare visits found in {isDemo ? 'demo' : 'live'} mode.</p>
              : summary?.visits?.map(v => (
                  <button key={v.id} onClick={() => setSelectedId(v.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:opacity-80"
                    style={{ background: '#0a050a', borderColor: '#22c55e20' }}>
                    <Icon name="HeartHandshake" size={14} style={{ color: GREEN }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white">Visit {v.id.slice(-6)}</p>
                      <p className="text-2xs text-slate-500">Status: {v.status?.replace(/_/g,' ')}</p>
                    </div>
                    <Icon name="ChevronRight" size={13} className="text-slate-600" />
                  </button>
                ))
          )}

          {/* Incident list */}
          {activeType === 'incident' && (
            summary?.incidents?.length === 0
              ? <p className="text-xs text-slate-600 p-4">No incidents found in {isDemo ? 'demo' : 'live'} mode.</p>
              : summary?.incidents?.map(i => {
                  const rc = getRiskColor(i.severity || 'medium')
                  return (
                    <button key={i.id} onClick={() => setSelectedId(i.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:opacity-80"
                      style={{ background: '#0a050a', borderColor: '#ef444420' }}>
                      <Icon name="AlertOctagon" size={14} style={{ color: RED }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white">{i.title}</p>
                        <p className="text-2xs text-slate-500">{i.severity} · Review: {i.supervisorReviewStatus?.replace(/_/g,' ') || 'pending'}</p>
                      </div>
                      <Pill label={i.severity} color={rc.text} />
                      <Icon name="ChevronRight" size={13} className="text-slate-600" />
                    </button>
                  )
                })
          )}

          {/* Service user list */}
          {activeType === 'service_user' && (
            summary?.serviceUsers?.length === 0
              ? <p className="text-xs text-slate-600 p-4">No service users found in {isDemo ? 'demo' : 'live'} mode.</p>
              : summary?.serviceUsers?.map(su => {
                  const wc = su.wellbeingStatus === 'stable' || su.wellbeingStatus === 'check_in_received' ? GREEN
                           : su.wellbeingStatus === 'safety_concern' || su.wellbeingStatus === 'urgent_help_requested' ? RED : AMBER
                  return (
                    <button key={su.id} onClick={() => setSelectedId(su.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:opacity-80"
                      style={{ background: '#0a050a', borderColor: '#06b6d420' }}>
                      <Icon name="User" size={14} style={{ color: CYAN }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white">{su.displayName}</p>
                        <p className="text-2xs text-slate-500">{su.wellbeingStatus?.replace(/_/g,' ')}</p>
                      </div>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: wc }} />
                      <Icon name="ChevronRight" size={13} className="text-slate-600" />
                    </button>
                  )
                })
          )}
        </div>
      )}

      {/* Grant: auto-open */}
      {activeType === 'grant_impact' && (
        <GrantImpactReportPreview onBack={() => setActiveType(null)} />
      )}

      {/* Footer */}
      <div className="rounded-xl border px-5 py-4" style={{ background: '#C9A84C04', borderColor: '#C9A84C15' }}>
        <div className="flex items-start gap-3">
          <Icon name="FileText" size={14} style={{ color: GOLD, flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong style={{ color: GOLD }}>ResponseLink OS™ Evidence/Reports · Run 8</strong> —
            Reports generated from recorded local data. {EVIDENCE_LIMITATION}
            Backend reporting and live export in Run 9.
          </p>
        </div>
      </div>
    </div>
  )
}
