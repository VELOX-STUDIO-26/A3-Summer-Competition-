"""
Tests for Hierarchical Knowledge Graph Models (v2.1).

Tests cover:
- HierarchicalKnowledgeGraph
- MainTopic
- Subtopic
- CachedResource
- ResourceGenerationQueue
- StudentSubtopicProgress
"""

import uuid
from datetime import datetime, timedelta

import pytest

from models.database import (
    HierarchicalKnowledgeGraph,
    MainTopic,
    Subtopic,
    CachedResource,
    ResourceGenerationQueue,
    StudentSubtopicProgress,
)


# ============================================================================
# HierarchicalKnowledgeGraph Tests
# ============================================================================

class TestHierarchicalKnowledgeGraph:
    """Tests for HierarchicalKnowledgeGraph model."""

    def test_create_graph_with_defaults(self):
        """Test creating a graph with default values."""
        # Note: SQLAlchemy defaults apply on INSERT, so we set them explicitly for unit tests
        graph = HierarchicalKnowledgeGraph(
            subject="Machine Learning",
            subject_normalized="machine_learning",
            difficulty_level="intermediate",
            estimated_duration_weeks=8,
            main_topic_count=0,
            total_subtopic_count=0,
            total_estimated_minutes=0,
            times_used=0,
            times_accepted=0,
            acceptance_rate=0.0,
            avg_completion_rate=0.0,
            avg_rating=0.0,
            verified_by_count=0,
            status="draft",
            source="llm_generated",
            version=1,
        )
        
        assert graph.subject == "Machine Learning"
        assert graph.subject_normalized == "machine_learning"
        assert graph.difficulty_level == "intermediate"
        assert graph.estimated_duration_weeks == 8
        assert graph.main_topic_count == 0
        assert graph.total_subtopic_count == 0
        assert graph.status == "draft"
        assert graph.source == "llm_generated"
        assert graph.version == 1

    def test_create_graph_with_all_fields(self):
        """Test creating a graph with all fields specified."""
        graph = HierarchicalKnowledgeGraph(
            id=uuid.uuid4(),
            subject="Data Science",
            subject_normalized="data_science",
            tags=["ML", "statistics", "python"],
            goals=["become data scientist", "learn ML"],
            difficulty_level="advanced",
            estimated_duration_weeks=12,
            main_topic_count=8,
            total_subtopic_count=40,
            total_estimated_minutes=2400,
            times_used=100,
            times_accepted=85,
            acceptance_rate=0.85,
            avg_completion_rate=0.72,
            avg_rating=4.5,
            verified_by_count=50,
            source="curated",
            status="popular",
            version=3,
            created_by="admin",
        )
        
        assert graph.tags == ["ML", "statistics", "python"]
        assert graph.goals == ["become data scientist", "learn ML"]
        assert graph.difficulty_level == "advanced"
        assert graph.main_topic_count == 8
        assert graph.total_subtopic_count == 40
        assert graph.acceptance_rate == 0.85
        assert graph.status == "popular"


# ============================================================================
# MainTopic Tests
# ============================================================================

class TestMainTopic:
    """Tests for MainTopic model."""

    def test_create_main_topic_with_defaults(self):
        """Test creating a main topic with default values."""
        topic = MainTopic(
            graph_id=uuid.uuid4(),
            node_id="python_fundamentals",
            title="Python Fundamentals",
            order_index=0,
            difficulty=0.5,
            estimated_minutes=0,
            subtopic_count=0,
            prerequisites=[],
            topic_tags=[],
        )
        
        assert topic.node_id == "python_fundamentals"
        assert topic.title == "Python Fundamentals"
        assert topic.order_index == 0
        assert topic.difficulty == 0.5
        assert topic.estimated_minutes == 0
        assert topic.subtopic_count == 0
        assert topic.prerequisites == []
        assert topic.topic_tags == []

    def test_create_main_topic_with_all_fields(self):
        """Test creating a main topic with all fields."""
        topic = MainTopic(
            id=uuid.uuid4(),
            graph_id=uuid.uuid4(),
            node_id="numpy_basics",
            title="NumPy Basics",
            description="Learn NumPy arrays and operations",
            order_index=2,
            difficulty=0.4,
            estimated_minutes=180,
            subtopic_count=5,
            prerequisites=["python_fundamentals"],
            topic_tags=["numpy", "arrays", "math"],
        )
        
        assert topic.description == "Learn NumPy arrays and operations"
        assert topic.order_index == 2
        assert topic.difficulty == 0.4
        assert topic.estimated_minutes == 180
        assert topic.subtopic_count == 5
        assert topic.prerequisites == ["python_fundamentals"]


