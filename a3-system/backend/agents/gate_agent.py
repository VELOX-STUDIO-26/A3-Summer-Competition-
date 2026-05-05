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
            # Estimate read time: assume 200 words per minute
            completion = data.get("completion", 0)

            if scroll >= threshold["scroll_depth"] and completion >= threshold["scroll_depth"]:
                return 1.0
            elif scroll >= threshold["scroll_depth"] * 0.5 or completion >= threshold["scroll_depth"] * 0.5:
                return 0.5
            return 0.0

        elif resource_type == "mindmap":
            completion = data.get("completion", 0)
            if completion >= threshold["min_nodes_ratio"]:
                return 1.0
            elif completion >= threshold["min_nodes_ratio"] * 0.5:
                return 0.5
            return 0.0

        elif resource_type == "video":
            watch_pct = max(data.get("watch_percentage", 0), data.get("completion", 0))
            speed = data.get("playback_speed", 1.0)

            # Apply speed penalty
            if speed > threshold["speed_penalty_threshold"]:
                watch_pct *= 0.8

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
            "rushed_through": False
        }

        # Notes signals
        notes_data = resource_data.get("notes", {})
        time_spent = notes_data.get("time_spent", 0)
        # Assume 5 min read time for ~1000 words
        if time_spent > 180:  # 3+ minutes
            signals["likely_read_notes"] = True

        # Video signals
        video_data = resource_data.get("video", {})
        if video_data.get("replay_count", 0) > 0:
            signals["replayed_video_sections"] = True
        if video_data.get("playback_speed", 1.0) > 2.0:
            signals["rushed_through"] = True

        # Code signals
        code_data = resource_data.get("code", {})
        if code_data.get("run_count", 0) > 3:
            signals["debugged_code_actively"] = True

        # Mindmap signals
        mindmap_data = resource_data.get("mindmap", {})
        total_nodes = mindmap_data.get("total_nodes", 0)
        nodes_interacted = mindmap_data.get("nodes_interacted", 0)
        if total_nodes > 0:
            avg_time = mindmap_data.get("time_spent", 0) / total_nodes
            if avg_time > 3:
                signals["explored_mindmap_deeply"] = True
            if avg_time < 1.5:
                signals["rushed_through"] = True

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

        # Determine engagement quality
        bonus_count = sum([
            signals["likely_read_notes"],
            signals["replayed_video_sections"],
            signals["debugged_code_actively"],
            signals["explored_mindmap_deeply"]
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
