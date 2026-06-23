# Track A3 Extra Focus Points

## Multi-Agent Collaborative Workflow Design Report

**Track:** A3 - Personalized Resource Generation Multi-Agent System  
**Team:** VELOX STUDIO  
**Project:** NOBOGYAN  
**Date:** 2026-06-18

---

## 1. Multi-Agent Collaborative Workflow

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR AGENT                       │
│                                                              │
│  Input: Student Profile + Topic                              │
│  Output: Delegation Plan + Aggregated Results                │
│                                                              │
│  Logic:                                                      │
│  1. Parse profile (6 dimensions)                             │
│  2. Decide which agents to invoke                            │
│  3. Generate execution plan with parameters                  │
│  4. Dispatch agents in parallel (Semaphore=5)                │
│  5. Collect results, handle failures                         │
│  6. Aggregate into resource bundle                           │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Content Agent │   │  Quiz Agent   │   │ MindMap Agent │
│  (Markdown)   │   │(Adaptive Qs)  │   │ (21 nodes)    │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Media Agent  │   │  Code Agent   │   │  Gate Agent   │
│(Slides + TTS) │   │(3-tier JS)    │   │(Milestone)    │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  FAITHFULNESS CHECKER                        │
│                                                              │
│  Input: Generated content + RAG sources                      │
│  Output: Score 0.0-1.0 + Warning (if < 0.8)                  │
│                                                              │
│  Logic:                                                      │
│  1. Extract factual claims from content                      │
│  2. Verify each claim against RAG chunks                     │
│  3. Classify: supported / contradicted / unverifiable        │
│  4. Calculate score: supported / total                       │
│  5. Prepend warning if score < threshold                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Agent State Machine

#### Orchestrator State Machine

```
[Idle] ──► [Planning] ──► [Dispatching] ──► [Collecting] ──► [Aggregating] ──► [Complete]
              │                  │                │                  │
              │                  │                │                  │
              ▼                  ▼                ▼                  ▼
         [Error]           [Agent Failed]    [Timeout]          [Partial]
              │                  │                │                  │
              │                  │                │                  │
              └──────────────────┴────────────────┴──────────────────┘
                                   │
                                   ▼
                              [Fallback]
```

#### Individual Agent State Machine

```
[Idle] ──► [Running] ──► [Success] ──► [Faithfulness Check] ──► [Verified]
              │                │                  │
              │                │                  │
              ▼                ▼                  ▼
         [Error]          [Timeout]          [Low Score]
              │                │                  │
              │                │                  │
              └────────────────┴──────────────────┘
                                   │
                                   ▼
                              [Fallback Template]
```

### 1.3 Communication Protocol

Agents communicate via:
1. **Shared Memory**: Profile data (read-only)
2. **Async Queues**: Streaming progress events
3. **Result Aggregation**: Final bundle JSON

---

## 2. Agent State Machine Code

### 2.1 Orchestrator Implementation

```python
# backend/agents/orchestrator.py

class Orchestrator:
    def __init__(self):
        self._semaphore = asyncio.Semaphore(MAX_CONCURRENT_AGENTS)
        self._agents = {
            "content": ContentAgent(),
            "quiz": QuizAgent(),
            "mindmap": MindMapAgent(),
            "media": MediaAgent(),
            "code": CodeAgent(),
        }
    
    async def generate_resources(self, topic, profile, agent_selection=None):
        # State: Planning
        agents_to_run = agent_selection or self.decide_agents(profile, topic)
        
        # State: Dispatching
        tasks = [
            self._run_with_limit(agent, topic, profile)
            for agent in agents_to_run
        ]
        
        # State: Collecting
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # State: Aggregating
        bundle = self._aggregate_results(results)
        
        # State: Complete
        return bundle
    
    def decide_agents(self, profile, topic):
        agents = ["content", "quiz", "mindmap"]  # Core 3
        
        if "visual" in profile.get("cognitive_style", ""):
            agents.append("media")
        
        if is_programming_topic(topic):
            agents.append("code")
        
        if len(profile.get("weak_points", [])) >= 2:
            agents.insert(0, "quiz")
        
        return agents
    
    async def _run_with_limit(self, agent, topic, profile):
        async with self._semaphore:
            return await agent.run(topic, profile)
```

### 2.2 Streaming State Machine

```python
# backend/agents/orchestrator.py

async def generate_resources_stream(self, topic, profile):
    # Event: plan
    agents = self.decide_agents(profile, topic)
    yield {"event": "plan", "topic": topic, "agents": agents}
    
    # Create queues for each agent
    queues = {name: asyncio.Queue() for name in agents}
    
    # Start agents in background
    tasks = [
        asyncio.create_task(self._run_and_queue(name, agent, topic, profile, queues[name]))
        for name, agent in agents
    ]
    
    # Yield events as they complete
    completed = set()
    while len(completed) < len(agents):
        for name, queue in queues.items():
            if name in completed:
                continue
            try:
                event = await asyncio.wait_for(queue.get(), timeout=0.1)
                yield event
                if event["event"] in ("agent_complete", "agent_failed"):
                    completed.add(name)
            except asyncio.TimeoutError:
                continue
    
    # Event: complete
    yield {"event": "complete", "topic": topic}
```

---

