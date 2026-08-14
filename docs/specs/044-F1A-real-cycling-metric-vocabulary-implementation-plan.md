# Aurora — Technical Specification 044-F1A — Real Cycling Metric Vocabulary Implementation Plan

> **Status (2026-07-06).** Technical Specification phase, building on Spec 044-F1 (`346efaf`). It is
> **behavioral / docs-only**: it implements no code, does not edit `RECOGNIZED_METRICS`, adds no dependency,
> no package/test change, adds no canonicalization/alias/sport-specific/unit-normalization/speed-pace-
> conversion infrastructure, no fuzzy/LLM matching, does not touch missing-value handling or numeric parsing,
> adds no cadence/power semantics, fixes no temporal provenance, creates no `Signal`/`EvidenceCase`/
> `RenderingRequest`, calls no `runOperatorSession`, adds no delivery, creates no `AthleteDecision`
> automatically, introduces no production whole-core composer, and amends no AC20. Base: `tsc --noEmit`
> clean; `node --test` **1091/1091**. It plans the exact, minimal catalog extension Spec 044-F1 approved.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — one level more concrete than Spec 044-F1, still no code. It
names exact strings, exact test additions, and an exact next Implementation slice.

---

## 1. Required grounding check (verified before planning anything)

`[FACT]` All eleven preconditions re-verified true, directly against current source and current test output,
at authorship of this tech spec:

```text
 1. RECOGNIZED_METRICS count is exactly 25       : TRUE (direct source inspection,
                                                    manual-input-adapter.ts, lines 41-67).
 2. Catalog remains literal, flat, local, unexported : TRUE — unchanged since Impl 044-E1A; `const`, not
                                                    exported, defined once in manual-input-adapter.ts.
 3. normalizeMetricLabel(...) behavior is unchanged : TRUE — trim -> lowercase -> collapse whitespace to a
                                                    single hyphen, applied only to the incoming label at
                                                    lookup time; unchanged since Impl 044-C1A.
 4. Unknown metrics remain admitted + suspicious  : TRUE — qualityForMetricLabel's else-branch is unchanged
                                                    (manual-input-adapter.ts line 107).
 5. Trial 044-F reports exactly accepted/48/[]/8 suspicious : TRUE (re-run of
                                                    044-f-real-cycling-session-trial.test.ts, tests 044-F.2
                                                    and 044-F.5 — 11/11 pass).
 6. Those 8 are exactly max-speed x4 + avg-moving-speed x4 : TRUE (test 044-F.5's own assertions, re-run).
 7. Trial 044-F partition is 44 measured / 0 missing-data / 4 subjective : TRUE (test 044-F.3, 044-F.10,
                                                    re-run and confirmed).
 8. Trial 044-E remains accepted/78/[]/0 unknown  : TRUE (re-run of
                                                    044-e-real-running-session-trial.test.ts, test 044-E.2 —
                                                    acceptedCount 78, limitations [], 12/12 pass).
 9. Trial 044-D remains accepted/41/[]/0 unknown  : TRUE (re-run of
                                                    044-d-real-swim-session-trial.test.ts, test 044-D.2 —
                                                    acceptedCount 41, limitations [], all pass).
10. Trial 044-C remains accepted/21/[]/0 unknown  : TRUE (re-run of
                                                    044-c-real-swim-session-trial.test.ts, test 044-C.2 —
                                                    acceptedCount 21, limitations [], all pass).
11. Baseline is 1091/1091                         : TRUE (full suite re-run at authorship).
```

No discrepancy exists; this plan proceeds exactly as Spec 044-F1 anticipated.

---

## 2. Context

`[FACT]` Spec 044-F1 (`346efaf`) selected Option A — extend `RECOGNIZED_METRICS` only — and classified both
real, Trial-044-F-observed labels as distinct metrics, neither an alias of anything already recognized:
`max-speed` (an avg/max extremum pairing with the already-recognized `avg-speed`, evidenced by
`max-speed >= avg-speed` holding without exception on all four real rows) and `avg-moving-speed` (an
elapsed/moving pairing with `avg-speed`, evidenced by a real pause on every single lap where
`moving-time < duration`, exactly the same evidentiary shape Impl 044-E1A already established for
`moving-time`/`avg-moving-pace`). This tech spec plans the exact, smallest change that adds them.

