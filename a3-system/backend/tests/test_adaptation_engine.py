"""Tests for the DynamicAdaptationEngine.

Covers strategy selection for each event type, cooldown suppression,
executor wiring, and reset_cooldowns behaviour.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import List

import pytest

from adaptation.engine import (
    STRATEGY_ACCELERATE,
    STRATEGY_CONTINUE,
    STRATEGY_NOOP,
    STRATEGY_REMEDIATE,
    STRATEGY_REPLAN,
    STRATEGY_TUTOR_NUDGE,
    AdaptationAction,
    DynamicAdaptationEngine,
)
from adaptation.events import (
    GateCalculatedEvent,
    GoalChangedEvent,
    MilestoneStuckEvent,
    QuizCompletedEvent,
)


# ---------- helpers --------------------------------------------------------


def _quiz(score: float, **overrides) -> QuizCompletedEvent:
    base = dict(
        student_id="s1",
        milestone_id="m1",
        quiz_id="q1",
        score=score,
        time_ratio=1.0,
        consecutive_low_scores=0,
        rushed_through=False,
        weak_concepts=["recursion"],
    )
    base.update(overrides)
    return QuizCompletedEvent(**base)


# ---------- quiz-completed routing -----------------------------------------


@pytest.mark.asyncio
async def test_quiz_high_score_with_fast_completion_accelerates():
    engine = DynamicAdaptationEngine()
    res = await engine.handle_event(_quiz(score=0.92, time_ratio=1.0))
    assert res.strategy == STRATEGY_ACCELERATE
    assert any(a.kind == "unlock_next" for a in res.actions)


@pytest.mark.asyncio
async def test_quiz_passing_score_continues():
    engine = DynamicAdaptationEngine()
    res = await engine.handle_event(_quiz(score=0.72))
    assert res.strategy == STRATEGY_CONTINUE
    assert res.actions[0].kind == "unlock_next"
    assert res.actions[0].payload["mode"] == "standard"


@pytest.mark.asyncio
async def test_quiz_low_score_remediates_targeted_concepts():
    engine = DynamicAdaptationEngine()
    res = await engine.handle_event(_quiz(score=0.45))
    assert res.strategy == STRATEGY_REMEDIATE
    payload = res.actions[0].payload
    assert payload["scope"] == "targeted_concepts"
    assert payload["target_concepts"] == ["recursion"]
    assert payload["complexity_override"] == "simpler"


@pytest.mark.asyncio
async def test_quiz_rushed_with_borderline_score_triggers_remediate():
    """rushed_through + score<0.7 should remediate even though score>=0.6."""
    engine = DynamicAdaptationEngine()
    res = await engine.handle_event(_quiz(score=0.65, rushed_through=True))
    assert res.strategy == STRATEGY_REMEDIATE


@pytest.mark.asyncio
async def test_quiz_three_consecutive_low_replans_and_regenerates():
    engine = DynamicAdaptationEngine()
    res = await engine.handle_event(
        _quiz(score=0.40, consecutive_low_scores=3)
    )
    assert res.strategy == STRATEGY_REPLAN
    kinds = {a.kind for a in res.actions}
    assert "replan_path" in kinds
    assert "regenerate_resources" in kinds


# ---------- gate-calculated -----------------------------------------------


@pytest.mark.asyncio
async def test_gate_skipped_engagement_nudges_tutor():
    engine = DynamicAdaptationEngine()
    res = await engine.handle_event(
        GateCalculatedEvent(
            student_id="s1",
            milestone_id="m1",
            gate_score=0.20,
            engagement_quality="skipped",
            blocking_resources=["r1", "r2"],
        )
    )
    assert res.strategy == STRATEGY_TUTOR_NUDGE
    assert res.actions[0].payload["blocking_resources"] == ["r1", "r2"]


@pytest.mark.asyncio
async def test_gate_healthy_is_noop():
    engine = DynamicAdaptationEngine()
    res = await engine.handle_event(
        GateCalculatedEvent(
            student_id="s1",
            milestone_id="m1",
            gate_score=0.85,
            engagement_quality="deep",
        )
    )
    assert res.strategy == STRATEGY_NOOP
    assert res.actions == []


# ---------- goal-changed --------------------------------------------------


@pytest.mark.asyncio
async def test_goal_change_triggers_replan():
    engine = DynamicAdaptationEngine()
    res = await engine.handle_event(
        GoalChangedEvent(
            student_id="s1",
            new_goals=["data_science"],
            previous_goals=["web_dev"],
        )
    )
    assert res.strategy == STRATEGY_REPLAN
    assert res.actions[0].payload["new_goals"] == ["data_science"]


@pytest.mark.asyncio
async def test_goal_change_same_set_is_noop():
    engine = DynamicAdaptationEngine()
    res = await engine.handle_event(
        GoalChangedEvent(
            student_id="s1",
            new_goals=["a", "b"],
            previous_goals=["b", "a"],
        )
    )
    assert res.strategy == STRATEGY_NOOP


# ---------- milestone-stuck -----------------------------------------------


@pytest.mark.asyncio
async def test_milestone_stuck_long_replans():
    engine = DynamicAdaptationEngine()
    res = await engine.handle_event(
        MilestoneStuckEvent(
            student_id="s1",
            milestone_id="m1",
            days_in_progress=10,
            attempt_count=2,
        )
    )
    assert res.strategy == STRATEGY_REPLAN


@pytest.mark.asyncio
async def test_milestone_stuck_short_nudges_tutor():
    engine = DynamicAdaptationEngine()
    res = await engine.handle_event(
        MilestoneStuckEvent(
            student_id="s1",
            milestone_id="m1",
            days_in_progress=2,
            attempt_count=1,
        )
    )
    assert res.strategy == STRATEGY_TUTOR_NUDGE


# ---------- cooldown semantics --------------------------------------------


@pytest.mark.asyncio
async def test_cooldown_suppresses_repeat_replan():
    """Two replans back-to-back: second should be cooldown-suppressed."""
    engine = DynamicAdaptationEngine()
    e = GoalChangedEvent(
        student_id="s1", new_goals=["x"], previous_goals=["y"]
    )
    first = await engine.handle_event(e)
    second = await engine.handle_event(e)
    assert first.cooldown_active is False
    assert second.cooldown_active is True
    assert second.strategy == STRATEGY_REPLAN  # strategy reported, not executed
    assert second.cooldown_until is not None


@pytest.mark.asyncio
async def test_cooldowns_are_per_student():
    engine = DynamicAdaptationEngine()
    e1 = GoalChangedEvent(student_id="s1", new_goals=["x"], previous_goals=["y"])
    e2 = GoalChangedEvent(student_id="s2", new_goals=["x"], previous_goals=["y"])
    r1 = await engine.handle_event(e1)
    r2 = await engine.handle_event(e2)
    assert r1.cooldown_active is False
    assert r2.cooldown_active is False  # different student → independent cooldown


@pytest.mark.asyncio
async def test_cooldowns_are_per_strategy():
    """A REPLAN cooldown shouldn't block a REMEDIATE for the same student."""
    engine = DynamicAdaptationEngine()
    replan_event = GoalChangedEvent(
        student_id="s1", new_goals=["x"], previous_goals=["y"]
    )
    remediate_event = _quiz(score=0.45)
    r1 = await engine.handle_event(replan_event)
    r2 = await engine.handle_event(remediate_event)
    assert r1.cooldown_active is False
    assert r2.cooldown_active is False


