# Feature 3: Adaptive Learning Path Planning

## Overview

The Adaptive Learning Path Planning system uses A* search on a knowledge graph to generate personalized learning paths. It adapts to student progress through an event-driven DynamicAdaptationEngine that triggers remediation, acceleration, or replanning based on real-time performance signals.

## Knowledge Graph

**File:** `data/knowledge_graph_en.json`

The knowledge graph defines:
- **Nodes**: Learning topics with difficulty, estimated time, prerequisites
- **Edges**: Relationships (prerequisite, related, prerequisite-soft)
- **PageRank scores**: Pre-computed importance for heuristic calculation

### Node Structure

```json
{
  "node_id": "docker_basics",
  "title": "Docker Basics",
  "difficulty": 0.3,
  "est_minutes": 30,
  "hard_prerequisites": ["linux_fundamentals"],
  "soft_prerequisites": ["command_line_basics"],
  "topic_tags": ["docker", "containers"],
  "content_types": ["text", "video", "code"],
  "description": "Introduction to containerization..."
}
```

## A* Path Planning Algorithm

**File:** `backend/agents/path_planner.py`

### Cost Function

```
f(n) = g(n) + h(n) + λ₁ × profile_bias + λ₂ × preference_bonus
```

Where:
- **g(n)**: Cumulative path cost from start to n
- **h(n)**: Heuristic estimate (PageRank-based importance)
- **profile_bias**: Adjusts for weak points, goals, pace
- **preference_bonus**: Rewards preferred content types

### Hyperparameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| λ₁ | 0.3 | Profile bias weight |
| λ₂ | 0.2 | Preference bonus weight |
| δ | 15 | Milestone size (nodes per milestone) |
| σ | 10 | Min chunk size for splitting |
| τ | 8 | Min time gap between quizzes (minutes) |
| γ | 0.8 | Decay factor for recency penalty |

### Algorithm Steps

1. **Initialize**: Start node, student state
2. **Expand**: Visit lowest-f-cost node
3. **Calculate Costs**:
   - g(n) = edge weight (difficulty difference)
   - h(n) = (1 - PageRank) × difficulty
   - profile_bias = weak_point_match × λ₁
   - preference_bonus = content_match × λ₂
4. **Goal Test**: Reached target node or completed δ nodes
5. **Reconstruct Path**: Backtrack through came_from

### Example Path

```python
path = planner.plan_path(
    student_state=student,
    start_node="cloud_computing_intro",
    goal_node="kubernetes_advanced"
)
# Returns: ["cloud_intro", "docker_basics", "docker_networking", ...]
```

## Dynamic Adaptation Engine

**File:** `backend/adaptation/engine.py`

### Event-Driven Architecture

```
Performance Signal → Event Creation → Strategy Selection → Cooldown Check → Action Execution
```

### Event Types

| Event | Trigger | Strategy |
|-------|---------|----------|
| `QuizCompletedEvent` | Quiz submission | remediate / accelerate / continue |
| `GateCalculatedEvent` | Milestone unlock scoring | replan / unlock_next |
| `GoalChangedEvent` | Student updates goals | replan |
| `MilestoneStuckEvent` | 3+ retries on node | tutor_nudge / replan |

### Adaptation Strategies

#### 1. Remediate
- **Trigger**: Quiz score < 0.5 or weak point detected
- **Action**: Generate remedial resources on failed topics
- **Cooldown**: 2 minutes

#### 2. Accelerate
- **Trigger**: Quiz score > 0.85 and learning_pace > 0.7
- **Action**: Skip ahead, reduce node estimates
- **Cooldown**: 30 seconds

#### 3. Replan
- **Trigger**: Goal change or 3+ consecutive low scores
- **Action**: Recalculate path from current position
- **Cooldown**: 10 minutes

#### 4. Tutor Nudge
- **Trigger**: Stuck on milestone (> 3 retries)
- **Action**: Suggest tutor session on stuck topic
- **Cooldown**: 5 minutes

#### 5. Continue
- **Trigger**: Normal progress
- **Action**: No change, increment progress
- **Cooldown**: 30 seconds

### Cooldown System

Prevents double-firing from flaky clients:

```python
# Keyed on (student_id, strategy_name)
cooldown_key = f"{student_id}:{strategy}"
last_triggered = cooldown_map.get(cooldown_key)

if last_triggered and now - last_triggered < cooldown_duration:
    return AdaptationResult(
        strategy="noop",
        cooldown_active=True,
        cooldown_until=last_triggered + cooldown_duration
    )
```

## Recommendation Engine

