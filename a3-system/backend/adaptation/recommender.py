"""Hybrid recommendation engine (collaborative + content-based filtering).

Implements the "recommendation engine" gap from the PRD. Intentionally
self-contained and dependency-free (no numpy, no DB) so it works in the
same offline CI that runs the rest of the test-suite.

Signals
-------
**Content-based**: score each candidate node by token overlap between its
``topic_tags``/``title`` and the student's ``goals`` + ``weak_points``
(weak points weighted higher — these are what we most want to remediate).

**Collaborative**: find the K most similar students by Jaccard similarity
over their ``knowledge_base`` mastered topics, then recommend nodes
they've mastered that the current student has not.

**Hybrid**: a convex combination ``alpha * content + (1 - alpha) * collab``,
default alpha = 0.6 favouring content-based because the platform can be
cold-started with a single student.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set

from core.logging import get_logger

logger = get_logger(__name__)

MASTERY_THRESHOLD = 0.8  # what counts as "mastered"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class CatalogNode:
    """Minimal shape the recommender needs from the knowledge graph."""

    node_id: str
    title: str = ""
    topic_tags: List[str] = field(default_factory=list)
    description: str = ""
    difficulty: float = 0.5


@dataclass
class StudentSnapshot:
    """Minimal shape the recommender needs from a student profile."""

    student_id: str
    knowledge_base: Dict[str, float] = field(default_factory=dict)
    weak_points: List[str] = field(default_factory=list)
    goals: List[str] = field(default_factory=list)


@dataclass
class Recommendation:
    """One scored node with its provenance for observability / explainability."""

    node_id: str
    score: float
    content_score: float = 0.0
    collab_score: float = 0.0
    reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "score": round(self.score, 4),
            "content_score": round(self.content_score, 4),
            "collab_score": round(self.collab_score, 4),
            "reason": self.reason,
        }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _tokenize(text: str) -> Set[str]:
    if not text:
        return set()
    lowered = text.lower()
    for ch in "-_/,.;:()[]{}\"'":
        lowered = lowered.replace(ch, " ")
    return {t for t in lowered.split() if len(t) > 2}


def _node_tokens(node: CatalogNode) -> Set[str]:
    tokens: Set[str] = set()
    tokens.update(_tokenize(node.title))
    tokens.update(_tokenize(node.description))
    for tag in node.topic_tags:
        tokens.update(_tokenize(tag))
    return tokens


def _jaccard(a: Iterable[str], b: Iterable[str]) -> float:
    sa, sb = set(a), set(b)
    if not sa and not sb:
        return 0.0
    intersect = len(sa & sb)
    union = len(sa | sb)
    return intersect / union if union else 0.0


def _mastered(snapshot: StudentSnapshot) -> Set[str]:
    return {k for k, v in snapshot.knowledge_base.items() if v >= MASTERY_THRESHOLD}


# ---------------------------------------------------------------------------
# Recommender
# ---------------------------------------------------------------------------


class Recommender:
    """Hybrid content-based + collaborative recommender."""

    def __init__(
        self,
        alpha: float = 0.6,
        weak_point_weight: float = 2.0,
        neighbours_k: int = 5,
    ):
        if not 0.0 <= alpha <= 1.0:
            raise ValueError(f"alpha must be in [0, 1], got {alpha}")
        self.alpha = alpha
        self.weak_point_weight = weak_point_weight
        self.neighbours_k = neighbours_k

    # ------------------------------------------------------------------
    # Content-based
    # ------------------------------------------------------------------

    def content_based(
        self,
        student: StudentSnapshot,
        catalog: Sequence[CatalogNode],
    ) -> Dict[str, float]:
        """Score nodes by token overlap with weak points + goals.

        Returns a mapping ``node_id -> score``. Scores are not normalised
        here; :meth:`recommend` normalises at the fusion step.
        """
        # Pre-tokenise each weak point and goal so we can count discrete
        # matches rather than token-level overlap (which would unfairly
        # penalise nodes with rich descriptions).
        weak_token_sets = [_tokenize(w) for w in student.weak_points if _tokenize(w)]
        goal_token_sets = [_tokenize(g) for g in student.goals if _tokenize(g)]

        scores: Dict[str, float] = {}
        for node in catalog:
            node_tokens = _node_tokens(node)
            if not node_tokens:
                scores[node.node_id] = 0.0
                continue
            weak_matches = sum(1 for ts in weak_token_sets if ts & node_tokens)
            goal_matches = sum(1 for ts in goal_token_sets if ts & node_tokens)
            scores[node.node_id] = (
                goal_matches + self.weak_point_weight * weak_matches
            )
        return scores

    # ------------------------------------------------------------------
    # Collaborative
    # ------------------------------------------------------------------

    def collaborative(
        self,
        student: StudentSnapshot,
        neighbours: Sequence[StudentSnapshot],
        catalog: Optional[Sequence[CatalogNode]] = None,
    ) -> Dict[str, float]:
        """Score nodes by what similar students have mastered.

        For each neighbour we compute Jaccard similarity over their mastered
        topic sets. Then for every node the current student has NOT mastered,
        the score is the similarity-weighted fraction of neighbours who
        have mastered it.
        """
        my_mastered = _mastered(student)

        # Rank neighbours by similarity, skip self + empty profiles
        ranked: List[tuple] = []
        for other in neighbours:
            if other.student_id == student.student_id:
                continue
            other_mastered = _mastered(other)
            sim = _jaccard(my_mastered, other_mastered)
            if sim > 0:
                ranked.append((sim, other, other_mastered))
        ranked.sort(key=lambda t: t[0], reverse=True)
        top = ranked[: self.neighbours_k]
        if not top:
            return {}

        total_weight = sum(sim for sim, _, _ in top)
        scores: Dict[str, float] = {}
        catalog_ids = {n.node_id for n in catalog} if catalog else None

        for sim, _other, other_mastered in top:
            for node_id in other_mastered - my_mastered:
                if catalog_ids is not None and node_id not in catalog_ids:
                    continue
                scores[node_id] = scores.get(node_id, 0.0) + sim
        # Normalise by total neighbour weight so scores are in [0, 1]
        if total_weight > 0:
            for k in scores:
                scores[k] /= total_weight
        return scores

    # ------------------------------------------------------------------
    # Hybrid fusion
    # ------------------------------------------------------------------

    def recommend(
        self,
        student: StudentSnapshot,
        catalog: Sequence[CatalogNode],
        neighbours: Optional[Sequence[StudentSnapshot]] = None,
        top_n: int = 5,
        exclude_mastered: bool = True,
    ) -> List[Recommendation]:
        """Return the ``top_n`` recommended nodes for ``student``.

        Combines content-based and collaborative signals via
        ``alpha * content + (1 - alpha) * collab`` (after min-max
        normalisation of each signal).
        """
        content_raw = self.content_based(student, catalog)
        collab_raw = self.collaborative(student, neighbours or [], catalog)

        content_norm = _minmax_normalise(content_raw)
        collab_norm = _minmax_normalise(collab_raw)

        mastered = _mastered(student) if exclude_mastered else set()

        recs: List[Recommendation] = []
        for node in catalog:
            if node.node_id in mastered:
                continue
            c = content_norm.get(node.node_id, 0.0)
            k = collab_norm.get(node.node_id, 0.0)
            fused = self.alpha * c + (1 - self.alpha) * k
            if fused <= 0:
                continue
            reason = self._explain(c, k)
            recs.append(Recommendation(
                node_id=node.node_id,
                score=fused,
                content_score=c,
                collab_score=k,
                reason=reason,
            ))

        recs.sort(key=lambda r: r.score, reverse=True)
        return recs[:top_n]

    # ------------------------------------------------------------------
    # Explainability
    # ------------------------------------------------------------------

    @staticmethod
    def _explain(content: float, collab: float) -> str:
        if content > 0 and collab > 0:
            if content >= collab:
                return "Matches your weak points and goals; also popular among peers"
            return "Popular among similar learners; also topically relevant"
        if content > 0:
            return "Matches your weak points and goals"
        if collab > 0:
            return "Mastered by learners with a similar profile"
        return "General recommendation"


# ---------------------------------------------------------------------------
# Normalisation helper (module-private)
# ---------------------------------------------------------------------------


def _minmax_normalise(scores: Dict[str, float]) -> Dict[str, float]:
    if not scores:
        return {}
    values = list(scores.values())
    lo, hi = min(values), max(values)
    if math.isclose(lo, hi):
        # All equal — preserve a positive signal as 1.0 so single-item
        # catalogs still surface in recommendations; otherwise zero out.
        positive = hi > 0
        return {k: (1.0 if positive else 0.0) for k in scores}
    span = hi - lo
    return {k: (v - lo) / span for k, v in scores.items()}


# Module-level singleton
recommender = Recommender()
