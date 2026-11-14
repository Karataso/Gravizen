"""Esquemas de reportes (POST/GET /api/reports)."""
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, Literal
from datetime import datetime, timezone
from enum import Enum


class ReportLevel(str, Enum):
    NORMAL = "normal"
    WATCH = "watch"
    ACT = "act"
    EMERGENCY = "emergency"


class ReportStatus(str, Enum):
    TRANSIT = "transit"
    RECEIVED = "received"
    RESPONDED = "responded"


class ReportCreate(BaseModel):
    """Payload para crear reporte."""

    model_config = ConfigDict(extra="forbid")

    day: int = Field(ge=0)
    level: ReportLevel
    hazard: Optional[str] = Field(default=None, max_length=50)
    message: str = Field(min_length=1, max_length=1000)


class ReportResponse(BaseModel):
    """Reporte individual."""
    id: str
    crew_id: str = Field(validation_alias="astronaut_id")
    day: int
    level: ReportLevel
    hazard: Optional[str] = None
    message: str
    status: ReportStatus
    eta_minutes: int
    created_at: datetime
    received_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    response_message: Optional[str] = None

    @field_validator("created_at", "received_at", "responded_at", mode="after")
    @classmethod
    def _as_utc(cls, value: Optional[datetime]) -> Optional[datetime]:
        """SQLite guarda datetimes sin zona; el contrato exige ISO con UTC."""
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    class Config:
        from_attributes = True
        populate_by_name = True


class ReportListResponse(BaseModel):
    """Lista de reportes con filtro opcional por crew_id."""
    reports: list[ReportResponse]