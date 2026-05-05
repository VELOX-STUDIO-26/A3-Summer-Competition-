A3 System: Adaptive Learning Path Planning
In-Depth Design & Implementation Guide

15th China Software Cup — Track A3 Technical Document
LLM-Based Personalized Resource Generation and Learning Multi-Agent System


Table of Contents

1. Overview
   1.1 Core Problems in Adaptive Learning Path Planning
   1.2 Fundamental Differences from Traditional Recommendation Systems
2. Knowledge Graph Modeling
   2.1 Principles for Atomic Knowledge Node Decomposition
   2.2 Formal Definition of Dependency Relations
   2.3 Difficulty and Estimated Time Annotation
3. A* Path Planning Algorithm Design
   3.1 Formal Modeling of the Graph Search Space
   3.2 Cost Function g(n) Design
   3.3 Heuristic Function h(n) Design
   3.4 Personalized Weight Fusion Formula
4. Dynamic Adaptation & Real-Time Replanning
   4.1 Event Types Triggering Replanning
   4.2 Incremental vs. Global Replanning
   4.3 Learning State Transition Model
5. Milestone Generation Algorithm
   5.1 Milestone Splitting Strategy
   5.2 Pacing Control Model
6. System Implementation Steps
   6.1 Data Layer Preparation
   6.2 Algorithm Layer Implementation
   6.3 Service Layer Encapsulation
7. Core Code Implementation
   7.1 Knowledge Graph Class
   7.2 A* Planner
   7.3 Dynamic Adaptation Engine
   7.4 FastAPI Endpoints
8. Evaluation & Validation Methods
   8.1 Simulated Student Experiments
   8.2 Path Quality Metrics
9. Summary & Best Practices


