"""
Pydantic models for API request/response schemas and data validation.

These models define the structure of data exchanged between the API and clients.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Union

from pydantic import BaseModel, Field, field_validator


# ============================================================================
# Enums
# ============================================================================

class CognitiveStyle(str, Enum):
    """Student cognitive learning style."""
    VISUAL = "visual"
    VERBAL = "verbal"
    KINESTHETIC = "kinesthetic"
    MIXED = "mixed"


class ContentType(str, Enum):
    """Types of learning content."""
    VIDEO = "video"
    TEXT = "text"
    INTERACTIVE = "interactive"
    CODE = "code"
    AUDIO = "audio"
    DIAGRAM = "diagram"


class PrerequisiteType(str, Enum):
    """Type of prerequisite relationship."""
    HARD = "hard"  # Must be mastered
    SOFT = "soft"  # Helpful but not required


# ============================================================================
# Base Models
# ============================================================================

class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    class Config:
        from_attributes = True  # Allow ORM model conversion
        populate_by_name = True
        str_strip_whitespace = True


class TimestampMixin(BaseSchema):
    """Mixin for timestamp fields."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)


# ============================================================================
# Knowledge Graph Models
# ============================================================================

class KnowledgeNodeBase(BaseSchema):
    """Base model for knowledge nodes."""
    node_id: str = Field(..., description="Unique node identifier (e.g., N01)")
    title: str = Field(..., min_length=1, max_length=200, description="Node title")
    difficulty: float = Field(..., ge=0.0, le=1.0, description="Difficulty 0-1")
    est_minutes: int = Field(..., ge=5, le=180, description="Estimated learning time")
    topic_tags: List[str] = Field(default_factory=list, description="Topic categories")
    content_types: List[ContentType] = Field(default_factory=list, description="Available content types")


class KnowledgeNodeCreate(KnowledgeNodeBase):
    """Model for creating knowledge nodes."""
    hard_prerequisites: List[str] = Field(default_factory=list, description="Required prerequisites")
    soft_prerequisites: List[str] = Field(default_factory=list, description="Recommended prerequisites")


class KnowledgeNode(KnowledgeNodeBase, TimestampMixin):
    """Full knowledge node model."""
    hard_prerequisites: List[str] = Field(default_factory=list)
    soft_prerequisites: List[str] = Field(default_factory=list)
    rag_chunk_ids: List[str] = Field(default_factory=list, description="Associated RAG chunks")


class KnowledgeGraph(BaseSchema):
    """Knowledge graph container."""
    course_id: str = Field(..., description="Course identifier")
    course_name: str = Field(..., description="Course name")
    nodes: List[KnowledgeNode] = Field(default_factory=list)
    edges: List[Dict[str, Any]] = Field(default_factory=list, description="Edge relationships")


# ============================================================================
# Student Profile Models
# ============================================================================

class KnowledgeBaseEntry(BaseSchema):
    """Single knowledge base entry with score."""
    topic: str
    score: float = Field(..., ge=0.0, le=1.0)


class StudentProfileBase(BaseSchema):
    """Base student profile model."""
    student_id: str = Field(..., description="Unique student identifier")
    cognitive_style: CognitiveStyle = Field(default=CognitiveStyle.MIXED)
    learning_pace: float = Field(default=0.5, ge=0.0, le=1.0)
    content_preferences: List[ContentType] = Field(default_factory=list)


class StudentProfileCreate(StudentProfileBase):
    """Model for creating student profiles."""
    knowledge_base: Dict[str, float] = Field(default_factory=dict, description="Topic mastery scores")
    weak_points: List[str] = Field(default_factory=list)
    goals: List[str] = Field(default_factory=list)


class StudentProfile(StudentProfileBase, TimestampMixin):
    """Full student profile model."""
    knowledge_base: Dict[str, float] = Field(default_factory=dict)
    weak_points: List[str] = Field(default_factory=list)
    goals: List[str] = Field(default_factory=list)
    version: int = Field(default=1, description="Profile version for optimistic locking")


# ============================================================================
# Learning Path Models
# ============================================================================

class Milestone(BaseSchema):
    """Learning milestone containing multiple nodes."""
    index: int = Field(..., description="Milestone number")
    nodes: List[str] = Field(..., description="Node IDs in this milestone")
    duration_minutes: int = Field(..., description="Estimated duration")


class PathMetrics(BaseSchema):
    """Quality metrics for a learning path."""
    dependency_satisfaction: float = Field(..., ge=0.0, le=1.0)
    profile_match: float = Field(..., ge=0.0, le=1.0)
    difficulty_smoothness: float = Field(..., ge=0.0)
    weak_point_coverage: float = Field(..., ge=0.0, le=1.0)
    goal_convergence: bool


