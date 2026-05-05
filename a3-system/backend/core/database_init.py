"""
Database initialization script.

Creates all tables, sets up initial data, and creates the first admin user.
Run this after starting PostgreSQL to initialize the database.
"""

import asyncio
import logging
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.logging import get_logger
from models.database import Base, DatabaseManager, db_manager

logger = get_logger(__name__)


async def init_database():
    """Initialize database schema and seed initial data."""
    logger.info("Initializing database...")

    # Initialize database manager
    db_manager.initialize()

    # Create all tables
    async with db_manager.async_engine.begin() as conn:
        logger.info("Creating database tables...")
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database tables created successfully!")

    # Seed initial data
    await seed_initial_data()

    logger.info("Database initialization complete!")


async def seed_initial_data():
    """Seed initial data for testing."""
    logger.info("Seeding initial data...")

    async with await db_manager.get_async_session() as session:
        # Seed course
        from models.database import Course

        # Check if course already exists
        course = await session.get(Course, "cloud-computing")
        if not course:
            course = Course(
                course_id="cloud-computing",
                name="Cloud Computing Fundamentals",
                description="Comprehensive course covering cloud computing concepts, virtualization, containers, and orchestration",
                total_nodes=20,
                is_active=True
            )
            session.add(course)
            await session.commit()
            logger.info("Created initial course: cloud-computing")

        # Seed a test student profile
        from models.database import StudentProfile

        test_student = await session.get(StudentProfile, "test_student_001")
        if not test_student:
            student = StudentProfile(
                student_id="test_student_001",
                knowledge_base={},
                cognitive_style="visual",
                weak_points=[],
                goals=["learn_cloud_basics"],
                learning_pace=0.5,
                content_preferences=["video", "diagram", "text"],
                version=1
            )
            session.add(student)
            await session.commit()
            logger.info("Created test student: test_student_001")

    logger.info("Initial data seeding complete!")


async def drop_database():
    """Drop all tables (use with caution!)."""
    logger.warning("Dropping all database tables...")

    db_manager.initialize()

    async with db_manager.async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    logger.warning("All tables dropped!")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--drop":
        # Drop all tables
        asyncio.run(drop_database())
    else:
        # Initialize database
        asyncio.run(init_database())
