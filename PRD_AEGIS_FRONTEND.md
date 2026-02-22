# AEGIS FRONTEND - PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Document Owner:** Senior UI/UX & Frontend Designer
**Version:** 1.0
**Date:** 2026-02-21
**Status:** APPROVED

---

## 1. PRODUCT OVERVIEW

**Product:** Aegis - Privacy-Preserving AI Infrastructure marketing website
**Tagline:** "The Fortress for Your Data"
**Target Markets:** Dubai (UAE), USA, UK, India
**Target Buyers:** CISOs, CTOs, Heads of AI, Enterprise procurement teams

### Design Philosophy

Inspired by the best-in-class security and developer products:

| Inspiration | What We Take |
|------------|--------------|
| **Resend** | Forced dark mode, minimal aesthetic, developer credibility |
| **Linear** | CSS token architecture, mechanical precision animations |
| **Proton** | Trust signals, compliance-first positioning, premium feel |
| **Vercel** | Hero structure, tab-based features, dual CTAs |
| **Stripe** | Enterprise metrics bar, modular feature grid |
| **1Password** | Security product hero patterns, vault imagery |

---

## 2. DESIGN SYSTEM

### 2.1 Color Palette

**Base:** Dark-first with deep charcoal (not pure black)

| Token | Value | Usage |
|-------|-------|-------|
| `--aegis-bg` | `#09090B` | Page background |
| `--aegis-surface-1` | `#0F0F12` | Card backgrounds |
| `--aegis-surface-2` | `#18181B` | Elevated cards |
| `--aegis-surface-3` | `#1F1F23` | Hover states |
| `--aegis-border` | `rgba(255,255,255,0.08)` | Subtle borders |
| `--aegis-text-primary` | `#FAFAFA` | Headlines |
| `--aegis-text-secondary` | `#A1A1AA` | Body text |
| `--aegis-text-muted` | `#71717A` | Captions |
| `--aegis-accent` | `#0EA5E9` | Primary CTA, links |
| `--aegis-accent-hover` | `#38BDF8` | Hover state |
| `--aegis-success` | `#22C55E` | Encrypted/secure badges |
| `--aegis-warning` | `#F59E0B` | Warning states |
| `--aegis-gradient-from` | `#0EA5E9` | Gradient start (sky blue) |
| `--aegis-gradient-to` | `#8B5CF6` | Gradient end (violet) |

### 2.2 Typography

| Usage | Font | Weight | Size |
|-------|------|--------|------|
| Hero headline | Geist Sans | 700 (Bold) | 56-72px |
| Section titles | Geist Sans | 600 (Semibold) | 36-48px |
| Card titles | Geist Sans | 600 | 20-24px |
| Body text | Geist Sans | 400 | 16-18px |
| Captions/badges | Geist Sans | 500 | 12-14px |
| Code blocks | Geist Mono | 400 | 14px |

### 2.3 Spacing Scale

8px grid system: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px

### 2.4 Animation Tokens

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Fade in up | 600ms | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Viewport entry |
| Stagger children | 100ms delay between items | Same | Viewport entry |
| Gradient shift | 3000ms | Linear loop | Always |
| Counter count-up | 2000ms | `ease-out` | Viewport entry |
| Card hover glow | 200ms | `ease` | Hover |

---

## 3. PAGE STRUCTURE

### Single-page marketing site with sections:

```
[Navbar]          - Sticky, glassmorphism, logo + links + CTAs
[Hero]            - Full viewport, compliance badges, animated headline, dual CTA
[Trusted By]      - Logo bar of enterprise clients/partners
[Features]        - 6-card grid with icons
[How It Works]    - 3-step architecture flow with code snippet
[Markets]         - 4-tab section (Dubai, USA, UK, India)
[Metrics]         - Animated counter bar
[Pricing]         - 3-tier cards
[CTA Banner]      - Final call-to-action
[Footer]          - Links, compliance badges, social
```

---

## 4. COMPONENT SPECIFICATIONS

### 4.1 Navbar
- **Position:** Sticky top, z-50
- **Background:** `bg-[#09090B]/80 backdrop-blur-xl`
- **Border:** Bottom `border-white/[0.06]`
- **Logo:** "AEGIS" wordmark with shield icon
- **Links:** Features, Architecture, Markets, Pricing
- **CTAs:** "Documentation" (ghost), "Request Demo" (filled accent)
- **Mobile:** Hamburger menu with slide-in drawer

