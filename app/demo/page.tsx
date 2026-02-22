'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  Shield,
  Lock,
  Network,
  Activity,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Database,
  FileText,
  ArrowRight,
  Copy,
  Eye,
  EyeOff,
  Clock,
  Zap,
  Globe,
  Server,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Task 5.2 (@sales-eng) -- Interactive Product Demo Sandbox
// No signup required. Pre-loaded demo data. Guided walkthrough.
// ---------------------------------------------------------------------------

type DemoTab = 'encrypt' | 'federated' | 'compliance'

const TABS: { key: DemoTab; label: string; icon: typeof Shield; description: string }[] = [
  { key: 'encrypt', label: 'Encrypt Data', icon: Lock, description: 'AES-256-GCM encryption in real time' },
  { key: 'federated', label: 'Federated Learning', icon: Network, description: 'Privacy-preserving model training' },
  { key: 'compliance', label: 'Compliance Check', icon: FileText, description: 'Multi-regulation audit engine' },
]

// -- Helpers ----------------------------------------------------------------

function generateHex(length: number): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * 16)]
  }
  return result
}

function textToHex(text: string): string {
  return Array.from(new TextEncoder().encode(text))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function formatHexBlock(hex: string, groupSize = 2, lineLength = 32): string {
  const groups: string[] = []
  for (let i = 0; i < hex.length; i += groupSize) {
    groups.push(hex.slice(i, i + groupSize))
  }
  const lines: string[] = []
  const perLine = lineLength / groupSize
  for (let i = 0; i < groups.length; i += perLine) {
    lines.push(groups.slice(i, i + perLine).join(' '))
  }
  return lines.join('\n')
}

// -- Encrypt Data Demo ------------------------------------------------------

function EncryptDemo() {
  const [plaintext, setPlaintext] = useState('Patient record: John Doe, DOB 1985-03-14, Blood Type O+')
  const [ciphertext, setCiphertext] = useState('')
  const [decryptedText, setDecryptedText] = useState('')
  const [iv, setIv] = useState('')
  const [authTag, setAuthTag] = useState('')
  const [phase, setPhase] = useState<'idle' | 'encrypting' | 'encrypted' | 'decrypting' | 'decrypted'>('idle')
  const [encryptTime, setEncryptTime] = useState(0)
  const [decryptTime, setDecryptTime] = useState(0)
  const [showPlaintext, setShowPlaintext] = useState(true)
  const [copied, setCopied] = useState(false)

  const handleEncrypt = useCallback(() => {
    if (!plaintext.trim()) return
    setPhase('encrypting')
    setDecryptedText('')
    setDecryptTime(0)

    const start = performance.now()

    // Simulate AES-256-GCM encryption latency
    setTimeout(() => {
      const plaintextHex = textToHex(plaintext)
      // Simulated ciphertext: same length as plaintext hex + padding
      const ct = generateHex(plaintextHex.length + 32)
      const generatedIv = generateHex(24) // 12 bytes = 24 hex chars
      const tag = generateHex(32) // 16 bytes = 32 hex chars
      const elapsed = performance.now() - start

      setCiphertext(ct)
      setIv(generatedIv)
      setAuthTag(tag)
      setEncryptTime(Math.round(elapsed * 100) / 100)
      setPhase('encrypted')
    }, 280 + Math.random() * 120)
  }, [plaintext])

  const handleDecrypt = useCallback(() => {
    setPhase('decrypting')
    const start = performance.now()

    setTimeout(() => {
      const elapsed = performance.now() - start
      setDecryptedText(plaintext)
      setDecryptTime(Math.round(elapsed * 100) / 100)
      setPhase('decrypted')
    }, 180 + Math.random() * 80)
  }, [plaintext])

  const handleReset = useCallback(() => {
    setPhase('idle')
    setCiphertext('')
    setDecryptedText('')
    setIv('')
    setAuthTag('')
    setEncryptTime(0)
    setDecryptTime(0)
  }, [])

  const handleCopyCiphertext = useCallback(() => {
    navigator.clipboard.writeText(ciphertext)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [ciphertext])

  return (
    <div className="space-y-6">
      {/* Input */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-[#A1A1AA]">
            <Database className="h-3.5 w-3.5" />
            Plaintext Data
          </label>
          <button
            onClick={() => setShowPlaintext(!showPlaintext)}
            className="flex items-center gap-1.5 text-xs text-[#71717A] transition-colors hover:text-white"
          >
            {showPlaintext ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showPlaintext ? 'Hide' : 'Show'}
          </button>
        </div>
        <textarea
          value={plaintext}
          onChange={(e) => {
            setPlaintext(e.target.value)
            if (phase !== 'idle') handleReset()
          }}
          rows={3}
          className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 font-mono text-sm text-white outline-none transition-colors placeholder:text-[#52525B] focus:border-[#0EA5E9]/50"
          placeholder="Enter sensitive data to encrypt..."
          style={showPlaintext ? {} : { WebkitTextSecurity: 'disc' } as React.CSSProperties}
        />
        <p className="mt-1.5 text-xs text-[#52525B]">
          {new TextEncoder().encode(plaintext).length} bytes &middot; AES-256-GCM &middot; 256-bit key
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {phase === 'idle' && (
          <button
            onClick={handleEncrypt}
            disabled={!plaintext.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0EA5E9] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#38BDF8] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Lock className="h-4 w-4" />
            Encrypt with AES-256-GCM
          </button>
        )}
        {phase === 'encrypting' && (
          <div className="flex flex-1 items-center justify-center gap-3 rounded-xl border border-[#0EA5E9]/20 bg-[#0EA5E9]/5 px-5 py-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            >
              <Lock className="h-4 w-4 text-[#0EA5E9]" />
            </motion.div>
            <span className="text-sm text-[#0EA5E9]">Encrypting with AES-256-GCM...</span>
          </div>
        )}
        {(phase === 'encrypted' || phase === 'decrypted') && (
          <>
            {phase === 'encrypted' && (
              <button
                onClick={handleDecrypt}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#22C55E] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#4ADE80]"
              >
                <Eye className="h-4 w-4" />
                Decrypt Data
              </button>
            )}
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-3 text-sm text-[#A1A1AA] transition-colors hover:border-white/20 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </>
        )}
        {phase === 'decrypting' && (
          <div className="flex flex-1 items-center justify-center gap-3 rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/5 px-5 py-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            >
              <Eye className="h-4 w-4 text-[#22C55E]" />
            </motion.div>
            <span className="text-sm text-[#22C55E]">Decrypting...</span>
          </div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {(phase === 'encrypted' || phase === 'decrypting' || phase === 'decrypted') && (
          <motion.div
            key="encrypt-result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Timing badge */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0EA5E9]/20 bg-[#0EA5E9]/10 px-3 py-1 text-xs font-medium text-[#0EA5E9]">
                <Clock className="h-3 w-3" />
                Encrypt: {encryptTime}ms
              </span>
              {decryptTime > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#22C55E]/20 bg-[#22C55E]/10 px-3 py-1 text-xs font-medium text-[#22C55E]">
                  <Clock className="h-3 w-3" />
                  Decrypt: {decryptTime}ms
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-3 py-1 text-xs font-medium text-[#8B5CF6]">
                <Shield className="h-3 w-3" />
                AES-256-GCM
              </span>
            </div>

            {/* Ciphertext output */}
            <div className="rounded-xl border border-white/[0.06] bg-black/40">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                <span className="text-xs font-medium text-[#71717A]">Ciphertext (hex-encoded)</span>
                <button
                  onClick={handleCopyCiphertext}
                  className="flex items-center gap-1 text-xs text-[#71717A] transition-colors hover:text-white"
                >
                  {copied ? <CheckCircle className="h-3 w-3 text-[#22C55E]" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed text-[#F97316]">
                {formatHexBlock(ciphertext)}
              </pre>
            </div>

            {/* IV + Auth Tag */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3">
                <p className="mb-1 text-xs font-medium text-[#71717A]">Initialization Vector (IV)</p>
                <p className="break-all font-mono text-xs text-[#A78BFA]">{iv}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3">
                <p className="mb-1 text-xs font-medium text-[#71717A]">Authentication Tag (GCM)</p>
                <p className="break-all font-mono text-xs text-[#A78BFA]">{authTag}</p>
              </div>
            </div>

            {/* Decrypted result */}
            <AnimatePresence>
              {phase === 'decrypted' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/5 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-[#22C55E]" />
                      <span className="text-xs font-medium text-[#22C55E]">Decrypted successfully &mdash; data integrity verified via GCM tag</span>
                    </div>
                    <p className="font-mono text-sm text-white">{decryptedText}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// -- Federated Learning Demo ------------------------------------------------

interface HospitalNode {
  name: string
  icon: typeof Server
  color: string
  samples: number
}

const HOSPITALS: HospitalNode[] = [
  { name: 'Hospital Alpha', icon: Server, color: '#0EA5E9', samples: 12400 },
  { name: 'Hospital Beta', icon: Server, color: '#8B5CF6', samples: 8700 },
  { name: 'Hospital Gamma', icon: Server, color: '#22C55E', samples: 15200 },
]

const FL_ROUNDS = [
  { round: 1, accuracy: 70.2, loss: 0.892, epsilon: 0.31, localAccuracies: [68.1, 71.4, 70.8] },
  { round: 2, accuracy: 85.1, loss: 0.542, epsilon: 0.58, localAccuracies: [83.5, 86.2, 85.4] },
  { round: 3, accuracy: 91.3, loss: 0.298, epsilon: 0.82, localAccuracies: [90.1, 92.0, 91.5] },
  { round: 4, accuracy: 94.0, loss: 0.178, epsilon: 1.04, localAccuracies: [93.2, 94.5, 94.1] },
  { round: 5, accuracy: 96.2, loss: 0.112, epsilon: 1.23, localAccuracies: [95.8, 96.7, 96.0] },
]

function FederatedLearningDemo() {
  const [isRunning, setIsRunning] = useState(false)
  const [currentRound, setCurrentRound] = useState(0)
  const [roundPhase, setRoundPhase] = useState<'idle' | 'local-train' | 'aggregating' | 'complete'>('idle')
  const [completed, setCompleted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSimulation = useCallback(() => {
    setIsRunning(true)
    setCompleted(false)
    setCurrentRound(0)
    setRoundPhase('idle')

    let round = 0

    function advanceRound() {
      if (round >= FL_ROUNDS.length) {
        setIsRunning(false)
        setCompleted(true)
        return
      }

      setCurrentRound(round + 1)
      setRoundPhase('local-train')

      // Local training phase
      timerRef.current = setTimeout(() => {
        setRoundPhase('aggregating')

        // Aggregation phase
        timerRef.current = setTimeout(() => {
          setRoundPhase('complete')

          // Pause before next round
          timerRef.current = setTimeout(() => {
            round++
            advanceRound()
          }, 200)
        }, 400)
      }, 500)
    }

    advanceRound()
  }, [])

  const handleReset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsRunning(false)
    setCompleted(false)
    setCurrentRound(0)
    setRoundPhase('idle')
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const currentData = currentRound > 0 ? FL_ROUNDS[currentRound - 1] : null
  const previousAccuracy = currentRound > 1 ? FL_ROUNDS[currentRound - 2].accuracy : 0

  return (
    <div className="space-y-6">
      {/* Hospital nodes */}
      <div className="grid grid-cols-3 gap-3">
        {HOSPITALS.map((h, idx) => {
          const isTraining = isRunning && roundPhase === 'local-train'
          const localAcc = currentData?.localAccuracies[idx]

          return (
            <motion.div
              key={h.name}
              className="relative overflow-hidden rounded-xl border bg-black/30 p-4"
              style={{
                borderColor: isTraining ? `${h.color}40` : 'rgba(255,255,255,0.06)',
              }}
              animate={isTraining ? { borderColor: [`${h.color}20`, `${h.color}60`, `${h.color}20`] } : {}}
              transition={isTraining ? { repeat: Infinity, duration: 1.2 } : {}}
            >
              {isTraining && (
                <motion.div
                  className="absolute inset-0 opacity-10"
                  style={{ background: `radial-gradient(ellipse at center, ${h.color}, transparent 70%)` }}
                  animate={{ opacity: [0.05, 0.15, 0.05] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                />
              )}
              <div className="relative z-10">
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${h.color}15` }}
                  >
                    <Server className="h-4 w-4" style={{ color: h.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{h.name}</p>
                    <p className="text-[10px] text-[#71717A]">{h.samples.toLocaleString()} samples</p>
                  </div>
                </div>
                {localAcc !== undefined && (
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] text-[#71717A]">Local accuracy</span>
                      <span className="text-xs font-medium" style={{ color: h.color }}>{localAcc}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: h.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${localAcc}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Aggregation indicator */}
      {isRunning && roundPhase === 'aggregating' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-3 rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-3"
        >
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
            <Network className="h-4 w-4 text-[#F59E0B]" />
          </motion.div>
          <span className="text-sm text-[#F59E0B]">
            Aggregating gradients on secure server... (FedAvg + Differential Privacy)
          </span>
        </motion.div>
      )}

      {/* Global model stats */}
      <div className="rounded-xl border border-white/[0.06] bg-black/30">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#0EA5E9]" />
              <span className="text-sm font-semibold text-white">Global Model</span>
            </div>
            <span className="text-xs text-[#71717A]">
              Round {currentRound}/{FL_ROUNDS.length}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-[#71717A]">Accuracy</p>
            <motion.p
              className="mt-1 text-2xl font-bold text-[#0EA5E9]"
              key={currentData?.accuracy ?? 0}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
            >
              {currentData ? `${currentData.accuracy}%` : '--'}
            </motion.p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-[#71717A]">Loss</p>
            <p className="mt-1 text-2xl font-bold text-[#F97316]">
              {currentData ? currentData.loss.toFixed(3) : '--'}
            </p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-[#71717A]">Privacy Budget (&#949;)</p>
            <p className={`mt-1 text-2xl font-bold ${currentData && currentData.epsilon > 1 ? 'text-[#F59E0B]' : 'text-[#22C55E]'}`}>
              {currentData ? currentData.epsilon.toFixed(2) : '--'}
            </p>
          </div>
        </div>

        {/* Accuracy progress bar */}
        <div className="border-t border-white/[0.06] px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs text-[#71717A]">Global accuracy</span>
            <span className="text-xs font-medium text-[#0EA5E9]">{currentData?.accuracy ?? 0}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8]"
              animate={{ width: `${currentData?.accuracy ?? 0}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* DP noise indicator */}
        <div className="border-t border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-[#8B5CF6]" />
            <span className="text-xs text-[#71717A]">Differential Privacy &mdash; Noise budget consumed:</span>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(to right, #22C55E, ${
                      (currentData?.epsilon ?? 0) > 1 ? '#F59E0B' : '#22C55E'
                    })`,
                  }}
                  animate={{ width: `${((currentData?.epsilon ?? 0) / 2) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
            <span className="text-xs font-mono text-[#A1A1AA]">
              {currentData?.epsilon.toFixed(2) ?? '0.00'} / 2.00
            </span>
          </div>
        </div>
      </div>

      {/* Round log */}
      {currentRound > 0 && (
        <div className="max-h-36 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3">
          <p className="mb-2 text-xs font-medium text-[#71717A]">Training Log</p>
          {FL_ROUNDS.slice(0, currentRound).map((r, i) => (
            <motion.div
              key={r.round}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 py-1 font-mono text-[11px]"
            >
              <CheckCircle className="h-3 w-3 flex-shrink-0 text-[#22C55E]" />
              <span className="text-[#71717A]">[Round {r.round}]</span>
              <span className="text-white">acc={r.accuracy}%</span>
              <span className="text-[#F97316]">loss={r.loss.toFixed(3)}</span>
              <span className="text-[#8B5CF6]">&#949;={r.epsilon.toFixed(2)}</span>
              {i > 0 && (
                <span className="text-[#22C55E]">
                  (+{(r.accuracy - FL_ROUNDS[i - 1].accuracy).toFixed(1)}%)
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {!isRunning && !completed && (
          <button
            onClick={runSimulation}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0EA5E9] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#38BDF8]"
          >
            <Play className="h-4 w-4" />
            Start Federated Training
          </button>
        )}
        {completed && (
          <div className="flex flex-1 items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/5 px-4 py-3">
              <CheckCircle className="h-4 w-4 text-[#22C55E]" />
              <span className="text-sm text-[#22C55E]">
                Training complete &mdash; 96.2% accuracy with &#949;=1.23 privacy guarantee
              </span>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-3 text-sm text-[#A1A1AA] transition-colors hover:border-white/20 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        )}
        {isRunning && (
          <div className="flex flex-1 items-center justify-center gap-3 rounded-xl border border-[#0EA5E9]/20 bg-[#0EA5E9]/5 px-5 py-3">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
              <Activity className="h-4 w-4 text-[#0EA5E9]" />
            </motion.div>
            <span className="text-sm text-[#0EA5E9]">
              Training in progress... Round {currentRound} of {FL_ROUNDS.length}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// -- Compliance Check Demo --------------------------------------------------

interface Regulation {
  id: string
  name: string
  region: string
  flag: string
  enabled: boolean
  checks: {
    label: string
    status: 'pass' | 'warning' | 'auto'
    detail: string
  }[]
}

const INITIAL_REGULATIONS: Regulation[] = [
  {
    id: 'gdpr',
    name: 'GDPR',
    region: 'European Union',
    flag: 'EU',
    enabled: true,
    checks: [
      { label: 'Data Encryption at Rest', status: 'pass', detail: 'AES-256-GCM applied to all stored records' },
      { label: 'Right to Erasure (Art. 17)', status: 'auto', detail: 'Aegis auto-purge with cryptographic deletion proof' },
      { label: 'Data Processing Records (Art. 30)', status: 'auto', detail: 'Immutable audit log with tamper-proof hashing' },
      { label: 'Cross-Border Transfer (Art. 46)', status: 'pass', detail: 'Federated learning keeps data in-region' },
      { label: 'Data Minimization (Art. 5)', status: 'warning', detail: 'Review: 3 fields may contain unnecessary PII' },
    ],
  },
  {
    id: 'hipaa',
    name: 'HIPAA',
    region: 'United States',
    flag: 'US',
    enabled: true,
    checks: [
      { label: 'PHI Encryption (§164.312)', status: 'pass', detail: 'End-to-end AES-256 encryption for all PHI' },
      { label: 'Access Controls (§164.312(a))', status: 'auto', detail: 'Zero-trust RBAC with MFA enforcement' },
      { label: 'Audit Controls (§164.312(b))', status: 'auto', detail: 'Complete audit trail with SHA-256 integrity' },
      { label: 'Transmission Security (§164.312(e))', status: 'pass', detail: 'TLS 1.3 + encrypted payloads in transit' },
      { label: 'BAA Compliance', status: 'pass', detail: 'Business Associate Agreement auto-generated' },
    ],
  },
  {
    id: 'uae-pdpl',
    name: 'UAE PDPL',
    region: 'United Arab Emirates',
    flag: 'AE',
    enabled: false,
    checks: [
      { label: 'Data Localization', status: 'pass', detail: 'UAE-region vault with no cross-border transfer' },
      { label: 'Consent Management', status: 'auto', detail: 'Granular consent tracking with withdrawal support' },
      { label: 'DPO Notification', status: 'auto', detail: 'Auto-notify registered Data Protection Officer' },
      { label: 'AI Governance (AI Seal)', status: 'pass', detail: 'Model cards + bias audit for Dubai AI Seal compliance' },
      { label: 'Breach Notification', status: 'auto', detail: 'Auto-alert within 72 hours per PDPL requirements' },
    ],
  },
  {
    id: 'dpdpa',
    name: 'DPDPA 2023',
    region: 'India',
    flag: 'IN',
    enabled: false,
    checks: [
      { label: 'Data Fiduciary Obligations', status: 'pass', detail: 'Aegis acts as compliant Data Processor' },
      { label: 'Consent Framework (§6)', status: 'auto', detail: 'Purpose-limited consent with opt-out mechanism' },
      { label: 'Data Principal Rights (§11-14)', status: 'auto', detail: 'Automated rights portal for access/correction/erasure' },
      { label: 'Cross-Border Transfer (§16)', status: 'warning', detail: 'Requires government whitelist verification for target country' },
      { label: 'Significant Data Fiduciary (§10)', status: 'pass', detail: 'Annual impact assessment auto-generated' },
    ],
  },
  {
    id: 'uk-gdpr',
    name: 'UK GDPR',
    region: 'United Kingdom',
    flag: 'GB',
    enabled: false,
    checks: [
      { label: 'Lawful Basis for Processing', status: 'pass', detail: 'Purpose limitation enforced via policy engine' },
      { label: 'NHS DSPT Alignment', status: 'auto', detail: 'Data Security and Protection Toolkit assertions met' },
      { label: 'International Transfers', status: 'pass', detail: 'Adequacy decision compliance with UK ICO guidance' },
      { label: 'Data Protection Impact Assessment', status: 'auto', detail: 'Auto-generated DPIA for high-risk processing' },
      { label: 'ICO Registration', status: 'warning', detail: 'Manual step: verify ICO registration number' },
    ],
  },
  {
    id: 'sox',
    name: 'SOC 2 Type II',
    region: 'Global',
    flag: 'GL',
    enabled: false,
    checks: [
      { label: 'Security (CC6)', status: 'pass', detail: 'Logical and physical access controls enforced' },
      { label: 'Availability (CC7)', status: 'auto', detail: '99.99% SLA with automated failover' },
      { label: 'Processing Integrity (CC8)', status: 'pass', detail: 'Cryptographic verification on all transformations' },
      { label: 'Confidentiality (CC9)', status: 'pass', detail: 'AES-256 encryption + key rotation every 90 days' },
      { label: 'Privacy (P1-P8)', status: 'auto', detail: 'Full privacy criteria coverage via Aegis policies' },
    ],
  },
]

function ComplianceDemo() {
  const [regulations, setRegulations] = useState<Regulation[]>(INITIAL_REGULATIONS)

  const toggleRegulation = useCallback((id: string) => {
    setRegulations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    )
  }, [])

  const enabled = regulations.filter((r) => r.enabled)
  const totalChecks = enabled.reduce((sum, r) => sum + r.checks.length, 0)
  const passCount = enabled.reduce(
    (sum, r) => sum + r.checks.filter((c) => c.status === 'pass').length,
    0
  )
  const autoCount = enabled.reduce(
    (sum, r) => sum + r.checks.filter((c) => c.status === 'auto').length,
    0
  )
  const warnCount = enabled.reduce(
    (sum, r) => sum + r.checks.filter((c) => c.status === 'warning').length,
    0
  )

  return (
    <div className="space-y-6">
      {/* Regulation selector */}
      <div>
        <p className="mb-3 text-sm font-medium text-[#A1A1AA]">Select applicable regulations:</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {regulations.map((r) => (
            <button
              key={r.id}
              onClick={() => toggleRegulation(r.id)}
              className={`group relative flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                r.enabled
                  ? 'border-[#0EA5E9]/30 bg-[#0EA5E9]/10'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                  r.enabled ? 'bg-[#0EA5E9]/20 text-[#0EA5E9]' : 'bg-white/[0.06] text-[#71717A]'
                }`}
              >
                {r.flag}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${r.enabled ? 'text-white' : 'text-[#A1A1AA]'}`}>
                  {r.name}
                </p>
                <p className="truncate text-[10px] text-[#71717A]">{r.region}</p>
              </div>
              {r.enabled && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0EA5E9]"
                >
                  <CheckCircle className="h-2.5 w-2.5 text-white" />
                </motion.div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <AnimatePresence mode="wait">
        {enabled.length > 0 && (
          <motion.div
            key={enabled.map((r) => r.id).join('-')}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-4 gap-3"
          >
            <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-3 text-center">
              <p className="text-xs text-[#71717A]">Total Checks</p>
              <p className="mt-1 text-xl font-bold text-white">{totalChecks}</p>
            </div>
            <div className="rounded-xl border border-[#22C55E]/10 bg-[#22C55E]/5 px-3 py-3 text-center">
              <p className="text-xs text-[#71717A]">Passing</p>
              <p className="mt-1 text-xl font-bold text-[#22C55E]">{passCount}</p>
            </div>
            <div className="rounded-xl border border-[#0EA5E9]/10 bg-[#0EA5E9]/5 px-3 py-3 text-center">
              <p className="text-xs text-[#71717A]">Auto by Aegis</p>
              <p className="mt-1 text-xl font-bold text-[#0EA5E9]">{autoCount}</p>
            </div>
            <div className="rounded-xl border border-[#F59E0B]/10 bg-[#F59E0B]/5 px-3 py-3 text-center">
              <p className="text-xs text-[#71717A]">Needs Review</p>
              <p className="mt-1 text-xl font-bold text-[#F59E0B]">{warnCount}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detailed results */}
      <AnimatePresence mode="wait">
        {enabled.length > 0 ? (
          <motion.div
            key={enabled.map((r) => r.id).join('-') + '-detail'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {enabled.map((reg) => (
              <motion.div
                key={reg.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden rounded-xl border border-white/[0.06] bg-black/30"
              >
                <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0EA5E9]/10 text-[10px] font-bold text-[#0EA5E9]">
                    {reg.flag}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">{reg.name}</span>
                    <span className="ml-2 text-xs text-[#71717A]">{reg.region}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="text-xs text-[#22C55E]">
                      {reg.checks.filter((c) => c.status === 'pass' || c.status === 'auto').length}/{reg.checks.length}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {reg.checks.map((check, idx) => (
                    <div key={idx} className="flex items-start gap-3 px-4 py-2.5">
                      {check.status === 'pass' && (
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#22C55E]" />
                      )}
                      {check.status === 'auto' && (
                        <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#0EA5E9]" />
                      )}
                      {check.status === 'warning' && (
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#F59E0B]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white">{check.label}</span>
                          {check.status === 'auto' && (
                            <span className="rounded-full bg-[#0EA5E9]/10 px-2 py-0.5 text-[10px] font-medium text-[#0EA5E9]">
                              Automated
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[#71717A]">{check.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <Globe className="mb-3 h-10 w-10 text-[#52525B]" />
            <p className="text-sm text-[#71717A]">Select one or more regulations to see the compliance audit.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// -- Main Page --------------------------------------------------------------

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<DemoTab>('encrypt')

  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#0EA5E9]/[0.04] blur-[140px]" />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="transition-transform duration-300 group-hover:scale-110">
              <Image src="/logo.png" alt="Aegis" width={32} height={32} className="object-contain" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">AEGIS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/docs"
              className="hidden rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-[#A1A1AA] transition-all hover:border-white/20 hover:text-white sm:block"
            >
              Docs
            </Link>
            <Link
              href="/onboarding"
              className="flex items-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#38BDF8]"
            >
              Sign Up Free
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-12 sm:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/20 bg-[#0EA5E9]/10 px-4 py-1.5">
            <Shield className="h-3.5 w-3.5 text-[#0EA5E9]" />
            <span className="text-xs font-medium text-[#0EA5E9]">Live Sandbox &mdash; No signup required</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Interactive Demo
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-[#A1A1AA]">
            Experience Aegis without signing up. Encrypt data, simulate federated learning, and audit compliance &mdash; all in your browser.
          </p>
        </motion.div>

        {/* Tab switcher */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex rounded-xl border border-white/[0.06] bg-[#0F0F12] p-1">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive ? 'text-white' : 'text-[#71717A] hover:text-[#A1A1AA]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="demo-tab-bg"
                      className="absolute inset-0 rounded-lg bg-white/[0.06]"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {/* Tab description */}
          <AnimatePresence mode="wait">
            <motion.p
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="mt-3 text-center text-xs text-[#52525B]"
            >
              {TABS.find((t) => t.key === activeTab)?.description}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Tab content */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="rounded-2xl border border-white/[0.06] bg-[#0F0F12] p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
              >
                {activeTab === 'encrypt' && <EncryptDemo />}
                {activeTab === 'federated' && <FederatedLearningDemo />}
                {activeTab === 'compliance' && <ComplianceDemo />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-12"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0F0F12] px-8 py-10 text-center">
            {/* Gradient backdrop */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0EA5E9]/[0.05] via-transparent to-[#8B5CF6]/[0.05]" />

            <div className="relative z-10">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#8B5CF6] shadow-[0_0_30px_rgba(14,165,233,0.25)]">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to build?</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#A1A1AA]">
                Go from demo to production in under 5 minutes. Free tier includes 10,000 encryptions/month and 3 federated training runs.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/onboarding"
                  className="flex items-center gap-2 rounded-xl bg-[#0EA5E9] px-7 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#38BDF8]"
                >
                  Sign up free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/docs"
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-7 py-3.5 text-sm font-semibold text-[#A1A1AA] transition-all hover:border-white/20 hover:text-white"
                >
                  Read Documentation
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
