"""
LLM Client for the A3 Learning System.

Provides unified interface for multiple LLM providers:
- OpenRouter (Primary - Free tier)
- OpenAI (Optional)
- iFlytek Spark (Optional - for production)

Mock/Demo Mode:
When no API key is available, the client automatically switches to mock mode
and returns realistic demo responses so the system works offline.
"""

import asyncio
import json
import os
import random
from typing import AsyncGenerator, Dict, List, Optional, Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)


# ============================================================================
# Mock Response Templates
# ============================================================================

MOCK_TUTOR_RESPONSE = """Great question! Here's a clear explanation:

{topic} is a fundamental concept in cloud computing. At its core, it involves {concept} to help developers and organizations deploy, manage, and scale applications more efficiently.

**Key Points:**
1. **Definition**: {topic} refers to the practice of packaging and running applications in isolated environments.
2. **Why it matters**: It solves the "it works on my machine" problem by ensuring consistency across environments.
3. **Real-world analogy**: Think of it like shipping containers for software — standardized boxes that can move anywhere.

**Practical Example:**
Imagine you're building a web application. Without {topic}, you'd need to configure servers manually. With it, you define your environment once and deploy anywhere.

**Common Pitfalls:**
- Overcomplicating the initial setup
- Ignoring security best practices
- Not monitoring resource usage

**Sources:** Knowledge Base - Cloud Computing Fundamentals

Follow-up questions you might ask:
1. How does {topic} compare to traditional virtual machines?
2. What are the best practices for securing {topic} deployments?
3. Can you walk me through a hands-on example?"""

MOCK_CONTENT_MARKDOWN = """# {topic}

## Overview
{topic} is one of the most important technologies in modern cloud computing. This lecture covers the core concepts, practical applications, and common pitfalls.

## Key Concepts

### 1. Core Definition
{topic} enables developers to build, ship, and run applications consistently across different environments.

### 2. Architecture
- **Control Plane**: Manages the overall state and configuration
- **Data Plane**: Handles actual workload execution
- **API Layer**: Provides interfaces for external interaction

### 3. Key Components
- Images: Immutable templates for creating instances
- Containers: Lightweight, isolated runtime environments
- Registries: Storage and distribution systems for images
- Orchestrators: Tools for managing container clusters

## Detailed Explanation

{topic} works by abstracting the underlying infrastructure. Instead of worrying about OS versions, dependencies, and hardware differences, developers define their application environment declaratively.

```bash
# Example command
example-cli create --name my-app --image latest
```

## Practical Application
**Scenario**: A startup needs to deploy a microservices architecture.

**Solution**: Using {topic}, they package each service independently, ensuring that the authentication service, API gateway, and database layer all run in consistent environments.

## Common Pitfalls
1. **Over-engineering**: Starting with complex setups for simple apps
2. **Security gaps**: Using default credentials or exposed ports
3. **Resource limits**: Not setting CPU/memory boundaries
4. **Monitoring blind spots**: Lack of observability tooling

## Summary
- {topic} provides consistency across dev, staging, and production
- Start simple and add complexity only when needed
- Always prioritize security and observability
- The learning curve pays off in operational reliability"""

MOCK_QUIZ_JSON = """{{
    "questions": [
        {{
            "id": "q1",
            "type": "multiple_choice",
            "question": "What is the primary benefit of using {topic}?",
            "options": [
                "A. Environment consistency across dev and production",
                "B. Faster CPU performance",
                "C. Elimination of all security risks",
                "D. Cheaper hardware costs"
            ],
            "correct_answer": "A",
            "explanation": "The main benefit is ensuring applications run the same way in every environment.",
            "difficulty": 0.4,
            "topic_tested": "{topic}",
            "hints": ["Think about the 'works on my machine' problem"]
        }},
        {{
            "id": "q2",
            "type": "true_false",
            "question": "{topic} requires the same OS on host and guest systems.",
            "options": ["True", "False"],
            "correct_answer": "False",
            "explanation": "One of the key advantages is flexibility in choosing different base images.",
            "difficulty": 0.5,
            "topic_tested": "{topic}",
            "hints": ["Consider how base images work"]
        }},
        {{
            "id": "q3",
            "type": "open_ended",
            "question": "Describe a real-world scenario where {topic} would solve a critical deployment issue.",
            "options": [],
            "correct_answer": "Any valid scenario describing environment inconsistency",
            "explanation": "Common scenarios include microservices deployment, CI/CD pipelines, and multi-cloud strategies.",
            "difficulty": 0.7,
            "topic_tested": "{topic}",
            "hints": ["Think about teams with different development machines"]
        }}
    ],
    "estimated_time_minutes": 15,
    "total_points": 100,
    "focus_areas": ["{topic}", "deployment"]
}}"""

