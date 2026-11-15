"""Datos reales de referencia (NASA OSDR)."""
from fastapi.testclient import TestClient


def test_inspiration4_glucose_shape(client: TestClient):
    """OSD-575: 4 tripulantes x 7 extracciones, glucosa en mg/dL."""
    response = client.get("/api/reference/inspiration4/glucose")
    assert response.status_code == 200

    data = response.json()
    assert data["study"] == "OSD-575"
    assert data["indicator"] == "glucose_mgdl"
    assert data["unit"] == "mg/dL"
    assert len(data["points"]) == 28

    crew = {point["crew_id"] for point in data["points"]}
    days = {point["day"] for point in data["points"]}
    assert crew == {"C001", "C002", "C003", "C004"}
    assert days == {-92, -44, -3, 1, 45, 82, 194}
    assert data["preflight_median"] is not None


def test_inspiration4_glucose_values_are_real(client: TestClient):
    """Un valor del CSV original (C001 en L-3) llega sin transformar."""
    points = client.get("/api/reference/inspiration4/glucose").json()["points"]
    c001_l3 = next(
        point for point in points
        if point["crew_id"] == "C001" and point["timepoint"] == "L-3"
    )
    assert c001_l3["value"] == 69.0
    assert c001_l3["range_min"] == 65.0
    assert c001_l3["range_max"] == 99.0


def test_mock_glucose_uses_the_real_preflight_median(client: TestClient):
    """La glucosa diaria simulada parte de la mediana real de OSD-575."""
    from app.services.nasa_data import get_preflight_glucose_median

    real_median = get_preflight_glucose_median()
    series = client.get("/api/crew/c1/series?end_day=118&days=30").json()
    assert series["baseline"]["glucose_mgdl"]["median"] == real_median

    status = client.get("/api/crew/c1/status?day=118").json()
    glucose = next(i for i in status["indicators"] if i["id"] == "glucose_mgdl")
    assert glucose["baseline"] == real_median
