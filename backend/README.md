# Vitalis Backend

API FastAPI para el monitor de salud de astronautas **Vitalis**.

## Stack

- **FastAPI** 0.115 + **Uvicorn**
- **SQLAlchemy** 2.0 + **SQLite** (dev) / **PostgreSQL** (prod)
- **Pydantic** v2 + **pydantic-settings**
- **pytest** + **httpx** para tests

## Estructura

```
backend/
├── app/
│   ├── main.py              # FastAPI app, lifespan, CORS
│   ├── config.py            # Settings (pydantic-settings)
│   ├── database.py          # Engine, session, Base, init_db
│   ├── models/              # SQLAlchemy models
│   │   ├── astronaut.py
│   │   ├── checkin.py
│   │   └── report.py
│   ├── schemas/             # Pydantic models (API contract)
│   │   ├── crew.py
│   │   ├── measurement.py
│   │   ├── checkin.py
│   │   ├── report.py
│   │   ├── profile.py
│   │   └── reference.py
│   ├── routers/             # API endpoints
│   │   ├── health.py        # GET /api/health
│   │   ├── crew.py          # GET /api/crew, /status, /series
│   │   ├── checkins.py      # POST /api/crew/{id}/checkins
│   │   ├── reports.py       # POST/GET /api/reports
│   │   ├── profiles.py      # GET /api/profiles
│   │   └── reference.py     # GET /api/reference/inspiration4/glucose
│   ├── data/nasa/           # CSV público de referencia (OSD-575)
│   └── services/            # Business logic
│       ├── data_loader.py   # Mock data (fase 1-2)
│       ├── ml_bridge.py     # Puente a paquete ml/ (transit → received → responded)
│       └── nasa_data.py     # Datos reales OSDR (OSD-575)
├── tests/                   # pytest tests
├── requirements.txt
├── Dockerfile
├── render.yaml
├── .env.example
└── pytest.ini
```

## Contrato de la API

Ver `docs/PROJECT.md` §9 y `docs/api.md` (cuando exista).

Endpoints principales:

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/crew` | Lista tripulación + nivel general |
| GET | `/api/crew/{id}/status?day=XXX` | Indicadores + peligros del día |
| GET | `/api/crew/{id}/series?end_day=XXX&days=30` | Serie temporal + baseline |
| POST | `/api/crew/{id}/checkins` | Check-in idempotente |
| POST | `/api/crew/{id}/reports` | Reporte a médico de vuelo |
| GET | `/api/reports` | Listar reportes con estado |
| GET | `/api/profiles` | Perfiles de misión |
| GET | `/api/reference/inspiration4/glucose` | Glucosa real de Inspiration4 (OSDR OSD-575) |

## Desarrollo local

```bash
cd backend

# Crear venv
python -m venv .venv
source .venv/bin/activate

# Instalar deps
pip install -r requirements.txt

# Copiar .env
cp .env.example .env

# Levantar servidor
uvicorn app.main:app --reload --port 8000

# Docs: http://localhost:8000/docs
# Health: http://localhost:8000/api/health
```

## Tests

```bash
# Todos
pytest

# Con coverage
pytest --cov=app --cov-report=term-missing

# Solo tests de crew
pytest tests/test_crew.py -v
```

## Variables de entorno

Ver `.env.example`. Claves principales:

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DATABASE_URL` | URL de BD | `sqlite:///./vitalis.db` |
| `CORS_ORIGINS` | Orígenes permitidos | `["http://localhost:5173", ...]` |
| `DEFAULT_PROFILE` | Perfil misión por defecto | `mars_transit` |
| `DEMO_MODE` | Acelerar tiempo ×60 | `true` |
| `DEBUG` | Modo debug | `true` |

## Despliegue

### Render (recomendado)

1. Conecta repo a Render
2. Usa `render.yaml` (blueprint) o crea Web Service manual:
   - **Build**: `docker build -t vitalis-api ./backend`
   - **Start**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Dockerfile**: `./backend/Dockerfile`
3. Añade PostgreSQL database (free tier)
4. Configura `CORS_ORIGINS` con URL del frontend (Vercel/Netlify)

### Railway

Similar a Render, usa `Dockerfile` y variable `DATABASE_URL` de PostgreSQL.

### Variables de producción

```bash
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql://...
CORS_ORIGINS=["https://tu-frontend.vercel.app"]
NASA_API_KEY=tu_clave_real  # no DEMO_KEY
```

## Integración con ML (Rol 5)

Cuando el paquete `ml/` esté listo:

```bash
# Desde backend/
pip install -e ../ml
```

Luego en `app/services/ml_bridge.py` descomenta:

```python
from ml import evaluate as ml_evaluate

def evaluate_crew_day(crew_id: str, day: int) -> StatusResponse:
    return ml_evaluate(crew_id, day)
```

El motor ML debe exponer:
```python
# ml/__init__.py
def evaluate(crew_id: str, day: int) -> StatusResponse: ...
```

## Fixtures / Mock Data

Mientras no exista `ml/`, los endpoints devuelven datos mock desde `app/services/data_loader.py`:

- 4 tripulantes: Nova (c1), Iker (c2), Aya (c3), Sol (c4)
- Escenarios: aislamiento, desentrenamiento, control sano, CO₂ alto
- Demo day: 118 (según guion PROJECT.md §3.2)

## Próximos pasos (Fases 2-4)

1. **Fase 2**: Sembrar BD real desde `ml/simulator` al startup
2. **Fase 3**: Conectar `ml_bridge.evaluate_crew_day()` real
3. **Fase 4**: Check-in idempotente persiste en BD + recalcula status
4. **Fase 5**: Deploy + HTTPS + tests CI

## Licencia

MIT - NASA Space Apps Challenge 2026