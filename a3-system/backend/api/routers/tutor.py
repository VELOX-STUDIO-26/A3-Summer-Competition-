"""
Tutor API Router for AI Tutoring System.

Endpoints:
- POST /api/tutor/ask        : Ask the AI tutor (non-streaming)
- POST /api/tutor/ask/stream : Ask the AI tutor (SSE streaming)
- POST /api/tutor/speak      : Text-to-speech synthesis
"""

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from core.logging import get_logger
from core.tts_client import tts_client
from core.tutor_engine import tutor_engine
from models.schemas import FaithfulnessInfo, TTSRequest, TutorRequest, TutorResponse

logger = get_logger(__name__)
router = APIRouter()


# In-memory conversation history storage (replace with Redis in production)
# Key: student_id, Value: list of turns
_conversation_history: Dict[str, List[Dict[str, str]]] = {}


def _get_history(student_id: str) -> List[Dict[str, str]]:
    """Get conversation history for a student."""
    return _conversation_history.get(student_id, [])


def _add_to_history(student_id: str, role: str, content: str, max_turns: int = 10):
    """Add a turn to conversation history."""
    if student_id not in _conversation_history:
        _conversation_history[student_id] = []
    _conversation_history[student_id].append({"role": role, "content": content})
    # Trim to max turns
    if len(_conversation_history[student_id]) > max_turns:
        _conversation_history[student_id] = _conversation_history[student_id][-max_turns:]


@router.post("/ask", response_model=TutorResponse)
async def ask_tutor(request: TutorRequest):
    """
    Ask the AI tutor a question.

    The tutor will ground its answer in the knowledge base (RAG)
    and adapt to the student's profile and current topic.
    """
    try:
        logger.info(f"Tutor question from {request.student_id}: {request.question[:50]}...")

        # Load profile (in production, fetch from database)
        # For now, we construct a minimal profile from the request or use defaults
        profile = await _load_profile(request.student_id)

        # Override hands_free if requested
        if request.hands_free:
            profile["hands_free"] = True

        # Get conversation history
        history = _get_history(request.student_id)

        # Generate answer
        result = await tutor_engine.answer(
            question=request.question,
            profile=profile,
            current_topic=request.current_topic,
            history=history,
        )

        # Store in history
        _add_to_history(request.student_id, "user", request.question)
        _add_to_history(request.student_id, "assistant", result["answer"])

        # Override response type if requested
        if request.response_type:
            result["response_type"] = request.response_type.value

        return TutorResponse(
            answer=result["answer"],
            response_type=result["response_type"],
            sources=result["sources"],
            current_topic=result["current_topic"],
            suggested_followups=result["suggested_followups"],
            faithfulness=FaithfulnessInfo(**result["faithfulness"]),
        )

    except Exception as e:
        logger.error(f"Tutor ask failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Tutor processing failed: {str(e)}"
        )


@router.post("/ask/stream")
async def ask_tutor_stream(request: TutorRequest):
    """
    Ask the AI tutor with streaming response (Server-Sent Events).

    Events:
    - sources: Retrieved RAG chunks
    - start: Generation started
    - delta: Next token chunk
    - complete: Generation complete
    - error: Error occurred
    """
    async def event_generator():
        profile = await _load_profile(request.student_id)
        if request.hands_free:
            profile["hands_free"] = True

        history = _get_history(request.student_id)

        full_answer = ""
        try:
            async for event in tutor_engine.answer_stream(
                question=request.question,
                profile=profile,
                current_topic=request.current_topic,
                history=history,
            ):
                # SSE format: data: {json}\n\n
                yield f"data: {json.dumps(event)}\n\n"

                if event["event"] == "delta":
                    full_answer += event["data"]

            # Store complete answer in history
            _add_to_history(request.student_id, "user", request.question)
            _add_to_history(request.student_id, "assistant", full_answer)

        except Exception as e:
            logger.error(f"Tutor stream failed: {e}")
            yield f"data: {json.dumps({'event': 'error', 'data': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/speak")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using Edge-TTS.

    Returns MP3 audio bytes.
    """
    try:
        mp3_bytes = await tts_client.synthesize(
            text=request.text,
            voice=request.voice,
            rate=request.rate,
            volume=request.volume,
        )

        return StreamingResponse(
            iter([mp3_bytes]),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=tutor_response.mp3"
            }
        )

    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TTS not available: edge-tts is not installed. Run: pip install edge-tts"
        )
    except Exception as e:
        logger.error(f"TTS failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"TTS synthesis failed: {str(e)}"
        )


async def _load_profile(student_id: str) -> Dict[str, Any]:
    """
    Load student profile from database or return defaults.

    In production, this fetches from the profile database.
    For now, returns a default profile.
    """
    try:
        from models.database import get_db
        from sqlalchemy.ext.asyncio import AsyncSession

        # Use the existing session factory instead of creating a new DatabaseManager
        async for session in get_db():
            from models.database import StudentProfile as StudentProfileORM
            profile = await session.get(StudentProfileORM, student_id)
            if profile:
                return {
                    "student_id": profile.student_id,
                    "cognitive_style": profile.cognitive_style or "mixed",
                    "learning_pace": profile.learning_pace or 0.5,
                    "knowledge_base": profile.knowledge_base or {},
                    "weak_points": profile.weak_points or [],
                    "goals": profile.goals or [],
                    "content_preferences": profile.content_preferences or [],
                }
    except Exception as e:
        logger.warning(f"Could not load profile from DB: {e}")

    # Default profile
    return {
        "student_id": student_id,
        "cognitive_style": "mixed",
        "learning_pace": 0.5,
        "knowledge_base": {},
        "weak_points": [],
        "goals": [],
        "content_preferences": [],
    }
