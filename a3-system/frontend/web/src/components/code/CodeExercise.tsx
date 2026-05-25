"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Code,
  Play,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Lightbulb,
  Zap,
} from "lucide-react";
import { useCodeTracking } from "@/hooks/useTracking";
import { useAppStore } from "@/lib/store";

// ────────────────────── Types ──────────────────────
interface TestCase {
  input: string;
  expected: string;
  description: string;
}

interface CodeExerciseData {
  language: string;
  difficulty: string;
  problem: string;
  starter_code: string;
  solution: string;
  test_cases: TestCase[];
  explanation: string;
  time_complexity: string;
  space_complexity: string;
}

interface Props {
  data: CodeExerciseData;
  topic: string;
}

// ──────────────── Language colors ────────────────
const langColors: Record<string, { bg: string; text: string; border: string }> = {
  python:     { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" },
  javascript: { bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-300" },
  java:       { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" },
  "c++":      { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-300" },
  go:         { bg: "bg-cyan-100",   text: "text-cyan-700",   border: "border-cyan-300" },
};

const diffColors: Record<string, { bg: string; text: string }> = {
  beginner:     { bg: "bg-green-100",  text: "text-green-700" },
  intermediate: { bg: "bg-orange-100", text: "text-orange-700" },
  advanced:     { bg: "bg-red-100",    text: "text-red-700" },
};

// ──────────────── Copy button ────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-[#444] text-white/50 hover:text-white transition-all"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ──────────────── Code block ────────────────
function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div className="relative group rounded-xl border border-[#444] bg-[#2a2a2a] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#333] border-b border-[#444]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          <span className="text-[10px] text-white/50 font-mono ml-2">{language}</span>
        </div>
        <CopyButton text={code} />
      </div>
      {/* Code */}
      <pre className="p-4 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        <code className="text-[11px] leading-relaxed font-mono text-[#a5d6ff] whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}

// ────────────────────── Main Component ──────────────────────
export default function CodeExercise({ data, topic }: Props) {
  const { studentId } = useAppStore();
  const [showSolution, setShowSolution] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [testResults, setTestResults] = useState<Record<number, "pass" | "fail" | null>>({});
  const [codeContent, setCodeContent] = useState(data.starter_code || "");
  const hasEditedRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  // Initialize code tracking
  const { trackEdit, trackRun, trackTestsAttempted, trackComplete } = useCodeTracking({
    studentId: studentId || "anonymous",
    milestoneId: topic.replace(/\s+/g, "_").toLowerCase(),
    resourceId: `code_${topic.replace(/\s+/g, "_").toLowerCase()}`,
    totalTests: data.test_cases?.length || 1,
    language: data.language || "python",
    enabled: !!studentId,
  });

  // Track edits
  const handleCodeChange = (newCode: string) => {
    setCodeContent(newCode);
    if (!hasEditedRef.current) {
      hasEditedRef.current = true;
      const lines = newCode.split("\n").length;
      trackEdit(lines);
    }
  };

  // Track test runs
  const handleRunTests = () => {
    const errors: string[] = [];
    const passed = Object.values(testResults).filter(r => r === "pass").length;
    const failed = Object.values(testResults).filter(r => r === "fail").length;

    // Simulate running tests
    data.test_cases?.forEach((tc, idx) => {
      const isCorrect = testResults[idx] === "pass";
      if (!isCorrect && testResults[idx] === "fail") {
        errors.push(`Test ${idx + 1} failed: ${tc.description}`);
      }
    });

    trackRun(errors);
    trackTestsAttempted(passed, failed, errors);

    // Check if all tests passed
    if (passed === data.test_cases?.length && passed > 0) {
      const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      trackComplete(finalTime);
    }
  };

  // Simulate test result toggles for tracking demo
  const toggleTestResult = (testIndex: number) => {
    setTestResults(prev => {
      const current = prev[testIndex];
      const next: Record<number, "pass" | "fail" | null> = {
        ...prev,
        [testIndex]: current === null || current === undefined ? "pass" : current === "pass" ? "fail" : null
      };

      // Track the attempt
      const passed = Object.values(next).filter(r => r === "pass").length;
      const failed = Object.values(next).filter(r => r === "fail").length;
      trackTestsAttempted(passed, failed, failed > 0 ? ["Some tests failed"] : []);

      // Check completion
      if (passed === data.test_cases?.length && passed > 0) {
        const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
        trackComplete(finalTime);
      }

      return next;
    });
  };

  const lang = langColors[data.language?.toLowerCase()] || langColors.python;
  const diff = diffColors[data.difficulty?.toLowerCase()] || diffColors.intermediate;

  return (
    <div className="space-y-4 pb-8">
      {/* ── Meta badges ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${lang.bg} ${lang.text} ${lang.border}`}>
          <Code className="w-3 h-3" />
          {data.language}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold ${diff.bg} ${diff.text}`}>
          <Zap className="w-3 h-3" />
          {data.difficulty}
        </span>
        {data.time_complexity && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono bg-gray-100 text-gray-600 border border-gray-200">
            <Clock className="w-3 h-3" />
            {data.time_complexity}
          </span>
        )}
        {data.space_complexity && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono bg-gray-100 text-gray-600 border border-gray-200">
            <Cpu className="w-3 h-3" />
            {data.space_complexity}
          </span>
        )}
      </div>

      {/* ── Problem Statement ── */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-gray-200 flex items-center justify-center">
            <Lightbulb className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-[#888] font-medium">Problem</span>
        </div>
        <p className="text-[12px] text-[#444] leading-relaxed">{data.problem}</p>
      </div>

      {/* ── Starter Code ── */}
      {data.starter_code && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-widest text-[#888] font-medium">Starter Code</span>
            <span className="text-[9px] text-[#999]">— complete the implementation</span>
          </div>
          <CodeBlock code={data.starter_code} language={data.language} />
        </div>
      )}

      {/* ── Test Cases ── */}
      {data.test_cases && data.test_cases.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-widest text-[#888] font-medium">Test Cases</span>
            <span className="text-[9px] text-[#999]">— {data.test_cases.length} tests</span>
          </div>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-px bg-gray-200">
              <div className="px-3 py-2 text-[9px] uppercase tracking-widest text-gray-600 font-medium bg-gray-100">#</div>
              <div className="px-3 py-2 text-[9px] uppercase tracking-widest text-gray-600 font-medium bg-gray-100">Input</div>
              <div className="px-3 py-2 text-[9px] uppercase tracking-widest text-gray-600 font-medium bg-gray-100">Expected</div>
              <div className="px-3 py-2 text-[9px] uppercase tracking-widest text-gray-600 font-medium bg-gray-100">Description</div>
            </div>
            {/* Rows */}
            {data.test_cases.map((tc, i) => (
              <div
                key={i}
                onClick={() => toggleTestResult(i)}
                className={`grid grid-cols-[auto_1fr_1fr_1fr] gap-px cursor-pointer hover:opacity-80 transition-opacity ${
                  testResults[i] === "pass"
                    ? "bg-green-50"
                    : testResults[i] === "fail"
                      ? "bg-red-50"
                      : "bg-white"
                }`}
              >
                <div className="px-3 py-2 flex items-center justify-center bg-gray-50">
                  {testResults[i] === "pass" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  ) : testResults[i] === "fail" ? (
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                  ) : (
                    <span className="text-[10px] text-gray-500 font-mono">{i + 1}</span>
                  )}
                </div>
                <div className="px-3 py-2 bg-gray-50">
                  <code className="text-[10px] text-gray-600 font-mono break-all">{tc.input}</code>
                </div>
                <div className="px-3 py-2 bg-gray-50">
                  <code className="text-[10px] text-orange-700 font-mono break-all">{tc.expected}</code>
                </div>
                <div className="px-3 py-2 bg-gray-50">
                  <span className="text-[10px] text-gray-600">{tc.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Solution (collapsible) ── */}
      {data.solution && (
        <div>
          <button
            onClick={() => setShowSolution(!showSolution)}
            className="flex items-center gap-2 mb-2 group"
          >
            {showSolution ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#4a5568]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#999] group-hover:text-[#4a5568] transition-colors" />
            )}
            <span className="text-[10px] uppercase tracking-widest text-[#888] font-medium group-hover:text-[#555] transition-colors">
              {showSolution ? "Hide Solution" : "Show Solution"}
            </span>
            {!showSolution && (
              <Eye className="w-3 h-3 text-[#999]" />
            )}
            {showSolution && (
              <EyeOff className="w-3 h-3 text-[#999]" />
            )}
          </button>
          {showSolution && (
            <CodeBlock code={data.solution} language={data.language} />
          )}
        </div>
      )}

      {/* ── Explanation (collapsible) ── */}
      {data.explanation && (
        <div>
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-2 mb-2 group"
          >
            {showExplanation ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#4a5568]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#999] group-hover:text-[#4a5568] transition-colors" />
            )}
            <span className="text-[10px] uppercase tracking-widest text-[#888] font-medium group-hover:text-[#555] transition-colors">
              {showExplanation ? "Hide Explanation" : "Show Explanation"}
            </span>
          </button>
          {showExplanation && (
            <div className="rounded-xl border border-gray-200 bg-gray-100 p-4">
              <p className="text-[11px] text-[#555] leading-relaxed whitespace-pre-line">
                {data.explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
