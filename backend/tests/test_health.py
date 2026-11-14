"""Tests de health check."""
from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    """GET /api/health debe responder 200 con status ok."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "app" in data
    assert "version" in data


def test_root(client: TestClient):
    """GET / debe responder info básica."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "docs" in data