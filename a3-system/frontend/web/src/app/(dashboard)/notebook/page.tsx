"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { api, getLearningPath, LearningPathNode, generateResources, getRemedialResources, markResourceConsumed } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import InteractiveMindMap from "@/components/mindmap/InteractiveMindMap";
import CodeExercise from "@/components/code/CodeExercise";
import LecturePlayer from "@/components/video/LecturePlayer";
import { GateStatusPanel } from "@/components/milestone/GateStatus";
import { useGateStatus } from "@/hooks/useTracking";
import { ResourceType } from "@/lib/tracking";
import { FaithfulnessBadge } from "@/components/FaithfulnessBadge";
import {
  BookOpen,
  GitBranch,
  BrainCircuit,
  Clapperboard,
  Laptop,
  Send,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Play,
  Bot,
  User,
  Loader2,
  X,
  LogOut,
  Users,
  Lock,
  Target,
  AlertCircle,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  faithfulness?: {
    score: number;
    verified: boolean;
    total_claims: number;
    supported_claims: number;
    unverifiable_claims: number;
    citations?: string[];
  };
}

interface PathNode {
  id: string;
  title: string;
  status: "completed" | "current" | "locked";
}

interface GeneratedResource {
  id: string;
  type: 'notes' | 'quiz' | 'code' | 'mindmap' | 'video';
  topic: string;
  data: any;
  timestamp: number;
  isRemedial?: boolean;
  weakConcepts?: string[];
  consumed?: boolean;
}

const AGENTS = [
  { id: "notes", label: "Scholar", icon: BookOpen, color: "from-amber-600 to-orange-500", desc: "Study Notes" },
  { id: "mindmap", label: "Mapper", icon: GitBranch, color: "from-teal-600 to-cyan-500", desc: "Visual Maps" },
  { id: "quiz", label: "Sage", icon: BrainCircuit, color: "from-violet-600 to-purple-500", desc: "Knowledge Check" },
  { id: "video", label: "Director", icon: Clapperboard, color: "from-rose-600 to-pink-500", desc: "Video Scripts" },
  { id: "code", label: "Architect", icon: Laptop, color: "from-emerald-600 to-teal-500", desc: "Code Labs" },
];

const DEFAULT_PATH: PathNode[] = [
  { id: "N02", title: "Cloud Computing", status: "current" },
  { id: "N27", title: "Virtualization", status: "locked" },
  { id: "N35", title: "Container Technology", status: "locked" },
  { id: "N37", title: "Docker", status: "locked" },
  { id: "N38", title: "Kubernetes", status: "locked" },
  { id: "N40", title: "Cloud Native", status: "locked" },
];


