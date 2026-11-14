## Qué cambia

<!-- Una o dos frases. Si toca el contrato, enlaza docs/api.md. -->

## Cómo probarlo

```bash
# backend
cd backend && pip install -r requirements.txt && pytest -q

# frontend (cuando exista)
cd frontend && npm ci && npm run build
```

## Checklist

- [ ] `< 250` líneas, un solo tema
- [ ] `docs/api.md` actualizado si cambió una ruta o una forma
- [ ] Si es un cambio de contrato, avisado en el chat del equipo
- [ ] Sin `.env`, `*.db`, `node_modules/` ni `.venv/` en el diff
- [ ] Tests pasan (o explica por qué no hay)
- [ ] Texto en condicional: "podría", "considera", "avisa" (PROJECT.md §4.1)
