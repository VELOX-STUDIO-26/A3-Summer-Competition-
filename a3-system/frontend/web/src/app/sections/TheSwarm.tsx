"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  GitBranch,
  HelpCircle,
  Video,
  Code2,
  Orbit,
  GraduationCap,
  Map,
  ShieldCheck,
  AlertTriangle,
  ThumbsUp,
  Eye,
  Mic,
  CheckSquare,
  FileText,
} from "lucide-react";
import ScrollReveal from "../components/landing/ScrollReveal";

/* ═══════════════════════════════════════════
   AGENT DATA — unified structure
   ═══════════════════════════════════════════ */

type AgentCategory = "Content" | "System";

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  category: AgentCategory;
  color: string;
  icon: React.ReactNode;
  ring: "inner" | "outer";
  status: "active" | "standby" | "processing";
  capabilities: string[];
}

const agents: Agent[] = [
  // Inner ring — Content Generation
  {
    id: "scholar",
    name: "Scholar",
    role: "Generates structured notes and summaries",
    description: "Transforms complex topics into digestible, well-structured notes with key concepts highlighted and connected.",
    category: "Content",
    color: "#9B59B6",
    icon: <BookOpen className="w-4 h-4" />,
    ring: "inner",
    status: "active",
    capabilities: ["Summaries", "Key Points", "Outlines", "Flashcards"],
  },
  {
    id: "mapper",
    name: "Mapper",
    role: "Creates visual mind maps and knowledge graphs",
    description: "Builds dynamic visual hierarchies that reveal connections between concepts and track your knowledge topology.",
    category: "Content",
    color: "#E67E22",
    icon: <GitBranch className="w-4 h-4" />,
    ring: "inner",
    status: "processing",
    capabilities: ["Mind Maps", "Concept Links", "Visual Hierarchy", "Knowledge Graphs"],
  },
  {
    id: "sage",
    name: "Sage",
    role: "Builds adaptive quizzes and assessments",
    description: "Crafts intelligent assessments that adapt difficulty based on your responses and knowledge gaps.",
    category: "Content",
    color: "#1ABC9C",
    icon: <HelpCircle className="w-4 h-4" />,
    ring: "inner",
    status: "active",
    capabilities: ["Quizzes", "Adaptive Tests", "Gap Analysis", "Spaced Repetition"],
  },
  {
    id: "director",
    name: "Director",
    role: "Produces video scripts and multimedia content",
    description: "Generates production-ready scripts with scene direction, visual cues, and pacing optimized for learning.",
    category: "Content",
    color: "#E74C3C",
    icon: <Video className="w-4 h-4" />,
    ring: "inner",
    status: "standby",
    capabilities: ["Video Scripts", "Storyboards", "Visual Cues", "Animations"],
  },
  {
    id: "architect",
    name: "Architect",
    role: "Generates code examples and exercises",
    description: "Creates scaffolded coding challenges with progressive difficulty and real-time syntax validation.",
    category: "Content",
    color: "#34495E",
    icon: <Code2 className="w-4 h-4" />,
    ring: "inner",
    status: "active",
    capabilities: ["Code Examples", "Exercises", "Debugging", "Best Practices"],
  },
  // Outer ring — System Intelligence
  {
    id: "orchestrator",
    name: "Orchestrator",
    role: "Coordinates all agents and manages workflow",
    description: "The central nervous system that routes tasks, balances load, and ensures agents collaborate seamlessly.",
    category: "System",
    color: "#7C9A6B",
    icon: <Orbit className="w-4 h-4" />,
    ring: "outer",
    status: "active",
    capabilities: ["Task Routing", "Load Balancing", "Agent Sync", "Workflow"],
  },
  {
    id: "tutor",
    name: "Tutor Engine",
    role: "Provides real-time tutoring and explanations",
    description: "Delivers personalized explanations using Socratic questioning to guide you to understanding.",
    category: "System",
    color: "#3498DB",
    icon: <GraduationCap className="w-4 h-4" />,
    ring: "outer",
    status: "active",
    capabilities: ["Explanations", "Socratic Method", "Hints", "Examples"],
  },
  {
    id: "planner",
    name: "Path Planner",
    role: "Optimizes learning paths with A* search",
    description: "Continuously recalculates your optimal learning route based on mastery levels and goal proximity.",
    category: "System",
    color: "#F39C12",
    icon: <Map className="w-4 h-4" />,
    ring: "outer",
    status: "processing",
    capabilities: ["A* Search", "Path Optimization", "Goal Tracking", "Milestones"],
  },
  {
    id: "faithful",
    name: "Faithful Checker",
    role: "Verifies accuracy of all generated content",
    description: "Cross-references facts against trusted sources and flags potential hallucinations before delivery.",
    category: "System",
    color: "#2ECC71",
    icon: <ShieldCheck className="w-4 h-4" />,
    ring: "outer",
    status: "active",
    capabilities: ["Fact Check", "Source Verify", "Hallucination Detection", "Citations"],
  },
  {
    id: "moderator",
    name: "Moderator",
    role: "Ensures content safety and compliance",
    description: "Screens all generated material for appropriateness, bias, and alignment with educational standards.",
    category: "System",
    color: "#E74C3C",
    icon: <AlertTriangle className="w-4 h-4" />,
    ring: "outer",
    status: "standby",
    capabilities: ["Safety Filter", "Bias Detection", "Compliance", "Standards"],
  },
  {
    id: "recommender",
    name: "Recommender",
    role: "Suggests next topics based on progress",
    description: "Analyzes your learning patterns to surface the most impactful next steps and resources.",
    category: "System",
    color: "#E67E22",
    icon: <ThumbsUp className="w-4 h-4" />,
    ring: "outer",
    status: "active",
    capabilities: ["Suggestions", "Pattern Analysis", "Resources", "Next Steps"],
  },
  {
    id: "vision",
    name: "Vision LLM",
    role: "Analyzes images, diagrams, and screenshots",
    description: "Interprets visual learning materials, charts, and diagrams to extract and explain key insights.",
    category: "System",
    color: "#8E44AD",
    icon: <Eye className="w-4 h-4" />,
    ring: "outer",
    status: "standby",
    capabilities: ["Image Analysis", "Diagram Reading", "Chart Extraction", "OCR"],
  },
  {
    id: "voice",
    name: "Voice Agent",
    role: "Handles speech-to-text and text-to-speech",
    description: "Enables natural voice interaction with accurate transcription and expressive synthesis.",
    category: "System",
    color: "#16A085",
    icon: <Mic className="w-4 h-4" />,
    ring: "outer",
    status: "processing",
    capabilities: ["Speech-to-Text", "Text-to-Speech", "Voice Commands", "Dictation"],
  },
  {
    id: "coding-grader",
    name: "Coding Grader",
    role: "Auto-grades programming assignments",
    description: "Evaluates code submissions against test cases, style guides, and best practices.",
    category: "System",
    color: "#1ABC9C",
    icon: <CheckSquare className="w-4 h-4" />,
    ring: "outer",
    status: "active",
    capabilities: ["Test Cases", "Style Check", "Auto-Grade", "Feedback"],
  },
  {
    id: "answer-grader",
    name: "Short Answer Grader",
    role: "Evaluates open-ended responses",
    description: "Uses semantic analysis to assess comprehension in free-form text responses.",
    category: "System",
    color: "#1ABC9C",
    icon: <FileText className="w-4 h-4" />,
    ring: "outer",
    status: "active",
    capabilities: ["Semantic Analysis", "Rubric Scoring", "Comprehension", "Feedback"],
  },
];

