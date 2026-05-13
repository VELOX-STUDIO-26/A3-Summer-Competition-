"""Tests for the embedding-based gap detector.

We mock ``llm_client.get_embeddings`` with deterministic vectors so the
similarity arithmetic and threshold logic can be exercised without making
real network calls.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import pytest

from nlp.gap_detector import GapDetector, cosine_similarity


# ---------------- pure helpers ----------------

class TestCosineSimilarity:
    def test_identical_vectors_similarity_one(self):
        assert cosine_similarity([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]) == pytest.approx(1.0)

    def test_orthogonal_vectors_similarity_zero(self):
        assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)

    def test_opposite_vectors_similarity_negative_one(self):
        assert cosine_similarity([1.0, 0.0], [-1.0, 0.0]) == pytest.approx(-1.0)

    def test_zero_vector_returns_zero(self):
        assert cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0

    def test_mismatched_lengths_returns_zero(self):
        assert cosine_similarity([1.0, 2.0], [1.0, 2.0, 3.0]) == 0.0

    def test_empty_inputs_return_zero(self):
        assert cosine_similarity([], [1.0]) == 0.0
        assert cosine_similarity([1.0], []) == 0.0


# ---------------- corpus fixture ----------------

@pytest.fixture
def corpus_file(tmp_path):
    payload = {
        "version": 1,
        "entries": [
            {
                "node_id": "N01",
                "weak_point_tag": "cloud_basics",
                "title": "Cloud Basics",
                "expert_answers": ["expert text for cloud basics"],
            },
            {
                "node_id": "N02",
                "weak_point_tag": "docker",
                "title": "Docker",
                "expert_answers": [
                    "expert text for docker containers",
                    "second answer about docker images",
                ],
            },
            {
                "node_id": "N03",
                "weak_point_tag": "k8s",
                "title": "Kubernetes",
                "expert_answers": [],  # empty — must be skipped on load
            },
        ],
    }
    p = tmp_path / "expert_corpus.json"
    p.write_text(json.dumps(payload), encoding="utf-8")
    return str(p)


def _vec(*xs: float):
    return list(xs)


class _FakeLLM:
    """Returns canned vectors keyed by exact text match."""

    def __init__(self, mapping):
        self.mapping = mapping
        self.calls = []

    async def get_embeddings(self, texts, model=None):
        self.calls.append(list(texts))
        out = []
        for t in texts:
            if t not in self.mapping:
                raise KeyError(f"No fake embedding for: {t!r}")
            out.append(self.mapping[t])
        return out


# ---------------- corpus loading ----------------

def test_corpus_load_skips_entries_with_no_answers(corpus_file):
    detector = GapDetector(corpus_path=corpus_file, llm=_FakeLLM({}))
    detector._load_corpus()
    ids = [e.node_id for e in detector.entries]
    assert "N01" in ids
    assert "N02" in ids
    assert "N03" not in ids  # empty answers -> dropped


def test_corpus_load_is_idempotent(corpus_file):
    detector = GapDetector(corpus_path=corpus_file, llm=_FakeLLM({}))
    detector._load_corpus()
    detector._load_corpus()
    assert len(detector.entries) == 2


def test_missing_corpus_file_does_not_raise(tmp_path):
    detector = GapDetector(
        corpus_path=str(tmp_path / "nonexistent.json"),
        llm=_FakeLLM({}),
    )
    detector._load_corpus()
    assert detector.entries == []


# ---------------- detection happy path ----------------

@pytest.mark.asyncio
async def test_detect_gaps_flags_low_similarity_topics(corpus_file):
    fake = _FakeLLM({
        # Corpus expert answers
        "expert text for cloud basics":          _vec(1.0, 0.0, 0.0),
        "expert text for docker containers":     _vec(0.0, 1.0, 0.0),
        "second answer about docker images":     _vec(0.0, 1.0, 0.0),
        # Student utterance — aligned with cloud, orthogonal to docker
        "I think clouds are like remote servers": _vec(1.0, 0.0, 0.0),
    })
    detector = GapDetector(corpus_path=corpus_file, threshold=0.5, llm=fake)

    results = await detector.detect_gaps("I think clouds are like remote servers")

    by_node = {r.node_id: r for r in results}
    assert by_node["N01"].similarity == pytest.approx(1.0)
    assert by_node["N01"].is_gap is False
    assert by_node["N02"].similarity == pytest.approx(0.0)
    assert by_node["N02"].is_gap is True

    # Sorted worst-first
    assert results[0].node_id == "N02"


@pytest.mark.asyncio
async def test_detect_weak_points_returns_only_gap_tags(corpus_file):
    fake = _FakeLLM({
        "expert text for cloud basics":           _vec(1.0, 0.0),
        "expert text for docker containers":      _vec(0.0, 1.0),
        "second answer about docker images":      _vec(0.0, 1.0),
        "student message":                        _vec(0.99, 0.01),
    })
    detector = GapDetector(corpus_path=corpus_file, threshold=0.5, llm=fake)

    tags = await detector.detect_weak_points("student message")
    assert tags == ["docker"]


@pytest.mark.asyncio
async def test_detect_uses_best_of_multiple_expert_answers(corpus_file):
    """If any one expert answer matches well, it's not a gap — even if the
    sibling answer is far from the student's text."""
    fake = _FakeLLM({
        "expert text for cloud basics":           _vec(0.0, 1.0),  # orthogonal
        "expert text for docker containers":      _vec(0.0, 1.0),  # orthogonal
        "second answer about docker images":      _vec(1.0, 0.0),  # MATCHES
        "student message":                        _vec(1.0, 0.0),
    })
    detector = GapDetector(corpus_path=corpus_file, threshold=0.5, llm=fake)
    results = await detector.detect_gaps("student message")
    by_node = {r.node_id: r for r in results}
    assert by_node["N02"].similarity == pytest.approx(1.0)
    assert by_node["N02"].is_gap is False


