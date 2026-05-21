"""
Chat API Router for Profiling Conversations.

Endpoints:
- POST /api/chat/start      : Start a new profiling session
- POST /api/chat/message    : Send a message in an active session
- GET  /api/chat/{session_id}/status : Get session status and progress
- POST /api/chat/{session_id}/complete : Force-complete profiling
"""

import re
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from core.content_moderator import content_moderator
from core.logging import get_logger
from nlp.session_manager import SessionManager

logger = get_logger(__name__)
router = APIRouter()


def sanitize_user_input(text: str, max_length: int = 10000) -> str:
    """
    Sanitize user input to prevent prompt injection and other attacks.
    
    - Truncates to max_length
    - Removes potential prompt injection patterns
    - Strips excessive whitespace
    """
    if not text:
        return ""
    
    # Truncate to max length
    text = text[:max_length]
    
    # Remove potential prompt injection patterns
    # These patterns attempt to override system instructions
    injection_patterns = [
        r"ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)",
        r"disregard\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)",
        r"forget\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)",
        r"(?:^|\n)\s*you\s+are\s+now\s+(?:a|an|the)\s+\w+",
        r"(?:^|\n)\s*new\s+instructions?:",
        r"(?:^|\n)\s*system\s*:\s*",
    ]
    
    for pattern in injection_patterns:
        text = re.sub(pattern, "[filtered]", text, flags=re.IGNORECASE)
    
    # Normalize whitespace
    text = " ".join(text.split())
    
    return text.strip()

# Global session manager (singleton)
session_manager = SessionManager()


# ============================================================================
# Request/Response Models
# ============================================================================

class StartSessionRequest(BaseModel):
    """Request to start a profiling session."""
    student_id: str = Field(..., description="Unique student identifier")


class StartSessionResponse(BaseModel):
    """Response with new session info."""
    session_id: str
    student_id: str
    first_question: str
    status: str
    progress: Dict[str, Any]


class ChatMessageRequest(BaseModel):
    """Request to send a message in a profiling session."""
    session_id: str = Field(..., description="Session identifier")
    message: str = Field(..., min_length=1, max_length=2000, description="Student message")


class ChatMessageResponse(BaseModel):
    """Response from processing a chat message."""
    response: str
    session_id: str
    status: str
    progress: Dict[str, Any]
    extracted_dimensions: list = Field(default_factory=list)
    profile: Dict[str, Any] = Field(default_factory=dict)


class SessionStatusResponse(BaseModel):
    """Response with session status."""
    session_id: str
    student_id: str
    status: str
    progress: Dict[str, Any]
    profile_summary: Dict[str, Any]
    message_count: int


class CompleteSessionResponse(BaseModel):
    """Response when profiling is complete."""
    session_id: str
    status: str
    profile: Dict[str, Any]
    message: str


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/start", response_model=StartSessionResponse)
async def start_profiling_session(request: StartSessionRequest):
    """
    Start a new profiling session for a student.

    Returns the first profiling question and session ID.
    If the student already has an active session, returns that session.
    """
    try:
        session = await session_manager.create_session(request.student_id)

        # Generate AI-driven first question
        first_question = await session_manager.generate_first_question(session)

        # Add first question as assistant message
        session.add_message("assistant", first_question)

        logger.info(
            f"Started profiling session {session.session_id} "
            f"for student {request.student_id}"
        )

        return StartSessionResponse(
            session_id=session.session_id,
            student_id=session.student_id,
            first_question=first_question,
            status=session.status,
            progress=session.get_progress(),
        )

    except Exception as e:
        logger.error(f"Failed to start profiling session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start session: {str(e)}"
        )


