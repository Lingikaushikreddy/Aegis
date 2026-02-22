'use client'

import { motion } from 'framer-motion'
import { Shield, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const REGULATIONS = [
  { name: 'UK GDPR', desc: 'Data Protection Act 2018 — full compliance' },
  { name: 'NHS DSPT', desc: 'All 10 NDG standards met, Caldicott aligned' },
  { name: 'ICO', desc: 'Information Commissioner registration support' },
  { name: 'FCA', desc: 'Financial Conduct Authority data requirements' },
]

const USE_CASES = [
  { title: 'NHS Healthcare', desc: 'Train diagnostic AI across NHS Trusts without centralizing patient data. DSPT compliant with Caldicott Principles.' },
  { title: 'Fintech / Banking', desc: 'FCA-compliant federated learning for credit scoring and fraud detection across financial institutions.' },
  { title: 'Public Sector', desc: 'Privacy-preserving analytics for government departments with UK GDPR and ICO compliance built in.' },
  { title: 'Pharmaceuticals', desc: 'Multi-site clinical trial analytics with differential privacy. MHRA data handling compliance.' },
]

export default function UKMarketPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#22C55E]/[0.04] blur-[120px]" />

      <nav className="relative z-10 border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Aegis" width={32} height={32} />
            <span className="text-lg font-bold text-white">AEGIS</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/markets/dubai" className="text-sm text-[#A1A1AA] hover:text-white">Dubai</Link>
            <Link href="/markets/usa" className="text-sm text-[#A1A1AA] hover:text-white">USA</Link>
            <Link href="/markets/uk" className="text-sm font-medium text-[#22C55E]">UK</Link>
            <Link href="/markets/india" className="text-sm text-[#A1A1AA] hover:text-white">India</Link>
            <Link href="/contact" className="rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4ADE80]">
              Schedule Briefing
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-[#22C55E]">United Kingdom</span>
            <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
              NHS DSPT + UK GDPR Compliant AI
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[#A1A1AA]">
              Privacy-preserving AI built for UK healthcare, fintech, and public sector.
              All 10 NDG standards met, ICO registration support included.
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
            <h2 className="text-center text-2xl font-bold text-white">UK Use Cases</h2>
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
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-lg bg-[#22C55E] px-8 py-3 text-sm font-semibold text-white hover:bg-[#4ADE80]">
              Schedule a London Briefing <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-xs text-[#71717A]">London team specializing in NHS and fintech deployments</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
