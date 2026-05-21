"""
Coding Challenge Grader for evaluating code submissions.

Combines test case execution with code quality assessment.
"""

import re
from typing import Any, Dict, List, Optional

from agents.base_agent import BaseAgent
from core.judge0_client import get_judge0_client
from core.logging import get_logger

logger = get_logger(__name__)

CODING_GRADER_PROMPT = """You are the Coding Challenge Grader for the A3 learning system.
Test cases have already been run automatically. Your job is to:
  1. Review the test case results
  2. Assess code quality and approach
  3. Provide constructive feedback the student can learn from
  4. Return a final score combining test results and code quality

SCORING (base_score is determined by test results):
  All tests pass:                   base_score = 1.0
  Visible pass, hidden fail:        base_score = 0.6
  Only 1 visible test passes:       base_score = 0.3
  Code runs, all tests fail:        base_score = 0.1
  Syntax error / does not run:      base_score = 0.0

Code quality bonus (only applied if base_score > 0):
  Clean, readable, good variable names:   +0.0 (no penalty for messy)
  Extremely clever/optimal solution:      base_score capped at 1.0
  Hardcoded expected outputs detected:    base_score = 0.0 (override)

Hardcoding detection:
  If student's code contains the exact expected output values
  as hardcoded returns matching only the visible test inputs,
  set hardcoded_detected = true and override score to 0.0.

Output ONLY valid JSON:
{
  "base_score": 0.0,
  "final_score": 0.0,
  "hardcoded_detected": false,
  "code_assessment": {
    "approach_correct": true,
    "logic_error_detected": false,
    "edge_case_missed": false,
    "syntax_error": false
  },
  "feedback": "2-3 sentences explaining what went wrong and how to fix",
  "hint_for_retry": "1 sentence directional hint if score < 0.5",
  "model_solution": "shown only after final attempt - clean solution"
}"""


