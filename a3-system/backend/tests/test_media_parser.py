"""
Unit tests for ``MediaAgent._parse_slides_json`` — the salvage parser
that recovers as many fully-formed slides as possible when the LLM's
JSON response is truncated.

This is the regression suite for the bug where free-tier OpenRouter
responses were cut off mid-array, json.loads failed, and the agent
fell back to a single placeholder slide.
"""
from __future__ import annotations

import json

import pytest

from agents.media_agent import MediaAgent


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------

class TestHappyPath:
    def test_parses_clean_json(self):
        payload = {
            "title": "IaaS",
            "slides": [
                {"number": 1, "header": "Intro", "bullets": ["a"], "script": "hi", "duration_seconds": 15},
                {"number": 2, "header": "More", "bullets": ["b"], "script": "yo", "duration_seconds": 20},
            ],
            "total_duration_seconds": 35,
        }
        result = MediaAgent._parse_slides_json(json.dumps(payload))
        assert result["title"] == "IaaS"
        assert len(result["slides"]) == 2
        assert result["total_duration_seconds"] == 35

    def test_parses_json_wrapped_in_markdown_fences(self):
        payload = {"title": "T", "slides": [{"number": 1, "header": "H"}]}
        wrapped = f"Here you go:\n```json\n{json.dumps(payload)}\n```\nThanks!"
        result = MediaAgent._parse_slides_json(wrapped)
        assert result["title"] == "T"
        assert len(result["slides"]) == 1


# ---------------------------------------------------------------------------
# Truncation salvage — the actual bug scenario
# ---------------------------------------------------------------------------

class TestTruncationSalvage:
    def _build_truncated_response(self, complete_slides: int, partial: bool) -> str:
        """Construct a fake LLM output with N complete slides + an optional
        partial cut-off slide at the end."""
        slides = []
        for i in range(complete_slides):
            slides.append({
                "number": i + 1,
                "header": f"Slide {i + 1}",
                "bullets": ["point a", "point b"],
                "script": f"Script for slide {i + 1}",
                "duration_seconds": 30,
            })
        body = '{"title": "Cloud Computing", "slides": ['
        body += ", ".join(json.dumps(s) for s in slides)
        if partial:
            # Add a half-written slide to simulate a mid-object cut
            body += ', {"number": 99, "header": "Cut-off", "bullets": ["incomp'
        # Note: we deliberately do NOT close the array or root object
        return body

    def test_salvages_complete_slides_when_array_unterminated(self):
        text = self._build_truncated_response(complete_slides=5, partial=False)
        result = MediaAgent._parse_slides_json(text)
        assert len(result["slides"]) == 5
        assert result["title"] == "Cloud Computing"
        # Numbers should be in order
        assert [s["number"] for s in result["slides"]] == [1, 2, 3, 4, 5]

    def test_drops_partial_slide_at_truncation_point(self):
        text = self._build_truncated_response(complete_slides=4, partial=True)
        result = MediaAgent._parse_slides_json(text)
        # Exactly the 4 complete slides — the half-written one is discarded
        assert len(result["slides"]) == 4
        assert all(s["number"] != 99 for s in result["slides"])

    def test_total_duration_is_recomputed_from_salvaged_slides(self):
        text = self._build_truncated_response(complete_slides=3, partial=True)
        result = MediaAgent._parse_slides_json(text)
        assert result["total_duration_seconds"] == 3 * 30

    def test_handles_braces_inside_string_values(self):
        """Braces inside script strings must not confuse the brace counter."""
        slide = {
            "number": 1,
            "header": "Code",
            "bullets": ["{"],
            "script": "Here is code: { foo: 'bar' } and } more } stuff",
            "duration_seconds": 25,
        }
        text = '{"title": "T", "slides": [' + json.dumps(slide) + ', {"number": 2, "header'  # truncated
        result = MediaAgent._parse_slides_json(text)
        assert len(result["slides"]) == 1
        assert result["slides"][0]["script"].startswith("Here is code")


# ---------------------------------------------------------------------------
# Failure modes
# ---------------------------------------------------------------------------

class TestFailureModes:
    def test_no_slides_array_raises(self):
        with pytest.raises(ValueError, match="no slides array"):
            MediaAgent._parse_slides_json("Sorry, I can't help with that.")

    def test_zero_salvageable_slides_raises(self):
        # Has the marker but no complete object before truncation
        text = '{"title": "X", "slides": [{"number": 1, "header": "Cut'
        with pytest.raises(ValueError, match="zero salvageable"):
            MediaAgent._parse_slides_json(text)

    def test_completely_garbage_input_raises(self):
        with pytest.raises(ValueError):
            MediaAgent._parse_slides_json("this is not json at all 12345")
