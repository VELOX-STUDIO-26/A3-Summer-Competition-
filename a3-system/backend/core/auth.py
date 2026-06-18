"""
JWT Authentication utilities for the A3 Learning System.

Provides:
- Token creation (access tokens)
- Token verification dependency for FastAPI
- get_current_user dependency that extracts student_id from a valid JWT
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.config import Settings
from core.logging import get_logger

logger = get_logger(__name__)
settings = Settings()

# Bearer token scheme — extracts token from "Authorization: Bearer <token>"
_bearer_scheme = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# Token creation
# ---------------------------------------------------------------------------


def create_access_token(student_id: str, email: str) -> str:
    """Create a signed JWT access token for the given student."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.security.access_token_expire_minutes
    )
    payload = {
        "sub": student_id,
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(
        payload,
        settings.security.secret_key,
        algorithm=settings.security.jwt_algorithm,
    )
    return token


# ---------------------------------------------------------------------------
# Token verification (FastAPI dependency)
# ---------------------------------------------------------------------------


def _decode_token(token: str) -> dict:
    """Decode and verify a JWT token. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(
            token,
            settings.security.secret_key,
            algorithms=[settings.security.jwt_algorithm],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> str:
    """
    FastAPI dependency that extracts and verifies the student_id from
    the Authorization header.

    Usage:
        @router.get("/protected")
        async def endpoint(student_id: str = Depends(get_current_user)):
            ...

    Returns the student_id string from the verified token.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _decode_token(credentials.credentials)
    student_id: Optional[str] = payload.get("sub")

    if not student_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return student_id


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Optional[str]:
    """
    Like get_current_user but returns None instead of raising if no token is present.
    Useful for endpoints that work differently when authenticated vs anonymous.
    """
    if credentials is None:
        return None

    try:
        payload = _decode_token(credentials.credentials)
        return payload.get("sub")
    except HTTPException:
        return None
