# Vitalis — especificación del MVP

**Estado:** v0.1 · pre-código · 14 nov 2026
**Reto:** NASA Space Apps Challenge — *Create Health Monitoring Software for Astronauts on Space Missions*
**Repo:** `Gravizen` · producto: **Vitalis**
**Equipo:** 6 personas · ventana objetivo: 15 h

> **Este documento es la fuente de verdad.** Si el código no coincide con esto, o se corrige el código o se abre un PR a este documento. Los cambios al contrato de la API (§9) se hacen **solo por PR** y se avisan en el chat del equipo.
>
> La guía larga de salud (`Guía técnica de Vitalis…`) pasa a `docs/guia-trabajo.md` como **referencia**. Este documento manda sobre alcance; la guía manda sobre el *porqué* clínico. Fuentes, datasets y APIs: `docs/recursos.md`.

**TL;DR**

1. No construimos un sistema de predicción. Construimos un **instrumento de autoevaluación**: un mapa del cuerpo clicable, alimentado por un check-in de 60 segundos, que convierte cada indicador en un color, una explicación en lenguaje claro y una primera acción.
2. Los datos de la tripulación son **simulados** y lo declaramos. Los umbrales y el contexto (radiación, CO₂) salen de fuentes reales de NASA.
3. El MVP se juzga con un guion de demo de 90 segundos (§3.2). Todo lo que no aparezca ahí, se corta.

---

## 1. Qué es Vitalis

Vitalis es una aplicación web instalable donde un astronauta, en una misión larga:

1. **Registra** sus indicadores una vez al día (check-in corto) y, si tiene el equipo, presión, temperatura y glucosa.
2. **Ve** un cuerpo humano con zonas coloreadas: verde, amarillo, naranja, rojo.
3. **Entiende** por qué una zona está mal, con el dato real y la tendencia ("Sueño: 5,1 h contra 7,0 h de tu base, 4 noches seguidas").
4. **Actúa** con una primera acción que puede hacer solo, a bordo, sin esperar a Tierra.
5. **Escala** al médico de vuelo cuando corresponde, sabiendo que la respuesta tardará.

Vitalis **no diagnostica**. Detecta desviaciones respecto a la línea base de esa persona, las explica y sugiere el siguiente paso. Quien diagnostica es el médico de vuelo.

---

## 2. El reto

### 2.1 Lo que pide la página

- **Producto:** software de monitoreo de salud para astronautas en misiones espaciales largas.
- **Problema:** radiación, aislamiento y confinamiento, gravedad alterada y ambiente cerrado producen cambios inmunes, pérdida ósea, eventos cardiovasculares y problemas de salud conductual. En misiones largas, el astronauta debe detectarlos **en sí mismo**.
- **Objetivo:** herramienta **visual** que ayude al astronauta a evaluar su salud y le dé **guía sobre tratamientos y mejoras**.
- **Entrada:** cualquier método (teclado, clics, cámara). Cualquier indicador vale, siempre que represente salud (glucosa en mg/dL, imágenes de ultrasonido…).
- **Indicadores sugeridos:** presión arterial, frecuencia cardiaca, glucosa, temperatura corporal, horas de sueño, ánimo.
- **UI:** debe pesar mucho. Se sugiere figura humana clicable, animaciones, interactividad, gráficas dinámicas y código de color.
- **No asumir conocimiento:** el astronauta no es médico; la herramienta debe explicar qué es cada medida, cómo tomarla y qué significa un resultado.
- **Extras opcionales:** gamificación, recordatorios de medición, distintos entornos (nave, estación, rover, base lunar/marciana).
- **Recursos:** pestaña *Resources* del reto (pendiente de revisar, ver §14).

### 2.2 Qué va a mirar el jurado (lectura nuestra)

| Señal | Cómo la cubrimos |
|---|---|
| ¿Es visual y usable? | Mapa del cuerpo como pantalla principal + colores + gráficas |
| ¿Sirve para autoevaluarse? | Niveles claros, explicación con el dato real, sin jerga |
| ¿Da guía accionable? | Cada tarjeta termina en una acción concreta y a quién escalar |
| ¿Usa indicadores reales de salud? | 8 indicadores + síntomas, con unidades y rangos reales |
| ¿Entiende el contexto espacial? | Los 5 peligros de NASA HRP + retraso de comunicación + perfiles de misión |
| ¿Explica sin asumir conocimiento? | Bloque "qué es / cómo se mide / qué significa" en cada indicador |
| ¿Usó recursos de NASA? | Umbrales y peligros citados; datos simulados declarados |

**Lo que NO pide:** un modelo de machine learning. La guía vieja empujaba Isolation Forest y proyección; eso es diferenciador, no requisito, y va al final de la lista (§3.3).

---

## 3. El MVP

### 3.1 Definición

Un dashboard de una sola tripulación simulada (4 personas, 120 días de misión), con:

- Mapa del cuerpo con 6 zonas coloreadas.
- Check-in diario de ≤60 s.
- Tarjeta por indicador: valor, línea base, tendencia, nivel, por qué, acción, cómo medirlo.
- Panel de misión: radiación acumulada, CO₂, retraso de comunicación, perfil de entorno.
- Vista de tripulación: solo semáforo (privacidad), sin datos clínicos detallados.
- Botón "reportar al médico de vuelo" con estado (en tránsito → recibido → respondido).

### 3.2 Guion de demo (90 segundos)

