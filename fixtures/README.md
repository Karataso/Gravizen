# Fixtures

Respuestas reales del backend (14 nov 2026) para que frontend y backend trabajen en paralelo sin esperarse. Mismas formas que `docs/api.md`.

| Archivo | Corresponde a |
|---|---|
| `crew.json` | `GET /api/crew?day=118` |
| `status/c1-day118.json` … `c4` | `GET /api/crew/{id}/status?day=118` |
| `series/c1-120d.json` … `c4` | `GET /api/crew/{id}/series?end_day=119&days=120` |
| `reports.json` | `GET /api/reports` |
| `profiles.json` | `GET /api/profiles` |

El día 118 es el del guion de demo. Se regeneran cuando cambie el contrato: `uvicorn app.main:app` y guardar las respuestas.
