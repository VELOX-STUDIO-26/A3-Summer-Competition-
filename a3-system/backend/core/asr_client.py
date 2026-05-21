"""iFlytek ASR (Automatic Speech Recognition) client.

Uses the iFlytek **IAT** (Intelligent Audio Transcription / real-time ASR)
WebSocket API. Endpoint: ``wss://iat-api-sg.xf-yun.com/v2/iat``
(Singapore region).

Auth: identical HMAC-SHA256 signing as the TTS client, so we use the
exact same ``IFLYTEK_APP_ID / API_KEY / API_SECRET`` env vars.

Frame protocol (per iFlytek docs):
  * **first frame**:  ``data.status = 0`` + business config + first audio chunk
  * **middle frames**: ``data.status = 1`` + next audio chunk (1280 B @ 40 ms)
  * **last frame**:    ``data.status = 2`` + final audio chunk (or empty)

The server streams JSON results with partial transcripts (``pgs="apd"``
appends, ``pgs="rpl"`` replaces). We accumulate them and return the
final concatenated transcript.
"""

from __future__ import annotations

import asyncio
import base64
import calendar
import hashlib
import hmac
import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import AsyncIterator, Dict, List, Optional, Tuple
from urllib.parse import quote, urlencode, urlparse
from wsgiref.handlers import format_date_time

from core.logging import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Production WebSocket endpoint (Singapore region).
# iFlytek requires **wss://** (TLS) for WebSocket handshake.
# Override with ``IFLYTEK_IAT_URL`` if needed.
DEFAULT_IAT_URL = "wss://iat-api-sg.xf-yun.com/v2/iat"

# Mock mode: return simulated transcripts when iFlytek is not configured
ASR_MOCK_MODE = os.getenv("ASR_MOCK_MODE", "false").lower() in ("true", "1", "yes")

# 1280 bytes = 40 ms of 16 kHz/16-bit/mono PCM. iFlytek recommends 40 ms
# frames; smaller wastes WS overhead, larger may delay finalisation.
FRAME_BYTES = 1280

# IAT status codes
STATUS_FIRST = 0
STATUS_MIDDLE = 1
STATUS_LAST = 2

# Audio format strings the server accepts
FORMAT_PCM_16K = "audio/L16;rate=16000"
FORMAT_PCM_8K = "audio/L16;rate=8000"

# Encoding strings
ENCODING_RAW = "raw"      # 16-bit PCM
ENCODING_LAME = "lame"    # MP3
ENCODING_SPEEX = "speex"

LANGUAGE_EN = "en_us"
LANGUAGE_ZH = "zh_cn"


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass
class TranscriptionSegment:
    """A single recognised utterance segment with optional timing."""

    text: str
    is_final: bool = False
    start_ms: Optional[int] = None
    end_ms: Optional[int] = None

    def to_dict(self) -> Dict:
        return {
            "text": self.text,
            "is_final": self.is_final,
            "start_ms": self.start_ms,
            "end_ms": self.end_ms,
        }


@dataclass
class TranscriptionResult:
    """Aggregate result of a complete transcription."""

    text: str
    segments: List[TranscriptionSegment] = field(default_factory=list)
    language: str = LANGUAGE_EN
    duration_ms: int = 0

    def to_dict(self) -> Dict:
        return {
            "text": self.text,
            "segments": [s.to_dict() for s in self.segments],
            "language": self.language,
            "duration_ms": self.duration_ms,
        }


# ---------------------------------------------------------------------------
# Result parsing helpers (pure — kept module-level so they're easy to test)
# ---------------------------------------------------------------------------


