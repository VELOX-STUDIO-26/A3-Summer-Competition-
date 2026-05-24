# A3 Project — Completion Status Report

**Generated:** 2026-05-07  
**Last Updated:** 2026-05-22
**Against:** `project-prd.md` (PRD) + `PROJECT_PLAN.md` (10-week implementation plan)
**Repo:** `https://github.com/VELOX-STUDIO-26/A3-Summer-Competition-.git`

---

## Executive Summary

| Metric | Status |
|---|---|
| **Overall completion** | **~75–80%** of required functionality |
| **Phase 1 (Foundation)** | ✅ Complete |
| **Phase 2 (Profiling)** | ✅ Complete |
| **Phase 3 (Agents)** | ✅ Complete (all 5 agents, +2 graders) |
| **Phase 4 (Path)** | ✅ Complete — DynamicAdaptationEngine + Recommender shipped |
| **Phase 5 (Tutor)** | 🟡 Mostly complete — **ASR fixed & working** (IAT endpoint); image input + diagram output + summarization remain |
| **Phase 6 (Analytics)** | ✅ LLM analytics engine + dashboard complete, teacher dashboard missing |
| **Phase 7 (Polish)** | 🟡 Performance decent, hallucination filter wired, no load test |
| **Phase 8 (Submission)** | ❌ Demo video, submission package not started |
| **Testing** | ✅ 295 backend unit tests across 23 files (path planner, agents, orchestrator + streaming, graders, evaluator, gap detector, content moderator, faithfulness, TTS cache, LLM rotation, adaptation engine, recommender, **iFlytek ASR client + router**, etc.) |
| **Docs** | 🟡 PRD + plan exist; no API docs, status reports, or ADRs |

**Headline take:** the *system itself works end-to-end*. The five PRD features are all reachable in the running app. What's missing is mostly the **competition-submission surface** — teacher dashboard, analytics UI, demo video, and packaging — plus a handful of nice-to-have pieces of tutor multimodality (voice-in, image-in).

---

## 1. PRD Feature-by-Feature Assessment

### ✅ Feature 1 — Conversational Learner Profiling
**Required:** 6-dimension model extracted from chat, weighted moving-average updates, confidence scoring, JSON profile store, versioned history.

**Built:**
- `@d:\Main project\A3 Summer Project\a3-system\backend\nlp\profile_extractor.py` — intent extraction from Spark/OpenRouter LLM with JSON schema + confidence
- `@d:\Main project\A3 Summer Project\a3-system\backend\nlp\session_manager.py` — multi-turn profiling session state
- `@d:\Main project\A3 Summer Project\a3-system\backend\api\routers\chat.py` — `/api/chat/start`, `/message`, `/{id}/status`, `/{id}/complete`, `/stats`, `/simple`, `/simple/stream`
- `@d:\Main project\A3 Summer Project\a3-system\backend\api\routers\profile.py` — profile CRUD
- `StudentProfile` model with `knowledge_base`, `cognitive_style`, `weak_points`, `goals`, `learning_pace`, `content_preferences`, `version`
- Frontend: `@d:\Main project\A3 Summer Project\a3-system\frontend\web\src\app\(onboarding)\profile-chat\page.tsx` + `profile-summary`

**Gaps:** None.

Embedding-based gap detection against an expert-answer corpus is now implemented — see `@d:\Main project\A3 Summer Project\a3-system\backend\nlp\gap_detector.py` and `@d:\Main project\A3 Summer Project\a3-system\data\expert_corpus.json`. The detector embeds curated expert reference text per knowledge node once, then for each incoming chat message embeds the student's utterance and computes cosine similarity against every node. Topics scoring below the configurable threshold (default 0.5) are appended as `weak_points` extractions in `session_manager.process_message`, so they flow into the same `ProfileBuilder` merge path as LLM-extracted dimensions. Failures degrade silently — embeddings unavailable → empty list → chat reply unaffected. Covered by 18 unit tests in `@d:\Main project\A3 Summer Project\a3-system\backend\tests\test_gap_detector.py`.

