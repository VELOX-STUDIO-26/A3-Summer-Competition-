# Changelog

All meaningful changes are recorded here per the project rules.

Format:
```
## [Date] - Short Title
### Changes Made
### Reason
### Files
### Impact / Testing
```

---

## 2026-06-18 - Stream quiz generation for faster perceived response

### Changes Made
- Added `run_stream()` async generator to `QuizAgent` — streams questions as they're parsed from LLM output
- Added SSE endpoint `POST /api/quiz/generate/stream` — yields each question incrementally, then saves to DB
- Added `generateQuizStream()` frontend function (async generator consuming SSE)
- Updated `GateStatus.tsx` to use streaming: shows "Generating 1/5...", "2/5..." progress as each question arrives
- Faithfulness check was already skipping when no RAG chunks (no change needed)

### Reason
- Quiz generation takes ~30-50s with Kimi k2.6. User saw a spinner with no progress.
- With streaming, first question feedback arrives in ~10-14s (3-4x faster perceived response).
- Questions appear one-by-one giving continuous visual progress.

### Benchmark Results
| Metric | Before | After |
|--------|--------|-------|
| First feedback | ~48s | ~10-14s |
| Total time | ~48s | ~55-72s (same LLM time, overhead is streaming parse) |
| User perception | Blocked 48s | Progress from 10s onward |

### Files
- `a3-system/backend/agents/quiz_agent.py` (new `run_stream` + `_extract_questions_from_buffer`)
- `a3-system/backend/api/routers/quiz.py` (new `/generate/stream` SSE endpoint)
- `a3-system/frontend/web/src/lib/api.ts` (new `generateQuizStream` + `QuizStreamEvent` type)
- `a3-system/frontend/web/src/components/milestone/GateStatus.tsx` (streaming consumer + progress UI)

### Impact / Testing
- Non-breaking: original `/generate` endpoint unchanged
- Frontend falls back gracefully if streaming fails
- Test via: start a quiz from the notebook milestone gate → see progress indicator

---

## 2026-06-18 - Optimize learning path generation: streaming + parallel boost

### Changes Made
- Increased subtopic generation parallelism from 3 to 5 concurrent LLM calls
- Added SSE streaming endpoint `POST /api/hierarchical/generate/stream`
- Frontend now uses streaming: milestones appear in ~60s, subtopics fill in one-by-one as they complete in background
- Added `generateHierarchicalGraphStream()` async generator to frontend API lib
- Updated `new-path/page.tsx` to consume the SSE stream and progressively render subtopics

### Reason
- Full generation took ~3 minutes (blocking). Users waited with no feedback.
- Now users see their learning path milestones after Pass 1 (~36-60s), and subtopics stream in progressively.

### Files
- `a3-system/backend/services/hierarchical_graph_service.py` (semaphore 3→5, new `generate_graph_stream` method)
- `a3-system/backend/api/routers/hierarchical_graphs.py` (new `/generate/stream` endpoint)
- `a3-system/frontend/web/src/lib/api.ts` (new `GraphStreamEvent`, `generateHierarchicalGraphStream`)
- `a3-system/frontend/web/src/app/(dashboard)/new-path/page.tsx` (stream consumption)

### Impact / Testing
- Perceived generation time: **~3 min → ~60s** (milestones appear)
- Total generation time reduced ~20-30% from higher parallelism
- Backward compatible: original `/generate` endpoint still works unchanged
- Frontend build passes with 0 TypeScript errors

---

## 2026-06-18 - Fix build/deploy bugs (Docker, Netlify, imports)

### Changes Made
- Added `requirements.txt` to `a3-system/backend/` directory (was only at parent level)
- Fixed root `netlify.toml`: commented out placeholder API redirect (`your-backend-url.com`) and removed broken SPA fallback (`/* -> /index.html`)
- Removed shadowed `JSONResponse` import in `backend/main.py` (was imported from both `fastapi.responses` and `starlette.responses`)
- Removed deprecated `version: '3.8'` key from `docker-compose.yml`

