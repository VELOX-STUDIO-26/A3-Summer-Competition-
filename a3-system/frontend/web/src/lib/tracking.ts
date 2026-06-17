/**
 * Resource Tracking Utilities
 *
 * Tracks student engagement with learning resources and sends events to backend.
 * Each resource type has specific tracking logic based on the specification.
 */

import { api } from "./api";

// ============================================================================
// Types
// ============================================================================

export type ResourceType = "notes" | "mindmap" | "video" | "code" | "practice_quiz";

export interface TrackingEvent {
  student_id: string;
  milestone_id: string;
  resource_id: string;
  resource_type: ResourceType;
  event_type: string;
  value: number;
  metadata: Record<string, any>;
}

export interface GateStatus {
  student_id: string;
  milestone_id: string;
  gate_score: number;
  quiz_unlocked: boolean;
  bypass_mode: boolean;
  resource_scores: Record<ResourceType, number>;
  engagement_quality: "deep" | "surface" | "skipped";
  engagement_signals: {
    likely_read_notes: boolean;
    replayed_video_sections: boolean;
    debugged_code_actively: boolean;
    explored_mindmap_deeply: boolean;
    rushed_through: boolean;
  };
  blocking_resources: ResourceType[];
  recommendation: string;
}

// ============================================================================
// Event Logging
// ============================================================================

/**
 * Log a resource engagement event to the backend.
 */
export async function logEvent(event: TrackingEvent): Promise<{
  logged: boolean;
  gate_score: number;
  quiz_unlocked: boolean;
  blocking_resources: ResourceType[];
}> {
  try {
    const response = await api.post("/api/tracking/events/resource", event);
    return response.data;
  } catch (error) {
    console.error("Failed to log tracking event:", error);
    // Return default values on error so UI doesn't break
    return {
      logged: false,
      gate_score: 0,
      quiz_unlocked: false,
      blocking_resources: [],
    };
  }
}

/**
 * Get current gate status for a milestone.
 */
export async function getGateStatus(
  studentId: string,
  milestoneId: string
): Promise<GateStatus> {
  try {
    const response = await api.get(
      `/api/tracking/gate/status/${studentId}/${milestoneId}`,
      { timeout: 180000 } // 3 min: first call may invoke LLM gate calculation
    );
    return response.data;
  } catch (error) {
    console.error("Failed to get gate status:", error);
    throw error;
  }
}

export interface MilestoneProgressItem {
  milestone_id: string;
  status: string;
  quiz_score: number | null;
  quiz_outcome: string | null;
  completed_at: string | null;
}

/**
 * Get all milestone progress rows for a student.
 *
 * Used by the notebook to advance the learning path past completed
 * milestones to the next current one.
 */
export async function getMilestoneProgress(
  studentId: string
): Promise<MilestoneProgressItem[]> {
  try {
    const response = await api.get(`/api/tracking/milestones/${studentId}`);
    return response.data;
  } catch (error) {
    console.error("Failed to get milestone progress:", error);
    return [];
  }
}

/**
 * Request gate bypass ("I already know this").
 */
