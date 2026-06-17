"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api, submitQuiz } from "@/lib/api";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle,
  Flag,
  Loader2,
} from "lucide-react";
import CodeEditor from "@/components/quiz/CodeEditor";

interface Question {
  id: string;
  type: "multiple_choice" | "true_false" | "scenario_based" | "short_answer" | "coding";
  question: string;
  options?: string[];
  correct_answer?: string;
  requires_justification?: boolean;
  justification_prompt?: string;
  hints?: string[];
  difficulty?: string;
  starter_code?: string;
  language?: string;
  test_cases?: Array<{
    id: string;
    input: string;
    expected_output: string;
    is_visible: boolean;
    description?: string;
  }>;
}

interface Quiz {
  quiz_id: string;
  title: string;
  description: string;
  topic: string;
  num_questions: number;
  questions: Question[];
  estimated_time_minutes: number;
  complexity_level: string;
}

interface Answer {
  question_id: string;
  answer: string;
  justification?: string;
}

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const { studentId, activeGraphId } = useAppStore();
  const quizId = params.quizId as string;

  // Preserve the active course graph when returning to the notebook.
  const notebookHref = activeGraphId
    ? `/notebook?graph=${activeGraphId}`
    : "/notebook";

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

  // Fetch quiz data
  useEffect(() => {
    async function fetchQuiz() {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/api/quiz/${quizId}`);
        const data = response.data;
        setQuiz(data);
        setTimeRemaining((data.estimated_time_minutes || 15) * 60);
        setStartTime(Date.now());

        // Initialize empty answers
        const initialAnswers: Record<string, Answer> = {};
        data.questions?.forEach((q: Question) => {
          initialAnswers[q.id] = { question_id: q.id, answer: "" };
        });
        setAnswers(initialAnswers);
        setRetryCount(0);
      } catch (err: any) {
        const msg = err.response?.data?.detail || "Failed to load quiz";
        setError(msg);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  // Timer countdown
  useEffect(() => {
    if (!quiz || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz, timeRemaining]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get timer state based on remaining time
  const getTimerState = () => {
    const total = (quiz?.estimated_time_minutes || 15) * 60;
    const ratio = timeRemaining / total;
    if (ratio > 0.8)
      return {
        color: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
        pulse: false,
        label: null,
      };
    if (ratio > 0.2)
      return {
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        pulse: false,
        label: "Time running low",
      };
    return {
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      pulse: true,
      label: "Almost out of time",
    };
  };

  // Handle answer selection
  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], answer },
    }));
  };

  // Handle justification for True/False
  const handleJustification = (questionId: string, justification: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], justification },
    }));
  };

  // Toggle flag for review
  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // Navigate to question
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < (quiz?.num_questions || 0)) {
      setCurrentQuestion(index);
      setShowHint(false);
    }
  };

  // Submit quiz
  const handleSubmit = useCallback(async () => {
    if (!quiz || submitting) return;

    // Check if all questions are answered
    const answeredCount = Object.values(answers).filter(
      (a) => a.answer && a.answer.trim() !== ""
    ).length;

    if (answeredCount < quiz.num_questions) {
      const confirm = window.confirm(
        `You've answered ${answeredCount} of ${quiz.num_questions} questions. Submit anyway?`
      );
      if (!confirm) return;
    }

    try {
      setSubmitting(true);
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);

      await submitQuiz(
        quizId,
        studentId || "",
        Object.values(answers),
        timeTaken
      );

      // Flag that this student has attempted a quiz so the notebook page
      // knows to check for remedial resources. Without this flag we don't
      // bother calling /api/resources/remedial on every topic change for
      // brand-new students who haven't taken any quiz yet.
      if (studentId && typeof window !== "undefined") {
        try {
          localStorage.setItem(`quiz_attempted:${studentId}`, "1");
        } catch {
          /* localStorage may be unavailable in SSR / private mode */
        }
      }

      // Navigate to results page
      router.push(`/quiz/${quizId}/results`);
    } catch (err: any) {
      console.error("Failed to submit quiz:", err);
      const detail = err.response?.data?.detail;
      const msg = typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ")
          : typeof detail === "object" && detail !== null
            ? JSON.stringify(detail)
            : "Failed to submit quiz. Please try again.";
      setError(msg);
      setSubmitting(false);
    }
  }, [quiz, answers, startTime, submitting, router, quizId]);

  // Current question
  const question = quiz?.questions?.[currentQuestion];
  const currentAnswer = question ? answers[question.id] : null;
  const isFlagged = question ? flaggedQuestions.has(question.id) : false;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!quiz) return;

      // Don't trigger shortcuts when typing in textareas
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement
      ) {
        // Allow Escape to close/blur textareas
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          goToQuestion(currentQuestion - 1);
          break;
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          if (currentQuestion < quiz.num_questions - 1) {
            goToQuestion(currentQuestion + 1);
          }
          break;
        case "Home":
          e.preventDefault();
          goToQuestion(0);
          break;
        case "End":
          e.preventDefault();
          goToQuestion(quiz.num_questions - 1);
          break;
        case "f":
        case "F":
          if (question) {
            toggleFlag(question.id);
          }
          break;
        case "Enter":
          if (currentQuestion === quiz.num_questions - 1) {
            handleSubmit();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quiz, currentQuestion, question, goToQuestion, toggleFlag, handleSubmit]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#8a9ba3]" />
          <p className="text-[#666]">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0]">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#2a2a2a] mb-2">
            {error ? "Something went wrong" : "Quiz not found"}
          </h2>
          <p className="text-[#666] mb-4">{error || "The quiz you're looking for doesn't exist or has been removed."}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                setRetryCount((c) => c + 1);
                // Trigger re-fetch via useEffect by resetting quizId dependency... not ideal but works
                window.location.reload();
              }}
              variant="outline"
              className="border-[#D6CFC2] text-[#555]"
              disabled={retryCount >= 3}
            >
              {retryCount >= 3 ? "Max retries reached" : "Try Again"}
            </Button>
            <Button
              onClick={() => router.push(notebookHref)}
              className="bg-[#B8C3C9] hover:bg-[#8a9ba3] text-white"
            >
              Back to Notebook
            </Button>
          </div>
          {retryCount > 0 && retryCount < 3 && (
            <p className="text-xs text-[#888] mt-3">Retry attempt {retryCount} of 3</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#D6CFC2] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#2a2a2a]">{quiz.title}</h1>
            <p className="text-sm text-[#888]">
              {quiz.complexity_level} • {quiz.num_questions} questions
            </p>
          </div>

          {/* Timer */}
          {(() => {
            const timer = getTimerState();
            return (
              <div className={`flex flex-col items-end`}>
                {timer.label && (
                  <span className={`text-xs font-medium ${timer.color} mb-0.5`}>
                    {timer.label}
                  </span>
                )}
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${timer.bg} ${timer.border} ${timer.color} ${
                    timer.pulse ? "animate-pulse" : ""
                  }`}
                >
                  <Clock className="w-5 h-5" />
                  <span className="font-mono font-semibold text-lg">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Progress Bar */}
        <div className="max-w-4xl mx-auto mt-4">
          <div className="flex items-center justify-between text-sm text-[#666] mb-1">
            <span>Progress</span>
            <span>
              {currentQuestion + 1} of {quiz.num_questions}
            </span>
          </div>
          <Progress
            value={((currentQuestion + 1) / quiz.num_questions) * 100}
            className="h-2 bg-[#D6CFC2]"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        {question && (
          <div className="bg-white rounded-2xl border border-[#D6CFC2] p-6 shadow-sm">
            {/* Question Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="text-sm text-[#8a9ba3] font-medium">
                  Question {currentQuestion + 1}
                </span>
                <span className="mx-2 text-[#D6CFC2]">•</span>
                <span className="text-sm text-[#888]">
                  {question.type === "multiple_choice"
                    ? "Multiple Choice"
                    : question.type === "true_false"
                    ? "True/False"
                    : question.type === "scenario_based"
                    ? "Scenario"
                    : question.type === "coding"
                    ? "Coding Challenge"
                    : "Short Answer"}
                </span>
                {question.difficulty && (
                  <>
                    <span className="mx-2 text-[#D6CFC2]">•</span>
                    <span
                      className={`text-sm capitalize ${
                        question.difficulty === "easy"
                          ? "text-green-600"
                          : question.difficulty === "hard"
                          ? "text-red-600"
                          : "text-amber-600"
                      }`}
                    >
                      {question.difficulty}
                    </span>
                  </>
                )}
              </div>

              <button
                onClick={() => toggleFlag(question.id)}
                className={`p-2 rounded-lg transition-colors ${
                  isFlagged
                    ? "text-amber-600 bg-amber-50"
                    : "text-[#999] hover:bg-[#E7E2D7]"
                }`}
                title={isFlagged ? "Unflag for review (F)" : "Flag for review (F)"}
                aria-label={isFlagged ? "Unflag question for review" : "Flag question for review"}
                aria-pressed={isFlagged}
              >
                <Flag className="w-5 h-5" fill={isFlagged ? "currentColor" : "none"} />
              </button>
            </div>

            {/* Question Text */}
            <h2 className="text-lg text-[#2a2a2a] mb-6 leading-relaxed">
              {question.question}
            </h2>

            {/* Multiple Choice / Scenario Based Options */}
            {(question.type === "multiple_choice" || question.type === "scenario_based") && question.options && (
              <div className="space-y-3">
                {question.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(question.id, option)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      currentAnswer?.answer === option
                        ? "border-[#8a9ba3] bg-[#B8C3C9]/10"
                        : "border-[#D6CFC2] hover:border-[#B8C3C9] hover:bg-[#F7F5F0]"
                    }`}
                  >
                    <span className="font-medium text-[#4a5568]">{option}</span>
                  </button>
                ))}
              </div>
            )}

            {/* True/False Options */}
            {question.type === "true_false" && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  {["True", "False"].map((option) => (
                    <button
                      key={option}
                      onClick={() => handleAnswer(question.id, option)}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        currentAnswer?.answer === option
                          ? "border-[#8a9ba3] bg-[#B8C3C9]/10"
                          : "border-[#D6CFC2] hover:border-[#B8C3C9] hover:bg-[#F7F5F0]"
                      }`}
                    >
                      <span className="font-medium text-[#4a5568]">{option}</span>
                    </button>
                  ))}
                </div>

                {/* Justification for True/False */}
                {question.requires_justification && (
                  <div className="mt-4">
                    <label className="block text-sm text-[#666] mb-2">
                      {question.justification_prompt || "Explain your reasoning (1-2 sentences)"}
                    </label>
                    <textarea
                      value={currentAnswer?.justification || ""}
                      onChange={(e) => handleJustification(question.id, e.target.value)}
                      className="w-full p-3 rounded-xl border border-[#D6CFC2] focus:border-[#8a9ba3] focus:ring-1 focus:ring-[#8a9ba3] outline-none resize-none"
                      rows={3}
                      placeholder="Type your explanation here..."
                    />
                  </div>
                )}
              </div>
            )}

            {/* Short Answer */}
            {question.type === "short_answer" && (
              <div>
                <label className="block text-sm text-[#666] mb-2">
                  Your answer (2-4 sentences)
                </label>
                <textarea
                  value={currentAnswer?.answer || ""}
                  onChange={(e) => handleAnswer(question.id, e.target.value)}
                  className="w-full p-4 rounded-xl border border-[#D6CFC2] focus:border-[#8a9ba3] focus:ring-1 focus:ring-[#8a9ba3] outline-none resize-none"
                  rows={6}
                  placeholder="Type your answer here..."
                />
              </div>
            )}

            {/* Coding Challenge */}
            {question.type === "coding" && (
              <CodeEditor
                questionId={question.id}
                language={question.language || "python"}
                starterCode={question.starter_code || ""}
                testCases={question.test_cases || []}
                hints={question.hints}
                onCodeChange={(code) => handleAnswer(question.id, code)}
              />
            )}

            {/* Hints */}
            {question.hints && question.hints.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="text-sm text-[#8a9ba3] hover:text-[#6b7b83] underline underline-offset-2"
                >
                  {showHint ? "Hide hint" : "Need a hint?"}
                </button>
                {showHint && (
                  <div className="mt-2 p-3 rounded-lg bg-[#B8C3C9]/10 border border-[#B8C3C9]/30">
                    <p className="text-sm text-[#555]">{question.hints[0]}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="bg-white border-t border-[#D6CFC2] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => goToQuestion(currentQuestion - 1)}
            disabled={currentQuestion === 0}
            className="border-[#D6CFC2] text-[#555]"
            title="Previous question (←)"
            aria-label="Previous question"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {/* Question Navigator */}
          <div className="hidden sm:flex items-center gap-1" role="tablist" aria-label="Question navigator">
            {quiz.questions.map((q, idx) => {
              const answer = answers[q.id]?.answer;
              const isAnswered = answer && answer !== "" && answer !== q.starter_code;
              const isFlagged = flaggedQuestions.has(q.id);
              const isCurrent = idx === currentQuestion;

              return (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(idx)}
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`Question ${idx + 1}${isAnswered ? " answered" : ""}${isFlagged ? " flagged" : ""}`}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                    isCurrent
                      ? "bg-[#8a9ba3] text-white"
                      : isAnswered
                      ? "bg-[#B8C3C9]/30 text-[#4a5568]"
                      : "bg-[#E7E2D7] text-[#888]"
                  } ${isFlagged ? "ring-2 ring-amber-400" : ""}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {currentQuestion < quiz.num_questions - 1 ? (
            <Button
              onClick={() => goToQuestion(currentQuestion + 1)}
              className="bg-[#B8C3C9] hover:bg-[#8a9ba3] text-white"
              title="Next question (→)"
              aria-label="Next question"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white"
              title="Submit quiz (Enter)"
              aria-label="Submit quiz"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Quiz
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
