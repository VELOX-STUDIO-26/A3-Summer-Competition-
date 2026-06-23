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

The `AnalyticsEngine` class aggregates behavioral data and uses LLM to generate personalized insights:

#### BehavioralData Dataclass
```python
@dataclass
class BehavioralData:
    student_id: str
    # Study patterns
    study_sessions: List[Dict]      # [{date, start_time, duration, topic}]
    preferred_study_hours: List[int] # Hours 0-23
    study_days_pattern: Dict[str, int]  # {Mon: 3, Tue: 1, ...}
    avg_session_duration: float     # minutes
    # Quiz performance
    quiz_attempts: List[Dict]       # [{topic, score, time_taken}]
    avg_quiz_score: float
    score_trend: str                # "improving"|"declining"|"stable"
    weak_topics: List[str]
    strong_topics: List[str]
    # Progress
    path_completion_pct: float
    current_streak: int
    days_since_last_activity: int
    estimated_completion_days: Optional[int]
```

#### Analysis Features

1. **Behavioral Pattern Analysis** ✅
   - Study time patterns (night owl vs early bird detection)
   - Learning velocity trends (7-day and 30-day windows)
   - Preferred study hours and days
   - Session duration analysis

2. **Predictive Analytics** ✅
   - Completion forecast (based on weekly node completion rate)
   - At-risk detection (inactivity > 7 days, declining scores)
   - Mastery trajectory (comparing first half vs second half of attempts)

3. **Personalized Recommendations** ✅
   - Weak topic focus suggestions (topics with avg score < 70%)
   - Resource type recommendations (based on preferred_resource_type)
   - Study schedule optimization

4. **Anomaly Detection** ✅
   - Inactivity alerts (days_since_last_activity > 3)
   - Performance drop warnings (score_trend == "declining")
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

1. ~~**Comparative Analytics**~~ ✅ **IMPLEMENTED**
   - Cohort percentile
   - Peer benchmarking
   - Historical comparisons
   
   **Implementation:** `backend/analytics/comparative_analytics.py` + `backend/api/routers/cohorts.py`
   - Auto-enrollment on login/register
   - Percentile rankings (quiz score, completion, study time)
   - Anonymized leaderboards with privacy opt-out

## Implementation Details

### Key Files

| File | Purpose |
|------|---------|
| `backend/analytics/analytics_engine.py` | `AnalyticsEngine` with LLM insights, caching, behavioral aggregation |
| `backend/analytics/comparative_analytics.py` | `ComparativeAnalyticsEngine` with percentiles, cohort stats, leaderboards |
| `backend/services/analytics_service.py` | `AnalyticsService` for path ratings, sessions, quality scores |
| `backend/api/routers/analytics.py` | Student analytics, insights, progress, activity, path ratings |
| `backend/api/routers/cohorts.py` | Cohort CRUD, membership, comparative metrics, leaderboards |
| `backend/api/routers/quiz.py` | Quiz generation, submission, grading |
| `backend/agents/quiz_agent.py` | Adaptive quiz generation with difficulty scaling |
| `backend/agents/gate_agent.py` | Milestone unlock scoring (completion + quiz + engagement) |
| `backend/agents/evaluator_agent.py` | Post-quiz analysis, weak topic identification |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/{student_id}` | GET | Comprehensive analytics (overview, weekly, subjects, history) |
| `/api/analytics/{student_id}/progress` | GET | Progress over time (configurable days) |
| `/api/analytics/{student_id}/activity` | GET | Recent activity feed (events + quizzes) |
| `/api/analytics/{student_id}/dashboard` | GET | Dashboard summary (user, path, quizzes, goals) |
| `/api/analytics/{student_id}/insights` | GET | LLM-powered insights with 24h caching |
| `/api/analytics/paths/top-rated` | GET | Top-rated learning paths |
| `/api/analytics/paths/{id}/rate` | POST | Submit path rating (1-5 stars) |
| `/api/analytics/paths/{id}/ratings` | GET | Path ratings summary |
| `/api/analytics/paths/{id}/analytics` | GET | Computed path analytics |
| `/api/analytics/sessions/start` | POST | Start learning session |
| `/api/analytics/sessions/{id}/end` | POST | End session with metrics |
| `/api/cohorts` | GET/POST | Cohort listing/creation |
| `/api/cohorts/{id}` | GET/PATCH/DELETE | Cohort CRUD |
| `/api/cohorts/{id}/members` | GET/POST | Membership management |
| `/api/cohorts/{id}/statistics` | GET | Cohort-wide statistics |
| `/api/cohorts/{id}/leaderboard` | GET | Anonymized leaderboard |
| `/api/cohorts/{id}/comparative/{student_id}` | GET | Student comparative metrics |

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

### Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `test_analytics_insights.py` | 9 tests | Insights generation, caching (24h), cache retrieval, API responses |
| `test_comparative_analytics.py` | 8 tests | Cohort creation, membership, percentiles, leaderboards |
| `test_analytics_and_validation.py` | 8 tests | Graph validation, quality scores, structural validation |

**Total: 25+ tests for Feature 5**

### Key Test Cases

```python
# Analytics insights tests
test_fresh_insights_generation
test_cache_is_stored
test_cached_insights_returned
test_force_refresh_regenerates
test_cache_expiry
test_cache_duration_is_24_hours
test_insights_data_structure

# Comparative analytics tests
test_cohort_creation
test_student_membership
test_comparative_metrics_calculation
test_leaderboard_generation

