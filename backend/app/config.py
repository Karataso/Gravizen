"""Configuración de la aplicación usando pydantic-settings."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Settings de la aplicación. Se cargan desde .env o variables de entorno."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "Vitalis API"
    app_version: str = "0.1.0"
    debug: bool = True
    environment: str = "development"  # development | production

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Database
    database_url: str = "sqlite:///./vitalis.db"

    # CORS
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Mission profiles
    default_profile: str = "mars_transit"

    # Demo mode
    demo_mode: bool = True
    demo_speedup: int = 60  # ×60 para el demo

    # External APIs (opcional)
    nasa_api_key: str = "DEMO_KEY"


@lru_cache
def get_settings() -> Settings:
    """Singleton de settings para inyección de dependencias."""
    return Settings()