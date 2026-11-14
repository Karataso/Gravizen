# Guía técnica de Vitalis: stack, modelo y pasos por integrante

Nov 14, 2026 · @Cristofer Cortez Gordian

## Decisiones técnicas

Usen React + FastAPI + SQLite: es el stack más rápido de montar con 6 personas full stack en 15 horas, y deja el modelo en el mismo lenguaje que la API (Python).

| Capa | Tecnología | Por qué |
| --- | --- | --- |
| Frontend | React + Vite + TypeScript, Tailwind y Recharts | Componentes reutilizables y gráficas de tendencia listas |
| Offline e instalable | vite-plugin-pwa (service worker y manifest) e IndexedDB con la librería idb | Guarda check-ins y reportes sin conexión y los envía al volver |
| Backend | FastAPI, Pydantic y Uvicorn | Mismo lenguaje que el modelo y documentación automática en /docs |
| Base de datos | SQLite con SQLAlchemy | Sin servidor ni configuración |
| Modelo y datos | pandas, numpy, scikit-learn y joblib | Cubre detección de cambios, anomalías y proyección |
| Despliegue | Frontend en Vercel o Netlify; API en Render o Railway | Gratis y con URL pública |
| Equipo | GitHub con una rama por rol y pull requests pequeños | Integran varias veces por hora sin pisarse |
| Pruebas | pytest para la API y el motor | Protege la detección cuando alguien cambie umbrales |

Si el tiempo aprieta, la alternativa es seguir con `vitalis.html` como frontend y poner solo la API y el modelo detrás.

## Modelo de predicción

No hay datos reales de astronautas para entrenar, así que combinen tres capas explicables sobre datos simulados y agreguen una cuarta solo si sobra tiempo. Un modelo supervisado entrenado solo con su simulador aprende el simulador, por eso la base es estadística y no supervisada, y deben declarar esa limitación.

1. **Detección de cambios (no se entrena)**: fija la línea base personal con la mediana y la desviación absoluta mediana (MAD) de los primeros 14 días, y aplica EWMA o CUSUM para detectar desviaciones sostenidas. Valores típicos para empezar: EWMA con λ = 0,2 y límite de 3σ; CUSUM con k = 0,5σ y h = 4σ. Mejora el z-score actual con menos falsas alarmas.
2. **Anomalías multivariadas: Isolation Forest (scikit-learn)**: se entrena con tripulantes simulados sanos (por ejemplo 200 personas × 60 días). Cada día entra como un vector de z-scores personales de pulso, sueño, ánimo, estrés, ejercicio, dosis de radiación y CO₂, más sus promedios de 5 días. Devuelve un puntaje de anomalía que alimenta el semáforo cuando varios indicadores se mueven un poco a la vez. Empiecen con `contamination` entre 0,02 y 0,05.
3. **Proyección (la parte "predictiva")**: una regresión lineal robusta o un modelo Holt (statsmodels) sobre los últimos 14 días de cada indicador estima en cuántos días cruzará su umbral: "al ritmo actual, tu sueño cruzará el umbral en unos 6 días".
4. **Opcional: clasificador de causa (Random Forest o Gradient Boosting)**: se entrena con escenarios simulados etiquetados (normal, aislamiento, tormenta solar, pérdida de condición física, CO₂ en cabina) y dice qué peligro explica la alerta. Pruébenlo con escenarios generados con otros parámetros que los de entrenamiento.

### Datos de entrenamiento

Mejoren el simulador para que cada persona tenga su propia línea base, ruido y días faltantes, y para que cada escenario tenga inicio, duración e intensidad aleatorios. Guarden el día de inicio real del evento, porque con él se miden los resultados.

### Cómo medirlo

- **Retraso de detección**: días entre el inicio del evento y la primera alerta.
- **Falsas alarmas**: alertas por cada 100 días-persona sanos. Fijen una meta, por ejemplo menos de 1.
- **Eventos detectados**: porcentaje de escenarios simulados que generan alerta.
- **Error de la proyección**: error medio en días entre lo proyectado y el cruce real del umbral.

### Qué decir al jurado

Los modelos son explicables, usan datos simulados y se pueden reentrenar con datos reales si consiguen acceso a repositorios de la NASA como OSDR o LSDA (verifiquen qué hay disponible).

## Fundamento de salud: qué se vigila, por qué y qué se hace con cada resultado

Esta sección es la que justifica que Vitalis sirva para algo. El stack y el modelo solo son útiles si miden lo correcto y si cada alerta termina en una acción concreta. Todo el equipo debería leerla, y las personas de datos (rol 5) y de investigación (rol 6) deben trabajar con ella abierta.

### Principios que guían el diseño

