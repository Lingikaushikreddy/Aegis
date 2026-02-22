'use client'

import { useState } from 'react'
import { Menu, X, ArrowRight } from 'lucide-react'
import Image from 'next/image'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Architecture', href: '#how-it-works' },
  { label: 'Markets', href: '#markets' },
  { label: 'Pricing', href: '#pricing' },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08] bg-[#09090B]/50 backdrop-blur-2xl shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05),0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <Image
              src="/logo.png"
              alt="Aegis Logo"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">AEGIS</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#A1A1AA] transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/docs"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-[#A1A1AA] transition-all hover:border-white/20 hover:text-white"
          >
            Documentation
          </a>
          <a
            href="/signup"
            className="flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#38BDF8]"
          >
            Start Free Trial
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          className="text-white md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-white/[0.06] bg-[#09090B]/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-6 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[#A1A1AA] transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-white/[0.06] pt-4">
              <a
                href="/docs"
                className="rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-[#A1A1AA]"
              >
                Documentation
              </a>
              <a
                href="/signup"
                className="flex items-center justify-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2.5 text-sm font-medium text-white"
              >
                Start Free Trial
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
