# Feature 1: Conversational Learner Profiling

## Overview

The Conversational Learner Profiling system extracts a 6-dimension learner model from natural chat conversations. Instead of forcing students through lengthy forms, the system infers their learning profile by analyzing their responses during casual conversation.

## The 6 Profile Dimensions

| Dimension | Type | Description |
|-----------|------|-------------|
| **knowledge_base** | Dict[str, float] | Topic mastery scores (0.0-1.0) |
| **cognitive_style** | str | visual / verbal / kinesthetic / mixed |
| **weak_points** | List[str] | Topics the student struggles with |
| **goals** | List[str] | Learning objectives and career goals |
| **learning_pace** | float | Speed preference 0.0-1.0 (slow/thorough → fast/intensive) |
| **content_preferences** | List[str] | Preferred formats: video, text, interactive, code, audio, diagram |

## How It Works

### 1. Profile Extraction Pipeline

```
Student Message → LLM Analysis → JSON Extraction → Confidence Scoring → Profile Update
```

**File:** `backend/nlp/profile_extractor.py`

The `ProfileExtractor` and `ProfileBuilder` classes work together:

- **ProfileExtractor**: Uses LLM-based structured prompting to extract profile dimensions from student messages
- **ProfileBuilder**: Maintains the learner profile using weighted moving average updates
- **Confidence Scoring**: Each extraction gets a 0.0-1.0 confidence score
- **Dimension Merging**: Different merge strategies for scalar, list, and dictionary dimensions

### 2. Prompt Engineering

The extraction prompt (`PROFILE_EXTRACTION_PROMPT`) instructs the LLM to:

- Extract **specific topics**, not generic ones
- Use **human-readable values** (e.g., "Dynamic programming" not "dynamic_programming")
- Extract **multiple items** for list fields
- Infer **mastery levels** from language cues:
  - "comfortable with X" → 0.7-0.9
  - "basic knowledge of X" → 0.4-0.6
  - "never touched X" → 0.0 (adds to weak_points)

### 3. Confidence-Based Weighted Updates

```python
# Profile updates use weighted moving average
new_value = (old_value * (1 - confidence * 0.3)) + (extracted_value * confidence * 0.3)
```

This ensures:
- High-confidence extractions have stronger impact
- Profile gradually converges to accurate values
- Outlier responses don't drastically change the profile

### 4. Gap Detection Integration

**File:** `backend/nlp/gap_detector.py`

Beyond LLM extraction, the system uses embedding-based gap detection:

1. **Expert Corpus**: Curated reference text per knowledge node stored in `data/expert_corpus.json`
2. **Embedding Pipeline**: Expert answers are embedded once and cached; student utterances are embedded on-demand
3. **Cosine Similarity**: Computes max similarity between student text and each node's expert answers
4. **Threshold Detection**: Topics scoring below 0.5 similarity are flagged as `weak_points`
5. **Graceful Degradation**: Returns empty list on any failure (API down, missing corpus) to avoid blocking chat

This dual approach (LLM + embeddings) catches gaps that students might not explicitly mention.

### 5. Content Moderation

**File:** `backend/core/content_moderator.py`

All user inputs are moderated before processing:
- Harmful content detection with block/allow verdicts
- Prompt injection pattern filtering via `sanitize_user_input()`
- Blocked messages return polite refusal without LLM processing

## Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `backend/nlp/profile_extractor.py` | `ProfileExtractor` (LLM extraction) + `ProfileBuilder` (weighted merging) |
| `backend/nlp/session_manager.py` | `SessionManager` + `ProfilingSession` for multi-turn state |
| `backend/nlp/gap_detector.py` | `GapDetector` for embedding-based weak point detection |
| `backend/api/routers/chat.py` | Profiling chat endpoints + simple chat endpoints |
| `backend/api/routers/profile.py` | Profile CRUD operations (create/update, get, delete) |
| `backend/core/content_moderator.py` | Input moderation and prompt injection filtering |

### Database Schema

```sql
-- StudentProfile model (backend/models/database.py)
student_id: String(50, PK)           -- Unique student identifier
knowledge_base: JSONB                -- {"topic": mastery_score} (0.0-1.0)
cognitive_style: String(20)          -- "visual" | "verbal" | "kinesthetic" | "mixed"
weak_points: ARRAY(String)           -- List of topic IDs where student struggles
goals: ARRAY(String)                 -- Student learning goals
learning_pace: Float                 -- Normalized speed (0.0-1.0)
content_preferences: ARRAY(String)   -- "video" | "text" | "interactive" | "code" | "audio" | "diagram"
version: Integer                     -- Profile version for optimistic locking
created_at: DateTime(timezone=True)  -- Profile creation timestamp
updated_at: DateTime(timezone=True)  -- Last update timestamp

-- Relationships
learning_paths: relationship("LearningPath")
chat_sessions: relationship("ChatSession")
quiz_results: relationship("QuizResult")
generated_quizzes: relationship("GeneratedQuiz")
events: relationship("LearningEvent")
```

### API Endpoints

**Chat Router** (`/api/chat`):
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/start` | POST | Begin profiling session, returns first AI question |
| `/api/chat/message` | POST | Send message, extract dimensions, return next question |
| `/api/chat/{session_id}/status` | GET | Get session status and progress |
| `/api/chat/{session_id}/complete` | POST | Force-complete profiling, return final profile |
| `/api/chat/stats` | GET | Session manager statistics (monitoring) |
| `/api/chat/simple` | POST | Simple direct chat (no profiling) |
| `/api/chat/simple/stream` | POST | Streaming simple chat (SSE) |

**Profile Router** (`/api/profile`):
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/profile` | POST | Create or update student profile |
| `/api/profile/{student_id}` | GET | Retrieve profile by student ID |
| `/api/profile/{student_id}` | DELETE | Delete student profile |

### Frontend Integration

**Profile Chat Page:** `frontend/web/src/app/(onboarding)/profile-chat/page.tsx`
- Chat interface with AI avatar and typing indicators
- 6 dimension cards with visual "tube light" fill progress
- Real-time confidence score updates from API
- Mock mode fallback when backend unavailable
- Auto-redirect to profile summary on completion

**Profile Summary Page:** `frontend/web/src/app/(onboarding)/profile-summary/page.tsx`
- Displays all 6 extracted dimensions with icons
- Inline editing capability for each dimension
- Converts raw values to human-readable format (pace → "Steady & thorough")
- Saves profile to backend on "Continue" click
- Transitions to learning path generation

**Profile Components:** `frontend/web/src/components/profile/`
- Reusable profile display components

## Confidence Scoring

Each extraction includes a confidence score:

| Confidence | Interpretation | Action |
|------------|------------------|--------|
| 0.8-1.0 | Very confident | Strong profile update |
| 0.5-0.8 | Moderately confident | Normal profile update |
| 0.3-0.5 | Low confidence | Weak update, needs more data |
| <0.3 | Uncertain | Store but don't update profile |

## Testing

**ProfileBuilder Tests:** `backend/tests/test_profile_builder.py` (15+ tests)
- Scalar dimension merging (weighted moving average)
- Dictionary dimension merging (knowledge_base)
- List dimension merging (weak_points, goals, content_preferences)
- Cognitive style highest-confidence selection
- Profile completeness checks
- Extraction result helpers

**GapDetector Tests:** `backend/tests/test_gap_detector.py` (15+ tests)
- Cosine similarity edge cases (identical, orthogonal, opposite vectors)
- Corpus loading (skips empty entries, idempotent, missing file handling)
- Gap detection (flags low similarity, uses best of multiple expert answers)
- Candidate node whitelist filtering
- Embedding caching (computed once per corpus)
- Graceful failure modes (empty input, API errors, missing corpus)

## Completion Status

**Status: 100% Complete**

All PRD requirements implemented:
- ✅ 6-dimension model extraction (knowledge_base, cognitive_style, weak_points, goals, learning_pace, content_preferences)
- ✅ Weighted moving-average updates with configurable recency_weight
- ✅ Confidence scoring per dimension (0.0-1.0)
- ✅ PostgreSQL profile store with JSONB/ARRAY columns
- ✅ Version field for optimistic locking
- ✅ Gap detection via embeddings against expert corpus
- ✅ Content moderation and prompt injection filtering
- ✅ AI-driven conversational flow (not scripted questions)
- ✅ Frontend chat UI with real-time dimension progress
- ✅ Profile summary with inline editing

## Future Enhancements

1. **Temporal Decay**: Older extractions should have reduced weight over time
2. **Cross-Validation**: Compare LLM extractions with embedding gaps for higher confidence
3. **Personality Traits**: Add Big Five personality dimensions for deeper personalization
4. **Profile History**: Store historical profile snapshots for learning progression tracking
5. **Adaptive Questioning**: Dynamically adjust question depth based on confidence gaps
