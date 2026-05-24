"""
Unit tests for Knowledge Graph Generator and Validator.

Tests cover:
- Subject normalization
- Structural validation (cycles, orphans, required fields)
- Graph generation
- Graph validation
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agents.knowledge_graph_generator import (
    GeneratedGraph,
    KnowledgeGraphGenerator,
    KnowledgeGraphValidator,
    KnowledgeNode,
    ValidationResult,
    _detect_cycles,
    _find_orphan_nodes,
    _parse_json_response,
    _validate_structure,
    normalize_subject,
)


# ============================================================================
# Test Data
# ============================================================================

def create_valid_nodes():
    """Create a valid set of nodes for testing."""
    return [
        {
            "node_id": "python_basics",
            "title": "Python Basics",
            "description": "Introduction to Python",
            "difficulty": 0.2,
            "estimated_minutes": 60,
            "prerequisites": [],
            "topic_tags": ["python"]
        },
        {
            "node_id": "numpy_intro",
            "title": "NumPy Introduction",
            "description": "Working with arrays",
            "difficulty": 0.4,
            "estimated_minutes": 45,
            "prerequisites": ["python_basics"],
            "topic_tags": ["numpy"]
        },
        {
            "node_id": "pandas_basics",
            "title": "Pandas Basics",
            "description": "Data manipulation",
            "difficulty": 0.5,
            "estimated_minutes": 60,
            "prerequisites": ["numpy_intro"],
            "topic_tags": ["pandas"]
        },
        {
            "node_id": "data_viz",
            "title": "Data Visualization",
            "description": "Creating charts",
            "difficulty": 0.5,
            "estimated_minutes": 45,
            "prerequisites": ["pandas_basics"],
            "topic_tags": ["visualization"]
        },
        {
            "node_id": "linear_regression",
            "title": "Linear Regression",
            "description": "Basic ML model",
            "difficulty": 0.6,
            "estimated_minutes": 90,
            "prerequisites": ["pandas_basics"],
            "topic_tags": ["ml"]
        }
    ]


def create_nodes_with_cycle():
    """Create nodes with a circular dependency."""
    return [
        {
            "node_id": "node_a",
            "title": "Node A",
            "description": "Test",
            "difficulty": 0.3,
            "estimated_minutes": 30,
            "prerequisites": ["node_c"],  # Creates cycle: A -> C -> B -> A
            "topic_tags": []
        },
        {
            "node_id": "node_b",
            "title": "Node B",
            "description": "Test",
            "difficulty": 0.4,
            "estimated_minutes": 30,
            "prerequisites": ["node_a"],
            "topic_tags": []
        },
        {
            "node_id": "node_c",
            "title": "Node C",
            "description": "Test",
            "difficulty": 0.5,
            "estimated_minutes": 30,
            "prerequisites": ["node_b"],
            "topic_tags": []
        }
    ]


def create_nodes_with_orphan():
    """Create nodes with an orphan (unreachable) node."""
    return [
        {
            "node_id": "entry_point",
            "title": "Entry Point",
            "description": "Start here",
            "difficulty": 0.2,
            "estimated_minutes": 30,
            "prerequisites": [],
            "topic_tags": []
        },
        {
            "node_id": "connected",
            "title": "Connected Node",
            "description": "Reachable",
            "difficulty": 0.4,
            "estimated_minutes": 30,
            "prerequisites": ["entry_point"],
            "topic_tags": []
        },
        {
            "node_id": "orphan_node",
            "title": "Orphan Node",
            "description": "Not reachable",
            "difficulty": 0.5,
            "estimated_minutes": 30,
            "prerequisites": ["nonexistent_node"],  # Invalid prereq
            "topic_tags": []
        },
        {
            "node_id": "another_connected",
            "title": "Another Connected",
            "description": "Also reachable",
            "difficulty": 0.5,
            "estimated_minutes": 30,
            "prerequisites": ["connected"],
            "topic_tags": []
        },
        {
            "node_id": "fifth_node",
            "title": "Fifth Node",
            "description": "Reachable too",
            "difficulty": 0.6,
            "estimated_minutes": 30,
            "prerequisites": ["another_connected"],
            "topic_tags": []
        }
    ]


# ============================================================================
# Subject Normalization Tests
# ============================================================================

class TestNormalizeSubject:
    """Tests for subject normalization."""

    def test_lowercase(self):
        assert normalize_subject("Machine Learning") == "machine_learning"

    def test_spaces_to_underscores(self):
        assert normalize_subject("data science") == "data_science"

    def test_hyphens_to_underscores(self):
        assert normalize_subject("web-development") == "web_development"

    def test_strip_whitespace(self):
        assert normalize_subject("  Python  ") == "python"

    def test_complex_subject(self):
        assert normalize_subject("Deep Learning with TensorFlow") == "deep_learning_with_tensorflow"


# ============================================================================
# JSON Parsing Tests
# ============================================================================

class TestParseJsonResponse:
    """Tests for JSON response parsing."""

    def test_plain_json(self):
        content = '{"key": "value"}'
        result = _parse_json_response(content)
        assert result == {"key": "value"}

    def test_json_with_markdown_block(self):
        content = '```json\n{"key": "value"}\n```'
        result = _parse_json_response(content)
        assert result == {"key": "value"}

    def test_json_with_generic_code_block(self):
        content = '```\n{"key": "value"}\n```'
        result = _parse_json_response(content)
        assert result == {"key": "value"}

    def test_json_with_whitespace(self):
        content = '  \n{"key": "value"}\n  '
        result = _parse_json_response(content)
        assert result == {"key": "value"}


# ============================================================================
# Cycle Detection Tests
# ============================================================================

class TestDetectCycles:
    """Tests for cycle detection in prerequisites."""

    def test_no_cycles(self):
        nodes = create_valid_nodes()
        cycles = _detect_cycles(nodes)
        assert len(cycles) == 0

    def test_simple_cycle(self):
        nodes = create_nodes_with_cycle()
        cycles = _detect_cycles(nodes)
        assert len(cycles) > 0

    def test_self_referencing_node(self):
        nodes = [
            {
                "node_id": "self_ref",
                "title": "Self Reference",
                "description": "Test",
                "difficulty": 0.5,
                "estimated_minutes": 30,
                "prerequisites": ["self_ref"],  # References itself
                "topic_tags": []
            }
        ]
        cycles = _detect_cycles(nodes)
        assert len(cycles) > 0

    def test_empty_nodes(self):
        cycles = _detect_cycles([])
        assert len(cycles) == 0


# ============================================================================
# Orphan Node Detection Tests
# ============================================================================

class TestFindOrphanNodes:
    """Tests for orphan node detection."""

    def test_no_orphans(self):
        nodes = create_valid_nodes()
        orphans = _find_orphan_nodes(nodes)
        assert len(orphans) == 0

    def test_with_orphan(self):
        nodes = create_nodes_with_orphan()
        orphans = _find_orphan_nodes(nodes)
        assert "orphan_node" in orphans

    def test_all_orphans_no_entry_point(self):
        nodes = [
            {
                "node_id": "node_a",
                "title": "Node A",
                "description": "Test",
                "difficulty": 0.5,
                "estimated_minutes": 30,
                "prerequisites": ["node_b"],
                "topic_tags": []
            },
            {
                "node_id": "node_b",
                "title": "Node B",
                "description": "Test",
                "difficulty": 0.5,
                "estimated_minutes": 30,
                "prerequisites": ["node_a"],
                "topic_tags": []
            }
        ]
        orphans = _find_orphan_nodes(nodes)
        assert len(orphans) == 2

    def test_empty_nodes(self):
        orphans = _find_orphan_nodes([])
        assert len(orphans) == 0


# ============================================================================
# Structure Validation Tests
# ============================================================================

class TestValidateStructure:
    """Tests for structural validation."""

    def test_valid_structure(self):
        nodes = create_valid_nodes()
        errors = _validate_structure(nodes)
        assert len(errors) == 0

    def test_empty_graph(self):
        errors = _validate_structure([])
        assert any("no nodes" in e.lower() for e in errors)

    def test_too_few_nodes(self):
        nodes = [
            {
                "node_id": "only_one",
                "title": "Only One",
                "description": "Test",
                "difficulty": 0.5,
                "estimated_minutes": 30,
                "prerequisites": [],
                "topic_tags": []
            }
        ]
        errors = _validate_structure(nodes)
        assert any("minimum" in e.lower() for e in errors)

    def test_missing_required_field(self):
        nodes = [
            {
                "node_id": "missing_title",
                # "title" is missing
                "description": "Test",
                "difficulty": 0.5,
                "estimated_minutes": 30,
                "prerequisites": [],
                "topic_tags": []
            }
        ]
        errors = _validate_structure(nodes)
        assert any("missing" in e.lower() for e in errors)

    def test_duplicate_node_ids(self):
        nodes = [
            {
                "node_id": "duplicate",
                "title": "First",
                "description": "Test",
                "difficulty": 0.3,
                "estimated_minutes": 30,
                "prerequisites": [],
                "topic_tags": []
            },
            {
                "node_id": "duplicate",  # Same ID
                "title": "Second",
                "description": "Test",
                "difficulty": 0.5,
                "estimated_minutes": 30,
                "prerequisites": [],
                "topic_tags": []
            },
            {
                "node_id": "third",
                "title": "Third",
                "description": "Test",
                "difficulty": 0.6,
                "estimated_minutes": 30,
                "prerequisites": ["duplicate"],
                "topic_tags": []
            },
            {
                "node_id": "fourth",
                "title": "Fourth",
                "description": "Test",
                "difficulty": 0.7,
                "estimated_minutes": 30,
                "prerequisites": ["third"],
                "topic_tags": []
            },
            {
                "node_id": "fifth",
                "title": "Fifth",
                "description": "Test",
                "difficulty": 0.8,
                "estimated_minutes": 30,
                "prerequisites": ["fourth"],
                "topic_tags": []
            }
        ]
        errors = _validate_structure(nodes)
        assert any("duplicate" in e.lower() for e in errors)

    def test_invalid_difficulty(self):
        nodes = [
            {
                "node_id": "invalid_diff",
                "title": "Invalid Difficulty",
                "description": "Test",
                "difficulty": 1.5,  # Invalid: > 1.0
                "estimated_minutes": 30,
                "prerequisites": [],
                "topic_tags": []
            }
        ]
        errors = _validate_structure(nodes)
        assert any("difficulty" in e.lower() for e in errors)

    def test_invalid_prerequisite_reference(self):
        nodes = create_valid_nodes()
        nodes[1]["prerequisites"] = ["nonexistent_node"]
        errors = _validate_structure(nodes)
        assert any("invalid prerequisite" in e.lower() for e in errors)

    def test_no_entry_points(self):
        nodes = [
            {
                "node_id": "node_a",
                "title": "Node A",
                "description": "Test",
                "difficulty": 0.5,
                "estimated_minutes": 30,
                "prerequisites": ["node_b"],
                "topic_tags": []
            },
            {
                "node_id": "node_b",
                "title": "Node B",
                "description": "Test",
                "difficulty": 0.5,
                "estimated_minutes": 30,
                "prerequisites": ["node_c"],
                "topic_tags": []
            },
            {
                "node_id": "node_c",
                "title": "Node C",
                "description": "Test",
                "difficulty": 0.5,
                "estimated_minutes": 30,
                "prerequisites": ["node_d"],
                "topic_tags": []
            },
            {
                "node_id": "node_d",
                "title": "Node D",
                "description": "Test",
                "difficulty": 0.5,
                "estimated_minutes": 30,
                "prerequisites": ["node_e"],
                "topic_tags": []
            },
            {
                "node_id": "node_e",
                "title": "Node E",
                "description": "Test",
                "difficulty": 0.5,
                "estimated_minutes": 30,
                "prerequisites": ["node_a"],  # Cycle
                "topic_tags": []
            }
        ]
        errors = _validate_structure(nodes)
        assert any("entry point" in e.lower() for e in errors)


# ============================================================================
# KnowledgeNode Tests
# ============================================================================

class TestKnowledgeNode:
    """Tests for KnowledgeNode dataclass."""

    def test_create_node(self):
        node = KnowledgeNode(
            node_id="test_node",
            title="Test Node",
            description="A test node",
            difficulty=0.5,
            estimated_minutes=30,
            prerequisites=["prereq_1"],
            topic_tags=["test"]
        )
        
        assert node.node_id == "test_node"
        assert node.title == "Test Node"
        assert node.difficulty == 0.5

    def test_node_to_dict(self):
        node = KnowledgeNode(
            node_id="test",
            title="Test",
            description="Desc",
            difficulty=0.5,
            estimated_minutes=30,
            prerequisites=[]
        )
        
        result = node.to_dict()
        
        assert isinstance(result, dict)
        assert result["node_id"] == "test"
        assert result["difficulty"] == 0.5


# ============================================================================
# GeneratedGraph Tests
# ============================================================================

class TestGeneratedGraph:
    """Tests for GeneratedGraph dataclass."""

    def test_create_graph(self):
        nodes = [
            KnowledgeNode(
                node_id="test",
                title="Test",
                description="Desc",
                difficulty=0.5,
                estimated_minutes=30,
                prerequisites=[]
            )
        ]
        
        graph = GeneratedGraph(
            subject="Test Subject",
            subject_normalized="test_subject",
            difficulty_level="beginner",
            estimated_weeks=4,
            nodes=nodes,
            tags=["test"]
        )
        
        assert graph.subject == "Test Subject"
        assert len(graph.nodes) == 1
        assert graph.is_valid is True

    def test_graph_to_dict(self):
        nodes = [
            KnowledgeNode(
                node_id="test",
                title="Test",
                description="Desc",
                difficulty=0.5,
                estimated_minutes=30,
                prerequisites=[]
            )
        ]
        
        graph = GeneratedGraph(
            subject="Test",
            subject_normalized="test",
            difficulty_level="beginner",
            estimated_weeks=4,
            nodes=nodes,
            tags=["test"]
        )
        
        result = graph.to_dict()
        
        assert isinstance(result, dict)
        assert result["subject"] == "Test"
        assert len(result["nodes"]) == 1


# ============================================================================
# KnowledgeGraphGenerator Tests
# ============================================================================

class TestKnowledgeGraphGenerator:
    """Tests for KnowledgeGraphGenerator."""

    @pytest.fixture
    def mock_llm(self):
        """Create a mock LLM client."""
        mock = AsyncMock()
        return mock

    @pytest.fixture
    def generator(self, mock_llm):
        """Create a generator with mock LLM."""
        return KnowledgeGraphGenerator(llm=mock_llm)

    @pytest.mark.asyncio
    async def test_generate_success(self, generator, mock_llm):
        """Test successful graph generation."""
        mock_response = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "subject": "Machine Learning",
                        "difficulty_level": "intermediate",
                        "estimated_weeks": 8,
                        "nodes": [
                            {
                                "node_id": "python_basics",
                                "title": "Python Basics",
                                "description": "Learn Python",
                                "difficulty": 0.2,
                                "estimated_minutes": 60,
                                "prerequisites": [],
                                "topic_tags": ["python"]
                            },
                            {
                                "node_id": "numpy",
                                "title": "NumPy",
                                "description": "Arrays",
                                "difficulty": 0.4,
                                "estimated_minutes": 45,
                                "prerequisites": ["python_basics"],
                                "topic_tags": ["numpy"]
                            },
                            {
                                "node_id": "pandas",
                                "title": "Pandas",
                                "description": "DataFrames",
                                "difficulty": 0.5,
                                "estimated_minutes": 60,
                                "prerequisites": ["numpy"],
                                "topic_tags": ["pandas"]
                            },
                            {
                                "node_id": "sklearn",
                                "title": "Scikit-learn",
                                "description": "ML library",
                                "difficulty": 0.6,
                                "estimated_minutes": 90,
                                "prerequisites": ["pandas"],
                                "topic_tags": ["ml"]
                            },
                            {
                                "node_id": "linear_reg",
                                "title": "Linear Regression",
                                "description": "First ML model",
                                "difficulty": 0.7,
                                "estimated_minutes": 60,
                                "prerequisites": ["sklearn"],
                                "topic_tags": ["ml"]
                            }
                        ],
                        "tags": ["ML", "python"]
                    })
                }
            }]
        }
        mock_llm.generate.return_value = mock_response
        
        result = await generator.generate(
            subject="Machine Learning",
            goals=["Learn ML basics"]
        )
        
        assert result.subject == "Machine Learning"
        assert result.subject_normalized == "machine_learning"
        assert len(result.nodes) == 5
        assert result.is_valid is True

    @pytest.mark.asyncio
    async def test_generate_invalid_json(self, generator, mock_llm):
        """Test handling of invalid JSON response."""
        mock_llm.generate.return_value = {
            "choices": [{
                "message": {
                    "content": "This is not valid JSON"
                }
            }]
        }
        
        result = await generator.generate(subject="Test")
        
        assert result.is_valid is False
        assert len(result.validation_errors) > 0

    @pytest.mark.asyncio
    async def test_generate_empty_response(self, generator, mock_llm):
        """Test handling of empty response."""
        mock_llm.generate.return_value = {}
        
        result = await generator.generate(subject="Test")
        
        assert result.is_valid is False

    @pytest.mark.asyncio
    async def test_generate_with_profile(self, generator, mock_llm):
        """Test generation with student profile."""
        mock_response = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "subject": "Python",
                        "difficulty_level": "beginner",
                        "estimated_weeks": 4,
                        "nodes": [
                            {"node_id": "n1", "title": "T1", "description": "D1", "difficulty": 0.2, "estimated_minutes": 30, "prerequisites": [], "topic_tags": []},
                            {"node_id": "n2", "title": "T2", "description": "D2", "difficulty": 0.3, "estimated_minutes": 30, "prerequisites": ["n1"], "topic_tags": []},
                            {"node_id": "n3", "title": "T3", "description": "D3", "difficulty": 0.4, "estimated_minutes": 30, "prerequisites": ["n2"], "topic_tags": []},
                            {"node_id": "n4", "title": "T4", "description": "D4", "difficulty": 0.5, "estimated_minutes": 30, "prerequisites": ["n3"], "topic_tags": []},
                            {"node_id": "n5", "title": "T5", "description": "D5", "difficulty": 0.6, "estimated_minutes": 30, "prerequisites": ["n4"], "topic_tags": []}
                        ],
                        "tags": ["python"]
                    })
                }
            }]
        }
        mock_llm.generate.return_value = mock_response
        
        result = await generator.generate(
            subject="Python",
            goals=["Learn programming"],
            knowledge_base={"math": 0.8},
            cognitive_style="visual",
            learning_pace=0.7
        )
        
        assert result.is_valid is True
        # Verify LLM was called with profile info
        mock_llm.generate.assert_called_once()


# ============================================================================
# KnowledgeGraphValidator Tests
# ============================================================================

class TestKnowledgeGraphValidator:
    """Tests for KnowledgeGraphValidator."""

    @pytest.fixture
    def mock_llm(self):
        """Create a mock LLM client."""
        return AsyncMock()

    @pytest.fixture
    def validator(self, mock_llm):
        """Create a validator with mock LLM."""
        return KnowledgeGraphValidator(llm=mock_llm)

    def create_test_graph(self, nodes_data=None):
        """Create a test graph."""
        if nodes_data is None:
            nodes_data = create_valid_nodes()
        
        nodes = [
            KnowledgeNode(
                node_id=n["node_id"],
                title=n["title"],
                description=n.get("description", ""),
                difficulty=n["difficulty"],
                estimated_minutes=n["estimated_minutes"],
                prerequisites=n["prerequisites"],
                topic_tags=n.get("topic_tags", [])
            )
            for n in nodes_data
        ]
        
        return GeneratedGraph(
            subject="Test Subject",
            subject_normalized="test_subject",
            difficulty_level="intermediate",
            estimated_weeks=8,
            nodes=nodes,
            tags=["test"]
        )

    @pytest.mark.asyncio
    async def test_validate_valid_graph(self, validator, mock_llm):
        """Test validation of a valid graph."""
        mock_llm.generate.return_value = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "is_valid": True,
                        "confidence": 0.9,
                        "issues": [],
                        "suggestions": [],
                        "missing_topics": [],
                        "overall_quality": "good"
                    })
                }
            }]
        }
        
        graph = self.create_test_graph()
        result = await validator.validate(graph)
        
        assert result.is_valid is True
        assert result.confidence > 0.5

    @pytest.mark.asyncio
    async def test_validate_without_llm(self, validator):
        """Test validation without LLM (structural only)."""
        graph = self.create_test_graph()
        result = await validator.validate(graph, use_llm=False)
        
        assert result.is_valid is True
        assert len(result.issues) == 0

    @pytest.mark.asyncio
    async def test_validate_graph_with_cycle(self, validator):
        """Test validation catches cycles."""
        graph = self.create_test_graph(create_nodes_with_cycle())
        result = await validator.validate(graph, use_llm=False)
        
        assert result.is_valid is False
        assert any("circular" in str(i).lower() for i in result.issues)

    @pytest.mark.asyncio
    async def test_validate_llm_finds_issues(self, validator, mock_llm):
        """Test that LLM-found issues are included."""
        mock_llm.generate.return_value = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "is_valid": False,
                        "confidence": 0.8,
                        "issues": [
                            {"type": "logical", "severity": "high", "description": "Wrong prerequisite order", "affected_nodes": ["node_a"]}
                        ],
                        "suggestions": [
                            {"action": "fix_prerequisite", "details": "Swap order"}
                        ],
                        "missing_topics": ["important_topic"],
                        "overall_quality": "acceptable"
                    })
                }
            }]
        }
        
        graph = self.create_test_graph()
        result = await validator.validate(graph, use_llm=True)
        
        # Should have LLM-found issues
        assert len(result.issues) > 0
        assert len(result.suggestions) > 0
        assert "important_topic" in result.missing_topics
