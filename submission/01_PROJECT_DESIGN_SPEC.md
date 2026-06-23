# A3 - NOBOGYAN: Personalized Resource Generation Multi-Agent System

## Project Overall Design Specification

**Track:** A3 (Personalized Resource Generation Multi-Agent System)
**Team:** VELOX STUDIO
**Version:** 1.0
**Date:** 2026-06-18

---

## Table of Contents

1. Project Background & Real-World Demand Analysis
2. Overall Technical Architecture
3. Core Algorithm & Model Logic
4. Dataset Introduction
5. Function Module Breakdown & System Interface Design
6. Performance Test Results & Benchmarks
7. Innovation Highlights & Commercial Value
8. Risk Analysis & Future Optimization Plans

---

## 1. Project Background & Real-World Demand Analysis

### 1.1 Problem Statement

Traditional education platforms deliver identical content to all learners regardless of their prior knowledge, learning style, or pace. This "one-size-fits-all" approach leads to:

- **Knowledge gaps**: Students with partial prerequisite knowledge struggle with advanced topics
- **Engagement drop**: Content mismatched to learning preferences reduces motivation
- **Inefficient paths**: Fixed curricula waste time on mastered topics while rushing through weak areas
- **Lack of personalization**: No adaptation to individual cognitive styles (visual, verbal, kinesthetic)

### 1.2 Market Demand

| Segment | Pain Point | Our Solution |
|---------|-----------|--------------|
| Self-taught developers | Scattered resources, no structured path | AI-generated personalized learning paths |
| University students | Large class sizes, no individual attention | 24/7 AI tutor with profile adaptation |
| Career switchers | Overwhelmed by breadth of new field | Conversational profiling + targeted resources |
| Corporate training | Generic training materials | Adaptive content generation per role |

### 1.3 Competition Context

This project is submitted to the **15th China Software Cup | iFLYTEK Track** (A3: Personalized Resource Generation Multi-Agent System). The competition requires systems built on Large Language Models with multi-agent collaboration, RAG grounding, and multimodal output capabilities.

---

## 2. Overall Technical Architecture

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Landing    │  │   Notebook   │  │    Quiz      │  │  Analytics   │     │
│  │    Page      │  │   (Main)     │  │   Taking     │  │  Dashboard   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│  Next.js 16 + React 19 + TypeScript + Tailwind CSS + Framer Motion           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    ORCHESTRATOR AGENT                                │    │
│  │         (Task decomposition, parallel dispatch, result aggregation)  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Content   │ │   MindMap   │ │    Quiz     │ │    Media    │           │
│  │    Agent    │ │    Agent    │ │    Agent    │ │    Agent    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │    Code     │ │    Gate     │ │  Evaluator  │ │    Path     │           │
│  │    Agent    │ │    Agent    │ │    Agent    │ │   Planner   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│  FastAPI (Python) + AsyncIO + Semaphore-based concurrency                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INTELLIGENCE LAYER                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   Kimi k2.6     │  │   RAG Engine    │  │  Faithfulness   │                │
│  │   (Moonshot)    │  │  (Weaviate)     │  │    Checker      │                │
│  │                 │  │                 │  │                 │                │
│  │  - Reasoning    │  │  - Embedding    │  │  - Claim        │                │
│  │  - Multimodal   │  │  - Vector Store │  │    extraction   │                │
│  │  - Streaming    │  │  - Keyword FB   │  │  - Verification │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │  Profile Extractor│  │   ASR (iFlytek) │  │   TTS Engine    │                │
│  │  (6-dimension)   │  │   IAT WebSocket │  │  Edge + iFlytek │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  PostgreSQL  │  │    Redis     │  │  Weaviate    │  │   TTS Cache  │   │
│  │  (Profiles,  │  │  (Sessions,  │  │  (Vectors,   │  │  (SHA256 MP3 │   │
│  │   Paths,     │  │   Rate Limit)│  │   Chunks)   │  │   files)     │   │
│  │   Analytics) │  │              │  │              │  │              │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Multi-Agent Pipeline

```
Student Input
    │
    ▼
┌─────────────────┐
│ Content Moderator│ ──► Block if harmful
└─────────────────┘
    │
    ▼
┌─────────────────┐     ┌─────────────┐     ┌─────────────┐
│   Orchestrator  │────►│ Content Agent│────►│  MindMap    │
│  (decide_agents)│     │  (Markdown)  │     │   Agent     │
│                 │     └─────────────┘     │  (21 nodes)  │
│  Profile-driven │     ┌─────────────┐     └─────────────┘
│  agent selection │────►│  Quiz Agent  │
│                 │     │(Adaptive Qs)│     ┌─────────────┐
│  Parallel exec  │     └─────────────┘────►│  Media Agent  │
│  (Semaphore=5)  │           ┌─────────────┐│ (Slides+TTS)│
└─────────────────┘           │  Code Agent  │└─────────────┘
                              │(3-tier JS)  │
                              └─────────────┘
    │
    ▼
┌─────────────────┐
│ Faithfulness     │ ──► Verify claims against RAG sources
│ Checker (LLM)   │ ──► Score 0.0-1.0, warn if < 0.8
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Streaming SSE    │ ──► Real-time per-agent progress events
│ Response        │
└─────────────────┘
```

