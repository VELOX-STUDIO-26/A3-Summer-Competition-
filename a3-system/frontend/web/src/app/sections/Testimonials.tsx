"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import ScrollReveal from "../components/landing/ScrollReveal";

const testimonials = [
  {
    quote:
      "NOBOGYAN completely changed how I approach learning. The swarm of agents adapts to my pace and style in a way no single AI tutor ever could.",
    name: "Sarah Chen",
    role: "Software Engineer",
    company: "Stripe",
    avatar: "SC",
    color: "#9B59B6",
    highlightedPhrase: "swarm of agents",
    agents: [
      { id: "T", name: "Tutor", color: "#3498DB", target: "adapts to my pace" },
      { id: "P", name: "Planner", color: "#F39C12", target: "style" },
    ],
  },
  {
    quote:
      "I went from zero knowledge of Kubernetes to deploying production clusters in 3 weeks. The personalized path and real-time tutoring made all the difference.",
    name: "Marcus Johnson",
    role: "DevOps Lead",
    company: "Datadog",
    avatar: "MJ",
    color: "#E67E22",
    highlightedPhrase: "personalized path",
    agents: [
      { id: "A", name: "Architect", color: "#34495E", target: "Kubernetes" },
      { id: "T", name: "Tutor", color: "#3498DB", target: "real-time tutoring" },
    ],
  },
  {
    quote:
      "The multimodal tutoring is incredible. I uploaded a system architecture diagram and NOBOGYAN broke it down into bite-sized learning modules instantly.",
    name: "Priya Patel",
    role: "CS Student",
    company: "Stanford University",
    avatar: "PP",
    color: "#1ABC9C",
    highlightedPhrase: "system architecture diagram",
    agents: [
      { id: "V", name: "Vision", color: "#8E44AD", target: "uploaded a system architecture diagram" },
      { id: "M", name: "Mapper", color: "#E67E22", target: "broke it down" },
    ],
  },
  {
    quote:
      "As a visual learner, I love how NOBOGYAN automatically generates mind maps and diagrams. It feels like having a personal tutor who truly understands me.",
    name: "Alex Rivera",
    role: "Data Scientist",
    company: "Netflix",
    avatar: "AR",
    color: "#3498DB",
    highlightedPhrase: "mind maps and diagrams",
    agents: [
      { id: "M", name: "Mapper", color: "#E67E22", target: "mind maps" },
      { id: "T", name: "Tutor", color: "#3498DB", target: "understands me" },
    ],
  },
  {
    quote:
      "The adaptive quizzes keep me challenged without being overwhelming. Every session feels productive and tailored to exactly what I need to learn next.",
    name: "Emily Nakamura",
    role: "ML Engineer",
    company: "OpenAI",
    avatar: "EN",
    color: "#E74C3C",
    highlightedPhrase: "adaptive quizzes",
    agents: [
      { id: "S", name: "Sage", color: "#1ABC9C", target: "adaptive quizzes" },
      { id: "R", name: "Recommender", color: "#F39C12", target: "what I need to learn next" },
    ],
  },
  {
    quote:
      "I've tried dozens of learning platforms. NOBOGYAN is the first one that actually feels intelligent — like it reads my mind and knows what I need before I do.",
    name: "David Kim",
    role: "Founder & CEO",
    company: "TechStartup",
    avatar: "DK",
    color: "#F39C12",
    highlightedPhrase: "feels intelligent",
    agents: [
      { id: "O", name: "Orchestrator", color: "#7C9A6B", target: "NOBOGYAN is the first one" },
      { id: "T", name: "Tutor", color: "#3498DB", target: "knows what I need" },
    ],
  },
];

