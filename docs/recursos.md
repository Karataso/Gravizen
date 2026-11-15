# Recursos y fuentes de datos

**Propósito:** saber exactamente de dónde sale cada dato, cifra y cita de Vitalis, qué se puede descargar de verdad y qué no.
**Dueños:** rol 6 (contenido y ciencia) y rol 5 (datos). Se actualiza por PR.
**Última verificación de enlaces:** 14 nov 2026 (probados con `curl`, código HTTP 200). Los marcados ⚠️ no se pudieron comprobar en esa fecha y hay que revalidarlos antes del pitch.

---

## 0. La regla de oro

**No existe un dataset público de signos vitales diarios de astronautas.** Son pocas personas, los datos médicos están protegidos y las agencias publican agregados o estudios, no series día a día. NASA usa análogos y modelos por esa misma razón.

Por eso cada dato del proyecto viene de una de estas cuatro fuentes, y hay que poder decir cuál:

| Necesitamos | Fuente | Estado en el proyecto |
|---|---|---|
| Fisiología diaria de la tripulación | Simulador propio (`ml/`) | Sintética, declarada |
| Umbrales y límites de seguridad | NASA OCHMO / NASA-STD-3001 / HRP | Reales, citados |
| Eventos ambientales (tormenta solar, protones) | APIs de NASA/NOAA | Reales, en vivo |
| Contexto y cifras del pitch | NTRS, HRP, papers | Reales, citados |

**Ningún integrante necesita datos externos para empezar.** Roles 2 y 3 usan `fixtures/`; rol 5 calibra el simulador con la §5; rol 6 cita la §5 y la §6.

El mapa de qué dato usa la app, cuál es real y cuál simulado está en
[`data-sources.md`](data-sources.md). Ahí está el CSV público de Inspiration4
(OSD-575) que alimenta la pantalla "Datos reales".

---

## 1. Qué hacer en los primeros 30 minutos

1. Abrir la pestaña **Resources** del reto en `spaceappschallenge.org` (la página no respondió desde esta red; hay que abrirla desde el navegador).
2. Copiar aquí todo lo que nombre: datasets, APIs, papers, y sobre todo si dice **"must use"** o un dataset obligatorio.
3. Si hay un dataset obligatorio, avisar al rol 1: cambia el contrato de la API (§9 de `PROJECT.md`).
4. Marcar con ✅ lo ya verificado y con ⚠️ lo que falte.

---

## 2. Estándares y documentos (fuentes reales, verificadas)

| Documento | Qué nos da | Para qué indicador | Enlace |
|---|---|---|---|
| NASA HRP — los 5 peligros | Marco clínico: radiación, aislamiento, distancia, gravedad, ambiente cerrado | Todos | https://www.nasa.gov/hrp/hazards ✅ |
| OCHMO — resumen de estándares | Límite de carrera 600 mSv, límites de corto plazo, criterios de la tripulación | Radiación | https://www.nasa.gov/sites/default/files/atoms/files/ochmo_standards_overview_sept_15_2021_francisco.pdf ✅ |
| OCHMO — informe técnico de CO₂ | 3 mmHg (1 h), 5,3 mmHg (180 días), relación con cefalea | CO₂ | https://nasa.gov/wp-content/uploads/2023/03/co2-technical-brief-ochmo.pdf ✅ |
| NASA NTRS — Artemis, dosis y límites de corto plazo | 250 mSv para eventos de partículas solares | Radiación | https://ntrs.nasa.gov/api/citations/20250006168/downloads/ASCEND%20Simonsen%20draft%201.pdf ✅ |
| NASA Human Research Roadmap — Evidence Reports | Revisiones por sistema (sueño, hueso, SANS, inmune) con nivel de evidencia | Todos | https://humanresearchroadmap.nasa.gov/ ✅ |
| NASA NTRS (buscador) | Paper original para cualquier cifra dudosa | Todos | https://ntrs.nasa.gov/ ✅ |
| NASA-STD-3001 (vol. 1 y 2) | Estándar formal de factores humanos y salud | CO₂, radiación, ambiente | Buscar "NASA-STD-3001" en NTRS ⚠️ (no fijar URL hasta confirmarla) |

