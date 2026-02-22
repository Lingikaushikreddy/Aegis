'use client'

import { motion } from 'framer-motion'
import { AnimatedCounter } from '@/components/ui/animated-counter'

const metrics = [
  {
    value: 'AES-256',
    label: 'Military-Grade Encryption',
    sublabel: 'GCM authenticated',
  },
  {
    value: '4',
    suffix: ' Platforms',
    label: 'From One Codebase',
    sublabel: 'iOS, Android, Desktop, Server',
  },
  {
    value: '< 3ms',
    label: 'DP-SGD Overhead',
    sublabel: 'Per model update',
  },
  {
    value: 'Zero',
    label: 'Raw Data Exposure',
    sublabel: 'Data never leaves device',
  },
]

export function MetricsSection() {
  return (
    <section className="relative bg-[#09090B] py-20">
      <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 gap-8 lg:grid-cols-4"
        >
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="gradient-text-accent text-3xl font-bold sm:text-4xl transition-all duration-300 hover:drop-shadow-[0_0_12px_rgba(14,165,233,0.4)] hover:scale-105">
                <AnimatedCounter
                  value={metric.value}
                  suffix={metric.suffix}
                  duration={2}
                />
              </div>
              <div className="mt-2 text-sm font-medium text-white">{metric.label}</div>
              <div className="mt-0.5 text-xs text-[#71717A]">{metric.sublabel}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
