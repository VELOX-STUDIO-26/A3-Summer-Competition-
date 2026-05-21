"""
Quiz Evaluator Agent for Resource Tracking System.

Analyzes quiz results and determines student progression path:
- ACCELERATE: Score >= 85% + fast completion
- CONTINUE: Score >= 60%
- REMEDIATE: Score < 60% (targeted concept regeneration)
- REPLAN: 3 consecutive low scores (full milestone regeneration)
"""

import json
from typing import Any, Dict, List, Tuple

from core.llm_client import llm_client
from core.logging import get_logger

logger = get_logger(__name__)

EVALUATOR_SYSTEM_PROMPT = """You are the Assessment Evaluator Agent for the A3 personalized learning system.
Your job is to:
1. Analyze a student's quiz results
2. Identify exactly which concepts they misunderstood
3. Determine the adaptation decision (accelerate/continue/remediate/replan)
4. Generate precise profile updates
5. Generate precise instructions for the Resource Regeneration Agent

Output a single JSON object only. No markdown, no explanation, no code fences.

DECISION RULES (apply in priority order):
1. score >= 85% AND time_taken < expected_time * 1.2  → outcome = "accelerate"
2. score >= 60%                                       → outcome = "continue"
3. score < 60% AND consecutive_low_scores < 3         → outcome = "remediate"
4. score < 60% AND consecutive_low_scores >= 3        → outcome = "replan"
5. rushed_through = true AND score < 70%
   → override to "remediate" regardless of score

REGENERATION RULES:
- "accelerate"  → should_regenerate = false
- "continue"    → scope = "targeted_concepts" (silent injection into next milestone)
- "remediate"   → scope = "targeted_concepts" (wrong concepts only)
- "replan"      → scope = "full_milestone" (full regeneration, simpler level)

FORMAT SELECTION RULES:
- visual learner + low video engagement       → prioritise: mindmap, diagram
- kinetic learner + low code engagement       → prioritise: code, interactive
- student rushed notes                        → avoid: notes, prioritise: video
- Always avoid the lowest engagement format
- Always differ from the original format used

CONCEPT SEVERITY RULES:
- "critical": wrong on 2+ questions about same concept OR
              concept is a prerequisite for the next milestone
- "moderate": wrong once, concept is within this milestone scope
- "minor":    wrong once, likely careless error (fast answer, easy question)

LIKELY CAUSE RULES:
- "never_studied": student left blank or guessed randomly
- "misunderstood": student applied concept incorrectly
- "confused_with_similar": student mixed up similar concepts
- "careless_error": student answered quickly and made simple mistake

STUDENT MESSAGE TONE:
- "accelerate": encouraging, celebratory
- "continue": neutral, supportive
- "remediate": encouraging, empathetic ("Good effort! This concept is genuinely tricky...")
- "replan": urgent but supportive ("Let's take a step back...")

Return this exact JSON structure:
{
  "score_percentage": 0.0,
  "decision": {
    "outcome": "accelerate | continue | remediate | replan",
    "next_milestone_unlocked": false,
    "reason": "max 30 words explaining the decision"
  },
  "concept_analysis": [
    {
      "concept": "concept name",
      "concept_tag": "machine_tag",
      "wrong_count": 1,
      "severity": "critical | moderate | minor",
      "likely_cause": "never_studied | misunderstood | confused_with_similar | careless_error",
      "evidence": "what the wrong answer reveals"
    }
  ],
  "profile_updates": {
    "weak_points_add": ["concept1"],
    "weak_points_resolve": [],
    "knowledge_base_updates": {"topic": 0.75},
    "pace_adjustment": 0.0,
    "confidence_delta": 0.0
  },
  "regeneration_instructions": {
    "should_regenerate": false,
    "scope": "full_milestone | targeted_concepts | none",
    "target_concepts": ["concept1"],
    "format_instructions": {
      "avoid_formats": ["notes"],
      "prioritise_formats": ["video", "diagram"],
      "complexity_level": "simpler | same | advanced"
    },
    "specific_instructions": "precise instructions for what new resources must cover differently"
  },
  "quiz_instructions": {
    "allow_requiz": false,
    "requiz_unlock_condition": "what must happen before re-quiz unlocks",
    "requiz_difficulty": "easier | same | harder",
    "focus_concepts": ["concept1"]
  },
  "student_message": {
    "tone": "encouraging | neutral | urgent",
    "message": "max 40 words, no technical jargon, encouraging tone"
  }
}"""