/* ═══════════════════════════════════════════
   RADIAL ORBITAL LAYOUT — Concentric rings around NOBOGYAN
   ═══════════════════════════════════════════ */

const CENTER_X = 260;
const CENTER_Y = 230;

// Orbital rings configuration - larger spread for visibility
const orbits = {
  center: { radius: 0, label: "NOBOGYAN Core" },
  inner: { radius: 80, label: "Core Intelligence" },
  middle: { radius: 150, label: "Content Generation" },
  outer: { radius: 220, label: "System & Assessment" },
};

// Helper to calculate position on orbit
function getOrbitalPosition(orbitRadius: number, angleIndex: number, totalInOrbit: number, offsetAngle = 0): { x: number; y: number } {
  const angle = (angleIndex / totalInOrbit) * 2 * Math.PI + offsetAngle - Math.PI / 2;
  return {
    x: CENTER_X + orbitRadius * Math.cos(angle),
    y: CENTER_Y + orbitRadius * Math.sin(angle),
  };
}

// Radial layout positions
const nodePositions: Record<string, { x: number; y: number; orbit: string }> = {
  // Center: NOBOGYAN Output
  output: { ...getOrbitalPosition(0, 0, 1), orbit: "center" },

  // Inner orbit: Core Intelligence (3 agents)
  orchestrator: { ...getOrbitalPosition(orbits.inner.radius, 0, 3), orbit: "inner" },
  tutor: { ...getOrbitalPosition(orbits.inner.radius, 1, 3), orbit: "inner" },
  planner: { ...getOrbitalPosition(orbits.inner.radius, 2, 3), orbit: "inner" },

  // Middle orbit: Content Generation (5 agents)
  scholar: { ...getOrbitalPosition(orbits.middle.radius, 0, 5, 0.1), orbit: "middle" },
  mapper: { ...getOrbitalPosition(orbits.middle.radius, 1, 5, 0.1), orbit: "middle" },
  sage: { ...getOrbitalPosition(orbits.middle.radius, 2, 5, 0.1), orbit: "middle" },
  director: { ...getOrbitalPosition(orbits.middle.radius, 3, 5, 0.1), orbit: "middle" },
  architect: { ...getOrbitalPosition(orbits.middle.radius, 4, 5, 0.1), orbit: "middle" },

  // Outer orbit: System & Assessment (8 agents)
  moderator: { ...getOrbitalPosition(orbits.outer.radius, 0, 8), orbit: "outer" },
  faithful: { ...getOrbitalPosition(orbits.outer.radius, 1, 8), orbit: "outer" },
  codingGrader: { ...getOrbitalPosition(orbits.outer.radius, 2, 8), orbit: "outer" },
  saGrader: { ...getOrbitalPosition(orbits.outer.radius, 3, 8), orbit: "outer" },
  recommender: { ...getOrbitalPosition(orbits.outer.radius, 4, 8), orbit: "outer" },
  vision: { ...getOrbitalPosition(orbits.outer.radius, 5, 8), orbit: "outer" },
  voice: { ...getOrbitalPosition(orbits.outer.radius, 6, 8), orbit: "outer" },
  student: { ...getOrbitalPosition(orbits.outer.radius, 7, 8), orbit: "outer" },
};

