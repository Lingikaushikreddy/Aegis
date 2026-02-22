'use client'

import { useEffect, useRef } from 'react'
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion'

interface AnimatedCounterProps {
  value: number | string
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

function NumericCounter({
  value,
  prefix,
  suffix,
  duration = 2,
  className,
}: {
  value: number
  prefix?: string
  suffix?: string
  duration: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, {
    duration: duration * 1000,
    bounce: 0,
  })
  const display = useTransform(springValue, (latest) =>
    formatNumber(Math.round(latest))
  )

  useEffect(() => {
    if (isInView) {
      motionValue.set(value)
    }
  }, [isInView, motionValue, value])

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}

function StringCounter({
  value,
  prefix,
  suffix,
  duration = 1.5,
  className,
}: {
  value: string
  prefix?: string
  suffix?: string
  duration: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  const characters = value.split('')
  const staggerDelay = duration / characters.length

  return (
    <span ref={ref} className={className}>
      {prefix}
      {characters.map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
          animate={
            isInView
              ? { opacity: 1, y: 0, filter: 'blur(0px)' }
              : { opacity: 0, y: 8, filter: 'blur(4px)' }
          }
          transition={{
            duration: 0.35,
            delay: i * staggerDelay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          {char}
        </motion.span>
      ))}
      {suffix}
    </span>
  )
}

export function AnimatedCounter({
  value,
  prefix,
  suffix,
  duration = 2,
  className,
}: AnimatedCounterProps) {
  const isNumeric =
    typeof value === 'number' ||
    (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim()))

  if (isNumeric) {
    const numericValue =
      typeof value === 'number' ? value : parseFloat(value as string)
    return (
      <NumericCounter
        value={numericValue}
        prefix={prefix}
        suffix={suffix}
        duration={duration}
        className={className}
      />
    )
  }

  return (
    <StringCounter
      value={value as string}
      prefix={prefix}
      suffix={suffix}
      duration={duration}
      className={className}
    />
  )
}
