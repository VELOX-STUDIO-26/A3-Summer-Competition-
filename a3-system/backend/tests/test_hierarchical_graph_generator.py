"""
Tests for Hierarchical Knowledge Graph Generator (v2.1).

Tests cover:
- Subject normalization
- JSON parsing
- Structural validation
- Graph generation
- Cycle detection
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock

from agents.hierarchical_graph_generator import (
    HierarchicalGraphGenerator,
    HierarchicalGraphValidator,
    HierarchicalGraph,
    MainTopicNode,
    SubtopicNode,
    normalize_subject,
    _parse_json_response,
    _validate_hierarchical_structure,
    _detect_cycles_in_main_topics,
)


# ============================================================================
# Helper Functions Tests
# ============================================================================

class TestNormalizeSubject:
    """Tests for subject normalization."""

    def test_basic_normalization(self):
        assert normalize_subject("Machine Learning") == "machine_learning"
        assert normalize_subject("Data Science") == "data_science"
        assert normalize_subject("Web Development") == "web_development"

    def test_handles_hyphens(self):
        assert normalize_subject("Front-End Development") == "front_end_development"

    def test_handles_extra_spaces(self):
        assert normalize_subject("  Python  ") == "python"

    def test_handles_mixed_case(self):
        assert normalize_subject("MACHINE LEARNING") == "machine_learning"


class TestParseJsonResponse:
    """Tests for JSON parsing."""

    def test_parse_clean_json(self):
        json_str = '{"subject": "ML", "nodes": []}'
        result = _parse_json_response(json_str)
        assert result["subject"] == "ML"

    def test_parse_json_with_markdown(self):
        json_str = '```json\n{"subject": "ML"}\n```'
        result = _parse_json_response(json_str)
        assert result["subject"] == "ML"

    def test_parse_json_with_generic_markdown(self):
        json_str = '```\n{"subject": "ML"}\n```'
        result = _parse_json_response(json_str)
        assert result["subject"] == "ML"

    def test_invalid_json_raises(self):
        with pytest.raises(json.JSONDecodeError):
            _parse_json_response("not valid json")


# ============================================================================
# Validation Tests
# ============================================================================

class TestValidateHierarchicalStructure:
    """Tests for hierarchical structure validation."""

    def test_valid_structure(self):
        """Test a valid hierarchical structure."""
        data = {
            "main_topics": [
                {
                    "node_id": "topic_1",
                    "title": "Topic 1",
                    "prerequisites": [],
                    "subtopics": [
                        {"node_id": "sub_1_1", "title": "Sub 1.1", "learning_points": ["a"], "estimated_minutes": 30, "difficulty": 0.3, "prerequisites": []},
                        {"node_id": "sub_1_2", "title": "Sub 1.2", "learning_points": ["b"], "estimated_minutes": 30, "difficulty": 0.4, "prerequisites": ["sub_1_1"]},
                        {"node_id": "sub_1_3", "title": "Sub 1.3", "learning_points": ["c"], "estimated_minutes": 30, "difficulty": 0.5, "prerequisites": ["sub_1_2"]},
                    ]
                },
                {
                    "node_id": "topic_2",
                    "title": "Topic 2",
                    "prerequisites": ["topic_1"],
                    "subtopics": [
                        {"node_id": "sub_2_1", "title": "Sub 2.1", "learning_points": ["d"], "estimated_minutes": 25, "difficulty": 0.4, "prerequisites": []},
                        {"node_id": "sub_2_2", "title": "Sub 2.2", "learning_points": ["e"], "estimated_minutes": 25, "difficulty": 0.5, "prerequisites": []},
                        {"node_id": "sub_2_3", "title": "Sub 2.3", "learning_points": ["f"], "estimated_minutes": 25, "difficulty": 0.6, "prerequisites": []},
                    ]
                },
                {
                    "node_id": "topic_3",
                    "title": "Topic 3",
                    "prerequisites": ["topic_2"],
                    "subtopics": [
                        {"node_id": "sub_3_1", "title": "Sub 3.1", "learning_points": ["g"], "estimated_minutes": 20, "difficulty": 0.5, "prerequisites": []},
                        {"node_id": "sub_3_2", "title": "Sub 3.2", "learning_points": ["h"], "estimated_minutes": 20, "difficulty": 0.6, "prerequisites": []},
                        {"node_id": "sub_3_3", "title": "Sub 3.3", "learning_points": ["i"], "estimated_minutes": 20, "difficulty": 0.7, "prerequisites": []},
                    ]
                },
                {
                    "node_id": "topic_4",
                    "title": "Topic 4",
                    "prerequisites": ["topic_3"],
                    "subtopics": [
                        {"node_id": "sub_4_1", "title": "Sub 4.1", "learning_points": ["j"], "estimated_minutes": 30, "difficulty": 0.6, "prerequisites": []},
                        {"node_id": "sub_4_2", "title": "Sub 4.2", "learning_points": ["k"], "estimated_minutes": 30, "difficulty": 0.7, "prerequisites": []},
                        {"node_id": "sub_4_3", "title": "Sub 4.3", "learning_points": ["l"], "estimated_minutes": 30, "difficulty": 0.8, "prerequisites": []},
                    ]
                },
                {
                    "node_id": "topic_5",
                    "title": "Topic 5",
                    "prerequisites": ["topic_4"],
                    "subtopics": [
                        {"node_id": "sub_5_1", "title": "Sub 5.1", "learning_points": ["m"], "estimated_minutes": 25, "difficulty": 0.7, "prerequisites": []},
                        {"node_id": "sub_5_2", "title": "Sub 5.2", "learning_points": ["n"], "estimated_minutes": 25, "difficulty": 0.8, "prerequisites": []},
                        {"node_id": "sub_5_3", "title": "Sub 5.3", "learning_points": ["o"], "estimated_minutes": 25, "difficulty": 0.9, "prerequisites": []},
                    ]
                },
            ]
        }
        
        errors = _validate_hierarchical_structure(data)
        assert len(errors) == 0

    def test_too_few_main_topics(self):
        """Test validation fails with too few main topics."""
        data = {
            "main_topics": [
                {
                    "node_id": "topic_1",
                    "title": "Topic 1",
                    "prerequisites": [],
                    "subtopics": [
                        {"node_id": "sub_1", "title": "Sub 1", "learning_points": ["a"], "estimated_minutes": 30, "difficulty": 0.3, "prerequisites": []},
                        {"node_id": "sub_2", "title": "Sub 2", "learning_points": ["b"], "estimated_minutes": 30, "difficulty": 0.4, "prerequisites": []},
                        {"node_id": "sub_3", "title": "Sub 3", "learning_points": ["c"], "estimated_minutes": 30, "difficulty": 0.5, "prerequisites": []},
                    ]
                }
            ]
        }
        
        errors = _validate_hierarchical_structure(data)
        assert any("minimum is 5" in e for e in errors)

    def test_too_few_subtopics(self):
        """Test validation fails with too few subtopics in a main topic."""
        data = {
            "main_topics": [
                {
                    "node_id": f"topic_{i}",
                    "title": f"Topic {i}",
                    "prerequisites": [],
                    "subtopics": [
                        {"node_id": f"sub_{i}_1", "title": "Sub 1", "learning_points": ["a"], "estimated_minutes": 30, "difficulty": 0.3, "prerequisites": []},
                        {"node_id": f"sub_{i}_2", "title": "Sub 2", "learning_points": ["b"], "estimated_minutes": 30, "difficulty": 0.4, "prerequisites": []},
                    ] if i == 0 else [  # First topic has only 2 subtopics
                        {"node_id": f"sub_{i}_1", "title": "Sub 1", "learning_points": ["a"], "estimated_minutes": 30, "difficulty": 0.3, "prerequisites": []},
                        {"node_id": f"sub_{i}_2", "title": "Sub 2", "learning_points": ["b"], "estimated_minutes": 30, "difficulty": 0.4, "prerequisites": []},
                        {"node_id": f"sub_{i}_3", "title": "Sub 3", "learning_points": ["c"], "estimated_minutes": 30, "difficulty": 0.5, "prerequisites": []},
                    ]
                }
                for i in range(5)
            ]
        }
        
        errors = _validate_hierarchical_structure(data)
        assert any("minimum is 3" in e for e in errors)

    def test_duplicate_node_ids(self):
        """Test validation fails with duplicate node IDs."""
        data = {
            "main_topics": [
                {
                    "node_id": f"topic_{i}",
                    "title": f"Topic {i}",
                    "prerequisites": [],
                    "subtopics": [
                        {"node_id": "duplicate_id", "title": "Sub 1", "learning_points": ["a"], "estimated_minutes": 30, "difficulty": 0.3, "prerequisites": []},
                        {"node_id": f"sub_{i}_2", "title": "Sub 2", "learning_points": ["b"], "estimated_minutes": 30, "difficulty": 0.4, "prerequisites": []},
                        {"node_id": f"sub_{i}_3", "title": "Sub 3", "learning_points": ["c"], "estimated_minutes": 30, "difficulty": 0.5, "prerequisites": []},
                    ]
                }
                for i in range(5)
            ]
        }
        
        errors = _validate_hierarchical_structure(data)
        assert any("Duplicate" in e for e in errors)

    def test_invalid_estimated_time(self):
        """Test validation fails with invalid estimated time."""
        data = {
            "main_topics": [
                {
                    "node_id": f"topic_{i}",
                    "title": f"Topic {i}",
                    "prerequisites": [],
                    "subtopics": [
                        {"node_id": f"sub_{i}_1", "title": "Sub 1", "learning_points": ["a"], "estimated_minutes": 5, "difficulty": 0.3, "prerequisites": []},  # Too short
                        {"node_id": f"sub_{i}_2", "title": "Sub 2", "learning_points": ["b"], "estimated_minutes": 30, "difficulty": 0.4, "prerequisites": []},
                        {"node_id": f"sub_{i}_3", "title": "Sub 3", "learning_points": ["c"], "estimated_minutes": 30, "difficulty": 0.5, "prerequisites": []},
                    ]
                }
                for i in range(5)
            ]
        }
        
        errors = _validate_hierarchical_structure(data)
        assert any("minimum is 15" in e for e in errors)


class TestCycleDetection:
    """Tests for cycle detection in main topics."""

    def test_no_cycles(self):
        """Test no cycles detected in valid structure."""
        main_topics = [
            {"node_id": "a", "prerequisites": []},
            {"node_id": "b", "prerequisites": ["a"]},
            {"node_id": "c", "prerequisites": ["b"]},
        ]
        
        errors = _detect_cycles_in_main_topics(main_topics)
        assert len(errors) == 0

    def test_simple_cycle(self):
        """Test simple cycle detection."""
        main_topics = [
            {"node_id": "a", "prerequisites": ["b"]},
            {"node_id": "b", "prerequisites": ["a"]},
        ]
        
        errors = _detect_cycles_in_main_topics(main_topics)
        assert len(errors) > 0
        assert any("Cycle" in e for e in errors)

    def test_complex_cycle(self):
        """Test complex cycle detection."""
        main_topics = [
            {"node_id": "a", "prerequisites": []},
            {"node_id": "b", "prerequisites": ["a"]},
            {"node_id": "c", "prerequisites": ["b"]},
            {"node_id": "d", "prerequisites": ["c", "a"]},
            {"node_id": "e", "prerequisites": ["d"]},
            {"node_id": "f", "prerequisites": ["e", "b"]},  # Creates cycle if b depends on f
        ]
        
        # No cycle here
        errors = _detect_cycles_in_main_topics(main_topics)
        assert len(errors) == 0


# ============================================================================
# Data Class Tests
# ============================================================================

class TestSubtopicNode:
    """Tests for SubtopicNode dataclass."""

    def test_to_dict(self):
        """Test SubtopicNode to_dict conversion."""
        subtopic = SubtopicNode(
            node_id="python_functions",
            title="Functions",
            description="Learn functions",
            difficulty=0.4,
            estimated_minutes=30,
            learning_points=["def", "return", "args"],
            prerequisites=["python_variables"],
            topic_tags=["python"],
            content_types=["text", "code"],
            order_index=2,
        )
        
        d = subtopic.to_dict()
        assert d["node_id"] == "python_functions"
        assert d["difficulty"] == 0.4
        assert len(d["learning_points"]) == 3
        assert d["order_index"] == 2


class TestMainTopicNode:
    """Tests for MainTopicNode dataclass."""

    def test_to_dict(self):
        """Test MainTopicNode to_dict conversion."""
        subtopic = SubtopicNode(
            node_id="sub_1",
            title="Sub 1",
            description="Desc",
            difficulty=0.3,
            estimated_minutes=30,
            learning_points=["a"],
        )
        
        main = MainTopicNode(
            node_id="python_fundamentals",
            title="Python Fundamentals",
            description="Core Python",
            difficulty=0.3,
            estimated_minutes=90,
            prerequisites=[],
            subtopics=[subtopic],
            topic_tags=["python"],
            order_index=0,
        )
        
        d = main.to_dict()
        assert d["node_id"] == "python_fundamentals"
        assert d["subtopic_count"] == 1
        assert len(d["subtopics"]) == 1


class TestHierarchicalGraph:
    """Tests for HierarchicalGraph dataclass."""

    def test_to_dict(self):
        """Test HierarchicalGraph to_dict conversion."""
        graph = HierarchicalGraph(
            subject="Machine Learning",
            subject_normalized="machine_learning",
            difficulty_level="intermediate",
            estimated_weeks=8,
            main_topics=[],
            tags=["ML", "AI"],
            total_subtopic_count=30,
            total_estimated_minutes=1800,
        )
        
        d = graph.to_dict()
        assert d["subject"] == "Machine Learning"
        assert d["main_topic_count"] == 0
        assert d["total_subtopic_count"] == 30
        assert d["is_valid"] is True


# ============================================================================
# Generator Tests
# ============================================================================

class TestHierarchicalGraphGenerator:
    """Tests for HierarchicalGraphGenerator."""

    @pytest.fixture
    def mock_llm(self):
        """Create a mock LLM client."""
        return MagicMock()

    @pytest.fixture
    def generator(self, mock_llm):
        """Create a generator with mock LLM."""
        return HierarchicalGraphGenerator(llm=mock_llm)

    @pytest.mark.asyncio
    async def test_generate_success(self, generator, mock_llm):
        """Test successful graph generation."""
        # Create valid response
        response_data = {
            "subject": "Machine Learning",
            "difficulty_level": "intermediate",
            "estimated_weeks": 10,
            "tags": ["ML", "AI"],
            "main_topics": [
                {
                    "node_id": f"topic_{i}",
                    "title": f"Topic {i}",
                    "description": f"Description {i}",
                    "prerequisites": [] if i == 0 else [f"topic_{i-1}"],
                    "topic_tags": ["tag"],
                    "subtopics": [
                        {
                            "node_id": f"sub_{i}_{j}",
                            "title": f"Subtopic {i}.{j}",
                            "description": f"Desc {i}.{j}",
                            "difficulty": 0.3 + (i * 0.1) + (j * 0.05),
                            "estimated_minutes": 25,
                            "learning_points": ["point1", "point2", "point3"],
                            "prerequisites": [] if j == 0 else [f"sub_{i}_{j-1}"],
                            "topic_tags": ["tag"],
                            "content_types": ["text", "code"],
                        }
                        for j in range(4)
                    ]
                }
                for i in range(6)
            ]
        }
        
        mock_llm.generate = AsyncMock(return_value={
            "choices": [{"message": {"content": json.dumps(response_data)}}]
        })
        
        result = await generator.generate("Machine Learning")
        
        assert result.subject == "Machine Learning"
        assert result.is_valid is True
        assert len(result.main_topics) == 6
        assert result.total_subtopic_count == 24

    @pytest.mark.asyncio
    async def test_generate_invalid_json(self, generator, mock_llm):
        """Test handling of invalid JSON response."""
        mock_llm.generate = AsyncMock(return_value={
            "choices": [{"message": {"content": "not valid json"}}]
        })
        
        result = await generator.generate("Machine Learning")
        
        assert result.is_valid is False
        assert any("Invalid JSON" in e for e in result.validation_errors)

    @pytest.mark.asyncio
    async def test_generate_with_goals(self, generator, mock_llm):
        """Test generation with specific goals."""
        response_data = {
            "subject": "Python",
            "difficulty_level": "beginner",
            "estimated_weeks": 6,
            "tags": ["python"],
            "main_topics": [
                {
                    "node_id": f"topic_{i}",
                    "title": f"Topic {i}",
                    "description": f"Desc {i}",
                    "prerequisites": [],
                    "subtopics": [
                        {
                            "node_id": f"sub_{i}_{j}",
                            "title": f"Sub {i}.{j}",
                            "description": "Desc",
                            "difficulty": 0.3,
                            "estimated_minutes": 30,
                            "learning_points": ["a", "b", "c"],
                            "prerequisites": [],
                            "topic_tags": [],
                            "content_types": ["text"],
                        }
                        for j in range(3)
                    ]
                }
                for i in range(5)
            ]
        }
        
        mock_llm.generate = AsyncMock(return_value={
            "choices": [{"message": {"content": json.dumps(response_data)}}]
        })
        
        result = await generator.generate(
            "Python",
            goals=["Get a job", "Build web apps"],
            knowledge_base={"programming": 0.2},
            cognitive_style="visual",
            learning_pace=0.7
        )
        
        assert result.subject == "Python"
        assert result.is_valid is True


# ============================================================================
# Validator Tests
# ============================================================================

class TestHierarchicalGraphValidator:
    """Tests for HierarchicalGraphValidator."""

    @pytest.fixture
    def validator(self):
        """Create a validator."""
        return HierarchicalGraphValidator()

    @pytest.mark.asyncio
    async def test_validate_valid_graph(self, validator):
        """Test validation of a valid graph."""
        graph = HierarchicalGraph(
            subject="Test",
            subject_normalized="test",
            difficulty_level="intermediate",
            estimated_weeks=8,
            main_topics=[
                MainTopicNode(
                    node_id=f"topic_{i}",
                    title=f"Topic {i}",
                    description="Desc",
                    difficulty=0.5,
                    estimated_minutes=90,
                    prerequisites=[],
                    subtopics=[
                        SubtopicNode(
                            node_id=f"sub_{i}_{j}",
                            title=f"Sub {i}.{j}",
                            description="Desc",
                            difficulty=0.5,
                            estimated_minutes=30,
                            learning_points=["a", "b", "c"],
                        )
                        for j in range(3)
                    ],
                )
                for i in range(5)
            ],
            tags=["test"],
            total_subtopic_count=15,
            total_estimated_minutes=450,
        )
        
        result = await validator.validate(graph)
        
        assert result["is_valid"] is True
        assert result["overall_quality"] == "good"


# ============================================================================
# Two-Pass (Lazy) Generation Tests
# ============================================================================

class TestTwoPassGeneration:
    """Tests for two-pass generation: main topics first, subtopics on demand."""

    @pytest.fixture
    def mock_llm(self):
        return MagicMock()

    @pytest.fixture
    def generator(self, mock_llm):
        return HierarchicalGraphGenerator(llm=mock_llm)

    @pytest.mark.asyncio
    async def test_generate_main_topics_only(self, generator, mock_llm):
        """Pass 1 returns main topics with no subtopics, only a planned count."""
        response_data = {
            "subject": "Linux",
            "difficulty_level": "beginner",
            "estimated_weeks": 8,
            "tags": ["linux"],
            "main_topics": [
                {
                    "node_id": f"topic_{i}",
                    "title": f"Topic {i}",
                    "description": f"Desc {i}",
                    "difficulty": 0.2 + i * 0.1,
                    "prerequisites": [] if i == 0 else [f"topic_{i-1}"],
                    "topic_tags": ["linux"],
                    "planned_subtopic_count": 5,
                }
                for i in range(6)
            ],
        }
        mock_llm.generate = AsyncMock(return_value={
            "choices": [{"message": {"content": json.dumps(response_data)}}]
        })

        result = await generator.generate_main_topics("Linux")

        assert result.is_valid is True
        assert len(result.main_topics) == 6
        # No subtopics generated in pass 1
        assert all(len(mt.subtopics) == 0 for mt in result.main_topics)
        assert all(mt.planned_subtopic_count == 5 for mt in result.main_topics)
        assert result.total_subtopic_count == 0

    @pytest.mark.asyncio
    async def test_generate_main_topics_clamps_planned_count(self, generator, mock_llm):
        """Planned subtopic count is clamped to the 3-8 range."""
        response_data = {
            "subject": "Linux",
            "main_topics": [
                {"node_id": "a", "title": "A", "description": "d", "planned_subtopic_count": 99},
                {"node_id": "b", "title": "B", "description": "d", "planned_subtopic_count": 1},
            ],
        }
        mock_llm.generate = AsyncMock(return_value={
            "choices": [{"message": {"content": json.dumps(response_data)}}]
        })

        result = await generator.generate_main_topics("Linux")

        assert result.main_topics[0].planned_subtopic_count == 8
        assert result.main_topics[1].planned_subtopic_count == 3

    @pytest.mark.asyncio
    async def test_generate_subtopics_for_milestone(self, generator, mock_llm):
        """Pass 2 expands one milestone into subtopics."""
        response_data = {
            "subtopics": [
                {
                    "node_id": f"sub_{j}",
                    "title": f"Sub {j}",
                    "description": f"Desc {j}",
                    "difficulty": 0.3,
                    "estimated_minutes": 30,
                    "learning_points": ["a", "b"],
                    "prerequisites": [] if j == 0 else [f"sub_{j-1}"],
                    "content_types": ["text", "quiz"],
                }
                for j in range(5)
            ]
        }
        mock_llm.generate = AsyncMock(return_value={
            "choices": [{"message": {"content": json.dumps(response_data)}}]
        })

        subs = await generator.generate_subtopics(
            subject="Linux", main_title="Fundamentals", target_count=5
        )

        assert len(subs) == 5
        assert subs[0].node_id == "sub_0"
        assert all(15 <= s.estimated_minutes <= 60 for s in subs)
        assert [s.order_index for s in subs] == [0, 1, 2, 3, 4]

    @pytest.mark.asyncio
    async def test_generate_subtopics_raises_on_failure(self, generator, mock_llm):
        """Pass 2 raises (rather than returning empty) when the LLM fails."""
        mock_llm.generate = AsyncMock(return_value={
            "choices": [{"message": {"content": "not valid json"}}]
        })

        with pytest.raises(ValueError):
            await generator.generate_subtopics(
                subject="Linux", main_title="Fundamentals", target_count=5
            )
