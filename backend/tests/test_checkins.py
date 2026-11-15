"""Tests de endpoints de check-in."""
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import CheckIn


def test_create_checkin(client: TestClient):
    """POST /api/crew/{id}/checkins crea check-in y devuelve status."""
    payload = {
        "day": 118,
        "sleep_h": 5.1,
        "mood": 2,
        "stress": 4,
        "headache": True,
        "note": "dolor de cabeza desde ayer",
    }
    response = client.post("/api/crew/c1/checkins", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert "status" in data
    assert "checkin_id" in data
    assert "created" in data
    assert data["created"] is True


def test_update_checkin_idempotent(client: TestClient):
    """Reenviar mismo check-in (mismo crew_id, day) actualiza, no duplica."""
    payload = {
        "day": 118,
        "sleep_h": 6.0,
        "mood": 3,
        "stress": 3,
    }

    # Primera vez: crea
    response1 = client.post("/api/crew/c1/checkins", json=payload)
    assert response1.status_code == 201
    assert response1.json()["created"] is True
    checkin_id_1 = response1.json()["checkin_id"]

    # Segunda vez: actualiza
    response2 = client.post("/api/crew/c1/checkins", json=payload)
    assert response2.status_code == 200  # o 201, pero created=False
    assert response2.json()["created"] is False
    checkin_id_2 = response2.json()["checkin_id"]

    # Debe ser el mismo ID
    assert checkin_id_1 == checkin_id_2


def test_create_checkin_invalid_crew(client: TestClient):
    """POST con crew_id inexistente -> 404."""
    payload = {"day": 118, "sleep_h": 7.0}
    response = client.post("/api/crew/nonexistent/checkins", json=payload)
    assert response.status_code == 404


def test_create_checkin_validation(client: TestClient):
    """Validación de rangos en payload."""
    # mood fuera de rango 1-5
    payload = {"day": 118, "mood": 10}
    response = client.post("/api/crew/c1/checkins", json=payload)
    assert response.status_code == 422

    # bp_dia >= bp_sys
    payload = {"day": 118, "bp_sys": 120, "bp_dia": 130}
    response = client.post("/api/crew/c1/checkins", json=payload)
    assert response.status_code == 422


def test_checkin_can_clear_note(client: TestClient, db_session):
    """Una nota vacía borra la anterior; no se queda pegada."""
    client.post("/api/crew/c1/checkins", json={"day": 118, "note": "dolor de cabeza"})
    client.post("/api/crew/c1/checkins", json={"day": 118, "note": ""})

    db_session.expire_all()
    row = db_session.execute(
        select(CheckIn).where(CheckIn.astronaut_id == "c1", CheckIn.day == 118)
    ).scalar_one()
    assert row.note == ""


def test_create_checkin_full_payload(client: TestClient):
    """Check-in con todos los campos opcionales."""
    payload = {
        "day": 118,
        "sleep_h": 7.0,
        "mood": 4,
        "stress": 2,
        "bp_sys": 120,
        "bp_dia": 80,
        "temp_c": 36.6,
        "glucose_mgdl": 95,
        "exercise_min": 90,
        "headache": False,
        "vision_change": False,
        "dizziness": False,
        "nausea": False,
        "back_pain": False,
        "fever": False,
        "self_harm": False,
        "note": "todo bien",
        "client_id": "abc123",
    }
    response = client.post("/api/crew/c1/checkins", json=payload)
    assert response.status_code == 201
    assert response.json()["created"] is True