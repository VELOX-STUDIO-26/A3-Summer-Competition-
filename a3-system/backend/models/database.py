"""
SQLAlchemy ORM models for the A3 Learning System database.

These models define the database schema for:
- Student profiles
- Knowledge graph nodes
- Learning paths
- Chat history
- Quiz results
- Behavioral events
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker

from core.config import settings


# ============================================================================
# Base Model
# ============================================================================

class Base(DeclarativeBase):
    """Base class for all database models."""

    # Default table args
    __table_args__ = {"extend_existing": True}

    def to_dict(self) -> Dict[str, Any]:
        """Convert model instance to dictionary."""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }


# ============================================================================
# Student Profile Models
# ============================================================================

class StudentProfile(Base):
    """Student profile with learning preferences and knowledge state."""

    __tablename__ = "student_profiles"

    student_id = Column(
        String(50),
        primary_key=True,
        index=True,
        comment="Unique student identifier"
    )

    # Knowledge state
    knowledge_base = Column(
        JSONB,
        default={},
        comment="Map of topic_id to mastery score (0.0-1.0)"
    )

    # Learning style
    cognitive_style = Column(
        String(20),
        default="mixed",
        comment="visual | verbal | kinesthetic | mixed"
    )

    # Weak areas
    weak_points = Column(
        ARRAY(String),
        default=list,
        comment="List of topic IDs where student struggles"
    )

    # Goals
    goals = Column(
        ARRAY(String),
        default=list,
        comment="Student learning goals"
    )

    # Pace
    learning_pace = Column(
        Float,
        default=0.5,
        comment="Normalized learning speed (0.0-1.0)"
    )

    # Content preferences
    content_preferences = Column(
        ARRAY(String),
        default=list,
        comment="Preferred content types: video | text | interactive | code | audio | diagram"
    )

    # Versioning
    version = Column(
        Integer,
        default=1,
        comment="Profile version for optimistic locking"
    )

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        comment="Profile creation timestamp"
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        comment="Last update timestamp"
    )

    # Relationships
    learning_paths = relationship("LearningPath", back_populates="student")
    chat_sessions = relationship("ChatSession", back_populates="student")
    quiz_results = relationship("QuizResult", back_populates="student")
    generated_quizzes = relationship("GeneratedQuiz", back_populates="student")
    events = relationship("LearningEvent", back_populates="student")


class UserAccount(Base):
    """User account for authentication."""

    __tablename__ = "user_accounts"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        unique=True
    )

    name = Column(
        String(100),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )


# ============================================================================
# Knowledge Graph Models
# ============================================================================

class KnowledgeNode(Base):
    """Knowledge node representing a learning topic."""

    __tablename__ = "knowledge_nodes"

    node_id = Column(
        String(50),
        primary_key=True,
        index=True,
        comment="Unique node identifier (e.g., N01)"
    )

    course_id = Column(
        String(50),
        ForeignKey("courses.course_id"),
        index=True,
        comment="Parent course"
    )

    title = Column(
        String(200),
        nullable=False,
        comment="Node title"
    )

    difficulty = Column(
        Float,
        default=0.5,
        comment="Normalized difficulty (0.0-1.0)"
    )

    est_minutes = Column(
        Integer,
        default=30,
        comment="Estimated learning time in minutes"
    )

    # Prerequisites
    hard_prerequisites = Column(
        ARRAY(String),
        default=list,
        comment="Required prerequisite node IDs"
    )

    soft_prerequisites = Column(
        ARRAY(String),
        default=list,
        comment="Recommended prerequisite node IDs"
    )

    # Categorization
    topic_tags = Column(
        ARRAY(String),
        default=list,
        comment="Topic categories"
    )

    content_types = Column(
        ARRAY(String),
        default=list,
        comment="Available content types"
    )

    # RAG chunks
    rag_chunk_ids = Column(
        ARRAY(String),
        default=list,
        comment="Associated RAG chunk IDs"
    )

    # Metadata
    description = Column(
        Text,
        nullable=True,
        comment="Node description"
    )

    is_active = Column(
        Boolean,
        default=True,
        comment="Whether node is active"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


class Course(Base):
    """Course containing knowledge nodes."""

    __tablename__ = "courses"

    course_id = Column(
        String(50),
        primary_key=True,
        comment="Unique course identifier"
    )

    name = Column(
        String(200),
        nullable=False,
        comment="Course name"
    )

    description = Column(
        Text,
        nullable=True,
        comment="Course description"
    )

    total_nodes = Column(
        Integer,
        default=0,
        comment="Total number of knowledge nodes"
    )

    is_active = Column(
        Boolean,
        default=True
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


# ============================================================================
# Learning Path Models
# ============================================================================

class LearningPath(Base):
    """Generated learning path for a student."""

    __tablename__ = "learning_paths"

    path_id = Column(
        String(50),
        primary_key=True,
        default=lambda: f"path_{uuid.uuid4().hex[:8]}"
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        index=True
    )

    course_id = Column(
        String(50),
        ForeignKey("courses.course_id"),
        index=True
    )

    # Path data
    path_sequence = Column(
        ARRAY(String),
        default=list,
        comment="Ordered list of node IDs"
    )

    milestones = Column(
        JSONB,
        default=list,
        comment="Milestone groupings with metadata"
    )

    total_estimated_time = Column(
        Integer,
        default=0,
        comment="Total estimated time in minutes"
    )

    path_hash = Column(
        String(64),
        unique=True,
        comment="Hash for caching and versioning"
    )

    # Quality metrics
    metrics = Column(
        JSONB,
        default=dict,
        comment="Path quality metrics"
    )

    # Status
    status = Column(
        String(20),
        default="active",
        comment="active | completed | abandoned"
    )

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationships
    student = relationship("StudentProfile", back_populates="learning_paths")


# ============================================================================
# Chat/Tutoring Models
# ============================================================================

class ChatSession(Base):
    """Chat session between student and AI tutor."""

    __tablename__ = "chat_sessions"

    session_id = Column(
        String(50),
        primary_key=True,
        default=lambda: f"chat_{uuid.uuid4().hex[:8]}"
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        index=True
    )

    # Session metadata
    title = Column(
        String(200),
        nullable=True,
        default="New Chat",
        comment="Auto-generated session title"
    )

    session_type = Column(
        String(20),
        default="tutor",
        comment="tutor | profiling"
    )

    current_node_id = Column(
        String(50),
        nullable=True,
        comment="Current knowledge node context"
    )

    context_summary = Column(
        Text,
        nullable=True,
        comment="Summarized context for continuity"
    )

    # Status
    status = Column(
        String(20),
        default="active",
        comment="active | archived"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationships
    student = relationship("StudentProfile", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session")


class ChatMessage(Base):
    """Individual message in a chat session."""

    __tablename__ = "chat_messages"

    message_id = Column(
        String(50),
        primary_key=True,
        default=lambda: f"msg_{uuid.uuid4().hex[:8]}"
    )

    session_id = Column(
        String(50),
        ForeignKey("chat_sessions.session_id"),
        index=True
    )

    # Message content
    role = Column(
        String(20),
        nullable=False,
        comment="user | assistant | system"
    )

    content = Column(
        Text,
        nullable=False,
        comment="Message content"
    )

    content_type = Column(
        String(20),
        default="text",
        comment="text | diagram | code | audio"
    )

    # Metadata (renamed to avoid conflict with Declarative API)
    meta_data = Column(
        JSONB,
        default=dict,
        comment="Additional message metadata"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    # Relationships
    session = relationship("ChatSession", back_populates="messages")


# ============================================================================
# Quiz/Assessment Models
# ============================================================================

class QuizResult(Base):
    """Student quiz/assessment result."""

    __tablename__ = "quiz_results"

    result_id = Column(
        String(50),
        primary_key=True,
        default=lambda: f"quiz_{uuid.uuid4().hex[:8]}"
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        index=True
    )

    node_id = Column(
        String(50),
        comment="Knowledge node this quiz covers"
    )

    # Results
    score = Column(
        Float,
        comment="Quiz score (0.0-1.0)"
    )

    max_score = Column(
        Float,
        default=1.0,
        comment="Maximum possible score"
    )

    correct_count = Column(
        Integer,
        default=0,
        comment="Number of correct answers"
    )

    total_questions = Column(
        Integer,
        default=0,
        comment="Total number of questions"
    )

    # Detailed results
    answers = Column(
        JSONB,
        default=list,
        comment="Detailed answer data"
    )

    weak_topics = Column(
        ARRAY(String),
        default=list,
        comment="Topics where student struggled"
    )

    time_spent_seconds = Column(
        Integer,
        default=0,
        comment="Time spent on quiz"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    # Relationships
    student = relationship("StudentProfile", back_populates="quiz_results")


class GeneratedQuiz(Base):
    """AI-generated quiz stored for review and reuse."""

    __tablename__ = "generated_quizzes"

    quiz_id = Column(
        String(50),
        primary_key=True,
        default=lambda: f"quiz_{uuid.uuid4().hex[:12]}"
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        index=True,
        comment="Student who generated this quiz"
    )

    node_id = Column(
        String(50),
        nullable=True,
        comment="Linked knowledge node (optional)"
    )

    # Quiz metadata
    title = Column(
        String(200),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    topic = Column(
        String(200),
        nullable=False,
        comment="Topic being tested"
    )

    difficulty = Column(
        Float,
        default=0.5,
        comment="Difficulty level (0.0-1.0)"
    )

    num_questions = Column(
        Integer,
        default=5,
        comment="Number of questions generated"
    )

    # The actual quiz content
    questions = Column(
        JSONB,
        default=list,
        comment="Full quiz questions from QuizAgent"
    )

    weak_points_focus = Column(
        ARRAY(String),
        default=list,
        comment="Weak points this quiz targeted"
    )

    estimated_time_minutes = Column(
        Integer,
        default=15
    )

    total_points = Column(
        Integer,
        default=100
    )

    # Phase 1: Complexity and adaptation fields
    complexity_level = Column(
        String(20),
        default="standard",
        comment="beginner | standard | complex | advanced"
    )

    attempt_number = Column(
        Integer,
        default=1,
        comment="Which attempt this is (1, 2, 3...)"
    )

    previous_wrong_concepts = Column(
        ARRAY(String),
        default=list,
        comment="Concepts student got wrong in previous attempts"
    )

    has_coding = Column(
        Boolean,
        default=False,
        comment="Whether quiz includes coding challenges"
    )

    concept_tags = Column(
        ARRAY(String),
        default=list,
        comment="Concepts tested in this quiz"
    )

    next_milestone_prerequisites = Column(
        ARRAY(String),
        default=list,
        comment="Prerequisites for next milestone"
    )

    is_active = Column(
        Boolean,
        default=True
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    # Relationships
    student = relationship("StudentProfile", back_populates="generated_quizzes")
    attempts = relationship("QuizAttempt", back_populates="quiz")


class QuizAttempt(Base):
    """A student's attempt at a generated quiz."""

    __tablename__ = "quiz_attempts"

    __table_args__ = {"extend_existing": True}

    attempt_id = Column(
        String(50),
        primary_key=True,
        default=lambda: f"attempt_{uuid.uuid4().hex[:12]}"
    )

    quiz_id = Column(
        String(50),
        ForeignKey("generated_quizzes.quiz_id"),
        index=True
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        index=True
    )

    # Results
    score = Column(
        Float,
        comment="Score (0.0-1.0)"
    )

    correct_count = Column(
        Integer,
        default=0
    )

    total_questions = Column(
        Integer,
        default=0
    )

    answers = Column(
        JSONB,
        default=list,
        comment="Student's answers with correctness"
    )

    weak_topics = Column(
        ARRAY(String),
        default=list
    )

    time_spent_seconds = Column(
        Integer,
        default=0
    )

    started_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    # Phase 1: Outcome tracking
    outcome = Column(
        String(20),
        nullable=True,
        comment="accelerate | continue | remediate | replan"
    )

    critical_concepts_failed = Column(
        JSONB,
        default=list,
        comment="Critical prerequisite concepts student failed"
    )

    time_limit_seconds = Column(
        Integer,
        default=1080,
        comment="Time limit for this quiz (18 min default)"
    )

    rushed_through = Column(
        Boolean,
        default=False,
        comment="True if student finished much faster than expected"
    )

    # Relationships
    quiz = relationship("GeneratedQuiz", back_populates="attempts")
    student = relationship("StudentProfile")


