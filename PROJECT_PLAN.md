# A3 Project: Step-by-Step Implementation Plan

**Project:** LLM-Based Personalized Resource Generation and Learning Multi-Agent System
**Competition:** 15th China Software Cup (Track A3)
**Sponsor:** iFlytek Co., Ltd. (Note: Using OpenRouter for free API access during development)

**LLM Backend:** OpenRouter (free tier) + optional iFlytek Spark for production

**TTS/Voice:** Edge-TTS (free, no API key needed) + optional iFlytek TTS

**Duration:** 10 Weeks
**Last Updated:** 2026-04-26

---

## Pre-Project Checklist

Before Week 1 starts, ensure you have:

- [ ] **OpenRouter API key** (register at [openrouter.ai](https://openrouter.ai) — free tier available)
- [ ] Optional: iFlytek Spark LLM API key for production (register at [open.xfyun.cn](https://open.xfyun.cn))
- [ ] Optional: iFlytek TTS SDK credentials for voice features (or use free alternatives)
- [ ] Node.js v18+ installed
- [ ] Python 3.10+ installed
- [ ] Docker Desktop installed and running
- [ ] Git initialized for version control
- [ ] Course knowledge base materials collected (or use the provided cloud computing reference)
- [ ] Team roles assigned (who handles backend, frontend, algorithm, documentation)

**Repository Setup:**
```bash
git init a3-system
cd a3-system
git checkout -b main
```

---

## Cloud Computing Course — Reference Assets

We have an existing reference project **"多源异构资源的云计算课程知识图谱研究"** that provides a complete cloud computing knowledge base. We will reuse these assets instead of building from scratch.

### Reference Pipeline (`多源异构资源的云计算课程知识图谱研究/代码/`)
The reference project already built a full KG pipeline:
1. **Scrapers** (`scrap_baidu.py`, `scrapy_sougou.py`) — crawled Baidu Baike & Sogou Baike
2. **Text Filter** (`filter/filter.py`, `filter/dictionary.py`) — cleaned text with stopwords removal
3. **Triple Extraction** (`triples_extraction_ltp.py`) — extracted SVO triples using LTP
4. **PageRank** (`pagerank.py`) — ranked concept importance
5. **Neo4j Export** (`result_localData_to_neo4j.csv`) — ready-to-import graph data

### 80 Knowledge Nodes (`filter/newwords.txt`)
These terms become our knowledge graph nodes:

| Category | Terms |
|----------|-------|
| **Computing Paradigms** | 云计算, 网格计算, 分布式计算, 并行计算, 并发计算, 雾计算, 边缘计算, 弹性计算, 效用计算 |
| **Service Models** | IaaS, PaaS, SaaS, FaaS, BaaS, CaaS, MaaS, NaaS |
| **Architecture** | SOA, 微服务, NFV, SDN, SAN, 负载均衡 |
| **Virtualization** | Docker, Kubernets(K8s), VMware, 虚拟化, 硬件虚拟化, 虚拟机 |
| **Cloud Providers** | 阿里云, 腾讯云, 华为云, Google云, Azure, 甲骨文云, IBM云 |
| **Platforms** | OpenStack, CloudStack, Libvirt, Xen, Bluemix |
| **Storage** | 云存储, 云数据库, 结构化存储, 分布式文件系统, 云硬盘, 云盘 |
| **Dev/Ops** | DevOps, 云原生, 多租户技术, 容器技术, 隧道技术 |
| **Concepts** | IDC, VPC, API, Web服务, EC2, Hadoop, 大数据平台 |

### Equivalence Mappings (`filter/equal.csv`)
Synonym handling for knowledge fusion:
- `Azure` = `Windows Azure`
- `Docker` = `应用容器引擎`
- `Kubernets` = `K8s`
- `Google云` = `谷歌云`
- `EC2` = `亚马逊弹性计算云`
- `OneDrive` = `skydrive`

### Text Content (`txt/` folder)
Raw text files for each concept — ready for RAG chunking:
- `云计算.txt`, `Docker.txt`, `OpenStack.txt`, `微服务.txt`, `DevOps.txt`, etc.
- Both Baidu (`*.txt`) and Sogou (`*_sougou.txt`) versions for richer coverage

### Extracted Triples (`result_localData_to_neo4j.csv`)
Example relationships:
```
Azure,外文名,Windows Azure
Docker,类别,应用容器引擎
IaaS,中文名,基础设施即服务
OpenStack,开发者,Rackspace
SDN,中文名,软件定义网络
云存储,延生,云计算
网格计算,BaiduTAG,分布式计算
```

### PageRank Rankings (`pagerank.py`)
Concept importance scores already computed. We can use these to:
- Determine **core vs. advanced** topics (high PageRank = foundational)
- Set **difficulty baselines** (lower PageRank = more specialized/advanced)
- Prioritize nodes for the learning path

### How We Leverage This in A3
1. **Reuse the 80 keywords** as knowledge graph nodes (no manual curation needed)
2. **Map extracted triples** to prerequisite relationships (hard/soft)
3. **Use text files** directly as the RAG knowledge base source
4. **Apply PageRank scores** as initial difficulty estimates
5. **Build `knowledge_graph.json`** for the A* planner from this structured data

---

## Documentation, Code Quality & Testing Standards

To ensure the A3 project is maintainable, well-documented, and robust, we will follow these standards throughout the 10-week development cycle:

### 1. Documentation Requirements

**Weekly Progress Documentation:**
- [ ] **Weekly Status Reports** (every Friday): Document what was completed, blockers encountered, and plans for next week
- [ ] **Feature Documentation**: For each completed feature, write a brief technical summary including:
  - What the feature does
  - Key implementation decisions
  - API endpoints (if applicable)
  - Known limitations
- [ ] **Decision Log**: Record major architectural decisions with context and rationale (use ADR format)

**Inline Documentation:**
- All modules must have module-level docstrings explaining purpose
- All public functions must have docstrings (Google or NumPy style)
- Complex algorithms must have inline comments explaining the "why" not just the "what"
- Type hints are required for all function signatures (Python) or interfaces (TypeScript)

**README Files:**
- [ ] Main project README with setup instructions
- [ ] Backend API documentation (auto-generated from FastAPI)
- [ ] Frontend component documentation (Storybook or similar)
- [ ] Deployment guide for Docker Compose setup

### 2. Code Comment Standards

**Python (Backend):**
```python
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class LearningPath:
    """
    Represents a personalized learning path for a student.
    
    Attributes:
        nodes: Ordered list of knowledge node IDs in the path
        milestones: Grouping of nodes into learning milestones
        total_estimated_time: Total time in minutes to complete the path
        generated_at: Timestamp when the path was generated
        version: Path version for tracking updates
    """
    nodes: List[str]
    milestones: List[List[str]]
    total_estimated_time: int
    generated_at: str
    version: int = 1

class AdaptivePathPlanner:
    """
    A* path planning algorithm with profile-driven personalization.
    
    This planner generates learning paths that:
    1. Satisfy all hard prerequisite dependencies
    2. Minimize estimated learning time given student profile
    3. Prioritize weak points and goal-relevant topics
    4. Respect cognitive style preferences
    """
    
    def __init__(self, kg: KnowledgeGraph, profile: Dict):
        """
        Initialize planner with knowledge graph and student profile.
        
        Args:
            kg: Knowledge graph containing nodes and dependencies
            profile: Student profile dict with knowledge_base, 
                    cognitive_style, weak_points, etc.
        """
        self.kg = kg
        self.profile = profile
        self.weights = self._initialize_weights()
    
    def plan(
        self,
        start_nodes: Set[str],
        goal_id: str,
        max_nodes: int = 25
    ) -> List[str]:
        """
        Execute A* search to generate personalized learning path.
        
        The algorithm uses a custom evaluation function that combines:
        - g(n): Actual cost to reach current node (time + effort + frustration)
        - h(n): Heuristic estimate to goal (remaining critical path)
        - profile_bias: Adjustments for weak points, mastery, goals
        - preference_bonus: Rewards for cognitive style alignment
        
        Args:
            start_nodes: Set of node IDs already mastered by student
            goal_id: Target node ID to reach
            max_nodes: Maximum path length (safety limit)
            
        Returns:
            Ordered list of node IDs representing the learning path
            
        Raises:
            ValueError: If no valid path exists satisfying dependencies
        """
        # A* implementation with priority queue
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
            
            # Goal check
            if goal_id in current.mastered:
                return current.path
            
            state_key = (frozenset(current.mastered), current.node_id)
            if state_key in visited:
                continue
            visited.add(state_key)
            
            # Get available next nodes
            available = self.kg.get_available_nodes(current.mastered)
            
            for next_id in available:
                if next_id in current.path:
                    continue
                
                new_path = current.path + [next_id]
                new_mastered = current.mastered | {next_id}
                
                # Calculate costs
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
```

**TypeScript (Frontend):**
```typescript
/**
 * Props for the LearningPath component
 */
interface LearningPathProps {
  /** The learning path data containing nodes and milestones */
  path: LearningPathData;
  
  /** Current student progress */
  progress: StudentProgress;
  
  /** Callback when student clicks a node */
  onNodeClick: (nodeId: string) => void;
  
  /** Optional theme variant */
  variant?: 'default' | 'compact' | 'detailed';
}

/**
 * Component that visualizes a student's learning path
 * 
 * Features:
 * - Visual timeline of learning milestones
 * - Progress indicators for completed/locked nodes
 * - Interactive node details on hover/click
 * - Responsive design for mobile/desktop
 */
export const LearningPath: React.FC<LearningPathProps> = ({
  path,
  progress,
  onNodeClick,
  variant = 'default'
}) => {
  // Implementation
};
```

### 3. Unit Testing Requirements

**Test Coverage Targets:**
- Backend (Python): Minimum 80% code coverage
- Frontend (TypeScript): Minimum 70% code coverage
- Critical paths (A* algorithm, profile extraction): 100% coverage

**Testing Framework:**
- **Python:** pytest with pytest-asyncio for async tests, pytest-cov for coverage
- **TypeScript:** Jest with React Testing Library for components
- **Integration:** Use TestContainers for database/vector DB testing

**Required Test Categories:**

1. **Unit Tests:** Test individual functions/methods in isolation with mocked dependencies
2. **Integration Tests:** Test component interactions (e.g., planner + knowledge graph)
3. **Property-Based Tests:** Use Hypothesis (Python) or fast-check (TS) for generative testing
4. **Snapshot Tests:** For API responses and frontend component rendering

**Example Test Cases:**

```python
# test_path_planner.py
import pytest
from knowledge_graph import KnowledgeGraph
from adaptive_path_planner import AdaptivePathPlanner

@pytest.fixture
def sample_kg():
    """Load test knowledge graph"""
    return KnowledgeGraph("tests/fixtures/test_graph.json")

@pytest.fixture
def beginner_profile():
    """Standard beginner profile for testing"""
    return {
        "student_id": "test_beginner",
        "knowledge_base": {},
        "cognitive_style": "visual",
        "weak_points": ["N03", "N05"],
        "goals": ["learn_cloud"],
        "learning_pace": 0.3,
        "content_preferences": ["diagram", "video"]
    }

class TestPathPlannerBasics:
    """Basic functionality tests"""
    
    def test_plan_returns_valid_path(self, sample_kg, beginner_profile):
        """Planner should return a non-empty list of node IDs"""
        planner = AdaptivePathPlanner(sample_kg, beginner_profile)
        path = planner.plan(start_nodes=set(), goal_id="N20")
        
        assert isinstance(path, list)
        assert len(path) > 0
        assert all(isinstance(n, str) for n in path)
    
    def test_path_satisfies_dependencies(self, sample_kg, beginner_profile):
        """All hard prerequisites must appear before dependent nodes"""
        planner = AdaptivePathPlanner(sample_kg, beginner_profile)
        path = planner.plan(start_nodes=set(), goal_id="N20")
        
        seen = set()
        for node_id in path:
            node = sample_kg.nodes[node_id]
            prereqs = set(node.get("hard_prerequisites", []))
            assert prereqs.issubset(seen), \
                f"Node {node_id} has unmet prerequisites: {prereqs - seen}"
            seen.add(node_id)
    
    def test_path_reaches_goal(self, sample_kg, beginner_profile):
        """Path must include the goal node"""
        planner = AdaptivePathPlanner(sample_kg, beginner_profile)
        goal = "N20"
        path = planner.plan(start_nodes=set(), goal_id=goal)
        
        assert goal in path, f"Goal {goal} not in path: {path}"

class TestProfilePersonalization:
    """Tests that profiles actually affect path generation"""
    
    def test_expert_skips_mastered_nodes(self, sample_kg):
        """Expert profile should skip nodes they already know"""
        expert_profile = {
            "student_id": "test_expert",
            "knowledge_base": {
                "云计算": 0.9,  # N01
                "虚拟化": 0.85,  # N02
                "Docker": 0.8   # N03
            },
            "cognitive_style": "kinesthetic",
            "weak_points": [],
            "goals": ["cka_certification"],
            "learning_pace": 0.8,
            "content_preferences": ["interactive", "code"]
        }
        
        planner = AdaptivePathPlanner(sample_kg, expert_profile)
        path = planner.plan(start_nodes={"N01", "N02", "N03"}, goal_id="N20")
        
        # Should NOT include N01, N02, N03 (already mastered)
        assert "N01" not in path
        assert "N02" not in path
        assert "N03" not in path
    
    def test_weak_points_prioritized(self, sample_kg):
        """Nodes matching weak points should appear early in path"""
        profile_with_weak_points = {
            "student_id": "test_struggling",
            "knowledge_base": {},
            "cognitive_style": "visual",
            "weak_points": ["N05", "N07"],  # Specific weak topics
            "goals": ["learn_cloud"],
            "learning_pace": 0.4,
            "content_preferences": ["diagram"]
        }
        
        planner = AdaptivePathPlanner(sample_kg, profile_with_weak_points)
        path = planner.plan(start_nodes=set(), goal_id="N20")
        
        # Weak points should be in first 1/3 of path
        early_nodes = set(path[:len(path)//3])
        assert "N05" in early_nodes or "N05" not in path, \
            "Weak point N05 should be early in path or not needed"

class TestEdgeCases:
    """Test unusual or boundary conditions"""
    
    def test_empty_start_nodes(self, sample_kg, beginner_profile):
        """Planner should handle empty start set (complete beginner)"""
        planner = AdaptivePathPlanner(sample_kg, beginner_profile)
        path = planner.plan(start_nodes=set(), goal_id="N20")
        
        assert len(path) > 0
        # Should start from entry nodes (no prerequisites)
        first_node = sample_kg.nodes[path[0]]
        assert len(first_node.get("hard_prerequisites", [])) == 0
    
    def test_goal_already_mastered(self, sample_kg):
        """If goal is in start_nodes, should return empty or minimal path"""
        profile = {
            "student_id": "test_already_done",
            "knowledge_base": {"云计算": 0.95},
            "cognitive_style": "visual",
            "weak_points": [],
            "goals": ["already_know"],
            "learning_pace": 0.8,
            "content_preferences": []
        }
        
        planner = AdaptivePathPlanner(sample_kg, profile)
        
        # Goal is already in mastered set
        path = planner.plan(start_nodes={"N20"}, goal_id="N20")
        
        # Should return empty path or just the goal
        assert len(path) == 0 or path == ["N20"]
    
    def test_unreachable_goal(self, sample_kg, beginner_profile):
        """Should raise error if goal is unreachable"""
        planner = AdaptivePathPlanner(sample_kg, beginner_profile)
        
        # Try to reach a node that has unmet prerequisites that can't be satisfied
        # (This depends on your graph structure - adjust node ID)
        with pytest.raises(ValueError) as exc_info:
            planner.plan(start_nodes=set(), goal_id="N99")  # Non-existent or unreachable
        
        assert "No valid path" in str(exc_info.value)

# Performance benchmarks
class TestPerformance:
    """Benchmark path planning performance"""
    
    @pytest.mark.benchmark
    def test_planning_time_under_3_seconds(self, sample_kg, beginner_profile):
        """Path planning should complete in under 3 seconds"""
        import time
        
        planner = AdaptivePathPlanner(sample_kg, beginner_profile)
        
        start = time.time()
        path = planner.plan(start_nodes=set(), goal_id="N20")
        elapsed = time.time() - start
        
        assert elapsed < 3.0, f"Planning took {elapsed:.2f}s, expected < 3s"
    
    @pytest.mark.benchmark
    def test_memory_usage_under_512mb(self, sample_kg, beginner_profile):
        """Memory usage should stay under 512MB"""
        import tracemalloc
        
        tracemalloc.start()
        
        planner = AdaptivePathPlanner(sample_kg, beginner_profile)
        path = planner.plan(start_nodes=set(), goal_id="N20")
        
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        peak_mb = peak / 1024 / 1024
        assert peak_mb < 512, f"Peak memory usage: {peak_mb:.1f}MB, expected < 512MB"
```

**E2E Tests:** Use Playwright or Cypress for user flow testing

```typescript
// e2e/learning-flow.spec.ts
test('student completes full learning flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');
  
  // Complete profiling
  await page.waitForURL('/onboarding');
  await page.click('text=Start');
  await page.fill('[name=background]', 'I have some programming experience');
  await page.click('text=Next');
  // ... more onboarding steps
  
  // Verify path generated
  await page.waitForURL('/dashboard');
  await expect(page.locator('.learning-path')).toBeVisible();
  await expect(page.locator('.milestone')).toHaveCount.greaterThan(0);
  
  // Start learning
  await page.click('.milestone:first-child .start-button');
  await expect(page.locator('.content-viewer')).toBeVisible();
});
```

### 4. Code Review Checklist

Before committing code, ensure:

- [ ] Code follows project style guide (Black for Python, Prettier for TS)
- [ ] All new functions have docstrings
- [ ] Type hints are included
- [ ] No hardcoded secrets (use environment variables)
- [ ] Error handling is robust
- [ ] Unit tests pass (`pytest` / `npm test`)
- [ ] No linting errors (`flake8` / `eslint`)
- [ ] README/documentation updated if needed

### 5. Documentation Templates

**Feature Specification Template:**
```markdown
# Feature: [Feature Name]

## Overview
Brief description of what this feature does and why it exists.

## User Story
As a [type of user], I want [goal] so that [benefit].

## Technical Implementation
- Key components/modules involved
- Architecture decisions
- Database schema changes (if any)
- API endpoints added/modified

## Usage Example
\`\`\`python
# Code example showing how to use this feature
\`\`\`

## Testing
- Unit tests location: `tests/test_feature.py`
- Integration tests: `tests/integration/test_feature.py`
- Test coverage: [X]%

## Known Limitations
- List any known issues or limitations
- Future improvements planned

## Related Documentation
- Link to API docs
- Link to related features
```

**API Endpoint Documentation Template:**
```markdown
## POST /api/path/plan

Generate a personalized learning path for a student.

### Request
\`\`\`json
{
  "student_id": "string",
  "course_id": "string",
  "goal_node": "string (optional, default: course end)",
  "start_nodes": ["string"] (optional, default: empty)
}
\`\`\`

### Response
\`\`\`json
{
  "path": ["N01", "N02", "N03", ...],
  "milestones": [["N01", "N02", "N03"], ["N04", "N05"], ...],
  "total_estimated_time": 450,
  "path_hash": "sha256:abc123...",
  "metrics": {
    "dependency_satisfaction": 1.0,
    "profile_match": 0.75,
    "difficulty_smoothness": 0.18,
    "weak_point_coverage": 0.85
  }
}
\`\`\`

### Error Responses
- `400 Bad Request`: Invalid input parameters
- `404 Not Found`: Student or course not found
- `422 Unprocessable Entity`: No valid path exists (circular dependencies)
- `500 Internal Server Error`: Server error

### Implementation Notes
- Planning timeout: 3 seconds maximum
- Path cache: 1 hour TTL
- Max nodes in path: 25 (configurable)
```

### 6. Git Commit Message Convention

Use conventional commits format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semi colons, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or correcting tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```
feat(path-planner): implement A* algorithm with profile bias

- Add priority queue for OPEN set
- Implement g(n), h(n), profile_bias calculations
- Add dependency satisfaction validation

Closes #42
```

```
fix(api): handle missing student profile gracefully

Return 404 with helpful message instead of 500
when student_id is not found in database.

Fixes #67
```

```
docs(readme): update setup instructions

- Add OpenRouter API key setup
- Update Docker Compose instructions
- Add troubleshooting section
```

### 7. Weekly Status Report Template

Each Friday, create a brief status report in `docs/status/YYYY-MM-DD.md`:

```markdown
# Week X Status Report (YYYY-MM-DD)

## Completed This Week
- [ ] Feature/bugfix 1 (PR #X)
- [ ] Feature/bugfix 2 (PR #Y)
- [ ] Documentation updates

## In Progress
- [ ] Feature 3 (ETA: next week)
- [ ] Refactoring work

## Blockers/Issues
- Issue: [description]
- Impact: [how it affects the project]
- Mitigation: [what we're doing about it]

## Next Week Goals
- [ ] Complete feature 3
- [ ] Start integration testing
- [ ] [Other goals]

## Metrics
- Test coverage: X%
- Open issues: X
- PRs merged this week: X
```

---

Following these standards will ensure the A3 project is well-documented, maintainable, and has high code quality throughout the development process.
**Goal:** Build the backend skeleton, integrate the LLM, set up databases, and index the knowledge base.

### Week 1: Project Scaffolding & LLM Integration

#### Day 1-2: Project Structure & Environment
```
a3-system/
├── backend/
│   ├── api/              # FastAPI application
│   ├── agents/           # Orchestrator + sub-agents
│   ├── nlp/              # Profile extraction pipeline
│   ├── rag/              # RAG engine + knowledge base indexer
│   ├── analytics/        # Feature 5 assessment engine
│   ├── models/           # Pydantic schemas
│   ├── core/             # Config, logging, exceptions
│   └── tests/
├── frontend/
│   ├── web/              # Next.js application
│   └── mobile/           # Uni-app (optional for competition)
├── data/
│   └── knowledge_base/   # Course PDFs and raw text
├── docker-compose.yml
├── requirements.txt
└── docs/
```

- [ ] Initialize backend with FastAPI
- [ ] Set up `requirements.txt` with core dependencies:
  ```
  fastapi==0.109.0
  uvicorn[standard]==0.27.0
  pydantic==2.6.0
  pydantic-settings==2.1.0
  sqlalchemy==2.0.25
  alembic==1.13.1
  psycopg2-binary==2.9.9
  redis==5.0.1
  networkx==3.2.1
  numpy==1.26.3
  python-docx==1.1.0
  PyPDF2==3.0.1
  langchain==0.1.0
  langchain-community==0.0.10
  weaviate-client==3.25.3
  chromadb==0.4.22
  pytest==7.4.4
  httpx==0.26.0
  ```
- [ ] Create `docker-compose.yml` with PostgreSQL, Redis, Weaviate services
- [ ] Set up environment variables (`.env` file):
  ```
  SPARK_APP_ID=your_app_id
  SPARK_API_KEY=your_api_key
  SPARK_API_SECRET=your_api_secret
  DATABASE_URL=postgresql://user:pass@localhost:5432/a3_db
  REDIS_URL=redis://localhost:6379/0
  WEAVIATE_URL=http://localhost:8080
  ```

#### Day 3-4: Database Schema Design
Implement the core database models:

- [ ] **Student Profile Table** (`models/profile.py`):
  ```python
  class StudentProfile(Base):
      __tablename__ = "student_profiles"
      
      student_id = Column(String, primary_key=True)
      knowledge_base = Column(JSONB)        # Map<topic, score>
      cognitive_style = Column(String)       # visual | verbal | kinetic | mixed
      weak_points = Column(JSONB)            # List of topic IDs
      goals = Column(JSONB)                  # List of strings
      learning_pace = Column(Float)          # 0.0 - 1.0
      content_preferences = Column(JSONB)    # List of formats
      version = Column(Integer, default=1)
      created_at = Column(DateTime, default=func.now())
      updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
  ```

- [ ] **Knowledge Graph Nodes Table**:
  ```python
  class KnowledgeNode(Base):
      __tablename__ = "knowledge_nodes"
      
      node_id = Column(String, primary_key=True)
      title = Column(String, nullable=False)
      difficulty = Column(Float)             # 0.0 - 1.0
      est_minutes = Column(Integer)
      hard_prerequisites = Column(JSONB)     # List of node_ids
      soft_prerequisites = Column(JSONB)     # List of node_ids
      topic_tags = Column(JSONB)
      content_types = Column(JSONB)          # video | text | interactive | code
      rag_chunk_ids = Column(JSONB)
      course_id = Column(String, index=True)
  ```

- [ ] **Learning Path Table**:
  ```python
  class LearningPath(Base):
      __tablename__ = "learning_paths"
      
      path_id = Column(String, primary_key=True)
      student_id = Column(String, index=True)
      course_id = Column(String)
      path_sequence = Column(JSONB)          # Ordered list of node_ids
      milestones = Column(JSONB)             # List of milestone groups
      status = Column(String)                # active | completed | abandoned
      created_at = Column(DateTime)
      updated_at = Column(DateTime)
  ```

- [ ] Run Alembic migrations to create tables

#### Day 5-7: LLM Client & Basic Integration
**Using OpenRouter (Free Tier) for development:**

- [ ] Create `core/llm_client.py` — central LLM client service with OpenRouter:
  ```python
  import os
  import httpx
  from typing import AsyncGenerator, List, Dict, Optional
  
  class OpenRouterClient:
      """
      OpenRouter LLM Client - Free tier available
      Supports: meta-llama/llama-3.1-70b, google/gemini-pro, etc.
      """
      def __init__(self, api_key: Optional[str] = None):
          self.api_key = api_key or os.environ.get("OPENROUTER_API_KEY")
          self.base_url = "https://openrouter.ai/api/v1"
          self.headers = {
              "Authorization": f"Bearer {self.api_key}",
              "HTTP-Referer": "https://your-app.com",  # Required by OpenRouter
              "X-Title": "A3 Learning System",
              "Content-Type": "application/json"
          }
      
      async def generate(
          self,
          messages: List[Dict[str, str]],
          model: str = "meta-llama/llama-3.1-70b-instruct",
          temperature: float = 0.7,
          max_tokens: int = 2000,
          stream: bool = False
      ) -> Dict:
          """Generate text with retry logic"""
          payload = {
              "model": model,
              "messages": messages,
              "temperature": temperature,
              "max_tokens": max_tokens,
              "stream": stream
          }
          
          async with httpx.AsyncClient(timeout=60.0) as client:
              response = await client.post(
                  f"{self.base_url}/chat/completions",
                  headers=self.headers,
                  json=payload
              )
              response.raise_for_status()
              return response.json()
      
      async def generate_stream(
          self,
          messages: List[Dict[str, str]],
          model: str = "meta-llama/llama-3.1-70b-instruct",
          temperature: float = 0.7,
          max_tokens: int = 2000
      ) -> AsyncGenerator[str, None]:
          """Stream tokens for SSE"""
          payload = {
              "model": model,
              "messages": messages,
              "temperature": temperature,
              "max_tokens": max_tokens,
              "stream": True
          }
          
          async with httpx.AsyncClient(timeout=60.0) as client:
              async with client.stream(
                  "POST",
                  f"{self.base_url}/chat/completions",
                  headers=self.headers,
                  json=payload
              ) as response:
                  async for line in response.aiter_lines():
                      if line.startswith("data: "):
                          data = line[6:]
                          if data == "[DONE]":
                              break
                          yield data
      
      async def get_embeddings(
          self,
          texts: List[str],
          model: str = "sentence-transformers/all-MiniLM-L6-v2"
      ) -> List[List[float]]:
          """Get embeddings for RAG"""
          async with httpx.AsyncClient(timeout=60.0) as client:
              response = await client.post(
                  f"{self.base_url}/embeddings",
                  headers=self.headers,
                  json={
                      "model": model,
                      "input": texts
                  }
              )
              response.raise_for_status()
              data = response.json()
              return [item["embedding"] for item in data["data"]]
  
  # Production-ready wrapper with fallback
  class LLMClient:
      """
      Unified LLM client with OpenRouter (free) as primary,
      iFlytek Spark (competition requirement) as optional fallback
      """
      def __init__(self):
          self.openrouter = OpenRouterClient()
          self.use_openrouter = True  # Toggle to switch providers
          
      async def generate(self, messages, **kwargs):
          if self.use_openrouter:
              return await self.openrouter.generate(messages, **kwargs)
          else:
              # Fallback to iFlytek Spark
              pass
  ```
- [ ] Create `.env` template with OpenRouter configuration:
  ```bash
  # OpenRouter (Free Tier) - Primary LLM
  OPENROUTER_API_KEY=your_key_here
  OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct
  
  # Optional: iFlytek Spark (for production/competition)
  SPARK_APP_ID=optional
  SPARK_API_KEY=optional
  SPARK_API_SECRET=optional
  ```
- [ ] Implement retry logic with exponential backoff (3 retries)
- [ ] Add response caching with Redis (cache TTL: 1 hour)
- [ ] Write a simple `/health` endpoint that tests LLM connectivity
- [ ] **Deliverable:** Backend server starts, database connects, LLM responds to test prompt

**Note on iFlytek:** The original specification requires iFlytek Spark LLM. However, for development, **OpenRouter provides free access** to high-quality models (Llama 3.1, Gemini, etc.). The LLMClient wrapper allows easy switching — develop with OpenRouter (free), then switch to iFlytek for final competition submission if required.

### Week 2: RAG Pipeline & Knowledge Base

#### Day 1-2: Document Processing Pipeline
- [ ] Create `rag/document_processor.py`:
  - PDF text extraction (PyPDF2 or pdfplumber)
  - Word document extraction (python-docx)
  - Text cleaning and normalization
- [ ] Implement text chunking strategy:
  - Chunk size: 512 tokens max
  - Overlap: 50 tokens between chunks
  - Split on paragraph boundaries when possible
- [ ] Create chunk metadata structure:
  ```python
  class TextChunk:
      chunk_id: str          # Format: "{node_id}-{sequence:03d}"
      text: str              # Raw text content
      source: str            # Filename or URL
      node_id: str           # Which knowledge node this belongs to
      content_type: str      # definition | example | theorem | code | exercise
      difficulty: str        # beginner | intermediate | advanced
  ```

#### Day 3-4: Vector Database Setup
- [ ] Initialize Weaviate schema:
  ```python
  class_schema = {
      "class": "KnowledgeChunk",
      "properties": [
          {"name": "chunk_id", "dataType": ["text"]},
          {"name": "text", "dataType": ["text"]},
          {"name": "source", "dataType": ["text"]},
          {"name": "node_id", "dataType": ["text"]},
          {"name": "content_type", "dataType": ["text"]},
          {"name": "difficulty", "dataType": ["text"]},
          {"name": "embedding", "dataType": ["number[]"], "vectorIndexType": "hnsw"}
      ]
  }
  ```
- [ ] Create indexing pipeline:
  1. Load documents from `data/knowledge_base/`
  2. Chunk documents
  3. Generate embeddings via Spark Embedding API
  4. Store in Weaviate with metadata
- [ ] Create retrieval function:
  ```python
  async def retrieve_chunks(query: str, node_filter: str = None, top_k: int = 5):
      query_embedding = await llm_client.embed(query)
      # Query Weaviate with optional node_id filter
  ```

#### Day 5-7: Knowledge Graph JSON & Loader
**Using Reference Assets:** We will build the knowledge graph from the existing reference project (`多源异构资源的云计算课程知识图谱研究/代码/`).

- [ ] **Build `data/knowledge_graph.json`** from reference data:
  - Use the **80 keywords** from `filter/newwords.txt` as nodes
  - Map **extracted triples** from `result_localData_to_neo4j.csv` to relationships
  - Assign **PageRank scores** from `pagerank.py` as importance/difficulty baselines
  - Manually annotate hard/soft prerequisites based on domain knowledge (e.g., 虚拟化 → Docker → Kubernets)
  - Target: 20-30 core nodes for the course, with the rest as supplementary

- [ ] **Copy reference text files** to `data/knowledge_base/`:
  - Copy all `.txt` files from `txt/` folder
  - Both Baidu and Sogou versions for richer RAG coverage
  - Organize by concept: `data/knowledge_base/{node_id}/{source}.txt`

- [ ] **Implement `rag/knowledge_graph.py`** (from A-algorithm.md):
  - NetworkX DiGraph loader
  - Topological sort validation
  - Heuristic precomputation (longest path via reverse topological DP)
  - `get_available_nodes(mastered)` method

- [ ] **Create seed script** to load graph from JSON into database
- [ ] **Write tests** for graph validation (ensure DAG, no orphan nodes)
- [ ] **Deliverable:** `/api/knowledge-graph/{course_id}` endpoint returns full graph; RAG query returns relevant chunks

**Phase 1 Checkpoint:**
- [ ] Backend starts with `docker-compose up`
- [ ] Database has seeded knowledge graph
- [ ] LLM client responds to prompts
- [ ] RAG retrieval returns relevant chunks for sample queries
- [ ] All code committed to Git

---

## Phase 2: Conversational Learner Profiling (Week 2-3)
**Goal:** Build Feature 1 — the chat-based profiling system that extracts 6 learner dimensions.

### Week 2 (Continued): Profiling Pipeline

#### Day 1-2: Profile Extraction Prompts
- [ ] Design system prompt for profile extraction:
  ```
  You are a learner profiling assistant. Extract the following dimensions from the 
  student's message, returning ONLY a JSON object:
  
  {
    "extractions": [
      {
        "dimension": "knowledge_base|cognitive_style|weak_points|goals|learning_pace|content_preferences",
        "value": "...",
        "confidence": 0.0-1.0,
        "evidence_quote": "..."
      }
    ]
  }
  ```
- [ ] Create `nlp/profile_extractor.py` with extraction logic
- [ ] Implement confidence scoring and evidence tracking

#### Day 3-4: Chat Session Management
- [ ] Create `api/routers/chat.py`:
  ```python
  @router.post("/api/chat/start")
  async def start_profiling_session(student_id: str):
      # Initialize conversation state
      # Return first question from profiling script
  
  @router.post("/api/chat/message")
  async def process_chat_message(student_id: str, message: str):
      # 1. Store message in conversation history
      # 2. Run profile extraction on message
      # 3. Update profile with weighted moving average
      # 4. Generate next question or conclude profiling
  ```
- [ ] Design profiling conversation flow (5-8 questions):
  1. "Tell me about your background in [subject]."
  2. "What do you find most challenging?"
  3. "How do you prefer to learn new concepts?"
  4. "What is your goal for this course?"
  5. "Describe a time you struggled with a technical topic."
  6. "Do you prefer reading, watching videos, or hands-on practice?"
  7. "How much time can you dedicate per week?"
  8. "Any specific topics you want to focus on or avoid?"
- [ ] Implement session state storage in Redis

#### Day 5-7: Profile Storage & Update Logic
- [ ] Implement weighted moving average update:
  ```python
  def update_profile_dimension(current_value, new_evidence, confidence, recency_weight=0.3):
      alpha = confidence * recency_weight
      return (1 - alpha) * current_value + alpha * new_evidence
  ```
- [ ] Create profile version history (append-only updates)
- [ ] Implement profile confidence check (>0.7 on >=4 dimensions = complete)
- [ ] Add `/api/profile/{student_id}` GET endpoint
- [ ] Write unit tests for profile extraction logic
- [ ] **Deliverable:** Can run full profiling conversation via API; profile JSON is stored and versioned

### Week 3: Frontend Basics & Profile UI

#### Day 1-3: Next.js Setup
- [ ] Initialize Next.js 14 app in `frontend/web/`:
  ```bash
  npx create-next-app@14 frontend/web --typescript --tailwind --eslint --app --src-dir
  ```
- [ ] Install dependencies:
  ```bash
  npm install @tanstack/react-query axios zustand lucide-react
  ```
- [ ] Set up project structure:
  ```
  frontend/web/src/
  ├── app/
  │   ├── layout.tsx
  │   ├── page.tsx              # Landing page
  │   └── (dashboard)/
  │       ├── profile/
  │       ├── path/
  │       └── tutor/
  ├── components/
  │   ├── ui/                   # Shadcn/ui components
  │   ├── chat/
  │   └── profile/
  ├── lib/
  │   ├── api.ts               # Axios client
  │   └── store.ts             # Zustand store
  └── types/
      └── index.ts             # TypeScript interfaces
  ```

#### Day 4-5: Chat UI Component
- [ ] Build `components/chat/ChatInterface.tsx`:
  - Message list (user + bot bubbles)
  - Text input with send button
  - Typing indicator
  - Streaming text rendering
- [ ] Connect to backend `/api/chat/*` endpoints
- [ ] Implement optimistic UI updates

#### Day 6-7: Profile Visualization
- [ ] Create `components/profile/ProfileCard.tsx`:
  - Radar chart showing 6 dimensions
  - Weak points list with severity indicators
  - Goals display
  - Content preference tags
- [ ] **Deliverable:** User can complete profiling chat on web UI and view their profile dashboard

**Phase 2 Checkpoint:**
- [ ] Full profiling conversation works end-to-end
- [ ] Profile is stored with confidence scores
- [ ] Frontend chat UI streams messages
- [ ] Profile visualization renders correctly

---

## Phase 3: Multi-Agent Resource Generation (Week 3-5)
**Goal:** Build Feature 2 — the orchestrator and 3 sub-agents (Content, Quiz, Mind Map).

### Week 3 (Continued): Orchestrator Foundation

#### Day 1-2: Agent Framework Setup
- [ ] Set up LangChain agent infrastructure:
  ```python
  from langchain.agents import AgentExecutor, create_react_agent
  from langchain.tools import tool
  ```
- [ ] Create base agent class:
  ```python
  class BaseAgent:
      def __init__(self, llm_client: SparkLLMClient):
          self.llm = llm_client
      
      async def run(self, topic: str, profile: dict, context: str = "") -> dict:
          raise NotImplementedError
  ```
- [ ] Implement `agents/orchestrator.py`:
  - Reads learner profile and topic
  - Produces delegation plan (which agents to run, in what order)
  - Uses chain-of-thought prompting to reason about best formats

#### Day 3-5: Content Agent & Quiz Agent
- [ ] **Content Agent** (`agents/content_agent.py`):
  - Input: topic, profile (cognitive style, knowledge base)
  - Output: Markdown lecture notes
  - System prompt: "Generate lecture notes for {topic} tailored to a {cognitive_style} learner with {prior_knowledge} background. Include: definitions, examples, and 1 practical application."
  - Retrieve relevant RAG chunks and inject into context
  
- [ ] **Quiz Agent** (`agents/quiz_agent.py`):
  - Input: topic, profile, difficulty target
  - Output: Structured JSON with 5-10 questions
  ```json
  {
    "questions": [
      {
        "type": "multiple_choice|open_ended|code",
        "question": "...",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "...",
        "explanation": "...",
        "difficulty": 0.5
      }
    ]
  }
  ```
  - Adjust difficulty based on profile (lower for weak points)

#### Day 6-7: Mind Map Agent
- [ ] **Mind Map Agent** (`agents/mindmap_agent.py`):
  - Input: topic, profile
  - Output: JSON graph structure → rendered to SVG
  ```json
  {
    "nodes": [{"id": "root", "label": "Topic"}, {"id": "n1", "label": "Subtopic"}],
    "edges": [{"from": "root", "to": "n1"}]
  }
  ```
  - Use LLM to generate concept hierarchy
  - Integrate with D3.js or Cytoscape.js for frontend rendering
- [ ] **Deliverable:** `/api/resources/generate` endpoint accepts topic + student_id, returns content + quiz + mind map

### Week 4: Resource Delivery & Hallucination Filter

#### Day 1-2: Hallucination Prevention Layer
- [ ] Implement `core/hallucination_filter.py` (two-stage):
  - **Stage 1 — Factual Consistency Check:**
    ```python
    async def verify_facts(content: str, topic: str) -> dict:
        # Retrieve top-k chunks from RAG
        chunks = await rag.retrieve_chunks(content, topic, top_k=5)
        # Ask LLM: "Does the following content contain claims contradicted by the knowledge base?"
        # Return: {"verified": bool, "flagged_claims": [...]}
    ```
  - **Stage 2 — Content Safety Filter:**
    - Call iFlytek moderation API
    - Check for harmful, inappropriate, or misleading content
    - Zero tolerance policy
- [ ] Integrate filter into agent output pipeline
- [ ] Add logging for all flagged content

#### Day 3-5: Resource Bundle API
- [ ] Create `api/routers/resources.py`:
  ```python
  @router.post("/api/resources/generate")
  async def generate_resources(request: ResourceRequest):
      # 1. Load student profile
      # 2. Load knowledge graph node
      # 3. Orchestrator decides which agents to run
      # 4. Run selected agents in parallel (asyncio.gather)
      # 5. Apply hallucination filter to each output
      # 6. Bundle and store in database
      # 7. Return resource bundle
  ```
- [ ] Implement resource storage (PostgreSQL JSONB or file storage)
- [ ] Create resource versioning (if topic is revisited, generate new version)

#### Day 6-7: Frontend Resource Display
- [ ] Build `components/resources/ResourceBundle.tsx`:
  - Tab interface: Content | Quiz | Mind Map
  - Markdown rendering with syntax highlighting (react-markdown + prismjs)
  - Interactive quiz component with immediate feedback
  - Mind map visualization component
- [ ] **Deliverable:** User can request resources for a topic and view all three formats

### Week 5: Streaming & Polish

#### Day 1-3: SSE Streaming Implementation
- [ ] Implement streaming endpoints:
  ```python
  @router.post("/api/resources/generate/stream")
  async def generate_resources_stream(request: ResourceRequest):
      async def event_generator():
          yield f"data: {json.dumps({'type': 'status', 'message': 'Starting...'})}\n\n"
          # Stream each agent's output as it completes
          yield f"data: {json.dumps({'type': 'content', 'data': content})}\n\n"
          yield f"data: {json.dumps({'type': 'complete'})}\n\n"
      return StreamingResponse(event_generator(), media_type="text/event-stream")
  ```
- [ ] Frontend: `EventSource` client with progress indicators
- [ ] Add streaming for content generation specifically

#### Day 4-5: Agent Optimization
- [ ] Add prompt templates for each agent (versioned in `agents/prompts/`)
- [ ] Implement few-shot examples for quiz generation
- [ ] Add caching for identical resource requests (Redis, TTL: 24 hours)
- [ ] Profile caching to reduce DB lookups

#### Day 6-7: Integration Testing
- [ ] Write integration tests for full agent pipeline
- [ ] Test hallucination filter with adversarial inputs
- [ ] Benchmark resource generation times (target: <5 seconds for text)
- [ ] **Deliverable:** All 3 agents work end-to-end with streaming; hallucination filter catches bad outputs

**Phase 3 Checkpoint:**
- [ ] Orchestrator correctly delegates based on profile
- [ ] Content, Quiz, and Mind Map agents generate quality outputs
- [ ] Hallucination filter rejects incorrect content
- [ ] Frontend displays resources in all formats
- [ ] Streaming shows real-time progress

---

## Phase 4: Adaptive Learning Path Planning (Week 5-6)
**Goal:** Build Feature 3 — the A* path planner, milestone generator, and adaptation engine.

### Week 5 (Continued): Core Algorithm Implementation

#### Day 1-2: Knowledge Graph Integration
- [ ] Ensure `KnowledgeGraph` class from `A-algorithm.md` is fully implemented:
  - `__init__(nodes_file)` — load from JSON
  - `_precompute_heuristics()` — reverse topological DP
  - `get_prerequisites(node_id, hard_only)` — dependency lookup
  - `get_available_nodes(mastered)` — valid next steps
- [ ] Load test knowledge graph (20 nodes for cloud computing)
- [ ] Validate graph is DAG using NetworkX `is_directed_acyclic_graph()`

#### Day 3-5: A* Planner Implementation
- [ ] Implement `AdaptivePathPlanner` from `A-algorithm.md`:
  ```python
  class AdaptivePathPlanner:
      def __init__(self, kg: KnowledgeGraph, profile: dict):
          self.kg = kg
          self.profile = profile
          self.weights = {
              'w_time': 0.5, 'w_effort': 0.3, 'w_frustration': 0.2,
              'lambda1': 0.3, 'lambda2': 0.2, 'gamma': 0.8,
              'delta': 15.0, 'sigma': 10.0, 'tau': 8.0
          }
      
      def plan(self, start_nodes: Set[str], goal_id: str, max_nodes=25) -> List[str]:
          # Priority queue A* search
          pass
  ```
- [ ] Methods to implement:
  - `_compute_g(node_id, path)` — cumulative cost
  - `_effort_score(node)` — cognitive load mapping
  - `_frustration_penalty(node_id)` — weak point penalty
  - `_heuristic(node_id, goal_id)` — longest path × gamma
  - `_profile_bias(node_id)` — weak point / mastery / goal adjustments
  - `_preference_bonus(node_id)` — cognitive style matching
- [ ] Add path caching (Redis, key: `path:{student_id}:{goal_id}`, TTL: 1 hour)

#### Day 6-7: Milestone Splitting
- [ ] Implement `split_milestones(path, max_duration=180, max_nodes=5)`:
  ```python
  def split_milestones(path, max_duration=180, max_nodes=5):
      milestones = []
      current = []
      current_duration = 0
      
      for node in path:
          if (current_duration + node.est_minutes > max_duration 
              or len(current) >= max_nodes):
              # Dependency chain preservation check
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
  ```
- [ ] Add pacing control logic (conservative/standard/aggressive thresholds)
- [ ] **Deliverable:** `/api/path/plan` returns valid path with milestones for test profiles

### Week 6: Dynamic Adaptation & Frontend

#### Day 1-2: Dynamic Adaptation Engine
- [ ] Implement `DynamicAdaptationEngine` from `A-algorithm.md`:
  ```python
  class DynamicAdaptationEngine:
      def __init__(self, planner: AdaptivePathPlanner, kg: KnowledgeGraph):
          self.planner = planner
          self.kg = kg
          self.global_replan_cooldown = 86400  # 24 hours
      
      def handle_event(self, student_id, event, current_path, current_idx) -> dict:
          pass
      
      def _decide_strategy(self, event_type, event) -> str:
          # Return 'global', 'incremental', or None
          pass
  ```
- [ ] Event handlers:
  - `QUIZ_COMPLETE` (avg < 0.6): Global replan
  - `QUIZ_COMPLETE` (0.6-0.85): Insert remediation
  - `STUCK_SIGNAL`: Add scaffolding resources + trigger tutor
  - `GOAL_CHANGE`: Global replan
  - `RESOURCE_FEEDBACK`: Incremental adjustment
- [ ] Implement cooldown tracking (Redis or database)

#### Day 3-4: Path Planning API
- [ ] Create `api/routers/path.py`:
  ```python
  @router.post("/api/path/plan", response_model=PathPlanResponse)
  async def plan_path(request: PathPlanRequest):
      profile = await get_profile(request.student_id)
      kg = await load_kg(request.course_id)
      planner = AdaptivePathPlanner(kg, profile)
      path = planner.plan(set(request.start_nodes), request.goal_node)
      milestones = split_milestones(path)
      return PathPlanResponse(path=path, milestones=milestones, ...)
  
  @router.post("/api/path/adapt")
  async def adapt_path(request: AdaptRequest):
      # Handle adaptation events
      pass
  
  @router.get("/api/path/progress/{student_id}")
  async def get_progress(student_id: str):
      # Return current milestone, completed nodes, remaining time
      pass
  ```

#### Day 5-7: Frontend Path Visualization
- [ ] Build `components/path/PathVisualizer.tsx`:
  - Timeline/tree view of learning path
  - Milestone grouping with progress indicators
  - Color coding: completed | current | locked
  - Difficulty gradient visualization
- [ ] Build `components/path/MilestoneCard.tsx`:
  - Shows 3-5 nodes per milestone
  - Estimated time
  - Quiz button at milestone end
  - Unlock conditions
- [ ] **Deliverable:** Full path planning UI with milestone progression

**Phase 4 Checkpoint:**
- [ ] A* planner generates valid, dependency-satisfying paths
- [ ] Paths are personalized (different for different profiles)
- [ ] Milestones split correctly (90-180 min, 3-5 nodes)
- [ ] Dynamic adaptation triggers on quiz events
- [ ] Frontend path visualization is interactive

---

## Phase 5: Real-Time AI Tutoring (Week 6-7)
**Goal:** Build Feature 4 — multimodal tutoring with streaming responses.

### Week 6 (Continued): Tutor Backend

#### Day 1-2: Tutor Pipeline
- [ ] Create `api/routers/tutor.py`:
  ```python
  @router.post("/api/tutor/ask")
  async def ask_tutor(request: TutorRequest):
      # 1. Load learner context (profile, current topic, last 5 interactions)
      # 2. Retrieve relevant RAG chunks
      # 3. Build prompt with context
      # 4. Stream LLM response
      # 5. Log interaction for analytics
  ```
- [ ] Context assembly:
  ```python
  def build_tutor_context(student_id: str, question: str) -> list:
      profile = get_profile(student_id)
      current_topic = get_current_topic(student_id)
      history = get_last_n_interactions(student_id, n=5)
      rag_chunks = retrieve_chunks(question, current_topic, top_k=3)
      
      system_msg = f"""You are a tutor for a {profile['cognitive_style']} learner 
      currently studying {current_topic}. Their weak points: {profile['weak_points']}.
      Ground your answer in the provided knowledge base."""
      
      return [
          ChatMessage(role="system", content=system_msg),
          ChatMessage(role="user", content=f"Context: {rag_chunks}\n\nQuestion: {question}")
      ]
  ```

#### Day 3-4: Multimodal Router
- [ ] Implement response type detection:
  - Conceptual question → Streamed text + optional diagram
  - Problem-solving → Step-by-step walkthrough
  - Hands-free mode → Voice reply (iFlytek TTS)
  - Complex concept → Short explainer video (placeholder if video gen not ready)
- [ ] Create `core/multimodal_router.py`:
  ```python
  def route_response(question: str, profile: dict) -> str:
      # Returns: 'text' | 'diagram' | 'walkthrough' | 'voice' | 'video'
      if profile.get('hands_free'):
          return 'voice'
      if is_problem_solving(question):
          return 'walkthrough'
      if is_conceptual(question) and 'visual' in profile['cognitive_style']:
          return 'diagram'
      return 'text'
  ```

#### Day 5-7: Context Window Management
- [ ] Implement rolling context window (8,000 token limit):
  ```python
  class ContextWindow:
      def __init__(self, max_tokens=8000):
          self.max_tokens = max_tokens
          self.history = []
          self.summary = ""
      
      def add_turn(self, user_msg: str, assistant_msg: str):
          self.history.append((user_msg, assistant_msg))
          self._manage_size()
      
      def _manage_size(self):
          while estimate_tokens(self.history) > self.max_tokens:
              # Summarize oldest turns with background LLM call
              oldest = self.history.pop(0)
              self.summary = summarize(self.summary, oldest)
      
      def get_context(self) -> list:
          # Return summary + recent history
          pass
  ```
- [ ] Integrate summarization endpoint for background compression
- [ ] **Deliverable:** `/api/tutor/ask` streams contextual responses

### Week 7: Tutor Frontend & Voice

#### Day 1-3: Tutor Chat UI
- [ ] Build `components/tutor/TutorPanel.tsx`:
  - Slide-out panel from right side
  - Chat interface with pre-loaded topic context
  - Message bubbles with Markdown rendering
  - Code syntax highlighting
  - LaTeX math rendering (KaTeX)
- [ ] Build `components/tutor/StepWalkthrough.tsx`:
  - Numbered steps with collapsible details
  - Progress tracker
  - "Next step" / "Previous step" navigation

#### Day 4-5: Voice Integration (Edge-TTS / iFlytek TTS)
**Using Edge-TTS (Free, No API Key):**

Edge-TTS provides free, high-quality text-to-speech using Microsoft Edge's online voices. No API key needed.

- [ ] Install Edge-TTS:
  ```bash
  pip install edge-tts
  ```
- [ ] Create `backend/core/tts_client.py`:
  ```python
  import edge_tts
  import io
  from typing import Optional
  
  class TTSClient:
      """
      Unified TTS client with Edge-TTS (free) as primary,
      iFlytek TTS as optional fallback
      """
      def __init__(self, voice: str = "zh-CN-XiaoxiaoNeural"):
          self.voice = voice
          self.use_edge = True
      
      async def synthesize(
          self,
          text: str,
          rate: str = "+0%",
          volume: str = "+0%"
      ) -> bytes:
          """Synthesize text to MP3 bytes"""
          if self.use_edge:
              communicate = edge_tts.Communicate(
                  text=text,
                  voice=self.voice,
                  rate=rate,
                  volume=volume
              )
              mp3_bytes = io.BytesIO()
              async for chunk in communicate.stream():
                  if chunk["type"] == "audio":
                      mp3_bytes.write(chunk["data"])
              return mp3_bytes.getvalue()
          else:
              # Fallback to iFlytek TTS
              pass
      
      def list_voices(self, locale: str = "zh"):
          """List available voices"""
          voices = [
              "zh-CN-XiaoxiaoNeural",  # Female, warm
              "zh-CN-XiaoyiNeural",    # Female, bright
              "zh-CN-YunjianNeural",   # Male, mature
              "zh-CN-YunxiNeural",     # Male, energetic
              "zh-CN-YunxiaNeural",    # Male, gentle
          ]
          return [v for v in voices if locale in v]
  ```
- [ ] Add endpoint `/api/tutor/speak`:
  ```python
  @router.post("/api/tutor/speak")
  async def text_to_speech(request: TTSRequest):
      tts_client = TTSClient(voice=request.voice or "zh-CN-XiaoxiaoNeural")
      mp3_bytes = await tts_client.synthesize(request.text)
      return Response(content=mp3_bytes, media_type="audio/mpeg")
  ```

**Optional: iFlytek TTS (if API key available):**
- [ ] Integrate iFlytek TTS SDK as fallback for production quality

- [ ] **Deliverable:** Voice output works via Edge-TTS (free); no API key needed

#### Day 6-7: Diagram Generation
- [ ] Implement SVG diagram generation for conceptual questions:
  - LLM generates graph description (Mermaid or DOT format)
  - Convert to SVG using `mermaid-cli` or `graphviz`
  - Return SVG inline in response
- [ ] Frontend: Inline SVG rendering with zoom/pan
- [ ] **Deliverable:** Tutor responds in 4 modalities; voice works via Edge-TTS (free); diagrams render

**Phase 5 Checkpoint:**
- [ ] Tutor answers are context-aware (knows profile, current topic)
- [ ] Responses stream in real-time
- [ ] RAG grounding prevents hallucination
- [ ] Voice output works via Edge-TTS (free, no API key)
- [ ] Context window manages long sessions

---

## Phase 6: Learning Assessment & Analytics (Week 7-8)
**Goal:** Build Feature 5 — behavioral analytics, dynamic adaptation triggers, and dashboards.

### Week 7 (Continued): Data Collection

#### Day 1-2: Behavioral Signal Collection
- [ ] Create `analytics/event_logger.py`:
  ```python
  class EventLogger:
      async def log_quiz_performance(self, student_id, quiz_id, score, per_question_times, attempts):
          pass
      
      async def log_resource_engagement(self, student_id, resource_id, time_on_task, scroll_depth, re_read_count):
          pass
      
      async def log_tutor_interaction(self, student_id, question, confusion_signals):
          pass
      
      async def log_path_completion(self, student_id, milestone_id, completion_rate, time_spent):
          pass
  ```
- [ ] Implement continuous event streaming (batch every 60 seconds)
- [ ] Store events in PostgreSQL (events table) for analysis

#### Day 3-4: Analytics Engine
- [ ] Create `analytics/analytics_engine.py`:
  ```python
  class AnalyticsEngine:
      async def analyze(self, student_id: str) -> dict:
          # 1. Aggregate behavioral data
          # 2. Build structured prompt for LLM
          # 3. Call Spark LLM for analysis
          # 4. Parse JSON report
          # 5. Trigger adaptations if thresholds crossed
          pass
  ```
- [ ] LLM Analysis prompt:
  ```
  Analyze the following student behavioral data and return a JSON report:
  {
    "mastery_scores": {"topic_id": 0.75, ...},
    "predicted_weak_spots": ["topic_id", ...],
    "engagement_quality": 0.82,
    "completion_forecast_days": 14,
    "anomaly_flags": ["rapid_completion", "long_gap"],
    "recommendations": [...]
  }
  ```
- [ ] Parse and validate LLM output

#### Day 5-7: Dynamic Adaptation Triggers
- [ ] Implement adaptation rules:
  - Low mastery (<0.4) → Trigger resource regeneration (Feature 2)
  - Weak spots detected → Update profile (Feature 1)
  - Engagement drop → Proactive tutor prompt (Feature 4)
  - 3 consecutive low scores → Global path replan (Feature 3)
  - At-risk student → Teacher dashboard alert
- [ ] Create `analytics/adaptation_triggers.py` with threshold constants
- [ ] **Deliverable:** Quiz submission triggers automatic analysis and adaptations

### Week 8: Dashboard & Full Loop Integration

#### Day 1-3: Student Analytics Dashboard
- [ ] Build `app/(dashboard)/analytics/page.tsx`:
  - Mastery score per topic (radar chart or bar chart)
  - Learning pace trend line
  - Time spent per milestone
  - Weak spots highlighting
  - Completion forecast
  - Achievement badges
- [ ] Use Recharts or Chart.js for visualizations

#### Day 2-4: Teacher Dashboard (Optional but Scoring-Positive)
- [ ] Build instructor view:
  - Class overview (all students)
  - At-risk student alerts
  - Common weak points across class
  - Engagement heatmap
- [ ] Role-based access control (student vs instructor)

#### Day 5-7: Full Feedback Loop Integration
- [ ] Wire up all feature-to-feature transitions:
  - F5 Assessment → F1 Profile Update
  - F5 Assessment → F2 Resource Regeneration
  - F5 Assessment → F3 Path Replan
  - F5 Assessment → F4 Proactive Tutor Prompt
- [ ] Test complete user flows:
  1. New student onboarding → Profile → Resources → Path → Tutor → Quiz → Adaptation
  2. Struggling student → Stuck detection → Remediation → Replan
  3. Excelling student → Fast completion → Acceleration → Advanced content
- [ ] End-to-end integration tests
- [ ] **Deliverable:** Full feedback loop works; dashboards display real data

**Phase 6 Checkpoint:**
- [ ] All 4 behavioral signals are logged
- [ ] LLM analytics produces JSON reports
- [ ] Adaptations trigger automatically based on thresholds
- [ ] Student dashboard shows mastery and progress
- [ ] Complete user flow test passes end-to-end

---

## Phase 7: Advanced Features & Polish (Week 8-9)
**Goal:** Complete remaining agents (Media, Code), optimize performance, and enhance quality.

### Week 8 (Continued): Media & Code Agents

#### Day 1-3: Media Agent (Video Generation)
- [ ] Implement `agents/media_agent.py`:
  - Input: topic, profile, complexity level
  - Output: Video script + frame descriptions
  - Use Stable Video Diffusion or Wan2.1 for frame generation (if API available)
  - Fallback: Generate animated slides with TTS narration
- [ ] Integration with video generation API:
  ```python
  async def generate_video(topic: str, script: str, frames: list) -> str:
      # Call video generation API
      # Return video URL or file path
  ```
- [ ] Frontend: Video player component with playback controls

#### Day 4-5: Code Agent
- [ ] Implement `agents/code_agent.py`:
  - Input: programming topic, language, difficulty
  - Output: Runnable code + test cases + explanation
  - Integrate with code sandbox (Docker-based or API)
  - Supported languages: Python, Java, C++ (match course)
- [ ] Frontend: Code editor (Monaco Editor or CodeMirror) with syntax highlighting
- [ ] Run button with sandbox execution
- [ ] Test case validation display

#### Day 6-7: Orchestrator Enhancement
- [ ] Update orchestrator to delegate to all 5 agents:
  - Content, Quiz, Mind Map (already done)
  - Media (for visual/kinetic learners)
  - Code (for programming topics)
- [ ] Add agent selection logic based on topic type and profile
- [ ] **Deliverable:** All 5 agents generate outputs; media and code work end-to-end

### Week 9: Performance Optimization & Quality Assurance

#### Day 1-2: Performance Optimization
- [ ] Profile API response times:
  - Path planning: <3 seconds
  - Resource generation (text): <5 seconds
  - Tutor first token: <800ms
  - Profile update: <2 seconds
- [ ] Optimization strategies:
  - Add Redis caching for knowledge graph heuristics
  - Cache LLM responses for common queries
  - Pre-generate embeddings for knowledge base
  - Optimize database queries with indexes
- [ ] Load testing with k6 (target: 50 concurrent users)

#### Day 3-4: Hallucination Testing
- [ ] Create test suite with 50+ known-correct questions
- [ ] Run tutor responses through factual verification
- [ ] Measure factual error rate (target: <2%)
- [ ] Fix prompt engineering to improve grounding
- [ ] Add source citations to tutor responses

#### Day 5-7: UI/UX Polish
- [ ] Ensure mobile responsiveness across all pages
- [ ] Add loading states and skeleton screens
- [ ] Implement offline resource caching (Service Worker)
- [ ] Add animations and transitions (Framer Motion)
- [ ] Dark mode support (optional)
- [ ] Accessibility audit (ARIA labels, keyboard navigation)
- [ ] **Deliverable:** All performance targets met; UI is polished and responsive

**Phase 7 Checkpoint:**
- [ ] Media and Code agents generate quality outputs
- [ ] API response times meet targets
- [ ] Hallucination rate <2%
- [ ] UI is mobile-responsive and accessible
- [ ] Load test passes at 50 concurrent users

---

## Phase 8: Submission Preparation (Week 9-10)
**Goal:** Package everything for competition submission.

### Week 9 (Continued): Documentation & Testing

#### Day 1-2: API Documentation
- [ ] Generate OpenAPI spec from FastAPI (`/docs` endpoint)
- [ ] Write API usage examples for all endpoints
- [ ] Document authentication and error codes
- [ ] Create Postman collection or similar

#### Day 3-4: Technical Documentation
- [ ] Update architecture diagrams (system overview, feature interaction)
- [ ] Document algorithm choices (A* customization, profile weighting)
- [ ] Write deployment guide (Docker Compose instructions)
- [ ] Create database schema documentation
- [ ] Document agent prompts and rationale

#### Day 5-7: Testing & Bug Fixes
- [ ] Run full test suite:
  - Unit tests (pytest)
  - Integration tests (pytest + test database)
  - End-to-end tests (Playwright or Cypress for frontend)
- [ ] Bug triage and critical fixes only
- [ ] Regression testing (ensure features still work)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)

### Week 10: Demo & Packaging

#### Day 1-3: Demo Video (7 minutes max)
- [ ] Script the demo flow:
  1. Student registration and profiling chat (1 min)
  2. Resource generation for first topic (1.5 min)
  3. Learning path visualization (1 min)
  4. AI tutor interaction with streaming (1.5 min)
  5. Quiz completion and adaptation (1 min)
  6. Analytics dashboard (1 min)
- [ ] Record high-quality screen capture
- [ ] Add voiceover narration
- [ ] Edit to fit 7-minute limit
- [ ] Add captions/Chinese subtitles

#### Day 4-5: Code Packaging
- [ ] Ensure `docker-compose.yml` works on a clean machine
- [ ] Create `README.md` with:
  - Project description
  - Installation instructions
  - Environment variable setup
  - Running the application
  - Testing instructions
- [ ] Clean up repository (remove `.pyc`, `node_modules`, temp files)
- [ ] Create `.gitignore` properly
- [ ] Tag final version: `git tag v1.0.0`

#### Day 6-7: Final Review & Backup
- [ ] Deploy to staging environment and test
- [ ] Create offline backup of all code and documentation
- [ ] Prepare submission package:
  ```
  submission/
  ├── source_code.zip          # Full project
  ├── demo_video.mp4           # ≤7 minutes
  ├── technical_documentation.pdf
  ├── api_documentation.pdf
  └── test_data_description.md
  ```
- [ ] Final team review meeting
- [ ] Submit before deadline
- [ ] **Deliverable:** Competition submission complete

**Phase 8 Checkpoint:**
- [ ] Demo video is polished and under 7 minutes
- [ ] Documentation is complete and professional
- [ ] Code is clean and deployable
- [ ] Submission package is ready
- [ ] Team is confident in all features

---

## Daily Development Workflow

### Morning Standup (15 minutes)
- What did you complete yesterday?
- What are you working on today?
- Any blockers?

### Git Workflow
```bash
# Start of day
git pull origin main

# Create feature branch
git checkout -b feature/week3-content-agent

# Regular commits
git add .
git commit -m "feat: implement content agent with RAG integration"

# End of day
git push origin feature/week3-content-agent

# Merge via pull request after code review
```

### Code Review Checklist
- [ ] Code follows project style guide
- [ ] Unit tests pass
- [ ] No hardcoded secrets
- [ ] Error handling is robust
- [ ] API responses match schema
- [ ] Frontend is responsive

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| iFlytek API rate limits | High | Implement aggressive caching; mock LLM for dev/testing |
| Video generation API unavailable | Medium | Fallback to animated slides + TTS |
| Knowledge graph quality poor | High | Allocate 30% of Phase 1 to graph refinement; expert review |
| Team member unavailable | Medium | Document all code; pair program critical components |
| Frontend-backend integration issues | Medium | Define API contracts early; use OpenAPI spec |
| Performance below targets | High | Load test in Phase 7; optimize caching and DB queries |

---

## Success Metrics

### Technical Metrics
- [ ] All 5 features fully implemented
- [ ] API response times meet targets
- [ ] Factual error rate <2%
- [ ] 50 concurrent users supported
- [ ] 100% dependency satisfaction in generated paths

### Competition Scoring Alignment
| Category | Weight | Evidence |
|----------|--------|----------|
| Innovation & Practical Value | 35% | Multi-agent orchestrator; profile-first design; full feedback loop |
| Functionality & Technical | 45% | All 5 features; 6+ profile dimensions; 5 resource types; multimodal tutor |
| Documentation Quality | 10% | Technical spec; API docs; architecture diagrams |
| Demo Video | 10% | 7-min video covering all features |

---

## Appendix: Useful Commands

### Backend
```bash
# Start development server
uvicorn main:app --reload --port 8000

# Run database migrations
alembic upgrade head

# Run tests
pytest -v

# Check test coverage
pytest --cov=backend --cov-report=html
```

### Frontend
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

### Docker
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Reset database
docker-compose down -v
docker-compose up -d
```

---

**Next Step:** Start with Phase 1, Week 1, Day 1. Set up the repository and run `docker-compose up`.