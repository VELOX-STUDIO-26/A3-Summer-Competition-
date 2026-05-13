"""Conversation manager with rolling context window and summarization.

Keeps recent messages in full while compressing older turns into a
running summary.  This prevents token overflow without losing pedagogical
context (student goals, misconceptions, prior explanations).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from core.llm_client import llm_client
from core.logging import get_logger

logger = get_logger(__name__)

# Number of recent turns to keep verbatim.  A "turn" is a user message +
# assistant reply, so 6 turns ~= 12 messages.  This is a token-count
# proxy: tutoring messages are short (~100-300 tokens each).
DEFAULT_FULL_TURNS = 6

# Maximum length of the compressed summary in characters.
MAX_SUMMARY_CHARS = 1500


@dataclass
class Turn:
    """One user/assistant exchange."""

    role: str
    content: str
    content_type: str = "text"

    def to_dict(self) -> Dict[str, str]:
        return {
            "role": self.role,
            "content": self.content,
            "content_type": self.content_type,
        }


class ConversationManager:
    """Manages a rolling context window with LLM-powered summarization.

    Usage::

        conv = ConversationManager()
        conv.add_message("user", "What is a VPC?")
        conv.add_message("assistant", "A VPC is...")
        # ... many more turns ...
        context = conv.get_context()   # [summary system msg] + [recent turns]
    """

    def __init__(
        self,
        summary: str = "",
        recent_turns: Optional[List[Turn]] = None,
        full_turns_limit: int = DEFAULT_FULL_TURNS,
    ):
        self.summary = summary
        self.recent = recent_turns or []
        self.full_turns_limit = full_turns_limit

    # ------------------------------------------------------------------
    # Persistence helpers
    # ------------------------------------------------------------------

    @classmethod
    def from_db(
        cls,
        summary: Optional[str],
        recent_messages: List[Dict[str, str]],
        full_turns_limit: int = DEFAULT_FULL_TURNS,
    ) -> "ConversationManager":
        """Restore from database state."""
        turns = [Turn(**m) for m in recent_messages]
        return cls(
            summary=summary or "",
            recent_turns=turns,
            full_turns_limit=full_turns_limit,
        )

    # ------------------------------------------------------------------
    # Core operations
    # ------------------------------------------------------------------

    def add_message(self, role: str, content: str, content_type: str = "text") -> None:
        """Add a message and trigger summarization if needed."""
        self.recent.append(Turn(role=role, content=content, content_type=content_type))
        self._maybe_summarize()

    def get_context(self) -> List[Dict[str, str]]:
        """Build LLM context list: summary as system msg + recent turns."""
        out: List[Dict[str, str]] = []
        if self.summary:
            out.append({
                "role": "system",
                "content": (
                    "Earlier in this conversation:\n"
                    f"{self.summary}\n"
                    "Continue naturally from where you left off."
                ),
            })
        for turn in self.recent:
            out.append({"role": turn.role, "content": turn.content})
        return out

    def get_summary(self) -> str:
        return self.summary

    def get_recent_messages(self) -> List[Dict[str, str]]:
        """Return recent messages for database persistence."""
        return [t.to_dict() for t in self.recent]

    # ------------------------------------------------------------------
    # Summarization
    # ------------------------------------------------------------------

    def _maybe_summarize(self) -> None:
        """If we have too many full turns, compress the oldest ones."""
        # Count complete turns (pairs of user + assistant)
        turn_count = len(self.recent) // 2
        if turn_count <= self.full_turns_limit:
            return

        # Move the oldest complete turn(s) into the summary.
        # We extract 2 full turns at a time to amortize LLM calls.
        turns_to_compress = self.recent[:4]  # 2 user + 2 assistant
        self.recent = self.recent[4:]

        self.summary = self._summarize_chunk(
            existing_summary=self.summary,
            new_messages=turns_to_compress,
        )

    def _summarize_chunk(
        self,
        existing_summary: str,
        new_messages: List[Turn],
    ) -> str:
        """Ask the LLM to compress conversation history."""
        transcript = "\n".join(
            f"{t.role}: {t.content[:500]}" for t in new_messages
        )

        prompt = f"""You are maintaining context for an AI tutor.
Summarize this conversation segment concisely.

Key elements to preserve:
- Topic / concept discussed
- Student's current understanding level
- Misconceptions or knowledge gaps identified
- Learning goals mentioned
- Examples or analogies that resonated

Omit greetings, pleasantries, and exact code snippets.
Keep under 200 words.

{("Previous summary:\n" + existing_summary) if existing_summary else ""}

New conversation:
{transcript}

Updated summary:"""

        try:
            response = llm_client.generate(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=400,
            )
            if isinstance(response, dict):
                # Handle OpenRouter-style response
                if "choices" in response and response["choices"]:
                    text = response["choices"][0].get("message", {}).get("content", "")
                elif "content" in response:
                    text = response["content"]
                else:
                    text = json.dumps(response)
            else:
                text = str(response)

            text = text.strip()
            if len(text) > MAX_SUMMARY_CHARS:
                text = text[:MAX_SUMMARY_CHARS] + "..."
            return text
        except Exception as e:
            logger.error(f"Summarization failed: {e}")
            # Fallback: truncate existing summary + add placeholder
            fallback = f"{existing_summary}\n[Student discussed more topics.]"
            return fallback[:MAX_SUMMARY_CHARS]
