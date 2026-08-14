# Aurora — Athlete Home Athlete Review Protocol (preparation package)

> **Status (2026-07-07).** Docs-only, review-preparation-only. **This document prepares a
> structured review with real athletes; it does not conduct one, does not fabricate participant
> results, and does not mark Athlete Home as athlete-validated.** No source code, test, sample
> scenario, view model, renderer, or package file is touched. The current implementation
> (`4327f8a`) is the FIXED test stimulus — nothing about it is improved, explained away, or
> corrected in this document. Base: `tsc --noEmit` clean; `node --test` **1151/1151**. Location
> follows the `docs/product-design/` convention established by 045-C/045-E. Not numbered "045-F" —
> this is a research-operations package, not another product-design decision artifact in that
> lettered sequence.

```text
review package ready for execution ≠ athlete-validated
protocol existing ≠ evidence existing
```

---

## 0. Discovery — the fixed experience under test

`[FACT]` Verified directly against commit `4327f8a` at authorship (working tree clean, baseline
`1151/1151`), by generating the current prototype through the approved path
(`node src/athlete-home/sample/generate-athlete-home-page.ts`) and reading its rendered text and
screenshots (mobile 375px collapsed/expanded, desktop 1280px collapsed/expanded — the same states
already captured during Review 045-E and the 045-E surgical pass, unchanged since, re-confirmed by
extracting the current generated page's text verbatim rather than trusting the prior review's
quotes).

Exact current athlete-facing content, by category:

```text
interpretation (headline, visible without opening a fold) :
  "Aurora piensa que tu tolerancia al trabajo sostenido podría estar bajo carga acumulada."
  tagged: "interpretación de Aurora"

observation (attention section, primary line, visible without opening a fold) :
  "HR por encima del rango esperado junto a un reporte subjetivo de pesadez"

purpose relevance (attention section, visible without opening a fold) :
  "Esto pasó en una sesión de umbral — el mismo tipo de esfuerzo sostenido que tu preparación
  para el 200 mariposa necesita entrenar. Por eso esta lectura podría ser relevante para cómo
  se está construyendo esa preparación."

uncertainty (attention section, visible without opening a fold) :
  "Esto es una interpretación con incertidumbre visible, no una certeza."

agency (attention section + footer, visible without opening a fold) :
  "Aurora no decide por vos. Te muestra lo que ve."
  "Aurora interpreta; no dictamina. Todo lo inferido puede cambiar con nueva evidencia. La
  decisión es siempre tuya."

"Entender" fold (collapsed by default — requires an explicit tap/click) :
  "Antes de mostrarte esto, Aurora comprobó que hay evidencia que lo sostiene, te conoce lo
  suficiente en este tema, no contradice lo que declaraste, no implica un riesgo que amerite
  más cautela, te lo muestra de un modo que te deja decidir."
  "Esto podría cambiar si: una respuesta normal de HR en la próxima sesión."

direction/purpose (own section, declared) :
  "Preparar el 200 mariposa de noviembre" — tagged "declarado por vos"

understanding (own section) :
  "tolerancia al trabajo sostenido" / "confianza en construcción — evidencia inicial
  consistente" — its own "Por qué" fold: "Ya viste una situación similar antes, y lo que pasó
  confirmó esta lectura."

honest absence (own section, single consolidated block) :
  "Aurora todavía no construyó una forma de leer esto con la misma disciplina que el resto de
  esta página. Antes que inventar un número, prefiere decírtelo." — "Qué falta" fold: "cómo
  estás hoy" / "tu capacidad" / "cómo está cambiando tu entrenamiento en el tiempo"
```

No code was edited to produce this report — it is a direct transcription of the generated page.

---

## 1. Research objective

Exact product questions under test:

```text
1. Can an athlete, unprompted, state Aurora's current interpretation in their own words?
2. Can an athlete identify the concrete observation behind that interpretation?
3. Can an athlete describe Aurora's confidence/uncertainty without overestimating what Aurora
   knows?
4. Can an athlete identify what Aurora does NOT know, without the absence section dominating
   their account of the page?
5. Can an athlete connect the observation to their own preparation purpose — specifically,
   does "same broad type of sustained effort" land as intended, without being over-read as a
   diagnosis, a cause, a readiness verdict, or a training prescription?
6. Can an athlete identify what deserves their attention right now, in their own words?
7. Can an athlete correctly state who decides what happens next?
8. Does the "Entender" fold help, confuse, or go unused — and if opened, does it read as
   case-specific reasoning or as governance description?
9. What does the athlete notice first, second, third — and how does that order compare to the
   intended hierarchy (interpretation → observation → relevance → uncertainty/limits → depth)?
```

