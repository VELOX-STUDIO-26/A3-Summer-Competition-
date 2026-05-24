# Feature 2: Multi-Agent Resource Generation

## Overview

The Multi-Agent Resource Generation system coordinates 5 specialized AI agents to generate personalized learning resources in parallel. Each agent specializes in a specific content type, and the Orchestrator intelligently selects which agents to run based on the student's profile and topic.

## The 5 Agents

### 1. Content Agent
**File:** `backend/agents/content_agent.py`

Generates structured learning notes with **6 mandatory sections**:
1. **Overview** - Introduction with "Connect to Prior Knowledge" subsection
2. **Key Concepts** - 4-6 bold terms with explanations
3. **Detailed Explanation** - 3-4 subsections with "⚠️ Focus Area" callouts for weak points
4. **Self-Check** - 3-5 questions with hidden answers (HTML details/summary)
5. **Practical Application** - Real-world examples with "Visual Summary" (ASCII diagrams)
6. **Summary** - 5-7 bullet points with "Quick Reference Card" table

**Features:**
- RAG-grounded with embedding + keyword search fallback
- Inline citations using `[Source: chunk_id]` format
- Faithfulness checking against source chunks
- Profile-adaptive complexity (beginner/intermediate/advanced)

**Output Format:**
```json
{
  "content": "markdown content with 6 sections...",
  "format": "markdown",
  "metadata": {
    "topic": "Docker",
    "agent": "content",
    "mastery_level": 0.5,
    "word_count": 1200,
    "rag_chunks_used": 3
  },
  "faithfulness": {
    "score": 0.85,
    "verified": true,
    "total_claims": 15,
    "supported_claims": 13,
    "citations": ["chunk_1", "chunk_2"]
  },
  "sources": [{"chunk_id": "...", "text": "..."}]
}
```

### 2. Mind Map Agent
**File:** `backend/agents/mindmap_agent.py`

Generates **exactly 21 nodes** in a consistent hierarchical structure:
- **1 root node** (level 0) - Main topic
- **5 branch nodes** (level 1) - Major subtopics
- **15 leaf nodes** (level 2) - 3 per branch with difficulty ratings

**Node Fields:**
- `description`: 1-sentence summary (max 20 words)
- `importance`: "core" (must-know) or "supplementary" (nice-to-know)
- `difficulty`: "beginner" | "intermediate" | "advanced" (leaf nodes only)
- `mastery`: Student's current mastery (annotated from profile)
- `is_weak_point`: Boolean flag for weak point highlighting

**Edge Labels:** `contains`, `includes`, `requires`, `leads_to`, `enables`, `supports`

**Output Format:**
```json
{
  "nodes": [
    {"id": "root", "label": "Topic", "level": 0, "description": "...", "importance": "core", "mastery": 0.5, "is_weak_point": false},
    {"id": "n1", "label": "Branch 1", "level": 1, "description": "...", "importance": "core"},
    {"id": "n1a", "label": "Leaf", "level": 2, "difficulty": "beginner", "importance": "supplementary"}
  ],
  "edges": [
    {"from": "root", "to": "n1", "label": "contains", "relationship_note": "..."}
  ],
  "format": "mindmap",
  "metadata": {"num_nodes": 21, "num_edges": 22, "difficulty_distribution": {"beginner": 5, "intermediate": 7, "advanced": 3}}
}
```

**Frontend Rendering:** `frontend/web/src/components/mindmap/InteractiveMindMap.tsx`

### 3. Quiz Agent
**File:** `backend/agents/quiz_agent.py`

Generates adaptive milestone quizzes with **4 question types**:
- **multiple_choice**: 4 options with distractors
- **true_false**: Requires 1-2 sentence justification
- **scenario_based**: Real-world situation application
- **short_answer**: 2-4 sentence explanations (exactly 2 per quiz)

**Complexity Levels:**
| Level | Questions | Time |
|-------|-----------|------|
| foundation | 6 | 12 min |
| standard | 8 | 16 min |
| advanced | 10 | 20 min |
| mastery | 12 | 24 min |

