"""
Graph Service

Handles knowledge graph storage, retrieval, search, and matching.
Includes quota management and social proof tracking.
"""

import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from agents.knowledge_graph_generator import (
    GeneratedGraph,
    KnowledgeGraphGenerator,
    KnowledgeGraphValidator,
    KnowledgeNode,
    normalize_subject,
)
from core.logging import get_logger
from models.database import (
    DynamicKnowledgeGraph,
    GenerationQuota,
    GraphRating,
    PathPreview,
    StudentProfile,
)

logger = get_logger(__name__)


# ============================================================================
# Constants
# ============================================================================

MAX_FREE_GENERATIONS = 3
PREVIEW_EXPIRY_HOURS = 24
MIN_SIMILARITY_THRESHOLD = 0.6
POPULAR_THRESHOLD_USES = 10
POPULAR_THRESHOLD_ACCEPTANCE = 0.7


# ============================================================================
# Graph Service
# ============================================================================

class GraphService:
    """Service for managing dynamic knowledge graphs."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.generator = KnowledgeGraphGenerator()
        self.validator = KnowledgeGraphValidator()
    
    # ========================================================================
    # Graph Search & Matching
    # ========================================================================
    
    async def search_graphs(
        self,
        subject: str,
        goals: List[str] = None,
        min_status: str = "user_verified",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for existing knowledge graphs by subject and goals.
        
        Args:
            subject: Subject to search for
            goals: Optional list of learning goals
            min_status: Minimum status level (draft, user_verified, popular, curated)
            limit: Maximum number of results
        
        Returns:
            List of matching graphs with similarity scores
        """
        subject_normalized = normalize_subject(subject)
        
        # Status hierarchy for filtering
        status_order = ["draft", "user_verified", "popular", "curated"]
        min_status_idx = status_order.index(min_status) if min_status in status_order else 1
        valid_statuses = status_order[min_status_idx:]
        
        # Query graphs
        query = select(DynamicKnowledgeGraph).where(
            and_(
                DynamicKnowledgeGraph.status.in_(valid_statuses),
                or_(
                    DynamicKnowledgeGraph.subject_normalized == subject_normalized,
                    DynamicKnowledgeGraph.subject_normalized.ilike(f"%{subject_normalized}%"),
                    DynamicKnowledgeGraph.tags.contains([subject.lower()])
                )
            )
        ).order_by(
            desc(DynamicKnowledgeGraph.times_used),
            desc(DynamicKnowledgeGraph.acceptance_rate)
        ).limit(limit)
        
        result = await self.db.execute(query)
        graphs = result.scalars().all()
        
        # Calculate similarity scores
        scored_graphs = []
        for graph in graphs:
            similarity = self._calculate_similarity(
                graph=graph,
                search_subject=subject,
                search_goals=goals or []
            )
            scored_graphs.append({
                "graph": graph,
                "similarity": similarity,
                "id": str(graph.id),
                "subject": graph.subject,
                "status": graph.status,
                "times_used": graph.times_used,
                "acceptance_rate": graph.acceptance_rate,
                "avg_rating": graph.avg_rating,
                "verified_by_count": graph.verified_by_count,
                "node_count": len(graph.nodes) if graph.nodes else 0
            })
        
        # Sort by similarity
        scored_graphs.sort(key=lambda x: x["similarity"], reverse=True)
        
        return scored_graphs
    
    async def find_best_match(
        self,
        subject: str,
        goals: List[str] = None,
        knowledge_base: Dict[str, float] = None,
        min_similarity: float = MIN_SIMILARITY_THRESHOLD
    ) -> Optional[DynamicKnowledgeGraph]:
        """
        Find the best matching existing graph.
        
        Args:
            subject: Subject to find
            goals: Student's learning goals
            knowledge_base: Student's current knowledge
            min_similarity: Minimum similarity threshold
        
        Returns:
            Best matching graph or None
        """
        results = await self.search_graphs(
            subject=subject,
            goals=goals,
            min_status="user_verified",
            limit=5
        )
        
        if results and results[0]["similarity"] >= min_similarity:
            return results[0]["graph"]
        
        return None
    
    def _calculate_similarity(
        self,
        graph: DynamicKnowledgeGraph,
        search_subject: str,
        search_goals: List[str]
    ) -> float:
        """Calculate similarity score between graph and search criteria."""
        score = 0.0
        
        # Subject match (40% weight)
        subject_normalized = normalize_subject(search_subject)
        if graph.subject_normalized == subject_normalized:
            score += 0.4
        elif subject_normalized in graph.subject_normalized:
            score += 0.3
        elif graph.subject_normalized in subject_normalized:
            score += 0.2
        
        # Goal overlap (30% weight)
        if search_goals and graph.goals:
            graph_goals_lower = [g.lower() for g in graph.goals]
            search_goals_lower = [g.lower() for g in search_goals]
            
            # Jaccard similarity
            intersection = len(set(graph_goals_lower) & set(search_goals_lower))
            union = len(set(graph_goals_lower) | set(search_goals_lower))
            if union > 0:
                score += 0.3 * (intersection / union)
        
        # Quality bonus (30% weight)
        # Acceptance rate (15%)
        score += 0.15 * (graph.acceptance_rate or 0)
        
        # Usage popularity (10%)
        usage_score = min((graph.times_used or 0) / 100, 1.0)
        score += 0.10 * usage_score
        
        # Rating (5%)
        rating_score = ((graph.avg_rating or 0) / 5.0)
        score += 0.05 * rating_score
        
        return min(score, 1.0)
    
    # ========================================================================
    # Graph CRUD Operations
    # ========================================================================
    
    async def get_graph(self, graph_id: str) -> Optional[DynamicKnowledgeGraph]:
        """Get a graph by ID."""
        try:
            graph_uuid = uuid.UUID(graph_id)
        except ValueError:
            return None
        
        query = select(DynamicKnowledgeGraph).where(
            DynamicKnowledgeGraph.id == graph_uuid
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def create_graph(
        self,
        generated: GeneratedGraph,
        created_by: str = None
    ) -> DynamicKnowledgeGraph:
        """
        Create a new knowledge graph from generated data.
        
        Args:
            generated: Generated graph from LLM
            created_by: Student ID who created it
        
        Returns:
            Created DynamicKnowledgeGraph
        """
        graph = DynamicKnowledgeGraph(
            id=uuid.uuid4(),
            subject=generated.subject,
            subject_normalized=generated.subject_normalized,
            tags=generated.tags,
            goals=[],
            difficulty_level=generated.difficulty_level,
            estimated_duration_weeks=generated.estimated_weeks,
            nodes=[n.to_dict() for n in generated.nodes],
            edges=[],
            source="llm_generated",
            status="draft",
            times_used=0,
            times_accepted=0,
            acceptance_rate=0.0,
            avg_completion_rate=0.0,
            avg_rating=0.0,
            verified_by_count=0,
            version=1,
            created_by=created_by,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.db.add(graph)
        await self.db.commit()
        await self.db.refresh(graph)
        
        logger.info(f"Created graph {graph.id} for subject: {generated.subject}")
        return graph
    
    async def verify_graph(
        self,
        graph_id: str,
        student_id: str
    ) -> DynamicKnowledgeGraph:
        """
        Mark a graph as verified by a user.
        
        Args:
            graph_id: Graph to verify
            student_id: Student who verified
        
        Returns:
            Updated graph
        """
        graph = await self.get_graph(graph_id)
        if not graph:
            raise ValueError(f"Graph not found: {graph_id}")
        
        # Update verification stats
        graph.times_used = (graph.times_used or 0) + 1
        graph.times_accepted = (graph.times_accepted or 0) + 1
        graph.verified_by_count = (graph.verified_by_count or 0) + 1
        
        # Calculate acceptance rate
        if graph.times_used > 0:
            graph.acceptance_rate = graph.times_accepted / graph.times_used
        
        # Set first verifier
        if not graph.first_verified_by:
            graph.first_verified_by = student_id
        
        # Update status based on thresholds
        if graph.status == "draft":
            graph.status = "user_verified"
        
        if (graph.times_used >= POPULAR_THRESHOLD_USES and 
            graph.acceptance_rate >= POPULAR_THRESHOLD_ACCEPTANCE):
            graph.status = "popular"
        
        graph.updated_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(graph)
        
        logger.info(f"Graph {graph_id} verified by {student_id}, status: {graph.status}")
        return graph
    
    async def reject_graph(self, graph_id: str) -> DynamicKnowledgeGraph:
        """
        Mark a graph as rejected (user clicked regenerate).
        
        Args:
            graph_id: Graph that was rejected
        
        Returns:
            Updated graph
        """
        graph = await self.get_graph(graph_id)
        if not graph:
            raise ValueError(f"Graph not found: {graph_id}")
        
        graph.times_used = (graph.times_used or 0) + 1
        # times_accepted stays the same
        
        if graph.times_used > 0:
            graph.acceptance_rate = (graph.times_accepted or 0) / graph.times_used
        
        graph.updated_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(graph)
        
        return graph
    
    async def rate_graph(
        self,
        graph_id: str,
        student_id: str,
        rating: int,
        feedback: str = None
    ) -> GraphRating:
        """
        Add or update a rating for a graph.
        
        Args:
            graph_id: Graph to rate
            student_id: Student rating
            rating: Rating 1-5
            feedback: Optional feedback text
        
        Returns:
            Created/updated rating
        """
        if not 1 <= rating <= 5:
            raise ValueError("Rating must be between 1 and 5")
        
        graph_uuid = uuid.UUID(graph_id)
        
        # Check for existing rating
        query = select(GraphRating).where(
            and_(
                GraphRating.graph_id == graph_uuid,
                GraphRating.student_id == student_id
            )
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()
        
        if existing:
            existing.rating = rating
            existing.feedback = feedback
            existing.created_at = datetime.utcnow()
            rating_obj = existing
        else:
            rating_obj = GraphRating(
                id=uuid.uuid4(),
                graph_id=graph_uuid,
                student_id=student_id,
                rating=rating,
                feedback=feedback,
                created_at=datetime.utcnow()
            )
            self.db.add(rating_obj)
        
        await self.db.commit()
        
        # Update graph's average rating
        await self._update_avg_rating(graph_id)
        
        return rating_obj
    
    async def _update_avg_rating(self, graph_id: str):
        """Update the average rating for a graph."""
        graph_uuid = uuid.UUID(graph_id)
        
        query = select(func.avg(GraphRating.rating)).where(
            GraphRating.graph_id == graph_uuid
        )
        result = await self.db.execute(query)
        avg = result.scalar()
        
        if avg is not None:
            update_query = update(DynamicKnowledgeGraph).where(
                DynamicKnowledgeGraph.id == graph_uuid
            ).values(avg_rating=float(avg))
            await self.db.execute(update_query)
            await self.db.commit()
    
    # ========================================================================
    # Quota Management
    # ========================================================================
    
    async def get_quota(
        self,
        student_id: str,
        subject: str
    ) -> GenerationQuota:
        """
        Get or create generation quota for a student/subject.
        
        Args:
            student_id: Student ID
            subject: Subject name
        
        Returns:
            GenerationQuota record
        """
        subject_normalized = normalize_subject(subject)
        
        query = select(GenerationQuota).where(
            and_(
                GenerationQuota.student_id == student_id,
                GenerationQuota.subject_normalized == subject_normalized
            )
        )
        result = await self.db.execute(query)
        quota = result.scalar_one_or_none()
        
        if not quota:
            # Check if student exists first
            student_query = select(StudentProfile).where(
                StudentProfile.student_id == student_id
            )
            student_result = await self.db.execute(student_query)
            student = student_result.scalar_one_or_none()
            
            if not student:
                # Create a minimal student profile
                student = StudentProfile(
                    student_id=student_id,
                    knowledge_base={},
                    cognitive_style="mixed",
                    weak_points=[],
                    goals=[],
                    learning_pace=0.5,
                    content_preferences=[],
                    version=1,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.db.add(student)
                await self.db.flush()  # Flush to get the student in DB before quota
            
            quota = GenerationQuota(
                id=uuid.uuid4(),
                student_id=student_id,
                subject_normalized=subject_normalized,
                generations_used=0,
                created_at=datetime.utcnow()
            )
            self.db.add(quota)
            await self.db.commit()
            await self.db.refresh(quota)
        
        return quota
    
    async def can_generate(
        self,
        student_id: str,
        subject: str,
        is_premium: bool = False
    ) -> Tuple[bool, int]:
        """
        Check if student can generate a new graph.
        
        Args:
            student_id: Student ID
            subject: Subject name
            is_premium: Whether student has premium subscription
        
        Returns:
            Tuple of (can_generate, remaining_generations)
        """
        if is_premium:
            return True, -1  # Unlimited
        
        quota = await self.get_quota(student_id, subject)
        remaining = MAX_FREE_GENERATIONS - (quota.generations_used or 0)
        
        return remaining > 0, max(0, remaining)
    
    async def consume_generation(
        self,
        student_id: str,
        subject: str
    ) -> GenerationQuota:
        """
        Consume one generation from quota.
        
        Args:
            student_id: Student ID
            subject: Subject name
        
        Returns:
            Updated quota
        """
        quota = await self.get_quota(student_id, subject)
        quota.generations_used = (quota.generations_used or 0) + 1
        quota.last_generation_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(quota)
        
        logger.info(f"Consumed generation for {student_id}/{subject}, used: {quota.generations_used}")
        return quota
    
    # ========================================================================
    # Path Preview Management
    # ========================================================================
    
    async def create_preview(
        self,
        student_id: str,
        graph_id: str,
        path_sequence: List[str],
        path_details: Dict[str, Any] = None
    ) -> PathPreview:
        """
        Create a path preview for user approval.
        
        Args:
            student_id: Student ID
            graph_id: Graph used for path
            path_sequence: Ordered list of node IDs
            path_details: Additional path details
        
        Returns:
            Created PathPreview
        """
        graph_uuid = uuid.UUID(graph_id)
        
        preview = PathPreview(
            id=uuid.uuid4(),
            student_id=student_id,
            graph_id=graph_uuid,
            path_sequence=path_sequence,
            path_details=path_details or {},
            user_edits=[],
            status="pending",
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(hours=PREVIEW_EXPIRY_HOURS)
        )
        
        self.db.add(preview)
        await self.db.commit()
        await self.db.refresh(preview)
        
        return preview
    
    async def get_preview(self, preview_id: str) -> Optional[PathPreview]:
        """Get a path preview by ID."""
        try:
            preview_uuid = uuid.UUID(preview_id)
        except ValueError:
            return None
        
        query = select(PathPreview).where(PathPreview.id == preview_uuid)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def accept_preview(
        self,
        preview_id: str,
        student_id: str
    ) -> PathPreview:
        """
        Accept a path preview.
        
        Args:
            preview_id: Preview to accept
            student_id: Student accepting
        
        Returns:
            Updated preview
        """
        preview = await self.get_preview(preview_id)
        if not preview:
            raise ValueError(f"Preview not found: {preview_id}")
        
        if preview.student_id != student_id:
            raise ValueError("Preview belongs to different student")
        
        if preview.status != "pending":
            raise ValueError(f"Preview is not pending: {preview.status}")
        
        if datetime.utcnow() > preview.expires_at:
            preview.status = "expired"
            await self.db.commit()
            raise ValueError("Preview has expired")
        
        preview.status = "accepted"
        preview.accepted_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(preview)
        
        # Verify the graph
        await self.verify_graph(str(preview.graph_id), student_id)
        
        return preview
    
    async def apply_edit(
        self,
        preview_id: str,
        edit: Dict[str, Any]
    ) -> PathPreview:
        """
        Apply an edit to a path preview.
        
        Args:
            preview_id: Preview to edit
            edit: Edit action (skip, add, remove, reorder)
        
        Returns:
            Updated preview
        """
        preview = await self.get_preview(preview_id)
        if not preview:
            raise ValueError(f"Preview not found: {preview_id}")
        
        if preview.status != "pending":
            raise ValueError(f"Cannot edit non-pending preview: {preview.status}")
        
        # Add edit to history
        edits = preview.user_edits or []
        edits.append({
            **edit,
            "applied_at": datetime.utcnow().isoformat()
        })
        preview.user_edits = edits
        
        # Apply edit to path sequence
        action = edit.get("action")
        node_id = edit.get("node_id")
        
        if action == "skip" and node_id in preview.path_sequence:
            preview.path_sequence = [n for n in preview.path_sequence if n != node_id]
        elif action == "remove" and node_id in preview.path_sequence:
            preview.path_sequence = [n for n in preview.path_sequence if n != node_id]
        elif action == "reorder":
            new_position = edit.get("new_position", 0)
            if node_id in preview.path_sequence:
                seq = [n for n in preview.path_sequence if n != node_id]
                seq.insert(new_position, node_id)
                preview.path_sequence = seq
        
        await self.db.commit()
        await self.db.refresh(preview)
        
        return preview
    
    # ========================================================================
    # Social Proof
    # ========================================================================
    
    async def get_social_proof(self, graph_id: str) -> Dict[str, Any]:
        """
        Get social proof data for a graph.
        
        Args:
            graph_id: Graph ID
        
        Returns:
            Social proof data
        """
        graph = await self.get_graph(graph_id)
        if not graph:
            return {}
        
        return {
            "verified_by_count": graph.verified_by_count or 0,
            "avg_rating": round(graph.avg_rating or 0, 1),
            "completion_rate": round((graph.avg_completion_rate or 0) * 100, 1),
            "times_used": graph.times_used or 0,
            "status": graph.status,
            "first_verified_by": graph.first_verified_by
        }


# ============================================================================
# Factory Function
# ============================================================================

def get_graph_service(db: AsyncSession) -> GraphService:
    """Factory function to create GraphService."""
    return GraphService(db)