1. **Vitalis es apoyo a la decisión, no un diagnóstico.** Detecta cambios, los explica y sugiere un siguiente paso. Quien diagnostica y decide es el médico de vuelo (en la vida real, en la Tierra o a bordo).
2. **Importa más la tendencia que el valor aislado.** Un mal día de sueño es normal. Cinco noches seguidas peor que tu propio promedio es una señal. Por eso el modelo usa línea base personal, EWMA y CUSUM.
3. **Importa más la convergencia que una señal sola.** Cuando varios indicadores se mueven un poco al mismo tiempo (sueño, ánimo, pulso y estrés), eso suele significar más que uno solo muy alto. De ahí el Isolation Forest.
4. **Hay dos tipos de umbral y no deben mezclarse.** Los *relativos* comparan contra la línea base de cada persona (sueño, pulso, ánimo, estrés, ejercicio). Los *absolutos* vienen de un estándar de seguridad que no depende de la persona (radiación y CO₂).
5. **Con retraso de comunicación, la autonomía importa.** En una misión a Marte cada mensaje tarda unos 20 minutos en cada sentido, así que no se puede esperar una respuesta de tierra para empezar a actuar. Cada alerta debe traer una primera acción que la tripulación pueda hacer sola, y la solicitud a tierra va en paralelo.
6. **La salud mental cuenta igual que la física.** NASA la trata como un peligro por derecho propio (aislamiento y confinamiento), no como un extra.

### Los 5 peligros de NASA y qué indicador de Vitalis los cubre

El Programa de Investigación Humana (HRP) de NASA agrupa los riesgos de un viaje a Marte en cinco peligros: radiación espacial, aislamiento y confinamiento, distancia de la Tierra, gravedad alterada, y ambientes hostiles y cerrados.

| Peligro (NASA HRP) | Qué le pasa al cuerpo | Indicadores de Vitalis | Qué se mediría en la vida real |
| --- | --- | --- | --- |
| Radiación espacial | Más riesgo de cáncer, daño al ADN, efectos en el sistema nervioso central, cataratas y problemas cardiovasculares | Dosis de radiación (por día y acumulada), sueño, estrés | Dosímetros personales y de cabina, alertas de clima espacial |
| Aislamiento y confinamiento | Alteración del sueño y del ritmo circadiano, bajón de ánimo, irritabilidad, conflictos, peor rendimiento | Ánimo, estrés, sueño, check-in de síntomas | Cuestionarios de ánimo, actigrafía de sueño, conferencias psicológicas privadas |
| Distancia de la Tierra | Sin evacuación posible, retraso de comunicación, menos recursos médicos | Módulo "Enlace con tierra" y estado de los reportes | Telemedicina con retraso, botiquín, entrenamiento médico de la tripulación |
| Gravedad alterada | Pérdida de hueso y músculo, cambios cardiovasculares, vestibulares y de visión | Ejercicio, pulso en reposo, síntomas (mareo, visión, dolor de espalda) | Densitometría ósea, ecocardiogramas, OCT de ojo, pruebas de fuerza y equilibrio |
| Ambientes hostiles y cerrados | Dióxido de carbono alto, cambios en el sistema inmune, microbioma y calidad del aire | CO₂ en cabina, síntomas (dolor de cabeza), sueño | Sensores de atmósfera, análisis de sangre y orina, seguimiento de virus latentes |

### Cómo se interpreta cada lectura: el ciclo completo

Cada lectura nueva pasa por los mismos pasos. Esto es lo que debería implementar el motor del rol 5 y lo que debe mostrar el dashboard:

1. **Medir o registrar**: sensor, dispositivo o check-in del día.
2. **Limpiar**: descartar valores imposibles, marcar días faltantes (no inventar datos) y anotar si hubo un confusor conocido (por ejemplo, ejercicio intenso justo antes de medir el pulso).
3. **Comparar con la línea base personal** (mediana y MAD) y calcular el z-score.
4. **Comparar con el límite absoluto**, cuando exista (radiación y CO₂).
5. **Detectar tendencia**: EWMA y CUSUM, más la proyección de días hasta el umbral.
6. **Mirar el conjunto**: el puntaje de anomalía multivariada y las combinaciones típicas de cada peligro.
7. **Asignar nivel**: normal, vigilar, actuar o emergencia.
8. **Explicar**: una frase en lenguaje claro con el dato real ("Sueño: 5,1 h contra 7,0 h de tu línea base, 4 noches seguidas").
9. **Recomendar la primera acción** y decir a quién escalar y con qué urgencia.
10. **Registrar y verificar**: guardar la alerta y la acción tomada, y comprobar en los días siguientes si el indicador mejoró. Si no mejora, el nivel sube.

### Ficha de cada indicador

Cada ficha dice qué es, por qué importa en el espacio, cómo se mide, qué umbrales se proponen, qué hacer y qué puede dar una falsa alarma. Los umbrales marcados como **(NASA)** salen de estándares o publicaciones de NASA; los marcados como **(propuesta)** son valores iniciales razonables que el equipo debe calibrar con las simulaciones y declarar como supuestos ante el jurado.

#### 1. Sueño

