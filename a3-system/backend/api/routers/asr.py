"""ASR (Automatic Speech Recognition) API surface.

Endpoints
---------
- ``GET  /api/asr/status``      — reports whether iFlytek IAT is configured
- ``POST /api/asr/transcribe``  — multipart audio upload → transcript JSON
- ``WS   /api/asr/stream``      — low-latency live mic transcription

The router is intentionally thin; all heavy lifting (auth signing,
WebSocket framing, partial-result merging) lives in ``core.asr_client``.

The transcribe endpoint exists so the frontend can record audio in any
common format, POST it once, and receive the final transcript in a
single response — perfect for the "press-to-talk" tutor flow described
in the PRD.

The WS stream endpoint forwards browser audio frames straight through to
iFlytek and relays partial transcripts back, enabling real-time captions
during long voice questions without requiring the browser to wait for
the full utterance to finish.
"""

from __future__ import annotations

import asyncio
import json
from typing import Optional

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from pydantic import BaseModel, Field

from core.asr_client import (
    ENCODING_LAME,
    ENCODING_RAW,
    ENCODING_SPEEX,
    FORMAT_PCM_16K,
    FORMAT_PCM_8K,
    LANGUAGE_EN,
    LANGUAGE_ZH,
    asr_client,
    parse_iat_message,
)
from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ASRStatusResponse(BaseModel):
    configured: bool
    provider: str = "iflytek_iat"
    ws_url: str
    supported_languages: list[str] = [LANGUAGE_EN, LANGUAGE_ZH]
    supported_encodings: list[str] = [ENCODING_RAW, ENCODING_LAME, ENCODING_SPEEX]


class TranscribeResponse(BaseModel):
    text: str
    language: str
    duration_ms: int
    segments: list[dict] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------


@router.get("/status", response_model=ASRStatusResponse)
async def asr_status() -> ASRStatusResponse:
    return ASRStatusResponse(
        configured=asr_client.is_configured(),
        ws_url=asr_client.ws_url,
    )


@router.get("/test")
async def asr_test() -> dict:
    """Run a no-audio handshake test against iFlytek IAT.

    Useful for diagnosing auth, network, or endpoint issues without
    uploading a real audio file.
    """
    result = await asr_client.test_connection()
    result["debug"] = asr_client._debug_auth()
    return result


# ---------------------------------------------------------------------------
# File transcription
# ---------------------------------------------------------------------------


_ENCODING_BY_MIME = {
    "audio/wav": ENCODING_RAW,
    "audio/wave": ENCODING_RAW,
    "audio/x-wav": ENCODING_RAW,
    "audio/L16": ENCODING_RAW,
    "audio/pcm": ENCODING_RAW,
    "audio/mpeg": ENCODING_LAME,
    "audio/mp3": ENCODING_LAME,
    "audio/x-speex": ENCODING_SPEEX,
    "audio/speex": ENCODING_SPEEX,
}

_VALID_ENCODINGS = {ENCODING_RAW, ENCODING_LAME, ENCODING_SPEEX}
_VALID_LANGUAGES = {LANGUAGE_EN, LANGUAGE_ZH}