`[FACT]` Exact current source (`src/modules/observation/application/manual-input-adapter.ts`, verified
against the live file at authorship):

```ts
const RECOGNIZED_METRICS = new Set([
  "heart-rate", "avg-heart-rate", "max-heart-rate",
  "power", "avg-power", "max-power",
  "pace", "avg-pace",
  "speed", "avg-speed",
  "cadence", "avg-cadence",
  "distance", "duration", "elevation-gain",
  "swolf", "total-strokes", "calories",
  "optimal-pace", "avg-strokes-per-length",
  "elevation-loss", "max-cadence", "avg-stride-length", "moving-time", "avg-moving-pace",
]); // exactly 25 entries today

function normalizeMetricLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "-");
}

function qualityForMetricLabel(label: string): ObservationQuality {
  return RECOGNIZED_METRICS.has(normalizeMetricLabel(label))
    ? qualityComplete()
    : observationQuality("suspicious", "unrecognized metric name — recorded as reported, not rejected");
}
```

`[FACT]` **Normalization behavior, confirmed exactly, unchanged since Impl 044-C1A/044-D1A/044-E1A:**
`normalizeMetricLabel` is applied **only to the incoming label** at lookup time. Both new candidate strings —
`"max-speed"` and `"avg-moving-speed"` — are **already** lowercase, kebab-case, with no leading/trailing
whitespace, verified directly against the fixture (`044-f-real-cycling-session-fixture.ts`, where both appear
literally as `metric: "max-speed"` / `metric: "avg-moving-speed"`) — **no transformation is needed** before
adding them to the `Set` initializer, exactly matching Tech Spec 044-C1A/044-D1A/044-E1A's finding for their
respective new entries.

`[FACT]` `RECOGNIZED_METRICS` remains **not exported**, unchanged. The existing static, text-based
closed-catalog guard (`manual-input-adapter-negative-capability.test.ts`, function `extractRecognizedMetrics`,
test `"044-E1A RECOGNIZED_METRICS remains a literal, closed catalog of exactly 25 entries..."`) reads the
`Set([...])` literal as text and asserts an exact 25-entry list. This plan updates that SAME guard's expected
count and list — it does not introduce a second, parallel guard.

`[CORRECTION — preserved verbatim from Spec 044-F1, binding on this tech spec too]` Trial 044-F's source
contains **zero** occurrences of the `"--"` missing-value placeholder. Trial 044-F did **NOT** exercise
`MissingDataObservation` behavior, and this tech spec does **NOT** claim `"--"` generalized to cycling.
`column absent ≠ column present with "--"`. The existing missing-value generalization evidence remains
sustained only by Trials 044-C/044-D/044-E. This tech spec's scope has zero interaction with missing-value
handling in any direction (§5 Decision 13).

---

## 3. Central Question

> How should Aurora minimally add `max-speed` and `avg-moving-speed` to the existing closed flat metric
> catalog while preserving all current behavior across swimming, running, and cycling?

```text
recognized cycling metric ≠ universal metric standard · recognized label ≠ canonical identity ·
recognizing "max-speed" ≠ computing or validating a maximum · recognizing "avg-moving-speed" ≠ a Garmin
moving-speed formula encoded · different sport vocabularies (speed vs. pace) ≠ an identity-reconciliation
requirement · real unit variation ≠ a unit-normalization gap · absence of the missing-value token
≠ proof of missing-token behavior · this catalog extension ≠ a registry ≠ configuration ≠ a database ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 4. Required inputs consulted

```text
docs/specs/044-F1-real-cycling-metric-vocabulary-boundary.md
docs/trials/044-F-first-real-cycling-session-intake-trial.md
docs/specs/044-E1A-real-running-metric-vocabulary-implementation-plan.md
docs/specs/044-D1A-additional-metric-vocabulary-implementation-plan.md
docs/specs/044-C1A-metric-vocabulary-implementation-plan.md
src/modules/observation/application/manual-input-adapter.ts   (RECOGNIZED_METRICS, normalizeMetricLabel,
                                                                 qualityForMetricLabel — exact source, §2)
