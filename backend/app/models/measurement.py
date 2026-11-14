"""Modelo de mediciones diarias (datos simulados del motor ML)."""
from __future__ import annotations
from typing import Optional
from sqlalchemy import (
    String, Integer, Float, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Measurement(Base):
    """
    Medición diaria de un indicador para un tripulante.
    Población inicial desde el simulador (ml/).
    """

    __tablename__ = "measurements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    astronaut_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("astronauts.id", ondelete="CASCADE"), nullable=False
    )
    day: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    # Indicadores principales (relativos a baseline)
    sleep_h: Mapped[float] = mapped_column(Float, nullable=True)
    hr_rest: Mapped[float] = mapped_column(Float, nullable=True)
    bp_sys: Mapped[float] = mapped_column(Float, nullable=True)
    bp_dia: Mapped[float] = mapped_column(Float, nullable=True)
    temp_c: Mapped[float] = mapped_column(Float, nullable=True)
    glucose_mgdl: Mapped[float] = mapped_column(Float, nullable=True)
    mood: Mapped[float] = mapped_column(Float, nullable=True)  # 1-5
    stress: Mapped[float] = mapped_column(Float, nullable=True)  # 1-5
    exercise_min: Mapped[float] = mapped_column(Float, nullable=True)

    # Indicadores absolutos (ambientales)
    rad_dose_msv: Mapped[float] = mapped_column(Float, nullable=True)
    rad_cumulative_msv: Mapped[float] = mapped_column(Float, nullable=True)
    co2_mmhg: Mapped[float] = mapped_column(Float, nullable=True)

    # Línea base personal (calculada días 0-13)
    baseline_sleep_h: Mapped[float] = mapped_column(Float, nullable=True)
    baseline_hr_rest: Mapped[float] = mapped_column(Float, nullable=True)
    baseline_bp_sys: Mapped[float] = mapped_column(Float, nullable=True)
    baseline_bp_dia: Mapped[float] = mapped_column(Float, nullable=True)
    baseline_temp_c: Mapped[float] = mapped_column(Float, nullable=True)
    baseline_glucose_mgdl: Mapped[float] = mapped_column(Float, nullable=True)
    baseline_mood: Mapped[float] = mapped_column(Float, nullable=True)
    baseline_stress: Mapped[float] = mapped_column(Float, nullable=True)
    baseline_exercise_min: Mapped[float] = mapped_column(Float, nullable=True)

    # MAD (Median Absolute Deviation) para z-score robusto
    mad_sleep_h: Mapped[float] = mapped_column(Float, nullable=True)
    mad_hr_rest: Mapped[float] = mapped_column(Float, nullable=True)
    mad_bp_sys: Mapped[float] = mapped_column(Float, nullable=True)
    mad_bp_dia: Mapped[float] = mapped_column(Float, nullable=True)
    mad_temp_c: Mapped[float] = mapped_column(Float, nullable=True)
    mad_glucose_mgdl: Mapped[float] = mapped_column(Float, nullable=True)
    mad_mood: Mapped[float] = mapped_column(Float, nullable=True)
    mad_stress: Mapped[float] = mapped_column(Float, nullable=True)
    mad_exercise_min: Mapped[float] = mapped_column(Float, nullable=True)

    # Relación
    astronaut: Mapped["Astronaut"] = relationship(back_populates="measurements")

    # Constraints
    __table_args__ = (
        UniqueConstraint("astronaut_id", "day", name="uq_measurement_astronaut_day"),
        Index("ix_measurement_astronaut_day", "astronaut_id", "day"),
    )

    def __repr__(self) -> str:
        return f"<Measurement(astronaut={self.astronaut_id}, day={self.day})>"