"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface CTASectionProps {
  mounted: boolean;
}

const valueProps = [
  "No credit card required",
  "Free forever plan",
  "Cancel anytime",
  "Lifetime access to resources",
];

export function CTASection({ mounted }: CTASectionProps) {
  const fade = (delay = 0) =>
    cn(
      "transition-all duration-700 ease-out",
      "opacity-100 translate-y-0"
    );

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6">
      <div className={cn(fade(), "max-w-5xl mx-auto")}>
        {/* Light Card - High Contrast */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white via-[#F7F5F0] to-[#E7E2D7] border border-[#D6CFC2] px-6 py-12 sm:px-8 sm:py-16 md:px-16 md:py-20 text-center shadow-2xl shadow-[#B8C3C9]/20">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #000 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }} />
          
          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C9D2D6]/30 border border-[#B8C3C9]/50 mb-6">
              <span className="text-xs font-medium text-[#4a5568] uppercase tracking-wide">Ready to get started?</span>
            </div>

            {/* Headline */}
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[#2a2a2a] mb-6 max-w-2xl mx-auto leading-tight">
              Your personalized cloud learning journey starts here.
            </h2>

            {/* Subtext */}
            <p className="text-lg text-[#555] mb-10 max-w-xl mx-auto">
              Join thousands of learners mastering cloud technologies with AI-powered personalization.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#B8C3C9] text-white text-base font-semibold hover:bg-[#8a9ba3] transition-all shadow-lg shadow-[#B8C3C9]/40 hover:shadow-xl"
              >
                Start Learning Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-[#D6CFC2] text-base font-medium text-[#555] hover:bg-[#E7E2D7] transition-all">
                <Play className="w-5 h-5" />
                See Demo
              </button>
            </div>

            {/* Value Props */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {valueProps.map((prop) => (
                <div key={prop} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4a5568]" />
                  <span className="text-sm text-[#666]">{prop}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
