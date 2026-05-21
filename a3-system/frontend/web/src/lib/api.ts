import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // 2 min default — backend can be busy serving concurrent long-running
  // generation requests; specific calls override with shorter/longer values.
  timeout: 120000,
});

// Chat / Profiling
export async function startChat(studentId: string) {
  const res = await api.post("/api/chat/start", { student_id: studentId });
  return res.data;
}

export async function sendMessage(sessionId: string, message: string) {
  // 2 min: backend invokes LLM which can be slow under load
  const res = await api.post(
    "/api/chat/message",
    { session_id: sessionId, message },
    { timeout: 120000 }
  );
  return res.data;
}

// Profile
export async function getProfile(studentId: string) {
  const res = await api.get(`/api/profile/${studentId}`);
  return res.data;
}

export async function createProfile(profile: unknown) {
  const res = await api.post("/api/profile", profile);
  return res.data;
}

// Path Planning
export async function planPath(request: {
  student_id: string;
  course_id: string;
  start_nodes?: string[];
  goal_node?: string;
}) {
  const res = await api.post("/api/path/plan", request);
  return res.data;
}

export interface LearningPathNode {
  node_id: string;
  title: string;
  difficulty: number;
  est_minutes: number;
  status: "completed" | "current" | "locked";
}

export async function getLearningPath(studentId: string, courseId: string = "cloud-computing"): Promise<{
  path: LearningPathNode[];
  currentNodeIndex: number;
  totalEstimatedTime: number;
}> {
  try {
    // First try to get existing path from milestones
    const milestones = await listMilestones(studentId);
    if (milestones && milestones.length > 0) {
      // Convert milestones to path nodes
      const pathNodes: LearningPathNode[] = [];
      let currentIndex = 0;
      let foundCurrent = false;
      
      for (const milestone of milestones) {
        for (const node of milestone.nodes || []) {
          const status = node.completed 
            ? "completed" 
            : !foundCurrent 
              ? "current" 
              : "locked";
          
          if (status === "current") {
            currentIndex = pathNodes.length;
            foundCurrent = true;
          }
          
          pathNodes.push({
            node_id: node.node_id,
            title: node.title,
            difficulty: node.difficulty || 0.5,
            est_minutes: node.est_minutes || 30,
            status,
          });
        }
      }
      
      return {
        path: pathNodes,
        currentNodeIndex: currentIndex,
        totalEstimatedTime: pathNodes.reduce((sum, n) => sum + n.est_minutes, 0),
      };
    }
    
    // If no milestones, generate a new path
    const pathResponse = await planPath({
      student_id: studentId,
      course_id: courseId,
    });

    // Prefer backend-provided node details (includes titles from the
    // knowledge graph). Fall back to bare IDs only if the backend
    // somehow returns just ids (older deployments).
    const backendNodes: Array<{
      node_id: string;
      title: string;
      difficulty: number;
      est_minutes: number;
    }> = Array.isArray(pathResponse.path_nodes) && pathResponse.path_nodes.length > 0
      ? pathResponse.path_nodes
      : (pathResponse.path || []).map((nodeId: string) => ({
          node_id: nodeId,
          title: nodeId,
          difficulty: 0.5,
          est_minutes: 30,
        }));

    // Limit to first 6 nodes for sidebar display
    const limited = backendNodes.slice(0, 6);

    const pathNodes: LearningPathNode[] = limited.map((n, index) => ({
      node_id: n.node_id,
      title: n.title,
      difficulty: n.difficulty,
      est_minutes: n.est_minutes,
      status: index === 0 ? "current" : "locked" as const,
    }));

    return {
      path: pathNodes,
      currentNodeIndex: 0,
      totalEstimatedTime:
        pathResponse.total_estimated_time ||
        pathNodes.reduce((sum, n) => sum + (n.est_minutes || 0), 0),
    };
  } catch (error) {
    console.error("Failed to get learning path:", error);
    // Return empty path on error - will use default
    return {
      path: [],
      currentNodeIndex: 0,
      totalEstimatedTime: 0,
    };
  }
}

