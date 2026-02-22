'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  Globe,
  Lock,
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Download,
  RefreshCw,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Compliance Dashboard — Sprint 4, Task 4.7
// @frontend-lead — Real-time regulation status per org
// ---------------------------------------------------------------------------

const REGULATIONS = [
  {
    id: 'gdpr',
    name: 'GDPR',
    region: 'EU / UK',
    status: 'compliant',
    description: 'General Data Protection Regulation',
    controls: 12,
    controlsCompliant: 12,
    lastAudit: '2026-02-15',
    features: ['DPIA automation', 'DSAR handling', 'Consent management', 'Data portability', 'Breach notification'],
  },
  {
    id: 'hipaa',
    name: 'HIPAA',
    region: 'United States',
    status: 'compliant',
    description: 'Health Insurance Portability and Accountability Act',
    controls: 10,
    controlsCompliant: 10,
    lastAudit: '2026-02-10',
    features: ['PHI detection', 'BAA templates', 'Minimum necessary', 'Audit controls', 'Breach notification'],
  },
  {
    id: 'uae-pdpl',
    name: 'UAE PDPL',
    region: 'Dubai & UAE',
    status: 'compliant',
    description: 'Federal Decree-Law No. 45/2021',
    controls: 8,
    controlsCompliant: 8,
    lastAudit: '2026-02-12',
    features: ['Arabic consent forms', 'Data residency proof', 'Cross-border checks', 'DIFC compliance'],
  },
  {
    id: 'ai-seal',
    name: 'Dubai AI Seal',
    region: 'Dubai',
    status: 'compliant',
    description: 'Mandatory AI certification since Oct 2025',
    controls: 7,
    controlsCompliant: 7,
    lastAudit: '2026-02-18',
    features: ['Transparency', 'Fairness', 'Accountability', 'Reliability', 'Security', 'Privacy', 'Human oversight'],
  },
  {
    id: 'dpdpa',
    name: 'DPDPA 2023',
    region: 'India',
    status: 'compliant',
    description: 'Digital Personal Data Protection Act',
    controls: 9,
    controlsCompliant: 9,
    lastAudit: '2026-02-14',
    features: ['Hindi consent forms', 'Section 4 consent', 'RBI data localization', 'Grievance officer'],
  },
  {
    id: 'nhs-dspt',
    name: 'NHS DSPT',
    region: 'United Kingdom',
    status: 'compliant',
    description: 'NHS Data Security and Protection Toolkit',
    controls: 10,
    controlsCompliant: 10,
    lastAudit: '2026-02-16',
    features: ['10 NDG standards', 'Caldicott principles', 'ICO registration', 'NHS Digital standards'],
  },
  {
    id: 'soc2',
    name: 'SOC 2 Type I',
    region: 'Global',
    status: 'in_progress',
    description: 'AICPA Trust Service Criteria',
    controls: 16,
    controlsCompliant: 15,
    lastAudit: '2026-02-20',
    features: ['Access controls', 'Change management', 'Risk assessment', 'System operations', 'Encryption'],
  },
]

const AUDIT_LOG = [
  { time: '12 min ago', action: 'DSAR access request processed', regulation: 'GDPR', status: 'success' },
  { time: '1 hour ago', action: 'PHI scan completed — 0 violations', regulation: 'HIPAA', status: 'success' },
  { time: '3 hours ago', action: 'Arabic consent form generated', regulation: 'UAE PDPL', status: 'success' },
  { time: '6 hours ago', action: 'Data residency attestation renewed', regulation: 'DIFC', status: 'success' },
  { time: '1 day ago', action: 'Privacy budget check — 6.16ε remaining', regulation: 'GDPR', status: 'info' },
  { time: '1 day ago', action: 'SOC 2 evidence collection — 94% complete', regulation: 'SOC 2', status: 'info' },
  { time: '2 days ago', action: 'RBI localization verification passed', regulation: 'DPDPA', status: 'success' },
]

type TabKey = 'overview' | 'regulations' | 'audit' | 'reports'

