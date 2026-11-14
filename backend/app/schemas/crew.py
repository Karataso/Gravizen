"""Esquemas de tripulación (GET /api/crew, /api/crew/{id})."""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class CrewRole(str, Enum):
    COMMANDER = "comandante"
    PILOT = "piloto"
    SCIENTIST = "cientifico"
    ENGINEER = "ingeniero"
    MEDICAL = "medico"
    SPECIALIST = "especialista"


class Level(str, Enum):
    NORMAL = "normal"
    WATCH = "watch"
    ACT = "act"
    EMERGENCY = "emergency"


class AstronautPublic(BaseModel):
    """Tripulante para lista (sin datos clínicos detallados)."""
    id: str
    name: str
    role: CrewRole
    level: Level
    mission_day: int

    class Config:
        from_attributes = True


class AstronautDetail(AstronautPublic):
    """Tripulante con perfil de misión."""
    profile: str

    class Config:
        from_attributes = True


class CrewListResponse(BaseModel):
    crew: list[AstronautPublic]
    mission_day: int
    profile: str