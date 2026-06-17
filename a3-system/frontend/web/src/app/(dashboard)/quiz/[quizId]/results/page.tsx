"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { FaithfulnessBadge } from "@/components/FaithfulnessBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  XCircle,
  Trophy,
  ArrowRight,
  Loader2,
  AlertCircle,
  Zap,
  BookOpen,
  RotateCcw,
  Target,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Clock,
  Star,
} from "lucide-react";

interface ConceptAnalysis {
  concept: string;
  concept_tag: string;
  wrong_count: number;
  severity: "critical" | "moderate" | "minor";
  likely_cause: string;
  evidence: string;
}

interface StudentMessage {
  tone: string;
  message: string;
}

interface RegeneratedResources {
  success: boolean;
  resource_types?: string[];
  target_concepts?: string[];
  error?: string;
}

interface QuizResult {
  attempt_id: string;
  quiz_id: string;
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  outcome: "accelerate" | "continue" | "remediate" | "replan" | string;
  next_milestone_unlocked: boolean;
  student_message?: StudentMessage;
  concept_analysis?: ConceptAnalysis[];
  regenerated_resources?: RegeneratedResources;
  xp_earned: number;
  time_taken: number;
  completed_at: string;
  faithfulness?: {
    score: number;
    verified: boolean;
    total_claims: number;
    supported_claims: number;
    unverifiable_claims: number;
    citations?: string[];
  };
  results: Array<{
    question_id: string;
    question: string;
    question_type?: string;
    your_answer: string;
    correct_answer: string;
    correct: boolean;
    score?: number;
    weight?: number;
    explanation?: string;
    feedback?: string;
    model_answer_hint?: string;
    concepts_demonstrated?: string[];
    concepts_missing?: string[];
    justification?: string;
  }>;
}

const OUTCOME_CONFIG = {
  accelerate: {
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-200",
    barColor: "bg-purple-500",
    title: "Outstanding!",
    subtitle: "You're ahead of pace — time for a challenge!",
    cta: "Continue to Next Milestone",
    showRegenerated: false,
  },
  continue: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
    borderColor: "border-green-200",
    barColor: "bg-green-500",
    title: "Quiz Completed!",
    subtitle: "You've mastered this milestone. Great work!",
    cta: "Continue to Next Milestone",
    showRegenerated: false,
  },
  remediate: {
    icon: Target,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-200",
    barColor: "bg-amber-500",
    title: "Keep Practicing",
    subtitle: "A few concepts need more practice. We've prepared targeted resources for you.",
    cta: "Review Targeted Resources",
    showRegenerated: true,
  },
  replan: {
    icon: RotateCcw,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    borderColor: "border-orange-200",
    barColor: "bg-orange-500",
    title: "Let's Step Back",
    subtitle: "The foundation needs strengthening. We're rebuilding this milestone at a better pace for you.",
    cta: "Start Rebuilt Milestone",
    showRegenerated: true,
  },
};

