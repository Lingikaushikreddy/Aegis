'use client'

import { motion } from 'framer-motion'

interface SectionDividerProps {
  variant?: 'gradient' | 'dots' | 'wave'
  className?: string
}

function GradientDivider() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute h-1.5 w-1.5 rounded-full bg-[#0EA5E9] shadow-[0_0_8px_rgba(14,165,233,0.6)]" />
    </div>
  )
}

function DotsDivider() {
  return (
    <div className="flex items-center justify-center gap-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: 'easeInOut',
          }}
          className="h-1 w-1 rounded-full bg-white/30"
        />
      ))}
    </div>
  )
}

function WaveDivider() {
  return (
    <div className="flex items-center justify-center overflow-hidden">
      <svg
        width="320"
        height="12"
        viewBox="0 0 320 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="wave-gradient" x1="0" y1="0" x2="320" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="transparent" />
            <stop offset="0.3" stopColor="#0EA5E9" stopOpacity="0.4" />
            <stop offset="0.5" stopColor="#0EA5E9" stopOpacity="0.6" />
            <stop offset="0.7" stopColor="#0EA5E9" stopOpacity="0.4" />
            <stop offset="1" stopColor="transparent" />
          </linearGradient>
        </defs>
        <motion.path
          d="M0 6 Q20 0 40 6 Q60 12 80 6 Q100 0 120 6 Q140 12 160 6 Q180 0 200 6 Q220 12 240 6 Q260 0 280 6 Q300 12 320 6"
          stroke="url(#wave-gradient)"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="8 4"
          animate={{ strokeDashoffset: [0, -24] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </svg>
    </div>
  )
}

export function SectionDivider({ variant = 'gradient', className = '' }: SectionDividerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6 }}
      className={`mx-auto max-w-7xl py-4 ${className}`}
    >
      {variant === 'gradient' && <GradientDivider />}
      {variant === 'dots' && <DotsDivider />}
      {variant === 'wave' && <WaveDivider />}
    </motion.div>
  )
}