MOCK_MINDMAP_MARKDOWN = """# Mind Map: {topic}

## Central Concept
- **{topic}**

## Core Branches

### 1. Fundamentals
- Definition and history
- Key terminology
- Architecture overview

### 2. Components
- Images and layers
- Runtime environment
- Networking model
- Storage options

### 3. Operations
- Building and packaging
- Running and managing
- Monitoring and logging
- Scaling strategies

### 4. Ecosystem
- Orchestration tools
- CI/CD integration
- Cloud provider services
- Community resources

### 5. Best Practices
- Security hardening
- Resource optimization
- Multi-stage builds
- Health checks"""

MOCK_CODE_EXERCISE_JSON = """{{
    "exercise": {{
        "title": "Build a Simple {topic} Application",
        "difficulty": "intermediate",
        "estimated_time_minutes": 30,
        "instructions": "Create a small application that demonstrates core {topic} concepts. Include proper configuration, multi-stage build, and health checks.",
        "starter_code": "# Starter template\\nFROM base-image:latest\\n\\nWORKDIR /app\\n\\nCOPY . .\\n\\nCMD [\\\"start\\\"]",
        "solution": "# Optimized solution with multi-stage build\\nFROM builder:latest AS build\\nWORKDIR /app\\nCOPY package*.json ./\\nRUN install-deps\\nCOPY . .\\nRUN build\\n\\nFROM runtime:latest\\nWORKDIR /app\\nCOPY --from=build /app/dist ./dist\\nEXPOSE 8080\\nHEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8080/health\\nCMD [\\\"start\\\"]",
        "test_cases": [
            "Container builds successfully",
            "Application responds on port 8080",
            "Health check endpoint returns 200",
            "Image size is under 200MB"
        ],
        "learning_objectives": [
            "Understand multi-stage builds",
            "Implement health checks",
            "Optimize image size",
            "Configure networking"
        ]
    }}
}}"""

MOCK_MEDIA_MARKDOWN = """# Recommended Media for {topic}

## Video Tutorials
1. **"{topic} Explained in 100 Seconds"** - Fireship (YouTube)
   - Perfect for visual learners
   - Quick overview of core concepts

2. **"Complete {topic} Course for Beginners"** - freeCodeCamp (YouTube)
   - 3-hour deep dive
   - Hands-on labs included

3. **"{topic} Patterns and Best Practices"** - AWS Events (YouTube)
   - Advanced topics
   - Real-world case studies

## Interactive Labs
- Katacoda {topic} Scenarios
- Play with {topic} (Browser-based)
- Cloud Academy Labs

## Documentation
- Official Documentation
- Cheat Sheets
- Architecture Patterns Guide"""

MOCK_PROFILE_EXTRACTION_JSON = """{{
    "extractions": [
        {{
            "dimension": "knowledge_base",
            "value": {{"cloud_computing": 0.6, "containers": 0.4}},
            "confidence": 0.7,
            "evidence_quote": "I have some experience with cloud technologies"
        }},
        {{
            "dimension": "cognitive_style",
            "value": "visual",
            "confidence": 0.8,
            "evidence_quote": "I prefer watching videos and looking at diagrams"
        }},
        {{
            "dimension": "learning_pace",
            "value": 0.5,
            "confidence": 0.6,
            "evidence_quote": "I like to take my time with new concepts"
        }}
    ],
    "analysis": "Student has intermediate cloud knowledge and prefers visual learning at a moderate pace."
}}"""


def _extract_topic_from_message(message: str) -> str:
    """Extract the main topic from a user/system message."""
    message_lower = message.lower()
    topics = [
        "docker", "kubernetes", "container", "microservice",
        "devops", "serverless", "cloud computing", "terraform",
        "aws", "azure", "gcp", "ci/cd", "monitoring", "security"
    ]
    for topic in topics:
        if topic in message_lower:
            return topic.title()
    # Try to extract from quotes
    if "**" in message:
        parts = message.split("**")
        if len(parts) > 1:
            return parts[1].strip()
    return "Cloud Computing"


