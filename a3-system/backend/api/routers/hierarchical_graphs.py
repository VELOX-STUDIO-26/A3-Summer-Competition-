"""
Hierarchical Knowledge Graph API Router (v2.1)

Endpoints for:
- Graph generation and retrieval
- Student progress tracking
- Subtopic management
- Resource generation queue
"""

import json
import uuid
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user
from core.logging import get_logger
from models.database import get_db
from services.hierarchical_graph_service import HierarchicalGraphService

logger = get_logger(__name__)
router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class GenerateGraphRequest(BaseModel):
    """Request to generate a hierarchical knowledge graph."""
    subject: str = Field(..., description="Subject to learn")
    goals: List[str] = Field(default=[], description="Learning goals")
    knowledge_base: Dict[str, float] = Field(default={}, description="Current knowledge")
    cognitive_style: str = Field(default="mixed", description="Learning style")
    learning_pace: float = Field(default=0.5, ge=0, le=1, description="Learning pace")


class SubtopicInfo(BaseModel):
    """Subtopic information."""
    id: str
    node_id: str
    title: str
    description: Optional[str]
    order_index: int
    difficulty: float
    estimated_minutes: int
    learning_points: List[str]
    topic_tags: List[str]
    content_types: List[str]
    prerequisites: List[str]


class MainTopicInfo(BaseModel):
    """Main topic information."""
    id: str
    node_id: str
    title: str
    description: Optional[str]
    order_index: int
    difficulty: float
    estimated_minutes: int
    subtopic_count: int
    prerequisites: List[str]
    topic_tags: List[str]
    subtopics: List[SubtopicInfo]


class GraphResponse(BaseModel):
    """Response with graph information."""
    id: str
    subject: str
    subject_normalized: str
    difficulty_level: str
    estimated_duration_weeks: int
    main_topic_count: int
    total_subtopic_count: int
    total_estimated_minutes: int
    tags: List[str]
    status: str
    verified_by_count: int
    avg_rating: float
    main_topics: List[MainTopicInfo]


class GenerateGraphResponse(BaseModel):
    """Response from graph generation."""
    graph: GraphResponse
    is_new: bool
    remaining_generations: int


class ProgressInfo(BaseModel):
    """Student progress on a subtopic."""
    subtopic_id: str
    main_topic_id: str
    status: str
    gate_score: float
    quiz_unlocked: bool
    quiz_score: Optional[float]
    quiz_passed: bool
    bypass_mode: bool
    started_at: Optional[str]
    completed_at: Optional[str]


class StudentProgressResponse(BaseModel):
    """Response with student progress."""
    graph_id: str
    student_id: str
    progress: List[ProgressInfo]
    completed_count: int
    total_count: int
    completion_percentage: float


class StartSubtopicRequest(BaseModel):
    """Request to start a subtopic."""
    subtopic_id: str


class CompleteSubtopicRequest(BaseModel):
    """Request to complete a subtopic."""
    subtopic_id: str
    quiz_score: float = Field(..., ge=0, le=1)
    bypass_mode: bool = False


class CompleteSubtopicResponse(BaseModel):
    """Response from completing a subtopic."""
    passed: bool
    quiz_score: float
    next_subtopic_id: Optional[str]
    message: str


class BypassSubtopicRequest(BaseModel):
    """Request to bypass a subtopic."""
    subtopic_id: str