@pytest.mark.asyncio
async def test_detect_respects_candidate_node_whitelist(corpus_file):
    fake = _FakeLLM({
        "expert text for cloud basics":           _vec(1.0, 0.0),
        "expert text for docker containers":      _vec(0.0, 1.0),
        "second answer about docker images":      _vec(0.0, 1.0),
        "anything":                               _vec(1.0, 0.0),
    })
    detector = GapDetector(corpus_path=corpus_file, threshold=0.5, llm=fake)
    results = await detector.detect_gaps("anything", candidate_node_ids=["N02"])
    assert {r.node_id for r in results} == {"N02"}


# ---------------- caching ----------------

@pytest.mark.asyncio
async def test_corpus_embeddings_are_computed_once(corpus_file):
    fake = _FakeLLM({
        "expert text for cloud basics":           _vec(1.0, 0.0),
        "expert text for docker containers":      _vec(0.0, 1.0),
        "second answer about docker images":      _vec(0.0, 1.0),
        "msg one":                                _vec(1.0, 0.0),
        "msg two":                                _vec(0.0, 1.0),
    })
    detector = GapDetector(corpus_path=corpus_file, llm=fake)

    await detector.detect_gaps("msg one")
    await detector.detect_gaps("msg two")

    # Call 1: 3 corpus answers in one batch.
    # Calls 2 & 3: one student message each.
    assert len(fake.calls) == 3
    assert len(fake.calls[0]) == 3   # corpus batch
    assert fake.calls[1] == ["msg one"]
    assert fake.calls[2] == ["msg two"]


# ---------------- failure modes ----------------

@pytest.mark.asyncio
async def test_empty_student_text_returns_empty_list(corpus_file):
    detector = GapDetector(corpus_path=corpus_file, llm=_FakeLLM({}))
    assert await detector.detect_gaps("") == []
    assert await detector.detect_gaps("   \n  ") == []


@pytest.mark.asyncio
async def test_embedding_failure_returns_empty_list(corpus_file):
    class _BoomLLM:
        async def get_embeddings(self, texts, model=None):
            raise RuntimeError("embedding API down")

    detector = GapDetector(corpus_path=corpus_file, llm=_BoomLLM())
    # Must not raise — chat pipeline relies on graceful degradation
    assert await detector.detect_gaps("anything") == []


@pytest.mark.asyncio
async def test_missing_corpus_returns_empty_list(tmp_path):
    detector = GapDetector(
        corpus_path=str(tmp_path / "missing.json"),
        llm=_FakeLLM({}),
    )
    assert await detector.detect_gaps("anything") == []


@pytest.mark.asyncio
async def test_threshold_boundary_inclusive_below(corpus_file):
    """A similarity equal to the threshold is NOT a gap (strict < check)."""
    fake = _FakeLLM({
        "expert text for cloud basics":           _vec(1.0, 0.0),
        "expert text for docker containers":      _vec(0.0, 1.0),
        "second answer about docker images":      _vec(0.0, 1.0),
        # Student vector at exactly 45° from cloud expert => sim = 1/sqrt(2)
        "right at threshold": [1.0 / math.sqrt(2), 1.0 / math.sqrt(2)],
    })
    detector = GapDetector(
        corpus_path=corpus_file,
        threshold=1.0 / math.sqrt(2),
        llm=fake,
    )
    results = await detector.detect_gaps("right at threshold")
    cloud_result = next(r for r in results if r.node_id == "N01")
    assert cloud_result.similarity == pytest.approx(1.0 / math.sqrt(2))
    assert cloud_result.is_gap is False  # equal to threshold -> not a gap
