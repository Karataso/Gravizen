"""Router de check-ins: POST /api/crew/{id}/checkins."""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone

from app.database import get_db
from app.models import Astronaut, CheckIn
from app.schemas.checkin import CheckInCreate, CheckInResponse
from app.services.ml_bridge import evaluate_crew_day


router = APIRouter(prefix="/api", tags=["checkins"])


def _apply(payload: CheckInCreate, checkin: CheckIn, now: datetime) -> None:
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field != "client_id":  # no tocar client_id
            setattr(checkin, field, value)
    checkin.updated_at = now


@router.post(
    "/crew/{crew_id}/checkins",
    response_model=CheckInResponse,
    summary="Crear o actualizar check-in del día (idempotente)"
)
def create_checkin(
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
    astronaut = db.execute(
        select(Astronaut).where(Astronaut.id == crew_id)
    ).scalar_one_or_none()

    if not astronaut:
        raise HTTPException(status_code=404, detail=f"Tripulante {crew_id} no encontrado")

    existing = db.execute(
        select(CheckIn).where(
            CheckIn.astronaut_id == crew_id,
            CheckIn.day == payload.day
        )
    ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    created = False

    if existing:
        _apply(payload, existing, now)
        checkin = existing
        response.status_code = status.HTTP_200_OK
    else:
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

    try:
        db.commit()
    except IntegrityError:
        # Dos check-ins del mismo día llegaron a la vez: gana uno, el otro actualiza.
        db.rollback()
        checkin = db.execute(
            select(CheckIn).where(
                CheckIn.astronaut_id == crew_id,
                CheckIn.day == payload.day
            )
        ).scalar_one()
        _apply(payload, checkin, now)
        db.commit()
        created = False
        response.status_code = status.HTTP_200_OK

    db.refresh(checkin)

    # Status recalculado con el check-in recién guardado
    updated_status = evaluate_crew_day(crew_id, payload.day, db)

    return CheckInResponse(
        status=updated_status,
        checkin_id=checkin.id,
        created=created,
    )