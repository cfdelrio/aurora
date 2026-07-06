# Aurora — Technical Specification 044-E1A — Real Running Metric Vocabulary Implementation Plan

> **Status (2026-07-05).** Technical Specification phase, building on Spec 044-E1 (`6869fa5`). It is
> **behavioral / docs-only**: it implements no code, does not edit `RECOGNIZED_METRICS`, adds no dependency,
> no package/test change, adds no canonicalization/alias/sport-specific/unit-normalization infrastructure, no
> fuzzy/LLM matching, does not touch missing-value handling or numeric parsing, creates no
> `Signal`/`EvidenceCase`/`RenderingRequest`, calls no `runOperatorSession`, adds no delivery, creates no
> `AthleteDecision` automatically, introduces no production whole-core composer, and amends no AC20. Base:
> `tsc --noEmit` clean; `node --test` **1080/1080**. It plans the exact, minimal catalog extension Spec
> 044-E1 approved.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — one level more concrete than Spec 044-E1, still no code. It
names exact strings, exact test additions, and an exact next Implementation slice.

---

## 1. Required grounding check (verified before planning anything)

`[FACT]` All six preconditions re-verified true, directly against current source and current test output, at
authorship of this tech spec:

```text
1. RECOGNIZED_METRICS count is exactly 20        : TRUE (direct source inspection, manual-input-adapter.ts).
2. Catalog remains literal, local, unexported     : TRUE — unchanged since Impl 044-D1A.
3. The same closed-catalog guard still exists     : TRUE — manual-input-adapter-negative-capability.test.ts,
                                                     the "RECOGNIZED_METRICS remains a literal, closed
                                                     catalog of exactly 20 entries..." test.
4. Trial 044-E reports exactly 25 suspicious      : TRUE — confirmed by re-running
                                                     044-e-real-running-session-trial.test.ts (test 044-E.7:
                                                     5 labels × 5 rows = 25).
5. Trial 044-C remains accepted / 21 / []         : TRUE — confirmed by re-running
                                                     044-c-real-swim-session-trial.test.ts (all 8 tests pass).
6. Trial 044-D remains accepted / 41 / []         : TRUE — confirmed by re-running
                                                     044-d-real-swim-session-trial.test.ts (all 12 tests
                                                     pass).
```

No discrepancy exists; this plan proceeds exactly as Spec 044-E1 anticipated.

---

## 2. Context

`[FACT]` Spec 044-E1 (`6869fa5`) selected Option A — extend `RECOGNIZED_METRICS` only — and classified all
five real, Trial-044-E-observed labels as distinct metrics, none an alias of anything already recognized:
`elevation-loss` (pairs with the already-recognized `elevation-gain` as a genuine ascent/descent split),
`max-cadence` (an avg/max extremum pairing with `avg-cadence`), `avg-stride-length` (no comparable existing
entry), `moving-time` (decisively distinct from `duration`, evidenced by the paused lap), and
`avg-moving-pace` (decisively distinct from `avg-pace`/`optimal-pace`, evidenced the same way). This tech
spec plans the exact, smallest change that adds them.

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
]); // exactly 20 entries today

function normalizeMetricLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "-");
}

function qualityForMetricLabel(label: string): ObservationQuality {
  return RECOGNIZED_METRICS.has(normalizeMetricLabel(label))
    ? qualityComplete()
    : observationQuality("suspicious", "unrecognized metric name — recorded as reported, not rejected");
}
```

`[FACT]` **Normalization behavior, confirmed exactly, unchanged since Impl 044-C1A/044-D1A:**
`normalizeMetricLabel` is applied **only to the incoming label** at lookup time (trim → lowercase → collapse
whitespace to a single hyphen). All five new candidate strings — `"elevation-loss"`, `"max-cadence"`,
`"avg-stride-length"`, `"moving-time"`, `"avg-moving-pace"` — are **already** lowercase, kebab-case, with no
leading/trailing whitespace — verified directly against the fixture
(`044-e-real-running-session-fixture.ts`, where all five appear literally as
`metric: "elevation-loss"` / `metric: "max-cadence"` / `metric: "avg-stride-length"` /
`metric: "moving-time"` / `metric: "avg-moving-pace"`) — **no transformation is needed** before adding them
to the `Set` initializer, exactly matching Tech Spec 044-C1A/044-D1A's finding for their respective new
entries.

`[FACT]` `RECOGNIZED_METRICS` remains **not exported**, unchanged. The existing static, text-based
closed-catalog guard (`manual-input-adapter-negative-capability.test.ts`, function
`extractRecognizedMetrics`, test `"044-D1A RECOGNIZED_METRICS remains a literal, closed catalog of exactly
20 entries..."`) reads the `Set([...])` literal as text and asserts an exact 20-entry list. This plan updates
that SAME guard's expected count and list — it does not introduce a second, parallel guard.

