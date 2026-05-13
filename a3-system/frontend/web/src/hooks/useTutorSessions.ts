"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  createTutorSession,
  listTutorSessions,
  getTutorSessionMessages,
  archiveTutorSession,
  updateTutorSession,
  sendTutorMessageStream,
  type TutorSession,
  type TutorStreamEvent,
} from "@/lib/api";

export interface ChatMessage {
  message_id: string;
  role: "user" | "assistant";
  content: string;
  content_type: string;
  created_at: string | null;
}

export function useTutorSessions(studentId: string | null) {
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Refs for smooth streaming — avoid React re-render on every delta.
  const streamingTextRef = useRef("");
  const rafRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist activeSessionId to localStorage
  const setActiveSessionId = useCallback((sessionId: string | null) => {
    setActiveSessionIdState(sessionId);
    if (studentId) {
      if (sessionId) {
        localStorage.setItem(`tutor_active_session:${studentId}`, sessionId);
      } else {
        localStorage.removeItem(`tutor_active_session:${studentId}`);
      }
    }
  }, [studentId]);

  // Restore active session from localStorage on mount
  useEffect(() => {
    if (!studentId) return;
    const stored = localStorage.getItem(`tutor_active_session:${studentId}`);
    if (stored) {
      setActiveSessionIdState(stored);
    }
  }, [studentId]);

  // Load messages when active session is restored from localStorage
  useEffect(() => {
    if (activeSessionId && messages.length === 0 && !isLoading) {
      loadSession(activeSessionId);
    }
  }, [activeSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load sessions list
  const loadSessions = useCallback(async () => {
    if (!studentId) return;
    try {
      const data = await listTutorSessions(studentId);
      setSessions(data);
    } catch (e) {
      console.error("Failed to load tutor sessions:", e);
    }
  }, [studentId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Create a new chat session
  const newChat = useCallback(
    async (currentTopic?: string) => {
      if (!studentId) return null;
      try {
        const session = await createTutorSession(studentId, currentTopic);
        setSessions((prev) => [session, ...prev]);
        setActiveSessionId(session.session_id);
        setMessages([]);
        return session.session_id;
      } catch (e) {
        console.error("Failed to create session:", e);
        return null;
      }
    },
    [studentId]
  );

  // Load an existing session and its messages
  const loadSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    try {
      const msgs = await getTutorSessionMessages(sessionId);
      console.log("[loadSession] Raw messages from API:", JSON.stringify(msgs, null, 2));
      const mappedMsgs = msgs.map((m) => ({
        ...m,
        role: m.role as "user" | "assistant",
      }));
      console.log("[loadSession] Mapped messages:", mappedMsgs.map(m => ({ role: m.role, contentLength: m.content?.length || 0, contentPreview: m.content?.substring(0, 50) })));
      setMessages(mappedMsgs);
      setActiveSessionId(sessionId);
    } catch (e) {
      console.error("Failed to load session messages:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Flush accumulated stream text to React state (throttled by RAF).
  const flushStream = useCallback(() => {
    pendingUpdateRef.current = false;
    const text = streamingTextRef.current;
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.role === "assistant") {
        last.content = text;
      }
      return updated;
    });
  }, []);

  const scheduleFlush = useCallback(() => {
    if (pendingUpdateRef.current) return;
    pendingUpdateRef.current = true;
    rafRef.current = requestAnimationFrame(() => {
      flushStream();
    });
  }, [flushStream]);

  // Send a message with streaming
  const sendMessage = useCallback(
    async (
      content: string,
      currentTopic?: string,
      onDelta?: (text: string) => void,
      sessionIdOverride?: string
    ) => {
      const sessionId = sessionIdOverride || activeSessionId;
      if (!sessionId) return;
      setIsSending(true);
      streamingTextRef.current = "";

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Optimistically add user message
      const userMsg: ChatMessage = {
        message_id: `temp_${Date.now()}`,
        role: "user",
        content,
        content_type: "text",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Add placeholder assistant message
      const assistantPlaceholder: ChatMessage = {
        message_id: `temp_${Date.now()}_ai`,
        role: "assistant",
        content: "",
        content_type: "text",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantPlaceholder]);

      try {
        for await (const event of sendTutorMessageStream(
          sessionId,
          content,
          currentTopic,
          abortControllerRef.current.signal
        )) {
          if (event.event === "delta") {
            streamingTextRef.current += event.data;
            onDelta?.(streamingTextRef.current);
            scheduleFlush();
          }
        }
        // Final flush so last chunk isn't dropped
        flushStream();
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          console.log("Stream aborted by user");
          flushStream();
        } else {
          console.error("Stream failed:", e);
          flushStream();
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              last.content = "Sorry, I encountered an error. Please try again.";
            }
            return updated;
          });
        }
      } finally {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        pendingUpdateRef.current = false;
        abortControllerRef.current = null;
        setIsSending(false);
        // Refresh sessions to update message count / title
        if (studentId) {
          const data = await listTutorSessions(studentId);
          setSessions(data);
        }
      }
    },
    [activeSessionId, studentId, scheduleFlush, flushStream]
  );

  // Stop the current stream
  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Archive a session
  const archiveSession = useCallback(
    async (sessionId: string) => {
      try {
        await archiveTutorSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
          setMessages([]);
        }
      } catch (e) {
        console.error("Failed to archive session:", e);
      }
    },
    [activeSessionId]
  );

  // Rename a session
  const renameSession = useCallback(async (sessionId: string, title: string) => {
    try {
      await updateTutorSession(sessionId, { title });
      setSessions((prev) =>
        prev.map((s) => (s.session_id === sessionId ? { ...s, title } : s))
      );
    } catch (e) {
      console.error("Failed to rename session:", e);
    }
  }, []);

  return {
    sessions,
    activeSessionId,
    messages,
    isLoading,
    isSending,
    newChat,
    loadSession,
    sendMessage,
    stopStream,
    archiveSession,
    renameSession,
    refreshSessions: loadSessions,
  };
}