class QuotaResponse(BaseModel):
    """Response with quota information."""
    can_generate: bool
    remaining: int
    is_premium: bool


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/generate", response_model=GenerateGraphResponse)
async def generate_graph(
    request: GenerateGraphRequest,
    student_id: str = Depends(get_current_user),
    is_premium: bool = Query(False, description="Premium user flag"),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a hierarchical knowledge graph for a subject.

    If an existing verified graph matches, it will be returned instead.
    Free users have 3 generations per subject.
    """
    endpoint_start = time.perf_counter()
    try:
        service = HierarchicalGraphService(db)

        # Check quota first
        can_gen, remaining = await service.can_generate(student_id, request.subject, is_premium)

        graph, is_new = await service.generate_graph(
            subject=request.subject,
            student_id=student_id,
            goals=request.goals,
            knowledge_base=request.knowledge_base,
            cognitive_style=request.cognitive_style,
            learning_pace=request.learning_pace,
            is_premium=is_premium,
        )

        # Get full structure
        structure = await service.get_graph_structure(graph.id)

        # Update remaining after generation
        if is_new:
            remaining = remaining - 1 if remaining > 0 else 0

        logger.info(f"POST /api/hierarchical/generate for '{request.subject}' completed in {time.perf_counter() - endpoint_start:.2f}s")
        return GenerateGraphResponse(
            graph=GraphResponse(**structure),
            is_new=is_new,
            remaining_generations=remaining if not is_premium else -1,
        )

    except ValueError as e:
        logger.warning(f"Graph generation validation error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Graph generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Graph generation failed: {str(e)}"
        )


@router.post("/generate/stream")
async def generate_graph_stream(
    request: GenerateGraphRequest,
    student_id: str = Depends(get_current_user),
    is_premium: bool = Query(False, description="Premium user flag"),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream graph generation via SSE.

    Returns milestones immediately after Pass 1 (~60s), then streams each
    milestone's subtopics as they finish generating in the background.

    Event types:
    - ``graph``           — initial graph with milestones (no subtopics yet)
    - ``subtopics_ready`` — one milestone's subtopics just finished
    - ``complete``        — all subtopics generated
    - ``error``           — fatal error
    """

    async def event_generator():
        try:
            service = HierarchicalGraphService(db)
            async for event in service.generate_graph_stream(
                subject=request.subject,
                student_id=student_id,
                goals=request.goals,
                knowledge_base=request.knowledge_base,
                cognitive_style=request.cognitive_style,
                learning_pace=request.learning_pace,
                is_premium=is_premium,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            logger.error(f"Graph stream failed: {e}", exc_info=True)
            yield f"data: {json.dumps({'event': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{graph_id}", response_model=GraphResponse)
async def get_graph(
    graph_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a hierarchical knowledge graph by ID."""
    try:
        service = HierarchicalGraphService(db)
        structure = await service.get_graph_structure(uuid.UUID(graph_id))
        
        if not structure:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Graph {graph_id} not found"
            )

        return GraphResponse(**structure)

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid graph ID format"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get graph: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{graph_id}/topics/{node_id}/subtopics", response_model=MainTopicInfo)
async def ensure_topic_subtopics(
    graph_id: str,
    node_id: str,
    student_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Materialize a milestone's subtopics on demand (two-pass generation).

    Used by the notebook when the student reaches a milestone whose subtopics
    haven't been generated yet. Idempotent: returns the existing milestone if
    its subtopics already exist.
    """
    try:
        service = HierarchicalGraphService(db)
        main_topic = await service.ensure_subtopics_for_topic(
            graph_id=uuid.UUID(graph_id),
            main_topic_node_id=node_id,
            student_id=student_id,
        )
        if not main_topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Main topic '{node_id}' not found in graph {graph_id}",
            )

        return MainTopicInfo(
            id=str(main_topic.id),
            node_id=main_topic.node_id,
            title=main_topic.title,
            description=main_topic.description,
            order_index=main_topic.order_index,
            difficulty=main_topic.difficulty,
            estimated_minutes=main_topic.estimated_minutes,
            subtopic_count=main_topic.subtopic_count,
            prerequisites=main_topic.prerequisites or [],
            topic_tags=main_topic.topic_tags or [],
            subtopics=[
                SubtopicInfo(
                    id=str(st.id),
                    node_id=st.node_id,
                    title=st.title,
                    description=st.description,
                    order_index=st.order_index,
                    difficulty=st.difficulty,
                    estimated_minutes=st.estimated_minutes,
                    learning_points=st.learning_points or [],
                    topic_tags=st.topic_tags or [],
                    content_types=st.content_types or [],
                    prerequisites=st.prerequisites or [],
                )
                for st in sorted(main_topic.subtopics, key=lambda x: x.order_index)
            ],
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to materialize subtopics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate subtopics: {str(e)}",
        )


@router.post("/{graph_id}/accept")
async def accept_graph(
    graph_id: str,
    student_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept a graph and initialize student progress."""
    try:
        service = HierarchicalGraphService(db)
        
        # Accept the graph
        graph = await service.accept_graph(uuid.UUID(graph_id), student_id)
        
        # Initialize progress
        progress = await service.initialize_student_progress(student_id, uuid.UUID(graph_id))

        return {
            "accepted": True,
            "graph_id": str(graph.id),
            "progress_initialized": len(progress),
            "first_subtopic_id": str(progress[0].subtopic_id) if progress else None,
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to accept graph: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{graph_id}/progress", response_model=StudentProgressResponse)
async def get_student_progress(
    graph_id: str,
    student_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get student's progress through a graph."""
    try:
        service = HierarchicalGraphService(db)
        progress = await service.get_student_progress(student_id, uuid.UUID(graph_id))

        completed = sum(1 for p in progress if p["status"] == "completed")
        total = len(progress)

        return StudentProgressResponse(
            graph_id=graph_id,
            student_id=student_id,
            progress=[ProgressInfo(**p) for p in progress],
            completed_count=completed,
            total_count=total,
            completion_percentage=completed / total if total > 0 else 0,
        )

    except Exception as e:
        logger.error(f"Failed to get progress: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/subtopic/start")
async def start_subtopic(
    request: StartSubtopicRequest,
    student_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start learning a subtopic."""
    try:
        service = HierarchicalGraphService(db)
        progress = await service.start_subtopic(student_id, uuid.UUID(request.subtopic_id))

        return {
            "started": True,
            "subtopic_id": str(progress.subtopic_id),
            "status": progress.status,
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to start subtopic: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/subtopic/complete", response_model=CompleteSubtopicResponse)
async def complete_subtopic(
    request: CompleteSubtopicRequest,
    student_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Complete a subtopic after passing the quiz."""
    try:
        service = HierarchicalGraphService(db)
        progress, next_id = await service.complete_subtopic(
            student_id=student_id,
            subtopic_id=uuid.UUID(request.subtopic_id),
            quiz_score=request.quiz_score,
            bypass_mode=request.bypass_mode,
        )

        if progress.quiz_passed:
            message = "Subtopic completed! " + (
                f"Next subtopic unlocked." if next_id else "Congratulations! You've completed the learning path!"
            )
        else:
            required = "85%" if request.bypass_mode else "60%"
            message = f"Quiz score {request.quiz_score:.0%} is below {required}. Please try again."

        return CompleteSubtopicResponse(
            passed=progress.quiz_passed,
            quiz_score=request.quiz_score,
            next_subtopic_id=str(next_id) if next_id else None,
            message=message,
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to complete subtopic: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/subtopic/bypass")
async def bypass_subtopic(
    request: BypassSubtopicRequest,
    student_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bypass a subtopic (skip resources, take quiz directly with 85% requirement)."""
    try:
        service = HierarchicalGraphService(db)
        progress = await service.bypass_subtopic(student_id, uuid.UUID(request.subtopic_id))

        return {
            "bypassed": True,
            "subtopic_id": str(progress.subtopic_id),
            "quiz_unlocked": True,
            "message": "Quiz unlocked. You need 85% to pass in bypass mode.",
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to bypass subtopic: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/quota", response_model=QuotaResponse)
async def get_quota(
    student_id: str = Depends(get_current_user),
    subject: str = Query(..., description="Subject to check quota for"),
    is_premium: bool = Query(False, description="Premium user flag"),
    db: AsyncSession = Depends(get_db),
):
    """Get generation quota for a student and subject."""
    try:
        service = HierarchicalGraphService(db)
        can_gen, remaining = await service.can_generate(student_id, subject, is_premium)

        return QuotaResponse(
            can_generate=can_gen,
            remaining=remaining,
            is_premium=is_premium,
        )

    except Exception as e:
        logger.error(f"Failed to get quota: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================================
# Resource Endpoints
# ============================================================================

class GetResourcesRequest(BaseModel):
    """Request to get resources for a subtopic."""
    subtopic_id: str
    difficulty: float = Field(default=0.5, ge=0, le=1)
    cognitive_style: str = Field(default="mixed")
    force_regenerate: bool = False


class ResourcesResponse(BaseModel):
    """Response with subtopic resources."""
    subtopic_id: str
    from_cache: bool
    resources: Dict[str, Any]


class PrefetchRequest(BaseModel):
    """Request to prefetch resources for upcoming subtopics."""
    current_subtopic_id: str
    count: int = Field(default=2, ge=1, le=5)


class PrefetchResponse(BaseModel):
    """Response from prefetch request."""
    queued_count: int
    subtopic_ids: List[str]


@router.post("/resources/get", response_model=ResourcesResponse)
async def get_resources(
    request: GetResourcesRequest,
    student_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get resources for a subtopic.

    Returns cached resources if available, otherwise generates new ones.
    """
    try:
        service = HierarchicalGraphService(db)
        resources, from_cache = await service.get_or_generate_resources(
            subtopic_id=request.subtopic_id,
            student_id=student_id,
            difficulty=request.difficulty,
            cognitive_style=request.cognitive_style,
            force_regenerate=request.force_regenerate,
        )

        return ResourcesResponse(
            subtopic_id=request.subtopic_id,
            from_cache=from_cache,
            resources=resources,
        )

    except Exception as e:
        logger.error(f"Failed to get resources: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/resources/prefetch", response_model=PrefetchResponse)
async def prefetch_resources(
    request: PrefetchRequest,
    student_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Queue resource generation for upcoming subtopics.

    This enables background pre-fetching to reduce wait times.
    """
    try:
        service = HierarchicalGraphService(db)
        queued = await service.prefetch_next_subtopics(
            student_id=student_id,
            current_subtopic_id=uuid.UUID(request.current_subtopic_id),
            count=request.count,
        )

        return PrefetchResponse(
            queued_count=len(queued),
            subtopic_ids=[q.subtopic_id for q in queued],
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to prefetch resources: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/resources/queue")
async def get_queue_status(
    student_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the status of resource generation queue for a student."""
    try:
        service = HierarchicalGraphService(db)
        pending = await service.get_pending_queue_items(limit=20)

        # Filter by student
        student_items = [
            {
                "id": str(item.id),
                "subtopic_id": item.subtopic_id,
                "priority": item.priority,
                "status": item.status,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in pending
            if item.student_id == student_id
        ]

        return {
            "queue_items": student_items,
            "total_pending": len(student_items),
        }

    except Exception as e:
        logger.error(f"Failed to get queue status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
