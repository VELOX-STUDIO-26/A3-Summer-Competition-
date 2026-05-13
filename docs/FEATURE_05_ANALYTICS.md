# Feature 5: Learning Assessment & Analytics

## Overview

The Learning Assessment & Analytics system collects behavioral signals from student interactions, processes them through analytics endpoints, and provides insights for both students and teachers. It tracks quiz performance, resource engagement, tutor interactions, and path completion.

## Signal Collection

### 1. Quiz Performance

**File:** `backend/api/routers/quiz.py`

```python
@router.post("/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: str,
    student_id: str,
    answers: List[AnswerSubmission],
    time_taken: int
):
    # Calculate score
    # Store QuizAttempt
    # Trigger analytics event
    # Trigger adaptation event
```

**Tracked Metrics:**
- Answer correctness
- Time spent per question
- Confidence ratings
- Hint usage
- Attempt count

**Database:**
```sql
-- QuizAttempt model
attempt_id: String(PK)
quiz_id: String(FK)
student_id: String(FK)
score: Float  # 0.0-1.0
time_taken: Integer  # seconds
answers: JSON  # [{question_id, answer, correct}]
confidence_avg: Float
completed_at: Timestamp
```

### 2. Resource Engagement

**File:** `backend/api/routers/tracking.py`

Events tracked:
- `resource_viewed`: Student opened resource
- `resource_consumed`: Completed reading/watching
- `resource_liked`: Positive feedback
- `resource_bookmarked`: Saved for later
- `time_spent`: Duration on resource

```python
class ResourceEvent(BaseModel):
    event_type: str  # viewed|consumed|liked|bookmarked
    resource_id: str
    student_id: str
    duration_seconds: Optional[int]
    metadata: Optional[Dict]
```

### 3. Tutor Interactions

**File:** `backend/api/routers/tutor_sessions.py`

Tracked via session messages:
- Message count
- Question topics
- Follow-up patterns
- Time between messages
- Session duration

```sql
-- TutorSession model
session_id: String(PK)
student_id: String(FK)
message_count: Integer
created_at: Timestamp
updated_at: Timestamp
```

### 4. Path Completion

**File:** `backend/api/routers/milestone.py`

Milestone progress tracking:
- Nodes completed
- Time per node
- Revisit count
- Gate scores

```sql
-- MilestoneProgress model
student_id: String(FK)
milestone_id: String(FK)
node_id: String
completed: Boolean
completed_at: Timestamp
attempts: Integer
time_spent: Integer  # seconds
```

## Analytics Endpoints

**File:** `backend/api/routers/analytics.py`

### 1. Student Analytics

**Endpoint:** `GET /api/analytics/{student_id}`

```json
{
  "student_id": "s123",
  "summary": {
    "total_study_time": 3600,
    "resources_consumed": 15,
    "quizzes_taken": 8,
    "avg_quiz_score": 0.82,
    "current_streak": 5
  },
  "topic_mastery": {
    "docker": 0.75,
    "kubernetes": 0.60,
    "microservices": 0.45
  },
  "activity_by_day": [
    {"date": "2026-05-01", "minutes": 45, "actions": 12}
  ]
}
```

### 2. Progress Tracking

**Endpoint:** `GET /api/analytics/{student_id}/progress`

Returns learning path progress:
- Completion percentage
- Current position
- Remaining nodes
- Estimated completion

### 3. Activity Feed

**Endpoint:** `GET /api/analytics/{student_id}/activity`

Chronological activity log:
```json
[
  {
    "timestamp": "2026-05-14T10:30:00Z",
    "type": "quiz_completed",
    "topic": "Docker Basics",
    "score": 0.85
  },
  {
    "timestamp": "2026-05-14T10:15:00Z",
    "type": "resource_consumed",
    "resource_type": "video",
    "duration": 900
  }
]
```

### 4. Dashboard Summary

**Endpoint:** `GET /api/analytics/{student_id}/dashboard`

Aggregated for dashboard widgets:
```json
{
  "mastery_progress": 65,
  "weekly_goal_progress": 0.8,
  "weak_topics": ["Kubernetes Networking", "Service Mesh"],
  "streak_days": 5,
  "recent_activity": [...],
  "recommendations": [...]
}
```

## Assessment Components

### 1. Quiz System

**File:** `backend/agents/quiz_agent.py`

Adaptive quiz generation:
- **Difficulty scaling**: Based on mastery + weak points
- **Topic coverage**: Tests across learning path nodes
- **Question types**: Multiple choice, short answer, coding

**Grading:**
- **Multiple choice**: Automatic
- **Short answer**: LLM evaluation with rubric
- **Coding**: Judge0 execution

**Files:**
- `backend/agents/coding_grader.py`
- `backend/agents/short_answer_grader.py`

### 2. Gate System

**File:** `backend/agents/gate_agent.py`

Milestone unlock scoring:
```python
gate_score = (
    completion_rate * 0.4 +      # % nodes completed
    avg_quiz_score * 0.4 +       # Quiz performance
    engagement_score * 0.2       # Resource consumption
)

unlock_threshold = 0.7
```

### 3. Evaluation Agent

