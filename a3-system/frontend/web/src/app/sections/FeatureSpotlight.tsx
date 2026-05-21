"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  MessageSquare,
  GitBranch,
  Layers,
  BarChart3,
  Brain,
  Sparkles,
  Zap,
  Eye,
  Target,
} from "lucide-react";
import ScrollReveal from "../components/landing/ScrollReveal";

/* ═══════════════════════════════════════════
   FEATURE DATA
   ═══════════════════════════════════════════ */

const features = [
  {
    id: "profiling",
    number: "01",
    label: "Profiling",
    headline: "Your Profile, Built From Conversation",
    body: "No forms. No quizzes. Just chat naturally. Our Profile Extractor and Gap Detector analyze every message to build a 6-dimension learning model — all in real-time.",
    agents: ["Profile Extractor", "Gap Detector"],
    capabilities: [
      "Knowledge base scoring (0.0-1.0 per topic)",
      "Cognitive style detection (visual / verbal / kinesthetic)",
      "Weak point identification via embedding analysis",
      "Confidence-weighted profile updates",
    ],
    metric: { value: "6", label: "Dimensions Analyzed", color: "#7C9A6B" },
    icon: MessageSquare,
  },
  {
    id: "pathing",
    number: "02",
    label: "Path Planning",
    headline: "A* Path Planning Over Knowledge Graphs",
    body: "NOBOGYAN runs A* search across a knowledge graph of 500+ topics to find your optimal learning path. The Dynamic Adaptation Engine reshuffles your route based on quiz performance, goals, and engagement.",
    agents: ["Path Planner", "Recommender", "Gate Agent"],
    capabilities: [
      "PageRank-informed heuristics",
      "Real-time replanning on quiz events",
      "Milestone gates with unlock scoring",
      "Content-based + collaborative filtering",
    ],
    metric: { value: "200ms", label: "Optimization Time", color: "#F39C12" },
    icon: GitBranch,
  },
  {
    id: "synthesis",
    number: "03",
    label: "Synthesis",
    headline: "Five Agents. One Click. Instant Resources.",
    body: "The Orchestrator dispatches specialized agents in parallel — Scholar for notes, Mapper for mind maps, Sage for quizzes, Director for video scripts, Architect for code. All checked for faithfulness before delivery.",
    agents: ["Orchestrator", "Scholar", "Mapper", "Sage", "Director", "Architect"],
    capabilities: [
      "Parallel async generation (30-60s total)",
      "Streaming progress via SSE",
      "Faithfulness verification on every output",
      "Content moderation for safety",
    ],
    metric: { value: "100%", label: "Faithfulness Verified", color: "#2ECC71" },
    icon: Layers,
  },
  {
    id: "multimodal",
    number: "04",
    label: "Multimodal",
    headline: "Tutoring Across Every Medium",
    body: "Ask via text, speak your question, upload a diagram, or receive auto-generated Mermaid charts. The Tutor Engine uses RAG grounding, profile adaptation, and rolling context summarization for deep, contextual help.",
    agents: ["Tutor Engine", "Vision LLM", "Voice Agent", "Faithfulness Checker"],
    capabilities: [
      "Streaming SSE responses",
      "Voice input/output with WebSocket streaming",
      "Image analysis (GPT-4o / Claude / Gemini)",
      "Auto-generated Mermaid diagrams",
    ],
    metric: { value: "4", label: "Input Modes", color: "#9B59B6" },
    icon: Sparkles,
  },
  {
    id: "assessment",
    number: "05",
    label: "Assessment",
    headline: "Adaptive Evaluation & Progress Tracking",
    body: "Adaptive quizzes, automated grading (code + short answer), gate-based milestone unlocking, and comprehensive analytics. The Evaluator Agent identifies weak topics and triggers remedial resource generation automatically.",
    agents: ["Quiz Agent", "Coding Grader", "SA Grader", "Evaluator"],
    capabilities: [
      "Dynamic difficulty based on mastery",
      "Judge0 sandbox for code execution",
      "LLM-based short answer evaluation",
      "Behavioral signal tracking",
    ],
    metric: { value: "85%", label: "Avg. Accuracy", color: "#1ABC9C" },
    icon: Target,
  },
];

/* ═══════════════════════════════════════════
   BENTO VISUALS - Enhanced with micro-interactions
   ═══════════════════════════════════════════ */

