# NOBOGYAN - Multi-Agent AI Learning System

> **Competition:** 15th China Software Cup - Track A3 (iFlytek)
> **Team:** VELOX Studio

A multi-agent AI learning platform where 15+ specialized agents collaborate to build personalized learning paths. Students chat with a profiling bot, an orchestrator dispatches 5 content agents in parallel, an A* planner sequences milestones, and a context-aware tutor answers questions with streaming text + voice.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion |
| Backend | FastAPI, Python 3.10+, SQLAlchemy (async) |
| Database | PostgreSQL 15, Redis 7, Weaviate 1.24 |
| LLM | Kimi k2.6 (Moonshot AI) primary, OpenRouter fallback |
| Voice | iFlytek ASR + Edge TTS |
| Auth | Firebase |
| Code Execution | Judge0 sandbox |

---

## Repository Layout

```
A3-Summer-Competition-/
├── README.md                    # You are here
├── a3-system/
│   ├── backend/                 # FastAPI + 15 AI agents + RAG
│   │   ├── agents/              # Orchestrator, content agents, evaluator
│   │   ├── api/routers/         # REST endpoints
│   │   ├── core/                # LLM client, config, TTS/ASR
│   │   └── main.py              # Entry point
│   ├── frontend/web/            # Next.js 16 (App Router)
│   │   └── src/app/             # Pages and components
│   ├── data/                    # knowledge_graph.json + RAG sources
│   ├── docker-compose.yml       # PostgreSQL + Redis + Weaviate + app
│   ├── requirements.txt         # Python dependencies
│   └── .env.template            # Environment config template
├── AI_CONTEXT/docs/             # Architecture docs, feature specs
└── Cloud-Computing(1-3)/        # Knowledge base source material
```

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Backend |
| Node.js | 18+ (20 recommended) | Frontend |
| Docker Desktop | latest | PostgreSQL, Redis, Weaviate |
| Git | any | Version control |

