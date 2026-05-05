"use client";

import { FileText, PenTool, Target, Video, Code, GitBranch, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiAgentProps {
  mounted: boolean;
}

const agents = [
  { 
    icon: FileText, 
    title: "Content Researcher", 
    desc: "Finds and organizes the most relevant knowledge.",
    iconBg: "bg-purple-200/60",
    iconColor: "text-purple-600",
    iconBorder: "border-purple-300"
  },
  { 
    icon: PenTool, 
    title: "Instructional Designer", 
    desc: "Creates structured learning materials tailored to you.",
    iconBg: "bg-blue-200/60",
    iconColor: "text-blue-600",
    iconBorder: "border-blue-300"
  },
  { 
    icon: Target, 
    title: "Assessment Expert", 
    desc: "Generates quizzes and evaluates understanding.",
    iconBg: "bg-orange-200/60",
    iconColor: "text-orange-600",
    iconBorder: "border-orange-300"
  },
  { 
    icon: Video, 
    title: "Media Creator", 
    desc: "Produces diagrams, videos and multimedia.",
    iconBg: "bg-pink-200/60",
    iconColor: "text-pink-600",
    iconBorder: "border-pink-300"
  },
  { 
    icon: Code, 
    title: "Code Engineer", 
    desc: "Builds and tests real-world coding exercises.",
    iconBg: "bg-[#C9D2D6]/40",
    iconColor: "text-[#4a5568]",
    iconBorder: "border-[#B8C3C9]/50"
  },
];

export function MultiAgent({ mounted }: MultiAgentProps) {
  const fade = (delay = 0) =>
    cn(
      "transition-all duration-700 ease-out",
      "opacity-100 translate-y-0"
    );

  return (
    <section id="technology" className="py-16 sm:py-24 px-4 sm:px-6 bg-[#E7E2D7]/30">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className={cn(fade(), "text-center max-w-2xl mx-auto mb-16")}>
          <p className="text-[11px] text-[#4a5568] uppercase tracking-widest mb-3 font-medium">
            BUILT DIFFERENT
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-[#2a2a2a]">
            Powered by Multi-Agent Intelligence
          </h2>
          <p className="text-[#666]">
            Five specialized AI agents collaborate under an orchestrator to deliver 
            high-quality, accurate and personalized learning experiences.
          </p>
        </div>

        {/* 5-Column Agent Grid - Bento Box Style */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          {agents.map((agent, i) => (
            <div
              key={agent.title}
              className={cn(
                fade(i * 50),
                "group relative p-5 rounded-2xl bg-white backdrop-blur-sm border border-[#D6CFC2] hover:bg-[#F7F5F0] hover:border-[#B8C3C9] hover:-translate-y-1 transition-all duration-300"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center border mb-4",
                agent.iconBg,
                agent.iconBorder
              )}>
                <agent.icon className={cn("w-5 h-5", agent.iconColor)} />
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-[#2a2a2a] mb-2">{agent.title}</h3>

              {/* Description */}
              <p className="text-[11px] text-[#666] leading-relaxed">{agent.desc}</p>
            </div>
          ))}
        </div>

        {/* Orchestrator Card - Full Width */}
        <div className={cn(fade(300), "relative")}>
          <div className="p-6 rounded-2xl bg-[#C9D2D6]/20 backdrop-blur-sm border border-[#B8C3C9]/40 hover:bg-[#C9D2D6]/30 transition-all duration-300">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-[#B8C3C9]/30 border border-[#B8C3C9]/50 flex items-center justify-center shrink-0">
                <GitBranch className="w-6 h-6 text-[#4a5568]" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-base font-semibold text-[#2a2a2a] mb-1">Orchestrator Agent</h3>
                <p className="text-sm text-[#666]">
                  Coordinates all agents, ensures quality, and delivers the best results. 
                  It manages the workflow, resolves conflicts, and optimizes for your learning goals.
                </p>
              </div>

              {/* CTA */}
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#D6CFC2] bg-white text-sm text-[#555] hover:bg-[#E7E2D7] hover:text-[#2a2a2a] transition-all whitespace-nowrap">
                Explore the Architecture
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
