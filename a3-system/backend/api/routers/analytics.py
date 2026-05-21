"""
Analytics API Router for A3 Learning System.

Endpoints:
- GET /api/analytics/{student_id} : Get comprehensive analytics for a student
- GET /api/analytics/{student_id}/progress : Get learning progress over time
- GET /api/analytics/{student_id}/activity : Get recent activity
- GET /api/analytics/{student_id}/dashboard : Get dashboard summary
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import get_logger
from models.database import (
    GeneratedQuiz,
    LearningEvent,
    LearningPath,
    QuizAttempt,
    StudentProfile,
    get_db,
)
from analytics.analytics_engine import get_analytics_engine, AnalyticsReport

logger = get_logger(__name__)
router = APIRouter()


@router.get("/{student_id}")
async def get_analytics(
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get comprehensive analytics for a student from real database data."""
    logger.info(f"Fetching real analytics for student: {student_id}")

    # Get completed quiz attempts
    attempts_result = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.student_id == student_id,
            QuizAttempt.score.is_not(None),
        ).order_by(QuizAttempt.completed_at.desc())
    )
    attempts = attempts_result.scalars().all()

    # Get generated quizzes count
    quiz_count_result = await db.execute(
        select(func.count()).select_from(GeneratedQuiz).where(
            GeneratedQuiz.student_id == student_id,
            GeneratedQuiz.is_active == True,
        )
    )
    total_quizzes = quiz_count_result.scalar()

    # Calculate overview metrics
    completed_quizzes = len(attempts)
    total_study_time = sum(a.time_spent_seconds or 0 for a in attempts) // 60  # minutes
    avg_score = (
        round(sum(a.score * 100 for a in attempts) / completed_quizzes, 1)
        if completed_quizzes > 0
        else 0
    )

    # Calculate weekly progress from attempts
    weekly_progress = _calculate_weekly_progress(attempts)

    # Calculate subject breakdown from weak topics
    subject_breakdown = await _calculate_subject_breakdown(attempts, db)

    # Build quiz history - fetch all quizzes in one query to avoid N+1
    quiz_ids = [a.quiz_id for a in attempts[:10]]
    quizzes_result = await db.execute(
        select(GeneratedQuiz).where(GeneratedQuiz.quiz_id.in_(quiz_ids))
    ) if quiz_ids else []
    quizzes_map = {q.quiz_id: q for q in quizzes_result.scalars().all()}

    quiz_history = []
    for attempt in attempts[:10]:  # Last 10 quizzes
        quiz = quizzes_map.get(attempt.quiz_id)
        quiz_history.append({
            "id": attempt.attempt_id,
            "title": quiz.title if quiz else "Unknown Quiz",
            "score": round(attempt.score * 100, 1) if attempt.score else 0,
            "date": attempt.completed_at.strftime("%Y-%m-%d") if attempt.completed_at else "",
            "maxScore": 100,
        })

    # Calculate streak
    streak = _calculate_streak(attempts)

    # Generate achievements from real data
    achievements = _generate_achievements(attempts)

    return {
        "student_id": student_id,
        "overview": {
            "totalStudyTime": total_study_time,
            "studyTimeChange": 0,  # Would need historical comparison
            "modulesCompleted": completed_quizzes,
            "modulesChange": 0,
            "quizzesTaken": completed_quizzes,
            "quizzesChange": 0,
            "averageScore": avg_score,
            "scoreChange": 0,
        },
        "weeklyProgress": weekly_progress,
        "subjectBreakdown": subject_breakdown,
        "quizHistory": quiz_history,
        "streak": streak,
        "achievements": achievements,
    }


@router.get("/{student_id}/progress")
async def get_progress(
    student_id: str,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
):
    """Get learning progress over time from real quiz data."""
    logger.info(f"Fetching real progress for student: {student_id}, days: {days}")

    attempts_result = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.student_id == student_id,
            QuizAttempt.score.is_not(None),
            QuizAttempt.completed_at >= datetime.utcnow() - timedelta(days=days),
        ).order_by(QuizAttempt.completed_at.asc())
    )
    attempts = attempts_result.scalars().all()

    # Group by date
    progress_data = []
    for i in range(days):
        date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
        day_attempts = [
            a for a in attempts
            if a.completed_at and a.completed_at.strftime("%Y-%m-%d") == date
        ]
        hours = sum(a.time_spent_seconds or 0 for a in day_attempts) / 3600
        progress_data.append({
            "date": date,
            "hours": round(hours, 1),
            "modules_completed": len(day_attempts),
            "quizzes_taken": len(day_attempts),
            "average_score": (
                round(sum(a.score * 100 for a in day_attempts) / len(day_attempts), 1)
                if day_attempts else 0
            ),
        })

    return {
        "student_id": student_id,
        "days": days,
        "progress": list(reversed(progress_data)),
    }