src/modules/observation/tests/044-f-real-cycling-session-fixture.ts
src/modules/observation/tests/044-f-real-cycling-session-trial.test.ts
src/modules/observation/tests/044-e-real-running-session-trial.test.ts
src/modules/observation/tests/044-d-real-swim-session-trial.test.ts
src/modules/observation/tests/044-c-real-swim-session-trial.test.ts
src/modules/observation/tests/manual-input-adapter.test.ts
src/modules/observation/tests/manual-input-adapter-negative-capability.test.ts (existing closed-catalog
                                                                 guard for RECOGNIZED_METRICS, §1/§10)
```

`[FACT]` No new registry abstraction is named anywhere in this plan — every decision below operates on the
EXACT existing `RECOGNIZED_METRICS` `Set<string>` literal and the exact existing `qualityForMetricLabel`
function; no new type is coined.

---

## 5. Required Decisions

### `[DECISION]` Decision 1 — Exact catalog entries to add
```text
"max-speed"
"avg-moving-speed"
```
Verified against the current normalization behavior (§2) and against the exact strings already used in the
Trial 044-F fixture: both are already trimmed, lowercase, kebab-case — **no transformation is needed** before
adding them literally to the `Set` initializer. Explicitly **NOT** added: `"maximum-speed"`, `"top-speed"`,
`"moving-speed"`, `"average-moving-speed"`, `"avg-motion-speed"` — none of these matches the exact source
label the real evidence produced, and inventing an alternate spelling now would itself be an unevidenced
normalization decision (exactly what Spec 044-F1 declined to build). No aliases are introduced in this slice.

### `[DECISION]` Decision 2 — Catalog remains flat, closed, and unexported
Confirmed: `RECOGNIZED_METRICS` stays a **closed, explicit, literal `Set<string>`**, unexported, in exactly
the one file that defines it today. No canonical metric ids, no alias map, no cycling registry, no
sport-specific registry, no configuration-driven registry, no database vocabulary, no remote vocabulary, no
plugin system. The catalog grows only by an explicit, reviewed literal-array edit — exactly how all 25
existing entries were added across this arc.

### `[DECISION]` Decision 3 — `max-speed` behavior
Recognition adds **only** the string `"max-speed"` to the `Set` — nothing about maximum-speed computation,
aggregation, or device validation is encoded anywhere. `qualityForMetricLabel` performs a pure
string-membership check; it will not, after this change, derive `max-speed` from GPS points, validate it
against `avg-speed`, or introduce any speed-domain object or avg/max canonical identity.
`Measurement.quantity` continues to store the raw label `"max-speed"` verbatim — recognition removes the
unknown-metric warning only. Required distinction: recognizing `max-speed` ≠ computing max speed ≠
validating Garmin's calculation.

### `[DECISION]` Decision 4 — `avg-moving-speed` behavior
Recognition adds **only** the string `"avg-moving-speed"` to the `Set` — no distance/moving-time formula, no
pause-detection logic, no Garmin moving-speed formula, and no derived-speed calculation is encoded anywhere.
Each is still parsed, validated, and recorded entirely independently, as two unrelated `measured-value`
entries with no cross-reference between them — exactly the same non-relationship Impl 044-E1A already
established for `moving-time`/`avg-moving-pace`. Required distinction: recognizing `avg-moving-speed` ≠
knowing or encoding its formula.

### `[DECISION]` Decision 5 — Speed versus pace
Spec 044-F1's decision is preserved exactly: cycling exercises speed-family labels (`avg-speed`,
`max-speed`, `avg-moving-speed`), prior sports exercise pace-family labels (`avg-pace`, `optimal-pace`,
`avg-moving-pace`). No speed↔pace conversion, no inverse formulas, no canonical velocity identity, and no
shared speed/pace abstraction is introduced. Required distinction: different sport vocabularies ≠ an
identity-reconciliation requirement — nothing in Trial 044-F's evidence shows an operational need to compare
or convert between the two families.

### `[DECISION]` Decision 6 — Raw label preservation → unconditional, unchanged
`Measurement.quantity` continues to carry `entry.label` **verbatim** (`mapEntry`'s `measured-value` case,
untouched by this plan). Recognizing either of the two labels never rewrites them into a canonical id or an
alternative spelling: `max-speed` stays `max-speed`; `avg-moving-speed` stays `avg-moving-speed`. No canonical
ids, no rewritten labels, no alias-resolution fields.

### `[DECISION]` Decision 7 — Unknown-metric behavior for future labels → unchanged
Adding these two entries does **not** alter `qualityForMetricLabel`'s logic in any way — any OTHER
unrecognized label still resolves to `observationQuality("suspicious", "unrecognized metric name — recorded
as reported, not rejected")`, exactly as today. No behavior branch is added, removed, or restructured — only
the `Set` literal's contents change. Adding two known labels must not alter behavior for future unknown
labels.

### `[DECISION]` Decision 8 — Trial 044-F expected changes (planned, not executed here)
Inspecting the trial's exact current assertions (`044-f-real-cycling-session-trial.test.ts`), the FUTURE
implementation is expected to change **only**:
```text
044-F.5 (currently: "'max-speed' and 'avg-moving-speed' are genuinely new metric labels, admitted but
  flagged suspicious...") -> its NARRATIVE changes (mirroring how 044-D.5 and 044-E.7 were rewritten by
  Impl 044-D1A/044-E1A) to a positive assertion that both are now recognized ("complete"):
    suspicious.length: 8 -> 0
    each of the two labels' 4 observations individually asserted quality.status === "complete"
```
And explicitly **preserved, unchanged** (the trial already fully admits every entry — recognition changes
ONLY `ObservationQuality`, never admission or counting):
```text
044-F.1 : TrainingRowSubmission row count stays 44; ManualInputEntry count stays 48 (44 measured-value + 4
  context-note) — unaffected by this plan.
044-F.2 : status stays "accepted"; acceptedCount stays 48; limitations stays []; quality stays "complete".
044-F.3 : measured count stays 44; missing-data count stays 0; the partition (44+0+0=44) unchanged.
044-F.4, 044-F.6, 044-F.7, 044-F.8, 044-F.9, 044-F.10, 044-F.11 : UNCHANGED — none of these tests' subject
  matter (cross-sport metric recognition, the max-speed/avg-speed and avg-moving-speed/avg-speed distinctness
  evidence, units, provenance, notes, negative capability) is affected by this plan; each is re-verified, not
  assumed, once a future implementation exists.
```
Counts do **not** change merely because quality status changes — the trial already fully admits all 48
entries today; this plan only removes 8 "suspicious" flags, never touches `acceptedCount`/`limitations`/
observation-kind counts.

### `[DECISION]` Decision 9 — Trial 044-E regression plan (planned, not executed here)
Trial 044-E's fixture (`044-e-real-running-session-fixture.ts`) contains **none** of the two new cycling
labels — verified directly (its metric labels are limited to the running vocabulary: distance/duration/
avg-pace/optimal-pace/avg-cadence/max-cadence/avg-stride-length/moving-time/avg-moving-pace/avg-heart-rate/
max-heart-rate/elevation-gain/elevation-loss/calories). This plan therefore has **zero** code path that can
affect Trial 044-E's outcome. The future implementation must nonetheless explicitly re-run and re-verify,
unchanged: status `"accepted"`, `acceptedCount: 78`, `limitations: []`, `0` unknown-metric warnings, `69`
measured, `4` missing-data — an explicit regression check, not an assumption, exactly as Impl 044-E1A
performed for Trials 044-C/044-D.

### `[DECISION]` Decision 10 — Trial 044-D regression plan (planned, not executed here)
Trial 044-D's fixture (`044-d-real-swim-session-fixture.ts`) likewise contains **none** of the two new
cycling labels — verified directly (its labels are distance/duration/avg-pace/optimal-pace/swolf/
avg-heart-rate/max-heart-rate/total-strokes/avg-strokes-per-length/calories). Zero code path affects it. The
future implementation must explicitly re-run and re-verify, unchanged: status `"accepted"`,
`acceptedCount: 41`, `limitations: []`, `0` unknown-metric warnings.

### `[DECISION]` Decision 11 — Trial 044-C regression plan (planned, not executed here)
Trial 044-C's fixture (`044-c-real-swim-session-fixture.ts`) likewise contains **none** of the two new
cycling labels — verified directly (its labels are distance/duration/avg-pace/swolf/avg-heart-rate/
max-heart-rate/total-strokes/calories). Zero code path affects it. The future implementation must explicitly
re-run and re-verify, unchanged: status `"accepted"`, `acceptedCount: 21`, `limitations: []`, `0`
unknown-metric warnings.

### `[DECISION]` Decision 12 — Unit variation → preserved, untouched
Spec 044-F1's disposition (works as designed, not a gap) is unchanged by this plan. Real evidence now spans
three sport patterns: swimming (`distance` -> `m`, pace -> `s/100m`), running (`distance` -> `km`, pace ->
`s/km`), cycling (`distance` -> `km`, speed -> `km/h` — the exact unit found in the Trial 044-F fixture). No
unit conversion, no unit normalization, no canonical unit, no unit registry, and no cross-observation
arithmetic is introduced. Recognition of `max-speed`/`avg-moving-speed` does not alter unit strings in any
way — only metric-name recognition changes.

### `[DECISION]` Decision 13 — Missing-value evidence disposition (regression plan)
`entry.rawValue.trim() === "--"` (Impl 044-D2A) is entirely untouched by this plan — it is evaluated in
`mapEntry` BEFORE metric-name recognition is ever consulted (confirmed by the existing source: the
missing-token check returns immediately, never calling `qualityForMetricLabel`). Adding two new catalog
entries cannot interact with that check in any way. Preserving the binding correction (§2): Trial 044-F
contains zero `"--"` occurrences, so this plan explicitly does **NOT** add a fabricated 044-F missing-value
test, does **NOT** modify the Trial 044-F fixture to insert `"--"`, and does **NOT** claim `"--"` generalized
to cycling. Regression safety for the existing missing-value mechanism continues to rest on the existing
adapter tests and Trials 044-C/044-D/044-E, exactly as it does today. Required distinction: absence of the
missing token ≠ proof of missing-token behavior.

### `[DECISION]` Decision 14 — Cadence and power disposition
Trial 044-F's source has no cadence column and no power column at all (absent from the 13-column header, not
present-but-blank). Therefore no cycling cadence semantics and no cycling power semantics were exercised, and
none is planned here. No cadence tests, no power tests, no cycling power vocabulary, and no cross-sport
cadence model is added by this plan.

