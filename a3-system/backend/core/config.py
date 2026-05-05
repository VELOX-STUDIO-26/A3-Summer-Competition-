"""
Core configuration module for the A3 Learning System.

This module handles:
- Application settings (Pydantic Settings)
- Logging configuration
- Database connection settings
- LLM API keys and configurations
"""

import logging
import sys
from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root directory
PROJECT_ROOT = Path(__file__).parent.parent.parent


class DatabaseSettings(BaseSettings):
    """Database connection settings."""

    model_config = SettingsConfigDict(env_prefix="DB_")

    user: str = Field(default="a3_user", description="Database username")
    password: str = Field(default="a3_password", description="Database password")
    name: str = Field(default="a3_db", description="Database name")
    host: str = Field(default="localhost", description="Database host")
    port: int = Field(default=5432, description="Database port")
    
    # Connection pool settings - tune based on load testing
    pool_size: int = Field(default=10, description="Database connection pool size")
    max_overflow: int = Field(default=20, description="Max overflow connections beyond pool_size")
    pool_recycle: int = Field(default=3600, description="Recycle connections after N seconds")
    connect_timeout: int = Field(default=10, description="Connection timeout in seconds")

    @property
    def async_url(self) -> str:
        """Generate async PostgreSQL URL."""
        return f"postgresql+asyncpg://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"

    @property
    def sync_url(self) -> str:
        """Generate sync PostgreSQL URL."""
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"


class RedisSettings(BaseSettings):
    """Redis cache settings."""

    model_config = SettingsConfigDict(env_prefix="REDIS_")

    host: str = Field(default="localhost", description="Redis host")
    port: int = Field(default=6379, description="Redis port")
    db: int = Field(default=0, description="Redis database number")

    @property
    def url(self) -> str:
        """Generate Redis URL."""
        return f"redis://{self.host}:{self.port}/{self.db}"


class WeaviateSettings(BaseSettings):
    """Weaviate vector database settings."""

    model_config = SettingsConfigDict(env_prefix="WEAVIATE_")

    url: str = Field(default="http://localhost:8080", description="Weaviate URL")
    grpc_port: int = Field(default=50051, description="Weaviate gRPC port")

    @property
    def host(self) -> str:
        """Extract host from URL."""
        from urllib.parse import urlparse
        return urlparse(self.url).hostname or "localhost"

    @property
    def port(self) -> int:
        """Extract port from URL."""
        from urllib.parse import urlparse
        parsed = urlparse(self.url)
        return parsed.port or 8080


class LLMSettings(BaseSettings):
    """LLM API settings."""

    model_config = SettingsConfigDict(
        env_prefix="OPENROUTER_",
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # OpenRouter (Primary - Free tier)
    api_key: Optional[str] = Field(default=None, description="OpenRouter API key")
    api_key_fallback: Optional[str] = Field(default=None, description="Secondary OpenRouter API key used when the primary is rate-limited or invalid")
    model: str = Field(default="meta-llama/llama-3.1-70b-instruct", description="OpenRouter model")
    embedding_model: str = Field(default="nvidia/llama-nemotron-embed-vl-1b-v2:free", description="OpenRouter embedding model (free tier)")

    # OpenAI (Optional)
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")
    openai_model: str = Field(default="gpt-3.5-turbo", description="OpenAI model")

    # iFlytek Spark (Optional - for production/competition)
    spark_app_id: Optional[str] = Field(default=None, description="iFlytek Spark App ID")
    spark_api_key: Optional[str] = Field(default=None, description="iFlytek Spark API Key")
    spark_api_secret: Optional[str] = Field(default=None, description="iFlytek Spark API Secret")


class TTSSettings(BaseSettings):
    """Text-to-Speech settings."""

    tts_provider: str = Field(default="edge", description="TTS provider (edge or iflytek)")
    tts_voice: str = Field(default="zh-CN-XiaoxiaoNeural", description="TTS voice")


class SecuritySettings(BaseSettings):
    """Security settings."""

    secret_key: str = Field(
        default="dev-only-insecure-key-change-in-production",
        description="Secret key for JWT. Set JWT_SECRET_KEY env var in production!"
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(default=30, description="Access token expiration in minutes")
    
    # CORS settings - comma-separated list of allowed origins
    # Set CORS_ORIGINS env var in production (e.g., "https://example.com,https://app.example.com")
    cors_origins: str = Field(
        default="*",
        description="Comma-separated list of allowed CORS origins. Use '*' for development only!"
    )

    model_config = SettingsConfigDict(env_prefix="")


class Settings(BaseSettings):
    """
    Main application settings.

    Loads configuration from environment variables and .env files.
    """

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Allow extra fields in env
    )

    # Application settings
    app_name: str = Field(default="A3 Learning System", description="Application name")
    app_version: str = Field(default="1.0.0", description="Application version")
    environment: str = Field(default="development", description="Environment (development, staging, production)")
    debug: bool = Field(default=True, description="Debug mode")
    log_level: str = Field(default="info", description="Logging level")

    # Server settings
    api_port: int = Field(default=8000, description="API server port")
    api_host: str = Field(default="0.0.0.0", description="API server host")

    # Sub-settings
    db: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    weaviate: WeaviateSettings = Field(default_factory=WeaviateSettings)
    llm: LLMSettings = Field(default_factory=LLMSettings)
    tts: TTSSettings = Field(default_factory=TTSSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)

    # Judge0 Code Execution API
    judge0_api_key: Optional[str] = Field(default=None, description="Judge0 RapidAPI key")
    judge0_daily_limit: int = Field(default=50, description="Daily submission limit (free tier = 50)")

    # Hallucination Mitigation Settings
    enable_faithfulness_check: bool = Field(default=True, description="Enable faithfulness checking for AI-generated content")
    faithfulness_threshold: float = Field(default=0.8, ge=0.0, le=1.0, description="Minimum faithfulness score (0.0-1.0) to avoid warnings")

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment value."""
        allowed = {"development", "staging", "production", "testing"}
        if v.lower() not in allowed:
            raise ValueError(f"Environment must be one of {allowed}, got {v}")
        return v.lower()

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level."""
        allowed = {"debug", "info", "warning", "error", "critical"}
        if v.lower() not in allowed:
            raise ValueError(f"Log level must be one of {allowed}, got {v}")
        return v.lower()

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.environment == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment == "production"


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Uses lru_cache to avoid reloading settings on every call.
    """
    return Settings()


# Export settings instance for easy import
settings = get_settings()
