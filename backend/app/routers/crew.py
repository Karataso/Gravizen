"""Router de tripulación: GET /api/crew, /api/crew/{id}/status, /series."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.models import Astronaut, Measurement
from app.schemas.crew import CrewListResponse, AstronautPublic
from app.schemas.measurement import (
    StatusResponse,
    SeriesResponse,
    IndicatorValue,
    IndicatorBaseline,
    HazardStatus,
    Level,
)
from app.services.data_loader import get_mock_crew, get_mock_status, get_mock_series
from app.config import get_settings


router = APIRouter(prefix="/api", tags=["crew"])
settings = get_settings()


@router.get("/crew", response_model=CrewListResponse, summary="Lista de tripulantes")
async def list_crew(
    db: Session = Depends(get_db),
    day: int = Query(0, ge=0, description="Día de misión para filtrar nivel"),
):
    """
    Devuelve la tripulación con su nivel general (semáforo).
    Usa datos mock hasta que el motor ML esté conectado.
    """
    # TODO: Conectar a BD real cuando esté sembrada
    mock_crew = get_mock_crew(day)

    # Calcular nivel general por tripulante (peor nivel entre indicadores)
    crew_list = []
    for member in mock_crew:
        status = get_mock_status(member["id"], day)
        worst_level = Level.NORMAL
        for ind in status.indicators:
            if ind.level == Level.EMERGENCY:
                worst_level = Level.EMERGENCY
                break
            elif ind.level == Level.ACT and worst_level != Level.EMERGENCY:
                worst_level = Level.ACT
            elif ind.level == Level.WATCH and worst_level == Level.NORMAL:
                worst_level = Level.WATCH

        crew_list.append(AstronautPublic(
            id=member["id"],
            name=member["name"],
            role=member["role"],
            level=worst_level,
            mission_day=day,
        ))

    return CrewListResponse(
        crew=crew_list,
        mission_day=day,
        profile=settings.default_profile,
    )


@router.get(
    "/crew/{crew_id}/status",
    response_model=StatusResponse,
    summary="Estado de indicadores y peligros de un tripulante en un día"
)
async def get_crew_status(
    crew_id: str,
    day: int = Query(..., ge=0, description="Día de misión"),
    db: Session = Depends(get_db),
):
    """
    Devuelve nivel por indicador y por peligro, con explicación, acción y proyección.
    Contrato: §9.3 de PROJECT.md
    """
    # Verificar que existe el tripulante
    astronaut = db.execute(
        select(Astronaut).where(Astronaut.id == crew_id)
    ).scalar_one_or_none()

    if not astronaut:
        raise HTTPException(status_code=404, detail=f"Tripulante {crew_id} no encontrado")

    # TODO: Conectar motor ML real (ml.evaluate)
    # Por ahora: datos mock
    return get_mock_status(crew_id, day)


@router.get(
    "/crew/{crew_id}/series",
    response_model=SeriesResponse,
    summary="Serie temporal de indicadores + línea base"
)
async def get_crew_series(
    crew_id: str,
    end_day: int = Query(..., ge=0, description="Día final de la serie"),
    days: int = Query(30, ge=1, le=120, description="Cuántos días hacia atrás"),
    db: Session = Depends(get_db),
):
    """
    Devuelve serie de 30 días (por defecto) de todos los indicadores + baseline.
    Contrato: §9.3 de PROJECT.md
    """
    astronaut = db.execute(
        select(Astronaut).where(Astronaut.id == crew_id)
    ).scalar_one_or_none()

    if not astronaut:
        raise HTTPException(status_code=404, detail=f"Tripulante {crew_id} no encontrado")

    # TODO: Leer de BD real (Measurement)
    # Por ahora: datos mock
    return get_mock_series(crew_id, end_day, days)