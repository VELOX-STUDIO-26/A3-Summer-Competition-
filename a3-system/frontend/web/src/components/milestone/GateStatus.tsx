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
      <div className="p-6 rounded-2xl bg-[#E7E2D7]/50 border border-[#D6CFC2]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#B8C3C9]/30 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-[#D6CFC2] rounded animate-pulse" />
            <div className="h-3 w-24 bg-[#E7E2D7] rounded animate-pulse" />
          </div>
        </div>
        <div className="h-3 bg-[#D6CFC2] rounded-full animate-pulse" />
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

  // State 1: Resources Incomplete
  if (!quiz_unlocked && !bypass_mode) {
    return (
      <>
        <div className="p-6 rounded-2xl bg-[#E7E2D7]/50 border border-[#D6CFC2] space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#B8C3C9]/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#8a9ba3]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#2a2a2a]">
                  Milestone Quiz Locked
                </h3>
                <p className="text-sm text-[#888]">
                  Complete resources to unlock
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-[#4a5568]">
                {gatePercentage}%
              </span>
              <p className="text-xs text-[#888]">of 80% required</p>
            </div>
          </div>

          {/* Progress Ring */}
          <div className="relative">
            <Progress
              value={gatePercentage}
              max={100}
              className="h-3 bg-[#D6CFC2]"
            />
            <div
              className="absolute top-0 w-0.5 h-3 bg-[#8a9ba3]"
              style={{ left: "80%" }}
            />
          </div>

          {/* Bypass Link */}
          <button
            onClick={() => setShowBypassDialog(true)}
            className="text-xs text-[#888] hover:text-[#555] underline underline-offset-2"
          >
            I already know this topic →
          </button>
        </div>

        {/* Bypass Dialog */}
        <Dialog open={showBypassDialog} onOpenChange={setShowBypassDialog}>
          <DialogContent className="bg-[#F7F5F0] border-[#D6CFC2]">
            <DialogHeader>
              <DialogTitle className="text-[#2a2a2a]">
                Skip to Quiz?
              </DialogTitle>
              <DialogDescription className="text-[#666]">
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
                  className="flex-1 bg-[#B8C3C9] hover:bg-[#8a9ba3]"
                >
                  {bypassing ? (
                    <>
                      <Timer className="w-4 h-4 mr-2 animate-spin" />
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

  // State 2: Quiz Unlocked
  return (
    <div className="p-6 rounded-2xl bg-[#E7E2D7]/50 border border-[#D6CFC2] space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-[#2a2a2a]">
            {bypass_mode ? "Quiz Unlocked (Bypass)" : "Quiz Unlocked!"}
          </h3>
          <p className="text-sm text-[#888]">
            {gatePercentage >= 80
              ? "You've completed the required resources"
              : "Test your existing knowledge"}
          </p>
        </div>
      </div>

      {/* Start Quiz Button */}
      <Button
        className="w-full bg-gradient-to-r from-[#B8C3C9] to-[#8a9ba3] hover:from-[#8a9ba3] hover:to-[#6b7b83] text-white font-semibold py-6 rounded-xl shadow-lg shadow-[#B8C3C9]/30 transition-all hover:scale-[1.02]"
        onClick={handleStartQuiz}
        disabled={startingQuiz}
      >
        {startingQuiz ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating Quiz...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5 mr-2" />
            Start Milestone Quiz
            <ChevronRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}
