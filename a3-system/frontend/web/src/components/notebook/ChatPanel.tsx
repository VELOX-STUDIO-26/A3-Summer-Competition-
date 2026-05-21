"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import MermaidRenderer from "@/components/MermaidRenderer";
import ImageUpload from "@/components/tutor/ImageUpload";
import { FaithfulnessBadge } from "@/components/FaithfulnessBadge";
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
  Sparkles,
} from "lucide-react";

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

interface ChatPanelProps {
  messages: Message[];
  inputValue: string;
  setInputValue: (value: string) => void;
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
}

export default function ChatPanel({
  messages,
  inputValue,
  setInputValue,
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
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="flex-1 flex flex-col bg-transparent relative z-10 min-w-0">
      {/* Mobile Navigation Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#F7F5F0] border-b border-[#D6CFC2] shrink-0">
        <button
          onClick={onOpenLeftPanel}
          className="p-2 rounded-lg hover:bg-[#E7E2D7] text-[#666] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#B8C3C9]" />
          <span className="font-semibold text-[#2a2a2a]">A3 Learning</span>
        </div>
        <button
          onClick={onOpenRightPanel}
          className="p-2 rounded-lg hover:bg-[#E7E2D7] text-[#666] transition-colors"
          aria-label="Open resources"
        >
          <PanelRight className="w-6 h-6" />
        </button>
      </div>

      {/* Chat Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#D6CFC2] flex items-center justify-between bg-[#F7F5F0]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#B8C3C9] to-[#8a9ba3] flex items-center justify-center shadow-md shadow-[#B8C3C9]/30">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#8a9ba3] border-2 border-[#F7F5F0] flex items-center justify-center">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-pulse" />
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-[#2a2a2a] text-base sm:text-lg">A3 AI Tutor</h2>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm text-[#666]">Teaching:</span>
              <span className="text-xs sm:text-sm text-[#4a5568] font-medium truncate">
                {currentTopic}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded-full bg-[#C9D2D6]/30 border border-[#B8C3C9]/50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#8a9ba3] animate-pulse" />
            <span className="text-xs text-[#4a5568] font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {/* Loading indicator when switching sessions */}
          {isLoadingSessions && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-[#8a9ba3]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading messages...</span>
              </div>
            </div>
          )}

          {!isLoadingSessions && messages.length === 0 && activeSessionId && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#B8C3C9]/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-[#8a9ba3]" />
              </div>
              <h3 className="text-lg font-medium text-[#2a2a2a] mb-2">Start a conversation</h3>
              <p className="text-sm text-[#666] max-w-sm">
                Ask me anything about {currentTopic} and I'll help you learn!
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-2 sm:p-4 border-t border-[#D6CFC2] bg-[#F7F5F0]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-2 sm:px-0">
          {/* Image preview above input */}
          {imagePreview && selectedImage && (
            <div className="mb-3 flex items-center gap-2">
              <div className="relative inline-block">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#D6CFC2] bg-[#F7F5F0]">
                  <img src={imagePreview} alt="Selected" className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                  type="button"
                  title="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs text-[#666] truncate max-w-[200px]">{selectedImage.name}</span>
            </div>
          )}

          <div className="flex gap-2 items-center p-2 rounded-2xl bg-white border border-[#D6CFC2] focus-within:border-[#B8C3C9] focus-within:shadow-md transition-all duration-300">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isSending || isLoading
                  ? "AI is responding..."
                  : `Ask me anything about ${currentTopic}...`
              }
              disabled={isSending || isLoading}
              className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-[#2a2a2a] placeholder:text-[#999] text-sm disabled:opacity-60"
            />

            {/* Action Buttons Group */}
            <div className="flex items-center gap-1.5 pr-1">
              {/* Image Upload - hidden during streaming */}
              {!isSending && !isLoading && (
                <ImageUpload
                  onImageSelected={(file, preview) => {
                    setSelectedImage(file);
                    setImagePreview(preview);
                  }}
                  onClear={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  selectedImage={selectedImage}
                  imagePreview={imagePreview}
                  disabled={voice.isStreaming || voice.isConnecting}
                />
              )}

              {/* Language Toggle - hidden during streaming */}
              {!isSending && !isLoading && (
                <Button
                  onClick={() => setAsrLanguage(asrLanguage === "en_us" ? "zh_cn" : "en_us")}
                  disabled={voice.isStreaming || voice.isConnecting}
                  size="sm"
                  title={asrLanguage === "en_us" ? "Switch to Chinese" : "Switch to English"}
                  className="rounded-lg shadow-sm transition-all h-9 px-2.5 text-xs font-medium bg-[#F4F1EC] hover:bg-[#E7E2D7] text-[#5a5a5a] border border-[#D6CFC2]"
                >
                  {asrLanguage === "en_us" ? "EN" : "中"}
                </Button>
              )}

              {/* Voice Button - hidden during streaming */}
              {!isSending && !isLoading && (
                <Button
                  onClick={voice.toggle}
                  disabled={voice.isConnecting}
                  size="sm"
                  title={
                    voice.isStreaming
                      ? "Stop recording"
                      : voice.isConnecting
                      ? "Connecting..."
                      : "Record voice question"
                  }
                  aria-label={voice.isStreaming ? "Stop recording" : "Start recording"}
                  aria-pressed={voice.isStreaming}
                  className={`rounded-lg shadow-sm transition-all h-9 w-9 p-0 ${
                    voice.isStreaming
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-500/30"
                      : "bg-[#E7E2D7] hover:bg-[#D6CFC2] text-[#5a5a5a] border border-[#D6CFC2]"
                  }`}
                >
                  {voice.isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : voice.isStreaming ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
              )}

              {/* Divider */}
              <div className="w-px h-6 bg-[#D6CFC2] mx-1" />

              {/* Send / Stop Button */}
              {isSending || isLoading ? (
                <Button
                  onClick={onStopStream}
                  size="sm"
                  title="Stop generating"
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md shadow-red-500/30 transition-all h-9 w-9 p-0 animate-pulse"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  onClick={onSendMessage}
                  disabled={(!inputValue.trim() && !selectedImage) || voice.isStreaming}
                  size="sm"
                  title="Send message"
                  className="bg-[#6B7F6B] hover:bg-[#5a6d5a] text-white font-semibold rounded-lg shadow-md shadow-[#6B7F6B]/30 transition-all h-9 w-9 p-0 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Status text */}
          <StatusText
            voice={voice}
            asrLanguage={asrLanguage}
            isLoading={isLoading}
            isSending={isSending}
            isAnalyzingImage={isAnalyzingImage}
          />
        </div>
      </div>
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
          <div className="mb-3 rounded-xl overflow-hidden border border-[#D6CFC2] bg-[#F7F5F0] max-w-md">
            <img
              src={message.imageUrl}
              alt="Uploaded"
              className="w-full h-auto max-h-64 object-contain"
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
                className="bg-[#2a2a2a] rounded-xl p-3 my-2 overflow-x-auto border border-[#444] scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <code className="text-white text-xs font-mono">{code}</code>
              </pre>
            );
          }

          // Enhanced markdown rendering
          let html = part
            .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-[#4a5568] mt-3 mb-1">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-[#4a5568] mt-4 mb-2">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-[#4a5568] mt-4 mb-2">$1</h1>')
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="text-[#4a5568] italic">$1</strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#4a5568]">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="text-[#555]">$1</em>')
            .replace(/`([^`]+)`/g, '<code class="bg-[#E7E2D7] text-[#4a5568] px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
            .replace(/^[-•]\s+(.+)$/gm, '<li class="flex items-start gap-2 py-0.5 leading-snug"><span class="text-[#8a9ba3] mt-1">•</span><span class="text-[#444]">$1</span></li>')
            .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="flex items-start gap-2 py-0.5 leading-snug"><span class="text-[#8a9ba3] font-semibold min-w-[1.2rem]">$1.</span><span class="text-[#444]">$2</span></li>')
            .replace(/\n\n/g, '</p><p class="mt-2">')
            .replace(/\n/g, "<br/>");

          if (html.includes("<li")) {
            html = html.replace(/((?:<li[\s\S]*?<\/li>\s*)+)/g, '<ul class="space-y-0 my-1">$&</ul>');
          }

          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        })}

        {/* Typing indicator inside the same bubble */}
        {message.isStreaming && <ThinkingDots className="ml-1" />}
      </>
    );
  };

  return (
    <div className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          message.role === "user"
            ? "bg-[#D6CFC2]"
            : "bg-[#B8C3C9] shadow-md shadow-[#B8C3C9]/30"
        }`}
      >
        {message.role === "user" ? (
          <User className="w-4 h-4 text-[#555]" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      <div
        className={cn(
          "p-4 rounded-2xl max-w-[90%] sm:max-w-[85%] md:max-w-[80%]",
          message.role === "user"
            ? "bg-[#E7E2D7] border border-[#D6CFC2]"
            : "bg-white border border-[#D6CFC2] shadow-sm"
        )}
      >
        <div className="text-sm prose prose-sm max-w-none chat-message text-[#2a2a2a] min-h-[1.5em]">
          {renderContent()}
        </div>
        {/* Faithfulness Badge for assistant messages */}
        {message.role === "assistant" && message.faithfulness && (
          <div className="mt-2 pt-2 border-t border-[#D6CFC2]/50">
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
    return <p className="text-center text-xs text-red-500 mt-2">Mic error: check console</p>;
  }
  if (isAnalyzingImage) {
    return (
      <p className="text-center text-xs text-[#8a9ba3] mt-2 animate-pulse">📷 Analyzing image...</p>
    );
  }
  if (isLoading || isSending) {
    return (
      <p className="text-center text-xs text-[#8a9ba3] mt-2 animate-pulse">
        ✨ AI is responding... Press{" "}
        <kbd className="px-1 py-0.5 bg-[#E7E2D7] rounded text-[10px]">Enter</kbd> or click the stop
        button to cancel
      </p>
    );
  }
  if (voice.isStreaming) {
    return (
      <p className="text-center text-xs text-red-500 mt-2 animate-pulse">
        ● Listening ({asrLanguage === "en_us" ? "English" : "中文"}) — click mic to stop
      </p>
    );
  }
  if (voice.isConnecting) {
    return <p className="text-center text-xs text-[#999] mt-2">Connecting to speech service...</p>;
  }
  return (
    <p className="text-center text-xs text-[#999] mt-2">
      Press Enter to send • Upload images • Record voice
    </p>
  );
}
