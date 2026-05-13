"""Tests for CodeAgent helpers and run() with mocked deps.

Pure helpers (`_ensure_three_exercises`, `_generate_fallback_bugs`,
`_generate_fallback_exercise`, `_generate_fallback_response`) are tested
directly. ``run()`` is tested with monkeypatched LLM/RAG/faithfulness for
the mastery-driven difficulty selection and JSON salvage paths.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import List

import pytest

from agents.code_agent import CodeAgent
from core import faithfulness_checker as fc_module


# ---------------- direct helpers ----------------

@pytest.fixture
def agent(monkeypatch):
    a = CodeAgent()

    async def _no_chunks(self, topic, node_id=""):
        return []

    monkeypatch.setattr(CodeAgent, "_retrieve_chunks", _no_chunks)
    return a


def test_ensure_three_exercises_pads_missing_tiers(agent):
    given = [{"tier": "guided", "name": "G", "problem": "p"}]
    out = agent._ensure_three_exercises(given, "Docker", "python")
    assert [e["tier"] for e in out] == ["guided", "practice", "challenge"]
    # original is preserved
    assert out[0] is given[0]


def test_ensure_three_exercises_full_input_passthrough(agent):
    given = [
        {"tier": "guided"},
        {"tier": "practice"},
        {"tier": "challenge"},
    ]
    out = agent._ensure_three_exercises(given, "Docker", "python")
    assert out == given


def test_fallback_exercise_has_required_fields(agent):
    ex = agent._generate_fallback_exercise("guided", "Guided", "Docker", "python", 0)
    for k in ("tier", "name", "problem", "starter_code", "solution",
              "pseudocode", "visual_steps", "test_cases", "hints",
              "time_complexity", "space_complexity"):
        assert k in ex
    assert len(ex["hints"]) == 3
    assert len(ex["test_cases"]) == 1  # guided gets 1 test case


def test_fallback_exercise_test_case_count_scales_by_tier(agent):
    g = agent._generate_fallback_exercise("guided", "G", "Docker", "python", 0)
    p = agent._generate_fallback_exercise("practice", "P", "Docker", "python", 1)
    c = agent._generate_fallback_exercise("challenge", "C", "Docker", "python", 2)
    assert len(g["test_cases"]) == 1
    assert len(p["test_cases"]) == 2
    assert len(c["test_cases"]) == 3


def test_fallback_bugs_returns_two_items(agent):
    bugs = agent._generate_fallback_bugs("Docker", "python")
    assert len(bugs) == 2
    for b in bugs:
        assert {"bug_name", "buggy_code", "explanation", "fix",
                "prevention_tip"} <= set(b)


def test_fallback_response_shape(agent):
    out = agent._generate_fallback_response(
        topic="Docker", language="python", difficulty="beginner",
        mastery=0.1, is_weak_point=True,
    )
    assert out["format"] == "code_exercise"
    assert out["metadata"]["fallback"] is True
    assert out["metadata"]["is_weak_point"] is True
    assert len(out["exercises"]) == 3
    assert len(out["common_bugs"]) == 2
    assert len(out["key_takeaways"]) == 3


# ---------------- run() with mocks ----------------

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


@pytest.fixture
def faith_ok(monkeypatch):
    async def _ok(generated_text, source_chunks, context=None):
        return _FakeFaithResult()
    monkeypatch.setattr(fc_module.faithfulness_checker, "check_faithfulness", _ok)


_VALID_CODE_JSON = {
    "language": "python",
    "difficulty": "intermediate",
    "real_world_scenario": "scenario",
    "learning_objectives": ["a", "b", "c"],
    "exercises": [
        {"tier": "guided", "name": "G", "problem": "p"},
        {"tier": "practice", "name": "P", "problem": "p"},
        {"tier": "challenge", "name": "C", "problem": "p"},
    ],
    "common_bugs": [
        {"bug_name": "b1", "buggy_code": "x", "explanation": "e",
         "fix": "f", "prevention_tip": "t"},
        {"bug_name": "b2", "buggy_code": "x", "explanation": "e",
         "fix": "f", "prevention_tip": "t"},
    ],
    "complexity_analysis": {
        "time_complexity": "O(n)",
        "space_complexity": "O(1)",
        "why_it_matters": "scaling",
    },
    "key_takeaways": ["t1", "t2", "t3"],
}


@pytest.mark.asyncio
async def test_run_parses_valid_json_payload(agent, faith_ok, monkeypatch):
    monkeypatch.setattr(agent, "llm", _make_llm(json.dumps(_VALID_CODE_JSON)))
    out = await agent.run(topic="Docker", profile={})
    assert out["format"] == "code_exercise"
    assert len(out["exercises"]) == 3
    assert out["metadata"]["num_exercises"] == 3
    assert "fallback" not in out["metadata"]


@pytest.mark.asyncio
async def test_run_pads_exercises_when_only_one_returned(agent, faith_ok, monkeypatch):
    partial = dict(_VALID_CODE_JSON)
    partial["exercises"] = [{"tier": "guided", "name": "G", "problem": "p"}]
    monkeypatch.setattr(agent, "llm", _make_llm(json.dumps(partial)))
    out = await agent.run(topic="Docker", profile={})
    assert len(out["exercises"]) == 3
    assert [e["tier"] for e in out["exercises"]] == ["guided", "practice", "challenge"]


@pytest.mark.asyncio
async def test_difficulty_scales_with_mastery(agent, faith_ok, monkeypatch):
    monkeypatch.setattr(agent, "llm", _make_llm(json.dumps(_VALID_CODE_JSON)))

    low = await agent.run(topic="Docker", profile={"knowledge_base": {"docker": 0.1}})
    high = await agent.run(topic="Docker", profile={"knowledge_base": {"docker": 0.85}})

    assert low["metadata"]["difficulty"] == "beginner"
    assert high["metadata"]["difficulty"] == "advanced"


@pytest.mark.asyncio
async def test_fast_pace_bumps_difficulty(agent, faith_ok, monkeypatch):
    monkeypatch.setattr(agent, "llm", _make_llm(json.dumps(_VALID_CODE_JSON)))
    out = await agent.run(
        topic="Docker",
        profile={"knowledge_base": {"docker": 0.1}, "learning_pace": 0.95},
    )
    # mastery=0.1 -> beginner, but pace>0.8 bumps to intermediate
    assert out["metadata"]["difficulty"] == "intermediate"


@pytest.mark.asyncio
async def test_run_falls_back_on_unparseable_response(agent, faith_ok, monkeypatch):
    monkeypatch.setattr(agent, "llm", _make_llm("definitely not json"))
    out = await agent.run(topic="Docker", profile={})
    assert out["metadata"].get("fallback") is True
    assert len(out["exercises"]) == 3


@pytest.mark.asyncio
async def test_run_falls_back_on_llm_exception(agent, faith_ok, monkeypatch):
    class _BadLLM:
        async def generate(self, *_a, **_k):
            raise RuntimeError("upstream timeout")

    monkeypatch.setattr(agent, "llm", _BadLLM())
    out = await agent.run(topic="Docker", profile={})
    assert out["metadata"].get("fallback") is True
