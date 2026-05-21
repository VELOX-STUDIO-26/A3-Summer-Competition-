"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "../hooks/useInView";

/* ─── Agent colour map ─── */
const agentColours: Record<string, string> = {
  "Profile Extractor": "#9B59B6",
  "Gap Detector": "#E67E22",
  "Path Planner": "#F39C12",
  Recommender: "#E67E22",
  Scholar: "#9B59B6",
  Mapper: "#E67E22",
  Sage: "#1ABC9C",
  Director: "#E74C3C",
  Architect: "#34495E",
  "Gate Agent": "#3498DB",
  Evaluator: "#9B59B6",
};

/* ═══════════════════════════════════════════
   LEFT  COLUMN  –  Scrolling editorial steps
   ═══════════════════════════════════════════ */
const steps = [
  {
    number: "01",
    title: "Discover",
    body: "Talk to NOBOGYAN naturally. No forms, no rigid quizzes—just explain what you want to learn.",
    detail:
      "Profile Extractor and Gap Detector agents analyse every message in real time, building a six-dimension learning model from your very first sentence.",
    agents: ["Profile Extractor", "Gap Detector"],
  },
  {
    number: "02",
    title: "Plan",
    body: "Get Your Unique Path",
    detail:
      "The Path Planner runs A* search across a living knowledge graph of 500+ topics, then continuously reshuffles your route as you progress.",
    agents: ["Path Planner", "Recommender"],
  },
  {
    number: "03",
    title: "Learn",
    body: "Learn With Your Swarm",
    detail:
      "Five content agents generate notes, mind maps, quizzes, video scripts and code exercises in parallel—checked for faithfulness before delivery.",
    agents: ["Scholar", "Mapper", "Sage", "Director", "Architect"],
  },
  {
    number: "04",
    title: "Master",
    body: "Unlock Milestones",
    detail:
      "Gate Agents track mastery across completion, quiz scores and engagement. Hit the threshold and the next module unlocks automatically.",
    agents: ["Gate Agent", "Evaluator"],
  },
];

