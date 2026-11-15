"""
Datos mock para el demo (Fase 1-2).
Según PROJECT.md §11.4: "FastAPI + CORS + rutas devolviendo fixtures".
El motor `ml/` los reemplaza en los días que cubre el dataset.
"""
from app.schemas.measurement import (
    StatusResponse,
    SeriesResponse,
    IndicatorValue,
    IndicatorBaseline,
    HazardStatus,
    Level,
)
from app.schemas.crew import CrewRole


# Tripulación base (4 personas según PROJECT.md §6.3)
MOCK_CREW = [
    {
        "id": "c1",
        "name": "Nova",
        "role": CrewRole.COMMANDER,
        "scenario": "isolation",  # Aislamiento y confinamiento desde día 96
    },
    {
        "id": "c2",
        "name": "Iker",
        "role": CrewRole.PILOT,
        "scenario": "deconditioning",  # Pérdida de condición desde día 60
    },
    {
        "id": "c3",
        "name": "Aya",
        "role": CrewRole.SCIENTIST,
        "scenario": "healthy",  # Control sano
    },
    {
        "id": "c4",
        "name": "Sol",
        "role": CrewRole.ENGINEER,
        "scenario": "co2_high",  # CO₂ alto desde día 80
    },
]

# Línea base personal (única fuente para status, series y check-in).
CREW_BASELINES = {
    "c1": {"sleep": 7.0, "hr": 62, "mood": 4, "stress": 2, "exercise": 90},
    "c2": {"sleep": 6.5, "hr": 58, "mood": 3, "stress": 2, "exercise": 100},
    "c3": {"sleep": 7.2, "hr": 65, "mood": 4, "stress": 1, "exercise": 95},
    "c4": {"sleep": 6.8, "hr": 60, "mood": 3, "stress": 2, "exercise": 85},
}


def get_crew_baseline(crew_id: str) -> dict:
    return CREW_BASELINES.get(crew_id, CREW_BASELINES["c3"])


def get_mock_crew(day: int) -> list[dict]:
    """Devuelve tripulación base para el día dado."""
    return MOCK_CREW


def _normal(indicator_id: str, value: float, baseline: float) -> IndicatorValue:
    return IndicatorValue(
        id=indicator_id, value=value, baseline=baseline, level=Level.NORMAL,
        z=0, why=[], action="", escalate="",
    )