**Difficulty Distribution** (based on mastery):
- Mastery 0.0-0.3: 60% easy, 30% medium, 10% hard
- Mastery 0.4-0.6: 20% easy, 50% medium, 30% hard
- Mastery 0.7-1.0: 0% easy, 40% medium, 60% hard

**Output Format:**
```json
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "What is...?",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "explanation": "Because...",
      "difficulty": "medium",
      "difficulty_score": 0.6,
      "topic_tested": "subtopic",
      "hints": ["hint1", "hint2", "hint3"],
      "weight": 1.0
    }
  ],
  "metadata": {
    "complexity_level": "standard",
    "estimated_time_minutes": 16,
    "difficulty_distribution": {"easy": 2, "medium": 4, "hard": 2}
  }
}
```

### 4. Media Agent
**File:** `backend/agents/media_agent.py`

Generates **7-8 animated educational slides** (~3-4 minute lecture):

**Mandatory Slide Structure:**
1. **HOOK** - Pattern interrupt with curiosity gap
2. **WHY IT MATTERS** - Real-world relevance
3-5. **WHAT & HOW** - Core concept step-by-step with `pause_prompt` for reflection
6. **PRACTICAL EXAMPLE** - Visual scenario
7. **KEY TAKEAWAYS** - 3 bullet recap
8. **BRIDGE** - Connection to next topic

**Slide Fields:**
- `header`: Max 6 words
- `bullets`: Exactly 3 points (8-12 words each)
- `script`: TTS narration (50-80 words, 2-4 sentences)
- `visual_hint`: Description for visual rendering
- `pause_prompt`: Active learning reflection question
- `highlight_terms`: 2-3 key terms to emphasize
- `audio_url`: Pre-generated TTS audio path

**TTS Integration:**
- Primary: Edge-TTS (free, `en-US-JennyNeural` default)
- Fallback: iFlytek WebSocket API (Chinese voices)
- Caching: Content-hash based (`/api/tts/cached/{hash}`)

**Output Format:**
```json
{
  "title": "Engaging lecture title",
  "slides": [
    {
      "number": 1,
      "header": "Why Docker Matters",
      "bullets": ["Point 1", "Point 2", "Point 3"],
      "script": "TTS narration text...",
      "visual_hint": "Show container vs VM diagram",
      "pause_prompt": "Think: why would this fail?",
      "highlight_terms": ["container", "isolation"],
      "duration_seconds": 25,
      "audio_url": "/api/tts/cached/abc123"
    }
  ],
  "total_duration_seconds": 180,
  "bridge_to_next": "Next you'll learn about..."
}
```

**Frontend:** `frontend/web/src/components/video/LecturePlayer.tsx`

### 5. Code Agent
**File:** `backend/agents/code_agent.py`

Generates **3-tier scaffolded coding exercises**:

| Tier | Purpose | Test Cases | Hints |
|------|---------|------------|-------|
| **Guided** | Step-by-step walkthrough | 1 | 3 (progressive) |
| **Practice** | Apply with less scaffolding | 2 | 3 |
| **Challenge** | Real-world scenario | 3 | 3 (strategic) |

**Exercise Fields:**
- `problem`: 40-80 word description
- `starter_code`: Skeleton with TODOs and docstrings
- `solution`: Complete working code with comments
- `pseudocode`: High-level algorithm steps
- `visual_steps`: 2-3 step visual descriptions
- `time_complexity` / `space_complexity`: With explanations

**Additional Sections:**
- `common_bugs`: 2 bugs with buggy_code, explanation, fix, prevention_tip
- `complexity_analysis`: Why complexity matters for this problem
- `key_takeaways`: 3 core learnings
- `real_world_scenario`: 30-40 word practical context

**Languages:** Python, Java, C++, Go, JavaScript

