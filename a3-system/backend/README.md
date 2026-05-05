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
- `OPENROUTER_API_KEY` - Your OpenRouter API key (get from https://openrouter.ai/keys)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `WEAVIATE_URL` - Weaviate vector database URL

## API Endpoints

### System
- `GET /` - API information
- `GET /health` - Health check

### (Coming Soon)
- `POST /api/profile` - Create/update student profile
- `POST /api/path/plan` - Generate learning path
- `POST /api/resources/generate` - Generate learning resources
- `POST /api/tutor/ask` - Ask AI tutor
- `POST /api/analytics/track` - Track learning events

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
