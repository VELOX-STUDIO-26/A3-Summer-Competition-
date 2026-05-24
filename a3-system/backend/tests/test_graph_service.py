"""
Unit tests for Graph Service.

Tests cover:
- Graph search and matching
- Similarity calculation
- Quota management
- Preview management
- Social proof
"""

import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agents.knowledge_graph_generator import GeneratedGraph, KnowledgeNode, normalize_subject
from services.graph_service import (
    GraphService,
    MAX_FREE_GENERATIONS,
    MIN_SIMILARITY_THRESHOLD,
    POPULAR_THRESHOLD_ACCEPTANCE,
    POPULAR_THRESHOLD_USES,
    PREVIEW_EXPIRY_HOURS,
)


# ============================================================================
# Test Fixtures
# ============================================================================

def create_mock_graph(
    subject: str = "Machine Learning",
    status: str = "user_verified",
    times_used: int = 10,
    acceptance_rate: float = 0.8,
    avg_rating: float = 4.5
):
    """Create a mock DynamicKnowledgeGraph."""
    mock = MagicMock()
    mock.id = uuid.uuid4()
    mock.subject = subject
    mock.subject_normalized = normalize_subject(subject)
    mock.status = status
    mock.times_used = times_used
    mock.times_accepted = int(times_used * acceptance_rate)
    mock.acceptance_rate = acceptance_rate
    mock.avg_rating = avg_rating
    mock.verified_by_count = times_used
    mock.tags = [subject.lower(), "ai"]
    mock.goals = ["learn " + subject.lower()]
    mock.nodes = [{"node_id": "test", "title": "Test"}]
    mock.first_verified_by = None
    mock.updated_at = datetime.utcnow()
    return mock


def create_mock_quota(
    student_id: str = "student_001",
    subject: str = "machine_learning",
    generations_used: int = 0
):
    """Create a mock GenerationQuota."""
    mock = MagicMock()
    mock.id = uuid.uuid4()
    mock.student_id = student_id
    mock.subject_normalized = subject
    mock.generations_used = generations_used
    mock.last_generation_at = None
    return mock


def create_mock_preview(
    student_id: str = "student_001",
    status: str = "pending"
):
    """Create a mock PathPreview."""
    mock = MagicMock()
    mock.id = uuid.uuid4()
    mock.student_id = student_id
    mock.graph_id = uuid.uuid4()
    mock.path_sequence = ["node_1", "node_2", "node_3"]
    mock.path_details = {"total_time": 120}
    mock.user_edits = []
    mock.status = status
    mock.created_at = datetime.utcnow()
    mock.expires_at = datetime.utcnow() + timedelta(hours=24)
    mock.accepted_at = None
    return mock


# ============================================================================
# Similarity Calculation Tests
# ============================================================================

class TestSimilarityCalculation:
    """Tests for similarity calculation."""

    @pytest.fixture
    def service(self):
        """Create service with mock db."""
        mock_db = AsyncMock()
        return GraphService(mock_db)

    def test_exact_subject_match(self, service):
        """Test exact subject match gives high score."""
        graph = create_mock_graph(subject="Machine Learning")
        
        similarity = service._calculate_similarity(
            graph=graph,
            search_subject="Machine Learning",
            search_goals=[]
        )
        
        # Should get full subject score (0.4) + quality bonus
        assert similarity >= 0.4

    def test_partial_subject_match(self, service):
        """Test partial subject match."""
        graph = create_mock_graph(
            subject="Machine Learning Fundamentals",
            acceptance_rate=0.0,
            times_used=0,
            avg_rating=0.0
        )
        
        similarity = service._calculate_similarity(
            graph=graph,
            search_subject="Machine Learning",
            search_goals=[]
        )
        
        # Should get partial match (0.2-0.3 for subject) without quality bonus
        assert 0.2 <= similarity <= 0.35

    def test_no_subject_match(self, service):
        """Test no subject match."""
        graph = create_mock_graph(subject="Web Development")
        
        similarity = service._calculate_similarity(
            graph=graph,
            search_subject="Machine Learning",
            search_goals=[]
        )
        
        # Should only get quality bonus
        assert similarity < 0.3

    def test_goal_overlap_increases_score(self, service):
        """Test that goal overlap increases similarity."""
        graph = create_mock_graph(subject="Machine Learning")
        graph.goals = ["become ml engineer", "learn deep learning"]
        
        similarity_no_goals = service._calculate_similarity(
            graph=graph,
            search_subject="Machine Learning",
            search_goals=[]
        )
        
        similarity_with_goals = service._calculate_similarity(
            graph=graph,
            search_subject="Machine Learning",
            search_goals=["become ml engineer"]
        )
        
        assert similarity_with_goals > similarity_no_goals

    def test_quality_bonus(self, service):
        """Test that quality metrics affect score."""
        high_quality = create_mock_graph(
            subject="Python",
            acceptance_rate=0.95,
            times_used=100,
            avg_rating=4.8
        )
        
        low_quality = create_mock_graph(
            subject="Python",
            acceptance_rate=0.3,
            times_used=5,
            avg_rating=2.0
        )
        
        high_sim = service._calculate_similarity(high_quality, "Python", [])
        low_sim = service._calculate_similarity(low_quality, "Python", [])
        
        assert high_sim > low_sim


