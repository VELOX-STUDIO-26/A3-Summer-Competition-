"""
Hierarchical Knowledge Graph Generator Agent (v2.1)

Generates two-level knowledge graphs:
- Main Topics (5-12): Major milestones
- Subtopics (3-8 per main): Learnable units

Each subtopic is a concrete learning unit where resources are generated.
"""

import json
import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from core.config import settings
from core.llm_client import llm_client
from core.logging import get_logger

logger = get_logger(__name__)


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class SubtopicNode:
    """A subtopic (learnable unit) within a main topic."""
    node_id: str
    title: str
    description: str
    difficulty: float
    estimated_minutes: int
    learning_points: List[str]
    prerequisites: List[str] = field(default_factory=list)
    topic_tags: List[str] = field(default_factory=list)
    content_types: List[str] = field(default_factory=list)
    order_index: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "title": self.title,
            "description": self.description,
            "difficulty": self.difficulty,
            "estimated_minutes": self.estimated_minutes,
            "learning_points": self.learning_points,
            "prerequisites": self.prerequisites,
            "topic_tags": self.topic_tags,
            "content_types": self.content_types,
            "order_index": self.order_index,
        }


@dataclass
class MainTopicNode:
    """A main topic (milestone) containing subtopics."""
    node_id: str
    title: str
    description: str
    difficulty: float  # Average of subtopics
    estimated_minutes: int  # Sum of subtopics
    prerequisites: List[str]  # Other main topic node_ids
    subtopics: List[SubtopicNode]
    topic_tags: List[str] = field(default_factory=list)
    order_index: int = 0
    # Planned subtopic count used when subtopics are generated lazily (two-pass
    # generation): the first pass plans how many subtopics a milestone will have
    # without generating their full detail yet.
    planned_subtopic_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "title": self.title,
            "description": self.description,
            "difficulty": self.difficulty,
            "estimated_minutes": self.estimated_minutes,
            "prerequisites": self.prerequisites,
            "subtopics": [s.to_dict() for s in self.subtopics],
            "topic_tags": self.topic_tags,
            "order_index": self.order_index,
            "subtopic_count": len(self.subtopics),
        }


@dataclass
class HierarchicalGraph:
    """Result of hierarchical knowledge graph generation."""
    subject: str
    subject_normalized: str
    difficulty_level: str
    estimated_weeks: int
    main_topics: List[MainTopicNode]
    tags: List[str]
    total_subtopic_count: int = 0
    total_estimated_minutes: int = 0
    is_valid: bool = True
    validation_errors: List[str] = field(default_factory=list)
    raw_response: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "subject": self.subject,
            "subject_normalized": self.subject_normalized,
            "difficulty_level": self.difficulty_level,
            "estimated_weeks": self.estimated_weeks,
            "main_topics": [m.to_dict() for m in self.main_topics],
            "tags": self.tags,
            "main_topic_count": len(self.main_topics),
            "total_subtopic_count": self.total_subtopic_count,
            "total_estimated_minutes": self.total_estimated_minutes,
            "is_valid": self.is_valid,
            "validation_errors": self.validation_errors,
        }


# ============================================================================
# Prompts
# ============================================================================

HIERARCHICAL_GRAPH_PROMPT = """You are an expert curriculum designer. Generate a HIERARCHICAL knowledge graph for learning {subject}.

Student Context:
- Goals: {goals}
- Current Knowledge: {knowledge_base}
- Learning Style: {cognitive_style}
- Pace: {learning_pace}

STRUCTURE REQUIREMENTS:
1. Generate 5-12 MAIN TOPICS (major milestones)
2. Each main topic must have 3-8 SUBTOPICS (learnable units)
3. Total subtopics should be 15-60 across all main topics

MAIN TOPIC Requirements:
- node_id: Unique ID in snake_case (e.g., "python_fundamentals")
- title: Clear milestone name (e.g., "Python Fundamentals")
- description: 1-2 sentences about this milestone
- difficulty: Average difficulty 0.0-1.0
- prerequisites: List of OTHER main topic node_ids that must come before
- subtopics: Array of 3-8 subtopics

SUBTOPIC Requirements (these are the actual learning units):
- node_id: Unique ID in snake_case (e.g., "python_functions")
- title: Specific topic name (e.g., "Functions & Lambdas")
- description: What the student will learn
- difficulty: Score 0.0 (beginner) to 1.0 (expert)
- estimated_minutes: Time to learn (15-60 minutes per subtopic)
- learning_points: 3-5 key concepts covered
- prerequisites: List of subtopic node_ids WITHIN THE SAME main topic
- topic_tags: Relevant tags
- content_types: ["text", "video", "code", "quiz"] - what content to generate

RULES:
1. Main topics should be ordered logically (basics → advanced)
2. Subtopics within a main topic should also be ordered
3. No cycles in prerequisites
4. At least 1 main topic with no prerequisites (entry point)
5. Be SPECIFIC - "Linear Regression" not "ML Basics"
6. Each subtopic should be learnable in 15-60 minutes

Return ONLY valid JSON (no markdown, no explanation):
{{
  "subject": "{subject}",
  "difficulty_level": "beginner|intermediate|advanced",
  "estimated_weeks": 8,
  "tags": ["tag1", "tag2"],
  "main_topics": [
    {{
      "node_id": "python_fundamentals",
      "title": "Python Fundamentals",
      "description": "Core Python skills needed for this subject",
      "difficulty": 0.2,
      "prerequisites": [],
      "topic_tags": ["python", "programming"],
      "subtopics": [
        {{
          "node_id": "python_variables",
          "title": "Variables & Data Types",
          "description": "Learn Python variables, strings, numbers, and basic data types",
          "difficulty": 0.1,
          "estimated_minutes": 25,
          "learning_points": ["Variables", "Strings", "Numbers", "Type conversion"],
          "prerequisites": [],
          "topic_tags": ["python", "basics"],
          "content_types": ["text", "code", "quiz"]
        }},
        {{
          "node_id": "python_control_flow",
          "title": "Control Flow",
          "description": "If statements, loops, and program flow",
          "difficulty": 0.2,
          "estimated_minutes": 30,
          "learning_points": ["If/else", "For loops", "While loops", "Break/continue"],
          "prerequisites": ["python_variables"],
          "topic_tags": ["python", "control flow"],
          "content_types": ["text", "code", "quiz"]
        }}
      ]
    }}
  ]
}}"""


