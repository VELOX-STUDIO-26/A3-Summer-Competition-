"""Tests for the iFlytek IAT ASR client.

We mock the ``websockets`` library and the auth signing, so these tests
run fully offline without needing real iFlytek credentials.
"""

from __future__ import annotations

import asyncio
import base64
import json
from typing import List

import pytest

from core.asr_client import (
    DEFAULT_IAT_URL,
    ENCODING_LAME,
    ENCODING_RAW,
    FORMAT_PCM_16K,
    LANGUAGE_EN,
    LANGUAGE_ZH,
    STATUS_FIRST,
    STATUS_LAST,
    STATUS_MIDDLE,
    IFlytekASRClient,
    TranscriptionSegment,
    parse_iat_message,
)


# ---------------------------------------------------------------------------
# parse_ist_message
# ---------------------------------------------------------------------------


def test_parse_ok_partial_segment():
    msg = json.dumps({
        "code": 0,
        "data": {
            "status": STATUS_MIDDLE,
            "result": {
                "ls": False,
                "bg": 100,
                "ed": 500,
                "ws": [
                    {"cw": [{"w": "Hello"}]},
                    {"cw": [{"w": " "}]},
                    {"cw": [{"w": "world"}]},
                ],
            },
        },
    })
    seg, end, code = parse_iat_message(msg)
    assert code == 0
    assert end is False
    assert seg is not None
    assert seg.text == "Hello world"
    assert seg.is_final is False
    assert seg.start_ms == 100
    assert seg.end_ms == 500


def test_parse_final_segment_marks_end_of_stream():
    msg = json.dumps({
        "code": 0,
        "data": {
            "status": STATUS_LAST,
            "result": {"ls": True, "ws": [{"cw": [{"w": "done"}]}]},
        },
    })
    seg, end, code = parse_iat_message(msg)
    assert code == 0
    assert end is True
    assert seg.is_final is True
    assert seg.text == "done"


def test_parse_error_code_returns_end_true():
    msg = json.dumps({"code": 10101, "message": "unauthorized"})
    seg, end, code = parse_iat_message(msg)
    assert code == 10101
    assert end is True
    assert seg is None


def test_parse_invalid_json_returns_neg_code():
    seg, end, code = parse_iat_message("not-json{{")
    assert code == -1
    assert seg is None


def test_parse_empty_result_no_segment():
    msg = json.dumps({"code": 0, "data": {"status": 1, "result": {}}})
    seg, _, _ = parse_iat_message(msg)
    assert seg is None


# ---------------------------------------------------------------------------
# Frame builders
# ---------------------------------------------------------------------------


def _client_with_creds() -> IFlytekASRClient:
    return IFlytekASRClient(
        app_id="test_app",
        api_key="test_key",
        api_secret="test_secret",
    )


def test_build_first_frame_includes_app_id_and_business():
    client = _client_with_creds()
    chunk = b"\x01\x02\x03\x04"
    raw = client.build_first_frame(chunk, language=LANGUAGE_ZH)
    payload = json.loads(raw)

    assert payload["common"]["app_id"] == "test_app"
    assert payload["business"]["language"] == LANGUAGE_ZH
    assert payload["business"]["accent"] == "mandarin"
    assert payload["data"]["status"] == STATUS_FIRST
    assert payload["data"]["encoding"] == ENCODING_RAW
    assert payload["data"]["format"] == FORMAT_PCM_16K
    # Audio is base64-encoded
    assert base64.b64decode(payload["data"]["audio"]) == chunk


def test_build_first_frame_english_omits_accent():
    """English requests must NOT include ``accent`` (IST validator rejects it)."""
    client = _client_with_creds()
    payload = json.loads(client.build_first_frame(b"x", language=LANGUAGE_EN))
    assert "accent" not in payload["business"]


def test_build_first_frame_omits_iat_only_fields():
    """IST rejects ``vad_eos`` and ``dwa`` with error 10163 — must not be sent."""
    client = _client_with_creds()
    payload = json.loads(client.build_first_frame(b"x", language=LANGUAGE_EN))
    assert "vad_eos" not in payload["business"]
    assert "dwa" not in payload["business"]
    # Only the three documented IAT business fields should appear.
    assert set(payload["business"].keys()) <= {"language", "domain", "accent"}


def test_build_continuation_middle_vs_last():
    client = _client_with_creds()
    mid = json.loads(client.build_continuation_frame(b"abc", is_last=False))
    last = json.loads(client.build_continuation_frame(b"abc", is_last=True))
    assert mid["data"]["status"] == STATUS_MIDDLE
    assert last["data"]["status"] == STATUS_LAST


# ---------------------------------------------------------------------------
# Auth signing
# ---------------------------------------------------------------------------


def test_create_auth_url_contains_signature_components():
    client = _client_with_creds()
    url = client._create_auth_url()
    # Three required query params per iFlytek spec
    assert "authorization=" in url
    assert "date=" in url
    assert "host=" in url
    assert url.startswith(DEFAULT_IAT_URL)


