"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Clock, Zap, Users } from "lucide-react";
import ScrollReveal from "../components/ScrollReveal";
import SwarmCanvas from "../components/SwarmCanvas";

export default function FinalCTA() {
  const [email, setEmail] = useState("");
  const [joinedToday, setJoinedToday] = useState(127);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Simulate live counter
    const interval = setInterval(() => {
      setJoinedToday((prev) => prev + Math.floor(Math.random() * 3));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative py-12 sm:py-16 lg:py-20 flex items-center justify-center bg-deep-charcoal overflow-hidden">
      {/* Swarm with exclusion zone to pull particles inward */}
      <SwarmCanvas
        particleCount={50}
        dark
        exclusionZone={{ left: 0.25, right: 0.75, top: 0.2, bottom: 0.8 }}
        className="opacity-60"
      />

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-sage-400/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        {/* Live counter badge */}
        <ScrollReveal>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 sm:mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-sm text-white/70">
              <span className="font-semibold text-green-400">{mounted ? joinedToday : 127}</span> learners joined today
            </span>
          </motion.div>
        </ScrollReveal>

        <ScrollReveal>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Ready to Learn Smarter?
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-white/60 max-w-xl mx-auto px-4">
            Your personal swarm of 15+ AI agents is waiting. Join thousands of learners accelerating their growth.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.4}>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-5 py-3 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sage-400/50"
            />
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(124,154,107,0.4)" }}
              whileTap={{ scale: 0.98 }}
              className="px-6 h-12 rounded-full font-bold text-sm bg-sage-400 text-[#111111] hover:bg-sage-500 transition-all duration-300 whitespace-nowrap shadow-lg shadow-sage-400/20"
            >
              Get Started Free
            </motion.button>
          </div>
        </ScrollReveal>

        {/* Trust badges */}
        <ScrollReveal delay={0.6}>
          <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-4 text-white/40">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-xs sm:text-sm">No credit card required</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sage-400" />
              <span className="text-xs sm:text-sm">Setup in 2 minutes</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs sm:text-sm">Free forever tier</span>
            </div>
          </div>
        </ScrollReveal>

        {/* Social proof strip */}
        <ScrollReveal delay={0.8}>
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <div className="flex -space-x-2">
                {["#9B59B6", "#3498DB", "#E67E22", "#1ABC9C", "#E74C3C"].map((color, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-deep-charcoal flex items-center justify-center text-white text-[9px] sm:text-[10px] font-bold"
                    style={{ backgroundColor: color, zIndex: 5 - i }}
                  >
                    {["S", "M", "A", "P", "D"][i]}
                  </div>
                ))}
              </div>
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[11px] sm:text-xs text-white/50">Rated 4.9/5 from 2,000+ reviews</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
