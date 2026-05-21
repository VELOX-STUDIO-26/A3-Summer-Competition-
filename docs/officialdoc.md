A3 System

Personalized Resource Generation and Learning Multi-Agent System

Based on Large Language Models

15th China Software Cup | iFLYTEK Track | Technical Architecture and Implementation

Specification V1.0

Table of Contents
Right-click the table of contents and select &#39;Update Field&#39; to refresh page numbers.
1 Executive Summary
2 System Architecture Overview
2.1 High-Level Architecture
2.2 Functional Interaction Diagram
2.3 Technology Stack
3 Feature 1: Conversational Learner Profiling
3.1 Overview
3.2 Workflow — Step-by-Step Explanation
3.3 NLP Technologies in Detail
3.4 Output Schema
4 Feature 2: Multi-Agent Resource Generation
4.1 Overview
4.2 Agent Architecture
4.3 Orchestrator Logic
4.4 Hallucination Guardrails
4.5 RAG Knowledge Base
5 Feature 3: Adaptive Learning Path Planning
5.1 Overview
5.2 Path Planning Algorithm
5.3 Dynamic Adaptation
5.4 Recommendation Engine
6 Feature 4: Real-Time AI Tutoring
6.1 Overview
6.2 Tutoring Process
6.3 Multimodal Output Types
6.4 Context Window Management
7 Feature 5: Learning Assessment and Analytics
7.1 Overview
7.2 Data Collection
7.3 LLM Analytics Engine

7.4 Dynamic Plan Adjustment
8 User Flows and Use Case Diagrams
8.1 Primary Actors
8.2 Use Case Diagram
8.3 Complete User Flow — New Student Onboarding
8.4 User Flow — Ongoing Learning Session
8.5 Inter-Feature Transition Diagram
9 Implementation Guide
9.1 Prerequisites
9.2 Repository Structure
9.3 Phased Implementation Plan
9.4 Spark LLM Integration
9.5 RAG Pipeline Setup
9.6 Agent Framework Setup (LangChain)
9.7 Streaming API (SSE)
9.8 Deployment Architecture
10 Non-Functional Requirements
10.1 Performance Metrics
10.2 Security and Content Quality
10.3 UI/UX Standards
11 Competition Scoring Alignment
12 Appendix
A. Glossary
B. iFLYTEK API Endpoints
C. References

1 Executive Summary
The A3 system is an AI-native personalized education platform tailored for higher education. It
replaces the traditional &quot;one-size-fits-all&quot; curriculum delivery model with a dynamic, data-driven
approach, customizing every resource, learning path, and tutoring interaction for each individual
student.
The system is built upon three architectural pillars: a Large Language Model backbone
(iFLYTEK Spark LLM), a multi-agent collaborative framework, and a continuous feedback loop
that optimizes the learner&#39;s experience. Five core features work in synergy:
 Feature 1 — Conversational Learner Profiling: Constructs a six-dimensional student model
through natural language dialogues.
 Feature 2 — Multi-Agent Resource Generation: Five specialized AI agents collaborate to
generate lecture documents, mind maps, quizzes, videos, and programming exercises.
 Feature 3 — Adaptive Learning Path Planning: The AI sequences and reorganizes
resources into milestones that adapt to the student&#39;s progress.
 Feature 4 — Real-Time AI Tutoring: Provides multimodal Q&amp;A, supporting streaming text,
diagrams, voice (iFLYTEK TTS), and short video responses.
 Feature 5 — Learning Assessment and Analytics: Conducts LLM-based behavioral analysis
to trigger dynamic plan adjustments.
Key Innovations
 Orchestrator Pattern for Inter-Agent Collaboration: Eliminates reliance on a single massive
prompt.
 Profile-First Design: Every generated resource is conditioned on the learner&#39;s specific profile
model.
 Hallucination Guardrail Layer: Placed between the LLM and all educational content outputs.
 Complete Feedback Loop: Assessment data flows back into profiling and resource
generation.
 Native Multimodal Output: Integrates text, images, audio (TTS), and video within a single
response.
2 System Architecture Overview
2.1 High-Level Architecture
The system consists of four horizontal layers, each with clearly defined responsibilities:
Layer Components Responsibilities
Presentation Layer Web App, Mobile App, Mini-

Programs

Student UI, streaming
rendering, multimodal card

display

Application Layer Orchestrator Agent,
Functional APIs,
Authentication Services

Request routing, agent
coordination, session
management

Intelligence Layer Spark LLM, RAG Engine, 5
Specialized Agents

Content generation,
reasoning, profile inference

