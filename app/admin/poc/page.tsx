'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Rocket,
  Clock,
  Users,
  ArrowUpRight,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  X,
  Search,
  ChevronDown,
  BarChart3,
  Globe,
  Mail,
  Shield,
  Eye,
  Calendar,
  Zap,
  TrendingUp,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Task 5.6 (@sales-eng) — POC Automation Dashboard
// 1-click POC deployment per prospect with auto-cleanup after 30 days
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type POCStatus = 'active' | 'expiring' | 'expired' | 'converted'

interface POC {
  poc_id: string
  prospect_name: string
  prospect_email: string
  market: string
  status: POCStatus
  days_remaining: number
  expiry_date: string
  created_at: string
  sales_engineer: string
  features_enabled: string[]
  usage_stats: {
    api_calls: number
    fl_rounds: number
    storage_gb: number
  }
  engagement_score: number
}

interface FormData {
  prospect_name: string
  prospect_email: string
  market: string
  features: string[]
  sales_engineer: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MARKETS = [
  { value: 'uae', label: 'Dubai & UAE', flag: '🇦🇪', compliance: 'PDPL + AI Seal' },
  { value: 'us', label: 'United States', flag: '🇺🇸', compliance: 'HIPAA + SOC 2' },
  { value: 'uk', label: 'United Kingdom', flag: '🇬🇧', compliance: 'NHS DSPT + UK GDPR' },
  { value: 'india', label: 'India', flag: '🇮🇳', compliance: 'DPDPA + RBI' },
]

const AVAILABLE_FEATURES = [
  { id: 'vault_encryption', label: 'Vault Encryption', description: 'AES-256-GCM at rest & in transit' },
  { id: 'federated_learning', label: 'Federated Learning', description: 'Privacy-preserving ML training' },
  { id: 'differential_privacy', label: 'Differential Privacy', description: 'Epsilon-bounded noise injection' },
  { id: 'compliance_reporting', label: 'Compliance Reporting', description: 'Automated audit reports' },
  { id: 'role_based_access', label: 'Role-Based Access', description: 'Granular RBAC controls' },
  { id: 'audit_logging', label: 'Audit Logging', description: 'Immutable activity logs' },
  { id: 'data_residency', label: 'Data Residency', description: 'Region-locked storage' },
  { id: 'key_rotation', label: 'Key Rotation', description: 'Automated key lifecycle' },
  { id: 'multi_party_compute', label: 'Multi-Party Compute', description: 'Secure MPC protocols' },
  { id: 'anonymization', label: 'Anonymization', description: 'PII detection & redaction' },
]

const SALES_ENGINEERS = [
  'sarah.chen@aegis.ai',
  'james.malik@aegis.ai',
  'priya.sharma@aegis.ai',
  'omar.hassan@aegis.ai',
  'emily.wright@aegis.ai',
]

// Mock data
const MOCK_POCS: POC[] = [
  {
    poc_id: 'poc-emirates-health-a3f7b2c1',
    prospect_name: 'Emirates Health Authority',
    prospect_email: 'cto@eha.gov.ae',
    market: 'uae',
    status: 'active',
    days_remaining: 22,
    expiry_date: '2026-03-15T00:00:00',
    created_at: '2026-02-13T10:30:00',
    sales_engineer: 'omar.hassan@aegis.ai',
    features_enabled: ['vault_encryption', 'federated_learning', 'compliance_reporting', 'data_residency'],
    usage_stats: { api_calls: 12_450, fl_rounds: 34, storage_gb: 3.2 },
    engagement_score: 72,
  },
  {
    poc_id: 'poc-mayo-clinic-b9c2e4d8',
    prospect_name: 'Mayo Clinic Research',
    prospect_email: 'privacy@mayo.edu',
    market: 'us',
    status: 'active',
    days_remaining: 18,
    expiry_date: '2026-03-11T00:00:00',
    created_at: '2026-02-09T14:00:00',
    sales_engineer: 'sarah.chen@aegis.ai',
    features_enabled: ['vault_encryption', 'federated_learning', 'differential_privacy', 'compliance_reporting', 'audit_logging'],
    usage_stats: { api_calls: 28_300, fl_rounds: 87, storage_gb: 8.7 },
    engagement_score: 91,
  },
  {
    poc_id: 'poc-nhs-digital-c1d3f5a2',
    prospect_name: 'NHS Digital',
    prospect_email: 'partnerships@nhsdigital.nhs.uk',
    market: 'uk',
    status: 'expiring',
    days_remaining: 4,
    expiry_date: '2026-02-25T00:00:00',
    created_at: '2026-01-26T09:15:00',
    sales_engineer: 'emily.wright@aegis.ai',
    features_enabled: ['vault_encryption', 'compliance_reporting', 'role_based_access', 'audit_logging'],
    usage_stats: { api_calls: 8_100, fl_rounds: 12, storage_gb: 1.4 },
    engagement_score: 38,
  },
  {
    poc_id: 'poc-hdfc-bank-d4e6a7b3',
    prospect_name: 'HDFC Bank',
    prospect_email: 'innovation@hdfc.com',
    market: 'india',
    status: 'active',
    days_remaining: 26,
    expiry_date: '2026-03-19T00:00:00',
    created_at: '2026-02-17T11:45:00',
    sales_engineer: 'priya.sharma@aegis.ai',
    features_enabled: ['vault_encryption', 'federated_learning', 'compliance_reporting', 'anonymization'],
    usage_stats: { api_calls: 5_600, fl_rounds: 15, storage_gb: 2.1 },
    engagement_score: 45,
  },
  {
    poc_id: 'poc-adnoc-group-e5f8b9c4',
    prospect_name: 'ADNOC Group',
    prospect_email: 'digital@adnoc.ae',
    market: 'uae',
    status: 'converted',
    days_remaining: 0,
    expiry_date: '2026-02-10T00:00:00',
    created_at: '2026-01-05T08:00:00',
    sales_engineer: 'omar.hassan@aegis.ai',
    features_enabled: ['vault_encryption', 'federated_learning', 'differential_privacy', 'compliance_reporting', 'data_residency', 'key_rotation'],
    usage_stats: { api_calls: 42_100, fl_rounds: 156, storage_gb: 14.3 },
    engagement_score: 95,
  },
  {
    poc_id: 'poc-cigna-health-f6a9c0d5',
    prospect_name: 'Cigna Healthcare',
    prospect_email: 'tech@cigna.com',
    market: 'us',
    status: 'expired',
    days_remaining: 0,
    expiry_date: '2026-02-05T00:00:00',
    created_at: '2026-01-06T16:30:00',
    sales_engineer: 'james.malik@aegis.ai',
    features_enabled: ['vault_encryption', 'compliance_reporting'],
    usage_stats: { api_calls: 1_200, fl_rounds: 2, storage_gb: 0.3 },
    engagement_score: 8,
  },
]

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function getStatusConfig(status: POCStatus) {
  switch (status) {
    case 'active':
      return { label: 'Active', bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]', dot: 'bg-[#22C55E]' }
    case 'expiring':
      return { label: 'Expiring Soon', bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', dot: 'bg-[#F59E0B]' }
    case 'expired':
      return { label: 'Expired', bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]', dot: 'bg-[#EF4444]' }
    case 'converted':
      return { label: 'Converted', bg: 'bg-[#0EA5E9]/10', text: 'text-[#0EA5E9]', dot: 'bg-[#0EA5E9]' }
  }
}

function getMarketLabel(market: string) {
  return MARKETS.find((m) => m.value === market)?.label || market
}

function getMarketFlag(market: string) {
  return MARKETS.find((m) => m.value === market)?.flag || ''
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function POCDashboardPage() {
  const [pocs, setPocs] = useState<POC[]>(MOCK_POCS)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState<POC | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<POCStatus | 'all'>('all')
  const [filterSE, setFilterSE] = useState<string>('all')

  // Filtered POCs
  const filteredPocs = useMemo(() => {
    return pocs.filter((poc) => {
      const matchSearch =
        poc.prospect_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poc.prospect_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poc.poc_id.toLowerCase().includes(searchQuery.toLowerCase())
      const matchStatus = filterStatus === 'all' || poc.status === filterStatus
      const matchSE = filterSE === 'all' || poc.sales_engineer === filterSE
      return matchSearch && matchStatus && matchSE
    })
  }, [pocs, searchQuery, filterStatus, filterSE])

  // Stats
  const stats = useMemo(() => {
    const active = pocs.filter((p) => p.status === 'active').length
    const expiring = pocs.filter((p) => p.status === 'expiring').length
    const converted = pocs.filter((p) => p.status === 'converted').length
    const total = pocs.length
    return { active, expiring, converted, total }
  }, [pocs])

  // Handlers
  const handleCreatePOC = (formData: FormData) => {
    const token = Math.random().toString(36).slice(2, 10)
    const slug = `poc-${formData.prospect_name.toLowerCase().replace(/\s+/g, '-').slice(0, 24)}-${token}`
    const newPoc: POC = {
      poc_id: slug,
      prospect_name: formData.prospect_name,
      prospect_email: formData.prospect_email,
      market: formData.market,
      status: 'active',
      days_remaining: 30,
      expiry_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
      sales_engineer: formData.sales_engineer,
      features_enabled: formData.features,
      usage_stats: { api_calls: 0, fl_rounds: 0, storage_gb: 0 },
      engagement_score: 0,
    }
    setPocs((prev) => [newPoc, ...prev])
    setShowCreateModal(false)
  }

  const handleExtend = (pocId: string) => {
    setPocs((prev) =>
      prev.map((p) =>
        p.poc_id === pocId
          ? {
              ...p,
              days_remaining: Math.min(p.days_remaining + 14, 60),
              status: p.days_remaining + 14 > 7 ? 'active' : p.status,
              expiry_date: new Date(
                new Date(p.expiry_date).getTime() + 14 * 86400000
              ).toISOString(),
            }
          : p
      )
    )
  }

  const handleConvert = (pocId: string) => {
    setPocs((prev) =>
      prev.map((p) =>
        p.poc_id === pocId
          ? { ...p, status: 'converted' as POCStatus, days_remaining: 0 }
          : p
      )
    )
  }

  const handleCleanup = () => {
    setPocs((prev) => prev.filter((p) => p.status !== 'expired'))
  }

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Background glow */}
      <div className="pointer-events-none fixed left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#0EA5E9]/[0.03] blur-[150px]" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] bg-[#09090B]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Aegis" width={32} height={32} />
              <span className="text-lg font-bold text-white">AEGIS</span>
            </Link>
            <span className="text-[#71717A]">/</span>
            <span className="text-sm font-medium text-[#A1A1AA]">Sales Engineering</span>
            <span className="text-[#71717A]">/</span>
            <span className="text-sm font-medium text-white">POC Manager</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCleanup}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-[#71717A] transition-colors hover:border-[#EF4444]/30 hover:text-[#EF4444]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Cleanup Expired
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#38BDF8]"
            >
              <Plus className="h-4 w-4" />
              Create New POC
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        {/* Overview Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active POCs"
            value={stats.active}
            icon={Rocket}
            color="#22C55E"
            subtitle="Currently running"
          />
          <StatCard
            title="Expiring Soon"
            value={stats.expiring}
            icon={Clock}
            color="#F59E0B"
            subtitle="< 7 days remaining"
          />
          <StatCard
            title="Converted"
            value={stats.converted}
            icon={CheckCircle}
            color="#0EA5E9"
            subtitle="To paid tenants"
          />
          <StatCard
            title="Total Prospects"
            value={stats.total}
            icon={Users}
            color="#8B5CF6"
            subtitle="All-time POCs"
          />
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
            <input
              type="text"
              placeholder="Search prospects, emails, or POC IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0F0F12] py-2 pl-10 pr-4 text-sm text-white outline-none placeholder:text-[#52525B] focus:border-[#0EA5E9]/40"
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as POCStatus | 'all')}
              className="appearance-none rounded-lg border border-white/[0.08] bg-[#0F0F12] py-2 pl-3 pr-8 text-sm text-[#A1A1AA] outline-none focus:border-[#0EA5E9]/40"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="converted">Converted</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
          </div>
          <div className="relative">
            <select
              value={filterSE}
              onChange={(e) => setFilterSE(e.target.value)}
              className="appearance-none rounded-lg border border-white/[0.08] bg-[#0F0F12] py-2 pl-3 pr-8 text-sm text-[#A1A1AA] outline-none focus:border-[#0EA5E9]/40"
            >
              <option value="all">All Engineers</option>
              {SALES_ENGINEERS.map((se) => (
                <option key={se} value={se}>
                  {se.split('@')[0].replace('.', ' ')}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
          </div>
        </div>

        {/* POC Table */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0F0F12]">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1fr] gap-4 border-b border-white/[0.06] px-6 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">Prospect</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">Market</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">Status</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">Time Left</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">Usage</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A] text-right">Actions</span>
          </div>

          {/* Table rows */}
          <AnimatePresence mode="popLayout">
            {filteredPocs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-6 py-16 text-center"
              >
                <Rocket className="mx-auto h-10 w-10 text-[#52525B]" />
                <p className="mt-3 text-sm text-[#71717A]">No POCs match your filters</p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setFilterStatus('all')
                    setFilterSE('all')
                  }}
                  className="mt-2 text-sm text-[#0EA5E9] hover:text-[#38BDF8]"
                >
                  Clear all filters
                </button>
              </motion.div>
            ) : (
              filteredPocs.map((poc, index) => (
                <POCRow
                  key={poc.poc_id}
                  poc={poc}
                  index={index}
                  onExtend={handleExtend}
                  onConvert={handleConvert}
                  onView={setShowDetailModal}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Create POC Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreatePOCModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreatePOC}
          />
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && (
          <POCDetailModal
            poc={showDetailModal}
            onClose={() => setShowDetailModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-5"
    >
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
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// POC Table Row
// ---------------------------------------------------------------------------

function POCRow({
  poc,
  index,
  onExtend,
  onConvert,
  onView,
}: {
  poc: POC
  index: number
  onExtend: (id: string) => void
  onConvert: (id: string) => void
  onView: (poc: POC) => void
}) {
  const statusConfig = getStatusConfig(poc.status)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.03 }}
      className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1fr] items-center gap-4 border-b border-white/[0.04] px-6 py-4 transition-colors hover:bg-white/[0.02]"
    >
      {/* Prospect */}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{poc.prospect_name}</p>
        <p className="truncate text-xs text-[#52525B]">{poc.prospect_email}</p>
      </div>

      {/* Market */}
      <div className="flex items-center gap-2">
        <Globe className="h-3.5 w-3.5 text-[#71717A]" />
        <span className="text-sm text-[#A1A1AA]">{getMarketLabel(poc.market)}</span>
      </div>

      {/* Status */}
      <div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
          {statusConfig.label}
        </span>
      </div>

      {/* Days Remaining */}
      <div>
        {poc.status === 'converted' ? (
          <span className="text-sm text-[#0EA5E9]">--</span>
        ) : poc.status === 'expired' ? (
          <span className="text-sm text-[#EF4444]">Expired</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#71717A]" />
            <span
              className={`text-sm font-medium ${
                poc.days_remaining <= 7 ? 'text-[#F59E0B]' : 'text-[#A1A1AA]'
              }`}
            >
              {poc.days_remaining}d
            </span>
          </div>
        )}
      </div>

      {/* Usage Summary */}
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#52525B]">API</span>
            <span className="text-[#A1A1AA]">{formatNumber(poc.usage_stats.api_calls)}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[#0EA5E9]"
              style={{ width: `${Math.min((poc.usage_stats.api_calls / 50000) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold ${
            poc.engagement_score >= 70
              ? 'bg-[#22C55E]/10 text-[#22C55E]'
              : poc.engagement_score >= 30
                ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                : 'bg-[#EF4444]/10 text-[#EF4444]'
          }`}
          title={`Engagement: ${poc.engagement_score}%`}
        >
          {poc.engagement_score}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => onView(poc)}
          className="rounded-md border border-white/[0.06] p-1.5 text-[#71717A] transition-colors hover:border-white/[0.12] hover:text-white"
          title="View Details"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        {(poc.status === 'active' || poc.status === 'expiring') && (
          <>
            <button
              onClick={() => onExtend(poc.poc_id)}
              className="rounded-md border border-white/[0.06] p-1.5 text-[#71717A] transition-colors hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
              title="Extend 14 days"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onConvert(poc.poc_id)}
              className="rounded-md border border-white/[0.06] p-1.5 text-[#71717A] transition-colors hover:border-[#0EA5E9]/30 hover:text-[#0EA5E9]"
              title="Convert to Paid"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Create POC Modal
// ---------------------------------------------------------------------------

function CreatePOCModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (data: FormData) => void
}) {
  const [formData, setFormData] = useState<FormData>({
    prospect_name: '',
    prospect_email: '',
    market: '',
    features: ['vault_encryption', 'federated_learning', 'compliance_reporting'],
    sales_engineer: '',
  })

  const toggleFeature = (featureId: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter((f) => f !== featureId)
        : [...prev.features, featureId],
    }))
  }

  const canSubmit =
    formData.prospect_name.trim() &&
    formData.prospect_email.trim() &&
    formData.market &&
    formData.features.length > 0 &&
    formData.sales_engineer

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0F0F12] shadow-2xl"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0EA5E9]/10">
              <Rocket className="h-4.5 w-4.5 text-[#0EA5E9]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Create New POC</h2>
              <p className="text-xs text-[#52525B]">1-click isolated environment for your prospect</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#71717A] transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal body */}
        <div className="space-y-5 px-6 py-5">
          {/* Prospect Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#A1A1AA]">
                Prospect Name
              </label>
              <input
                type="text"
                value={formData.prospect_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, prospect_name: e.target.value }))
                }
                placeholder="e.g. Emirates Health Authority"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none placeholder:text-[#52525B] focus:border-[#0EA5E9]/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#A1A1AA]">
                Prospect Email
              </label>
              <input
                type="email"
                value={formData.prospect_email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, prospect_email: e.target.value }))
                }
                placeholder="cto@company.com"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none placeholder:text-[#52525B] focus:border-[#0EA5E9]/50"
              />
            </div>
          </div>

          {/* Market Selection */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#A1A1AA]">
              Target Market
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MARKETS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setFormData((prev) => ({ ...prev, market: m.value }))}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    formData.market === m.value
                      ? 'border-[#0EA5E9]/40 bg-[#0EA5E9]/5'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                  }`}
                >
                  <span className="text-lg">{m.flag}</span>
                  <p
                    className={`mt-1 text-sm font-medium ${
                      formData.market === m.value ? 'text-[#0EA5E9]' : 'text-white'
                    }`}
                  >
                    {m.label}
                  </p>
                  <p className="text-[10px] text-[#52525B]">{m.compliance}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Feature Selection */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#A1A1AA]">
              Enable Features
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_FEATURES.map((feature) => {
                const isEnabled = formData.features.includes(feature.id)
                return (
                  <button
                    key={feature.id}
                    onClick={() => toggleFeature(feature.id)}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                      isEnabled
                        ? 'border-[#0EA5E9]/30 bg-[#0EA5E9]/5'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all ${
                        isEnabled
                          ? 'border-[#0EA5E9] bg-[#0EA5E9]'
                          : 'border-[#52525B]'
                      }`}
                    >
                      {isEnabled && <CheckCircle className="h-3 w-3 text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          isEnabled ? 'text-[#0EA5E9]' : 'text-[#A1A1AA]'
                        }`}
                      >
                        {feature.label}
                      </p>
                      <p className="text-[10px] text-[#52525B]">{feature.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Assign SE */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#A1A1AA]">
              Assign Sales Engineer
            </label>
            <div className="relative">
              <select
                value={formData.sales_engineer}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sales_engineer: e.target.value }))
                }
                className="w-full appearance-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50"
              >
                <option value="">Select an engineer</option>
                {SALES_ENGINEERS.map((se) => (
                  <option key={se} value={se}>
                    {se.split('@')[0].replace('.', ' ')} ({se})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
            </div>
          </div>

          {/* Summary */}
          {canSubmit && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-lg border border-[#0EA5E9]/20 bg-[#0EA5E9]/5 p-4"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-[#0EA5E9]">
                <Zap className="h-4 w-4" />
                POC Summary
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#A1A1AA]">
                <span>Environment: Isolated sandbox</span>
                <span>Duration: 30 days (extendable to 60)</span>
                <span>Tier: Professional (POC)</span>
                <span>Features: {formData.features.length} enabled</span>
                <span>API limit: 50,000 calls/month</span>
                <span>Demo data: Auto-seeded for {getMarketLabel(formData.market)}</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-[#A1A1AA] transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onCreate(formData)}
            disabled={!canSubmit}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
              canSubmit
                ? 'bg-[#0EA5E9] text-white hover:bg-[#38BDF8]'
                : 'cursor-not-allowed bg-[#0EA5E9]/20 text-[#0EA5E9]/40'
            }`}
          >
            <Rocket className="h-4 w-4" />
            Deploy POC
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// POC Detail Modal
// ---------------------------------------------------------------------------