def _generate_smart_profile_extraction(messages: List[Dict[str, str]]) -> str:
    """Generate profile extraction by analyzing user message keywords."""
    # Get the last user message
    user_msg = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_msg = msg.get("content", "").lower()
            break
    
    original_msg = user_msg  # Keep original for evidence quotes
    extractions = []
    
    # Knowledge base detection - extract ALL mentioned topics with mastery levels
    knowledge_base = {}
    knowledge_patterns = [
        ("python", 0.7), ("javascript", 0.6), ("java", 0.6), ("c++", 0.6),
        ("data structures", 0.7), ("arrays", 0.7), ("linked lists", 0.7),
        ("algorithms", 0.5), ("docker", 0.6), ("kubernetes", 0.5),
        ("aws", 0.6), ("azure", 0.5), ("cloud", 0.5), ("linux", 0.4),
        ("sql", 0.6), ("database", 0.5), ("react", 0.6), ("node", 0.5),
    ]
    
    # Check for mastery indicators
    high_mastery = ["comfortable", "good at", "know well", "experienced", "proficient"]
    low_mastery = ["basic", "beginner", "learning", "new to", "starting"]
    
    for keyword, base_score in knowledge_patterns:
        if keyword in user_msg:
            score = base_score
            # Adjust based on mastery indicators
            if any(h in user_msg for h in high_mastery):
                score = min(0.9, score + 0.2)
            elif any(l in user_msg for l in low_mastery):
                score = max(0.2, score - 0.2)
            knowledge_base[keyword] = score
    
    if knowledge_base:
        extractions.append({
            "dimension": "knowledge_base",
            "value": knowledge_base,
            "confidence": 0.8,
            "evidence_quote": f"User mentioned knowledge in: {', '.join(knowledge_base.keys())}"
        })
    
    # Cognitive style detection
    if any(w in user_msg for w in ["video", "watch", "visual", "see", "diagram"]):
        extractions.append({
            "dimension": "cognitive_style",
            "value": "visual",
            "confidence": 0.85,
            "evidence_quote": "User prefers visual learning"
        })
    elif any(w in user_msg for w in ["read", "document", "text", "article"]):
        extractions.append({
            "dimension": "cognitive_style",
            "value": "verbal",
            "confidence": 0.8,
            "evidence_quote": "User prefers reading"
        })
    elif any(w in user_msg for w in ["hands-on", "practice", "interactive", "code", "build", "project"]):
        extractions.append({
            "dimension": "cognitive_style",
            "value": "kinesthetic",
            "confidence": 0.85,
            "evidence_quote": "User prefers hands-on learning"
        })
    
    # Goals detection - extract SPECIFIC goals with context
    goals = []
    if "internship" in user_msg:
        goals.append("Prepare for internship")
    if "job" in user_msg or "career" in user_msg:
        goals.append("Career advancement")
    if "certif" in user_msg:
        goals.append("Get certified")
    if "aws" in user_msg and ("learn" in user_msg or "want" in user_msg):
        goals.append("Learn AWS")
    if "cloud" in user_msg and ("learn" in user_msg or "want" in user_msg):
        goals.append("Learn cloud computing")
    if not goals and any(w in user_msg for w in ["learn", "understand", "master"]):
        goals.append("Skill development")
    
    if goals:
        extractions.append({
            "dimension": "goals",
            "value": goals,
            "confidence": 0.8,
            "evidence_quote": f"User goals: {', '.join(goals)}"
        })
    
    # Weak points detection - extract SPECIFIC struggles
    weak_points = []
    struggle_indicators = ["struggle", "hard", "difficult", "confuse", "forget", "challenge", "weak"]
    
    if any(s in user_msg for s in struggle_indicators):
        # Check for specific topics mentioned with struggle
        weak_topics = [
            ("dynamic programming", "Dynamic programming"),
            ("graph", "Graph algorithms"),
            ("linux", "Linux commands"),
            ("algorithm", "Algorithms"),
            ("networking", "Networking"),
            ("database", "Database design"),
            ("recursion", "Recursion"),
        ]
        for pattern, name in weak_topics:
            if pattern in user_msg:
                weak_points.append(name)
    
    if weak_points:
        extractions.append({
            "dimension": "weak_points",
            "value": weak_points,
            "confidence": 0.85,
            "evidence_quote": f"User struggles with: {', '.join(weak_points)}"
        })
    
    # Learning pace detection
    pace = None
    if any(w in user_msg for w in ["hour", "week", "day", "time"]):
        pace = 0.5
        if any(w in user_msg for w in ["1-2", "1 hour", "2 hour", "slow", "thorough", "take my time"]):
            pace = 0.25
        elif any(w in user_msg for w in ["5", "10", "few"]):
            pace = 0.4
        elif any(w in user_msg for w in ["20", "30", "full", "intensive", "fast"]):
            pace = 0.8
        extractions.append({
            "dimension": "learning_pace",
            "value": pace,
            "confidence": 0.75,
            "evidence_quote": "User mentioned time commitment"
        })
    
    # Content preferences detection - extract ALL mentioned preferences
    content_prefs = []
    if any(w in user_msg for w in ["video", "watch"]):
        content_prefs.append("Videos")
    if any(w in user_msg for w in ["diagram", "visual"]):
        content_prefs.append("Diagrams")
    if any(w in user_msg for w in ["interactive", "hands-on", "exercise", "practice"]):
        content_prefs.append("Interactive exercises")
    if any(w in user_msg for w in ["read", "article", "text", "document"]):
        content_prefs.append("Reading materials")
    if any(w in user_msg for w in ["code", "coding", "project"]):
        content_prefs.append("Coding projects")
    
    if content_prefs:
        extractions.append({
            "dimension": "content_preferences",
            "value": content_prefs,
            "confidence": 0.85,
            "evidence_quote": f"User prefers: {', '.join(content_prefs)}"
        })
    
    # Build the response
    analysis = "Analyzed user message for profile dimensions."
    if extractions:
        dims = [e["dimension"] for e in extractions]
        analysis = f"Extracted {len(extractions)} dimensions: {', '.join(dims)}"
    else:
        analysis = "No specific profile information found in this message."
    
    return json.dumps({
        "extractions": extractions,
        "analysis": analysis
    })