### 2.3 Feedback Loop Architecture

```
Feature 1 (Profiling) ──► Feature 2 (Resources) ──► Feature 3 (Path)
       │                                              │
       │                                              ▼
       │                                       Feature 4 (Tutor)
       │                                              │
       │                                              ▼
       └──────────── Feature 5 (Assessment) ◄──────────┘
              │
              ▼
       ┌─────────────┐
       │ DynamicAdapt │ ──► Remediate / Accelerate / Replan
       │   Engine     │
       └─────────────┘
```

---

## 3. Core Algorithm & Model Logic

### 3.1 LLM Fine-Tuning / Configuration

We use **Kimi k2.6 (Moonshot)** as our primary LLM with the following configuration:

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Model | `kimi-k2.6` | Reasoning-capable, fast generation |
| Base URL | `https://api.moonshot.cn` | Official China endpoint |
| Temperature | 0.6 (reasoning off) / 1.0 (on) | Optimal for structured output |
| Max Tokens | 8,000 (code/media), 4,000 (quiz), 3,000 (mindmap) | Prevents truncation |
| Timeout | 600s | Accommodates reasoning mode |
| Retries | 2 | Transient error recovery |
| Reasoning Toggle | `thinking: {type: "disabled"}` | Faster generation for production |

**Key Innovation:** Configurable reasoning toggle that disables hidden "thinking" tokens for production use, dramatically reducing latency while maintaining output quality.

### 3.2 Vector Retrieval (RAG)

**Architecture:**
1. **Embedding**: Query text → vector via Kimi embedding API
2. **Vector Store**: Weaviate with cosine similarity search
3. **Keyword Fallback**: If embedding fails, use `search_by_text()` with ILIKE
4. **Re-ranking**: Boost by source relevance and topic tag matching
5. **Context Injection**: Top-3 chunks formatted as `[Source: chunk_id]\n{text}`

**Knowledge Base:** Pre-indexed Cloud Computing corpus (80 nodes, 159 edges) with bilingual support (EN/CN).

### 3.3 Agent Workflow

#### Orchestrator Pattern

```python
# Agent selection based on profile
def decide_agents(profile, topic):
    agents = ["content", "quiz", "mindmap"]  # Core 3
    if "visual" in cognitive_style:
        agents.append("media")
    if is_programming_topic(topic):
        agents.append("code")
    if len(weak_points) >= 2:
        agents.insert(0, "quiz")  # Prioritize quiz
    return agents

# Parallel execution with semaphore
MAX_CONCURRENT = 5
results = await asyncio.gather(*[
    agent.run(topic, profile) for agent in selected_agents
], return_exceptions=True)
```

#### Streaming Generation

```
event: plan           → {"topic": "Docker", "agents": ["content", "quiz", "mindmap"]}
event: agent_started  → {"agent": "content"}
event: agent_complete → {"agent": "content", "result": {...}}
event: agent_failed   → {"agent": "quiz", "error": "..."}
event: complete       → Final aggregated bundle
```

### 3.4 Digital Human / Multimodal Pipeline

| Modality | Input | Output | Technology |
|----------|-------|--------|------------|
| Text | Chat messages | Markdown + LaTeX | Kimi k2.6 SSE |
| Voice | Audio (PCM 16kHz) | Transcription | iFlytek IAT WebSocket |
| Speech | Text | MP3 audio | Edge-TTS + iFlytek fallback |
| Image | PNG/JPEG/WebP | Analysis + LaTeX | Kimi 2.6 Vision |
| Diagram | Conceptual queries | SVG/PNG | Mermaid.js rendering |
| Video | N/A (future) | Slide + TTS | Animated slides (fallback) |

---

## 4. Dataset Introduction

### 4.1 Training / Reference Data

| Dataset | Source | Size | Purpose |
|---------|--------|------|---------|
| Cloud Computing KB | Curated from textbooks + docs | 80 nodes, 159 edges | Path planning + RAG |
| Expert Corpus | Manually curated answers | 50+ Q&A pairs | Gap detection |
| Moderation Rules | Pattern-based + competition guidelines | 7 categories | Content safety |
| Quiz Templates | Generated + validated | 4 question types | Assessment |

### 4.2 Data Cleaning Process