- **Por qué importa**: en la ISS la estación sale y se pone el sol unas 16 veces al día, lo que desordena el ritmo circadiano. El sueño insuficiente baja la atención, la memoria y el ánimo, y NASA lo trata como un riesgo de rendimiento y salud. Además es el indicador "temprano" más sensible: casi cualquier otro problema (estrés, CO₂, dolor, aislamiento, radiación) termina afectando el sueño.
- **Cómo se mide**: horas dormidas y calidad por check-in o dispositivo de muñeca (actigrafía). En la vida real también se registran despertares y regularidad de horarios.
- **Umbrales (propuesta)**: *vigilar* cuando el promedio de 3 noches cae más de 1 hora bajo la línea base o hay menos de 6 h. *Actuar* cuando son 3 noches seguidas con menos de 5 h o 5 noches con más de 2 h por debajo de la base.
- **Qué hacer**: revisar la iluminación y el horario (luz más azul y brillante por la mañana, más tenue y roja por la noche, como hace NASA con sus luces LED), reducir cafeína y trabajo nocturno, y revisar el ruido y la temperatura del módulo de dormir. Si sigue por más de una semana, hablar con el médico de vuelo. Nunca usar el sueño solo: cruzarlo con ánimo, estrés y CO₂.
- **Falsas alarmas**: turnos de trabajo especiales, maniobras o una emergencia que justifique dormir menos.

#### 2. Pulso en reposo (y, si hay datos, variabilidad del pulso)

- **Por qué importa**: refleja el estado del sistema cardiovascular y del sistema nervioso autónomo. En microgravedad los fluidos se desplazan hacia la cabeza, el corazón se adapta y la regulación de la presión cambia. Un pulso en reposo que sube de forma sostenida suele indicar pérdida de condición física, estrés, mala recuperación, deshidratación o enfermedad.
- **Cómo se mide**: pulso en reposo por la mañana, antes de moverse. En la vida real también presión arterial, ECG y ecocardiograma.
- **Umbrales (propuesta)**: *vigilar* con un aumento de más de 8 a 10% sobre la línea base durante 3 días o más. *Actuar* con más de 15 a 20% de aumento sostenido, o con un valor en reposo por encima de 100 lpm. Una arritmia, un desmayo o dolor en el pecho no se manejan con umbrales: se escala siempre.
- **Qué hacer**: confirmar la medición (mismas condiciones, mismo momento del día), revisar hidratación, sueño y carga de ejercicio, y descartar fiebre o infección. Si persiste, evaluación médica.
- **Falsas alarmas**: ejercicio reciente, cafeína, medición hecha con prisa o mal colocado el sensor.

#### 3. Estado de ánimo

- **Por qué importa**: el aislamiento y el confinamiento aumentan el riesgo de ánimo bajo, irritabilidad, ansiedad y conflictos. Una tripulación con problemas de convivencia toma peores decisiones y comete más errores. NASA busca detectar de forma temprana señales de funcionamiento mental alterado, y usa una guía (CONNECT) para ayudar a la tripulación a manejar el aislamiento.
- **Cómo se mide**: escala corta diaria (por ejemplo de 1 a 5) más una pregunta abierta opcional. En la vida real se usan cuestionarios validados, observación de la conducta y conferencias psicológicas privadas.
- **Umbrales (propuesta)**: *vigilar* con 3 días seguidos al menos 1 punto por debajo de la base. *Actuar* con 5 días seguidos, o con una caída fuerte y repentina, o si el check-in marca aislamiento social, pérdida de interés o conflicto con la tripulación.
- **Qué hacer**: contacto social estructurado (comida en grupo, llamada a familia), ajustar carga de trabajo, asegurar luz, ejercicio y sueño, y pedir una conversación con el psicólogo de vuelo. Si el check-in sugiere ideas de hacerse daño, se pasa de inmediato a emergencia y se avisa al médico de vuelo, sin esperar a que se acumulen días.
- **Falsas alarmas**: una mala noticia personal puntual (que sí requiere apoyo, aunque no sea un problema de la misión).

#### 4. Estrés

- **Por qué importa**: el estrés sostenido eleva las hormonas del estrés, altera el sistema inmune y empeora el sueño y el rendimiento. En el espacio se suman la carga de trabajo, el riesgo constante y el hacinamiento.
- **Cómo se mide**: escala corta diaria. En la vida real también marcadores en sangre, orina o saliva (como el cortisol) y variabilidad del pulso.
- **Umbrales (propuesta)**: igual que ánimo pero invertido (aumento sostenido sobre la base). Se vuelve más importante cuando coincide con sueño bajo y pulso alto.
- **Qué hacer**: reducir o redistribuir tareas, pausas obligatorias, técnicas de respiración y descanso, hablar con la tripulación. Si coincide con una causa externa (tormenta solar, falla técnica), la acción es resolver la causa.
- **Falsas alarmas**: picos de estrés propios de una tarea crítica que acabó bien.

#### 5. Ejercicio

