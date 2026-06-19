"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Database,
  Layers,
  Target,
  Zap,
  Clock,
  Settings,
  ArrowLeft,
  Loader2,
  BookOpen,
  Edit3,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Play,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import LearningPathGraph from "@/app/components/LearningPathGraph";
import {
  startChat,
  sendMessage,
  generateHierarchicalGraphStream,
  ensureSubtopicsForTopic,
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
    generating: { label: "Crafting Your Path", icon: "" },
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
          <Zap className="w-4 h-4" />
          Generate Learning Path →
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Generating State Component - Immersive Neural Network Visualization
// ============================================================================

const TIPS_DATA = [
  { emoji: "🧠", category: "Learning Science", text: "Spaced repetition helps retention — we'll build that into your learning path." },
  { emoji: "🎯", category: "Quick Win", text: "Breaking complex topics into small milestones makes learning feel achievable." },
  { emoji: "📊", category: "Did You Know", text: "Students who follow personalized paths learn 30% faster than those using generic curricula." },
  { emoji: "💡", category: "Pro Tip", text: "Mixing different content types (videos, quizzes, code) improves long-term memory retention." },
  { emoji: "⚡", category: "Efficiency", text: "Your AI tutor adapts explanations based on your cognitive style — watch for personalized hints!" },
  { emoji: "🔬", category: "Research", text: "Active recall through quizzes is 2x more effective than passive re-reading for knowledge retention." },
  { emoji: "🌱", category: "Growth Mindset", text: "Struggling with a topic? That's where real learning happens. We'll adjust your path accordingly." },
  { emoji: "🎨", category: "Personalization", text: "Visual learners get more diagrams. Verbal learners get more detailed explanations. Everyone wins." },
];

const STATUS_MESSAGES = [
  "Analyzing your knowledge profile...",
  "Identifying optimal learning sequences...",
  "Mapping prerequisite dependencies...",
  "Calibrating difficulty progression...",
  "Personalizing content for your style...",
  "Building your topic roadmap...",
  "Optimizing milestone ordering...",
  "Crafting your curriculum...",
];

// Constellation node positions for the animated graph (12 nodes in a flowing layout)
const CONSTELLATION_NODES = [
  { x: 15, y: 25 }, { x: 35, y: 15 }, { x: 55, y: 22 }, { x: 75, y: 12 },
  { x: 85, y: 35 }, { x: 68, y: 45 }, { x: 45, y: 50 }, { x: 25, y: 48 },
  { x: 12, y: 65 }, { x: 35, y: 72 }, { x: 58, y: 68 }, { x: 80, y: 62 },
];

const CONSTELLATION_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
  [7, 8], [8, 9], [9, 10], [10, 11], [11, 4], [6, 10], [1, 6], [2, 5],
];

