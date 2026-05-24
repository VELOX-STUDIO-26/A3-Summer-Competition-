"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import MagneticButton from "../components/landing/MagneticButton";
import LiveStats from "../components/landing/LiveStats";
import SwarmCanvas from "../components/landing/SwarmCanvas";
import ProductShowcase from "../components/landing/ProductShowcase";
import { addToWaitlist } from "@/lib/firebase";
import Confetti from "../components/landing/Confetti";

export default function Hero() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [showConfetti, setShowConfetti] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [exclusionZone, setExclusionZone] = useState({ left: 0, right: 0, top: 0, bottom: 0 });

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || isSubmitting) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setSubmitStatus("error");
      return;
    }

    setIsSubmitting(true);
    const result = await addToWaitlist(email, "hero");
    
    if (result.success) {
      setSubmitStatus("success");
      setShowConfetti(true);
      setEmail("");
      // Reset confetti after animation
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      setSubmitStatus("error");
    }
    setIsSubmitting(false);
  };

  useEffect(() => {
    // Exclusion zone uses relative values (0-1)
    // Keep particles away from left side where text is
    setExclusionZone({
      left: 0,
      right: 0.5, // 50% from left
      top: 0.1,
      bottom: 0.9,
    });
  }, []);

  return (
    <>
    <Confetti trigger={showConfetti} />
    <section ref={containerRef} className="relative min-h-screen flex flex-col overflow-hidden pt-16 sm:pt-20">
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

      <SwarmCanvas particleCount={25} exclusionZone={exclusionZone} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full flex-1 flex flex-col">
        <div className="grid lg:grid-cols-2 gap-4 lg:gap-12 items-center flex-1 py-4 sm:py-6">
          {/* Left side - Content */}
          <div className="space-y-4 sm:space-y-5 max-w-xl">
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
              Stop Studying Harder.
              <br />
              <span className="text-sage-500">Start Learning Smarter.</span>
            </motion.h1>

            <motion.p
              className="text-sm sm:text-base text-deep-charcoal/85 max-w-md leading-relaxed font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              NOBOGYAN analyzes your exact knowledge gaps, builds a custom curriculum 
              instantly, and guides you with an interactive, multimodal AI tutor 
              that adapts to your pace and style.
            </motion.p>

            {/* Waitlist CTA */}
            <motion.form
              id="waitlist"
              onSubmit={handleSubmit}
              className="flex flex-col gap-2 max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.4 }}
            >
              {submitStatus === "success" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sage-400/20 via-sage-400/10 to-sage-400/20 border border-sage-400/30 p-4 sm:p-5"
                >
                  {/* Animated background shimmer */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: 2, ease: "linear" }}
                  />
                  
                  <div className="relative flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
                    {/* Animated checkmark */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                      className="w-12 h-12 rounded-full bg-sage-400 flex items-center justify-center shadow-lg shadow-sage-400/30"
                    >
                      <motion.svg 
                        className="w-6 h-6 text-white" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                      >
                        <motion.path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={3} 
                          d="M5 13l4 4L19 7"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, delay: 0.3 }}
                        />
                      </motion.svg>
                    </motion.div>
                    
                    <div className="flex-1">
                      <motion.p 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-base font-semibold text-sage-700"
                      >
                        You're in! Welcome to the swarm 🎉
                      </motion.p>
                      <motion.p 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-sm text-sage-600/70 mt-0.5"
                      >
                        Check your inbox for a confirmation email
                      </motion.p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (submitStatus === "error") setSubmitStatus("idle");
                    }}
                    className={`flex-1 px-4 py-2.5 rounded-full bg-white/80 backdrop-blur-md border text-sm focus:outline-none focus:ring-2 focus:ring-sage-400/50 shadow-sm ${
                      submitStatus === "error" ? "border-red-400" : "border-white/40"
                    }`}
                  />
                  <MagneticButton 
                    variant="primary" 
                    className="whitespace-nowrap px-6 py-2.5 text-sm font-semibold"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Joining..." : "Join the Waitlist →"}
                  </MagneticButton>
                </div>
              )}
              {submitStatus === "error" && (
                <p className="text-xs text-red-500 pl-4">Please enter a valid email address</p>
              )}
            </motion.form>

            {/* Social proof & trust indicators */}
            <motion.div
              className="flex flex-col gap-3 pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.6 }}
            >
              {/* Realistic avatars stack with FOMO stats */}
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {[
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
                    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
                    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
                  ].map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Early adopter ${i + 1}`}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white object-cover shadow-sm"
                      style={{ zIndex: 5 - i }}
                    />
                  ))}
                  <div 
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white bg-sage-400 flex items-center justify-center text-white text-[9px] font-bold shadow-sm"
                    style={{ zIndex: 0 }}
                  >
                    +2K
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-semibold text-deep-charcoal">2,500+ Early Adopters</p>
                  <p className="text-[10px] text-deep-charcoal/70">
                    <span className="text-sage-600 font-semibold">500 beta slots</span> • 15,000+ paths generated
                  </p>
                </div>
              </div>

              {/* Trust badges with closed beta angle */}
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1.5 bg-sage-400/10 text-sage-700 px-2.5 py-1 rounded-full font-medium border border-sage-400/20">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Closed Beta • Summer 2026
                </span>
                <span className="flex items-center gap-1 text-deep-charcoal/70 font-medium">
                  <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Early access priority
                </span>
              </div>
            </motion.div>
          </div>

          {/* Right side - Magic Trick UI: User Input → Product Output */}
          <motion.div
            className="relative h-[420px] lg:h-[520px] hidden lg:block"
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
              <div className="relative h-full p-6">
                <ProductShowcase />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom stats strip */}
        <motion.div
          className="py-4 sm:py-6 mt-auto -mx-4 sm:mx-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.8 }}
        >
          <LiveStats />
        </motion.div>
      </div>
    </section>
    </>
  );
}
