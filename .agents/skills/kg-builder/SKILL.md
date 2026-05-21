---
name: kg-builder
description: Build knowledge graphs for adaptive learning systems from structured reference data. Use this skill when you need to convert raw concept lists, relationship triples, and text content into a formal knowledge graph with nodes, edges, prerequisites, and difficulty scores. This is essential for A* path planning in personalized education systems like the A3 project.
---

# Knowledge Graph Builder

Builds knowledge graphs for adaptive learning systems from structured reference data.

## When to use this skill

Use this skill when you need to:
1. Convert raw concept lists and relationship triples into a formal knowledge graph
2. Build prerequisite chains (hard and soft dependencies) between learning topics
3. Assign difficulty scores and estimated learning times to knowledge nodes
4. Validate that the knowledge graph is a DAG (no circular dependencies)
5. Export the graph to JSON format for use in A* path planning algorithms

## Input data format

The skill expects reference data organized as follows:

```
reference-data/
├── newwords.txt          # List of concept keywords (one per line)
├── triples.csv           # Relationship triples: subject,relation,object
├── pagerank_scores.csv   # Node importance scores (optional)
└── txt/                  # Raw text content per concept
    ├── concept1.txt
    └── concept2.txt
```

## Output format

The skill generates `knowledge_graph.json`:

```json
{
  "course_id": "cloud-computing",
  "course_name": "Cloud Computing Fundamentals",
  "nodes": [
    {
      "node_id": "N01",
      "title": "云计算概述",
      "difficulty": 0.3,
      "est_minutes": 30,
      "hard_prerequisites": [],
      "soft_prerequisites": [],
      "topic_tags": ["overview", "fundamentals"],
      "content_types": ["text", "diagram"]
    }
  ],
  "edges": [
    {
      "from": "N01",
      "to": "N02",
      "type": "hard_prerequisite"
    }
  ]
}
```

## Usage steps

### Step 1: Validate input data

Check that the reference data files exist and have the expected format:

```bash
python -m scripts.validate_input --data-dir ./reference-data
```

This checks:
- `newwords.txt` exists and is not empty
- `triples.csv` has valid subject,relation,object format
- No obvious data corruption

### Step 2: Build the knowledge graph

Run the main build script:

```bash
python -m scripts.build_graph \
  --data-dir ./reference-data \
  --output ./knowledge_graph.json \
  --course-name "Cloud Computing Fundamentals"
```

This will:
1. Load keywords from `newwords.txt` as initial nodes
2. Map triples from `triples.csv` to edges (hard/soft prerequisites)
3. Assign difficulty scores based on PageRank or heuristics
4. Set estimated learning times (20-60 min per node)
5. Validate the graph is a DAG
6. Export to JSON

### Step 3: Validate the output

Check that the generated graph is valid:

```bash
python -m scripts.validate_graph --input ./knowledge_graph.json
```

This validates:
- All nodes have required fields
- No circular dependencies (DAG check)
- All prerequisite nodes exist
- Difficulty scores are in range [0, 1]
- Estimated times are reasonable

### Step 4: (Optional) Manual refinement

Review the generated graph and manually adjust if needed:

```bash
# Open the graph in an editor
# Make adjustments to prerequisites, difficulty, etc.
# Re-validate after changes
```

Common adjustments:
- Change hard prerequisites to soft (or vice versa)
- Adjust difficulty scores based on domain knowledge
- Add missing prerequisite edges
- Split/merge nodes if granularity is off

## Relationship mapping rules

The skill maps relationship types from triples to prerequisite types:

| Triple Relation | Mapped to | Reasoning |
|-----------------|-----------|-----------|
| `中文名` (Chinese name) | Metadata | Not a prerequisite |
| `外文名` (Foreign name) | Metadata | Not a prerequisite |
| `类别` (Category) | Soft prerequisite | Same category implies related knowledge |
| `开发者` (Developer) | Metadata | Not directly relevant to learning order |
| `BaiduTAG` | Soft prerequisite | Tag indicates related concepts |
| `延生` (Evolves from) | Hard prerequisite | X evolves from Y means Y must be learned first |
| `相关名词` (Related term) | Soft prerequisite | Related but not strictly required |

## Difficulty assignment heuristics

If PageRank scores are available:
- High PageRank → Lower difficulty (0.2-0.4) — fundamental concepts
- Medium PageRank → Medium difficulty (0.4-0.7) — intermediate concepts  
- Low PageRank → Higher difficulty (0.7-0.9) — specialized/advanced topics

If no PageRank data:
- Count number of prerequisites as proxy for difficulty
- More prerequisites → Higher difficulty
- Manual review recommended

## Troubleshooting

### Graph has cycles (not a DAG)

**Problem:** Circular dependency detected.

**Solutions:**
1. Identify the cycle using: `python -m scripts.find_cycles --input graph.json`
2. Manually break the cycle by changing a hard prerequisite to soft
3. Or remove one edge entirely
4. Re-validate

### Missing prerequisite nodes

**Problem:** Node A lists node B as prerequisite, but B doesn't exist.

**Solutions:**
1. Check if B was filtered out during keyword loading
2. Add B manually if it should exist
3. Or remove the prerequisite edge from A

### Unrealistic estimated times

**Problem:** Some nodes have est_minutes that are too high or low.

**Adjustments:**
- Target range: 20-60 minutes per node
- Fundamental concepts: 30-45 min
- Detailed technical topics: 45-60 min
- Overview/brief concepts: 20-30 min

## Best practices

1. **Version control:** Keep the knowledge graph JSON in git
2. **Incremental updates:** Use `--update` flag to add nodes without rebuilding
3. **Documentation:** Document any manual adjustments made after generation
4. **Validation:** Always run validation before using the graph in production
5. **Testing:** Test with multiple student profiles to ensure paths are reasonable

## Integration with A* planner

The generated `knowledge_graph.json` is directly usable by the A* planner:

```python
from knowledge_graph import KnowledgeGraph

kg = KnowledgeGraph("knowledge_graph.json")
planner = AdaptivePathPlanner(kg, student_profile)
path = planner.plan(start_nodes={"N01"}, goal_id="N20")
```

See `A-algorithm.md` for the full A* planner implementation.