function ConstellationCanvas({
  activeNodes,
  totalNodes,
}: {
  activeNodes: number;
  totalNodes: number;
}) {
  const visibleNodes = Math.min(activeNodes, CONSTELLATION_NODES.length);

  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 100 80" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6B7F6B" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#6B7F6B" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges — draw connections as they form */}
        {CONSTELLATION_EDGES.map(([from, to], i) => {
          const bothVisible = from < visibleNodes && to < visibleNodes;
          const fromNode = CONSTELLATION_NODES[from];
          const toNode = CONSTELLATION_NODES[to];
          return (
            <motion.line
              key={`edge-${i}`}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke={bothVisible ? "#6B7F6B" : "#E7E2D7"}
              strokeWidth={bothVisible ? 0.4 : 0.15}
              strokeOpacity={bothVisible ? 0.6 : 0.3}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: bothVisible ? 1 : 0.3 }}
              transition={{ duration: 1.2, delay: i * 0.08, ease: "easeOut" }}
            />
          );
        })}

        {/* Ghost nodes (not yet generated) */}
        {CONSTELLATION_NODES.map((node, i) => (
          i >= visibleNodes && (
            <circle
              key={`ghost-${i}`}
              cx={node.x}
              cy={node.y}
              r={1}
              fill="#D6CFC2"
              opacity={0.4}
            />
          )
        ))}

        {/* Active nodes with staggered entrance */}
        {CONSTELLATION_NODES.slice(0, visibleNodes).map((node, i) => (
          <motion.g key={`node-${i}`}>
            {/* Outer glow ring */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={3.5}
              fill="url(#nodeGlow)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1], opacity: [0, 0.4, 0.2] }}
              transition={{ duration: 1.5, delay: i * 0.15 }}
            />
            {/* Main node */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={1.8}
              fill="#6B7F6B"
              filter="url(#glow)"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 15,
                delay: i * 0.15,
              }}
            />
            {/* Inner bright dot */}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={0.7}
              fill="#C8E6C9"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.6] }}
              transition={{ duration: 2, delay: i * 0.15, repeat: Infinity, repeatType: "reverse" }}
            />
          </motion.g>
        ))}

        {/* Traveling particles along edges */}
        {CONSTELLATION_EDGES.slice(0, Math.min(visibleNodes, CONSTELLATION_EDGES.length)).map(([from, to], i) => {
          if (from >= visibleNodes || to >= visibleNodes) return null;
          const fromNode = CONSTELLATION_NODES[from];
          const toNode = CONSTELLATION_NODES[to];
          return (
            <motion.circle
              key={`particle-${i}`}
              r={0.4}
              fill="#8FBC8F"
              opacity={0.8}
              initial={{ cx: fromNode.x, cy: fromNode.y }}
              animate={{
                cx: [fromNode.x, toNode.x, fromNode.x],
                cy: [fromNode.y, toNode.y, fromNode.y],
              }}
              transition={{
                duration: 3 + (i % 3),
                delay: i * 0.3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

function GeneratingState({
  subject,
  milestoneCount,
  expectedMilestones,
}: {
  subject: string;
  milestoneCount: number;
  expectedMilestones: number;
}) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [simulatedNodes, setSimulatedNodes] = useState(1);
  const [lastNodeName, setLastNodeName] = useState("");

  // Simulated milestone names that flash when a node appears
  const SIMULATED_NAMES = [
    "Core Foundations", "Key Concepts", "Building Blocks", "Fundamentals",
    "Applied Methods", "Advanced Topics", "Practical Skills", "Integration",
    "Deep Dive", "Synthesis", "Mastery Path", "Final Review",
  ];

  // Elapsed time counter — drives everything
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate nodes appearing every ~4 seconds, up to 12
  useEffect(() => {
    if (elapsedSeconds > 0 && elapsedSeconds % 4 === 0) {
      setSimulatedNodes((prev) => {
        const next = Math.min(prev + 1, CONSTELLATION_NODES.length);
        if (next > prev) {
          setLastNodeName(SIMULATED_NAMES[(next - 1) % SIMULATED_NAMES.length]);
        }
        return next;
      });
    }
  }, [elapsedSeconds]);

  // If real milestones arrive, jump simulated nodes up to match
  useEffect(() => {
    if (milestoneCount > simulatedNodes) {
      setSimulatedNodes(milestoneCount);
    }
  }, [milestoneCount, simulatedNodes]);

  // Progress: smooth easing curve based on elapsed time, targeting ~55s
  // Uses an ease-out curve: fast at first, slows down, caps at 90%
  const targetSeconds = 55;
  const rawProgress = Math.min(elapsedSeconds / targetSeconds, 1);
  const easedProgress = 1 - Math.pow(1 - rawProgress, 2.5); // ease-out
  const progress = Math.min(easedProgress * 90, 90); // cap at 90%

  // Rotate status messages every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Rotate tips every 7 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % TIPS_DATA.length);
    }, 7000);
    return () => clearInterval(tipInterval);
  }, []);

  const currentTip = TIPS_DATA[currentTipIndex];
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#D6CFC2]/40 bg-gradient-to-b from-[#1a2e1a] via-[#1e3320] to-[#162816] shadow-2xl">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-[#6B7F6B]/15 rounded-full blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-[#8FBC8F]/10 rounded-full blur-[60px]" />
      </div>

      {/* Constellation Visualization */}
      <div className="relative h-[300px] sm:h-[340px]">
        <ConstellationCanvas
          activeNodes={simulatedNodes}
          totalNodes={CONSTELLATION_NODES.length}
        />

        {/* Center overlay text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {/* Progress ring */}
          <div className="relative w-28 h-28 mb-3">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#2d4a2d" strokeWidth="4" />
              <motion.circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke="#8FBC8F"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={264}
                animate={{ strokeDashoffset: 264 - (264 * progress) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white/90">
                {Math.round(progress)}%
              </span>
              <span className="text-[10px] text-white/40 uppercase tracking-wider">
                {simulatedNodes} / {CONSTELLATION_NODES.length} nodes
              </span>
            </div>
          </div>

          <h2 className="text-lg font-serif font-bold text-white/90 mb-1">
            Building Your Path
          </h2>
          <AnimatePresence mode="wait">
            <motion.p
              key={statusIndex}
              className="text-xs text-[#8FBC8F]/80 max-w-xs text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
            >
              {STATUS_MESSAGES[statusIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Discovered milestone flash */}
      <AnimatePresence>
        {lastNodeName && (
          <motion.div
            key={lastNodeName + simulatedNodes}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.5 }}
          >
            <div className="px-4 py-2 rounded-full bg-[#8FBC8F]/20 border border-[#8FBC8F]/30 backdrop-blur-sm">
              <span className="text-xs text-[#8FBC8F] font-medium">
                Discovered: {lastNodeName}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom info panel */}
      <div className="relative border-t border-white/5 bg-black/20 backdrop-blur-sm">
        {/* Subject + meta row */}
        <div className="px-6 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-[#8FBC8F] flex-shrink-0" />
            <span className="text-sm text-white/70 truncate">
              {subject}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/30 flex-shrink-0">
            <span>{formatTime(elapsedSeconds)}</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-white/40">~{Math.max(0, 55 - elapsedSeconds)}s left</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-4">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#6B7F6B] via-[#8FBC8F] to-[#6B7F6B] rounded-full"
              style={{ backgroundSize: "200% 100%" }}
              animate={{
                width: `${Math.max(progress, 3)}%`,
                backgroundPosition: ["0% 0%", "100% 0%"],
              }}
              transition={{
                width: { duration: 1.5, ease: "easeOut" },
                backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" },
              }}
            />
          </div>
        </div>

        {/* Tip carousel */}
        <div className="px-6 pb-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTipIndex}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <span className="text-lg flex-shrink-0 mt-0.5">{currentTip.emoji}</span>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-[#8FBC8F] uppercase tracking-wider mb-0.5">
                  {currentTip.category}
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  {currentTip.text}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
          {/* Dots */}
          <div className="flex justify-center gap-1 mt-3">
            {TIPS_DATA.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  index === currentTipIndex ? "bg-[#8FBC8F] w-4" : "bg-white/10 w-1"
                )}
              />
            ))}
          </div>
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
  studentId,
}: {
  graph: HierarchicalGraphResponse;
  onAccept: () => void;
  onRegenerate: () => void;
  onBack: () => void;
  isRegenerating: boolean;
  studentId: string;
}) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [topicCache, setTopicCache] = useState<Record<string, MainTopicInfo>>({});
  const [loadingTopics, setLoadingTopics] = useState<Record<string, boolean>>({});
  const [topicErrors, setTopicErrors] = useState<Record<string, string | null>>({});

  const handleToggleTopic = async (topic: MainTopicInfo) => {
    const isExpanded = expandedTopic === topic.id;
    setExpandedTopic(isExpanded ? null : topic.id);

    if (isExpanded) return;
    if (topicCache[topic.id]) return;
    if (topic.subtopics.length > 0) return;

    setLoadingTopics((prev) => ({ ...prev, [topic.id]: true }));
    setTopicErrors((prev) => ({ ...prev, [topic.id]: null }));

    try {
      const materialized = await ensureSubtopicsForTopic(graph.id, topic.id, studentId);
      setTopicCache((prev) => ({ ...prev, [topic.id]: materialized }));
    } catch (err: any) {
      console.error(`Failed to load subtopics for ${topic.id}:`, err);
      setTopicErrors((prev) => ({
        ...prev,
        [topic.id]: err.message || "Failed to load lessons. Please try again.",
      }));
    } finally {
      setLoadingTopics((prev) => ({ ...prev, [topic.id]: false }));
    }
  };

  const getTopicSubtopics = (topic: MainTopicInfo) => {
    if (topicCache[topic.id]) return topicCache[topic.id].subtopics;
    return topic.subtopics;
  };

  // Computed stats
  const actualLessons = graph.main_topics.reduce((sum, t) => sum + t.subtopics.length, 0);
  const planned = graph.total_subtopic_count;
  const allLessonsLoaded = actualLessons >= planned && planned > 0;
  const totalMins = graph.main_topics.reduce((sum, t) => sum + t.subtopics.reduce((s, sub) => s + (sub.estimated_minutes || 0), 0), 0);
  const totalHours = Math.round(totalMins / 60);
  const rawDifficulty = graph.difficulty_level?.toLowerCase() || "intermediate";
  const difficulty = rawDifficulty.includes("|") ? rawDifficulty.split("|")[0].trim() : rawDifficulty;
  const difficultyColor = difficulty === "beginner" ? "#66BB6A" : difficulty === "advanced" ? "#EF5350" : "#FFA726";
  const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const difficultyHint = difficulty === "beginner" ? "Great for getting started" : difficulty === "advanced" ? "For experienced learners" : "Some prior knowledge helpful";

  return (
    <motion.div
      className="overflow-hidden rounded-2xl border border-[#D6CFC2]/40 shadow-lg bg-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero header with dark gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1a2e1a] via-[#1e3320] to-[#243826] px-6 pt-6 pb-5">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#6B7F6B]/15 rounded-full blur-[60px]" />
        <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-[#8FBC8F]/10 rounded-full blur-[40px]" />

        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 text-[#8FBC8F] text-xs font-medium uppercase tracking-wider mb-2">
              <Target className="w-3.5 h-3.5" />
              AI-Generated Just For You
            </div>
            <h2 className="text-2xl font-serif font-bold text-white/95 mb-1">
              {graph.subject}
            </h2>
            <p className="text-sm text-white/40">
              {graph.main_topic_count} milestones
              {allLessonsLoaded
                ? ` · ${actualLessons} lessons`
                : actualLessons > 0
                ? ` · ${actualLessons}/${planned} lessons loaded`
                : planned > 0
                ? ` · ${planned} lessons`
                : ""}
              {" · "}Personalized for your profile
            </p>
          </motion.div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              {
                value: allLessonsLoaded ? String(actualLessons) : actualLessons > 0 ? `${actualLessons}/${planned}` : planned > 0 ? String(planned) : "...",
                label: allLessonsLoaded ? "Lessons" : "Loading...",
                loading: !allLessonsLoaded,
              },
              {
                value: totalHours > 0 ? `~${totalHours}h` : "...",
                label: "Total Time",
                sub: totalHours > 0 && graph.estimated_duration_weeks > 0 ? `${Math.round(totalHours / graph.estimated_duration_weeks)}h/week` : undefined,
                loading: totalHours === 0,
              },
              {
                value: difficultyLabel,
                label: "Difficulty",
                dot: difficultyColor,
                sub: difficultyHint,
              },
              {
                value: graph.estimated_duration_weeks > 0 ? `${graph.estimated_duration_weeks}w` : "...",
                label: "Duration",
                sub: graph.estimated_duration_weeks > 0 ? `~${Math.round(graph.total_subtopic_count / graph.estimated_duration_weeks)} lessons/week` : undefined,
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="text-center p-2.5 rounded-xl bg-white/5 border border-white/5"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.08 }}
              >
                <div className="flex items-center justify-center gap-1.5">
                  {stat.dot && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.dot }} />}
                  <span className={cn(
                    "font-bold text-white/90",
                    stat.loading ? "text-base animate-pulse" : "text-lg"
                  )}>
                    {stat.value}
                  </span>
                </div>
                <div className="text-[10px] text-white/40 font-medium mt-0.5">{stat.label}</div>
                {stat.sub && <div className="text-[9px] text-white/25 mt-0.5">{stat.sub}</div>}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Ratings */}
        {graph.id && (
          <div className="relative mt-4 pt-3 border-t border-white/5">
            <PathRatingsDisplay graphId={graph.id} />
          </div>
        )}
      </div>

      {/* View Toggle */}
      <div className="px-5 pt-4 flex items-center justify-between">
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
              <Workflow className="w-3.5 h-3.5" />
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

      {/* Hint */}
      <div className="px-5 mt-2">
        <div className="flex items-center gap-2 text-xs text-[#999] bg-[#F7F5F0] rounded-lg px-3 py-2">
          <BookOpen className="w-3 h-3 text-[#6B7F6B]" />
          Tap any milestone to explore its lessons
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
              main_topics: graph.main_topics.map((t) => {
                const cached = topicCache[t.id];
                return {
                  id: t.id,
                  title: t.title,
                  description: t.description,
                  subtopic_count: cached?.subtopic_count ?? t.subtopic_count,
                  estimated_minutes: cached?.estimated_minutes ?? t.estimated_minutes,
                  difficulty: t.difficulty,
                  prerequisites: t.prerequisites || [],
                  subtopics: cached
                    ? cached.subtopics.map((s) => ({
                        id: s.id,
                        title: s.title,
                        estimated_minutes: s.estimated_minutes,
                        difficulty: s.difficulty,
                      }))
                    : t.subtopics.map((s) => ({
                        id: s.id,
                        title: s.title,
                        estimated_minutes: s.estimated_minutes,
                        difficulty: s.difficulty,
                      })),
                };
              }),
            }}
            className="h-[450px]"
          />
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="p-4 max-h-[450px] overflow-y-auto">
          <div className="space-y-2">
            {graph.main_topics.map((topic, i) => {
              const subtopics = getTopicSubtopics(topic);
              const isLoading = loadingTopics[topic.id];
              const error = topicErrors[topic.id];

              return (
                <motion.div
                  key={topic.id}
                  className="border border-[#E7E2D7] rounded-xl overflow-hidden"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <button
                    onClick={() => handleToggleTopic(topic)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-[#F7F5F0] transition-colors text-left"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                      expandedTopic === topic.id
                        ? "bg-[#6B7F6B] text-white"
                        : "bg-[#6B7F6B]/10 text-[#6B7F6B]"
                    )}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#2a2a2a] truncate">{topic.title}</div>
                      <div className="text-xs text-[#888]">
                        {topic.subtopics.length > 0
                          ? `${topic.subtopics.length} lessons · ~${topic.subtopics.reduce((s, sub) => s + (sub.estimated_minutes || 0), 0)}min`
                          : `${topic.subtopic_count} lessons planned`}
                      </div>
                    </div>
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 text-[#6B7F6B] animate-spin" />
                    ) : (
                      <ChevronRight
                        className={cn(
                          "w-5 h-5 text-[#888] transition-transform",
                          expandedTopic === topic.id && "rotate-90"
                        )}
                      />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedTopic === topic.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-[#E7E2D7] bg-[#F7F5F0] p-3">
                          <p className="text-sm text-[#666] mb-3">{topic.description}</p>
                          {isLoading ? (
                            <div className="flex items-center gap-2 py-2 text-sm text-[#888]">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating lessons for this milestone...
                            </div>
                          ) : error ? (
                            <div className="space-y-2">
                              <p className="text-xs text-red-600">{error}</p>
                              <button
                                onClick={() => handleToggleTopic(topic)}
                                className="text-xs font-medium text-[#6B7F6B] hover:text-[#5a6d5a] flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Retry
                              </button>
                            </div>
                          ) : subtopics.length > 0 ? (
                            <div className="space-y-1.5">
                              {subtopics.map((sub, j) => (
                                <motion.div
                                  key={sub.id}
                                  className="flex items-center gap-2 text-sm"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: j * 0.03 }}
                                >
                                  <div className="w-5 h-5 rounded bg-white border border-[#D6CFC2] flex items-center justify-center text-xs text-[#888]">
                                    {j + 1}
                                  </div>
                                  <span className="text-[#2a2a2a]">{sub.title}</span>
                                  <span className="text-xs text-[#888] ml-auto">{sub.estimated_minutes}min</span>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 py-2 text-sm text-[#888]">
                              <Loader2 className="w-4 h-4 animate-spin text-[#6B7F6B]" />
                              <span className="italic">{topic.subtopic_count} lessons generating in background...</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-5 border-t border-[#E7E2D7] bg-gradient-to-r from-[#F7F5F0] to-white">
        <div className="flex flex-col gap-3">
          <motion.button
            onClick={onAccept}
            className="w-full py-4 px-6 bg-gradient-to-r from-[#6B7F6B] to-[#5a6d5a] text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:shadow-xl transition-shadow"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Play className="w-5 h-5" />
            Accept & Start Learning
            <ChevronRight className="w-5 h-5" />
          </motion.button>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={onBack}
                className="py-2.5 px-4 text-sm text-[#888] font-medium rounded-lg hover:bg-[#F7F5F0] hover:text-[#555] transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Profile
              </button>
              <button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="py-2.5 px-4 text-sm text-[#888] font-medium rounded-lg hover:bg-[#F7F5F0] hover:text-[#6B7F6B] transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isRegenerating && "animate-spin")} />
                Regenerate
              </button>
            </div>
            <p className="text-xs text-[#aaa]">
              First milestone unlocked on start
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function NewPathPage() {
  const router = useRouter();
  const { userName, studentId, profile, setProfile, activeGraphId } = useAppStore();

  const notebookHref = activeGraphId
    ? `/notebook?graph=${activeGraphId}`
    : "/notebook";

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
        
        // Generate path directly via streaming
        try {
          const stream = generateHierarchicalGraphStream(subjectToLearn, studentId, {
            goals: profile.goals || [],
            knowledgeBase: profile.knowledge_base || {},
            cognitiveStyle: profile.cognitive_style || "mixed",
            learningPace: profile.learning_pace || 0.5,
          });
          for await (const event of stream) {
            if (event.event === "graph" && event.graph) {
              setGeneratedGraph(event.graph);
              setStep("preview");
              setIsGenerating(false);
            } else if (event.event === "subtopics_ready" && event.main_topic_id) {
              setGeneratedGraph((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  main_topics: prev.main_topics.map((mt) =>
                    mt.id === event.main_topic_id
                      ? { ...mt, subtopics: event.subtopics || [], subtopic_count: event.subtopics?.length || 0 }
                      : mt
                  ),
                };
              });
            } else if (event.event === "error") {
              router.push("/profile-summary?error=generation_failed");
              return;
            }
          }
        } catch (err: any) {
          console.error("Graph generation failed:", err);
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
      const stream = generateHierarchicalGraphStream(subjectName, studentId!, {
        goals: extractedProfile?.goals || profile?.goals || [],
        knowledgeBase: extractedProfile?.knowledge_base || profile?.knowledge_base || {},
        cognitiveStyle: extractedProfile?.cognitive_style || profile?.cognitive_style || "mixed",
        learningPace: extractedProfile?.learning_pace || profile?.learning_pace || 0.5,
      });

      for await (const event of stream) {
        if (event.event === "graph" && event.graph) {
          // Milestones ready — show preview immediately
          setGeneratedGraph(event.graph);
          setStep("preview");
          setIsGenerating(false);
        } else if (event.event === "subtopics_ready" && event.main_topic_id) {
          // One milestone's subtopics just arrived — fill it in
          setGeneratedGraph((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              main_topics: prev.main_topics.map((mt) =>
                mt.id === event.main_topic_id
                  ? { ...mt, subtopics: event.subtopics || [], subtopic_count: event.subtopics?.length || 0 }
                  : mt
              ),
            };
          });
        } else if (event.event === "error") {
          setError(event.error || "Generation failed");
          setIsGenerating(false);
          return;
        }
        // "complete" event — all subtopics done, nothing extra to do
      }
    } catch (err: any) {
      console.error("Graph generation failed:", err);
      let errorMessage = "Failed to generate learning path";
      if (err.message?.includes("timeout")) {
        errorMessage = "Generation is taking longer than expected. The AI service may be busy. Please try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptPath = () => {
    if (generatedGraph) {
      router.push(`/notebook?graph=${generatedGraph.id}&tour=1`);
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
            onClick={() => router.push(activeGraphId ? notebookHref : "/profile-summary")}
            className="p-2 rounded-lg hover:bg-[#E7E2D7] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#666]" />
          </button>
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#2a2a2a] flex items-center gap-2">
              <Workflow className="w-6 h-6 text-[#6B7F6B]" />
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
          <GeneratingState
            subject={subject}
            milestoneCount={generatedGraph?.main_topics?.length || 0}
            expectedMilestones={generatedGraph?.main_topic_count || 0}
          />
        )}

        {/* Step: Preview Path */}
        {step === "preview" && generatedGraph && (
          <PathPreview
            graph={generatedGraph}
            onAccept={handleAcceptPath}
            onRegenerate={() => handleGenerateGraph(subject)}
            onBack={() => setStep("review")}
            isRegenerating={isGenerating}
            studentId={studentId!}
          />
        )}
      </div>
    </div>
  );
}