export async function bypassGate(
  studentId: string,
  milestoneId: string
): Promise<{ quiz_unlocked: boolean; bypass_mode: boolean; message: string }> {
  try {
    const response = await api.post("/api/tracking/gate/bypass", {
      student_id: studentId,
      milestone_id: milestoneId,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to bypass gate:", error);
    throw error;
  }
}

// ============================================================================
// Notes Tracking
// ============================================================================

interface NotesTrackerState {
  studentId: string;
  milestoneId: string;
  resourceId: string;
  totalSections: number;
  wordCount: number;
  scrollDepth: number;
  maxScrollDepth: number;
  timeSpent: number;
  sectionsRead: Set<number>;
  startTime: number;
  lastScrollTime: number;
}

export class NotesTracker {
  private state: NotesTrackerState;
  private scrollObserver: IntersectionObserver | null = null;
  private timerInterval: NodeJS.Timeout | null = null;

  constructor(
    studentId: string,
    milestoneId: string,
    resourceId: string,
    totalSections: number,
    wordCount: number
  ) {
    this.state = {
      studentId,
      milestoneId,
      resourceId,
      totalSections,
      wordCount,
      scrollDepth: 0,
      maxScrollDepth: 0,
      timeSpent: 0,
      sectionsRead: new Set(),
      startTime: Date.now(),
      lastScrollTime: Date.now(),
    };
  }

  startTracking(container: HTMLElement) {
    // Log open event
    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "notes",
      event_type: "notes_opened",
      value: 0,
      metadata: {
        total_sections: this.state.totalSections,
        word_count: this.state.wordCount,
      },
    });

    // Track scroll depth every 10%
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const depth = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      const depth10 = Math.floor(depth * 10) / 10; // Round to nearest 10%

      if (depth10 > this.state.maxScrollDepth) {
        this.state.maxScrollDepth = depth10;
        this.state.lastScrollTime = Date.now();

        // Log scroll event at 10% intervals
        logEvent({
          student_id: this.state.studentId,
          milestone_id: this.state.milestoneId,
          resource_id: this.state.resourceId,
          resource_type: "notes",
          event_type: "notes_scroll",
          value: depth10,
          metadata: {
            current_section: this.getCurrentSection(container),
          },
        });
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    // Track section visibility
    this.scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionIdx = parseInt(
              entry.target.getAttribute("data-section-idx") || "0"
            );

            if (!this.state.sectionsRead.has(sectionIdx)) {
              this.state.sectionsRead.add(sectionIdx);

              // Log section read event
              logEvent({
                student_id: this.state.studentId,
                milestone_id: this.state.milestoneId,
                resource_id: this.state.resourceId,
                resource_type: "notes",
                event_type: "notes_section_read",
                value: sectionIdx / this.state.totalSections,
                metadata: {
                  section_title:
                    entry.target.getAttribute("data-section-title") || "",
                  section_index: sectionIdx,
                  time_spent_seconds: Math.floor(
                    (Date.now() - this.state.startTime) / 1000
                  ),
                },
              });
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    // Observe all sections
    container.querySelectorAll("[data-section-idx]").forEach((section) => {
      this.scrollObserver?.observe(section);
    });

    // Track time spent
    this.timerInterval = setInterval(() => {
      this.state.timeSpent = Date.now() - this.state.startTime;
    }, 1000);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      this.scrollObserver?.disconnect();
      if (this.timerInterval) clearInterval(this.timerInterval);
    };
  }

  stopTracking() {
    const totalTimeSeconds = Math.floor(this.state.timeSpent / 1000);
    const estimatedReadTime = Math.floor(this.state.wordCount / 200) * 60; // 200 wpm

    // Calculate completion based on scroll depth and sections read
    const scrollCompletion = this.state.maxScrollDepth;
    const sectionCompletion =
      this.state.sectionsRead.size / this.state.totalSections;
    const completion = Math.max(scrollCompletion, sectionCompletion);

    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "notes",
      event_type: "notes_closed",
      value: completion,
      metadata: {
        total_time_seconds: totalTimeSeconds,
        estimated_read_time_seconds: estimatedReadTime,
        max_scroll_depth: this.state.maxScrollDepth,
        sections_read: Array.from(this.state.sectionsRead),
        rushed:
          totalTimeSeconds < estimatedReadTime * 0.3 ||
          this.state.maxScrollDepth < 0.5,
      },
    });
  }

  private getCurrentSection(container: HTMLElement): string {
    const sections = container.querySelectorAll("[data-section-idx]");
    let current = "";
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top >= 0 && rect.top < window.innerHeight / 2) {
        current = section.getAttribute("data-section-title") || "";
      }
    });
    return current;
  }
}

// ============================================================================
// MindMap Tracking
// ============================================================================

interface MindMapTrackerState {
  studentId: string;
  milestoneId: string;
  resourceId: string;
  totalNodes: number;
  totalBranches: number;
  nodesClicked: Set<string>;
  nodesExpanded: Set<string>;
  nodeTimes: Map<string, number>;
  startTime: number;
  currentNodeId: string | null;
  currentNodeStartTime: number;
}

