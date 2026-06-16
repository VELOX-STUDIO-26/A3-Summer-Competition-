"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send, Database, Layers, Target, Zap, Clock, Settings } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { startChat, sendMessage } from "@/lib/api";

interface Dimension {
  id: string;
  name: string;
  icon: React.ElementType;
  progress: number;
  tags: string[];
}

interface Message {
  id: string;
  role: "ai" | "user";
  content: string;
  tags?: { dimension: string; value: string }[];
}

const dimensionMap: Record<string, { name: string; icon: React.ElementType }> = {
  knowledge_base: { name: "Knowledge Base", icon: Database },
  cognitive_style: { name: "Style", icon: Layers },
  goals: { name: "Goals", icon: Target },
  learning_pace: { name: "Pace", icon: Clock },
  weak_points: { name: "Weak Points", icon: Zap },
  content_preferences: { name: "Preferences", icon: Settings },
};

const initialDimensions: Dimension[] = [
  { id: "knowledge_base", name: "Knowledge Base", icon: Database, progress: 0, tags: [] },
  { id: "cognitive_style", name: "Style", icon: Layers, progress: 0, tags: [] },
  { id: "goals", name: "Goals", icon: Target, progress: 0, tags: [] },
  { id: "learning_pace", name: "Pace", icon: Clock, progress: 0, tags: [] },
  { id: "weak_points", name: "Weak Points", icon: Zap, progress: 0, tags: [] },
  { id: "content_preferences", name: "Preferences", icon: Settings, progress: 0, tags: [] },
];

