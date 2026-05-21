"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  name: string;
  role: string;
  color: string;
  icon: React.ReactNode;
  className?: string;
  dark?: boolean;
}

type Status = "active" | "processing" | "idle";

const statusColors: Record<Status, string> = {
  active: "bg-green-400",
  processing: "bg-amber-400",
  idle: "bg-blue-400",
};

export default function AgentCard({ name, role, color, icon, className, dark = false }: AgentCardProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const statuses: Status[] = ["active", "processing", "idle"];
      setStatus(statuses[Math.floor(Math.random() * statuses.length)]);
      setPulse(Math.random() > 0.6);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        "relative rounded-2xl p-5 transition-all duration-300 cursor-default group",
        dark
          ? "bg-white/5 border-white/10 hover:bg-white/10"
          : "bg-white border-sand-200 hover:bg-sand-50 shadow-sm",
        "hover:scale-[1.02]",
        className
      )}
      style={{
        boxShadow: pulse ? `0 0 20px ${color}30, 0 0 40px ${color}10` : undefined,
        borderColor: pulse ? `${color}40` : undefined,
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-4 right-4 h-1 rounded-full"
        style={{ backgroundColor: color }}
      />

      {/* Status dot */}
      <div
        className={cn(
          "absolute top-3 right-3 w-2 h-2 rounded-full transition-colors duration-300",
          statusColors[status]
        )}
      />

      <div className="flex items-start gap-3 mt-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div>
          <h4 className={cn("font-semibold text-sm", dark ? "text-white" : "text-deep-charcoal")}>
            {name}
          </h4>
          <p className={cn("text-xs mt-0.5", dark ? "text-white/50" : "text-deep-charcoal/50")}>
            {role}
          </p>
        </div>
      </div>
    </div>
  );
}
