"use client";

import { getCorrectAnswerIndex } from "@/hooks/useQuizState";

interface QuizRendererProps {
  resourceId: string;
  questions: any[];
  metadata?: {
    weak_point_coverage?: number;
  };
  quizState: {
    answers: Record<string, number>;
    confidence: Record<string, number>;
    revealedHints: Record<string, number>;
    eli5Enabled: Record<string, boolean>;
    selectAnswer: (key: string, idx: number) => void;
    setConfidenceLevel: (key: string, level: number) => void;
    revealHint: (key: string, count: number) => void;
    toggleEli5: (key: string) => void;
    resetQuiz: (resourceId: string, count: number) => void;
    calculateScore: (resourceId: string, questions: any[]) => number;
  };
}

const questionTypeLabels: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  scenario_based: "Scenario",
  fill_in_blank: "Fill in Blank",
  matching: "Matching",
  ordering: "Ordering",
};

export default function QuizRenderer({ resourceId, questions, metadata, quizState }: QuizRendererProps) {
  const { answers, confidence, revealedHints, eli5Enabled, selectAnswer, setConfidenceLevel, revealHint, toggleEli5, resetQuiz, calculateScore } = quizState;

  const score = calculateScore(resourceId, questions);

  return (
    <div className="space-y-4 pb-8">
      {questions.map((q: any, i: number) => {
        const ansKey = `${resourceId}_${i}`;
        const selected = answers[ansKey];
        const hasAnswered = selected !== undefined;
        const confLevel = confidence[ansKey] || 0;
        const hintsRevealed = revealedHints[ansKey] || 0;
        const eli5On = eli5Enabled[ansKey] || false;
        const isWeakPointQuestion = q.is_weak_point_question || false;
        const questionType = q.type || "multiple_choice";

        const correctIdx = getCorrectAnswerIndex(q);
        const isCorrect = hasAnswered && correctIdx !== null && selected === correctIdx;

        const hints = q.hints || [];
        const distractorExplanations = q.distractor_explanations || {};

        return (
          <div
            key={i}
            className={`rounded-xl border p-3 transition-all ${
              hasAnswered
                ? isCorrect
                  ? "border-green-400 bg-green-50"
                  : "border-red-400 bg-red-50"
                : isWeakPointQuestion
                ? "border-amber-300 bg-amber-50/30"
                : "border-[#D6CFC2] bg-[#F7F5F0]"
            }`}
          >
            {/* Question Header with Type Badge */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-[#2a2a2a] flex gap-2">
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-black shrink-0 ${
                    hasAnswered
                      ? isCorrect
                        ? "bg-green-200 text-green-700"
                        : "bg-red-200 text-red-700"
                      : isWeakPointQuestion
                      ? "bg-amber-200 text-amber-700"
                      : "bg-[#B8C3C9]/30 text-[#4a5568]"
                  }`}
                >
                  {hasAnswered ? (isCorrect ? "✓" : "✗") : i + 1}
                </span>
                <span>{q.question}</span>
              </p>
              <div className="flex items-center gap-1 shrink-0">
                {isWeakPointQuestion && (
                  <span
                    className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-semibold"
                    title="Focus question targeting your weak area"
                  >
                    🎯 Focus
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded bg-[#E7E2D7] text-[#666] text-[9px] font-medium">
                  {questionTypeLabels[questionType] || "Question"}
                </span>
              </div>
            </div>

            {/* Confidence Rating (before answering) */}
            {!hasAnswered && (
              <div className="mb-3 ml-7">
                <p className="text-[10px] text-[#888] mb-1">How confident are you?</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setConfidenceLevel(ansKey, level)}
                      className={`w-6 h-6 rounded text-[9px] font-bold transition-all ${
                        confLevel >= level
                          ? "bg-violet-100 text-violet-700 border border-violet-400"
                          : "bg-[#E7E2D7] text-[#999] border border-transparent hover:bg-[#D6CFC2]"
                      }`}
                      title={level === 1 ? "Not confident" : level === 5 ? "Very confident" : ""}
                    >
                      {level}
                    </button>
                  ))}
                  <span className="text-[9px] text-[#888] ml-1">
                    {confLevel === 0 ? "Select confidence" : confLevel <= 2 ? "Low" : confLevel <= 4 ? "Medium" : "High"}
                  </span>
                </div>
              </div>
            )}

            {/* Progressive Hints */}
            {!hasAnswered && hints.length > 0 && (
              <div className="mb-3 ml-7">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-[#888]">Need a hint?</span>
                  <div className="flex items-center gap-1">
                    {hints.slice(0, 3).map((_: any, hintIdx: number) => (
                      <button
                        key={hintIdx}
                        onClick={() => revealHint(ansKey, hintIdx + 1)}
                        disabled={hintsRevealed > hintIdx}
                        className={`px-2 py-0.5 rounded text-[9px] font-medium transition-all ${
                          hintsRevealed > hintIdx
                            ? "bg-violet-100 text-violet-700"
                            : hintsRevealed === hintIdx
                            ? "bg-[#B8C3C9]/30 text-[#4a5568] hover:bg-[#B8C3C9]/50"
                            : "bg-[#E7E2D7] text-[#999]"
                        }`}
                      >
                        {hintsRevealed > hintIdx ? "✓" : `Hint ${hintIdx + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
                {hintsRevealed > 0 && (
                  <div className="space-y-1">
                    {hints.slice(0, hintsRevealed).map((hint: string, idx: number) => (
                      <div key={idx} className="px-2 py-1.5 rounded bg-violet-50 border border-violet-200">
                        <p className="text-[10px] text-violet-700">
                          <span className="font-semibold">Hint {idx + 1}:</span> {hint}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Answer Options */}
            <div className="space-y-1.5 ml-7">
              {q.options?.map((opt: string, j: number) => {
                const isThis = hasAnswered && selected === j;
                const isCorrectOpt = hasAnswered && correctIdx === j;
                const distractorKey = opt;
                const hasDistractorExp =
                  distractorExplanations[distractorKey] ||
                  distractorExplanations[opt.replace(/^[A-Da-d][.)]\s*/, "")];

                let btnClass = "w-full text-left px-3 py-1.5 text-[11px] rounded-lg border transition-all ";
                if (hasAnswered) {
                  if (isCorrectOpt) {
                    btnClass += "bg-green-100 border-green-400 text-green-700";
                  } else if (isThis) {
                    btnClass += "bg-red-100 border-red-400 text-red-700";
                  } else {
                    btnClass += "bg-[#F7F5F0] border-[#E7E2D7] text-[#999]";
                  }
                } else {
                  btnClass +=
                    "bg-[#e9e4da] border-[#D6CFC2] text-[#555] hover:border-[#B8C3C9] hover:bg-[#E7E2D7] cursor-pointer";
                }

                return (
                  <div key={j} className="space-y-1">
                    <button
                      className={btnClass}
                      disabled={hasAnswered}
                      onClick={() => selectAnswer(ansKey, j)}
                    >
                      <span className={`font-medium mr-1.5 ${isCorrectOpt && hasAnswered ? "text-green-600" : "text-[#8a9ba3]"}`}>
                        {String.fromCharCode(65 + j)}.
                      </span>
                      {opt.replace(/^[A-Da-d][.)]\s*/, "")}
                    </button>
                    {/* Distractor Explanation (only for wrong answers after answering) */}
                    {hasAnswered && isThis && !isCorrectOpt && hasDistractorExp && (
                      <div className="ml-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-[10px] text-red-700">
                          <span className="font-semibold">Why this is wrong:</span> {hasDistractorExp}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explanation Section (after answering) */}
            {hasAnswered && (
              <div className="mt-3 ml-7 space-y-2">
                {/* ELI5 Toggle */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleEli5(ansKey)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                      eli5On
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : "bg-[#E7E2D7] text-[#666] hover:bg-[#D6CFC2]"
                    }`}
                  >
                    {eli5On ? "🧒 ELI5 Mode On" : "🧒 ELI5 Mode"}
                  </button>
                  {confLevel > 0 && (
                    <span className="text-[10px] text-[#888]">
                      Your confidence: {"★".repeat(confLevel)}{"☆".repeat(5 - confLevel)}
                    </span>
                  )}
                </div>

                {/* Explanation */}
                <div className="px-3 py-2 rounded-lg bg-[#C9D2D6]/20 border border-[#B8C3C9]/30">
                  <p className="text-[10px] text-[#4a5568] leading-relaxed">
                    <span className="font-semibold">
                      {eli5On && q.eli5_explanation ? "Simple Explanation:" : "Explanation:"}
                    </span>{" "}
                    {eli5On && q.eli5_explanation ? q.eli5_explanation : q.explanation}
                  </p>
                </div>

                {/* Common Misconceptions */}
                {q.common_misconceptions && q.common_misconceptions.length > 0 && (
                  <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-[10px] font-semibold text-amber-700 mb-1">Common Misconceptions:</p>
                    <ul className="space-y-0.5">
                      {q.common_misconceptions.map((m: string, mi: number) => (
                        <li key={mi} className="text-[10px] text-amber-700 flex items-start gap-1">
                          <span>•</span> {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Quiz Summary */}
      <div className="mt-4 p-3 rounded-xl bg-[#E7E2D7]/50 border border-[#D6CFC2]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#4a5568]">
              Score: {score} / {questions.length}
            </p>
            <p className="text-[10px] text-[#888]">
              {metadata?.weak_point_coverage
                ? `${Math.round(metadata.weak_point_coverage * 100)}% targeting weak areas`
                : ""}
            </p>
          </div>
          <button
            onClick={() => resetQuiz(resourceId, questions.length)}
            className="px-3 py-1.5 rounded-lg bg-[#B8C3C9]/30 text-[#4a5568] text-[10px] font-medium hover:bg-[#B8C3C9]/50 transition-all"
          >
            Retake Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
