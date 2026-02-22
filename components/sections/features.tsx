'use client'

import { motion } from 'framer-motion'
import {
  Lock,
  Network,
  ShieldCheck,
  KeyRound,
  Smartphone,
  FileCheck,
} from 'lucide-react'
import { BeamCard } from '@/components/ui/beam-card'
import { RevealText } from '@/components/ui/reveal-text'
import { TextShimmer } from '@/components/ui/text-shimmer'

const features = [
  {
    icon: Lock,
    title: 'AES-256-GCM Encryption',
    description:
      'Military-grade encryption powered by a pure-Rust crypto core. Every file encrypted at rest with streaming I/O — constant memory for multi-gigabyte datasets.',
    color: '#22C55E',
  },
  {
    icon: Network,
    title: 'Federated Learning',
    description:
      'Train AI models across distributed devices without centralizing data. Flower-based FL pipeline with crash-resilient checkpointing and secure aggregation.',
    color: '#0EA5E9',
  },
  {
    icon: ShieldCheck,
    title: 'Differential Privacy (DP-SGD)',
    description:
      'Mathematically proven privacy guarantees. Rust-native Gaussian mechanism with L2 norm clipping adds calibrated noise to every model update.',
    color: '#8B5CF6',
  },
  {
    icon: KeyRound,
    title: 'Consent Management',
    description:
      'GDPR Article 6 compliant consent engine with audit trails. Grant, revoke, and enforce data access policies with sub-second latency.',
    color: '#F59E0B',
  },
  {
    icon: Smartphone,
    title: 'Cross-Platform SDK',
    description:
      'Single Rust codebase, four platforms. UniFFI generates native Swift (iOS), Kotlin (Android), and Python bindings from one source of truth.',
    color: '#EC4899',
  },
  {
    icon: FileCheck,
    title: 'Compliance Engine',
    description:
      'Built-in GDPR, HIPAA, UAE PDPL, and India DPDPA mapping. Automated audit logging, data minimization, and crypto-shredding for Right to Erasure.',
    color: '#14B8A6',
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative bg-[#09090B] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <TextShimmer duration={3} className="text-sm font-semibold uppercase tracking-widest text-[#0EA5E9]">
            Core Capabilities
          </TextShimmer>
          <RevealText
            text="Security by architecture, not by promise"
            className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl justify-center"
          />
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#A1A1AA]">
            Every layer of Aegis is engineered for zero-trust privacy. From the Rust
            crypto core to the compliance engine, security is not a feature — it is the
            foundation.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
            >
              <BeamCard className="group h-full rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-6 transition-all hover:border-white/[0.12] hover:bg-[#14141A]">
                {/* Icon */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon
                    className="h-5 w-5"
                    style={{ color: feature.color }}
                  />
                </div>

                {/* Content */}
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
                  {feature.description}
                </p>
              </BeamCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