# ============================================================================
# Quota Management Tests
# ============================================================================

class TestQuotaManagement:
    """Tests for generation quota management."""

    @pytest.fixture
    def service(self):
        """Create service with mock db."""
        mock_db = AsyncMock()
        return GraphService(mock_db)

    @pytest.mark.asyncio
    async def test_can_generate_new_user(self, service):
        """Test new user can generate."""
        # Mock get_quota to return new quota
        quota = create_mock_quota(generations_used=0)
        service.get_quota = AsyncMock(return_value=quota)
        
        can_gen, remaining = await service.can_generate(
            student_id="new_user",
            subject="Python",
            is_premium=False
        )
        
        assert can_gen is True
        assert remaining == MAX_FREE_GENERATIONS

    @pytest.mark.asyncio
    async def test_can_generate_exhausted(self, service):
        """Test user with exhausted quota cannot generate."""
        quota = create_mock_quota(generations_used=MAX_FREE_GENERATIONS)
        service.get_quota = AsyncMock(return_value=quota)
        
        can_gen, remaining = await service.can_generate(
            student_id="exhausted_user",
            subject="Python",
            is_premium=False
        )
        
        assert can_gen is False
        assert remaining == 0

    @pytest.mark.asyncio
    async def test_premium_unlimited(self, service):
        """Test premium users have unlimited generations."""
        can_gen, remaining = await service.can_generate(
            student_id="premium_user",
            subject="Python",
            is_premium=True
        )
        
        assert can_gen is True
        assert remaining == -1  # Unlimited

    @pytest.mark.asyncio
    async def test_consume_generation(self, service):
        """Test consuming a generation."""
        quota = create_mock_quota(generations_used=1)
        service.get_quota = AsyncMock(return_value=quota)
        service.db.commit = AsyncMock()
        service.db.refresh = AsyncMock()
        
        result = await service.consume_generation(
            student_id="student_001",
            subject="Python"
        )
        
        assert result.generations_used == 2
        assert result.last_generation_at is not None


# ============================================================================
# Preview Management Tests
# ============================================================================

