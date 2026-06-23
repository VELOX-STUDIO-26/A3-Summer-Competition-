# A3 — Personalized AI Learning System

> **Competition:** 15th China Software Cup — Track A3 (iFlytek)
> **Stack:** FastAPI · Next.js 16 · React 19 · PostgreSQL · Redis · Weaviate · Kimi k2.6 (Moonshot) · Edge-TTS · Judge0

A multi-agent AI tutoring platform: students chat with a profiling bot, a 5-agent orchestrator generates personalized lecture notes / mind maps / quizzes / video-style lecture slides / coding exercises, an A* planner sequences them into a milestone-based learning path, and a context-aware tutor answers questions with streaming text + voice.

---

## 1. Repository layout

```
A3 Summer Project/
├── a3-system/              ← the actual application
│   ├── backend/            ← FastAPI + agents + RAG
│   ├── frontend/web/       ← Next.js 16 (App Router)
│   ├── data/               ← knowledge_graph.json + RAG sources
│   ├── docker-compose.yml
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.template
├── project-prd.md          ← product spec
├── PROJECT_PLAN.md         ← 10-week implementation plan
├── PROJECT_STATUS.md       ← current completion report
└── README.md               ← you are here
```

All commands below assume your shell is in `a3-system/` unless stated otherwise.

---

## 2. Prerequisites

| Tool | Version | Why |
|---|---|---|
| **Python** | 3.10+ | Backend |
| **Node.js** | 18+ (20 recommended) | Frontend |
| **PostgreSQL** | 15 | Primary DB |
| **Redis** | 7 | Cache + sessions |
| **Weaviate** | 1.24 | Vector store for RAG |
| **Docker Desktop** | latest | Easiest way to get the three services above |
| **Git** | any | Version control |

You'll need a **Kimi (Moonshot AI) API key** from <https://platform.moonshot.cn> (primary LLM). An optional **OpenRouter API key** from <https://openrouter.ai/keys> can be configured as fallback. The app will run without either, but every LLM call will fail.

---

## 3. First-time setup

### 3.1 Clone

```powershell
git clone https://github.com/VELOX-STUDIO-26/A3-Summer-Competition-.git
cd "A3-Summer-Competition-"
```

### 3.2 Configure environment

```powershell
cd a3-system
copy .env.template .env
```

Open `.env` and at minimum set:

```ini
# Required - at least one LLM key (Kimi recommended for production)
OPENROUTER_KIMI_API_KEY=your-kimi-key-here        # Primary LLM (Moonshot)
OPENROUTER_API_KEY=sk-or-v1-your-key-here          # Fallback (OpenRouter free tier)

# Required - JWT signing
SECRET_KEY=any-long-random-string-for-jwt
```

> **Note on `DB_HOST` / `REDIS_URL` / `WEAVIATE_URL`:** the template uses Docker service names (`postgres`, `redis`, `weaviate`). If you run the backend **outside** Docker against Dockerized services, change those to `localhost`.

### 3.3 Start the data services (Postgres + Redis + Weaviate)

```powershell
docker-compose up -d postgres redis weaviate
```

Verify they're healthy:

```powershell
docker-compose ps
```

All three should show `healthy`.

---

## 4. Run the **backend**

You have two options. Pick one.

### Option A — Native Python (recommended for development)

From `a3-system/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

cd backend
python main.py
```

Backend now serves at <http://localhost:8000>.

- API docs (Swagger): <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- Health check: <http://localhost:8000/health>

The first launch will:

1. Run Alembic migrations (`core/database_init.py`).
2. Seed the knowledge graph from `data/knowledge_graph.json`.
3. Index RAG chunks into Weaviate.
4. Test connectivity to Kimi (Moonshot).

If something fails, check `backend/backend.log`.

### Option B — Everything in Docker

```powershell
docker-compose up -d
```

This builds and runs `backend` and `frontend` containers alongside the data services. Same URLs as above.

To watch backend logs:

```powershell
docker-compose logs -f backend
```

---

## 5. Run the **frontend**

In a **second terminal** (leave the backend running):

```powershell
cd a3-system\frontend\web
npm install
npm run dev
```

Frontend serves at <http://localhost:3000>.

The frontend reads its API base URL from `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`). If the backend lives elsewhere, create `frontend/web/.env.local`:

```ini
NEXT_PUBLIC_API_URL=http://your-backend-host:8000
```

### Production build

```powershell
npm run build
npm run start
```

---

## 6. First user flow (smoke test)

1. Open <http://localhost:3000>.
2. **Register** an account (`/register`).
3. Complete the **profiling chat** (5–8 questions). The system extracts your 6-dimension profile.
4. Land on the **notebook** dashboard. Pick a topic from the cloud-computing knowledge graph (e.g. *IaaS*, *Docker*, *Kubernetes*).
5. Click **Generate** — the orchestrator runs all 5 agents in parallel:
   - lecture notes (Markdown)
   - interactive mind map
   - quiz
   - lecture-slide video with TTS narration
   - coding exercise (with Judge0 sandbox if configured)
6. Take the quiz; on submission the gate engine decides whether to unlock the next milestone or trigger remediation.
7. Open the **AI Tutor** panel and ask a follow-up question — answer streams via SSE, with optional voice playback.

---

## 7. Common tasks

### Reset the database

```powershell
docker-compose down -v        # ⚠ destroys postgres + redis + weaviate volumes
docker-compose up -d postgres redis weaviate
# then restart backend; it will re-migrate + re-seed
```

### Re-index the knowledge base only

```powershell
cd a3-system\backend
python -c "from rag.indexer import reindex_all; import asyncio; asyncio.run(reindex_all())"
```

### Inspect the database with pgAdmin

```powershell
docker-compose --profile tools up -d pgadmin
```

