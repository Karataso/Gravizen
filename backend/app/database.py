"""Configuración de base de datos SQLAlchemy."""
from contextlib import contextmanager
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.config import get_settings


settings = get_settings()

# Engine SQLite con configuración para desarrollo
# check_same_thread=False necesario para FastAPI + SQLite en desarrollo
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
    poolclass=StaticPool if "sqlite" in settings.database_url else None,
    echo=settings.debug,
)

# Habilitar FK en SQLite
if "sqlite" in settings.database_url:

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Base declarativa para modelos."""
    pass


def get_db() -> Session:
    """Dependencia FastAPI para obtener sesión de BD."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Session:
    """Context manager para uso fuera de request (ej. scripts, startup)."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """Crear todas las tablas. Se llama al arrancar la app."""
    # Importar modelos para que se registren en Base.metadata
    from app.models import astronaut, measurement, checkin, report  # noqa: F401

    Base.metadata.create_all(bind=engine)