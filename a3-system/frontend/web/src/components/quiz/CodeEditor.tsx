"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Code,
  Terminal,
} from "lucide-react";

interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_visible: boolean;
  description?: string;
}

interface TestResult {
  test_id: string;
  passed: boolean;
  input?: string;
  expected_output?: string;
  actual_output?: string;
  is_visible: boolean;
  error?: string;
  status_description?: string;
  execution_time_ms?: number;
}

interface CodeEditorProps {
  questionId: string;
  language: string;
  starterCode: string;
  testCases: TestCase[];
  hints?: string[];
  onCodeChange?: (code: string) => void;
  onTestComplete?: (results: TestResult[]) => void;
}

const LANGUAGE_OPTIONS = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
];

export default function CodeEditor({
  questionId,
  language: initialLanguage,
  starterCode,
  testCases,
  hints = [],
  onCodeChange,
  onTestComplete,
}: CodeEditorProps) {
  const [code, setCode] = useState(starterCode || "");
  const [language, setLanguage] = useState(initialLanguage || "python");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [hasRun, setHasRun] = useState(false);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  const runTests = async () => {
    if (!code.trim()) {
      setError("Please write some code before running tests");
      return;
    }

    try {
      setRunning(true);
      setError(null);

      const response = await api.post("/api/quiz/sandbox/execute", {
        code,
        language,
        test_cases: testCases,
      });

      const data = response.data;
      setResults(data.results || []);
      setHasRun(true);
      onTestComplete?.(data.results || []);

      // Show hint if all tests fail and hints available
      const passedCount = data.results?.filter((r: TestResult) => r.passed).length || 0;
      if (passedCount === 0 && hints.length > 0 && hintIndex === 0) {
        setShowHints(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to run tests");
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  const getVisibleTests = () => {
    return testCases.filter((t) => t.is_visible);
  };

  const getTestStatus = (testId: string) => {
    if (!results) return "pending";
    const result = results.find((r) => r.test_id === testId);
    if (!result) return "pending";
    return result.passed ? "passed" : "failed";
  };

  const passedCount = results?.filter((r) => r.passed).length || 0;
  const totalCount = testCases.length;
  const allPassed = passedCount === totalCount && totalCount > 0;

  return (
    <div className="space-y-4">
      {/* Language Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-[#8a9ba3]" />
          <label className="text-sm font-medium text-[#555]">Language:</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#D6CFC2] bg-white text-sm focus:border-[#8a9ba3] focus:ring-1 focus:ring-[#8a9ba3] outline-none"
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {hasRun && (
          <div className="flex items-center gap-2">
            {allPassed ? (
              <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                All tests passed!
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                {passedCount}/{totalCount} tests passed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Code Editor */}
      <div className="relative">
        <textarea
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          className="w-full h-64 p-4 rounded-xl border border-[#D6CFC2] bg-[#2a2a2a] text-white font-mono text-sm leading-relaxed resize-none focus:border-[#8a9ba3] focus:ring-1 focus:ring-[#8a9ba3] outline-none"
          placeholder={`# Write your ${language} code here...`}
          spellCheck={false}
        />
        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-[#3a3a3a] text-xs text-[#999]">
          {language}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 inline mr-2" />
          {error}
        </div>
      )}

      {/* Run Tests Button */}
      <Button
        onClick={runTests}
        disabled={running}
        className="w-full bg-gradient-to-r from-[#B8C3C9] to-[#8a9ba3] hover:from-[#8a9ba3] hover:to-[#6b7b83] text-white font-semibold py-3 rounded-xl"
      >
        {running ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Running Tests...
          </>
        ) : (
          <>
            <Play className="w-5 h-5 mr-2" />
            Run Tests
          </>
        )}
      </Button>

      {/* Test Results */}
      {results && (
        <div className="space-y-2">
          <h4 className="font-medium text-[#555] flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Test Results
          </h4>

          <div className="space-y-2">
            {getVisibleTests().map((test) => {
              const status = getTestStatus(test.id);
              const result = results.find((r) => r.test_id === test.id);

              return (
                <div
                  key={test.id}
                  className={`p-3 rounded-lg border ${
                    status === "passed"
                      ? "bg-green-50 border-green-200"
                      : status === "failed"
                      ? "bg-red-50 border-red-200"
                      : "bg-[#E7E2D7] border-[#D6CFC2]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-[#2a2a2a]">
                      {test.description || `Test ${test.id}`}
                    </span>
                    {status === "passed" ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : status === "failed" ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[#D6CFC2]" />
                    )}
                  </div>

                  {test.is_visible && (
                    <div className="text-xs space-y-1 text-[#666]">
                      <div>
                        <span className="font-medium">Input:</span>{" "}
                        <code className="bg-white/50 px-1 rounded">{test.input}</code>
                      </div>
                      {result && (
                        <>
                          <div>
                            <span className="font-medium">Expected:</span>{" "}
                            <code className="bg-white/50 px-1 rounded">
                              {test.expected_output}
                            </code>
                          </div>
                          <div>
                            <span className="font-medium">Got:</span>{" "}
                            <code
                              className={`px-1 rounded ${
                                result.passed
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {result.actual_output || "[no output]"}
                            </code>
                          </div>
                        </>
                      )}
                      {result?.error && (
                        <div className="text-red-600 mt-2">
                          <span className="font-medium">Error:</span> {result.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Hidden Tests Summary */}
            {testCases.some((t) => !t.is_visible) && (
              <div className="p-3 rounded-lg bg-[#E7E2D7] border border-[#D6CFC2]">
                <div className="flex items-center gap-2 text-sm text-[#666]">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {testCases.filter((t) => !t.is_visible).length} hidden test
                    {testCases.filter((t) => !t.is_visible).length > 1 ? "s" : ""} —
                    results shown after submission
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hints */}
      {hints.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowHints(!showHints)}
            className="text-sm text-[#8a9ba3] hover:text-[#6b7b83] underline underline-offset-2"
          >
            {showHints ? "Hide hints" : "Need a hint?"}
          </button>

          {showHints && (
            <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Hint {hintIndex + 1}:</span>{" "}
                {hints[hintIndex]}
              </p>
              {hints.length > 1 && hintIndex < hints.length - 1 && (
                <button
                  onClick={() => setHintIndex(hintIndex + 1)}
                  className="text-xs text-amber-600 hover:text-amber-700 mt-2 underline"
                >
                  Show next hint
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
