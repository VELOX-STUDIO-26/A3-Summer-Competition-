"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    quote: "NOBOGYAN didn't just teach me cloud computing — it understood exactly where I was struggling and adapted the entire curriculum around my weak points. The agent swarm feels like having a personal tutor available 24/7.",
    name: "Sarah Chen",
    role: "DevOps Engineer @ TechCorp",
    style: "visual",
    rating: 5,
  },
  {
    quote: "I've tried dozens of learning platforms. None of them adapted to my pace like NOBOGYAN. When I struggled with Kubernetes networking, it automatically generated simpler prerequisite content without me asking.",
    name: "Marcus Johnson",
    role: "CS Student @ Stanford",
    style: "kinesthetic",
    rating: 5,
  },
  {
    quote: "The multimodal tutor is incredible. I uploaded an architecture diagram and it explained every component, then generated a quiz to test my understanding. It's like having an entire AI team.",
    name: "Elena Rodriguez",
    role: "Solutions Architect @ CloudFirst",
    style: "verbal",
    rating: 5,
  },
  {
    quote: "As someone who learns best by doing, the hands-on coding exercises with instant feedback changed everything. The code grader caught mistakes I didn't even know I was making.",
    name: "David Kim",
    role: "Software Engineer @ StartupXYZ",
    style: "kinesthetic",
    rating: 5,
  },
  {
    quote: "The learning path visualization makes complex topics feel manageable. Seeing my progress through the knowledge graph and watching the A* algorithm optimize my route is genuinely motivating.",
    name: "Priya Patel",
    role: "Data Engineer @ FinanceHub",
    style: "visual",
    rating: 5,
  },
];

const styleColors: Record<string, string> = {
  visual: "#9B59B6",
  verbal: "#3498DB",
  kinesthetic: "#E67E22",
};

export function Testimonials() {
  const [current, setCurrent] = useState(0);
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

  const next = () => setCurrent((c) => (c + 1) % testimonials.length);
  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);

  return (
    <section ref={ref} className="py-24 px-4 sm:px-6 relative overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p
            className={cn(
              "text-[11px] text-[#7C9A6B] uppercase tracking-[0.2em] mb-3 font-medium font-[family-name:var(--font-mono)] transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            Voices
          </p>
          <h2
            className={cn(
              "text-3xl md:text-5xl font-bold text-white font-[family-name:var(--font-display)] transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            Loved by Learners Worldwide
          </h2>
        </div>

        <div
          className={cn(
            "relative transition-all duration-700 delay-200",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          {/* Main Card */}
          <div className="glass-card p-8 md:p-12 relative">
            <Quote className="absolute top-8 right-8 w-12 h-12 text-white/5" />

            <div className="relative z-10">
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {Array.from({ length: testimonials[current].rating }).map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-[#f59e0b] fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-xl md:text-2xl text-white/80 leading-relaxed mb-8 font-[family-name:var(--font-display)] italic">
                "{testimonials[current].quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{
                    background: `linear-gradient(135deg, ${styleColors[testimonials[current].style]}40, ${styleColors[testimonials[current].style]}20)`,
                    border: `2px solid ${styleColors[testimonials[current].style]}60`,
                  }}
                >
                  {testimonials[current].name.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-medium">{testimonials[current].name}</p>
                  <p className="text-sm text-white/40">{testimonials[current].role}</p>
                </div>
                <div
                  className="ml-auto px-3 py-1 rounded-full text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider"
                  style={{
                    background: `${styleColors[testimonials[current].style]}15`,
                    color: styleColors[testimonials[current].style],
                    border: `1px solid ${styleColors[testimonials[current].style]}30`,
                  }}
                >
                  {testimonials[current].style}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    i === current ? "bg-[#7C9A6B] w-6" : "bg-white/20 hover:bg-white/40"
                  )}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
