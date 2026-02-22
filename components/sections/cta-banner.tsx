'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Shield, Lock, Zap, Globe, CheckCircle } from 'lucide-react'
import { FluidGradient } from '@/components/ui/fluid-gradient'
import { MagneticButton } from '@/components/ui/magnetic-button'

const trustBadges = [
  { label: 'SOC 2 Type II', icon: CheckCircle },
  { label: 'HIPAA Compliant', icon: Lock },
  { label: 'GDPR Ready', icon: Shield },
  { label: 'UAE PDPL Certified', icon: Globe },
]

export function CtaBanner() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="relative bg-[#09090B] py-24 sm:py-32">
      <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="mx-auto max-w-7xl px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl"
        >
          {/* Animated border glow */}
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-[#0EA5E9]/40 via-[#8B5CF6]/40 to-[#0EA5E9]/40 opacity-60" />
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-[#0EA5E9]/20 via-[#8B5CF6]/20 to-[#0EA5E9]/20 blur-sm" />

          {/* Inner card */}
          <div className="relative rounded-3xl bg-[#0F0F12] px-8 py-20 text-center sm:px-16 sm:py-24">
            {/* Fluid Action Background */}
            <FluidGradient />

            {/* Top ambient glow orbs */}
            <div className="pointer-events-none absolute left-1/4 top-0 h-[300px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0EA5E9]/[0.07] blur-[120px]" />
            <div className="pointer-events-none absolute right-1/4 top-0 h-[300px] w-[400px] translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6]/[0.07] blur-[120px]" />
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-[200px] w-[600px] -translate-x-1/2 translate-y-1/2 rounded-full bg-[#0EA5E9]/[0.05] blur-[100px]" />

            {/* Floating decorative grid dots */}
            <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.03]" style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }} />

            <div className="relative z-10">
              {/* Animated shield icon with pulse ring */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mx-auto mb-8 flex h-16 w-16 items-center justify-center"
              >
                {/* Outer pulse ring */}
                <div className="absolute h-16 w-16 animate-ping rounded-2xl bg-gradient-to-br from-[#0EA5E9]/20 to-[#8B5CF6]/20" style={{ animationDuration: '3s' }} />
                {/* Middle glow ring */}
                <div className="absolute h-16 w-16 rounded-2xl bg-gradient-to-br from-[#0EA5E9]/10 to-[#8B5CF6]/10 blur-md" />
                {/* Icon container */}
                <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#8B5CF6] shadow-[0_0_40px_rgba(14,165,233,0.4),0_0_80px_rgba(139,92,246,0.2)]">
                  <Shield className="h-7 w-7 text-white" />
                </div>
              </motion.div>

              {/* Headline with gradient */}
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
              >
                Ready to deploy{' '}
                <span className="bg-gradient-to-r from-[#0EA5E9] via-[#38BDF8] to-[#8B5CF6] bg-clip-text text-transparent">
                  privacy-preserving AI
                </span>
                ?
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#A1A1AA] sm:text-lg"
              >
                Schedule a 30-minute technical briefing with our engineering team. See
                Aegis running live with federated learning, differential privacy, and
                end-to-end encryption.
              </motion.p>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row relative z-20"
              >
                <MagneticButton>
                  <a
                    href="/contact"
                    className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] px-8 py-4 text-sm font-semibold text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(14,165,233,0.5)] hover:scale-[1.02]"
                  >
                    {/* Shimmer effect on hover */}
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    <Zap className="relative h-4 w-4" />
                    <span className="relative">Schedule a Briefing</span>
                    <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </MagneticButton>
                <MagneticButton intensity={0.1}>
                  <a
                    href="/demo"
                    className="group flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-8 py-4 text-sm font-semibold text-[#A1A1AA] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.2] hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                  >
                    Try Interactive Demo
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </MagneticButton>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="mt-12"
              >
                <div className="mx-auto flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                  {trustBadges.map((badge) => (
                    <div
                      key={badge.label}
                      className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 text-xs text-[#71717A] transition-colors hover:border-white/[0.12] hover:text-[#A1A1AA]"
                    >
                      <badge.icon className="h-3 w-3" />
                      {badge.label}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-[#3F3F46]">
                  Trusted by healthcare, finance, and government organizations across 4 continents
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
