"""
Logging configuration for the A3 Learning System.

Provides structured logging with consistent formatting across the application.
"""

import logging
import sys
from typing import Any, Dict, Optional

import structlog

from core.config import settings


def configure_logging() -> None:
    """
    Configure logging for the application.

    Sets up both standard library logging and structlog for structured logging.
    """
    # Configure standard library logging
    logging.basicConfig(
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        level=getattr(logging, settings.log_level.upper()),
        stream=sys.stdout,
    )

    # Configure structlog for structured logging
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer() if not settings.is_development else structlog.dev.ConsoleRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def get_logger(name: Optional[str] = None) -> structlog.stdlib.BoundLogger:
    """
    Get a structured logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        A structlog BoundLogger instance
    """
    return structlog.get_logger(name)


class ContextualLogger:
    """
    A logger wrapper that adds context to all log messages.

    Useful for adding request IDs, user IDs, etc. to all logs in a context.
    """

    def __init__(self, logger: structlog.stdlib.BoundLogger, context: Dict[str, Any]):
        self.logger = logger
        self.context = context

    def debug(self, message: str, **kwargs: Any) -> None:
        self.logger.debug(message, **self.context, **kwargs)

    def info(self, message: str, **kwargs: Any) -> None:
        self.logger.info(message, **self.context, **kwargs)

    def warning(self, message: str, **kwargs: Any) -> None:
        self.logger.warning(message, **self.context, **kwargs)

    def error(self, message: str, **kwargs: Any) -> None:
        self.logger.error(message, **self.context, **kwargs)

    def critical(self, message: str, **kwargs: Any) -> None:
        self.logger.critical(message, **self.context, **kwargs)

    def bind(self, **kwargs: Any) -> "ContextualLogger":
        """Create a new logger with additional context."""
        new_context = {**self.context, **kwargs}
        return ContextualLogger(self.logger, new_context)


# Initialize logging when module is imported
configure_logging()
