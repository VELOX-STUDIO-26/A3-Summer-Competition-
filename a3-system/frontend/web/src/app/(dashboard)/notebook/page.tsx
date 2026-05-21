"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { getLearningPath, generateResources, getRemedialResources, markResourceConsumed, analyzeImage } from "@/lib/api";
import { useGateStatus } from "@/hooks/useTracking";
import { useVoiceStream } from "@/hooks/useVoiceStream";
import { useTutorSessions } from "@/hooks/useTutorSessions";
import { useQuizState } from "@/hooks/useQuizState";
import TutorSessionSidebar from "@/components/tutor/TutorSessionSidebar";
import {
  LearningPathPanel,
  ChatPanel,
  AgentPanel,
  QuizConfigModal,
  ResourcePreview,
} from "@/components/notebook";

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

interface PathNode {
  id: string;
  title: string;
  status: "completed" | "current" | "locked";
}

interface GeneratedResource {
  id: string;
  type: "notes" | "quiz" | "code" | "mindmap" | "video";
  topic: string;
  data: any;
  timestamp: number;
  isRemedial?: boolean;
  weakConcepts?: string[];
  consumed?: boolean;
}

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

  // Derived progress indicators
  const currentNodePosition = Math.max(0, learningPath.findIndex((n) => n.status === "current"));
  const progressLabel = `${currentNodePosition + 1} of ${learningPath.length}`;
  const totalHours = totalEstimatedMinutes / 60;
  const durationLabel = totalHours >= 1 ? `~${totalHours.toFixed(totalHours < 10 ? 1 : 0)} hours` : `~${totalEstimatedMinutes} min`;
  const headerSummary = `${learningPath.length} topics • ${durationLabel}`;

  // Gate status for current milestone
  const currentMilestoneId = currentTopic.replace(/\s+/g, "_").toLowerCase();
  const { gateStatus, loading: gateLoading, refresh: refreshGate } = useGateStatus({
    studentId: studentId || "anonymous",
    milestoneId: currentMilestoneId,
    pollInterval: 15000,
    enabled: !!studentId,
  });

  // Resource generation state
  const [generatedResources, setGeneratedResources] = useState<GeneratedResource[]>([]);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const autoGenerateTriggered = useRef(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const lastStudentId = useRef<string | null>(null);

  // Remedial resources state
  const [remedialResources, setRemedialResources] = useState<GeneratedResource[]>([]);

  // Mobile responsive state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

  // Tutor session management
  const {
    sessions,
    activeSessionId,
    messages: sessionMessages,
    isLoading: isLoadingSessions,
    isSending,
    newChat,
    loadSession,
    sendMessage: sendSessionMessage,
    stopStream,
    archiveSession,
    renameSession,
  } = useTutorSessions(studentId);

  const [hasInitializedSession, setHasInitializedSession] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isStreamingRef = useRef(false);
  const resourcesLoaded = useRef(false);
  const initialLoadDone = useRef(false);

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Resource panel state
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);

  // Quiz state (using custom hook)
  const quizState = useQuizState();

  // Quiz config UI
  const [showQuizConfig, setShowQuizConfig] = useState(false);
  const [quizDifficulty, setQuizDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [quizCount, setQuizCount] = useState(5);

  // ASR language
  const [asrLanguage, setAsrLanguage] = useState<"en_us" | "zh_cn">("en_us");

  // Voice input
  const voice = useVoiceStream({
    language: asrLanguage,
    onPartial: (text) => setInputValue(text),
    onFinal: (text) => setInputValue(text),
    onError: (msg) => console.warn("Voice streaming error:", msg),
  });

  // Persist generated resources to localStorage
  const STORAGE_KEY = `a3_resources_${studentId || "anonymous"}`;

  // Reset state when studentId changes
  useEffect(() => {
    if (studentId && studentId !== lastStudentId.current) {
      lastStudentId.current = studentId;
      autoGenerateTriggered.current = false;
      setGeneratedResources([]);
      setLearningPath(DEFAULT_PATH);
      setCurrentTopic("Cloud Computing");
      setIsLoadingPath(true);
    }
  }, [studentId]);

  // Fetch learning path
  useEffect(() => {
    async function fetchPath() {
      if (!studentId) {
        setIsLoadingPath(false);
        return;
      }
      try {
        const pathData = await getLearningPath(studentId);
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
          const currentNode = convertedPath.find((n) => n.status === "current");
          if (currentNode) setCurrentTopic(currentNode.title);
        }
      } catch (error) {
        console.error("Failed to fetch learning path:", error);
      } finally {
        setIsLoadingPath(false);
      }
    }
    fetchPath();
  }, [studentId]);

  // Fetch remedial resources
  useEffect(() => {
    async function fetchRemedial() {
      if (!studentId || !currentTopic) return;
      const hasAttemptedQuiz = typeof window !== "undefined" && localStorage.getItem(`quiz_attempted:${studentId}`) === "1";
      if (!hasAttemptedQuiz) return;
      try {
        const data = await getRemedialResources(studentId, currentTopic);
        if (data.resources && data.resources.length > 0) {
          const mapped: GeneratedResource[] = data.resources.map((r: any) => ({
            id: r.id,
            type: r.resource_type as GeneratedResource["type"],
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
      }
    }
    fetchRemedial();
  }, [studentId, currentTopic]);

  // Auto-generate resources
  useEffect(() => {
    async function autoGenerateResources() {
      if (autoGenerateTriggered.current || isLoadingPath || !studentId || !currentTopic) return;
      if (generatedResources.some((r) => r.topic === currentTopic)) return;

      autoGenerateTriggered.current = true;
      setIsAutoGenerating(true);

      const agentMap: Record<string, string> = {
        notes: "content",
        mindmap: "mindmap",
        quiz: "quiz",
        video: "media",
        code: "code",
      };
      const uiIdByBackend: Record<string, string> = Object.fromEntries(
        Object.entries(agentMap).map(([ui, be]) => [be, ui])
      );
      const backendAgents = ["notes", "mindmap", "quiz", "video", "code"].map((a) => agentMap[a] || a);

      try {
        const result = await generateResources({
          topic: currentTopic,
          student_id: studentId || "anonymous",
          profile: profile || {},
          context: "",
          agents: backendAgents,
          agent_kwargs: { num_questions: 5, difficulty_override: 0.5 },
        });

        const resources = result?.resources || {};
        const newItems: GeneratedResource[] = [];

        for (const [backendAgent, data] of Object.entries(resources)) {
          const uiId = uiIdByBackend[backendAgent] || backendAgent;
          if (data && typeof data === "object" && "error" in (data as any)) continue;
          newItems.push({
            id: `${uiId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: uiId as GeneratedResource["type"],
            topic: currentTopic,
            data,
            timestamp: Date.now(),
          });
        }

        if (newItems.length > 0) {
          setGeneratedResources((prev) => [...newItems, ...prev]);
        }
      } catch (error) {
        console.error("Batched auto-generate failed:", error);
      } finally {
        setIsAutoGenerating(false);
      }
    }
    autoGenerateResources();
  }, [isLoadingPath, profile, currentTopic, studentId, generatedResources]);

  // Load resources from localStorage
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
    } catch {}
  }, [STORAGE_KEY]);

  // Save resources to localStorage
  useEffect(() => {
    if (!resourcesLoaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(generatedResources));
    } catch {}
  }, [generatedResources, STORAGE_KEY]);

  // Set initial welcome message
  useEffect(() => {
    if (!isLoadingPath && !activeSessionId && messages.length === 0) {
      const completedCount = learningPath.filter((n) => n.status === "completed").length;
      const totalCount = learningPath.length;
      const progressText =
        completedCount > 0
          ? `You've already mastered ${completedCount} of ${totalCount} topics — that's amazing progress! 🎉`
          : "I'm so excited to start this learning journey with you! 🌟";

      setMessages([
        {
          role: "assistant",
          content: `Hey${userName ? ` ${userName}` : ""}! ${progressText}\n\nI see you're diving into **${currentTopic}** right now — that's a fantastic topic! 🚀\n\nI'm here to make learning cloud computing fun and approachable. Whether you want me to:\n• 🧠 **Explain concepts** in a way that clicks for you\n• 🎯 **Walk through examples** step by step\n• 💡 **Connect ideas** to what you've already learned\n• ❓ **Answer specific questions** — no question is too small!\n\nWhat would you like to explore first?`,
        },
      ]);
    }
  }, [isLoadingPath, currentTopic, userName, messages.length, learningPath, activeSessionId]);

  // Sync session messages
  useEffect(() => {
    if (activeSessionId) {
      if (sessionMessages.length > 0 && !isStreamingRef.current) {
        setMessages(
          sessionMessages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        );
      } else if (!isLoadingSessions && !isStreamingRef.current) {
        setMessages([]);
      }
    } else if (initialLoadDone.current) {
      setMessages([]);
    }
    initialLoadDone.current = true;
  }, [activeSessionId, sessionMessages, isLoadingSessions]);

  // Auto-create first session
  useEffect(() => {
    if (!hasInitializedSession && !isLoadingPath && studentId && sessions.length === 0) {
      setHasInitializedSession(true);
      newChat(currentTopic).then((sessionId) => {
        if (sessionId) {
          setMessages([
            {
              role: "assistant",
              content: `Hi${userName ? ` ${userName}` : " there"}! 👋 Welcome to your AI learning companion. I'm here to help you master **${currentTopic}**.\n\nFeel free to ask me anything - whether it's explaining concepts, working through problems, or just chatting about what you're learning. What's on your mind?`,
            },
          ]);
        }
      });
    }
  }, [hasInitializedSession, isLoadingPath, studentId, sessions.length, newChat, currentTopic, userName]);

  // Send message to tutor
  const sendMessageToTutor = async (userMessage: string, topicOverride?: string) => {
    if (isLoading || isSending) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await newChat(currentTopic);
      if (!sessionId) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Failed to start a new chat session. Please try again." }]);
        return;
      }
    }

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    isStreamingRef.current = true;
    setMessages((prev) => [...prev, { role: "assistant", content: "", isStreaming: true }]);

    let fullResponse = "";
    try {
      await sendSessionMessage(
        userMessage,
        topicOverride || currentTopic,
        (text) => {
          fullResponse = text;
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg?.role === "assistant") lastMsg.content = text;
            return updated;
          });
        },
        sessionId
      );

      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg?.role === "assistant") {
          lastMsg.content = fullResponse || "...";
          delete lastMsg.isStreaming;
        }
        return updated;
      });
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg?.role === "assistant") {
          lastMsg.content = "Oh no! 🤔 I'm having a little trouble right now. Let me try again in just a moment!";
          delete lastMsg.isStreaming;
        }
        return updated;
      });
    } finally {
      isStreamingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !selectedImage) || isLoading || isSending || isAnalyzingImage) return;

    if (selectedImage) {
      await handleImageAnalysis();
      return;
    }

    const msg = inputValue.trim();
    setInputValue("");
    await sendMessageToTutor(msg);
  };

  const handleStopStream = () => {
    stopStream();
    setIsLoading(false);
  };

  const handleImageAnalysis = async () => {
    if (!selectedImage || !studentId) return;

    setIsAnalyzingImage(true);
    const question = inputValue.trim();
    const imageFile = selectedImage;
    const preview = imagePreview;

    setSelectedImage(null);
    setImagePreview(null);
    setInputValue("");

    setMessages((prev) => [...prev, { role: "user", content: question || "Please analyze this image.", imageUrl: preview || undefined }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "", isStreaming: true }]);
    setIsLoading(true);

    try {
      const result = await analyzeImage(imageFile, studentId, question);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: result.analysis || "I couldn't analyze this image. Please try again.",
        };
        return newMessages;
      });
    } catch (error) {
      console.error("Image analysis failed:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: "Sorry, I couldn't analyze the image. Please try again or describe what you see.",
        };
        return newMessages;
      });
    } finally {
      setIsAnalyzingImage(false);
      setIsLoading(false);
    }
  };

  const handleMindMapNodeClick = (nodeLabel: string) => {
    const prompt = `Give me a brief introduction to "${nodeLabel}" and suggest 2-3 follow-up questions I could ask.`;
    sendMessageToTutor(prompt, nodeLabel);
  };

  const handleAgentClick = async (agentId: string, quizOpts?: { difficulty: string; count: number }) => {
    if (agentId === "quiz" && !quizOpts) {
      setShowQuizConfig(true);
      return;
    }

    setActiveAgent(agentId);
    setIsGenerating(true);

    const agentMap: Record<string, string> = {
      notes: "content",
      mindmap: "mindmap",
      quiz: "quiz",
      video: "media",
      code: "code",
    };

    const backendAgent = agentMap[agentId] || agentId;

    try {
      const agentKwargs: Record<string, any> = {};
      if (agentId === "quiz" && quizOpts) {
        agentKwargs.num_questions = quizOpts.count;
        const diffMap: Record<string, number> = { easy: 0.3, medium: 0.6, hard: 0.85 };
        agentKwargs.difficulty_override = diffMap[quizOpts.difficulty] ?? 0.6;
      }

      const result = await generateResources({
        topic: currentTopic,
        student_id: studentId || "anonymous",
        profile: profile || {},
        context: "",
        agents: [backendAgent],
        agent_kwargs: agentKwargs,
      });

      if (result.resources && result.resources[backendAgent]) {
        const resourceData = result.resources[backendAgent];
        const newId = `${agentId}_${Date.now()}`;
        const newItem: GeneratedResource = {
          id: newId,
          type: agentId as GeneratedResource["type"],
          topic: currentTopic,
          data: resourceData,
          timestamp: Date.now(),
        };
        setGeneratedResources((prev) => [newItem, ...prev]);
        setSelectedResource(newId);
        setIsPreviewExpanded(true);
        if (rightPanelWidth < 480) setRightPanelWidth(480);
      }
    } catch (error) {
      console.error(`Failed to generate ${agentId} content:`, error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkConsumed = async (resourceId: string) => {
    try {
      await markResourceConsumed(resourceId);
      setRemedialResources((prev) => prev.map((r) => (r.id === resourceId ? { ...r, consumed: true } : r)));
    } catch (e) {
      console.error("Failed to mark consumed:", e);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Get active resource for preview
  const activeResource = generatedResources.find((r) => r.id === selectedResource) || remedialResources.find((r) => r.id === selectedResource);

  return (
    <div className="h-screen flex bg-[#F7F5F0] text-[#2a2a2a] overflow-hidden relative">
      {/* Subtle Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E7E2D7]/50 via-[#F7F5F0] to-[#C9D2D6]/30" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#B8C3C9]/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#D6CFC2]/30 rounded-full blur-[128px]" />

      {/* Mobile Backdrop */}
      {(isMobileMenuOpen || isRightPanelOpen) && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => {
            setIsMobileMenuOpen(false);
            setIsRightPanelOpen(false);
          }}
        />
      )}

      {/* Left Panel - Learning Path */}
      <LearningPathPanel
        learningPath={learningPath}
        isLoadingPath={isLoadingPath}
        headerSummary={headerSummary}
        progressLabel={progressLabel}
        currentTopic={currentTopic}
        gateStatus={gateStatus}
        gateLoading={gateLoading}
        refreshGate={refreshGate}
        userName={userName}
        onLogout={handleLogout}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Tutor Session Sidebar */}
      <TutorSessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={async () => {
          const sessionId = await newChat(currentTopic);
          if (sessionId) {
            setMessages([
              {
                role: "assistant",
                content: `Hi${userName ? ` ${userName}` : " there"}! 👋 Welcome to your AI learning companion. I'm here to help you master **${currentTopic}**.\n\nFeel free to ask me anything - whether it's explaining concepts, working through problems, or just chatting about what you're learning. What's on your mind?`,
              },
            ]);
          }
        }}
        onSelectSession={loadSession}
        onArchiveSession={archiveSession}
        onRenameSession={renameSession}
      />

      {/* Center Panel - Chat */}
      <ChatPanel
        messages={messages}
        inputValue={inputValue}
        setInputValue={setInputValue}
        isLoading={isLoading}
        isSending={isSending}
        isLoadingSessions={isLoadingSessions}
        currentTopic={currentTopic}
        activeSessionId={activeSessionId}
        onSendMessage={handleSendMessage}
        onStopStream={handleStopStream}
        voice={{
          isStreaming: voice.isStreaming,
          isConnecting: voice.isConnecting,
          isError: voice.isError,
          toggle: voice.toggle,
        }}
        asrLanguage={asrLanguage}
        setAsrLanguage={setAsrLanguage}
        selectedImage={selectedImage}
        imagePreview={imagePreview}
        setSelectedImage={setSelectedImage}
        setImagePreview={setImagePreview}
        isAnalyzingImage={isAnalyzingImage}
        onOpenLeftPanel={() => setIsMobileMenuOpen(true)}
        onOpenRightPanel={() => setIsRightPanelOpen(true)}
      />

      {/* Right Panel - Agents & Resources */}
      <AgentPanel
        generatedResources={generatedResources}
        remedialResources={remedialResources}
        selectedResource={selectedResource}
        setSelectedResource={setSelectedResource}
        isPreviewExpanded={isPreviewExpanded}
        setIsPreviewExpanded={setIsPreviewExpanded}
        expandedTypes={expandedTypes}
        setExpandedTypes={setExpandedTypes}
        activeAgent={activeAgent}
        isGenerating={isGenerating}
        isAutoGenerating={isAutoGenerating}
        gateStatus={gateStatus}
        onAgentClick={handleAgentClick}
        onMarkConsumed={handleMarkConsumed}
        rightPanelWidth={rightPanelWidth}
        setRightPanelWidth={setRightPanelWidth}
        isRightPanelOpen={isRightPanelOpen}
        onCloseRightPanel={() => setIsRightPanelOpen(false)}
        currentTopic={currentTopic}
        renderPreview={() =>
          activeResource ? (
            <ResourcePreview
              resource={activeResource}
              currentTopic={currentTopic}
              learningPath={learningPath}
              isGenerating={isGenerating}
              onMindMapNodeClick={handleMindMapNodeClick}
              quizState={quizState}
            />
          ) : null
        }
      />

      {/* Quiz Config Modal */}
      <QuizConfigModal
        isOpen={showQuizConfig}
        onClose={() => setShowQuizConfig(false)}
        currentTopic={currentTopic}
        difficulty={quizDifficulty}
        setDifficulty={setQuizDifficulty}
        questionCount={quizCount}
        setQuestionCount={setQuizCount}
        onGenerate={() => {
          setShowQuizConfig(false);
          handleAgentClick("quiz", { difficulty: quizDifficulty, count: quizCount });
        }}
      />
    </div>
  );
}