# Pass 1 of two-pass generation: plan the milestones (main topics) only, with no
# subtopic detail. This response is small and fast, letting the UI render the
# learning path immediately.
MAIN_TOPICS_PROMPT = """You are an expert curriculum designer. Plan the MILESTONES (main topics) for learning {subject}.

Student Context:
- Goals: {goals}
- Current Knowledge: {knowledge_base}
- Learning Style: {cognitive_style}
- Pace: {learning_pace}

Generate 5-12 MAIN TOPICS (major milestones) ONLY. Do NOT generate subtopics.

MAIN TOPIC Requirements:
- node_id: Unique ID in snake_case (e.g., "python_fundamentals")
- title: Clear milestone name (e.g., "Python Fundamentals")
- description: 1-2 sentences about this milestone
- difficulty: Score 0.0 (beginner) to 1.0 (expert)
- prerequisites: List of OTHER main topic node_ids that must come before
- topic_tags: Relevant tags
- planned_subtopic_count: How many subtopics this milestone will have (3-8)

RULES:
1. Main topics ordered logically (basics -> advanced)
2. No cycles in prerequisites
3. At least 1 main topic with no prerequisites (entry point)
4. Be SPECIFIC about milestone scope

Return ONLY valid JSON (no markdown, no explanation):
{{
  "subject": "{subject}",
  "difficulty_level": "beginner|intermediate|advanced",
  "estimated_weeks": 8,
  "tags": ["tag1", "tag2"],
  "main_topics": [
    {{
      "node_id": "python_fundamentals",
      "title": "Python Fundamentals",
      "description": "Core Python skills needed for this subject",
      "difficulty": 0.2,
      "prerequisites": [],
      "topic_tags": ["python", "programming"],
      "planned_subtopic_count": 5
    }}
  ]
}}"""


# Pass 2 of two-pass generation: expand a single milestone into its subtopics.
# Called lazily, only for the milestone the student is about to study.
SUBTOPICS_PROMPT = """You are an expert curriculum designer. Generate the SUBTOPICS (learnable units) for ONE milestone in a {subject} course.

Milestone: {main_title}
Milestone description: {main_description}
Student Context:
- Goals: {goals}
- Current Knowledge: {knowledge_base}
- Learning Style: {cognitive_style}
- Pace: {learning_pace}

Generate {target_count} SUBTOPICS (between 3 and 8) for THIS milestone only.

SUBTOPIC Requirements:
- node_id: Unique ID in snake_case (e.g., "python_functions")
- title: Specific topic name (e.g., "Functions & Lambdas")
- description: What the student will learn
- difficulty: Score 0.0 (beginner) to 1.0 (expert)
- estimated_minutes: Time to learn (15-60 minutes per subtopic)
- learning_points: 3-5 key concepts covered
- prerequisites: List of subtopic node_ids WITHIN THIS milestone
- topic_tags: Relevant tags
- content_types: ["text", "video", "code", "quiz"] - what content to generate

RULES:
1. Subtopics ordered logically (basics -> advanced)
2. No cycles in prerequisites
3. Be SPECIFIC - "Linear Regression" not "ML Basics"
4. Each subtopic learnable in 15-60 minutes

Return ONLY valid JSON (no markdown, no explanation):
{{
  "subtopics": [
    {{
      "node_id": "python_variables",
      "title": "Variables & Data Types",
      "description": "Learn Python variables, strings, numbers, and basic data types",
      "difficulty": 0.1,
      "estimated_minutes": 25,
      "learning_points": ["Variables", "Strings", "Numbers", "Type conversion"],
      "prerequisites": [],
      "topic_tags": ["python", "basics"],
      "content_types": ["text", "code", "quiz"]
    }}
  ]
}}"""


# ============================================================================
# Helper Functions
# ============================================================================

def normalize_subject(subject: str) -> str:
    """Normalize subject name for consistent searching."""
    return subject.lower().strip().replace(" ", "_").replace("-", "_")


