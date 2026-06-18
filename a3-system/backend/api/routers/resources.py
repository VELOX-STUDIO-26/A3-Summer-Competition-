"""
Resources API Router for Multi-Agent Resource Generation.

Endpoints:
- POST /api/resources/generate : Generate resource bundle for a topic
- GET  /api/resources/{topic}   : Get cached resources for a topic
"""

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.orchestrator import Orchestrator
from core.auth import get_current_user
from core.logging import get_logger
from models.database import GeneratedResource, get_db

logger = get_logger(__name__)
router = APIRouter()

# Lazy orchestrator initialization
_orchestrator: Optional[Orchestrator] = None


def get_orchestrator() -> Orchestrator:
    """Get or create the global orchestrator instance."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = Orchestrator()
    return _orchestrator


# ============================================================================
# Request/Response Models
# ============================================================================

class ResourceRequest(BaseModel):
    """Request to generate resources."""
    topic: str = Field(..., description="Topic to generate resources for")
    student_id: str = Field(..., description="Student ID for personalization")
    profile: Dict[str, Any] = Field(default_factory=dict, description="Student profile")
    context: str = Field(default="", description="Additional context")
    agents: Optional[List[str]] = Field(default=None, description="Specific agents to run")
    agent_kwargs: Dict[str, Any] = Field(default_factory=dict, description="Extra kwargs passed to agents (e.g. num_questions, difficulty_override)")


class ResourceResponse(BaseModel):
    """Response with generated resources."""
    topic: str
    resources: Dict[str, Any]
    metadata: Dict[str, Any]


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/generate", response_model=ResourceResponse)
async def generate_resources(request: ResourceRequest, current_user: str = Depends(get_current_user)):
    """
    Generate a personalized resource bundle for a topic.

    The orchestrator will decide which agents to run based on the student profile,
    or use the specified agents if provided.

    Returns content, quiz, and mind map resources.
    """
    try:
        logger.info(
            f"Generating resources for topic '{request.topic}' "
            f"student {request.student_id}"
        )

        result = await get_orchestrator().generate_resources(
            topic=request.topic,
            profile=request.profile,
            context=request.context,
            agent_selection=request.agents,
            agent_kwargs=request.agent_kwargs,
        )

        return ResourceResponse(
            topic=result["topic"],
            resources=result["resources"],
            metadata=result["metadata"],
        )

    except Exception as e:
        logger.error(f"Resource generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resource generation failed: {str(e)}"
        )


@router.post("/generate/stream")
async def generate_resources_stream(request: ResourceRequest, current_user: str = Depends(get_current_user)):
    """Generate resources with per-agent SSE progress updates.

    Streams events as agents start and finish so the frontend can render
    a live progress UI instead of waiting on the full bundle.

    Event types (each line is a single SSE ``data:`` payload):
    - ``plan``           — initial event listing the agents that will run
    - ``agent_started``  — emitted when an agent begins execution
    - ``agent_complete`` — emitted when an agent succeeds (carries result)
    - ``agent_failed``   — emitted when an agent raises (carries error)
    - ``complete``       — final aggregated bundle (mirrors /generate output)
    - ``error``          — fatal stream error
    """

    async def event_generator():
        try:
            logger.info(
                f"Streaming resources for topic '{request.topic}' "
                f"student {request.student_id}"
            )
            async for event in get_orchestrator().generate_resources_stream(
                topic=request.topic,
                profile=request.profile,
                context=request.context,
                agent_selection=request.agents,
                agent_kwargs=request.agent_kwargs,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:  # noqa: BLE001
            logger.error(f"Resource stream failed: {e}")
            yield f"data: {json.dumps({'event': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disable nginx buffering for SSE
        },
    )


@router.get("/remedial/{topic}")
async def get_remedial_resources(
    topic: str,
    student_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get remedial resources for a student on a specific topic.

    These are resources generated after quiz failure to target weak concepts.
    """
    logger.info(f"Fetching remedial resources for {student_id} / {topic}")

    result = await db.execute(
        select(GeneratedResource).where(
            GeneratedResource.student_id == student_id,
            GeneratedResource.topic == topic,
            GeneratedResource.is_remedial == True,
        ).order_by(GeneratedResource.created_at.desc())
    )
    resources = result.scalars().all()

    return {
        "student_id": student_id,
        "topic": topic,
        "count": len(resources),
        "resources": [
            {
                "id": r.id,
                "resource_type": r.resource_type,
                "source": r.source,
                "weak_concepts_targeted": r.weak_concepts_targeted,
                "consumed": r.consumed,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "content": r.content,
            }
            for r in resources
        ],
    }


@router.post("/{resource_id}/consumed")
async def mark_resource_consumed(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Mark a generated resource as consumed (viewed by student)."""
    logger.info(f"Marking resource {resource_id} as consumed")

    result = await db.execute(
        select(GeneratedResource).where(GeneratedResource.id == resource_id)
    )
    resource = result.scalar_one_or_none()

    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource {resource_id} not found"
        )

    resource.consumed = True
    await db.commit()

    return {
        "resource_id": resource_id,
        "consumed": True,
        "topic": resource.topic,
        "resource_type": resource.resource_type,
    }


@router.get("/{topic}")
async def get_resources(topic: str):
    """
    Get cached resources for a topic.

    TODO: Implement caching with Redis.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Resource caching not yet implemented"
    )
