"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  GitBranch,
  HelpCircle,
  Video,
  Code2,
  Orbit,
  ShieldCheck,
  Map,
  BarChart3,
} from "lucide-react";
import ScrollReveal from "../components/landing/ScrollReveal";

/* ═══════════════════════════════════════════
   SIMPLIFIED AGENT DATA — Three-Tier Hierarchy
   Tier 1: Core (Orchestrator at center)
   Tier 2: Workers (5 customer-facing content agents)
   Tier 3: Guardrails (system utilities - smaller, muted)
   ═══════════════════════════════════════════ */

type AgentTier = "core" | "worker" | "guardrail";

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  tier: AgentTier;
  color: string;
  icon: React.ReactNode;
  status: "active" | "standby" | "processing";
  capabilities: string[];
}

const agents: Agent[] = [
  // Tier 1: Core — The Brain
  {
    id: "orchestrator",
    name: "Orchestrator",
    role: "The central brain coordinating your learning swarm",
    description: "Routes tasks to specialized agents, balances workloads, and ensures all content is delivered on time.",
    tier: "core",
    color: "#7C9A6B",
    icon: <Orbit className="w-5 h-5" />,
    status: "active",
    capabilities: ["Task Routing", "Load Balancing", "Agent Sync", "Quality Control"],
  },
  // Tier 2: Workers — The Features (Customer-facing)
  {
    id: "scholar",
    name: "Scholar",
    role: "Generates structured notes and summaries",
    description: "Transforms complex topics into digestible, well-structured notes with key concepts highlighted and connected.",
    tier: "worker",
    color: "#9B59B6",
    icon: <BookOpen className="w-4 h-4" />,
    status: "active",
    capabilities: ["Summaries", "Key Points", "Outlines", "Flashcards"],
  },
  {
    id: "mapper",
    name: "Mapper",
    role: "Creates visual mind maps and knowledge graphs",
    description: "Builds dynamic visual hierarchies that reveal connections between concepts and track your knowledge topology.",
    tier: "worker",
    color: "#E67E22",
    icon: <GitBranch className="w-4 h-4" />,
    status: "processing",
    capabilities: ["Mind Maps", "Concept Links", "Visual Hierarchy", "Knowledge Graphs"],
  },
  {
    id: "sage",
    name: "Sage",
    role: "Builds adaptive quizzes and assessments",
    description: "Generates quizzes that adjust difficulty based on your responses and knowledge gaps.",
    tier: "worker",
    color: "#1ABC9C",
    icon: <HelpCircle className="w-4 h-4" />,
    status: "active",
    capabilities: ["Quizzes", "Adaptive Tests", "Gap Analysis", "Spaced Repetition"],
  },
  {
    id: "director",
    name: "Director",
    role: "Produces video scripts and multimedia content",
    description: "Generates production-ready scripts with scene direction, visual cues, and pacing optimized for learning.",
    tier: "worker",
    color: "#E74C3C",
    icon: <Video className="w-4 h-4" />,
    status: "standby",
    capabilities: ["Video Scripts", "Storyboards", "Visual Cues", "Animations"],
  },
  {
    id: "architect",
    name: "Architect",
    role: "Generates code examples and exercises",
    description: "Creates scaffolded coding challenges with progressive difficulty and real-time syntax validation.",
    tier: "worker",
    color: "#34495E",
    icon: <Code2 className="w-4 h-4" />,
    status: "active",
    capabilities: ["Code Examples", "Exercises", "Debugging", "Best Practices"],
  },
  // Tier 3: Guardrails — The Infrastructure (Background utilities)
  {
    id: "accuracy-guard",
    name: "Accuracy Guard",
    role: "Verifies factual accuracy of all content",
    description: "Cross-references facts against trusted sources, ensuring <2% factual error rate before delivery.",
    tier: "guardrail",
    color: "#2ECC71",
    icon: <ShieldCheck className="w-3 h-3" />,
    status: "active",
    capabilities: ["Fact Check", "Source Verify", "Error Detection"],
  },
  {
    id: "path-optimizer",
    name: "Path Optimizer",
    role: "Calculates optimal learning sequences",
    description: "Uses A* search to find the fastest route through your knowledge graph based on prerequisites.",
    tier: "guardrail",
    color: "#F39C12",
    icon: <Map className="w-3 h-3" />,
    status: "processing",
    capabilities: ["A* Search", "Route Planning", "Prerequisites"],
  },
  {
    id: "progress-tracker",
    name: "Progress Tracker",
    role: "Monitors mastery and engagement metrics",
    description: "Tracks completion rates, quiz scores, and time-on-task to surface actionable insights.",
    tier: "guardrail",
    color: "#3498DB",
    icon: <BarChart3 className="w-3 h-3" />,
    status: "active",
    capabilities: ["Analytics", "Mastery Tracking", "Insights"],
  },
];

/* ═══════════════════════════════════════════
   SIMPLIFIED ORBITAL LAYOUT — Clean Three-Tier Structure
   ═══════════════════════════════════════════ */

const CENTER_X = 220;
const CENTER_Y = 220;

const orbits = {
  core: { radius: 0 },
  worker: { radius: 100 },
  guardrail: { radius: 170 },
};

