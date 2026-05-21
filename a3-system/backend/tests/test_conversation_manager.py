"""Unit tests for the ConversationManager class.

Tests rolling context window with LLM-powered summarization.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from core.conversation_manager import (
    DEFAULT_FULL_TURNS,
    MAX_SUMMARY_CHARS,
    ConversationManager,
    Turn,
)


class TestTurn:
    """Tests for the Turn dataclass."""

    def test_turn_creation(self):
        """Test creating a Turn instance."""
        turn = Turn(role="user", content="Hello", content_type="text")
        assert turn.role == "user"
        assert turn.content == "Hello"
        assert turn.content_type == "text"

    def test_turn_to_dict(self):
        """Test converting Turn to dictionary."""
        turn = Turn(role="assistant", content="Hi there", content_type="text")
        result = turn.to_dict()
        assert result == {
            "role": "assistant",
            "content": "Hi there",
            "content_type": "text",
        }


class TestConversationManagerInitialization:
    """Tests for ConversationManager initialization."""

    def test_default_initialization(self):
        """Test creating manager with default values."""
        mgr = ConversationManager()
        assert mgr.summary == ""
        assert mgr.recent == []
        assert mgr.full_turns_limit == DEFAULT_FULL_TURNS

    def test_custom_initialization(self):
        """Test creating manager with custom values."""
        mgr = ConversationManager(
            summary="Previous discussion about Docker",
            recent_turns=[Turn("user", "What is a container?")],
            full_turns_limit=4,
        )
        assert mgr.summary == "Previous discussion about Docker"
        assert len(mgr.recent) == 1
        assert mgr.full_turns_limit == 4

    def test_from_db_factory(self):
        """Test restoring from database state."""
        recent_messages = [
            {"role": "user", "content": "Question?", "content_type": "text"},
            {"role": "assistant", "content": "Answer!", "content_type": "text"},
        ]
        mgr = ConversationManager.from_db(
            summary="Existing summary",
            recent_messages=recent_messages,
        )
        assert mgr.summary == "Existing summary"
        assert len(mgr.recent) == 2
        assert mgr.recent[0].role == "user"
        assert mgr.recent[1].role == "assistant"

    def test_from_db_with_none_summary(self):
        """Test restoring when summary is None."""
        mgr = ConversationManager.from_db(
            summary=None,
            recent_messages=[],
        )
        assert mgr.summary == ""


class TestAddMessage:
    """Tests for add_message method."""

    @pytest.mark.asyncio
    async def test_add_message_appends(self):
        """Test that messages are appended to recent list."""
        mgr = ConversationManager()
        await mgr.add_message("user", "Hello")
        assert len(mgr.recent) == 1
        assert mgr.recent[0].role == "user"
        assert mgr.recent[0].content == "Hello"

    @pytest.mark.asyncio
    async def test_add_multiple_messages(self):
        """Test adding multiple messages."""
        mgr = ConversationManager()
        await mgr.add_message("user", "Q1")
        await mgr.add_message("assistant", "A1")
        await mgr.add_message("user", "Q2")
        assert len(mgr.recent) == 3
        assert mgr.recent[2].content == "Q2"

    @pytest.mark.asyncio
    async def test_add_message_with_content_type(self):
        """Test adding message with custom content type."""
        mgr = ConversationManager()
        await mgr.add_message("user", "code", content_type="code")
        assert mgr.recent[0].content_type == "code"

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    async def test_summarization_triggered_at_threshold(self, mock_llm):
        """Test that summarization triggers when exceeding turn limit."""
        mock_llm.generate = AsyncMock(return_value={"content": "Summary of old topics"})

        mgr = ConversationManager(full_turns_limit=2)

        # Add 5 turns (10 messages) - should trigger summarization after 2nd turn
        await mgr.add_message("user", "Q1")
        await mgr.add_message("assistant", "A1")
        await mgr.add_message("user", "Q2")
        await mgr.add_message("assistant", "A2")
        await mgr.add_message("user", "Q3")  # Exceeds 2 turns, triggers summarize
        await mgr.add_message("assistant", "A3")
        await mgr.add_message("user", "Q4")
        await mgr.add_message("assistant", "A4")
        await mgr.add_message("user", "Q5")
        await mgr.add_message("assistant", "A5")  # Another 2 turns, triggers again

        # Should have called summarize twice
        assert mock_llm.generate.call_count == 2
        # Should have summary from first batch
        assert "Summary" in mgr.summary
        # Recent should only have last 2 turns (4 messages) + current partial
        assert len(mgr.recent) <= 5  # 4 messages from last 2 turns + 1 partial

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    async def test_no_summarization_below_threshold(self, mock_llm):
        """Test that summarization doesn't trigger below threshold."""
        mock_llm.generate = AsyncMock(return_value={"content": "Summary"})

        mgr = ConversationManager(full_turns_limit=6)

        # Add exactly 6 turns (12 messages) - should NOT trigger
        for i in range(6):
            await mgr.add_message("user", f"Q{i}")
            await mgr.add_message("assistant", f"A{i}")

        # Should not have called LLM
        mock_llm.generate.assert_not_called()
        assert mgr.summary == ""


