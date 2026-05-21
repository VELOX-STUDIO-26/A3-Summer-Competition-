"""
API Router for Cohorts and Comparative Analytics.

Endpoints:
- Cohort management (CRUD)
- Cohort membership
- Comparative analytics
- Anonymized leaderboards
"""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.logging import get_logger
from models.database import (
    Cohort,
    CohortMembership,
    StudentProfile,
    get_db,
)
from analytics.comparative_analytics import get_comparative_engine

logger = get_logger(__name__)
router = APIRouter(prefix="/api/cohorts", tags=["cohorts"])


# ============================================================================
# Pydantic Models
# ============================================================================

class CohortCreate(BaseModel):
    """Request model for creating a cohort."""
    name: str = Field(..., min_length=1, max_length=200)
    course_id: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    allow_leaderboard: bool = True
    min_members_for_comparison: int = 5


class CohortResponse(BaseModel):
    """Response model for cohort data."""
    cohort_id: str
    name: str
    course_id: str
    description: Optional[str]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    is_active: bool
    allow_leaderboard: bool
    min_members_for_comparison: int
    member_count: int = 0
    created_at: datetime


class MembershipCreate(BaseModel):
    """Request model for adding a member to a cohort."""
    student_id: str
    role: str = "student"
    show_in_leaderboard: bool = True


class MembershipResponse(BaseModel):
    """Response model for membership data."""
    student_id: str
    cohort_id: str
    role: str
    show_in_leaderboard: bool
    anonymous_alias: Optional[str]
    joined_at: datetime


class ComparativeMetricsResponse(BaseModel):
    """Response model for comparative metrics."""
    available: bool
    reason: Optional[str] = None
    student_id: Optional[str] = None
    cohort_id: Optional[str] = None
    cohort_name: Optional[str] = None
    cohort_size: Optional[int] = None
    percentiles: Optional[dict] = None
    vs_average: Optional[dict] = None
    rank: Optional[dict] = None


# ============================================================================
# Cohort CRUD Endpoints
# ============================================================================

@router.post("", response_model=CohortResponse, status_code=status.HTTP_201_CREATED)
async def create_cohort(
    cohort_data: CohortCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new cohort."""
    logger.info(f"Creating cohort: {cohort_data.name}")

    cohort = Cohort(
        name=cohort_data.name,
        course_id=cohort_data.course_id,
        description=cohort_data.description,
        start_date=cohort_data.start_date,
        end_date=cohort_data.end_date,
        allow_leaderboard=cohort_data.allow_leaderboard,
        min_members_for_comparison=cohort_data.min_members_for_comparison,
    )
    db.add(cohort)
    await db.commit()
    await db.refresh(cohort)

    return CohortResponse(
        cohort_id=cohort.cohort_id,
        name=cohort.name,
        course_id=cohort.course_id,
        description=cohort.description,
        start_date=cohort.start_date,
        end_date=cohort.end_date,
        is_active=cohort.is_active,
        allow_leaderboard=cohort.allow_leaderboard,
        min_members_for_comparison=cohort.min_members_for_comparison,
        member_count=0,
        created_at=cohort.created_at,
    )


@router.get("", response_model=List[CohortResponse])
async def list_cohorts(
    course_id: Optional[str] = None,
    is_active: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """List all cohorts, optionally filtered by course."""
    query = select(Cohort).where(Cohort.is_active == is_active)
    if course_id:
        query = query.where(Cohort.course_id == course_id)

    result = await db.execute(query)
    cohorts = result.scalars().all()

    responses = []
    for cohort in cohorts:
        # Get member count
        count_result = await db.execute(
            select(CohortMembership).where(
                CohortMembership.cohort_id == cohort.cohort_id,
                CohortMembership.role == "student",
            )
        )
        member_count = len(count_result.scalars().all())

        responses.append(CohortResponse(
            cohort_id=cohort.cohort_id,
            name=cohort.name,
            course_id=cohort.course_id,
            description=cohort.description,
            start_date=cohort.start_date,
            end_date=cohort.end_date,
            is_active=cohort.is_active,
            allow_leaderboard=cohort.allow_leaderboard,
            min_members_for_comparison=cohort.min_members_for_comparison,
            member_count=member_count,
            created_at=cohort.created_at,
        ))

    return responses


@router.get("/{cohort_id}", response_model=CohortResponse)
async def get_cohort(
    cohort_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific cohort by ID."""
    result = await db.execute(
        select(Cohort).where(Cohort.cohort_id == cohort_id)
    )
    cohort = result.scalar_one_or_none()

    if not cohort:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cohort not found: {cohort_id}",
        )

    # Get member count
    count_result = await db.execute(
        select(CohortMembership).where(
            CohortMembership.cohort_id == cohort_id,
            CohortMembership.role == "student",
        )
    )
    member_count = len(count_result.scalars().all())

    return CohortResponse(
        cohort_id=cohort.cohort_id,
        name=cohort.name,
        course_id=cohort.course_id,
        description=cohort.description,
        start_date=cohort.start_date,
        end_date=cohort.end_date,
        is_active=cohort.is_active,
        allow_leaderboard=cohort.allow_leaderboard,
        min_members_for_comparison=cohort.min_members_for_comparison,
        member_count=member_count,
        created_at=cohort.created_at,
    )


# ============================================================================
# Membership Endpoints
# ============================================================================

