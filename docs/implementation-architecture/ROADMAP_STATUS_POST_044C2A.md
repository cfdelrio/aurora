# Aurora — Roadmap Status Checkpoint (post Implementation 044-C2A)

> **Status (2026-07-05).** Docs-only roadmap checkpoint. **Not a spec.** No code, no technical spec, no
> test/package change, no parser/Garmin/FIT/TCX file, no API/UI/server/scheduler/CI/SDK file, no guard weakened,
> AC20 untouched. It closes the **real training intake evidence arc** (Manual Data Trial 044-C, Spec 044-C1,
> Tech Spec 044-C1A, Impl 044-C1A, Spec 044-C2, Tech Spec 044-C2A, Impl 044-C2A) and states, per lane, exactly
> what evidence is required before continuing. Validation at authorship: `tsc --noEmit` clean; `node --test`
> **1045/1045**. Prior checkpoint: `...POST_044B.md` (`600ed19`).

---

## 1. Current stable state

```text
Manual Data Trial 044-C  — Run Real Training Rows Through Intake                     (d14744f)
  → Spec 044-C1          — Metric Normalization Boundary                             (fa4fb12)
  → Tech Spec 044-C1A    — Metric Vocabulary Implementation Plan                     (b669844)
  → Impl 044-C1A         — Extend Recognized Metric Vocabulary                       (cc123ba)
  → Spec 044-C2          — Numeric Lexical Normalization Boundary                    (2af9c38)
  → Tech Spec 044-C2A    — Numeric Lexical Normalization Implementation Plan         (7bd0fab)
  → Impl 044-C2A         — Grouped-Thousands Numeric Intake                         (ed3df83)
```

`[FACT]` This arc continues directly from `ROADMAP_STATUS_POST_044B.md`, which closed the manual/CSV
observation-intake and review boundary but had run **zero real training data** through it. This arc's entire
purpose was to supply that missing evidence, and — where evidence revealed a genuine gap — close it with the
smallest possible fix. Every step was gated by explicit prior approval; every domain extension reused existing
types (`RECOGNIZED_METRICS`, `parseFiniteNumber`, `Provenance.reference`, `ObservationQuality.reason`) rather
than inventing parallel ones. **1045/1045**; `tsc --noEmit` clean; AC20 untouched throughout.

---

## 2. Real evidence used

`[FACT]` A single real Garmin Connect swim-activity CSV export, `activity_23459651624.csv` — supplied
directly by the repository owner for this arc, not authored, invented, or "made realistic." 134 real lines: a
header, 133 interval/lap/rest rows, one "Resumen" (summary) row, covering a real ~80-minute, 3,600 m swim
session. Three representative real lines (`csv-2`, `csv-59`, `csv-134`) were manually transcribed, by hand,
outside Aurora, into `TrainingSummaryRow` data (`src/modules/observation/tests/044-c-real-swim-session-fixture.ts`)
— Aurora has no CSV parser and none was added; this transcription is the external, one-time conversion the
existing production contract already requires.

---

## 3. What the first real-data trial originally found

`[FACT]` The original trial run (`d14744f`, documented in full, unchanged, at
`docs/trials/044-C-real-training-intake-trial.md`):

```text
input row count            : 18   (3 rows from csv-2, 8 from csv-59, 7 from csv-134)
mapped ManualInputEntry     : 21   (18 measured-value + 3 context-note)
outcome status              : partially-accepted
accepted observation count  : 20
limitations                 : ["unparseable-numeric-value"]   (exactly one)
outcome-level quality       : "partial"

quality flags on the 17 admitted measured observations:
  "complete"    (11) : distance ×2, duration ×2, avg-pace ×1, avg-heart-rate ×3, max-heart-rate ×3
  "suspicious"   (6) : swolf ×2, total-strokes ×2, calories ×2
```

