"""Esquemas de datos reales de NASA (referencia y calibración)."""
from typing import Optional

from pydantic import BaseModel


class GlucosePoint(BaseModel):
    crew_id: str
    timepoint: str
    day: int
    value: Optional[float] = None
    range_min: Optional[float] = None
    range_max: Optional[float] = None


class GlucoseReferenceResponse(BaseModel):
    study: str
    title: str
    source_url: str
    license: str
    indicator: str
    unit: str
    note: str
    preflight_median: Optional[float] = None
    points: list[GlucosePoint]