- **Por qué importa**: es la principal defensa contra la pérdida de hueso y músculo. Sin carga de gravedad, los astronautas pierden entre 1 y 1,5% de densidad ósea por mes, sobre todo en cadera, pelvis, columna y piernas. Por eso en la ISS se entrena unas 2 horas diarias con equipo de resistencia, bicicleta y caminadora. Si se saltan sesiones, el deterioro avanza más rápido. También protege el corazón y el ánimo.
- **Cómo se mide**: minutos por día, tipo (resistencia o cardio) y cumplimiento del plan. En la vida real, además, fuerza, masa muscular y densidad ósea antes y después.
- **Umbrales (propuesta)**: *vigilar* con menos de 75% del plan semanal, o 2 días seguidos sin entrenar. *Actuar* con menos de 50% del plan, 3 o más días seguidos sin entrenar, o dolor que impide entrenar.
- **Qué hacer**: replanificar las sesiones, revisar si falla el equipo, revisar si hay dolor o lesión, y ajustar la nutrición (calcio, vitamina D y proteína). Si hay dolor óseo o articular persistente, evaluación médica.
- **Falsas alarmas**: mantenimiento del equipo o una emergencia que consumió el día.

#### 6. Radiación

- **Por qué importa**: fuera de la protección del campo magnético terrestre la exposición crece. Las fuentes son los rayos cósmicos galácticos (constantes) y las tormentas solares (eventos repentinos). Los efectos a largo plazo son más riesgo de cáncer, daño cardiovascular, cataratas y posibles efectos en el sistema nervioso central.
- **Cómo se mide**: dosímetros personales y de cabina, más alertas de clima espacial. Se registra la dosis diaria y la acumulada de toda la carrera.
- **Referencias reales (NASA)**:
  - En la ISS la exposición ronda 0,5 mSv por día, y la persona promedio recibe unos 2 a 3 mSv al año en la Tierra.
  - NASA fija un límite de carrera de 600 mSv por astronauta (para todas las edades y sexos). Otras agencias (Canadá, Rusia, Europa) usan 1.000 mSv.
  - Para eventos de partículas solares existe un límite de corto plazo de 250 mSv, y las naves y hábitats deben tener refugio para tormentas.
  - Un viaje a Marte podría rondar los 1.000 mSv sin mejor blindaje, por eso la radiación es el peligro más serio de esas misiones.
- **Umbrales (propuesta)**: *dosis diaria*: vigilar con el doble de la línea base de cabina, actuar con 5 veces o más, o con una alerta de tormenta solar. *Dosis acumulada de la carrera*: avisos al 50, 75 y 90% del límite de 600 mSv. *Dosis acumulada de un evento*: actuar al acercarse a una fracción relevante del límite de 250 mSv.
- **Qué hacer**: ante una alerta o un salto de dosis, ir al refugio o la zona más blindada de la nave, suspender actividades fuera de la nave, anotar la hora de inicio y fin, y revisar síntomas (náuseas, vómito, fatiga extrema a dosis altas). Después, seguimiento médico y actualización de la dosis acumulada, que además condiciona las asignaciones futuras de la persona.
- **Falsas alarmas**: fallos del dosímetro (se confirma con un segundo sensor) y pasos por zonas conocidas de mayor radiación en la órbita.

#### 7. CO₂ en cabina

- **Por qué importa**: el cuerpo exhala CO₂ y en una nave cerrada se acumula. En la Tierra el aire exterior tiene unos 0,3 mmHg, y el de interiores entre 0,6 y 0,8 mmHg. En la ISS los niveles suelen ser mucho mayores y la tripulación reporta dolor de cabeza, cansancio, mal sueño, visión borrosa y menor concentración a niveles que en la Tierra no darían síntomas. Un estudio de NASA encontró que por cada 1 mmHg de aumento, las probabilidades de dolor de cabeza se duplican.
- **Cómo se mide**: sensores de CO₂ de la cabina, con promedios de 1 hora, 24 horas y 7 días. El CO₂ puede acumularse en bolsas locales cerca de la cara porque en microgravedad el aire no circula solo, así que conviene medir en varios puntos.
- **Referencias reales (NASA)**: el estándar NASA-STD-3001 pide que el promedio de 1 hora no pase de 3 mmHg; en la ISS se ha trabajado con límites de 4 y luego 3 mmHg; para mantener el riesgo de dolor de cabeza por debajo de 1%, el promedio de 7 días debería quedar bajo 2,5 mmHg; algunos tripulantes notan síntomas desde 2,3 mmHg; y el máximo permitido para misiones de 180 días es 5,3 mmHg (0,7%).
- **Umbrales**: *normal* por debajo de 2,5 mmHg (promedio de 7 días). *Vigilar* entre 2,5 y 3,0 mmHg o con dolor de cabeza nuevo. *Actuar* con 3,0 mmHg o más (promedio de 1 hora) o síntomas claros. *Emergencia* con 5,3 mmHg o más, o con síntomas fuertes (confusión, falta de aire, somnolencia marcada).
- **Qué hacer**: verificar el sensor, mejorar la ventilación (ventiladores, evitar zonas sin flujo de aire), revisar el depurador de CO₂, reducir la carga metabólica temporalmente (menos actividad intensa), ir a un módulo con mejor aire y avisar al control de la nave. Si hay síntomas fuertes, atención médica inmediata.
- **Falsas alarmas**: sensor sucio o mal calibrado, o picos cortos durante el ejercicio, que es cuando más CO₂ se produce.

