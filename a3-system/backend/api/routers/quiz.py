"""
Quiz API Router for A3 Learning System.

Endpoints:
- POST /api/quiz/generate : Generate a new adaptive quiz
- GET /api/quiz : List student's generated quizzes
- GET /api/quiz/{quiz_id} : Get a specific quiz
- POST /api/quiz/{quiz_id}/start : Start a quiz attempt
- POST /api/quiz/{quiz_id}/submit : Submit quiz answers
- GET /api/quiz/{quiz_id}/results : Get quiz results
- GET /api/quiz/stats : Get quiz statistics
"""

import asyncio
import json as json_module
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.evaluator_agent import EvaluatorAgent
from agents.orchestrator import Orchestrator
from agents.quiz_agent import QuizAgent
from agents.short_answer_grader import ShortAnswerGrader
from core.auth import get_current_user
from core.llm_client import llm_client
from core.logging import get_logger
from models.database import (
    GeneratedQuiz,
    GeneratedResource,
    MilestoneProgress,
    QuizAttempt,
    StudentProfile,
    get_db,
)
from models.schemas import (
    GenerateQuizRequest,
    QuizAnswerSubmission,
    QuizSubmissionRequest,
)

logger = get_logger(__name__)
router = APIRouter()


def topic_to_milestone_id(topic: str) -> str:
    """Derive the milestone id the frontend/gate uses from a topic title.

    Must match the frontend slug: collapse whitespace runs to a single
    underscore and lowercase (see notebook/page.tsx currentMilestoneId).
    """
    return re.sub(r"\s+", "_", topic or "").lower()


async def persist_milestone_progress(
    db: AsyncSession,
    student_id: str,
    topic: str,
    score: float,
    outcome: str,
) -> None:
    """Record the quiz result against the student's milestone progress.

    On a passing outcome (accelerate/continue) the milestone is marked
    completed so the learning path can advance to the next milestone.
    """
    milestone_id = topic_to_milestone_id(topic)
    try:
        result = await db.execute(
            select(MilestoneProgress)
            .where(
                MilestoneProgress.student_id == student_id,
                MilestoneProgress.milestone_id == milestone_id,
            )
            .order_by(MilestoneProgress.updated_at.desc())
            .limit(1)
        )
        progress = result.scalars().first()
        if not progress:
            progress = MilestoneProgress(
                student_id=student_id,
                milestone_id=milestone_id,
                status="in_progress",
            )
            db.add(progress)

        progress.quiz_score = score
        progress.quiz_outcome = outcome
        progress.attempt_count = (progress.attempt_count or 0) + 1

        if outcome in ("accelerate", "continue"):
            progress.status = "completed"
            progress.completed_at = datetime.utcnow()
            progress.consecutive_low_scores = 0
        else:
            progress.consecutive_low_scores = (progress.consecutive_low_scores or 0) + 1

        await db.commit()
    except Exception as exc:
        logger.error(f"Failed to persist milestone progress for {milestone_id}: {exc}")
        await db.rollback()


async def generate_remedial_resources(
    student_id: str,
    topic: str,
    weak_topics: List[str],
    regen_profile: Dict[str, Any],
    outcome: str,
) -> None:
    """Generate and persist remedial resources after a failed quiz.

    Runs as a FastAPI background task with its own DB session so the quiz
    submit response can return immediately instead of blocking on several
    LLM calls.
    """
    from models.database import db_manager

    type_map = {
        "content": "notes",
        "mindmap": "mindmap",
        "quiz": "quiz",
        "media": "video",
        "code": "code",
    }
    try:
        agents = (
            ["content", "quiz", "mindmap", "media", "code"]
            if outcome == "replan"
            else ["content", "quiz", "mindmap"]
        )
        context = (
            f"TARGETED REMEDIATION for: {topic}\n\n"
            f"STUDENT WEAK CONCEPTS: {', '.join(weak_topics)}\n\n"
            "Generate simpler explanations with more examples."
        )

        orchestrator = Orchestrator(llm_client)
        regen_result = await orchestrator.generate_resources(
            topic=topic,
            profile=regen_profile,
            context=context,
            agent_selection=agents,
            agent_kwargs={
                "complexity_override": "simpler",
                "focus_concepts": weak_topics,
            },
        )

        saved_resources = []
        async with await db_manager.get_async_session() as session:
            for agent_name, resource_content in regen_result.get("resources", {}).items():
                if not resource_content:
                    continue
                resource_type = type_map.get(agent_name, agent_name)
                session.add(
                    GeneratedResource(
                        student_id=student_id,
                        topic=topic,
                        resource_type=resource_type,
                        content=resource_content
                        if isinstance(resource_content, dict)
                        else {"data": resource_content},
                        source="remedial",
                        weak_concepts_targeted=weak_topics,
                        is_remedial=True,
                        consumed=False,
                    )
                )
                saved_resources.append(resource_type)
            await session.commit()

        logger.info(
            f"[background] Remedial resources generated for {student_id} / {topic}: {saved_resources}"
        )
    except Exception as exc:
        logger.error(f"[background] Remedial generation failed for {topic}: {exc}")


