# Aurora — Product Design Review 045-C — Athlete Home Visual and Comprehension Review

> **Status (2026-07-07).** Review-only, docs-only. **Expert product-design review — NOT user
> validation, NOT a usability study, NOT athlete research, NOT a production-readiness assessment.**
> No UI code, copy, CSS, test, sample, guard, export, or package file is changed. No framework,
> runtime, backend, production data connection, domain model, or AthleteDecision capture is
> selected. Base: `tsc --noEmit` clean; `node --test` **1136/1136**. Location note: the repo had no
> prior product-design review location (docs/product/ holds early vision documents); this file
> establishes `docs/product-design/` as the mission specified.

```text
expert review finding ≠ observed athlete behavior
```
Nothing below claims "athletes understand this" or "athletes prefer this" — every finding is an
expert reading of the actual rendered artifact against Aurora's product thesis.

---

## 1. State verification and review method

`[FACT]` Preconditions verified before reviewing: working tree clean at `373d6a3`; baseline
**1136/1136**; Athlete Home remains a prototype (Spec 045/Impl 045-A classification standing);
sample isolation guards green; the approved generation command works unchanged; generated artifact
gitignored; no production runtime/framework/server exists.

`[FACT]` Review method — the RENDERED page, not only the HTML source:
- Generated via the approved path: `node src/athlete-home/sample/generate-athlete-home-page.ts`
  (output to a temporary location; nothing committed).
- Reviewed at **true 375 px mobile width** (collapsed AND with every fold expanded), and at
  **1280 px desktop width**, top to bottom, via temporary local headless-Chromium screenshots
  (review-only; not committed).
- Tooling note, recorded for honesty: headless Chromium enforces a 500 px minimum window width; a
  first screenshot pass produced text clipping that looked like a layout bug. It was **not** — an
  instrumented probe confirmed layout width 500 with zero overflowing elements, and an iframe-based
  375 px capture rendered perfectly. **The prototype has no mobile layout defect.** (Recorded so a
  future reviewer does not rediscover the artifact.)

---

## 2. Primary comprehension test — the top of the page

`[FACT]` First screen at 375 px, in order: brand mark → `Hola, atleta de muestra` (the largest
element on the page) → headline: *"Aurora tiene una interpretación en curso sobre vos — es una
lectura, no una verdad."* → tag `interpretación de Aurora` → TU DIRECCIÓN.

Answers to the required questions:

```text
1. First meaningful thing the eye sees : the greeting — the largest type on the page.
2. Is that the most important thing?   : NO. The greeting carries the least information of any
                                         element. The synthesis slot below it is where the value
                                         should live.
3. Does the headline answer            : NO. It is a META-statement: it says THAT Aurora has an
   "¿qué entiende Aurora de mí hoy?"     interpretation and what epistemic status it has — it never
                                         says WHAT the interpretation is. The reader ends the first
                                         screen knowing Aurora's posture, not Aurora's reading.
4. Purpose visually dominant over      : roughly balanced; TU DIRECCIÓN reads clearly and early —
   the reflection?                       this ordering works.
5. Reflection visually dominant enough?: the section is placed well (second), but its content
                                         sentence is also meta (see §4) — prominence without
                                         payload.
6. Top of page communicates            : INTERPRETATION-POSTURE (correctly), but as a category
   status/interpretation/navigation?     label rather than an actual interpretation.
7. Clear current synthesis?            : STRUCTURALLY present, SUBSTANTIVELY empty.
8. Emotionally meaningful or           : structurally correct but abstract. The Spec-045-era
   structurally correct but abstract?    aspiration ("Tu semana está construyendo capacidad, pero
                                         hoy llegás con fatiga acumulada") names the reader's
                                         actual situation; the current headline names Aurora's
                                         epistemology.
```
```text
domain importance ≠ visual priority — and, equally: epistemic honesty ≠ content
```

---

## 3. Findings

### Finding 1 — the synthesis and attention slots carry meta-statements, not content

