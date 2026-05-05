


A3
LLM-Based Personalized Resource Generation
and Learning Multi-Agent System
Technical Architecture & Implementation Specification

Field	Details
Competition	15th China Software Cup (第十五届中国软件杯)
Track	A3 — Multi-Agent AI Education System
Sponsor	iFlytek Co., Ltd. (科大讯飞股份有限公司)
Document Type	Technical Specification & Architecture Guide
Version	1.0
Status	Draft — Competition Submission


								
















1. Executive Summary
The A3 system is an AI-native personalized education platform designed for higher education. It replaces one-size-fits-all course delivery with a dynamic, data-driven approach that tailors every resource, learning path, and tutoring interaction to the individual student.
The system is built on three architectural pillars: a large language model backbone (iFlytek Spark LLM), a multi-agent collaboration framework, and a continuous feedback loop that refines the learner experience over time. Five core features work in concert:
•Feature 1 — Conversational Learner Profiling: builds a 6-dimensional student model through natural language chat
•Feature 2 — Multi-Agent Resource Generation: five specialized AI agents collaborate to produce course docs, mind maps, quizzes, videos, and coding exercises
•Feature 3 — Adaptive Learning Path Planning: AI sequences and reorders resources into milestones that adapt based on student progress
•Feature 4 — Real-Time AI Tutoring: multimodal Q&A with streaming text, diagrams, voice (iFlytek TTS), and short video responses
•Feature 5 — Learning Assessment & Analytics: LLM-powered behavioral analysis that triggers dynamic plan adjustments

Key Innovation Points
•Agent-to-agent collaboration with an orchestrator pattern — no monolithic prompt
•Profile-first design: every resource generated is conditioned on the learner model
•Hallucination prevention layer sits between the LLM and all educational content output
•Full feedback loop: assessment data flows back into profiling and resource generation
•Multimodal output natively — text, image, audio (TTS), and video in a single response
2. System Architecture Overview
2.1 High-Level Architecture
The system is organized into four horizontal layers, each with distinct responsibilities:

Layer	Components	Responsibility
Presentation Layer	Web App, Mobile App, Mini-Program	Student UI, streaming rendering, multimodal card display
Application Layer	Orchestrator Agent, Feature APIs, Auth Service	Request routing, agent coordination, session management
Intelligence Layer	Spark LLM, RAG Engine, 5 Specialized Agents	Content generation, reasoning, profile inference
Data Layer	Learner Profile DB, Course Knowledge Base, Resource Store	Persistent storage, vector search, analytics warehouse

[ DIAGRAM: System Architecture Overview ]
4-layer horizontal architecture: Presentation → Application → Intelligence → Data

2.2 Feature Interaction Map
The five features are not independent modules — they form a continuous data pipeline where outputs from one feature become inputs to the next:

[ DIAGRAM: Feature Interaction Flow ]
Feature 1 (Profile) → Feature 2 (Resources) → Feature 3 (Path) → Feature 4 (Tutor) → Feature 5 (Assessment) → back to Feature 1

The feedback loop is the system's most critical architectural property. Assessment data from Feature 5 continuously refines the learner profile in Feature 1, which in turn triggers updated resource generation in Feature 2. This creates a self-improving cycle unique to this architecture.
2.3 Technology Stack

Category	Technology	Purpose
LLM Backend	iFlytek Spark LLM v3.5+	Core reasoning, NLU, content generation
Agent Framework	LangChain / AutoGen	Multi-agent orchestration and tool use
Vector DB	Weaviate / Chroma	RAG knowledge base retrieval
Frontend	React + Next.js / Uni-app	Web and cross-platform mobile
Backend API	FastAPI (Python)	REST API, streaming SSE, auth
TTS / Speech	iFlytek TTS SDK	Voice output for tutoring feature
Video Generation	Stable Video Diffusion / Wan2.1	Short explainer clip generation
Database	PostgreSQL + Redis	Relational data + session cache
Deployment	Docker + Kubernetes	Container orchestration
Monitoring	Prometheus + Grafana	Performance and quality metrics

