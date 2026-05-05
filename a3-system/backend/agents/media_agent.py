"""
Media Agent for generating animated educational lecture slides.

Creates a sequence of high-fidelity slides with TTS scripts, highlight terms,
and timing data — designed for an in-app animated lecture player.
"""

import json
import re
from typing import Any, Dict, List

from agents.base_agent import BaseAgent
from core.faithfulness_checker import faithfulness_checker
from core.llm_client import llm_client
from core.logging import get_logger
from core.tts_client import batch_synthesize_to_cache
from rag.vector_store import get_vector_store

logger = get_logger(__name__)

MEDIA_SYSTEM_PROMPT = """You are an expert educational slide designer and scriptwriter.

Your task is to create EXACTLY 7-8 high-fidelity "Educational Slides" for a ~3-4 minute animated lecture.

CRITICAL: You MUST generate EXACTLY 7-8 slides. Not 6, not 9. EXACTLY 7-8 slides.

IMPORTANT: Return ONLY a valid JSON object. No markdown, no extra text.

Required JSON structure:
{
    "title": "Engaging lecture title",
    "slides": [
        {
            "number": 1,
            "header": "Short, bold slide header (max 6 words)",
            "bullets": [
                "Key point 1 — concise, max 12 words",
                "Key point 2 — concise, max 12 words",
                "Key point 3 — concise, max 12 words"
            ],
            "script": "Narration text the TTS voice will read aloud for this slide. 2-4 sentences, conversational academic tone.",
            "visual_hint": "Visual cue for slide (e.g., 'Show layered cake analogy', 'Display diagram with arrows')",
            "pause_prompt": "Optional: Add reflection question like 'Pause and think: why would this fail?'",
            "highlight_terms": ["term1", "term2"],
            "duration_seconds": 25
        }
    ],
    "total_duration_seconds": 180,
    "bridge_to_next": "Brief sentence connecting to the next topic the student will learn"
}

MANDATORY SLIDE STRUCTURE (7-8 slides):
Slide 1: HOOK - Pattern interrupt with a question or surprising fact that creates curiosity gap
Slide 2: WHY IT MATTERS - Real-world relevance and importance
Slides 3-5: WHAT & HOW - Core concept explained step-by-step (use visual hints)
Slide 6: PRACTICAL EXAMPLE - Visual scenario showing the concept in action
Slide 7: KEY TAKEAWAYS - 3 bullet recap of main points
Slide 8: BRIDGE - "Next you'll learn about X..." connecting to the learning path

MANDATORY RULES (MUST FOLLOW):
1. Generate EXACTLY 7-8 slides — 7 minimum, 8 maximum
2. Each slide MUST have EXACTLY 3 bullet points
3. Each bullet MUST be 8-12 words
4. Each script MUST be 2-4 sentences (50-80 words) to support 3-4 minute total
5. Each slide MUST have 2-3 highlight_terms
6. Include visual_hint for EVERY slide describing what to show
7. Include pause_prompt on slides 3-5 for active learning
8. Use double quotes for ALL strings, valid JSON only
9. No trailing commas
10. Total duration: 180-240 seconds (3-4 minutes)

FAILURE TO GENERATE EXACTLY 7-8 SLIDES IS UNACCEPTABLE."""


