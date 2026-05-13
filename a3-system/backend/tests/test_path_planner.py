"""
Unit tests for the A* adaptive path planner.

These tests use a synthetic 6-node graph defined in ``conftest.py``:

    N01 ──▶ N02 ──▶ N03 ──▶ N04
     │                ╲
     ▼                 ▶ N06
    N05 ───────────────▶ N06
"""
from __future__ import annotations

import pytest

from agents.path_planner import (
    AdaptivePathPlanner,
    KnowledgeGraph,
    StudentState,
    plan_learning_path,
)


# ---------------------------------------------------------------------------
# Graph loading
# ---------------------------------------------------------------------------

class TestKnowledgeGraph:
    def test_loads_all_nodes(self, synthetic_graph):
        assert len(synthetic_graph.nodes) == 6
        assert "N01" in synthetic_graph.nodes
        assert synthetic_graph.nodes["N03"].title == "Docker"

    def test_edges_and_reverse_edges_are_consistent(self, synthetic_graph):
        # N03 → N04 forward
        targets = [t for t, _ in synthetic_graph.edges["N03"]]
        assert "N04" in targets
        # N04's reverse edge contains N03
        assert "N03" in synthetic_graph.reverse_edges["N04"]

    def test_topological_sort_respects_dependencies(self, synthetic_graph):
        order = synthetic_graph.topological_sort()
        # Every node must come after all its hard prerequisites
        for nid in order:
            node = synthetic_graph.nodes[nid]
            for prereq in node.hard_prerequisites:
                assert order.index(prereq) < order.index(nid), (
                    f"{prereq} must come before {nid} in topological order"
                )

    def test_get_prerequisites_hard_only(self, synthetic_graph):
        # N06 has hard prereqs N03 and N05
        prereqs = synthetic_graph.get_prerequisites("N06", hard_only=True)
        assert set(prereqs) == {"N03", "N05"}

    def test_missing_node_returns_empty_prereqs(self, synthetic_graph):
        assert synthetic_graph.get_prerequisites("DOES_NOT_EXIST") == []

    def test_handles_missing_graph_file_gracefully(self, tmp_path):
        # Pointing at a non-existent path must not crash; the graph is just empty.
        kg = KnowledgeGraph(graph_path=str(tmp_path / "missing.json"))
        assert kg.nodes == {}


# ---------------------------------------------------------------------------
# A* planner — core correctness
# ---------------------------------------------------------------------------

class TestPlannerCorrectness:
    def test_plan_returns_non_empty_path_for_beginner(
        self, synthetic_graph, beginner_profile
    ):
        planner = AdaptivePathPlanner(synthetic_graph)
        path, metrics = planner.plan_path(beginner_profile)

        assert isinstance(path, list)
        assert len(path) > 0
        assert all(isinstance(n, str) for n in path)
        # Beginner has nothing mastered → all 6 nodes must appear
        assert len(path) == 6

    def test_path_satisfies_all_hard_prerequisites(
        self, synthetic_graph, beginner_profile
    ):
        """Every node's hard prerequisites must appear earlier in the path."""
        planner = AdaptivePathPlanner(synthetic_graph)
        path, _ = planner.plan_path(beginner_profile)

        seen: set[str] = set()
        for nid in path:
            node = synthetic_graph.nodes[nid]
            unmet = [p for p in node.hard_prerequisites if p not in seen]
            assert not unmet, (
                f"Node {nid} appears before its prerequisites {unmet}; path={path}"
            )
            seen.add(nid)

    def test_dependency_satisfaction_metric_is_one_for_valid_path(
        self, synthetic_graph, beginner_profile
    ):
        planner = AdaptivePathPlanner(synthetic_graph)
        _, metrics = planner.plan_path(beginner_profile)
        assert metrics["dependency_satisfaction"] == 1.0

    def test_path_contains_no_duplicates(self, synthetic_graph, beginner_profile):
        planner = AdaptivePathPlanner(synthetic_graph)
        path, _ = planner.plan_path(beginner_profile)
        assert len(path) == len(set(path)), "Path must not repeat nodes"

    def test_metrics_total_minutes_matches_node_sum(
        self, synthetic_graph, beginner_profile
    ):
        planner = AdaptivePathPlanner(synthetic_graph)
        path, metrics = planner.plan_path(beginner_profile)
        expected = sum(synthetic_graph.nodes[n].est_minutes for n in path)
        assert metrics["total_estimated_minutes"] == expected


# ---------------------------------------------------------------------------
# Personalization
# ---------------------------------------------------------------------------

