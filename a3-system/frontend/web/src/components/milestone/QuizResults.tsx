"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Clapperboard,
  Clock,
  GitBranch,
  Laptop,
  Lightbulb,
  Lock,
  RefreshCw,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";

// Types matching backend response
interface ConceptAnalysis {
  concept: string;
  concept_tag: string;
  wrong_count: number;
  severity: "critical" | "moderate" | "minor";
  likely_cause:
    | "never_studied"
    | "misunderstood"
    | "confused_with_similar"
    | "careless_error";
  evidence: string;
}

interface QuizEvaluationResult {
  score_percentage: number;
  decision: {
    outcome: "accelerate" | "continue" | "remediate" | "replan";
    next_milestone_unlocked: boolean;
    reason: string;
  };
  concept_analysis: ConceptAnalysis[];
  profile_updates: {
    weak_points_add: string[];
    weak_points_resolve: string[];
    knowledge_base_updates: Record<string, number>;
    pace_adjustment: number;
    confidence_delta: number;
  };
  regeneration_instructions: {
    should_regenerate: boolean;
    scope: "full_milestone" | "targeted_concepts" | "none";
    target_concepts: string[];
    format_instructions: {
      avoid_formats: string[];
      prioritise_formats: string[];
      complexity_level: "simpler" | "same" | "advanced";
    };
    specific_instructions: string;
  };
  quiz_instructions: {
    allow_requiz: boolean;
    requiz_unlock_condition: string;
    requiz_difficulty: "easier" | "same" | "harder";
    focus_concepts: string[];
  };
  student_message: {
    tone: "encouraging" | "neutral" | "urgent";
    message: string;
  };
}

interface QuizResultsProps {
  result: QuizEvaluationResult;
  milestoneTitle: string;
  nextMilestoneTitle?: string;
  onContinue?: () => void;
  onReviewResources?: () => void;
  onRequiz?: () => void;
  isLoading?: boolean;
}

const CAUSE_LABELS: Record<string, string> = {
  never_studied: "Never studied",
  misunderstood: "Misunderstood",
  confused_with_similar: "Confused with similar concept",
  careless_error: "Careless error",
};

const SEVERITY_CONFIG = {
  critical: {
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle,
    label: "Critical",
  },
  moderate: {
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: AlertCircle,
    label: "Moderate",
  },
  minor: {
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Lightbulb,
    label: "Minor",
  },
};

