import { Navbar } from "@/components/ui/navbar";
import { HeroSection } from "@/components/sections/hero";
import { FeaturesSection } from "@/components/sections/features";
import { HowItWorksSection } from "@/components/sections/how-it-works";
import { MarketsSection } from "@/components/sections/markets";
import { SocialProofSection } from "@/components/sections/social-proof";
import { MetricsSection } from "@/components/sections/metrics";
import { PricingSection } from "@/components/sections/pricing";
import { CtaBanner } from "@/components/sections/cta-banner";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <MetricsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <MarketsSection />
        <SocialProofSection />
        <PricingSection />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
