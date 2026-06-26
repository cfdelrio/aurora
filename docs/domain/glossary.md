# Glosario oficial

> Referencia rápida de términos de AURORA.

## A

**Acute Load** — Carga de entrenamiento acumulada en la última semana. Indicador del estrés actual.

**Anaerobic Power** — Potencia máxima sostenible en esfuerzos cortos (30 segundos a 3 minutos). Medida en vatios.

**Aurora Index** — Métrica holística (0-100) que resume el estado actual del atleta: forma, recuperación, riesgo. No es un score arbitrario; es una síntesis de datos.

---

## B

**Base Zone** — Zona 2 de entrenamiento. Intensidad moderada, aeróbica. Construye resistencia. 55-75% FTP, 82-89% FTHR.

**Bounded Context** — Límite explícito dentro del dominio donde un conjunto de conceptos específicos viven y se comunican. AURORA tiene 5 contextos: Ingestion, Performance, Longitudinal, Prediction, Coaching.

---

## C

**Chronic Load** — Carga de entrenamiento acumulada en las últimas 4 semanas. Indicador de la adaptación a largo plazo.

**Coach** — En AURORA, no es una persona; es el sistema que genera recomendaciones. El coach humano sigue siendo el jefe.

**Coach Insight** — Recomendación accionable con explicación y grado de confianza.

**Cadence** — Revoluciones por minuto (ciclismo) o pasos por minuto (running). Métrica.

**Competition Window** — Período estimado en el que estás en forma óptima para competir. Basado en patrones históricos y carga actual.

---

## D

**Domain** — El campo de conocimiento: fisiología del ejercicio, coaching, análisis de datos de entrenamiento.

**Domain-Driven Design (DDD)** — Enfoque arquitectónico donde el dominio (no la tecnología) guía el diseño.

---

## E

**Event** — Ver Race Profile.

---

## F

**Fatigue** — Acumulación de estrés que reduce capacidad de rendimiento. Estados: Fresh, Fatigued, Overreached, Overrained.

**Form** — Estado de preparación física. Síntesis de carga aguda, crónica y tendencia. Estados: Building, Optimal, Fading.

**FTP** — Functional Threshold Power. Potencia máxima sostenible durante ~1 hora. Medida en vatios. Base de todos los cálculos de potencia.

**FTHR** — Functional Threshold Heart Rate. Ritmo cardíaco correspondiente a FTP. Medida en bpm. Base de zonas de FC.

---

## G

**Gap** — Sección de un entrenamiento donde faltan datos. Se marca explícitamente, no se inventan datos.

---

## H

**Heart Rate** — Ritmo cardíaco, medido en ppm (beats per minute).

---

## I

**Intensity Factor** — Ratio de intensidad normalizado (0-2.0). Compara la intensidad del entrenamiento con el umbral del atleta.

---

## L

**Load Balance** — Ratio entre carga aguda y crónica. Indicador de cómo está la tensión actual.

---

## M

**Metric** — Una medida específica: potencia, FC, cadencia, etc. No es genérico.

---

## N

**Normalized Workout** — Representación canónica de un entrenamiento, agnóstica del dispositivo. Streams en unidades estándar.

---

## O

**Overreached** — Estado de fatiga donde ya hay compromiso del rendimiento pero potencialmente reversible con descanso.

**Overrained** — Estado de fatiga extrema. Requiere días a semanas de recuperación. Riesgo de lesión.

---

## P

**Performance** — Capacidad medida del atleta. Expresada en: FTP, FTHR, VO2Max, Anaerobic Power.

**Prediction** — Estimación del futuro basada en patrones históricos. Siempre con grado de confianza.

---

## R

**Race Profile** — Definición de una competencia objetivo. Incluye fecha, distancia, terreno, forma objetivo.

**Recovery** — Capacidad de recuperarse de la carga. Medida por múltiples factores: días desde último esfuerzo, FC de reposo, etc.

**Recovery Needed** — Horas estimadas para recuperarse completamente de un entrenamiento.

**Readiness** — Capacidad actual para rendir al máximo. Baja / Media / Alta.

---

## S

**Stream** — Serie temporal de una métrica específica (potencia, FC, etc) a lo largo de un entrenamiento.

---

## T

**Tempo Zone** — Zona 3 de entrenamiento. Intensidad sub-umbral, comienza a ser ardua. 75-90% FTP, 89-93% FTHR.

**Training Cycle** — Bloque de tiempo con objetivos específicos. Semana, mes, bloque, temporada.

**Training Load** — Estrés acumulado de un entrenamiento. Medido por TSS o similar.

**Training Stress Score (TSS)** — Métrica de carga. 0-500+ típicamente. `TSS = (Duración en horas × Potencia Media × IF) / FTP / 3600`.

**Threshold Zone** — Zona 4 de entrenamiento. Cerca del umbral, duro mantener. 90-105% FTP, 93-97% FTHR.

---

## U

**Ubiquitous Language** — Lenguaje compartido entre dominio y código. Sin traducciones, sin sinónimos.

---

## V

**VO2 Max** — Consumo máximo de oxígeno. Capacidad aeróbica máxima. Medida en ml/kg/min.

**VO2Max Zone** — Zona 5 de entrenamiento. Muy duro. Entrenamientos de duración corta a media. 105-120% FTP, 97-100% FTHR.

---

## W

**Workout** — Una sesión individual de entrenamiento registrada por un dispositivo. Equivalente a "salida", "actividad", "sesión" en otros sistemas, pero en AURORA es singular y oficial.

---

## Z

**Z1 — Recovery Zone** — < 55% FTP, < 82% FTHR. Fácil, recuperación.

**Z2 — Base Zone** — 55-75% FTP, 82-89% FTHR. Construye resistencia.

**Z3 — Tempo Zone** — 75-90% FTP, 89-93% FTHR. Sub-umbral.

**Z4 — Threshold Zone** — 90-105% FTP, 93-97% FTHR. Cerca del umbral.

**Z5 — VO2Max Zone** — 105-120% FTP, 97-100% FTHR. Muy duro.

**Z6 — Anaerobic Zone** — > 120% FTP. Esfuerzos cortos máximos.

---

Volver a [`ubiquitous-language.md`](./ubiquitous-language.md)
