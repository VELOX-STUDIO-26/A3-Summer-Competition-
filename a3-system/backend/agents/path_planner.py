"""
Adaptive Path Planning Algorithm for A3 Learning System.

Implements A* search on a knowledge graph with profile-driven cost functions:
    f(n) = g(n) + h(n) + λ₁ × profile_bias + λ₂ × preference_bonus

Where:
    g(n) = cumulative path cost from start to n
    h(n) = heuristic estimate from n to goal (PageRank-based)
    profile_bias = adjusts for student weak points, goals, and pace
    preference_bonus = rewards preferred content types

Hyperparameters (from PROJECT_PLAN.md):
    λ₁ = 0.3 (profile bias weight)
    λ₂ = 0.2 (preference bonus weight)
    δ = 15 (milestone size in nodes)
    σ = 10 (min chunk size for adaptive splitting)
    τ = 8 (min time gap between quizzes in minutes)
    γ = 0.8 (decay factor for recency penalty)
"""

import heapq
import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from core.logging import get_logger

logger = get_logger(__name__)

# Default hyperparameters
LAMBDA_1 = 0.3
LAMBDA_2 = 0.2
DELTA = 15
SIGMA = 10
TAU = 8
GAMMA = 0.8


@dataclass
class GraphNode:
    """In-memory representation of a knowledge graph node."""
    node_id: str
    title: str
    difficulty: float
    est_minutes: int
    hard_prerequisites: List[str] = field(default_factory=list)
    soft_prerequisites: List[str] = field(default_factory=list)
    topic_tags: List[str] = field(default_factory=list)
    content_types: List[str] = field(default_factory=list)
    description: str = ""
    pagerank_score: float = 0.0


@dataclass
class StudentState:
    """Current student state for path planning."""
    student_id: str
    knowledge_base: Dict[str, float] = field(default_factory=dict)
    cognitive_style: str = "mixed"
    weak_points: List[str] = field(default_factory=list)
    goals: List[str] = field(default_factory=list)
    learning_pace: float = 0.5
    content_preferences: List[str] = field(default_factory=list)


class KnowledgeGraph:
    """In-memory knowledge graph with adjacency lists."""

    def __init__(self, graph_path: Optional[str] = None):
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: Dict[str, List[Tuple[str, str]]] = {}  # node_id -> [(target, relation_type)]
        self.reverse_edges: Dict[str, List[str]] = {}  # node_id -> [source_ids]
        self._load(graph_path)

    def _load(self, graph_path: Optional[str]):
        """Load graph from JSON file."""
        if graph_path is None:
            graph_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "data", "knowledge_graph_en.json"
            )

        path = Path(graph_path)
        if not path.exists():
            logger.warning(f"Knowledge graph not found at {path}")
            return

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for node_data in data.get("nodes", []):
            node = GraphNode(
                node_id=node_data["node_id"],
                title=node_data["title"],
                difficulty=node_data["difficulty"],
                est_minutes=node_data["est_minutes"],
                hard_prerequisites=node_data.get("hard_prerequisites", []),
                soft_prerequisites=node_data.get("soft_prerequisites", []),
                topic_tags=node_data.get("topic_tags", []),
                content_types=node_data.get("content_types", []),
                description=node_data.get("description", ""),
                pagerank_score=node_data.get("pagerank_score", 0.0)
            )
            self.nodes[node.node_id] = node
            self.edges[node.node_id] = []
            self.reverse_edges[node.node_id] = []

        for edge_data in data.get("edges", []):
            src = edge_data["source"]
            tgt = edge_data["target"]
            rel = edge_data.get("type", "soft")
            if src in self.edges:
                self.edges[src].append((tgt, rel))
            if tgt in self.reverse_edges:
                self.reverse_edges[tgt].append(src)

        logger.info(f"Loaded knowledge graph: {len(self.nodes)} nodes, {len(data.get('edges', []))} edges")

    def get_prerequisites(self, node_id: str, hard_only: bool = False) -> List[str]:
        """Get prerequisite node IDs for a given node."""
        node = self.nodes.get(node_id)
        if not node:
            return []
        prereqs = list(node.hard_prerequisites)
        if not hard_only:
            prereqs.extend(node.soft_prerequisites)
        return prereqs

    def get_dependents(self, node_id: str) -> List[str]:
        """Get nodes that depend on this node (i.e. forward edges).

        Bug fix: previously returned ``reverse_edges`` which lists this
        node's *prerequisites*, not its dependents. That caused the A*
        traversal in ``plan_path`` to terminate after a single node,
        since N01's "dependents" came back empty instead of [N02, N05].
        """
        return [target for target, _rel in self.edges.get(node_id, [])]

    def topological_sort(self) -> List[str]:
        """Return nodes in topological order (prerequisites first)."""
        in_degree = {nid: 0 for nid in self.nodes}
        for node in self.nodes.values():
            for prereq in node.hard_prerequisites:
                if prereq in in_degree:
                    in_degree[node.node_id] += 1

        queue = [nid for nid, deg in in_degree.items() if deg == 0]
        result = []

        while queue:
            nid = queue.pop(0)
            result.append(nid)
            for dependent in self.get_dependents(nid):
                in_degree[dependent] -= 1
                if in_degree[dependent] == 0:
                    queue.append(dependent)

        return result


