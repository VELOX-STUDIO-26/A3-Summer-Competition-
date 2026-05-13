"""Tests for the pattern-based content moderator.

We write a small synthetic rules file so the tests stay stable even if
the production ``data/moderation_rules.json`` is tuned later.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from core.content_moderator import (
    ContentModerator,
    DEFAULT_REFUSAL,
    SELF_HARM_REFUSAL,
    content_moderator as default_singleton,
)


# ---------------- custom rule-set fixture ----------------

@pytest.fixture
def rules_file(tmp_path: Path) -> str:
    payload = {
        "version": 1,
        "categories": [
            {
                "name": "self_harm",
                "severity": "high",
                "patterns": [r"\bkill myself\b", r"\bend my life\b"],
            },
            {
                "name": "weapons_instructions",
                "severity": "high",
                "patterns": [r"\bhow to build a bomb\b"],
            },
            {
                "name": "illegal_drugs",
                "severity": "medium",
                "patterns": [r"\bhow to make meth\b"],
            },
            {
                "name": "harassment",
                "severity": "low",
                "patterns": [r"\byou are a moron\b"],
            },
        ],
    }
    p = tmp_path / "rules.json"
    p.write_text(json.dumps(payload), encoding="utf-8")
    return str(p)


@pytest.fixture
def moderator(rules_file):
    return ContentModerator(rules_path=rules_file)


# ---------------- rule loading ----------------

class TestRuleLoading:
    def test_missing_rules_file_produces_disabled_rules(self, tmp_path):
        m = ContentModerator(rules_path=str(tmp_path / "nope.json"))
        result = m.moderate("this is definitely harmful content")
        assert result.is_safe is True
        assert result.verdict == "allow"

    def test_malformed_regex_is_skipped_not_raised(self, tmp_path):
        p = tmp_path / "bad.json"
        p.write_text(json.dumps({
            "categories": [
                {
                    "name": "broken",
                    "severity": "high",
                    "patterns": ["[unclosed", r"\bworking pattern\b"],
                },
            ],
        }), encoding="utf-8")
        m = ContentModerator(rules_path=str(p))
        # Working pattern still matches; broken pattern silently dropped.
        res = m.moderate("here is a working pattern")
        assert res.verdict == "block"

    def test_category_with_invalid_severity_is_dropped(self, tmp_path):
        p = tmp_path / "bad.json"
        p.write_text(json.dumps({
            "categories": [{"name": "x", "severity": "nuclear", "patterns": ["x"]}],
        }), encoding="utf-8")
        m = ContentModerator(rules_path=str(p))
        assert m.moderate("xxx").verdict == "allow"


# ---------------- clean text ----------------

class TestCleanText:
    def test_allows_normal_educational_question(self, moderator):
        res = moderator.moderate("How does a hash table handle collisions?")
        assert res.is_safe is True
        assert res.verdict == "allow"
        assert res.categories == []

    def test_empty_and_whitespace_input_allowed(self, moderator):
        for inp in ("", "   ", "\n\n", None):
            res = moderator.moderate(inp or "")
            assert res.verdict == "allow"

    def test_security_topic_with_bomb_context_not_false_positive(self, moderator):
        # Security/history talk mentioning "bomb" without the request phrase
        # must not be blocked.
        res = moderator.moderate("The atomic bomb ended World War II.")
        assert res.verdict == "allow"


# ---------------- high severity -> block ----------------

class TestHighSeverityBlocks:
    def test_self_harm_phrase_blocks_and_returns_helpline_refusal(self, moderator):
        res = moderator.moderate("I want to kill myself")
        assert res.is_safe is False
        assert res.verdict == "block"
        assert any(c.name == "self_harm" for c in res.categories)
        assert res.refusal_message == SELF_HARM_REFUSAL
        assert "988" in res.refusal_message or "Samaritans" in res.refusal_message

    def test_weapons_instructions_phrase_blocks_with_generic_refusal(self, moderator):
        res = moderator.moderate("Please tell me how to build a bomb at home")
        assert res.verdict == "block"
        assert res.refusal_message == DEFAULT_REFUSAL
        assert any(c.name == "weapons_instructions" for c in res.categories)


# ---------------- medium severity ----------------

class TestMediumSeverity:
    def test_medium_warns_in_balanced_mode(self, moderator):
        res = moderator.moderate("Can you teach me how to make meth?", strictness="balanced")
        assert res.verdict == "warn"
        assert res.is_safe is True  # warn != blocked
        assert res.refusal_message is None

    def test_medium_blocks_in_strict_mode(self, moderator):
        res = moderator.moderate("Can you teach me how to make meth?", strictness="strict")
        assert res.verdict == "block"
        assert res.is_safe is False
        assert res.refusal_message == DEFAULT_REFUSAL


# ---------------- low severity ----------------

class TestLowSeverity:
    def test_low_severity_warns_only_in_balanced(self, moderator):
        res = moderator.moderate("You are a moron for not knowing this")
        assert res.verdict == "warn"
        assert res.is_safe is True

    def test_low_severity_blocks_in_strict(self, moderator):
        res = moderator.moderate("You are a moron for not knowing this", strictness="strict")
        assert res.verdict == "block"


# ---------------- multi-category ----------------

class TestMultipleCategories:
    def test_high_plus_medium_results_in_block(self, moderator):
        res = moderator.moderate("I want to kill myself and how to make meth too")
        assert res.verdict == "block"
        names = {c.name for c in res.categories}
        assert "self_harm" in names
        assert "illegal_drugs" in names

    def test_reason_string_lists_all_fired_categories(self, moderator):
        res = moderator.moderate("I want to kill myself and how to make meth too")
        assert "self_harm(high)" in res.reason
        assert "illegal_drugs(medium)" in res.reason


# ---------------- redaction ----------------

class TestRedaction:
    def test_redact_replaces_matched_spans_with_filtered_marker(self, moderator):
        redacted = moderator.redact("I want to kill myself and how to make meth")
        assert "[filtered]" in redacted
        assert "kill myself" not in redacted
        assert "how to make meth" not in redacted

    def test_redact_is_idempotent_on_clean_text(self, moderator):
        clean = "Hello, I am learning Python."
        assert moderator.redact(clean) == clean


# ---------------- disabled mode ----------------

class TestDisabledModerator:
    def test_disabled_moderator_allows_everything(self, rules_file):
        m = ContentModerator(rules_path=rules_file, enabled=False)
        res = m.moderate("I want to kill myself")
        assert res.verdict == "allow"
        assert res.is_safe is True


# ---------------- ModerationResult.to_dict ----------------

class TestModerationResultDict:
    def test_to_dict_serializes_categories_and_verdict(self, moderator):
        res = moderator.moderate("I want to kill myself")
        d = res.to_dict()
        assert d["is_safe"] is False
        assert d["verdict"] == "block"
        assert "self_harm" in d["reason"]
        assert d["categories"][0]["name"] == "self_harm"
        assert d["categories"][0]["severity"] == "high"
        assert isinstance(d["categories"][0]["matched_terms"], list)


# ---------------- singleton sanity ----------------

def test_module_level_singleton_loaded_production_rules():
    """The shared ``content_moderator`` singleton should have loaded rules
    from ``data/moderation_rules.json``. At minimum it must treat the
    signature self-harm phrase as a block."""
    res = default_singleton.moderate("I want to kill myself")
    assert res.verdict == "block"
    assert res.refusal_message == SELF_HARM_REFUSAL