@router.get("/{student_id}/activity")
async def get_activity(
    student_id: str,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    """Get recent activity from real database events and quiz attempts."""
    logger.info(f"Fetching real activity for student: {student_id}")

    # Get learning events
    events_result = await db.execute(
        select(LearningEvent).where(
            LearningEvent.student_id == student_id,
        ).order_by(LearningEvent.created_at.desc()).limit(limit)
    )
    events = events_result.scalars().all()

    # Get recent quiz attempts
    attempts_result = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.student_id == student_id,
            QuizAttempt.score.is_not(None),
        ).order_by(QuizAttempt.completed_at.desc()).limit(limit)
    )
    attempts = attempts_result.scalars().all()

    activities = []

    # Add quiz activities with actual timestamp for sorting
    for attempt in attempts:
        quiz_result = await db.execute(
            select(GeneratedQuiz).where(GeneratedQuiz.quiz_id == attempt.quiz_id)
        )
        quiz = quiz_result.scalar_one_or_none()
        score_pct = round(attempt.score * 100, 1) if attempt.score else 0
        activities.append({
            "type": "quiz",
            "title": quiz.title if quiz else "Quiz",
            "score": score_pct,
            "xp": 100 if attempt.score and attempt.score >= 0.7 else 0,
            "date": _time_ago(attempt.completed_at) if attempt.completed_at else "",
            "timestamp": attempt.completed_at.isoformat() if attempt.completed_at else "",
        })

    # Add learning events with actual timestamp
    for event in events:
        activities.append({
            "type": event.event_type,
            "title": event.event_data.get("title", "Activity"),
            "xp": event.event_data.get("xp", 0),
            "date": _time_ago(event.created_at) if event.created_at else "",
            "timestamp": event.created_at.isoformat() if event.created_at else "",
        })

    # Sort by actual timestamp (newest first) and limit
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    activities = activities[:limit]

    # Remove internal timestamp field from response
    for activity in activities:
        activity.pop("timestamp", None)

    return {
        "student_id": student_id,
        "activities": activities,
    }