# ============================================================================
# Analytics/Event Models
# ============================================================================

class LearningEvent(Base):
    """Behavioral event for learning analytics."""

    __tablename__ = "learning_events"

    event_id = Column(
        String(50),
        primary_key=True,
        default=lambda: f"evt_{uuid.uuid4().hex[:8]}"
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        index=True
    )

    # Event data
    event_type = Column(
        String(50),
        nullable=False,
        comment="Type of event"
    )

    event_data = Column(
        JSONB,
        default=dict,
        comment="Event-specific data"
    )

    # Context
    node_id = Column(
        String(50),
        nullable=True,
        comment="Related knowledge node"
    )

    session_id = Column(
        String(50),
        nullable=True,
        comment="Related session ID"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        index=True
    )

    # Relationships
    student = relationship("StudentProfile", back_populates="events")


# ============================================================================
# Resource Tracking & Evaluation Models
# ============================================================================

class ResourceEvent(Base):
    """Resource engagement event for tracking student interactions."""

    __tablename__ = "resource_events"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        index=True
    )

    milestone_id = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Milestone identifier"
    )

    resource_id = Column(
        String(100),
        nullable=False,
        comment="Unique resource identifier"
    )

    resource_type = Column(
        String(50),
        nullable=False,
        comment="notes | mindmap | video | code | practice_quiz"
    )

    event_type = Column(
        String(100),
        nullable=False,
        comment="Type of event: scroll | click | play | pause | complete | etc"
    )

    value = Column(
        Float,
        default=0.0,
        comment="Completion percentage 0.0-1.0"
    )

    extra_data = Column(
        JSONB,
        default=dict,
        comment="Extra context per event"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )


class GateCalculation(Base):
    """Gate score calculation for milestone quiz unlock."""

    __tablename__ = "gate_calculations"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        index=True
    )

    milestone_id = Column(
        String(100),
        nullable=False,
        index=True
    )

    gate_score = Column(
        Float,
        nullable=False,
        comment="Calculated gate score 0.0-1.0"
    )

    quiz_unlocked = Column(
        Boolean,
        default=False,
        nullable=False
    )

    bypass_mode = Column(
        Boolean,
        default=False,
        nullable=False
    )

    resource_scores = Column(
        JSONB,
        default=dict,
        comment="Individual resource scores: {notes: 0.25, video: 0.20, ...}"
    )

    engagement_quality = Column(
        String(20),
        nullable=False,
        comment="deep | surface | skipped"
    )

    engagement_signals = Column(
        JSONB,
        default=dict,
        comment="Engagement signals: {likely_read_notes, replayed_video, ...}"
    )

    blocking_resources = Column(
        ARRAY(String),
        default=list,
        comment="Resources preventing quiz unlock"
    )

    recommendation = Column(
        Text,
        nullable=True,
        comment="What student should do next"
    )

    calculated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )


class QuizEvaluation(Base):
    """Quiz evaluation result with adaptation decisions."""

    __tablename__ = "quiz_evaluations"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        index=True
    )

    milestone_id = Column(
        String(100),
        nullable=False,
        index=True
    )

    quiz_id = Column(
        String(50),
        ForeignKey("generated_quizzes.quiz_id"),
        nullable=True,
        comment="Associated quiz"
    )

    score_percentage = Column(
        Float,
        nullable=False,
        comment="Quiz score 0.0-1.0"
    )

    time_taken_seconds = Column(
        Integer,
        default=0,
        comment="Time spent on quiz"
    )

    expected_time_seconds = Column(
        Integer,
        default=0,
        comment="Expected time for quiz"
    )

    outcome = Column(
        String(20),
        nullable=False,
        comment="accelerate | continue | remediate | replan"
    )

    next_milestone_unlocked = Column(
        Boolean,
        default=False,
        nullable=False
    )

    concept_analysis = Column(
        JSONB,
        default=list,
        comment="[{concept, severity, likely_cause, evidence}, ...]"
    )

    profile_updates = Column(
        JSONB,
        default=dict,
        comment="{weak_points_add, weak_points_resolve, knowledge_base_updates, ...}"
    )

    regeneration_instructions = Column(
        JSONB,
        default=dict,
        comment="{should_regenerate, scope, target_concepts, format_instructions}"
    )

    quiz_instructions = Column(
        JSONB,
        default=dict,
        comment="{allow_requiz, requiz_unlock_condition, focus_concepts}"
    )

    student_message = Column(
        JSONB,
        default=dict,
        comment="{tone, message}"
    )

    rushed_through = Column(
        Boolean,
        default=False,
        comment="Whether student rushed through resources"
    )

    evaluated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )


class MilestoneProgress(Base):
    """Track student progress through milestones."""

    __tablename__ = "milestone_progress"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        index=True
    )

    milestone_id = Column(
        String(100),
        nullable=False,
        index=True
    )

    node_id = Column(
        String(50),
        ForeignKey("knowledge_nodes.node_id"),
        nullable=True,
        comment="Associated knowledge node"
    )

    status = Column(
        String(20),
        default="locked",
        nullable=False,
        comment="locked | in_progress | completed"
    )

    gate_score = Column(
        Float,
        default=0.0,
        comment="Current gate score"
    )

    quiz_unlocked = Column(
        Boolean,
        default=False
    )

    bypass_mode = Column(
        Boolean,
        default=False
    )

    quiz_score = Column(
        Float,
        nullable=True,
        comment="Final quiz score"
    )

    quiz_outcome = Column(
        String(20),
        nullable=True,
        comment="accelerate | continue | remediate | replan"
    )

    consecutive_low_scores = Column(
        Integer,
        default=0,
        comment="Number of consecutive scores < 60%"
    )

    attempt_count = Column(
        Integer,
        default=0,
        comment="Number of quiz attempts"
    )

    resource_completion = Column(
        JSONB,
        default=dict,
        comment="{notes: 0.8, video: 0.6, mindmap: 0.7, code: 0.5, practice_quiz: 0.9}"
    )

    unlocked_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    __table_args__ = (
        # Ensure unique student-milestone pairs
        {"sqlite_autoincrement": True},
    )


