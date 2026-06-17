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
