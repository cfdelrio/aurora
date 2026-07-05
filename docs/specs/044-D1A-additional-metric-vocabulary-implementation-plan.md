# Aurora — Technical Specification 044-D1A — Additional Metric Vocabulary Implementation Plan

> **Status (2026-07-05).** Technical Specification phase, building on Spec 044-D1 (`da8b4c7`). It is
> **behavioral / docs-only**: it implements no code, does not edit `RECOGNIZED_METRICS`, adds no dependency, no
> package/test change, adds no canonicalization/alias/sport-specific/configuration/database/remote registry
> infrastructure, no fuzzy/LLM matching, does not fix the real `"--"` placeholder finding, does not touch
> timestamp/provenance or near-duplicate-row behavior, creates no `Signal`/`EvidenceCase`/`RenderingRequest`,
> calls no `runOperatorSession`, adds no delivery, creates no `AthleteDecision` automatically, introduces no
> production whole-core composer, and amends no AC20. Base: `tsc --noEmit` clean; `node --test` **1057/1057**.
> It plans the exact, minimal catalog extension Spec 044-D1 approved.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — one level more concrete than Spec 044-D1, still no code. It
names exact strings, exact test additions, and an exact next Implementation slice.

---

## 1. Context

`[FACT]` Spec 044-D1 (`da8b4c7`) selected Option A — extend `RECOGNIZED_METRICS` only — and classified the
two real, Trial-044-D-observed labels as distinct metrics, neither an alias of anything already recognized:
`optimal-pace` (a best/fastest-observed-pace-within-interval statistic, evidenced by `optimal-pace ≤ avg-pace`
without exception on every observed row, with explicit residual uncertainty about Garmin's exact internal
definition) and `avg-strokes-per-length` (a per-length-normalized average of `total-strokes`, evidenced by
`total-strokes ÷ lengths ≈ avg-strokes-per-length` on every observed row). This tech spec plans the exact,
smallest change that adds them.

`[FACT]` Exact current source, re-verified at authorship of this tech spec
(`src/modules/observation/application/manual-input-adapter.ts`):

```ts
const RECOGNIZED_METRICS = new Set([
  "heart-rate", "avg-heart-rate", "max-heart-rate",
  "power", "avg-power", "max-power",
  "pace", "avg-pace",
  "speed", "avg-speed",
  "cadence", "avg-cadence",
  "distance", "duration", "elevation-gain",
  "swolf", "total-strokes", "calories",
]); // verified exactly 18 entries today

function normalizeMetricLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "-");
}

function qualityForMetricLabel(label: string): ObservationQuality {
  return RECOGNIZED_METRICS.has(normalizeMetricLabel(label))
    ? qualityComplete()
    : observationQuality("suspicious", "unrecognized metric name — recorded as reported, not rejected");
}
```

`[FACT]` **Current count confirmed by direct source inspection at authorship: exactly 18 entries** — matching
Spec 044-D1's stated baseline exactly. No discrepancy exists; this plan proceeds on the expected 18 → 20
count.

`[FACT]` **Normalization behavior, confirmed exactly, unchanged since Impl 044-C1A:** `normalizeMetricLabel` is
applied **only to the incoming label** at lookup time (trim → lowercase → collapse whitespace to a single
hyphen). The catalog's own entries are stored in that same normalized shape already. Both new candidate
strings, `"optimal-pace"` and `"avg-strokes-per-length"`, are **already** lowercase, kebab-case, with no
leading/trailing whitespace — verified directly against the fixture (`044-d-real-swim-session-fixture.ts`,
where both appear literally as `metric: "optimal-pace"` / `metric: "avg-strokes-per-length"`) — **no
transformation is needed** before adding them to the `Set` initializer, exactly matching Tech Spec 044-C1A's
finding for `swolf`/`total-strokes`/`calories`.