def _detect_response_type(messages: List[Dict[str, str]]) -> str:
    """Detect what kind of response is expected based on messages."""
    full_text = " ".join(m.get("content", "") for m in messages).lower()

    if "extractions" in full_text and "dimension" in full_text:
        return "profile_extraction"
    if "profiling" in full_text or "learning profile" in full_text or "a3" in full_text:
        return "profiling_conversation"
    if "quiz" in full_text and "json" in full_text:
        return "quiz"
    if "lecture notes" in full_text or "content creator" in full_text:
        return "content"
    if "mind map" in full_text or "mindmap" in full_text:
        return "mindmap"
    if "code" in full_text and ("exercise" in full_text or "programming" in full_text):
        return "code"
    if "video" in full_text and ("media" in full_text or "recommended" in full_text):
        return "media"
    if "tutor" in full_text or "knowledge base" in full_text:
        return "tutor"
    return "text"


def _generate_mock_response(messages: List[Dict[str, str]]) -> str:
    """Generate a realistic mock response based on the conversation context."""
    response_type = _detect_response_type(messages)
    topic = _extract_topic_from_message(" ".join(m.get("content", "") for m in messages))
    concept = "abstracting infrastructure complexities"

    if "docker" in topic.lower() or "container" in topic.lower():
        concept = "packaging applications with their dependencies"
    elif "kubernetes" in topic.lower() or "k8s" in topic.lower():
        concept = "orchestrating container workloads at scale"
    elif "serverless" in topic.lower():
        concept = "running code without managing servers"
    elif "microservice" in topic.lower():
        concept = "breaking applications into independently deployable services"
    elif "devops" in topic.lower():
        concept = "combining development and operations practices"

    if response_type == "profile_extraction":
        return _generate_smart_profile_extraction(messages)
    elif response_type == "profiling_conversation":
        # Generate a simple profiling response
        import random
        responses = [
            "That's great to hear! How do you prefer to learn - through videos, reading, or hands-on practice?",
            "Interesting! What's your main goal - getting certified, switching careers, or building projects?",
            "Got it! How much time can you dedicate to learning each week?",
            "Thanks for sharing! Are there any specific topics you find challenging?",
            "Perfect! Do you prefer short bite-sized content or longer deep-dive tutorials?",
        ]
        return random.choice(responses)
    elif response_type == "quiz":
        return MOCK_QUIZ_JSON.format(topic=topic)
    elif response_type == "content":
        return MOCK_CONTENT_MARKDOWN.format(topic=topic)
    elif response_type == "mindmap":
        return MOCK_MINDMAP_MARKDOWN.format(topic=topic)
    elif response_type == "code":
        return MOCK_CODE_EXERCISE_JSON.format(topic=topic)
    elif response_type == "media":
        return MOCK_MEDIA_MARKDOWN.format(topic=topic)
    else:
        return MOCK_TUTOR_RESPONSE.format(topic=topic, concept=concept)


