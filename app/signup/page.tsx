'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Eye, EyeOff, Check } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const benefits = [
  '14-day free trial, no credit card required',
  'AES-256-GCM encryption from day one',
  'Federated learning with DP-SGD privacy',
  'GDPR, HIPAA, UAE PDPL compliant',
]

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          org_name: orgName,
          password,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Signup failed')
      }

      const { tokens } = await res.json()
      localStorage.setItem('aegis_access_token', tokens.access_token)
      localStorage.setItem('aegis_refresh_token', tokens.refresh_token)
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#09090B]">
      {/* Background effects */}
      <div className="absolute right-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-[#0EA5E9]/[0.04] blur-[120px]" />
      <div className="absolute left-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-[#8B5CF6]/[0.04] blur-[100px]" />

      {/* Left: Benefits */}
      <div className="hidden w-1/2 flex-col justify-center px-16 lg:flex">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-white">
            Deploy privacy-preserving AI
            <br />
            in minutes, not months.
          </h2>
          <p className="mt-4 text-base text-[#A1A1AA]">
            Join enterprises across Dubai, USA, UK, and India who trust Aegis
            to keep their AI training private and compliant.
          </p>
          <ul className="mt-8 space-y-4">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#0EA5E9]/10">
                  <Check className="h-3 w-3 text-[#0EA5E9]" />
                </div>
                <span className="text-sm text-[#A1A1AA]">{b}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Right: Form */}
      <div className="flex w-full items-center justify-center px-4 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="mb-8 flex items-center justify-center gap-2 lg:justify-start">
            <Image src="/logo.png" alt="Aegis" width={40} height={40} />
            <span className="text-xl font-bold text-white">AEGIS</span>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-8">
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="mt-2 text-sm text-[#A1A1AA]">Start your 14-day free trial</p>

            {error && (
              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSignup} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#A1A1AA]">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-[#71717A] outline-none transition-colors focus:border-[#0EA5E9]/50 focus:ring-1 focus:ring-[#0EA5E9]/25"
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A1A1AA]">Work email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-[#71717A] outline-none transition-colors focus:border-[#0EA5E9]/50 focus:ring-1 focus:ring-[#0EA5E9]/25"
                  placeholder="jane@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A1A1AA]">Organization name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-[#71717A] outline-none transition-colors focus:border-[#0EA5E9]/50 focus:ring-1 focus:ring-[#0EA5E9]/25"
                  placeholder="Acme Corp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A1A1AA]">Password</label>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 pr-10 text-sm text-white placeholder-[#71717A] outline-none transition-colors focus:border-[#0EA5E9]/50 focus:ring-1 focus:ring-[#0EA5E9]/25"
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#38BDF8] disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Create Account'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>

              <p className="text-xs text-[#71717A]">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="text-[#0EA5E9] hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-[#0EA5E9] hover:underline">Privacy Policy</Link>.
              </p>
            </form>

            <div className="mt-6 text-center text-sm text-[#71717A]">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-[#0EA5E9] hover:text-[#38BDF8]">
                Sign in
              </Link>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#71717A]">
            <Shield className="h-3.5 w-3.5 text-[#22C55E]" />
            <span>Your data is encrypted end-to-end. We never see your raw data.</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