1. Overview
1.1 Core Problems in Adaptive Learning Path Planning
Adaptive Learning Path Planning (ALPP) is the core scheduling engine of the A3 system. Its essence is a sequential decision-making problem in knowledge space. Given a student profile P, a course knowledge graph G, and a resource pool R, the system needs to generate an ordered knowledge-node sequence S = [n₁, n₂, ..., nₖ] such that:
(1) The sequence satisfies all prerequisite dependency constraints: for any nᵢ ∈ S, all its prerequisite nodes must appear before nᵢ;
(2) The total estimated learning time of the sequence is minimized, or the student's completion probability is maximized;
(3) The sequence can be dynamically adjusted based on real-time feedback during the learning process.
This is fundamentally different from traditional course recommendation systems: recommendation systems typically only consider "what the student might like," whereas ALPP must simultaneously consider "what the student must learn first," "what the student is capable of learning," and "how long the student needs to learn it."
1.2 Fundamental Differences from Traditional Recommendation Systems
Traditional collaborative filtering or content-based recommendation algorithms rely on a "user-item" interaction matrix, assuming no dependency relationships between items. However, in educational scenarios, knowledge points have strict prerequisite relationships. This structured constraint transforms the recommendation problem into a constrained optimization problem on a graph.
Furthermore, educational recommendations have "irreversibility": if a student fails at node n, the system cannot simply recommend another "similar" node; it must backtrack to the prerequisites of n for remediation. This backtracking mechanism requires the algorithm to have a global perspective rather than a local greedy approach.
2. Knowledge Graph Modeling
2.1 Principles for Atomic Knowledge Node Decomposition
The granularity of the knowledge graph directly determines the fineness of path planning. If the granularity is too coarse (e.g., "Kubernetes Basics" as a single node), it becomes impossible to pinpoint specific weak points; if too fine (e.g., "kubectl get command" as a standalone node), the graph becomes excessively large, reducing planning efficiency.
Recommended decomposition principles:
• Independence Principle: Each node corresponds to an independently assessable Learning Objective. A student should be able to verify mastery through a 5-15 minute quiz.
• Closure Principle: The input and output of a node are clearly defined, with no reliance on unmodeled implicit external knowledge.
• Cognitive Load Principle: The estimated learning time for a single node is controlled within 20-60 minutes, aligning with adult attention span patterns.
2.2 Formal Definition of Dependency Relations
The knowledge graph G = (N, E) is a Directed Acyclic Graph (DAG), where:
• N = {n₁, n₂, ..., nₘ} is the set of atomic knowledge nodes;
• E ⊆ N × N is the set of dependency edges, where (nᵢ, nⱼ) ∈ E indicates that nᵢ must be mastered before learning nⱼ.
• Each node nᵢ carries an attribute vector attr(nᵢ) = [difficulty, est_time, category, content_types].
Dependency relations are classified into two categories:
• Hard Prerequisite: Must be fully mastered; otherwise, subsequent content cannot be understood. E.g., "Pod Concepts" is a hard prerequisite for "Deployment."
• Soft Prerequisite: Helpful for understanding but not mandatory. The system may skip or simplify it based on the student profile. E.g., "Helm" is a soft prerequisite for "Ingress."
# Knowledge Graph Node Schema (JSON Example)
{
  "node_id": "N11",
  "title": "Deployment and ReplicaSet",
  "difficulty": 0.6,          # Normalized difficulty 0-1
  "est_minutes": 45,
  "hard_prerequisites": ["N10", "N06"],
  "soft_prerequisites": ["N09"],
  "topic_tags": ["orchestration", "high-availability", "controller"],
  "learning_objectives": [
    "Understand how ReplicaSet maintains Pod replica counts",
    "Master the declarative update mechanism of Deployment"
  ],
  "rag_chunk_ids": ["N11-001", "N11-002"]
}
2.3 Difficulty and Estimated Time Annotation
Node difficulty is not a static constant but a dynamic estimate based on multi-source data:
• Baseline difficulty d₀: Initially annotated by course experts based on content complexity (0-1 scale).
• Population difficulty d_pop: Calculated from historical student average completion time and quiz pass rates at this node.
• Personalized difficulty d_personal = d₀ × (1 + α × weak_indicator − β × prior_mastery), where α and β are tuning coefficients.
Estimated time est_time = base_time × difficulty_factor × pace_factor, where pace_factor comes from the learning pace dimension in the student profile.
3. A* Path Planning Algorithm Design
3.1 Formal Modeling of the Graph Search Space
ALPP is modeled as a graph search problem:
• State Space: Each state s represents "the set of knowledge nodes already mastered by the student" plus "the currently learning node."
• Initial State s₀: Empty set (or the set of nodes already mastered from the entrance assessment).
• Goal State s_goal: Contains the course target node (e.g., N20) and all hard prerequisites are satisfied.
• Action Space A(s): At current state s, the set of nodes whose prerequisites are satisfied and have not yet been learned.
• Path: A node sequence from s₀ to s_goal, i.e., the learning path.
3.2 Cost Function g(n) Design
g(n) represents the actual cumulative cost from the initial state to the current node n. In educational scenarios, cost is not simply distance but "comprehensive learning cost":
g(n) = Σᵢ [ w_time × tᵢ + w_effort × eᵢ + w_frustration × fᵢ ]
Where:
• tᵢ: Estimated learning time for node i (minutes)
• eᵢ: Cognitive load estimate for node i (based on content type: video < interactive < code < mathematical proof)
• fᵢ: Frustration penalty term. If node i belongs to the student's weak_points, additional cost is added to encourage the system to prioritize remedial content or auxiliary resources
• w_time, w_effort, w_frustration: Weight coefficients, default 0.5, 0.3, 0.2. Adjustable based on learning goals (e.g., "crash course mode" increases w_time weight)
3.3 Heuristic Function h(n) Design
h(n) is the estimated cost from node n to the goal state. Since the educational knowledge graph is a DAG and the goal is typically to master a specific terminal node, h(n) can be designed as an estimate of the "remaining critical path length":
h(n) = max_{path ∈ remaining_paths} Σ_{j ∈ path} est_time(j) × difficulty_factor(j)
Where remaining_paths are all paths from n to the target node. To simplify computation, the actual implementation uses "longest path" as an optimistic estimate or "average path" as a neutral estimate.
To ensure the admissibility of the A* algorithm, h(n) must not exceed the actual cost. Therefore, we multiply the estimate by a conservative coefficient γ = 0.8: h_admissible(n) = 0.8 × h(n).
3.4 Personalized Weight Fusion Formula
The core innovation of the A3 system lies in its "Profile-first" design, where the student profile directly participates in cost calculation. Define the personalized evaluation function f_personalized(n):
f_personalized(n) = g(n) + h(n) + λ₁ × profile_bias(n) + λ₂ × preference_bonus(n)

