"""Unit tests for EvaluatorAgent's deterministic decision logic.

Covers ``_determine_outcome``, ``_analyze_concepts_locally`` and
``_generate_student_message`` — the parts that don't call the LLM.
"""

import pytest

from agents.evaluator_agent import EvaluatorAgent


@pytest.fixture
def agent():
    return EvaluatorAgent()


# ---------------- _determine_outcome ----------------

def test_accelerate_when_high_score_and_fast(agent):
    outcome, unlocked, _reason = agent._determine_outcome(
        score_pct=0.92, time_taken=100, expected_time=120,
        consecutive_low=0, rushed=False,
    )
    assert outcome == "accelerate"
    assert unlocked is True


def test_accelerate_blocked_when_too_slow(agent):
    # high score but slow → just continue
    outcome, _u, _r = agent._determine_outcome(
        score_pct=0.92, time_taken=200, expected_time=120,
        consecutive_low=0, rushed=False,
    )
    assert outcome == "continue"


def test_continue_at_60_threshold(agent):
    outcome, unlocked, _r = agent._determine_outcome(
        score_pct=0.60, time_taken=100, expected_time=120,
        consecutive_low=0, rushed=False,
    )
    assert outcome == "continue"
    assert unlocked is True


def test_remediate_below_60(agent):
    outcome, unlocked, _r = agent._determine_outcome(
        score_pct=0.40, time_taken=100, expected_time=120,
        consecutive_low=1, rushed=False,
    )
    assert outcome == "remediate"
    assert unlocked is False


def test_replan_after_three_consecutive_lows(agent):
    outcome, unlocked, _r = agent._determine_outcome(
        score_pct=0.40, time_taken=100, expected_time=120,
        consecutive_low=3, rushed=False,
    )
    assert outcome == "replan"
    assert unlocked is False


def test_rushed_through_overrides_to_remediate_when_below_70(agent):
    outcome, unlocked, _r = agent._determine_outcome(
        score_pct=0.65, time_taken=10, expected_time=120,
        consecutive_low=0, rushed=True,
    )
    assert outcome == "remediate"
    assert unlocked is False


def test_rushed_does_not_override_high_score(agent):
    # If they got 90% even rushing, accelerate / continue should still apply
    outcome, _u, _r = agent._determine_outcome(
        score_pct=0.90, time_taken=10, expected_time=120,
        consecutive_low=0, rushed=True,
    )
    assert outcome in {"accelerate", "continue"}


# ---------------- _analyze_concepts_locally ----------------

def test_analyze_marks_repeated_wrong_concept_critical(agent):
    answers = [
        {"is_correct": False, "concept_tag": "iam_roles", "time_spent_seconds": 30},
        {"is_correct": False, "concept_tag": "iam_roles", "time_spent_seconds": 25},
        {"is_correct": True,  "concept_tag": "ec2"},
    ]
    out = agent._analyze_concepts_locally(answers)
    assert len(out) == 1
    assert out[0]["concept_tag"] == "iam_roles"
    assert out[0]["wrong_count"] == 2
    assert out[0]["severity"] == "critical"


def test_analyze_fast_wrong_marked_minor(agent):
    answers = [
        {"is_correct": False, "concept_tag": "vpc", "time_spent_seconds": 3},
    ]
    out = agent._analyze_concepts_locally(answers)
    assert out[0]["severity"] == "minor"
    assert out[0]["likely_cause"] == "careless_error"


def test_analyze_skips_correct_answers(agent):
    answers = [
        {"is_correct": True, "concept_tag": "x"},
        {"is_correct": True, "concept_tag": "y"},
    ]
    assert agent._analyze_concepts_locally(answers) == []


# ---------------- _generate_student_message ----------------

@pytest.mark.parametrize("outcome,expected_tone", [
    ("accelerate", "encouraging"),
    ("continue",   "neutral"),
    ("remediate",  "encouraging"),
    ("replan",     "urgent"),
])
def test_student_message_tone(agent, outcome, expected_tone):
    msg = agent._generate_student_message(outcome, 0.7, concept_count=2)
    assert msg["tone"] == expected_tone
    assert isinstance(msg["message"], str)
    assert len(msg["message"]) > 0


def test_student_message_remediate_singular_vs_plural(agent):
    one = agent._generate_student_message("remediate", 0.5, concept_count=1)
    many = agent._generate_student_message("remediate", 0.5, concept_count=3)
    assert one["message"] != many["message"]


# ---------------- evaluate() end-to-end with LLM disabled ----------------

@pytest.mark.asyncio
async def test_evaluate_falls_back_to_local_when_llm_fails(monkeypatch, agent):
    async def _boom(*_a, **_k):
        raise RuntimeError("no network")

    monkeypatch.setattr(agent.llm, "generate", _boom)

    result = await agent.evaluate(
        student_id="s1", milestone_id="m1", quiz_id="q1",
        answers=[
            {"is_correct": False, "concept_tag": "iam", "time_spent_seconds": 25},
            {"is_correct": True,  "concept_tag": "ec2"},
        ],
        score_percentage=0.55,
        time_taken_seconds=300,
        expected_time_seconds=300,
        consecutive_low_scores=1,
        rushed_through=False,
        resource_engagement={
            "notes":   {"completion": 0.9},
            "video":   {"completion": 0.5},
            "code":    {"completion": 0.2},
            "mindmap": {"completion": 0.7},
        },
    )

    assert result["score_percentage"] == 0.55
    assert result["decision"]["outcome"] == "remediate"
    assert result["regeneration_instructions"]["should_regenerate"] is True
    assert "code" in result["regeneration_instructions"]["format_instructions"]["avoid_formats"]
    assert "iam" in result["regeneration_instructions"]["target_concepts"]
