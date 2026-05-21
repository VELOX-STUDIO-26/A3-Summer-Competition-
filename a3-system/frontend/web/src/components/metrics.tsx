"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function CountUp({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, end, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

const stats = [
  { value: 15, suffix: "+", label: "AI Agents", sublabel: "Collaborating" },
  { value: 10000, suffix: "+", label: "Active", sublabel: "Learners" },
  { value: 500, suffix: "+", label: "Knowledge", sublabel: "Graph Nodes" },
  { value: 200, suffix: "ms", label: "Path Plan", sublabel: "Generation" },
];

export function Metrics() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-[#0A0A0F] relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px]"
          style={{
            background: "radial-gradient(ellipse, rgba(124,154,107,0.08), transparent 70%)",
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="text-center"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <p className="text-5xl md:text-6xl font-bold text-white mb-2 font-[family-name:var(--font-display)]">
                <CountUp end={stat.value} suffix={stat.suffix} />
              </p>
              <p className="text-sm text-white/60 font-medium">{stat.label}</p>
              <p className="text-xs text-white/30">{stat.sublabel}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