def _repair_truncated_json(content: str) -> str:
    """Attempt to repair truncated/malformed JSON."""
    # Track state while parsing
    in_string = False
    escape_next = False
    stack = []  # Track open brackets/braces
    last_valid_pos = 0
    
    for i, char in enumerate(content):
        if escape_next:
            escape_next = False
            continue
        if char == '\\' and in_string:
            escape_next = True
            continue
        if char == '"':
            in_string = not in_string
            if not in_string:
                last_valid_pos = i
            continue
        
        if in_string:
            continue
            
        if char in '{[':
            stack.append(char)
            last_valid_pos = i
        elif char == '}':
            if stack and stack[-1] == '{':
                stack.pop()
                last_valid_pos = i
        elif char == ']':
            if stack and stack[-1] == '[':
                stack.pop()
                last_valid_pos = i
    
    # If we're inside a string, truncate to last valid position and close
    if in_string:
        # Find the last complete key-value pair
        content = content[:last_valid_pos + 1]
        # Recount after truncation
        in_string = False
        stack = []
        for char in content:
            if escape_next:
                escape_next = False
                continue
            if char == '\\':
                escape_next = True
                continue
            if char == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if char in '{[':
                stack.append(char)
            elif char == '}' and stack and stack[-1] == '{':
                stack.pop()
            elif char == ']' and stack and stack[-1] == '[':
                stack.pop()
    
    # Remove trailing incomplete elements (trailing commas, partial keys)
    content = re.sub(r',\s*"[^"]*$', '', content)  # Remove incomplete key
    content = re.sub(r',\s*$', '', content)  # Remove trailing comma
    content = re.sub(r':\s*$', ': null', content)  # Fix incomplete value
    
    # Close any remaining open brackets/braces in correct order
    for bracket in reversed(stack):
        if bracket == '{':
            content += '}'
        elif bracket == '[':
            content += ']'
    
    return content


def _parse_json_response(content: str) -> Dict[str, Any]:
    """Parse JSON from LLM response, handling markdown code blocks and truncation."""
    content = content.strip()
    
    # Remove markdown code blocks
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    
    # First try direct parsing
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass
    
    # Try to repair truncated JSON
    logger.warning("JSON parsing failed, attempting repair...")
    repaired = _repair_truncated_json(content)
    
    try:
        return json.loads(repaired)
    except json.JSONDecodeError as e:
        # Log the problematic content for debugging
        logger.error(f"JSON repair failed. Content length: {len(content)}, Error: {e}")
        raise


def _validate_hierarchical_structure(data: Dict[str, Any]) -> List[str]:
    """Validate the hierarchical graph structure. Only returns critical errors."""
    errors = []
    
    main_topics = data.get("main_topics", [])
    
    # Check main topic count - only fail if we have 0 topics
    if len(main_topics) == 0:
        errors.append("No main topics generated")
    elif len(main_topics) < 3:
        logger.warning(f"Only {len(main_topics)} main topics (recommended 3-12)")
    if len(main_topics) > 15:
        logger.warning(f"{len(main_topics)} main topics (recommended max 12)")
    
    # First pass: collect all node IDs
    all_node_ids = set()
    main_topic_ids = set()
    all_subtopic_ids = set()
    total_subtopics = 0
    
    for i, main in enumerate(main_topics):
        main_id = main.get("node_id", f"main_{i}")
        main_topic_ids.add(main_id)
        all_node_ids.add(main_id)
        
        for j, sub in enumerate(main.get("subtopics", [])):
            sub_id = sub.get("node_id", f"sub_{i}_{j}")
            all_subtopic_ids.add(sub_id)
            all_node_ids.add(sub_id)
    
    # Second pass: validate structure
    seen_node_ids = set()
    
    for i, main in enumerate(main_topics):
        main_id = main.get("node_id", f"main_{i}")
        
        # Check for duplicate main topic IDs
        if main_id in seen_node_ids:
            errors.append(f"Duplicate node_id: {main_id}")
        seen_node_ids.add(main_id)
        
        # Check required fields
        if not main.get("title"):
            errors.append(f"Main topic {main_id} missing title")
        
        # Check subtopics - be lenient, only warn
        subtopics = main.get("subtopics", [])
        if len(subtopics) == 0:
            logger.warning(f"Main topic '{main_id}' has no subtopics")
        elif len(subtopics) < 2:
            logger.warning(f"Main topic '{main_id}' has only {len(subtopics)} subtopics (recommended 2-8)")
        if len(subtopics) > 10:
            logger.warning(f"Main topic '{main_id}' has {len(subtopics)} subtopics (recommended max 8)")
        
        total_subtopics += len(subtopics)
        
        # Validate subtopics
        for j, sub in enumerate(subtopics):
            sub_id = sub.get("node_id", f"sub_{i}_{j}")
            
            # Check for duplicate subtopic IDs
            if sub_id in seen_node_ids:
                errors.append(f"Duplicate node_id: {sub_id}")
            seen_node_ids.add(sub_id)
            
            # Check required fields - warn but don't fail for missing title/learning_points
            # as these can be auto-filled with defaults
            if not sub.get("title"):
                logger.warning(f"Subtopic {sub_id} missing title, will use node_id as title")
            if not sub.get("learning_points"):
                logger.warning(f"Subtopic {sub_id} missing learning_points, will use empty list")
            
            # Check estimated time - warn but don't fail, use default of 30 if missing
            est_min = sub.get("estimated_minutes", 30)
            if est_min < 15 or est_min > 60:
                logger.warning(f"Subtopic '{sub_id}' has {est_min} minutes (expected 15-60), will use default")
            
            # Check difficulty
            diff = sub.get("difficulty", 0.5)
            if diff < 0 or diff > 1:
                errors.append(f"Subtopic '{sub_id}' has invalid difficulty {diff}")
            
            # Check prerequisites exist (can be from any subtopic, not just same main topic)
            for prereq in sub.get("prerequisites", []):
                if prereq == sub_id:
                    errors.append(f"Subtopic '{sub_id}' has self-referential prerequisite")
                elif prereq not in all_subtopic_ids:
                    # Silently ignore invalid prerequisites - LLM sometimes generates these
                    # Just log a warning instead of failing validation
                    logger.warning(f"Subtopic '{sub_id}' has unknown prerequisite '{prereq}', ignoring")
    
    # Check total subtopic count - only warn, don't fail
    if total_subtopics == 0:
        errors.append("No subtopics generated")
    elif total_subtopics < 6:
        logger.warning(f"Only {total_subtopics} total subtopics (recommended 6-60)")
    if total_subtopics > 60:
        logger.warning(f"{total_subtopics} total subtopics (recommended max 60)")
    
    # Check main topic prerequisites - warn but don't fail
    for main in main_topics:
        main_id = main.get("node_id")
        for prereq in main.get("prerequisites", []):
            if prereq not in main_topic_ids:
                logger.warning(f"Main topic '{main_id}' has unknown prerequisite '{prereq}', ignoring")
            if prereq == main_id:
                errors.append(f"Main topic '{main_id}' has self-referential prerequisite")
    
    # Check for cycles in main topics
    cycle_errors = _detect_cycles_in_main_topics(main_topics)
    errors.extend(cycle_errors)
    
    return errors