export default function ProfileChatPage() {
  const router = useRouter();
  const { userName, studentId, setProfile } = useAppStore();
  const [dimensions, setDimensions] = useState<Dimension[]>(initialDimensions);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isBackendAvailable, setIsBackendAvailable] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat session
  useEffect(() => {
    const initSession = async () => {
      // Don't initialize if no studentId (layout will redirect to login)
      if (!studentId) {
        setIsInitializing(false);
        return;
      }

      try {
        const data = await startChat(studentId);
        setSessionId(data.session_id);
        setMessages([{
          id: crypto.randomUUID(),
          role: "ai",
          content: data.first_question,
        }]);

        // Update dimensions from progress
        if (data.progress?.confidence_scores) {
          updateDimensionsFromProgress(data.progress.confidence_scores);
        }
      } catch (error) {
        console.error("Backend not available, using mock mode:", error);
        setIsBackendAvailable(false);
        setMessages([{
          id: crypto.randomUUID(),
          role: "ai",
          content: `Welcome, ${userName || "there"}! I'm your NOBOGYAN learning assistant. To build your personalized path, tell me a bit about your goals and how you prefer to learn.`,
        }]);
      } finally {
        setIsInitializing(false);
      }
    };
    initSession();
  }, [studentId, userName]);

  const updateDimensionsFromProgress = (confidenceScores: Record<string, number>) => {
    setDimensions(prev => prev.map(dim => {
      const score = confidenceScores[dim.id] || 0;
      return { ...dim, progress: Math.min(100, score * 100) };
    }));
  };

  const checkProgress = (status: string, profile?: any) => {
    if (status === "complete") {
      if (profile) {
        setProfile(profile);
      }
      setTimeout(() => {
        router.push("/profile-summary");
      }, 1500);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: userMessage }]);
    setIsTyping(true);

    try {
      if (sessionId) {
        // Use real backend API
        console.log("Sending message to session:", sessionId);
        const data = await sendMessage(sessionId, userMessage);
        console.log("API Response:", data);
        console.log("Progress:", data.progress);
        console.log("Confidence scores:", data.progress?.confidence_scores);

        // Update dimensions from progress
        if (data.progress?.confidence_scores) {
          console.log("Updating dimensions with:", data.progress.confidence_scores);
          updateDimensionsFromProgress(data.progress.confidence_scores);
        } else {
          console.log("No confidence_scores in response");
        }

        // Build extracted tags for display
        const extractedTags = (data.extracted_dimensions || []).map((dim: string) => ({
          dimension: dim.toUpperCase().replace(/_/g, " "),
          value: "Detected",
        }));

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "ai",
            content: data.response,
            tags: extractedTags,
          },
        ]);

        checkProgress(data.status, data.profile);
      } else {
        // Fallback to mock mode
        setIsBackendAvailable(false);
        await handleMockResponse(userMessage);
      }
    } catch (error) {
      console.error("API error, switching to mock mode:", error);
      setIsBackendAvailable(false);
      await handleMockResponse(userMessage);
    } finally {
      setIsTyping(false);
    }
  };

  const handleMockResponse = async (userMessage: string) => {
    await new Promise((r) => setTimeout(r, 1000));
    
    const newDimensions = [...dimensions];
    const extractedTags: { dimension: string; value: string }[] = [];
    const lowerMsg = userMessage.toLowerCase();
    
    // Simple keyword matching for mock mode
    if (lowerMsg.includes("cloud") || lowerMsg.includes("python") || lowerMsg.includes("code")) {
      const dim = newDimensions.find((d) => d.id === "knowledge_base");
      if (dim && dim.progress < 70) {
        dim.progress = Math.min(100, dim.progress + 40);
        extractedTags.push({ dimension: "KNOWLEDGE", value: "Tech Background" });
      }
    }
    if (lowerMsg.includes("video") || lowerMsg.includes("visual")) {
      const dim = newDimensions.find((d) => d.id === "cognitive_style");
      if (dim && dim.progress < 70) {
        dim.progress = Math.min(100, dim.progress + 45);
        extractedTags.push({ dimension: "STYLE", value: "Visual Learner" });
      }
    }
    if (lowerMsg.includes("career") || lowerMsg.includes("learn") || lowerMsg.includes("goal")) {
      const dim = newDimensions.find((d) => d.id === "goals");
      if (dim && dim.progress < 70) {
        dim.progress = Math.min(100, dim.progress + 45);
        extractedTags.push({ dimension: "GOALS", value: "Career Growth" });
      }
    }
    if (lowerMsg.includes("hour") || lowerMsg.includes("week")) {
      const dim = newDimensions.find((d) => d.id === "learning_pace");
      if (dim && dim.progress < 70) {
        dim.progress = Math.min(100, dim.progress + 45);
        extractedTags.push({ dimension: "PACE", value: "Flexible" });
      }
    }
    if (lowerMsg.includes("struggle") || lowerMsg.includes("weak") || lowerMsg.includes("difficult")) {
      const dim = newDimensions.find((d) => d.id === "weak_points");
      if (dim && dim.progress < 70) {
        dim.progress = Math.min(100, dim.progress + 50);
        extractedTags.push({ dimension: "WEAKNESS", value: "Identified" });
      }
    }
    if (lowerMsg.includes("interactive") || lowerMsg.includes("hands-on")) {
      const dim = newDimensions.find((d) => d.id === "content_preferences");
      if (dim && dim.progress < 70) {
        dim.progress = Math.min(100, dim.progress + 40);
        extractedTags.push({ dimension: "PREFERENCES", value: "Interactive" });
      }
    }

    // Add small progress if nothing matched
    if (extractedTags.length === 0) {
      const unfilled = newDimensions.filter((d) => d.progress < 70);
      if (unfilled.length > 0) {
        unfilled[0].progress = Math.min(100, unfilled[0].progress + 20);
      }
    }

    setDimensions(newDimensions);

    // Generate next question based on unfilled dimensions
    const unfilled = newDimensions.filter((d) => d.progress < 70);
    let aiResponse = "";
    
    if (unfilled.length === 0) {
      aiResponse = "Excellent! I have a good understanding of your learning profile now. Let me prepare your personalized summary...";
      setTimeout(() => router.push("/profile-summary"), 1500);
    } else {
      const responses: Record<string, string> = {
        knowledge_base: "What's your current background? Any programming languages or tech topics you're familiar with?",
        cognitive_style: "How do you prefer to learn - through videos, reading documentation, or hands-on projects?",
        goals: "What's your ultimate goal? Career transition, skill upgrade, or personal interest?",
        learning_pace: "How much time can you dedicate to learning each week?",
        weak_points: "Are there any topics you find particularly challenging or want to improve?",
        content_preferences: "Any specific preferences for your learning experience? Interactive exercises, quizzes, or project-based?",
      };
      aiResponse = responses[unfilled[0].id] || "Tell me more about your learning preferences.";
    }
    
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "ai", content: aiResponse, tags: extractedTags }]);
  };

  if (isInitializing) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-white shadow-lg shadow-[#6B7F6B]/30 animate-pulse flex items-center justify-center">
          <Image src="/nobogyan-logo.png" alt="NOBOGYAN" width={48} height={48} className="w-12 h-12" />
        </div>
        <p className="mt-4 text-[#666]">Initializing your session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] flex flex-col justify-center px-4 sm:px-6 pb-6 sm:pb-8">
      {/* Phase Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-[#2a2a2a]">
          Phase 02: <span className="text-[#666]">Initializing Your Profile</span>
        </h1>
      </div>

      {/* Main Layout */}
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 items-center">
        {/* Left Dimensions */}
        <div className="hidden lg:flex flex-col gap-4 w-32">
          {dimensions.slice(0, 3).map((dim) => (
            <DimensionCard key={dim.id} dimension={dim} />
          ))}
        </div>

        {/* Center Chat */}
        <div className="flex-1 w-full max-w-2xl mx-auto">
          <div className="relative">
            {/* AI Avatar */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg shadow-[#6B7F6B]/30">
                <Image src="/nobogyan-logo.png" alt="NOBOGYAN" width={48} height={48} className="w-12 h-12" />
              </div>
            </div>

            {/* Chat Container - Floating */}
            <div className="bg-white/90 backdrop-blur-2xl border border-[#D6CFC2] rounded-3xl p-6 pt-14 shadow-2xl shadow-black/10">
              {/* Messages */}
              <div className="space-y-4 min-h-[300px] sm:min-h-[400px] lg:min-h-[450px] max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] overflow-y-auto pr-2 hide-scrollbar">
                {!isBackendAvailable && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                    <p className="text-xs text-amber-700">
                      Running in offline mode — backend is unavailable.
                    </p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                    {msg.role === "ai" && (
                      <div className="w-8 h-8 rounded-full bg-white border border-[#D6CFC2] flex items-center justify-center shrink-0">
                        <Image src="/nobogyan-logo.png" alt="NOBOGYAN" width={24} height={24} className="w-6 h-6" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] p-4 rounded-2xl",
                        msg.role === "ai"
                          ? "bg-[#F7F5F0] border border-[#E7E2D7]"
                          : "bg-[#6B7F6B]/10 border border-[#6B7F6B]/20"
                      )}
                    >
                      <p className="text-sm text-[#2a2a2a] leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-[#D6CFC2] flex items-center justify-center shrink-0">
                      <Image src="/nobogyan-logo.png" alt="NOBOGYAN" width={24} height={24} className="w-6 h-6" />
                    </div>
                    <div className="p-4 rounded-2xl bg-[#F7F5F0] border border-[#E7E2D7]">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#8a9ba3] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-[#8a9ba3] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-[#8a9ba3] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="mt-6 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Tell us your learning story..."
                  className="w-full px-5 py-4 pr-14 rounded-xl bg-[#F7F5F0] border border-[#D6CFC2] text-[#2a2a2a] placeholder-[#999] focus:outline-none focus:border-[#6B7F6B]/50 focus:ring-2 focus:ring-[#6B7F6B]/20 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-[#6B7F6B] flex items-center justify-center text-white hover:bg-[#5a6d5a] transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Dimensions */}
        <div className="hidden lg:flex flex-col gap-4 w-32">
          {dimensions.slice(3, 6).map((dim) => (
            <DimensionCard key={dim.id} dimension={dim} />
          ))}
        </div>
      </div>

      {/* Mobile Dimensions */}
      <div className="lg:hidden mt-8 grid grid-cols-3 gap-3">
        {dimensions.map((dim) => (
          <DimensionCard key={dim.id} dimension={dim} compact />
        ))}
      </div>
    </div>
  );
}

