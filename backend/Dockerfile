# Vitalis Backend - Dockerfile para Render/Railway
FROM python:3.11-slim

# Metadata
LABEL maintainer="Vitalis Team"
LABEL description="Vitalis API - Astronaut Health Monitoring"

# Evita prompts interactivos
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Directorio de trabajo
WORKDIR /app

# Copiar requirements primero (para cache de layers)
COPY requirements.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ml/ no se instala: el deploy usa el mock (el demo vive en el día 118,
# fuera del dataset) y la imagen evita pandas/sklearn.

# Copiar código de la aplicación
COPY ./app /app/app

# Crear usuario no-root para seguridad
RUN useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

# Puerto
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Comando de inicio
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]