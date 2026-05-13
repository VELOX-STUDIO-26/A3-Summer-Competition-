# Feature 2: Multi-Agent Resource Generation

## Overview

The Multi-Agent Resource Generation system coordinates 5 specialized AI agents to generate personalized learning resources in parallel. Each agent specializes in a specific content type, and the Orchestrator intelligently selects which agents to run based on the student's profile and topic.

## The 5 Agents

### 1. Content Agent
**File:** `backend/agents/content_agent.py`

Generates structured learning notes with:
- **Hierarchical sections**: H2/H3 headings for topic organization
- **Code blocks**: Syntax-highlighted examples
- **Tables**: Comparison matrices (e.g., AWS vs Azure vs GCP)
- **Bullet/numbered lists**: Key takeaways and steps
- **Bold highlights**: Important concepts

**Output Format:**
```json
{
  "title": "Topic Name",
  "content": "markdown content...",
  "summary": "brief summary",
  "key_concepts": ["concept1", "concept2"],
  "estimated_time": 15
}
```

### 2. Mind Map Agent
**File:** `backend/agents/mindmap_agent.py`

Generates interactive knowledge graph visualizations:
- **Node hierarchy**: Central topic → subtopics → details
- **Relationships**: Prerequisite links, related concepts
- **Difficulty indicators**: Color-coded by complexity
- **Estimated time**: Per node learning time

**Output Format:**
```json
{
  "nodes": [
    {"id": "1", "label": "Topic", "type": "root"},
    {"id": "2", "label": "Subtopic", "type": "child", "parent": "1"}
  ],
  "edges": [
    {"source": "1", "target": "2", "label": "includes"}
  ]
}
```

**Frontend Rendering:** `frontend/web/src/components/mindmap/InteractiveMindMap.tsx`

### 3. Quiz Agent
**File:** `backend/agents/quiz_agent.py`

Generates adaptive quizzes with:
- **Multiple choice**: 4 options with distractors
- **Difficulty calibration**: Adjusts to student profile
- **Concept coverage**: Tests across subtopics
- **Explanations**: Correct answer reasoning

**Output Format:**
```json
{
  "questions": [
    {
      "question_id": "q1",
      "question_text": "What is...?",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "Because...",
      "difficulty": 0.6,
      "topic": "subtopic"
    }
  ]
}
```

### 4. Media Agent
**File:** `backend/agents/media_agent.py`

Generates lecture-style content with:
- **Slide decks**: Multiple slides per topic
- **Text-to-speech**: Edge-TTS + iFlytek fallback
- **Content-addressable cache**: Audio cached by content hash
- **Visual elements**: Emojis, formatting

**Output Format:**
```json
{
  "slides": [
    {
      "title": "Slide Title",
      "content": "Bullet points...",
      "audio_key": "cache_key_for_tts"
    }
  ],
  "total_duration": 120
}
```

**Frontend:** `frontend/web/src/components/video/LecturePlayer.tsx`

### 5. Code Agent
**File:** `backend/agents/code_agent.py`

Generates hands-on coding exercises:
- **Programming problems**: Algorithmic challenges
- **Test cases**: Hidden and visible test suites
- **Judge0 integration**: Sandbox execution
- **Multi-language support**: Python, Java, Go, etc.

**Output Format:**
```json
{
  "exercises": [
    {
      "title": "Exercise Name",
      "description": "Problem statement...",
      "starter_code": "def solution(): ...",
      "test_cases": [
        {"input": "...", "expected": "...", "hidden": false}
      ],
      "hints": ["hint1", "hint2"]
    }
  ]
}
```

**Frontend:** `frontend/web/src/components/code/CodeExercise.tsx`

## Orchestrator Architecture

**File:** `backend/agents/orchestrator.py`

### Agent Selection Logic

The Orchestrator decides which agents to run based on:

```python
# Default: run core 3 agents
agents = ["content", "quiz", "mindmap"]

# Add media for visual learners
if "visual" in cognitive_style or "video" in content_preferences:
    agents.append("media")

# Add code for programming topics
programming_topics = ["docker", "kubernetes", "python", "api", ...]
if any(pt in topic_lower for pt in programming_topics):
    agents.append("code")

# Reorder based on cognitive style
if "kinesthetic" in cognitive_style:
    # Hands-on learners: code, quiz first
    agents = ["code", "quiz", ...]
```

