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

## Future Enhancements

1. **Multi-objective optimization**: Balance difficulty, interest, career relevance
2. **Social paths**: Learn from cohort paths
3. **Time-series predictions**: Predict completion dates
4. **Spaced repetition**: Integrate forgetting curves
