"""
Short Answer Grader Agent for evaluating written quiz responses.

Grades student short answer responses on a scale of 0.0 to 1.0
with partial credit and detailed feedback.
"""

import json
from typing import Any, Dict, List

from core.faithfulness_checker import faithfulness_checker
from core.llm_client import llm_client
from core.logging import get_logger

logger = get_logger(__name__)

SHORT_ANSWER_GRADER_PROMPT = """You are the Short Answer Grader for the A3 learning system.
Your job is to grade a student's short answer response to a quiz question on a scale of 0.0 to 1.0.

You must be FAIR and GENEROUS with partial credit.
The goal is to identify genuine understanding — not perfect academic writing.
A student who demonstrates they understand the core concept should receive at least 0.6, even if their explanation is incomplete or worded imperfectly.

Do NOT penalise for:
  - Spelling or grammar errors
  - Informal language
  - Missing technical jargon if the meaning is clear
  - Slightly imprecise wording that still conveys correct understanding

DO penalise for:
  - Fundamentally wrong concept (demonstrates misunderstanding)
  - Answer that only restates the question without explaining
  - Completely off-topic response
  - Blank or "I don't know" responses

SCORING GUIDE:
  0.9 – 1.0:  Core concept fully correct, clear explanation, may include good example or comparison
  0.6 – 0.8:  Core concept correct but explanation incomplete, or minor error in a secondary detail
  0.3 – 0.5:  Shows some relevant knowledge but key concept partially wrong or significantly incomplete
  0.0 – 0.2:  Fundamentally incorrect, off-topic, blank, or just restates the question

When providing feedback and model answer hints, ensure they are consistent with the source material provided.
If you reference specific facts from the source material, cite them using [Source: ...] format.

Output ONLY valid JSON with this structure:
{
  "score": 0.75,
  "max_score": 1.0,
  "grade_label": "good",
  "concepts_demonstrated": ["concept1", "concept2"],
  "concepts_missing": ["concept3"],
  "feedback": "1-2 sentences shown to student — constructive, encouraging, no jargon",
  "model_answer_hint": "brief ideal answer — shown to student after submission"
}

grade_label must be one of: "excellent" (0.9-1.0), "good" (0.6-0.8), "partial" (0.3-0.5), "poor" (0.0-0.2)

Be encouraging in feedback. Never shame the student."""