def parse_iat_message(raw: str) -> Tuple[Optional[TranscriptionSegment], bool, int]:
    """Parse one IAT WebSocket message.

    Returns a tuple ``(segment_or_None, end_of_stream, code)``.
    Non-zero ``code`` means the server reported an error.
    """
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None, False, -1

    code = int(data.get("code", 0))
    if code != 0:
        return None, True, code

    # IAT sends the final closing frame with status=2 and possibly empty data.
    payload = data.get("data") or {}
    status = int(payload.get("status", 0))
    end = status == STATUS_LAST

    result_obj = payload.get("result") or {}
    if not result_obj:
        return None, end, code

    # ``pgs`` indicates incremental update strategy:
    #   - "apd": append to previous partial
    #   - "rpl": replace partial range [rg[0], rg[1]] with this text
    # We expose it via TranscriptionSegment.is_final for now; the higher-level
    # aggregator handles deduplication.
    is_final = bool(result_obj.get("ls", False))

    # Extract text from the nested ws/cw structure used by iFlytek.
    pieces: List[str] = []
    for ws_item in result_obj.get("ws", []) or []:
        for cw in ws_item.get("cw", []) or []:
            w = cw.get("w")
            if w:
                pieces.append(w)
    text = "".join(pieces).strip()

    if not text:
        return None, end, code

    seg = TranscriptionSegment(
        text=text,
        is_final=is_final,
        start_ms=result_obj.get("bg"),
        end_ms=result_obj.get("ed"),
    )
    return seg, end, code


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


