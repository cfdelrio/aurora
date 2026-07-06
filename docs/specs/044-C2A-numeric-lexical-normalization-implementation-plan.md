# Aurora — Technical Specification 044-C2A — Numeric Lexical Normalization Implementation Plan

> **Status (2026-07-05).** Technical Specification phase, building on Spec 044-C2 (`2af9c38`). It is
> **docs-only**: it implements no code, modifies no test, does not change `parseFiniteNumber`, adds no
> dependency, no package/test change, adds no CSV/FIT/TCX parser, no Garmin API integration, no metric
> canonicalization, creates no `Signal`/`EvidenceCase`/`RenderingRequest`, calls no `runOperatorSession`, adds
> no delivery, creates no `AthleteDecision` automatically, introduces no production whole-core composer, and
> amends no AC20. Base: `tsc --noEmit` clean; `node --test` **1032/1032**. It plans the exact shape of a
> future implementation slice — nothing here executes yet.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — not Specification, not Implementation. It names exact
function shapes, exact regex, exact test additions, and an exact implementation slice; it writes none of that
code.

---

## 1. Context

`[FACT]` Spec 044-C2 (`2af9c38`) selected **Option B**: normalize only unambiguous grouped-thousands numeric
forms (a fixed-shape regex match — one or more exact 3-digit comma groups, no decimal point present) inside
the existing `parseFiniteNumber`. It deferred the exact result shape, the exact raw-text-preservation
mechanism, and the exact test/trial-assertion updates to this tech spec (§10 of that document).

`[FACT]` Exact current source, re-verified at authorship of this tech spec
(`src/modules/observation/application/manual-input-adapter.ts`):

```ts
function parseFiniteNumber(rawValue: string): number | undefined {
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) return undefined;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}
```

Its one call site, inside `mapEntry`'s `"measured-value"` branch:

```ts
case "measured-value": {
  if (!nonEmpty(entry.label)) return { limitation: "ambiguous-field" };
  if (!nonEmpty(entry.unit)) return { limitation: "missing-unit" };
  const magnitude = parseFiniteNumber(entry.rawValue);
  if (magnitude === undefined) return { limitation: "unparseable-numeric-value" };
  const rowProvenance: ProvenanceInput =
    entry.sourceRowRef !== undefined
      ? { ...prov, reference: `${prov.reference}|${entry.sourceRowRef}` }
      : prov;
  return {
    observation: {
      kind: "measured",
      provenance: rowProvenance,
      quality: qualityForMetricLabel(entry.label),
      measurement: { quantity: entry.label, magnitude, unit: entry.unit },
    },
  };
}
```

`[FACT]` `parseFiniteNumber` is private/unexported — its only caller is `mapEntry`, in the same file. Its
signature may change freely without any cross-module or public-surface consequence (`observation/index.ts`
never re-exports it).

`[FACT]` Domain constructors consulted (`src/modules/observation/domain/observation-quality.ts`,
`observation.ts`), `Provenance`/`ProvenanceInput` (`src/shared-kernel/provenance.ts`):

```ts
export function observationQuality(status: ObservationQualityStatus, reason: string): ObservationQuality
export function qualityComplete(reason = "recorded without detected quality limitation"): ObservationQuality
export interface Measurement { readonly quantity: string; readonly magnitude: number; readonly unit: string }
export interface ProvenanceInput { readonly source: Source; readonly captureTime: Timestamp;
  readonly recordingTime: Timestamp; readonly reference: string }
```

`ObservationQuality.reason` is a free-text `string` (non-empty, enforced by the `observationQuality` smart
constructor) — there is no separate "notes" or "warnings" field anywhere in the domain. Any normalization note
must live inside this one `reason` string. `Provenance.reference` is likewise a single opaque `string` — the
existing `sourceRowRef`-folding mechanism (`${prov.reference}|${entry.sourceRowRef}`) is the ONLY precedent
for appending extra context onto it, and this tech spec follows that exact precedent rather than inventing a
new field.

---

## 2. Central Question

