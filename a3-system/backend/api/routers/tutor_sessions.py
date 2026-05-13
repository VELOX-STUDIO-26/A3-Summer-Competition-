"""Tutor Session API Router for multi-session AI tutoring.

Endpoints:
- POST   /api/tutor/sessions              : Create a new tutor session
- GET    /api/tutor/sessions              : List student's tutor sessions
- GET    /api/tutor/sessions/{id}         : Get session details
- GET    /api/tutor/sessions/{id}/messages: Load message history
- POST   /api/tutor/sessions/{id}/messages: Send message (blocking)
- POST   /api/tutor/sessions/{id}/messages/stream : Send message (SSE streaming)
- PATCH  /api/tutor/sessions/{id}         : Update session title
- DELETE /api/tutor/sessions/{id}         : Archive session
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.content_moderator import content_moderator
from core.conversation_manager import ConversationManager
from core.llm_client import llm_client
from core.logging import get_logger
from core.tutor_engine import tutor_engine
from models.database import ChatMessage, ChatSession, db_manager, get_db
from models.schemas import FaithfulnessInfo

logger = get_logger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Request/Response Models
# ---------------------------------------------------------------------------


class CreateSessionRequest(BaseModel):
    student_id: str = Field(..., description="Student identifier")
    current_topic: Optional[str] = Field(default=None, description="Knowledge node context")


class SessionResponse(BaseModel):
    session_id: str
    title: str
    student_id: str
    session_type: str
    status: str
    current_topic: Optional[str] = None
    message_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class MessageResponse(BaseModel):
    message_id: str
    role: str
    content: str
    content_type: str
    created_at: Optional[str] = None


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, description="Student message")
    current_topic: Optional[str] = Field(default=None)
    profile: Optional[Dict[str, Any]] = Field(default=None)


class SendMessageResponse(BaseModel):
    response: str
    session_id: str
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    suggested_followups: List[str] = Field(default_factory=list)
    faithfulness: Optional[FaithfulnessInfo] = None


class UpdateSessionRequest(BaseModel):
    title: Optional[str] = Field(default=None)
    status: Optional[str] = Field(default=None)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _session_to_dict(session: ChatSession, message_count: int = 0) -> Dict[str, Any]:
    return {
        "session_id": session.session_id,
        "title": session.title or "New Chat",
        "student_id": session.student_id,
        "session_type": session.session_type or "tutor",
        "status": session.status or "active",
        "current_topic": session.current_node_id,
        "message_count": message_count,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None,
    }


async def _load_profile(student_id: str, db: AsyncSession) -> Dict[str, Any]:
    """Load student profile from database."""
    from models.database import StudentProfile
    profile = await db.get(StudentProfile, student_id)
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
    return {
        "student_id": student_id,
        "cognitive_style": "mixed",
        "learning_pace": 0.5,
        "knowledge_base": {},
        "weak_points": [],
        "goals": [],
        "content_preferences": [],
    }


async def _generate_title(first_user_msg: str, first_assistant_msg: str) -> str:
    """Generate a concise title via LLM, fallback to heuristic on failure."""
    prompt = f"""Generate a short, descriptive chat title (max 5 words) for this conversation.

Student: {first_user_msg[:500]}
Tutor: {first_assistant_msg[:500]}

Title:"""
    try:
        response = await llm_client.generate(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=20,
        )
        if isinstance(response, dict):
            if "choices" in response and response["choices"]:
                title = response["choices"][0].get("message", {}).get("content", "")
            elif "content" in response:
                title = response["content"]
            else:
                title = ""
        else:
            title = str(response)

        title = title.strip().strip('"').strip("'")
        # Sanity checks
        if not title or len(title) > 60:
            raise ValueError("Bad title from LLM")
        return title
    except Exception as e:
        logger.warning(f"LLM title generation failed, falling back: {e}")
        # Fallback to old heuristic
        title = first_user_msg.strip().replace("\n", " ")[:40]
        if len(first_user_msg) > 40:
            title += "..."
        return title


# ---------------------------------------------------------------------------
# CRUD Endpoints
# ---------------------------------------------------------------------------


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    request: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new tutor session."""
    session = ChatSession(
        student_id=request.student_id,
        session_type="tutor",
        status="active",
        current_node_id=request.current_topic,
        title="New Chat",
        context_summary="",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    logger.info(f"Created tutor session {session.session_id} for {request.student_id}")
    return _session_to_dict(session)


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all active tutor sessions for a student, newest first."""
    result = await db.execute(
        select(ChatSession)
        .where(
            ChatSession.student_id == student_id,
            ChatSession.session_type == "tutor",
            ChatSession.status == "active",
        )
        .order_by(desc(ChatSession.updated_at))
    )
    sessions = result.scalars().all()

    # Count messages per session
    out = []
    for s in sessions:
        count_result = await db.execute(
            select(ChatMessage).where(ChatMessage.session_id == s.session_id)
        )
        count = len(count_result.scalars().all())
        out.append(_session_to_dict(s, count))
    return out


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get session details."""
    session = await db.get(ChatSession, session_id)
    if not session or session.session_type != "tutor":
        raise HTTPException(status_code=404, detail="Session not found")

    count_result = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id)
    )
    count = len(count_result.scalars().all())
    return _session_to_dict(session, count)