Data Layer Learner Profile DB, Course
Knowledge Base, Resource
Storage

Persistent storage, vector
search, analytics data
warehouse

2.2 Functional Interaction Diagram
These five features are not isolated modules—they form a continuous data pipeline where the
output of one feature becomes the input for the next:
Feature 1 (Profiling) → Feature 2 (Resource) → Feature 3 (Path) → Feature 4 (Tutoring) →
Feature 5 (Assessment) → Back to Feature 1
The feedback loop is the most critical architectural characteristic of the system. Assessment
data from Feature 5 continuously optimizes the learner profile in Feature 1, which in turn
triggers updated resource generation in Feature 2. This creates a self-improving cycle unique to
this architecture.
2.3 Technology Stack
Category Technology Purpose
LLM Backend iFLYTEK Spark LLM v3.5+ Core reasoning, natural
language understanding,
content generation
Agent Framework LangChain / AutoGen Multi-agent orchestration

and tool usage
Vector Database Weaviate / Chroma RAG knowledge base

retrieval

Frontend React + Next.js / Uni-app Web and cross-platform
mobile frontend

Backend API FastAPI (Python) REST APIs, streaming SSE,

authentication

TTS / Audio iFLYTEK TTS SDK Voice output for the tutoring

feature

Video Generation Stable Video Diffusion /

Wan2.1

Short video explanation clip
generation

Database PostgreSQL + Redis Relational data + session

caching

Deployment Docker + Kubernetes Container orchestration
Monitoring Prometheus + Grafana Performance and quality

metrics

3 Feature 1: Conversational Learner Profiling
3.1 Overview
Traditional learner profiles rely on pre-course surveys and forms, which suffer from low
completion rates and inaccurate self-assessments. Feature 1 replaces this by implicitly
extracting learner attributes through natural language dialogues without explicit interrogation.
The system initiates a structured yet free-form dialogue with each new student, leveraging the
Spark LLM to parse intent, prior knowledge signals, vocabulary complexity, and reasoning
patterns from the student&#39;s responses.
3.2 Workflow — Step-by-Step Explanation
 1. The student initiates a dialogue using natural language—no forms or dropdown menus
required.
 2. The NLP pipeline (Spark LLM) extracts signals from the text using Named Entity
Recognition (NER), Dependency Parsing, Zero-Shot Intent Classification, Semantic
Similarity Scoring, and Confidence Scoring.
 3. Six learner dimensions are populated and scored:
Dimension Description Example Signal
Knowledge Base Prior mastery level of each &quot;I&#39;ve learned Python basics

topic but never used NumPy&quot;

Cognitive Style Visual, verbal, or kinesthetic

preference

&quot;I prefer diagrams over long
blocks of text&quot;

Weak Points Identified gaps in knowledge Wrong answers or vague
statements regarding a
specific topic

Goals &amp; Motivation Short-term and long-term

learning goals

&quot;I want to pass the final
exam in 3 weeks&quot;
Learning Pace Speed and retention rates Exercise completion time,

re-reading rates

Content Preference Format and topic interests &quot;Can you explain this with a
real-world example?&quot;
 4. Profiles are stored as structured JSON documents in the Learner Profile Database.
 5. As learning progresses, every interaction triggers a profile update via the assessment
module (Feature 5).
3.3 NLP Technologies in Detail
3.3.1 Intent Extraction via Spark LLM
The LLM receives a structured system message instructing it to extract learner profile attributes
from student responses into a JSON object. Each extraction contains a confidence score
(0.0–1.0) and a source quote from the student&#39;s message.
Returned JSON: { dimension, value, confidence, evidence_quote }
3.3.2 Embedding-Based Gap Detection
Student answers to open-ended questions are embedded using the Spark Embedding Model
and compared via cosine similarity against a reference corpus of expert answers. A larger
semantic distance indicates a knowledge gap in that topic area.
3.3.3 Dynamic Profile Updates
Profile updates use a weighted moving average. New evidence does not overwrite previous
values—instead, it scales proportionally based on confidence scores and recency weights.
new_value = (1 - alpha) * old_value + alpha * new_evidence // alpha = confidence *
recency_weight

3.4 Output Schema
Field Type Description
student_id UUID Unique identifier
knowledge_base Map&lt;topic, score&gt; Scored 0.0–1.0 for each

topic

cognitive_style Enum visual | verbal | kinetic |

mixed

weak_points List&lt;topic&gt; Sorted by severity
goals List&lt;string&gt; Free-text goal statements
learning_pace Float Normalized 0.0–1.0
content_preferences List&lt;format&gt; video | text | interactive |

