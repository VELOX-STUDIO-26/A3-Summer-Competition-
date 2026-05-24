"""
Knowledge Graph Generator Agent

Generates knowledge graphs dynamically using LLM for any subject.
Includes validation and structural checks.
"""

import json
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

from core.llm_client import llm_client
from core.logging import get_logger

logger = get_logger(__name__)


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class KnowledgeNode:
    """A node in the knowledge graph."""
    node_id: str
    title: str
    description: str
    difficulty: float
    estimated_minutes: int
    prerequisites: List[str]
    soft_prerequisites: List[str] = field(default_factory=list)
    topic_tags: List[str] = field(default_factory=list)
    content_types: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "title": self.title,
            "description": self.description,
            "difficulty": self.difficulty,
            "estimated_minutes": self.estimated_minutes,
            "prerequisites": self.prerequisites,
            "soft_prerequisites": self.soft_prerequisites,
            "topic_tags": self.topic_tags,
            "content_types": self.content_types
        }


@dataclass
class GeneratedGraph:
    """Result of knowledge graph generation."""
    subject: str
    subject_normalized: str
    difficulty_level: str
    estimated_weeks: int
    nodes: List[KnowledgeNode]
    tags: List[str]
    is_valid: bool = True
    validation_errors: List[str] = field(default_factory=list)
    raw_response: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "subject": self.subject,
            "subject_normalized": self.subject_normalized,
            "difficulty_level": self.difficulty_level,
            "estimated_weeks": self.estimated_weeks,
            "nodes": [n.to_dict() for n in self.nodes],
            "tags": self.tags,
            "is_valid": self.is_valid,
            "validation_errors": self.validation_errors
        }


@dataclass
class ValidationResult:
    """Result of graph validation."""
    is_valid: bool
    confidence: float
    issues: List[Dict[str, Any]]
    suggestions: List[Dict[str, Any]]
    missing_topics: List[str]
    overall_quality: str  # poor | acceptable | good | excellent


# ============================================================================
# Prompts
# ============================================================================

KNOWLEDGE_GRAPH_GENERATION_PROMPT = """You are an expert curriculum designer. Generate a knowledge graph for learning {subject}.

Student Context:
- Goals: {goals}
- Current Knowledge: {knowledge_base}
- Learning Style: {cognitive_style}
- Pace: {learning_pace}

Requirements:
1. Generate 15-40 topic nodes (appropriate for the subject scope)
2. Each node must have:
   - node_id: Unique ID in snake_case (e.g., "linear_regression")
   - title: Clear, specific title (not vague like "basics")
   - description: 1-2 sentence description
   - difficulty: Score 0.0 (beginner) to 1.0 (expert)
   - estimated_minutes: Time to learn (15-120 minutes)
   - prerequisites: List of node_ids that must come before
   - topic_tags: List of relevant tags
3. Ensure logical prerequisite chains (no cycles)
4. Include at least 2 "entry point" nodes (no prerequisites)
5. Difficulty should generally increase along prerequisite chains
6. Be SPECIFIC - "Linear Regression" not "ML Basics"

Return ONLY valid JSON (no markdown, no explanation):
{{
  "subject": "{subject}",
  "difficulty_level": "beginner|intermediate|advanced",
  "estimated_weeks": 8,
  "nodes": [
    {{
      "node_id": "python_for_ml",
      "title": "Python for Machine Learning",
      "description": "Essential Python skills for ML including NumPy and Pandas",
      "difficulty": 0.2,
      "estimated_minutes": 60,
      "prerequisites": [],
      "topic_tags": ["python", "numpy", "pandas"]
    }}
  ],
  "tags": ["machine learning", "AI", "data science", "python"]
}}"""


GRAPH_VALIDATION_PROMPT = """You are a curriculum quality reviewer. Analyze this knowledge graph for {subject}.

Knowledge Graph:
{graph_json}

Check for these issues:
1. STRUCTURAL: Circular prerequisites, orphan nodes, missing required fields
2. LOGICAL: Wrong prerequisite order (e.g., advanced before basics)
3. COMPLETENESS: Missing critical topics for this subject
4. SPECIFICITY: Vague topic names that should be more specific
5. DIFFICULTY: Unrealistic difficulty progression
6. SCOPE: Too broad or too narrow for stated goals

Return ONLY valid JSON:
{{
  "is_valid": true,
  "confidence": 0.85,
  "issues": [
    {{"type": "logical", "severity": "high", "description": "...", "affected_nodes": ["node_id"]}}
  ],
  "suggestions": [
    {{"action": "add_node", "details": "Add 'Data Preprocessing' before 'Feature Engineering'"}},
    {{"action": "fix_prerequisite", "details": "..."}}
  ],
  "missing_topics": ["topic1", "topic2"],
  "overall_quality": "good"
}}"""