export class MindMapTracker {
  private state: MindMapTrackerState;

  constructor(
    studentId: string,
    milestoneId: string,
    resourceId: string,
    totalNodes: number,
    totalBranches: number
  ) {
    this.state = {
      studentId,
      milestoneId,
      resourceId,
      totalNodes,
      totalBranches,
      nodesClicked: new Set(),
      nodesExpanded: new Set(),
      nodeTimes: new Map(),
      startTime: Date.now(),
      currentNodeId: null,
      currentNodeStartTime: 0,
    };
  }

  startTracking() {
    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "mindmap",
      event_type: "mindmap_opened",
      value: 0,
      metadata: {
        total_nodes: this.state.totalNodes,
        total_branches: this.state.totalBranches,
      },
    });
  }

  trackNodeClick(nodeId: string, nodeName: string, depthLevel: number) {
    this.state.nodesClicked.add(nodeId);

    // Track time on previous node
    if (this.state.currentNodeId && this.state.currentNodeStartTime) {
      const timeOnNode = Date.now() - this.state.currentNodeStartTime;
      const prevTime = this.state.nodeTimes.get(this.state.currentNodeId) || 0;
      this.state.nodeTimes.set(this.state.currentNodeId, prevTime + timeOnNode);
    }

    this.state.currentNodeId = nodeId;
    this.state.currentNodeStartTime = Date.now();

    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "mindmap",
      event_type: "node_clicked",
      value: this.state.nodesClicked.size / this.state.totalNodes,
      metadata: {
        node_id: nodeId,
        node_name: nodeName,
        depth_level: depthLevel,
      },
    });
  }

  trackNodeExpand(nodeId: string, timeOnNodeSeconds: number) {
    this.state.nodesExpanded.add(nodeId);

    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "mindmap",
      event_type: "node_expanded",
      value: this.state.nodesExpanded.size / this.state.totalNodes,
      metadata: {
        node_id: nodeId,
        time_on_node_seconds: timeOnNodeSeconds,
      },
    });
  }

  stopTracking() {
    // Add time for current node
    if (this.state.currentNodeId && this.state.currentNodeStartTime) {
      const timeOnNode = Date.now() - this.state.currentNodeStartTime;
      const prevTime = this.state.nodeTimes.get(this.state.currentNodeId) || 0;
      this.state.nodeTimes.set(this.state.currentNodeId, prevTime + timeOnNode);
    }

    const totalTimeSeconds = Math.floor((Date.now() - this.state.startTime) / 1000);
    const nodesInteracted = Math.max(
      this.state.nodesClicked.size,
      this.state.nodesExpanded.size
    );
    const completion = nodesInteracted / this.state.totalNodes;

    // Calculate average time per node
    let totalNodeTime = 0;
    this.state.nodeTimes.forEach((time) => {
      totalNodeTime += time;
    });
    const avgTimePerNode =
      this.state.nodeTimes.size > 0
        ? totalNodeTime / this.state.nodeTimes.size / 1000
        : 0;

    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "mindmap",
      event_type: "mindmap_closed",
      value: completion,
      metadata: {
        total_time_seconds: totalTimeSeconds,
        nodes_clicked: Array.from(this.state.nodesClicked),
        nodes_expanded: Array.from(this.state.nodesExpanded),
        avg_time_per_node_seconds: avgTimePerNode,
        rushed: avgTimePerNode < 1.5,
      },
    });
  }
}

// ============================================================================
// Video Tracking
// ============================================================================

interface VideoTrackerState {
  studentId: string;
  milestoneId: string;
  resourceId: string;
  totalDuration: number;
  secondsWatched: number;
  replayCount: number;
  playbackSpeed: number;
  pauseCount: number;
  lastPosition: number;
  segmentsWatched: Set<number>; // 10-second segments
  startTime: number;
}

export class VideoTracker {
  private state: VideoTrackerState;