Where profile_bias(n) adjusts node priority based on the student profile:
• If n belongs to weak_points: profile_bias(n) = −δ (negative cost, prioritize learning)
• If n is already highly mastered (mastery > 0.85): profile_bias(n) = +∞ (skip)
• If n is highly relevant to goals: profile_bias(n) = −σ (goal-oriented acceleration)

preference_bonus(n) adjusts based on cognitive style:
• Visual learners: nodes containing diagram/video receive −τ reward
• Kinesthetic learners: nodes containing interactive/code receive −τ reward
• Auditory learners: nodes containing audio receive −τ reward
λ₁, λ₂, δ, σ, τ are hyperparameters. It is recommended to tune them through simulated student experiments or A/B testing. Initial values suggested: λ₁=0.3, λ₂=0.2, δ=15, σ=10, τ=8 (units: equivalent minutes cost).
4. Dynamic Adaptation & Real-Time Replanning
4.1 Event Types Triggering Replanning
The system does not generate a path once and fix it permanently. Instead, it re-evaluates the path when the following events are triggered:
• E1 Quiz Completion: Student submits a milestone quiz; Feature 5 analyzes results and updates mastery scores.
• E2 Prolonged Stagnation: Student stays at a node for more than 2× est_time; the system determines this as "stuck."
• E3 Goal Change: Student actively modifies learning goals (e.g., from "pass the course" to "CKA certification").
• E4 Resource Feedback: Student explicitly marks a resource as "useless/too hard/too easy."
• E5 Periodic Health Check: A mandatory path health check is triggered after each completed milestone.
4.2 Incremental vs. Global Replanning
Based on the severity of the triggering event, the system selects one of two replanning strategies:
• Incremental Replanning: Only adjusts the order of remaining nodes within the current milestone, or inserts 1-2 remedial nodes. Time complexity O(k), where k is the number of nodes in the current milestone. Suitable for local events such as E2, E4.
• Global Replanning: Re-runs the A* algorithm from the current state to generate a completely new subsequent path. Time complexity O(|N| log |N|). Suitable for severe events such as E1 (large-scale quiz failure), E3 (goal change).

To prevent frequent global replanning from causing student anxiety about "path drifting," the system sets a cooldown period: a maximum of 1 global replan per student within 24 hours; all other events use incremental adjustments.
# Replanning Trigger Decision Logic
def should_replan(event_type, student_state):
    if event_type == 'GOAL_CHANGE':
        return 'global'
    if event_type == 'QUIZ_COMPLETE':
        avg_score = student_state.last_milestone_avg_score
        if avg_score < 0.6:
            return 'global'  # Large-scale failure, backtrack and rebuild
        elif avg_score < 0.85:
            return 'incremental'  # Local reinforcement
    if event_type == 'STUCK_SIGNAL':
        return 'incremental'  # Insert auxiliary resources
    if event_type == 'RESOURCE_FEEDBACK':
        return 'incremental'
    return None
4.3 Learning State Transition Model
The learning process is modeled as a simplified Markov Decision Process (MDP):
• State sₜ: At time t, the set of mastered nodes Mₜ and the current capability vector Cₜ.
• Transition Probability P(sₜ₊₁ | sₜ, aₜ): The probability that the student masters node n after executing learning action aₜ (learning node n).
• This probability is dynamically estimated from the student profile: P(master | n, student) = sigmoid(β₀ + β₁ × prior_mastery − β₂ × difficulty(n)).
• If P < 0.5, the system automatically inserts prerequisite reinforcement nodes before learning n.
5. Milestone Generation Algorithm
5.1 Milestone Splitting Strategy
Directly presenting a long path of 20 nodes to a student can cause cognitive overwhelm. The Milestone mechanism splits the path into several "levels," where each level contains 3-5 nodes and includes a comprehensive quiz.
The splitting strategy is based on the "cognitive load balancing" principle:
• The total estimated time for each milestone is controlled within 90-180 minutes (approximately 2-3 learning sessions).
• Avoid clustering high-difficulty nodes (difficulty > 0.7) into the same milestone.
• Ensure that each milestone ends with an "achievement node" (e.g., comprehensive hands-on practice, visible outcome).
• If the path contains a strong dependency chain (e.g., N10→N11→N12→N13), prioritize keeping it within the same milestone to avoid cross-milestone context switching.
# Milestone Splitting Algorithm (Greedy + Constraint Check)
def split_milestones(path, max_duration=180, max_nodes=5):
    milestones = []
    current = []
    current_duration = 0
    
    for node in path:
        if (current_duration + node.est_minutes > max_duration 
            or len(current) >= max_nodes):
            # Check: if current node is part of previous node's hard dependency chain, try to extend
            if current and node.hard_prerequisites == [current[-1].node_id]:
                if current_duration + node.est_minutes <= max_duration * 1.2:
                    current.append(node)
                    current_duration += node.est_minutes
                    continue
            milestones.append(current)
            current = [node]
            current_duration = node.est_minutes
        else:
            current.append(node)
            current_duration += node.est_minutes
    
    if current:
        milestones.append(current)
    return milestones
