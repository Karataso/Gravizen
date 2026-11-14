"""FastAPI Application - Vitalis Backend."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import init_db, engine
from app.routers import health, crew, checkins, reports, profiles, sim


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Eventos de startup y shutdown."""
    # Startup
    print(f"🚀 Iniciando {settings.app_name} v{settings.app_version}")
    print(f"   Entorno: {settings.environment}")
    print(f"   Debug: {settings.debug}")
    print(f"   DB: {settings.database_url}")

    # Crear tablas
    init_db()
    print("   ✅ Base de datos inicializada")

    # Sembrar tripulación mock (ml/ reemplazará las mediciones)
    from app.database import SessionLocal
    from app.services.data_loader import seed_database
    with SessionLocal() as db:
        seed_database(db)

    yield

    # Shutdown
    print("🛑 Apagando...")
    engine.dispose()
    print("   ✅ Conexiones cerradas")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API para Vitalis - Monitor de salud de astronautas",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(crew.router)
app.include_router(checkins.router)
app.include_router(reports.router)
app.include_router(profiles.router)
app.include_router(sim.router)


# Manejador global de excepciones
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Log y respuesta consistente para errores no manejados."""
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"},
    )


# Root endpoint
@app.get("/", tags=["root"])
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )