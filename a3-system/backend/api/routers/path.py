"""
Path Planning API Router for A3 Learning System.

Endpoints:
- POST /api/path/plan    : Generate a learning path for a student
- POST /api/path/adapt   : Adapt a path based on learning events
- GET  /api/path/{path_id}: Retrieve a learning path
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from agents.path_planner import (
    AdaptivePathPlanner,
    KnowledgeGraph,
    StudentState,
    plan_learning_path,
)
from core.logging import get_logger
from models.schemas import PathPlanRequest, PathPlanResponse, PathMetrics, PathNodeDetail

logger = get_logger(__name__)
router = APIRouter()

# Module-level cache so the JSON is read from disk only once per process
_knowledge_graph: Optional[KnowledgeGraph] = None


def get_knowledge_graph() -> KnowledgeGraph:
    global _knowledge_graph
    if _knowledge_graph is None:
        _knowledge_graph = KnowledgeGraph()
    return _knowledge_graph


@router.post("/plan", response_model=PathPlanResponse)
async def plan_path(request: PathPlanRequest):
    """Generate an adaptive learning path for a student.

    Uses A* search with profile-driven cost function to generate
    a personalized learning path through the knowledge graph.
    """
    from datetime import datetime
    from models.database import DatabaseManager, StudentProfile, db_manager

    student = None

    # Try to load profile from database, auto-create if missing
    try:
        db_manager.initialize()
        async with await db_manager.get_async_session() as session:
            profile = await session.get(StudentProfile, request.student_id)

            if not profile:
                # Auto-create a default profile for this student so future
                # personalization can build on real DB state instead of
                # in-memory defaults that disappear every request.
                logger.info(
                    f"Creating default StudentProfile row for student {request.student_id}"
                )
                profile = StudentProfile(
                    student_id=request.student_id,
                    knowledge_base={},
                    cognitive_style="mixed",
                    weak_points=[],
                    goals=[],
                    learning_pace=0.5,
                    content_preferences=["video", "text", "diagram"],
                    version=1,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                session.add(profile)
                await session.commit()
                await session.refresh(profile)

            student = StudentState(
                student_id=profile.student_id,
                knowledge_base=profile.knowledge_base or {},
                cognitive_style=profile.cognitive_style or "mixed",
                weak_points=profile.weak_points or [],
                goals=profile.goals or [],
                learning_pace=profile.learning_pace or 0.5,
                content_preferences=profile.content_preferences or []
            )
    except Exception as e:
        logger.warning(f"Database unavailable, using default profile: {e}")

    # Last-resort fallback if DB is completely unreachable
    if not student:
        logger.info(f"Using in-memory default profile for student {request.student_id}")
        student = StudentState(
            student_id=request.student_id,
            knowledge_base={},
            cognitive_style="mixed",
            weak_points=[],
            goals=[],
            learning_pace=0.5,
            content_preferences=["video", "text", "diagram"]
        )

    graph = get_knowledge_graph()
    planner = AdaptivePathPlanner(graph)

    path, metrics = planner.plan_path(
        student,
        start_nodes=request.start_nodes,
        goal_node=request.goal_node
    )

    if not path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not generate a valid learning path"
        )

    milestones = planner.create_milestones(path)

    # Convert to response format
    milestone_groups = [m["nodes"] for m in milestones]

    import hashlib
    path_hash = hashlib.sha256(
        ",".join(path).encode()
    ).hexdigest()[:16]

    path_metrics = PathMetrics(
        dependency_satisfaction=metrics.get("dependency_satisfaction", 0.0),
        profile_match=metrics.get("profile_match", 0.0),
        difficulty_smoothness=metrics.get("difficulty_smoothness", 0.0),
        weak_point_coverage=metrics.get("weak_point_coverage", 0.0),
        goal_convergence=metrics.get("goal_convergence", False)
    )

    # Build full node details from the knowledge graph so the frontend
    # doesn't need to maintain its own hardcoded title dictionary.
    path_nodes: List[PathNodeDetail] = []
    for node_id in path:
        gnode = graph.nodes.get(node_id)
        if gnode is None:
            # Unknown node id (shouldn't happen) - emit a sane default
            path_nodes.append(PathNodeDetail(
                node_id=node_id,
                title=node_id,
                difficulty=0.5,
                est_minutes=30,
                description=""
            ))
            continue
        path_nodes.append(PathNodeDetail(
            node_id=gnode.node_id,
            title=gnode.title,
            difficulty=gnode.difficulty,
            est_minutes=gnode.est_minutes,
            description=getattr(gnode, "description", "") or ""
        ))

    return PathPlanResponse(
        path=path,
        path_nodes=path_nodes,
        milestones=milestone_groups,
        total_estimated_time=metrics.get("total_estimated_minutes", 0),
        path_hash=path_hash,
        metrics=path_metrics
    )
