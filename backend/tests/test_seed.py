"""Tests del sembrado de tripulación (arranque con BD vacía)."""
from sqlalchemy import select

from app.models import Astronaut
from app.services.data_loader import MOCK_CREW, seed_database


def test_seed_database_is_idempotent(db_session):
    """Arrancar dos veces deja 4 tripulantes, no 8."""
    seed_database(db_session)
    seed_database(db_session)

    crew = db_session.execute(select(Astronaut)).scalars().all()
    assert sorted(a.id for a in crew) == sorted(m["id"] for m in MOCK_CREW)
