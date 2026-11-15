# Vitalis · Motor de evaluación (`ml/`)

Reglas explicables por tripulante, Isolation Forest para convergencia y
proyección con Huber. Devuelve la forma de `docs/api.md`.

## Instalar y correr

```bash
pip install -r ml/requirements.txt
pip install -e ml          # opcional: lo activa dentro del backend
python -m ml.modelo        # métricas + gráfica en ml/docs/
pytest -q ml/tests
```

Sin `pip install -e ml`, el backend usa el puente mock y no se rompe.

## Interfaz

```python
from ml import evaluate
evaluate("c1", 10)   # -> dict con indicators[] y hazards[], o None
```

- Acepta `c1..c4` (se mapean a `ASTRO_01..04`) y también `ASTRO_xx`.
- Devuelve `None` si el día pedido está fuera del dataset; el backend cae al mock.
- Indicadores: `sleep_h`, `hr_rest`, `stress`, `spo2`. Peligros: los 5 de NASA HRP.
- `spo2` no está en la tabla maestra de `PROJECT.md`; el frontend lo muestra con su id.

## Resultados (dataset actual, 50 × 30 días)

| Métrica | Valor |
|---|---|
| Accuracy | 73,4 % |
| Precision | 89,8 % |
| Recall | 60,9 % |
| F1 | 72,6 % |

Matriz de confusión: `[[573, 60], [339, 528]]` (normal / anomalía).
El recall es el punto débil: 339 días de riesgo se escapan. Declarar como límite.

## Limitaciones

- El dataset cubre **30 días por tripulante**. El demo vive en el día 118 de 120,
  así que ahí el backend usa el puente mock. Para cubrir la misión completa, el
  rol 5 debe extender los datos a 120 días con los escenarios de `PROJECT.md` §6.3.
- El modelo no se ha validado con astronautas reales.
- `matplotlib`/`seaborn` son solo para el informe (`plot_evaluation_results`).
- La imagen de Render no instala `ml/`; el motor corre en local y en CI.

## Procedencia del dataset

Pendiente de confirmar por el autor del PR: `dataset_salud_espacial_50_astronautas.csv`.
Si es sintético, indicar cómo se generó; si viene de una fuente pública, citarla.
El jurado pregunta por esto y `docs/recursos.md` declara que la fisiología es simulada.
