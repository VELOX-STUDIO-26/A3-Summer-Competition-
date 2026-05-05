"""
Text-to-Speech API endpoints.

Provides TTS synthesis using Edge-TTS (free) or iFlytek TTS (production).
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel, Field
from typing import Optional, Literal

from core.tts_client import tts_client, get_cache_path, IFLYTEK_VOICES, AVAILABLE_VOICES, TTS_CACHE_DIR

router = APIRouter(prefix="/api/tts", tags=["tts"])


class TTSRequest(BaseModel):
    """Request body for TTS synthesis."""
    text: str = Field(..., min_length=1, max_length=5000, description="Text to synthesize")
    voice: Optional[str] = Field(None, description="Voice identifier")
    provider: Optional[Literal["edge", "iflytek"]] = Field("edge", description="TTS provider")
    rate: Optional[str] = Field("+0%", description="Speaking rate (Edge-TTS only)")
    volume: Optional[str] = Field("+0%", description="Volume level")


class VoicesResponse(BaseModel):
    """Response for available voices."""
    edge: dict
    iflytek: dict


@router.post("/synthesize", response_class=Response)
async def synthesize_speech(request: TTSRequest):
    """
    Synthesize text to speech.
    
    Returns MP3 audio bytes.
    
    **Providers:**
    - `edge`: Free Edge-TTS (Microsoft voices)
    - `iflytek`: iFlytek TTS (requires API credentials)
    
    **Example:**
    ```
    POST /api/tts/synthesize
    {
        "text": "Hello, welcome to A3 Learning!",
        "voice": "en-US-JennyNeural",
        "provider": "edge"
    }
    ```
    """
    try:
        audio_bytes = await tts_client.synthesize(
            text=request.text,
            voice=request.voice,
            rate=request.rate,
            volume=request.volume,
            provider=request.provider
        )
        
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=speech.mp3"
            }
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")


@router.get("/voices")
async def list_voices(
    language: Optional[str] = Query(None, description="Filter by language (en, zh)"),
    provider: Optional[str] = Query(None, description="Filter by provider (edge, iflytek)")
):
    """
    List available TTS voices.
    
    **Query Parameters:**
    - `language`: Filter by language code (`en` for English, `zh` for Chinese)
    - `provider`: Filter by provider (`edge` or `iflytek`)
    
    **Example:**
    ```
    GET /api/tts/voices?language=en
    ```
    """
    return tts_client.list_voices(language=language, provider=provider)


@router.get("/status")
async def get_tts_status():
    """
    Get TTS provider status.

    Returns availability and configuration status for each provider.
    """
    return tts_client.get_provider_status()


@router.get("/cached/{cache_key}")
async def get_cached_tts(cache_key: str):
    """
    Serve a pre-generated TTS audio file from cache.

    Args:
        cache_key: The MD5 hash key of the cached audio

    Returns:
        MP3 audio file
    """
    cache_path = TTS_CACHE_DIR / f"{cache_key}.mp3"
    if not cache_path.exists():
        raise HTTPException(status_code=404, detail=f"Cached audio {cache_key} not found")

    # Cache aggressively: cache keys are content-addressable (md5 of text +
    # voice + provider), so the file is immutable for a given key.
    return FileResponse(
        path=str(cache_path),
        media_type="audio/mpeg",
        filename=f"{cache_key}.mp3",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "Accept-Ranges": "bytes",
        },
    )