# ============================================================================
# Helper Functions
# ============================================================================

def normalize_subject(subject: str) -> str:
    """Normalize subject name for consistent searching."""
    return subject.lower().strip().replace(" ", "_").replace("-", "_")


def _parse_json_response(content: str) -> Dict[str, Any]:
    """Parse JSON from LLM response, handling markdown code blocks."""
    content = content.strip()
    
    # Remove markdown code blocks
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    
    return json.loads(content)


def _detect_cycles(nodes: List[Dict[str, Any]]) -> List[str]:
    """Detect circular dependencies in prerequisites."""
    node_ids = {n["node_id"] for n in nodes}
    prereq_map = {n["node_id"]: set(n.get("prerequisites", [])) for n in nodes}
    
    cycles = []
    visited = set()
    rec_stack = set()
    
    def dfs(node_id: str, path: List[str]) -> bool:
        if node_id in rec_stack:
            cycle_start = path.index(node_id)
            cycles.append(" -> ".join(path[cycle_start:] + [node_id]))
            return True
        if node_id in visited:
            return False
        
        visited.add(node_id)
        rec_stack.add(node_id)
        
        for prereq in prereq_map.get(node_id, []):
            if prereq in node_ids:
                if dfs(prereq, path + [node_id]):
                    return True
        
        rec_stack.remove(node_id)
        return False
    
    for node_id in node_ids:
        if node_id not in visited:
            dfs(node_id, [])
    
    return cycles


def _find_orphan_nodes(nodes: List[Dict[str, Any]]) -> List[str]:
    """Find nodes that are not reachable from any entry point."""
    if not nodes:
        return []
    
    node_ids = {n["node_id"] for n in nodes}
    
    # Find entry points (nodes with no prerequisites)
    entry_points = [
        n["node_id"] for n in nodes 
        if not n.get("prerequisites") or len(n.get("prerequisites", [])) == 0
    ]
    
    if not entry_points:
        return list(node_ids)  # All nodes are orphans if no entry points
    
    # Build reverse adjacency (who depends on whom)
    dependents = {nid: set() for nid in node_ids}
    for n in nodes:
        for prereq in n.get("prerequisites", []):
            if prereq in dependents:
                dependents[prereq].add(n["node_id"])
    
    # BFS from entry points
    reachable = set(entry_points)
    queue = list(entry_points)
    
    while queue:
        current = queue.pop(0)
        for dependent in dependents.get(current, []):
            if dependent not in reachable:
                reachable.add(dependent)
                queue.append(dependent)
    
    return [nid for nid in node_ids if nid not in reachable]


def _validate_structure(nodes: List[Dict[str, Any]]) -> List[str]:
    """Validate structural requirements of the graph."""
    errors = []
    
    if not nodes:
        errors.append("Graph has no nodes")
        return errors
    
    if len(nodes) < 5:
        errors.append(f"Graph has only {len(nodes)} nodes, minimum is 5")
    
    if len(nodes) > 100:
        errors.append(f"Graph has {len(nodes)} nodes, maximum is 100")
    
    node_ids = set()
    for node in nodes:
        # Check required fields
        required = ["node_id", "title", "difficulty", "estimated_minutes", "prerequisites"]
        for field in required:
            if field not in node:
                errors.append(f"Node missing required field: {field}")
        
        # Check for duplicate IDs
        if node.get("node_id") in node_ids:
            errors.append(f"Duplicate node_id: {node.get('node_id')}")
        node_ids.add(node.get("node_id"))
        
        # Check difficulty range
        diff = node.get("difficulty", 0)
        if not (0.0 <= diff <= 1.0):
            errors.append(f"Node {node.get('node_id')} has invalid difficulty: {diff}")
        
        # Check time range
        time = node.get("estimated_minutes", 0)
        if not (5 <= time <= 300):
            errors.append(f"Node {node.get('node_id')} has invalid time: {time} minutes")
    
    # Check for cycles
    cycles = _detect_cycles(nodes)
    for cycle in cycles:
        errors.append(f"Circular dependency detected: {cycle}")
    
    # Check for orphan nodes
    orphans = _find_orphan_nodes(nodes)
    if orphans:
        errors.append(f"Orphan nodes (unreachable): {', '.join(orphans)}")
    
    # Check for entry points
    entry_points = [n for n in nodes if not n.get("prerequisites")]
    if not entry_points:
        errors.append("No entry points (nodes without prerequisites)")
    
    # Check prerequisites reference valid nodes
    for node in nodes:
        for prereq in node.get("prerequisites", []):
            if prereq not in node_ids:
                errors.append(f"Node {node.get('node_id')} has invalid prerequisite: {prereq}")
    
    return errors


