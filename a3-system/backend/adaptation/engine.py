"""Unified, event-driven ``DynamicAdaptationEngine``.

Purpose
-------
Before this module existed, adaptation was scattered across the quiz
evaluator, gate agent, path planner, and ad-hoc endpoint code. Each place
applied its own thresholds and sometimes double-fired the same action
(e.g. regenerating resources twice on a flaky request). This engine
centralises the decision into a single ``handle_event`` call.

Design
------
- **Event-driven**: callers post an :class:`~adaptation.events.AdaptationEvent`
  rather than calling strategy functions directly.
- **Strategy selection** is a pure function of the event payload + profile,
  so it's trivial to unit-test without DB, LLM, or orchestrator mocks.
- **Cooldowns** are keyed on ``(student_id, strategy_name)`` with a
  per-strategy minimum interval, so a flaky client that posts the same
  event 5 times in a second only triggers one action.
- **Executors** are pluggable callables the engine invokes once a strategy
  is selected. In production they regenerate resources, replan paths,
  and nudge the tutor; in tests they're replaced with simple stubs.
- **Stateless-ish**: the only state the engine itself keeps is the
  cooldown map. Everything else lives in events and profiles.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Awaitable, Callable, Dict, List, Optional

from adaptation.events import (
    AdaptationEvent,
    EventType,
    GateCalculatedEvent,
    GoalChangedEvent,
    MilestoneStuckEvent,
    QuizCompletedEvent,
)
from core.logging import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Strategy names (string constants so they're JSON-serialisable)
# ---------------------------------------------------------------------------

STRATEGY_ACCELERATE = "accelerate"
STRATEGY_CONTINUE = "continue"
STRATEGY_REMEDIATE = "remediate"
STRATEGY_REPLAN = "replan"
STRATEGY_TUTOR_NUDGE = "tutor_nudge"
STRATEGY_NOOP = "noop"

# Default cooldowns per strategy. Intent: avoid double-firing while still
# letting the system respond within a single user session.
DEFAULT_COOLDOWNS: Dict[str, timedelta] = {
    STRATEGY_ACCELERATE: timedelta(seconds=30),
    STRATEGY_CONTINUE: timedelta(seconds=30),
    STRATEGY_REMEDIATE: timedelta(minutes=2),
    STRATEGY_REPLAN: timedelta(minutes=10),
    STRATEGY_TUTOR_NUDGE: timedelta(minutes=5),
    STRATEGY_NOOP: timedelta(0),
}


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass
class AdaptationAction:
    """Concrete side-effect recommendation."""

    kind: str  # "regenerate_resources" | "replan_path" | "unlock_next" | "suggest_tutor" | ...
    payload: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AdaptationResult:
    """What the engine decided, for observability + API responses."""

    strategy: str
    reason: str
    actions: List[AdaptationAction] = field(default_factory=list)
    cooldown_active: bool = False
    cooldown_until: Optional[datetime] = None
    event_type: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "strategy": self.strategy,
            "reason": self.reason,
            "actions": [{"kind": a.kind, "payload": a.payload} for a in self.actions],
            "cooldown_active": self.cooldown_active,
            "cooldown_until": self.cooldown_until.isoformat() if self.cooldown_until else None,
            "event_type": self.event_type,
        }


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

ExecutorFn = Callable[[AdaptationAction, AdaptationEvent, Dict[str, Any]], Awaitable[None]]


class DynamicAdaptationEngine:
    """Central dispatcher for learning-system adaptations."""

    def __init__(
        self,
        cooldowns: Optional[Dict[str, timedelta]] = None,
        clock: Callable[[], datetime] = datetime.utcnow,
    ):
        self._cooldowns = dict(DEFAULT_COOLDOWNS)
        if cooldowns:
            self._cooldowns.update(cooldowns)
        # (student_id, strategy) -> next-allowed timestamp
        self._next_allowed: Dict[tuple, datetime] = {}
        self._clock = clock
        self._executors: Dict[str, ExecutorFn] = {}

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def register_executor(self, action_kind: str, fn: ExecutorFn) -> None:
        """Register a coroutine that performs ``action_kind`` side-effects."""
        self._executors[action_kind] = fn

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def handle_event(
        self,
        event: AdaptationEvent,
        profile: Optional[Dict[str, Any]] = None,
        execute: bool = False,
    ) -> AdaptationResult:
        """Pick a strategy for ``event`` and optionally execute its actions.

        Args:
            event:   The learning signal.
            profile: Optional student profile for strategy enrichment.
            execute: If ``True``, invoke the registered executor for every
                     produced :class:`AdaptationAction`. If no executor is
                     registered for an action kind, it is silently skipped
                     and surfaced only in the returned result.
        """
        result = self._select_strategy(event, profile or {})

        # Cooldown check (NOOPs always pass through)
        if result.strategy != STRATEGY_NOOP:
            key = (event.student_id, result.strategy)
            now = self._clock()
            allowed_at = self._next_allowed.get(key)
            if allowed_at and now < allowed_at:
                result.cooldown_active = True
                result.cooldown_until = allowed_at
                logger.info(
                    f"Adaptation {result.strategy} suppressed for {event.student_id}: "
                    f"cooldown until {allowed_at.isoformat()}"
                )
                return result
            cooldown = self._cooldowns.get(result.strategy, timedelta(0))
            self._next_allowed[key] = now + cooldown
            result.cooldown_until = self._next_allowed[key]

        if execute and result.actions:
            for action in result.actions:
                fn = self._executors.get(action.kind)
                if fn is None:
                    continue
                try:
                    await fn(action, event, profile or {})
                except Exception as e:  # noqa: BLE001
                    logger.error(
                        f"Executor for {action.kind} failed: {e}",
                        exc_info=True,
                    )

        return result

    def reset_cooldowns(self, student_id: Optional[str] = None) -> None:
        """Clear cooldowns for one student or for everyone (useful in tests)."""
        if student_id is None:
            self._next_allowed.clear()
            return
        for key in list(self._next_allowed.keys()):
            if key[0] == student_id:
                del self._next_allowed[key]

    # ------------------------------------------------------------------
    # Strategy selection (pure)
    # ------------------------------------------------------------------

    def _select_strategy(
        self,
        event: AdaptationEvent,
        profile: Dict[str, Any],
    ) -> AdaptationResult:
        event_type = event.event_type
        if event_type == EventType.QUIZ_COMPLETED:
            return self._on_quiz_completed(event, profile)  # type: ignore[arg-type]
        if event_type == EventType.GATE_CALCULATED:
            return self._on_gate_calculated(event, profile)  # type: ignore[arg-type]
        if event_type == EventType.GOAL_CHANGED:
            return self._on_goal_changed(event, profile)  # type: ignore[arg-type]
        if event_type == EventType.MILESTONE_STUCK:
            return self._on_milestone_stuck(event, profile)  # type: ignore[arg-type]
        return AdaptationResult(
            strategy=STRATEGY_NOOP,
            reason=f"Unhandled event type: {event_type}",
            event_type=str(event_type),
        )

    # ---- per-event handlers ----

    def _on_quiz_completed(
        self, event: QuizCompletedEvent, profile: Dict[str, Any]
    ) -> AdaptationResult:
        """Map the same thresholds the EvaluatorAgent uses into adaptations.

        Priority (higher rules win):
          1. 3+ consecutive low scores            -> REPLAN
          2. rushed_through and score < 70%       -> REMEDIATE
          3. score < 60%                          -> REMEDIATE
          4. score >= 85% and finished fast       -> ACCELERATE
          5. score >= 60%                         -> CONTINUE
        """
        score = event.score
        event_type_s = EventType.QUIZ_COMPLETED.value

        if event.consecutive_low_scores >= 3:
            return AdaptationResult(
                strategy=STRATEGY_REPLAN,
                reason="3+ consecutive low scores — foundation rebuild needed",
                actions=[
                    AdaptationAction(
                        kind="replan_path",
                        payload={
                            "student_id": event.student_id,
                            "reason": "consecutive_failures",
                            "milestone_id": event.milestone_id,
                        },
                    ),
                    AdaptationAction(
                        kind="regenerate_resources",
                        payload={
                            "student_id": event.student_id,
                            "milestone_id": event.milestone_id,
                            "scope": "full_milestone",
                            "target_concepts": event.weak_concepts,
                            "complexity_override": "simpler",
                        },
                    ),
                ],
                event_type=event_type_s,
            )

        if event.rushed_through and score < 0.70:
            return AdaptationResult(
                strategy=STRATEGY_REMEDIATE,
                reason="Rushed through resources — targeted review before continuing",
                actions=[self._remediate_action(event)],
                event_type=event_type_s,
            )

        if score < 0.60:
            return AdaptationResult(
                strategy=STRATEGY_REMEDIATE,
                reason=f"Score {int(score * 100)}% below threshold — targeted review",
                actions=[self._remediate_action(event)],
                event_type=event_type_s,
            )

        if score >= 0.85 and event.time_ratio < 1.2:
            return AdaptationResult(
                strategy=STRATEGY_ACCELERATE,
                reason=f"Score {int(score * 100)}% with fast completion — unlock advanced",
                actions=[
                    AdaptationAction(
                        kind="unlock_next",
                        payload={
                            "student_id": event.student_id,
                            "milestone_id": event.milestone_id,
                            "mode": "accelerated",
                        },
                    ),
                ],
                event_type=event_type_s,
            )

        return AdaptationResult(
            strategy=STRATEGY_CONTINUE,
            reason=f"Score {int(score * 100)}% meets proficiency threshold",
            actions=[
                AdaptationAction(
                    kind="unlock_next",
                    payload={
                        "student_id": event.student_id,
                        "milestone_id": event.milestone_id,
                        "mode": "standard",
                    },
                ),
            ],
            event_type=event_type_s,
        )

    def _on_gate_calculated(
        self, event: GateCalculatedEvent, profile: Dict[str, Any]
    ) -> AdaptationResult:
        """If a student's gate shows 'skipped' engagement, nudge to tutor."""
        event_type_s = EventType.GATE_CALCULATED.value
        if event.engagement_quality == "skipped" or event.gate_score < 0.30:
            return AdaptationResult(
                strategy=STRATEGY_TUTOR_NUDGE,
                reason="Low resource engagement — offer 1-on-1 tutor chat",
                actions=[
                    AdaptationAction(
                        kind="suggest_tutor",
                        payload={
                            "student_id": event.student_id,
                            "milestone_id": event.milestone_id,
                            "blocking_resources": event.blocking_resources,
                        },
                    ),
                ],
                event_type=event_type_s,
            )
        return AdaptationResult(
            strategy=STRATEGY_NOOP,
            reason="Gate engagement healthy — no intervention needed",
            event_type=event_type_s,
        )

    def _on_goal_changed(
        self, event: GoalChangedEvent, profile: Dict[str, Any]
    ) -> AdaptationResult:
        """A goal change almost always invalidates the current path."""
        if set(event.new_goals) == set(event.previous_goals):
            return AdaptationResult(
                strategy=STRATEGY_NOOP,
                reason="Goal set unchanged — no replan needed",
                event_type=EventType.GOAL_CHANGED.value,
            )
        return AdaptationResult(
            strategy=STRATEGY_REPLAN,
            reason="Goals changed — path must be replanned",
            actions=[
                AdaptationAction(
                    kind="replan_path",
                    payload={
                        "student_id": event.student_id,
                        "reason": "goal_change",
                        "new_goals": event.new_goals,
                    },
                ),
            ],
            event_type=EventType.GOAL_CHANGED.value,
        )

    def _on_milestone_stuck(
        self, event: MilestoneStuckEvent, profile: Dict[str, Any]
    ) -> AdaptationResult:
        """Stalled > 7 days OR 5+ failed attempts -> replan."""
        if event.days_in_progress >= 7 or event.attempt_count >= 5:
            return AdaptationResult(
                strategy=STRATEGY_REPLAN,
                reason=(
                    f"Milestone stuck: {event.days_in_progress}d in progress, "
                    f"{event.attempt_count} attempts"
                ),
                actions=[
                    AdaptationAction(
                        kind="replan_path",
                        payload={
                            "student_id": event.student_id,
                            "reason": "milestone_stuck",
                            "milestone_id": event.milestone_id,
                        },
                    ),
                ],
                event_type=EventType.MILESTONE_STUCK.value,
            )
        return AdaptationResult(
            strategy=STRATEGY_TUTOR_NUDGE,
            reason="Milestone taking longer than expected — nudge tutor",
            actions=[
                AdaptationAction(
                    kind="suggest_tutor",
                    payload={
                        "student_id": event.student_id,
                        "milestone_id": event.milestone_id,
                    },
                ),
            ],
            event_type=EventType.MILESTONE_STUCK.value,
        )

    # ---- shared helpers ----

    @staticmethod
    def _remediate_action(event: QuizCompletedEvent) -> AdaptationAction:
        return AdaptationAction(
            kind="regenerate_resources",
            payload={
                "student_id": event.student_id,
                "milestone_id": event.milestone_id,
                "scope": "targeted_concepts",
                "target_concepts": event.weak_concepts,
                "complexity_override": "simpler",
            },
        )


# Module-level singleton for easy import
adaptation_engine = DynamicAdaptationEngine()