### `[DECISION]` Decision 15 — Closed-catalog guard update (planned, not executed here)
The existing static guard in `manual-input-adapter-negative-capability.test.ts`
(`extractRecognizedMetrics` + the test asserting exactly 25 entries) is updated, and ONLY it:
```text
expected count : 25 -> 27
expected list  : the 25 existing entries + "max-speed" + "avg-moving-speed"
test name/prose : updated to name both new entries (mirroring how the 044-E1A guard named
                 elevation-loss/max-cadence/avg-stride-length/moving-time/avg-moving-pace in its own test
                 title)
```
The guard continues to prove, unchanged: `RECOGNIZED_METRICS` stays unexported; no dynamic/config/db/network
vocabulary source token appears; no canonical-identity/alias/sport-registry/unit-normalization/fuzzy/LLM
token appears. No new, second, parallel guard is introduced.

---

## 6. Required Test Plan (planned — not implemented in this tech spec)

```text
 1. "max-speed" is recognized (quality.status "complete" via ingestManualInput's observable behavior).
 2. "avg-moving-speed" is recognized (quality.status "complete", same behavioral pattern).
 3. neither receives the unknown-metric "suspicious" warning.
 4. the raw label "max-speed" remains exactly preserved in Measurement.quantity.
 5. the raw label "avg-moving-speed" remains exactly preserved in Measurement.quantity.
 6. "max-speed" remains distinct from "avg-speed" (no aggregation/derivation introduced).
 7. "avg-moving-speed" remains distinct from "avg-speed" (no formula introduced).
 8. an unrelated, still-unfamiliar metric label (NOT one of the now-27 entries) still resolves to
    "suspicious" — proving the catalog stayed closed, not opened wide.
 9. Trial 044-F's suspicious count drops from 8 to 0 (044-F.5, updated).
10. Trial 044-F's status remains "accepted" (044-F.2, unchanged assertion, re-verified).
11. Trial 044-F's acceptedCount remains 48 (044-F.2, unchanged assertion, re-verified).
12. Trial 044-F's limitations remain [] (044-F.2, unchanged assertion, re-verified).
13. Trial 044-F's measured-observation count remains 44 (044-F.3, unchanged assertion, re-verified).
14. Trial 044-F's missing-data count remains 0 (044-F.3, unchanged assertion, re-verified).
15. Trial 044-F's subjective/context count remains 4 (044-F.10, unchanged assertion, re-verified).
16. Trial 044-E remains accepted / acceptedCount 78 / limitations [] / 0 unknown warnings (regression
    re-check, Decision 9).
17. Trial 044-D remains accepted / acceptedCount 41 / limitations [] / 0 unknown warnings (regression
    re-check, Decision 10).
18. Trial 044-C remains accepted / acceptedCount 21 / limitations [] / 0 unknown warnings (regression
    re-check, Decision 11).
19. units remain verbatim (km / km-h in cycling, km / s-per-km in running, m / s-per-100m in swim) — untouched
    by this plan.
20. the closed-catalog guard's extracted list has exactly 27 entries.
21. the catalog remains literal, closed, local, and unexported (existing guard, unchanged assertions).
22. no alias-infrastructure token appears (existing guard, unchanged assertions).
23. no canonical speed/pace identity token appears (existing guard, unchanged assertions).
24. no sport-specific-registry token appears (existing guard, unchanged assertions).
25. no unit-normalization-infrastructure token appears (existing guard, unchanged assertions).
26. no runtime speed derivation appears (new check, if not already covered by existing guard tokens).
27. no fuzzy-matching/LLM-classification token appears (existing guard, unchanged assertions).
```

