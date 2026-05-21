"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Orb {
  color: string;
  size: number;
  radius: number;
  speed: number;
  delay: number;
  label: string;
  status?: string;
  direction?: "clockwise" | "counter";
}

// Main agent orbs with varied directions
const orbs: Orb[] = [
  { color: "#9B59B6", size: 18, radius: 88, speed: 20, delay: 0, label: "Scholar", status: "Generating...", direction: "clockwise" },
  { color: "#E67E22", size: 16, radius: 75, speed: 15, delay: -5, label: "Mapper", direction: "counter" },
  { color: "#1ABC9C", size: 14, radius: 62, speed: 12, delay: -3, label: "Sage", direction: "clockwise" },
  { color: "#E74C3C", size: 16, radius: 102, speed: 25, delay: -8, label: "Director", direction: "counter" },
  { color: "#34495E", size: 12, radius: 48, speed: 10, delay: -2, label: "Architect", direction: "clockwise" },
];

const smallOrbs: Orb[] = [
  { color: "#3498DB", size: 7, radius: 35, speed: 8, delay: 0, label: "Tutor", status: "Streaming...", direction: "counter" },
  { color: "#F39C12", size: 7, radius: 42, speed: 9, delay: -2, label: "Planner", status: "Optimizing...", direction: "clockwise" },
  { color: "#2ECC71", size: 7, radius: 30, speed: 7, delay: -4, label: "Faithful", direction: "counter" },
  { color: "#9B59B6", size: 7, radius: 38, speed: 8.5, delay: -1, label: "Evaluator", direction: "clockwise" },
];

// Typing effect hook
function useTypingEffect(text: string, speed: number = 50) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText("");
    setIsComplete(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayedText, isComplete };
}

// Live terminal tooltip component
function LiveTerminal({ status, color, delay = 0 }: { status: string; color: string; delay?: number }) {
  const { displayedText, isComplete } = useTypingEffect(status, 60);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.2, duration: 0.4 }}
      className="glass rounded-lg px-3 py-2 border border-white/50 shadow-sm backdrop-blur-md"
      style={{ zIndex: 20 }}
    >
      <div className="flex items-center gap-2">
        {/* Live status dot with glow */}
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: color }}
          />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }} />
        </span>
        {/* Typing text */}
        <p className="text-[10px] font-mono text-deep-charcoal/80">
          {displayedText}
          {!isComplete && showCursor && (
            <span className="inline-block w-1.5 h-3 bg-deep-charcoal/50 ml-0.5 animate-pulse" />
          )}
        </p>
      </div>
    </motion.div>
  );
}

