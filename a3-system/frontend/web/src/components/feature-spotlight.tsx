"use client";

import { useRef, useEffect, useState } from "react";
import { MessageSquare, GitBranch, Layers, HelpCircle, BarChart3, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureRowProps {
  label: string;
  headline: string;
  body: string;
  badges: string[];
  features: string[];
  reversed?: boolean;
  children?: React.ReactNode;
}

function FeatureRow({ label, headline, body, badges, features, reversed, children }: FeatureRowProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "grid md:grid-cols-2 gap-12 md:gap-20 items-center py-24",
        reversed && "md:[direction:rtl]"
      )}
    >
      <div className={cn("space-y-6", reversed && "md:[direction:ltr]")}>
        <p
          className={cn(
            "text-[11px] text-[#7C9A6B] uppercase tracking-[0.2em] font-medium font-[family-name:var(--font-mono)] transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {label}
        </p>
        <h3
          className={cn(
            "text-3xl md:text-4xl font-bold text-white leading-tight font-[family-name:var(--font-display)] transition-all duration-700 delay-100",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {headline}
        </h3>
        <p
          className={cn(
            "text-white/50 text-lg leading-relaxed transition-all duration-700 delay-200",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {body}
        </p>

        {/* Agent Badges */}
        <div
          className={cn(
            "flex flex-wrap gap-2 transition-all duration-700 delay-300",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {badges.map((badge) => (
            <span
              key={badge}
              className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 font-[family-name:var(--font-mono)]"
            >
              {badge}
            </span>
          ))}
        </div>

        {/* Feature List */}
        <ul
          className={cn(
            "space-y-3 transition-all duration-700 delay-400",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-sm text-white/60">
              <CheckCircle2 className="w-4 h-4 text-[#7C9A6B] shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div
        className={cn(
          "relative transition-all duration-700 delay-200",
          reversed && "md:[direction:ltr]",
          isVisible ? "opacity-100 translate-x-0" : reversed ? "opacity-0 -translate-x-8" : "opacity-0 translate-x-8"
        )}
      >
        <div className="glass-card p-8 min-h-[300px] flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}

export function FeatureSpotlight() {
  return (
    <section id="features" className="py-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-[11px] text-[#7C9A6B] uppercase tracking-[0.2em] mb-3 font-medium font-[family-name:var(--font-mono)]">
            See The Swarm In Action
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white font-[family-name:var(--font-display)]">
            Five Features. One Mind.
          </h2>
        </div>

        <FeatureRow
          label="Feature 01"
          headline="Your Profile, Built From Conversation"
          body="No forms. No quizzes. Just chat naturally. Our Profile Extractor and Gap Detector analyze every message to build a 6-dimension learning model — all in real-time."
          badges={["Profile Extractor", "Gap Detector"]}
          features={[
            "Knowledge base scoring (0.0-1.0 per topic)",
            "Cognitive style detection (visual / verbal / kinesthetic)",
            "Weak point identification via embedding analysis",
            "Confidence-weighted profile updates",
          ]}
        >
          <div className="w-full space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#7C9A6B]/20 flex items-center justify-center shrink-0 mt-1">
                <MessageSquare className="w-4 h-4 text-[#7C9A6B]" />
              </div>
              <div className="glass-card p-4 flex-1">
                <p className="text-xs text-white/60">I want to learn Docker and Kubernetes for my DevOps role</p>
              </div>
            </div>
            <div className="flex items-start gap-3 flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-[#9B59B6]/20 flex items-center justify-center shrink-0 mt-1">
                <span className="text-[10px] text-[#9B59B6] font-bold">AI</span>
              </div>
              <div className="glass-card p-4 flex-1 border-[#9B59B6]/20">
                <p className="text-xs text-white/60">Great choice! Detecting your profile... Knowledge base: Docker 0.2, K8s 0.0. Cognitive style: kinesthetic. Setting up your path.</p>
              </div>
            </div>
          </div>
        </FeatureRow>

        <FeatureRow
          label="Feature 02"
          headline="A* Path Planning Over Knowledge Graphs"
          body="A3 runs A* search across a knowledge graph of 500+ topics to find your optimal learning path. The Dynamic Adaptation Engine reshuffles your route based on quiz performance, goals, and engagement."
          badges={["Path Planner", "Recommender", "Gate Agent"]}
          features={[
            "PageRank-informed heuristics",
            "Real-time replanning on quiz events",
            "Milestone gates with unlock scoring",
            "Content-based + collaborative filtering",
          ]}
          reversed
        >
          <div className="w-full space-y-2">
            {["Cloud Fundamentals", "Linux Essentials", "Container Architecture", "Kubernetes", "Service Mesh"].map((topic, i) => (
              <div key={topic} className="flex items-center gap-3">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  i < 2 ? "bg-[#7C9A6B]" : i === 2 ? "bg-[#F39C12] animate-pulse" : "bg-white/20"
                )} />
                <span className={cn("text-sm", i < 2 ? "text-white/60" : i === 2 ? "text-white" : "text-white/30")}>{topic}</span>
                {i === 2 && <span className="ml-auto text-[10px] text-[#F39C12] font-[family-name:var(--font-mono)]">Current</span>}
              </div>
            ))}
            <div className="mt-4 p-3 rounded-lg bg-[#F39C12]/10 border border-[#F39C12]/20">
              <p className="text-[10px] text-[#F39C12] font-[family-name:var(--font-mono)]">Path optimized in 200ms</p>
            </div>
          </div>
        </FeatureRow>

        <FeatureRow
          label="Feature 03"
          headline="Five Agents. One Click. Instant Resources."
          body="The Orchestrator dispatches specialized agents in parallel — Scholar for notes, Mapper for mind maps, Sage for quizzes, Director for video scripts, Architect for code. All checked for faithfulness before delivery."
          badges={["Orchestrator", "Scholar", "Mapper", "Sage", "Director", "Architect"]}
          features={[
            "Parallel async generation (30-60s total)",
            "Streaming progress via SSE",
            "Faithfulness verification on every output",
            "Content moderation for safety",
          ]}
        >
          <div className="w-full grid grid-cols-2 gap-3">
            {[
              { name: "Scholar", color: "#9B59B6", status: "Done" },
              { name: "Mapper", color: "#E67E22", status: "Done" },
              { name: "Sage", color: "#1ABC9C", status: "Done" },
              { name: "Director", color: "#E74C3C", status: "Done" },
            ].map((agent) => (
              <div
                key={agent.name}
                className="p-3 rounded-xl border border-white/10 bg-white/5"
                style={{ borderColor: `${agent.color}30` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
                  <span className="text-[10px] text-white/60 font-[family-name:var(--font-mono)]">{agent.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" style={{ color: agent.color }} />
                  <span className="text-[10px] text-white/40">{agent.status}</span>
                </div>
              </div>
            ))}
          </div>
        </FeatureRow>

        <FeatureRow
          label="Feature 04"
          headline="Multimodal Tutoring — Text, Voice, Image, Diagram"
          body="Ask via text, speak your question, upload a diagram, or receive auto-generated Mermaid charts. The Tutor Engine uses RAG grounding, profile adaptation, and rolling context summarization for deep, contextual help."
          badges={["Tutor Engine", "Vision LLM", "ASR", "TTS", "Faithfulness Checker"]}
          features={[
            "Streaming SSE responses",
            "Voice input (iFlytek WebSocket)",
            "Voice output (Edge-TTS + caching)",
            "Image analysis (GPT-4o / Claude / Gemini)",
            "Auto-generated Mermaid diagrams",
            "Rolling context with LLM summarization",
          ]}
          reversed
        >
          <div className="w-full space-y-3">
            <div className="flex items-center gap-3">
              <div className="glass-card p-3 flex-1">
                <p className="text-xs text-white/60">Explain K8s pods with a diagram</p>
              </div>
            </div>
            <div className="glass-card p-4 border-[#3498DB]/20">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="w-4 h-4 text-[#3498DB]" />
                <span className="text-[10px] text-[#3498DB] font-[family-name:var(--font-mono)]">Tutor Engine</span>
              </div>
              <div className="p-3 rounded-lg bg-[#0A0A0F] border border-white/5">
                <pre className="text-[10px] text-[#7C9A6B] font-[family-name:var(--font-mono)] leading-relaxed">
                  {`graph TD
    A[Pod] --> B[Container 1]
    A --> C[Container 2]
    A --> D[Shared Storage]`}
                </pre>
              </div>
            </div>
          </div>
        </FeatureRow>

        <FeatureRow
          label="Feature 05"
          headline="Assessment That Adapts With You"
          body="Adaptive quizzes, automated grading (code + short answer), gate-based milestone unlocking, and comprehensive analytics. The Evaluator Agent identifies weak topics and triggers remedial resource generation automatically."
          badges={["Quiz Agent", "Coding Grader", "Evaluator", "Gate Agent"]}
          features={[
            "Dynamic difficulty based on mastery",
            "Judge0 sandbox for code execution",
            "LLM-based short answer evaluation",
            "Gate scoring (completion x quiz x engagement)",
            "Behavioral signal tracking",
          ]}
        >
          <div className="w-full">
            <div className="flex items-center justify-between mb-6">
              {[
                { label: "Completed", value: "87%", color: "#7C9A6B" },
                { label: "Quiz Avg", value: "92%", color: "#3498DB" },
                { label: "Engagement", value: "94%", color: "#9B59B6" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-[10px] text-white/40">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#7C9A6B]" />
                <span className="text-xs text-white/60">Weak topic detected: Service Mesh</span>
              </div>
              <div className="p-3 rounded-lg bg-[#7C9A6B]/10 border border-[#7C9A6B]/20">
                <p className="text-[10px] text-[#7C9A6B] font-[family-name:var(--font-mono)]">Auto-triggered: Remedial resources generated</p>
              </div>
            </div>
          </div>
        </FeatureRow>
      </div>
    </section>
  );
}
