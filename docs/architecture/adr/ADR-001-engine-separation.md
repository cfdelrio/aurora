# ADR-001 — Engine debe vivir separado del Parser FIT

> **Estado**: Aceptado
>
> **Fecha**: 2026-06-26
>
> **Decisores**: Founding Engineering Team

## Contexto

AURORA procesa datos de entrenamientos desde múltiples dispositivos (Garmin, Wahoo, Apple, Coros, etc).

Estos datos llegan en formato FIT (binario) o similar.

La pregunta de arquitectura es: **¿Dónde coexisten el Parser y el Analysis Engine?**

### Alternativa A: "Todo junto" — Parser + Engine integrados

Un módulo monolítico maneja:
- Lectura del FIT (binario).
- Conversión a estructuras internas.
- Normalización.
- Análisis de entrenamiento.
- Cálculo de métricas.
- Almacenamiento.

**Ventaja**:
- Menos archivos.
- Menos interfaces.
- Más rápido de implementar.

**Desventaja**:
- El Engine depende de detalles de FIT.
- Cambios en parser rompen analysis.
- Imposible testear Engine sin mock de FIT parser.
- Si quiero cambiar device source (e.g., integrar Apple Watch), modifico el monolito.
- **El dominio se ensucia con detalles de infraestructura**.

---

### Alternativa B: "Separados con contrato claro" — Parser produce NormalizedWorkout

**Parser**:
- Responsable: Leer FIT, convertir a registros, normalizar a unidades estándar.
- Output: `NormalizedWorkout` (VO que representa entrenamiento normalizado).
- Vive: Infraestructura (está bien que conozca FIT).

**Engine**:
- Responsable: Analizar entrenamientos normalizados, calcular métricas, detectar zonas.
- Input: `NormalizedWorkout` + contexto del atleta.
- Output: `TrainingMetrics`.
- Vive: Dominio (nunca ve un bit de FIT).

**Ventaja**:
- Engine es puro dominio, testeable sin infraestructura.
- Parser es agnóstico de análisis (puede fallar o cambiar sin afectar Engine).
- Si sumamos nuevo device, agregamos nuevo parser, mismo Engine.
- **Dominio separado de infraestructura**.

**Desventaja**:
- Una capa más de abstracción.
- Dos responsabilidades explícitas en vez de una.

---

## Decisión

**Vamos con Alternativa B: Separación clara.**

Engine vive separado del Parser. Se comunican a través de `NormalizedWorkout`.

### Contrato

**Parser**:
```
Input: Binary FIT file (bytes)
Output: NormalizedWorkout
- sport: str (bike, run, tri, swim)
- startTime: DateTime
- duration: Duration
- streams: List[Stream]
  - metric: str (power, heart_rate, cadence, pace, elevation)
  - unit: str (watts, bpm, rpm, km/h, m)
  - samples: List[(timestamp, value)]
  - gaps: List[(start, end)] -- marca huecos, no inventa datos
```

**Engine**:
```
Input: (NormalizedWorkout, Athlete.trainingZones)
Output: TrainingMetrics
- trainingStressScore: float
- intensityFactor: float
- recoveryNeeded: Duration
- zoneDistribution: Map[zone, %time]
- workoutType: str (Z2, Z3, Z4, VO2, etc)
```

---

## Consecuencias

### Positivas

1. **Engine es testeable puro**: Creo un `NormalizedWorkout` en memoria, le paso al Engine, verifica. Sin DB, sin FIT parser, sin mocks complejos.

2. **Parser es independiente**: Cambio el parser FIT, el Engine no se entera. Agriego soporte de TCX o GPX, es otro parser que produce el mismo `NormalizedWorkout`.

3. **Dominio limpio**: El Engine vive en el dominio sin conocer FIT, HTTP, base de datos. Es pura lógica de fisiología.

4. **Escalable a múltiples devices**: Garmin? Parser A. Wahoo? Parser B. Strava? Parser C. Todos producen `NormalizedWorkout`. Engine es el mismo.

5. **Auditabilidad**: Si un entrenamiento análisis diferente en Device A vs Device B, el culpable es el Parser, no el Engine.

### Negativas

1. **Una capa más de abstracción**: Código adicional.

2. **`NormalizedWorkout` debe estar bien diseñado**: Si falta algo en la normalización, Engine no puede recuperarse.

3. **Performance**: Dos pasadas (parse + normalize, then analyze) vs una. Negligible para nuestro caso (decenas de MB por entrenamiento, análisis offline).

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| `NormalizedWorkout` es insuficiente para Engine | Media | Comenzar con Parser y Engine en el mismo monolito, luego separar. La interface emerge del uso real. |
| Normalización pierde información importante | Alta | **Nunca inventamos datos. Marcamos gaps explícitamente.** Si falta dato crítico, lo añadimos a `NormalizedWorkout`. |
| Parser es lento | Baja | Lazy parse: solo normalizar lo que Engine necesita. |

---

## Referencias y alternativas futuras

**Por qué no Machine Learning en el Engine?**
- El Engine hoy es "rules + physics".
- Si en el futuro queremos agregar ML (ej, predicción de forma), el Engine ya está separado del Parser.
- Podés agregar `MLPowerEstimator` sin tocar Parser.

**¿Podría el Parser normalizar diferente según deporte?**
- Sí, pero `NormalizedWorkout` es el contrato. El Parser se adapta.

---

## Aprobación

Aceptado por: Founding Engineering Team

Documento de referencia: [`docs/architecture/architecture.md`](../architecture.md) (Ingestion Context)

---

Anterior: [`../c4.md`](../c4.md) · [Volver a ADRs](../../)
