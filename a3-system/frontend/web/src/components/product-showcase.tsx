"use client";

import { CheckCircle2, Circle, Lock, MessageSquare, FolderKanban, Target, BarChart3, LayoutGrid, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductShowcaseProps {
  mounted: boolean;
}

const learningPath = [
  { title: "Cloud Fundamentals", status: "completed", progress: "100%" },
  { title: "Linux Essentials", status: "completed", progress: "100%" },
  { title: "Networking Basics", status: "completed", progress: "100%" },
  { title: "Container Architecture", status: "in_progress", progress: "72%" },
  { title: "Virtual Machines", status: "locked", progress: "0%" },
  { title: "Storage & Databases", status: "locked", progress: "0%" },
];

const features = [
  { title: "Real-time AI Tutor", desc: "Get instant help with text, voice, diagrams and videos." },
  { title: "Hands-on Projects", desc: "Apply your skills with real-world, industry-grade projects." },
  { title: "Smart Assessments", desc: "AI creates quizzes that adapt to your level." },
  { title: "Detailed Analytics", desc: "Track progress, strengths, weaknesses and trends." },
  { title: "Multi-Modal Learning", desc: "Text, audio, images, code and video — seamlessly." },
];

const stats = [
  { value: "87%", label: "Completion Rate", highlight: true },
  { value: "6", label: "Weeks", sublabel: "Avg. to Master a Module" },
  { value: "4.9/5", label: "Learner Rating", stars: true },
  { value: "12K+", label: "Active Learners" },
];

export function ProductShowcase({ mounted }: ProductShowcaseProps) {
  const fade = (delay = 0) =>
    cn(
      "transition-all duration-700 ease-out",
      "opacity-100 translate-y-0"
    );

  return (
    <section id="product" className="py-16 sm:py-24 px-4 sm:px-6 bg-[#F7F5F0]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className={cn(fade(), "mb-12")}>
          <h2 className="text-3xl md:text-4xl font-bold text-[#2a2a2a] mb-2">Everything You Need.</h2>
          <h2 className="text-3xl md:text-4xl font-bold text-[#4a5568]">All in One Place.</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Column - Learning Path UI */}
          <div className={cn(fade(100), "md:col-span-1 lg:col-span-5")}>
            <div className="p-6 rounded-2xl bg-white border border-[#D6CFC2] shadow-sm h-full">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-4 h-4 text-[#4a5568]" />
                <p className="text-sm font-medium text-[#2a2a2a]">Your Learning Path</p>
              </div>
              
              <div className="space-y-3">
                {learningPath.map((item, i) => (
                  <div 
                    key={item.title} 
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-xl transition-all",
                      item.status === "in_progress" && "bg-[#C9D2D6]/20 border border-[#B8C3C9]/40",
                      item.status === "completed" && "bg-[#E7E2D7]/40",
                      item.status === "locked" && "opacity-50"
                    )}
                  >
                    {/* Status Icon */}
                    <div className="shrink-0">
                      {item.status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5 text-[#4a5568]" />
                      ) : item.status === "in_progress" ? (
                        <div className="w-5 h-5 rounded-full border-2 border-[#B8C3C9] flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-[#B8C3C9]" />
                        </div>
                      ) : (
                        <Lock className="w-5 h-5 text-[#999]" />
                      )}
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        item.status === "locked" ? "text-[#999]" : "text-[#2a2a2a]"
                      )}>
                        {item.title}
                      </p>
                    </div>

                    {/* Progress/Status */}
                    <div className="shrink-0">
                      {item.status === "completed" ? (
                        <span className="text-xs text-[#4a5568] font-medium">Completed</span>
                      ) : item.status === "in_progress" ? (
                        <span className="text-xs text-[#4a5568] font-medium">{item.progress}</span>
                      ) : (
                        <span className="text-xs text-[#999]">Locked</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Tutor Preview */}
              <div className="mt-6 pt-6 border-t border-[#D6CFC2]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-[#B8C3C9] flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">AI</span>
                  </div>
                  <span className="text-xs font-medium text-[#4a5568]">AI Tutor</span>
                </div>
                <div className="p-3 rounded-xl bg-[#C9D2D6]/20 border border-[#B8C3C9]/30">
                  <p className="text-xs text-[#555]">
                    &quot;Great progress on containers! Ready to dive into orchestration?&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Features with Checkmarks */}
          <div className={cn(fade(200), "md:col-span-1 lg:col-span-4")}>
            <div className="space-y-5">
              {features.map((feature, i) => (
                <div key={feature.title} className="flex items-start gap-4">
                  {/* Emerald Checkmark */}
                  <div className="w-6 h-6 rounded-full bg-[#C9D2D6]/40 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-[#4a5568]" />
                  </div>
                  
                  {/* Content */}
                  <div>
                    <h3 className="text-sm font-semibold text-[#2a2a2a] mb-1">{feature.title}</h3>
                    <p className="text-xs text-[#666] leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Stats Stack */}
          <div className={cn(fade(300), "md:col-span-2 lg:col-span-3")}>
            <div className="p-6 rounded-2xl bg-white border border-[#D6CFC2] shadow-sm h-full">
              <div className="space-y-6">
                {stats.map((stat, i) => (
                  <div key={stat.label} className={cn(i > 0 && "pt-6 border-t border-[#D6CFC2]")}>
                    <p className={cn(
                      "text-4xl font-bold mb-1",
                      stat.highlight ? "text-[#4a5568]" : "text-[#2a2a2a]"
                    )}>
                      {stat.value}
                    </p>
                    {stat.stars && (
                      <div className="flex gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <svg
                            key={s}
                            className="w-3 h-3 text-[#f59e0b] fill-current"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-[#666]">{stat.label}</p>
                    {stat.sublabel && (
                      <p className="text-xs text-[#999]">{stat.sublabel}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
