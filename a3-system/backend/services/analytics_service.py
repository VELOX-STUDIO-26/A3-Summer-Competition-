"""
Learning Analytics Service

Handles:
- Path ratings collection and aggregation
- Learning session tracking
- Analytics computation and reporting
- Quality-based path recommendations
"""

import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from statistics import mean, stdev

from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.logging import get_logger
from models.database import (
    HierarchicalKnowledgeGraph,
    MainTopic,
    Subtopic,
    StudentSubtopicProgress,
    PathRating,
    LearningSession,
    PathAnalytics,
    SubtopicAnalytics,
    StudentProfile,
)

logger = get_logger(__name__)


class AnalyticsService:
    """Service for learning analytics and path quality management."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # Rating System
    # ========================================================================

    async def submit_rating(
        self,
        graph_id: uuid.UUID,
        student_id: str,
        overall_rating: int,
        content_quality: Optional[int] = None,
        difficulty_appropriateness: Optional[int] = None,
        structure_clarity: Optional[int] = None,
        feedback_text: Optional[str] = None,
        would_recommend: Optional[bool] = None,
    ) -> PathRating:
        """Submit or update a rating for a learning path."""
        
        # Validate rating values
        if not 1 <= overall_rating <= 5:
            raise ValueError("Overall rating must be between 1 and 5")
        
        # Get student's completion percentage
        completion = await self._get_student_completion(graph_id, student_id)
        
        # Check for existing rating
        query = select(PathRating).where(
            PathRating.graph_id == graph_id,
            PathRating.student_id == student_id,
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()
        
        if existing:
            # Update existing rating
            existing.overall_rating = overall_rating
            existing.content_quality = content_quality
            existing.difficulty_appropriateness = difficulty_appropriateness
            existing.structure_clarity = structure_clarity
            existing.feedback_text = feedback_text
            existing.would_recommend = would_recommend
            existing.completion_percentage = completion
            rating = existing
        else:
            # Create new rating
            rating = PathRating(
                id=uuid.uuid4(),
                graph_id=graph_id,
                student_id=student_id,
                overall_rating=overall_rating,
                content_quality=content_quality,
                difficulty_appropriateness=difficulty_appropriateness,
                structure_clarity=structure_clarity,
                feedback_text=feedback_text,
                would_recommend=would_recommend,
                completion_percentage=completion,
            )
            self.db.add(rating)
        
        await self.db.commit()
        
        # Update graph's average rating
        await self._update_graph_rating(graph_id)
        
        logger.info(f"Rating submitted for graph {graph_id} by student {student_id}: {overall_rating}/5")
        return rating

    async def get_path_ratings(
        self,
        graph_id: uuid.UUID,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Get ratings summary and recent reviews for a path."""
        
        # Get all ratings for this graph
        query = select(PathRating).where(
            PathRating.graph_id == graph_id
        ).order_by(desc(PathRating.created_at)).limit(limit)
        
        result = await self.db.execute(query)
        ratings = result.scalars().all()
        
        if not ratings:
            return {
                "total_ratings": 0,
                "average_rating": 0.0,
                "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
                "would_recommend_percentage": 0.0,
                "recent_reviews": [],
            }
        
        # Calculate statistics
        overall_ratings = [r.overall_rating for r in ratings]
        distribution = {i: overall_ratings.count(i) for i in range(1, 6)}
        
        recommend_votes = [r.would_recommend for r in ratings if r.would_recommend is not None]
        recommend_pct = (sum(recommend_votes) / len(recommend_votes) * 100) if recommend_votes else 0
        
        # Get recent reviews with text
        recent_reviews = [
            {
                "rating": r.overall_rating,
                "feedback": r.feedback_text,
                "completion_percentage": r.completion_percentage,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in ratings[:10] if r.feedback_text
        ]
        
        return {
            "total_ratings": len(ratings),
            "average_rating": round(mean(overall_ratings), 2),
            "rating_distribution": distribution,
            "would_recommend_percentage": round(recommend_pct, 1),
            "avg_content_quality": self._safe_mean([r.content_quality for r in ratings if r.content_quality]),
            "avg_difficulty_appropriateness": self._safe_mean([r.difficulty_appropriateness for r in ratings if r.difficulty_appropriateness]),
            "avg_structure_clarity": self._safe_mean([r.structure_clarity for r in ratings if r.structure_clarity]),
            "recent_reviews": recent_reviews,
        }

    async def _update_graph_rating(self, graph_id: uuid.UUID):
        """Update the average rating on the graph record."""
        query = select(func.avg(PathRating.overall_rating), func.count(PathRating.id)).where(
            PathRating.graph_id == graph_id
        )
        result = await self.db.execute(query)
        avg_rating, count = result.one()
        
        # Update graph
        graph_query = select(HierarchicalKnowledgeGraph).where(
            HierarchicalKnowledgeGraph.id == graph_id
        )
        graph_result = await self.db.execute(graph_query)
        graph = graph_result.scalar_one_or_none()
        
        if graph:
            graph.avg_rating = float(avg_rating) if avg_rating else 0.0
            graph.verified_by_count = count
            
            # Update status based on ratings
            if count >= 5 and float(avg_rating or 0) >= 4.0:
                graph.status = "popular"
            elif count >= 3 and float(avg_rating or 0) >= 3.5:
                graph.status = "user_verified"
            
            await self.db.commit()

    # ========================================================================
    # Learning Session Tracking
    # ========================================================================

    async def start_session(
        self,
        student_id: str,
        graph_id: uuid.UUID,
        subtopic_id: Optional[uuid.UUID] = None,
        device_type: Optional[str] = None,
    ) -> LearningSession:
        """Start a new learning session."""
        
        session = LearningSession(
            id=uuid.uuid4(),
            student_id=student_id,
            graph_id=graph_id,
            subtopic_id=subtopic_id,
            started_at=datetime.utcnow(),
            device_type=device_type,
        )
        self.db.add(session)
        await self.db.commit()
        
        logger.info(f"Learning session started: {session.id}")
        return session

    async def end_session(
        self,
        session_id: uuid.UUID,
        resources_viewed: int = 0,
        interactions_count: int = 0,
        quiz_attempts: int = 0,
    ) -> LearningSession:
        """End a learning session and record metrics."""
        
        query = select(LearningSession).where(LearningSession.id == session_id)
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()
        
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Use timezone-aware datetime to match database
        now = datetime.utcnow()
        session.ended_at = now
        
        # Handle timezone-aware vs naive datetime comparison
        started = session.started_at
        if started.tzinfo is not None:
            started = started.replace(tzinfo=None)
        session.duration_seconds = int((now - started).total_seconds())
        session.resources_viewed = resources_viewed
        session.interactions_count = interactions_count
        session.quiz_attempts = quiz_attempts
        
        # Calculate focus score based on activity
        if session.duration_seconds > 0:
            # Higher interactions per minute = better focus
            interactions_per_min = (interactions_count / session.duration_seconds) * 60
            session.focus_score = min(1.0, interactions_per_min / 10)  # 10 interactions/min = perfect focus
        
        await self.db.commit()
        
        logger.info(f"Learning session ended: {session_id}, duration: {session.duration_seconds}s")
        return session

    async def record_activity(
        self,
        session_id: uuid.UUID,
        activity_type: str,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Record an activity within a session (lightweight tracking)."""
        
        query = select(LearningSession).where(LearningSession.id == session_id)
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()
        
        if session:
            session.interactions_count += 1
            if activity_type == "resource_view":
                session.resources_viewed += 1
            elif activity_type == "quiz_attempt":
                session.quiz_attempts += 1
            
            await self.db.commit()

    # ========================================================================
    # Analytics Computation
    # ========================================================================

    async def compute_path_analytics(self, graph_id: uuid.UUID) -> PathAnalytics:
        """Compute and store analytics for a learning path."""
        
        # Get or create analytics record
        query = select(PathAnalytics).where(PathAnalytics.graph_id == graph_id)
        result = await self.db.execute(query)
        analytics = result.scalar_one_or_none()
        
        if not analytics:
            analytics = PathAnalytics(
                id=uuid.uuid4(),
                graph_id=graph_id,
            )
            self.db.add(analytics)
        
        # Get all progress records for this graph
        progress_query = select(StudentSubtopicProgress).where(
            StudentSubtopicProgress.graph_id == graph_id
        )
        progress_result = await self.db.execute(progress_query)
        all_progress = progress_result.scalars().all()
        
        # Get unique students
        student_ids = set(p.student_id for p in all_progress)
        analytics.total_students = len(student_ids)
        
        # Active students (activity in last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        active_query = select(func.count(func.distinct(LearningSession.student_id))).where(
            LearningSession.graph_id == graph_id,
            LearningSession.started_at >= week_ago,
        )
        active_result = await self.db.execute(active_query)
        analytics.active_students = active_result.scalar() or 0
        
        # Get graph for subtopic count
        graph_query = select(HierarchicalKnowledgeGraph).where(
            HierarchicalKnowledgeGraph.id == graph_id
        )
        graph_result = await self.db.execute(graph_query)
        graph = graph_result.scalar_one_or_none()
        
        if graph and student_ids:
            total_subtopics = graph.total_subtopic_count
            
            # Calculate completion metrics per student
            completion_percentages = []
            completed_students = 0
            dropout_students = 0
            
            for student_id in student_ids:
                student_progress = [p for p in all_progress if p.student_id == student_id]
                completed = sum(1 for p in student_progress if p.status == "completed")
                pct = (completed / total_subtopics * 100) if total_subtopics > 0 else 0
                completion_percentages.append(pct)
                
                if pct >= 100:
                    completed_students += 1
                elif pct < 20:
                    # Check if student has been inactive
                    last_activity = max((p.updated_at for p in student_progress if p.updated_at), default=None)
                    if last_activity and (datetime.utcnow() - last_activity.replace(tzinfo=None)).days > 14:
                        dropout_students += 1
            
            analytics.completion_rate = completed_students / len(student_ids) if student_ids else 0
            analytics.avg_completion_percentage = mean(completion_percentages) if completion_percentages else 0
            analytics.dropout_rate = dropout_students / len(student_ids) if student_ids else 0
        
        # Session metrics
        session_query = select(LearningSession).where(
            LearningSession.graph_id == graph_id,
            LearningSession.duration_seconds > 0,
        )
        session_result = await self.db.execute(session_query)
        sessions = session_result.scalars().all()
        
        if sessions:
            durations = [s.duration_seconds for s in sessions]
            analytics.avg_session_duration_minutes = mean(durations) / 60
            analytics.total_learning_hours = sum(durations) / 3600
        
        # Quiz metrics
        quiz_scores = [p.quiz_score for p in all_progress if p.quiz_score is not None]
        if quiz_scores:
            analytics.avg_quiz_score = mean(quiz_scores)
        
        first_attempt_passes = sum(1 for p in all_progress if p.quiz_passed and not p.bypass_mode)
        total_quiz_attempts = sum(1 for p in all_progress if p.quiz_score is not None)
        if total_quiz_attempts > 0:
            analytics.avg_first_attempt_pass_rate = first_attempt_passes / total_quiz_attempts
        
        # Bypass rate
        bypassed = sum(1 for p in all_progress if p.bypass_mode)
        if all_progress:
            analytics.bypass_rate = bypassed / len(all_progress)
        
        # Compute quality score
        analytics.quality_score = self._compute_quality_score(analytics)
        analytics.last_calculated_at = datetime.utcnow()
        
        await self.db.commit()
        
        logger.info(f"Computed analytics for graph {graph_id}: quality_score={analytics.quality_score}")
        return analytics

    def _compute_quality_score(self, analytics: PathAnalytics) -> float:
        """Compute overall quality score (0-100) based on analytics."""
        score = 50.0  # Base score
        
        # Completion rate (up to +20)
        score += (analytics.completion_rate or 0) * 20
        
        # Low dropout rate (up to +10)
        score += (1 - (analytics.dropout_rate or 0)) * 10
        
        # Good quiz scores (up to +10)
        if analytics.avg_quiz_score:
            score += analytics.avg_quiz_score * 10
        
        # First attempt pass rate (up to +10)
        score += (analytics.avg_first_attempt_pass_rate or 0) * 10
        
        # Penalize high bypass rate (-10 max)
        score -= (analytics.bypass_rate or 0) * 10
        
        return max(0, min(100, score))

    async def compute_subtopic_analytics(self, subtopic_id: uuid.UUID) -> SubtopicAnalytics:
        """Compute analytics for a specific subtopic."""
        
        # Get subtopic info
        subtopic_query = select(Subtopic).where(Subtopic.id == subtopic_id)
        subtopic_result = await self.db.execute(subtopic_query)
        subtopic = subtopic_result.scalar_one_or_none()
        
        if not subtopic:
            raise ValueError(f"Subtopic {subtopic_id} not found")
        
        # Get or create analytics
        query = select(SubtopicAnalytics).where(SubtopicAnalytics.subtopic_id == subtopic_id)
        result = await self.db.execute(query)
        analytics = result.scalar_one_or_none()
        
        if not analytics:
            analytics = SubtopicAnalytics(
                id=uuid.uuid4(),
                subtopic_id=subtopic_id,
                graph_id=subtopic.main_topic.graph_id if hasattr(subtopic, 'main_topic') else None,
            )
            self.db.add(analytics)
        
        # Get all progress for this subtopic
        progress_query = select(StudentSubtopicProgress).where(
            StudentSubtopicProgress.subtopic_id == subtopic_id
        )
        progress_result = await self.db.execute(progress_query)
        all_progress = progress_result.scalars().all()
        
        analytics.total_attempts = len(all_progress)
        analytics.total_completions = sum(1 for p in all_progress if p.status == "completed")
        
        if all_progress:
            # Pass rates
            passed = sum(1 for p in all_progress if p.quiz_passed)
            analytics.pass_rate = passed / len(all_progress)
            
            # First attempt (non-bypass) passes
            first_attempts = [p for p in all_progress if not p.bypass_mode and p.quiz_score is not None]
            if first_attempts:
                first_passed = sum(1 for p in first_attempts if p.quiz_passed)
                analytics.first_attempt_pass_rate = first_passed / len(first_attempts)
            
            # Quiz scores
            scores = [p.quiz_score for p in all_progress if p.quiz_score is not None]
            if scores:
                analytics.avg_quiz_score = mean(scores)
                analytics.score_std_dev = stdev(scores) if len(scores) > 1 else 0
            
            # Bypass rate
            bypassed = sum(1 for p in all_progress if p.bypass_mode)
            analytics.bypass_rate = bypassed / len(all_progress)
            
            # Compute difficulty based on performance
            # Low pass rate = high difficulty
            analytics.computed_difficulty = 1 - analytics.pass_rate
            analytics.difficulty_mismatch = abs(analytics.computed_difficulty - subtopic.difficulty)
            
            # Flag for review if mismatch is high
            if analytics.difficulty_mismatch > 0.3:
                analytics.needs_review = True
                analytics.review_reason = f"Difficulty mismatch: stated {subtopic.difficulty:.2f}, computed {analytics.computed_difficulty:.2f}"
        
        analytics.last_calculated_at = datetime.utcnow()
        await self.db.commit()
        
        return analytics

    # ========================================================================
    # Quality-Based Path Recommendations
    # ========================================================================

    async def get_top_rated_paths(
        self,
        subject_normalized: Optional[str] = None,
        min_ratings: int = 3,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Get top-rated learning paths, optionally filtered by subject."""
        
        query = select(HierarchicalKnowledgeGraph).where(
            HierarchicalKnowledgeGraph.verified_by_count >= min_ratings,
            HierarchicalKnowledgeGraph.avg_rating >= 3.5,
        )
        
        if subject_normalized:
            query = query.where(
                HierarchicalKnowledgeGraph.subject_normalized == subject_normalized
            )
        
        query = query.order_by(
            desc(HierarchicalKnowledgeGraph.avg_rating),
            desc(HierarchicalKnowledgeGraph.verified_by_count),
        ).limit(limit)
        
        result = await self.db.execute(query)
        graphs = result.scalars().all()
        
        return [
            {
                "id": str(g.id),
                "subject": g.subject,
                "avg_rating": g.avg_rating,
                "rating_count": g.verified_by_count,
                "main_topic_count": g.main_topic_count,
                "total_subtopic_count": g.total_subtopic_count,
                "difficulty_level": g.difficulty_level,
                "status": g.status,
            }
            for g in graphs
        ]

    async def get_template_path(
        self,
        subject_normalized: str,
        min_rating: float = 4.0,
    ) -> Optional[HierarchicalKnowledgeGraph]:
        """Get a highly-rated path to use as a template for new generations."""
        
        query = select(HierarchicalKnowledgeGraph).where(
            HierarchicalKnowledgeGraph.subject_normalized == subject_normalized,
            HierarchicalKnowledgeGraph.avg_rating >= min_rating,
            HierarchicalKnowledgeGraph.verified_by_count >= 5,
            HierarchicalKnowledgeGraph.status.in_(["popular", "curated"]),
        ).options(
            selectinload(HierarchicalKnowledgeGraph.main_topics).selectinload(MainTopic.subtopics)
        ).order_by(
            desc(HierarchicalKnowledgeGraph.avg_rating),
        ).limit(1)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    # ========================================================================
    # Helper Methods
    # ========================================================================

    async def _get_student_completion(
        self,
        graph_id: uuid.UUID,
        student_id: str,
    ) -> float:
        """Get student's completion percentage for a graph."""
        
        # Get total subtopics
        graph_query = select(HierarchicalKnowledgeGraph).where(
            HierarchicalKnowledgeGraph.id == graph_id
        )
        graph_result = await self.db.execute(graph_query)
        graph = graph_result.scalar_one_or_none()
        
        if not graph or graph.total_subtopic_count == 0:
            return 0.0
        
        # Get completed subtopics
        progress_query = select(func.count(StudentSubtopicProgress.id)).where(
            StudentSubtopicProgress.graph_id == graph_id,
            StudentSubtopicProgress.student_id == student_id,
            StudentSubtopicProgress.status == "completed",
        )
        progress_result = await self.db.execute(progress_query)
        completed = progress_result.scalar() or 0
        
        return (completed / graph.total_subtopic_count) * 100

    def _safe_mean(self, values: List[Optional[float]]) -> Optional[float]:
        """Calculate mean, handling None values."""
        valid = [v for v in values if v is not None]
        return round(mean(valid), 2) if valid else None
