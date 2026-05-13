"""Embedding-based knowledge-gap detector.

This module implements the PRD's "embedding-based gap detection against an
expert answer corpus" pipeline.

Pipeline
--------
1. Load a JSON corpus mapping each knowledge node to one or more curated
   "expert answers" (canonical reference text).
2. On first use, embed every expert answer once via ``llm_client.get_embeddings``
   and cache the vectors in memory.
3. For an incoming student utterance, embed the utterance and compute the
   maximum cosine similarity against each node's expert answers.
4. Any node whose best similarity falls below ``threshold`` is reported as
   a likely *knowledge gap* — i.e. the student appears not to understand
   that topic.

The detector is intentionally tolerant: if embeddings fail (rate-limit,
mock LLM, missing API key), ``detect_gaps`` returns an empty list rather
than raising, so it can be wired into a chat pipeline as a non-blocking
enrichment step.
"""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from core.llm_client import llm_client
from core.logging import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class CorpusEntry:
    """One node's worth of curated expert reference text."""

    node_id: str
    weak_point_tag: str
    title: str
    expert_answers: List[str]
    embeddings: List[List[float]] = field(default_factory=list)


@dataclass
class GapResult:
    """Outcome of comparing a student utterance against one corpus entry."""

    node_id: str
    weak_point_tag: str
    title: str
    similarity: float
    is_gap: bool


# ---------------------------------------------------------------------------
# Cosine similarity (kept dependency-free — no numpy required)
# ---------------------------------------------------------------------------


def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    """Return cosine similarity in [-1.0, 1.0]; 0.0 if either vector is degenerate."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    norm_a = 0.0
    norm_b = 0.0
    for x, y in zip(a, b):
        dot += x * y
        norm_a += x * x
        norm_b += y * y
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (math.sqrt(norm_a) * math.sqrt(norm_b))


# ---------------------------------------------------------------------------
# Detector
# ---------------------------------------------------------------------------


def _default_corpus_path() -> str:
    """Resolve the path to ``data/expert_corpus.json`` relative to backend/."""
    backend_dir = Path(__file__).resolve().parent.parent
    return str(backend_dir.parent / "data" / "expert_corpus.json")


class GapDetector:
    """Detect knowledge gaps by comparing student text to an expert corpus."""

    def __init__(
        self,
        corpus_path: Optional[str] = None,
        threshold: float = 0.5,
        llm: Optional[Any] = None,
    ):
        self.corpus_path = corpus_path or _default_corpus_path()
        self.threshold = threshold
        self.llm = llm or llm_client
        self.entries: List[CorpusEntry] = []
        self._loaded_entries = False
        self._embedded = False

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    def _load_corpus(self) -> None:
        """Load corpus JSON into ``self.entries`` (idempotent)."""
        if self._loaded_entries:
            return
        path = Path(self.corpus_path)
        if not path.exists():
            logger.warning(f"Expert corpus not found at {path}")
            self._loaded_entries = True
            return

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        entries: List[CorpusEntry] = []
        for raw in data.get("entries", []):
            answers = [a for a in raw.get("expert_answers", []) if isinstance(a, str) and a.strip()]
            if not answers:
                continue
            entries.append(CorpusEntry(
                node_id=raw.get("node_id", ""),
                weak_point_tag=raw.get("weak_point_tag", ""),
                title=raw.get("title", ""),
                expert_answers=answers,
            ))

        self.entries = entries
        self._loaded_entries = True
        logger.info(f"Loaded expert corpus: {len(entries)} entries from {path}")

    async def _ensure_embeddings(self) -> bool:
        """Embed every expert answer once. Returns True if corpus is usable."""
        self._load_corpus()
        if not self.entries:
            return False
        if self._embedded:
            return True

        flat_texts: List[str] = []
        slices: List[tuple] = []  # (start, end) per entry
        for entry in self.entries:
            start = len(flat_texts)
            flat_texts.extend(entry.expert_answers)
            slices.append((start, len(flat_texts)))

        try:
            vectors = await self.llm.get_embeddings(flat_texts)
        except Exception as e:
            logger.warning(f"Failed to embed expert corpus: {e}")
            return False

        if len(vectors) != len(flat_texts):
            logger.warning(
                f"Embedding count mismatch: got {len(vectors)} for {len(flat_texts)} texts"
            )
            return False

        for entry, (start, end) in zip(self.entries, slices):
            entry.embeddings = vectors[start:end]

        self._embedded = True
        return True

    # ------------------------------------------------------------------
    # Detection
    # ------------------------------------------------------------------

    async def detect_gaps(
        self,
        student_text: str,
        candidate_node_ids: Optional[Sequence[str]] = None,
    ) -> List[GapResult]:
        """Score the student utterance against the expert corpus.

        Args:
            student_text: Free-form text written by the student.
            candidate_node_ids: Optional whitelist — if given, only score
                entries whose ``node_id`` is in this set. Useful when the
                surrounding chat already knows the topic in play.

        Returns:
            One ``GapResult`` per scored entry, sorted by similarity ascending
            (worst-understood topics first). Empty list on any failure.
        """
        if not student_text or not student_text.strip():
            return []

        if not await self._ensure_embeddings():
            return []

        try:
            student_vecs = await self.llm.get_embeddings([student_text])
        except Exception as e:
            logger.warning(f"Failed to embed student utterance: {e}")
            return []
        if not student_vecs or not student_vecs[0]:
            return []
        s_vec = student_vecs[0]

        whitelist = set(candidate_node_ids) if candidate_node_ids else None
        results: List[GapResult] = []
        for entry in self.entries:
            if whitelist is not None and entry.node_id not in whitelist:
                continue
            if not entry.embeddings:
                continue
            best_sim = max(cosine_similarity(s_vec, ev) for ev in entry.embeddings)
            results.append(GapResult(
                node_id=entry.node_id,
                weak_point_tag=entry.weak_point_tag,
                title=entry.title,
                similarity=best_sim,
                is_gap=best_sim < self.threshold,
            ))

        results.sort(key=lambda r: r.similarity)
        return results

    async def detect_weak_points(
        self,
        student_text: str,
        candidate_node_ids: Optional[Sequence[str]] = None,
    ) -> List[str]:
        """Convenience wrapper: return only the weak-point tags below threshold."""
        gaps = await self.detect_gaps(student_text, candidate_node_ids)
        return [g.weak_point_tag for g in gaps if g.is_gap and g.weak_point_tag]


# Module-level singleton — match the pattern used by other NLP modules
gap_detector = GapDetector()
