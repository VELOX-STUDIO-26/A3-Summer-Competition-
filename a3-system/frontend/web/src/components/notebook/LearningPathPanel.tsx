"use client";

import { Loader2, ChevronRight, Sparkles, LogOut, X, BarChart3 } from "lucide-react";
import Link from "next/link";
import { GateStatusPanel } from "@/components/milestone/GateStatus";

interface PathNode {
  id: string;
  title: string;
  status: "completed" | "current" | "locked";
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
}: LearningPathPanelProps) {
  return (
    <div
      className={`flex flex-col bg-[#E7E2D7]/80 backdrop-blur-xl z-10 border-r border-[#D6CFC2] transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:w-64
        fixed inset-y-0 left-0 w-72
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
    >
      {/* Header */}
      <div className="p-5 border-b border-[#D6CFC2]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#B8C3C9] to-[#8a9ba3] flex items-center justify-center shadow-md shadow-[#B8C3C9]/40">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[#2a2a2a]">Your Journey</h2>
              <p className="text-xs text-[#666]">{headerSummary}</p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 rounded-lg hover:bg-[#D6CFC2]/50 text-[#666] transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Learning Path */}
      <div className="p-5 flex-1 overflow-auto scrollbar-hide">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-[#666] uppercase tracking-wider">
            Learning Path
          </span>
          <span className="text-xs text-[#8a9ba3] font-medium">{progressLabel}</span>
        </div>
        <div className="relative space-y-1">
          {isLoadingPath ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#8a9ba3]" />
            </div>
          ) : (
            learningPath.map((node, index) => (
              <div
                key={node.id}
                className={`group relative flex items-center gap-4 p-3 rounded-xl transition-all duration-300 cursor-pointer ${
                  node.status === "current"
                    ? "bg-[#B8C3C9]/20 border border-[#B8C3C9]/50"
                    : node.status === "completed"
                    ? "hover:bg-[#D6CFC2]/30"
                    : "opacity-50 hover:opacity-70"
                }`}
              >
                {/* Connector Line */}
                {index < learningPath.length - 1 && (
                  <div
                    className={`absolute left-[26px] top-[52px] w-0.5 h-4 ${
                      node.status === "completed" ? "bg-[#8a9ba3]" : "bg-[#D6CFC2]"
                    }`}
                  />
                )}
                {/* Node Icon */}
                <div
                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    node.status === "completed"
                      ? "bg-[#8a9ba3] text-white"
                      : node.status === "current"
                      ? "bg-[#B8C3C9] text-white shadow-md shadow-[#B8C3C9]/40"
                      : "bg-[#D6CFC2] text-[#888]"
                  }`}
                >
                  {node.status === "completed" ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                  {node.status === "current" && (
                    <div className="absolute -inset-1 rounded-lg bg-[#B8C3C9]/30 animate-pulse" />
                  )}
                </div>
                {/* Node Content */}
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm font-medium block truncate ${
                      node.status === "current"
                        ? "text-[#4a5568]"
                        : node.status === "completed"
                        ? "text-[#555]"
                        : "text-[#888]"
                    }`}
                  >
                    {node.title}
                  </span>
                  {node.status === "current" && (
                    <span className="text-xs text-[#8a9ba3]">In Progress</span>
                  )}
                </div>
                {/* Arrow */}
                {node.status === "current" && <ChevronRight className="w-4 h-4 text-[#8a9ba3]" />}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Gate Status - Quiz Lock/Unlock */}
      <div className="p-5 border-t border-[#D6CFC2]">
        <GateStatusPanel
          gateStatus={gateStatus}
          loading={gateLoading}
          onRefresh={refreshGate}
          topic={currentTopic}
        />
      </div>

      {/* Analytics Link */}
      <div className="px-4 py-3 border-t border-[#D6CFC2]">
        <Link
          href="/analytics"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#6B7F6B]/10 hover:bg-[#6B7F6B]/20 border border-[#6B7F6B]/20 transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6B7F6B] to-[#8a9ba3] flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-[#2a2a2a] group-hover:text-[#6B7F6B]">Analytics</span>
            <p className="text-xs text-[#888]">View your progress</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#888] group-hover:text-[#6B7F6B] transition-colors" />
        </Link>
      </div>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-[#D6CFC2]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B8C3C9] to-[#8a9ba3] flex items-center justify-center text-white text-xs font-bold">
              {userName?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#2a2a2a]">{userName || "User"}</span>
              <span className="text-xs text-[#888]">Student</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-red-500/10 text-[#888] hover:text-red-500 transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
