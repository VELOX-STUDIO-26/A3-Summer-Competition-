"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SwarmCanvas from "@/app/components/landing/SwarmCanvas";
import { useAppStore } from "@/lib/store";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { studentId, isHydrated } = useAppStore();
  const [isAnimating, setIsAnimating] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isHydrated && !studentId) {
      router.replace("/login");
    }
  }, [studentId, isHydrated, router]);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 400);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Show loading while hydrating or if not authenticated
  if (!isHydrated || !studentId) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white shadow-lg animate-pulse flex items-center justify-center">
            <img src="/nobogyan-logo.png" alt="NOBOGYAN" className="w-10 h-10" />
          </div>
          <p className="text-[#666] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] relative overflow-hidden">
      {/* Subtle Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E7E2D7]/50 via-[#FAF8F5] to-[#C9D2D6]/30" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#6B7F6B]/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#D6CFC2]/40 rounded-full blur-[128px]" />
      
      {/* Swarm Animation - Subtle in background */}
      <div className="absolute inset-0 opacity-30">
        <SwarmCanvas particleCount={25} />
      </div>
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <img 
            src="/nobogyan-logo.png" 
            alt="NOBOGYAN" 
            className="w-9 h-9 sm:w-10 sm:h-10"
          />
          <span className="font-serif text-[#050505] font-semibold text-sm sm:text-base">NOBOGYAN</span>
        </div>
      </header>

      {/* Main Content with Page Transition */}
      <main className="relative z-10 pt-20 sm:pt-24 min-h-screen">
        <div
          className={`transition-all duration-400 ease-out ${
            isAnimating 
              ? "opacity-0 translate-y-4 scale-[0.98]" 
              : "opacity-100 translate-y-0 scale-100"
          }`}
        >
          {children}
        </div>
      </main>

      {/* Decorative Element */}
      <div className="fixed bottom-8 right-8 z-20">
        <div className="w-3 h-3 rounded-full bg-[#6B7F6B]/40" />
      </div>
    </div>
  );
}