class AdaptivePathPlanner:
    """A* path planner with profile-driven cost function."""

    def __init__(self, graph: KnowledgeGraph):
        self.graph = graph
        self.lambda1 = LAMBDA_1
        self.lambda2 = LAMBDA_2
        self.delta = DELTA

    def _heuristic(self, node_id: str, goal_id: str) -> float:
        """Estimate cost from node to goal using PageRank difference."""
        node = self.graph.nodes.get(node_id)
        goal = self.graph.nodes.get(goal_id)
        if not node or not goal:
            return 0.0

        # Higher PageRank = more fundamental = closer to start
        # Lower PageRank = more advanced = closer to goal
        h = max(0.0, goal.pagerank_score - node.pagerank_score)
        return h

    def _profile_bias(self, node_id: str, student: StudentState) -> float:
        """Calculate profile bias term for a node.

        Returns:
            Positive value = penalize (increase cost)
            Negative value = reward (decrease cost)
        """
        node = self.graph.nodes.get(node_id)
        if not node:
            return 0.0

        bias = 0.0

        # Weak points: penalize nodes that are weak points (make them harder = earlier)
        if node.title in student.weak_points or node.node_id in student.weak_points:
            bias -= 0.3

        # Goals: reward nodes that match goals
        for goal in student.goals:
            if goal in node.title or goal in node.topic_tags or goal == node.node_id:
                bias -= 0.2

        # Knowledge base: already mastered nodes should not appear
        mastery = student.knowledge_base.get(node.node_id, 0.0)
        if mastery >= 0.8:
            bias += 10.0  # Very high cost to exclude mastered nodes

        # Learning pace: fast learners get slightly harder paths
        if student.learning_pace > 0.7 and node.difficulty < 0.3:
            bias += 0.1  # Slightly penalize very easy nodes for fast learners

        return bias

    def _preference_bonus(self, node_id: str, student: StudentState) -> float:
        """Calculate preference bonus for matching content types."""
        node = self.graph.nodes.get(node_id)
        if not node or not student.content_preferences:
            return 0.0

        matching = sum(1 for pref in student.content_preferences if pref in node.content_types)
        total_prefs = len(student.content_preferences)
        if total_prefs == 0:
            return 0.0

        match_ratio = matching / total_prefs
        return -0.2 * match_ratio  # Negative = reward (decreases cost)

    def _edge_cost(self, from_id: str, to_id: str, student: StudentState) -> float:
        """Calculate cost of traversing from from_id to to_id."""
        to_node = self.graph.nodes.get(to_id)
        if not to_node:
            return 1.0

        # Base cost: difficulty-adjusted time
        pace_factor = max(0.3, 1.0 - student.learning_pace * 0.5)
        base_cost = to_node.difficulty * to_node.est_minutes * pace_factor / 10.0

        # Profile bias
        profile_bias = self._profile_bias(to_id, student)

        # Preference bonus
        pref_bonus = self._preference_bonus(to_id, student)

        return base_cost + self.lambda1 * profile_bias + self.lambda2 * pref_bonus

    def plan_path(
        self,
        student: StudentState,
        start_nodes: Optional[List[str]] = None,
        goal_node: Optional[str] = None
    ) -> Tuple[List[str], Dict]:
        """Plan an adaptive learning path using A*-guided topological sort.

        Generates a complete learning path covering all non-mastered nodes
        in a valid prerequisite order, with node ordering optimized by the
        profile-driven cost function.

        Args:
            student: Student state for personalization
            start_nodes: Already mastered nodes (default: none)
            goal_node: Target node (unused in full-path mode, kept for API compat)

        Returns:
            Tuple of (path_node_ids, metrics_dict)
        """
        if not self.graph.nodes:
            logger.error("Knowledge graph is empty")
            return [], {}

        if start_nodes is None:
            start_nodes = []

        mastered = set(start_nodes)
        mastered.update(
            nid for nid, score in student.knowledge_base.items() if score >= 0.8
        )

        # Compute in-degree for all nodes (excluding mastered)
        in_degree = {}
        for nid, node in self.graph.nodes.items():
            if nid in mastered:
                continue
            deg = sum(1 for p in node.hard_prerequisites if p not in mastered)
            in_degree[nid] = deg

        # Priority queue for available nodes (in-degree == 0)
        open_set: List[Tuple[float, str]] = []
        g_scores: Dict[str, float] = {nid: 0.0 for nid in in_degree}

        # Determine goal for heuristic: most advanced unmastered node
        available_nodes = list(in_degree.keys())
        if goal_node is None and available_nodes:
            goal_node = min(
                available_nodes,
                key=lambda nid: self.graph.nodes[nid].pagerank_score
            )

        # Initialize queue with all entry points
        for nid, deg in in_degree.items():
            if deg == 0:
                h = self._heuristic(nid, goal_node) if goal_node else 0.0
                bias = self._profile_bias(nid, student)
                pref = self._preference_bonus(nid, student)
                f = h + self.lambda1 * bias + self.lambda2 * pref
                heapq.heappush(open_set, (f, nid))

        if not open_set:
            logger.warning("No valid starting nodes found")
            return [], {}

        path = []
        visited = set()

        while open_set:
            _, current = heapq.heappop(open_set)

            if current in visited or current in mastered:
                continue

            visited.add(current)
            path.append(current)

            current_g = g_scores.get(current, 0.0)

            for dependent in self.graph.get_dependents(current):
                if dependent in mastered or dependent in visited:
                    continue
                if dependent not in in_degree:
                    continue

                in_degree[dependent] -= 1
                edge_cost = self._edge_cost(current, dependent, student)
                g_scores[dependent] = max(g_scores.get(dependent, 0.0), current_g + edge_cost)

                if in_degree[dependent] == 0:
                    h = self._heuristic(dependent, goal_node) if goal_node else 0.0
                    bias = self._profile_bias(dependent, student)
                    pref = self._preference_bonus(dependent, student)
                    f = g_scores[dependent] + h + self.lambda1 * bias + self.lambda2 * pref
                    heapq.heappush(open_set, (f, dependent))

        metrics = self._calculate_metrics(path, student)
        logger.info(f"Planned path with {len(path)} nodes for student {student.student_id}")
        return path, metrics

    def _calculate_metrics(self, path: List[str], student: StudentState) -> Dict:
        """Calculate quality metrics for a learning path."""
        if not path:
            return {}

        # Dependency satisfaction: fraction of nodes with prerequisites satisfied by earlier nodes
        dep_satisfaction = 0.0
        path_set = set(path)
        for i, nid in enumerate(path):
            node = self.graph.nodes.get(nid)
            if not node:
                continue
            prereqs = node.hard_prerequisites
            if not prereqs:
                dep_satisfaction += 1.0
            else:
                satisfied = sum(1 for p in prereqs if p in path_set and path.index(p) < i)
                dep_satisfaction += satisfied / len(prereqs)
        dep_satisfaction /= len(path)

        # Profile match: average match between node content types and student preferences
        profile_match = 0.0
        for nid in path:
            node = self.graph.nodes.get(nid)
            if not node or not student.content_preferences:
                profile_match += 0.5
                continue
            matching = sum(1 for p in student.content_preferences if p in node.content_types)
            profile_match += matching / max(len(student.content_preferences), 1)
        profile_match /= len(path)

        # Difficulty smoothness: variance of difficulty differences between consecutive nodes
        if len(path) > 1:
            diffs = []
            for i in range(1, len(path)):
                d1 = self.graph.nodes[path[i - 1]].difficulty
                d2 = self.graph.nodes[path[i]].difficulty
                diffs.append(abs(d2 - d1))
            difficulty_smoothness = 1.0 - (sum(diffs) / len(diffs))
        else:
            difficulty_smoothness = 1.0

        # Weak point coverage: fraction of weak points included in path
        if student.weak_points:
            weak_ids = set(w for w in student.weak_points if w in self.graph.nodes)
            weak_titles = set(w for w in student.weak_points if any(
                n.title == w for n in self.graph.nodes.values()
            ))
            covered = sum(1 for nid in path if nid in weak_ids or self.graph.nodes[nid].title in weak_titles)
            weak_point_coverage = covered / len(student.weak_points)
        else:
            weak_point_coverage = 1.0

        # Goal convergence: are all goals in or after the path?
        goal_convergence = True
        for goal in student.goals:
            goal_in_path = any(
                goal == nid or goal == self.graph.nodes[nid].title or goal in self.graph.nodes[nid].topic_tags
                for nid in path
            )
            if not goal_in_path:
                goal_convergence = False
                break

        return {
            "dependency_satisfaction": round(dep_satisfaction, 3),
            "profile_match": round(profile_match, 3),
            "difficulty_smoothness": round(difficulty_smoothness, 3),
            "weak_point_coverage": round(weak_point_coverage, 3),
            "goal_convergence": goal_convergence,
            "path_length": len(path),
            "total_estimated_minutes": sum(self.graph.nodes[nid].est_minutes for nid in path)
        }

    def create_milestones(self, path: List[str]) -> List[Dict]:
        """Split path into milestones of size delta (default 15)."""
        if not path:
            return []

        milestones = []
        for i in range(0, len(path), self.delta):
            chunk = path[i:i + self.delta]
            duration = sum(self.graph.nodes[nid].est_minutes for nid in chunk)
            milestones.append({
                "index": len(milestones) + 1,
                "nodes": chunk,
                "duration_minutes": duration
            })

        return milestones


def plan_learning_path(
    student_id: str,
    knowledge_base: Optional[Dict[str, float]] = None,
    weak_points: Optional[List[str]] = None,
    goals: Optional[List[str]] = None,
    learning_pace: float = 0.5,
    content_preferences: Optional[List[str]] = None,
    cognitive_style: str = "mixed",
    start_nodes: Optional[List[str]] = None,
    goal_node: Optional[str] = None
) -> Dict:
    """Convenience function to plan a learning path from raw parameters."""
    graph = KnowledgeGraph()
    planner = AdaptivePathPlanner(graph)

    student = StudentState(
        student_id=student_id,
        knowledge_base=knowledge_base or {},
        cognitive_style=cognitive_style,
        weak_points=weak_points or [],
        goals=goals or [],
        learning_pace=learning_pace,
        content_preferences=content_preferences or []
    )

    path, metrics = planner.plan_path(student, start_nodes, goal_node)
    milestones = planner.create_milestones(path)

    return {
        "path": path,
        "milestones": milestones,
        "total_estimated_time": metrics.get("total_estimated_minutes", 0),
        "metrics": metrics
    }
