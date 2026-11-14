# Vitalis · Frontend dashboard

Dashboard React + TypeScript + Tailwind + Recharts para el MVP de Vitalis.

## Ejecutar

Requiere Node.js `20.19+` o `22.12+`.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

La URL base del backend se configura con `VITE_API_URL` (sin `/api`). Si se deja vacía, el frontend consulta `/api` en el mismo origen. `VITE_DEMO_MODE=true` activa datos falsos de forma explícita y visible; no sustituye silenciosamente a la API cuando esta falla.

## Contrato consumido

- `GET /api/crew?day={day}`
- `GET /api/crew/{id}/status?day={day}`
- `GET /api/crew/{id}/series?end_day={day}&days=30`

El frontend normaliza y valida en tiempo de ejecución las respuestas `snake_case` descritas en [`../docs/PROJECT.md`](../docs/PROJECT.md). Los días sin medición se conservan como `null` y aparecen como huecos; no se interpolan.

## Verificar

```bash
npm run typecheck
npm run build
```

El diseño incluye modo oscuro y claro, foco visible, controles táctiles de al menos 44 px, estados de carga/error/vacío y una composición verificada a 400 px sin desbordamiento horizontal.