class EvaluatorAgent:
    """Evaluates quiz results and determines student progression."""

    def __init__(self, llm=None):
        self.agent_name = "QuizEvaluator"
        self.llm = llm or llm_client

    def _build_system_prompt(self, base_prompt: str, profile: Dict[str, Any]) -> str:
        """Build system prompt (simplified for evaluation)."""
        return base_prompt

    def _determine_outcome(
        self,
        score_pct: float,
        time_taken: int,
        expected_time: int,
        consecutive_low: int,
        rushed: bool
    ) -> Tuple[str, bool, str]:
        """
        Determine quiz outcome based on decision rules.
        Returns: (outcome, next_unlocked, reason)
        """
        # Rule 5: Rushed through resources and score < 70%
        if rushed and score_pct < 0.70:
            return (
                "remediate",
                False,
                "Rushed through resources — targeted review needed before continuing"
            )

        # Rule 1: Accelerate (85%+ and fast)
        if score_pct >= 0.85 and time_taken < expected_time * 1.2:
            return (
                "accelerate",
                True,
                f"Score {int(score_pct * 100)}% completed faster than expected — strong understanding"
            )

        # Rule 2: Continue (60%+)
        if score_pct >= 0.60:
            return (
                "continue",
                True,
                f"Score {int(score_pct * 100)}% meets proficiency threshold"
            )

        # Rule 3 & 4: Remediate or Replan (score < 60%)
        if consecutive_low >= 3:
            return (
                "replan",
                False,
                f"Score {int(score_pct * 100)}% — 3 consecutive attempts below threshold, foundation rebuild needed"
            )
        return (
            "remediate",
            False,
            f"Score {int(score_pct * 100)}% — targeted concept review needed"
        )

    def _analyze_concepts_locally(self, answers: List[Dict]) -> List[Dict]:
        """Local concept analysis without LLM."""
        concept_errors = {}

        for answer in answers:
            if not answer.get("is_correct", True):
                concept = answer.get("concept_tag", "unknown")
                if concept not in concept_errors:
                    concept_errors[concept] = {
                        "count": 0,
                        "questions": [],
                        "time_spent": []
                    }
                concept_errors[concept]["count"] += 1
                concept_errors[concept]["questions"].append(answer)
                concept_errors[concept]["time_spent"].append(answer.get("time_spent_seconds", 0))

        analysis = []
        for concept, data in concept_errors.items():
            count = data["count"]
            avg_time = sum(data["time_spent"]) / len(data["time_spent"]) if data["time_spent"] else 0

            # Determine severity
            if count >= 2:
                severity = "critical"
            elif avg_time < 10:  # Fast answer = likely careless
                severity = "minor"
            else:
                severity = "moderate"

            # Determine likely cause
            if avg_time < 5:
                cause = "careless_error"
            elif count >= 2:
                cause = "misunderstood"
            else:
                cause = "never_studied"

            analysis.append({
                "concept": concept.replace("_", " ").title(),
                "concept_tag": concept,
                "wrong_count": count,
                "severity": severity,
                "likely_cause": cause,
                "evidence": f"Wrong {count} time(s), average time {int(avg_time)}s"
            })

        return analysis

    def _generate_student_message(
        self,
        outcome: str,
        score_pct: float,
        concept_count: int
    ) -> Dict[str, str]:
        """Generate appropriate student message based on outcome."""
        score_int = int(score_pct * 100)

        if outcome == "accelerate":
            return {
                "tone": "encouraging",
                "message": f"Excellent — {score_int}%! You're ahead of pace! The next milestone is now unlocked with some advanced content for you."
            }
        elif outcome == "continue":
            return {
                "tone": "neutral",
                "message": f"Good work — {score_int}%! You've mastered this milestone. The next topic is now ready for you."
            }
        elif outcome == "remediate":
            if concept_count == 1:
                return {
                    "tone": "encouraging",
                    "message": f"Good effort! {score_int}% — one concept needs a bit more practice. We've added a targeted resource to help."
                }
            else:
                return {
                    "tone": "encouraging",
                    "message": f"Good effort! {score_int}% — a few concepts need more practice. We've added {concept_count} targeted resources to help you master them."
                }
        else:  # replan
            return {
                "tone": "urgent",
                "message": f"Let's take a step back. {score_int}% suggests the foundation needs strengthening. We're rebuilding this milestone at a more comfortable pace for you."
            }

    async def evaluate(
        self,
        student_id: str,
        milestone_id: str,
        quiz_id: str,
        answers: List[Dict],
        score_percentage: float,
        time_taken_seconds: int,
        expected_time_seconds: int,
        consecutive_low_scores: int,
        rushed_through: bool,
        resource_engagement: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate quiz and determine next actions.

        Args:
            student_id: Student identifier
            milestone_id: Milestone identifier
            quiz_id: Quiz identifier
            answers: List of answer objects
            score_percentage: Quiz score (0.0-1.0)
            time_taken_seconds: Time spent on quiz
            expected_time_seconds: Expected time for quiz
            consecutive_low_scores: Number of consecutive low scores
            rushed_through: Whether student rushed through resources
            resource_engagement: Resource engagement data

        Returns:
            Dict with evaluation results including decision, concept analysis,
            profile updates, regeneration instructions, and student message.
        """
        try:
            # Determine outcome
            outcome, next_unlocked, reason = self._determine_outcome(
                score_percentage,
                time_taken_seconds,
                expected_time_seconds,
                consecutive_low_scores,
                rushed_through
            )

            # Analyze concepts (local first)
            concept_analysis = self._analyze_concepts_locally(answers)

            # Try LLM for more nuanced analysis
            try:
                system_prompt = self._build_system_prompt(EVALUATOR_SYSTEM_PROMPT, {})

                user_prompt = f"""Evaluate this student's milestone quiz and generate the adaptation plan.

Student ID: {student_id}
Milestone ID: {milestone_id}
Score: {score_percentage * 100:.1f}%
Time taken: {time_taken_seconds}s (expected: {expected_time_seconds}s)
Consecutive low scores: {consecutive_low_scores}
Rushed through resources: {rushed_through}

Answers:
{json.dumps(answers, indent=2)}

Resource engagement:
{json.dumps(resource_engagement, indent=2)}

Return ONLY valid JSON matching the exact structure specified."""

                response = await self.llm.generate(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.3,
                    max_tokens=2000
                )

                content = response["choices"][0]["message"].get("content", "")
                if content:
                    try:
                        result = json.loads(content)
                        # Validate and merge with local calculation
                        required = ["decision", "concept_analysis", "profile_updates",
                                   "regeneration_instructions", "quiz_instructions", "student_message"]
                        if all(k in result for k in required):
                            # Override local outcome with LLM if valid
                            if result["decision"].get("outcome") in ["accelerate", "continue", "remediate", "replan"]:
                                return {
                                    "score_percentage": score_percentage,
                                    **result
                                }
                    except json.JSONDecodeError:
                        pass

            except Exception as e:
                logger.warning(f"LLM evaluation failed, using local: {e}")

            # Local fallback evaluation
            target_concepts = [c["concept_tag"] for c in concept_analysis if c["severity"] in ["critical", "moderate"]]

            # Determine format instructions based on engagement
            if resource_engagement:
                lowest_format = min(
                    resource_engagement.keys(),
                    key=lambda k: resource_engagement.get(k, {}).get("completion", 0)
                )
            else:
                lowest_format = "notes"  # Default fallback

            # Build profile updates
            weak_add = [c["concept_tag"] for c in concept_analysis if c["severity"] == "critical"]
            knowledge_updates = {}
            for c in concept_analysis:
                if c["severity"] == "critical":
                    knowledge_updates[c["concept_tag"]] = 0.35
                elif c["severity"] == "moderate":
                    knowledge_updates[c["concept_tag"]] = 0.55

            # Pace adjustment
            pace_adj = 0.0
            if outcome == "accelerate":
                pace_adj = 0.10
            elif outcome == "remediate":
                pace_adj = -0.05
            elif outcome == "replan":
                pace_adj = -0.10

            # Confidence delta
            conf_delta = 0.0
            if outcome == "accelerate":
                conf_delta = 0.15
            elif outcome == "continue":
                conf_delta = 0.10
            elif outcome == "remediate":
                conf_delta = -0.10
            elif outcome == "replan":
                conf_delta = -0.15

            # Student message
            message = self._generate_student_message(
                outcome, score_percentage, len(target_concepts)
            )

            return {
                "score_percentage": score_percentage,
                "decision": {
                    "outcome": outcome,
                    "next_milestone_unlocked": next_unlocked,
                    "reason": reason
                },
                "concept_analysis": concept_analysis,
                "profile_updates": {
                    "weak_points_add": weak_add,
                    "weak_points_resolve": [],
                    "knowledge_base_updates": knowledge_updates,
                    "pace_adjustment": pace_adj,
                    "confidence_delta": conf_delta
                },
                "regeneration_instructions": {
                    "should_regenerate": outcome in ["remediate", "replan"],
                    "scope": "targeted_concepts" if outcome == "remediate" else ("full_milestone" if outcome == "replan" else "none"),
                    "target_concepts": target_concepts,
                    "format_instructions": {
                        "avoid_formats": [lowest_format],
                        "prioritise_formats": ["video", "mindmap"] if lowest_format == "notes" else ["code", "interactive"],
                        "complexity_level": "simpler" if outcome in ["remediate", "replan"] else "same"
                    },
                    "specific_instructions": f"Focus on {', '.join(target_concepts)} with simpler explanations and more examples." if target_concepts else ""
                },
                "quiz_instructions": {
                    "allow_requiz": outcome in ["remediate"],
                    "requiz_unlock_condition": "Complete the new targeted resources to 80%" if outcome == "remediate" else "",
                    "requiz_difficulty": "easier" if outcome in ["remediate", "replan"] else "same",
                    "focus_concepts": target_concepts
                },
                "student_message": message
            }

        except Exception as e:
            logger.error(f"Quiz evaluation failed: {e}")
            # Return safe default
            return {
                "score_percentage": score_percentage,
                "decision": {
                    "outcome": "continue",
                    "next_milestone_unlocked": True,
                    "reason": "Evaluation error - defaulting to continue"
                },
                "concept_analysis": [],
                "profile_updates": {
                    "weak_points_add": [],
                    "weak_points_resolve": [],
                    "knowledge_base_updates": {},
                    "pace_adjustment": 0.0,
                    "confidence_delta": 0.0
                },
                "regeneration_instructions": {
                    "should_regenerate": False,
                    "scope": "none",
                    "target_concepts": [],
                    "format_instructions": {
                        "avoid_formats": [],
                        "prioritise_formats": [],
                        "complexity_level": "same"
                    },
                    "specific_instructions": ""
                },
                "quiz_instructions": {
                    "allow_requiz": False,
                    "requiz_unlock_condition": "",
                    "requiz_difficulty": "same",
                    "focus_concepts": []
                },
                "student_message": {
                    "tone": "neutral",
                    "message": "Quiz completed. Moving to next milestone."
                }
            }
