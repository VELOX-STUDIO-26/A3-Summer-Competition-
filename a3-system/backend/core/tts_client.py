"""
Text-to-Speech client for the A3 Learning System.

Supports two providers:
1. Edge-TTS (free, no API key) - default for development
2. iFlytek TTS (WebSocket API) - for production with better Chinese voices

iFlytek TTS API Documentation:
https://global.xfyun.com/doc/tts/online_tts/API.html
"""

import io
import os
import json
import base64
import hashlib
import hmac
import asyncio
from datetime import datetime
from time import mktime
from wsgiref.handlers import format_date_time
from urllib.parse import urlencode, urlparse
from typing import Any, Dict, List, Optional

from core.logging import get_logger

logger = get_logger(__name__)

# Default voice (Edge-TTS)
DEFAULT_VOICE = "en-US-JennyNeural"

# Edge-TTS voices (Chinese)
EDGE_VOICES_CHINESE = [
    "zh-CN-XiaoxiaoNeural",   # Female, warm
    "zh-CN-XiaoyiNeural",     # Female, bright
    "zh-CN-YunjianNeural",    # Male, mature
    "zh-CN-YunxiNeural",      # Male, energetic
    "zh-CN-YunxiaNeural",     # Male, gentle
]

# Edge-TTS voices (English)
EDGE_VOICES_ENGLISH = [
    "en-US-JennyNeural",      # Female, friendly
    "en-US-GuyNeural",        # Male, professional
    "en-US-AriaNeural",       # Female, expressive
    "en-US-DavisNeural",      # Male, casual
    "en-US-SaraNeural",       # Female, cheerful
    "en-GB-SoniaNeural",      # British Female
    "en-GB-RyanNeural",       # British Male
    "en-AU-NatashaNeural",    # Australian Female
    "en-AU-WilliamNeural",    # Australian Male
]

# All Edge-TTS voices
AVAILABLE_VOICES = EDGE_VOICES_ENGLISH + EDGE_VOICES_CHINESE

# iFlytek TTS voices (Chinese)
IFLYTEK_VOICES_CHINESE = {
    "xiaoyan": "Chinese Female (Standard)",
    "aisjiuxu": "Chinese Male (Standard)",
    "aisxping": "Chinese Female (Sweet)",
    "aisjinger": "Chinese Female (Gentle)",
    "aisbabyxu": "Chinese Child",
}

# iFlytek TTS voices (English) - Note: Check iFlytek console for available English voices
IFLYTEK_VOICES_ENGLISH = {
    "catherine": "English Female (US)",
    "john": "English Male (US)",
}

# All iFlytek voices
IFLYTEK_VOICES = {**IFLYTEK_VOICES_CHINESE, **IFLYTEK_VOICES_ENGLISH}


