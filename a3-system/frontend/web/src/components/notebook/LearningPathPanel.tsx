"use client";

import { Loader2, ChevronRight, ChevronLeft, LogOut, X, BarChart3, BookOpen } from "lucide-react";
import Link from "next/link";
import { GateStatusPanel } from "@/components/milestone/GateStatus";

interface PathNode {
  id: string;
  title: string;
  status: "completed" | "current" | "locked";
  isSubtopic?: boolean;
  parentId?: string;
}

interface LearningPathPanelProps {
  learningPath: PathNode[];
  isLoadingPath: boolean;
  headerSummary: string;
  progressLabel: string;
  currentTopic: string;
  gateStatus: any;
  gateLoading: boolean;
  refreshGate: () => void;
  userName: string | null;
  onLogout: () => void;
  isMobileMenuOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function LearningPathPanel({
  learningPath,
  isLoadingPath,
  headerSummary,
  progressLabel,
  currentTopic,
  gateStatus,
  gateLoading,
  refreshGate,
  userName,
  onLogout,
  isMobileMenuOpen,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}: LearningPathPanelProps) {
  return (
    <div
      className={`relative flex flex-col bg-[#E7E2D7] border-r border-[#D6CFC2] transition-all duration-300 ease-in-out shrink-0 overflow-hidden
        lg:relative lg:translate-x-0 lg:z-auto lg:h-auto
        fixed inset-y-0 left-0 z-50 h-full
        ${isCollapsed ? "lg:w-16" : "lg:w-64 w-72"}
        ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}`}
    >
      {/* Collapse Toggle Button (Desktop only) */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-3 top-20 z-10 w-6 h-6 rounded-full bg-[#E7E2D7] border border-[#D6CFC2] shadow-md items-center justify-center hover:bg-[#D6CFC2] transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={`w-4 h-4 text-[#666] transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* Header */}
      <div className={`border-b border-[#D6CFC2] ${isCollapsed ? "p-3" : "p-5"}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-3 ${isCollapsed ? "" : "mb-1"}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#B8C3C9] to-[#8a9ba3] flex items-center justify-center shadow-md shadow-[#B8C3C9]/40 flex-shrink-0">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="font-semibold text-[#2a2a2a]">Your Journey</h2>
                <p className="text-xs text-[#666]">{headerSummary}</p>
              </div>
            )}
          </div>
          {/* Close button for mobile */}
          {!isCollapsed && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-2 rounded-lg hover:bg-[#D6CFC2]/50 text-[#666] transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Learning Path */}
      <div className={`flex-1 overflow-auto scrollbar-hide ${isCollapsed ? "p-2" : "p-5"}`}>
        {!isCollapsed && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-[#666] uppercase tracking-wider">
              Learning Path
            </span>
            <span className="text-xs text-[#8a9ba3] font-medium">{progressLabel}</span>
          </div>
        )}
        <div className="relative space-y-1">
          {isLoadingPath ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#8a9ba3]" />
            </div>
          ) : (
            (() => {
              let mainTopicIndex = 0;
              
              // Check if any subtopic under a main topic is current
              const hasCurrentSubtopic = (mainTopicId: string) => {
                return learningPath.some(
                  (n) => n.parentId === mainTopicId && n.status === "current"
                );
              };
              
              return learningPath.map((node, index) => {
                const isSubtopic = node.isSubtopic || node.title.startsWith("  ");
                const displayTitle = node.title.replace(/^  /, ""); // Remove leading spaces
                
                if (!isSubtopic) {
                  mainTopicIndex++;
                }
                
                // For main topics, check if it has a current subtopic
                const mainTopicHasCurrentSubtopic = !isSubtopic && hasCurrentSubtopic(node.id);

                // When collapsed, only show main topics (not subtopics)
                if (isCollapsed && isSubtopic) {
                  return null;
                }
                
                return (
                  <div
                    key={node.id}
                    title={isCollapsed ? displayTitle : undefined}
                    className={`group relative flex items-center transition-all duration-300 cursor-pointer ${
                      isCollapsed 
                        ? "justify-center p-2 rounded-lg"
                        : isSubtopic 
                          ? `gap-3 ml-6 pl-4 py-2 border-l-2 ${
                              node.status === "current" 
                                ? "border-l-[#6B7F6B] bg-[#6B7F6B]/10" 
                                : node.status === "completed"
                                ? "border-l-[#8a9ba3]"
                                : "border-l-[#D6CFC2]"
                            }`
                          : "gap-3 p-3 rounded-xl"
                    } ${
                      !isSubtopic && (node.status === "current" || mainTopicHasCurrentSubtopic)
                        ? "bg-[#B8C3C9]/20 border border-[#B8C3C9]/50"
                        : node.status === "completed"
                        ? "hover:bg-[#D6CFC2]/30"
                        : isSubtopic && node.status === "current"
                        ? "" // Already styled above
                        : "opacity-60 hover:opacity-80"
                    }`}
                  >
                    {/* Node Icon */}
                    {isSubtopic ? (
                      // Subtopic: circle indicator with different states
                      <div className="relative flex-shrink-0">
                        <div
                          className={`w-3 h-3 rounded-full border-2 ${
                            node.status === "completed"
                              ? "bg-[#8a9ba3] border-[#8a9ba3]"
                              : node.status === "current"
                              ? "bg-[#6B7F6B] border-[#6B7F6B]"
                              : "bg-transparent border-[#D6CFC2]"
                          }`}
                        >
                          {node.status === "completed" && (
                            <svg className="w-2 h-2 text-white absolute top-0.5 left-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {node.status === "current" && (
                          <div className="absolute -inset-1 rounded-full bg-[#6B7F6B]/30 animate-pulse" />
                        )}
                      </div>
                    ) : (
                      // Main topic: numbered box
                      <div
                        className={`relative w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                          node.status === "completed"
                            ? "bg-[#8a9ba3] text-white"
                            : node.status === "current" || mainTopicHasCurrentSubtopic
                            ? "bg-[#B8C3C9] text-white shadow-md shadow-[#B8C3C9]/40"
                            : "bg-[#D6CFC2] text-[#888]"
                        }`}
                      >
                        {node.status === "completed" ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          mainTopicIndex
                        )}
                        {(node.status === "current" || mainTopicHasCurrentSubtopic) && (
                          <div className="absolute -inset-1 rounded-lg bg-[#B8C3C9]/30 animate-pulse" />
                        )}
                      </div>
                    )}
                    
                    {/* Node Content - hidden when collapsed */}
                    {!isCollapsed && (
                      <>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`block truncate ${
                              isSubtopic ? "text-xs" : "text-sm font-medium"
                            } ${
                              node.status === "current"
                                ? isSubtopic ? "text-[#4a5568] font-medium" : "text-[#4a5568]"
                                : node.status === "completed"
                                ? "text-[#555]"
                                : "text-[#888]"
                            }`}
                          >
                            {displayTitle}
                          </span>
                          {/* Show "In Progress" for main topic with current subtopic */}
                          {!isSubtopic && (node.status === "current" || mainTopicHasCurrentSubtopic) && (
                            <span className="text-xs text-[#8a9ba3]">In Progress</span>
                          )}
                          {/* Show "Current" badge for current subtopic */}
                          {isSubtopic && node.status === "current" && (
                            <span className="text-xs text-[#6B7F6B] font-medium">← Current</span>
                          )}
                        </div>
                        
                        {/* Arrow for main topic in progress */}
                        {!isSubtopic && (node.status === "current" || mainTopicHasCurrentSubtopic) && (
                          <ChevronRight className="w-4 h-4 text-[#8a9ba3] flex-shrink-0" />
                        )}
                      </>
                    )}
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>

      {/* Gate Status - Quiz Lock/Unlock (hidden when collapsed) */}
      {!isCollapsed && (
        <div className="p-5 border-t border-[#D6CFC2]">
          <GateStatusPanel
            gateStatus={gateStatus}
            loading={gateLoading}
            onRefresh={refreshGate}
            topic={currentTopic}
          />
        </div>
      )}

      {/* Analytics Link */}
      <div className={`border-t border-[#D6CFC2] ${isCollapsed ? "p-2" : "px-4 py-3"}`}>
        <Link
          href="/analytics"
          title={isCollapsed ? "Analytics" : undefined}
          className={`flex items-center rounded-xl bg-[#6B7F6B]/10 hover:bg-[#6B7F6B]/20 border border-[#6B7F6B]/20 transition-all group ${
            isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6B7F6B] to-[#8a9ba3] flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1">
                <span className="text-sm font-medium text-[#2a2a2a] group-hover:text-[#6B7F6B]">Analytics</span>
                <p className="text-xs text-[#888]">View your progress</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#888] group-hover:text-[#6B7F6B] transition-colors" />
            </>
          )}
        </Link>
      </div>

      {/* User Info & Logout */}
      <div className={`border-t border-[#D6CFC2] ${isCollapsed ? "p-2" : "p-4"}`}>
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <div className={`flex items-center ${isCollapsed ? "" : "gap-3"}`}>
            <div 
              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B8C3C9] to-[#8a9ba3] flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              title={isCollapsed ? userName || "User" : undefined}
            >
              {userName?.charAt(0).toUpperCase() || "U"}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#2a2a2a]">{userName || "User"}</span>
                <span className="text-xs text-[#888]">Student</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-red-500/10 text-[#888] hover:text-red-500 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