#### 8. Síntomas del check-in

El check-in debe incluir una lista corta de síntomas con casillas, porque son la única forma de ver, sin equipo médico, varios efectos importantes del espacio:

| Síntoma | Qué puede indicar | Qué hace Vitalis |
| --- | --- | --- |
| Dolor de cabeza nuevo o persistente | CO₂ alto, desplazamiento de fluidos, estrés o falta de sueño | Sube la sospecha de CO₂; si es más de 3 días, alerta |
| Visión borrosa o cambio al leer de cerca | Posible síndrome neuro-ocular (SANS) | Alerta *actuar* siempre; pedir examen ocular, no esperar tendencia |
| Mareo al ponerse de pie | Regulación de presión alterada, deshidratación | Vigilar; pedir hidratación y registro de presión |
| Náuseas o desorientación | Adaptación al espacio o problema vestibular (es normal solo los primeros días) | Vigilar; si pasa de la primera semana, alerta |
| Dolor de espalda, cadera o huesos | Carga ósea o muscular alterada, mala postura al entrenar | Cruzar con ejercicio; si es persistente, evaluación médica |
| Fiebre, tos, malestar general | Infección o reactivación de virus latentes (el sistema inmune cambia en el espacio) | Alerta *actuar*; aislar y consultar |
| Pensamientos de hacerse daño | Emergencia de salud mental | Emergencia inmediata, sin esperar tendencia |

### Lo que Vitalis no mide, pero un médico de vuelo sí vigilaría

Un check-in y un reloj no miden densidad ósea ni presión intracraneal. Estos son los efectos importantes que el prototipo cubre solo de forma indirecta, y que conviene presentar como el siguiente paso:

| Sistema | Qué ocurre en el espacio | Cómo se mide en la realidad | Cómo lo cubre Vitalis hoy |
| --- | --- | --- | --- |
| Huesos | Pérdida de 1 a 1,5% de densidad al mes; riesgo de fracturas y de cálculos renales | Densitometría (DEXA), marcadores de recambio óseo en sangre y orina | Indirecto, vía ejercicio y dolor óseo |
| Músculo | Atrofia en piernas, espalda y tronco | Pruebas de fuerza, imagen | Indirecto, vía ejercicio |
| Ojos (SANS) | Unos 70% de los astronautas de larga duración muestran algún signo, como hinchazón del nervio óptico | OCT, fondo de ojo, agudeza visual, ultrasonido ocular | Solo con el síntoma "visión borrosa" |
| Corazón y vasos | Fluidos hacia la cabeza, cambios en presión y tamaño del corazón, riesgo de arritmias | Presión arterial, ECG, ecocardiograma | Pulso en reposo y mareo al levantarse |
| Equilibrio y sistema vestibular | Desorientación y problemas de equilibrio al llegar y al volver | Pruebas de equilibrio y coordinación | Solo síntomas |
| Sangre | Se destruyen más glóbulos rojos (un estudio de 2022 encontró un 54% más durante misiones de seis meses) y puede haber anemia | Análisis de sangre | No cubierto |
| Sistema inmune | Cambios en la respuesta inmune y reactivación de virus latentes | Marcadores inmunes, análisis de virus | Solo síntomas de infección |
| Nutrición | Menos vitamina D (poca luz solar), balance de líquidos, hierro, calorías | Análisis de sangre, registro de comidas | No cubierto |
| Cerebro | Cambios en los ventrículos cerebrales y más dolores de cabeza | Imagen, pruebas cognitivas | Solo síntomas |

### Protocolo de respuesta por nivel

Cada nivel que muestra el semáforo debe traer tres cosas: la acción inmediata de la tripulación, lo que se envía a tierra y la urgencia. Esto es lo que el dashboard debería mostrar junto a cada alerta.

| Nivel | Qué significa | Acción de la tripulación | Qué se envía a tierra |
| --- | --- | --- | --- |
| **Normal** (verde) | Dentro de la línea base y de los límites | Seguir con la rutina; el check-in diario | Resumen periódico |
| **Vigilar** (amarillo) | Desviación pequeña o sostenida, sin riesgo inmediato | Revisar la causa probable (sueño, carga, luz, ejercicio), aplicar el ajuste sugerido y volver a medir en 24 a 48 h | Nota en el siguiente reporte |
| **Actuar** (naranja) | Desviación fuerte, varias señales juntas o un límite cruzado | Ejecutar la acción recomendada del peligro (por ejemplo, ventilar la cabina o revisar el plan de ejercicio), reducir la carga de trabajo y registrar lo hecho | Reporte a tierra con prioridad; solicitar consulta con el médico de vuelo |
| **Emergencia** (rojo) | Riesgo inmediato: límite de seguridad superado, síntomas graves o riesgo de daño personal | Acción inmediata de seguridad (refugio, evacuar el módulo, atención médica de a bordo) | Reporte urgente; avisar al control de la misión sin esperar la siguiente ventana |