Two real, repeatable findings rose above "no action needed":
1. **Metric-name coverage** — a full third of the real, admitted measured observations were flagged
   `"suspicious"` purely because `RECOGNIZED_METRICS` had no swim vocabulary (swolf, total-strokes, calories).
2. **A real numeric lexical failure** — Garmin's own comma-grouped `"1,600"` (interval 8's distance) is not
   parsed by native `Number()` and became the trial's one `"unparseable-numeric-value"` limitation.

Every other observed behavior (unit preservation, `sourceRowId`/`artifactRef`/`deviceLabel` provenance,
notes-as-separate-observations, zero-value handling, accepted/partially-accepted/rejected honesty) was
classified "works as designed" — no action was taken on any of it.

---

## 4. What was changed because of that evidence

`[FACT]` **Metric vocabulary (Spec 044-C1 → Tech Spec 044-C1A → Impl 044-C1A, `cc123ba`):**
```text
RECOGNIZED_METRICS grew from 15 to 18 entries — added: "swolf", "total-strokes", "calories"
still a private, unexported, non-authoritative name-recognition allowlist — no alias/canonical-identity/
sport-registry/fuzzy-matching/LLM-classification infrastructure was introduced
```

`[FACT]` **Numeric lexical normalization (Spec 044-C2 → Tech Spec 044-C2A → Impl 044-C2A, `ed3df83`):**
```text
parseFiniteNumber(rawValue) now tries the existing strict native Number() parse FIRST (100% unchanged for
every already-supported form), falling back ONLY on strict failure to one narrow, unambiguous lexical shape:

  ^[+-]?\d{1,3}(,\d{3})+$   (one or more exact 3-digit comma groups, no decimal point present)

"1,6", "12,34", "1,23,456", "1.234,56", "1,600.5", "1,600,", ",600" — all remain "unparseable-numeric-value".
No locale guessing. No numeric-parsing dependency. No broad punctuation stripping (the comma-strip runs only
on a string already proven to match the exact grammar — proved by a static guard test).

On a normalized success: quality.status is decided solely by the existing qualityForMetricLabel (normalization
itself never causes or suppresses "suspicious"); quality.reason gains an additive note describing the
mechanical fact, with no locale/device/source-truth claim; the original raw text is folded into
Provenance.reference as a new "raw-numeric:" segment, mirroring the existing sourceRowRef-folding pattern — no
new domain field, no new Provenance type. No new ManualInputLimitation catalog value was needed.
```

---

## 5. Current rerun result

`[FACT]` The same real fixture, run through the same unmodified production chain
(`trainingRowSubmissionToManualInput` → `ingestManualInput`), now yields:

```text
status                  : accepted            (was: partially-accepted)
acceptedCount            : 21                  (was: 20)
limitations              : []                  (was: ["unparseable-numeric-value"])
outcome-level quality    : "complete"           (was: "partial")
unknown-metric warnings  : 0                    (was: 6 — swolf ×2, total-strokes ×2, calories ×2)

proof: the observation sourced from csv-59's raw "1,600" carries magnitude 1600, quality.status "complete",
a quality.reason noting the grouped-thousands normalization, and "raw-numeric:\"1,600\"" recoverable in
Provenance.reference.
```

`[FACT]` **Historical evidence rule.** `docs/trials/044-C-real-training-intake-trial.md` was **not modified**
by either fix and remains, unchanged, the historical record of what the ORIGINAL system actually did. The
later fixes do not make that original finding false:
```text
historical failure ≠ current behavior · current success ≠ rewritten history
```
Only the LIVE test suite (`044-c-real-swim-session-trial.test.ts`) was updated to assert the new, current
behavior — this checkpoint and every commit in this arc keep both facts visible: what was originally found,
and what is true now.

---

## 6. What is now proven

1. A real Garmin Connect export can supply genuine evidence for architecture decisions — this entire arc's
   two fixes trace directly to specific, cited, real values from one real file, not speculation.