5.2 Pacing Control Model
Pacing control ensures that students do not progress too quickly (leading to weak knowledge retention) or too slowly (leading to loss of motivation). The system dynamically adjusts milestone unlocking strategies based on the learning_pace dimension in the student profile:
• Conservative (pace < 0.4): Must complete the current milestone quiz with a score > 80% to unlock the next milestone; allows repeating the same node up to 3 times.
• Standard (0.4 ≤ pace ≤ 0.7): Quiz score > 60% to unlock; allows 2 repetitions.
• Aggressive (pace > 0.7): Quiz score > 50% or completion time < 0.8 × est_time to unlock; allows skipping soft_prerequisite nodes.
• The system also monitors the "consecutive learning days" metric: if a student is active for 3 consecutive days, a "reward node" (extended content with high-interest tags) is automatically unlocked.
6. System Implementation Steps
6.1 Data Layer Preparation
Step 1: Build the Knowledge Graph JSON file
• Use the 20-node template above and populate it with specific content for the cloud computing course.
• Prepare at least 3 RAG text chunks per node (definition, example, code).
• Use the Spark Embedding API to generate 768-dimensional vectors and store them in Weaviate.

Step 2: Initialize the Student Profile table (PostgreSQL)
• Design schema: student_id, knowledge_base(JSONB), cognitive_style, weak_points, goals, learning_pace, content_preferences, version.
• Implement profile update triggers: automatically increment version and record timestamp after any quiz/interaction event is written.
6.2 Algorithm Layer Implementation
Step 3: Implement the Knowledge Graph Loader
• Load nodes and edges from JSON/database and build an in-memory NetworkX DiGraph.
• Implement topological sort validation to ensure the graph is acyclic.
• Precompute "longest path length" for all node pairs as a heuristic lookup table (accelerates A* search).

Step 4: Implement the A* Planner
• Use a priority queue (heapq) to maintain the OPEN set.
• Custom evaluation function f(n) = g(n) + h(n) + profile_bias.
• Implement path caching: cache path results for identical profile + identical goal for 1 hour.

Step 5: Implement the Milestone Splitter
• Based on greedy strategy with dependency chain preservation constraints.
• Output a milestone list, with each milestone accompanied by a quiz node ID list.
6.3 Service Layer Encapsulation
Step 6: FastAPI Service Encapsulation
• POST /api/path/plan: Receives student_id + course_id, returns complete path + milestone list.
• POST /api/path/adapt: Receives event_type + event_data, triggers replanning, returns adjusted path fragment.
• GET /api/path/progress/{student_id}: Returns current milestone, completed nodes, estimated remaining time.
• All endpoint response time targets < 3 seconds (Section 10.1 requirement).
7. Core Code Implementation
7.1 Knowledge Graph Class
from typing import Dict, List, Set, Optional
import networkx as nx
import json

