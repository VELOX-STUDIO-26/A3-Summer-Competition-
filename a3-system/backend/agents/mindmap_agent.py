"""
Mind Map Agent for generating concept hierarchy visualizations.

Generates structured concept maps that show relationships between
ideas, helping visual learners understand topic structure.
"""

import json
from typing import Any, Dict, List

from agents.base_agent import BaseAgent
from core.faithfulness_checker import faithfulness_checker
from core.llm_client import llm_client
from core.logging import get_logger
from rag.vector_store import get_vector_store

logger = get_logger(__name__)

MINDMAP_SYSTEM_PROMPT = """You are an expert at creating concept maps and knowledge structures for adaptive learning.

Your task is to generate a CONSISTENT, well-structured hierarchical mind map with pedagogical depth.

CRITICAL REQUIREMENTS:
- EXACTLY 1 root node (level 0)
- EXACTLY 5 main branch nodes (level 1)
- EXACTLY 3 leaf nodes per branch (level 2) = 15 leaf nodes total
- Total: 21 nodes (1 root + 5 branches + 15 leaves)

Output Format:
Return ONLY a valid JSON object with this structure:
{
    "nodes": [
        {"id": "root", "label": "Main Topic", "level": 0, "description": "Brief 1-sentence summary of this concept", "importance": "core"},
        {"id": "n1", "label": "Branch 1", "level": 1, "description": "What this branch covers", "importance": "core"},
        {"id": "n1a", "label": "Leaf 1a", "level": 2, "description": "Brief explanation of this sub-concept", "importance": "supplementary", "difficulty": "beginner"},
        {"id": "n1b", "label": "Leaf 1b", "level": 2, "description": "Brief explanation of this sub-concept", "importance": "core", "difficulty": "intermediate"},
        {"id": "n1c", "label": "Leaf 1c", "level": 2, "description": "Brief explanation of this sub-concept", "importance": "core", "difficulty": "advanced"},
        ...
    ],
    "edges": [
        {"from": "root", "to": "n1", "label": "contains", "relationship_note": "The main topic encompasses these sub-areas"},
        {"from": "n1", "to": "n1a", "label": "includes", "relationship_note": "This is a specific instance or component"},
        ...
    ],
    "layout": "hierarchical",
    "description": "Brief description of the mind map structure (1-2 sentences)",
    "difficulty_distribution": {"beginner": 5, "intermediate": 7, "advanced": 3}
}

MANDATORY FIELDS FOR EVERY NODE:
- description: 1-sentence summary explaining what this concept is/does (max 20 words)
- importance: "core" (must-know) or "supplementary" (nice-to-know)

MANDATORY FIELDS FOR LEAF NODES (level 2):
- difficulty: "beginner", "intermediate", or "advanced"

MANDATORY FIELDS FOR CROSS-LINK EDGES:
- relationship_note: Brief explanation of how these concepts relate (10-15 words)

MANDATORY RULES (MUST FOLLOW):
1. EXACTLY 21 nodes total: 1 root + 5 branches + 15 leaves
2. Each branch MUST have EXACTLY 3 leaf nodes
3. Node labels MUST be 2-4 words
4. Edge labels MUST be one of: contains, includes, requires, leads_to, enables, supports
5. Include 2-3 cross-links between related branches with relationship_note
6. Use sequential IDs: root, n1, n1a, n1b, n1c, n2, n2a, n2b, n2c, etc.
7. Use double quotes for ALL strings, valid JSON only
8. Importance distribution: roughly 60% core, 40% supplementary
9. Difficulty distribution: roughly 5 beginner + 7 intermediate + 3 advanced across all leaf nodes

FAILURE TO GENERATE EXACTLY 21 NODES WITH ALL MANDATORY FIELDS IS UNACCEPTABLE."""