// Actual PRD data flows (directed edges)
const dataFlows: { from: string; to: string; label?: string; color?: string }[] = [
  // Student input flow
  { from: "student", to: "moderator", label: "input" },
  { from: "moderator", to: "tutor", label: "filtered" },

  // Tutor Engine multimodal support
  { from: "tutor", to: "vision", label: "analyze image", color: "#8E44AD" },
  { from: "tutor", to: "voice", label: "voice I/O", color: "#16A085" },

  // Content generation dispatch
  { from: "tutor", to: "orchestrator", label: "request" },
  { from: "orchestrator", to: "scholar", label: "dispatch", color: "#9B59B6" },
  { from: "orchestrator", to: "mapper", label: "dispatch", color: "#E67E22" },
  { from: "orchestrator", to: "sage", label: "dispatch", color: "#1ABC9C" },
  { from: "orchestrator", to: "director", label: "dispatch", color: "#E74C3C" },
  { from: "orchestrator", to: "architect", label: "dispatch", color: "#34495E" },

  // Content verification flow (all content agents → faithful)
  { from: "scholar", to: "faithful", color: "#9B59B6" },
  { from: "mapper", to: "faithful", color: "#E67E22" },
  { from: "sage", to: "faithful", color: "#1ABC9C" },
  { from: "director", to: "faithful", color: "#E74C3C" },
  { from: "architect", to: "faithful", color: "#34495E" },

  // Assessment flow
  { from: "sage", to: "codingGrader", label: "code quiz", color: "#1ABC9C" },
  { from: "sage", to: "saGrader", label: "SA quiz", color: "#1ABC9C" },

  // Planning flow
  { from: "planner", to: "recommender", label: "next topic" },
  { from: "orchestrator", to: "planner", label: "path req" },

  // Output delivery
  { from: "faithful", to: "output", label: "verified" },
  { from: "codingGrader", to: "output", label: "score" },
  { from: "saGrader", to: "output", label: "score" },
  { from: "output", to: "student", label: "deliver" },
];