> What is the smallest, most honest change to `parseFiniteNumber` and its one call site that implements Spec
> 044-C2's Option B — supporting only the exact grouped-thousands shape, preserving the original raw text
> wherever normalization occurs, and leaving every other numeric-parsing behavior byte-for-byte unchanged?

```text
smallest change ≠ smallest diff at any cost · result-shape change ≠ public API change (helper stays private) ·
normalization note ≠ suspicious downgrade · raw-text preservation ≠ a new domain field ·
grouped-thousands support ≠ broader locale support · this tech spec ≠ implementation
```

---

## 3. Required inputs consulted

```text
docs/specs/044-C2-numeric-lexical-normalization-boundary.md   (the approved boundary, §6 Decisions 1–8)
docs/trials/044-C-real-training-intake-trial.md               (original findings — NOT to be rewritten)
src/modules/observation/tests/044-c-real-swim-session-fixture.ts
src/modules/observation/tests/044-c-real-swim-session-trial.test.ts
src/modules/observation/application/manual-input-adapter.ts   (parseFiniteNumber, mapEntry, exact source, §1)
src/modules/observation/application/training-row-submission.ts (confirmed: pure row-shape mapper, untouched)
src/modules/observation/domain/observation.ts                 (Measurement, MeasuredObservation)
src/modules/observation/domain/observation-quality.ts          (ObservationQuality, observationQuality, qualityComplete)
src/shared-kernel/provenance.ts                                 (Provenance, ProvenanceInput, reference is a single string)
src/modules/observation/index.ts                                (confirms parseFiniteNumber is not exported)
```

---

## 4. Required Analysis

