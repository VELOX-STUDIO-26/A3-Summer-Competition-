"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MermaidRenderer from "@/components/MermaidRenderer";
import ImageUpload from "@/components/tutor/ImageUpload";
import { FaithfulnessBadge } from "@/components/FaithfulnessBadge";
import TextSelectionPopup from "./TextSelectionPopup";
import {
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Loader2,
  X,
  Square,
  Menu,
  PanelRight,
  MessageSquare,
  GraduationCap,
  MoreVertical,
  ImagePlus,
  Languages,
  PanelRightClose,
  Plus,
  History,
  Settings,
  Trash2,
  Paperclip,
} from "lucide-react";
import Image from "next/image";

interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  imageUrl?: string;
  faithfulness?: {
    score: number;
    verified: boolean;
    total_claims: number;
    supported_claims: number;
    unverifiable_claims: number;
    citations?: string[];
  };
}

interface TutorSession {
  session_id: string;
  title: string;
  created_at: string | null;
  updated_at: string | null;
}

interface ChatPanelProps {
  messages: Message[];
  inputValue: string;
  setInputValue: (value: string) => void;
  quotedText?: string | null;
  onClearQuote?: () => void;
  isLoading: boolean;
  isSending: boolean;
  isLoadingSessions: boolean;
  currentTopic: string;
  activeSessionId: string | null;
  onSendMessage: () => void;
  onStopStream: () => void;
  // Voice
  voice: {
    isStreaming: boolean;
    isConnecting: boolean;
    isError: boolean;
    toggle: () => void;
  };
  asrLanguage: "en_us" | "zh_cn";
  setAsrLanguage: (lang: "en_us" | "zh_cn") => void;
  // Image
  selectedImage: File | null;
  imagePreview: string | null;
  setSelectedImage: (file: File | null) => void;
  setImagePreview: (preview: string | null) => void;
  isAnalyzingImage: boolean;
  // Mobile
  onOpenLeftPanel: () => void;
  onOpenRightPanel: () => void;
  // Rating prompt
  ratingPrompt?: React.ReactNode;
  // Text selection to ask AI
  onSendToChat?: (selectedText: string, question?: string) => void;
  // Sidebar mode (fixed width like left panel)
  isSidebar?: boolean;
  // Collapse callback (when parent controls collapse state)
  onCollapse?: () => void;
  // Resizable width
  width?: number;
  onWidthChange?: (width: number) => void;
  // Session management
  sessions?: TutorSession[];
  onNewChat?: () => void;
  onSelectSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onClearChat?: () => void;
}