def _detect_cycles_in_main_topics(main_topics: List[Dict[str, Any]]) -> List[str]:
    """Detect circular dependencies in main topic prerequisites."""
    prereq_map = {m["node_id"]: set(m.get("prerequisites", [])) for m in main_topics}
    errors = []
    
    visited = set()
    rec_stack = set()
    
    def dfs(node_id: str, path: List[str]) -> bool:
        if node_id in rec_stack:
            cycle_start = path.index(node_id)
            cycle = path[cycle_start:] + [node_id]
            errors.append(f"Cycle detected in main topics: {' -> '.join(cycle)}")
            return True
        
        if node_id in visited:
            return False
        
        visited.add(node_id)
        rec_stack.add(node_id)
        path.append(node_id)
        
        for prereq in prereq_map.get(node_id, []):
            if prereq in prereq_map:  # Only check valid node IDs
                if dfs(prereq, path):
                    return True
        
        path.pop()
        rec_stack.remove(node_id)
        return False
    
    for node_id in prereq_map:
        if node_id not in visited:
            dfs(node_id, [])
    
    return errors


# ============================================================================
# Generator Class
# ============================================================================

class HierarchicalGraphGenerator:
    """Generates hierarchical knowledge graphs using LLM."""

    def __init__(self, llm=None):
        self.llm = llm or llm_client
        self.agent_name = "HierarchicalGraphGenerator"
        logger.info(f"Initialized {self.agent_name}")

    async def generate(
        self,
        subject: str,
        goals: List[str] = None,
        knowledge_base: Dict[str, float] = None,
        cognitive_style: str = "mixed",
        learning_pace: float = 0.5,
        template_structure: Dict[str, Any] = None,
    ) -> HierarchicalGraph:
        """
        Generate a hierarchical knowledge graph for a subject.

        Args:
            subject: The subject to generate a graph for
            goals: Learning goals
            knowledge_base: Student's current knowledge
            cognitive_style: Learning style preference
            learning_pace: Learning speed (0-1)
            template_structure: Optional structure from a highly-rated path to guide generation

        Returns:
            HierarchicalGraph with main topics and subtopics
        """
        goals = goals or []
        knowledge_base = knowledge_base or {}
        
        # Format knowledge base for prompt
        kb_str = ", ".join(f"{k}: {v:.0%}" for k, v in knowledge_base.items()) if knowledge_base else "None"
        goals_str = ", ".join(goals) if goals else "General understanding"
        
        # Build template guidance if available
        template_guidance = ""
        if template_structure:
            template_guidance = f"""

TEMPLATE GUIDANCE (from a highly-rated learning path):
- Recommended main topics: {', '.join(template_structure.get('main_topic_titles', []))}
- Number of main topics: {template_structure.get('main_topic_count', 'N/A')}
- Subtopics per topic: {template_structure.get('subtopics_per_topic', [])}
- Total estimated time: {template_structure.get('total_estimated_minutes', 'N/A')} minutes

Use this as inspiration but adapt to the student's specific goals and knowledge level.
"""
        
        prompt = HIERARCHICAL_GRAPH_PROMPT.format(
            subject=subject,
            goals=goals_str,
            knowledge_base=kb_str,
            cognitive_style=cognitive_style,
            learning_pace=f"{learning_pace:.0%}"
        ) + template_guidance

        max_retries = 2  # Reduced from 3 to keep total time under 5 minutes
        last_error = None
        raw_content = ""
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Generating hierarchical graph for '{subject}' (attempt {attempt + 1}/{max_retries})")
                
                response = await self.llm.generate(
                    messages=[
                        {"role": "system", "content": "You are an expert curriculum designer. Return ONLY valid JSON with no markdown formatting. The JSON must be complete and properly closed. Do not truncate the response."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.5 if attempt == 0 else 0.3,  # Lower temperature on retries
                    max_tokens=16000  # Larger for hierarchical structure
                )

                raw_content = response["choices"][0]["message"].get("content") or ""
                
                if not raw_content.strip():
                    last_error = "LLM returned empty response"
                    logger.warning(f"Attempt {attempt + 1}: {last_error}")
                    continue
                
                # Parse JSON
                try:
                    data = _parse_json_response(raw_content)
                except json.JSONDecodeError as e:
                    last_error = f"Invalid JSON response: {str(e)}"
                    logger.warning(f"Attempt {attempt + 1}: {last_error}")
                    continue

                # Validate structure
                validation_errors = _validate_hierarchical_structure(data)
                
                # If there are critical errors, retry
                if validation_errors:
                    last_error = f"Validation errors: {', '.join(validation_errors)}"
                    logger.warning(f"Attempt {attempt + 1}: {last_error}")
                    continue
                
                # Convert to dataclasses
                main_topics = []
                total_subtopics = 0
                total_minutes = 0
                
                for i, main_data in enumerate(data.get("main_topics", [])):
                    subtopics = []
                    main_minutes = 0
                    main_difficulty_sum = 0
                    
                    for j, sub_data in enumerate(main_data.get("subtopics", [])):
                        node_id = sub_data.get("node_id", f"subtopic_{i}_{j}")
                        # Use node_id as title if title is missing
                        title = sub_data.get("title") or node_id.replace("_", " ").title()
                        # Clamp estimated_minutes to valid range
                        est_min = sub_data.get("estimated_minutes", 30)
                        if est_min < 15 or est_min > 60:
                            est_min = 30
                        subtopic = SubtopicNode(
                            node_id=node_id,
                            title=title,
                            description=sub_data.get("description", ""),
                            difficulty=min(1.0, max(0.0, sub_data.get("difficulty", 0.5))),
                            estimated_minutes=est_min,
                            learning_points=sub_data.get("learning_points", []) or ["Key concepts"],
                            prerequisites=sub_data.get("prerequisites", []),
                            topic_tags=sub_data.get("topic_tags", []),
                            content_types=sub_data.get("content_types", ["text", "quiz"]),
                            order_index=j,
                        )
                        subtopics.append(subtopic)
                        main_minutes += subtopic.estimated_minutes
                        main_difficulty_sum += subtopic.difficulty
                    
                    total_subtopics += len(subtopics)
                    total_minutes += main_minutes
                    
                    avg_difficulty = main_difficulty_sum / len(subtopics) if subtopics else 0.5
                    
                    main_topic = MainTopicNode(
                        node_id=main_data.get("node_id", f"main_{i}"),
                        title=main_data.get("title") or f"Topic {i + 1}",
                        description=main_data.get("description", ""),
                        difficulty=avg_difficulty,
                        estimated_minutes=main_minutes,
                        prerequisites=main_data.get("prerequisites", []),
                        subtopics=subtopics,
                        topic_tags=main_data.get("topic_tags", []),
                        order_index=i,
                    )
                    main_topics.append(main_topic)

                logger.info(f"Successfully generated graph with {len(main_topics)} main topics and {total_subtopics} subtopics")
                return HierarchicalGraph(
                    subject=subject,
                    subject_normalized=normalize_subject(subject),
                    difficulty_level=data.get("difficulty_level", "intermediate"),
                    estimated_weeks=data.get("estimated_weeks", 8),
                    main_topics=main_topics,
                    tags=data.get("tags", []),
                    total_subtopic_count=total_subtopics,
                    total_estimated_minutes=total_minutes,
                    is_valid=True,
                    validation_errors=[],
                    raw_response=raw_content
                )

            except Exception as e:
                error_msg = str(e)
                if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
                    last_error = f"LLM request timed out (attempt {attempt + 1}). The model may be overloaded."
                else:
                    last_error = f"Generation failed: {error_msg}"
                logger.warning(f"Attempt {attempt + 1}: {last_error}")
                continue
        
        # All retries exhausted
        logger.error(f"All {max_retries} attempts failed. Last error: {last_error}")
        return HierarchicalGraph(
            subject=subject,
            subject_normalized=normalize_subject(subject),
            difficulty_level="intermediate",
            estimated_weeks=8,
            main_topics=[],
            tags=[],
            is_valid=False,
            validation_errors=[last_error or "Unknown error"],
            raw_response=raw_content
        )

    async def generate_main_topics(
        self,
        subject: str,
        goals: List[str] = None,
        knowledge_base: Dict[str, float] = None,
        cognitive_style: str = "mixed",
        learning_pace: float = 0.5,
        template_structure: Dict[str, Any] = None,
    ) -> HierarchicalGraph:
        """
        Pass 1 of two-pass generation: plan the milestones (main topics) only.

        Returns a HierarchicalGraph whose main topics have an empty ``subtopics``
        list and a ``planned_subtopic_count`` hint. The detailed subtopics are
        generated lazily per milestone via :meth:`generate_subtopics`.

        This call is much smaller/faster than :meth:`generate` because it does
        not emit any subtopic detail.
        """
        goals = goals or []
        knowledge_base = knowledge_base or {}

        kb_str = ", ".join(f"{k}: {v:.0%}" for k, v in knowledge_base.items()) if knowledge_base else "None"
        goals_str = ", ".join(goals) if goals else "General understanding"

        template_guidance = ""
        if template_structure:
            template_guidance = f"""

TEMPLATE GUIDANCE (from a highly-rated learning path):
- Recommended main topics: {', '.join(template_structure.get('main_topic_titles', []))}
- Number of main topics: {template_structure.get('main_topic_count', 'N/A')}

Use this as inspiration but adapt to the student's specific goals and knowledge level.
"""

        prompt = MAIN_TOPICS_PROMPT.format(
            subject=subject,
            goals=goals_str,
            knowledge_base=kb_str,
            cognitive_style=cognitive_style,
            learning_pace=f"{learning_pace:.0%}",
        ) + template_guidance

        max_retries = 2
        last_error = None
        raw_content = ""

        for attempt in range(max_retries):
            try:
                logger.info(f"Planning main topics for '{subject}' (attempt {attempt + 1}/{max_retries})")

                llm_start = time.perf_counter()
                response = await self.llm.generate(
                    messages=[
                        {"role": "system", "content": "You are an expert curriculum designer. Return ONLY valid JSON with no markdown formatting. The JSON must be complete and properly closed."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.5 if attempt == 0 else 0.3,
                    max_tokens=3000,  # Main topics only -> small output
                )
                logger.info(f"Main-topic LLM call for '{subject}' took {time.perf_counter() - llm_start:.2f}s")

                raw_content = response["choices"][0]["message"].get("content") or ""
                if not raw_content.strip():
                    last_error = "LLM returned empty response"
                    logger.warning(f"Attempt {attempt + 1}: {last_error}")
                    continue

                try:
                    data = _parse_json_response(raw_content)
                except json.JSONDecodeError as e:
                    last_error = f"Invalid JSON response: {str(e)}"
                    logger.warning(f"Attempt {attempt + 1}: {last_error}")
                    continue

                raw_main_topics = data.get("main_topics", [])
                if not raw_main_topics:
                    last_error = "No main topics returned"
                    logger.warning(f"Attempt {attempt + 1}: {last_error}")
                    continue
                if len(raw_main_topics) < 3:
                    last_error = f"Only {len(raw_main_topics)} main topic(s) returned (need at least 3)"
                    logger.warning(f"Attempt {attempt + 1}: {last_error}")
                    continue

                main_topics: List[MainTopicNode] = []
                for i, main_data in enumerate(raw_main_topics):
                    planned = main_data.get("planned_subtopic_count", 5)
                    try:
                        planned = int(planned)
                    except (TypeError, ValueError):
                        planned = 5
                    planned = min(8, max(3, planned))

                    main_topics.append(MainTopicNode(
                        node_id=main_data.get("node_id", f"main_{i}"),
                        title=main_data.get("title") or f"Topic {i + 1}",
                        description=main_data.get("description", ""),
                        difficulty=min(1.0, max(0.0, main_data.get("difficulty", 0.5))),
                        estimated_minutes=0,  # filled in when subtopics are generated
                        prerequisites=main_data.get("prerequisites", []),
                        subtopics=[],
                        topic_tags=main_data.get("topic_tags", []),
                        order_index=i,
                        planned_subtopic_count=planned,
                    ))

                logger.info(f"Planned {len(main_topics)} main topics for '{subject}' (subtopics deferred)")
                return HierarchicalGraph(
                    subject=subject,
                    subject_normalized=normalize_subject(subject),
                    difficulty_level=data.get("difficulty_level", "intermediate"),
                    estimated_weeks=data.get("estimated_weeks", 8),
                    main_topics=main_topics,
                    tags=data.get("tags", []),
                    total_subtopic_count=0,
                    total_estimated_minutes=0,
                    is_valid=True,
                    validation_errors=[],
                    raw_response=raw_content,
                )

            except Exception as e:
                last_error = f"Main topic planning failed: {str(e)}"
                logger.warning(f"Attempt {attempt + 1}: {last_error}")
                continue

        logger.error(f"All {max_retries} main-topic attempts failed. Last error: {last_error}")
        return HierarchicalGraph(
            subject=subject,
            subject_normalized=normalize_subject(subject),
            difficulty_level="intermediate",
            estimated_weeks=8,
            main_topics=[],
            tags=[],
            is_valid=False,
            validation_errors=[last_error or "Unknown error"],
            raw_response=raw_content,
        )

    async def generate_subtopics(
        self,
        subject: str,
        main_title: str,
        main_description: str = "",
        target_count: int = 5,
        goals: List[str] = None,
        knowledge_base: Dict[str, float] = None,
        cognitive_style: str = "mixed",
        learning_pace: float = 0.5,
    ) -> List[SubtopicNode]:
        """
        Pass 2 of two-pass generation: expand a single milestone into subtopics.

        Returns a list of :class:`SubtopicNode`. Raises ``ValueError`` if the
        model cannot produce valid subtopics after retries, so callers can fall
        back or surface the error.
        """
        goals = goals or []
        knowledge_base = knowledge_base or {}

        kb_str = ", ".join(f"{k}: {v:.0%}" for k, v in knowledge_base.items()) if knowledge_base else "None"
        goals_str = ", ".join(goals) if goals else "General understanding"
        target_count = min(8, max(3, target_count or 5))

        prompt = SUBTOPICS_PROMPT.format(
            subject=subject,
            main_title=main_title,
            main_description=main_description or main_title,
            goals=goals_str,
            knowledge_base=kb_str,
            cognitive_style=cognitive_style,
            learning_pace=f"{learning_pace:.0%}",
            target_count=target_count,
        )

        max_retries = 2
        last_error = None

        for attempt in range(max_retries):
            try:
                logger.info(f"Generating subtopics for milestone '{main_title}' (attempt {attempt + 1}/{max_retries})")

                llm_start = time.perf_counter()
                response = await self.llm.generate(
                    messages=[
                        {"role": "system", "content": "You are an expert curriculum designer. Return ONLY valid JSON with no markdown formatting. The JSON must be complete and properly closed."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.5 if attempt == 0 else 0.3,
                    max_tokens=4000,  # One milestone's subtopics -> moderate output
                )
                logger.info(f"Subtopic LLM call for '{main_title}' took {time.perf_counter() - llm_start:.2f}s")

                raw_content = response["choices"][0]["message"].get("content") or ""
                if not raw_content.strip():
                    last_error = "LLM returned empty response"
                    logger.warning(f"Attempt {attempt + 1}: {last_error}")
                    continue

                try:
                    data = _parse_json_response(raw_content)
                except json.JSONDecodeError as e:
                    last_error = f"Invalid JSON response: {str(e)}"
                    logger.warning(f"Attempt {attempt + 1}: {last_error}")
                    continue

                raw_subs = data.get("subtopics", []) if isinstance(data, dict) else data
                if not raw_subs:
                    last_error = "No subtopics returned"
                    logger.warning(f"Attempt {attempt + 1}: {last_error}")
                    continue
                if len(raw_subs) < 3:
                    last_error = f"Only {len(raw_subs)} subtopic(s) returned (need at least 3)"
                    logger.warning(f"Attempt {attempt + 1}: {last_error}")
                    continue

                subtopics: List[SubtopicNode] = []
                for j, sub_data in enumerate(raw_subs):
                    node_id = sub_data.get("node_id", f"subtopic_{j}")
                    title = sub_data.get("title") or node_id.replace("_", " ").title()
                    est_min = sub_data.get("estimated_minutes", 30)
                    if not isinstance(est_min, (int, float)) or est_min < 15 or est_min > 60:
                        est_min = 30
                    subtopics.append(SubtopicNode(
                        node_id=node_id,
                        title=title,
                        description=sub_data.get("description", ""),
                        difficulty=min(1.0, max(0.0, sub_data.get("difficulty", 0.5))),
                        estimated_minutes=int(est_min),
                        learning_points=sub_data.get("learning_points", []) or ["Key concepts"],
                        prerequisites=sub_data.get("prerequisites", []),
                        topic_tags=sub_data.get("topic_tags", []),
                        content_types=sub_data.get("content_types", ["text", "quiz"]),
                        order_index=j,
                    ))

                logger.info(f"Generated {len(subtopics)} subtopics for milestone '{main_title}'")
                return subtopics

            except Exception as e:
                last_error = f"Subtopic generation failed: {str(e)}"
                logger.warning(f"Attempt {attempt + 1}: {last_error}")
                continue

        raise ValueError(f"Subtopic generation failed for '{main_title}': {last_error}")


# ============================================================================
# Validator Class
# ============================================================================

class HierarchicalGraphValidator:
    """Validates hierarchical knowledge graphs using LLM for semantic quality."""

    def __init__(self, llm=None):
        self.llm = llm or llm_client
        self.agent_name = "HierarchicalGraphValidator"

    async def validate(self, graph: HierarchicalGraph, quick_mode: bool = True) -> Dict[str, Any]:
        """
        Validate a hierarchical graph for quality and completeness.

        Args:
            graph: The graph to validate
            quick_mode: If True, use faster heuristic checks. If False, use full LLM validation.

        Returns validation result with issues and suggestions.
        """
        # First do structural validation
        structural_errors = _validate_hierarchical_structure(graph.to_dict())
        
        if structural_errors:
            return {
                "is_valid": False,
                "confidence": 0.0,
                "issues": [{"type": "structural", "severity": "high", "description": e} for e in structural_errors],
                "suggestions": [],
                "missing_topics": [],
                "overall_quality": "poor"
            }

        # Quick heuristic validation (always run)
        heuristic_result = self._heuristic_validation(graph)
        
        if quick_mode:
            return heuristic_result
        
        # Full LLM-based semantic validation
        try:
            llm_result = await self._llm_semantic_validation(graph)
            return self._merge_validation_results(heuristic_result, llm_result)
        except Exception as e:
            logger.warning(f"LLM validation failed, using heuristic only: {e}")
            return heuristic_result

    def _heuristic_validation(self, graph: HierarchicalGraph) -> Dict[str, Any]:
        """Fast heuristic-based validation without LLM."""
        issues = []
        suggestions = []
        quality_score = 100.0
        
        # Check topic coverage
        topic_count = len(graph.main_topics)
        if topic_count < 4:
            issues.append({
                "type": "coverage",
                "severity": "medium",
                "description": f"Only {topic_count} main topics - may not cover subject comprehensively"
            })
            quality_score -= 15
        
        # Check subtopic distribution
        subtopic_counts = [len(mt.subtopics) for mt in graph.main_topics]
        if subtopic_counts:
            min_subs = min(subtopic_counts)
            max_subs = max(subtopic_counts)
            if max_subs > min_subs * 3:
                issues.append({
                    "type": "balance",
                    "severity": "low",
                    "description": f"Uneven subtopic distribution ({min_subs}-{max_subs} per topic)"
                })
                quality_score -= 5
        
        # Check difficulty progression
        difficulties = [mt.difficulty for mt in graph.main_topics]
        if len(difficulties) >= 3:
            # Check if difficulty generally increases
            increasing_pairs = sum(1 for i in range(len(difficulties)-1) if difficulties[i] <= difficulties[i+1])
            if increasing_pairs < len(difficulties) // 2:
                suggestions.append("Consider reordering topics for smoother difficulty progression")
                quality_score -= 5
        
        # Check time estimates
        total_minutes = graph.total_estimated_minutes
        if total_minutes < 300:  # Less than 5 hours
            issues.append({
                "type": "depth",
                "severity": "medium",
                "description": f"Total time ({total_minutes} min) seems too short for comprehensive learning"
            })
            quality_score -= 10
        elif total_minutes > 6000:  # More than 100 hours
            suggestions.append("Consider breaking into multiple learning paths")
            quality_score -= 5
        
        # Check for prerequisite chains
        has_prerequisites = any(mt.prerequisites for mt in graph.main_topics)
        if not has_prerequisites and topic_count > 3:
            suggestions.append("Adding prerequisites between topics would improve learning flow")
            quality_score -= 5
        
        # Determine overall quality
        if quality_score >= 85:
            overall_quality = "excellent"
        elif quality_score >= 70:
            overall_quality = "good"
        elif quality_score >= 50:
            overall_quality = "acceptable"
        else:
            overall_quality = "needs_improvement"
        
        return {
            "is_valid": quality_score >= 50,
            "confidence": min(0.95, quality_score / 100),
            "quality_score": quality_score,
            "issues": issues,
            "suggestions": suggestions,
            "missing_topics": [],
            "overall_quality": overall_quality
        }

    async def _llm_semantic_validation(self, graph: HierarchicalGraph) -> Dict[str, Any]:
        """Use LLM to validate semantic quality of the curriculum."""
        
        # Build a summary of the graph for the LLM
        topics_summary = "\n".join([
            f"{i+1}. {mt.title} ({len(mt.subtopics)} subtopics, {mt.estimated_minutes}min)"
            for i, mt in enumerate(graph.main_topics)
        ])
        
        prompt = f"""You are an expert curriculum designer. Evaluate this learning path for "{graph.subject}":

MAIN TOPICS:
{topics_summary}

TOTAL: {len(graph.main_topics)} topics, {graph.total_subtopic_count} subtopics, {graph.total_estimated_minutes} minutes

Evaluate and respond in JSON format:
{{
    "is_comprehensive": true/false,
    "missing_essential_topics": ["topic1", "topic2"],
    "redundant_topics": ["topic if any"],
    "ordering_issues": ["issue if any"],
    "difficulty_appropriate": true/false,
    "suggestions": ["suggestion1", "suggestion2"],
    "quality_score": 0-100,
    "brief_assessment": "1-2 sentence summary"
}}

Be concise and practical. Focus on major issues only."""

        try:
            response = await self.llm.chat(
                messages=[{"role": "user", "content": prompt}],
                model="anthropic/claude-3-haiku-20240307",  # Use fast model for validation
                temperature=0.3,
                max_tokens=500,
            )
            
            content = response.choices[0].message.content
            
            # Parse JSON from response
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                result = json.loads(json_match.group())
                
                issues = []
                if not result.get("is_comprehensive", True):
                    issues.append({
                        "type": "coverage",
                        "severity": "high",
                        "description": "Curriculum may not be comprehensive"
                    })
                
                for topic in result.get("missing_essential_topics", []):
                    issues.append({
                        "type": "missing_topic",
                        "severity": "medium",
                        "description": f"Missing essential topic: {topic}"
                    })
                
                for issue in result.get("ordering_issues", []):
                    issues.append({
                        "type": "ordering",
                        "severity": "low",
                        "description": issue
                    })
                
                return {
                    "is_valid": result.get("quality_score", 70) >= 50,
                    "confidence": 0.85,
                    "quality_score": result.get("quality_score", 70),
                    "issues": issues,
                    "suggestions": result.get("suggestions", []),
                    "missing_topics": result.get("missing_essential_topics", []),
                    "overall_quality": "good" if result.get("quality_score", 70) >= 70 else "needs_improvement",
                    "llm_assessment": result.get("brief_assessment", "")
                }
        except Exception as e:
            logger.error(f"LLM validation parsing failed: {e}")
            raise
        
        return {
            "is_valid": True,
            "confidence": 0.5,
            "issues": [],
            "suggestions": [],
            "missing_topics": [],
            "overall_quality": "unknown"
        }

    def _merge_validation_results(
        self, 
        heuristic: Dict[str, Any], 
        llm: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Merge heuristic and LLM validation results."""
        # Combine issues, avoiding duplicates
        all_issues = heuristic.get("issues", []) + llm.get("issues", [])
        
        # Combine suggestions
        all_suggestions = list(set(
            heuristic.get("suggestions", []) + llm.get("suggestions", [])
        ))
        
        # Average quality scores with LLM weighted higher
        h_score = heuristic.get("quality_score", 70)
        l_score = llm.get("quality_score", 70)
        combined_score = (h_score * 0.3 + l_score * 0.7)
        
        return {
            "is_valid": combined_score >= 50,
            "confidence": max(heuristic.get("confidence", 0.5), llm.get("confidence", 0.5)),
            "quality_score": combined_score,
            "issues": all_issues,
            "suggestions": all_suggestions,
            "missing_topics": llm.get("missing_topics", []),
            "overall_quality": llm.get("overall_quality", heuristic.get("overall_quality", "unknown")),
            "llm_assessment": llm.get("llm_assessment", "")
        }


# Singleton instances
hierarchical_graph_generator = HierarchicalGraphGenerator()
hierarchical_graph_validator = HierarchicalGraphValidator()
