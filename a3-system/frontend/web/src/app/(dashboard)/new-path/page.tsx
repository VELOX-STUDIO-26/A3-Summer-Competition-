"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Database,
  Layers,
  Target,
  Zap,
  Clock,
  Settings,
  ArrowLeft,
  Sparkles,
  Loader2,
  BookOpen,
  Edit3,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import LearningPathGraph from "@/app/components/LearningPathGraph";
import {
  startChat,
  sendMessage,
  generateHierarchicalGraph,
  getPathRatings,
  type HierarchicalGraphResponse,
  type MainTopicInfo,
  type PathRatingsData,
} from "@/lib/api";
import { PathRatingsDisplay } from "@/app/components/PathRating";

// ============================================================================
// Types
// ============================================================================

interface Dimension {
  id: string;
  name: string;
  icon: React.ElementType;
  progress: number;
  value: string;
  tags: string[];
}

interface Message {
  id: string;
  role: "ai" | "user";
  content: string;
  tags?: { dimension: string; value: string }[];
}

interface ExtractedProfile {
  knowledge_base: Record<string, number>;
  cognitive_style: string;
  goals: string[];
  learning_pace: number;
  weak_points: string[];
  content_preferences: string[];
  subject?: string; // The main subject they want to learn (extracted from goals)
}

// Steps: chat → review → generating → preview (subject comes from chat)
type Step = "chat" | "review" | "generating" | "preview";

// ============================================================================
// Constants
// ============================================================================

const dimensionMeta: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  knowledge_base: { name: "Knowledge Base", icon: Database, color: "from-[#6B7F6B] to-[#5a6d5a]" },
  cognitive_style: { name: "Learning Style", icon: Layers, color: "from-[#8a9ba3] to-[#6B7F6B]" },
  goals: { name: "Goals", icon: Target, color: "from-amber-600 to-amber-700" },
  learning_pace: { name: "Pace", icon: Clock, color: "from-[#B8C3C9] to-[#8a9ba3]" },
  weak_points: { name: "Weak Points", icon: Zap, color: "from-rose-500 to-rose-600" },
  content_preferences: { name: "Preferences", icon: Settings, color: "from-[#6B7F6B] to-[#8a9ba3]" },
};

const initialDimensions: Dimension[] = [
  { id: "knowledge_base", name: "Knowledge Base", icon: Database, progress: 0, value: "", tags: [] },
  { id: "cognitive_style", name: "Learning Style", icon: Layers, progress: 0, value: "", tags: [] },
  { id: "goals", name: "Goals", icon: Target, progress: 0, value: "", tags: [] },
  { id: "learning_pace", name: "Pace", icon: Clock, progress: 0, value: "", tags: [] },
  { id: "weak_points", name: "Weak Points", icon: Zap, progress: 0, value: "", tags: [] },
  { id: "content_preferences", name: "Preferences", icon: Settings, progress: 0, value: "", tags: [] },
];

// ============================================================================
// Helper Functions
// ============================================================================

const paceToLabel = (pace: number): string => {
  if (pace <= 0.3) return "Steady & thorough";
  if (pace <= 0.6) return "Moderate";
  return "Fast-paced";
};

const styleToLabel = (style: string): string => {
  const labels: Record<string, string> = {
    visual: "Visual learner - videos & diagrams",
    verbal: "Reading/writing learner",
    kinesthetic: "Hands-on learner",
    mixed: "Balanced - mix of all styles",
  };
  return labels[style?.toLowerCase()] || style || "Not specified";
};

const formatKnowledge = (kb: Record<string, number>): string => {
  if (!kb || Object.keys(kb).length === 0) return "No prior knowledge specified";
  return Object.entries(kb)
    .map(([topic, level]) => `${topic} (${Math.round(level * 100)}%)`)
    .join(", ");
};

// ============================================================================
// Phase Badge Component (Simple header like profile-chat)
// ============================================================================

