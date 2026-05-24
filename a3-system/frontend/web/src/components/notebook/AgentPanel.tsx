"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  BookOpen,
  GitBranch,
  BrainCircuit,
  Clapperboard,
  Laptop,
  ChevronRight,
  ChevronDown,
  Loader2,
  X,
  Users,
  Target,
  Layers,
} from "lucide-react";

interface GeneratedResource {
  id: string;
  type: "notes" | "quiz" | "code" | "mindmap" | "video";
  topic: string;
  data: any;
  timestamp: number;
  isRemedial?: boolean;
  weakConcepts?: string[];
  consumed?: boolean;
}

interface AgentPanelProps {
  generatedResources: GeneratedResource[];
  remedialResources: GeneratedResource[];
  selectedResource: string | null;
  setSelectedResource: (id: string | null) => void;
  isPreviewExpanded: boolean;
  setIsPreviewExpanded: (expanded: boolean) => void;
  expandedTypes: Set<string>;
  setExpandedTypes: (types: Set<string>) => void;
  activeAgent: string | null;
  isGenerating: boolean;
  isAutoGenerating: boolean;
  gateStatus: any;
  onAgentClick: (agentId: string) => void;
  onMarkConsumed: (id: string) => void;
  rightPanelWidth: number;
  setRightPanelWidth: (width: number) => void;
  isRightPanelOpen: boolean;
  onCloseRightPanel: () => void;
  // Preview content
  renderPreview: () => React.ReactNode;
  currentTopic: string;
}

const AGENTS = [
  { id: "notes", label: "Scholar", icon: BookOpen, color: "from-amber-600 to-orange-500", desc: "Study Notes" },
  { id: "mindmap", label: "Mapper", icon: GitBranch, color: "from-teal-600 to-cyan-500", desc: "Visual Maps" },
  { id: "quiz", label: "Sage", icon: BrainCircuit, color: "from-violet-600 to-purple-500", desc: "Knowledge Check" },
  { id: "video", label: "Director", icon: Clapperboard, color: "from-rose-600 to-pink-500", desc: "Video Scripts" },
  { id: "code", label: "Architect", icon: Laptop, color: "from-emerald-600 to-teal-500", desc: "Code Labs" },
];