**API Keys needed:**
- **Kimi (Moonshot AI)** - Primary LLM. Get a key at [platform.moonshot.cn](https://platform.moonshot.cn)
- **OpenRouter** (optional) - Free-tier fallback LLM. Get a key at [openrouter.ai/keys](https://openrouter.ai/keys)

---

## Setup

### 1. Clone

```bash
git clone https://github.com/VELOX-STUDIO-26/A3-Summer-Competition-.git
cd A3-Summer-Competition-
```

### 2. Configure environment

```bash
cd a3-system
cp .env.template .env
```

Open `.env` and set these required values:

```ini
# Required - at least one LLM key
OPENROUTER_KIMI_API_KEY=your-kimi-key-here        # Primary LLM (Moonshot)
OPENROUTER_API_KEY=sk-or-v1-your-key-here          # Fallback (OpenRouter free tier)

# Required - JWT signing
SECRET_KEY=any-long-random-string-here
```

> **Important:** The `.env.template` uses Docker service names (`postgres`, `redis`, `weaviate`) as hosts. If you run the backend **outside Docker** but services inside Docker, change these to `localhost`:
> ```ini
> DATABASE_URL=postgresql+asyncpg://a3_user:a3_password@localhost:5432/a3_db
> REDIS_URL=redis://localhost:6379/0
> WEAVIATE_URL=http://localhost:8080
> ```

### 3. Start data services

```bash
cd a3-system
docker-compose up -d postgres redis weaviate
```

Verify they're healthy:

```bash
docker-compose ps
# All three should show "healthy"
```

### 4. Run the backend

**Option A - Native Python (recommended for development):**

```bash
cd a3-system

# Create virtual environment
python -m venv .venv

# Activate it
# Linux/Mac:
source .venv/bin/activate
# Windows PowerShell:
# .\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start the backend
cd backend
python main.py
```

**Option B - Everything in Docker:**

```bash
cd a3-system
docker-compose up -d
```

Backend will be at http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

On first launch, the backend will:
1. Run database migrations
2. Seed the knowledge graph from `data/knowledge_graph.json`
3. Index RAG chunks into Weaviate
4. Test LLM connectivity

Check `backend/backend.log` if something fails.

### 5. Run the frontend

In a **second terminal**:

```bash
cd a3-system/frontend/web
npm install
npm run dev
```

Frontend will be at http://localhost:3000

If the backend is on a different host, create `frontend/web/.env.local`:
```ini
NEXT_PUBLIC_API_URL=http://your-backend-host:8000
```

---

## User Flow (Smoke Test)

1. Open http://localhost:3000
2. **Register** an account at `/register`
3. Complete the **profiling chat** (5-8 questions about your background, goals, learning style)
4. Review your **profile summary** - the system extracts a 6-dimension learner profile
5. **Generate a learning path** - choose a subject, the A* planner builds a milestone graph
6. Land on the **notebook** - explore milestones, view generated resources (notes, mind maps, quizzes, videos, code exercises)
7. Take a **quiz** - the gate engine decides whether to unlock the next milestone or trigger remediation
8. Open the **AI Tutor** and ask questions - answers stream via SSE with optional voice playback

---

## Configuration Reference

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENROUTER_KIMI_API_KEY` | Yes* | - | Kimi/Moonshot API key (primary LLM) |
| `OPENROUTER_API_KEY` | Yes* | - | OpenRouter API key (fallback LLM) |
| `SECRET_KEY` | Yes | - | JWT signing key |
| `DATABASE_URL` | No | `postgresql+asyncpg://a3_user:a3_password@postgres:5432/a3_db` | Use `localhost` for non-Docker backend |
| `REDIS_URL` | No | `redis://redis:6379/0` | Use `localhost` for non-Docker backend |
| `WEAVIATE_URL` | No | `http://weaviate:8080` | Use `localhost` for non-Docker backend |
| `TTS_PROVIDER` | No | `edge` | `edge` (free) or `iflytek` |
| `TTS_VOICE` | No | `zh-CN-XiaoxiaoNeural` | Any Edge-TTS voice ID |
| `MAX_PATH_NODES` | No | `25` | A* planner node cap |
| `CHUNK_SIZE` | No | `512` | RAG chunking size |

*At least one LLM key is required. Kimi is recommended for production quality.

Full list in `a3-system/.env.template`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Backend exits with `connection refused` | Data services not running | `docker-compose ps` - ensure all three are `healthy` |
| `401 Unauthorized` on LLM calls | Bad API key | Check `OPENROUTER_KIMI_API_KEY` or `OPENROUTER_API_KEY` in `.env` |
| Frontend shows "Network Error" | Backend not running or wrong URL | Visit http://localhost:8000/health directly |
| `module 'asyncpg' not found` | Venv not activated | Activate `.venv` and re-run `pip install -r requirements.txt` |
| Port 8000/3000 already in use | Another process on that port | Use `--port 8001` for backend or `PORT=3001 npm run dev` |
| Database migration errors | Stale data | `docker-compose down -v` then `docker-compose up -d postgres redis weaviate` |

Logs: `backend/backend.log`, `backend/server.log`, `docker-compose logs <service>`

---

## Project Documentation

Detailed architecture and feature docs are in `AI_CONTEXT/docs/`:

- `PROJECT_STATUS.md` - Current implementation status
- `FEATURE_01_PROFILING.md` - Student profiling system
- `FEATURE_02_RESOURCE_GENERATION.md` - Multi-agent content generation
- `FEATURE_03_PATH_PLANNING.md` - A* learning path planning
- `FEATURE_04_AI_TUTORING.md` - AI tutoring with voice
- `FEATURE_05_ANALYTICS.md` - Analytics and assessment

---

## License

Competition submission - 15th China Software Cup (iFlytek Track).

---

**Built by VELOX Studio** | [veloxstudio.tech](https://veloxstudio.tech) | [X](https://x.com/velox_studio_26) | [YouTube](https://www.youtube.com/@veloxstudio1)
