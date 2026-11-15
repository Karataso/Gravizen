#!/usr/bin/env python3
"""Descarga datos públicos de NASA usados como referencia en Vitalis.

- OSD-575: panel metabólico de Inspiration4 (glucosa real pre/post vuelo).
- Opcional: eventos SEP de DONKI (clima espacial) para el disparador de radiación.

Uso:
    python scripts/fetch_nasa_data.py
    python scripts/fetch_nasa_data.py --force
    python scripts/fetch_nasa_data.py --donki
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import sys
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "backend" / "app" / "data" / "nasa"
CMP_NAME = "OSD-575_CMP_TRANSFORMED.csv"
CMP_URL = (
    "https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download"
    "?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv"
)
EXPECTED_ROWS = 28
EXPECTED_COLUMN = "glucose_value_milligram_per_deciliter"


def _fetch(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Vitalis/0.1 (NASA Space Apps Challenge)"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def fetch_cmp(force: bool) -> None:
    target = DATA_DIR / CMP_NAME
    if target.exists() and not force:
        print(f"Ya existe {target.relative_to(ROOT)}; usa --force para actualizarlo.")
        return

    raw = _fetch(CMP_URL)
    text = raw.decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(text)))
    if len(rows) != EXPECTED_ROWS:
        raise SystemExit(f"Se esperaban {EXPECTED_ROWS} filas y llegaron {len(rows)}.")
    if EXPECTED_COLUMN not in rows[0]:
        raise SystemExit(f"Falta la columna {EXPECTED_COLUMN}.")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    target.write_bytes(raw)
    digest = hashlib.sha256(raw).hexdigest()
    print(f"Guardado {target.relative_to(ROOT)} ({len(rows)} muestras).")
    print(f"sha256: {digest}")


def fetch_donki(days: int) -> None:
    end = date.today()
    start = end - timedelta(days=days)
    url = (
        "https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP"
        f"?startDate={start.isoformat()}&endDate={end.isoformat()}"
    )
    data = json.loads(_fetch(url))
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    target = DATA_DIR / "donki_sep.json"
    target.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Guardados {len(data)} eventos SEP en {target.relative_to(ROOT)}.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Vuelve a descargar el CSV.")
    parser.add_argument("--donki", action="store_true", help="Descarga eventos SEP de los últimos 60 días.")
    args = parser.parse_args()

    try:
        fetch_cmp(args.force)
        if args.donki:
            fetch_donki(60)
    except Exception as error:  # red, NASA o formato inesperado
        print(f"Error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
