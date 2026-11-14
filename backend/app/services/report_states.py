"""Lógica de estados de reporte (tránsito → recibido → respondido)."""
from datetime import datetime, timezone
from app.models.report import Report, ReportStatus
from app.config import get_settings


settings = get_settings()

# Retraso por perfil (minutos reales)
PROFILE_DELAYS = {
    "station": 0,
    "moon": 3,
    "mars_transit": 20,
}


def get_eta_minutes(profile: str) -> int:
    """ETA en minutos según perfil de misión."""
    return PROFILE_DELAYS.get(profile, 20)


def calculate_report_status(
    report: Report,
    demo_mode: bool = True,
    demo_speedup: int = 60,
    now: datetime | None = None,
) -> ReportStatus:
    """
    Calcula el estado actual del reporte basado en tiempo transcurrido.
    - transit: recién enviado, en camino
    - received: llegó a Tierra (tras eta_minutes)
    - responded: Tierra respondió (tras eta_minutes * 2)

    En demo_mode, el tiempo se acelera ×demo_speedup.
    """
    if report.status != ReportStatus.TRANSIT:
        return report.status

    if now is None:
        now = datetime.now(timezone.utc)

    elapsed_real_seconds = (now - report.created_at).total_seconds()
    elapsed_real_minutes = elapsed_real_seconds / 60
    elapsed_demo_minutes = elapsed_real_minutes * demo_speedup if demo_mode else elapsed_real_minutes

    if elapsed_demo_minutes >= report.eta_minutes * 2:
        return ReportStatus.RESPONDED
    elif elapsed_demo_minutes >= report.eta_minutes:
        return ReportStatus.RECEIVED
    return ReportStatus.TRANSIT


def update_report_status_if_needed(report: Report, db) -> bool:
    """
    Actualiza el estado del reporte en BD si cambió.
    Returns True si se actualizó.
    """
    new_status = calculate_report_status(
        report, settings.demo_mode, settings.demo_speedup
    )
    if new_status != report.status:
        report.status = new_status
        now = datetime.now(timezone.utc)
        if new_status == ReportStatus.RECEIVED and report.received_at is None:
            report.received_at = now
        elif new_status == ReportStatus.RESPONDED and report.responded_at is None:
            report.responded_at = now
        db.add(report)
        db.commit()
        return True
    return False