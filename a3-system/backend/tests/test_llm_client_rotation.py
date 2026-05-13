"""Unit tests for OpenRouter API key rotation behavior.

We replace ``httpx.AsyncClient`` inside ``core.llm_client`` with a fake that
records every (key, attempt) pair and returns a programmable status code.
This locks in the contract for the multi-key fallback feature without making
any real network calls.
"""

from __future__ import annotations

import json
from typing import Any, Iterable, List

import httpx
import pytest

from core import llm_client as llm_module
from core.llm_client import OpenRouterClient


class _FakeResponse:
    def __init__(self, status_code: int, body: Any | None = None, headers: dict | None = None):
        self.status_code = status_code
        self._body = body if body is not None else {"ok": True}
        self.headers = headers or {}

    def json(self) -> Any:
        return self._body

    def raise_for_status(self) -> None:
        if 400 <= self.status_code < 600:
            raise httpx.HTTPStatusError(
                f"status={self.status_code}",
                request=httpx.Request("POST", "https://example.invalid"),
                response=httpx.Response(self.status_code),
            )


class _FakeAsyncClient:
    """Drop-in ``httpx.AsyncClient`` replacement with scripted responses."""

    # Class-level state so the context manager keeps producing the same script
    script: List[_FakeResponse] = []
    calls: List[dict] = []

    def __init__(self, *_, **__):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url: str, headers: dict, json: dict, **_):  # noqa: A002
        _FakeAsyncClient.calls.append({"url": url, "auth": headers.get("Authorization", "")})
        if not _FakeAsyncClient.script:
            return _FakeResponse(200)
        return _FakeAsyncClient.script.pop(0)


@pytest.fixture(autouse=True)
def _patch_httpx(monkeypatch):
    _FakeAsyncClient.script = []
    _FakeAsyncClient.calls = []
    monkeypatch.setattr(llm_module.httpx, "AsyncClient", _FakeAsyncClient)
    # Disable real sleeps between retries to keep tests fast
    monkeypatch.setattr(llm_module.asyncio, "sleep", _noop_sleep)
    # Strip env-loaded API keys so test inputs are exact
    monkeypatch.setattr(llm_module.settings.llm, "api_key", None, raising=False)
    monkeypatch.setattr(llm_module.settings.llm, "api_key_fallback", None, raising=False)
    yield


async def _noop_sleep(_seconds):
    return None


def _client_with(*keys: str) -> OpenRouterClient:
    primary = keys[0] if keys else None
    fallbacks = list(keys[1:]) if len(keys) > 1 else []
    return OpenRouterClient(api_key=primary, fallback_keys=fallbacks)


def _bearer(headers_auth: str) -> str:
    return headers_auth.replace("Bearer ", "").strip()


@pytest.mark.asyncio
async def test_success_on_primary_key_uses_only_one_call():
    _FakeAsyncClient.script = [_FakeResponse(200, {"choices": []})]
    client = _client_with("PRIMARY")
    result = await client.generate(messages=[{"role": "user", "content": "hi"}])
    assert result == {"choices": []}
    assert len(_FakeAsyncClient.calls) == 1
    assert _bearer(_FakeAsyncClient.calls[0]["auth"]) == "PRIMARY"


@pytest.mark.asyncio
async def test_rotates_on_401_to_fallback_key():
    _FakeAsyncClient.script = [
        _FakeResponse(401),
        _FakeResponse(200, {"choices": [{"message": {"content": "ok"}}]}),
    ]
    client = _client_with("BAD_KEY", "GOOD_KEY")
    result = await client.generate(messages=[{"role": "user", "content": "hi"}])
    assert result["choices"][0]["message"]["content"] == "ok"
    auths = [_bearer(c["auth"]) for c in _FakeAsyncClient.calls]
    assert auths == ["BAD_KEY", "GOOD_KEY"]


@pytest.mark.asyncio
async def test_rotates_on_403_to_fallback_key():
    _FakeAsyncClient.script = [_FakeResponse(403), _FakeResponse(200)]
    client = _client_with("BAD", "GOOD")
    await client.generate(messages=[{"role": "user", "content": "hi"}])
    auths = [_bearer(c["auth"]) for c in _FakeAsyncClient.calls]
    assert auths == ["BAD", "GOOD"]


@pytest.mark.asyncio
async def test_persistent_429_on_primary_rotates_to_fallback():
    # 3 attempts of 429 on primary → rotate to fallback → success
    _FakeAsyncClient.script = [
        _FakeResponse(429),
        _FakeResponse(429),
        _FakeResponse(429),
        _FakeResponse(200),
    ]
    client = _client_with("PRIMARY", "FALLBACK")
    await client.generate(messages=[{"role": "user", "content": "hi"}])
    auths = [_bearer(c["auth"]) for c in _FakeAsyncClient.calls]
    assert auths.count("PRIMARY") == 3
    assert auths[-1] == "FALLBACK"


@pytest.mark.asyncio
async def test_no_keys_configured_raises_runtime_error():
    client = OpenRouterClient(api_key=None, fallback_keys=[])
    # Force-clear in case settings provided one
    client.api_keys = []
    client.api_key = None
    with pytest.raises((RuntimeError, Exception)):
        await client.generate(messages=[{"role": "user", "content": "hi"}])


@pytest.mark.asyncio
async def test_all_keys_401_raises():
    _FakeAsyncClient.script = [_FakeResponse(401), _FakeResponse(401)]
    client = _client_with("K1", "K2")
    with pytest.raises(Exception):
        await client.generate(messages=[{"role": "user", "content": "hi"}])
    auths = [_bearer(c["auth"]) for c in _FakeAsyncClient.calls]
    assert auths == ["K1", "K2"]


def test_constructor_dedupes_and_strips_empty_keys():
    client = OpenRouterClient(api_key="A", fallback_keys=["", "A", "B", None])
    assert client.api_keys == ["A", "B"]


def test_headers_include_referer_and_title():
    client = _client_with("XYZ")
    h = client.headers
    assert h["Authorization"] == "Bearer XYZ"
    assert "X-Title" in h
    assert "HTTP-Referer" in h
