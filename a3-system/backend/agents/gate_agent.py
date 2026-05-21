"""
Gate Calculation Agent for Resource Tracking System.

Calculates whether a student has engaged sufficiently with milestone resources
to unlock the final milestone quiz.
"""

import json
from typing import Any, Dict

from core.llm_client import llm_client
from core.logging import get_logger

logger = get_logger(__name__)

# Completion weights per resource type
RESOURCE_WEIGHTS = {
    "notes": 0.25,
    "video": 0.25,
    "mindmap": 0.20,
    "code": 0.20,
    "practice_quiz": 0.10
}

# Completion thresholds per resource type
COMPLETION_THRESHOLDS = {
    "notes": {
        "scroll_depth": 0.80,
        "min_read_time_ratio": 0.60
    },
    "mindmap": {
        "min_nodes_ratio": 0.70
    },
    "video": {
        "min_watch_ratio": 0.80,
        "speed_penalty_threshold": 2.0
    },
    "code": {
        "requires_test_pass": True
    },
    "practice_quiz": {
        "min_questions_ratio": 0.80
    }
}

GATE_SYSTEM_PROMPT = """You are the Resource Completion Evaluator for the A3 learning system.
Your job is to calculate whether a student has engaged sufficiently with their milestone resources to unlock the final milestone quiz.

You will receive a student's resource engagement data and must output a JSON decision object. Output JSON only — no explanation, no markdown, no code fences.

COMPLETION WEIGHTS PER RESOURCE TYPE:
- Lecture notes:    25% of total gate score
- Mind map:         20% of total gate score
- Video:            25% of total gate score
- Code exercise:    20% of total gate score
- Practice quiz:    10% of total gate score

COMPLETION THRESHOLDS PER RESOURCE TYPE:
- Lecture notes:    scroll_depth >= 0.80 AND reading_time >= estimated_read_time * 0.60
- Mind map:         nodes_interacted >= 0.70 of total nodes
- Video:            watch_percentage >= 0.80 (penalize 20% if playback_speed > 2.0)
- Code exercise:    at_least_1_test_passing = true
- Practice quiz:    questions_attempted >= 0.80 of total

SCORING RULE:
For each resource:
  - threshold MET:          award full weight for that resource
  - 50–79% of threshold:    award half weight
  - below 50% of threshold: award zero weight

BYPASS RULE:
If bypass_requested = true, set quiz_unlocked = true and bypass_mode = true regardless of resource engagement. The quiz unlocks immediately. If student passes with >= 85%, mark all resources as retroactively complete.

DECISION RULES for engagement_quality:
- "deep":    2 or more bonus signals triggered
- "surface": gate passed but no bonus signals triggered
- "skipped": gate_score < 0.50

RUSHED THROUGH = true if ANY of:
  - notes read time < estimated_read_time * 0.30
  - video playback_speed > 2.0
  - mindmap avg_time_per_node < 1.5 seconds

BONUS SIGNALS (indicate deep engagement):
- notes: time_spent > (word_count / 200) * 60 seconds
- video: replay_count > 0
- mindmap: avg_time_per_node > 3 seconds
- code: run_count > 3
- practice_quiz: score > 70%

Return this exact JSON structure:
{
  "gate_score": 0.0,  // 0.0 to 1.0, sum of weighted resource scores
  "quiz_unlocked": false,
  "bypass_mode": false,
  "resource_scores": {
    "notes": 0.0,
    "mindmap": 0.0,
    "video": 0.0,
    "code": 0.0,
    "practice_quiz": 0.0
  },
  "engagement_quality": "deep | surface | skipped",
  "engagement_signals": {
    "likely_read_notes": false,
    "replayed_video_sections": false,
    "debugged_code_actively": false,
    "explored_mindmap_deeply": false,
    "rushed_through": false
  },
  "blocking_resources": [],  // Resources preventing quiz unlock
  "recommendation": "max 20 words — what the student should do next"
}"""


