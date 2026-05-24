"use client";

import { BrainCircuit, X, Zap } from "lucide-react";

interface QuizConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTopic: string;
  difficulty: "easy" | "medium" | "hard";
  setDifficulty: (d: "easy" | "medium" | "hard") => void;
  questionCount: number;
  setQuestionCount: (n: number) => void;
  onGenerate: () => void;
}

export default function QuizConfigModal({
  isOpen,
  onClose,
  currentTopic,
  difficulty,
  setDifficulty,
  questionCount,
  setQuestionCount,
  onGenerate,
}: QuizConfigModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Card */}
      <div className="relative w-[360px] rounded-2xl border border-[#D6CFC2] bg-white shadow-2xl shadow-black/20 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400" />

        <div className="p-6">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[#E7E2D7] text-[#888] hover:text-[#555] transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-md shadow-violet-500/25">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2a2a2a] leading-tight">Configure Quiz</h3>
              <p className="text-[11px] text-[#888] mt-0.5">{currentTopic}</p>
            </div>
          </div>

          {/* Difficulty */}
          <div className="mb-5">
            <label className="text-[10px] uppercase tracking-widest text-[#888] font-medium mb-2.5 block">
              Difficulty Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "easy" as const, emoji: "🟢", active: "bg-green-100 border-green-400 text-green-700 shadow-sm" },
                { key: "medium" as const, emoji: "🟠", active: "bg-orange-100 border-orange-400 text-orange-700 shadow-sm" },
                { key: "hard" as const, emoji: "🔴", active: "bg-red-100 border-red-400 text-red-700 shadow-sm" },
              ]).map(({ key, emoji, active }) => (
                <button
                  key={key}
                  onClick={() => setDifficulty(key)}
                  className={`py-2.5 rounded-xl text-[11px] font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                    difficulty === key
                      ? active
                      : "bg-[#F7F5F0] border-[#D6CFC2] text-[#888] hover:bg-[#E7E2D7] hover:text-[#555]"
                  }`}
                >
                  <span className="text-sm">{emoji}</span>
                  <span className="capitalize">{key}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div className="mb-6">
            <label className="text-[10px] uppercase tracking-widest text-[#888] font-medium mb-2.5 block">
              Number of Questions
            </label>
            <div className="flex items-center gap-2">
              {[3, 5, 7, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    questionCount === n
                      ? "bg-[#B8C3C9]/20 border-[#B8C3C9] text-[#4a5568] shadow-sm"
                      : "bg-[#F7F5F0] border-[#D6CFC2] text-[#999] hover:bg-[#E7E2D7] hover:text-[#666]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={onGenerate}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-400 to-yellow-400 text-white font-bold text-xs shadow-md shadow-orange-400/25 hover:shadow-orange-400/40 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Zap className="w-3.5 h-3.5" />
            Generate {questionCount} Questions · {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </button>
        </div>
      </div>
    </div>
  );
}