**Completion: 100%**

---

### ✅ Feature 2 — Multi-Agent Resource Generation
**Required:** Orchestrator + 5 specialized agents (Content, Mind Map, Quiz, Media, Code), async parallel dispatch, hallucination filter, RAG grounding.

**Built:**
- `@d:\Main project\A3 Summer Project\a3-system\backend\agents\orchestrator.py` — async gather with semaphore, profile-driven agent selection
- All 5 agents present:
  - `content_agent.py`, `quiz_agent.py`, `mindmap_agent.py`, `media_agent.py`, `code_agent.py`
- Bonus agents beyond spec: `gate_agent.py`, `evaluator_agent.py`, `coding_grader.py`, `short_answer_grader.py`, `path_planner.py`
- `@d:\Main project\A3 Summer Project\a3-system\backend\core\faithfulness_checker.py` — **wired into all 5 agents + grader** (every output gets `faithfulness.score`, `verified`, claim counts, citations)
- RAG: `@d:\Main project\A3 Summer Project\a3-system\backend\rag\indexer.py`, `vector_store.py`
- `@d:\Main project\A3 Summer Project\a3-system\backend\api\routers\resources.py` — batched generation + remedial retrieval
- Media agent produces lecture slides with **pre-generated Edge-TTS audio cache** (content-addressable)
- Code agent integrates with Judge0 for sandbox execution (`core/judge0_client.py`)

**Gaps:**
- True video generation (Stable Video / Wan2.1) not used — falls back to slides + TTS, which PRD/plan explicitly allows. *(Intentionally out of scope — Wan2.1-specific.)*

**Harmful-content moderation is now implemented** as a provider-agnostic, pattern-based filter (not tied to iFlytek). See `@d:\Main project\A3 Summer Project\a3-system\backend\core\content_moderator.py` and the tunable rule-set at `@d:\Main project\A3 Summer Project\a3-system\data\moderation_rules.json`. The moderator evaluates text against seven phrase-oriented categories (self-harm, violence threats, weapons instructions, sexual-minors, hate speech, illegal-drug synthesis, harassment) with per-category severity levels. High-severity matches always block; medium and low warn in balanced mode and block in strict mode. Rules are compiled regexes loaded from JSON so operators can tune them without redeploying. A self-harm match returns a supportive helpline-pointing refusal; other blocks return a neutral educational refusal. Wired into every user-facing input path: `@d:\Main project\A3 Summer Project\a3-system\backend\nlp\session_manager.py:283-300` (profiling chat), `@d:\Main project\A3 Summer Project\a3-system\backend\api\routers\chat.py` (`/simple` and `/simple/stream`), and `@d:\Main project\A3 Summer Project\a3-system\backend\api\routers\tutor.py` (`/ask` and `/ask/stream`). Blocked requests short-circuit before any LLM call is made, so nothing harmful ever reaches the model. Covered by 19 unit tests in `@d:\Main project\A3 Summer Project\a3-system\backend\tests\test_content_moderator.py` (rule loading robustness, severity handling, multi-category, redaction, disabled mode, production singleton sanity check).

**Streaming resource generation is now implemented.** `@d:\Main project\A3 Summer Project\a3-system\backend\api\routers\resources.py:92-134` exposes `POST /api/resources/generate/stream`, which wraps `Orchestrator.generate_resources_stream` (`@d:\Main project\A3 Summer Project\a3-system\backend\agents\orchestrator.py:178-288`). Agents still run concurrently under the same semaphore, but a per-agent `asyncio.Queue` drains progress events as each one starts and finishes. The SSE event types are `plan` → multiple `agent_started` / `agent_complete` / `agent_failed` (emitted in real completion order, not submission order) → final `complete` with the aggregated bundle. Failures in one agent never block siblings and still surface in the final bundle with `{"error": ..., "agent": ...}`. While adding this, a latent bug in the non-streaming path was fixed: `node_id` is now popped from `agent_kwargs` before being spread so callers can safely pass it either positionally or via the kwargs dict. Covered by 10 unit tests in `@d:\Main project\A3 Summer Project\a3-system\backend\tests\test_orchestrator_stream.py` (event ordering, concurrency, failure isolation, empty selection, kwargs propagation).