class GeneratedResource(Base):
    """Stores AI-generated learning resources for students."""

    __tablename__ = "generated_resources"

    id = Column(
        String(50),
        primary_key=True,
        default=lambda: f"res_{uuid.uuid4().hex[:12]}"
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        index=True
    )

    topic = Column(
        String(200),
        nullable=False,
        index=True
    )

    resource_type = Column(
        String(50),
        nullable=False,
        comment="notes | mindmap | quiz | video | code"
    )

    content = Column(
        JSONB,
        nullable=False,
        default=dict,
        comment="The actual generated resource content"
    )

    source = Column(
        String(50),
        default="auto",
        nullable=False,
        comment="auto | remedial | user_requested"
    )

    weak_concepts_targeted = Column(
        ARRAY(String),
        default=list,
        comment="Concepts this resource targets (for remedial resources)"
    )

    is_remedial = Column(
        Boolean,
        default=False,
        comment="True if generated after quiz failure"
    )

    consumed = Column(
        Boolean,
        default=False,
        comment="Whether student has opened/viewed this resource"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    # Relationship
    student = relationship("StudentProfile")


# ============================================================================
# Analytics Insights Cache
# ============================================================================

class AnalyticsInsightsCache(Base):
    """Cached LLM-generated analytics insights for students."""

    __tablename__ = "analytics_insights_cache"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        index=True,
        unique=True,
        nullable=False
    )

    # Cached insights data
    insights_data = Column(
        JSONB,
        nullable=False,
        comment="Full insights response including predictions, recommendations, alerts"
    )

    behavioral_summary = Column(
        JSONB,
        nullable=True,
        comment="Behavioral data summary used to generate insights"
    )

    # Cache metadata
    generated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
        comment="When insights were generated"
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="When cache expires and should be regenerated"
    )

    generation_count = Column(
        Integer,
        default=1,
        comment="Number of times insights have been regenerated"
    )

    # Relationship
    student = relationship("StudentProfile")


# ============================================================================
# Cohort & Comparative Analytics Models
# ============================================================================

class Cohort(Base):
    """A cohort/class of students taking a course together."""

    __tablename__ = "cohorts"

    cohort_id = Column(
        String(50),
        primary_key=True,
        default=lambda: f"cohort_{uuid.uuid4().hex[:8]}"
    )

    name = Column(
        String(200),
        nullable=False,
        comment="Cohort name (e.g., 'Cloud Computing - Spring 2026')"
    )

    course_id = Column(
        String(50),
        ForeignKey("courses.course_id"),
        nullable=False,
        index=True
    )

    description = Column(
        Text,
        nullable=True,
        comment="Optional cohort description"
    )

    # Cohort settings
    start_date = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When the cohort officially starts"
    )

    end_date = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When the cohort officially ends"
    )

    is_active = Column(
        Boolean,
        default=True,
        comment="Whether cohort is currently active"
    )

    # Privacy settings
    allow_leaderboard = Column(
        Boolean,
        default=True,
        comment="Whether to show anonymized leaderboard"
    )

    min_members_for_comparison = Column(
        Integer,
        default=5,
        comment="Minimum members required to show comparative stats"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationships
    course = relationship("Course")
    members = relationship("CohortMembership", back_populates="cohort")
    statistics = relationship("CohortStatistics", back_populates="cohort")


class CohortMembership(Base):
    """Student membership in a cohort."""

    __tablename__ = "cohort_memberships"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    cohort_id = Column(
        String(50),
        ForeignKey("cohorts.cohort_id"),
        nullable=False,
        index=True
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        index=True
    )

    role = Column(
        String(20),
        default="student",
        comment="student | ta | instructor"
    )

    # Privacy preferences
    show_in_leaderboard = Column(
        Boolean,
        default=True,
        comment="Whether student opts into leaderboard visibility"
    )

    anonymous_alias = Column(
        String(50),
        nullable=True,
        comment="Anonymous name for leaderboard (e.g., 'Student A')"
    )

    joined_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    # Relationships
    cohort = relationship("Cohort", back_populates="members")
    student = relationship("StudentProfile")

    # Unique constraint: one membership per student per cohort
    __table_args__ = (
        {"extend_existing": True},
    )


class CohortStatistics(Base):
    """Pre-computed statistics for a cohort (cached aggregates)."""

    __tablename__ = "cohort_statistics"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    cohort_id = Column(
        String(50),
        ForeignKey("cohorts.cohort_id"),
        nullable=False,
        index=True
    )

    metric_type = Column(
        String(50),
        nullable=False,
        comment="avg_quiz_score | completion_rate | study_hours | learning_velocity"
    )

    # Aggregate values
    mean_value = Column(
        Float,
        nullable=False,
        comment="Average value across cohort"
    )

    median_value = Column(
        Float,
        nullable=True,
        comment="Median value"
    )

    std_deviation = Column(
        Float,
        nullable=True,
        comment="Standard deviation"
    )

    min_value = Column(
        Float,
        nullable=True
    )

    max_value = Column(
        Float,
        nullable=True
    )

    # Percentile distribution
    percentiles = Column(
        JSONB,
        default=dict,
        comment="Percentile values: {p10, p25, p50, p75, p90}"
    )

    # Sample info
    sample_size = Column(
        Integer,
        nullable=False,
        comment="Number of students included in calculation"
    )

    # Cache metadata
    calculated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="When this statistic should be recalculated"
    )

    # Relationship
    cohort = relationship("Cohort", back_populates="statistics")

    # Unique constraint: one stat per metric per cohort
    __table_args__ = (
        {"extend_existing": True},
    )