2. An external/manual one-time transcription can produce already-parsed `TrainingSummaryRow` data without
   making Aurora a CSV parser.
3. `TrainingRowSubmission` can map into the existing Manual Input Adapter contract (`ManualInputSubmission`)
   with no new observation model.
4. `measured-value` entries can become real `Observation` material via the existing `measuredObservation()`/
   `Measurement` constructors.
5. Real unknown metrics can be admitted honestly with warnings — never rejected merely for being unfamiliar,
   never silently trusted either.
6. A closed metric catalog (`RECOGNIZED_METRICS`) can be extended from observed real evidence without any
   alias/canonical-identity/sport-registry infrastructure.
7. Raw metric labels remain preserved verbatim (e.g. uppercase `"SWOLF"`) even when recognition normalizes the
   catalog lookup only.
8. Real grouped-thousands numeric text (`"1,600"`) can be normalized with a narrow, deterministic,
   evidence-justified rule.
9. Ambiguous numeric forms (`"1,6"`, `"1.234,56"`, etc.) remain rejected rather than guessed — Aurora never
   silently picks between two plausible interpretations.
10. Lexical normalization does not create locale certainty, device accuracy, Evidence, Signal, or
    recommendation quality — it is a mechanical, narrowly-scoped text transformation, nothing more.
11. Provenance can preserve source-row/device/artifact context AND the original, pre-normalization numeric
    text, all in the one existing `Provenance.reference` string mechanism.
12. A previously partially-accepted real session can become fully accepted after evidence-driven fixes, with
    the ORIGINAL finding remaining historically true and undisturbed.
13. No downstream automation is needed merely because intake succeeds — this arc closed two real gaps and
    triggered zero new Signal/EvidenceCase/RenderingRequest/session/delivery/AthleteDecision surface.

### 6.1 What is now usable
```text
real/manual training source
  -> external already-parsed rows (TrainingSummaryRow[])
  -> TrainingRowSubmission
  -> trainingRowSubmissionToManualInput(...)    [pure mapper]
  -> ManualInputSubmission
  -> ingestManualInput(...)                     [Manual Input Adapter — metric + numeric normalization]
  -> accepted / partially-accepted / rejected
  -> Observation material (MeasuredObservation / SubjectiveObservation / MissingDataObservation)
  -> operator review protocol (docs/runbooks/operator-observation-review-protocol.md)
  -> correction via supersession (ObservationSet.supersede(...), never overwrite)
```
`[FACT]` This is explicitly **NOT**:
```text
a CSV parser (rows must already be parsed by the caller/operator before reaching Aurora)
a FIT parser · a TCX parser · Garmin API integration of any kind
an automated training-analysis pipeline (no Signal/Evidence/RenderingRequest/session is ever automatic)
```

---

## 7. What remains intentionally unselected

```text
no filesystem CSV parser · no CSV library · no FIT parser · no TCX parser · no Garmin API · no Garmin OAuth ·
no automatic sync · no generic locale parser · no numeric parsing dependency ·
no canonical metric identity model · no alias infrastructure · no sport-specific vocabulary registry ·
no fuzzy matching · no LLM metric classification ·
no automatic Signal creation · no automatic EvidenceCase creation · no automatic RenderingRequest creation ·
no automatic runOperatorSession · no delivery · no AthleteDecision creation ·
no athlete-facing review UI · no API/server · no scheduler/worker loop · no production whole-core composer
```
Each of these was evaluated at least once across Specs 044-C1/044-C1A/044-C2/044-C2A and explicitly deferred
for lack of evidence — not overlooked. (Decimal-comma support, mixed thousands+decimal forms, spaces, and
scientific notation were likewise explicitly considered and rejected in Spec 044-C2 §4/§6 for lack of any
observed real value needing them.)

---

## 8. What must NOT be inferred from one successful trial

