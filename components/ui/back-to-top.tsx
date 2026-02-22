'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp } from 'lucide-react'

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="back-to-top"
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: [0, -4, 0],
          }}
          exit={{ opacity: 0, y: 20 }}
          transition={{
            opacity: { duration: 0.3 },
            y: {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-8 right-8 z-40 flex h-[44px] w-[44px] items-center justify-center rounded-full border border-white/[0.1] bg-[#0EA5E9]/80 backdrop-blur-sm transition-all duration-300 hover:bg-[#0EA5E9] hover:scale-110 hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] cursor-pointer"
        >
          <ChevronUp className="h-5 w-5 text-white" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
