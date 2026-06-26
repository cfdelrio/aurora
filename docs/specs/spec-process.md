# Proceso de Especificación de Features en AURORA

> Así convertimos una idea en código. Rigorous. Repetible. Domain-first.

## El flujo

```
Idea
  ↓
Product Brief (1-page, por qué)
  ↓
Domain Spec (cómo ve el dominio el problema)
  ↓
Technical Spec (cómo implementamos)
  ↓
Acceptance Criteria (cómo verificamos)
  ↓
Implementation (código)
  ↓
Review (verifica spec)
  ↓
Release (a usuarios)
```

Cada paso es un documento. Cada paso bloquea el siguiente si no está claro.

---

## Paso 1: Idea

**Responsable**: Product, Engineering, Coach (si aplica).

**Duración**: Conversación informal. 15 minutos.

**Pregunta clave**: "¿Por qué existe esto?"

**Output**: Una frase que resume el problema del atleta.

**Ejemplos**:
- ❌ "Queremos mostrar un gráfico de TSS."
- ✅ "El atleta no sabe si está entrenando duro o suave. Necesita claridad sobre la carga que acumula."

---

## Paso 2: Product Brief

**Responsable**: Product.

**Duración**: 30 minutos de escritura.

**Formato**: 1 página máximo.

**Contenido**:

```markdown
# Product Brief: [Nombre]

## Problema
¿Qué duele al atleta? ¿A cuántos? ¿Cuánto cuesta?

## Usuarios
¿Quién lo usa? (Atleta, Coach, Entrenador de montaña?)

## Solución propuesta
En una frase: qué hacemos.

## Éxito
¿Cómo sabemos que funcionó?
(Métrica: adopción, retención, acción del atleta, etc.)

## Riesgos
¿Qué podría salir mal?
```

**Ejemplo**:
```markdown
# Product Brief: Carga de Entrenamiento Semanal

## Problema
Atleta no sabe si una semana fue "dura" o "normal".
Garmin muestra números (TSS, kilojulios) sin contexto.
El atleta no sabe si 450 unidades es bueno o peligroso.

## Usuarios
Atleta amateur que entrena 5-10h/semana.

## Solución propuesta
Mostrar carga semanal en contexto: "Esta semana 620 unidades.
Promedio histórico 500. Estás 24% más duro. ¿Bien o riesgo?"

## Éxito
Atleta cambia algo en el próximo entrenamiento basado en la métrica.
(Mínimo 50% de usuarios actúan en base a la métrica.)

## Riesgos
- Número sin contexto es peor que nada.
- Si asusta sin razón (false positive risk), desconfianza.
```

---

## Paso 3: Domain Spec

**Responsable**: Staff Engineer + Product.

**Duración**: 2-4 horas de trabajo, documento vivo.

**Pregunta clave**: "¿Qué conceptos de dominio toca esto?"

**Contenido**:

```markdown
# Domain Spec: [Nombre]

## Conceptos involucrados
- Workout → TrainingMetrics
- Training Cycle (semana)
- Athlete.trainingZones (para contexto)

## Invariantes
- Carga no puede ser negativa.
- Comparación requiere al menos 4 semanas históricas.
- Cambio de FTP invalida histórico (marcar como "recalculado").

## Bounded Contexts
- Performance Context: calcula TSS del workout.
- Longitudinal Context: agrega a carga semanal, calcula promedio.

## Domain Events
- TrainingCycleCompleted (fin de semana)
- LoadAnalyzed (se calculó carga de la semana)

## Domain Services
- LoadCalculator.weeklyLoad(Athlete, startDate, endDate): TrainingLoad
- LoadContextualizer.compareToHistorical(currentLoad, historicalLoads): LoadContext

## Value Objects
- TrainingLoad (number, unit: "Aurora Load Units")
- LoadContext (value: float, percentile: 0-100, trend: "up/down/stable")

## Preguntas abiertas
- ¿Qué hacemos si faltan datos de una semana?
- ¿12 semanas de histórico es suficiente o queremos más?
```

**Por qué es importante**:
- Fuerza el diseño antes de implementar.
- Identifica conflictos conceptuales.
- El código que vendrá se alinea con el dominio.

---

## Paso 4: Technical Spec

**Responsable**: Staff Engineer.

**Duración**: 4-8 horas.

**Pregunta clave**: "¿Cómo implementamos esto sin violar arquitectura?"

**Contenido**:

```markdown
# Technical Spec: [Nombre]

## Cambios de datos
- Nueva tabla? Nuevas columnas?
- Migración necesaria?

## Cambios de API
- Nuevos endpoints?
- Datos nuevos en respuesta?

## Cambios en contextos
```