`[FACT]` `RECOGNIZED_METRICS` remains **not exported**, unchanged since Impl 044-C1A. The existing static,
text-based closed-catalog guard (`manual-input-adapter-negative-capability.test.ts`, function
`extractRecognizedMetrics`, test `"044-C1A RECOGNIZED_METRICS remains a literal, closed catalog of exactly 18
entries..."`) reads the `Set([...])` literal as text and asserts an exact 18-entry list. This plan updates
that SAME guard's expected count and list — it does not introduce a second, parallel guard.

---

## 2. Central Question

> How should Aurora minimally add `optimal-pace` and `avg-strokes-per-length` to the existing closed
> `RECOGNIZED_METRICS` catalog while preserving all current admission, warning, provenance, and real-trial
> behavior?

```text
recognized label ≠ exact Garmin formula known · recognized label ≠ canonical semantic identity ·
recognized label ≠ truth · recognized label ≠ Evidence · recognition removes a WARNING, not an UNKNOWN ·
this catalog extension ≠ a registry ≠ configuration ≠ a database ·
avg-strokes-per-length recognition ≠ a runtime total-strokes÷lengths computation ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 3. Required inputs consulted

```text
docs/specs/044-D1-additional-real-swim-metric-vocabulary-boundary.md
docs/trials/044-D-second-real-swim-session-intake-trial.md
docs/specs/044-C1A-metric-vocabulary-implementation-plan.md
src/modules/observation/application/manual-input-adapter.ts   (RECOGNIZED_METRICS, normalizeMetricLabel,
                                                                 qualityForMetricLabel — exact source, §1)
src/modules/observation/application/training-row-submission.ts (confirmed: pure row-shape mapper, untouched)
src/modules/observation/tests/044-d-real-swim-session-fixture.ts
src/modules/observation/tests/044-d-real-swim-session-trial.test.ts
src/modules/observation/tests/manual-input-adapter-negative-capability.test.ts (existing closed-catalog
                                                                 guard for RECOGNIZED_METRICS, §1/§6)
