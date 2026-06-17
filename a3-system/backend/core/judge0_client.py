"""
Judge0 API Client for code execution sandbox.

Supports running code in isolated containers with test case validation.
Free tier: 50 submissions per day.
"""

import asyncio
from typing import Any, Dict, List, Optional

import httpx

from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)

# Judge0 CE API Configuration
JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com"

# Language ID mapping for Judge0
LANGUAGE_IDS = {
    "python": 71,      # Python 3.8
    "python3": 71,
    "javascript": 63,  # Node.js 12.14.0
    "js": 63,
    "typescript": 74,  # TypeScript 3.7.4
    "ts": 74,
    "bash": 46,        # Bash 4.4
    "shell": 46,
    "sql": 82,         # SQLite 3.27.2
    "java": 62,        # Java 13.0.1
    "cpp": 54,         # C++ GCC 9.2.0
    "c": 50,           # C GCC 9.2.0
    "go": 60,          # Go 1.13.5
    "rust": 73,        # Rust 1.40.0
}

# Default timeout for code execution (seconds)
DEFAULT_TIMEOUT = 5
MAX_TIMEOUT = 10


class Judge0Client:
    """Client for Judge0 code execution API."""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize Judge0 client."""
        self.api_key = api_key or settings.judge0_api_key
        self.api_host = "judge0-ce.p.rapidapi.com"
        self.base_url = JUDGE0_API_URL
        self.daily_limit = settings.judge0_daily_limit

        if not self.api_key:
            logger.warning("Judge0 API key not configured. Code execution will not work.")

    def _get_headers(self) -> Dict[str, str]:
        """Get API request headers."""
        return {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": self.api_host,
            "Content-Type": "application/json",
        }

    async def submit_code(
        self,
        source_code: str,
        language: str,
        stdin: str = "",
        timeout: int = DEFAULT_TIMEOUT,
    ) -> Dict[str, Any]:
        """
        Submit code for execution.

        Args:
            source_code: The code to execute
            language: Programming language (python, javascript, bash, sql, etc.)
            stdin: Input to provide to the program
            timeout: Maximum execution time in seconds

        Returns:
            Dict with submission token and status
        """
        if not self.api_key:
            raise ValueError("Judge0 API key not configured")

        language_id = LANGUAGE_IDS.get(language.lower())
        if not language_id:
            raise ValueError(f"Unsupported language: {language}. Supported: {list(LANGUAGE_IDS.keys())}")

        # Clamp timeout
        timeout = min(max(timeout, 1), MAX_TIMEOUT)

        payload = {
            "source_code": source_code,
            "language_id": language_id,
            "stdin": stdin,
            "cpu_time_limit": timeout,
            "memory_limit": 128000,  # 128 MB in KB
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/submissions",
                    headers=self._get_headers(),
                    json=payload,
                    params={"base64_encoded": "false", "fields": "*"},
                    timeout=30,
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"Judge0 submission failed: {e}")
                raise

    async def get_result(self, token: str) -> Dict[str, Any]:
        """
        Get execution result for a submission.

        Args:
            token: Submission token from submit_code

        Returns:
            Dict with execution results
        """
        if not self.api_key:
            raise ValueError("Judge0 API key not configured")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/submissions/{token}",
                    headers=self._get_headers(),
                    params={"base64_encoded": "false", "fields": "*"},
                    timeout=30,
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"Judge0 result fetch failed: {e}")
                raise

    async def execute_with_poll(
        self,
        source_code: str,
        language: str,
        stdin: str = "",
        timeout: int = DEFAULT_TIMEOUT,
        max_polls: int = 20,
        poll_interval: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Submit code and poll for results.

        Args:
            source_code: The code to execute
            language: Programming language
            stdin: Input to provide
            timeout: Maximum execution time
            max_polls: Maximum number of poll attempts
            poll_interval: Seconds between polls

        Returns:
            Dict with final execution results
        """
        # Submit code
        submission = await self.submit_code(source_code, language, stdin, timeout)
        token = submission.get("token")

        if not token:
            raise ValueError("No token received from Judge0")

        # Poll for results
        for attempt in range(max_polls):
            result = await self.get_result(token)
            status_id = result.get("status", {}).get("id")

            # Status IDs:
            # 1: In Queue, 2: Processing
            # 3: Accepted, 4: Wrong Answer
            # 5: Time Limit Exceeded, 6: Compilation Error
            # 7: Runtime Error, 8: Internal Error
            # 9: Exec Format Error, 10: Not Supported
            # 11: Resource Limit Exceeded

            if status_id not in [1, 2]:
                # Execution complete
                return result

            await asyncio.sleep(poll_interval)

        # Timeout waiting for result
        return {
            "token": token,
            "status": {"id": 8, "description": "Internal Error - Polling Timeout"},
            "stderr": "Execution result polling timed out",
        }

    def _normalize_output(self, output: Optional[str]) -> str:
        """Normalize output string for comparison."""
        if output is None:
            return ""
        # Strip whitespace and normalize newlines
        return output.strip().replace("\r\n", "\n").replace("\r", "\n")

    async def execute_with_tests(
        self,
        source_code: str,
        language: str,
        test_cases: List[Dict[str, Any]],
        timeout: int = DEFAULT_TIMEOUT,
    ) -> Dict[str, Any]:
        """
        Execute code against multiple test cases.

        Args:
            source_code: The code to execute
            language: Programming language
            test_cases: List of test case dicts with:
                - id: test case identifier
                - input: stdin input
                - expected_output: expected stdout
                - is_visible: whether student can see this test
                - description: test description
            timeout: Maximum execution time per test

        Returns:
            Dict with:
                - passed: number of tests passed
                - failed: number of tests failed
                - results: detailed results per test case
                - execution_time_ms: average execution time
                - memory_kb: average memory usage
        """
        if not self.api_key:
            return {
                "passed": 0,
                "failed": len(test_cases),
                "results": [
                    {
                        "test_id": tc.get("id", f"tc{i}"),
                        "passed": False,
                        "error": "Judge0 API not configured",
                    }
                    for i, tc in enumerate(test_cases)
                ],
                "error": "Judge0 API key not configured",
            }

        # Each test case is an independent Judge0 submission+poll (each up to a
        # few seconds). Run them concurrently instead of sequentially so total
        # grading latency is ~one test rather than the sum of all tests.
        async def _run_one(index: int, test_case: Dict[str, Any]) -> Dict[str, Any]:
            test_id = test_case.get("id", f"tc{index}")
            test_input = test_case.get("input", "")
            expected_output = self._normalize_output(test_case.get("expected_output", ""))
            is_visible = test_case.get("is_visible", True)

            try:
                result = await self.execute_with_poll(
                    source_code=source_code,
                    language=language,
                    stdin=test_input,
                    timeout=timeout,
                )

                status_id = result.get("status", {}).get("id")
                actual_output = self._normalize_output(result.get("stdout", ""))
                stderr = result.get("stderr", "")
                compile_output = result.get("compile_output", "")
                time_taken = result.get("time", "0") or "0"
                memory_used = result.get("memory", 0) or 0

                test_passed = status_id == 3 and actual_output == expected_output

                return {
                    "test_id": test_id,
                    "passed": test_passed,
                    "input": test_case.get("input", "") if is_visible else "[hidden]",
                    "expected_output": expected_output if is_visible else "[hidden]",
                    "actual_output": actual_output if is_visible else "[hidden]",
                    "is_visible": is_visible,
                    "status_id": status_id,
                    "status_description": result.get("status", {}).get("description", "Unknown"),
                    "error": stderr if stderr else compile_output if compile_output else None,
                    "execution_time_ms": float(time_taken) * 1000,
                    "memory_kb": memory_used,
                    "description": test_case.get("description", ""),
                }
            except Exception as e:
                logger.error(f"Test case {test_id} execution failed: {e}")
                return {
                    "test_id": test_id,
                    "passed": False,
                    "error": str(e),
                    "is_visible": is_visible,
                    "description": test_case.get("description", ""),
                }

        results = list(await asyncio.gather(
            *(_run_one(i, tc) for i, tc in enumerate(test_cases))
        ))

        passed = sum(1 for r in results if r.get("passed"))
        failed = len(results) - passed
        total_time = sum(r.get("execution_time_ms", 0) or 0 for r in results)
        total_memory = sum(r.get("memory_kb", 0) or 0 for r in results)

        num_tests = len(test_cases) if test_cases else 1
        return {
            "passed": passed,
            "failed": failed,
            "total": len(test_cases),
            "results": results,
            "execution_time_ms": round(total_time / num_tests, 2) if num_tests > 0 else 0,
            "memory_kb": round(total_memory / num_tests, 2) if num_tests > 0 else 0,
        }

    async def check_status(self) -> Dict[str, Any]:
        """Check Judge0 API status and limits."""
        if not self.api_key:
            return {"status": "not_configured", "message": "API key not set"}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/status",
                    headers=self._get_headers(),
                    timeout=10,
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Judge0 status check failed: {e}")
            return {"status": "error", "message": str(e)}


# Singleton instance
_judge0_client: Optional[Judge0Client] = None


def get_judge0_client() -> Judge0Client:
    """Get or create Judge0 client singleton."""
    global _judge0_client
    if _judge0_client is None:
        _judge0_client = Judge0Client()
    return _judge0_client