**Ejemplo**:
```markdown
# Technical Spec: Weekly Load Contextualizer

## Data Changes
- Table `athlete_weekly_metrics`:
  - week_start: DATE
  - week_end: DATE
  - athlete_id: UUID
  - total_load: INTEGER
  - percentile_vs_historical: INTEGER (0-100)
  - status: "elevated" | "normal" | "low"

## API Changes
- GET /athlete/{id}/metrics/current
  - Agregar `weeklyLoad`:
    ```json
    {
      "value": 620,
      "unit": "aurora_load_units",
      "historicalAverage": 500,
      "percentile": 78,
      "trend": "up",
      "interpretation": "Estás 24% más duro que tu promedio. OK para una semana de carga."
    }
    ```

## Architecture Changes
- Longitudinal Context: agregar `WeeklyLoadCalculator` service.
- Event listener en Performance Context para recalcular al día cambiar zonas.

## Database Migration
```sql
CREATE TABLE IF NOT EXISTS athlete_weekly_metrics (
  id UUID PRIMARY KEY,
  athlete_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_load INTEGER NOT NULL,
  percentile INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(athlete_id, week_start)
);

CREATE INDEX idx_athlete_week ON athlete_weekly_metrics(athlete_id, week_start DESC);
```

## Cache strategy
- Cache weekly_metrics por 1 hora. Invalidar al nuevo workout.

## Error handling
- Si faltan datos: marcar como "incomplete week" y mostrar contexto "9/7 entrenamientos registrados".
- Si no hay histórico (atleta nuevo): mostrar "insuficiente histórico, vuelve en 4 semanas".
```

---

## Paso 5: Acceptance Criteria

**Responsable**: Product + Staff Engineer.

**Duración**: 30 minutos.

**Formato**: Checklist que se vuelve tests.

**Ejemplo**:
```markdown
# Acceptance Criteria: Weekly Load Contextualizer

## Happy path
- [ ] Atleta con 12+ semanas de histórico ve carga semanal + contexto.
- [ ] Contexto muestra: valor, promedio, percentil, interpretación.
- [ ] Interpretación es clara: "Estás más duro que de costumbre. Considera descansar."

## Edge case: New athlete
- [ ] Atleta con < 4 semanas de histórico ve carga pero NO comparación.
  - Mensaje: "Insuficiente histórico. Vuelve en 4 semanas para comparar."

## Edge case: Cambio de FTP
- [ ] Si FTP cambia, carga semanal previa se marca como "requiere recálculo".
- [ ] Recálculo es asincrónico y transparente.
- [ ] Atleta ve: "Tus datos de carga fueron recalculados. Puede haber cambios."

## Edge case: Incomplete week
- [ ] Si falta el 50%+ de entrenamientos esperados en la semana:
  - Mostrar: "Semana incompleta (3/7 entrenamientos). Las comparaciones pueden no ser precisas."

## Performance
- [ ] Cálculo de carga semanal < 100ms para atleta típico.

## No-requirements (out of scope)
- [ ] No mandamos notificaciones (todavía).
- [ ] No sugerimos entrenamientos basado en carga (eso es Coaching Context).
```

---

## Paso 6: Implementation

**Responsable**: Engineer (posiblemente con Claude Code).

**Criterios**:
- Código implementa 100% de Acceptance Criteria.
- Código respeta Domain Spec (no hay shortcutts).
- Tests pasan.
- Code review verifica contra Spec.

**Diferencia importante**: No empezamos coding hasta tener claro los Pasos 1-5.

---

## Paso 7: Review

**Responsable**: Code Reviewer.

**Preguntas**:
- ¿Esto respeta el Domain Spec?
- ¿Pasa todos los Acceptance Criteria?
- ¿El código habla el lenguaje ubicuo?

**No es**:
- ¿Me gusta el nombre de la variable?
- ¿Este foreach podría ser un map?

---

## Paso 8: Release

**Responsable**: Deployment team / Product.

**Antes de soltar a usuarios**:
- [ ] Feature flag listo (apagado por defecto).
- [ ] Rollback plan documentado.
- [ ] Observabilidad instrumentada.
- [ ] Usuarios beta confirmados.

---

## Plantilla para especificación

Copiar esto para cada feature:

```markdown
# Spec: [Feature Name]

| Campo | Valor |
|---|---|
| **Estado** | Idea · Product Brief · Domain Spec · Tech Spec · Accepted · Implementing · Review · Released |
| **Product Brief Link** | [link] |
| **Domain Spec Link** | [link] |
| **Tech Spec Link** | [link] |
| **Target Release** | [fecha] |

## Summary
[Una frase del por qué existe.]

## Acceptance Criteria
- [ ]
- [ ]
- [ ]

## Known risks
- 
-
```

---

## Reglas de oro

1. **No saltes pasos.** Ideas que saltan Domain Spec caen en la implementación.

2. **Una idea por feature.** Si tocas 3 contextos, probablemente son 3 features.

3. **Colaboración asincrónica.** Product escribe Brief mientras Engineering prepara Domain Spec.

4. **Revisión de spec es tan importante como revisión de código.** Un Domain Spec malo produce código malo.

5. **Specs son vivas.** Si durante implementación la realidad contradice la spec, actualizá la spec y comunicá.

---

Anterior: [`../ADR-001-engine-separation.md`](../architecture/adr/ADR-001-engine-separation.md) · Volver a [`../`](../)
