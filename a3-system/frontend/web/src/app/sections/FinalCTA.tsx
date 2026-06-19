"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Rocket, Bell, Check } from "lucide-react";
import ScrollReveal from "../components/landing/ScrollReveal";
import SwarmCanvas from "../components/landing/SwarmCanvas";
import { addToWaitlist } from "@/lib/firebase";
import Confetti from "../components/landing/Confetti";

export default function FinalCTA() {
  const [email, setEmail] = useState("");
  const [waitlistCount, setWaitlistCount] = useState(2547);
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Simulate live counter
    const interval = setInterval(() => {
      setWaitlistCount((prev) => prev + Math.floor(Math.random() * 2));
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || isSubmitting) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setSubmitStatus("error");
      return;
    }

    setIsSubmitting(true);
    const result = await addToWaitlist(email, "final-cta");
    
    if (result.success) {
      setSubmitStatus("success");
      setShowConfetti(true);
      setEmail("");
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      setSubmitStatus("error");
    }
    setIsSubmitting(false);
  };

  return (
    <>
    <Confetti trigger={showConfetti} />
    <section className="relative py-16 sm:py-20 lg:py-28 flex items-center justify-center bg-deep-charcoal overflow-hidden">
      {/* Swarm with exclusion zone to pull particles inward */}
      <SwarmCanvas
        particleCount={20}
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
        {/* Launch badge */}
        <ScrollReveal>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sage-400/10 border border-sage-400/20 mb-6 sm:mb-8"
          >
            <Rocket className="w-4 h-4 text-sage-400" />
            <span className="text-sm text-white/80 font-medium">
              Launching Summer 2026
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse" />
          </motion.div>
        </ScrollReveal>

        <ScrollReveal>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white leading-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Stop Guessing What to Learn Next.
            <br />
            <span className="text-sage-400">Let the Swarm Figure It Out.</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-white/60 max-w-xl mx-auto px-4">
            Skip what you already know. Master what you don&apos;t. Fifteen agents
            profile you, plan your path, generate resources, and test your understanding — continuously.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.4}>
          <form onSubmit={handleSubmit} className="mt-8 sm:mt-10 flex flex-col gap-3 max-w-lg mx-auto">
            {submitStatus === "success" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sage-400/30 via-sage-400/20 to-sage-400/30 border border-sage-400/40 p-5 sm:p-6"
              >
                {/* Animated background shimmer */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.5, repeat: 2, ease: "linear" }}
                />
                
                <div className="relative flex flex-col items-center gap-3 text-center">
                  {/* Animated checkmark */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                    className="w-14 h-14 rounded-full bg-sage-400 flex items-center justify-center shadow-lg shadow-sage-400/40"
                  >
                    <Check className="w-7 h-7 text-white" strokeWidth={3} />
                  </motion.div>
                  
                  <div>
                    <motion.p 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-lg font-semibold text-white"
                    >
                      You're in! Welcome to the swarm 🎉
                    </motion.p>
                    <motion.p 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-sm text-white/60 mt-1"
                    >
                      Check your inbox for a confirmation email
                    </motion.p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (submitStatus === "error") setSubmitStatus("idle");
                  }}
                  className={`flex-1 px-5 py-3.5 rounded-full bg-white/10 backdrop-blur-md border text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sage-400/50 ${
                    submitStatus === "error" ? "border-red-400" : "border-white/10"
                  }`}
                />
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(124,154,107,0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm bg-sage-400 text-[#111111] hover:bg-sage-500 transition-all duration-300 whitespace-nowrap shadow-lg shadow-sage-400/20 disabled:opacity-70"
                >
                  <span>{isSubmitting ? "Joining..." : "Join the Waitlist"}</span>
                  {!isSubmitting && <Rocket className="w-4 h-4" />}
                </motion.button>
              </div>
            )}
            {submitStatus === "error" && (
              <p className="text-xs text-red-400 text-center">Please enter a valid email address</p>
            )}
          </form>
        </ScrollReveal>

        {/* Waitlist benefits */}
        <ScrollReveal delay={0.6}>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 text-white/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="text-xs sm:text-sm">Early access notification</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-sage-400" />
              <span className="text-xs sm:text-sm">Founding member perks</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-xs sm:text-sm">Priority onboarding</span>
            </div>
          </div>
        </ScrollReveal>

        {/* Waitlist counter */}
        <ScrollReveal delay={0.8}>
          <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-white/10">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["#9B59B6", "#3498DB", "#E67E22", "#1ABC9C", "#E74C3C"].map((color, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-deep-charcoal flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: color, zIndex: 5 - i }}
                    >
                      {["S", "M", "A", "P", "D"][i]}
                    </div>
                  ))}
                </div>
                <div className="text-left">
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {mounted ? waitlistCount.toLocaleString() : "2,547"}+
                  </p>
                  <p className="text-xs text-white/50">already on the waitlist</p>
                </div>
              </div>
              <p className="text-sm text-white/40 max-w-sm">
                Join forward-thinking learners ready to transform how they learn
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
    </>
  );
}