- **Severity: P1** (primary comprehension failure — the page's central question goes unanswered)
- **Observed evidence.** Headline: *"Aurora tiene una interpretación en curso sobre vos…"*.
  Attention: *"Aurora observa algo que puede valer una reflexión."* Neither sentence states WHAT
  was observed or WHAT the interpretation is. Meanwhile the sample's underlying domain objects
  contain exactly the missing substance: a subjective report ("las últimas series se sintieron más
  pesadas de lo habitual"), a real out-of-range signal, and a hypothesis claim about sustained-work
  tolerance under accumulated load. None of that reaches any visible sentence.
- **Why it matters.** The product thesis is "Aurora helps the athlete understand how training is
  transforming them." A reader of this page learns that Aurora is humble, careful, and
  interpretive — but not one thing Aurora actually thinks about them. "Aurora observa algo" is a
  label where the observation should be.
- **Product question affected:** Q1 (what does Aurora understand), Q6 (what deserves attention).
- **Action justified now?** YES — this is fixable at the presentation layer: the substance already
  exists in domain outputs; the view-model input contract and copy mapping simply never carry it.
  No new domain model or backend is required.

### Finding 2 — the explanation folds reveal system diagnostics, not reasons

- **Severity: P2** (high; behind a fold, so secondary to Finding 1)
- **Observed evidence.** Expanding "Entender" shows literally: `EvidenceGate:pass` ·
  `UnderstandingGate:pass` · `PurposeGate:pass` · `RiskGate:pass` · `AgencyGate:pass`. Expanding
  "Por qué" under understanding shows: `survived-challenge: Unknown -> Working` (English, internal
  state machine). Expanding "Por qué" under the three gap sections shows **repository file paths**
  (`docs/domain-modeling/ATHLETE_AGGREGATE.md`).
- **Why it matters.** The fold is the page's trust-building moment — "¿por qué Aurora piensa
  esto?" — and it currently answers with architecture. `traceability ≠ architecture dump` is
  violated in all three fold types. An athlete gains nothing from gate names and loses the sense
  that Aurora is speaking to THEM.
- **Product question affected:** Q2 (why does Aurora think that), Q3 (how certain).
- **Action justified now?** YES — same presentation-layer scope: the folds render raw domain
  `reasons` strings verbatim; they need human-language mapping, not new data.

### Finding 3 — the three not-yet-modeled sections repeat identical copy and over-occupy the page

- **Severity: P2**
- **Observed evidence.** "CÓMO PARECÉS ESTAR HOY", "TU CAPACIDAD", and "LO QUE ESTÁ CAMBIANDO"
  render the exact same paragraph three times ("Aurora todavía no tiene un modelo para esto…"),
  occupying roughly the bottom 40% of the content — three of the page's six sections say the same
  sentence.
- **Why it matters.** The honesty is right — once. By the third identical repetition it reads as
  scaffolding, dilutes the two sections with real content, and makes the page feel unfinished
  rather than deliberate. Honest absence is correct; **honest absence ≠ automatically good
  homepage hierarchy.** The product problem (repetition + weight) is separate from the domain gap
  (the models genuinely do not exist), and only the former is a UI question.
- **Product question affected:** Q4 (what Aurora doesn't know — currently over-answered), Q6.
- **Action justified now?** YES, as consolidation/re-weighting — NOT as hiding (absence must stay
  visible) and NOT as implementing the missing models.

### Finding 4 — a raw domain key is the star of "LO QUE AURORA ENTIENDE DE VOS"

- **Severity: P2**
- **Observed evidence.** The understanding section's primary line is `sustained work tolerance` —
  an English, de-hyphenated internal dimension key on an otherwise fully Spanish page.
- **Why it matters.** This is the one section presenting something Aurora genuinely knows, and its
  headline word is an internal identifier — a system explaining its architecture, not "Aurora sees
  me." The confidence phrase below it ("confianza en construcción — evidencia inicial
  consistente") is excellent; the label above it undercuts it.
- **Action justified now?** YES — a display-name mapping at the presentation layer.

### Finding 5 — epistemic tags read as buttons

- **Severity: P3**
- **Observed evidence.** `interpretación de Aurora` / `declarado por vos` are bordered, rounded
  chips — visually the most button-like elements on a page with no other interactive control
  except the folds; `interpretación de Aurora` appears three times.
- **Why it matters.** False affordance (they look tappable) and mild repetition noise. The
  DISTINCTION itself is working (see §5) — this is presentation polish only.

### Finding 6 — greeting outweighs synthesis

- **Severity: P3**
- **Observed evidence.** The `h1` greeting is the largest text on the page; the headline below it
  is body-plus size.
- **Why it matters.** The visual hierarchy tells the reader the greeting is the point. When the
  synthesis carries real content (post-Finding-1), it should own the visual peak.

### Finding 7 — desktop is acceptable but under-resolved

- **Severity: P3**
- **Observed evidence.** At 1280 px the 38rem column centers correctly and reads calmly; content
  ends at roughly half the viewport height, leaving a large empty lower field; no desktop-specific
  use of space.
- **Why it matters.** "Mobile first, desktop excellent" — desktop is currently "mobile centered."
  Fine for a prototype; noted for any future iteration. `max-width: 38rem` itself feels
  intentional, not broken.

---

## 4. The seven primary questions — explicit classification

```text
1. ¿Qué entiende Aurora de mí hoy?        : UNCLEAR — meta-statements only (Finding 1); the one
                                            concrete item is an internal key (Finding 4).
2. ¿Por qué Aurora piensa eso?             : UNCLEAR — folds answer with diagnostics (Finding 2).
3. ¿Cuán segura está Aurora?               : PARTIALLY CLEAR — "confianza en construcción —
                                            evidencia inicial consistente" is exactly right;
                                            "incertidumbre visible, no una certeza" is generic
                                            posture rather than specific uncertainty.
4. ¿Qué no sabe Aurora todavía?            : CLEAR — the gaps say it plainly; over-repeated
                                            (Finding 3) but unmistakable.
5. ¿Por qué importa para mi propósito?     : UNCLEAR — TU DIRECCIÓN shows the purpose, but nothing
                                            on the page connects the reflection TO that purpose;
                                            direction and attention live as unlinked sections.
6. ¿Qué merece mi atención?                : PARTIALLY CLEAR — the right section exists in the
                                            right place; its sentence is a category label.
7. ¿Dónde decido yo?                       : CLEAR as statement ("Aurora no decide por vos", "La
                                            decisión es siempre tuya") — see §7 for the
                                            statement-vs-experience caveat.
```

---

## 5. Lens results (condensed)

**Immediate value — "¿qué aprendo acá que Garmin no me da?": PARTIALLY CLEAR, trending unclear.**
What is genuinely non-Garmin on this page is the epistemic honesty, the interpretation posture,
and the refusal to invent numbers. What is missing is the actual interpretation (Finding 1) — the
one thing Garmin structurally cannot offer. The page currently foregrounds system posture and
section completeness over transformation, trajectory, and meaning.

**Hierarchy.** Order (direction → attention → understanding → gaps → footer) is right. Weights are
not: greeting > synthesis (Finding 6), gaps ≈ 40% of content (Finding 3). The page reads closer to
"a domain-model inventory, honestly annotated" than to "a product concept" — every section
corresponds 1:1 to an internal category, including the three that exist only to say they are
empty.

**Aurora's voice.** The strongest asset. Genuinely distinctive fragments: *"Antes que inventar un
número, prefiere decírtelo."* (the single best sentence on the page), *"Aurora no decide por vos.
Te muestra lo que ve."*, *"Aurora interpreta; no dictamina."*. Generic/meta fragments: *"tiene una
interpretación en curso"*, *"observa algo que puede valer una reflexión"*, *"con incertidumbre
visible, no una certeza"* — posture without object. Nothing prescriptive, nothing shaming, nothing
"AI magic": the voice DISCIPLINE is fully intact; the voice CONTENT is under-filled.

**Declared vs. inferred.** Noticeable, understandable without explanation, and trust-building in
principle — `declarado por vos` on the purpose is quietly excellent. At three repetitions of
`interpretación de Aurora` it begins to become texture rather than signal, and the chip styling
suggests interactivity (Finding 5). "Inferred" wording itself does not appear (good — the Spanish
labels are human). The two-tag model remains adequate for THIS screen; nothing on the current page
demonstrates a need for the full epistemic chain, so no taxonomy expansion is proposed.
`declared/inferred ≠ full epistemic chain` stands as a documented limitation, not a current
product problem.

**Uncertainty.** Visible and calm, never defensive or legalistic — but mostly GENERIC. The one
specific formulation ("evidencia inicial consistente") shows what the rest should be. The page
never dilutes Aurora to knowing nothing — the balance errs toward vague rather than paralyzed.
`honesty without paralysis`: currently honest, mildly under-informative.

**Evidence and explanation.** "Entender" is a good label; its contents are diagnostics
(Finding 2). The five gates are meaningful to this repository and meaningless to an athlete. The
explanation currently DECREASES trust for a lay reader (it reads like a system self-check) while
INCREASING it for an architect — the wrong audience for this page.

**Agency.** Stated clearly and repeatedly; structurally guaranteed (no interactive element can
capture anything; `click ≠ AthleteDecision` is not even possible). But agency is currently only
STATED — there is nothing on the page that gives the athlete something to DO with their agency
(nothing to weigh, no trade-off actually shown despite "Te muestra lo que ve"). `saying "you
decide" ≠ designing for agency` — the gap is real but downstream of Finding 1: with no concrete
reflection shown, there is nothing to exercise agency ON.

**Visual rhythm.** Reading width right; spacing generous; serif treatment calm and adult; section
transitions clean; no card clutter; mobile scanability good. Desktop under-uses space
(Finding 7). Fold placement is right even though fold CONTENT is wrong.

**Emotional resonance: MISSING, with an emerging spark.** The honest-absence copy ("prefiere
decírtelo") produces the page's only "this product has character" moment. There is no "Aurora
noticed something about me" moment — because the noticing is never shown (Finding 1). Current
overall reading: *"Aurora has organized information about me,"* with unusually good manners.

**Differentiation.** Uniquely Aurora: the honest-absence stance, the declared/inferred split, the
non-prescriptive attention section. Could belong to any wellness app: the greeting, the meta
headline, a "here's your goal" block. What a reader would remember five minutes later — most
plausibly: "the app that would rather tell me it doesn't know than invent a number." That is a
REAL differentiator, and it is currently carried by the gap sections rather than by Aurora's
actual understanding — the memorable thing should be what Aurora saw, not what it lacks.

---

## 6. Strongest elements — preserve these

1. **The voice discipline and its best copy.** "Antes que inventar un número, prefiere
   decírtelo." / "Aurora no decide por vos. Te muestra lo que ve." / the footer. This is the
   product's personality already on the page — any iteration must keep this register.
2. **The visual restraint.** Warm paper, calm serif, one accent, no cards, no traffic lights, no
   charts, no gamification — structurally un-dashboard. It reads adult and trustworthy.
3. **The epistemic distinction itself.** `declarado por vos` vs. `interpretación de Aurora` is the
   right split, in humane words, at the right subtlety level.
4. **The section ORDER and the progressive-disclosure instinct.** Direction → attention →
   understanding → honest gaps is the right narrative spine; folds are the right mechanism (their
   content is the problem, not their existence).

---

## 7. The single biggest product problem

> **The page's substantive slots hold meta-statements: Aurora talks about the KIND of thing it has
> to say instead of SAYING it.** (Finding 1 — headline, attention sentence, and behind them, folds
> that explain with diagnostics.) A reader finishes the page convinced Aurora is careful and
> humble, and unable to repeat one thing Aurora thinks about them. Everything else on this list is
> secondary to filling those slots with the concrete, already-existing domain substance.

Secondary problems (at most three):
1. Explanation folds expose internal architecture — gate names, state transitions, file paths
   (Finding 2).
2. Triple identical not-yet-modeled copy over-weights absence against presence (Finding 3).
3. Raw English domain key as the understanding headline (Finding 4).

---

## 8. Product hypothesis

```text
The current Athlete Home succeeds when the reader needs to understand WHAT KIND of relationship
Aurora proposes — interpretive, humble, non-prescriptive, epistemically honest. Posture, voice
register, and visual identity are already communicating.

It fails when the reader asks the page's own central question — "¿qué entiende Aurora de MÍ
hoy?" — because every substantive slot (headline, attention, explanation) holds a meta-statement,
a diagnostic, or an internal identifier instead of Aurora's actual reading.

The next design iteration should test: filling the synthesis, attention, and understanding slots
with concrete human-language content drawn from the SAME already-available domain outputs (the
subjective report words, the hypothesis claim, the dimension in display language, the purpose
linkage), and re-weighting the three absence sections into one quieter statement — all at the
presentation layer, with no new domain model and no production data connection.
```
This is a hypothesis, not truth — and expert review, not observed athlete behavior.

---

## 9. Recommendation options

```text
Option A — preserve as-is, move to Presentation Input Boundary : REJECTED — a P1 comprehension
            failure exists; connecting real data to slots that render meta-statements would carry
            the failure into production evidence.
Option B — one focused prototype iteration                     : SELECTED — the P1 and all three
            P2s are concrete, presentation-layer, testable without any new backend/domain
            architecture, and the fix substance (claim text, report words, display names, purpose
            linkage) already exists in the domain outputs the prototype consumes.
Option C — athlete review before any iteration                 : REJECTED for now — expert review
            resolved the key uncertainty unambiguously (the substance slots are empty; no athlete
            is needed to establish that). Athlete review becomes the RIGHT next gate after the
            iteration, when the open question turns into "is the filled version understood?"
Option D — domain capability must precede UI iteration         : REJECTED — explicitly checked:
            the biggest problem needs NO CurrentState/CapacityProfile/ImpactAssessment; it needs
            already-available content surfaced. Choosing D "because models are absent" is the
            exact move this mission forbids.
```

Severity totals: **P0: 0 · P1: 1 · P2: 3 · P3: 3.** No thesis contradiction found anywhere on the
page: nothing commands, nothing shames, nothing presents inference as fact, agency is never
claimed by Aurora — the constitution held; the storytelling did not (yet).

---

## 10. Non-goals honored by this review

No UI/copy/CSS change, no new screen/component/interaction, no framework/runtime/HTTP/API/auth
selection, no production data connection or presentation-input implementation, no production
composition owner, no CurrentState/CapacityProfile/ImpactAssessment implementation, no
AthleteDecision capture, no provider/delivery call, no AC20 change. Screenshots and generated HTML
were temporary review artifacts — none committed.

---

## 11. Decision

`[DECISION] Athlete Home review: Option B`

One focused prototype iteration, scoped by §7/§8: fill the synthesis/attention/explanation slots
with concrete human-language content from already-available domain outputs; humanize the fold
contents (reasons, not diagnostics); map dimension keys to display language; consolidate the three
absence sections into one quieter, single statement of what Aurora does not yet model; adjust
greeting/synthesis visual weight; de-button the epistemic tags. All presentation-layer; no new
domain model; no production data; no framework; the sample remains the confined demo input. The
iteration's own mission must define its exact scope — this review decides the direction, not the
diff.

---

## 12. Validation & invariants at this review

`tsc --noEmit` clean; `node --test` **1136/1136** (unchanged — review-only). No source/test/
sample/guard/export/package change; no generated artifact or screenshot tracked; AC20 untouched;
`fa1d12e`/`11ed9a8` unmodified.
