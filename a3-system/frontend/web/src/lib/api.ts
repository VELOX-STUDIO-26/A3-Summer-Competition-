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

// Google OAuth login - creates or links account
export async function loginWithGoogle(payload: {
  email: string;
  name: string;
  firebase_uid: string;
  photo_url?: string;
}) {
  const res = await api.post("/api/auth/google", payload);
  return res.data;
}

// Delete user account and all associated data
export async function deleteAccount(studentId: string): Promise<{ message: string; student_id: string }> {
  const res = await api.delete(`/api/auth/account/${studentId}`);
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

// ============================================================================
// Dynamic Knowledge Graphs
// ============================================================================

export interface GraphNode {
  node_id: string;
  title: string;
  description: string;
  difficulty: number;
  estimated_minutes: number;
  prerequisites: string[];
  topic_tags: string[];
}

export interface SocialProof {
  verified_by_count: number;
  avg_rating: number;
  completion_rate: number;
  times_used: number;
  status: string;
  first_verified_by: string | null;
}

export interface GraphSearchResult {
  id: string;
  subject: string;
  similarity: number;
  status: string;
  times_used: number;
  acceptance_rate: number;
  avg_rating: number;
  verified_by_count: number;
  node_count: number;
}

export interface GenerateGraphResponse {
  graph_id: string;
  subject: string;
  is_valid: boolean;
  validation_errors: string[];
  node_count: number;
  estimated_weeks: number;
  preview_id: string | null;
  remaining_generations: number;
}

export interface PathPreviewResponse {
  preview_id: string;
  path_sequence: string[];
  path_details: Record<string, unknown>;
  social_proof: SocialProof;
  expires_at: string;
}

export interface GraphDetailResponse {
  id: string;
  subject: string;
  difficulty_level: string;
  estimated_weeks: number;
  node_count: number;
  status: string;
  social_proof: SocialProof;
  nodes: GraphNode[];
  tags: string[];
}

export interface QuotaResponse {
  can_generate: boolean;
  remaining: number;
  is_premium: boolean;
  subject: string;
}

export async function searchGraphs(
  subject: string,
  goals: string[] = [],
  minStatus: string = "user_verified",
  limit: number = 10
): Promise<{ graphs: GraphSearchResult[]; total: number }> {
  const res = await api.post("/api/graphs/search", {
    subject,
    goals,
    min_status: minStatus,
    limit,
  });
  return res.data;
}

export async function generateGraph(
  studentId: string,
  subject: string,
  goals: string[] = [],
  knowledgeBase: Record<string, number> = {},
  cognitiveStyle: string = "mixed",
  learningPace: number = 0.5,
  isPremium: boolean = false
): Promise<GenerateGraphResponse> {
  const res = await api.post(
    "/api/graphs/generate",
    {
      subject,
      goals,
      knowledge_base: knowledgeBase,
      cognitive_style: cognitiveStyle,
      learning_pace: learningPace,
    },
    {
      params: { student_id: studentId, is_premium: isPremium },
      timeout: 180000, // 3 min for LLM generation
    }
  );
  return res.data;
}

export async function getGraph(graphId: string): Promise<GraphDetailResponse> {
  const res = await api.get(`/api/graphs/${graphId}`);
  return res.data;
}

export async function previewPath(
  graphId: string,
  studentId: string
): Promise<PathPreviewResponse> {
  const res = await api.post("/api/graphs/preview", {
    graph_id: graphId,
    student_id: studentId,
  });
  return res.data;
}

export async function acceptPath(
  previewId: string,
  studentId: string
): Promise<{ success: boolean; graph_id: string; path_sequence: string[]; message: string }> {
  const res = await api.post("/api/graphs/accept", {
    preview_id: previewId,
    student_id: studentId,
  });
  return res.data;
}

export async function editPath(
  previewId: string,
  action: "skip" | "remove" | "reorder" | "add",
  nodeId: string,
  newPosition?: number
): Promise<{ success: boolean; path_sequence: string[]; edits_applied: number }> {
  const res = await api.post("/api/graphs/edit", {
    preview_id: previewId,
    action,
    node_id: nodeId,
    new_position: newPosition,
  });
  return res.data;
}

export async function regenerateGraph(
  studentId: string,
  subject: string,
  goals: string[] = [],
  feedback?: string,
  isPremium: boolean = false
): Promise<GenerateGraphResponse> {
  const res = await api.post(
    "/api/graphs/regenerate",
    {
      subject,
      student_id: studentId,
      goals,
      feedback,
    },
    {
      params: { is_premium: isPremium },
      timeout: 180000,
    }
  );
  return res.data;
}

export async function rateGraph(
  graphId: string,
  studentId: string,
  rating: number,
  feedback?: string
): Promise<{ success: boolean; new_avg_rating: number }> {
  const res = await api.post("/api/graphs/rate", {
    graph_id: graphId,
    student_id: studentId,
    rating,
    feedback,
  });
  return res.data;
}

export async function getQuota(
  studentId: string,
  subject: string,
  isPremium: boolean = false
): Promise<QuotaResponse> {
  const res = await api.get(`/api/graphs/quota/${studentId}`, {
    params: { subject, is_premium: isPremium },
  });
  return res.data;
}

export async function getSocialProof(graphId: string): Promise<SocialProof> {
  const res = await api.get(`/api/graphs/${graphId}/social-proof`);
  return res.data;
}

// ============================================================================
// Hierarchical Knowledge Graph API (v2.1)
// ============================================================================

export interface SubtopicInfo {
  id: string;
  node_id: string;
  title: string;
  description: string | null;
  order_index: number;
  difficulty: number;
  estimated_minutes: number;
  learning_points: string[];
  topic_tags: string[];
  content_types: string[];
  prerequisites: string[];
}

export interface MainTopicInfo {
  id: string;
  node_id: string;
  title: string;
  description: string | null;
  order_index: number;
  difficulty: number;
  estimated_minutes: number;
  subtopic_count: number;
  prerequisites: string[];
  topic_tags: string[];
  subtopics: SubtopicInfo[];
}

export interface HierarchicalGraphResponse {
  id: string;
  subject: string;
  subject_normalized: string;
  difficulty_level: string;
  estimated_duration_weeks: number;
  main_topic_count: number;
  total_subtopic_count: number;
  total_estimated_minutes: number;
  tags: string[];
  status: string;
  verified_by_count: number;
  avg_rating: number;
  main_topics: MainTopicInfo[];
}

export interface GenerateHierarchicalGraphResponse {
  graph: HierarchicalGraphResponse;
  is_new: boolean;
  remaining_generations: number;
}

export interface SubtopicProgressInfo {
  subtopic_id: string;
  main_topic_id: string;
  status: "locked" | "unlocked" | "in_progress" | "completed" | "skipped";
  gate_score: number;
  quiz_unlocked: boolean;
  quiz_score: number | null;
  quiz_passed: boolean;
  bypass_mode: boolean;
  started_at: string | null;
  completed_at: string | null;
}

export interface StudentProgressResponse {
  graph_id: string;
  student_id: string;
  progress: SubtopicProgressInfo[];
  completed_count: number;
  total_count: number;
  completion_percentage: number;
}

export interface ResourcesResponse {
  subtopic_id: string;
  from_cache: boolean;
  resources: Record<string, unknown>;
}

export async function generateHierarchicalGraph(
  subject: string,
  studentId: string,
  options: {
    goals?: string[];
    knowledgeBase?: Record<string, number>;
    cognitiveStyle?: string;
    learningPace?: number;
    isPremium?: boolean;
  } = {}
): Promise<GenerateHierarchicalGraphResponse> {
  const res = await api.post(
    "/api/hierarchical/generate",
    {
      subject,
      goals: options.goals || [],
      knowledge_base: options.knowledgeBase || {},
      cognitive_style: options.cognitiveStyle || "mixed",
      learning_pace: options.learningPace || 0.5,
    },
    {
      params: {
        student_id: studentId,
        is_premium: options.isPremium || false,
      },
      timeout: 300000, // 5 minutes for generation (LLM can be slow with retries)
    }
  );
  return res.data;
}

export async function getHierarchicalGraph(
  graphId: string
): Promise<HierarchicalGraphResponse> {
  const res = await api.get(`/api/hierarchical/${graphId}`);
  return res.data;
}

export async function acceptHierarchicalGraph(
  graphId: string,
  studentId: string
): Promise<{
  accepted: boolean;
  graph_id: string;
  progress_initialized: number;
  first_subtopic_id: string | null;
}> {
  const res = await api.post(`/api/hierarchical/${graphId}/accept`, null, {
    params: { student_id: studentId },
  });
  return res.data;
}

export async function getStudentProgress(
  graphId: string,
  studentId: string
): Promise<StudentProgressResponse> {
  const res = await api.get(`/api/hierarchical/${graphId}/progress`, {
    params: { student_id: studentId },
  });
  return res.data;
}

export async function startSubtopic(
  subtopicId: string,
  studentId: string
): Promise<{ started: boolean; subtopic_id: string; status: string }> {
  const res = await api.post(
    "/api/hierarchical/subtopic/start",
    { subtopic_id: subtopicId },
    { params: { student_id: studentId } }
  );
  return res.data;
}

export async function completeSubtopic(
  subtopicId: string,
  studentId: string,
  quizScore: number,
  bypassMode: boolean = false
): Promise<{
  passed: boolean;
  quiz_score: number;
  next_subtopic_id: string | null;
  message: string;
}> {
  const res = await api.post(
    "/api/hierarchical/subtopic/complete",
    {
      subtopic_id: subtopicId,
      quiz_score: quizScore,
      bypass_mode: bypassMode,
    },
    { params: { student_id: studentId } }
  );
  return res.data;
}

export async function bypassSubtopic(
  subtopicId: string,
  studentId: string
): Promise<{
  bypassed: boolean;
  subtopic_id: string;
  quiz_unlocked: boolean;
  message: string;
}> {
  const res = await api.post(
    "/api/hierarchical/subtopic/bypass",
    { subtopic_id: subtopicId },
    { params: { student_id: studentId } }
  );
  return res.data;
}

export async function getSubtopicResources(
  subtopicId: string,
  studentId: string,
  options: {
    difficulty?: number;
    cognitiveStyle?: string;
    forceRegenerate?: boolean;
  } = {}
): Promise<ResourcesResponse> {
  const res = await api.post(
    "/api/hierarchical/resources/get",
    {
      subtopic_id: subtopicId,
      difficulty: options.difficulty || 0.5,
      cognitive_style: options.cognitiveStyle || "mixed",
      force_regenerate: options.forceRegenerate || false,
    },
    { params: { student_id: studentId } }
  );
  return res.data;
}

export async function prefetchResources(
  currentSubtopicId: string,
  studentId: string,
  count: number = 2
): Promise<{ queued_count: number; subtopic_ids: string[] }> {
  const res = await api.post(
    "/api/hierarchical/resources/prefetch",
    {
      current_subtopic_id: currentSubtopicId,
      count,
    },
    { params: { student_id: studentId } }
  );
  return res.data;
}

export async function getResourceQueueStatus(
  studentId: string
): Promise<{
  queue_items: Array<{
    id: string;
    subtopic_id: string;
    priority: number;
    status: string;
    created_at: string | null;
  }>;
  total_pending: number;
}> {
  const res = await api.get("/api/hierarchical/resources/queue", {
    params: { student_id: studentId },
  });
  return res.data;
}

export async function getHierarchicalQuota(
  studentId: string,
  subject: string,
  isPremium: boolean = false
): Promise<{ can_generate: boolean; remaining: number; is_premium: boolean }> {
  const res = await api.get(`/api/hierarchical/quota/${studentId}`, {
    params: { subject, is_premium: isPremium },
  });
  return res.data;
}

// ============================================================================
// Path Rating & Analytics
// ============================================================================

export interface PathRatingRequest {
  overall_rating: number; // 1-5
  content_quality?: number;
  difficulty_appropriateness?: number;
  structure_clarity?: number;
  feedback_text?: string;
  would_recommend?: boolean;
}

export interface PathRatingResponse {
  success: boolean;
  message: string;
  rating_id: string;
}

export interface PathRatingsData {
  total_ratings: number;
  average_rating: number;
  rating_distribution: Record<number, number>;
  would_recommend_percentage: number;
  avg_content_quality?: number;
  avg_difficulty_appropriateness?: number;
  avg_structure_clarity?: number;
  recent_reviews: Array<{
    rating: number;
    feedback: string | null;
    completion_percentage: number;
    created_at: string | null;
  }>;
}

export async function submitPathRating(
  graphId: string,
  studentId: string,
  rating: PathRatingRequest
): Promise<PathRatingResponse> {
  const res = await api.post(
    `/api/analytics/paths/${graphId}/rate`,
    rating,
    { params: { student_id: studentId } }
  );
  return res.data;
}

export async function getPathRatings(graphId: string): Promise<PathRatingsData> {
  const res = await api.get(`/api/analytics/paths/${graphId}/ratings`);
  return res.data;
}

export interface TopRatedPath {
  id: string;
  subject: string;
  avg_rating: number;
  rating_count: number;
  main_topic_count: number;
  total_subtopic_count: number;
  difficulty_level: string;
  status: string;
}

export async function getTopRatedPaths(
  subject?: string,
  minRatings: number = 3,
  limit: number = 10
): Promise<TopRatedPath[]> {
  const res = await api.get("/api/analytics/paths/top-rated", {
    params: { subject, min_ratings: minRatings, limit },
  });
  return res.data;
}

// Learning Session Tracking
export interface SessionResponse {
  session_id: string;
  started_at: string;
  duration_seconds?: number;
}

export async function startLearningSession(
  studentId: string,
  graphId: string,
  subtopicId?: string,
  deviceType?: "desktop" | "mobile" | "tablet"
): Promise<SessionResponse> {
  const res = await api.post(
    "/api/analytics/sessions/start",
    { graph_id: graphId, subtopic_id: subtopicId, device_type: deviceType },
    { params: { student_id: studentId } }
  );
  return res.data;
}

export async function endLearningSession(
  sessionId: string,
  resourcesViewed: number = 0,
  interactionsCount: number = 0,
  quizAttempts: number = 0
): Promise<SessionResponse> {
  const res = await api.post(`/api/analytics/sessions/${sessionId}/end`, {
    resources_viewed: resourcesViewed,
    interactions_count: interactionsCount,
    quiz_attempts: quizAttempts,
  });
  return res.data;
}

export async function recordSessionActivity(
  sessionId: string,
  activityType: string
): Promise<{ success: boolean }> {
  const res = await api.post(
    `/api/analytics/sessions/${sessionId}/activity`,
    null,
    { params: { activity_type: activityType } }
  );
  return res.data;
}
