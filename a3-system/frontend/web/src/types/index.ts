export interface StudentProfile {
  student_id: string;
  cognitive_style: "visual" | "verbal" | "kinesthetic" | "mixed";
  learning_pace: number;
  content_preferences: string[];
  knowledge_base: Record<string, number>;
  weak_points: string[];
  goals: string[];
  version: number;
  created_at: string;
  updated_at?: string;
}

export interface LearningPath {
  path: string[];
  milestones: string[][];
  total_estimated_time: number;
  path_hash: string;
  metrics?: {
    dependency_satisfaction: number;
    profile_match: number;
    difficulty_smoothness: number;
    weak_point_coverage: number;
    goal_convergence: boolean;
  };
}

export interface ResourceBundle {
  topic: string;
  resources: Record<string, unknown>;
  metadata: {
    agents_run: string[];
    profile_match: number;
  };
}

export interface TutorResponse {
  answer: string;
  response_type: string;
  sources: Array<{
    chunk_id: string;
    node_id: string;
    text: string;
    source: string;
  }>;
  current_topic?: string;
  suggested_followups: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSession {
  session_id: string;
  student_id: string;
  messages: ChatMessage[];
  status: "active" | "completed";
  profile_snapshot?: StudentProfile;
}
