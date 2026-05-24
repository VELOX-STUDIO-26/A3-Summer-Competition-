"""
Unit tests for Dynamic Knowledge Graph models and functionality.

Tests cover:
- DynamicKnowledgeGraph model
- GenerationQuota model
- GraphRating model
- PathPreview model
- Subject normalization
- Quota management
"""

import uuid
from datetime import datetime, timedelta

import pytest

from models.database import (
    DynamicKnowledgeGraph,
    GenerationQuota,
    GraphRating,
    PathPreview,
)


# ============================================================================
# Helper Functions
# ============================================================================

def normalize_subject(subject: str) -> str:
    """Normalize subject name for consistent searching."""
    return subject.lower().strip().replace(" ", "_").replace("-", "_")


def create_sample_nodes():
    """Create sample knowledge graph nodes."""
    return [
        {
            "node_id": "python_basics",
            "title": "Python Basics",
            "description": "Introduction to Python programming",
            "difficulty": 0.2,
            "estimated_minutes": 60,
            "prerequisites": [],
            "topic_tags": ["python", "programming", "basics"]
        },
        {
            "node_id": "numpy_fundamentals",
            "title": "NumPy Fundamentals",
            "description": "Working with numerical arrays",
            "difficulty": 0.4,
            "estimated_minutes": 45,
            "prerequisites": ["python_basics"],
            "topic_tags": ["python", "numpy", "data"]
        },
        {
            "node_id": "pandas_basics",
            "title": "Pandas Basics",
            "description": "Data manipulation with Pandas",
            "difficulty": 0.5,
            "estimated_minutes": 60,
            "prerequisites": ["numpy_fundamentals"],
            "topic_tags": ["python", "pandas", "data"]
        },
        {
            "node_id": "linear_regression",
            "title": "Linear Regression",
            "description": "Understanding linear regression",
            "difficulty": 0.6,
            "estimated_minutes": 90,
            "prerequisites": ["pandas_basics"],
            "topic_tags": ["ml", "regression", "statistics"]
        }
    ]


# ============================================================================
# Subject Normalization Tests
# ============================================================================

class TestSubjectNormalization:
    """Tests for subject name normalization."""

    def test_lowercase_conversion(self):
        assert normalize_subject("Machine Learning") == "machine_learning"

    def test_space_to_underscore(self):
        assert normalize_subject("data science") == "data_science"

    def test_hyphen_to_underscore(self):
        assert normalize_subject("web-development") == "web_development"

    def test_strip_whitespace(self):
        assert normalize_subject("  Python  ") == "python"

    def test_mixed_case_and_spaces(self):
        assert normalize_subject("Deep Learning with TensorFlow") == "deep_learning_with_tensorflow"

    def test_already_normalized(self):
        assert normalize_subject("machine_learning") == "machine_learning"


# ============================================================================
# DynamicKnowledgeGraph Model Tests
# ============================================================================

class TestDynamicKnowledgeGraphModel:
    """Tests for DynamicKnowledgeGraph model."""

    def test_create_graph_with_required_fields(self):
        """Test creating a graph with minimum required fields."""
        graph = DynamicKnowledgeGraph(
            subject="Machine Learning",
            subject_normalized="machine_learning",
            nodes=create_sample_nodes(),
            status="draft",
            source="llm_generated"
        )
        
        assert graph.subject == "Machine Learning"
        assert graph.subject_normalized == "machine_learning"
        assert len(graph.nodes) == 4
        assert graph.status == "draft"
        assert graph.source == "llm_generated"

    def test_explicit_default_values(self):
        """Test creating graph with explicit default values."""
        graph = DynamicKnowledgeGraph(
            subject="Test",
            subject_normalized="test",
            nodes=[],
            difficulty_level="intermediate",
            estimated_duration_weeks=8,
            times_used=0,
            times_accepted=0,
            acceptance_rate=0.0,
            avg_rating=0.0,
            version=1,
            verified_by_count=0,
            status="draft",
            source="llm_generated"
        )
        
        assert graph.difficulty_level == "intermediate"
        assert graph.estimated_duration_weeks == 8
        assert graph.times_used == 0
        assert graph.times_accepted == 0
        assert graph.acceptance_rate == 0.0
        assert graph.avg_rating == 0.0
        assert graph.version == 1
        assert graph.verified_by_count == 0

    def test_graph_with_all_fields(self):
        """Test creating a graph with all fields."""
        graph = DynamicKnowledgeGraph(
            subject="Machine Learning",
            subject_normalized="machine_learning",
            tags=["ML", "AI", "data science"],
            goals=["become ML engineer", "learn deep learning"],
            difficulty_level="beginner",
            estimated_duration_weeks=12,
            nodes=create_sample_nodes(),
            edges=[],
            source="curated",
            status="user_verified",
            times_used=50,
            times_accepted=45,
            acceptance_rate=0.9,
            avg_completion_rate=0.75,
            avg_rating=4.5,
            verified_by_count=45,
            first_verified_by="student_001",
            created_by="system"
        )
        
        assert graph.tags == ["ML", "AI", "data science"]
        assert graph.goals == ["become ML engineer", "learn deep learning"]
        assert graph.difficulty_level == "beginner"
        assert graph.times_used == 50
        assert graph.acceptance_rate == 0.9
        assert graph.avg_rating == 4.5

    def test_graph_to_dict(self):
        """Test converting graph to dictionary."""
        graph = DynamicKnowledgeGraph(
            id=uuid.uuid4(),
            subject="Test Subject",
            subject_normalized="test_subject",
            nodes=[{"node_id": "test", "title": "Test"}]
        )
        
        result = graph.to_dict()
        
        assert "subject" in result
        assert "nodes" in result
        assert result["subject"] == "Test Subject"


