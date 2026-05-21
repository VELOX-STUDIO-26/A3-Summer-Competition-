---
name: sim-student
description: Simulate virtual students with different profiles to test adaptive learning systems. Use this skill when you need to create realistic student personas, run automated end-to-end tests of learning flows, or validate that the system adapts correctly to different learning styles, prior knowledge, and goals. Essential for testing A* path planning, resource generation, and dynamic adaptation without human testers.
---

# Simulated Student Runner

Creates and runs virtual students through complete learning flows for automated testing.

## When to use this skill

Use this skill when you need to:
1. Test the complete A3 learning flow without human testers
2. Validate that different student profiles get genuinely different paths
3. Verify that weak points are addressed early in the path
4. Test dynamic adaptation triggers (quiz failures, stuck signals, goal changes)
5. Generate large-scale test data for performance/load testing
6. Demonstrate system behavior with diverse learners
7. Regression test after algorithm changes

## Simulated Student Profiles

The skill includes 6 built-in student archetypes:

### 1. **Complete Beginner** (Visual Learner)
```json
{
  "student_id": "sim_beginner_01",
  "knowledge_base": {},
  "cognitive_style": "visual",
  "weak_points": ["虚拟化", "容器技术", "微服务"],
  "goals": ["pass_cloud_certification"],
  "learning_pace": 0.3,
  "content_preferences": ["diagram", "video"]
}
```
**Expected Behavior:** Starts from N01, takes full path, needs remediation

---

### 2. **Experienced Developer** (Kinesthetic Learner)
```json
{
  "student_id": "sim_expert_01",
  "knowledge_base": {
    "云计算": 0.9,
    "虚拟化": 0.85,
    "Docker": 0.8,
    "Kubernetes": 0.7
  },
  "cognitive_style": "kinesthetic",
  "weak_points": ["服务网格", "GitOps"],
  "goals": ["cka_certification"],
  "learning_pace": 0.8,
  "content_preferences": ["interactive", "code"]
}
```
**Expected Behavior:** Skips N01-N05, starts at N06, accelerates through content

---

### 3. **Goal-Oriented Professional** (Verbal Learner)
```json
{
  "student_id": "sim_goal_01",
  "knowledge_base": {
    "云计算": 0.6
  },
  "cognitive_style": "verbal",
  "weak_points": [],
  "goals": ["deploy_production_k8s_cluster"],
  "learning_pace": 0.7,
  "content_preferences": ["text", "documentation"]
}
```
**Expected Behavior:** Direct path to goal, skips tangential topics

---

### 4. **Struggling Student** (Mixed Learner)
```json
{
  "student_id": "sim_struggling_01",
  "knowledge_base": {
    "云计算": 0.4,
    "虚拟化": 0.2
  },
  "cognitive_style": "mixed",
  "weak_points": ["网络基础", "存储系统", "容器编排", "监控日志"],
  "goals": ["career_change_to_devops"],
  "learning_pace": 0.2,
  "content_preferences": ["video", "interactive"]
}
```
**Expected Behavior:** Many remediation loops, slower pace, frequent tutor triggers

---

### 5. **Quick Learner** (Kinesthetic Learner)
```json
{
  "student_id": "sim_quick_01",
  "knowledge_base": {},
  "cognitive_style": "kinesthetic",
  "weak_points": [],
  "goals": ["learn_cloud_basics"],
  "learning_pace": 0.9,
  "content_preferences": ["interactive", "code"]
}
```
**Expected Behavior:** Fast completion, skips remedial content, early unlocks

---

### 6. **Domain Expert** (Verbal Learner)
```json
{
  "student_id": "sim_expert_domain_01",
  "knowledge_base": {
    "云计算": 0.95,
    "虚拟化": 0.9,
    "Docker": 0.85,
    "Kubernetes": 0.8,
    "微服务": 0.75,
    "服务网格": 0.7,
    "GitOps": 0.65
  },
  "cognitive_style": "verbal",
  "weak_points": [],
  "goals": ["teach_cloud_computing"],
  "learning_pace": 0.8,
  "content_preferences": ["documentation", "text"]
}
```
**Expected Behavior:** Skips almost everything, may only review advanced topics