Los estados del reporte (en tránsito, recibido, respondido) se relacionan con la urgencia: si un reporte *actuar* sigue "en tránsito" más tiempo del esperado, el dashboard debe recordarlo, y si es *emergencia*, la acción local no se detiene mientras se espera la respuesta.

### Combinaciones de señales que apuntan a cada peligro

Esto es lo que debe reconocer el motor multivariado y, si sobra tiempo, el clasificador de causa. Coinciden con los cuatro escenarios simulados:

| Escenario simulado | Peligro | Patrón esperado en los datos | Acción sugerida |
| --- | --- | --- | --- |
| Tormenta solar | Radiación | Salto de dosis en 1 a 2 días, seguido de peor sueño y más estrés | Refugio, suspender salidas, registrar dosis, seguimiento médico |
| Aislamiento | Aislamiento y confinamiento | Ánimo que baja lentamente, sueño peor, menos contacto, estrés que sube; avance gradual, no repentino | Contacto social estructurado, ajustar carga, psicólogo de vuelo |
| Pérdida de condición física | Gravedad alterada | Ejercicio que baja, pulso en reposo que sube con los días, a veces dolor de espalda | Replanificar entrenamiento, revisar equipo, evaluar hueso y músculo |
| CO₂ en cabina | Ambientes hostiles y cerrados | CO₂ sobre 2,5 mmHg, dolor de cabeza, sueño peor, concentración menor | Ventilar, revisar depurador, bajar actividad, médico de vuelo |

La distancia de la Tierra no es un escenario fisiológico sino un factor que cambia el contexto de todos los demás: aumenta la gravedad de cualquier alerta porque la ayuda tarda más.

### Cómo hacer que los datos simulados sean creíbles

Para que las pruebas del modelo signifiquen algo, el simulador (rol 5) debería respetar estas reglas de realismo:

- **Cada persona tiene su propia línea base.** Por ejemplo, pulso en reposo entre 50 y 75 lpm, sueño entre 6 y 7,5 h, ánimo y estrés con promedios distintos y ruido diario.
- **Valores de referencia de cabina.** CO₂ entre 1,5 y 3 mmHg en un día normal con pequeños ciclos diarios, y dosis de radiación cercana a 0,5 mSv por día.
- **Los eventos cambian varios indicadores a la vez y con dinámica.** La tormenta solar sube la dosis de golpe y afecta el sueño y el estrés con 1 o 2 días de retraso. El aislamiento avanza lento y empeora todo poco a poco. El CO₂ sube y vuelve a bajar según el ejercicio y la ventilación.
- **Hay ruido y días faltantes**, como pasa con los datos reales.
- **Hay un periodo de adaptación al inicio.** Los primeros días en el espacio traen náuseas, dolor de cabeza y mal sueño que no deben contar como enfermedad. Por eso, en la vida real se prefiere una línea base medida antes del vuelo en la Tierra. Si calculan la base con los primeros 14 días del vuelo, declaren que ya incluye la adaptación.
- **Guarden el día real de inicio de cada evento** para medir retraso de detección, como ya dice la guía.

### Límites y precauciones

- **No es un dispositivo médico.** Declaren que Vitalis es una herramienta de apoyo y que sus umbrales son supuestos de prototipo.
- **Privacidad.** Los datos de salud son sensibles. En la propuesta, cada persona ve sus propios datos en detalle, y el resumen de toda la tripulación solo muestra el nivel del semáforo, salvo que la persona lo autorice o haya una emergencia.
- **Falsos negativos y falsos positivos.** Un sistema que alerta demasiado se ignora. Uno que no alerta da una falsa seguridad. Por eso se miden las falsas alarmas y el retraso de detección.
- **Los umbrales de propuesta no están validados con astronautas reales.** Solo los de radiación y CO₂ siguen estándares de NASA, y aun esos tienen incertidumbre (el propio estándar de CO₂ se ha reducido con el tiempo al verse síntomas a niveles bajos).
- **Cada persona es distinta.** Por eso la base es personal y no un promedio de la población.

### Preguntas probables del jurado sobre salud

| Pregunta | Respuesta corta |
| --- | --- |
| ¿Por qué estos indicadores y no huesos o visión? | Elegimos los que se pueden medir cada día sin equipo clínico, y cubrimos los demás con síntomas del check-in. Medirlos de verdad (densitometría, OCT) es el siguiente paso. |
| ¿De dónde salen los umbrales? | Radiación y CO₂ vienen de estándares de NASA (600 mSv de carrera, 3 mmHg de CO₂). El resto son supuestos iniciales calibrados con simulaciones, y los declaramos así. |
| ¿Sirve con datos simulados? | Demuestra el método y mide su desempeño en escenarios conocidos. No demuestra eficacia clínica, y para eso haría falta reentrenar con datos reales. |
| ¿Qué pasa si el sistema se equivoca? | Es apoyo a la decisión: explica por qué alertó, la tripulación y el médico de vuelo deciden. Medimos falsas alarmas y retraso para saber cuánto confiar. |
| ¿Por qué importa el retraso de comunicación? | Porque en misiones lejanas no se puede esperar la respuesta de tierra. Cada alerta incluye una primera acción autónoma y el reporte viaja en paralelo. |
| ¿Cuál es el riesgo mayor? | Para misiones largas, la radiación, junto con la pérdida de hueso y músculo, la visión, el sistema cardiovascular y la salud mental. |

