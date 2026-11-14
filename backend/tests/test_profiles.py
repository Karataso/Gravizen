"""Tests de endpoints de perfiles."""
from fastapi.testclient import TestClient


def test_list_profiles(client: TestClient):
    """GET /api/profiles devuelve 3 perfiles."""
    response = client.get("/api/profiles")
    assert response.status_code == 200
    data = response.json()

    assert "profiles" in data
    assert "current" in data
    assert len(data["profiles"]) == 3
    assert data["current"] == "mars_transit"

    # Verificar cada perfil
    profile_ids = {p["id"] for p in data["profiles"]}
    assert profile_ids == {"station", "moon", "mars_transit"}

    for p in data["profiles"]:
        assert "name" in p
        assert "description" in p
        assert "radiation_base_msv" in p
        assert "comms_delay_minutes" in p
        assert "co2_base_mmhg" in p


def test_get_profile(client: TestClient):
    """GET /api/profiles/{id} devuelve detalle."""
    response = client.get("/api/profiles/mars_transit")
    assert response.status_code == 200
    data = response.json()

    assert data["id"] == "mars_transit"
    assert data["comms_delay_minutes"] == 20
    assert data["radiation_base_msv"] == 1.8


def test_get_profile_not_found(client: TestClient):
    """GET /api/profiles/{id} inexistente -> 404."""
    response = client.get("/api/profiles/unknown")
    assert response.status_code == 404