"use client";

import { Loader2, ChevronRight, ChevronLeft, LogOut, X, BarChart3, BookOpen, Check } from "lucide-react";
import Link from "next/link";

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
      className={`relative flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ease-in-out shrink-0 overflow-hidden font-[var(--font-nunito)]
        lg:relative lg:translate-x-0 lg:z-auto lg:h-auto
        fixed inset-y-0 left-0 z-50 h-full
        ${isCollapsed ? "lg:w-14" : "lg:w-60 w-72"}
        ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}`}
      style={{ fontFamily: "var(--font-nunito), 'Nunito', system-ui, sans-serif" }}
    >
      {/* Collapse Toggle Button (Desktop only) */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-3 top-16 z-10 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* Header */}
      <div className={`border-b border-gray-100 ${isCollapsed ? "p-2" : "px-4 py-3"}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${isCollapsed ? "justify-center w-full" : "gap-2.5"}`}>
            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900 text-base truncate">{currentTopic || "Your Journey"}</h2>
                <p className="text-sm text-gray-500 truncate">{headerSummary}</p>
              </div>
            )}
          </div>
          {/* Close button for mobile */}
          {!isCollapsed && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Learning Path */}
      <div className={`flex-1 overflow-auto scrollbar-thin ${isCollapsed ? "p-1.5" : "p-3"}`}>
        {!isCollapsed && (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Learning Path
            </span>
            <span className="text-xs text-gray-400 font-medium">{progressLabel}</span>
          </div>
        )}
        <div className="space-y-0.5">
          {isLoadingPath ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            (() => {
              let mainTopicIndex = 0;
              
              const hasCurrentSubtopic = (mainTopicId: string) => {
                return learningPath.some(
                  (n) => n.parentId === mainTopicId && n.status === "current"
                );
              };
              
              return learningPath.map((node) => {
                const isSubtopic = node.isSubtopic || node.title.startsWith("  ");
                const displayTitle = node.title.replace(/^  /, "");
                
                if (!isSubtopic) {
                  mainTopicIndex++;
                }
                
                const mainTopicHasCurrentSubtopic = !isSubtopic && hasCurrentSubtopic(node.id);
                const isActive = node.status === "current" || mainTopicHasCurrentSubtopic;

                if (isCollapsed && isSubtopic) {
                  return null;
                }
                
                return (
                  <div
                    key={node.id}
                    title={isCollapsed ? displayTitle : undefined}
                    className={`group relative flex items-center transition-all cursor-pointer rounded-lg ${
                      isCollapsed 
                        ? "justify-center p-2"
                        : isSubtopic 
                          ? "gap-2 ml-5 px-2 py-1.5"
                          : "gap-2.5 px-2 py-2"
                    } ${
                      isActive && !isSubtopic
                        ? "bg-gray-900 text-white"
                        : node.status === "completed"
                        ? "hover:bg-gray-50"
                        : "hover:bg-gray-50 opacity-50 hover:opacity-70"
                    }`}
                  >
                    {/* Node Icon */}
                    {isSubtopic ? (
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        node.status === "completed"
                          ? "bg-gray-400"
                          : node.status === "current"
                          ? "bg-gray-900"
                          : "bg-gray-300"
                      }`} />
                    ) : (
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                          node.status === "completed"
                            ? "bg-gray-200 text-gray-600"
                            : isActive
                            ? "bg-white text-gray-900"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {node.status === "completed" ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          mainTopicIndex
                        )}
                      </div>
                    )}
                    
                    {/* Node Content */}
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <span
                          className={`block truncate ${
                            isSubtopic ? "text-sm" : "text-base"
                          } ${
                            isActive && !isSubtopic
                              ? "font-medium"
                              : node.status === "completed"
                              ? "text-gray-700"
                              : isSubtopic && node.status === "current"
                              ? "text-gray-900 font-medium"
                              : "text-gray-500"
                          }`}
                        >
                          {displayTitle}
                        </span>
                        {!isSubtopic && isActive && (
                          <span className="text-xs text-gray-400">In Progress</span>
                        )}
                      </div>
                    )}
                    
                    {/* Arrow for active topic */}
                    {!isCollapsed && !isSubtopic && isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>

      {/* Analytics Link */}
      <div className={`border-t border-gray-100 ${isCollapsed ? "p-1.5" : "p-3"}`}>
        <Link
          href="/analytics"
          title={isCollapsed ? "Analytics" : undefined}
          className={`flex items-center rounded-lg hover:bg-gray-50 transition-all group ${
            isCollapsed ? "justify-center p-2" : "gap-2.5 px-2 py-2"
          }`}
        >
          <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
            <BarChart3 className="w-3.5 h-3.5 text-gray-600" />
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <span className="text-base text-gray-700 group-hover:text-gray-900">Analytics</span>
                <p className="text-xs text-gray-400">View your progress</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </>
          )}
        </Link>
      </div>

      {/* User Info & Logout */}
      <div className={`border-t border-gray-100 ${isCollapsed ? "p-1.5" : "p-3"}`}>
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5"}`}>
          <div 
            className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
            title={isCollapsed ? userName || "User" : undefined}
          >
            {userName?.charAt(0).toUpperCase() || "U"}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <span className="text-base font-medium text-gray-900 truncate block">{userName || "User"}</span>
                <span className="text-xs text-gray-400">Student</span>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