**Output Format:**
```json
{
  "language": "python",
  "difficulty": "intermediate",
  "real_world_scenario": "Understanding this is essential for...",
  "learning_objectives": ["Objective 1", "Objective 2", "Objective 3"],
  "exercises": [
    {
      "tier": "guided",
      "name": "Guided Walkthrough",
      "problem": "Follow steps to implement...",
      "starter_code": "def solution():\n    # TODO: Step 1\n    pass",
      "solution": "def solution():\n    return result",
      "pseudocode": "1. Initialize\n2. Process\n3. Return",
      "visual_steps": ["Step 1: ...", "Step 2: ..."],
      "test_cases": [{"input": "...", "expected": "...", "description": "..."}],
      "hints": ["Hint 1", "Hint 2", "Hint 3"],
      "time_complexity": "O(n)",
      "space_complexity": "O(1)"
    }
  ],
  "common_bugs": [{"bug_name": "...", "buggy_code": "...", "fix": "..."}],
  "complexity_analysis": {"time_complexity": "O(n)", "why_it_matters": "..."},
  "key_takeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"]
}
```

**Frontend:** `frontend/web/src/components/code/CodeExercise.tsx`

## Orchestrator Architecture

**File:** `backend/agents/orchestrator.py`

### Agent Selection Logic (`decide_agents`)

The Orchestrator decides which agents to run based on student profile:

```python
# Default: run core 3 agents
agents = ["content", "quiz", "mindmap"]

# Add media for visual learners
if "visual" in cognitive_style or "video" in content_preferences:
    agents.append("media")

# Add code for programming topics
programming_topics = ["docker", "kubernetes", "container", "microservice",
                      "devops", "python", "java", "go", "api", "serverless"]
if any(pt in topic_lower for pt in programming_topics):
    agents.append("code")

# Reorder based on cognitive style
if "kinesthetic" in cognitive_style:
    # Hands-on learners: code, quiz first
    agents = ["code", "quiz", ...]
elif "visual" in cognitive_style:
    # Visual learners: mindmap, media first
    agents = ["media", "mindmap", ...]

# Prioritize quiz if many weak points
if len(weak_points) >= 2:
    agents.remove("quiz")
    agents.insert(0, "quiz")

# Fast learners (pace > 0.8) get all 5 agents
if learning_pace > 0.8:
    agents = ["content", "quiz", "mindmap", "media", "code"]
```

### Parallel Execution

All selected agents run concurrently with semaphore limiting:

```python
MAX_CONCURRENT_AGENTS = 5  # All 5 agents can run simultaneously

async def generate_resources(self, topic, profile, context="", agent_selection=None, agent_kwargs=None):
    agents_to_run = agent_selection or self.decide_agents(profile, topic)
    
    async def _run_with_limit(agent, name):
        async with self._semaphore:  # Concurrency limit
            return await agent.run(topic, profile, node_id, **kwargs)
    
    coros = [_run_with_limit(agent, name) for name, agent in agent_map.items()]
    results = await asyncio.gather(*coros, return_exceptions=True)
    
    return {
        "topic": topic,
        "resources": results,
        "metadata": {
            "agents_run": agents_to_run,
            "profile_match": self._calculate_profile_match(results, profile)
        }
    }
```

### Streaming Resource Generation

**Method:** `generate_resources_stream()` → `AsyncIterator[Dict]`

Real-time progress events via SSE:

```
event: plan           → {"topic": "Docker", "agents": ["content", "quiz", "mindmap"]}
event: agent_started  → {"agent": "content"}
event: agent_complete → {"agent": "content", "result": {...}}
event: agent_failed   → {"agent": "quiz", "error": "boom"}
event: complete       → {"topic": "Docker", "resources": {...}, "metadata": {...}}
```

**Error Handling:**
- Failed agents emit `agent_failed` but don't block others
- Failed agent results appear in final bundle as `{"error": "...", "agent": "name"}`
- Stream continues until all agents complete or fail

## Faithfulness Verification

**File:** `backend/core/faithfulness_checker.py`

Every agent output is checked for hallucinations using LLM-based claim verification:

```python
faithfulness_result = await faithfulness_checker.check_faithfulness(
    generated_text=content,
    source_chunks=[{"id": chunk_id, "text": text, "source": source}],
    context=topic
)
```

**Claim Classification:**
- **supported**: Directly entailed by source
- **contradicted**: Directly contradicted by source
- **unverifiable**: Not mentioned in source (potential hallucination)

**Output:**
```python
@dataclass
class FaithfulnessResult:
    score: float              # 0.0-1.0 (1.0 = fully supported)
    total_claims: int
    supported_count: int
    contradicted_count: int
    unverifiable_count: int
    unsupported_claims: List[Dict[str, str]]
    citations: List[str]
    warning_message: Optional[str]  # Prepended to content if score < threshold
```

**Threshold:** Default 0.8 (configurable via `settings.faithfulness_threshold`)

**Low Score Handling:** Content is prepended with `⚠️ **{warning_message}**`

## Content Moderation

**File:** `backend/core/content_moderator.py`

Pattern-based harmful content filtering applied to all user inputs:

- **Categories**: self-harm, violence, sexual-minors, hate speech, illegal activity
- **Severity levels**: high (always block), medium/low (warn/block based on mode)
- **Rule-based**: Regex patterns loaded from `data/moderation_rules.json`
- **Prompt injection filtering**: `sanitize_user_input()` removes injection patterns

## RAG Grounding

**File:** `backend/rag/vector_store.py`

All agents retrieve context from the vector store before generation:

1. **Embedding Search**: Topic → embedding → cosine similarity search
2. **Keyword Fallback**: If embedding fails, use `search_by_text()`
3. **Top-K Chunks**: Default 3 chunks per agent (`max_rag_chunks`)
4. **Context Formatting**: Chunks formatted as `[Source: chunk_id]\n{text}`

## Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `backend/agents/orchestrator.py` | `Orchestrator` class - agent coordination, selection, parallel execution |
| `backend/agents/base_agent.py` | `BaseAgent` ABC - shared profile handling, mastery calculation |
| `backend/agents/content_agent.py` | `ContentAgent` - 6-section markdown notes with RAG |
| `backend/agents/mindmap_agent.py` | `MindMapAgent` - 21-node hierarchical concept maps |
| `backend/agents/quiz_agent.py` | `QuizAgent` - adaptive quizzes with 4 question types |
| `backend/agents/media_agent.py` | `MediaAgent` - 7-8 slide lectures with TTS pre-generation |
| `backend/agents/code_agent.py` | `CodeAgent` - 3-tier scaffolded coding exercises |
| `backend/core/faithfulness_checker.py` | `FaithfulnessChecker` - LLM-based hallucination detection |
| `backend/core/content_moderator.py` | Content safety + prompt injection filtering |
| `backend/core/tts_client.py` | `IFlytekTTSClient` + Edge-TTS with caching |
| `backend/api/routers/resources.py` | Resource generation API endpoints |

### Database Schema

```sql
-- GeneratedResource model (backend/models/database.py)
id: String(50, PK)                    -- "res_{uuid12}" format
student_id: String(50, FK)            -- References student_profiles
topic: String(200)                    -- Topic name (indexed)
resource_type: String(50)             -- "notes" | "mindmap" | "quiz" | "video" | "code"
content: JSONB                        -- The actual generated resource content
source: String(50)                    -- "auto" | "remedial" | "user_requested"
weak_concepts_targeted: ARRAY(String) -- Concepts targeted (for remedial resources)
is_remedial: Boolean                  -- True if generated after quiz failure
consumed: Boolean                     -- Whether student has viewed this resource
created_at: DateTime(timezone=True)   -- Creation timestamp

-- Relationship
student: relationship("StudentProfile")
```

### API Endpoints