class TestPreviewManagement:
    """Tests for path preview management."""

    @pytest.fixture
    def service(self):
        """Create service with mock db."""
        mock_db = AsyncMock()
        return GraphService(mock_db)

    @pytest.mark.asyncio
    async def test_create_preview(self, service):
        """Test creating a preview."""
        service.db.add = MagicMock()
        service.db.commit = AsyncMock()
        service.db.refresh = AsyncMock()
        
        preview = await service.create_preview(
            student_id="student_001",
            graph_id=str(uuid.uuid4()),
            path_sequence=["node_1", "node_2"],
            path_details={"total_time": 60}
        )
        
        assert preview.student_id == "student_001"
        assert preview.status == "pending"
        assert len(preview.path_sequence) == 2
        assert preview.expires_at > datetime.utcnow()

    @pytest.mark.asyncio
    async def test_accept_preview(self, service):
        """Test accepting a preview."""
        preview = create_mock_preview(student_id="student_001", status="pending")
        service.get_preview = AsyncMock(return_value=preview)
        service.verify_graph = AsyncMock()
        service.db.commit = AsyncMock()
        service.db.refresh = AsyncMock()
        
        result = await service.accept_preview(
            preview_id=str(preview.id),
            student_id="student_001"
        )
        
        assert result.status == "accepted"
        assert result.accepted_at is not None
        service.verify_graph.assert_called_once()

    @pytest.mark.asyncio
    async def test_accept_wrong_student(self, service):
        """Test accepting preview by wrong student fails."""
        preview = create_mock_preview(student_id="student_001", status="pending")
        service.get_preview = AsyncMock(return_value=preview)
        
        with pytest.raises(ValueError, match="different student"):
            await service.accept_preview(
                preview_id=str(preview.id),
                student_id="wrong_student"
            )

    @pytest.mark.asyncio
    async def test_accept_expired_preview(self, service):
        """Test accepting expired preview fails."""
        preview = create_mock_preview(student_id="student_001", status="pending")
        preview.expires_at = datetime.utcnow() - timedelta(hours=1)  # Expired
        service.get_preview = AsyncMock(return_value=preview)
        service.db.commit = AsyncMock()
        
        with pytest.raises(ValueError, match="expired"):
            await service.accept_preview(
                preview_id=str(preview.id),
                student_id="student_001"
            )

    @pytest.mark.asyncio
    async def test_apply_skip_edit(self, service):
        """Test applying skip edit to preview."""
        preview = create_mock_preview(status="pending")
        preview.path_sequence = ["node_1", "node_2", "node_3"]
        preview.user_edits = []
        service.get_preview = AsyncMock(return_value=preview)
        service.db.commit = AsyncMock()
        service.db.refresh = AsyncMock()
        
        result = await service.apply_edit(
            preview_id=str(preview.id),
            edit={"action": "skip", "node_id": "node_2"}
        )
        
        assert "node_2" not in result.path_sequence
        assert len(result.user_edits) == 1

    @pytest.mark.asyncio
    async def test_apply_reorder_edit(self, service):
        """Test applying reorder edit to preview."""
        preview = create_mock_preview(status="pending")
        preview.path_sequence = ["node_1", "node_2", "node_3"]
        preview.user_edits = []
        service.get_preview = AsyncMock(return_value=preview)
        service.db.commit = AsyncMock()
        service.db.refresh = AsyncMock()
        
        result = await service.apply_edit(
            preview_id=str(preview.id),
            edit={"action": "reorder", "node_id": "node_3", "new_position": 0}
        )
        
        assert result.path_sequence[0] == "node_3"


# ============================================================================
# Social Proof Tests
# ============================================================================

class TestSocialProof:
    """Tests for social proof functionality."""

    @pytest.fixture
    def service(self):
        """Create service with mock db."""
        mock_db = AsyncMock()
        return GraphService(mock_db)

    @pytest.mark.asyncio
    async def test_get_social_proof(self, service):
        """Test getting social proof data."""
        graph = create_mock_graph(
            times_used=50,
            acceptance_rate=0.9,
            avg_rating=4.7
        )
        graph.avg_completion_rate = 0.75
        service.get_graph = AsyncMock(return_value=graph)
        
        proof = await service.get_social_proof(str(graph.id))
        
        assert proof["verified_by_count"] == 50
        assert proof["avg_rating"] == 4.7
        assert proof["completion_rate"] == 75.0
        assert proof["times_used"] == 50

    @pytest.mark.asyncio
    async def test_get_social_proof_not_found(self, service):
        """Test getting social proof for non-existent graph."""
        service.get_graph = AsyncMock(return_value=None)
        
        proof = await service.get_social_proof("nonexistent")
        
        assert proof == {}


# ============================================================================
# Graph Verification Tests
# ============================================================================

