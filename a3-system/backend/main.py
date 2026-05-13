"""
A3 Learning System - Adaptive Path Planning API

This is the main FastAPI application for the A3 learning system,
providing personalized learning path generation and resource management.
"""

import os
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load .env into os.environ BEFORE importing any module that reads env vars
# at import time (e.g. tts_client / asr_client construct their singletons
# via os.getenv during module load). pydantic-settings already reads .env
# into its Settings objects, but those values never reach os.environ.
from dotenv import load_dotenv  # noqa: E402
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
load_dotenv(os.path.join(_PROJECT_ROOT, ".env"))

# Import core components
from core.config import settings
from core.database_init import init_database
from core.llm_client import llm_client
from core.logging import configure_logging, get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup: Initialize connections, load data, etc.
    print("Starting up A3 Learning System...")
    logger.info("Starting up A3 Learning System...")

    # Configure logging
    configure_logging()

    # Initialize database
    try:
        await init_database()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        # Continue anyway - tables can be created manually

    # Initialize LLM client
    try:
        llm_status = await llm_client.health_check()
        logger.info(f"LLM client status: {llm_status['status']}")
    except Exception as e:
        logger.warning(f"LLM client initialization failed: {e}")

    print("Startup complete!")
    logger.info("Startup complete!")

    yield

    # Shutdown: Cleanup connections
    print("Shutting down A3 Learning System...")
    logger.info("Shutting down A3 Learning System...")

    # Close database connections
    try:
        from models.database import db_manager
        await db_manager.close()
        logger.info("Database connections closed")
    except Exception as e:
        logger.warning(f"Error closing database connections: {e}")

    print("Shutdown complete!")
    logger.info("Shutdown complete!")


# Create FastAPI application
app = FastAPI(
    title="A3 Learning System API",
    description="""
    Adaptive learning path planning and personalized resource generation system.

    ## Features

    - **Conversational Profiling**: Extract learner attributes through natural chat
    - **Multi-Agent Resources**: Generate personalized content via AI agents
    - **Adaptive Path Planning**: A* algorithm with profile-driven personalization
    - **Real-Time Tutoring**: Context-aware AI assistance
    - **Learning Analytics**: Behavioral analysis and dynamic adaptation
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware with configurable origins
# Set CORS_ORIGINS env var in production (e.g., "https://example.com,https://app.example.com")
cors_origins = settings.security.cors_origins
if cors_origins == "*":
    allowed_origins = ["*"]
    logger.warning("CORS is configured to allow all origins. Set CORS_ORIGINS env var in production!")
else:
    allowed_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
    logger.info(f"CORS configured for origins: {allowed_origins}")

# NOTE: middleware order matters. add_middleware prepends to the stack, so
# the LAST one added becomes the OUTERMOST. CORS must be outermost so its
# headers are attached to every response (including 429/500 from the rate
# limiter and other middleware errors).
# Simple in-memory rate limiting
from collections import defaultdict
from time import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple rate limiting middleware - 100 requests per minute per IP."""
    
    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests: dict = defaultdict(list)
    
    async def dispatch(self, request, call_next):
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
        
        client_ip = request.client.host if request.client else "unknown"
        now = time()
        minute_ago = now - 60
        
        # Clean old requests
        self.requests[client_ip] = [t for t in self.requests[client_ip] if t > minute_ago]
        
        # Check rate limit
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please try again later."}
            )
        
        # Record this request
        self.requests[client_ip].append(now)
        
        return await call_next(request)

# Add rate limiting middleware (100 requests/minute per IP) FIRST so it
# runs INSIDE CORSMiddleware (which we add last so it stays outermost).
app.add_middleware(RateLimitMiddleware, requests_per_minute=100)

# CORS added LAST = outermost middleware → headers attached to all responses
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check endpoint to verify the API and its dependencies are running.
    """
    overall_healthy = True

    # Check LLM health
    try:
        llm_status = await llm_client.health_check()
    except Exception as e:
        llm_status = {"status": "unhealthy", "error": str(e)}
        overall_healthy = False

    # Check database health
    try:
        from models.database import db_manager
        from sqlalchemy import text
        session = await db_manager.get_async_session()
        try:
            await session.execute(text("SELECT 1"))
            db_status = {"status": "healthy"}
        finally:
            await session.close()
    except Exception as e:
        db_status = {"status": "unhealthy", "error": str(e)}
        overall_healthy = False

    return {
        "status": "healthy" if overall_healthy else "degraded",
        "service": "a3-learning-system",
        "version": "1.0.0",
        "environment": settings.environment,
        "dependencies": {
            "llm": llm_status,
            "database": db_status
        }
    }


# Root endpoint
@app.get("/", tags=["System"])
async def root():
    """
    Root endpoint with API information.
    """
    return {
        "name": "A3 Learning System API",
        "version": "1.0.0",
        "description": "Adaptive learning path planning and personalized resource generation",
        "documentation": "/docs",
        "health": "/health",
    }


# Import and include routers
from api.routers import chat, profile, path
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(path.router, prefix="/api/path", tags=["Path Planning"])

# Week 3+ Routers
from api.routers import resources
app.include_router(resources.router, prefix="/api/resources", tags=["Resources"])

# Tutor Router
from api.routers import tutor, tutor_sessions
app.include_router(tutor.router, prefix="/api/tutor", tags=["Tutoring"])
app.include_router(
    tutor_sessions.router,
    prefix="/api/tutor",
    tags=["Tutoring Sessions"],
)

# Analytics Router
from api.routers import analytics
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])

# Quiz Router
from api.routers import quiz
app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])

# Milestone Router
from api.routers import milestone
app.include_router(milestone.router, prefix="/api/milestone", tags=["Milestone"])

# Auth Router
from api.routers import auth
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])

# TTS Router
from api.routers import tts
app.include_router(tts.router, tags=["Text-to-Speech"])

# Tracking Router (Resource engagement and evaluation)
from api.routers import tracking
app.include_router(tracking.router, prefix="/api/tracking", tags=["Tracking"])

# Adaptation Router (DynamicAdaptationEngine + Recommender)
from api.routers import adaptation
app.include_router(adaptation.router, prefix="/api/adapt", tags=["Adaptation"])

# ASR Router (iFlytek IST speech transcription)
from api.routers import asr
app.include_router(asr.router, prefix="/api/asr", tags=["ASR"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
