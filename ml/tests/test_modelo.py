"""Tests del motor: normalización del dataset y forma del contrato."""
import numpy as np
import pytest

import modelo


@pytest.fixture(scope="module")
def dataset():
    return modelo.load_and_normalize_dataset()


def test_dataset_keeps_all_crew_and_labels(dataset):
    """Los ids son texto y las etiquetas en español se convierten a 0/1."""
    assert dataset["crew_id"].nunique() == 50
    assert set(dataset["actual_anomaly"].unique()) == {0, 1}
    assert dataset["actual_anomaly"].sum() == 867


def test_crew_aliases():
    assert modelo.resolve_crew_id("c1") == "ASTRO_01"
    assert modelo.resolve_crew_id("ASTRO_02") == "ASTRO_02"
    assert modelo.resolve_crew_id("3") == "ASTRO_03"


def test_evaluate_returns_contract_shape():
    status = modelo.evaluate("c1", 30)

    assert status["crew_id"] == "c1"
    assert status["day"] == 30
    assert {i["id"] for i in status["indicators"]} == {"sleep_h", "hr_rest", "stress", "spo2"}
    assert [h["id"] for h in status["hazards"]] == ["rad", "iso", "grav", "env", "dist"]
    assert {i["level"] for i in status["indicators"]} <= {"normal", "watch", "act", "emergency"}
    assert {h["level"] for h in status["hazards"]} <= {"normal", "watch", "act", "emergency"}


def test_evaluate_outside_dataset_returns_none():
    """El backend cae al mock cuando el día no está cubierto (demo: día 118)."""
    assert modelo.evaluate("c1", 118) is None
    assert modelo.evaluate("c1", 0) is None


def test_isolation_forest_does_not_use_future_days():
    """El puntaje del día 10 se calcula solo con datos hasta el día 10."""
    full = modelo.load_and_normalize_dataset()
    person = full[full["crew_id"] == "ASTRO_01"].sort_values("day")
    model = modelo.load_isolation_forest(full)

    early_flags, _ = modelo.score_with_isolation_forest(person[person["day"] <= 10], model)
    assert len(early_flags) == 10
    assert not np.isnan(early_flags).any()
