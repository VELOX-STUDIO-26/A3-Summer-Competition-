"""
Tests for Analytics Service, Rating System, and Validation.
"""

import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

# Test the validation logic
from agents.hierarchical_graph_generator import (
    HierarchicalGraphValidator,
    HierarchicalGraph,
    MainTopicNode,
    SubtopicNode,
    _validate_hierarchical_structure,
)


class TestHeuristicValidation:
    """Test the heuristic validation logic."""

    def _create_test_graph(
        self,
        num_topics: int = 6,
        subtopics_per_topic: int = 4,
        total_minutes: int = 600,
    ) -> HierarchicalGraph:
        """Create a test graph with specified parameters."""
        main_topics = []
        for i in range(num_topics):
            subtopics = [
                SubtopicNode(
                    node_id=f"sub_{i}_{j}",
                    title=f"Subtopic {i}.{j}",
                    description=f"Description for subtopic {i}.{j}",
                    difficulty=0.3 + (i * 0.1),
                    estimated_minutes=total_minutes // (num_topics * subtopics_per_topic),
                    learning_points=["Point 1", "Point 2"],
                    prerequisites=[],
                    topic_tags=["test"],
                    content_types=["text"],
                    order_index=j,
                )
                for j in range(subtopics_per_topic)
            ]
            main_topics.append(
                MainTopicNode(
                    node_id=f"main_{i}",
                    title=f"Main Topic {i}",
                    description=f"Description for main topic {i}",
                    difficulty=0.3 + (i * 0.1),
                    estimated_minutes=total_minutes // num_topics,
                    prerequisites=[f"main_{i-1}"] if i > 0 else [],
                    topic_tags=["test"],
                    subtopics=subtopics,
                    order_index=i,
                )
            )

        return HierarchicalGraph(
            subject="Test Subject",
            subject_normalized="test_subject",
            difficulty_level="intermediate",
            estimated_weeks=8,
            main_topics=main_topics,
            tags=["test"],
            is_valid=True,
            validation_errors=[],
        )

    def test_good_graph_passes_validation(self):
        """A well-structured graph should pass validation."""
        validator = HierarchicalGraphValidator()
        graph = self._create_test_graph(num_topics=6, subtopics_per_topic=4, total_minutes=600)
        
        result = validator._heuristic_validation(graph)
        
        assert result["is_valid"] is True
        assert result["quality_score"] >= 70
        assert result["overall_quality"] in ["good", "excellent"]
        print(f"✓ Good graph: quality_score={result['quality_score']}, quality={result['overall_quality']}")

    def test_few_topics_lowers_score(self):
        """A graph with too few topics should have lower score."""
        validator = HierarchicalGraphValidator()
        graph = self._create_test_graph(num_topics=2, subtopics_per_topic=4, total_minutes=600)
        
        result = validator._heuristic_validation(graph)
        
        assert result["quality_score"] < 90  # Should be penalized
        assert any("topics" in issue["description"].lower() for issue in result["issues"])
        print(f"✓ Few topics: quality_score={result['quality_score']}, issues={len(result['issues'])}")

    def test_short_duration_flagged(self):
        """A graph with very short total time should be flagged."""
        validator = HierarchicalGraphValidator()
        graph = self._create_test_graph(num_topics=6, subtopics_per_topic=4, total_minutes=200)
        
        result = validator._heuristic_validation(graph)
        
        assert any("time" in issue["description"].lower() or "short" in issue["description"].lower() 
                   for issue in result["issues"])
        print(f"✓ Short duration: quality_score={result['quality_score']}, issues={result['issues']}")

    def test_no_prerequisites_suggestion(self):
        """A graph without prerequisites should get a suggestion."""
        validator = HierarchicalGraphValidator()
        graph = self._create_test_graph(num_topics=6, subtopics_per_topic=4, total_minutes=600)
        
        # Remove all prerequisites
        for mt in graph.main_topics:
            mt.prerequisites = []
        
        result = validator._heuristic_validation(graph)
        
        assert any("prerequisite" in s.lower() for s in result["suggestions"])
        print(f"✓ No prerequisites: suggestions={result['suggestions']}")


