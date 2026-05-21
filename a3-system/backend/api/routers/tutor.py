"""
Tutor API Router for AI Tutoring System.

Endpoints:
- POST /api/tutor/ask        : Ask the AI tutor (non-streaming)
- POST /api/tutor/ask/stream : Ask the AI tutor (SSE streaming)
- POST /api/tutor/speak      : Text-to-speech synthesis
- POST /api/tutor/analyze-image : Analyze an uploaded image (equation, diagram)
"""

import json
from collections import OrderedDict
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from core.content_moderator import content_moderator
from core.logging import get_logger
from core.tts_client import tts_client
from core.tutor_engine import tutor_engine
from core.vision_llm_client import vision_llm_client
from models.schemas import FaithfulnessInfo, TTSRequest, TutorRequest, TutorResponse

logger = get_logger(__name__)
router = APIRouter()


# In-memory conversation history storage (replace with Redis in production)
# Key: student_id, Value: list of turns
_MAX_IN_MEMORY_STUDENTS = 1000
_conversation_history: OrderedDict[str, List[Dict[str, str]]] = OrderedDict()


def _get_history(student_id: str) -> List[Dict[str, str]]:
    """Get conversation history for a student."""
    return _conversation_history.get(student_id, [])


def _add_to_history(student_id: str, role: str, content: str, max_turns: int = 10):
    """Add a turn to conversation history."""
    if student_id not in _conversation_history:
        # Evict oldest student if at capacity
        if len(_conversation_history) >= _MAX_IN_MEMORY_STUDENTS:
            _conversation_history.popitem(last=False)
        _conversation_history[student_id] = []
    _conversation_history[student_id].append({"role": role, "content": content})
    # Trim to max turns
    if len(_conversation_history[student_id]) > max_turns:
        _conversation_history[student_id] = _conversation_history[student_id][-max_turns:]
    # Mark as recently used
    _conversation_history.move_to_end(student_id, last=True)


@router.post("/ask", response_model=TutorResponse)
async def ask_tutor(request: TutorRequest):
    """
    Ask the AI tutor a question.

    The tutor will ground its answer in the knowledge base (RAG)
    and adapt to the student's profile and current topic.
    """
    try:
        logger.info(f"Tutor question from {request.student_id}: {request.question[:50]}...")

        # Harmful-content moderation on user input
        mod = content_moderator.moderate(request.question)
        if mod.verdict == "block":
            logger.warning(
                f"Tutor input blocked by moderator for {request.student_id}: {mod.reason}"
            )
            return TutorResponse(
                answer=mod.refusal_message or "I can't help with that request.",
                response_type="text",
                sources=[],
                current_topic=request.current_topic or "",
                suggested_followups=[],
                faithfulness=FaithfulnessInfo(
                    score=1.0, verified=True, total_claims=0,
                    supported_count=0, contradicted_count=0, unverifiable_count=0,
                    citations=[],
                    warning_message=f"Request blocked by content moderator: {mod.reason}",
                ),
            )

        # Load profile (in production, fetch from database)
        # For now, we construct a minimal profile from the request or use defaults
        profile = await _load_profile(request.student_id)

        # Override hands_free if requested
        if request.hands_free:
            profile["hands_free"] = True

        # Get conversation history
        history = _get_history(request.student_id)

        # Store user message before generation so the question is preserved
        # even if generation fails.
        _add_to_history(request.student_id, "user", request.question)

        # Generate answer
        result = await tutor_engine.answer(
            question=request.question,
            profile=profile,
            current_topic=request.current_topic,
            history=history,
        )

        # Store assistant response
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
async def ask_tutor_stream(
    request: TutorRequest,
    raw_request: Request = None,
):
    """
    Ask the AI tutor with streaming response (Server-Sent Events).

    Events:
    - sources: Retrieved RAG chunks
    - start: Generation started
    - delta: Next token chunk
    - complete: Generation complete
    - error: Error occurred
    """
    # Detect client disconnection so we can stop the LLM stream early
    disconnect_event = asyncio.Event()

    async def disconnect_monitor():
        if raw_request is None:
            return
        try:
            while not disconnect_event.is_set():
                if await raw_request.is_disconnected():
                    disconnect_event.set()
                    logger.info(
                        f"[tutor] Client disconnected from /ask/stream for "
                        f"{request.student_id}"
                    )
                    break
                await asyncio.sleep(0.5)
        except Exception:
            pass

    monitor_task = asyncio.create_task(disconnect_monitor())

    async def event_generator():
        try:
            # Harmful-content moderation on user input
            mod = content_moderator.moderate(request.question)
            if mod.verdict == "block":
                logger.warning(
                    f"Tutor stream input blocked by moderator for "
                    f"{request.student_id}: {mod.reason}"
                )
                refusal = mod.refusal_message or "I can't help with that request."
                yield f"data: {json.dumps({'event': 'start', 'data': None})}\n\n"
                yield f"data: {json.dumps({'event': 'delta', 'data': refusal})}\n\n"
                yield f"data: {json.dumps({'event': 'moderation', 'data': mod.to_dict()})}\n\n"
                yield f"data: {json.dumps({'event': 'complete', 'data': refusal})}\n\n"
                return

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
                    if disconnect_event.is_set():
                        break
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
        finally:
            if not monitor_task.done():
                monitor_task.cancel()

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
                    "name": getattr(profile, "name", None) or "there",
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
        "name": "there",
        "cognitive_style": "mixed",
        "learning_pace": 0.5,
        "knowledge_base": {},
        "weak_points": [],
        "goals": [],
        "content_preferences": [],
    }


@router.post("/analyze-image")
async def analyze_image(
    image: UploadFile = File(..., description="Image file to analyze (PNG, JPG, GIF)"),
    question: str = Form("", description="Optional question about the image"),
    student_id: str = Form(..., description="Student ID"),
):
    """
    Analyze an uploaded image (equation, diagram, code screenshot, etc.)
    and provide an AI-generated explanation.
    """
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type: {image.content_type}. Allowed: {allowed_types}"
        )

    # Validate file size (max 5MB)
    max_size = 5 * 1024 * 1024  # 5MB
    image_bytes = await image.read()
    if len(image_bytes) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image too large. Maximum size is 5MB."
        )

    # Content moderation on the question if provided
    if question:
        mod = content_moderator.moderate(question)
        if mod.verdict == "block":
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "analysis": mod.refusal_message or "I can't help with that request.",
                    "model_used": None,
                    "success": False,
                    "blocked": True,
                    "reason": mod.reason,
                }
            )

    try:
        # Analyze the image
        result = await vision_llm_client.analyze_image(
            image_bytes=image_bytes,
            question=question,
            mime_type=image.content_type or "image/png",
        )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result,
        )

    except Exception as e:
        logger.error(f"Image analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image analysis failed: {str(e)}"
        )


@router.post("/extract-equation")
async def extract_equation(
    image: UploadFile = File(..., description="Image of a mathematical equation"),
    student_id: str = Form(..., description="Student ID"),
):
    """
    Extract LaTeX from an image of a mathematical equation.
    """
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type: {image.content_type}"
        )

    # Validate file size
    max_size = 5 * 1024 * 1024  # 5MB
    image_bytes = await image.read()
    if len(image_bytes) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image too large. Maximum size is 5MB."
        )

    try:
        # Extract equation
        result = await vision_llm_client.extract_equation(
            image_bytes=image_bytes,
            mime_type=image.content_type or "image/png",
        )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result,
        )

    except Exception as e:
        logger.error(f"Equation extraction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Equation extraction failed: {str(e)}"
        )
