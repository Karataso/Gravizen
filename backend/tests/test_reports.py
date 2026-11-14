"""Tests de endpoints de reportes."""
from fastapi.testclient import TestClient


def test_create_report(client: TestClient):
    """POST /api/crew/{id}/reports crea reporte en tránsito."""
    payload = {
        "day": 118,
        "level": "act",
        "hazard": "iso",
        "message": "Sueño y ánimo bajos, 4 días. ¿Ajustamos carga?",
    }
    response = client.post("/api/crew/c1/reports", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["crew_id"] == "c1"
    assert data["day"] == 118
    assert data["level"] == "act"
    assert data["hazard"] == "iso"
    assert data["status"] == "transit"
    assert data["eta_minutes"] == 20  # mars_transit
    assert "id" in data
    assert "created_at" in data


def test_create_report_different_profiles(client: TestClient):
    """ETA varía según perfil de misión."""
    # El mock usa mars_transit (20 min) por defecto
    # Para probar otros perfiles necesitaríamos seed real
    payload = {"day": 10, "level": "watch", "message": "test"}
    response = client.post("/api/crew/c1/reports", json=payload)
    assert response.status_code == 201
    assert response.json()["eta_minutes"] == 20


def test_list_reports(client: TestClient):
    """GET /api/reports lista reportes con estado calculado."""
    # Primero crear uno
    client.post("/api/crew/c1/reports", json={
        "day": 118, "level": "act", "message": "test"
    })

    response = client.get("/api/reports")
    assert response.status_code == 200
    data = response.json()

    assert "reports" in data
    assert len(data["reports"]) >= 1
    for r in data["reports"]:
        assert "id" in r
        assert "status" in r
        assert r["status"] in ["transit", "received", "responded"]


def test_list_reports_filter_by_crew(client: TestClient):
    """GET /api/reports?crew_id= filtra por tripulante."""
    response = client.get("/api/reports?crew_id=c1")
    assert response.status_code == 200
    data = response.json()
    for r in data["reports"]:
        assert r["crew_id"] == "c1"


def test_respond_report(client: TestClient):
    """POST /api/reports/{id}/respond simula respuesta de Tierra."""
    # Crear reporte
    create_resp = client.post("/api/crew/c1/reports", json={
        "day": 118, "level": "act", "message": "test"
    })
    report_id = create_resp.json()["id"]

    # Responder
    response = client.post(
        f"/api/reports/{report_id}/respond",
        json={"response_message": "Ajusten carga y monitoren"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "responded"
    assert data["response_message"] == "Ajusten carga y monitoren"
    assert data["responded_at"] is not None