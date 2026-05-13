"""Unit tests for QuizAgent's pure logic helpers.

We don't test ``run()`` directly here (it requires a live LLM and vector
store) — we cover the deterministic helpers that drive question selection,
difficulty calibration, validation and fallback construction.
"""

import pytest

from agents.quiz_agent import (
    COMPLEXITY_QUESTION_COUNT,
    QUESTION_DISTRIBUTION,
    QuizAgent,
)


@pytest.fixture
def agent():
    return QuizAgent()


def test_get_topic_mastery_handles_missing_and_malformed(agent):
    assert agent._get_topic_mastery("docker", {}) == 0.0
    assert agent._get_topic_mastery("docker", {"docker": 0.5}) == 0.0  # not a dict
    assert agent._get_topic_mastery("docker", {"docker": {"mastery": 0.42}}) == 0.42


@pytest.mark.parametrize("mastery,num", [(0.0, 5), (0.2, 8), (0.5, 10), (0.9, 12)])
def test_difficulty_distribution_sums_to_total(agent, mastery, num):
    dist = agent._calculate_difficulty_distribution(mastery, num)
    assert dist["easy"] + dist["medium"] + dist["hard"] == num
    assert dist["medium"] >= 2  # hard floor enforced by impl


def test_difficulty_low_mastery_favors_easy(agent):
    dist = agent._calculate_difficulty_distribution(0.1, 10)
    assert dist["easy"] >= dist["hard"]


def test_difficulty_high_mastery_favors_hard(agent):
    dist = agent._calculate_difficulty_distribution(0.95, 10)
    assert dist["hard"] >= dist["easy"]


def test_question_distribution_redirects_coding_to_mcq_when_disabled(agent):
    dist = agent._get_question_distribution(10, has_coding=False)
    expected = QUESTION_DISTRIBUTION[10]
    assert dist["coding"] == 0
    assert dist["multiple_choice"] == expected["multiple_choice"] + expected["coding"]
    assert sum(dist.values()) == 10


def test_question_distribution_keeps_coding_when_enabled(agent):
    dist = agent._get_question_distribution(10, has_coding=True)
    assert dist["coding"] == QUESTION_DISTRIBUTION[10]["coding"]
    assert sum(dist.values()) == 10


def test_complexity_count_mapping_is_consistent():
    for level, count in COMPLEXITY_QUESTION_COUNT.items():
        assert count in QUESTION_DISTRIBUTION, (
            f"complexity={level} -> count={count} has no distribution row"
        )
        assert sum(QUESTION_DISTRIBUTION[count].values()) == count


def test_adjust_for_retry_no_op_on_first_attempt(agent):
    dist = {"easy": 1, "medium": 5, "hard": 4}
    assert agent._adjust_for_retry(dict(dist), 1) == dist


def test_adjust_for_retry_softens_difficulty(agent):
    dist = {"easy": 0, "medium": 5, "hard": 5}
    out = agent._adjust_for_retry(dist, 2)
    # one hard -> medium, one medium -> easy
    assert out["hard"] == 4
    assert out["easy"] == 1
    assert sum(out.values()) == sum(dist.values())


def test_validate_questions_pads_when_too_few(agent):
    questions = [{"id": "q1", "type": "multiple_choice"}]
    out = agent._validate_questions(questions, expected_count=5, question_types={})
    assert len(out) == 5
    # all padded items should still have hints/options/correct_answer
    for q in out:
        assert len(q.get("hints", [])) >= 3


def test_validate_questions_normalises_short_answer(agent):
    raw = [{"id": "q1", "type": "short_answer", "question": "Explain X"}]
    out = agent._validate_questions(raw, expected_count=1, question_types={})
    assert out[0]["options"] == []
    assert out[0]["correct_answer"] is None
    assert "expected_response_guide" in out[0]


def test_validate_questions_normalises_true_false(agent):
    raw = [{"id": "q1", "type": "true_false", "question": "Sky is blue?"}]
    out = agent._validate_questions(raw, expected_count=1, question_types={})
    assert out[0]["options"] == ["True", "False"]
    assert out[0]["requires_justification"] is True
    assert out[0]["correct_answer"] in {"True", "False"}


def test_validate_questions_truncates_when_too_many(agent):
    raw = [{"id": f"q{i}", "type": "multiple_choice"} for i in range(20)]
    out = agent._validate_questions(raw, expected_count=8, question_types={})
    assert len(out) == 8


def test_calculate_time_limit_caps_at_40(agent):
    assert agent._calculate_time_limit(50, has_coding=True) == 40


def test_calculate_time_limit_scales_with_count(agent):
    short = agent._calculate_time_limit(5, has_coding=False)
    long = agent._calculate_time_limit(12, has_coding=True)
    assert long > short


def test_fallback_questions_match_distribution_count(agent):
    types = {"multiple_choice": 2, "true_false": 1, "short_answer": 2,
             "scenario_based": 0, "coding": 0}
    out = agent._generate_fallback_questions("Docker", num_questions=5, question_types=types)
    assert len(out) == 5
    types_seen = [q["type"] for q in out]
    assert types_seen.count("short_answer") == 2
    assert types_seen.count("true_false") == 1