// Node metadata
const flowNodes: Record<string, { name: string; color: string; icon: React.ReactNode; type: "core" | "content" | "system" | "assessment" | "io" }> = {
  student: { name: "Student", color: "#7C9A6B", icon: <span className="text-xs">👤</span>, type: "io" },
  moderator: { name: "Moderator", color: "#E74C3C", icon: <AlertTriangle className="w-3 h-3" />, type: "system" },
  tutor: { name: "Tutor Engine", color: "#3498DB", icon: <GraduationCap className="w-3 h-3" />, type: "core" },
  orchestrator: { name: "Orchestrator", color: "#7C9A6B", icon: <Orbit className="w-3 h-3" />, type: "core" },
  vision: { name: "Vision LLM", color: "#8E44AD", icon: <Eye className="w-3 h-3" />, type: "system" },
  voice: { name: "Voice Agent", color: "#16A085", icon: <Mic className="w-3 h-3" />, type: "system" },
  planner: { name: "Path Planner", color: "#F39C12", icon: <Map className="w-3 h-3" />, type: "system" },
  recommender: { name: "Recommender", color: "#E67E22", icon: <ThumbsUp className="w-3 h-3" />, type: "system" },
  scholar: { name: "Scholar", color: "#9B59B6", icon: <BookOpen className="w-3 h-3" />, type: "content" },
  mapper: { name: "Mapper", color: "#E67E22", icon: <GitBranch className="w-3 h-3" />, type: "content" },
  sage: { name: "Sage", color: "#1ABC9C", icon: <HelpCircle className="w-3 h-3" />, type: "content" },
  director: { name: "Director", color: "#E74C3C", icon: <Video className="w-3 h-3" />, type: "content" },
  architect: { name: "Architect", color: "#34495E", icon: <Code2 className="w-3 h-3" />, type: "content" },
  faithful: { name: "Faithful Checker", color: "#2ECC71", icon: <ShieldCheck className="w-3 h-3" />, type: "assessment" },
  codingGrader: { name: "Coding Grader", color: "#1ABC9C", icon: <CheckSquare className="w-3 h-3" />, type: "assessment" },
  saGrader: { name: "Short Answer Grader", color: "#1ABC9C", icon: <FileText className="w-3 h-3" />, type: "assessment" },
  output: { name: "NOBOGYAN", color: "#7C9A6B", icon: <span className="text-[8px] font-bold">N</span>, type: "io" },
};

// Map agent IDs to the flow visualization
const agentToFlowNode: Record<string, string> = {
  scholar: "scholar",
  mapper: "mapper",
  sage: "sage",
  director: "director",
  architect: "architect",
  orchestrator: "orchestrator",
  tutor: "tutor",
  planner: "planner",
  faithful: "faithful",
  moderator: "moderator",
  recommender: "recommender",
  vision: "vision",
  voice: "voice",
  "coding-grader": "codingGrader",
  "answer-grader": "saGrader",
};

/* ═══════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════ */