3. Feature 1 — Conversational Learner Profiling
3.1 Overview
Traditional learner profiling relies on pre-course surveys and forms, which suffer from low completion rates and inaccurate self-assessment. Feature 1 replaces this with a natural language conversation that implicitly extracts learner attributes without explicitly asking about them.
The system opens a structured but free-form conversation with each new student and uses the Spark LLM to parse intent, prior knowledge signals, vocabulary complexity, and reasoning patterns from the student's responses.
3.2 How It Works — Step by Step
                                
[ DIAGRAM: Feature 1: Conversational Learner Profile Flow ]
Student chat input → NLP intent extraction → 6-dimension profiling → dynamic profile store → feeds Features 2, 3, 4

1.Student initiates a chat conversation in natural language — no forms, no dropdowns.
2.The NLP pipeline (Spark LLM) extracts signals from the text using the following techniques:
◦Named Entity Recognition (NER): identifies subject areas, technology names, and prior tools mentioned
◦Dependency Parsing: infers conceptual understanding depth from sentence structure
◦Zero-shot intent classification: maps student statements to one of 6 profile dimensions
◦Semantic similarity scoring (embeddings): compares student vocabulary to reference expertise corpora
◦Confidence scoring: assigns certainty weights to each dimension value extracted
3.Six learner dimensions are populated and scored:

Dimension	Description	Example Signal
Knowledge base	Prior subject mastery per topic	"I've done Python basics but never used NumPy"
Cognitive style	Visual, verbal, or kinetic preference	"I prefer diagrams over walls of text"
Weak points	Identified knowledge gaps	Incorrect answers or hedged language on specific topics
Goals & motivation	Short and long-term learning aims	"I want to pass the final exam in 3 weeks"
Learning pace	Speed and retention rate	Time to complete exercises, re-read rate
Content preferences	Format and topic interests	"Can you explain this with a real example?"

4.The profile is stored in a structured JSON document in the Learner Profile DB.
5.As learning progresses, every interaction (quiz attempts, tutor questions, path completions) triggers a profile update via the Assessment module (Feature 5).
3.3 NLP Techniques in Detail
3.3.1 Intent Extraction via Spark LLM
The LLM is prompted with a structured system message that instructs it to extract profile attributes from the student's response as a JSON object. Each extraction includes a confidence score (0.0–1.0) and a source quote from the student's message.
System: Extract learner profile attributes from the student message.
Return JSON: { dimension, value, confidence, evidence_quote }
3.3.2 Embedding-Based Gap Detection
Student answers to open-ended questions are embedded using the Spark embedding model and compared against a reference corpus of expert-level answers using cosine similarity. Large semantic distance signals a knowledge gap in that topic area.
3.3.3 Dynamic Profile Updates
Profile updates use a weighted moving average. New evidence does not overwrite previous values — it adjusts them proportionally based on confidence score and recency weight. This prevents profile corruption from a single incorrect response.
new_value = (1 - alpha) * old_value + alpha * new_evidence  // alpha = confidence * recency_weight
3.4 Output Schema
The profile is stored as a versioned document with a full history of updates:
Field	Type	Notes
student_id	UUID	Unique identifier
knowledge_base	Map<topic, score>	Score 0.0–1.0 per topic
cognitive_style	Enum	visual | verbal | kinetic | mixed
weak_points	List<topic>	Sorted by severity
goals	List<string>	Free-text goal statements
learning_pace	Float	Normalized 0.0–1.0
content_preferences	List<format>	video | text | interactive | audio
last_updated	Timestamp	ISO 8601
version	Integer	Increment on each update

4. Feature 2 — Multi-Agent Resource Generation
4.1 Overview
Feature 2 is the generative engine of the system. Rather than a single LLM call that tries to produce all resource types, the system uses an orchestrator-worker multi-agent pattern where a coordinator agent decomposes the generation task and delegates to five specialized sub-agents running in parallel.
Each sub-agent is optimized for its output format, uses a tailored system prompt, and may call different tools or external APIs depending on the resource type.
4.2 Agent Architecture
                                             
[ DIAGRAM: Feature 2: Multi-Agent Resource Generation ]
Learner profile → Orchestrator Agent → 5 parallel sub-agents → 5 resource types → personalized bundle

