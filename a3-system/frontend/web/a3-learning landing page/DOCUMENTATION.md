# A3 Learning System - Documentation

**Version**: 1.0.0  
**Last Updated**: May 20, 2026  
**Maintained by**: VELOX Studio

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Architecture Overview](#2-architecture-overview)
3. [Backend API Reference](#3-backend-api-reference)
4. [Agent System](#4-agent-system)
5. [Database Schema](#5-database-schema)
6. [Deployment Guide](#6-deployment-guide)
7. [Configuration](#7-configuration)
8. [Troubleshooting](#8-troubleshooting)
9. [Contributing](#9-contributing)
10. [FAQ](#10-faq)

---

## 1. Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.10+ | Backend runtime |
| Node.js | 18+ (20 recommended) | Frontend runtime |
| PostgreSQL | 15 | Primary database |
| Redis | 7 | Cache and sessions |
| Weaviate | 1.24 | Vector database |
| Docker Desktop | latest | Container orchestration |

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/VELOX-STUDIO-26/A3-Summer-Competition-.git
cd "A3-Summer-Competition-"

# 2. Configure environment
cd a3-system
copy .env.template .env
# Edit .env and set OPENROUTER_API_KEY and SECRET_KEY

# 3. Start data services
docker-compose up -d postgres redis weaviate

# 4. Start backend
cd backend
python main.py

# 5. Start frontend (new terminal)
cd a3-system/frontend/web
npm install
npm run dev
```

Visit `http://localhost:3000` to access the application.

---

## 2. Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│              Next.js 16 • React • TypeScript                 │
│              Tailwind CSS • Framer Motion                    │
├─────────────────────────────────────────────────────────────┤
│                   APPLICATION LAYER                        │
│              FastAPI • JWT Auth • SSE Streaming              │
│              15+ Specialized Agents                          │
├─────────────────────────────────────────────────────────────┤
│                   INTELLIGENCE LAYER                       │
│    OpenRouter LLM • iFlytek Spark • RAG Engine              │
│    Weaviate Vector Search • Faithfulness Checker            │
├─────────────────────────────────────────────────────────────┤
│                      DATA LAYER                              │
│    PostgreSQL 15 • Redis 7 • Weaviate • Knowledge Graph    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Request** → Frontend (Next.js)
2. **API Routing** → FastAPI Routers
3. **Orchestrator** → Task decomposition
4. **Agent Execution** → Parallel agent dispatch
5. **RAG Retrieval** → Weaviate vector search
6. **LLM Generation** → OpenRouter/iFlytek
7. **Validation** → Faithfulness checker
8. **Response** → Streaming SSE to frontend

---

## 3. Backend API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create new account |
| POST | `/auth/login` | Authenticate user |
| POST | `/auth/logout` | End session |
| GET | `/auth/me` | Get current user |

### Profile Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/profile/chat` | Send profiling message |
| GET | `/profile` | Get learner profile |
| PUT | `/profile` | Update profile |
| GET | `/profile/gaps` | Get knowledge gaps |

### Resource Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/resources/generate` | Generate learning resources |
| GET | `/resources/{id}` | Get specific resource |
| GET | `/resources` | List user resources |

### Path Planning Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/path` | Get current learning path |
| POST | `/path/replan` | Request path replanning |
| GET | `/path/milestones` | Get milestone status |

### Tutor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tutor/chat` | Send tutoring message |
| GET | `/tutor/stream` | SSE streaming response |
| POST | `/tutor/voice` | Voice input processing |

### Quiz Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/quiz/{topic}` | Get quiz for topic |
| POST | `/quiz/submit` | Submit quiz answers |
| GET | `/quiz/results` | Get quiz history |

### Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/progress` | Learning progress |
| GET | `/analytics/engagement` | Engagement metrics |
| GET | `/analytics/weak-points` | Identified weak points |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health status |
| GET | `/docs` | Swagger API documentation |
| GET | `/redoc` | ReDoc API documentation |

---

## 4. Agent System

### Agent Architecture

```python
class BaseAgent:
    """Base class for all A3 agents."""
    
    def __init__(self, name, model_provider="openrouter"):
        self.name = name
        self.llm = get_llm_client(model_provider)
        self.faithfulness_checker = FaithfulnessChecker()
    
    async def execute(self, task, context):
        # 1. Retrieve relevant context
        rag_context = await self.retrieve_rag(task)
        
        # 2. Generate response
        response = await self.llm.generate(
            prompt=task,
            context=rag_context,
            profile=context.get("profile")
        )
        
        # 3. Validate output
        validated = await self.faithfulness_checker.verify(
            response, 
            rag_context
        )
        
        return validated
```

### Content Agents

#### Content Agent (Scholar)
- **Purpose**: Generate lecture notes and reading materials
- **Input**: Topic, learner profile, difficulty level
- **Output**: Markdown-formatted educational content
- **Tools**: RAG retrieval, LLM generation

#### Mind Map Agent (Mapper)
- **Purpose**: Create visual knowledge graphs
- **Input**: Topic, learning objectives
- **Output**: JSON graph data (rendered as SVG)
- **Tools**: Graph algorithms, SVG renderer

#### Quiz Agent (Sage)
- **Purpose**: Generate adaptive assessments
- **Input**: Topic, difficulty, question count
- **Output**: Structured Q&A with explanations
- **Tools**: Difficulty scorer, question bank

#### Media Agent (Director)
- **Purpose**: Create video-style explanations
- **Input**: Topic, script parameters
- **Output**: Video script + TTS narration
- **Tools**: Script generator, TTS engine

#### Code Agent (Architect)
- **Purpose**: Generate programming exercises
- **Input**: Programming topic, difficulty
- **Output**: Code template + test cases
- **Tools**: Judge0 sandbox, code validator

### System Agents

#### Orchestrator
- Coordinates all agent execution
- Manages task queues and dependencies
- Handles error recovery and retries

#### Path Planner
- Implements A* search algorithm
- Manages knowledge graph traversal
- Handles dynamic replanning

#### Tutor Engine
- Manages tutoring conversations
- Handles multimodal input/output
- Maintains rolling context window

#### Faithfulness Checker
- Validates AI-generated content
- Detects hallucinations
- Ensures factual accuracy

---

## 5. Database Schema

### Core Tables

#### Users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### Learner Profiles
```sql
CREATE TABLE learner_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    knowledge_base JSONB DEFAULT '{}',
    cognitive_style VARCHAR(50),
    weak_points JSONB DEFAULT '[]',
    goals JSONB DEFAULT '[]',
    learning_pace FLOAT DEFAULT 0.5,
    content_preferences JSONB DEFAULT '[]',
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Learning Paths
```sql
CREATE TABLE learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    current_node_id UUID,
    path_data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Milestones
```sql
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path_id UUID REFERENCES learning_paths(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    node_ids JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'locked',
    unlock_score FLOAT DEFAULT 0.7,
    completed_at TIMESTAMP
);
```

#### Resources
```sql
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Quiz Submissions
```sql
CREATE TABLE quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    quiz_id UUID NOT NULL,
    answers JSONB NOT NULL,
    score FLOAT,
    time_spent INTEGER,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tutor Sessions
```sql
CREATE TABLE tutor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    messages JSONB DEFAULT '[]',
    context_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Deployment Guide

### Docker Deployment

```bash
# Start all services
cd a3-system
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Scale backend
docker-compose up -d --scale backend=3
```

### Production Considerations

#### Environment Variables
```ini
# Required
OPENROUTER_API_KEY=sk-or-v1-...
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://...
WEAVIATE_URL=http://...

# Optional
OPENROUTER_API_KEY_FALLBACK=...
TTS_PROVIDER=edge
TTS_VOICE=zh-CN-XiaoxiaoNeural
MAX_PATH_NODES=25
CHUNK_SIZE=512
CHUNK_OVERLAP=50
```

#### SSL/TLS
```nginx
# Nginx reverse proxy configuration
server {
    listen 443 ssl;
    server_name veloxstudio.tech;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://frontend:3000;
    }
    
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Database Migrations
```bash
# Auto-migration on startup (default)
# Or manual:
cd a3-system/backend
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"
```

---

## 7. Configuration

### Backend Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENROUTER_API_KEY` | - | Required LLM API key |
| `OPENROUTER_MODEL` | meta-llama/llama-3.1-70b | Default LLM model |
| `DATABASE_URL` | postgresql+asyncpg://... | Database connection |
| `REDIS_URL` | redis://redis:6379/0 | Redis connection |
| `WEAVIATE_URL` | http://weaviate:8080 | Vector DB URL |
| `SECRET_KEY` | - | JWT signing key |
| `API_PORT` | 8000 | Backend port |
| `MAX_PATH_NODES` | 25 | A* planner cap |
| `CHUNK_SIZE` | 512 | RAG chunk size |
| `CHUNK_OVERLAP` | 50 | RAG chunk overlap |

### Frontend Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | http://localhost:8000 | Backend URL |
| `FRONTEND_PORT` | 3000 | Frontend port |

---

## 8. Troubleshooting

### Common Issues

#### Backend Connection Refused
```bash
# Check services are running
docker-compose ps

# Restart services
docker-compose restart backend

# Check logs
docker-compose logs backend
```

#### Database Migration Errors
```bash
# Reset database (WARNING: destroys data)
docker-compose down -v
docker-compose up -d postgres

# Run migrations manually
cd backend
python -c "from core.database_init import init_db; import asyncio; asyncio.run(init_db())"
```

#### LLM API Errors
- Verify `OPENROUTER_API_KEY` is set correctly
- Check API key has available credits
- Verify model ID is valid

#### Frontend Build Errors
```bash
cd frontend/web
rm -rf node_modules .next
npm install
npm run build
```

#### Vector Search Not Working
```bash
# Re-index knowledge base
cd backend
python -c "from rag.indexer import reindex_all; import asyncio; asyncio.run(reindex_all())"
```

---

## 9. Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style

- **Python**: PEP 8, Black formatter, max line length 100
- **TypeScript**: ESLint + Prettier, strict mode enabled
- **Commit messages**: Conventional commits format

### Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend/web
npm test

# Integration tests
pytest tests/integration/
```

---

## 10. FAQ

### General Questions

**Q: What makes A3 different from ChatGPT?**  
A: A3 uses 15+ specialized agents working together, with profile-aware personalization, RAG grounding, and adaptive learning paths. It's specifically designed for education.

**Q: Is A3 free to use?**  
A: Yes, the current competition version is free. Future versions may include premium features.

**Q: Can I self-host A3?**  
A: Yes! The entire stack is containerized with Docker Compose.

### Technical Questions

**Q: Which LLM models are supported?**  
A: Any OpenRouter model, plus iFlytek Spark LLM. The default is Llama 3.1 70B.

**Q: How does the RAG system work?**  
A: Documents are chunked, embedded via Spark/iFlytek embeddings, and stored in Weaviate. During generation, relevant chunks are retrieved and provided as context to the LLM.

**Q: Can I add my own knowledge base?**  
A: Yes! Place documents in `a3-system/data/` and run the reindex script.

**Q: How are agents coordinated?**  
A: The Orchestrator agent decomposes tasks and dispatches specialized agents in parallel, then aggregates results.

### Troubleshooting Questions

**Q: Why is resource generation slow?**  
A: Generation involves multiple LLM calls. Ensure your API key has good rate limits. Video generation is naturally slower than text.

**Q: How do I reset my learning path?**  
A: Contact support or use the API endpoint `POST /path/replan` with `reset=true`.

---

## Resources

- [API Documentation](http://localhost:8000/docs) (when running locally)
- [Project README](../README.md)
- [Changelog](CHANGELOG.md)
- [Security Policy](SECURITY.md)

## Support

For technical support: [theveloxstudio@gmail.com](mailto:theveloxstudio@gmail.com)

---

*Copyright © 2026 VELOX Studio. All rights reserved.*