function StatusDot({ status }: { status: Agent["status"] }) {
  const colors = {
    active: "bg-green-400",
    processing: "bg-amber-400",
    standby: "bg-blue-400",
  };
  return (
    <span className={`w-2 h-2 rounded-full ${colors[status]} animate-pulse`} />
  );
}

function DetailPanel({ agent }: { agent: Agent }) {
  return (
    <motion.div
      key={agent.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="h-full flex flex-col min-h-0"
    >
      {/* Category badge */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-[11px] font-mono font-medium tracking-[0.15em] text-deep-charcoal/40 uppercase"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {agent.category} Generation Swarm
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-deep-charcoal/10 to-transparent" />
      </div>

      {/* Agent header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0"
          style={{
            backgroundColor: agent.color,
            boxShadow: `0 8px 24px ${agent.color}30`,
          }}
        >
          {agent.icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-serif font-semibold text-deep-charcoal truncate" style={{ fontFamily: "var(--font-serif)" }}>
            {agent.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <StatusDot status={agent.status} />
            <span className="text-xs font-mono text-deep-charcoal/50 capitalize">{agent.status}</span>
          </div>
        </div>
      </div>

      {/* Role highlight */}
      <p className="text-base text-deep-charcoal/80 font-medium mb-3 leading-snug">
        {agent.role}
      </p>

      {/* Description */}
      <p className="text-sm text-deep-charcoal/50 leading-relaxed mb-4">
        {agent.description}
      </p>

      {/* Capabilities */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px w-6 bg-deep-charcoal/10" />
          <span className="text-[10px] font-mono font-semibold tracking-wider text-deep-charcoal/30 uppercase">
            Capabilities
          </span>
          <div className="h-px flex-1 bg-deep-charcoal/10" />
        </div>
        <div className="flex flex-wrap gap-2">
          {agent.capabilities.map((cap, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 hover:scale-105"
              style={{
                backgroundColor: `${agent.color}12`,
                color: agent.color,
                border: `1px solid ${agent.color}25`,
              }}
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Activity log simulation */}
      <div className="flex-1 min-h-0 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px w-6 bg-deep-charcoal/10" />
          <span className="text-[10px] font-mono font-semibold tracking-wider text-deep-charcoal/30 uppercase">
            Recent Activity
          </span>
          <div className="h-px flex-1 bg-deep-charcoal/10" />
        </div>
        <div className="space-y-2">
          {[
            { time: "2s ago", action: "Task completed", detail: "Generated summary for Docker networking", color: "#2ECC71" },
            { time: "12s ago", action: "Processing", detail: "Analyzing knowledge gap patterns", color: "#F39C12" },
            { time: "1m ago", action: "Collaboration", detail: "Synced with Path Planner on next module", color: "#3498DB" },
          ].map((log, i) => (
            <div key={i} className="flex items-start gap-3 text-xs">
              <span className="text-deep-charcoal/30 font-mono shrink-0 w-12">{log.time}</span>
              <div className="min-w-0">
                <span className="font-bold" style={{ color: log.color }}>{log.action}</span>
                <span className="text-deep-charcoal/40"> — </span>
                <span className="text-deep-charcoal/50">{log.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        className="w-full py-3 rounded-xl font-mono text-xs font-semibold tracking-wider uppercase transition-all duration-300 shrink-0"
        style={{
          backgroundColor: `${agent.color}15`,
          color: agent.color,
          border: `1px solid ${agent.color}30`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = `${agent.color}20`;
          e.currentTarget.style.boxShadow = `0 4px 20px ${agent.color}25`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = `${agent.color}15`;
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        View Generated Samples
      </button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   MAIN SECTION
   ═══════════════════════════════════════════ */

export default function TheSwarm() {
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const activeAgent = agents.find(a => a.id === (hoveredAgentId || activeAgentId)) || agents[0];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <>
      {/* Main section — light theme matching landing page */}
      <section
        id="the-swarm"
        ref={sectionRef}
        onMouseMove={handleMouseMove}
        className="relative bg-gradient-to-b from-sand-100 via-white to-sand-50 overflow-hidden"
        style={{
          minHeight: "100vh",
          ["--mouse-x" as string]: `${mousePos.x}%`,
          ["--mouse-y" as string]: `${mousePos.y}%`,
        }}
      >
        {/* Soft ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-sage-400/[0.08] blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-400/[0.06] blur-[100px]" />
          <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] rounded-full bg-amber-400/[0.05] blur-[80px]" />
        </div>

        {/* Header */}
        <div className="relative z-20 pt-24 pb-8">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal className="text-center">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sage-400/10 border border-sage-400/20 text-[10px] font-mono font-semibold tracking-[0.2em] text-sage-600 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse" />
                The Ecosystem
              </span>
              <h2
                className="mt-4 text-3xl md:text-4xl font-serif font-semibold text-deep-charcoal"
                style={{ fontFamily: "var(--font-serif)", lineHeight: 1.1 }}
              >
                Meet Your Agents
              </h2>
              <p
                className="mt-3 text-sm max-w-md mx-auto text-deep-charcoal/60"
                style={{ letterSpacing: "0.02em" }}
              >
                NOBOGYAN at the center, surrounded by specialized agents in orbital layers.
              </p>
            </ScrollReveal>
          </div>
        </div>

        {/* Split screen content */}
        <div className="relative z-10 pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-[55%_45%] gap-8 items-center">
              {/* LEFT: Orbital Map - no background */}
              <div className="relative flex items-center justify-center">
                  <svg
                    viewBox="0 0 520 460"
                    className="w-full h-auto max-h-[550px]"
                    style={{ overflow: "visible" }}
                  >
                    {/* Orbital rings and effects */}
                    <defs>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="glow-strong">
                        <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="soft-shadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                      </filter>
                      <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#7C9A6B" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#7C9A6B" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Center glow */}
                    <circle cx={CENTER_X} cy={CENTER_Y} r="50" fill="url(#centerGlow)" />

                    {/* Orbital rings - light theme */}
                    {Object.entries(orbits).map(([key, orbit]) => (
                      orbit.radius > 0 && (
                        <g key={key}>
                          <circle
                            cx={CENTER_X}
                            cy={CENTER_Y}
                            r={orbit.radius}
                            fill="none"
                            stroke="rgba(124,154,107,0.15)"
                            strokeWidth="1.5"
                            strokeDasharray="6 10"
                          />
                          {/* Animated orbit pulse */}
                          <circle
                            cx={CENTER_X}
                            cy={CENTER_Y}
                            r={orbit.radius}
                            fill="none"
                            stroke="rgba(124,154,107,0.08)"
                            strokeWidth="20"
                            style={{
                              animation: `orbit-pulse 4s ease-in-out infinite`,
                              animationDelay: `${Object.keys(orbits).indexOf(key) * 0.8}s`,
                            }}
                          />
                        </g>
                      )
                    ))}

                  {/* Data flow connections - curved paths */}
                  {dataFlows.map((flow, i) => {
                    const from = nodePositions[flow.from];
                    const to = nodePositions[flow.to];
                    if (!from || !to) return null;
                    
                    const hoveredAgent = agents.find(ag => ag.id === hoveredAgentId);
                    const selectedAgent = agents.find(ag => ag.id === activeAgentId);
                    const relevantAgent = hoveredAgent || selectedAgent;

                    // Check if this flow involves the relevant agent
                    const agentFlowId = relevantAgent ? agentToFlowNode[relevantAgent.id] : null;
                    const isRelevant = agentFlowId && (flow.from === agentFlowId || flow.to === agentFlowId);
                    const hasSelection = !!(hoveredAgentId || activeAgentId);

                    // Color based on flow type or agent color
                    const strokeColor = isRelevant
                      ? (relevantAgent?.color || "#7C9A6B")
                      : (flow.color || "rgba(255,255,255,0.12)");

                    // Calculate curved path through center for orbital feel
                    const midX = (from.x + to.x) / 2;
                    const midY = (from.y + to.y) / 2;
                    
                    // Curve toward center for connections between different orbits
                    const curveStrength = 0.3;
                    const ctrlX = midX + (CENTER_X - midX) * curveStrength;
                    const ctrlY = midY + (CENTER_Y - midY) * curveStrength;

                    const pathD = `M ${from.x} ${from.y} Q ${ctrlX} ${ctrlY} ${to.x} ${to.y}`;

                    return (
                      <g key={`flow-${i}`}>
                        {/* Curved connection */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={isRelevant ? 2 : 1}
                          opacity={hasSelection ? (isRelevant ? 0.8 : 0.1) : 0.25}
                          style={{ transition: "opacity 0.3s ease" }}
                        />
                        {/* Animated pulse for active connections */}
                        {isRelevant && (
                          <path
                            d={pathD}
                            fill="none"
                            stroke={relevantAgent?.color || "#7C9A6B"}
                            strokeWidth={2}
                            strokeDasharray="8 12"
                            opacity={0.6}
                            style={{
                              animation: `pulse-flow 1.5s linear infinite`,
                            }}
                          />
                        )}
                      </g>
                    );
                  })}

                    {/* Orbit labels */}
                    {Object.entries(orbits).map(([key, orbit]) => (
                      orbit.radius > 0 && (
                        <text
                          key={`label-${key}`}
                          x={CENTER_X}
                          y={CENTER_Y - orbit.radius - 8}
                          textAnchor="middle"
                          fill="rgba(45,55,72,0.35)"
                          fontSize="8"
                          fontFamily="var(--font-mono)"
                          letterSpacing="0.1em"
                        >
                          {orbit.label.toUpperCase()}
                        </text>
                      )
                    ))}

                  {/* Render all nodes */}
                  {Object.entries(nodePositions).map(([nodeId, pos]) => {
                    const nodeData = flowNodes[nodeId];
                    if (!nodeData) return null;

                    // Check if this node corresponds to an agent
                    const agentId = Object.entries(agentToFlowNode).find(([_, flow]) => flow === nodeId)?.[0];
                    const isHovered = agentId ? hoveredAgentId === agentId : false;
                    const isActive = agentId ? activeAgentId === agentId : false;
                    const isClickable = !!agentId;
                    const isCenter = nodeId === "output";

                    // Check if any agent is selected/hovered
                    const hasSelection = !!(hoveredAgentId || activeAgentId);
                    const relevantAgentId = hoveredAgentId || activeAgentId;
                    const relevantFlowId = relevantAgentId ? agentToFlowNode[relevantAgentId] : null;

                    // Check if this node is connected to the relevant agent
                    const isConnected = relevantFlowId && dataFlows.some(
                      flow => (flow.from === relevantFlowId && flow.to === nodeId) ||
                              (flow.to === relevantFlowId && flow.from === nodeId) ||
                              flow.from === nodeId && flow.to === relevantFlowId ||
                              flow.to === nodeId && flow.from === relevantFlowId
                    );
                    const isRelevantNode = nodeId === relevantFlowId || isConnected;

                    // Node size based on orbit position - made much bigger for visibility
                    const nodeSize = isCenter ? 34 : pos.orbit === "inner" ? 24 : pos.orbit === "middle" ? 20 : 16;

                    // Calculate opacity: full for relevant nodes, dimmed for others when selection exists
                    const nodeOpacity = hasSelection
                      ? (isRelevantNode || isHovered || isActive ? 1 : 0.35)
                      : (isHovered ? 1 : 0.85);

                    const labelOpacity = hasSelection
                      ? (isRelevantNode || isHovered || isActive ? 0.9 : 0.2)
                      : (isHovered ? 0.95 : 0.6);

                    return (
                      <g
                        key={nodeId}
                        className={isClickable ? "cursor-pointer" : ""}
                        onMouseEnter={() => isClickable && setHoveredAgentId(agentId)}
                        onMouseLeave={() => isClickable && setHoveredAgentId(null)}
                        onClick={() => isClickable && setActiveAgentId(agentId)}
                        style={{ transition: "opacity 0.3s ease" }}
                      >
                        {/* Center node special glow */}
                        {isCenter && (
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={nodeSize + 15}
                            fill={nodeData.color}
                            opacity="0.15"
                            filter="url(#glow-strong)"
                          />
                        )}
                        {/* Glow on hover/active */}
                        {(isHovered || isActive) && !isCenter && (
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={nodeSize + 10}
                            fill={nodeData.color}
                            opacity="0.25"
                            filter="url(#glow)"
                          />
                        )}
                        {/* Active pulse ring */}
                        {isActive && (
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={nodeSize + 14}
                            fill="none"
                            stroke={nodeData.color}
                            strokeWidth="2"
                            opacity="0.6"
                            style={{
                              animation: "agent-pulse 2s infinite",
                              transformOrigin: `${pos.x}px ${pos.y}px`,
                            }}
                          />
                        )}
                        {/* Main node circle */}
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={nodeSize}
                          fill={nodeData.color}
                          opacity={nodeOpacity}
                          filter="url(#soft-shadow)"
                          style={{
                            transition: "all 0.3s ease",
                            transform: isHovered ? "scale(1.12)" : "scale(1)",
                            transformOrigin: `${pos.x}px ${pos.y}px`,
                          }}
                        />
                        {/* Inner ring for center node */}
                        {isCenter && (
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={nodeSize - 4}
                            fill="none"
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="1"
                          />
                        )}
                        {/* Label - positioned based on orbit */}
                        <text
                          x={pos.x}
                          y={pos.y + nodeSize + (isCenter ? 18 : 16)}
                          textAnchor="middle"
                          fill={`rgba(45,55,72,${labelOpacity})`}
                          fontSize={isCenter ? "12" : pos.orbit === "inner" ? "11" : "10"}
                          fontFamily="var(--font-mono)"
                          fontWeight={isHovered || isActive || isCenter ? "600" : "500"}
                          style={{ transition: "all 0.3s ease" }}
                        >
                          {nodeData.name}
                        </text>
                        {/* Icon in node */}
                        {(isCenter || pos.orbit === "inner" || pos.orbit === "middle") && (
                          <foreignObject
                            x={pos.x - (isCenter ? 14 : pos.orbit === "inner" ? 10 : 9)}
                            y={pos.y - (isCenter ? 14 : pos.orbit === "inner" ? 10 : 9)}
                            width={isCenter ? 28 : pos.orbit === "inner" ? 20 : 18}
                            height={isCenter ? 28 : pos.orbit === "inner" ? 20 : 18}
                            style={{ pointerEvents: "none", opacity: nodeOpacity }}
                          >
                            <div className="w-full h-full flex items-center justify-center text-white">
                              {nodeData.icon}
                            </div>
                          </foreignObject>
                        )}
                      </g>
                    );
                  })}
                  </svg>

                  {/* Legend below orbital map */}
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8 text-[11px] font-mono text-deep-charcoal/50">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-sage-400 shadow-sm" />
                      <span>Core</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-purple-400" />
                      <span>Content</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <span>System</span>
                    </div>
                  </div>

                {/* Orbit animation styles */}
                <style jsx>{`
                  @keyframes orbit-pulse {
                    0%, 100% { opacity: 0.05; }
                    50% { opacity: 0.15; }
                  }
                `}</style>
              </div>

              {/* RIGHT: Detail Panel - Light glassmorphic */}
              <div className="flex items-start">
                <div
                  className="w-full rounded-3xl p-8 border border-white/40 min-h-[420px]"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.5) 100%)",
                    backdropFilter: "blur(24px)",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04), inset 0 1px 2px rgba(255,255,255,0.9)",
                  }}
                >
                  <AnimatePresence mode="wait">
                    <DetailPanel agent={activeAgent} />
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