@pytest.mark.asyncio
async def test_reset_cooldowns_clears_state():
    engine = DynamicAdaptationEngine()
    e = GoalChangedEvent(student_id="s1", new_goals=["x"], previous_goals=["y"])
    await engine.handle_event(e)
    engine.reset_cooldowns("s1")
    res = await engine.handle_event(e)
    assert res.cooldown_active is False


@pytest.mark.asyncio
async def test_clock_injection_simulates_time_passing():
    """Inject a clock to advance time past the cooldown without sleeping."""
    now = [datetime(2025, 1, 1, 12, 0, 0)]
    engine = DynamicAdaptationEngine(clock=lambda: now[0])
    e = GoalChangedEvent(student_id="s1", new_goals=["x"], previous_goals=["y"])

    r1 = await engine.handle_event(e)
    assert r1.cooldown_active is False

    # advance past 10-minute REPLAN cooldown
    now[0] = now[0] + timedelta(minutes=11)
    r2 = await engine.handle_event(e)
    assert r2.cooldown_active is False


# ---------- executor wiring -----------------------------------------------


@pytest.mark.asyncio
async def test_executors_invoked_when_execute_true():
    engine = DynamicAdaptationEngine()
    captured: List[AdaptationAction] = []

    async def capture(action, event, profile):
        captured.append(action)

    engine.register_executor("regenerate_resources", capture)
    res = await engine.handle_event(_quiz(score=0.30), execute=True)
    assert res.strategy == STRATEGY_REMEDIATE
    assert len(captured) == 1
    assert captured[0].kind == "regenerate_resources"


@pytest.mark.asyncio
async def test_executor_failure_is_isolated():
    """An executor that raises must not bubble out of handle_event."""
    engine = DynamicAdaptationEngine()

    async def boom(action, event, profile):
        raise RuntimeError("explode")

    engine.register_executor("regenerate_resources", boom)
    res = await engine.handle_event(_quiz(score=0.30), execute=True)
    assert res.strategy == STRATEGY_REMEDIATE  # still reported


@pytest.mark.asyncio
async def test_unregistered_action_kind_silently_skipped():
    engine = DynamicAdaptationEngine()
    # No executors registered — should not raise.
    res = await engine.handle_event(_quiz(score=0.30), execute=True)
    assert res.strategy == STRATEGY_REMEDIATE
