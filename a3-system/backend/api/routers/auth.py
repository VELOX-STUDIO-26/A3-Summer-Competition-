"""
Authentication API Router for A3 Learning System.

Endpoints:
- POST /api/auth/register : Register new student account
- POST /api/auth/login    : Login and receive student info
- GET  /api/auth/me       : Get current user info
"""

import hashlib
import secrets
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import get_logger
from models.database import StudentProfile, UserAccount, Cohort, CohortMembership, Course, get_db

logger = get_logger(__name__)
router = APIRouter()


# ============================================================================
# Schemas
# ============================================================================

class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=1)
    experience: str = "beginner"
    background: str = ""
    learning_style: str = "mixed"
    goals: List[str] = []
    weekly_hours: str = "4-7"


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str


class GoogleLoginRequest(BaseModel):
    email: str = Field(..., min_length=3)
    name: str = Field(..., min_length=1)
    firebase_uid: str = Field(..., min_length=1)
    photo_url: Optional[str] = None


class AuthResponse(BaseModel):
    student_id: str
    email: str
    name: Optional[str] = None
    profile: Dict[str, Any]


# ============================================================================
# Password Hashing (pbkdf2_hmac - no extra deps)
# ============================================================================

def _hash_password(password: str) -> str:
    """Hash password with PBKDF2."""
    salt = secrets.token_hex(16)
    pwdhash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return salt + pwdhash.hex()


def _verify_password(password: str, hashed: str) -> bool:
    """Verify password against PBKDF2 hash."""
    salt = hashed[:32]
    stored_hash = hashed[32:]
    pwdhash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return pwdhash.hex() == stored_hash


def _derive_student_id(email: str) -> str:
    """Derive a short unique student_id from email."""
    return hashlib.sha256(email.lower().encode()).hexdigest()[:16]


def _map_registration_to_profile(data: RegisterRequest) -> dict:
    """Map registration form data to profile fields."""
    pace_map = {
        "1-3": 0.3,
        "4-7": 0.5,
        "8-12": 0.7,
        "13+": 0.9,
    }
    style_map = {
        "visual": "visual",
        "hands-on": "kinesthetic",
        "reading": "verbal",
        "video": "visual",
    }

    return {
        "knowledge_base": {},
        "cognitive_style": style_map.get(data.learning_style, "mixed"),
        "weak_points": [],
        "goals": data.goals,
        "learning_pace": pace_map.get(data.weekly_hours, 0.5),
        "content_preferences": ["video", "text", "diagram"],
        "version": 1,
    }


async def _ensure_default_cohort(db: AsyncSession, course_id: str = "cloud-computing") -> Cohort:
    """Get or create the default cohort for a course."""
    # Look for existing active cohort
    result = await db.execute(
        select(Cohort).where(
            Cohort.course_id == course_id,
            Cohort.is_active == True,
        ).order_by(Cohort.created_at.desc())
    )
    cohort = result.scalar_one_or_none()
    
    if cohort:
        return cohort
    
    # Get course name for cohort naming
    course_result = await db.execute(
        select(Course).where(Course.course_id == course_id)
    )
    course = course_result.scalar_one_or_none()
    course_name = course.name if course else course_id
    
    # Create default cohort
    cohort = Cohort(
        name=f"{course_name} - 2026 Cohort",
        course_id=course_id,
        description="Default cohort for all students",
        is_active=True,
        allow_leaderboard=True,
        min_members_for_comparison=3,  # Lower threshold for testing
    )
    db.add(cohort)
    await db.flush()  # Get the cohort_id
    
    logger.info(f"Created default cohort: {cohort.cohort_id} for course {course_id}")
    return cohort


