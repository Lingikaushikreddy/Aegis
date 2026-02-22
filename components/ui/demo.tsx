'use client'

import { SplineScene } from "@/components/ui/splite"
import { Card } from "@/components/ui/card"
import { Spotlight } from "@/components/ui/spotlight"
import { Lock, ShieldCheck, KeyRound } from "lucide-react"

export function SplineSceneBasic() {
    return (
        <Card className="w-full h-[520px] bg-black/[0.96] relative overflow-hidden border-white/10">
            <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

            <div className="flex h-full flex-col md:flex-row">
                {/* Left content */}
                <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 w-fit">
                        <ShieldCheck className="h-4 w-4" />
                        Privacy-preserving personalization
                    </div>

                    <h1 className="mt-4 text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
                        Aegis: Encrypted Personal AI Vault
                    </h1>

                    <p className="mt-4 text-neutral-300 max-w-lg">
                        Your data stays locked in your device vault. Models learn locally through federated training —
                        no raw PII leaves your control.
                    </p>

                    <div className="mt-6 grid grid-cols-1 gap-3 max-w-lg">
                        <Feature icon={<Lock className="h-4 w-4" />} title="Encrypted by default" desc="Local vault + device-bound keys." />
                        <Feature icon={<KeyRound className="h-4 w-4" />} title="Consent that you control" desc="Grant, revoke, audit — instantly." />
                        <Feature icon={<ShieldCheck className="h-4 w-4" />} title="Enterprise-safe AI" desc="Train without ever handling raw PII." />
                    </div>
                </div>

                {/* Right content */}
                <div className="flex-1 relative min-h-[240px] md:min-h-0">
                    {/* User selected theme image - Wide Vault */}
                    <div className="w-full h-full relative">
                        <img
                            src="/vault_wide.jpg"
                            alt="Encrypted Vault Wide"
                            className="w-full h-full object-cover object-center"
                        />
                    </div>
                </div>
            </div>
        </Card>
    )
}

function Feature({
    icon,
    title,
    desc,
}: {
    icon: React.ReactNode
    title: string
    desc: string
}) {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="mt-0.5 text-white/90">{icon}</div>
            <div>
                <div className="text-sm font-semibold text-white/90">{title}</div>
                <div className="text-sm text-white/60">{desc}</div>
            </div>
        </div>
    )
}