class TestGetContext:
    """Tests for get_context method."""

    def test_empty_context(self):
        """Test getting context when empty."""
        mgr = ConversationManager()
        context = mgr.get_context()
        assert context == []

    @pytest.mark.asyncio
    async def test_context_with_only_recent(self):
        """Test context with only recent messages (no summary)."""
        mgr = ConversationManager()
        await mgr.add_message("user", "Hello")
        await mgr.add_message("assistant", "Hi")

        context = mgr.get_context()
        assert len(context) == 2
        assert context[0]["role"] == "user"
        assert context[1]["role"] == "assistant"

    @pytest.mark.asyncio
    async def test_context_with_summary(self):
        """Test context includes summary as system message."""
        mgr = ConversationManager(summary="Earlier discussion about VPCs")
        await mgr.add_message("user", "What about subnets?")
        await mgr.add_message("assistant", "Subnets are...")

        context = mgr.get_context()
        assert len(context) == 3
        assert context[0]["role"] == "system"
        assert "Earlier in this conversation" in context[0]["content"]
        assert "VPCs" in context[0]["content"]
        assert context[1]["role"] == "user"
        assert context[2]["role"] == "assistant"

    @pytest.mark.asyncio
    async def test_context_format(self):
        """Test that context items are properly formatted dicts."""
        mgr = ConversationManager()
        await mgr.add_message("user", "Question", content_type="text")

        context = mgr.get_context()
        assert isinstance(context, list)
        assert len(context) == 1
        assert context[0] == {"role": "user", "content": "Question"}


