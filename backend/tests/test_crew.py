"""Tests de endpoints de tripulación."""
from fastapi.testclient import TestClient


def test_list_crew(client: TestClient):
    """GET /api/crew debe devolver lista de 4 tripulantes con mock data."""
    response = client.get("/api/crew?day=118")
    assert response.status_code == 200
    data = response.json()

    assert "crew" in data
    assert len(data["crew"]) == 4
    assert data["mission_day"] == 118
    assert data["profile"] == "mars_transit"

    # Verificar estructura de cada tripulante
    for member in data["crew"]:
        assert "id" in member
        assert "name" in member
        assert "role" in member
        assert "level" in member
        assert member["level"] in ["normal", "watch", "act", "emergency"]


def test_list_crew_day_zero(client: TestClient):
    """GET /api/crew?day=0 debe funcionar."""
    response = client.get("/api/crew?day=0")
    assert response.status_code == 200
    data = response.json()
    assert len(data["crew"]) == 4


def test_get_crew_status(client: TestClient):
    """GET /api/crew/{id}/status debe devolver indicadores y peligros."""
    response = client.get("/api/crew/c1/status?day=118")
    assert response.status_code == 200
    data = response.json()

    assert data["crew_id"] == "c1"
    assert data["day"] == 118
    assert "indicators" in data
    assert "hazards" in data
    assert isinstance(data["indicators"], list)
    assert isinstance(data["hazards"], list)


def test_get_crew_status_not_found(client: TestClient):
    """GET /api/crew/{id}/status con ID inexistente -> 404."""
    response = client.get("/api/crew/nonexistent/status?day=118")
    assert response.status_code == 404


def test_get_crew_series(client: TestClient):
    """GET /api/crew/{id}/series debe devolver serie + baseline."""
    response = client.get("/api/crew/c1/series?end_day=118&days=30")
    assert response.status_code == 200
    data = response.json()

    assert data["crew_id"] == "c1"
    assert data["baseline_end_day"] == 14
    assert "days" in data
    assert "series" in data
    assert "baseline" in data
    assert len(data["days"]) == 30


def test_get_crew_series_not_found(client: TestClient):
    """GET /api/crew/{id}/series con ID inexistente -> 404."""
    response = client.get("/api/crew/nonexistent/series?end_day=118&days=30")
    assert response.status_code == 404


def test_mid_mission_scenarios_are_visible(client: TestClient):
    """Los escenarios empiezan en su día, no solo en el día 118 del demo."""
    c2 = client.get("/api/crew/c2/status?day=100").json()
    assert {i["id"] for i in c2["indicators"]} >= {"exercise_min", "hr_rest"}
    assert {h["id"]: h["level"] for h in c2["hazards"]}["grav"] == "watch"

    c4 = client.get("/api/crew/c4/status?day=100").json()
    assert {i["id"] for i in c4["indicators"]} >= {"co2_mmhg", "sleep_h"}
    assert {h["id"]: h["level"] for h in c4["hazards"]}["env"] == "watch"


def test_series_covers_every_indicator_and_day(client: TestClient):
    """Cada indicador tiene un valor por día, aunque el escenario no lo toque."""
    data = client.get("/api/crew/c2/series?end_day=118&days=30").json()
    assert all(len(values) == len(data["days"]) for values in data["series"].values())