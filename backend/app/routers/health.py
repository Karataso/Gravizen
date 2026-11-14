"""Health check endpoint."""
from fastapi import APIRouter
from app.config import get_settings


router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/api/health", summary="Liveness probe")
async def health_check():
    """Health check para Kubernetes / load balancers."""
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }