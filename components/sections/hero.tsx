'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { MagneticButton } from '@/components/ui/magnetic-button'
import { SplineScene } from '@/components/ui/splite'
import { Typewriter } from '@/components/ui/typewriter'
import ShaderAnimation from '@/components/ui/spiral-shader'

const complianceBadges = [
  'SOC 2 Type II',
  'GDPR',
  'HIPAA',
  'UAE PDPL',
  'DPDPA 2023',
]

export function HeroSection() {
  const { scrollY } = useScroll()
  const backgroundY = useTransform(scrollY, [0, 1000], [0, 300])
  const textY = useTransform(scrollY, [0, 1000], [0, 150])
  const opacity = useTransform(scrollY, [0, 800], [1, 0])

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#09090B] pt-16">
      {/* 3D WebGL Spline Background */}
      <ShaderAnimation />
      <motion.div style={{ y: backgroundY, opacity }} className="absolute inset-0 z-0 flex items-center justify-center opacity-60">
        <SplineScene
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="w-full h-full object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#09090B]/40 via-transparent to-[#09090B] pointer-events-none" />

      {/* Radial glow */}
      <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-[#0EA5E9]/[0.07] blur-[120px]" />
      <div className="absolute right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-[#8B5CF6]/[0.05] blur-[100px]" />

      {/* Content */}
      <motion.div style={{ y: textY }} className="relative z-10 mx-auto flex min-h-[calc(100vh-64px)] max-w-5xl flex-col items-center justify-center px-6 text-center">
        {/* Compliance badges */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex flex-wrap items-center justify-center gap-2"
        >
          {complianceBadges.map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-[#A1A1AA]"
            >
              <ShieldCheck className="h-3 w-3 text-[#22C55E]" />
              {badge}
            </span>
          ))}
        </motion.div>

        {/* Kinetic Headline */}
        <div className="overflow-hidden py-2">
          <motion.h1
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.2, 0.65, 0.3, 0.9] }}
            className="gradient-text max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.5rem]"
          >
            Privacy-Preserving AI{' '}
            <br className="hidden sm:block" />
            Infrastructure for the{' '}
            <span className="gradient-text-accent inline-block">Enterprise</span>
          </motion.h1>
        </div>

        {/* Typewriter tagline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-5 min-h-[2rem] flex items-center justify-center"
        >
          <Typewriter
            words={[
              'Encrypt patient records across 12 hospitals',
              'Train fraud detection without sharing data',
              'Deploy compliance-ready AI in 5 minutes',
              'Process 2.4GB/s with Rust-native crypto',
            ]}
            className="text-[#0EA5E9] text-lg sm:text-xl font-mono"
          />
        </motion.div>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-2xl text-base leading-relaxed text-[#A1A1AA] sm:text-lg"
        >
          Train AI models across sovereign regions with end-to-end AES-256 encryption,
          federated learning, and zero-trust architecture. Your data never leaves
          the device. From Dubai to Delaware.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row z-10 relative"
        >
          <MagneticButton>
            <a
              href="/signup"
              className="glow-sm flex items-center gap-2 rounded-xl bg-[#0EA5E9] px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#38BDF8] hover:shadow-[0_0_40px_-8px_rgba(14,165,233,0.4)] hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </a>
          </MagneticButton>
          <MagneticButton intensity={0.1}>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-7 py-3.5 text-sm font-semibold text-[#A1A1AA] transition-all hover:border-white/20 hover:text-white hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
            >
              View Architecture
            </a>
          </MagneticButton>
        </motion.div>

        {/* Trust metric pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-6 text-xs text-[#71717A] sm:gap-10 relative z-10"
        >
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
            <span>AES-256-GCM Encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9]" />
            <span>Rust-Native Crypto Core</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
            <span>Federated Learning with DP-SGD</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
            <span>iOS + Android + Desktop</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#09090B] via-[#09090B]/80 to-transparent pointer-events-none z-10" />
    </section>
  )
}
