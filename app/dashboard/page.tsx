'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Lock,
  Network,
  ShieldCheck,
  Key,
  BarChart3,
  Users,
  FileCheck,
  Settings,
  LogOut,
  Copy,
  Plus,
  ArrowUpRight,
  Activity,
} from 'lucide-react'
import Image from 'next/image'

// Simulated data — in production, fetched from /v1/org, /v1/usage, /api-keys
const MOCK_DATA = {
  user: { email: 'admin@company.com', full_name: 'Jane Doe', role: 'admin' },
  org: { name: 'Acme Corp', tier: 'professional', slug: 'acme-corp' },
  usage: {
    api_calls: 4_231,
    fl_rounds: 47,
    storage_gb: 2.3,
    limits: { api_calls: 100_000, fl_rounds: 1_000, storage_gb: 100 },
  },
  apiKeys: [
    { id: 1, name: 'Production SDK', prefix: 'aegis_sk_a3f7...', last_used: '2 hours ago', scopes: 'vault:read,vault:write,fl:train' },
    { id: 2, name: 'CI/CD Pipeline', prefix: 'aegis_sk_b9c2...', last_used: '1 day ago', scopes: 'vault:read' },
  ],
  recentActivity: [
    { action: 'FL Training Round #47', status: 'success', time: '12 min ago', epsilon: '0.42' },
    { action: 'Vault: 3 files encrypted', status: 'success', time: '1 hour ago', epsilon: null },
    { action: 'API Key rotated: CI/CD', status: 'info', time: '3 hours ago', epsilon: null },
    { action: 'FL Training Round #46', status: 'success', time: '6 hours ago', epsilon: '0.41' },
    { action: 'GDPR consent policy updated', status: 'info', time: '1 day ago', epsilon: null },
  ],
  privacyBudget: { total: 10.0, consumed: 3.84, rounds: 47 },
  compliance: {
    regulations: ['GDPR', 'HIPAA', 'CCPA'],
    status: 'compliant',
    lastAudit: '2026-02-15',
  },
}