// Resources
export async function generateResources(request: unknown) {
  // 5 min - covers batched multi-agent generation with retries.
  const res = await api.post("/api/resources/generate", request, { timeout: 300000 });
  return res.data;
}

export async function getRemedialResources(studentId: string, topic: string) {
  // 3 min: backend may be busy with concurrent generation requests
  const res = await api.get(`/api/resources/remedial/${studentId}/${topic}`, {
    timeout: 180000,
  });
  return res.data;
}

export async function markResourceConsumed(resourceId: string) {
  const res = await api.post(`/api/resources/${resourceId}/consumed`);
  return res.data;
}

// Tutor
export async function askTutor(request: unknown) {
  const res = await api.post("/api/tutor/ask", request);
  return res.data;
}

export interface TutorStreamEvent {
  event: "sources" | "start" | "delta" | "complete" | "error";
  data: any;
}

export async function* askTutorStream(request: unknown): AsyncGenerator<TutorStreamEvent> {
  const res = await fetch(`${API_BASE_URL}/api/tutor/ask/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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
          yield parsed as TutorStreamEvent;
        } catch {
          // ignore malformed lines
        }
      }
    }
  }
}

// Tutor Sessions
export interface TutorSession {
  session_id: string;
  title: string;
  student_id: string;
  session_type: string;
  status: string;
  current_topic: string | null;
  message_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export async function createTutorSession(studentId: string, currentTopic?: string) {
  const res = await api.post("/api/tutor/sessions", { student_id: studentId, current_topic: currentTopic });
  return res.data as TutorSession;
}

export async function listTutorSessions(studentId: string) {
  const res = await api.get("/api/tutor/sessions", { params: { student_id: studentId } });
  return res.data as TutorSession[];
}

export async function getTutorSessionMessages(sessionId: string) {
  const res = await api.get(`/api/tutor/sessions/${sessionId}/messages`);
  return res.data as Array<{
    message_id: string;
    role: string;
    content: string;
    content_type: string;
    created_at: string | null;
  }>;
}

export async function sendTutorMessage(sessionId: string, content: string, currentTopic?: string) {
  const res = await api.post(`/api/tutor/sessions/${sessionId}/messages`, {
    content,
    current_topic: currentTopic,
  });
  return res.data;
}

export async function updateTutorSession(sessionId: string, updates: { title?: string; status?: string }) {
  const res = await api.patch(`/api/tutor/sessions/${sessionId}`, updates);
  return res.data;
}

export async function archiveTutorSession(sessionId: string) {
  await api.delete(`/api/tutor/sessions/${sessionId}`);
}

export async function* sendTutorMessageStream(
  sessionId: string,
  content: string,
  currentTopic?: string,
  abortSignal?: AbortSignal
): AsyncGenerator<TutorStreamEvent> {
  const res = await fetch(`${API_BASE_URL}/api/tutor/sessions/${sessionId}/messages/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, current_topic: currentTopic }),
    signal: abortSignal,
  });

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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
          yield parsed as TutorStreamEvent;
        } catch {
          // ignore malformed lines
        }
      }
    }
  }
}

// Analytics
export async function getAnalytics(studentId: string) {
  const res = await api.get(`/api/analytics/${studentId}`);
  return res.data;
}

export async function getDashboardSummary(studentId: string) {
  const res = await api.get(`/api/analytics/${studentId}/dashboard`);
  return res.data;
}

export async function getAnalyticsInsights(studentId: string, refresh: boolean = false) {
  const res = await api.get(`/api/analytics/${studentId}/insights`, { 
    params: { refresh },
    timeout: 60000 
  });
  return res.data;
}

export async function getAnalyticsProgress(studentId: string, days: number = 30) {
  const res = await api.get(`/api/analytics/${studentId}/progress`, { params: { days } });
  return res.data;
}

export async function getAnalyticsActivity(studentId: string, limit: number = 20) {
  const res = await api.get(`/api/analytics/${studentId}/activity`, { params: { limit } });
  return res.data;
}

