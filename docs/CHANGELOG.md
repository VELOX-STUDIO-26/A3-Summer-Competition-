# Changelog

All notable changes to the A3 Personalized AI Learning System are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-20

### Added - Initial Release

#### Core Platform
- **Multi-Agent Architecture**: 15+ specialized AI agents working in coordination
- **Orchestrator Pattern**: Central agent for task delegation and coordination
- **FastAPI Backend**: High-performance async REST API with SSE streaming support
- **Next.js 16 Frontend**: Modern React app with App Router and Server Components
- **Docker Compose Setup**: Complete containerized development environment

#### Feature 1: Conversational Learner Profiling
- Natural language dialogue-based profile extraction
- Six-dimensional learner model:
  - Knowledge Base (per-topic scoring 0.0-1.0)
  - Cognitive Style (visual/verbal/kinesthetic/mixed)
  - Weak Points (gap identification)
  - Goals & Motivation
  - Learning Pace
  - Content Preferences
- Embedding-based gap detection using cosine similarity
- Dynamic profile updates with confidence-weighted averaging
- Chat-based onboarding UI

#### Feature 2: Multi-Agent Resource Generation
- **Content Agent**: Lecture notes and reading materials (Markdown/PDF)
- **Mind Map Agent**: Interactive visual knowledge graphs (JSON → SVG)
- **Quiz Agent**: Adaptive assessments with difficulty scoring
- **Media Agent**: Video scripts with TTS narration
- **Code Agent**: Programming exercises with Judge0 sandbox integration
- Parallel async generation (30-60s total)
- Streaming progress via SSE
- Faithfulness verification on every output
- Content moderation via iFlytek API

#### Feature 3: Adaptive Learning Path Planning
- A* search algorithm over knowledge graph
- Graph-based curriculum with prerequisite relationships
- 500+ cloud computing topics indexed
- Dynamic path replanning based on:
  - Quiz performance (<60% triggers remediation)
  - Completion time analysis
  - Engagement metrics
- Milestone-based progression with gates
- Content-based + collaborative filtering recommendations

#### Feature 4: Real-Time AI Tutoring
- Streaming SSE responses
- Multimodal input/output:
  - Text chat
  - Voice input (ASR via WebSocket)
  - Voice output (Edge-TTS + caching)
  - Image analysis (Vision LLM)
  - Auto-generated Mermaid diagrams
- RAG grounding with Weaviate vector database
- Rolling context window (8,000 tokens) with LLM summarization
- Profile-aware responses

#### Feature 5: Learning Assessment and Analytics
- Adaptive quiz difficulty based on mastery
- LLM-based short answer grading
- Code execution via Judge0 sandbox
- Gate-based milestone unlocking
- Behavioral signal tracking
- Comprehensive analytics dashboard
- Automatic remediation triggers

#### Infrastructure & Data
- **PostgreSQL 15**: Primary relational database
- **Redis 7**: Session caching and rate limiting
- **Weaviate 1.24**: Vector database for RAG
- Knowledge graph with 500+ nodes
- Embedding-based semantic search
- Docker orchestration with health checks
- pgAdmin integration for database inspection

#### Authentication & Security
- JWT-based authentication
- Secure password hashing
- Session management with Redis
- Input validation and sanitization
- Content safety filters

### Technical Stack

| Category | Technology |
|----------|------------|
| LLM Backend | OpenRouter (Llama 3.1 70B) / iFlytek Spark |
| Agent Framework | Custom orchestrator with LangChain patterns |
| Vector DB | Weaviate |
| Backend | FastAPI (Python 3.10+) |
| Frontend | Next.js 16, React, TypeScript |
| Database | PostgreSQL 15 + Redis 7 |
| TTS | Edge-TTS / iFlytek TTS SDK |
| ASR | iFlytek WebSocket |
| Deployment | Docker + Docker Compose |

## [0.9.0] - 2026-05-15

### Added
- Complete agent swarm visualization
- Interactive demo widget
- Landing page with swarm animations
- Performance optimizations for concurrent users

### Fixed
- Database connection pooling issues
- WebSocket reconnection handling
- Memory leaks in conversation manager

## [0.8.0] - 2026-05-10

### Added
- Vision LLM integration for image analysis
- Mermaid diagram auto-generation
- Voice chat capabilities
- Enhanced TTS caching

### Changed
- Improved path planning algorithm with PageRank heuristics
- Optimized RAG chunking strategy

## [0.7.0] - 2026-05-05

### Added
- Analytics dashboard
- Behavioral tracking
- Gate agent for milestone validation
- Evaluator agent for performance analysis

### Fixed
- Quiz generation JSON truncation issues
- Profile update race conditions

## [0.6.0] - 2026-04-28

### Added
- Code execution sandbox (Judge0)
- Coding exercise generation
- Coding grader agent

### Changed
- Enhanced faithfulness checker accuracy
- Improved content moderation pipeline

## [0.5.0] - 2026-04-20

### Added
- Video generation pipeline
- Media agent with TTS integration
- Faithfulness checker layer

## [0.4.0] - 2026-04-15

### Added
- Mind map generation (SVG)
- Interactive knowledge graph visualization
- Quiz agent with difficulty scoring

## [0.3.0] - 2026-04-10

### Added
- Path planning algorithm (A* search)
- Milestone management
- Recommendation engine

## [0.2.0] - 2026-04-05

### Added
- Content agent for lecture notes
- Profile extraction pipeline
- Gap detection via embeddings

## [0.1.0] - 2026-04-01

### Added
- Project scaffolding
- Docker compose setup
- Basic FastAPI structure
- Next.js frontend foundation

---

## Future Roadmap

### Planned for v1.1.0
- Mobile app (React Native)
- Offline mode support
- Advanced analytics with ML predictions
- Teacher dashboard
- Content authoring tools

### Planned for v1.2.0
- Multi-language support
- Integration with LMS platforms
- Advanced collaboration features
- White-label options

---

## Contributing

When adding changes:
1. Add entries under the `[Unreleased]` section
2. Use categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`
3. Reference issue/PR numbers when applicable

## Contact

For questions about the changelog: [theveloxstudio@gmail.com](mailto:theveloxstudio@gmail.com)
