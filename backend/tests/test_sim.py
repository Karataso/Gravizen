"""Tests de endpoints de simulación."""
from fastapi.testclient import TestClient


def test_inject_solar_storm(client: TestClient):
    """POST /api/sim/storm inyecta tormenta."""
    payload = {
        "day": 96,
        "intensity": 2.0,
        "duration_days": 3,
    }
    response = client.post("/api/sim/storm", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["storm_day"] == 96
    assert data["intensity"] == 2.0
    assert data["duration_days"] == 3


def test_inject_solar_storm_defaults(client: TestClient):
    """Valores por defecto en tormenta."""
    payload = {"day": 50}
    response = client.post("/api/sim/storm", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["intensity"] == 1.0
    assert data["duration_days"] == 2


def test_inject_solar_storm_validation(client: TestClient):
    """Validación de parámetros."""
    # day negativo
    response = client.post("/api/sim/storm", json={"day": -1})
    assert response.status_code == 422

    # intensity fuera de rango
    response = client.post("/api/sim/storm", json={"day": 10, "intensity": 10})
    assert response.status_code == 422

    response = client.post("/api/sim/storm", json={"day": 10, "intensity": 0})
    assert response.status_code == 422