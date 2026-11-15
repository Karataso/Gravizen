"""Router de perfiles de misión: GET /api/profiles."""
from fastapi import APIRouter, HTTPException

from app.schemas.profile import ProfileResponse, ProfileListResponse
from app.config import get_settings


router = APIRouter(prefix="/api", tags=["profiles"])
settings = get_settings()


# Perfiles definidos según PROJECT.md §6.3
PROFILES = [
    ProfileResponse(
        id="station",
        name="Estación (LEO)",
        description="Órbita baja terrestre (ISS). Radiación base, sin retraso de comunicación.",
        radiation_base_msv=0.5,
        comms_delay_minutes=0,
        co2_base_mmhg=2.0,
    ),
    ProfileResponse(
        id="moon",
        name="Luna",
        description="Órbita/superficie lunar. Radiación moderada, ~3 min retraso.",
        radiation_base_msv=1.2,
        comms_delay_minutes=3,
        co2_base_mmhg=2.2,
    ),
    ProfileResponse(
        id="mars_transit",
        name="Tránsito a Marte",
        description="Viaje interestelar. Radiación alta, ~20 min retraso por sentido.",
        radiation_base_msv=1.8,
        comms_delay_minutes=20,
        co2_base_mmhg=2.5,
    ),
]


@router.get("/profiles", response_model=ProfileListResponse, summary="Perfiles de misión disponibles")
def list_profiles():
    """Devuelve perfiles disponibles y el actual."""
    return ProfileListResponse(
        profiles=PROFILES,
        current=settings.default_profile,
    )


@router.get("/profiles/{profile_id}", response_model=ProfileResponse, summary="Detalle de un perfil")
def get_profile(profile_id: str):
    """Detalle de un perfil específico."""
    for p in PROFILES:
        if p.id == profile_id:
            return p
    raise HTTPException(status_code=404, detail=f"Perfil {profile_id} no encontrado")