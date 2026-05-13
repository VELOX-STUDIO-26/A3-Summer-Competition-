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

The `ProfileExtractor` class uses structured prompting to extract profile dimensions:

- **Intent Analysis**: Identifies what the student is expressing (knowledge demonstration, goal statement, struggle admission, preference indication)
- **Value Extraction**: Pulls specific values with human-readable formatting
- **Confidence Scoring**: Each extraction gets a 0.0-1.0 confidence score

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
2. **Similarity Scoring**: Student utterances are embedded and compared against expert text
3. **Threshold Detection**: Topics scoring below 0.5 similarity are flagged as weak_points

This dual approach (LLM + embeddings) catches gaps that students might not explicitly mention.

## Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `backend/nlp/profile_extractor.py` | LLM-based profile extraction |
| `backend/nlp/session_manager.py` | Multi-turn profiling session state |
| `backend/nlp/gap_detector.py` | Embedding-based gap detection |
| `backend/api/routers/chat.py` | Profiling chat endpoints |
| `backend/api/routers/profile.py` | Profile CRUD operations |

### Database Schema

```sql
-- StudentProfile model
student_id: String(PK)
knowledge_base: JSON  # {"topic": mastery_score}
cognitive_style: String
weak_points: JSON     # ["topic1", "topic2"]
goals: JSON          # ["goal1", "goal2"]
learning_pace: Float
content_preferences: JSON  # ["video", "diagram"]
version: Integer      # Profile versioning for history
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/start` | POST | Begin profiling session |
| `/api/chat/message` | POST | Send message during profiling |
| `/api/chat/{id}/complete` | POST | Finish session, save profile |
| `/api/profile/{id}` | GET | Retrieve profile |
| `/api/profile` | POST | Create/update profile |

### Frontend Integration

**File:** `frontend/web/src/app/(onboarding)/profile-chat/page.tsx`

- Chat interface for natural conversation
- Real-time profile preview as extractions occur
- Progress indicator for profiling completion
- Transition to profile summary view

## Confidence Scoring

Each extraction includes a confidence score:

| Confidence | Interpretation | Action |
|------------|------------------|--------|
| 0.8-1.0 | Very confident | Strong profile update |
| 0.5-0.8 | Moderately confident | Normal profile update |
| 0.3-0.5 | Low confidence | Weak update, needs more data |
| <0.3 | Uncertain | Store but don't update profile |

## Testing

**File:** `backend/tests/test_gap_detector.py` (18 tests)

- Rule loading robustness
- Severity handling
- Multi-category detection
- Redaction handling

## Completion Status

**Status: 100% Complete**

All PRD requirements implemented:
- ✅ 6-dimension model extraction
- ✅ Weighted moving-average updates
- ✅ Confidence scoring
- ✅ JSON profile store with versioning
- ✅ Versioned history
- ✅ Gap detection via embeddings

## Future Enhancements

1. **Temporal Decay**: Older extractions should have reduced weight over time
2. **Cross-Validation**: Compare LLM extractions with embedding gaps for higher confidence
3. **Personality Traits**: Add Big Five personality dimensions for deeper personalization
