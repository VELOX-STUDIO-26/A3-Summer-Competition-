"""Vision LLM client for image analysis using Kimi multimodal model."""

from typing import Any, Dict, List, Optional
import base64
import os
import io
import httpx
from PIL import Image

from core.logging import get_logger

logger = get_logger(__name__)

# Maximum image size in bytes for the API (compress if larger)
MAX_IMAGE_SIZE_KB = 500  # 500KB limit
MAX_IMAGE_DIMENSION = 1024  # Max width/height


class VisionLLMClient:
    """Client for multimodal LLM operations (text + image) using Kimi."""

    def __init__(self):
        # Kimi API for vision (Kimi 2.6 is multimodal)
        self.api_key = os.getenv("KIMI_API_KEY", "")
        self.base_url = os.getenv("KIMI_BASE_URL", "https://api.moonshot.cn")
        self.model = "kimi-k2.6"
        # kimi-k2.* require temperature=1.0 with reasoning ON, 0.6 with it OFF
        from core.llm_client import KIMI_DISABLE_REASONING
        self.disable_reasoning = KIMI_DISABLE_REASONING
        self.temperature = 0.6 if self.disable_reasoning else 1.0
        self.max_tokens = int(os.getenv("KIMI_VISION_MAX_TOKENS", "4000"))
        
        if self.api_key:
            logger.info(f"VisionLLMClient initialized with Kimi: {self.model}")

    def _compress_image(self, image_bytes: bytes, max_size_kb: int = MAX_IMAGE_SIZE_KB) -> tuple[bytes, str]:
        """Compress image if it's too large for the API.
        
        Returns:
            Tuple of (compressed_bytes, mime_type)
        """
        original_size_kb = len(image_bytes) / 1024
        
        # If already small enough, return as-is
        if original_size_kb <= max_size_kb:
            # Detect format
            try:
                img = Image.open(io.BytesIO(image_bytes))
                fmt = img.format or "PNG"
                mime = f"image/{fmt.lower()}"
                return image_bytes, mime
            except:
                return image_bytes, "image/png"
        
        logger.info(f"Compressing image from {original_size_kb:.1f}KB to under {max_size_kb}KB")
        
        try:
            # Open image
            img = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if necessary (for JPEG)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Resize if too large
            if max(img.size) > MAX_IMAGE_DIMENSION:
                ratio = MAX_IMAGE_DIMENSION / max(img.size)
                new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                logger.info(f"Resized image to {new_size}")
            
            # Compress with decreasing quality until under limit
            for quality in [85, 70, 50, 30, 20]:
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=quality, optimize=True)
                compressed = buffer.getvalue()
                
                if len(compressed) / 1024 <= max_size_kb:
                    logger.info(f"Compressed to {len(compressed)/1024:.1f}KB at quality={quality}")
                    return compressed, "image/jpeg"
            
            # If still too large, resize more aggressively
            for scale in [0.75, 0.5, 0.25]:
                new_size = (int(img.size[0] * scale), int(img.size[1] * scale))
                resized = img.resize(new_size, Image.Resampling.LANCZOS)
                buffer = io.BytesIO()
                resized.save(buffer, format='JPEG', quality=50, optimize=True)
                compressed = buffer.getvalue()
                
                if len(compressed) / 1024 <= max_size_kb:
                    logger.info(f"Compressed to {len(compressed)/1024:.1f}KB at scale={scale}")
                    return compressed, "image/jpeg"
            
            # Return whatever we got
            return compressed, "image/jpeg"
            
        except Exception as e:
            logger.warning(f"Image compression failed: {e}, using original")
            return image_bytes, "image/png"

    def _encode_image(self, image_bytes: bytes) -> tuple[str, str]:
        """Compress and encode image bytes to base64.
        
        Returns:
            Tuple of (base64_string, mime_type)
        """
        compressed, mime_type = self._compress_image(image_bytes)
        return base64.b64encode(compressed).decode("utf-8"), mime_type

    async def analyze_image(
        self,
        image_bytes: bytes,
        question: str = "",
        mime_type: str = "image/png",
    ) -> Dict[str, Any]:
        """Analyze an image and answer a question about it.

        Args:
            image_bytes: Raw image bytes
            question: Question about the image
            mime_type: MIME type of image (image/png, image/jpeg, etc.)

        Returns:
            Dict with analysis text and metadata
        """
        # Compress and encode image
        base64_image, actual_mime_type = self._encode_image(image_bytes)

        # Construct multimodal message (OpenAI-compatible format for Kimi)
        prompt = question if question else "Please analyze this image and explain what you see."
        
        content = [
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{actual_mime_type};base64,{base64_image}"
                }
            },
            {
                "type": "text",
                "text": prompt
            }
        ]

        messages = [
            {
                "role": "system",
                "content": """You are NoboGyan, a helpful learning assistant. When analyzing images:
- For equations: Extract and format them in LaTeX
- For diagrams: Explain the architecture, components, and relationships
- For code screenshots: Identify the language and explain the code
- For charts: Describe what the data shows
Be thorough but concise. Use markdown formatting.""",
            },
            {
                "role": "user",
                "content": content,
            },
        ]

        # Use Kimi for vision analysis
        if not self.api_key:
            logger.error("Kimi API key not configured for vision")
            return {
                "analysis": "Image analysis is not available. API key not configured.",
                "model_used": None,
                "success": False,
                "error": "No API key",
            }

        try:
            # Log image size for debugging
            original_size_kb = len(image_bytes) / 1024
            encoded_size_kb = len(base64_image) / 1024
            logger.info(f"Analyzing image with Kimi: {self.model} (original: {original_size_kb:.1f}KB, encoded: {encoded_size_kb:.1f}KB, type: {actual_mime_type})")
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": self.temperature,
                "max_tokens": self.max_tokens,
            }
            if self.disable_reasoning:
                payload["thinking"] = {"type": "disabled"}
            
            async with httpx.AsyncClient(timeout=float(os.getenv("KIMI_TIMEOUT_SECONDS", "600"))) as client:
                response = await client.post(
                    f"{self.base_url}/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )
                
                # Log response status for debugging
                logger.info(f"Kimi vision response status: {response.status_code}")
                
                if response.status_code != 200:
                    error_text = response.text
                    logger.error(f"Kimi vision error response: {error_text[:500]}")
                
                response.raise_for_status()
                data = response.json()

            if "choices" in data and data["choices"]:
                text = data["choices"][0].get("message", {}).get("content", "")
                if text:
                    return {
                        "analysis": text.strip(),
                        "model_used": self.model,
                        "success": True,
                    }

            return {
                "analysis": "No response from the model.",
                "model_used": self.model,
                "success": False,
                "error": "Empty response",
            }

        except Exception as e:
            logger.error(f"Kimi vision failed: {e}")
            return {
                "analysis": f"I apologize, but I'm unable to analyze this image at the moment. Error: {str(e)}",
                "model_used": self.model,
                "success": False,
                "error": str(e),
            }

    async def extract_equation(
        self,
        image_bytes: bytes,
        mime_type: str = "image/png",
    ) -> Dict[str, Any]:
        """Extract LaTeX from an equation image."""
        prompt = """Please extract the mathematical equation from this image and format it in LaTeX.
Provide the LaTeX code in a code block like:
```latex
...
```
Also provide a brief explanation of what the equation represents."""

        result = await self.analyze_image(image_bytes, prompt, mime_type)

        # Try to extract LaTeX from the response
        analysis = result.get("analysis", "")
        latex_match = None

        if "```latex" in analysis:
            start = analysis.find("```latex") + 8
            end = analysis.find("```", start)
            if end > start:
                latex_match = analysis[start:end].strip()
        elif "```" in analysis:
            start = analysis.find("```") + 3
            end = analysis.find("```", start)
            if end > start:
                candidate = analysis[start:end].strip()
                # Only accept the fallback block if it looks like math/LaTeX
                if any(c in candidate for c in ("\\", "^", "_", "{", "}", "\\sum", "\\int", "\\frac")):
                    latex_match = candidate

        return {
            **result,
            "latex": latex_match,
        }


# Singleton instance
vision_llm_client = VisionLLMClient()