This is comprehension and trust research. It is explicitly NOT a preference study, NOT a usability
timing study, and NOT a technical evaluation of the implementation.

---

## 2. Participant profile

```text
target sample size        : 5–7 athletes (formative, not statistically representative — enough
                             to expose repeatable comprehension failures, per Nielsen-style
                             small-sample qualitative practice already implicit in "formative").
eligibility                : any athlete who trains toward a goal they can name (race, event,
                             season, or personal target) — must NOT require prior familiarity
                             with Aurora, this repository, or software architecture.
desired diversity (not all required per participant, but across the sample) :
  - competitive vs. recreational training orientation
  - higher vs. lower comfort reading/interpreting their own training data
  - regular users of Garmin/Strava/similar apps vs. those who do not use one
  - varying familiarity with AI-driven products (from none to daily use)
exclusions                 : no requirement to swim, run threshold sessions, or share the
                             sample's specific sport — the review tests GENERAL comprehension of
                             the page's story shape, not sport-specific accuracy. A participant
                             training for any goal-oriented event is eligible; swimmers are not
                             required, since the test is whether the page's STRUCTURE
                             (interpretation -> observation -> relevance -> uncertainty ->
                             agency) transfers, not whether this exact swim scenario matches
                             their own training.
recruitment note           : recruit for diversity of interpretation risk, not convenience —
                             actively include at least one participant with LOW comfort reading
                             training data and at least one with HIGH comfort, since comprehension
                             failure risk differs by segment.
```

---

## 3. Moderator script

### 3.1 Neutral introduction (read approximately as written)

> "Gracias por tu tiempo. Te voy a mostrar una pantalla de un producto que estamos desarrollando.
> No es necesario que sepas nada de este producto de antemano — de hecho, es mejor si no sabés
> nada. Te voy a pedir que la mires y me cuentes, con tus propias palabras, qué entendés. No hay
> respuestas correctas o incorrectas: lo que buscamos es entender qué le transmite la pantalla a
> alguien que la ve por primera vez, así que si algo no se entiende, esa también es información
> valiosa para nosotros. Vas a poder interactuar con la pantalla libremente. Grabo la sesión solo
> para no perder detalles; no se comparte con nadie fuera de este trabajo. ¿Alguna pregunta antes
> de empezar?"

**Moderator must NOT, before or during Section 3.4 (unprompted interpretation):** mention fatigue,
mention threshold work, mention the 200-butterfly connection, mention uncertainty, mention "what
Aurora meant," or paraphrase any page content in advance.

### 3.2 Initial page exposure

Show the generated page (mobile viewport preferred as primary device; if session is remote/desktop,
show both mobile and desktop states per §3.8). Give the participant ~30–60 seconds of silent
reading before asking anything. Do not narrate while they read.

### 3.3 Unprompted interpretation (mandatory, verbatim capture)

Ask exactly:

> "Contame con tus palabras qué entendés que te está diciendo esta pantalla."

- Let the participant speak fully before any follow-up.
- Use only neutral continuers if they stall: "¿Algo más?" / "Contame más sobre eso."
- Record as close to verbatim as possible (§4).
- Do NOT correct, clarify, or hint at this stage, even if the participant is visibly off-track.

### 3.4 Targeted comprehension questions (after §3.3 is fully captured)

Ask in this order, neutrally, one at a time, allowing the participant to answer before moving on:

```text
Q1 : "Según lo que ves, ¿qué es lo que Aurora piensa sobre vos hoy?"
Q2 : "¿Por qué pensás que Aurora llegó a esa idea? ¿Qué vio?"
Q3 : "¿Qué tan segura te parece que está Aurora de esto?"
Q4 : "¿Hay algo que la pantalla te diga que Aurora TODAVÍA NO sabe o no puede decirte?"
Q5 : "¿Por qué te parece que esto podría importar para tu entrenamiento o tu objetivo?"
Q6 : "Si tuvieras que elegir una sola cosa de esta pantalla que merece tu atención hoy, ¿cuál
      sería?"
Q7 : "Después de ver esto, ¿quién decide qué hacer con esa información?"
```

Do not read the "intended" answer at any point. If the participant asks "¿lo estoy haciendo bien?"
respond: "No hay una respuesta correcta — quiero saber qué te transmite a vos."

### 3.5 Interaction with the fold (natural behavior first)

Ask:

