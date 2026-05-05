"use client";

import { cn } from "@/lib/utils";

interface StatsPanelProps {
  mounted: boolean;
}

const stats = [
  { value: "87%", label: "Completion Rate" },
  { value: "6", label: "Weeks Avg" },
  { value: "4.9/5", label: "Rating" },
  { value: "12K+", label: "Users" },
];

export function StatsPanel({ mounted }: StatsPanelProps) {
  const fade = (delay = 0) =>
    cn(
      "transition-all duration-700 ease-out",
      mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
    );

  return (
    <div className={cn(fade(200), "p-6 rounded-xl bg-[#141414] border border-white/[0.04]")}>
      <div className="space-y-6">
        {stats.map((stat, i) => (
          <div key={stat.label} className={fade(i * 100)}>
            <p className="text-3xl font-semibold text-white">{stat.value}</p>
            <p className="text-sm text-white/40">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
