"""
Datos mock para desbloquear al frontend (Fase 1-2).
Según PROJECT.md §11.4: "FastAPI + CORS + rutas devolviendo fixtures".
Esto se reemplaza por datos reales de BD + motor ML en fases posteriores.
"""
from typing import Optional
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


def get_mock_crew(day: int) -> list[dict]:
    """Devuelve tripulación base para el día dado."""
    return MOCK_CREW


def get_mock_status(crew_id: str, day: int) -> StatusResponse:
    """
    Genera status mock según escenario y día.
    Reglas según PROJECT.md §6.3 y demo día 118.
    """
    member = next((m for m in MOCK_CREW if m["id"] == crew_id), None)
    if not member:
        raise ValueError(f"Tripulante {crew_id} no encontrado")

    scenario = member["scenario"]
    name = member["name"]

    # Baseline personal (fijo por persona)
    baselines = {
        "c1": {"sleep": 7.0, "hr": 62, "mood": 4, "stress": 2, "exercise": 90},
        "c2": {"sleep": 6.5, "hr": 58, "mood": 3, "stress": 2, "exercise": 100},
        "c3": {"sleep": 7.2, "hr": 65, "mood": 4, "stress": 1, "exercise": 95},
        "c4": {"sleep": 6.8, "hr": 60, "mood": 3, "stress": 2, "exercise": 85},
    }
    bl = baselines[crew_id]

    indicators = []
    hazards = []

    # === INDICADORES SEGÚN ESCENARIO Y DÍA ===
    if scenario == "isolation":  # Nova - aislamiento desde día 96
        if day >= 118:  # Demo day
            # Sueño: 5.1h vs 7.0 base, 4 noches
            indicators.append(IndicatorValue(
                id="sleep_h", value=5.1, baseline=bl["sleep"], level=Level.ACT, z=-2.4,
                why=["Sueño: 5,1 h contra 7,0 h de tu base, 4 noches seguidas"],
                action="Revisa luz y horario; sin cafeína después de las 14:00.",
                escalate="flight_surgeon",
            ))
            # Ánimo: 2/5 vs 4 base, 3 días
            indicators.append(IndicatorValue(
                id="mood", value=2, baseline=bl["mood"], level=Level.ACT, z=-2.0,
                why=["Ánimo: 2/5 contra 4 de tu base, 3 días seguidos"],
                action="Contacto social estructurado (comida en grupo, llamada a familia).",
                escalate="flight_surgeon",
            ))
            # Estrés: 4/5 vs 2 base
            indicators.append(IndicatorValue(
                id="stress", value=4, baseline=bl["stress"], level=Level.WATCH, z=2.0,
                why=["Estrés: 4/5 contra 2 de tu base"],
                action="Pausas obligatorias, técnicas de respiración.",
                escalate="crew",
            ))
            # Pulso normal
            indicators.append(IndicatorValue(
                id="hr_rest", value=64, baseline=bl["hr"], level=Level.NORMAL, z=0.5,
                why=["Pulso en reposo: 64 lpm contra 62 lpm"],
                action="Mantén hidratación y rutina.",
                escalate="crew",
            ))

            # Peligro: aislamiento (iso) - convergencia sueño+ánimo+estrés
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

    elif scenario == "deconditioning":  # Iker - pérdida condición desde día 60
        if day >= 118:
            # Ejercicio bajo
            indicators.append(IndicatorValue(
                id="exercise_min", value=30, baseline=bl["exercise"], level=Level.ACT, z=-2.5,
                why=["Ejercicio: 30 min contra 100 min de tu plan (30%)"],
                action="Replanifica sesiones; revisa si hay dolor o falla equipo.",
                escalate="flight_surgeon",
            ))
            # Pulso subido
            indicators.append(IndicatorValue(
                id="hr_rest", value=78, baseline=bl["hr"], level=Level.ACT, z=2.1,
                why=["Pulso en reposo: 78 lpm contra 58 lpm, 20 días"],
                action="Confirma medición; revisa hidratación, sueño y carga.",
                escalate="flight_surgeon",
            ))

            hazards.append(HazardStatus(
                id="grav", level=Level.ACT, anomaly=0.78,
                why=["Ejercicio bajo y pulso en reposo subiendo desde día 80"],
                days_to_threshold=12,
            ))

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

    else:  # healthy - Aya
        indicators.append(IndicatorValue(id="sleep_h", value=7.1, baseline=bl["sleep"], level=Level.NORMAL, z=0.1,
            why=[], action="", escalate=""))
        indicators.append(IndicatorValue(id="hr_rest", value=66, baseline=bl["hr"], level=Level.NORMAL, z=0.2,
            why=[], action="", escalate=""))
        indicators.append(IndicatorValue(id="mood", value=4, baseline=bl["mood"], level=Level.NORMAL, z=0,
            why=[], action="", escalate=""))
        indicators.append(IndicatorValue(id="stress", value=1, baseline=bl["stress"], level=Level.NORMAL, z=0,
            why=[], action="", escalate=""))
        indicators.append(IndicatorValue(id="exercise_min", value=95, baseline=bl["exercise"], level=Level.NORMAL, z=0,
            why=[], action="", escalate=""))
        indicators.append(IndicatorValue(id="co2_mmhg", value=2.2, baseline=2.5, level=Level.NORMAL, z=-0.5,
            why=[], action="", escalate=""))

    # Filtrar indicadores vacíos (solo para healthy)
    indicators = [i for i in indicators if i.value is not None]

    return StatusResponse(
        crew_id=crew_id,
        day=day,
        profile="mars_transit",
        indicators=indicators,
        hazards=hazards,
    )


