"""Router de tripulación: GET /api/crew, /api/crew/{id}/status, /series."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models import Astronaut
from app.schemas.crew import (
    AstronautPublic,
    CrewListResponse,
    CrewProfileResponse,
    CrewProfileUpdate,
)
from app.schemas.measurement import (
    StatusResponse,
    SeriesResponse,
    Level,
)
from app.services.data_loader import get_mock_crew, get_mock_series
from app.services.ml_bridge import evaluate_crew_day
from app.config import get_settings


router = APIRouter(prefix="/api", tags=["crew"])
settings = get_settings()


@router.get("/crew", response_model=CrewListResponse, summary="Lista de tripulantes")
def list_crew(
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
        status = evaluate_crew_day(member["id"], day, db)
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


@router.patch(
    "/crew/{crew_id}",
    response_model=CrewProfileResponse,
    summary="Cambiar el perfil de misión (retraso de comunicación)",
)
def update_crew_profile(
    crew_id: str,
    payload: CrewProfileUpdate,
    db: Session = Depends(get_db),
):
    """
    Cambia el perfil de misión del tripulante. Solo afecta reportes nuevos:
    el retraso se fija al crear cada reporte.
    """
    astronaut = db.execute(
        select(Astronaut).where(Astronaut.id == crew_id)
    ).scalar_one_or_none()

    if not astronaut:
        raise HTTPException(status_code=404, detail=f"Tripulante {crew_id} no encontrado")

    astronaut.profile = payload.profile
    db.commit()
    db.refresh(astronaut)

    return CrewProfileResponse(
        id=astronaut.id, name=astronaut.name, profile=astronaut.profile
    )


@router.get(
    "/crew/{crew_id}/status",
    response_model=StatusResponse,
    summary="Estado de indicadores y peligros de un tripulante en un día"
)
def get_crew_status(
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

    # Mock + check-in del día hasta que exista ml.evaluate()
    return evaluate_crew_day(crew_id, day, db)


@router.get(
    "/crew/{crew_id}/series",
    response_model=SeriesResponse,
    summary="Serie temporal de indicadores + línea base"
)
def get_crew_series(
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

    # Por ahora: datos mock (el motor ml/ cubre los primeros 30 días).
    return get_mock_series(crew_id, end_day, days)