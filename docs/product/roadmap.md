# Roadmap a Aurora 1.0

> No funcionalidades. Capacidades.
>
> Una funcionalidad es un botón. Una capacidad es una respuesta a una pregunta del atleta.

## Fase 1: Foundation (Ahora – Q3 2026)

**Objetivo**: Construir el dominio y la arquitectura.

**Capacidades**:
- [ ] Lenguaje ubicuo definido y verificado.
- [ ] Modelo de dominio robusto (conceptos, entidades, agregados).
- [ ] Parser de FIT agnóstico del dispositivo.
- [ ] Normalización de entrenamientos (potencia, FC, GPS, cadencia).
- [ ] Almacenamiento normalizado (sin dependencia de Garmin/Wahoo).

**Entregables**:
- Documentación de dominio.
- ADRs de arquitectura.
- Pipeline de ingesta básico.

**Criterio de éxito**:
- Podemos ingerir archivos FIT de 5+ dispositivos diferentes.
- Datos están normalizados y verificables.
- Arquitectura permite agregar "inteligencia" sin reescribir.

---

## Fase 2: Workout Intelligence (Q4 2026)

**Objetivo**: Entender entrenamientos individuales.

**Capacidades**:
- [ ] Clasificación automática de entrenamientos (base, resistencia, Z4, VO2, especial).
- [ ] Detección de zona de entrenamiento actual del atleta (basada en potencia, FC, etc).
- [ ] Cálculo de carga de entrenamiento (TSS o similar normalizado).
- [ ] Análisis de balance (aeróbico vs anaeróbico).
- [ ] Detección de anomalías (entrenamientos sospechosamente fáciles/duros).

**Pregunta que responde**: "¿Fue un buen entrenamiento?"

**Entregables**:
- Engine de análisis de entrenamientos.
- Algoritmos de clasificación verificados.
- UI básica: resumen post-entrenamiento.

**Criterio de éxito**:
- Atletas ven análisis en <60 segundos tras subir entrenamiento.
- Datos coinciden con criterios de coach experto.
- Un atleta dice: "Me contó cosas sobre mi entrenamiento que yo no sabía."

---

## Fase 3: Performance Engine (Q1 2027)

**Objetivo**: Entender la progresión longitudinal.

**Capacidades**:
- [ ] Cálculo de forma (CTL / ATL / TSB o similar).
- [ ] Detección de tendencias (mejorando, estable, empeorando).
- [ ] Análisis de picos de forma (cuándo fue el último, cuándo viene el próximo).
- [ ] Detección de estados (endurecimiento, acondicionamiento, tapering, recuperación).
- [ ] Identificación de patrones históricos (cuándo mejora este atleta).

**Pregunta que responde**: "¿Cómo estoy progresando? ¿Estoy más fuerte?"

**Entregables**:
- Motor de análisis longitudinal.
- Dashboard de forma y tendencias.
- Alertas de anomalías (fatiga alta, progreso anómalo).

**Criterio de éxito**:
- Atleta ve sus últimas 12 semanas en un gráfico que entiende.
- Las tendencias coinciden con lo que él/ella siente.
- Coach dice: "AURORA entiende lo que está pasando con mis atletas."

---

## Fase 4: Prediction Engine (Q2 2027)

**Objetivo**: Mirar adelante.

**Capacidades**:
- [ ] Predicción de picos de forma (basada en patrones históricos).
- [ ] Estimación de riesgo de sobreentrenamiento o lesión.
- [ ] Proyección de progreso (¿cuándo estaré en mejor forma?).
- [ ] Detección de ventanas competitivas (cuándo tengo máxima forma).
- [ ] Análisis de "qué pasa si" (si sigo este patrón de entrenamiento, ¿qué ocurre?).

**Pregunta que responde**: "¿Qué pasará? ¿Cuándo estaré en forma pico?"

**Entregables**:
- Modelos de predicción.
- Ventanas de forma estimadas.
- Sistema de escenarios.

**Criterio de éxito**:
- Predecir forma 4 semanas adelante con 80%+ de exactitud.
- Coach usa predicciones para planificar entrenamientos.
- Atleta evita lesiones basándose en predicciones.

---

## Fase 5: Coach (Q3 2027)

**Objetivo**: Proponer acciones.

**Capacidades**:
- [ ] Recomendaciones de ajuste de carga (subir, bajar, mantener).
- [ ] Sugerencias de tipo de entrenamiento (qué necesitas esta semana).
- [ ] Alertas de acción inmediata (descansa, entrena fuerte, toma un día fácil).
- [ ] Adaptación de plan (si tienes 2 días libres, qué hacer).
- [ ] Preparación específica para competencia (qué tipos de entrenamientos antes del evento).

**Pregunta que responde**: "¿Qué debería hacer?"

**Entregables**:
- Sistema de recomendaciones.
- Integración con planning (coach puede aceptar/rechazar sugerencias).
- Retroalimentación sobre si funcionó.

**Criterio de éxito**:
- Coach siente que AURORA lo entiende.
- Atleta entrena con más confianza.
- Resultados en competencia mejoran observablemente.

---

## Fase 6: Public Beta (Q4 2027)

**Objetivo**: Usuarios reales. Feedback. Iteración.

**Capacidades**:
- [ ] Interfaz pública (web + mobile).
- [ ] Onboarding de nuevos atletas.
- [ ] Integración con dispositivos (Garmin, Wahoo, Apple, etc).
- [ ] Comunidad (opcional: compartir resultados).
- [ ] Soporte.

**Entregables**:
- Aplicación públicamente disponible.
- Usuarios activos.
- Feedback cuantitativo.

**Criterio de éxito**:
- 100+ atletas activos.
- 70%+ retención a 90 días.
- Atleta cambia entrenamiento basado en AURORA (datos observables).

---

## Lo que NO está en el roadmap (explícitamente)

- **Planificación automática de temporada**: Coach lo hace. AURORA asesora.
- **Competencia contra otros**: Privacidad primero. Vanity después (si acaso).
- **Hardware propio**: Integramos con dispositivos existentes.
- **Análisis de nutrición o sueño**: Fuera de scope (por ahora).
- **Integración con apps de terceros**: Sí, pero después de estabilidad.

## Decisiones de arquitectura asociadas

- **ADR-001**: Por qué el Engine vive separado del parser FIT.
- **ADR-002**: Por qué almacenamos entrenamientos normalizados, no archivos FIT crudos.
- **ADR-003**: Por qué el usuario es el dueño de sus datos, no AURORA.

## Cómo leemos el roadmap

Este roadmap NO es un cronograma fijo.

Las fases son **secuenciales** en términos de capacidades: no hacemos Prediction sin Performance.

Las fechas son **estimaciones**: pueden cambiar según aprendizajes.

Las capacidades pueden **dividirse o combinarse** según lo que aprendamos.

El criterio de éxito es más importante que la fecha.

---

Anterior: [`philosophy.md`](./philosophy.md) · Volver a [`vision.md`](./vision.md)
