"""
Content Agent for generating personalized learning materials.

Generates markdown lecture notes tailored to the student's profile,
including definitions, examples, and practical applications.
"""

from typing import Any, Dict, List

from agents.base_agent import BaseAgent
from core.faithfulness_checker import faithfulness_checker
from core.llm_client import llm_client
from core.logging import get_logger
from rag.vector_store import get_vector_store

logger = get_logger(__name__)

CONTENT_SYSTEM_PROMPT = """You are an expert content creator for an adaptive digital notebook.

Generate comprehensive, personalized **study notes** on the given topic using
the exact markdown conventions below. The frontend will parse this markdown, so
format precision matters.

CRITICAL: You MUST generate ALL 6 sections with substantial content in each.
FAILURE TO INCLUDE ANY SECTION IS UNACCEPTABLE.

─── REQUIRED STRUCTURE (ALL 6 SECTIONS MANDATORY) ───
Use H1 (#) for the main title, then EXACTLY these 6 numbered H2 sections:

## 1. Overview
(2-3 paragraphs introducing the topic, its importance, and learning objectives. MUST include a subsection titled "### Connect to Prior Knowledge" that links this topic to concepts the student has already learned.)

## 2. Key Concepts
(Define 4-6 key terms with **bold** formatting, each with 1-2 sentence explanation)

## 3. Detailed Explanation
(3-4 subsections using ### headers, each with 2-3 paragraphs or bullet lists. If the student has weak points related to this topic, include a "⚠️ Focus Area" callout box with extra scaffolding and encouragement.)

## 4. Self-Check
(3-5 fill-in-the-blank or short-answer questions to test understanding. Format as:
**Question 1:** [question text]
<details><summary>Click to reveal answer</summary>
[Answer with brief explanation]
</details>
)

## 5. Practical Application
(2-3 real-world examples or use cases, include code if relevant. MUST include a subsection titled "### Visual Summary" with ASCII diagram or structured visual description for visual learners.)

## 6. Summary
(5-7 bullet points summarizing key takeaways. MUST include a subsection titled "### Quick Reference Card" with a markdown table containing key terms, definitions, and formulas for easy review.)

─── FORMATTING RULES ───

• **Bold** every key term, definition, or acronym on first use.
• Use clean dash lists (- item) for features, benefits, requirements.
• Use markdown tables for comparisons and Quick Reference Card.
• Wrap analogies in block-quotes (at least 1 analogy required).
• Use horizontal rules (---) between major sections.
• Use fenced code blocks (```) for code examples with language tag.
• Use inline `code` for commands, file names, or identifiers.
• For Self-Check answers, use HTML details/summary tags to hide answers.

─── CITATION RULES ───
When referencing information from the source material, include inline citations
using the format [Source: chunk_id]. This helps students verify the information.

─── TONE & PEDAGOGY ───
- Adapt complexity to the student's level (see profile below).
- For visual learners, include Visual Summary with ASCII diagrams or spatial descriptions.
- For kinesthetic learners, add hands-on exercises in Practical Application.
- For students with weak points in this topic, add encouraging "Focus Area" callouts.
- Keep each section concise — prefer 3-5 bullets over long paragraphs.
- Use encouraging, warm language that builds confidence.

MANDATORY: Generate ALL 6 sections. Each section must have meaningful content.
FAILURE TO INCLUDE ALL 6 SECTIONS IS UNACCEPTABLE."""


