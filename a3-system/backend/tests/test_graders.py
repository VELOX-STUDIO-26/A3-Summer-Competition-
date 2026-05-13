"""Unit tests for ShortAnswerGrader heuristics and CodingGrader pure helpers.

LLM calls are bypassed — we only exercise the parts of the graders that are
deterministic and safe to run offline.
"""

import pytest

from agents.short_answer_grader import ShortAnswerGrader
from agents.coding_grader import CodingGrader


class _ConcreteCodingGrader(CodingGrader):
    """Test-only subclass — BaseAgent.run is abstract but unused here."""

    async def run(self, *args, **kwargs):  # pragma: no cover
        raise NotImplementedError


# ---------------- short answer grader ----------------

@pytest.fixture
def sa_grader():
    return ShortAnswerGrader()


@pytest.mark.asyncio
async def test_blank_answer_scores_zero(sa_grader):
    result = await sa_grader.grade(
        question="Explain X",
        student_answer="",
        expected_concepts=["a", "b"],
        correct_answer_notes="...",
    )
    assert result["score"] == 0.0
    assert result["grade_label"] == "poor"
    assert result["concepts_demonstrated"] == []
    assert result["concepts_missing"] == ["a", "b"]


@pytest.mark.asyncio
async def test_whitespace_only_answer_scores_zero(sa_grader):
    result = await sa_grader.grade(
        question="Explain X",
        student_answer="     \n\t  ",
        expected_concepts=[],
        correct_answer_notes="",
    )
    assert result["score"] == 0.0


@pytest.mark.asyncio
async def test_too_short_answer_gets_low_score(sa_grader):
    # < 10 words triggers the early-return heuristic without an LLM call
    result = await sa_grader.grade(
        question="Explain X",
        student_answer="It is a thing that does stuff sometimes.",
        expected_concepts=["clarity"],
        correct_answer_notes="...",
    )
    assert result["score"] == 0.2
    assert result["grade_label"] == "poor"


def test_fallback_grade_word_count_buckets(sa_grader):
    short = sa_grader._fallback_grade("a " * 5, ["c"])
    medium = sa_grader._fallback_grade("a " * 30, ["c"])
    long_ans = sa_grader._fallback_grade("a " * 80, ["c"])
    assert short["score"] < medium["score"] <= long_ans["score"]
    for r in (short, medium, long_ans):
        assert 0.0 <= r["score"] <= 1.0
        assert r["grade_label"] in {"poor", "partial", "good", "excellent"}


# ---------------- coding grader ----------------

@pytest.fixture
def code_grader():
    return _ConcreteCodingGrader()


def _result(passed: bool, visible: bool = True, status_id: int = 3):
    return {"passed": passed, "is_visible": visible, "status_id": status_id}


def test_base_score_all_pass(code_grader):
    score = code_grader._calculate_base_score(
        visible_passed=2, visible_total=2,
        hidden_passed=2, hidden_total=2,
        test_results={"results": [_result(True), _result(True),
                                   _result(True, False), _result(True, False)]},
    )
    assert score == 1.0


def test_base_score_visible_pass_hidden_fail(code_grader):
    score = code_grader._calculate_base_score(
        visible_passed=2, visible_total=2,
        hidden_passed=0, hidden_total=2,
        test_results={"results": [_result(True), _result(True),
                                   _result(False, False), _result(False, False)]},
    )
    assert score == 0.6


def test_base_score_one_visible_pass(code_grader):
    score = code_grader._calculate_base_score(
        visible_passed=1, visible_total=2,
        hidden_passed=0, hidden_total=0,
        test_results={"results": [_result(True), _result(False)]},
    )
    assert score == 0.3


def test_base_score_all_fail_zero_one(code_grader):
    score = code_grader._calculate_base_score(
        visible_passed=0, visible_total=2,
        hidden_passed=0, hidden_total=0,
        test_results={"results": [_result(False), _result(False)]},
    )
    assert score == 0.1


def test_base_score_syntax_error_zero(code_grader):
    score = code_grader._calculate_base_score(
        visible_passed=0, visible_total=2,
        hidden_passed=0, hidden_total=0,
        test_results={"results": [_result(False, status_id=6),
                                   _result(False, status_id=6)]},
    )
    assert score == 0.0


def test_hardcoding_detection_returns_true_for_obvious_match(code_grader):
    visible_tests = [
        {"is_visible": True, "expected_output": "42"},
        {"is_visible": True, "expected_output": "13"},
    ]
    code = "def solve(x):\n    return 42\n"
    assert code_grader._detect_hardcoding(code, visible_tests) is True


def test_hardcoding_detection_false_for_general_solution(code_grader):
    visible_tests = [
        {"is_visible": True, "expected_output": "42"},
    ]
    code = "def solve(x):\n    return x * 2\n"
    assert code_grader._detect_hardcoding(code, visible_tests) is False


def test_fallback_assessment_keys_present_at_each_score(code_grader):
    for s in (0.0, 0.1, 0.3, 0.6, 1.0):
        out = code_grader._fallback_assessment(s)
        assert "code_assessment" in out
        assert "feedback" in out
        # hint only for low scores
        if s < 0.5:
            assert out["hint_for_retry"] is not None
        else:
            assert out["hint_for_retry"] is None


def test_default_feedback_text_changes_with_score(code_grader):
    msgs = {s: code_grader._get_default_feedback(s) for s in (0.0, 0.3, 0.6, 1.0)}
    # all messages must be distinct
    assert len(set(msgs.values())) == len(msgs)
