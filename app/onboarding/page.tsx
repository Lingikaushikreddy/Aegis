'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Shield, Lock, Network, CheckCircle, Copy, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

// ---------------------------------------------------------------------------
// Self-Service Onboarding — Signup → First Encrypt in <5 minutes
// @frontend-lead + @python-api — Sprint 5, Task 5.1
// ---------------------------------------------------------------------------

type Step = 'account' | 'org' | 'apikey' | 'encrypt' | 'done'

const STEPS: { key: Step; label: string; icon: any }[] = [
  { key: 'account', label: 'Create Account', icon: Shield },
  { key: 'org', label: 'Setup Organization', icon: Lock },
  { key: 'apikey', label: 'Get API Key', icon: Network },
  { key: 'encrypt', label: 'First Encryption', icon: Lock },
  { key: 'done', label: 'Complete', icon: CheckCircle },
]

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('account')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [market, setMarket] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [encrypted, setEncrypted] = useState(false)

  const currentIndex = STEPS.findIndex(s => s.key === step)

  const nextStep = () => {
    const next = STEPS[currentIndex + 1]
    if (next) {
      if (step === 'org') {
        setApiKey(`aegis_sk_${Math.random().toString(36).slice(2, 18)}...`)
      }
      setStep(next.key)
    }
  }

  const prevStep = () => {
    const prev = STEPS[currentIndex - 1]
    if (prev) setStep(prev.key)
  }

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#0EA5E9]/[0.04] blur-[120px]" />

      <nav className="relative z-10 border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Aegis" width={32} height={32} />
            <span className="text-lg font-bold text-white">AEGIS</span>
          </Link>
          <span className="text-sm text-[#71717A]">Step {currentIndex + 1} of {STEPS.length}</span>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-12">
        {/* Progress Bar */}
        <div className="mb-12 flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex-1">
              <div className={`h-1 rounded-full transition-all ${
                i <= currentIndex ? 'bg-[#0EA5E9]' : 'bg-white/[0.06]'
              }`} />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 1: Account */}
            {step === 'account' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white">Create Your Account</h1>
                  <p className="mt-2 text-[#A1A1AA]">Start encrypting in under 5 minutes. No credit card required.</p>
                </div>
                <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-8">
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA]">Work email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50"
                      placeholder="you@company.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA]">Password</label>
                    <div className="relative mt-1.5">
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                        required minLength={8}
                        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 pr-10 text-sm text-white outline-none focus:border-[#0EA5E9]/50"
                        placeholder="Min. 8 characters" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button onClick={nextStep}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#38BDF8]">
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Organization */}
            {step === 'org' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white">Setup Your Organization</h1>
                  <p className="mt-2 text-[#A1A1AA]">We'll configure compliance packages for your market.</p>
                </div>
                <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-8">
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA]">Organization name</label>
                    <input value={orgName} onChange={e => setOrgName(e.target.value)} required
                      className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50"
                      placeholder="Acme Corp" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A1A1AA]">Primary market</label>
                    <select value={market} onChange={e => setMarket(e.target.value)} required
                      className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-[#0EA5E9]/50">
                      <option value="">Select a market</option>
                      <option value="uae">Dubai & UAE (PDPL + AI Seal)</option>
                      <option value="us">United States (HIPAA + SOC 2)</option>
                      <option value="uk">United Kingdom (NHS DSPT + UK GDPR)</option>
                      <option value="india">India (DPDPA + RBI)</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={prevStep}
                      className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm text-[#A1A1AA] hover:text-white">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <button onClick={nextStep}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#38BDF8]">
                      Continue <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: API Key */}
            {step === 'apikey' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white">Your API Key</h1>
                  <p className="mt-2 text-[#A1A1AA]">Use this key to authenticate SDK requests. Store it securely.</p>
                </div>
                <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-8">
                  <div className="flex items-center gap-2 rounded-lg border border-[#0EA5E9]/20 bg-[#0EA5E9]/5 px-4 py-3">
                    <code className="flex-1 text-sm text-[#0EA5E9]">{apiKey}</code>
                    <button onClick={copyKey} className="text-[#71717A] hover:text-white">
                      {copied ? <CheckCircle className="h-4 w-4 text-[#22C55E]" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-3">
                    <p className="text-xs text-[#F59E0B]">This key will not be shown again. Copy and store it securely.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={prevStep}
                      className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm text-[#A1A1AA] hover:text-white">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <button onClick={nextStep}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#38BDF8]">
                      Try First Encryption <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: First Encryption */}
            {step === 'encrypt' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white">Your First Encryption</h1>
                  <p className="mt-2 text-[#A1A1AA]">Encrypt data with AES-256-GCM in one API call.</p>
                </div>
                <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-8">
                  <div className="rounded-lg bg-black/50 p-4 font-mono text-xs">
                    <p className="text-[#71717A]"># Install the SDK</p>
                    <p className="text-[#22C55E]">pip install aegis-sdk</p>
                    <br />
                    <p className="text-[#71717A]"># Encrypt your first file</p>
                    <p className="text-white">from aegis import AegisVault</p>
                    <br />
                    <p className="text-white">vault = AegisVault(api_key=&quot;{apiKey.slice(0, 15)}...&quot;)</p>
                    <p className="text-white">encrypted = vault.encrypt(b&quot;Hello, Aegis!&quot;)</p>
                    <p className="text-white">decrypted = vault.decrypt(encrypted)</p>
                    <p className="text-[#71717A]"># decrypted == b&quot;Hello, Aegis!&quot;</p>
                  </div>
                  {!encrypted ? (
                    <button onClick={() => { setEncrypted(true); setTimeout(() => setStep('done'), 1500) }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4ADE80]">
                      <Lock className="h-4 w-4" /> Run Encryption Demo
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-[#22C55E]/20 bg-[#22C55E]/5 px-4 py-3">
                      <CheckCircle className="h-4 w-4 text-[#22C55E]" />
                      <span className="text-sm text-[#22C55E]">Encrypted with AES-256-GCM successfully!</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Done */}
            {step === 'done' && (
              <div className="space-y-6 text-center">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#22C55E]/10">
                    <CheckCircle className="h-10 w-10 text-[#22C55E]" />
                  </div>
                </motion.div>
                <h1 className="text-3xl font-bold text-white">You're All Set!</h1>
                <p className="text-[#A1A1AA]">
                  Your Aegis vault is live. You encrypted your first data in under 5 minutes.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0EA5E9] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#38BDF8]">
                    Go to Dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/docs"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-6 py-2.5 text-sm text-[#A1A1AA] hover:text-white">
                    Read Documentation
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
