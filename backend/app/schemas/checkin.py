"""Esquemas de check-in (POST /api/crew/{id}/checkins)."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from app.schemas.measurement import StatusResponse


class CheckInCreate(BaseModel):
    """Payload para crear/actualizar check-in."""
    day: int = Field(ge=0)
    sleep_h: Optional[float] = Field(default=None, ge=3, le=12)
    mood: Optional[int] = Field(default=None, ge=1, le=5)
    stress: Optional[int] = Field(default=None, ge=1, le=5)

    # Opcionales
    bp_sys: Optional[float] = Field(default=None, ge=70, le=250)
    bp_dia: Optional[float] = Field(default=None, ge=40, le=150)
    temp_c: Optional[float] = Field(default=None, ge=34, le=42)
    glucose_mgdl: Optional[float] = Field(default=None, ge=40, le=500)
    exercise_min: Optional[float] = Field(default=None, ge=0, le=240)

    # Síntomas
    headache: bool = False
    vision_change: bool = False
    dizziness: bool = False
    nausea: bool = False
    back_pain: bool = False
    fever: bool = False
    self_harm: bool = False

    # Nota libre
    note: Optional[str] = None

    # Cliente ID para idempotencia del frontend
    client_id: Optional[str] = None

    @field_validator("bp_dia")
    @classmethod
    def validate_bp(cls, v, info):
        if v is not None and info.data.get("bp_sys") is not None:
            if v >= info.data["bp_sys"]:
                raise ValueError("bp_dia must be less than bp_sys")
        return v


class CheckInResponse(BaseModel):
    """Respuesta: status actualizado tras el check-in."""
    status: StatusResponse
    checkin_id: str
    created: bool  # True si nuevo, False si actualizado