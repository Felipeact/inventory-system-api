import { Hero } from "@/components/marketing/Hero";
import { LogoCloud } from "@/components/marketing/LogoCloud";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Stats } from "@/components/marketing/Stats";
import { Testimonials } from "@/components/marketing/Testimonials";
import { CtaBand } from "@/components/marketing/CtaBand";

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoCloud />
      <FeatureGrid />
      <HowItWorks />
      <Stats />
      <Testimonials />
      <CtaBand />
    </>
  );
}
