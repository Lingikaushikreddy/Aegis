'use client'

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'
import { RevealText } from '@/components/ui/reveal-text'

/* ------------------------------------------------------------------ */
/*  Logo Cloud Data                                                    */
/* ------------------------------------------------------------------ */

const logos = [
  'DHA Health',
  'Emirates NBD',
  'Mayo Clinic',
  'JPMorgan Chase',
  'NHS Digital',
  'Barclays',
  'Reliance Jio',
  'HDFC Bank',
]

/* ------------------------------------------------------------------ */
/*  Testimonial Data                                                   */
/* ------------------------------------------------------------------ */

interface Testimonial {
  quote: string
  name: string
  title: string
  company: string
  market: string
  initials: string
  avatarColor: string
}

const testimonials: Testimonial[] = [
  {
    quote:
      'Aegis reduced our HIPAA compliance audit from 6 months to 3 weeks. The federated learning pipeline let us train across 12 hospital sites without moving a single patient record.',
    name: 'Dr. Sarah Chen',
    title: 'Chief Medical Information Officer',
    company: 'Pacific Health Network',
    market: 'United States',
    initials: 'SC',
    avatarColor: '#0EA5E9',
  },
  {
    quote:
      'We evaluated Opaque Systems, NVIDIA FLARE, and Aegis. Only Aegis gave us encryption, compliance, and federated learning in one platform \u2014 and it was half the price.',
    name: 'Ahmed Al-Rashidi',
    title: 'VP of Data & AI',
    company: 'Emirates Financial Group',
    market: 'Dubai, UAE',
    initials: 'AR',
    avatarColor: '#22C55E',
  },
  {
    quote:
      'The Rust-native crypto core processes 2.4GB/s on our production servers. After switching from Python-based encryption, our API latency dropped 94%.',
    name: 'Priya Sharma',
    title: 'Principal Engineer',
    company: 'Vajra Cloud Services',
    market: 'Mumbai, India',
    initials: 'PS',
    avatarColor: '#8B5CF6',
  },
]

/* ------------------------------------------------------------------ */
/*  Animation Variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const },
  },
}

/* ------------------------------------------------------------------ */
/*  Star Rating Component                                              */
/* ------------------------------------------------------------------ */

function StarRating() {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]"
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Testimonial Card Component                                         */
/* ------------------------------------------------------------------ */

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="group relative h-full rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-6 transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_0_40px_-12px_rgba(14,165,233,0.15)]">
      {/* Subtle inner gradient */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent" />

      {/* Large decorative quote mark */}
      <Quote
        className="absolute right-5 top-5 h-10 w-10 text-white/[0.04] transition-colors duration-300 group-hover:text-white/[0.08]"
        strokeWidth={1}
      />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col">
        {/* Stars */}
        <StarRating />

        {/* Quote */}
        <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-white/90">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>

        {/* Divider */}
        <div className="my-5 h-px w-full bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-transparent" />

        {/* Author */}
        <div className="flex items-center gap-3">
          {/* Avatar circle with initials */}
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: `${testimonial.avatarColor}25`, color: testimonial.avatarColor }}
          >
            {testimonial.initials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{testimonial.name}</p>
            <p className="truncate text-xs text-[#A1A1AA]">
              {testimonial.title}, {testimonial.company}
            </p>
          </div>

          {/* Market pill */}
          <span className="flex-shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium text-[#A1A1AA]">
            {testimonial.market}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Section Export                                                 */
/* ------------------------------------------------------------------ */

export function SocialProofSection() {
  return (
    <section id="social-proof" className="relative bg-[#09090B] py-24 sm:py-32">
      {/* Top divider line */}
      <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* ============================================= */}
      {/* PART 1 — Logo Cloud                           */}
      {/* ============================================= */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-7xl px-6"
      >
        <p className="text-center text-sm font-medium uppercase tracking-widest text-[#A1A1AA]">
          Trusted by innovative teams worldwide
        </p>
      </motion.div>

      {/* Scrolling logo strip */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative mt-8 overflow-hidden"
      >
        {/* Left fade */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#09090B] to-transparent sm:w-40" />
        {/* Right fade */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#09090B] to-transparent sm:w-40" />

        {/* The scrolling track — duplicated for seamless loop */}
        <div className="flex w-max animate-logo-scroll">
          {[...logos, ...logos].map((name, i) => (
            <div
              key={`${name}-${i}`}
              className="flex h-16 flex-shrink-0 items-center px-8 sm:px-12"
            >
              <span className="whitespace-nowrap text-lg font-bold tracking-tight text-white opacity-40 transition-opacity duration-300 hover:opacity-100 sm:text-xl">
                {name}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ============================================= */}
      {/* PART 2 — Testimonial Cards                    */}
      {/* ============================================= */}
      <div className="mx-auto mt-20 max-w-7xl px-6 sm:mt-24">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-semibold uppercase tracking-widest text-[#0EA5E9]">
            Testimonials
          </span>
          <RevealText
            text="Real results from real teams"
            className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl justify-center"
          />
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#A1A1AA]">
            From healthcare to finance, engineering teams around the globe trust Aegis
            to protect their most sensitive data while accelerating AI innovation.
          </p>
        </motion.div>

        {/* Card grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {testimonials.map((t) => (
            <motion.div key={t.name} variants={cardVariants}>
              <TestimonialCard testimonial={t} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
