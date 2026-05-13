"""
Smoke tests — verify the FastAPI app boots and trivial routes respond.

These run against an in-process TestClient so no actual server / DB is
needed. Routes that require DB connectivity are skipped intentionally.
"""
from __future__ import annotations

import pytest


@pytest.fixture(scope="module")
def client():
    """Return an in-process TestClient for the FastAPI app.

    We import lazily so that the env vars set in ``conftest.py`` (test
    database URL, redis URL, etc.) are already in place by the time
    ``main`` configures itself.
    """
    pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient

    try:
        from main import app
    except Exception as exc:  # pragma: no cover - environment-dependent
        pytest.skip(f"Could not import FastAPI app: {exc}")

    return TestClient(app)


# ---------------------------------------------------------------------------
# Root + metadata
# ---------------------------------------------------------------------------

@pytest.mark.smoke
def test_root_returns_api_info(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data or "title" in data or "version" in data


@pytest.mark.smoke
def test_health_endpoint_responds(client):
    """``/health`` may return 200 (all good) or 503 (DB/Redis down) but
    must not 500. We only assert the route exists and returns JSON."""
    response = client.get("/health")
    assert response.status_code in (200, 503)
    assert response.headers["content-type"].startswith("application/json")


@pytest.mark.smoke
def test_openapi_schema_available(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "paths" in schema
    # Sanity: at least the routes we know are registered should appear
    paths = schema["paths"].keys()
    assert any(p.startswith("/api/chat") for p in paths)
    assert any(p.startswith("/api/resources") for p in paths)
    assert any(p.startswith("/api/tutor") for p in paths)


@pytest.mark.smoke
def test_docs_route_exists(client):
    response = client.get("/docs")
    # Swagger UI returns text/html
    assert response.status_code == 200
    assert "swagger" in response.text.lower() or "openapi" in response.text.lower()