**Resources Router** (`/api/resources`):
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/resources/generate` | POST | Generate resource bundle (blocking) |
| `/api/resources/generate/stream` | POST | Generate with SSE progress streaming |
| `/api/resources/remedial/{student_id}/{topic}` | GET | Get remedial resources for weak concepts |
| `/api/resources/{resource_id}/consumed` | POST | Mark resource as viewed |
| `/api/resources/{topic}` | GET | Get cached resources (TODO: not implemented) |

**Request Schema:**
```json
{
  "topic": "Docker Containers",
  "student_id": "student_123",
  "profile": {"cognitive_style": "visual", "weak_points": ["networking"]},
  "context": "Additional context...",
  "agents": ["content", "quiz"],  // Optional override
  "agent_kwargs": {"num_questions": 10, "difficulty_override": "hard"}
}
```

## TTS Caching Strategy

**File:** `backend/core/tts_client.py`

**Providers:**
- **Edge-TTS** (default): Free, no API key, 9 English + 5 Chinese voices
- **iFlytek**: WebSocket API, requires `IFLYTEK_APP_ID`, `IFLYTEK_API_KEY`, `IFLYTEK_API_SECRET`

**Caching Flow:**
1. **Content Hash**: SHA256 of text content
2. **Cache Lookup**: Check if audio exists in `/tts_cache/{hash}.mp3`
3. **Batch Synthesis**: `batch_synthesize_to_cache()` for all slides at once
4. **URL Format**: `/api/tts/cached/{cache_key}`

**Default Voice:** `en-US-JennyNeural` (Edge-TTS, female, friendly)

## Testing

**Orchestrator Streaming Tests:** `backend/tests/test_orchestrator_stream.py` (10+ tests)
- Event ordering (plan → agent_started → agent_complete → complete)
- Invalid agent filtering from plan
- Result aggregation in complete event
- Concurrent agent execution (fast agent completes before slow)
- Error handling (agent_failed events, non-blocking failures)
- Edge cases (empty selection, node_id propagation)

**Orchestrator Tests:** `backend/tests/test_orchestrator.py`
- Agent selection logic based on profile
- Profile match calculation

**Content Moderator Tests:** `backend/tests/test_content_moderator.py` (19 tests)
- Category detection and severity handling
- Redaction and blocking behavior

**Content Agent Tests:** `backend/tests/test_content_agent.py`
- RAG chunk retrieval and formatting
- Faithfulness integration

## Completion Status

**Status: 100% Complete** (within scope)

| Requirement | Status |
|-------------|--------|
| 5 specialized agents (content, quiz, mindmap, media, code) | ✅ Complete |
| BaseAgent with shared profile handling | ✅ Complete |
| Async parallel dispatch with semaphore | ✅ Complete |
| Profile-based agent selection | ✅ Complete |
| RAG grounding with embedding + keyword fallback | ✅ Complete |
| Faithfulness checking with LLM verification | ✅ Complete |
| Content moderation + prompt injection filtering | ✅ Complete |
| Streaming generation with SSE events | ✅ Complete |
| TTS pre-generation with Edge-TTS + iFlytek | ✅ Complete |
| Remedial resource generation after quiz failure | ✅ Complete |
| Resource consumption tracking | ✅ Complete |
| True video generation (WAN2.1) | ❌ Out of scope |

## Performance

- **Concurrent agents**: 5 max with `asyncio.Semaphore(5)`
- **Typical generation time**: 30-60 seconds (all 5 agents)
- **Streaming overhead**: ~5% slower but significantly better UX
- **TTS cache hit rate**: ~80% for repeated content
- **RAG retrieval**: 3 chunks per agent (configurable via `max_rag_chunks`)
- **Max tokens**: Content (4000), Quiz (2000), MindMap (2500), Media (8000), Code (4000)

## Future Enhancements

1. **Agent-specific LLMs**: Use smaller/faster models per agent type
2. **Incremental generation**: Stream partial content as it's ready
3. **Student feedback loop**: Use ratings to improve future generations
4. **A/B testing**: Compare agent configurations
5. **Resource caching**: Redis-based caching for `/api/resources/{topic}` endpoint
6. **True video generation**: WAN2.1 integration for animated video output
7. **Code execution**: Judge0 integration for sandbox code testing