@router.post("/generate")
async def generate_quiz(
    request: GenerateQuizRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a new adaptive quiz using QuizAgent.

    If a similar quiz exists for this student (same topic/node within 7 days),
    return the existing quiz instead of generating a new one.
    """
    # Override request student_id with authenticated user
    request.student_id = current_user
    logger.info(f"Generating quiz for student {request.student_id}, topic: {request.topic}")

    # Check for existing quiz within last 7 days (deduplication)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    existing_query = select(GeneratedQuiz).where(
        GeneratedQuiz.student_id == request.student_id,
        GeneratedQuiz.topic == request.topic,
        GeneratedQuiz.created_at >= seven_days_ago
    )
    if request.node_id:
        existing_query = existing_query.where(GeneratedQuiz.node_id == request.node_id)

    result = await db.execute(existing_query)
    existing_quiz = result.scalar_one_or_none()

    if existing_quiz:
        logger.info(f"Returning existing quiz {existing_quiz.quiz_id} (deduplication)")
        return {
            "quiz_id": existing_quiz.quiz_id,
            "title": existing_quiz.title,
            "description": existing_quiz.description,
            "topic": existing_quiz.topic,
            "difficulty": existing_quiz.difficulty,
            "num_questions": existing_quiz.num_questions,
            "estimated_time_minutes": existing_quiz.estimated_time_minutes,
            "total_points": existing_quiz.total_points,
            "created_at": existing_quiz.created_at.isoformat(),
            "is_existing": True,
            "message": "Returning existing quiz from the past 7 days",
        }

    # Fetch student profile for personalization
    profile_result = await db.execute(
        select(StudentProfile).where(StudentProfile.student_id == request.student_id)
    )
    profile = profile_result.scalar_one_or_none()

    if not profile:
        # Create default profile if not exists
        profile_data = {
            "knowledge_base": {},
            "cognitive_style": "mixed",
            "learning_pace": 0.5,
            "weak_points": [],
            "goals": [],
        }
    else:
        profile_data = {
            "knowledge_base": profile.knowledge_base or {},
            "cognitive_style": profile.cognitive_style or "mixed",
            "learning_pace": profile.learning_pace or 0.5,
            "weak_points": profile.weak_points or [],
            "goals": profile.goals or [],
        }

    # Determine complexity level and question count
    complexity_level = request.complexity_level
    attempt_number = request.attempt_number

    # Map complexity to question count if not explicitly provided
    complexity_to_count = {
        "beginner": 5,
        "standard": 8,
        "complex": 10,
        "advanced": 12,
    }
    num_questions = request.num_questions or complexity_to_count.get(complexity_level, 8)

    # Generate quiz using QuizAgent
    quiz_agent = QuizAgent(llm_client)

    try:
        quiz_data = await quiz_agent.run(
            topic=request.topic,
            profile=profile_data,
            context=request.context,
            complexity_level=complexity_level,
            attempt_number=attempt_number,
            num_questions=num_questions,
            difficulty_override=request.difficulty,
        )
    except Exception as e:
        logger.error(f"Quiz generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate quiz: {str(e)}"
        )

    questions = quiz_data.get("questions", [])
    metadata = quiz_data.get("metadata", {})
    faithfulness = quiz_data.get("faithfulness", {})
    sources = quiz_data.get("sources", [])

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Quiz generation returned no questions"
        )

    # Validate and sanitize questions
    for idx, q in enumerate(questions):
        if not q.get("id"):
            q["id"] = f"q{idx + 1}"
        if not q.get("type"):
            q["type"] = "multiple_choice"
        if not q.get("options") or not isinstance(q.get("options"), list):
            if q.get("type") == "true_false":
                q["options"] = ["True", "False"]
            else:
                # Build basic options from correct_answer if available
                correct = q.get("correct_answer", "")
                q["options"] = ["A", "B", "C", "D"] if not correct else [correct, "Option B", "Option C", "Option D"]
        if not q.get("correct_answer"):
            # Fallback: assume first option is correct if no correct_answer given
            q["correct_answer"] = q.get("options", [""])[0]
        if not q.get("explanation"):
            q["explanation"] = ""

    # Create generated quiz in database
    metadata = quiz_data.get("metadata", {})
    new_quiz = GeneratedQuiz(
        student_id=request.student_id,
        node_id=request.node_id,
        title=f"Quiz: {request.topic}",
        description=f"Adaptive quiz on {request.topic}",
        topic=request.topic,
        difficulty=request.difficulty or metadata.get("difficulty", 0.5),
        num_questions=len(questions),
        questions=questions,
        weak_points_focus=metadata.get("focus_areas", profile_data["weak_points"]),
        estimated_time_minutes=metadata.get("estimated_time", 15),
        total_points=100,
        complexity_level=complexity_level,
        attempt_number=attempt_number,
        has_coding=metadata.get("has_coding", False),
        concept_tags=metadata.get("concept_tags", []),
        # Store faithfulness metadata (as JSON in a new field or as part of questions)
        # For now, we'll return it in the response but not store it in DB
    )

    db.add(new_quiz)
    await db.commit()
    await db.refresh(new_quiz)

    logger.info(f"Generated quiz {new_quiz.quiz_id} with {len(questions)} questions (complexity: {complexity_level}, attempt: {attempt_number})")

    return {
        "quiz_id": new_quiz.quiz_id,
        "title": new_quiz.title,
        "description": new_quiz.description,
        "topic": new_quiz.topic,
        "difficulty": new_quiz.difficulty,
        "complexity_level": new_quiz.complexity_level,
        "attempt_number": new_quiz.attempt_number,
        "num_questions": new_quiz.num_questions,
        "estimated_time_minutes": new_quiz.estimated_time_minutes,
        "total_points": new_quiz.total_points,
        "created_at": new_quiz.created_at.isoformat(),
        "is_existing": False,
        "message": "New quiz generated",
        "faithfulness": faithfulness,
        "sources": sources,
    }


@router.post("/generate/stream")
async def generate_quiz_stream(
    request: GenerateQuizRequest,
    current_user: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream quiz generation via SSE.

    Yields events:
      data: {"event":"question","index":0,"question":{...}}
      data: {"event":"complete","quiz_id":"...","num_questions":5}
    """
    # Override request student_id with authenticated user
    request.student_id = current_user
    logger.info(f"Streaming quiz for student {request.student_id}, topic: {request.topic}")

    # Check for existing quiz (same dedup as non-streaming)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    existing_query = select(GeneratedQuiz).where(
        GeneratedQuiz.student_id == request.student_id,
        GeneratedQuiz.topic == request.topic,
        GeneratedQuiz.created_at >= seven_days_ago,
    )
    if request.node_id:
        existing_query = existing_query.where(GeneratedQuiz.node_id == request.node_id)

    result = await db.execute(existing_query)
    existing_quiz = result.scalar_one_or_none()

    if existing_quiz:
        # Return cached quiz as a single event
        async def _cached():
            yield f"data: {json_module.dumps({'event': 'complete', 'quiz_id': existing_quiz.quiz_id, 'num_questions': existing_quiz.num_questions, 'is_existing': True})}\n\n"

        return StreamingResponse(
            _cached(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
        )

    # Fetch student profile
    profile_result = await db.execute(
        select(StudentProfile).where(StudentProfile.student_id == request.student_id)
    )
    profile = profile_result.scalar_one_or_none()

    if not profile:
        profile_data = {
            "knowledge_base": {},
            "cognitive_style": "mixed",
            "learning_pace": 0.5,
            "weak_points": [],
            "goals": [],
        }
    else:
        profile_data = {
            "knowledge_base": profile.knowledge_base or {},
            "cognitive_style": profile.cognitive_style or "mixed",
            "learning_pace": profile.learning_pace or 0.5,
            "weak_points": profile.weak_points or [],
            "goals": profile.goals or [],
        }

    complexity_level = request.complexity_level
    attempt_number = request.attempt_number
    complexity_to_count = {"beginner": 5, "standard": 8, "complex": 10, "advanced": 12}
    num_questions = request.num_questions or complexity_to_count.get(complexity_level, 8)

    quiz_agent = QuizAgent(llm_client)

    # Capture DB session reference for use inside the generator
    _db = db
    _request = request
    _profile_data = profile_data

    async def event_generator():
        all_questions: List[Dict[str, Any]] = []
        metadata: Dict[str, Any] = {}
        faithfulness_data: Dict[str, Any] = {}

        try:
            async for event in quiz_agent.run_stream(
                topic=_request.topic,
                profile=_profile_data,
                node_id=_request.node_id or "",
                complexity_level=complexity_level,
                attempt_number=attempt_number,
                num_questions=num_questions,
                difficulty_override=_request.difficulty,
            ):
                if event["event"] == "question":
                    yield f"data: {json_module.dumps(event)}\n\n"
                elif event["event"] == "complete":
                    all_questions = event["questions"]
                    metadata = event.get("metadata", {})
                    faithfulness_data = event.get("faithfulness", {})

            # Validate and sanitize questions (same as non-streaming)
            for idx, q in enumerate(all_questions):
                if not q.get("id"):
                    q["id"] = f"q{idx + 1}"
                if not q.get("type"):
                    q["type"] = "multiple_choice"
                if not q.get("options") or not isinstance(q.get("options"), list):
                    if q.get("type") == "true_false":
                        q["options"] = ["True", "False"]
                    else:
                        correct = q.get("correct_answer", "")
                        q["options"] = ["A", "B", "C", "D"] if not correct else [correct, "Option B", "Option C", "Option D"]
                if not q.get("correct_answer"):
                    q["correct_answer"] = q.get("options", [""])[0]
                if not q.get("explanation"):
                    q["explanation"] = ""

            # Save to database
            new_quiz = GeneratedQuiz(
                student_id=_request.student_id,
                node_id=_request.node_id,
                title=f"Quiz: {_request.topic}",
                description=f"Adaptive quiz on {_request.topic}",
                topic=_request.topic,
                difficulty=_request.difficulty or metadata.get("difficulty", 0.5),
                num_questions=len(all_questions),
                questions=all_questions,
                weak_points_focus=metadata.get("focus_areas", _profile_data["weak_points"]),
                estimated_time_minutes=metadata.get("estimated_time", 15),
                total_points=100,
                complexity_level=complexity_level,
                attempt_number=attempt_number,
                has_coding=metadata.get("has_coding", False),
                concept_tags=metadata.get("concept_tags", []),
            )

            _db.add(new_quiz)
            await _db.commit()
            await _db.refresh(new_quiz)

            logger.info(f"Streamed quiz {new_quiz.quiz_id} with {len(all_questions)} questions")

            yield f"data: {json_module.dumps({'event': 'complete', 'quiz_id': new_quiz.quiz_id, 'num_questions': len(all_questions), 'is_existing': False})}\n\n"

        except Exception as e:
            logger.error(f"Streaming quiz generation failed: {e}")
            yield f"data: {json_module.dumps({'event': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.get("")
async def list_quizzes(
    student_id: str = Depends(get_current_user),
    include_inactive: bool = Query(False, description="Include inactive quizzes"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List all generated quizzes for a student."""
    logger.info(f"Listing quizzes for student {student_id}")

    query = select(GeneratedQuiz).where(
        GeneratedQuiz.student_id == student_id
    )

    if not include_inactive:
        query = query.where(GeneratedQuiz.is_active == True)

    query = query.order_by(GeneratedQuiz.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    quizzes = result.scalars().all()

    # Get total count
    count_query = select(func.count()).select_from(GeneratedQuiz).where(
        GeneratedQuiz.student_id == student_id
    )
    if not include_inactive:
        count_query = count_query.where(GeneratedQuiz.is_active == True)
    count_result = await db.execute(count_query)
    total = count_result.scalar()

    return {
        "quizzes": [
            {
                "quiz_id": q.quiz_id,
                "title": q.title,
                "description": q.description,
                "topic": q.topic,
                "difficulty": q.difficulty,
                "num_questions": q.num_questions,
                "estimated_time_minutes": q.estimated_time_minutes,
                "total_points": q.total_points,
                "created_at": q.created_at.isoformat(),
                "is_active": q.is_active,
            }
            for q in quizzes
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/stats")
async def get_quiz_stats(
    student_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get quiz statistics for a student."""
    logger.info(f"Fetching quiz stats for student: {student_id}")

    # Count generated quizzes
    quiz_count_query = select(func.count()).select_from(GeneratedQuiz).where(
        GeneratedQuiz.student_id == student_id,
        GeneratedQuiz.is_active == True
    )
    quiz_count_result = await db.execute(quiz_count_query)
    total_quizzes = quiz_count_result.scalar()

    # Count attempts and calculate average score
    attempts_query = select(QuizAttempt).where(
        QuizAttempt.student_id == student_id
    )
    attempts_result = await db.execute(attempts_query)
    attempts = attempts_result.scalars().all()

    completed_attempts = [a for a in attempts if a.score is not None]
    completed_count = len(completed_attempts)
    avg_score = sum(a.score for a in completed_attempts) / completed_count if completed_count > 0 else 0
    total_xp = sum(100 for a in completed_attempts if a.score >= 0.7)  # XP for passing

    # Calculate streak (simplified - consecutive days with quiz attempts)
    streak = 0  # TODO: Implement proper streak calculation

    return {
        "total_quizzes": total_quizzes,
        "completed_quizzes": completed_count,
        "average_score": round(avg_score * 100, 1),
        "total_xp": total_xp,
        "streak": streak,
    }


@router.get("/{quiz_id}")
async def get_quiz(
    quiz_id: str,
    include_answers: bool = Query(False, description="Include correct answers (for review)"),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific quiz by ID."""
    logger.info(f"Fetching quiz: {quiz_id}")

    result = await db.execute(
        select(GeneratedQuiz).where(GeneratedQuiz.quiz_id == quiz_id)
    )
    quiz = result.scalar_one_or_none()

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz {quiz_id} not found"
        )

    questions = quiz.questions or []

    # Filter out correct answers unless requested
    if not include_answers:
        questions = [
            {
                "id": q.get("id"),
                "type": q.get("type"),
                "question": q.get("question"),
                "options": q.get("options"),
                "difficulty": q.get("difficulty"),
                "topic_tested": q.get("topic_tested"),
                "hints": q.get("hints", []),
            }
            for q in questions
        ]

    return {
        "quiz_id": quiz.quiz_id,
        "title": quiz.title,
        "description": quiz.description,
        "topic": quiz.topic,
        "difficulty": quiz.difficulty,
        "num_questions": quiz.num_questions,
        "questions": questions,
        "estimated_time_minutes": quiz.estimated_time_minutes,
        "total_points": quiz.total_points,
        "weak_points_focus": quiz.weak_points_focus,
        "created_at": quiz.created_at.isoformat(),
    }


@router.post("/{quiz_id}/start")
async def start_quiz(
    quiz_id: str,
    student_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a quiz attempt."""
    logger.info(f"Student {student_id} starting quiz {quiz_id}")

    # Verify quiz exists
    quiz_result = await db.execute(
        select(GeneratedQuiz).where(GeneratedQuiz.quiz_id == quiz_id)
    )
    quiz = quiz_result.scalar_one_or_none()

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz {quiz_id} not found"
        )

    # Create attempt
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        student_id=student_id,
        total_questions=quiz.num_questions,
    )

    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    # Return questions without answers
    questions = [
        {
            "id": q.get("id"),
            "type": q.get("type"),
            "question": q.get("question"),
            "options": q.get("options"),
            "difficulty": q.get("difficulty"),
            "topic_tested": q.get("topic_tested"),
            "hints": q.get("hints", []),
        }
        for q in (quiz.questions or [])
    ]

    return {
        "attempt_id": attempt.attempt_id,
        "quiz_id": quiz_id,
        "student_id": student_id,
        "started_at": attempt.started_at.isoformat(),
        "questions": questions,
        "estimated_time_minutes": quiz.estimated_time_minutes,
    }


@router.post("/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: str,
    background_tasks: BackgroundTasks,
    student_id: str = Depends(get_current_user),
    submission: Optional[QuizSubmissionRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    """Submit quiz answers and grade."""
    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission body is required"
        )

    logger.info(f"Student {student_id} submitting quiz {quiz_id}")

    # Get quiz
    quiz_result = await db.execute(
        select(GeneratedQuiz).where(GeneratedQuiz.quiz_id == quiz_id)
    )
    quiz = quiz_result.scalar_one_or_none()

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz {quiz_id} not found"
        )

    # Get most recent incomplete attempt, or any attempt
    attempt_result = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.student_id == student_id,
            QuizAttempt.completed_at.is_(None)
        ).order_by(QuizAttempt.started_at.desc()).limit(1)
    )
    attempt = attempt_result.scalar_one_or_none()

    if not attempt:
        # Fallback: get most recent completed attempt
        attempt_result = await db.execute(
            select(QuizAttempt).where(
                QuizAttempt.quiz_id == quiz_id,
                QuizAttempt.student_id == student_id
            ).order_by(QuizAttempt.started_at.desc()).limit(1)
        )
        attempt = attempt_result.scalar_one_or_none()

    if not attempt:
        attempt = QuizAttempt(
            quiz_id=quiz_id,
            student_id=student_id,
            total_questions=quiz.num_questions,
        )
        db.add(attempt)

    # Grade answers
    questions = quiz.questions or []
    results = []
    weak_topics = []
    total_score = 0.0
    max_score = 0.0

    answer_map = {a.question_id: a for a in submission.answers}

    # Initialize short answer grader
    short_answer_grader = ShortAnswerGrader(llm_client)

    def _student_answer(answer_data: Any) -> str:
        if isinstance(answer_data, dict):
            return answer_data.get("answer", "") or ""
        return getattr(answer_data, "answer", "") or ""

    # Short-answer questions each need a (slow) LLM grading call. Grade them all
    # concurrently up front instead of sequentially in the loop below, so total
    # submission latency is ~one LLM call rather than the sum of them.
    short_answer_qs = [q for q in questions if q.get("type") == "short_answer"]
    short_answer_grades: Dict[Any, Dict[str, Any]] = {}
    if short_answer_qs:
        async def _grade_one(q: Dict[str, Any]) -> Dict[str, Any]:
            return await short_answer_grader.grade(
                question=q.get("question", ""),
                student_answer=_student_answer(answer_map.get(q.get("id"), {})),
                expected_concepts=q.get("expected_concepts", [q.get("topic_tested", "")]),
                correct_answer_notes=q.get("expected_response_guide", q.get("correct_answer", "") or ""),
            )

        grades = await asyncio.gather(*[_grade_one(q) for q in short_answer_qs])
        short_answer_grades = {q.get("id"): g for q, g in zip(short_answer_qs, grades)}

    for question in questions:
        qid = question.get("id")
        answer_data = answer_map.get(qid, {})
        if isinstance(answer_data, dict):
            student_answer = answer_data.get("answer", "")
            time_spent = answer_data.get("time_spent_seconds", 0)
        else:
            # Pydantic model
            student_answer = getattr(answer_data, "answer", "") or ""
            time_spent = getattr(answer_data, "time_spent_seconds", 0) or 0
        correct_answer = question.get("correct_answer", "")
        question_type = question.get("type", "multiple_choice")
        weight = question.get("weight", 1.0)

        max_score += weight

        result = {
            "question_id": qid,
            "question": question.get("question"),
            "question_type": question_type,
            "your_answer": student_answer,
            "correct_answer": correct_answer,
            "weight": weight,
            "explanation": question.get("explanation", ""),
            "concept_tag": question.get("concept_tag", question.get("topic_tested", "")),
            "is_critical": question.get("is_critical", False),
            "time_spent_seconds": time_spent,
        }

        # Grade based on question type
        if question_type == "short_answer":
            # Use the result graded concurrently above (falls back to a direct
            # call if somehow missing, e.g. duplicate question ids).
            grading_result = short_answer_grades.get(qid)
            if grading_result is None:
                grading_result = await short_answer_grader.grade(
                    question=question.get("question", ""),
                    student_answer=student_answer,
                    expected_concepts=question.get("expected_concepts", [question.get("topic_tested", "")]),
                    correct_answer_notes=question.get("expected_response_guide", correct_answer or ""),
                )
            question_score = grading_result["score"] * weight
            result["score"] = grading_result["score"]
            result["max_score"] = grading_result["max_score"]
            result["grade_label"] = grading_result["grade_label"]
            result["feedback"] = grading_result["feedback"]
            result["model_answer_hint"] = grading_result["model_answer_hint"]
            result["concepts_demonstrated"] = grading_result["concepts_demonstrated"]
            result["concepts_missing"] = grading_result["concepts_missing"]
            result["correct"] = grading_result["score"] >= 0.6  # Pass threshold for short answer
            total_score += question_score

            # Track weak topics if score is low
            if grading_result["score"] < 0.6:
                topic = question.get("topic_tested", "")
                if topic:
                    weak_topics.append(topic)

        elif question_type == "true_false":
            # Check answer and justification
            answer_correct = student_answer.strip().lower() == correct_answer.strip().lower()

            # Extract justification from either dict or Pydantic model
            if isinstance(answer_data, dict):
                justification = answer_data.get("justification", "")
            else:
                justification = getattr(answer_data, "justification", "") or ""

            has_justification = len(justification.strip()) > 10

            if answer_correct and has_justification:
                question_score = 1.0 * weight
                result["correct"] = True
            elif answer_correct:
                question_score = 0.5 * weight  # Partial credit for correct answer without justification
                result["correct"] = False
                result["partial_credit"] = True
            else:
                question_score = 0.0
                result["correct"] = False

            result["score"] = question_score / weight if weight > 0 else 0
            result["justification"] = justification
            total_score += question_score

            if not answer_correct:
                topic = question.get("topic_tested", "")
                if topic:
                    weak_topics.append(topic)

        else:
            # MCQ and scenario-based: binary grading
            is_correct = student_answer.strip().lower() == correct_answer.strip().lower()
            if is_correct:
                question_score = 1.0 * weight
                result["correct"] = True
                result["score"] = 1.0
            else:
                question_score = 0.0
                result["correct"] = False
                result["score"] = 0.0
                # Track weak topics
                topic = question.get("topic_tested", "")
                if topic:
                    weak_topics.append(topic)

            total_score += question_score

        results.append(result)

    # Calculate final score
    score = round(total_score / max_score, 4) if max_score > 0 else 0
    correct = sum(1 for r in results if r.get("correct"))
    passed = score >= 0.6  # 60% passing threshold (can be adjusted)

    # Calculate expected time (90 seconds per question default)
    expected_time = quiz.estimated_time_minutes * 60 if quiz.estimated_time_minutes else len(questions) * 90
    time_taken = submission.time_taken if submission else 0

    # Check if rushed through (finished much faster than expected)
    rushed_through = time_taken < expected_time * 0.5

    # Update basic attempt info before evaluation
    attempt.score = score
    attempt.correct_count = correct
    attempt.total_questions = len(questions)
    attempt.answers = results
    attempt.weak_topics = list(set(weak_topics))
    attempt.time_spent_seconds = time_taken
    attempt.completed_at = datetime.utcnow()
    attempt.rushed_through = rushed_through

    await db.commit()
    await db.refresh(attempt)

    # Count consecutive low scores for this student on this milestone/topic
    consecutive_low = 0
    try:
        # Build filter for same milestone/topic
        past_attempts_filter = [
            QuizAttempt.student_id == student_id,
            QuizAttempt.completed_at.isnot(None),
            QuizAttempt.attempt_id != attempt.attempt_id
        ]

        # Filter by node_id if available, otherwise by quiz topic via join
        if quiz.node_id:
            # Get attempt IDs for quizzes on the same node
            same_node_quiz_ids_result = await db.execute(
                select(GeneratedQuiz.quiz_id).where(
                    GeneratedQuiz.student_id == student_id,
                    GeneratedQuiz.node_id == quiz.node_id
                )
            )
            same_node_quiz_ids = [r[0] for r in same_node_quiz_ids_result.all()]
            if same_node_quiz_ids:
                past_attempts_filter.append(QuizAttempt.quiz_id.in_(same_node_quiz_ids))

        past_attempts_result = await db.execute(
            select(QuizAttempt).where(*past_attempts_filter)
            .order_by(QuizAttempt.completed_at.desc())
            .limit(3)
        )
        past_attempts = past_attempts_result.scalars().all()
        for past in past_attempts:
            if past.score and past.score < 0.6:
                consecutive_low += 1
            else:
                break
    except Exception as e:
        logger.warning(f"Could not fetch past attempts: {e}")

    # Build answers list for evaluator
    eval_answers = []
    for result in results:
        eval_answers.append({
            "question_id": result["question_id"],
            "is_correct": result.get("correct", False),
            "score": result.get("score", 0),
            "time_spent_seconds": result.get("time_spent_seconds", 0),
            "concept_tag": result.get("concept_tag", ""),
        })

    # Get resource engagement data from student profile
    resource_engagement = {}
    profile = None  # Initialize profile to avoid undefined variable
    try:
        profile_result = await db.execute(
            select(StudentProfile).where(StudentProfile.student_id == student_id)
        )
        profile = profile_result.scalar_one_or_none()
        if profile and profile.knowledge_base:
            resource_engagement = profile.knowledge_base.get("resource_engagement", {})
    except Exception as e:
        logger.warning(f"Could not fetch profile: {e}")

    # Run evaluator agent
    evaluator = EvaluatorAgent(llm_client)
    try:
        evaluation = await evaluator.evaluate(
            student_id=student_id,
            milestone_id=quiz.node_id or quiz.topic,
            quiz_id=quiz_id,
            answers=eval_answers,
            score_percentage=score,
            time_taken_seconds=time_taken,
            expected_time_seconds=expected_time,
            consecutive_low_scores=consecutive_low,
            rushed_through=rushed_through,
            resource_engagement=resource_engagement
        )

        # Store evaluation results
        outcome = evaluation["decision"]["outcome"]
        attempt.outcome = outcome
        attempt.critical_concepts_failed = evaluation.get("concept_analysis", [])
        attempt.rushed_through = rushed_through

        # Update student profile based on evaluation
        if profile and evaluation.get("profile_updates"):
            profile_updates = evaluation["profile_updates"]

            # Update weak_points
            current_weak = set(profile.weak_points or [])
            weak_add = set(profile_updates.get("weak_points_add", []))
            weak_resolve = set(profile_updates.get("weak_points_resolve", []))
            profile.weak_points = list((current_weak | weak_add) - weak_resolve)

            # Update knowledge_base
            if profile.knowledge_base is None:
                profile.knowledge_base = {}
            kb_updates = profile_updates.get("knowledge_base_updates", {})
            for topic, mastery in kb_updates.items():
                profile.knowledge_base[topic] = mastery

            # Update learning_pace
            pace_adj = profile_updates.get("pace_adjustment", 0)
            if profile.learning_pace:
                profile.learning_pace = max(0.1, min(1.0, profile.learning_pace + pace_adj))

            # Update confidence score if tracked
            conf_delta = profile_updates.get("confidence_delta", 0)
            if "confidence" in profile.knowledge_base:
                profile.knowledge_base["confidence"] = max(0.0, min(1.0,
                    profile.knowledge_base.get("confidence", 0.5) + conf_delta))

        await db.commit()
        await db.refresh(attempt)

        # Persist milestone progress so a pass advances the learning path
        # and a fail is recorded against the milestone.
        await persist_milestone_progress(db, student_id, quiz.topic, score, outcome)

        # Schedule resource regeneration for remediate/replan outcomes as a
        # background task so the response returns immediately instead of
        # blocking the student on several LLM calls.
        regenerated = None
        if outcome in ["remediate", "replan"]:
            regen_profile = {
                "knowledge_base": profile.knowledge_base or {} if profile else {},
                "cognitive_style": profile.cognitive_style or "mixed" if profile else "mixed",
                "learning_pace": profile.learning_pace or 0.5 if profile else 0.5,
                "weak_points": attempt.weak_topics or [],
                "content_preferences": profile.content_preferences or [] if profile else [],
            }
            expected_types = (
                ["notes", "quiz", "mindmap", "video", "code"]
                if outcome == "replan"
                else ["notes", "quiz", "mindmap"]
            )
            background_tasks.add_task(
                generate_remedial_resources,
                student_id,
                quiz.topic,
                attempt.weak_topics or [],
                regen_profile,
                outcome,
            )
            regenerated = {
                "success": True,
                "status": "generating",
                "resource_types": expected_types,
                "target_concepts": attempt.weak_topics or [],
            }
            logger.info(f"Scheduled remedial regeneration for {quiz_id}: {expected_types}")

        # Build response with evaluation
        response = {
            "attempt_id": attempt.attempt_id,
            "quiz_id": quiz_id,
            "student_id": student_id,
            "score": round(score * 100, 1),  # Return as percentage
            "total_score": round(total_score, 2),
            "max_score": round(max_score, 2),
            "correct": correct,
            "total": len(questions),
            "passed": passed,
            "outcome": outcome,
            "next_milestone_unlocked": evaluation["decision"].get("next_milestone_unlocked", passed),
            "student_message": evaluation.get("student_message", {}),
            "concept_analysis": evaluation.get("concept_analysis", []),
            "regeneration_instructions": evaluation.get("regeneration_instructions", {}),
            "regenerated_resources": regenerated,
            "xp_earned": 100 if passed else 0,
            "time_taken": time_taken,
            "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
            "results": results,
            "weak_topics": attempt.weak_topics,
        }

        return response

    except Exception as e:
        logger.error(f"Evaluator failed: {e}")
        # Fallback to simple response without evaluation
        fallback_outcome = "continue" if passed else "remediate"
        attempt.outcome = fallback_outcome
        attempt.rushed_through = rushed_through
        await db.commit()
        await db.refresh(attempt)

        # Persist milestone progress even when the evaluator agent failed.
        await persist_milestone_progress(db, student_id, quiz.topic, score, fallback_outcome)

        return {
            "attempt_id": attempt.attempt_id,
            "quiz_id": quiz_id,
            "student_id": student_id,
            "score": round(score * 100, 1),
            "total_score": round(total_score, 2),
            "max_score": round(max_score, 2),
            "correct": correct,
            "total": len(questions),
            "passed": passed,
            "outcome": fallback_outcome,
            "next_milestone_unlocked": passed,
            "student_message": {
                "tone": "neutral",
                "message": f"Quiz completed with {round(score * 100)}%"
            },
            "xp_earned": 100 if passed else 0,
            "time_taken": time_taken,
            "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
            "results": results,
            "weak_topics": attempt.weak_topics,
        }