**Cómo buscar en NTRS** (rol 6, 10 minutos por cifra):

- `"CO2" ISS headache crew` → estudio de cefalea y CO₂.
- `sleep ISS actigraphy crew` → horas de sueño medidas en vuelo.
- `SANS OCT astronaut optic disc` → prevalencia del síndrome neuro-ocular.
- `bone loss bed rest 1.5% per month` → pérdida ósea y su modelo.
- `radiation career limit 600 mSv` → justificación del límite.

---

## 3. Cifras clave y de dónde salen

Estas son las que un jurado puede verificar. Si una no tiene fuente, no va al pitch.

| Cifra | Valor | Indicador | Fuente |
|---|---|---|---|
| Dosis en ISS | ~0,5 mSv/día | Radiación | OCHMO / NTRS |
| Límite de carrera | 600 mSv (NASA) · 1.000 mSv (Canadá, Rusia, Europa) | Radiación | OCHMO |
| Límite de evento solar | 250 mSv de corto plazo | Radiación | NTRS (Artemis) |
| Marte sin blindaje extra | ~1.000 mSv | Radiación | OCHMO / NTRS |
| CO₂ promedio 1 h | ≤ 3 mmHg | CO₂ | NASA-STD-3001 / OCHMO |
| CO₂ promedio 7 días | < 2,5 mmHg para cefalea < 1 % | CO₂ | OCHMO |
| CO₂ máximo 180 días | 5,3 mmHg | CO₂ | NASA-STD-3001 |
| Cefalea y CO₂ | cada +1 mmHg duplica las probabilidades de cefalea | CO₂ | Estudio ISS (NTRS) |
| Sueño en vuelo | ~6 h, con 16 amaneceres al día en ISS | Sueño | HRP / NTRS |
| Pérdida ósea | 1–1,5 % por mes | Ejercicio / hueso | HRP / NTRS |
| Ejercicio en ISS | ~2 h/día | Ejercicio | HRP |
| SANS | ~70 % de tripulantes de larga duración con algún signo | Visión | NTRS |
| Glóbulos rojos | +54 % de destrucción en misiones de 6 meses (2022) | Síntomas / sangre | Paper 2022 (Nature) |
| Retraso a Marte | ~20 min por sentido | Distancia | NASA |
| Promedio terrestre | 2–3 mSv/año | Radiación (comparación) | OCHMO |

> El detalle clínico, las acciones y los umbrales de prototipo están en `PROJECT.md` §5 y en `guia-trabajo.md`. Aquí solo van las **fuentes**.

---

## 4. Datasets reales (qué se puede descargar y qué no)

