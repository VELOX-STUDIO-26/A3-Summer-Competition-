"use client";

import { MessageSquare, Layers, MapIcon, HelpCircle, BarChart3, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemFlowProps {
  mounted: boolean;
}

const steps = [
  { 
    num: "1", 
    title: "Understand You", 
    desc: "AI conversations build your 6-dimensional learner profile.", 
    icon: MessageSquare,
    iconBg: "bg-[#C9D2D6]/40",
    iconColor: "text-[#4a5568]",
    iconBorder: "border-[#B8C3C9]/50"
  },
  { 
    num: "2", 
    title: "Generate Resources", 
    desc: "Five AI agents create personalized notes, quizzes, videos, code and more.", 
    icon: Layers,
    iconBg: "bg-purple-200/60",
    iconColor: "text-purple-600",
    iconBorder: "border-purple-300"
  },
  { 
    num: "3", 
    title: "Plan Your Path", 
    desc: "Adaptive AI builds the perfect roadmap and reorders as you grow.", 
    icon: MapIcon,
    iconBg: "bg-blue-200/60",
    iconColor: "text-blue-600",
    iconBorder: "border-blue-300"
  },
  { 
    num: "4", 
    title: "Learn & Get Help", 
    desc: "Real-time AI tutor answers, explains with diagrams, voice and videos.", 
    icon: HelpCircle,
    iconBg: "bg-orange-200/60",
    iconColor: "text-orange-600",
    iconBorder: "border-orange-300"
  },
  { 
    num: "5", 
    title: "Analyze & Adapt", 
    desc: "AI analyzes your behavior and performance to keep improving your path.", 
    icon: BarChart3,
    iconBg: "bg-[#C9D2D6]/40",
    iconColor: "text-[#4a5568]",
    iconBorder: "border-[#B8C3C9]/50"
  },
];

export function SystemFlow({ mounted }: SystemFlowProps) {
  const fade = (delay = 0) =>
    cn(
      "transition-all duration-700 ease-out",
      "opacity-100 translate-y-0"
    );

  return (
    <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className={cn(fade(), "text-center max-w-2xl mx-auto mb-20")}>
          <p className="text-[11px] text-[#4a5568] uppercase tracking-widest mb-3 font-medium">
            THE A3 LEARNING LOOP
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#2a2a2a]">
            A Self-Evolving Learning System
          </h2>
        </div>

        {/* Steps Flow with Feedback Loop */}
        <div className="relative">
          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative z-10">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className={cn(fade(i * 100), "relative pt-8")}
              >
                {/* Icon - Positioned at top, slightly outside */}
                <div className={cn(
                  "absolute -top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-xl flex items-center justify-center border z-20",
                  step.iconBg,
                  step.iconBorder
                )}>
                  <step.icon className={cn("w-5 h-5", step.iconColor)} />
                </div>

                {/* Card */}
                <div className="relative p-5 pt-10 rounded-2xl bg-white backdrop-blur-sm border border-[#D6CFC2] group hover:bg-[#E7E2D7]/30 hover:border-[#B8C3C9] transition-all duration-300 h-full">
                  {/* Number Badge - Top left, slightly outside */}
                  <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-[#E7E2D7] border border-[#D6CFC2] flex items-center justify-center z-20">
                    <span className="text-xs font-semibold text-[#4a5568]">{step.num}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-[#2a2a2a] mb-2 mt-2">{step.title}</h3>

                  {/* Description */}
                  <p className="text-[12px] text-[#666] leading-relaxed">{step.desc}</p>
                </div>

                {/* Arrow to next card (except last) */}
                {i < 4 && (
                  <div className="hidden md:flex absolute top-[60px] -right-3 items-center z-30">
                    <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                      <path d="M0 6H20M20 6L15 1M20 6L15 11" stroke="rgba(184,195,201,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Feedback Loop - Desktop */}
          <div className={cn(fade(500), "hidden md:block relative mt-6")}>
            {/* Container for lines and pill */}
            <div className="relative">
              {/* SVG for curved connection lines */}
              <svg 
                className="absolute w-full pointer-events-none" 
                style={{ height: '80px', top: '0' }}
                viewBox="0 0 1000 80"
                preserveAspectRatio="none"
              >
                {/* Left curved path - from first card to feedback loop */}
                <path 
                  d="M 100 0 L 100 30 Q 100 50 130 50 L 460 50" 
                  fill="none" 
                  stroke="rgba(184, 195, 201, 0.6)" 
                  strokeWidth="1.5" 
                  strokeDasharray="6 4"
                />
                {/* Left arrow pointing right into the pill */}
                <polygon points="455,47 465,50 455,53" fill="rgba(184, 195, 201, 0.7)" />
                
                {/* Right curved path - from last card to feedback loop */}
                <path 
                  d="M 900 0 L 900 30 Q 900 50 870 50 L 540 50" 
                  fill="none" 
                  stroke="rgba(184, 195, 201, 0.6)" 
                  strokeWidth="1.5" 
                  strokeDasharray="6 4"
                />
                {/* Right arrow pointing left into the pill */}
                <polygon points="545,47 535,50 545,53" fill="rgba(184, 195, 201, 0.7)" />
              </svg>
              
              {/* Feedback Loop Pill - positioned in the middle where arrows meet */}
              <div className="flex justify-center pt-8">
                <div className="inline-flex flex-col items-center gap-1.5 px-6 py-3 rounded-2xl bg-white border border-[#B8C3C9] shadow-lg shadow-[#B8C3C9]/20 relative z-10">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#4a5568]" />
                    <span className="text-sm text-[#2a2a2a] font-medium">Continuous Feedback Loop</span>
                  </div>
                  <p className="text-[11px] text-[#888]">
                    System gets smarter with every interaction
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: Simple pill */}
          <div className={cn(fade(500), "md:hidden mt-8 flex justify-center")}>
            <div className="inline-flex flex-col items-center gap-2 px-6 py-3 rounded-xl bg-white border border-[#B8C3C9]">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#4a5568]" />
                <span className="text-sm text-[#2a2a2a] font-medium">Continuous Feedback Loop</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