class LearningPath(BaseSchema):
    """Generated learning path for a student."""
    path_id: str = Field(..., description="Unique path identifier")
    student_id: str = Field(..., description="Student ID")
    course_id: str = Field(..., description="Course ID")
    path: List[str] = Field(..., description="Ordered node IDs")
    milestones: List[Milestone] = Field(default_factory=list)
    total_estimated_time: int = Field(..., description="Total time in minutes")
    path_hash: str = Field(..., description="Hash for caching")
    metrics: Optional[PathMetrics] = Field(default=None)
    status: str = Field(default="active", description="active, completed, or abandoned")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)


# ============================================================================
# API Request/Response Models
# ============================================================================

class HealthCheckResponse(BaseSchema):
    """Health check response."""
    status: str
    service: str
    version: str


class APIInfoResponse(BaseSchema):
    """API information response."""
    name: str
    version: str
    description: str
    documentation: str
    health: str


class ErrorResponse(BaseSchema):
    """Error response model."""
    error: str
    message: str
    details: Optional[Dict[str, Any]] = Field(default=None)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# Path Planning Request/Response
# ============================================================================

class PathPlanRequest(BaseSchema):
    """Request to generate a learning path."""
    student_id: str = Field(..., description="Student ID")
    course_id: str = Field(..., description="Course ID")
    goal_node: Optional[str] = Field(default=None, description="Target node (default: course end)")
    start_nodes: Optional[List[str]] = Field(default=None, description="Already mastered nodes")


class PathNodeDetail(BaseSchema):
    """Full details for a node in a learning path."""
    node_id: str = Field(..., description="Knowledge graph node ID")
    title: str = Field(..., description="Human-readable node title")
    difficulty: float = Field(..., ge=0.0, le=1.0)
    est_minutes: int = Field(..., description="Estimated time in minutes")
    description: str = Field(default="", description="Short node description")


class PathPlanResponse(BaseSchema):
    """Response with generated learning path."""
    path: List[str] = Field(..., description="Ordered list of node IDs")
    path_nodes: List[PathNodeDetail] = Field(
        default_factory=list,
        description="Full details for each node in path order"
    )
    milestones: List[List[str]] = Field(..., description="Milestone groupings")
    total_estimated_time: int = Field(..., description="Total time in minutes")
    path_hash: str = Field(..., description="Cache hash")
    metrics: Optional[PathMetrics] = Field(default=None)


class PathAdaptRequest(BaseSchema):
    """Request to adapt/adjust a learning path."""
    student_id: str
    event_type: str = Field(..., description="Type of event triggering adaptation")
    event_data: Dict[str, Any] = Field(..., description="Event-specific data")
    current_path: List[str]
    current_index: int


class PathAdaptResponse(BaseSchema):
    """Response with path adaptation results."""
    action: str = Field(..., description="Type of adaptation performed")
    new_path: Optional[List[str]] = Field(default=None)
    affected_range: Optional[tuple] = Field(default=None)
    reason: str


class PathProgressResponse(BaseSchema):
    """Response with student's path progress."""
    student_id: str
    current_milestone: int
    completed_nodes: List[str]
    remaining_nodes: List[str]
    estimated_remaining_time: int
    progress_percentage: float


# ============================================================================
# Tutoring Models
# ============================================================================

class ResponseType(str, Enum):
    """Tutor response type."""
    TEXT = "text"
    DIAGRAM = "diagram"
    WALKTHROUGH = "walkthrough"
    VOICE = "voice"
    VIDEO = "video"


class TutorRequest(BaseSchema):
    """Request to ask the AI tutor."""
    student_id: str = Field(..., description="Student ID for context")
    question: str = Field(..., min_length=1, description="Student's question")
    current_topic: Optional[str] = Field(default=None, description="Current topic node ID")
    response_type: Optional[ResponseType] = Field(default=None, description="Preferred response format")
    hands_free: bool = Field(default=False, description="Request voice response")


class RAGChunk(BaseSchema):
    """Single RAG chunk retrieved for context."""
    chunk_id: str
    node_id: str
    text: str
    source: str


class FaithfulnessInfo(BaseSchema):
    """Faithfulness verification info for tutor response."""
    score: float = Field(default=1.0, ge=0.0, le=1.0, description="Faithfulness score (0-1)")
    verified: bool = Field(default=True, description="Whether content passed verification threshold")
    total_claims: int = Field(default=0, description="Total factual claims found")
    supported_claims: int = Field(default=0, description="Claims supported by sources")
    unverifiable_claims: int = Field(default=0, description="Claims not found in sources")
    citations: List[str] = Field(default_factory=list, description="Source citations found")


