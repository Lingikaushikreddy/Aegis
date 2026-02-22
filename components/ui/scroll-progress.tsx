'use client'

import { motion, useScroll, useSpring, useTransform } from 'framer-motion'

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  // Hide until past 5% scroll
  const opacity = useTransform(scrollYProgress, [0, 0.05], [0, 1])
  const smoothOpacity = useSpring(opacity, {
    stiffness: 100,
    damping: 30,
  })

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[60] h-[2px]"
      style={{ opacity: smoothOpacity }}
    >
      <motion.div
        className="h-full origin-left"
        style={{
          scaleX: smoothProgress,
          background: 'linear-gradient(90deg, #0EA5E9, #8B5CF6)',
          boxShadow: '0 0 8px rgba(14, 165, 233, 0.6), 0 0 20px rgba(14, 165, 233, 0.3)',
        }}
      />
    </motion.div>
  )
}
