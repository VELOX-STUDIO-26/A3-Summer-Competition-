"""
Base Agent class for the A3 Multi-Agent Resource Generation System.

All resource generation agents inherit from this base class.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from core.llm_client import llm_client
from core.logging import get_logger

logger = get_logger(__name__)


class BaseAgent(ABC):
    """Base class for all resource generation agents."""

    def __init__(self, agent_name: str, llm=None):
        self.agent_name = agent_name
        self.llm = llm or llm_client
        logger.info(f"Initialized {agent_name} agent")

    @abstractmethod
    async def run(
        self,
        topic: str,
        profile: Dict[str, Any],
        node_id: str = "",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Execute the agent to generate resources.

        Args:
            topic: The knowledge node topic to generate resources for
            profile: Student profile dict with cognitive_style, knowledge_base, etc.
            node_id: Optional node ID for RAG retrieval
            **kwargs: Agent-specific parameters

        Returns:
            Dict containing generated resources and metadata
        """
        pass

    def _build_system_prompt(self, base_prompt: str, profile: Dict[str, Any]) -> str:
        """Build a personalized system prompt based on student profile."""
        cognitive_style = profile.get("cognitive_style", "mixed")
        knowledge_base = profile.get("knowledge_base", {})
        weak_points = profile.get("weak_points", [])
        learning_pace = profile.get("learning_pace", 0.5)
        content_preferences = profile.get("content_preferences", [])

        # Determine complexity level based on learning pace
        if learning_pace < 0.4:
            complexity = "beginner-friendly with detailed explanations"
        elif learning_pace < 0.7:
            complexity = "intermediate with balanced detail"
        else:
            complexity = "advanced and concise"

        personalization = f"""
Student Profile:
- Learning Style: {cognitive_style}
- Complexity Level: {complexity}
- Weak Areas: {', '.join(weak_points) if weak_points else 'None identified'}
- Preferred Formats: {', '.join(content_preferences) if content_preferences else 'mixed'}
"""

        return f"{base_prompt}\n\n{personalization}"

    def _get_topic_mastery(self, topic: str, knowledge_base: Dict[str, float]) -> float:
        """Get student's mastery level for a topic."""
        # Handle case where knowledge_base is not a dict
        if not isinstance(knowledge_base, dict):
            return 0.0
        
        topic_lower = topic.lower().replace(" ", "_")
        for key, score in knowledge_base.items():
            if topic_lower in key.lower() or key.lower() in topic_lower:
                return score
        return 0.0
