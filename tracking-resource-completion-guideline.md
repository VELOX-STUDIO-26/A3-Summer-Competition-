# A3 — Resource Tracking & Evaluation System
> Feature 5 Implementation Guide · Fahim + Sabbir + Rahber

---

## Table of Contents

1. [Overview](#overview)
2. [Resource Engagement Tracking Spec](#1-resource-engagement-tracking-spec)
3. [The 80% Gate Calculation — Spark LLM Prompt](#2-the-80-gate-calculation--spark-llm-prompt)
4. [Evaluator Agent Prompt — After Quiz Submission](#3-evaluator-agent-prompt--after-quiz-submission)
5. [Frontend Unlock UI States](#4-frontend-unlock-ui-states)
6. [Full System Flow](#5-full-system-flow)
7. [Database Schema](#6-database-schema)
8. [API Endpoints](#7-api-endpoints)

---

## Overview

The resource tracking and evaluation system works in 3 stages:

| Stage | Trigger | What happens |
|---|---|---|
| **1. Engagement tracking** | Student interacts with any resource | Events logged in real-time, gate score recalculated |
| **2. Gate calculation** | After every resource event | LLM checks if student hit 80% threshold to unlock quiz |
| **3. Evaluation** | Student submits milestone quiz | Evaluator agent maps wrong answers to concepts, updates profile, triggers resource regeneration |

### Decision outcomes after quiz

```
Score > 85% + fast    →  ACCELERATE  →  Next milestone unlocks + advanced content surfaced
Score 60–85%          →  CONTINUE    →  Next milestone unlocks normally
Score < 60%           →  REMEDIATE   →  Targeted resources regenerated for wrong concepts only
3 consecutive fails   →  REPLAN      →  Full milestone regenerated at simpler level
```

---

## 1. Resource Engagement Tracking Spec

> **Owner: Fahim (Backend)**
> Log all events to the `resource_events` table. Fire events from the frontend via POST `/api/events/resource`.

### Event Schema

```json
{
  "student_id": "UUID",
  "milestone_id": "string",
  "resource_id": "string",
  "resource_type": "notes | mindmap | video | code | practice_quiz",
  "event_type": "string",
  "value": "float (0.0 to 1.0 — completion percentage)",
  "metadata": "JSON object — extra context per event",
  "timestamp": "ISO8601"
}
```

---

### Lecture Notes — Scroll Depth Tracking

**Completion threshold:** `scroll_depth >= 0.80` AND `reading_time >= estimated_read_time × 0.60`

| Event | Value | Metadata | When to fire |
|---|---|---|---|
| `notes_opened` | `0.0` | `{ total_sections, word_count }` | On open |
| `notes_scroll` | `scroll_depth (0.0–1.0)` | `{ current_section }` | Every 10% scrolled |
| `notes_section_read` | `section_index / total_sections` | `{ section_title, time_spent_seconds }` | When section leaves viewport |
| `notes_closed` | `max_scroll_depth_reached` | `{ total_time_seconds }` | On close |

**Bonus signal:** `time_spent_on_page > (word_count / 200) × 60 seconds`
→ Means they actually read it, not just scrolled fast

**Penalty signal:** `time_spent < estimated_read_time × 0.30`
→ Mark as `rushed_through = true`

---

### Mind Map — Node Interaction Tracking

**Completion threshold:** `nodes_interacted >= 0.70` of total nodes
*(70% not 80% because mind maps are exploratory by nature)*

| Event | Value | Metadata | When to fire |
|---|---|---|---|
| `mindmap_opened` | `0.0` | `{ total_nodes, total_branches }` | On open |
| `node_clicked` | `nodes_clicked / total_nodes` | `{ node_id, node_name, depth_level }` | On click |
| `node_expanded` | `nodes_expanded / total_expandable` | `{ node_id, time_on_node_seconds }` | On expand |
| `mindmap_closed` | `nodes_interacted / total_nodes` | `{ total_time_seconds }` | On close |

**Bonus signal:** `avg_time_per_node > 3 seconds`
→ They read the nodes, not just clicked through

**Penalty signal:** `avg_time_per_node < 1.5 seconds`
→ Mark as `rushed_through = true`

---

### Video — Watch Time Tracking

**Completion threshold:** `watch_percentage >= 0.80`

| Event | Value | Metadata | When to fire |
|---|---|---|---|
| `video_started` | `0.0` | `{ total_duration_seconds }` | On play |
| `video_progress` | `seconds_watched / total_duration` | `{ current_position }` | Every 10 seconds |
| `video_paused` | `current_position / total_duration` | `{ pause_count, position_seconds }` | On pause |
| `video_replayed` | `replay_start / total_duration` | `{ replay_section, replay_count }` | On seek back |
| `video_speed_changed` | `current_position / total_duration` | `{ new_speed }` | On speed change |
| `video_completed` | `1.0` | `{ total_watch_time }` | On end |

**Bonus signal:** `replay_count > 0`
→ They rewatched a section = active engagement

**Penalty signal:** `playback_speed > 2.0`
→ Reduce completion credit by 20% — likely skimming

---

### Code Exercise — Attempt Tracking

**Completion threshold:** `at_least_1_test_passing = true`
**Full completion:** `all_tests_passing = true`

| Event | Value | Metadata | When to fire |
|---|---|---|---|
| `code_opened` | `0.0` | `{ total_tests, language }` | On open |
| `code_edited` | `0.3` | `{ lines_written }` | First keystroke |
| `code_run` | `0.5` | `{ run_count, errors: [] }` | On run |
| `tests_attempted` | `tests_passed / total_tests` | `{ passed, failed, error_messages }` | After each run |
| `code_completed` | `1.0` | `{ total_run_count, final_time }` | All tests pass |

**Bonus signal:** `run_count > 3`
→ They iterated and debugged = deep engagement

**Penalty signal:** `code_opened` then closed with `run_count = 0`
→ Count as 0% — they opened but didn't engage

---

### Practice Quiz — Attempt Rate Tracking

**Completion threshold:** `questions_attempted >= 0.80` of total
*(Score doesn't matter here — this is practice, not evaluation)*

| Event | Value | Metadata | When to fire |
|---|---|---|---|
| `practice_started` | `0.0` | `{ total_questions }` | On start |
| `question_answered` | `questions_answered / total_questions` | `{ question_id, answer, correct, time_seconds }` | On each answer |
| `practice_completed` | `1.0` | `{ score_percentage, wrong_question_ids }` | On finish |

---

## 2. The 80% Gate Calculation — Spark LLM Prompt

> **Owner: Fahim (Backend)**
> Call this after every resource event. Returns gate score and quiz unlock status.
> Endpoint: `POST /api/gate/calculate`

### Completion Weights Per Resource Type

| Resource | Weight |
|---|---|
| Lecture notes | 25% |
| Video | 25% |
| Mind map | 20% |
| Code exercise | 20% |
| Practice quiz | 10% |

### Scoring Rule

```
For each resource:
  threshold MET          →  award full weight
  50–79% of threshold    →  award half weight
  below 50% of threshold →  award zero weight
```

### Full Prompt

```
SYSTEM:
You are the Resource Completion Evaluator for the A3 learning system.
Your job is to calculate whether a student has engaged sufficiently
with their milestone resources to unlock the final milestone quiz.

You will receive a student's resource engagement data and must output
a JSON decision object. Output JSON only — no explanation, no markdown,
no code fences.

COMPLETION WEIGHTS PER RESOURCE TYPE:
- Lecture notes:    25% of total gate score
- Mind map:         20% of total gate score
- Video:            25% of total gate score
- Code exercise:    20% of total gate score
- Practice quiz:    10% of total gate score

COMPLETION THRESHOLDS PER RESOURCE TYPE:
- Lecture notes:    scroll_depth >= 0.80 AND
                    reading_time >= estimated_read_time * 0.60
- Mind map:         nodes_interacted >= 0.70 of total nodes
- Video:            watch_percentage >= 0.80
                    (penalise 20% if playback_speed > 2.0)
- Code exercise:    at_least_1_test_passing = true
- Practice quiz:    questions_attempted >= 0.80 of total

SCORING RULE:
For each resource:
  - threshold MET:          award full weight for that resource
  - 50–79% of threshold:    award half weight
  - below 50% of threshold: award zero weight

BYPASS RULE:
If bypass_requested = true, set quiz_unlocked = true and
bypass_mode = true regardless of resource engagement.
The quiz unlocks immediately. If student passes with >= 85%,
mark all resources as retroactively complete.

DECISION RULES for engagement_quality:
- "deep":    2 or more bonus signals triggered
- "surface": gate passed but no bonus signals triggered
- "skipped": gate_score < 0.50

RUSHED THROUGH = true if ANY of:
  - notes read time < estimated_read_time * 0.30
  - video playback_speed > 2.0
  - mindmap avg_time_per_node < 1.5 seconds

USER:
Calculate the quiz gate status for this student.

Student ID: {student_id}
Milestone: {milestone_id}
Milestone topic: {topic_name}

Resource engagement data:
{
  "notes": {
    "opened": true,
    "max_scroll_depth": {notes_scroll_depth},
    "time_spent_seconds": {notes_time},
    "estimated_read_time_seconds": {estimated_read_time},
    "completion_percentage": {notes_completion}
  },
  "mindmap": {
    "opened": {mindmap_opened},
    "total_nodes": {total_nodes},
    "nodes_interacted": {nodes_interacted},
    "avg_time_per_node_seconds": {avg_node_time},
    "completion_percentage": {mindmap_completion}
  },
  "video": {
    "started": {video_started},
    "watch_percentage": {video_watch_pct},
    "replay_count": {replay_count},
    "playback_speed": {playback_speed},
    "completion_percentage": {video_completion}
  },
  "code": {
    "opened": {code_opened},
    "lines_written": {lines_written},
    "run_count": {run_count},
    "tests_passed": {tests_passed},
    "total_tests": {total_tests},
    "completion_percentage": {code_completion}
  },
  "practice_quiz": {
    "started": {pq_started},
    "questions_attempted": {pq_attempted},
    "total_questions": {pq_total},
    "completion_percentage": {pq_completion}
  },
  "bypass_requested": {bypass_requested}
}

Return this exact JSON structure:
{
  "student_id": "{student_id}",
  "milestone_id": "{milestone_id}",
  "gate_score": 0.0,
  "quiz_unlocked": false,
  "bypass_mode": false,
  "resource_scores": {
    "notes": 0.0,
    "mindmap": 0.0,
    "video": 0.0,
    "code": 0.0,
    "practice_quiz": 0.0
  },
  "engagement_quality": "deep | surface | skipped",
  "engagement_signals": {
    "likely_read_notes": false,
    "replayed_video_sections": false,
    "debugged_code_actively": false,
    "rushed_through": false
  },
  "blocking_resources": [],
  "recommendation": "max 20 words — what the student should do next"
}
```

### Example Gate Output — Passed

```json
{
  "student_id": "abc-123",
  "milestone_id": "milestone-3",
  "gate_score": 0.87,
  "quiz_unlocked": true,
  "bypass_mode": false,
  "resource_scores": {
    "notes": 0.25,
    "mindmap": 0.20,
    "video": 0.20,
    "code": 0.15,
    "practice_quiz": 0.07
  },
  "engagement_quality": "deep",
  "engagement_signals": {
    "likely_read_notes": true,
    "replayed_video_sections": true,
    "debugged_code_actively": false,
    "rushed_through": false
  },
  "blocking_resources": [],
  "recommendation": "Great engagement — you are ready for the quiz"
}
```

### Example Gate Output — Blocked

```json
{
  "student_id": "abc-123",
  "milestone_id": "milestone-3",
  "gate_score": 0.52,
  "quiz_unlocked": false,
  "bypass_mode": false,
  "resource_scores": {
    "notes": 0.25,
    "mindmap": 0.10,
    "video": 0.12,
    "code": 0.05,
    "practice_quiz": 0.00
  },
  "engagement_quality": "surface",
  "engagement_signals": {
    "likely_read_notes": true,
    "replayed_video_sections": false,
    "debugged_code_actively": false,
    "rushed_through": false
  },
  "blocking_resources": ["video", "code", "practice_quiz"],
  "recommendation": "Watch the full video and attempt the code exercise to unlock quiz"
}
```

---

## 3. Evaluator Agent Prompt — After Quiz Submission

> **Owner: Sabbir (AI/Algorithms)**
> Call this the moment the student submits the final milestone quiz.
> Endpoint: `POST /api/evaluate/quiz`

### Decision Rules (apply in order)

```
1. score >= 85% AND time_taken < expected_time × 1.2   →  ACCELERATE
2. score >= 60%                                         →  CONTINUE
3. score < 60% AND consecutive_low_scores < 3           →  REMEDIATE
4. score < 60% AND consecutive_low_scores >= 3          →  REPLAN
5. rushed_through = true AND score < 70%
   → Override to REMEDIATE regardless of score
     (prevents gaming the system by rushing resources then quizzing)
```

### Regeneration Rules

```
ACCELERATE  →  should_regenerate = false
CONTINUE    →  scope = "targeted_concepts"
               (silently inject into next milestone — no failure messaging)
REMEDIATE   →  scope = "targeted_concepts"
               (only regenerate wrong concepts, not the whole milestone)
REPLAN      →  scope = "full_milestone"
               (regenerate entirely at a simpler starting level)
```

### Format Selection Rules

```
cognitive_style = "visual"   AND video score was low    →  prioritise mindmap + diagram
cognitive_style = "kinetic"  AND code score was low     →  prioritise code + interactive
student rushed through notes                            →  avoid notes, prioritise video
Always avoid the format with the lowest engagement score
Always use a different format than what they first studied with
```

### Full Prompt

```
SYSTEM:
You are the Assessment Evaluator Agent for the A3 personalized
learning system. Your job is to:
  1. Analyze a student's quiz results
  2. Identify exactly which concepts they misunderstood
  3. Determine the adaptation decision (accelerate/continue/remediate/replan)
  4. Generate precise profile updates
  5. Generate precise instructions for the Resource Regeneration Agent

Output a single JSON object only.
No markdown, no explanation, no code fences.

DECISION RULES (apply in priority order):
1. score >= 85% AND time_taken < expected_time * 1.2  → outcome = "accelerate"
2. score >= 60%                                       → outcome = "continue"
3. score < 60% AND consecutive_low_scores < 3         → outcome = "remediate"
4. score < 60% AND consecutive_low_scores >= 3        → outcome = "replan"
5. rushed_through = true AND score < 70%
   → override to "remediate" regardless of score

REGENERATION RULES:
- "accelerate"  → should_regenerate = false
- "continue"    → scope = "targeted_concepts" (silent injection into next milestone)
- "remediate"   → scope = "targeted_concepts" (wrong concepts only)
- "replan"      → scope = "full_milestone" (full regeneration, simpler level)

FORMAT SELECTION RULES:
- visual learner + low video engagement       → prioritise: mindmap, diagram
- kinetic learner + low code engagement       → prioritise: code, interactive
- student rushed notes                        → avoid: notes, prioritise: video
- Always avoid the lowest engagement format
- Always differ from the original format used

CONCEPT SEVERITY RULES:
- "critical": wrong on 2+ questions about same concept OR
              concept is a prerequisite for the next milestone
- "moderate": wrong once, concept is within this milestone scope
- "minor":    wrong once, likely careless error (fast answer, easy question)

USER:
Evaluate this student's milestone quiz and generate the adaptation plan.

━━━━━ STUDENT PROFILE ━━━━━
{
  "student_id": "{student_id}",
  "knowledge_base": {knowledge_base_json},
  "cognitive_style": "{cognitive_style}",
  "weak_points": {weak_points_array},
  "learning_pace": {pace_float},
  "content_preferences": {preferences_array}
}

━━━━━ QUIZ RESULTS ━━━━━
{
  "milestone_id": "{milestone_id}",
  "topic": "{topic_name}",
  "total_questions": {total_q},
  "score_percentage": {score_pct},
  "time_taken_seconds": {time_taken},
  "expected_time_seconds": {expected_time},
  "answers": [
    {
      "question_id": "q1",
      "question_text": "{question}",
      "concept_tag": "{concept}",
      "difficulty": "beginner | intermediate | advanced",
      "student_answer": "{answer}",
      "correct_answer": "{correct}",
      "is_correct": false,
      "time_spent_seconds": {time_on_q}
    }
  ]
}

━━━━━ ENGAGEMENT DATA FROM THIS MILESTONE ━━━━━
{
  "engagement_quality": "deep | surface | skipped",
  "rushed_through": false,
  "resource_scores": {resource_scores_json},
  "replay_count": {replay_count},
  "notes_read_time_seconds": {read_time}
}

━━━━━ PREVIOUS MILESTONE HISTORY ━━━━━
{
  "consecutive_low_scores": {consecutive_count},
  "topics_previously_failed": {failed_topics_array},
  "average_score_last_3_milestones": {avg_score}
}

Return this exact JSON:
{
  "student_id": "{student_id}",
  "milestone_id": "{milestone_id}",
  "evaluation_timestamp": "ISO8601",

  "decision": {
    "outcome": "accelerate | continue | remediate | replan",
    "next_milestone_unlocked": false,
    "reason": "max 30 words explaining the decision"
  },

  "concept_analysis": [
    {
      "concept": "concept name from wrong answer",
      "concept_tag": "concept_tag",
      "wrong_count": 1,
      "severity": "critical | moderate | minor",
      "likely_cause": "never_studied | misunderstood | confused_with_similar | careless_error",
      "evidence": "what the wrong answer reveals about the gap"
    }
  ],

  "profile_updates": {
    "weak_points_add": ["concept1", "concept2"],
    "weak_points_resolve": ["concept3"],
    "knowledge_base_updates": {
      "topic_name": 0.0
    },
    "pace_adjustment": 0.0,
    "confidence_delta": 0.0
  },

  "regeneration_instructions": {
    "should_regenerate": false,
    "scope": "full_milestone | targeted_concepts | none",
    "target_concepts": ["concept1", "concept2"],
    "format_instructions": {
      "avoid_formats": ["format student already saw and failed with"],
      "prioritise_formats": ["format based on cognitive style + what failed"],
      "complexity_level": "simpler | same | advanced"
    },
    "specific_instructions": "precise instructions for what new resources must cover differently"
  },

  "quiz_instructions": {
    "allow_requiz": false,
    "requiz_unlock_condition": "what must happen before re-quiz unlocks",
    "requiz_difficulty": "easier | same | harder",
    "focus_concepts": ["concept1", "concept2"]
  },

  "student_message": {
    "tone": "encouraging | neutral | urgent",
    "message": "what to show on results page — max 40 words, no technical jargon"
  }
}
```

### Example Evaluator Output — Remediate

```json
{
  "student_id": "abc-123",
  "milestone_id": "milestone-3",
  "evaluation_timestamp": "2025-05-03T14:32:00Z",

  "decision": {
    "outcome": "remediate",
    "next_milestone_unlocked": false,
    "reason": "Score 48% — student misunderstood IAM roles and VPC basics, both prerequisites for M4"
  },

  "concept_analysis": [
    {
      "concept": "IAM roles vs users",
      "concept_tag": "iam_roles",
      "wrong_count": 2,
      "severity": "critical",
      "likely_cause": "confused_with_similar",
      "evidence": "Student answered 'IAM user' for programmatic access questions — confusing users with roles"
    },
    {
      "concept": "VPC subnets",
      "concept_tag": "vpc_subnets",
      "wrong_count": 1,
      "severity": "moderate",
      "likely_cause": "never_studied",
      "evidence": "Student left blank — likely never encountered subnet CIDR notation before"
    }
  ],

  "profile_updates": {
    "weak_points_add": ["iam_roles", "vpc_subnets"],
    "weak_points_resolve": [],
    "knowledge_base_updates": {
      "aws_iam": 0.35,
      "aws_vpc": 0.20
    },
    "pace_adjustment": -0.05,
    "confidence_delta": -0.10
  },

  "regeneration_instructions": {
    "should_regenerate": true,
    "scope": "targeted_concepts",
    "target_concepts": ["iam_roles", "vpc_subnets"],
    "format_instructions": {
      "avoid_formats": ["notes"],
      "prioritise_formats": ["video", "diagram"],
      "complexity_level": "simpler"
    },
    "specific_instructions": "Generate a short video comparing IAM users vs roles vs access keys with a real-world analogy. Generate a visual diagram of VPC subnets showing public vs private with CIDR examples. Keep both under 3 minutes total."
  },

  "quiz_instructions": {
    "allow_requiz": true,
    "requiz_unlock_condition": "New targeted resources must reach 80% completion gate",
    "requiz_difficulty": "easier",
    "focus_concepts": ["iam_roles", "vpc_subnets"]
  },

  "student_message": {
    "tone": "encouraging",
    "message": "Good effort! IAM roles and VPC subnets are genuinely tricky. We've added two short targeted resources — review those and you'll be ready."
  }
}
```

### Example Evaluator Output — Accelerate

```json
{
  "student_id": "abc-123",
  "milestone_id": "milestone-3",
  "evaluation_timestamp": "2025-05-03T15:10:00Z",

  "decision": {
    "outcome": "accelerate",
    "next_milestone_unlocked": true,
    "reason": "Score 91% completed faster than expected — student has strong existing cloud foundation"
  },

  "concept_analysis": [],

  "profile_updates": {
    "weak_points_add": [],
    "weak_points_resolve": ["cloud_basics", "service_models"],
    "knowledge_base_updates": {
      "aws_fundamentals": 0.91
    },
    "pace_adjustment": 0.10,
    "confidence_delta": 0.15
  },

  "regeneration_instructions": {
    "should_regenerate": false,
    "scope": "none",
    "target_concepts": [],
    "format_instructions": {
      "avoid_formats": [],
      "prioritise_formats": [],
      "complexity_level": "advanced"
    },
    "specific_instructions": ""
  },

  "quiz_instructions": {
    "allow_requiz": false,
    "requiz_unlock_condition": "",
    "requiz_difficulty": "harder",
    "focus_concepts": []
  },

  "student_message": {
    "tone": "encouraging",
    "message": "Excellent — you're ahead of pace! Milestone 4 is now unlocked and we've surfaced some advanced AWS content for you."
  }
}
```

---

## 4. Frontend Unlock UI States

> **Owner: Rahber (Frontend)**
> These are the 6 possible UI states for the quiz lock/unlock and results experience.

### State 1 — Resources incomplete `gate_score < 0.80`

```
Quiz button:  LOCKED (gray, disabled)
Label:        "Complete resources to unlock quiz"

Show:
  - Progress ring showing current gate_score %
  - Which resources are still blocking (from blocking_resources list)
  - Per-resource mini progress bars
  - Subtle "I already know this topic →" bypass link at bottom
```

### State 2 — Resources complete `gate_score >= 0.80`

```
Quiz button:  UNLOCKED (accent colour, pulse animation)
Label:        "Start milestone quiz →"

Show engagement_quality badge:
  "deep"    →  "Great engagement — you're ready 💪"
  "surface" →  "Quiz unlocked — consider reviewing weak sections first"
  "skipped" →  WARNING: "You rushed through the materials.
                We recommend reviewing before taking the quiz."
```

### State 3 — Bypass mode `bypass_requested = true`

```
Quiz button:  UNLOCKED immediately
Label:        "Test your existing knowledge →"

Show:
  "Skipping resources — quiz unlocked.
   Pass with 85%+ to mark this milestone complete without studying."
```

### State 4 — Post quiz: Pass `outcome = continue or accelerate`

```
Show:  Score + green banner

If CONTINUE:
  - student_message from evaluator (neutral tone)
  - Next milestone card: UNLOCKED with slide-in animation
  - If targeted regeneration: silently add resources to next milestone
  - Show subtle "Extra resources added" tag on next milestone
    (never use failure language)

If ACCELERATE:
  - confetti animation
  - "You're ahead of pace!" message
  - Advanced content badge on next milestone
  - student_message from evaluator (encouraging tone)
```

### State 5 — Post quiz: Fail `outcome = remediate`

```
Show:  Score + amber banner (never red)
Show:  student_message from evaluator (encouraging tone)

Show section: "Here's what to review"
  - List concept_analysis items with severity badges
  - For each critical concept: show the wrong question + correct answer

Show section: "We've added targeted resources for:"
  - List target_concepts
  - Show new resource cards injected (video/diagram/etc)
  - New resource count badge

Next milestone: LOCKED
Re-quiz:       LOCKED with message "Complete the new resources first"
```

### State 6 — Post quiz: Replan `outcome = replan`

```
Show:  Score + amber banner
Show:  "Let's take a step back and rebuild this foundation"
Show:  Loading animation "Generating new learning path..."
Show:  student_message from evaluator (urgent but supportive)

Never show:
  - Red banners
  - "Failed" language
  - Shame-based messaging

Full milestone: Regenerated at simpler level
Re-quiz:        LOCKED until full new milestone hits 80% gate
```

---

## 5. Full System Flow

```
Student opens milestone
         │
         ▼
Studies resources
(F5 watches passively — fires events per resource type)
         │
         ▼
After every event:
POST /api/gate/calculate  ──►  Gate Calculation Prompt (#2)
         │
         ▼
gate_score returned ──► Frontend updates progress ring
         │
    ┌────┴─────┐
    │          │
 < 0.80      >= 0.80
    │          │
  LOCKED    UNLOCKED
    │       Quiz button activates (State 2)
    │          │
    ▼          ▼
 Student   Student takes milestone quiz
 keeps     (all answers submitted)
 studying       │
                ▼
         POST /api/evaluate/quiz
                │
                ▼
         Evaluator Agent runs (#3)
                │
         ┌──────┼──────────┬──────────┐
         │      │          │          │
    ACCEL   CONTINUE   REMEDIATE   REPLAN
         │      │          │          │
         ▼      ▼          ▼          ▼
    Unlock   Unlock    Stay on    Full path
    + adv    normally  milestone  replan
    content  + patch   + targeted + simpler
             resources resources  resources
         │      │          │          │
         └──────┴──────────┴──────────┘
                │
                ▼
    Backend: Apply profile_updates
    Backend: Trigger regeneration if needed
    Backend: Lock or unlock next milestone
    Backend: Store evaluation in DB
                │
                ▼
    Frontend: Show result State (4, 5, or 6)
```

---

## 6. Database Schema

> **Owner: Fahim (Database)**

### `resource_events` table

```sql
CREATE TABLE resource_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES users(id),
  milestone_id    VARCHAR(100) NOT NULL,
  resource_id     VARCHAR(100) NOT NULL,
  resource_type   VARCHAR(50) NOT NULL,
  event_type      VARCHAR(100) NOT NULL,
  value           FLOAT NOT NULL DEFAULT 0.0,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resource_events_student ON resource_events(student_id, milestone_id);
```

### `gate_calculations` table

```sql
CREATE TABLE gate_calculations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID NOT NULL REFERENCES users(id),
  milestone_id        VARCHAR(100) NOT NULL,
  gate_score          FLOAT NOT NULL,
  quiz_unlocked       BOOLEAN NOT NULL DEFAULT FALSE,
  bypass_mode         BOOLEAN NOT NULL DEFAULT FALSE,
  resource_scores     JSONB NOT NULL,
  engagement_quality  VARCHAR(20) NOT NULL,
  engagement_signals  JSONB NOT NULL,
  blocking_resources  TEXT[],
  recommendation      TEXT,
  calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `quiz_evaluations` table

```sql
CREATE TABLE quiz_evaluations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id                UUID NOT NULL REFERENCES users(id),
  milestone_id              VARCHAR(100) NOT NULL,
  score_percentage          FLOAT NOT NULL,
  outcome                   VARCHAR(20) NOT NULL,
  next_milestone_unlocked   BOOLEAN NOT NULL DEFAULT FALSE,
  concept_analysis          JSONB NOT NULL,
  profile_updates           JSONB NOT NULL,
  regeneration_instructions JSONB NOT NULL,
  student_message           JSONB NOT NULL,
  evaluated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `milestone_progress` table

```sql
CREATE TABLE milestone_progress (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              UUID NOT NULL REFERENCES users(id),
  milestone_id            VARCHAR(100) NOT NULL,
  status                  VARCHAR(20) NOT NULL DEFAULT 'locked',
  gate_score              FLOAT DEFAULT 0.0,
  quiz_score              FLOAT,
  quiz_outcome            VARCHAR(20),
  consecutive_low_scores  INT DEFAULT 0,
  attempt_count           INT DEFAULT 0,
  unlocked_at             TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, milestone_id)
);
```

---

## 7. API Endpoints

> **Owner: Fahim (Backend)**

### `POST /api/events/resource`
Log a resource engagement event.

**Request:**
```json
{
  "student_id": "UUID",
  "milestone_id": "milestone-3",
  "resource_id": "res-notes-3",
  "resource_type": "notes",
  "event_type": "notes_scroll",
  "value": 0.60,
  "metadata": { "current_section": "IAM Policies" }
}
```

**Response:**
```json
{
  "logged": true,
  "gate_score": 0.72,
  "quiz_unlocked": false,
  "blocking_resources": ["video", "code"]
}
```

---

### `POST /api/gate/calculate`
Force recalculate gate score for a student and milestone.

**Request:**
```json
{
  "student_id": "UUID",
  "milestone_id": "milestone-3"
}
```

**Response:** Full gate calculation JSON (see Section 2 example output)

---

### `POST /api/evaluate/quiz`
Submit quiz answers and run evaluator agent.

**Request:**
```json
{
  "student_id": "UUID",
  "milestone_id": "milestone-3",
  "answers": [
    {
      "question_id": "q1",
      "student_answer": "IAM User",
      "time_spent_seconds": 45
    }
  ],
  "time_taken_seconds": 380
}
```

**Response:** Full evaluation JSON (see Section 3 example output)

---

### `GET /api/gate/status/{student_id}/{milestone_id}`
Get current gate status for a student on a specific milestone.

**Response:**
```json
{
  "gate_score": 0.72,
  "quiz_unlocked": false,
  "resource_scores": {
    "notes": 0.25,
    "mindmap": 0.20,
    "video": 0.12,
    "code": 0.00,
    "practice_quiz": 0.00
  },
  "blocking_resources": ["video", "code", "practice_quiz"],
  "recommendation": "Watch the full video and attempt the code exercise"
}
```

---

### `POST /api/gate/bypass`
Student requests quiz bypass (I already know this).

**Request:**
```json
{
  "student_id": "UUID",
  "milestone_id": "milestone-3"
}
```

**Response:**
```json
{
  "quiz_unlocked": true,
  "bypass_mode": true,
  "message": "Quiz unlocked. Pass with 85%+ to complete this milestone."
}
```

---

## Quick Reference — Who Does What

| Section | Owner | Priority |
|---|---|---|
| Resource event tracking (frontend fires) | Rahber | Phase 3 |
| Resource events API + DB storage | Fahim | Phase 3 |
| Gate calculation prompt integration | Fahim | Phase 3 |
| Gate score UI + progress ring | Rahber | Phase 3 |
| Quiz unlock UI states | Rahber | Phase 3 |
| Evaluator agent prompt integration | Sabbir | Phase 6 |
| Profile update logic after evaluation | Fahim | Phase 6 |
| Regeneration trigger after evaluation | Sabbir | Phase 6 |
| Results page UI states | Rahber | Phase 6 |
| Database schema for all 4 tables | Fahim | Phase 1 |

---

*A3 Project · 15th China Software Cup · Track A3 · Sponsored by iFlytek*