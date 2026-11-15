"""Integración con el motor real. Se salta si `pip install -e ml` no está hecho."""
import pytest

pytest.importorskip("ml")


def test_ml_engine_serves_dataset_days(client):
    """Dentro del rango del dataset, /status sale del motor (incluye SpO2)."""
    status = client.get("/api/crew/c1/status?day=10").json()
    ids = {ind["id"] for ind in status["indicators"]}
    assert "spo2" in ids
    assert len(status["hazards"]) == 5


def test_ml_engine_falls_back_outside_dataset(client):
    """Fuera del rango del dataset (demo, día 118) usa el puente mock."""
    status = client.get("/api/crew/c1/status?day=118").json()
    ids = {ind["id"] for ind in status["indicators"]}
    assert "spo2" not in ids
    assert "sleep_h" in ids
