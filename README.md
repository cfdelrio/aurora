# AURORA

> Inteligencia de rendimiento deportivo.
> 
> Transformamos datos de entrenamiento en mejores decisiones.

## Qué es AURORA

AURORA es una plataforma de **inteligencia de rendimiento** para atletas de resistencia (ciclismo, running, triatlón) que quieren entender su progreso y tomar mejores decisiones de entrenamiento.

No somos un dashboard. No somos un rastreador de GPS. No somos un reemplazo del entrenador.

Somos un **sistema de decisión basado en datos**.

## El problema que resolvemos

Los atletas generan toneladas de datos en cada entrenamiento — potencia, ritmo cardíaco, cadencia, GPS — pero el 99% de esos datos termina enterrado en apps que muestran gráficos bonitos sin conclusiones accionables.

El atleta sabe **qué hizo**, pero no:
- **Qué significa** (¿fue un buen entrenamiento?)
- **Cómo está progresando** (¿más fuerte o más cansado?)
- **Qué hacer al respecto** (¿aumentar volumen o descansar?)

La incertidumbre es el verdadero enemigo del atleta.

## Lo que NO somos

- **No somos Garmin**: no vendemos dispositivos ni reemplazamos la recopilación de datos.
- **No somos Strava**: no somos una red social ni un competidor de segmentos.
- **No somos TrainingPeaks**: no planificamos temporadas (todavía) ni reemplazamos al entrenador de elite.

## Cómo funciona (conceptualmente)

```
Datos crudos (FIT)  →  Normalización  →  Motor de análisis  →  Decisiones  →  Atleta
                        (agnóstico)        (dominio)           (accionables)
```

AURORA toma archivos de entrenamiento de cualquier dispositivo (Garmin, Wahoo, Apple Watch), los convierte en un lenguaje común, los procesa a través de un motor de análisis que entiende fisiología deportiva, y produce conclusiones que el atleta puede actuar.

## Documentación

Este repo sigue el **[Engineering Playbook](https://github.com/cfdelrio/engineering-playbook)** como fuente de verdad.

- **[`MANIFESTO.md`](./MANIFESTO.md)** — por qué existe AURORA.
- **[`docs/product/`](./docs/product)** — visión, filosofía, roadmap.
- **[`docs/domain/`](./docs/domain)** — lenguaje ubicuo, modelo de dominio, glossario.
- **[`docs/architecture/`](./docs/architecture)** — decisiones arquitectónicas.
- **[`docs/specs/`](./docs/specs)** — proceso de especificación.

## Cómo comenzar un sprint

1. Leé el [`MANIFESTO.md`](./MANIFESTO.md) y [`docs/product/vision.md`](./docs/product/vision.md) para entender el contexto.
2. Revisá el [`docs/domain/ubiquitous-language.md`](./docs/domain/ubiquitous-language.md) — es el diccionario oficial.
3. Si escribís código, verificá que usa los términos del dominio sin traducción.
4. Cualquier decisión arquitectónica va como un ADR en [`docs/architecture/adr/`](./docs/architecture/adr/).
5. Cualquier feature comienza con una spec en [`docs/specs/`](./docs/specs/).

## Estado

**Phase**: Foundation design.

Estamos construyendo el dominio y la arquitectura. El código viene después.

## Filosofía general

- **Domain First** — el lenguaje del negocio manda.
- **Decision First** — cada feature debe mejorar una decisión del atleta.
- **Athlete First** — diseñamos para el usuario, no para la tecnología.
- **Explainability** — si no podemos explicar por qué AURORA dice algo, no lo decimos.
- **Longitudinal Intelligence** — el valor está en el tiempo, no en un punto aislado.
- **Human Before AI** — la IA amplifica, pero el criterio humano decide.

---

Siguiente: [`MANIFESTO.md`](./MANIFESTO.md)