@router.get("/sessions/{session_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 200,
):
    """Load message history for a session."""
    session = await db.get(ChatSession, session_id)
    if not session or session.session_type != "tutor":
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .offset(skip)
        .limit(limit)
    )
    messages = result.scalars().all()
    return [
        {
            "message_id": m.message_id,
            "role": m.role,
            "content": m.content,
            "content_type": m.content_type or "text",
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


@router.patch("/sessions/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    request: UpdateSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update session title or status."""
    session = await db.get(ChatSession, session_id)
    if not session or session.session_type != "tutor":
        raise HTTPException(status_code=404, detail="Session not found")

    if request.title is not None:
        session.title = request.title
    if request.status is not None:
        session.status = request.status

    await db.commit()
    await db.refresh(session)
    return _session_to_dict(session)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Archive a session (soft delete)."""
    session = await db.get(ChatSession, session_id)
    if not session or session.session_type != "tutor":
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = "archived"
    await db.commit()
    logger.info(f"Archived tutor session {session_id}")
    return None


# ---------------------------------------------------------------------------
# Messaging Endpoints
# ---------------------------------------------------------------------------


@router.post("/sessions/{session_id}/messages", response_model=SendMessageResponse)
async def send_message(
    session_id: str,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a message in a tutor session (blocking)."""
    session = await db.get(ChatSession, session_id)
    if not session or session.session_type != "tutor":
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session is archived")

    # Content moderation
    mod = content_moderator.moderate(request.content)
    if mod.verdict == "block":
        refusal = mod.refusal_message or "I can't help with that request."
        db.add(ChatMessage(
            session_id=session_id,
            role="assistant",
            content=refusal,
            content_type="text",
        ))
        await db.commit()
        return SendMessageResponse(
            response=refusal,
            session_id=session_id,
            faithfulness=FaithfulnessInfo(
                score=1.0,
                verified=True,
                total_claims=0,
                supported_count=0,
                contradicted_count=0,
                unverifiable_count=0,
                citations=[],
                warning_message=f"Blocked by content moderator: {mod.reason}",
            ),
        )

    # Load conversation state
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    db_messages = result.scalars().all()

    recent = [
        {"role": m.role, "content": m.content, "content_type": m.content_type or "text"}
        for m in db_messages[-12:]  # last 12 messages
    ]

    conv = ConversationManager.from_db(
        summary=session.context_summary,
        recent_messages=recent,
    )

    # Add user message
    conv.add_message("user", request.content)

    # Store user message
    db.add(ChatMessage(
        session_id=session_id,
        role="user",
        content=request.content,
        content_type="text",
    ))

    # Build profile
    profile = request.profile or await _load_profile(session.student_id, db)

    # Generate answer
    context = conv.get_context()
    # Extract history from context (skip system msg if present)
    history = [m for m in context if m["role"] != "system"]

    result_data = await tutor_engine.answer(
        question=request.content,
        profile=profile,
        current_topic=request.current_topic or session.current_node_id,
        history=history,
    )

    answer = result_data["answer"]

    # Add assistant response to conversation manager
    conv.add_message("assistant", answer)

    # Store assistant message
    db.add(ChatMessage(
        session_id=session_id,
        role="assistant",
        content=answer,
        content_type=result_data.get("response_type", "text"),
    ))

    # Auto-generate title on first exchange (when db_messages was empty before this request)
    if session.title == "New Chat" and len(db_messages) == 0:
        session.title = await _generate_title(request.content, answer)
        logger.info(f"[tutor] Generated title: {session.title}")

    # Persist summary
    session.context_summary = conv.get_summary()
    await db.commit()

    return SendMessageResponse(
        response=answer,
        session_id=session_id,
        sources=result_data.get("sources", []),
        suggested_followups=result_data.get("suggested_followups", []),
        faithfulness=FaithfulnessInfo(**result_data.get("faithfulness", {})),
    )


@router.post("/sessions/{session_id}/messages/stream")
async def send_message_stream(
    session_id: str,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    raw_request: Request = None,
):
    """Send a message with streaming response (SSE)."""
    session = await db.get(ChatSession, session_id)
    if not session or session.session_type != "tutor":
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session is archived")

    # Content moderation
    mod = content_moderator.moderate(request.content)
    if mod.verdict == "block":
        refusal = mod.refusal_message or "I can't help with that request."

        async def refusal_generator():
            yield f"data: {json.dumps({'event': 'start', 'data': None})}\n\n"
            yield f"data: {json.dumps({'event': 'delta', 'data': refusal})}\n\n"
            yield f"data: {json.dumps({'event': 'moderation', 'data': mod.to_dict()})}\n\n"
            yield f"data: {json.dumps({'event': 'complete', 'data': refusal})}\n\n"

        return StreamingResponse(
            refusal_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )

    # Load conversation state
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    db_messages = result.scalars().all()

    recent = [
        {"role": m.role, "content": m.content, "content_type": m.content_type or "text"}
        for m in db_messages[-12:]
    ]

    conv = ConversationManager.from_db(
        summary=session.context_summary,
        recent_messages=recent,
    )

    # Add user message
    conv.add_message("user", request.content)

    # Store user message
    db.add(ChatMessage(
        session_id=session_id,
        role="user",
        content=request.content,
        content_type="text",
    ))
    await db.commit()

    # Build profile
    profile = request.profile or await _load_profile(session.student_id, db)

    # Stream generation
    context = conv.get_context()
    history = [m for m in context if m["role"] != "system"]

    # Create placeholder assistant message BEFORE streaming
    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content="",
        content_type="text",
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)
    assistant_msg_id = assistant_msg.message_id
    logger.info(f"[tutor_stream] Created placeholder message {assistant_msg_id}")

    # Mutable container to track the full answer across async boundaries
    answer_container = {"text": "", "complete": False}

    # Detect client disconnection so we can stop the LLM stream early
    disconnect_event = asyncio.Event()

    async def disconnect_monitor():
        if raw_request is None:
            return
        try:
            while not disconnect_event.is_set():
                if await raw_request.is_disconnected():
                    disconnect_event.set()
                    logger.info(f"[tutor_stream] Client disconnected from session {session_id}")
                    break
                await asyncio.sleep(0.5)
        except Exception:
            pass

    monitor_task = asyncio.create_task(disconnect_monitor())

    async def event_generator():
        try:
            async for event in tutor_engine.answer_stream(
                question=request.content,
                profile=profile,
                current_topic=request.current_topic or session.current_node_id,
                history=history,
            ):
                if disconnect_event.is_set():
                    break
                yield f"data: {json.dumps(event)}\n\n"
                if event["event"] == "delta":
                    answer_container["text"] += event["data"]
        except Exception as e:
            logger.error(f"Tutor stream failed in session {session_id}: {e}")
            yield f"data: {json.dumps({'event': 'error', 'data': str(e)})}\n\n"
        finally:
            answer_container["complete"] = True
            logger.info(f"[tutor_stream] Stream ended, answer length: {len(answer_container['text'])}")
            if not monitor_task.done():
                monitor_task.cancel()

    response = StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )

    # Schedule incremental background updater
    asyncio.create_task(_update_message_after_stream(
        assistant_msg_id, session_id, answer_container, conv, db_messages
    ))

    return response


async def _update_message_after_stream(
    assistant_msg_id: str,
    session_id: str,
    answer_container: dict,
    conv: ConversationManager,
    db_messages: list
):
    """Background task to update assistant message incrementally during and after streaming."""
    max_wait = 300  # 5 minutes absolute ceiling
    waited = 0
    last_text = ""
    final_committed = False

    while waited < max_wait:
        await asyncio.sleep(2)
        waited += 2

        current_text = answer_container["text"]
        is_complete = answer_container["complete"]

        if current_text == last_text and not is_complete:
            continue

        last_text = current_text
        try:
            fresh_db = await db_manager.get_async_session()
            try:
                async with fresh_db.begin():
                    msg = await fresh_db.get(ChatMessage, assistant_msg_id)
                    if msg:
                        msg.content = current_text
                    else:
                        logger.error(f"[tutor_stream] Could not find message {assistant_msg_id}")

                    # Only finalize title & summary when stream is done or we hit the ceiling
                    if is_complete or waited >= max_wait:
                        session_obj = await fresh_db.get(ChatSession, session_id)
                        if session_obj:
                            # Load messages from DB to get the first user message for title generation
                            from sqlalchemy import select as sa_select
                            result = await fresh_db.execute(
                                sa_select(ChatMessage)
                                .where(ChatMessage.session_id == session_id)
                                .where(ChatMessage.role == "user")
                                .order_by(ChatMessage.created_at)
                            )
                            user_messages = result.scalars().all()
                            if session_obj.title == "New Chat" and len(user_messages) >= 1 and current_text:
                                first_user = user_messages[0].content
                                session_obj.title = await _generate_title(first_user, current_text)
                                logger.info(f"[tutor_stream] Generated title: {session_obj.title}")

                            conv.add_message("assistant", current_text)
                            session_obj.context_summary = conv.get_summary()
            finally:
                await fresh_db.close()

            if is_complete:
                final_committed = True
                logger.info(f"[tutor_stream] Final commit: {len(current_text)} chars")
                break
            else:
                logger.info(f"[tutor_stream] Incremental update: {len(current_text)} chars")
        except Exception as e:
            logger.error(f"[tutor_stream] Update failed: {e}", exc_info=True)

    if not final_committed:
        logger.info(f"[tutor_stream] Max wait reached. Final length: {len(last_text)}")
