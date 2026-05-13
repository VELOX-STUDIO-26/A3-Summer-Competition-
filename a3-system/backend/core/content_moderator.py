"""Pattern-based content moderation for harmful user input and generated output.

This is the self-contained harmful-content filter referenced in the PRD.
It is intentionally **provider-agnostic** (no iFlytek, no OpenAI Moderation
API) so it can run offline in CI and be plugged into any deployment.

Design
------
- Rules live in ``data/moderation_rules.json`` as regex patterns grouped by
  category and severity. This keeps slurs / sensitive phrase lists out of
  the source tree and lets operators tune patterns without redeploying.
- Categories use **phrase patterns**, not bare keyword lists, so legitimate
  educational discussion (e.g. a security course mentioning "buffer
  overflow" or a history class covering WWII) doesn't trip the filter.
- Two strictness modes:
    * ``"balanced"`` (default) — blocks ``high`` severity, warns on
      ``medium`` and ``low``.
    * ``"strict"`` — blocks everything flagged.
- Graceful degradation: if the rules file is missing or malformed the
  moderator becomes a no-op and logs a warning rather than raising.

Public surface
--------------
- ``moderator.moderate(text, strictness)`` → ``ModerationResult``
- ``moderator.redact(text)`` → string with matches replaced by ``[filtered]``
- Module-level ``content_moderator`` singleton for easy imports.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

from core.logging import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

VALID_SEVERITIES = ("low", "medium", "high")
VALID_STRICTNESS = ("balanced", "strict")

# Default user-facing refusal text. Endpoints are free to override.
DEFAULT_REFUSAL = (
    "I'm here to help with learning, but I can't engage with that kind of "
    "content. Let's keep the conversation focused on your studies — what "
    "topic would you like to explore?"
)

# Self-harm category gets a softer, supportive response.
SELF_HARM_REFUSAL = (
    "It sounds like you might be going through something really difficult. "
    "I'm not the right resource for this, but please reach out to a trusted "
    "person or a local crisis helpline — they can help. In the US you can "
    "call or text 988; in the UK you can call Samaritans at 116 123. When "
    "you're ready, I'm here to help you learn."
)


@dataclass
class CategoryMatch:
    """A single category that flagged the text, along with what matched."""

    name: str
    severity: str
    matched_terms: List[str] = field(default_factory=list)


@dataclass
class ModerationResult:
    """Verdict for one piece of text."""

    is_safe: bool
    verdict: str  # "allow" | "warn" | "block"
    categories: List[CategoryMatch] = field(default_factory=list)
    redacted_text: str = ""
    reason: str = ""
    refusal_message: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "is_safe": self.is_safe,
            "verdict": self.verdict,
            "categories": [
                {
                    "name": c.name,
                    "severity": c.severity,
                    "matched_terms": c.matched_terms,
                }
                for c in self.categories
            ],
            "reason": self.reason,
        }


# ---------------------------------------------------------------------------
# Rule loader
# ---------------------------------------------------------------------------


@dataclass
class _CompiledCategory:
    name: str
    severity: str
    patterns: List[re.Pattern]


def _default_rules_path() -> str:
    backend_dir = Path(__file__).resolve().parent.parent
    return str(backend_dir.parent / "data" / "moderation_rules.json")


def _load_rules(path: str) -> List[_CompiledCategory]:
    """Load and compile rules. Returns [] on any failure (non-fatal)."""
    p = Path(path)
    if not p.exists():
        logger.warning(f"Moderation rules not found at {p}")
        return []

    try:
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        logger.warning(f"Failed to parse moderation rules: {e}")
        return []

    compiled: List[_CompiledCategory] = []
    for cat in data.get("categories", []):
        name = cat.get("name")
        severity = cat.get("severity", "medium")
        if not name or severity not in VALID_SEVERITIES:
            logger.warning(f"Skipping malformed moderation category: {cat!r}")
            continue
        patterns: List[re.Pattern] = []
        for raw in cat.get("patterns", []):
            try:
                patterns.append(re.compile(raw, re.IGNORECASE))
            except re.error as e:
                logger.warning(f"Bad regex in category {name}: {raw!r} ({e})")
        if patterns:
            compiled.append(_CompiledCategory(name=name, severity=severity, patterns=patterns))

    logger.info(f"Loaded {len(compiled)} moderation categories from {p}")
    return compiled


# ---------------------------------------------------------------------------
# Moderator
# ---------------------------------------------------------------------------


class ContentModerator:
    """Pattern-based moderator. Thread-safe (all state is read-only after load)."""

    def __init__(
        self,
        rules_path: Optional[str] = None,
        enabled: bool = True,
        default_strictness: str = "balanced",
    ):
        self.enabled = enabled
        self.default_strictness = (
            default_strictness if default_strictness in VALID_STRICTNESS else "balanced"
        )
        self._rules = _load_rules(rules_path or _default_rules_path())

    # ------------------------------------------------------------------
    # Core API
    # ------------------------------------------------------------------

    def moderate(
        self,
        text: str,
        strictness: Optional[str] = None,
    ) -> ModerationResult:
        """Evaluate ``text`` against every category and return a verdict."""
        if not self.enabled or not text or not text.strip():
            return ModerationResult(is_safe=True, verdict="allow", redacted_text=text or "")

        mode = strictness if strictness in VALID_STRICTNESS else self.default_strictness
        matches: List[CategoryMatch] = []

        for category in self._rules:
            matched_terms: List[str] = []
            for pat in category.patterns:
                for m in pat.finditer(text):
                    term = m.group(0)
                    if term not in matched_terms:
                        matched_terms.append(term)
            if matched_terms:
                matches.append(CategoryMatch(
                    name=category.name,
                    severity=category.severity,
                    matched_terms=matched_terms,
                ))

        if not matches:
            return ModerationResult(is_safe=True, verdict="allow", redacted_text=text)

        # Determine verdict
        severities = {m.severity for m in matches}
        if mode == "strict":
            verdict = "block"
        elif "high" in severities:
            verdict = "block"
        elif "medium" in severities:
            verdict = "warn"
        else:
            verdict = "warn"

        reason = ", ".join(f"{m.name}({m.severity})" for m in matches)

        refusal = None
        if verdict == "block":
            refusal = (
                SELF_HARM_REFUSAL
                if any(m.name == "self_harm" for m in matches)
                else DEFAULT_REFUSAL
            )

        return ModerationResult(
            is_safe=(verdict != "block"),
            verdict=verdict,
            categories=matches,
            redacted_text=self.redact(text),
            reason=reason,
            refusal_message=refusal,
        )

    def redact(self, text: str) -> str:
        """Replace every matched span across all categories with ``[filtered]``."""
        if not self.enabled or not text:
            return text or ""
        redacted = text
        for category in self._rules:
            for pat in category.patterns:
                redacted = pat.sub("[filtered]", redacted)
        return redacted


# Module-level singleton
content_moderator = ContentModerator()
