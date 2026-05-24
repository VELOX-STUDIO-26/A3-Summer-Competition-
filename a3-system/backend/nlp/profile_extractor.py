"""
Profile Extraction Module for A3 Learning System.

Extracts 6 learner dimensions from chat messages using LLM:
1. knowledge_base: Topic mastery scores
2. cognitive_style: visual | verbal | kinesthetic | mixed
3. weak_points: Struggling topics
4. goals: Learning objectives
5. learning_pace: Speed preference (0.0-1.0)
6. content_preferences: Preferred content formats

Uses structured prompting to get JSON output with confidence scores.
"""

import json
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

from core.llm_client import llm_client
from core.logging import get_logger

logger = get_logger(__name__)

# Dimension validation schemas
DIMENSION_SCHEMA = {
    "knowledge_base": {
        "type": "dict",
        "description": "Map of topic names to mastery scores (0.0-1.0)",
        "example": {"cloud_computing": 0.7, "docker": 0.3},
    },
    "cognitive_style": {
        "type": "str",
        "options": ["visual", "verbal", "kinesthetic", "mixed"],
        "description": "Preferred learning style",
    },
    "weak_points": {
        "type": "list",
        "description": "Topics the student struggles with",
        "example": ["kubernetes", "networking"],
    },
    "goals": {
        "type": "list",
        "description": "Learning objectives or career goals",
        "example": ["get_cka_certification", "understand_microservices"],
    },
    "learning_pace": {
        "type": "float",
        "range": [0.0, 1.0],
        "description": "Learning speed preference (0=slow/thorough, 1=fast/intensive)",
    },
    "content_preferences": {
        "type": "list",
        "options": ["video", "text", "interactive", "code", "audio", "diagram"],
        "description": "Preferred content formats",
    },
}

PROFILE_EXTRACTION_PROMPT = """You are a learner profiling assistant. Extract profile dimensions from the student's message.

DIMENSIONS:
1. knowledge_base: Dict of topic → mastery score (0.0-1.0)
   - "comfortable with X" → 0.7-0.9, "basic knowledge" → 0.4-0.6, "learning X" → 0.1-0.3
   
2. cognitive_style: One of "visual" | "verbal" | "kinesthetic" | "mixed"
   - videos/diagrams → visual, reading/docs → verbal, hands-on/practice → kinesthetic
   
3. weak_points: List of topics they struggle with
   - "I struggle with X", "X is confusing", "never understood X"
   
4. goals: List of learning objectives with context
   - "I want to learn X for Y", "Get certified in X", "Build projects with X"
   
5. learning_pace: Float 0.0 (slow/thorough) to 1.0 (fast/intensive)
   - "take my time" → 0.2-0.3, "few hours/week" → 0.4-0.5, "intensive" → 0.7-0.9
   
6. content_preferences: List from [video, text, interactive, code, audio, diagram]

RULES:
- Only extract what is explicitly stated or strongly implied
- Set confidence (0.0-1.0) based on how explicit the statement was
- Include evidence_quote from the original message
- "I want to learn X" = GOAL, not knowledge_base
- "I struggle with X" = weak_point
- IMPORTANT: Always extract at least ONE dimension if ANY relevant info is present
- If message has truly no extractable info (e.g., just "hi"), return empty extractions array

Return ONLY valid JSON (no markdown, no explanation):
{
  "extractions": [
    {"dimension": "knowledge_base", "value": {"Python": 0.8, "Docker": 0.3}, "confidence": 0.9, "evidence_quote": "I'm comfortable with Python, learning Docker"},
    {"dimension": "goals", "value": ["Get AWS certified", "Build cloud projects"], "confidence": 0.85, "evidence_quote": "I want to get AWS certified and build some projects"}
  ],
  "analysis": "Brief 1-sentence summary of what was learned about the student"
}"""


@dataclass
class ProfileExtraction:
    """Single extracted dimension from a message."""
    dimension: str
    value: Any
    confidence: float
    evidence_quote: str


