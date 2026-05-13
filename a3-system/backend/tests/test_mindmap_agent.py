"""End-to-end tests for MindMapAgent.run with mocked deps.

Focus: JSON parsing fallback (regex-extract from surrounding prose),
mastery/weak-point annotation onto returned nodes, and the 21-node
fallback structure when the LLM raises.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import List

import pytest

from agents.mindmap_agent import MindMapAgent
from core import faithfulness_checker as fc_module


@dataclass
class _FakeFaithResult:
    score: float = 1.0
    total_claims: int = 0
    supported_count: int = 0
    contradicted_count: int = 0
    unverifiable_count: int = 0
    citations: List[str] = field(default_factory=list)
    warning_message: str = None


class _FakeLLM:
    pass


def _make_llm(content: str):
    async def _gen(messages, temperature, max_tokens):
        return {"choices": [{"message": {"content": content}}]}
    obj = _FakeLLM()
    obj.generate = _gen
    return obj


_VALID_MINDMAP = {
    "nodes": [
        {"id": "root", "label": "Docker Containers", "level": 0,
         "description": "Lightweight virtualization", "importance": "core"},
        {"id": "n1", "label": "Images", "level": 1,
         "description": "Snapshots", "importance": "core"},
        {"id": "n1a", "label": "Layers", "level": 2,
         "description": "Stacked filesystem", "importance": "core",
         "difficulty": "beginner"},
    ],
    "edges": [{"from": "root", "to": "n1", "label": "contains"}],
    "description": "Docker basics",
    "difficulty_distribution": {"beginner": 1, "intermediate": 0, "advanced": 0},
}


@pytest.fixture
def agent(monkeypatch):
    a = MindMapAgent()

    async def _no_chunks(self, topic, node_id=""):
        return []

    monkeypatch.setattr(MindMapAgent, "_retrieve_chunks", _no_chunks)

    async def _faith_ok(generated_text, source_chunks, context=None):
        return _FakeFaithResult()

    monkeypatch.setattr(fc_module.faithfulness_checker, "check_faithfulness", _faith_ok)
    return a


# ---------------- happy path ----------------

@pytest.mark.asyncio
async def test_run_parses_valid_json(agent, monkeypatch):
    monkeypatch.setattr(agent, "llm", _make_llm(json.dumps(_VALID_MINDMAP)))

    out = await agent.run(topic="Docker Containers", profile={})

    assert out["format"] == "mindmap"
    assert len(out["nodes"]) == 3
    assert len(out["edges"]) == 1
    assert out["metadata"]["num_nodes"] == 3
    assert out["metadata"]["topic"] == "Docker Containers"
    assert "is_fallback" not in out["metadata"]


# ---------------- JSON salvage ----------------

@pytest.mark.asyncio
async def test_run_extracts_json_from_surrounding_prose(agent, monkeypatch):
    wrapped = f"Sure! Here is your mind map:\n```json\n{json.dumps(_VALID_MINDMAP)}\n```\nLet me know."
    monkeypatch.setattr(agent, "llm", _make_llm(wrapped))

    out = await agent.run(topic="Docker", profile={})
    assert len(out["nodes"]) == 3
    assert "is_fallback" not in out["metadata"]


# ---------------- annotation ----------------

@pytest.mark.asyncio
async def test_nodes_annotated_with_mastery_and_weak_points(agent, monkeypatch):
    monkeypatch.setattr(agent, "llm", _make_llm(json.dumps(_VALID_MINDMAP)))

    out = await agent.run(
        topic="Docker Containers",
        profile={
            "knowledge_base": {"images": 0.7},
            "weak_points": ["layers"],
        },
    )

    images_node = next(n for n in out["nodes"] if n["id"] == "n1")
    assert images_node["mastery"] == 0.7

    layers_node = next(n for n in out["nodes"] if n["id"] == "n1a")
    assert layers_node["is_weak_point"] is True


@pytest.mark.asyncio
async def test_unrelated_nodes_get_zero_mastery(agent, monkeypatch):
    monkeypatch.setattr(agent, "llm", _make_llm(json.dumps(_VALID_MINDMAP)))

    out = await agent.run(
        topic="Docker",
        profile={"knowledge_base": {"unrelated_topic": 0.5}},
    )
    for node in out["nodes"]:
        assert node["mastery"] == 0.0
        assert node["is_weak_point"] is False


# ---------------- fallback ----------------

@pytest.mark.asyncio
async def test_invalid_json_triggers_fallback_structure(agent, monkeypatch):
    monkeypatch.setattr(agent, "llm", _make_llm("totally not json"))

    out = await agent.run(topic="Docker", profile={})

    assert out["metadata"].get("is_fallback") is True
    # 1 root + 5 branches + 15 leaves = 21
    assert len(out["nodes"]) == 21
    assert sum(1 for n in out["nodes"] if n["level"] == 0) == 1
    assert sum(1 for n in out["nodes"] if n["level"] == 1) == 5
    assert sum(1 for n in out["nodes"] if n["level"] == 2) == 15


@pytest.mark.asyncio
async def test_llm_exception_triggers_fallback(agent, monkeypatch):
    class _BadLLM:
        async def generate(self, *_a, **_k):
            raise RuntimeError("rate limit")

    monkeypatch.setattr(agent, "llm", _BadLLM())
    out = await agent.run(topic="Docker", profile={})
    assert out["metadata"].get("is_fallback") is True
    assert out["metadata"]["error"] == "rate limit"