**File:** `backend/adaptation/recommender.py`

Hybrid content-based + collaborative filtering:

### Content-Based Scoring

```python
content_score = Σ (topic_match × difficulty_match × format_match)
```

### Collaborative Filtering

```python
collab_score = Jaccard_similarity(student_history, similar_student_history)
```

### Hybrid Fusion

```python
final_score = α × content_score + (1 - α) × collab_score
# α = 0.7 (configurable)
```

### Features

- **Weak-point boost**: Failed topics get +0.3 score
- **Exclude mastered**: Completed nodes filtered out
- **Explainability**: Returns why recommended ("Because you struggled with X")

## Milestone System

**File:** `backend/api/routers/milestone.py`

### Gate Calculation

Milestones unlock based on gate scores:

```python
gate_score = (
    completion_rate × 0.4 +
    avg_quiz_score × 0.4 +
    engagement_score × 0.2
)

unlock_threshold = 0.7  # Configurable
```

### Progress Tracking

```sql
-- MilestoneProgress model
student_id: String(FK)
milestone_id: String(FK)
node_id: String
completed: Boolean
completed_at: Timestamp
attempts: Integer
```

## Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `backend/agents/path_planner.py` | A* path planning |
| `backend/adaptation/engine.py` | Dynamic adaptation |
| `backend/adaptation/recommender.py` | Content recommendations |
| `backend/adaptation/events.py` | Event definitions |
| `backend/api/routers/path.py` | Path API endpoints |
| `backend/api/routers/milestone.py` | Milestone management |
| `backend/api/routers/adaptation.py` | Adaptation endpoints |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/path/plan` | POST | Generate learning path |
| `/api/path/{id}` | GET | Get path details |
| `/api/milestone` | GET | List milestones |
| `/api/milestone/{id}/progress` | POST | Update node progress |
| `/api/milestone/{id}/gate` | GET | Calculate gate score |
| `/api/adapt/events/quiz_completed` | POST | Submit quiz event |
| `/api/adapt/events/goal_changed` | POST | Submit goal change event |
| `/api/adapt/recommend` | GET | Get recommendations |

### Frontend Components

**File:** `frontend/web/src/components/milestone/GateStatus.tsx`

- Visual milestone progress
- Gate unlock indicators
- Quiz unlock requirements
- Path visualization

## Testing

- **35 tests** in `backend/tests/test_adaptation_engine.py`
- **35 tests** in `backend/tests/test_recommender.py`

## Completion Status

**Status: 100% Complete**

| Requirement | Status |
|-------------|--------|
| A* over knowledge graph | ✅ Complete |
| Milestone splitting | ✅ Complete |
| Dynamic adaptation | ✅ Complete |
| Event-driven engine | ✅ Complete |
| Cooldown system | ✅ Complete |
| Recommendation engine | ✅ Complete |
| Hybrid CB+CF | ✅ Complete |
| Gate calculation | ✅ Complete |

## Performance

- **Path generation**: ~200ms for 50-node graph
- **Adaptation latency**: <100ms (event to action)
- **Recommendation**: ~50ms for top-10

---

## Dynamic Knowledge Graph Generation (v2.0)

### Problem Statement

Currently, the system only supports **Cloud Computing** with a pre-built knowledge graph. Students wanting to learn other subjects (ML, Web Dev, Cybersecurity, etc.) cannot use the platform.

### Solution: LLM-Generated Knowledge Graphs with User Validation

Generate knowledge graphs dynamically using LLM, validate with a critic agent, then let the user approve/edit before storing for future reuse.

---

### User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DYNAMIC PATH GENERATION                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PROFILING COMPLETE                                      │
│     └─ 6 dimensions extracted                               │
│     └─ Subject identified: "Machine Learning"               │
│                                                              │
│  2. SEARCH EXISTING GRAPHS                                  │
│     └─ Query: subject + goals + tags                        │
│     └─ Found match (>80% similarity)? → Use existing        │
│     └─ No match? → Generate new                             │
│                                                              │
│  3. GENERATE KNOWLEDGE GRAPH (if needed)                    │
│     └─ LLM generates graph structure                        │
│     └─ Validator agent checks:                              │
│         • Structural validity (no cycles, valid prereqs)    │
│         • Semantic validity (logical progression)           │
│         • Topic specificity (not vague)                     │
│     └─ Invalid? → Regenerate with feedback (max 3 total)    │
│                                                              │
│  4. A* PATH PLANNING                                        │
│     └─ Apply student profile to graph                       │
│     └─ Generate personalized path                           │
│                                                              │
│  5. USER PREVIEW & APPROVAL                                 │
│     └─ Show path visualization                              │
│     └─ Show social proof (if reused graph)                  │
│     └─ Options:                                             │
│         [✅ Looks Good] → Accept & start learning           │
│         [✏️ Edit Path] → Manual modifications               │
│         [🔄 Regenerate] → New generation (uses 1 credit)    │
│                                                              │
│  6. STORE VERIFIED GRAPH                                    │
│     └─ Save to database with metadata                       │
│     └─ Tag with subject, goals, difficulty                  │
│     └─ Mark as "user_verified"                              │
│     └─ Available for future students                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Generation Limits & Monetization

| User Type | Free Generations | Additional |
|-----------|------------------|------------|
| Free User | 3 per subject | Must pay for more |
| Premium User | Unlimited | Included in subscription |

**Rationale**: Limiting to 3 prevents abuse while allowing genuine iteration.

---

### Cost Analysis

#### Current: OpenRouter Free Models (Development Phase)

| Model | Cost | Notes |
|-------|------|-------|
| Llama 3.1 70B | $0.00 | Good quality, free tier |
| Mistral 7B | $0.00 | Decent, free tier |
| Gemma 2 | $0.00 | Decent, free tier |

**Current cost per generation: $0.00**

#### Future: Kimi K2.6 (Production)

| Step | Input Tokens | Output Tokens | Est. Cost |
|------|--------------|---------------|-----------|
| Generate Graph | ~800 | ~2,000 | ~$0.005-0.01 |
| Validate Graph | ~2,500 | ~500 | ~$0.003-0.005 |
| **Total per generation** | | | **~$0.01-0.02** |

#### Cost Projections at Scale

| Phase | Model | Cost/Gen | 1,000 users/month |
|-------|-------|----------|-------------------|
| Development | OpenRouter Free | $0.00 | $0 |
| Production | Kimi K2.6 | ~$0.015 | ~$22-30/month |
| Scale (5,000 users) | Kimi K2.6 + 70% cache | ~$0.015 | ~$35-45/month |

#### Cost Optimization Strategies

1. **Aggressive Caching**: Reuse verified graphs (target 70%+ cache hit)
2. **Tiered Models**: Use cheaper model for validation vs generation
3. **Popular Subject Pre-generation**: Pre-build graphs for common subjects
4. **Cache TTL**: 90 days for verified graphs

**Implementation**:
```python
class GenerationQuota:
    student_id: str
    subject: str
    generations_used: int  # Max 3 for free users
    last_generation_at: datetime
    
    def can_generate(self, is_premium: bool) -> bool:
        if is_premium:
            return True
        return self.generations_used < 3
    
    def consume_generation(self):
        self.generations_used += 1
        self.last_generation_at = datetime.utcnow()