**Completion: ~98%** (only Wan2.1 video generation remains, explicitly out of scope)

---

### ✅ Feature 3 — Adaptive Learning Path Planning
**Required:** A* over knowledge graph, milestone splitting, dynamic adaptation (remediation / acceleration / tutor triggers / replans).

**Built:**
- `@d:\Main project\A3 Summer Project\a3-system\backend\agents\path_planner.py` — A* path planner
- `@d:\Main project\A3 Summer Project\a3-system\data\knowledge_graph.json` (+ `_en.json`) — bilingual graph derived from the reference "多源异构资源" pipeline
- `@d:\Main project\A3 Summer Project\a3-system\backend\api\routers\path.py` + `milestone.py`
- `MilestoneProgress`, `GateCalculation` DB models
- Gate agent (quiz-unlock scoring) and milestone UI (`components/milestone/GateStatus.tsx`, `QuizResults.tsx`)

**Gaps:** *(closed)*
- ~~**`DynamicAdaptationEngine`** missing as a unified engine.~~ ✅ Implemented in `@d:\Main project\A3 Summer Project\a3-system\backend\adaptation\engine.py` — event-driven dispatcher (`QuizCompletedEvent`, `GateCalculatedEvent`, `GoalChangedEvent`, `MilestoneStuckEvent`), per-(student, strategy) cooldowns, pluggable executors, automatic replan on 3+ consecutive low scores or goal change. Endpoints at `/api/adapt/events/*`.
- ~~**Recommendation engine** missing.~~ ✅ Implemented hybrid (content-based + collaborative) recommender in `@d:\Main project\A3 Summer Project\a3-system\backend\adaptation\recommender.py` with min-max fusion, configurable alpha, weak-point boost, Jaccard collaborative filtering, exclude-already-mastered, and explainability. Endpoint at `/api/adapt/recommend`.
- ~~Path replan on goal change / consecutive failures is **manual**.~~ ✅ Now automatic via `DynamicAdaptationEngine`.

**Coverage:** 35 new tests in `tests/test_adaptation_engine.py` + `tests/test_recommender.py` (strategy routing, cooldown semantics, executor isolation, content / collab / hybrid scoring, normalisation edge cases).

**Completion: 100%** (for Cloud Computing)

**Enhancement: Dynamic Knowledge Graph Generation (v2.0)** ✅ **IMPLEMENTED**
- **Problem:** Currently only supports Cloud Computing with pre-built knowledge graph
- **Solution:** LLM-generated knowledge graphs with user validation
- **Key Features:**
  - Search existing verified graphs before generating new
  - LLM generates graph → Validator agent checks → User approves/edits
  - 3 free generations per subject (monetization for more)
  - User can manually edit path (skip, add, remove, reorder nodes)
  - Social proof display (verified by X learners, Y% completion rate)
  - Verified graphs stored and reused for future students
- **Status:** ✅ Fully implemented (May 22, 2026)
- **Components:**
  - Backend: 4 DB models, generator agent, validator agent, graph service, 10 API endpoints
  - Frontend: PathPreview, SubjectInput components, API functions
  - Tests: 84 unit tests passing
- **Documentation:** See "Dynamic Knowledge Graph Generation (v2.0)" section in `FEATURE_03_PATH_PLANNING.md`

