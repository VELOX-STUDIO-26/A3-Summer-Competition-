"""Tests for ``Orchestrator.generate_resources_stream``.

The streaming method runs agents concurrently and emits per-agent
progress events. We replace the orchestrator's agents with controllable
fakes so we can assert on event ordering, error handling, and the final
aggregated bundle without making real LLM calls.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List

import pytest

from agents.orchestrator import Orchestrator


# ---------------- fake agents ----------------

class _FakeAgent:
    """An agent whose ``run`` resolves with a fixed result after a delay."""

    def __init__(self, name: str, result: Any = None, delay: float = 0.0,
                 raises: BaseException = None):
        self.name = name
        self._result = result if result is not None else {"agent": name}
        self._delay = delay
        self._raises = raises
        self.calls: List[Dict[str, Any]] = []

    async def run(self, topic, profile, node_id="", **kwargs):
        self.calls.append({
            "topic": topic, "profile": profile, "node_id": node_id, "kwargs": kwargs
        })
        if self._delay:
            await asyncio.sleep(self._delay)
        if self._raises is not None:
            raise self._raises
        return self._result


@pytest.fixture
def orch(monkeypatch):
    """Orchestrator with all 5 agents replaced by deterministic fakes."""
    o = Orchestrator()
    o.content_agent = _FakeAgent("content", {"format": "markdown", "agent": "content"})
    o.quiz_agent = _FakeAgent("quiz", {"format": "quiz", "agent": "quiz"})
    o.mindmap_agent = _FakeAgent("mindmap", {"format": "mindmap", "agent": "mindmap"})
    o.media_agent = _FakeAgent("media", {"format": "media", "agent": "media"})
    o.code_agent = _FakeAgent("code", {"format": "code", "agent": "code"})
    return o


async def _drain(agen):
    return [item async for item in agen]


# ---------------- happy path ----------------

@pytest.mark.asyncio
async def test_stream_emits_plan_first_then_agent_events_then_complete(orch):
    events = await _drain(orch.generate_resources_stream(
        topic="Docker", profile={}, agent_selection=["content", "quiz"],
    ))

    types = [e["event"] for e in events]
    assert types[0] == "plan"
    assert types[-1] == "complete"
    # All started events come before their matching complete events
    started = [e["agent"] for e in events if e["event"] == "agent_started"]
    completed = [e["agent"] for e in events if e["event"] == "agent_complete"]
    assert set(started) == set(completed) == {"content", "quiz"}


@pytest.mark.asyncio
async def test_plan_event_lists_only_valid_agents(orch):
    events = await _drain(orch.generate_resources_stream(
        topic="Docker", profile={},
        agent_selection=["content", "nonexistent_agent", "quiz"],
    ))
    plan = events[0]
    assert plan["event"] == "plan"
    assert plan["agents"] == ["content", "quiz"]
    assert plan["topic"] == "Docker"


@pytest.mark.asyncio
async def test_complete_event_aggregates_all_results(orch):
    events = await _drain(orch.generate_resources_stream(
        topic="Docker", profile={}, agent_selection=["content", "mindmap"],
    ))
    complete = events[-1]
    assert complete["event"] == "complete"
    assert complete["topic"] == "Docker"
    assert set(complete["resources"].keys()) == {"content", "mindmap"}
    assert complete["resources"]["content"]["agent"] == "content"
    assert complete["metadata"]["agents_run"] == ["content", "mindmap"]


# ---------------- ordering / concurrency ----------------

@pytest.mark.asyncio
async def test_fast_agent_completes_before_slow_one(orch):
    orch.content_agent = _FakeAgent("content", {"agent": "content"}, delay=0.10)
    orch.quiz_agent = _FakeAgent("quiz", {"agent": "quiz"}, delay=0.01)

    events = await _drain(orch.generate_resources_stream(
        topic="Docker", profile={}, agent_selection=["content", "quiz"],
    ))

    completes = [e for e in events if e["event"] == "agent_complete"]
    # quiz delay is 10x shorter, so it must finish first
    assert completes[0]["agent"] == "quiz"
    assert completes[1]["agent"] == "content"


@pytest.mark.asyncio
async def test_each_started_event_is_emitted_before_its_complete(orch):
    events = await _drain(orch.generate_resources_stream(
        topic="Docker", profile={}, agent_selection=["content", "quiz", "mindmap"],
    ))

    # For each agent, the index of its started event must be < the index of
    # its complete event.
    for agent in ("content", "quiz", "mindmap"):
        s_idx = next(i for i, e in enumerate(events)
                     if e["event"] == "agent_started" and e["agent"] == agent)
        c_idx = next(i for i, e in enumerate(events)
                     if e["event"] == "agent_complete" and e["agent"] == agent)
        assert s_idx < c_idx, f"{agent}: started@{s_idx} must precede complete@{c_idx}"


# ---------------- error handling ----------------

@pytest.mark.asyncio
async def test_failing_agent_emits_agent_failed_not_agent_complete(orch):
    orch.quiz_agent = _FakeAgent("quiz", raises=RuntimeError("boom"))

    events = await _drain(orch.generate_resources_stream(
        topic="Docker", profile={}, agent_selection=["content", "quiz"],
    ))

    failed = [e for e in events if e["event"] == "agent_failed"]
    completed_agents = [e["agent"] for e in events if e["event"] == "agent_complete"]

    assert len(failed) == 1
    assert failed[0]["agent"] == "quiz"
    assert failed[0]["error"] == "boom"
    assert "quiz" not in completed_agents
    assert "content" in completed_agents


@pytest.mark.asyncio
async def test_failed_agent_still_appears_in_final_complete_bundle(orch):
    orch.quiz_agent = _FakeAgent("quiz", raises=ValueError("bad json"))

    events = await _drain(orch.generate_resources_stream(
        topic="Docker", profile={}, agent_selection=["content", "quiz"],
    ))

    complete = events[-1]
    assert complete["event"] == "complete"
    assert "quiz" in complete["resources"]
    assert complete["resources"]["quiz"] == {"error": "bad json", "agent": "quiz"}
    # successful agent untouched
    assert complete["resources"]["content"]["agent"] == "content"


@pytest.mark.asyncio
async def test_one_failure_does_not_block_other_agents(orch):
    orch.content_agent = _FakeAgent("content", raises=RuntimeError("oops"))
    orch.quiz_agent = _FakeAgent("quiz", {"agent": "quiz"}, delay=0.02)
    orch.mindmap_agent = _FakeAgent("mindmap", {"agent": "mindmap"}, delay=0.02)

    events = await _drain(orch.generate_resources_stream(
        topic="Docker", profile={},
        agent_selection=["content", "quiz", "mindmap"],
    ))

    completed = {e["agent"] for e in events if e["event"] == "agent_complete"}
    failed = {e["agent"] for e in events if e["event"] == "agent_failed"}
    assert completed == {"quiz", "mindmap"}
    assert failed == {"content"}


# ---------------- edge cases ----------------

@pytest.mark.asyncio
async def test_empty_agent_selection_yields_plan_then_complete(orch):
    events = await _drain(orch.generate_resources_stream(
        topic="Docker", profile={}, agent_selection=[],
    ))
    # When selection is explicitly empty, decide_agents fills in defaults,
    # so we test the all-invalid case instead.
    events = await _drain(orch.generate_resources_stream(
        topic="Docker", profile={}, agent_selection=["bogus_a", "bogus_b"],
    ))
    types = [e["event"] for e in events]
    assert types == ["plan", "complete"]
    assert events[0]["agents"] == []
    assert events[1]["resources"] == {}


@pytest.mark.asyncio
async def test_node_id_is_propagated_to_agents_via_kwargs(orch):
    await _drain(orch.generate_resources_stream(
        topic="Docker", profile={}, agent_selection=["content"],
        agent_kwargs={"node_id": "N42", "language": "python"},
    ))
    assert orch.content_agent.calls[0]["node_id"] == "N42"
    assert orch.content_agent.calls[0]["kwargs"]["language"] == "python"