# ============================================================================
# GenerationQuota Model Tests
# ============================================================================

class TestGenerationQuotaModel:
    """Tests for GenerationQuota model."""

    def test_create_quota(self):
        """Test creating a generation quota."""
        quota = GenerationQuota(
            student_id="student_001",
            subject_normalized="machine_learning",
            generations_used=0
        )
        
        assert quota.student_id == "student_001"
        assert quota.subject_normalized == "machine_learning"
        assert quota.generations_used == 0

    def test_quota_defaults(self):
        """Test default values for quota."""
        quota = GenerationQuota(
            student_id="student_001",
            subject_normalized="test",
            generations_used=0
        )
        
        assert quota.generations_used == 0
        assert quota.last_generation_at is None

    def test_can_generate_free_user(self):
        """Test quota check for free users."""
        quota = GenerationQuota(
            student_id="student_001",
            subject_normalized="ml",
            generations_used=2
        )
        
        # Free users get 3 generations
        assert quota.generations_used < 3  # Can still generate
        
        quota.generations_used = 3
        assert quota.generations_used >= 3  # Cannot generate

    def test_quota_increment(self):
        """Test incrementing generation count."""
        quota = GenerationQuota(
            student_id="student_001",
            subject_normalized="ml",
            generations_used=0
        )
        
        quota.generations_used += 1
        quota.last_generation_at = datetime.utcnow()
        
        assert quota.generations_used == 1
        assert quota.last_generation_at is not None


# ============================================================================
# GraphRating Model Tests
# ============================================================================

class TestGraphRatingModel:
    """Tests for GraphRating model."""

    def test_create_rating(self):
        """Test creating a graph rating."""
        graph_id = uuid.uuid4()
        rating = GraphRating(
            graph_id=graph_id,
            student_id="student_001",
            rating=5,
            feedback="Great learning path!"
        )
        
        assert rating.graph_id == graph_id
        assert rating.student_id == "student_001"
        assert rating.rating == 5
        assert rating.feedback == "Great learning path!"

    def test_rating_without_feedback(self):
        """Test creating a rating without feedback."""
        rating = GraphRating(
            graph_id=uuid.uuid4(),
            student_id="student_001",
            rating=4
        )
        
        assert rating.rating == 4
        assert rating.feedback is None

    def test_rating_range(self):
        """Test rating values (1-5)."""
        for r in range(1, 6):
            rating = GraphRating(
                graph_id=uuid.uuid4(),
                student_id="student_001",
                rating=r
            )
            assert rating.rating == r


# ============================================================================
# PathPreview Model Tests
# ============================================================================