export default function NotebookPage() {
  const router = useRouter();
  const { profile, userName, studentId, logout } = useAppStore();

  // Learning path state
  const [learningPath, setLearningPath] = useState<PathNode[]>(DEFAULT_PATH);
  const [currentTopic, setCurrentTopic] = useState("Cloud Computing");
  const [isLoadingPath, setIsLoadingPath] = useState(true);
  const [totalEstimatedMinutes, setTotalEstimatedMinutes] = useState<number>(180);

  // Derived: dynamic progress indicators for sidebar
  const currentNodePosition = Math.max(
    0,
    learningPath.findIndex((n) => n.status === "current")
  );
  const progressLabel = `${currentNodePosition + 1} of ${learningPath.length}`;
  const totalHours = totalEstimatedMinutes / 60;
  const durationLabel =
    totalHours >= 1
      ? `~${totalHours.toFixed(totalHours < 10 ? 1 : 0)} hours`
      : `~${totalEstimatedMinutes} min`;
  const headerSummary = `${learningPath.length} topics • ${durationLabel}`;

  // Gate status for current milestone
  const currentMilestoneId = currentTopic.replace(/\s+/g, "_").toLowerCase();
  const { gateStatus, loading: gateLoading, refresh: refreshGate } = useGateStatus({
    studentId: studentId || "anonymous",
    milestoneId: currentMilestoneId,
    pollInterval: 15000, // Poll every 15 seconds
    enabled: !!studentId,
  });

  // Resource generation state (declared early for auto-generation)
  const [generatedResources, setGeneratedResources] = useState<GeneratedResource[]>([]);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const autoGenerateTriggered = useRef(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const lastStudentId = useRef<string | null>(null);

  // Remedial resources state
  const [remedialResources, setRemedialResources] = useState<GeneratedResource[]>([]);
  const [remedialLoading, setRemedialLoading] = useState(false);
  
  // Reset state when studentId changes (new user logged in)
  useEffect(() => {
    if (studentId && studentId !== lastStudentId.current) {
      console.log("🔄 New student detected:", studentId, "Previous:", lastStudentId.current);
      lastStudentId.current = studentId;
      autoGenerateTriggered.current = false;
      setGeneratedResources([]);
      setLearningPath(DEFAULT_PATH);
      setCurrentTopic("Cloud Computing");
      setIsLoadingPath(true); // Trigger path refetch
    }
  }, [studentId]);
  
  // Fetch learning path on mount or when studentId changes
  useEffect(() => {
    async function fetchPath() {
      if (!studentId) {
        setIsLoadingPath(false);
        return;
      }
      
      console.log("📚 Fetching learning path for student:", studentId);
      
      try {
        const pathData = await getLearningPath(studentId);
        console.log("📚 Path data received:", pathData);
        
        if (pathData.path.length > 0) {
          const convertedPath: PathNode[] = pathData.path.map((node) => ({
            id: node.node_id,
            title: node.title,
            status: node.status,
          }));
          setLearningPath(convertedPath);

          if (typeof pathData.totalEstimatedTime === "number" && pathData.totalEstimatedTime > 0) {
            setTotalEstimatedMinutes(pathData.totalEstimatedTime);
          }

          // Set current topic from the current node
          const currentNode = convertedPath.find(n => n.status === "current");
          if (currentNode) {
            setCurrentTopic(currentNode.title);
          }
        }
      } catch (error) {
        console.error("Failed to fetch learning path:", error);
        // Keep default path on error
      } finally {
        setIsLoadingPath(false);
      }
    }
    
    fetchPath();
  }, [studentId]);

  // Fetch remedial resources for current topic — only if the student has
  // attempted at least one quiz. Remedial content is generated server-side
  // only after a failed quiz, so calling this on initial page load for a
  // brand-new student is wasted traffic (and used to surface as a 500 when
  // the backend was otherwise busy).
  useEffect(() => {
    async function fetchRemedial() {
      if (!studentId || !currentTopic) return;

      const hasAttemptedQuiz =
        typeof window !== "undefined" &&
        localStorage.getItem(`quiz_attempted:${studentId}`) === "1";
      if (!hasAttemptedQuiz) {
        return;
      }

      try {
        setRemedialLoading(true);
        const data = await getRemedialResources(studentId, currentTopic);
        if (data.resources && data.resources.length > 0) {
          const mapped: GeneratedResource[] = data.resources.map((r: any) => ({
            id: r.id,
            type: r.resource_type as GeneratedResource['type'],
            topic: currentTopic,
            data: r.content,
            timestamp: new Date(r.created_at).getTime(),
            isRemedial: true,
            weakConcepts: r.weak_concepts_targeted || [],
            consumed: r.consumed,
          }));
          setRemedialResources(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch remedial resources:", err);
      } finally {
        setRemedialLoading(false);
      }
    }

    fetchRemedial();
  }, [studentId, currentTopic]);

  // Auto-generate resources when user first arrives with a profile
  // Per PRD: 5 agents run in PARALLEL after path is generated
  useEffect(() => {
    async function autoGenerateResources() {
      console.log("Auto-generate check:", {
        triggered: autoGenerateTriggered.current,
        isLoadingPath,
        hasProfile: !!profile,
        currentTopic,
        studentId,
        resourceCount: generatedResources.length
      });
      
      // Only trigger once, when we have a profile and path is loaded
      if (autoGenerateTriggered.current || isLoadingPath || !studentId || !currentTopic) {
        return;
      }
      
      // Check if resources already exist for this topic
      if (generatedResources.some(r => r.topic === currentTopic)) {
        console.log("Resources already exist for topic:", currentTopic);
        return;
      }
      
      autoGenerateTriggered.current = true;
      setIsAutoGenerating(true);

      console.log("Auto-generating resources (batched: 5 agents in one request)...");

      // Map UI agent id -> backend agent id
      const agentMap: Record<string, string> = {
        notes: "content",
        mindmap: "mindmap",
        quiz: "quiz",
        video: "media",
        code: "code",
      };
      // Reverse map so we can tag resources back to UI ids
      const uiIdByBackend: Record<string, string> = Object.fromEntries(
        Object.entries(agentMap).map(([ui, be]) => [be, ui])
      );

      const agentsToGenerate = ['notes', 'mindmap', 'quiz', 'video', 'code'];
      const backendAgents = agentsToGenerate.map((a) => agentMap[a] || a);

      try {
        // ONE batched request: backend orchestrator runs them concurrently
        // (semaphore-limited) instead of 5 parallel HTTP calls that each
        // hammer the free-tier LLM independently.
        const result = await generateResources({
          topic: currentTopic,
          student_id: studentId || "anonymous",
          profile: profile || {},
          context: "",
          agents: backendAgents,
          agent_kwargs: {
            num_questions: 5,
            difficulty_override: 0.5,
          },
        });

        const resources = result?.resources || {};
        const newItems: GeneratedResource[] = [];
        const failures: string[] = [];

        for (const [backendAgent, data] of Object.entries(resources)) {
          const uiId = uiIdByBackend[backendAgent] || backendAgent;
          // Backend returns {error: ...} for failed agents
          if (data && typeof data === "object" && "error" in (data as any)) {
            failures.push(`${uiId} (${(data as any).error})`);
            continue;
          }
          newItems.push({
            id: `${uiId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: uiId as GeneratedResource['type'],
            topic: currentTopic,
            data,
            timestamp: Date.now(),
          });
        }

        if (newItems.length > 0) {
          setGeneratedResources((prev) => [...newItems, ...prev]);
        }

        console.log(
          `Auto-generation complete. Succeeded: ${newItems.length}/5` +
            (failures.length ? `. Failed: ${failures.join(", ")}` : "")
        );
      } catch (error) {
        console.error("Batched auto-generate failed:", error);
      } finally {
        setIsAutoGenerating(false);
      }
    }
    
    autoGenerateResources();
  }, [isLoadingPath, profile, currentTopic, studentId, generatedResources]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const resourcesLoaded = useRef(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // Dynamic mastery: % of completed nodes + half-credit for current node
  const masteryProgress = learningPath.length > 0
    ? Math.round(
        ((learningPath.filter((n) => n.status === "completed").length +
          (learningPath.some((n) => n.status === "current") ? 0.5 : 0)) /
          learningPath.length) *
        100
      )
    : 0;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  // Quiz answer tracking: { resourceId_questionIndex: selectedOptionIndex }
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  // Quiz confidence tracking: { resourceId_questionIndex: confidenceLevel (1-5) }
  const [quizConfidence, setQuizConfidence] = useState<Record<string, number>>({});
  // Quiz hint tracking: { resourceId_questionIndex: number of hints revealed }
  const [quizRevealedHints, setQuizRevealedHints] = useState<Record<string, number>>({});
  // ELI5 toggle: { resourceId_questionIndex: boolean }
  const [quizEli5Enabled, setQuizEli5Enabled] = useState<Record<string, boolean>>({});
  // Distractor explanations visibility: { resourceId_questionIndex_optionIndex: boolean }
  const [quizShowDistractors, setQuizShowDistractors] = useState<Record<string, boolean>>({});
  // Quiz config UI
  const [showQuizConfig, setShowQuizConfig] = useState(false);
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quizCount, setQuizCount] = useState(5);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(320);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = rightPanelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [rightPanelWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Horizontal panel resize
      if (isResizingRef.current) {
        const delta = startXRef.current - e.clientX;
        const newWidth = Math.min(Math.max(startWidthRef.current + delta, 280), 800);
        setRightPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
  // Persist generated resources to localStorage
  const STORAGE_KEY = `a3_resources_${studentId || 'anonymous'}`;

  // Load from localStorage on mount
  useEffect(() => {
    if (resourcesLoaded.current) return;
    resourcesLoaded.current = true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GeneratedResource[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGeneratedResources(parsed);
        }
      }
    } catch { /* ignore corrupt data */ }
  }, [STORAGE_KEY]);

  // Save to localStorage whenever resources change
  useEffect(() => {
    if (!resourcesLoaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(generatedResources));
    } catch { /* storage full — ignore */ }
  }, [generatedResources, STORAGE_KEY]);

  // Set initial message when topic is loaded
  useEffect(() => {
    if (!isLoadingPath && messages.length === 0) {
      const completedCount = learningPath.filter(n => n.status === "completed").length;
      const totalCount = learningPath.length;
      const progressText = completedCount > 0
        ? `You've already mastered ${completedCount} of ${totalCount} topics — that's amazing progress! 🎉`
        : "I'm so excited to start this learning journey with you! 🌟";

      setMessages([{
        role: "assistant",
        content: `Hey${userName ? ` ${userName}` : ""}! ${progressText}\n\nI see you're diving into **${currentTopic}** right now — that's a fantastic topic! 🚀\n\nI'm here to make learning cloud computing fun and approachable. Whether you want me to:\n• 🧠 **Explain concepts** in a way that clicks for you\n• 🎯 **Walk through examples** step by step\n• 💡 **Connect ideas** to what you've already learned\n• ❓ **Answer specific questions** — no question is too small!\n\nWhat would you like to explore first?`,
      }]);
    }
  }, [isLoadingPath, currentTopic, userName, messages.length, learningPath]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessageToTutor = async (userMessage: string, topicOverride?: string) => {
    if (isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Build conversation history for LLM
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content
      }));

      const topic = topicOverride || currentTopic;

      // Streaming API call using fetch + SSE
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_BASE_URL}/api/chat/simple/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          topic,
          history: conversationHistory,
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      // Add assistant message placeholder for streaming
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", isStreaming: true },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const jsonStr = trimmed.slice(6);
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.event === "delta") {
                fullResponse += parsed.data;
                // Update the last assistant message in real-time
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg.role === "assistant") {
                    lastMsg.content = fullResponse;
                  }
                  return updated;
                });
              }
            } catch {
              // ignore malformed lines
            }
          }
        }
      }

      // Finalize: remove isStreaming flag
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg.role === "assistant") {
          lastMsg.content = fullResponse;
          delete lastMsg.isStreaming;
        }
        return updated;
      });
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Oh no! 🤔 I'm having a little trouble right now. Let me try again in just a moment!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    const msg = inputValue.trim();
    setInputValue("");
    await sendMessageToTutor(msg);
  };

  const handleMindMapNodeClick = (nodeLabel: string) => {
    const prompt = `Give me a brief introduction to "${nodeLabel}" and suggest 2-3 follow-up questions I could ask.`;
    sendMessageToTutor(prompt, nodeLabel);
  };

  const handleAgentClick = async (agentId: string, quizOpts?: { difficulty: string; count: number }) => {
    // Show quiz config dialog instead of generating immediately
    if (agentId === 'quiz' && !quizOpts) {
      setShowQuizConfig(true);
      return;
    }
    setActiveAgent(agentId);
    setGeneratedContent(null);
    setIsGenerating(true);

    // Map frontend agent IDs to backend agent names
    const agentMap: Record<string, string> = {
      notes: "content",
      mindmap: "mindmap",
      quiz: "quiz",
      video: "media",
      code: "code",
    };

    const backendAgent = agentMap[agentId] || agentId;

    try {
      // Build agent_kwargs for quiz settings
      const agentKwargs: Record<string, any> = {};
      if (agentId === 'quiz' && quizOpts) {
        agentKwargs.num_questions = quizOpts.count;
        const diffMap: Record<string, number> = { easy: 0.3, medium: 0.6, hard: 0.85 };
        agentKwargs.difficulty_override = diffMap[quizOpts.difficulty] ?? 0.6;
      }

      // Call the backend resource generation API
      const result = await generateResources({
        topic: currentTopic,
        student_id: studentId || "anonymous",
        profile: profile || {},
        context: "",
        agents: [backendAgent],
        agent_kwargs: agentKwargs,
      });

      console.log(`API Response for ${agentId}:`, result);
      
      // Store the generated resource as a new item with unique ID
      if (result.resources && result.resources[backendAgent]) {
        const resourceData = result.resources[backendAgent];
        console.log(`Resource data for ${agentId}:`, resourceData);
        const newId = `${agentId}_${Date.now()}`;
        const newItem: GeneratedResource = {
          id: newId,
          type: agentId as GeneratedResource['type'],
          topic: currentTopic,
          data: resourceData,
          timestamp: Date.now(),
        };
        setGeneratedResources((prev) => [newItem, ...prev]);
        // Auto-select this new resource and expand to full height
        setSelectedResource(newId);
        setIsPreviewExpanded(true);
      } else {
        console.warn(`No resources found for agent: ${backendAgent}`);
      }

      setGeneratedContent(agentId);
      // Auto-expand the panel width for a better reading experience
      if (rightPanelWidth < 480) setRightPanelWidth(480);
    } catch (error) {
      console.error(`Failed to generate ${agentId} content:`, error);
      setGeneratedContent(agentId);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen flex bg-[#F7F5F0] text-[#2a2a2a] overflow-hidden relative">
      {/* Subtle Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E7E2D7]/50 via-[#F7F5F0] to-[#C9D2D6]/30" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#B8C3C9]/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#D6CFC2]/30 rounded-full blur-[128px]" />
      
      {/* Left Column - Learning Path & Resources */}
      <div className="w-64 flex flex-col bg-[#E7E2D7]/80 backdrop-blur-xl relative z-10 border-r border-[#D6CFC2]">
        {/* Header */}
        <div className="p-5 border-b border-[#D6CFC2]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#B8C3C9] to-[#8a9ba3] flex items-center justify-center shadow-md shadow-[#B8C3C9]/40">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[#2a2a2a]">Your Journey</h2>
              <p className="text-xs text-[#666]">{headerSummary}</p>
            </div>
          </div>
        </div>
        
        {/* Learning Path */}
        <div className="p-5 flex-1 overflow-auto scrollbar-hide">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-[#666] uppercase tracking-wider">Learning Path</span>
            <span className="text-xs text-[#8a9ba3] font-medium">{progressLabel}</span>
          </div>
          <div className="relative space-y-1">
            {isLoadingPath ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#8a9ba3]" />
              </div>
            ) : learningPath.map((node, index) => (
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
                  <span className={`text-sm font-medium block truncate ${
                    node.status === "current" ? "text-[#4a5568]" 
                    : node.status === "completed" ? "text-[#555]" 
                    : "text-[#888]"
                  }`}>
                    {node.title}
                  </span>
                  {node.status === "current" && (
                    <span className="text-xs text-[#8a9ba3]">In Progress</span>
                  )}
                </div>
                {/* Arrow */}
                {node.status === "current" && (
                  <ChevronRight className="w-4 h-4 text-[#8a9ba3]" />
                )}
              </div>
            ))}
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
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="p-2 rounded-lg hover:bg-red-500/10 text-[#888] hover:text-red-500 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Center Column - AI Tutor Chat */}
      <div className="flex-1 flex flex-col bg-transparent relative z-10">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-[#D6CFC2] flex items-center justify-between bg-[#F7F5F0]/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B8C3C9] to-[#8a9ba3] flex items-center justify-center shadow-md shadow-[#B8C3C9]/30">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#8a9ba3] border-2 border-[#F7F5F0] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-[#2a2a2a] text-lg">A3 AI Tutor</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#666]">Teaching:</span>
                <span className="text-sm text-[#4a5568] font-medium">{currentTopic}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-full bg-[#C9D2D6]/30 border border-[#B8C3C9]/50 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#8a9ba3] animate-pulse" />
              <span className="text-xs text-[#4a5568] font-medium">Live</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((message, index) => {
              return (
              <div
                key={index}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
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
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    message.role === "user"
                      ? "bg-[#E7E2D7] border border-[#D6CFC2]"
                      : "bg-white border border-[#D6CFC2] shadow-sm"
                  }`}
                >
                  <div className="text-sm prose prose-sm max-w-none chat-message text-[#2a2a2a]">
                    {message.content.split("```").map((part, i) => {
                      if (i % 2 === 1) {
                        const [lang, ...code] = part.split("\n");
                        return (
                          <pre
                            key={i}
                            className="bg-[#2a2a2a] rounded-xl p-3 my-2 overflow-x-auto border border-[#444] scrollbar-hide"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                          >
                            <code className="text-white text-xs font-mono">{code.join("\n")}</code>
                          </pre>
                        );
                      }
                      // Enhanced markdown rendering
                      let html = part
                        // Headers
                        .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-[#4a5568] mt-3 mb-1">$1</h3>')
                        .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-[#4a5568] mt-4 mb-2">$1</h2>')
                        .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-[#4a5568] mt-4 mb-2">$1</h1>')
                        // Tables (| col1 | col2 |)
                        .replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm, (_match: string, headerRow: string, _sep: string, bodyRows: string) => {
                          const headers = headerRow.split('|').filter(Boolean).map((h: string) => h.trim());
                          const rows = bodyRows.trim().split('\n').map((r: string) =>
                            r.split('|').filter(Boolean).map((c: string) => c.trim())
                          );
                          const thCells = headers
                            .map((h: string) => `<th class="px-3 py-2 text-left text-[10px] font-semibold text-[#4a5568] uppercase tracking-wider border-b border-[#D6CFC2]">${h}</th>`)
                            .join('');
                          const trRows = rows
                            .map(
                              (cols: string[]) =>
                                '<tr class="border-b border-[#E7E2D7] hover:bg-[#F7F5F0]">' +
                                cols.map((c: string) => `<td class="px-3 py-2 text-[11px] text-[#555]">${c}</td>`).join('') +
                                '</tr>'
                            )
                            .join('');
                          return `<div class="my-3 overflow-x-auto rounded-xl border border-[#D6CFC2]" style="scrollbar-width:none;-ms-overflow-style:none;"><table class="w-full"><thead class="bg-[#E7E2D7]"><tr>${thCells}</tr></thead><tbody class="bg-white">${trRows}</tbody></table></div>`;
                        })
                        // Bold and italic
                        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="text-[#4a5568] italic">$1</strong>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#4a5568]">$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em class="text-[#555]">$1</em>')
                        // Inline code
                        .replace(/`([^`]+)`/g, '<code class="bg-[#E7E2D7] text-[#4a5568] px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
                        // Bullet lists
                        .replace(/^[-•]\s+(.+)$/gm, '<li class="flex items-start gap-2 py-0.5 leading-snug"><span class="text-[#8a9ba3] mt-1">•</span><span class="text-[#444]">$1</span></li>')
                        // Numbered lists
                        .replace(/^(\d+)\.\s+(.+)$/gm, '<li class="flex items-start gap-2 py-0.5 leading-snug"><span class="text-[#8a9ba3] font-semibold min-w-[1.2rem]">$1.</span><span class="text-[#444]">$2</span></li>')
                        // Remove blank lines between list items to prevent extra spacing
                        .replace(/(<li[\s\S]*?<\/li>)\s*(?:<br\/>|<p[^>]*>[\s ]*<\/p>)\s*(?=<li)/g, '$1')
                        // Line breaks
                        .replace(/\n\n/g, '</p><p class="mt-2">')
                        .replace(/\n/g, '<br/>');

                      // Wrap list items
                      if (html.includes('<li')) {
                        html = html.replace(/(<li[\s\S]*?<\/li>\s*)+/g, '<ul class="space-y-0 my-1">$&</ul>');
                      }
                      
                      return (
                        <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
                      );
                    })}
                    {/* Typing indicator inside the same bubble */}
                    {message.isStreaming && (
                      <span className="inline-flex items-center gap-1 ml-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8a9ba3] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8a9ba3] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8a9ba3] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    )}
                  </div>
                  {/* Faithfulness Badge for assistant messages */}
                  {message.role === "assistant" && message.faithfulness && (
                    <div className="mt-2 pt-2 border-t border-[#D6CFC2]/50">
                      <FaithfulnessBadge
                        faithfulness={message.faithfulness}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-[#D6CFC2] bg-[#F7F5F0]/80 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-center p-2 rounded-2xl bg-white border border-[#D6CFC2] focus-within:border-[#B8C3C9] focus-within:shadow-md transition-all duration-300">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={`Ask me anything about ${currentTopic}...`}
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-[#2a2a2a] placeholder:text-[#999] text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                size="sm"
                className="bg-[#B8C3C9] hover:bg-[#8a9ba3] text-white font-semibold rounded-xl shadow-md shadow-[#B8C3C9]/30 transition-all h-10 w-10 p-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-center text-xs text-[#999] mt-2">Press Enter to send • AI responses may vary</p>
          </div>
        </div>
      </div>

      {/* Right Column - Agent & Toolkit */}
      <div
        className="flex flex-col bg-[#E7E2D7]/80 backdrop-blur-xl relative z-10 border-l border-[#D6CFC2] shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ width: rightPanelWidth }}
      >
        {/* Drag resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group hover:bg-[#B8C3C9]/30 transition-colors"
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-[#D6CFC2] group-hover:bg-[#B8C3C9] transition-colors" />
        </div>
        {/* Header */}
        <div className="p-5 border-b border-[#D6CFC2]">
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
                    {
                      (() => {
                        const item = generatedResources.find(r => r.id === selectedResource) || remedialResources.find(r => r.id === selectedResource);
                        return (
                          <>
                            <h2 className="font-semibold text-[#2a2a2a]">{item?.topic || "Preview"}</h2>
                            <p className="text-xs text-[#666]">
                              {item?.type.charAt(0).toUpperCase()}{item?.type.slice(1)}
                              {item?.isRemedial && <span className="text-amber-600 ml-1">(Targeted)</span>}
                            </p>
                          </>
                        );
                      })()
                    }
                  </div>
                </div>
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
              </>
            ) : (
              // Normal header
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9D2D6] via-[#B8C3C9] to-[#8a9ba3] flex items-center justify-center shadow-lg shadow-[#B8C3C9]/40 ring-2 ring-white/50">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#2a2a2a] text-lg tracking-tight">The Five Minds</h2>
                    <p className="text-xs text-[#666] font-medium">Your AI Learning Collective</p>
                  </div>
                </div>
                {selectedResource && (
                  <button
                    onClick={() => { setSelectedResource(null); setRightPanelWidth(320); }}
                    className="p-2 rounded-lg hover:bg-[#D6CFC2]/50 text-[#888] hover:text-[#555] transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Scrollable content area with grid overlay for smooth transitions */}
        <div className="flex-1 grid grid-cols-1 grid-rows-1 min-h-0 overflow-hidden relative">
          {/* ── Sidebar view (agents + resources) ── */}
          <div
            className={`col-start-1 row-start-1 flex flex-col min-h-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isPreviewExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="px-4 py-3 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-medium text-[#888] uppercase tracking-widest">Agents</span>
                {(isGenerating || isAutoGenerating) && (
                  <div className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-[#8a9ba3]" />
                    {isAutoGenerating && <span className="text-[8px] text-[#8a9ba3]">Auto-generating...</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {AGENTS.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleAgentClick(agent.id)}
                    disabled={isGenerating}
                    className={`group flex-1 py-2 px-1 rounded-lg border transition-all duration-200 flex flex-col items-center gap-1 disabled:opacity-40 ${
                      activeAgent === agent.id
                        ? "bg-[#B8C3C9]/20 border-[#B8C3C9]/50 shadow-sm"
                        : "bg-white/50 border-[#D6CFC2] hover:bg-white hover:border-[#B8C3C9]"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                      activeAgent === agent.id
                        ? "bg-[#B8C3C9]/30"
                        : `bg-gradient-to-br ${agent.color} shadow-sm`
                    }`}>
                      <agent.icon className={`w-3 h-3 ${activeAgent === agent.id ? "text-[#4a5568]" : "text-white"}`} />
                    </div>
                    <span className={`text-[8px] font-semibold leading-none ${
                      activeAgent === agent.id ? "text-[#4a5568]" : "text-[#888]"
                    }`}>{agent.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-[#D6CFC2]" />

            <div className="flex-1 p-5 overflow-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-[#888] uppercase tracking-wider">Resources</span>
                <span className="text-xs text-[#999]">{generatedResources.length} items</span>
              </div>
              <div className="space-y-3">
                {/* Remedial Resources Section */}
                {remedialResources.length > 0 && (
                  <div className="rounded-xl border-2 border-amber-300 overflow-hidden bg-amber-50/40">
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-100/60">
                      <Target className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-semibold text-amber-800">Targeted Review</span>
                      <span className="text-xs text-amber-600 ml-auto">
                        {remedialResources.filter(r => !r.consumed).length} new
                      </span>
                    </div>
                    <div className="p-3 space-y-2">
                      {remedialResources.map((item) => (
                        <div
                          key={item.id}
                          onClick={async () => {
                            if (selectedResource === item.id && isPreviewExpanded) {
                              setIsPreviewExpanded(false);
                              setSelectedResource(null);
                              setRightPanelWidth(320);
                            } else {
                              setSelectedResource(item.id);
                              setIsPreviewExpanded(true);
                              if (rightPanelWidth < 480) setRightPanelWidth(480);
                              // Mark as consumed
                              if (!item.consumed) {
                                try {
                                  await markResourceConsumed(item.id);
                                  setRemedialResources(prev =>
                                    prev.map(r => r.id === item.id ? { ...r, consumed: true } : r)
                                  );
                                } catch (e) {
                                  console.error("Failed to mark consumed:", e);
                                }
                              }
                            }
                          }}
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
                                <span className="text-[10px] text-white bg-amber-500 px-1.5 py-0.5 rounded-full">New</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-amber-500 transition-transform ${selectedResource === item.id ? 'rotate-90' : ''}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grouped Resources by Type */}
                {generatedResources.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-xl bg-[#D6CFC2]/50 flex items-center justify-center mb-3">
                      <Sparkles className="w-6 h-6 text-[#999]" />
                    </div>
                    <p className="text-sm text-[#666] mb-1">No resources yet</p>
                    <p className="text-xs text-[#999]">Click an agent above to generate</p>
                  </div>
                ) : (
                  AGENTS.map((agent) => {
                    const items = generatedResources.filter((r) => r.type === agent.id);
                    const isExpanded = expandedTypes.has(agent.id);
                    const scoreKey = (agent.id === 'quiz' ? 'practice_quiz' : agent.id) as ResourceType;
                    const score = gateStatus ? gateStatus.resource_scores[scoreKey] || 0 : 0;
                    const percentage = Math.round(score * 100);
                    const AgentIcon = agent.icon;

                    return (
                      <div key={agent.id} className="rounded-xl border border-[#D6CFC2] overflow-hidden bg-white/40">
                        {/* Type Header */}
                        <button
                          onClick={() => {
                            setExpandedTypes((prev) => {
                              const next = new Set(prev);
                              if (next.has(agent.id)) next.delete(agent.id);
                              else next.add(agent.id);
                              return next;
                            });
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-white/60 transition-colors"
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            agent.id === "notes" ? "bg-amber-100 text-amber-700" :
                            agent.id === "quiz" ? "bg-violet-100 text-violet-700" :
                            agent.id === "code" ? "bg-emerald-100 text-emerald-700" :
                            agent.id === "mindmap" ? "bg-teal-100 text-teal-700" :
                            "bg-rose-100 text-rose-700"
                          }`}>
                            <AgentIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 text-left">
                            <span className="text-sm font-medium text-[#2a2a2a] block">
                              {agent.label}
                            </span>
                            <span className="text-xs text-[#888]">
                              {items.length} {items.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          {gateStatus && (
                            <div className="mr-1 flex items-center gap-1" title={`${percentage}% complete`}>
                              {(() => {
                                const radius = 10;
                                const circumference = 2 * Math.PI * radius;
                                const offset = circumference * (1 - percentage / 100);
                                const colorMap: Record<string, string> = {
                                  notes: '#d97706',
                                  quiz: '#7c3aed',
                                  code: '#059669',
                                  mindmap: '#0d9488',
                                  video: '#e11d48',
                                };
                                return (
                                  <svg width="24" height="24" viewBox="0 0 24 24" className="-rotate-90">
                                    <circle cx="12" cy="12" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                    <circle
                                      cx="12" cy="12" r={radius} fill="none"
                                      stroke={colorMap[agent.id] || '#8a9ba3'}
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeDasharray={circumference}
                                      strokeDashoffset={offset}
                                    />
                                  </svg>
                                );
                              })()}
                              <span className="text-[10px] font-medium text-[#888] w-6 text-right">{percentage}%</span>
                            </div>
                          )}
                          <ChevronDown className={`w-4 h-4 text-[#999] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Expanded Items */}
                        <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                          <div className="overflow-hidden">
                            <div className="px-3 pb-3 space-y-2">
                              {items.length === 0 ? (
                                <p className="text-xs text-[#999] py-2">No {agent.label.toLowerCase()} yet</p>
                              ) : (
                                items.map((item) => (
                                  <div
                                    key={item.id}
                                    onClick={() => {
                                      if (selectedResource === item.id && isPreviewExpanded) {
                                        setIsPreviewExpanded(false);
                                        setSelectedResource(null);
                                        setRightPanelWidth(320);
                                      } else {
                                        setSelectedResource(item.id);
                                        setIsPreviewExpanded(true);
                                        if (rightPanelWidth < 480) setRightPanelWidth(480);
                                      }
                                    }}
                                    className={`group flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                                      selectedResource === item.id
                                        ? "bg-[#B8C3C9]/20 border-[#B8C3C9]/50"
                                        : "bg-white/50 border-[#D6CFC2]/60 hover:bg-white hover:border-[#B8C3C9]"
                                    }`}
                                  >
                                    <div className="flex-1 min-w-0">
                                    <span className="text-sm text-[#2a2a2a] group-hover:text-[#000] truncate block">
                                      {item.topic}
                                    </span>
                                    <span className="text-xs text-[#888]">
                                      {new Date(item.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <ChevronRight className={`w-4 h-4 text-[#999] transition-transform ${selectedResource === item.id ? 'rotate-90' : ''}`} />
                                </div>
                              ))
                            )}
                          </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Preview view ── */}
          <div
            className={`col-start-1 row-start-1 flex flex-col min-h-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isPreviewExpanded && selectedResource ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {selectedResource && (generatedResources.find((r) => r.id === selectedResource) || remedialResources.find((r) => r.id === selectedResource)) && (() => {
          const activeItem = generatedResources.find((r) => r.id === selectedResource) || remedialResources.find((r) => r.id === selectedResource)!;
          const resType = activeItem.type;

          return (
          <div className="flex-1 overflow-auto min-h-0 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {/* ── Renderer ── */}
            {(() => {
              // Collect completed topic titles for Refresher tooltips
              const completedTopics = learningPath
                .filter((n) => n.status === "completed")
                .map((n) => n.title);

              // ── Markdown → HTML helper (shared by notes / mindmap / video / quiz-text) ──
              const renderMarkdown = (raw: string) => {
                let html = raw;

                // 0. Basic XSS sanitization - remove dangerous tags and attributes
                // Remove script tags and their content
                html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                // Remove event handlers (onclick, onerror, etc.)
                html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
                // Remove javascript: URLs
                html = html.replace(/javascript\s*:/gi, '');
                // Remove iframe, object, embed tags
                html = html.replace(/<(iframe|object|embed|form|input|button)[^>]*>/gi, '');
                // Remove style tags
                html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

                // 1. Fenced code blocks — stash into placeholders so later
                // line-based transforms (headers, lists, etc.) cannot mangle
                // their contents.
                const preBlocks: string[] = [];
                html = html.replace(
                  /```(\w*)\n([\s\S]*?)```/g,
                  (_match, _lang, code) => {
                    const escaped = code
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;');
                    const block = `<pre class="bg-[#2a2a2a] rounded-xl p-4 my-4 border border-[#444] overflow-x-auto scrollbar-hide" style="scrollbar-width:none;-ms-overflow-style:none;"><code style="color:#ffffff" class="text-[11px] leading-relaxed font-mono whitespace-pre">${escaped}</code></pre>`;
                    const idx = preBlocks.push(block) - 1;
                    return `\u0000PRE_BLOCK_${idx}\u0000`;
                  }
                );

                // 2. Horizontal rules  →  styled divider
                html = html.replace(
                  /^---+$/gm,
                  '<div class="my-5 border-t border-dashed border-[#D6CFC2]"></div>'
                );

                // 3. Tables  (| … | … |)
                html = html.replace(
                  /^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm,
                  (_match: string, headerRow: string, _sep: string, bodyRows: string) => {
                    const headers = headerRow.split('|').filter(Boolean).map((h: string) => h.trim());
                    const rows = bodyRows.trim().split('\n').map((r: string) =>
                      r.split('|').filter(Boolean).map((c: string) => c.trim())
                    );
                    const thCells = headers
                      .map((h: string) => `<th class="px-3 py-2 text-left text-[10px] font-semibold text-[#4a5568] uppercase tracking-wider border-b border-[#D6CFC2]">${h}</th>`)
                      .join('');
                    const trRows = rows
                      .map(
                        (cols: string[]) =>
                          '<tr class="border-b border-[#E7E2D7] hover:bg-[#F7F5F0]">' +
                          cols.map((c: string) => `<td class="px-3 py-2 text-[11px] text-[#555]">${c}</td>`).join('') +
                          '</tr>'
                      )
                      .join('');
                    return `<div class="my-4 overflow-x-auto rounded-xl border border-[#D6CFC2]"><table class="w-full"><thead class="bg-[#E7E2D7]"><tr>${thCells}</tr></thead><tbody class="bg-white">${trRows}</tbody></table></div>`;
                  }
                );

                // 4. Block-quotes / mental-model callouts
                html = html.replace(
                  /^> (.+)$/gm,
                  '<div class="my-3 pl-4 py-2.5 border-l-2 border-[#B8C3C9] bg-[#C9D2D6]/20 rounded-r-lg"><span class="text-[11px] italic text-[#4a5568]">💡 $1</span></div>'
                );

                // 5. Headers  (process ### before ## before #)
                html = html.replace(
                  /^### (.+)$/gm,
                  '<h4 class="text-[11px] font-semibold text-[#888] mt-3 mb-1 uppercase tracking-widest">$1</h4>'
                );
                html = html.replace(
                  /^## (\d+)\.\s*(.+)$/gm,
                  '<h3 class="text-[13px] font-bold text-[#4a5568] mt-5 mb-2 flex items-center gap-2"><span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-[#B8C3C9]/30 text-[#4a5568] text-[11px] font-black">$1</span>$2</h3>'
                );
                html = html.replace(
                  /^## (.+)$/gm,
                  '<h3 class="text-[13px] font-bold text-[#4a5568] mt-5 mb-2">$1</h3>'
                );
                html = html.replace(
                  /^# (.+)$/gm,
                  '<h2 class="text-[15px] font-extrabold text-[#2a2a2a] mt-5 mb-3 pb-2 border-b border-[#D6CFC2]">$1</h2>'
                );

                // 6. Bold → dark emphasis
                html = html.replace(
                  /\*\*(.+?)\*\*/g,
                  '<strong class="text-[#2a2a2a] font-semibold">$1</strong>'
                );

                // 7. Italic
                html = html.replace(
                  /\*(.+?)\*/g,
                  '<em class="text-[#666] italic">$1</em>'
                );

                // 8. Inline code
                html = html.replace(
                  /`([^`]+)`/g,
                  '<code class="bg-[#E7E2D7] px-1.5 py-0.5 rounded text-[#4a5568] text-[10px] font-mono border border-[#D6CFC2]">$1</code>'
                );

                // 9. Unordered list items  →  clean dashes
                html = html.replace(
                  /^[-*] (.+)$/gm,
                  '<li class="flex items-start gap-2 py-0.5"><span class="text-[#8a9ba3] mt-px select-none">–</span><span class="text-[#444]">$1</span></li>'
                );

                // 10. Ordered list items
                html = html.replace(
                  /^(\d+)\.\s+(.+)$/gm,
                  '<li class="flex items-start gap-2 py-0.5"><span class="text-[#8a9ba3] font-semibold min-w-[1rem]">$1.</span><span class="text-[#444]">$2</span></li>'
                );

                // 11. Wrap consecutive <li> runs in <ul>
                html = html.replace(
                  /((?:<li[\s\S]*?<\/li>\s*)+)/g,
                  '<ul class="my-2 space-y-0.5 pl-1">$1</ul>'
                );

                // 12. Refresher tooltips – wrap completed-milestone terms
                completedTopics.forEach((term) => {
                  if (!term) return;
                  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const re = new RegExp(`(?<![<\\w])\\b(${escaped})\\b(?![\\w>])`, 'gi');
                  html = html.replace(
                    re,
                    '<span class="relative group/tip cursor-help border-b border-dashed border-[#B8C3C9]">$1<span class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tip:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#D6CFC2] shadow-lg shadow-black/10 text-[10px] text-[#4a5568] whitespace-nowrap z-50">🔗 Refresher: $1</span></span>'
                  );
                });

                // 13. HTML details/summary tags (Self-Check answers)
                html = html.replace(
                  /<details>([\s\S]*?)<\/details>/g,
                  (_match: string, content: string) => {
                    const summaryMatch = content.match(/<summary>([\s\S]*?)<\/summary>/);
                    const summary = summaryMatch ? summaryMatch[1] : 'Click to reveal answer';
                    const detailsContent = content.replace(/<summary>[\s\S]*?<\/summary>/, '').trim();
                    return `<details class="my-2 rounded-lg border border-[#D6CFC2] bg-[#F7F5F0]/50"><summary class="px-3 py-2 text-[11px] font-semibold text-[#4a5568] cursor-pointer hover:bg-[#E7E2D7]/50 transition-colors select-none">${summary}</summary><div class="px-3 py-2 text-[11px] text-[#555] border-t border-[#D6CFC2] bg-white/50">${detailsContent}</div></details>`;
                  }
                );

                // 14. Visual Summary callout boxes
                html = html.replace(
                  /Visual Summary/gi,
                  '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#B8C3C9]/20 text-[#4a5568] text-[10px] font-semibold">📐 Visual Summary</span>'
                );

                // 15. Focus Area callout boxes
                html = html.replace(
                  /⚠️\s*Focus Area/g,
                  '<div class="my-3 px-3 py-2 rounded-lg border border-amber-300 bg-amber-50/50"><span class="flex items-center gap-1 text-[11px] font-semibold text-amber-700">⚠️ Focus Area</span>'
                );

                // 16. Quick Reference Card header styling
                html = html.replace(
                  /Quick Reference Card/gi,
                  '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#8a9ba3]/20 text-[#4a5568] text-[10px] font-semibold">📋 Quick Reference</span>'
                );

                // 17. Remaining plain lines → paragraphs
                html = html
                  .split('\n')
                  .map((line: string) => {
                    const t = line.trim();
                    if (
                      t === '' ||
                      /^\u0000PRE_BLOCK_\d+\u0000$/.test(t) ||
                      t.startsWith('<h') ||
                      t.startsWith('<ul') ||
                      t.startsWith('<li') ||
                      t.startsWith('<div') ||
                      t.startsWith('<table') ||
                      t.startsWith('</') ||
                      t.startsWith('<tr') ||
                      t.startsWith('<td') ||
                      t.startsWith('<th') ||
                      t.startsWith('<thead') ||
                      t.startsWith('<tbody')
                    )
                      return line;
                    return `<p class="text-[#555] my-1.5 leading-relaxed text-[11px]">${line}</p>`;
                  })
                  .join('\n');

                // 18. Restore protected <pre> code blocks
                html = html.replace(/\u0000PRE_BLOCK_(\d+)\u0000/g, (_m, idx) => preBlocks[Number(idx)] || '');

                return html;
              };

              const res = activeItem.data;
              // Build a markdown rendering for the 3-tier code agent schema
              // when neither `content` nor `code` strings are present.
              const codeMarkdownFromExercises = (() => {
                if (!res || !Array.isArray(res.exercises) || res.exercises.length === 0) return null;
                const parts: string[] = [];
                if (res.real_world_scenario) {
                  parts.push(`## Why this matters\n\n${res.real_world_scenario}`);
                }
                if (Array.isArray(res.learning_objectives) && res.learning_objectives.length) {
                  parts.push(`## Learning objectives\n\n${res.learning_objectives.map((o: string) => `- ${o}`).join("\n")}`);
                }
                res.exercises.forEach((ex: any, idx: number) => {
                  const tier = (ex.tier || `tier ${idx + 1}`).toString().toUpperCase();
                  const name = ex.name || `Exercise ${idx + 1}`;
                  parts.push(`## ${idx + 1}. ${name}  _(${tier})_`);
                  if (ex.problem) parts.push(`**Problem:** ${ex.problem}`);
                  if (ex.pseudocode) parts.push(`**Pseudocode:**\n\n\`\`\`\n${ex.pseudocode}\n\`\`\``);
                  if (ex.starter_code) parts.push(`**Starter code:**\n\n\`\`\`${res.language || ''}\n${ex.starter_code}\n\`\`\``);
                  if (Array.isArray(ex.hints) && ex.hints.length) {
                    parts.push(`**Hints:**\n\n${ex.hints.map((h: string, i: number) => `${i + 1}. ${h}`).join("\n")}`);
                  }
                  if (Array.isArray(ex.test_cases) && ex.test_cases.length) {
                    const rows = ex.test_cases.map((tc: any) => `| \`${tc.input}\` | \`${tc.expected}\` | ${tc.description || ''} |`).join("\n");
                    parts.push(`**Test cases:**\n\n| Input | Expected | Description |\n|---|---|---|\n${rows}`);
                  }
                  if (ex.solution) parts.push(`<details><summary>Show solution</summary>\n\n\`\`\`${res.language || ''}\n${ex.solution}\n\`\`\`\n\n</details>`);
                });
                if (Array.isArray(res.common_bugs) && res.common_bugs.length) {
                  parts.push(`## Common bugs\n\n${res.common_bugs.map((b: any) => typeof b === 'string' ? `- ${b}` : `- **${b.bug || ''}** — ${b.fix || ''}`).join("\n")}`);
                }
                if (res.complexity_analysis) {
                  const c = res.complexity_analysis;
                  parts.push(`## Complexity\n\n- **Time:** ${c.time_complexity || 'n/a'}\n- **Space:** ${c.space_complexity || 'n/a'}${c.why_it_matters ? `\n\n${c.why_it_matters}` : ''}`);
                }
                if (Array.isArray(res.key_takeaways) && res.key_takeaways.length) {
                  parts.push(`## Key takeaways\n\n${res.key_takeaways.map((t: string) => `- ${t}`).join("\n")}`);
                }
                return parts.join("\n\n");
              })();

              const rawContent: string | null =
                res?.content || res?.code || res?.text || codeMarkdownFromExercises || null;

              return (
                <div className={`flex flex-col h-full bg-[#e9e4da] ${resType === 'mindmap' ? 'p-0' : 'p-5'}`}>
                  {/* ── Header bar ── */}
                  <div className={`flex items-center gap-2.5 ${resType === 'mindmap' ? 'px-5 pt-5 pb-3' : 'mb-4'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${
                      resType === "notes"   ? "bg-blue-100"   :
                      resType === "quiz"    ? "bg-orange-100" :
                      resType === "code"    ? "bg-green-100"  :
                      resType === "mindmap" ? "bg-purple-100" :
                                               "bg-red-100"
                    }`}>
                      {resType === "notes"   ? "📝" :
                       resType === "quiz"    ? "🎯" :
                       resType === "code"    ? "💻" :
                       resType === "mindmap" ? "🗺️" : "🎬"}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#888] font-medium">
                        {resType}
                      </span>
                      <h2 className="text-sm font-bold text-[#2a2a2a] -mt-0.5 leading-tight">
                        {activeItem.topic}
                      </h2>
                    </div>
                    {/* Faithfulness Badge for notes and quiz */}
                    {(resType === "notes" || resType === "quiz") && (
                      <div className="ml-auto">
                        <FaithfulnessBadge
                          faithfulness={activeItem.data?.faithfulness}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* ── Notes ── */}
                  {resType === "notes" && (
                    rawContent ? (
                      <div
                        className="study-notes max-w-none pb-8"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(rawContent) }}
                      />
                    ) : (
                      <div className="text-xs text-[#888] space-y-2">
                        <p>Notes generation returned empty content.</p>
                        <p className="text-[10px] text-[#aaa]">
                          This usually means the LLM was rate-limited or the topic has no source material.
                          Try regenerating from the resources panel.
                        </p>
                      </div>
                    )
                  )}

                  {/* ── Quiz ── */}
                  {resType === "quiz" && (
                    res?.questions ? (
                      <div className="space-y-4 pb-8">
                        {res.questions.map((q: any, i: number) => {
                          const ansKey = `${activeItem.id}_${i}`;
                          const selected = quizAnswers[ansKey];
                          const hasAnswered = selected !== undefined;
                          const confidence = quizConfidence[ansKey] || 0;
                          const revealedHints = quizRevealedHints[ansKey] || 0;
                          const eli5Enabled = quizEli5Enabled[ansKey] || false;
                          const isWeakPointQuestion = q.is_weak_point_question || false;
                          const questionType = q.type || 'multiple_choice';

                          // Determine correct answer index
                          const rawCorrect = q.correct_answer ?? q.answer ?? q.correct ?? null;
                          let correctIdx: number | null = null;
                          if (typeof rawCorrect === 'number') {
                            correctIdx = rawCorrect;
                          } else if (typeof rawCorrect === 'string') {
                            const letter = rawCorrect.trim().toUpperCase();
                            if (letter.length === 1 && letter >= 'A' && letter <= 'Z') {
                              correctIdx = letter.charCodeAt(0) - 65;
                            } else {
                              const idx = q.options?.findIndex((o: string) =>
                                o.toLowerCase().trim() === rawCorrect.toLowerCase().trim()
                              );
                              if (idx !== undefined && idx >= 0) correctIdx = idx;
                            }
                          }
                          const isCorrect = hasAnswered && correctIdx !== null && selected === correctIdx;

                          // Get distractor explanations
                          const distractorExplanations = q.distractor_explanations || {};

                          // Get hints (3 progressive hints)
                          const hints = q.hints || [];

                          // Question type display name
                          const questionTypeLabels: Record<string, string> = {
                            'multiple_choice': 'Multiple Choice',
                            'true_false': 'True / False',
                            'scenario_based': 'Scenario',
                            'fill_in_blank': 'Fill in Blank',
                            'matching': 'Matching',
                            'ordering': 'Ordering'
                          };

                          return (
                            <div key={i} className={`rounded-xl border p-3 transition-all ${
                              hasAnswered
                                ? isCorrect
                                  ? 'border-green-400 bg-green-50'
                                  : 'border-red-400 bg-red-50'
                                : isWeakPointQuestion
                                ? 'border-amber-300 bg-amber-50/30'
                                : 'border-[#D6CFC2] bg-[#F7F5F0]'
                            }`}>
                              {/* Question Header with Type Badge */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-xs font-semibold text-[#2a2a2a] flex gap-2">
                                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-black shrink-0 ${
                                    hasAnswered
                                      ? isCorrect ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'
                                      : isWeakPointQuestion ? 'bg-amber-200 text-amber-700' : 'bg-[#B8C3C9]/30 text-[#4a5568]'
                                  }`}>
                                    {hasAnswered ? (isCorrect ? '✓' : '✗') : i + 1}
                                  </span>
                                  <span>{q.question}</span>
                                </p>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isWeakPointQuestion && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-semibold" title="Focus question targeting your weak area">
                                      🎯 Focus
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.5 rounded bg-[#E7E2D7] text-[#666] text-[9px] font-medium">
                                    {questionTypeLabels[questionType] || 'Question'}
                                  </span>
                                </div>
                              </div>

                              {/* Confidence Rating (before answering) */}
                              {!hasAnswered && (
                                <div className="mb-3 ml-7">
                                  <p className="text-[10px] text-[#888] mb-1">How confident are you?</p>
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                      <button
                                        key={level}
                                        onClick={() => setQuizConfidence(prev => ({ ...prev, [ansKey]: level }))}
                                        className={`w-6 h-6 rounded text-[9px] font-bold transition-all ${
                                          confidence >= level
                                            ? 'bg-violet-100 text-violet-700 border border-violet-400'
                                            : 'bg-[#E7E2D7] text-[#999] border border-transparent hover:bg-[#D6CFC2]'
                                        }`}
                                        title={level === 1 ? 'Not confident' : level === 5 ? 'Very confident' : ''}
                                      >
                                        {level}
                                      </button>
                                    ))}
                                    <span className="text-[9px] text-[#888] ml-1">
                                      {confidence === 0 ? 'Select confidence' : confidence <= 2 ? 'Low' : confidence <= 4 ? 'Medium' : 'High'}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Progressive Hints */}
                              {!hasAnswered && hints.length > 0 && (
                                <div className="mb-3 ml-7">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[10px] text-[#888]">Need a hint?</span>
                                    <div className="flex items-center gap-1">
                                      {hints.slice(0, 3).map((_: any, hintIdx: number) => (
                                        <button
                                          key={hintIdx}
                                          onClick={() => setQuizRevealedHints(prev => ({ ...prev, [ansKey]: hintIdx + 1 }))}
                                          disabled={revealedHints > hintIdx}
                                          className={`px-2 py-0.5 rounded text-[9px] font-medium transition-all ${
                                            revealedHints > hintIdx
                                              ? 'bg-violet-100 text-violet-700'
                                              : revealedHints === hintIdx
                                              ? 'bg-[#B8C3C9]/30 text-[#4a5568] hover:bg-[#B8C3C9]/50'
                                              : 'bg-[#E7E2D7] text-[#999]'
                                          }`}
                                        >
                                          {revealedHints > hintIdx ? '✓' : `Hint ${hintIdx + 1}`}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  {revealedHints > 0 && (
                                    <div className="space-y-1">
                                      {hints.slice(0, revealedHints).map((hint: string, idx: number) => (
                                        <div key={idx} className="px-2 py-1.5 rounded bg-violet-50 border border-violet-200">
                                          <p className="text-[10px] text-violet-700">
                                            <span className="font-semibold">Hint {idx + 1}:</span> {hint}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Answer Options */}
                              <div className="space-y-1.5 ml-7">
                                {q.options?.map((opt: string, j: number) => {
                                  const isThis = hasAnswered && selected === j;
                                  const isCorrectOpt = hasAnswered && correctIdx === j;
                                  const distractorKey = opt;
                                  const hasDistractorExp = distractorExplanations[distractorKey] || distractorExplanations[opt.replace(/^[A-Da-d][.)]\s*/, '')];
                                  const showDistractor = quizShowDistractors[`${ansKey}_${j}`];

                                  let btnClass = "w-full text-left px-3 py-1.5 text-[11px] rounded-lg border transition-all ";
                                  if (hasAnswered) {
                                    if (isCorrectOpt) {
                                      btnClass += "bg-green-100 border-green-400 text-green-700";
                                    } else if (isThis) {
                                      btnClass += "bg-red-100 border-red-400 text-red-700";
                                    } else {
                                      btnClass += "bg-[#F7F5F0] border-[#E7E2D7] text-[#999]";
                                    }
                                  } else {
                                    btnClass += "bg-[#e9e4da] border-[#D6CFC2] text-[#555] hover:border-[#B8C3C9] hover:bg-[#E7E2D7] cursor-pointer";
                                  }
                                  return (
                                    <div key={j} className="space-y-1">
                                      <button
                                        className={btnClass}
                                        disabled={hasAnswered}
                                        onClick={() => setQuizAnswers((prev) => ({ ...prev, [ansKey]: j }))}
                                      >
                                        <span className={`font-medium mr-1.5 ${isCorrectOpt && hasAnswered ? 'text-green-600' : 'text-[#8a9ba3]'}`}>
                                          {String.fromCharCode(65 + j)}.
                                        </span>
                                        {opt.replace(/^[A-Da-d][.)]\s*/, '')}
                                      </button>
                                      {/* Distractor Explanation (only for wrong answers after answering) */}
                                      {hasAnswered && isThis && !isCorrectOpt && hasDistractorExp && (
                                        <div className="ml-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                                          <p className="text-[10px] text-red-700">
                                            <span className="font-semibold">Why this is wrong:</span> {hasDistractorExp}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Explanation Section (after answering) */}
                              {hasAnswered && (
                                <div className="mt-3 ml-7 space-y-2">
                                  {/* ELI5 Toggle */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setQuizEli5Enabled(prev => ({ ...prev, [ansKey]: !eli5Enabled }))}
                                      className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                                        eli5Enabled
                                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                          : 'bg-[#E7E2D7] text-[#666] hover:bg-[#D6CFC2]'
                                      }`}
                                    >
                                      {eli5Enabled ? '🧒 ELI5 Mode On' : '🧒 ELI5 Mode'}
                                    </button>
                                    {confidence > 0 && (
                                      <span className="text-[10px] text-[#888]">
                                        Your confidence: {'★'.repeat(confidence)}{'☆'.repeat(5-confidence)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Explanation */}
                                  <div className="px-3 py-2 rounded-lg bg-[#C9D2D6]/20 border border-[#B8C3C9]/30">
                                    <p className="text-[10px] text-[#4a5568] leading-relaxed">
                                      <span className="font-semibold">{eli5Enabled && q.eli5_explanation ? 'Simple Explanation:' : 'Explanation:'}</span>{' '}
                                      {eli5Enabled && q.eli5_explanation ? q.eli5_explanation : q.explanation}
                                    </p>
                                  </div>

                                  {/* Common Misconceptions */}
                                  {q.common_misconceptions && q.common_misconceptions.length > 0 && (
                                    <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                                      <p className="text-[10px] font-semibold text-amber-700 mb-1">Common Misconceptions:</p>
                                      <ul className="space-y-0.5">
                                        {q.common_misconceptions.map((m: string, mi: number) => (
                                          <li key={mi} className="text-[10px] text-amber-700 flex items-start gap-1">
                                            <span>•</span> {m}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Quiz Summary */}
                        <div className="mt-4 p-3 rounded-xl bg-[#E7E2D7]/50 border border-[#D6CFC2]">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[11px] font-semibold text-[#4a5568]">
                                Score: {res.questions.filter((q: any, i: number) => {
                                  const ansKey = `${activeItem.id}_${i}`;
                                  const selected = quizAnswers[ansKey];
                                  const rawCorrect = q.correct_answer ?? q.answer ?? q.correct ?? null;
                                  let correctIdx: number | null = null;
                                  if (typeof rawCorrect === 'number') {
                                    correctIdx = rawCorrect;
                                  } else if (typeof rawCorrect === 'string') {
                                    const letter = rawCorrect.trim().toUpperCase();
                                    if (letter.length === 1 && letter >= 'A' && letter <= 'Z') {
                                      correctIdx = letter.charCodeAt(0) - 65;
                                    } else {
                                      const idx = q.options?.findIndex((o: string) =>
                                        o.toLowerCase().trim() === rawCorrect.toLowerCase().trim()
                                      );
                                      if (idx !== undefined && idx >= 0) correctIdx = idx;
                                    }
                                  }
                                  return selected !== undefined && correctIdx !== null && selected === correctIdx;
                                }).length} / {res.questions.length}
                              </p>
                              <p className="text-[10px] text-[#888]">
                                {res.metadata?.weak_point_coverage ? `${Math.round(res.metadata.weak_point_coverage * 100)}% targeting weak areas` : ''}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                // Reset quiz state
                                res.questions.forEach((_: any, i: number) => {
                                  const ansKey = `${activeItem.id}_${i}`;
                                  delete quizAnswers[ansKey];
                                  delete quizConfidence[ansKey];
                                  delete quizRevealedHints[ansKey];
                                  delete quizEli5Enabled[ansKey];
                                });
                                setQuizAnswers({ ...quizAnswers });
                                setQuizConfidence({ ...quizConfidence });
                                setQuizRevealedHints({ ...quizRevealedHints });
                                setQuizEli5Enabled({ ...quizEli5Enabled });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#B8C3C9]/30 text-[#4a5568] text-[10px] font-medium hover:bg-[#B8C3C9]/50 transition-all"
                            >
                              Retake Quiz
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : rawContent ? (
                      <div
                        className="study-notes max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(rawContent) }}
                      />
                    ) : (
                      <p className="text-[#888] text-xs">Quiz content is loading or unavailable…</p>
                    )
                  )}

                  {/* ── Code ── */}
                  {resType === "code" && (
                    res?.problem ? (
                      <CodeExercise data={res} topic={activeItem.topic} />
                    ) : rawContent ? (
                      <div
                        className="study-notes max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(rawContent) }}
                      />
                    ) : (
                      <p className="text-[#888] text-xs">Code content is loading or unavailable…</p>
                    )
                  )}

                  {/* ── Mind Map ── */}
                  {resType === "mindmap" && (
                    res?.nodes && res?.edges ? (
                      <div className="flex-1 min-h-0">
                        <InteractiveMindMap
                          nodes={res.nodes}
                          edges={res.edges}
                          topic={currentTopic}
                          isGenerating={isGenerating}
                          onNodeClick={handleMindMapNodeClick}
                        />
                      </div>
                    ) : res?.nodes ? (
                      <div className="flex-1 min-h-0">
                        <InteractiveMindMap
                          nodes={res.nodes}
                          edges={res.nodes.filter((n: any) => n.level > 0).map((n: any) => ({
                            from: res.nodes.find((p: any) => p.level === n.level - 1)?.id || 'root',
                            to: n.id,
                            label: 'relates to'
                          }))}
                          topic={currentTopic}
                          isGenerating={isGenerating}
                        />
                      </div>
                    ) : rawContent ? (
                      <div
                        className="study-notes max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(rawContent) }}
                      />
                    ) : (
                      <p className="text-[#888] text-xs">Mind map content is loading or unavailable…</p>
                    )
                  )}

                  {/* ── Lecture Slides ── */}
                  {resType === "video" && (
                    res?.slides && res.slides.length > 0 ? (
                      <div className="flex-1 min-h-0 pb-4">
                        <LecturePlayer data={res} topic={activeItem.topic} />
                      </div>
                    ) : rawContent ? (
                      <div
                        className="study-notes max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(rawContent) }}
                      />
                    ) : (
                      <p className="text-[#888] text-xs">Lecture slides are loading or unavailable…</p>
                    )
                  )}
                </div>
              );
            })()}
          </div>
          );
        })()
        }
          </div>{/* end preview view */}
        </div>{/* end grid overlay */}
      </div>

      {/* ── Quiz Config Modal ── */}
      {showQuizConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowQuizConfig(false)}
          />
          {/* Card */}
          <div className="relative w-[360px] rounded-2xl border border-[#D6CFC2] bg-white shadow-2xl shadow-black/20 overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400" />

            <div className="p-6">
              {/* Close */}
              <button
                onClick={() => setShowQuizConfig(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[#E7E2D7] text-[#888] hover:text-[#555] transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-md shadow-violet-500/25">
                  <BrainCircuit className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#2a2a2a] leading-tight">Configure Quiz</h3>
                  <p className="text-[11px] text-[#888] mt-0.5">{currentTopic}</p>
                </div>
              </div>

              {/* Difficulty */}
              <div className="mb-5">
                <label className="text-[10px] uppercase tracking-widest text-[#888] font-medium mb-2.5 block">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'easy' as const, emoji: '🟢', active: 'bg-green-100 border-green-400 text-green-700 shadow-sm' },
                    { key: 'medium' as const, emoji: '🟠', active: 'bg-orange-100 border-orange-400 text-orange-700 shadow-sm' },
                    { key: 'hard' as const, emoji: '🔴', active: 'bg-red-100 border-red-400 text-red-700 shadow-sm' },
                  ]).map(({ key, emoji, active }) => (
                    <button
                      key={key}
                      onClick={() => setQuizDifficulty(key)}
                      className={`py-2.5 rounded-xl text-[11px] font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                        quizDifficulty === key
                          ? active
                          : 'bg-[#F7F5F0] border-[#D6CFC2] text-[#888] hover:bg-[#E7E2D7] hover:text-[#555]'
                      }`}
                    >
                      <span className="text-sm">{emoji}</span>
                      <span className="capitalize">{key}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div className="mb-6">
                <label className="text-[10px] uppercase tracking-widest text-[#888] font-medium mb-2.5 block">
                  Number of Questions
                </label>
                <div className="flex items-center gap-2">
                  {[3, 5, 7, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setQuizCount(n)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        quizCount === n
                          ? 'bg-[#B8C3C9]/20 border-[#B8C3C9] text-[#4a5568] shadow-sm'
                          : 'bg-[#F7F5F0] border-[#D6CFC2] text-[#999] hover:bg-[#E7E2D7] hover:text-[#666]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={() => {
                  setShowQuizConfig(false);
                  handleAgentClick('quiz', { difficulty: quizDifficulty, count: quizCount });
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-400 to-yellow-400 text-white font-bold text-xs shadow-md shadow-orange-400/25 hover:shadow-orange-400/40 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate {quizCount} Questions · {quizDifficulty.charAt(0).toUpperCase() + quizDifficulty.slice(1)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