**Enhancement: Hierarchical Knowledge Graph (v2.1)** 🟡 **IN PROGRESS**
- **Problem:** Flat nodes are unrealistic (e.g., "Python" can't be learned in 60 minutes)
- **Solution:** Two-level hierarchy: Main Topics (5-12) → Subtopics (2-10 each)
- **Key Features:**
  - Main Topics = Milestones, Subtopics = Learnable Units
  - Resources generated per subtopic (not per main topic)
  - Background pre-fetch: Generate next subtopic resources while learning current
  - Adaptive difficulty: Adjust based on previous quiz scores
  - Skip option: Mini-quiz to bypass known subtopics (80%+ required)
  - Resource caching: Reuse for similar student profiles
- **Status:** 🟡 Backend complete, frontend flow complete, **blocked on API keys**
- **Components:**
  - Backend: 6 DB models, hierarchical generator, service layer, 11 API endpoints
  - Frontend: 12 API functions, profile-summary → new-path → notebook flow
  - Tests: 43 unit tests passing
- **Recent Updates (May 22, 2026):**
  - Fixed missing DB columns (`avg_rating`, `verified_by_count`, etc.)
  - Relaxed subtopic validation (2-10 instead of 3-8)
  - Simplified new-path UI with phase badges instead of step indicators
  - Added glassmorphism to profile-summary page
  - Fixed routing: profile-summary → new-path → notebook
- **Current Blocker:** OpenRouter API keys exhausted/invalid - need new keys
- **Documentation:** See "Hierarchical Knowledge Graph Structure (v2.1)" section in `FEATURE_03_PATH_PLANNING.md`
- **Session Notes:** See `SESSION_NOTES_2026-05-22.md` for detailed changes

---

### 🟡 Feature 4 — Real-Time AI Tutoring
**Required:** Multimodal Q&A (text in/out, voice in/out, image in, diagram out, video out), streaming, rolling 8k-token context with summarization, RAG grounding.

**Built:**
- `@d:\Main project\A3 Summer Project\a3-system\backend\core\tutor_engine.py` + `@d:\Main project\A3 Summer Project\a3-system\backend\api\routers\tutor.py` — `/ask` (blocking) + `/ask/stream` (SSE) + `/speak` (TTS)
- `@d:\Main project\A3 Summer Project\a3-system\backend\core\tts_client.py` — Edge-TTS free voices + iFlytek fallback, content-addressable cache (`/api/tts/cached/{key}`)
- Simple conversation-history buffer (`_conversation_history` dict, last N turns)
- Faithfulness grounding + RAG retrieval in tutor prompts

**Gaps:**
- ~~**Voice input (ASR)** — not wired.~~ ✅ **Fixed** — Switched from IST to IAT endpoint. iFlytek **IAT** WebSocket now working at `/api/asr/*`. The IST endpoint was rejecting our JSON format; IAT uses the same `common`/`business`/`data` structure we already had. Endpoints: `GET /api/asr/status`, `POST /api/asr/transcribe`, `WS /api/asr/stream`. Frontend `useVoiceRecorder.ts` uses AudioWorklet API for 16kHz/16-bit PCM capture.
- **Image input** (equation/diagram upload) — not implemented.
- **Diagram OUTPUT** (auto-generated SVG from Mermaid/Graphviz) — code path absent from tutor, though mindmap agent does produce graph JSON separately.
- **Short explainer video OUTPUT** per question — falls back to slides (acceptable).
- **Rolling context window with background LLM summarization** — we currently *truncate* old turns instead of summarizing them. Works for short sessions, but fails the plan's spec.

**Coverage:** 33 new tests in `tests/test_asr_client.py` + `tests/test_asr_router.py` (auth signing, frame builders, partial/final segment merging, WAV header stripping, MIME-encoding detection, status / 503 / 400 / 502 paths, end-to-end transcription with a mocked iFlytek WebSocket).

**Completion: ~75%**

---

### ✅ Feature 5 — Learning Assessment & Analytics
**Required:** 4 behavioral signal streams → LLM analytics engine → JSON insight report → automatic adaptations + teacher dashboard alerts.

**Built:**
- **Signal collection** fully wired:
  - Quiz performance → `QuizAttempt`, `QuizEvaluation`
  - Resource engagement → `@d:\Main project\A3 Summer Project\a3-system\backend\api\routers\tracking.py` + `ResourceEvent`
  - Tutor interactions → chat history
  - Path completion → `MilestoneProgress`, `LearningEvent`
- `@d:\Main project\A3 Summer Project\a3-system\backend\api\routers\analytics.py` — `/api/analytics/{id}`, `/progress`, `/activity`, `/dashboard`
- Gate scoring drives remedial content generation (closes part of the feedback loop)
- ✅ **LLM Analytics Engine**: `@d:\Main project\A3 Summer Project\a3-system\backend\analytics\analytics_engine.py` (32KB) — Full LLM-powered insights with 24-hour caching
- ✅ **Comparative Analytics**: `@d:\Main project\A3 Summer Project\a3-system\backend\analytics\comparative_analytics.py` — Peer comparison, cohort percentiles, leaderboards
- ✅ **Cohort Management**: `@d:\Main project\A3 Summer Project\a3-system\backend\api\routers\cohorts.py` — Auto-enrollment, cohort CRUD
- ✅ **Student Analytics Dashboard**: `@d:\Main project\A3 Summer Project\a3-system\frontend\web\src\app\(dashboard)\analytics\page.tsx` (36KB) — Recharts visualizations, radar charts, AI insights panel

**Gaps:**
- **Teacher dashboard** entirely absent (class-level views, at-risk flags)
- **Automatic adaptation triggers** partially implemented via DynamicAdaptationEngine

**Completion: ~85%**

---

## 2. Infrastructure & Cross-Cutting

| Item | Status | Notes |
|---|---|---|
| FastAPI app with all routers | ✅ | `main.py`: 11 routers registered |
| PostgreSQL + SQLAlchemy + Alembic | ✅ | 16 tables; migrations run at startup |
| Redis | 🟡 | Docker-compose has it; session cache used selectively |
| Weaviate / Chroma | ✅ | `rag/vector_store.py` abstraction |
| OpenRouter LLM with **fallback key rotation** | ✅ | Just added: 401/403/persistent-429 rotates to secondary key |
| iFlytek Spark (competition primary) | 🟡 | `SPARK_*` config fields exist; not actively used, OpenRouter is driving |
| Edge-TTS + iFlytek TTS | ✅ | Edge free tier working; cached responses |
| Judge0 code sandbox | ✅ | `core/judge0_client.py` |
| Docker Compose | ✅ | Postgres + Redis + Weaviate + app |
| k8s / production deploy | ❌ | Not started |
| Monitoring (Prometheus/Grafana) | ❌ | Not started |
| Auth | ✅ | `api/routers/auth.py` + `UserAccount` |
| Git + GitHub remote | ✅ | Initialized 2026-05-05, remote set |

---

## 3. Frontend Surface

| Screen | Status | File |
|---|---|---|
| Landing page | ✅ | `app/page.tsx` |
| Login / Register | ✅ | `app/(auth)/login`, `register` |
| Profile chat onboarding | ✅ | `app/(onboarding)/profile-chat` |
| Profile summary | ✅ | `app/(onboarding)/profile-summary` |
| Notebook (main learning view) | ✅ | `app/(dashboard)/notebook/page.tsx` (2000+ lines) |
| Quiz taking | ✅ | `app/(dashboard)/quiz/[quizId]/page.tsx` |
| Quiz results | ✅ | `app/(dashboard)/quiz/[quizId]/results/page.tsx` |
| Lecture player (video slides + TTS) | ✅ | `components/video/LecturePlayer.tsx` |
| Code exercise runner | ✅ | `components/code/CodeExercise.tsx` |
| Interactive mind map | ✅ | `components/mindmap/InteractiveMindMap.tsx` |
| Gate status / quiz-unlock UI | ✅ | `components/milestone/GateStatus.tsx` |
| Faithfulness badge | ✅ | `components/FaithfulnessBadge.tsx` |
| **Student analytics dashboard** | ❌ | **Not built** |
| **Teacher dashboard** | ❌ | **Not built** |
| Tutor slide-out panel (Feature 4) | 🟡 | Tutor engine backed by chat; no dedicated multimodal panel component |
| Mobile (Uni-app) | ❌ | Optional per plan; skipped |

---

## 4. Testing & Quality

| Type | Target (plan) | Actual |
|---|---|---|
| Backend unit tests (pytest) | ≥80% coverage | **~0%** — `backend/tests/` contains only `__init__.py` |
| Frontend unit tests (Jest) | ≥70% | **0%** — no jest config seen |
| Critical-path (A*, profile extractor) | 100% | 0% |
| Integration tests | Required | Only ad-hoc scripts (`test_generate_quiz.py`, `create_test_student.py`) |
| E2E (Playwright) | 1 full flow | 0 |
| Load test (k6 @ 50 users) | Required | 0 |
| Hallucination test suite (50 Qs, <2% error) | Required | 0 (faithfulness checker runs, but no regression corpus) |

**This is the single biggest gap if the goal is competition-grade.**

---

## 5. Documentation

| Artefact | Status |
|---|---|
| Project PRD | ✅ `project-prd.md` |
| 10-week plan | ✅ `PROJECT_PLAN.md` |
| A* algorithm spec | ✅ `A-algorithm.md` |
| Resource tracking spec | ✅ `tracking-resource-completion-guideline.md` |
| Final quiz guideline | ✅ `final-quize-guideling.md` |
| Backend README | ✅ `a3-system/backend/README.md` |
| Bugs & errors log | ✅ `a3-system/BUGS_AND_ERRORS.md` |
| **API reference** (OpenAPI export / per-endpoint docs) | ❌ |
| **Weekly status reports** (`docs/status/YYYY-MM-DD.md`) | 🟡 Only 2 exist (`2026-04-26`, `2026-04-30`) |
| **ADR / decision log** | ❌ |
| Architecture diagrams (rendered) | 🟡 `diagrams/` folder is empty |
| Deployment guide | ❌ |
| Demo video | ❌ |
| Submission package | ❌ |

---

## 6. What's Done Most Recently (this session, 2026-05-05)

1. **Fixed tracking 500s** — race-induced duplicate `MilestoneProgress` rows → `.limit(1).first()` + retry-on-insert-race.
2. **Added OpenRouter fallback key rotation** — auto-rotates on 401/403 or persistent 429.
3. **Fixed TTS audio fallback** — `canplay` instead of `canplaythrough`, 20 s timeout, immutable cache headers.
4. **Gated `getRemedialResources` behind quiz-attempted flag** — stops new students hitting `/api/resources/remedial` on every topic switch.
5. **Fixed media agent single-slide bug** — bumped `max_tokens` 3500 → 8000 + added `_parse_slides_json` salvage parser that survives truncated LLM output.
6. **Initialized GitHub repo** — pushed to `VELOX-STUDIO-26/A3-Summer-Competition-`.

---

## 7. Prioritized Remaining Work

Ordered by impact on competition scoring (PRD §11: Innovation 35% / Functionality 45% / Docs 10% / Demo 10%).

### P0 — Blocking submission quality
1. **Student analytics dashboard page** — radar chart over the 6 mastery dimensions, progress trend, weak-spot list, completion forecast. Connects Feature 5 to user-visible value.
2. **LLM analytics engine** (`backend/analytics/analytics_engine.py`) — aggregates behavioral events, calls LLM with the plan's analysis prompt, returns mastery + anomaly + forecast JSON. Powers the dashboard above.
3. ~~**Unified `DynamicAdaptationEngine`**~~ ✅ Done — event-driven dispatcher with cooldowns + automatic replan; see `backend/adaptation/`.
4. **Demo video script + recording** — 7 min: onboarding → resources → path → tutor → quiz → adaptation → analytics. Without this, the submission is incomplete.
5. **Submission packaging** — clean README, reproducible `docker-compose up`, `.env.template` accuracy check, version tag.

### P1 — Strong differentiators
6. **Teacher dashboard** (even minimal) — class roster, at-risk flags. Plan calls it "optional but scoring-positive".
7. **Rolling context window with LLM summarization** in tutor — current truncation fails the "no overflow" claim.
8. **Hallucination regression corpus** (50+ Q&A pairs) with pass-rate target <2%. Numeric evidence for the Innovation score.
9. **SSE streaming for `/api/resources/generate`** — per-agent progress events. UX win + already-built primitives.
10. ~~**Recommendation engine**~~ ✅ Done — hybrid CB+CF recommender at `/api/adapt/recommend`.

### P2 — Nice to have
11. ~~**Voice input (ASR)**~~ ✅ **Done** — iFlytek IAT WebSocket wired at `/api/asr/*`. Fixed endpoint mismatch (IST → IAT).
12. **Image input for tutor** — vision-capable model route for equation/diagram questions.
13. **Auto-generated SVG diagrams** in tutor answers (Mermaid → SVG).
14. **Pytest suite** reaching the plan's coverage targets. One well-written suite for `path_planner` + `profile_extractor` + `faithfulness_checker` would cover ≥60% of the critical-path logic.
15. **Playwright E2E** for the one canonical flow (register → onboarding → notebook → quiz).
16. **k6 load test** at 50 concurrent users to validate PRD §10.1 numbers.
17. **OpenAPI export** → `docs/api.md` + Postman collection.
18. **ADR log** for major decisions (free-tier LLM choice, slides-vs-video, faithfulness threshold, etc.).

### P3 — Deferred / optional
- Mobile Uni-app front-end (plan marks as optional).
- Kubernetes deployment manifests (local Docker is sufficient for demo).
- Prometheus/Grafana monitoring.
- Dark mode, offline Service Worker caching.

---

## 8. Suggested Two-Week Finishing Sprint

**Week 1 — Close analytics + adaptation loop**
- Day 1–2: Scaffold `backend/analytics/{event_logger,analytics_engine,adaptation_triggers}.py`. Move scattered logic in.
- Day 3–4: Build `app/(dashboard)/analytics/page.tsx` with Recharts (radar, line, bar). Wire to `/api/analytics/*`.
- Day 5: ~~Implement `DynamicAdaptationEngine` with cooldowns and event dispatcher.~~ ✅ Shipped.
- Day 6: Build minimal teacher dashboard (class list + at-risk column).
- Day 7: Write hallucination regression corpus (50 Qs across the 5 agents); plumb as a pytest run.

**Week 2 — Submission readiness**
- Day 1–2: Pytest suite for critical paths (`path_planner`, `profile_extractor`, `faithfulness_checker`, `_parse_slides_json`). Aim for 60%+ on those three modules.
- Day 3: Playwright E2E for `register → onboarding → notebook → quiz → results`.
- Day 4: Record demo video (draft pass).
- Day 5: OpenAPI export + README polish + deployment guide.
- Day 6: Re-record demo with voiceover + captions.
- Day 7: Tag `v1.0.0`, create submission archive, final smoke test.

---

## 9. Bottom Line

The codebase is **substantially further along than a typical mid-plan checkpoint**: all five PRD features exist as running code and all five agents produce real output with faithfulness verification. The gaps are concentrated in **Feature 5's user-facing surface** (analytics dashboard + LLM insights engine), **test coverage** (effectively zero), and **submission deliverables** (demo video, docs polish, packaging). Two focused weeks should close the competition-readiness gap.
