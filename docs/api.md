# Contrato de la API — Vitalis

**Estado:** v1 congelado · 14 nov 2026
**Fuente:** `docs/PROJECT.md` §9. Este archivo manda sobre las **formas** de respuesta; donde difiere de §9 se anota al final.

Base: `/api` · JSON en `snake_case` · fechas = día de misión entero (`day`).
Niveles: `normal | watch | act | emergency`.
Errores: `{"detail": "mensaje"}` (formato FastAPI).

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/health` | Liveness |
| GET | `/api/crew` | Tripulación (sin datos clínicos) |
| GET | `/api/crew/{id}/series?end_day=118&days=30` | Serie + línea base |
| GET | `/api/crew/{id}/status?day=118` | Niveles, explicación, acción, proyección |
| POST | `/api/crew/{id}/checkins` | Crea/actualiza check-in del día (201 al crear, 200 al actualizar) |
| POST | `/api/crew/{id}/reports` | Reporte al médico de vuelo |
| GET | `/api/reports?crew_id=` | Reportes con estado de tránsito |
| POST | `/api/reports/{id}/respond` | Simula la respuesta de Tierra |
| GET | `/api/profiles` | Perfiles de misión y sus parámetros |
| POST | `/api/sim/storm` | *(demo)* Inyecta tormenta solar |

## Formas

### `GET /api/crew?day=118`

```json
{
  "crew": [
    {"id": "c1", "name": "Nova", "role": "comandante", "level": "act", "mission_day": 118}
  ],
  "mission_day": 118,
  "profile": "mars_transit"
}
```

### `GET /api/crew/c1/status?day=118`

```json
{
  "crew_id": "c1", "day": 118, "profile": "mars_transit",
  "indicators": [
    {"id": "sleep_h", "value": 5.1, "baseline": 7.0, "level": "act", "z": -2.4,
     "why": ["Sueño: 5,1 h contra 7,0 h de tu base, 4 noches seguidas"],
     "action": "Revisa luz y horario; sin cafeína después de las 14:00.",
     "escalate": "flight_surgeon", "days_to_threshold": null}
  ],
  "hazards": [
    {"id": "iso", "level": "act", "anomaly": 0.91,
     "why": ["Sueño, ánimo y estrés empeorando juntos desde el día 108"],
     "days_to_threshold": 6}
  ]
}
```

### `GET /api/crew/c1/series?end_day=118&days=30`

```json
{
  "crew_id": "c1", "baseline_end_day": 14,
  "days": [89, 90, 91],
  "series": {"sleep_h": [6.8, 6.5, 6.1], "hr_rest": [61, 63, 64]},
  "baseline": {"sleep_h": {"median": 7.0, "mad": 0.35}, "hr_rest": {"median": 62, "mad": 2.0}}
}
```

Los huecos de datos van como `null` en `series`, nunca interpolados.

### `POST /api/crew/c1/checkins`

```json
{
  "day": 118, "sleep_h": 5.1, "mood": 2, "stress": 4,
  "bp_sys": 128, "bp_dia": 84, "temp_c": 36.8, "glucose_mgdl": 98,
  "exercise_min": 30,
  "headache": true, "vision_change": false, "dizziness": false,
  "nausea": false, "back_pain": false, "fever": false, "self_harm": false,
  "note": "dolor de cabeza desde ayer", "client_id": "2f1c..."
}
```

Respuesta `201` (nuevo) / `200` (actualizado):

```json
{"status": { "...mismo objeto que /status..." }, "checkin_id": "ch_7", "created": true}
```

Idempotente por `(crew_id, day)`: reenviar actualiza, no duplica.

### `POST /api/crew/c1/reports`

```json
{"day": 118, "level": "act", "hazard": "iso", "message": "Sueño y ánimo bajos, 4 días. ¿Ajustamos carga?"}
```

```json
{"id": "r_7", "crew_id": "c1", "day": 118, "level": "act", "hazard": "iso",
 "message": "...", "status": "transit", "eta_minutes": 20,
 "created_at": "2026-11-14T18:02:00Z", "received_at": null,
 "responded_at": null, "response_message": null}
```

`status`: `transit` → `received` (a los `eta_minutes`) → `responded` (manual o +5 min).
Retraso: Estación 0 · Luna 3 · Marte 20 min. En demo, ×60.

### `GET /api/reports?crew_id=c1`

```json
{"reports": [ { "...ReportResponse..." } ]}
```

### `GET /api/profiles`

```json
{"profiles": [{"id": "mars_transit", "name": "Tránsito a Marte",
  "description": "...", "radiation_base_msv": 1.8, "comms_delay_minutes": 20,
  "co2_base_mmhg": 2.5}], "current": "mars_transit"}
```

### `POST /api/sim/storm`

```json
{"day": 96, "intensity": 1.0, "duration_days": 2}
```
→ `{"success": true, "message": "...", "storm_day": 96, "intensity": 1.0, "duration_days": 2}`

## Diferencias respecto a `PROJECT.md` §9 (decididas al integrar el backend)

El backend ya está implementado y probado con estas formas; el frontend debe seguirlas:

1. **`GET /api/crew`** devuelve `{crew, mission_day, profile}`, no un array.
2. **`GET /api/reports`** devuelve `{reports: [...]}`, no un array.
3. **`POST /checkins`** devuelve `{status, checkin_id, created}`; el objeto de estado va dentro de `status`.
4. **Síntomas** viajan como booleanos (`headache: true`), no como array `symptoms: ["headache"]`.
5. **`POST /checkins`** responde `201` al crear y `200` al actualizar (no siempre `200`).
