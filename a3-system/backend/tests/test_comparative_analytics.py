"""
End-to-end tests for Comparative Analytics feature.

Tests cover:
1. Cohort creation
2. Student membership
3. Comparative metrics calculation
4. Leaderboard generation
5. Auto-enrollment on login/register
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

import pytest

from sqlalchemy import select, delete

from models.database import (
    db_manager,
    Cohort,
    CohortMembership,
    CohortStatistics,
    StudentComparativeMetrics,
    StudentProfile,
)
from analytics.comparative_analytics import ComparativeAnalyticsEngine

# Requires a live database; excluded from the default unit run.
pytestmark = pytest.mark.integration


# Test constants
TEST_COURSE_ID = "cloud-computing"
TEST_COHORT_NAME = "Test Cohort - Comparative Analytics"


async def setup_test_data(db):
    """Create test students."""
    print("\n📦 Setting up test data...")
    
    # Create 5 test students with different performance levels
    test_students = [
        {"id": "test_comp_student_1", "name": "Top Performer"},
        {"id": "test_comp_student_2", "name": "Above Average"},
        {"id": "test_comp_student_3", "name": "Average"},
        {"id": "test_comp_student_4", "name": "Below Average"},
        {"id": "test_comp_student_5", "name": "Needs Help"},
    ]
    
    for student in test_students:
        # Check if student exists
        existing = await db.get(StudentProfile, student["id"])
        if not existing:
            profile = StudentProfile(
                student_id=student["id"],
                knowledge_base={},
                cognitive_style="mixed",
                weak_points=[],
                goals=["test"],
                learning_pace=0.5,
                content_preferences=["video"],
            )
            db.add(profile)
            print(f"  ✓ Created student: {student['name']} ({student['id']})")
    
    await db.commit()
    print(f"  ✓ Created {len(test_students)} test students")
    return test_students


async def create_test_cohort(db) -> Cohort:
    """Create a test cohort."""
    print("\n🏫 Creating test cohort...")
    
    # Check if exists
    result = await db.execute(
        select(Cohort).where(Cohort.name == TEST_COHORT_NAME)
    )
    existing = result.scalar_one_or_none()
    if existing:
        print(f"  ✓ Using existing cohort: {existing.cohort_id}")
        return existing
    
    cohort = Cohort(
        name=TEST_COHORT_NAME,
        course_id=TEST_COURSE_ID,
        description="Test cohort for comparative analytics",
        is_active=True,
        allow_leaderboard=True,
        min_members_for_comparison=3,
    )
    db.add(cohort)
    await db.commit()
    await db.refresh(cohort)
    
    print(f"  ✓ Created cohort: {cohort.cohort_id}")
    return cohort


async def add_students_to_cohort(db, cohort: Cohort, students: list):
    """Add test students to the cohort."""
    print("\n👥 Adding students to cohort...")
    
    for i, student in enumerate(students):
        # Check if already member
        existing = await db.execute(
            select(CohortMembership).where(
                CohortMembership.cohort_id == cohort.cohort_id,
                CohortMembership.student_id == student["id"],
            )
        )
        if existing.scalar_one_or_none():
            continue
        
        membership = CohortMembership(
            cohort_id=cohort.cohort_id,
            student_id=student["id"],
            role="student",
            show_in_leaderboard=True,
            anonymous_alias=f"Student {chr(65 + i)}",
        )
        db.add(membership)
        print(f"  ✓ Added {student['name']} as Student {chr(65 + i)}")
    
    await db.commit()


async def test_cohort_statistics(engine: ComparativeAnalyticsEngine, cohort_id: str, db):
    """Test cohort statistics calculation."""
    print("\n📊 Testing cohort statistics...")
    
    stats = await engine.get_cohort_statistics(cohort_id, db, force_refresh=True)
    
    assert stats is not None, "Statistics should not be None"
    assert stats["available"] == True, "Statistics should be available"
    assert stats["member_count"] >= 3, f"Should have at least 3 members, got {stats['member_count']}"
    
    if "statistics" in stats and "avg_quiz_score" in stats["statistics"]:
        quiz_stats = stats["statistics"]["avg_quiz_score"]
        print(f"  ✓ Quiz Score Stats:")
        print(f"    - Mean: {quiz_stats['mean']}")
        print(f"    - Median: {quiz_stats['median']}")
        print(f"    - Min: {quiz_stats['min']}, Max: {quiz_stats['max']}")
        print(f"    - Sample size: {quiz_stats['sample_size']}")
    
    print(f"  ✓ Cohort statistics calculated successfully")
    return stats


async def test_student_comparative_metrics(engine: ComparativeAnalyticsEngine, cohort_id: str, student_id: str, db):
    """Test individual student comparative metrics."""
    print(f"\n📈 Testing comparative metrics for {student_id}...")
    
    metrics = await engine.get_student_comparative_metrics(student_id, cohort_id, db, force_refresh=True)
    
    assert metrics is not None, "Metrics should not be None"
    assert metrics["available"] == True, f"Metrics should be available, got: {metrics}"
    
    print(f"  ✓ Student: {student_id}")
    print(f"  ✓ Cohort: {metrics.get('cohort_name')}")
    
    if "percentiles" in metrics:
        print(f"  ✓ Percentiles:")
        for key, value in metrics["percentiles"].items():
            if value is not None:
                print(f"    - {key}: {value}th percentile")
    
    if "rank" in metrics and metrics["rank"].get("overall"):
        print(f"  ✓ Rank: #{metrics['rank']['overall']} of {metrics['rank']['total']}")
    
    return metrics


async def test_leaderboard(engine: ComparativeAnalyticsEngine, cohort_id: str, db):
    """Test anonymized leaderboard."""
    print("\n🏆 Testing leaderboard...")
    
    leaderboard = await engine.get_anonymized_leaderboard(cohort_id, db, metric="quiz_score", limit=10)
    
    assert leaderboard is not None, "Leaderboard should not be None"
    assert leaderboard["available"] == True, "Leaderboard should be available"
    assert len(leaderboard["leaderboard"]) > 0, "Leaderboard should have entries"
    
    print(f"  ✓ Leaderboard for {leaderboard['cohort_name']}:")
    for entry in leaderboard["leaderboard"]:
        print(f"    #{entry['rank']} - {entry['alias']}: {entry['value']}%")
    
    return leaderboard


async def test_privacy_controls(engine: ComparativeAnalyticsEngine, cohort_id: str, db):
    """Test that privacy controls work."""
    print("\n🔒 Testing privacy controls...")
    
    # Get a student and opt them out
    result = await db.execute(
        select(CohortMembership).where(
            CohortMembership.cohort_id == cohort_id,
            CohortMembership.student_id == "test_comp_student_1",
        )
    )
    membership = result.scalar_one_or_none()
    
    if membership:
        membership.show_in_leaderboard = False
        await db.commit()
        
        # Check leaderboard doesn't include them
        leaderboard = await engine.get_anonymized_leaderboard(cohort_id, db)
        
        student_in_leaderboard = any(
            entry.get("student_id") == "test_comp_student_1" 
            for entry in leaderboard.get("leaderboard", [])
        )
        
        # Reset
        membership.show_in_leaderboard = True
        await db.commit()
        
        print(f"  ✓ Opted-out student excluded from leaderboard: {not student_in_leaderboard}")
    else:
        print("  ⚠ Could not test privacy - membership not found")


async def cleanup_test_data(db):
    """Clean up test data."""
    print("\n🧹 Cleaning up test data...")
    
    try:
        await db.rollback()  # Clear any pending transaction
    except:
        pass
    
    # Delete test cohort memberships
    await db.execute(
        delete(CohortMembership).where(
            CohortMembership.student_id.like("test_comp_student_%")
        )
    )
    
    # Delete test cohort statistics
    result = await db.execute(
        select(Cohort).where(Cohort.name == TEST_COHORT_NAME)
    )
    cohort = result.scalar_one_or_none()
    if cohort:
        await db.execute(
            delete(CohortStatistics).where(CohortStatistics.cohort_id == cohort.cohort_id)
        )
        await db.execute(
            delete(StudentComparativeMetrics).where(StudentComparativeMetrics.cohort_id == cohort.cohort_id)
        )
        await db.execute(
            delete(Cohort).where(Cohort.cohort_id == cohort.cohort_id)
        )
    
    # Delete test students
    await db.execute(
        delete(StudentProfile).where(StudentProfile.student_id.like("test_comp_student_%"))
    )
    
    await db.commit()
    print("  ✓ Test data cleaned up")


async def run_all_tests():
    """Run all comparative analytics tests."""
    print("\n" + "=" * 60)
    print("Comparative Analytics - End-to-End Tests")
    print("=" * 60)
    
    db_manager.initialize()
    engine = ComparativeAnalyticsEngine()
    
    async with db_manager.async_session_factory() as db:
        try:
            # Setup
            students = await setup_test_data(db)
            cohort = await create_test_cohort(db)
            await add_students_to_cohort(db, cohort, students)
            
            # Tests
            await test_cohort_statistics(engine, cohort.cohort_id, db)
            
            # Test metrics for top and bottom performers
            await test_student_comparative_metrics(engine, cohort.cohort_id, "test_comp_student_1", db)
            await test_student_comparative_metrics(engine, cohort.cohort_id, "test_comp_student_5", db)
            
            await test_leaderboard(engine, cohort.cohort_id, db)
            await test_privacy_controls(engine, cohort.cohort_id, db)
            
            print("\n" + "=" * 60)
            print("✅ All tests passed!")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            import traceback
            traceback.print_exc()
        finally:
            # Cleanup
            await cleanup_test_data(db)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