Open <http://localhost:5050> (login `admin@a3.local` / `admin`). Add a server with host `postgres`, user `a3_user`, password `a3_password`, db `a3_db`.

### Run the test scripts

Targeted ad-hoc tests live in `backend/`:

```powershell
cd a3-system\backend
python test_generate_quiz.py
python create_test_student.py
```

A real `pytest` suite is on the roadmap (see `PROJECT_STATUS.md`).

---

## 8. Configuration cheat-sheet

| Variable | Default | Notes |
|---|---|---|
| `OPENROUTER_KIMI_API_KEY` | Yes* | — | Kimi/Moonshot API key (primary LLM, get from https://platform.moonshot.cn) |
| `OPENROUTER_API_KEY` | Yes* | — | OpenRouter API key (fallback LLM, get from https://openrouter.ai/keys) |
| `KIMI_DISABLE_REASONING` | `true` | Disable hidden reasoning tokens for faster generation |
| `KIMI_TIMEOUT_SECONDS` | `600` | HTTP timeout for Kimi calls |
| `KIMI_MAX_RETRIES` | `2` | Retry count on transient network errors |
| `OPENROUTER_MODEL` | `meta-llama/llama-3.1-70b-instruct` | Any OpenRouter model id |
| `DATABASE_URL` | `postgresql+asyncpg://a3_user:a3_password@postgres:5432/a3_db` | Use `localhost` instead of `postgres` for non-Docker backend |
| `REDIS_URL` | `redis://redis:6379/0` | Same — swap host for local |
| `WEAVIATE_URL` | `http://weaviate:8080` | Same |
| `TTS_PROVIDER` | `edge` | `edge` (free) or `iflytek` |
| `TTS_VOICE` | `zh-CN-XiaoxiaoNeural` | Any Edge-TTS voice id |
| `API_PORT` | `8000` | Backend port |
| `FRONTEND_PORT` | `3000` | Next.js port |
| `SECRET_KEY` | — | **Required.** JWT signing key |
| `MAX_PATH_NODES` | `25` | A* planner cap |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `512` / `50` | RAG chunking |

Full list in `a3-system/.env.template`.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Backend exits immediately with `connection refused` | Postgres/Redis/Weaviate not up | `docker-compose ps`, ensure all three are `healthy` |
| `401 Unauthorized` on every LLM call | Bad `OPENROUTER_KIMI_API_KEY` | Check key at platform.moonshot.cn; restart backend |
| Frontend shows network errors | Backend not running, or `NEXT_PUBLIC_API_URL` wrong | Visit `/health` directly; fix env and restart `npm run dev` |
| `pgcrypto`/`uuid` extension errors | Old Postgres image | `docker-compose down -v` then `up -d postgres` to recreate |
| Quiz / video says "1 slide" or "no questions" | LLM JSON truncation under load | Already mitigated; if persistent, raise `max_tokens` in the offending agent |
| `module 'asyncpg' not found` | Skipped venv | Activate `.venv` and re-run `pip install -r requirements.txt` |
| Port 8000 / 3000 already in use | Another dev server | `--port 8001` (uvicorn) or set `PORT=3001` for `npm run dev` |

Logs to check: `backend/backend.log`, `backend/server.log`, `docker-compose logs <service>`.

---

## 10. What's where (top-level pointers)

**Backend agents:** `a3-system/backend/agents/` — `orchestrator.py`, `content_agent.py`, `quiz_agent.py`, `mindmap_agent.py`, `media_agent.py`, `code_agent.py`, plus `path_planner.py`, `gate_agent.py`, `evaluator_agent.py`.

**API routers:** `a3-system/backend/api/routers/` — `chat`, `profile`, `path`, `resources`, `tutor`, `quiz`, `milestone`, `analytics`, `tracking`, `auth`, `tts`.

**LLM client:** `a3-system/backend/core/llm_client.py` (Kimi k2.6 primary + OpenRouter fallback).

**Faithfulness checker:** `a3-system/backend/core/faithfulness_checker.py` — runs on every agent's output.

**Frontend pages:** `a3-system/frontend/web/src/app/` — `(auth)`, `(onboarding)`, `(dashboard)/notebook`, `(dashboard)/quiz`.

**Knowledge graph + RAG sources:** `a3-system/data/`.

For a full feature-by-feature completion report, see `PROJECT_STATUS.md`.

---

## 11. License

Internal — competition submission. See competition guidelines.

---

## 12. Quick run reference (TL;DR)

Once Docker Desktop and the data services are already running, these are the only commands you need.

### Backend (PowerShell)

**First time only** — install dependencies into a virtual environment, from `a3-system/`:

```powershell
cd "d:\Main project\A3 Summer Project\a3-system"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If `Activate.ps1` is blocked by execution policy:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

**Every time** — start the backend:

```powershell
cd "d:\Main project\A3 Summer Project\a3-system"
.\.venv\Scripts\Activate.ps1
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend → <http://localhost:8000> · Swagger → <http://localhost:8000/docs>

> **Note:** use `python -m uvicorn ...` rather than bare `uvicorn ...` — it works even when the venv's `Scripts` dir isn't on PATH.

### Frontend (PowerShell, second terminal)

**First time only:**

```powershell
cd "d:\Main project\A3 Summer Project\a3-system\frontend\web"
npm install
```

**Every time:**

```powershell
cd "d:\Main project\A3 Summer Project\a3-system\frontend\web"
npm run dev
```

Frontend → <http://localhost:3000>

### Data services (Docker Desktop must be running)

```powershell
cd "d:\Main project\A3 Summer Project\a3-system"
docker-compose up -d postgres redis weaviate
docker-compose ps              # confirm all three say `healthy`
```

To stop them later:

```powershell
docker-compose stop postgres redis weaviate
```
