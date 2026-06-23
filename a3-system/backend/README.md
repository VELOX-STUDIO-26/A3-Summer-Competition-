# A3 Learning System - Backend

FastAPI backend for the A3 adaptive learning system.

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp ../.env.template ../.env
   # Edit .env with your API keys and settings
   ```

3. **Run the development server:**
   ```bash
   python main.py
   # Or directly with uvicorn:
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Access the API:**
   - API: http://localhost:8000
   - Documentation: http://localhost:8000/docs
   - Health check: http://localhost:8000/health

## Using Docker

The backend is designed to run alongside PostgreSQL, Redis, and Weaviate via Docker Compose in the parent `a3-system/` directory.

1. **Start all services (from `a3-system/`):**
   ```bash
   cd ..
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f backend
   ```

3. **Stop services:**
   ```bash
   docker-compose down
   ```

## Project Structure

```
backend/
├── main.py              # FastAPI application entry point
├── api/                 # API routes and controllers
│   └── routers/         # Individual route modules
├── agents/              # Multi-agent system components
├── nlp/                 # Natural language processing
├── rag/                 # Retrieval-Augmented Generation
├── analytics/           # Learning analytics and assessment
├── adaptation/          # Dynamic adaptation engine + recommender
├── models/              # SQLAlchemy database models + Pydantic schemas
├── services/            # Business logic layer (graph service, analytics service)
├── core/                # Core utilities
│   ├── llm_client.py    # Kimi k2.6 (Moonshot) + OpenRouter fallback
│   ├── vision_llm_client.py  # Multimodal image analysis
│   ├── tutor_engine.py  # AI tutoring logic
│   ├── faithfulness_checker.py  # Hallucination guardrail
│   ├── tts_client.py    # Edge-TTS + iFlytek TTS
│   ├── asr_client.py    # iFlytek IAT WebSocket ASR
│   ├── content_moderator.py     # Harmful content filtering
│   ├── judge0_client.py         # Code sandbox
│   ├── config.py        # Configuration management
│   └── logging.py       # Logging setup
└── tests/               # Test suite (295+ tests)
```

## Environment Variables

See `../.env.template` for all available configuration options.

Key variables:
- `OPENROUTER_KIMI_API_KEY` - Kimi/Moonshot API key (primary LLM, get from https://platform.moonshot.cn)
- `OPENROUTER_API_KEY` - OpenRouter API key (fallback LLM, get from https://openrouter.ai/keys)
- `KIMI_DISABLE_REASONING` - Disable hidden reasoning tokens for faster generation (default: `true`)
- `KIMI_TIMEOUT_SECONDS` - HTTP timeout for Kimi calls (default: `600`)
- `SECRET_KEY` - JWT signing key for authentication
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `WEAVIATE_URL` - Weaviate vector database URL

## API Endpoints

### System
- `GET /` - API information
- `GET /health` - Health check
- `GET /health/db` - Database health
- `GET /health/vector` - Vector store health

### Auth
- `POST /api/auth/register` - Register a new student
- `POST /api/auth/login` - Login and get JWT token

### Profiling
- `POST /api/chat/start` - Begin profiling session
- `POST /api/chat/{id}/message` - Send profiling message
- `POST /api/chat/{id}/complete` - Complete profiling
- `GET /api/profile/{student_id}` - Get student profile

### Learning Path
- `POST /api/path/plan` - Generate learning path (A* algorithm)
- `POST /api/hierarchical/generate` - Generate hierarchical graph
- `POST /api/hierarchical/generate/stream` - Stream hierarchical graph generation (SSE)
- `POST /api/hierarchical/{graph_id}/topics/{node_id}/subtopics` - Lazy subtopic generation
- `GET /api/milestone` - List milestones
- `GET /api/milestone/{id}` - Get milestone details

### Resources
- `POST /api/resources/generate` - Generate learning resources for a topic
- `POST /api/resources/generate/stream` - Stream resource generation (SSE)
- `GET /api/resources/remedial` - Get remedial resources

### Tutoring
- `POST /api/tutor/sessions` - Create tutor session
- `GET /api/tutor/sessions` - List sessions
- `GET /api/tutor/sessions/{id}/messages` - Load message history
- `POST /api/tutor/sessions/{id}/messages/stream` - Send message (SSE streaming)
- `POST /api/tutor/ask` - Ask AI tutor (blocking)
- `POST /api/tutor/ask/stream` - Ask AI tutor (SSE streaming)
- `POST /api/tutor/speak` - Text-to-speech
- `POST /api/tutor/analyze-image` - Image analysis
- `POST /api/tutor/extract-equation` - LaTeX extraction

### ASR (Voice Input)
- `GET /api/asr/status` - Check ASR configuration
- `POST /api/asr/transcribe` - Speech-to-text (file upload)
- `WS /api/asr/stream` - Real-time ASR WebSocket

### Quiz
- `POST /api/quiz/generate` - Generate quiz for a topic
- `POST /api/quiz/generate/stream` - Stream quiz generation (SSE)
- `POST /api/quiz/{id}/submit` - Submit quiz answers
- `GET /api/quiz/{id}/results` - Get quiz results

### Analytics
- `GET /api/analytics/{student_id}` - Comprehensive analytics
- `GET /api/analytics/{student_id}/progress` - Progress over time
- `GET /api/analytics/{student_id}/activity` - Recent activity feed
- `GET /api/analytics/{student_id}/dashboard` - Dashboard summary
- `GET /api/analytics/{student_id}/insights` - LLM-powered insights (24h cache)

### Cohorts (Comparative Analytics)
- `GET /api/cohorts` - List cohorts
- `POST /api/cohorts` - Create cohort
- `GET /api/cohorts/{id}/members` - List members
- `GET /api/cohorts/{id}/leaderboard` - Anonymized leaderboard
- `GET /api/cohorts/{id}/comparative/{student_id}` - Student comparative metrics

### Adaptation
- `POST /api/adapt/events/quiz-completed` - Submit quiz completion event
- `POST /api/adapt/events/gate-calculated` - Submit gate score event
- `POST /api/adapt/events/goal-changed` - Submit goal change event
- `POST /api/adapt/events/milestone-stuck` - Submit milestone stuck event
- `POST /api/adapt/recommend` - Get hybrid recommendations

Full interactive docs at http://localhost:8000/docs when the server is running.

## Development

### Running Tests
```bash
pytest -v
# With coverage (requires pytest-cov):
# pytest -v --cov=backend --cov-report=html
```

### Code Quality
```bash
# Format code
black backend/

# Check style
flake8 backend/

# Type checking
mypy backend/
```

## Documentation

- API Docs: http://localhost:8000/docs (OpenAPI/Swagger)
- ReDoc: http://localhost:8000/redoc
- Feature docs: See `../AI_CONTEXT/docs/`

## License

Internal — competition submission. See competition guidelines.
