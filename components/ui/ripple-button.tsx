'use client'

import { useState, useCallback, ReactNode, MouseEvent } from 'react'

interface Ripple {
  x: number
  y: number
  id: number
}

interface RippleButtonProps {
  children: ReactNode
  className?: string
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  variant?: 'primary' | 'secondary' | 'ghost'
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-[#0EA5E9] text-white hover:bg-[#38BDF8] active:scale-[0.97]',
  secondary:
    'border border-white/[0.08] text-[#A1A1AA] hover:border-white/[0.16] hover:text-white active:scale-[0.97]',
  ghost:
    'bg-transparent text-[#A1A1AA] hover:text-white hover:bg-white/[0.04] active:scale-[0.97]',
}

const rippleOpacity: Record<string, string> = {
  primary: 'rgba(255,255,255,0.20)',
  secondary: 'rgba(255,255,255,0.10)',
  ghost: 'rgba(255,255,255,0.10)',
}

let rippleCounter = 0

export function RippleButton({
  children,
  className = '',
  onClick,
  variant = 'primary',
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([])

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const button = e.currentTarget
      const rect = button.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const id = ++rippleCounter

      setRipples((prev) => [...prev, { x, y, id }])

      // Clean up after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id))
      }, 600)

      onClick?.(e)
    },
    [onClick]
  )

  return (
    <button
      onClick={handleClick}
      className={`relative overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 cursor-pointer ${variantStyles[variant]} ${className}`}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="ripple-effect pointer-events-none absolute rounded-full"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '10px',
            height: '10px',
            marginLeft: '-5px',
            marginTop: '-5px',
            background: rippleOpacity[variant],
          }}
        />
      ))}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>

      <style jsx>{`
        .ripple-effect {
          animation: ripple-expand 600ms ease-out forwards;
        }
        @keyframes ripple-expand {
          0% {
            transform: scale(0);
            opacity: 0.3;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </button>
  )
}
