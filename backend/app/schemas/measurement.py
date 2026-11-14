"""Esquemas de mediciones, status y series (GET /api/crew/{id}/status, /series)."""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class Level(str, Enum):
    NORMAL = "normal"
    WATCH = "watch"
    ACT = "act"
    EMERGENCY = "emergency"


class IndicatorValue(BaseModel):
    """Valor de un indicador en un día."""
    id: str
    value: Optional[float] = None
    baseline: Optional[float] = None
    level: Level
    z: Optional[float] = None
    why: list[str] = Field(default_factory=list)
    action: Optional[str] = None
    escalate: Optional[str] = None  # "crew" | "flight_surgeon"
    days_to_threshold: Optional[int] = None


class IndicatorBaseline(BaseModel):
    """Línea base (mediana y MAD) de un indicador."""
    median: float
    mad: float


class HazardStatus(BaseModel):
    """Estado de un peligro (convergencia)."""
    id: str  # iso, rad, grav, env, dist
    level: Level
    anomaly: Optional[float] = None
    why: list[str] = Field(default_factory=list)
    days_to_threshold: Optional[int] = None


class StatusResponse(BaseModel):
    """Respuesta de /api/crew/{id}/status?day=XXX"""
    crew_id: str
    day: int
    profile: str
    indicators: list[IndicatorValue]
    hazards: list[HazardStatus]


class SeriesResponse(BaseModel):
    """Respuesta de /api/crew/{id}/series?end_day=XXX&days=30"""
    crew_id: str
    baseline_end_day: int
    days: list[int]
    series: dict[str, list[Optional[float]]]  # indicator_id -> valores por día
    baseline: dict[str, IndicatorBaseline]