"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 400);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="mesh-gradient" />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#2DD4BF] to-[#0d9488] flex items-center justify-center shadow-lg shadow-[#2DD4BF]/20">
            <span className="text-white font-bold text-base sm:text-lg">A3</span>
          </div>
          <span className="text-white/80 font-medium text-sm sm:text-base">Personalized Learning.</span>
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

      {/* Decorative Star */}
      <div className="fixed bottom-8 right-8 z-20">
        <svg className="w-6 h-6 text-white/20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14.09 8.26L20.18 9.27L15.54 13.14L16.82 19.02L12 16.27L7.18 19.02L8.46 13.14L3.82 9.27L9.91 8.26L12 2Z" />
        </svg>
      </div>
    </div>
  );
}