class TestPersonalization:
    def test_mastered_nodes_are_skipped(self, synthetic_graph, expert_profile):
        """Nodes with mastery >= 0.8 must NOT appear in the path."""
        planner = AdaptivePathPlanner(synthetic_graph)
        path, _ = planner.plan_path(expert_profile)

        assert "N01" not in path, "Mastered N01 must be skipped"
        assert "N02" not in path, "Mastered N02 must be skipped"
        # The downstream nodes should still appear
        assert "N03" in path
        assert "N04" in path

    def test_explicit_start_nodes_are_treated_as_mastered(
        self, synthetic_graph, beginner_profile
    ):
        planner = AdaptivePathPlanner(synthetic_graph)
        path, _ = planner.plan_path(beginner_profile, start_nodes=["N01", "N02"])
        assert "N01" not in path
        assert "N02" not in path

    def test_weak_points_appear_in_path(self, synthetic_graph):
        """Weak-point nodes should be included (they're penalized to surface earlier)."""
        student = StudentState(
            student_id="s1",
            weak_points=["N03"],  # by id
            content_preferences=[],
            learning_pace=0.5,
        )
        planner = AdaptivePathPlanner(synthetic_graph)
        path, metrics = planner.plan_path(student)
        assert "N03" in path
        # weak_point_coverage should reflect that N03 was covered
        assert metrics["weak_point_coverage"] == 1.0

    def test_weak_point_by_title_also_recognized(self, synthetic_graph):
        student = StudentState(
            student_id="s1",
            weak_points=["Docker"],  # title, not id
            learning_pace=0.5,
        )
        planner = AdaptivePathPlanner(synthetic_graph)
        path, metrics = planner.plan_path(student)
        assert "N03" in path  # Docker is N03
        assert metrics["weak_point_coverage"] == 1.0

    def test_content_preference_bonus_is_negative_for_matches(
        self, synthetic_graph, beginner_profile
    ):
        planner = AdaptivePathPlanner(synthetic_graph)
        # N03 has ["video", "code"]; beginner_profile prefers ["video", "diagram"]
        # → 1 of 2 prefs match → bonus = -0.2 * 0.5 = -0.1
        bonus = planner._preference_bonus("N03", beginner_profile)
        assert bonus < 0
        assert pytest.approx(bonus, abs=1e-6) == -0.1

    def test_no_content_preferences_yields_zero_bonus(self, synthetic_graph):
        student = StudentState(student_id="s", content_preferences=[])
        planner = AdaptivePathPlanner(synthetic_graph)
        assert planner._preference_bonus("N03", student) == 0.0


# ---------------------------------------------------------------------------
# Milestones
# ---------------------------------------------------------------------------

class TestMilestones:
    def test_milestones_partition_the_path(self, synthetic_graph, beginner_profile):
        planner = AdaptivePathPlanner(synthetic_graph)
        path, _ = planner.plan_path(beginner_profile)
        milestones = planner.create_milestones(path)

        flat = [n for m in milestones for n in m["nodes"]]
        assert flat == path, "Milestones must concatenate to original path"

    def test_milestone_durations_are_positive(self, synthetic_graph, beginner_profile):
        planner = AdaptivePathPlanner(synthetic_graph)
        path, _ = planner.plan_path(beginner_profile)
        milestones = planner.create_milestones(path)
        for m in milestones:
            assert m["duration_minutes"] > 0
            assert m["index"] >= 1

    def test_empty_path_yields_no_milestones(self, synthetic_graph):
        planner = AdaptivePathPlanner(synthetic_graph)
        assert planner.create_milestones([]) == []


# ---------------------------------------------------------------------------
# Convenience entry point
# ---------------------------------------------------------------------------

class TestConvenienceFunction:
    def test_plan_learning_path_against_real_graph(self):
        """`plan_learning_path` uses the bundled real graph; just sanity-check shape."""
        result = plan_learning_path(
            student_id="real_test",
            knowledge_base={},
            content_preferences=["text"],
            learning_pace=0.5,
        )
        assert "path" in result
        assert "milestones" in result
        assert "metrics" in result
        # The bundled English graph should have at least a handful of nodes
        assert isinstance(result["path"], list)


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_empty_graph_returns_empty_path(self, tmp_path):
        # KnowledgeGraph with non-existent file → empty graph
        kg = KnowledgeGraph(graph_path=str(tmp_path / "nope.json"))
        planner = AdaptivePathPlanner(kg)
        student = StudentState(student_id="x")
        path, metrics = planner.plan_path(student)
        assert path == []
        assert metrics == {}

    def test_all_nodes_mastered_returns_empty(self, synthetic_graph):
        student = StudentState(
            student_id="done",
            knowledge_base={f"N0{i}": 0.95 for i in range(1, 7)},
        )
        planner = AdaptivePathPlanner(synthetic_graph)
        path, _ = planner.plan_path(student)
        assert path == []
