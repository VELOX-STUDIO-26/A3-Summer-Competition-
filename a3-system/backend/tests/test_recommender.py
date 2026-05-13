"""Tests for the hybrid Recommender (content-based + collaborative)."""

from __future__ import annotations

import pytest

from adaptation.recommender import (
    CatalogNode,
    Recommender,
    StudentSnapshot,
    _jaccard,
    _minmax_normalise,
    _tokenize,
)


# ---------- helpers --------------------------------------------------------


def test_tokenize_lowercases_and_drops_short_tokens():
    toks = _tokenize("Recursion in Python: a Tour")
    assert "recursion" in toks
    assert "python" in toks
    assert "tour" in toks
    assert "a" not in toks  # too short
    assert "in" not in toks


def test_jaccard_disjoint_zero_identical_one():
    assert _jaccard(["a", "b"], ["c", "d"]) == 0.0
    assert _jaccard(["a", "b"], ["a", "b"]) == 1.0
    assert _jaccard([], []) == 0.0  # both empty -> 0 by convention


def test_minmax_normalise_constant_positive_returns_ones():
    """Single-item or all-equal positive signal must survive normalisation."""
    out = _minmax_normalise({"a": 0.5, "b": 0.5, "c": 0.5})
    assert all(v == 1.0 for v in out.values())


def test_minmax_normalise_constant_zero_returns_zeros():
    out = _minmax_normalise({"a": 0.0, "b": 0.0})
    assert all(v == 0.0 for v in out.values())


def test_minmax_normalise_scales_to_unit_range():
    out = _minmax_normalise({"a": 1.0, "b": 3.0, "c": 5.0})
    assert out["a"] == 0.0
    assert out["c"] == 1.0
    assert 0 < out["b"] < 1


# ---------- content-based --------------------------------------------------


def test_content_based_prefers_weak_point_matches():
    rec = Recommender(weak_point_weight=2.0)
    student = StudentSnapshot(
        student_id="s1",
        weak_points=["recursion"],
        goals=["machine learning"],
    )
    catalog = [
        CatalogNode(node_id="n_rec", title="Recursion Deep Dive",
                    topic_tags=["recursion", "algorithms"]),
        CatalogNode(node_id="n_ml", title="Machine Learning Basics",
                    topic_tags=["machine", "learning"]),
        CatalogNode(node_id="n_unrelated", title="Cooking Pasta"),
    ]
    scores = rec.content_based(student, catalog)
    # Weak-point match should beat goal match thanks to weak_point_weight=2
    assert scores["n_rec"] > scores["n_ml"] > scores["n_unrelated"]
    assert scores["n_unrelated"] == 0.0


def test_content_based_handles_empty_signals_gracefully():
    rec = Recommender()
    student = StudentSnapshot(student_id="s1")
    catalog = [CatalogNode(node_id="n", title="anything")]
    scores = rec.content_based(student, catalog)
    assert scores == {"n": 0.0}


# ---------- collaborative --------------------------------------------------


def test_collaborative_recommends_what_similar_students_mastered():
    rec = Recommender(neighbours_k=2)
    me = StudentSnapshot(
        student_id="me",
        knowledge_base={"loops": 0.9, "vars": 0.9},
    )
    similar = StudentSnapshot(
        student_id="sim",
        knowledge_base={"loops": 0.9, "vars": 0.9, "recursion": 0.95},
    )
    different = StudentSnapshot(
        student_id="diff",
        knowledge_base={"sql": 0.9, "joins": 0.9, "indexes": 0.95},
    )
    scores = rec.collaborative(me, [similar, different])
    # 'recursion' should be present (similar mastered it)
    assert "recursion" in scores
    # 'indexes' should NOT be present (no overlap with me)
    assert "indexes" not in scores


def test_collaborative_excludes_self():
    rec = Recommender()
    me = StudentSnapshot(
        student_id="me",
        knowledge_base={"a": 0.9, "b": 0.9},
    )
    scores = rec.collaborative(me, [me])
    assert scores == {}


def test_collaborative_filters_by_catalog():
    rec = Recommender()
    me = StudentSnapshot(student_id="me", knowledge_base={"a": 0.9})
    other = StudentSnapshot(
        student_id="o",
        knowledge_base={"a": 0.9, "b": 0.9, "c": 0.9},
    )
    catalog = [CatalogNode(node_id="b")]
    scores = rec.collaborative(me, [other], catalog=catalog)
    assert "b" in scores
    assert "c" not in scores  # filtered by catalog


# ---------- hybrid recommend ----------------------------------------------


def test_recommend_excludes_already_mastered():
    rec = Recommender()
    student = StudentSnapshot(
        student_id="s1",
        knowledge_base={"recursion": 0.95},
        weak_points=["recursion"],
    )
    catalog = [
        CatalogNode(node_id="recursion", title="Recursion",
                    topic_tags=["recursion"]),
        CatalogNode(node_id="loops", title="Loops",
                    topic_tags=["loops"]),
    ]
    recs = rec.recommend(student, catalog, top_n=5)
    ids = [r.node_id for r in recs]
    assert "recursion" not in ids


def test_recommend_returns_top_n_sorted_descending():
    rec = Recommender()
    student = StudentSnapshot(
        student_id="s1",
        weak_points=["sql databases"],
        goals=["data engineering"],
    )
    catalog = [
        CatalogNode(node_id="n1", title="SQL JOINs", topic_tags=["sql"]),
        CatalogNode(node_id="n2", title="Database Indexing",
                    topic_tags=["databases"]),
        CatalogNode(node_id="n3", title="Data Engineering Pipelines",
                    topic_tags=["data", "engineering"]),
        CatalogNode(node_id="n4", title="Painting Tutorials"),
    ]
    recs = rec.recommend(student, catalog, top_n=2)
    assert len(recs) == 2
    assert recs[0].score >= recs[1].score
    assert "n4" not in {r.node_id for r in recs}


def test_recommend_explanation_includes_signal_used():
    rec = Recommender()
    student = StudentSnapshot(
        student_id="s1",
        weak_points=["recursion"],
    )
    catalog = [CatalogNode(node_id="rec", title="Recursion", topic_tags=["recursion"])]
    recs = rec.recommend(student, catalog, top_n=1)
    assert len(recs) == 1
    assert "weak points" in recs[0].reason.lower() or recs[0].content_score > 0


def test_recommend_alpha_validation():
    with pytest.raises(ValueError):
        Recommender(alpha=1.5)
    with pytest.raises(ValueError):
        Recommender(alpha=-0.1)


def test_recommend_with_no_signals_returns_empty():
    rec = Recommender()
    student = StudentSnapshot(student_id="s1")  # no goals, no weak points, no kb
    catalog = [CatalogNode(node_id="n1", title="Unrelated topic")]
    recs = rec.recommend(student, catalog)
    assert recs == []


def test_recommend_alpha_one_uses_only_content():
    """alpha=1 → collaborative ignored, only content-based contributes."""
    rec = Recommender(alpha=1.0)
    student = StudentSnapshot(
        student_id="s1",
        weak_points=["recursion"],
        knowledge_base={},
    )
    similar = StudentSnapshot(
        student_id="o",
        knowledge_base={"sql": 0.9},  # offers 'sql' via collab
    )
    catalog = [
        CatalogNode(node_id="recursion_node", title="Recursion",
                    topic_tags=["recursion"]),
        CatalogNode(node_id="sql", title="SQL", topic_tags=["sql"]),
    ]
    recs = rec.recommend(student, catalog, neighbours=[similar], top_n=5)
    ids = [r.node_id for r in recs]
    assert ids[0] == "recursion_node"  # content match wins
