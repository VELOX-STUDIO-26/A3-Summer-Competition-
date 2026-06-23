# Defense PPT Outline

## NOBOGYAN - AI-Powered Personalized Learning Platform

**Track:** A3 (Personalized Resource Generation Multi-Agent System)  
**Team:** VELOX STUDIO  
**Date:** 2026-06-18

---

## Slide 1: Title Slide

- **Project Name:** NOBOGYAN
- **Team Name:** VELOX STUDIO
- **Track:** A3 - Personalized Resource Generation Multi-Agent System
- **Tagline:** "AI-native education that adapts to every learner"

---

## Slide 2: Research Questions & Objectives

**Central Question:** *Can autonomous AI agents deliver the personalization of a human tutor at the scale and cost of a MOOC?*

### Research Questions

1. **How can multi-agent orchestration adapt content to individual learner profiles in real time?**
   - Move beyond static courses toward dynamic, learner-driven experiences.

2. **Can AI-generated learning paths match human-curated curricula in structure and correctness?**
   - Guarantee prerequisite order, topic depth, and pedagogical coherence.

3. **How do we eliminate hallucinations in AI-generated educational content at scale?**
   - Use faithfulness verification and guardrails to protect learners.

4. **What closed-loop feedback architecture enables continuous personalization?**
   - Link assessment → profile → resources → path planning in real time.

### Objectives

| # | Objective | Outcome |
|---|-----------|---------|
| 1 | **Profile learners** via conversational AI | 6-dimension model (knowledge, goals, style, pace, context, preferences) |
| 2 | **Orchestrate agents** for resource generation | Parallel, profile-driven content creation with streaming progress |
| 3 | **Plan adaptive paths** over knowledge graphs | A* search generating dependency-valid learning sequences |
| 4 | **Deploy a real-time AI tutor** | Multimodal Q&A, code execution, and visual explanations |
| 5 | **Validate quality and performance** | 295+ tests, faithfulness scoring ≥0.85, 5.3x faster generation |

### Why It Matters

NOBOGYAN is not a content recommendation engine — it is an autonomous tutoring system that **understands the learner, plans the journey, generates the materials, answers questions, and improves with every interaction**.

**Competition Angle:** We are proving that AI agents can replace the judgment of a human tutor, not just the delivery of pre-recorded lectures.

---

## Slide 3: Problem Background & Industry Pain Points

### The Problem
- Traditional education: one-size-fits-all
- MOOCs: high dropout rates (90%+), no personalization
- Self-learning: scattered resources, no structured path
- Tutoring: expensive, not scalable

### Industry Pain Points
| Pain Point | Impact |
|------------|--------|
| Knowledge gaps | Students struggle with advanced topics |
| Wrong content format | Visual learners given text-only |
| No adaptive paths | Waste time on mastered topics |
| No feedback loop | Never learns from mistakes |
| Expensive tutoring | $50-100/hour for human tutors |

**Bottom Line:** Learners are forced to choose between cheap, impersonal content and expensive, hard-to-scale human tutoring — there is no middle ground.

---

## Slide 4: Overall System Architecture

**How it works in one line:** Learner profile → Agent orchestration → Generated resources → Adaptive path → Continuous feedback.

### Architecture Diagram
- 4-layer architecture (Presentation → Application → Intelligence → Data)
- 5 specialized agents + orchestrator
- RAG pipeline with Weaviate
- Feedback loop: Assessment → Profile → Resources → Path

### Key Components
1. **Conversational Profiling** → 6-dimension learner model
2. **Multi-Agent Resource Generation** → 5 parallel agents
3. **Adaptive Path Planning** → A* over knowledge graph
4. **Real-Time AI Tutor** → Multimodal Q&A
5. **Learning Analytics** → LLM-powered insights

---

## Slide 5: Core Technical Innovation

### Innovation 1: Orchestrator-Worker Multi-Agent Pattern
- Eliminates single massive prompt
- Profile-driven agent selection
- Parallel execution with semaphore
- Streaming SSE per-agent progress

### Innovation 2: Two-Pass Lazy Generation
- Pass 1: Milestones only (53s vs 283s)
- Pass 2: Subtopics on-demand
- **5.3x faster** time-to-first-render

### Innovation 3: Hallucination Guardrail Layer
- Faithfulness checker on every output
- Claim extraction + verification
- Score 0.0-1.0 with warning prepending

### Innovation 4: Closed Feedback Loop
- Assessment → Profile → Resources → Path
- Self-improving cycle
- Dynamic adaptation engine with cooldowns

