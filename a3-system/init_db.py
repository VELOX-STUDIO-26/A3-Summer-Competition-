"""
Initialize database tables for A3 Learning System
"""
import asyncio
import sys
import os

# Add backend to path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)

from sqlalchemy.ext.asyncio import create_async_engine
from models.database import Base
from core.config import settings

async def create_tables():
    """Create all database tables."""
    print(f"Connecting to database: {settings.db.host}:{settings.db.port}")
    engine = create_async_engine(settings.db.async_url, echo=False)

    async with engine.begin() as conn:
        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)

    await engine.dispose()
    print("Database tables created successfully!")

if __name__ == "__main__":
    asyncio.run(create_tables())