def get_mock_status(crew_id: str, day: int) -> StatusResponse:
    """
    Genera status mock según escenario y día.
    Reglas según PROJECT.md §6.3 y demo día 118.
    """
    member = next((m for m in MOCK_CREW if m["id"] == crew_id), None)
    if not member:
        raise ValueError(f"Tripulante {crew_id} no encontrado")

    scenario = member["scenario"]
    bl = get_crew_baseline(crew_id)
    indicators = []
    hazards = []

    # === INDICADORES SEGÚN ESCENARIO Y DÍA ===
    if scenario == "isolation":  # Nova - aislamiento desde día 96
        if day >= 118:  # Demo day
            indicators.append(IndicatorValue(
                id="sleep_h", value=5.1, baseline=bl["sleep"], level=Level.ACT, z=-2.4,
                why=["Sueño: 5,1 h contra 7,0 h de tu base, 4 noches seguidas"],
                action="Revisa luz y horario; sin cafeína después de las 14:00.",
                escalate="flight_surgeon",
            ))
            indicators.append(IndicatorValue(
                id="mood", value=2, baseline=bl["mood"], level=Level.ACT, z=-2.0,
                why=["Ánimo: 2/5 contra 4 de tu base, 3 días seguidos"],
                action="Contacto social estructurado (comida en grupo, llamada a familia).",
                escalate="flight_surgeon",
            ))
            indicators.append(IndicatorValue(
                id="stress", value=4, baseline=bl["stress"], level=Level.WATCH, z=2.0,
                why=["Estrés: 4/5 contra 2 de tu base"],
                action="Pausas obligatorias, técnicas de respiración.",
                escalate="crew",
            ))
            indicators.append(IndicatorValue(
                id="hr_rest", value=64, baseline=bl["hr"], level=Level.NORMAL, z=0.5,
                why=["Pulso en reposo: 64 lpm contra 62 lpm"],
                action="Mantén hidratación y rutina.",
                escalate="crew",
            ))
            hazards.append(HazardStatus(
                id="iso", level=Level.ACT, anomaly=0.91,
                why=["Sueño, ánimo y estrés empeorando juntos desde el día 108"],
                days_to_threshold=6,
            ))
        elif day >= 96:
            # Inicio gradual
            sleep_val = max(bl["sleep"] - 0.1 * (day - 96), 5.0)
            mood_val = max(bl["mood"] - 0.05 * (day - 96), 2)
            indicators.append(IndicatorValue(id="sleep_h", value=sleep_val, baseline=bl["sleep"],
                level=Level.WATCH if sleep_val < bl["sleep"] - 1 else Level.NORMAL, z=-1.5,
                why=[f"Sueño: {sleep_val:.1f} h contra {bl['sleep']} h de tu base"],
                action="Revisa horario de luz.", escalate="crew"))
            indicators.append(IndicatorValue(id="mood", value=int(mood_val), baseline=bl["mood"],
                level=Level.WATCH if mood_val <= bl["mood"] - 1 else Level.NORMAL, z=-1.0,
                why=[f"Ánimo: {int(mood_val)}/5 contra {bl['mood']} de tu base"],
                action="Contacto social.", escalate="crew"))
            if day >= 108:
                hazards.append(HazardStatus(
                    id="iso", level=Level.WATCH, anomaly=0.5,
                    why=["Sueño, ánimo y estrés empeorando juntos desde el día 108"],
                    days_to_threshold=10,
                ))
        else:
            indicators.extend([
                _normal("sleep_h", bl["sleep"], bl["sleep"]),
                _normal("hr_rest", bl["hr"], bl["hr"]),
                _normal("mood", bl["mood"], bl["mood"]),
                _normal("stress", bl["stress"], bl["stress"]),
            ])

    elif scenario == "deconditioning":  # Iker - pérdida condición desde día 60
        if day >= 60:
            progress = min((day - 60) / 45, 1.0)
            exercise = round(bl["exercise"] * (1 - 0.7 * progress), 1)
            hr = round(bl["hr"] + 20 * progress, 1)
            level = Level.WATCH if day >= 90 else Level.NORMAL
            indicators.append(IndicatorValue(
                id="exercise_min", value=exercise, baseline=bl["exercise"], level=level,
                z=-1.5 if level != Level.NORMAL else 0,
                why=[f"Ejercicio: {exercise:g} min contra {bl['exercise']} min de tu plan"] if level != Level.NORMAL else [],
                action="Replanifica sesiones; revisa si hay dolor o falla equipo." if level != Level.NORMAL else "",
                escalate="crew" if level != Level.NORMAL else "",
            ))
            indicators.append(IndicatorValue(
                id="hr_rest", value=hr, baseline=bl["hr"], level=level,
                z=1.5 if level != Level.NORMAL else 0,
                why=[f"Pulso en reposo: {hr:g} lpm contra {bl['hr']} lpm"] if level != Level.NORMAL else [],
                action="Confirma medición; revisa hidratación, sueño y carga." if level != Level.NORMAL else "",
                escalate="crew" if level != Level.NORMAL else "",
            ))
            if day >= 90:
                hazards.append(HazardStatus(
                    id="grav", level=Level.WATCH, anomaly=0.5,
                    why=["Ejercicio bajo y pulso en reposo subiendo desde día 90"],
                    days_to_threshold=12,
                ))
        else:
            indicators.extend([
                _normal("exercise_min", bl["exercise"], bl["exercise"]),
                _normal("hr_rest", bl["hr"], bl["hr"]),
            ])

    elif scenario == "co2_high":  # Sol - CO₂ alto desde día 80
        if day >= 118:
            indicators.append(IndicatorValue(
                id="co2_mmhg", value=3.2, baseline=2.5, level=Level.ACT, z=2.3,
                why=["CO₂: 3,2 mmHg (promedio 1 h) - sobre límite 3,0 mmHg"],
                action="Ventilar cabina; revisar depurador; bajar actividad intensa.",
                escalate="flight_surgeon",
            ))
            indicators.append(IndicatorValue(
                id="sleep_h", value=5.5, baseline=bl["sleep"], level=Level.WATCH, z=-1.8,
                why=["Sueño: 5,5 h contra 6,8 h de tu base"],
                action="Revisa ambiente de dormir.", escalate="crew"))
            indicators.append(IndicatorValue(
                id="headache", value=1, baseline=0, level=Level.ACT, z=3.0,
                why=["Cefalea persistente 3 días - sospecha CO₂"],
                action="Verificar CO₂; hidratación; avisar médico si sigue.", escalate="flight_surgeon"))

            hazards.append(HazardStatus(
                id="env", level=Level.ACT, anomaly=0.85,
                why=["CO₂ sobre 3 mmHg, cefalea, sueño peor"],
                days_to_threshold=3,
            ))
        elif day >= 80:
            progress = min((day - 80) / 10, 1.0)
            co2 = round(2.5 + 0.7 * progress, 1)
            sleep_val = round(bl["sleep"] - 1.0 * progress, 1)
            indicators.append(IndicatorValue(
                id="co2_mmhg", value=co2, baseline=2.5, level=Level.WATCH, z=1.5,
                why=[f"CO₂: {co2:g} mmHg, subiendo desde el día 80"],
                action="Verifica el sensor, mejora la ventilación y repite la lectura.",
                escalate="crew",
            ))
            indicators.append(IndicatorValue(
                id="sleep_h", value=sleep_val, baseline=bl["sleep"], level=Level.WATCH, z=-1.5,
                why=[f"Sueño: {sleep_val:g} h contra {bl['sleep']} h de tu base"],
                action="Revisa ambiente de dormir.", escalate="crew"))
            hazards.append(HazardStatus(
                id="env", level=Level.WATCH, anomaly=0.55,
                why=["CO₂ y sueño empeorando desde el día 80"],
                days_to_threshold=20,
            ))
        else:
            indicators.extend([
                _normal("co2_mmhg", 2.2, 2.5),
                _normal("sleep_h", bl["sleep"], bl["sleep"]),
            ])

    else:  # healthy - Aya
        indicators.extend([
            _normal("sleep_h", 7.1, bl["sleep"]),
            _normal("hr_rest", 66, bl["hr"]),
            _normal("mood", 4, bl["mood"]),
            _normal("stress", 1, bl["stress"]),
            _normal("exercise_min", 95, bl["exercise"]),
            _normal("co2_mmhg", 2.2, 2.5),
        ])

    return StatusResponse(
        crew_id=crew_id,
        day=day,
        profile="mars_transit",
        indicators=indicators,
        hazards=hazards,
    )