# ============================================================================
# Subtopic Tests
# ============================================================================

class TestSubtopic:
    """Tests for Subtopic model."""

    def test_create_subtopic_with_defaults(self):
        """Test creating a subtopic with default values."""
        subtopic = Subtopic(
            main_topic_id=uuid.uuid4(),
            node_id="python_functions",
            title="Functions & Lambdas",
            order_index=0,
            difficulty=0.5,
            estimated_minutes=30,
            learning_points=[],
            topic_tags=[],
            content_types=[],
            prerequisites=[],
        )
        
        assert subtopic.node_id == "python_functions"
        assert subtopic.title == "Functions & Lambdas"
        assert subtopic.order_index == 0
        assert subtopic.difficulty == 0.5
        assert subtopic.estimated_minutes == 30
        assert subtopic.learning_points == []
        assert subtopic.topic_tags == []
        assert subtopic.content_types == []
        assert subtopic.prerequisites == []

    def test_create_subtopic_with_all_fields(self):
        """Test creating a subtopic with all fields."""
        subtopic = Subtopic(
            id=uuid.uuid4(),
            main_topic_id=uuid.uuid4(),
            node_id="python_oop",
            title="Object-Oriented Programming",
            description="Classes, objects, inheritance",
            order_index=4,
            difficulty=0.6,
            estimated_minutes=45,
            learning_points=["classes", "objects", "inheritance", "polymorphism"],
            topic_tags=["oop", "classes", "python"],
            content_types=["text", "video", "code"],
            prerequisites=["python_functions"],
        )
        
        assert subtopic.description == "Classes, objects, inheritance"
        assert subtopic.order_index == 4
        assert subtopic.difficulty == 0.6
        assert subtopic.estimated_minutes == 45
        assert len(subtopic.learning_points) == 4
        assert "code" in subtopic.content_types


# ============================================================================
# CachedResource Tests
# ============================================================================

class TestCachedResource:
    """Tests for CachedResource model."""

    def test_create_cached_resource(self):
        """Test creating a cached resource."""
        cache = CachedResource(
            subtopic_id="python_functions",
            cache_key="python_functions:intermediate:visual",
            resources={
                "content": {"markdown": "# Functions..."},
                "quiz": {"questions": []},
                "mindmap": {"nodes": []},
            },
            generation_config={
                "difficulty": "intermediate",
                "examples": 3,
            },
            use_count=0,
        )
        
        assert cache.subtopic_id == "python_functions"
        assert cache.cache_key == "python_functions:intermediate:visual"
        assert "content" in cache.resources
        assert cache.use_count == 0
        assert cache.last_used_at is None

    def test_cache_key_format(self):
        """Test cache key format."""
        cache = CachedResource(
            subtopic_id="numpy_arrays",
            cache_key="numpy_arrays:beginner:kinesthetic",
            resources={},
        )
        
        parts = cache.cache_key.split(":")
        assert len(parts) == 3
        assert parts[0] == "numpy_arrays"
        assert parts[1] == "beginner"
        assert parts[2] == "kinesthetic"


# ============================================================================
# ResourceGenerationQueue Tests
# ============================================================================