```

---

### Knowledge Graph Storage Schema

```python
class StoredKnowledgeGraph:
    # Identity
    id: str                          # UUID
    subject: str                     # "Machine Learning"
    subject_normalized: str          # "machine_learning" (for search)
    
    # Categorization
    tags: List[str]                  # ["ML", "AI", "data science", "python"]
    goals: List[str]                 # ["become ML engineer", "learn deep learning"]
    difficulty_level: str            # "beginner" | "intermediate" | "advanced"
    estimated_duration_weeks: int    # 8
    
    # The Graph
    nodes: List[KnowledgeNode]       # Topics with difficulty, prereqs
    edges: List[KnowledgeEdge]       # Relationships
    
    # Source & Status
    source: str                      # "llm_generated" | "curated" | "user_modified"
    status: str                      # "draft" | "user_verified" | "popular" | "curated"
    
    # Quality Signals
    times_used: int                  # How many students used this
    times_accepted: int              # How many clicked "Looks Good"
    acceptance_rate: float           # times_accepted / times_shown
    avg_completion_rate: float       # % who finished paths using this graph
    avg_rating: float                # 1-5 stars after completion
    
    # Social Proof
    verified_by_count: int           # Number of users who verified
    first_verified_by: str           # student_id of first verifier
    
    # Versioning
    version: int                     # Increments on edit
    parent_graph_id: Optional[str]   # If forked from another graph
    created_at: datetime
    updated_at: datetime
    created_by: str                  # student_id or "system"

