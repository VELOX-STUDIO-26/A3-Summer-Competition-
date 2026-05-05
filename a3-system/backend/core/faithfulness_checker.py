"""
Faithfulness Checker Module for Hallucination Detection.

This module provides verification of AI-generated content against source material
to detect hallucinations and unsupported claims.

Usage:
    checker = FaithfulnessChecker()
    result = await checker.check_faithfulness(
        generated_text="The sky is blue.",
        source_chunks=[{"id": "chunk1", "text": "The sky appears blue due to Rayleigh scattering."}]
    )
    print(result.score)  # 1.0 (supported)
    print(result.unsupported_claims)  # []
"""

import json
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

from core.config import settings
from core.llm_client import llm_client
from core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class FaithfulnessResult:
    """Result of a faithfulness check."""

    score: float  # 0.0 to 1.0 (1.0 = fully supported)
    total_claims: int
    supported_count: int
    contradicted_count: int
    unverifiable_count: int
    unsupported_claims: List[Dict[str, str]] = field(default_factory=list)
    citations: List[str] = field(default_factory=list)
    warning_message: Optional[str] = None


class FaithfulnessChecker:
    """
    Checks if generated text is faithful to source material.

    Uses an LLM to classify each claim in the generated text as:
    - supported: Directly entailed by source
    - contradicted: Directly contradicted by source
    - unverifiable: Not mentioned in source (potential hallucination)
    """

    def __init__(self):
        self.enabled = getattr(settings, 'enable_faithfulness_check', True)
        self.threshold = getattr(settings, 'faithfulness_threshold', 0.8)
        self.llm = llm_client

    async def check_faithfulness(
        self,
        generated_text: str,
        source_chunks: List[Dict[str, Any]],
        context: Optional[str] = None,
    ) -> FaithfulnessResult:
        """
        Check if generated text is supported by source chunks.

        Args:
            generated_text: The AI-generated content to verify
            source_chunks: List of source chunks with 'id' and 'text' keys
            context: Optional additional context (e.g., topic name)

        Returns:
            FaithfulnessResult with score and breakdown
        """
        if not self.enabled or not source_chunks:
            logger.debug("Faithfulness check skipped: disabled or no sources")
            return FaithfulnessResult(
                score=1.0,
                total_claims=0,
                supported_count=0,
                contradicted_count=0,
                unverifiable_count=0,
                warning_message=None if not source_chunks else "No source verification performed",
            )

        try:
            # Build the verification prompt
            prompt = self._build_verification_prompt(generated_text, source_chunks, context)

            # Call LLM for verification
            response = await self.llm.complete(
                prompt=prompt,
                temperature=0.0,  # Deterministic for consistency
                max_tokens=2000,
            )

            # Parse the verification result
            result = self._parse_verification_response(response)

            # Add warning if score is below threshold
            if result.score < self.threshold:
                result.warning_message = (
                    "This content may contain unverified information. "
                    "Please cross-check with your course materials."
                )

            logger.info(
                f"Faithfulness check: score={result.score:.2f}, "
                f"supported={result.supported_count}, "
                f"unverifiable={result.unverifiable_count}"
            )

            return result

        except Exception as e:
            logger.error(f"Faithfulness check failed: {e}")
            # Return permissive result on error to avoid blocking content
            return FaithfulnessResult(
                score=1.0,
                total_claims=0,
                supported_count=0,
                contradicted_count=0,
                unverifiable_count=0,
                warning_message="Unable to verify content accuracy",
            )

    def _build_verification_prompt(
        self,
        generated_text: str,
        source_chunks: List[Dict[str, Any]],
        context: Optional[str] = None,
    ) -> str:
        """Build the prompt for faithfulness verification."""

        # Format source chunks
        sources_text = "\n\n".join([
            f"[Source: {chunk.get('id', f'chunk_{i}')}]: {chunk.get('text', '')}"
            for i, chunk in enumerate(source_chunks)
        ])

        context_prefix = f"Context: {context}\n\n" if context else ""

        prompt = f"""{context_prefix}You are a fact-checking assistant. Your task is to verify if the generated text is supported by the provided source material.

## Source Material
{sources_text}

## Generated Text to Verify
{generated_text}

## Instructions
1. Break down the generated text into individual factual claims
2. For each claim, determine if it is:
   - "supported": Directly stated or logically implied by the sources
   - "contradicted": Directly contradicted by the sources
   - "unverifiable": Not mentioned in sources (cannot confirm or deny)

3. Identify any inline citations in the format [Source: X] and list them

## Output Format
Respond with ONLY a JSON object in this exact format:
{{
  "claims": [
    {{"claim": "exact claim text", "status": "supported|contradicted|unverifiable", "source_id": "id of supporting source or null"}}
  ],
  "citations_found": ["source_id_1", "source_id_2"],
  "summary": "brief summary of verification"
}}

Rules:
- Be strict: if a claim adds information not in sources, mark as "unverifiable"
- If a claim contradicts sources, mark as "contradicted"
- Only mark "supported" if the claim is directly entailed by sources
- Return valid JSON only, no markdown code blocks"""

        return prompt

    def _parse_verification_response(self, response: Optional[str]) -> FaithfulnessResult:
        """Parse the LLM verification response."""

        # Handle None or empty response
        if not response:
            logger.warning("Empty response from faithfulness verification LLM")
            return FaithfulnessResult(
                score=1.0,
                total_claims=0,
                supported_count=0,
                contradicted_count=0,
                unverifiable_count=0,
            )

        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find raw JSON object
            json_match = re.search(r'(\{.*\})', response, re.DOTALL)
            json_str = json_match.group(1) if json_match else response

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse verification response as JSON: {e}")
            # Fallback: assume everything is supported
            return FaithfulnessResult(
                score=1.0,
                total_claims=0,
                supported_count=0,
                contradicted_count=0,
                unverifiable_count=0,
            )

        claims = data.get("claims", [])
        citations = data.get("citations_found", [])

        if not claims:
            return FaithfulnessResult(
                score=1.0,
                total_claims=0,
                supported_count=0,
                contradicted_count=0,
                unverifiable_count=0,
                citations=citations,
            )

        supported = sum(1 for c in claims if c.get("status") == "supported")
        contradicted = sum(1 for c in claims if c.get("status") == "contradicted")
        unverifiable = sum(1 for c in claims if c.get("status") == "unverifiable")

        # Calculate score: supported / total (contradicted counts as 0)
        total = len(claims)
        score = supported / total if total > 0 else 1.0

        # Collect unsupported claims for reporting
        unsupported_claims = [
            {
                "claim": c.get("claim", ""),
                "status": c.get("status", ""),
                "source_id": c.get("source_id") or "none",
            }
            for c in claims
            if c.get("status") in ["contradicted", "unverifiable"]
        ]

        return FaithfulnessResult(
            score=score,
            total_claims=total,
            supported_count=supported,
            contradicted_count=contradicted,
            unverifiable_count=unverifiable,
            unsupported_claims=unsupported_claims,
            citations=citations,
        )

    def format_sources_for_prompt(
        self,
        source_chunks: List[Dict[str, Any]],
        max_length: int = 4000,
    ) -> str:
        """
        Format source chunks for inclusion in a prompt with length limit.

        Args:
            source_chunks: List of source chunks
            max_length: Maximum total length of formatted sources

        Returns:
            Formatted sources string
        """
        formatted = []
        current_length = 0

        for i, chunk in enumerate(source_chunks):
            chunk_id = chunk.get('id', f'chunk_{i}')
            chunk_text = chunk.get('text', '')
            entry = f"[Source: {chunk_id}]: {chunk_text}\n\n"

            if current_length + len(entry) > max_length:
                # Truncate and add ellipsis
                remaining = max_length - current_length - 50
                if remaining > 100:
                    entry = entry[:remaining] + "...\n\n"
                else:
                    break

            formatted.append(entry)
            current_length += len(entry)

        return "".join(formatted)


# Global instance for easy import
faithfulness_checker = FaithfulnessChecker()