@dataclass
class ExtractionResult:
    """Complete extraction result from a message."""
    extractions: List[ProfileExtraction] = field(default_factory=list)
    analysis: str = ""
    raw_response: str = ""

    def get_by_dimension(self, dimension: str) -> Optional[ProfileExtraction]:
        """Get the highest-confidence extraction for a dimension."""
        matches = [e for e in self.extractions if e.dimension == dimension]
        if not matches:
            return None
        return max(matches, key=lambda e: e.confidence)

    def get_dimensions_found(self) -> List[str]:
        """Get list of dimensions that were extracted."""
        return list(set(e.dimension for e in self.extractions))

    def get_confidence_scores(self) -> Dict[str, float]:
        """Get confidence score for each dimension."""
        scores = {}
        for dim in DIMENSION_SCHEMA.keys():
            ext = self.get_by_dimension(dim)
            scores[dim] = ext.confidence if ext else 0.0
        return scores


class ProfileExtractor:
    """Extracts learner profile dimensions from chat messages using LLM."""
    
    # Problem 2 Fix: Simple cache for similar extractions
    _extraction_cache: Dict[str, ExtractionResult] = {}
    _cache_max_size: int = 100

    def __init__(self, llm=None):
        self.llm = llm or llm_client
        self.extraction_history: List[ExtractionResult] = []
    
    def _get_cache_key(self, message: str) -> str:
        """Generate a cache key from message (normalized)."""
        # Normalize: lowercase, remove extra spaces, take first 200 chars
        normalized = " ".join(message.lower().split())[:200]
        return normalized
    
    def _check_cache(self, message: str) -> Optional[ExtractionResult]:
        """Check if we have a cached extraction for similar message."""
        key = self._get_cache_key(message)
        return self._extraction_cache.get(key)
    
    def _add_to_cache(self, message: str, result: ExtractionResult):
        """Add extraction result to cache."""
        if len(self._extraction_cache) >= self._cache_max_size:
            # Remove oldest entry (simple FIFO)
            oldest_key = next(iter(self._extraction_cache))
            del self._extraction_cache[oldest_key]
        
        key = self._get_cache_key(message)
        self._extraction_cache[key] = result

    async def extract_from_message(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> ExtractionResult:
        """
        Extract profile dimensions from a single message.

        Args:
            message: Student's message text
            conversation_history: Optional previous messages for context

        Returns:
            ExtractionResult with extractions and analysis
        """
        # Problem 2 Fix: Check cache first
        cached = self._check_cache(message)
        if cached:
            logger.info(f"Cache hit for message: {message[:50]}...")
            self.extraction_history.append(cached)
            return cached
        
        # Problem 1 Fix: Chunk long messages (>300 chars)
        if len(message) > 300:
            result = await self._extract_from_chunks(message, conversation_history)
        else:
            result = await self._extract_single(message, conversation_history)
        
        # Cache the result if it has extractions
        if result.extractions:
            self._add_to_cache(message, result)
        
        return result
    
    async def _extract_from_chunks(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> ExtractionResult:
        """Extract from long messages by processing in chunks."""
        # Split by sentences
        import re
        sentences = re.split(r'(?<=[.!?])\s+', message)
        
        # Group into chunks of ~150 chars
        chunks = []
        current_chunk = ""
        for sentence in sentences:
            if len(current_chunk) + len(sentence) < 200:
                current_chunk += " " + sentence if current_chunk else sentence
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        # If only one chunk, process normally
        if len(chunks) <= 1:
            return await self._extract_single(message, conversation_history)
        
        logger.info(f"Processing long message in {len(chunks)} chunks")
        
        # Extract from each chunk and merge
        all_extractions = []
        all_analyses = []
        
        for i, chunk in enumerate(chunks):
            result = await self._extract_single(chunk, conversation_history)
            all_extractions.extend(result.extractions)
            if result.analysis:
                all_analyses.append(result.analysis)
        
        # Merge extractions (deduplicate by dimension, keep highest confidence)
        merged = self._merge_extractions(all_extractions)
        
        return ExtractionResult(
            extractions=merged,
            analysis=" | ".join(all_analyses) if all_analyses else "",
            raw_response=f"Chunked extraction from {len(chunks)} parts"
        )
    
    def _merge_extractions(self, extractions: List[ProfileExtraction]) -> List[ProfileExtraction]:
        """Merge multiple extractions, keeping highest confidence per dimension."""
        by_dimension: Dict[str, ProfileExtraction] = {}
        
        for ext in extractions:
            if ext.dimension not in by_dimension:
                by_dimension[ext.dimension] = ext
            else:
                existing = by_dimension[ext.dimension]
                if ext.confidence > existing.confidence:
                    by_dimension[ext.dimension] = ext
                elif ext.dimension in ("weak_points", "goals", "content_preferences"):
                    # For list types, merge values
                    if isinstance(existing.value, list) and isinstance(ext.value, list):
                        merged_list = list(set(existing.value + ext.value))
                        existing.value = merged_list
                elif ext.dimension == "knowledge_base":
                    # For dict types, merge keys
                    if isinstance(existing.value, dict) and isinstance(ext.value, dict):
                        existing.value.update(ext.value)
        
        return list(by_dimension.values())

    async def _extract_single(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        is_retry: bool = False
    ) -> ExtractionResult:
        """Extract from a single message (or chunk)."""
        # Build messages for LLM
        messages = [
            {"role": "system", "content": PROFILE_EXTRACTION_PROMPT},
        ]

        # Add conversation history if provided
        if conversation_history:
            for msg in conversation_history[-5:]:  # Last 5 messages for context
                role = "user" if msg.get("is_student", True) else "assistant"
                messages.append({
                    "role": role,
                    "content": msg.get("content", "")
                })

        # Add the current message
        messages.append({"role": "user", "content": message})

        try:
            # Call LLM for extraction
            response = await self.llm.generate(
                messages=messages,
                temperature=0.3,  # Low temp for consistent JSON
                max_tokens=1000
            )

            # Safely extract content from response
            raw_content = self._safe_extract_content(response)
            if not raw_content:
                logger.error(f"Failed to extract content from LLM response: {response.keys()}")
                return ExtractionResult(
                    extractions=[],
                    analysis="Failed to extract content from LLM response",
                    raw_response=str(response)
                )
            logger.info(f"Raw extraction response: {raw_content[:500]}...")

            # Parse the JSON response
            result = self._parse_extraction_response(raw_content)
            result.raw_response = raw_content

            # Validate and normalize extractions
            result.extractions = self._validate_extractions(result.extractions)

            # Problem 1 Fix: Retry if extraction is empty but message has content
            if not result.extractions and len(message) > 20 and not is_retry:
                logger.info("Empty extraction, retrying with simplified prompt...")
                return await self._retry_extraction(message, conversation_history)

            # Store in history
            self.extraction_history.append(result)

            logger.info(
                f"Extracted {len(result.extractions)} dimensions: "
                f"{result.get_dimensions_found()}"
            )

            return result

        except Exception as e:
            logger.error(f"Profile extraction failed: {e}")
            return ExtractionResult(
                extractions=[],
                analysis=f"Extraction failed: {str(e)}",
                raw_response=""
            )
    
    async def _retry_extraction(
        self,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> ExtractionResult:
        """Retry extraction with a simpler, more direct prompt."""
        simple_prompt = """Extract ANY learning profile info from this message. Return JSON:
{"extractions": [{"dimension": "goals|knowledge_base|weak_points|cognitive_style|learning_pace|content_preferences", "value": ..., "confidence": 0.0-1.0, "evidence_quote": "..."}], "analysis": "..."}
If nothing extractable, return {"extractions": [], "analysis": "No profile info found"}"""
        
        messages = [
            {"role": "system", "content": simple_prompt},
            {"role": "user", "content": message}
        ]
        
        try:
            response = await self.llm.generate(
                messages=messages,
                temperature=0.2,
                max_tokens=800
            )
            
            raw_content = self._safe_extract_content(response)
            if not raw_content:
                return ExtractionResult(extractions=[], analysis="Retry failed")
            
            result = self._parse_extraction_response(raw_content)
            result.extractions = self._validate_extractions(result.extractions)
            
            logger.info(f"Retry extracted {len(result.extractions)} dimensions")
            return result
            
        except Exception as e:
            logger.error(f"Retry extraction failed: {e}")
            return ExtractionResult(extractions=[], analysis=f"Retry failed: {e}")

    def _safe_extract_content(self, response: Any) -> Optional[str]:
        """Safely extract content from LLM response dict.

        Handles the normalized OpenAI-compatible format returned by all
        providers in ``llm_client``. Returns None on missing fields.
        """
        if not isinstance(response, dict):
            logger.error(f"LLM response is not a dict: {type(response)}")
            return None
        choices = response.get("choices")
        if not choices or not isinstance(choices, list) or len(choices) == 0:
            logger.error(f"LLM response missing 'choices': {response.keys()}")
            return None
        first = choices[0]
        if not isinstance(first, dict):
            logger.error("LLM response 'choices[0]' is not a dict")
            return None
        message = first.get("message")
        if not isinstance(message, dict):
            logger.error("LLM response missing 'choices[0].message'")
            return None
        content = message.get("content")
        if content is None:
            logger.error("LLM response missing 'choices[0].message.content'")
            return None
        return str(content)

    def _parse_extraction_response(self, content: str) -> ExtractionResult:
        """Parse JSON response from LLM into ExtractionResult.

        Handles both the expected format with 'extractions' array
        and the direct format where dimensions are top-level keys.
        """
        # Strip markdown code blocks if present
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        # Try to find JSON block
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if not json_match:
            logger.warning(f"No JSON found in extraction response: {content[:200]}...")
            return ExtractionResult(analysis="No JSON found in response")

        try:
            data = json.loads(json_match.group())

            extractions = []

            # Check if this is the expected format with 'extractions' array
            if "extractions" in data and isinstance(data["extractions"], list):
                for ext_data in data.get("extractions", []):
                    extraction = ProfileExtraction(
                        dimension=ext_data.get("dimension", ""),
                        value=ext_data.get("value"),
                        confidence=ext_data.get("confidence", 0.0),
                        evidence_quote=ext_data.get("evidence_quote", "")
                    )
                    extractions.append(extraction)
                analysis = data.get("analysis", "")
            else:
                # Handle direct format where dimensions are top-level keys
                # Map known dimension keys to extractions
                for dim_key in DIMENSION_SCHEMA.keys():
                    if dim_key in data:
                        value = data[dim_key]
                        # Create extraction with high confidence
                        extraction = ProfileExtraction(
                            dimension=dim_key,
                            value=value,
                            confidence=0.8,  # Default confidence for direct format
                            evidence_quote=f"Extracted from: {str(value)[:100]}"
                        )
                        extractions.append(extraction)
                analysis = "Extracted from direct format"

            return ExtractionResult(
                extractions=extractions,
                analysis=analysis
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse extraction JSON: {e}")
            return ExtractionResult(analysis=f"JSON parse error: {str(e)}")

    def _validate_extractions(
        self,
        extractions: List[ProfileExtraction]
    ) -> List[ProfileExtraction]:
        """Validate and normalize extraction values."""
        validated = []

        for ext in extractions:
            # Check dimension is valid
            if ext.dimension not in DIMENSION_SCHEMA:
                logger.warning(f"Unknown dimension: {ext.dimension}")
                continue

            schema = DIMENSION_SCHEMA[ext.dimension]

            # Clamp confidence to [0, 1]
            ext.confidence = max(0.0, min(1.0, ext.confidence))

            # Validate and normalize value based on type
            ext.value = self._normalize_value(ext.value, schema)

            if ext.value is not None:
                validated.append(ext)

        return validated

    def _normalize_value(self, value: Any, schema: Dict) -> Any:
        """Normalize a value based on its schema."""
        value_type = schema.get("type", "str")

        if value_type == "dict":
            if isinstance(value, dict):
                return {
                    str(k).lower().replace(" ", "_"): float(v)
                    for k, v in value.items()
                    if isinstance(v, (int, float))
                }
            return {}

        elif value_type == "list":
            if isinstance(value, list):
                # Keep human-readable format, just clean whitespace
                return [str(v).strip() for v in value if str(v).strip()]
            elif isinstance(value, str):
                parts = [p.strip() for p in value.split(",") if p.strip()]
                return parts
            return []

        elif value_type == "str":
            if isinstance(value, str):
                normalized = value.lower().strip()
                # Check if it's in allowed options
                options = schema.get("options", [])
                if options and normalized not in options:
                    # Try to find closest match
                    for opt in options:
                        if opt in normalized or normalized in opt:
                            return opt
                    logger.warning(f"Value '{normalized}' not in options: {options}")
                return normalized
            return None

        elif value_type == "float":
            try:
                fval = float(value)
                min_val, max_val = schema.get("range", [0.0, 1.0])
                return max(min_val, min(max_val, fval))
            except (ValueError, TypeError):
                return None

        return value


class ProfileBuilder:
    """Builds and maintains a learner profile from multiple extractions."""

    def __init__(self, initial_profile: Optional[Dict[str, Any]] = None):
        self.profile = initial_profile or {}
        self.extraction_history: List[ExtractionResult] = []
        self.confidence_scores: Dict[str, float] = {}

    def add_extraction(self, result: ExtractionResult, recency_weight: float = 0.3):
        """
        Add a new extraction result and update the profile.

        Uses weighted moving average for updates:
        new_value = (1 - alpha) * old_value + alpha * new_evidence
        where alpha = confidence * recency_weight
        """
        self.extraction_history.append(result)

        for extraction in result.extractions:
            dim = extraction.dimension
            value = extraction.value
            confidence = extraction.confidence

            if dim in ("knowledge_base",):
                # Dictionary dimensions: merge keys
                self._merge_dict_dimension(dim, value, confidence, recency_weight)
            elif dim in ("weak_points", "goals", "content_preferences"):
                # List dimensions: append unique items
                self._merge_list_dimension(dim, value, confidence)
            else:
                # Scalar dimensions: weighted average
                self._merge_scalar_dimension(dim, value, confidence, recency_weight)

    def _merge_dict_dimension(
        self,
        dim: str,
        value: Dict,
        confidence: float,
        recency_weight: float
    ):
        """Merge a dictionary dimension (like knowledge_base)."""
        if dim not in self.profile:
            self.profile[dim] = {}
            self.confidence_scores[dim] = 0.0

        alpha = confidence * recency_weight

        for topic, score in value.items():
            if topic in self.profile[dim]:
                # Weighted update
                old_score = self.profile[dim][topic]
                self.profile[dim][topic] = (1 - alpha) * old_score + alpha * score
            else:
                # New topic
                self.profile[dim][topic] = score * confidence

        # Update overall confidence
        self.confidence_scores[dim] = max(
            self.confidence_scores.get(dim, 0.0),
            confidence
        )

    def _merge_list_dimension(self, dim: str, value: List, confidence: float):
        """Merge a list dimension (like weak_points, goals)."""
        if dim not in self.profile:
            self.profile[dim] = []

        # Add unique items
        for item in value:
            if item not in self.profile[dim]:
                self.profile[dim].append(item)

        self.confidence_scores[dim] = max(
            self.confidence_scores.get(dim, 0.0),
            confidence
        )

    def _merge_scalar_dimension(
        self,
        dim: str,
        value: Any,
        confidence: float,
        recency_weight: float
    ):
        """Merge a scalar dimension (like cognitive_style, learning_pace)."""
        alpha = confidence * recency_weight

        if dim not in self.profile:
            # First extraction
            self.profile[dim] = value
            self.confidence_scores[dim] = confidence
        else:
            # Weighted update
            if dim == "cognitive_style":
                # For categorical: use highest confidence
                if confidence > self.confidence_scores.get(dim, 0.0):
                    self.profile[dim] = value
                    self.confidence_scores[dim] = confidence
            else:
                # For numerical: weighted average
                old_val = self.profile[dim]
                if isinstance(old_val, (int, float)) and isinstance(value, (int, float)):
                    self.profile[dim] = (1 - alpha) * old_val + alpha * value
                    self.confidence_scores[dim] = max(
                        self.confidence_scores.get(dim, 0.0),
                        confidence
                    )

    def is_profile_complete(self, min_dimensions: int = 4, min_confidence: float = 0.5) -> bool:
        """Check if profile has enough information."""
        confident_dims = [
            dim for dim, conf in self.confidence_scores.items()
            if conf >= min_confidence
        ]
        return len(confident_dims) >= min_dimensions

    def get_profile_summary(self) -> Dict[str, Any]:
        """Get a summary of the current profile."""
        return {
            "profile": self.profile,
            "confidence_scores": self.confidence_scores,
            "is_complete": self.is_profile_complete(),
            "dimensions_found": list(self.confidence_scores.keys()),
            "extraction_count": len(self.extraction_history),
        }

    def to_student_profile(self) -> Dict[str, Any]:
        """Convert to student profile format for database storage."""
        return {
            "knowledge_base": self.profile.get("knowledge_base", {}),
            "cognitive_style": self.profile.get("cognitive_style", "mixed"),
            "weak_points": self.profile.get("weak_points", []),
            "goals": self.profile.get("goals", []),
            "learning_pace": self.profile.get("learning_pace", 0.5),
            "content_preferences": self.profile.get("content_preferences", []),
            "confidence_scores": self.confidence_scores,
        }