@router.get("/{quiz_id}/results")
async def get_quiz_results(
    quiz_id: str,
    student_id: str,
    attempt_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get quiz results for a student."""
    logger.info(f"Fetching results for quiz {quiz_id}, student {student_id}")

    # Get specific attempt or latest
    if attempt_id:
        attempt_result = await db.execute(
            select(QuizAttempt).where(QuizAttempt.attempt_id == attempt_id)
        )
    else:
        attempt_result = await db.execute(
            select(QuizAttempt).where(
                QuizAttempt.quiz_id == quiz_id,
                QuizAttempt.student_id == student_id
            ).order_by(QuizAttempt.started_at.desc()).limit(1)
        )

    # A student can have multiple attempts at the same quiz (e.g. fail then
    # retake), so take the most recent one rather than requiring exactly one.
    attempt = attempt_result.scalars().first()

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No attempt found for this quiz"
        )

    # Get quiz for additional context
    quiz_result = await db.execute(
        select(GeneratedQuiz).where(GeneratedQuiz.quiz_id == quiz_id)
    )
    quiz = quiz_result.scalar_one_or_none()

    return {
        "attempt_id": attempt.attempt_id,
        "quiz_id": quiz_id,
        "student_id": student_id,
        "title": quiz.title if quiz else "Unknown Quiz",
        "topic": quiz.topic if quiz else "Unknown",
        "score": round(attempt.score * 100, 1) if attempt.score else 0,
        "correct": attempt.correct_count,
        "total": attempt.total_questions,
        "passed": attempt.score >= 0.6 if attempt.score else False,
        "outcome": attempt.outcome,
        "next_milestone_unlocked": attempt.outcome in ["accelerate", "continue"] if attempt.outcome else (attempt.score >= 0.6 if attempt.score else False),
        "student_message": attempt.answers.get("student_message") if isinstance(attempt.answers, dict) else None,
        "concept_analysis": attempt.critical_concepts_failed if attempt.critical_concepts_failed else [],
        "xp_earned": 100 if (attempt.score and attempt.score >= 0.6) else 0,
        "time_taken": attempt.time_spent_seconds,
        "rushed_through": attempt.rushed_through,
        "started_at": attempt.started_at.isoformat(),
        "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
        "answers": attempt.answers,
        "weak_topics": attempt.weak_topics,
    }


@router.post("/{quiz_id}/regenerate")
async def regenerate_resources_after_quiz(
    quiz_id: str,
    student_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger targeted resource regeneration after quiz evaluation.

    Uses the most recent quiz attempt's evaluation to generate
    new resources focused on weak concepts.
    """
    logger.info(f"Regenerating resources for quiz {quiz_id}, student {student_id}")

    # Get latest attempt (a student may have several attempts at one quiz)
    attempt_result = await db.execute(
        select(QuizAttempt).where(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.student_id == student_id
        ).order_by(QuizAttempt.started_at.desc()).limit(1)
    )
    attempt = attempt_result.scalars().first()

    if not attempt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No attempt found for this quiz"
        )

    if attempt.outcome not in ["remediate", "replan"]:
        return {
            "regenerated": False,
            "reason": f"Outcome is '{attempt.outcome}' — no regeneration needed",
            "outcome": attempt.outcome,
        }

    # Get quiz for topic info
    quiz_result = await db.execute(
        select(GeneratedQuiz).where(GeneratedQuiz.quiz_id == quiz_id)
    )
    quiz = quiz_result.scalar_one_or_none()

    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )

    # Get student profile
    profile_result = await db.execute(
        select(StudentProfile).where(StudentProfile.student_id == student_id)
    )
    profile = profile_result.scalar_one_or_none()

    profile_data = {
        "knowledge_base": profile.knowledge_base or {} if profile else {},
        "cognitive_style": profile.cognitive_style or "mixed" if profile else "mixed",
        "learning_pace": profile.learning_pace or 0.5 if profile else 0.5,
        "weak_points": attempt.weak_topics or [],
        "content_preferences": profile.content_preferences or [] if profile else [],
    }

    # Build targeted context from evaluation
    target_concepts = attempt.weak_topics or []
    evaluation = attempt.answers or {}

    # Determine agent selection based on outcome
    if attempt.outcome == "replan":
        # Full milestone regeneration — run all agents
        agents = ["content", "quiz", "mindmap", "media", "code"]
        complexity = "simpler"
    else:
        # Targeted remediation — focus on weak concepts
        agents = ["content", "quiz", "mindmap"]
        # Add code agent if coding was weak
        if any("code" in w or "programming" in w for w in target_concepts):
            agents.append("code")
        complexity = "simpler"

    # Build context focusing on weak concepts
    context = f"""TARGETED REMEDIATION for: {quiz.topic}

STUDENT WEAK CONCEPTS: {', '.join(target_concepts)}

INSTRUCTIONS:
- Generate simpler explanations for the weak concepts above
- Include more examples and visual aids
- Focus on building foundational understanding
- Avoid advanced topics until basics are solid
"""

    # Run orchestrator
    orchestrator = Orchestrator(llm_client)

    try:
        result = await orchestrator.generate_resources(
            topic=quiz.topic,
            profile=profile_data,
            context=context,
            agent_selection=agents,
            agent_kwargs={
                "complexity_override": complexity,
                "focus_concepts": target_concepts,
            }
        )

        # Store regeneration metadata in attempt
        if not attempt.answers:
            attempt.answers = {}
        if isinstance(attempt.answers, list):
            attempt.answers = {"results": attempt.answers}

        attempt.answers["regenerated_resources"] = {
            "generated_at": datetime.utcnow().isoformat(),
            "target_concepts": target_concepts,
            "agents_used": agents,
            "resource_types": list(result.get("resources", {}).keys()),
        }

        await db.commit()

        return {
            "regenerated": True,
            "outcome": attempt.outcome,
            "target_concepts": target_concepts,
            "resources": result.get("resources", {}),
            "metadata": result.get("metadata", {}),
        }

    except Exception as e:
        logger.error(f"Resource regeneration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Regeneration failed: {str(e)}"
        )