@router.post("/{cohort_id}/members", response_model=MembershipResponse)
async def add_member(
    cohort_id: str,
    membership: MembershipCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a student to a cohort."""
    # Verify cohort exists
    cohort_result = await db.execute(
        select(Cohort).where(Cohort.cohort_id == cohort_id)
    )
    if not cohort_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cohort not found: {cohort_id}",
        )

    # Verify student exists
    student_result = await db.execute(
        select(StudentProfile).where(StudentProfile.student_id == membership.student_id)
    )
    if not student_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student not found: {membership.student_id}",
        )

    # Check if already a member
    existing = await db.execute(
        select(CohortMembership).where(
            CohortMembership.cohort_id == cohort_id,
            CohortMembership.student_id == membership.student_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student is already a member of this cohort",
        )

    # Generate anonymous alias
    count_result = await db.execute(
        select(CohortMembership).where(CohortMembership.cohort_id == cohort_id)
    )
    member_count = len(count_result.scalars().all())
    alias = f"Student {chr(65 + (member_count % 26))}{member_count // 26 + 1 if member_count >= 26 else ''}"

    # Create membership
    new_membership = CohortMembership(
        cohort_id=cohort_id,
        student_id=membership.student_id,
        role=membership.role,
        show_in_leaderboard=membership.show_in_leaderboard,
        anonymous_alias=alias,
    )
    db.add(new_membership)
    await db.commit()
    await db.refresh(new_membership)

    return MembershipResponse(
        student_id=new_membership.student_id,
        cohort_id=new_membership.cohort_id,
        role=new_membership.role,
        show_in_leaderboard=new_membership.show_in_leaderboard,
        anonymous_alias=new_membership.anonymous_alias,
        joined_at=new_membership.joined_at,
    )


@router.get("/{cohort_id}/members", response_model=List[MembershipResponse])
async def list_members(
    cohort_id: str,
    db: AsyncSession = Depends(get_db),
):
    """List all members of a cohort."""
    result = await db.execute(
        select(CohortMembership).where(CohortMembership.cohort_id == cohort_id)
    )
    members = result.scalars().all()

    return [
        MembershipResponse(
            student_id=m.student_id,
            cohort_id=m.cohort_id,
            role=m.role,
            show_in_leaderboard=m.show_in_leaderboard,
            anonymous_alias=m.anonymous_alias,
            joined_at=m.joined_at,
        )
        for m in members
    ]


@router.delete("/{cohort_id}/members/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    cohort_id: str,
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Remove a student from a cohort."""
    result = await db.execute(
        select(CohortMembership).where(
            CohortMembership.cohort_id == cohort_id,
            CohortMembership.student_id == student_id,
        )
    )
    membership = result.scalar_one_or_none()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found",
        )

    await db.delete(membership)
    await db.commit()


# ============================================================================
# Comparative Analytics Endpoints
# ============================================================================

@router.get("/{cohort_id}/statistics")
async def get_cohort_statistics(
    cohort_id: str,
    refresh: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """
    Get aggregated statistics for a cohort.
    
    Returns mean, median, percentiles for quiz scores, completion rates, etc.
    """
    engine = get_comparative_engine()
    result = await engine.get_cohort_statistics(cohort_id, db, force_refresh=refresh)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cohort not found: {cohort_id}",
        )

    return result


@router.get("/{cohort_id}/leaderboard")
async def get_leaderboard(
    cohort_id: str,
    metric: str = Query("quiz_score", description="Metric to rank by: quiz_score, completion, study_hours"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Get anonymized leaderboard for a cohort.
    
    Students are shown with anonymous aliases unless they opt out.
    """
    engine = get_comparative_engine()
    result = await engine.get_anonymized_leaderboard(cohort_id, db, metric=metric, limit=limit)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cohort not found or leaderboard disabled",
        )

    return result


@router.get("/{cohort_id}/students/{student_id}/comparative")
async def get_student_comparative_metrics(
    cohort_id: str,
    student_id: str,
    refresh: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """
    Get comparative metrics for a student within their cohort.
    
    Returns percentile rankings, comparison to average, and overall rank.
    """
    # Verify student is in cohort
    membership_result = await db.execute(
        select(CohortMembership).where(
            CohortMembership.cohort_id == cohort_id,
            CohortMembership.student_id == student_id,
        )
    )
    if not membership_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student is not a member of this cohort",
        )

    engine = get_comparative_engine()
    result = await engine.get_student_comparative_metrics(
        student_id, cohort_id, db, force_refresh=refresh
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not calculate comparative metrics",
        )

    return result


# ============================================================================
# Student's Cohort Endpoint (for dashboard)
# ============================================================================

@router.get("/student/{student_id}/memberships")
async def get_student_cohorts(
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get all cohorts a student belongs to."""
    result = await db.execute(
        select(CohortMembership).where(CohortMembership.student_id == student_id)
    )
    memberships = result.scalars().all()

    cohorts = []
    for m in memberships:
        cohort_result = await db.execute(
            select(Cohort).where(Cohort.cohort_id == m.cohort_id)
        )
        cohort = cohort_result.scalar_one_or_none()
        if cohort:
            cohorts.append({
                "cohort_id": cohort.cohort_id,
                "name": cohort.name,
                "course_id": cohort.course_id,
                "role": m.role,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            })

    return {"student_id": student_id, "cohorts": cohorts}