> "Sentite libre de tocar o explorar cualquier parte de la pantalla que te den ganas de mirar más
> de cerca."

Observe without prompting:
- whether they open "Entender" unprompted;
- what they say right before opening it (their expectation);
- their reaction after reading it (confusion, reassurance, no change).

If they do NOT open any fold within a reasonable browsing period, ask:

> "¿Viste que hay una parte que dice 'Entender'? ¿Te genera ganas de tocarla? ¿Por qué sí o por
> qué no?"

Only THEN, if they still haven't opened it, ask them to open it and read, then ask:

> "Ahora que lo leíste, ¿cambia en algo lo que entendías antes?"

### 3.6 Trust and uncertainty questions

Ask, in order:

```text
"¿Qué harías con esta información?"
"¿Sentís que la pantalla te está diciendo que hagas algo en particular?"
```

Only after both open questions are answered, probe specific misconceptions neutrally (§6) — never
as a leading yes/no ("¿Aurora te está diagnosticando fatiga, no?"); instead: "Algunas personas, al
ver esto, piensan que Aurora está diagnosticando algo médico. ¿Vos sentiste eso, o no? Contame por
qué."

### 3.7 Decision-ownership questions

```text
"¿Sentís que la decisión de qué hacer en tu próximo entrenamiento es tuya, de Aurora, o de las
dos partes de alguna manera?"
"¿Qué esperarías que pase después de ver esto? ¿Aurora te va a decir algo más, o se queda acá?"
```

### 3.8 Information hierarchy recall

```text
"¿Qué fue lo primero que te llamó la atención de la pantalla?"
"¿Qué otra cosa recordás de la pantalla, sin volver a mirarla?"
"De todo lo que viste, ¿qué parte sentiste que era la más importante?"
```
Ask these WITHOUT the page visible if feasible (recall, not re-reading), then optionally allow a
second look to check accuracy.

### 3.9 Final reflection (open, catch-all)

```text
"¿Hay algo que te haya generado dudas o que no te haya quedado claro?"
"¿Algo que quieras agregar?"
```

### 3.10 Device coverage

If time and setup allow, repeat §3.2–3.3 briefly on the second viewport (mobile if desktop was
first, or vice versa) with a shortened pass: "Mirá esta otra versión — ¿cambia algo de lo que me
dijiste antes?" This is optional and time-boxed; do not let it push the session past ~25 minutes.

**Target total session length: 15–25 minutes.**

---

## 4. Observation sheet (per participant)

```text
Participant ID                    : A0_
Session date / moderator          :
Training background (non-identifying) :
  - competitive / recreational (self-described)
  - primary sport(s) / goal-oriented event, if any
  - comfort with training data (low / medium / high, self-rated)
  - uses Garmin/Strava/similar (yes/no, which)
  - familiarity with AI products (none / occasional / daily)

§3.3 Unprompted interpretation (verbatim or near-verbatim) :
  "...."

Q1 answer (verbatim/paraphrase) + rating (CLEAR / PARTIALLY CLEAR / UNCLEAR) :
Q2 answer + rating :
Q3 answer + rating :
Q4 answer + rating :
Q5 answer + rating :
Q6 answer + rating :
Q7 answer + rating :

Fold behavior:
  - opened unprompted? (yes/no) — if yes, when / why (stated expectation)
  - reaction after reading (confusion / reassurance / no change) — quote
  - if never opened, why (stated reason)

Trust/agency probe:
  - "¿Qué harías con esta información?" — answer
  - "¿Sentís que te está diciendo que hagas algo?" — answer
  - misconceptions detected (checklist, §6) — which, and exact quote triggering it

Hierarchy recall:
  - first noticed :
  - second recalled :
  - "most important" :
  - comparison to intended order (interpretation -> observation -> relevance ->
    uncertainty/limits -> depth) : match / partial / mismatch

Direct quotes worth preserving :
Hesitations / long pauses (where, on which question) :
Elements never noticed or never mentioned :
Moderator notes (context, anomalies, technical issues) :
```

Non-identifying storage only — no name, no contact info, no exact age, no employer, no precise
location beyond what the training-background fields above require.

---

## 5. Q1–Q7 rating rubric (rate from observed evidence, not moderator belief)

