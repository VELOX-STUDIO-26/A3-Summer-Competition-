"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, HelpCircle, Lightbulb } from "lucide-react";

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
  const popupRef = useRef<HTMLDivElement>(null);

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
      }
    }
  }, [containerRef]);

  // Close popup when clicking outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
      setPopup((prev) => ({ ...prev, visible: false }));
    }
  }, []);

  // Close on escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setPopup((prev) => ({ ...prev, visible: false }));
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

  const handleQuickAsk = (type: "explain" | "example" | "custom") => {
    if (type === "explain") {
      onSendToChat(popup.selectedText, `Can you explain this in simpler terms: "${popup.selectedText}"`);
    } else if (type === "example") {
      onSendToChat(popup.selectedText, `Can you give me an example of: "${popup.selectedText}"`);
    } else {
      // "Ask in chat" - just pass selected text, no question (will pre-fill input)
      onSendToChat(popup.selectedText);
    }
    setPopup((prev) => ({ ...prev, visible: false }));
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
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 min-w-[180px]">
        {/* Selected text preview */}
        <div className="px-3 py-2 border-b border-gray-100">
          <p className="text-xs text-gray-600 line-clamp-2">
            "{popup.selectedText.length > 50 
              ? popup.selectedText.substring(0, 50) + "..." 
              : popup.selectedText}"
          </p>
        </div>

        {/* Quick actions */}
        <div className="p-1 flex flex-col">
          <button
            onClick={() => handleQuickAsk("explain")}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-gray-50 text-gray-700 text-xs transition-colors text-left"
          >
            <Lightbulb className="w-3.5 h-3.5 text-gray-400" />
            Explain simply
          </button>
          <button
            onClick={() => handleQuickAsk("example")}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-gray-50 text-gray-700 text-xs transition-colors text-left"
          >
            <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
            Give example
          </button>
          <button
            onClick={() => handleQuickAsk("custom")}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-gray-50 text-gray-700 text-xs transition-colors text-left"
          >
            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
            Ask in chat
          </button>
        </div>

        {/* Arrow pointer */}
        <div className="absolute left-1/2 -bottom-1.5 transform -translate-x-1/2">
          <div className="w-2.5 h-2.5 bg-white border-r border-b border-gray-200 transform rotate-45" />
        </div>
      </div>
    </div>
  );
}