# ============================================================================
# OpenRouter Client
# ============================================================================

class OpenRouterClient:
    """
    OpenRouter LLM Client - Free tier available.

    Supports models: meta-llama/llama-3.1-70b, google/gemini-pro, etc.
    """

    def __init__(self, api_key: Optional[str] = None, fallback_keys: Optional[List[str]] = None):
        # Build the ordered list of keys to try: primary first, then any
        # fallbacks. De-duplicates and strips empties so misconfiguration is
        # tolerated.
        primary = api_key or settings.llm.api_key
        configured_fallbacks = fallback_keys or []
        if settings.llm.api_key_fallback:
            configured_fallbacks = [*configured_fallbacks, settings.llm.api_key_fallback]

        seen = set()
        self.api_keys: List[str] = []
        for k in [primary, *configured_fallbacks]:
            if k and k not in seen:
                self.api_keys.append(k)
                seen.add(k)

        self.api_key = self.api_keys[0] if self.api_keys else None
        self._active_key_idx = 0
        self.base_url = "https://openrouter.ai/api/v1"

        if not self.api_key:
            logger.warning("OpenRouter API key not set. LLM features will not work.")
        elif len(self.api_keys) > 1:
            logger.info(f"OpenRouter initialized with {len(self.api_keys)} keys (1 primary + {len(self.api_keys) - 1} fallback)")

    def _headers_for(self, key: str) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {key}",
            "HTTP-Referer": "https://a3-learning.local",
            "X-Title": "A3 Learning System",
            "Content-Type": "application/json",
        }

    @property
    def headers(self) -> Dict[str, str]:
        """Headers for the currently active key (kept for backwards compat)."""
        return self._headers_for(self.api_key) if self.api_key else {}

    async def generate(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Generate text completion.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model identifier (default from settings)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            stream: Whether to stream response

        Returns:
            API response dict
        """
        model = model or settings.llm.model

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }

        # Retry on 429 (rate limit), 5xx, and transient network/timeouts.
        # Free-tier LLM endpoints are unreliable under concurrent load.
        # Additionally, rotate to a fallback API key on 401/403 (invalid/
        # revoked key) or persistent 429 (quota exhausted on that key).
        last_exc: Optional[Exception] = None
        per_key_attempts = 3

        for key_idx, key in enumerate(self.api_keys or [None]):
            if not key:
                break
            self._active_key_idx = key_idx
            self.api_key = key
            key_headers = self._headers_for(key)
            key_label = "primary" if key_idx == 0 else f"fallback#{key_idx}"
            should_rotate_key = False

            for attempt in range(per_key_attempts):
                try:
                    async with httpx.AsyncClient(timeout=240.0) as client:
                        response = await client.post(
                            f"{self.base_url}/chat/completions",
                            headers=key_headers,
                            json=payload
                        )
                        # Auth/quota errors for this specific key — rotate.
                        if response.status_code in (401, 403):
                            logger.warning(
                                f"OpenRouter {response.status_code} on {key_label} "
                                f"key — rotating to next key if available"
                            )
                            should_rotate_key = True
                            break
                        # Retry on rate limit or server errors
                        if response.status_code == 429 or response.status_code >= 500:
                            retry_after = response.headers.get("retry-after")
                            wait_s = float(retry_after) if retry_after else (2 ** attempt) * 2
                            logger.warning(
                                f"OpenRouter {response.status_code} on {key_label} "
                                f"(attempt {attempt + 1}/{per_key_attempts}), "
                                f"retrying in {wait_s:.1f}s"
                            )
                            await asyncio.sleep(min(wait_s, 30.0))
                            # On the final 429 for this key, rotate so the
                            # next key gets a shot instead of just failing.
                            if response.status_code == 429 and attempt == per_key_attempts - 1:
                                should_rotate_key = True
                            continue
                        response.raise_for_status()
                        if key_idx > 0:
                            logger.info(f"OpenRouter request succeeded using {key_label} key")
                        return response.json()
                except (httpx.TimeoutException, httpx.NetworkError) as e:
                    last_exc = e
                    wait_s = (2 ** attempt) * 2
                    logger.warning(
                        f"OpenRouter network/timeout on {key_label} "
                        f"(attempt {attempt + 1}/{per_key_attempts}): {e}, "
                        f"retrying in {wait_s}s"
                    )
                    await asyncio.sleep(wait_s)
                    continue

            if not should_rotate_key:
                # Exhausted retries for this key with non-auth errors only;
                # try next key anyway in case it's transient upstream issue.
                logger.warning(f"OpenRouter: exhausted retries on {key_label} key, trying next")

        # If we exhausted all keys, surface the last error
        if last_exc:
            raise last_exc
        raise RuntimeError("OpenRouter: all API keys exhausted without a successful response")

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AsyncGenerator[str, None]:
        """
        Stream text completion tokens with retry logic for rate limits.

        Args:
            messages: List of message dicts
            model: Model identifier
            temperature: Sampling temperature
            max_tokens: Maximum tokens

        Yields:
            Text chunks as they are generated
        """
        model = model or settings.llm.model

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True
        }

        # Retry logic for rate limits (429) and server errors (5xx)
        max_retries = 3
        last_exc = None
        
        for key_idx, key in enumerate(self.api_keys or [None]):
            if not key:
                break
            
            headers = self._headers_for(key)
            key_label = f"key[{key_idx}]"
            
            for attempt in range(max_retries):
                try:
                    async with httpx.AsyncClient(timeout=240.0) as client:
                        async with client.stream(
                            "POST",
                            f"{self.base_url}/chat/completions",
                            headers=headers,
                            json=payload
                        ) as response:
                            if response.status_code == 429 or response.status_code >= 500:
                                retry_after = response.headers.get("retry-after")
                                wait_s = float(retry_after) if retry_after else (2 ** attempt) * 2
                                logger.warning(
                                    f"OpenRouter stream {response.status_code} on {key_label} "
                                    f"(attempt {attempt + 1}/{max_retries}), "
                                    f"retrying in {wait_s:.1f}s"
                                )
                                await asyncio.sleep(min(wait_s, 30.0))
                                continue
                            
                            response.raise_for_status()
                            
                            async for line in response.aiter_lines():
                                if line.startswith("data: "):
                                    data = line[6:]
                                    if data == "[DONE]":
                                        return
                                    try:
                                        chunk = json.loads(data)
                                        if "choices" in chunk and len(chunk["choices"]) > 0:
                                            delta = chunk["choices"][0].get("delta", {})
                                            if "content" in delta:
                                                yield delta["content"]
                                    except json.JSONDecodeError:
                                        continue
                            return  # Successfully completed
                            
                except (httpx.TimeoutException, httpx.ConnectError) as e:
                    wait_s = (2 ** attempt) * 2
                    logger.warning(
                        f"OpenRouter stream network error on {key_label} "
                        f"(attempt {attempt + 1}/{max_retries}): {e}, "
                        f"retrying in {wait_s}s"
                    )
                    last_exc = e
                    await asyncio.sleep(wait_s)
                    continue
            
            # All retries exhausted for this key, try next key
            logger.warning(f"OpenRouter stream: exhausted retries for {key_label}, trying next key")
        
        # All keys exhausted
        if last_exc:
            raise last_exc
        raise RuntimeError("OpenRouter stream: all API keys exhausted")

    async def get_embeddings(
        self,
        texts: List[str],
        model: str = None
    ) -> List[List[float]]:
        """
        Get embeddings for texts.

        Args:
            texts: List of texts to embed
            model: Embedding model identifier

        Returns:
            List of embedding vectors
        """
        model = model or settings.llm.embedding_model

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/embeddings",
                headers=self.headers,
                json={
                    "model": model,
                    "input": texts
                }
            )
            response.raise_for_status()
            data = response.json()
            return [item["embedding"] for item in data["data"]]

    async def validate_api_key(self) -> bool:
        """Check if API key is valid."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/auth/key",
                    headers=self.headers
                )
                return response.status_code == 200
        except Exception:
            return False