```text
General rule: a rating is CLEAR only if the participant demonstrates the understanding
INDEPENDENTLY (in §3.3 or §3.4's own question) or with only NEUTRAL, non-leading prompting
(a repeated open question, never a suggested answer). If understanding appears only after the
moderator explains, paraphrases, or confirms a specific reading, the rating is NOT CLEAR —
downgrade to PARTIALLY CLEAR or UNCLEAR as appropriate, and note "post-explanation" in the sheet.

Q1 — Aurora's interpretation
  CLEAR            : states, in their own words, the substance of the claim (tolerance to
                     sustained effort, possibly under accumulated load) — does not need exact
                     vocabulary, needs the CONCEPT.
  PARTIALLY CLEAR   : identifies that Aurora "has an opinion/reading" but cannot state its
                     content, or states it only partially/vaguely.
  UNCLEAR           : cannot state that Aurora has any specific interpretation, or states
                     something unrelated to the page's actual claim.

Q2 — supporting observation
  CLEAR            : names the concrete observation (elevated HR + subjective heaviness/report)
                     without being told to reread the page.
  PARTIALLY CLEAR   : recalls that "something Aurora saw" supports it, but cannot name what.
  UNCLEAR           : believes the interpretation has no stated basis, or invents a basis not on
                     the page.

Q3 — confidence/uncertainty
  CLEAR            : correctly describes this as tentative/not-certain AND does not claim more
                     confidence than the page states (no "Aurora is sure," no invented percentage).
  PARTIALLY CLEAR   : notices uncertainty exists but cannot describe it specifically, or slightly
                     over/under-states it.
  UNCLEAR           : believes Aurora is certain, OR believes Aurora has no opinion at all.

Q4 — what Aurora does not know
  CLEAR            : names at least one real gap (current state / capacity / trajectory) in their
                     own words, without it dominating their overall account of the page.
  PARTIALLY CLEAR   : recalls "there's a section about things it doesn't know" without specifics,
                     OR names it but it dominates their whole summary of the page.
  UNCLEAR           : does not recall or notice any stated limitation.

Q5 — purpose relevance (the most strictly evaluated question)
  CLEAR            : connects the observation to the SAME BROAD TYPE OF EFFORT as their
                     preparation goal, in their own words, WITHOUT asserting physiological
                     damage, causal proof, reduced readiness, inability to race, or a
                     rest/training-change prescription.
  PARTIALLY CLEAR   : senses relevance exists ("tiene que ver con mi entrenamieno") without
                     articulating the mechanism, OR articulates the mechanism only after a neutral
                     re-prompt.
  UNCLEAR           : cannot connect it to their goal at all, OR over-interprets into diagnosis/
                     prescription/readiness territory (this is BOTH an UNCLEAR rating AND a
                     misconception per §6 — record both).

Q6 — attention
  CLEAR            : names the concrete observation (same as Q2) or the interpretation itself as
                     "the thing that matters right now," not a category label ("algo sobre mí").
  PARTIALLY CLEAR   : gestures at "the attention section" without naming its content.
  UNCLEAR           : cannot identify anything as deserving attention, or names an unrelated
                     section (e.g., the gap section) as the primary one.

Q7 — decision ownership
  CLEAR            : states unprompted that they decide, Aurora only shows/frames.
  PARTIALLY CLEAR   : states it only after the neutral trust-probe questions (§3.6), not at Q7
                     itself.
  UNCLEAR           : believes Aurora decided something, prescribed an action, or that no
                     decision remains.
```

---

## 6. Misconception checklist (mark present/absent per participant, with the triggering quote)

```text
[ ] believes Aurora is diagnosing a medical/physiological condition
[ ] believes Aurora knows the CAUSE of the observation (not just that it occurred)
[ ] believes Aurora has determined the athlete is under-recovered / not ready
[ ] believes Aurora is recommending rest
[ ] believes Aurora is recommending a training change
[ ] believes a specific action is expected of them right now
[ ] believes the interpretation is a settled fact, not a defeasible reading
[ ] believes the "not-yet-modeled" section means Aurora failed or is broken
[ ] believes the "Entender" fold is a settings/technical panel unrelated to this case
[ ] any other invented claim not present on the page (record verbatim)
```
Each checked item must carry the exact quote or paraphrase that justified marking it — no
misconception is recorded on inference alone.

---

## 7. Synthesis matrix (across all participants, after all sessions)

```text
| Participant | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Fold opened? | Misconceptions | Hierarchy match |
|-------------|----|----|----|----|----|----|----|--------------|-----------------|------------------|
| A01         |    |    |    |    |    |    |    |              |                 |                  |
| A02         |    |    |    |    |    |    |    |              |                 |                  |
| ...         |    |    |    |    |    |    |    |              |                 |                  |
```

