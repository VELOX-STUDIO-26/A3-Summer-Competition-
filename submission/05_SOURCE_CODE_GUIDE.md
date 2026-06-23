# Source Code Package Guide

## NOBOGYAN - Complete Source Code

**Version:** 1.0  
**Date:** 2026-06-18  
**Team:** VELOX STUDIO

---

## Directory Structure

```
A3-Summer-Competition/
├── a3-system/
│   ├── backend/                          # FastAPI backend
│   │   ├── agents/                        # 15+ AI agents
│   │   │   ├── orchestrator.py          # Main orchestrator
│   │   │   ├── content_agent.py           # Markdown notes
│   │   │   ├── quiz_agent.py             # Adaptive quizzes
│   │   │   ├── mindmap_agent.py           # 21-node mind maps
│   │   │   ├── media_agent.py             # Slides + TTS
│   │   │   ├── code_agent.py              # 3-tier exercises
│   │   │   ├── gate_agent.py             # Milestone scoring
│   │   │   ├── evaluator_agent.py         # Post-quiz analysis
│   │   │   ├── coding_grader.py           # Code grading
│   │   │   ├── short_answer_grader.py     # LLM grading
│   │   │   ├── path_planner.py            # A* algorithm
│   │   │   ├── knowledge_graph_generator.py  # Dynamic graphs
│   │   │   └── hierarchical_graph_generator.py # Hierarchical graphs
│   │   ├── api/                           # FastAPI routers
│   │   │   └── routers/
│   │   │       ├── chat.py                # Profiling chat
│   │   │       ├── resources.py           # Resource generation
│   │   │       ├── path.py                # Path planning
│   │   │       ├── milestone.py           # Milestone tracking
│   │   │       ├── tutor.py               # AI tutor
│   │   │       ├── quiz.py                # Quiz taking
│   │   │       ├── analytics.py           # Analytics
│   │   │       └── adaptation.py          # Dynamic adaptation
│   │   ├── core/                          # Core services
│   │   │   ├── llm_client.py              # Kimi/OpenRouter client
│   │   │   ├── tutor_engine.py            # Tutor logic
│   │   │   ├── faithfulness_checker.py    # Hallucination guard
│   │   │   ├── tts_client.py              # TTS engine
│   │   │   ├── asr_client.py              # ASR (iFlytek)
│   │   │   ├── vision_llm_client.py       # Image analysis
│   │   │   ├── content_moderator.py       # Content filtering
│   │   │   ├── judge0_client.py           # Code sandbox
│   │   │   └── conversation_manager.py    # Context management
│   │   ├── nlp/                           # NLP pipeline
│   │   │   ├── profile_extractor.py       # 6-dimension extraction
│   │   │   ├── session_manager.py         # Session state
│   │   │   └── gap_detector.py           # Embedding gap detection
│   │   ├── rag/                           # RAG pipeline
│   │   │   ├── indexer.py               # Document indexing
│   │   │   └── vector_store.py           # Weaviate/Chroma
│   │   ├── analytics/                     # Analytics engine
│   │   │   ├── analytics_engine.py        # LLM insights
│   │   │   └── comparative_analytics.py # Peer comparison
│   │   ├── adaptation/                    # Dynamic adaptation
│   │   │   ├── engine.py                # Event-driven engine
│   │   │   └── recommender.py           # Hybrid recommender
│   │   ├── models/                        # Database models
│   │   │   └── database.py               # SQLAlchemy models
│   │   ├── tests/                         # Test suite (295+)
│   │   ├── data/                          # Knowledge bases
│   │   │   ├── knowledge_graph_en.json   # Cloud Computing graph
│   │   │   ├── expert_corpus.json        # Expert answers
│   │   │   └── moderation_rules.json     # Content rules
│   │   ├── main.py                        # FastAPI entry point
│   │   ├── requirements.txt               # Python dependencies
│   │   ├── Dockerfile                     # Backend container
│   │   └── docker-compose.yml            # Infrastructure
│   └── frontend/                          # Next.js frontend
│       └── web/
│           ├── src/
│           │   ├── app/                  # App router pages
│           │   │   ├── (dashboard)/       # Dashboard pages
│           │   │   │   ├── notebook/      # Main learning view
│           │   │   │   ├── analytics/     # Analytics dashboard
│           │   │   │   ├── quiz/          # Quiz taking
│           │   │   │   └── new-path/      # Path generation
│           │   │   ├── (onboarding)/      # Onboarding flow
│           │   │   │   ├── profile-chat/  # Conversational profiling
│           │   │   │   └── profile-summary/ # Profile review
│           │   │   └── (auth)/            # Auth pages
│           │   │       ├── login/
│           │   │       └── register/
│           │   ├── components/            # Reusable components
│           │   │   ├── notebook/          # Notebook-specific
│           │   │   ├── mindmap/           # Interactive mind map
│           │   │   ├── video/             # Lecture player
│           │   │   ├── code/              # Code exercise
│           │   │   ├── tutor/             # Tutor components
│           │   │   └── milestone/         # Milestone UI
│           │   ├── hooks/                 # Custom hooks
│           │   ├── lib/                   # Utilities
│           │   └── types/                 # TypeScript types
│           ├── public/                    # Static assets
│           ├── package.json               # Node dependencies
│           └── next.config.js             # Next.js config
├── AI_CONTEXT/                            # Project documentation
│   └── docs/
│       ├── PROJECT_STATUS.md              # Current status
│       ├── GAP_ANALYSIS.md               # Feature gaps
│       ├── officialdoc.md                # Official spec
│       ├── FEATURE_01_PROFILING.md       # Feature 1 docs
│       ├── FEATURE_02_RESOURCE_GENERATION.md
│       ├── FEATURE_03_PATH_PLANNING.md
│       ├── FEATURE_04_AI_TUTORING.md
│       ├── FEATURE_05_ANALYTICS.md
│       └── CHANGELOG.md                   # Change log
├── submission/                          # Competition submission
│   ├── 01_PROJECT_DESIGN_SPEC.md
│   ├── 02_DEPLOYMENT_MANUAL.md
│   ├── 03_TEAM_INFO.md
│   ├── 04_DEFENSE_PPT_OUTLINE.md
│   ├── 05_SOURCE_CODE_GUIDE.md
│   ├── 06_DEMO_VIDEO_SCRIPT.md
│   ├── 07_OPTIONAL_MATERIALS.md
│   ├── 08_FINAL_ROUND_PREP.md
│   ├── 09_TRACK_A3_EXTRA.md
│   └── README.md
└── README.md                              # Main project README
```

