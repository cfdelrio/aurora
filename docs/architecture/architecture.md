# Arquitectura conceptual de AURORA

> No es una arquitectura de implementación. Es una arquitectura de responsabilidades.
>
> Describe dónde vive cada concepto y cómo se comunican.

## Principios arquitectónicos

1. **Dominio adentro, infraestructura afuera** — La lógica de fisiología deportiva vive en el dominio. El código de Garmin, base de datos, HTTP vive fuera.

2. **Parser no corrompe** — El parser de FIT JAMÁS modifica datos. Solo convierte. Si hay ambigüedad, la marca explícitamente.

3. **Zonas son un agregado** — Las training zones son un agregado completo, no fragmentos. Un cambio en FTP invalida el agregado.

4. **Eventos, no side effects** — Cuando algo importante ocurre (entrenamiento analizado, forma detectada), se emite un evento. Los listeners reaccionan.

5. **Predicción siempre probabilística** — Ningún "será". Siempre "será con X% confianza".

## Estructura de capas

```
┌──────────────────────────────────────┐
│     UI / API (HTTP, GraphQL)         │ ← Puerta de entrada
├──────────────────────────────────────┤
│  Application Layer (Casos de uso)    │ ← Orquestación
├──────────────────────────────────────┤
│  Domain Layer (Lógica de negocio)    │ ← El corazón
├──────────────────────────────────────┤
│  Infrastructure (DB, Files, APIs)    │ ← Detalles
└──────────────────────────────────────┘
```

### Domain Layer (el corazón)

**Vive acá**:
- Entidades: `Athlete`, `Workout`, `TrainingMetrics`, `PerformanceMetrics`, `TrainingZones`, `RaceProfile`.
- Value Objects: `Stream`, `NormalizedWorkout`, `CoachInsight`, `CompetitionWindow`.
- Servicios de dominio: lógica que no pertenece a una entidad (análisis de tendencias, cálculo de forma, predicción).
- Eventos: `WorkoutAdded`, `FormDetected`, `RiskAssessed`, etc.

**No vive acá**:
- Código de Garmin.
- Queries SQL.
- HTTP requests.
- Librerías de UI.

**Testeable sin**: base de datos, red, filesystem. Solo puro.

---

### Application Layer (orquestación)

**Responsabilidad**: Coordinar el dominio.

**Casos de uso típicos**:
1. **UploadWorkout** — recibir FIT, normalizar, analizar.
2. **GetAthleteStatus** — retornar forma, fatiga, readiness actual.
3. **GenerateCoachInsight** — generar recomendación basada en estado.
4. **PredictPeakForm** — estimar forma futura para una carrera.

**No sabe**:
- Cómo guardar en BD (delega a Repository).
- Cómo enviar HTTP (delega a Adapter).

---

### Infrastructure Layer (detalles)

**Responsabilidades**:

**Parser**:
- Lee binario FIT.
- Convierte a estructuras internas.
- NO normaliza (eso es dominio).

**Persistence**:
- Almacena Athlete, Workout, TrainingMetrics, etc.
- Implementa Repository pattern para cada agregado.

**External APIs**:
- Si integramos con Garmin Cloud, Strava, etc., vive acá.
- El dominio nunca conoce estas integraciones.

---

## Bounded Contexts y responsabilidades

### 1. Ingestion Context

```
Raw FIT File
     ↓
  [Parser]        (Infrastructure)
     ↓
 FIT Records
     ↓
  [Converter]     (Infrastructure)
     ↓
 Raw Streams (watts, bpm, etc)
     ↓
  [Normalizer]    (Domain)
     ↓
 NormalizedWorkout (agnóstico)
     ↓
[Repository.Save]
```

**Propiedad**: Nunca perder o corromper datos.

**No conoce**: TrainingZones, Performance, Predicción.

---

### 2. Performance Context