class MindMapAgent(BaseAgent):
    """Generates concept hierarchy mind maps."""

    def __init__(self, llm=None):
        super().__init__("MindMap", llm)
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

    async def run(
        self,
        topic: str,
        profile: Dict[str, Any],
        node_id: str = "",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate a mind map for a topic.

        Args:
            topic: Topic to visualize
            profile: Student profile dict
            node_id: Optional node ID for RAG retrieval
            **kwargs: depth, style

        Returns:
            Dict with 'nodes', 'edges', 'metadata'
        """
        cognitive_style = profile.get("cognitive_style", "mixed")
        depth = kwargs.get("depth", 3)

        # Retrieve RAG chunks for grounding
        rag_chunks = await self._retrieve_chunks(topic, node_id)
        rag_context = self._format_rag_context(rag_chunks)

        # Adjust style based on cognitive style
        if "visual" in cognitive_style:
            style = "detailed_visual"
        else:
            style = "structured_text"

        system_prompt = self._build_system_prompt(MINDMAP_SYSTEM_PROMPT, profile)

        user_prompt = f"""Generate a mind map for: **{topic}**

Requirements:
- Depth: {depth} levels
- Style: {style}
- Include practical connections and dependencies
- Focus on concepts most relevant for learning

MANDATORY FIELDS FOR EVERY NODE:
- description: 1-sentence summary explaining what this concept is/does (max 20 words)
- importance: "core" (must-know) or "supplementary" (nice-to-know)

MANDATORY FIELDS FOR LEAF NODES (level 2):
- difficulty: "beginner", "intermediate", or "advanced"

MANDATORY FIELDS FOR CROSS-LINK EDGES:
- relationship_note: Brief explanation of how these concepts relate (10-15 words)

Importance distribution: roughly 60% core, 40% supplementary across all nodes.
Difficulty distribution for leaf nodes: roughly 5 beginner + 7 intermediate + 3 advanced.

Content context:
{rag_context if rag_context else 'Generate from general knowledge of the topic.'}

Return ONLY valid JSON with nodes, edges, and all mandatory fields."""

        try:
            response = await self.llm.generate(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.6,
                max_tokens=2500
            )

            content = response["choices"][0]["message"].get("content") or ""
            if not content:
                raise ValueError("LLM returned empty content for mind map")

            # Parse JSON
            try:
                mindmap_data = json.loads(content)
            except json.JSONDecodeError:
                import re
                # Extract JSON from markdown code blocks or raw text
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    try:
                        mindmap_data = json.loads(json_match.group())
                    except json.JSONDecodeError as e2:
                        logger.warning(f"Regex JSON parse failed: {e2}")
                        raise ValueError("Could not parse mind map JSON")
                else:
                    raise ValueError("Could not parse mind map JSON")

            nodes = mindmap_data.get("nodes", [])
            edges = mindmap_data.get("edges", [])

            # Run faithfulness check
            mindmap_text = json.dumps(mindmap_data, indent=2)
            faithfulness_result = await faithfulness_checker.check_faithfulness(
                generated_text=mindmap_text,
                source_chunks=[{"id": c["chunk_id"], "text": c["text"], "source": c["source"]} for c in rag_chunks],
                context=topic,
            )

            # Ensure knowledge_base is a dict
            knowledge_base = profile.get("knowledge_base", {})
            if not isinstance(knowledge_base, dict):
                knowledge_base = {}
            weak_points = profile.get("weak_points", [])

            # Annotate nodes with mastery status for frontend color-coding
            for node in nodes:
                node_id = node.get("id", "")
                node_label = node.get("label", "").lower()
                # Check if this node topic is in student's knowledge base
                mastery = 0.0
                for kb_topic, kb_mastery in knowledge_base.items():
                    if kb_topic.lower() in node_label or node_label in kb_topic.lower():
                        mastery = kb_mastery
                        break
                node["mastery"] = mastery
                node["is_weak_point"] = any(wp.lower() in node_label or node_label in wp.lower() for wp in weak_points)

            return {
                "nodes": nodes,
                "edges": edges,
                "format": "mindmap",
                "metadata": {
                    "topic": topic,
                    "agent": "mindmap",
                    "num_nodes": len(nodes),
                    "num_edges": len(edges),
                    "depth": depth,
                    "style": style,
                    "description": mindmap_data.get("description", ""),
                    "difficulty_distribution": mindmap_data.get("difficulty_distribution", {}),
                    "has_descriptions": all("description" in n for n in nodes),
                    "has_importance": all("importance" in n for n in nodes),
                    "has_difficulty": all("difficulty" in n for n in nodes if n.get("level") == 2),
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
            logger.error(f"Mind map generation failed for {topic}: {e}")
            # Return a simple fallback structure with new fields
            return {
                "nodes": [
                    {"id": "root", "label": topic, "level": 0, "description": f"Main concept of {topic}", "importance": "core", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n1", "label": "Core Concepts", "level": 1, "description": "Fundamental principles and ideas", "importance": "core", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n1a", "label": "Basic Principles", "level": 2, "description": "Foundational building blocks", "importance": "core", "difficulty": "beginner", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n1b", "label": "Key Components", "level": 2, "description": "Essential parts of the system", "importance": "core", "difficulty": "intermediate", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n1c", "label": "Advanced Features", "level": 2, "description": "Sophisticated capabilities", "importance": "supplementary", "difficulty": "advanced", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n2", "label": "Applications", "level": 1, "description": "Real-world use cases", "importance": "core", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n2a", "label": "Common Uses", "level": 2, "description": "Typical scenarios", "importance": "core", "difficulty": "beginner", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n2b", "label": "Industry Examples", "level": 2, "description": "Sector-specific applications", "importance": "core", "difficulty": "intermediate", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n2c", "label": "Edge Cases", "level": 2, "description": "Unusual situations", "importance": "supplementary", "difficulty": "advanced", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n3", "label": "Best Practices", "level": 1, "description": "Recommended approaches", "importance": "core", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n3a", "label": "Setup Guide", "level": 2, "description": "Initial configuration steps", "importance": "core", "difficulty": "beginner", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n3b", "label": "Optimization", "level": 2, "description": "Performance improvements", "importance": "core", "difficulty": "intermediate", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n3c", "label": "Troubleshooting", "level": 2, "description": "Problem-solving techniques", "importance": "supplementary", "difficulty": "advanced", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n4", "label": "Architecture", "level": 1, "description": "System structure and design", "importance": "core", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n4a", "label": "Core Layer", "level": 2, "description": "Central infrastructure", "importance": "core", "difficulty": "beginner", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n4b", "label": "Interfaces", "level": 2, "description": "Connection points", "importance": "core", "difficulty": "intermediate", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n4c", "label": "Integrations", "level": 2, "description": "External connections", "importance": "supplementary", "difficulty": "intermediate", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n5", "label": "Security", "level": 1, "description": "Protection mechanisms", "importance": "core", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n5a", "label": "Access Control", "level": 2, "description": "Permission management", "importance": "core", "difficulty": "beginner", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n5b", "label": "Data Protection", "level": 2, "description": "Information security", "importance": "core", "difficulty": "intermediate", "mastery": 0.0, "is_weak_point": False},
                    {"id": "n5c", "label": "Compliance", "level": 2, "description": "Regulatory requirements", "importance": "supplementary", "difficulty": "advanced", "mastery": 0.0, "is_weak_point": False},
                ],
                "edges": [
                    {"from": "root", "to": "n1", "label": "includes", "relationship_note": "Core concepts form the foundation"},
                    {"from": "n1", "to": "n1a", "label": "contains", "relationship_note": "Basic principles are foundational"},
                    {"from": "n1", "to": "n1b", "label": "includes", "relationship_note": "Key components are essential"},
                    {"from": "n1", "to": "n1c", "label": "enables", "relationship_note": "Advanced features build on basics"},
                    {"from": "root", "to": "n2", "label": "enables", "relationship_note": "Applications demonstrate practical use"},
                    {"from": "n2", "to": "n2a", "label": "contains", "relationship_note": "Common uses are typical scenarios"},
                    {"from": "n2", "to": "n2b", "label": "includes", "relationship_note": "Industry examples show real usage"},
                    {"from": "n2", "to": "n2c", "label": "supports", "relationship_note": "Edge cases test understanding"},
                    {"from": "root", "to": "n3", "label": "requires", "relationship_note": "Best practices ensure success"},
                    {"from": "n3", "to": "n3a", "label": "contains", "relationship_note": "Setup guide helps beginners"},
                    {"from": "n3", "to": "n3b", "label": "includes", "relationship_note": "Optimization improves performance"},
                    {"from": "n3", "to": "n3c", "label": "enables", "relationship_note": "Troubleshooting solves problems"},
                    {"from": "root", "to": "n4", "label": "contains", "relationship_note": "Architecture defines structure"},
                    {"from": "n4", "to": "n4a", "label": "includes", "relationship_note": "Core layer is central"},
                    {"from": "n4", "to": "n4b", "label": "enables", "relationship_note": "Interfaces connect components"},
                    {"from": "n4", "to": "n4c", "label": "supports", "relationship_note": "Integrations extend functionality"},
                    {"from": "root", "to": "n5", "label": "requires", "relationship_note": "Security protects the system"},
                    {"from": "n5", "to": "n5a", "label": "contains", "relationship_note": "Access control manages permissions"},
                    {"from": "n5", "to": "n5b", "label": "includes", "relationship_note": "Data protection secures information"},
                    {"from": "n5", "to": "n5c", "label": "requires", "relationship_note": "Compliance meets regulations"},
                    {"from": "n1", "to": "n3", "label": "supports", "relationship_note": "Core concepts enable best practices"},
                    {"from": "n4", "to": "n5", "label": "requires", "relationship_note": "Architecture requires security"},
                ],
                "format": "mindmap",
                "metadata": {
                    "topic": topic,
                    "agent": "mindmap",
                    "error": str(e),
                    "is_fallback": True,
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
