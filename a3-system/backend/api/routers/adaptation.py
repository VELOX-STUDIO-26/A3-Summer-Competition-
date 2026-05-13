"""API surface for the DynamicAdaptationEngine and Recommender.

Endpoints
---------
- ``POST /api/adapt/events/quiz-completed``   — ingest a quiz-outcome event
- ``POST /api/adapt/events/gate-calculated``  — ingest a gate-score event
- ``POST /api/adapt/events/goal-changed``     — ingest a goal-change event
- ``POST /api/adapt/events/milestone-stuck``  — ingest a "stuck" event
- ``POST /api/adapt/recommend``               — get top-N recommendations

These endpoints are intentionally thin wrappers around the engine + the
recommender. They exist so the frontend and background jobs can drive
adaptation via HTTP without importing Python internals.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from adaptation import (
    GateCalculatedEvent,
    GoalChangedEvent,
    MilestoneStuckEvent,
    QuizCompletedEvent,
    adaptation_engine,
    recommender,
)
from adaptation.recommender import CatalogNode, StudentSnapshot
from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class QuizCompletedRequest(BaseModel):
    student_id: str
    milestone_id: str = ""
    quiz_id: str = ""
    score: float = Field(..., ge=0.0, le=1.0)
    time_ratio: float = 1.0
    consecutive_low_scores: int = 0
    rushed_through: bool = False
    weak_concepts: List[str] = Field(default_factory=list)


class GateCalculatedRequest(BaseModel):
    student_id: str
    milestone_id: str = ""
    gate_score: float = Field(..., ge=0.0, le=1.0)
    quiz_unlocked: bool = False
    engagement_quality: str = "surface"
    blocking_resources: List[str] = Field(default_factory=list)


class GoalChangedRequest(BaseModel):
    student_id: str
    new_goals: List[str] = Field(default_factory=list)
    previous_goals: List[str] = Field(default_factory=list)


class MilestoneStuckRequest(BaseModel):
    student_id: str
    milestone_id: str = ""
    days_in_progress: int = 0
    attempt_count: int = 0


class AdaptResponse(BaseModel):
    strategy: str
    reason: str
    actions: List[Dict[str, Any]]
    cooldown_active: bool
    cooldown_until: Optional[str] = None
    event_type: str


class CatalogNodeIn(BaseModel):
    node_id: str
    title: str = ""
    topic_tags: List[str] = Field(default_factory=list)
    description: str = ""
    difficulty: float = 0.5


class StudentSnapshotIn(BaseModel):
    student_id: str
    knowledge_base: Dict[str, float] = Field(default_factory=dict)
    weak_points: List[str] = Field(default_factory=list)
    goals: List[str] = Field(default_factory=list)


class RecommendRequest(BaseModel):
    student: StudentSnapshotIn
    catalog: List[CatalogNodeIn]
    neighbours: List[StudentSnapshotIn] = Field(default_factory=list)
    top_n: int = 5
    exclude_mastered: bool = True


class RecommendationOut(BaseModel):
    node_id: str
    score: float
    content_score: float
    collab_score: float
    reason: str


class RecommendResponse(BaseModel):
    recommendations: List[RecommendationOut]


# ---------------------------------------------------------------------------
# Event endpoints
# ---------------------------------------------------------------------------


@router.post("/events/quiz-completed", response_model=AdaptResponse)
async def on_quiz_completed(req: QuizCompletedRequest) -> AdaptResponse:
    event = QuizCompletedEvent(
        student_id=req.student_id,
        milestone_id=req.milestone_id,
        quiz_id=req.quiz_id,
        score=req.score,
        time_ratio=req.time_ratio,
        consecutive_low_scores=req.consecutive_low_scores,
        rushed_through=req.rushed_through,
        weak_concepts=req.weak_concepts,
    )
    result = await adaptation_engine.handle_event(event)
    return AdaptResponse(**result.to_dict())


@router.post("/events/gate-calculated", response_model=AdaptResponse)
async def on_gate_calculated(req: GateCalculatedRequest) -> AdaptResponse:
    event = GateCalculatedEvent(
        student_id=req.student_id,
        milestone_id=req.milestone_id,
        gate_score=req.gate_score,
        quiz_unlocked=req.quiz_unlocked,
        engagement_quality=req.engagement_quality,
        blocking_resources=req.blocking_resources,
    )
    result = await adaptation_engine.handle_event(event)
    return AdaptResponse(**result.to_dict())


@router.post("/events/goal-changed", response_model=AdaptResponse)
async def on_goal_changed(req: GoalChangedRequest) -> AdaptResponse:
    event = GoalChangedEvent(
        student_id=req.student_id,
        new_goals=req.new_goals,
        previous_goals=req.previous_goals,
    )
    result = await adaptation_engine.handle_event(event)
    return AdaptResponse(**result.to_dict())


@router.post("/events/milestone-stuck", response_model=AdaptResponse)
async def on_milestone_stuck(req: MilestoneStuckRequest) -> AdaptResponse:
    event = MilestoneStuckEvent(
        student_id=req.student_id,
        milestone_id=req.milestone_id,
        days_in_progress=req.days_in_progress,
        attempt_count=req.attempt_count,
    )
    result = await adaptation_engine.handle_event(event)
    return AdaptResponse(**result.to_dict())


# ---------------------------------------------------------------------------
# Recommendation endpoint
# ---------------------------------------------------------------------------


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest) -> RecommendResponse:
    try:
        student = StudentSnapshot(
            student_id=req.student.student_id,
            knowledge_base=req.student.knowledge_base,
            weak_points=req.student.weak_points,
            goals=req.student.goals,
        )
        catalog = [
            CatalogNode(
                node_id=n.node_id,
                title=n.title,
                topic_tags=n.topic_tags,
                description=n.description,
                difficulty=n.difficulty,
            )
            for n in req.catalog
        ]
        neighbours = [
            StudentSnapshot(
                student_id=s.student_id,
                knowledge_base=s.knowledge_base,
                weak_points=s.weak_points,
                goals=s.goals,
            )
            for s in req.neighbours
        ]
        recs = recommender.recommend(
            student=student,
            catalog=catalog,
            neighbours=neighbours,
            top_n=req.top_n,
            exclude_mastered=req.exclude_mastered,
        )
        return RecommendResponse(
            recommendations=[RecommendationOut(**r.to_dict()) for r in recs]
        )
    except Exception as e:  # noqa: BLE001
        logger.error(f"Recommendation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Recommendation failed: {e}",
        )
