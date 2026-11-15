# Vitalis · Frontend dashboard

Dashboard React + TypeScript + Tailwind + Recharts para el MVP de Vitalis. La interfaz integra el estado de misión con los módulos de check-in diario y enlace con Tierra, y funciona como PWA con persistencia offline.

## Ejecutar

Requiere Node.js `20.19+` o `22.12+`.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

La URL base del backend se configura con `VITE_API_URL` (sin `/api`). Si se deja vacía, el frontend consulta `/api` en el mismo origen. `VITE_DEMO_MODE=true` activa datos falsos de forma explícita y visible; no sustituye silenciosamente a la API cuando esta falla.

## Módulos

- **Dashboard:** estado personal, semáforos de tripulación, peligros NASA, proyección, acción sugerida, urgencia y tendencia de indicadores.
- **Check-in diario:** formulario de sueño, ánimo, estrés y síntomas. Se guarda en IndexedDB y se sincroniza cuando vuelve la red.
- **Enlace con Tierra:** bitácora de reportes en tránsito, acción autónoma y simulación de latencia.
- **Datos reales:** glucosa pre/post de Inspiration4 (NASA OSDR OSD-575), separada de la serie diaria simulada. Procedencia en [`../docs/data-sources.md`](../docs/data-sources.md).

La lista de tripulación muestra únicamente nombre, rol y semáforo; no expone datos clínicos de otras personas.

## Contrato consumido

- `GET /api/crew?day={day}`
- `GET /api/crew/{id}/status?day={day}`
- `GET /api/crew/{id}/series?end_day={day}&days=30`
- `POST /api/crew/{id}/checkins`
- `POST /api/crew/{id}/reports`

El frontend normaliza y valida en tiempo de ejecución las respuestas `snake_case` descritas en [`../docs/api.md`](../docs/api.md). Los días sin medición se conservan como `null` y aparecen como huecos; no se interpolan.

## PWA y offline

`vite-plugin-pwa` genera el manifiesto y el service worker para el modo standalone. Check-ins y reportes pendientes se conservan en IndexedDB mediante `idb`; la barra de sincronización indica el estado de conexión y los elementos pendientes, y permite reintentar manualmente.

## Verificar

```bash
npm run lint
npm test
npm run typecheck
npm run build
```

El diseño incluye modo oscuro y claro, foco visible, controles táctiles de al menos 44 px, estados de carga/error/vacío y una composición verificada a 400 px sin desbordamiento horizontal.