class IFlytekASRClient:
    """Async client for iFlytek IAT real-time speech transcription."""

    def __init__(
        self,
        app_id: Optional[str] = None,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        ws_url: Optional[str] = None,
    ):
        self.app_id = app_id or os.getenv("IFLYTEK_APP_ID", "")
        self.api_key = api_key or os.getenv("IFLYTEK_API_KEY", "")
        self.api_secret = api_secret or os.getenv("IFLYTEK_API_SECRET", "")
        self.ws_url = ws_url or os.getenv("IFLYTEK_IAT_URL", DEFAULT_IAT_URL)

    def is_configured(self) -> bool:
        return all([self.app_id, self.api_key, self.api_secret])

    # ------------------------------------------------------------------
    # WebSocket auth (identical pattern to TTS client)
    # ------------------------------------------------------------------

    def _create_auth_url(self) -> str:
        """Sign the WebSocket URL with HMAC-SHA256 per iFlytek spec.

        Uses UTC time (RFC 1123) for the ``date`` parameter — iFlytek's
        servers validate the timestamp and reject requests that are more
        than a few minutes off.
        """
        url = urlparse(self.ws_url)
        # UTC is required; local time causes auth failures.
        # Use timegm (not mktime) because timetuple() is in UTC.
        date = format_date_time(calendar.timegm(datetime.now(timezone.utc).timetuple()))

        signature_origin = (
            f"host: {url.netloc}\n"
            f"date: {date}\n"
            f"GET {url.path} HTTP/1.1"
        )
        signature_sha = hmac.new(
            self.api_secret.encode("utf-8"),
            signature_origin.encode("utf-8"),
            digestmod=hashlib.sha256,
        ).digest()
        signature_b64 = base64.b64encode(signature_sha).decode("utf-8")

        authorization_origin = (
            f'api_key="{self.api_key}", algorithm="hmac-sha256", '
            f'headers="host date request-line", signature="{signature_b64}"'
        )
        authorization = base64.b64encode(
            authorization_origin.encode("utf-8")
        ).decode("utf-8")

        params = {
            "authorization": authorization,
            "date": date,
            "host": url.netloc,
        }
        return f"{self.ws_url}?{urlencode(params, quote_via=quote)}"

    def _debug_auth(self) -> dict:
        """Return masked auth components for debugging (no secrets exposed)."""
        url = urlparse(self.ws_url)
        date = format_date_time(calendar.timegm(datetime.now(timezone.utc).timetuple()))
        signature_origin = (
            f"host: {url.netloc}\n"
            f"date: {date}\n"
            f"GET {url.path} HTTP/1.1"
        )
        return {
            "ws_url": self.ws_url,
            "host": url.netloc,
            "path": url.path,
            "date": date,
            "signature_origin_preview": signature_origin,
            "app_id_prefix": self.app_id[:4] + "..." if self.app_id else None,
            "api_key_prefix": self.api_key[:4] + "..." if self.api_key else None,
        }

    async def test_connection(self) -> dict:
        """Open a WebSocket to iFlytek and return diagnostic info.

        Does **not** send audio — just verifies the handshake succeeds
        and the server accepts our auth signature.
        """
        if not self.is_configured():
            return {"ok": False, "error": "Credentials not configured"}

        try:
            import websockets
        except ImportError:
            return {"ok": False, "error": "websockets package not installed"}

        auth_url = self._create_auth_url()
        try:
            async with websockets.connect(
                auth_url,
                open_timeout=10,
                close_timeout=5,
            ) as ws:
                # IAT expects a complete stream. Send first + 2 middle + last
                # frames with 40 ms of silence each (1280 bytes = 640 samples).
                silence = b"\x00\x00" * 640

                first = self.build_first_frame(
                    audio_chunk=silence,
                    language=LANGUAGE_EN,
                    encoding=ENCODING_RAW,
                    audio_format=FORMAT_PCM_16K,
                )
                await ws.send(first)
                await asyncio.sleep(0.04)

                for _ in range(2):
                    await ws.send(
                        self.build_continuation_frame(
                            audio_chunk=silence,
                            is_last=False,
                            encoding=ENCODING_RAW,
                            audio_format=FORMAT_PCM_16K,
                        )
                    )
                    await asyncio.sleep(0.04)

                await ws.send(
                    self.build_continuation_frame(
                        audio_chunk=b"",
                        is_last=True,
                        encoding=ENCODING_RAW,
                        audio_format=FORMAT_PCM_16K,
                    )
                )

                # Collect server responses for up to 5 seconds.
                segments: list[TranscriptionSegment] = []
                deadline = asyncio.get_event_loop().time() + 5
                while asyncio.get_event_loop().time() < deadline:
                    try:
                        raw = await asyncio.wait_for(ws.recv(), timeout=1)
                    except asyncio.TimeoutError:
                        continue
                    seg, end, code = parse_iat_message(
                        raw if isinstance(raw, str) else raw.decode("utf-8", "ignore")
                    )
                    if code != 0:
                        return {
                            "ok": False,
                            "error": f"iFlytek error code {code}",
                            "raw": raw[:500],
                        }
                    if seg is not None:
                        segments.append(seg)
                    if end:
                        return {
                            "ok": True,
                            "handshake": "success",
                            "segments": [s.to_dict() for s in segments],
                            "text": self._merge_segments(segments, LANGUAGE_EN),
                        }
                return {
                    "ok": True,
                    "handshake": "success",
                    "note": "Stream accepted but no final response within 5s.",
                    "segments": [s.to_dict() for s in segments],
                }
        except websockets.exceptions.InvalidStatusCode as e:
            return {
                "ok": False,
                "error": f"HTTP {e.status_code} — auth or endpoint issue",
                "status_code": e.status_code,
            }
        except Exception as e:
            return {"ok": False, "error": f"{type(e).__name__}: {e}"}

    # ------------------------------------------------------------------
    # Frame builders (pure — exposed for tests)
    # ------------------------------------------------------------------

    def build_first_frame(
        self,
        audio_chunk: bytes,
        language: str = LANGUAGE_EN,
        encoding: str = ENCODING_RAW,
        audio_format: str = FORMAT_PCM_16K,
        domain: str = "iat",
    ) -> str:
        # IAT requires ``accent`` for Chinese (error 10163 if missing).
        # For English it must be omitted — sending "mandarin" for en_us
        # causes the server to use the wrong acoustic model and return
        # garbage punctuation like "(.?)".
        business: Dict[str, str] = {
            "language": language,
            "domain": domain,
        }
        if language == LANGUAGE_ZH:
            business["accent"] = "mandarin"
        return json.dumps({
            "common": {"app_id": self.app_id},
            "business": business,
            "data": {
                "status": STATUS_FIRST,
                "format": audio_format,
                "encoding": encoding,
                "audio": base64.b64encode(audio_chunk).decode("utf-8"),
            },
        })

    def build_continuation_frame(
        self,
        audio_chunk: bytes,
        is_last: bool,
        encoding: str = ENCODING_RAW,
        audio_format: str = FORMAT_PCM_16K,
    ) -> str:
        return json.dumps({
            "data": {
                "status": STATUS_LAST if is_last else STATUS_MIDDLE,
                "format": audio_format,
                "encoding": encoding,
                "audio": base64.b64encode(audio_chunk).decode("utf-8"),
            },
        })

    # ------------------------------------------------------------------
    # Public API: transcribe full audio buffer
    # ------------------------------------------------------------------

    async def transcribe(
        self,
        audio: bytes,
        language: str = LANGUAGE_EN,
        encoding: str = ENCODING_RAW,
        audio_format: str = FORMAT_PCM_16K,
        frame_bytes: int = FRAME_BYTES,
        frame_interval_ms: int = 40,
    ) -> TranscriptionResult:
        """Transcribe a complete audio buffer and return the full transcript.

        Args:
            audio: Raw audio bytes (PCM/MP3/Speex per ``encoding``).
            language: ``en_us`` or ``zh_cn``.
            encoding: ``raw`` (PCM), ``lame`` (MP3), or ``speex``.
            audio_format: e.g. ``audio/L16;rate=16000`` for 16 kHz.
            frame_bytes: Bytes per WS frame (default 1280 = 40 ms).
            frame_interval_ms: Pause between frames; 0 for batch upload.

        Raises:
            ValueError: if credentials not configured or audio empty.
            RuntimeError: on transport / server errors.
        """
        # Mock mode for development — simulates a transcription without calling iFlytek.
        if ASR_MOCK_MODE:
            logger.info("ASR mock mode active — returning simulated transcript")
            mock_text = "This is a simulated voice transcription in mock mode."
            return TranscriptionResult(
                text=mock_text,
                segments=[
                    TranscriptionSegment(
                        text=mock_text,
                        is_final=True,
                        start_ms=0,
                        end_ms=2000,
                    )
                ],
                language=language,
                duration_ms=2000,
            )

        if not self.is_configured():
            raise ValueError(
                "iFlytek ASR credentials not configured. Set IFLYTEK_APP_ID, "
                "IFLYTEK_API_KEY, IFLYTEK_API_SECRET, or enable ASR_MOCK_MODE=true."
            )
        if not audio:
            raise ValueError("Cannot transcribe empty audio buffer.")

        try:
            import websockets
        except ImportError as e:
            raise RuntimeError(
                "websockets package not installed. Run: pip install websockets"
            ) from e

        chunks = self._chunk_audio(audio, frame_bytes)
        segments: List[TranscriptionSegment] = []

        auth_url = self._create_auth_url()
        logger.info(f"Connecting to iFlytek IAT at {self.ws_url}")

        try:
            async with websockets.connect(
                auth_url,
                open_timeout=10,
                close_timeout=5,
            ) as ws:
                logger.info("WebSocket connected to iFlytek IAT")

                # Producer: stream frames
                producer = asyncio.create_task(
                    self._send_frames(
                        ws, chunks, language, encoding, audio_format,
                        frame_interval_ms,
                    )
                )
                # Consumer: collect results until end-of-stream
                consumer = asyncio.create_task(
                    self._receive_results(ws)
                )

                # Wait for both. Producer finishes first; consumer continues
                # until server flags status=2 (end) or socket closes.
                await producer
                segments = await consumer
                logger.info(f"Transcription complete: {len(segments)} segments")

        except websockets.exceptions.InvalidStatusCode as e:
            logger.error(f"iFlytek rejected connection: HTTP {e.status_code}")
            raise RuntimeError(
                f"iFlytek rejected connection (HTTP {e.status_code}). "
                "Check IFLYTEK_APP_ID, API_KEY, API_SECRET are correct."
            ) from e
        except websockets.exceptions.ConnectionClosed as e:
            logger.error(f"iFlytek connection closed unexpectedly: {e}")
            # If we got some segments, we might have partial results
            if segments:
                logger.warning(f"Returning partial transcript ({len(segments)} segments)")
            else:
                raise RuntimeError(
                    "iFlytek connection closed unexpectedly. Possible causes: "
                    "(1) Invalid audio format - ensure 16kHz 16-bit mono PCM, "
                    "(2) Network/firewall blocking WebSocket, "
                    "(3) iFlytek service unavailable."
                ) from e
        except asyncio.TimeoutError as e:
            logger.error("Timeout connecting to iFlytek IAT")
            raise RuntimeError(
                "Timeout connecting to iFlytek. Check network connectivity."
            ) from e
        except Exception as e:
            logger.error(f"iFlytek IAT transcription failed: {type(e).__name__}: {e}")
            raise RuntimeError(f"iFlytek IAT transcription failed: {e}") from e

        text = self._merge_segments(segments, language)
        return TranscriptionResult(
            text=text,
            segments=segments,
            language=language,
            duration_ms=segments[-1].end_ms or 0 if segments else 0,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _chunk_audio(audio: bytes, frame_bytes: int) -> List[bytes]:
        if frame_bytes <= 0:
            raise ValueError("frame_bytes must be positive")
        return [audio[i : i + frame_bytes] for i in range(0, len(audio), frame_bytes)]

    async def _send_frames(
        self,
        ws,
        chunks: List[bytes],
        language: str,
        encoding: str,
        audio_format: str,
        frame_interval_ms: int,
    ) -> None:
        """Send first/middle/last frames with iFlytek's recommended pacing."""
        for i, chunk in enumerate(chunks):
            is_first = i == 0
            is_last = i == len(chunks) - 1
            if is_first:
                payload = self.build_first_frame(
                    audio_chunk=chunk,
                    language=language,
                    encoding=encoding,
                    audio_format=audio_format,
                )
            else:
                payload = self.build_continuation_frame(
                    audio_chunk=chunk,
                    is_last=is_last,
                    encoding=encoding,
                    audio_format=audio_format,
                )
            await ws.send(payload)
            if not is_last and frame_interval_ms > 0:
                await asyncio.sleep(frame_interval_ms / 1000.0)

        # Always send a final empty terminator if the last data frame
        # wasn't already marked status=2 (defensive — for empty audio
        # paths we already validated above).
        if not chunks:
            await ws.send(self.build_continuation_frame(b"", is_last=True))

    async def _receive_results(self, ws) -> List[TranscriptionSegment]:
        segments: List[TranscriptionSegment] = []
        while True:
            try:
                raw = await ws.recv()
            except asyncio.CancelledError:
                raise
            except Exception:
                break
            raw_str = raw if isinstance(raw, str) else raw.decode("utf-8", "ignore")
            seg, end, code = parse_iat_message(raw_str)
            if code != 0:
                raise RuntimeError(f"iFlytek IAT error code {code}: {raw_str[:200]!r}")
            # Debug: log every non-empty response from iFlytek
            if seg is not None or (isinstance(raw_str, str) and '"result"' in raw_str):
                logger.debug(f"iFlytek raw: {raw_str[:300]}")
            if seg is not None:
                logger.info(f"iFlytek segment: text={seg.text!r} final={seg.is_final}")
                segments.append(seg)
            if end:
                break
        return segments

    @staticmethod
    def _merge_segments(segments: List[TranscriptionSegment], language: str = LANGUAGE_EN) -> str:
        """Merge incremental segments into one transcript.

        IAT emits both partial and final segments. We dedupe by keeping the
        last text emitted before each ``is_final=True`` boundary, plus any
        trailing partial segments.
        """
        if not segments:
            return ""

        # iFlytek emits a sequence of growing partials followed by a final
        # that *supersedes* them (e.g. "Hel" → "Hello" → final "Hello world").
        # When we see the final, drop all preceding partials for that
        # utterance and keep only the final. Trailing partials with no final
        # boundary still survive.
        finals: List[str] = []
        last_partial = ""
        for seg in segments:
            if seg.is_final:
                last_partial = ""  # supersede any partials of this utterance
                finals.append(seg.text)
            else:
                last_partial = seg.text
        if last_partial:
            finals.append(last_partial)

        # Chinese text should not have spaces inserted between characters.
        if language == LANGUAGE_ZH:
            merged = "".join(p.strip() for p in finals if p.strip())
        else:
            merged = " ".join(p.strip() for p in finals if p.strip())
        return merged


# Module-level singleton for FastAPI handlers
asr_client = IFlytekASRClient()