class StudentComparativeMetrics(Base):
    """Individual student's comparative metrics within their cohort."""

    __tablename__ = "student_comparative_metrics"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        index=True
    )

    cohort_id = Column(
        String(50),
        ForeignKey("cohorts.cohort_id"),
        nullable=False,
        index=True
    )

    # Comparative metrics
    quiz_score_percentile = Column(
        Float,
        nullable=True,
        comment="Student's percentile rank for quiz scores (0-100)"
    )

    completion_percentile = Column(
        Float,
        nullable=True,
        comment="Student's percentile rank for completion rate"
    )

    study_hours_percentile = Column(
        Float,
        nullable=True,
        comment="Student's percentile rank for study time"
    )

    velocity_percentile = Column(
        Float,
        nullable=True,
        comment="Student's percentile rank for learning velocity"
    )

    # Comparison to average
    quiz_score_vs_avg = Column(
        Float,
        nullable=True,
        comment="Difference from cohort average (positive = above avg)"
    )

    completion_vs_avg = Column(
        Float,
        nullable=True
    )

    study_hours_vs_avg = Column(
        Float,
        nullable=True
    )

    # Rank
    overall_rank = Column(
        Integer,
        nullable=True,
        comment="Overall rank in cohort (1 = top)"
    )

    total_in_cohort = Column(
        Integer,
        nullable=True,
        comment="Total students in cohort for context"
    )

    # Cache metadata
    calculated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False
    )

    # Relationships
    student = relationship("StudentProfile")
    cohort = relationship("Cohort")


# ============================================================================
# Dynamic Knowledge Graph Models (v2.0)
# ============================================================================

class DynamicKnowledgeGraph(Base):
    """LLM-generated knowledge graph for any subject."""

    __tablename__ = "dynamic_knowledge_graphs"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # Identity
    subject = Column(
        String(255),
        nullable=False,
        comment="Subject name (e.g., 'Machine Learning')"
    )

    subject_normalized = Column(
        String(255),
        nullable=False,
        index=True,
        comment="Normalized subject for search (e.g., 'machine_learning')"
    )

    # Categorization
    tags = Column(
        JSONB,
        default=list,
        comment="Tags for categorization ['ML', 'AI', 'data science']"
    )

    goals = Column(
        JSONB,
        default=list,
        comment="Learning goals this graph supports"
    )

    difficulty_level = Column(
        String(50),
        default="intermediate",
        comment="beginner | intermediate | advanced"
    )

    estimated_duration_weeks = Column(
        Integer,
        default=8,
        comment="Estimated weeks to complete"
    )

    # The Graph Structure
    nodes = Column(
        JSONB,
        nullable=False,
        comment="List of knowledge nodes with prerequisites, difficulty, etc."
    )

    edges = Column(
        JSONB,
        default=list,
        comment="Explicit edges if needed (usually derived from prerequisites)"
    )

    # Source & Status
    source = Column(
        String(50),
        default="llm_generated",
        comment="llm_generated | curated | user_modified"
    )

    status = Column(
        String(50),
        default="draft",
        index=True,
        comment="draft | user_verified | popular | curated"
    )

    # Quality Signals
    times_used = Column(
        Integer,
        default=0,
        comment="How many students used this graph"
    )

    times_accepted = Column(
        Integer,
        default=0,
        comment="How many clicked 'Looks Good'"
    )

    acceptance_rate = Column(
        Float,
        default=0.0,
        comment="times_accepted / times_shown"
    )

    avg_completion_rate = Column(
        Float,
        default=0.0,
        comment="Average path completion rate"
    )

    avg_rating = Column(
        Float,
        default=0.0,
        comment="Average user rating (1-5)"
    )

    # Social Proof
    verified_by_count = Column(
        Integer,
        default=0,
        comment="Number of users who verified this graph"
    )

    first_verified_by = Column(
        String(50),
        nullable=True,
        comment="student_id of first verifier"
    )

    # Versioning
    version = Column(
        Integer,
        default=1,
        comment="Version number (increments on edit)"
    )

    parent_graph_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dynamic_knowledge_graphs.id"),
        nullable=True,
        comment="Parent graph if forked"
    )

    created_by = Column(
        String(50),
        nullable=True,
        comment="student_id or 'system'"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationships
    ratings = relationship("GraphRating", back_populates="graph")


class GenerationQuota(Base):
    """Tracks generation quota per student per subject."""

    __tablename__ = "generation_quotas"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        index=True
    )

    subject_normalized = Column(
        String(255),
        nullable=False,
        index=True,
        comment="Normalized subject name"
    )

    generations_used = Column(
        Integer,
        default=0,
        comment="Number of generations used (max 3 for free users)"
    )

    last_generation_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp of last generation"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    # Unique constraint: one quota record per student per subject
    __table_args__ = (
        {"extend_existing": True},
    )

    # Relationship
    student = relationship("StudentProfile")


class GraphRating(Base):
    """User ratings for knowledge graphs."""

    __tablename__ = "graph_ratings"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    graph_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dynamic_knowledge_graphs.id"),
        nullable=False,
        index=True
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        index=True
    )

    rating = Column(
        Integer,
        nullable=False,
        comment="Rating 1-5"
    )

    feedback = Column(
        Text,
        nullable=True,
        comment="Optional feedback text"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    # Relationships
    graph = relationship("DynamicKnowledgeGraph", back_populates="ratings")
    student = relationship("StudentProfile")


class PathPreview(Base):
    """Stores path previews before user acceptance."""

    __tablename__ = "path_previews"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        index=True
    )

    graph_id = Column(
        UUID(as_uuid=True),
        ForeignKey("dynamic_knowledge_graphs.id"),
        nullable=False
    )

    # The generated path
    path_sequence = Column(
        JSONB,
        nullable=False,
        comment="Ordered list of node IDs"
    )

    path_details = Column(
        JSONB,
        default=dict,
        comment="Full path details with node info"
    )

    # User edits (before acceptance)
    user_edits = Column(
        JSONB,
        default=list,
        comment="List of user edits applied"
    )

    # Status
    status = Column(
        String(20),
        default="pending",
        comment="pending | accepted | rejected | expired"
    )

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Preview expires after 24 hours"
    )

    accepted_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    # Relationships
    student = relationship("StudentProfile")
    graph = relationship("DynamicKnowledgeGraph")


# ============================================================================
# Hierarchical Knowledge Graph Models (v2.1)
# ============================================================================

