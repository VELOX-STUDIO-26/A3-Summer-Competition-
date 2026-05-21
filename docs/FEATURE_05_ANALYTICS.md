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

### LLM-Powered Analytics ✅ IMPLEMENTED

**File:** `backend/analytics/analytics_engine.py`

**Endpoint:** `GET /api/analytics/{student_id}/insights`

The analytics engine aggregates behavioral data and uses Claude to generate personalized insights:

1. **Behavioral Pattern Analysis** ✅
   - Study time patterns (night owl vs early bird)
   - Learning velocity trends
   - Preferred study hours and days
   - Session duration analysis

2. **Predictive Analytics** ✅
   - Completion forecast (estimated days)
   - At-risk detection (inactivity, declining scores)
   - Mastery trajectory (improving/stable/declining)

3. **Personalized Recommendations** ✅
   - Weak topic focus suggestions
   - Resource type recommendations
   - Study schedule optimization

4. **Anomaly Detection** ✅
   - Inactivity alerts
   - Performance drop warnings
   - Intervention triggers

**Response Structure:**
```json
{
  "student_id": "s123",
  "generated_at": "2026-05-20T12:00:00Z",
  "behavioral_summary": {
    "study_pattern": {"preferred_hours": [21, 22], "busiest_day": "Wed"},
    "performance": {"avg_score": 78.5, "trend": "improving"},
    "engagement": {"preferred_resource": "video", "total_resources": 15}
  },
  "insights": [
    {
      "category": "pattern",
      "emoji": "🌙",
      "title": "Night Owl Pattern",
      "description": "You study best between 9-11 PM...",
      "confidence": 0.85,
      "priority": "medium"
    }
  ],
  "predictions": {
    "completion_forecast": "Estimated completion in 14 days",
    "at_risk": false,
    "mastery_trajectory": "improving"
  },
  "recommendations": [...],
  "alerts": [...]
}
```

### Still Missing: Comparative Analytics

The following are **not yet implemented**:

1. **Comparative Analytics**
   - Cohort percentile
   - Peer benchmarking
   - Historical comparisons

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

### Student Analytics Dashboard ✅ IMPLEMENTED

**File:** `frontend/web/src/app/(dashboard)/analytics/page.tsx`

The dashboard includes:

- ✅ **Radar chart** for topic mastery dimensions (Recharts)
- ✅ **Progress trend line chart** (14-day study hours)
- ✅ **Weekly activity bar chart** (Mon-Sun breakdown)
- ✅ **AI Insights panel** (LLM-generated observations)
- ✅ **Predictions widget** (completion forecast, at-risk status)
- ✅ **Recommendations list** (actionable next steps)
- ✅ **Alerts section** (warnings for concerning patterns)
- ✅ **Recent activity feed**
- ✅ **Achievements display**
- ✅ **Navigation from notebook** (sidebar link)

### Missing: Teacher Dashboard

- ❌ Class roster view
- ❌ At-risk student flags
- ❌ Class progress summary

### Existing Components

- ✅ Quiz taking interface: `frontend/web/src/app/(dashboard)/quiz/`
- ✅ Quiz results: `frontend/web/src/app/(dashboard)/quiz/[quizId]/results/`
- ✅ Gate status: `frontend/web/src/components/milestone/GateStatus.tsx`
- ✅ Analytics dashboard: `frontend/web/src/app/(dashboard)/analytics/page.tsx`

## Testing

- **Coverage**: Limited
- **Quiz tests**: Basic CRUD
- **Grader tests**: Faithfulness verification
- **Gap**: Comprehensive analytics testing

## Completion Status

**Status: ~95% Complete**

| Requirement | Status |
|-------------|--------|
| Quiz generation | ✅ Complete |
| Quiz grading | ✅ Complete |
| Gate calculation | ✅ Complete |
| Signal collection | ✅ Complete |
| Analytics endpoints | ✅ Complete |
| Raw aggregates | ✅ Complete |
| LLM-powered insights | ✅ Complete |
| Behavioral analysis | ✅ Complete |
| Predictive analytics | ✅ Complete |
| Anomaly detection | ✅ Complete |
| Student dashboard UI | ✅ Complete |
| Teacher dashboard | ❌ Not implemented |
| Comparative analytics | ✅ Complete |

## Gaps to Address

### Critical (P0) ✅ DONE

1. **LLM Analytics Engine** ✅ IMPLEMENTED
   - File: `backend/analytics/analytics_engine.py`
   - Endpoint: `GET /api/analytics/{student_id}/insights`
   - Aggregates behavioral events, calls Claude, returns structured insights

### Important (P1) - Partially Done

2. **Student Analytics Dashboard** ✅ IMPLEMENTED
   - File: `frontend/web/src/app/(dashboard)/analytics/page.tsx`
   - Recharts integration (Area, Bar, Radar charts)
   - AI Insights panel with LLM-generated observations
   - Predictions, recommendations, alerts
   - Navigation link from notebook sidebar

3. **Teacher Dashboard** ❌ NOT IMPLEMENTED
   - Class roster view
   - At-risk student flags
   - Class progress summary

4. **Comparative Analytics** ✅ IMPLEMENTED
   - File: `backend/analytics/comparative_analytics.py`
   - File: `backend/api/routers/cohorts.py`
   - Cohort management with auto-enrollment on login/register
   - Percentile rankings (quiz score, completion, study time)
   - Peer benchmarking with vs-average comparisons
   - Anonymized leaderboards with privacy opt-out
   - Cached statistics (24-hour refresh)
   - Frontend: "Peer Comparison" card on Analytics page

5. **AI Insights Caching** ✅ IMPLEMENTED
   - File: `backend/models/database.py` (AnalyticsInsightsCache model)
   - Insights cached for 24 hours to reduce LLM calls
   - Auto-regenerates on expiry
   - Cache metadata displayed on frontend

## Future Enhancements

1. **Spaced Repetition**: Integrate forgetting curves for quiz scheduling
2. ~~**Competitive Leaderboards**: Gamification elements~~ ✅ Done (anonymized leaderboards)
3. **Parent Dashboard**: Progress sharing
4. **Export Reports**: PDF progress reports
5. **Real-time Alerts**: Push notifications for teachers
