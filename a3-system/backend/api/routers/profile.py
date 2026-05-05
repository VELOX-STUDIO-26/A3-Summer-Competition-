"""
Profile API Router for A3 Learning System.

Endpoints:
- POST /api/profile       : Create or update a student profile
- GET  /api/profile/{id}  : Retrieve a student profile
- DELETE /api/profile/{id}: Delete a student profile
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import get_logger
from models.database import DatabaseManager, StudentProfile as StudentProfileDB, db_manager
from models.schemas import StudentProfileCreate, StudentProfile as StudentProfileSchema

logger = get_logger(__name__)
router = APIRouter()


def get_db() -> AsyncSession:
    """Dependency to get async database session."""
    db_manager.initialize()
    return db_manager.get_async_session()


@router.post("", response_model=StudentProfileSchema, status_code=status.HTTP_201_CREATED)
async def create_or_update_profile(profile: StudentProfileCreate):
    """Create or update a student profile.

    If a profile with the same student_id exists, it will be updated.
    Otherwise, a new profile is created.
    """
    logger.info(f"Received profile creation request for student: {profile.student_id}")

    try:
        db_manager.initialize()
        async with await db_manager.get_async_session() as session:
            existing = await session.get(StudentProfileDB, profile.student_id)

            if existing:
                # Update existing profile
                existing.cognitive_style = profile.cognitive_style.value
                existing.learning_pace = profile.learning_pace
                existing.content_preferences = [cp.value for cp in profile.content_preferences]
                existing.knowledge_base = profile.knowledge_base
                existing.weak_points = profile.weak_points
                existing.goals = profile.goals
                existing.version += 1

                await session.commit()
                await session.refresh(existing)
                logger.info(f"Updated profile for student {profile.student_id}")
                return existing
            else:
                # Create new profile
                new_profile = StudentProfileDB(
                    student_id=profile.student_id,
                    cognitive_style=profile.cognitive_style.value,
                    learning_pace=profile.learning_pace,
                    content_preferences=[cp.value for cp in profile.content_preferences],
                    knowledge_base=profile.knowledge_base,
                    weak_points=profile.weak_points,
                    goals=profile.goals,
                    version=1
                )
                session.add(new_profile)
                await session.commit()
                await session.refresh(new_profile)
                logger.info(f"Created profile for student {profile.student_id}")
                return new_profile
    except Exception as e:
        logger.error(f"Error creating/updating profile: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.get("/{student_id}", response_model=StudentProfileSchema)
async def get_profile(student_id: str):
    """Retrieve a student profile by ID."""
    logger.info(f"Fetching profile for student: {student_id}")

    try:
        db_manager.initialize()
        async with await db_manager.get_async_session() as session:
            profile = await session.get(StudentProfileDB, student_id)
            if not profile:
                logger.warning(f"Profile not found for student {student_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Profile not found for student {student_id}"
                )
            logger.info(f"Found profile for student {student_id}")
            return profile
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching profile for {student_id}: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(student_id: str):
    """Delete a student profile by ID."""
    db_manager.initialize()
    async with await db_manager.get_async_session() as session:
        profile = await session.get(StudentProfileDB, student_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Profile not found for student {student_id}"
            )
        await session.delete(profile)
        await session.commit()
        logger.info(f"Deleted profile for student {student_id}")
        return None