### Reason
- **Docker build failure**: The backend `Dockerfile` uses `COPY requirements.txt .` but the build context is `./backend/`. The file only existed at `a3-system/requirements.txt` (parent), causing Docker build to fail.
- **Netlify deploy failure**: Active redirect to `https://your-backend-url.com/api/:splat` would send all API calls to a non-existent host. The `/* -> /index.html` SPA fallback conflicts with Next.js routing (SSR, dynamic routes, API routes) and the `@netlify/plugin-nextjs` which handles routing automatically.
- **Import shadowing**: The starlette import on line 124 overrode the fastapi import on line 15, causing namespace pollution.
- **Docker Compose warning**: The `version` key is obsolete in Compose V2+ and produces deprecation warnings.

### Files
- `a3-system/backend/requirements.txt` (new — copy of parent-level file)
- `netlify.toml` (root)
- `a3-system/backend/main.py`
- `a3-system/docker-compose.yml`

### Impact / Testing
- Backend Docker image now builds successfully
- Netlify deployments won't break Next.js routing
- `python3 -c "import ast; ast.parse(open('main.py').read())"` passes
- `docker compose config` no longer warns about deprecated version field

---

## 2026-06-18 - Remove invalid hardcoded Kimi API fallback

### Changes Made
- `core/llm_client.py` and `core/vision_llm_client.py` no longer fall back to a
  hardcoded `sk-xJuTUc3...` API key. They now read `KIMI_API_KEY` from the
  environment and default to an empty string.
- `LLMClient` already falls back to mock mode when the key is missing, so a
  missing env var now yields demo responses instead of hanging on 401 retries.

### Reason
- The hardcoded key was invalid and caused 401 Unauthorized responses from the
  Moonshot endpoint. Because the client retried on auth failures, requests hung
  for minutes and surfaced in the frontend as 300s Axios timeouts.
- The `.env` file contains a valid key (`sk-DCQN6Jf...`) that was being ignored
  whenever the backend failed to load it.

### Files
- `a3-system/backend/core/llm_client.py`
- `a3-system/backend/core/vision_llm_client.py`

### Impact / Testing
- Backend `py_compile` passes.
- With the valid env key loaded, `/api/hierarchical/generate` returns milestones
  in ~50s instead of timing out.
- Missing-key behavior now falls back to mock mode (demo responses) instead of
  long 401 retries.

---

## 2026-06-18 - Frontend two-pass UI for learning path generation

### Changes Made
- `GeneratingState` now displays real milestone-generation progress instead of
  a fake 60-second timer. It receives the live milestone count and expected
  total from the graph response and shows "Generating milestone N of M...".
- `PathPreview` now lazily loads subtopics on-demand when a user expands a
  milestone with no subtopics. It uses `ensureSubtopicsForTopic(graphId,
  nodeId, studentId)`, caches the result in component state, shows a loading
  spinner, and displays a retry button on error.
- Graph view in `PathPreview` now reflects cached subtopics after a milestone
  is expanded in list view.
- `LearningPathGraph` detail panel now shows a graceful loading state when a
  selected milestone has empty subtopics.
- Updated call sites in `NewPathPage` to pass `studentId` to `PathPreview` and
  to feed live milestone counts to `GeneratingState`.

### Reason
The backend already supported two-pass generation, but the frontend still used
a fake progress bar and a 2-minute time estimate. This change exposes the fast
milestone generation to users and lets them expand milestones to load lessons
lazily, matching the existing notebook behavior.

### Files
- `a3-system/frontend/web/src/app/(dashboard)/new-path/page.tsx`
- `a3-system/frontend/web/src/app/components/LearningPathGraph.tsx`

### Impact / Testing
- TypeScript `tsc --noEmit` passes with no errors.
- Manual verification needed: create a new path, confirm milestone progress
  appears, expand a milestone in list view, confirm subtopics load on demand,
  and confirm graph view handles empty subtopics gracefully.

