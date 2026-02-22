'use client'

import { motion } from 'framer-motion'
import { Building2, Landmark, Stethoscope, Globe } from 'lucide-react'
import { BeamCard } from '@/components/ui/beam-card'
import { RevealText } from '@/components/ui/reveal-text'

const markets = [
  {
    flag: '🇦🇪',
    region: 'Dubai & UAE',
    icon: Building2,
    color: '#22C55E',
    regulations: ['UAE PDPL', 'DIFC Data Protection Law', 'NESA Certification'],
    useCases: [
      'Smart Dubai cross-agency AI without data sharing',
      'DHA hospital network federated diagnostics',
      'DIFC cross-border financial risk models',
      'Islamic Finance Sharia-compliant analytics',
    ],
    highlight:
      'Data physically never leaves UAE — on-device compute guarantees sovereign data residency.',
  },
  {
    flag: '🇺🇸',
    region: 'United States',
    icon: Landmark,
    color: '#0EA5E9',
    regulations: ['HIPAA', 'SOC 2 Type II', 'CCPA/CPRA', 'CMMC 2.0'],
    useCases: [
      'Hospital network AI training (Kaiser, Mayo, VA)',
      'Cross-bank fraud detection without data sharing',
      'Defense contractor Zero Trust AI',
      'State privacy law consent automation (12+ states)',
    ],
    highlight:
      'HIPAA-compliant federated learning with SOC 2 certification and NIST 800-207 Zero Trust alignment.',
  },
  {
    flag: '🇬🇧',
    region: 'United Kingdom',
    icon: Stethoscope,
    color: '#8B5CF6',
    regulations: ['UK GDPR', 'Data Protection Act 2018', 'NHS DSPT'],
    useCases: [
      'NHS Trust AI diagnostics across 65M patient records',
      'FCA-regulated privacy-preserving fintech',
      'UK AI Safety Institute alignment (DP verification)',
      'Post-Brexit cross-border data compliance',
    ],
    highlight:
      'Directly addresses the NHS Palantir data controversy with a privacy-first federated alternative.',
  },
  {
    flag: '🇮🇳',
    region: 'India',
    icon: Globe,
    color: '#F59E0B',
    regulations: ['DPDPA 2023', 'RBI Data Localization', 'IT Act 2000'],
    useCases: [
      'Ayushman Bharat hospital network TB/diabetes AI',
      'UPI fraud detection across 10B+ monthly transactions',
      'Aadhaar-linked analytics without biometric exposure',
      'Android-first deployment for 500M+ devices',
    ],
    highlight:
      'DPDPA 2023 Section 4 consent automation with RBI data localization compliance built-in.',
  },
]

export function MarketsSection() {
  return (
    <section id="markets" className="relative bg-[#09090B] py-24 sm:py-32">
      <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-semibold uppercase tracking-widest text-[#F59E0B]">
            Global Markets
          </span>
          <RevealText
            text="Built for the world's most regulated industries"
            className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl justify-center"
          />
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#A1A1AA]">
            From Dubai to Delaware, London to Bangalore — Aegis meets the compliance
            requirements of every target market.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2">
          {markets.map((market, index) => (
            <motion.div
              key={market.region}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <BeamCard className="group h-full rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-6 transition-all hover:border-white/[0.12]">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{market.flag}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{market.region}</h3>
                  </div>
                </div>

                {/* Regulation badges */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {market.regulations.map((reg) => (
                    <span
                      key={reg}
                      className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-xs font-medium text-[#A1A1AA]"
                    >
                      {reg}
                    </span>
                  ))}
                </div>

                {/* Highlight */}
                <p
                  className="mt-4 rounded-lg border-l-2 py-1 pl-3 text-sm leading-relaxed"
                  style={{
                    borderColor: market.color,
                    color: market.color,
                  }}
                >
                  {market.highlight}
                </p>

                {/* Use cases */}
                <ul className="mt-4 space-y-2">
                  {market.useCases.map((uc) => (
                    <li key={uc} className="flex items-start gap-2 text-sm text-[#A1A1AA]">
                      <div
                        className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: market.color }}
                      />
                      {uc}
                    </li>
                  ))}
                </ul>
              </BeamCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
