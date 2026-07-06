# Aurora — Technical Specification 044-C1A — Metric Vocabulary Implementation Plan

> **Status (2026-07-02).** Technical Specification phase, building on Spec 044-C1 (`fa4fb12`). It is
> **behavioral / docs-only**: it implements no code, does not edit `RECOGNIZED_METRICS`, adds no dependency, no
> package/test change, adds no canonicalization/alias/sport-specific/configuration/database/remote registry
> infrastructure, no fuzzy/LLM matching, does not fix the `"1,600"` numeric-parsing gap, creates no
> `Signal`/`EvidenceCase`/`RenderingRequest`, calls no `runOperatorSession`, adds no delivery, creates no
> `AthleteDecision` automatically, introduces no production whole-core composer, and amends no AC20. Base:
> `tsc --noEmit` clean; `node --test` **1027/1027**. It plans the exact, minimal catalog extension Spec 044-C1
> approved.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — one level more concrete than Spec 044-C1, still no code. It
names exact strings, exact test additions, and an exact next Implementation slice.

---

## 1. Context

`[FACT]` Spec 044-C1 (`fa4fb12`) selected Option A — extend `RECOGNIZED_METRICS` only — and classified the
three real, trial-observed labels as distinct canonical metrics, none an alias of anything already recognized:
`swolf` (swim-specific), `total-strokes` (a count, not a rate), `calories` (cross-sport, likely an original-
list omission). This tech spec plans the exact, smallest change that adds them.

`[FACT]` Exact current source (`src/modules/observation/application/manual-input-adapter.ts`, verified against
the live file at authorship):

```ts
const RECOGNIZED_METRICS = new Set([
  "heart-rate", "avg-heart-rate", "max-heart-rate",
  "power", "avg-power", "max-power",
  "pace", "avg-pace",
  "speed", "avg-speed",
  "cadence", "avg-cadence",
  "distance", "duration", "elevation-gain",
]); // exactly 15 entries today

function normalizeMetricLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, "-");
}

function qualityForMetricLabel(label: string): ObservationQuality {
  return RECOGNIZED_METRICS.has(normalizeMetricLabel(label))
    ? qualityComplete()
    : observationQuality("suspicious", "unrecognized metric name — recorded as reported, not rejected");
}
```

`[FACT]` **Normalization behavior, confirmed exactly:** `normalizeMetricLabel` is applied **only to the
incoming label** at lookup time (trim → lowercase → collapse whitespace to a single hyphen). The catalog's own
entries are **already** stored in that same normalized shape (lowercase, kebab-case, no leading/trailing
whitespace) — the lookup is a direct `Set.has()` on two already-comparable normalized strings. This behavior is
**not changed** by this plan; the three new entries simply need to already be in that same normalized shape
(§4 confirms they are, trivially).