function PhaseBadge({ currentStep }: { currentStep: Step }) {
  const stepInfo: Record<Step, { label: string; icon: string }> = {
    chat: { label: "Building Your Profile", icon: "💬" },
    review: { label: "Review Profile", icon: "📋" },
    generating: { label: "Crafting Your Path", icon: "✨" },
    preview: { label: "Your Learning Path", icon: "🎯" },
  };

  const info = stepInfo[currentStep];

  return (
    <div className="flex justify-center mb-6">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/50 shadow-lg shadow-black/5">
        <span>{info.icon}</span>
        <span className="text-sm text-[#6B7F6B] font-medium">{info.label}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Profile Review Component
// ============================================================================

function ProfileReview({
  profile,
  onConfirm,
  onEdit,
  onBack,
}: {
  profile: ExtractedProfile;
  onConfirm: () => void;
  onEdit: (field: string, value: any) => void;
  onBack: () => void;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Extract subject from goals if not explicitly set
  const detectedSubject = profile.subject || profile.goals?.[0] || "Not detected";

  const fields = [
    {
      key: "subject",
      label: "Subject to Learn",
      icon: BookOpen,
      value: detectedSubject,
      color: "from-amber-500 to-amber-600",
      highlight: true, // Make this prominent
    },
    {
      key: "knowledge_base",
      label: "Current Knowledge",
      icon: Database,
      value: formatKnowledge(profile.knowledge_base),
      color: "from-[#6B7F6B] to-[#5a6d5a]",
    },
    {
      key: "cognitive_style",
      label: "Learning Style",
      icon: Layers,
      value: styleToLabel(profile.cognitive_style),
      color: "from-[#8a9ba3] to-[#6B7F6B]",
    },
    {
      key: "goals",
      label: "Learning Goals",
      icon: Target,
      value: profile.goals?.join(", ") || "Not specified",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      key: "learning_pace",
      label: "Learning Pace",
      icon: Clock,
      value: paceToLabel(profile.learning_pace),
      color: "from-[#B8C3C9] to-[#8a9ba3]",
    },
    {
      key: "weak_points",
      label: "Areas to Improve",
      icon: Zap,
      value: profile.weak_points?.join(", ") || "None specified",
      color: "from-rose-500 to-rose-600",
    },
    {
      key: "content_preferences",
      label: "Content Preferences",
      icon: Settings,
      value: profile.content_preferences?.join(", ") || "Mixed content",
      color: "from-[#6B7F6B] to-[#8a9ba3]",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#D6CFC2]/60 shadow-sm p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6B7F6B] to-[#5a6d5a] flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-serif font-bold text-[#2a2a2a]">Your Learning Profile</h2>
        <p className="text-sm text-[#888] mt-1">Review and confirm your profile before generating your path</p>
      </div>

      <div className="space-y-3 mb-6">
        {fields.map((field) => {
          const Icon = field.icon;
          const isEditing = editingField === field.key;
          const isHighlight = (field as any).highlight;

          return (
            <div
              key={field.key}
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl transition-colors",
                isHighlight
                  ? "bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200"
                  : "bg-[#F7F5F0] hover:bg-[#E7E2D7]/50"
              )}
            >
              <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center", field.color)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-sm font-medium", isHighlight ? "text-amber-800" : "text-[#2a2a2a]")}>
                    {field.label}
                    {isHighlight && <span className="ml-2 text-xs text-amber-600">(This will be your learning path)</span>}
                  </span>
                  {!isEditing && (
                    <button
                      onClick={() => {
                        setEditingField(field.key);
                        setEditValue(field.value);
                      }}
                      className="p-1 rounded hover:bg-[#D6CFC2] transition-colors"
                    >
                      <Edit3 className="w-4 h-4 text-[#888]" />
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-[#D6CFC2] focus:outline-none focus:ring-2 focus:ring-[#6B7F6B]/30"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        onEdit(field.key, editValue);
                        setEditingField(null);
                      }}
                      className="p-1.5 rounded-lg bg-[#6B7F6B] text-white hover:bg-[#5a6d5a]"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingField(null)}
                      className="p-1.5 rounded-lg bg-[#E7E2D7] text-[#666] hover:bg-[#D6CFC2]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p className={cn("text-sm truncate", isHighlight ? "text-amber-900 font-medium text-base" : "text-[#666]")}>
                    {field.value}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 border border-[#D6CFC2] text-[#666] rounded-xl hover:bg-[#F7F5F0] transition-colors"
        >
          ← Back to Chat
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-[#6B7F6B] to-[#5a6d5a] text-white rounded-xl font-medium hover:shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Generate Learning Path →
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Generating State Component - Enhanced UX
// ============================================================================

const TIPS_DATA = [
  { emoji: "💡", category: "Cloud Tip", text: "AWS, Microsoft Azure, and Google Cloud Platform (GCP) hold over 60% of the global cloud market share." },
  { emoji: "🚀", category: "Career Advice", text: "Building hands-on portfolio projects can drastically speed up your job hunt in cloud computing." },
  { emoji: "📊", category: "Industry Insight", text: "Cloud computing jobs are projected to grow 15% by 2028, much faster than average." },
  { emoji: "🎯", category: "Learning Tip", text: "Start with one cloud platform (AWS/Azure/GCP) and master it before branching out." },
  { emoji: "💰", category: "Salary Info", text: "Cloud architects earn an average of $150,000+ annually in the US market." },
  { emoji: "🔐", category: "Hot Skill", text: "Cloud security is one of the most in-demand specializations right now." },
  { emoji: "⚡", category: "Quick Win", text: "Many cloud providers offer free tiers - perfect for hands-on practice!" },
  { emoji: "🌐", category: "Fun Fact", text: "The term 'Cloud Computing' became popular around 2006 when Google and Amazon started using it." },
];

const GENERATION_STEPS = [
  { id: "analyze", label: "Analyzing your learning profile", duration: 8000 },
  { id: "structure", label: "Structuring main topics and subtopics", duration: 15000 },
  { id: "generate", label: "Generating personalized content", duration: 40000 },
];

function GeneratingState({ subject }: { subject: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tipFading, setTipFading] = useState(false);

  // Simulate progress
  useEffect(() => {
    const totalDuration = 60000; // 60 seconds total
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      // Ease out - fast at start, slow near end, caps at 95%
      const rawProgress = (elapsed / totalDuration) * 100;
      const easedProgress = Math.min(95, rawProgress * (2 - rawProgress / 100));
      setProgress(easedProgress);
      
      // Update current step based on progress
      if (easedProgress < 15) setCurrentStep(0);
      else if (easedProgress < 40) setCurrentStep(1);
      else setCurrentStep(2);
    }, 100);

    return () => clearInterval(progressInterval);
  }, []);

  // Rotate tips every 6 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % TIPS_DATA.length);
        setTipFading(false);
      }, 300);
    }, 6000);

    return () => clearInterval(tipInterval);
  }, []);

  const currentTip = TIPS_DATA[currentTipIndex];

  return (
    <div className="bg-white rounded-2xl border border-[#D6CFC2]/60 shadow-sm overflow-hidden">
      {/* Main Content */}
      <div className="p-8 text-center">
        {/* Animated Icon */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-[#E7E2D7]" />
          <div 
            className="absolute inset-0 rounded-full border-4 border-[#6B7F6B] border-t-transparent animate-spin"
            style={{ animationDuration: '1.5s' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-[#6B7F6B]" />
          </div>
        </div>

        <h2 className="text-2xl font-serif font-bold text-[#2a2a2a]">
          Crafting Your Learning Path
        </h2>
        <p className="text-sm text-[#888] mt-2 max-w-md mx-auto">
          Creating a personalized curriculum for <span className="font-medium text-[#6B7F6B]">"{subject}"</span>
        </p>

        {/* Progress Bar */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="flex justify-between text-xs text-[#888] mb-2">
            <span>Progress</span>
            <span className="font-medium text-[#6B7F6B]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[#E7E2D7] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#6B7F6B] to-[#8FBC8F] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps with active indicators */}
        <div className="mt-8 space-y-3 max-w-sm mx-auto">
          {GENERATION_STEPS.map((step, index) => {
            const isComplete = index < currentStep;
            const isActive = index === currentStep;
            
            return (
              <div 
                key={step.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300",
                  isActive && "bg-[#6B7F6B]/5 border border-[#6B7F6B]/20",
                  isComplete && "opacity-70"
                )}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {isComplete ? (
                    <div className="w-6 h-6 rounded-full bg-[#6B7F6B] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : isActive ? (
                    <div className="w-6 h-6 rounded-full bg-[#6B7F6B]/10 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#6B7F6B] animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#E7E2D7] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#ccc]" />
                    </div>
                  )}
                </div>
                
                {/* Label */}
                <span className={cn(
                  "text-sm transition-colors",
                  isActive ? "text-[#2a2a2a] font-medium" : "text-[#888]"
                )}>
                  {step.label}
                  {isActive && <span className="text-[#6B7F6B]">...</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips Section */}
      <div className="border-t border-[#E7E2D7] bg-gradient-to-r from-[#F7F5F0] to-[#FAF8F5] p-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white border border-[#E7E2D7] flex items-center justify-center text-xl shadow-sm">
              {currentTip.emoji}
            </div>
            <div className={cn(
              "flex-1 transition-opacity duration-300",
              tipFading ? "opacity-0" : "opacity-100"
            )}>
              <div className="text-xs font-semibold text-[#6B7F6B] uppercase tracking-wider mb-1">
                {currentTip.category}
              </div>
              <p className="text-sm text-[#555] leading-relaxed">
                {currentTip.text}
              </p>
            </div>
          </div>
          
          {/* Tip Navigation Dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {TIPS_DATA.map((_, index) => (
              <div 
                key={index}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  index === currentTipIndex ? "bg-[#6B7F6B] w-4" : "bg-[#D6CFC2]"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Optional: Quick Action */}
      <div className="border-t border-[#E7E2D7] bg-white p-4">
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="text-[#888]">While you wait:</span>
          <button className="px-4 py-1.5 rounded-lg border border-[#D6CFC2] text-[#666] hover:bg-[#F7F5F0] hover:border-[#6B7F6B] transition-all flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Set study reminder
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Path Preview Component
// ============================================================================

type ViewMode = "graph" | "list";

function PathPreview({
  graph,
  onAccept,
  onRegenerate,
  onBack,
  isRegenerating,
}: {
  graph: HierarchicalGraphResponse;
  onAccept: () => void;
  onRegenerate: () => void;
  onBack: () => void;
  isRegenerating: boolean;
}) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("graph");

  return (
    <div className="bg-white rounded-2xl border border-[#D6CFC2]/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#E7E2D7] bg-gradient-to-r from-[#F7F5F0] to-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#2a2a2a] flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#6B7F6B]" />
              {graph.subject}
            </h2>
            <p className="text-sm text-[#888] mt-1">Review your personalized learning path</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#6B7F6B]">{graph.main_topic_count}</div>
            <div className="text-xs text-[#888]">Main Topics</div>
          </div>
        </div>

        {/* Stats - with better contrast and difficulty color coding */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center p-3 rounded-xl bg-white border border-[#E7E2D7] shadow-sm">
            <div className="text-xl font-bold text-[#2a2a2a]">{graph.total_subtopic_count}</div>
            <div className="text-xs font-medium text-[#555]">Lessons</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-white border border-[#E7E2D7] shadow-sm">
            <div className="text-xl font-bold text-[#2a2a2a]">~{Math.round(graph.total_estimated_minutes / 60)}h</div>
            <div className="text-xs font-medium text-[#555]">Total Time</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-white border border-[#E7E2D7] shadow-sm">
            <div className="flex items-center justify-center gap-1.5">
              {/* Difficulty indicator dot matching the graph colors */}
              {(() => {
                // Handle malformed difficulty strings like "beginner|intermediate|advanced"
                const rawDifficulty = graph.difficulty_level?.toLowerCase() || 'intermediate';
                const difficulty = rawDifficulty.includes('|') 
                  ? rawDifficulty.split('|')[0].trim() 
                  : rawDifficulty;
                const color = difficulty === 'beginner' ? '#66BB6A' 
                  : difficulty === 'advanced' ? '#EF5350' 
                  : '#FFA726';
                const label = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
                return (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xl font-bold text-[#2a2a2a]">{label}</span>
                  </>
                );
              })()}
            </div>
            <div className="text-xs font-medium text-[#555]">Difficulty</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-white border border-[#E7E2D7] shadow-sm">
            <div className="text-xl font-bold text-[#2a2a2a]">{graph.estimated_duration_weeks}w</div>
            <div className="text-xs font-medium text-[#555]">Duration</div>
          </div>
        </div>

        {/* Ratings Display */}
        {graph.id && (
          <div className="mt-4 pt-4 border-t border-[#E7E2D7]">
            <PathRatingsDisplay graphId={graph.id} />
          </div>
        )}
      </div>

      {/* View Toggle */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#2a2a2a]">Learning Path Structure</h3>
        <div className="flex bg-[#F7F5F0] rounded-lg p-1 border border-[#E7E2D7]">
          <button
            onClick={() => setViewMode("graph")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              viewMode === "graph"
                ? "bg-white text-[#6B7F6B] shadow-sm"
                : "text-[#888] hover:text-[#666]"
            )}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="5" cy="12" r="3" />
                <circle cx="19" cy="5" r="3" />
                <circle cx="19" cy="19" r="3" />
                <path d="M8 12h5m3-5l-3 5m0 0l3 5" />
              </svg>
              Graph
            </span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              viewMode === "list"
                ? "bg-white text-[#6B7F6B] shadow-sm"
                : "text-[#888] hover:text-[#666]"
            )}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <circle cx="4" cy="6" r="1" fill="currentColor" />
                <circle cx="4" cy="12" r="1" fill="currentColor" />
                <circle cx="4" cy="18" r="1" fill="currentColor" />
              </svg>
              List
            </span>
          </button>
        </div>
      </div>

      {/* Graph View */}
      {viewMode === "graph" && (
        <div className="p-4">
          <LearningPathGraph
            graph={{
              subject: graph.subject,
              main_topic_count: graph.main_topic_count,
              total_subtopic_count: graph.total_subtopic_count,
              total_estimated_minutes: graph.total_estimated_minutes,
              difficulty_level: graph.difficulty_level,
              estimated_duration_weeks: graph.estimated_duration_weeks,
              main_topics: graph.main_topics.map((t) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                subtopic_count: t.subtopic_count,
                estimated_minutes: t.estimated_minutes,
                difficulty: t.difficulty,
                prerequisites: t.prerequisites || [],
                subtopics: t.subtopics.map((s) => ({
                  id: s.id,
                  title: s.title,
                  estimated_minutes: s.estimated_minutes,
                  difficulty: s.difficulty,
                })),
              })),
            }}
            className="h-[450px]"
          />
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="p-4 max-h-[450px] overflow-y-auto">
          <div className="space-y-2">
            {graph.main_topics.map((topic, i) => (
              <div key={topic.id} className="border border-[#E7E2D7] rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-[#F7F5F0] transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#6B7F6B]/10 flex items-center justify-center text-sm font-bold text-[#6B7F6B]">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#2a2a2a] truncate">{topic.title}</div>
                    <div className="text-xs text-[#888]">
                      {topic.subtopic_count} lessons • ~{topic.estimated_minutes}min
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      "w-5 h-5 text-[#888] transition-transform",
                      expandedTopic === topic.id && "rotate-90"
                    )}
                  />
                </button>

                {expandedTopic === topic.id && (
                  <div className="border-t border-[#E7E2D7] bg-[#F7F5F0] p-3">
                    <p className="text-sm text-[#666] mb-3">{topic.description}</p>
                    {topic.subtopics.length > 0 ? (
                      <div className="space-y-1.5">
                        {topic.subtopics.map((sub, j) => (
                          <div key={sub.id} className="flex items-center gap-2 text-sm">
                            <div className="w-5 h-5 rounded bg-white border border-[#D6CFC2] flex items-center justify-center text-xs text-[#888]">
                              {j + 1}
                            </div>
                            <span className="text-[#2a2a2a]">{sub.title}</span>
                            <span className="text-xs text-[#888] ml-auto">{sub.estimated_minutes}min</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#888] italic">
                        {topic.subtopic_count} lessons — generated when you start this milestone.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-[#E7E2D7] bg-gradient-to-r from-[#F7F5F0] to-white">
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="py-3 px-5 border border-[#D6CFC2] text-[#555] font-medium rounded-xl hover:bg-white hover:border-[#6B7F6B] transition-all"
          >
            ← Back
          </button>
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-2 py-3 px-5 border border-[#D6CFC2] text-[#555] font-medium rounded-xl hover:bg-white hover:border-[#6B7F6B] transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isRegenerating && "animate-spin")} />
            Regenerate
          </button>
          {/* Vibrant CTA - bright sage with dark text for maximum impact */}
          <button
            onClick={onAccept}
            className="flex-1 py-3.5 px-6 bg-[#8FBC8F] hover:bg-[#7CAD7C] text-[#1a2e1a] font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Accept & Start Learning
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function NewPathPage() {
  const router = useRouter();
  const { userName, studentId, profile, setProfile } = useAppStore();

  // State
  const [step, setStep] = useState<Step>("chat");
  const [dimensions, setDimensions] = useState<Dimension[]>(initialDimensions);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [extractedProfile, setExtractedProfile] = useState<ExtractedProfile | null>(null);
  const [subject, setSubject] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGraph, setGeneratedGraph] = useState<HierarchicalGraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize - check if profile exists (coming from profile-summary) or start chat
  useEffect(() => {
    const initSession = async () => {
      if (!studentId) {
        router.push("/login");
        return;
      }

      // Check if user already has a complete profile (coming from profile-summary)
      if (profile && profile.goals && profile.goals.length > 0) {
        // Profile exists - skip chat AND review, go directly to generating
        const existingProfile: ExtractedProfile = {
          knowledge_base: profile.knowledge_base || {},
          cognitive_style: profile.cognitive_style || "mixed",
          goals: profile.goals || [],
          learning_pace: typeof profile.learning_pace === "number" ? profile.learning_pace : 0.5,
          weak_points: profile.weak_points || [],
          content_preferences: profile.content_preferences || [],
          subject: profile.goals[0], // First goal is usually the subject
        };
        setExtractedProfile(existingProfile);
        const subjectToLearn = profile.goals[0];
        setSubject(subjectToLearn);
        setStep("generating");
        setIsGenerating(true);
        setIsInitializing(false);
        
        // Generate path directly
        try {
          const result = await generateHierarchicalGraph(subjectToLearn, studentId, {
            goals: profile.goals || [],
            knowledgeBase: profile.knowledge_base || {},
            cognitiveStyle: profile.cognitive_style || "mixed",
            learningPace: profile.learning_pace || 0.5,
          });
          setGeneratedGraph(result.graph);
          setStep("preview");
        } catch (err: any) {
          console.error("Graph generation failed:", err);
          // On failure, redirect back to profile-summary with error
          router.push("/profile-summary?error=generation_failed");
        } finally {
          setIsGenerating(false);
        }
        return;
      }

      // No profile - redirect to profile chat (onboarding)
      router.push("/profile-chat");
    };
    initSession();
  }, [studentId, userName, router, profile]);

  const updateDimensionsFromProgress = (scores: Record<string, number>) => {
    setDimensions((prev) =>
      prev.map((dim) => ({
        ...dim,
        progress: Math.min(100, (scores[dim.id] || 0) * 100),
      }))
    );
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: userMessage }]);
    setIsTyping(true);

    try {
      if (sessionId) {
        const data = await sendMessage(sessionId, userMessage);

        if (data.progress?.confidence_scores) {
          updateDimensionsFromProgress(data.progress.confidence_scores);
        }

        const extractedTags = (data.extracted_dimensions || []).map((dim: string) => ({
          dimension: dim.toUpperCase().replace(/_/g, " "),
          value: "Detected",
        }));

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "ai",
            content: data.response,
            tags: extractedTags,
          },
        ]);

        // Check if profiling is complete
        if (data.status === "complete" && data.profile) {
          setExtractedProfile(data.profile);
          setProfile(data.profile);
          setTimeout(() => setStep("review"), 500);
        }
      }
    } catch (err) {
      console.error("API error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "ai",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Called from ProfileReview when user confirms
  const handleConfirmProfile = () => {
    // Get subject from profile - use first goal or subject field
    const subjectToLearn = extractedProfile?.subject || extractedProfile?.goals?.[0] || "General Learning";
    setSubject(subjectToLearn);
    handleGenerateGraph(subjectToLearn);
  };

  const handleGenerateGraph = async (subjectName: string) => {
    setStep("generating");
    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateHierarchicalGraph(subjectName, studentId!, {
        goals: extractedProfile?.goals || profile?.goals || [],
        knowledgeBase: extractedProfile?.knowledge_base || profile?.knowledge_base || {},
        cognitiveStyle: extractedProfile?.cognitive_style || profile?.cognitive_style || "mixed",
        learningPace: extractedProfile?.learning_pace || profile?.learning_pace || 0.5,
      });

      setGeneratedGraph(result.graph);
      setStep("preview");
    } catch (err: any) {
      console.error("Graph generation failed:", err);
      // Provide user-friendly error messages
      let errorMessage = "Failed to generate learning path";
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        errorMessage = "Generation is taking longer than expected. The AI service may be busy. Please try again.";
      } else if (err.response?.status === 500) {
        errorMessage = "Server error occurred. Please try again in a moment.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      // Stay on generating step but show error, don't go back to review
      // User can retry or go back
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptPath = () => {
    if (generatedGraph) {
      router.push(`/notebook?graph=${generatedGraph.id}`);
    }
  };

  const handleEditProfile = (field: string, value: any) => {
    if (extractedProfile) {
      setExtractedProfile({ ...extractedProfile, [field]: value });
    }
  };

  const overallProgress = Math.round(dimensions.reduce((sum, d) => sum + d.progress, 0) / dimensions.length);

  // Loading state
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#6B7F6B]" />
          <p className="text-[#666]">Preparing your learning path creator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#6B7F6B]/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#D6CFC2]/30 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push("/analytics")}
            className="p-2 rounded-lg hover:bg-[#E7E2D7] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#666]" />
          </button>
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#2a2a2a] flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#6B7F6B]" />
              Create New Learning Path
            </h1>
          </div>
        </div>

        {/* Phase Badge */}
        <PhaseBadge currentStep={step} />

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded">
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}

        {/* Step: Chat */}
        {step === "chat" && (
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Progress Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-[#D6CFC2]/60 p-4 shadow-sm sticky top-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#2a2a2a]">Profile Progress</h3>
                  <span className="text-sm font-bold text-[#6B7F6B]">{overallProgress}%</span>
                </div>
                <div className="w-full h-2 bg-[#E7E2D7] rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6B7F6B] to-[#8a9ba3] rounded-full transition-all duration-500"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <div className="space-y-3">
                  {dimensions.map((dim) => {
                    const Icon = dim.icon;
                    return (
                      <div key={dim.id} className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            dim.progress >= 70 ? "bg-[#6B7F6B]/10 text-[#6B7F6B]" : "bg-[#E7E2D7] text-[#888]"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[#666]">{dim.name}</span>
                            {dim.progress >= 70 && <CheckCircle2 className="w-3 h-3 text-[#6B7F6B]" />}
                          </div>
                          <div className="w-full h-1 bg-[#E7E2D7] rounded-full mt-1">
                            <div
                              className="h-full bg-[#6B7F6B] rounded-full transition-all duration-300"
                              style={{ width: `${dim.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-[#D6CFC2]/60 shadow-sm overflow-hidden">
                <div className="h-[450px] overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-3",
                          msg.role === "user" ? "bg-[#6B7F6B] text-white" : "bg-[#F7F5F0] text-[#2a2a2a]"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.tags && msg.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {msg.tags.map((tag, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#6B7F6B]/20 text-[#5a6d5a]">
                                {tag.dimension}: {tag.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-[#F7F5F0] rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-[#6B7F6B] rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-[#6B7F6B] rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <span className="w-2 h-2 bg-[#6B7F6B] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t border-[#E7E2D7] p-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                      placeholder="Type your response..."
                      disabled={isTyping}
                      className="flex-1 px-4 py-3 rounded-xl border border-[#D6CFC2] focus:outline-none focus:ring-2 focus:ring-[#6B7F6B]/30 focus:border-[#6B7F6B] disabled:opacity-50"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isTyping}
                      className="px-4 py-3 bg-[#6B7F6B] text-white rounded-xl hover:bg-[#5a6d5a] disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Review Profile */}
        {step === "review" && extractedProfile && (
          <ProfileReview
            profile={extractedProfile}
            onConfirm={handleConfirmProfile}
            onEdit={handleEditProfile}
            onBack={() => setStep("chat")}
          />
        )}

        {/* Step: Generating - Enhanced UX */}
        {step === "generating" && (
          <GeneratingState subject={subject} />
        )}

        {/* Step: Preview Path */}
        {step === "preview" && generatedGraph && (
          <PathPreview
            graph={generatedGraph}
            onAccept={handleAcceptPath}
            onRegenerate={() => handleGenerateGraph(subject)}
            onBack={() => setStep("review")}
            isRegenerating={isGenerating}
          />
        )}
      </div>
    </div>
  );
}
