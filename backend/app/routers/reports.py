"""Router de reportes: POST/GET /api/reports."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.database import get_db
from app.models import Astronaut, Report, ReportStatus, ReportLevel
from app.schemas.report import ReportCreate, ReportResponse, ReportListResponse
from app.config import get_settings


router = APIRouter(prefix="/api", tags=["reports"])
settings = get_settings()

# Retraso por perfil (minutos reales)
PROFILE_DELAYS = {
    "station": 0,      # Estación (LEO)
    "moon": 3,         # Luna
    "mars_transit": 20,  # Tránsito a Marte
}


def calculate_report_status(report: Report, demo_mode: bool = True, demo_speedup: int = 60) -> ReportStatus:
    """
    Calcula el estado actual del reporte basado en tiempo transcurrido.
    En demo_mode, el tiempo se acelera ×demo_speedup.
    """
    if report.status != ReportStatus.TRANSIT:
        return report.status

    # Ensure created_at is timezone-aware
    created_at = report.created_at
    if isinstance(created_at, str):
        from datetime import datetime as dt
        created_at = dt.fromisoformat(created_at.replace('Z', '+00:00'))
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    elapsed_real_minutes = (datetime.now(timezone.utc) - created_at).total_seconds() / 60
    elapsed_demo_minutes = elapsed_real_minutes * demo_speedup if demo_mode else elapsed_real_minutes

    if elapsed_demo_minutes >= report.eta_minutes * 2:
        return ReportStatus.RESPONDED
    elif elapsed_demo_minutes >= report.eta_minutes:
        return ReportStatus.RECEIVED
    return ReportStatus.TRANSIT


@router.post(
    "/crew/{crew_id}/reports",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear reporte al médico de vuelo"
)
async def create_report(
    crew_id: str,
    payload: ReportCreate,
    db: Session = Depends(get_db),
):
    """
    Crea un reporte a Tierra. Estado inicial: transit.
    ETA depende del perfil de misión.
    """
    astronaut = db.execute(
        select(Astronaut).where(Astronaut.id == crew_id)
    ).scalar_one_or_none()

    if not astronaut:
        raise HTTPException(status_code=404, detail=f"Tripulante {crew_id} no encontrado")

    eta = PROFILE_DELAYS.get(astronaut.profile, 20)

    report = Report(
        astronaut_id=crew_id,
        day=payload.day,
        level=payload.level,
        hazard=payload.hazard,
        message=payload.message,
        eta_minutes=eta,
        status=ReportStatus.TRANSIT,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return ReportResponse.model_validate(report)


@router.get("/reports", response_model=ReportListResponse, summary="Listar reportes")
async def list_reports(
    crew_id: Optional[str] = Query(None, description="Filtrar por tripulante"),
    db: Session = Depends(get_db),
):
    """
    Lista reportes con su estado de tránsito calculado en tiempo real.
    """
    query = select(Report).order_by(Report.created_at.desc())

    if crew_id:
        query = query.where(Report.astronaut_id == crew_id)

    reports = db.execute(query).scalars().all()

    # Calcular estado actual para cada reporte
    response_reports = []
    for r in reports:
        current_status = calculate_report_status(r, settings.demo_mode, settings.demo_speedup)
        # Actualizar en BD si cambió
        if current_status != r.status:
            r.status = current_status
            if current_status == ReportStatus.RECEIVED and r.received_at is None:
                r.received_at = datetime.now(timezone.utc)
            elif current_status == ReportStatus.RESPONDED and r.responded_at is None:
                r.responded_at = datetime.now(timezone.utc)
            db.add(r)
        db.commit()
        response_reports.append(ReportResponse.model_validate(r))

    return ReportListResponse(reports=response_reports)


from pydantic import BaseModel

class RespondReportRequest(BaseModel):
    response_message: str


@router.post("/reports/{report_id}/respond", response_model=ReportResponse, summary="Responder reporte (simular Tierra)")
async def respond_report(
    report_id: str,
    payload: RespondReportRequest,
    db: Session = Depends(get_db),
):
    """
    Simula la respuesta del médico de vuelo.
    En producción sería un endpoint autenticado para Tierra.
    """
    report = db.execute(
        select(Report).where(Report.id == report_id)
    ).scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    report.status = ReportStatus.RESPONDED
    report.responded_at = datetime.now(timezone.utc)
    report.response_message = payload.response_message
    db.commit()
    db.refresh(report)

    return ReportResponse.model_validate(report)