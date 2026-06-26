# Lenguaje Ubicuo de AURORA

> Este es el diccionario oficial. Todos los términos aquí deben usarse sin variación en documentación y código.
>
> Si alguien usa un sinónimo, es un error. Lo corregimos inmediatamente.

## Conceptos fundamentales

### Workout (Entrenamiento)

Una sesión individual de entrenamiento registrada por un dispositivo.

**No es**: evento, actividad, salida, sesión.

**Propiedades**:
- `startTime` — cuándo comenzó.
- `duration` — cuánto duró.
- `sport` — tipo (bike, run, tri, etc).
- `streams` — datos crudos (potencia, FC, GPS, cadencia).
- `normalizedWorkout` — streams normalizados.

**Ejemplo**: "El workout del lunes a las 7 AM fue 90 minutos de entrenamiento en bicicleta."

---

### Training Cycle (Ciclo de entrenamiento)

Un período predefinido de entrenamiento (semana, mes, bloque, temporada).

**Propiedades**:
- `startDate` — inicio.
- `endDate` — fin.
- `targetEvents` — competencias en este ciclo.
- `workouts` — entrenamientos que lo componen.

**Ejemplo**: "Este ciclo es de 6 semanas, terminando con el campeonato regional."

---

### Training Load (Carga de entrenamiento)

El estrés acumulado de un entrenamiento.

**No es**: calorías, kilojoules, tiempo, vatios.

**Método**: TSS (Training Stress Score) o similar, normalizado a un rango común.

**Propiedades**:
- `acuteLoad` (última semana) — estrés actual.
- `chronicLoad` (últimas 4 semanas) — estrés histórico.
- `loadBalance` — ratio agudo/crónico.

**Ejemplo**: "Hoy sumaste 120 unidades de carga. Tu carga semanal es 650. Tu carga promedio histórica es 500, así que esta semana es más dura."

---

### Recovery (Recuperación)

Capacidad del atleta de recuperarse de la carga acumulada.

**Componentes**:
- `daysFromLastHardWorkout` — cuánto descanso desde entrenamiento duro.
- `sleepQuality` — si tenemos datos.
- `resting Heart Rate` — indicador de recuperación.
- `perceivedRecovery` — lo que el atleta reporta (si aplica).

**Ejemplo**: "Hace 2 días que no entrenas duro. Tu FC en reposo bajó. Estás bien recuperado."

---

### Fatigue (Fatiga)

Acumulación de estrés que reduce la capacidad de rendimiento.

**Medida por**:
- Ratio de carga aguda/crónica.
- Tendencia de performance.
- Días desde último entrenamiento fácil.

**Estados posibles**:
- `Fresh` — listo para entrenar duro.
- `Fatigued` — necesitás recuperación.
- `Overreached` — entrenamiento se ve comprometido.
- `Overrained` (si continúa) — riesgo de lesión.

**Ejemplo**: "Llevas 8 días de entrenamientos duros. Estás fatigado. Recomendamos 2-3 días de entrenamientos muy fáciles o descanso."

---

### Readiness (Disposición)

Capacidad actual para rendir al máximo.

**Factores**:
- Recuperación actual.
- Fatiga acumulada.
- Tendencia histórica (¿vas mejorando o empeorando?).

**Escala**: Baja / Media / Alta

**Ejemplo**: "Tu disposición está alta. Podés hacer un entrenamiento máximo hoy."

---

### Performance (Rendimiento)

Capacidad actual medida en datos objetivos.

**Métricas**:
- `FTP` — Functional Threshold Power (ciclo).
- `FTHR` — Functional Threshold Heart Rate.
- `VO2Max` — capacidad aeróbica máxima.
- `AnaerobicPower` — potencia anaeróbica pico.

**No es**: sensación, percepción, o "cómo te sientes".

**Ejemplo**: "Tu FTP subió 15W en las últimas 4 semanas. Estás más fuerte."

---

### Form (Forma)

Estado de preparación física y mental para competir.

**Compuesta de**:
- `acuteForm` — estado actual (última semana).
- `chronnicForm` — tendencia (últimas 4 semanas).
- `peakForm` — mejor punto histórico.