export default function OrbitalSystem() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
      container.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    };

    const handleMouseLeave = () => {
      container.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg)";
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full transition-transform duration-300 ease-out"
      style={{ transformStyle: "preserve-3d", willChange: "transform" }}
    >
      {/* Central Core - Multi-layered with breathing glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="relative">
          {/* Outer breathing glow */}
          <motion.div
            className="absolute -inset-8 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(124,154,107,0.15) 0%, transparent 70%)" }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          {/* Core layers */}
          <div className="w-16 h-16 rounded-full bg-sage-400/20" />
          <div className="absolute inset-2 rounded-full bg-sage-400/40" />
          {/* Rotating dash ring around core - CSS animation for performance */}
          <div
            className="absolute -inset-1 rounded-full border-2 border-dashed border-sage-400/30 animate-spin"
            style={{ animationDuration: "8s" }}
          />
          <motion.div
            className="absolute inset-5 rounded-full bg-sage-400 flex items-center justify-center shadow-lg"
            style={{ boxShadow: "0 0 30px rgba(124,154,107,0.5)" }}
            animate={{
              boxShadow: [
                "0 0 20px rgba(124,154,107,0.4)",
                "0 0 40px rgba(124,154,107,0.6)",
                "0 0 20px rgba(124,154,107,0.4)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="text-[#111111] font-mono text-[10px] font-bold">N</span>
          </motion.div>
        </div>
      </div>

      {/* Differentiated Orbit Rings - using CSS animations for performance */}
      {/* Inner ring - solid faint */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full animate-spin"
        style={{
          width: 96,
          height: 96,
          border: "1px solid rgba(124, 154, 107, 0.1)",
          animationDuration: "40s",
        }}
      />
      {/* Middle ring - widely spaced dash */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full animate-spin"
        style={{
          width: 150,
          height: 150,
          border: "1px dashed rgba(124, 154, 107, 0.25)",
          animationDuration: "60s",
          animationDirection: "reverse",
        }}
      />
      {/* Outer ring - rapid dot-density */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full animate-spin"
        style={{
          width: 204,
          height: 204,
          border: "1px dotted rgba(124, 154, 107, 0.2)",
          animationDuration: "80s",
        }}
      />

      {/* Faint Axis Markings at Cardinal Points */}
      {[
        { label: "0°", x: "50%", y: "5%" },
        { label: "90°", x: "95%", y: "50%" },
        { label: "180°", x: "50%", y: "95%" },
        { label: "270°", x: "5%", y: "50%" },
      ].map((mark) => (
        <div
          key={mark.label}
          className="absolute text-[8px] font-mono text-deep-charcoal/20"
          style={{
            left: mark.x,
            top: mark.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          {mark.label}
        </div>
      ))}

      {/* Crosshairs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-sage-300/10 to-transparent" />
        <div className="absolute left-1/2 top-[10%] bottom-[10%] w-px bg-gradient-to-b from-transparent via-sage-300/10 to-transparent" />
      </div>

      {/* Main satellite orbits - CSS animations for performance */}
      {orbs.map((orb, i) => (
        <div key={i}>
          {/* Orbiting agent with trail */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin"
            style={{
              animationDuration: `${orb.speed}s`,
              animationDirection: orb.direction === "counter" ? "reverse" : "normal",
            }}
          >
            {/* Orbit radius offset */}
            <div style={{ transform: `translateX(${orb.radius}px)` }}>
              {/* Comet trail effect - static for performance */}
              <div
                className="absolute rounded-full"
                style={{
                  width: orb.size * 2,
                  height: orb.size * 2,
                  backgroundColor: orb.color,
                  filter: "blur(8px)",
                  opacity: 0.2,
                  transform: orb.direction === "counter" ? "translateX(15px)" : "translateX(-15px)",
                }}
              />
              {/* Main agent bubble */}
              <div
                className="rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 relative"
                style={{
                  width: orb.size * 2,
                  height: orb.size * 2,
                  backgroundColor: orb.color,
                  boxShadow: `0 0 12px ${orb.color}50, 0 0 24px ${orb.color}30`,
                  zIndex: 5,
                }}
              >
                <span className="text-white font-mono text-[7px] font-medium whitespace-nowrap">
                  {orb.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Small system orbits - CSS animations for performance */}
      {smallOrbs.map((orb, i) => (
        <div
          key={`small-${i}`}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin"
          style={{
            animationDuration: `${orb.speed}s`,
            animationDirection: orb.direction === "counter" ? "normal" : "reverse",
          }}
        >
          <div style={{ transform: `translateX(${orb.radius}px)` }}>
            {/* Subtle trail for small orbs */}
            <div
              className="absolute rounded-full"
              style={{
                width: orb.size * 2,
                height: orb.size * 2,
                backgroundColor: orb.color,
                filter: "blur(4px)",
                opacity: 0.2,
                transform: orb.direction === "counter" ? "translateX(-10px)" : "translateX(10px)",
              }}
            />
            <div
              className="rounded-full relative"
              style={{
                width: orb.size * 2,
                height: orb.size * 2,
                backgroundColor: orb.color,
                boxShadow: `0 0 6px ${orb.color}50`,
                zIndex: 3,
              }}
            />
          </div>
        </div>
      ))}

      {/* Live Terminal Tooltips */}
      <div className="absolute top-[25%] right-[15%]">
        <LiveTerminal status="Scholar: Generating..." color="#9B59B6" delay={0} />
        <svg className="absolute top-full left-1/2 -translate-x-1/2 w-8 h-6 pointer-events-none">
          <line x1="16" y1="0" x2="16" y2="20" stroke="#9B59B6" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
        </svg>
      </div>

      <div className="absolute top-[15%] right-[30%]">
        <LiveTerminal status="Planner: Optimizing..." color="#F39C12" delay={1} />
        <svg className="absolute top-full left-1/2 -translate-x-1/2 w-8 h-6 pointer-events-none">
          <line x1="16" y1="0" x2="16" y2="20" stroke="#F39C12" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
        </svg>
      </div>

      <div className="absolute bottom-[20%] left-[20%]">
        <LiveTerminal status="Tutor: Streaming..." color="#3498DB" delay={2} />
        <svg className="absolute bottom-full left-1/2 -translate-x-1/2 w-8 h-6 pointer-events-none" style={{ transform: "rotate(180deg)" }}>
          <line x1="16" y1="0" x2="16" y2="20" stroke="#3498DB" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
}
