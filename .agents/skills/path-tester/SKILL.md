---
name: path-tester
description: Test and debug the A* adaptive path planning algorithm with different student profiles. Use this skill when you need to validate that the path planner generates correct, dependency-satisfying paths, debug why certain paths are (or aren't) being generated, compare paths for different student profiles, or verify that profile weights (weak points, preferences) correctly affect path decisions. Essential for ensuring the personalization engine works correctly.
---

# A* Path Tester

Tests and debugs the A* adaptive path planning algorithm with different student profiles.

## When to use this skill

Use this skill when you need to:

1. **Validate path correctness** - Ensure all paths satisfy hard prerequisite dependencies
2. **Debug path generation** - Understand why the planner chose (or didn't choose) specific nodes
3. **Compare profile personalization** - See how different student profiles get different paths
4. **Verify profile weight effects** - Confirm weak points, goals, and preferences affect decisions
5. **Test edge cases** - Empty profiles, complete experts, impossible goals
6. **Benchmark performance** - Measure planning time, memory usage, path quality
7. **Debug A* internals** - Step through f(n), g(n), h(n) calculations

## Prerequisites

- Python 3.10+
- Knowledge graph JSON file (from kg-builder skill)
- A* planner implementation (AdaptivePathPlanner from A-algorithm.md)
- Student profile JSON files (or use built-in test profiles)

## Input format

### Student Profile (JSON)

```json
{
  "student_id": "test_student_01",
  "knowledge_base": {
    "云计算": 0.8,
    "虚拟化": 0.6,
    "Docker": 0.3
  },
  "cognitive_style": "visual",
  "weak_points": ["Kubernetes", "微服务架构"],
  "goals": ["pass_cks_exam"],
  "learning_pace": 0.6,
  "content_preferences": ["diagram", "video", "interactive"]
}
```

### Test Configuration (YAML)

```yaml
test_name: "Path Planner Validation Suite"
description: "Comprehensive tests for A* path planner"

knowledge_graph: "./data/knowledge_graph.json"

planner_config:
  weights:
    w_time: 0.5
    w_effort: 0.3
    w_frustration: 0.2
    lambda1: 0.3
    lambda2: 0.2
    gamma: 0.8
    delta: 15.0
    sigma: 10.0
    tau: 8.0
  max_nodes: 25

# Test profiles (can reference built-in or custom)
profiles:
  - name: "complete_beginner"
    file: "./profiles/beginner_visual.json"
    description: "New learner, visual preference, many weak points"
    expected_path_length: 20
    expected_skips: 0
    
  - name: "experienced_dev"
    file: "./profiles/experienced_kinetic.json"
    description: "Experienced with prior knowledge"
    expected_path_length: 12
    expected_skips: ["N01", "N02", "N03", "N04", "N05"]
    
  - name: "goal_oriented"
    file: "./profiles/goal_oriented.json"
    description: "Specific certification goal"
    expected_includes: ["N15", "N18", "N20"]
    expected_excludes: ["N07", "N08", "N09"]

# Expected invariants (all profiles must satisfy)
invariants:
  - name: "dependency_satisfaction"
    description: "All hard prerequisites must appear before dependent nodes"
    severity: "error"
    
  - name: "max_nodes"
    description: "Path length must not exceed max_nodes"
    severity: "error"
    
  - name: "goal_reachability"
    description: "Goal node must be reachable from start"
    severity: "error"

# Performance expectations
performance:
  max_planning_time_ms: 3000
  max_memory_mb: 512
```

## Output format

### Test Results (JSON)

```json
{
  "test_suite": "Path Planner Validation Suite",
  "timestamp": "2026-04-26T10:30:00Z",
  "summary": {
    "total_tests": 3,
    "passed": 3,
    "failed": 0,
    "invariant_violations": 0,
    "avg_planning_time_ms": 1240
  },
  "results": [
    {
      "test_id": "complete_beginner",
      "status": "passed",
      "profile": {
        "id": "test_student_01",
        "cognitive_style": "visual",
        "learning_pace": 0.3
      },
      "path": {
        "nodes": ["N01", "N02", "N03", "N05", "N07", "N10", "N12", "N15", "N18", "N20"],
        "length": 10,
        "total_estimated_time": 450,
        "milestones": [
          {
            "index": 0,
            "nodes": ["N01", "N02", "N03"],
            "duration": 105
          },
          {
            "index": 1,
            "nodes": ["N05", "N07"],
            "duration": 90
          }
        ]
      },
      "metrics": {
        "dependency_satisfaction": 1.0,
        "profile_match": 0.75,
        "difficulty_smoothness": 0.18,
        "weak_point_coverage": 0.85,
        "goal_convergence": "monotonic"
      },
      "invariants": {
        "dependency_satisfaction": {"passed": true},
        "max_nodes": {"passed": true, "actual": 10, "limit": 25},
        "goal_reachability": {"passed": true}
      },
      "performance": {
        "planning_time_ms": 1240,
        "memory_mb": 128,
        "peak_memory_mb": 156
      },
      "analysis": {
        "weak_points_addressed": ["N05", "N07", "N12"],
        "visual_content_count": 8,
        "skipped_nodes": ["N04", "N06", "N08", "N09", "N11", "N13", "N14", "N16", "N17", "N19"],
        "skip_reasons": {
          "N04": "Not in optimal path (lower priority)",
          "N06": "Prerequisite chain not required for goal"
        },
        "milestones": {
          "count": 4,
          "avg_duration": 112.5,
          "first_quiz_expected": "Milestone 0"
        }
      },
      "recommendations": [
        "Consider adding supplementary resources for N05 (weak point)",
        "Visual learner profile confirmed - 8/10 nodes have diagram content",
        "Path is conservative (pace=0.3) - consider acceleration if early quiz scores are high"
      ]
    },
    {
      "test_id": "experienced_dev",
      "status": "passed",
      "path": {
        "nodes": ["N06", "N08", "N10", "N12", "N15", "N18", "N20"],
        "length": 7,
        "total_estimated_time": 315
      },
      "metrics": {
        "dependency_satisfaction": 1.0,
        "profile_match": 0.82,
        "weak_point_coverage": 0.75
      },
      "analysis": {
        "skipped_due_to_mastery": ["N01", "N02", "N03", "N04", "N05"],
        "kinesthetic_content_count": 6
      },
      "verification": {
        "mastery_skips_correct": true,
        "all_skipped_nodes_mastery_above_0.85": true,
        "no_required_prerequisites_skipped": true
      }
    }
  ],
  "comparative_analysis": {
    "path_diversity": {
      "unique_paths": 2,
      "overlap_ratio": 0.4,
      "divergence_point": "N06"
    },
    "personalization_effectiveness": {
      "visual_beginner_total_time": 450,
      "experienced_dev_total_time": 315,
      "time_reduction": "30%",
      "explanation": "Experienced dev skipped 5 mastered topics"
    },
    "profile_weight_impact": {
      "weak_point_delta_effect": "15 min per weak point",
      "goal_relevance_boost": "10 min for goal-related nodes",
      "cognitive_style_match": "8 min per matching content type"
    }
  },
  "invariant_violations": [],
  "performance_summary": {
    "avg_planning_time_ms": 1240,
    "max_planning_time_ms": 1890,
    "avg_memory_mb": 128,
    "total_tests": 3,
    "all_passed": true
  }
}
```

## Usage examples

### Example 1: Quick single test

```bash
python -m scripts.test_path \
  --knowledge-graph ./data/knowledge_graph.json \
  --profile ./profiles/visual_beginner.json \
  --goal N20 \
  --output ./results/test_01.json
```

### Example 2: Compare multiple profiles

```bash
python -m scripts.compare_paths \
  --knowledge-graph ./data/knowledge_graph.json \
  --profiles ./profiles/*.json \
  --goal N20 \
  --output ./comparison_report.html
```

### Example 3: Interactive debugging

```bash
python -m scripts.debug_path \
  --knowledge-graph ./data/knowledge_graph.json \
  --profile ./profiles/test.json \
  --goal N20 \
  --verbose \
  --step-through
```

Interactive debugger commands:
- `step` - Execute one A* iteration
- `inspect <node>` - Show f(n), g(n), h(n) for a node
- `open` - Show current OPEN set
- `closed` - Show current CLOSED set
- `why <node>` - Explain why a node was (not) chosen
- `weights` - Show current profile weights
- `continue` - Run to completion
- `quit` - Exit debugger

### Example 4: Batch testing with expected outcomes

```bash
python -m scripts.batch_test \
  --knowledge-graph ./data/knowledge_graph.json \
  --test-suite ./test_suite.yaml \
  --parallel 4 \
  --output ./batch_results.json
```

## Integration with other skills

### With kg-builder skill
```
kg-builder → generates knowledge_graph.json
    ↓
path-tester ← uses knowledge_graph.json to test paths
```

### With sim-student skill
```
sim-student → generates realistic student profiles
    ↓
path-tester ← tests paths for those profiles
```

### With eval-runner skill
```
path-tester → generates paths
    ↓
eval-runner ← evaluates path quality using 5 metrics
```

## Best practices

1. **Test incrementally:** Start with 1-2 simple profiles before running full suites
2. **Version control:** Save test configurations in git for reproducibility
3. **Compare baselines:** Always compare against "no profile personalization" baseline
4. **Validate invariants:** Dependency satisfaction should always be 100%
5. **Document edge cases:** When you find a bug, create a test case for it
6. **Visualize paths:** Use HTML/SVG output to understand path decisions
7. **Monitor performance:** Track planning time, should be <3 seconds
8. **Test diversity:** Include beginners, experts, and edge cases