```text
 1. Current parseFiniteNumber call sites : exactly one — mapEntry's "measured-value" branch. No other
                                     production file calls it (confirmed: unexported, single-file-local).
 2. Current return type              : number | undefined — a plain success/failure signal with no room to
                                     carry "was this value lexically normalized?" metadata.
 3. Where would that metadata be consumed : mapEntry, immediately after the call, to (a) decide the
                                     quality.reason note (Decision 4/§6) and (b) decide whether to fold the
                                     raw text into provenance (Decision 3/§6). Both consumers are in the same
                                     function, one call site — no new plumbing needed beyond the return value.
 4. Does changing the return shape ripple elsewhere : NO — parseFiniteNumber is private and single-call-site;
                                     changing its shape only requires updating that one call site in the same
                                     file. No test imports it directly (tests only exercise ingestManualInput
                                     end-to-end); no other production file references it.
 5. Exact grammar to test             : ^[+-]?\d{1,3}(,\d{3})+$ (Spec 044-C2 §6 Decision 2) — one leading
                                     group of 1–3 digits, then one or more groups of exactly 3 digits each
                                     separated by a comma, optional leading sign, NO decimal point anywhere.
 6. Order of evaluation               : the EXISTING strict path must run FIRST and be preferred whenever it
                                     already succeeds (it already handles plain integers/decimals/signs
                                     correctly) — the grouped-thousands path is a FALLBACK tried only when the
                                     strict native Number() parse fails. This preserves 100% of current
                                     behavior for every value that already parses today.
 7. Whitespace handling today         : rawValue.trim().length === 0 gates emptiness, but the actual
                                     Number(rawValue) call uses the UNTRIMMED string — native Number() already
                                     tolerates surrounding whitespace internally (e.g. Number(" 42 ") === 42).
                                     The new grouped-thousands regex test must trim the same way for
                                     consistency (e.g. " 1,600 " should normalize exactly like "1,600" does),
                                     but internal whitespace (e.g. "1, 600") must NOT be tolerated — that is a
                                     new, unevidenced leniency this plan does not introduce.
 8. Is comma-stripping "broad punctuation stripping" : NO, if and only if the strip is gated behind the exact
                                     regex match first — commas are removed only from a string ALREADY proven
                                     to match the narrow shape, never as a blind preprocessing step applied to
                                     every value. This distinction is exactly what the negative-capability
                                     guard (§8 Decision 9) must prove holds.
 9. Raw text availability at the call site : entry.rawValue (the original ManualInputEntry field) is already
                                     in scope inside mapEntry's "measured-value" case — no plumbing change is
                                     needed to access it; it is simply not currently folded into anything on
                                     the success path.
10. Precedent for folding extra context into provenance : the EXISTING `entry.sourceRowRef` folding
                                     (`${prov.reference}|${entry.sourceRowRef}`) is the only precedent in this
                                     file. Reusing that exact pattern (append another `|`-delimited segment)
                                     is the smallest honest mechanism — inventing a new Provenance field would
                                     be a domain-model change Spec 044-C2 §6 Decision 3 did not authorize.
11. Precedent for a reason note      : `qualityForMetricLabel`'s existing suspicious-path reason string
                                     ("unrecognized metric name — recorded as reported, not rejected") is the
                                     style precedent — plain English, states the fact, makes no truth claim
                                     beyond the mechanism.
12. Does normalization interact with metric-recognition quality : YES, additively, not exclusively — an
                                     unrecognized-metric label that ALSO required grouped-thousands
                                     normalization must keep its "suspicious" status (metric recognition is
                                     unrelated and unaffected) while still gaining the normalization note in
                                     its reason string. A recognized-metric label that required normalization
                                     keeps "complete" status plus the note. Decision 4 ("keeps status
                                     complete") is about normalization itself never independently downgrading
                                     — not about suppressing an already-earned "suspicious" from metric
                                     recognition.
13. Does this need a new ManualInputLimitation catalog value : NO — the existing "unparseable-numeric-value"
                                     already means exactly "no faithful numeric interpretation was possible";
                                     a value that fails BOTH the strict parse AND the grouped-thousands
                                     grammar still means exactly that. No new catalog value is needed or
                                     justified (Spec 044-C2 did not request one).
14. Which real trial assertions become stale : 044-C.2 (status/acceptedCount/limitations), 044-C.3 (distance
                                     count/values — csv-59's "1,600" would now succeed as 1600), 044-C.4
                                     (complete-count total), 044-C.5 (deviceLabel-preserved count — csv-59's
                                     device-labeled distance row would now also survive). Each is inspected in
                                     §7 below; none of this tech spec touches them yet.
15. Does the historical findings document need touching : NO — `docs/trials/044-C-real-training-intake-trial.md`
                                     documents what WAS observed under the pre-044-C2A code and remains true
                                     as history; Spec 044-C2 §6 Decision 7 explicitly forbids rewriting it.
16. Is a helper function or inline logic preferable      : a small private helper (e.g.
                                     `matchesGroupedThousands(text: string): boolean` or an inlined regex
                                     constant) inside manual-input-adapter.ts — consistent with the file's
                                     existing style of small private functions (normalizeMetricLabel,
                                     qualityForMetricLabel), not a new file, not shared-kernel.
17. Does the result-shape change affect any exported type : NO — IngestManualInputInput,
                                     ManualInputIngestionOutcome, and all exported types are untouched; only a
                                     private function's internal signature and its one call site change.
18. Test file impact                 : two existing test files gain assertions
                                     (manual-input-adapter.test.ts for the new parsing/quality behavior;
                                     044-c-real-swim-session-trial.test.ts for the real-trial effect); the
                                     negative-capability guard file gains tokens to check for; no test file is
                                     rewritten wholesale.
19. Is any dependency required        : NO — a regex literal and String.prototype.replace are native.
20. Does this reopen CSV/FIT/TCX/Garmin-API pressure : NO — this remains entirely inside the already-existing
                                     measured-value text-parsing boundary; it neither reads a file nor talks
                                     to any external service.
```

---

## 5. Required implementation target — planned diff shape (not written here)

