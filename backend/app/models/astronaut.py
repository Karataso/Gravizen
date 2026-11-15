"""Modelo de astronauta / tripulante."""
from sqlalchemy import String, Integer, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class CrewRole(str, enum.Enum):
    """Roles de la tripulación."""
    COMMANDER = "comandante"
    PILOT = "piloto"
    SCIENTIST = "cientifico"
    ENGINEER = "ingeniero"
    MEDICAL = "medico"
    SPECIALIST = "especialista"


class Astronaut(Base):
    """Tripulante de la misión."""

    __tablename__ = "astronauts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    role: Mapped[CrewRole] = mapped_column(
        SQLEnum(CrewRole), nullable=False, default=CrewRole.SPECIALIST
    )
    mission_day: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    profile: Mapped[str] = mapped_column(String(50), default="mars_transit", nullable=False)

    # Relaciones (carga perezosa: ninguna ruta serializa estas listas)
    checkins: Mapped[list["CheckIn"]] = relationship(
        back_populates="astronaut", cascade="all, delete-orphan"
    )
    reports: Mapped[list["Report"]] = relationship(
        back_populates="astronaut", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Astronaut(id={self.id}, name={self.name}, role={self.role.value})>"