```

`[FACT]` No new registry abstraction is named anywhere in this plan — every decision below operates on the
EXACT existing `RECOGNIZED_METRICS` `Set<string>` literal and the exact existing `qualityForMetricLabel`
function; no new type is coined.

---

## 4. Required Decisions

### `[DECISION]` Decision 1 — Exact catalog entries to add
```text
"optimal-pace"
"avg-strokes-per-length"
```
Verified against the current normalization behavior (§1) and against the exact strings already used in the
Trial 044-D fixture: both are already trimmed, lowercase, kebab-case — **no transformation is needed** before
adding them literally to the `Set` initializer. Explicitly **NOT** added: `"best-pace"`,
`"average-strokes-per-length"`, `"strokes-per-length"`, `"optimalPace"`, `"avgStrokesPerLength"` — none of
these matches the exact source label the real evidence produced, and inventing an alternate spelling now
would itself be an unevidenced normalization decision (exactly what Spec 044-D1 declined to build). No
aliases are introduced in this slice.

### `[DECISION]` Decision 2 — Catalog remains flat, closed, and unexported
Confirmed: `RECOGNIZED_METRICS` stays a **closed, explicit, literal `Set<string>`**, unexported, in exactly
the one file that defines it today. No canonical metric ids, no alias map, no sport-specific registry, no
configuration-driven registry, no database vocabulary, no remote vocabulary, no plugin system. The catalog
grows only by an explicit, reviewed literal-array edit — exactly how the 15 original entries and the 3
Impl-044-C1A entries were added.

### `[DECISION]` Decision 3 — `optimal-pace` semantic caution
Recognition adds **only** the string `"optimal-pace"` to the `Set` — nothing about the meaning of "optimal"
is encoded anywhere. `qualityForMetricLabel` performs a pure string-membership check; it does not, and after
this change still will not, encode any formula, any "best-lap" computation, any minimum-pace derivation, or
any target-pace semantics. Recognizing the LABEL removes the unknown-metric warning; it makes **no** claim
about what Garmin's own internal calculation for "Ritmo óptimo" actually is — the residual uncertainty Spec
044-D1 §7 Decision area 2 stated explicitly remains exactly as uncertain after this implementation as before
it. `Measurement.quantity` continues to store the raw label `"optimal-pace"` verbatim; no canonical/formula
annotation of any kind is attached anywhere.

### `[DECISION]` Decision 4 — `avg-strokes-per-length` behavior
Recognition adds **only** the string `"avg-strokes-per-length"` to the `Set` — no mapping to
`"total-strokes"`, `"avg-cadence"`, or `"stroke-rate"` is introduced; no alias-resolution table of any kind
exists after this change. Spec 044-D1's arithmetic observation (`total-strokes ÷ lengths ≈
avg-strokes-per-length`) justified the RECOGNITION decision; it does **not** become a runtime computation —
`qualityForMetricLabel` never calculates, cross-checks, or derives one metric's value from another's. Each
`measured-value` entry is still parsed, validated, and recorded entirely independently, exactly as
`total-strokes` and `avg-strokes-per-length` are today treated as two unrelated `measured-value` entries with
no cross-reference between them.

### `[DECISION]` Decision 5 — Raw label preservation → unconditional, unchanged
`Measurement.quantity` continues to carry `entry.label` **verbatim** (`mapEntry`'s `measured-value` case,
untouched by this plan). Recognizing `"optimal-pace"`/`"avg-strokes-per-length"` never rewrites them into a
canonical id or an alternative spelling — the same string that was unrecognized (and `"suspicious"`)
yesterday is admitted (and `"complete"`) tomorrow, unchanged in every other respect.

### `[DECISION]` Decision 6 — Unknown-metric behavior for future labels → unchanged
Adding these two entries does **not** alter `qualityForMetricLabel`'s logic in any way — any OTHER
unrecognized label still resolves to `observationQuality("suspicious", "unrecognized metric name — recorded
as reported, not rejected")`, exactly as today. No behavior branch is added, removed, or restructured — only
the `Set` literal's contents change. The open-ended "unfamiliar but admitted" intake behavior for any future
unknown metric is fully preserved.

### `[DECISION]` Decision 7 — Trial 044-D expected changes (planned, not executed here)
Inspecting the trial's exact current assertions
(`044-d-real-swim-session-trial.test.ts`, tests 044-D.2 and 044-D.5), the FUTURE implementation is expected to
change **only**:
```text
044-D.5 (currently: "6 suspicious... optimal-pace x3 + avg-strokes-per-length x3") ->
  suspicious.length: 6 -> 0
  the test's own NARRATIVE changes (it no longer demonstrates unrecognized labels) — it becomes a positive
  assertion that both labels are now recognized ("complete"), with an explicit note that recognizing the
  LABEL does not assert Garmin's exact formula (Decision 3) and does not introduce a runtime
  total-strokes÷lengths relationship (Decision 4).
```
And explicitly **preserved, unchanged**:
```text
044-D.2 : status               stays "partially-accepted"   (the real "--" limitation is untouched)
          acceptedCount        stays 40                       (unchanged — no new rows are admitted or
                                                                 dropped; only 6 already-admitted
                                                                 observations change quality.status)
          limitations           stays ["unparseable-numeric-value"]
          quality               stays "partial"
```
The real `"--"` placeholder (csv-D-5's blank `avg-strokes-per-length` VALUE — not the metric NAME) remains
exactly as unresolved as it is today: recognizing the metric NAME `"avg-strokes-per-length"` has zero effect
on whether a given row's VALUE parses — `"--"` still fails both the strict and grouped-thousands numeric
paths regardless of what the label is. This plan explicitly forbids any future implementation from fixing
`"--"`, silently dropping the row, or reporting `acceptedCount`/`status` differently than what the (unchanged)
`"--"`-value failure actually produces.

### `[DECISION]` Decision 8 — Trial 044-C regression check (planned, not executed here)
The FUTURE implementation must explicitly re-verify, unchanged, Trial 044-C's existing assertions
(`044-c-real-swim-session-trial.test.ts`, test 044-C.2): `status: "accepted"`, `acceptedCount: 21`,
`limitations: []`, zero unknown-metric warnings. Neither `"optimal-pace"` nor `"avg-strokes-per-length"`
appears anywhere in Trial 044-C's fixture (`044-c-real-swim-session-fixture.ts` — verified: it contains no
such labels), so adding them to `RECOGNIZED_METRICS` has **no** code path that could affect Trial 044-C's
outcome. This is stated as an explicit planned regression check, not merely assumed.

### `[DECISION]` Decision 9 — Closed-catalog guard update (planned, not executed here)
The existing static guard in `manual-input-adapter-negative-capability.test.ts`
(`extractRecognizedMetrics` + the test asserting exactly 18 entries) is updated, and ONLY it:
```text
expected count               : 18 -> 20
expected list                : the 18 existing entries + "optimal-pace" + "avg-strokes-per-length"
test name/prose               : updated to name both new entries (mirroring how the 044-C1A guard names
                                 swolf/total-strokes/calories in its own test title)
```
The guard continues to prove, unchanged: `RECOGNIZED_METRICS` stays unexported; no dynamic/config/db/network
vocabulary source token appears; no canonical-identity/alias/sport-registry/fuzzy/LLM token appears. No new,
second, parallel guard is introduced — the SAME guard is updated, exactly as Tech Spec 044-C1A's own guard
was itself a fresh addition to a catalog that had never had one before; this catalog already has one now, so
this plan only updates it.

### `[DECISION]` Decision 10 — Separate findings stay separate (unchanged, not touched by this plan)
```text
"--" missing-value placeholder : untouched — still resolves to "unparseable-numeric-value"; no special
                                  missing-value semantics of any kind are introduced in this slice.
timestamp / temporal provenance : untouched — the operator-supplied absolute timestamp and the nested
                                  sub-lap parent-relative elapsed-time observation are unaffected by a
                                  metric-name catalog change.
near-duplicate source rows      : untouched — no deduplication or parser-implementation logic is introduced.
```

---

## 5. Required Test Plan (planned — not implemented in this tech spec)

```text
 1. "optimal-pace" is recognized (quality.status "complete" via ingestManualInput's observable behavior).
 2. "avg-strokes-per-length" is recognized (quality.status "complete", same behavioral pattern).
 3. neither receives the unknown-metric "suspicious" warning.
 4. the raw label "optimal-pace" remains exactly preserved in Measurement.quantity.
 5. the raw label "avg-strokes-per-length" remains exactly preserved in Measurement.quantity.
 6. an unrelated, still-unfamiliar metric label (NOT one of the now-20 entries) still resolves to
    "suspicious" — proving the catalog stayed closed, not opened wide.
 7. Trial 044-D's suspicious unknown-metric count drops from 6 to 0 (044-D.5, updated).
 8. Trial 044-D's status remains "partially-accepted" (044-D.2, unchanged assertion).
 9. Trial 044-D's acceptedCount remains 40 (044-D.2, unchanged assertion).
10. Trial 044-D's limitations remain exactly ["unparseable-numeric-value"] (044-D.2, unchanged assertion).
11. the real "--" source value (csv-D-5) remains unresolved — still absent from admitted observations,
    still the sole limitation (044-D.3, unchanged assertion, explicitly re-verified).
12. Trial 044-C remains "accepted", acceptedCount 21, limitations [] (044-C.2, unchanged assertion,
    explicitly re-verified as a regression check per Decision 8).
13. the closed-catalog guard's extracted list has exactly 20 entries.
14. the catalog remains literal, closed, and unexported (existing guard, unchanged assertions).
15. no alias-infrastructure token appears (existing guard, unchanged assertions).
16. no canonical-metric-identity token appears (existing guard, unchanged assertions).
17. no sport-specific-registry token appears (existing guard, unchanged assertions).
18. no fuzzy-matching/LLM-classification token appears (existing guard, unchanged assertions).
```

---

## 6. Required Implementation Slicing

```text
Implementation 044-D1A — Extend Additional Real Swim Metric Vocabulary

scope:
  - RECOGNIZED_METRICS literal update (add "optimal-pace", "avg-strokes-per-length" — 18 -> 20 entries),
    inside manual-input-adapter.ts only.
  - focused behavior tests (§5 items 1–6).
  - Trial 044-D assertion updates (§5 items 7–11, Decision 7) — the "--" limitation and acceptedCount/status
    stay exactly as they are; only the suspicious-count assertion changes.
  - Trial 044-C regression re-check (§5 item 12, Decision 8) — explicitly re-verified, not merely assumed
    unaffected.
  - the existing closed-catalog guard's count/list update (§5 items 13–18, Decision 9) — the SAME guard,
    not a new one.
  - no dependency, no package/lockfile change.

explicitly NOT part of this slice:
  canonical metric identity · alias mapping · sport-specific registry · configuration-driven registry ·
  database/remote vocabulary · fuzzy/LLM classification · Garmin semantic formula encoding · runtime
  derivation of avg-strokes-per-length from total-strokes/lengths · a fix to the "--" placeholder · a change
  to timestamp/provenance behavior · row deduplication/parser logic of any kind.
```

---

## 7. Required Acceptance Criteria (Given / When / Then)

```text
Given a real optimal-pace row, when recognition runs, then it is recognized without an unknown-metric
  warning.

Given optimal-pace is recognized, when admitted, then Aurora does not claim knowledge of Garmin's exact
  formula.

Given a real avg-strokes-per-length row, when recognition runs, then it is recognized without an
  unknown-metric warning.

Given avg-strokes-per-length is recognized, when admitted, then it is not remapped to total-strokes or
  avg-cadence.

Given either recognized label, when Observation material is created, then the raw source label remains
  preserved.

Given an unrelated unfamiliar metric, when intake runs, then it remains admitted with a suspicious warning.

Given Trial 044-D, when the vocabulary extension is implemented, then unknown-metric warnings disappear but
  the real "--" limitation remains.

Given Trial 044-C, when the additional catalog entries are added, then its accepted result remains
  unchanged.

Given recognition succeeds, when Observation material is admitted, then no Signal/Evidence/RenderingRequest/
  runtime/delivery/AthleteDecision action occurs.

Given AC20, when the catalog is extended, then no production whole-core composer is introduced.
```

---

## 8. Required Forbidden Behaviors (this tech spec)

```text
implementation code in this tech spec · RECOGNIZED_METRICS edit · test changes · canonical metric identity ·
alias mapping · sport-specific registry · configuration-driven registry · database vocabulary ·
remote vocabulary · fuzzy matching · LLM classification · Garmin semantic formula encoding · runtime
derivation of avg-strokes-per-length · "--" placeholder fix · timestamp/provenance fix · row deduplication ·
new dependency · package changes · CSV parser · FIT parser · TCX parser · Garmin API · automatic Signal ·
automatic EvidenceCase · automatic RenderingRequest · automatic runOperatorSession · delivery · automatic
AthleteDecision · API/UI/server · production whole-core composer · reflection-composition · AC20 amendment
```

---

## 9. Relationship to Existing Architecture

- **Spec 044-D1** — this plan implements exactly its Decision area 1/2/5/6 (Option A only) — no scope
  expansion.
- **Manual Data Trial 044-D** — this plan's Decision 7 is the direct, evidence-traceable expected change to
  that trial's own assertions; the trial's genuine `"--"` finding stays untouched (Decision 10).
- **Manual Data Trial 044-C** — explicitly re-verified as a regression check (Decision 8), not assumed safe.
- **Impl 044-C1A** — this plan follows its exact precedent: same file, same `Set` literal, same unexported
  guard pattern, same "recognition removes a warning, never claims truth" discipline.
- **Impl 044-A1** — `RECOGNIZED_METRICS`/`normalizeMetricLabel`/`qualityForMetricLabel` are the exact, sole
  targets of this plan; nothing else in `manual-input-adapter.ts` changes.
- **AC20** — unchanged; this plan selects no new type, module, or composer.

---

## 10. Decision & Next Mission

`[DECISION] Implementation 044-D1A plan: add exactly "optimal-pace" and "avg-strokes-per-length" to the
existing RECOGNIZED_METRICS Set literal (18 -> 20 entries) in manual-input-adapter.ts; update the existing
static closed-catalog guard's expected count/list (the same guard Impl 044-C1A introduced, not a new one);
update Trial 044-D's suspicious-count assertion (6 -> 0) while explicitly preserving its status
("partially-accepted"), acceptedCount (40), and limitations (["unparseable-numeric-value"]) exactly as they
are; explicitly re-verify Trial 044-C's unaffected result as a regression check. No registry, alias,
canonicalization, sport-partitioning, fuzzy, LLM, or runtime-derivation infrastructure of any kind.`

```text
exact metric entries              : "optimal-pace", "avg-strokes-per-length" — already in normalized
                                     (lowercase, kebab-case) form, requiring no transformation.
catalog count before/after         : 18 -> 20 (confirmed exact current count by direct source inspection).
lookup normalization behavior      : unchanged — normalizeMetricLabel applies only to the incoming label at
                                     lookup time; catalog entries are stored pre-normalized.
closed-catalog decision            : stays closed, literal, unexported; the EXISTING static guard is updated,
                                     not duplicated.
optimal-pace semantic-caution decision : recognition adds only the label string; no formula, no best-lap
                                     computation, no target-pace semantics encoded anywhere; residual
                                     uncertainty about Garmin's exact definition remains exactly as stated in
                                     Spec 044-D1.
avg-strokes-per-length behavior decision : recognition adds only the label string; no mapping to
                                     total-strokes/avg-cadence/stroke-rate; no runtime total-strokes÷lengths
                                     computation is introduced — the arithmetic evidence justified
                                     recognition, not recalculation.
raw-label preservation             : unconditional, unchanged — Measurement.quantity stays entry.label
                                     verbatim.
unknown-metric behavior            : unchanged — any OTHER unrecognized label still resolves to "suspicious";
                                     the open-ended intake behavior is fully preserved.
Trial 044-D expected changes       : suspicious count 6 -> 0; status/acceptedCount/limitations UNCHANGED
                                     ("partially-accepted" / 40 / ["unparseable-numeric-value"]) — the "--"
                                     placeholder remains exactly as unresolved as today.
Trial 044-C regression expectation : remains "accepted" / acceptedCount 21 / limitations [] — explicitly
                                     re-verified, not merely assumed, since neither new label appears in that
                                     trial's fixture.
"--" disposition                   : untouched, separate, unresolved.
timestamp/provenance disposition   : untouched, separate, unresolved.
near-duplicate-row disposition     : untouched, separate, unresolved.
guard update plan                  : update the ONE existing closed-catalog guard's expected count (18 -> 20)
                                     and list; all its other assertions (unexported, no dynamic/config/db/
                                     network source, no canonicalization/alias/sport-registry/fuzzy/LLM token)
                                     stay exactly as they are, unweakened.
next implementation slice          : Implementation 044-D1A — Extend Additional Real Swim Metric Vocabulary
                                     (§6).
```

`[RECOMMENDATION] Next mission: Implementation 044-D1A — Extend Additional Real Swim Metric Vocabulary.`
Exactly the scope in §6 — a two-string literal-array addition, its focused behavior tests, the Trial 044-D
assertion update, the Trial 044-C regression re-check, and the existing closed-catalog guard's count/list
update. No dependency, no migration, no configuration, no export of `RECOGNIZED_METRICS`. The `"--"`
placeholder, the timestamp/provenance finding, and the near-duplicate-row observation each remain **separate**
candidate missions (a possible *Missing Value Semantics Boundary*, a possible *Provenance / Temporal
Semantics Boundary*, respectively) — none is recommended as immediate without its own future evidence and
approval.

---

## 11. Validation & Invariants at This Tech Spec

`tsc --noEmit` clean; `node --test` **1057/1057** (unchanged — this tech spec is docs-only). No code/test/
package/lockfile/tsconfig change; no dependency added; no guard weakened; AC20 untouched.
