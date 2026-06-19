# A3 Learning System - Backend

FastAPI backend for the A3 adaptive learning system.

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.template .env
   # Edit .env with your API keys and settings
   ```

3. **Run the development server:**
   ```bash
   cd backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Access the API:**
   - API: http://localhost:8000
   - Documentation: http://localhost:8000/docs
   - Health check: http://localhost:8000/health

## Using Docker

1. **Start all services:**
   ```bash
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
├── models/              # Pydantic models and schemas
├── core/                # Core utilities
│   ├── config.py        # Configuration management
│   └── logging.py       # Logging setup
└── tests/               # Test suite
```

## Environment Variables

See `.env.template` for all available configuration options.

Key variables:
- `OPENROUTER_KIMI_API_KEY` - Kimi/Moonshot API key (primary LLM, get from https://platform.moonshot.cn)
- `OPENROUTER_API_KEY` - OpenRouter API key (fallback LLM, get from https://openrouter.ai/keys)
- `SECRET_KEY` - JWT signing key for authentication
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `WEAVIATE_URL` - Weaviate vector database URL

## API Endpoints

### System
- `GET /` - API information
- `GET /health` - Health check

### Auth
- `POST /api/auth/register` - Register a new student
- `POST /api/auth/login` - Login and get JWT token

### Profiling
- `POST /api/profile/chat` - Conversational profiling chat
- `GET /api/profile/{student_id}` - Get student profile

### Learning Path
- `POST /api/path/generate` - Generate learning path (streaming SSE)
- `GET /api/path/{graph_id}` - Get learning path graph

### Resources
- `POST /api/resources/generate` - Generate learning resources for a topic

### Tutoring
- `POST /api/tutor/sessions` - Create tutor session
- `POST /api/tutor/ask` - Ask AI tutor (streaming SSE)

### Quiz
- `POST /api/quiz/generate` - Generate quiz for a topic
- `POST /api/quiz/submit` - Submit quiz answers

### Analytics
- `GET /api/analytics/{student_id}` - Get learning analytics

Full interactive docs at http://localhost:8000/docs when the server is running.

## Development

### Running Tests
```bash
pytest -v --cov=backend --cov-report=html
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

## License

[Your License Here]