def get_mock_series(crew_id: str, end_day: int, days: int) -> SeriesResponse:
    """Genera serie mock de 30 días hacia atrás desde end_day."""
    start_day = max(0, end_day - days + 1)
    day_range = list(range(start_day, end_day + 1))

    member = next((m for m in MOCK_CREW if m["id"] == crew_id), None)
    scenario = member["scenario"] if member else "healthy"

    baselines = {
        "c1": {"sleep": 7.0, "hr": 62, "mood": 4, "stress": 2, "exercise": 90},
        "c2": {"sleep": 6.5, "hr": 58, "mood": 3, "stress": 2, "exercise": 100},
        "c3": {"sleep": 7.2, "hr": 65, "mood": 4, "stress": 1, "exercise": 95},
        "c4": {"sleep": 6.8, "hr": 60, "mood": 3, "stress": 2, "exercise": 85},
    }
    bl = baselines[crew_id]

    # Generar serie simple con tendencia según escenario
    series = {
        "sleep_h": [],
        "hr_rest": [],
        "mood": [],
        "stress": [],
        "exercise_min": [],
        "co2_mmhg": [],
    }

    for d in day_range:
        if scenario == "isolation" and d >= 96:
            progress = min((d - 96) / 30, 1.0)
            series["sleep_h"].append(round(bl["sleep"] - 2.0 * progress, 1))
            series["mood"].append(round(max(bl["mood"] - 2.0 * progress, 1.5), 1))
            series["stress"].append(round(bl["stress"] + 2.0 * progress, 1))
        elif scenario == "deconditioning" and d >= 60:
            progress = min((d - 60) / 45, 1.0)
            series["exercise_min"].append(round(bl["exercise"] * (1 - 0.7 * progress)))
            series["hr_rest"].append(round(bl["hr"] + 20 * progress))
        elif scenario == "co2_high" and d >= 80:
            series["co2_mmhg"].append(round(2.5 + 0.7 * min((d - 80) / 10, 1.0), 1))
            series["sleep_h"].append(round(bl["sleep"] - 1.0 * min((d - 80) / 10, 1.0), 1))
        else:
            series["sleep_h"].append(bl["sleep"])
            series["hr_rest"].append(bl["hr"])
            series["mood"].append(bl["mood"])
            series["stress"].append(bl["stress"])
            series["exercise_min"].append(bl["exercise"])
            series["co2_mmhg"].append(2.2)

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