'use client'

import { motion } from 'framer-motion'
import { Lock, Cpu, BarChart3, ArrowRight } from 'lucide-react'
import { StickyScroll } from '@/components/ui/sticky-scroll'
import { CpuArchitecture } from '@/components/ui/cpu-architecture'

const steps = [
  {
    number: '01',
    icon: Lock,
    title: 'Encrypt & Store',
    description:
      'Data is encrypted on-device using AES-256-GCM via the Rust crypto core. Files are stored with UUID-based physical names in a streaming vault — no raw data is ever exposed.',
    color: '#22C55E',
    code: `// Rust-native encryption
let vault = Vault::new(path, key)?;
let uuid = vault.store_file(
  "patient_records.csv"
)?;
// File stored as: a3f7b2...enc
// Original name encrypted in header`,
  },
  {
    number: '02',
    icon: Cpu,
    title: 'Train Locally',
    description:
      'AI models train on-device using PyTorch. Data never leaves the user\'s control. Differential Privacy (DP-SGD) adds calibrated Gaussian noise to every gradient update.',
    color: '#0EA5E9',
    code: `# Federated training with DP
client = AegisClient(model, data)
update = client.fit(global_weights)

# Rust DP engine: clip + noise
privatized = engine.privatize_update(
  update, sigma=1.0, clip=1.0
)`,
  },
  {
    number: '03',
    icon: BarChart3,
    title: 'Aggregate Securely',
    description:
      'Only privatized model updates reach the server. Flower-based FL coordinator validates, aggregates via FedAvg, and distributes the improved global model. No individual data is reconstructable.',
    color: '#8B5CF6',
    code: `# Server sees ONLY aggregated updates
strategy = AegisPrivacyStrategy(
  privacy_level="high",
  min_clients=3
)
# NaN/Inf filtering + checkpointing
# Individual data: mathematically
# unrecoverable`,
  },
]

export function HowItWorksSection() {
  const content = steps.map((step, index) => ({
    title: step.title,
    description: step.description,
    content: (
      <div className="relative w-full overflow-hidden rounded-xl border border-white/[0.06] bg-[#09090B] p-5 h-full flex flex-col justify-center">
        {index === 2 ? (
          <div className="w-full flex items-center justify-center">
            <CpuArchitecture width="80%" height="auto" text="FED AVG" />
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#EF4444]/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#22C55E]/60" />
            </div>
            <pre className="overflow-x-auto font-mono text-sm leading-relaxed text-[#0EA5E9]">
              <code>{step.code}</code>
            </pre>
          </>
        )}
      </div>
    ),
  }))

  return (
    <section id="how-it-works" className="relative bg-[#09090B] py-24 sm:py-32">
      {/* Subtle divider */}
      <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-semibold uppercase tracking-widest text-[#8B5CF6]">
            How It Works
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            From raw data to AI model{' '}
            <br className="hidden sm:block" />
            — without a single data leak
          </h2>
        </motion.div>

        {/* Sticky Scroll Implementation */}
        <div className="mt-10 hidden lg:block">
          <StickyScroll content={content} />
        </div>

        {/* Mobile Fallback: Standard Stack */}
        <div className="mt-16 space-y-8 lg:hidden">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="grid gap-6 rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-6"
            >
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold"
                    style={{
                      backgroundColor: `${step.color}15`,
                      color: step.color,
                    }}
                  >
                    {step.number}
                  </span>
                  <step.icon className="h-5 w-5" style={{ color: step.color }} />
                </div>
                <h3 className="mt-4 text-2xl font-bold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#A1A1AA]">
                  {step.description}
                </p>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#09090B] p-5">
                <div className="mb-3 flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#EF4444]/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#22C55E]/60" />
                </div>
                <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-[#0EA5E9]">
                  <code>{step.code}</code>
                </pre>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
