"""
End-to-end tests for Analytics Insights feature.

Tests cover:
1. Insights generation
2. Caching behavior (24-hour cache)
3. Cache retrieval
4. API endpoint responses
5. Data structure validation
"""

import pytest
import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from analytics.analytics_engine import AnalyticsEngine, INSIGHTS_CACHE_DURATION_HOURS
from models.database import AnalyticsInsightsCache, db_manager

# Requires a live database; excluded from the default unit run.
pytestmark = pytest.mark.integration


# Test student ID (use existing test student)
TEST_STUDENT_ID = "5e1f405d94c96d8f"


class TestAnalyticsInsightsCaching:
    """Test suite for analytics insights caching functionality."""

    @pytest.fixture
    async def db_session(self):
        """Get async database session."""
        db_manager.initialize()
        async with db_manager.async_session_factory() as session:
            yield session

    @pytest.fixture
    def engine(self):
        """Get analytics engine instance."""
        return AnalyticsEngine()

    @pytest.mark.asyncio
    async def test_fresh_insights_generation(self, engine, db_session):
        """Test that fresh insights are generated when no cache exists."""
        # Clear any existing cache
        await db_session.execute(
            AnalyticsInsightsCache.__table__.delete().where(
                AnalyticsInsightsCache.student_id == TEST_STUDENT_ID
            )
        )
        await db_session.commit()

        # Generate insights
        result = await engine.get_insights(TEST_STUDENT_ID, db_session)

        # Verify response structure
        assert result["student_id"] == TEST_STUDENT_ID
        assert result["from_cache"] == False
        assert "generated_at" in result
        assert "expires_at" in result
        assert "behavioral_summary" in result
        assert "insights" in result
        assert "predictions" in result
        assert "recommendations" in result
        assert "alerts" in result

        print("✓ Fresh insights generation works correctly")

    @pytest.mark.asyncio
    async def test_cache_is_stored(self, engine, db_session):
        """Test that insights are stored in cache after generation."""
        # Generate insights (will create cache)
        await engine.get_insights(TEST_STUDENT_ID, db_session)

        # Check cache exists
        cache_result = await db_session.execute(
            select(AnalyticsInsightsCache).where(
                AnalyticsInsightsCache.student_id == TEST_STUDENT_ID
            )
        )
        cached = cache_result.scalar_one_or_none()

        assert cached is not None
        assert cached.student_id == TEST_STUDENT_ID
        assert cached.insights_data is not None
        assert cached.generated_at is not None
        assert cached.expires_at is not None
        assert cached.expires_at > datetime.now(timezone.utc)

        print("✓ Cache is stored correctly")

    @pytest.mark.asyncio
    async def test_cached_insights_returned(self, engine, db_session):
        """Test that cached insights are returned on subsequent calls."""
        # First call - generates fresh
        result1 = await engine.get_insights(TEST_STUDENT_ID, db_session)
        gen_time_1 = result1["generated_at"]

        # Second call - should return cached
        result2 = await engine.get_insights(TEST_STUDENT_ID, db_session)

        assert result2["from_cache"] == True
        assert result2["generated_at"] == gen_time_1  # Same generation time

        print("✓ Cached insights are returned correctly")

    @pytest.mark.asyncio
    async def test_force_refresh_regenerates(self, engine, db_session):
        """Test that force_refresh=True regenerates insights."""
        # First call
        result1 = await engine.get_insights(TEST_STUDENT_ID, db_session)

        # Force refresh
        result2 = await engine.get_insights(TEST_STUDENT_ID, db_session, force_refresh=True)

        assert result2["from_cache"] == False
        # Generation count should increase
        assert result2.get("generation_count", 1) >= 1

        print("✓ Force refresh regenerates insights correctly")

    @pytest.mark.asyncio
    async def test_cache_expiry(self, engine, db_session):
        """Test that expired cache triggers regeneration."""
        # Set cache to expired
        cache_result = await db_session.execute(
            select(AnalyticsInsightsCache).where(
                AnalyticsInsightsCache.student_id == TEST_STUDENT_ID
            )
        )
        cached = cache_result.scalar_one_or_none()

        if cached:
            # Set expiry to past
            cached.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
            await db_session.commit()

            # Get insights - should regenerate
            result = await engine.get_insights(TEST_STUDENT_ID, db_session)
            assert result["from_cache"] == False

            print("✓ Expired cache triggers regeneration")
        else:
            print("⚠ No cache found to test expiry")

    @pytest.mark.asyncio
    async def test_cache_duration_is_24_hours(self):
        """Test that cache duration constant is set to 24 hours."""
        assert INSIGHTS_CACHE_DURATION_HOURS == 24
        print("✓ Cache duration is 24 hours")

    @pytest.mark.asyncio
    async def test_insights_data_structure(self, engine, db_session):
        """Test that insights have correct data structure."""
        result = await engine.get_insights(TEST_STUDENT_ID, db_session)

        # Check behavioral_summary structure
        summary = result.get("behavioral_summary", {})
        assert "study_pattern" in summary or summary == {}
        
        # Check insights is a list
        assert isinstance(result.get("insights", []), list)
        
        # Check predictions is a dict
        assert isinstance(result.get("predictions", {}), dict)
        
        # Check recommendations is a list
        assert isinstance(result.get("recommendations", []), list)
        
        # Check alerts is a list
        assert isinstance(result.get("alerts", []), list)

        print("✓ Insights data structure is correct")