class TestResourceGenerationQueue:
    """Tests for ResourceGenerationQueue model."""

    def test_create_queue_item_with_defaults(self):
        """Test creating a queue item with defaults."""
        item = ResourceGenerationQueue(
            subtopic_id="python_functions",
            student_id="student_001",
            priority=2,
            status="pending",
            config={},
        )
        
        assert item.subtopic_id == "python_functions"
        assert item.student_id == "student_001"
        assert item.priority == 2  # Default: next (background)
        assert item.status == "pending"
        assert item.config == {}
        assert item.error_message is None
        assert item.result_cache_key is None

    def test_create_queue_item_with_priority(self):
        """Test creating queue items with different priorities."""
        # Current (blocking)
        current = ResourceGenerationQueue(
            subtopic_id="topic_1",
            student_id="student_001",
            priority=1,
        )
        assert current.priority == 1
        
        # Next (background)
        next_item = ResourceGenerationQueue(
            subtopic_id="topic_2",
            student_id="student_001",
            priority=2,
        )
        assert next_item.priority == 2
        
        # Prefetch
        prefetch = ResourceGenerationQueue(
            subtopic_id="topic_3",
            student_id="student_001",
            priority=3,
        )
        assert prefetch.priority == 3

    def test_queue_item_status_transitions(self):
        """Test queue item status values."""
        item = ResourceGenerationQueue(
            subtopic_id="python_functions",
            student_id="student_001",
            status="pending",
            priority=2,
            config={},
        )
        
        # Initial status
        assert item.status == "pending"
        
        # Simulate status changes
        item.status = "generating"
        item.started_at = datetime.utcnow()
        assert item.status == "generating"
        
        item.status = "complete"
        item.completed_at = datetime.utcnow()
        item.result_cache_key = "python_functions:intermediate:mixed"
        assert item.status == "complete"

    def test_queue_item_failure(self):
        """Test queue item failure handling."""
        item = ResourceGenerationQueue(
            subtopic_id="python_functions",
            student_id="student_001",
            status="failed",
            error_message="LLM timeout after 60s",
        )
        
        assert item.status == "failed"
        assert item.error_message == "LLM timeout after 60s"


# ============================================================================
# StudentSubtopicProgress Tests
# ============================================================================

class TestStudentSubtopicProgress:
    """Tests for StudentSubtopicProgress model."""

    def test_create_progress_with_defaults(self):
        """Test creating progress record with defaults."""
        progress = StudentSubtopicProgress(
            student_id="student_001",
            graph_id=uuid.uuid4(),
            main_topic_id=uuid.uuid4(),
            subtopic_id=uuid.uuid4(),
            status="locked",
            gate_score=0.0,
            quiz_unlocked=False,
            quiz_passed=False,
            bypass_mode=False,
        )
        
        assert progress.student_id == "student_001"
        assert progress.status == "locked"
        assert progress.gate_score == 0.0
        assert progress.quiz_unlocked is False
        assert progress.quiz_score is None
        assert progress.quiz_passed is False
        assert progress.bypass_mode is False

    def test_progress_status_values(self):
        """Test valid progress status values."""
        statuses = ["locked", "unlocked", "in_progress", "completed", "skipped"]
        
        for status in statuses:
            progress = StudentSubtopicProgress(
                student_id="student_001",
                graph_id=uuid.uuid4(),
                main_topic_id=uuid.uuid4(),
                subtopic_id=uuid.uuid4(),
                status=status,
            )
            assert progress.status == status

    def test_progress_with_quiz_completion(self):
        """Test progress with quiz completion."""
        progress = StudentSubtopicProgress(
            student_id="student_001",
            graph_id=uuid.uuid4(),
            main_topic_id=uuid.uuid4(),
            subtopic_id=uuid.uuid4(),
            status="completed",
            gate_score=0.85,
            quiz_unlocked=True,
            quiz_score=0.75,
            quiz_passed=True,
            started_at=datetime.utcnow() - timedelta(hours=1),
            completed_at=datetime.utcnow(),
        )
        
        assert progress.status == "completed"
        assert progress.gate_score == 0.85
        assert progress.quiz_unlocked is True
        assert progress.quiz_score == 0.75
        assert progress.quiz_passed is True

    def test_progress_with_bypass_mode(self):
        """Test progress with bypass mode."""
        progress = StudentSubtopicProgress(
            student_id="student_001",
            graph_id=uuid.uuid4(),
            main_topic_id=uuid.uuid4(),
            subtopic_id=uuid.uuid4(),
            status="completed",
            gate_score=1.0,
            quiz_unlocked=True,
            quiz_score=0.90,
            quiz_passed=True,
            bypass_mode=True,
        )
        
        assert progress.bypass_mode is True
        assert progress.quiz_score == 0.90  # Must be >= 0.85 for bypass