def _strip_wav_header(audio: bytes) -> bytes:
    """Strip a RIFF/WAVE header so iFlytek receives raw PCM samples.

    Returns ``audio`` unchanged if it doesn't start with ``RIFF`` or if
    we can't locate the ``data`` sub-chunk.
    """
    if len(audio) < 44 or audio[:4] != b"RIFF" or audio[8:12] != b"WAVE":
        return audio
    # Walk sub-chunks until we hit ``data``. Each sub-chunk is 8-byte
    # header (id + size) followed by ``size`` bytes of payload.
    pos = 12
    while pos + 8 <= len(audio):
        chunk_id = audio[pos : pos + 4]
        chunk_size = int.from_bytes(audio[pos + 4 : pos + 8], "little")
        if chunk_id == b"data":
            return audio[pos + 8 : pos + 8 + chunk_size]
        pos += 8 + chunk_size
    return audio


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form(default=LANGUAGE_EN),
    encoding: Optional[str] = Form(default=None),
    audio_format: str = Form(default=FORMAT_PCM_16K),
) -> TranscribeResponse:
    """Transcribe an uploaded audio file using iFlytek IST.

    Audio requirements
    ------------------
    The cleanest input is **16 kHz, 16-bit, mono PCM** (`.wav` or raw
    PCM). MP3 (lame) and Speex are also accepted; ``encoding`` will be
    auto-detected from the upload's content-type when omitted.
    """
    if not asr_client.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "iFlytek ASR not configured. Set IFLYTEK_APP_ID, "
                "IFLYTEK_API_KEY, IFLYTEK_API_SECRET in your environment."
            ),
        )
    if language not in _VALID_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{language}'. Use one of {_VALID_LANGUAGES}.",
        )

    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="Empty audio upload.")

    # Resolve encoding: explicit > MIME-guess > default raw PCM.
    if encoding is None:
        encoding = _ENCODING_BY_MIME.get(file.content_type or "", ENCODING_RAW)
    if encoding not in _VALID_ENCODINGS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported encoding '{encoding}'. Use one of {_VALID_ENCODINGS}.",
        )

    # Strip WAV container so iFlytek sees raw PCM samples.
    original_len = len(audio)
    if encoding == ENCODING_RAW:
        audio = _strip_wav_header(audio)
    stripped_len = len(audio)

    # Quick sanity check: ensure audio isn't all zeros (silent).
    nonzero = sum(1 for b in audio[: min(4096, len(audio))] if b != 0)
    logger.info(
        f"ASR transcribe: original={original_len}B stripped={stripped_len}B "
        f"nonzero_samples_in_first_4k={nonzero} language={language} "
        f"encoding={encoding} format={audio_format}"
    )

    try:
        result = await asr_client.transcribe(
            audio=audio,
            language=language,
            encoding=encoding,
            audio_format=audio_format,
            # Files are batch uploads — no need to throttle to real-time.
            frame_interval_ms=0,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"ASR transport failure: {e}")
        raise HTTPException(status_code=502, detail=str(e))

    return TranscribeResponse(
        text=result.text,
        language=result.language,
        duration_ms=result.duration_ms,
        segments=[s.to_dict() for s in result.segments],
    )


# ---------------------------------------------------------------------------
# Live mic streaming via WebSocket
# ---------------------------------------------------------------------------