# ============================================================================
# Knowledge Graph Generator
# ============================================================================

class KnowledgeGraphGenerator:
    """Generates knowledge graphs using LLM."""
    
    def __init__(self, llm=None):
        self.llm = llm or llm_client
    
    async def generate(
        self,
        subject: str,
        goals: List[str] = None,
        knowledge_base: Dict[str, float] = None,
        cognitive_style: str = "mixed",
        learning_pace: float = 0.5
    ) -> GeneratedGraph:
        """
        Generate a knowledge graph for the given subject.
        
        Args:
            subject: The subject to generate a graph for
            goals: Student's learning goals
            knowledge_base: Student's current knowledge
            cognitive_style: Student's learning style
            learning_pace: Student's learning pace (0-1)
        
        Returns:
            GeneratedGraph with nodes and validation status
        """
        goals = goals or []
        knowledge_base = knowledge_base or {}
        
        prompt = KNOWLEDGE_GRAPH_GENERATION_PROMPT.format(
            subject=subject,
            goals=", ".join(goals) if goals else "General learning",
            knowledge_base=json.dumps(knowledge_base) if knowledge_base else "None specified",
            cognitive_style=cognitive_style,
            learning_pace=f"{learning_pace:.1f}"
        )
        
        messages = [
            {"role": "system", "content": "You are an expert curriculum designer. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response = await self.llm.generate(
                messages=messages,
                temperature=0.7,
                max_tokens=4000
            )
            
            # Extract content from response
            raw_content = self._extract_content(response)
            if not raw_content:
                return GeneratedGraph(
                    subject=subject,
                    subject_normalized=normalize_subject(subject),
                    difficulty_level="intermediate",
                    estimated_weeks=8,
                    nodes=[],
                    tags=[],
                    is_valid=False,
                    validation_errors=["Failed to get response from LLM"],
                    raw_response=str(response)
                )
            
            logger.info(f"Generated graph response: {raw_content[:500]}...")
            
            # Parse JSON
            data = _parse_json_response(raw_content)
            
            # Convert to nodes
            nodes = []
            for node_data in data.get("nodes", []):
                nodes.append(KnowledgeNode(
                    node_id=node_data.get("node_id", ""),
                    title=node_data.get("title", ""),
                    description=node_data.get("description", ""),
                    difficulty=float(node_data.get("difficulty", 0.5)),
                    estimated_minutes=int(node_data.get("estimated_minutes", 30)),
                    prerequisites=node_data.get("prerequisites", []),
                    soft_prerequisites=node_data.get("soft_prerequisites", []),
                    topic_tags=node_data.get("topic_tags", []),
                    content_types=node_data.get("content_types", ["text", "video"])
                ))
            
            # Validate structure
            validation_errors = _validate_structure([n.to_dict() for n in nodes])
            
            return GeneratedGraph(
                subject=subject,
                subject_normalized=normalize_subject(subject),
                difficulty_level=data.get("difficulty_level", "intermediate"),
                estimated_weeks=int(data.get("estimated_weeks", 8)),
                nodes=nodes,
                tags=data.get("tags", []),
                is_valid=len(validation_errors) == 0,
                validation_errors=validation_errors,
                raw_response=raw_content
            )
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse graph JSON: {e}")
            return GeneratedGraph(
                subject=subject,
                subject_normalized=normalize_subject(subject),
                difficulty_level="intermediate",
                estimated_weeks=8,
                nodes=[],
                tags=[],
                is_valid=False,
                validation_errors=[f"Invalid JSON response: {str(e)}"],
                raw_response=raw_content if 'raw_content' in locals() else ""
            )
        except Exception as e:
            logger.error(f"Graph generation failed: {e}")
            return GeneratedGraph(
                subject=subject,
                subject_normalized=normalize_subject(subject),
                difficulty_level="intermediate",
                estimated_weeks=8,
                nodes=[],
                tags=[],
                is_valid=False,
                validation_errors=[f"Generation failed: {str(e)}"]
            )
    
    def _extract_content(self, response: Any) -> Optional[str]:
        """Extract content from LLM response."""
        if isinstance(response, str):
            return response
        if isinstance(response, dict):
            # OpenAI format
            choices = response.get("choices", [])
            if choices:
                message = choices[0].get("message", {})
                return message.get("content", "")
            # Direct content
            if "content" in response:
                return response["content"]
        return None


# ============================================================================
# Knowledge Graph Validator
# ============================================================================

class KnowledgeGraphValidator:
    """Validates knowledge graphs using LLM and structural checks."""
    
    def __init__(self, llm=None):
        self.llm = llm or llm_client
    
    async def validate(
        self,
        graph: GeneratedGraph,
        use_llm: bool = True
    ) -> ValidationResult:
        """
        Validate a generated knowledge graph.
        
        Args:
            graph: The graph to validate
            use_llm: Whether to use LLM for semantic validation
        
        Returns:
            ValidationResult with issues and suggestions
        """
        issues = []
        suggestions = []
        
        # 1. Structural validation (always run)
        structural_errors = _validate_structure([n.to_dict() for n in graph.nodes])
        for error in structural_errors:
            issues.append({
                "type": "structural",
                "severity": "high",
                "description": error,
                "affected_nodes": []
            })
        
        # 2. LLM semantic validation (optional)
        if use_llm and graph.nodes:
            llm_result = await self._llm_validate(graph)
            issues.extend(llm_result.get("issues", []))
            suggestions.extend(llm_result.get("suggestions", []))
            missing_topics = llm_result.get("missing_topics", [])
            overall_quality = llm_result.get("overall_quality", "acceptable")
            confidence = llm_result.get("confidence", 0.7)
        else:
            missing_topics = []
            overall_quality = "acceptable" if not structural_errors else "poor"
            confidence = 0.8 if not structural_errors else 0.3
        
        # Determine validity
        high_severity_issues = [i for i in issues if i.get("severity") == "high"]
        is_valid = len(high_severity_issues) == 0
        
        return ValidationResult(
            is_valid=is_valid,
            confidence=confidence,
            issues=issues,
            suggestions=suggestions,
            missing_topics=missing_topics,
            overall_quality=overall_quality
        )
    
    async def _llm_validate(self, graph: GeneratedGraph) -> Dict[str, Any]:
        """Use LLM to validate semantic correctness."""
        graph_json = json.dumps({
            "subject": graph.subject,
            "nodes": [n.to_dict() for n in graph.nodes],
            "tags": graph.tags
        }, indent=2)
        
        prompt = GRAPH_VALIDATION_PROMPT.format(
            subject=graph.subject,
            graph_json=graph_json[:3000]  # Truncate if too long
        )
        
        messages = [
            {"role": "system", "content": "You are a curriculum quality reviewer. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response = await self.llm.generate(
                messages=messages,
                temperature=0.3,
                max_tokens=1500
            )
            
            content = self._extract_content(response)
            if not content:
                return {"issues": [], "suggestions": [], "missing_topics": [], "overall_quality": "acceptable", "confidence": 0.5}
            
            data = _parse_json_response(content)
            return data
            
        except Exception as e:
            logger.error(f"LLM validation failed: {e}")
            return {"issues": [], "suggestions": [], "missing_topics": [], "overall_quality": "acceptable", "confidence": 0.5}
    
    def _extract_content(self, response: Any) -> Optional[str]:
        """Extract content from LLM response."""
        if isinstance(response, str):
            return response
        if isinstance(response, dict):
            choices = response.get("choices", [])
            if choices:
                message = choices[0].get("message", {})
                return message.get("content", "")
            if "content" in response:
                return response["content"]
        return None


# ============================================================================
# Singleton Instances
# ============================================================================

graph_generator = KnowledgeGraphGenerator()
graph_validator = KnowledgeGraphValidator()