function POCDetailModal({ poc, onClose }: { poc: POC; onClose: () => void }) {
  const statusConfig = getStatusConfig(poc.status)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="mx-4 max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0F0F12] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{poc.prospect_name}</h2>
            <p className="text-xs text-[#52525B]">{poc.poc_id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#71717A] hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Status + Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="text-xs text-[#52525B]">Status</span>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                  {statusConfig.label}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="text-xs text-[#52525B]">Market</span>
              <div className="mt-1 flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-[#71717A]" />
                <span className="text-sm text-white">{getMarketLabel(poc.market)}</span>
              </div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="text-xs text-[#52525B]">Contact</span>
              <div className="mt-1 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#71717A]" />
                <span className="text-sm text-[#A1A1AA]">{poc.prospect_email}</span>
              </div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="text-xs text-[#52525B]">Sales Engineer</span>
              <div className="mt-1 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-[#71717A]" />
                <span className="text-sm text-[#A1A1AA]">
                  {poc.sales_engineer.split('@')[0].replace('.', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Engagement Score */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#A1A1AA]" />
                <span className="text-sm font-medium text-white">Engagement Score</span>
              </div>
              <span
                className={`text-2xl font-bold ${
                  poc.engagement_score >= 70
                    ? 'text-[#22C55E]'
                    : poc.engagement_score >= 30
                      ? 'text-[#F59E0B]'
                      : 'text-[#EF4444]'
                }`}
              >
                {poc.engagement_score}
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full transition-all ${
                  poc.engagement_score >= 70
                    ? 'bg-[#22C55E]'
                    : poc.engagement_score >= 30
                      ? 'bg-[#F59E0B]'
                      : 'bg-[#EF4444]'
                }`}
                style={{ width: `${poc.engagement_score}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[#52525B]">
              {poc.engagement_score >= 70
                ? 'High engagement -- strong conversion candidate'
                : poc.engagement_score >= 30
                  ? 'Moderate engagement -- consider follow-up'
                  : 'Low engagement -- may need intervention'}
            </p>
          </div>

          {/* Usage Stats */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-[#A1A1AA]">Usage Statistics</h3>
            <div className="grid grid-cols-3 gap-3">
              <UsageMini label="API Calls" value={poc.usage_stats.api_calls} limit={50_000} color="#0EA5E9" />
              <UsageMini label="FL Rounds" value={poc.usage_stats.fl_rounds} limit={500} color="#8B5CF6" />
              <UsageMini label="Storage" value={poc.usage_stats.storage_gb} limit={25} unit="GB" color="#22C55E" />
            </div>
          </div>

          {/* Enabled Features */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-[#A1A1AA]">Enabled Features</h3>
            <div className="flex flex-wrap gap-1.5">
              {poc.features_enabled.map((f) => {
                const feature = AVAILABLE_FEATURES.find((af) => af.id === f)
                return (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs text-[#A1A1AA]"
                  >
                    <Shield className="h-3 w-3 text-[#0EA5E9]" />
                    {feature?.label || f}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Timeline */}
          <div className="flex items-center gap-4 text-xs text-[#52525B]">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Created: {new Date(poc.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Expires: {new Date(poc.expiry_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Usage Mini Card
// ---------------------------------------------------------------------------

function UsageMini({
  label,
  value,
  limit,
  unit,
  color,
}: {
  label: string
  value: number
  limit: number
  unit?: string
  color: string
}) {
  const pct = Math.min((value / limit) * 100, 100)
  const display = unit ? `${value} ${unit}` : formatNumber(value)

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <span className="text-[10px] uppercase tracking-wider text-[#52525B]">{label}</span>
      <p className="mt-1 text-lg font-bold text-white">{display}</p>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-1 text-[10px] text-[#52525B]">
        of {unit ? `${limit} ${unit}` : formatNumber(limit)}
      </p>
    </div>
  )
}