function getOrbitalPosition(radius: number, index: number, total: number, offsetAngle = -Math.PI / 2): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI + offsetAngle;
  return {
    x: CENTER_X + radius * Math.cos(angle),
    y: CENTER_Y + radius * Math.sin(angle),
  };
}

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
  const tierLabels = {
    core: "Central Intelligence",
    worker: "Content Generation",
    guardrail: "System Infrastructure",
  };

  return (
    <motion.div
      key={agent.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="h-full flex flex-col min-h-0"
    >
      {/* Tier badge */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-[11px] font-mono font-medium tracking-[0.15em] text-deep-charcoal/40 uppercase"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {tierLabels[agent.tier]}
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
   MAIN SECTION — Simplified Three-Tier Orbital
   ═══════════════════════════════════════════ */

export default function TheSwarm() {
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const activeAgent = agents.find(a => a.id === (hoveredAgentId || activeAgentId)) || agents[0];

  // Get agents by tier
  const coreAgent = agents.find(a => a.tier === "core")!;
  const workerAgents = agents.filter(a => a.tier === "worker");
  const guardrailAgents = agents.filter(a => a.tier === "guardrail");

  // Calculate positions
  const workerPositions = workerAgents.map((_, i) => getOrbitalPosition(orbits.worker.radius, i, workerAgents.length));
  const guardrailPositions = guardrailAgents.map((_, i) => getOrbitalPosition(orbits.guardrail.radius, i, guardrailAgents.length));

  return (
    <section
      id="the-swarm"
      ref={sectionRef}
      className="relative bg-gradient-to-b from-sand-100 via-white to-sand-50 overflow-hidden"
      style={{ minHeight: "100vh" }}
    >
      {/* Soft ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-sage-400/[0.08] blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-400/[0.06] blur-[100px]" />
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
            <p className="mt-3 text-sm max-w-lg mx-auto text-deep-charcoal/60">
              One central brain. Five content specialists. Three system guardians.
              <br />
              <span className="text-sage-600 font-medium">Click any agent to explore.</span>
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* Split screen content */}
      <div className="relative z-10 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-[55%_45%] gap-8 items-center">
            {/* LEFT: Simplified Orbital Map */}
            <div className="relative flex items-center justify-center min-h-[500px]">
              <svg viewBox="0 0 440 440" className="w-full h-auto max-w-[500px]">
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="soft-shadow">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
                  </filter>
                  <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#7C9A6B" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#7C9A6B" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Center glow */}
                <circle cx={CENTER_X} cy={CENTER_Y} r="60" fill="url(#centerGlow)" />

                {/* Worker orbit ring (solid) */}
                <circle
                  cx={CENTER_X}
                  cy={CENTER_Y}
                  r={orbits.worker.radius}
                  fill="none"
                  stroke="rgba(124,154,107,0.2)"
                  strokeWidth="2"
                />

                {/* Guardrail orbit ring (dotted, faint) */}
                <circle
                  cx={CENTER_X}
                  cy={CENTER_Y}
                  r={orbits.guardrail.radius}
                  fill="none"
                  stroke="rgba(124,154,107,0.1)"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                />

                {/* Connections: Center to Workers (solid lines) */}
                {workerPositions.map((pos, i) => {
                  const agent = workerAgents[i];
                  const isHovered = hoveredAgentId === agent.id;
                  const isActive = activeAgentId === agent.id;
                  const isHighlighted = isHovered || isActive;
                  const hasSelection = !!(hoveredAgentId || activeAgentId);

                  return (
                    <line
                      key={`conn-${agent.id}`}
                      x1={CENTER_X}
                      y1={CENTER_Y}
                      x2={pos.x}
                      y2={pos.y}
                      stroke={isHighlighted ? agent.color : "#7C9A6B"}
                      strokeWidth={isHighlighted ? 2.5 : 1.5}
                      opacity={hasSelection ? (isHighlighted ? 0.8 : 0.15) : 0.3}
                      style={{ transition: "all 0.3s ease" }}
                    />
                  );
                })}

                {/* Guardrail agents (outer ring - smaller, muted) */}
                {guardrailPositions.map((pos, i) => {
                  const agent = guardrailAgents[i];
                  const isHovered = hoveredAgentId === agent.id;
                  const isActive = activeAgentId === agent.id;
                  const hasSelection = !!(hoveredAgentId || activeAgentId);
                  const nodeOpacity = hasSelection ? (isHovered || isActive ? 1 : 0.4) : 0.6;

                  return (
                    <g
                      key={agent.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredAgentId(agent.id)}
                      onMouseLeave={() => setHoveredAgentId(null)}
                      onClick={() => setActiveAgentId(agent.id)}
                    >
                      {/* Hover glow */}
                      {(isHovered || isActive) && (
                        <circle cx={pos.x} cy={pos.y} r="22" fill={agent.color} opacity="0.2" filter="url(#glow)" />
                      )}
                      {/* Node */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="14"
                        fill={agent.color}
                        opacity={nodeOpacity}
                        filter="url(#soft-shadow)"
                        style={{ transition: "all 0.3s ease" }}
                      />
                      {/* Icon */}
                      <foreignObject x={pos.x - 7} y={pos.y - 7} width="14" height="14" style={{ pointerEvents: "none" }}>
                        <div className="w-full h-full flex items-center justify-center text-white opacity-90">
                          {agent.icon}
                        </div>
                      </foreignObject>
                      {/* Label */}
                      <text
                        x={pos.x}
                        y={pos.y + 24}
                        textAnchor="middle"
                        fill={`rgba(45,55,72,${hasSelection ? (isHovered || isActive ? 0.8 : 0.25) : 0.5})`}
                        fontSize="9"
                        fontFamily="var(--font-mono)"
                        fontWeight={isHovered || isActive ? "600" : "500"}
                        style={{ transition: "all 0.3s ease" }}
                      >
                        {agent.name}
                      </text>
                    </g>
                  );
                })}

                {/* Worker agents (middle ring - prominent) */}
                {workerPositions.map((pos, i) => {
                  const agent = workerAgents[i];
                  const isHovered = hoveredAgentId === agent.id;
                  const isActive = activeAgentId === agent.id;
                  const hasSelection = !!(hoveredAgentId || activeAgentId);
                  const nodeOpacity = hasSelection ? (isHovered || isActive ? 1 : 0.4) : 0.9;

                  return (
                    <g
                      key={agent.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredAgentId(agent.id)}
                      onMouseLeave={() => setHoveredAgentId(null)}
                      onClick={() => setActiveAgentId(agent.id)}
                    >
                      {/* Hover glow */}
                      {(isHovered || isActive) && (
                        <circle cx={pos.x} cy={pos.y} r="32" fill={agent.color} opacity="0.25" filter="url(#glow)" />
                      )}
                      {/* Active pulse ring */}
                      {isActive && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="28"
                          fill="none"
                          stroke={agent.color}
                          strokeWidth="2"
                          opacity="0.5"
                          style={{ animation: "agent-pulse 2s infinite" }}
                        />
                      )}
                      {/* Node */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="22"
                        fill={agent.color}
                        opacity={nodeOpacity}
                        filter="url(#soft-shadow)"
                        style={{ transition: "all 0.3s ease", transform: isHovered ? "scale(1.1)" : "scale(1)", transformOrigin: `${pos.x}px ${pos.y}px` }}
                      />
                      {/* Icon */}
                      <foreignObject x={pos.x - 10} y={pos.y - 10} width="20" height="20" style={{ pointerEvents: "none" }}>
                        <div className="w-full h-full flex items-center justify-center text-white">
                          {agent.icon}
                        </div>
                      </foreignObject>
                      {/* Label */}
                      <text
                        x={pos.x}
                        y={pos.y + 34}
                        textAnchor="middle"
                        fill={`rgba(45,55,72,${hasSelection ? (isHovered || isActive ? 0.9 : 0.25) : 0.7})`}
                        fontSize="11"
                        fontFamily="var(--font-mono)"
                        fontWeight={isHovered || isActive ? "600" : "500"}
                        style={{ transition: "all 0.3s ease" }}
                      >
                        {agent.name}
                      </text>
                    </g>
                  );
                })}

                {/* Center: Orchestrator (The Brain) */}
                <g
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredAgentId(coreAgent.id)}
                  onMouseLeave={() => setHoveredAgentId(null)}
                  onClick={() => setActiveAgentId(coreAgent.id)}
                >
                  {/* Outer glow */}
                  <circle cx={CENTER_X} cy={CENTER_Y} r="45" fill={coreAgent.color} opacity="0.15" filter="url(#glow)" />
                  {/* Main node */}
                  <circle cx={CENTER_X} cy={CENTER_Y} r="32" fill={coreAgent.color} filter="url(#soft-shadow)" />
                  {/* Inner ring */}
                  <circle cx={CENTER_X} cy={CENTER_Y} r="26" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                  {/* Icon */}
                  <foreignObject x={CENTER_X - 14} y={CENTER_Y - 14} width="28" height="28" style={{ pointerEvents: "none" }}>
                    <div className="w-full h-full flex items-center justify-center text-white">
                      {coreAgent.icon}
                    </div>
                  </foreignObject>
                  {/* Label */}
                  <text
                    x={CENTER_X}
                    y={CENTER_Y + 48}
                    textAnchor="middle"
                    fill="rgba(45,55,72,0.8)"
                    fontSize="12"
                    fontFamily="var(--font-mono)"
                    fontWeight="600"
                  >
                    {coreAgent.name}
                  </text>
                </g>
              </svg>

              {/* Legend */}
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6 text-[10px] font-mono text-deep-charcoal/50">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-sage-400 shadow-sm" />
                  <span>Core</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-purple-500" />
                  <span>Content</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span>System</span>
                </div>
              </div>

              {/* Animation styles */}
              <style jsx>{`
                @keyframes agent-pulse {
                  0%, 100% { transform: scale(1); opacity: 0.5; }
                  50% { transform: scale(1.15); opacity: 0.2; }
                }
              `}</style>
            </div>

            {/* RIGHT: Detail Panel */}
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
  );
}