class TutorResponse(BaseSchema):
    """Response from the AI tutor."""
    answer: str = Field(..., description="Tutor's answer")
    response_type: ResponseType = Field(default=ResponseType.TEXT)
    sources: List[RAGChunk] = Field(default_factory=list, description="Grounding sources")
    current_topic: Optional[str] = Field(default=None)
    suggested_followups: List[str] = Field(default_factory=list)
    faithfulness: FaithfulnessInfo = Field(default_factory=FaithfulnessInfo, description="Verification metadata")


class TutorStreamEvent(BaseSchema):
    """Server-sent event for streaming tutor responses."""
    event: str = Field(..., description="Event type: start, delta, sources, complete, error")
    data: Union[str, Dict[str, Any], List[Dict[str, Any]], None] = Field(default=None)


class TTSRequest(BaseSchema):
    """Request for text-to-speech synthesis."""
    text: str = Field(..., min_length=1, max_length=5000)
    voice: Optional[str] = Field(default="zh-CN-XiaoxiaoNeural")
    rate: Optional[str] = Field(default="+0%")
    volume: Optional[str] = Field(default="+0%")


# ============================================================================
# Quiz Models
# ============================================================================

class QuizQuestion(BaseSchema):
    """Single quiz question."""
    id: str = Field(..., description="Question ID")
    type: str = Field(..., description="multiple_choice, true_false, open_ended")
    question: str = Field(..., description="Question text")
    options: List[str] = Field(default_factory=list, description="Answer options for MC/TF")
    correct_answer: str = Field(..., description="Correct answer")
    explanation: str = Field(default="", description="Explanation of correct answer")
    difficulty: float = Field(default=0.5, ge=0.0, le=1.0)
    topic_tested: str = Field(default="", description="Topic this question tests")
    hints: List[str] = Field(default_factory=list, description="Hints for the question")


class GeneratedQuiz(BaseSchema):
    """AI-generated quiz stored in database."""
    quiz_id: str = Field(..., description="Unique quiz ID")
    student_id: str = Field(..., description="Student who generated")
    node_id: Optional[str] = Field(default=None, description="Linked knowledge node")
    title: str = Field(..., description="Quiz title")
    description: Optional[str] = Field(default=None)
    topic: str = Field(..., description="Topic being tested")
    difficulty: float = Field(default=0.5, ge=0.0, le=1.0)
    num_questions: int = Field(default=5, ge=1)
    questions: List[QuizQuestion] = Field(default_factory=list)
    weak_points_focus: List[str] = Field(default_factory=list, description="Weak areas targeted")
    estimated_time_minutes: int = Field(default=15, ge=1)
    total_points: int = Field(default=100, ge=1)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class QuizAttemptResponse(BaseSchema):
    """Quiz attempt result."""
    attempt_id: str = Field(..., description="Unique attempt ID")
    quiz_id: str = Field(..., description="Quiz ID")
    student_id: str = Field(..., description="Student ID")
    score: float = Field(..., ge=0.0, le=1.0, description="Score percentage")
    correct_count: int = Field(..., ge=0)
    total_questions: int = Field(..., ge=1)
    passed: bool = Field(...)
    xp_earned: int = Field(default=0)
    time_taken: int = Field(..., description="Time in seconds")
    answers: List[Dict[str, Any]] = Field(default_factory=list)
    weak_topics: List[str] = Field(default_factory=list)
    started_at: datetime
    completed_at: Optional[datetime] = None


class GenerateQuizRequest(BaseSchema):
    """Request to generate a new quiz."""
    student_id: str = Field(..., description="Student ID")
    topic: str = Field(..., description="Topic to test")
    node_id: Optional[str] = Field(default=None, description="Optional linked node")
    complexity_level: str = Field(default="standard", description="beginner | standard | complex | advanced")
    attempt_number: int = Field(default=1, ge=1, description="Which attempt this is")
    num_questions: Optional[int] = Field(default=None, ge=5, le=12, description="Override question count")
    difficulty: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Override difficulty")
    context: str = Field(default="", description="Content material to base questions on")


class QuizAnswerSubmission(BaseSchema):
    """Single answer in a quiz submission."""
    question_id: str
    answer: str
    justification: Optional[str] = Field(default=None, description="Justification for True/False answers")


class QuizSubmissionRequest(BaseSchema):
    """Submit quiz answers."""
    answers: List[QuizAnswerSubmission]
    time_taken: int = Field(..., description="Time taken in seconds")