  constructor(
    studentId: string,
    milestoneId: string,
    resourceId: string,
    totalDuration: number
  ) {
    this.state = {
      studentId,
      milestoneId,
      resourceId,
      totalDuration,
      secondsWatched: 0,
      replayCount: 0,
      playbackSpeed: 1.0,
      pauseCount: 0,
      lastPosition: 0,
      segmentsWatched: new Set(),
      startTime: Date.now(),
    };
  }

  startTracking() {
    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "video",
      event_type: "video_started",
      value: 0,
      metadata: {
        total_duration_seconds: this.state.totalDuration,
      },
    });
  }

  trackProgress(currentPosition: number) {
    // Track unique 10-second segments
    const segment = Math.floor(currentPosition / 10);
    this.state.segmentsWatched.add(segment);

    // Calculate actual seconds watched (unique segments × 10)
    this.state.secondsWatched = this.state.segmentsWatched.size * 10;

    // Check for replay (seeked backwards)
    if (currentPosition < this.state.lastPosition - 5) {
      this.state.replayCount++;

      logEvent({
        student_id: this.state.studentId,
        milestone_id: this.state.milestoneId,
        resource_id: this.state.resourceId,
        resource_type: "video",
        event_type: "video_replayed",
        value: currentPosition / this.state.totalDuration,
        metadata: {
          replay_start: currentPosition,
          replay_section: `${Math.floor(currentPosition)}-${Math.floor(
            this.state.lastPosition
          )}`,
          replay_count: this.state.replayCount,
        },
      });
    }

    this.state.lastPosition = currentPosition;

    // Log progress every 10 seconds of video time
    if (Math.floor(currentPosition) % 10 === 0) {
      logEvent({
        student_id: this.state.studentId,
        milestone_id: this.state.milestoneId,
        resource_id: this.state.resourceId,
        resource_type: "video",
        event_type: "video_progress",
        value: currentPosition / this.state.totalDuration,
        metadata: {
          current_position: currentPosition,
          seconds_watched: this.state.secondsWatched,
        },
      });
    }
  }

  trackPause(currentPosition: number) {
    this.state.pauseCount++;

    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "video",
      event_type: "video_paused",
      value: currentPosition / this.state.totalDuration,
      metadata: {
        pause_count: this.state.pauseCount,
        position_seconds: currentPosition,
      },
    });
  }

  trackSpeedChange(newSpeed: number) {
    this.state.playbackSpeed = newSpeed;

    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "video",
      event_type: "video_speed_changed",
      value: this.state.lastPosition / this.state.totalDuration,
      metadata: {
        new_speed: newSpeed,
      },
    });
  }

  trackComplete() {
    const watchPercentage = this.state.secondsWatched / this.state.totalDuration;

    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "video",
      event_type: "video_completed",
      value: 1.0,
      metadata: {
        total_watch_time: this.state.secondsWatched,
        watch_percentage: watchPercentage,
        replay_count: this.state.replayCount,
        playback_speed: this.state.playbackSpeed,
        rushed: this.state.playbackSpeed > 2.0 || watchPercentage < 0.8,
      },
    });
  }
}

// ============================================================================
// Code Exercise Tracking
// ============================================================================

interface CodeTrackerState {
  studentId: string;
  milestoneId: string;
  resourceId: string;
  totalTests: number;
  language: string;
  linesWritten: number;
  runCount: number;
  testsPassed: number;
  testsFailed: number;
  errors: string[];
  hasEdited: boolean;
}

export class CodeTracker {
  private state: CodeTrackerState;

  constructor(
    studentId: string,
    milestoneId: string,
    resourceId: string,
    totalTests: number,
    language: string
  ) {
    this.state = {
      studentId,
      milestoneId,
      resourceId,
      totalTests,
      language,
      linesWritten: 0,
      runCount: 0,
      testsPassed: 0,
      testsFailed: 0,
      errors: [],
      hasEdited: false,
    };
  }

  startTracking() {
    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "code",
      event_type: "code_opened",
      value: 0,
      metadata: {
        total_tests: this.state.totalTests,
        language: this.state.language,
      },
    });
  }

  trackEdit(linesWritten: number) {
    if (!this.state.hasEdited) {
      this.state.hasEdited = true;

      logEvent({
        student_id: this.state.studentId,
        milestone_id: this.state.milestoneId,
        resource_id: this.state.resourceId,
        resource_type: "code",
        event_type: "code_edited",
        value: 0.3,
        metadata: {
          lines_written: linesWritten,
        },
      });
    }
    this.state.linesWritten = linesWritten;
  }

  trackRun(errors: string[] = []) {
    this.state.runCount++;
    if (errors.length > 0) {
      this.state.errors.push(...errors);
    }

    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "code",
      event_type: "code_run",
      value: 0.5,
      metadata: {
        run_count: this.state.runCount,
        errors: errors,
      },
    });
  }

  trackTestsAttempted(passed: number, failed: number, errorMessages: string[] = []) {
    this.state.testsPassed = passed;
    this.state.testsFailed = failed;

    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "code",
      event_type: "tests_attempted",
      value: passed / this.state.totalTests,
      metadata: {
        passed,
        failed,
        error_messages: errorMessages,
      },
    });
  }

  trackComplete(finalTimeSeconds: number) {
    const allPassed = this.state.testsPassed === this.state.totalTests;

    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "code",
      event_type: "code_completed",
      value: allPassed ? 1.0 : this.state.testsPassed / this.state.totalTests,
      metadata: {
        total_run_count: this.state.runCount,
        tests_passed: this.state.testsPassed,
        tests_failed: this.state.testsFailed,
        final_time_seconds: finalTimeSeconds,
        debugged_actively: this.state.runCount > 3,
      },
    });
  }
}

// ============================================================================
// Practice Quiz Tracking
// ============================================================================

interface QuizTrackerState {
  studentId: string;
  milestoneId: string;
  resourceId: string;
  totalQuestions: number;
  questionsAnswered: number;
  answers: Array<{
    questionId: string;
    answer: string;
    correct: boolean;
    timeSeconds: number;
  }>;
  startTime: number;
}

export class QuizTracker {
  private state: QuizTrackerState;

  constructor(
    studentId: string,
    milestoneId: string,
    resourceId: string,
    totalQuestions: number
  ) {
    this.state = {
      studentId,
      milestoneId,
      resourceId,
      totalQuestions,
      questionsAnswered: 0,
      answers: [],
      startTime: Date.now(),
    };
  }

  startTracking() {
    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "practice_quiz",
      event_type: "practice_started",
      value: 0,
      metadata: {
        total_questions: this.state.totalQuestions,
      },
    });
  }

  trackQuestionAnswered(
    questionId: string,
    answer: string,
    correct: boolean,
    timeSeconds: number
  ) {
    this.state.questionsAnswered++;
    this.state.answers.push({
      questionId,
      answer,
      correct,
      timeSeconds,
    });

    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "practice_quiz",
      event_type: "question_answered",
      value: this.state.questionsAnswered / this.state.totalQuestions,
      metadata: {
        question_id: questionId,
        answer,
        correct,
        time_seconds: timeSeconds,
      },
    });
  }

  trackComplete() {
    const correctCount = this.state.answers.filter((a) => a.correct).length;
    const scorePercentage =
      this.state.questionsAnswered > 0
        ? (correctCount / this.state.questionsAnswered) * 100
        : 0;

    logEvent({
      student_id: this.state.studentId,
      milestone_id: this.state.milestoneId,
      resource_id: this.state.resourceId,
      resource_type: "practice_quiz",
      event_type: "practice_completed",
      value: this.state.questionsAnswered / this.state.totalQuestions,
      metadata: {
        questions_answered: this.state.questionsAnswered,
        total_questions: this.state.totalQuestions,
        score_percentage: scorePercentage,
        wrong_question_ids: this.state.answers
          .filter((a) => !a.correct)
          .map((a) => a.questionId),
      },
    });
  }
}