function DimensionCard({ dimension, compact = false }: { dimension: Dimension; compact?: boolean }) {
  const Icon = dimension.icon;
  const isActive = dimension.progress > 0;
  const isFilled = dimension.progress >= 70;

  return (
    <div
      className={cn(
        "relative rounded-2xl border transition-all duration-500",
        compact ? "p-3" : "p-4",
        isFilled
          ? "bg-[#6B7F6B]/10 border-[#6B7F6B]/30"
          : isActive
          ? "bg-white/80 border-[#D6CFC2]"
          : "bg-white/50 border-[#E7E2D7]"
      )}
    >
      {/* Tube Light Effect */}
      <div className="relative mb-3">
        <div
          className={cn(
            "w-full h-20 rounded-xl overflow-hidden",
            compact && "h-14"
          )}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-[#E7E2D7] rounded-xl" />
          
          {/* Fill */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#6B7F6B] to-[#8a9ba3] transition-all duration-1000 ease-out rounded-b-xl"
            style={{ height: `${dimension.progress}%` }}
          />
          
          {/* Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon
              className={cn(
                "transition-colors duration-500",
                compact ? "w-5 h-5" : "w-6 h-6",
                isFilled ? "text-white" : isActive ? "text-[#6B7F6B]" : "text-[#999]"
              )}
            />
          </div>
        </div>
      </div>

      {/* Label */}
      <p
        className={cn(
          "text-center font-medium transition-colors duration-500",
          compact ? "text-[10px]" : "text-xs",
          isFilled ? "text-[#6B7F6B]" : isActive ? "text-[#555]" : "text-[#999]"
        )}
      >
        {dimension.name}
      </p>
    </div>
  );
}