class TestStructuralValidation:
    """Test the structural validation function."""

    def test_empty_graph_fails(self):
        """A graph with no topics should fail."""
        data = {"main_topics": []}
        errors = _validate_hierarchical_structure(data)
        
        assert len(errors) > 0
        assert any("no main topics" in e.lower() for e in errors)
        print(f"✓ Empty graph fails: {errors}")

    def test_duplicate_node_ids_fail(self):
        """Duplicate node IDs should fail validation."""
        data = {
            "main_topics": [
                {"node_id": "topic_1", "title": "Topic 1", "subtopics": []},
                {"node_id": "topic_1", "title": "Topic 2", "subtopics": []},  # Duplicate!
            ]
        }
        errors = _validate_hierarchical_structure(data)
        
        assert any("duplicate" in e.lower() for e in errors)
        print(f"✓ Duplicate IDs fail: {errors}")

    def test_self_referential_prerequisite_fails(self):
        """A topic that requires itself should fail."""
        data = {
            "main_topics": [
                {
                    "node_id": "topic_1",
                    "title": "Topic 1",
                    "prerequisites": ["topic_1"],  # Self-reference!
                    "subtopics": [
                        {"node_id": "sub_1", "title": "Sub 1", "difficulty": 0.5}
                    ]
                },
            ]
        }
        errors = _validate_hierarchical_structure(data)
        
        assert any("self-referential" in e.lower() for e in errors)
        print(f"✓ Self-reference fails: {errors}")

    def test_valid_structure_passes(self):
        """A valid structure should pass."""
        data = {
            "main_topics": [
                {
                    "node_id": "topic_1",
                    "title": "Topic 1",
                    "prerequisites": [],
                    "subtopics": [
                        {"node_id": "sub_1_1", "title": "Sub 1.1", "difficulty": 0.3},
                        {"node_id": "sub_1_2", "title": "Sub 1.2", "difficulty": 0.4},
                    ]
                },
                {
                    "node_id": "topic_2",
                    "title": "Topic 2",
                    "prerequisites": ["topic_1"],
                    "subtopics": [
                        {"node_id": "sub_2_1", "title": "Sub 2.1", "difficulty": 0.5},
                    ]
                },
            ]
        }
        errors = _validate_hierarchical_structure(data)
        
        assert len(errors) == 0
        print(f"✓ Valid structure passes")


class TestAnalyticsServiceMocked:
    """Test analytics service with mocked database."""

    @pytest.mark.asyncio
    async def test_quality_score_computation(self):
        """Test quality score computation logic."""
        from services.analytics_service import AnalyticsService
        from models.database import PathAnalytics
        
        # Create a mock analytics object
        analytics = PathAnalytics()
        analytics.completion_rate = 0.8  # 80% completion
        analytics.dropout_rate = 0.1  # 10% dropout
        analytics.avg_quiz_score = 0.75  # 75% avg score
        analytics.avg_first_attempt_pass_rate = 0.6  # 60% first attempt pass
        analytics.bypass_rate = 0.05  # 5% bypass
        
        # Mock the service
        mock_db = AsyncMock()
        service = AnalyticsService(mock_db)
        
        score = service._compute_quality_score(analytics)
        
        # Score should be reasonable (50 base + bonuses - penalties)
        assert 60 <= score <= 100
        print(f"✓ Quality score computed: {score}")

    def test_safe_mean_handles_empty(self):
        """Test safe_mean with empty/None values."""
        from services.analytics_service import AnalyticsService
        
        mock_db = MagicMock()
        service = AnalyticsService(mock_db)
        
        assert service._safe_mean([]) is None
        assert service._safe_mean([None, None]) is None
        assert service._safe_mean([1, 2, 3]) == 2.0
        assert service._safe_mean([1, None, 3]) == 2.0
        print(f"✓ safe_mean handles edge cases")


def run_tests():
    """Run all tests manually."""
    print("\n" + "="*60)
    print("Running Analytics & Validation Tests")
    print("="*60 + "\n")
    
    # Heuristic validation tests
    print("--- Heuristic Validation Tests ---")
    heuristic_tests = TestHeuristicValidation()
    heuristic_tests.test_good_graph_passes_validation()
    heuristic_tests.test_few_topics_lowers_score()
    heuristic_tests.test_short_duration_flagged()
    heuristic_tests.test_no_prerequisites_suggestion()
    
    # Structural validation tests
    print("\n--- Structural Validation Tests ---")
    structural_tests = TestStructuralValidation()
    structural_tests.test_empty_graph_fails()
    structural_tests.test_duplicate_node_ids_fail()
    structural_tests.test_self_referential_prerequisite_fails()
    structural_tests.test_valid_structure_passes()
    
    # Analytics tests (sync only)
    print("\n--- Analytics Service Tests ---")
    analytics_tests = TestAnalyticsServiceMocked()
    analytics_tests.test_safe_mean_handles_empty()
    
    print("\n" + "="*60)
    print("All tests passed! ✓")
    print("="*60 + "\n")


if __name__ == "__main__":
    run_tests()