# ============================================================================
# Integration Tests
# ============================================================================

class TestHierarchicalStructure:
    """Tests for the hierarchical structure relationships."""

    def test_graph_with_main_topics(self):
        """Test creating a graph with main topics."""
        graph = HierarchicalKnowledgeGraph(
            id=uuid.uuid4(),
            subject="Machine Learning",
            subject_normalized="machine_learning",
            main_topic_count=3,
        )
        
        # Create main topics
        topics = [
            MainTopic(
                graph_id=graph.id,
                node_id="python_fundamentals",
                title="Python Fundamentals",
                order_index=0,
                subtopic_count=4,
            ),
            MainTopic(
                graph_id=graph.id,
                node_id="numpy_basics",
                title="NumPy Basics",
                order_index=1,
                prerequisites=["python_fundamentals"],
                subtopic_count=3,
            ),
            MainTopic(
                graph_id=graph.id,
                node_id="ml_basics",
                title="ML Basics",
                order_index=2,
                prerequisites=["numpy_basics"],
                subtopic_count=5,
            ),
        ]
        
        assert len(topics) == 3
        assert topics[0].order_index < topics[1].order_index < topics[2].order_index
        assert topics[1].prerequisites == ["python_fundamentals"]

    def test_main_topic_with_subtopics(self):
        """Test creating a main topic with subtopics."""
        main_topic_id = uuid.uuid4()
        
        subtopics = [
            Subtopic(
                main_topic_id=main_topic_id,
                node_id="python_variables",
                title="Variables & Data Types",
                order_index=0,
                difficulty=0.2,
                estimated_minutes=20,
                prerequisites=[],
                learning_points=[],
                topic_tags=[],
                content_types=[],
            ),
            Subtopic(
                main_topic_id=main_topic_id,
                node_id="python_control_flow",
                title="Control Flow",
                order_index=1,
                difficulty=0.3,
                estimated_minutes=25,
                prerequisites=["python_variables"],
                learning_points=[],
                topic_tags=[],
                content_types=[],
            ),
            Subtopic(
                main_topic_id=main_topic_id,
                node_id="python_functions",
                title="Functions",
                order_index=2,
                difficulty=0.4,
                estimated_minutes=30,
                prerequisites=["python_control_flow"],
                learning_points=[],
                topic_tags=[],
                content_types=[],
            ),
        ]
        
        assert len(subtopics) == 3
        total_time = sum(s.estimated_minutes for s in subtopics)
        assert total_time == 75
        
        # Verify prerequisite chain
        assert subtopics[0].prerequisites == []
        assert subtopics[1].prerequisites == ["python_variables"]
        assert subtopics[2].prerequisites == ["python_control_flow"]

    def test_subtopic_count_constraints(self):
        """Test that subtopic counts are within expected range."""
        # Valid: 3-8 subtopics per main topic
        for count in [3, 5, 8]:
            topic = MainTopic(
                graph_id=uuid.uuid4(),
                node_id=f"topic_{count}",
                title=f"Topic with {count} subtopics",
                subtopic_count=count,
            )
            assert 3 <= topic.subtopic_count <= 8

    def test_main_topic_count_constraints(self):
        """Test that main topic counts are within expected range."""
        # Valid: 5-12 main topics
        for count in [5, 8, 12]:
            graph = HierarchicalKnowledgeGraph(
                subject=f"Subject with {count} topics",
                subject_normalized=f"subject_{count}",
                main_topic_count=count,
            )
            assert 5 <= graph.main_topic_count <= 12
