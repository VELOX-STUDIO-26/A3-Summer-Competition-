
"""
Milestone API Router for A3 Learning System.

Endpoints:
- GET /api/milestone : List all milestones for a student
- GET /api/milestone/{milestone_id} : Get a specific milestone
- GET /api/milestone/{milestone_id}/nodes : Get nodes for a milestone
- POST /api/milestone/{milestone_id}/progress : Update progress
"""

from typing import Any, Dict, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import get_logger
from models.database import (
    GeneratedQuiz,
    KnowledgeNode,
    LearningPath,
    QuizAttempt,
    get_db,
)

logger = get_logger(__name__)
router = APIRouter()


class ProgressUpdate(BaseModel):
    node_id: str
    completed: bool


@router.get("")
async def list_milestones(
    student_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """List all milestones for a student from their active learning path."""
    logger.info(f"Listing real milestones for student: {student_id}")

    if not student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="student_id is required"
        )

    # Get active learning path
    path_result = await db.execute(
        select(LearningPath).where(
            LearningPath.student_id == student_id,
            LearningPath.status == "active",
        ).order_by(LearningPath.created_at.desc())
    )
    path = path_result.scalar_one_or_none()

    if not path:
        return {
            "milestones": [],
            "stats": {
                "completed": 0,
                "in_progress": 0,
                "available": 0,
                "locked": 0,
                "total_xp": 0,
            },
            "message": "No active learning path found. Generate a path first.",
        }

    # Get completed quiz attempts for this student
    attempts_result = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.student_id == student_id,
            QuizAttempt.score.is_not(None),
        )
    )
    attempts = attempts_result.scalars().all()
    completed_quiz_topics = set()
    for attempt in attempts:
        quiz_result = await db.execute(
            select(GeneratedQuiz).where(GeneratedQuiz.quiz_id == attempt.quiz_id)
        )
        quiz = quiz_result.scalar_one_or_none()
        if quiz:
            completed_quiz_topics.add(quiz.topic)

    # Build milestones from path
    milestones = []
    milestone_groups = path.milestones or []

    for idx, node_ids in enumerate(milestone_groups):
        milestone_id = f"m{idx + 1}"

        # Get node details
        nodes_result = await db.execute(
            select(KnowledgeNode).where(KnowledgeNode.node_id.in_(node_ids))
        )
        nodes = {n.node_id: n for n in nodes_result.scalars().all()}

        # Calculate progress
        total_nodes = len(node_ids)
        completed_nodes = 0
        topics = []
        est_time = 0

        for nid in node_ids:
            node = nodes.get(nid)
            if node:
                topics.append(node.title)
                est_time += node.est_minutes or 30
                # Consider node completed if there's a quiz on this topic
                if node.title in completed_quiz_topics:
                    completed_nodes += 1

        progress = round((completed_nodes / total_nodes) * 100) if total_nodes > 0 else 0

        # Determine status
        if progress == 100:
            status_str = "completed"
        elif progress > 0:
            status_str = "in_progress"
        elif idx == 0 or milestones[-1]["status"] == "completed":
            status_str = "available"
        else:
            status_str = "locked"

        milestones.append({
            "id": milestone_id,
            "title": _get_milestone_title(idx, topics),
            "description": f"Milestone {idx + 1}: covers {', '.join(topics[:5])}{'...' if len(topics) > 5 else ''}",
            "estimatedTime": est_time,
            "topics": topics[:8],
            "status": status_str,
            "progress": progress,
            "xpReward": total_nodes * 50,
            "prerequisites": [f"m{idx}"] if idx > 0 else [],
            "totalNodes": total_nodes,
            "completedNodes": completed_nodes,
            "difficulty": _calculate_difficulty(nodes, node_ids),
        })

    # Calculate stats
    completed = len([m for m in milestones if m["status"] == "completed"])
    in_progress = len([m for m in milestones if m["status"] == "in_progress"])
    available = len([m for m in milestones if m["status"] == "available"])
    locked = len([m for m in milestones if m["status"] == "locked"])
    total_xp = sum([m["xpReward"] for m in milestones if m["status"] == "completed"])

    return {
        "milestones": milestones,
        "stats": {
            "completed": completed,
            "in_progress": in_progress,
            "available": available,
            "locked": locked,
            "total_xp": total_xp,
        },
    }