`[DECISION]` No fabricated 044-F missing-value test is planned — the real Trial 044-F source contains no
`"--"`; existing adapter and prior-trial tests remain the sole regression safety for missing-value behavior.
Existing tests are reused wherever possible; this plan does not inflate the test count beyond items 1–8 plus
the necessary trial-assertion updates and regression re-checks (items 9–27 are largely re-verifications of
already-existing assertions, not new tests).

---

## 7. Required Implementation Slicing

```text
Implementation 044-F1A — Extend Real Cycling Metric Vocabulary

scope:
  - RECOGNIZED_METRICS literal update (add "max-speed", "avg-moving-speed" — 25 -> 27 entries), inside
    manual-input-adapter.ts only.
  - focused behavior tests (§6 items 1–8).
  - Trial 044-F assertion update (§6 items 9–15, Decision 8) — admission counts stay exactly as they are;
    only the suspicious-count assertion changes.
  - Trial 044-E regression re-check (§6 item 16, Decision 9).
  - Trial 044-D regression re-check (§6 item 17, Decision 10).
  - Trial 044-C regression re-check (§6 item 18, Decision 11).
  - the existing closed-catalog guard's count/list update (§6 items 20–27, Decision 15) — the SAME guard,
    not a new one.
  - no dependency, no package/lockfile change.

explicitly NOT part of this slice:
  canonical speed/pace identity · alias mapping · cycling registry · sport-specific registry · unit
  normalization/conversion · cross-observation arithmetic · speed/pace conversion formulas · runtime metric
  derivation · pause-detection logic · cadence semantics · power semantics · temporal-provenance fix ·
  broader missing-value handling · synthetic "--" evidence of any kind.
```

