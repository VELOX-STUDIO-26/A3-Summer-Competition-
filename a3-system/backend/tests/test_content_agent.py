"""End-to-end tests for ContentAgent.run with mocked LLM/RAG/faithfulness.

We don't make real network calls — vector store, LLM and faithfulness
checker are all monkey-patched. The goal is to lock in the agent's
contract: empty-content failure path, low-faithfulness warning prepend,
metadata shape, and weak-point handling.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

import pytest

from agents import content_agent as content_module
from agents.content_agent import ContentAgent
from core import faithfulness_checker as fc_module


# ---------------- shared fakes ----------------

@dataclass
class _FakeFaithResult:
    score: float = 1.0
    total_claims: int = 1
    supported_count: int = 1
    contradicted_count: int = 0
    unverifiable_count: int = 0
    citations: List[str] = None
    warning_message: str = None

    def __post_init__(self):
        if self.citations is None:
            self.citations = []


class _FakeLLM:
    """Plain object with an async ``generate`` attached as a function (not a
    bound method) so that callers passing ``messages=`` don't collide with
    an implicit ``self``."""


def _make_llm(content: str, finish_reason: str = "stop"):
    async def _gen(messages, temperature, max_tokens):
        return {
            "choices": [
                {"message": {"content": content}, "finish_reason": finish_reason}
            ]
        }
    obj = _FakeLLM()
    obj.generate = _gen
    return obj


@pytest.fixture
def agent(monkeypatch):
    a = ContentAgent()

    # Stub RAG retrieval so it never touches the vector store
    async def _no_chunks(self, topic, node_id=""):
        return []

    monkeypatch.setattr(ContentAgent, "_retrieve_chunks", _no_chunks)
    return a


@pytest.fixture
def faith_ok(monkeypatch):
    """Faithfulness check returns a perfect score with no warning."""
    async def _ok(generated_text, source_chunks, context=None):
        return _FakeFaithResult(score=1.0, warning_message=None)

    monkeypatch.setattr(fc_module.faithfulness_checker, "check_faithfulness", _ok)


@pytest.fixture
def faith_low(monkeypatch):
    """Faithfulness check returns a low score with a warning."""
    async def _low(generated_text, source_chunks, context=None):
        return _FakeFaithResult(
            score=0.3,
            supported_count=1,
            unverifiable_count=2,
            total_claims=3,
            warning_message="This content may contain unverified information.",
        )

    monkeypatch.setattr(fc_module.faithfulness_checker, "check_faithfulness", _low)


# ---------------- happy path ----------------

@pytest.mark.asyncio
async def test_run_returns_markdown_payload(agent, faith_ok, monkeypatch):
    body = "# Docker\n\n## 1. Overview\n\nDocker is a tool."
    monkeypatch.setattr(agent, "llm", _make_llm(body))

    out = await agent.run(
        topic="Docker",
        profile={"cognitive_style": "visual"},
    )

    assert out["format"] == "markdown"
    assert out["content"] == body
    assert out["metadata"]["agent"] == "content"
    assert out["metadata"]["topic"] == "Docker"
    assert out["metadata"]["word_count"] == len(body.split())
    assert out["faithfulness"]["verified"] is True
    assert "error" not in out["metadata"]


@pytest.mark.asyncio
async def test_run_prepends_warning_on_low_faithfulness(agent, faith_low, monkeypatch):
    body = "# Topic\n\nA claim."
    monkeypatch.setattr(agent, "llm", _make_llm(body))

    out = await agent.run(topic="Topic", profile={})
    assert out["content"].startswith("⚠️")
    assert "unverified" in out["content"].lower()
    assert out["faithfulness"]["verified"] is False


# ---------------- failure paths ----------------

@pytest.mark.asyncio
async def test_run_returns_error_payload_when_llm_returns_empty(agent, faith_ok, monkeypatch):
    monkeypatch.setattr(agent, "llm", _make_llm("   \n  "))

    out = await agent.run(topic="Docker", profile={})
    assert "error" in out["metadata"]
    assert out["faithfulness"]["score"] == 0.0
    assert out["faithfulness"]["verified"] is False
    assert out["sources"] == []


@pytest.mark.asyncio
async def test_run_returns_error_payload_when_llm_raises(agent, faith_ok, monkeypatch):
    class _BadLLM:
        async def generate(self, *_a, **_k):
            raise RuntimeError("upstream timeout")

    monkeypatch.setattr(agent, "llm", _BadLLM())

    out = await agent.run(topic="Docker", profile={})
    assert "Error generating content" in out["content"]
    assert out["metadata"]["error"] == "upstream timeout"


# ---------------- profile handling ----------------

@pytest.mark.asyncio
async def test_run_handles_non_dict_knowledge_base(agent, faith_ok, monkeypatch):
    body = "# Topic\n\nText."
    monkeypatch.setattr(agent, "llm", _make_llm(body))

    out = await agent.run(
        topic="Docker",
        profile={"knowledge_base": "not-a-dict"},
    )
    assert out["metadata"]["mastery_level"] == 0.0


@pytest.mark.asyncio
async def test_run_uses_topic_mastery_in_metadata(agent, faith_ok, monkeypatch):
    body = "# Docker\n\nText."
    monkeypatch.setattr(agent, "llm", _make_llm(body))

    out = await agent.run(
        topic="Docker",
        profile={"knowledge_base": {"docker": 0.6}},
    )
    assert out["metadata"]["mastery_level"] == 0.6