---

## README.md (English + Chinese)

### English

```markdown
# NOBOGYAN - AI-Powered Personalized Learning Platform

## Overview
NOBOGYAN is an AI-native personalized education platform that replaces the traditional "one-size-fits-all" curriculum with a dynamic, data-driven approach. It customizes every resource, learning path, and tutoring interaction for each individual student.

## Key Features
1. **Conversational Learner Profiling** - 6-dimension model from chat
2. **Multi-Agent Resource Generation** - 5 specialized agents in parallel
3. **Adaptive Learning Path Planning** - A* over knowledge graph
4. **Real-Time AI Tutoring** - Multimodal Q&A with streaming
5. **Learning Assessment & Analytics** - LLM-powered insights

## Tech Stack
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** FastAPI (Python), PostgreSQL, Redis
- **AI:** Kimi k2.6 (Moonshot), Multi-agent orchestration
- **Auth:** Firebase
- **Deployment:** Docker Compose

## Quick Start
1. Clone: `git clone https://github.com/VELOX-STUDIO-26/A3-Summer-Competition-.git`
2. Backend: `cd a3-system/backend && pip install -r requirements.txt && uvicorn main:app`
3. Frontend: `cd a3-system/frontend/web && npm install && npm run dev`
4. Infrastructure: `docker-compose up -d`

## Documentation
See `AI_CONTEXT/docs/` for detailed feature documentation.
```

### 中文

```markdown
# NOBOGYAN - AI驱动的个性化学习平台

## 概述
NOBOGYAN是一个AI原生的个性化教育平台，将传统的"一刀切"课程替换为动态、数据驱动的方法。它为每个学习者定制资源、学习路径和辅导交互。

## 核心功能
1. **对话式学习者画像** - 从聊天中提取6维模型
2. **多智能体资源生成** - 5个专用智能体并行工作
3. **自适应学习路径规划** - 知识图谱上的A*算法
4. **实时AI辅导** - 支持流式传输的多模态问答
5. **学习评估与分析** - LLM驱动的洞察

## 技术栈
- **前端:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **后端:** FastAPI (Python), PostgreSQL, Redis
- **AI:** Kimi k2.6 (Moonshot), 多智能体编排
- **认证:** Firebase
- **部署:** Docker Compose

## 快速开始
1. 克隆: `git clone https://github.com/VELOX-STUDIO-26/A3-Summer-Competition-.git`
2. 后端: `cd a3-system/backend && pip install -r requirements.txt && uvicorn main:app`
3. 前端: `cd a3-system/frontend/web && npm install && npm run dev`
4. 基础设施: `docker-compose up -d`
```

---

## Dependency Configuration Files

### Python (requirements.txt)

```
fastapi>=0.104.0
uvicorn>=0.24.0
sqlalchemy>=2.0.0
alembic>=1.12.0
psycopg2-binary>=2.9.0
redis>=5.0.0
httpx>=0.25.0
websockets>=12.0
pydantic>=2.0.0
python-jose>=3.3.0
passlib>=1.7.0
python-multipart>=0.0.6
pytest>=7.4.0
pytest-asyncio>=0.21.0
```

### Node.js (package.json)

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.0.0",
    "framer-motion": "^11.0.0",
    "recharts": "^2.0.0",
    "zustand": "^4.0.0"
  }
}
```

---

## Auxiliary Files

### Prompt Templates
- `backend/agents/prompts/` - Agent-specific LLM prompts
- `backend/nlp/prompts/` - Profiling extraction prompts

### Vector Database
- `data/knowledge_graph_en.json` - Cloud Computing knowledge graph
- `data/expert_corpus.json` - Expert answer corpus

### Test Scripts
- `backend/tests/` - 295+ unit tests
- `scripts/test_generate_quiz.py` - Quiz generation test
- `scripts/create_test_student.py` - Test data creation

---

*Document Version: 1.0 | Generated: 2026-06-18*
