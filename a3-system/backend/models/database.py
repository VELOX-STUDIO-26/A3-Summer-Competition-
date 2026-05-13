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
