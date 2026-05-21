# About A3 Learning System

## Mission

A3 is an AI-native personalized education platform that replaces the traditional "one-size-fits-all" curriculum with a dynamic, data-driven approach. Every resource, learning path, and tutoring interaction is customized for each individual student.

Built for the **15th China Software Cup** (iFlytek Track), A3 demonstrates how multi-agent AI systems can transform higher education through intelligent orchestration and continuous adaptation.

---

## The Story

Traditional learning platforms deliver identical content to every student, regardless of their prior knowledge, learning style, or goals. This leads to:
- **Boredom** for advanced learners covering known material
- **Frustration** for struggling learners skipping foundational concepts
- **Inefficiency** with static curricula that can't adapt

A3 was born from a simple question: *What if we could build a system where 15+ AI agents collaborate in real-time to create a unique learning experience for every student?*

The result is a swarm of specialized agents—each with unique capabilities—that work together to profile, plan, tutor, and assess learners continuously.

---

## Technology Architecture

### The Agent Swarm

A3 deploys 15+ specialized agents organized into two categories:

**Content Generation Agents** (The Creators)
- **Scholar** - Lecture notes and reading materials
- **Mapper** - Interactive mind maps and knowledge graphs
- **Sage** - Adaptive quizzes and assessments
- **Director** - Video scripts with narration
- **Architect** - Programming exercises and code challenges

**System Intelligence Agents** (The Coordinators)
- **Orchestrator** - Task delegation and coordination
- **Tutor Engine** - Real-time Q&A and explanations
- **Path Planner** - A* algorithm for optimal learning paths
- **Recommender** - Content-based and collaborative filtering
- **Faithfulness Checker** - Hallucination detection
- **Gate Agent** - Milestone validation and unlocking
- **Evaluator** - Performance analysis and insights
- **Profile Extractor** - Learning profile inference
- **Gap Detector** - Knowledge gap identification
- **Vision LLM** - Image and diagram analysis
- **Voice Agents** - ASR and TTS processing

### Core Innovation: The Orchestrator Pattern

Unlike single-prompt AI systems, A3 uses a coordinating agent that:
1. Analyzes the learner's profile and current context
2. Decomposes requests into sub-tasks
3. Dispatches specialized agents in parallel
4. Aggregates and validates outputs
5. Delivers a cohesive, multi-format response

This pattern eliminates reliance on massive prompts and enables true multi-modal generation.

---

## Key Features

| Feature | Description | Innovation |
|---------|-------------|------------|
| **Conversational Profiling** | Extracts 6-dimension learner profiles through natural chat | No forms or explicit questionnaires |
| **Multi-Agent Generation** | 5 agents generate notes, mind maps, quizzes, video, code simultaneously | Parallel async with faithfulness checks |
| **Adaptive Path Planning** | A* search over knowledge graphs with real-time replanning | Dynamic based on performance signals |
| **Multimodal Tutoring** | Text, voice, image, and diagram support in one interface | Streaming SSE with context management |
| **Assessment & Analytics** | LLM-based evaluation with automatic remediation triggers | Closed-loop feedback to profiling |

---

## Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│              Next.js 16 • React • TypeScript                 │
├─────────────────────────────────────────────────────────────┤
│                   APPLICATION LAYER                        │
│              Orchestrator • API Routers • Auth               │
├─────────────────────────────────────────────────────────────┤
│                   INTELLIGENCE LAYER                       │
│    15+ Agents • Spark LLM • RAG Engine • Vector Search      │
├─────────────────────────────────────────────────────────────┤
│                      DATA LAYER                              │
│    PostgreSQL 15 • Redis 7 • Weaviate • Knowledge Graph    │
└─────────────────────────────────────────────────────────────┘
```

### Performance Metrics

| Metric | Target | Achieved |
|----------|--------|----------|
| Time to First Token | <800ms | ✅ |
| Resource Generation (Text) | <5s | ✅ |
| Resource Generation (Video) | <30s | ✅ |
| Profile Update Latency | <2s | ✅ |
| Path Replanning | <3s | ✅ |
| Concurrent Users | 50+ | ✅ |

---

## Team

**VELOX Studio**

A team dedicated to building intelligent educational technology that adapts to each learner's unique needs.

- **Location**: Competition submission
- **Founded**: 2026
- **Focus**: AI-powered adaptive learning systems
- **Contact**: [theveloxstudio@gmail.com](mailto:theveloxstudio@gmail.com)
- **Website**: [veloxstudio.tech](https://veloxstudio.tech)

---

## Competition Recognition

### 15th China Software Cup
- **Track**: A3 (iFlytek)
- **Status**: Competition submission
- **Alignment**:
  - **Innovation & Value (35%)**: Novel orchestrator-worker model with closed-loop feedback
  - **Functionality Depth (45%)**: All 5 mandatory modules with multi-format media generation
  - **Documentation Quality (10%)**: Comprehensive technical specification
  - **Demo Video (10%)**: 7-minute feature showcase

---

## Research Foundation

A3 is built on established research in:
- **Adaptive Learning Systems** - Personalized curriculum sequencing
- **Multi-Agent AI** - Collaborative agent architectures
- **RAG (Retrieval-Augmented Generation)** - Grounded content generation
- **Knowledge Graphs** - Structured curriculum representation
- **A* Search Algorithms** - Optimal path planning

---

## Open Source

A3 is released under the **MIT License**.

We believe in open educational technology. Our code is available for:
- Educational institutions seeking adaptive learning platforms
- Researchers studying multi-agent AI systems
- Developers building educational applications
- Students learning about AI system architecture

---

## Connect With Us

- **Website**: [veloxstudio.tech](https://veloxstudio.tech)
- **Email**: [theveloxstudio@gmail.com](mailto:theveloxstudio@gmail.com)
- **GitHub**: [github.com/VELOX-STUDIO-26](https://github.com/VELOX-STUDIO-26)

---

*"An entire AI team, learning with you."*