class KnowledgeNode:
    node_id: str                     # "neural_networks"
    title: str                       # "Neural Networks"
    description: str                 # "Learn the fundamentals..."
    difficulty: float                # 0.0 - 1.0
    estimated_minutes: int           # 45
    prerequisites: List[str]         # ["linear_algebra", "python_basics"]
    soft_prerequisites: List[str]    # ["calculus"] - helpful but not required
    topic_tags: List[str]            # ["deep learning", "AI"]
    content_types: List[str]         # ["video", "code", "interactive"]

class KnowledgeEdge:
    source: str                      # "linear_algebra"
    target: str                      # "neural_networks"
    relationship: str                # "prerequisite" | "related" | "soft_prerequisite"
    weight: float                    # Edge cost for A*
```

---

### Graph Matching Algorithm

When searching for existing graphs:

```python
async def find_matching_graph(
    subject: str,
    goals: List[str],
    knowledge_base: Dict[str, float],
    min_similarity: float = 0.8
) -> Optional[StoredKnowledgeGraph]:
    
    # 1. Normalize subject
    subject_normalized = normalize_subject(subject)
    
    # 2. Search by subject (exact + fuzzy)
    candidates = await db.search_graphs(
        subject_query=subject_normalized,
        status__in=["user_verified", "popular", "curated"],
        min_times_used=3
    )
    
    # 3. Score each candidate
    scored = []
    for graph in candidates:
        score = calculate_similarity(
            graph=graph,
            student_goals=goals,
            student_knowledge=knowledge_base
        )
        scored.append((graph, score))
    
    # 4. Return best match if above threshold
    scored.sort(key=lambda x: x[1], reverse=True)
    if scored and scored[0][1] >= min_similarity:
        return scored[0][0]
    
    return None

def calculate_similarity(graph, student_goals, student_knowledge) -> float:
    # Goal overlap (Jaccard similarity)
    goal_sim = jaccard(set(graph.goals), set(student_goals))
    
    # Knowledge coverage (do graph nodes cover what student wants?)
    coverage = len(set(graph.tags) & set(extract_tags(student_goals))) / len(graph.tags)
    
    # Quality bonus
    quality = graph.acceptance_rate * 0.3 + min(graph.times_used / 100, 1.0) * 0.2
    
    return goal_sim * 0.5 + coverage * 0.3 + quality * 0.2
```

---

### LLM Generation Prompt

```python
KNOWLEDGE_GRAPH_GENERATION_PROMPT = """
You are an expert curriculum designer. Generate a knowledge graph for learning {subject}.

Student Context:
- Goals: {goals}
- Current Knowledge: {knowledge_base}
- Learning Style: {cognitive_style}
- Pace: {learning_pace}

Requirements:
1. Generate 15-40 topic nodes (appropriate for the subject scope)
2. Each node must have:
   - Unique ID (snake_case)
   - Clear, specific title (not vague like "basics")
   - Difficulty score (0.0 = beginner, 1.0 = expert)
   - Estimated time in minutes (15-120)
   - Prerequisites (list of node IDs that must come before)
   - Topic tags for categorization
3. Ensure logical prerequisite chains (no cycles)
4. Include at least 2 "entry point" nodes (no prerequisites)
5. Difficulty should generally increase along prerequisite chains
6. Be SPECIFIC - "Linear Regression" not "ML Basics"

Return ONLY valid JSON:
{
  "subject": "Machine Learning",
  "difficulty_level": "beginner|intermediate|advanced",
  "estimated_weeks": 8,
  "nodes": [
    {
      "node_id": "python_for_ml",
      "title": "Python for Machine Learning",
      "description": "Essential Python skills for ML including NumPy and Pandas",
      "difficulty": 0.2,
      "estimated_minutes": 60,
      "prerequisites": [],
      "topic_tags": ["python", "numpy", "pandas"]
    },
    ...
  ],
  "tags": ["machine learning", "AI", "data science", "python"]
}
"""
```

---

### Validation Agent

```python
GRAPH_VALIDATION_PROMPT = """
You are a curriculum quality reviewer. Analyze this knowledge graph for {subject}.

Knowledge Graph:
{graph_json}

Check for these issues:
1. STRUCTURAL: Circular prerequisites, orphan nodes, missing required fields
2. LOGICAL: Wrong prerequisite order (e.g., advanced before basics)
3. COMPLETENESS: Missing critical topics for this subject
4. SPECIFICITY: Vague topic names that should be more specific
5. DIFFICULTY: Unrealistic difficulty progression
6. SCOPE: Too broad or too narrow for stated goals

Return JSON:
{
  "is_valid": true/false,
  "confidence": 0.0-1.0,
  "issues": [
    {"type": "logical", "severity": "high", "description": "...", "affected_nodes": ["node_id"]}
  ],
  "suggestions": [
    {"action": "add_node", "details": "Add 'Data Preprocessing' before 'Feature Engineering'"},
    {"action": "fix_prerequisite", "details": "..."}
  ],
  "missing_topics": ["topic1", "topic2"],
  "overall_quality": "poor|acceptable|good|excellent"
}
"""
```

---

### User Edit Capabilities

Users can manually edit the generated path:

| Action | Description | Implementation |
|--------|-------------|----------------|
| **Skip Node** | Mark as "already know" | Add to `knowledge_base`, recalculate path |
| **Add Node** | Request additional topic | LLM generates node, insert into graph |
| **Remove Node** | Don't want to learn this | Remove from path (not graph) |
| **Reorder** | Change sequence | Validate prerequisites still satisfied |
| **Adjust Time** | Change estimated duration | Update `estimated_minutes` |

```python
class PathEditRequest:
    action: str  # "skip" | "add" | "remove" | "reorder" | "adjust_time"
    node_id: Optional[str]
    new_position: Optional[int]  # For reorder
    new_value: Optional[Any]     # For adjust_time, add details
    
