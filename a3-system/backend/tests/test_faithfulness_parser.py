"""
Unit tests for ``FaithfulnessChecker._parse_verification_response``.

We test only the pure parsing logic — no real LLM calls happen here.
The LLM is exercised separately in integration tests.
"""
from __future__ import annotations

import json

import pytest

from core.faithfulness_checker import FaithfulnessChecker, FaithfulnessResult


@pytest.fixture
def checker():
    return FaithfulnessChecker()


# ---------------------------------------------------------------------------
# Score arithmetic
# ---------------------------------------------------------------------------

class TestScoreArithmetic:
    def test_all_supported_yields_score_one(self, checker):
        response = json.dumps({
            "claims": [
                {"claim": "A", "status": "supported", "source_id": "s1"},
                {"claim": "B", "status": "supported", "source_id": "s1"},
            ],
            "citations_found": ["s1"],
        })
        result = checker._parse_verification_response(response)
        assert result.score == 1.0
        assert result.supported_count == 2
        assert result.total_claims == 2

    def test_half_supported_yields_score_half(self, checker):
        response = json.dumps({
            "claims": [
                {"claim": "A", "status": "supported", "source_id": "s1"},
                {"claim": "B", "status": "unverifiable", "source_id": None},
            ],
            "citations_found": [],
        })
        result = checker._parse_verification_response(response)
        assert result.score == 0.5
        assert result.unverifiable_count == 1
        assert len(result.unsupported_claims) == 1

    def test_contradicted_counts_against_score(self, checker):
        response = json.dumps({
            "claims": [
                {"claim": "X", "status": "supported"},
                {"claim": "Y", "status": "contradicted", "source_id": "s1"},
                {"claim": "Z", "status": "contradicted"},
            ],
        })
        result = checker._parse_verification_response(response)
        assert result.score == pytest.approx(1 / 3)
        assert result.contradicted_count == 2

    def test_empty_claims_list_returns_score_one(self, checker):
        response = json.dumps({"claims": []})
        result = checker._parse_verification_response(response)
        assert result.score == 1.0
        assert result.total_claims == 0


# ---------------------------------------------------------------------------
# JSON extraction robustness
# ---------------------------------------------------------------------------

class TestJsonExtraction:
    def test_handles_markdown_fenced_json(self, checker):
        payload = {"claims": [{"claim": "A", "status": "supported"}]}
        response = f"Sure!\n```json\n{json.dumps(payload)}\n```\nDone."
        result = checker._parse_verification_response(response)
        assert result.score == 1.0
        assert result.total_claims == 1

    def test_handles_raw_object_with_surrounding_text(self, checker):
        payload = {"claims": [{"claim": "A", "status": "unverifiable"}]}
        response = f"Here is the verification: {json.dumps(payload)} -- end --"
        result = checker._parse_verification_response(response)
        assert result.total_claims == 1
        assert result.unverifiable_count == 1

    def test_returns_permissive_result_on_unparseable_response(self, checker):
        result = checker._parse_verification_response("this is not JSON")
        # Permissive fallback: don't block content on parser errors
        assert result.score == 1.0
        assert result.total_claims == 0

    def test_none_response_handled(self, checker):
        result = checker._parse_verification_response(None)
        assert isinstance(result, FaithfulnessResult)
        assert result.score == 1.0

    def test_empty_string_response_handled(self, checker):
        result = checker._parse_verification_response("")
        assert result.score == 1.0


# ---------------------------------------------------------------------------
# Source formatting helper
# ---------------------------------------------------------------------------

class TestSourceFormatting:
    def test_formats_chunks_with_ids(self, checker):
        chunks = [
            {"id": "c1", "text": "First chunk."},
            {"id": "c2", "text": "Second chunk."},
        ]
        result = checker.format_sources_for_prompt(chunks)
        assert "[Source: c1]" in result
        assert "[Source: c2]" in result
        assert "First chunk." in result

    def test_truncates_when_over_max_length(self, checker):
        chunks = [{"id": f"c{i}", "text": "x" * 1000} for i in range(20)]
        result = checker.format_sources_for_prompt(chunks, max_length=2000)
        assert len(result) <= 2000 + 100  # small slack for the ellipsis tail

    def test_synthesises_id_when_missing(self, checker):
        chunks = [{"text": "hello"}]
        result = checker.format_sources_for_prompt(chunks)
        assert "chunk_0" in result