### Fuentes de esta sección

- [NASA: los 5 peligros del vuelo espacial humano](https://www.nasa.gov/hrp/hazards)
- [NASA OCHMO: estándares de radiación, límite de carrera de 600 mSv](https://www.nasa.gov/sites/default/files/atoms/files/ochmo_standards_overview_sept_15_2021_francisco.pdf)
- [National Academies: actualización del límite de radiación para astronautas](https://www.nationalacademies.org/news/nasa-should-update-astronaut-radiation-exposure-limits-improve-communication-of-cancer-risks)
- [NASA NTRS: exposición a radiación en misiones Artemis (límites de corto plazo)](https://ntrs.nasa.gov/api/citations/20250006168/downloads/ASCEND%20Simonsen%20draft%201.pdf)
- [NASA OCHMO: informe técnico sobre CO₂](https://nasa.gov/wp-content/uploads/2023/03/co2-technical-brief-ochmo.pdf)
- [NASA NTRS: CO₂ en la ISS, actualización operativa](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20150019624.pdf)
- [Estudio de NASA sobre dolores de cabeza y CO₂ en la ISS](https://www.ishn.com/articles/98606-occupational-hazard-in-space-headaches)
- [UCF: qué le pasa al cuerpo humano en el espacio (hueso, ojos)](https://www.ucf.edu/space/what-happens-to-the-human-body-in-space/)
- [Discover: cómo el viaje espacial desgasta mente y cuerpo](https://www.discovermagazine.com/how-long-term-space-travel-wears-down-an-astronauts-mind-and-body-47192)

Los valores marcados como **(propuesta)** no vienen de estas fuentes. Son supuestos del equipo para calibrar.

## Contrato de la API

Acuerden estas rutas en la hora 1; así el frontend y el backend trabajan en paralelo con datos falsos.

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/api/crew` | Lista de astronautas |
| GET | `/api/crew/{id}/series?day=118&days=30` | Serie de indicadores y línea base |
| GET | `/api/crew/{id}/status?day=118` | Estado de los 5 peligros, alertas, explicación y proyección |
| POST | `/api/crew/{id}/checkins` | Guarda un check-in (día, sueño, ánimo, estrés, síntomas) |
| POST | `/api/reports` | Crea un reporte a tierra |
| GET | `/api/reports` | Lista los reportes con su estado: en tránsito, recibido o respondido |
| POST | `/api/sim/storm` | Inyecta una tormenta solar en un día |

Forma de la respuesta de `status` (ejemplo):

```json
{"day":118,"hazards":[{"id":"iso","level":"alert","anomaly":0.91,"why":["Sueño: 5,1 h contra 7,0 h de línea base"],"days_to_threshold":null}]}
```

## Pasos de cada integrante

Cada rol trae sus pasos con hora aproximada y un criterio de terminado. Anoten el nombre de quien toma cada rol.

### 1. Líder e integración ·

1. **Horas 0–1**: crear el repositorio en GitHub con carpetas `frontend/`, `backend/`, `ml/` y `docs/`. Protejan `main` y pidan pull requests pequeños. Subir `vitalis.html` a `docs/prototipo/` como referencia.
2. **Horas 0–1**: dirigir la reunión de arranque y fijar el nombre, el alcance y el contrato de la API de este documento.
3. **Horas 1–9**: revisar los pull requests a diario, destrabar bloqueos y llevar el tablero de tareas.
4. **Hora 9**: congelar el alcance; desde ahí solo se aceptan correcciones.
5. **Horas 9–13,5**: probar el flujo completo en la versión desplegada y escribir el README (qué es, cómo correrlo, arquitectura, límites).
6. **Horas 13,5–15**: llenar el formulario del portal, subir los enlaces y enviar.

**Terminado cuando**: el proyecto está enviado y los enlaces abren en una ventana de incógnito.

### 2. Frontend: dashboard ·

1. **Horas 1–2**: crear el proyecto con `npm create vite@latest` (React + TypeScript), instalar Tailwind y Recharts, y definir los tipos de TypeScript según el contrato de la API.
2. **Horas 2–5**: pasar la pantalla de `vitalis.html` a componentes: `HazardCard`, `TrendChart`, `AlertPanel`, `CrewSwitcher` y `DaySlider`. Trabajar con datos falsos hasta que la API esté lista.
3. **Horas 5–6**: conectar con `/api/crew/{id}/status` y `/series`.
4. **Horas 6–9**: agregar la vista de resumen de toda la tripulación y mostrar la proyección ("cruzarás el umbral en 6 días") en cada alerta, junto con la acción sugerida y la urgencia según el protocolo de respuesta. El resumen de tripulación muestra solo el nivel del semáforo, no los datos de salud detallados de cada persona.
5. **Horas 9–12**: revisar celular, modo oscuro y accesibilidad (contraste, foco con teclado).

**Terminado cuando**: el dashboard carga con datos reales de la API y se ve bien a 400 px de ancho.

### 3. Frontend: check-in y offline ·

1. **Horas 1–3**: construir el formulario de check-in (sueño, ánimo, estrés, síntomas) con validación y mensajes claros. La lista de síntomas debe incluir dolor de cabeza, visión borrosa, mareo al levantarse, náuseas, dolor de espalda u óseo, fiebre o malestar, y una pregunta sobre pensamientos de hacerse daño (ver "Síntomas del check-in"). Esa última debe llevar siempre a un mensaje de apoyo y a aviso inmediato, nunca solo a un número en una gráfica.
2. **Horas 3–6**: guardar los check-ins y los reportes en IndexedDB con la librería `idb` y enviarlos a `POST /api/crew/{id}/checkins` y `/api/reports` cuando haya conexión.
3. **Horas 6–9**: configurar `vite-plugin-pwa` (manifest, íconos, caché) y la pantalla "Enlace con tierra" con el retraso simulado de 20 minutos y el modo acelerado ×60.
4. **Horas 9–12**: probar en modo avión: abrir la app, hacer un check-in, volver a conectar y comprobar que se sincroniza.

**Terminado cuando**: la app se instala en el celular y un check-in hecho sin conexión llega al servidor al reconectar.

### 4. Backend ·

1. **Horas 1–2**: crear el proyecto FastAPI, modelos Pydantic del contrato y rutas que devuelven datos falsos para destrabar al frontend. Activar CORS.
2. **Horas 2–5**: crear las tablas con SQLAlchemy (astronautas, mediciones, check-ins, reportes) y cargar los datos del simulador al arrancar.
3. **Horas 5–6**: conectar el motor del rol 5 (importar el paquete `ml/`) a `/status` y `/series`.
4. **Horas 6–9**: implementar los reportes con estados calculados por tiempo (en tránsito, recibido, respondido) y `POST /api/sim/storm`.
5. **Horas 5–9**: desplegar en Render o Railway con variables de entorno y activar HTTPS.
6. **Horas 9–12**: pruebas con pytest de las rutas principales.

**Terminado cuando**: la URL pública responde y `/docs` muestra todas las rutas.

### 5. Datos y modelo ·

1. **Horas 1–3**: mejorar el generador de datos (Python): línea base por persona, ruido, días faltantes y escenarios con inicio, duración e intensidad aleatorios. Guardar el día real de inicio de cada evento.
2. **Horas 3–5**: implementar la línea base con mediana y MAD, más EWMA y CUSUM por indicador. Devuelve nivel (normal, vigilar, actuar, emergencia) y el texto de por qué. Usar los umbrales de la sección "Fundamento de salud": relativos a la línea base para sueño, pulso, ánimo, estrés y ejercicio, y absolutos para radiación (límite de carrera de 600 mSv) y CO₂ (3 mmHg). Cada resultado debe incluir también la acción sugerida y la urgencia del protocolo de respuesta.
3. **Horas 5–7**: entrenar Isolation Forest con tripulantes sanos simulados y guardar el modelo con `joblib`. Combinar su puntaje con las reglas del paso anterior.
4. **Horas 7–8**: añadir la proyección con regresión robusta o Holt para estimar días hasta el umbral.
5. **Horas 8–10**: medir retraso de detección, falsas alarmas y eventos detectados con 100 escenarios nuevos, y ajustar umbrales.
6. **Horas 10–12**: escribir una página con la fórmula, los parámetros y los resultados. Si sobra tiempo, probar el clasificador de causa.

**Terminado cuando**: el paquete `ml/` expone una función `evaluate(crew_id, day)` y la tabla de resultados está en `docs/`.

### 6. Investigación, pitch y video ·

1. **Horas 0–3**: escribir la sección de ciencia a partir de "Fundamento de salud" de este documento (ya trae cada indicador, su razón, sus umbrales y las preguntas probables del jurado). Verifiquen las cifras contra las páginas de la NASA (riesgos, 5 peligros, investigación en curso) y la de la Agencia Espacial Canadiense sobre radiación, y marquen qué umbrales son estándar real y cuáles son propuesta del equipo.
2. **Horas 3–6**: redactar el resumen del proyecto, la declaración de datos simulados y la lista de herramientas usadas.
3. **Horas 6–9**: armar las diapositivas (problema, solución, demo, cómo funciona, resultados del modelo, siguientes pasos).
4. **Horas 9–12**: escribir el guion del video de 2 a 3 minutos: día 98, tormenta solar, alerta, reporte a tierra, respuesta con retraso. Grabar la pantalla en la versión desplegada y la voz aparte.
5. **Horas 12–13,5**: editar el video y revisar que no tenga errores.

**Terminado cuando**: hay un video, unas diapositivas y un texto de envío que otra persona del equipo ya revisó.