@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(request: ChatMessageRequest):
    """
    Send a message in an active profiling session.

    The system will:
    1. Extract profile dimensions from the message
    2. Update the student's profile
    3. Return the next profiling question or completion status
    """
    try:
        # Sanitize user input to prevent prompt injection
        sanitized_message = sanitize_user_input(request.message)
        
        result = await session_manager.process_message(
            request.session_id,
            sanitized_message
        )

        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"]
            )

        logger.info(
            f"Processed message in session {request.session_id}. "
            f"Status: {result['status']}, "
            f"Dimensions: {result.get('extracted_dimensions', [])}"
        )

        return ChatMessageResponse(
            response=result["response"],
            session_id=result["session_id"],
            status=result["status"],
            progress=result["progress"],
            extracted_dimensions=result.get("extracted_dimensions", []),
            profile=result.get("profile", {}),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process message: {str(e)}"
        )


@router.get("/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(session_id: str):
    """
    Get the current status of a profiling session.

    Returns progress, profile summary, and message count.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )

    return SessionStatusResponse(
        session_id=session.session_id,
        student_id=session.student_id,
        status=session.status,
        progress=session.get_progress(),
        profile_summary=session.profile_builder.get_profile_summary(),
        message_count=len(session.messages),
    )


@router.post("/{session_id}/complete", response_model=CompleteSessionResponse)
async def complete_profiling(session_id: str):
    """
    Force-complete a profiling session.

    Returns the final extracted profile.
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )

    # Complete the session
    result = await session_manager._complete_profiling(session)

    return CompleteSessionResponse(
        session_id=session_id,
        status="complete",
        profile=result["profile"],
        message="Profiling completed successfully",
    )


@router.get("/stats")
async def get_session_stats():
    """
    Get session manager statistics.

    For monitoring and debugging purposes.
    """
    return session_manager.get_stats()


# ============================================================================
# Simple Chat (No RAG, Direct LLM)
# ============================================================================

class SimpleChatRequest(BaseModel):
    """Request for simple direct chat."""
    message: str = Field(..., min_length=1, description="User message")
    topic: str = Field(default="Cloud Computing", description="Current topic")
    history: list = Field(default_factory=list, description="Conversation history")


class SimpleChatResponse(BaseModel):
    """Response from simple chat."""
    response: str
    topic: str


@router.post("/simple", response_model=SimpleChatResponse)
async def simple_chat(request: SimpleChatRequest):
    """
    Simple direct chat with LLM - no RAG, no profiling.
    
    For quick tutoring conversations without complex retrieval.
    """
    from core.llm_client import llm_client

    # Harmful-content moderation on user input
    mod = content_moderator.moderate(request.message)
    if mod.verdict == "block":
        logger.warning(f"Simple chat blocked by moderator: {mod.reason}")
        return SimpleChatResponse(
            response=mod.refusal_message or "I can't help with that request.",
            topic=request.topic,
        )

    try:
        # Build messages for LLM with warm, encouraging personality
        system_prompt = f"""You are A3, a warm and enthusiastic AI learning companion helping a student learn about {request.topic}.

Your Personality:
🌟 Warm & Encouraging: Celebrate curiosity! Use phrases like "Great question!", "I love that you're thinking about this!", "You're on the right track!"

🤝 Empathetic & Patient: If the student seems confused, say things like "Many students find this tricky at first—you're not alone!" or "This concept takes time to click, and that's totally normal."

🎯 Confidence Building: Use "yet" framing ("You haven't mastered this *yet*"). Normalize struggle: "Cloud computing has a steep learning curve, and you're climbing it well!"

📚 Teaching Style:
- Use examples and analogies that connect to everyday experiences
- Break down complex concepts into simple, digestible parts
- Use spatial/visual language for technical concepts ("imagine this layered like...", "picture a hierarchy where...")
- Tell little stories or scenarios to make concepts memorable
- Ask follow-up questions to check understanding and spark curiosity
- Use markdown formatting for code and emphasis
- Connect ideas to the bigger picture when possible

Current topic: {request.topic}
Keep responses focused and engaging (under 300 words) unless the student asks for more detail. Make the student feel supported and excited about learning!"""

        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history (last 10 messages) with sanitization
        for msg in request.history[-10:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": sanitize_user_input(msg.get("content", "")) if msg.get("role") == "user" else msg.get("content", "")
            })

        # Add current message with sanitization
        messages.append({"role": "user", "content": sanitize_user_input(request.message)})

        # Generate response
        result = await llm_client.generate(
            messages=messages,
            temperature=0.7,
            max_tokens=1500
        )

        response_text = result["choices"][0]["message"]["content"]

        logger.info(f"Simple chat response generated for topic: {request.topic}")

        return SimpleChatResponse(
            response=response_text,
            topic=request.topic
        )

    except Exception as e:
        logger.error(f"Simple chat failed: {e}")
        return SimpleChatResponse(
            response="Oh no! 🤔 I'm having a little trouble thinking right now. Let me try again in just a moment!",
            topic=request.topic
        )


