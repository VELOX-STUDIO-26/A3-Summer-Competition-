"""Unit tests for GateAgent's deterministic gate score calculation.

The gate uses pure local math (no LLM call), so we cover scoring thresholds,
weighted aggregation, engagement signal detection, and bypass behaviour.
"""

import pytest

from agents.gate_agent import GateAgent, RESOURCE_WEIGHTS


@pytest.fixture
def agent():
    return GateAgent()


def _full_engagement():
    """A fully completed milestone — should score 1.0."""
    return {
        "notes":         {"events": [1], "max_scroll": 1.0, "completion": 1.0, "time_spent": 600},
        "mindmap":       {"events": [1], "completion": 1.0, "total_nodes": 10,
                          "nodes_interacted": 10, "time_spent": 60},
        "video":         {"events": [1], "watch_percentage": 1.0, "playback_speed": 1.0,
                          "completion": 1.0, "replay_count": 1},
        "code":          {"events": [1], "tests_passed": 2, "completion": 1.0, "run_count": 5},
        "practice_quiz": {"events": [1], "completion": 1.0},
    }


@pytest.mark.asyncio
async def test_full_engagement_unlocks_quiz(agent):
    out = await agent.calculate_gate(_full_engagement(), bypass_requested=False)
    assert out["quiz_unlocked"] is True
    assert out["gate_score"] >= 0.95
    assert out["bypass_mode"] is False


@pytest.mark.asyncio
async def test_no_engagement_locks_quiz(agent):
    empty = {k: {"events": []} for k in RESOURCE_WEIGHTS}
    out = await agent.calculate_gate(empty)
    assert out["quiz_unlocked"] is False
    assert out["gate_score"] == 0.0
    assert out["engagement_quality"] == "skipped"
    # blocking_resources should list everything
    assert set(out["blocking_resources"]) == set(RESOURCE_WEIGHTS.keys())


@pytest.mark.asyncio
async def test_bypass_unlocks_quiz_immediately(agent):
    out = await agent.calculate_gate({}, bypass_requested=True)
    assert out["quiz_unlocked"] is True
    assert out["bypass_mode"] is True
    assert out["gate_score"] == 1.0


def test_resource_score_notes_full(agent):
    score = agent._calculate_resource_score(
        "notes",
        {"events": [1], "max_scroll": 0.9, "completion": 0.85, "time_spent": 600},
    )
    assert score == 1.0


def test_resource_score_notes_half_credit(agent):
    score = agent._calculate_resource_score(
        "notes",
        {"events": [1], "max_scroll": 0.5, "completion": 0.5, "time_spent": 100},
    )
    assert score == 0.5


def test_resource_score_video_speed_penalty(agent):
    # 0.95 watch * 0.8 speed penalty = 0.76 → still >= 0.4 (half threshold) → 0.5
    score = agent._calculate_resource_score(
        "video",
        {"events": [1], "watch_percentage": 0.95, "playback_speed": 3.0, "completion": 0.0},
    )
    assert score in (0.5, 1.0)  # 0.76 vs 0.8 threshold — implementation detail
    # but should not be 1.0 since penalty drops below 0.8
    assert score < 1.0


def test_resource_score_code_passes_with_one_test(agent):
    score = agent._calculate_resource_score(
        "code", {"events": [1], "tests_passed": 1, "run_count": 1}
    )
    assert score == 1.0


def test_resource_score_code_zero_when_no_runs(agent):
    score = agent._calculate_resource_score(
        "code", {"events": [1], "tests_passed": 0, "run_count": 0}
    )
    assert score == 0.0


def test_engagement_signals_detect_replay_and_deep_mindmap(agent):
    signals = agent._detect_engagement_signals({
        "video": {"replay_count": 2, "playback_speed": 1.0},
        "mindmap": {"total_nodes": 10, "nodes_interacted": 10, "time_spent": 50},
        "code": {"run_count": 5},
    })
    assert signals["replayed_video_sections"] is True
    assert signals["explored_mindmap_deeply"] is True
    assert signals["debugged_code_actively"] is True
    assert signals["rushed_through"] is False


def test_engagement_signals_detect_rushed(agent):
    signals = agent._detect_engagement_signals({
        "video": {"playback_speed": 2.5, "replay_count": 0},
        "mindmap": {"total_nodes": 10, "nodes_interacted": 10, "time_spent": 5},
    })
    assert signals["rushed_through"] is True


@pytest.mark.asyncio
async def test_partial_engagement_marks_blocking_resources(agent):
    data = _full_engagement()
    # Sabotage code and video
    data["code"] = {"events": [1], "tests_passed": 0, "run_count": 0}
    data["video"] = {"events": [1], "watch_percentage": 0.1, "playback_speed": 1.0}
    out = await agent.calculate_gate(data)
    assert "code" in out["blocking_resources"]
    assert "video" in out["blocking_resources"]
    assert out["quiz_unlocked"] is False