> **Día 118 de 120, perfil Marte.**
> Abrimos a la tripulante **Nova**. El mapa la muestra en naranja: cabeza y pecho.
> Toca la cabeza → *Sueño 5,1 h contra 7,0 h de base, 4 noches seguidas; ánimo 2/5, 3 días. Nivel: actuar. Acción: revisar luz y horario, sin cafeína, avisar al médico de vuelo si sigue una semana.*
> Toca el pecho → *Pulso en reposo 78 contra 62 (+26 %), 4 días. Podría ser desentrenamiento o estrés.*
> El panel de misión cruza las tres señales → **peligro "aislamiento y confinamiento": actuar**. Explicación: "sueño, ánimo y estrés empeorando juntos desde el día 108".
> Reportar a Tierra → estado **en tránsito** (20 min). Cambiamos el perfil a **Estación** y el retraso desaparece. Volvemos a Marte.
> Abrimos el check-in: 40 segundos, incluye síntomas. Guardamos. El color se actualiza.
> Vista de tripulación: Nova naranja, Iker amarillo, Aya verde, Sol naranja. Solo semáforos.
> Cierre: *"Vitalis no diagnostica: le dice al astronauta qué cambió, por qué importa y qué hacer mientras la ayuda llega."*

### 3.3 Fuera del MVP (decisión explícita)

| Se corta | Por qué | Si sobra tiempo |
|---|---|---|
| Isolation Forest | No es requisito; el valor está en reglas explicables | Se añade como puntaje de convergencia (§7.4) |
| Proyección "cruzarás el umbral en 6 días" | Bonita, no pedida | Regresión de 14 días (§7.4) |
| PWA offline con IndexedDB | Caro y no se ve en el demo | `localStorage` + manifest instalable |
| Reportes con ciclo completo real | El botón con estados ya comunica la idea | Temporizador real de 20 min / ×60 |
| Inyección de tormenta solar / DONKI | Escenario secundario | Llamada real a DONKI (§6.1) |
| Clasificador de causa (Random Forest) | Puro extra | No |
| Cámara / ultrasonido | Alta incertidumbre técnica | Foto del dispositivo → entrada manual |
| Gamificación completa | Un contador de racha basta | Insignias por día de misión |
| Autenticación, multiusuario real | Nadie la va a probar | No |

---

## 4. Principios de diseño

1. **Apoyo a la decisión, no diagnóstico.** Copia siempre en condicional: "podría", "considera", "avisa". Nunca "tienes X".
2. **La tendencia pesa más que el valor.** Un mal día es normal; cuatro noches seguidas, no. Por eso la base es personal (mediana + MAD) y no un promedio poblacional.
3. **La convergencia pesa más que una señal sola.** Tres indicadores moviéndose un poco valen más que uno muy alto.
4. **Dos tipos de umbral, nunca mezclados.** Relativos (sueño, pulso, ánimo, estrés, ejercicio, glucosa, presión) contra la base personal. Absolutos (radiación, CO₂, temperatura, síntomas de alarma) contra un estándar.
5. **Con retraso de comunicación, la autonomía manda.** Cada alerta trae una acción que la tripulación puede ejecutar sola; el reporte a Tierra va en paralelo.
6. **La salud mental es un peligro, no un extra.** La pregunta de daño autoinfligido siempre deriva en mensaje de apoyo + emergencia, nunca en un número en una gráfica.
7. **No inventar datos.** Los días faltantes se muestran como huecos; nunca se interpola para "que se vea bonito".
8. **El color no va solo.** Siempre color + icono + palabra (daltonismo, contraste).

---

## 5. Indicadores y umbrales

### 5.1 Tabla maestra

`rel` = relativo a la línea base personal · `abs` = límite absoluto · **(N)** = estándar NASA · **(P)** = propuesta del equipo, declararla como supuesto.

| id | Indicador | Unidad | Rango válido | Frecuencia | Tipo | Vigilar | Actuar | Emergencia |
|---|---|---|---|---|---|---|---|---|
| `sleep_h` | Sueño | h | 3–12 | diario | rel | promedio 3 noches < base −1 h, o < 6 h | 3 noches seguidas < 5 h, o 5 noches > 2 h bajo base | — |
| `hr_rest` | Pulso en reposo | lpm | 35–200 | diario | rel | +8 a 10 % sobre base, 3 días | +15 a 20 % sostenido, o > 100 | dolor torácico, síncope (síntoma) |
| `bp_sys` / `bp_dia` | Presión arterial | mmHg | 70–250 / 40–150 | 2–3 / semana | rel + abs (P) | ≥ 130 / 85 sostenida | ≥ 140 / 90, o cefalea/visión | ≥ 180 / 120, o dolor torácico |
| `temp_c` | Temperatura | °C | 34–42 | diario | abs (P) | ≥ 37,5 | ≥ 38,0 | ≥ 39,5 con confusión |
| `glucose_mgdl` | Glucosa | mg/dL | 40–500 | 2–3 / semana | rel + abs (P) | en ayunas > 110 o < 70 | > 140 en ayunas o < 60 | > 250 o < 50 con síntomas |
| `mood` | Ánimo | 1–5 | 1–5 | diario | rel | 3 días ≥ 1 punto bajo base | 5 días, caída brusca, o aislamiento/pérdida de interés/conflicto | ideación de daño (síntoma) |
| `stress` | Estrés | 1–5 | 1–5 | diario | rel | 3 días ≥ 1 punto sobre base | 5 días, o junto a sueño bajo y pulso alto | — |
| `exercise_min` | Ejercicio | min/día | 0–240 | diario | rel | < 75 % del plan semanal, o 2 días sin entrenar | < 50 %, o ≥ 3 días sin entrenar, o dolor que impide | — |
| `rad_dose_msv` | Radiación | mSv/día y acumulada | 0–50 | diario | abs **(N)** | 2× la base de cabina; 50 % de 600 mSv de carrera | 5× la base, alerta de tormenta, o 75 % de carrera | evento cerca de 250 mSv |
| `co2_mmhg` | CO₂ en cabina | mmHg (1 h / 24 h / 7 d) | 0,5–10 | continuo | abs **(N)** | 2,5–3,0 (7 d) o cefalea nueva | ≥ 3,0 (1 h) o síntomas claros | ≥ 5,3 o confusión/disnea |
| `symptoms[]` | Síntomas | lista | — | diario | abs | mareo al levantarse; náuseas > 1.ª semana | visión borrosa; fiebre; dolor óseo persistente | ideación de daño |