async def apply_edit(path: LearningPath, edit: PathEditRequest) -> LearningPath:
    if edit.action == "skip":
        # Mark node as completed, recalculate remaining path
        path.mark_completed(edit.node_id)
        return await recalculate_path(path)
    
    elif edit.action == "add":
        # Generate new node via LLM, insert at appropriate position
        new_node = await generate_single_node(edit.new_value, path.graph)
        path.insert_node(new_node, validate_prerequisites=True)
        return path
    
    elif edit.action == "remove":
        # Remove from path (keep in graph for others)
        path.remove_node(edit.node_id)
        return path
    
    elif edit.action == "reorder":
        # Validate prerequisites still satisfied
        if path.can_reorder(edit.node_id, edit.new_position):
            path.reorder(edit.node_id, edit.new_position)
        else:
            raise ValidationError("Cannot reorder: prerequisite violation")
        return path
```

---

### Social Proof Display

Show users that others have validated this path:

```
┌─────────────────────────────────────────────────────────────┐
│  📚 Your Machine Learning Path                              │
│                                                              │
│  ✅ Verified by 47 learners                                 │
│  ⭐ 4.6/5 average rating                                    │
│  📈 78% completion rate                                     │
│                                                              │
│  "This path helped me land my first ML job!" - @student123 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Data Sources**:
- `verified_by_count`: Number of users who clicked "Looks Good"
- `avg_rating`: Collected after path completion
- `avg_completion_rate`: % who finished all nodes
- `testimonials`: Optional user feedback (future feature)

---

### API Endpoints (New)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/graphs/search` | POST | Search existing graphs by subject/goals |
| `/api/graphs/generate` | POST | Generate new knowledge graph |
| `/api/graphs/{id}` | GET | Get graph details |
| `/api/graphs/{id}/verify` | POST | Mark graph as user-verified |
| `/api/graphs/{id}/rate` | POST | Submit rating after completion |
| `/api/path/preview` | POST | Preview path before accepting |
| `/api/path/accept` | POST | Accept path and start learning |
| `/api/path/edit` | POST | Apply user edits to path |
| `/api/path/regenerate` | POST | Request new generation (uses quota) |
| `/api/quota/{student_id}` | GET | Check generation quota |

---

### Database Tables (New)

```sql
-- Stored knowledge graphs
CREATE TABLE knowledge_graphs (
    id UUID PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    subject_normalized VARCHAR(255) NOT NULL,
    tags JSONB,
    goals JSONB,
    difficulty_level VARCHAR(50),
    estimated_duration_weeks INT,
    nodes JSONB NOT NULL,
    edges JSONB,
    source VARCHAR(50) DEFAULT 'llm_generated',
    status VARCHAR(50) DEFAULT 'draft',
    times_used INT DEFAULT 0,
    times_accepted INT DEFAULT 0,
    acceptance_rate FLOAT DEFAULT 0,
    avg_completion_rate FLOAT DEFAULT 0,
    avg_rating FLOAT DEFAULT 0,
    verified_by_count INT DEFAULT 0,
    first_verified_by VARCHAR(255),
    version INT DEFAULT 1,
    parent_graph_id UUID REFERENCES knowledge_graphs(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Generation quota tracking
CREATE TABLE generation_quotas (
    id UUID PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    subject_normalized VARCHAR(255) NOT NULL,
    generations_used INT DEFAULT 0,
    last_generation_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, subject_normalized)
);

-- Graph ratings
CREATE TABLE graph_ratings (
    id UUID PRIMARY KEY,
    graph_id UUID REFERENCES knowledge_graphs(id),
    student_id VARCHAR(255) NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(graph_id, student_id)
);

-- Indexes
CREATE INDEX idx_graphs_subject ON knowledge_graphs(subject_normalized);
CREATE INDEX idx_graphs_status ON knowledge_graphs(status);
CREATE INDEX idx_graphs_times_used ON knowledge_graphs(times_used DESC);
CREATE INDEX idx_quotas_student ON generation_quotas(student_id);
```