class ContentAgent(BaseAgent):
    """Generates personalized markdown lecture notes."""

    def __init__(self, llm=None):
        super().__init__("Content", llm)
        self.vector_store = get_vector_store()
        self.max_rag_chunks = 3

    async def _retrieve_chunks(self, topic: str, node_id: str = "") -> List[Dict[str, Any]]:
        """Retrieve relevant RAG chunks for the topic."""
        results = []

        # Try embedding-based search first
        try:
            embeddings = await llm_client.get_embeddings([topic])
            query_embedding = embeddings[0]
            results = self.vector_store.search(
                query_embedding=query_embedding,
                top_k=self.max_rag_chunks,
                node_id=node_id if node_id else None
            )
        except Exception as e:
            logger.debug(f"Embedding search failed: {e}")

        # Fallback to keyword search if no results or embeddings failed
        if not results and hasattr(self.vector_store, "search_by_text"):
            try:
                results = self.vector_store.search_by_text(
                    query=topic,
                    top_k=self.max_rag_chunks,
                    node_id=node_id if node_id else None
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

    def _format_rag_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Format RAG chunks for inclusion in the prompt."""
        if not chunks:
            return ""
        return "\n\n".join(
            f"[Source: {c['chunk_id']}]\n{c['text']}" for c in chunks
        )

    async def run(
        self,
        topic: str,
        profile: Dict[str, Any],
        node_id: str = "",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate personalized content for a topic.

        Args:
            topic: Topic to generate content for (e.g., "Docker Containers")
            profile: Student profile dict
            node_id: Optional node ID to retrieve RAG chunks from
            **kwargs: Additional params like 'detail_level', 'include_code'

        Returns:
            Dict with 'content', 'metadata', 'format', 'faithfulness'
        """
        # Retrieve RAG chunks for grounding
        rag_chunks = await self._retrieve_chunks(topic, node_id)

        # Format context from RAG chunks
        rag_context = self._format_rag_context(rag_chunks)

        # Ensure knowledge_base is a dict
        knowledge_base = profile.get("knowledge_base", {})
        if not isinstance(knowledge_base, dict):
            knowledge_base = {}
        mastery = self._get_topic_mastery(topic, knowledge_base)
        detail_level = kwargs.get("detail_level", "standard")
        include_code = kwargs.get("include_code", True)

        system_prompt = self._build_system_prompt(CONTENT_SYSTEM_PROMPT, profile)

        user_prompt = f"""Generate lecture notes on: **{topic}**

Student's current mastery: {mastery:.0%}
Student's weak points: {', '.join(profile.get('weak_points', [])) if profile.get('weak_points') else 'None identified'}
Student's cognitive style: {profile.get('cognitive_style', 'mixed')}
Detail level: {detail_level}
Include code examples: {include_code}

Context from knowledge base:
{rag_context if rag_context else 'No additional context provided.'}

Please generate comprehensive, well-structured markdown lecture notes.

If this topic is in the student's weak points, add extra scaffolding and encouragement.
If the student is a visual learner, include ASCII diagrams or visual descriptions in the Visual Summary section.
Include 3-5 Self-Check questions with hidden answers using HTML details/summary tags.

Remember to cite sources using [Source: chunk_id] format when referencing specific information."""

        try:
            logger.info(f"ContentAgent: Starting generation for topic '{topic}'")
            response = await self.llm.generate(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=4000
            )

            content = response["choices"][0]["message"].get("content") or ""
            finish_reason = response["choices"][0].get("finish_reason", "unknown")
            logger.info(f"ContentAgent: Generated {len(content)} chars of content (finish_reason={finish_reason})")

            # Detect empty/whitespace-only content — treat as failure so the
            # frontend shows a clear error instead of "loading or unavailable".
            if not content.strip():
                raise ValueError(
                    f"LLM returned empty content (finish_reason={finish_reason}). "
                    "This may be due to a rate limit, content filter, or upstream error."
                )

            # Run faithfulness check
            faithfulness_result = await faithfulness_checker.check_faithfulness(
                generated_text=content,
                source_chunks=[{"id": c["chunk_id"], "text": c["text"], "source": c["source"]} for c in rag_chunks],
                context=topic,
            )

            # Log faithfulness verification status
            verified = faithfulness_result.score >= faithfulness_checker.threshold
            if not verified:
                logger.warning(f"ContentAgent: Low faithfulness score {faithfulness_result.score} for topic '{topic}'")

            # Prepend warning if low faithfulness
            if faithfulness_result.warning_message:
                content = f"⚠️ **{faithfulness_result.warning_message}**\n\n{content}"

            logger.info(f"ContentAgent: Returning result with faithfulness score {faithfulness_result.score}, verified={verified}")

            return {
                "content": content,
                "format": "markdown",
                "metadata": {
                    "topic": topic,
                    "agent": "content",
                    "mastery_level": mastery,
                    "detail_level": detail_level,
                    "word_count": len(content.split()),
                    "rag_chunks_used": len(rag_chunks),
                },
                "faithfulness": {
                    "score": faithfulness_result.score,
                    "verified": faithfulness_result.score >= faithfulness_checker.threshold,
                    "total_claims": faithfulness_result.total_claims,
                    "supported_claims": faithfulness_result.supported_count,
                    "unverifiable_claims": faithfulness_result.unverifiable_count,
                    "citations": faithfulness_result.citations,
                },
                "sources": rag_chunks,
            }

        except Exception as e:
            logger.error(f"Content generation failed for {topic}: {e}")
            return {
                "content": f"Error generating content for {topic}. Please try again.",
                "format": "markdown",
                "metadata": {
                    "topic": topic,
                    "agent": "content",
                    "error": str(e),
                },
                "faithfulness": {
                    "score": 0.0,
                    "verified": False,
                    "total_claims": 0,
                    "supported_claims": 0,
                    "unverifiable_claims": 0,
                    "citations": [],
                },
                "sources": [],
            }
