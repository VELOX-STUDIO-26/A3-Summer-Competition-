"use client";

import Link from "next/link";
import { ArrowRight, Play, Home, BookOpen, Map, FolderKanban, BarChart3, Bell, Flame, Award, Target, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroProps {
  mounted: boolean;
}

export function Hero({ mounted }: HeroProps) {
  const fade = (delay = 0) =>
    cn(
      "transition-all duration-700 ease-out",
      "opacity-100 translate-y-0" // Always visible - animation was causing issues
    );

  return (
    <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="mesh-gradient" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Content */}
          <div>
            <div className={cn(fade(0), "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#B8C3C9] bg-[#E7E2D7] text-[#4a5568] text-xs font-medium tracking-wide mb-6")}>
              AI-NATIVE LEARNING SYSTEM
            </div>

            <h1 className={cn(fade(100), "text-4xl sm:text-5xl md:text-[56px] font-bold tracking-tight leading-[1.08] mb-6")}>
              <span className="text-[#2a2a2a]">A Learning System</span>
              <br />
              <span className="bg-gradient-to-r from-[#B8C3C9] via-[#8a9ba3] to-[#B8C3C9] bg-clip-text text-transparent">
                That Evolves With You
              </span>
            </h1>

            <p className={cn(fade(200), "text-lg text-[#555] leading-relaxed max-w-lg mb-8")}>
              A3 Learning uses multi-agent AI to understand you, generate what you need, and adapt in real-time to your progress.
            </p>

            <div className={cn(fade(300), "flex flex-wrap items-center gap-4 mb-10")}>
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#B8C3C9] text-white text-sm font-semibold hover:bg-[#8a9ba3] transition-all shadow-[0_0_20px_rgba(184,195,201,0.4)] hover:shadow-[0_0_30px_rgba(184,195,201,0.6)]"
              >
                Start Your Journey
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#D6CFC2] text-sm font-medium text-[#555] hover:bg-[#E7E2D7] hover:border-[#B8C3C9] transition-all"
              >
                <Play className="w-4 h-4" />
                See How It Works
              </a>
            </div>

            {/* Social Proof */}
            <div className={cn(fade(400), "flex items-center gap-4")}>
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9D2D6] to-[#E7E2D7] border border-[#D6CFC2] flex items-center justify-center text-[10px] text-[#4a5568] font-medium"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="w-4 h-4 text-[#f59e0b] fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-[#888]">Trusted by 12,000+ learners</p>
                <span className="text-[#D6CFC2]">•</span>
                <p className="text-sm text-[#888]">200+ universities</p>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Preview (hidden on mobile) */}
          <div className={cn(fade(500), "relative hidden lg:block")}>
            {/* Glow effect behind dashboard */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[#B8C3C9]/20 via-transparent to-[#C9D2D6]/15 rounded-3xl blur-2xl" />
            
            <div className="relative rounded-2xl bg-white shadow-2xl shadow-black/10 overflow-hidden border border-[#D6CFC2]">
              {/* Sidebar */}
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-[#E7E2D7] border-r border-[#D6CFC2] flex flex-col items-center py-5 gap-4">
                <div className="w-9 h-9 rounded-xl bg-[#B8C3C9] flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[#B8C3C9]/30">
                  A3
                </div>
                <div className="flex flex-col gap-2 mt-3">
                  <div className="w-9 h-9 rounded-xl bg-[#B8C3C9]/20 flex items-center justify-center">
                    <Home className="w-4 h-4 text-[#4a5568]" />
                  </div>
                  <div className="w-9 h-9 rounded-xl hover:bg-[#D6CFC2]/50 flex items-center justify-center transition-colors">
                    <BookOpen className="w-4 h-4 text-[#888]" />
                  </div>
                  <div className="w-9 h-9 rounded-xl hover:bg-[#D6CFC2]/50 flex items-center justify-center transition-colors">
                    <Map className="w-4 h-4 text-[#888]" />
                  </div>
                  <div className="w-9 h-9 rounded-xl hover:bg-[#D6CFC2]/50 flex items-center justify-center transition-colors">
                    <FolderKanban className="w-4 h-4 text-[#888]" />
                  </div>
                  <div className="w-9 h-9 rounded-xl hover:bg-[#D6CFC2]/50 flex items-center justify-center transition-colors">
                    <BarChart3 className="w-4 h-4 text-[#888]" />
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="w-9 h-9 rounded-xl hover:bg-[#D6CFC2]/50 flex items-center justify-center transition-colors">
                    <Settings className="w-4 h-4 text-[#888]" />
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="ml-16 p-6 bg-[#F7F5F0]">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[#2a2a2a] text-base font-medium">Good morning, Alex 👋</p>
                    <p className="text-[#888] text-sm">Your AI learning system is ready.</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-[#E7E2D7] border border-[#D6CFC2] flex items-center justify-center">
                    <Bell className="w-4 h-4 text-[#666]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Progress Card */}
                  <div className="p-5 rounded-2xl bg-white border border-[#D6CFC2]">
                    <p className="text-[11px] text-[#888] mb-4 uppercase tracking-wider font-medium">Today&apos;s Progress</p>
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-[#E7E2D7]" />
                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-[#B8C3C9]" strokeDasharray="176" strokeDashoffset="49" strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-[#2a2a2a]">72%</span>
                      </div>
                      <div>
                        <p className="text-xs text-[#888] mb-1">Module 3 of 6</p>
                        <p className="text-sm font-medium text-[#4a5568]">Containers & Orchestration</p>
                        <p className="text-[10px] text-[#999] mt-1">14/20 lessons</p>
                      </div>
                    </div>
                  </div>

                  {/* Streak Card */}
                  <div className="p-5 rounded-2xl bg-white border border-[#D6CFC2]">
                    <p className="text-[11px] text-[#888] mb-4 uppercase tracking-wider font-medium">Current Streak</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#f59e0b]/15 flex items-center justify-center">
                        <Flame className="w-6 h-6 text-[#f59e0b]" />
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-[#2a2a2a]">14</span>
                          <span className="text-sm text-[#888]">days</span>
                        </div>
                        <p className="text-[10px] text-[#999]">Keep it up!</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#E7E2D7]">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#999]">Weekly Goal</span>
                        <span className="text-[#4a5568]">6/10 lessons</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next Up Card */}
                <div className="mt-4 p-5 rounded-2xl bg-white border border-[#D6CFC2]">
                  <p className="text-[11px] text-[#888] mb-3 uppercase tracking-wider font-medium">Next Up</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#C9D2D6]/30 flex items-center justify-center shrink-0">
                      <span className="text-[#4a5568] font-bold text-sm">K8s</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#2a2a2a]">Kubernetes Deployments</p>
                      <p className="text-xs text-[#888]">Learn how to deploy and manage applications in Kubernetes.</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-[#999]">Lesson 3.4</span>
                        <span className="text-[10px] text-[#999]">•</span>
                        <span className="text-[10px] text-[#999]">25 min</span>
                      </div>
                    </div>
                    <button className="px-4 py-2 rounded-xl bg-[#B8C3C9] text-white text-xs font-semibold whitespace-nowrap hover:bg-[#8a9ba3] transition-colors shadow-lg shadow-[#B8C3C9]/30">
                      Continue
                    </button>
                  </div>
                </div>

                {/* AI Recommendation */}
                <div className="mt-4 p-4 rounded-2xl bg-[#C9D2D6]/20 border border-[#B8C3C9]/30">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#B8C3C9]/30 flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4 text-[#4a5568]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-[#555]">
                        <span className="text-[#4a5568] font-medium">AI Recommendation:</span> Based on your performance, we recommend practicing with Hands-on Lab.
                      </p>
                    </div>
                    <button className="text-xs text-[#4a5568] font-medium hover:text-[#2a2a2a] transition-colors whitespace-nowrap">
                      Start Now →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
