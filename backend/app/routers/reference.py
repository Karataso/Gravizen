"""Router de datos reales de NASA: GET /api/reference/inspiration4/glucose."""
from fastapi import APIRouter

from app.schemas.reference import GlucoseReferenceResponse
from app.services.nasa_data import get_glucose_reference


router = APIRouter(prefix="/api", tags=["reference"])


@router.get(
    "/reference/inspiration4/glucose",
    response_model=GlucoseReferenceResponse,
    summary="Glucosa real de Inspiration4 (NASA OSDR OSD-575)",
)
def inspiration4_glucose():
    """Devuelve la glucosa pre/post vuelo de los 4 tripulantes de Inspiration4."""
    return get_glucose_reference()