class CodingGrader(BaseAgent):
    """Grades coding challenge submissions."""

    def __init__(self, llm=None):
        super().__init__("CodingGrader", llm)
        self.judge0 = get_judge0_client()

    async def grade(
        self,
        code: str,
        language: str,
        test_cases: List[Dict[str, Any]],
        question_context: str = "",
    ) -> Dict[str, Any]:
        """
        Grade a coding submission.

        Args:
            code: Student's code submission
            language: Programming language
            test_cases: List of test cases with input/expected_output/is_visible
            question_context: Additional context about the problem

        Returns:
            Dict with scoring results and feedback
        """
        # Check if Judge0 is configured
        if not self.judge0.api_key:
            return {
                "base_score": 0.0,
                "final_score": 0.0,
                "max_score": 1.0,
                "hardcoded_detected": False,
                "test_summary": {
                    "visible_passed": 0,
                    "visible_total": 0,
                    "hidden_passed": 0,
                    "hidden_total": 0,
                },
                "code_assessment": {
                    "approach_correct": False,
                    "logic_error_detected": False,
                    "edge_case_missed": False,
                    "syntax_error": False,
                },
                "feedback": "Code execution is not configured. Please contact support.",
                "hint_for_retry": None,
                "model_solution": None,
                "error": "Judge0 API not configured",
            }

        # Run test cases
        test_results = await self.judge0.execute_with_tests(code, language, test_cases)

        # Analyze results
        visible_tests = [r for r in test_results["results"] if r.get("is_visible", True)]
        hidden_tests = [r for r in test_results["results"] if not r.get("is_visible", True)]

        visible_passed = sum(1 for t in visible_tests if t.get("passed"))
        visible_total = len(visible_tests)
        hidden_passed = sum(1 for t in hidden_tests if t.get("passed"))
        hidden_total = len(hidden_tests)

        # Calculate base score based on test results
        base_score = self._calculate_base_score(
            visible_passed, visible_total,
            hidden_passed, hidden_total,
            test_results
        )

        # Check for hardcoding
        hardcoded_detected = self._detect_hardcoding(code, visible_tests)
        if hardcoded_detected:
            base_score = 0.0

        # Get code assessment from LLM if tests didn't all pass
        assessment = await self._assess_code(
            code=code,
            language=language,
            base_score=base_score,
            test_results=test_results,
            question_context=question_context,
        )

        final_score = 0.0 if hardcoded_detected else base_score

        return {
            "base_score": round(base_score, 2),
            "final_score": round(final_score, 2),
            "max_score": 1.0,
            "hardcoded_detected": hardcoded_detected,
            "test_summary": {
                "visible_passed": visible_passed,
                "visible_total": visible_total,
                "hidden_passed": hidden_passed,
                "hidden_total": hidden_total,
            },
            "test_results": test_results["results"],
            "execution_time_ms": test_results.get("execution_time_ms", 0),
            "memory_kb": test_results.get("memory_kb", 0),
            **assessment,
        }

    def _calculate_base_score(
        self,
        visible_passed: int,
        visible_total: int,
        hidden_passed: int,
        hidden_total: int,
        test_results: Dict,
    ) -> float:
        """Calculate base score from test results."""
        # Check for syntax/compilation errors
        has_errors = any(
            r.get("status_id") in [6, 7, 9, 10, 11]  # Error statuses
            for r in test_results.get("results", [])
        )
        if has_errors:
            return 0.0

        # All tests pass
        if visible_passed == visible_total and hidden_passed == hidden_total:
            return 1.0

        # Visible pass, hidden fail
        if visible_passed == visible_total and hidden_passed < hidden_total:
            return 0.6

        # Only 1 visible test passes
        if visible_passed >= 1 and visible_total >= 2:
            return 0.3

        # Code runs but all tests fail
        if visible_passed == 0 and visible_total > 0:
            return 0.1

        return 0.0

    def _detect_hardcoding(self, code: str, visible_tests: List[Dict]) -> bool:
        """Detect if student hardcoded expected outputs."""
        # Get expected outputs from visible tests
        expected_outputs = [
            t.get("expected_output", "").strip()
            for t in visible_tests
            if t.get("is_visible", True)
        ]

        # Check if code contains exact expected outputs as return statements
        for expected in expected_outputs:
            if not expected:
                continue

            # Look for patterns like return expected_output or print(expected_output)
            patterns = [
                rf'return\s+["\']?{re.escape(expected)}["\']?',
                rf'print\s*\(\s*["\']?{re.escape(expected)}["\']?\s*\)',
            ]

            for pattern in patterns:
                if re.search(pattern, code, re.IGNORECASE):
                    # Check if it's in a conditional that matches test input
                    return True

        return False

    async def _assess_code(
        self,
        code: str,
        language: str,
        base_score: float,
        test_results: Dict,
        question_context: str,
    ) -> Dict[str, Any]:
        """Get code quality assessment from LLM."""
        # Skip LLM assessment for perfect scores
        if base_score >= 1.0:
            return {
                "code_assessment": {
                    "approach_correct": True,
                    "logic_error_detected": False,
                    "edge_case_missed": False,
                    "syntax_error": False,
                },
                "feedback": "Excellent! All tests passed. Your solution is correct.",
                "hint_for_retry": None,
                "model_solution": None,
            }

        system_prompt = CODING_GRADER_PROMPT

        # Build test results summary
        test_summary = []
        for r in test_results.get("results", []):
            status = "PASSED" if r.get("passed") else "FAILED"
            test_summary.append(
                f"- {r.get('test_id')}: {status}"
                f" ({r.get('status_description', 'Unknown')})"
            )

        user_prompt = f"""Grade this coding submission.

PROBLEM:
{question_context}

STUDENT CODE ({language}):
```{language}
{code}
```

TEST RESULTS:
{chr(10).join(test_summary)}

Base score from tests: {base_score}

Provide constructive feedback and assessment."""

        try:
            response = await self.llm.generate(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )

            content = response["choices"][0]["message"].get("content", "") if response.get("choices") else ""

            if not content:
                return self._fallback_assessment(base_score)

            # Parse JSON
            import json
            try:
                result = json.loads(content)
            except (json.JSONDecodeError, TypeError):
                # Try to extract JSON from markdown
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    try:
                        result = json.loads(json_match.group())
                    except (json.JSONDecodeError, TypeError):
                        return self._fallback_assessment(base_score)
                else:
                    return self._fallback_assessment(base_score)

            return {
                "code_assessment": result.get("code_assessment", {
                    "approach_correct": base_score > 0.3,
                    "logic_error_detected": 0 < base_score < 0.6,
                    "edge_case_missed": base_score == 0.6,
                    "syntax_error": base_score == 0.0,
                }),
                "feedback": result.get("feedback", self._get_default_feedback(base_score)),
                "hint_for_retry": result.get("hint_for_retry") if base_score < 0.5 else None,
                "model_solution": result.get("model_solution") if base_score < 0.6 else None,
            }

        except Exception as e:
            logger.error(f"Code assessment failed: {e}")
            return self._fallback_assessment(base_score)

    def _fallback_assessment(self, base_score: float) -> Dict[str, Any]:
        """Generate fallback assessment when LLM fails."""
        if base_score >= 1.0:
            feedback = "All tests passed! Great job."
        elif base_score >= 0.6:
            feedback = "Most tests passed. Review the failed cases to understand edge cases."
        elif base_score >= 0.3:
            feedback = "Some tests passed. Check your logic and try again."
        elif base_score > 0:
            feedback = "Your code runs but doesn't produce correct output. Review the requirements."
        else:
            feedback = "Your code has errors. Check for syntax issues and try again."

        return {
            "code_assessment": {
                "approach_correct": base_score > 0.3,
                "logic_error_detected": 0 < base_score < 0.6,
                "edge_case_missed": base_score == 0.6,
                "syntax_error": base_score == 0.0,
            },
            "feedback": feedback,
            "hint_for_retry": "Review the test cases and check your logic." if base_score < 0.5 else None,
            "model_solution": None,
        }

    def _get_default_feedback(self, base_score: float) -> str:
        """Get default feedback based on score."""
        feedbacks = {
            1.0: "Perfect! All tests passed including hidden cases.",
            0.6: "Good job! Your solution works for visible tests but missed some edge cases.",
            0.3: "Partial credit. Your solution works for some cases but has issues.",
            0.1: "Your code runs but doesn't produce correct output. Review the requirements.",
            0.0: "Your code has errors. Check syntax and try again.",
        }
        return feedbacks.get(base_score, "Review your solution and try again.")

    async def run_tests_only(
        self,
        code: str,
        language: str,
        test_cases: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Run tests without full grading (for practice/verification).

        Returns test results without LLM assessment.
        """
        return await self.judge0.execute_with_tests(code, language, test_cases)
