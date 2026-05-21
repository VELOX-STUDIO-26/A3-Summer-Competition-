"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ScrollReveal from "../components/landing/ScrollReveal";
import CountUp from "../components/landing/CountUp";

const metrics = [
  { value: 15, suffix: "+", label: "AI Agents", sublabel: "Working Together", context: "across 5 specialized teams", icon: "agents", color: "#7C9A6B" },
  { value: 10000, suffix: "+", label: "Learners", sublabel: "Active This Month", context: "from 120+ countries", icon: "learners", color: "#3498DB" },
  { value: 500, suffix: "+", label: "Topics", sublabel: "In Knowledge Graph", context: "covering 12 domains", icon: "nodes", color: "#9B59B6" },
  { value: 200, suffix: "ms", label: "Path Planning", sublabel: "Average Speed", context: "10x faster than traditional", icon: "speed", color: "#F39C12" },
];

// Subtle node graph background for Knowledge Graph stat
function NodeGraphBg() {
  // Deterministic pseudo-random positions based on index to avoid hydration mismatch
  const getOffset = (i: number) => ((i * 7) % 10) + 2;

  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none"
      viewBox="0 0 200 100"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Nodes */}
      {[...Array(12)].map((_, i) => (
        <circle
          key={i}
          cx={20 + (i % 4) * 45 + getOffset(i)}
          cy={15 + Math.floor(i / 4) * 35 + getOffset(i + 1)}
          r="3"
          fill="#7C9A6B"
        />
      ))}
      {/* Connections */}
      <path
        d="M30 25 Q50 40 70 25 M70 25 Q90 50 110 35 M110 35 Q130 20 150 40"
        stroke="#7C9A6B"
        strokeWidth="0.5"
        fill="none"
      />
      <path
        d="M40 60 Q60 45 80 65 M80 65 Q100 50 120 70"
        stroke="#7C9A6B"
        strokeWidth="0.5"
        fill="none"
      />
    </svg>
  );
}

// Speed pulse animation for the 200ms stat
function SpeedPulse() {
  return (
    <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-0.5 bg-sage-400/60 rounded-full"
          initial={{ height: 8, opacity: 0.3 }}
          animate={{
            height: [8, 20, 8],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default function Metrics() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="py-24 md:py-32 bg-sand-100 relative overflow-hidden">
      {/* Top separator - subtle horizontal rule */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-sage-300/50 to-transparent" />

      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(124,154,107,0.1) 0%, transparent 50%),
                             radial-gradient(circle at 80% 50%, rgba(52,152,219,0.1) 0%, transparent 50%)`,
          }}
        />
      </div>

      {/* Connecting particles between metrics */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block">
        <svg className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="metricLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7C9A6B" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#7C9A6B" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7C9A6B" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <line x1="15%" y1="50%" x2="85%" y2="50%" stroke="url(#metricLine)" strokeWidth="1" strokeDasharray="8 8">
            <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="2s" repeatCount="indefinite" />
          </line>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {metrics.map((metric, i) => (
            <ScrollReveal key={metric.label} delay={i * 0.05} className="text-center relative group">
              {/* Special backgrounds for specific metrics */}
              {metric.icon === "nodes" && <NodeGraphBg />}

              {/* Hover glow effect */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
                style={{
                  background: `radial-gradient(circle at center, ${metric.color}10 0%, transparent 70%)`,
                }}
              />

              <div className="relative p-4">
                {/* Icon indicator */}
                <motion.div
                  className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${metric.color}15` }}
                  initial={{ scale: 0, rotate: -10 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05, type: "spring" }}
                >
                  {metric.icon === "agents" && (
                    <svg className="w-6 h-6" style={{ color: metric.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  )}
                  {metric.icon === "learners" && (
                    <svg className="w-6 h-6" style={{ color: metric.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                  {metric.icon === "nodes" && (
                    <svg className="w-6 h-6" style={{ color: metric.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  )}
                  {metric.icon === "speed" && (
                    <svg className="w-6 h-6" style={{ color: metric.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                </motion.div>

                <motion.div
                  className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold relative inline-block"
                  style={{ fontFamily: "var(--font-serif)", color: metric.color }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <CountUp end={metric.value} suffix={metric.suffix} duration={1.5} />
                  {metric.icon === "speed" && mounted && <SpeedPulse />}
                </motion.div>

                <div className="mt-2 sm:mt-3 space-y-0.5 sm:space-y-1">
                  <p className="text-sm sm:text-base font-semibold text-deep-charcoal tracking-wide">
                    {metric.label}
                  </p>
                  <p className="text-xs sm:text-sm text-deep-charcoal/50 font-medium">
                    {metric.sublabel}
                  </p>
                  {/* Context line */}
                  <motion.p
                    className="text-[10px] sm:text-xs text-deep-charcoal/40 italic pt-1 hidden sm:block"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                  >
                    {metric.context}
                  </motion.p>
                </div>
              </div>

              {/* Decorative accent line */}
              <motion.div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
                style={{ backgroundColor: metric.color }}
                initial={{ width: 0, opacity: 0 }}
                whileInView={{ width: 48, opacity: 0.4 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.05 }}
              />

              {/* Connector dot to next metric */}
              {i < metrics.length - 1 && (
                <div className="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2">
                  <div className="w-2 h-2 rounded-full bg-sage-300/50" />
                </div>
              )}
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