---

## 8. Required Acceptance Criteria (Given / When / Then)

```text
Given a real max-speed row, when recognition runs, then it is recognized without an unknown-metric warning.

Given a real avg-moving-speed row, when recognition runs, then it is recognized without an unknown-metric
  warning.

Given max-speed is recognized, when admitted, then Aurora does not compute or validate a maximum.

Given avg-moving-speed is recognized, when admitted, then Aurora does not encode a Garmin moving-speed
  formula.

Given either new metric is admitted, when Observation material is created, then the raw source label remains
  preserved.

Given an unrelated unfamiliar metric, when intake runs, then it remains admitted with a suspicious warning.

Given Trial 044-F, when vocabulary is extended, then unknown warnings disappear while all admission and
  observation counts remain unchanged.

Given Trial 044-F contains zero "--" tokens, when implementation tests are updated, then no synthetic
  missing-value evidence is added.

Given Trials 044-C, 044-D, and 044-E, when vocabulary is extended, then their accepted outcomes remain
  unchanged.

Given real cross-sport unit variation, when no functional conflict exists, then no unit-normalization
  infrastructure is introduced.

Given cycling uses speed vocabulary and previous sports use pace vocabulary, when no reconciliation need
  exists, then no canonical speed/pace identity is introduced.

Given recognition succeeds, when Observation material is admitted, then no Signal/Evidence/RenderingRequest/
  runtime/delivery/AthleteDecision action occurs.

Given AC20, when the catalog is extended, then no production whole-core composer is introduced.
```