**File:** `backend/agents/evaluator_agent.py`

Post-quiz analysis:
- Weak topic identification
- Remedial resource suggestions
- Progress recommendations

## Analytics Insights

### Current Implementation

**Raw Aggregates:**
- Total study time
- Resource counts
- Quiz scores
- Completion rates

**Calculated Metrics:**
- Mastery percentage
- Streak tracking
- Topic progress

### Missing: LLM-Powered Analytics

The following are **not yet implemented**:

1. **Behavioral Pattern Analysis**
   - Study time patterns (night owl vs early bird)
   - Learning velocity trends
   - Engagement quality scoring

2. **Predictive Analytics**
   - Completion forecast
   - At-risk prediction
   - Mastery trajectory

3. **Comparative Analytics**
   - Cohort percentile
   - Peer benchmarking
   - Historical comparisons

4. **Anomaly Detection**
   - Sudden drop-offs
   - Unusual patterns
   - Intervention triggers

## Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `backend/api/routers/analytics.py` | Analytics endpoints |
| `backend/api/routers/quiz.py` | Quiz management |
| `backend/api/routers/tracking.py` | Event tracking |
| `backend/agents/quiz_agent.py` | Quiz generation |
| `backend/agents/gate_agent.py` | Milestone scoring |
| `backend/agents/evaluator_agent.py` | Post-quiz evaluation |
| `backend/agents/coding_grader.py` | Code grading |
| `backend/agents/short_answer_grader.py` | SA grading |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/{student_id}` | GET | Student analytics |
| `/api/analytics/{student_id}/progress` | GET | Progress tracking |
| `/api/analytics/{student_id}/activity` | GET | Activity feed |
| `/api/analytics/{student_id}/dashboard` | GET | Dashboard summary |
| `/api/quiz` | GET/POST | Quiz listing/generation |
| `/api/quiz/{id}` | GET | Quiz details |
| `/api/quiz/{id}/start` | POST | Start quiz attempt |
| `/api/quiz/{id}/submit` | POST | Submit answers |
| `/api/tracking/events` | POST | Log tracking event |
| `/api/milestone/{id}/gate` | GET | Calculate gate score |

### Database Models

```sql
-- Quiz
quiz_id: String(PK)
title: String
description: Text
category: String
difficulty: Float
questions: JSON
created_at: Timestamp

-- QuizAttempt
attempt_id: String(PK)
quiz_id: String(FK)
student_id: String(FK)
score: Float
time_taken: Integer
answers: JSON
completed_at: Timestamp

-- LearningEvent
event_id: String(PK)
student_id: String(FK)
event_type: String
metadata: JSON
created_at: Timestamp

-- MilestoneProgress
id: String(PK)
student_id: String(FK)
milestone_id: String(FK)
node_id: String
completed: Boolean
completed_at: Timestamp
```

## Frontend Integration

### Missing: Student Analytics Dashboard

The following frontend components **do not exist**:

- ❌ Radar chart for 6 mastery dimensions
- ❌ Progress trend line chart
- ❌ Weekly activity heatmap
- ❌ Weak topics list
- ❌ Completion forecast
- ❌ Teacher dashboard

### Existing Components

- ✅ Quiz taking interface: `frontend/web/src/app/(dashboard)/quiz/`
- ✅ Quiz results: `frontend/web/src/app/(dashboard)/quiz/[quizId]/results/`
- ✅ Gate status: `frontend/web/src/components/milestone/GateStatus.tsx`

## Testing

- **Coverage**: Limited
- **Quiz tests**: Basic CRUD
- **Grader tests**: Faithfulness verification
- **Gap**: Comprehensive analytics testing

## Completion Status

**Status: ~45% Complete**

| Requirement | Status |
|-------------|--------|
| Quiz generation | ✅ Complete |
| Quiz grading | ✅ Complete |
| Gate calculation | ✅ Complete |
| Signal collection | ✅ Complete |
| Analytics endpoints | ✅ Complete |
| Raw aggregates | ✅ Complete |
| LLM-powered insights | ❌ Not implemented |
| Behavioral analysis | ❌ Not implemented |
| Predictive analytics | ❌ Not implemented |
| Student dashboard UI | ❌ Not implemented |
| Teacher dashboard | ❌ Not implemented |
| Anomaly detection | ❌ Not implemented |

## Gaps to Address

### Critical (P0)

1. **LLM Analytics Engine** (`backend/analytics/analytics_engine.py`)
   - Aggregate behavioral events
   - LLM analysis prompt
   - Return structured insights

2. **Student Analytics Dashboard**
   - Recharts integration
   - Radar chart for dimensions
   - Trend visualization

### Important (P1)

3. **Teacher Dashboard**
   - Class roster view
   - At-risk student flags
   - Class progress summary

4. **Predictive Models**
   - Completion forecasting
   - At-risk prediction
   - Mastery trajectory

## Future Enhancements

1. **Spaced Repetition**: Integrate forgetting curves for quiz scheduling
2. **Competitive Leaderboards**: Gamification elements
3. **Parent Dashboard**: Progress sharing
4. **Export Reports**: PDF progress reports
5. **Real-time Alerts**: Push notifications for teachers
