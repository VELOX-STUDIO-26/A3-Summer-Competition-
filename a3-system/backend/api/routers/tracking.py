"""
Resource Tracking API Router

Endpoints:
- POST /api/events/resource : Log resource engagement event
- POST /api/gate/calculate : Calculate gate score
- GET  /api/gate/status/{student_id}/{milestone_id} : Get gate status
- POST /api/gate/bypass : Bypass gate
- POST /api/evaluate/quiz : Submit quiz and evaluate
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.evaluator_agent import EvaluatorAgent
from agents.gate_agent import GateAgent
from core.logging import get_logger
from models.database import (
    GateCalculation,
    MilestoneProgress,
    QuizEvaluation,
    ResourceEvent,
    get_db,
)

logger = get_logger(__name__)
router = APIRouter()

# Global agent instances
gate_agent = GateAgent()
evaluator_agent = EvaluatorAgent()


# ============================================================================
# Request/Response Models
# ============================================================================

class ResourceEventRequest(BaseModel):
    """Request to log a resource engagement event."""
    student_id: str = Field(..., description="Student UUID")
    milestone_id: str = Field(..., description="Milestone identifier")
    resource_id: str = Field(..., description="Resource identifier")
    resource_type: str = Field(..., description="notes | mindmap | video | code | practice_quiz")
    event_type: str = Field(..., description="Event type: scroll | click | play | pause | complete | etc")
    value: float = Field(default=0.0, ge=0.0, le=1.0, description="Completion percentage 0.0-1.0")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Extra context")


class ResourceEventResponse(BaseModel):
    """Response after logging a resource event."""
    logged: bool
    event_id: str
    gate_score: float
    quiz_unlocked: bool
    blocking_resources: List[str]


class GateCalculateRequest(BaseModel):
    """Request to calculate gate score."""
    student_id: str
    milestone_id: str
    bypass_requested: bool = Field(default=False, description="Skip resource requirements")


class GateStatusResponse(BaseModel):
    """Response with gate status."""
    student_id: str
    milestone_id: str
    gate_score: float
    quiz_unlocked: bool
    bypass_mode: bool
    resource_scores: Dict[str, float]
    engagement_quality: str
    engagement_signals: Dict[str, bool]
    blocking_resources: List[str]
    recommendation: str


class GateBypassRequest(BaseModel):
    """Request to bypass gate."""
    student_id: str
    milestone_id: str


class GateBypassResponse(BaseModel):
    """Response after bypass request."""
    quiz_unlocked: bool
    bypass_mode: bool
    message: str


class QuizAnswer(BaseModel):
    """Single quiz answer."""
    question_id: str
    student_answer: str
    time_spent_seconds: int


class QuizEvaluateRequest(BaseModel):
    """Request to evaluate a quiz."""
    student_id: str
    milestone_id: str
    quiz_id: Optional[str] = None
    answers: List[QuizAnswer]
    time_taken_seconds: int
    expected_time_seconds: int


class ConceptAnalysis(BaseModel):
    """Analysis of a misunderstood concept."""
    concept: str
    concept_tag: str
    wrong_count: int
    severity: str  # critical | moderate | minor
    likely_cause: str  # never_studied | misunderstood | confused_with_similar | careless_error
    evidence: str


class ProfileUpdates(BaseModel):
    """Profile updates after quiz evaluation."""
    weak_points_add: List[str]
    weak_points_resolve: List[str]
    knowledge_base_updates: Dict[str, float]
    pace_adjustment: float
    confidence_delta: float


class FormatInstructions(BaseModel):
    """Instructions for resource regeneration format."""
    avoid_formats: List[str]
    prioritise_formats: List[str]
    complexity_level: str  # simpler | same | advanced


class RegenerationInstructions(BaseModel):
    """Instructions for regenerating resources."""
    should_regenerate: bool
    scope: str  # full_milestone | targeted_concepts | none
    target_concepts: List[str]
    format_instructions: FormatInstructions
    specific_instructions: str


class QuizInstructions(BaseModel):
    """Instructions for re-quiz."""
    allow_requiz: bool
    requiz_unlock_condition: str
    requiz_difficulty: str  # easier | same | harder
    focus_concepts: List[str]


class StudentMessage(BaseModel):
    """Message to show student."""
    tone: str  # encouraging | neutral | urgent
    message: str


class QuizDecision(BaseModel):
    """Decision from quiz evaluation."""
    outcome: str  # accelerate | continue | remediate | replan
    next_milestone_unlocked: bool
    reason: str


class QuizEvaluateResponse(BaseModel):
    """Response after quiz evaluation."""
    student_id: str
    milestone_id: str
    evaluation_id: str
    score_percentage: float
    decision: QuizDecision
    concept_analysis: List[ConceptAnalysis]
    profile_updates: ProfileUpdates
    regeneration_instructions: RegenerationInstructions
    quiz_instructions: QuizInstructions
    student_message: StudentMessage


# ============================================================================
# Helper Functions
# ============================================================================

async def aggregate_resource_engagement(
    db: AsyncSession,
    student_id: str,
    milestone_id: str
) -> Dict[str, Any]:
    """
    Aggregate all resource engagement events for a student on a milestone.
    Returns structured data for gate calculation.
    """
    # Get all events for this student-milestone
    query = select(ResourceEvent).where(
        and_(
            ResourceEvent.student_id == student_id,
            ResourceEvent.milestone_id == milestone_id
        )
    ).order_by(desc(ResourceEvent.created_at))

    result = await db.execute(query)
    events = result.scalars().all()

    # Aggregate by resource type
    resource_data = {
        "notes": {"events": [], "max_scroll": 0.0, "time_spent": 0, "completion": 0.0, "word_count": 0, "opened_at": None},
        "mindmap": {"events": [], "nodes_interacted": 0, "total_nodes": 0, "completion": 0.0, "time_spent": 0, "opened_at": None},
        "video": {"events": [], "watch_percentage": 0.0, "replay_count": 0, "playback_speed": 1.0, "completion": 0.0, "duration_seconds": 0, "time_spent": 0, "opened_at": None},
        "code": {"events": [], "run_count": 0, "tests_passed": 0, "total_tests": 0, "completion": 0.0},
        "practice_quiz": {"events": [], "questions_attempted": 0, "total_questions": 0, "completion": 0.0, "score": 0.0},
    }

    for event in events:
        rtype = event.resource_type
        if rtype not in resource_data:
            continue

        resource_data[rtype]["events"].append({
            "type": event.event_type,
            "value": event.value,
            "metadata": event.extra_data,
            "created_at": event.created_at.isoformat() if event.created_at else None
        })

        # Aggregate specific metrics
        if rtype == "notes":
            if event.event_type == "notes_opened":
                resource_data[rtype]["opened_at"] = event.created_at
                resource_data[rtype]["word_count"] = event.extra_data.get("word_count", 0)
            elif event.event_type == "notes_scroll":
                resource_data[rtype]["max_scroll"] = max(resource_data[rtype]["max_scroll"], event.value)
            elif event.event_type == "notes_closed":
                resource_data[rtype]["time_spent"] = event.extra_data.get("total_time_seconds", 0)
                resource_data[rtype]["completion"] = event.value
                # Calculate estimated read time if word_count available
                if resource_data[rtype]["word_count"] > 0:
                    resource_data[rtype]["estimated_read_time"] = resource_data[rtype]["word_count"] / 200 * 60  # 200 wpm
        elif rtype == "mindmap":
            if event.event_type == "mindmap_opened":
                resource_data[rtype]["opened_at"] = event.created_at
                resource_data[rtype]["total_nodes"] = event.extra_data.get("total_nodes", 0)
            elif event.event_type == "mindmap_closed":
                resource_data[rtype]["nodes_interacted"] = int(event.value * resource_data[rtype]["total_nodes"])
                resource_data[rtype]["completion"] = event.value
                # Calculate time spent from opened to closed
                if resource_data[rtype]["opened_at"]:
                    time_spent = (event.created_at - resource_data[rtype]["opened_at"]).total_seconds()
                    resource_data[rtype]["time_spent"] = max(0, int(time_spent))
        elif rtype == "video":
            if event.event_type == "video_opened":
                resource_data[rtype]["opened_at"] = event.created_at
                resource_data[rtype]["duration_seconds"] = event.extra_data.get("duration_seconds", 0)
            elif event.event_type == "video_completed":
                resource_data[rtype]["completion"] = 1.0
                # Calculate time spent from opened to completed
                if resource_data[rtype]["opened_at"]:
                    time_spent = (event.created_at - resource_data[rtype]["opened_at"]).total_seconds()
                    resource_data[rtype]["time_spent"] = max(0, int(time_spent))
            elif event.event_type == "video_progress":
                resource_data[rtype]["watch_percentage"] = max(resource_data[rtype]["watch_percentage"], event.value)
            elif event.event_type == "video_replayed":
                resource_data[rtype]["replay_count"] += 1
            elif event.event_type == "video_speed_changed":
                resource_data[rtype]["playback_speed"] = event.extra_data.get("new_speed", 1.0)
        elif rtype == "code":
            if event.event_type == "code_completed":
                resource_data[rtype]["completion"] = 1.0
                resource_data[rtype]["tests_passed"] = event.extra_data.get("tests_passed", 0)
                resource_data[rtype]["total_tests"] = event.extra_data.get("total_tests", 0)
            elif event.event_type == "code_run":
                resource_data[rtype]["run_count"] = event.extra_data.get("run_count", 0)
        elif rtype == "practice_quiz":
            if event.event_type == "practice_completed":
                resource_data[rtype]["completion"] = event.value
                resource_data[rtype]["questions_attempted"] = event.extra_data.get("questions_answered", 0)
                resource_data[rtype]["total_questions"] = event.extra_data.get("total_questions", 0)
                resource_data[rtype]["score"] = event.extra_data.get("score", 0.0)  # Extract score for bonus signal

    return resource_data


async def get_or_create_milestone_progress(
    db: AsyncSession,
    student_id: str,
    milestone_id: str
) -> MilestoneProgress:
    """Get existing milestone progress or create new one."""
    # Use .limit(1) + .first() to be robust against duplicate rows that may
    # have been inserted by racing concurrent event requests before we had a
    # unique constraint. We silently pick the first one.
    query = (
        select(MilestoneProgress)
        .where(
            and_(
                MilestoneProgress.student_id == student_id,
                MilestoneProgress.milestone_id == milestone_id,
            )
        )
        .order_by(MilestoneProgress.updated_at.desc() if hasattr(MilestoneProgress, "updated_at") else MilestoneProgress.id)
        .limit(1)
    )
    result = await db.execute(query)
    progress = result.scalars().first()

    if not progress:
        progress = MilestoneProgress(
            student_id=student_id,
            milestone_id=milestone_id,
            status="in_progress"
        )
        db.add(progress)
        try:
            await db.commit()
            await db.refresh(progress)
        except Exception:
            # Another concurrent request already inserted the row.
            await db.rollback()
            result = await db.execute(query)
            progress = result.scalars().first()

    return progress


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/events/resource", response_model=ResourceEventResponse)
async def log_resource_event(
    request: ResourceEventRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Log a resource engagement event.

    This endpoint is called from the frontend whenever a student interacts
    with a resource (scrolls notes, watches video, clicks mindmap nodes, etc.)
    """
    try:
        # Create event record
        event = ResourceEvent(
            student_id=request.student_id,
            milestone_id=request.milestone_id,
            resource_id=request.resource_id,
            resource_type=request.resource_type,
            event_type=request.event_type,
            value=request.value,
            extra_data=request.metadata
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)

        # Aggregate engagement data
        resource_data = await aggregate_resource_engagement(
            db, request.student_id, request.milestone_id
        )

        # Calculate gate score using agent
        gate_result = await gate_agent.calculate_gate(
            resource_data=resource_data,
            bypass_requested=False
        )

        # Save gate calculation
        gate_calc = GateCalculation(
            student_id=request.student_id,
            milestone_id=request.milestone_id,
            gate_score=gate_result["gate_score"],
            quiz_unlocked=gate_result["quiz_unlocked"],
            bypass_mode=gate_result["bypass_mode"],
            resource_scores=gate_result["resource_scores"],
            engagement_quality=gate_result["engagement_quality"],
            engagement_signals=gate_result["engagement_signals"],
            blocking_resources=gate_result["blocking_resources"],
            recommendation=gate_result["recommendation"]
        )
        db.add(gate_calc)

        # Update milestone progress
        progress = await get_or_create_milestone_progress(
            db, request.student_id, request.milestone_id
        )
        progress.gate_score = gate_result["gate_score"]
        progress.quiz_unlocked = gate_result["quiz_unlocked"]
        progress.resource_completion = gate_result["resource_scores"]

        await db.commit()

        return ResourceEventResponse(
            logged=True,
            event_id=str(event.id),
            gate_score=gate_result["gate_score"],
            quiz_unlocked=gate_result["quiz_unlocked"],
            blocking_resources=gate_result["blocking_resources"]
        )

    except Exception as e:
        logger.error(f"Failed to log resource event: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log event: {str(e)}"
        )