---

## 9. Required Forbidden Behaviors (this tech spec)

```text
implementation code in this tech spec · RECOGNIZED_METRICS edit · test changes ·
canonical speed/pace identity · alias mapping · cycling registry · sport-specific registry ·
unit normalization · unit conversion · canonical unit fields · cross-observation arithmetic ·
speed↔pace conversion · inverse formulas · runtime speed derivation · Garmin formulas · pause-detection
logic · synthetic "--" insertion · fabricated missing-value evidence · broader missing-value support ·
cadence implementation · power implementation · timestamp/provenance fix · new dependency · package changes ·
CSV parser · FIT parser · TCX parser · Garmin API · automatic Signal · automatic EvidenceCase · automatic
RenderingRequest · automatic runOperatorSession · delivery · automatic AthleteDecision · API/UI/server ·
production whole-core composer · reflection-composition · AC20 amendment
```

---

## 10. Relationship to Existing Architecture

- **Spec 044-F1** — this plan implements exactly its Decision areas 1–11 (Option A only) — no scope
  expansion.
- **Manual Data Trial 044-F** — this plan's Decision 8 is the direct, evidence-traceable expected change to
  that trial's own assertions; every admission count stays exactly as it is.
- **Manual Data Trials 044-C / 044-D / 044-E** — explicitly re-verified as regression checks (Decisions
  9/10/11), not assumed safe, since none of their fixtures contains either new label.
- **Impl 044-C1A / Impl 044-D1A / Impl 044-E1A** — this plan follows their exact precedent: same file, same
  `Set` literal, same unexported guard pattern, same "recognition removes a warning, never claims truth"
  discipline.
- **Impl 044-D2A** — the missing-value mechanism is confirmed structurally prior to and independent of
  metric-name recognition (Decision 13); this plan cannot and does not interact with it, and explicitly
  carries forward Spec 044-F1's missing-value evidence correction.
- **AC20** — unchanged; this plan selects no new type, module, or composer.

---

## 11. Decision & Next Mission

`[DECISION] Implementation 044-F1A plan: add exactly "max-speed" and "avg-moving-speed" to the existing
RECOGNIZED_METRICS Set literal (25 -> 27 entries) in manual-input-adapter.ts; update the existing static
closed-catalog guard's expected count/list (the same guard Impl 044-C1A introduced and Impl 044-D1A/044-E1A
already extended, not a new one); update Trial 044-F's suspicious-count assertion (8 -> 0) while explicitly
preserving its status ("accepted"), acceptedCount (48), limitations ([]), and observation-kind counts (44
measured / 0 missing-data / 4 subjective) exactly as they are; explicitly re-verify Trials 044-C, 044-D, and
044-E's unaffected results as regression checks. No registry, alias, canonicalization, sport-partitioning,
unit-normalization, or runtime-derivation infrastructure of any kind.`