// 5-Star rating component
function FiveStars() {
  return (
    <div className="flex justify-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.svg
          key={star}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: star * 0.05 }}
          className="w-5 h-5 text-amber-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.603l3.625 2.865-1.111 4.648c-.23.96.777 1.747 1.567 1.17L10 15.347l3.983 2.557c.79.577 1.797-.21 1.567-1.17l-1.111-4.648 3.625-2.865c.635-.496.297-1.536-.536-1.603l-4.753-.381-1.83-4.401z"
            clipRule="evenodd"
          />
        </motion.svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const currentRef = useRef(current);

  // Keep ref in sync with state
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % testimonials.length);
    setProgress(0);
  }, []);

  const prev = () => {
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setProgress(0);
  };

  // Auto-advance with proper cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Schedule next card
          const nextIndex = (currentRef.current + 1) % testimonials.length;
          setCurrent(nextIndex);
          return 0;
        }
        return prev + 1;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const t = testimonials[current];

  // Function to render quote with highlighted phrase
  // Uses first agent's color for the highlight (narrative consistency)
  const renderQuote = () => {
    const parts = t.quote.split(t.highlightedPhrase);
    const highlightColor = t.agents[0]?.color || t.color; // Use first agent's color

    if (parts.length === 1) {
      return <span>{t.quote}</span>;
    }
    return (
      <>
        {parts[0]}
        <span className="relative inline-block">
          <span className="relative z-10 px-1" style={{ color: highlightColor }}>
            {t.highlightedPhrase}
          </span>
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="absolute bottom-0 left-0 h-2 rounded-full opacity-20"
            style={{ backgroundColor: highlightColor }}
          />
        </span>
        {parts[1]}
      </>
    );
  };

  return (
    <section className="py-32 md:py-40 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sand-100 via-white to-white" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* Header */}
        <ScrollReveal className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sage-400/10 border border-sage-400/20 mb-6"
          >
            <Users className="w-4 h-4 text-sage-500" />
            <span className="text-[11px] font-mono font-semibold tracking-[0.2em] text-sage-600 uppercase">
              Voices
            </span>
          </motion.div>

          <h2
            className="text-4xl md:text-5xl font-serif font-semibold text-deep-charcoal"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.02em" }}
          >
            Loved by Learners Worldwide
          </h2>
        </ScrollReveal>

        {/* Testimonial with Agent Swarm */}
        <ScrollReveal delay={0.2}>
          <div className="relative pt-8">
            {/* Agent Swarm - positioned above the card */}
            <div className="absolute -top-8 left-0 right-0 h-24 pointer-events-none z-20">
              <AnimatePresence mode="sync">
                {t.agents.map((agent, i) => {
                  // Balanced positions: left, center, right - higher up to avoid overlap
                  const positions = [
                    { top: "4px", left: "15%" },
                    { top: "0px", left: "50%", transform: "translateX(-50%)" },
                    { top: "4px", right: "15%" },
                  ];
                  const pos = positions[i] || positions[0];

                  return (
                    <motion.div
                      key={`${current}-${agent.id}`}
                      initial={{ opacity: 0, scale: 0, y: -20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -10 }}
                      transition={{
                        duration: 0.5,
                        delay: i * 0.1,
                        ease: [0.23, 1, 0.32, 1],
                      }}
                      className="absolute flex flex-col items-center gap-2"
                      style={pos}
                    >
                    {/* Agent label above */}
                    <span
                      className="px-2 py-1 rounded-md text-[9px] font-mono font-medium bg-white/90 backdrop-blur-sm border shadow-sm whitespace-nowrap"
                      style={{ borderColor: `${agent.color}40`, color: agent.color }}
                    >
                      {agent.name}
                    </span>

                    {/* Connecting line */}
                    <svg
                      className="w-8 h-6 overflow-visible"
                      style={{ marginTop: "-4px" }}
                    >
                      <motion.path
                        d="M 16 0 L 16 20"
                        stroke={agent.color}
                        strokeWidth="1"
                        strokeDasharray="3 2"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                      />
                    </svg>

                    {/* Agent bubble */}
                    <motion.div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg"
                      style={{
                        backgroundColor: agent.color,
                        boxShadow: `0 0 20px ${agent.color}50`,
                      }}
                      whileHover={{ scale: 1.1 }}
                    >
                      {agent.id}
                    </motion.div>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>

            {/* Main Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{
                  duration: 0.5,
                  ease: [0.23, 1, 0.32, 1],
                }}
                className="glass-premium rounded-3xl p-8 md:p-12 relative mx-4"
                style={{
                  background: "rgba(255,255,255,0.8)",
                  backdropFilter: "blur(40px)",
                  boxShadow: `
                    inset 0 1px 2px rgba(255,255,255,0.9),
                    0 24px 48px rgba(0,0,0,0.06),
                    0 0 0 1px rgba(255,255,255,0.5)
                  `,
                }}
              >
              {/* Content */}
              <div className="text-center space-y-6">
                {/* 5 Stars */}
                <FiveStars />

                {/* Quote */}
                <blockquote
                  className="text-xl md:text-2xl text-deep-charcoal/80 leading-relaxed max-w-3xl mx-auto"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  "{renderQuote()}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center justify-center gap-4 pt-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="relative"
                  >
                    {/* Avatar with gradient ring */}
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg relative"
                      style={{
                        backgroundColor: t.color,
                        boxShadow: `0 0 0 3px white, 0 0 0 5px ${t.color}40`,
                      }}
                    >
                      {t.avatar}
                    </div>
                    {/* Verified badge */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center border-2 border-white">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </motion.div>
                  <div className="text-left">
                    <p className="font-semibold text-deep-charcoal text-lg">{t.name}</p>
                    <p className="text-sm text-deep-charcoal/70">{t.role}</p>
                    <p className="text-xs text-deep-charcoal/40 flex items-center gap-1 mt-0.5">
                      <span className="w-1 h-1 rounded-full bg-sage-400" />
                      {t.company}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
            </AnimatePresence>
            <div className="mt-8 space-y-6">
              {/* Supported by */}
              <div className="flex items-center justify-center gap-3">
                <span className="text-[10px] font-mono text-deep-charcoal/40 uppercase tracking-wider">
                  Supported by
                </span>
                <div className="flex gap-1.5">
                  {t.agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.id}
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress Bar Navigation */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-6">
                  <button
                    onClick={prev}
                    className="w-10 h-10 rounded-full border border-sand-300 flex items-center justify-center hover:bg-sand-100 transition-colors group"
                  >
                    <ChevronLeft className="w-5 h-5 text-deep-charcoal/60 group-hover:text-sage-500" />
                  </button>

                  {/* Progress track */}
                  <div className="w-48 h-1 bg-sand-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-sage-400 rounded-full"
                      style={{ width: `${((current + progress / 100) / testimonials.length) * 100}%` }}
                      transition={{ duration: 0.05 }}
                    />
                  </div>

                  <button
                    onClick={next}
                    className="w-10 h-10 rounded-full border border-sand-300 flex items-center justify-center hover:bg-sand-100 transition-colors group"
                  >
                    <ChevronRight className="w-5 h-5 text-deep-charcoal/60 group-hover:text-sage-500" />
                  </button>
                </div>

                {/* Page indicator */}
                <span className="text-[11px] font-mono text-deep-charcoal/40 tracking-wider">
                  {current + 1} / {testimonials.length}
                </span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