class SandboxExecuteRequest(BaseModel):
    """Request for sandbox code execution."""
    code: str
    language: str
    test_cases: List[Dict[str, Any]]


class SandboxGradeRequest(BaseModel):
    """Request for sandbox code grading."""
    code: str
    language: str
    test_cases: List[Dict[str, Any]]
    question_context: str = ""


@router.post("/sandbox/execute")
async def execute_sandbox(
    request: SandboxExecuteRequest,
):
    """
    Execute code against test cases in sandbox.

    Args:
        request: Sandbox execution request with code, language, and test cases

    Returns:
        Test execution results
    """
    from agents.coding_grader import CodingGrader
    from core.llm_client import llm_client

    logger.info(f"Sandbox execution: {request.language} with {len(request.test_cases)} tests")

    grader = CodingGrader(llm_client)

    try:
        result = await grader.run_tests_only(request.code, request.language, request.test_cases)
        return result
    except Exception as e:
        logger.error(f"Sandbox execution failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code execution failed: {str(e)}"
        )


@router.post("/sandbox/grade")
async def grade_coding_submission(
    request: SandboxGradeRequest,
):
    """
    Grade a coding submission with full assessment.

    Args:
        request: Grading request with code, language, test cases, and context

    Returns:
        Grading results with feedback
    """
    from agents.coding_grader import CodingGrader
    from core.llm_client import llm_client

    logger.info(f"Grading coding submission: {request.language}")

    grader = CodingGrader(llm_client)

    try:
        result = await grader.grade(request.code, request.language, request.test_cases, request.question_context)
        return result
    except Exception as e:
        logger.error(f"Coding grading failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Grading failed: {str(e)}"
        )