---

## 2026-06-18 - Frontend two-pass UI for learning path generation

### Changes Made
- `GeneratingState` now displays real milestone-generation progress instead of
  a fake 60-second timer. It receives the live milestone count and expected
  total from the graph response and shows "Generating milestone N of M...".
- `PathPreview` now lazily loads subtopics on-demand when a user expands a
  milestone with no subtopics. It uses `ensureSubtopicsForTopic(graphId,
  nodeId, studentId)`, caches the result in component state, shows a loading
  spinner, and displays a retry button on error.
- Graph view in `PathPreview` now reflects cached subtopics after a milestone
  is expanded in list view.
- `LearningPathGraph` detail panel now shows a graceful loading state when a
  selected milestone has empty subtopics.
- Updated call sites in `NewPathPage` to pass `studentId` to `PathPreview` and
  to feed live milestone counts to `GeneratingState`.

### Reason
The backend already supported two-pass generation, but the frontend still used
a fake progress bar and a 2-minute time estimate. This change exposes the fast
milestone generation to users and lets them expand milestones to load lessons
lazily, matching the existing notebook behavior.

### Files
- `a3-system/frontend/web/src/app/(dashboard)/new-path/page.tsx`
- `a3-system/frontend/web/src/app/components/LearningPathGraph.tsx`

### Impact / Testing
- TypeScript `tsc --noEmit` passes with no errors.
- Manual verification needed: create a new path, confirm milestone progress
  appears, expand a milestone in list view, confirm subtopics load on demand,
  and confirm graph view handles empty subtopics gracefully.

---

## 2026-06-18 - Backend returns milestones immediately; first milestone loaded in background

### Changes Made
- `HierarchicalGraphService.generate_graph()` now takes a
  `materialize_first_milestone` flag (default `False`). The
  `/api/hierarchical/generate` endpoint no longer waits for the first
  milestone's subtopics, so the milestone structure returns in ~10-15 seconds.
- `_materialize_progress_for_subtopics()` now creates progress rows whenever
  `student_id` is provided, even if the student hasn't formally accepted the
  graph yet. The first subtopic is unlocked when it's the student's first
  materialization so they can start learning immediately.
- `new-path/page.tsx` automatically kicks off `ensureSubtopicsForTopic` for
  the first milestone after the graph arrives. The "Accept & Start Learning"
  button shows "Preparing your first milestone..." and is disabled until the
  first milestone's lessons are ready.

### Reason
Even with two-pass generation, the backend was still synchronously generating
 the first milestone's subtopics before responding. With Kimi K2.6 taking
~60-120s per LLM call, two sequential calls produced total times of 2-4
minutes. Returning milestones only and loading the first milestone in the
background restores the intended fast first-render UX.

### Files
- `a3-system/backend/services/hierarchical_graph_service.py`
- `a3-system/backend/api/routers/hierarchical_graphs.py`
- `a3-system/frontend/web/src/app/(dashboard)/new-path/page.tsx`

### Impact / Testing
- TypeScript `tsc --noEmit` passes.
- Python syntax checks pass.
- Pre-existing test failures in `test_hierarchical_graph_generator.py`
  unchanged (4 failures unrelated to this change).
- Manual verification needed: create a new path, confirm milestones appear
  quickly, confirm first milestone prepares in background, then accept and
  verify the notebook loads with the first subtopic unlocked.

---

## 2026-06-17 - Two-pass (lazy) learning-path generation for faster first render

### Changes Made
- Split hierarchical graph generation into two passes:
  - **Pass 1** (`generate_main_topics`): plans only the milestones (main topics)
    with a `planned_subtopic_count` hint. Small output (`max_tokens=3000`).
  - **Pass 2** (`generate_subtopics`): expands one milestone into subtopics on
    demand (`max_tokens=4000`).
