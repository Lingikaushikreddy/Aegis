'use client'

import { motion } from 'framer-motion'
import { Shield, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const REGULATIONS = [
  { name: 'DPDPA 2023', desc: 'Digital Personal Data Protection Act — full Section 4 consent' },
  { name: 'RBI Circular', desc: 'Payment data localization — India-only storage' },
  { name: 'SEBI', desc: 'Securities board data protection requirements' },
  { name: 'Hindi/Regional', desc: 'Consent forms in Hindi, Tamil, Telugu, and 6 more' },
]

const USE_CASES = [
  { title: 'UPI Fraud Detection', desc: 'Federated learning across payment processors to detect fraud in 10B+ monthly transactions — without sharing user data.' },
  { title: 'Banking & NBFC', desc: 'RBI-compliant credit scoring with data localization. All processing stays within India (ap-south-1, Mumbai).' },
  { title: 'Healthcare / Ayushman Bharat', desc: 'Privacy-preserving diagnostics across government hospitals. Hindi consent forms, DPDPA Section 4 compliant.' },
  { title: 'Telecom Analytics', desc: 'Cross-carrier analytics for network optimization without sharing subscriber data. TRAI compliance built in.' },
]

export default function IndiaMarketPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#F59E0B]/[0.04] blur-[120px]" />

      <nav className="relative z-10 border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Aegis" width={32} height={32} />
            <span className="text-lg font-bold text-white">AEGIS</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/markets/dubai" className="text-sm text-[#A1A1AA] hover:text-white">Dubai</Link>
            <Link href="/markets/usa" className="text-sm text-[#A1A1AA] hover:text-white">USA</Link>
            <Link href="/markets/uk" className="text-sm text-[#A1A1AA] hover:text-white">UK</Link>
            <Link href="/markets/india" className="text-sm font-medium text-[#F59E0B]">India</Link>
            <Link href="/contact" className="rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#FBBF24]">
              Schedule Briefing
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-[#F59E0B]">India</span>
            <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
              DPDPA 2023 + RBI Compliant AI
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[#A1A1AA]">
              Built for India's data protection landscape. RBI data localization,
              DPDPA consent automation in Hindi and 8 regional languages.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {REGULATIONS.map((reg) => (
              <div key={reg.name} className="rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/5 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-[#22C55E]" />
                  <span className="font-semibold text-white">{reg.name}</span>
                </div>
                <p className="mt-1 text-xs text-[#A1A1AA]">{reg.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-16">
            <h2 className="text-center text-2xl font-bold text-white">India Use Cases</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {USE_CASES.map((uc) => (
                <div key={uc.title} className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-6">
                  <h3 className="font-semibold text-white">{uc.title}</h3>
                  <p className="mt-2 text-sm text-[#A1A1AA]">{uc.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-lg bg-[#F59E0B] px-8 py-3 text-sm font-semibold text-white hover:bg-[#FBBF24]">
              Schedule a Bangalore Briefing <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-xs text-[#71717A]">Bangalore team specializing in fintech and healthcare deployments</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
