"""
Unit tests for ``ProfileBuilder`` — the weighted-moving-average merger
that combines per-message LLM extractions into a stable learner profile.

We test the pure dimension-merging logic; the LLM-driven extraction
(``ProfileExtractor.extract_from_message``) is exercised separately in
integration tests.
"""
from __future__ import annotations

import pytest

from nlp.profile_extractor import (
    ExtractionResult,
    ProfileBuilder,
    ProfileExtraction,
)


def _result(*pairs: tuple) -> ExtractionResult:
    """Build an ExtractionResult from (dim, value, confidence) tuples."""
    return ExtractionResult(
        extractions=[
            ProfileExtraction(
                dimension=dim,
                value=value,
                confidence=conf,
                evidence_quote=f"<{dim}>",
            )
            for dim, value, conf in pairs
        ]
    )


# ---------------------------------------------------------------------------
# Scalar dimensions
# ---------------------------------------------------------------------------

class TestScalarMerging:
    def test_first_extraction_seeds_profile(self):
        b = ProfileBuilder()
        b.add_extraction(_result(("learning_pace", 0.6, 0.8)))
        assert b.profile["learning_pace"] == 0.6
        assert b.confidence_scores["learning_pace"] == 0.8

    def test_numeric_update_uses_weighted_moving_average(self):
        b = ProfileBuilder()
        b.add_extraction(_result(("learning_pace", 0.4, 1.0)))
        # alpha = confidence * recency_weight = 1.0 * 0.3 = 0.3
        # new = 0.7 * 0.4 + 0.3 * 0.8 = 0.28 + 0.24 = 0.52
        b.add_extraction(_result(("learning_pace", 0.8, 1.0)), recency_weight=0.3)
        assert b.profile["learning_pace"] == pytest.approx(0.52, abs=1e-6)

    def test_cognitive_style_uses_highest_confidence(self):
        b = ProfileBuilder()
        b.add_extraction(_result(("cognitive_style", "visual", 0.6)))
        # Weaker evidence should NOT overwrite
        b.add_extraction(_result(("cognitive_style", "verbal", 0.4)))
        assert b.profile["cognitive_style"] == "visual"
        # Stronger evidence DOES overwrite
        b.add_extraction(_result(("cognitive_style", "kinetic", 0.9)))
        assert b.profile["cognitive_style"] == "kinetic"


# ---------------------------------------------------------------------------
# Dictionary dimension (knowledge_base)
# ---------------------------------------------------------------------------

class TestKnowledgeBaseMerging:
    def test_new_topic_added_with_confidence_scaling(self):
        b = ProfileBuilder()
        b.add_extraction(_result(("knowledge_base", {"docker": 0.8}, 0.5)))
        # New topic stored as score * confidence
        assert b.profile["knowledge_base"]["docker"] == pytest.approx(0.8 * 0.5)

    def test_existing_topic_uses_weighted_update(self):
        b = ProfileBuilder()
        b.add_extraction(_result(("knowledge_base", {"docker": 0.4}, 1.0)))
        # First write: 0.4 * 1.0 = 0.4
        assert b.profile["knowledge_base"]["docker"] == pytest.approx(0.4)
        # Second extraction: alpha = 1.0 * 0.3 = 0.3
        # new = 0.7 * 0.4 + 0.3 * 0.9 = 0.28 + 0.27 = 0.55
        b.add_extraction(_result(("knowledge_base", {"docker": 0.9}, 1.0)),
                         recency_weight=0.3)
        assert b.profile["knowledge_base"]["docker"] == pytest.approx(0.55, abs=1e-6)

    def test_multiple_topics_independent(self):
        b = ProfileBuilder()
        b.add_extraction(_result((
            "knowledge_base", {"docker": 0.8, "k8s": 0.3}, 1.0
        )))
        assert b.profile["knowledge_base"]["docker"] == pytest.approx(0.8)
        assert b.profile["knowledge_base"]["k8s"] == pytest.approx(0.3)


# ---------------------------------------------------------------------------
# List dimensions (weak_points, goals, content_preferences)
# ---------------------------------------------------------------------------

class TestListMerging:
    def test_appends_unique_items(self):
        b = ProfileBuilder()
        b.add_extraction(_result(("weak_points", ["docker", "k8s"], 0.7)))
        assert b.profile["weak_points"] == ["docker", "k8s"]

    def test_does_not_duplicate_existing_items(self):
        b = ProfileBuilder()
        b.add_extraction(_result(("weak_points", ["docker"], 0.7)))
        b.add_extraction(_result(("weak_points", ["docker", "k8s"], 0.6)))
        assert b.profile["weak_points"] == ["docker", "k8s"]

    def test_confidence_is_max_across_extractions(self):
        b = ProfileBuilder()
        b.add_extraction(_result(("goals", ["finish_course"], 0.4)))
        b.add_extraction(_result(("goals", ["pass_exam"], 0.9)))
        assert b.confidence_scores["goals"] == 0.9


# ---------------------------------------------------------------------------
# Profile completeness
# ---------------------------------------------------------------------------

class TestCompleteness:
    def test_incomplete_when_few_dimensions(self):
        b = ProfileBuilder()
        b.add_extraction(_result(("learning_pace", 0.5, 0.9)))
        assert not b.is_profile_complete(min_dimensions=4)

    def test_complete_when_four_confident_dimensions(self):
        b = ProfileBuilder()
        b.add_extraction(_result(
            ("learning_pace", 0.5, 0.9),
            ("cognitive_style", "visual", 0.9),
            ("weak_points", ["docker"], 0.9),
            ("goals", ["learn_cloud"], 0.9),
        ))
        assert b.is_profile_complete(min_dimensions=4, min_confidence=0.7)

    def test_low_confidence_dims_dont_count(self):
        b = ProfileBuilder()
        b.add_extraction(_result(
            ("learning_pace", 0.5, 0.3),         # below min_confidence=0.5
            ("cognitive_style", "visual", 0.3),
            ("weak_points", ["a"], 0.9),
            ("goals", ["b"], 0.9),
        ))
        assert not b.is_profile_complete(min_dimensions=4, min_confidence=0.5)

    def test_summary_contains_expected_keys(self):
        b = ProfileBuilder()
        b.add_extraction(_result(("learning_pace", 0.5, 0.9)))
        summary = b.get_profile_summary()
        for key in ["profile", "confidence_scores", "is_complete",
                    "dimensions_found", "extraction_count"]:
            assert key in summary
        assert summary["extraction_count"] == 1


# ---------------------------------------------------------------------------
# Helper accessors
# ---------------------------------------------------------------------------

class TestExtractionResultHelpers:
    def test_get_by_dimension_returns_highest_confidence(self):
        result = ExtractionResult(extractions=[
            ProfileExtraction("cognitive_style", "visual", 0.5, ""),
            ProfileExtraction("cognitive_style", "verbal", 0.9, ""),
            ProfileExtraction("cognitive_style", "kinetic", 0.7, ""),
        ])
        best = result.get_by_dimension("cognitive_style")
        assert best is not None
        assert best.value == "verbal"

    def test_get_by_dimension_returns_none_when_absent(self):
        result = ExtractionResult(extractions=[])
        assert result.get_by_dimension("anything") is None

    def test_get_dimensions_found_is_unique(self):
        result = ExtractionResult(extractions=[
            ProfileExtraction("learning_pace", 0.5, 0.9, ""),
            ProfileExtraction("learning_pace", 0.6, 0.8, ""),
            ProfileExtraction("cognitive_style", "visual", 0.9, ""),
        ])
        dims = set(result.get_dimensions_found())
        assert dims == {"learning_pace", "cognitive_style"}
