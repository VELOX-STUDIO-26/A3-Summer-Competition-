"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { TrustLogos } from "@/components/trust-logos";
import { SystemFlow } from "@/components/system-flow";
import { MultiAgent } from "@/components/multi-agent";
import { ProductShowcase } from "@/components/product-showcase";
import { CTASection } from "@/components/cta-section";
import { Footer } from "@/components/footer";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col min-h-full bg-[#F7F5F0] text-[#2a2a2a] overflow-x-hidden">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <Hero mounted={mounted} />

      {/* Trust Logos */}
      <TrustLogos mounted={mounted} />

      {/* System Flow */}
      <SystemFlow mounted={mounted} />

      {/* Multi-Agent Intelligence */}
      <MultiAgent mounted={mounted} />

      {/* Product Showcase */}
      <ProductShowcase mounted={mounted} />

      {/* CTA Section */}
      <CTASection mounted={mounted} />

      {/* Footer */}
      <Footer />
    </div>
  );
}