class IFlytekTTSClient:
    """
    iFlytek Text-to-Speech WebSocket Client.
    
    Uses WebSocket API for streaming TTS synthesis.
    Docs: https://global.xfyun.com/doc/tts/online_tts/API.html
    """
    
    # WebSocket URL for TTS (Singapore region)
    WS_URL = "wss://tts-api-sg.xf-yun.com/v2/tts"
    
    def __init__(
        self,
        app_id: Optional[str] = None,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None
    ):
        self.app_id = app_id or os.getenv("IFLYTEK_APP_ID", "")
        self.api_key = api_key or os.getenv("IFLYTEK_API_KEY", "")
        self.api_secret = api_secret or os.getenv("IFLYTEK_API_SECRET", "")
        
    def _create_auth_url(self) -> str:
        """Create authenticated WebSocket URL with HMAC-SHA256 signature."""
        url = urlparse(self.WS_URL)
        
        # RFC1123 date format
        now = datetime.now()
        date = format_date_time(mktime(now.timetuple()))
        
        # Create signature string
        signature_origin = f"host: {url.netloc}\ndate: {date}\nGET {url.path} HTTP/1.1"
        
        # HMAC-SHA256 signature
        signature_sha = hmac.new(
            self.api_secret.encode('utf-8'),
            signature_origin.encode('utf-8'),
            digestmod=hashlib.sha256
        ).digest()
        signature_sha_base64 = base64.b64encode(signature_sha).decode('utf-8')
        
        # Authorization header
        authorization_origin = (
            f'api_key="{self.api_key}", algorithm="hmac-sha256", '
            f'headers="host date request-line", signature="{signature_sha_base64}"'
        )
        authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode('utf-8')
        
        # Build authenticated URL
        params = {
            "authorization": authorization,
            "date": date,
            "host": url.netloc
        }
        
        return f"{self.WS_URL}?{urlencode(params)}"
    
    async def synthesize(
        self,
        text: str,
        voice: str = "xiaoyan",
        speed: int = 50,
        volume: int = 50,
        pitch: int = 50,
        audio_format: str = "mp3"
    ) -> bytes:
        """
        Synthesize text to audio using iFlytek TTS.
        
        Args:
            text: Text to synthesize (max 8000 bytes per request)
            voice: Voice name (e.g., "xiaoyan", "aisjiuxu")
            speed: Speaking speed (0-100, default 50)
            volume: Volume level (0-100, default 50)
            pitch: Pitch level (0-100, default 50)
            audio_format: Output format ("raw", "mp3", "speex")
            
        Returns:
            Audio bytes in specified format
        """
        try:
            import websockets
        except ImportError:
            raise RuntimeError("websockets package not installed. Run: pip install websockets")
        
        if not all([self.app_id, self.api_key, self.api_secret]):
            raise ValueError("iFlytek credentials not configured. Set IFLYTEK_APP_ID, IFLYTEK_API_KEY, IFLYTEK_API_SECRET")
        
        # Encode text to base64
        text_base64 = base64.b64encode(text.encode('utf-8')).decode('utf-8')
        
        # Audio encoding format
        aue_map = {"raw": "raw", "mp3": "lame", "speex": "speex"}
        aue = aue_map.get(audio_format, "lame")
        
        # Request payload
        request_data = {
            "common": {
                "app_id": self.app_id
            },
            "business": {
                "vcn": voice,
                "aue": aue,
                "speed": speed,
                "volume": volume,
                "pitch": pitch,
                "tte": "UTF8"
            },
            "data": {
                "status": 2,  # 2 = complete text in one frame
                "text": text_base64
            }
        }
        
        auth_url = self._create_auth_url()
        audio_buffer = io.BytesIO()
        
        try:
            async with websockets.connect(auth_url) as ws:
                # Send request
                await ws.send(json.dumps(request_data))
                
                # Receive audio chunks
                while True:
                    response = await ws.recv()
                    data = json.loads(response)
                    
                    code = data.get("code", 0)
                    if code != 0:
                        error_msg = data.get("message", "Unknown error")
                        raise RuntimeError(f"iFlytek TTS error {code}: {error_msg}")
                    
                    # Extract audio data
                    audio_data = data.get("data", {}).get("audio")
                    if audio_data:
                        audio_bytes = base64.b64decode(audio_data)
                        audio_buffer.write(audio_bytes)
                    
                    # Check if synthesis is complete
                    status = data.get("data", {}).get("status", 0)
                    if status == 2:  # 2 = final frame
                        break
                        
        except Exception as e:
            logger.error(f"iFlytek TTS synthesis failed: {e}")
            raise
        
        return audio_buffer.getvalue()
    
    def is_configured(self) -> bool:
        """Check if iFlytek credentials are configured."""
        return all([self.app_id, self.api_key, self.api_secret])


class TTSClient:
    """
    Unified TTS client supporting multiple providers.
    
    Providers:
    - "edge": Edge-TTS (free, no API key) - default
    - "iflytek": iFlytek TTS (requires API credentials)
    """

    def __init__(
        self,
        provider: str = "edge",
        voice: Optional[str] = None,
        iflytek_app_id: Optional[str] = None,
        iflytek_api_key: Optional[str] = None,
        iflytek_api_secret: Optional[str] = None
    ):
        self.provider = provider
        self.voice = voice or DEFAULT_VOICE
        self._edge_available = None
        
        # Initialize iFlytek client if credentials provided
        self._iflytek_client = IFlytekTTSClient(
            app_id=iflytek_app_id,
            api_key=iflytek_api_key,
            api_secret=iflytek_api_secret
        )

    def _check_edge(self) -> bool:
        """Check if edge-tts is installed."""
        if self._edge_available is None:
            try:
                import edge_tts
                self._edge_available = True
            except ImportError:
                self._edge_available = False
                logger.warning("edge-tts not installed.")
        return self._edge_available

    async def synthesize(
        self,
        text: str,
        voice: Optional[str] = None,
        rate: str = "+0%",
        volume: str = "+0%",
        provider: Optional[str] = None
    ) -> bytes:
        """
        Synthesize text to audio bytes.

        Args:
            text: Text to speak (max 5000 chars for Edge, 8000 bytes for iFlytek)
            voice: Voice identifier (provider-specific)
            rate: Speaking rate (Edge-TTS only, e.g., "+0%", "-10%", "+20%")
            volume: Volume level (e.g., "+0%", "-10%", "+20%")
            provider: Override default provider ("edge" or "iflytek")

        Returns:
            MP3 audio bytes
        """
        use_provider = provider or self.provider
        voice = voice or self.voice

        if use_provider == "iflytek":
            return await self._synthesize_iflytek(text, voice, volume)
        else:
            return await self._synthesize_edge(text, voice, rate, volume)

    async def _synthesize_edge(
        self,
        text: str,
        voice: str,
        rate: str,
        volume: str
    ) -> bytes:
        """Synthesize using Edge-TTS."""
        if not self._check_edge():
            raise RuntimeError("TTS not available: edge-tts is not installed")

        try:
            import edge_tts

            communicate = edge_tts.Communicate(
                text=text,
                voice=voice,
                rate=rate,
                volume=volume
            )

            mp3_buffer = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    mp3_buffer.write(chunk["data"])

            return mp3_buffer.getvalue()

        except Exception as e:
            logger.error(f"Edge-TTS synthesis failed: {e}")
            raise

    async def _synthesize_iflytek(
        self,
        text: str,
        voice: str,
        volume: str
    ) -> bytes:
        """Synthesize using iFlytek TTS."""
        if not self._iflytek_client.is_configured():
            raise RuntimeError(
                "iFlytek TTS not configured. Set IFLYTEK_APP_ID, "
                "IFLYTEK_API_KEY, IFLYTEK_API_SECRET environment variables."
            )
        
        # Convert volume from Edge format ("+0%") to iFlytek format (0-100)
        try:
            vol_percent = int(volume.replace("%", "").replace("+", ""))
            vol_iflytek = 50 + vol_percent // 2  # Map -100%..+100% to 0..100
            vol_iflytek = max(0, min(100, vol_iflytek))
        except:
            vol_iflytek = 50
        
        # Map voice name if needed
        iflytek_voice = voice if voice in IFLYTEK_VOICES else "xiaoyan"
        
        return await self._iflytek_client.synthesize(
            text=text,
            voice=iflytek_voice,
            volume=vol_iflytek
        )

    def list_voices(self, language: Optional[str] = None, provider: Optional[str] = None) -> dict:
        """
        List available voices.
        
        Args:
            language: Filter by language ("en" for English, "zh" for Chinese)
            provider: Filter by provider ("edge" or "iflytek")
        
        Returns:
            Dict with provider names as keys and voice info as values
        """
        use_provider = provider or self.provider
        
        result = {}
        
        # Edge-TTS voices
        if use_provider in ["edge", None, "all"]:
            if language == "en":
                edge_voices = EDGE_VOICES_ENGLISH
            elif language == "zh":
                edge_voices = EDGE_VOICES_CHINESE
            else:
                edge_voices = AVAILABLE_VOICES
            result["edge"] = {
                "voices": edge_voices,
                "default": DEFAULT_VOICE
            }
        
        # iFlytek voices
        if use_provider in ["iflytek", None, "all"]:
            if language == "en":
                iflytek_voices = IFLYTEK_VOICES_ENGLISH
            elif language == "zh":
                iflytek_voices = IFLYTEK_VOICES_CHINESE
            else:
                iflytek_voices = IFLYTEK_VOICES
            result["iflytek"] = {
                "voices": iflytek_voices,
                "default": "xiaoyan" if language == "zh" else "catherine"
            }
        
        return result
    
    def get_provider_status(self) -> dict:
        """Get status of available TTS providers."""
        return {
            "edge": {
                "available": self._check_edge(),
                "configured": True  # No config needed
            },
            "iflytek": {
                "available": True,  # Always available if websockets installed
                "configured": self._iflytek_client.is_configured()
            }
        }


