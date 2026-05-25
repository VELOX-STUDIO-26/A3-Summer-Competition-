"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { bypassGate, GateStatus } from "@/lib/tracking";
import { generateQuiz, startQuiz } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/lib/store";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Loader2,
  Lock,
  SkipForward,
  Timer,
  Zap,
} from "lucide-react";

interface GateStatusPanelProps {
  gateStatus: GateStatus | null;
  loading: boolean;
  onRefresh: () => void;
  topic?: string;
}

export function GateStatusPanel({
  gateStatus,
  loading,
  onRefresh,
  topic,
}: GateStatusPanelProps) {
  const { studentId } = useAppStore();
  const router = useRouter();
  const [showBypassDialog, setShowBypassDialog] = useState(false);
  const [bypassing, setBypassing] = useState(false);
  const [startingQuiz, setStartingQuiz] = useState(false);

  if (loading || !gateStatus) {
    return (
      <div className="group/card relative">
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xl" />
          <div className="absolute inset-0 rounded-2xl border border-white/50" />
          <div className="relative p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100/50 animate-pulse" />
              <div className="w-11 h-11 rounded-full bg-gray-100/50 animate-pulse" />
            </div>
            <div className="h-5 w-24 bg-gray-100/50 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-16 bg-gray-50/50 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const {
    gate_score,
    quiz_unlocked,
    bypass_mode,
    milestone_id,
  } = gateStatus;

  const gatePercentage = Math.round(gate_score * 100);
  const targetPercentage = 80;

  const handleBypass = async () => {
    if (!studentId) return;
    setBypassing(true);
    try {
      await bypassGate(studentId, gateStatus.milestone_id);
      onRefresh();
      setShowBypassDialog(false);
    } catch (error) {
      console.error("Bypass failed:", error);
    } finally {
      setBypassing(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!studentId || !topic) return;
    setStartingQuiz(true);
    try {
      // Generate a quiz for this topic
      const quiz = await generateQuiz({
        student_id: studentId,
        topic: topic,
        node_id: gateStatus?.milestone_id,
      });

      if (quiz?.quiz_id) {
        // Start the quiz attempt
        await startQuiz(quiz.quiz_id, studentId);
        // Navigate to quiz page
        router.push(`/quiz/${quiz.quiz_id}`);
      } else {
        console.error("Quiz generation failed:", quiz);
      }
    } catch (error) {
      console.error("Failed to start quiz:", error);
    } finally {
      setStartingQuiz(false);
    }
  };

  // State 1: Resources Incomplete - Glassmorphism Style
  if (!quiz_unlocked && !bypass_mode) {
    return (
      <>
        <div className="group/card relative cursor-pointer" onClick={() => setShowBypassDialog(true)}>
          {/* Glassmorphism Card */}
          <div className="relative rounded-2xl overflow-hidden transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl shadow-slate-500/25">
            {/* Glass background */}
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-400 to-slate-500 opacity-[0.03]" />
            
            {/* Border glow effect */}
            <div className="absolute inset-0 rounded-2xl border border-white/50" />
            
            {/* Card Content */}
            <div className="relative p-5 sm:p-6">
              {/* Header Row */}
              <div className="flex items-start justify-between mb-5 sm:mb-6">
                {/* Icon with glow */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-400 to-slate-500 rounded-2xl blur-lg opacity-40 group-hover/card:opacity-60 transition-opacity" />
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-lg group-hover/card:scale-110 transition-transform duration-300">
                    <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                </div>
                
                {/* Progress Ring */}
                <div className="relative">
                  <div className="absolute inset-0 bg-slate-500/10 rounded-full blur-sm" />
                  <div className="relative">
                    <ProgressRing percentage={gatePercentage} color="#64748b" size={48} />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700">
                      {gatePercentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Title & Status */}
              <div className="mb-5 sm:mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Milestone</h3>
                <p className="text-sm text-gray-500">Quiz Locked</p>
              </div>

              {/* Progress Badge & Arrow */}
              <div className="flex items-center justify-between pt-4 sm:pt-5 border-t border-gray-100">
                <div className="inline-flex items-center gap-2 sm:gap-2.5">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-gradient-to-br from-slate-400 to-slate-500" />
                  <span className="text-sm sm:text-base font-medium text-gray-700">{gatePercentage}% of 80%</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover/card:text-gray-600 group-hover/card:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* Bypass Dialog */}
        <Dialog open={showBypassDialog} onOpenChange={setShowBypassDialog}>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">
                Skip to Quiz?
              </DialogTitle>
              <DialogDescription className="text-gray-500">
                You can take the milestone quiz immediately. Pass with 85% or
                higher to mark this milestone complete without studying the
                resources.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  If you score below 85%, you'll need to complete the resources
                  anyway.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowBypassDialog(false)}
                  className="flex-1"
                >
                  Keep Studying
                </Button>
                <Button
                  onClick={handleBypass}
                  disabled={bypassing}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                >
                  {bypassing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <SkipForward className="w-4 h-4 mr-2" />
                      Unlock Quiz
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // State 2: Quiz Unlocked - Glassmorphism Style
  return (
    <div className="group/card relative cursor-pointer" onClick={handleStartQuiz}>
      {/* Glassmorphism Card */}
      <div className="relative rounded-2xl overflow-hidden transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl shadow-emerald-500/25">
        {/* Glass background */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-500 opacity-[0.05]" />
        
        {/* Border glow effect */}
        <div className="absolute inset-0 rounded-2xl border border-white/50" />
        
        {/* Card Content */}
        <div className="relative p-5">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-4">
            {/* Icon with glow */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl blur-lg opacity-40 group-hover/card:opacity-60 transition-opacity" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg group-hover/card:scale-110 transition-transform duration-300">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
            
            {/* Progress Ring */}
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-sm" />
              <div className="relative">
                <ProgressRing percentage={100} color="#10b981" size={44} />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-emerald-600">
                  ✓
                </span>
              </div>
            </div>
          </div>

          {/* Title & Status */}
          <div className="mb-3">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Milestone</h3>
            <p className="text-sm text-emerald-600 font-medium">
              {bypass_mode ? "Bypass Mode" : "Quiz Ready"}
            </p>
          </div>

          {/* Status Badge & Arrow */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-gradient-to-br from-emerald-500 to-green-500" />
              <span className="text-sm font-medium text-emerald-700">
                {startingQuiz ? "Starting..." : "Start Quiz"}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover/card:bg-gradient-to-br group-hover/card:from-emerald-500 group-hover/card:to-green-500 transition-all duration-300">
              {startingQuiz ? (
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 text-emerald-600 group-hover/card:text-white transition-all" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Progress Ring Component for GateStatus
function ProgressRing({ percentage, color, size = 24 }: { percentage: number; color: string; size?: number }) {
  const strokeWidth = size > 30 ? 3 : 2.5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}