class KnowledgeGraph:
    def __init__(self, nodes_file: str):
        self.graph = nx.DiGraph()
        self.nodes: Dict[str, dict] = {}
        self._load(nodes_file)
        self._precompute_heuristics()
    
    def _load(self, path: str):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        for node in data['nodes']:
            nid = node['node_id']
            self.nodes[nid] = node
            self.graph.add_node(nid, **node)
        for edge in data['edges']:
            self.graph.add_edge(
                edge['from'], edge['to'], 
                type=edge.get('type', 'hard')
            )
    
    def _precompute_heuristics(self):
        """Precompute longest path from each node to terminal as heuristic"""
        self.heuristic_cache = {}
        # Reverse topological DP
        for node_id in nx.topological_sort(self.graph.reverse()):
            successors = list(self.graph.successors(node_id))
            if not successors:
                self.heuristic_cache[node_id] = self.nodes[node_id]['est_minutes']
            else:
                max_path = max(
                    self.heuristic_cache[s] for s in successors
                )
                self.heuristic_cache[node_id] = (
                    self.nodes[node_id]['est_minutes'] + max_path
                )
    
    def get_prerequisites(self, node_id: str, hard_only=True) -> Set[str]:
        deps = set()
        for pred in self.graph.predecessors(node_id):
            edge_type = self.graph.edges[pred, node_id]['type']
            if not hard_only or edge_type == 'hard':
                deps.add(pred)
        return deps
    
    def get_available_nodes(self, mastered: Set[str]) -> Set[str]:
        """Return nodes whose prerequisites are satisfied and not yet learned"""
        available = set()
        for nid, node in self.nodes.items():
            if nid in mastered:
                continue
            prereqs = self.get_prerequisites(nid, hard_only=True)
            if prereqs.issubset(mastered):
                available.add(nid)
        return available
7.2 A* Planner
import heapq
from dataclasses import dataclass, field
from typing import Callable

@dataclass(order=True)
class SearchNode:
    f_score: float
    node_id: str = field(compare=False)
    path: List[str] = field(default_factory=list, compare=False)
    g_score: float = 0.0
    mastered: Set[str] = field(default_factory=set, compare=False)

class AdaptivePathPlanner:
    def __init__(self, kg: KnowledgeGraph, profile: dict):
        self.kg = kg
        self.profile = profile
        self.weights = {
            'w_time': 0.5,
            'w_effort': 0.3,
            'w_frustration': 0.2,
            'lambda1': 0.3,
            'lambda2': 0.2,
            'gamma': 0.8,  # Heuristic conservative coefficient
            'delta': 15.0,
            'sigma': 10.0,
            'tau': 8.0
        }
    
    def _compute_g(self, node_id: str, path: List[str]) -> float:
        """Compute actual cost g(n) to reach current node"""
        total = 0.0
        for nid in path:
            node = self.kg.nodes[nid]
            t = node['est_minutes']
            e = self._effort_score(node)
            f = self._frustration_penalty(nid)
            total += (
                self.weights['w_time'] * t +
                self.weights['w_effort'] * e +
                self.weights['w_frustration'] * f
            )
        return total
    
    def _effort_score(self, node: dict) -> float:
        content_types = node.get('content_types', [])
        effort_map = {'video': 1, 'text': 2, 'interactive': 3, 'code': 4, 'math': 5}
        return max(effort_map.get(ct, 2) for ct in content_types)
    
    def _frustration_penalty(self, node_id: str) -> float:
        weak_points = self.profile.get('weak_points', [])
        return 20.0 if node_id in weak_points else 0.0
    
    def _heuristic(self, node_id: str, goal_id: str) -> float:
        """Heuristic h(n): precomputed longest path × conservative coefficient"""
        if node_id == goal_id:
            return 0
        h_val = self.kg.heuristic_cache.get(node_id, 100)
        return self.weights['gamma'] * h_val
    
    def _profile_bias(self, node_id: str) -> float:
        """Profile bias term"""
        mastery = self.profile.get('knowledge_base', {}).get(node_id, 0)
        if mastery > 0.85:
            return float('inf')  # Skip already mastered nodes
        
        bias = 0.0
        if node_id in self.profile.get('weak_points', []):
            bias -= self.weights['delta']
        if any(g in node_id for g in self.profile.get('goals', [])):
            bias -= self.weights['sigma']
        return bias
    
    def _preference_bonus(self, node_id: str) -> float:
        """Preference bonus term"""
        node = self.kg.nodes[node_id]
        pref_formats = self.profile.get('content_preferences', [])
        node_formats = node.get('content_types', [])
        overlap = set(pref_formats) & set(node_formats)
        return -self.weights['tau'] * len(overlap)
    
    def plan(self, start_nodes: Set[str], goal_id: str, max_nodes: int = 25) -> List[str]:
        """Execute A* search to generate learning path"""
        open_set = []
        initial = SearchNode(
            f_score=0,
            node_id='START',
            path=[],
            g_score=0,
            mastered=set(start_nodes)
        )
        heapq.heappush(open_set, initial)
        visited = set()
        
        while open_set:
            current = heapq.heappop(open_set)
            
            # Check if goal reached
            if goal_id in current.mastered:
                return current.path
            
            state_key = (frozenset(current.mastered), current.node_id)
            if state_key in visited:
                continue
            visited.add(state_key)
            
            # Get available actions
            available = self.kg.get_available_nodes(current.mastered)
            
            for next_id in available:
                if next_id in current.path:
                    continue
                
                new_path = current.path + [next_id]
                new_mastered = current.mastered | {next_id}
                
                g = self._compute_g(next_id, new_path)
                h = self._heuristic(next_id, goal_id)
                bias = self._profile_bias(next_id)
                bonus = self._preference_bonus(next_id)
                
                f = g + h + self.weights['lambda1'] * bias + self.weights['lambda2'] * bonus
                
                if len(new_path) <= max_nodes:
                    heapq.heappush(open_set, SearchNode(
                        f_score=f,
                        node_id=next_id,
                        path=new_path,
                        g_score=g,
                        mastered=new_mastered
                    ))
        
        raise ValueError("No valid path satisfying dependency constraints found")