---

### Frontend Components (New)

| Component | Location | Purpose |
|-----------|----------|---------|
| `PathPreview.tsx` | `components/path/` | Visual path preview with approval buttons |
| `PathEditor.tsx` | `components/path/` | Manual path editing interface |
| `SocialProof.tsx` | `components/path/` | Display verification stats |
| `GenerationQuota.tsx` | `components/path/` | Show remaining free generations |
| `RegenerateModal.tsx` | `components/path/` | Confirm regeneration (uses quota) |

---

### Implementation Phases

| Phase | Tasks | Estimate | Status |
|-------|-------|----------|--------|
| **Phase 1** | Database schema, storage models | 2 days | ✅ Complete |
| **Phase 2** | LLM generation + validation agents | 3 days | ✅ Complete |
| **Phase 3** | Graph search/matching algorithm | 2 days | ✅ Complete |
| **Phase 4** | API endpoints | 2 days | ✅ Complete |
| **Phase 5** | Path preview UI | 2 days | ✅ Complete |
| **Phase 6** | Path editor UI | 2 days | ✅ Complete |
| **Phase 7** | Social proof + ratings | 1 day | ✅ Complete |
| **Phase 8** | Quota system + monetization | 1 day | ✅ Complete |
| **Total** | | **~15 days** | **Done** |

### Implementation Summary (May 22, 2026)

**Backend Components Created:**
- `models/database.py` - Added 4 new models: `DynamicKnowledgeGraph`, `GenerationQuota`, `GraphRating`, `PathPreview`
- `agents/knowledge_graph_generator.py` - LLM-based graph generation with structural validation
- `services/graph_service.py` - Graph search, matching, quota management, preview handling
- `api/routers/graphs.py` - 10 REST API endpoints for graph operations

**Frontend Components Created:**
- `components/path/PathPreview.tsx` - Visual path preview with social proof and editing
- `components/path/SubjectInput.tsx` - Subject search with existing graph suggestions
- `lib/api.ts` - Added 10 API functions for graph operations

**Tests Created:**
- `tests/test_dynamic_knowledge_graph.py` - 24 tests for database models
- `tests/test_knowledge_graph_generator.py` - 37 tests for generation/validation
- `tests/test_graph_service.py` - 23 tests for service layer

**Total: 84 unit tests passing**

---

### Quality Metrics to Track

| Metric | Target | Action if Below |
|--------|--------|-----------------|
| Graph acceptance rate | >70% | Improve generation prompt |
| Path completion rate | >50% | Review graph quality |
| User rating | >4.0/5 | Flag for manual review |
| Regeneration rate | <30% | Generation quality is good |
| Quota exhaustion rate | <10% | Most users happy with 3 tries |

---

---

## Hierarchical Knowledge Graph Structure (v2.1)

### Overview

The flat node structure is insufficient for real learning. A topic like "Python" cannot be learned in one 60-minute session. We need a **two-level hierarchical structure** with adaptive expansion.

### Structure Definition

```
Learning Path
├── Main Topic 1 (Milestone) ─────────────────────────────
│   ├── Subtopic 1.1 (Learnable Unit) → Resources generated
│   ├── Subtopic 1.2 (Learnable Unit) → Resources generated  
│   ├── Subtopic 1.3 (Learnable Unit) → Resources generated
│   └── Subtopic 1.4 (Learnable Unit) → Resources generated
│
├── Main Topic 2 (Milestone) ─────────────────────────────
│   ├── Subtopic 2.1 ...
│   └── Subtopic 2.2 ...
│
└── Main Topic N ...
```

### Constraints

| Level | Count | Description |
|-------|-------|-------------|
| **Main Topics** | 5-12 | Major milestones (e.g., Python, NumPy, ML Basics) |
| **Subtopics per Main** | 3-8 | Learnable units (e.g., Variables, Functions, OOP) |
| **Total Learnable Units** | 15-60 | Actual things student learns |

### Data Models