class TestPathPreviewModel:
    """Tests for PathPreview model."""

    def test_create_preview(self):
        """Test creating a path preview."""
        graph_id = uuid.uuid4()
        expires = datetime.utcnow() + timedelta(hours=24)
        
        preview = PathPreview(
            student_id="student_001",
            graph_id=graph_id,
            path_sequence=["python_basics", "numpy_fundamentals", "pandas_basics"],
            path_details={"total_time": 165, "node_count": 3},
            expires_at=expires,
            status="pending"
        )
        
        assert preview.student_id == "student_001"
        assert preview.graph_id == graph_id
        assert len(preview.path_sequence) == 3
        assert preview.status == "pending"
        assert preview.expires_at == expires

    def test_preview_defaults(self):
        """Test default values for preview."""
        preview = PathPreview(
            student_id="student_001",
            graph_id=uuid.uuid4(),
            path_sequence=[],
            expires_at=datetime.utcnow() + timedelta(hours=24),
            status="pending",
            user_edits=[]
        )
        
        assert preview.status == "pending"
        assert preview.user_edits == []
        assert preview.accepted_at is None

    def test_preview_with_edits(self):
        """Test preview with user edits."""
        preview = PathPreview(
            student_id="student_001",
            graph_id=uuid.uuid4(),
            path_sequence=["node_1", "node_2", "node_3"],
            user_edits=[
                {"action": "skip", "node_id": "node_1"},
                {"action": "add", "node_id": "node_4", "position": 2}
            ],
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        
        assert len(preview.user_edits) == 2
        assert preview.user_edits[0]["action"] == "skip"

    def test_preview_acceptance(self):
        """Test marking preview as accepted."""
        preview = PathPreview(
            student_id="student_001",
            graph_id=uuid.uuid4(),
            path_sequence=["node_1"],
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        
        # Simulate acceptance
        preview.status = "accepted"
        preview.accepted_at = datetime.utcnow()
        
        assert preview.status == "accepted"
        assert preview.accepted_at is not None


# ============================================================================
# Integration-Style Tests
# ============================================================================

class TestGraphWorkflow:
    """Tests for typical graph workflow scenarios."""

    def test_full_graph_creation_workflow(self):
        """Test creating a graph, getting it verified, and rated."""
        # 1. Create graph
        graph = DynamicKnowledgeGraph(
            subject="Python for Data Science",
            subject_normalized="python_for_data_science",
            tags=["python", "data science"],
            goals=["learn data analysis"],
            nodes=create_sample_nodes(),
            source="llm_generated",
            status="draft",
            times_used=0,
            times_accepted=0,
            verified_by_count=0,
            acceptance_rate=0.0
        )
        
        assert graph.status == "draft"
        assert graph.times_used == 0
        
        # 2. User accepts the graph
        graph.times_used += 1
        graph.times_accepted += 1
        graph.status = "user_verified"
        graph.verified_by_count = 1
        graph.first_verified_by = "student_001"
        
        assert graph.status == "user_verified"
        assert graph.verified_by_count == 1
        
        # 3. Calculate acceptance rate
        graph.acceptance_rate = graph.times_accepted / graph.times_used
        assert graph.acceptance_rate == 1.0
        
        # 4. More users use it
        for _ in range(9):
            graph.times_used += 1
            graph.times_accepted += 1
            graph.verified_by_count += 1
        
        graph.acceptance_rate = graph.times_accepted / graph.times_used
        assert graph.times_used == 10
        assert graph.acceptance_rate == 1.0
        
        # 5. Promote to popular
        if graph.times_used >= 10 and graph.acceptance_rate >= 0.7:
            graph.status = "popular"
        
        assert graph.status == "popular"

    def test_quota_exhaustion_workflow(self):
        """Test quota being exhausted for free user."""
        quota = GenerationQuota(
            student_id="free_user_001",
            subject_normalized="machine_learning",
            generations_used=0
        )
        
        max_free_generations = 3
        
        # Use all 3 free generations
        for i in range(max_free_generations):
            assert quota.generations_used < max_free_generations
            quota.generations_used += 1
            quota.last_generation_at = datetime.utcnow()
        
        # Now quota is exhausted
        assert quota.generations_used >= max_free_generations
        
        # Premium user would still be able to generate
        is_premium = True
        can_generate = is_premium or quota.generations_used < max_free_generations
        assert can_generate is True

    def test_path_preview_expiration(self):
        """Test path preview expiration logic."""
        # Create preview that expires in 24 hours
        preview = PathPreview(
            student_id="student_001",
            graph_id=uuid.uuid4(),
            path_sequence=["node_1", "node_2"],
            expires_at=datetime.utcnow() + timedelta(hours=24),
            status="pending"
        )
        
        # Check if not expired
        is_expired = datetime.utcnow() > preview.expires_at
        assert is_expired is False
        
        # Simulate time passing (set expires_at to past)
        preview.expires_at = datetime.utcnow() - timedelta(hours=1)
        
        is_expired = datetime.utcnow() > preview.expires_at
        assert is_expired is True
        
        # Expired preview should be marked
        if is_expired and preview.status == "pending":
            preview.status = "expired"
        
        assert preview.status == "expired"