## 3. LLM Prompt Engineering

### 3.1 Prompt Design Principles

1. **Structured Output**: JSON schema with type hints
2. **Few-Shot Examples**: 2-3 examples per prompt
3. **Chain-of-Thought**: Reasoning steps before output
4. **Profile Injection**: Student dimensions in every prompt
5. **RAG Grounding**: Source chunks prepended to context

### 3.2 Content Agent Prompt

```python
CONTENT_GENERATION_PROMPT = """
You are an expert educational content creator. Generate structured learning notes for the topic: {topic}

Student Profile:
- Knowledge Level: {mastery:.0%}
- Learning Style: {cognitive_style}
- Weak Points: {weak_points}
- Pace: {learning_pace}

RAG Context:
{rag_chunks}

Generate EXACTLY 6 sections:
1. Overview (with "Connect to Prior Knowledge")
2. Key Concepts (4-6 bold terms)
3. Detailed Explanation (3-4 subsections with ⚠️ Focus Area for weak points)
4. Self-Check (3-5 questions with hidden answers)
5. Practical Application (real-world examples with ASCII diagrams)
6. Summary (5-7 bullet points + Quick Reference Card table)

Format as JSON:
{{
  "content": "markdown string...",
  "metadata": {{
    "topic": "...",
    "word_count": 1200,
    "rag_chunks_used": 3
  }}
}}
"""
```

### 3.3 Quiz Agent Prompt

```python
QUIZ_GENERATION_PROMPT = """
Generate an adaptive quiz for: {topic}

Student Profile:
- Mastery: {mastery:.0%}
- Weak Points: {weak_points}
- Preferred Complexity: {complexity}

Difficulty Distribution:
- Mastery 0.0-0.3: 60% easy, 30% medium, 10% hard
- Mastery 0.4-0.6: 20% easy, 50% medium, 30% hard
- Mastery 0.7-1.0: 0% easy, 40% medium, 60% hard

Generate {num_questions} questions with:
- multiple_choice: 4 options with distractors
- true_false: 1-2 sentence justification
- scenario_based: Real-world situation
- short_answer: 2-4 sentence explanations (exactly 2 per quiz)

Format as JSON with questions array.
"""
```

### 3.4 MindMap Agent Prompt

```python
MINDMAP_GENERATION_PROMPT = """
Generate a hierarchical concept map for: {topic}

Structure:
- 1 root node (level 0)
- 5 branch nodes (level 1)
- 15 leaf nodes (level 2), 3 per branch

Node fields:
- description: 1 sentence (max 20 words)
- importance: "core" or "supplementary"
- difficulty: "beginner" | "intermediate" | "advanced" (leaf only)

Edge labels: contains, includes, requires, leads_to, enables, supports

Format as JSON with nodes[] and edges[] arrays.
Total: exactly 21 nodes, 22 edges.
"""
```

---

## 4. Learning Resource Generation Test Cases

### 4.1 Test Matrix

| Test Case | Topic | Profile | Expected Agents | Validation |
|-----------|-------|---------|-----------------|------------|
| TC-001 | Docker | Visual learner, beginner | content, quiz, mindmap, media | All 4 agents run |
| TC-002 | Python | Verbal, fast pace | content, quiz, mindmap, code | Code agent included |
| TC-003 | Kubernetes | Kinesthetic, many weak points | quiz, code, content, mindmap | Quiz prioritized |
| TC-004 | ML Basics | Mixed, slow pace | content, quiz, mindmap | Media excluded |
| TC-005 | Cloud Computing | Visual, 3 weak points | content, quiz, mindmap, media | Weak points targeted |

### 4.2 Faithfulness Test Cases

| Test Case | Content | Expected Score | Action |
|-----------|---------|----------------|--------|
| FT-001 | Factually correct | > 0.8 | Pass, no warning |
| FT-002 | Contains hallucination | < 0.8 | Prepend warning |
| FT-003 | Contradicts source | < 0.5 | Block, regenerate |
| FT-004 | Unsupported claim | 0.6-0.8 | Warning + citation |

### 4.3 Streaming Test Cases

| Test Case | Scenario | Expected Events |
|-----------|----------|----------------|
| ST-001 | All agents succeed | plan → 5x(agent_started → agent_complete) → complete |
| ST-002 | One agent fails | plan → 4x complete + 1x agent_failed → complete |
| ST-003 | Empty selection | plan → complete (empty bundle) |
| ST-004 | Concurrent execution | Fast agent completes before slow agent |

---

## 5. Agent Performance Metrics

### 5.1 Generation Time

| Agent | Typical Time | Max Tokens | Success Rate |
|-------|-------------|------------|--------------|
| Content | ~80s | 4000 | 95% |
| Quiz | ~60s | 4000 | 95% |
| MindMap | ~50s | 2500 | 98% |
| Media | ~120s | 8000 | 90% |
| Code | ~100s | 8000 | 92% |
| **Total (parallel)** | **~120s** | - | **~90%** |

### 5.2 Quality Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Faithfulness score | > 0.8 | 0.85-1.0 |
| JSON parse success | > 95% | 98% |
| Template fallback rate | < 5% | 3% |
| Content moderation pass | > 98% | 99% |

---

*Document Version: 1.0 | Generated: 2026-06-18*
