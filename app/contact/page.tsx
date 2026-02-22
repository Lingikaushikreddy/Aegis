'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Building2, Globe, Phone } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#0EA5E9]/[0.04] blur-[120px]" />

      {/* Header */}
      <nav className="relative z-10 border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Aegis" width={32} height={32} />
            <span className="text-lg font-bold text-white">AEGIS</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-[#A1A1AA] hover:text-white">
            Sign In
          </Link>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-[#0EA5E9]">Enterprise</span>
            <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
              Schedule a Technical Briefing
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[#A1A1AA]">
              See Aegis running live with federated learning, differential privacy, and end-to-end encryption.
              Our engineering team will tailor the demo to your compliance requirements.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-5">
            {/* Left: Info */}
            <div className="space-y-8 lg:col-span-2">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#0EA5E9]/10">
                  <Building2 className="h-5 w-5 text-[#0EA5E9]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Custom Deployment</h3>
                  <p className="mt-1 text-sm text-[#A1A1AA]">On-premise, air-gapped, and sovereign cloud options across 14+ regions.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/10">
                  <Shield className="h-5 w-5 text-[#8B5CF6]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Compliance-First</h3>
                  <p className="mt-1 text-sm text-[#A1A1AA]">GDPR, HIPAA, UAE PDPL, India DPDPA, NHS DSPT — built-in, not bolted-on.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#22C55E]/10">
                  <Globe className="h-5 w-5 text-[#22C55E]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Global Coverage</h3>
                  <p className="mt-1 text-sm text-[#A1A1AA]">Teams in Dubai, New York, London, and Bangalore ready to support your deployment.</p>
                </div>
              </div>
            </div>

            {/* Right: Form */}
            <div className="lg:col-span-3">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center rounded-2xl border border-[#22C55E]/20 bg-[#22C55E]/5 p-12 text-center"
                >
                  <Shield className="h-12 w-12 text-[#22C55E]" />
                  <h3 className="mt-4 text-xl font-bold text-white">Request Received</h3>
                  <p className="mt-2 text-sm text-[#A1A1AA]">
                    Our enterprise team will contact you within 24 hours to schedule your technical briefing.
                  </p>
                </motion.div>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}
                  className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-8"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-[#A1A1AA]">First name</label>
                      <input required className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#A1A1AA]">Last name</label>
                      <input required className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA]">Work email</label>
                    <input type="email" required className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA]">Company</label>
                    <input required className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA]">Primary market</label>
                    <select required className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50">
                      <option value="">Select a market</option>
                      <option value="uae">Dubai & UAE</option>
                      <option value="us">United States</option>
                      <option value="uk">United Kingdom</option>
                      <option value="india">India</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA]">Use case</label>
                    <textarea rows={3} className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50" placeholder="Describe your privacy-preserving AI requirements..." />
                  </div>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0EA5E9] px-6 py-3 text-sm font-semibold text-white hover:bg-[#38BDF8]"
                  >
                    Request Briefing
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