@router.post("/gate/calculate", response_model=GateStatusResponse)
async def calculate_gate(
    request: GateCalculateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Force recalculate gate score for a student and milestone.

    This can be used to refresh the gate status without a new event.
    """
    try:
        # Aggregate current engagement data
        resource_data = await aggregate_resource_engagement(
            db, request.student_id, request.milestone_id
        )

        # Calculate gate using agent
        gate_result = await gate_agent.calculate_gate(
            resource_data=resource_data,
            bypass_requested=request.bypass_requested
        )

        # Save calculation
        gate_calc = GateCalculation(
            student_id=request.student_id,
            milestone_id=request.milestone_id,
            gate_score=gate_result["gate_score"],
            quiz_unlocked=gate_result["quiz_unlocked"],
            bypass_mode=gate_result["bypass_mode"],
            resource_scores=gate_result["resource_scores"],
            engagement_quality=gate_result["engagement_quality"],
            engagement_signals=gate_result["engagement_signals"],
            blocking_resources=gate_result["blocking_resources"],
            recommendation=gate_result["recommendation"]
        )
        db.add(gate_calc)

        # Update milestone progress
        progress = await get_or_create_milestone_progress(
            db, request.student_id, request.milestone_id
        )
        progress.gate_score = gate_result["gate_score"]
        progress.quiz_unlocked = gate_result["quiz_unlocked"]
        if gate_result["quiz_unlocked"] and not progress.unlocked_at:
            from datetime import datetime
            progress.unlocked_at = datetime.utcnow()

        await db.commit()

        return GateStatusResponse(
            student_id=request.student_id,
            milestone_id=request.milestone_id,
            gate_score=gate_result["gate_score"],
            quiz_unlocked=gate_result["quiz_unlocked"],
            bypass_mode=gate_result["bypass_mode"],
            resource_scores=gate_result["resource_scores"],
            engagement_quality=gate_result["engagement_quality"],
            engagement_signals=gate_result["engagement_signals"],
            blocking_resources=gate_result["blocking_resources"],
            recommendation=gate_result["recommendation"]
        )

    except Exception as e:
        logger.error(f"Gate calculation failed: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gate calculation failed: {str(e)}"
        )


@router.get("/gate/status/{student_id}/{milestone_id}", response_model=GateStatusResponse)
async def get_gate_status(
    student_id: str,
    milestone_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get current gate status for a student on a specific milestone."""
    try:
        # Get most recent gate calculation
        query = select(GateCalculation).where(
            and_(
                GateCalculation.student_id == student_id,
                GateCalculation.milestone_id == milestone_id
            )
        ).order_by(desc(GateCalculation.calculated_at)).limit(1)

        result = await db.execute(query)
        gate_calc = result.scalar_one_or_none()

        if gate_calc:
            return GateStatusResponse(
                student_id=student_id,
                milestone_id=milestone_id,
                gate_score=gate_calc.gate_score,
                quiz_unlocked=gate_calc.quiz_unlocked,
                bypass_mode=gate_calc.bypass_mode,
                resource_scores=gate_calc.resource_scores,
                engagement_quality=gate_calc.engagement_quality,
                engagement_signals=gate_calc.engagement_signals or {},
                blocking_resources=gate_calc.blocking_resources or [],
                recommendation=gate_calc.recommendation or ""
            )

        # No gate calculation yet, calculate now
        resource_data = await aggregate_resource_engagement(
            db, student_id, milestone_id
        )
        gate_result = await gate_agent.calculate_gate(
            resource_data=resource_data,
            bypass_requested=False
        )

        return GateStatusResponse(
            student_id=student_id,
            milestone_id=milestone_id,
            gate_score=gate_result["gate_score"],
            quiz_unlocked=gate_result["quiz_unlocked"],
            bypass_mode=gate_result["bypass_mode"],
            resource_scores=gate_result["resource_scores"],
            engagement_quality=gate_result["engagement_quality"],
            engagement_signals=gate_result["engagement_signals"],
            blocking_resources=gate_result["blocking_resources"],
            recommendation=gate_result["recommendation"]
        )

    except Exception as e:
        logger.error(f"Failed to get gate status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get gate status: {str(e)}"
        )


@router.post("/gate/bypass", response_model=GateBypassResponse)
async def bypass_gate(
    request: GateBypassRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Bypass gate requirements ("I already know this topic").

    Quiz unlocks immediately. If student passes with 85%+,
    milestone is marked complete retroactively.
    """
    try:
        # Update gate calculation with bypass
        gate_calc = GateCalculation(
            student_id=request.student_id,
            milestone_id=request.milestone_id,
            gate_score=1.0,
            quiz_unlocked=True,
            bypass_mode=True,
            resource_scores={},
            engagement_quality="bypass",
            engagement_signals={},
            blocking_resources=[],
            recommendation="Bypass mode: Pass with 85%+ to complete this milestone."
        )
        db.add(gate_calc)

        # Update milestone progress
        progress = await get_or_create_milestone_progress(
            db, request.student_id, request.milestone_id
        )
        progress.gate_score = 1.0
        progress.quiz_unlocked = True
        progress.bypass_mode = True

        await db.commit()

        return GateBypassResponse(
            quiz_unlocked=True,
            bypass_mode=True,
            message="Quiz unlocked. Pass with 85%+ to complete this milestone without studying."
        )

    except Exception as e:
        logger.error(f"Gate bypass failed: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gate bypass failed: {str(e)}"
        )


@router.post("/evaluate/quiz", response_model=QuizEvaluateResponse)
async def evaluate_quiz(
    request: QuizEvaluateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Evaluate a quiz submission and determine next actions.

    This endpoint:
    1. Analyzes quiz answers against concepts
    2. Determines outcome (ACCELERATE, CONTINUE, REMEDIATE, REPLAN)
    3. Updates student profile with weak points
    4. Generates regeneration instructions if needed
    5. Returns student-friendly message
    """
    try:
        # Get milestone progress
        progress = await get_or_create_milestone_progress(
            db, request.student_id, request.milestone_id
        )

        # Get previous evaluations to check consecutive low scores
        prev_evals_query = select(QuizEvaluation).where(
            and_(
                QuizEvaluation.student_id == request.student_id,
                QuizEvaluation.milestone_id == request.milestone_id
            )
        ).order_by(desc(QuizEvaluation.evaluated_at)).limit(3)

        result = await db.execute(prev_evals_query)
        previous_evaluations = result.scalars().all()

        consecutive_low = sum(
            1 for e in previous_evaluations
            if e.score_percentage < 0.60
        )

        # Calculate score percentage from answers
        # Count correct answers vs total
        total_answered = len(request.answers)
        if total_answered == 0:
            score_pct = 0.0
        else:
            # Score based on correctness (would need correct answers from DB in real impl)
            # For now, approximate based on answer content quality
            correct_count = sum(
                1 for a in request.answers
                if a.student_answer and len(a.student_answer.strip()) > 0
            )
            score_pct = correct_count / total_answered

        # Get resource engagement data for context
        resource_data = await aggregate_resource_engagement(
            db, request.student_id, request.milestone_id
        )

        # Check if student rushed through resources
        # Rushed = low engagement time relative to content size
        rushed = False
        for rtype in ["notes", "video", "mindmap", "code", "practice_quiz"]:
            rdata = resource_data.get(rtype, {})
            if rtype == "notes":
                # Rushed if read time < 30% of estimated (based on scroll/completion)
                time_spent = rdata.get("time_spent", 0)
                completion = rdata.get("completion", 0)
                if completion > 0.5 and time_spent < 60:  # Less than 1 min for >50% completion
                    rushed = True
                    break
            elif rtype == "video":
                # Rushed if playback speed > 2x
                if rdata.get("playback_speed", 1.0) > 2.0:
                    rushed = True
                    break
            elif rtype == "mindmap":
                # Rushed if avg time per node < 1.5s
                nodes = rdata.get("nodes_interacted", 0)
                time_spent = rdata.get("time_spent", 0)
                if nodes > 0 and time_spent / nodes < 1.5:
                    rushed = True
                    break

        # Run evaluator agent
        evaluation = await evaluator_agent.evaluate(
            student_id=request.student_id,
            milestone_id=request.milestone_id,
            quiz_id=request.quiz_id,
            answers=[a.model_dump() for a in request.answers],
            score_percentage=score_pct,
            time_taken_seconds=request.time_taken_seconds,
            expected_time_seconds=request.expected_time_seconds,
            consecutive_low_scores=consecutive_low,
            rushed_through=rushed,
            resource_engagement=resource_data
        )

        # Save evaluation
        quiz_eval = QuizEvaluation(
            student_id=request.student_id,
            milestone_id=request.milestone_id,
            quiz_id=request.quiz_id,
            score_percentage=evaluation["score_percentage"],
            time_taken_seconds=request.time_taken_seconds,
            expected_time_seconds=request.expected_time_seconds,
            outcome=evaluation["decision"]["outcome"],
            next_milestone_unlocked=evaluation["decision"]["next_milestone_unlocked"],
            concept_analysis=evaluation["concept_analysis"],
            profile_updates=evaluation["profile_updates"],
            regeneration_instructions=evaluation["regeneration_instructions"],
            quiz_instructions=evaluation["quiz_instructions"],
            student_message=evaluation["student_message"],
            rushed_through=rushed
        )
        db.add(quiz_eval)
        await db.flush()

        # Update milestone progress
        progress.quiz_score = evaluation["score_percentage"]
        progress.quiz_outcome = evaluation["decision"]["outcome"]
        progress.attempt_count += 1

        if evaluation["decision"]["outcome"] in ["accelerate", "continue"]:
            progress.status = "completed"
            from datetime import datetime
            progress.completed_at = datetime.utcnow()
            progress.consecutive_low_scores = 0
        elif evaluation["decision"]["outcome"] == "replan":
            progress.consecutive_low_scores = consecutive_low + 1
        else:  # remediate
            progress.consecutive_low_scores = consecutive_low + 1

        await db.commit()
        await db.refresh(quiz_eval)

        return QuizEvaluateResponse(
            student_id=request.student_id,
            milestone_id=request.milestone_id,
            evaluation_id=str(quiz_eval.id),
            score_percentage=evaluation["score_percentage"],
            decision=QuizDecision(**evaluation["decision"]),
            concept_analysis=[ConceptAnalysis(**c) for c in evaluation["concept_analysis"]],
            profile_updates=ProfileUpdates(**evaluation["profile_updates"]),
            regeneration_instructions=RegenerationInstructions(
                **evaluation["regeneration_instructions"]
            ),
            quiz_instructions=QuizInstructions(**evaluation["quiz_instructions"]),
            student_message=StudentMessage(**evaluation["student_message"])
        )

    except Exception as e:
        logger.error(f"Quiz evaluation failed: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Quiz evaluation failed: {str(e)}"
        )
