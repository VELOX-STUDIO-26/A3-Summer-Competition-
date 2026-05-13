"""Dynamic Adaptation subsystem.

Contains the unified event-driven adaptation engine that replaces the
previously piecemeal adaptation triggers (gate calc, remedial regen,
quiz evaluation, manual replan) with a single dispatcher, plus a
recommendation engine (collaborative + content-based filtering).
"""

from adaptation.engine import (
    AdaptationAction,
    AdaptationResult,
    DynamicAdaptationEngine,
    adaptation_engine,
)
from adaptation.events import (
    AdaptationEvent,
    EventType,
    GateCalculatedEvent,
    GoalChangedEvent,
    MilestoneStuckEvent,
    QuizCompletedEvent,
)
from adaptation.recommender import (
    Recommendation,
    Recommender,
    recommender,
)

__all__ = [
    "AdaptationAction",
    "AdaptationEvent",
    "AdaptationResult",
    "DynamicAdaptationEngine",
    "EventType",
    "GateCalculatedEvent",
    "GoalChangedEvent",
    "MilestoneStuckEvent",
    "QuizCompletedEvent",
    "Recommendation",
    "Recommender",
    "adaptation_engine",
    "recommender",
]
