"""
Puente al motor de evaluación (rol 5).

Mientras `ml/` no exista, el estado sale del mock de `data_loader` y se
sobrescribe con el check-in guardado del día, para que el flujo
check-in -> API -> color funcione de punta a punta.

shortcut: reglas simplificadas de PROJECT.md §5.1 sin historial ni EWMA/CUSUM.
Se reemplaza por `ml.evaluate(crew_id, day)` cuando el rol 5 lo entregue.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CheckIn
from app.schemas.measurement import HazardStatus, IndicatorValue, Level, StatusResponse
from app.services.data_loader import get_mock_status


def _sleep_level(value: float, base: float) -> Level:
    if value < 5:
        return Level.ACT
    if value < 6 or value < base - 1:
        return Level.WATCH
    return Level.NORMAL


def _mood_level(value: float, base: float) -> Level:
    if value <= base - 2:
        return Level.ACT
    if value <= base - 1:
        return Level.WATCH
    return Level.NORMAL


def _stress_level(value: float, base: float) -> Level:
    if value >= base + 2:
        return Level.ACT
    if value >= base + 1:
        return Level.WATCH
    return Level.NORMAL


# Síntomas del check-in que se muestran como indicador propio (PROJECT.md §5.1).
SYMPTOM_RULES = {
    "headache": (Level.WATCH, "Cefalea nueva o persistente"),
    "vision_change": (Level.ACT, "Visión borrosa: pedir examen ocular"),
    "dizziness": (Level.WATCH, "Mareo al ponerse de pie: hidratación y presión"),
    "nausea": (Level.WATCH, "Náuseas o desorientación"),
    "back_pain": (Level.WATCH, "Dolor de espalda, cadera o huesos"),
    "fever": (Level.ACT, "Fiebre o malestar: aislar y consultar"),
    "self_harm": (Level.EMERGENCY, "Pensamientos de hacerse daño: apoyo inmediato"),
}


def _overlay(ind: IndicatorValue, value: float, level: Level, label: str) -> IndicatorValue:
    ind.value = value
    ind.level = level
    if level != Level.NORMAL:
        base = f" contra {ind.baseline:g} de tu línea base" if ind.baseline is not None else ""
        ind.why = [f"{label}: {value:g}{base}"]
    return ind


def evaluate_crew_day(crew_id: str, day: int, db: Session) -> StatusResponse:
    """
    Evalúa un tripulante en un día. Contrato: `ml.evaluate(crew_id, day)`.
    """
    status = get_mock_status(crew_id, day)

    checkin = db.execute(
        select(CheckIn).where(CheckIn.astronaut_id == crew_id, CheckIn.day == day)
    ).scalar_one_or_none()
    if checkin is None:
        return status

    by_id = {ind.id: ind for ind in status.indicators}

    for ind_id, value, rule in (
        ("sleep_h", checkin.sleep_h, _sleep_level),
        ("mood", checkin.mood, _mood_level),
        ("stress", checkin.stress, _stress_level),
    ):
        if value is None:
            continue
        ind = by_id.get(ind_id) or IndicatorValue(id=ind_id, level=Level.NORMAL)
        if ind_id not in by_id:
            by_id[ind_id] = ind
            status.indicators.append(ind)
        base = ind.baseline if ind.baseline is not None else value
        _overlay(ind, value, rule(value, base), ind_id)

    for symptom, (level, label) in SYMPTOM_RULES.items():
        if not getattr(checkin, symptom):
            continue
        ind = by_id.get(symptom) or IndicatorValue(id=symptom, level=Level.NORMAL)
        if symptom not in by_id:
            by_id[symptom] = ind
            status.indicators.append(ind)
        ind.value = 1
        ind.level = level
        ind.why = [label]
        if level in (Level.ACT, Level.EMERGENCY):
            ind.escalate = "flight_surgeon"
        if symptom == "self_harm":
            status.hazards = [
                h for h in status.hazards if h.id != "iso"
            ] + [HazardStatus(
                id="iso", level=Level.EMERGENCY,
                why=["Check-in reporta pensamientos de hacerse daño: emergencia inmediata"],
            )]

    return status


def get_ml_status() -> dict:
    """Health check del motor ML."""
    return {
        "status": "mock_bridge",
        "message": "Usando datos mock + check-in del día. Falta el paquete ml/.",
        "expected_function": "ml.evaluate(crew_id, day) -> StatusResponse",
    }