function getOutcomeConfig(outcome: string) {
  return OUTCOME_CONFIG[outcome as keyof typeof OUTCOME_CONFIG] || OUTCOME_CONFIG.continue;
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical":
      return "text-red-600 bg-red-50 border-red-200";
    case "moderate":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "minor":
      return "text-blue-600 bg-blue-50 border-blue-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

export default function QuizResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { studentId } = useAppStore();
  const quizId = params.quizId as string;

  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchResults() {
      try {
        setLoading(true);
        const response = await api.get(`/api/quiz/${quizId}/results`, {
          params: { student_id: studentId },
        });
        setResult(response.data);
      } catch (err) {
        setError("Failed to load quiz results");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (quizId && studentId) {
      fetchResults();
    }
  }, [quizId, studentId]);

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#8a9ba3]" />
          <p className="text-[#666]">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-[#666]">{error || "Results not found"}</p>
          <Button
            onClick={() => router.push("/notebook")}
            className="mt-4 bg-[#B8C3C9] hover:bg-[#8a9ba3]"
          >
            Back to Notebook
          </Button>
        </div>
      </div>
    );
  }

  const scorePercentage = Math.round(result.score);
  const config = getOutcomeConfig(result.outcome);
  const OutcomeIcon = config.icon;
  const message = result.student_message || { tone: "neutral", message: config.subtitle };

  return (
    <div className="min-h-screen bg-[#F7F5F0] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Score Card */}
        <div
          className={`bg-white rounded-2xl border-2 ${config.borderColor} p-8 shadow-sm text-center mb-6`}
        >
          <div
            className={`w-20 h-20 rounded-full ${config.bgColor} flex items-center justify-center mx-auto mb-4`}
          >
            <OutcomeIcon className={`w-10 h-10 ${config.color}`} />
          </div>

          <h1 className="text-2xl font-bold text-[#2a2a2a] mb-2">{config.title}</h1>

          <p className="text-[#666] mb-6 max-w-md mx-auto">{message.message}</p>

          {/* Score Display */}
          <div className="mb-6">
            <div className={`text-5xl font-bold ${config.color} mb-2`}>
              {scorePercentage}%
            </div>
            <p className="text-[#888]">
              {result.correct} of {result.total} correct
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6 max-w-sm mx-auto">
            <Progress
              value={scorePercentage}
              className="h-4 bg-[#D6CFC2] [&>div]:bg-current"
            />
            <div className="flex justify-between text-sm mt-2">
              <span className="text-[#888]">0%</span>
              <span className="text-amber-600 font-medium">Pass: 60%</span>
              <span className="text-[#888]">100%</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6 max-w-sm mx-auto">
            <div className="p-3 rounded-xl bg-[#E7E2D7]/50">
              <Clock className="w-4 h-4 text-[#888] mx-auto mb-1" />
              <p className="text-xs text-[#888] mb-1">Time</p>
              <p className="text-sm font-semibold text-[#4a5568]">
                {formatTime(result.time_taken)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#E7E2D7]/50">
              <Star className="w-4 h-4 text-[#888] mx-auto mb-1" />
              <p className="text-xs text-[#888] mb-1">XP</p>
              <p className="text-sm font-semibold text-[#4a5568]">
                +{result.xp_earned}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#E7E2D7]/50">
              <Trophy className="w-4 h-4 text-[#888] mx-auto mb-1" />
              <p className="text-xs text-[#888] mb-1">Outcome</p>
              <p className="text-sm font-semibold text-[#4a5568] capitalize">
                {result.outcome}
              </p>
            </div>
          </div>

          {/* Faithfulness Badge */}
          {result.faithfulness && (
            <div className="mb-6 flex justify-center">
              <FaithfulnessBadge
                faithfulness={result.faithfulness}
                size="md"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => router.push("/notebook")}
              variant="outline"
              className="border-[#D6CFC2] text-[#555]"
            >
              Back to Notebook
            </Button>
            {result.next_milestone_unlocked ? (
              <Button
                onClick={() => router.push("/notebook")}
                className={`${config.bgColor.replace("bg-", "bg-").replace("100", "500")} hover:opacity-90 text-white`}
              >
                {config.cta}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => router.push(`/quiz/${quizId}`)}
                className="bg-[#B8C3C9] hover:bg-[#8a9ba3] text-white"
              >
                Try Again
                <RotateCcw className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Regenerated Resources Banner */}
        {config.showRegenerated && result.regenerated_resources?.success && (
          <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 shadow-sm mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#2a2a2a] mb-1">
                  New Targeted Resources Ready
                </h3>
                <p className="text-sm text-[#666] mb-3">
                  We've generated new resources focused on your weak concepts to help you improve.
                </p>
                {result.regenerated_resources.target_concepts && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {result.regenerated_resources.target_concepts.map((concept) => (
                      <span
                        key={concept}
                        className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                )}
                <Button
                  onClick={() => router.push("/notebook")}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-sm"
                >
                  View New Resources
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Concept Analysis */}
        {result.concept_analysis && result.concept_analysis.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#D6CFC2] p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-[#2a2a2a] mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#8a9ba3]" />
              Concept Breakdown
            </h2>
            <div className="space-y-3">
              {result.concept_analysis.map((concept, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${getSeverityColor(concept.severity)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{concept.concept}</span>
                    <span className="text-xs font-medium uppercase tracking-wider">
                      {concept.severity}
                    </span>
                  </div>
                  <p className="text-xs opacity-80 mb-1">
                    Likely cause: {concept.likely_cause.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs opacity-60">{concept.evidence}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question Review */}
        {result.results && result.results.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#D6CFC2] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2a2a2a] mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#8a9ba3]" />
              Question Review
            </h2>

            <div className="space-y-3">
              {result.results.map((item, idx) => {
                const isExpanded = expandedQuestions.has(item.question_id);
                const hasFeedback = item.feedback || item.model_answer_hint;

                return (
                  <div
                    key={item.question_id}
                    className={`rounded-xl border transition-all ${
                      item.correct
                        ? "border-green-200 bg-green-50/50"
                        : "border-red-200 bg-red-50/50"
                    }`}
                  >
                    <button
                      onClick={() => toggleQuestion(item.question_id)}
                      className="w-full p-4 flex items-start gap-3 text-left"
                    >
                      {item.correct ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-[#2a2a2a] text-sm">
                            {idx + 1}. {item.question}
                          </p>
                          {hasFeedback && (
                            <span className="text-xs text-[#888] flex-shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              item.correct
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.score !== undefined
                              ? `${Math.round(item.score * 100)}%`
                              : item.correct
                              ? "Correct"
                              : "Incorrect"}
                          </span>
                          {item.weight && item.weight > 1 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              Critical
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && hasFeedback && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="ml-8 space-y-2 text-sm border-t border-current pt-3">
                          <p className="text-[#666]">
                            <span className="font-medium">Your answer:</span>{" "}
                            {item.your_answer || "Not answered"}
                            {item.justification && (
                              <span className="block mt-1 text-xs italic">
                                Justification: {item.justification}
                              </span>
                            )}
                          </p>
                          {!item.correct && item.correct_answer && (
                            <p className="text-green-700">
                              <span className="font-medium">Correct answer:</span>{" "}
                              {item.correct_answer}
                            </p>
                          )}
                          {item.feedback && (
                            <div className="bg-white/60 p-3 rounded-lg">
                              <div className="flex items-center gap-1 mb-1">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                                <span className="font-medium text-[#555]">Feedback</span>
                              </div>
                              <p className="text-[#666]">{item.feedback}</p>
                            </div>
                          )}
                          {item.model_answer_hint && (
                            <div className="bg-blue-50/60 p-3 rounded-lg">
                              <span className="font-medium text-blue-700 text-xs uppercase tracking-wider">
                                Model Answer
                              </span>
                              <p className="text-blue-800 mt-1">{item.model_answer_hint}</p>
                            </div>
                          )}
                          {item.concepts_demonstrated && item.concepts_demonstrated.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              <span className="text-xs text-[#888]">Demonstrated:</span>
                              {item.concepts_demonstrated.map((c) => (
                                <span
                                  key={c}
                                  className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-xs"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
