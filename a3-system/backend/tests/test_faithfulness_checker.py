"""Tests for the async ``check_faithfulness`` flow and prompt construction.

Pure parsing logic is already covered by ``test_faithfulness_parser.py`` —
this file targets the orchestration layer: feature flag, no-source
short-circuit, threshold warning, LLM error handling, and the prompt body.
"""

from __future__ import annotations

import json

import pytest

from core.faithfulness_checker import FaithfulnessChecker, FaithfulnessResult


@pytest.fixture
def checker():
    return FaithfulnessChecker()


# ---------------- short-circuits ----------------

@pytest.mark.asyncio
async def test_returns_perfect_score_when_disabled(monkeypatch, checker):
    monkeypatch.setattr(checker, "enabled", False)
    out = await checker.check_faithfulness(
        generated_text="The sky is green.",
        source_chunks=[{"id": "c1", "text": "blue sky"}],
    )
    assert isinstance(out, FaithfulnessResult)
    assert out.score == 1.0
    assert out.total_claims == 0


@pytest.mark.asyncio
async def test_returns_perfect_score_when_no_sources(checker):
    out = await checker.check_faithfulness(
        generated_text="Anything.",
        source_chunks=[],
    )
    assert out.score == 1.0
    assert out.total_claims == 0


# ---------------- threshold warning ----------------

@pytest.mark.asyncio
async def test_low_score_attaches_warning_message(monkeypatch, checker):
    async def _fake_generate(messages, temperature, max_tokens):
        body = {
            "claims": [
                {"claim": "x", "status": "supported"},
                {"claim": "y", "status": "unverifiable"},
                {"claim": "z", "status": "unverifiable"},
            ],
            "citations_found": [],
        }
        return {"choices": [{"message": {"content": json.dumps(body)}}]}

    monkeypatch.setattr(checker.llm, "generate", _fake_generate)

    out = await checker.check_faithfulness(
        generated_text="anything",
        source_chunks=[{"id": "c1", "text": "source"}],
    )
    assert out.score == pytest.approx(1 / 3)
    assert out.warning_message is not None
    assert "unverified" in out.warning_message.lower()


@pytest.mark.asyncio
async def test_high_score_has_no_warning(monkeypatch, checker):
    async def _fake_generate(messages, temperature, max_tokens):
        body = {"claims": [{"claim": "x", "status": "supported"}]}
        return {"choices": [{"message": {"content": json.dumps(body)}}]}

    monkeypatch.setattr(checker.llm, "generate", _fake_generate)

    out = await checker.check_faithfulness(
        generated_text="anything",
        source_chunks=[{"id": "c1", "text": "source"}],
    )
    assert out.score == 1.0
    assert out.warning_message is None


# ---------------- LLM error handling ----------------

@pytest.mark.asyncio
async def test_llm_exception_returns_permissive_score(monkeypatch, checker):
    async def _boom(*_a, **_k):
        raise RuntimeError("network down")

    monkeypatch.setattr(checker.llm, "generate", _boom)

    out = await checker.check_faithfulness(
        generated_text="anything",
        source_chunks=[{"id": "c1", "text": "source"}],
    )
    # Permissive fallback on infrastructure failure
    assert out.score == 1.0
    assert "Unable to verify" in (out.warning_message or "")


@pytest.mark.asyncio
async def test_malformed_llm_response_returns_permissive(monkeypatch, checker):
    async def _fake_generate(messages, temperature, max_tokens):
        return {"choices": [{"message": {}}]}  # no content

    monkeypatch.setattr(checker.llm, "generate", _fake_generate)

    out = await checker.check_faithfulness(
        generated_text="anything",
        source_chunks=[{"id": "c1", "text": "source"}],
    )
    assert out.score == 1.0


# ---------------- prompt construction ----------------

def test_verification_prompt_includes_sources_and_text(checker):
    prompt = checker._build_verification_prompt(
        generated_text="The sky is blue.",
        source_chunks=[
            {"id": "alpha", "text": "Sky appears blue due to scattering."},
            {"id": "beta", "text": "Other text."},
        ],
        context="Atmospheric Science",
    )
    assert "[Source: alpha]" in prompt
    assert "[Source: beta]" in prompt
    assert "The sky is blue." in prompt
    assert "Atmospheric Science" in prompt
    assert "supported" in prompt and "unverifiable" in prompt


def test_verification_prompt_omits_context_when_none(checker):
    prompt = checker._build_verification_prompt(
        generated_text="x",
        source_chunks=[{"id": "c1", "text": "y"}],
        context=None,
    )
    assert not prompt.startswith("Context:")