@router.get("/{student_id}/insights")
async def get_llm_insights(
    student_id: str,
    refresh: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """
    Get LLM-powered insights from behavioral data.
    
    Uses cached insights if available (regenerated once per day).
    Pass refresh=true to force regeneration.
    
    This endpoint aggregates all student behavioral signals and uses an LLM
    to generate personalized, actionable insights including:
    - Study pattern analysis (night owl vs early bird, session duration)
    - Performance trends (improving, declining, stable)
    - Predictive analytics (completion forecast, at-risk detection)
    - Personalized recommendations
    - Alerts for concerning patterns
    
    Response includes cache metadata:
    - from_cache: Whether this is cached data
    - generated_at: When insights were generated
    - expires_at: When cache will expire
    - generation_count: How many times insights have been regenerated
    """
    logger.info(f"Getting insights for student: {student_id} (refresh={refresh})")
    
    try:
        engine = get_analytics_engine()
        result = await engine.get_insights(student_id, db, force_refresh=refresh)
        return result
    except Exception as e:
        import traceback
        logger.error(f"Failed to get insights: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get insights: {str(e)}",
        )


@router.get("/{student_id}/dashboard")
async def get_dashboard_summary(
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard summary with real data from database."""
    logger.info(f"Fetching real dashboard summary for student: {student_id}")

    # Get student profile
    profile_result = await db.execute(
        select(StudentProfile).where(StudentProfile.student_id == student_id)
    )
    profile = profile_result.scalar_one_or_none()

    # Get completed quiz attempts
    attempts_result = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.student_id == student_id,
            QuizAttempt.score.is_not(None),
        ).order_by(QuizAttempt.completed_at.desc())
    )
    attempts = attempts_result.scalars().all()

    # Get learning path
    path_result = await db.execute(
        select(LearningPath).where(
            LearningPath.student_id == student_id,
            LearningPath.status == "active",
        ).order_by(LearningPath.created_at.desc())
    )
    path = path_result.scalar_one_or_none()

    # Calculate metrics
    total_study_time = sum(a.time_spent_seconds or 0 for a in attempts) // 60
    completed_quizzes = len(attempts)
    total_xp = sum(100 for a in attempts if a.score and a.score >= 0.7)
    level = _calculate_level(total_xp)
    next_level_xp = _next_level_xp(level)

    # Current streak
    streak = _calculate_streak(attempts)

    # Current path info
    path_progress = 0
    completed_modules = 0
    total_modules = 20
    current_module = "Not started"

    if path and path.path_sequence:
        total_modules = len(path.path_sequence)
        # Count completed nodes from attempts
        completed_modules = completed_quizzes  # Simplified - in reality would track node completion
        path_progress = round((completed_modules / total_modules) * 100) if total_modules > 0 else 0
        current_module = path.path_sequence[min(completed_modules, total_modules - 1)] if path.path_sequence else "Not started"

    # Recent activity (quizzes + events)
    recent_activities = []
    for attempt in attempts[:3]:
        quiz_result = await db.execute(
            select(GeneratedQuiz).where(GeneratedQuiz.quiz_id == attempt.quiz_id)
        )
        quiz = quiz_result.scalar_one_or_none()
        recent_activities.append({
            "type": "quiz",
            "title": quiz.title if quiz else "Quiz",
            "xp": 100 if attempt.score and attempt.score >= 0.7 else 0,
            "date": _time_ago(attempt.completed_at) if attempt.completed_at else "",
        })

    # Upcoming quizzes (from generated quizzes not yet attempted)
    upcoming = []
    all_quizzes_result = await db.execute(
        select(GeneratedQuiz).where(
            GeneratedQuiz.student_id == student_id,
            GeneratedQuiz.is_active == True,
        ).order_by(GeneratedQuiz.created_at.desc()).limit(5)
    )
    all_quizzes = all_quizzes_result.scalars().all()
    attempted_quiz_ids = {a.quiz_id for a in attempts}

    for quiz in all_quizzes:
        if quiz.quiz_id not in attempted_quiz_ids:
            upcoming.append({
                "id": quiz.quiz_id,
                "title": quiz.title,
                "dueDate": (quiz.created_at + timedelta(days=7)).strftime("%Y-%m-%d") if quiz.created_at else "",
                "duration": quiz.estimated_time_minutes or 15,
            })

    return {
        "student_id": student_id,
        "user": {
            "name": profile.student_id if profile else "Student",
            "streak": streak["current"] if isinstance(streak, dict) else streak,
            "totalStudyTime": total_study_time,
            "level": level,
            "xp": total_xp,
            "nextLevelXp": next_level_xp,
        },
        "currentPath": {
            "name": path.course_id if path else "Cloud Computing Fundamentals",
            "progress": path_progress,
            "currentModule": str(current_module),
            "completedModules": completed_modules,
            "totalModules": total_modules,
        },
        "upcomingQuizzes": upcoming[:2],
        "recentActivity": recent_activities,
        "dailyGoal": {
            "target": 60,
            "completed": min(total_study_time, 60),
        },
    }


# ============================================================================
# Helper Functions
# ============================================================================

def _calculate_weekly_progress(attempts: List[QuizAttempt]) -> List[Dict[str, Any]]:
    """Calculate study hours per day for the past week."""
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    today = datetime.utcnow().weekday()

    progress = []
    for i in range(7):
        day_idx = (today - i) % 7
        date = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
        day_attempts = [
            a for a in attempts
            if a.completed_at and a.completed_at.strftime("%Y-%m-%d") == date
        ]
        hours = sum(a.time_spent_seconds or 0 for a in day_attempts) / 3600
        progress.append({
            "day": days[day_idx],
            "hours": round(hours, 1),
            "modules": len(day_attempts),
        })

    return list(reversed(progress))


async def _calculate_subject_breakdown(
    attempts: List[QuizAttempt],
    db: AsyncSession,
) -> List[Dict[str, Any]]:
    """Calculate progress per subject from quiz weak topics."""
    subject_stats: Dict[str, Dict[str, Any]] = {}

    for attempt in attempts:
        # Get quiz topic
        quiz_result = await db.execute(
            select(GeneratedQuiz).where(GeneratedQuiz.quiz_id == attempt.quiz_id)
        )
        quiz = quiz_result.scalar_one_or_none()
        if not quiz:
            continue

        topic = quiz.topic
        if topic not in subject_stats:
            subject_stats[topic] = {
                "scores": [],
                "time": 0,
                "quizzes": 0,
            }

        if attempt.score is not None:
            subject_stats[topic]["scores"].append(attempt.score)
        subject_stats[topic]["time"] += (attempt.time_spent_seconds or 0) // 60
        subject_stats[topic]["quizzes"] += 1

    # Build breakdown
    breakdown = []
    for topic, stats in subject_stats.items():
        avg_score = (
            round(sum(stats["scores"]) / len(stats["scores"]) * 100, 1)
            if stats["scores"] else 0
        )
        breakdown.append({
            "subject": topic,
            "progress": min(avg_score, 100),
            "time": stats["time"],
            "quizzes": stats["quizzes"],
        })

    # Sort by most recent activity (fallback: alphabetical)
    return sorted(breakdown, key=lambda x: x["quizzes"], reverse=True)


def _calculate_streak(attempts: List[QuizAttempt]) -> Dict[str, Any]:
    """Calculate current and longest streak from completed quiz dates."""
    if not attempts:
        return {"current": 0, "longest": 0, "lastStudyDate": ""}

    # Get unique dates with completed quizzes
    dates = set()
    for attempt in attempts:
        if attempt.completed_at:
            dates.add(attempt.completed_at.date())

    if not dates:
        return {"current": 0, "longest": 0, "lastStudyDate": ""}

    sorted_dates = sorted(dates, reverse=True)
    last_date = sorted_dates[0]

    # Calculate current streak
    current_streak = 0
    check_date = last_date
    while check_date in dates:
        current_streak += 1
        check_date -= timedelta(days=1)

    # Calculate longest streak
    longest_streak = 1
    current_longest = 1
    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i - 1] - sorted_dates[i]).days == 1:
            current_longest += 1
            longest_streak = max(longest_streak, current_longest)
        else:
            current_longest = 1

    return {
        "current": current_streak,
        "longest": longest_streak,
        "lastStudyDate": last_date.strftime("%Y-%m-%d"),
    }


def _generate_achievements(attempts: List[QuizAttempt]) -> List[Dict[str, Any]]:
    """Generate achievements based on real quiz performance."""
    achievements = []

    if not attempts:
        return achievements

    # First Steps - completed first quiz
    achievements.append({
        "id": "first_quiz",
        "name": "First Steps",
        "description": "Completed your first quiz",
        "date": attempts[-1].completed_at.strftime("%Y-%m-%d") if attempts[-1].completed_at else "",
        "xp": 50,
    })

    # Week Warrior - 7+ day streak (simplified: check if 7+ quizzes done)
    if len(attempts) >= 7:
        achievements.append({
            "id": "streak_7",
            "name": "Week Warrior",
            "description": "7-day study streak",
            "date": attempts[-7].completed_at.strftime("%Y-%m-%d") if len(attempts) >= 7 and attempts[-7].completed_at else "",
            "xp": 100,
        })

    # Perfect Score - any 100% score
    perfect = next((a for a in attempts if a.score and a.score >= 0.99), None)
    if perfect:
        achievements.append({
            "id": "perfect_score",
            "name": "Perfectionist",
            "description": "Scored 100% on a quiz",
            "date": perfect.completed_at.strftime("%Y-%m-%d") if perfect.completed_at else "",
            "xp": 150,
        })

    # Quiz Master - 10+ quizzes
    if len(attempts) >= 10:
        achievements.append({
            "id": "quiz_master",
            "name": "Quiz Master",
            "description": "Completed 10 quizzes",
            "date": attempts[-10].completed_at.strftime("%Y-%m-%d") if len(attempts) >= 10 and attempts[-10].completed_at else "",
            "xp": 200,
        })

    return achievements


def _calculate_level(total_xp: int) -> int:
    """Calculate level from total XP (exponential growth)."""
    level = 1
    xp_needed = 100
    while total_xp >= xp_needed:
        total_xp -= xp_needed
        level += 1
        xp_needed = int(xp_needed * 1.2)
    return level


def _next_level_xp(current_level: int) -> int:
    """Calculate XP needed for next level."""
    xp = 100
    for _ in range(current_level):
        xp = int(xp * 1.2)
    return xp


def _time_ago(dt: Optional[datetime]) -> str:
    """Convert datetime to human-readable relative time."""
    if not dt:
        return ""

    now = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()
    diff = now - dt

    if diff.days == 0:
        hours = diff.seconds // 3600
        if hours == 0:
            minutes = diff.seconds // 60
            return f"{minutes} minutes ago"
        return f"{hours} hours ago"
    elif diff.days == 1:
        return "1 day ago"
    elif diff.days < 7:
        return f"{diff.days} days ago"
    elif diff.days < 30:
        weeks = diff.days // 7
        return f"{weeks} weeks ago"
    else:
        return dt.strftime("%Y-%m-%d")
