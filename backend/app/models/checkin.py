"""Modelo de check-in diario (entrada del astronauta)."""
from __future__ import annotations
from typing import Optional
from sqlalchemy import (
    String, Integer, Float, ForeignKey, Boolean, Text, UniqueConstraint, Index,
    DateTime, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import uuid


class CheckIn(Base):
    """
    Check-in diario enviado por el tripulante.
    Idempotente por (astronaut_id, day) - reenviar actualiza, no duplica.
    """

    __tablename__ = "checkins"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    astronaut_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("astronauts.id", ondelete="CASCADE"), nullable=False
    )
    day: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    # Indicadores principales (lo que reporta el astronauta)
    sleep_h: Mapped[float] = mapped_column(Float, nullable=True)
    mood: Mapped[int] = mapped_column(Integer, nullable=True)  # 1-5
    stress: Mapped[int] = mapped_column(Integer, nullable=True)  # 1-5

    # Opcionales
    bp_sys: Mapped[float] = mapped_column(Float, nullable=True)
    bp_dia: Mapped[float] = mapped_column(Float, nullable=True)
    temp_c: Mapped[float] = mapped_column(Float, nullable=True)
    glucose_mgdl: Mapped[float] = mapped_column(Float, nullable=True)
    exercise_min: Mapped[float] = mapped_column(Float, nullable=True)

    # Síntomas (checkboxes)
    headache: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    vision_change: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dizziness: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    nausea: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    back_pain: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fever: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    self_harm: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Nota libre
    note: Mapped[str] = mapped_column(Text, nullable=True)

    # Cliente ID para idempotencia del frontend (opcional)
    client_id: Mapped[str] = mapped_column(String(64), nullable=True)

    # Timestamps
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relación
    astronaut: Mapped["Astronaut"] = relationship(back_populates="checkins")

    # Constraints
    __table_args__ = (
        UniqueConstraint("astronaut_id", "day", name="uq_checkin_astronaut_day"),
        Index("ix_checkin_astronaut_day", "astronaut_id", "day"),
    )

    def __repr__(self) -> str:
        return f"<CheckIn(astronaut={self.astronaut_id}, day={self.day})>"

    def symptoms_list(self) -> list[str]:
        """Devuelve lista de síntomas marcados."""
        symptoms = []
        if self.headache:
            symptoms.append("headache")
        if self.vision_change:
            symptoms.append("vision_change")
        if self.dizziness:
            symptoms.append("dizziness")
        if self.nausea:
            symptoms.append("nausea")
        if self.back_pain:
            symptoms.append("back_pain")
        if self.fever:
            symptoms.append("fever")
        if self.self_harm:
            symptoms.append("self_harm")
        return symptoms