@router.post("/simple/stream")
async def simple_chat_stream(request: SimpleChatRequest):
    """
    Simple direct chat with LLM - streaming response (SSE).

    Streams tokens word-by-word for a more natural chat experience.
    """
    from core.llm_client import llm_client
    import json

    async def event_generator():
        # Harmful-content moderation on user input (short-circuit the stream)
        mod = content_moderator.moderate(request.message)
        if mod.verdict == "block":
            logger.warning(f"Simple chat stream blocked by moderator: {mod.reason}")
            refusal = mod.refusal_message or "I can't help with that request."
            yield f"data: {json.dumps({'event': 'start', 'data': None})}\n\n"
            yield f"data: {json.dumps({'event': 'delta', 'data': refusal})}\n\n"
            yield f"data: {json.dumps({'event': 'moderation', 'data': mod.to_dict()})}\n\n"
            yield f"data: {json.dumps({'event': 'complete', 'data': refusal})}\n\n"
            return

        try:
            # Build messages for LLM with warm, encouraging personality
            system_prompt = f"""You are A3, a warm and enthusiastic AI learning companion helping a student learn about {request.topic}.

Your Personality:
🌟 Warm & Encouraging: Celebrate curiosity! Use phrases like "Great question!", "I love that you're thinking about this!", "You're on the right track!"

🤝 Empathetic & Patient: If the student seems confused, say things like "Many students find this tricky at first—you're not alone!" or "This concept takes time to click, and that's totally normal."

🎯 Confidence Building: Use "yet" framing ("You haven't mastered this *yet*"). Normalize struggle: "Cloud computing has a steep learning curve, and you're climbing it well!"

📚 Teaching Style:
- Use examples and analogies that connect to everyday experiences
- Break down complex concepts into simple, digestible parts
- Use spatial/visual language for technical concepts ("imagine this layered like...", "picture a hierarchy where...")
- Tell little stories or scenarios to make concepts memorable
- Ask follow-up questions to check understanding and spark curiosity
- Use markdown formatting for code and emphasis
- Connect ideas to the bigger picture when possible

Current topic: {request.topic}
Keep responses focused and engaging (under 300 words) unless the student asks for more detail. Make the student feel supported and excited about learning!"""

            messages = [{"role": "system", "content": system_prompt}]

            # Add conversation history (last 10 messages) with sanitization
            for msg in request.history[-10:]:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": sanitize_user_input(msg.get("content", "")) if msg.get("role") == "user" else msg.get("content", "")
                })

            # Add current message with sanitization
            messages.append({"role": "user", "content": sanitize_user_input(request.message)})

            # Stream response
            yield f"data: {json.dumps({'event': 'start', 'data': None})}\n\n"

            full_response = ""
            async for delta in llm_client.generate_stream(
                messages=messages,
                temperature=0.7,
                max_tokens=1500
            ):
                full_response += delta
                yield f"data: {json.dumps({'event': 'delta', 'data': delta})}\n\n"

            yield f"data: {json.dumps({'event': 'complete', 'data': full_response})}\n\n"
            logger.info(f"Simple chat stream completed for topic: {request.topic}")

        except Exception as e:
            logger.error(f"Simple chat stream failed: {e}")
            yield f"data: {json.dumps({'event': 'error', 'data': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
