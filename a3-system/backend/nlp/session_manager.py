"""
Chat Session Manager for Profiling Conversations.

Manages the state and flow of profiling conversations:
- Session lifecycle (create, update, complete, expire)
- Profiling question flow (5-8 questions)
- Conversation history
- Profile completeness tracking
- Integration with ProfileExtractor and ProfileBuilder
"""

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from core.content_moderator import content_moderator
from core.logging import get_logger
from nlp.gap_detector import gap_detector
from nlp.profile_extractor import (
    ExtractionResult,
    ProfileBuilder,
    ProfileExtraction,
    ProfileExtractor,
)

logger = get_logger(__name__)

# Profiling conversation script
PROFILING_QUESTIONS = [
    {
        "id": "welcome",
        "text": "Hello! I'm your learning assistant. To create a personalized learning path for you, I'd like to understand your background. Tell me about your experience with cloud computing or related technologies.",
        "purpose": "knowledge_base",
        "expected_dimensions": ["knowledge_base"],
    },
    {
        "id": "challenges",
        "text": "What topics or concepts do you find most challenging when learning technical subjects?",
        "purpose": "weak_points",
        "expected_dimensions": ["weak_points"],
    },
    {
        "id": "learning_style",
        "text": "How do you prefer to learn new concepts? Do you like watching videos, reading documentation, hands-on practice, or diagrams?",
        "purpose": "cognitive_style",
        "expected_dimensions": ["cognitive_style", "content_preferences"],
    },
    {
        "id": "goals",
        "text": "What is your main goal for learning cloud computing? For example: pass a certification, build projects, or understand concepts.",
        "purpose": "goals",
        "expected_dimensions": ["goals"],
    },
    {
        "id": "pace",
        "text": "How much time can you dedicate to studying per week? And do you prefer a quick intensive pace or a slower thorough pace?",
        "purpose": "learning_pace",
        "expected_dimensions": ["learning_pace"],
    },
    {
        "id": "experience",
        "text": "Describe a time when you struggled with a technical topic. What helped you overcome it, or what would have helped?",
        "purpose": "cognitive_style",
        "expected_dimensions": ["cognitive_style", "weak_points"],
    },
    {
        "id": "preferences",
        "text": "Any specific topics you want to focus on or avoid? For example: Docker, Kubernetes, cloud security, serverless?",
        "purpose": "goals",
        "expected_dimensions": ["goals", "weak_points"],
    },
    {
        "id": "complete",
        "text": "Thank you! I have enough information to create your personalized learning path. You can always update your profile later. Click below to see your learning path!",
        "purpose": "complete",
        "expected_dimensions": [],
    },
]


@dataclass
class ChatMessage:
    """Single message in a conversation."""
    id: str
    role: str  # "student" or "assistant"
    content: str
    timestamp: datetime
    extracted_profile: Optional[Dict[str, Any]] = None


@dataclass
class ProfilingSession:
    """State of a profiling conversation."""
    session_id: str
    student_id: str
    messages: List[ChatMessage] = field(default_factory=list)
    current_question_index: int = 0
    profile_builder: ProfileBuilder = field(default_factory=ProfileBuilder)
    status: str = "active"  # active, complete, expired
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    def add_message(self, role: str, content: str):
        """Add a message to the session history."""
        message = ChatMessage(
            id=str(uuid.uuid4()),
            role=role,
            content=content,
            timestamp=datetime.utcnow()
        )
        self.messages.append(message)
        self.last_activity = datetime.utcnow()
        return message

    def get_conversation_history(self, max_messages: int = 10) -> List[Dict[str, str]]:
        """Get recent conversation history for context."""
        recent = self.messages[-max_messages:]
        return [
            {
                "content": msg.content,
                "is_student": msg.role == "student"
            }
            for msg in recent
        ]

    def get_current_question(self) -> Optional[Dict[str, str]]:
        """Get the current profiling question."""
        if self.current_question_index < len(PROFILING_QUESTIONS):
            return PROFILING_QUESTIONS[self.current_question_index]
        return None

    def advance_question(self):
        """Move to the next question."""
        self.current_question_index += 1

    def is_complete(self) -> bool:
        """Check if profiling is complete."""
        if self.status == "complete":
            return True

        # Check if profile has enough dimensions
        if self.profile_builder.is_profile_complete():
            return True

        # Check if all questions answered
        if self.current_question_index >= len(PROFILING_QUESTIONS):
            return True

        return False

    def get_progress(self) -> Dict[str, Any]:
        """Get profiling progress."""
        total_questions = len(PROFILING_QUESTIONS) - 1  # Exclude 'complete' message
        current = min(self.current_question_index, total_questions)

        return {
            "current_question": current,
            "total_questions": total_questions,
            "percentage": (current / total_questions * 100) if total_questions > 0 else 100,
            "dimensions_found": self.profile_builder.get_profile_summary()["dimensions_found"],
            "confidence_scores": self.profile_builder.confidence_scores,
            "is_complete": self.is_complete(),
        }