---

## Simulation Scenarios

### Scenario 1: Normal Learning Flow
```yaml
name: "Normal flow - complete beginner"
profile: "complete_beginner"
events:
  - type: "start"
    description: "Student starts at N01"
  - type: "resource_consumed"
    node: "N01"
    duration: 35  # minutes
    engagement: 0.8
  - type: "quiz_completed"
    node: "N01"
    score: 0.72
    weak_topics: ["公有云vs私有云"]
  - type: "milestone_completed"
    milestone: 0
  - type: "continue"
    next_node: "N02"

expected_outcomes:
  - path_generated: ["N01", "N02", "N03", ...]
  - remediation_triggered: false
  - tutor_engaged: false
  - pace_adjusted: "standard"
```

### Scenario 2: Quiz Failure Triggering Remediation
```yaml
name: "Quiz failure - remediation"
profile: "struggling_student"
events:
  - type: "start"
  - type: "quiz_completed"
    node: "N05"
    score: 0.45  # Below 60% threshold
    weak_topics: ["容器vs虚拟机", "Dockerfile语法"]
  - type: "adaptation_triggered"
    reason: "quiz_failure"
    action: "insert_remediation"
    new_nodes: ["N04_review", "N05_supplementary"]

expected_outcomes:
  - remediation_inserted: true
  - new_path: ["N04_review", "N05_supplementary", "N06", ...]
  - next_quiz_threshold: "80%"  # Raised for passed topics
```

### Scenario 3: Stuck Signal Triggering Tutor
```yaml
name: "Stuck - tutor engagement"
profile: "quick_learner"
events:
  - type: "start"
  - type: "resource_consumed"
    node: "N10"
    duration: 180  # 3x estimated time (60 min)
  - type: "stuck_signal"
    node: "N10"
    time_on_task: 180
    engagement_drops: ["scroll_depth", "rewatch_count"]
  - type: "tutor_triggered"
    context: "N10"
    question: "What's confusing about Kubernetes Services?"

expected_outcomes:
  - tutor_engaged: true
  - scaffolding_offered: ["simplified_video", "interactive_diagram"]
  - alternative_resource: true
```

### Scenario 4: Goal Change Triggering Replan
```yaml
name: "Goal change - global replan"
profile: "goal_oriented"
events:
  - type: "start"
  - type: "milestone_completed"
    milestone: 2
  - type: "goal_changed"
    old_goal: "learn_cloud_basics"
    new_goal: "cka_certification"
    reason: "career_opportunity"
  - type: "global_replan"
    trigger: "goal_change"
    cooldown_reset: "24h"

expected_outcomes:
  - new_path_generated: true
  - old_path_abandoned: ["N01-N12"]
  - new_path_includes: ["N15", "N18", "N20", "N22-25"]
  - cooldown_active: "24h"
```

## Running simulations

### Single simulation

```bash
python -m scripts.simulate_student \
  --profile ./profiles/complete_beginner.json \
  --scenario ./scenarios/normal_flow.yaml \
  --knowledge-graph ./knowledge_graph.json \
  --output ./results/sim_001.json
```

### Batch simulation

```bash
python -m scripts.batch_simulate \
  --profiles-dir ./profiles/ \
  --scenarios-dir ./scenarios/ \
  --knowledge-graph ./knowledge_graph.json \
  --parallel 4 \
  --output-dir ./results/
```

### Comparison report

```bash
python -m scripts.compare_simulations \
  --results results/sim_001.json results/sim_002.json results/sim_003.json \
  --output comparison_report.html
```

## Analyzing results

### Path diversity