**Síntomas del check-in** (checkboxes, siempre visibles):

| id | Texto | Regla |
|---|---|---|
| `headache` | Dolor de cabeza nuevo o persistente | sube sospecha de CO₂; > 3 días → actuar |
| `vision_change` | Visión borrosa o cambio al leer de cerca | **actuar siempre**, pedir examen ocular |
| `dizziness` | Mareo al ponerse de pie | vigilar; hidratación + registrar presión |
| `nausea` | Náuseas o desorientación | vigilar; si pasa de la 1.ª semana → actuar |
| `back_pain` | Dolor de espalda, cadera o huesos | cruzar con ejercicio; persistente → médico |
| `fever` | Fiebre, tos, malestar | actuar; aislar y consultar |
| `self_harm` | Pensamientos de hacerse daño | **emergencia inmediata**, mensaje de apoyo, sin esperar tendencia |

> Las cifras (N) están en `docs/guia-trabajo.md` y `docs/recursos.md` con sus fuentes. Las (P) son supuestos de prototipo y el jurado debe oírlo así.

### 5.2 Dónde se mide cada cosa

| Indicador | En el prototipo | En la vida real |
|---|---|---|
| Sueño | Slider de horas + calidad | Actigrafía de muñeca, diario de sueño |
| Pulso | Campo numérico | Sensor de pecho/muñeca, ECG |
| Presión | Campos sistólica/diastólica | Esfigmomanómetro de a bordo |
| Temperatura | Campo numérico | Termómetro timpánico/axilar |
| Glucosa | Campo numérico | Glucómetro, tiras reactivas |
| Ánimo / estrés | Escala 1–5 | Cuestionario corto diario, conferencia psicológica |
| Ejercicio | Minutos + tipo | Registro del equipo de resistencia/bici |
| Radiación | Lectura simulada del dosímetro | Dosímetros personal y de cabina |
| CO₂ | Lectura simulada de cabina | Sensores de atmósfera, varios puntos |
| Síntomas | Checkboxes + nota libre | Observación clínica, cuestionarios validados |

### 5.3 Mapa del cuerpo

Zona = peor nivel entre sus indicadores (se calcula en el frontend, sin lógica de API).

| Zona | Indicadores |
|---|---|
| Cabeza | `sleep_h`, `mood`, `stress`, `headache` |
| Ojos | `vision_change` |
| Pecho | `hr_rest`, `bp_sys`/`bp_dia`, `temp_c`, `fever` |
| Abdomen | `glucose_mgdl`, `nausea` |
| Espalda / cadera | `back_pain`, `exercise_min` |
| Piernas | `exercise_min` |
| Panel de entorno (fuera del cuerpo) | `rad_dose_msv`, `co2_mmhg` |

La zona "Cabeza" agrupa ánimo, sueño y estrés a propósito: es la lectura del peligro *aislamiento*, y es el caso estrella del demo.

---

## 6. Datos

### 6.1 Qué existe de verdad

