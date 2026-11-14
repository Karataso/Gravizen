"""Modelo de reporte al médico de vuelo."""
from __future__ import annotations
from typing import Optional
from sqlalchemy import (
    String, Integer, ForeignKey, Enum as SQLEnum, Text, DateTime, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum
import uuid


class ReportLevel(str, enum.Enum):
    """Nivel del reporte (igual que indicadores)."""
    NORMAL = "normal"
    WATCH = "watch"
    ACT = "act"
    EMERGENCY = "emergency"


class ReportStatus(str, enum.Enum):
    """Estado de tránsito del reporte."""
    TRANSIT = "transit"
    RECEIVED = "received"
    RESPONDED = "responded"


class Report(Base):
    """
    Reporte enviado a Tierra (médico de vuelo).
    Estado evoluciona con el tiempo: transit -> received -> responded.
    """

    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    astronaut_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("astronauts.id", ondelete="CASCADE"), nullable=False
    )
    day: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    level: Mapped[ReportLevel] = mapped_column(
        SQLEnum(ReportLevel), nullable=False, default=ReportLevel.NORMAL
    )
    hazard: Mapped[str] = mapped_column(String(50), nullable=True)  # iso, rad, grav, env, dist
    message: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[ReportStatus] = mapped_column(
        SQLEnum(ReportStatus), nullable=False, default=ReportStatus.TRANSIT
    )
    eta_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=20)  # según perfil

    # Timestamps
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    received_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=True)
    responded_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=True)

    # Respuesta de Tierra (opcional)
    response_message: Mapped[str] = mapped_column(Text, nullable=True)

    # Relación
    astronaut: Mapped["Astronaut"] = relationship(back_populates="reports")

    def __repr__(self) -> str:
        return f"<Report(id={self.id}, astronaut={self.astronaut_id}, level={self.level.value}, status={self.status.value})>"