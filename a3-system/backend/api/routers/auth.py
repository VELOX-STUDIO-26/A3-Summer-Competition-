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
from models.database import StudentProfile, UserAccount, get_db

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

    logger.info(f"User logged in: {user.student_id}")

    return AuthResponse(
        student_id=user.student_id,
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
