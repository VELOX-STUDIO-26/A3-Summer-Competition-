"""
Comparative Analytics Engine for A3 Learning System.

This module calculates and caches comparative metrics for students
within their cohorts, enabling peer benchmarking and percentile rankings.

Key Features:
- Cohort-wide statistics aggregation
- Individual percentile calculations
- Privacy-aware anonymization
- Cached metrics with configurable refresh intervals
"""

import statistics
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import get_logger
from models.database import (
    Cohort,
    CohortMembership,
    CohortStatistics,
    StudentComparativeMetrics,
    StudentProfile,
    QuizAttempt,
    LearningPath,
    LearningEvent,
)

logger = get_logger(__name__)

# Cache duration for cohort statistics (recalculated daily)
COHORT_STATS_CACHE_HOURS = 24

# Minimum cohort size for showing comparative data
MIN_COHORT_SIZE = 5


class ComparativeAnalyticsEngine:
    """Engine for calculating and managing comparative analytics."""

    async def get_student_comparative_metrics(
        self,
        student_id: str,
        cohort_id: str,
        db: AsyncSession,
        force_refresh: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        Get comparative metrics for a student within their cohort.
        
        Returns None if cohort is too small for meaningful comparisons.
        """
        # Check cohort size
        cohort = await self._get_cohort(cohort_id, db)
        if not cohort:
            logger.warning(f"Cohort not found: {cohort_id}")
            return None

        member_count = await self._get_cohort_member_count(cohort_id, db)
        if member_count < cohort.min_members_for_comparison:
            logger.info(f"Cohort {cohort_id} too small for comparisons ({member_count} < {cohort.min_members_for_comparison})")
            return {
                "available": False,
                "reason": f"Need at least {cohort.min_members_for_comparison} students for comparisons",
                "current_size": member_count,
            }

        # Check for cached metrics
        now = datetime.now(timezone.utc)
        if not force_refresh:
            cached = await self._get_cached_metrics(student_id, cohort_id, db)
            if cached and cached.expires_at > now:
                return self._format_metrics_response(cached, cohort, member_count)

        # Calculate fresh metrics
        metrics = await self._calculate_student_metrics(student_id, cohort_id, db)
        
        # Cache the results
        await self._cache_student_metrics(student_id, cohort_id, metrics, db)

        return {
            "available": True,
            "student_id": student_id,
            "cohort_id": cohort_id,
            "cohort_name": cohort.name,
            "cohort_size": member_count,
            "calculated_at": now.isoformat(),
            **metrics,
        }

    async def get_cohort_statistics(
        self,
        cohort_id: str,
        db: AsyncSession,
        force_refresh: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """Get aggregated statistics for a cohort."""
        cohort = await self._get_cohort(cohort_id, db)
        if not cohort:
            return None

        member_count = await self._get_cohort_member_count(cohort_id, db)
        if member_count < MIN_COHORT_SIZE:
            return {
                "available": False,
                "reason": f"Need at least {MIN_COHORT_SIZE} students",
                "current_size": member_count,
            }

        now = datetime.now(timezone.utc)
        
        # Check cache
        if not force_refresh:
            cached_stats = await self._get_cached_cohort_stats(cohort_id, db)
            if cached_stats:
                return {
                    "available": True,
                    "cohort_id": cohort_id,
                    "cohort_name": cohort.name,
                    "member_count": member_count,
                    "statistics": cached_stats,
                    "from_cache": True,
                }

        # Calculate fresh statistics
        stats = await self._calculate_cohort_statistics(cohort_id, db)
        
        # Cache them
        await self._cache_cohort_statistics(cohort_id, stats, db)

        return {
            "available": True,
            "cohort_id": cohort_id,
            "cohort_name": cohort.name,
            "member_count": member_count,
            "statistics": stats,
            "from_cache": False,
            "calculated_at": now.isoformat(),
        }

    async def get_anonymized_leaderboard(
        self,
        cohort_id: str,
        db: AsyncSession,
        metric: str = "quiz_score",
        limit: int = 10,
    ) -> Optional[Dict[str, Any]]:
        """Get anonymized leaderboard for a cohort."""
        cohort = await self._get_cohort(cohort_id, db)
        if not cohort or not cohort.allow_leaderboard:
            return None

        member_count = await self._get_cohort_member_count(cohort_id, db)
        if member_count < cohort.min_members_for_comparison:
            return {"available": False, "reason": "Cohort too small"}

        # Get all members with their metrics
        members = await self._get_cohort_members_with_metrics(cohort_id, metric, db)
        
        # Sort and rank
        sorted_members = sorted(members, key=lambda x: x["value"], reverse=True)
        
        # Anonymize
        leaderboard = []
        for rank, member in enumerate(sorted_members[:limit], 1):
            leaderboard.append({
                "rank": rank,
                "alias": member["alias"] or f"Student {rank}",
                "value": round(member["value"], 1),
                "is_you": member["student_id"] == member.get("requesting_student_id"),
            })

        return {
            "available": True,
            "cohort_name": cohort.name,
            "metric": metric,
            "leaderboard": leaderboard,
            "total_participants": len(members),
        }

    # =========================================================================
    # Private Helper Methods
    # =========================================================================

    async def _get_cohort(self, cohort_id: str, db: AsyncSession) -> Optional[Cohort]:
        """Get cohort by ID."""
        result = await db.execute(
            select(Cohort).where(Cohort.cohort_id == cohort_id)
        )
        return result.scalar_one_or_none()

    async def _get_cohort_member_count(self, cohort_id: str, db: AsyncSession) -> int:
        """Get number of students in a cohort."""
        result = await db.execute(
            select(func.count(CohortMembership.id)).where(
                CohortMembership.cohort_id == cohort_id,
                CohortMembership.role == "student",
            )
        )
        return result.scalar() or 0

    async def _get_cached_metrics(
        self, student_id: str, cohort_id: str, db: AsyncSession
    ) -> Optional[StudentComparativeMetrics]:
        """Get cached comparative metrics for a student."""
        result = await db.execute(
            select(StudentComparativeMetrics).where(
                StudentComparativeMetrics.student_id == student_id,
                StudentComparativeMetrics.cohort_id == cohort_id,
            )
        )
        return result.scalar_one_or_none()

    async def _get_cached_cohort_stats(
        self, cohort_id: str, db: AsyncSession
    ) -> Optional[Dict[str, Any]]:
        """Get cached cohort statistics."""
        now = datetime.now(timezone.utc)
        result = await db.execute(
            select(CohortStatistics).where(
                CohortStatistics.cohort_id == cohort_id,
                CohortStatistics.expires_at > now,
            )
        )
        stats = result.scalars().all()
        
        if not stats:
            return None

        return {
            stat.metric_type: {
                "mean": stat.mean_value,
                "median": stat.median_value,
                "std_dev": stat.std_deviation,
                "min": stat.min_value,
                "max": stat.max_value,
                "percentiles": stat.percentiles,
                "sample_size": stat.sample_size,
            }
            for stat in stats
        }

    async def _calculate_student_metrics(
        self, student_id: str, cohort_id: str, db: AsyncSession
    ) -> Dict[str, Any]:
        """Calculate comparative metrics for a student."""
        # Get all cohort members' data
        members_data = await self._get_all_members_data(cohort_id, db)
        
        if not members_data:
            return {}

        # Find student's data
        student_data = next(
            (m for m in members_data if m["student_id"] == student_id), None
        )
        if not student_data:
            return {}

        # Calculate percentiles
        quiz_scores = [m["avg_quiz_score"] for m in members_data if m["avg_quiz_score"] is not None]
        completion_rates = [m["completion_rate"] for m in members_data if m["completion_rate"] is not None]
        study_hours = [m["study_hours"] for m in members_data if m["study_hours"] is not None]

        metrics = {
            "percentiles": {},
            "vs_average": {},
            "rank": {},
        }

        # Quiz score percentile
        if quiz_scores and student_data["avg_quiz_score"] is not None:
            metrics["percentiles"]["quiz_score"] = self._calculate_percentile(
                student_data["avg_quiz_score"], quiz_scores
            )
            avg = statistics.mean(quiz_scores)
            metrics["vs_average"]["quiz_score"] = round(student_data["avg_quiz_score"] - avg, 1)

        # Completion rate percentile
        if completion_rates and student_data["completion_rate"] is not None:
            metrics["percentiles"]["completion"] = self._calculate_percentile(
                student_data["completion_rate"], completion_rates
            )
            avg = statistics.mean(completion_rates)
            metrics["vs_average"]["completion"] = round(student_data["completion_rate"] - avg, 1)

        # Study hours percentile
        if study_hours and student_data["study_hours"] is not None:
            metrics["percentiles"]["study_hours"] = self._calculate_percentile(
                student_data["study_hours"], study_hours
            )
            avg = statistics.mean(study_hours)
            metrics["vs_average"]["study_hours"] = round(student_data["study_hours"] - avg, 1)

        # Overall rank (based on quiz score)
        if quiz_scores:
            sorted_scores = sorted(quiz_scores, reverse=True)
            if student_data["avg_quiz_score"] is not None:
                rank = sorted_scores.index(student_data["avg_quiz_score"]) + 1
                metrics["rank"]["overall"] = rank
                metrics["rank"]["total"] = len(sorted_scores)

        return metrics

    async def _calculate_cohort_statistics(
        self, cohort_id: str, db: AsyncSession
    ) -> Dict[str, Dict[str, Any]]:
        """Calculate aggregate statistics for a cohort."""
        members_data = await self._get_all_members_data(cohort_id, db)
        
        if not members_data:
            return {}

        stats = {}

        # Quiz scores
        quiz_scores = [m["avg_quiz_score"] for m in members_data if m["avg_quiz_score"] is not None]
        if quiz_scores:
            stats["avg_quiz_score"] = self._compute_distribution_stats(quiz_scores)

        # Completion rates
        completion_rates = [m["completion_rate"] for m in members_data if m["completion_rate"] is not None]
        if completion_rates:
            stats["completion_rate"] = self._compute_distribution_stats(completion_rates)

        # Study hours
        study_hours = [m["study_hours"] for m in members_data if m["study_hours"] is not None]
        if study_hours:
            stats["study_hours"] = self._compute_distribution_stats(study_hours)

        return stats

    async def _get_all_members_data(
        self, cohort_id: str, db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Get performance data for all cohort members."""
        # Get member IDs
        members_result = await db.execute(
            select(CohortMembership.student_id).where(
                CohortMembership.cohort_id == cohort_id,
                CohortMembership.role == "student",
            )
        )
        member_ids = [row[0] for row in members_result.fetchall()]

        if not member_ids:
            return []

        members_data = []
        for student_id in member_ids:
            data = await self._get_student_performance_data(student_id, db)
            data["student_id"] = student_id
            members_data.append(data)

        return members_data

    async def _get_student_performance_data(
        self, student_id: str, db: AsyncSession
    ) -> Dict[str, Any]:
        """Get performance metrics for a single student."""
        # Quiz average
        quiz_result = await db.execute(
            select(func.avg(QuizAttempt.score)).where(
                QuizAttempt.student_id == student_id,
                QuizAttempt.score.is_not(None),
            )
        )
        avg_score = quiz_result.scalar()

        # Completion rate (from learning path)
        path_result = await db.execute(
            select(LearningPath).where(
                LearningPath.student_id == student_id,
                LearningPath.status == "active",
            )
        )
        path = path_result.scalar_one_or_none()
        completion_rate = None
        if path and path.path_sequence:
            completed = len([n for n in path.path_sequence if n.get("completed")])
            completion_rate = (completed / len(path.path_sequence)) * 100 if path.path_sequence else 0

        # Study hours (from events in last 30 days)
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        events_result = await db.execute(
            select(func.count(LearningEvent.event_id)).where(
                LearningEvent.student_id == student_id,
                LearningEvent.created_at >= thirty_days_ago,
            )
        )
        event_count = events_result.scalar() or 0
        # Estimate: ~2 minutes per event
        study_hours = round((event_count * 2) / 60, 1)

        return {
            "avg_quiz_score": float(avg_score) if avg_score else None,
            "completion_rate": completion_rate,
            "study_hours": study_hours,
        }

    async def _get_cohort_members_with_metrics(
        self, cohort_id: str, metric: str, db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Get cohort members with a specific metric for leaderboard."""
        members_result = await db.execute(
            select(CohortMembership).where(
                CohortMembership.cohort_id == cohort_id,
                CohortMembership.role == "student",
                CohortMembership.show_in_leaderboard == True,
            )
        )
        members = members_result.scalars().all()

        result = []
        for member in members:
            data = await self._get_student_performance_data(member.student_id, db)
            
            # Map metric name to data field
            metric_map = {
                "quiz_score": "avg_quiz_score",
                "completion": "completion_rate",
                "study_hours": "study_hours",
            }
            value = data.get(metric_map.get(metric, "avg_quiz_score")) or 0

            result.append({
                "student_id": member.student_id,
                "alias": member.anonymous_alias,
                "value": value,
            })

        return result

    def _calculate_percentile(self, value: float, all_values: List[float]) -> float:
        """Calculate percentile rank for a value within a distribution."""
        if not all_values:
            return 0
        below = sum(1 for v in all_values if v < value)
        equal = sum(1 for v in all_values if v == value)
        percentile = ((below + 0.5 * equal) / len(all_values)) * 100
        return round(percentile, 1)

    def _compute_distribution_stats(self, values: List[float]) -> Dict[str, Any]:
        """Compute statistical distribution for a list of values."""
        if not values:
            return {}

        sorted_values = sorted(values)
        n = len(sorted_values)

        return {
            "mean": round(statistics.mean(values), 2),
            "median": round(statistics.median(values), 2),
            "std_dev": round(statistics.stdev(values), 2) if n > 1 else 0,
            "min": round(min(values), 2),
            "max": round(max(values), 2),
            "percentiles": {
                "p10": round(sorted_values[int(n * 0.1)], 2) if n >= 10 else None,
                "p25": round(sorted_values[int(n * 0.25)], 2) if n >= 4 else None,
                "p50": round(sorted_values[int(n * 0.5)], 2) if n >= 2 else None,
                "p75": round(sorted_values[int(n * 0.75)], 2) if n >= 4 else None,
                "p90": round(sorted_values[int(n * 0.9)], 2) if n >= 10 else None,
            },
            "sample_size": n,
        }

    async def _cache_student_metrics(
        self,
        student_id: str,
        cohort_id: str,
        metrics: Dict[str, Any],
        db: AsyncSession,
    ) -> None:
        """Cache student comparative metrics."""
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=COHORT_STATS_CACHE_HOURS)

        # Check for existing
        existing = await self._get_cached_metrics(student_id, cohort_id, db)

        if existing:
            existing.quiz_score_percentile = metrics.get("percentiles", {}).get("quiz_score")
            existing.completion_percentile = metrics.get("percentiles", {}).get("completion")
            existing.study_hours_percentile = metrics.get("percentiles", {}).get("study_hours")
            existing.quiz_score_vs_avg = metrics.get("vs_average", {}).get("quiz_score")
            existing.completion_vs_avg = metrics.get("vs_average", {}).get("completion")
            existing.study_hours_vs_avg = metrics.get("vs_average", {}).get("study_hours")
            existing.overall_rank = metrics.get("rank", {}).get("overall")
            existing.total_in_cohort = metrics.get("rank", {}).get("total")
            existing.calculated_at = now
            existing.expires_at = expires_at
        else:
            new_metrics = StudentComparativeMetrics(
                student_id=student_id,
                cohort_id=cohort_id,
                quiz_score_percentile=metrics.get("percentiles", {}).get("quiz_score"),
                completion_percentile=metrics.get("percentiles", {}).get("completion"),
                study_hours_percentile=metrics.get("percentiles", {}).get("study_hours"),
                quiz_score_vs_avg=metrics.get("vs_average", {}).get("quiz_score"),
                completion_vs_avg=metrics.get("vs_average", {}).get("completion"),
                study_hours_vs_avg=metrics.get("vs_average", {}).get("study_hours"),
                overall_rank=metrics.get("rank", {}).get("overall"),
                total_in_cohort=metrics.get("rank", {}).get("total"),
                calculated_at=now,
                expires_at=expires_at,
            )
            db.add(new_metrics)

        await db.commit()

    async def _cache_cohort_statistics(
        self,
        cohort_id: str,
        stats: Dict[str, Dict[str, Any]],
        db: AsyncSession,
    ) -> None:
        """Cache cohort statistics."""
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=COHORT_STATS_CACHE_HOURS)

        for metric_type, stat_data in stats.items():
            # Check for existing
            result = await db.execute(
                select(CohortStatistics).where(
                    CohortStatistics.cohort_id == cohort_id,
                    CohortStatistics.metric_type == metric_type,
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.mean_value = stat_data["mean"]
                existing.median_value = stat_data["median"]
                existing.std_deviation = stat_data["std_dev"]
                existing.min_value = stat_data["min"]
                existing.max_value = stat_data["max"]
                existing.percentiles = stat_data["percentiles"]
                existing.sample_size = stat_data["sample_size"]
                existing.calculated_at = now
                existing.expires_at = expires_at
            else:
                new_stat = CohortStatistics(
                    cohort_id=cohort_id,
                    metric_type=metric_type,
                    mean_value=stat_data["mean"],
                    median_value=stat_data["median"],
                    std_deviation=stat_data["std_dev"],
                    min_value=stat_data["min"],
                    max_value=stat_data["max"],
                    percentiles=stat_data["percentiles"],
                    sample_size=stat_data["sample_size"],
                    calculated_at=now,
                    expires_at=expires_at,
                )
                db.add(new_stat)

        await db.commit()

    def _format_metrics_response(
        self,
        cached: StudentComparativeMetrics,
        cohort: Cohort,
        member_count: int,
    ) -> Dict[str, Any]:
        """Format cached metrics into API response."""
        return {
            "available": True,
            "student_id": cached.student_id,
            "cohort_id": cached.cohort_id,
            "cohort_name": cohort.name,
            "cohort_size": member_count,
            "from_cache": True,
            "calculated_at": cached.calculated_at.isoformat() if cached.calculated_at else None,
            "percentiles": {
                "quiz_score": cached.quiz_score_percentile,
                "completion": cached.completion_percentile,
                "study_hours": cached.study_hours_percentile,
            },
            "vs_average": {
                "quiz_score": cached.quiz_score_vs_avg,
                "completion": cached.completion_vs_avg,
                "study_hours": cached.study_hours_vs_avg,
            },
            "rank": {
                "overall": cached.overall_rank,
                "total": cached.total_in_cohort,
            },
        }


# Singleton instance
comparative_engine = ComparativeAnalyticsEngine()


def get_comparative_engine() -> ComparativeAnalyticsEngine:
    """Get the comparative analytics engine instance."""
    return comparative_engine