def test_is_configured_requires_all_three_creds():
    assert IFlytekASRClient(app_id="", api_key="", api_secret="").is_configured() is False
    assert IFlytekASRClient(app_id="a", api_key="", api_secret="c").is_configured() is False
    assert IFlytekASRClient(app_id="a", api_key="b", api_secret="c").is_configured() is True


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------


def test_chunk_audio_splits_into_fixed_size_blocks():
    chunks = IFlytekASRClient._chunk_audio(b"a" * 3000, frame_bytes=1280)
    assert len(chunks) == 3
    assert len(chunks[0]) == 1280
    assert len(chunks[1]) == 1280
    assert len(chunks[2]) == 3000 - 2 * 1280


def test_chunk_audio_empty_yields_empty_list():
    assert IFlytekASRClient._chunk_audio(b"", frame_bytes=1280) == []


def test_chunk_audio_invalid_frame_size_raises():
    with pytest.raises(ValueError):
        IFlytekASRClient._chunk_audio(b"x", frame_bytes=0)


# ---------------------------------------------------------------------------
# Segment merging
# ---------------------------------------------------------------------------


def test_merge_segments_dedupes_partials_before_finals():
    segs = [
        TranscriptionSegment(text="Hel", is_final=False),
        TranscriptionSegment(text="Hello", is_final=False),
        TranscriptionSegment(text="Hello world", is_final=True),
        TranscriptionSegment(text="how", is_final=False),
        TranscriptionSegment(text="how are you", is_final=True),
    ]
    out = IFlytekASRClient._merge_segments(segs)
    # Final segments stitched, partials before each final dropped
    assert out == "Hello world how are you"


def test_merge_segments_handles_only_partials():
    segs = [
        TranscriptionSegment(text="par", is_final=False),
        TranscriptionSegment(text="partial", is_final=False),
    ]
    out = IFlytekASRClient._merge_segments(segs)
    assert out == "partial"


def test_merge_segments_empty():
    assert IFlytekASRClient._merge_segments([]) == ""


# ---------------------------------------------------------------------------
# transcribe() guard rails
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_transcribe_without_credentials_raises():
    client = IFlytekASRClient(app_id="", api_key="", api_secret="")
    with pytest.raises(ValueError):
        await client.transcribe(b"audio")


@pytest.mark.asyncio
async def test_transcribe_empty_audio_raises():
    client = _client_with_creds()
    with pytest.raises(ValueError):
        await client.transcribe(b"")


# ---------------------------------------------------------------------------
# transcribe() end-to-end with a fake WebSocket
# ---------------------------------------------------------------------------


class _FakeUpstream:
    """In-memory iFlytek server used to verify the streaming protocol."""

    def __init__(self, scripted_replies: List[str]):
        self.received: List[str] = []
        self._replies = list(scripted_replies)
        self._closed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        self._closed = True

    async def send(self, payload: str) -> None:
        self.received.append(payload)

    async def recv(self) -> str:
        if not self._replies:
            await asyncio.sleep(0)
            raise StopAsyncIteration
        return self._replies.pop(0)


@pytest.mark.asyncio
async def test_transcribe_streams_frames_and_aggregates_final_text(monkeypatch):
    # Scripted server replies: one partial, one final, one end-of-stream marker.
    replies = [
        json.dumps({
            "code": 0,
            "data": {
                "status": STATUS_MIDDLE,
                "result": {"ls": False, "ws": [{"cw": [{"w": "hello"}]}]},
            },
        }),
        json.dumps({
            "code": 0,
            "data": {
                "status": STATUS_MIDDLE,
                "result": {"ls": True, "ws": [{"cw": [{"w": "hello world"}]}]},
            },
        }),
        json.dumps({
            "code": 0,
            "data": {"status": STATUS_LAST, "result": {}},
        }),
    ]
    fake = _FakeUpstream(replies)

    # Patch ``websockets.connect`` to return our fake context manager.
    import websockets  # noqa: F401  (ensure import works in test env)

    def fake_connect(_url):
        return fake

    monkeypatch.setattr("websockets.connect", fake_connect)

    client = _client_with_creds()
    # 3000 bytes -> 3 frames at 1280 B; use 0 ms pacing for a fast test.
    result = await client.transcribe(
        audio=b"a" * 3000,
        language=LANGUAGE_EN,
        encoding=ENCODING_RAW,
        audio_format=FORMAT_PCM_16K,
        frame_bytes=1280,
        frame_interval_ms=0,
    )

    assert result.text == "hello world"
    assert result.language == LANGUAGE_EN
    # Three frames sent (first + middle + last)
    assert len(fake.received) == 3
    first = json.loads(fake.received[0])
    last = json.loads(fake.received[-1])
    assert first["data"]["status"] == STATUS_FIRST
    assert last["data"]["status"] == STATUS_LAST


@pytest.mark.asyncio
async def test_transcribe_propagates_server_error(monkeypatch):
    fake = _FakeUpstream([
        json.dumps({"code": 10101, "message": "unauthorized"}),
    ])

    def fake_connect(_url):
        return fake

    monkeypatch.setattr("websockets.connect", fake_connect)

    client = _client_with_creds()
    with pytest.raises(RuntimeError, match="iFlytek IAT"):
        await client.transcribe(b"x" * 100, frame_interval_ms=0)