- `HierarchicalGraphService.generate_graph(lazy_subtopics=True)` now runs Pass 1
  and synchronously materializes only the **first** milestone's subtopics so the
  student can start immediately. Remaining milestones are filled in lazily via
  `ensure_subtopics_for_topic`.
- Lazy materialization is triggered from two places so progression keeps working:
  the notebook (when the student reaches a milestone with no subtopics) and the
  server-side `_unlock_next_subtopic` (defensive, when advancing milestones).
- New endpoint `POST /api/hierarchical/{graph_id}/topics/{node_id}/subtopics`
  (idempotent) for on-demand subtopic generation.
- Frontend: `ensureSubtopicsForTopic` API + notebook fetch-path now materializes
  the active milestone; new-path preview shows a "generated when you start"
  note for milestones not yet expanded.

### Reason
The path was generated as one ~16k-token LLM call on the Kimi reasoning model
over the Moonshot China endpoint, taking several minutes before anything showed.
Generating only the milestones first cuts time-to-first-render dramatically.

### Files
- `a3-system/backend/agents/hierarchical_graph_generator.py`
- `a3-system/backend/services/hierarchical_graph_service.py`
- `a3-system/backend/api/routers/hierarchical_graphs.py`
- `a3-system/frontend/web/src/lib/api.ts`
- `a3-system/frontend/web/src/app/(dashboard)/notebook/page.tsx`
- `a3-system/frontend/web/src/app/(dashboard)/new-path/page.tsx`
- `a3-system/backend/tests/test_hierarchical_graph_generator.py` (new tests)

### Impact / Testing
- Measured on subject "Linux System Administration" (Kimi, real API):
  - OLD single-shot full graph: **282.9s** (11 main topics, 54 subtopics)
  - NEW Pass 1 (path shown): **53.1s** -> ~5.3x faster (81% less)
  - NEW Pass 1 + first milestone (study-ready): **71.6s** -> ~4.0x faster (75% less)
- 4 new unit tests for the two-pass methods pass; full non-integration suite
  unchanged (same 9 pre-existing failures, +4 new passing tests).

---

## 2026-06-17 - Fix quiz results 500 (MultipleResultsFound) for repeated attempts

### Changes Made
- `get_quiz_results` and `regenerate_resources_after_quiz` selected the latest
  attempt with `.order_by(started_at desc)` but read it via `scalar_one_or_none()`,
  which raises `MultipleResultsFound` whenever a student has more than one attempt
  at the same quiz (the normal fail -> retake -> pass flow).
- Added `.limit(1)` to the queries and switched to `.scalars().first()`.

### Reason
After the frontend started sending `student_id` (the earlier 422 fix), the results
endpoint began returning HTTP 500 for any student with multiple attempts, so the
results page still showed "Failed to load quiz results" and the milestone-unlock
state never appeared.

### Files
- `a3-system/backend/api/routers/quiz.py`

### Impact / Testing
- `GET /api/quiz/{quiz_id}/results?student_id=...` now returns 200 with the most
  recent attempt for students who have multiple attempts (verified: score 92.5,
  7/8, outcome `accelerate`, `next_milestone_unlocked=true`).

---

## 2026-06-17 - Fix mermaid "Syntax error" bombs in AI tutor diagrams