class HierarchicalKnowledgeGraph(Base):
    """
    Hierarchical knowledge graph with main topics and subtopics.
    
    Structure:
    - Main Topics (5-12): Major milestones
    - Subtopics (3-8 per main): Learnable units
    """

    __tablename__ = "hierarchical_knowledge_graphs"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # Identity
    subject = Column(
        String(255),
        nullable=False,
        comment="Subject name (e.g., 'Machine Learning')"
    )

    subject_normalized = Column(
        String(255),
        nullable=False,
        index=True,
        comment="Normalized subject for search"
    )

    # Categorization
    tags = Column(
        JSONB,
        default=list,
        comment="Tags for categorization"
    )

    goals = Column(
        JSONB,
        default=list,
        comment="Learning goals this graph supports"
    )

    difficulty_level = Column(
        String(50),
        default="intermediate",
        comment="beginner | intermediate | advanced"
    )

    estimated_duration_weeks = Column(
        Integer,
        default=8,
        comment="Estimated weeks to complete"
    )

    # Statistics
    main_topic_count = Column(
        Integer,
        default=0,
        comment="Number of main topics (5-12)"
    )

    total_subtopic_count = Column(
        Integer,
        default=0,
        comment="Total learnable units (15-60)"
    )

    total_estimated_minutes = Column(
        Integer,
        default=0,
        comment="Sum of all subtopic times"
    )

    # Quality Signals
    times_used = Column(Integer, default=0)
    times_accepted = Column(Integer, default=0)
    acceptance_rate = Column(Float, default=0.0)
    avg_completion_rate = Column(Float, default=0.0)
    avg_rating = Column(Float, default=0.0)
    verified_by_count = Column(Integer, default=0)
    first_verified_by = Column(
        String(50),
        nullable=True,
        comment="student_id of first verifier"
    )

    # Source & Status
    source = Column(
        String(50),
        default="llm_generated",
        comment="llm_generated | curated | user_modified"
    )

    status = Column(
        String(50),
        default="draft",
        index=True,
        comment="draft | user_verified | popular | curated"
    )

    # Versioning
    version = Column(Integer, default=1)

    created_by = Column(
        String(50),
        nullable=True,
        comment="student_id or 'system'"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationships
    main_topics = relationship(
        "MainTopic",
        back_populates="graph",
        cascade="all, delete-orphan",
        order_by="MainTopic.order_index"
    )


class MainTopic(Base):
    """
    A main topic (milestone) in the hierarchical knowledge graph.
    Contains 3-8 subtopics.
    """

    __tablename__ = "main_topics"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    graph_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hierarchical_knowledge_graphs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Identity
    node_id = Column(
        String(100),
        nullable=False,
        comment="Unique ID within graph (e.g., 'python_fundamentals')"
    )

    title = Column(
        String(255),
        nullable=False,
        comment="Display title (e.g., 'Python Fundamentals')"
    )

    description = Column(
        Text,
        nullable=True,
        comment="Brief description of the main topic"
    )

    # Ordering
    order_index = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Position in learning path (0-indexed)"
    )

    # Metrics (aggregated from subtopics)
    difficulty = Column(
        Float,
        default=0.5,
        comment="Average difficulty of subtopics (0.0-1.0)"
    )

    estimated_minutes = Column(
        Integer,
        default=0,
        comment="Sum of subtopic estimated times"
    )

    subtopic_count = Column(
        Integer,
        default=0,
        comment="Number of subtopics (3-8)"
    )

    # Prerequisites
    prerequisites = Column(
        JSONB,
        default=list,
        comment="List of main topic node_ids that must come before"
    )

    # Tags
    topic_tags = Column(
        JSONB,
        default=list,
        comment="Tags for this main topic"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    # Relationships
    graph = relationship("HierarchicalKnowledgeGraph", back_populates="main_topics")
    subtopics = relationship(
        "Subtopic",
        back_populates="main_topic",
        cascade="all, delete-orphan",
        order_by="Subtopic.order_index"
    )


class Subtopic(Base):
    """
    A subtopic (learnable unit) within a main topic.
    This is where resources are generated and learning happens.
    """

    __tablename__ = "subtopics"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    main_topic_id = Column(
        UUID(as_uuid=True),
        ForeignKey("main_topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Identity
    node_id = Column(
        String(100),
        nullable=False,
        comment="Unique ID within graph (e.g., 'python_functions')"
    )

    title = Column(
        String(255),
        nullable=False,
        comment="Display title (e.g., 'Functions & Lambdas')"
    )

    description = Column(
        Text,
        nullable=True,
        comment="Brief description of the subtopic"
    )

    # Ordering
    order_index = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Position within main topic (0-indexed)"
    )

    # Learning metrics
    difficulty = Column(
        Float,
        default=0.5,
        comment="Difficulty level (0.0-1.0)"
    )

    estimated_minutes = Column(
        Integer,
        default=30,
        comment="Estimated time to complete (15-60 minutes)"
    )

    # Content guidance
    learning_points = Column(
        JSONB,
        default=list,
        comment="Key concepts to cover in resources"
    )

    topic_tags = Column(
        JSONB,
        default=list,
        comment="Tags for this subtopic"
    )

    content_types = Column(
        JSONB,
        default=list,
        comment="Recommended content types ['text', 'video', 'code']"
    )

    # Prerequisites within the same main topic
    prerequisites = Column(
        JSONB,
        default=list,
        comment="List of subtopic node_ids that must come before"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    # Relationships
    main_topic = relationship("MainTopic", back_populates="subtopics")


class CachedResource(Base):
    """
    Cached generated resources for subtopics.
    Enables reuse across students with similar profiles.
    """

    __tablename__ = "cached_resources"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # Cache key components
    subtopic_id = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Subtopic node_id"
    )

    cache_key = Column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
        comment="Composite key: subtopic_id:difficulty:cognitive_style"
    )

    # The cached resources
    resources = Column(
        JSONB,
        nullable=False,
        comment="Generated resources (content, quiz, mindmap, etc.)"
    )

    generation_config = Column(
        JSONB,
        default=dict,
        comment="Config used to generate (difficulty, examples, etc.)"
    )

    # Usage tracking
    use_count = Column(
        Integer,
        default=0,
        comment="Number of times this cache was used"
    )

    last_used_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last time this cache was accessed"
    )

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )


class ResourceGenerationQueue(Base):
    """
    Queue for background resource generation.
    Enables pre-fetching of upcoming subtopic resources.
    """

    __tablename__ = "resource_generation_queue"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    subtopic_id = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Subtopic node_id to generate resources for"
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        index=True
    )

    # Generation config
    config = Column(
        JSONB,
        default=dict,
        comment="Generation config (difficulty, examples, etc.)"
    )

    priority = Column(
        Integer,
        default=2,
        index=True,
        comment="1=current (blocking), 2=next (background), 3=prefetch"
    )

    # Status tracking
    status = Column(
        String(20),
        default="pending",
        index=True,
        comment="pending | generating | complete | failed"
    )

    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if failed"
    )

    # Result
    result_cache_key = Column(
        String(255),
        nullable=True,
        comment="Cache key of generated resources"
    )

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    started_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    # Relationship
    student = relationship("StudentProfile")


class StudentSubtopicProgress(Base):
    """
    Tracks student progress through subtopics.
    """

    __tablename__ = "student_subtopic_progress"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        index=True
    )

    graph_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hierarchical_knowledge_graphs.id"),
        nullable=False,
        index=True
    )

    main_topic_id = Column(
        UUID(as_uuid=True),
        ForeignKey("main_topics.id"),
        nullable=False,
        index=True
    )

    subtopic_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subtopics.id"),
        nullable=False,
        index=True
    )

    # Status
    status = Column(
        String(20),
        default="locked",
        comment="locked | unlocked | in_progress | completed | skipped"
    )

    # Resource engagement
    gate_score = Column(
        Float,
        default=0.0,
        comment="Resource completion score (0.0-1.0)"
    )

    resources_loaded_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When resources were generated/loaded"
    )

    # Quiz results
    quiz_unlocked = Column(
        Boolean,
        default=False,
        comment="Whether quiz is unlocked (gate_score >= 0.8 or bypass)"
    )

    quiz_score = Column(
        Float,
        nullable=True,
        comment="Final quiz score (0.0-1.0)"
    )

    quiz_passed = Column(
        Boolean,
        default=False,
        comment="Whether quiz was passed (score >= 0.6, or >= 0.85 for bypass)"
    )

    bypass_mode = Column(
        Boolean,
        default=False,
        comment="Whether student bypassed resources"
    )

    # Timestamps
    started_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Unique constraint
    __table_args__ = (
        UniqueConstraint('student_id', 'subtopic_id', name='uq_student_subtopic'),
    )

    # Relationships
    student = relationship("StudentProfile")


# ============================================================================
# Path Rating & Analytics Models
# ============================================================================

class PathRating(Base):
    """
    Student ratings for learning paths.
    Used to identify high-quality paths for reuse.
    """

    __tablename__ = "path_ratings"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    graph_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hierarchical_knowledge_graphs.id"),
        nullable=False,
        index=True
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        index=True
    )

    # Rating details
    overall_rating = Column(
        Integer,
        nullable=False,
        comment="1-5 star rating"
    )

    # Specific aspects (optional)
    content_quality = Column(
        Integer,
        nullable=True,
        comment="1-5 rating for content quality"
    )

    difficulty_appropriateness = Column(
        Integer,
        nullable=True,
        comment="1-5 rating for difficulty match"
    )

    structure_clarity = Column(
        Integer,
        nullable=True,
        comment="1-5 rating for logical structure"
    )

    # Feedback
    feedback_text = Column(
        Text,
        nullable=True,
        comment="Optional written feedback"
    )

    would_recommend = Column(
        Boolean,
        nullable=True,
        comment="Would recommend to others"
    )

    # Context
    completion_percentage = Column(
        Float,
        default=0.0,
        comment="How much of path was completed when rated"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    # Unique constraint - one rating per student per graph
    __table_args__ = (
        UniqueConstraint('student_id', 'graph_id', name='uq_student_graph_rating'),
    )

    # Relationships
    graph = relationship("HierarchicalKnowledgeGraph")
    student = relationship("StudentProfile")


class LearningSession(Base):
    """
    Tracks individual learning sessions for analytics.
    A session is a continuous period of learning activity.
    """

    __tablename__ = "learning_sessions"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    student_id = Column(
        String(50),
        ForeignKey("student_profiles.student_id"),
        nullable=False,
        index=True
    )

    graph_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hierarchical_knowledge_graphs.id"),
        nullable=False,
        index=True
    )

    subtopic_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subtopics.id"),
        nullable=True,
        index=True
    )

    # Session timing
    started_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow
    )

    ended_at = Column(
        DateTime(timezone=True),
        nullable=True
    )

    duration_seconds = Column(
        Integer,
        default=0,
        comment="Total active time in seconds"
    )

    # Activity metrics
    resources_viewed = Column(
        Integer,
        default=0,
        comment="Number of resources viewed"
    )

    interactions_count = Column(
        Integer,
        default=0,
        comment="Number of interactions (clicks, scrolls, etc.)"
    )

    quiz_attempts = Column(
        Integer,
        default=0,
        comment="Number of quiz attempts in this session"
    )

    # Engagement quality
    focus_score = Column(
        Float,
        default=1.0,
        comment="Estimated focus (0-1) based on activity patterns"
    )

    # Device/context
    device_type = Column(
        String(20),
        nullable=True,
        comment="desktop | mobile | tablet"
    )

    # Relationships
    student = relationship("StudentProfile")
    graph = relationship("HierarchicalKnowledgeGraph")


