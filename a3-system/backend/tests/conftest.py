"""
Shared pytest fixtures and path setup.

Ensures ``backend/`` is on ``sys.path`` so tests can do
``from agents.path_planner import ...`` without needing to install
the backend as a package.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Add backend/ to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Set lightweight env defaults so importing modules that touch settings
# (llm_client, faithfulness_checker, etc.) never crashes during tests.
os.environ.setdefault("OPENROUTER_API_KEY", "test-key-not-used")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
os.environ.setdefault("WEAVIATE_URL", "http://localhost:8080")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("ENVIRONMENT", "testing")

import pytest  # noqa: E402


# ---------------------------------------------------------------------------
# Knowledge graph fixture — a small, deterministic graph for planner tests
# ---------------------------------------------------------------------------

SYNTHETIC_GRAPH = {
    "nodes": [
        # Entry-level (no prereqs)
        {
            "node_id": "N01",
            "title": "Cloud Computing Basics",
            "difficulty": 0.2,
            "est_minutes": 30,
            "hard_prerequisites": [],
            "soft_prerequisites": [],
            "topic_tags": ["cloud", "intro"],
            "content_types": ["text", "video"],
            "pagerank_score": 0.95,
        },
        {
            "node_id": "N02",
            "title": "Virtualization",
            "difficulty": 0.3,
            "est_minutes": 45,
            "hard_prerequisites": ["N01"],
            "topic_tags": ["virtualization"],
            "content_types": ["text", "diagram"],
            "pagerank_score": 0.80,
        },
        {
            "node_id": "N03",
            "title": "Docker",
            "difficulty": 0.5,
            "est_minutes": 60,
            "hard_prerequisites": ["N02"],
            "topic_tags": ["docker", "containers"],
            "content_types": ["video", "code"],
            "pagerank_score": 0.65,
        },
        {
            "node_id": "N04",
            "title": "Kubernetes",
            "difficulty": 0.7,
            "est_minutes": 90,
            "hard_prerequisites": ["N03"],
            "topic_tags": ["k8s", "orchestration"],
            "content_types": ["video", "code", "diagram"],
            "pagerank_score": 0.45,
        },
        {
            "node_id": "N05",
            "title": "IaaS",
            "difficulty": 0.4,
            "est_minutes": 50,
            "hard_prerequisites": ["N01"],
            "topic_tags": ["iaas", "service-models"],
            "content_types": ["text"],
            "pagerank_score": 0.70,
        },
        {
            "node_id": "N06",
            "title": "Microservices",
            "difficulty": 0.8,
            "est_minutes": 75,
            "hard_prerequisites": ["N03", "N05"],
            "topic_tags": ["microservices"],
            "content_types": ["text", "code", "diagram"],
            "pagerank_score": 0.30,
        },
    ],
    "edges": [
        {"source": "N01", "target": "N02", "type": "hard"},
        {"source": "N02", "target": "N03", "type": "hard"},
        {"source": "N03", "target": "N04", "type": "hard"},
        {"source": "N01", "target": "N05", "type": "hard"},
        {"source": "N03", "target": "N06", "type": "hard"},
        {"source": "N05", "target": "N06", "type": "hard"},
    ],
}


@pytest.fixture
def synthetic_graph_file(tmp_path):
    """Write the synthetic graph to a temp JSON file and return its path."""
    import json

    graph_path = tmp_path / "test_graph.json"
    graph_path.write_text(json.dumps(SYNTHETIC_GRAPH), encoding="utf-8")
    return str(graph_path)


@pytest.fixture
def synthetic_graph(synthetic_graph_file):
    """Loaded `KnowledgeGraph` instance using the synthetic graph."""
    from agents.path_planner import KnowledgeGraph

    return KnowledgeGraph(graph_path=synthetic_graph_file)


@pytest.fixture
def beginner_profile():
    """A complete-beginner student state."""
    from agents.path_planner import StudentState

    return StudentState(
        student_id="test_beginner",
        knowledge_base={},
        cognitive_style="visual",
        weak_points=[],
        goals=[],
        learning_pace=0.4,
        content_preferences=["video", "diagram"],
    )


@pytest.fixture
def expert_profile():
    """A student who already knows the basics + virtualization."""
    from agents.path_planner import StudentState

    return StudentState(
        student_id="test_expert",
        knowledge_base={"N01": 0.9, "N02": 0.85},
        cognitive_style="kinetic",
        weak_points=[],
        goals=["Kubernetes"],
        learning_pace=0.85,
        content_preferences=["code"],
    )