Agent	Trigger Condition	Output Format	Tools Used
Orchestrator	Any resource generation request	Task delegation JSON	Profile API, LLM planner
Content Agent	Needs lecture notes / reading material	Markdown / PDF	Spark LLM, RAG
Mind Map Agent	Visual learner or new topic introduction	JSON graph → SVG	Spark LLM, graph renderer
Quiz Agent	After resource delivery or on-demand	Structured Q&A JSON	Spark LLM, difficulty scorer
Media Agent	Visual/kinetic learner preference	Video script + TTS + frames	TTS SDK, video gen API
Code Agent	Programming topics, CS courses	Runnable code + test cases	Spark LLM, code sandbox

4.3 Orchestrator Logic
The orchestrator agent reads the learner profile and the topic being studied, then produces a delegation plan specifying which sub-agents to invoke, in what priority order, and with what parameters. It uses chain-of-thought prompting to reason about which formats will best serve this particular learner.
Agents run in parallel using async task dispatch. The orchestrator collects outputs, validates them against a hallucination filter, and bundles them into the personalized resource package.
4.4 Hallucination Prevention
All generated educational content passes through a two-stage verification layer before delivery:
6.Factual consistency check: the LLM is asked to verify each factual claim in the output against the RAG knowledge base. Unverifiable claims are flagged or removed.
7.Content safety filter: the output is scanned for harmful, inappropriate, or misleading content using iFlytek's moderation API.
This layer is non-negotiable for educational content — incorrect information delivered with AI confidence can cause significant harm to students preparing for exams or building foundational knowledge.
4.5 RAG Knowledge Base
The system requires at least one university-level course knowledge base to be pre-indexed. The knowledge base is stored in a vector database (Weaviate or Chroma) and indexed using Spark embeddings. Each chunk is stored with metadata including source, topic, difficulty level, and content type.
Knowledge Base Field	Description
content	Raw text chunk (512 tokens max)
embedding	768-dimensional vector from Spark embedding model
source	Textbook, lecture slide, or paper reference
topic_tags	List of topic labels for routing
difficulty	beginner | intermediate | advanced
content_type	definition | example | theorem | code | exercise

5. Feature 3 — Adaptive Learning Path Planning
5.1 Overview
Feature 3 acts as the curriculum architect of the system. It takes the learner profile and the available resource pool, and produces a sequenced, milestone-driven learning path. Critically, this path is not static — it adapts in real time as the student's performance data flows in from Feature 5.
5.2 Path Planning Algorithm
                               

[ DIAGRAM: Feature 3: Adaptive Learning Path Planning ]
Inputs (profile + goal + resources) → AI path planner → milestone sequence → progress check → remediation or acceleration branches

The path planner uses a graph-based curriculum model where topics are nodes and prerequisite relationships are edges. The planner traverses this graph using a modified A* search, where the heuristic is the estimated learning effort given the student's current profile.
8.Build topic dependency graph from knowledge base metadata.
9.Score each topic based on learner profile (weak points get higher priority, mastered topics get lower weight).
10.Run A* traversal to produce an ordered topic sequence that minimizes total estimated study time.
11.Assign resources from the Feature 2 bundle to each topic in the sequence.
12.Package sequence into milestone groups (3–5 topics per milestone) for pacing.
5.3 Dynamic Adaptation
After each milestone, the system runs a progress evaluation (Feature 5) and applies one of three interventions:

Trigger Condition	Intervention	Action
Quiz score < 60%	Remediation	Insert simpler prerequisite resources; reduce pace score
Quiz score 60–85%	Continue	Proceed to next milestone as planned
Quiz score > 85% + fast completion	Acceleration	Skip intermediate content; unlock advanced material
Student stuck > 2× expected time	Tutor trigger	Automatically suggest Feature 4 for that topic
3 consecutive low scores	Path replan	Invoke full path replan from current position