| Fuente | Qué tiene | ¿Nos sirve? |
|---|---|---|
| [NASA HRP — 5 hazards](https://www.nasa.gov/hrp/hazards) | Marco de los 5 peligros, efectos en el cuerpo | **Sí, es la columna del producto** |
| NASA OCHMO / NASA-STD-3001 | Límites de radiación (600 mSv carrera) y CO₂ (3 mmHg 1 h) | **Sí, da autoridad a los umbrales** |
| [NASA NTRS](https://ntrs.nasa.gov) | Informes técnicos de CO₂, sueño, SANS | Sí, citas para el pitch |
| [OSDR](https://osdr.nasa.gov) | Datos biológicos/ómicos post-vuelo, públicos | No: no hay series diarias de signos vitales |
| LSDA / NASA Life Sciences Portal | Experimentos médicos humanos | No: acceso por solicitud, lento, n pequeño |
| [NASA DONKI](https://kauai.ccmc.gsfc.nasa.gov/DONKI/) | Clima espacial: fulguraciones, CME | **Sí, si sobra tiempo** para la tormenta |
| Análogos (HI-SEAS, Mars-500/SIRIUS, HERA) | Sueño, ánimo, estrés diarios | Solo como referencia metodológica |
| Datasets terrestres de sueño/wearables | Ruido y basales realistas | Sí, para calibrar el simulador |

**Pestaña *Resources* del reto:** pendiente de revisar. Si nombra un dataset obligatorio, esta sección y §9 cambian (ver §14).

> Catálogo completo de fuentes, datasets, APIs en vivo y cifras con enlace: [`docs/recursos.md`](recursos.md).

### 6.2 Decisión: simulamos (y lo declaramos)

No existe un dataset público de signos vitales diarios de astronautas: son ~decenas de personas, con datos médicos protegidos, y las agencias publican agregados. NASA misma usa análogos y modelos por esa razón. Por tanto:

- **Fisiología:** simulada, con base por persona, ruido, días faltantes y eventos.
- **Umbrales y peligros:** reales, citados.
- **Contexto espacial:** real en las cifras (0,5 mSv/día en ISS, 20 min de retraso a Marte).
- **Declaración obligatoria** en el README, en la app (un "acerca de") y en las diapositivas.

Frase para el jurado: *"La fisiología es simulada porque esos datos no son públicos; el marco clínico y los límites son de NASA. El método se evalúa con retraso de detección y falsas alarmas, no con eficacia clínica."*

### 6.3 Especificación del simulador

Todo en `ml/`, determinista (semilla fija) para que el demo no cambie entre corridas.

| Parámetro | Valor |
|---|---|
| Tripulación | 4 personas: Nova, Iker, Aya, Sol |
| Misión | 120 días, día 0 = lanzamiento |
| Base por persona | Pulso 50–75 lpm, sueño 6–7,5 h, ánimo 3–4, estrés 1,5–3, glucosa 85–100, presión 110–125 / 70–80, temperatura 36,4–36,8 |
| Ruido | gaussiano, σ = 8–12 % de la base, por indicador |
| Días faltantes | 5–10 % al azar, nunca rellenados |
| Adaptación | días 0–14: sueño −0,8 h, cefalea y náuseas ocasionales (no cuentan como alarma) |
| Cabina | CO₂ 1,5–3,0 mmHg con ciclo diario; radiación 0,5 mSv/día |
| Perfiles | Estación (LEO) · Luna · Tránsito a Marte — cambian base de radiación y retraso de comunicación |

**Escenarios** (cada tripulante tiene uno; se guarda `event_start_day` para medir):

| Persona | Escenario | Inicio | Duración | Efecto esperado |
|---|---|---|---|---|
| Nova | Aislamiento y confinamiento | día 96 | 30 d | ánimo ↓ gradual, sueño ↓, estrés ↑, menos contacto |
| Iker | Pérdida de condición física | día 60 | 45 d | ejercicio ↓, pulso ↑ con los días, algo de dolor de espalda |
| Aya | Control sano | — | — | todo dentro de rango |
| Sol | CO₂ alto + cefalea | día 80 | 10 d | CO₂ 2,8–3,4, cefalea 3 días, sueño ↓, concentración ↓ |

Tormenta solar: opcional, día 96, salto de dosis de 1–2 días y después peor sueño/estrés con 1 día de retraso.

**Reglas de realismo que no se negocian:** base por persona, ruido, huecos, eventos graduales (no escalones), y un periodo de adaptación explícito.

---

## 7. Motor de evaluación

### 7.1 Pipeline (por indicador y por día)

1. **Limpiar:** fuera de rango → descartar y marcar; día sin dato → hueco.
2. **Línea base:** mediana y MAD de los primeros 14 días (`mad_sigma = 1,4826 · MAD`).
3. **z-score robusto:** `z = 0,6745 · (x − mediana) / MAD`.
4. **Límites absolutos:** si el indicador los tiene (radiación, CO₂, temperatura), comparar aparte.
5. **Tendencia:** EWMA con λ = 0,2 y límite 3σ (`σ_ewma = σ · √(λ/(2−λ))`); CUSUM con k = 0,5σ y h = 4σ.
6. **Reglas por indicador** (§7.3) → nivel.
7. **Convergencia** por peligro (§7.4).
8. **Explicar:** plantilla con cifras reales.
9. **Acción:** tabla indicador × nivel (§7.5).

### 7.2 Niveles

| Nivel | Semáforo | Significado | Acción de la tripulación | A Tierra |
|---|---|---|---|---|
| `normal` | verde | Dentro de base y límites | Rutina + check-in | Resumen periódico |
| `watch` | amarillo | Desviación pequeña o sostenida | Revisar causa, ajustar, re-medir en 24–48 h | Nota en el próximo reporte |
| `act` | naranja | Desviación fuerte, varias señales o límite cruzado | Acción del indicador, reducir carga, registrar lo hecho | Reporte prioritario + consulta |
| `emergency` | rojo | Riesgo inmediato | Acción de seguridad ya (refugio, módulo, atención) | Reporte urgente, sin esperar ventana |

### 7.3 Reglas (resumen implementable)

Las de §5.1, evaluadas en este orden: **emergencia → absoluto → relativo → tendencia**. Un nivel superior nunca baja por una regla inferior; solo el paso del tiempo y la mejoría lo bajan.

### 7.4 Convergencia y proyección

- **Convergencia:** si ≥ 2 indicadores del mismo peligro están en `watch` o más, el peligro sube un nivel (máx. `act`; `emergency` solo por regla absoluta).
- **Peligros y sus indicadores:** `rad` ← radiación, sueño, estrés · `iso` ← ánimo, estrés, sueño, síntomas · `grav` ← ejercicio, pulso, dolor · `env` ← CO₂, cefalea, sueño · `dist` ← contexto (retraso, reportes), sin fisiología.
- **Proyección (opcional):** regresión lineal sobre los últimos 14 días; `días_al_umbral = (umbral − actual) / pendiente` si la pendiente va hacia el umbral; si no, `null`. Techo 30 días.

### 7.5 Texto y acciones

- Formato: `"<Indicador>: <valor> contra <base> de tu línea base, <duración>"`. Ejemplo: *"Sueño: 5,1 h contra 7,0 h de tu base, 4 noches seguidas."*
- Cada indicador y nivel tiene una acción fija en `ml/content.py` (una sola fuente, la usa el backend y el frontend). Rol 6 escribe el texto; rol 5 lo conecta.
- La acción nunca es "consulta a tu médico" a secas: siempre hay algo que hacer a bordo **antes**.

---

## 8. UI

### 8.1 Pantallas

| # | Pantalla | Contenido | Prioridad |
|---|---|---|---|
| 1 | **Mapa** (inicio) | Silueta SVG, 6 zonas coloreadas, día de misión, selector de tripulante, perfil de entorno | P0 |
| 2 | **Detalle de indicador** | Valor, banda de base, sparkline, nivel, por qué, acción, "cómo se mide" | P0 |
| 3 | **Check-in** | Sueño, ánimo, estrés, síntomas, opcionales (presión, temp, glucosa), nota | P0 |
| 4 | **Panel de misión** | Radiación acumulada (medidor), CO₂ 7 d, retraso de comunicación, botón reportar | P0 |
| 5 | **Tripulación** | Solo nombre + semáforo (privacidad) | P1 |
| 6 | **Historia** | Gráfica de un indicador en 30 días | P1 |
| 7 | **Ayuda / acerca de** | Qué es Vitalis, datos simulados, límites | P1 |

### 8.2 Reglas visuales

- **Silueta plana con 6 zonas**, no modelo 3D ni anatomía detallada. Animación = pulso suave en zona `act`/`emergency`, nada más.
- Color + icono + texto siempre juntos. Paleta accesible (verde/ámbar/naranja/rojo con contraste AA).
- Funciona a **400 px** de ancho (celular) y en escritorio; modo oscuro desde el inicio.
- Áreas táctiles ≥ 44 px; foco de teclado visible; la app se opera con una mano.
- Gráficas: Recharts, una serie por indicador, banda de base sombreada, huecos visibles.
- Estados vacíos y de error explícitos ("sin datos del día 12").

### 8.3 Copy

- Español, frases cortas, sin jerga. El astronauta no es médico.
- Verbos de acción, no de diagnóstico: "revisa", "ajusta", "avisa", "re-mide".
- `self_harm` nunca se muestra como gráfica: mensaje de apoyo + botón de emergencia + reporte marcado urgente.

---

## 9. API

### 9.1 Convenciones

- Base: `/api`. JSON en `snake_case`. Fechas = **día de misión entero** (`day`), no fechas reales.
- Niveles: `normal | watch | act | emergency` (en UI se traducen).
- Errores: `{"detail": "mensaje"}` (formato FastAPI).
- **Idempotencia:** un check-in es único por `(crew_id, day)`; reenviarlo actualiza, no duplica. `201` al crear, `200` al actualizar.
- CORS abierto en desarrollo; restringido al dominio del frontend en producción.
- Reloj real **solo** para el tránsito de reportes; el resto es día de misión.

### 9.2 Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/health` | Liveness |
| GET | `/api/crew` | Tripulación: `id, name, role, level` (sin datos clínicos) |
| GET | `/api/crew/{id}/series?end_day=118&days=30` | Serie + línea base de todos los indicadores |
| GET | `/api/crew/{id}/status?day=118` | Nivel por indicador y por peligro, explicación, acción, proyección |
| POST | `/api/crew/{id}/checkins` | Crea/actualiza check-in del día; devuelve `status` actualizado |
| POST | `/api/crew/{id}/reports` | Reporte al médico de vuelo |
| GET | `/api/reports?crew_id=` | Reportes con estado de tránsito |
| GET | `/api/profiles` | Perfiles de misión y sus parámetros |
| POST | `/api/sim/storm` | *(opcional)* Inyecta tormenta solar para el demo |

### 9.3 Formas

`GET /api/crew`
```json
[{"id":"c1","name":"Nova","role":"comandante","level":"act","mission_day":118}]
```

`GET /api/crew/c1/status?day=118`
```json
{
  "crew_id":"c1","day":118,"profile":"mars_transit",
  "indicators":[
    {"id":"sleep_h","value":5.1,"baseline":7.0,"level":"act","z":-2.4,
     "why":["Sueño: 5,1 h contra 7,0 h de tu base, 4 noches seguidas"],
     "action":"Revisa luz y horario; sin cafeína después de las 14:00.",
     "escalate":"flight_surgeon","days_to_threshold":null},
    {"id":"hr_rest","value":78,"baseline":62,"level":"act","z":2.1,
     "why":["Pulso en reposo: 78 lpm contra 62 lpm, 4 días"],
     "action":"Confirma la medición en las mismas condiciones y revisa hidratación y sueño.",
     "escalate":"crew","days_to_threshold":null}
  ],
  "hazards":[
    {"id":"iso","level":"act","anomaly":0.91,
     "why":["Sueño, ánimo y estrés empeorando juntos desde el día 108"],
     "days_to_threshold":6}
  ]
}
```

`GET /api/crew/c1/series?end_day=118&days=30`
```json
{
  "crew_id":"c1","baseline_end_day":14,
  "days":[89,90,91],
  "series":{"sleep_h":[6.8,6.5,6.1],"hr_rest":[61,63,64],"mood":[3,3,2]},
  "baseline":{"sleep_h":{"median":7.0,"mad":0.35},"hr_rest":{"median":62,"mad":2.0}}
}
```

`POST /api/crew/c1/checkins`
```json
{
  "day":118,"sleep_h":5.1,"mood":2,"stress":4,
  "bp_sys":128,"bp_dia":84,"temp_c":36.8,"glucose_mgdl":98,
  "symptoms":["headache"],"note":"dolor de cabeza desde ayer",
  "client_id":"2f1c..."
}
```
Respuesta: el objeto de `status` completo del día.

`POST /api/crew/c1/reports`
```json
{"day":118,"level":"act","hazard":"iso","message":"Sueño y ánimo bajos, 4 días. ¿Ajustamos carga?"}
```
Respuesta:
```json
{"id":"r_7","crew_id":"c1","day":118,"level":"act","status":"transit",
 "created_at":"2026-11-14T18:02:00Z","eta_minutes":20}
```

### 9.4 Reportes y retraso

- `status`: `transit` → `received` (a los `eta_minutes`) → `responded` (manual o +5 min).
- Retraso por perfil: Estación 0 min · Luna 3 min · Marte 20 min.
- Modo demo ×60: dividir `eta_minutes` entre 60.
- Si un reporte `act`/`emergency` sigue en `transit` más de lo esperado, el panel lo recuerda. **La acción local no espera.**

---

## 10. Repositorio, arquitectura y flujo

### 10.1 Layout

```
Gravizen/
├── docs/
│   ├── PROJECT.md        ← este documento
│   ├── api.md            ← contrato extraído (se mantiene sincronizado)
│   ├── recursos.md       ← de dónde sale cada dato, dataset y cifra
│   └── guia-trabajo.md   ← guía clínica original
├── fixtures/             ← JSON de ejemplo que desbloquean FE y BE
├── frontend/             ← Vite + React + TS + Tailwind + Recharts
├── backend/              ← FastAPI + SQLAlchemy + SQLite
├── ml/                   ← simulador, reglas, contenido, evaluación
└── .github/workflows/ci.yml
```

### 10.2 Stack y dependencias

- **Frontend:** Vite, React 18, TypeScript, Tailwind, Recharts. `idb` solo si role 3 tiene tiempo.
- **Backend:** FastAPI, Pydantic v2, SQLAlchemy 2, Uvicorn, SQLite (archivo local, **no** se commitea).
- **ML:** pandas, numpy, scikit-learn (solo si se usa IF), joblib.
- **Instalación local del paquete:** `pip install -e ml` (el backend lo importa como `ml`).
- Nada de Docker, Alembic, auth ni Redis. Base creada y sembrada al arrancar con semilla fija.

### 10.3 Git

- `main` protegida. Tras el bootstrap, **nadie empuja directo**.
- Ramas: `feat/<rol>-<tema>` (ej. `feat/fe-body-map`, `feat/be-checkins`, `feat/ml-engine`), `fix/...`, `docs/...`.
- PR pequeño (< 250 líneas), 1 revisión, squash merge, borrar rama al mergear.
- Rebase sobre `main` cada mañana y antes de abrir PR. `npm ci`, no `npm install`.
- `CODEOWNERS`: cada carpeta con su dueño. **Nadie escribe fuera de su carpeta** salvo `fixtures/` y `docs/` vía PR.
- Cambios de contrato: PR a `docs/api.md` + aviso en el chat. Nada más se toca ese archivo.
- `lockfiles`: dueño único por app (frontend: rol 2; backend: rol 4).

### 10.4 CI y despliegue

- CI en cada PR: `pytest` (backend, smoke) + `tsc --noEmit` y `npm run build` (frontend). Un solo workflow.
- **Desplegar temprano:** backend "hola mundo" en Render/Railway y frontend en Vercel/Netlify antes de la hora 3. Los problemas de deploy no se descubren a la hora 13.
- URLs en el README desde el primer deploy.
- `/docs` de FastAPI debe listar todas las rutas al final.

---

## 11. TAREAS

### 11.0 Hitos compartidos

| Hora | Hito | Criterio |
|---|---|---|
| H0–1 | Bootstrap + contrato congelado + roles asignados | `main` protegida, carpetas creadas, §9 acordado |
| H1–3 | Cada rol con algo visible | FE con mapa y datos falsos · BE devolviendo fixtures · `ml/` generando datos · copy v1 |
| H3–6 | Flujo de punta a punta | Check-in → API → motor → color en pantalla |
| H6–9 | **Congelar alcance** | Nada nuevo después de H9; solo correcciones |
| H9–12 | Pulido, tests, deploy final, diapositivas | Demo corre en incógnito |
| H12–14,5 | Video, ensayo, envío | Enlaces públicos verificados |
| H14,5–15 | Enviar | Formulario completo |

**Regla de oro:** si a la hora 9 el flujo de punta a punta no funciona, se usa el fallback (§12) y se sigue.

### 11.1 Rol 1 — Líder e integración (tú + yo)

| Hora | Tarea | Hecho cuando |
|---|---|---|
| 0–1 | Crear carpetas, `.gitignore`, `CODEOWNERS`, PR template, proteger `main`, asignar roles en el README | Cualquiera puede abrir su rama sin preguntar |
| 0–1 | Extraer `docs/api.md` de §9 y congelarlo; publicar `fixtures/` (4 tripulantes, 120 días, escenarios de §6.3) | FE y BE pueden trabajar sin esperarse |
| 1–3 | Deploy "hola mundo" de FE y BE; URLs en README | Ambas URLs abren |
| 1–9 | Revisar PRs cada 30–45 min, destrabar, mantener el tablero | Ningún PR > 30 min sin revisión |
| 3, 6, 9 | Checkpoints de integración; a H9 congelar alcance | Flujo completo probado en la URL pública |
| 9–12 | README final (qué es, cómo correr, arquitectura, datos simulados, límites) | Un desconocido lo levanta siguiendo el README |
| 12–14,5 | Verificar en incógnito, móvil, y con el jurado delante | Cero pasos manuales ocultos |
| 14,5–15 | Enviar formulario | Confirmación a la vista |

### 11.2 Rol 2 — Frontend A: mapa y dashboard

| Hora | Tarea | Hecho cuando |
|---|---|---|
| 0–1 | Scaffold Vite+TS+Tailwind+Recharts; tipos de §9 en `src/types.ts`; adaptador `src/api/mock.ts` leyendo `fixtures/` | `npm run dev` pinta una tarjeta con datos falsos |
| 1–4 | Silueta SVG con 6 zonas, colores, icono+texto, pulsación en `act` | Cambiar un valor en el mock cambia el color |
| 3–6 | Tarjeta de indicador (valor, base, sparkline, por qué, acción, "cómo se mide") + selector de tripulante y día | Se navega de zona a tarjeta sin recargar |
| 6–8 | Conectar `status` y `series` reales; gráfica de 30 días; banda de base | Funciona con el backend desplegado |
| 8–10 | Panel de misión (radiación, CO₂, retraso, reportar) y vista de tripulación | Reporte cambia de estado en pantalla |
| 10–12 | Responsive 400 px, modo oscuro, foco de teclado, contraste | Pasa revisión visual en celular |

### 11.3 Rol 3 — Frontend B: check-in, offline y contenido

| Hora | Tarea | Hecho cuando |
|---|---|---|
| 0–3 | Formulario de check-in completo (§5.1), validación, `self_harm` con flujo de apoyo + emergencia | Se puede completar en < 60 s y no deja guardar basura |
| 3–6 | Persistencia (`localStorage` primero; IndexedDB si hay tiempo) y envío a la API; reintento al reconectar | Apagar red, hacer check-in, reconectar → llega |
| 3–6 | Pantalla de ayuda/acerca de con el texto del rol 6 | Explica datos simulados y límites |
| 6–9 | Manifest e instalación (PWA) y modo demo ×60 del retraso | Se instala en el celular |
| 9–12 | Accesibilidad del formulario y estados vacíos/error | Navegable solo con teclado |

### 11.4 Rol 4 — Backend

| Hora | Tarea | Hecho cuando |
|---|---|---|
| 0–2 | FastAPI + CORS + rutas devolviendo `fixtures/` | `/docs` abre y el FE puede conectar hoy |
| 2–5 | SQLAlchemy: crew, measurements, checkins, reports; siembra desde `ml/` con semilla fija | Reiniciar no duplica ni pierde datos |
| 5–6 | Conectar el motor de `ml/` a `status` y `series` | El color cambia cuando cambian los datos |
| 6–8 | Check-in idempotente por `(crew_id, day)`, reportes con tránsito, perfiles | Reenviar el mismo check-in no duplica |
| 5–9 | Deploy con variables de entorno y HTTPS | URL pública responde |
| 9–12 | pytest de rutas principales y del upsert | CI verde |

### 11.5 Rol 5 — Datos y motor

| Hora | Tarea | Hecho cuando |
|---|---|---|
| 0–3 | Simulador de §6.3 (base por persona, ruido, huecos, adaptación, escenarios con inicio/duración/intensidad, `event_start_day`) | Genera los 4 tripulantes × 120 días, determinista |
| 3–5 | Base mediana+MAD, z, EWMA, CUSUM y reglas de §5.1 → nivel + `why` | Nova en el día 118 da `act` en sueño y ánimo |
| 5–6 | Acciones y textos desde `content.py`; niveles por peligro + convergencia | Cada nivel tiene acción y escalado |
| 6–8 | Proyección (§7.4) *(si va)* | Devuelve `null` cuando no hay tendencia |
| 8–10 | Evaluación: retraso de detección, falsas alarmas por 100 días-persona, eventos detectados | Tabla de resultados en `docs/` |
| 10–12 | Isolation Forest *(solo si todo lo anterior está cerrado)* | No bloquea nada si no se hace |

### 11.6 Rol 6 — Salud, contenido y pitch

| Hora | Tarea | Hecho cuando |
|---|---|---|
| 0–3 | Verificar cifras contra fuentes NASA (radiación, CO₂, hueso, sueño) y marcar qué es estándar y qué es propuesta | Lista de "estándar vs supuesto" |
| 1–4 | Escribir el copy de cada indicador: qué es, cómo se mide, qué significa, qué hacer (formato `content.py`/JSON) | Rol 5 y rol 2 lo importan sin reescribir |
| 3–6 | Resumen del proyecto, declaración de datos simulados, herramientas | Texto listo para el formulario |
| 6–9 | Diapositivas: problema, solución, demo, cómo funciona, resultados, siguientes pasos | 8–10 diapositivas, sin párrafos |
| 9–12 | Guion del video 2–3 min y grabación de pantalla | Video exportado y revisado |
| 12–14,5 | Ensayo con cronómetro + preguntas del jurado (§13) | Demo de 90 s sin tropiezos |

**Si faltan personas:** rol 3 se fusiona con 2, rol 6 con 1, y se corta §3.3 entero.

### 11.7 Checklist de MVP terminado

- [ ] Se abre en incógnito en la URL pública y en un celular de 400 px.
- [ ] El mapa muestra 6 zonas con color, icono y texto; una zona cambia de color al cambiar un dato.
- [ ] Check-in completo en < 60 s; guarda; el estado se actualiza.
- [ ] Reenviar el mismo check-in no duplica el día.
- [ ] Cada tarjeta tiene: valor, base, tendencia, por qué, acción y "cómo se mide".
- [ ] `self_harm` muestra apoyo + emergencia, nunca una gráfica.
- [ ] Los 5 peligros aparecen con nivel; al menos uno sube por convergencia.
- [ ] Reporte cambia `transit → received → responded`; el retraso depende del perfil.
- [ ] Vista de tripulación solo muestra semáforos.
- [ ] "Acerca de" declara datos simulados y que no es dispositivo médico.
- [ ] CI verde; `/docs` lista todas las rutas.
- [ ] Guion de 90 s ensayado y funcionando de punta a punta.

---

## 12. Riesgos y plan B

| Riesgo | Probabilidad | Plan B |
|---|---|---|
| El mapa del cuerpo se come las horas | Alta | Cuadrícula de tarjetas de color; misma información, sin silueta |
| El motor no converge a tiempo | Media | `fixtures` con niveles ya calculados; se declara en el pitch |
| El deploy falla el día del demo | Media | Demo local + video grabado de respaldo |
| La API cambia y rompe el FE | Media | Contrato congelado a H1; los cambios van con PR y aviso |
| Datos poco creíbles | Media | Semilla fija + revisión del rol 6 contra cifras reales |
| Alguien no aparece | Media | Fusionar roles según §11.6 |
| El jurado pregunta "¿de dónde salieron los datos?" | Alta | Respuesta preparada (§6.2 y §13) |

---

## 13. Preguntas del jurado (respuestas cortas)

| Pregunta | Respuesta |
|---|---|
| ¿Por qué simulan los datos? | No hay series diarias públicas de signos vitales de astronautas; son pocas personas y datos médicos protegidos. NASA usa análogos y modelos por lo mismo. |
| ¿De dónde salen los umbrales? | Radiación y CO₂ de NASA (600 mSv de carrera, 3 mmHg); el resto son supuestos de prototipo calibrados con la simulación y declarados. |
| ¿Esto diagnostica? | No. Detecta cambios, los explica y sugiere una acción; diagnostica el médico de vuelo. |
| ¿Qué pasa si se equivoca? | Mide falsas alarmas y retraso de detección; explica por qué alertó y deja decidir a la persona y al médico. |
| ¿Por qué un mapa del cuerpo? | El astronauta no es médico: la zona le dice dónde mirar y la tarjeta le dice qué hacer. |
| ¿Por qué importa el retraso de comunicación? | A Marte un mensaje tarda ~20 min por sentido. Cada alerta trae una acción autónoma; el reporte va en paralelo. |
| ¿Qué sigue? | Reentrenar con datos reales (OSDR/LSDA/análogos), validar umbrales con médicos de vuelo y añadir mediciones que hoy no se pueden hacer sin equipo (densitometría, OCT). |

---

## 14. Decisiones abiertas

| # | Decisión | Quién | Antes de |
|---|---|---|---|
| 1 | Contenido de la pestaña *Resources* del reto: ¿hay dataset obligatorio? | Rol 1 | H1 |
| 2 | Fecha y reglas del evento (¿15 h? ¿jurado local?) | Rol 1 | H0 |
| 3 | Nombre del repo: `Gravizen` vs `vitalis` | Rol 1 | H1 |
| 4 | Idioma de la UI: español (actual) o inglés | Todos | H1 |
| 5 | Nombres reales en los 6 roles | Todos | H0 |
| 6 | Cuentas de deploy (Render/Vercel) y quién las controla | Rol 1 | H1 |

---

## 15. Glosario

- **Línea base:** comportamiento normal de *esa* persona (mediana y MAD de los primeros 14 días).
- **EWMA / CUSUM:** filtros de tendencia; detectan desviaciones sostenidas con menos falsas alarmas que un z-score aislado.
- **Convergencia:** varios indicadores moviéndose juntos; más informativo que uno solo alto.
- **Peligro (hazard):** los 5 de NASA HRP: radiación, aislamiento, distancia, gravedad, ambiente cerrado.
- **Día de misión:** entero desde el lanzamiento (`day=0`). Es el único reloj del sistema salvo el tránsito de reportes.
- **MAD:** desviación absoluta mediana; robusta a valores extremos, a diferencia de la desviación estándar.
