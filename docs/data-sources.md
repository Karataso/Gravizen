# Datos: qué es real, qué es simulado y cómo se mide

**Regla de oro:** no existe un dataset público de signos vitales diarios de astronautas.
Son pocas personas, los datos médicos están protegidos y las agencias publican estudios,
agregados o datos pre/post vuelo, no telemetría diaria de una misión.

**En una frase:** el dashboard diario es simulado y está calibrado con rangos reales;
la glucosa de referencia de Inspiration4, los eventos solares y los umbrales de NASA
son reales y están citados.

## 1. Qué se ve en la app y de dónde sale

| Elemento de la app | Qué muestra | Fuente | Real / simulado |
|---|---|---|---|
| Serie diaria de 120 días | Sueño, pulso, ánimo, estrés, ejercicio, CO₂, radiación | Simulador propio | **Simulado** |
| Glucosa diaria | Valor diario | Simulador; base = mediana pre-vuelo real de OSD-575 | **Simulado y calibrado** |
| Panel "Datos reales" | Glucosa pre/post de 4 tripulantes de Inspiration4 | NASA OSDR OSD-575 | **Real** |
| Radiación (evento) | Alerta de tormenta / partículas solares | NASA DONKI / NOAA SWPC | **Real** (evento), dosis simulada |
| Radiación (dosis) | mSv/día y acumulada | Simulador | **Simulado** |
| CO₂ de cabina | mmHg | Simulador, con límites NASA | **Simulado** |
| Presión, temperatura, glucosa | Medición periódica (2–3/semana) | Usuario o simulador | **Real si se mide**; el formulario diario aún no los pide |
| Síntomas | Checkboxes del check-in | Usuario | **Real si se reporta** |
| Peligros (5 de NASA HRP) | Nivel por convergencia | Reglas propias | **Derivado** de lo anterior |
| Umbrales y límites | 3 mmHg CO₂, 600 mSv carrera, etc. | NASA HRP / NASA-STD-3001 / OCHMO | **Real y citado** |

## 2. El dato real que usa el backend

**OSD-575 — SpaceX Inspiration4 Blood Serum Metabolic Panel**

- 4 tripulantes (`C001`–`C004`).
- 7 extracciones: `L-92`, `L-44`, `L-3`, `R+1`, `R+45`, `R+82`, `R+194`.
- Panel metabólico completo: glucosa, albúmina, enzimas hepáticas, creatinina,
  electrolitos, etc. También hay arrays de citoquinas inmunes/cardíacas.
- Archivo usado: `backend/app/data/nasa/OSD-575_CMP_TRANSFORMED.csv`
  (28 filas, 8.5 KB, `sha256 5eb1e7f0…d709d9`).
- Endpoint: `GET /api/reference/inspiration4/glucose`.
- Pantalla: **Datos reales** en la app.
- Mediana pre-vuelo usada como base diaria: **76 mg/dL**.
- Descarga original:
  `https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv`
- Estudio: https://osdr.nasa.gov/bio/repo/data/studies/OSD-575

Es **datos procesados y públicos**, no datos crudos ni información privada.
La app no los presenta como telemetría de la tripulación de Vitalis: los muestra como
referencia real y usa la mediana para calibrar el simulador.

## 3. Fuentes reales que se pueden usar