### 4.2 Hero Section
- **Height:** min-h-screen with centered content
- **Compliance overline:** Badge row: "SOC 2 | GDPR | HIPAA | UAE PDPL | DPDPA"
- **Headline:** "Privacy-Preserving AI Infrastructure for the Enterprise" with gradient text
- **Subheadline:** "Deploy AI models across sovereign regions..."
- **CTAs:** "Request a Demo" (primary), "View Architecture" (secondary)
- **Background:** Subtle grid pattern + radial gradient glow
- **Animation:** Hero text fades in staggered; grid dots animate

### 4.3 Features Grid
- **Layout:** 3x2 grid (responsive: 1 col mobile, 2 col tablet, 3 col desktop)
- **Cards:** Dark surface with icon, title, description, subtle border
- **Features:**
  1. AES-256-GCM Encryption (Lock icon)
  2. Federated Learning (Network icon)
  3. Differential Privacy (Shield icon)
  4. Consent Management (KeyRound icon)
  5. Cross-Platform SDK (Smartphone icon)
  6. Compliance Engine (FileCheck icon)

### 4.4 How It Works
- **Layout:** 3 numbered steps in horizontal flow (vertical on mobile)
- **Steps:**
  1. "Encrypt & Store" - Data encrypted on-device with Rust core
  2. "Train Locally" - AI models train without data leaving device
  3. "Aggregate Securely" - Only privatized updates reach server

### 4.5 Markets Section
- **Layout:** 4 cards with flag + market name + key regulations + use cases
- **Markets:** Dubai, USA, UK, India

### 4.6 Metrics Bar
- **Layout:** 4 columns, centered
- **Metrics:** "AES-256-GCM" | "4 Platforms" | "< 3ms DP Overhead" | "Zero Data Exposure"

### 4.7 Pricing
- **Layout:** 3-tier cards (Starter, Professional, Enterprise)
- **Highlight:** Professional tier (most popular)
- **Enterprise:** "Contact Sales" CTA

### 4.8 Footer
- **Layout:** 4-column grid + bottom bar
- **Columns:** Product, Developers, Compliance, Company
- **Bottom:** Copyright + compliance badge icons

---

## 5. ENGINEERING TASK ASSIGNMENTS

### Team:
- **@frontend-lead** (FE-1): Page layout, sections, responsive design
- **@frontend-ux** (FE-2): Animations, micro-interactions, polish
- **@frontend-component** (FE-3): Reusable component library

| Task ID | Task | Assignee | Priority | Estimate |
|---------|------|----------|----------|----------|
| FE-001 | Design system (globals.css, tailwind tokens) | @frontend-lead | P0 | 2h |
| FE-002 | Navbar component | @frontend-component | P0 | 2h |
| FE-003 | Hero section | @frontend-lead | P0 | 3h |
| FE-004 | Features grid section | @frontend-component | P0 | 2h |
| FE-005 | How It Works section | @frontend-lead | P1 | 2h |
| FE-006 | Markets section | @frontend-lead | P1 | 2h |
| FE-007 | Metrics bar | @frontend-component | P1 | 1h |
| FE-008 | Pricing section | @frontend-lead | P1 | 3h |
| FE-009 | CTA banner section | @frontend-component | P1 | 1h |
| FE-010 | Footer | @frontend-component | P1 | 2h |
| FE-011 | Framer Motion scroll animations | @frontend-ux | P1 | 3h |
| FE-012 | Responsive QA (mobile/tablet/desktop) | @frontend-ux | P1 | 2h |
| FE-013 | SEO metadata + Open Graph tags | @frontend-lead | P2 | 1h |
| FE-014 | Performance optimization (lazy load, image opt) | @frontend-ux | P2 | 2h |

---

## 6. ACCEPTANCE CRITERIA

- [ ] Lighthouse Performance score > 90
- [ ] Lighthouse Accessibility score > 95
- [ ] Responsive at 375px, 768px, 1024px, 1440px breakpoints
- [ ] All animations smooth at 60fps
- [ ] Zero layout shift (CLS < 0.1)
- [ ] Dark mode only (forced)
- [ ] All text readable (WCAG AA contrast ratio)
- [ ] CTAs visible and clickable at all breakpoints
- [ ] Page loads in < 2 seconds on 4G

---

*This PRD is the design contract. All implementation must match these specifications.*