```python
@dataclass
class MainTopic:
    """A milestone in the learning path."""
    node_id: str                    # e.g., "python_fundamentals"
    title: str                      # e.g., "Python Fundamentals"
    description: str
    order: int                      # Position in learning path
    difficulty: float               # 0.0-1.0, average of subtopics
    estimated_minutes: int          # Sum of subtopic times
    subtopics: List[Subtopic]       # 3-8 subtopics
    prerequisites: List[str]        # Other main topic IDs
    status: str                     # locked | in_progress | completed
    
@dataclass
class Subtopic:
    """A learnable unit within a main topic."""
    node_id: str                    # e.g., "python_functions"
    parent_id: str                  # Links to MainTopic
    title: str                      # e.g., "Functions & Lambdas"
    description: str
    order: int                      # Position within parent
    difficulty: float               # 0.0-1.0
    estimated_minutes: int          # 15-60 minutes typically
    learning_points: List[str]      # Key concepts to cover
    topic_tags: List[str]
    status: str                     # locked | in_progress | completed
    resources: Optional[Resources]  # Generated on-demand
    quiz_score: Optional[float]     # After completion
```

### Generation Strategy

**Option A: All-at-once (Recommended for v2.1)**
```
1. User enters "Machine Learning"
2. Single LLM call generates:
   - 5-12 Main Topics with metadata
   - 3-8 Subtopics per Main Topic
   - Prerequisites and ordering
3. Total: ~30-60 subtopics in one call
```

**Option B: Lazy expansion (Future)**
```
1. Generate main topics only
2. When user starts a main topic, expand its subtopics
3. More LLM calls, but can adapt based on progress
```

### Resource Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User starts Main Topic 1                                   │
│  └── Subtopic 1.1 unlocked                                  │
│      ├── Generate resources for 1.1 (BLOCKING)              │
│      └── Queue background job for 1.2 resources             │
│                                                             │
│  User completes Subtopic 1.1                                │
│  ├── Quiz unlocks at 80% resource completion                │
│  │   OR bypass mode (must pass with 85%+)                   │
│  ├── If quiz passed (60%+): Unlock Subtopic 1.2             │
│  │   └── Resources already ready (background generated)     │
│  └── Queue background job for 1.3 resources                 │
│                                                             │
│  User completes all subtopics in Main Topic 1               │
│  └── Main Topic 2 unlocks                                   │
└─────────────────────────────────────────────────────────────┘
```

### Resource Caching Strategy

| Scenario | Action |
|----------|--------|
| **Same subtopic, same profile type** | Reuse cached resources |
| **Same subtopic, different difficulty need** | Regenerate with adjusted config |
| **Similar subtopic in different path** | Partial reuse (quiz questions vary) |

**Cache Key Structure:**
```python
cache_key = f"{subtopic_id}:{difficulty_bucket}:{cognitive_style}"
# Example: "python_functions:intermediate:visual"
```

### Unlock Logic

**Subtopic Unlock (within Main Topic):**
1. Complete current subtopic resources (80% gate score)
   - OR bypass mode (click "I already know this")
2. Pass quiz (60% for normal, 85% for bypass)
3. Next subtopic unlocks

**Main Topic Unlock:**
1. Complete ALL subtopics in previous main topic
2. OR bypass entire main topic (must pass comprehensive quiz with 85%+)

**Skip Subtopic Option:**
- Student can click "Skip - I know this"
- Takes a mini-quiz (5 questions)
- If score ≥ 80%, subtopic marked complete
- If score < 80%, must study the resources

### Adaptive Resource Difficulty

```python
def get_resource_config(student_id: str, subtopic_id: str) -> dict:
    """Determine resource generation config based on performance."""
    
    # Get previous subtopic quiz score
    prev_score = get_previous_subtopic_score(student_id, subtopic_id)
    
    if prev_score is None:
        return {"difficulty": "standard", "examples": 3}
    elif prev_score < 0.5:
        return {
            "difficulty": "simplified",
            "examples": 5,
            "more_scaffolding": True,
            "video_preferred": True
        }
    elif prev_score > 0.9:
        return {
            "difficulty": "advanced",
            "examples": 2,
            "skip_basics": True,
            "challenge_exercises": True
        }
    else:
        return {"difficulty": "standard", "examples": 3}