| Fuente | Qué contiene | Acceso | Uso en Vitalis |
|---|---|---|---|
| [OSDR OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) | I4: panel metabólico + citoquinas, 4×7 | Público | Glucosa real de referencia; base del mock |
| [OSDR OSD-569](https://osdr.nasa.gov/bio/repo/data/studies/OSD-569) | I4: sangre completa, CBC, RNA-seq, WGS | Público | Contexto inmune/sangre (futuro) |
| [OSDR OSD-656](https://osdr.nasa.gov/bio/repo/data/studies/OSD-656) | I4: panel de inflamación en orina | Público | Contexto inmune (futuro) |
| [OSDR OSD-53](https://osdr.nasa.gov/bio/repo/data/studies/OSD-53) | Expresión génica en 6 astronautas, pre/post | Público | Evidencia de respuesta inmune |
| [OSDR OSD-353](https://osdr.nasa.gov/bio/repo/data/studies/OSD-353) | Proteoma plasmático humano, vuelo + tierra | Público | Contexto fisiológico |
| [NLSP / LSDA](https://nlsp.nasa.gov/explore) | Bedrest UTMB y Standard Measures humanos | Online / algunos por solicitud | Calibración de sueño, pulso, presión, eco, hueso |
| `BRSMACT_Campaign_1_Actigraphy` | Sueño y actividad (actigrafía) | Online | Rangos de sueño/latencia |
| `BRSMVF_Campaign_1_Vascular_Function` | Presión sistólica/diastólica, pulso, IMT | Online | Rangos de presión/pulso |
| `BRSMCF_Campaign_1_Echocardiography` | Volumen sistólico, eyección, diámetros | Online | Contexto cardiovascular |
| `BRSMPV_Campaign_1_Plasma_Volume` | Volumen plasmático, hematocrito | Online | Contexto cardiovascular |
| `JMDSO_607_1.xls` | Respuesta cardiovascular a LBNP post-vuelo | Online (archivo) | Calibración cardiovascular |
| [DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | Fulguraciones, CME, partículas solares | Público | Disparador real de evento de radiación |
| [NOAA SWPC](https://services.swpc.noaa.gov/) | Protones, Kp, alertas | Público | Disparador real de evento |
| [Curiosity RAD](https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/) | Dosis de radiación en Marte desde 2012 | Público | Contexto de dosis en superficie |
| [Blood Pressures in Spaceflight](https://data.mendeley.com/datasets/pz6nt4cpxs) | Presión resumida de vuelos reales y simulados | CC BY 4.0 | Calibración de presión |
| [PhysioNet Sleep-EDF](https://physionet.org/content/sleep-edfx/) | Sueño terrestre | Abierto | Ruido y basales realistas |
| [NASA NTRS](https://ntrs.nasa.gov/) | Informes y papers | Público | Umbrales y citas |

Los conjuntos de NLSP están marcados como "Available online"; algunos son tablas
procesadas, otros archivos y otros se piden por solicitud. Verifica la ficha de cada
dataset antes de prometer una descarga automática.

## 4. Cómo se mide de verdad en el espacio

No todo se mide igual, ni todos los días. Esto es lo que es realista:

| Indicador | Cómo se mide | Cadencia realista | Nota |
|---|---|---|---|
| Sueño | Actigrafía de muñeca + diario | Diaria | Barato y bien estudiado |
| Pulso en reposo | Wearable / ECG / sensor de pecho | Diaria | Condiciones de reposo importan |
| Presión arterial | Esfigmomanómetro automático | 2–3 por semana | Una lectura aislada es ruidosa; postura y repeticiones |
| Temperatura | Termómetro oral/timpánico/axilar | Diaria o si hay síntomas | Fácil y barata |
| Glucosa | Glucómetro de gota o CGM | Periódica / indicada | No es rutina diaria en tripulación sana; requiere ayuno |
| Ánimo / estrés | Cuestionario corto 1–5 | Diaria | Subjetivo, pero es el estándar |
| Ejercicio | Registro del equipo (bici, resistencia) | Diaria | Objetivo y ya existe a bordo |
| Radiación | Dosímetro personal + monitores de cabina | Continua / acumulada | No es un "signo vital"; es exposición |
| CO₂ | Sensores de cabina | Continua | Es ambiente, no fisiología personal |
| Síntomas | Check-in / observación | Diaria | Barato y de alta señal |
| Inmunidad, hueso, sangre | Analítica, biopsias, DXA/QCT | Periódica / laboratorio | No se autodetecta a diario |

### 4.1 El caso de la radiación

**Un wristband no mide radiación ionizante.** Un smartwatch mide pulso, SpO₂,
temperatura de piel, sueño y movimiento. Para radiación hace falta un detector:
cámara de ionización, diodo de silicio, TEPC, TLD/OSL o CR-39.

Lo que se usa de verdad:

| Método | Ejemplo | Comodidad |
|---|---|---|
| Dosímetro pasivo | NASA Crew Passive Dosimeter, JAXA Crew PADLES (2,5 × 2,5 × 0,4 cm) | Sin batería; bolsillo del pecho o bolsa de cintura; se lee después |
| Dosímetro activo personal | NASA **Crew Active Dosimeter (CAD)**: 5,7 × 3,4 × 2,6 cm, ~35 g, pila de botón, clip/bolsillo, pantalla y Bluetooth | Se lleva como un móvil pequeño; ISS desde 2020 y Artemis II |
| Dosímetro activo ESA | ESA Active Dosimeter (EAD): unidad móvil ~93 × 58 × 17 mm, 120 g | Más grande; se usa con una base de carga/lectura |
| Monitores de cabina | REM2, ISS-RAD, HERA, TEPC | Fijos; HERA avisa de eventos solares para refugiarse |
| Dosímetro EVA | Bolsa pasiva en el traje o pierna | Ya forma parte del traje |

Por qué no en la muñeca:

- La dosis que importa es la del **cuerpo completo**, no la de la muñeca.
- El cuerpo se auto-blindaliza y la radiación es direccional.
- El campo es mixto: rayos cósmicos galácticos, protones solares, partículas
  atrapadas y neutrones. La respuesta del detector debe ser tissue-equivalent.
- Un dispositivo de muñeca podría ser una alarma personal, pero no la dosis de
  registro. La dosis de registro va en el torso (bolsillo/pecho).

La conclusión de producto:

> No pedimos un wristband mágico. Un wristband da pulso, sueño y actividad; un
> manguito da presión; un termómetro da temperatura; un glucómetro da glucosa;
> un dosímetro de ~35 g en el bolsillo da radiación. Vitalis es la capa que los
> une y dice qué hacer.

### 4.2 Lo que un wristband no puede hacer

- **Presión arterial:** la medición sin brazalete no tiene precisión clínica
  suficiente para reemplazar un cuff.
- **Glucosa:** la medición no invasiva no es fiable; un CGM es un filamento
  subcutáneo, no un sensor óptico de muñeca.
- **Radiación:** no hay detector de ionización en un wearable de consumo.
- **SpO₂:** se puede medir, pero el movimiento, la perfusión y la luz ambiente
  la hacen menos fiable de lo que parece.
- **Temperatura central:** la muñeca da temperatura de piel, no temperatura core.

## 5. Qué es simulado y por qué

- **Serie diaria de 120 días:** sueño, pulso, presión, temperatura, glucosa,
  ánimo, estrés, ejercicio, CO₂ y dosis. No hay una serie pública diaria.
- **Escenarios:** aislamiento (Nova), desacondicionamiento (Iker), control sano
  (Aya) y CO₂ alto (Sol). Son casos de demo, no diagnósticos.
- **Ruido y huecos:** se calibran con rangos reales, pero siguen siendo sintéticos.
- **Síntomas del mock:** en el demo aparecen; en uso real solo existen si el
  tripulante los reporta.
- **Dosis de radiación:** la dosis personal se simula. El **evento** solar puede
  venir de DONKI/NOAA y ser real. En producción, la fuente sería un dosímetro
  real (NASA CAD, ESA EAD, PADLES).

Calibración **ya conectada**:

- glucosa diaria: mediana pre-vuelo real de OSD-575 (76 mg/dL);
- umbrales de glucosa, CO₂ y radiación: `PROJECT.md` §5.1 y `docs/recursos.md`.

Calibración **pendiente** (el mock todavía usa los rangos de `PROJECT.md` §6.3):

- presión y pulso: NLSP `BRSMVF` / `JMDSO_607` y el dataset de Mendeley;
- sueño: `BRSMACT` / NEEMO actigraphy;
- ejercicio y desacondicionamiento: campañas de bedrest UTMB;
- radiación: tasas de la ISS/Marte + eventos DONKI.

## 6. Por qué 120 días

120 días es una **decisión de demo**, no un estándar de NASA. Viene de
`PROJECT.md` §6.3, y el guion de 90 segundos usa el día 118.

- **Suficiente para ver tendencia:** aislamiento desde 96, desacondicionamiento
  desde 60, CO₂ desde 80. Al día 118 hay 20–58 días de progresión.
- **Suficiente para el demo:** un slider de 120 pasos ya es largo; el jurado solo
  necesita ver el último tercio.
- **Creíble como "misión larga":** una expedición ISS dura ~180 días; un tránsito
  a Marte, ~6–9 meses (~210–270 días); un bedrest analógico, 60–90 días. 120 está
  entre bedrest e ISS: plausible para un prototipo, no para un tránsito real.
- **Coherente con el dataset original:** el motor ML cubre 30 días; extenderlo a
  120 permite que el motor y el mock cuenten la misma historia.

Frase para el jurado:

> "Es un escenario de demo de 120 días, no un plan de misión. Una expedición real
> en la ISS son unos seis meses; un tránsito a Marte, seis a nueve. Elegimos 120
> porque entra en el demo y sigue mostrando riesgo acumulado."

Si se quiere más realismo: **180 días** (ISS) o **210–270 días** (Marte). El coste
es regenerar escenarios, fixtures, slider, docs y el día del demo; la app aguanta
cualquier número de días.

## 7. Cómo actualizar los datos reales

```bash
python scripts/fetch_nasa_data.py            # usa el CSV ya versionado
python scripts/fetch_nasa_data.py --force    # vuelve a descargar OSD-575
python scripts/fetch_nasa_data.py --donki    # eventos SEP de los últimos 60 días
```

El script valida que lleguen 28 filas y la columna de glucosa. Si NASA cambia el
archivo, revisa el `sha256` y actualiza esta documentación.

## 8. Límites y honestidad

- Inspiration4 fue una misión corta; los datos son pre/post, no diarios.
- El bedrest es un análogo, no una misión real.
- Los umbrales del prototipo no están validados clínicamente; solo radiación y CO₂
  salen de estándares NASA.
- No se usan datos humanos crudos ni identificables. Solo datos procesados y públicos.
- Cita siempre: NASA OSDR, NASA HRP, NASA-STD-3001, OCHMO, DONKI.
- No implica que NASA endose Vitalis.

## 9. Enlaces rápidos

- Desafío: https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/
- OSDR: https://osdr.nasa.gov/bio/repo/
- NLSP: https://nlsp.nasa.gov/explore
- DONKI: https://ccmc.gsfc.nasa.gov/tools/DONKI/
- NOAA SWPC: https://services.swpc.noaa.gov/
- NTRS: https://ntrs.nasa.gov/
- Respuesta de NASA sobre datos: https://github.com/nasa/spaceapps/discussions/2010