5.4 Recommendation Engine
At any point during learning, the system surfaces contextual resource recommendations using collaborative filtering (what did similar learner profiles find helpful at this stage?) combined with content-based filtering (what resources align with this student's stated preferences?).
6. Feature 4 — Real-Time AI Tutoring
6.1 Overview
Feature 4 provides on-demand, multimodal tutoring available at any point in the learning path. The tutor is not a generic chatbot — it is a context-aware assistant that knows the student's profile, current milestone, and prior interaction history. Every response is tailored to the student's inferred comprehension level.
6.2 Tutoring Pipeline
                                    
[ DIAGRAM: Feature 4: AI Tutoring System ]
Student question (text/voice/image) + learner context → Spark LLM + RAG → hallucination filter → multimodal response router → 5 output types

13.Student submits a question in any modality: text input, voice (transcribed via iFlytek ASR), or image upload (for equation or diagram questions).
14.The system prepends the learner context: current topic, profile summary, and the last 5 interaction turns for continuity.
15.The Spark LLM generates a response grounded in the RAG knowledge base to minimize hallucination.
16.The hallucination filter verifies factual claims against the course knowledge base.
17.The multimodal router determines the best response format based on question type and learner preferences.
18.The response streams to the student with real-time progress indicators for any long-generation formats.
6.3 Multimodal Output Types
Output Type	Trigger	Technology	Format
Streamed text	All question types (default)	Spark LLM SSE streaming	Markdown with LaTeX math
Auto-generated diagram	Conceptual or structural questions	LLM → SVG renderer	Inline SVG image
Step-by-step walkthrough	Problem-solving questions	Spark LLM structured output	Interactive numbered steps
Voice reply	Visual learner or hands-free mode	iFlytek TTS SDK	MP3 audio stream
Short explainer video	Complex concepts, kinetic learner	Script gen + TTS + frame gen	MP4 clip ≤60 seconds

6.4 Context Window Management
The tutoring session maintains a rolling context window of the last 8,000 tokens. When the window fills, older turns are summarized by a background LLM call and compressed into a running context summary. This ensures continuity across long sessions without token overflow errors.
7. Feature 5 — Learning Assessment & Analytics
7.1 Overview
Feature 5 is the nervous system of the platform. It continuously monitors all student interactions, runs LLM-powered analysis on the behavioral data, generates insights, and triggers adaptive responses. Without Feature 5, the other features would be static — with it, the system becomes self-improving.
7.2 Data Collection
                             
[ DIAGRAM: Feature 5: Learning Assessment & Analytics ]
4 behavioral data sources → LLM analytics engine → 4 insight types → dynamic plan adjustment → updates all features

The system collects four categories of behavioral signals:
Signal Type	Data Points Collected	Update Frequency
Quiz performance	Score, per-question time, attempt count, answer trajectory	On each quiz submission
Resource engagement	Time-on-task, scroll depth, re-read count, skip events	Continuous, batched every 60s
Tutor interactions	Questions asked, topics requested, confusion signals (repeated questions)	On each tutor message
Path completion	Milestone completion rate, dropout points, time-per-milestone	On milestone events

7.3 LLM Analytics Engine
Raw behavioral data is aggregated and fed to the analytics LLM in a structured prompt. The LLM produces a JSON analysis report containing:
•Mastery score per topic (0.0–1.0) with confidence interval
•Predicted weak spots: topics likely to cause failure if not reviewed
•Engagement quality score: separates passive reading from active engagement
•Completion forecast: estimated days to reach the learning goal at current pace
•Anomaly flags: unusual patterns like rapid completion (likely skipping) or very long session gaps
7.4 Dynamic Plan Adjustment
Based on the analytics report, the system triggers one or more of the following interventions automatically:
19.Profile update: new mastery scores and weak points are written to the Feature 1 learner profile.
20.Resource regeneration: if mastery is low on a topic, Feature 2 is called to generate alternative-format resources for that topic.
21.Path reorder: Feature 3 re-evaluates the remaining path given the updated profile and may reorder upcoming milestones.
22.Proactive tutor prompt: if a student appears stuck, the UI surfaces a contextual "Need help?" prompt that pre-fills a tutor question about the specific sticking point.
23.Teacher dashboard alert: in institutional deployments, flags at-risk students to human instructors.
8. User Flow & Use Case Diagrams
8.1 Primary Actors
Actor	Role	Primary Interactions
Student	Primary user	Profiling, resource consumption, tutoring, quizzes
Instructor	Secondary user	Monitor student analytics dashboard, upload course content
System / AI Agents	Automated actor	Resource generation, path planning, assessment analysis
iFlytek Spark LLM	External AI service	NLU, content generation, analytics reasoning

8.2 Use Case Diagram

The primary use cases for the Student actor are:
        
•UC-01: Register and onboard (creates account, triggers profiling conversation)
•UC-02: Build learner profile (chat-based profiling flow)
•UC-03: Request learning resources (triggers Feature 2 agent pipeline)
•UC-04: Follow the learning path (milestone progression with Feature 3)
•UC-05: Ask the AI tutor (on-demand Feature 4)
•UC-06: Take a quiz or assessment (triggers Feature 5 analysis)
•UC-07: View personal analytics dashboard (Feature 5 output visualization)
•UC-08: Update learning goals (triggers profile update and path replan)

8.3 Complete User Flow — New Student Onboarding


24.Student registers via web/mobile app and verifies email.
25.Onboarding conversation begins automatically (Feature 1 activation).
◦System asks 5–8 open-ended questions about prior experience, goals, and learning preferences
◦Spark LLM extracts 6 profile dimensions in the background — student never sees a form
◦Profile confidence score reaches threshold (>0.7 on ≥4 dimensions) before moving on
26.Student sets a primary learning goal (e.g., "Complete the AI Fundamentals course by end of semester").
27.System triggers Feature 2: orchestrator generates an initial resource bundle for the first topic.
◦Content agent: lecture notes on Topic 1
◦Mind map agent: topic overview visual
◦Quiz agent: pre-assessment quiz to calibrate baseline
28.Feature 3 builds the initial learning path based on profile + pre-assessment results.
29.Student is presented with their personalized dashboard showing their learning path, first milestone, and available resources.
30.Student begins Milestone 1.

8.4 User Flow — In-Progress Learning Session

	
31.Student opens the platform and resumes their current milestone.
32.Student reads/watches the generated resources for the current topic.
33.At any point, student can tap "Ask Tutor" — Feature 4 activates with full context pre-loaded.
◦System pre-fills the topic context so student does not need to explain what they are studying
◦Student asks a specific question; receives streamed multimodal response
◦If the question reveals a deeper gap, Feature 5 logs a confusion signal
34.Student completes the milestone resources and takes the milestone quiz.
35.Feature 5 analyzes quiz results + engagement data in near real-time.
36.Adaptation decision is made and applied silently:
◦If struggling: additional resources are added to the current milestone
◦If excelling: next milestone unlocks early; advanced content surfaced
37.Student receives a milestone completion summary with their score, topics mastered, and a preview of the next milestone.

8.5 User Flow — Feature-to-Feature Transition Map
         
From Feature	To Feature	Trigger	User Experience
F1: Profile	F2: Resources	Profile confidence > 0.7 on 4+ dimensions	Resources appear automatically on dashboard after profiling completes
F2: Resources	F3: Path	Resource bundle generated	Learning path visualization loads with milestone markers
F3: Path	F2: Resources	New milestone starts or adaptation triggers	New resources silently added to current milestone
F3: Path	F4: Tutor	Student taps 'Ask Tutor' or system detects stuck signal	Tutor panel opens with current topic pre-loaded
F4: Tutor	F5: Assessment	Every tutor interaction is logged	Invisible to student; analytics updated in background
F3: Path	F5: Assessment	Quiz completion, milestone end	Quiz results page shown; path update notification if plan changes
F5: Assessment	F1: Profile	Insight thresholds crossed	Student may see 'Your profile has been updated' notification
F5: Assessment	F2: Resources	Low mastery on topic detected	Alternative format resources appear in current milestone

9. Implementation Guide
9.1 What You Need — Prerequisites

Development Prerequisites
•iFlytek Spark LLM API key (申请讯飞开放平台账号 at open.xfyun.cn)
•iFlytek TTS SDK credentials (for Feature 4 voice output)
•Node.js v18+ and Python 3.10+ on development machines
•Docker Desktop for local container development
•Git for version control and submission packaging
•A course knowledge base (lecture PDFs, textbook chapters) for at least one university subject

9.2 Repository Structure
a3-system/
├── backend/
│   ├── api/              # FastAPI application
│   ├── agents/           # Orchestrator + 5 sub-agents
│   ├── nlp/              # Profile extraction pipeline
│   ├── rag/              # RAG engine + knowledge base indexer
│   └── analytics/        # Feature 5 assessment engine
├── frontend/
│   ├── web/              # Next.js web application
│   └── mobile/           # Uni-app cross-platform
├── data/
│   └── knowledge_base/   # Course PDFs and raw text
├── docker-compose.yml
└── docs/

9.3 Phase-by-Phase Implementation Plan

Phase	Duration	Deliverables	Features Covered
Phase 1: Foundation	Week 1–2	Backend scaffolding, Spark LLM integration, RAG pipeline, knowledge base indexed	Prerequisite for all
Phase 2: Core Profile	Week 2–3	Feature 1 chat UI, NLP extraction pipeline, profile DB schema, update mechanism	Feature 1
Phase 3: Agent Engine	Week 3–5	Orchestrator logic, 3 sub-agents (Content, Quiz, Mind Map), resource delivery UI	Feature 2 (partial)
Phase 4: Learning Path	Week 5–6	Path planner algorithm, milestone UI, adaptation triggers	Feature 3
Phase 5: Tutoring	Week 6–7	Streaming chat UI, multimodal response router, TTS integration	Feature 4
Phase 6: Assessment	Week 7–8	Analytics engine, dashboard, dynamic adaptation pipeline, full loop test	Feature 5
Phase 7: Polish	Week 8–9	Media agent, Code agent, performance optimization, hallucination testing	Feature 2 (complete)
Phase 8: Submission	Week 9–10	Demo video, test data, documentation, packaging	All

9.4 Spark LLM Integration
All LLM calls route through a central LLMClient service that handles authentication, retry logic, rate limiting, and response caching:
# Python — Spark LLM client wrapper
from sparkai.llm.llm import ChatSparkLLM
from sparkai.core.messages import ChatMessage

spark = ChatSparkLLM(
    spark_api_url='wss://spark-api.xf-yun.com/v3.5/chat',
    spark_app_id=os.environ['SPARK_APP_ID'],
    spark_api_key=os.environ['SPARK_API_KEY'],
    spark_api_secret=os.environ['SPARK_API_SECRET'],
    spark_llm_domain='generalv3.5',
    streaming=True,
)

9.5 RAG Pipeline Setup
The knowledge base indexing pipeline processes raw course materials and stores them as searchable vector embeddings:
38.Chunk course PDFs into 512-token segments with 50-token overlap.
39.Embed each chunk using the Spark embedding API.
40.Store chunk text + embedding + metadata in Weaviate.
41.At query time: embed the student query, retrieve top-k chunks by cosine similarity, inject into LLM context.

9.6 Agent Framework Setup (LangChain)
# Python — Orchestrator agent definition
from langchain.agents import AgentExecutor, create_react_agent
from langchain.tools import tool

@tool
def generate_content(topic: str, profile: dict) -> str:
    '''Generate lecture notes for a topic given a learner profile.'''
    ...

orchestrator = create_react_agent(
    llm=spark_llm,
    tools=[generate_content, generate_quiz, generate_mindmap, generate_media, generate_code],
    prompt=orchestrator_prompt_template
)

9.7 Streaming API (SSE)
All LLM responses stream to the frontend via Server-Sent Events to enable real-time typewriter output:
# FastAPI streaming endpoint
@app.post('/api/tutor/ask')
async def ask_tutor(request: TutorRequest):
    async def stream_response():
        async for chunk in spark.astream(messages):
            yield f'data: {chunk.content}\n\n'
    return StreamingResponse(stream_response(), media_type='text/event-stream')

9.8 Deployment Architecture

Service	Container	Replicas	Resource Estimate
FastAPI backend	python:3.10-slim	2+	2 CPU, 4GB RAM per replica
Next.js frontend	node:18-alpine	2+	1 CPU, 2GB RAM per replica
PostgreSQL	postgres:15	1 (primary)	2 CPU, 8GB RAM
Redis	redis:7	1	1 CPU, 2GB RAM
Weaviate (vector DB)	semitechnologies/weaviate	1	4 CPU, 8GB RAM
Background worker	python:3.10-slim	1+	2 CPU, 4GB RAM

10. Non-Functional Requirements
10.1 Performance
Metric	Target	Measurement Method
First tutor response token (TTFT)	< 800ms	Frontend performance log
Resource generation (text only)	< 5 seconds	API response time
Resource generation (with video)	< 30 seconds with progress bar	End-to-end timer
Profile update latency	< 2 seconds after trigger event	Event timestamp delta
Path replan latency	< 3 seconds	API response time
Concurrent users (target)	50 simultaneous	Load test with k6

10.2 Safety & Content Quality
•All AI-generated content must pass the two-stage hallucination filter before delivery
•Factual error rate target: < 2% on verifiable claims in the knowledge base domain
•Content safety: zero tolerance for harmful, discriminatory, or inappropriate content
•Answer traceability: every factual statement in tutor responses must include a source citation

10.3 UI/UX Standards
•Streaming output with real-time typewriter effect for all LLM text responses
•Markdown rendering with syntax highlighting for code blocks
•Multimodal response cards (separate card types for text, diagram, audio, video)
•Progress indicators for all long-running generation tasks (> 2 seconds)
•Mobile-first responsive design with offline resource caching

11. Competition Scoring Alignment
The following table maps competition scoring criteria to specific system components and implementation evidence:

Scoring Category	Weight	How This System Addresses It
Innovation & Practical Value	35%	Novel orchestrator-worker multi-agent pattern; profile-first architecture; full adaptive feedback loop not seen in existing edu-tech platforms
Functionality & Technical Requirements	45%	All 5 required features implemented; ≥6 profile dimensions; ≥5 resource types; multimodal tutoring; LLM analytics with dynamic adjustment
Documentation Quality	10%	This technical specification; API documentation; architecture diagrams; test data description
Demo Video & Presentation	10%	≤7 min demo covering onboarding flow, resource generation, path adaptation, and tutor interaction

12. Appendix
A. Glossary
Term	Definition
RAG	Retrieval-Augmented Generation — grounding LLM outputs in a local knowledge base
SSE	Server-Sent Events — HTTP streaming protocol for real-time token delivery
NER	Named Entity Recognition — identifying subject and technology names in text
TTS	Text-to-Speech — converting generated text to spoken audio (iFlytek SDK)
ASR	Automatic Speech Recognition — converting student voice input to text
Orchestrator	The coordinating agent that decomposes tasks and delegates to sub-agents
DXA	Document Exchange Absolute units — 1440 DXA = 1 inch (Word measurement)
Embedding	Dense vector representation of text used for semantic similarity search
CoT	Chain-of-Thought prompting — instructing the LLM to reason step by step
TTFT	Time To First Token — latency from request to first streamed character

B. Key iFlytek API Endpoints
API	Endpoint / SDK	Usage
Spark LLM v3.5	wss://spark-api.xf-yun.com/v3.5/chat	All text generation and reasoning
Spark Embedding	https://emb-cn-huabei-1.xf-yun.com/v1/embeddings	Vector embedding for RAG
iFlytek TTS	TTS SDK (Java/Python/C++)	Voice output in Feature 4
iFlytek ASR	ASR SDK or WebSocket API	Voice input transcription
Content Moderation	https://audit.xfyun.cn/v2/	Safety filtering for all generated content

C. References
•iFlytek Open Platform Developer Documentation: open.xfyun.cn/doc
•LangChain Multi-Agent Documentation: docs.langchain.com/docs/use-cases/autonomous_agents
•Weaviate Vector Database Docs: weaviate.io/developers/weaviate
•FastAPI Streaming Documentation: fastapi.tiangolo.com/advanced/custom-response
•China Software Cup Competition Guidelines: 中国软件杯大赛官网