```text
exact metric entries                 : "max-speed", "avg-moving-speed" — already in normalized (lowercase,
                                        kebab-case) form, requiring no transformation.
catalog count before/after           : 25 -> 27 (confirmed exact current count by direct source inspection).
lookup normalization behavior        : unchanged — normalizeMetricLabel applies only to the incoming label at
                                        lookup time; catalog entries are stored pre-normalized.
closed-catalog decision              : stays closed, literal, local, unexported; the EXISTING static guard is
                                        updated, not duplicated.
max-speed behavior                   : recognition adds only the label string; no maximum computation, no
                                        GPS-derived validation, no avg/max canonical identity.
avg-moving-speed behavior            : recognition adds only the label string; no distance/moving-time
                                        formula, no pause-detection logic, no Garmin moving-speed formula.
raw-label preservation decision      : unconditional, unchanged — Measurement.quantity stays entry.label
                                        verbatim.
unknown-metric behavior              : unchanged — any OTHER unrecognized label still resolves to
                                        "suspicious"; the open-ended intake behavior is fully preserved.
Trial 044-F expected change           : suspicious count 8 -> 0; status/acceptedCount/limitations/
                                        observation-kind counts UNCHANGED (accepted / 48 / [] / 44 measured /
                                        0 missing-data / 4 subjective) — recognition changes
                                        ObservationQuality only, never admission.
Trial 044-E regression expectation    : remains accepted / acceptedCount 78 / limitations [] / 0 unknown —
                                        explicitly re-verified; neither new label appears in that trial's
                                        fixture.
Trial 044-D regression expectation    : remains accepted / acceptedCount 41 / limitations [] / 0 unknown —
                                        explicitly re-verified; neither new label appears in that trial's
                                        fixture.
Trial 044-C regression expectation    : remains accepted / acceptedCount 21 / limitations [] / 0 unknown —
                                        explicitly re-verified; neither new label appears in that trial's
                                        fixture.
unit-variation disposition            : unchanged from Spec 044-F1 — works as designed; no conversion/
                                        normalization/canonical-unit/registry/cross-observation-arithmetic
                                        introduced; cycling's exact km/km-h unit stays untouched.
missing-value evidence disposition    : Trial 044-F has zero "--" occurrences — this plan does not add a
                                        fabricated 044-F missing-value test, does not modify the fixture to
                                        insert "--", and does not claim generalization to cycling; the
                                        existing exact "--" check runs before, and independently of, metric
                                        recognition, and cannot be affected by this plan.
confirmation no synthetic "--" evidence planned : confirmed — none planned, none needed.
cadence/power disposition             : both columns are entirely absent from the Trial 044-F source (not
                                        blank); no cycling cadence semantics and no cycling power semantics
                                        are exercised or planned.
guard update plan                     : update the ONE existing closed-catalog guard's expected count (25 ->
                                        27) and list; all its other assertions stay exactly as they are,
                                        unweakened.
next implementation slice             : Implementation 044-F1A — Extend Real Cycling Metric Vocabulary (§7).
```

`[RECOMMENDATION] Next mission: Implementation 044-F1A — Extend Real Cycling Metric Vocabulary.` Exactly the
scope in §7 — a two-string literal-array addition, its focused behavior tests, the Trial 044-F assertion
update, the Trial 044-C/044-D/044-E regression re-checks, and the existing closed-catalog guard's count/list
update. No dependency, no migration, no configuration, no export of `RECOGNIZED_METRICS`. The unit-variation
finding, the speed/pace vocabulary finding, the cadence/power finding, and the missing-value finding each
remain **separate** candidate topics — none is recommended as immediate scope beyond the two-label addition,
and none is recommended without its own future evidence and approval.

---

## 12. Validation & Invariants at This Tech Spec

`tsc --noEmit` clean; `node --test` **1091/1091** (unchanged — this tech spec is docs-only). No code/test/
package/lockfile/tsconfig change; no dependency added; no guard weakened; AC20 untouched.
