---
name: eval-runner
description: Evaluate learning path quality using the 5 metrics from the A3 algorithm specification. Use this skill when you need to validate that generated learning paths meet quality standards, compare different path generation algorithms, measure the effectiveness of personalization, or ensure that the A* planner is producing pedagogically sound learning sequences. Essential for quality assurance in adaptive learning systems.
---

# Path Quality Evaluator

Evaluates learning path quality using the 5 metrics from the A3 algorithm specification.

## The 5 Quality Metrics

From the A-algorithm.md specification:

### 1. Dependency Satisfaction (Target: 100%)
**Definition:** All hard prerequisite constraints for each node in the path are satisfied.

**Calculation:**
```
dependency_satisfaction = 1 - (violations / total_nodes)
```

**Violation examples:**
- Node N05 appears before its prerequisite N03
- Node N10 appears without N09 even though N09 → N10 (hard)

**Why 100% matters:** Hard prerequisites represent actual knowledge dependencies. Violating them means the student is being asked to learn something they don't have the foundation for.

---

### 2. Profile Match (Target: >70%)
**Definition:** The proportion of nodes in the path that contain the student's preferred content types.

**Calculation:**
```
profile_match = matching_nodes / total_nodes

where matching_nodes = count of nodes where
  len(node.content_types ∩ student.content_preferences) > 0
```

**Example:**
- Student prefers: `["diagram", "video", "interactive"]`
- Node N01 has: `["text", "diagram"]` → Match (diagram)
- Node N02 has: `["text", "code"]` → No match
- Profile match: 1/2 = 50%

**Why >70% matters:** Students engage more with content in their preferred format. Low match means the system isn't personalizing effectively.

---

### 3. Difficulty Smoothness (Target: < total_nodes × 0.2)
**Definition:** The sum of absolute difficulty differences between adjacent nodes. Lower values indicate gentler difficulty gradients.

**Calculation:**
```
diff_smoothness = Σ|diff[i] - diff[i-1]| for i = 1 to n-1

normalized = 1 - (diff_smoothness / total_nodes)
target: diff_smoothness < total_nodes × 0.2
```

**Example:**
- Path: [N01(0.3), N02(0.4), N03(0.7), N04(0.8)]
- Differences: |0.4-0.3|=0.1, |0.7-0.4|=0.3, |0.8-0.7|=0.1
- Sum: 0.5
- Threshold: 4 × 0.2 = 0.8
- Result: 0.5 < 0.8 ✓ PASS

**Why it matters:** Large difficulty jumps demotivate learners. Smooth progression keeps students in the "flow zone."

---

### 4. Weak Point Coverage (Target: >80%)
**Definition:** The proportion of student weak points that are covered in the first 1/3 of the learning path.

**Calculation:**
```
weak_point_coverage = |weak_points ∩ early_nodes| / |weak_points|

where early_nodes = path[0 : len(path)//3]
```

**Example:**
- Student weak points: `["N05", "N07", "N12"]`
- Path: `["N01", "N03", "N05", "N07", "N10", "N12", ...]` (20 nodes)
- First 1/3: `["N01", "N03", "N05", "N07", "N10", "N12", "N15"]` (7 nodes)
- Covered: `["N05", "N07", "N12"]` → 3/3 = 100%

**Why >80% matters:** Weak points are where students struggle most. Addressing them early prevents frustration and dropout.

---

### 5. Goal Convergence (Qualitative: Decreasing Trend)
**Definition:** The rate at which estimated time to reach the goal node decreases as the student progresses through the path. Should show a monotonic decreasing trend.

**Calculation:**
```
remaining_estimate[i] = Σ est_time[node] for node in path[i+1:]

goal_convergence = remaining_estimate[0], remaining_estimate[1], ...

expected: monotonically decreasing (or flat, never increasing)
```

**Example:**
- Path: `[N01, N02, N03, N05, N07, N10, N20]`
- Est times: `[30, 35, 40, 45, 50, 60, 90]`
- Remaining after each:
  - After N01: 35+40+45+50+60+90 = 320
  - After N02: 40+45+50+60+90 = 285
  - After N03: 45+50+60+90 = 245
  - ... (always decreasing)

**Why it matters:** Increasing remaining time suggests the path is taking the student away from their goal (inefficient or incorrect path).

---

## Usage

### Command Line

#### Basic evaluation
```bash
python -m scripts.eval_path \
  --knowledge-graph ./data/knowledge_graph.json \
  --path ./results/path_001.json \
  --profile ./profiles/student_01.json \
  --output ./eval_results/path_001_eval.json
```

#### Batch evaluation
```bash
python -m scripts.batch_eval \
  --knowledge-graph ./data/knowledge_graph.json \
  --paths-dir ./results/paths/ \
  --profiles-dir ./profiles/ \
  --output ./eval_results/batch_eval.json \
  --format html
```