Below the matrix, synthesize (only after real data exists):
```text
- per-question CLEAR/PARTIALLY CLEAR/UNCLEAR distribution
- repeated verbatim phrases across >=2 participants (candidate patterns, not single-participant
  anecdotes)
- misconceptions appearing in >=2 participants (candidate systemic issues)
- misconceptions appearing in exactly 1 participant (recorded, NOT treated as systemic)
- fold-opening rate and what it changed when opened
- hierarchy-match rate against the intended order
- explicit separation: comprehension defects vs. preference feedback (§8 of this protocol,
  Preference feedback category) — preference remarks go in their own list, never folded into the
  comprehension counts
```

---

## 8. Predefined decision thresholds (defined BEFORE any session — do not adjust after seeing data)

```text
Option A — comprehension holds
  use when : no repeated (>=2 participant) critical misconception (§6); Q1/Q2/Q5/Q6 are CLEAR or
             PARTIALLY CLEAR for the clear majority of participants with no UNCLEAR cluster on any
             single question; the decision-ownership boundary (Q7 + §3.6/3.7) is understood by
             the clear majority without post-hoc correction.
  result   : "Athlete Home comprehension is sufficiently validated to move to the next product
             question." (That next question is NOT decided by this protocol — it is a separate,
             future decision, per the standing sequence gate.)

Option B — targeted remediation needed
  use when : one or two REPEATABLE (>=2 participant) comprehension problems appear, localized to
             specific sentences/sections; the underlying product direction (interpretation ->
             observation -> relevance -> uncertainty -> agency) still lands correctly overall;
             the problem looks correctable through focused wording/presentation changes, not
             structural change.
  result   : "Open a narrow remediation pass based only on observed evidence" — scoped exactly to
             the repeated, evidenced problem(s), mirroring the discipline already used in the
             045-E surgical pass (two named findings, nothing broader).

Option C — model/presentation mismatch
  use when : athletes REPEATEDLY (not isolated) construct a meaning materially different from
             Aurora's intent — e.g., a majority pattern of believing Aurora diagnosed, prescribed,
             or asserted readiness/causality the page does not state; the mismatch cannot be
             honestly resolved by rewording because the STRUCTURE itself (what is shown, in what
             order, behind what fold) produces the misreading.
  result   : "Stop presentation iteration and reassess the underlying product model or boundary."
             This is a structural finding, not an instruction to redesign within this protocol —
             the redesign itself is a separate future decision.
```

Critical vs. material vs. preference, defined in advance (mission's own taxonomy, made explicit
here for the synthesis step):
```text
CRITICAL comprehension failure : participant cannot identify Aurora's interpretation; misses the
  observation entirely; believes Aurora diagnosed a condition; believes Aurora prescribed a
  training action; believes Aurora knows a cause the page never establishes.
MATERIAL but non-critical issue : purpose relevance understood only after prompting; uncertainty
  noticed but poorly calibrated; intended-hierarchy mismatch on WHERE important information sits;
  the fold introduces confusion rather than clarity.
PREFERENCE feedback (never promoted to a defect without independent comprehension evidence) :
  wording taste, visual/color opinions, feature requests, "I would want more detail," "I wish it
  looked different."
```

---

## 9. Session discipline — what moderators must never explain or reveal prematurely

```text
Before §3.3 is fully captured, moderators must NOT say or imply:
  - what Aurora "actually means"
  - the words "fatigue," "threshold," "accumulated load," "200 mariposa," "uncertainty," or
    "sustained effort" (let the participant introduce or fail to introduce these themselves)
  - that the page is "supposed to" communicate a specific chain of reasoning
  - whether a participant's reading is "right" or "wrong"
  - the existence or content of the "Entender" fold, before §3.5's natural-behavior observation

At ALL times, moderators must NOT:
  - ask leading yes/no questions before the corresponding open question has been asked and
    answered (§3.6, §6)
  - correct a participant's misreading mid-session (record it; do not fix it live)
  - show the moderator's own opinion of the page, verbally or via tone/expression
  - rush past silence — allow at least 5–10 seconds after each question before re-prompting

This document does not authorize marking Athlete Home as athlete-validated. It authorizes
EXECUTING the protocol above. A verdict (Option A/B/C) may only be assigned after real participant
sessions produce the evidence this document's rubric and thresholds require.
```

---

## 10. Validation & invariants at this preparation package

`tsc --noEmit` clean; `node --test` **1151/1151** (unchanged — this package is docs-only,
review-preparation-only). No source/test/sample/view-model/renderer/package file touched; no
generated HTML or screenshot committed; `4327f8a` and every prior athlete-home commit unmodified;
AC20 untouched.
