"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Plus,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { TutorSession } from "@/lib/api";

interface Props {
  sessions: TutorSession[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onArchiveSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
}

export default function TutorSessionSidebar({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onArchiveSession,
  onRenameSession,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(true);

  const startRename = (session: TutorSession) => {
    setEditingId(session.session_id);
    setEditTitle(session.title);
  };

  const saveRename = (sessionId: string) => {
    if (editTitle.trim()) {
      onRenameSession(sessionId, editTitle.trim());
    }
    setEditingId(null);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  // Get active session title for collapsed view
  const activeSession = sessions.find(s => s.session_id === activeSessionId);
  const activeTitle = activeSession?.title || "Chat";

  // Sidebar with dedicated toggle button on the right side
  return (
    <div className="relative h-full flex">
      {/* Collapsed state - just show toggle button */}
      {isCollapsed ? (
        <div className="flex flex-col h-full w-10 border-l border-gray-200 bg-white">
          <div className="p-1.5 flex flex-col items-center gap-2">
            <button
              onClick={() => setIsCollapsed(false)}
              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              title="Show chat history"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <button
              onClick={onNewChat}
              className="w-7 h-7 rounded-lg bg-[#6B7F6B] hover:bg-[#5a6d5a] flex items-center justify-center text-white transition-colors"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {/* Session icons */}
          <div className="flex-1 overflow-hidden py-1">
            <div className="flex flex-col items-center gap-1">
              {sessions.slice(0, 8).map((session) => {
                const isActive = session.session_id === activeSessionId;
                return (
                  <button
                    key={session.session_id}
                    onClick={() => onSelectSession(session.session_id)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-[#6B7F6B] text-white"
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                    title={session.title || "Chat"}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Expanded state - full sidebar */
        <div className="flex flex-col h-full w-56 border-l border-gray-200 bg-white">
          {/* Header with Collapse Toggle */}
          <div className="p-2 border-b border-gray-200 flex items-center gap-2">
        <Button
          onClick={onNewChat}
          className="flex-1 justify-start gap-2 bg-[#B8C3C9] hover:bg-[#8a9ba3] text-white"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
        <Button
          onClick={() => setIsCollapsed(true)}
          size="icon"
          className="w-9 h-9 bg-[#D6CFC2] hover:bg-[#B8C3C9] text-[#4a5568] shrink-0"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.length === 0 && (
            <div className="text-sm text-[#666] text-center py-8 px-2">
              No chats yet. Start a new conversation!
            </div>
          )}

          {sessions.map((session) => {
            const isActive = session.session_id === activeSessionId;
            const isEditing = editingId === session.session_id;

            return (
              <div
                key={session.session_id}
                onClick={() => !isEditing && onSelectSession(session.session_id)}
                className={`
                  group relative flex items-start gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer
                  transition-colors
                  ${
                    isActive
                      ? "bg-[#B8C3C9]/30 border border-[#B8C3C9]/50 text-[#2a2a2a]"
                      : "text-[#666] hover:bg-white/50 hover:text-[#2a2a2a]"
                  }
                `}
              >
                <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 opacity-60" />

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-7 text-xs py-0 bg-white border-[#D6CFC2]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(session.session_id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 hover:bg-[#B8C3C9]/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveRename(session.session_id);
                        }}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 hover:bg-red-500/10 hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(null);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="truncate font-medium leading-tight">
                        {session.title || "New Chat"}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5 text-xs opacity-50">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(session.updated_at)}</span>
                        {session.message_count > 0 && (
                          <span>· {session.message_count} msgs</span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {!isEditing && (
                  <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-60 hover:opacity-100 hover:bg-[#B8C3C9]/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(session);
                      }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-60 hover:opacity-100 text-red-500 hover:bg-red-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveSession(session.session_id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
        </div>
      )}
    </div>
  );
}