```text
parseFiniteNumber(rawValue: string): NumericParseResult

1. unchanged precondition: reject non-string / empty-after-trim input immediately (unparseable).
2. try the CURRENT strict path first (trim, then native Number(), Number.isFinite check).
   -> if it succeeds: return { status: "parsed", value, normalized: false }  (100% unchanged behavior).
3. only if step 2 fails: test the trimmed text against the grouped-thousands grammar (§6 Decision 1).
   -> if it matches: strip the grouping commas, parse the remaining digits with native Number(),
      require Number.isFinite -> return { status: "parsed", value, normalized: true }.
4. otherwise: return { status: "unparseable" }.
```

No broadening beyond this rule; no change to any other branch of `mapEntry`.

---

## 6. Required Design Decisions

### `[DECISION]` Design Decision 1 — parse result shape → **Option B, a small local discriminated result**
```ts
type NumericParseResult =
  | { readonly status: "parsed"; readonly value: number; readonly normalized: boolean }
  | { readonly status: "unparseable" };
```
Rejected Option A (`number | undefined` plus separate normalization detection) because it would force the
call site to re-derive "was this normalized?" by re-running the same regex test a second time — duplicated
logic for no benefit, since the helper already knows the answer at the point it succeeds. `NumericParseResult`
is a **local type inside `manual-input-adapter.ts`**, not exported, not a shared-kernel type, not a generic
parsing framework — it exists solely to carry the one extra boolean `mapEntry` needs.

### `[DECISION]` Design Decision 2 — exact normalization grammar (confirmed against every listed case)
```text
grammar         : ^[+-]?\d{1,3}(,\d{3})+$   (applied to the TRIMMED string, tested only as a fallback —
                  see Decision 1/§4 item 6 — after the existing strict native-Number() path has already failed)

accepted  (trimmed text matches; commas stripped, remainder parsed as an integer):
  "1,600"      -> 1600
  "12,345"     -> 12345
  "1,234,567"  -> 1234567
  "+1,600"     -> 1600
  "-1,600"     -> -1600

rejected  (does not match; stays "unparseable-numeric-value", exactly as today):
  "1,6"        -> 1 trailing digit, not a group of exactly 3           -> rejected
  "12,34"      -> 2 trailing digits                                    -> rejected
  "1,23,456"   -> a middle group of 2 digits ("23") is not exactly 3   -> rejected
  "1.234,56"   -> contains a decimal point; the grammar has none       -> rejected
  "1,600.5"    -> contains a decimal point                             -> rejected
  "1,600,"     -> trailing comma with no following digit group         -> rejected
  ",600"       -> no leading digit group before the first comma        -> rejected
```