#### Compare multiple algorithms
```bash
python -m scripts.compare_algorithms \
  --knowledge-graph ./data/knowledge_graph.json \
  --algorithm-outputs ./results/*/ \
  --profiles ./test_profiles/*.json \
  --output ./comparison_report.html
```

### Python API

```python
from eval_runner import PathEvaluator, MetricsReport

# Initialize evaluator
evaluator = PathEvaluator(
    knowledge_graph_path="./data/knowledge_graph.json"
)

# Evaluate a single path
report = evaluator.evaluate(
    path=["N01", "N02", "N03", "N05", "N07", "N10", "N20"],
    profile=student_profile,
    expected_goal="N20"
)

# Check if path meets quality thresholds
if report.meets_thresholds():
    print("✓ Path meets all quality criteria")
else:
    print("✗ Path has quality issues:")
    for violation in report.violations:
        print(f"  - {violation.metric}: {violation.actual} (target: {violation.target})")

# Get detailed metrics
print(f"Dependency Satisfaction: {report.metrics.dependency_satisfaction:.1%}")
print(f"Profile Match: {report.metrics.profile_match:.1%}")
print(f"Difficulty Smoothness: {report.metrics.difficulty_smoothness:.2f}")
print(f"Weak Point Coverage: {report.metrics.weak_point_coverage:.1%}")
print(f"Goal Convergence: {'✓ Decreasing' if report.metrics.goal_convergence else '✗ Not monotonic'}")

# Compare multiple paths
paths = [path1, path2, path3]
comparison = evaluator.compare(paths, profile=student_profile)
print(comparison.best_path)  # Which path has highest overall quality?
```

## Output Format

### Evaluation Report (JSON)

```json
{
  "evaluation_id": "eval_001",
  "timestamp": "2026-04-26T10:30:00Z",
  "path": {
    "nodes": ["N01", "N02", "N03", "N05", "N07", "N10", "N20"],
    "length": 7,
    "total_estimated_time": 450
  },
  "profile": {
    "id": "test_student_01",
    "cognitive_style": "visual",
    "weak_points": ["Kubernetes"]
  },
  "metrics": {
    "dependency_satisfaction": 1.0,
    "profile_match": 0.75,
    "difficulty_smoothness": 0.18,
    "weak_point_coverage": 0.85,
    "goal_convergence": true
  },
  "thresholds": {
    "dependency_satisfaction": {"target": 1.0, "passed": true},
    "profile_match": {"target": 0.7, "actual": 0.75, "passed": true},
    "difficulty_smoothness": {"target": 1.4, "actual": 0.18, "passed": true},
    "weak_point_coverage": {"target": 0.8, "actual": 0.85, "passed": true},
    "goal_convergence": {"target": true, "passed": true}
  },
  "violations": [],
  "meets_all_thresholds": true,
  "analysis": {
    "dependency_violations": [],
    "smoothness_breakdown": [
      {"from": "N01", "to": "N02", "diff": 0.1},
      {"from": "N02", "to": "N03", "diff": 0.3},
      {"from": "N03", "to": "N05", "diff": 0.05}
    ],
    "weak_points_covered": ["N05"],
    "weak_points_missed": [],
    "goal_convergence_trend": [320, 285, 245, 200, 150, 90, 0],
    "content_type_distribution": {
      "visual": 8,
      "text": 6,
      "code": 3
    }
  },
  "recommendations": [
    "Path quality is excellent - all thresholds met",
    "Consider adding more visual content to N05 (weak point with visual learner)",
    "Difficulty smoothness is good but N02→N03 jump could be gentler"
  ]
}
```

## Integration with other skills

### With kg-builder skill
```
kg-builder → generates knowledge_graph.json
    ↓
eval-runner ← uses knowledge_graph.json to validate paths
```

### With path-tester skill
```
path-tester → generates paths for different profiles
    ↓
eval-runner ← evaluates quality of those paths
```

### With sim-student skill
```
sim-student → runs complete learning flows
    ↓
eval-runner ← evaluates path quality at each step
```

## Best practices

1. **Always validate dependency satisfaction:** This is the most critical metric - paths with violations are invalid regardless of other scores
2. **Use multiple profiles:** A path that works for one profile may fail for another
3. **Set realistic thresholds:** Don't expect 100% on all metrics - balance between them
4. **Test edge cases:** Empty profiles, complete experts, impossible goals
5. **Document violations:** When a metric fails, investigate why and fix the root cause
6. **Compare over time:** Track metrics as you improve the algorithm
7. **Automate in CI/CD:** Run evaluation on every code change to catch regressions