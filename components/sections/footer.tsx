'use client'

import { Shield, ShieldCheck } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Architecture', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Changelog', href: '#' },
  ],
  Developers: [
    { label: 'Documentation', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'SDK (Rust/Python)', href: '#' },
    { label: 'GitHub', href: '#' },
  ],
  Compliance: [
    { label: 'GDPR Mapping', href: '#' },
    { label: 'HIPAA Alignment', href: '#' },
    { label: 'UAE PDPL', href: '#' },
    { label: 'India DPDPA', href: '#' },
    { label: 'Security Whitepaper', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Trust Center', href: '#' },
  ],
}

const complianceBadges = [
  'SOC 2 Type II',
  'GDPR',
  'HIPAA',
  'UAE PDPL',
  'DPDPA 2023',
  'ISO 27001',
]

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#09090B]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* Newsletter signup */}
        <div className="border-b border-white/[0.06] pb-8 mb-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <h3 className="text-lg font-semibold text-white">
              Stay updated on privacy-preserving AI
            </h3>
            <div className="flex w-full max-w-md gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-[#71717A] outline-none transition-colors focus:border-[#0EA5E9]/50"
              />
              <button className="shrink-0 rounded-lg bg-[#0EA5E9] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#38BDF8] cursor-pointer">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-1">
            <a href="#" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0EA5E9] to-[#8B5CF6]">
                <Shield className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">AEGIS</span>
            </a>
            <p className="mt-4 text-sm leading-relaxed text-[#71717A]">
              Privacy-preserving AI infrastructure for the enterprise. Your data never
              leaves the device.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-white">{title}</h4>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-[#71717A] transition-colors hover:text-[#A1A1AA]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Compliance badges */}
        <div className="mt-12 border-t border-white/[0.06] pt-8">
          <div className="flex flex-wrap items-center gap-3">
            {complianceBadges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-xs text-[#71717A]"
              >
                <ShieldCheck className="h-3 w-3 text-[#22C55E]/70" />
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-xs text-[#71717A]">
            &copy; {new Date().getFullYear()} Aegis Technologies. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-[#71717A] hover:text-[#A1A1AA]">
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-[#71717A] hover:text-[#A1A1AA]">
              Terms of Service
            </a>
            <a href="#" className="text-xs text-[#71717A] hover:text-[#A1A1AA]">
              Security
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