audio
last_updated Timestamp ISO 8601
version Integer Increments with each update

4 Feature 2: Multi-Agent Resource Generation
4.1 Overview
Feature 2 serves as the generation engine of the platform. Rather than relying on a single LLM
call to generate all resource types, the system adopts an Orchestrator-Worker multi-agent
pattern. A coordinating agent decomposes and delegates generation tasks to five parallel-
running, specialized sub-agents.
4.2 Agent Architecture
Agent Trigger Condition Output Format Tools Used
Orchestrator Any resource Task delegation Profile API, LLM

generation request JSON Planner

Content Agent Handouts / reading
materials required

Markdown / PDF Spark LLM, RAG

Mind Map Agent Visual learners or
new topic
introduction

JSON Graph →
SVG

Spark LLM,
Graphics Renderer

Quiz Agent Post-resource
delivery or on-
demand

Structured Q&amp;A
JSON

Spark LLM, Difficulty
Scorer

Media Agent Visual/kinesthetic
learner preference

Video script + TTS +
Frames

TTS SDK, Video
Gen API

Code Agent Programming topics,
CS courses

Runnable code +
Test cases

Spark LLM, Code
Sandbox

4.3 Orchestrator Logic
The Orchestrator Agent reads the learner&#39;s profile and the current target topic, then generates a
delegation plan specifying which sub-agents to invoke, their execution order, and parameters. It
utilizes Chain-of-Thought (CoT) prompting to reason about which formats will best serve that
specific learner.
4.4 Hallucination Guardrails
All generated educational content must pass through a two-stage validation layer before
delivery:
 1. Fact Consistency Check: Instructs an LLM to verify every factual claim in the output
against the RAG knowledge base.
 2. Content Safety Filter: Scans for harmful, inappropriate, or misleading content using the
iFLYTEK Content Moderation API.
4.5 RAG Knowledge Base
The system requires pre-indexing at least one university-level course knowledge base. The
knowledge base is stored in a vector database and indexed using Spark Embeddings.
Knowledge Base Field Description

content Raw text chunk (up to 512 tokens)

embedding 768-dimensional vector from the Spark

Embedding model

source Citations from textbooks, lecture slides, or

academic papers

topic_tags List of topic tags used for routing
difficulty beginner | intermediate | advanced
content_type definition | example | theorem | code |

exercise

5 Feature 3: Adaptive Learning Path Planning
5.1 Overview
Feature 3 acts as the platform&#39;s curriculum architect. It ingests the learner profile and the
available resource pool to generate an ordered, milestone-driven learning path. Crucially, this
path is not static—it adapts in real time as student performance data flows in from Feature 5.
5.2 Path Planning Algorithm
The path planner relies on a graph-based curriculum model where topics represent nodes and
prerequisites form edges. The planner traverses this graph using an optimized A* search, where
the heuristic function estimates student learning engagement based on their current profile.
5.3 Dynamic Adaptation
Trigger Condition Intervention Actions Taken
Quiz Score &lt; 60% Remediation Insert simpler prerequisite
resources; lower the pacing
score

Quiz Score 60%–85% Continuation Proceed to the next
milestone as planned

Quiz Score &gt; 85% + Fast
Finish

Acceleration Skip intermediate content;
unlock advanced materials

Student Stuck &gt; 2x
Expected Time

Tutoring Trigger Automatically suggest using
Feature 4 for this topic
3 Consecutive Low Scores Path Replanning Invoke full path replanning
from the current position

5.4 Recommendation Engine
At any point in the learning journey, the system combines collaborative filtering with content-
based filtering to deliver highly contextualized resource recommendations.
6 Feature 4: Real-Time AI Tutoring
6.1 Overview
Feature 4 provides on-demand, multimodal tutoring accessible at any stage of the learning path.
The tutor is a context-aware assistant that understands the student&#39;s profile, current milestone,
and previous interaction history.
6.2 Tutoring Process
The flow works sequentially: (1) Student submits a query in any modality. (2) System prepends
learner context. (3) Spark LLM generates a response anchored in RAG. (4) Hallucination filter
verifies claims. (5) Multimodal router determines response format. (6) Response is streamed
with progress markers.
6.3 Multimodal Output Types
Output Type Trigger Condition Underlying
Technology

Format

Streaming Text All question types
(Default)

Spark LLM SSE
Streaming

Markdown + LaTeX
Formulas

Auto-Generated
Diagrams

Conceptual or
structural queries

LLM → SVG
Renderer

Inline SVG Images

Step-by-Step
Explanations

Problem-solving
questions

Spark LLM
Structured Output

