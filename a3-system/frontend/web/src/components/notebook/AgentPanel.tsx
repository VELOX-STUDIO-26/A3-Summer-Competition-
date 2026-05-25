"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
  Plus,
  Check,
  GripVertical,
  FileText,
  HelpCircle,
  Code2,
  Network,
  Video,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GateStatusPanel } from "@/components/milestone/GateStatus";

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
  gateLoading: boolean;
  refreshGate: () => void;
  onAgentClick: (agentId: string) => void;
  onMarkConsumed: (id: string) => void;
  rightPanelWidth: number;
  setRightPanelWidth: (width: number) => void;
  isRightPanelOpen: boolean;
  onCloseRightPanel: () => void;
  // Preview content
  renderPreview: () => React.ReactNode;
  currentTopic: string;
  // Center mode (takes flex-1 instead of fixed width)
  isCenter?: boolean;
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
  gateLoading,
  refreshGate,
  onAgentClick,
  onMarkConsumed,
  rightPanelWidth,
  setRightPanelWidth,
  isRightPanelOpen,
  onCloseRightPanel,
  renderPreview,
  currentTopic,
  isCenter = false,
}: AgentPanelProps) {
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(320);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

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
      className={`flex flex-col bg-white z-10 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${isCenter 
          ? "flex-1 min-w-0 border-l border-gray-200" 
          : `border-l border-gray-200 shrink-0 lg:relative lg:translate-x-0 fixed inset-y-0 right-0 w-80 sm:w-96 ${isRightPanelOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`
        }`}
      style={{
        width: isCenter ? undefined : (typeof window !== "undefined" && window.innerWidth >= 1024 ? rightPanelWidth : undefined),
      }}
    >
      {/* Drag resize handle - only on desktop and not in center mode */}
      {!isCenter && (
        <div
          onMouseDown={handleMouseDown}
          className="hidden lg:block absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group hover:bg-[#B8C3C9]/30 transition-colors"
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-[#D6CFC2] group-hover:bg-[#B8C3C9] transition-colors" />
        </div>
      )}

      {/* Header - only show when preview is expanded or on mobile */}
      <div className={`p-5 border-b border-gray-200 ${!isPreviewExpanded && !selectedResource ? "lg:hidden" : ""}`}>
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
            // Normal header - just close button for mobile
            <div className="flex items-center justify-end w-full">
              <button
                onClick={onCloseRightPanel}
                className="lg:hidden p-2 rounded-lg hover:bg-[#D6CFC2]/50 text-[#666] transition-colors"
                aria-label="Close panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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

          {/* Resources List */}
          <div className="flex-1 p-6 overflow-auto scrollbar-hide flex flex-col" style={{ scrollbarWidth: "none" }}>
            {/* Header - Glassmorphism style (hidden when detail panel is open) */}
            {!expandedAgentId && (
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Resources</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {generatedResources.length} {generatedResources.length === 1 ? "item" : "items"} generated
                  {(isGenerating || isAutoGenerating) && (
                    <span className="inline-flex items-center gap-1.5 ml-2 text-violet-600">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {isAutoGenerating ? "Auto-generating..." : "Generating..."}
                    </span>
                  )}
                </p>
              </div>
              {/* Generate New Resource Button - Glassmorphism */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
                  title="Generate new resource"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Generate</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg rounded-lg">
                  {AGENTS.map((agent) => (
                    <DropdownMenuItem
                      key={agent.id}
                      onClick={() => onAgentClick(agent.id)}
                      className="cursor-pointer py-2.5 px-3 hover:bg-gray-50"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                        <agent.icon className="w-4 h-4 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900 block">{agent.label}</span>
                        <span className="text-xs text-gray-500">{agent.desc}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            )}
            <div className={`relative ${expandedAgentId ? 'flex-1 flex flex-col' : 'space-y-3'}`}>
              {/* Remedial Resources Section */}
              {remedialResources.length > 0 && !expandedAgentId && (
                <RemedialSection
                  resources={remedialResources}
                  selectedResource={selectedResource}
                  onResourceClick={handleResourceClick}
                />
              )}

              {/* Grouped Resources by Type - Glassmorphism grid */}
              {generatedResources.length === 0 && !expandedAgentId ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                    <Layers className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-800 mb-1">No resources yet</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-xs">Generate your first learning resource to get started</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors">
                      <Plus className="w-4 h-4" />
                      Get Started
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-56 bg-white border border-gray-200 shadow-lg rounded-lg">
                      {AGENTS.map((agent) => (
                        <DropdownMenuItem
                          key={agent.id}
                          onClick={() => onAgentClick(agent.id)}
                          className="cursor-pointer py-2.5 hover:bg-gray-50"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                            <agent.icon className="w-4 h-4 text-gray-700" />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900 block">{agent.label}</span>
                            <span className="text-xs text-gray-500">{agent.desc}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : expandedAgentId ? (
                /* Detail Panel for expanded agent */
                <ResourceDetailPanel
                  agent={AGENTS.find(a => a.id === expandedAgentId)!}
                  items={generatedResources.filter((r) => r.type === expandedAgentId)}
                  selectedResource={selectedResource}
                  onResourceClick={handleResourceClick}
                  onClose={() => setExpandedAgentId(null)}
                  gateStatus={gateStatus}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {AGENTS.map((agent) => (
                    <ResourceTypeGroup
                      key={agent.id}
                      agent={agent}
                      items={generatedResources.filter((r) => r.type === agent.id)}
                      isExpanded={expandedTypes.has(agent.id)}
                      onToggle={() => setExpandedAgentId(agent.id)}
                      selectedResource={selectedResource}
                      onResourceClick={handleResourceClick}
                      gateStatus={gateStatus}
                    />
                  ))}
                  {/* Milestone Quiz - as 6th card in the grid */}
                  <GateStatusPanel
                    gateStatus={gateStatus}
                    loading={gateLoading}
                    onRefresh={refreshGate}
                    topic={currentTopic}
                  />
                </div>
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

// Color map for agents
const AGENT_COLORS: Record<string, { gradient: string; iconBg: string; glow: string; ring: string; light: string }> = {
  notes: { gradient: "from-amber-500 to-orange-500", iconBg: "bg-amber-500", glow: "shadow-amber-500/25", ring: "#f59e0b", light: "bg-amber-500/10" },
  quiz: { gradient: "from-violet-500 to-purple-500", iconBg: "bg-violet-500", glow: "shadow-violet-500/25", ring: "#8b5cf6", light: "bg-violet-500/10" },
  code: { gradient: "from-emerald-500 to-teal-500", iconBg: "bg-emerald-500", glow: "shadow-emerald-500/25", ring: "#10b981", light: "bg-emerald-500/10" },
  mindmap: { gradient: "from-cyan-500 to-teal-500", iconBg: "bg-cyan-500", glow: "shadow-cyan-500/25", ring: "#06b6d4", light: "bg-cyan-500/10" },
  video: { gradient: "from-rose-500 to-pink-500", iconBg: "bg-rose-500", glow: "shadow-rose-500/25", ring: "#f43f5e", light: "bg-rose-500/10" },
};

// Resource Type Group - Glassmorphism Card Design
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
  const colors = AGENT_COLORS[agent.id] || AGENT_COLORS.notes;

  return (
    <div 
      className="group/card relative cursor-pointer"
      onClick={onToggle}
    >
      {/* Clean White Card */}
      <div className="relative rounded-xl bg-white border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-gray-200">
        {/* Card Content */}
        <div className="p-4 sm:p-5">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            {/* Icon */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gray-100 flex items-center justify-center">
              <AgentIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            </div>
            
            {/* Progress */}
            {gateStatus && (
              <span className="text-xs sm:text-sm font-medium text-gray-400">{percentage}%</span>
            )}
          </div>

          {/* Title & Description */}
          <div className="mb-3 sm:mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{agent.label}</h3>
            <p className="text-xs text-gray-500 line-clamp-1">{agent.desc}</p>
          </div>

          {/* Items Count & Arrow */}
          <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100">
            <div className="inline-flex items-center gap-1.5 sm:gap-2">
              <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${items.length > 0 ? 'bg-gray-900' : 'bg-gray-300'}`} />
              <span className="text-xs sm:text-sm text-gray-600">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover/card:text-gray-600 group-hover/card:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Resource Card Templates based on type
function ResourceCard({
  item,
  colors,
  isSelected,
  isDragging,
  onMouseDown,
  onClick,
}: {
  item: GeneratedResource;
  colors: typeof AGENT_COLORS.notes;
  isSelected: boolean;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const getResourcePreview = () => {
    switch (item.type) {
      case "notes":
        const notesContent = item.data?.content || item.data?.notes || "";
        const wordCount = typeof notesContent === 'string' ? notesContent.split(/\s+/).length : 0;
        const readTime = Math.max(1, Math.ceil(wordCount / 200));
        
        return (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Notes</span>
              <span className="text-[10px] text-gray-400">{readTime} min</span>
            </div>
            
            {/* Title */}
            <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{item.topic}</h3>
            
            {/* Document SVG */}
            <div className="flex items-center justify-center py-3">
              <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
                {/* Document outline */}
                <rect x="30" y="5" width="120" height="90" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5"/>
                {/* Folded corner */}
                <path d="M125 5 L150 5 L150 30 L125 30 Z" fill="#f3f4f6"/>
                <path d="M125 5 L125 30 L150 30" stroke="#e5e7eb" strokeWidth="1.5" fill="none"/>
                {/* Text lines */}
                <rect x="45" y="20" width="60" height="6" rx="2" fill="#111827"/>
                <rect x="45" y="34" width="85" height="4" rx="1.5" fill="#d1d5db"/>
                <rect x="45" y="44" width="75" height="4" rx="1.5" fill="#d1d5db"/>
                <rect x="45" y="54" width="90" height="4" rx="1.5" fill="#d1d5db"/>
                <rect x="45" y="64" width="55" height="4" rx="1.5" fill="#d1d5db"/>
                <rect x="45" y="74" width="70" height="4" rx="1.5" fill="#e5e7eb"/>
              </svg>
            </div>
            
            <p className="text-[11px] text-gray-500 text-center">{wordCount} words</p>
            
            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className={`text-[10px] font-medium ${item.consumed ? 'text-gray-900' : 'text-gray-400'}`}>
                {item.consumed ? '✓ Read' : 'Unread'}
              </span>
            </div>
          </div>
        );
      
      case "quiz":
        const questions = item.data?.questions || [];
        const totalQuestions = questions.length || 5;
        const difficulty = item.data?.difficulty || 'Medium';
        
        return (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Quiz</span>
              <span className="text-[10px] text-gray-400">{difficulty}</span>
            </div>
            
            {/* Title */}
            <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{item.topic}</h3>
            
            {/* Quiz SVG - Checklist style */}
            <div className="flex items-center justify-center py-3">
              <svg width="200" height="90" viewBox="0 0 200 90" fill="none">
                {/* Question rows */}
                <rect x="10" y="5" width="180" height="22" rx="4" fill="#f3f4f6"/>
                <circle cx="28" cy="16" r="6" fill={totalQuestions >= 1 ? "#111827" : "#e5e7eb"}/>
                <rect x="44" y="12" width="100" height="8" rx="2" fill="#e5e7eb"/>
                
                <rect x="10" y="33" width="180" height="22" rx="4" fill="#f3f4f6"/>
                <circle cx="28" cy="44" r="6" fill={totalQuestions >= 2 ? "#111827" : "#e5e7eb"}/>
                <rect x="44" y="40" width="80" height="8" rx="2" fill="#e5e7eb"/>
                
                <rect x="10" y="61" width="180" height="22" rx="4" fill="#f3f4f6"/>
                <circle cx="28" cy="72" r="6" fill={totalQuestions >= 3 ? "#111827" : "#e5e7eb"}/>
                <rect x="44" y="68" width="120" height="8" rx="2" fill="#e5e7eb"/>
              </svg>
            </div>
            
            <p className="text-[11px] text-gray-500 text-center">{totalQuestions} questions · ~{Math.ceil(totalQuestions * 1.5)} min</p>
            
            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className={`text-[10px] font-medium ${item.consumed ? 'text-gray-900' : 'text-gray-400'}`}>
                {item.consumed ? '✓ Completed' : 'Not started'}
              </span>
            </div>
          </div>
        );
      
      case "code":
        const language = item.data?.language || "python";
        
        return (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Code</span>
              <span className="text-[10px] font-mono text-gray-500">{language}</span>
            </div>
            
            {/* Title */}
            <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{item.topic}</h3>
            
            {/* Code Editor SVG */}
            <div className="flex items-center justify-center py-3">
              <svg width="200" height="100" viewBox="0 0 200 100" fill="none">
                {/* Editor window */}
                <rect x="10" y="5" width="180" height="90" rx="6" fill="#111827"/>
                {/* Title bar */}
                <rect x="10" y="5" width="180" height="18" rx="6" fill="#1f2937"/>
                <circle cx="24" cy="14" r="4" fill="#ef4444"/>
                <circle cx="36" cy="14" r="4" fill="#eab308"/>
                <circle cx="48" cy="14" r="4" fill="#22c55e"/>
                {/* Code lines */}
                <rect x="22" y="32" width="12" height="5" rx="1.5" fill="#6b7280"/>
                <rect x="40" y="32" width="60" height="5" rx="1.5" fill="#9ca3af"/>
                <rect x="22" y="43" width="12" height="5" rx="1.5" fill="#6b7280"/>
                <rect x="40" y="43" width="80" height="5" rx="1.5" fill="#9ca3af"/>
                <rect x="22" y="54" width="12" height="5" rx="1.5" fill="#6b7280"/>
                <rect x="40" y="54" width="45" height="5" rx="1.5" fill="#9ca3af"/>
                <rect x="22" y="65" width="12" height="5" rx="1.5" fill="#6b7280"/>
                <rect x="40" y="65" width="70" height="5" rx="1.5" fill="#9ca3af"/>
                <rect x="22" y="76" width="12" height="5" rx="1.5" fill="#6b7280"/>
                <rect x="40" y="76" width="55" height="5" rx="1.5" fill="#9ca3af"/>
              </svg>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className={`text-[10px] font-medium ${item.consumed ? 'text-gray-900' : 'text-gray-400'}`}>
                {item.consumed ? '✓ Practiced' : 'Not started'}
              </span>
            </div>
          </div>
        );
      
      case "mindmap":
        const nodes = item.data?.nodes || [];
        const nodeCount = nodes.length || 0;
        
        return (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Mind Map</span>
              <span className="text-[10px] text-gray-400">{nodeCount} nodes</span>
            </div>
            
            {/* Title */}
            <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{item.topic}</h3>
            
            {/* Mind Map SVG */}
            <div className="flex items-center justify-center py-3">
              <svg width="220" height="110" viewBox="0 0 220 110" fill="none" className="text-gray-300">
                {/* Connection lines */}
                <line x1="110" y1="55" x2="40" y2="20" stroke="currentColor" strokeWidth="2"/>
                <line x1="110" y1="55" x2="40" y2="90" stroke="currentColor" strokeWidth="2"/>
                <line x1="110" y1="55" x2="180" y2="20" stroke="currentColor" strokeWidth="2"/>
                <line x1="110" y1="55" x2="180" y2="90" stroke="currentColor" strokeWidth="2"/>
                {/* Center node */}
                <circle cx="110" cy="55" r="18" fill="#111827"/>
                {/* Branch nodes */}
                <circle cx="40" cy="20" r="10" fill="#d1d5db"/>
                <circle cx="40" cy="90" r="10" fill="#d1d5db"/>
                <circle cx="180" cy="20" r="10" fill="#d1d5db"/>
                <circle cx="180" cy="90" r="10" fill="#d1d5db"/>
                {/* Leaf nodes */}
                <circle cx="12" cy="10" r="5" fill="#e5e7eb"/>
                <circle cx="12" cy="30" r="5" fill="#e5e7eb"/>
                <circle cx="208" cy="10" r="5" fill="#e5e7eb"/>
                <circle cx="208" cy="30" r="5" fill="#e5e7eb"/>
                <circle cx="12" cy="80" r="5" fill="#e5e7eb"/>
                <circle cx="12" cy="100" r="5" fill="#e5e7eb"/>
                <circle cx="208" cy="80" r="5" fill="#e5e7eb"/>
                <circle cx="208" cy="100" r="5" fill="#e5e7eb"/>
                <line x1="40" y1="20" x2="12" y2="10" stroke="#e5e7eb" strokeWidth="1.5"/>
                <line x1="40" y1="20" x2="12" y2="30" stroke="#e5e7eb" strokeWidth="1.5"/>
                <line x1="180" y1="20" x2="208" y2="10" stroke="#e5e7eb" strokeWidth="1.5"/>
                <line x1="180" y1="20" x2="208" y2="30" stroke="#e5e7eb" strokeWidth="1.5"/>
                <line x1="40" y1="90" x2="12" y2="80" stroke="#e5e7eb" strokeWidth="1.5"/>
                <line x1="40" y1="90" x2="12" y2="100" stroke="#e5e7eb" strokeWidth="1.5"/>
                <line x1="180" y1="90" x2="208" y2="80" stroke="#e5e7eb" strokeWidth="1.5"/>
                <line x1="180" y1="90" x2="208" y2="100" stroke="#e5e7eb" strokeWidth="1.5"/>
              </svg>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className={`text-[10px] font-medium ${item.consumed ? 'text-gray-900' : 'text-gray-400'}`}>
                {item.consumed ? '✓ Explored' : 'Not started'}
              </span>
            </div>
          </div>
        );
      
      case "video":
        const duration = item.data?.duration || "5:00";
        
        return (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Video</span>
              <span className="text-[10px] text-gray-400">{duration}</span>
            </div>
            
            {/* Title */}
            <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{item.topic}</h3>
            
            {/* Video Player SVG */}
            <div className="flex items-center justify-center py-3">
              <svg width="200" height="100" viewBox="0 0 200 100" fill="none">
                {/* Video frame */}
                <rect x="10" y="5" width="180" height="75" rx="6" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1.5"/>
                {/* Play button */}
                <circle cx="100" cy="42" r="20" fill="#111827"/>
                <path d="M94 32 L112 42 L94 52 Z" fill="white"/>
                {/* Progress bar */}
                <rect x="10" y="86" width="180" height="8" rx="3" fill="#e5e7eb"/>
                <rect x="10" y="86" width={item.consumed ? "180" : "0"} height="8" rx="3" fill="#111827"/>
                {/* Time indicator */}
                <circle cx={item.consumed ? "190" : "10"} cy="90" r="5" fill="#111827"/>
              </svg>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className={`text-[10px] font-medium ${item.consumed ? 'text-gray-900' : 'text-gray-400'}`}>
                {item.consumed ? '✓ Watched' : 'Not started'}
              </span>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">{item.topic}</h3>
            <p className="text-[11px] text-gray-500">Click to view</p>
          </div>
        );
    }
  };

  return (
    <div
      data-card
      onMouseDown={onMouseDown}
      onClick={onClick}
      className={`group w-72 cursor-grab active:cursor-grabbing transition-all duration-200 select-none ${
        isDragging ? 'z-50 scale-[1.02]' : isSelected ? 'z-40' : 'z-10 hover:z-30'
      }`}
      style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      {/* Clean white card */}
      <div className={`relative rounded-xl overflow-hidden bg-white border transition-shadow duration-200 ${
        isDragging ? 'shadow-xl border-gray-200' : isSelected ? 'shadow-lg border-gray-200' : 'shadow-sm border-gray-100 hover:shadow-md hover:border-gray-200'
      }`}>
        {/* Content */}
        <div className="p-5">
          {getResourcePreview()}
        </div>
      </div>
    </div>
  );
}

// Draggable Canvas for Resources
function ResourceDetailPanel({
  agent,
  items,
  selectedResource,
  onResourceClick,
  onClose,
  gateStatus,
}: {
  agent: (typeof AGENTS)[0];
  items: GeneratedResource[];
  selectedResource: string | null;
  onResourceClick: (item: GeneratedResource) => void;
  onClose: () => void;
  gateStatus: any;
}) {
  const AgentIcon = agent.icon;
  const colors = AGENT_COLORS[agent.id] || AGENT_COLORS.notes;
  const scoreKey = agent.id === "quiz" ? "practice_quiz" : agent.id;
  const score = gateStatus ? gateStatus.resource_scores[scoreKey] || 0 : 0;
  const percentage = Math.round(score * 100);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [, forceUpdate] = useState(0);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const draggingIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  // Initialize positions for items
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});
  
  useEffect(() => {
    // Auto-arrange items in a grid if no positions set
    const cols = 2;
    const cardWidth = 300;
    const cardHeight = 320;
    const gap = 24;
    let hasNew = false;
    
    items.forEach((item, index) => {
      if (!positionsRef.current[item.id]) {
        const col = index % cols;
        const row = Math.floor(index / cols);
        positionsRef.current[item.id] = {
          x: col * (cardWidth + gap) + 40,
          y: row * (cardHeight + gap) + 40,
        };
        hasNew = true;
      }
    });
    
    if (hasNew) {
      forceUpdate(n => n + 1);
    }
  }, [items]);

  // Update transform directly on DOM for performance
  const updateTransform = () => {
    if (transformRef.current) {
      transformRef.current.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoom})`;
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Don't start panning if clicking on a button or card
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[data-card]')) {
      return;
    }
    
    // Start panning with left click on canvas or middle mouse button anywhere
    if (e.button === 0 || e.button === 1) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current && !draggingIdRef.current) {
      panRef.current = { x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y };
      updateTransform();
    }
    if (draggingIdRef.current) {
      // Check if mouse has moved enough to count as a drag (5px threshold)
      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      const dy = Math.abs(e.clientY - dragStartPos.current.y);
      if (dx > 5 || dy > 5) {
        hasDraggedRef.current = true;
      }
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left - dragOffsetRef.current.x - panRef.current.x) / zoom;
        const y = (e.clientY - rect.top - dragOffsetRef.current.y - panRef.current.y) / zoom;
        positionsRef.current[draggingIdRef.current] = { x, y };
        
        // Update card position directly
        const cardEl = canvasRef.current?.querySelector(`[data-card-id="${draggingIdRef.current}"]`) as HTMLElement;
        if (cardEl) {
          cardEl.style.left = `${x}px`;
          cardEl.style.top = `${y}px`;
        }
      }
    }
  };

  const handleCanvasMouseUp = () => {
    isPanningRef.current = false;
    draggingIdRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    // Reset hasDragged after a short delay to allow click handler to check it
    setTimeout(() => { hasDraggedRef.current = false; }, 0);
  };

  const handleCardMouseDown = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent text selection
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    draggingIdRef.current = itemId;
    hasDraggedRef.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };
  
  const handleCardClick = (item: GeneratedResource) => {
    // Only trigger click if we didn't drag
    if (!hasDraggedRef.current) {
      onResourceClick(item);
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.3));
  const handleResetView = () => { 
    setZoom(1); 
    panRef.current = { x: 0, y: 0 };
    updateTransform();
  };
  
  // Update transform when zoom changes
  useEffect(() => {
    updateTransform();
  }, [zoom]);
  
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    // deltaY is positive when scrolling down (zoom out), negative when scrolling up (zoom in)
    const delta = -e.deltaY * 0.001;
    setZoom(z => {
      const newZoom = z + delta;
      return Math.min(Math.max(newZoom, 0.3), 3);
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 animate-in fade-in duration-200">
      {/* Full Canvas Area */}
      <div 
        ref={canvasRef}
        className="flex-1 relative rounded-xl overflow-hidden border border-gray-200 cursor-grab"
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        {/* Back button - floating */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-20 w-9 h-9 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm"
        >
          <ChevronDown className="w-4 h-4 text-gray-600 rotate-90" />
        </button>
        
        {/* Zoom indicator - floating */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
          <span className="text-xs text-gray-500">{Math.round(zoom * 100)}%</span>
        </div>
        
        {/* Canvas background - clean white with subtle dots */}
        <div className="absolute inset-0 bg-white" />
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }} />
        
        {items.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
              <AgentIcon className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">No resources yet</h3>
            <p className="text-xs text-gray-400">Generate your first {agent.label.toLowerCase()} resource</p>
          </div>
        ) : (
          <div className="canvas-bg absolute inset-0 overflow-hidden">
            <div
              ref={transformRef}
              className="relative origin-top-left will-change-transform"
              style={{
                width: '4000px',
                height: '4000px',
                transform: `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoom})`,
              }}
            >
              {items.map((item) => {
                const pos = positionsRef.current[item.id] || { x: 40, y: 40 };
                return (
                  <div
                    key={item.id}
                    data-card-id={item.id}
                    className="absolute"
                    style={{
                      left: pos.x,
                      top: pos.y,
                    }}
                  >
                    <ResourceCard
                      item={item}
                      colors={colors}
                      isSelected={selectedResource === item.id}
                      isDragging={draggingIdRef.current === item.id}
                      onMouseDown={(e) => handleCardMouseDown(e, item.id)}
                      onClick={() => handleCardClick(item)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Progress Ring Component
function ProgressRing({ percentage, color, size = 24 }: { percentage: number; color: string; size?: number }) {
  const strokeWidth = size > 30 ? 3 : 2.5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}

export { AGENTS };