```

### Background Pre-fetch Logic

```python
async def prefetch_next_resources(student_id: str, current_subtopic_id: str):
    """Pre-generate resources for upcoming subtopics."""
    
    # Determine how many to prefetch based on learning pace
    student = await get_student_profile(student_id)
    
    if student.learning_pace > 0.7:
        prefetch_count = 3  # Fast learner
    elif student.learning_pace < 0.3:
        prefetch_count = 1  # Slow learner
    else:
        prefetch_count = 2  # Default
    
    # Get next N subtopics
    next_subtopics = get_next_subtopics(current_subtopic_id, prefetch_count)
    
    # Queue background generation jobs
    for subtopic in next_subtopics:
        config = get_resource_config(student_id, subtopic.node_id)
        await queue_resource_generation(
            subtopic_id=subtopic.node_id,
            student_id=student_id,
            config=config,
            priority=2  # Background priority
        )
```

### API Endpoints (New/Modified)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/graphs/generate` | POST | Generate hierarchical graph (main + subtopics) |
| `GET /api/graphs/{id}/subtopics/{main_id}` | GET | Get subtopics for a main topic |
| `POST /api/subtopics/{id}/start` | POST | Start a subtopic, trigger resource generation |
| `POST /api/subtopics/{id}/skip` | POST | Skip subtopic (triggers mini-quiz) |
| `GET /api/subtopics/{id}/resources` | GET | Get generated resources (or status) |
| `POST /api/resources/prefetch` | POST | Manually trigger prefetch |

### Database Schema Changes

```sql
-- Add parent_id to support hierarchy
ALTER TABLE dynamic_knowledge_graphs ADD COLUMN parent_id UUID REFERENCES dynamic_knowledge_graphs(id);
ALTER TABLE dynamic_knowledge_graphs ADD COLUMN node_type VARCHAR(20) DEFAULT 'main'; -- main | subtopic
ALTER TABLE dynamic_knowledge_graphs ADD COLUMN order_index INTEGER DEFAULT 0;

-- Resource cache table
CREATE TABLE cached_resources (
    id UUID PRIMARY KEY,
    subtopic_id VARCHAR(100) NOT NULL,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    resources JSONB NOT NULL,
    generation_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    use_count INTEGER DEFAULT 0
);

-- Resource generation queue
CREATE TABLE resource_generation_queue (
    id UUID PRIMARY KEY,
    subtopic_id VARCHAR(100) NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    config JSONB,
    priority INTEGER DEFAULT 2,  -- 1=current, 2=next, 3=prefetch
    status VARCHAR(20) DEFAULT 'pending',  -- pending | generating | complete | failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);
```

### Implementation Phases

| Phase | Tasks | Estimate | Status |
|-------|-------|----------|--------|
| **Phase 2.1.1** | Update data models for hierarchy | 1 day | ✅ Complete |
| **Phase 2.1.2** | Modify generation prompt for two-level output | 1 day | ✅ Complete |
| **Phase 2.1.3** | Add subtopic expansion API | 1 day | ✅ Complete |
| **Phase 2.1.4** | Resource caching layer | 2 days | ✅ Complete |
| **Phase 2.1.5** | Background prefetch queue | 2 days | ✅ Complete |
| **Phase 2.1.6** | Skip/bypass subtopic flow | 1 day | ✅ Complete |
| **Phase 2.1.7** | Frontend subtopic navigation | 2 days | � In Progress |
| **Phase 2.1.8** | Adaptive difficulty adjustment | 1 day | 📋 Planned |
| **Total** | | **~11 days** | |

### Implementation Summary (v2.1)

**Backend Components Created:**
- `models/database.py` - 6 new models: HierarchicalKnowledgeGraph, MainTopic, Subtopic, CachedResource, ResourceGenerationQueue, StudentSubtopicProgress
- `agents/hierarchical_graph_generator.py` - LLM-based hierarchical graph generation with validation
- `services/hierarchical_graph_service.py` - Service layer for graph management, progress tracking, caching, queue
- `api/routers/hierarchical_graphs.py` - 11 API endpoints

**Frontend Components:**
- `lib/api.ts` - 12 API functions for hierarchical graphs

**Tests Created:**
- `tests/test_hierarchical_models.py` - 20 tests for database models
- `tests/test_hierarchical_graph_generator.py` - 23 tests for generation/validation

**Total: 43 new unit tests passing**

---

### Future Enhancements

1. **Multi-objective optimization**: Balance difficulty, interest, career relevance
2. **Social paths**: Learn from cohort paths
3. **Time-series predictions**: Predict completion dates
4. **Spaced repetition**: Integrate forgetting curves
5. **Graph versioning**: Track changes, allow rollback
6. **Community curation**: Let experts review and improve graphs
7. **Cross-subject prerequisites**: "Learn Python" required for both ML and Web Dev