Interactive
Numbered Steps

Voice Responses Visual learners or
hands-free mode

iFLYTEK TTS SDK MP3 Audio Stream

Short Video
Explanations

Complex concepts,
kinesthetic learners

Script Gen + TTS +
Frame Gen

≤ 60-second MP4
clips

6.4 Context Window Management
Tutoring sessions maintain a rolling context window of the most recent 8,000 tokens. Older
dialogue turns are compressed into a running context summary by a background LLM call to
protect token capacity.
7 Feature 5: Learning Assessment and Analytics
7.1 Overview
Feature 5 acts as the nervous system of the platform. It continuously monitors all student
interactions, runs LLM-backed analytics on behavioral data, generates insights, and triggers
adaptive responses.
7.2 Data Collection
Signal Type Collected Data Points Update Frequency
Quiz Performance Scores, time spent per
question, attempt counts,
answer trajectories

Upon every quiz submission

Resource Engagement Time-on-task, scroll depth,
re-read count, skip events

Collected continuously,
batch-processed every 60s

Tutoring Interactions Number of questions asked,
requested topics, confusion
signals

Per tutoring message

Path Completion Milestone completion rate,
drop-off points, time elapsed
per milestone

Milestone events

7.3 LLM Analytics Engine
Raw behavioral data is aggregated and fed into an analytics LLM via structured prompts. The
LLM outputs a structured JSON report specifying topic mastery scores, predicted weak points,
engagement metrics, and anomaly flags.
7.4 Dynamic Plan Adjustment
Based on analytics, the system triggers: (1) Profile updates, (2) Resource re-generation for
weak topics, (3) Learning path re-ordering, (4) Proactive UI prompts, and (5) Teacher
dashboard alerts.
8 User Flows and Use Case Diagrams
8.1 Primary Actors
Actor Role Primary Interactions
Student Primary User Profiling, resource
consumption, tutoring,
quizzes

Teacher Secondary User Monitoring student analytics
dashboards, uploading
course content

System / AI Agents Automated Actor Resource generation, path
planning, assessment
analysis
iFLYTEK Spark LLM External AI Service Natural language
understanding, content
generation, reasoning

8.2 Use Case Diagram
Main student use cases are mapped from UC-01 to UC-08, reflecting the functional features.
8.3 Complete User Flow — New Student Onboarding
1. Student registers via Web/Mobile app. (2) Onboarding dialogue triggers implicitly. (3) Student
sets learning goals. (4) Feature 2 coordinates baseline materials. (5) Feature 3 initializes path
graph. (6) Dashboard populates milestone metrics.

8.4 User Flow — Ongoing Learning Session
Students traverse milestones naturally. They can query the contextual tutor at any time.
Milestone completion events automatically trigger Feature 5 evaluation, silently adjusting
downstream path sequencing.
8.5 Inter-Feature Transition Diagram
Source Feature Target Feature Trigger Condition User Experience
F1: Profile F2: Resource Profile confidence
score &gt; 0.7 for &gt;= 4
dimensions

Resources
automatically appear
on dashboard

F2: Resource F3: Path Resource package
generated
successfully

Learning path
visualization loads
milestones

F3: Path F2: Resource New milestone
starts or adaptive
trigger fires

New resources
silently injected into
milestone

F3: Path F4: Tutoring Student clicks &#39;Ask
Tutor&#39; or stuck signal
caught

Tutoring panel
opens pre-loaded
with topic context

F4: Tutoring F5: Assessment Every tutoring
interaction is logged

Invisible to student;
backend analytics
update

F3: Path F5: Assessment Quiz finished or
milestone ends

Displays quiz
results; path
updates dynamically
if needed

F5: Assessment F1: Profile Insight thresholds

crossed

Student may see
&#39;Your profile has
been updated&#39;
prompt

F5: Assessment F2: Resource Low topic mastery

detected

Alternative format
resources appear in

active milestone

9 Implementation Guide
9.1 Prerequisites
 iFLYTEK Spark LLM API Key and TTS credentials.
 Node.js v18+ and Python 3.10+ environments.
 Docker Desktop and Git operational profiles.
9.2 Repository Structure
Layout: a3-system/
├── backend/ (api, agents, nlp, rag, analytics)
├── frontend/ (web, mobile)
└── data/ (knowledge_base)
9.3 Phased Implementation Plan
Phase Duration Deliverables Covered Features
Phase 1 Weeks 1-2 Backend scaffolding,
Spark LLM, RAG
initialization

Prerequisites

Phase 2 Weeks 2-3 Feature 1 chat UI,
NLP pipeline, profile
DB mechanics