### `[DECISION]` Design Decision 3 — whitespace behavior → **trim before testing, no internal leniency**
The grouped-thousands test runs against `rawValue.trim()` — mirroring native `Number()`'s own tolerance for
leading/trailing whitespace (already implicit in today's strict path). Internal whitespace (e.g. `"1, 600"`)
is **not** tolerated: the grammar match fails, and the value stays rejected. This is a deliberate, narrow
extension of existing behavior, not a new general leniency.

### `[DECISION]` Design Decision 4 — raw-text preservation mechanism → **fold into `Provenance.reference`, mirroring the existing `sourceRowRef` precedent**
```text
mechanism : when (and only when) parseFiniteNumber returns { normalized: true }, mapEntry appends one more
            `|`-delimited segment to the row's provenance reference, following the exact existing pattern used
            for entry.sourceRowRef:

              existing : `${prov.reference}|${entry.sourceRowRef}`
              extended : `${prov.reference}|${entry.sourceRowRef}|raw-numeric:"${entry.rawValue}"`
                         (or, if entry.sourceRowRef is absent: `${prov.reference}|raw-numeric:"${entry.rawValue}"`)

why this shape : reuses the ONE existing mechanism this file already has for carrying extra per-row context
            through an opaque string field — no new Provenance field, no new domain type, no change to
            ProvenanceInput's shape (§4 item 10). A reviewer reading Provenance.reference can recover the
            exact original source text Aurora normalized.
scope      : this segment is added ONLY on the normalized path — an already-strict-parseable value (e.g.
            "240") has nothing to reconstruct that differs from its own stored magnitude, so nothing new is
            appended for it (matches Spec 044-C2 §6 Decision 3's literal scope: "whenever a value is
            lexically normalized").
```

### `[DECISION]` Design Decision 5 — `quality.reason` behavior → **an additive note, never a status change caused by normalization itself**
```text
if parseResult.normalized is true:
  base quality = qualityForMetricLabel(entry.label)     // UNCHANGED — metric recognition is independent
  final reason = `${base.reason}; numeric text normalized from an unambiguous grouped-thousands form (raw: "${entry.rawValue}")`
  final status = base.status                             // "complete" for a recognized metric, "suspicious"
                                                           // for an unrecognized one — normalization itself
                                                           // never independently causes or blocks either

the note MUST NOT say: "locale", "guaranteed", "device-accurate", or otherwise assert anything beyond the
mechanical fact that grouping commas were stripped from the stated raw text.
```

### `[DECISION]` Design Decision 6 — limitation catalog → **no new value; `"unparseable-numeric-value"` is reused unchanged**
A value failing both the strict path and the grouped-thousands grammar produces exactly the same limitation
it produces today. `MANUAL_INPUT_LIMITATIONS` stays at 9 entries (unchanged from Impl 044-A1).

### `[DECISION]` Design Decision 7 — real-trial assertion updates (planned, not executed here)
```text
044-c-real-swim-session-trial.test.ts — planned changes for the FUTURE Implementation 044-C2A commit:

  044-C.2 : status "partially-accepted" -> "accepted"
            acceptedCount 20 -> 21
            limitations ["unparseable-numeric-value"] -> []
            quality "partial" -> "complete"

  044-C.3 : test name/assertions change from "the ONE real-data failure" to a THIRD distance value now
            succeeding — distances.length 2 -> 3; magnitudes [0, 3600] -> [0, 1600, 3600]. This test's
            NARRATIVE changes (it no longer demonstrates a failure) — it becomes a positive assertion that
            "1,600" -> 1600, with a comment explaining the behavior changed from the original 044-C finding.

  044-C.4 : complete.length 17 -> 18 (csv-59's distance joins the complete set; it was recognized as
            "distance", already in RECOGNIZED_METRICS, so it becomes complete, not suspicious). suspicious
            count remains 0.

  044-C.5 : withDevice.length 1 -> 2 (csv-59's device-labeled distance row now also survives ingestion, so
            its "device:Garmin Connect export" reference is no longer excluded).

docs/trials/044-C-real-training-intake-trial.md : NOT MODIFIED. It remains the historical record of the
  ORIGINAL run's findings. If a follow-up note is ever wanted, it would be a NEW, separately-approved
  addendum/document — out of scope for 044-C2A itself, and not required by any acceptance criterion here.
```

### `[DECISION]` Design Decision 8 — ambiguous-form rejection plan (planned tests, not executed here)
```text
new focused tests on parseFiniteNumber's OBSERVABLE behavior (via ingestManualInput, since the helper stays
unexported) proving each of these still yields "unparseable-numeric-value":
  "1,6", "12,34", "1,23,456", "1.234,56", "1,600.5", "abc", "1,600," , ",600"
```

### `[DECISION]` Design Decision 9 — negative capability (planned guard additions, not executed here)
```text
extend manual-input-adapter-negative-capability.test.ts (or add a focused sibling test) to prove absence of:
  Intl.NumberFormat, "numeral", "locale", "toLocaleString" (as a parsing mechanism), CSV/FIT/TCX parser tokens
  (already guarded — confirmed unchanged), "garmin_api"/"fitparse"/"tcxparse" (already guarded), and confirm
  the comma-strip is gated behind the exact regex (i.e. no blind `.replace(/[^\d.-]/g, "")`-style universal
  punctuation stripping is introduced).
also reconfirm (already covered by existing guards, unaffected by this change): no Signal, EvidenceCase,
  RenderingRequest, runOperatorSession/invokeOperatorSession, deliver, AthleteDecision, whole-core composer.
```

---

## 7. Required Test Plan (planned — not implemented in this tech spec)

```text
 1. "1,600" parses to 1600.
 2. "12,345" parses to 12345.
 3. "1,234,567" parses to 1234567.
 4. "+1,600" -> 1600 and "-1,600" -> -1600 (signed grouped integers behave per Decision 2).
 5. "1,6" remains rejected (unparseable-numeric-value).
 6. irregular grouping ("1,23,456", "12,34") remains rejected.
 7. comma + decimal point ("1.234,56", "1,600.5") remains rejected.
 8. existing plain integer behavior ("240") is byte-for-byte unchanged.
 9. existing decimal-dot behavior ("42.5") is byte-for-byte unchanged.
10. a normalized value keeps quality.status "complete" for a recognized metric label.
11. a normalized value's quality.reason contains an explicit normalization note.
12. that reason note contains no locale/device/truth claim (a targeted string-absence assertion).
13. an unrelated invalid value ("abc", "") still reports unparseable-numeric-value.
14. the real 044-C trial becomes "accepted" (Design Decision 7).
15. the real 044-C trial's acceptedCount becomes 21 (Design Decision 7).
16. the real 044-C trial's limitations become [] (Design Decision 7).
17. the real 044-C trial still shows zero unknown-metric ("suspicious") observations.
18. docs/trials/044-C-real-training-intake-trial.md is unchanged (a file-diff/hash-style check, or simply
    "not part of this commit's diff" verified at commit time).
19. no new dependency appears in package.json/package-lock.json.
20. AC20a/AC20b guards remain green unchanged (no new module, no four-surface import).
```

---

## 8. Required Implementation Slicing

```text
Implementation 044-C2A — Grouped-Thousands Numeric Intake

scope:
  - parseFiniteNumber's local result-shape change (Design Decision 1) and the grouped-thousands grammar
    (Design Decision 2/3), inside manual-input-adapter.ts only.
  - mapEntry's measured-value branch: consume the new result shape, apply the quality-reason note (Design
    Decision 5), fold raw text into provenance on the normalized path only (Design Decision 4).
  - the focused parser/ambiguity/regression tests (§7 items 1–13).
  - the real-trial assertion updates (§7 items 14–17, Design Decision 7) — the ORIGINAL findings document is
    left untouched (§7 item 18).
  - negative-capability guard additions if the existing guard file does not already cover the new tokens
    (Design Decision 9).
  - no dependency, no package/lockfile change.

explicitly NOT part of this slice:
  generic locale parser · shared-kernel numeric framework · new module · configuration registry · decimal-
  comma support · mixed-separator support · spaces/scientific-notation support · a rewrite of
  docs/trials/044-C-real-training-intake-trial.md
```

---

## 9. Required Acceptance Criteria (Given / When / Then)

```text
Given the real raw value "1,600", when measured-value intake runs, then numeric value 1600 is admitted.

Given an unambiguous grouped integer, when normalized, then the quality status remains complete and
  normalization is noted.

Given an ambiguous comma value, when intake runs, then it remains rejected rather than guessed.

Given a plain decimal-dot value, when intake runs, then existing behavior is unchanged.

Given normalization succeeds, when observation material is produced, then it remains Observation, not
  Evidence.

Given the original 044-C findings document, when implementation changes current behavior, then historical
  findings are not rewritten.

Given no automation boundary is approved, when normalization succeeds, then no Signal/Evidence/
  RenderingRequest/runtime/delivery/AthleteDecision action occurs.

Given AC20, when normalization is implemented, then no production whole-core composer is introduced.
```

---

## 10. Required Forbidden Behaviors (this tech spec)

```text
implementation code in this tech spec · broad locale inference · decimal-comma support · mixed-separator
support · silent punctuation stripping · numeric parsing dependency · package changes · CSV parser · FIT
parser · TCX parser · Garmin API · metric canonicalization · automatic Signal · automatic EvidenceCase ·
automatic RenderingRequest · automatic runOperatorSession · delivery · automatic AthleteDecision · API/UI/
server · production whole-core composer · reflection-composition · AC20 amendment
```

---

## 11. Relationship to Existing Architecture

- **Spec 044-C2** — this tech spec is its direct, exact-shape follow-up; every design decision here traces to
  one of that spec's §6 Decisions.
- **Manual Data Trial 044-C** (`docs/trials/044-C-real-training-intake-trial.md`) — remains historical
  evidence; the assertion CHANGES this plan describes belong entirely to the live test suite, never to that
  document (Design Decision 7).
- **Impl 044-A1 / Impl 044-C1A** — `parseFiniteNumber` and `qualityForMetricLabel` are the exact, sole targets
  of the future implementation; nothing else in `manual-input-adapter.ts` changes; `RECOGNIZED_METRICS` and
  `training-row-submission.ts` are untouched by this plan.
- **AC20** — unchanged; this plan selects no new type, module, or composer; the one new local type
  (`NumericParseResult`) is unexported and file-local.

---

## 12. Decision & Next Mission

`[DECISION] Implementation 044-C2A plan: extend parseFiniteNumber to return a small local discriminated
NumericParseResult ({status:"parsed", value, normalized} | {status:"unparseable"}); try the existing strict
native-Number() path first and only fall back to the grouped-thousands grammar (^[+-]?\d{1,3}(,\d{3})+$,
trimmed, no decimal point) on strict-path failure; on a normalized success, fold the original raw text into
Provenance.reference using the exact same |-delimited pattern already used for sourceRowRef, and append a
plain-English normalization note to quality.reason without changing quality.status; add no new
ManualInputLimitation value; update only the live 044-C real-trial test assertions (never the historical
findings document); add no dependency.`

```text
parseFiniteNumber result-shape decision : local discriminated union NumericParseResult (Design Decision 1) —
                                           unexported, file-local, not a shared-kernel type.
exact normalization grammar              : ^[+-]?\d{1,3}(,\d{3})+$, tested only as a fallback after the
                                           existing strict path fails (Design Decision 2).
whitespace behavior                      : trim before testing the grammar (mirrors existing implicit
                                           Number() tolerance); no internal-whitespace leniency (Design
                                           Decision 3).
raw-text preservation mechanism          : fold entry.rawValue into Provenance.reference as an additional
                                           |-delimited "raw-numeric:" segment, mirroring the existing
                                           sourceRowRef precedent — normalized path only (Design Decision 4).
quality.reason behavior                  : additive note ("numeric text normalized from an unambiguous
                                           grouped-thousands form..."); status is decided solely by
                                           qualityForMetricLabel, unaffected by normalization itself (Design
                                           Decision 5).
limitation behavior                      : no new catalog value; "unparseable-numeric-value" reused unchanged
                                           for anything failing both paths (Design Decision 6).
real-trial expected assertion changes    : 044-C.2 (accepted/21/[]), 044-C.3 (3 distances incl. 1600),
                                           044-C.4 (18 complete, 0 suspicious), 044-C.5 (2 device-labeled
                                           survivors) — docs/trials/044-C-real-training-intake-trial.md left
                                           untouched (Design Decision 7).
ambiguous-form rejection plan            : "1,6"/"12,34"/"1,23,456"/"1.234,56"/"1,600.5"/"1,600,"/",600" all
                                           stay unparseable-numeric-value (Design Decision 8).
dependency decision                      : none.
next implementation slice                : Implementation 044-C2A — Grouped-Thousands Numeric Intake (§8).
```

`[RECOMMENDATION] Next mission: Implementation 044-C2A — Grouped-Thousands Numeric Intake.` The first actual
code change in this arc since Impl 044-C1A — scoped exactly to §8's boundaries, with the test plan in §7 and
the real-trial assertion updates in Design Decision 7. No broader locale parsing is recommended without
further real evidence (Spec 044-C2 §4 item 20, unchanged).

---

## 13. Validation & Invariants at This Tech Spec

`tsc --noEmit` clean; `node --test` **1032/1032** (unchanged — this tech spec is docs-only). No code/test/
package/lockfile/tsconfig change; no dependency added; no guard weakened; AC20 untouched.
