"""Esquemas de perfiles de misión (GET /api/profiles)."""
from pydantic import BaseModel
from typing import Optional


class ProfileResponse(BaseModel):
    """Perfil de misión disponible."""
    id: str
    name: str
    description: str
    radiation_base_msv: float
    comms_delay_minutes: int
    co2_base_mmhg: float


class ProfileListResponse(BaseModel):
    profiles: list[ProfileResponse]
    current: str