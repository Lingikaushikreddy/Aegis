'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Handshake,
  Globe,
  Award,
  Users,
  ArrowRight,
  Building2,
  Star,
  MapPin,
  ChevronDown,
  Shield,
  Zap,
  BookOpen,
  HeadphonesIcon,
  PenTool,
  Briefcase,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

// ---------------------------------------------------------------------------
// Partner Program — Sprint 5, Task 5.10
// @sales-eng — System integrator partnerships for each market
// ---------------------------------------------------------------------------

type Market = 'all' | 'uae' | 'us' | 'uk' | 'india'
type PartnerType = 'all' | 'system_integrator' | 'technology_partner' | 'reseller' | 'consulting'
type Tier = 'silver' | 'gold' | 'platinum'

interface Partner {
  id: string
  name: string
  tier: Tier
  type: PartnerType
  markets: Market[]
  specializations: string[]
  description: string
  certifications: string[]
}

const MARKET_LABELS: Record<string, string> = {
  all: 'All Markets',
  uae: 'Dubai & UAE',
  us: 'United States',
  uk: 'United Kingdom',
  india: 'India',
}

const TYPE_LABELS: Record<string, string> = {
  all: 'All Types',
  system_integrator: 'System Integrator',
  technology_partner: 'Technology Partner',
  reseller: 'Reseller',
  consulting: 'Consulting',
}

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string; border: string }> = {
  silver: {
    label: 'Silver',
    color: '#94A3B8',
    bg: 'rgba(148, 163, 184, 0.08)',
    border: 'rgba(148, 163, 184, 0.20)',
  },
  gold: {
    label: 'Gold',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.20)',
  },
  platinum: {
    label: 'Platinum',
    color: '#A78BFA',
    bg: 'rgba(167, 139, 250, 0.08)',
    border: 'rgba(167, 139, 250, 0.20)',
  },
}

const TIER_BENEFITS: {
  tier: Tier
  title: string
  revenueShare: string
  features: string[]
}[] = [
  {
    tier: 'silver',
    title: 'Silver Partner',
    revenueShare: '10%',
    features: [
      '10% revenue share on referred deals',
      'Partner portal access with deal tracking',
      'Co-marketing materials and brand kit',
      'Quarterly partner newsletter',
    ],
  },
  {
    tier: 'gold',
    title: 'Gold Partner',
    revenueShare: '15%',
    features: [
      '15% revenue share on referred deals',
      'Priority technical support (4hr SLA)',
      'Joint case studies and PR opportunities',
      'Aegis certification training for your team',
      'Listed in preferred partner directory',
    ],
  },
  {
    tier: 'platinum',
    title: 'Platinum Partner',
    revenueShare: '20%',
    features: [
      '20% revenue share on referred deals',
      'Dedicated partner success manager',
      'Custom integration development support',
      'Executive briefings and roadmap access',
      'Co-selling with Aegis field team',
      'Priority listing in partner directory',
    ],
  },
]

