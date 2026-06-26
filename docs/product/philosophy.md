# Filosofía de Diseño

## No construimos dashboards

Un dashboard es:
- Una colección de gráficos y números.
- Bonito de mirar.
- Fácil de ignorar.

Los dashboards asumen que el usuario va a interpretar los datos y sacar conclusiones.

Eso no funciona. El usuario mira números, se siente bien o mal, y sigue entrenando igual.

## Construimos decisiones

Una decisión es:
- Una conclusión específica basada en datos.
- Accionable: el usuario puede hacer algo con ella.
- Explicable: el usuario entiende por qué.

Ejemplos de decisión:
- "Estás en riesgo de sobreentrenamiento. Deberías reducir volumen esta semana."
- "Tu potencia aeróbica subió 5%. Podés intentar entrenamientos más duros."
- "Has estado cansado toda la semana. Descansa mañana."

Ejemplos de NO decisión:
- "Tu potencia pico fue 487W." (¿Y qué?)
- "Acumulaste 3.500 kcal esta semana." (¿Está bien?)
- "Tu FC máxima fue 182 bpm." (¿Me importa?)

## Cada feature debe mejorar una decisión del atleta

Pregunta de filtro:

**"Si implementamos esta feature, ¿el atleta va a cambiar algo en su próximo entrenamiento?"**

Si la respuesta es "no", no la hacemos.

### Ejemplo: Detección de Potencia Anaeróbica

Feature proposal: "Mostrar el pico de potencia de cada entrenamiento."

**Mejora una decisión del atleta?** No necesariamente.

Replanteamiento: "Detectar si la potencia anaeróbica del atleta subió este mes. Si subió, sugerir entrenamientos más intensos en la próxima semana."

**Mejora una decisión del atleta?** Sí. Cambia lo que hace el entrenador.

## Los datos nunca son el objetivo

Los datos son un medio, no un fin.

No perseguimos:
- Más métricas.
- Más precisión.
- Más decimales.

Perseguimos:
- Decisiones mejores.
- Mayor confianza del atleta.
- Resultados observables en competencias.

## Diseño de features

Cuando pensemos una feature, este es el flujo:

```
Problema del atleta
    ↓
¿Hay datos que lo resuelvan?
    ↓
¿Podemos procesarlos inteligentemente?
    ↓
¿Producen una acción específica?
    ↓
Feature
```

Si falla una pregunta, no seguimos.

## Explainability como requisito

Cualquier métrica, score o conclusión de AURORA debe poder explicarse en una frase:

❌ Mala: "Tu Aurora Index es 74."
✅ Buena: "Estás en forma óptima. Tu potencia y resistencia están al pico. Es momento de competir."

❌ Mala: "Training Load: 450."
✅ Buena: "Acumulaste mucho estrés esta semana. Recomendamos descansar 2 días antes del próximo entrenamiento fuerte."

Si no podemos explicarlo simple, no es un concepto válido.

## Longitudinal, no puntual

Un punto de datos aislado no tiene significado.

Contexto necesario:
- ¿En relación a qué?
- ¿En comparación con cuándo?
- ¿Mejor o peor?

### Ejemplo: Potencia Normalizada

Puntual: "Tu NP fue 275W en el entrenamiento de hoy."
Longitudinal: "Tu NP en entrenamientos de Z4 fue 275W. Es 8W más fuerte que hace 4 semanas. Vas en buena dirección."

## Fidelidad a la fisiología

AURORA es honesta con los límites de la ciencia.

**Cuando sabemos algo con confianza**, lo decimos claro:
- "La fatiga acumulada aumenta el riesgo de lesión."

**Cuando hay incertidumbre**, la comunicamos:
- "Es probable que estés fatigado, pero no hay certeza. Considera descansar."

**Cuando es especulación**, lo marcamos:
- "Basado en tus patrones históricos, probablemente seas más fuerte en terreno montañoso. Pero es una hipótesis."

Nunca damos como hecho lo que es especulación.

## El atleta, no la máquina

AURORA asesora al atleta. El atleta decide.

AURORA nunca dice: "Tienes que entrenar mañana."
AURORA dice: "Si entrenas mañana después de una semana de carga alta, aumentas riesgo de lesión. ¿Quieres?"

El atleta es responsable. Nosotros, los asesores.

## Privacidad como principio

Los datos del atleta son sagrados.

Nunca:
- Los vendemos.
- Los analizamos para publicidad.
- Los compartimos sin consentimiento explícito.

El atleta elige qué compartir: con su coach, con sus amigos, con nadie.

---

Anterior: [`vision.md`](./vision.md) · Siguiente: [`roadmap.md`](./roadmap.md)