function ProfilingVisual() {
  const dimensions = [
    { label: "Knowledge Base", score: 85, color: "#7C9A6B", icon: "📚" },
    { label: "Learning Style", score: 72, color: "#3498DB", icon: "🎯" },
    { label: "Goal Clarity", score: 90, color: "#9B59B6", icon: "🚀" },
    { label: "Pace Preference", score: 65, color: "#E67E22", icon: "⚡" },
    { label: "Prior Experience", score: 45, color: "#E74C3C", icon: "💼" },
    { label: "Engagement Level", score: 88, color: "#1ABC9C", icon: "✨" },
  ];

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Chat Preview - Compact */}
      <div className="glass-premium rounded-2xl p-4 border border-white/50">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sage-400 to-sage-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-lg">N</div>
            <div className="flex-1">
              <div className="bg-sage-400/10 rounded-2xl rounded-tl-sm px-4 py-3 border border-sage-200/30">
                <p className="text-sm text-deep-charcoal/80">What would you like to learn today?</p>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 flex-row-reverse">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sand-300 to-sand-400 flex items-center justify-center text-deep-charcoal text-xs font-bold shrink-0 shadow-md">You</div>
            <div className="flex-1">
              <div className="bg-white rounded-2xl rounded-tr-sm px-4 py-3 border border-sand-200 shadow-sm">
                <p className="text-sm text-deep-charcoal/80">Docker and Kubernetes from scratch</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6-Dimension Profile Grid */}
      <div className="flex-1 glass-premium rounded-2xl p-5 border border-white/50">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono font-semibold text-deep-charcoal/50 uppercase tracking-wider">6-Dimension Profile</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-400/10 border border-green-400/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-mono text-green-600">Building...</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {dimensions.map((dim, i) => (
            <motion.div
              key={dim.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="group p-3 rounded-xl bg-white/60 border border-sand-200/50 hover:border-sage-300/50 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{dim.icon}</span>
                  <span className="text-[11px] font-medium text-deep-charcoal/70">{dim.label}</span>
                </div>
                <span className="text-xs font-mono font-bold" style={{ color: dim.color }}>{dim.score}%</span>
              </div>
              <div className="h-2 bg-sand-200/80 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${dim.score}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: dim.color }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PathingVisual() {
  const nodes = [
    { x: "5%", y: "78%", label: "Docker", icon: "🐳", mastery: 92, status: "completed" },
    { x: "25%", y: "60%", label: "Containers", icon: "📦", mastery: 85, status: "completed" },
    { x: "48%", y: "45%", label: "Images", icon: "💿", mastery: 78, status: "completed" },
    { x: "70%", y: "32%", label: "K8s Basics", icon: "☸️", mastery: 45, status: "current" },
    { x: "88%", y: "18%", label: "Pods", icon: "🔷", mastery: 0, status: "locked" },
  ];

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Graph canvas */}
      <div className="flex-1 glass-premium rounded-2xl p-5 relative overflow-hidden border border-white/50">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle, #7C9A6B 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }} />
        
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pathGradNew" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7C9A6B" />
              <stop offset="50%" stopColor="#F39C12" />
              <stop offset="100%" stopColor="#9B59B6" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {/* Main path */}
          <path
            d="M 8 82 C 20 70 30 62 35 58 C 45 50 55 45 60 42 C 70 35 80 28 92 15"
            fill="none"
            stroke="url(#pathGradNew)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
            filter="url(#glow)"
          />
          {/* Animated dashes */}
          <path
            d="M 8 82 C 20 70 30 62 35 58 C 45 50 55 45 60 42 C 70 35 80 28 92 15"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeDasharray="8 12"
            opacity="0.4"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-40" dur="2s" repeatCount="indefinite" />
          </path>
          {/* Data packet */}
          <circle r="4" fill="#F39C12" filter="url(#glow)">
            <animateMotion
              dur="3s"
              repeatCount="indefinite"
              path="M 8 82 C 20 70 30 62 35 58 C 45 50 55 45 60 42 C 70 35 80 28 92 15"
            />
          </circle>
        </svg>

        {/* Nodes */}
        {nodes.map((node, i) => (
          <motion.div
            key={node.label}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.12, type: "spring" }}
            className="absolute group cursor-pointer"
            style={{ left: node.x, top: node.y, transform: "translate(-50%, -50%)" }}
          >
            <div className={`relative flex flex-col items-center ${node.status === "locked" ? "opacity-40" : ""}`}>
              {/* Node circle */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg transition-transform group-hover:scale-110 ${
                node.status === "completed" ? "bg-gradient-to-br from-sage-400 to-sage-500" :
                node.status === "current" ? "bg-gradient-to-br from-amber-400 to-orange-500 ring-4 ring-amber-400/30" :
                "bg-sand-300"
              }`}>
                {node.icon}
              </div>
              {/* Label */}
              <div className={`mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium whitespace-nowrap ${
                node.status === "current" ? "bg-amber-400/20 text-amber-700" : "bg-white/80 text-deep-charcoal/70"
              }`}>
                {node.label}
              </div>
              {/* Mastery indicator */}
              {node.status !== "locked" && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
                  <span className="text-[8px] font-mono font-bold text-sage-600">{node.mastery}%</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* A* Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400/20 to-orange-400/20 border border-amber-400/30 shadow-lg"
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-[11px] font-mono font-bold text-amber-600">A* Optimized</span>
        </motion.div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Topics", value: "500+", color: "#7C9A6B", icon: "📊" },
          { label: "Edges", value: "2.4k", color: "#3498DB", icon: "🔗" },
          { label: "Depth", value: "12", color: "#9B59B6", icon: "📐" },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="glass-premium rounded-xl p-3 text-center border border-white/50 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm group-hover:scale-110 transition-transform">{stat.icon}</span>
              <div className="text-xl font-mono font-bold" style={{ color: stat.color }}>{stat.value}</div>
            </div>
            <div className="text-[10px] font-mono text-deep-charcoal/40 uppercase tracking-wider mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SynthesisVisual() {
  const resources = [
    { color: "#9B59B6", label: "Structured Notes", agent: "Scholar", icon: "📝", time: "8s", preview: "Key concepts highlighted with connections..." },
    { color: "#E67E22", label: "Mind Map", agent: "Mapper", icon: "🗺️", time: "12s", preview: "Visual hierarchy of Docker → K8s concepts" },
    { color: "#1ABC9C", label: "Adaptive Quiz", agent: "Sage", icon: "❓", time: "15s", preview: "10 questions, difficulty auto-adjusted" },
    { color: "#E74C3C", label: "Video Script", agent: "Director", icon: "🎬", time: "24s", preview: "5-min explainer with visual cues" },
    { color: "#34495E", label: "Code Lab", agent: "Architect", icon: "💻", time: "18s", preview: "Hands-on Dockerfile exercises" },
  ];

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Resource Cards - Bento Grid */}
      <div className="flex-1 glass-premium rounded-2xl p-4 border border-white/50">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono font-semibold text-deep-charcoal/50 uppercase tracking-wider">Generated Resources</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-400/10 border border-green-400/20">
            <Check className="w-3 h-3 text-green-500" />
            <span className="text-[10px] font-mono text-green-600">All Complete</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {resources.map((res, i) => (
            <motion.div
              key={res.label}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
              className={`group relative rounded-xl p-4 border-2 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 ${i === 0 ? "col-span-2" : ""}`}
              style={{ 
                background: `linear-gradient(135deg, ${res.color}08 0%, ${res.color}15 100%)`,
                borderColor: `${res.color}30`,
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-md"
                    style={{ backgroundColor: res.color }}
                  >
                    {res.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-deep-charcoal">{res.label}</h4>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span className="text-[10px] font-mono text-deep-charcoal/50">{res.agent}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/60">
                  <span className="text-[10px] font-mono text-deep-charcoal/40">{res.time}</span>
                  <Check className="w-3.5 h-3.5" style={{ color: res.color }} />
                </div>
              </div>
              
              {/* Preview */}
              <p className="text-[11px] text-deep-charcoal/60 leading-relaxed line-clamp-2">{res.preview}</p>
              
              {/* Hover action */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                <span className="text-[10px] font-mono font-medium px-3 py-1 rounded-full bg-white/90 shadow-sm" style={{ color: res.color }}>
                  View Sample →
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Progress Footer */}
      <div className="glass-premium rounded-xl p-4 border border-white/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sage-400/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-sage-500" />
            </div>
            <span className="text-xs font-medium text-deep-charcoal/70">Parallel Generation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-sage-600 font-bold">5/5</span>
            <span className="text-[10px] text-deep-charcoal/40">resources</span>
          </div>
        </div>
        <div className="h-2 bg-sand-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-sage-400 via-green-400 to-emerald-400 rounded-full relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function MultimodalVisual() {
  const modes = [
    { icon: MessageSquare, label: "Text", color: "#7C9A6B", desc: "Type your question", active: true },
    { icon: Brain, label: "Voice", color: "#3498DB", desc: "Speak naturally", active: false },
    { icon: Eye, label: "Vision", color: "#9B59B6", desc: "Upload images", active: false },
    { icon: GitBranch, label: "Diagram", color: "#E67E22", desc: "Auto-generate", active: false },
  ];

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Tutor Chat Interface */}
      <div className="flex-1 glass-premium rounded-2xl p-5 overflow-hidden border border-white/50">
        <div className="space-y-4">
          {/* NOBOGYAN Response with Diagram */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sage-400 to-sage-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-lg">N</div>
            <div className="flex-1">
              <div className="bg-sage-400/10 rounded-2xl rounded-tl-sm px-4 py-3 border border-sage-200/30">
                <p className="text-sm text-deep-charcoal/80 mb-3">Here&apos;s how pod-to-service communication works:</p>
                
                {/* Enhanced Diagram */}
                <div className="p-4 bg-white/70 rounded-xl border border-sand-200 shadow-inner">
                  <div className="flex items-center justify-between gap-2">
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-14 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                        🔷 Pod
                      </div>
                      <span className="text-[9px] font-mono text-blue-600">10.0.0.5</span>
                    </motion.div>
                    
                    <div className="flex-1 relative h-8">
                      <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-sage-400 to-purple-400 rounded-full -translate-y-1/2" />
                      <motion.div 
                        className="absolute top-1/2 w-3 h-3 bg-amber-400 rounded-full shadow-lg -translate-y-1/2"
                        animate={{ left: ["0%", "100%", "0%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white rounded text-[8px] font-mono text-deep-charcoal/50">
                        ClusterIP
                      </div>
                    </div>
                    
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-16 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                        ⚡ Service
                      </div>
                      <span className="text-[9px] font-mono text-purple-600">:8080</span>
                    </motion.div>
                  </div>
                </div>
              </div>
              
              {/* Voice synthesis indicator */}
              <div className="flex items-center gap-2 mt-2 px-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div 
                      key={i} 
                      className="w-1 bg-sage-400 rounded-full"
                      animate={{ height: [6, 12 + i * 2, 6] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-deep-charcoal/40 font-mono">Speaking response...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Mode Selector */}
      <div className="glass-premium rounded-xl p-3 border border-white/50">
        <div className="grid grid-cols-4 gap-2">
          {modes.map((mode, i) => (
            <motion.div
              key={mode.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl cursor-pointer transition-all ${
                mode.active
                  ? "bg-gradient-to-br from-sage-400 to-sage-500 text-white shadow-lg"
                  : "bg-white/50 text-deep-charcoal/50 hover:bg-white/80 hover:text-deep-charcoal/70"
              }`}
            >
              <mode.icon className={`w-5 h-5 ${mode.active ? "text-white" : ""}`} />
              <span className={`text-[11px] font-medium ${mode.active ? "text-white" : ""}`}>{mode.label}</span>
              {mode.active && (
                <span className="text-[9px] text-white/70">{mode.desc}</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssessmentVisual() {
  const modules = [
    { label: "Docker Fundamentals", value: 92, color: "#7C9A6B", trend: "+8%", icon: "🐳", status: "mastered" },
    { label: "Container Orchestration", value: 78, color: "#F39C12", trend: "+12%", icon: "📦", status: "proficient" },
    { label: "K8s Networking", value: 65, color: "#3498DB", trend: "+15%", icon: "🌐", status: "learning" },
    { label: "Pod Scheduling", value: 45, color: "#9B59B6", trend: "+5%", icon: "📅", status: "started" },
  ];

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Progress Dashboard */}
      <div className="flex-1 glass-premium rounded-2xl p-5 border border-white/50">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sage-400/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-sage-500" />
            </div>
            <span className="text-sm font-semibold text-deep-charcoal">Module Mastery</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sage-400/10 border border-sage-400/20">
            <span className="text-[10px] font-mono text-sage-600 font-medium">Week 4</span>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          </div>
        </div>
        
        <div className="space-y-4">
          {modules.map((item, i) => (
            <motion.div 
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group p-3 rounded-xl bg-white/50 border border-sand-200/50 hover:border-sage-300/50 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-xs font-medium text-deep-charcoal/80">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-green-500 font-medium bg-green-400/10 px-1.5 py-0.5 rounded">{item.trend}</span>
                  <span className="text-sm font-mono font-bold" style={{ color: item.color }}>{item.value}%</span>
                </div>
              </div>
              <div className="h-2.5 bg-sand-200/80 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value}%` }}
                  transition={{ duration: 0.8, delay: i * 0.15, ease: "easeOut" }}
                  className="h-full rounded-full relative"
                  style={{ backgroundColor: item.color }}
                >
                  {item.value >= 80 && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/80" />
                  )}
                </motion.div>
              </div>
              {/* Status badge */}
              <div className="flex items-center justify-between mt-2">
                <span className={`text-[9px] font-mono uppercase tracking-wider ${
                  item.status === "mastered" ? "text-green-600" :
                  item.status === "proficient" ? "text-amber-600" :
                  item.status === "learning" ? "text-blue-600" : "text-purple-600"
                }`}>
                  {item.status}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((dot) => (
                    <div 
                      key={dot} 
                      className={`w-1.5 h-1.5 rounded-full ${
                        (item.status === "mastered" && dot <= 4) ||
                        (item.status === "proficient" && dot <= 3) ||
                        (item.status === "learning" && dot <= 2) ||
                        (item.status === "started" && dot <= 1)
                          ? "bg-current" : "bg-sand-300"
                      }`}
                      style={{ color: item.color }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Gate Unlocked Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-premium rounded-xl p-4 border border-green-400/30 bg-gradient-to-r from-green-400/5 to-emerald-400/10"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
            <span className="text-2xl">🔓</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-deep-charcoal">Gate Unlocked!</span>
              <span className="text-[10px] font-mono text-green-600 bg-green-400/20 px-2 py-0.5 rounded-full">NEW</span>
            </div>
            <p className="text-xs text-deep-charcoal/50 mt-0.5">Advanced Scheduling module now available</p>
          </div>
          <motion.div 
            className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center shadow-md"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Check className="w-5 h-5 text-white" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

const visuals: Record<string, React.FC> = {
  profiling: ProfilingVisual,
  pathing: PathingVisual,
  synthesis: SynthesisVisual,
  multimodal: MultimodalVisual,
  assessment: AssessmentVisual,
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export default function FeatureSpotlight() {
  const [activeTab, setActiveTab] = useState(0);
  const activeFeature = features[activeTab];
  const VisualComponent = visuals[activeFeature.id];

  return (
    <section id="features" className="py-16 md:py-24 lg:py-32 bg-sand-100 relative overflow-hidden">
      {/* Subtle aurora gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-1/2 h-1/3 rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, rgba(155,89,182,0.5) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-1/2 h-1/3 rounded-full opacity-[0.03]"
          style={{
            background: 'radial-gradient(circle, rgba(26,188,156,0.5) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <ScrollReveal className="text-center mb-6 sm:mb-8 lg:mb-12">
          <span
            className="text-[10px] sm:text-[11px] font-mono font-medium tracking-[0.15em] text-sage-500 uppercase"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Feature Spotlight
          </span>
          <h2
            className="mt-2 sm:mt-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-deep-charcoal"
            style={{ fontFamily: "var(--font-serif)", letterSpacing: "-0.02em" }}
          >
            See the Swarm in Action
          </h2>
          <p className="mt-2 sm:mt-4 text-sm sm:text-base lg:text-lg text-deep-charcoal/60 max-w-2xl mx-auto">
            Five integrated modules. One cohesive learning system.
          </p>
        </ScrollReveal>

        {/* Bento Canvas */}
        <div className="grid lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-4 sm:gap-6 lg:gap-8">
          {/* Left: Tab Navigation - compact pills on mobile, full cards on desktop */}
          <div className="space-y-3">
            {/* Mobile: 2-row grid showing all features */}
            <div className="lg:hidden">
              <div className="grid grid-cols-3 gap-2 mb-2">
                {features.slice(0, 3).map((feature, index) => {
                  const isActive = activeTab === index;
                  const Icon = feature.icon;
                  return (
                    <button
                      key={feature.id}
                      onClick={() => setActiveTab(index)}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl transition-all duration-300 ${
                        isActive
                          ? "bg-sage-400 text-white shadow-md"
                          : "bg-white/80 text-deep-charcoal/70 border border-sand-200"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] font-medium leading-tight text-center">{feature.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {features.slice(3).map((feature, index) => {
                  const actualIndex = index + 3;
                  const isActive = activeTab === actualIndex;
                  const Icon = feature.icon;
                  return (
                    <button
                      key={feature.id}
                      onClick={() => setActiveTab(actualIndex)}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl transition-all duration-300 ${
                        isActive
                          ? "bg-sage-400 text-white shadow-md"
                          : "bg-white/80 text-deep-charcoal/70 border border-sand-200"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] font-medium leading-tight text-center">{feature.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Desktop: Full card navigation */}
            <div className="hidden lg:flex lg:flex-col gap-3">
              {features.map((feature, index) => {
                const isActive = activeTab === index;
                const Icon = feature.icon;

                return (
                  <button
                    key={feature.id}
                    onClick={() => setActiveTab(index)}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border ${
                      isActive
                        ? "bg-white border-sage-300 shadow-lg shadow-sage-200/50"
                        : "bg-white/60 border-transparent hover:bg-white/90"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                          isActive ? "bg-sage-400 text-white" : "bg-sand-200 text-deep-charcoal/50"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono font-medium tracking-wider uppercase transition-colors ${
                              isActive ? "text-sage-500" : "text-deep-charcoal/40"
                            }`}
                          >
                            {feature.number} / {feature.label}
                          </span>
                        </div>
                        <h3
                          className={`text-sm font-semibold mt-1 leading-tight transition-colors ${
                            isActive ? "text-deep-charcoal" : "text-deep-charcoal/70"
                          }`}
                        >
                          {feature.headline}
                        </h3>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Dynamic Bento Canvas */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="glass-premium rounded-2xl sm:rounded-3xl p-3 sm:p-6 lg:p-8 lg:h-[calc(100vh-180px)] lg:max-h-[520px]"
              >
                {/* Bento Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] xl:grid-cols-[1fr_260px] gap-3 lg:gap-4 h-full">
                  {/* Top: Header + Metric */}
                  <div className="lg:col-span-2 flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-[10px] sm:text-[11px] font-mono font-medium tracking-[0.15em] text-sage-500 uppercase"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {activeFeature.number} / {activeFeature.label}
                      </span>
                      <h3
                        className="mt-1 sm:mt-2 text-lg sm:text-xl lg:text-2xl font-serif font-semibold text-deep-charcoal leading-tight"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {activeFeature.headline}
                      </h3>
                      <p className="mt-1 sm:mt-2 text-xs text-deep-charcoal/60 line-clamp-2 sm:line-clamp-none">
                        {activeFeature.body}
                      </p>
                    </div>
                    {/* Metric Card - inline on mobile */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex sm:flex-col items-center sm:items-center gap-2 sm:gap-0 w-auto sm:w-28 lg:w-32 rounded-xl sm:rounded-2xl px-3 py-2 sm:p-4 sm:text-center shrink-0"
                      style={{ backgroundColor: `${activeFeature.metric.color}15` }}
                    >
                      <div
                        className="text-lg sm:text-2xl font-mono font-bold"
                        style={{ color: activeFeature.metric.color }}
                      >
                        {activeFeature.metric.value}
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-mono text-deep-charcoal/50 uppercase sm:mt-1">
                        {activeFeature.metric.label}
                      </div>
                    </motion.div>
                  </div>

                  {/* Left: Visual - hidden on mobile, show capabilities instead */}
                  <div className="hidden lg:block h-full min-h-0">
                    <VisualComponent />
                  </div>

                  {/* Right: Capabilities + Agents */}
                  <div className="space-y-2 sm:space-y-3 lg:space-y-4 lg:col-span-1">
                    {/* Capabilities */}
                    <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-5">
                      <h4 className="text-[10px] sm:text-xs font-mono font-semibold tracking-wider text-deep-charcoal/40 uppercase mb-2 sm:mb-3">
                        Capabilities
                      </h4>
                      <ul className="space-y-1.5 sm:space-y-2">
                        {activeFeature.capabilities.map((cap, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.05 }}
                            className="flex items-start gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-deep-charcoal/70"
                          >
                            <Check className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-sage-400 shrink-0 mt-0.5" />
                            <span className="leading-tight">{cap}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>

                    {/* Active Agents - scrollable on mobile */}
                    {activeFeature.id !== "profiling" && (
                      <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-5">
                        <h4 className="text-[10px] sm:text-xs font-mono font-semibold tracking-wider text-deep-charcoal/40 uppercase mb-2 sm:mb-3">
                          Active Agents
                        </h4>
                        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide sm:flex-wrap sm:overflow-visible">
                          {activeFeature.agents.map((agent, i) => (
                            <motion.span
                              key={agent}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.4 + i * 0.05 }}
                              className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-sage-400/10 text-sage-600 text-[9px] sm:text-[10px] font-mono font-medium border border-sage-400/20 whitespace-nowrap shrink-0 sm:shrink"
                            >
                              {agent}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
