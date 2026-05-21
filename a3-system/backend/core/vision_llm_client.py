"""Vision LLM client for image analysis using OpenRouter multimodal models."""

from typing import Any, Dict, List, Optional
import base64
import io

from core.llm_client import llm_client
from core.logging import get_logger

logger = get_logger(__name__)


class VisionLLMClient:
    """Client for multimodal LLM operations (text + image)."""

    def __init__(self):
        # Vision-capable models on OpenRouter
        self.vision_models = [
            "openai/gpt-4o",  # Primary
            "openai/gpt-4o-mini",  # Fallback
            "anthropic/claude-3-opus-20240229",  # Alternative
            "anthropic/claude-3-sonnet-20240229",  # Alternative
            "google/gemini-pro-vision",  # Alternative
        ]
        self.current_model_index = 0

    def _encode_image(self, image_bytes: bytes) -> str:
        """Encode image bytes to base64."""
        return base64.b64encode(image_bytes).decode("utf-8")

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
        base64_image = self._encode_image(image_bytes)

        # Construct multimodal message
        content = []

        # Add image
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{mime_type};base64,{base64_image}",
                "detail": "high",
            },
        })

        # Add text question
        prompt = question if question else "Please analyze this image and explain what you see."
        content.append({
            "type": "text",
            "text": prompt,
        })

        messages = [
            {
                "role": "system",
                "content": """You are A3, a helpful learning assistant. When analyzing images:
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

        # Try vision models in order
        for model in self.vision_models:
            try:
                logger.info(f"Analyzing image with model: {model}")
                response = await llm_client.generate(
                    messages=messages,
                    model=model,
                    temperature=0.3,
                    max_tokens=2000,
                )

                if isinstance(response, dict) and "choices" in response and response["choices"]:
                    text = response["choices"][0].get("message", {}).get("content", "")
                elif isinstance(response, dict) and "content" in response:
                    text = response["content"]
                else:
                    text = str(response)

                return {
                    "analysis": text.strip(),
                    "model_used": model,
                    "success": True,
                }

            except Exception as e:
                logger.warning(f"Vision model {model} failed: {e}")
                continue

        # All models failed
        return {
            "analysis": "I apologize, but I'm unable to analyze this image at the moment. Please try again or describe what you see in the image.",
            "model_used": None,
            "success": False,
            "error": "All vision models failed",
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
