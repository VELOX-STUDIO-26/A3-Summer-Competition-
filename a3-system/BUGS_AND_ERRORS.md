# A3 Learning System - Bugs and Errors Report

**Generated:** 2026-05-05
**Scope:** Full codebase review (Backend Python, Frontend TypeScript/React)

---

## Table of Contents

1. [Critical Bugs](#critical-bugs)
2. [High Severity Issues](#high-severity-issues)
3. [Medium Severity Issues](#medium-severity-issues)
4. [Low Severity Issues](#low-severity-issues)
5. [Code Quality Issues](#code-quality-issues)
6. [Security Issues](#security-issues)
7. [Frontend-Specific Issues](#frontend-specific-issues)
8. [Backend-Specific Issues](#backend-specific-issues)

---

## Critical Bugs

### CB-001: API Port Mismatch Between Frontend and Backend

**Location:** `frontend/web/src/lib/api.ts:3` vs `backend/main.py:184-188`

**Issue:** The frontend expects the API on port 8001, but the backend runs on port 8000.

```typescript
// frontend/web/src/lib/api.ts:3
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
```

```python
# backend/main.py:184-188
uvicorn.run(
    "main:app",
    host="0.0.0.0",
    port=8000,  # <-- Port 8000
    reload=True,
    log_level="info",
)
```

**Impact:** Frontend cannot communicate with backend API.

**Fix:** Change frontend default to port 8000 or backend to port 8001.

---

### CB-002: Mock Mode Raises Instead of Returning Mock Data

**Location:** `backend/core/llm_client.py:945-958`

**Issue:** When no API keys are configured, the LLM client raises an error instead of gracefully falling back to mock mode.

```python
async def generate(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
    if self.use_mock:
        raise RuntimeError("LLM running in demo/mock mode. Set a real API key.")  # <-- Raises instead of using mock
    return await self.primary.generate(messages, **kwargs)
```

**Impact:** Application crashes when no API keys are available.

**Fix:** Change to use `return await self.mock.generate(messages, **kwargs)` instead of raising.

---

### CB-003: Missing TTS Router Prefix Causes Route Conflicts

**Location:** `backend/main.py:172-173`

**Issue:** The TTS router is included without a prefix, potentially causing route conflicts.

```python
app.include_router(tts.router, tags=["Text-to-Speech"])  # No prefix specified
```

**Impact:** Potential route collision with other endpoints.

**Fix:** Add prefix: `app.include_router(tts.router, prefix="/api/tts", tags=["Text-to-Speech"])`

---

### CB-004: Undefined Variable `profile` in Quiz Submission

**Location:** `backend/api/routers/quiz.py:669-694`

**Issue:** The `profile` variable is used but may be undefined in certain code paths.

```python
# Line 669 - profile might not be defined if exception occurs early
if profile and evaluation.get("profile_updates"):
```

**Impact:** Potential `NameError` at runtime.

**Fix:** Ensure `profile` is initialized before use or check existence.

---

### CB-005: Type Error in `evaluator_agent.py` Line 139 Docstring

**Location:** `backend/agents/evaluator_agent.py:139`

**Issue:** Invalid return type annotation in docstring (tuple syntax).

```python
def _determine_outcome(
    self,
    score_pct: float,
    time_taken: int,
    expected_time: int,
    consecutive_low: int,
    rushed: bool
) -> tuple[str, bool, str]:  # <-- Python 3.9+ syntax, may fail on older versions
```

**Impact:** Syntax error on Python versions < 3.9.

**Fix:** Use `Tuple[str, bool, str]` from typing module.

---

## High Severity Issues

### HI-001: Hardcoded API Keys in Source Code

**Location:** `backend/core/llm_client.py:683,753`

**Issue:** API keys are hardcoded in the source code.

```python
# Line 683 (GLMClient)
self.api_key = api_key or os.getenv("GLM_API_KEY", "sk-obUXCFtk5R4zJnPlzgR5N46vrEfoW8AX4XbJgF88HWG6ZI5b")

# Line 753 (GeminiClient)
self.api_key = api_key or os.getenv("GEMINI_API_KEY", "AIzaSyDOJuWg4Zz7CjbR9gIYUpXIMW-tBp0Wjkc")
```

**Impact:** Security risk - API keys exposed in version control.

**Fix:** Remove default values, require environment variables only.

---

### HI-002: Weak JWT Secret Key

**Location:** `backend/core/config.py:118`

**Issue:** Default JWT secret key is weak and hardcoded.

```python
secret_key: str = Field(default="your-secret-key-change-in-production", description="Secret key for JWT")
```

**Impact:** Security vulnerability in production.

**Fix:** Generate a secure random key and require it via environment variable.

---

### HI-003: CORS Allows All Origins

**Location:** `backend/main.py:94-100`

**Issue:** CORS middleware allows all origins.

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # <-- Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Impact:** Security risk in production.

**Fix:** Restrict to specific origins in production.

---

### HI-004: Database Connection Not Closed on Shutdown

**Location:** `backend/main.py:66-67`

**Issue:** Database connections are not properly closed during shutdown.

```python
# TODO: Close database connections
# TODO: Cleanup resources
```

**Impact:** Resource leaks, potential database connection pool exhaustion.

**Fix:** Implement proper shutdown cleanup.

---

### HI-005: Undefined Variable `revealedHints` in Notebook Page

**Location:** `frontend/web/src/app/(dashboard)/notebook/page.tsx:1584-1598`

**Issue:** `revealedHints` is used but not defined in scope.

```typescript
{hints.slice(0, 3).map((_: any, hintIdx: number) => (
  <button
    key={hintIdx}
    onClick={() => setQuizRevealedHints(prev => ({ ...prev, [ansKey]: hintIdx + 1 }))}
    disabled={revealedHints > hintIdx}  // <-- revealedHints not defined
    ...
```

**Impact:** Frontend compilation/runtime error.

**Fix:** Use `quizRevealedHints[ansKey]` instead of `revealedHints`.

---

### HI-006: Unused Imports in Main Application

**Location:** `backend/main.py:21`

**Issue:** Unused import that may cause issues.

```python
from core.llm_client import llm_client  # May not be initialized properly
```

**Impact:** Potential circular import or initialization issues.

**Fix:** Verify import is necessary and properly initialized.

---

## Medium Severity Issues

### MI-001: Typo in Category Name

**Location:** `backend/api/routers/milestone.py:370`

**Issue:** Typo in "Kubernetes" category.

```python
"Kubernets": "Container Orchestration",  # <-- Should be "Kubernetes"
```

**Fix:** Correct spelling to "Kubernetes".

---

### MI-002: Inconsistent Default Database Values

**Location:** `backend/models/schemas.py:57-58`

**Issue:** Inconsistent datetime defaults.

```python
class TimestampMixin(BaseSchema):
    """Mixin for timestamp fields."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)  # <-- Should use default=None or Field(default=None)
```

**Fix:** Standardize datetime handling.

---

### MI-003: Missing Error Handling in Faithfulness Checker

**Location:** `backend/agents/content_agent.py:201-210`

**Issue:** Faithfulness check may fail silently.

```python
faithfulness_result = await faithfulness_checker.check_faithfulness(
    generated_text=content,
    source_chunks=[...],
    context=topic,
)

# Prepend warning if low faithfulness
if faithfulness_result.warning_message:
    content = f"⚠️ **{faithfulness_result.warning_message}**\n\n{content}"
```

**Impact:** Low faithfulness content not flagged properly.

**Fix:** Add explicit check for `faithfulness_result.verified`.

---

### MI-004: Race Condition in Session Manager

**Location:** `backend/nlp/session_manager.py` (not fully shown but referenced)

**Issue:** Global session manager singleton may have race conditions.

```python
# Global session manager (singleton)
session_manager = SessionManager()
```

**Impact:** Concurrent requests may cause data corruption.

**Fix:** Add proper locking mechanisms.

---

### MI-005: Missing Input Sanitization on User Messages

**Location:** `backend/api/routers/chat.py:311-314`

**Issue:** User input is passed directly to LLM without sanitization.

```python
messages.append({"role": "user", "content": request.message})  # request.message not sanitized
```

**Impact:** Potential prompt injection attacks.

**Fix:** Sanitize user input before passing to LLM.

---

### MI-006: Database Connection Pool Exhaustion Risk

**Location:** `backend/models/database.py:1317-1334`

**Issue:** Database pool configuration may not be sufficient for high load.

```python
self.async_engine = create_async_engine(
    settings.db.async_url,
    echo=settings.is_development,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)
```

**Impact:** Under high load, connections may be exhausted.

**Fix:** Monitor and tune pool settings based on load testing.

---

### MI-007: Unused Code Block in Evaluator Agent

**Location:** `backend/agents/evaluator_agent.py:139-179`

**Issue:** Return statement unreachable due to early returns in if blocks.

```python
def _determine_outcome(...):
    # Rule 5
    if rushed and score_pct < 0.70:
        return ("remediate", False, "...")
    # Rule 1
    if score_pct >= 0.85 and time_taken < expected_time * 1.2:
        return ("accelerate", True, "...")
    # ... more returns
    return ("continue", True, "Score meets threshold")  # <-- Never reached
```

**Fix:** Remove unreachable code or restructure logic.

---

## Low Severity Issues

### LI-001: Inconsistent String Quoting

**Location:** Multiple files

**Issue:** Mix of single and double quotes throughout codebase.

**Fix:** Standardize on double quotes for consistency.

---

### LI-002: Missing Type Hints

**Location:** Multiple files

**Issue:** Many functions lack proper type hints.

Example:
```python
def _generate_mock_response(messages):  # Missing type hints
```

**Fix:** Add comprehensive type hints.

---

### LI-003: Trailing Whitespace

**Location:** Multiple files

**Issue:** Lines with trailing whitespace characters.

**Fix:** Run `autopep8` or similar tool to clean up.

---

### LI-004: Unused Variables

**Location:** `frontend/web/src/app/(dashboard)/notebook/page.tsx`

**Issue:** Variables declared but never used.

```typescript
const [generatedContent, setGeneratedContent] = useState<string | null>(null);  // Unused
```

**Fix:** Remove unused state variables.

---

### LI-005: Commented-Out Code

**Location:** Various files

**Issue:** Sections of code commented out but left in source.

**Fix:** Remove dead code.

---

## Code Quality Issues

### CQI-001: Functions Too Long

**Location:** `frontend/web/src/app/(dashboard)/notebook/page.tsx`

**Issue:** Several functions exceed 100 lines, reducing readability.

- `renderMarkdown`: ~180 lines
- Quiz rendering section: ~300+ lines

**Fix:** Refactor into smaller, focused functions.

---

### CQI-002: Deep Nesting

**Location:** `backend/api/routers/quiz.py`

**Issue:** Deeply nested conditionals reduce readability.

**Fix:** Use early returns and helper functions.

---

### CQI-003: Magic Numbers

**Location:** Multiple files

**Issue:** Hardcoded numeric values without explanation.

Examples:
- `timeout: 180000` in api.ts
- `max_tokens=2000` in various agents
- `score >= 0.6` threshold values

**Fix:** Define constants with descriptive names.

---

### CQI-004: Duplicate Code

**Location:** `backend/agents/quiz_agent.py`, `backend/agents/content_agent.py`

**Issue:** Similar `_retrieve_chunks` and `_format_rag_context` methods duplicated.

**Fix:** Extract to shared utility class.

---

## Security Issues

### SI-001: No Rate Limiting

**Location:** All API endpoints

**Issue:** No rate limiting on any endpoints.

**Impact:** Vulnerable to brute force and DoS attacks.

**Fix:** Implement rate limiting middleware.

---

### SI-002: SQL Injection Risk

**Location:** `backend/api/routers/quiz.py:603-605`

**Issue:** Raw SQL may be constructed from user input in some edge cases.

**Fix:** Ensure all database queries use parameterized queries via SQLAlchemy.

---

### SI-003: Missing Authentication on Some Endpoints

**Location:** Various routers

**Issue:** Not all endpoints require authentication.

**Fix:** Implement consistent authentication middleware.

---

### SI-004: Sensitive Data in Logs

**Location:** `backend/api/routers/auth.py:111`

**Issue:** User email logged at info level.

```python
logger.info(f"Registration attempt for email: {payload.email}")
```

**Fix:** Remove or mask sensitive data in logs.

---

## Frontend-Specific Issues

### FE-001: Memory Leak in Event Listeners

**Location:** `frontend/web/src/app/(dashboard)/notebook/page.tsx:335-357`

**Issue:** Event listeners added but cleanup may not be complete.

```typescript
useEffect(() => {
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
}, []);  // <-- Missing dependencies
```

**Fix:** Add proper dependencies or use refs.

---

### FE-002: Potential XSS via dangerouslySetInnerHTML

**Location:** `frontend/web/src/app/(dashboard)/notebook/page.tsx:835`

**Issue:** Content from API rendered without sanitization.

```typescript
<span key={i} dangerouslySetInnerHTML={{ __html: html }} />
```

**Fix:** Sanitize HTML content before rendering.

---

### FE-003: Missing Error Boundary

**Location:** All pages

**Issue:** No error boundaries to catch React rendering errors.

**Fix:** Implement React Error Boundaries.

---

### FE-004: LocalStorage Key Collision

**Location:** `frontend/web/src/app/(dashboard)/notebook/page.tsx:359-383`

**Issue:** LocalStorage key includes studentId but may still have collisions.

```typescript
const STORAGE_KEY = `a3_resources_${studentId || 'anonymous'}`;
```

**Fix:** Use more specific namespace and handle quota errors.

---

## Backend-Specific Issues

### BE-001: No Request Timeout Configuration

**Location:** All async operations

**Issue:** Many async operations lack explicit timeouts.

**Fix:** Add timeout configurations to all external calls.

---

### BE-002: Missing Health Check for Dependencies

**Location:** `backend/main.py:104-123`

**Issue:** Health check only verifies LLM, not database or other dependencies.

**Fix:** Add comprehensive health checks for all dependencies.

---

### BE-003: No Database Connection Retry Logic

**Location:** `backend/models/database.py`

**Issue:** Database connections fail immediately on error.

**Fix:** Implement retry logic with exponential backoff.

---

### BE-004: Alembic Migration Out of Sync

**Location:** `alembic/versions/`

**Issue:** Migration files may not match current database models.

**Fix:** Regenerate migrations or verify consistency.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Critical Bugs | 5 |
| High Severity | 6 |
| Medium Severity | 7 |
| Low Severity | 5 |
| Code Quality | 4 |
| Security | 4 |
| Frontend-Specific | 4 |
| Backend-Specific | 4 |
| **Total** | **39** |

---

## Recommended Actions

### Immediate (Critical)

1. Fix API port mismatch (CB-001)
2. Fix MockLLMClient error raising (CB-002)
3. Remove hardcoded API keys (HI-001)
4. Fix undefined variable in notebook page (HI-005)
5. Add TTS router prefix (CB-003)

### Short-term (High/Medium)

1. Implement proper JWT secret management (HI-002)
2. Restrict CORS origins in production (HI-003)
3. Add database connection cleanup (HI-004)
4. Fix typo in Kubernetes (MI-001)
5. Add input sanitization (MI-005)
6. Implement rate limiting (SI-001)

### Long-term (Quality/Security)

1. Add comprehensive type hints (LI-002)
2. Implement error boundaries (FE-003)
3. Add request timeouts (BE-001)
4. Refactor long functions (CQI-001)
5. Remove duplicate code (CQI-004)
6. Add comprehensive health checks (BE-002)

---

## Appendix: File Locations

### Backend Files Reviewed

- `backend/main.py`
- `backend/core/config.py`
- `backend/core/llm_client.py`
- `backend/core/database_init.py`
- `backend/core/logging.py`
- `backend/models/database.py`
- `backend/models/schemas.py`
- `backend/api/routers/quiz.py`
- `backend/api/routers/auth.py`
- `backend/api/routers/chat.py`
- `backend/api/routers/milestone.py`
- `backend/api/routers/tracking.py`
- `backend/agents/quiz_agent.py`
- `backend/agents/gate_agent.py`
- `backend/agents/orchestrator.py`
- `backend/agents/evaluator_agent.py`
- `backend/agents/content_agent.py`

### Frontend Files Reviewed

- `frontend/web/src/lib/api.ts`
- `frontend/web/src/lib/store.ts`
- `frontend/web/src/app/(dashboard)/notebook/page.tsx`

---

*This report was generated by automated code analysis. Manual review is recommended for confirmation.*