`[FACT]` `RECOGNIZED_METRICS` is **not exported** from `manual-input-adapter.ts` or from the module's public
surface (`src/modules/observation/index.ts`) — unlike `MANUAL_INPUT_LIMITATIONS`/`MANUAL_INPUT_REJECTION_REASONS`/
`MANUAL_INPUT_QUALITIES` (all exported, all with an explicit closed-catalog count guard in
`manual-input-adapter-negative-capability.test.ts`). This is a deliberate difference: `RECOGNIZED_METRICS` is,
by its own code comment, "a small, explicitly non-authoritative allowlist... a name-recognition aid only" —
not a structural contract any external caller should import or rely on directly. **This plan does not change
that** — it does not export the Set, and does not introduce a new structural (import-based) closed-catalog
guard. Instead, §6 plans a **static, text-based** guard (reading the source file as text, mirroring this
repo's established pattern for private/unexported constants — see e.g. the 043-H1 CI workflow guards) so the
catalog's exact size stays explicitly verified without becoming a public API.

---

## 2. Central Question

> How should Aurora minimally extend the existing closed `RECOGNIZED_METRICS` catalog with the three real
> metrics observed in Trial 044-C, while preserving raw labels and current unknown-metric behavior?

```text
raw metric label ≠ canonical metric identity · recognized metric ≠ Evidence ≠ truth ·
metric recognition ≠ recommendation · unknown metric ≠ invalid metric ·
this catalog extension ≠ a registry ≠ configuration ≠ a database · Aurora advises; the athlete decides ·
Aurora never presents inference as fact
```

---

## 3. Required inputs consulted

```text
docs/specs/044-C1-metric-normalization-boundary.md
docs/trials/044-C-real-training-intake-trial.md
src/modules/observation/tests/044-c-real-swim-session-fixture.ts
src/modules/observation/tests/044-c-real-swim-session-trial.test.ts
src/modules/observation/application/training-row-submission.ts
src/modules/observation/application/manual-input-adapter.ts   (RECOGNIZED_METRICS, normalizeMetricLabel,
                                                                 qualityForMetricLabel — exact source, §1)
src/modules/observation/domain/observation.ts                  (Measurement { quantity, magnitude, unit })
src/modules/observation/domain/observation-quality.ts          (ObservationQuality { status, reason })
src/modules/observation/index.ts
src/modules/observation/tests/manual-input-adapter-negative-capability.test.ts (existing closed-catalog
                                                                 pattern for the OTHER three catalogs)
```

`[FACT]` No new registry abstraction is named anywhere in this plan — every decision below operates on the
EXACT existing `RECOGNIZED_METRICS` `Set<string>` literal and the exact existing `qualityForMetricLabel`
function; no new type is coined.

---

## 4. Required Decisions

### `[DECISION]` Decision 1 — Exact catalog entries to add
```text
"swolf"
"total-strokes"
"calories"
```
Verified against the current normalization behavior (§1): each string is already trimmed, lowercase, and
kebab-case (single words or hyphen-joined) — **no transformation is needed** before adding them literally to
the `Set` initializer, exactly matching the shape of the 15 existing entries.

### `[DECISION]` Decision 2 — Catalog remains closed
Confirmed: `RECOGNIZED_METRICS` stays a **closed, explicit, literal `Set<string>`** in exactly the one file
that defines it today. No dynamic loading, no configuration file, no database registry, no runtime plugin, no
remote vocabulary source. The catalog grows only by an explicit, reviewed literal-array edit — exactly how the
15 existing entries were added, and exactly how the `MANUAL_INPUT_*` catalogs have grown throughout this arc.

### `[DECISION]` Decision 3 — Unknown metric behavior unchanged
Adding three known entries does **not** alter `qualityForMetricLabel`'s logic in any way — an unrecognized
label still resolves to `observationQuality("suspicious", "unrecognized metric name — recorded as reported,
not rejected")`, exactly as today. No behavior branch is added, removed, or restructured — only the `Set`
literal's contents change.

### `[DECISION]` Decision 4 — Raw label preservation unchanged
Confirmed: `Measurement.quantity` continues to carry `entry.label` **verbatim** (see `mapEntry`'s
`measured-value` case, unchanged by this plan) — recognition only ever selects an `ObservationQuality`, never
touches or overwrites the label. No canonical-id field is introduced anywhere.

### `[DECISION]` Decision 5 — Test updates (planned, not written here)
```text
 1. "swolf" resolves to ObservationQuality.status === "complete" (via qualityForMetricLabel's observable
    effect, exercised through the existing public ingestManualInput path — RECOGNIZED_METRICS itself stays
    unexported, so this is asserted BEHAVIORALLY, never via a direct Set import).
 2. "total-strokes" resolves to "complete", same behavioral pattern.
 3. "calories" resolves to "complete", same behavioral pattern.
 4. The REAL 044-C trial fixture/test (044-c-real-swim-session-trial.test.ts, test 044-C.4) is updated: its
    assertion currently expects 6 "suspicious" / 11 "complete" observations — after this catalog extension it
    must expect 0 "suspicious" / 17 "complete" (all 17 admitted measured observations become recognized,
    since swolf/total-strokes/calories were the ONLY three unrecognized labels observed).
 5. An unrelated, still-unfamiliar metric label (a NEW one, not swolf/total-strokes/calories/any of the 15
    original entries) still resolves to "suspicious" — proving the catalog stayed CLOSED, not opened wide.
 6. The raw metric label (Measurement.quantity) remains exactly the source string for all three new entries —
    a direct equality assertion, not just a quality-status check.
 7. A NEW static, text-based guard (§6) reads manual-input-adapter.ts as text and asserts the
    RECOGNIZED_METRICS Set literal contains EXACTLY 18 string entries (the 15 existing + the 3 new), listing
    all 18 explicitly — the closed-catalog count assertion this catalog has never had, added now precisely
    because this is the first time it changes.
 8. A negative-capability check confirms no alias/canonical-identity token (e.g. "canonicalMetric",
    "metricAlias", "CanonicalMetricId") appears anywhere in the file.
 9. A negative-capability check confirms no sport-specific-registry token (e.g. "sportVocabulary",
    "SportSpecificMetrics") appears anywhere in the file.
10. A negative-capability check confirms no fuzzy-matching or LLM-classification token (e.g. "levenshtein",
    "fuzzysort", "openai", "anthropic", "embedding") appears anywhere in the file.
```

### `[DECISION]` Decision 6 — Real-trial expected change
The 044-C trial's own assertions (§Decision 5 item 4) are expected to change **exactly once, exactly this
way**: the metric-vocabulary-driven `"suspicious"` count drops from 6 to 0. The **overall outcome status stays
`"partially-accepted"`** — the trial must **not** be rewritten to appear fully successful, because the
`"1,600"` numeric-parsing limitation (`"unparseable-numeric-value"`) is untouched by this plan and remains the
one genuine failure. `outcome.acceptedCount` stays `20`; `outcome.limitations` stays exactly
`["unparseable-numeric-value"]`.

### `[DECISION]` Decision 7 — Numeric lexical gap stays explicitly separate
The `"1,600"` comma-formatted numeric-text parsing failure is **not** addressed, fixed, or worked around by
this plan in any way — not in `manual-input-adapter.ts`, not in the trial fixture, not in any test. It remains
exactly the finding Spec 044-C1 recorded. A candidate future mission, `Spec 044-C2 — Numeric Lexical
Normalization Boundary`, is named (§8) but **not** recommended as immediate — it requires its own separate
future approval.

### `[DECISION]` Decision 8 — Automation unchanged
Extending the catalog triggers **no** automatic Signal, EvidenceCase, RenderingRequest, `runOperatorSession`,
delivery, or `AthleteDecision` — unchanged, because none of `qualityForMetricLabel`'s call sites or effects
touch any of those seams today, and this plan adds no new call site.

---

## 5. Required Implementation Slicing

`[DECISION]` One implementation slice, recommended next:

```text
Implementation 044-C1A — Extend Recognized Metric Vocabulary

Scope:
  - RECOGNIZED_METRICS literal update (add "swolf", "total-strokes", "calories" — 15 -> 18 entries)
  - focused behavior tests (Decision 5 items 1-3, 5-6)
  - real-trial assertion update (Decision 5 item 4 / Decision 6)
  - a NEW static closed-catalog guard for RECOGNIZED_METRICS (Decision 5 item 7)
  - negative-capability checks confirming no alias/sport-registry/fuzzy/LLM token appears (Decision 5 items 8-10)

Explicitly NOT in scope:
  - no new registry/canonicalization/alias abstraction
  - no migration of any kind (there is nothing to migrate — a literal array grows by three strings)
  - no configuration file
  - no export of RECOGNIZED_METRICS (stays private, exactly as today)
  - no fix to the "1,600" numeric-parsing gap
```

---

## 6. Closed-Catalog Guard — exact plan

Because `RECOGNIZED_METRICS` is private/unexported (§1), its closed-catalog guard must be **static** (read the
source file as text), not import-based, mirroring this repository's established pattern for guarding
unexported constants (e.g. the Dockerfile/CI-workflow static guards from the 043-G1/043-H1 arc). The planned
guard, in `manual-input-adapter-negative-capability.test.ts` or a new sibling test file:

```text
1. Read manual-input-adapter.ts as text.
2. Extract the RECOGNIZED_METRICS Set([...]) literal's string entries via a regex over quoted strings between
   `RECOGNIZED_METRICS = new Set([` and the matching `]);`.
3. Assert the extracted list has EXACTLY 18 entries.
4. Assert it deep-equals the exact expected list: the 15 original entries + "swolf" + "total-strokes" +
   "calories", in whatever order they appear in source (order is not semantically meaningful for a Set, but
   the guard asserts the SET of strings, not a specific order).
```

This closes the gap noted in §1 (no existing count guard for this specific catalog) using the SAME "read as
text" technique already proven elsewhere in this codebase — no export, no new abstraction.

---

## 7. Required Acceptance Criteria (Given / When / Then)

```text
Given a real SWOLF row, when recognition runs, then it is recognized without an unknown-metric warning. ✅
  (Decision 1/5 item 1.)
Given a real total-strokes row, when recognition runs, then it is recognized without an unknown-metric
  warning. ✅ (Decision 1/5 item 2.)
Given a real calories row, when recognition runs, then it is recognized without an unknown-metric warning. ✅
  (Decision 1/5 item 3.)
Given an unrelated unfamiliar metric, when recognition runs, then it remains accepted with a suspicious
  warning. ✅ (Decision 3/5 item 5 — the catalog stays closed, not opened wide.)
Given a recognized metric, when admitted, then recognition does not make it Evidence or truth. ✅ (central
  distinction, §2; unchanged — recognition only ever selects an ObservationQuality.)
Given the raw source label, when recognition succeeds, then the label remains preserved. ✅ (Decision 4/5
  item 6.)
Given the real 044-C trial, when rerun, then the metric-vocabulary warnings disappear but the "1,600" numeric
  parsing finding remains. ✅ (Decision 6/7 — acceptedCount stays 20, limitations stays
  ["unparseable-numeric-value"], status stays "partially-accepted".)
Given no automation boundary is approved, when recognition succeeds, then no Signal/Evidence/RenderingRequest/
  runtime/delivery/AthleteDecision action occurs. ✅ (Decision 8.)
Given AC20, when the catalog is extended, then no production whole-core composer is introduced. ✅ (this tech
  spec is docs-only and plans no composer of any kind.)
```

---

## 8. Required Forbidden Behaviors (this tech spec)

```text
implementation code in this tech spec · canonical metric identity · alias mapping · sport-specific registry ·
configuration-driven registry · database vocabulary · remote vocabulary · fuzzy matching · LLM classification ·
new dependency · package changes · numeric "1,600" fix · CSV parser · FIT parser · TCX parser · Garmin API ·
automatic Signal · automatic EvidenceCase · automatic RenderingRequest · automatic runOperatorSession ·
delivery · automatic AthleteDecision · API/UI/server · production whole-core composer · reflection-composition ·
AC20 amendment
```

---

## 9. Relationship to Existing Architecture

- **Spec 044-C1** — this plan implements exactly its Decision 1/3/4/5 (Option A only) — no scope expansion.
- **Manual Data Trial 044-C** — this plan's Decision 6 is the direct, evidence-traceable expected change to
  that trial's own assertions; the trial's genuine `"1,600"` finding stays untouched (Decision 7).
- **Impl 044-A1** — `manual-input-adapter.ts`'s `RECOGNIZED_METRICS`/`normalizeMetricLabel`/
  `qualityForMetricLabel` are the exact, sole targets of this plan; nothing else in that file changes.
- **The `MANUAL_INPUT_*` closed-catalog precedent** — §6's static guard plan brings `RECOGNIZED_METRICS` to
  parity with the OTHER three catalogs' "extend deliberately, guard explicitly" discipline, without exporting
  it (a deliberate, preserved difference — §1).
- **AC20** — unchanged; this plan selects no new type, module, or composer.

---

## 10. Decision & Next Mission

`[DECISION] Implementation 044-C1A plan: add exactly "swolf", "total-strokes", "calories" to the existing
RECOGNIZED_METRICS Set literal (15 -> 18 entries) in manual-input-adapter.ts; add a new static, text-based
closed-catalog guard for that Set (it has none today, being unexported); update the real 044-C trial's own
assertions to reflect zero remaining metric-vocabulary warnings while the "1,600" numeric-parsing finding
stays exactly as it is. No registry, alias, canonicalization, sport-partitioning, fuzzy, or LLM infrastructure
of any kind.`

```text
exact metric entries           : "swolf", "total-strokes", "calories" — already in normalized (lowercase,
                                  kebab-case) form, requiring no transformation.
catalog normalization behavior : unchanged — normalizeMetricLabel applies only to the incoming label at
                                  lookup time; catalog entries are stored pre-normalized (confirmed exact,
                                  §1) — no change to this mechanism.
closed-catalog decision        : stays closed, literal, unexported; a NEW static text-based guard (§6) adds
                                  the explicit count assertion this catalog has never had.
unknown-metric behavior        : unchanged — accepted + "suspicious" ObservationQuality warning; the catalog
                                  stays closed (not opened wide) for any OTHER unfamiliar label.
raw-label preservation         : unconditional, unchanged — Measurement.quantity stays entry.label verbatim.
test update plan               : 10 items (§4 Decision 5) — 3 new-metric recognition checks, 1 real-trial
                                  reassertion, 1 unrelated-metric-still-suspicious check, 1 raw-label check,
                                  1 new static closed-catalog guard, 3 negative-capability checks (no alias/
                                  sport-registry/fuzzy-LLM token).
real-trial expected change     : the metric-vocabulary "suspicious" count drops 6 -> 0; status stays
                                  "partially-accepted"; acceptedCount stays 20; limitations stays
                                  ["unparseable-numeric-value"] — the trial is NOT rewritten to look fully
                                  successful.
numeric "1,600" gap disposition: untouched, tracked separately; candidate future
                                  Spec 044-C2 — Numeric Lexical Normalization Boundary, not recommended now.
```

`[RECOMMENDATION] Next mission: Implementation 044-C1A — Extend Recognized Metric Vocabulary.` Exactly the
scope in §5 — a three-string literal-array addition, its focused behavior tests, the real-trial assertion
update, and one new static closed-catalog guard. No dependency, no migration, no configuration, no export of
`RECOGNIZED_METRICS`. `Spec 044-C2 — Numeric Lexical Normalization Boundary` (the `"1,600"` gap) remains a
**separate**, independently-approvable candidate mission, not bundled here.

---

## 11. Validation & Invariants at This Tech Spec

`tsc --noEmit` clean; `node --test` **1027/1027** (unchanged — this tech spec is docs-only). No code/test/
package/lockfile/tsconfig change; no dependency added; no guard weakened; AC20 untouched.