function StepText({ step, index }: { step: (typeof steps)[0]; index: number }) {
  const { ref, isInView } = useInView<HTMLDivElement>({ threshold: 0.4 });

  return (
    <div ref={ref} className="min-h-[60vh] flex items-center py-20" data-step-index={index}>
      <div className="max-w-md pl-8">
        <AnimatePresence mode="wait">
          {isInView && (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            >
              {/* Step number — JetBrains Mono, tracked, uppercase */}
              <span
                className="text-[11px] font-mono font-medium text-sage-400 tracking-[0.15em] uppercase block mb-3"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {step.number} // {step.title}
              </span>

              {/* Headline — Playfair Display */}
              <h3
                className="text-4xl md:text-5xl font-serif font-semibold text-deep-charcoal mb-5"
                style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.02em", lineHeight: 1.1 }}
              >
                {step.title}
              </h3>

              {/* Subhead — high contrast, medium weight */}
              <p className="text-xl text-deep-charcoal/90 font-medium mb-4 leading-snug">
                {step.body}
              </p>

              {/* Detail — muted, lighter weight */}
              <p className="text-base text-deep-charcoal/50 leading-relaxed mb-8 font-normal">
                {step.detail}
              </p>

              {/* Agent badges with brand colours */}
              <div className="flex flex-wrap gap-2">
                {step.agents.map((agent) => (
                  <span
                    key={agent}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-mono font-medium"
                    style={{
                      borderColor: `${agentColours[agent] || "#7C9A6B"}35`,
                      color: agentColours[agent] || "#7C9A6B",
                      backgroundColor: `${agentColours[agent] || "#7C9A6B"}08`,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: agentColours[agent] || "#7C9A6B" }}
                    />
                    {agent}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RIGHT COLUMN  –  Dynamic live view (sticky)
   ═══════════════════════════════════════════ */

/* ── Step 1 : Chat ── */
function DiscoverView() {
  return (
    <div className="w-full h-full min-h-[380px] flex flex-col items-center justify-center p-6">
      <div
        className="rounded-2xl p-5 space-y-3 border border-white/60"
        style={{
          background: "rgba(255,255,255,0.45)",
          backdropFilter: "blur(24px)",
          boxShadow: "inset 0 1px 2px rgba(255,255,255,0.8), 0 12px 32px rgba(0,0,0,0.03)",
        }}
      >
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-sage-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">N</div>
          <div className="bg-sage-400/10 rounded-xl rounded-tl-none px-3 py-2">
            <p className="text-xs text-deep-charcoal/80">Hi! I&apos;m your AI learning swarm. What would you like to learn today?</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 flex-row-reverse">
          <div className="w-7 h-7 rounded-full bg-sand-300 flex items-center justify-center text-deep-charcoal text-[10px] font-bold shrink-0">You</div>
          <div className="bg-white rounded-xl rounded-tr-none px-3 py-2 border border-sand-200">
            <p className="text-xs text-deep-charcoal/80">I want to learn Docker and Kubernetes from scratch</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-sage-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">N</div>
          <div className="bg-sage-400/10 rounded-xl rounded-tl-none px-3 py-2">
            <p className="text-xs text-deep-charcoal/80">Perfect! Analysing your intent and building your profile...</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {[
          { name: "Profile Extractor", status: "Context mapping... 88%", colour: "#9B59B6" },
          { name: "Gap Detector", status: "Identifying prerequisites", colour: "#E67E22" },
        ].map((a) => (
          <div
            key={a.name}
            className="flex items-center gap-2 rounded-lg px-3 py-2 border border-white/50"
            style={{
              background: "rgba(255,255,255,0.5)",
              backdropFilter: "blur(16px)",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4)",
            }}
          >
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: a.colour }} />
            <span className="text-[10px] font-mono font-medium text-deep-charcoal/70">{a.name}:</span>
            <span className="text-[10px] text-deep-charcoal/50">{a.status}</span>
            <div className="ml-auto w-16 h-1 bg-sand-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full animate-pulse" style={{ width: "60%", backgroundColor: a.colour }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Step 2 : Graph ── */
function PlanView() {
  const nodes = [
    { x: 40, y: 200, label: "Docker", active: true },
    { x: 140, y: 130, label: "Containers", active: true },
    { x: 240, y: 80, label: "K8s Basics", active: true },
    { x: 340, y: 60, label: "Pods", active: false },
    { x: 280, y: 160, label: "Volumes", active: false },
    { x: 180, y: 220, label: "Networking", active: false },
  ];

  return (
    <div className="w-full h-full flex flex-col justify-center p-2">
      <div
        className="rounded-2xl p-5 border border-white/60"
        style={{
          background: "rgba(255,255,255,0.45)",
          backdropFilter: "blur(24px)",
          boxShadow: "inset 0 1px 2px rgba(255,255,255,0.8), 0 12px 32px rgba(0,0,0,0.03)",
        }}
      >
        <div className="relative h-64">
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C9A6B" />
                <stop offset="100%" stopColor="#1ABC9C" />
              </linearGradient>
            </defs>
            <path
              d="M 40 200 Q 90 165 140 130 Q 190 105 240 80 Q 290 70 340 60"
              fill="none"
              stroke="url(#pathGrad)"
              strokeWidth="2"
              strokeDasharray="6 4"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1s" repeatCount="indefinite" />
            </path>
          </svg>

          {nodes.map((n, i) => (
            <div
              key={i}
              className={`absolute w-14 h-9 rounded-lg flex items-center justify-center text-[9px] font-mono font-medium transition-all duration-500 ${
                n.active
                  ? "bg-sage-400 text-[#111111] font-bold shadow-lg shadow-sage-400/30"
                  : "bg-sand-200 text-deep-charcoal/40"
              }`}
              style={{ left: n.x, top: n.y, transform: "translate(-50%, -50%)" }}
            >
              {n.label}
            </div>
          ))}

          <div
            className="absolute w-2 h-2 rounded-full bg-sage-400 shadow-[0_0_8px_rgba(124,154,107,0.6)]"
            style={{
              offsetPath: "path('M 40 200 Q 90 165 140 130 Q 190 105 240 80 Q 290 70 340 60')",
              animation: "packet-travel 2s linear infinite",
            }}
          />
        </div>
      </div>

      <div
        className="mt-4 rounded-lg px-3 py-2 flex items-center gap-2 border border-white/50"
        style={{
          background: "rgba(255,255,255,0.5)",
          backdropFilter: "blur(16px)",
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4)",
        }}
      >
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[10px] font-mono text-deep-charcoal/70">Path Planner:</span>
        <span className="text-[10px] text-deep-charcoal/50">Optimising route via A* search...</span>
        <span className="ml-auto text-[10px] font-mono text-sage-500">200ms</span>
      </div>
    </div>
  );
}

/* ── Step 3 : Resources ── */
function LearnView() {
  const resources = [
    { label: "Notes", agent: "Scholar", colour: "#9B59B6", status: "done" },
    { label: "Mind Map", agent: "Mapper", colour: "#E67E22", status: "done" },
    { label: "Quiz", agent: "Sage", colour: "#1ABC9C", status: "generating" },
    { label: "Video Script", agent: "Director", colour: "#E74C3C", status: "generating" },
    { label: "Code Lab", agent: "Architect", colour: "#34495E", status: "pending" },
  ];

  return (
    <div className="w-full h-full flex flex-col justify-center p-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center gap-2 mb-6"
      >
        <div className="w-4 h-4 rounded-full border-2 border-sage-400 border-t-transparent animate-spin" />
        <span className="text-[11px] font-mono font-medium text-sage-500 tracking-wider uppercase">
          Generating Learning Materials
        </span>
      </motion.div>

      {/* Resource cards — spread across viewport */}
      <div className="space-y-3">
        {/* Top row: 3 cards */}
        <div className="grid grid-cols-3 gap-3">
          {resources.slice(0, 3).map((r, i) => (
            <motion.div
              key={r.label}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="rounded-xl p-4 border-t-2"
              style={{
                borderColor: r.colour,
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04), inset 0 1px 2px rgba(255,255,255,0.6)",
              }}
            >
              <p className="text-sm font-semibold text-deep-charcoal">{r.label}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.colour }} />
                <span className="text-[10px] font-mono text-deep-charcoal/50">{r.agent}</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                {r.status === "done" && (
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {r.status === "generating" && (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-sage-400 border-t-transparent animate-spin" />
                )}
                {r.status === "pending" && <div className="w-3.5 h-3.5 rounded-full bg-sand-300" />}
                <span className="text-[10px] text-deep-charcoal/40 capitalize">{r.status}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom row: 2 cards, centered */}
        <div className="grid grid-cols-2 gap-3 max-w-[66%] mx-auto">
          {resources.slice(3, 5).map((r, i) => (
            <motion.div
              key={r.label}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: (i + 3) * 0.1, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="rounded-xl p-4 border-t-2"
              style={{
                borderColor: r.colour,
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04), inset 0 1px 2px rgba(255,255,255,0.6)",
              }}
            >
              <p className="text-sm font-semibold text-deep-charcoal">{r.label}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.colour }} />
                <span className="text-[10px] font-mono text-deep-charcoal/50">{r.agent}</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                {r.status === "done" && (
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {r.status === "generating" && (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-sage-400 border-t-transparent animate-spin" />
                )}
                {r.status === "pending" && <div className="w-3.5 h-3.5 rounded-full bg-sand-300" />}
                <span className="text-[10px] text-deep-charcoal/40 capitalize">{r.status}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Agent swarm status strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6"
      >
        <div className="flex items-center justify-center gap-3 mb-3"
        >
          <div className="h-px w-10 bg-sage-300/40" />
          <span className="text-[10px] font-mono text-deep-charcoal/40 uppercase tracking-wider">
            Swarm Active
          </span>
          <div className="h-px w-10 bg-sage-300/40" />
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {resources.map((r) => (
            <div
              key={r.agent}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 border border-white/50"
              style={{
                background: "rgba(255,255,255,0.5)",
                backdropFilter: "blur(16px)",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: r.colour }} />
              <span className="text-[10px] font-mono text-deep-charcoal/70">{r.agent}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Step 4 : Progress ── */
function MasterView() {
  return (
    <div className="w-full h-full min-h-[380px] flex flex-col items-center justify-center p-6">
      <div
        className="rounded-2xl p-6 flex items-center gap-6 border border-white/60"
        style={{
          background: "rgba(255,255,255,0.45)",
          backdropFilter: "blur(24px)",
          boxShadow: "inset 0 1px 2px rgba(255,255,255,0.8), 0 12px 32px rgba(0,0,0,0.03)",
        }}
      >
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EDE8E0" strokeWidth="3" />
            <motion.path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#7C9A6B"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ strokeDasharray: "0 100" }}
              animate={{ strokeDasharray: "78 100" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-serif font-bold text-deep-charcoal" style={{ fontFamily: "var(--font-serif)" }}>
              78%
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold text-deep-charcoal">Module Mastery</p>
          <div className="space-y-1.5">
            {[
              { label: "Docker Fundamentals", value: 100, colour: "#7C9A6B" },
              { label: "Container Orchestration", value: 78, colour: "#F39C12" },
              { label: "K8s Networking", value: 45, colour: "#3498DB" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-deep-charcoal/60">{item.label}</span>
                  <span className="font-mono" style={{ color: item.colour }}>{item.value}%</span>
                </div>
                <div className="h-1.5 bg-sand-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.colour }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="mt-4 flex items-center gap-3 rounded-lg px-4 py-2.5 border border-white/50"
        style={{
          background: "rgba(255,255,255,0.5)",
          backdropFilter: "blur(16px)",
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4)",
        }}
      >
        <div className="w-8 h-8 rounded-full bg-sage-400/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-medium text-deep-charcoal">Next module unlocked</p>
          <p className="text-[10px] text-deep-charcoal/50">Advanced Pod Scheduling</p>
        </div>
        <motion.div
          className="ml-auto w-6 h-6 rounded-full bg-sage-400 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, type: "spring", stiffness: 200 }}
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}

const views = [DiscoverView, PlanView, LearnView, MasterView];

/* ═══════════════════════════════════════════
   MAIN SECTION
   ═══════════════════════════════════════════ */
export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { ref: titleRef, isInView: titleInView } = useInView<HTMLDivElement>();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const section = sectionRef.current;
    if (!section) return;

    const handleScroll = () => {
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top;
      const sectionHeight = rect.height;
      const viewportHeight = window.innerHeight;

      // Calculate how far through the section we've scrolled
      // 0 = section top reaches top of viewport
      // 1 = section bottom reaches top of viewport
      const scrollEnd = sectionHeight - viewportHeight;
      const currentScroll = -sectionTop;
      const progress = Math.max(0, Math.min(1, currentScroll / scrollEnd));

      setScrollProgress(progress);

      // Check if the section bottom is still in view (hide when section bottom reaches 60% of viewport)
      const sectionBottom = rect.bottom;
      const isSectionVisible = sectionBottom > viewportHeight * 0.85;

      // Find which step is currently in view by checking step elements
      const stepElements = document.querySelectorAll('[data-step-index]');
      let currentStep = 0;
      let closestDistance = Infinity;
      const viewportCenter = viewportHeight / 2;
      
      stepElements.forEach((el, i) => {
        const stepRect = el.getBoundingClientRect();
        const stepCenter = stepRect.top + stepRect.height / 2;
        const distance = Math.abs(stepCenter - viewportCenter);
        
        // Find the step closest to viewport center
        if (distance < closestDistance && stepRect.top < viewportHeight) {
          closestDistance = distance;
          currentStep = i;
        }
      });
      
      setActiveStep(isSectionVisible ? currentStep : -1);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mounted]);

  return (
    <section id="how-it-works" className="bg-sand-100 relative overflow-hidden" ref={sectionRef}>
      {/* Subtle aurora gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, rgba(124,154,107,0.5) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, rgba(52,152,219,0.5) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Floating progress indicator - only visible when at steps content */}
      <div
        className={`fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden xl:flex flex-col items-center gap-2 transition-all duration-200 ${
          scrollProgress > 0.01 && activeStep >= 0 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-20 pointer-events-none"
        }`}
      >
        <div className="glass-premium rounded-full px-3 py-4 border border-white/50 shadow-lg">
          <div className="flex flex-col items-center gap-3">
            {steps.map((step, i) => (
              <button
                key={step.number}
                onClick={() => {
                  const stepEl = document.querySelector(`[data-step-index="${i}"]`);
                  stepEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-300 ${
                  activeStep === i
                    ? "bg-sage-400 text-white scale-110 shadow-lg shadow-sage-400/30"
                    : activeStep > i
                    ? "bg-sage-200 text-sage-600"
                    : "bg-sand-200 text-deep-charcoal/40 hover:bg-sand-300"
                }`}
              >
                {step.number}
              </button>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-sand-200">
            <div className="text-[9px] font-mono text-deep-charcoal/40 text-center">
              {Math.round(scrollProgress * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 pt-32 pb-16">
        <div
          ref={titleRef}
          className={`text-center transition-all duration-700 ${titleInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <span className="text-xs font-semibold tracking-widest text-sage-500 uppercase">
            How It Works
          </span>
          <h2
            className="mt-4 text-4xl md:text-5xl font-serif font-semibold text-deep-charcoal"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.02em" }}
          >
            Four Steps. Infinite Personalization.
          </h2>
        </div>
      </div>

      {/* Fixed right side - centered in viewport, only visible when at steps content */}
      <div
        className={`fixed top-1/2 -translate-y-1/2 right-6 xl:right-[calc((100vw-1280px)/2+1rem)] w-[40%] max-w-[420px] z-40 hidden lg:block transition-all duration-200 ${
          scrollProgress > 0.01 && activeStep >= 0
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-20 pointer-events-none"
        }`}
      >
        <AnimatePresence mode="wait">
          {activeStep >= 0 && (
            <StepView key={activeStep} step={steps[activeStep]} index={activeStep} isActive={true} />
          )}
        </AnimatePresence>
      </div>

      {/* Split canvas */}
      <div className="max-w-7xl mx-auto px-6 pb-32">
        <div className="lg:flex lg:gap-16">
          {/* Left: scrolling steps */}
          <div className="relative lg:w-1/2">
            {/* Dynamic progress spine */}
            <div className="absolute left-0 top-0 bottom-0 w-px hidden lg:block">
              {/* Base line */}
              <div className="absolute inset-0 bg-sage-200/30" />
              {/* Active fill */}
              <div
                className="absolute top-0 left-0 w-full bg-sage-400 transition-all duration-150 ease-out"
                style={{ height: `${scrollProgress * 100}%` }}
              />
            </div>

            {steps.map((step, i) => (
              <StepText key={step.number} step={step} index={i} />
            ))}
          </div>

          {/* Right: placeholder to maintain layout spacing */}
          <div className="hidden lg:block lg:w-1/2" />
        </div>
      </div>
    </section>
  );
}

/* ── Bento Cell Component ── */
function BentoCell({ 
  children, 
  delay = 0, 
  className = "",
  span = "1",
  style = {}
}: { 
  children: React.ReactNode; 
  delay?: number; 
  className?: string;
  span?: "1" | "2" | "row";
  style?: React.CSSProperties;
}) {
  const spanClass = span === "2" ? "col-span-2" : span === "row" ? "col-span-2 row-span-2" : "";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: delay * 0.5, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className={`rounded-xl border border-white/50 p-3 ${spanClass} ${className}`}
      style={{
        background: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.7)",
        ...style
      }}
    >
      {children}
    </motion.div>
  );
}

/* ── Step 1: Discover - Bento Grid ── */
function DiscoverBento() {
  return (
    <div className="grid grid-cols-2 gap-2.5 auto-rows-fr">
      {/* Chat preview - spans 2 cols */}
      <BentoCell delay={0} span="2" className="!p-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-sage-400 flex items-center justify-center text-white text-[9px] font-bold shrink-0">N</div>
            <div className="bg-sage-400/10 rounded-lg rounded-tl-none px-2.5 py-1.5">
              <p className="text-[11px] text-deep-charcoal/80">What would you like to learn today?</p>
            </div>
          </div>
          <div className="flex items-start gap-2 flex-row-reverse">
            <div className="w-6 h-6 rounded-full bg-sand-300 flex items-center justify-center text-deep-charcoal text-[9px] font-bold shrink-0">You</div>
            <div className="bg-white rounded-lg rounded-tr-none px-2.5 py-1.5 border border-sand-200">
              <p className="text-[11px] text-deep-charcoal/80">Docker & Kubernetes from scratch</p>
            </div>
          </div>
        </div>
      </BentoCell>

      {/* Profile card */}
      <BentoCell delay={0.05}>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-4 h-4 rounded bg-purple-500/15 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          </div>
          <span className="text-[9px] font-mono font-semibold text-purple-600 uppercase">Profile</span>
        </div>
        <div className="space-y-1">
          {[{ l: "Level", v: "Beginner" }, { l: "Goal", v: "DevOps" }].map((i) => (
            <div key={i.l} className="flex justify-between text-[10px]">
              <span className="text-deep-charcoal/40">{i.l}</span>
              <span className="font-medium text-deep-charcoal">{i.v}</span>
            </div>
          ))}
        </div>
      </BentoCell>

      {/* Metric card */}
      <BentoCell delay={0.08} style={{ background: "rgba(155,89,182,0.08)" }}>
        <div className="h-full flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-serif font-bold text-purple-600">6</span>
          <span className="text-[9px] font-mono text-purple-500/70 uppercase">Dimensions</span>
        </div>
      </BentoCell>

      {/* Agent 1 */}
      <BentoCell delay={0.1}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-[9px] font-mono text-deep-charcoal/70">Profile Extractor</span>
        </div>
        <div className="h-1 bg-sand-200 rounded-full overflow-hidden">
          <motion.div className="h-full bg-purple-500 rounded-full" initial={{ width: 0 }} animate={{ width: "88%" }} transition={{ duration: 1.2 }} />
        </div>
        <span className="text-[8px] text-deep-charcoal/40 mt-1 block">Mapping context...</span>
      </BentoCell>

      {/* Agent 2 */}
      <BentoCell delay={0.12}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-[9px] font-mono text-deep-charcoal/70">Gap Detector</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {["Linux", "CLI"].map((g) => (
            <span key={g} className="px-1.5 py-0.5 rounded bg-orange-500/10 text-[8px] font-medium text-orange-600">{g}</span>
          ))}
        </div>
      </BentoCell>
    </div>
  );
}

/* ── Step 2: Plan - Bento Grid ── */
function PlanBento() {
  return (
    <div className="grid grid-cols-3 gap-2.5 auto-rows-fr">
      {/* Knowledge graph - main */}
      <BentoCell delay={0} span="2" className="!p-3 row-span-2">
        <div className="relative h-full min-h-[140px]">
          <svg className="absolute inset-0 w-full h-full">
            <path d="M 25 90 Q 60 60 100 50 Q 140 40 175 45" fill="none" stroke="#7C9A6B" strokeWidth="2" strokeDasharray="4 3" opacity="0.4" />
          </svg>
          {[
            { x: "12%", y: "75%", label: "Docker", active: true },
            { x: "48%", y: "40%", label: "K8s", active: true },
            { x: "85%", y: "35%", label: "Pods", active: false },
          ].map((n, i) => (
            <motion.div
              key={n.label}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 + i * 0.03 }}
              className={`absolute px-2 py-1 rounded-lg text-[9px] font-mono font-medium ${n.active ? "bg-sage-400 text-white shadow-sm" : "bg-sand-200 text-deep-charcoal/50"}`}
              style={{ left: n.x, top: n.y, transform: "translate(-50%, -50%)" }}
            >
              {n.label}
            </motion.div>
          ))}
        </div>
      </BentoCell>

      {/* Stats */}
      <BentoCell delay={0.05}>
        <span className="text-[8px] font-mono text-sage-500 uppercase tracking-wider">Topics</span>
        <p className="text-xl font-serif font-bold text-sage-600 mt-1">12</p>
      </BentoCell>

      <BentoCell delay={0.08}>
        <span className="text-[8px] font-mono text-sage-500 uppercase tracking-wider">Est. Time</span>
        <p className="text-xl font-serif font-bold text-sage-600 mt-1">4h</p>
      </BentoCell>

      {/* A* badge */}
      <BentoCell delay={0.1} span="2" style={{ background: "rgba(251,191,36,0.1)", borderColor: "rgba(251,191,36,0.25)" }}>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
          </svg>
          <div>
            <span className="text-[10px] font-semibold text-amber-700">A* Path Optimization</span>
            <span className="text-[9px] text-amber-600/60 block">Route calculated in 200ms</span>
          </div>
        </div>
      </BentoCell>

      {/* Agent status */}
      <BentoCell delay={0.12}>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[9px] font-mono text-deep-charcoal/60">Planner</span>
        </div>
        <span className="text-[8px] text-green-500 mt-1 block">✓ Ready</span>
      </BentoCell>
    </div>
  );
}

/* ── Step 3: Learn - Bento Grid ── */
function LearnBento() {
  const resources = [
    { label: "Notes", icon: "📝", colour: "#9B59B6", agent: "Scholar", done: true },
    { label: "Mind Map", icon: "🧠", colour: "#E67E22", agent: "Mapper", done: true },
    { label: "Code Lab", icon: "💻", colour: "#34495E", agent: "Architect", done: true },
    { label: "Quiz", icon: "❓", colour: "#1ABC9C", agent: "Sage", done: false },
    { label: "Video", icon: "🎬", colour: "#E74C3C", agent: "Director", done: false },
  ];

  const topRow = resources.slice(0, 2);
  const centerCard = resources[2];
  const bottomRow = resources.slice(3, 5);

  const renderCard = (r: typeof resources[0], i: number, span?: "2") => (
    <BentoCell key={r.label} delay={i * 0.03} className="!p-4" span={span}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{r.icon}</span>
          <span className="text-xs font-semibold text-deep-charcoal">{r.label}</span>
        </div>
        {r.done ? (
          <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center">
            <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-sage-400 border-t-transparent animate-spin" />
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.colour }} />
        <span className="text-[9px] font-mono text-deep-charcoal/50">{r.agent}</span>
      </div>
    </BentoCell>
  );

  return (
    <div className="grid grid-cols-2 gap-2.5 auto-rows-fr">
      {/* Top row: Notes, Mind Map */}
      {topRow.map((r, i) => renderCard(r, i))}

      {/* Center row: Code Lab - spans full width, centered content */}
      <BentoCell delay={0.08} span="2" className="!p-4">
        <div className="flex items-center justify-center gap-3">
          <span className="text-xl">{centerCard.icon}</span>
          <span className="text-sm font-semibold text-deep-charcoal">{centerCard.label}</span>
          <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center">
            <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: centerCard.colour }} />
            <span className="text-[9px] font-mono text-deep-charcoal/50">{centerCard.agent}</span>
          </div>
        </div>
      </BentoCell>

      {/* Bottom row: Quiz, Video */}
      {bottomRow.map((r, i) => renderCard(r, i + 3))}

      {/* Swarm status - spans 2 */}
      <BentoCell delay={0.15} span="2" style={{ background: "rgba(124,154,107,0.08)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {["#9B59B6", "#E67E22", "#1ABC9C", "#E74C3C", "#34495E"].map((c, i) => (
                <motion.div
                  key={i}
                  className="w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: c }}
                  animate={{ y: [0, -2, 0] }}
                  transition={{ delay: i * 0.1, duration: 0.8, repeat: Infinity }}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono text-deep-charcoal/70">5 agents generating</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-sage-600 font-semibold">2/5</span>
            <span className="text-[9px] text-deep-charcoal/40 block">complete</span>
          </div>
        </div>
      </BentoCell>
    </div>
  );
}

/* ── Step 4: Master - Bento Grid ── */
function MasterBento() {
  return (
    <div className="grid grid-cols-3 gap-2.5 auto-rows-fr">
      {/* Progress ring - main */}
      <BentoCell delay={0} className="row-span-2 !p-4">
        <div className="h-full flex flex-col items-center justify-center">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#EDE8E0" strokeWidth="3" />
              <motion.path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="#7C9A6B" strokeWidth="3" strokeLinecap="round"
                initial={{ strokeDasharray: "0 100" }}
                animate={{ strokeDasharray: "78 100" }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-serif font-bold text-deep-charcoal">78%</span>
            </div>
          </div>
          <span className="text-[10px] font-medium text-deep-charcoal/60 mt-2">Module Mastery</span>
        </div>
      </BentoCell>

      {/* Skill bars */}
      <BentoCell delay={0.05} span="2">
        <span className="text-[8px] font-mono text-sage-500 uppercase tracking-wider">Skills Progress</span>
        <div className="mt-2 space-y-2">
          {[
            { label: "Containers", value: 100, colour: "#7C9A6B" },
            { label: "Networking", value: 65, colour: "#3498DB" },
          ].map((s) => (
            <div key={s.label}>
              <div className="flex justify-between text-[9px] mb-0.5">
                <span className="text-deep-charcoal/50">{s.label}</span>
                <span className="font-mono" style={{ color: s.colour }}>{s.value}%</span>
              </div>
              <div className="h-1.5 bg-sand-200 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: s.colour }} initial={{ width: 0 }} animate={{ width: `${s.value}%` }} transition={{ duration: 1 }} />
              </div>
            </div>
          ))}
        </div>
      </BentoCell>

      {/* Milestone */}
      <BentoCell delay={0.08} span="2" style={{ background: "rgba(124,154,107,0.1)", borderColor: "rgba(124,154,107,0.25)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-sage-400 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-sage-700">Milestone Unlocked!</span>
            <span className="text-[9px] text-sage-600/60 block">Docker Fundamentals Complete</span>
          </div>
        </div>
      </BentoCell>

      {/* Next module */}
      <BentoCell delay={0.1} span="2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-medium text-deep-charcoal">Next: Pod Scheduling</span>
            <div className="h-1 bg-sand-200 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: "22%" }} />
            </div>
          </div>
          <span className="text-[9px] font-mono text-amber-600">22%</span>
        </div>
      </BentoCell>

      {/* Gate agent */}
      <BentoCell delay={0.12}>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[9px] font-mono text-deep-charcoal/60">Gate Agent</span>
        </div>
        <span className="text-[8px] text-green-500 mt-1 block">✓ Tracking</span>
      </BentoCell>
    </div>
  );
}

/* ── Bento views array ── */
const bentoViews = [DiscoverBento, PlanBento, LearnBento, MasterBento];

/* ── Step view for sticky layout ── */
function StepView({ step, index, isActive }: { step: (typeof steps)[0]; index: number; isActive: boolean }) {
  const BentoView = bentoViews[index];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      {/* Step label - floating badge */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sage-300/50"
        style={{
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-mono font-bold bg-sage-400 text-white">
          {step.number}
        </div>
        <span className="text-[11px] font-semibold text-deep-charcoal">{step.title}</span>
      </motion.div>

      {/* Bento grid */}
      <div 
        className="rounded-2xl p-3 border border-white/40"
        style={{
          background: "rgba(250,248,245,0.5)",
          backdropFilter: "blur(8px)",
        }}
      >
        <BentoView />
      </div>
    </motion.div>
  );
}