### Changes Made
- `ChatPanel` rendered every fenced code block as a `MermaidRenderer` on each
  streamed token, so an unterminated ` ```mermaid ` fence (still streaming) was
  parsed as a partial/invalid diagram repeatedly, and mermaid injected its
  built-in "Syntax error in text" bomb SVG each time. Now a mermaid block is only
  handed to the renderer once its fence is closed; while streaming the partial is
  shown as plain code.
- `MermaidRenderer` now validates input with `mermaid.parse(chart, { suppressErrors: true })`
  before `mermaid.render`, so invalid input never triggers the bomb SVG, and
  cleans up any orphaned mermaid error nodes left on the body.

### Reason
- User reported a stack of "Syntax error in text — mermaid version 11.15.0" bombs
  when the AI tutor generated a mermaid diagram.

### Files
- `frontend/web/src/components/notebook/ChatPanel.tsx`
- `frontend/web/src/components/MermaidRenderer.tsx`

### Impact / Testing
- AI tutor diagrams render cleanly once streaming completes; no bomb graphics.

---

## 2026-06-17 - Fix quiz results page 422 (missing student_id)

### Changes Made
- The quiz results page fetched `GET /api/quiz/{quizId}/results` without the
  `student_id` query param, which the backend requires (`quiz.py:884-888`),
  so every results load returned HTTP 422 ("Failed to load quiz results").
  Now reads `studentId` from the app store and passes it as a query param,
  and waits for `studentId` before fetching.

### Reason
- E2E testing showed both fail and pass quiz attempts could never display
  results, and the milestone-unlock state (`next_milestone_unlocked`) never
  reflected in the UI because the results response never loaded.

### Files
- `frontend/web/src/app/(dashboard)/quiz/[quizId]/results/page.tsx`

### Impact / Testing
- Results page now loads score / outcome / remediation and milestone-unlock
  state. Verified backend returns correct data when `student_id` is supplied.

---

## 2026-06-17 - Stream resources to the frontend, fix code agent, speed up grading

### Changes Made
- **Frontend incremental resource generation.** Added `generateResourcesStream()`
  (SSE consumer) to `frontend/web/src/lib/api.ts` and wired the notebook
  auto-generate flow to it. Each resource card now renders the moment its
  `agent_complete` event arrives instead of waiting for all 5 agents. Cards are
  de-duplicated by `topic + type`; on stream error it falls back to the blocking
  `/api/resources/generate` endpoint.
- **Code agent reliability.** Raised the code agent `max_tokens` 4000 → 8000,
  added a truncation-tolerant JSON repair (`CodeAgent._repair_truncated_json`)
  that closes unterminated strings / balances brackets back to the last complete
  value, and tightened the prompt to request compact code so the full 3-tier
  JSON fits in the response.
- **Faster grading.** Quiz short-answer questions are now graded concurrently
  (`asyncio.gather`) instead of one sequential LLM call at a time. Judge0 test
  cases for code grading also run concurrently, and the poll interval was lowered
  (1.0s → 0.5s, max polls 10 → 20) so fast submissions return sooner.

### Reason
- Resource generation is dominated by Kimi token-generation latency (~30 tok/s),
  not reasoning mode (already disabled). Per-agent calls take ~100s+, so the
  blocking endpoint made the UI wait minutes before showing anything. Streaming
  fixes the perceived latency.
- The code agent's large 3-tier JSON was truncated at the 4000-token ceiling
  (`finish_reason=length`), so parsing failed and it silently returned a generic
  template after wasting ~150s. Verified fixed: real exercises, no fallback.
- Grading latency was the sum of sequential per-question LLM calls and
  sequential Judge0 polling; parallelizing makes it ~one call/test.

### Files
- `frontend/web/src/lib/api.ts`
- `frontend/web/src/app/(dashboard)/notebook/page.tsx`
- `backend/agents/code_agent.py`
- `backend/api/routers/quiz.py`
- `backend/core/judge0_client.py`
- `AI_CONTEXT/docs/FEATURE_02_RESOURCE_GENERATION.md`

### Impact / Testing
- Code agent: ran the agent against a live topic — returns 3 valid tiers with
  full solutions/hints/tests, `fallback=False`, in ~106s.
- Repair function: unit-tested on a known mid-string truncated payload.
- Frontend: `tsc --noEmit` passes; no new eslint errors introduced.
- Backend: `py_compile` passes; modules import cleanly.

---

## 2026-06-16 - Migrate all AI work to Kimi k2.6 (Moonshot) + add reasoning toggle

### Changes Made
- Pointed the Kimi clients at the Moonshot general endpoint (`https://api.moonshot.cn`)
  and model `kimi-k2.6`.
