"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, X, Send, HelpCircle, Lightbulb } from "lucide-react";

interface TextSelectionPopupProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onSendToChat: (selectedText: string, question?: string) => void;
}

interface PopupState {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
}

export default function TextSelectionPopup({
  containerRef,
  onSendToChat,
}: TextSelectionPopupProps) {
  const [popup, setPopup] = useState<PopupState>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: "",
  });
  const [showQuestionInput, setShowQuestionInput] = useState(false);
  const [question, setQuestion] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length > 2 && selectedText.length < 500) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();

      if (rect && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        
        // Position popup above the selection
        setPopup({
          visible: true,
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top - containerRect.top - 10,
          selectedText,
        });
        setShowQuestionInput(false);
        setQuestion("");
      }
    }
  }, [containerRef]);

  // Close popup when clicking outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
      setPopup((prev) => ({ ...prev, visible: false }));
      setShowQuestionInput(false);
    }
  }, []);

  // Close on escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setPopup((prev) => ({ ...prev, visible: false }));
      setShowQuestionInput(false);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef, handleMouseUp, handleClickOutside, handleKeyDown]);

  // Focus input when showing question input
  useEffect(() => {
    if (showQuestionInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showQuestionInput]);

  const handleQuickAsk = (type: "explain" | "example" | "custom") => {
    if (type === "custom") {
      setShowQuestionInput(true);
    } else {
      const prefix = type === "explain" 
        ? "Can you explain this in simpler terms: " 
        : "Can you give me an example of: ";
      onSendToChat(popup.selectedText, prefix + `"${popup.selectedText}"`);
      setPopup((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleSendWithQuestion = () => {
    if (question.trim()) {
      onSendToChat(popup.selectedText, `Regarding "${popup.selectedText}": ${question}`);
    } else {
      onSendToChat(popup.selectedText, `I don't understand this: "${popup.selectedText}". Can you help me?`);
    }
    setPopup((prev) => ({ ...prev, visible: false }));
    setShowQuestionInput(false);
    setQuestion("");
  };

  if (!popup.visible) return null;

  return (
    <div
      ref={popupRef}
      className="absolute z-50 transform -translate-x-1/2 -translate-y-full"
      style={{
        left: popup.x,
        top: popup.y,
      }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-[#D6CFC2] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
        {!showQuestionInput ? (
          <>
            {/* Header */}
            <div className="px-3 py-2 bg-[#F7F5F0] border-b border-[#E7E2D7] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#6B7F6B]" />
                <span className="text-[10px] font-medium text-[#4a5568]">Ask about selection</span>
              </div>
              <button
                onClick={() => setPopup((prev) => ({ ...prev, visible: false }))}
                className="p-0.5 rounded hover:bg-[#E7E2D7] text-[#888] transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Selected text preview */}
            <div className="px-3 py-2 border-b border-[#E7E2D7]">
              <p className="text-[10px] text-[#888] mb-1">Selected:</p>
              <p className="text-xs text-[#4a5568] line-clamp-2 italic">
                "{popup.selectedText.length > 80 
                  ? popup.selectedText.substring(0, 80) + "..." 
                  : popup.selectedText}"
              </p>
            </div>

            {/* Quick actions */}
            <div className="p-2 flex flex-col gap-1.5">
              <button
                onClick={() => handleQuickAsk("explain")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#6B7F6B]/10 hover:bg-[#6B7F6B]/20 text-[#4a5568] text-xs font-medium transition-colors text-left"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#6B7F6B]" />
                Explain this simply
              </button>
              <button
                onClick={() => handleQuickAsk("example")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#B8C3C9]/20 hover:bg-[#B8C3C9]/30 text-[#4a5568] text-xs font-medium transition-colors text-left"
              >
                <Lightbulb className="w-3.5 h-3.5 text-[#8a9ba3]" />
                Give me an example
              </button>
              <button
                onClick={() => handleQuickAsk("custom")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#E7E2D7] hover:bg-[#D6CFC2] text-[#4a5568] text-xs font-medium transition-colors text-left"
              >
                <Send className="w-3.5 h-3.5 text-[#666]" />
                Ask my own question...
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Custom question input */}
            <div className="px-3 py-2 bg-[#F7F5F0] border-b border-[#E7E2D7] flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium text-[#4a5568]">Your question</span>
              <button
                onClick={() => setShowQuestionInput(false)}
                className="p-0.5 rounded hover:bg-[#E7E2D7] text-[#888] transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            
            <div className="p-3">
              <p className="text-[10px] text-[#888] mb-2">
                About: <span className="italic">"{popup.selectedText.substring(0, 40)}..."</span>
              </p>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendWithQuestion();
                    }
                  }}
                  placeholder="What would you like to know?"
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#D6CFC2] bg-white focus:outline-none focus:ring-2 focus:ring-[#6B7F6B]/30 focus:border-[#6B7F6B]"
                />
                <button
                  onClick={handleSendWithQuestion}
                  className="px-3 py-2 rounded-lg bg-[#6B7F6B] hover:bg-[#5a6e5a] text-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Arrow pointer */}
        <div className="absolute left-1/2 -bottom-2 transform -translate-x-1/2">
          <div className="w-3 h-3 bg-white border-r border-b border-[#D6CFC2] transform rotate-45" />
        </div>
      </div>
    </div>
  );
}