| Fuente | Qué contiene | Acceso | Forma | ¿Nos sirve? |
|---|---|---|---|---|
| [OSDR](https://osdr.nasa.gov/) ✅ | Ómica y biospecímenes (humanos, ratones, plantas), datos post-vuelo | Público; algunos datos humanos requieren acuerdo | Ficheros por estudio, API y descarga masiva | **No** para signos vitales diarios. Sí como cita de "aquí se reentrenaría" |
| [OSDR OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) ✅ | Inspiration4: panel metabólico + citoquinas, 4 tripulantes × 7 extracciones | Público | CSV/JSON | **Sí**, como glucosa real de referencia y calibración |
| [LSDA / NASA Life Sciences Portal](https://lsda.jsc.nasa.gov/) ✅ | Experimentos médicos humanos (sueño, psicología, cardiovascular) | Solicitud, revisión, puede tardar días o semanas | Tablas por experimento | **Referencia**, no viable en 15 h |
| HERA (NASA JSC) | Campañas análogas de 45 días con sueño, ánimo, carga | Vía LSDA / papers | Agregados y papers | Referencia metodológica |
| HI-SEAS (Univ. de Hawái) | Análogos de 4–12 meses, sueño, ánimo, conflicto | Papers y repositorios de autor ⚠️ | Agregados | Referencia cualitativa |
| Mars-500 / SIRIUS (IBMP) | Aislamiento largo, sueño y psicología | Papers ⚠️ | Agregados | Referencia |
| Concordia (ESA) | Aislamiento antártico, salud mental | Papers ⚠️ | Agregados | Referencia |
| [PhysioNet](https://physionet.org/) ✅ | Sleep-EDF (sueño, abierto), WESAD (estrés con wearable), otros | Abierto o con credenciales según el set | Señales y anotaciones | **Sí**, para calibrar ruido y basales |
| NSRR (`sleepdata.org`) ⚠️ | Cohortes de sueño a gran escala | Solicitud | Series | No compensa para 15 h |
| Kaggle ("Sleep Health and Lifestyle", similares) | Sueño, estrés, presión, hábitos | Descarga directa | CSV | **Sí**, para rangos realistas y ruido |
| [OLTARIS](https://oltaris.nasa.gov/) ✅ | Herramienta de transporte de radiación y blindaje | Web, gratis | Salidas de dosis, no series | Referencia para las tasas de dosis |
| Datasets de glucosa (OhioT1DM y similares) | Series de glucosa con diabetes tipo 1 | Solicitud ⚠️ | CSV | No: el prototipo simula rangos sanos |

**Conclusión práctica:** no gastes más de 1 hora en datasets. El único con retorno real es un CSV terrestre de sueño/estrés para que el ruido del simulador no parezca inventado.

---

## 5. APIs en vivo (datos reales, sin pedir permiso)

Sirven para que "la tormenta solar" sea un evento real y no un botón decorativo. Todas devuelven JSON y se probaron el 14 nov 2026.

### 5.1 NASA DONKI — clima espacial (vía api.nasa.gov) ✅

```bash
# Notificaciones de los últimos días (fulguraciones, CME, protones, cinturón de radiación)
curl "https://api.nasa.gov/DONKI/notifications?startDate=2026-11-01&endDate=2026-11-14&api_key=DEMO_KEY"

# Tormentas geomagnéticas
curl "https://api.nasa.gov/DONKI/GST?startDate=2026-11-01&endDate=2026-11-14&api_key=DEMO_KEY"

# Partículas solares energéticas (lo relevante para dosis)
curl "https://api.nasa.gov/DONKI/SEP?startDate=2026-11-01&endDate=2026-11-14&api_key=DEMO_KEY"
```

Tipos de mensaje que devuelve `notifications`: `FLR` (fulguración), `CME`, `GST` (tormenta geomagnética), `SEP` (partículas solares), `RBE` (cinturón de radiación), `HSS` (corriente rápida), `IPS` (choque interplanetario).

Respuesta real (recortada):

```json
[{"messageType":"RBE","messageID":"20261101-AL-001",
  "messageIssueTime":"2026-11-01T13:28Z",
  "messageURL":"https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/49352/1",
  "messageBody":"## ... Space Weather Notification - Radiation Belt Enhancement ..."}]
```

- `DEMO_KEY` limita a ~30 peticiones/hora y ~50/día por IP. Para el demo, pedir una clave gratis en https://api.nasa.gov/ o cachear la respuesta.
- El host directo `kauai.ccmc.gsfc.nasa.gov/DONKI` no respondió desde esta red; usar siempre el de `api.nasa.gov`.

### 5.2 NOAA SWPC — protones y alertas ✅

```bash
# Flujo de protones GOES (>=10 MeV es el que importa para eventos solares)
curl "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json"

# Alertas y avisos operativos en texto
curl "https://services.swpc.noaa.gov/products/alerts.json"

# Índice Kp planetario (tormenta geomagnética)
curl "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"
```

Respuesta real de protones (recortada):

```json
[{"time_tag":"2026-11-13T19:10:00Z","satellite":18,
  "flux":0.22864679992198944,"energy":">=10 MeV"}]
```

**Cómo se usa en Vitalis:** si el flujo de protones ≥10 MeV sube por encima del umbral de evento (p. ej. 10 pfu), el panel de radiación entra en `act` con la explicación "evento de partículas solares en curso" y sugiere refugio. No se convierte a mSv: se usa como **disparador de evento**, y la dosis la sigue simulando el dosímetro.

**Coste:** 30 minutos para el rol 4, después de que el resto esté cerrado. Si no hay tiempo, el botón de tormenta inyecta un evento con esta misma forma de datos.

---

## 6. Cómo calibrar el simulador con estas fuentes

Regla: cada parámetro del simulador debe poder justificarse con una fila de la §3.

| Parámetro del simulador | Valor | Justificado con |
|---|---|---|
| Dosis base ISS | 0,5 mSv/día | §3 |
| Dosis base tránsito a Marte | 1,5–2 mSv/día (escenario agresivo) | §3, marcar como supuesto |
| CO₂ normal de cabina | 1,5–3,0 mmHg con ciclo diario | §3 |
| CO₂ del escenario | 2,8–3,4 mmHg | §3 (vigilar/actuar) |
| Sueño base | 6–7,5 h; en vuelo tiende a 6 h | §3 |
| Pulso base | 50–75 lpm | rango fisiológico |
| Ánimo y estrés | 1–5, base 3–4 / 1,5–3 | escala del prototipo (P) |
| Ruido diario | σ = 8–12 % de la base | PhysioNet / Kaggle |
| Días faltantes | 5–10 % | realismo operativo |

---

## 7. Si hace falta pedir acceso (plantilla)

Solo si el reto exige un dataset concreto. Para LSDA, NSRR u OSDR humano:

> **Asunto:** Data request — Vitalis, NASA Space Apps Challenge
>
> Hola:
> Somos el equipo Vitalis, participantes del NASA Space Apps Challenge. Estamos construyendo una herramienta de autoevaluación de salud para astronautas y buscamos datos **agregados o anonimizados** de [sueño / psicología / cardiovascular] en [ISS / análogos].
>
> Necesitamos: variables, cadencia, número de sujetos y condiciones de uso. No publicaremos datos individuales; solo métricas agregadas y el método.
>
> ¿Nos pueden indicar el procedimiento y los plazos? Gracias.

**Si la respuesta tarda más de un día, se sigue con el simulador.** No se bloquea el proyecto esperando datos.

---

## 8. Citas, licencias y privacidad

- **Contenido de NASA:** dominio público en general; los logotipos e identificaciones no. Citar la fuente, no usar el sello de NASA como si fuera endoso.
- **OSDR / LSDA:** tienen términos propios. No meter datos restringidos en el repo ni en la app.
- **Kaggle / PhysioNet:** licencia por dataset. Revisar antes de commitear un CSV; si es dudosa, no se commitea, se descarga en un script.
- **Privacidad:** aunque los datos sean simulados, la app se comporta como si fueran reales: cada persona ve lo suyo, la vista de tripulación solo muestra semáforos (esto se demuestra en el pitch).
- **Formato de cita** para el README y las diapositivas: `NASA HRP, "5 Hazards of Human Spaceflight", nasa.gov/hrp/hazards (consultado 14 nov 2026)`.

---

## 9. Lo que no vamos a conseguir (y qué responder)

| Lo que pediría un jurado | Realidad | Respuesta |
|---|---|---|
| "Series diarias de un astronauta real" | No públicas: n pequeño, datos médicos protegidos | Se simulan; se declara. La metodología se valida con escenarios |
| "Datos de una misión a Marte" | No existen | Análogos (HERA, HI-SEAS, Mars-500) como referencia |
| "Validación clínica de los umbrales" | Requiere médicos de vuelo y años | Son supuestos de prototipo; solo radiación y CO₂ son estándar |
| "¿Por qué no usan OSDR?" | OSDR es ómica, no signos vitales | Es la fuente para reentrenar a futuro; hoy no aporta al MVP |

---

## 10. Pendientes

- [ ] Copiar aquí el contenido de la pestaña **Resources** del reto (rol 1, H0–1).
- [ ] Revalidar los enlaces ⚠️ (rol 6, H3).
- [ ] Confirmar la URL exacta de NASA-STD-3001 (rol 6).
- [ ] Decidir si entra DONKI/SWPC en el demo o solo el botón de tormenta (rol 1, H6).
- [ ] Añadir la cita de cada cifra usada en el pitch, en el mismo orden de la §3.