export function QuizResults({
  result,
  milestoneTitle,
  nextMilestoneTitle,
  onContinue,
  onReviewResources,
  onRequiz,
  isLoading = false,
}: QuizResultsProps) {
  const [showConfetti, setShowConfetti] = useState(
    result.decision.outcome === "accelerate"
  );
  const score = Math.round(result.score_percentage * 100);
  const { outcome, next_milestone_unlocked, reason } = result.decision;

  // State 4: ACCELERATE
  if (outcome === "accelerate") {
    return (
      <div className="space-y-6">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {/* Simple CSS confetti effect */}
            <div className="absolute top-10 left-1/4 w-4 h-4 bg-yellow-400 rounded-full animate-bounce" />
            <div className="absolute top-20 left-1/2 w-3 h-3 bg-pink-400 rounded-full animate-pulse" />
            <div className="absolute top-16 right-1/3 w-5 h-5 bg-green-400 rounded-full animate-bounce" />
            <div className="absolute top-32 left-1/3 w-4 h-4 bg-blue-400 rounded-full animate-pulse" />
          </div>
        )}

        {/* Score Banner */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-8 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <Award className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-4xl font-bold text-green-700 mb-2">{score}%</h2>
          <p className="text-lg text-green-600 font-medium">
            Excellent! You're ahead of pace!
          </p>
          <p className="text-sm text-green-500 mt-2">{reason}</p>
        </motion.div>

        {/* Student Message */}
        <Card className="bg-[#F7F5F0] border-[#D6CFC2]">
          <CardContent className="p-6">
            <p className="text-lg text-[#2a2a2a]">
              <Sparkles className="w-5 h-5 inline mr-2 text-amber-500" />
              {result.student_message.message}
            </p>
          </CardContent>
        </Card>

        {/* Next Milestone Card */}
        {next_milestone_unlocked && nextMilestoneTitle && (
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-r from-[#B8C3C9]/20 to-[#C9D2D6]/20 border-[#B8C3C9]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#2a2a2a]">
                  <Target className="w-5 h-5 text-[#8a9ba3]" />
                  Next Milestone Unlocked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-[#4a5568]">
                  {nextMilestoneTitle}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                    Advanced Content
                  </span>
                  <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                    Accelerated Path
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Continue Button */}
        <Button
          onClick={onContinue}
          className="w-full bg-gradient-to-r from-[#B8C3C9] to-[#8a9ba3] hover:from-[#8a9ba3] hover:to-[#6b7b83] text-white font-semibold py-6 rounded-xl shadow-lg"
        >
          Continue to Next Milestone
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    );
  }

  // State 4: CONTINUE
  if (outcome === "continue") {
    return (
      <div className="space-y-6">
        {/* Score Banner */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-8 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-4xl font-bold text-green-700 mb-2">{score}%</h2>
          <p className="text-lg text-green-600 font-medium">
            Great work! You've mastered this milestone.
          </p>
        </motion.div>

        {/* Student Message */}
        <Card className="bg-[#F7F5F0] border-[#D6CFC2]">
          <CardContent className="p-6">
            <p className="text-lg text-[#2a2a2a]">
              {result.student_message.message}
            </p>
          </CardContent>
        </Card>

        {/* Profile Updates Summary */}
        {result.profile_updates.weak_points_resolve.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-700">
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Resolved weak points: {" "}
                {result.profile_updates.weak_points_resolve.join(", ")}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Next Milestone Card */}
        {next_milestone_unlocked && nextMilestoneTitle && (
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-[#E7E2D7]/50 border-[#D6CFC2]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#2a2a2a]">
                  <Target className="w-5 h-5 text-[#8a9ba3]" />
                  Next Milestone Unlocked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-[#4a5568]">
                  {nextMilestoneTitle}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Continue Button */}
        <Button
          onClick={onContinue}
          className="w-full bg-gradient-to-r from-[#B8C3C9] to-[#8a9ba3] hover:from-[#8a9ba3] hover:to-[#6b7b83] text-white font-semibold py-6 rounded-xl shadow-lg"
        >
          Continue to Next Milestone
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    );
  }

  // State 5: REMEDIATE
  if (outcome === "remediate") {
    const criticalConcepts = result.concept_analysis.filter(
      (c) => c.severity === "critical"
    );
    const moderateConcepts = result.concept_analysis.filter(
      (c) => c.severity === "moderate"
    );

    return (
      <div className="space-y-6">
        {/* Score Banner - Amber, never red */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-8 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <RefreshCw className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-4xl font-bold text-amber-700 mb-2">{score}%</h2>
          <p className="text-lg text-amber-600 font-medium">
            Good effort! Let's strengthen a few concepts.
          </p>
        </motion.div>

        {/* Student Message */}
        <Card className="bg-[#F7F5F0] border-[#D6CFC2]">
          <CardContent className="p-6">
            <p className="text-lg text-[#2a2a2a]">
              {result.student_message.message}
            </p>
          </CardContent>
        </Card>

        {/* What to Review Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[#2a2a2a] flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Here's what to review
          </h3>

          {criticalConcepts.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-600">
                Priority concepts:
              </p>
              {criticalConcepts.map((concept, idx) => (
                <ConceptCard key={idx} concept={concept} />
              ))}
            </div>
          )}

          {moderateConcepts.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-amber-600">
                Concepts to reinforce:
              </p>
              {moderateConcepts.map((concept, idx) => (
                <ConceptCard key={idx} concept={concept} />
              ))}
            </div>
          )}
        </div>

        {/* New Resources Section */}
        {result.regeneration_instructions.should_regenerate && (
          <Card className="bg-violet-50 border-violet-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-violet-700">
                <BookOpen className="w-5 h-5" />
                We've added targeted resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-violet-600">
                New resources focused on:
              </p>
              <div className="flex flex-wrap gap-2">
                {result.regeneration_instructions.target_concepts.map(
                  (concept) => (
                    <span
                      key={concept}
                      className="px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-medium"
                    >
                      {concept.replace(/_/g, " ")}
                    </span>
                  )
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-violet-500">
                <span className="px-2 py-0.5 rounded bg-violet-200">
                  {result.regeneration_instructions.format_instructions.complexity_level}
                </span>
                <span>
                  Difficulty: {" "}
                  {
                    result.regeneration_instructions.format_instructions
                      .complexity_level
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={onReviewResources}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-6 rounded-xl shadow-lg"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            Review Targeted Resources
          </Button>

          {result.quiz_instructions.allow_requiz && (
            <div className="text-center">
              <p className="text-sm text-[#888] mb-2">
                <Lock className="w-4 h-4 inline mr-1" />
                Re-quiz locked until resources are completed
              </p>
              <p className="text-xs text-[#999]">
                {result.quiz_instructions.requiz_unlock_condition}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // State 6: REPLAN
  if (outcome === "replan") {
    return (
      <div className="space-y-6">
        {/* Score Banner - Amber */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-8 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <RefreshCw className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-4xl font-bold text-amber-700 mb-2">{score}%</h2>
          <p className="text-lg text-amber-600 font-medium">
            Let's rebuild this foundation
          </p>
        </motion.div>

        {/* Student Message */}
        <Card className="bg-[#F7F5F0] border-[#D6CFC2]">
          <CardContent className="p-6">
            <p className="text-lg text-[#2a2a2a]">
              {result.student_message.message}
            </p>
          </CardContent>
        </Card>

        {/* Replan Explanation */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">
                  Regenerating your learning path
                </h4>
                <p className="text-sm text-blue-600">
                  After 3 attempts below 60%, we're creating a simpler version
                  of this milestone with more foundational explanations and
                  additional scaffolding.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading Animation */}
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E7E2D7]">
            <RefreshCw className="w-4 h-4 animate-spin text-[#8a9ba3]" />
            <span className="text-sm text-[#666]">
              Generating new learning path...
            </span>
          </div>
        </div>

        {/* Concept Analysis */}
        {result.concept_analysis.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[#888]">
              Concepts that need attention:
            </h3>
            {result.concept_analysis.map((concept, idx) => (
              <ConceptCard key={idx} concept={concept} compact />
            ))}
          </div>
        )}

        {/* Next Steps */}
        <div className="p-4 rounded-xl bg-[#E7E2D7]/50 border border-[#D6CFC2]">
          <p className="text-sm text-[#555]">
            <Clock className="w-4 h-4 inline mr-2" />
            Your new learning path will be ready shortly. You'll need to
            complete the new resources to 80% before attempting the quiz again.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// Helper component for concept cards
function ConceptCard({
  concept,
  compact = false,
}: {
  concept: ConceptAnalysis;
  compact?: boolean;
}) {
  const config = SEVERITY_CONFIG[concept.severity];
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={`p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.color}`} />
          <span className="font-medium text-[#2a2a2a]">{concept.concept}</span>
          <span
            className={`ml-auto text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}
          >
            {config.label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={`${config.bgColor} border ${config.borderColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center shrink-0`}
          >
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-[#2a2a2a]">
                {concept.concept}
              </h4>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}
              >
                {config.label}
              </span>
            </div>
            <p className="text-sm text-[#666] mb-2">{concept.evidence}</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#888]">
                Wrong {concept.wrong_count}{" "}
                {concept.wrong_count === 1 ? "time" : "times"}
              </span>
              <span className="text-[#D6CFC2]">·</span>
              <span className="text-[#888]">
                {CAUSE_LABELS[concept.likely_cause]}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
