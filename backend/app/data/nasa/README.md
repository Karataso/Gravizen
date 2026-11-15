# Datos reales de NASA (OSDR)

Este directorio contiene **datos procesados y públicos** usados como referencia y
calibración. No son datos privados ni telemetría diaria de una tripulación real.

## OSD-575_CMP_TRANSFORMED.csv

- Estudio: **OSD-575 — SpaceX Inspiration4 Blood Serum Metabolic Panel**
- Contenido: panel metabólico completo de 4 tripulantes en 7 extracciones
  (`L-92`, `L-44`, `L-3`, `R+1`, `R+45`, `R+82`, `R+194`).
- Filas: 28 (4 × 7). Tamaño: 8.5 KB.
- Fuente: https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
- Descarga:
  `https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv`
- `sha256`: `5eb1e7f025dd8443a9e70111e62bc32afae3432753024489c5c013e401d709d9`
- Obtenido: 14 nov 2026.
- Uso: glucosa real de referencia (`GET /api/reference/inspiration4/glucose`) y
  calibración del simulador. El dashboard diario sigue siendo simulado.

Para actualizarlo: `python scripts/fetch_nasa_data.py --force`.

Ver [`docs/data-sources.md`](../../../../docs/data-sources.md) para el mapa completo
de datos reales y simulados.