7.3 Dynamic Adaptation Engine
class DynamicAdaptationEngine:
    def __init__(self, planner: AdaptivePathPlanner, kg: KnowledgeGraph):
        self.planner = planner
        self.kg = kg
        self.global_replan_cooldown = 86400  # 24 hours (seconds)
    
    def handle_event(self, student_id: str, event: dict, 
                     current_path: List[str], current_idx: int) -> dict:
        """Handle learning events and return path adjustment recommendations"""
        event_type = event['type']
        
        # Decide replanning strategy
        strategy = self._decide_strategy(event_type, event)
        
        if strategy == 'global':
            # Replan globally from current position
            mastered = set(current_path[:current_idx])
            goal = current_path[-1]
            new_path = self.planner.plan(mastered, goal)
            return {
                'action': 'global_replan',
                'new_path': new_path,
                'affected_range': (current_idx, len(current_path)),
                'reason': event.get('reason', 'Major learning state change')
            }
        
        elif strategy == 'incremental':
            # Adjust current milestone only
            milestone = self._get_current_milestone(current_path, current_idx)
            if event_type == 'QUIZ_COMPLETE' and event['score'] < 0.6:
                # Insert remediation nodes
                remediation = self._generate_remediation(
                    current_path[current_idx], event['weak_topics']
                )
                return {
                    'action': 'insert_remediation',
                    'insert_at': current_idx,
                    'new_nodes': remediation,
                    'reason': 'Quiz score below 60%, inserting prerequisite reinforcement'
                }
            
            elif event_type == 'STUCK_SIGNAL':
                # Insert scaffolding resources or trigger tutor
                return {
                    'action': 'add_scaffolding',
                    'target_node': current_path[current_idx],
                    'resources': ['simplified_video', 'interactive_diagram'],
                    'trigger_tutor': True
                }
        
        return {'action': 'none'}
    
    def _decide_strategy(self, event_type: str, event: dict) -> str:
        if event_type == 'GOAL_CHANGE':
            return 'global'
        if event_type == 'QUIZ_COMPLETE':
            if event.get('avg_score', 1.0) < 0.6:
                return 'global'
            return 'incremental'
        return 'incremental'
7.4 FastAPI Endpoints
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Set

app = FastAPI(title="A3 Adaptive Path Service")

class PathPlanRequest(BaseModel):
    student_id: str
    course_id: str
    goal_node: str = "N20"
    start_nodes: List[str] = []

class PathPlanResponse(BaseModel):
    path: List[str]
    milestones: List[List[str]]
    total_est_minutes: int
    path_hash: str  # For caching and version control

class AdaptRequest(BaseModel):
    student_id: str
    event_type: str
    event_data: dict
    current_path: List[str]
    current_index: int

@app.post("/api/path/plan", response_model=PathPlanResponse)
async def plan_path(request: PathPlanRequest):
    """Generate personalized learning path"""
    profile = await get_learner_profile(request.student_id)
    kg = await load_knowledge_graph(request.course_id)
    planner = AdaptivePathPlanner(kg, profile)
    
    path = planner.plan(set(request.start_nodes), request.goal_node)
    milestones = split_milestones(path)
    total_time = sum(kg.nodes[n]['est_minutes'] for n in path)
    
    return PathPlanResponse(
        path=path,
        milestones=milestones,
        total_est_minutes=total_time,
        path_hash=hash(tuple(path))
    )