```
NormalizedWorkout + TrainingZones (del Athlete)
     ↓
  [WorkoutAnalyzer]  (Domain Service)
     ↓
 - Zona detectada
 - TSS calculado
 - Intensidad normalizada
     ↓
  [ZoneDistribution]  (Value Object)
     ↓
 TrainingMetrics
```

**Entrada**: Workout normalizado + contexto del atleta (zonas).
**Salida**: Métricas completas del entrenamiento.

---

### 3. Longitudinal Context

```
Last 12 weeks of TrainingMetrics + Performance history
     ↓
  [ProgressAnalyzer]  (Domain Service)
     ↓
 - FTP trend
 - Load trend
 - Performance trend
     ↓
  [FormCalculator]    (Domain Service)
     ↓
 - Acute form
 - Chronic form
 - Current state
     ↓
FormState (Optimal/Building/Fading)
```

**No conoce**: El siguiente entrenamiento. Solo historia.

---

### 4. Prediction Context

```
FormState + Historical patterns + RaceProfile
     ↓
  [PeakPredictor]     (Domain Service)
     ↓
 - Estimated peak window
 - Confidence level
     ↓
  [RiskAssessor]      (Domain Service)
     ↓
 - Overtraining probability
 - Injury risk
     ↓
CompetitionWindow + RiskAssessment
```

**Criterio**: Nunca certeza. Siempre confianza (%).

---

### 5. Coaching Context

```
FormState + RiskAssessment + Readiness + RaceProfile
     ↓
  [InsightGenerator]  (Domain Service)
     ↓
 - Recommendation (rest/easy/hard/specific)
 - Explanation (por qué)
 - Confidence (%)
     ↓
CoachInsight → event → UI/API
```

**Output**: Recomendación accionable.

---

## Comunicación entre contextos

Contextos se comunican por:

1. **Domain Events** (asincrónico, preferido):
   - Ingestion emite `WorkoutNormalized`.
   - Performance reacciona, emite `WorkoutAnalyzed`.
   - Longitudinal reacciona, emite `FormUpdated`.
   - Coaching reacciona, emite `InsightGenerated`.

2. **Repository queries** (sincrónico, cuando necesitamos contexto):
   - Prediction Context consulta: "dame últimas 12 semanas de metrics".
   - Coaching Context consulta: "dame el estado actual de este atleta".

3. **Nunca** comparten modelos internos:
   - Ingestion no devuelve FIT records. Devuelve `NormalizedWorkout`.
   - Performance no devuelve queries internas. Devuelve `TrainingMetrics`.

---

## Flujo completo: desde FIT a Recomendación

```
1. Athlete sube archivo FIT
   ↓
2. [Parser] convierte a records (Ingestion)
   ↓
3. [Converter] normaliza a Streams (Infrastructure)
   ↓
4. Crear NormalizedWorkout (Domain)
   ↓
5. Emitir evento: WorkoutUploaded
   ↓
6. [AnalyzeWorkout] calcula TrainingMetrics (Performance Context)
   ↓
7. Emitir evento: WorkoutAnalyzed
   ↓
8. [UpdateForm] recalcula estado de forma (Longitudinal Context)
   ↓
9. Emitir evento: FormUpdated
   ↓
10. [AssessRisk] evalúa riesgo (Prediction Context)
   ↓
11. Emitir evento: RiskAssessed
   ↓
12. [GenerateInsight] crea recomendación (Coaching Context)
   ↓
13. Emitir evento: InsightGenerated
   ↓
14. UI recibe y muestra: "Descansa hoy" + explicación + confianza
```

Cada paso es independiente. Cada uno emite eventos. Fácil de testear aisladamente.

---

## Decisiones arquitectónicas documentadas

- **ADR-001**: Por qué el Engine vive separado del Parser FIT.
- **ADR-002**: Por qué almacenamos entrenamientos normalizados, no archivos FIT crudos.
- **ADR-003**: Por qué el usuario es dueño de sus datos, no AURORA.

---

Siguiente: [`c4.md`](./c4.md)