class PathAnalytics(Base):
    """
    Aggregated analytics for each learning path.
    Updated periodically based on student progress data.
    """

    __tablename__ = "path_analytics"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    graph_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hierarchical_knowledge_graphs.id"),
        nullable=False,
        unique=True,
        index=True
    )

    # Usage metrics
    total_students = Column(
        Integer,
        default=0,
        comment="Total students who started this path"
    )

    active_students = Column(
        Integer,
        default=0,
        comment="Students active in last 7 days"
    )

    # Completion metrics
    completion_rate = Column(
        Float,
        default=0.0,
        comment="Percentage of students who completed (0-1)"
    )

    avg_completion_percentage = Column(
        Float,
        default=0.0,
        comment="Average progress percentage"
    )

    dropout_rate = Column(
        Float,
        default=0.0,
        comment="Percentage who stopped before 20% completion"
    )

    # Time metrics
    avg_time_to_complete_hours = Column(
        Float,
        nullable=True,
        comment="Average hours to complete entire path"
    )

    avg_session_duration_minutes = Column(
        Float,
        default=0.0,
        comment="Average learning session length"
    )

    total_learning_hours = Column(
        Float,
        default=0.0,
        comment="Sum of all student learning time"
    )

    # Performance metrics
    avg_quiz_score = Column(
        Float,
        default=0.0,
        comment="Average quiz score across all subtopics"
    )

    avg_first_attempt_pass_rate = Column(
        Float,
        default=0.0,
        comment="Percentage passing quizzes on first try"
    )

    # Difficulty analysis
    hardest_subtopic_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        comment="Subtopic with lowest pass rate"
    )

    easiest_subtopic_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        comment="Subtopic with highest pass rate"
    )

    avg_attempts_per_subtopic = Column(
        Float,
        default=1.0,
        comment="Average quiz attempts needed"
    )

    # Engagement metrics
    avg_resources_per_subtopic = Column(
        Float,
        default=0.0,
        comment="Average resources viewed per subtopic"
    )

    bypass_rate = Column(
        Float,
        default=0.0,
        comment="Percentage of subtopics bypassed"
    )

    # Quality score (computed)
    quality_score = Column(
        Float,
        default=0.0,
        comment="Computed quality score (0-100) based on all metrics"
    )

    # Timestamps
    last_calculated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    # Relationships
    graph = relationship("HierarchicalKnowledgeGraph")


class SubtopicAnalytics(Base):
    """
    Per-subtopic analytics for identifying problem areas.
    """

    __tablename__ = "subtopic_analytics"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    subtopic_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subtopics.id"),
        nullable=False,
        unique=True,
        index=True
    )

    graph_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hierarchical_knowledge_graphs.id"),
        nullable=False,
        index=True
    )

    # Attempt metrics
    total_attempts = Column(
        Integer,
        default=0
    )

    total_completions = Column(
        Integer,
        default=0
    )

    pass_rate = Column(
        Float,
        default=0.0,
        comment="Percentage passing on any attempt"
    )

    first_attempt_pass_rate = Column(
        Float,
        default=0.0,
        comment="Percentage passing on first attempt"
    )

    avg_attempts_to_pass = Column(
        Float,
        default=1.0
    )

    # Score metrics
    avg_quiz_score = Column(
        Float,
        default=0.0
    )

    score_std_dev = Column(
        Float,
        default=0.0,
        comment="Score standard deviation"
    )

    # Time metrics
    avg_time_spent_minutes = Column(
        Float,
        default=0.0
    )

    median_time_spent_minutes = Column(
        Float,
        default=0.0
    )

    # Engagement
    avg_resources_viewed = Column(
        Float,
        default=0.0
    )

    bypass_rate = Column(
        Float,
        default=0.0
    )

    # Difficulty assessment
    computed_difficulty = Column(
        Float,
        default=0.5,
        comment="Difficulty based on actual performance (0-1)"
    )

    difficulty_mismatch = Column(
        Float,
        default=0.0,
        comment="Difference between stated and computed difficulty"
    )

    # Flags
    needs_review = Column(
        Boolean,
        default=False,
        comment="Flagged for content review"
    )

    review_reason = Column(
        String(255),
        nullable=True
    )

    last_calculated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    # Relationships
    subtopic = relationship("Subtopic")
    graph = relationship("HierarchicalKnowledgeGraph")


# ============================================================================
# Database Connection
# ============================================================================

class DatabaseManager:
    """Manages database connections and sessions."""

    def __init__(self):
        self.async_engine = None
        self.async_session_factory = None
        self.sync_engine = None
        self.sync_session_factory = None

    def initialize(self, max_retries: int = 3, retry_delay: float = 1.0):
        """
        Initialize database engines and session factories with retry logic.
        
        Args:
            max_retries: Maximum number of connection attempts
            retry_delay: Initial delay between retries (doubles each attempt)
        """
        import time
        from core.logging import get_logger
        logger = get_logger(__name__)
        
        last_error = None
        for attempt in range(max_retries):
            try:
                # Async engine for FastAPI - uses configurable pool settings
                # Note: asyncpg uses different connect arg names than psycopg2
                self.async_engine = create_async_engine(
                    settings.db.async_url,
                    echo=settings.is_development,
                    pool_size=settings.db.pool_size,
                    max_overflow=settings.db.max_overflow,
                    pool_pre_ping=True,
                    pool_recycle=settings.db.pool_recycle,
                    connect_args={"timeout": settings.db.connect_timeout},  # asyncpg uses 'timeout'
                )

                self.async_session_factory = async_sessionmaker(
                    self.async_engine,
                    class_=AsyncSession,
                    expire_on_commit=False,
                    autocommit=False,
                    autoflush=False,
                )

                # Sync engine for Alembic
                self.sync_engine = create_engine(
                    settings.db.sync_url,
                    echo=settings.is_development,
                    pool_pre_ping=True,
                )

                self.sync_session_factory = sessionmaker(
                    self.sync_engine,
                    autocommit=False,
                    autoflush=False,
                )
                
                logger.info(f"Database connection established (attempt {attempt + 1})")
                return  # Success
                
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    delay = retry_delay * (2 ** attempt)  # Exponential backoff
                    logger.warning(f"Database connection failed (attempt {attempt + 1}/{max_retries}), retrying in {delay}s: {e}")
                    time.sleep(delay)
                else:
                    logger.error(f"Database connection failed after {max_retries} attempts: {e}")
        
        if last_error:
            raise last_error

    async def get_async_session(self) -> AsyncSession:
        """Get async database session."""
        if not self.async_session_factory:
            self.initialize()
        return self.async_session_factory()

    def get_sync_session(self):
        """Get sync database session."""
        if not self.sync_session_factory:
            self.initialize()
        return self.sync_session_factory()

    async def close(self):
        """Close database connections."""
        if self.async_engine:
            await self.async_engine.dispose()
        if self.sync_engine:
            self.sync_engine.dispose()


# Global database manager instance
db_manager = DatabaseManager()


# Dependency for FastAPI
async def get_db() -> AsyncSession:
    """FastAPI dependency for database sessions."""
    session = await db_manager.get_async_session()
    try:
        yield session
    finally:
        await session.close()