---

## Slide 6: Demo Function Showcase

### Screenshots / Screen Recording Segments

1. **Conversational Profiling**
   - Chat interface with AI avatar
   - Real-time dimension progress bars
   - Profile summary with inline editing

2. **Learning Path Preview**
   - Visual path graph with milestones
   - Edit / skip / regenerate controls
   - Dependency-validated topic sequencing

3. **Notebook + AI Tutor**
   - Left: milestone panel
   - Center: resource cards (notes, mindmap, quiz, video, code)
   - Right: streaming AI tutor with Mermaid diagrams and voice input

4. **Quiz + Analytics**
   - Multiple choice, short answer, and code exercises
   - LLM grading and Judge0 sandbox
   - Radar chart mastery view + AI-generated insights

---

## Slide 7: Test Data & Performance Comparison

### Performance Benchmarks

| Metric | Target | Before | After | Improvement |
|--------|--------|--------|-------|-------------|
| Time to first render | < 60s | 282.9s | 53.1s | **5.3x** |
| Study-ready | < 90s | 282.9s | 71.6s | **4.0x** |
| Path generation | < 3s | - | 200ms | ✅ |
| Quiz grading | < 5s | ~10s | ~3s | **3.3x** |

### Quality Metrics

| Metric | Score |
|--------|-------|
| Faithfulness | 0.85-1.0 |
| Quiz relevance | 0.8-1.0 |
| Dependency satisfaction | 100% |
| Content moderation accuracy | ~98% |

### Test Coverage

| Component | Tests | Status |
|-----------|-------|--------|
| Path Planner | 17 | ✅ Passing |
| Adaptation Engine | 18 | ✅ Passing |
| Recommender | 14 | ✅ Passing |
| Conversation Manager | 27 | ✅ Passing |
| ASR Client | 22 | ✅ Passing |
| Analytics Insights | 9 | ✅ Passing |
| **Total** | **295+** | **✅** |

---

## Slide 8: Application Scenarios & Market Value

### Application Scenarios

1. **Self-Taught Developers**
   - Structured path from zero to job-ready
   - Personalized projects and exercises

2. **University Students**
   - Supplementary tutoring for difficult courses
   - Exam preparation with adaptive quizzes

3. **Career Switchers**
   - Conversational assessment of transferable skills
   - Targeted learning for new domain

4. **Corporate Training**
   - Role-specific learning paths
   - Progress tracking for managers

### Market Value

*Figures represent addressable market segments where adaptive AI tutoring creates clear differentiation.*

| Market Segment | Addressable Market | Value Proposition |
|----------------|-------------------|-------------------|
| EdTech | $400B+ | Differentiator vs static MOOCs |
| Corporate L&D | $350B+ | Adaptive upskilling per role |
| Tutoring | $100B+ | 24/7 AI tutor at fraction of cost |

---

## Slide 9: Team

**Team Name:** VELOX STUDIO

| Role | Responsibility |
|------|----------------|
| Project Lead | System architecture, competition strategy |
| Backend Lead | FastAPI, multi-agent orchestration, knowledge graph |
| Frontend Lead | Next.js UI/UX, real-time streaming, dashboard |
| AI/ML Lead | Prompt engineering, faithfulness guardrails, evaluation |
| QA/DevOps | Testing, deployment, benchmarking |

**Institution:** [Your institution]  
**Collective Strength:** End-to-end delivery — from learner-facing UI to agent orchestration and production deployment.

---

## Slide 10: Summary & Future Work

### Summary
NOBOGYAN delivers an autonomous AI tutoring system that:
- Builds a 6-dimensional learner profile through conversation
- Orchestrates 15+ specialized agents for parallel resource generation
- Plans adaptive paths with A* over knowledge graphs
- Closes the feedback loop between assessment, profiling, and content
- Proves quality through **295+ tests**, **5.3x faster generation**, and **faithfulness scores ≥0.85**

### Future Work
1. **True video generation** — integrate Wan2.1 for auto-generated lecture videos
2. **Teacher dashboard** — at-risk flags and class-level analytics
3. **Mobile app** — Uni-app cross-platform learner experience

### Closing

**We set out to answer:** *Can autonomous AI agents deliver the personalization of a human tutor at the scale and cost of a MOOC?*  
**NOBOGYAN is our proof.**

**Team:** VELOX STUDIO  
**Repository:** https://github.com/VELOX-STUDIO-26/A3-Summer-Competition-  
**Demo:** [Live demo link if available]

---

*Outline Version: 1.0 | Generated: 2026-06-18*