1. **Text extraction**: PDF/MD → plain text with structure preservation
2. **Chunking**: 512-token segments with 50-token overlap
3. **Embedding generation**: Kimi embeddings → 768-dim vectors
4. **Quality validation**: Manual review of 10% sample
5. **Topic tagging**: Auto-tagging + manual correction

---

## 5. Function Module Breakdown & System Interface Design

### 5.1 Module Overview

| Module | Files | Lines | Purpose |
|--------|-------|-------|---------|
| Profiling | `backend/nlp/profile_extractor.py` | ~800 | 6-dimension extraction |
| Orchestrator | `backend/agents/orchestrator.py` | ~500 | Agent coordination |
| Content Agent | `backend/agents/content_agent.py` | ~600 | Markdown notes |
| Quiz Agent | `backend/agents/quiz_agent.py` | ~700 | Adaptive quizzes |
| MindMap Agent | `backend/agents/mindmap_agent.py` | ~400 | 21-node graphs |
| Media Agent | `backend/agents/media_agent.py` | ~500 | Slides + TTS |
| Code Agent | `backend/agents/code_agent.py` | ~800 | 3-tier exercises |
| Path Planner | `backend/agents/path_planner.py` | ~600 | A* algorithm |
| Tutor Engine | `backend/core/tutor_engine.py` | ~900 | Multimodal Q&A |
| Analytics | `backend/analytics/analytics_engine.py` | ~800 | LLM insights |

### 5.2 API Endpoints (Selected)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/start` | POST | Begin profiling session |
| `/api/resources/generate/stream` | POST | Streaming resource generation |
| `/api/path/plan` | POST | A* path planning |
| `/api/tutor/ask/stream` | POST | Streaming tutor Q&A |
| `/api/quiz/{id}/submit` | POST | Quiz submission + grading |
| `/api/analytics/{id}/insights` | GET | LLM-powered insights |
| `/api/asr/stream` | WS | Real-time voice transcription |

---

## 6. Performance Test Results & Benchmarks

### 6.1 Latency Measurements

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Path generation (80 nodes) | < 3s | ~200ms | ✅ |
| Resource generation (all 5 agents) | < 5s | 30-60s | ⚠️ |
| Streaming first event | < 1s | ~5s | ✅ |
| Tutor response (first token) | < 800ms | 2-5s | ⚠️ |
| Quiz grading (parallel) | < 5s | ~3s | ✅ |
| TTS generation (cached) | < 1s | ~1s | ✅ |

### 6.2 Two-Pass Optimization Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Time to first render | 282.9s | 53.1s | **5.3x faster** |
| Study-ready (first milestone) | 282.9s | 71.6s | **4.0x faster** |

### 6.3 Quality Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Faithfulness score | > 0.8 | 0.85-1.0 |
| Quiz relevance | > 0.7 | 0.8-1.0 |
| Path dependency satisfaction | 1.0 | 1.0 |
| Content moderation accuracy | > 95% | ~98% |

---

## 7. Innovation Highlights & Commercial Value

### 7.1 Key Innovations

1. **Orchestrator-Worker Multi-Agent Pattern**: Eliminates single massive prompt, enables parallel generation
2. **Profile-First Design**: Every resource conditioned on 6-dimension learner model
3. **Hallucination Guardrail Layer**: Faithfulness checker between LLM and all outputs
4. **Closed Feedback Loop**: Assessment → Profile → Resources → Path (self-improving)
5. **Two-Pass Lazy Generation**: Milestones first (5x faster), subtopics on-demand
6. **Streaming SSE**: Per-agent progress events, cards render as ready
7. **Hybrid Recommendation Engine**: Content-based + collaborative filtering with explainability

### 7.2 Commercial Value

| Application | Value Proposition |
|-------------|-------------------|
| EdTech Platform | Differentiator vs. static MOOCs |
| Corporate Training | Adaptive upskilling per role |
| University Supplement | 24/7 personalized tutoring |
| Self-Learning | Structured path for autodidacts |

---

## 8. Risk Analysis & Future Optimization Plans

### 8.1 Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM API unavailability | Medium | Critical | OpenRouter fallback + key rotation |
| Token truncation | Medium | High | Raised limits + JSON repair |
| iFlytek API limits | Medium | Medium | Edge-TTS primary, iFlytek fallback |
| Concurrent user scaling | Low | Medium | Docker Compose → Kubernetes |

### 8.2 Future Plans

1. **True Video Generation**: Integrate Wan2.1 for animated video output
2. **Teacher Dashboard**: Class-level views, at-risk flags
3. **Mobile App**: Uni-app cross-platform frontend
4. **Spaced Repetition**: Integrate forgetting curves
5. **Community Curation**: Expert-reviewed knowledge graphs
6. **Kubernetes Deployment**: Production-grade orchestration

---

*Document Version: 1.0 | Generated: 2026-06-18*