### Parallel Execution

All selected agents run concurrently using `asyncio.gather()`:

```python
async def generate_resources(self, topic, profile, ...):
    tasks = []
    for agent_name in selected_agents:
        task = self._run_agent_with_semaphore(agent_name, ...)
        tasks.append(task)
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
```

### Streaming Resource Generation

**Endpoint:** `POST /api/resources/generate/stream`

Real-time progress events via SSE:

```
event: plan → {"agents": [...], "estimated_time": 45}
event: agent_started → {"agent": "content"}
event: agent_complete → {"agent": "content", "result": {...}}
event: agent_failed → {"agent": "media", "error": "..."}
event: complete → {"resources": {...}, "total_time": 42}
```

## Faithfulness Verification

**File:** `backend/core/faithfulness_checker.py`

Every agent output is checked for hallucinations:

```python
faithfulness_result = await faithfulness_checker.check_faithfulness(
    generated_text=content,
    source_chunks=rag_chunks,
    context=topic
)
```

**Output:**
- `score`: 0.0-1.0 faithfulness score
- `verified`: Boolean pass/fail
- `supported_claims`: Count of claims with evidence
- `contradicted_claims`: Count of claims contradicting sources
- `citations`: List of source references

## Content Moderation

**File:** `backend/core/content_moderator.py`

Pattern-based harmful content filtering:

- **Categories**: self-harm, violence, sexual-minors, hate speech, illegal activity
- **Severity levels**: high (always block), medium/low (warn/block based on mode)
- **Rule-based**: Regex patterns loaded from `data/moderation_rules.json`

## Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `backend/agents/orchestrator.py` | Agent coordination and selection |
| `backend/agents/content_agent.py` | Learning notes generation |
| `backend/agents/mindmap_agent.py` | Knowledge graph generation |
| `backend/agents/quiz_agent.py` | Quiz generation |
| `backend/agents/media_agent.py` | Lecture slides + TTS |
| `backend/agents/code_agent.py` | Coding exercises |
| `backend/core/faithfulness_checker.py` | Hallucination detection |
| `backend/core/content_moderator.py` | Content safety |
| `backend/api/routers/resources.py` | API endpoints |

### Database Schema

```sql
-- GeneratedResource model
id: String(PK)
student_id: String(FK)
topic: String
agent_type: Enum[content, mindmap, quiz, media, code]
data: JSON
created_at: Timestamp
faithfulness_score: Float
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/resources/generate` | POST | Generate resources (blocking) |
| `/api/resources/generate/stream` | POST | Generate with progress streaming |
| `/api/resources/{id}` | GET | Retrieve generated resource |
| `/api/resources/remedial/{student_id}/{topic}` | GET | Get remedial content |
| `/api/resources/{id}/consumed` | POST | Mark as consumed |

## TTS Caching Strategy

**File:** `backend/core/tts_client.py`

1. **Content Hash**: SHA256 of text content
2. **Cache Lookup**: Check if audio exists in `/tts_cache/{hash}.mp3`
3. **Cache Headers**: Immutable, long TTL
4. **Fallback Chain**: Edge-TTS (free) → iFlytek (competition) |

## Testing

- **10 tests** in `backend/tests/test_orchestrator_stream.py`
- **19 tests** in `backend/tests/test_content_moderator.py`
- **18 tests** in `backend/tests/test_gap_detector.py`

## Completion Status

**Status: ~98% Complete**

| Requirement | Status |
|-------------|--------|
| 5 specialized agents | ✅ Complete |
| Async parallel dispatch | ✅ Complete |
| Hallucination filter | ✅ Complete |
| RAG grounding | ✅ Complete |
| Streaming generation | ✅ Complete |
| TTS caching | ✅ Complete |
| Faithfulness checking | ✅ Complete |
| Content moderation | ✅ Complete |
| True video generation | ❌ Out of scope (WAN2.1) |

## Performance

- **Concurrent agents**: 5 max with semaphore
- **Typical generation time**: 30-60 seconds (all agents)
- **Streaming overhead**: ~5% slower but better UX
- **TTS cache hit rate**: ~80% for repeated content

## Future Enhancements

1. **Agent-specific LLMs**: Use smaller/faster models per agent type
2. **Incremental generation**: Stream partial content as it's ready
3. **Student feedback loop**: Use ratings to improve future generations
4. **A/B testing**: Compare agent configurations