export default function ChatPanel({
  messages,
  inputValue,
  setInputValue,
  quotedText,
  onClearQuote,
  isLoading,
  isSending,
  isLoadingSessions,
  currentTopic,
  activeSessionId,
  onSendMessage,
  onStopStream,
  voice,
  asrLanguage,
  setAsrLanguage,
  selectedImage,
  imagePreview,
  setSelectedImage,
  setImagePreview,
  isAnalyzingImage,
  onOpenLeftPanel,
  onOpenRightPanel,
  ratingPrompt,
  onSendToChat,
  isSidebar = false,
  onCollapse,
  width,
  onWidthChange,
  sessions = [],
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onClearChat,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onWidthChange) return;
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width || 384;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(Math.max(startWidthRef.current + delta, 320), 600);
      onWidthChange(newWidth);
    };
    
    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isSending || isLoading) {
        onStopStream();
      } else {
        onSendMessage();
      }
    }
  };
  
  const formatDate = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div 
      className={`flex flex-col bg-white relative z-10 shrink-0 overflow-hidden ${isSidebar ? "border-l border-gray-200" : "flex-1 min-w-0"}`}
      style={isSidebar && width ? { width: `${width}px` } : isSidebar ? { width: '384px' } : undefined}
    >
      {/* Resize Handle */}
      {isSidebar && onWidthChange && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-20 group hover:bg-gray-300 transition-colors"
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gray-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
      {/* Mobile Navigation Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={onOpenLeftPanel}
          className="p-2 rounded-lg hover:bg-[#E7E2D7] text-[#666] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-[#B8C3C9]" />
          <span className="font-semibold text-[#2a2a2a]">NOBOGYAN</span>
        </div>
        <button
          onClick={onOpenRightPanel}
          className="p-2 rounded-lg hover:bg-[#E7E2D7] text-[#666] transition-colors"
          aria-label="Open resources"
        >
          <PanelRight className="w-6 h-6" />
        </button>
      </div>

      {/* Chat Header - Clean */}
      <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-gray-600" />
          </div>
          <div className="min-w-0">
            <h2 className="font-medium text-gray-900 text-xl">NoboGyan</h2>
            <p className="text-lg text-gray-500 truncate max-w-[200px]">
              {currentTopic}
            </p>
          </div>
        </div>
        
        {/* Header Actions */}
        <div className="flex items-center gap-1">
          {/* Three-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg rounded-lg">
              {onNewChat && (
                <DropdownMenuItem onClick={onNewChat} className="cursor-pointer py-2 hover:bg-gray-50">
                  <Plus className="w-4 h-4 mr-2 text-gray-500" />
                  New conversation
                </DropdownMenuItem>
              )}
              {sessions.length > 0 && (
                <DropdownMenuItem onClick={() => setShowSessionsModal(true)} className="cursor-pointer py-2 hover:bg-gray-50">
                  <History className="w-4 h-4 mr-2 text-gray-500" />
                  View sessions ({sessions.length})
                </DropdownMenuItem>
              )}
              {onClearChat && messages.length > 0 && (
                <DropdownMenuItem onClick={onClearChat} className="cursor-pointer py-2 hover:bg-gray-50 text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear chat
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Collapse button - only in sidebar mode */}
          {isSidebar && onCollapse && (
            <button
              onClick={onCollapse}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div 
          ref={messagesContainerRef}
          className="relative space-y-4 p-4"
        >
          {/* Text Selection Popup for chat messages */}
          {onSendToChat && (
            <TextSelectionPopup
              containerRef={messagesContainerRef}
              onSendToChat={onSendToChat}
            />
          )}

          {/* Loading indicator when switching sessions */}
          {isLoadingSessions && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            </div>
          )}

          {!isLoadingSessions && messages.length === 0 && activeSessionId && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-2xl font-medium text-gray-800 mb-2">Start a conversation</h3>
              <p className="text-xl text-gray-500 max-w-xs">
                Ask me anything about {currentTopic}
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Rating Prompt */}
      {ratingPrompt && (
        <div className="px-4 max-w-3xl mx-auto">
          {ratingPrompt}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-100 bg-white shrink-0">
        <div className="max-w-3xl mx-auto">
          {/* Quoted text context - like ChatGPT/Claude */}
          {quotedText && (
            <div className="mb-2 flex items-start gap-2 p-2 bg-gray-50 rounded-lg border-l-2 border-gray-300">
              <div className="flex-1 min-w-0">
                <p className="text-lg text-gray-500 mb-1">Asking about:</p>
                <p className="text-xl text-gray-700 line-clamp-2">"{quotedText}"</p>
              </div>
              <button
                onClick={onClearQuote}
                className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Image preview above input */}
          {imagePreview && selectedImage && (
            <div className="mb-2 flex items-center gap-2">
              <div className="relative inline-block">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  <img src={imagePreview} alt="Selected" className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                  type="button"
                  title="Remove"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
              <span className="text-xs text-gray-500 truncate max-w-[150px]">{selectedImage.name}</span>
            </div>
          )}

          <div className="flex gap-2 items-center p-1.5 rounded-xl bg-gray-50 border border-gray-200 transition-all focus-within:border-gray-200">
            {/* Attachment button */}
            {!isSending && !isLoading && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors shrink-0"
                  title="Attach"
                >
                  <Paperclip className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44 bg-white border border-gray-200 shadow-lg rounded-lg">
                  <DropdownMenuItem
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setSelectedImage(file);
                            setImagePreview(ev.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    disabled={voice.isStreaming || voice.isConnecting}
                    className="cursor-pointer py-2 hover:bg-gray-50"
                  >
                    <ImagePlus className="w-4 h-4 mr-2 text-gray-500" />
                    Upload image
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={voice.toggle}
                    disabled={voice.isConnecting}
                    className="cursor-pointer py-2 hover:bg-gray-50"
                  >
                    {voice.isStreaming ? (
                      <>
                        <MicOff className="w-4 h-4 mr-2 text-red-500" />
                        Stop recording
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 mr-2 text-gray-500" />
                        Record voice
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isSending || isLoading
                  ? "AI is responding..."
                  : "Ask anything..."
              }
              disabled={isSending || isLoading}
              className="chat-input-no-focus flex-1 bg-transparent border-0 focus-visible:ring-0 focus:ring-0 focus:outline-none ring-0 outline-none shadow-none focus:border-0 text-gray-900 placeholder:text-gray-400 text-xl disabled:opacity-60 h-12"
            />

            {/* Send / Stop Button */}
            {isSending || isLoading ? (
              <button
                onClick={onStopStream}
                title="Stop"
                className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shrink-0"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            ) : (
              <button
                onClick={onSendMessage}
                disabled={(!inputValue.trim() && !selectedImage) || voice.isStreaming}
                title="Send"
                className="w-8 h-8 rounded-lg bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status text - simplified */}
          <StatusText
            voice={voice}
            asrLanguage={asrLanguage}
            isLoading={isLoading}
            isSending={isSending}
            isAnalyzingImage={isAnalyzingImage}
          />
        </div>
      </div>
      
      {/* Sessions Modal */}
      {showSessionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowSessionsModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-sm mx-4 max-h-[70vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Chat Sessions</h3>
              <button
                onClick={() => setShowSessionsModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-2">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No sessions yet
                </div>
              ) : (
                <div className="space-y-1">
                  {sessions.map((session) => {
                    const isActive = session.session_id === activeSessionId;
                    return (
                      <div
                        key={session.session_id}
                        className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors ${
                          isActive 
                            ? "bg-gray-900 text-white" 
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <button
                          onClick={() => {
                            onSelectSession?.(session.session_id);
                            setShowSessionsModal(false);
                          }}
                          className="flex-1 flex items-center gap-2 text-left min-w-0"
                        >
                          <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-gray-400"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{session.title || "Untitled"}</p>
                            <p className={`text-xs ${isActive ? "text-gray-300" : "text-gray-400"}`}>
                              {formatDate(session.updated_at || session.created_at)}
                            </p>
                          </div>
                        </button>
                        {onDeleteSession && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this session?")) {
                                onDeleteSession(session.session_id);
                              }
                            }}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                              isActive 
                                ? "hover:bg-white/20 text-white" 
                                : "hover:bg-gray-200 text-gray-400 hover:text-red-500"
                            }`}
                            title="Delete session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer */}
            {onNewChat && (
              <div className="px-3 py-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    onNewChat();
                    setShowSessionsModal(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New conversation
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: Message }) {
  const renderContent = () => {
    // Show loading state when streaming but no content yet
    if (message.isStreaming && (!message.content || message.content.trim() === "")) {
      return (
        <div className="flex items-center gap-2 text-[#8a9ba3] px-1">
          <span className="text-sm">Thinking</span>
          <ThinkingDots />
        </div>
      );
    }

    if (!message.content || message.content.trim() === "") {
      if (message.role === "assistant") {
        return (
          <div className="flex items-center gap-2 text-[#8a9ba3] px-1">
            <span className="text-sm">Thinking</span>
            <ThinkingDots />
          </div>
        );
      }
      return null;
    }

    return (
      <>
        {/* Show image if present */}
        {message.imageUrl && (
          <div className="mb-2 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 max-w-[200px]">
            <img
              src={message.imageUrl}
              alt="Uploaded"
              className="w-full h-auto max-h-48 object-contain"
            />
          </div>
        )}

        {message.content.split("```").map((part, i) => {
          if (i % 2 === 1) {
            const firstNewline = part.indexOf("\n");
            const lang = firstNewline > -1 ? part.substring(0, firstNewline).trim().toLowerCase() : "";
            const code = firstNewline > -1 ? part.substring(firstNewline + 1) : part;

            // Handle mermaid diagrams
            if (lang === "mermaid") {
              return <MermaidRenderer key={i} chart={code.trim()} />;
            }

            // Handle regular code blocks
            return (
              <pre
                key={i}
                className="bg-gray-900 rounded-md p-2 my-1.5 overflow-x-auto text-[10px]"
                style={{ scrollbarWidth: "thin" }}
              >
                <code className="text-gray-100 font-mono whitespace-pre-wrap break-all">{code}</code>
              </pre>
            );
          }

          // Parse and render markdown tables
          const renderMarkdownWithTables = (text: string): string => {
            // Split by lines to find table blocks
            const lines = text.split('\n');
            const result: string[] = [];
            let tableLines: string[] = [];
            let inTable = false;

            for (let j = 0; j < lines.length; j++) {
              const line = lines[j];
              const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');
              const isSeparator = /^\|[\s\-:|]+\|$/.test(line.trim());

              if (isTableRow || isSeparator) {
                if (!inTable) inTable = true;
                tableLines.push(line);
              } else {
                if (inTable && tableLines.length > 0) {
                  // Convert table lines to HTML
                  result.push(convertTableToHtml(tableLines));
                  tableLines = [];
                  inTable = false;
                }
                result.push(line);
              }
            }

            // Handle table at end of text
            if (tableLines.length > 0) {
              result.push(convertTableToHtml(tableLines));
            }

            return result.join('\n');
          };

          const convertTableToHtml = (tableLines: string[]): string => {
            if (tableLines.length < 2) return tableLines.join('\n');

            const rows = tableLines.map(line => 
              line.split('|').slice(1, -1).map(cell => cell.trim())
            );

            // Find separator row (contains only -, :, |, spaces)
            const sepIdx = rows.findIndex(row => 
              row.every(cell => /^[\s\-:]+$/.test(cell) || cell === '')
            );

            const headerRows = sepIdx > 0 ? rows.slice(0, sepIdx) : [rows[0]];
            const bodyRows = sepIdx > 0 ? rows.slice(sepIdx + 1) : rows.slice(1);

            let html = '<div class="overflow-x-auto my-3"><table class="min-w-full border-collapse text-sm">';
            
            // Header
            html += '<thead class="bg-[#E7E2D7]">';
            for (const row of headerRows) {
              html += '<tr>';
              for (const cell of row) {
                html += `<th class="border border-[#D6CFC2] px-3 py-2 text-left font-semibold text-[#4a5568]">${cell}</th>`;
              }
              html += '</tr>';
            }
            html += '</thead>';

            // Body
            html += '<tbody>';
            for (let r = 0; r < bodyRows.length; r++) {
              const row = bodyRows[r];
              const bgClass = r % 2 === 0 ? 'bg-white' : 'bg-[#F7F5F0]';
              html += `<tr class="${bgClass}">`;
              for (const cell of row) {
                html += `<td class="border border-[#D6CFC2] px-3 py-2 text-[#444]">${cell}</td>`;
              }
              html += '</tr>';
            }
            html += '</tbody></table></div>';

            return html;
          };

          // First convert tables, then apply other markdown
          let html = renderMarkdownWithTables(part);
          
          // Enhanced markdown rendering (skip table HTML)
          html = html
            .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold text-[#4a5568] mt-4 mb-2">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-semibold text-[#4a5568] mt-5 mb-3">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-[#4a5568] mt-5 mb-3">$1</h1>')
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="text-[#4a5568] italic">$1</strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#4a5568]">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="text-[#555]">$1</em>')
            .replace(/`([^`]+)`/g, '<code class="bg-[#E7E2D7] text-[#4a5568] px-2 py-1 rounded text-lg font-mono">$1</code>')
            .replace(/^[-•]\s+(.+)$/gm, '<li class="flex items-start gap-2.5 leading-relaxed text-lg"><span class="text-[#8a9ba3]">•</span><span class="text-[#444]">$1</span></li>')
            .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="flex items-start gap-2.5 leading-relaxed text-lg"><span class="text-[#8a9ba3] font-semibold min-w-[1.75rem]">$1.</span><span class="text-[#444]">$2</span></li>');

          // Wrap consecutive list items in ul before handling line breaks
          if (html.includes("<li")) {
            html = html.replace(/((?:<li[\s\S]*?<\/li>\s*)+)/g, '<ul class="space-y-0.5 my-1 pl-0">$&</ul>');
          }

          // Handle paragraphs and line breaks (but not inside table HTML or lists)
          if (!html.includes('<table')) {
            // Remove line breaks between list items (they're already in a ul)
            html = html.replace(/<\/li>\s*\n+\s*<li/g, '</li><li');
            html = html
              .replace(/\n\n/g, '</p><p class="mt-1.5">')
              .replace(/\n(?!<)/g, "<br/>");
          } else {
            html = html.replace(/\n\n(?![^<]*<\/table>)/g, '</p><p class="mt-1.5">');
          }

          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        })}

        {/* Typing indicator inside the same bubble */}
        {message.isStreaming && <ThinkingDots className="ml-1" />}
      </>
    );
  };

  return (
    <div className={`flex gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          message.role === "user"
            ? "bg-gray-200"
            : "bg-gray-100"
        }`}
      >
        {message.role === "user" ? (
          <User className="w-5 h-5 text-gray-600" />
        ) : (
          <GraduationCap className="w-5 h-5 text-gray-600" />
        )}
      </div>
      <div
        className={cn(
          "px-5 py-4 rounded-xl min-w-0 overflow-hidden",
          message.role === "user"
            ? "bg-gray-100 ml-6"
            : "bg-white border border-gray-100 mr-6"
        )}
      >
        <div className="text-lg prose prose-lg max-w-none chat-message text-gray-700 min-h-[1em] break-words overflow-wrap-anywhere leading-relaxed">
          {renderContent()}
        </div>
        {/* Faithfulness Badge for assistant messages */}
        {message.role === "assistant" && message.faithfulness && (
          <div className="mt-1.5 pt-1.5 border-t border-gray-100">
            <FaithfulnessBadge faithfulness={message.faithfulness} size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}

// Thinking Dots Animation
function ThinkingDots({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  );
}

// Status Text Component
function StatusText({
  voice,
  asrLanguage,
  isLoading,
  isSending,
  isAnalyzingImage,
}: {
  voice: { isStreaming: boolean; isConnecting: boolean; isError: boolean };
  asrLanguage: "en_us" | "zh_cn";
  isLoading: boolean;
  isSending: boolean;
  isAnalyzingImage: boolean;
}) {
  if (voice.isError) {
    return <p className="text-center text-xs text-red-500 mt-2">Microphone error</p>;
  }
  if (isAnalyzingImage) {
    return <p className="text-center text-xs text-gray-400 mt-2">Analyzing image...</p>;
  }
  if (isLoading || isSending) {
    return <p className="text-center text-xs text-gray-400 mt-2">AI is responding...</p>;
  }
  if (voice.isStreaming) {
    return (
      <p className="text-center text-xs text-red-500 mt-2">
        ● Listening ({asrLanguage === "en_us" ? "EN" : "中文"})
      </p>
    );
  }
  if (voice.isConnecting) {
    return <p className="text-center text-xs text-gray-400 mt-2">Connecting...</p>;
  }
  return <p className="text-center text-xs text-gray-400 mt-1.5">Enter to send</p>;
}
