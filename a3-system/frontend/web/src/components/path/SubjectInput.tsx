"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Rocket,
  BookOpen,
  TrendingUp,
  Clock,
  Users,
  Star,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  searchGraphs,
  generateGraph,
  GraphSearchResult,
  GenerateGraphResponse,
  getQuota,
} from "@/lib/api";

interface SubjectInputProps {
  studentId: string;
  isPremium?: boolean;
  onGraphGenerated: (response: GenerateGraphResponse) => void;
  onExistingGraphSelected: (graphId: string) => void;
}

const POPULAR_SUBJECTS = [
  { name: "Machine Learning", icon: "🤖" },
  { name: "Web Development", icon: "🌐" },
  { name: "Data Science", icon: "📊" },
  { name: "Python Programming", icon: "🐍" },
  { name: "Cloud Computing", icon: "☁️" },
  { name: "Cybersecurity", icon: "🔒" },
];

export default function SubjectInput({
  studentId,
  isPremium = false,
  onGraphGenerated,
  onExistingGraphSelected,
}: SubjectInputProps) {
  const [subject, setSubject] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [goalInput, setGoalInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchResults, setSearchResults] = useState<GraphSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ remaining: number; canGenerate: boolean } | null>(null);

  const handleSearch = async (searchSubject: string) => {
    if (!searchSubject.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      // Search for existing graphs
      const results = await searchGraphs(searchSubject, goals, "draft", 5);
      setSearchResults(results.graphs);
      setShowResults(true);

      // Also check quota
      const q = await getQuota(studentId, searchSubject, isPremium);
      setQuota({ remaining: q.remaining, canGenerate: q.can_generate });
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleGenerate = async () => {
    if (!subject.trim()) {
      setError("Please enter a subject");
      return;
    }

    if (!quota?.canGenerate && !isPremium) {
      setError("No generations remaining. Upgrade to premium for unlimited.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await generateGraph(
        studentId,
        subject,
        goals,
        {},
        "mixed",
        0.5,
        isPremium
      );

      if (!response.is_valid) {
        setError(response.validation_errors.join(", ") || "Failed to generate valid path");
        setGenerating(false);
        return;
      }

      onGraphGenerated(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate path";
      setError(message);
      setGenerating(false);
    }
  };

  const handleSelectExisting = (graphId: string) => {
    onExistingGraphSelected(graphId);
  };

  const handleAddGoal = () => {
    if (goalInput.trim() && !goals.includes(goalInput.trim())) {
      setGoals([...goals, goalInput.trim()]);
      setGoalInput("");
    }
  };

  const handleRemoveGoal = (goal: string) => {
    setGoals(goals.filter((g) => g !== goal));
  };

  const handlePopularSubject = (name: string) => {
    setSubject(name);
    handleSearch(name);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-sage-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-sage-500 to-sage-600 px-6 py-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-6 h-6" />
          <h2 className="text-xl font-semibold">What do you want to learn?</h2>
        </div>
        <p className="text-sage-100 text-sm">
          Enter any subject and we&apos;ll create a personalized learning path for you
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Subject Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject or Topic
          </label>
          <div className="relative">
            <input
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="e.g., Machine Learning, Web Development, Data Science..."
              className="w-full px-4 py-3 pl-11 rounded-xl border border-sage-200 focus:border-sage-500 focus:ring-2 focus:ring-sage-200 outline-none transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            {searching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-500 animate-spin" />
            )}
          </div>
        </div>

        {/* Popular Subjects */}
        {!subject && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Popular Subjects
            </label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SUBJECTS.map((s) => (
                <button
                  key={s.name}
                  onClick={() => handlePopularSubject(s.name)}
                  className="flex items-center gap-2 px-4 py-2 bg-sage-50 hover:bg-sage-100 text-sage-700 rounded-lg text-sm transition-colors"
                >
                  <span>{s.icon}</span>
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        <AnimatePresence>
          {showResults && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <label className="block text-sm font-medium text-gray-700">
                Existing Learning Paths
              </label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectExisting(result.id)}
                    className="w-full flex items-center justify-between p-4 bg-sage-50 hover:bg-sage-100 rounded-xl transition-colors text-left"
                  >
                    <div>
                      <h4 className="font-medium text-deep-charcoal">
                        {result.subject}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {result.verified_by_count} verified
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          {result.avg_rating.toFixed(1)}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {result.node_count} topics
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-sage-500" />
                  </button>
                ))}
              </div>
              <div className="text-center text-sm text-gray-500">
                or generate a new personalized path below
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Goals Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Learning Goals (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddGoal()}
              placeholder="e.g., Get a job as ML engineer"
              className="flex-1 px-4 py-2 rounded-lg border border-sage-200 focus:border-sage-500 focus:ring-2 focus:ring-sage-200 outline-none transition-all text-sm"
            />
            <button
              onClick={handleAddGoal}
              className="px-4 py-2 bg-sage-100 hover:bg-sage-200 text-sage-700 rounded-lg text-sm font-medium transition-colors"
            >
              Add
            </button>
          </div>
          {goals.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {goals.map((goal) => (
                <span
                  key={goal}
                  className="flex items-center gap-1 px-3 py-1 bg-sage-100 text-sage-700 rounded-full text-sm"
                >
                  {goal}
                  <button
                    onClick={() => handleRemoveGoal(goal)}
                    className="ml-1 hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-gray-500">
            {quota && !isPremium && (
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {quota.remaining} free generations remaining
              </span>
            )}
            {isPremium && (
              <span className="flex items-center gap-1 text-sage-600">
                <Star className="w-4 h-4" />
                Unlimited generations (Premium)
              </span>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !subject.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-sage-500 hover:bg-sage-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Path...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                Generate Learning Path
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
