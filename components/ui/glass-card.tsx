'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface GlassCardProps {
  children: ReactNode
  className?: string
  glowColor?: string
  hoverScale?: number
}

export function GlassCard({
  children,
  className = '',
  glowColor = '#0EA5E9',
  hoverScale = 1.02,
}: GlassCardProps) {
  // Parse the glow color to rgba for the shadow
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
      : '14,165,233'
  }

  const glowRgb = hexToRgb(glowColor)

  return (
    <motion.div
      className={`relative rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl ${className}`}
      whileHover={{
        scale: hoverScale,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.05)',
        boxShadow: `0 0 40px rgba(${glowRgb},0.08), 0 0 80px rgba(${glowRgb},0.04)`,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
        mass: 0.8,
      }}
      style={{
        boxShadow: `0 0 0px rgba(${glowRgb},0)`,
      }}
    >
      {children}
    </motion.div>
  )
}