@app.post("/api/path/adapt")
async def adapt_path(request: AdaptRequest):
    """Dynamically adjust path based on learning events"""
    profile = await get_learner_profile(request.student_id)
    kg = await load_knowledge_graph_by_path(request.current_path)
    planner = AdaptivePathPlanner(kg, profile)
    engine = DynamicAdaptationEngine(planner, kg)
    
    result = engine.handle_event(
        request.student_id,
        {'type': request.event_type, **request.event_data},
        request.current_path,
        request.current_index
    )
    return result
8. Evaluation & Validation Methods
8.1 Simulated Student Experiments
To validate the effectiveness of the path planning algorithm, it is recommended to design "simulated student" experiments:
• Construct 5-10 virtual students with different profiles (beginner visual type, experienced kinesthetic type, goal-oriented type, etc.).
• Run path planning for each simulated student, recording generated path structure, milestone distribution, and total estimated time.
• Have human experts (e.g., course instructors) conduct blind evaluations of generated paths, scoring on dimensions: logical rationality, difficulty gradient, and personalization degree.
• Compare personalization metrics between the baseline algorithm (pure topological sort vs. A* + profile).
8.2 Path Quality Metrics
Define quantifiable evaluation metrics:
• Dependency Satisfaction: Whether prerequisite constraints for each node in the path are satisfied. Target: 100%.
• Profile Match: The proportion of nodes in the path that contain the student's preferred content types. Target: > 70%.
• Difficulty Smoothness: Sum of absolute difficulty differences between adjacent nodes; smaller values indicate gentler slopes. Target: < total_nodes × 0.2.
• Weak Point Coverage: Proportion of student weak_points covered in the first 1/3 of the path. Target: > 80%.
• Goal Convergence: The rate at which estimated time to the target node decreases as the path progresses.
# Path Quality Evaluation Script
def evaluate_path_quality(path, kg, profile):
    scores = {}
    
    # 1. Dependency Satisfaction
    dep_violations = 0
    seen = set()
    for nid in path:
        prereqs = kg.get_prerequisites(nid, hard_only=True)
        if not prereqs.issubset(seen):
            dep_violations += 1
        seen.add(nid)
    scores['dependency_satisfaction'] = 1 - dep_violations / len(path)
    
    # 2. Profile Match
    pref_formats = set(profile.get('content_preferences', []))
    matched = sum(
        len(pref_formats & set(kg.nodes[n].get('content_types', []))) > 0
        for n in path
    )
    scores['profile_match'] = matched / len(path)
    
    # 3. Difficulty Smoothness
    diffs = [kg.nodes[path[i]]['difficulty'] for i in range(len(path))]
    smoothness = sum(abs(diffs[i] - diffs[i-1]) for i in range(1, len(diffs)))
    scores['difficulty_smoothness'] = 1 - (smoothness / len(path))
    
    # 4. Weak Point Coverage
    weak = set(profile.get('weak_points', []))
    early_nodes = set(path[:len(path)//3])
    covered = len(weak & early_nodes) / len(weak) if weak else 1.0
    scores['weak_point_coverage'] = covered
    
    return scores
9. Summary & Best Practices
Adaptive learning path planning is the "brain" of the A3 system. Its design quality directly determines the pedagogical effectiveness of the entire platform. Key best practices:
1. Knowledge Graph First: Invest 30% of development time refining node decomposition and dependency relationships. This is the foundation of all algorithms. The quality ceiling of the graph determines the quality ceiling of the paths.
2. Profile-Driven Cost: Do not attempt to design a "universally optimal path" — such a path does not exist. Personalized weights must be iteratively tuned based on real student data.
3. Conservative Heuristics: Better a slightly longer path than underestimating costs and leaving students stuck on content beyond their ability. In educational scenarios, admissibility is more important than optimality.
4. Gradual Adaptation: Global replanning is a "nuclear weapon." Frequent use disrupts students' sense of learning rhythm. Prioritize incremental adjustments; reserve global replanning for major state changes.
5. Explainability: Explain to students "why learn this next" on the interface (e.g., "Because you previously indicated weak network foundations, we will first reinforce Service concepts"). Explainable paths are more likely to gain student trust.