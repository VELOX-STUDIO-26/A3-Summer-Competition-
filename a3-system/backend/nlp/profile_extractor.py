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

PROFILE_EXTRACTION_PROMPT = """You are an expert learner profiling assistant for an adaptive learning system.

Your task is to analyze the student's message and extract profile dimensions with DETAILED, HUMAN-READABLE values.

Extractable dimensions:

1. **knowledge_base**: A dictionary of topics they know with mastery levels (0.0-1.0)
   - Extract SPECIFIC topics, not generic ones
   - Example: {"python": 0.8, "data_structures": 0.7, "algorithms": 0.3}
   - If they say "comfortable with X" → high mastery (0.7-0.9)
   - If they say "basic knowledge of X" → medium mastery (0.4-0.6)
   - If they say "never touched X" → 0.0 (don't include, but note in weak_points)

2. **cognitive_style**: How they prefer to learn
   - Use descriptive values: "visual", "verbal", "kinesthetic", "mixed"
   - If they mention videos/diagrams → "visual"
   - If they mention reading/articles → "verbal"
   - If they mention hands-on/practice → "kinesthetic"

3. **weak_points**: List of SPECIFIC topics they struggle with
   - Extract ALL mentioned struggles, not just one
   - Use human-readable names: "Dynamic programming", "Graph traversal", "Linux commands"
   - NOT snake_case like "dynamic_programming"

4. **goals**: List of SPECIFIC goals they want to achieve
   - Use human-readable descriptions: "Learn AWS for internship", "Get cloud certified"
   - Include context if mentioned (timeline, reason)

5. **learning_pace**: Float 0.0-1.0 based on their study habits
   - "1-2 hours a day" + "take my time" → 0.2-0.3 (slow/thorough)
   - "few hours a week" → 0.4-0.5 (moderate)
   - "intensive study" or "fast learner" → 0.7-0.9 (fast-paced)

6. **content_preferences**: List of preferred formats
   - Extract ALL mentioned preferences: ["videos", "diagrams", "interactive"]
   - Use human-readable: "videos", "diagrams", "reading", "hands-on practice"

IMPORTANT RULES:
- Extract MULTIPLE items for list fields (weak_points, goals, content_preferences)
- Use HUMAN-READABLE values, not snake_case
- For knowledge_base, include specific topics with mastery scores
- If they say "I want to learn X", that's a GOAL, not knowledge_base
- If they say "I struggle with X", that's a WEAK_POINT
- Confidence should reflect how explicit the statement was

CRITICAL: You MUST respond with ONLY a JSON object. No explanations, no markdown, no text before or after. Just the raw JSON starting with { and ending with }

Return ONLY this JSON structure:
{
    "extractions": [
        {
            "dimension": "knowledge_base",
            "value": {"python": 0.8, "data_structures": 0.7, "arrays": 0.7, "linked_lists": 0.7},
            "confidence": 0.9,
            "evidence_quote": "I'm pretty comfortable with Python and basic data structures like arrays and linked lists"
        },
        {
            "dimension": "weak_points",
            "value": ["Dynamic programming", "Graph traversal", "Linux commands"],
            "confidence": 0.9,
            "evidence_quote": "I really struggle with algorithms — especially dynamic programming and graph traversal... Linux commands also confuse me"
        }
    ],
    "analysis": "Student has 2 years CS background, strong in Python/data structures, struggles with algorithms and Linux, wants to learn AWS for internship, prefers visual learning at a slow pace"
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

    def __init__(self, llm=None):
        self.llm = llm or llm_client
        self.extraction_history: List[ExtractionResult] = []

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

            raw_content = response["choices"][0]["message"]["content"]
            logger.info(f"Raw extraction response: {raw_content[:500]}...")

            # Parse the JSON response
            result = self._parse_extraction_response(raw_content)
            result.raw_response = raw_content

            # Validate and normalize extractions
            result.extractions = self._validate_extractions(result.extractions)

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

    def _parse_extraction_response(self, content: str) -> ExtractionResult:
        """Parse JSON response from LLM into ExtractionResult."""
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
            for ext_data in data.get("extractions", []):
                extraction = ProfileExtraction(
                    dimension=ext_data.get("dimension", ""),
                    value=ext_data.get("value"),
                    confidence=ext_data.get("confidence", 0.0),
                    evidence_quote=ext_data.get("evidence_quote", "")
                )
                extractions.append(extraction)

            return ExtractionResult(
                extractions=extractions,
                analysis=data.get("analysis", "")
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
                return [str(v).lower().replace(" ", "_") for v in value]
            elif isinstance(value, str):
                return [value.lower().replace(" ", "_")]
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