async def _add_student_to_cohort(db: AsyncSession, student_id: str, cohort: Cohort) -> None:
    """Add a student to a cohort if not already a member."""
    # Check if already a member
    existing = await db.execute(
        select(CohortMembership).where(
            CohortMembership.cohort_id == cohort.cohort_id,
            CohortMembership.student_id == student_id,
        )
    )
    if existing.scalar_one_or_none():
        return  # Already a member
    
    # Get member count for alias
    count_result = await db.execute(
        select(CohortMembership).where(CohortMembership.cohort_id == cohort.cohort_id)
    )
    member_count = len(count_result.scalars().all())
    alias = f"Student {chr(65 + (member_count % 26))}"
    
    membership = CohortMembership(
        cohort_id=cohort.cohort_id,
        student_id=student_id,
        role="student",
        show_in_leaderboard=True,
        anonymous_alias=alias,
    )
    db.add(membership)
    logger.info(f"Added student {student_id} to cohort {cohort.cohort_id}")


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new student account."""
    # Mask email in logs for privacy (show only domain)
    email_domain = payload.email.split("@")[-1] if "@" in payload.email else "unknown"
    logger.info(f"Registration attempt for email domain: @{email_domain}")

    # Check if email already exists
    result = await db.execute(
        select(UserAccount).where(UserAccount.email == payload.email.lower())
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    student_id = _derive_student_id(payload.email)

    # Check if student profile already exists (edge case)
    profile = await db.get(StudentProfile, student_id)
    if not profile:
        profile_data = _map_registration_to_profile(payload)
        profile = StudentProfile(
            student_id=student_id,
            **profile_data,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(profile)

    # Create user account
    user = UserAccount(
        email=payload.email.lower(),
        password_hash=_hash_password(payload.password),
        student_id=student_id,
        name=payload.name,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    
    # Auto-add to default cohort for comparative analytics
    try:
        default_cohort = await _ensure_default_cohort(db)
        await _add_student_to_cohort(db, student_id, default_cohort)
    except Exception as e:
        logger.warning(f"Failed to add student to cohort: {e}")
    
    await db.commit()

    logger.info(f"Registered new user: {student_id}")

    return AuthResponse(
        student_id=student_id,
        email=user.email,
        name=user.name,
        profile=profile.to_dict(),
    )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate a user and return their info."""
    logger.info(f"Login attempt for email: {payload.email}")

    result = await db.execute(
        select(UserAccount).where(UserAccount.email == payload.email.lower())
    )
    user = result.scalar_one_or_none()

    if not user or not _verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    profile = await db.get(StudentProfile, user.student_id)
    if not profile:
        # Auto-create a default profile if missing
        profile = StudentProfile(
            student_id=user.student_id,
            knowledge_base={},
            cognitive_style="mixed",
            weak_points=[],
            goals=[],
            learning_pace=0.5,
            content_preferences=["video", "text", "diagram"],
            version=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(profile)
        await db.commit()

    # Auto-add existing users to cohort on login (for users who registered before this feature)
    try:
        default_cohort = await _ensure_default_cohort(db)
        await _add_student_to_cohort(db, user.student_id, default_cohort)
        await db.commit()
    except Exception as e:
        logger.warning(f"Failed to add student to cohort on login: {e}")

    logger.info(f"User logged in: {user.student_id}")

    return AuthResponse(
        student_id=user.student_id,
        email=user.email,
        name=user.name,
        profile=profile.to_dict(),
    )


@router.post("/google", response_model=AuthResponse)
async def google_login(payload: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate or register a user via Google OAuth."""
    logger.info(f"Google login attempt for email: {payload.email}")

    # Check if user already exists
    result = await db.execute(
        select(UserAccount).where(UserAccount.email == payload.email.lower())
    )
    user = result.scalar_one_or_none()

    if user:
        # Existing user - just log them in
        profile = await db.get(StudentProfile, user.student_id)
        if not profile:
            profile = StudentProfile(
                student_id=user.student_id,
                knowledge_base={},
                cognitive_style="mixed",
                weak_points=[],
                goals=[],
                learning_pace=0.5,
                content_preferences=["video", "text", "diagram"],
                version=1,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(profile)
            await db.commit()
        
        # Update name if provided and different
        if payload.name and user.name != payload.name:
            user.name = payload.name
            await db.commit()
        
        # Auto-add to cohort on login
        try:
            default_cohort = await _ensure_default_cohort(db)
            await _add_student_to_cohort(db, user.student_id, default_cohort)
            await db.commit()
        except Exception as e:
            logger.warning(f"Failed to add student to cohort on Google login: {e}")

        logger.info(f"Google user logged in: {user.student_id}")
        return AuthResponse(
            student_id=user.student_id,
            email=user.email,
            name=user.name,
            profile=profile.to_dict(),
        )
    
    # New user - create account
    student_id = _derive_student_id(payload.email)
    
    # Check if profile already exists (orphaned from previous account deletion)
    existing_profile = await db.get(StudentProfile, student_id)
    if existing_profile:
        profile = existing_profile
        logger.info(f"Reusing existing profile for student: {student_id}")
    else:
        # Create new profile
        profile = StudentProfile(
            student_id=student_id,
            knowledge_base={},
            cognitive_style="mixed",
            weak_points=[],
            goals=[],
            learning_pace=0.5,
            content_preferences=["video", "text", "diagram"],
            version=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(profile)
    
    # Create user account (no password for OAuth users)
    user = UserAccount(
        email=payload.email.lower(),
        password_hash=f"google:{payload.firebase_uid}",  # Mark as Google auth
        student_id=student_id,
        name=payload.name,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    
    # Auto-add to default cohort
    try:
        default_cohort = await _ensure_default_cohort(db)
        await _add_student_to_cohort(db, student_id, default_cohort)
    except Exception as e:
        logger.warning(f"Failed to add student to cohort: {e}")
    
    await db.commit()
    
    logger.info(f"Registered new Google user: {student_id}")
    return AuthResponse(
        student_id=student_id,
        email=user.email,
        name=user.name,
        profile=profile.to_dict(),
    )


@router.get("/me")
async def get_me(student_id: str, db: AsyncSession = Depends(get_db)):
    """Get current user info by student_id."""
    result = await db.execute(
        select(UserAccount).where(UserAccount.student_id == student_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    profile = await db.get(StudentProfile, student_id)

    return {
        "student_id": user.student_id,
        "email": user.email,
        "name": user.name,
        "profile": profile.to_dict() if profile else None,
    }


@router.delete("/account/{student_id}", status_code=status.HTTP_200_OK)
async def delete_account(student_id: str, db: AsyncSession = Depends(get_db)):
    """
    Delete a user account and all associated data.
    
    This permanently removes:
    - User account
    - Student profile
    - All quiz attempts
    - All generated quizzes
    - All learning events
    - All tutor sessions
    - All cohort memberships
    """
    from models.database import (
        QuizAttempt, GeneratedQuiz, LearningEvent, 
        ChatSession, ChatMessage, LearningPath,
        QuizResult, ResourceEvent, GateCalculation, QuizEvaluation,
        MilestoneProgress, GeneratedResource, AnalyticsInsightsCache,
        StudentComparativeMetrics, GenerationQuota, GraphRating,
        PathPreview, StudentSubtopicProgress, ResourceGenerationQueue
    )
    
    # Check if user exists
    result = await db.execute(
        select(UserAccount).where(UserAccount.student_id == student_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    try:
        # Delete ALL tables with FK to student_profiles in dependency order
        
        # Chat messages (depends on chat sessions)
        await db.execute(
            ChatMessage.__table__.delete().where(
                ChatMessage.session_id.in_(
                    select(ChatSession.session_id).where(ChatSession.student_id == student_id)
                )
            )
        )
        
        # Chat sessions
        await db.execute(
            ChatSession.__table__.delete().where(ChatSession.student_id == student_id)
        )
        
        # Quiz attempts
        await db.execute(
            QuizAttempt.__table__.delete().where(QuizAttempt.student_id == student_id)
        )
        
        # Generated quizzes
        await db.execute(
            GeneratedQuiz.__table__.delete().where(GeneratedQuiz.student_id == student_id)
        )
        
        # Quiz results
        await db.execute(
            QuizResult.__table__.delete().where(QuizResult.student_id == student_id)
        )
        
        # Learning events
        await db.execute(
            LearningEvent.__table__.delete().where(LearningEvent.student_id == student_id)
        )
        
        # Resource events
        await db.execute(
            ResourceEvent.__table__.delete().where(ResourceEvent.student_id == student_id)
        )
        
        # Gate calculations
        await db.execute(
            GateCalculation.__table__.delete().where(GateCalculation.student_id == student_id)
        )
        
        # Quiz evaluations
        await db.execute(
            QuizEvaluation.__table__.delete().where(QuizEvaluation.student_id == student_id)
        )
        
        # Milestone progress
        await db.execute(
            MilestoneProgress.__table__.delete().where(MilestoneProgress.student_id == student_id)
        )
        
        # Generated resources
        await db.execute(
            GeneratedResource.__table__.delete().where(GeneratedResource.student_id == student_id)
        )
        
        # Analytics insights cache
        await db.execute(
            AnalyticsInsightsCache.__table__.delete().where(AnalyticsInsightsCache.student_id == student_id)
        )
        
        # Learning paths
        await db.execute(
            LearningPath.__table__.delete().where(LearningPath.student_id == student_id)
        )
        
        # Cohort memberships
        await db.execute(
            CohortMembership.__table__.delete().where(CohortMembership.student_id == student_id)
        )
        
        # Student comparative metrics
        await db.execute(
            StudentComparativeMetrics.__table__.delete().where(StudentComparativeMetrics.student_id == student_id)
        )
        
        # Generation quotas
        await db.execute(
            GenerationQuota.__table__.delete().where(GenerationQuota.student_id == student_id)
        )
        
        # Graph ratings
        await db.execute(
            GraphRating.__table__.delete().where(GraphRating.student_id == student_id)
        )
        
        # Path previews
        await db.execute(
            PathPreview.__table__.delete().where(PathPreview.student_id == student_id)
        )
        
        # Student subtopic progress
        await db.execute(
            StudentSubtopicProgress.__table__.delete().where(StudentSubtopicProgress.student_id == student_id)
        )
        
        # Resource generation queue
        await db.execute(
            ResourceGenerationQueue.__table__.delete().where(ResourceGenerationQueue.student_id == student_id)
        )
        
        # User account (has FK to student_profile) - delete and flush immediately
        await db.delete(user)
        await db.flush()  # Execute the delete before removing the profile
        
        # Student profile LAST
        profile = await db.get(StudentProfile, student_id)
        if profile:
            await db.delete(profile)
        
        await db.commit()
        
        logger.info(f"Deleted account and all data for student: {student_id}")
        return {"message": "Account deleted successfully", "student_id": student_id}
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting account for {student_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete account: {str(e)}",
        )