- Added a configurable reasoning toggle for `kimi-k2.*` hybrid reasoning models:
  - `KIMI_DISABLE_REASONING` (default `true`). When ON it sends
    `"thinking": {"type": "disabled"}` and uses `temperature=0.6` (the only value
    the endpoint accepts with reasoning off). When OFF it uses `temperature=1.0`
    (the only value accepted with reasoning on) and raises `max_tokens` to a floor
    (`KIMI_MIN_MAX_TOKENS`, default 8000) so the hidden reasoning budget can't
    starve the answer.
- Raised the Kimi HTTP timeout to `KIMI_TIMEOUT_SECONDS` (default 600s, was 180s)
  and added up to `KIMI_MAX_RETRIES` (default 2) retries on transient network
  errors (ReadTimeout / ConnectTimeout / ConnectError / RemoteProtocolError).
- Vision client honors the same reasoning toggle/temperature and timeout.

### Reason
`kimi-k2.6` is a reasoning model. With reasoning ON it spends large amounts of
hidden "thinking" tokens, so calls regularly exceeded the old 180s timeout and
raised `httpx.ReadTimeout`. Several agents catch generation errors and silently
fall back to canned templates, so the timeout surfaced as low-quality output
rather than an error. The `thinking.disabled` switch makes generation fast and
reliable; the timeout + retry are a safety net for when reasoning is left on.

### Files
- `a3-system/backend/core/llm_client.py`
- `a3-system/backend/core/vision_llm_client.py`

### Impact / Testing
- `/health` reports `model: kimi-k2.6`, `base_url: https://api.moonshot.cn`.
- End-to-end flow (register -> quiz -> low score -> remediation) produces real
  LLM content with no template fallbacks (see entry below).

---

## 2026-06-16 - Fix QuizAgent silently falling back to template questions

### Changes Made
- Raised quiz-generation `max_tokens` from 2000 to 4000.
- Replaced the fragile inline JSON parsing (direct `json.loads` then a single
  greedy `\{.*\}` regex) with `QuizAgent._parse_quiz_json`, which tries: direct
  parse -> strip ```json fences -> balanced-brace match from the first `{`.
- Changed the fallback log from `logger.error(... {e})` to `logger.exception`
  so the real traceback/exception type is captured.

### Reason
Two failure modes were silently degrading quizzes (both initial and remedial) to
generic template questions ("Question N: Which of the following best describes
X?", faithfulness 0.0):
1. The Kimi call hit the 180s timeout (fixed in the entry above).
2. With reasoning off the model returns clean JSON, but a 5-8 question quiz with
   hints/explanations exceeded the 2000-token budget and was truncated, so the
   JSON failed to parse and triggered the fallback. The original regex also could
   not handle fenced or partially-truncated output.

### Files
- `a3-system/backend/agents/quiz_agent.py`

### Impact / Testing
- Verified via the register -> quiz -> deliberately-wrong-answers -> remediation
  flow:
  - Initial quiz: 5 real questions, faithfulness 1.0.
  - Low score (e.g. 8/100) -> outcome `remediate` with detailed per-concept
    analysis.
  - Remediation regenerates and persists real remedial resources (notes,
    mindmap, and an 8-question quiz, all faithfulness 1.0) targeting the weak
    concepts, with no template fallbacks in the logs.

---

## 2026-06-16 - Local dev workaround: disabled missing CreatorNotes @font-face

### Changes Made
- Commented out the `CreatorNotes` `@font-face` block in `globals.css`.

### Reason
The referenced font files (`CreatorNotes.woff` / `.ttf`) are not committed to the
repo, which crashed the Next.js build with a module-not-found 500. Falls back to
the default sans font.

### Files
- `a3-system/frontend/web/src/app/globals.css`

### Impact / Testing
- Frontend builds and renders (200 instead of 500). Restore the block once the
  font files are added to the repo.
