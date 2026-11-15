"""Datos reales de NASA OSDR usados como referencia y calibración.

Fuente: OSD-575 (SpaceX Inspiration4, panel metabólico completo).
Los datos son procesados y públicos; no son telemetría diaria de la tripulación.
"""
from __future__ import annotations

import csv
from functools import lru_cache
from pathlib import Path
from statistics import median

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "nasa"
CMP_PATH = DATA_DIR / "OSD-575_CMP_TRANSFORMED.csv"

STUDY = "OSD-575"
TITLE = "SpaceX Inspiration4 Blood Serum Metabolic Panel"
SOURCE_URL = "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575"
LICENSE = "NASA OSDR · datos procesados públicos"
NOTE = (
    "Datos reales de 4 tripulantes de Inspiration4 en 7 extracciones "
    "(L-92 a R+194). No son datos diarios ni telemetría continua: "
    "el dashboard diario es simulado y se calibra con estos rangos."
)


def _number(value: str | None) -> float | None:
    if value is None:
        return None
    text = value.strip()
    if not text or text.upper() in {"NA", "N/A", "NAN", "NULL", "-"}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _parse_timepoint(sample: str) -> tuple[str, str, int] | None:
    """Convierte 'C001_serum_L-92' en ('C001', 'L-92', -92)."""
    parts = sample.split("_serum_")
    if len(parts) != 2:
        return None
    crew_id, timepoint = parts
    if timepoint.startswith("L-"):
        day = -int(timepoint[2:])
    elif timepoint.startswith("R+"):
        day = int(timepoint[2:])
    else:
        return None
    return crew_id, timepoint, day


@lru_cache(maxsize=1)
def load_glucose_reference() -> dict:
    """Lee el CSV de OSD-575 y devuelve solo la glucosa, por tripulante y tiempo."""
    if not CMP_PATH.exists():
        raise FileNotFoundError(f"No está el CSV de referencia: {CMP_PATH}")

    points: list[dict] = []
    with CMP_PATH.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            parsed = _parse_timepoint(row.get("Sample Name", ""))
            if parsed is None:
                continue
            crew_id, timepoint, day = parsed
            points.append({
                "crew_id": crew_id,
                "timepoint": timepoint,
                "day": day,
                "value": _number(row.get("glucose_value_milligram_per_deciliter")),
                "range_min": _number(row.get("glucose_range_min_milligram_per_deciliter")),
                "range_max": _number(row.get("glucose_range_max_milligram_per_deciliter")),
            })

    points.sort(key=lambda point: (point["crew_id"], point["day"]))
    preflight = [point["value"] for point in points if point["day"] < 0 and point["value"] is not None]

    return {
        "study": STUDY,
        "title": TITLE,
        "source_url": SOURCE_URL,
        "license": LICENSE,
        "indicator": "glucose_mgdl",
        "unit": "mg/dL",
        "note": NOTE,
        "preflight_median": round(median(preflight), 1) if preflight else None,
        "points": points,
    }


def get_glucose_reference() -> dict:
    return load_glucose_reference()


def get_preflight_glucose_median() -> float | None:
    """Mediana pre-vuelo real de OSD-575, usada para calibrar el mock."""
    return load_glucose_reference()["preflight_median"]
