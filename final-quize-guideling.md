# A3 — Final Milestone Quiz System
> Quiz Agent Implementation Guide · Dynamic Questions · Short Answer + Coding Challenges

---

## Table of Contents

1. [Quiz Overview](#1-quiz-overview)
2. [Dynamic Question Count Logic](#2-dynamic-question-count-logic)
3. [Question Type Distribution](#3-question-type-distribution)
4. [Difficulty Calibration](#4-difficulty-calibration)
5. [Short Answer Questions](#5-short-answer-questions)
6. [Coding Challenge Questions](#6-coding-challenge-questions)
7. [Grading System](#7-grading-system)
8. [Timing Rules](#8-timing-rules)
9. [Pass / Fail Thresholds](#9-pass--fail-thresholds)
10. [Attempt Rules](#10-attempt-rules)
11. [Quiz Agent Prompt](#11-quiz-agent-prompt)
12. [Short Answer Grader Prompt](#12-short-answer-grader-prompt)
13. [Coding Challenge Grader Prompt](#13-coding-challenge-grader-prompt)
14. [Quiz Output Schema](#14-quiz-output-schema)
15. [What the Quiz Must NOT Do](#15-what-the-quiz-must-not-do)
16. [Database Schema](#16-database-schema)
17. [API Endpoints](#17-api-endpoints)
18. [Who Does What](#18-who-does-what)

---

## 1. Quiz Overview

The final milestone quiz is the **evaluation gate** between milestones. It determines whether a student moves forward, stays for remediation, or gets their path accelerated. It is only unlocked after the student completes 80% of milestone resources.

### Core principles

- **Dynamic** — question count, difficulty, and type mix all adapt to the student profile and topic
- **Concept-grounded** — every question must be answerable from the milestone resources
- **Short answers included** — 2 short answer questions per quiz to verify genuine understanding, not just recall
- **Coding challenges included** — when the topic is programming-related, replace 1–2 MCQ with coding tasks
- **Never the same quiz twice** — questions are regenerated on every attempt with different wording

### Quiz unlocks after
- Resource gate score >= 80% (see Resource Tracking doc)
- OR student uses "I already know this" bypass

---

## 2. Dynamic Question Count Logic

Question count scales with **topic complexity** which is stored in the knowledge base metadata.

| Complexity level | Question count | When to use |
|---|---|---|
| `beginner` | 5 questions | Introductory topics, first milestone of a subject |
| `standard` | 8 questions | Most milestones — default |
| `complex` | 10 questions | Multi-concept topics with many sub-parts |
| `advanced` | 12 questions | Final milestones, prerequisite-heavy topics |

### How complexity is determined

The Quiz Agent reads `complexity_level` from the knowledge base chunk metadata. It is set when the knowledge base is indexed:

```json
{
  "topic": "AWS IAM",
  "complexity_level": "complex",
  "concept_count": 7,
  "prerequisite_topics": ["cloud_basics", "aws_fundamentals"],
  "has_coding_component": false,
  "subject_area": "cloud_computing"
}
```

### Rule: never go above 12 questions
Quiz fatigue is real. A student who is stressed and tired will guess randomly on questions 13+. The signal becomes noise. Hard cap at 12.

### Rule: never go below 5 questions
5 questions is the minimum to get a statistically meaningful score. Fewer than 5 means a single unlucky wrong answer tanks a student unfairly.

---

## 3. Question Type Distribution

### Standard distribution (8 questions — default)

| # | Type | Count | Purpose |
|---|---|---|---|
| Q1–Q3 | MCQ (4 options) | 3 | Factual recall, concept recognition |
| Q4 | Scenario-based MCQ | 1 | Apply knowledge to real situation |
| Q5 | True/False + justification | 1 | Forces explanation, not just guessing |
| Q6–Q7 | Short answer | 2 | Verify genuine understanding |
| Q8 | Coding challenge (if applicable) | 1 | Hands-on application — replaces 1 MCQ for coding topics |

### Full distribution table by question count

| Count | MCQ | Scenario MCQ | True/False | Short answer | Coding |
|---|---|---|---|---|---|
| 5 | 2 | 0 | 1 | 2 | 0 (or 1 if coding topic, replaces 1 MCQ) |
| 8 | 3 | 1 | 1 | 2 | 1 (if coding topic, replaces scenario MCQ) |
| 10 | 4 | 1 | 1 | 2 | 2 (if coding topic, replace 2 MCQ) |
| 12 | 5 | 1 | 1 | 2 | 3 (if coding topic, replace 3 MCQ) |

### Rules
- Short answer count is always **exactly 2** — never 0, never 3+
- Coding challenge only appears if `has_coding_component = true` in topic metadata
- If coding topic: coding challenge **replaces MCQ** — total question count stays the same
- Scenario MCQ always appears at complexity `standard` and above
- True/False always appears at all levels — it is a cheap but powerful signal

---

## 4. Difficulty Calibration

Difficulty adapts per student based on their **knowledge base mastery score** for that specific topic.

| Student mastery on topic | Easy | Medium | Hard |
|---|---|---|---|
| `0.0 – 0.3` (beginner) | 60% | 30% | 10% |
| `0.4 – 0.6` (intermediate) | 20% | 50% | 30% |
| `0.7 – 1.0` (advanced) | 0% | 40% | 60% |

### Minimum rules — always apply regardless of mastery
- Always at least **2 medium questions** — you need a minimum challenge for meaningful signal
- Always at least **1 hard question** if mastery > 0.5 — don't let advanced students coast
- Short answer questions are always **medium difficulty minimum**
- Coding challenges are always **medium-to-hard**

### Critical concept tagging
Some questions test concepts that are **prerequisites for the next milestone**. These are tagged `is_critical = true` and carry extra weight.

```
Regular question weight:           1.0 point
Critical concept question weight:  1.5 points
```

A student can pass overall but still trigger remediation if they fail all critical concept questions. Failing prerequisites means they will struggle in the next milestone even with a passing score.

---

## 5. Short Answer Questions

Short answer questions are the most valuable signal in the quiz. They cannot be guessed, they cannot be gamed, and they reveal whether the student genuinely understood the concept or just memorised terms.

### What makes a good short answer question

**Bad (recall only):**
> "What does IAM stand for?"

**Good (understanding):**
> "In your own words, explain why you would use an IAM role instead of an IAM user for an EC2 instance that needs access to S3."

**Bad (too vague):**
> "Describe cloud computing."

**Good (specific understanding):**
> "A startup wants to run a web app without managing servers. Which cloud service model fits best and why?"

### Short answer rules for the Quiz Agent

```
SHORT ANSWER RULES:
1. Both short answer questions must test DIFFERENT concepts
2. Expected response length: 2–4 sentences (state this in the question)
3. Must be answerable from the milestone resources — no outside knowledge needed
4. Should require the student to EXPLAIN, COMPARE, or JUSTIFY — not just name
5. Avoid questions with a single correct sentence answer — those are MCQ territory
6. For beginner students: "In your own words, explain..."
   For advanced students: "Compare X and Y — when would you choose one over the other?"
```

### Short answer question templates by topic type

**Conceptual topic (e.g. cloud computing, networking):**
```
Template 1: "In 2–3 sentences, explain [concept] and why it matters in [context]."
Template 2: "What is the difference between [concept A] and [concept B]?
             Give one real-world example of when you would use each."
```

**Process / workflow topic (e.g. CI/CD, deployment):**
```
Template 1: "Walk through the steps of [process] in your own words.
             What would happen if you skipped [specific step]?"
Template 2: "A developer encounters [specific problem]. Using what you
             learned, explain how [concept] solves this."
```

**Security / architecture topic (e.g. IAM, VPC):**
```
Template 1: "Why is [security concept] important? What could go wrong
             if a team ignored it?"
Template 2: "Your team needs to [specific scenario]. Explain which
             [concept] you would use and why."
```

---

## 6. Coding Challenge Questions

Coding challenges are included when `has_coding_component = true` for the topic. They replace MCQ questions — total count stays the same.

### When to include coding challenges

| Topic type | Include coding? |
|---|---|
| Python fundamentals | Yes |
| Data structures & algorithms | Yes |
| Cloud CLI / scripting (AWS CLI, Terraform) | Yes |
| Conceptual cloud (IAM theory, VPC theory) | No |
| Pure theory topics | No |
| DevOps / deployment | Yes — write config files or scripts |
| Machine learning concepts | Partial — include if topic covers implementation |

### Coding challenge difficulty levels

| Level | What it asks |
|---|---|
| Easy | Complete a function with a clear signature and 1–2 lines of logic |
| Medium | Write a function from scratch solving a specific problem |
| Hard | Debug broken code OR write a multi-step solution with edge cases |

### Coding challenge structure

Each coding challenge must include:

```json
{
  "question_type": "coding",
  "language": "python | javascript | bash | sql",
  "problem_statement": "Clear description of what the function must do",
  "starter_code": "def solution(params):\n    # Write your code here\n    pass",
  "test_cases": [
    {
      "id": "tc1",
      "input": "example_input",
      "expected_output": "expected_output",
      "is_visible": true,
      "description": "Basic case"
    },
    {
      "id": "tc2",
      "input": "edge_case_input",
      "expected_output": "edge_expected",
      "is_visible": false,
      "description": "Edge case — hidden from student"
    }
  ],
  "hints": ["Hint 1 — shown if student runs with 0 tests passing after 3 attempts"],
  "solution_explanation": "Shown after submission — explains the optimal approach"
}
```

### Test case visibility rules

```
Visible test cases:    2 — student can see input and expected output
Hidden test cases:     1–2 — student only sees pass/fail, not the input
                       (prevents hardcoding the answer)
```

### Coding challenge grading

```
All tests pass                  →  1.0 (full score)
Visible tests pass, hidden fail →  0.6 (partial credit)
Only 1 visible test passes      →  0.3 (partial credit)
Code runs but all tests fail    →  0.1 (attempted credit)
Code doesn't run (syntax error) →  0.0
Did not attempt                 →  0.0
```

### Coding challenge examples by topic

**Python fundamentals:**
```
Problem: Write a function that takes a list of integers and returns
         only the even numbers, sorted in ascending order.

Starter code:
def get_sorted_evens(numbers: list) -> list:
    # Write your code here
    pass

Visible test cases:
  Input: [5, 2, 8, 1, 4]  →  Expected: [2, 4, 8]
  Input: [1, 3, 7]        →  Expected: []

Hidden test case:
  Input: []               →  Expected: []  (edge case: empty list)
```

**AWS CLI / Cloud scripting:**
```
Problem: Write a bash command that lists all S3 buckets in your AWS
         account and saves the output to a file called buckets.txt

Starter code:
#!/bin/bash
# Write your AWS CLI command here

Visible test case:
  Running the script creates buckets.txt with bucket names

Hidden test case:
  Script exits with code 0 (no errors)
```

**Data structures:**
```
Problem: Implement a function that checks if a string is a valid
         palindrome (ignoring spaces and capitalisation).

Starter code:
def is_palindrome(s: str) -> bool:
    # Write your code here
    pass

Visible test cases:
  Input: "racecar"     →  Expected: True
  Input: "hello"       →  Expected: False

Hidden test cases:
  Input: "A man a plan a canal Panama"  →  Expected: True
  Input: ""                             →  Expected: True
```

---

## 7. Grading System

### MCQ and True/False — Automatic

```
Correct answer:   1.0 × question weight
Wrong answer:     0.0
Skipped:          0.0 (no penalty beyond zero — skipping is a Feature 5 signal)
```

### Short Answer — Spark LLM Graded

Graded 0.0 to 1.0 using the Short Answer Grader Prompt (Section 12).

```
Score 0.9 – 1.0:  Core concept correct, good explanation
Score 0.6 – 0.8:  Partially correct — right idea, incomplete or minor error
Score 0.3 – 0.5:  Some relevant knowledge shown but key concept missed
Score 0.0 – 0.2:  Incorrect or shows fundamental misunderstanding
```

### Coding Challenge — Test-Based + LLM Review

```
All tests pass:                    1.0 × question weight
Visible pass, hidden fail:         0.6 × question weight
Only 1 visible passes:             0.3 × question weight
Code runs, all tests fail:         0.1 × question weight (attempted credit)
Syntax error / does not run:       0.0
```

### Final Score Calculation

```
total_score = sum of (question_score × question_weight) for all questions
max_score   = sum of all question weights
percentage  = (total_score / max_score) × 100
```

**Example (8-question quiz):**

```
Q1 MCQ correct (weight 1.0):           1.0
Q2 MCQ wrong (weight 1.0):             0.0
Q3 MCQ correct (weight 1.0):           1.0
Q4 Scenario MCQ correct (weight 1.5):  1.5  ← critical concept
Q5 True/False correct (weight 1.0):    1.0
Q6 Short answer score 0.8 (weight 1.0): 0.8
Q7 Short answer score 0.6 (weight 1.0): 0.6
Q8 Coding: visible pass, hidden fail (weight 1.5): 0.9  ← critical

total_score = 1.0 + 0.0 + 1.0 + 1.5 + 1.0 + 0.8 + 0.6 + 0.9 = 6.8
max_score   = 1.0 + 1.0 + 1.0 + 1.5 + 1.0 + 1.0 + 1.0 + 1.5 = 9.0
percentage  = (6.8 / 9.0) × 100 = 75.6%  →  CONTINUE (pass)
```

---

## 8. Timing Rules

| Student pace profile | Suggested time | Auto-submit after |
|---|---|---|
| Slow / thorough (`pace < 0.4`) | 25 minutes | 40 minutes |
| Moderate (`pace 0.4 – 0.6`) | 18 minutes | 30 minutes |
| Fast (`pace > 0.6`) | 12 minutes | 22 minutes |

### Important timing rules

- **Soft timer only** — show a countdown but never auto-submit mid-answer
- **Auto-submit only at hard limit** — if student goes way over (40/30/22 min), then auto-submit with whatever they have answered
- **Time taken is a Feature 5 signal** — not a penalty itself
  - Much faster than expected → possible rushing → Feature 5 flags `rushed_through`
  - Much slower than expected → possible difficulty → Feature 5 flags `struggling`
- **Coding challenges get +5 min buffer** — if the quiz has coding questions, add 5 minutes to all time limits

### What to show in the UI

```
0–80% of time remaining:   Green timer — no urgency
80–95% of time remaining:  Amber timer — gentle warning "Time running low"
95–100% of time remaining: Red timer — "Almost out of time"
Hard limit reached:         Auto-submit with notification
```

---

## 9. Pass / Fail Thresholds

| Score | Decision | What happens |
|---|---|---|
| `>= 85%` + completed in reasonable time | **ACCELERATE** | Next milestone unlocks + advanced content surfaced |
| `60% – 84%` | **CONTINUE** | Next milestone unlocks normally |
| `< 60%` | **REMEDIATE** | Stay on milestone + targeted resources regenerated |
| `< 60%` + 3rd consecutive fail | **REPLAN** | Full milestone regenerated at simpler level |
| `rushed_through = true` AND `score < 70%` | **REMEDIATE override** | Forces remediation even if score is technically passing |

### Critical concept override rule

Even if overall score is a pass (>= 60%), the evaluator should trigger targeted remediation if:

```
- All critical concept questions answered wrong
- 2+ critical concept questions wrong AND they are prerequisites for next milestone
```

Student still unlocks next milestone but targeted patch resources are silently injected.

---

## 10. Attempt Rules

| Attempt | Condition to allow | Quiz version |
|---|---|---|
| 1st attempt | Quiz unlocked via gate or bypass | Fresh generation |
| 2nd attempt | New targeted resources hit 80% gate | Different questions, same concepts |
| 3rd attempt | 2nd attempt resources hit 80% gate | Different questions, slightly easier |
| 4th attempt+ | Triggers full REPLAN instead | Full milestone regenerated — new quiz from scratch |

### Core rule: never serve the same quiz twice

The Quiz Agent regenerates on every attempt. Same concept tags, different:
- Question phrasing
- MCQ option order
- Short answer framing
- Coding challenge problem (same concept, different problem)

This prevents students from memorising answers between attempts.

---

## 11. Quiz Agent Prompt

> **Owner: Sabbir (AI/Agents)**
> Called when: quiz is first generated for a milestone, or regenerated for a re-attempt.
> Output: JSON array of question objects (see Section 14 for schema).

```
SYSTEM:
You are the Quiz Agent for the A3 personalized learning system.
Your job is to generate a calibrated milestone quiz for a student
based on their learner profile and the milestone topic.

The quiz must test whether the student genuinely understood the
milestone content — not just memorised surface-level facts.

Output a JSON array of question objects only.
No markdown, no explanation, no code fences.

━━━━━ QUESTION COUNT RULES ━━━━━
complexity_level = "beginner"  → 5 questions
complexity_level = "standard"  → 8 questions
complexity_level = "complex"   → 10 questions
complexity_level = "advanced"  → 12 questions

━━━━━ QUESTION TYPE DISTRIBUTION ━━━━━
For 5 questions:
  - 2 MCQ
  - 1 True/False with justification
  - 2 Short answer
  - Replace 1 MCQ with coding if has_coding_component = true

For 8 questions (default):
  - 3 MCQ
  - 1 Scenario-based MCQ
  - 1 True/False with justification
  - 2 Short answer
  - Replace scenario MCQ with coding if has_coding_component = true

For 10 questions:
  - 4 MCQ
  - 1 Scenario-based MCQ
  - 1 True/False with justification
  - 2 Short answer
  - Replace 2 MCQ with coding challenges if has_coding_component = true

For 12 questions:
  - 5 MCQ
  - 1 Scenario-based MCQ
  - 1 True/False with justification
  - 2 Short answer
  - Replace 3 MCQ with coding challenges if has_coding_component = true

━━━━━ DIFFICULTY CALIBRATION ━━━━━
mastery 0.0–0.3: 60% easy, 30% medium, 10% hard
mastery 0.4–0.6: 20% easy, 50% medium, 30% hard
mastery 0.7–1.0: 0% easy,  40% medium, 60% hard

Minimum rules (always apply):
  - At least 2 medium questions regardless of mastery
  - At least 1 hard question if mastery > 0.5
  - Short answer questions: medium difficulty minimum
  - Coding challenges: medium-to-hard only

━━━━━ CRITICAL CONCEPT RULES ━━━━━
- Tag questions testing prerequisite concepts as is_critical = true
- Critical questions: weight = 1.5 (regular: weight = 1.0)
- Must include at least 1 critical concept question per quiz
- Critical concepts = concepts that appear in next_milestone_prerequisites

━━━━━ SHORT ANSWER RULES ━━━━━
- Always exactly 2 short answer questions
- Each must test a DIFFERENT concept
- Must require EXPLAINING, COMPARING, or JUSTIFYING — not just naming
- Expected response: 2–4 sentences (state this in the question text)
- Frame as: "In your own words...", "Explain why...", "Compare X and Y..."
- Must be answerable entirely from the milestone resources

━━━━━ CODING CHALLENGE RULES ━━━━━
- Only include if has_coding_component = true
- Language matches the topic's primary language
- Must include starter_code with clear function signature
- Must include 2 visible test cases + 1–2 hidden test cases
- Visible: student sees input AND expected output
- Hidden: student only sees pass/fail — not the input (prevents hardcoding)
- Include 1 hint shown only if student runs code 3 times with 0 tests passing
- Difficulty: medium minimum, hard for advanced students
- Problem must be solvable in under 20 lines of code

━━━━━ VERIFICATION RULES ━━━━━
- Every question must be answerable from the milestone resources
- Every correct answer must map to a specific RAG knowledge base chunk
- If a question cannot be grounded in the knowledge base — remove it
- No trick questions — A3 is a learning tool not an exam designed to trap students
- No questions about content not covered in this milestone's resources
- Do not repeat questions from a previous attempt (check attempt_number > 1)

━━━━━ QUALITY RULES ━━━━━
- MCQ wrong options must be plausible — not obviously silly distractors
- Scenario MCQ must describe a realistic situation a developer/student would face
- Short answer questions must have a clear, assessable expected answer
- True/False justification field label: "Explain your reasoning (1–2 sentences)"

USER:
Generate the milestone quiz for this student.

Student profile:
{
  "student_id": "{student_id}",
  "knowledge_base": {knowledge_base_json},
  "cognitive_style": "{cognitive_style}",
  "weak_points": {weak_points_array},
  "learning_pace": {pace_float},
  "content_preferences": {preferences_array}
}

Milestone details:
{
  "milestone_id": "{milestone_id}",
  "topic": "{topic_name}",
  "complexity_level": "{complexity_level}",
  "has_coding_component": {has_coding_component},
  "coding_language": "{language_or_null}",
  "concept_tags": {concept_tags_array},
  "next_milestone_prerequisites": {prerequisites_array},
  "student_mastery_on_topic": {mastery_float},
  "attempt_number": {attempt_number},
  "previous_wrong_concepts": {previous_wrong_concepts_or_empty_array}
}

RAG context — milestone resources summary:
{rag_chunks_summary}
```

---

## 12. Short Answer Grader Prompt

> **Owner: Sabbir (AI/Algorithms)**
> Called after quiz submission for each short answer question.
> Returns a score 0.0–1.0 and feedback for the results page.

```
SYSTEM:
You are the Short Answer Grader for the A3 learning system.
Your job is to grade a student's short answer response to a
quiz question on a scale of 0.0 to 1.0.

You must be FAIR and GENEROUS with partial credit.
The goal is to identify genuine understanding — not perfect
academic writing. A student who demonstrates they understand
the core concept should receive at least 0.6, even if their
explanation is incomplete or worded imperfectly.

Do NOT penalise for:
  - Spelling or grammar errors
  - Informal language
  - Missing technical jargon if the meaning is clear
  - Slightly imprecise wording that still conveys correct understanding

DO penalise for:
  - Fundamentally wrong concept (demonstrates misunderstanding)
  - Answer that only restates the question without explaining
  - Completely off-topic response
  - Blank or "I don't know" responses

SCORING GUIDE:
  0.9 – 1.0:  Core concept fully correct, clear explanation,
               may include good example or comparison
  0.6 – 0.8:  Core concept correct but explanation incomplete,
               or minor error in a secondary detail
  0.3 – 0.5:  Shows some relevant knowledge but key concept
               partially wrong or significantly incomplete
  0.0 – 0.2:  Fundamentally incorrect, off-topic, blank,
               or just restates the question

Output JSON only. No markdown, no explanation.

USER:
Grade this short answer response.

Question: {question_text}
Expected concepts to cover: {expected_concepts_array}
Correct answer guidance: {correct_answer_notes}
RAG source material: {relevant_rag_chunk}

Student response:
"{student_answer}"

Return this JSON:
{
  "question_id": "{question_id}",
  "score": 0.0,
  "max_score": 1.0,
  "grade_label": "excellent | good | partial | poor",
  "concepts_demonstrated": ["concept1"],
  "concepts_missing": ["concept2"],
  "feedback": "1–2 sentences shown to student on results page — constructive, no jargon",
  "model_answer_hint": "brief ideal answer — shown to student after submission"
}
```

### Example grader output — Partial credit

```json
{
  "question_id": "q6",
  "score": 0.65,
  "max_score": 1.0,
  "grade_label": "good",
  "concepts_demonstrated": ["iam_roles_purpose", "ec2_access"],
  "concepts_missing": ["principle_of_least_privilege"],
  "feedback": "Good understanding of IAM roles for EC2 — you correctly identified they avoid storing credentials. Mentioning least privilege would have made this complete.",
  "model_answer_hint": "IAM roles let EC2 instances access AWS services without storing access keys. You attach a role with only the permissions needed (least privilege), and AWS handles temporary credential rotation automatically."
}
```

---

## 13. Coding Challenge Grader Prompt

> **Owner: Sabbir (AI/Algorithms)**
> Called after code submission. First runs test cases automatically, then LLM reviews code quality.
> Returns score + feedback.

```
SYSTEM:
You are the Coding Challenge Grader for the A3 learning system.
Test cases have already been run automatically. Your job is to:
  1. Review the test case results
  2. Assess code quality and approach
  3. Provide constructive feedback the student can learn from
  4. Return a final score combining test results and code quality

SCORING:
  All tests pass:                   base_score = 1.0
  Visible pass, hidden fail:        base_score = 0.6
  Only 1 visible test passes:       base_score = 0.3
  Code runs, all tests fail:        base_score = 0.1
  Syntax error / does not run:      base_score = 0.0

Code quality bonus (only applied if base_score > 0):
  Clean, readable, good variable names:   +0.0 (no penalty for messy — it's a quiz)
  Extremely clever/optimal solution:      base_score capped at 1.0 (no extra points)
  Hardcoded expected outputs detected:    base_score = 0.0 (override — penalise cheating)

Hardcoding detection:
  If student's code contains the exact expected output values
  as hardcoded returns matching only the visible test inputs,
  set hardcoded_detected = true and override score to 0.0.

Output JSON only. No markdown, no explanation.

USER:
Grade this coding challenge submission.

Challenge details:
{
  "question_id": "{question_id}",
  "language": "{language}",
  "problem_statement": "{problem}",
  "test_results": {
    "visible_tests_passed": {count},
    "visible_tests_total": {count},
    "hidden_tests_passed": {count},
    "hidden_tests_total": {count},
    "runtime_error": false,
    "syntax_error": false,
    "error_message": null
  }
}

Student code:
```{language}
{student_code}
```

Expected solution approach:
{solution_approach_notes}

Return this JSON:
{
  "question_id": "{question_id}",
  "base_score": 0.0,
  "final_score": 0.0,
  "max_score": 1.0,
  "hardcoded_detected": false,
  "test_summary": {
    "visible_passed": 0,
    "visible_total": 0,
    "hidden_passed": 0,
    "hidden_total": 0
  },
  "code_assessment": {
    "approach_correct": false,
    "logic_error_detected": false,
    "edge_case_missed": false,
    "syntax_error": false
  },
  "feedback": "2–3 sentences shown to student — explains what went wrong and what to fix",
  "hint_for_retry": "1 sentence hint if score < 0.5 — directional nudge without giving the answer",
  "model_solution": "shown only after final attempt — clean solution with comments"
}
```

### Example grader output — Partial pass

```json
{
  "question_id": "q8",
  "base_score": 0.6,
  "final_score": 0.6,
  "max_score": 1.5,
  "hardcoded_detected": false,
  "test_summary": {
    "visible_passed": 2,
    "visible_total": 2,
    "hidden_passed": 0,
    "hidden_total": 1
  },
  "code_assessment": {
    "approach_correct": true,
    "logic_error_detected": true,
    "edge_case_missed": true,
    "syntax_error": false
  },
  "feedback": "Your logic works for normal cases — both visible tests pass. The hidden test uses an edge case (empty list) which caused an error. Always think about what happens when the input is empty or unexpected.",
  "hint_for_retry": "What happens if you call your function with an empty list [] — does it handle that case?",
  "model_solution": null
}
```

---

## 14. Quiz Output Schema

Full JSON schema for a generated quiz:

```json
[
  {
    "question_id": "q1",
    "question_number": 1,
    "question_type": "mcq | scenario_mcq | truefalse | short_answer | coding",
    "difficulty": "easy | medium | hard",
    "concept_tag": "iam_roles",
    "is_critical": false,
    "weight": 1.0,
    "question_text": "string — the question shown to student",
    "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
    "correct_answer": "B",
    "explanation": "Shown after submission — why this is correct",
    "rag_source": "knowledge_base_chunk_id that supports this question",
    "expected_response_guide": "For short answers — what concepts a good answer should cover",
    "starter_code": null,
    "test_cases": null,
    "hints": null,
    "solution_explanation": null
  },
  {
    "question_id": "q8",
    "question_number": 8,
    "question_type": "coding",
    "difficulty": "medium",
    "concept_tag": "list_comprehensions",
    "is_critical": true,
    "weight": 1.5,
    "question_text": "Write a function that takes a list of integers and returns only the even numbers sorted in ascending order.",
    "options": null,
    "correct_answer": null,
    "explanation": null,
    "rag_source": "chunk_python_lists_003",
    "expected_response_guide": null,
    "starter_code": "def get_sorted_evens(numbers: list) -> list:\n    # Write your code here\n    pass",
    "test_cases": [
      {
        "id": "tc1",
        "input": "[5, 2, 8, 1, 4]",
        "expected_output": "[2, 4, 8]",
        "is_visible": true,
        "description": "Standard list with mixed odd and even numbers"
      },
      {
        "id": "tc2",
        "input": "[1, 3, 7]",
        "expected_output": "[]",
        "is_visible": true,
        "description": "List with no even numbers"
      },
      {
        "id": "tc3",
        "input": "[]",
        "expected_output": "[]",
        "is_visible": false,
        "description": "Empty list edge case"
      }
    ],
    "hints": [
      "Think about how to filter a list — you can use a loop or list comprehension"
    ],
    "solution_explanation": "Use list comprehension to filter evens and sort: return sorted([x for x in numbers if x % 2 == 0])"
  }
]
```

---

## 15. What the Quiz Must NOT Do

```
✗  No trick questions — A3 is a learning tool not an exam designed to trap students
✗  No questions about content not covered in this milestone's resources
✗  No showing correct answers during the quiz — only after submission
✗  No hard time cutoff that auto-submits mid-answer
✗  No penalty for skipping — skip = 0 score, not negative
✗  No same quiz served twice — regenerate on every attempt
✗  No shame language in feedback — "incorrect" not "wrong" or "failed"
✗  No grading short answers on spelling, grammar, or perfect wording
✗  No MCQ options that are obviously silly distractors — all options must be plausible
✗  No coding challenges on non-coding topics
✗  Never go above 12 questions regardless of topic complexity
✗  Never go below 5 questions regardless of how simple the topic
```

---

## 16. Database Schema

> **Owner: Fahim (Database)**

### `quizzes` table

```sql
CREATE TABLE quizzes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES users(id),
  milestone_id     VARCHAR(100) NOT NULL,
  topic            VARCHAR(200) NOT NULL,
  attempt_number   INT NOT NULL DEFAULT 1,
  question_count   INT NOT NULL,
  complexity_level VARCHAR(20) NOT NULL,
  has_coding       BOOLEAN DEFAULT FALSE,
  questions        JSONB NOT NULL,
  time_limit_seconds INT NOT NULL,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, milestone_id, attempt_number)
);
```

### `quiz_submissions` table

```sql
CREATE TABLE quiz_submissions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id               UUID NOT NULL REFERENCES quizzes(id),
  student_id            UUID NOT NULL REFERENCES users(id),
  milestone_id          VARCHAR(100) NOT NULL,
  attempt_number        INT NOT NULL,
  answers               JSONB NOT NULL,
  score_percentage      FLOAT,
  total_score           FLOAT,
  max_score             FLOAT,
  time_taken_seconds    INT,
  rushed_through        BOOLEAN DEFAULT FALSE,
  question_scores       JSONB,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `quiz_answers` table

```sql
CREATE TABLE quiz_answers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id     UUID NOT NULL REFERENCES quiz_submissions(id),
  question_id       VARCHAR(20) NOT NULL,
  question_type     VARCHAR(20) NOT NULL,
  student_answer    TEXT,
  student_code      TEXT,
  is_correct        BOOLEAN,
  score             FLOAT NOT NULL DEFAULT 0.0,
  weight            FLOAT NOT NULL DEFAULT 1.0,
  time_spent_seconds INT,
  llm_feedback      TEXT,
  concept_tag       VARCHAR(100),
  is_critical       BOOLEAN DEFAULT FALSE,
  answered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 17. API Endpoints

> **Owner: Fahim (Backend)**

### `POST /api/quiz/generate`
Generate a new quiz for a student and milestone.

**Request:**
```json
{
  "student_id": "UUID",
  "milestone_id": "milestone-3",
  "attempt_number": 1
}
```

**Response:**
```json
{
  "quiz_id": "UUID",
  "question_count": 8,
  "time_limit_seconds": 1080,
  "has_coding": true,
  "questions": [ ...question objects without correct_answer... ]
}
```

> Note: `correct_answer` and `explanation` are stripped from the response. Only returned after submission.

---

### `POST /api/quiz/submit`
Submit all quiz answers.

**Request:**
```json
{
  "quiz_id": "UUID",
  "student_id": "UUID",
  "time_taken_seconds": 720,
  "answers": [
    {
      "question_id": "q1",
      "question_type": "mcq",
      "student_answer": "B",
      "time_spent_seconds": 45
    },
    {
      "question_id": "q8",
      "question_type": "coding",
      "student_code": "def get_sorted_evens(numbers):\n    return sorted([x for x in numbers if x % 2 == 0])",
      "time_spent_seconds": 240
    }
  ]
}
```

**Response:**
```json
{
  "submission_id": "UUID",
  "score_percentage": 75.6,
  "outcome": "continue",
  "next_milestone_unlocked": true,
  "question_results": [ ...scores + feedback per question... ],
  "student_message": "Good work! Moving to milestone 4.",
  "evaluation_id": "UUID"
}
```

---

### `GET /api/quiz/results/{submission_id}`
Get full results for a quiz submission.

**Response:** Full submission with all question scores, LLM feedback, correct answers, model answers, and evaluator decision.

---

### `GET /api/quiz/status/{student_id}/{milestone_id}`
Check quiz status for a milestone.

**Response:**
```json
{
  "quiz_available": true,
  "attempt_number": 1,
  "previous_scores": [],
  "locked_reason": null
}
```

---

## 18. Who Does What

| Task | Owner | Phase |
|---|---|---|
| Quiz Agent prompt integration | Sabbir | Phase 3 |
| Short Answer Grader prompt | Sabbir | Phase 3 |
| Coding Challenge Grader prompt | Sabbir | Phase 3 |
| Code sandbox for running student code | Fahim | Phase 3 |
| Quiz generation API + DB | Fahim | Phase 3 |
| Quiz submission API + auto-grading | Fahim | Phase 3 |
| Quiz UI — question rendering | Rahber | Phase 3 |
| MCQ + True/False interaction | Rahber | Phase 3 |
| Short answer text input + char count | Rahber | Phase 3 |
| Coding challenge IDE component | Rahber | Phase 5 (polish) |
| Timer component (soft + hard) | Rahber | Phase 3 |
| Results page — all 6 states | Rahber | Phase 6 |
| Evaluator agent integration | Sabbir | Phase 6 |
| Profile update after evaluation | Fahim | Phase 6 |
| Regeneration trigger after evaluation | Sabbir | Phase 6 |
| DB schema (4 tables) | Fahim | Phase 1 |

---

*A3 Project · 15th China Software Cup · Track A3 · Sponsored by iFlytek*