Feature 1

Phase 3 Weeks 3-5 Orchestrator logic, 3
sub-agents,
generation UI

Feature 2 (Partial)

Phase 4 Weeks 5-6 Path planning graph
traversal, milestone
interface

Feature 3

Phase 5 Weeks 6-7 Streaming tutoring
panel, multimodal
router, TTS

Feature 4

Phase 6 Weeks 7-8 Analytics scoring
engine, closed-loop
pipeline

Feature 5

Phase 7 Weeks 8-9 Media/code
execution agents,
hallucination checks

Feature 2
(Complete)

Phase 8 Weeks 9-10 Demo deployment,
documentation
audit, final code
package

All Features

9.4 Spark LLM Integration
Core architecture orchestrates via centralized ChatSparkLLM streaming instances over
WebSockets.
9.5 RAG Pipeline Setup
Document chunking maps text to 768-dimensional vector spaces via specialized local
embedding schemas.
9.6 Agent Framework Setup (LangChain)
Uses LangChain ReAct architectures for rapid tool switching and orchestrator planning cycles.
9.7 Streaming API (SSE)
Implemented inside FastAPI frameworks via StreamingResponse mechanics yielding structured
SSE data blocks.
9.8 Deployment Architecture
Service Container Replicas Estimated
Resources
FastAPI Backend python:3.10-slim 2+ 2 CPU, 4GB RAM
per replica
Next.js Frontend node:18-alpine 2+ 1 CPU, 2GB RAM
per replica

PostgreSQL postgres:15 1 (Master) 2 CPU, 8GB RAM

Redis redis:7 1 1 CPU, 2GB RAM
Weaviate (Vector
DB)

semitechnologies/w
eaviate

1 4 CPU, 8GB RAM

Background
Workers

python:3.10-slim 1+ 2 CPU, 4GB RAM
per replica

10 Non-Functional Requirements
10.1 Performance Metrics
Metric Target Measurement Method
Time to First Token (TTFT) &lt; 800ms Frontend performance logs
Resource Generation (Text) &lt; 5s API response times
Resource Generation (+
Video)

&lt; 30s End-to-end timers with

progress bar

Profile Update Latency &lt; 2s Event timestamp delta

profiles

Path Replanning Latency &lt; 3s API response tracking
Concurrent Users (Target) 50 active k6 execution load tests

10.2 Security and Content Quality
Factual error targets must reside below 2%. System enforces strict content sandboxing and
input validation filtering across the open iFLYTEK checking endpoints.
10.3 UI/UX Standards
Demands smooth Markdown rendering, responsive CSS cards, high-contrast code visualization
blocks, and systematic loading skeletons for latency tracking.

11 Competition Scoring Alignment
Evaluation Category Weight How This System Aligns
Innovation &amp; Value 35% Novel Orchestrator-Worker
model; closed-loop feedback
pipeline missing from legacy
tools.

Functionality Depth 45% Executes all 5 mandatory
modules; handles multi-
format media generation
layers.

Documentation Quality 10% Completed via this rigorous
technical layout specification
and attached index maps.
Demo Video Matrix 10% Satisfied using a 7-minute
feature runtime display
summarizing onboarding
and adaptive routing.

12 Appendix
A. Glossary
Term Definition
RAG Retrieval-Augmented Generation — Anchors

LLM output with localized datasets.
SSE Server-Sent Events — HTTP streaming

protocol for token tracking.

NER Named Entity Recognition — Automatic
identification of subjects and entity blocks.
TTS Text-to-Speech — Synthesized audio

streaming conversion matrices.

ASR Automated Speech Recognition — Voice to

text input translations.

Orchestrator Central agent managing task execution and

delegating sub-problem trees.
DXA Document Exchange Absolute Units —
standard Word spacing metric (1440 DXA =
1 inch).

Embedding Dense numeric vector arrays representing

semantic token definitions.

CoT Chain-of-Thought prompting layout maps

guiding model logical steps.

TTFT Time to First Token metrics analyzing initial

platform load latency.

B. iFLYTEK API Endpoints
Endpoints: Spark LLM: wss://spark-api.xf-yun.com/v3.5/chat
Embeddings: https://emb-cn-huabei-1.xf-yun.com/v1/embeddings
Content Check: https://audit.xfyun.cn/v2/
C. References
1. iFLYTEK Developer Documentation (open.xfyun.cn/doc)
2. LangChain Multi-Agent Blueprint Schemes
3. Weaviate Cluster Setup Guidelines
4. China Software Cup Official Competition Track Matrix Rules