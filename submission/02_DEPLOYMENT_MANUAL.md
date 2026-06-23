# Operation & Deployment Manual

## NOBOGYAN - Personalized Resource Generation Multi-Agent System

**Version:** 1.0  
**Date:** 2026-06-18  
**Team:** VELOX STUDIO

---

## Table of Contents

1. Environment Setup
2. One-Click Startup
3. Configuration Reference
4. Troubleshooting
5. Account & Login Instructions

---

## 1. Environment Setup

### 1.1 Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.10+ | Backend runtime |
| Node.js | 18+ | Frontend build |
| Docker Desktop | Latest | Postgres + Redis + Weaviate |
| Git | Latest | Clone repository |
| GitHub Account | - | For repository access |

### 1.2 Step-by-Step Setup

#### Step 1: Clone Repository

```bash
git clone https://github.com/VELOX-STUDIO-26/A3-Summer-Competition-.git
cd A3-Summer-Competition-
```

#### Step 2: Start Infrastructure (Docker)

```bash
# Navigate to backend directory
cd a3-system/backend

# Start PostgreSQL, Redis, Weaviate
docker-compose up -d

# Verify services are running
docker-compose ps
```

Expected output:
```
NAME                STATUS
a3-postgres         Up
a3-redis            Up
a3-weaviate         Up
```

#### Step 3: Backend Setup

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed initial data (optional)
python scripts/seed_data.py
```

#### Step 4: Frontend Setup

```bash
# Navigate to frontend
cd ../frontend/web

# Install dependencies
npm install

# Build for production
npm run build

# Or start dev server
npm run dev
```

### 1.5 Dependency Files

| File | Purpose |
|------|---------|
| `a3-system/backend/requirements.txt` | Python packages |
| `a3-system/frontend/web/package.json` | Node.js packages |
| `a3-system/backend/docker-compose.yml` | Infrastructure services |
| `a3-system/backend/Dockerfile` | Backend container |

---

## 2. One-Click Startup

### 2.1 Development Mode

```bash
# Terminal 1: Infrastructure
cd a3-system/backend
docker-compose up -d

# Terminal 2: Backend API
cd a3-system/backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3: Frontend Dev Server
cd a3-system/frontend/web
npm run dev
```

Access points:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 2.2 Production Mode (Docker)

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up --build -d
```

---

## 3. Configuration Reference

### 3.1 Environment Variables

Create `.env` file in `a3-system/` (copied from `.env.template`):

```env
# Database
DATABASE_URL=postgresql+asyncpg://a3_user:a3_password@localhost:5432/a3_db

# Redis
REDIS_URL=redis://localhost:6379/0

# LLM (Kimi/Moonshot - Primary)
OPENROUTER_KIMI_API_KEY=your_kimi_api_key
OPENROUTER_KIMI_BASE_URL=https://api.moonshot.cn
OPENROUTER_KIMI_MODEL=kimi-k2.6
KIMI_DISABLE_REASONING=true
KIMI_TIMEOUT_SECONDS=600
KIMI_MAX_RETRIES=2

# LLM (OpenRouter - Fallback)
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct

# iFlytek (optional - ASR/TTS)
IFLYTEK_APP_ID=your_app_id
IFLYTEK_API_KEY=your_api_key
IFLYTEK_API_SECRET=your_api_secret

# Vector Store
WEAVIATE_URL=http://localhost:8080

# Auth
SECRET_KEY=your_jwt_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# TTS
TTS_PROVIDER=edge
TTS_VOICE=zh-CN-XiaoxiaoNeural

# Path Planning
MAX_PATH_NODES=25
MILESTONE_DELTA=15
GATE_UNLOCK_THRESHOLD=0.7

# RAG
CHUNK_SIZE=512
CHUNK_OVERLAP=50
```

### 3.2 Key Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MAX_CONCURRENT_AGENTS` | 5 | Parallel agent limit |
| `FAITHFULNESS_THRESHOLD` | 0.8 | Minimum fact-check score |
| `MILESTONE_DELTA` | 15 | Nodes per milestone |
| `GATE_UNLOCK_THRESHOLD` | 0.7 | Quiz score to unlock |
| `INSIGHTS_CACHE_HOURS` | 24 | Analytics cache TTL |

---

## 4. Troubleshooting

### 4.1 Common Errors

#### Error: `ModuleNotFoundError: No module named 'xxx'`

**Solution:**
```bash
# Reinstall dependencies
pip install -r requirements.txt
```

#### Error: `Connection refused` to PostgreSQL

**Solution:**
```bash
# Check Docker status
docker-compose ps

# Restart if needed
docker-compose restart postgres

# Verify port 5432 is free
lsof -i :5432  # Mac/Linux
netstat -ano | findstr :5432  # Windows
```

#### Error: `npm install` fails / package-lock conflicts

**Solution:**
```bash
# Clear cache and reinstall
cd a3-system/frontend/web
rm -rf node_modules package-lock.json  # Mac/Linux
rmdir /s /q node_modules  # Windows
del package-lock.json  # Windows
npm install
```

#### Error: Frontend build fails with font error

**Solution:**
```bash
# CreatorNotes font files are missing - commented out in globals.css
# This is expected; falls back to default sans font
```

#### Error: LLM timeout / ReadTimeout

**Solution:**
```bash
# Increase timeout in .env
KIMI_TIMEOUT_SECONDS=600

# Or disable reasoning for faster generation
KIMI_DISABLE_REASONING=true
```

#### Error: `MultipleResultsFound` in quiz results

**Solution:**
```bash
# Already fixed in latest version - update to latest commit
git pull origin main
```

### 4.2 Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Database connection
curl http://localhost:8000/health/db

# Vector store
curl http://localhost:8000/health/vector
```

---

## 5. Account & Login Instructions

### 5.1 Demo Access

**Web Application:** http://localhost:3000

#### Registration Flow

1. Navigate to **Landing Page**
2. Click **"Get Started"** or **"Sign Up"**
3. Enter email + password (Firebase Auth)
4. Complete **Conversational Profiling** (6-dimension chat)
5. Review **Profile Summary**
6. Enter **Subject** (e.g., "Cloud Computing", "Machine Learning")
7. View **Learning Path Preview**
8. Click **"Start Learning"** to enter Notebook

#### Login Flow

1. Navigate to **Login Page**
2. Enter registered email + password
3. Auto-redirect to **Notebook**

### 5.2 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Student Demo | demo@nobogyan.com | demo123 |

### 5.3 Core Features Walkthrough

#### Notebook (Main Learning View)
- **Left Panel**: Learning path milestones
- **Center**: Resource cards (notes, mindmap, quiz, video, code)
- **Right Panel**: AI Tutor chat
- **Bottom**: Progress tracking

#### Quiz Taking
- Auto-generated based on current topic
- 4 question types: multiple choice, true/false, scenario, short answer
- Adaptive difficulty based on mastery
- Immediate feedback + explanations

#### AI Tutor
- Text input: Type questions
- Voice input: Click microphone (iFlytek ASR)
- Image input: Upload equation/diagram
- Streaming responses with RAG grounding

#### Analytics Dashboard
- Radar chart: 6-dimension mastery
- Progress trends: Study hours over time
- AI Insights: LLM-generated observations
- Peer comparison: Cohort percentiles

---

*Document Version: 1.0 | Generated: 2026-06-18*