class TestGraphVerification:
    """Tests for graph verification workflow."""

    @pytest.fixture
    def service(self):
        """Create service with mock db."""
        mock_db = AsyncMock()
        return GraphService(mock_db)

    @pytest.mark.asyncio
    async def test_verify_graph_first_time(self, service):
        """Test first verification of a graph."""
        graph = create_mock_graph(status="draft")
        graph.times_used = 0
        graph.times_accepted = 0
        graph.verified_by_count = 0
        graph.first_verified_by = None
        
        service.get_graph = AsyncMock(return_value=graph)
        service.db.commit = AsyncMock()
        service.db.refresh = AsyncMock()
        
        result = await service.verify_graph(
            graph_id=str(graph.id),
            student_id="first_verifier"
        )
        
        assert result.status == "user_verified"
        assert result.times_used == 1
        assert result.times_accepted == 1
        assert result.first_verified_by == "first_verifier"

    @pytest.mark.asyncio
    async def test_verify_graph_becomes_popular(self, service):
        """Test graph becoming popular after enough verifications."""
        graph = create_mock_graph(status="user_verified")
        graph.times_used = POPULAR_THRESHOLD_USES - 1
        graph.times_accepted = int((POPULAR_THRESHOLD_USES - 1) * POPULAR_THRESHOLD_ACCEPTANCE)
        graph.verified_by_count = POPULAR_THRESHOLD_USES - 1
        
        service.get_graph = AsyncMock(return_value=graph)
        service.db.commit = AsyncMock()
        service.db.refresh = AsyncMock()
        
        result = await service.verify_graph(
            graph_id=str(graph.id),
            student_id="final_verifier"
        )
        
        assert result.status == "popular"

    @pytest.mark.asyncio
    async def test_reject_graph(self, service):
        """Test rejecting a graph (regenerate clicked)."""
        graph = create_mock_graph()
        graph.times_used = 10
        graph.times_accepted = 8
        
        service.get_graph = AsyncMock(return_value=graph)
        service.db.commit = AsyncMock()
        service.db.refresh = AsyncMock()
        
        result = await service.reject_graph(str(graph.id))
        
        assert result.times_used == 11
        assert result.times_accepted == 8  # Unchanged
        assert result.acceptance_rate < 0.8  # Decreased


# ============================================================================
# Rating Tests
# ============================================================================

class TestRating:
    """Tests for graph rating functionality."""

    @pytest.fixture
    def service(self):
        """Create service with mock db."""
        mock_db = AsyncMock()
        return GraphService(mock_db)

    @pytest.mark.asyncio
    async def test_rate_graph_valid(self, service):
        """Test rating a graph with valid rating."""
        service.db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        service.db.add = MagicMock()
        service.db.commit = AsyncMock()
        service._update_avg_rating = AsyncMock()
        
        rating = await service.rate_graph(
            graph_id=str(uuid.uuid4()),
            student_id="student_001",
            rating=5,
            feedback="Great path!"
        )
        
        assert rating.rating == 5
        assert rating.feedback == "Great path!"
        service._update_avg_rating.assert_called_once()

    @pytest.mark.asyncio
    async def test_rate_graph_invalid_rating(self, service):
        """Test rating with invalid value fails."""
        with pytest.raises(ValueError, match="between 1 and 5"):
            await service.rate_graph(
                graph_id=str(uuid.uuid4()),
                student_id="student_001",
                rating=6  # Invalid
            )

    @pytest.mark.asyncio
    async def test_rate_graph_update_existing(self, service):
        """Test updating existing rating."""
        existing_rating = MagicMock()
        existing_rating.rating = 3
        existing_rating.feedback = "Old feedback"
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=existing_rating)
        service.db.execute = AsyncMock(return_value=mock_result)
        service.db.commit = AsyncMock()
        service._update_avg_rating = AsyncMock()
        
        rating = await service.rate_graph(
            graph_id=str(uuid.uuid4()),
            student_id="student_001",
            rating=5,
            feedback="Updated feedback"
        )
        
        assert rating.rating == 5
        assert rating.feedback == "Updated feedback"