def get_mock_series(crew_id: str, end_day: int, days: int) -> SeriesResponse:
    """Genera serie mock de `days` días hacia atrás desde end_day."""
    start_day = max(0, end_day - days + 1)
    day_range = list(range(start_day, end_day + 1))

    member = next((m for m in MOCK_CREW if m["id"] == crew_id), None)
    scenario = member["scenario"] if member else "healthy"
    bl = get_crew_baseline(crew_id)

    series = {
        "sleep_h": [],
        "hr_rest": [],
        "mood": [],
        "stress": [],
        "exercise_min": [],
        "co2_mmhg": [],
    }

    for d in day_range:
        # Todos los indicadores tienen valor cada día; el escenario solo cambia algunos.
        values = {
            "sleep_h": bl["sleep"],
            "hr_rest": bl["hr"],
            "mood": bl["mood"],
            "stress": bl["stress"],
            "exercise_min": bl["exercise"],
            "co2_mmhg": 2.2,
        }
        if scenario == "isolation" and d >= 96:
            progress = min((d - 96) / 30, 1.0)
            values["sleep_h"] = round(bl["sleep"] - 2.0 * progress, 1)
            values["mood"] = round(max(bl["mood"] - 2.0 * progress, 1.5), 1)
            values["stress"] = round(bl["stress"] + 2.0 * progress, 1)
        elif scenario == "deconditioning" and d >= 60:
            progress = min((d - 60) / 45, 1.0)
            values["exercise_min"] = round(bl["exercise"] * (1 - 0.7 * progress))
            values["hr_rest"] = round(bl["hr"] + 20 * progress)
        elif scenario == "co2_high" and d >= 80:
            progress = min((d - 80) / 10, 1.0)
            values["co2_mmhg"] = round(2.5 + 0.7 * progress, 1)
            values["sleep_h"] = round(bl["sleep"] - 1.0 * progress, 1)

        for key in series:
            series[key].append(values[key])

    return SeriesResponse(
        crew_id=crew_id,
        baseline_end_day=14,
        days=day_range,
        series=series,
        baseline={
            "sleep_h": IndicatorBaseline(median=bl["sleep"], mad=0.35),
            "hr_rest": IndicatorBaseline(median=bl["hr"], mad=2.0),
            "mood": IndicatorBaseline(median=bl["mood"], mad=0.5),
            "stress": IndicatorBaseline(median=bl["stress"], mad=0.5),
            "exercise_min": IndicatorBaseline(median=bl["exercise"], mad=10.0),
            "co2_mmhg": IndicatorBaseline(median=2.5, mad=0.3),
        },
    )


def seed_database(db) -> None:
    """
    Siembra la BD con la tripulación mock (ml/ reemplazará las mediciones).
    Se llama al arrancar la app (startup event).
    """
    from app.models import Astronaut

    for member in MOCK_CREW:
        if db.get(Astronaut, member["id"]) is None:
            db.add(Astronaut(
                id=member["id"],
                name=member["name"],
                role=member["role"],
                mission_day=118,
                profile="mars_transit",
            ))
    db.commit()