class TestSummarizeChunk:
    """Tests for _summarize_chunk method."""

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    async def test_summarize_chunk_basic(self, mock_llm):
        """Test basic summarization flow."""
        mock_llm.generate = AsyncMock(return_value={
            "choices": [{"message": {"content": "Discussed Docker basics"}}]
        })

        mgr = ConversationManager()
        turns = [
            Turn("user", "What is Docker?"),
            Turn("assistant", "Docker is containerization..."),
        ]

        result = await mgr._summarize_chunk("", turns)

        assert result == "Discussed Docker basics"
        mock_llm.generate.assert_called_once()

        # Verify prompt structure
        call_args = mock_llm.generate.call_args
        assert call_args[1]["temperature"] == 0.3
        assert call_args[1]["max_tokens"] == 400

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    async def test_summarize_chunk_with_existing_summary(self, mock_llm):
        """Test summarization with existing summary."""
        mock_llm.generate = AsyncMock(return_value={
            "content": "Previous plus new discussion"
        })

        mgr = ConversationManager()
        turns = [Turn("user", "Q"), Turn("assistant", "A")]

        await mgr._summarize_chunk("Existing summary", turns)

        # Verify existing summary is in prompt
        call_args = mock_llm.generate.call_args[1]
        prompt = call_args["messages"][0]["content"]
        assert "Previous summary:" in prompt
        assert "Existing summary" in prompt

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    async def test_summarize_chunk_truncates_long_content(self, mock_llm):
        """Test that message content is truncated to 500 chars."""
        mock_llm.generate = AsyncMock(return_value={"content": "Summary"})

        mgr = ConversationManager()
        long_content = "x" * 1000
        turns = [Turn("user", long_content)]

        await mgr._summarize_chunk("", turns)

        call_args = mock_llm.generate.call_args[1]
        prompt = call_args["messages"][0]["content"]
        # Should truncate to 500 chars + "..." if longer
        assert len(prompt) < len(long_content) * 2

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    async def test_summarize_chunk_truncates_long_response(self, mock_llm):
        """Test that response is truncated to MAX_SUMMARY_CHARS."""
        long_summary = "x" * (MAX_SUMMARY_CHARS + 100)
        mock_llm.generate = AsyncMock(return_value={"content": long_summary})

        mgr = ConversationManager()
        turns = [Turn("user", "Q")]

        result = await mgr._summarize_chunk("", turns)

        assert len(result) <= MAX_SUMMARY_CHARS + 3  # +3 for "..."
        assert result.endswith("...")

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    @patch("core.conversation_manager.logger")
    async def test_summarize_chunk_handles_dict_response(self, mock_logger, mock_llm):
        """Test handling OpenRouter-style dict response."""
        mock_llm.generate = AsyncMock(return_value={
            "choices": [{"message": {"content": "Summary text"}}]
        })

        mgr = ConversationManager()
        turns = [Turn("user", "Q")]

        result = await mgr._summarize_chunk("", turns)
        assert result == "Summary text"

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    @patch("core.conversation_manager.logger")
    async def test_summarize_chunk_handles_string_response(self, mock_logger, mock_llm):
        """Test handling string response."""
        mock_llm.generate = AsyncMock(return_value="Plain string summary")

        mgr = ConversationManager()
        turns = [Turn("user", "Q")]

        result = await mgr._summarize_chunk("", turns)
        assert result == "Plain string summary"

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    @patch("core.conversation_manager.logger")
    async def test_summarize_chunk_fallback_on_exception(self, mock_logger, mock_llm):
        """Test fallback when LLM call fails."""
        mock_llm.generate = AsyncMock(side_effect=Exception("LLM error"))

        mgr = ConversationManager()
        turns = [Turn("user", "Q")]

        result = await mgr._summarize_chunk("Existing summary", turns)

        # Should log error
        mock_logger.error.assert_called_once()
        # Should return fallback
        assert "Existing summary" in result
        assert "[Student discussed more topics.]" in result

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    async def test_summarize_chunk_handles_content_field(self, mock_llm):
        """Test handling response with 'content' field directly."""
        mock_llm.generate = AsyncMock(return_value={"content": "Direct content"})

        mgr = ConversationManager()
        turns = [Turn("user", "Q")]

        result = await mgr._summarize_chunk("", turns)
        assert result == "Direct content"

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    async def test_summarize_chunk_handles_unknown_response(self, mock_llm):
        """Test handling unexpected response structure."""
        mock_llm.generate = AsyncMock(return_value={"unexpected": "structure"})

        mgr = ConversationManager()
        turns = [Turn("user", "Q")]

        result = await mgr._summarize_chunk("", turns)
        # Should JSON stringify
        assert "unexpected" in result


class TestGetSummary:
    """Tests for get_summary method."""

    def test_get_summary_returns_current(self):
        """Test getting current summary."""
        mgr = ConversationManager(summary="Current summary")
        assert mgr.get_summary() == "Current summary"

    def test_get_summary_empty(self):
        """Test getting empty summary."""
        mgr = ConversationManager()
        assert mgr.get_summary() == ""


class TestGetRecentMessages:
    """Tests for get_recent_messages method."""

    @pytest.mark.asyncio
    async def test_get_recent_messages(self):
        """Test getting recent messages for persistence."""
        mgr = ConversationManager()
        await mgr.add_message("user", "Q1")
        await mgr.add_message("assistant", "A1")

        recent = mgr.get_recent_messages()
        assert len(recent) == 2
        assert recent[0] == {"role": "user", "content": "Q1", "content_type": "text"}
        assert recent[1] == {"role": "assistant", "content": "A1", "content_type": "text"}


