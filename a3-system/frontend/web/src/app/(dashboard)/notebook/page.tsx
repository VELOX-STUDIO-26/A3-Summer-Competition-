"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { getLearningPath, generateResources, generateResourcesStream, getRemedialResources, markResourceConsumed, analyzeImage, getHierarchicalGraph, ensureSubtopicsForTopic } from "@/lib/api";
import { useGateStatus } from "@/hooks/useTracking";
import { getMilestoneProgress } from "@/lib/tracking";
import { useVoiceStream } from "@/hooks/useVoiceStream";
import { useTutorSessions } from "@/hooks/useTutorSessions";
import { useQuizState } from "@/hooks/useQuizState";
// TutorSessionSidebar removed - sessions now managed via ChatPanel modal
import {
  LearningPathPanel,
  ChatPanel,
  AgentPanel,
  QuizConfigModal,
  ResourcePreview,
} from "@/components/notebook";
import OnboardingTour from "@/components/notebook/OnboardingTour";
import { RatingPrompt } from "@/app/components/PathRating";
import { MessageSquare, Plus, PanelRightOpen } from "lucide-react";

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
  isSubtopic?: boolean;
  parentId?: string; // For subtopics, reference to parent main topic
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
  const searchParams = useSearchParams();
  const { profile, userName, studentId, logout, setActiveGraphId } = useAppStore();

  // Hierarchical graph ID from URL (for rating)
  const graphId = searchParams.get("graph");

  // Remember the active graph so quiz/results pages can navigate back to the
  // correct course (otherwise they drop the ?graph= param).
  useEffect(() => {
    if (graphId) setActiveGraphId(graphId);
  }, [graphId, setActiveGraphId]);
  const [graphSubject, setGraphSubject] = useState<string>("");

  // Onboarding tour — show when arriving from new-path generation
  const showTourParam = searchParams.get("tour") === "1";
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (showTourParam && graphId) {
      const tourKey = `tour_seen_${graphId}`;
      if (!localStorage.getItem(tourKey)) {
        setShowTour(true);
      }
    }
  }, [showTourParam, graphId]);

  const handleTourComplete = useCallback(() => {
    setShowTour(false);
    if (graphId) {
      localStorage.setItem(`tour_seen_${graphId}`, "1");
    }
    // Remove tour param from URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete("tour");
    window.history.replaceState({}, "", url.toString());
  }, [graphId]);

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
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(true);
  const [chatPanelWidth, setChatPanelWidth] = useState(384);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [quotedText, setQuotedText] = useState<string | null>(null);
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
  // Tracks milestones whose lazy subtopic generation has already been attempted
  // this session, to avoid re-triggering the (slow) LLM call on every refetch.
  const materializingTopics = useRef<Set<string>>(new Set());

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

  // Fetch learning path - either from hierarchical graph or legacy milestones
  useEffect(() => {
    async function fetchPath() {
      if (!studentId) {
        setIsLoadingPath(false);
        return;
      }
      
      try {
        // If we have a hierarchical graph ID, load from that
        if (graphId) {
          let graph = await getHierarchicalGraph(graphId);
          if (graph?.main_topics && graph.main_topics.length > 0) {
            // Pull persisted milestone completion so the path advances past
            // milestones the student has already passed the quiz for.
            const slugify = (t: string) => t.replace(/\s+/g, "_").toLowerCase();
            const progress = await getMilestoneProgress(studentId);
            const completedSet = new Set(
              progress
                .filter((p) => p.status === "completed")
                .map((p) => p.milestone_id)
            );

            // Two-pass (lazy) generation: subtopics are filled in per milestone
            // on demand. Find the active milestone (the first not-yet-completed
            // main topic) and, if its subtopics haven't been generated yet,
            // materialize them now so the student has something to study.
            const sortedMains = [...graph.main_topics].sort(
              (a, b) => a.order_index - b.order_index
            );
            const activeMain = sortedMains.find((mt) => {
              const subs = mt.subtopics || [];
              const allDone =
                subs.length > 0 && subs.every((s) => completedSet.has(slugify(s.title)));
              return !allDone;
            });
            if (
              activeMain &&
              (!activeMain.subtopics || activeMain.subtopics.length === 0) &&
              activeMain.node_id &&
              !materializingTopics.current.has(activeMain.node_id)
            ) {
              materializingTopics.current.add(activeMain.node_id);
              try {
                await ensureSubtopicsForTopic(graphId, activeMain.node_id, studentId);
                graph = await getHierarchicalGraph(graphId);
              } catch (err) {
                console.error("Failed to materialize milestone subtopics", err);
              }
            }

            // Convert hierarchical graph to path nodes.
            // A subtopic is "completed" if its milestone is recorded complete;
            // the first not-yet-completed subtopic becomes "current".
            // Sort by order_index to ensure correct milestone ordering.
            const convertedPath: PathNode[] = [];
            let foundCurrentSubtopic = false;
            let currentSubtopicTitle = "";
            const orderedTopics = [...graph.main_topics].sort(
              (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
            );

            for (const mainTopic of orderedTopics) {
              const hasSubtopics = mainTopic.subtopics && mainTopic.subtopics.length > 0;

              // Add main topic as a header node (status filled in after subtopics)
              const mainHeaderIndex = convertedPath.length;
              convertedPath.push({
                id: mainTopic.id,
                title: mainTopic.title,
                status: "locked",
                isSubtopic: false,
                parentId: undefined,
              });

              let allSubsCompleted = hasSubtopics;
              let mainHasCurrent = false;

              if (hasSubtopics) {
                for (let i = 0; i < mainTopic.subtopics.length; i++) {
                  const subtopic = mainTopic.subtopics[i];
                  const isCompleted = completedSet.has(slugify(subtopic.title));
                  let subtopicStatus: "completed" | "current" | "locked";

                  if (isCompleted) {
                    subtopicStatus = "completed";
                  } else if (!foundCurrentSubtopic) {
                    subtopicStatus = "current";
                    foundCurrentSubtopic = true;
                    currentSubtopicTitle = subtopic.title;
                    mainHasCurrent = true;
                  } else {
                    subtopicStatus = "locked";
                  }

                  if (!isCompleted) allSubsCompleted = false;

                  convertedPath.push({
                    id: subtopic.id,
                    title: subtopic.title,
                    status: subtopicStatus,
                    isSubtopic: true,
                    parentId: mainTopic.id,
                  });
                }
              } else if (!foundCurrentSubtopic) {
                // Milestone has no subtopics yet (still generating).
                // Mark it as current so the path starts here.
                mainHasCurrent = true;
                foundCurrentSubtopic = true;
                currentSubtopicTitle = mainTopic.title;
              }

              // Derive main topic status from its subtopics
              if (hasSubtopics && allSubsCompleted) {
                convertedPath[mainHeaderIndex].status = "completed";
              } else if (mainHasCurrent) {
                convertedPath[mainHeaderIndex].status = "current";
              }
            }

            setLearningPath(convertedPath);
            setTotalEstimatedMinutes(graph.total_estimated_minutes || 180);
            setGraphSubject(graph.subject);
            
            // Set current topic to the current SUBTOPIC (for resource generation)
            if (currentSubtopicTitle) {
              setCurrentTopic(currentSubtopicTitle);
            } else if (graph.main_topics[0]) {
              // Fallback if no subtopics
              setCurrentTopic(graph.main_topics[0].title);
            }
            setIsLoadingPath(false);
            return;
          }
        }
        
        // Fallback to legacy milestone-based path
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
  }, [studentId, graphId]);

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

      // Add a single resource to state, de-duplicating by topic+type so a retry
      // or overlapping effect run can't create duplicate cards.
      const addResource = (backendAgent: string, data: unknown) => {
        if (!data || (typeof data === "object" && "error" in (data as Record<string, unknown>))) return;
        const uiId = uiIdByBackend[backendAgent] || backendAgent;
        setGeneratedResources((prev) => {
          if (prev.some((r) => r.topic === currentTopic && r.type === (uiId as GeneratedResource["type"]))) {
            return prev;
          }
          const item: GeneratedResource = {
            id: `${uiId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type: uiId as GeneratedResource["type"],
            topic: currentTopic,
            data,
            timestamp: Date.now(),
          };
          return [item, ...prev];
        });
      };

      try {
        // Stream resources so each card appears as soon as its agent finishes,
        // rather than waiting for the whole batch.
        for await (const evt of generateResourcesStream({
          topic: currentTopic,
          student_id: studentId || "anonymous",
          profile: profile || {},
          context: "",
          agents: backendAgents,
          agent_kwargs: { num_questions: 5, difficulty_override: 0.5 },
        })) {
          if (evt.event === "agent_complete" && evt.agent) {
            addResource(evt.agent, evt.result);
          } else if (evt.event === "complete" && evt.resources) {
            // Safety net: ensure nothing was missed if an event was dropped.
            for (const [backendAgent, data] of Object.entries(evt.resources)) {
              addResource(backendAgent, data);
            }
          }
        }
      } catch (error) {
        console.error("Streaming auto-generate failed, falling back to batch:", error);
        try {
          const result = await generateResources({
            topic: currentTopic,
            student_id: studentId || "anonymous",
            profile: profile || {},
            context: "",
            agents: backendAgents,
            agent_kwargs: { num_questions: 5, difficulty_override: 0.5 },
          });
          for (const [backendAgent, data] of Object.entries(result?.resources || {})) {
            addResource(backendAgent, data);
          }
        } catch (fallbackError) {
          console.error("Batched auto-generate fallback failed:", fallbackError);
        }
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
          : "I'm so excited to start this learning journey with you!";

      setMessages([
        {
          role: "assistant",
          content: `Hey${userName ? ` ${userName}` : ""}! I'm NoboGyan 👋 ${progressText}\n\nI see you're diving into **${currentTopic}** right now — that's a fantastic topic! 🚀\n\nI'm here to make learning **${currentTopic}** fun and approachable. Whether you want me to:\n\n- 🧠 **Explain concepts** in a way that clicks for you\n- 🎯 **Walk through examples** step by step\n- 💡 **Connect ideas** to what you've already learned\n- ❓ **Answer specific questions** — no question is too small!\n\nWant me to start with **what ${currentTopic} actually means** or jump into **why it matters in real-world applications**?`,
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
              content: `Hi${userName ? ` ${userName}` : " there"}! 👋 I'm NoboGyan, your AI learning companion. I'm here to help you master **${currentTopic}**.\n\nFeel free to ask me anything - whether it's explaining concepts, working through problems, or just chatting about what you're learning. What's on your mind?`,
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
    if ((!inputValue.trim() && !selectedImage && !quotedText) || isLoading || isSending || isAnalyzingImage) return;

    if (selectedImage) {
      await handleImageAnalysis();
      return;
    }

    // Build message with quoted context if present
    let msg = inputValue.trim();
    if (quotedText) {
      msg = msg ? `About "${quotedText}": ${msg}` : `I have a question about: "${quotedText}"`;
      setQuotedText(null);
    }
    setInputValue("");
    await sendMessageToTutor(msg);
  };

  // Handle text selection from resources - sends to AI tutor or shows quote
  const handleSendToChat = useCallback(async (selectedText: string, question?: string) => {
    // Open chat panel if collapsed
    setIsRightPanelCollapsed(false);
    
    // Close right panel on mobile to show chat
    if (window.innerWidth < 1024) {
      setIsRightPanelOpen(false);
    }
    
    // If no question provided (user clicked "Ask in chat"), show quote and wait for input
    if (!question) {
      setQuotedText(selectedText);
      return;
    }
    
    // Otherwise, directly send to tutor
    await sendMessageToTutor(question);
  }, [sendMessageToTutor]);

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
    // Open the chat panel so user can see the message being sent
    setIsRightPanelCollapsed(false);
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

  const handleDeleteResource = (resourceId: string) => {
    // Remove from generated resources
    setGeneratedResources((prev) => prev.filter((r) => r.id !== resourceId));
    // Remove from remedial resources if present
    setRemedialResources((prev) => prev.filter((r) => r.id !== resourceId));
    // Clear selection if this resource was selected
    if (selectedResource === resourceId) {
      setSelectedResource(null);
      setIsPreviewExpanded(false);
    }
  };

  const handleSplitView = (resourceId: string) => {
    // Select the resource and expand preview
    setSelectedResource(resourceId);
    setIsPreviewExpanded(true);
    if (rightPanelWidth < 480) setRightPanelWidth(480);
    // Open the chat panel
    setIsRightPanelCollapsed(false);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Get active resource for preview
  const activeResource = generatedResources.find((r) => r.id === selectedResource) || remedialResources.find((r) => r.id === selectedResource);

  return (
    <div className="h-screen flex bg-white text-[#2a2a2a] overflow-hidden relative isolate font-creator-notes">

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
        isCollapsed={isLeftPanelCollapsed}
        onToggleCollapse={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
      />

      {/* Center Panel - Agents & Resources */}
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
        gateLoading={gateLoading}
        refreshGate={refreshGate}
        onAgentClick={handleAgentClick}
        onMarkConsumed={handleMarkConsumed}
        onDeleteResource={handleDeleteResource}
        onSplitView={handleSplitView}
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
              onSendToChat={handleSendToChat}
              quizState={quizState}
            />
          ) : null
        }
        isCenter={true}
      />

      {/* Right Panel - Chat (Collapsible) */}
      {isRightPanelCollapsed ? (
        /* Collapsed state - just expand button */
        <div className="flex flex-col h-full w-10 bg-white items-center pt-3 shrink-0">
          <button
            onClick={() => setIsRightPanelCollapsed(false)}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
            title="Open chat"
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Expanded state - full chat */
            <ChatPanel
              messages={messages}
              inputValue={inputValue}
              setInputValue={setInputValue}
              quotedText={quotedText}
              onClearQuote={() => setQuotedText(null)}
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
              ratingPrompt={
                graphId && studentId && graphSubject ? (
                  <RatingPrompt
                    graphId={graphId}
                    studentId={studentId}
                    pathSubject={graphSubject}
                    completionPercentage={Math.round(
                      (learningPath.filter((n) => n.status === "completed").length / learningPath.length) * 100
                    )}
                  />
                ) : null
              }
              onSendToChat={handleSendToChat}
              isSidebar={true}
              onCollapse={() => setIsRightPanelCollapsed(true)}
              width={chatPanelWidth}
              onWidthChange={setChatPanelWidth}
              sessions={sessions}
              onNewChat={async () => {
                // If current chat is empty, don't create a new session - just reset the welcome message
                if (messages.length === 0 || (messages.length === 1 && messages[0].role === "assistant")) {
                  setMessages([
                    {
                      role: "assistant",
                      content: `Hi${userName ? ` ${userName}` : " there"}! 👋 I'm NoboGyan, your AI learning companion. I'm here to help you master **${currentTopic}**.\n\nFeel free to ask me anything - whether it's explaining concepts, working through problems, or just chatting about what you're learning. What's on your mind?`,
                    },
                  ]);
                  return;
                }
                // Otherwise create a new session
                const sessionId = await newChat(currentTopic);
                if (sessionId) {
                  setMessages([
                    {
                      role: "assistant",
                      content: `Hi${userName ? ` ${userName}` : " there"}! 👋 I'm NoboGyan, your AI learning companion. I'm here to help you master **${currentTopic}**.\n\nFeel free to ask me anything - whether it's explaining concepts, working through problems, or just chatting about what you're learning. What's on your mind?`,
                    },
                  ]);
                }
              }}
              onSelectSession={loadSession}
              onDeleteSession={archiveSession}
              onClearChat={() => setMessages([])}
            />
      )}

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

      {/* Onboarding Tour */}
      {showTour && <OnboardingTour onComplete={handleTourComplete} />}
    </div>
  );
}