@router.get("/{milestone_id}")
async def get_milestone(
    milestone_id: str,
    student_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific milestone by ID."""
    logger.info(f"Fetching milestone: {milestone_id} for student: {student_id}")

    if not student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="student_id is required"
        )

    # Get milestones list first
    milestones_data = await list_milestones(student_id, db)
    milestone = next((m for m in milestones_data["milestones"] if m["id"] == milestone_id), None)

    if not milestone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Milestone {milestone_id} not found"
        )

    return milestone


@router.get("/{milestone_id}/nodes")
async def get_milestone_nodes(
    milestone_id: str,
    student_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Get all nodes for a milestone."""
    logger.info(f"Fetching nodes for milestone: {milestone_id}")

    if not student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="student_id is required"
        )

    # Get active learning path
    path_result = await db.execute(
        select(LearningPath).where(
            LearningPath.student_id == student_id,
            LearningPath.status == "active",
        ).order_by(LearningPath.created_at.desc())
    )
    path = path_result.scalar_one_or_none()

    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active learning path found"
        )

    # Parse milestone index
    try:
        milestone_idx = int(milestone_id.replace("m", "")) - 1
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid milestone ID format"
        )

    milestone_groups = path.milestones or []
    if milestone_idx < 0 or milestone_idx >= len(milestone_groups):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Milestone {milestone_id} not found"
        )

    node_ids = milestone_groups[milestone_idx]

    # Get completed quiz topics
    attempts_result = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.student_id == student_id,
            QuizAttempt.score.is_not(None),
        )
    )
    attempts = attempts_result.scalars().all()
    completed_quiz_topics = set()
    for attempt in attempts:
        quiz_result = await db.execute(
            select(GeneratedQuiz).where(GeneratedQuiz.quiz_id == attempt.quiz_id)
        )
        quiz = quiz_result.scalar_one_or_none()
        if quiz:
            completed_quiz_topics.add(quiz.topic)

    # Get node details
    nodes_result = await db.execute(
        select(KnowledgeNode).where(KnowledgeNode.node_id.in_(node_ids))
    )
    nodes = {n.node_id: n for n in nodes_result.scalars().all()}

    node_list = []
    for nid in node_ids:
        node = nodes.get(nid)
        if node:
            is_completed = node.title in completed_quiz_topics
            node_list.append({
                "id": nid,
                "title": node.title,
                "type": node.content_types[0] if node.content_types else "reading",
                "duration": node.est_minutes or 30,
                "completed": is_completed,
                "description": node.description or f"Learn about {node.title}",
                "xp": 50,
                "locked": False,
            })

    # Calculate progress
    completed = len([n for n in node_list if n["completed"]])
    total = len(node_list)

    return {
        "milestone_id": milestone_id,
        "milestone_title": _get_milestone_title(milestone_idx, [n["title"] for n in node_list]),
        "nodes": node_list,
        "progress": round((completed / total) * 100) if total > 0 else 0,
        "completed_nodes": completed,
        "total_nodes": total,
    }


@router.post("/{milestone_id}/progress")
async def update_progress(
    milestone_id: str,
    update: ProgressUpdate,
    student_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Update progress for a milestone node."""
    logger.info(f"Updating progress for milestone: {milestone_id}, node: {update.node_id}")

    if not student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="student_id is required"
        )

    # For now, progress is tracked via quiz attempts
    # In the future, this could also track video watches, reading completion, etc.

    return {
        "success": True,
        "milestone_id": milestone_id,
        "node_id": update.node_id,
        "completed": update.completed,
        "message": "Progress updated. Note: actual completion is tracked via quiz attempts and learning events.",
        "xp_earned": 50 if update.completed else 0,
    }


@router.get("/{milestone_id}/next")
async def get_next_node(
    milestone_id: str,
    student_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Get the next available node for a student."""
    logger.info(f"Fetching next node for milestone: {milestone_id}")

    if not student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="student_id is required"
        )

    # Get milestone nodes
    milestone_data = await get_milestone_nodes(milestone_id, student_id, db)
    nodes = milestone_data.get("nodes", [])

    for node in nodes:
        if not node.get("completed") and not node.get("locked"):
            return {
                "milestone_id": milestone_id,
                "next_node": node,
            }

    return {
        "milestone_id": milestone_id,
        "next_node": None,
        "message": "All available nodes completed",
    }


# ============================================================================
# Helper Functions
# ============================================================================

def _get_milestone_title(index: int, topics: List[str]) -> str:
    """Generate a title for a milestone based on its content."""
    if not topics:
        return f"Milestone {index + 1}"

    # Use the most central/first topic as the title
    primary = topics[0]
    categories = {
        "Cloud": "Cloud Fundamentals",
        "Docker": "Container Technology",
        "Kubernetes": "Container Orchestration",
        "AWS": "Cloud Services",
        "DevOps": "DevOps Practices",
        "Microservice": "Microservices Architecture",
        "Serverless": "Serverless Computing",
        "Virtualization": "Virtualization Basics",
        "IaaS": "Infrastructure Services",
        "PaaS": "Platform Services",
        "SaaS": "Software Services",
    }

    for key, title in categories.items():
        if key.lower() in primary.lower():
            return f"{title}"

    return f"{primary} Fundamentals"


def _calculate_difficulty(nodes: Dict[str, KnowledgeNode], node_ids: List[str]) -> str:
    """Calculate overall difficulty level for a milestone."""
    if not nodes:
        return "Beginner"

    difficulties = []
    for nid in node_ids:
        node = nodes.get(nid)
        if node and node.difficulty is not None:
            difficulties.append(node.difficulty)

    if not difficulties:
        return "Beginner"

    avg_difficulty = sum(difficulties) / len(difficulties)
    if avg_difficulty < 0.33:
        return "Beginner"
    elif avg_difficulty < 0.66:
        return "Intermediate"
    return "Advanced"