class SessionManager:
    """Manages profiling sessions with thread-safe operations."""

    def __init__(self):
        self.sessions: Dict[str, ProfilingSession] = {}
        self.extractor = ProfileExtractor()
        self.session_timeout = timedelta(hours=24)
        self._lock = asyncio.Lock()  # Lock for thread-safe session operations

    async def create_session(self, student_id: str) -> ProfilingSession:
        """Create a new profiling session (thread-safe)."""
        async with self._lock:
            # Check if student already has an active session
            for session in self.sessions.values():
                if session.student_id == student_id and session.status == "active":
                    logger.info(f"Returning existing session for student {student_id}")
                    return session

            # Create new session
            session_id = str(uuid.uuid4())
            session = ProfilingSession(
                session_id=session_id,
                student_id=student_id
            )

            self.sessions[session_id] = session
            logger.info(f"Created profiling session {session_id} for student {student_id}")

        return session

    async def generate_first_question(self, session: ProfilingSession) -> str:
        """Generate an AI-driven first question to start the profiling conversation."""
        # If session already has messages, return the first assistant message
        if session.messages:
            for msg in session.messages:
                if msg.role == "assistant":
                    return msg.content
        
        from core.llm_client import llm_client
        
        system_prompt = """You are A3, a friendly and intelligent learning assistant. 
You're starting a conversation with a new student to understand their learning profile.

Generate a warm, welcoming first message that:
- Introduces yourself briefly as A3
- Explains you want to create a personalized learning path for them
- Asks an open-ended question to get them talking about their learning goals or interests
- Is conversational and encouraging, not robotic
- Is concise (2-3 sentences max)

Do NOT list all the things you want to know. Just ask ONE natural opening question."""

        try:
            logger.info("Generating first question via LLM...")
            response = await llm_client.generate(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Start the conversation"}
                ],
                temperature=0.8,
                max_tokens=150
            )
            
            # Check if it's a mock response
            if response.get("mock"):
                logger.warning("First question got mock response, using fallback")
                return "Hi! I'm A3, your learning assistant. I'd love to help you create a personalized learning path. What topics are you interested in learning about?"
            
            content = response["choices"][0]["message"]["content"]
            logger.info(f"First question generated: {content[:50]}...")
            return content
        except Exception as e:
            logger.error(f"Failed to generate first question: {e}")
            return "Hi! I'm A3, your learning assistant. I'd love to help you create a personalized learning path. What topics are you interested in learning about?"

    def get_session(self, session_id: str) -> Optional[ProfilingSession]:
        """Get a session by ID."""
        session = self.sessions.get(session_id)
        if session and self._is_session_expired(session):
            session.status = "expired"
            logger.info(f"Session {session_id} expired")
        return session

    def get_session_by_student(self, student_id: str) -> Optional[ProfilingSession]:
        """Get active session for a student."""
        for session in self.sessions.values():
            if session.student_id == student_id and session.status == "active":
                return session
        return None

    async def process_message(
        self,
        session_id: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Process a student message in a profiling session.

        Returns:
            Dict with response, session status, and progress
        """
        session = self.get_session(session_id)
        if not session:
            return {
                "error": "Session not found",
                "status": "error"
            }

        if session.status != "active":
            return {
                "error": f"Session is {session.status}",
                "status": "error"
            }

        # Harmful-content moderation on user input. Blocked messages short-circuit
        # the extraction + LLM pipeline and return a polite refusal.
        mod = content_moderator.moderate(message)
        if mod.verdict == "block":
            logger.warning(
                f"Session {session_id} input blocked by moderator: {mod.reason}"
            )
            session.add_message("student", message)
            refusal = mod.refusal_message or "I can't help with that."
            session.add_message("assistant", refusal)
            return {
                "response": refusal,
                "session_id": session_id,
                "status": "active",
                "progress": session.get_progress(),
                "extracted_dimensions": [],
                "moderation": mod.to_dict(),
            }

        try:
            # Store student message
            session.add_message("student", message)

            # Extract profile information from the message
            logger.info(f"Extracting profile from message for session {session_id}")
            try:
                extraction_result = await self.extractor.extract_from_message(
                    message,
                    session.get_conversation_history()
                )
            except Exception as e:
                logger.error(f"Extraction failed: {e}")
                # Create empty extraction result
                extraction_result = ExtractionResult(extractions=[], analysis="Extraction failed")

            # Embedding-based gap detection (PRD Feature 1).
            # Runs against the curated expert corpus and surfaces any topics
            # the student appears not to grasp. Failures here must never
            # block the chat reply, so we swallow exceptions.
            try:
                gap_tags = await gap_detector.detect_weak_points(message)
                if gap_tags:
                    extraction_result.extractions.append(ProfileExtraction(
                        dimension="weak_points",
                        value=gap_tags,
                        confidence=0.6,
                        evidence_quote="Detected via embedding similarity vs expert corpus",
                    ))
                    logger.info(f"GapDetector flagged weak points: {gap_tags}")
            except Exception as e:
                logger.debug(f"Gap detection skipped: {e}")

            # Update profile builder
            session.profile_builder.add_extraction(extraction_result)

            # Determine next action
            if session.is_complete():
                return await self._complete_profiling(session)

            # Generate pure AI-driven response
            try:
                response_text = await self._generate_ai_response(session, extraction_result)
            except Exception as e:
                logger.error(f"AI response generation failed: {e}")
                # Fallback response
                response_text = "I'd love to learn more about you! What topics are you interested in learning, and how do you prefer to study?"

            # Store assistant response
            session.add_message("assistant", response_text)

            return {
                "response": response_text,
                "session_id": session_id,
                "status": "active",
                "progress": session.get_progress(),
                "extracted_dimensions": extraction_result.get_dimensions_found() if extraction_result else [],
            }
        except Exception as e:
            logger.error(f"Process message failed: {e}")
            return {
                "response": "I'm having a moment - could you tell me more about what you'd like to learn?",
                "session_id": session_id,
                "status": "active",
                "progress": session.get_progress(),
                "extracted_dimensions": [],
            }

    async def _generate_ai_response(self, session: ProfilingSession, extraction: Any) -> str:
        """Generate a pure AI-driven conversational response using LLM."""
        from core.llm_client import llm_client
        
        confidence = session.profile_builder.confidence_scores
        extracted = extraction.get_dimensions_found() if extraction else []
        
        logger.info(f"Generating AI response. Confidence: {confidence}, Extracted: {extracted}")
        
        # Build context for the AI
        conversation_history = []
        for msg in session.messages[-10:]:  # Last 10 messages for context
            role = "user" if msg.role == "student" else "assistant"
            conversation_history.append({"role": role, "content": msg.content})
        
        logger.info(f"Conversation history has {len(conversation_history)} messages")
        
        # Build the system prompt
        system_prompt = """You are A3, a friendly and intelligent learning assistant helping to understand a student's learning profile.

Your goal is to have a natural conversation to learn about the student across these 6 dimensions:
1. knowledge_base - What topics/skills they already know (e.g., Python, cloud computing, data science)
2. cognitive_style - How they prefer to learn (visual/videos, verbal/reading, kinesthetic/hands-on)
3. goals - What they want to achieve (career change, certification, skill building, projects)
4. learning_pace - How much time they can dedicate (hours per week, intensive vs relaxed)
5. weak_points - Topics they struggle with or want to improve
6. content_preferences - What content format they prefer (short videos, long tutorials, interactive exercises)

Current profile confidence scores (0-1 scale):
""" + "\n".join(f"- {dim}: {conf:.1%}" for dim, conf in confidence.items()) + """

Dimensions we still need to learn about (confidence < 50%):
""" + ", ".join(dim for dim, conf in confidence.items() if conf < 0.5) + """

Dimensions just extracted from the last message:
""" + (", ".join(extracted) if extracted else "None") + """

Instructions:
- Be conversational, warm, and encouraging
- Acknowledge what you learned from their last message naturally
- Ask about ONE dimension that still needs information
- Keep responses concise (2-3 sentences max)
- Don't list all dimensions - focus on one at a time
- If all dimensions have good confidence, express that you have a good understanding"""

        messages = [{"role": "system", "content": system_prompt}] + conversation_history
        
        try:
            logger.info("Calling LLM for AI response...")
            response = await llm_client.generate(
                messages=messages,
                temperature=0.7,
                max_tokens=200
            )
            
            # Check if it's a mock response
            if response.get("mock"):
                logger.warning("LLM returned mock response, using fallback")
                raise Exception("Mock response received")
            
            content = response["choices"][0]["message"]["content"]
            logger.info(f"LLM response received: {content[:100]}...")
            return content
        except Exception as e:
            logger.error(f"AI response generation failed: {e}")
            # Minimal fallback - ask about dimensions that need info
            all_dimensions = ["knowledge_base", "cognitive_style", "goals", "learning_pace", "weak_points", "content_preferences"]
            dim_questions = {
                "knowledge_base": "What's your background with the topics you want to learn?",
                "cognitive_style": "How do you prefer to learn - videos, reading, or hands-on practice?",
                "goals": "What do you want to achieve with this learning?",
                "learning_pace": "How much time can you dedicate to learning each week?",
                "weak_points": "Are there any topics you find challenging?",
                "content_preferences": "What type of content works best for you?"
            }
            
            # Find dimensions with low or no confidence
            needed = []
            for dim in all_dimensions:
                conf = confidence.get(dim, 0)
                if conf < 0.5:
                    needed.append((dim, conf))
            
            # If all dimensions have good confidence, we're done
            if not needed:
                return "I think I have a good understanding of your learning profile now! Let's proceed."
            
            # Ask about the dimension with lowest confidence
            needed.sort(key=lambda x: x[1])
            return dim_questions.get(needed[0][0], "Tell me more about yourself!")

    async def get_next_question(self, session_id: str) -> Dict[str, Any]:
        """Get the next question without processing a message."""
        session = self.get_session(session_id)
        if not session:
            return {"error": "Session not found"}

        question = session.get_current_question()
        if not question:
            return {"status": "complete"}

        return {
            "question": question["text"],
            "question_id": question["id"],
            "purpose": question["purpose"],
            "progress": session.get_progress(),
        }

    async def _complete_profiling(self, session: ProfilingSession) -> Dict[str, Any]:
        """Mark profiling as complete and return final profile."""
        session.status = "complete"
        session.completed_at = datetime.utcnow()

        # Get final profile
        profile = session.profile_builder.to_student_profile()

        # Send completion message
        completion_msg = PROFILING_QUESTIONS[-1]["text"]
        session.add_message("assistant", completion_msg)

        logger.info(
            f"Profiling complete for student {session.student_id}. "
            f"Dimensions: {session.profile_builder.get_profile_summary()['dimensions_found']}"
        )

        return {
            "response": completion_msg,
            "session_id": session.session_id,
            "status": "complete",
            "profile": profile,
            "progress": session.get_progress(),
        }

    def _is_session_expired(self, session: ProfilingSession) -> bool:
        """Check if a session has expired."""
        return datetime.utcnow() - session.last_activity > self.session_timeout

    def cleanup_expired_sessions(self):
        """Remove expired sessions."""
        expired = [
            sid for sid, session in self.sessions.items()
            if self._is_session_expired(session)
        ]
        for sid in expired:
            self.sessions[sid].status = "expired"
            del self.sessions[sid]
            logger.info(f"Cleaned up expired session {sid}")

    def get_stats(self) -> Dict[str, Any]:
        """Get session manager statistics."""
        total = len(self.sessions)
        active = sum(1 for s in self.sessions.values() if s.status == "active")
        complete = sum(1 for s in self.sessions.values() if s.status == "complete")
        expired = sum(1 for s in self.sessions.values() if s.status == "expired")

        return {
            "total_sessions": total,
            "active": active,
            "complete": complete,
            "expired": expired,
        }