class ShortAnswerGrader:
    """Grades short answer responses using LLM."""

    def __init__(self, llm=None):
        self.llm = llm or llm_client
        logger.info("Initialized ShortAnswerGrader")

    async def grade(
        self,
        question: str,
        student_answer: str,
        expected_concepts: List[str],
        correct_answer_notes: str,
        relevant_rag_chunk: str = "",
        question_context: str = "",
    ) -> Dict[str, Any]:
        """
        Grade a short answer response.

        Args:
            question: The question text
            student_answer: Student's written response
            expected_concepts: List of concepts a good answer should cover
            correct_answer_notes: Notes on what a correct answer looks like
            relevant_rag_chunk: Source material from RAG to ground the grading
            question_context: Additional context about the question

        Returns:
            Dict with score, feedback, concepts demonstrated/missing
        """
        # Handle empty answers
        if not student_answer or student_answer.strip() == "":
            return {
                "score": 0.0,
                "max_score": 1.0,
                "grade_label": "poor",
                "concepts_demonstrated": [],
                "concepts_missing": expected_concepts,
                "feedback": "No answer was provided. Please try to explain your understanding even if you're unsure.",
                "model_answer_hint": correct_answer_notes[:200] if correct_answer_notes else "A good answer would explain the key concepts clearly.",
            }

        # Handle very short answers (less than 10 words)
        word_count = len(student_answer.split())
        if word_count < 10:
            return {
                "score": 0.2,
                "max_score": 1.0,
                "grade_label": "poor",
                "concepts_demonstrated": [],
                "concepts_missing": expected_concepts,
                "feedback": f"Your answer is quite brief ({word_count} words). Try to explain in 2-4 sentences to demonstrate your understanding.",
                "model_answer_hint": correct_answer_notes[:200] if correct_answer_notes else "A good answer would be 2-4 sentences explaining the concept.",
            }

        system_prompt = SHORT_ANSWER_GRADER_PROMPT

        user_prompt = f"""Grade this short answer response.

QUESTION:
{question}

EXPECTED CONCEPTS TO COVER:
{chr(10).join(f"- {c}" for c in expected_concepts)}

CORRECT ANSWER GUIDANCE:
{correct_answer_notes}

{"SOURCE MATERIAL:" + chr(10) + relevant_rag_chunk if relevant_rag_chunk else ""}

STUDENT RESPONSE:
"{student_answer}"

Grade fairly and generously. Return ONLY JSON."""

        try:
            response = await self.llm.generate(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,  # Lower temperature for consistent grading
                max_tokens=500
            )

            content = response["choices"][0]["message"].get("content", "")

            if not content:
                logger.warning("LLM returned empty content for grading")
                return self._fallback_grade(student_answer, expected_concepts)

            # Parse JSON
            try:
                result = json.loads(content)
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"JSON parse error in grading: {e}")
                # Try to extract JSON from markdown
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    try:
                        result = json.loads(json_match.group())
                    except (json.JSONDecodeError, TypeError):
                        return self._fallback_grade(student_answer, expected_concepts)
                else:
                    return self._fallback_grade(student_answer, expected_concepts)

            # Validate and normalize
            score = float(result.get("score", 0.5))
            score = max(0.0, min(1.0, score))  # Clamp to 0-1

            grade_label = result.get("grade_label", "partial")
            if grade_label not in ["excellent", "good", "partial", "poor"]:
                # Map score to label
                if score >= 0.9:
                    grade_label = "excellent"
                elif score >= 0.6:
                    grade_label = "good"
                elif score >= 0.3:
                    grade_label = "partial"
                else:
                    grade_label = "poor"

            # Prepare result dict
            grading_result = {
                "score": score,
                "max_score": result.get("max_score", 1.0),
                "grade_label": grade_label,
                "concepts_demonstrated": result.get("concepts_demonstrated", []),
                "concepts_missing": result.get("concepts_missing", []),
                "feedback": result.get("feedback", "Your answer has been graded."),
                "model_answer_hint": result.get("model_answer_hint", correct_answer_notes[:200]),
            }

            # Run faithfulness check on grader output if RAG chunk available
            if relevant_rag_chunk:
                grading_text = json.dumps(grading_result, indent=2)
                faithfulness_result = await faithfulness_checker.check_faithfulness(
                    generated_text=grading_text,
                    source_chunks=[{"id": "rag_source", "text": relevant_rag_chunk, "source": "question_material"}],
                    context=f"Grading for: {question[:50]}...",
                )
                grading_result["faithfulness"] = {
                    "score": faithfulness_result.score,
                    "verified": faithfulness_result.score >= faithfulness_checker.threshold,
                    "total_claims": faithfulness_result.total_claims,
                    "supported_claims": faithfulness_result.supported_count,
                    "unverifiable_claims": faithfulness_result.unverifiable_count,
                    "citations": faithfulness_result.citations,
                }

            return grading_result

        except Exception as e:
            logger.error(f"Grading failed: {e}")
            return self._fallback_grade(student_answer, expected_concepts)

    def _fallback_grade(self, student_answer: str, expected_concepts: List[str]) -> Dict[str, Any]:
        """Generate a fallback grade when LLM fails."""
        word_count = len(student_answer.split())

        # Simple heuristic grading
        if word_count < 20:
            score = 0.3
            label = "partial"
            feedback = "Your answer is quite brief. Try to provide more detail in your explanation."
        elif word_count < 50:
            score = 0.6
            label = "good"
            feedback = "You provided a reasonable explanation. Review the model answer for areas to improve."
        else:
            score = 0.75
            label = "good"
            feedback = "Good detailed response. Your explanation shows understanding of the concept."

        return {
            "score": score,
            "max_score": 1.0,
            "grade_label": label,
            "concepts_demonstrated": expected_concepts[:1] if expected_concepts else ["general understanding"],
            "concepts_missing": expected_concepts[1:] if len(expected_concepts) > 1 else [],
            "feedback": feedback,
            "model_answer_hint": "A complete answer would explain the key concepts clearly with examples.",
            "faithfulness": {
                "score": 0.0,
                "verified": False,
                "total_claims": 0,
                "supported_claims": 0,
                "unverifiable_claims": 0,
                "citations": [],
            },
        }

    async def grade_batch(
        self,
        responses: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Grade multiple short answer responses.

        Args:
            responses: List of dicts with question, student_answer, expected_concepts, etc.

        Returns:
            List of grading results
        """
        results = []
        for response in responses:
            result = await self.grade(
                question=response.get("question", ""),
                student_answer=response.get("student_answer", ""),
                expected_concepts=response.get("expected_concepts", []),
                correct_answer_notes=response.get("correct_answer_notes", ""),
                relevant_rag_chunk=response.get("relevant_rag_chunk", ""),
                question_context=response.get("question_context", ""),
            )
            results.append({
                "question_id": response.get("question_id"),
                **result
            })
        return results
