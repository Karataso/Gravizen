"""Configuración de base de datos SQLAlchemy."""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from sqlalchemy.pool import NullPool, StaticPool

from app.config import get_settings


settings = get_settings()

_is_sqlite = "sqlite" in settings.database_url
_is_memory = ":memory:" in settings.database_url

# StaticPool solo para la BD en memoria de tests; un archivo recibe una
# conexión por petición para no compartirla entre hilos.
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    poolclass=StaticPool if _is_memory else (NullPool if _is_sqlite else None),
    echo=settings.debug,
)

# Habilitar FK en SQLite
if _is_sqlite:

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


def init_db() -> None:
    """Crear todas las tablas. Se llama al arrancar la app."""
    # Importar modelos para que se registren en Base.metadata
    from app.models import astronaut, checkin, report  # noqa: F401

    Base.metadata.create_all(bind=engine)