One fully-accepted real session must not be read as proof that:
```text
all sports are covered                     all Garmin exports are covered
all CSV formats are covered                all metric names are covered
all units are covered                      all locale numeric forms are covered
FIT/TCX parsing is unnecessary forever     Garmin API is unnecessary forever
recommendation quality is proven           device accuracy is proven
training causality is proven               athlete decision quality is proven
```
```text
one successful trial = one proven path, not universal product completeness
```
Consistent with `docs/runbooks/operator-observation-review-protocol.md` §14 and every prior checkpoint in this
arc: this trial proves the intake path handles ONE real session's transcribed rows correctly. It proves
nothing about any other sport, export format, metric vocabulary, or numeric convention not actually observed.

---

## 9. Evidence gates for future intake work

| Lane | Evidence required before reopening |
| --- | --- |
| **Another sport/session** | Another real session/export, honest source provenance, representative row transcription, rerun through the current (unmodified) production intake path. |
| **New metric vocabulary** | Real unfamiliar metric labels, observed frequency/context, proof they are distinct metrics rather than aliases of an existing recognized name. |
| **Alias/canonical identity** | Real source labels demonstrably referring to the SAME semantic metric, evidenced from more than one hand-normalized transcription — not assumed from a single sample. |
| **Sport-specific vocabulary** | Evidence from another sport showing genuine semantic collisions or a real need to partition vocabulary by sport. |
| **Unit normalization** | Real conflicting or incompatible unit forms for the same metric, actually observed. |
| **Broader numeric normalization** | Real lexical numeric forms outside the currently supported grammar (e.g. a genuine decimal-comma sample, a genuine mixed thousands+decimal sample) — not hypothesized. |
| **Post-hoc retraction** | A real, already-admitted observation that must be withdrawn WITHOUT a replacement value (still unencountered — carried over unchanged from `ROADMAP_STATUS_POST_044B.md` §3). |
| **CSV parser** | Repeated operator burden or transcription error evidence, representative real CSV files, and an explicit parser/source-format boundary decision. |
| **TCX/FIT parser** | Real source files, demonstrated structure genuinely lost by the current summary-row representation, and a dependency + provenance decision. |
| **Garmin API** | A product/operational reason, an OAuth/privacy/rate-limit handling plan, and a source-of-truth decision (device vs. manual precedence). |
| **Athlete-facing review** | A product-surface decision and an athlete consent/confirmation model (still unmet, carried over from `ROADMAP_STATUS_POST_044B.md`). |
| **Downstream automation (Signal / EvidenceCase / RenderingRequest / runOperatorSession / delivery)** | Each requires its own separate boundary spec — none is reopened by intake succeeding. |
| **AthleteDecision automation** | Remains **forbidden** — successful intake never creates `AthleteDecision` automatically; this stays athlete-declared (Impl 037-A), unchanged. |
| **Whole-core composition** | Remains **forbidden by AC20** unless explicitly amended in its own, separate architecture-decision spec. |

---

## 10. Allowed next missions — only if evidence appears

```text
Manual Data Trial 044-D  — Run Another Real Session Through Intake        (needs: another-session evidence, §9)
Manual Data Trial 044-D  — Run Another Real Sport Through Intake          (needs: another-sport evidence, §9)
Spec 044-D1              — Metric Alias Boundary                         (needs: alias evidence, §9)
Spec 044-D2              — Unit Normalization Boundary                   (needs: unit-conflict evidence, §9)
Spec 044-D3              — Post-Hoc Retraction Boundary                  (needs: retraction-case evidence, §9)
Spec 044-D4              — CSV Parser Boundary                           (needs: CSV-lane evidence, §9)
Spec 044-D5              — TCX/FIT Intake Boundary                       (needs: TCX/FIT-lane evidence, §9)
Spec [TBD]               — Garmin API Integration Boundary                (needs: Garmin-lane evidence, §9)
Spec [TBD]               — Athlete-Facing Observation Review Boundary     (needs: athlete-review evidence, §9)
```
None of these is recommended **now** — each requires its own future evidence, documented in its own spec, per
the gates in §9. Listing them here is not a queue; it is a map of *where* re-entry is legible if and when
evidence appears.

---

## 11. Forbidden speculative next missions

```text
CSV parser dependency · FIT parser dependency · TCX parser implementation · Garmin OAuth/API ·
generic locale parser · metric canonicalization platform · sport-specific vocabulary registry ·
fuzzy matching · LLM metric classification ·
automatic Signal creation · automatic EvidenceCase creation · automatic RenderingRequest ·
automatic runOperatorSession · delivery · AthleteDecision creation ·
athlete-facing UI/API · scheduler/worker loop · production whole-core composer
```
Each requires a **separate spec** with its own evidence (§9) — never a direct implementation jump from this
checkpoint, and never justified merely by "the last trial succeeded."

---

## 12. Central distinctions (carried through the whole arc)

```text
real export ≠ truth · manual transcription ≠ original artifact · accepted intake ≠ truth ·
recognized metric ≠ Evidence · lexical normalization ≠ locale certainty · successful parse ≠ device accuracy ·
Observation ≠ Signal · Signal ≠ Evidence · Evidence ≠ recommendation ·
fully accepted session ≠ recommendation quality · review ≠ athlete decision · provenance ≠ proof ·
current success ≠ rewritten history · one successful trial ≠ universal coverage ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 13. Recommendation

`[RECOMMENDATION] Pause this arc.`

- **Current confirmed state.** The real-training-intake evidence arc — one real Garmin swim session, run
  through the unmodified production chain, closing both the metric-vocabulary gap and the numeric-lexical gap
  it organically revealed — is **complete and proven**. The trial that opened this arc now runs fully
  `accepted` (`acceptedCount: 21`, `limitations: []`, zero unknown-metric warnings). No parser, no Garmin
  integration, no automation, no UI/API, no AC20 amendment exists or is implied. **1045/1045**; `tsc --noEmit`
  clean; AC20 intact.
- **Why pause, not another build.** No concrete real-data gap remains in this trial. Every remaining lane (§9)
  is gated on evidence that does not exist in this repository today. Building a CSV parser, a Garmin
  integration, a locale-parsing library, or an athlete-facing surface now — merely because this one trial
  succeeded — would repeat the premature-commitment mistake this Engineering Playbook discipline exists to
  prevent, and would violate §8's explicit non-inference rule.
- **What is NOT lost by pausing.** The row mapper, the extended adapter (metric vocabulary + numeric
  normalization), the review protocol, and the correction mechanism all keep working exactly as documented.
  Nothing here decays while idle.
- **What would restart each lane.** See §9 (evidence gates) and §10 (the map of specs each lane would open).
- **Next action should be either:**
  1. **another real training-data trial from a different session or sport** (a genuinely new real export,
     re-run through this same unmodified production chain, to test whether new metric/numeric/unit gaps
     appear), **or**
  2. **wait until a concrete intake/review limitation appears** in actual use — do not invent one.
- **What must remain protected during the pause.** AC20 intact (no production whole-core composer, no
  `reflection-composition` revival); no automatic Signal/EvidenceCase/RenderingRequest/`runOperatorSession`/
  delivery/AthleteDecision; technical acceptance never conflated with truth; corrections always via
  supersession, never overwrite; `docs/trials/044-C-real-training-intake-trial.md` remains historical evidence,
  never rewritten.

---

## 14. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **1045/1045**. AC20 unchanged; no production whole-core composer; no
`reflection-composition` module; no Signal/EvidenceCase/RenderingRequest created automatically; no
`runOperatorSession`/delivery/AthleteDecision triggered by intake or review; no parser (CSV/FIT/TCX) or Garmin
integration of any kind; no locale-parsing library or numeric-parsing dependency; no package/dependency/
runtime/API/UI/CLI/worker/deployment/CI/SDK change. This checkpoint is docs-only.