---

## 3. Central Question

> How should Aurora minimally add the five real running metric labels Spec 044-E1 approved to the existing
> closed `RECOGNIZED_METRICS` catalog while preserving all current cross-sport behavior?

```text
recognized running metric ≠ universal metric standard · recognized label ≠ canonical identity ·
recognizing "moving-time" ≠ an automatic time-semantics model · recognizing "avg-moving-pace" ≠ a Garmin
formula encoded · real unit variation ≠ a unit-normalization gap ·
this catalog extension ≠ a registry ≠ configuration ≠ a database ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 4. Required inputs consulted

```text
docs/specs/044-E1-real-running-metric-vocabulary-boundary.md
docs/trials/044-E-first-real-running-session-intake-trial.md
docs/specs/044-C1A-metric-vocabulary-implementation-plan.md
docs/specs/044-D1A-additional-metric-vocabulary-implementation-plan.md
src/modules/observation/application/manual-input-adapter.ts   (RECOGNIZED_METRICS, normalizeMetricLabel,
                                                                 qualityForMetricLabel — exact source, §2)
src/modules/observation/tests/044-e-real-running-session-fixture.ts
src/modules/observation/tests/044-e-real-running-session-trial.test.ts
src/modules/observation/tests/044-c-real-swim-session-trial.test.ts
src/modules/observation/tests/044-d-real-swim-session-trial.test.ts
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
"elevation-loss"
"max-cadence"
"avg-stride-length"
"moving-time"
"avg-moving-pace"
```
Verified against the current normalization behavior (§2) and against the exact strings already used in the
Trial 044-E fixture: all five are already trimmed, lowercase, kebab-case — **no transformation is needed**
before adding them literally to the `Set` initializer. Explicitly **NOT** added: `"descent"`,
`"total-descent"`, `"stride-length"`, `"average-stride-length"`, `"moving-duration"`, `"moving-pace"`,
`"best-moving-pace"` — none of these matches the exact source label the real evidence produced, and
inventing an alternate spelling now would itself be an unevidenced normalization decision (exactly what
Spec 044-E1 declined to build). No aliases are introduced in this slice.

### `[DECISION]` Decision 2 — Catalog remains flat, closed, and unexported
Confirmed: `RECOGNIZED_METRICS` stays a **closed, explicit, literal `Set<string>`**, unexported, in exactly
the one file that defines it today. No canonical metric ids, no alias map, no running registry, no
sport-specific registry, no configuration-driven registry, no database vocabulary, no remote vocabulary, no
plugin system. The catalog grows only by an explicit, reviewed literal-array edit — exactly how all 20
existing entries were added across this arc.

### `[DECISION]` Decision 3 — `elevation-loss` behavior
Recognition adds **only** the string `"elevation-loss"` to the `Set` — nothing about ascent/descent
computation is encoded anywhere. `qualityForMetricLabel` performs a pure string-membership check; it will
not, after this change, map `elevation-loss` to `elevation-gain`, derive it from GPS points, rename it
`total-descent`, or introduce any ascent/descent canonical identity. `Measurement.quantity` continues to
store the raw label `"elevation-loss"` verbatim — recognition removes the unknown-metric warning only.

### `[DECISION]` Decision 4 — `max-cadence` behavior
Recognition adds **only** the string `"max-cadence"` to the `Set` — no mapping to, derivation from, or
aggregation with `"avg-cadence"` is introduced; no "cadence aggregation model" or running-only cadence
semantics exists after this change. Each is still parsed, validated, and recorded entirely independently, as
two unrelated `measured-value` entries with no cross-reference between them — exactly the same
non-relationship Impl 044-D1A already established for `avg-strokes-per-length`/`total-strokes`.

### `[DECISION]` Decision 5 — `avg-stride-length` behavior
Recognition adds **only** the string `"avg-stride-length"` to the `Set` — no derivation from
distance/cadence, no unit conversion, no validation against pace, no stride domain object of any kind.
`qualityForMetricLabel` never calculates, cross-checks, or derives one metric's value from another's for
this label, exactly as for every other entry in the catalog.

### `[DECISION]` Decision 6 — `moving-time` behavior
Recognition adds **only** the string `"moving-time"` to the `Set`. Recognizing this label is explicitly
**not** the same as solving temporal provenance (the still-open, separate gap from Trials 044-C/044-D/044-E)
— no canonical time-identity model, no elapsed-vs-moving-time reconciliation framework, and no duration
cross-checking is introduced. `moving-time` and `duration` remain two entirely independent `measured-value`
entries, exactly as `elevation-loss`/`elevation-gain` and `max-cadence`/`avg-cadence` do.

### `[DECISION]` Decision 7 — `avg-moving-pace` behavior
Recognition adds **only** the string `"avg-moving-pace"` to the `Set` — no Garmin formula, no
moving-time-divided-by-distance calculation, no pace-derivation logic, and no "best pace" semantics (which
would conflate it with the already-distinct `optimal-pace`) is encoded anywhere. It remains recognized
purely as a name, independent of `avg-pace` and `optimal-pace`, exactly as Decision 6 established for
`moving-time` relative to `duration`.

### `[DECISION]` Decision 8 — Raw label preservation → unconditional, unchanged
`Measurement.quantity` continues to carry `entry.label` **verbatim** (`mapEntry`'s `measured-value` case,
untouched by this plan). Recognizing any of the five labels never rewrites them into a canonical id or an
alternative spelling.

### `[DECISION]` Decision 9 — Unknown-metric behavior for future labels → unchanged
Adding these five entries does **not** alter `qualityForMetricLabel`'s logic in any way — any OTHER
unrecognized label still resolves to `observationQuality("suspicious", "unrecognized metric name — recorded
as reported, not rejected")`, exactly as today. No behavior branch is added, removed, or restructured — only
the `Set` literal's contents change.

### `[DECISION]` Decision 10 — Trial 044-E expected changes (planned, not executed here)
Inspecting the trial's exact current assertions (`044-e-real-running-session-trial.test.ts`), the FUTURE
implementation is expected to change **only**:
```text
044-E.7 (currently: "five genuinely new running-specific metric labels are admitted but flagged
  suspicious...") -> its NARRATIVE changes (mirroring how 044-D.5 was rewritten by Impl 044-D1A) to a
  positive assertion that all five are now recognized ("complete"):
    suspicious.length: 25 -> 0
    each of the five labels' 5 observations individually asserted quality.status === "complete"
```
And explicitly **preserved, unchanged** (the trial already fully admits every entry — recognition changes
ONLY `ObservationQuality`, never admission or counting):
```text
044-E.2 : status stays "accepted"; acceptedCount stays 78; limitations stays []; quality stays "complete".
044-E.3 : measured count stays 69; missing-data count stays 4; the three-way partition (69+4+0=73) unchanged.
044-E.1, 044-E.4, 044-E.5, 044-E.6, 044-E.8, 044-E.9, 044-E.10, 044-E.11, 044-E.12 : UNCHANGED — none of
  these tests' subject matter (row/entry counts, missing-value behavior, optimal-pace/avg-cadence
  recognition, the paused-lap divergence evidence, units, provenance, notes, negative capability) is
  affected by this plan; each is re-verified, not assumed, once a future implementation exists.
```
Counts do **not** change merely because quality status changes — the trial already fully admits all 78
entries today; this plan only removes 25 "suspicious" flags, never touches `acceptedCount`/`limitations`/
observation-kind counts.

### `[DECISION]` Decision 11 — Trial 044-C regression plan (planned, not executed here)
Trial 044-C's fixture (`044-c-real-swim-session-fixture.ts`) contains **none** of the five new labels —
verified directly (its metric labels are limited to distance/duration/avg-pace/swolf/avg-heart-rate/
max-heart-rate/total-strokes/calories). This plan therefore has **zero** code path that can affect Trial
044-C's outcome. The future implementation must nonetheless explicitly re-run and re-verify, unchanged:
status `"accepted"`, `acceptedCount: 21`, `limitations: []`, zero suspicious — an explicit regression check,
not an assumption, exactly as Impl 044-D1A performed for the same trial.

### `[DECISION]` Decision 12 — Trial 044-D regression plan (planned, not executed here)
Trial 044-D's fixture (`044-d-real-swim-session-fixture.ts`) likewise contains **none** of the five new
running labels — verified directly (its labels are distance/duration/avg-pace/optimal-pace/swolf/
avg-heart-rate/max-heart-rate/total-strokes/avg-strokes-per-length/calories). Zero code path affects it. The
future implementation must explicitly re-run and re-verify, unchanged: status `"accepted"`,
`acceptedCount: 41`, `limitations: []`, zero suspicious.

### `[DECISION]` Decision 13 — Unit variation → preserved, untouched
Spec 044-E1's disposition (works as designed, not a gap) is unchanged by this plan. No unit conversion, no
unit normalization, no canonical unit field, and no cross-observation arithmetic is introduced. `"distance"`
stays `"km"` in the running fixture and `"m"` in both swim fixtures; the pace family stays `"s/km"` vs.
`"s/100m"` — this plan does not touch units in any way, only metric-name recognition.

### `[DECISION]` Decision 14 — Missing-value regression plan
`entry.rawValue.trim() === "--"` (Impl 044-D2A) is entirely untouched by this plan — it is evaluated in
`mapEntry` BEFORE metric-name recognition is ever consulted (confirmed by the existing source: the
missing-token check returns immediately, never calling `qualityForMetricLabel`). Adding five new catalog
entries cannot interact with that check in any way. No broader missing-value token support, no registry, is
introduced.

### `[DECISION]` Decision 15 — Closed-catalog guard update (planned, not executed here)
The existing static guard in `manual-input-adapter-negative-capability.test.ts`
(`extractRecognizedMetrics` + the test asserting exactly 20 entries) is updated, and ONLY it:
```text
expected count : 20 -> 25
expected list  : the 20 existing entries + "elevation-loss" + "max-cadence" + "avg-stride-length" +
                 "moving-time" + "avg-moving-pace"
test name/prose : updated to name all five new entries (mirroring how the 044-D1A guard named
                 optimal-pace/avg-strokes-per-length in its own test title)
```
The guard continues to prove, unchanged: `RECOGNIZED_METRICS` stays unexported; no dynamic/config/db/network
vocabulary source token appears; no canonical-identity/alias/sport-registry/fuzzy/LLM token appears. No new,
second, parallel guard is introduced.

---

## 6. Required Test Plan (planned — not implemented in this tech spec)

```text
 1. "elevation-loss" is recognized (quality.status "complete" via ingestManualInput's observable behavior).
 2. "max-cadence" is recognized (quality.status "complete", same behavioral pattern).
 3. "avg-stride-length" is recognized (quality.status "complete", same behavioral pattern).
 4. "moving-time" is recognized (quality.status "complete", same behavioral pattern).
 5. "avg-moving-pace" is recognized (quality.status "complete", same behavioral pattern).
 6. none of the five receives the unknown-metric "suspicious" warning.
 7. the raw label "elevation-loss" remains exactly preserved in Measurement.quantity.
 8. the raw label "max-cadence" remains exactly preserved in Measurement.quantity.
 9. the raw label "avg-stride-length" remains exactly preserved in Measurement.quantity.
10. the raw label "moving-time" remains exactly preserved in Measurement.quantity.
11. the raw label "avg-moving-pace" remains exactly preserved in Measurement.quantity.
12. an unrelated, still-unfamiliar metric label (NOT one of the now-25 entries) still resolves to
    "suspicious" — proving the catalog stayed closed, not opened wide.
13. Trial 044-E's suspicious count drops from 25 to 0 (044-E.7, updated).
14. Trial 044-E's status remains "accepted" (044-E.2, unchanged assertion, re-verified).
15. Trial 044-E's acceptedCount remains 78 (044-E.2, unchanged assertion, re-verified).
16. Trial 044-E's limitations remain [] (044-E.2, unchanged assertion, re-verified).
17. Trial 044-E's measured-observation count remains 69 (044-E.3, unchanged assertion, re-verified).
18. Trial 044-E's missing-data count remains 4 (044-E.3, unchanged assertion, re-verified).
19. Trial 044-C remains accepted / acceptedCount 21 / limitations [] (regression re-check, Decision 11).
20. Trial 044-D remains accepted / acceptedCount 41 / limitations [] (regression re-check, Decision 12).
21. the exact "--" missing-value behavior remains unchanged (no new interaction with metric recognition).
22. units remain verbatim (km/s-per-km in running, m/s-per-100m in swim) — untouched by this plan.
23. the closed-catalog guard's extracted list has exactly 25 entries.
24. the catalog remains literal, closed, and unexported (existing guard, unchanged assertions).
25. no alias-infrastructure token appears (existing guard, unchanged assertions).
26. no canonical-metric-identity token appears (existing guard, unchanged assertions).
27. no sport-specific-registry token appears (existing guard, unchanged assertions).
28. no unit-normalization-infrastructure token appears (new check, if not already covered).
29. no fuzzy-matching/LLM-classification token appears (existing guard, unchanged assertions).
```

---

## 7. Required Implementation Slicing

```text
Implementation 044-E1A — Extend Real Running Metric Vocabulary

scope:
  - RECOGNIZED_METRICS literal update (add "elevation-loss", "max-cadence", "avg-stride-length",
    "moving-time", "avg-moving-pace" — 20 -> 25 entries), inside manual-input-adapter.ts only.
  - focused behavior tests (§6 items 1–12).
  - Trial 044-E assertion update (§6 items 13–18, Decision 10) — admission counts stay exactly as they are;
    only the suspicious-count assertion changes.
  - Trial 044-C regression re-check (§6 item 19, Decision 11).
  - Trial 044-D regression re-check (§6 item 20, Decision 12).
  - the existing closed-catalog guard's count/list update (§6 items 23–29, Decision 15) — the SAME guard,
    not a new one.
  - no dependency, no package/lockfile change.

explicitly NOT part of this slice:
  canonical metric identity · alias mapping · running registry · sport-specific registry · unit
  normalization/conversion · cross-observation arithmetic · Garmin semantic formulas · runtime metric
  derivation · temporal-semantics implementation · broader missing-value handling.
```

---

## 8. Required Acceptance Criteria (Given / When / Then)

```text
Given a real elevation-loss row, when recognition runs, then it is recognized without an unknown-metric
  warning.

Given a real max-cadence row, when recognition runs, then it remains distinct from avg-cadence.

Given a real avg-stride-length row, when recognized, then no runtime derivation is introduced.

Given a real moving-time row, when recognized, then no temporal-semantics model is introduced.

Given a real avg-moving-pace row, when recognized, then no Garmin formula is encoded.

Given any of the five labels, when Observation material is created, then the raw source label remains
  preserved.

Given an unrelated unfamiliar metric, when intake runs, then it remains admitted with a suspicious warning.

Given Trial 044-E, when vocabulary is extended, then unknown warnings disappear while all admission counts
  remain unchanged.

Given Trials 044-C and 044-D, when vocabulary is extended, then their accepted results remain unchanged.

Given real unit variation, when no functional conflict exists, then no unit-normalization infrastructure is
  introduced.

Given exact "--" missing data, when intake runs, then existing MissingDataObservation behavior remains
  unchanged.

Given recognition succeeds, when Observation material is admitted, then no Signal/Evidence/RenderingRequest/
  runtime/delivery/AthleteDecision action occurs.

Given AC20, when the catalog is extended, then no production whole-core composer is introduced.
```

---

## 9. Required Forbidden Behaviors (this tech spec)

```text
implementation code in this tech spec · RECOGNIZED_METRICS edit · test changes · canonical metric identity ·
alias mapping · running registry · sport-specific registry · unit normalization · unit conversion ·
cross-observation arithmetic · Garmin semantic formulas · runtime metric derivation · temporal semantics
implementation · broader missing-value handling · new dependency · package changes · CSV parser · FIT
parser · TCX parser · Garmin API · automatic Signal · automatic EvidenceCase · automatic RenderingRequest ·
automatic runOperatorSession · delivery · automatic AthleteDecision · API/UI/server · production whole-core
composer · reflection-composition · AC20 amendment
```

---

## 10. Relationship to Existing Architecture

- **Spec 044-E1** — this plan implements exactly its Decision areas 1–10 (Option A only) — no scope
  expansion.
- **Manual Data Trial 044-E** — this plan's Decision 10 is the direct, evidence-traceable expected change to
  that trial's own assertions; every admission count stays exactly as it is.
- **Manual Data Trials 044-C / 044-D** — explicitly re-verified as regression checks (Decisions 11/12), not
  assumed safe, since neither fixture contains any of the five new labels.
- **Impl 044-C1A / Impl 044-D1A** — this plan follows their exact precedent: same file, same `Set` literal,
  same unexported guard pattern, same "recognition removes a warning, never claims truth" discipline.
- **Impl 044-D2A** — the missing-value mechanism is confirmed structurally prior to and independent of
  metric-name recognition (Decision 14); this plan cannot and does not interact with it.
- **AC20** — unchanged; this plan selects no new type, module, or composer.

---

## 11. Decision & Next Mission

`[DECISION] Implementation 044-E1A plan: add exactly "elevation-loss", "max-cadence", "avg-stride-length",
"moving-time", and "avg-moving-pace" to the existing RECOGNIZED_METRICS Set literal (20 -> 25 entries) in
manual-input-adapter.ts; update the existing static closed-catalog guard's expected count/list (the same
guard Impl 044-C1A introduced and Impl 044-D1A already extended, not a new one); update Trial 044-E's
suspicious-count assertion (25 -> 0) while explicitly preserving its status ("accepted"), acceptedCount (78),
limitations ([]), and observation-kind counts (69 measured / 4 missing-data) exactly as they are; explicitly
re-verify Trials 044-C and 044-D's unaffected results as regression checks. No registry, alias,
canonicalization, sport-partitioning, unit-normalization, or runtime-derivation infrastructure of any kind.`

```text
exact metric entries              : "elevation-loss", "max-cadence", "avg-stride-length", "moving-time",
                                     "avg-moving-pace" — already in normalized (lowercase, kebab-case) form,
                                     requiring no transformation.
catalog count before/after         : 20 -> 25 (confirmed exact current count by direct source inspection).
lookup normalization behavior      : unchanged — normalizeMetricLabel applies only to the incoming label at
                                     lookup time; catalog entries are stored pre-normalized.
closed-catalog decision            : stays closed, literal, unexported; the EXISTING static guard is updated,
                                     not duplicated.
elevation-loss behavior            : recognition adds only the label string; no mapping to elevation-gain,
                                     no GPS-derived computation, no ascent/descent canonical identity.
max-cadence behavior               : recognition adds only the label string; stays independent of
                                     avg-cadence; no aggregation model, no max-from-average derivation.
avg-stride-length behavior         : recognition adds only the label string; no derivation from distance/
                                     cadence/pace, no unit conversion, no stride domain object.
moving-time behavior               : recognition adds only the label string; explicitly does NOT solve
                                     temporal provenance; no canonical time-identity model, no elapsed-vs-
                                     moving reconciliation framework.
avg-moving-pace behavior           : recognition adds only the label string; no Garmin formula, no
                                     moving-time/distance calculation, no "best pace" semantics (kept
                                     distinct from optimal-pace).
raw-label preservation             : unconditional, unchanged — Measurement.quantity stays entry.label
                                     verbatim.
unknown-metric behavior            : unchanged — any OTHER unrecognized label still resolves to "suspicious";
                                     the open-ended intake behavior is fully preserved.
Trial 044-E expected changes       : suspicious count 25 -> 0; status/acceptedCount/limitations/observation-
                                     kind counts UNCHANGED (accepted / 78 / [] / 69 measured / 4 missing-data)
                                     — recognition changes ObservationQuality only, never admission.
Trial 044-C regression expectation : remains accepted / acceptedCount 21 / limitations [] — explicitly
                                     re-verified; neither new label appears in that trial's fixture.
Trial 044-D regression expectation : remains accepted / acceptedCount 41 / limitations [] — explicitly
                                     re-verified; neither new label appears in that trial's fixture.
unit-variation disposition         : unchanged from Spec 044-E1 — works as designed; no conversion/
                                     normalization/canonical-unit/cross-observation-arithmetic introduced.
missing-value regression expectation : unchanged — the exact "--" check runs before, and independently of,
                                     metric recognition; cannot be affected by this plan.
guard update plan                  : update the ONE existing closed-catalog guard's expected count (20 -> 25)
                                     and list; all its other assertions stay exactly as they are, unweakened.
next implementation slice          : Implementation 044-E1A — Extend Real Running Metric Vocabulary (§7).
```

`[RECOMMENDATION] Next mission: Implementation 044-E1A — Extend Real Running Metric Vocabulary.` Exactly the
scope in §7 — a five-string literal-array addition, its focused behavior tests, the Trial 044-E assertion
update, the Trial 044-C and 044-D regression re-checks, and the existing closed-catalog guard's count/list
update. No dependency, no migration, no configuration, no export of `RECOGNIZED_METRICS`. The unit-variation
finding, the temporal-provenance finding, and the missing-value finding each remain **separate** candidate
missions — none is recommended as immediate without its own future evidence and approval.

---

## 12. Validation & Invariants at This Tech Spec

`tsc --noEmit` clean; `node --test` **1080/1080** (unchanged — this tech spec is docs-only). No code/test/
package/lockfile/tsconfig change; no dependency added; no guard weakened; AC20 untouched.
