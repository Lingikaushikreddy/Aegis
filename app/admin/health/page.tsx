'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart,
  AlertTriangle,
  TrendingDown,
  Users,
  Activity,
  ArrowUpRight,
  Search,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  BookOpen,
  Zap,
  ArrowLeft,
  Filter,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Task 5.3 — Customer Health Monitoring Dashboard
// @frontend-lead — Org health scores, churn alerts, CS playbook
// ---------------------------------------------------------------------------

// Mock data — in production, fetched from /v1/admin/health endpoints
const MOCK_ORG_HEALTH: OrgHealth[] = [
  {
    org_id: 1,
    org_name: 'Acme Corp',
    tier: 'enterprise',
    score: 92,
    risk_level: 'healthy',
    last_active: '2 hours ago',
    dau: 18,
    mau: 34,
    top_recommendation: null,
    breakdown: {
      api_call_frequency: { raw_score: 95, weight: 0.3, weighted: 28.5 },
      fl_round_activity: { raw_score: 88, weight: 0.25, weighted: 22.0 },
      login_recency: { raw_score: 100, weight: 0.2, weighted: 20.0 },
      feature_breadth: { raw_score: 80, weight: 0.15, weighted: 12.0 },
      support_tickets: { raw_score: 95, weight: 0.1, weighted: 9.5 },
    },
  },
  {
    org_id: 2,
    org_name: 'HealthNet AI',
    tier: 'professional',
    score: 85,
    risk_level: 'healthy',
    last_active: '30 min ago',
    dau: 12,
    mau: 20,
    top_recommendation: null,
    breakdown: {
      api_call_frequency: { raw_score: 80, weight: 0.3, weighted: 24.0 },
      fl_round_activity: { raw_score: 92, weight: 0.25, weighted: 23.0 },
      login_recency: { raw_score: 100, weight: 0.2, weighted: 20.0 },
      feature_breadth: { raw_score: 60, weight: 0.15, weighted: 9.0 },
      support_tickets: { raw_score: 90, weight: 0.1, weighted: 9.0 },
    },
  },
  {
    org_id: 3,
    org_name: 'FinVault Dubai',
    tier: 'enterprise',
    score: 78,
    risk_level: 'healthy',
    last_active: '1 day ago',
    dau: 6,
    mau: 15,
    top_recommendation: null,
    breakdown: {
      api_call_frequency: { raw_score: 72, weight: 0.3, weighted: 21.6 },
      fl_round_activity: { raw_score: 85, weight: 0.25, weighted: 21.25 },
      login_recency: { raw_score: 90, weight: 0.2, weighted: 18.0 },
      feature_breadth: { raw_score: 55, weight: 0.15, weighted: 8.25 },
      support_tickets: { raw_score: 90, weight: 0.1, weighted: 9.0 },
    },
  },
  {
    org_id: 4,
    org_name: 'MedTech Solutions',
    tier: 'professional',
    score: 54,
    risk_level: 'at_risk',
    last_active: '5 days ago',
    dau: 2,
    mau: 8,
    top_recommendation: {
      action: 'schedule_onboarding_call',
      title: 'Schedule onboarding call',
      priority: 'high',
    },
    breakdown: {
      api_call_frequency: { raw_score: 35, weight: 0.3, weighted: 10.5 },
      fl_round_activity: { raw_score: 60, weight: 0.25, weighted: 15.0 },
      login_recency: { raw_score: 65, weight: 0.2, weighted: 13.0 },
      feature_breadth: { raw_score: 40, weight: 0.15, weighted: 6.0 },
      support_tickets: { raw_score: 95, weight: 0.1, weighted: 9.5 },
    },
  },
  {
    org_id: 5,
    org_name: 'DataSecure UK',
    tier: 'starter',
    score: 47,
    risk_level: 'at_risk',
    last_active: '8 days ago',
    dau: 1,
    mau: 4,
    top_recommendation: {
      action: 'send_reengagement_email',
      title: 'Send re-engagement email',
      priority: 'high',
    },
    breakdown: {
      api_call_frequency: { raw_score: 28, weight: 0.3, weighted: 8.4 },
      fl_round_activity: { raw_score: 42, weight: 0.25, weighted: 10.5 },
      login_recency: { raw_score: 55, weight: 0.2, weighted: 11.0 },
      feature_breadth: { raw_score: 50, weight: 0.15, weighted: 7.5 },
      support_tickets: { raw_score: 96, weight: 0.1, weighted: 9.6 },
    },
  },
  {
    org_id: 6,
    org_name: 'NovaPharma',
    tier: 'professional',
    score: 41,
    risk_level: 'at_risk',
    last_active: '12 days ago',
    dau: 0,
    mau: 3,
    top_recommendation: {
      action: 'schedule_executive_review',
      title: 'Schedule executive business review',
      priority: 'high',
    },
    breakdown: {
      api_call_frequency: { raw_score: 20, weight: 0.3, weighted: 6.0 },
      fl_round_activity: { raw_score: 30, weight: 0.25, weighted: 7.5 },
      login_recency: { raw_score: 45, weight: 0.2, weighted: 9.0 },
      feature_breadth: { raw_score: 65, weight: 0.15, weighted: 9.75 },
      support_tickets: { raw_score: 88, weight: 0.1, weighted: 8.8 },
    },
  },
  {
    org_id: 7,
    org_name: 'CryptoLedger',
    tier: 'starter',
    score: 28,
    risk_level: 'churning',
    last_active: '22 days ago',
    dau: 0,
    mau: 1,
    top_recommendation: {
      action: 'escalate_to_csm',
      title: 'Escalate to Customer Success Manager',
      priority: 'critical',
    },
    breakdown: {
      api_call_frequency: { raw_score: 8, weight: 0.3, weighted: 2.4 },
      fl_round_activity: { raw_score: 12, weight: 0.25, weighted: 3.0 },
      login_recency: { raw_score: 25, weight: 0.2, weighted: 5.0 },
      feature_breadth: { raw_score: 30, weight: 0.15, weighted: 4.5 },
      support_tickets: { raw_score: 20, weight: 0.1, weighted: 2.0 },
    },
  },
  {
    org_id: 8,
    org_name: 'BioAnalytics',
    tier: 'starter',
    score: 15,
    risk_level: 'churning',
    last_active: '29 days ago',
    dau: 0,
    mau: 0,
    top_recommendation: {
      action: 'escalate_to_csm',
      title: 'Escalate to Customer Success Manager',
      priority: 'critical',
    },
    breakdown: {
      api_call_frequency: { raw_score: 2, weight: 0.3, weighted: 0.6 },
      fl_round_activity: { raw_score: 0, weight: 0.25, weighted: 0.0 },
      login_recency: { raw_score: 5, weight: 0.2, weighted: 1.0 },
      feature_breadth: { raw_score: 10, weight: 0.15, weighted: 1.5 },
      support_tickets: { raw_score: 40, weight: 0.1, weighted: 4.0 },
    },
  },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BreakdownFactor {
  raw_score: number
  weight: number
  weighted: number
}

interface OrgHealth {
  org_id: number
  org_name: string
  tier: string
  score: number
  risk_level: 'healthy' | 'at_risk' | 'churning'
  last_active: string
  dau: number
  mau: number
  top_recommendation: {
    action: string
    title: string
    priority: string
  } | null
  breakdown: {
    api_call_frequency: BreakdownFactor
    fl_round_activity: BreakdownFactor
    login_recency: BreakdownFactor
    feature_breadth: BreakdownFactor
    support_tickets: BreakdownFactor
  }
}

type SortField = 'score' | 'org_name' | 'tier' | 'last_active'
type RiskFilter = 'all' | 'healthy' | 'at_risk' | 'churning'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RISK_CONFIG = {
  healthy: { label: 'Healthy', color: '#22C55E', bg: 'rgba(34,197,94,0.10)' },
  at_risk: { label: 'At Risk', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
  churning: { label: 'Churning', color: '#EF4444', bg: 'rgba(239,68,68,0.10)' },
}

const TIER_BADGE: Record<string, { label: string; color: string }> = {
  starter: { label: 'Starter', color: '#71717A' },
  professional: { label: 'Professional', color: '#0EA5E9' },
  enterprise: { label: 'Enterprise', color: '#A855F7' },
}

function scoreBarColor(score: number): string {
  if (score >= 70) return '#22C55E'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}

function actionIcon(action: string) {
  switch (action) {
    case 'schedule_onboarding_call':
    case 'schedule_executive_review':
      return Phone
    case 'send_reengagement_email':
    case 'send_fl_tutorial':
    case 'send_feature_digest':
      return Mail
    case 'escalate_to_csm':
      return AlertTriangle
    case 'offer_tier_upgrade':
      return ArrowUpRight
    default:
      return BookOpen
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function CustomerHealthPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all')
  const [sortField, setSortField] = useState<SortField>('score')
  const [sortAsc, setSortAsc] = useState(false)
  const [expandedOrg, setExpandedOrg] = useState<number | null>(null)

  // Derived counts
  const healthyCount = MOCK_ORG_HEALTH.filter((o) => o.risk_level === 'healthy').length
  const atRiskCount = MOCK_ORG_HEALTH.filter((o) => o.risk_level === 'at_risk').length
  const churningCount = MOCK_ORG_HEALTH.filter((o) => o.risk_level === 'churning').length

  // Filter & sort
  const filteredOrgs = useMemo(() => {
    let result = [...MOCK_ORG_HEALTH]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (o) =>
          o.org_name.toLowerCase().includes(q) ||
          o.tier.toLowerCase().includes(q)
      )
    }

    if (riskFilter !== 'all') {
      result = result.filter((o) => o.risk_level === riskFilter)
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'score':
          cmp = a.score - b.score
          break
        case 'org_name':
          cmp = a.org_name.localeCompare(b.org_name)
          break
        case 'tier': {
          const tierOrder: Record<string, number> = { starter: 0, professional: 1, enterprise: 2 }
          cmp = (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0)
          break
        }
        case 'last_active':
          cmp = a.score - b.score // proxy — real impl would use timestamp
          break
      }
      return sortAsc ? cmp : -cmp
    })

    return result
  }, [searchQuery, riskFilter, sortField, sortAsc])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown className="h-3.5 w-3.5 text-[#52525B]" />
    return sortAsc ? (
      <ChevronUp className="h-3.5 w-3.5 text-[#0EA5E9]" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-[#0EA5E9]" />
    )
  }

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#09090B]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-[#71717A] hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <div className="h-5 w-px bg-white/[0.08]" />
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-[#0EA5E9]" />
              <span className="text-lg font-bold text-white">Customer Health</span>
            </div>
          </div>
          <span className="text-xs text-[#52525B]">Task 5.3 -- Health Monitoring</span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <OverviewCard
            title="Total Organizations"
            value={MOCK_ORG_HEALTH.length}
            icon={Users}
            color="#0EA5E9"
            subtitle="Active accounts"
          />
          <OverviewCard
            title="Healthy"
            value={healthyCount}
            icon={Heart}
            color="#22C55E"
            subtitle={`${Math.round((healthyCount / MOCK_ORG_HEALTH.length) * 100)}% of total`}
          />
          <OverviewCard
            title="At Risk"
            value={atRiskCount}
            icon={AlertTriangle}
            color="#F59E0B"
            subtitle="Needs attention"
          />
          <OverviewCard
            title="Churning"
            value={churningCount}
            icon={TrendingDown}
            color="#EF4444"
            subtitle="Immediate action required"
          />
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52525B]" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#52525B] outline-none focus:border-[#0EA5E9]/50 transition-colors"
            />
          </div>

          {/* Risk Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#52525B]" />
            {(['all', 'healthy', 'at_risk', 'churning'] as RiskFilter[]).map((level) => (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${riskFilter === level
                    ? level === 'all'
                      ? 'bg-[#0EA5E9]/15 text-[#0EA5E9]'
                      : `text-[${RISK_CONFIG[level]?.color}]`
                    : 'text-[#52525B] hover:text-[#A1A1AA]'
                  }`}
                style={
                  riskFilter === level && level !== 'all'
                    ? {
                      backgroundColor: RISK_CONFIG[level].bg,
                      color: RISK_CONFIG[level].color,
                    }
                    : undefined
                }
              >
                {level === 'all'
                  ? 'All'
                  : level === 'at_risk'
                    ? 'At Risk'
                    : level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0F0F12]"
        >
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 border-b border-white/[0.06] px-6 py-3">
            <button
              className="col-span-3 flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A] hover:text-[#A1A1AA]"
              onClick={() => handleSort('org_name')}
            >
              Organization <SortIcon field="org_name" />
            </button>
            <button
              className="col-span-1 flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A] hover:text-[#A1A1AA]"
              onClick={() => handleSort('tier')}
            >
              Tier <SortIcon field="tier" />
            </button>
            <button
              className="col-span-3 flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A] hover:text-[#A1A1AA]"
              onClick={() => handleSort('score')}
            >
              Health Score <SortIcon field="score" />
            </button>
            <div className="col-span-1 text-xs font-semibold uppercase tracking-wider text-[#71717A]">
              Risk
            </div>
            <div className="col-span-1 text-xs font-semibold uppercase tracking-wider text-[#71717A]">
              Last Active
            </div>
            <div className="col-span-3 text-xs font-semibold uppercase tracking-wider text-[#71717A]">
              Recommended Action
            </div>
          </div>

          {/* Table body */}
          <div className="divide-y divide-white/[0.04]">
            <AnimatePresence mode="popLayout">
              {filteredOrgs.map((org) => (
                <motion.div
                  key={org.org_id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Row */}
                  <button
                    className="grid w-full grid-cols-12 gap-4 px-6 py-4 text-left transition-colors hover:bg-white/[0.02]"
                    onClick={() =>
                      setExpandedOrg(expandedOrg === org.org_id ? null : org.org_id)
                    }
                  >
                    {/* Name */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                        style={{
                          backgroundColor: `${scoreBarColor(org.score)}15`,
                          color: scoreBarColor(org.score),
                        }}
                      >
                        {org.org_name.charAt(0)}
                      </div>
                      <span className="truncate text-sm font-medium text-white">
                        {org.org_name}
                      </span>
                    </div>

                    {/* Tier */}
                    <div className="col-span-1 flex items-center">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          color: TIER_BADGE[org.tier]?.color ?? '#71717A',
                          backgroundColor: `${TIER_BADGE[org.tier]?.color ?? '#71717A'}15`,
                        }}
                      >
                        {TIER_BADGE[org.tier]?.label ?? org.tier}
                      </span>
                    </div>

                    {/* Health Score bar */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: scoreBarColor(org.score) }}
                            initial={{ width: 0 }}
                            animate={{ width: `${org.score}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                      <span
                        className="w-8 text-right text-sm font-bold"
                        style={{ color: scoreBarColor(org.score) }}
                      >
                        {org.score}
                      </span>
                    </div>

                    {/* Risk badge */}
                    <div className="col-span-1 flex items-center">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          color: RISK_CONFIG[org.risk_level].color,
                          backgroundColor: RISK_CONFIG[org.risk_level].bg,
                        }}
                      >
                        {RISK_CONFIG[org.risk_level].label}
                      </span>
                    </div>

                    {/* Last active */}
                    <div className="col-span-1 flex items-center">
                      <span className="text-xs text-[#71717A]">{org.last_active}</span>
                    </div>

                    {/* Recommended action */}
                    <div className="col-span-3 flex items-center gap-2">
                      {org.top_recommendation ? (
                        <>
                          {(() => {
                            const Icon = actionIcon(org.top_recommendation.action)
                            return (
                              <Icon
                                className="h-3.5 w-3.5 shrink-0"
                                style={{
                                  color:
                                    org.top_recommendation.priority === 'critical'
                                      ? '#EF4444'
                                      : org.top_recommendation.priority === 'high'
                                        ? '#F59E0B'
                                        : '#0EA5E9',
                                }}
                              />
                            )
                          })()}
                          <span className="truncate text-xs text-[#A1A1AA]">
                            {org.top_recommendation.title}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-[#3F3F46]">No action needed</span>
                      )}
                    </div>
                  </button>

                  {/* Expanded detail panel */}
                  <AnimatePresence>
                    {expandedOrg === org.org_id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-white/[0.04] bg-white/[0.01]"
                      >
                        <div className="grid gap-6 px-6 py-5 lg:grid-cols-2">
                          {/* Breakdown */}
                          <div>
                            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#71717A]">
                              Score Breakdown
                            </h4>
                            <div className="space-y-3">
                              {Object.entries(org.breakdown).map(([key, factor]) => (
                                <BreakdownRow
                                  key={key}
                                  label={formatFactorLabel(key)}
                                  rawScore={factor.raw_score}
                                  weight={factor.weight}
                                  weighted={factor.weighted}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Quick stats */}
                          <div>
                            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#71717A]">
                              Engagement Snapshot
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <MiniStat label="DAU" value={org.dau.toString()} icon={Activity} />
                              <MiniStat label="MAU" value={org.mau.toString()} icon={Users} />
                              <MiniStat
                                label="DAU/MAU"
                                value={
                                  org.mau > 0
                                    ? `${((org.dau / org.mau) * 100).toFixed(0)}%`
                                    : '0%'
                                }
                                icon={BarChart3}
                              />
                              <MiniStat
                                label="Features Used"
                                value={`${Math.round(org.breakdown.feature_breadth.raw_score / 20)}/5`}
                                icon={Zap}
                              />
                            </div>

                            {org.top_recommendation && (
                              <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                                <p className="text-xs font-semibold text-[#A1A1AA]">
                                  Next Action
                                </p>
                                <p className="mt-1 text-sm text-white">
                                  {org.top_recommendation.title}
                                </p>
                                <span
                                  className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                                  style={{
                                    color:
                                      org.top_recommendation.priority === 'critical'
                                        ? '#EF4444'
                                        : org.top_recommendation.priority === 'high'
                                          ? '#F59E0B'
                                          : '#0EA5E9',
                                    backgroundColor:
                                      org.top_recommendation.priority === 'critical'
                                        ? 'rgba(239,68,68,0.10)'
                                        : org.top_recommendation.priority === 'high'
                                          ? 'rgba(245,158,11,0.10)'
                                          : 'rgba(14,165,233,0.10)',
                                  }}
                                >
                                  {org.top_recommendation.priority} priority
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredOrgs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-8 w-8 text-[#3F3F46]" />
                <p className="mt-3 text-sm text-[#52525B]">No organizations match your filters.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OverviewCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string
  value: number
  icon: React.ElementType
  color: string
  subtitle: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#A1A1AA]">{title}</span>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color }} />
        </div>
      </div>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-[#52525B]">{subtitle}</p>
    </div>
  )
}

function BreakdownRow({
  label,
  rawScore,
  weight,
  weighted,
}: {
  label: string
  rawScore: number
  weight: number
  weighted: number
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-xs text-[#A1A1AA]">{label}</span>
      <div className="flex-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${rawScore}%`,
              backgroundColor: scoreBarColor(rawScore),
            }}
          />
        </div>
      </div>
      <span className="w-8 text-right text-xs font-medium text-[#A1A1AA]">
        {rawScore}
      </span>
      <span className="w-14 text-right text-[10px] text-[#52525B]">
        x{weight} = {weighted.toFixed(1)}
      </span>
    </div>
  )
}

function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ElementType
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[#52525B]" />
        <span className="text-[10px] uppercase tracking-wider text-[#52525B]">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  )
}

function formatFactorLabel(key: string): string {
  const map: Record<string, string> = {
    api_call_frequency: 'API Calls',
    fl_round_activity: 'FL Rounds',
    login_recency: 'Login Recency',
    feature_breadth: 'Feature Breadth',
    support_tickets: 'Support Tickets',
  }
  return map[key] ?? key
}
