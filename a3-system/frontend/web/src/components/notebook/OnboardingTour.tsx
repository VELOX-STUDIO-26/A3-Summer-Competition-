"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map,
  BookOpen,
  GitBranch,
  BrainCircuit,
  Clapperboard,
  Laptop,
  MessageSquare,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
} from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  target: "sidebar" | "resources" | "tutor" | "analytics" | "agents";
  position: "left" | "center" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Your Learning Path",
    description:
      "This sidebar shows your complete learning journey. Each milestone contains subtopics that you'll master one by one. Your current position is highlighted — completed topics are checked off as you progress.",
    icon: <Map className="w-6 h-6" />,
    target: "sidebar",
    position: "left",
  },
  {
    title: "AI-Generated Resources",
    description:
      "For each topic, our AI agents create personalized study materials. Resources generate automatically when you reach a new subtopic — notes, mindmaps, code labs, and more. They're tailored to your learning style.",
    icon: <Sparkles className="w-6 h-6" />,
    target: "resources",
    position: "center",
  },
  {
    title: "Meet Your AI Agents",
    description:
      "Each agent specializes in a different type of content:\n• Scholar — Detailed study notes\n• Mapper — Visual mindmaps\n• Sage — Knowledge-check quizzes\n• Director — Video scripts\n• Architect — Hands-on code labs\n\nClick any agent to generate that resource on demand.",
    icon: <BookOpen className="w-6 h-6" />,
    target: "agents",
    position: "center",
  },
  {
    title: "Your AI Tutor",
    description:
      "NoboGyan is your personal tutor — ask questions about anything you're studying. You can highlight text in resources and ask about it, upload images for analysis, or just chat about concepts you find tricky.",
    icon: <MessageSquare className="w-6 h-6" />,
    target: "tutor",
    position: "right",
  },
  {
    title: "Track Your Progress",
    description:
      "Visit Analytics to see detailed insights about your learning — time spent, mastery levels, strengths and weak areas. The system adapts your path based on quiz results and engagement.",
    icon: <BarChart3 className="w-6 h-6" />,
    target: "analytics",
    position: "center",
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isFirst = currentStep === 0;

  const handleNext = useCallback(() => {
    if (isLast) {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [isLast, onComplete]);

  const handlePrev = () => {
    if (!isFirst) setCurrentStep((s) => s - 1);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
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
  }, [handleNext]);

  // Compute card alignment based on what panel we're highlighting
  const getCardPosition = () => {
    switch (step.position) {
      case "left":
        return "left-72 top-1/2 -translate-y-1/2";
      case "right":
        return "right-80 top-1/2 -translate-y-1/2";
      case "center":
      default:
        return "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
    }
  };

  // Get the highlight overlay areas (which panel to NOT dim)
  const getHighlightArea = () => {
    switch (step.target) {
      case "sidebar":
        return "left"; // highlight left panel
      case "resources":
      case "agents":
        return "center"; // highlight center
      case "tutor":
        return "right"; // highlight right
      case "analytics":
        return "center";
      default:
        return "center";
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] pointer-events-auto"
        >
          {/* Dimming overlay with cutouts */}
          <div className="absolute inset-0">
            {/* Full dim layer */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

            {/* Bright cutout for the highlighted panel */}
            <motion.div
              key={step.target}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`absolute top-0 bottom-0 bg-transparent ${
                getHighlightArea() === "left"
                  ? "left-0 w-72 lg:w-80"
                  : getHighlightArea() === "right"
                  ? "right-0 w-80 lg:w-96"
                  : "left-72 right-80 lg:left-80 lg:right-96"
              }`}
              style={{
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                borderRadius: "12px",
              }}
            />
          </div>

          {/* Tour Card */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`absolute ${getCardPosition()} w-[380px] max-w-[90vw] z-[101]`}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-sage-500 to-emerald-500 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  {step.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-white/70 text-xs">
                    Step {currentStep + 1} of {TOUR_STEPS.length}
                  </p>
                </div>
                <button
                  onClick={handleSkip}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {step.description}
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 flex items-center justify-between border-t border-gray-100">
                {/* Progress dots */}
                <div className="flex gap-1.5">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i === currentStep
                          ? "bg-sage-500 w-5"
                          : i < currentStep
                          ? "bg-sage-300"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-2">
                  {!isFirst && (
                    <button
                      onClick={handlePrev}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-sage-500 to-emerald-500 rounded-lg hover:shadow-md transition-all"
                  >
                    {isLast ? "Start Learning" : "Next"}
                    {!isLast && <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Keyboard hint */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-xs">
            Use arrow keys or Enter to navigate • Esc to skip
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