class MediaAgent(BaseAgent):
    """Generates animated educational lecture slides."""

    def __init__(self, llm=None):
        super().__init__("Media", llm)
        self.vector_store = get_vector_store()
        self.max_rag_chunks = 3

    async def _retrieve_chunks(self, topic: str, node_id: str = "") -> List[Dict[str, Any]]:
        """Retrieve relevant RAG chunks for the topic."""
        results = []

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

    @staticmethod
    def _parse_slides_json(content: str) -> Dict[str, Any]:
        """Parse the LLM's JSON response, salvaging slides from truncated output.

        Free-tier LLMs frequently truncate long responses, leaving the slides
        array unterminated. We try, in order:

        1. Direct ``json.loads``
        2. Greedy ``{...}`` extraction
        3. Per-slide salvage: walk the ``"slides": [`` array and parse each
           top-level slide object individually using a brace counter, stopping
           cleanly at the last fully-closed slide.
        """
        # 1. Happy path
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass

        # 2. Greedy extraction (handles markdown fencing or trailing commentary)
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        # 3. Per-slide salvage from truncated array
        title_match = re.search(r'"title"\s*:\s*"([^"]+)"', content)
        title = title_match.group(1) if title_match else ""

        arr_start = content.find('"slides"')
        if arr_start == -1:
            raise ValueError("Could not parse slide JSON: no slides array found")
        bracket_idx = content.find("[", arr_start)
        if bracket_idx == -1:
            raise ValueError("Could not parse slide JSON: malformed slides array")

        slides: List[Dict[str, Any]] = []
        i = bracket_idx + 1
        n = len(content)
        while i < n:
            # Skip whitespace and commas between objects
            while i < n and content[i] in " \t\r\n,":
                i += 1
            if i >= n or content[i] == "]":
                break
            if content[i] != "{":
                # Garbage between slides — abort cleanly with what we have
                break

            # Walk until matching closing brace, tracking string state
            depth = 0
            in_str = False
            escape = False
            j = i
            while j < n:
                ch = content[j]
                if in_str:
                    if escape:
                        escape = False
                    elif ch == "\\":
                        escape = True
                    elif ch == '"':
                        in_str = False
                else:
                    if ch == '"':
                        in_str = True
                    elif ch == "{":
                        depth += 1
                    elif ch == "}":
                        depth -= 1
                        if depth == 0:
                            j += 1
                            break
                j += 1
            else:
                # Truncated mid-slide — discard the partial object
                break

            slide_text = content[i:j]
            try:
                slides.append(json.loads(slide_text))
            except json.JSONDecodeError:
                break
            i = j

        if not slides:
            raise ValueError("Could not parse slide JSON: zero salvageable slides")

        logger.warning(
            f"Salvaged {len(slides)} slide(s) from truncated LLM output"
        )
        return {
            "title": title,
            "slides": slides,
            "total_duration_seconds": sum(s.get("duration_seconds", 30) for s in slides),
            "bridge_to_next": "",
        }

    async def run(
        self,
        topic: str,
        profile: Dict[str, Any],
        node_id: str = "",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate educational lecture slides for a topic.

        Args:
            topic: Topic to create slides for
            profile: Student profile dict
            node_id: Optional node ID for RAG retrieval
            **kwargs: num_slides, duration

        Returns:
            Dict with 'title', 'slides', 'total_duration_seconds', 'metadata'
        """
        cognitive_style = profile.get("cognitive_style", "mixed")
        knowledge_base = profile.get("knowledge_base", {})
        if not isinstance(knowledge_base, dict):
            knowledge_base = {}
        mastery = self._get_topic_mastery(topic, knowledge_base)

        num_slides = kwargs.get("num_slides", 6)
        target_duration = kwargs.get("duration", 60)

        # Retrieve RAG chunks for grounding
        rag_chunks = await self._retrieve_chunks(topic, node_id)
        rag_context = self._format_rag_context(rag_chunks)

        system_prompt = self._build_system_prompt(MEDIA_SYSTEM_PROMPT, profile)

        user_prompt = f"""Create educational lecture slides for: **{topic}**

Student Profile:
- Current mastery: {mastery:.0%}
- Learning style: {cognitive_style}
- Target: 7-8 slides, ~3-4 minutes total

Content context:
{rag_context if rag_context else 'Create from general knowledge of the topic.'}

STRUCTURE GUIDE:
1. HOOK: Pattern interrupt question or surprising fact (creates curiosity gap)
2. WHY IT MATTERS: Real-world relevance and importance
3-5. WHAT & HOW: Core concept explained step-by-step (include visual hints for diagrams/analogies)
6. PRACTICAL EXAMPLE: Visual scenario showing concept in action
7. KEY TAKEAWAYS: 3 bullet recap of main points
8. BRIDGE: Connect to what the student learns next

IMPORTANT:
- Include visual_hint for EVERY slide describing what to show (e.g., "Visual: show layered cake analogy for OSI model")
- Include pause_prompt on slides 3-5 for active learning reflection
- Total duration should be 3-4 minutes (180-240 seconds)

Generate the slide sequence as valid JSON only."""

        try:
            response = await self.llm.generate(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.6,
                # 7-8 slides each with ~80-word scripts, bullets, hints,
                # pause prompts and metadata routinely exceed 3500 tokens.
                # Free-tier models silently truncate, producing malformed JSON
                # that previously fell back to a single placeholder slide.
                max_tokens=8000,
            )

            content = response["choices"][0]["message"].get("content") or ""
            if not content:
                logger.warning(f"LLM returned empty content for media")
                raise ValueError("LLM returned empty content")

            # Parse JSON, with progressive fallbacks for truncated output
            slide_data = self._parse_slides_json(content)

            slides = slide_data.get("slides", [])

            # Run faithfulness check
            slide_text = json.dumps(slide_data, indent=2)
            faithfulness_result = await faithfulness_checker.check_faithfulness(
                generated_text=slide_text,
                source_chunks=[{"id": c["chunk_id"], "text": c["text"], "source": c["source"]} for c in rag_chunks],
                context=topic,
            )

            # ── Pre-generate TTS audio for all slides ──
            tts_items = [
                {"text": s.get("script", ""), "slide_idx": i}
                for i, s in enumerate(slides)
                if s.get("script")
            ]

            if tts_items:
                try:
                    tts_results = await batch_synthesize_to_cache(
                        items=tts_items,
                        provider="edge",
                        voice="en-US-JennyNeural",
                    )
                    # Attach audio_url to each slide
                    for res in tts_results:
                        idx = res.get("slide_idx")
                        cache_key = res.get("cache_key")
                        if idx is not None and cache_key and idx < len(slides):
                            slides[idx]["audio_url"] = f"/api/tts/cached/{cache_key}"
                except Exception as e:
                    logger.warning(f"TTS pre-generation failed for {topic}: {e}")

            return {
                "title": slide_data.get("title", topic),
                "slides": slides,
                "total_duration_seconds": slide_data.get("total_duration_seconds", 180),
                "bridge_to_next": slide_data.get("bridge_to_next", ""),
                "format": "lecture_slides",
                "metadata": {
                    "topic": topic,
                    "agent": "media",
                    "num_slides": len(slides),
                    "duration_seconds": slide_data.get("total_duration_seconds", 180),
                    "mastery_level": mastery,
                    "cognitive_style": cognitive_style,
                    "tts_pre_generated": any("audio_url" in s for s in slides),
                    "structure_version": "2.0",
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
            logger.error(f"Media generation failed for {topic}: {e}")
            return {
                "title": topic,
                "slides": [
                    {
                        "number": 1,
                        "header": f"Introduction to {topic}",
                        "bullets": [
                            f"What is {topic}?",
                            "Key concepts and terminology",
                            "Why it matters"
                        ],
                        "script": f"Let's explore {topic}. We'll cover the key concepts and understand why this matters.",
                        "highlight_terms": [topic],
                        "duration_seconds": 15
                    }
                ],
                "total_duration_seconds": 15,
                "format": "lecture_slides",
                "metadata": {
                    "topic": topic,
                    "agent": "media",
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
