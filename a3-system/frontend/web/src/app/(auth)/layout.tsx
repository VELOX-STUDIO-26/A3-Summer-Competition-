"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import SwarmCanvas from "@/app/components/landing/SwarmCanvas";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-deep-charcoal flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-sage-900/20 via-transparent to-sage-800/10" />
      
      {/* Back Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium z-20"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      
      <div className="w-full max-w-5xl lg:min-h-[620px] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row relative z-10 border border-white/[0.08]">
        {/* Left Side - Swarm Animation (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-deep-charcoal via-[#1a1d1f] to-deep-charcoal min-h-[620px]">
          {/* Swarm Canvas */}
          <SwarmCanvas particleCount={50} dark={true} />
          
          {/* Overlay content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 z-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <Image 
                src="/nobogyan-logo.png" 
                alt="NOBOGYAN" 
                width={48}
                height={48}
                className="w-12 h-12 invert"
              />
              <span className="font-serif font-bold text-2xl text-white">
                NOBOGYAN
              </span>
            </div>
            
            {/* Tagline */}
            <h2 className="text-white/90 text-xl font-serif text-center mb-4">
              Your Personal AI Learning Swarm
            </h2>
            <p className="text-white/50 text-sm text-center max-w-xs leading-relaxed">
              15+ intelligent agents working together to create your perfect learning experience
            </p>
            
            {/* Agent dots indicator */}
            <div className="flex items-center gap-2 mt-8">
              {["#9B59B6", "#E67E22", "#1ABC9C", "#E74C3C", "#7C9A6B"].map((color, i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{ 
                    backgroundColor: color,
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
              <span className="text-white/40 text-xs ml-2">+10 more</span>
            </div>
          </div>
        </div>

        {/* Right Side - Form (animated) */}
        <div className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-12 flex items-center bg-sand-50">
          <div
            className={`w-full max-w-sm mx-auto transition-all duration-300 ease-out ${
              isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