# Validation tests
test_good_graph_passes_validation
test_few_topics_lowers_score
test_empty_graph_fails
test_duplicate_node_ids_fail
```

## Completion Status

**Status: 100% Complete**

| Requirement | Status | Notes |
|-------------|--------|-------|
| Quiz generation | ✅ Complete | Adaptive difficulty, topic coverage |
| Quiz grading | ✅ Complete | Auto + LLM for short answers |
| Gate calculation | ✅ Complete | 40% completion + 40% quiz + 20% engagement |
| Signal collection | ✅ Complete | Quiz, resource, tutor, path events |
| Analytics endpoints | ✅ Complete | 16+ endpoints |
| Raw aggregates | ✅ Complete | Study time, scores, streaks |
| LLM-powered insights | ✅ Complete | Claude-generated with fallback |
| Behavioral analysis | ✅ Complete | Study patterns, velocity, trends |
| Predictive analytics | ✅ Complete | Completion forecast, at-risk detection |
| Anomaly detection | ✅ Complete | Inactivity, performance drop alerts |
| Student dashboard UI | ✅ Complete | Recharts, AI insights panel |
| Insights caching | ✅ Complete | 24-hour cache with metadata |
| Comparative analytics | ✅ Complete | Percentiles, cohort stats, leaderboards |
| Path ratings | ✅ Complete | 1-5 stars with quality metrics |
| Teacher dashboard | ❌ Not implemented | Class roster, at-risk flags |

## Gaps to Address

### Critical (P0) ✅ DONE

1. **LLM Analytics Engine** ✅ IMPLEMENTED
   - File: `backend/analytics/analytics_engine.py`
   - Endpoint: `GET /api/analytics/{student_id}/insights`
   - Aggregates behavioral events, calls LLM (Kimi k2.6), returns structured insights

2. **Student Analytics Dashboard** ✅ IMPLEMENTED
   - File: `frontend/web/src/app/(dashboard)/analytics/page.tsx`
   - Recharts integration (Area, Bar, Radar charts)
   - AI Insights panel with LLM-generated observations
   - Predictions, recommendations, alerts
   - Navigation link from notebook sidebar

3. **Comparative Analytics** ✅ IMPLEMENTED
   - File: `backend/analytics/comparative_analytics.py`
   - File: `backend/api/routers/cohorts.py`
   - Cohort management with auto-enrollment on login/register
   - Percentile rankings (quiz score, completion, study time)
   - Peer benchmarking with vs-average comparisons
   - Anonymized leaderboards with privacy opt-out
   - Cached statistics (24-hour refresh)
   - Frontend: "Peer Comparison" card on Analytics page

4. **AI Insights Caching** ✅ IMPLEMENTED
   - File: `backend/models/database.py` (AnalyticsInsightsCache model)
   - Insights cached for 24 hours to reduce LLM calls
   - Auto-regenerates on expiry
   - Cache metadata displayed on frontend

### Important (P1) - Remaining

5. **Teacher Dashboard** ❌ NOT IMPLEMENTED
   - Class roster view
   - At-risk student flags
   - Class progress summary

## Caching Strategy

### Insights Cache
- **Duration**: 24 hours (`INSIGHTS_CACHE_DURATION_HOURS = 24`)
- **Model**: `AnalyticsInsightsCache` with `expires_at`, `generation_count`
- **Refresh**: `force_refresh=True` parameter or automatic on expiry
- **Fallback**: Rule-based insights if LLM fails

### Cohort Statistics Cache
- **Duration**: 24 hours (`COHORT_STATS_CACHE_HOURS = 24`)
- **Model**: `CohortStatistics` per metric type
- **Metrics**: mean, median, std_dev, min, max, percentiles (p10-p90)

### Student Comparative Metrics Cache
- **Model**: `StudentComparativeMetrics`
- **Fields**: quiz_score_percentile, completion_percentile, study_hours_percentile, vs_average, rank

## Database Models (Analytics-specific)

```python
# AnalyticsInsightsCache
class AnalyticsInsightsCache(Base):
    student_id = Column(String, primary_key=True)
    insights_data = Column(JSON)  # Full insights response
    behavioral_summary = Column(JSON)
    generated_at = Column(DateTime)
    expires_at = Column(DateTime)
    generation_count = Column(Integer)

# Cohort
class Cohort(Base):
    cohort_id = Column(String, primary_key=True)
    name = Column(String)
    course_id = Column(String)
    is_active = Column(Boolean)
    allow_leaderboard = Column(Boolean)
    min_members_for_comparison = Column(Integer, default=5)

# CohortMembership
class CohortMembership(Base):
    student_id = Column(String, ForeignKey)
    cohort_id = Column(String, ForeignKey)
    role = Column(String)  # "student" | "instructor"
    show_in_leaderboard = Column(Boolean)
    anonymous_alias = Column(String)  # e.g., "Curious Panda"

# StudentComparativeMetrics
class StudentComparativeMetrics(Base):
    student_id = Column(String)
    cohort_id = Column(String)
    quiz_score_percentile = Column(Float)
    completion_percentile = Column(Float)
    study_hours_percentile = Column(Float)
    overall_rank = Column(Integer)
    total_in_cohort = Column(Integer)
```

## Future Enhancements

1. **Spaced Repetition**: Integrate forgetting curves for quiz scheduling
2. ~~**Competitive Leaderboards**: Gamification elements~~ ✅ Done (anonymized leaderboards)
3. **Parent Dashboard**: Progress sharing
4. **Export Reports**: PDF progress reports
5. **Real-time Alerts**: Push notifications for teachers
6. **Teacher Dashboard**: Class roster, at-risk student flags, class progress summary
