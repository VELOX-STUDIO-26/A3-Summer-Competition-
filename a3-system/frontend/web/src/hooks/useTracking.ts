/**
 * React Hooks for Resource Tracking
 *
 * Provides easy-to-use hooks for tracking resource engagement in React components.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CodeTracker,
  GateStatus,
  getGateStatus,
  logEvent,
  MindMapTracker,
  NotesTracker,
  QuizTracker,
  ResourceType,
  VideoTracker,
} from "@/lib/tracking";

// ============================================================================
// useNotesTracking Hook
// ============================================================================

interface UseNotesTrackingProps {
  studentId: string;
  milestoneId: string;
  resourceId: string;
  totalSections: number;
  wordCount: number;
  containerRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
}

export function useNotesTracking({
  studentId,
  milestoneId,
  resourceId,
  totalSections,
  wordCount,
  containerRef,
  enabled = true,
}: UseNotesTrackingProps) {
  const trackerRef = useRef<NotesTracker | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    trackerRef.current = new NotesTracker(
      studentId,
      milestoneId,
      resourceId,
      totalSections,
      wordCount
    );

    const cleanup = trackerRef.current.startTracking(containerRef.current);

    return () => {
      cleanup();
      trackerRef.current?.stopTracking();
    };
  }, [
    enabled,
    studentId,
    milestoneId,
    resourceId,
    totalSections,
    wordCount,
    containerRef,
  ]);

  return trackerRef;
}

// ============================================================================
// useMindMapTracking Hook
// ============================================================================

interface UseMindMapTrackingProps {
  studentId: string;
  milestoneId: string;
  resourceId: string;
  totalNodes: number;
  totalBranches: number;
  enabled?: boolean;
}

export function useMindMapTracking({
  studentId,
  milestoneId,
  resourceId,
  totalNodes,
  totalBranches,
  enabled = true,
}: UseMindMapTrackingProps) {
  const trackerRef = useRef<MindMapTracker | null>(null);

  useEffect(() => {
    if (!enabled) return;

    trackerRef.current = new MindMapTracker(
      studentId,
      milestoneId,
      resourceId,
      totalNodes,
      totalBranches
    );

    trackerRef.current.startTracking();

    return () => {
      trackerRef.current?.stopTracking();
    };
  }, [
    enabled,
    studentId,
    milestoneId,
    resourceId,
    totalNodes,
    totalBranches,
  ]);

  const trackNodeClick = useCallback(
    (nodeId: string, nodeName: string, depthLevel: number) => {
      trackerRef.current?.trackNodeClick(nodeId, nodeName, depthLevel);
    },
    []
  );

  const trackNodeExpand = useCallback(
    (nodeId: string, timeOnNodeSeconds: number) => {
      trackerRef.current?.trackNodeExpand(nodeId, timeOnNodeSeconds);
    },
    []
  );

  return { tracker: trackerRef, trackNodeClick, trackNodeExpand };
}

// ============================================================================
// useVideoTracking Hook
// ============================================================================

interface UseVideoTrackingProps {
  studentId: string;
  milestoneId: string;
  resourceId: string;
  totalDuration: number;
  enabled?: boolean;
}

export function useVideoTracking({
  studentId,
  milestoneId,
  resourceId,
  totalDuration,
  enabled = true,
}: UseVideoTrackingProps) {
  const trackerRef = useRef<VideoTracker | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    trackerRef.current = new VideoTracker(
      studentId,
      milestoneId,
      resourceId,
      totalDuration
    );

    trackerRef.current.startTracking();

    return () => {
      // Don't stop tracking on unmount, let it continue
    };
  }, [enabled, studentId, milestoneId, resourceId, totalDuration]);

  const trackProgress = useCallback(
    (currentTime: number) => {
      trackerRef.current?.trackProgress(currentTime);
      setProgress(currentTime / totalDuration);
    },
    [totalDuration]
  );

  const trackPause = useCallback(
    (currentTime: number) => {
      trackerRef.current?.trackPause(currentTime);
    },
    []
  );

  const trackSpeedChange = useCallback(
    (newSpeed: number) => {
      trackerRef.current?.trackSpeedChange(newSpeed);
    },
    []
  );

  const trackComplete = useCallback(() => {
    trackerRef.current?.trackComplete();
  }, []);

  return {
    progress,
    trackProgress,
    trackPause,
    trackSpeedChange,
    trackComplete,
  };
}

// ============================================================================
// useCodeTracking Hook
// ============================================================================

interface UseCodeTrackingProps {
  studentId: string;
  milestoneId: string;
  resourceId: string;
  totalTests: number;
  language: string;
  enabled?: boolean;
}

export function useCodeTracking({
  studentId,
  milestoneId,
  resourceId,
  totalTests,
  language,
  enabled = true,
}: UseCodeTrackingProps) {
  const trackerRef = useRef<CodeTracker | null>(null);

  useEffect(() => {
    if (!enabled) return;

    trackerRef.current = new CodeTracker(
      studentId,
      milestoneId,
      resourceId,
      totalTests,
      language
    );

    trackerRef.current.startTracking();
  }, [enabled, studentId, milestoneId, resourceId, totalTests, language]);

  const trackEdit = useCallback((linesWritten: number) => {
    trackerRef.current?.trackEdit(linesWritten);
  }, []);

  const trackRun = useCallback((errors: string[] = []) => {
    trackerRef.current?.trackRun(errors);
  }, []);

  const trackTestsAttempted = useCallback(
    (passed: number, failed: number, errorMessages: string[] = []) => {
      trackerRef.current?.trackTestsAttempted(passed, failed, errorMessages);
    },
    []
  );

  const trackComplete = useCallback((finalTimeSeconds: number) => {
    trackerRef.current?.trackComplete(finalTimeSeconds);
  }, []);

  return {
    trackEdit,
    trackRun,
    trackTestsAttempted,
    trackComplete,
  };
}

// ============================================================================
// useQuizTracking Hook
// ============================================================================

interface UseQuizTrackingProps {
  studentId: string;
  milestoneId: string;
  resourceId: string;
  totalQuestions: number;
  enabled?: boolean;
}

export function useQuizTracking({
  studentId,
  milestoneId,
  resourceId,
  totalQuestions,
  enabled = true,
}: UseQuizTrackingProps) {
  const trackerRef = useRef<QuizTracker | null>(null);

  useEffect(() => {
    if (!enabled) return;

    trackerRef.current = new QuizTracker(
      studentId,
      milestoneId,
      resourceId,
      totalQuestions
    );

    trackerRef.current.startTracking();
  }, [enabled, studentId, milestoneId, resourceId, totalQuestions]);

  const trackQuestionAnswered = useCallback(
    (
      questionId: string,
      answer: string,
      correct: boolean,
      timeSeconds: number
    ) => {
      trackerRef.current?.trackQuestionAnswered(
        questionId,
        answer,
        correct,
        timeSeconds
      );
    },
    []
  );

  const trackComplete = useCallback(() => {
    trackerRef.current?.trackComplete();
  }, []);

  return {
    trackQuestionAnswered,
    trackComplete,
  };
}

// ============================================================================
// useGateStatus Hook
// ============================================================================

interface UseGateStatusProps {
  studentId: string;
  milestoneId: string;
  pollInterval?: number; // milliseconds
  enabled?: boolean;
}

export function useGateStatus({
  studentId,
  milestoneId,
  pollInterval = 10000, // 10 seconds
  enabled = true,
}: UseGateStatusProps) {
  const [gateStatus, setGateStatus] = useState<GateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (silent = false) => {
    if (!enabled) return;

    if (!silent) setLoading(true);
    try {
      const status = await getGateStatus(studentId, milestoneId);
      setGateStatus(status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [studentId, milestoneId, enabled]);

  useEffect(() => {
    fetchStatus(false); // initial load shows spinner

    if (pollInterval > 0) {
      const interval = setInterval(() => fetchStatus(true), pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, pollInterval]);

  const refresh = useCallback(() => {
    return fetchStatus(false);
  }, [fetchStatus]);

  return {
    gateStatus,
    loading,
    error,
    refresh,
  };
}

// ============================================================================
// useResourceEvent Hook (Generic)
// ============================================================================

interface UseResourceEventProps {
  studentId: string;
  milestoneId: string;
  resourceId: string;
  resourceType: ResourceType;
}

export function useResourceEvent({
  studentId,
  milestoneId,
  resourceId,
  resourceType,
}: UseResourceEventProps) {
  const logResourceEvent = useCallback(
    async (eventType: string, value: number, metadata: Record<string, any> = {}) => {
      return logEvent({
        student_id: studentId,
        milestone_id: milestoneId,
        resource_id: resourceId,
        resource_type: resourceType,
        event_type: eventType,
        value,
        metadata,
      });
    },
    [studentId, milestoneId, resourceId, resourceType]
  );

  return { logEvent: logResourceEvent };
}