type TabKey = 'overview' | 'api-keys' | 'compliance' | 'settings'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [data] = useState(MOCK_DATA)

  const tabs = [
    { key: 'overview' as TabKey, label: 'Overview', icon: BarChart3 },
    { key: 'api-keys' as TabKey, label: 'API Keys', icon: Key },
    { key: 'compliance' as TabKey, label: 'Compliance', icon: ShieldCheck },
    { key: 'settings' as TabKey, label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Top bar */}
      <header className="border-b border-white/[0.06] bg-[#09090B]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Aegis" width={32} height={32} />
            <span className="text-lg font-bold text-white">AEGIS</span>
            <span className="rounded-full bg-[#0EA5E9]/10 px-2.5 py-0.5 text-xs font-medium text-[#0EA5E9]">
              {data.org.tier}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#A1A1AA]">{data.user.email}</span>
            <button className="flex items-center gap-1 text-sm text-[#71717A] hover:text-white">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-lg border border-white/[0.06] bg-[#0F0F12] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white/[0.06] text-white'
                  : 'text-[#71717A] hover:text-[#A1A1AA]'
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
            {/* Metric cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="API Calls"
                value={data.usage.api_calls.toLocaleString()}
                limit={data.usage.limits.api_calls.toLocaleString()}
                percentage={(data.usage.api_calls / data.usage.limits.api_calls) * 100}
                icon={Activity}
                color="#0EA5E9"
              />
              <MetricCard
                title="FL Rounds"
                value={data.usage.fl_rounds.toString()}
                limit={data.usage.limits.fl_rounds.toLocaleString()}
                percentage={(data.usage.fl_rounds / data.usage.limits.fl_rounds) * 100}
                icon={Network}
                color="#8B5CF6"
              />
              <MetricCard
                title="Storage"
                value={`${data.usage.storage_gb} GB`}
                limit={`${data.usage.limits.storage_gb} GB`}
                percentage={(data.usage.storage_gb / data.usage.limits.storage_gb) * 100}
                icon={Lock}
                color="#22C55E"
              />
              <MetricCard
                title="Privacy Budget"
                value={`${data.privacyBudget.consumed.toFixed(2)} ε`}
                limit={`${data.privacyBudget.total} ε`}
                percentage={(data.privacyBudget.consumed / data.privacyBudget.total) * 100}
                icon={ShieldCheck}
                color="#F59E0B"
              />
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-6">
              <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
              <div className="mt-4 space-y-3">
                {data.recentActivity.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${item.status === 'success' ? 'bg-[#22C55E]' : 'bg-[#0EA5E9]'}`} />
                      <span className="text-sm text-[#A1A1AA]">{item.action}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {item.epsilon && (
                        <span className="text-xs text-[#F59E0B]">ε = {item.epsilon}</span>
                      )}
                      <span className="text-xs text-[#71717A]">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api-keys' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">API Keys</h3>
              <button className="flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-medium text-white hover:bg-[#38BDF8]">
                <Plus className="h-4 w-4" />
                Generate Key
              </button>
            </div>

            <div className="space-y-3">
              {data.apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-5">
                  <div>
                    <p className="font-medium text-white">{key.name}</p>
                    <div className="mt-1 flex items-center gap-3">
                      <code className="rounded bg-white/[0.04] px-2 py-0.5 text-xs text-[#0EA5E9]">{key.prefix}</code>
                      <span className="text-xs text-[#71717A]">Last used: {key.last_used}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {key.scopes.split(',').map((scope) => (
                        <span key={scope} className="rounded-full border border-white/[0.06] px-2 py-0.5 text-xs text-[#71717A]">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-white/[0.08] p-2 text-[#71717A] hover:text-white">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#22C55E]/10">
                  <ShieldCheck className="h-5 w-5 text-[#22C55E]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Compliance Status</h3>
                  <p className="text-sm text-[#22C55E]">All systems compliant</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {data.compliance.regulations.map((reg) => (
                  <div key={reg} className="rounded-lg border border-[#22C55E]/20 bg-[#22C55E]/5 p-4 text-center">
                    <p className="text-lg font-bold text-white">{reg}</p>
                    <p className="text-xs text-[#22C55E]">Compliant</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-2 text-sm text-[#71717A]">
                <FileCheck className="h-4 w-4" />
                <span>Last audit: {data.compliance.lastAudit}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Privacy Budget</h3>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-4xl font-bold text-white">{data.privacyBudget.consumed.toFixed(2)}</p>
                  <p className="text-sm text-[#71717A]">of {data.privacyBudget.total} ε consumed</p>
                </div>
                <div className="flex-1">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#22C55E] via-[#F59E0B] to-[#EF4444]"
                      style={{ width: `${(data.privacyBudget.consumed / data.privacyBudget.total) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-[#71717A]">
                    <span>0 ε</span>
                    <span>{data.privacyBudget.total} ε (exhaustion)</span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-[#A1A1AA]">
                {data.privacyBudget.rounds} training rounds completed. Approximately{' '}
                {Math.floor((data.privacyBudget.total - data.privacyBudget.consumed) / (data.privacyBudget.consumed / data.privacyBudget.rounds))}{' '}
                rounds remaining before budget exhaustion.
              </p>
            </div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-6">
              <h3 className="text-lg font-semibold text-white">Organization</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#A1A1AA]">Organization Name</label>
                  <input
                    defaultValue={data.org.name}
                    className="mt-1.5 w-full max-w-md rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#A1A1AA]">Plan</label>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="rounded-full bg-[#0EA5E9]/10 px-3 py-1 text-sm font-medium text-[#0EA5E9]">
                      {data.org.tier}
                    </span>
                    <a href="/pricing" className="flex items-center gap-1 text-sm text-[#0EA5E9] hover:text-[#38BDF8]">
                      Upgrade <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-6">
              <h3 className="text-lg font-semibold text-white">Team Members</h3>
              <div className="mt-4 flex items-center gap-3">
                <Users className="h-5 w-5 text-[#A1A1AA]" />
                <span className="text-sm text-[#A1A1AA]">Manage team members and roles in Organization Settings</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  limit,
  percentage,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  limit: string
  percentage: number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#A1A1AA]">{title}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
          />
        </div>
        <p className="mt-1 text-xs text-[#71717A]">{limit} limit</p>
      </div>
    </div>
  )
}