# ── TTS Disk Cache ──

import hashlib
import pathlib

TTS_CACHE_DIR = pathlib.Path(__file__).parent.parent / "cache" / "tts"
TTS_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _tts_cache_key(text: str, voice: str, provider: str) -> str:
    """Create a deterministic cache key for a TTS request."""
    content = f"{provider}:{voice}:{text}"
    return hashlib.md5(content.encode("utf-8")).hexdigest()


def get_cache_path(text: str, voice: str = DEFAULT_VOICE, provider: str = "edge") -> pathlib.Path:
    """Return the filesystem path for a cached TTS audio file."""
    key = _tts_cache_key(text, voice, provider)
    return TTS_CACHE_DIR / f"{key}.mp3"


async def batch_synthesize_to_cache(
    items: List[Dict[str, str]],
    provider: str = "edge",
    voice: str = DEFAULT_VOICE,
) -> List[Dict[str, Any]]:
    """
    Batch-generate TTS audio and save to disk cache.

    Args:
        items: List of dicts with keys "text" and optional "slide_idx"
        provider: TTS provider ("edge" or "iflytek")
        voice: Voice identifier

    Returns:
        List of dicts with "slide_idx", "cache_key", "cached", "error"
    """
    from core.logging import get_logger
    logger = get_logger(__name__)

    async def _gen(item: Dict[str, str]) -> Dict[str, Any]:
        text = item.get("text", "")
        slide_idx = item.get("slide_idx", 0)
        if not text:
            return {"slide_idx": slide_idx, "cache_key": None, "cached": False, "error": "empty text"}

        cache_path = get_cache_path(text, voice, provider)
        cache_key = cache_path.stem

        if cache_path.exists():
            return {"slide_idx": slide_idx, "cache_key": cache_key, "cached": True, "error": None}

        try:
            audio_bytes = await tts_client.synthesize(text, voice=voice, provider=provider)
            cache_path.write_bytes(audio_bytes)
            logger.info(f"TTS cached: {cache_key} (slide {slide_idx})")
            return {"slide_idx": slide_idx, "cache_key": cache_key, "cached": True, "error": None}
        except Exception as e:
            logger.error(f"TTS cache failed for slide {slide_idx}: {e}")
            return {"slide_idx": slide_idx, "cache_key": None, "cached": False, "error": str(e)}

    results = await asyncio.gather(*[_gen(item) for item in items])
    return results


# Global TTS client instance
tts_client = TTSClient()

# iFlytek client instance (for direct access)
iflytek_tts = IFlytekTTSClient()