class GateAgent:
    """Calculates gate score for milestone quiz unlock."""

    def __init__(self, llm=None):
        self.agent_name = "GateCalculator"
        self.llm = llm or llm_client

    def _build_system_prompt(self, base_prompt: str, profile: Dict[str, Any]) -> str:
        """Build system prompt (simplified for gate calculation)."""
        return base_prompt

    def _calculate_resource_score(self, resource_type: str, data: Dict[str, Any]) -> float:
        """
        Calculate completion score for a single resource type.
        Returns 0.0, 0.5, or 1.0 based on thresholds.
        """
        if not data or not data.get("events"):
            return 0.0

        threshold = COMPLETION_THRESHOLDS.get(resource_type, {})

        if resource_type == "notes":
            scroll = data.get("max_scroll", 0)
            time_spent = data.get("time_spent", 0)
            completion = data.get("completion", 0)
            word_count = data.get("word_count", 0)

            # Check all three criteria: scroll depth, completion, and read time ratio
            scroll_met = scroll >= threshold.get("scroll_depth", 0.80)
            completion_met = completion >= threshold.get("scroll_depth", 0.80)

            # Calculate estimated read time based on word count (200 words per minute)
            if word_count > 0:
                estimated_read_time = (word_count / 200) * 60  # seconds
            else:
                # Fallback: estimate based on completion (assume 5 min for full completion)
                estimated_read_time = 300 * completion if completion > 0 else 60

            min_read_time = estimated_read_time * threshold.get("min_read_time_ratio", 0.60)
            time_met = time_spent >= min_read_time

            if scroll_met and completion_met and time_met:
                return 1.0
            elif (scroll_met or completion_met) and time_spent >= min_read_time * 0.5:  # Partial credit
                return 0.5
            return 0.0

        elif resource_type == "mindmap":
            total_nodes = data.get("total_nodes", 0)
            nodes_interacted = data.get("nodes_interacted", 0)

            if total_nodes > 0:
                actual_completion = nodes_interacted / total_nodes
            else:
                actual_completion = data.get("completion", 0)

            if actual_completion >= threshold.get("min_nodes_ratio", 0.70):
                return 1.0
            elif actual_completion >= threshold.get("min_nodes_ratio", 0.70) * 0.5:
                return 0.5
            return 0.0

        elif resource_type == "video":
            watch_pct = max(data.get("watch_percentage", 0), data.get("completion", 0))
            speed = data.get("playback_speed", 1.0)
            time_spent = data.get("time_spent", 0)
            duration = data.get("duration_seconds", 0)

            # Apply speed penalty
            if speed > threshold["speed_penalty_threshold"]:
                watch_pct *= 0.8

            # Check actual time spent vs expected (for rushed detection)
            if duration > 0 and time_spent > 0:
                expected_time = duration / speed  # Adjusted for playback speed
                actual_watch_ratio = time_spent / expected_time if expected_time > 0 else 0
                # If they watched less than 50% of expected time even with high percentage, penalize
                if actual_watch_ratio < 0.5:
                    watch_pct *= 0.9

            if watch_pct >= threshold["min_watch_ratio"]:
                return 1.0
            elif watch_pct >= threshold["min_watch_ratio"] * 0.5:
                return 0.5
            return 0.0

        elif resource_type == "code":
            if data.get("completion", 0) >= 1.0:
                return 1.0
            tests_passed = data.get("tests_passed", 0)
            if tests_passed >= 1:
                return 1.0
            run_count = data.get("run_count", 0)
            if run_count >= 1:
                return 0.5
            return 0.0

        elif resource_type == "practice_quiz":
            completion = data.get("completion", 0)
            if completion >= threshold["min_questions_ratio"]:
                return 1.0
            elif completion >= threshold["min_questions_ratio"] * 0.5:
                return 0.5
            return 0.0

        return 0.0

    def _detect_engagement_signals(self, resource_data: Dict[str, Any]) -> Dict[str, bool]:
        """Detect bonus engagement signals and rushed behavior."""
        signals = {
            "likely_read_notes": False,
            "replayed_video_sections": False,
            "debugged_code_actively": False,
            "explored_mindmap_deeply": False,
            "rushed_through": False,
            "high_practice_quiz_score": False
        }

        # Notes signals - use actual word count if available
        notes_data = resource_data.get("notes", {})
        time_spent = notes_data.get("time_spent", 0)
        word_count = notes_data.get("word_count", 0)
        if word_count > 0:
            # Expected read time at 200 wpm: (word_count / 200) * 60 seconds
            expected_read_time = (word_count / 200) * 60
            if time_spent > expected_read_time:
                signals["likely_read_notes"] = True
            # Rushed if read time < 30% of expected
            if time_spent < expected_read_time * 0.30:
                signals["rushed_through"] = True
        else:
            # Fallback: use completion-based estimate
            completion = notes_data.get("completion", 0)
            expected_read_time = max(60, int(150 * completion)) if completion > 0 else 60
            if time_spent > expected_read_time:
                signals["likely_read_notes"] = True

        # Video signals
        video_data = resource_data.get("video", {})
        if video_data.get("replay_count", 0) > 0:
            signals["replayed_video_sections"] = True
        if video_data.get("playback_speed", 1.0) > 2.0:
            signals["rushed_through"] = True
        # Video rushed detection: time_spent vs expected
        duration = video_data.get("duration_seconds", 0)
        time_spent = video_data.get("time_spent", 0)
        speed = video_data.get("playback_speed", 1.0)
        if duration > 0 and time_spent > 0:
            expected_time = duration / speed
            if time_spent < expected_time * 0.50:  # Less than 50% of expected time
                signals["rushed_through"] = True

        # Code signals
        code_data = resource_data.get("code", {})
        if code_data.get("run_count", 0) > 3:
            signals["debugged_code_actively"] = True

        # Mindmap signals - now with proper time_spent tracking
        mindmap_data = resource_data.get("mindmap", {})
        total_nodes = mindmap_data.get("total_nodes", 0)
        nodes_interacted = mindmap_data.get("nodes_interacted", 0)
        time_spent = mindmap_data.get("time_spent", 0)
        if total_nodes > 0 and time_spent > 0:
            avg_time = time_spent / total_nodes
            if avg_time > 3:
                signals["explored_mindmap_deeply"] = True
            if avg_time < 1.5:
                signals["rushed_through"] = True

        # Practice quiz signals - now with score tracking
        practice_data = resource_data.get("practice_quiz", {})
        score = practice_data.get("score", 0)
        if score > 0.70:  # 70% threshold for bonus
            signals["high_practice_quiz_score"] = True

        return signals

    def _calculate_gate_locally(self, resource_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate gate score locally without LLM call."""
        resource_scores = {}
        total_score = 0.0

        for rtype, weight in RESOURCE_WEIGHTS.items():
            score = self._calculate_resource_score(rtype, resource_data.get(rtype, {}))
            resource_scores[rtype] = score * weight
            total_score += score * weight

        # Detect engagement signals
        signals = self._detect_engagement_signals(resource_data)

        # Determine engagement quality (include practice quiz score in bonus count)
        bonus_count = sum([
            signals["likely_read_notes"],
            signals["replayed_video_sections"],
            signals["debugged_code_actively"],
            signals["explored_mindmap_deeply"],
            signals.get("high_practice_quiz_score", False)
        ])

        if bonus_count >= 2:
            quality = "deep"
        elif total_score >= 0.80:
            quality = "surface"
        elif total_score < 0.50:
            quality = "skipped"
        else:
            quality = "surface"

        # Determine blocking resources
        blocking = []
        for rtype, score in resource_scores.items():
            if score < RESOURCE_WEIGHTS[rtype] * 0.5:  # Less than half weight earned
                blocking.append(rtype)

        # Generate recommendation
        if total_score >= 0.80:
            recommendation = "Great engagement — you're ready for the quiz!"
        elif blocking:
            rec_parts = []
            if "video" in blocking:
                rec_parts.append("watch the full video")
            if "code" in blocking:
                rec_parts.append("attempt the code exercise")
            if "notes" in blocking:
                rec_parts.append("review the notes")
            if "mindmap" in blocking:
                rec_parts.append("explore the mind map")
            if "practice_quiz" in blocking:
                rec_parts.append("try the practice quiz")
            recommendation = f"Complete: {', '.join(rec_parts)} to unlock the quiz"
        else:
            recommendation = "Keep studying to unlock the quiz"

        return {
            "gate_score": round(total_score, 2),
            "quiz_unlocked": total_score >= 0.80,
            "bypass_mode": False,
            "resource_scores": {k: round(v, 2) for k, v in resource_scores.items()},
            "engagement_quality": quality,
            "engagement_signals": signals,
            "blocking_resources": blocking,
            "recommendation": recommendation
        }

    async def calculate_gate(
        self,
        resource_data: Dict[str, Any],
        bypass_requested: bool = False
    ) -> Dict[str, Any]:
        """
        Calculate gate score for quiz unlock.

        Args:
            resource_data: Aggregated engagement data for each resource type
            bypass_requested: Whether to bypass resource requirements

        Returns:
            Dict with gate_score, quiz_unlocked, engagement_quality, etc.
        """
        try:
            # Handle bypass mode
            if bypass_requested:
                return {
                    "gate_score": 1.0,
                    "quiz_unlocked": True,
                    "bypass_mode": True,
                    "resource_scores": {rtype: 0.0 for rtype in RESOURCE_WEIGHTS},
                    "engagement_quality": "bypass",
                    "engagement_signals": {
                        "likely_read_notes": False,
                        "replayed_video_sections": False,
                        "debugged_code_actively": False,
                        "explored_mindmap_deeply": False,
                        "rushed_through": False
                    },
                    "blocking_resources": [],
                    "recommendation": "Bypass mode: Pass with 85%+ to complete this milestone."
                }

            # Gate score is pure deterministic math - no LLM needed.
            # Using local calculation directly avoids unnecessary latency,
            # cost, and timeouts (previously LLM call could hang 60s+).
            return self._calculate_gate_locally(resource_data)

        except Exception as e:
            logger.error(f"Gate calculation failed: {e}")
            # Return safe default (locked)
            return {
                "gate_score": 0.0,
                "quiz_unlocked": False,
                "bypass_mode": False,
                "resource_scores": {rtype: 0.0 for rtype in RESOURCE_WEIGHTS},
                "engagement_quality": "skipped",
                "engagement_signals": {
                    "likely_read_notes": False,
                    "replayed_video_sections": False,
                    "debugged_code_actively": False,
                    "explored_mindmap_deeply": False,
                    "rushed_through": False
                },
                "blocking_resources": list(RESOURCE_WEIGHTS.keys()),
                "recommendation": "Complete all resources to unlock the quiz"
            }
