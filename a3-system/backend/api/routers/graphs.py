"""
API Router for Dynamic Knowledge Graphs.

Endpoints for:
- Searching existing graphs
- Generating new graphs
- Previewing and accepting paths
- Rating graphs
- Quota management
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from agents.knowledge_graph_generator import (
    KnowledgeGraphGenerator,
    KnowledgeGraphValidator,
    normalize_subject,
)
from core.logging import get_logger
from models.database import get_db
from services.graph_service import GraphService, get_graph_service

logger = get_logger(__name__)

router = APIRouter(prefix="/api/graphs", tags=["Knowledge Graphs"])


# ============================================================================
# Request/Response Models
# ============================================================================

class SearchGraphsRequest(BaseModel):
    """Request to search for existing graphs."""
    subject: str = Field(..., description="Subject to search for")
    goals: List[str] = Field(default=[], description="Learning goals")
    min_status: str = Field(default="user_verified", description="Minimum status level")
    limit: int = Field(default=10, ge=1, le=50, description="Max results")


class SearchGraphsResponse(BaseModel):
    """Response with matching graphs."""
    graphs: List[Dict[str, Any]]
    total: int


class GenerateGraphRequest(BaseModel):
    """Request to generate a new knowledge graph."""
    subject: str = Field(..., description="Subject to generate graph for")
    goals: List[str] = Field(default=[], description="Learning goals")
    knowledge_base: Dict[str, float] = Field(default={}, description="Current knowledge")
    cognitive_style: str = Field(default="mixed", description="Learning style")
    learning_pace: float = Field(default=0.5, ge=0.0, le=1.0, description="Learning pace")


class GenerateGraphResponse(BaseModel):
    """Response with generated graph."""
    graph_id: str
    subject: str
    is_valid: bool
    validation_errors: List[str]
    node_count: int
    estimated_weeks: int
    preview_id: Optional[str] = None
    remaining_generations: int


class PreviewPathRequest(BaseModel):
    """Request to preview a learning path."""
    graph_id: str = Field(..., description="Graph to use for path")
    student_id: str = Field(..., description="Student ID")


class PreviewPathResponse(BaseModel):
    """Response with path preview."""
    preview_id: str
    path_sequence: List[str]
    path_details: Dict[str, Any]
    social_proof: Dict[str, Any]
    expires_at: str


class AcceptPathRequest(BaseModel):
    """Request to accept a path preview."""
    preview_id: str = Field(..., description="Preview to accept")
    student_id: str = Field(..., description="Student accepting")


class AcceptPathResponse(BaseModel):
    """Response after accepting path."""
    success: bool
    graph_id: str
    path_sequence: List[str]
    message: str


class EditPathRequest(BaseModel):
    """Request to edit a path preview."""
    preview_id: str = Field(..., description="Preview to edit")
    action: str = Field(..., description="Edit action: skip, remove, reorder, add")
    node_id: str = Field(..., description="Node to edit")
    new_position: Optional[int] = Field(None, description="New position for reorder")


class EditPathResponse(BaseModel):
    """Response after editing path."""
    success: bool
    path_sequence: List[str]
    edits_applied: int


class RegenerateRequest(BaseModel):
    """Request to regenerate a graph."""
    subject: str = Field(..., description="Subject to regenerate")
    student_id: str = Field(..., description="Student ID")
    feedback: Optional[str] = Field(None, description="Feedback for regeneration")
    goals: List[str] = Field(default=[], description="Learning goals")


class RateGraphRequest(BaseModel):
    """Request to rate a graph."""
    graph_id: str = Field(..., description="Graph to rate")
    student_id: str = Field(..., description="Student rating")
    rating: int = Field(..., ge=1, le=5, description="Rating 1-5")
    feedback: Optional[str] = Field(None, description="Optional feedback")


class RateGraphResponse(BaseModel):
    """Response after rating."""
    success: bool
    new_avg_rating: float


class QuotaResponse(BaseModel):
    """Response with quota information."""
    can_generate: bool
    remaining: int
    is_premium: bool
    subject: str


class GraphDetailResponse(BaseModel):
    """Detailed graph information."""
    id: str
    subject: str
    difficulty_level: str
    estimated_weeks: int
    node_count: int
    status: str
    social_proof: Dict[str, Any]
    nodes: List[Dict[str, Any]]
    tags: List[str]


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/search", response_model=SearchGraphsResponse)
async def search_graphs(
    request: SearchGraphsRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Search for existing knowledge graphs by subject and goals.
    
    Returns matching graphs sorted by similarity score.
    """
    service = get_graph_service(db)
    
    results = await service.search_graphs(
        subject=request.subject,
        goals=request.goals,
        min_status=request.min_status,
        limit=request.limit
    )
    
    # Remove graph object from results (not serializable)
    graphs = [{k: v for k, v in r.items() if k != "graph"} for r in results]
    
    return SearchGraphsResponse(
        graphs=graphs,
        total=len(graphs)
    )


