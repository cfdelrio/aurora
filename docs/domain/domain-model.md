# Modelo de Dominio

> Este es el modelo conceptual de AURORA. No es SQL. No es Prisma. No es código.
>
> Son los conceptos, sus relaciones, sus reglas. Esto es lo que el código debe respetar.

## Estructura general

```
┌─ Athlete (raíz del contexto) ────────────────┐
│                                              │
│  - profile                                   │
│  - trainingZones (umbrales)                  │
│  - workouts (colección)                      │
│  - competitionEvents (eventos objetivo)      │
│                                              │
│  ├─ Workout (agregado) ──────────────────┐   │
│  │                                        │   │
│  │  - metadata (tiempo, deporte, etc)    │   │
│  │  - rawStreams (datos del dispositivo) │   │
│  │  - normalizedWorkout                  │   │
│  │                                        │   │
│  │  ├─ Stream (value object)            │   │
│  │  │  - metric (power, hr, cadence)    │   │
│  │  │  - samples (series de valores)    │   │
│  │  │  - gaps (datos faltantes)         │   │
│  │  │                                    │   │
│  │  └─ NormalizedWorkout               │   │
│  │     - sport                          │   │
│  │     - duration                       │   │
│  │     - normalizedStreams              │   │
│  │                                        │   │
│  └────────────────────────────────────────┘   │
│                                              │
│  ├─ TrainingMetrics (value object) ───────┐  │
│  │  - trainingLoad                        │  │
│  │  - trainingStress                      │  │
│  │  - recoveryNeeded                      │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ├─ PerformanceMetrics (value object) ────┐  │
│  │  - ftp                                 │  │
│  │  - fthr                                │  │
│  │  - vo2max                              │  │
│  │  - anaerobicPower                      │  │
│  │  - measuredAt (fecha)                  │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ├─ TrainingZones (agregado) ─────────────┐  │
│  │  - z1EndHr, z1EndPower (fácil)        │  │
│  │  - z2EndHr, z2EndPower (base)         │  │
│  │  - z3EndHr, z3EndPower (tempo)        │  │
│  │  - z4EndHr, z4EndPower (threshold)    │  │
│  │  - z5EndHr, z5EndPower (VO2)          │  │
│  │  - z6Minimum (anaerobico)             │  │
│  │  - basedate (cuándo se calcularon)    │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  └─ RaceProfile (agregado) ──────────────┐  │
│     - date                               │  │
│     - name                               │  │
│     - distance                           │  │
│     - terrain                            │  │
│     - expectedDuration                   │  │
│     - targetForm                         │  │
│                                          │  │
│     └─ CompetitionWindow (value object) │  │
│        - estimatedPeakStart              │  │
│        - estimatedPeakEnd                │  │
│        - confidence                      │  │
│                                          │  │
│     └─ CoachInsights (colección) ────┐   │  │
│        - action                      │   │  │
│        - reasoning                   │   │  │
│        - createdAt                   │   │  │
│                                      │   │  │
│        └─ Recommendation (V.O.) ───┘   │  │
│           - type (rest/easy/hard)      │  │
│           - confidence                 │  │
│                                        │  │
│     └────────────────────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

## Entidades principales

### Athlete (raíz del agregado)

**Responsabilidad**: Dueña de sus datos. Propietaria de su entrenamiento. Punto de acceso único.

**Invariantes**:
- Un atleta solo puede tener una entrada en el sistema.
- Un atleta es dueño de todos sus workouts.
- Las trainingZones deben ser válidas (Z1 < Z2 < Z3 < Z4 < Z5 < Z6).
- No puede existir un workout sin un atleta.

**Métodos de dominio**:
- `addWorkout(workout)` — agregar entrenamiento.
- `updateTrainingZones(zones)` — actualizar umbrales. **Efecto**: invalida análisis previos de zonas.
- `getForm()` — retorna estado actual de forma.
- `getRiskScore()` — retorna probabilidad de sobreentrenamiento.
- `getNextCompetitionWindow()` — cuál es la próxima ventana competitiva.

---

### Workout (agregado raíz)

**Responsabilidad**: Captura una sesión de entrenamiento. Agnóstica del dispositivo.

**Ciclo de vida**:
1. Creación: `NewWorkout(rawFitData)` — datos crudos del archivo FIT.
2. Normalización: Conversión a formato canónico (potencia en vatios, FC en bpm, etc).
3. Análisis: Cálculo de métricas (carga, estrés, zona).
4. Almacenamiento: El workout normalizado se guarda; opcionalmente el FIT crudose descarta.

**Invariantes**:
- Todo workout debe tener al menos `startTime` y `duration`.
- Un workout normalizado siempre tiene streams compatibles con la zona del atleta.
- Los gaps (datos faltantes) se marcan explícitamente, no se descartan.

**Streams normalizados necesarios**:
- Potencia (si es ciclo).
- Ritmo cardíaco.
- Cadencia (si aplica).
- GPS (si aplica).

**Value Objects contenidos**:
- `NormalizedWorkout` — representación canónica.
- `WorkoutMetadata` — deporte, fecha, duración.
- Colección de `Stream`.

---

### Stream (value object)

**Responsabilidad**: Una serie temporal de un metric específico.

**Propiedades**:
- `metric` — qué se mide (power, heart_rate, cadence, pace, elevation).
- `unit` — unidad (watts, bpm, rpm, km/h, metros).
- `samples` — lista de `(timestamp, value)`.
- `gaps` — dónde faltan datos.

**Invariantes**:
- Los samples están ordenados por timestamp.
- Todos los valores tienen la misma unidad.
- Los gaps no se ignoran, se marcan.

**Ejemplo**:
```
Stream(
  metric: power,
  unit: watts,
  samples: [(0, 200), (1, 210), (2, 215), ...],
  gaps: [(45-60 seconds)] // el dispositivo perdió señal
)
```

---

### TrainingMetrics (value object)

**Responsabilidad**: Resume el estrés y la demanda de un workout individual.

**Propiedades**:
- `trainingStressScore` — 0-500+. Métrica de carga.
- `intensityFactor` — 0-2.0. Ratio de intensidad.
- `variabilityIndex` — consistencia del esfuerzo.
- `recoveryNeeded` — horas estimadas para recuperarse completamente.

**Cálculo**:
- Basado en potencia normalizada, FC o ambas.
- Agnóstico del dispositivo (usa datos normalizados).

---

### PerformanceMetrics (value object)

**Responsabilidad**: Capacidad medida del atleta.

**Propiedades**:
- `ftp` — Functional Threshold Power (vatios). Base de cálculos de potencia.
- `fthr` — Functional Threshold Heart Rate (bpm). Base de zonas de FC.
- `vo2max` — VO2 máximo (ml/kg/min). Capacidad aeróbica.
- `anaerobicPower` — Potencia anaeróbica pico (vatios).
- `measuredAt` — fecha (cuándo se midió).

**Invariantes**:
- `ftp` y `fthr` deben ser razonables para el deporte/atleta.
- Los cambios en estos valores se registran (histórico de FTP).

---

### TrainingZones (agregado)

**Responsabilidad**: Define los rangos de intensidad para el atleta específico.

**Propiedades**:
- Seis zonas basadas en FTP y FTHR.
  - Z1: Recuperación (< 55% FTP, < 82% FTHR).
  - Z2: Base (55-75% FTP, 82-89% FTHR).
  - Z3: Tempo (75-90% FTP, 89-93% FTHR).
  - Z4: Threshold (90-105% FTP, 93-97% FTHR).
  - Z5: VO2 Max (105-120% FTP, 97-100% FTHR).
  - Z6: Anaerobio (> 120% FTP).

**Invariantes**:
- Las zonas no pueden solaparse.
- Un cambio en FTP/FTHR invalida análisis previos de distribución por zona.

---

### RaceProfile (agregado)

**Responsabilidad**: Define una competencia objetivo.

**Propiedades**:
- `date` — cuándo es.
- `name` — nombre de la carrera.
- `distance` — distancia (para contexto).
- `terrain` — terreno (plano, montaña, mixto, urbano).
- `expectedDuration` — cuánto durará.
- `targetForm` — en qué forma deseamos estar.

**Métodos de dominio**:
- `estimateCompetitionWindow()` — basada en patrones históricos.

---

## Bounded Contexts

AURORA está dividida en contextos con responsabilidades claras:

### 1. Ingestion Context

**Responsabilidad**: Recibir archivos FIT crudos y normalizarlos.

**Actores**:
- Parser de FIT (convierte binario a streams).
- Normalizer (convierte a unidades estándar).

**Produce**:
- `NormalizedWorkout` — pronto para análisis.

**No conoce**: TrainingZones, Performance, Predicción.

---

### 2. Performance Context

**Responsabilidad**: Analizar un workout individual.

**Actores**:
- WorkoutAnalyzer (calcula métricas de entrenamiento).
- ZoneClassifier (clasifica workout en zonas).

**Consume**:
- `NormalizedWorkout`.
- `TrainingZones` del atleta.

**Produce**:
- `TrainingMetrics`.
- `WorkoutAnalysis` (resumen: qué tipo de entrenamiento, zonas, intensidad).

**No conoce**: Histórico, Predicción.

---

### 3. Longitudinal Context

**Responsabilidad**: Analizar tendencias en el tiempo.

**Actores**:
- ProgressAnalyzer (detecta mejora de performance).
- FatigueCalculator (calcula acumulación de estrés).
- FormEstimator (calcula forma actual).

**Consume**:
- Colección de `TrainingMetrics` históricos.
- `PerformanceMetrics` históricos.

**Produce**:
- `FormState` (actual, acumulada, tendencia).
- `FatigueLevel` (fresh, fatigued, overreached, overrained).
- `RecoveryStatus`.

**No conoce**: Predicción (todavía).

---

### 4. Prediction Context

**Responsabilidad**: Estimar el futuro basado en patrones.

**Actores**:
- PeakFormPredictor (cuándo será el pico).
- RiskAssessment (probabilidad de sobreentrenamiento).
- PerformanceProjector (dónde estarás en N semanas).

**Consume**:
- `FormState` histórico.
- `FatigueLevel`.
- `RaceProfile` (competencias objetivo).
- Patrones históricos del atleta.

**Produce**:
- `CompetitionWindow` (cuándo estará en forma).
- `OvertrainingRisk` (probabilidad y severidad).
- `PerformanceProjection`.

---

### 5. Coaching Context

**Responsabilidad**: Generar recomendaciones accionables.

**Actores**:
- CoachingEngine (decide qué recomendar).
- InsightGenerator (explica por qué).

**Consume**:
- `FormState`, `FatigueLevel`, `RecoveryStatus`.
- `OvertrainingRisk`.
- `RaceProfile`.
- `Readiness` actual.

**Produce**:
- `CoachInsight` (recomendación + reasoning + confidence).

---

## Eventos de dominio

Cuando algo importante ocurre en el dominio, se emite un evento:

1. **WorkoutAdded** — nuevo entrenamiento subido.
2. **WorkoutNormalized** — datos crudos procesados exitosamente.
3. **WorkoutAnalyzed** — métricas calculadas.
4. **TrainingZonesUpdated** — umbrales cambiaron.
5. **PerformanceImproved** — FTP o métrica similar mejoró.
6. **FatigueEscalated** — sobreentrenamiento detectado.
7. **FormPredicted** — se estimó forma futura.
8. **CoachInsightGenerated** — nueva recomendación.
9. **CompetitionWindowDetected** — ventana competitiva clara.

---

## Reglas de negocio críticas

1. **Normalización agnóstica**: Un archivo FIT de Garmin y uno de Wahoo deben producir exactamente el mismo `NormalizedWorkout` en formato. Nunca el parser corrompe o pierde información.

2. **Zonas son invariantes**: Un cambio en FTP invalida análisis previos de distribución por zona. El sistema MARCA como "recalculado necesario", no lo hace silenciosamente.

3. **Datos del atleta son inviolables**: Un atleta puede borrar su propio workout, pero nunca modificar datos de otro.

4. **Predicciones son probabilísticas**: Cualquier predicción lleva un score de confianza. Nunca decimos "será" sin confianza.

5. **Recomendaciones son sugerencias, no órdenes**: El coach propone; el atleta decide. Nunca obligamos un entrenamiento.

6. **Gaps no se inventan**: Si faltan datos, se marca. Nunca interpolamos sin declarar.

---

Siguiente: [`glossary.md`](./glossary.md)
