'use client'

import { motion } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'

const tiers = [
  {
    name: 'Starter',
    description: 'For teams exploring private AI infrastructure',
    price: '$499',
    period: '/month',
    cta: 'Start Free Trial',
    ctaStyle: 'secondary' as const,
    features: [
      'Up to 5 FL clients',
      'AES-256-GCM encryption',
      'Basic consent management',
      '3 sovereign regions',
      'Community support',
      'SOC 2 compliance docs',
    ],
  },
  {
    name: 'Professional',
    description: 'For growing AI operations with compliance needs',
    price: '$2,499',
    period: '/month',
    cta: 'Start Free Trial',
    ctaStyle: 'primary' as const,
    popular: true,
    features: [
      'Up to 50 FL clients',
      'End-to-end encryption + DP-SGD',
      'Full compliance engine (GDPR, HIPAA)',
      '8 sovereign regions',
      'Priority support + SLA',
      'Admin dashboard',
      'Prometheus metrics + alerting',
      'Audit log export',
    ],
  },
  {
    name: 'Enterprise',
    description: 'For regulated industries and sovereign deployments',
    price: 'Custom',
    period: '',
    cta: 'Contact Sales',
    ctaStyle: 'secondary' as const,
    features: [
      'Unlimited FL clients',
      'Full encryption + SecAgg + TEE',
      'All compliance (GDPR, HIPAA, UAE PDPL, DPDPA)',
      '14+ sovereign regions',
      'Dedicated CSM + 24/7 support',
      'Custom admin dashboard',
      'mTLS + certificate management',
      'On-premise / air-gapped deployment',
      'Custom training pipelines',
      'SOC 2 + ISO 27001 audit support',
    ],
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="relative bg-[#09090B] py-24 sm:py-32">
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { border-color: rgba(14, 165, 233, 0.3); box-shadow: 0 0 15px rgba(14, 165, 233, 0.1); }
          50% { border-color: rgba(14, 165, 233, 0.6); box-shadow: 0 0 25px rgba(14, 165, 233, 0.2); }
        }
      `}</style>
      <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-semibold uppercase tracking-widest text-[#0EA5E9]">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Infrastructure that scales{' '}
            <br className="hidden sm:block" />
            with your privacy requirements
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#A1A1AA]">
            From pilot to production. Available in USD, AED, GBP, EUR, and INR.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative flex flex-col rounded-2xl border p-6 sm:p-8 ${
                tier.popular
                  ? 'border-[#0EA5E9]/30 bg-[#0F0F12] glow-sm animate-[glow-pulse_3s_ease-in-out_infinite]'
                  : 'border-white/[0.06] bg-[#0F0F12]'
              }`}
              style={tier.popular ? {
                animation: 'glow-pulse 3s ease-in-out infinite',
              } : undefined}
            >
              <motion.div
                className="flex flex-1 flex-col"
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
              {/* Popular badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-[#0EA5E9] px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Tier info */}
              <div>
                <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                <p className="mt-1 text-sm text-[#A1A1AA]">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="mt-6">
                <span className="text-4xl font-bold text-white">{tier.price}</span>
                <span className="text-sm text-[#71717A]">{tier.period}</span>
              </div>

              {/* CTA */}
              <a
                href={tier.name === 'Enterprise' ? '/contact' : '/signup'}
                className={`mt-6 flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                  tier.ctaStyle === 'primary'
                    ? 'bg-[#0EA5E9] text-white hover:bg-[#38BDF8]'
                    : 'border border-white/10 text-[#A1A1AA] hover:border-white/20 hover:text-white'
                }`}
              >
                {tier.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </a>

              {/* Features */}
              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#0EA5E9]" />
                    <span className="text-sm text-[#A1A1AA]">{feature}</span>
                  </li>
                ))}
              </ul>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Enterprise note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 text-center text-sm text-[#71717A]"
        >
          All plans include a 14-day free trial. Enterprise plans available with
          purchase orders, custom SLAs, and on-premise deployment.
          <br />
          Government pricing programs available for UAE, UK, US, and India agencies.
        </motion.div>
      </div>
    </section>
  )
}
