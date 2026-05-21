"""Event types consumed by the DynamicAdaptationEngine.

Each event captures a learning signal that might warrant an adaptation
(content regeneration, path replan, tutor intervention, acceleration).
Events are plain dataclasses so they can be constructed from anywhere —
API handlers, background jobs, tests — without DB coupling.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional


class EventType(str, Enum):
    QUIZ_COMPLETED = "quiz_completed"
    GATE_CALCULATED = "gate_calculated"
    GOAL_CHANGED = "goal_changed"
    MILESTONE_STUCK = "milestone_stuck"


@dataclass
class AdaptationEvent:
    """Base class for adaptation events.

    All events carry a ``student_id``, a ``timestamp``, and a free-form
    ``metadata`` dict. Subclasses add domain-specific fields.
    """

    student_id: str = ""
    # Placeholder value — subclasses override in ``__post_init__``. Having
    # a default means subclasses can add required fields of their own.
    event_type: EventType = EventType.QUIZ_COMPLETED
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class QuizCompletedEvent(AdaptationEvent):
    """Emitted after a milestone quiz is graded."""

    milestone_id: str = ""
    quiz_id: str = ""
    score: float = 0.0          # 0.0 – 1.0
    time_ratio: float = 1.0      # time_taken / expected_time
    consecutive_low_scores: int = 0
    rushed_through: bool = False
    weak_concepts: List[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.event_type = EventType.QUIZ_COMPLETED


@dataclass
class GateCalculatedEvent(AdaptationEvent):
    """Emitted whenever the gate agent recomputes a milestone gate."""

    milestone_id: str = ""
    gate_score: float = 0.0
    quiz_unlocked: bool = False
    engagement_quality: str = "surface"  # deep | surface | skipped | bypass
    blocking_resources: List[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.event_type = EventType.GATE_CALCULATED


@dataclass
class GoalChangedEvent(AdaptationEvent):
    """Emitted when the student updates their declared goals."""

    new_goals: List[str] = field(default_factory=list)
    previous_goals: List[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.event_type = EventType.GOAL_CHANGED


@dataclass
class MilestoneStuckEvent(AdaptationEvent):
    """Emitted by scheduled job when a milestone has been in-progress too long."""

    milestone_id: str = ""
    days_in_progress: int = 0
    attempt_count: int = 0

    def __post_init__(self) -> None:
        self.event_type = EventType.MILESTONE_STUCK
