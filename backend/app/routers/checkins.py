"""Router de check-ins: POST /api/crew/{id}/checkins."""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, timezone

from app.database import get_db
from app.models import Astronaut, CheckIn
from app.schemas.checkin import CheckInCreate, CheckInResponse
from app.schemas.measurement import StatusResponse
from app.services.ml_bridge import evaluate_crew_day
from app.config import get_settings


router = APIRouter(prefix="/api", tags=["checkins"])
settings = get_settings()


@router.post(
    "/crew/{crew_id}/checkins",
    response_model=CheckInResponse,
    summary="Crear o actualizar check-in del día (idempotente)"
)
async def create_checkin(
    crew_id: str,
    payload: CheckInCreate,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Guarda un check-in diario. Idempotente por (crew_id, day):
    - Si no existe: crea (201)
    - Si existe: actualiza (200)
    Devuelve el status actualizado tras procesar el check-in.
    """
    # Verificar tripulante
    astronaut = db.execute(
        select(Astronaut).where(Astronaut.id == crew_id)
    ).scalar_one_or_none()

    if not astronaut:
        raise HTTPException(status_code=404, detail=f"Tripulante {crew_id} no encontrado")

    # Validar día coherente
    if payload.day != astronaut.mission_day:
        # Permitimos check-ins de días pasados pero avisamos
        pass

    # Buscar check-in existente (idempotencia)
    existing = db.execute(
        select(CheckIn).where(
            CheckIn.astronaut_id == crew_id,
            CheckIn.day == payload.day
        )
    ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    created = False

    if existing:
        # Actualizar
        for field, value in payload.model_dump(exclude_unset=True).items():
            if field not in ("client_id",):  # no tocar client_id
                setattr(existing, field, value)
        existing.updated_at = now
        checkin = existing
        response.status_code = status.HTTP_200_OK
    else:
        # Crear nuevo
        checkin = CheckIn(
            astronaut_id=crew_id,
            day=payload.day,
            **payload.model_dump(exclude={"client_id", "day"}),
            created_at=now,
            updated_at=now,
        )
        db.add(checkin)
        created = True
        response.status_code = status.HTTP_201_CREATED

    db.commit()
    db.refresh(checkin)

    # Status recalculado con el check-in recién guardado
    updated_status = evaluate_crew_day(crew_id, payload.day, db)

    return CheckInResponse(
        status=updated_status,
        checkin_id=checkin.id,
        created=created,
    )