# Gravizen · Vitalis

Health-monitoring software for astronauts, built for the NASA Space Apps Challenge.

**Read first:**
- [`docs/PROJECT.md`](docs/PROJECT.md) — challenge, MVP, data, API contract, tasks per role
- [`docs/api.md`](docs/api.md) — API contract (frozen; manda sobre las formas de §9)
- [`docs/recursos.md`](docs/recursos.md) — where every data point and citation comes from
- [`docs/data-sources.md`](docs/data-sources.md) — datos reales, qué es simulado y cómo se mide en el espacio
- [`docs/guia-trabajo.md`](docs/guia-trabajo.md) — clinical background

Status: MVP funcional (demo día 118). `main` es la rama de integración; una rama por rol, PRs pequeños.

No existe un dataset público de signos vitales diarios de astronautas: **la fisiología es simulada**, y lo declaramos. Los umbrales y los límites de radiación y CO₂ sí salen de NASA (ver `docs/recursos.md`).

## Layout

```
docs/       especificación, contrato, material clínico y procedencia de datos
fixtures/   respuestas de ejemplo para que FE y BE trabajen en paralelo
frontend/   Vite + React + TS + Tailwind + Recharts
backend/    FastAPI + SQLAlchemy + SQLite
ml/         simulador, reglas, contenido, evaluación
scripts/    descarga de datos públicos de NASA (OSDR / DONKI)
```

## Correr el backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload      # http://localhost:8000/docs
```

La base SQLite se crea y siembra sola al arrancar.

## Correr el motor de evaluación (opcional)

```bash
pip install -r ml/requirements.txt
pip install -e ml      # el backend lo usa si el día está cubierto por el dataset
pytest -q ml/tests
```

Ver [`ml/README.md`](ml/README.md) para interfaz, métricas y limitaciones.

## Equipo y roles

Cada carpeta tiene un dueño en [`.github/CODEOWNERS`](.github/CODEOWNERS). Ramas: `feat/<rol>-<tema>`.

| # | Rol | Persona | GitHub |
|---|---|---|---|
| 1 | Líder e integración | TODO | @Karataso |
| 2 | Frontend: mapa y dashboard | TODO | TODO |
| 3 | Frontend: check-in y contenido | TODO | TODO |
| 4 | Backend | Rayden | @Shadow1987-oss |
| 5 | Datos y modelo | TODO | TODO |
| 6 | Salud, contenido y pitch | TODO | TODO |

## Reglas de git

- `main` protegida: solo PR, 1 revisión, squash merge.
- Rebase sobre `main` antes de abrir PR; `npm ci`, no `npm install`.
- Cambios de contrato: PR a `docs/api.md` + aviso en el chat.
