"""Unit tests for the TTS disk-cache helpers.

The cache layer is the boundary between the audio-bug-prone server and the
LecturePlayer frontend. We verify deterministic key generation, path layout,
and the batch helper's short-circuit on cache hits (no network).
"""

from __future__ import annotations

import asyncio
import hashlib
import pathlib

import pytest

from core import tts_client as tts_module


def test_cache_key_is_deterministic():
    a = tts_module._tts_cache_key("hello", "en-US-JennyNeural", "edge")
    b = tts_module._tts_cache_key("hello", "en-US-JennyNeural", "edge")
    assert a == b
    assert len(a) == 32  # md5 hex length


def test_cache_key_varies_with_text_voice_provider():
    base = tts_module._tts_cache_key("hello", "en-US-JennyNeural", "edge")
    assert base != tts_module._tts_cache_key("HELLO", "en-US-JennyNeural", "edge")
    assert base != tts_module._tts_cache_key("hello", "en-US-AriaNeural", "edge")
    assert base != tts_module._tts_cache_key("hello", "en-US-JennyNeural", "iflytek")


def test_get_cache_path_is_under_tts_cache_dir():
    p = tts_module.get_cache_path("hi", "en-US-JennyNeural", "edge")
    assert isinstance(p, pathlib.Path)
    assert p.suffix == ".mp3"
    assert p.parent == tts_module.TTS_CACHE_DIR


def test_cache_dir_exists_at_import_time():
    assert tts_module.TTS_CACHE_DIR.exists()
    assert tts_module.TTS_CACHE_DIR.is_dir()


@pytest.mark.asyncio
async def test_batch_synthesize_hits_cache_without_calling_synthesize(monkeypatch, tmp_path):
    """If the file already exists, no synthesis call should be made."""
    # Redirect cache dir for isolation
    monkeypatch.setattr(tts_module, "TTS_CACHE_DIR", tmp_path)

    text = "cached lecture line"
    voice = "en-US-JennyNeural"
    provider = "edge"
    key = tts_module._tts_cache_key(text, voice, provider)
    (tmp_path / f"{key}.mp3").write_bytes(b"FAKEMP3")

    called = {"n": 0}

    async def _boom(*_a, **_k):
        called["n"] += 1
        raise AssertionError("synthesize must not be called on cache hit")

    monkeypatch.setattr(tts_module.tts_client, "synthesize", _boom)

    results = await tts_module.batch_synthesize_to_cache(
        items=[{"text": text, "slide_idx": 0}],
        provider=provider,
        voice=voice,
    )
    assert called["n"] == 0
    assert results == [
        {"slide_idx": 0, "cache_key": key, "cached": True, "error": None}
    ]


@pytest.mark.asyncio
async def test_batch_synthesize_writes_file_on_miss(monkeypatch, tmp_path):
    monkeypatch.setattr(tts_module, "TTS_CACHE_DIR", tmp_path)
    text = "fresh line"
    voice = "en-US-JennyNeural"
    provider = "edge"

    async def _fake_synth(t, voice, provider):
        return b"NEW_MP3_BYTES"

    monkeypatch.setattr(tts_module.tts_client, "synthesize", _fake_synth)

    results = await tts_module.batch_synthesize_to_cache(
        items=[{"text": text, "slide_idx": 0}],
        provider=provider,
        voice=voice,
    )
    key = tts_module._tts_cache_key(text, voice, provider)
    f = tmp_path / f"{key}.mp3"
    assert f.exists()
    assert f.read_bytes() == b"NEW_MP3_BYTES"
    assert results[0]["cached"] is True
    assert results[0]["error"] is None


@pytest.mark.asyncio
async def test_batch_synthesize_handles_empty_text():
    results = await tts_module.batch_synthesize_to_cache(
        items=[{"text": "", "slide_idx": 7}],
        provider="edge",
        voice="en-US-JennyNeural",
    )
    assert results[0]["slide_idx"] == 7
    assert results[0]["cached"] is False
    assert results[0]["cache_key"] is None
    assert "empty" in (results[0]["error"] or "")


@pytest.mark.asyncio
async def test_batch_synthesize_records_error_on_provider_failure(monkeypatch, tmp_path):
    monkeypatch.setattr(tts_module, "TTS_CACHE_DIR", tmp_path)

    async def _boom(*_a, **_k):
        raise RuntimeError("provider down")

    monkeypatch.setattr(tts_module.tts_client, "synthesize", _boom)

    results = await tts_module.batch_synthesize_to_cache(
        items=[{"text": "hello", "slide_idx": 1}],
        provider="edge",
        voice="en-US-JennyNeural",
    )
    assert results[0]["cached"] is False
    assert "provider down" in results[0]["error"]