const SAMPLE_PARTNERS: Partner[] = [
  // UAE partners
  {
    id: 'p-1',
    name: 'Gulf Digital Systems',
    tier: 'platinum',
    type: 'system_integrator',
    markets: ['uae'],
    specializations: ['Smart City', 'Government', 'Finance'],
    description:
      'Leading systems integrator across the GCC with deep expertise in smart city deployments and government digital transformation.',
    certifications: ['Aegis SI Certified', 'Dubai AI Seal Ready'],
  },
  {
    id: 'p-2',
    name: 'Nakheel Technologies',
    tier: 'gold',
    type: 'consulting',
    markets: ['uae'],
    specializations: ['Healthcare', 'Finance', 'Government'],
    description:
      'Privacy-first consulting firm specializing in UAE PDPL compliance and DIFC data protection frameworks.',
    certifications: ['Aegis Consulting Partner'],
  },
  // US partners
  {
    id: 'p-3',
    name: 'Apex Federal Solutions',
    tier: 'platinum',
    type: 'system_integrator',
    markets: ['us'],
    specializations: ['Defense', 'HIPAA Healthcare', 'Enterprise AI'],
    description:
      'FedRAMP-authorized integrator delivering privacy-preserving AI solutions for federal agencies and healthcare systems.',
    certifications: ['Aegis SI Certified', 'FedRAMP Authorized'],
  },
  {
    id: 'p-4',
    name: 'FinShield Partners',
    tier: 'gold',
    type: 'technology_partner',
    markets: ['us'],
    specializations: ['Fintech', 'Enterprise AI'],
    description:
      'Fintech infrastructure company embedding Aegis federated learning into anti-fraud and credit risk platforms.',
    certifications: ['Aegis Tech Partner Certified'],
  },
  // UK partners
  {
    id: 'p-5',
    name: 'Meridian Health Informatics',
    tier: 'platinum',
    type: 'system_integrator',
    markets: ['uk'],
    specializations: ['NHS Healthcare', 'Government', 'Legal'],
    description:
      'NHS Digital-approved integrator with 15+ trust deployments of privacy-preserving clinical AI.',
    certifications: ['Aegis SI Certified', 'NHS DSPT Compliant'],
  },
  {
    id: 'p-6',
    name: 'Canary Wharf Data Co.',
    tier: 'silver',
    type: 'reseller',
    markets: ['uk'],
    specializations: ['Banking', 'Legal'],
    description:
      'Authorized Aegis reseller focused on Tier-1 banks and magic-circle law firms requiring on-premise deployments.',
    certifications: ['Aegis Authorized Reseller'],
  },
  // India partners
  {
    id: 'p-7',
    name: 'Vajra Infosystems',
    tier: 'gold',
    type: 'system_integrator',
    markets: ['india'],
    specializations: ['Banking (RBI)', 'Telecom', 'Government'],
    description:
      'Enterprise SI with RBI data localization expertise, serving top-10 Indian banks and telecom operators.',
    certifications: ['Aegis SI Certified', 'RBI Compliant'],
  },
  {
    id: 'p-8',
    name: 'Kalpana AI Consulting',
    tier: 'silver',
    type: 'consulting',
    markets: ['india'],
    specializations: ['E-commerce', 'Government', 'Telecom'],
    description:
      'Boutique AI consultancy helping Indian enterprises adopt privacy-preserving machine learning under DPDPA 2023.',
    certifications: ['Aegis Consulting Partner'],
  },
]

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function TierBadge({ tier }: { tier: Tier }) {
  const config = TIER_CONFIG[tier]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
      }}
    >
      <Star className="h-3 w-3" style={{ fill: config.color, color: config.color }} />
      {config.label}
    </span>
  )
}

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-6 transition-all hover:border-white/[0.12] hover:bg-[#111115]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04]">
            <Building2 className="h-5 w-5 text-[#0EA5E9]" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{partner.name}</h3>
            <p className="text-xs text-[#71717A]">{TYPE_LABELS[partner.type]}</p>
          </div>
        </div>
        <TierBadge tier={partner.tier} />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-[#A1A1AA]">{partner.description}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {partner.specializations.map((spec) => (
          <span
            key={spec}
            className="rounded-full border border-white/[0.06] px-2.5 py-0.5 text-[11px] text-[#A1A1AA]"
          >
            {spec}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        {partner.markets.map((m) => (
          <span key={m} className="flex items-center gap-1 text-xs text-[#71717A]">
            <MapPin className="h-3 w-3" />
            {MARKET_LABELS[m]}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {partner.certifications.map((cert) => (
          <span
            key={cert}
            className="flex items-center gap-1 rounded-md bg-[#0EA5E9]/[0.06] px-2 py-0.5 text-[11px] font-medium text-[#0EA5E9]"
          >
            <Award className="h-3 w-3" />
            {cert}
          </span>
        ))}
      </div>

      <div className="mt-5 border-t border-white/[0.04] pt-4">
        <button className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]">
          Contact Partner
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PartnersPage() {
  const [selectedMarket, setSelectedMarket] = useState<Market>('all')
  const [selectedType, setSelectedType] = useState<PartnerType>('all')

  const filteredPartners = SAMPLE_PARTNERS.filter((p) => {
    if (selectedMarket !== 'all' && !p.markets.includes(selectedMarket)) return false
    if (selectedType !== 'all' && p.type !== selectedType) return false
    return true
  })

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#0EA5E9]/[0.03] blur-[140px]" />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Aegis" width={32} height={32} />
            <span className="text-lg font-bold text-white">AEGIS</span>
            <span className="rounded-full bg-[#0EA5E9]/10 px-2.5 py-0.5 text-xs font-medium text-[#0EA5E9]">
              Partners
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/contact" className="text-sm text-[#A1A1AA] hover:text-white transition-colors">
              Contact
            </Link>
            <Link href="/login" className="text-sm font-medium text-[#A1A1AA] hover:text-white transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0EA5E9]/10">
            <Handshake className="h-7 w-7 text-[#0EA5E9]" />
          </div>
          <span className="text-sm font-semibold uppercase tracking-widest text-[#0EA5E9]">
            Global Partner Network
          </span>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Aegis Partner Ecosystem
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-[#A1A1AA]">
            Join the world&apos;s leading system integrators, technology providers, resellers, and
            consulting firms delivering privacy-preserving AI across Dubai, USA, UK, and India.
            Together we bring compliant federated learning to every market.
          </p>

          {/* Stats row */}
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: '50+', label: 'Partners', icon: Users },
              { value: '4', label: 'Global Markets', icon: Globe },
              { value: '$12M+', label: 'Partner Revenue', icon: Briefcase },
              { value: '98%', label: 'Satisfaction', icon: Award },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/[0.06] bg-[#0F0F12] p-4"
              >
                <stat.icon className="mx-auto h-5 w-5 text-[#0EA5E9]" />
                <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-[#71717A]">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Partner Directory */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-white">Certified Partner Directory</h2>
          <p className="mt-2 text-sm text-[#A1A1AA]">
            Find an Aegis-certified partner in your market to accelerate your deployment.
          </p>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-3">
            {/* Market filter */}
            <div className="relative">
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value as Market)}
                className="appearance-none rounded-lg border border-white/[0.08] bg-[#0F0F12] py-2 pl-4 pr-10 text-sm text-white outline-none focus:border-[#0EA5E9]/50"
              >
                {Object.entries(MARKET_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
            </div>

            {/* Type filter */}
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as PartnerType)}
                className="appearance-none rounded-lg border border-white/[0.08] bg-[#0F0F12] py-2 pl-4 pr-10 text-sm text-white outline-none focus:border-[#0EA5E9]/50"
              >
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]" />
            </div>

            <span className="flex items-center text-xs text-[#71717A]">
              {filteredPartners.length} partner{filteredPartners.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {/* Partner Grid */}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPartners.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>

          {filteredPartners.length === 0 && (
            <div className="mt-12 rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-12 text-center">
              <Globe className="mx-auto h-10 w-10 text-[#71717A]" />
              <p className="mt-4 text-sm text-[#A1A1AA]">
                No partners match the selected filters. Try adjusting your criteria.
              </p>
            </div>
          )}
        </motion.div>
      </section>

      {/* Tier Benefits Section */}
      <section className="relative z-10 border-t border-white/[0.06] bg-[#0A0A0D]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <span className="text-sm font-semibold uppercase tracking-widest text-[#0EA5E9]">
                Partner Tiers
              </span>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                Grow With Aegis
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-[#A1A1AA]">
                Our tiered partner program rewards commitment with increasing revenue share,
                support, and co-selling opportunities.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {TIER_BENEFITS.map((tb) => {
                const config = TIER_CONFIG[tb.tier]
                return (
                  <div
                    key={tb.tier}
                    className="relative rounded-2xl border bg-[#0F0F12] p-7"
                    style={{ borderColor: config.border }}
                  >
                    {tb.tier === 'platinum' && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#A78BFA] px-3 py-0.5 text-xs font-bold text-white">
                        Most Popular
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: config.bg }}
                      >
                        <Star className="h-5 w-5" style={{ color: config.color, fill: config.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{tb.title}</h3>
                        <p className="text-xs" style={{ color: config.color }}>
                          {tb.revenueShare} revenue share
                        </p>
                      </div>
                    </div>

                    <ul className="mt-6 space-y-3">
                      {tb.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Award
                            className="mt-0.5 h-4 w-4 flex-shrink-0"
                            style={{ color: config.color }}
                          />
                          <span className="text-sm text-[#A1A1AA]">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Become a Partner CTA */}
      <section className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="overflow-hidden rounded-3xl border border-[#0EA5E9]/20 bg-gradient-to-br from-[#0EA5E9]/[0.06] to-transparent p-10 sm:p-14">
              <div className="grid items-center gap-10 lg:grid-cols-2">
                <div>
                  <span className="text-sm font-semibold uppercase tracking-widest text-[#0EA5E9]">
                    Join the Ecosystem
                  </span>
                  <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                    Become an Aegis Partner
                  </h2>
                  <p className="mt-4 text-[#A1A1AA]">
                    Whether you are a system integrator, technology provider, reseller, or consulting
                    firm, the Aegis Partner Program gives you everything you need to deliver
                    privacy-preserving AI to your clients.
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    {[
                      {
                        icon: Zap,
                        title: 'Revenue Opportunity',
                        desc: 'Earn up to 20% revenue share on every deal',
                      },
                      {
                        icon: BookOpen,
                        title: 'Training & Certification',
                        desc: 'Full technical enablement for your team',
                      },
                      {
                        icon: HeadphonesIcon,
                        title: 'Dedicated Support',
                        desc: 'Priority access to Aegis engineering',
                      },
                      {
                        icon: PenTool,
                        title: 'Co-Marketing',
                        desc: 'Joint case studies, events, and campaigns',
                      },
                    ].map((benefit) => (
                      <div key={benefit.title} className="flex items-start gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#0EA5E9]/10">
                          <benefit.icon className="h-4 w-4 text-[#0EA5E9]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{benefit.title}</h4>
                          <p className="mt-0.5 text-xs text-[#71717A]">{benefit.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-8">
                  <h3 className="text-lg font-semibold text-white">Apply to Partner Program</h3>
                  <p className="mt-1 text-sm text-[#71717A]">
                    Our partnerships team will review your application within 2 business days.
                  </p>

                  <form
                    onSubmit={(e) => e.preventDefault()}
                    className="mt-6 space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-[#A1A1AA]">Company name</label>
                      <input
                        required
                        className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50"
                        placeholder="Acme Corp"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#A1A1AA]">Work email</label>
                      <input
                        type="email"
                        required
                        className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50"
                        placeholder="you@company.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#A1A1AA]">
                        Partnership type
                      </label>
                      <select
                        required
                        className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50"
                      >
                        <option value="">Select type</option>
                        <option value="system_integrator">System Integrator</option>
                        <option value="technology_partner">Technology Partner</option>
                        <option value="reseller">Reseller</option>
                        <option value="consulting">Consulting</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#A1A1AA]">
                        Primary market
                      </label>
                      <select
                        required
                        className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50"
                      >
                        <option value="">Select market</option>
                        <option value="uae">Dubai & UAE</option>
                        <option value="us">United States</option>
                        <option value="uk">United Kingdom</option>
                        <option value="india">India</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0EA5E9] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#38BDF8]"
                    >
                      Apply Now
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          <p className="text-xs text-[#71717A]">
            &copy; {new Date().getFullYear()} Aegis AI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/" className="text-xs text-[#71717A] hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/compliance" className="text-xs text-[#71717A] hover:text-white transition-colors">
              Compliance
            </Link>
            <Link href="/contact" className="text-xs text-[#71717A] hover:text-white transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
