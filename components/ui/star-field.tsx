'use client'

import { useRef, useEffect, useCallback } from 'react'

interface StarFieldProps {
  className?: string
  particleCount?: number
}

interface Particle {
  x: number
  y: number
  size: number
  speed: number
  sway: number
  swayOffset: number
  opacity: number
  color: string
  layer: number
}

const COLORS = ['#0EA5E9', '#8B5CF6', '#ffffff']

function createParticle(width: number, height: number): Particle {
  const layer = Math.random() < 0.4 ? 0 : Math.random() < 0.7 ? 1 : 2
  const layerConfig = [
    { sizeMin: 0.5, sizeMax: 1, speedMin: 0.08, speedMax: 0.15, opacityMax: 0.3 },
    { sizeMin: 1, sizeMax: 1.8, speedMin: 0.15, speedMax: 0.3, opacityMax: 0.5 },
    { sizeMin: 1.5, sizeMax: 2.5, speedMin: 0.25, speedMax: 0.45, opacityMax: 0.7 },
  ][layer]

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: layerConfig.sizeMin + Math.random() * (layerConfig.sizeMax - layerConfig.sizeMin),
    speed: layerConfig.speedMin + Math.random() * (layerConfig.speedMax - layerConfig.speedMin),
    sway: 0.2 + Math.random() * 0.5,
    swayOffset: Math.random() * Math.PI * 2,
    opacity: 0.1 + Math.random() * layerConfig.opacityMax,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    layer,
  }
}

export function StarField({ className = '', particleCount = 80 }: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>(0)
  const timeRef = useRef(0)

  const init = useCallback(
    (width: number, height: number) => {
      particlesRef.current = Array.from({ length: particleCount }, () =>
        createParticle(width, height)
      )
    },
    [particleCount]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      if (particlesRef.current.length === 0) {
        init(rect.width, rect.height)
      }
    }

    resize()
    window.addEventListener('resize', resize)

    if (prefersReducedMotion) {
      // Static render for reduced motion
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      particlesRef.current.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity * 0.5
        ctx.fill()
      })
      ctx.globalAlpha = 1

      return () => window.removeEventListener('resize', resize)
    }

    const animate = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      timeRef.current += 0.008

      ctx.clearRect(0, 0, w, h)

      particlesRef.current.forEach((p) => {
        // Gentle upward drift with horizontal sway
        p.y -= p.speed
        p.x += Math.sin(timeRef.current + p.swayOffset) * p.sway * 0.15

        // Wrap around
        if (p.y < -10) {
          p.y = h + 10
          p.x = Math.random() * w
        }
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10

        // Draw particle with glow
        ctx.save()
        ctx.globalAlpha = p.opacity * 0.4
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color

        // Subtle glow
        ctx.shadowColor = p.color
        ctx.shadowBlur = p.size * 3
        ctx.fill()
        ctx.restore()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [init])

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}
