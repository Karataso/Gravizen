"""Configuración compartida para tests."""
import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["ENVIRONMENT"] = "test"

import pytest
from sqlalchemy import create_engine, delete
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# Import app after setting env vars
from app.main import app
from app.database import Base, get_db, engine
from app.config import get_settings
# Import all models to register them with Base.metadata
from app.models import (
    Astronaut,
    Measurement,
    CheckIn,
    Report,
    ReportLevel,
    ReportStatus,
)
from app.models.astronaut import CrewRole


# Recreate engine with test database
engine_test = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Replace the app's engine with test engine
import app.database as db_module
db_module.engine = engine_test
db_module.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

TestingSessionLocal = db_module.SessionLocal


# Mock crew data (matching app/services/data_loader.py)
MOCK_CREW_DATA = [
    {"id": "c1", "name": "Nova", "role": CrewRole.COMMANDER, "mission_day": 118, "profile": "mars_transit"},
    {"id": "c2", "name": "Iker", "role": CrewRole.PILOT, "mission_day": 118, "profile": "mars_transit"},
    {"id": "c3", "name": "Aya", "role": CrewRole.SCIENTIST, "mission_day": 118, "profile": "mars_transit"},
    {"id": "c4", "name": "Sol", "role": CrewRole.ENGINEER, "mission_day": 118, "profile": "mars_transit"},
]


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Crear tablas una vez por sesión de tests."""
    Base.metadata.create_all(bind=engine_test)
    # Seed mock crew once per session
    db = TestingSessionLocal()
    try:
        for member in MOCK_CREW_DATA:
            astro = Astronaut(**member)
            db.add(astro)
        db.commit()
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture(scope="function")
def db_session():
    """Crea una BD fresca para cada test (con crew ya sembrada)."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        # Clean up test data (keep crew)
        db.execute(delete(CheckIn))
        db.execute(delete(Report))
        db.execute(delete(Measurement))
        db.commit()
        db.rollback()
        db.close()


@pytest.fixture(scope="function")
def client(db_session):
    """TestClient con override de get_db."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def sample_astronaut(db_session):
    """Astronauta de prueba adicional."""
    astro = Astronaut(
        id="test-1",
        name="Test Astronaut",
        role="comandante",
        mission_day=10,
        profile="mars_transit",
    )
    db_session.add(astro)
    db_session.commit()
    db_session.refresh(astro)
    return astro


@pytest.fixture
def sample_measurement(db_session, sample_astronaut):
    """Medición de prueba."""
    meas = Measurement(
        astronaut_id=sample_astronaut.id,
        day=10,
        sleep_h=7.0,
        hr_rest=62.0,
        mood=4.0,
        stress=2.0,
        exercise_min=90.0,
        rad_dose_msv=0.5,
        co2_mmhg=2.5,
        baseline_sleep_h=7.0,
        baseline_hr_rest=62.0,
        baseline_mood=4.0,
        baseline_stress=2.0,
        baseline_exercise_min=90.0,
        mad_sleep_h=0.35,
        mad_hr_rest=2.0,
        mad_mood=0.5,
        mad_stress=0.5,
        mad_exercise_min=10.0,
    )
    db_session.add(meas)
    db_session.commit()
    db_session.refresh(meas)
    return meas