// Cohorts & Comparative Analytics
export async function getStudentCohorts(studentId: string) {
  const res = await api.get(`/api/cohorts/student/${studentId}/memberships`);
  return res.data;
}

export async function getCohortStatistics(cohortId: string) {
  const res = await api.get(`/api/cohorts/${cohortId}/statistics`);
  return res.data;
}

export async function getComparativeMetrics(cohortId: string, studentId: string) {
  const res = await api.get(`/api/cohorts/${cohortId}/students/${studentId}/comparative`);
  return res.data;
}

export async function getCohortLeaderboard(cohortId: string, metric: string = "quiz_score", limit: number = 10) {
  const res = await api.get(`/api/cohorts/${cohortId}/leaderboard`, { params: { metric, limit } });
  return res.data;
}

// Quiz
export async function listQuizzes(studentId: string, filters?: { category?: string; difficulty?: string }) {
  const res = await api.get("/api/quiz", { params: { student_id: studentId, ...filters } });
  return res.data;
}

export async function getQuizStats(studentId: string) {
  const res = await api.get("/api/quiz/stats", { params: { student_id: studentId } });
  return res.data;
}

export async function generateQuiz(request: {
  student_id: string;
  topic: string;
  node_id?: string;
  num_questions?: number;
  difficulty?: number;
  context?: string;
}) {
  const res = await api.post("/api/quiz/generate", request, { timeout: 180000 });
  return res.data;
}

export async function getQuiz(quizId: string) {
  const res = await api.get(`/api/quiz/${quizId}`);
  return res.data;
}

export async function startQuiz(quizId: string, studentId: string) {
  const res = await api.post(`/api/quiz/${quizId}/start`, null, {
    params: { student_id: studentId },
  });
  return res.data;
}

export async function submitQuiz(
  quizId: string,
  studentId: string,
  answers: { question_id: string; answer: string }[],
  timeTaken: number
) {
  const res = await api.post(`/api/quiz/${quizId}/submit`,
    { answers, time_taken: timeTaken },
    { params: { student_id: studentId }, timeout: 300000 }
  );
  return res.data;
}

// Milestone
export async function listMilestones(studentId: string) {
  const res = await api.get("/api/milestone", { params: { student_id: studentId } });
  return res.data;
}

export async function getMilestone(milestoneId: string, studentId: string) {
  const res = await api.get(`/api/milestone/${milestoneId}`, {
    params: { student_id: studentId },
  });
  return res.data;
}

export async function getMilestoneNodes(milestoneId: string, studentId: string) {
  const res = await api.get(`/api/milestone/${milestoneId}/nodes`, {
    params: { student_id: studentId },
  });
  return res.data;
}

export async function updateMilestoneProgress(
  milestoneId: string,
  nodeId: string,
  completed: boolean,
  studentId: string
) {
  const res = await api.post(`/api/milestone/${milestoneId}/progress`,
    { node_id: nodeId, completed },
    { params: { student_id: studentId } }
  );
  return res.data;
}

// Auth
export async function loginUser(email: string, password: string) {
  const res = await api.post("/api/auth/login", { email, password });
  return res.data;
}

export async function registerUser(payload: {
  email: string;
  password: string;
  name: string;
  experience: string;
  background: string;
  learning_style: string;
  goals: string[];
  weekly_hours: string;
}) {
  const res = await api.post("/api/auth/register", payload);
  return res.data;
}

export async function getMe(studentId: string) {
  const res = await api.get("/api/auth/me", { params: { student_id: studentId } });
  return res.data;
}

// Image Analysis
export async function analyzeImage(
  file: File,
  studentId: string,
  question?: string
): Promise<{
  analysis: string;
  model_used: string | null;
  success: boolean;
  error?: string;
}> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("student_id", studentId);
  if (question) {
    formData.append("question", question);
  }

  const res = await api.post("/api/tutor/analyze-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
}

export async function extractEquation(
  file: File,
  studentId: string
): Promise<{
  analysis: string;
  latex: string | null;
  model_used: string | null;
  success: boolean;
  error?: string;
}> {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("student_id", studentId);

  const res = await api.post("/api/tutor/extract-equation", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
}