export default function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [selectedReg, setSelectedReg] = useState<string | null>(null)

  const totalControls = REGULATIONS.reduce((sum, r) => sum + r.controls, 0)
  const compliantControls = REGULATIONS.reduce((sum, r) => sum + r.controlsCompliant, 0)
  const complianceScore = Math.round((compliantControls / totalControls) * 100)

  const tabs = [
    { key: 'overview' as TabKey, label: 'Overview', icon: ShieldCheck },
    { key: 'regulations' as TabKey, label: 'Regulations', icon: Globe },
    { key: 'audit' as TabKey, label: 'Audit Log', icon: Activity },
    { key: 'reports' as TabKey, label: 'Reports', icon: FileCheck },
  ]

  return (
    <div className="min-h-screen bg-[#09090B]">
      <header className="border-b border-white/[0.06] bg-[#09090B]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Image src="/logo.png" alt="Aegis" width={32} height={32} />
            </Link>
            <span className="text-lg font-bold text-white">AEGIS</span>
            <span className="rounded-full bg-[#22C55E]/10 px-2.5 py-0.5 text-xs font-medium text-[#22C55E]">
              Compliance
            </span>
          </div>
          <Link href="/dashboard" className="text-sm text-[#A1A1AA] hover:text-white">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex gap-1 rounded-lg border border-white/[0.06] bg-[#0F0F12] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.key ? 'bg-white/[0.06] text-white' : 'text-[#71717A] hover:text-[#A1A1AA]'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Score Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[#22C55E]/20 bg-[#22C55E]/5 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#A1A1AA]">Compliance Score</span>
                  <ShieldCheck className="h-5 w-5 text-[#22C55E]" />
                </div>
                <p className="mt-2 text-3xl font-bold text-white">{complianceScore}%</p>
                <p className="mt-1 text-xs text-[#22C55E]">{compliantControls}/{totalControls} controls passing</p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#A1A1AA]">Active Regulations</span>
                  <Globe className="h-5 w-5 text-[#0EA5E9]" />
                </div>
                <p className="mt-2 text-3xl font-bold text-white">{REGULATIONS.length}</p>
                <p className="mt-1 text-xs text-[#71717A]">Across 4 markets</p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#A1A1AA]">Markets Covered</span>
                  <Shield className="h-5 w-5 text-[#8B5CF6]" />
                </div>
                <p className="mt-2 text-3xl font-bold text-white">4</p>
                <p className="mt-1 text-xs text-[#71717A]">UAE, US, UK, India</p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#A1A1AA]">SOC 2 Status</span>
                  <Lock className="h-5 w-5 text-[#F59E0B]" />
                </div>
                <p className="mt-2 text-3xl font-bold text-white">94%</p>
                <p className="mt-1 text-xs text-[#F59E0B]">Type I in progress</p>
              </div>
            </div>

            {/* Regulation Status Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {REGULATIONS.map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-5 hover:border-white/[0.12] transition-colors cursor-pointer"
                  onClick={() => { setSelectedReg(reg.id); setActiveTab('regulations') }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {reg.status === 'compliant' ? (
                        <CheckCircle className="h-5 w-5 text-[#22C55E]" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
                      )}
                      <h3 className="font-semibold text-white">{reg.name}</h3>
                    </div>
                    <span className="text-xs text-[#71717A]">{reg.region}</span>
                  </div>
                  <p className="mt-2 text-xs text-[#A1A1AA]">{reg.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(reg.controlsCompliant / reg.controls) * 100}%`,
                          backgroundColor: reg.status === 'compliant' ? '#22C55E' : '#F59E0B',
                        }}
                      />
                    </div>
                    <span className="ml-3 text-xs text-[#71717A]">
                      {reg.controlsCompliant}/{reg.controls}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Regulations Detail Tab */}
        {activeTab === 'regulations' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {REGULATIONS.map((reg) => (
              <div
                key={reg.id}
                className={`rounded-2xl border bg-[#0F0F12] p-6 ${
                  selectedReg === reg.id ? 'border-[#0EA5E9]/30' : 'border-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {reg.status === 'compliant' ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#22C55E]/10">
                        <ShieldCheck className="h-5 w-5 text-[#22C55E]" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F59E0B]/10">
                        <ShieldAlert className="h-5 w-5 text-[#F59E0B]" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-white">{reg.name}</h3>
                      <p className="text-sm text-[#A1A1AA]">{reg.description} — {reg.region}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    reg.status === 'compliant'
                      ? 'bg-[#22C55E]/10 text-[#22C55E]'
                      : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                  }`}>
                    {reg.status === 'compliant' ? 'Compliant' : 'In Progress'}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {reg.features.map((f) => (
                    <span key={f} className="rounded-full border border-white/[0.06] px-2.5 py-1 text-xs text-[#A1A1AA]">
                      {f}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-[#71717A]">
                  <span>Controls: {reg.controlsCompliant}/{reg.controls}</span>
                  <span>Last audit: {reg.lastAudit}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Compliance Audit Trail</h3>
              <button className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-white">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            </div>
            {AUDIT_LOG.map((entry, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-[#0F0F12] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    entry.status === 'success' ? 'bg-[#22C55E]' : 'bg-[#0EA5E9]'
                  }`} />
                  <span className="text-sm text-[#A1A1AA]">{entry.action}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="rounded-full border border-white/[0.06] px-2 py-0.5 text-xs text-[#71717A]">
                    {entry.regulation}
                  </span>
                  <span className="text-xs text-[#71717A]">{entry.time}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Compliance Reports</h3>
            {[
              { name: 'GDPR Data Protection Impact Assessment', type: 'DPIA', date: '2026-02-15', format: 'PDF' },
              { name: 'HIPAA Security Rule Assessment', type: 'Audit', date: '2026-02-10', format: 'PDF' },
              { name: 'UAE Data Residency Attestation', type: 'Certificate', date: '2026-02-12', format: 'PDF' },
              { name: 'Dubai AI Seal Readiness Report', type: 'Assessment', date: '2026-02-18', format: 'PDF' },
              { name: 'SOC 2 Type I Gap Analysis', type: 'Gap Analysis', date: '2026-02-20', format: 'PDF' },
              { name: 'RBI Data Localization Attestation', type: 'Certificate', date: '2026-02-14', format: 'PDF' },
              { name: 'NHS DSPT Compliance Assessment', type: 'Assessment', date: '2026-02-16', format: 'PDF' },
            ].map((report, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-5">
                <div className="flex items-center gap-3">
                  <FileCheck className="h-5 w-5 text-[#0EA5E9]" />
                  <div>
                    <p className="font-medium text-white">{report.name}</p>
                    <p className="text-xs text-[#71717A]">{report.type} — {report.date}</p>
                  </div>
                </div>
                <button className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-white">
                  <Download className="h-3.5 w-3.5" /> {report.format}
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