**Estados**:
- `BuildingForm` — mejorando gradualmente.
- `OptimalForm` — en el pico deseado.
- `FadingForm` — empeorando.

**Ejemplo**: "Estás en forma óptima. Es el momento perfecto para competir."

---

### Prediction (Predicción)

Estimación de forma o performance futura basada en patrones históricos y actuales.

**Tipos**:
- `PeakFormWindow` — cuándo será tu mejor forma.
- `OvertrainingRisk` — probabilidad de sobreentrenamiento.
- `PerformanceProjection` — dónde estarás en 4 semanas.
- `CompetitiveWindow` — cuándo estarás listo para competir.

**Siempre con confianza**: "80% confianza de que estarás en forma pico en 3 semanas."

---

### Aurora Index (o AuroraScore)

Métrica holística que resume el estado actual del atleta.

**Factores**:
- Forma actual.
- Recuperación.
- Tendencia de performance.
- Riesgo (lesión, sobreentrenamiento).

**Rango**: 0–100

**Ejemplo**: "Tu Aurora Index es 78. Estás en buena forma, bien recuperado, y sin riesgos visibles."

---

### Coach Insight (o Recomendación)

Consejo accionable para el atleta.

**Estructura**:
- `action` — qué hacer (entrenar duro, descansar, entrenar especifico).
- `reasoning` — por qué (datos + fisiología).
- `confidence` — cuán seguro estamos.
- `window` — cuándo aplicar (hoy, esta semana, este ciclo).

**Ejemplo**: "Descansa mañana. Acumulaste 750 unidades de carga en 5 días. El riesgo de lesión está elevado. Confianza: 85%."

---

### Race Profile (o Event)

Caracterización de una competencia.

**Propiedades**:
- `date` — cuándo.
- `distance` — qué distancia.
- `terrain` — qué tipo (plano, montaña, mixto).
- `expectedDuration` — cuánto durará.
- `competitionLevel` — nivel esperado.
- `targetDate` — objetivo de forma para esta fecha.

**Ejemplo**: "Triatlón olímpico el 20 de julio. Montaña. 3 horas estimado. Querés estar en forma óptima."

---

### Competition Window (o Peak Window)

Período en el que estás en forma para competir.

**Propiedades**:
- `startDate` — cuándo empieza la ventana.
- `endDate` — cuándo termina.
- `targetForm` — forma deseada.
- `confidence` — cuán seguros estamos que la alcanzarás.

**Ejemplo**: "Tu ventana competitiva es del 1 al 31 de julio. Confianza: 78% de que estarás en forma óptima."

---

### Bounded Context

Límites explícitos del dominio donde conceptos específicos viven.

**Contextos de AURORA**:
- **Ingestion**: Cómo entran los datos (FIT → normalización).
- **Performance**: Análisis de entrenamientos individuales.
- **Longitudinal**: Análisis de tendencias en el tiempo.
- **Prediction**: Modelos predictivos.
- **Coaching**: Recomendaciones y acciones.

Cada contexto tiene su propia versión de algunos conceptos, pero el lenguaje es el mismo.

---

## Reglas de lenguaje

1. **Singular, no plural**: "Workout", no "Workouts" (excepto en listas).
2. **Inglés en código, español en docs**: El código usa términos en inglés; la documentación usa ambos, pero primero el inglés.
3. **Sin diminutivos ni sobrenombres**: No es "WO", no es "sesión". Es "Workout".
4. **Términos compuestos**: "Training Load", no "training-load" ni "trainingLoad" en documentos (pero sí en código según convención).
5. **Sin traducción si no hay contexto**: "TSS" es "TSS", no "Puntos de Estrés de Entrenamiento", a menos que necesites explicar.

---

## Términos descartados (por qué)

| Término descartado | Por qué | Alternativa |
|---|---|---|
| "Activity" | Demasiado genérico | Workout |
| "Session" | Confunde con sesión de usuario/login | Workout |
| "Event" | Confunde con competencia | Workout o Race Profile |
| "Metrics" | Demasiado vago | Specific metric name |
| "Score" | Demasiado subjetivo | Aurora Index (cuando sea score holístico) |
| "Feeling" | No es medible | Readiness o Recovery state |

---

Siguiente: [`domain-model.md`](./domain-model.md)