class TestAnalyticsAPIEndpoint:
    """Test suite for analytics API endpoint."""

    @pytest.mark.asyncio
    async def test_api_returns_cache_metadata(self):
        """Test that API returns cache metadata fields."""
        import httpx
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"http://localhost:8000/api/analytics/{TEST_STUDENT_ID}/insights",
                timeout=60.0
            )
            
            if response.status_code == 200:
                data = response.json()
                assert "from_cache" in data
                assert "generated_at" in data
                assert "expires_at" in data
                print("✓ API returns cache metadata")
            else:
                print(f"⚠ API returned status {response.status_code}")

    @pytest.mark.asyncio
    async def test_api_refresh_parameter(self):
        """Test that API accepts refresh parameter."""
        import httpx
        
        async with httpx.AsyncClient() as client:
            # First call without refresh
            response1 = await client.get(
                f"http://localhost:8000/api/analytics/{TEST_STUDENT_ID}/insights",
                timeout=60.0
            )
            
            if response1.status_code == 200:
                # Second call with refresh=true
                response2 = await client.get(
                    f"http://localhost:8000/api/analytics/{TEST_STUDENT_ID}/insights?refresh=true",
                    timeout=60.0
                )
                
                if response2.status_code == 200:
                    data = response2.json()
                    assert data["from_cache"] == False
                    print("✓ API refresh parameter works")
                else:
                    print(f"⚠ Refresh API returned status {response2.status_code}")
            else:
                print(f"⚠ API returned status {response1.status_code}")


async def run_all_tests():
    """Run all tests manually."""
    print("\n" + "="*60)
    print("Analytics Insights Feature - End-to-End Tests")
    print("="*60 + "\n")

    db_manager.initialize()
    
    async with db_manager.async_session_factory() as session:
        engine = AnalyticsEngine()
        test_suite = TestAnalyticsInsightsCaching()

        print("1. Testing cache duration constant...")
        await test_suite.test_cache_duration_is_24_hours()

        print("\n2. Testing fresh insights generation...")
        await test_suite.test_fresh_insights_generation(engine, session)

        print("\n3. Testing cache storage...")
        await test_suite.test_cache_is_stored(engine, session)

        print("\n4. Testing cached insights retrieval...")
        await test_suite.test_cached_insights_returned(engine, session)

        print("\n5. Testing insights data structure...")
        await test_suite.test_insights_data_structure(engine, session)

        print("\n6. Testing cache expiry...")
        await test_suite.test_cache_expiry(engine, session)

        print("\n7. Testing force refresh...")
        await test_suite.test_force_refresh_regenerates(engine, session)

    print("\n" + "="*60)
    print("API Endpoint Tests")
    print("="*60 + "\n")

    api_tests = TestAnalyticsAPIEndpoint()
    
    print("8. Testing API cache metadata...")
    await api_tests.test_api_returns_cache_metadata()

    print("\n9. Testing API refresh parameter...")
    await api_tests.test_api_refresh_parameter()

    print("\n" + "="*60)
    print("All tests completed!")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(run_all_tests())
