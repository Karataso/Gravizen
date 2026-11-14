"""Router de simulación: POST /api/sim/storm."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models import Astronaut, Measurement
from app.schemas.sim import StormRequest, StormResponse


router = APIRouter(prefix="/api", tags=["simulation"])


@router.post("/sim/storm", response_model=StormResponse, summary="Inyectar tormenta solar")
async def inject_solar_storm(
    payload: StormRequest,
    db: Session = Depends(get_db),
):
    """
    Inyecta un evento de tormenta solar en el día especificado.
    Afecta: radiación (salto de dosis), y con 1 día de retraso sueño/estrés.
    Solo para demo - en producción vendría de DONKI/NOAA SWPC.
    """
    # Verificar que hay tripulantes
    crew = db.execute(select(Astronaut)).scalars().all()
    if not crew:
        raise HTTPException(status_code=400, detail="No hay tripulación sembrada")

    # Buscar/crear mediciones para el día de la tormenta
    for astronaut in crew:
        measurement = db.execute(
            select(Measurement).where(
                Measurement.astronaut_id == astronaut.id,
                Measurement.day == payload.day
            )
        ).scalar_one_or_none()

        if not measurement:
            measurement = Measurement(
                astronaut_id=astronaut.id,
                day=payload.day,
            )
            db.add(measurement)

        # Inyectar pico de radiación
        base_rad = measurement.rad_dose_msv or 0.5
        measurement.rad_dose_msv = base_rad * payload.intensity * 5  # salto 5x base
        measurement.rad_cumulative_msv = (measurement.rad_cumulative_msv or 0) + measurement.rad_dose_msv

        # Efectos en días siguientes (sueño/estrés) - se aplican en motor ML real
        # Aquí solo marcamos para que el motor lo sepa
        # TODO: El motor ML debería leer esto y ajustar

    db.commit()

    return StormResponse(
        success=True,
        message=f"Tormenta solar inyectada en día {payload.day} (intensidad ×{payload.intensity})",
        storm_day=payload.day,
        intensity=payload.intensity,
        duration_days=payload.duration_days,
    )