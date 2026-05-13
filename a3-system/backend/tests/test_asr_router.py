"""Tests for the /api/asr router."""

from __future__ import annotations

import io
import struct

import pytest
from fastapi.testclient import TestClient

from api.routers import asr as asr_router
from core.asr_client import (
    ENCODING_LAME,
    ENCODING_RAW,
    LANGUAGE_EN,
    LANGUAGE_ZH,
    TranscriptionResult,
    TranscriptionSegment,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_app():
    """Build an isolated FastAPI app mounting only the ASR router."""
    from fastapi import FastAPI

    app = FastAPI()
    app.include_router(asr_router.router, prefix="/api/asr")
    return app


def _make_wav(pcm_payload: bytes, sample_rate: int = 16000) -> bytes:
    """Construct a minimal RIFF/WAVE container around PCM samples."""
    num_channels = 1
    bits_per_sample = 16
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    subchunk2_size = len(pcm_payload)
    chunk_size = 36 + subchunk2_size

    header = b""
    header += b"RIFF"
    header += struct.pack("<I", chunk_size)
    header += b"WAVE"
    header += b"fmt "
    header += struct.pack("<I", 16)            # subchunk1 size
    header += struct.pack("<H", 1)             # PCM format
    header += struct.pack("<H", num_channels)
    header += struct.pack("<I", sample_rate)
    header += struct.pack("<I", byte_rate)
    header += struct.pack("<H", block_align)
    header += struct.pack("<H", bits_per_sample)
    header += b"data"
    header += struct.pack("<I", subchunk2_size)
    return header + pcm_payload


# ---------------------------------------------------------------------------
# /status
# ---------------------------------------------------------------------------


def test_status_reports_unconfigured(monkeypatch):
    monkeypatch.setattr(asr_router.asr_client, "app_id", "")
    monkeypatch.setattr(asr_router.asr_client, "api_key", "")
    monkeypatch.setattr(asr_router.asr_client, "api_secret", "")

    app = _build_app()
    client = TestClient(app)
    r = client.get("/api/asr/status")
    assert r.status_code == 200
    body = r.json()
    assert body["configured"] is False
    assert body["provider"] == "iflytek_ist"
    assert LANGUAGE_EN in body["supported_languages"]
    assert LANGUAGE_ZH in body["supported_languages"]


def test_status_reports_configured(monkeypatch):
    monkeypatch.setattr(asr_router.asr_client, "app_id", "x")
    monkeypatch.setattr(asr_router.asr_client, "api_key", "y")
    monkeypatch.setattr(asr_router.asr_client, "api_secret", "z")

    app = _build_app()
    r = TestClient(app).get("/api/asr/status")
    assert r.json()["configured"] is True


# ---------------------------------------------------------------------------
# /transcribe
# ---------------------------------------------------------------------------


def _patch_credentials(monkeypatch):
    monkeypatch.setattr(asr_router.asr_client, "app_id", "x")
    monkeypatch.setattr(asr_router.asr_client, "api_key", "y")
    monkeypatch.setattr(asr_router.asr_client, "api_secret", "z")


def test_transcribe_503_when_unconfigured(monkeypatch):
    monkeypatch.setattr(asr_router.asr_client, "app_id", "")
    monkeypatch.setattr(asr_router.asr_client, "api_key", "")
    monkeypatch.setattr(asr_router.asr_client, "api_secret", "")

    app = _build_app()
    r = TestClient(app).post(
        "/api/asr/transcribe",
        files={"file": ("a.wav", b"ignored", "audio/wav")},
    )
    assert r.status_code == 503


def test_transcribe_rejects_unsupported_language(monkeypatch):
    _patch_credentials(monkeypatch)

    app = _build_app()
    r = TestClient(app).post(
        "/api/asr/transcribe",
        files={"file": ("a.wav", b"abc", "audio/wav")},
        data={"language": "fr_fr"},
    )
    assert r.status_code == 400
    assert "Unsupported language" in r.json()["detail"]


def test_transcribe_rejects_empty_file(monkeypatch):
    _patch_credentials(monkeypatch)

    app = _build_app()
    r = TestClient(app).post(
        "/api/asr/transcribe",
        files={"file": ("a.wav", b"", "audio/wav")},
    )
    assert r.status_code == 400
    assert "Empty audio" in r.json()["detail"]


def test_transcribe_rejects_unsupported_encoding(monkeypatch):
    _patch_credentials(monkeypatch)

    app = _build_app()
    r = TestClient(app).post(
        "/api/asr/transcribe",
        files={"file": ("a.bin", b"abc", "application/octet-stream")},
        data={"encoding": "flac"},
    )
    assert r.status_code == 400
    assert "Unsupported encoding" in r.json()["detail"]


def test_transcribe_happy_path_strips_wav_and_calls_client(monkeypatch):
    """Upload a WAV, the router must strip the header and pass raw PCM."""
    _patch_credentials(monkeypatch)

    pcm_payload = b"\x10\x00" * 800  # 1600 bytes of fake samples
    wav = _make_wav(pcm_payload)

    captured = {}

    async def fake_transcribe(audio, language, encoding, audio_format, frame_interval_ms):
        captured["audio"] = audio
        captured["language"] = language
        captured["encoding"] = encoding
        return TranscriptionResult(
            text="hello there",
            segments=[TranscriptionSegment(text="hello there", is_final=True)],
            language=language,
            duration_ms=1234,
        )

    monkeypatch.setattr(asr_router.asr_client, "transcribe", fake_transcribe)

    app = _build_app()
    r = TestClient(app).post(
        "/api/asr/transcribe",
        files={"file": ("a.wav", wav, "audio/wav")},
        data={"language": LANGUAGE_EN},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["text"] == "hello there"
    assert body["language"] == LANGUAGE_EN
    assert body["duration_ms"] == 1234
    assert len(body["segments"]) == 1

    # The router must have stripped the RIFF header before forwarding.
    assert captured["audio"] == pcm_payload
    assert captured["encoding"] == ENCODING_RAW


def test_transcribe_mp3_passes_through_encoding(monkeypatch):
    _patch_credentials(monkeypatch)

    captured = {}

    async def fake_transcribe(audio, language, encoding, audio_format, frame_interval_ms):
        captured["encoding"] = encoding
        captured["audio"] = audio
        return TranscriptionResult(text="ok", language=language, duration_ms=0)

    monkeypatch.setattr(asr_router.asr_client, "transcribe", fake_transcribe)

    app = _build_app()
    fake_mp3 = b"\xff\xfb" + b"x" * 100  # leading bytes resembling an MP3 header
    r = TestClient(app).post(
        "/api/asr/transcribe",
        files={"file": ("a.mp3", fake_mp3, "audio/mpeg")},
    )
    assert r.status_code == 200
    assert captured["encoding"] == ENCODING_LAME
    # MP3 should NOT be header-stripped
    assert captured["audio"] == fake_mp3


def test_transcribe_502_when_client_runtime_error(monkeypatch):
    _patch_credentials(monkeypatch)

    async def boom(audio, language, encoding, audio_format, frame_interval_ms):
        raise RuntimeError("upstream gone")

    monkeypatch.setattr(asr_router.asr_client, "transcribe", boom)

    app = _build_app()
    r = TestClient(app).post(
        "/api/asr/transcribe",
        files={"file": ("a.wav", b"\x00" * 100, "audio/wav")},
    )
    assert r.status_code == 502
    assert "upstream gone" in r.json()["detail"]


# ---------------------------------------------------------------------------
# WAV header stripping helper
# ---------------------------------------------------------------------------


def test_strip_wav_header_returns_pcm_payload():
    pcm = b"\x10\x00" * 50
    wav = _make_wav(pcm)
    assert asr_router._strip_wav_header(wav) == pcm


def test_strip_wav_header_passes_through_non_wav():
    raw = b"\x01\x02\x03\x04\x05"
    assert asr_router._strip_wav_header(raw) == raw


def test_strip_wav_header_handles_short_buffer():
    assert asr_router._strip_wav_header(b"RIFF") == b"RIFF"  # too short


def test_strip_wav_header_handles_extra_chunks_before_data():
    """Some WAV writers include a LIST/INFO chunk before ``data``."""
    pcm = b"\xab\xcd" * 20
    # Build a WAV with an extra LIST chunk between ``fmt `` and ``data``.
    fmt_chunk = (
        b"fmt " + struct.pack("<I", 16) + struct.pack("<H", 1)
        + struct.pack("<H", 1) + struct.pack("<I", 16000)
        + struct.pack("<I", 32000) + struct.pack("<H", 2)
        + struct.pack("<H", 16)
    )
    list_payload = b"INFOICMT" + struct.pack("<I", 4) + b"test"
    list_chunk = b"LIST" + struct.pack("<I", len(list_payload)) + list_payload
    data_chunk = b"data" + struct.pack("<I", len(pcm)) + pcm
    inner = fmt_chunk + list_chunk + data_chunk
    wav = b"RIFF" + struct.pack("<I", 4 + len(inner)) + b"WAVE" + inner

    assert asr_router._strip_wav_header(wav) == pcm
