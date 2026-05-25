"""
AI Tutoring Engine for the A3 Learning System.

Provides context-aware tutoring with RAG grounding, streaming responses,
and multimodal routing based on student profile and question type.
"""

import re
from typing import Any, AsyncGenerator, Dict, List, Optional

from core.llm_client import llm_client
from core.logging import get_logger
from core.faithfulness_checker import faithfulness_checker
from rag.vector_store import get_vector_store

logger = get_logger(__name__)


class TutorEngine:
    """Context-aware AI tutoring engine with RAG grounding."""

    def __init__(self):
        self.vector_store = get_vector_store()
        self.max_context_turns = 5
        self.max_rag_chunks = 3

    async def answer(
        self,
        question: str,
        profile: Dict[str, Any],
        current_topic: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        previous_mastery: Optional[float] = None,
        learning_path: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Generate a tutoring answer with RAG grounding.

        Args:
            question: Student's question
            profile: Student profile dict
            current_topic: Current topic node ID
            history: List of previous turns [{"role": "user|assistant", "content": "..."}]

        Returns:
            Dict with answer, sources, response_type, suggested_followups
        """
        # Retrieve RAG chunks
        rag_chunks = await self._retrieve_chunks(question, current_topic)

        # Build prompt
        messages = self._build_messages(
            question, profile, rag_chunks, current_topic, history,
            previous_mastery=previous_mastery,
            learning_path=learning_path,
        )

        # Generate response
        try:
            response = await llm_client.generate(
                messages=messages,
                temperature=0.7,  # Slightly higher for more personality
                max_tokens=2500   # Allow for richer responses
            )
            # Defensive parsing of response
            if isinstance(response, dict):
                if "choices" in response and len(response["choices"]) > 0:
                    choice = response["choices"][0]
                    if "message" in choice and "content" in choice["message"]:
                        answer = choice["message"]["content"]
                    elif "text" in choice:
                        answer = choice["text"]
                    else:
                        logger.error(f"Unexpected response structure: {choice.keys()}")
                        answer = "I received an unexpected response format. Please try again."
                elif "error" in response:
                    logger.error(f"LLM API error: {response['error']}")
                    answer = "I'm experiencing technical difficulties. Please try again in a moment."
                else:
                    logger.error(f"Unexpected response keys: {response.keys()}")
                    answer = "I received an unexpected response. Please try again."
            else:
                logger.error(f"Response is not a dict: {type(response)}")
                answer = "I received an invalid response. Please try again."
        except Exception as e:
            logger.error(f"Tutor generation failed: {e}")
            answer = "Oh no! 🤔 I'm having a little trouble thinking right now. Let me try again in just a moment!"

        # Check faithfulness against source chunks
        faithfulness_result = await faithfulness_checker.check_faithfulness(
            generated_text=answer,
            source_chunks=[{"id": c["chunk_id"], "text": c["text"], "source": c["source"]} for c in rag_chunks],
            context=current_topic,
        )

        # Prepend warning if content has low faithfulness
        if faithfulness_result.warning_message:
            answer = f"⚠️ {faithfulness_result.warning_message}\n\n{answer}"

        # Detect response type
        response_type = self._detect_response_type(question, profile)

        # Extract follow-up suggestions
        followups = self._extract_followups(answer)

        return {
            "answer": answer,
            "response_type": response_type,
            "sources": rag_chunks,
            "current_topic": current_topic,
            "suggested_followups": followups,
            "faithfulness": {
                "score": faithfulness_result.score,
                "verified": faithfulness_result.score >= faithfulness_checker.threshold,
                "total_claims": faithfulness_result.total_claims,
                "supported_claims": faithfulness_result.supported_count,
                "unverifiable_claims": faithfulness_result.unverifiable_count,
                "citations": faithfulness_result.citations,
            },
        }

    async def answer_stream(
        self,
        question: str,
        profile: Dict[str, Any],
        current_topic: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        previous_mastery: Optional[float] = None,
        learning_path: Optional[List[Dict[str, Any]]] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream a tutoring answer with RAG grounding.

        Yields:
            Dict events: {"event": "start|delta|sources|faithfulness|complete", "data": ...}
        """
        # Retrieve RAG chunks first
        rag_chunks = await self._retrieve_chunks(question, current_topic)
        yield {"event": "sources", "data": rag_chunks}

        # Build prompt
        messages = self._build_messages(
            question, profile, rag_chunks, current_topic, history,
            previous_mastery=previous_mastery,
            learning_path=learning_path,
        )

        # Stream response
        yield {"event": "start", "data": None}

        full_response = ""
        try:
            async for delta in llm_client.generate_stream(
                messages=messages,
                temperature=0.7,  # Slightly higher for more personality
                max_tokens=2500   # Allow for richer responses
            ):
                full_response += delta
                yield {"event": "delta", "data": delta}
        except Exception as e:
            logger.error(f"Tutor streaming failed: {e}")
            yield {"event": "error", "data": str(e)}
            return

        # Check faithfulness after full response is received
        faithfulness_result = await faithfulness_checker.check_faithfulness(
            generated_text=full_response,
            source_chunks=[{"id": c["chunk_id"], "text": c["text"], "source": c["source"]} for c in rag_chunks],
            context=current_topic,
        )

        # Yield faithfulness result for frontend to display badges
        yield {
            "event": "faithfulness",
            "data": {
                "score": faithfulness_result.score,
                "verified": faithfulness_result.score >= faithfulness_checker.threshold,
                "total_claims": faithfulness_result.total_claims,
                "supported_claims": faithfulness_result.supported_count,
                "unverifiable_claims": faithfulness_result.unverifiable_count,
                "citations": faithfulness_result.citations,
                "warning_message": faithfulness_result.warning_message,
            }
        }

        yield {"event": "complete", "data": None}

    async def _retrieve_chunks(
        self,
        query: str,
        node_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant RAG chunks for the query."""
        results = []

        # Try embedding-based search first
        try:
            embeddings = await llm_client.get_embeddings([query])
            query_embedding = embeddings[0]
            results = self.vector_store.search(
                query_embedding=query_embedding,
                top_k=self.max_rag_chunks,
                node_id=node_id
            )
        except Exception as e:
            logger.debug(f"Embedding search failed: {e}")

        # Fallback to keyword search if no results or embeddings failed
        if not results and hasattr(self.vector_store, "search_by_text"):
            try:
                results = self.vector_store.search_by_text(
                    query=query,
                    top_k=self.max_rag_chunks,
                    node_id=node_id
                )
            except Exception as e:
                logger.debug(f"Keyword search failed: {e}")

        chunks = []
        for item in results:
            chunks.append({
                "chunk_id": item.get("chunk_id", ""),
                "node_id": item.get("node_id", ""),
                "text": item.get("text", ""),
                "source": item.get("source", ""),
            })
        return chunks

    def _build_messages(
        self,
        question: str,
        profile: Dict[str, Any],
        rag_chunks: List[Dict[str, Any]],
        current_topic: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        learning_path: Optional[List[Dict[str, Any]]] = None,
        previous_mastery: Optional[float] = None,
    ) -> List[Dict[str, str]]:
        """Build the LLM message list with system prompt and context."""
        cognitive_style = profile.get("cognitive_style", "mixed")
        weak_points = profile.get("weak_points", [])
        knowledge_base = profile.get("knowledge_base", {})
        student_name = profile.get("name", "there")

        # Compute current topic mastery (fuzzy lookup like path_planner)
        topic_mastery = self._get_topic_mastery(current_topic, knowledge_base)

        # Detect mastery milestone
        mastery_celebration = ""
        if previous_mastery is not None and topic_mastery > previous_mastery:
            if previous_mastery < 0.8 and topic_mastery >= 0.8:
                mastery_celebration = f"\n🎉 CELEBRATION: The student just mastered {current_topic}! Acknowledge this achievement enthusiastically!"
            elif previous_mastery < 0.5 and topic_mastery >= 0.5:
                mastery_celebration = f"\n👏 MILESTONE: The student just crossed 50% mastery in {current_topic}! Encourage them!"

        # Check if current topic is a weak point (substring matching)
        topic_lower = (current_topic or "").lower()
        is_weak_point = False
        weak_point_note = ""
        if weak_points and topic_lower:
            is_weak_point = any(
                wp.lower() == topic_lower
                or wp.lower() in topic_lower
                or topic_lower in wp.lower()
                for wp in weak_points
            )
        if is_weak_point:
            weak_point_note = f"\n⚠️ FOCUS AREA: {current_topic} is one of the student's weak points. Provide EXTRA scaffolding, encouragement, and reassurance."

        # Build learning path context
        path_context = ""
        if learning_path:
            completed = [n for n in learning_path if n.get("status") == "completed"]
            current_nodes = [n for n in learning_path if n.get("status") == "current"]
            locked = [n for n in learning_path if n.get("status") == "locked"]

            path_context = f"\n📚 Learning Journey Context:"
            path_context += f"\n- Completed: {len(completed)} topics"
            if current_nodes:
                path_context += f"\n- Currently learning: {current_nodes[0].get('title', current_topic)}"
            if locked:
                path_context += f"\n- Coming up next: {locked[0].get('title', 'next topic')}"

        # Format RAG context
        rag_text = "\n\n".join(
            f"[Source: {c['source']}]\n{c['text']}" for c in rag_chunks
        ) if rag_chunks else "No relevant knowledge base entries found."

        # Cognitive style specific instructions
        visual_instructions = """
For VISUAL learners:
- Use spatial language ("imagine this layered like...", "picture a hierarchy where...")
- Offer ASCII diagrams for complex architectures (servers, containers, networks)
- Describe visual metaphors ("think of it like a Russian nesting doll...")
- Include "Visual Summary" sections that describe what a diagram would show
- Use formatting that creates visual structure (borders, spacing, alignment hints)
- **GENERATE MERMAID DIAGRAMS** for complex concepts - wrap in ```mermaid blocks"""

        verbal_instructions = """
For VERBAL learners:
- Use storytelling frameworks ("Imagine you're a developer facing this challenge...")
- Include wordplay, memorable phrases, and mnemonics
- Use rich analogies that connect to everyday experiences
- Create narrative explanations with clear beginning, middle, end
- Use rhetorical questions to engage thinking
- Include memorable quotes or sayings that capture the concept"""

        mixed_instructions = """
For MIXED learners:
- Balance visual descriptions with narrative explanations
- Use analogies that are both visual and verbal
- Provide structured information with clear visual hierarchy
- Include both diagrams AND stories to reinforce concepts
- **GENERATE MERMAID DIAGRAMS** for architectural concepts - wrap in ```mermaid blocks"""

        # Select style instructions
        if cognitive_style == "visual":
            style_instructions = visual_instructions
        elif cognitive_style == "verbal":
            style_instructions = verbal_instructions
        else:
            style_instructions = mixed_instructions

        system_prompt = f"""You are NoboGyan, a warm, enthusiastic learning companion who happens to be an expert in cloud computing. You genuinely care about the student's success and get excited when they learn! Think of yourself as a supportive friend who's knowledgeable but never condescending.

Student Profile:
- Name: {student_name}
- Current topic: {current_topic or 'General'}
- Mastery level: {topic_mastery:.0%}
- Learning style: {cognitive_style}
- Weak points: {', '.join(weak_points) if weak_points else 'None identified'}
{weak_point_note}
{mastery_celebration}
{path_context}

Your Personality & Approach:
🌟 Warm & Encouraging: Celebrate effort, not just correctness. Use phrases like "Great question!", "You're thinking about this exactly right!", "I love that you're curious about this!"

🤝 Empathetic & Patient: If mastery is low, say things like "Many students find this tricky at first—you're not alone!" or "This concept takes time to click, and that's totally normal."

🎯 Confidence Building: Use "yet" framing ("You haven't mastered this *yet*"). Normalize struggle: "Cloud computing has a steep learning curve, and you're climbing it well!"

📚 Learning-Focused: Connect ideas to the bigger picture. Show how concepts build on each other and link to upcoming topics in their journey.{style_instructions}

Response Guidelines:
- **CASUAL GREETINGS**: If the student just says "hi", "hello", "hey", or similar casual greetings, respond warmly and briefly! Don't launch into explanations. Just greet them back, maybe ask how they're doing or what they'd like to learn about today. Keep it natural and conversational.
- **QUESTIONS ABOUT TOPICS**: Only explain concepts when the student actually asks a question or requests information.
- Ground your answer in the provided knowledge base sources (cite them naturally)
- Be thorough but engaging (3-5 paragraphs for actual questions)
- If mastery < 40%: Provide scaffolding, encouragement, break things down simply
- If mastery 40-80%: Challenge appropriately, ask reflective questions
- If mastery > 80%: Acknowledge their expertise, suggest deeper explorations
- For actual learning questions, end with 1-2 follow-up questions that spark curiosity
- If explaining a weak point: Extra encouragement + "You're strengthening this area!"
- If the student just achieved a milestone: Celebrate! 🎉

DIAGRAM GENERATION:
When explaining architectures, workflows, hierarchies, or relationships:
1. Generate MERMAID diagrams wrapped in ```mermaid code blocks
2. Supported types: flowcharts (flowchart TD/LR), sequence diagrams, class diagrams, ER diagrams, state diagrams
3. Example:
```mermaid
flowchart TD
    A[Client] --> B[Load Balancer]
    B --> C[Server 1]
    B --> D[Server 2]
```
4. Keep diagrams simple (5-10 nodes) for readability
5. ALWAYS include a text explanation of what the diagram shows

Remember: You're not just explaining concepts—you're building confidence and a love for learning!"""

        user_prompt = f"""Knowledge Base Context:
{rag_text}

Student Question: {question}

Provide a warm, encouraging, and pedagogically sound answer. Make the student feel supported and excited about learning!"""

        messages = [
            {"role": "system", "content": system_prompt},
        ]

        # Add recent history (last N turns)
        if history:
            for turn in history[-self.max_context_turns:]:
                messages.append({
                    "role": turn.get("role", "user"),
                    "content": turn.get("content", "")
                })

        messages.append({"role": "user", "content": user_prompt})
        return messages

    @staticmethod
    def _get_topic_mastery(topic: Optional[str], knowledge_base: Dict[str, float]) -> float:
        """Get mastery level with substring matching for flexible key formats."""
        if not topic or not knowledge_base:
            return 0.0
        topic_lower = topic.lower().replace(" ", "_")
        # Exact match first
        if topic_lower in knowledge_base:
            val = knowledge_base[topic_lower]
            if isinstance(val, (int, float)):
                return float(val)
        # Substring fallback
        for key, score in knowledge_base.items():
            key_lower = key.lower()
            if topic_lower in key_lower or key_lower in topic_lower:
                if isinstance(score, (int, float)):
                    return float(score)
        return 0.0

    def _detect_response_type(self, question: str, profile: Dict[str, Any]) -> str:
        """Determine the best response type for this question and profile."""
        question_lower = question.lower()
        cognitive_style = profile.get("cognitive_style", "mixed")
        hands_free = profile.get("hands_free", False)

        if hands_free:
            return "voice"

        # Problem-solving detection
        problem_keywords = [
            "how do i", "how to", "step by step", "walk me through",
            "solve", "debug", "fix", "implement", "code", "write"
        ]
        if any(kw in question_lower for kw in problem_keywords):
            return "walkthrough"

        # Conceptual + visual learner
        conceptual_keywords = ["what is", "explain", "difference between", "compare", "why"]
        if any(kw in question_lower for kw in conceptual_keywords) and "visual" in cognitive_style:
            return "diagram"

        return "text"

    def _extract_followups(self, answer: str) -> List[str]:
        """Extract suggested follow-up questions from the answer."""
        # Look for patterns like "Follow-up: ..." or numbered suggestions at the end
        followups = []

        # Match "Follow-up:" or "You might also ask:" sections
        patterns = [
            r'(?:Follow-up|Follow up|Suggested)[s:]*\s*(.*?)(?:\n|$)',
            r'\d+\.\s*(.*?(?:\?|$))',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, answer, re.IGNORECASE)
            for match in matches:
                clean = match.strip()
                if clean and len(clean) > 10:
                    followups.append(clean)

        # De-duplicate and limit to 3
        seen = set()
        unique = []
        for fu in followups:
            lower = fu.lower()
            if lower not in seen:
                seen.add(lower)
                unique.append(fu)
        return unique[:3]


# Global tutor engine instance
tutor_engine = TutorEngine()
