"""El status debe reflejar el check-in guardado (flujo check-in -> API -> color)."""
from fastapi.testclient import TestClient


def test_checkin_changes_status(client: TestClient):
    """Un check-in bueno baja los indicadores respecto al mock del día."""
    payload = {"day": 118, "sleep_h": 9.5, "mood": 5, "stress": 1}
    status = client.post("/api/crew/c1/checkins", json=payload).json()["status"]

    by_id = {i["id"]: i for i in status["indicators"]}
    assert by_id["sleep_h"]["value"] == 9.5
    assert by_id["sleep_h"]["level"] == "normal"
    assert by_id["mood"]["value"] == 5
    assert by_id["stress"]["level"] == "normal"


def test_self_harm_is_emergency(client: TestClient):
    """Pensamientos de hacerse daño -> emergencia y peligro iso en rojo."""
    status = client.post("/api/crew/c1/checkins", json={"day": 118, "self_harm": True}).json()["status"]

    by_id = {i["id"]: i for i in status["indicators"]}
    assert by_id["self_harm"]["level"] == "emergency"
    hazards = {h["id"]: h for h in status["hazards"]}
    assert hazards["iso"]["level"] == "emergency"


def test_checkin_rejects_unknown_fields(client: TestClient):
    """Un nombre fuera del contrato falla con 422, no se ignora en silencio."""
    response = client.post("/api/crew/c1/checkins", json={"day": 118, "sleep_hours": 5})
    assert response.status_code == 422


def test_profile_change_sets_report_delay(client: TestClient):
    """Perfil estación -> reporte nuevo con eta 0."""
    try:
        assert client.patch("/api/crew/c1", json={"profile": "station"}).status_code == 200

        report = client.post(
            "/api/crew/c1/reports",
            json={"day": 118, "level": "act", "message": "prueba"},
        ).json()
        assert report["eta_minutes"] == 0
        assert report["created_at"].endswith(("Z", "+00:00"))
    finally:
        # La sesión de tests comparte la fila del tripulante entre tests.
        client.patch("/api/crew/c1", json={"profile": "mars_transit"})
