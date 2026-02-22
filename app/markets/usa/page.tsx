'use client'

import { motion } from 'framer-motion'
import { Shield, Building2, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const REGULATIONS = [
  { name: 'HIPAA', desc: 'PHI detection, BAA templates, minimum necessary standard' },
  { name: 'SOC 2', desc: 'Type I assessment in progress, Type II roadmap' },
  { name: 'CCPA/CPRA', desc: 'California Consumer Privacy Act compliance' },
  { name: 'State Privacy', desc: '12+ state privacy laws (VA, CO, CT, UT, TX...)' },
]

const USE_CASES = [
  { title: 'Healthcare AI', desc: 'Train diagnostic models across hospital networks without centralizing HIPAA-protected PHI. DP-SGD guarantees.' },
  { title: 'Financial Services', desc: 'Federated fraud detection across banks — learn patterns without sharing customer transaction data.' },
  { title: 'Enterprise AI/ML', desc: 'SOC 2 certified platform for sensitive enterprise ML workloads with audit trails and access controls.' },
  { title: 'Government Agencies', desc: 'Privacy-preserving analytics across departments with FedRAMP-aligned security controls.' },
]

export default function USAMarketPage() {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#8B5CF6]/[0.04] blur-[120px]" />

      <nav className="relative z-10 border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Aegis" width={32} height={32} />
            <span className="text-lg font-bold text-white">AEGIS</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/markets/dubai" className="text-sm text-[#A1A1AA] hover:text-white">Dubai</Link>
            <Link href="/markets/usa" className="text-sm font-medium text-[#8B5CF6]">USA</Link>
            <Link href="/markets/uk" className="text-sm text-[#A1A1AA] hover:text-white">UK</Link>
            <Link href="/markets/india" className="text-sm text-[#A1A1AA] hover:text-white">India</Link>
            <Link href="/contact" className="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A78BFA]">
              Schedule Demo
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-[#8B5CF6]">United States</span>
            <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
              HIPAA + SOC 2 Compliant AI Platform
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[#A1A1AA]">
              Deploy privacy-preserving AI for healthcare, finance, and enterprise.
              HIPAA BAA ready, SOC 2 Type I in progress, 12+ state privacy laws supported.
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
            <h2 className="text-center text-2xl font-bold text-white">US Use Cases</h2>
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
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-8 py-3 text-sm font-semibold text-white hover:bg-[#A78BFA]">
              Schedule a US Demo <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-xs text-[#71717A]">New York team ready to support your deployment</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
