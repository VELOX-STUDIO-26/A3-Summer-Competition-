# Backend test suite

Pure-logic unit tests for the A3 backend's critical paths. No external
services required — every test runs offline against in-memory data.

## Run

From `a3-system/backend/`:

```powershell
python -m pytest tests/ -v
```

With coverage on the targeted modules:

```powershell
python -m pytest tests/ ^
  --cov=agents.path_planner ^
  --cov=agents.media_agent ^
  --cov=core.faithfulness_checker ^
  --cov=nlp.profile_extractor ^
  --cov-report=term-missing
```

## What's covered

| File | Module under test | Focus |
|---|---|---|
| `test_path_planner.py` | `agents/path_planner.py` | A* search, dependency satisfaction, weak-point bias, mastery skip, milestones, edge cases |
| `test_media_parser.py` | `agents/media_agent.py::MediaAgent._parse_slides_json` | Salvage parser for truncated LLM output; regression for the 1-slide bug |
| `test_faithfulness_parser.py` | `core/faithfulness_checker.py::FaithfulnessChecker._parse_verification_response` | JSON extraction, score arithmetic, fallback paths, source formatting |
| `test_profile_builder.py` | `nlp/profile_extractor.py::ProfileBuilder` | Weighted moving-average merging, list/dict/scalar dimensions, completeness check |
| `test_smoke_api.py` | `main.py` | App boot, `/health`, `/`, `/openapi.json`, `/docs` routes |

## What's **not** covered (yet)

These need either a live LLM or a DB and are intentionally out of scope
for the unit suite:

- `BaseAgent.run` and the per-agent `run()` methods (Content / Quiz /
  Mind Map / Media / Code) — require real OpenRouter calls.
- `ProfileExtractor.extract_from_message` — same.
- `FaithfulnessChecker.check_faithfulness` end-to-end — same.
- Database-backed routers (quiz, milestone, tracking, analytics) —
  require Postgres.
- Frontend Jest / React Testing Library tests — separate stack.
- Playwright E2E flow — separate stack.

See `PROJECT_STATUS.md` §7 for the prioritized roadmap of those
follow-up suites.

## Adding new tests

- One file per module under test, named `test_<module>.py`.
- Use the fixtures in `conftest.py` (`synthetic_graph`, `beginner_profile`,
  `expert_profile`) where possible — they're deterministic and fast.
- For async code, just write `async def test_...` — `asyncio_mode = auto`
  in `pytest.ini` handles the rest.
- Mark slow tests with `@pytest.mark.slow` and external-dependency tests
  with `@pytest.mark.integration`.