export default function AgentPanel({
  generatedResources,
  remedialResources,
  selectedResource,
  setSelectedResource,
  isPreviewExpanded,
  setIsPreviewExpanded,
  expandedTypes,
  setExpandedTypes,
  activeAgent,
  isGenerating,
  isAutoGenerating,
  gateStatus,
  onAgentClick,
  onMarkConsumed,
  rightPanelWidth,
  setRightPanelWidth,
  isRightPanelOpen,
  onCloseRightPanel,
  renderPreview,
  currentTopic,
}: AgentPanelProps) {
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(320);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isResizingRef.current = true;
      startXRef.current = e.clientX;
      startWidthRef.current = rightPanelWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [rightPanelWidth]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRef.current) {
        const delta = startXRef.current - e.clientX;
        const newWidth = Math.min(Math.max(startWidthRef.current + delta, 280), 800);
        setRightPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setRightPanelWidth]);

  const handleResourceClick = async (item: GeneratedResource) => {
    if (selectedResource === item.id && isPreviewExpanded) {
      setIsPreviewExpanded(false);
      setSelectedResource(null);
      setRightPanelWidth(320);
    } else {
      setSelectedResource(item.id);
      setIsPreviewExpanded(true);
      if (rightPanelWidth < 480) setRightPanelWidth(480);
      // Mark as consumed if remedial
      if (item.isRemedial && !item.consumed) {
        onMarkConsumed(item.id);
      }
    }
  };

  const activeItem =
    generatedResources.find((r) => r.id === selectedResource) ||
    remedialResources.find((r) => r.id === selectedResource);

  return (
    <div
      className={`flex flex-col bg-[#E7E2D7]/80 backdrop-blur-xl z-10 border-l border-[#D6CFC2] shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        lg:relative lg:translate-x-0
        fixed inset-y-0 right-0 w-80 sm:w-96
        ${isRightPanelOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
      style={{
        width: typeof window !== "undefined" && window.innerWidth >= 1024 ? rightPanelWidth : undefined,
      }}
    >
      {/* Drag resize handle - only on desktop */}
      <div
        onMouseDown={handleMouseDown}
        className="hidden lg:block absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group hover:bg-[#B8C3C9]/30 transition-colors"
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-[#D6CFC2] group-hover:bg-[#B8C3C9] transition-colors" />
      </div>

      {/* Header */}
      <div className="p-5 border-b border-[#D6CFC2]">
        <div className="flex items-center justify-between">
          {isPreviewExpanded && selectedResource ? (
            // Expanded preview header with back button
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsPreviewExpanded(false);
                    setSelectedResource(null);
                    setRightPanelWidth(320);
                  }}
                  className="w-8 h-8 rounded-lg bg-[#D6CFC2]/50 hover:bg-[#D6CFC2] flex items-center justify-center transition-all"
                >
                  <ChevronRight className="w-4 h-4 text-[#666] rotate-180" />
                </button>
                <div>
                  <h2 className="font-semibold text-[#2a2a2a]">{activeItem?.topic || "Preview"}</h2>
                  <p className="text-xs text-[#666]">
                    {activeItem?.type.charAt(0).toUpperCase()}
                    {activeItem?.type.slice(1)}
                    {activeItem?.isRemedial && <span className="text-amber-600 ml-1">(Targeted)</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCloseRightPanel}
                  className="lg:hidden p-2 rounded-lg hover:bg-[#D6CFC2]/50 text-[#666] transition-colors"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setIsPreviewExpanded(false);
                    setSelectedResource(null);
                    setRightPanelWidth(320);
                  }}
                  className="p-2 rounded-lg hover:bg-[#D6CFC2]/50 text-[#888] hover:text-[#555] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            // Normal header
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9D2D6] via-[#B8C3C9] to-[#8a9ba3] flex items-center justify-center shadow-lg shadow-[#B8C3C9]/40 ring-2 ring-white/50">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-[#2a2a2a] text-lg tracking-tight">The Five Minds</h2>
                  <p className="text-xs text-[#666] font-medium">Your AI Learning Collective</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCloseRightPanel}
                  className="lg:hidden p-2 rounded-lg hover:bg-[#D6CFC2]/50 text-[#666] transition-colors"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
                {selectedResource && (
                  <button
                    onClick={() => {
                      setSelectedResource(null);
                      setRightPanelWidth(320);
                    }}
                    className="p-2 rounded-lg hover:bg-[#D6CFC2]/50 text-[#888] hover:text-[#555] transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scrollable content area with grid overlay for smooth transitions */}
      <div className="flex-1 grid grid-cols-1 grid-rows-1 min-h-0 overflow-hidden relative">
        {/* Sidebar view (agents + resources) */}
        <div
          className={`col-start-1 row-start-1 flex flex-col min-h-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isPreviewExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          {/* Agent Icons */}
          <div className="px-4 py-3 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-medium text-[#888] uppercase tracking-widest">Agents</span>
              {(isGenerating || isAutoGenerating) && (
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-[#8a9ba3]" />
                  {isAutoGenerating && (
                    <span className="text-[8px] text-[#8a9ba3]">Auto-generating...</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => onAgentClick(agent.id)}
                  disabled={isGenerating}
                  className={`group flex-1 py-2 px-1 rounded-lg border transition-all duration-200 flex flex-col items-center gap-1 disabled:opacity-40 ${
                    activeAgent === agent.id
                      ? "bg-[#B8C3C9]/20 border-[#B8C3C9]/50 shadow-sm"
                      : "bg-white/50 border-[#D6CFC2] hover:bg-white hover:border-[#B8C3C9]"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                      activeAgent === agent.id
                        ? "bg-[#B8C3C9]/30"
                        : `bg-gradient-to-br ${agent.color} shadow-sm`
                    }`}
                  >
                    <agent.icon
                      className={`w-3 h-3 ${activeAgent === agent.id ? "text-[#4a5568]" : "text-white"}`}
                    />
                  </div>
                  <span
                    className={`text-[8px] font-semibold leading-none ${
                      activeAgent === agent.id ? "text-[#4a5568]" : "text-[#888]"
                    }`}
                  >
                    {agent.label.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-[#D6CFC2]" />

          {/* Resources List */}
          <div className="flex-1 p-5 overflow-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-[#888] uppercase tracking-wider">Resources</span>
              <span className="text-xs text-[#999]">{generatedResources.length} items</span>
            </div>
            <div className="space-y-3">
              {/* Remedial Resources Section */}
              {remedialResources.length > 0 && (
                <RemedialSection
                  resources={remedialResources}
                  selectedResource={selectedResource}
                  onResourceClick={handleResourceClick}
                />
              )}

              {/* Grouped Resources by Type */}
              {generatedResources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#D6CFC2]/50 flex items-center justify-center mb-3">
                    <Layers className="w-6 h-6 text-[#999]" />
                  </div>
                  <p className="text-sm text-[#666] mb-1">No resources yet</p>
                  <p className="text-xs text-[#999]">Click an agent above to generate</p>
                </div>
              ) : (
                AGENTS.map((agent) => (
                  <ResourceTypeGroup
                    key={agent.id}
                    agent={agent}
                    items={generatedResources.filter((r) => r.type === agent.id)}
                    isExpanded={expandedTypes.has(agent.id)}
                    onToggle={() => {
                      const next = new Set(expandedTypes);
                      if (next.has(agent.id)) next.delete(agent.id);
                      else next.add(agent.id);
                      setExpandedTypes(next);
                    }}
                    selectedResource={selectedResource}
                    onResourceClick={handleResourceClick}
                    gateStatus={gateStatus}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Preview view */}
        <div
          className={`col-start-1 row-start-1 flex flex-col min-h-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isPreviewExpanded && selectedResource ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}

// Remedial Resources Section
function RemedialSection({
  resources,
  selectedResource,
  onResourceClick,
}: {
  resources: GeneratedResource[];
  selectedResource: string | null;
  onResourceClick: (item: GeneratedResource) => void;
}) {
  return (
    <div className="rounded-xl border-2 border-amber-300 overflow-hidden bg-amber-50/40">
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-100/60">
        <Target className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">Targeted Review</span>
        <span className="text-xs text-amber-600 ml-auto">
          {resources.filter((r) => !r.consumed).length} new
        </span>
      </div>
      <div className="p-3 space-y-2">
        {resources.map((item) => (
          <div
            key={item.id}
            onClick={() => onResourceClick(item)}
            className={`group flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${
              selectedResource === item.id
                ? "bg-amber-100 border-amber-300"
                : "bg-white/70 border-amber-200 hover:bg-white hover:border-amber-400"
            } ${!item.consumed ? "ring-1 ring-amber-300" : ""}`}
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm text-[#2a2a2a] group-hover:text-[#000] truncate block">
                {item.topic}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-700 capitalize">{item.type}</span>
                {item.weakConcepts && item.weakConcepts.length > 0 && (
                  <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                    {item.weakConcepts[0]}
                  </span>
                )}
                {!item.consumed && (
                  <span className="text-[10px] text-white bg-amber-500 px-1.5 py-0.5 rounded-full">
                    New
                  </span>
                )}
              </div>
            </div>
            <ChevronRight
              className={`w-4 h-4 text-amber-500 transition-transform ${
                selectedResource === item.id ? "rotate-90" : ""
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Resource Type Group
function ResourceTypeGroup({
  agent,
  items,
  isExpanded,
  onToggle,
  selectedResource,
  onResourceClick,
  gateStatus,
}: {
  agent: (typeof AGENTS)[0];
  items: GeneratedResource[];
  isExpanded: boolean;
  onToggle: () => void;
  selectedResource: string | null;
  onResourceClick: (item: GeneratedResource) => void;
  gateStatus: any;
}) {
  const scoreKey = agent.id === "quiz" ? "practice_quiz" : agent.id;
  const score = gateStatus ? gateStatus.resource_scores[scoreKey] || 0 : 0;
  const percentage = Math.round(score * 100);
  const AgentIcon = agent.icon;

  const colorMap: Record<string, string> = {
    notes: "#d97706",
    quiz: "#7c3aed",
    code: "#059669",
    mindmap: "#0d9488",
    video: "#e11d48",
  };

  return (
    <div className="rounded-xl border border-[#D6CFC2] overflow-hidden bg-white/40">
      {/* Type Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/60 transition-colors"
      >
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            agent.id === "notes"
              ? "bg-amber-100 text-amber-700"
              : agent.id === "quiz"
              ? "bg-violet-100 text-violet-700"
              : agent.id === "code"
              ? "bg-emerald-100 text-emerald-700"
              : agent.id === "mindmap"
              ? "bg-teal-100 text-teal-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          <AgentIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-medium text-[#2a2a2a] block">{agent.label}</span>
          <span className="text-xs text-[#888]">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>
        {gateStatus && (
          <div className="mr-1 flex items-center gap-1" title={`${percentage}% complete`}>
            <ProgressRing percentage={percentage} color={colorMap[agent.id] || "#8a9ba3"} />
            <span className="text-[10px] font-medium text-[#888] w-6 text-right">{percentage}%</span>
          </div>
        )}
        <ChevronDown
          className={`w-4 h-4 text-[#999] transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded Items */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 space-y-2">
            {items.length === 0 ? (
              <p className="text-xs text-[#999] py-2">No {agent.label.toLowerCase()} yet</p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onResourceClick(item)}
                  className={`group flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedResource === item.id
                      ? "bg-[#B8C3C9]/20 border-[#B8C3C9]/50"
                      : "bg-white/50 border-[#D6CFC2]/60 hover:bg-white hover:border-[#B8C3C9]"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#2a2a2a] group-hover:text-[#000] truncate block">
                      {item.topic}
                    </span>
                    <span className="text-xs text-[#888]">
                      {new Date(item.timestamp).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-[#999] transition-transform ${
                      selectedResource === item.id ? "rotate-90" : ""
                    }`}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Progress Ring Component
function ProgressRing({ percentage, color }: { percentage: number; color: string }) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
      <circle cx="12" cy="12" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="3" />
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

export { AGENTS };
