"""Router de reportes: POST/GET /api/reports."""
from datetime import datetime, timezone
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models import Astronaut, Report, ReportStatus
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

# El estado "responded" automático no es una respuesta médica real.
AUTO_REPLY = "Respuesta automática de la simulación: aún no hay evaluación del médico de vuelo."


def calculate_report_status(report: Report, demo_mode: bool = True, demo_speedup: int = 60) -> ReportStatus:
    """
    Calcula el estado actual del reporte basado en tiempo transcurrido.
    En demo_mode, el tiempo se acelera ×demo_speedup.
    """
    if report.status != ReportStatus.TRANSIT:
        return report.status

    created_at = report.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    elapsed_real_minutes = (datetime.now(timezone.utc) - created_at).total_seconds() / 60
    elapsed_demo_minutes = elapsed_real_minutes * demo_speedup if demo_mode else elapsed_real_minutes

    if elapsed_demo_minutes >= report.eta_minutes + 5:
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
def create_report(
    crew_id: str,
    payload: ReportCreate,
    db: Session = Depends(get_db),
):
    """
    Crea un reporte a Tierra. Estado inicial: transit.
    `client_id` es opcional y hace el reintento idempotente.
    """
    astronaut = db.execute(
        select(Astronaut).where(Astronaut.id == crew_id)
    ).scalar_one_or_none()

    if not astronaut:
        raise HTTPException(status_code=404, detail=f"Tripulante {crew_id} no encontrado")

    report_id = payload.client_id or str(uuid.uuid4())
    if payload.client_id:
        existing = db.get(Report, report_id)
        if existing is not None:
            if existing.astronaut_id != crew_id:
                raise HTTPException(status_code=409, detail="client_id ya usado por otro tripulante")
            return ReportResponse.model_validate(existing)

    report = Report(
        id=report_id,
        astronaut_id=crew_id,
        day=payload.day,
        level=payload.level,
        hazard=payload.hazard,
        message=payload.message,
        eta_minutes=PROFILE_DELAYS.get(astronaut.profile, 20),
        status=ReportStatus.TRANSIT,
    )
    db.add(report)
    try:
        db.commit()
    except IntegrityError:
        # Otro reintento ganó la carrera por el mismo client_id.
        db.rollback()
        existing = db.get(Report, report_id)
        if existing is not None:
            if existing.astronaut_id != crew_id:
                raise HTTPException(status_code=409, detail="client_id ya usado por otro tripulante")
            return ReportResponse.model_validate(existing)
        raise
    db.refresh(report)

    return ReportResponse.model_validate(report)


@router.get("/reports", response_model=ReportListResponse, summary="Listar reportes")
def list_reports(
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

    changed = False
    for report in reports:
        current_status = calculate_report_status(report, settings.demo_mode, settings.demo_speedup)
        if current_status == report.status:
            continue

        now = datetime.now(timezone.utc)
        report.status = current_status
        if current_status in (ReportStatus.RECEIVED, ReportStatus.RESPONDED) and report.received_at is None:
            report.received_at = now
        if current_status == ReportStatus.RESPONDED:
            if report.responded_at is None:
                report.responded_at = now
            if report.response_message is None:
                report.response_message = AUTO_REPLY
        changed = True

    response_reports = [ReportResponse.model_validate(report) for report in reports]
    if changed:
        db.commit()

    return ReportListResponse(reports=response_reports)


from pydantic import BaseModel

class RespondReportRequest(BaseModel):
    response_message: str


@router.post("/reports/{report_id}/respond", response_model=ReportResponse, summary="Responder reporte (simular Tierra)")
def respond_report(
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

    now = datetime.now(timezone.utc)
    report.status = ReportStatus.RESPONDED
    if report.received_at is None:
        report.received_at = now
    report.responded_at = now
    report.response_message = payload.response_message
    db.commit()
    db.refresh(report)

    return ReportResponse.model_validate(report)
