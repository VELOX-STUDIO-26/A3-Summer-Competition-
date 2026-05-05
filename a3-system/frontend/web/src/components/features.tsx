"use client";

import { MessageSquare, FolderKanban, Target, BarChart3, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeaturesProps {
  mounted: boolean;
}

const features = [
  { icon: MessageSquare, title: "Real-time AI Tutor", desc: "Ask follow-up with text, voice, diagrams." },
  { icon: FolderKanban, title: "Hands-on Projects", desc: "Apply your skills with real-world labs." },
  { icon: Target, title: "Smart Assessments", desc: "AI creates quizzes for your level." },
  { icon: BarChart3, title: "Detailed Analytics", desc: "See your strengths and weaknesses." },
  { icon: LayoutGrid, title: "Multi-modal Learning", desc: "Text, audio, images, code and video." },
];

export function Features({ mounted }: FeaturesProps) {
  const fade = (delay = 0) =>
    cn(
      "transition-all duration-700 ease-out",
      mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
    );

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className={cn(fade(), "mb-12")}>
          <h2 className="text-3xl font-semibold mb-1 text-white">Everything You Need.</h2>
          <h2 className="text-3xl font-semibold text-[#2DD4BF]">All in One Place.</h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={cn(
                fade(i * 100),
                "flex items-start gap-4 group"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-[#2DD4BF]/10 flex items-center justify-center shrink-0 group-hover:bg-[#2DD4BF]/20 transition-colors">
                <feature.icon className="w-5 h-5 text-[#2DD4BF]" />
              </div>
              <div>
                <h3 className="text-base font-medium text-white/90 mb-1">{feature.title}</h3>
                <p className="text-sm text-white/40">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
