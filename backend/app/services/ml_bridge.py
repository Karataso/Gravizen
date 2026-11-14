"""
Puente al paquete ML (rol 5).
Cuando el paquete `ml/` esté listo, expondrá:
    from ml import evaluate_crew_day

    result = evaluate_crew_day(crew_id: str, day: int) -> StatusResponse

Por ahora: stub que devuelve mock data.
"""
from app.schemas.measurement import StatusResponse
from app.services.data_loader import get_mock_status


def evaluate_crew_day(crew_id: str, day: int) -> StatusResponse:
    """
    Evalúa un tripulante en un día dado usando el motor ML.
    Contrato: ml.evaluate(crew_id, day) -> StatusResponse

    Cuando el paquete ml/ esté instalado (`pip install -e ../ml`):
    ```python
    from ml import evaluate as ml_evaluate
    return ml_evaluate(crew_id, day)
    ```
    """
    # TODO: Conectar motor ML real
    # from ml import evaluate
    # return evaluate(crew_id, day)

    # Fallback a mock
    return get_mock_status(crew_id, day)


def get_ml_status() -> dict:
    """Health check del motor ML."""
    return {
        "status": "not_connected",
        "message": "Paquete ml/ no instalado. Ejecuta: pip install -e ../ml",
        "expected_function": "ml.evaluate(crew_id, day) -> StatusResponse",
    }