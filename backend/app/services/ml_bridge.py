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

from app.config import get_settings
from app.models import Astronaut, CheckIn
from app.schemas.measurement import HazardStatus, IndicatorValue, Level, StatusResponse
from app.services.data_loader import get_crew_baseline, get_mock_status

# El paquete ml/ es opcional: se activa con `pip install -e ml`.
try:
    from ml import evaluate as _ml_evaluate
except Exception:  # ImportError o dependencias del modelo ausentes
    _ml_evaluate = None

# Si el dataset no trae línea base para un indicador, el check-in usa esta.
DEFAULT_BASELINE = {"sleep_h": 7.0, "mood": 4.0, "stress": 2.0, "glucose_mgdl": 85.0}

# Los ids del contrato no coinciden con las claves de la línea base.
BASELINE_KEYS = {
    "sleep_h": "sleep",
    "hr_rest": "hr",
    "mood": "mood",
    "stress": "stress",
    "exercise_min": "exercise",
    "glucose_mgdl": "glucose",
}

CHECKIN_LABELS = {
    "sleep_h": "Sueño",
    "mood": "Ánimo",
    "stress": "Estrés",
    "glucose_mgdl": "Glucosa",
}


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


def _glucose_level(value: float, base: float) -> Level:
    """Umbrales absolutos de PROJECT.md §5.1 (sin el caso 'con síntomas')."""
    if value > 140 or value < 60:
        return Level.ACT
    if value > 110 or value < 70:
        return Level.WATCH
    return Level.NORMAL


# Orden fijo de los 5 peligros de NASA HRP (PROJECT.md §7.4).
HAZARD_ORDER = ("rad", "iso", "grav", "env", "dist")

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
    ind.z = None  # la z del mock ya no describe este valor
    if level != Level.NORMAL:
        base = f" contra {ind.baseline:g} de tu línea base" if ind.baseline is not None else ""
        ind.why = [f"{label}: {value:g}{base}"]
    return ind


def evaluate_crew_day(crew_id: str, day: int, db: Session) -> StatusResponse:
    """
    Evalúa un tripulante en un día. Contrato: `ml.evaluate(crew_id, day)`.
    """
    status = _model_status(crew_id, day) or get_mock_status(crew_id, day)

    checkin = db.execute(
        select(CheckIn).where(CheckIn.astronaut_id == crew_id, CheckIn.day == day)
    ).scalar_one_or_none()
    if checkin is not None:
        _apply_checkin(status, checkin)

    # El perfil del tripulante vive en la BD; el mock y el motor no lo conocen.
    astronaut = db.get(Astronaut, crew_id)
    if astronaut is not None:
        status.profile = astronaut.profile

    # El dashboard muestra siempre los 5 peligros de NASA HRP (§3.1).
    present = {h.id: h for h in status.hazards}
    status.hazards = [
        present.get(hid) or HazardStatus(id=hid, level=Level.NORMAL, why=["Sin desviaciones este día"])
        for hid in HAZARD_ORDER
    ] + [h for h in status.hazards if h.id not in HAZARD_ORDER]

    return status


def _apply_checkin(status: StatusResponse, checkin: CheckIn) -> None:
    by_id = {ind.id: ind for ind in status.indicators}
    crew_base = get_crew_baseline(status.crew_id)

    for ind_id, value, rule in (
        ("sleep_h", checkin.sleep_h, _sleep_level),
        ("mood", checkin.mood, _mood_level),
        ("stress", checkin.stress, _stress_level),
        ("glucose_mgdl", checkin.glucose_mgdl, _glucose_level),
    ):
        if value is None:
            continue
        ind = by_id.get(ind_id) or IndicatorValue(id=ind_id, level=Level.NORMAL)
        if ind_id not in by_id:
            by_id[ind_id] = ind
            status.indicators.append(ind)
        base = ind.baseline
        if base is None:
            base = crew_base.get(BASELINE_KEYS[ind_id], DEFAULT_BASELINE.get(ind_id, value))
            ind.baseline = base
        _overlay(ind, value, rule(value, base), CHECKIN_LABELS.get(ind_id, ind_id))

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


def _model_status(crew_id: str, day: int) -> StatusResponse | None:
    """Status del motor real si `ml/` está instalado y cubre ese día."""
    if _ml_evaluate is None:
        return None
    try:
        raw = _ml_evaluate(crew_id, day)
    except Exception:
        return None
    if raw is None:
        return None

    raw.pop("level", None)
    raw.pop("isolation_forest_score", None)
    raw.setdefault("profile", get_settings().default_profile)
    return StatusResponse(**raw)


def get_ml_status() -> dict:
    """Health check del motor ML."""
    if _ml_evaluate is None:
        return {
            "status": "mock_bridge",
            "message": "Paquete ml/ no instalado. Ejecuta: pip install -e ml",
        }
    return {
        "status": "ml_engine",
        "message": "Motor ml/ activo para el rango de días del dataset; fuera de él, mock.",
    }
