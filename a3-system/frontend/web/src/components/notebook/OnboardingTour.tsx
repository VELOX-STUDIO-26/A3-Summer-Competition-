"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map,
  BookOpen,
  Sparkles,
  MessageSquare,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  target: string; // data-tour attribute value
  cardPosition: "right-of-target" | "left-of-target" | "below-target" | "above-target" | "center";
  onEnter?: () => void; // action when this step becomes active
  onExit?: () => void;  // action when leaving this step
}

interface OnboardingTourProps {
  onComplete: () => void;
  onExpandChat: () => void;
  onCollapseChat: () => void;
  onExpandSidebar: () => void;
}

export default function OnboardingTour({
  onComplete,
  onExpandChat,
  onCollapseChat,
  onExpandSidebar,
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const TOUR_STEPS: TourStep[] = [
    {
      title: "Your Learning Path",
      description:
        "This is your learning roadmap. Each milestone represents a major topic, and inside each are subtopics you'll master step by step. Your current position is highlighted in blue — completed topics get checked off as you progress.",
      icon: <Map className="w-5 h-5" />,
      target: "tour-sidebar",
      cardPosition: "right-of-target",
      onEnter: () => {
        onExpandSidebar();
      },
    },
    {
      title: "AI-Generated Resources",
      description:
        "These cards represent your personalized study materials. Resources are being generated right now in the background — you'll see them fill in with content tailored to your learning profile. Click any card to view its content.",
      icon: <Sparkles className="w-5 h-5" />,
      target: "tour-resources",
      cardPosition: "below-target",
    },
    {
      title: "Meet Your AI Agents",
      description:
        "Five specialized AI agents work together to create your materials:\n\n📖 Scholar — Comprehensive study notes\n🗺️ Mapper — Visual concept maps\n🧠 Sage — Knowledge-check quizzes\n🎬 Director — Video lesson scripts\n💻 Architect — Hands-on code labs\n\nClick any agent card to generate that resource on demand.",
      icon: <BookOpen className="w-5 h-5" />,
      target: "tour-agents",
      cardPosition: "center",
    },
    {
      title: "Your AI Tutor — NoboGyan",
      description:
        "This is your personal AI tutor. Ask questions about any topic you're studying, highlight text in resources to discuss it, or upload images for analysis. NoboGyan adapts to your learning style and remembers your conversation context.",
      icon: <MessageSquare className="w-5 h-5" />,
      target: "tour-chat",
      cardPosition: "left-of-target",
      onEnter: () => {
        onExpandChat();
      },
      onExit: () => {
        onCollapseChat();
      },
    },
    {
      title: "Track Your Progress",
      description:
        "Visit Analytics to see detailed insights about your learning journey — time spent, mastery levels, strengths, and areas to improve. The system adapts your path based on your quiz performance and engagement patterns.",
      icon: <BarChart3 className="w-5 h-5" />,
      target: "tour-analytics",
      cardPosition: "right-of-target",
    },
  ];

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isFirst = currentStep === 0;

  // Measure target element position
  const measureTarget = useCallback(() => {
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [step.target]);

  useEffect(() => {
    // Small delay to allow panels to open/close before measuring
    const timer = setTimeout(measureTarget, 350);
    window.addEventListener("resize", measureTarget);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measureTarget);
    };
  }, [measureTarget, currentStep]);

  // Run onEnter when step changes
  useEffect(() => {
    const currentStepData = TOUR_STEPS[currentStep];
    if (currentStepData.onEnter) {
      currentStepData.onEnter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const handleNext = useCallback(() => {
    const currentStepData = TOUR_STEPS[currentStep];
    if (currentStepData.onExit) {
      currentStepData.onExit();
    }
    if (isLast) {
      setIsVisible(false);
      setTimeout(onComplete, 400);
    } else {
      setCurrentStep((s) => s + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLast, onComplete, currentStep]);

  const handlePrev = () => {
    if (!isFirst) {
      const currentStepData = TOUR_STEPS[currentStep];
      if (currentStepData.onExit) {
        currentStepData.onExit();
      }
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSkip = () => {
    const currentStepData = TOUR_STEPS[currentStep];
    if (currentStepData.onExit) {
      currentStepData.onExit();
    }
    setIsVisible(false);
    setTimeout(onComplete, 400);
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleNext]);

  // Compute card position based on target rect
  const getCardStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }

    const padding = 20;
    const cardWidth = 380;
    const cardHeight = 300;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // For tall targets (full-height panels), center vertically in viewport
    const verticalCenter = targetRect.height > vh * 0.8
      ? vh / 2 - cardHeight / 2
      : Math.max(padding, Math.min(targetRect.top + targetRect.height / 2 - cardHeight / 2, vh - cardHeight - padding));

    switch (step.cardPosition) {
      case "right-of-target":
        return {
          top: verticalCenter,
          left: Math.min(targetRect.right + padding, vw - cardWidth - padding),
        };
      case "left-of-target":
        return {
          top: verticalCenter,
          left: Math.max(padding, targetRect.left - cardWidth - padding),
        };
      case "below-target":
        return {
          top: Math.min(targetRect.bottom + padding, vh - cardHeight - padding),
          left: Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - cardWidth / 2, vw - cardWidth - padding)),
        };
      case "above-target":
        return {
          top: Math.max(padding, targetRect.top - cardHeight - padding),
          left: Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - cardWidth / 2, vw - cardWidth - padding)),
        };
      case "center":
      default:
        return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
  };

  // Generate SVG mask for spotlight effect
  const renderSpotlightOverlay = () => {
    if (!targetRect) {
      return <div className="absolute inset-0 bg-black/60" />;
    }

    const pad = 8;
    const rx = 12;
    const x = targetRect.left - pad;
    const y = targetRect.top - pad;
    const w = targetRect.width + pad * 2;
    const h = targetRect.height + pad * 2;

    return (
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={x} y={y} width={w} height={h} rx={rx} fill="black" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.7)"
          mask="url(#tour-spotlight-mask)"
        />
        {/* Animated glow border around cutout */}
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={rx}
          fill="none"
          stroke="rgba(52,211,153,0.8)"
          strokeWidth="3"
          className="animate-pulse"
        />
        {/* Outer soft glow */}
        <rect
          x={x - 3}
          y={y - 3}
          width={w + 6}
          height={h + 6}
          rx={rx + 3}
          fill="none"
          stroke="rgba(52,211,153,0.3)"
          strokeWidth="4"
        />
      </svg>
    );
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] pointer-events-auto"
        >
          {/* SVG Spotlight Overlay */}
          <motion.div
            key={`overlay-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            {renderSpotlightOverlay()}
          </motion.div>

          {/* Tour Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="fixed z-[10000] w-[380px] pointer-events-auto"
              style={getCardStyle()}
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-base leading-tight">
                        {step.title}
                      </h3>
                      <span className="text-white/70 text-xs">
                        Step {currentStep + 1} of {TOUR_STEPS.length}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleSkip}
                    className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Card Body */}
                <div className="px-5 py-4">
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                    {step.description}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                  {/* Progress dots */}
                  <div className="flex items-center gap-1.5">
                    {TOUR_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === currentStep
                            ? "w-5 bg-emerald-500"
                            : i < currentStep
                            ? "w-1.5 bg-emerald-300"
                            : "w-1.5 bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Navigation buttons */}
                  <div className="flex items-center gap-2">
                    {!isFirst && (
                      <button
                        onClick={handlePrev}
                        className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors px-2 py-1 rounded-lg hover:bg-gray-50"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                    )}
                    <button
                      onClick={handleNext}
                      className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                      {isLast ? "Start Learning" : "Next"}
                      {!isLast && <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Keyboard hint */}
              <p className="text-center text-white/60 text-xs mt-2">
                Use arrow keys or Enter to navigate &bull; Esc to skip
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