class TestEdgeCases:
    """Edge case tests."""

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    async def test_exactly_at_threshold_boundary(self, mock_llm):
        """Test behavior exactly at the threshold."""
        mock_llm.generate = AsyncMock(return_value={"content": "Summary"})

        mgr = ConversationManager(full_turns_limit=3)

        # Add exactly 6 messages = 3 turns (at threshold, should NOT trigger)
        for i in range(3):
            await mgr.add_message("user", f"Q{i}")
            await mgr.add_message("assistant", f"A{i}")

        # Should not have called LLM yet
        mock_llm.generate.assert_not_called()

        # Add 2 more messages to exceed threshold (4th turn)
        await mgr.add_message("user", "Extra Q")
        await mgr.add_message("assistant", "Extra A")

        # Now should trigger
        mock_llm.generate.assert_called_once()

    @pytest.mark.asyncio
    async def test_content_type_preservation(self):
        """Test that content types are preserved."""
        mgr = ConversationManager()
        await mgr.add_message("user", "diagram content", content_type="diagram")
        await mgr.add_message("assistant", "code content", content_type="code")

        recent = mgr.get_recent_messages()
        assert recent[0]["content_type"] == "diagram"
        assert recent[1]["content_type"] == "code"

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    async def test_multiple_summarization_cycles(self, mock_llm):
        """Test multiple summarization cycles accumulate correctly."""
        mock_llm.generate = AsyncMock(side_effect=[
            {"content": "First batch summary"},
            {"content": "Second batch summary"},
        ])

        mgr = ConversationManager(full_turns_limit=2)

        # First cycle: 3 turns
        await mgr.add_message("user", "Q1")
        await mgr.add_message("assistant", "A1")
        await mgr.add_message("user", "Q2")
        await mgr.add_message("assistant", "A2")
        await mgr.add_message("user", "Q3")
        await mgr.add_message("assistant", "A3")  # Triggers first summarize

        # Second cycle: 2 more turns
        await mgr.add_message("user", "Q4")
        await mgr.add_message("assistant", "A4")
        await mgr.add_message("user", "Q5")
        await mgr.add_message("assistant", "A5")  # Triggers second summarize

        # Summary should contain both batches
        assert mock_llm.generate.call_count == 2
        final_summary = mgr.get_summary()
        # The second call would have included first summary
        assert "Second batch" in final_summary

    @pytest.mark.asyncio
    async def test_empty_messages_in_context(self):
        """Test handling of empty content in context."""
        mgr = ConversationManager()
        await mgr.add_message("user", "")

        context = mgr.get_context()
        assert len(context) == 1
        assert context[0]["content"] == ""

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    async def test_very_long_message_truncation(self, mock_llm):
        """Test that very long messages are truncated in prompt."""
        mock_llm.generate = AsyncMock(return_value={"content": "Summary"})

        mgr = ConversationManager()
        very_long = "x" * 2000
        turns = [Turn("user", very_long), Turn("assistant", "Short")]

        await mgr._summarize_chunk("", turns)

        call_args = mock_llm.generate.call_args[1]
        prompt = call_args["messages"][0]["content"]

        # The very long message should be truncated
        assert very_long not in prompt
        assert "x" * 500 in prompt  # First 500 chars should be there


class TestIntegrationScenarios:
    """Integration-style tests simulating real conversation flows."""

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    async def test_full_conversation_flow(self, mock_llm):
        """Simulate a full conversation with summarization."""
        mock_llm.generate = AsyncMock(return_value={
            "content": "Discussed Docker containers and Kubernetes orchestration"
        })

        # Start fresh
        mgr = ConversationManager()
        assert mgr.summary == ""

        # Add 7 turns (14 messages) - exceeds 6 turn threshold
        for i in range(7):
            await mgr.add_message("user", f"Question about topic {i}")
            await mgr.add_message("assistant", f"Answer explaining topic {i}")

        # Should have triggered summarization
        assert mock_llm.generate.called
        assert "Docker" in mgr.summary or mgr.summary != ""

        # Should have recent messages
        context = mgr.get_context()
        # Context should have: system msg (summary) + recent messages
        assert len(context) > 0
        if mgr.summary:
            assert context[0]["role"] == "system"

    @pytest.mark.asyncio
    @patch("core.conversation_manager.llm_client")
    async def test_persistence_roundtrip(self, mock_llm):
        """Test saving and restoring conversation state."""
        mock_llm.generate = AsyncMock(return_value={"content": "Persisted summary"})

        # Simulate conversation
        mgr = ConversationManager(full_turns_limit=2)
        await mgr.add_message("user", "Q1")
        await mgr.add_message("assistant", "A1")
        await mgr.add_message("user", "Q2")
        await mgr.add_message("assistant", "A2")
        await mgr.add_message("user", "Q3")
        await mgr.add_message("assistant", "A3")  # Triggers summarize

        # Get state for persistence
        summary = mgr.get_summary()
        recent = mgr.get_recent_messages()

        # Simulate saving and loading
        mgr2 = ConversationManager.from_db(summary=summary, recent_messages=recent)

        # Should restore same state
        assert mgr2.get_summary() == summary
        assert len(mgr2.get_recent_messages()) == len(recent)

        # Context should be equivalent
        ctx1 = mgr.get_context()
        ctx2 = mgr2.get_context()
        assert len(ctx1) == len(ctx2)