@router.websocket("/stream")
async def stream_transcription(
    websocket: WebSocket,
    language: str = LANGUAGE_EN,
    encoding: str = ENCODING_RAW,
    audio_format: str = FORMAT_PCM_16K,
):
    """Bidirectional WebSocket: client streams audio, server streams partials.

    Client → server: binary audio frames (raw PCM 16 kHz mono recommended).
                     Send a JSON text message ``{"event":"end"}`` to flush.
    Server → client: JSON ``{"event":"partial"|"final"|"complete"|"error",
                              "text": ...}``
    """
    await websocket.accept()

    if not asr_client.is_configured():
        await websocket.send_json({
            "event": "error",
            "data": "iFlytek ASR not configured on the server.",
        })
        await websocket.close(code=1011)
        return
    if language not in _VALID_LANGUAGES or encoding not in _VALID_ENCODINGS:
        await websocket.send_json({
            "event": "error",
            "data": f"Unsupported language/encoding: {language}/{encoding}",
        })
        await websocket.close(code=1003)
        return

    try:
        import websockets  # type: ignore
    except ImportError:
        await websocket.send_json({
            "event": "error",
            "data": "Server missing 'websockets' package.",
        })
        await websocket.close(code=1011)
        return

    auth_url = asr_client._create_auth_url()  # noqa: SLF001 — internal helper

    try:
        async with websockets.connect(auth_url) as upstream:
            # Pump browser-audio → iFlytek
            ingest = asyncio.create_task(
                _ingest_browser_audio(
                    websocket, upstream, language, encoding, audio_format,
                )
            )
            # Pump iFlytek-results → browser
            relay = asyncio.create_task(
                _relay_iflytek_results(websocket, upstream)
            )
            done, pending = await asyncio.wait(
                {ingest, relay}, return_when=asyncio.FIRST_COMPLETED
            )
            for t in pending:
                t.cancel()
            for t in done:
                exc = t.exception()
                if exc:
                    raise exc
    except WebSocketDisconnect:
        logger.info("Browser disconnected from /api/asr/stream")
    except Exception as e:  # noqa: BLE001
        logger.error(f"ASR stream error: {e}", exc_info=True)
        try:
            await websocket.send_json({"event": "error", "data": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


async def _ingest_browser_audio(
    browser_ws: WebSocket,
    upstream_ws,
    language: str,
    encoding: str,
    audio_format: str,
) -> None:
    """Forward audio frames from browser into the iFlytek socket."""
    sent_first = False
    while True:
        msg = await browser_ws.receive()
        # Text frames are control messages: ``{"event": "end"}``
        if "text" in msg and msg["text"] is not None:
            try:
                control = json.loads(msg["text"])
            except json.JSONDecodeError:
                continue
            if control.get("event") == "end":
                # Send empty terminator
                await upstream_ws.send(
                    asr_client.build_continuation_frame(
                        b"", is_last=True,
                        encoding=encoding, audio_format=audio_format,
                    )
                )
                return
            continue

        chunk = msg.get("bytes")
        if not chunk:
            if msg.get("type") == "websocket.disconnect":
                return
            continue

        if not sent_first:
            await upstream_ws.send(
                asr_client.build_first_frame(
                    audio_chunk=chunk,
                    language=language,
                    encoding=encoding,
                    audio_format=audio_format,
                )
            )
            sent_first = True
        else:
            await upstream_ws.send(
                asr_client.build_continuation_frame(
                    audio_chunk=chunk,
                    is_last=False,
                    encoding=encoding,
                    audio_format=audio_format,
                )
            )


async def _relay_iflytek_results(browser_ws: WebSocket, upstream_ws) -> None:
    """Forward partial / final transcripts back to the browser."""
    full_parts: list[str] = []
    last_partial = ""  # Track last partial as fallback
    while True:
        try:
            raw = await upstream_ws.recv()
        except Exception:
            break
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8", "ignore")
        seg, end, code = parse_iat_message(raw)
        if code != 0:
            await browser_ws.send_json({
                "event": "error",
                "data": f"iFlytek error code {code}",
            })
            return
        if seg is not None:
            logger.info(f"[ASR] seg: text='{seg.text}' is_final={seg.is_final}")
            # Don't forward garbage single-char results
            if seg.is_final and len(seg.text.strip()) <= 1:
                logger.warning(f"[ASR] Ignoring garbage final: '{seg.text}'")
            else:
                await browser_ws.send_json({
                    "event": "final" if seg.is_final else "partial",
                    "text": seg.text,
                    "start_ms": seg.start_ms,
                    "end_ms": seg.end_ms,
                })
                if seg.is_final:
                    full_parts.append(seg.text)
                else:
                    last_partial = seg.text  # Keep latest partial as fallback
        if end:
            # Fallback to last partial if no final segments were captured
            # Also filter out garbage single-char results
            valid_full_parts = [p.strip() for p in full_parts if p.strip() and len(p.strip()) > 1]
            final_text = " ".join(valid_full_parts) or last_partial
            logger.info(f"[ASR] complete: full_parts={full_parts}, valid={valid_full_parts}, last_partial='{last_partial}', final_text='{final_text}'")
            await browser_ws.send_json({
                "event": "complete",
                "text": final_text,
            })
            return