# ============================================================================
# GLM Client (Zhipu AI)
# ============================================================================

class GLMClient:
    """
    Zhipu AI GLM Client.
    
    Uses the GLM API for text generation (GLM-4, GLM-5.1, etc.)
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GLM_API_KEY")
        self.base_url = "https://open.bigmodel.cn/api/paas/v4"
        self.model = "glm-4-flash"  # Free tier model
        
        if self.api_key:
            logger.info("GLMClient initialized")

    async def generate(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False
    ) -> Dict[str, Any]:
        """Generate text completion using GLM API."""
        model = model or self.model
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "choices": data.get("choices", []),
                "usage": data.get("usage", {}),
                "provider": "glm"
            }

    async def validate_api_key(self) -> bool:
        """Check if API key is valid by making a simple request."""
        try:
            # Make a minimal request to validate
            result = await self.generate(
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=5
            )
            return "choices" in result
        except Exception:
            return False


# ============================================================================
# Gemini Client (Google AI)
# ============================================================================

class GeminiClient:
    """
    Google Gemini LLM Client.
    
    Uses the Gemini API for text generation.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self.model = "gemini-2.0-flash"
        
        if self.api_key:
            logger.info("GeminiClient initialized")

    async def generate(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False
    ) -> Dict[str, Any]:
        """Generate text completion using Gemini API."""
        model = model or self.model
        
        # Convert messages to Gemini format
        contents = []
        system_instruction = None
        
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role == "system":
                system_instruction = content
            else:
                gemini_role = "user" if role == "user" else "model"
                contents.append({
                    "role": gemini_role,
                    "parts": [{"text": content}]
                })
        
        # Gemini requires at least one content item
        if not contents:
            contents.append({
                "role": "user",
                "parts": [{"text": "Please respond based on your instructions."}]
            })
        
        # Build request payload
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            }
        }
        
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
        
        url = f"{self.base_url}/models/{model}:generateContent?key={self.api_key}"
        
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            
            # Extract text from Gemini response
            text = ""
            if "candidates" in data and len(data["candidates"]) > 0:
                candidate = data["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    text = candidate["content"]["parts"][0].get("text", "")
            
            return {
                "choices": [{"message": {"content": text}}],
                "usage": data.get("usageMetadata", {}),
                "provider": "gemini"
            }

    async def validate_api_key(self) -> bool:
        """Check if API key is valid."""
        try:
            url = f"{self.base_url}/models?key={self.api_key}"
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                return response.status_code == 200
        except Exception:
            return False


# ============================================================================
# Kimi Client (OpenAI-compatible API)
# ============================================================================

class KimiClient:
    """
    Kimi LLM Client - OpenAI-compatible API.
    
    Uses the kimi-2.6 model via OpenAI-compatible endpoint.
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.getenv("KIMI_API_KEY", "sk-xJuTUc3KAhsnnrtRTuNjewyaorAGCwtPaSe2pyogHdTHm4Wb")
        self.base_url = base_url or os.getenv("KIMI_BASE_URL", "https://api.xixixixi.cloud")
        self.model = "kimi-k2.5"
        
        if self.api_key:
            logger.info(f"KimiClient initialized with base URL: {self.base_url}")

    async def generate(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False
    ) -> Dict[str, Any]:
        """Generate text completion using Kimi API (OpenAI-compatible)."""
        model = model or self.model

        # kimi-k2.5 only accepts temperature=1.0
        if model == "kimi-k2.5":
            temperature = 1.0

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }
        
        url = f"{self.base_url}/v1/chat/completions"
        
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            
            return {
                "choices": data.get("choices", []),
                "usage": data.get("usage", {}),
                "provider": "kimi"
            }

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AsyncGenerator[str, None]:
        """Stream text completion using Kimi API."""
        model = model or self.model

        # kimi-k2.5 only accepts temperature=1.0
        if model == "kimi-k2.5":
            temperature = 1.0

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True
        }
        
        url = f"{self.base_url}/v1/chat/completions"
        
        async with httpx.AsyncClient(timeout=180.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            continue

    async def validate_api_key(self) -> bool:
        """Check if API key is valid."""
        try:
            result = await self.generate(
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=5
            )
            return "choices" in result
        except Exception as e:
            logger.error(f"Kimi API validation failed: {e}")
            return False


# ============================================================================
# Mock LLM Client (Demo / Offline Mode)
# ============================================================================

class MockLLMClient:
    """
    Mock LLM client for demo and offline use.

    Automatically activated when no OpenRouter API key is configured.
    Returns realistic demo responses for all agent types.
    """

    def __init__(self):
        logger.info("MockLLMClient initialized (demo mode)")

    async def generate(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stream: bool = False
    ) -> Dict[str, Any]:
        """Generate a mock completion."""
        response_text = _generate_mock_response(messages)

        return {
            "choices": [{"message": {"content": response_text}}],
            "usage": {"prompt_tokens": 150, "completion_tokens": len(response_text.split())},
            "mock": True
        }

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> AsyncGenerator[str, None]:
        """Stream a mock response word by word."""
        response_text = _generate_mock_response(messages)
        words = response_text.split()

        for i, word in enumerate(words):
            if i < len(words) - 1:
                yield word + " "
            else:
                yield word

    async def get_embeddings(
        self,
        texts: List[str],
        model: str = None
    ) -> List[List[float]]:
        """Return deterministic pseudo-embeddings for demo."""
        embeddings = []
        for text in texts:
            # Deterministic pseudo-embedding based on text hash
            seed = hash(text) % 10000
            rng = random.Random(seed)
            embedding = [rng.random() for _ in range(384)]
            embeddings.append(embedding)
        return embeddings

    async def validate_api_key(self) -> bool:
        """Mock client is always 'healthy' for demo purposes."""
        return True


# ============================================================================
# Unified LLM Client
# ============================================================================

class LLMClient:
    """
    Unified LLM client using Kimi as the sole provider.

    Uses Kimi 2.6 for all LLM operations (text and multimodal).
    """

    def __init__(self):
        self.kimi = KimiClient()
        self.mock = MockLLMClient()
        
        # Use Kimi only
        if self.kimi.api_key:
            self.primary = self.kimi
            self.use_mock = False
            logger.info("=" * 60)
            logger.info("LLM Client initialized with Kimi 2.6")
            logger.info(f"Base URL: {self.kimi.base_url}")
            logger.info("=" * 60)
        else:
            self.primary = self.mock
            self.use_mock = True
            logger.warning("=" * 60)
            logger.warning("RUNNING IN DEMO/MOCK MODE")
            logger.warning("No KIMI_API_KEY found")
            logger.warning("=" * 60)

    async def generate(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate text completion using configured provider.

        Falls back to mock mode if no API keys are configured.
        """
        if self.use_mock:
            logger.warning("Using mock LLM response - no API keys configured")
            return await self.mock.generate(messages, **kwargs)

        return await self.primary.generate(messages, **kwargs)

    async def generate_stream(
        self,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream text completion."""
        if self.use_mock:
            logger.warning("Using mock LLM stream - no API keys configured")
            async for chunk in self.mock.generate_stream(messages, **kwargs):
                yield chunk
            return

        async for chunk in self.primary.generate_stream(messages, **kwargs):
            yield chunk

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for texts."""
        if self.use_mock:
            raise RuntimeError("LLM running in demo/mock mode. Set a real API key.")
        return await self.primary.get_embeddings(texts)

    async def health_check(self) -> Dict[str, Any]:
        """Check LLM service health."""
        if self.use_mock:
            return {
                "provider": "mock",
                "status": "healthy",
                "mode": "demo",
                "note": "Set KIMI_API_KEY for real LLM responses"
            }
        
        return {
            "provider": "kimi",
            "status": "healthy",
            "model": self.kimi.model,
            "base_url": self.kimi.base_url
        }


# Global LLM client instance
llm_client = LLMClient()