@router.post("/generate", response_model=GenerateGraphResponse)
async def generate_graph(
    request: GenerateGraphRequest,
    student_id: str = Query(..., description="Student ID"),
    is_premium: bool = Query(False, description="Premium status"),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a new knowledge graph for a subject.
    
    Checks quota before generating. Creates a preview for user approval.
    """
    service = get_graph_service(db)
    
    # Check quota
    can_gen, remaining = await service.can_generate(
        student_id=student_id,
        subject=request.subject,
        is_premium=is_premium
    )
    
    if not can_gen:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "quota_exhausted",
                "message": f"You have used all {3} free generations for this subject. Upgrade to premium for unlimited generations.",
                "remaining": 0
            }
        )
    
    # Check for existing match first
    existing = await service.find_best_match(
        subject=request.subject,
        goals=request.goals,
        knowledge_base=request.knowledge_base
    )
    
    if existing:
        # Use existing graph instead of generating
        logger.info(f"Found existing graph {existing.id} for {request.subject}")
        
        # Create preview
        preview = await service.create_preview(
            student_id=student_id,
            graph_id=str(existing.id),
            path_sequence=[n["node_id"] for n in existing.nodes] if existing.nodes else [],
            path_details={"source": "existing", "similarity": 0.9}
        )
        
        return GenerateGraphResponse(
            graph_id=str(existing.id),
            subject=existing.subject,
            is_valid=True,
            validation_errors=[],
            node_count=len(existing.nodes) if existing.nodes else 0,
            estimated_weeks=existing.estimated_duration_weeks or 8,
            preview_id=str(preview.id),
            remaining_generations=remaining if remaining >= 0 else -1
        )
    
    # Generate new graph
    generator = KnowledgeGraphGenerator()
    generated = await generator.generate(
        subject=request.subject,
        goals=request.goals,
        knowledge_base=request.knowledge_base,
        cognitive_style=request.cognitive_style,
        learning_pace=request.learning_pace
    )
    
    if not generated.is_valid:
        # Try validation and regeneration
        validator = KnowledgeGraphValidator()
        validation = await validator.validate(generated, use_llm=True)
        
        if not validation.is_valid:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "generation_failed",
                    "message": "Failed to generate a valid knowledge graph",
                    "validation_errors": generated.validation_errors,
                    "suggestions": [s.get("details", "") for s in validation.suggestions]
                }
            )
    
    # Consume quota
    await service.consume_generation(student_id, request.subject)
    
    # Save graph
    graph = await service.create_graph(generated, created_by=student_id)
    
    # Create preview
    preview = await service.create_preview(
        student_id=student_id,
        graph_id=str(graph.id),
        path_sequence=[n.node_id for n in generated.nodes],
        path_details={
            "source": "generated",
            "total_time": sum(n.estimated_minutes for n in generated.nodes),
            "difficulty_level": generated.difficulty_level
        }
    )
    
    # Update remaining after consumption
    _, new_remaining = await service.can_generate(student_id, request.subject, is_premium)
    
    logger.info(f"Generated graph {graph.id} for {request.subject}, {len(generated.nodes)} nodes")
    
    return GenerateGraphResponse(
        graph_id=str(graph.id),
        subject=generated.subject,
        is_valid=generated.is_valid,
        validation_errors=generated.validation_errors,
        node_count=len(generated.nodes),
        estimated_weeks=generated.estimated_weeks,
        preview_id=str(preview.id),
        remaining_generations=new_remaining if new_remaining >= 0 else -1
    )


@router.get("/{graph_id}", response_model=GraphDetailResponse)
async def get_graph(
    graph_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a knowledge graph."""
    service = get_graph_service(db)
    
    graph = await service.get_graph(graph_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found")
    
    social_proof = await service.get_social_proof(graph_id)
    
    return GraphDetailResponse(
        id=str(graph.id),
        subject=graph.subject,
        difficulty_level=graph.difficulty_level or "intermediate",
        estimated_weeks=graph.estimated_duration_weeks or 8,
        node_count=len(graph.nodes) if graph.nodes else 0,
        status=graph.status or "draft",
        social_proof=social_proof,
        nodes=graph.nodes or [],
        tags=graph.tags or []
    )


@router.post("/preview", response_model=PreviewPathResponse)
async def preview_path(
    request: PreviewPathRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a path preview for user approval.
    
    Returns the path sequence and social proof for the graph.
    """
    service = get_graph_service(db)
    
    graph = await service.get_graph(request.graph_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found")
    
    # Create preview
    path_sequence = [n["node_id"] for n in graph.nodes] if graph.nodes else []
    
    preview = await service.create_preview(
        student_id=request.student_id,
        graph_id=request.graph_id,
        path_sequence=path_sequence,
        path_details={
            "total_time": sum(n.get("estimated_minutes", 30) for n in (graph.nodes or [])),
            "node_count": len(path_sequence)
        }
    )
    
    social_proof = await service.get_social_proof(request.graph_id)
    
    return PreviewPathResponse(
        preview_id=str(preview.id),
        path_sequence=path_sequence,
        path_details=preview.path_details or {},
        social_proof=social_proof,
        expires_at=preview.expires_at.isoformat()
    )


@router.post("/accept", response_model=AcceptPathResponse)
async def accept_path(
    request: AcceptPathRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Accept a path preview and start learning.
    
    Marks the graph as verified by the user.
    """
    service = get_graph_service(db)
    
    try:
        preview = await service.accept_preview(
            preview_id=request.preview_id,
            student_id=request.student_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return AcceptPathResponse(
        success=True,
        graph_id=str(preview.graph_id),
        path_sequence=preview.path_sequence or [],
        message="Path accepted! You can now start learning."
    )


@router.post("/edit", response_model=EditPathResponse)
async def edit_path(
    request: EditPathRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Apply an edit to a path preview.
    
    Supported actions: skip, remove, reorder
    """
    service = get_graph_service(db)
    
    try:
        preview = await service.apply_edit(
            preview_id=request.preview_id,
            edit={
                "action": request.action,
                "node_id": request.node_id,
                "new_position": request.new_position
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return EditPathResponse(
        success=True,
        path_sequence=preview.path_sequence or [],
        edits_applied=len(preview.user_edits or [])
    )


@router.post("/regenerate", response_model=GenerateGraphResponse)
async def regenerate_graph(
    request: RegenerateRequest,
    is_premium: bool = Query(False, description="Premium status"),
    db: AsyncSession = Depends(get_db)
):
    """
    Regenerate a knowledge graph (uses quota).
    
    Called when user clicks "Regenerate" on preview.
    """
    service = get_graph_service(db)
    
    # Check quota
    can_gen, remaining = await service.can_generate(
        student_id=request.student_id,
        subject=request.subject,
        is_premium=is_premium
    )
    
    if not can_gen:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "quota_exhausted",
                "message": "You have used all free generations. Upgrade to premium for unlimited.",
                "remaining": 0
            }
        )
    
    # Generate new graph
    generator = KnowledgeGraphGenerator()
    generated = await generator.generate(
        subject=request.subject,
        goals=request.goals
    )
    
    # Consume quota
    await service.consume_generation(request.student_id, request.subject)
    
    # Save graph
    graph = await service.create_graph(generated, created_by=request.student_id)
    
    # Create preview
    preview = await service.create_preview(
        student_id=request.student_id,
        graph_id=str(graph.id),
        path_sequence=[n.node_id for n in generated.nodes],
        path_details={"source": "regenerated"}
    )
    
    _, new_remaining = await service.can_generate(request.student_id, request.subject, is_premium)
    
    return GenerateGraphResponse(
        graph_id=str(graph.id),
        subject=generated.subject,
        is_valid=generated.is_valid,
        validation_errors=generated.validation_errors,
        node_count=len(generated.nodes),
        estimated_weeks=generated.estimated_weeks,
        preview_id=str(preview.id),
        remaining_generations=new_remaining if new_remaining >= 0 else -1
    )


@router.post("/rate", response_model=RateGraphResponse)
async def rate_graph(
    request: RateGraphRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Rate a knowledge graph after completion.
    """
    service = get_graph_service(db)
    
    try:
        await service.rate_graph(
            graph_id=request.graph_id,
            student_id=request.student_id,
            rating=request.rating,
            feedback=request.feedback
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Get updated average
    graph = await service.get_graph(request.graph_id)
    
    return RateGraphResponse(
        success=True,
        new_avg_rating=round(graph.avg_rating or 0, 1)
    )


@router.get("/quota/{student_id}", response_model=QuotaResponse)
async def get_quota(
    student_id: str,
    subject: str = Query(..., description="Subject to check quota for"),
    is_premium: bool = Query(False, description="Premium status"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get generation quota for a student/subject.
    """
    service = get_graph_service(db)
    
    can_gen, remaining = await service.can_generate(
        student_id=student_id,
        subject=subject,
        is_premium=is_premium
    )
    
    return QuotaResponse(
        can_generate=can_gen,
        remaining=remaining if remaining >= 0 else -1,
        is_premium=is_premium,
        subject=subject
    )


@router.get("/{graph_id}/social-proof")
async def get_social_proof(
    graph_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get social proof data for a graph.
    """
    service = get_graph_service(db)
    
    proof = await service.get_social_proof(graph_id)
    if not proof:
        raise HTTPException(status_code=404, detail="Graph not found")
    
    return proof
