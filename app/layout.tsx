import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Noise } from "@/components/ui/noise";
import { MouseGlow } from "@/components/ui/mouse-glow";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { StarField } from "@/components/ui/star-field";
import { BlendingCursor } from "@/components/ui/blending-cursor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aegis | Privacy-Preserving AI Infrastructure",
  description:
    "Deploy AI models with end-to-end AES-256 encryption, federated learning, and zero-trust architecture. Built for Dubai, USA, UK, and India markets.",
  keywords: [
    "privacy-preserving AI",
    "federated learning",
    "encrypted AI vault",
    "GDPR compliant AI",
    "HIPAA compliant AI",
    "UAE PDPL",
    "DPDPA 2023",
    "differential privacy",
    "enterprise AI security",
  ],
  openGraph: {
    title: "Aegis | Privacy-Preserving AI Infrastructure",
    description:
      "Train AI models across sovereign regions with end-to-end encryption. Your data never leaves the device.",
    type: "website",
    siteName: "Aegis",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aegis | Privacy-Preserving AI Infrastructure",
    description:
      "Train AI models across sovereign regions with end-to-end encryption. Your data never leaves the device.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#09090B] text-white relative`}
      >
        <ScrollProgress />
        <StarField className="fixed inset-0 z-0" />
        <Noise />
        <MouseGlow />
        <BlendingCursor />
        {children}
      </body>
    </html>
  );
}
