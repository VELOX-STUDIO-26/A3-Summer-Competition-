"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import MagneticButton from "../components/MagneticButton";
import LiveStats from "../components/LiveStats";
import SwarmCanvas from "../components/SwarmCanvas";
import OrbitalSystem from "../components/OrbitalSystem";

export default function Hero() {
  const [email, setEmail] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [exclusionZone, setExclusionZone] = useState({ left: 0, right: 0, top: 0, bottom: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setExclusionZone({
        left: 0,
        right: rect.width * 0.45,
        top: 0,
        bottom: rect.height,
      });
    }
  }, []);

  return (
    <section ref={containerRef} className="relative min-h-screen flex flex-col overflow-hidden pt-20">
      {/* Background layers with subtle vignette mask */}
      <div className="absolute inset-0 mesh-gradient opacity-60" />

      {/* Radial gradient masks to dim background behind critical elements */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 600px 400px at 25% 40%, rgba(250,248,245,0.85) 0%, transparent 70%),
            radial-gradient(ellipse 500px 350px at 75% 45%, rgba(250,248,245,0.75) 0%, transparent 65%)
          `
        }}
      />

      <SwarmCanvas particleCount={40} exclusionZone={exclusionZone} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex-1 flex flex-col">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center flex-1 py-6">
          {/* Left side - Content */}
          <div className="space-y-5 max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <span className="inline-block px-3 py-1 rounded-full bg-sage-400/10 text-sage-600 text-[10px] font-semibold tracking-wider border border-sage-400/20">
                15+ AI AGENTS • ONE LEARNING EXPERIENCE
              </span>
            </motion.div>

            <motion.h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-deep-charcoal"
              style={{
                fontFamily: "var(--font-serif)",
                lineHeight: 1.15,
                letterSpacing: "-0.03em"
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              An Entire AI Team
              <br />
              Learning With You
            </motion.h1>

            <motion.p
              className="text-sm sm:text-base text-deep-charcoal/85 max-w-md leading-relaxed font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              NOBOGYAN deploys a swarm of specialized agents that profile, plan,
              tutor, and assess — all working together to build your perfect
              learning path.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-2 max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.4 }}
            >
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-2.5 py-2 rounded-full bg-white/80 backdrop-blur-md border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400/50 shadow-sm"
              />
              <MagneticButton variant="primary" className="whitespace-nowrap px-6 py-2 text-sm">
                Start Free
              </MagneticButton>
            </motion.div>

            {/* Social proof & trust indicators */}
            <motion.div
              className="flex flex-col gap-2 pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.6 }}
            >
              {/* Avatars stack */}
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {["#9B59B6", "#3498DB", "#E67E22", "#1ABC9C", "#E74C3C"].map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[8px] sm:text-[9px] font-bold shadow-sm"
                      style={{ backgroundColor: color, zIndex: 5 - i }}
                    >
                      {["S", "M", "A", "P", "D"][i]}
                    </div>
                  ))}
                </div>
                <div className="ml-2">
                  <p className="text-xs font-semibold text-deep-charcoal">10,000+ learners</p>
                  <p className="text-[10px] text-deep-charcoal/50">joined this month</p>
                </div>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-deep-charcoal/50">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  No credit card
                </span>
                <span className="w-1 h-1 rounded-full bg-deep-charcoal/30 hidden sm:block" />
                <span>Free forever tier</span>
              </div>
            </motion.div>
          </div>

          {/* Right side - Swarm visualization with glass container */}
          <motion.div
            className="relative h-[420px] lg:h-[480px] hidden lg:block"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {/* Glassmorphism canvas container */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              {/* Premium glass border frame with inset highlight */}
              <div
                className="absolute inset-0 rounded-3xl border border-white/60 backdrop-blur-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.35)',
                  boxShadow: `
                    inset 0 1px 1px rgba(255, 255, 255, 0.5),
                    0 20px 40px rgba(0, 0, 0, 0.04),
                    0 0 0 1px rgba(255, 255, 255, 0.3)
                  `
                }}
              />

              {/* Inner content with breathing room */}
              <div className="relative h-full p-8">
                {/* Header label */}
                <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-deep-charcoal/40 tracking-wider uppercase">Agent Swarm Active</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs font-mono text-deep-charcoal/40">LIVE</span>
                  </div>
                </div>

                {/* Orbital system */}
                <div className="h-full pt-10">
                  <OrbitalSystem />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom stats strip */}
        <motion.div
          className="py-6 mt-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.8 }}
        >
          <LiveStats />
        </motion.div>
      </div>
    </section>
  );
}
