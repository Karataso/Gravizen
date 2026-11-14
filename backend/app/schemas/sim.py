"""Esquemas de simulación (POST /api/sim/storm)."""
from pydantic import BaseModel, Field
from typing import Optional


class StormRequest(BaseModel):
    """Inyectar tormenta solar."""
    day: int = Field(ge=0, description="Día de misión para inyectar la tormenta")
    intensity: Optional[float] = Field(default=1.0, ge=0.1, le=5.0, description="Multiplicador de intensidad")
    duration_days: Optional[int] = Field(default=2, ge=1, le=7, description="Duración en días")


class StormResponse(BaseModel):
    """Confirmación de tormenta inyectada."""
    success: bool
    message: str
    storm_day: int
    intensity: float
    duration_days: int