```python
from analysis import PathAnalyzer

analyzer = PathAnalyzer([
    "results/sim_001.json",
    "results/sim_002.json",
    "results/sim_003.json"
])

# How many unique paths were generated?
print(analyzer.unique_paths_count())  # 3

# Where do paths diverge?
divergence = analyzer.find_divergence_point()
print(f"Paths diverge at: {divergence}")  # "N05"

# Path similarity matrix
similarity = analyzer.path_similarity_matrix()
```

### Adaptation trigger analysis

```python
from analysis import AdaptationAnalyzer

analyzer = AdaptationAnalyzer("results/batch_sim.json")

# How often was each trigger fired?
trigger_counts = analyzer.trigger_frequency()
print(trigger_counts)
# {
#   "quiz_complete": 45,
#   "stuck_signal": 12,
#   "goal_change": 3
# }

# What was the average score that triggered remediation?
remediation_threshold = analyzer.remediation_trigger_score()
print(f"Average: {remediation_threshold}")  # 52.3%

# How often did global vs incremental replan occur?
replan_types = analyzer.replan_type_frequency()
print(replan_types)
# {"global": 5, "incremental": 42}
```

### Learning curve simulation

```python
from analysis import LearningCurveAnalyzer

analyzer = LearningCurveAnalyzer("results/sim_001.json")

# Plot knowledge acquisition over time
analyzer.plot_knowledge_curve(output="knowledge_curve.png")

# Calculate time to mastery for each topic
time_to_mastery = analyzer.time_to_mastery()
print(time_to_mastery)
# {"N01": 35, "N02": 42, "N03": 58, ...}

# Identify bottlenecks (topics that took much longer than estimated)
bottlenecks = analyzer.identify_bottlenecks(threshold=1.5)
print(bottlenecks)
# [{"node": "N10", "estimated": 45, "actual": 78, "ratio": 1.73}]
```

## Integration with testing frameworks

### PyTest integration

```python
# test_learning_flow.py
import pytest
from sim_student import SimulatedStudent

def test_beginner_gets_full_path():
    student = SimulatedStudent("profiles/complete_beginner.json")
    result = student.run()
    
    assert len(result.path) == 20  # All nodes
    assert result.metrics["dependency_satisfaction"] == 1.0
    
def test_expert_skips_basics():
    student = SimulatedStudent("profiles/experienced_developer.json")
    result = student.run()
    
    # Should skip N01-N05
    skipped = ["N01", "N02", "N03", "N04", "N05"]
    for node in skipped:
        assert node not in result.path
        
def test_quiz_failure_triggers_remediation():
    student = SimulatedStudent("profiles/struggling_student.json")
    student.inject_event({
        "type": "quiz_completed",
        "node": "N05",
        "score": 0.45
    })
    
    result = student.run()
    
    assert result.adaptations_triggered > 0
    assert "N04_review" in result.path or "N05_supplementary" in result.path
```

### CI/CD integration

```yaml
# .github/workflows/simulation-tests.yml
name: Simulation Tests

on: [push, pull_request]

jobs:
  simulate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: pip install -r requirements.txt
      
      - name: Run simulations
        run: |
          python -m scripts.batch_simulate \
            --profiles-dir ./test_profiles/ \
            --knowledge-graph ./knowledge_graph.json \
            --parallel 4 \
            --output-dir ./test_results/
      
      - name: Generate report
        run: |
          python -m scripts.compare_simulations \
            --results ./test_results/*.json \
            --output ./test_report.html
      
      - name: Check thresholds
        run: |
          python -m scripts.check_thresholds \
            --results ./test_results/ \
            --config ./quality_gates.yaml
```

## Best practices

1. **Start simple:** Test 1-2 profiles before running full suites
2. **Reproducible:** Use fixed random seeds for consistent results
3. **Version control:** Store test profiles and expected outcomes
4. **Thresholds:** Define pass/fail criteria before running tests
5. **Isolation:** Each simulation should be independent
6. **Cleanup:** Remove temporary files after successful runs
7. **Monitoring:** Track simulation time and resource usage
8. **Documentation:** Document edge cases and expected behaviors