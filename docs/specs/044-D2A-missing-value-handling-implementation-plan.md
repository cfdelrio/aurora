# Aurora — Technical Specification 044-D2A — Missing Value Handling Implementation Plan

> **Status (2026-07-05).** Technical Specification phase, building on Spec 044-D2 (`a335487`). It is
> **behavioral / docs-only**: it implements no code, does not edit any test, does not change `"--"` behavior
> yet, adds no domain type, no limitation value, no dependency, no package/test change, adds no parser (CSV/
> FIT/TCX), no Garmin API integration, creates no `Signal`/`EvidenceCase`/`RenderingRequest`, calls no
> `runOperatorSession`, adds no delivery, creates no `AthleteDecision` automatically, introduces no production
> whole-core composer, and amends no AC20. Base: `tsc --noEmit` clean; `node --test` **1057/1057**. It plans
> the exact, minimal `mapEntry` diff that reuses the existing `MissingDataObservation` domain concept for the
> exact literal token `"--"`.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — one level more concrete than Spec 044-D2, still no code. It
names the exact branch order, the exact construction shape, the exact test/trial-assertion updates, and one
next Implementation slice.

---

## 1. Context

`[FACT]` Spec 044-D2 (`a335487`) selected Option B: recognize the exact literal token `"--"` as a known,
source-declared, structurally-evidenced absence (100%-consistent across 274 combined real occurrences in two
independent real Garmin Connect exports), reusing Aurora's **existing** `MissingDataObservation` domain
concept — no new type, no registry, no zero-substitution, no silent omission. This tech spec plans the exact,
smallest `mapEntry` change that implements it.

---

## 2. Required grounding check (verified before planning anything)

`[FACT]` All five preconditions Spec 044-D2 rests on are re-verified true, directly against current source,
at authorship of this tech spec:

```text
1. MissingDataObservation exists in production domain code : TRUE.
   src/modules/observation/domain/observation.ts:
     export interface MissingDataObservation extends ObservationBase {
       readonly kind: "missing-data";
       readonly expected: string;   // "what was expected and absent"
     }
     export function missingDataObservation(input: MissingDataObservationInput): MissingDataObservation

2. It is already part of the current observation model : TRUE.
   src/modules/observation/application/record-observation-set.ts:
     case "missing-data": set = set.add(missingDataObservation(raw)); break;
   — already wired into the SAME recordObservationSet coordinator measured/subjective observations use.

3. Its current fields are sufficient : TRUE, exactly four fields —
     MissingDataObservationInput { id?: ObservationId; provenance: Provenance | ProvenanceInput;
                                    quality: ObservationQuality; expected: string }
   `expected` carries metric/context identification (the metric label); `quality.reason` carries the reason
   (a free-text string, unconditionally required — observationQuality() throws on an empty reason);
   `provenance` carries source/row traceability; `id` is auto-assigned (item 6 below) — no separate
   "athleteRef" or "observedAt" field exists on ANY Observation kind (athlete association and capture/
   recording time already live entirely inside `Provenance` — `Provenance.captureTime`/`recordingTime` — this
   corrects an assumption in the mission text rather than inventing fields that do not exist).

4. Reusing it requires no domain model change : TRUE — `mapEntry`'s EXISTING "missing-data" branch
   (manual-input-adapter.ts) already returns exactly `{ observation: { kind: "missing-data", provenance,
   quality, expected } }` — a `RawObservationInput` shape the "measured-value" branch's new code path can
   return identically, with zero change to any domain file.

5. The measured-value adapter has no existing "--" handling : TRUE — `parseFiniteNumber("--")` today returns
   { status: "unparseable" } (native Number("--") is NaN; "--" does not match GROUPED_THOUSANDS) — confirmed
   by direct inspection, unchanged since Impl 044-C2A.
```

No discrepancy exists; this plan proceeds exactly as Spec 044-D2 anticipated.

---

## 3. Central Question

> How should the existing measured-value intake path recognize exactly `"--"`, produce the existing
> `MissingDataObservation`, preserve traceability honestly, count it as admitted, and keep every other
> malformed numeric value on the existing rejection path?

```text
known structural absence ≠ malformed numeric text · known structural absence ≠ zero ·
accepted observation ≠ accepted numeric measurement · parseFiniteNumber concerns ≠ missing-value concerns ·
missing-value classification happens BEFORE numeric parsing, never inferred FROM a parse failure ·
generic Manual Input Adapter boundary ≠ a placeholder registry ≠ a source-format parser ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 4. Required inputs consulted

```text
docs/specs/044-D2-missing-value-semantics-boundary.md
docs/trials/044-D-second-real-swim-session-intake-trial.md
docs/trials/044-C-real-training-intake-trial.md
src/modules/observation/application/manual-input-adapter.ts   (mapEntry, parseFiniteNumber — exact source, §2)
src/modules/observation/application/training-row-submission.ts (confirmed: unaffected, pure row-shape mapper)
src/modules/observation/application/record-observation-set.ts  (RawObservationInput -> missingDataObservation, §2)
src/modules/observation/domain/observation.ts                  (MissingDataObservation, exact shape, §2)
src/modules/observation/domain/observation-quality.ts          (observationQuality — "missing" status already
                                                                 a member of ObservationQualityStatus, already
                                                                 used by the existing "missing-data" branch)
src/shared-kernel/ids.ts                                       (newObservationId — auto-assigned, unchanged)
src/modules/observation/tests/044-d-real-swim-session-fixture.ts
src/modules/observation/tests/044-d-real-swim-session-trial.test.ts
src/modules/observation/tests/manual-input-adapter.test.ts     (existing UC2 "missing-data" coverage, §9)
src/modules/observation/tests/manual-input-adapter-negative-capability.test.ts (existing guards, §10)
```

---

## 5. Required implementation target — planned diff shape (not written here)

```text
mapEntry's "measured-value" case, exact planned order:

1. unchanged: if (!nonEmpty(entry.label)) return { limitation: "ambiguous-field" };
2. unchanged: if (!nonEmpty(entry.unit)) return { limitation: "missing-unit" };
3. NEW: if entry.rawValue, TRIMMED, equals exactly the one recognized missing-value token ("--"):
   -> build rowProvenance (the SAME sourceRowRef-folding already used for measured-value, §7)
   -> return an admitted "missing-data" observation (§6/§7) — parseFiniteNumber is NOT called for this entry.
4. unchanged (fallback, exactly as today): const parsed = parseFiniteNumber(entry.rawValue); ...
```

`parseFiniteNumber` itself is **not modified** — the missing-value check is a new, separate, EARLIER
conditional inside `mapEntry`, never merged into `parseFiniteNumber`'s own logic (Decision area 2). This
preserves the existing distinction: `parseFiniteNumber` stays about numeric-TEXT interpretation only;
missing-value classification is a distinct, prior concern about whether numeric interpretation should even be
attempted for this raw string.

---

## 6. Required Decisions

### `[DECISION]` Decision 1 — exact token matching → **`entry.rawValue.trim() === "--"`, nothing broader**
```text
matches (recognized)   : "--", " -- ", "--  ", "  --"  — the trim() step mirrors the SAME whitespace
                          convention parseFiniteNumber already applies (Spec 044-C2 §6 Decision 3 / Tech
                          Spec 044-C2A Decision 3) — this is not a new leniency, it is the file's existing
                          standing convention applied consistently to a second concern.
does NOT match (stays on the existing numeric path, unchanged) :
  "-"      — a single dash; no real evidence supports it; remains unparseable-numeric-value.
  "---"    — three dashes; no real evidence supports it; remains unparseable-numeric-value.
  ""       — already caught by parseFiniteNumber's own empty-string precondition; unaffected, unchanged.
  " "      — trims to "", not "--"; falls through to parseFiniteNumber, unchanged (unparseable, as today).
  "N/A"    — zero real occurrences in either source file (Spec 044-D2 §2/§5 item 3); remains unparseable.
  "NA"     — zero real occurrences; remains unparseable.
  "null"   — zero real occurrences; remains unparseable.
no Set, array, regex family, or configurable token list is introduced — the comparison is a single string
  equality check against ONE private constant, e.g. a literal "--" — not a "family," not a "registry."
```

### `[DECISION]` Decision 2 — branch order → **exact match checked BEFORE `parseFiniteNumber` is ever called**
```text
Missing-value classification occurs strictly BEFORE any numeric-parsing attempt — never inferred from a
parse failure. This is a deliberate, evidence-grounded distinction (Spec 044-D2 §1/§3): a KNOWN absence is a
different real-world fact than a GENERIC parse failure, and conflating "parse failed" with "value is missing"
would be exactly the "guess from typography/failure" behavior Spec 044-D2 rejected. If `entry.rawValue.trim()`
is not exactly "--", control falls through unchanged to the existing `parseFiniteNumber` call — no behavior
of that function or its call site (for anything other than the one recognized string) changes at all.
```

### `[DECISION]` Decision 3 — `MissingDataObservation` construction plan → **reuse the exact existing shape, no new field**
```text
{
  kind: "missing-data",
  provenance: rowProvenance,     // §7 — the SAME sourceRowRef-folding measured-value already performs
  quality: observationQuality("missing", <reason text, §8>),   // "missing" — an EXISTING
                                                                 // ObservationQualityStatus, already used
                                                                 // by mapEntry's pre-existing "missing-data"
                                                                 // branch for the reporter-declared case
  expected: entry.label,          // the metric label (e.g. "avg-strokes-per-length") — reuses `expected`
                                   // exactly as its existing doc comment defines it: "what was expected and
                                   // absent" — here, the SOURCE declared it absent, not the reporter
}
```
No new field, no new type, no change to `MissingDataObservationInput`'s contract. `id` is unmanaged by this
plan (auto-assigned by `missingDataObservation()` via `newObservationId()`, §9, exactly as every other
Observation kind already works).

### `[DECISION]` Decision 4 — reason semantics → **states the mechanical fact only, no formula/failure/truth claim**
```text
planned reason text (exact shape, repo style, interpolating the real raw text — mirrors Impl 044-C2A's own
  additive-note pattern):

    `source reported the measured value as unavailable using raw token "${entry.rawValue}"`

must NOT state          : sensor failure, athlete failure, device malfunction, a zero value, metric truth, or
                           a universal Garmin-wide semantic claim — none of these is evidenced (Spec 044-D2's
                           classification is narrower: "not computed at this row's aggregation level," which
                           the reason text does not even need to assert, since the RAW TOKEN plus the
                           existing "missing" quality.status already communicate exactly what happened,
                           honestly, without overclaiming why).
```

### `[DECISION]` Decision 5 — provenance / `sourceRowRef` traceability → **reuse the exact existing fold; no raw-numeric segment**
```text
rowProvenance : the SAME code shape already used for measured-value's provenance —
    entry.sourceRowRef !== undefined
      ? { ...prov, reference: `${prov.reference}|${entry.sourceRowRef}` }
      : prov
  — reused verbatim for the missing-data branch too, so sourceRowRef/artifactRef/deviceLabel folding
  (whatever the row's provenance already carries) survives identically.

NOT added : the "raw-numeric:" provenance segment (Impl 044-C2A) — that mechanism exists specifically for a
  NORMALIZED numeric value's original text; a missing-data entry has no numeric value to normalize, so it
  does not apply here. The raw token instead lives in quality.reason (Decision 4) — the ONE place it is
  preserved, stated explicitly rather than implied to exist elsewhere.

where an operator inspects the source fact, exactly : MissingDataObservation.quality.reason (the literal raw
  token "--") + MissingDataObservation.provenance.reference (the sourceRowRef/artifactRef trail identifying
  exactly which real CSV row and artifact produced it) — nowhere else.
```

### `[DECISION]` Decision 6 — observation identity → **unchanged, auto-assigned exactly as today**
`newObservationId()` (already called inside `missingDataObservation()`, unconditionally, for every
`MissingDataObservation` regardless of caller) continues to assign identity — no special ID scheme, no
deterministic-from-source-row ID is introduced; this plan touches zero identity logic.

### `[DECISION]` Decision 7 — admission / counting → **no new count concept; `acceptedCount` already counts it correctly**
```text
ingestManualInput's existing loop already does:
  if ("observation" in mapped) observations.push(mapped.observation);
  else limitations.push(mapped.limitation);
  ...
  acceptedCount: observations.length

A missing-data observation returned from the new branch is an "observation," not a "limitation" — it is
pushed into the SAME `observations` array subjective/measured observations already share, so
`acceptedCount` counts it automatically, with ZERO code change to that counting logic. No missingCount/
skippedCount/ignoredCount is introduced — none is needed, since the EXISTING count already means "material
Aurora could faithfully represent," not "a numeric measurement exists" (subjective observations already
prove this distinction holds today, uncontroversially).
Required distinction, stated explicitly: accepted observation ≠ accepted numeric measurement — a
MissingDataObservation counting toward acceptedCount asserts only that Aurora faithfully recorded what the
source said (an explicit absence), never that a measurement was taken.
```

### `[DECISION]` Decision 8 — submission status derivation → **falls out of existing generic logic, no special-casing**
```text
ingestManualInput's existing line: status = limitations.length > 0 ? "partially-accepted" : "accepted";
is untouched. Recognizing "--" removes it from the `limitations` array (it becomes an observation instead) —
for Trial 044-D specifically, this is currently its ONLY limitation, so `limitations.length` naturally
becomes 0 and `status` naturally becomes "accepted" — this is the GENERIC status-derivation logic producing
that result on its own, not a Trial-044-D-specific branch anywhere in production code. No mismatch exists;
no hard-coding is planned or needed.
```

### `[DECISION]` Decision 9 — existing malformed values stay unaffected (regression plan)
```text
"abc", "1,6", "12,34", "1,23,456", "1.234,56", "1,600.5", "1, 600" — none equals the trimmed string "--";
all fall through, unchanged, to the existing parseFiniteNumber call, which is not modified by this plan in
any way. All remain "unparseable-numeric-value", exactly as today.
```

### `[DECISION]` Decision 10 — numeric normalization regression plan
```text
"1,600" -> 1600, "3,200" -> 3200, "1,125" -> 1125 (Impl 044-C2A's grouped-thousands rule) — parseFiniteNumber
and GROUPED_THOUSANDS are entirely untouched; the new missing-value check runs strictly BEFORE
parseFiniteNumber is even called and only ever intercepts the one exact recognized string — it cannot
interfere with NumericParseResult or any numeric-shaped input.
```

### `[DECISION]` Decision 11 — Trial 044-D expected assertion changes (planned, not executed here)
Inspecting the trial's exact current assertions (`044-d-real-swim-session-trial.test.ts`), the future
implementation is expected to change:
```text
044-D.2 : status "partially-accepted" -> "accepted"; acceptedCount 40 -> 41;
          limitations ["unparseable-numeric-value"] -> []; quality "partial" -> "complete".

044-D.3 : currently titled/asserting that csv-D-5's "--" IS the row that failed (2 measured observations,
          avg-strokes-per-length absent). Its NARRATIVE changes (mirroring how 044-C.2/044-C.3 were rewritten
          when Impl 044-C2A landed) to a positive assertion:
            - csv-D-5 now contributes 3 observations (distance, avg-heart-rate — both "measured" — PLUS one
              "missing-data" observation for avg-strokes-per-length).
            - the missing-data observation's `kind` is exactly "missing-data" (not "measured").
            - its `expected` field equals "avg-strokes-per-length".
            - no numeric magnitude/Measurement exists on it at all (kind discriminates this structurally).
            - its quality.reason contains the literal raw token '"--"' and the phrase "unavailable".
            - its quality.reason does NOT contain "sensor"/"malfunction"/"device fail"/"zero".
            - its provenance.reference contains "row:csv-D-5" (traceability preserved).

044-D.11 : currently asserts "36 attempted measured-value entries = 35 admitted-as-measured + 1 limitation."
          This test's assertion SHAPE changes (not just its numbers) to account for a three-way partition:
            measuredEntries (36) = admittedAsMeasured (35) + admittedAsMissingData (1) + limitations.length (0)
          — still proving no entry is silently dropped, now across three outcomes instead of two.

044-D.1, 044-D.4, 044-D.5, 044-D.6, 044-D.7, 044-D.8, 044-D.9, 044-D.10, 044-D.12 : UNCHANGED — none of these
          tests' subject matter (row/entry counts, grouped-thousands normalization, optimal-pace/avg-strokes-
          per-length recognition, the near-duplicate-row HR values, provenance/deviceLabel, notes, the
          zero-distance rest row, negative capability) is affected by this plan; each is re-verified, not
          assumed, once a future implementation exists.
```
`docs/trials/044-D-second-real-swim-session-intake-trial.md` is **not** modified (Spec 044-D2 §7 Decision
area 10, unchanged).

### `[DECISION]` Decision 12 — Trial 044-C regression plan (planned, not executed here)
Trial 044-C's fixture (`044-c-real-swim-session-fixture.ts`) contains **no** `"--"` entry at all — its three
selected source lines (`csv-2`/rest, `csv-59`/interval-summary, `csv-134`/`Resumen`) never included a sub-lap
row (Spec 044-D2 §2, a selection artifact). This plan therefore has **zero** code path that can affect Trial
044-C's outcome. The future implementation must nonetheless explicitly re-run and re-verify, unchanged: status
`"accepted"`, `acceptedCount: 21`, `limitations: []`, zero suspicious — an explicit regression check, not an
assumption, exactly as Impl 044-D1A performed for the same trial.

### `[DECISION]` Decision 13 — existing test coverage reuse
`manual-input-adapter.test.ts`'s existing UC2 test already exercises the reporter-declared `"missing-data"`
`ManualInputEntry` kind and its resulting `MissingDataObservation` end-to-end — that coverage is **not**
duplicated. This plan's new tests (§7) cover only the NEW code path (recognizing `"--"` from WITHIN a
`"measured-value"` entry), which UC2's existing test does not exercise at all.

---

## 7. Required Test Plan (planned — not implemented in this tech spec)

```text
 1. an exact "--" measured-value entry produces a MissingDataObservation (kind "missing-data").
 2. no MeasuredObservation is created for that entry.
 3. no numeric magnitude of any kind (0, NaN, or null) is ever attached to it.
 4. it produces no "unparseable-numeric-value" limitation.
 5. it counts as exactly one admitted observation (acceptedCount includes it).
 6. its quality.status is exactly "missing" (the existing ObservationQualityStatus, reused).
 7. its quality.reason states source-declared unavailability and includes the literal raw token '"--"'.
 8. its quality.reason does not contain "sensor"/"malfunction"/"device"/"zero"/"Garmin formula"-style claims.
 9. its provenance.reference preserves sourceRowRef (traceability, e.g. "row:csv-D-5").
10. "abc" remains unparseable-numeric-value (malformed-value regression).
11. "-" remains unparseable-numeric-value (not recognized as the missing token).
12. "---" remains unparseable-numeric-value (not recognized).
13. "N/A" remains unparseable-numeric-value (not recognized — no evidence supports it).
14. "" remains unparseable-numeric-value (unchanged, pre-existing empty-string behavior).
15. " -- " (padded with whitespace) IS recognized as the missing token (trim-equivalence, Decision 1).
16. grouped-thousands normalization ("1,600"/"3,200"/"1,125") remains completely unaffected.
17. an unrelated unrecognized metric label's existing "suspicious" behavior remains unaffected.
18. Trial 044-D's status becomes "accepted" (044-D.2, updated).
19. Trial 044-D's acceptedCount becomes 41 (044-D.2, updated).
20. Trial 044-D's limitations become [] (044-D.2, updated).
21. Trial 044-D's csv-D-5 "--" entry is proven to produce the MissingDataObservation described in items 1–9
    (044-D.3, rewritten).
22. Trial 044-C remains accepted / acceptedCount 21 / limitations [] (regression re-check, Decision 12).
23. no new domain type token ("MissingMeasurement", "MissingObservation") appears anywhere in production code.
24. no missing-token registry (Set/array of absence tokens) appears — the check is a single string equality.
25. no source-format-specific parser/preprocessing infrastructure appears.
```

---

## 8. Required Negative-Capability Plan

```text
extend the existing static guard file (manual-input-adapter-negative-capability.test.ts) with FOCUSED
additions only — no new guard file:

  - confirm no Set/array literal is built for missing/absence tokens (e.g. no
    `new Set([...])`/`[...]` literal near a "MISSING"/"ABSENCE"-named identifier) — the recognized token
    stays a single string comparison.
  - confirm no "MissingMeasurement"/"MissingObservation"/"AbsenceToken"/"PlaceholderRegistry"-style token
    appears anywhere in production code.
  - confirm no config-driven/file-backed/database/remote missing-token source (reusing the SAME token list
    already checked for RECOGNIZED_METRICS — "readFileSync", "process.env", ".json"/".yaml"/".yml", etc.)
  - confirm no CSV-specific/source-format-specific branching was introduced (no `sourceFormat ===`/
    `"csv-summary"` conditional anywhere in manual-input-adapter.ts).

ALL existing guards (CSV/FIT/TCX/Garmin API/Signal/EvidenceCase/RenderingRequest/runOperatorSession/delivery/
AthleteDecision/whole-core composer/reflection-composition) remain exactly as they are — this plan neither
weakens nor needs to extend them, since nothing about this change touches any of those seams.
```

---

## 9. Required Implementation Slicing

```text
Implementation 044-D2A — Exact Missing-Value Observation Intake

scope:
  - mapEntry's "measured-value" branch: one new conditional (Decision 1/2), placed before the existing
    parseFiniteNumber call, inside manual-input-adapter.ts only.
  - construct the existing MissingDataObservation shape on that path (Decision 3–6) — no domain file changes.
  - focused behavior tests (§7 items 1–17).
  - Trial 044-D assertion updates (§7 items 18–21, Decision 11) — the historical findings document untouched.
  - Trial 044-C regression re-check (§7 item 22, Decision 12).
  - minimal negative-capability guard additions (§8, items 23–25) — only if the existing guards do not
    already cover them.
  - no dependency, no package/lockfile change.

explicitly NOT part of this slice:
  domain model change · new limitation catalog value · missing-token registry/Set/array · configuration
  framework · source-format-specific parser/preprocessing · CSV/FIT/TCX parser · Garmin API · a fix to
  timestamp/provenance behavior · row deduplication · any change to parseFiniteNumber itself.
```

---

## 10. Required Acceptance Criteria (Given / When / Then)

```text
Given the exact real token "--", when measured-value intake runs, then the existing MissingDataObservation
  is admitted.

Given "--" is classified as missing, when observation material is created, then no numeric magnitude is
  invented.

Given a MissingDataObservation is admitted, when counts are calculated, then acceptedCount includes it
  without implying a numeric measurement exists.

Given malformed numeric text other than "--", when intake runs, then existing unparseable-numeric-value
  behavior remains unchanged.

Given grouped-thousands numeric text, when intake runs, then existing numeric normalization remains
  unchanged.

Given the real Trial 044-D fixture, when future implementation runs, then the placeholder row becomes
  missing-data and the submission becomes accepted with 41 admitted observations and no limitations.

Given the original Trial 044-D findings document, when current behavior improves, then historical evidence
  remains unchanged.

Given Trial 044-C, when missing-value handling is added, then its accepted result remains unchanged.

Given missing-data intake succeeds, when observation material is produced, then no Signal/Evidence/
  RenderingRequest/runtime/delivery/AthleteDecision action occurs.

Given AC20, when missing-value handling is implemented, then no production whole-core composer is
  introduced.
```

---

## 11. Required Forbidden Behaviors (this tech spec)

```text
implementation code in this tech spec · test changes · new domain type · new limitation value ·
zero substitution · NaN Measurement · null numeric Measurement · silent omission · broad missing-token
family · missing-token registry · configuration framework · source-format parser · CSV parser · FIT parser ·
TCX parser · Garmin API · timestamp/provenance fix · row deduplication · new dependency · package changes ·
automatic Signal · automatic EvidenceCase · automatic RenderingRequest · automatic runOperatorSession ·
delivery · automatic AthleteDecision · API/UI/server · production whole-core composer ·
reflection-composition · AC20 amendment
```

---

## 12. Relationship to Existing Architecture

- **Spec 044-D2** — this plan implements exactly its Option B decision (§2 grounding check re-confirms every
  precondition it rested on).
- **Manual Data Trial 044-D** — this plan's Decision 11 is the direct, evidence-traceable expected change to
  that trial's own assertions; its historical findings document stays untouched.
- **Manual Data Trial 044-C** — explicitly re-verified as a regression check (Decision 12), not assumed safe,
  since its fixture never happened to select a sub-lap row.
- **Impl 013 / the existing "missing-data" mechanism** — this plan's entire construction (Decision 3–7) is a
  direct reuse of the SAME domain type and coordinator path Impl 013 already built and Impl 044-A1 already
  exercises for reporter-declared absence; nothing new is added to the domain.
- **Spec 044-C2 / Impl 044-C2A** — the boundary-location and whitespace-trimming precedents are followed
  identically (Decision 1/2, Decision 5's explicit non-reuse of the "raw-numeric:" segment for a different
  concern).
- **AC20** — unchanged; this plan selects no new type, module, or composer.

---

## 13. Decision & Next Mission

`[DECISION] Implementation 044-D2A plan: inside mapEntry's "measured-value" branch, check
entry.rawValue.trim() === "--" BEFORE calling parseFiniteNumber; on a match, construct the EXISTING
MissingDataObservation (kind "missing-data", expected: entry.label, quality: observationQuality("missing",
a reason stating source-declared unavailability and preserving the literal raw token), provenance: the SAME
sourceRowRef-folded provenance measured-value already builds) and return it as an admitted observation — no
limitation, no numeric parsing attempted. Otherwise, fall through unchanged to the existing parseFiniteNumber
path. No domain model change, no new limitation value, no missing-token registry.`

```text
exact token-match decision        : entry.rawValue.trim() === "--" — a single string-equality check; nothing
                                     broader (Decision 1).
branch-order decision             : missing-token check runs BEFORE parseFiniteNumber, never inferred from a
                                     parse failure (Decision 2).
MissingDataObservation construction plan : { kind: "missing-data", provenance: rowProvenance, quality:
                                     observationQuality("missing", <reason>), expected: entry.label } — the
                                     exact existing shape, no new field (Decision 3).
reason behavior                    : `source reported the measured value as unavailable using raw token
                                     "${entry.rawValue}"` — no sensor/device/zero/formula/truth claim
                                     (Decision 4).
provenance/sourceRowRef behavior   : reuses the EXACT existing sourceRowRef-fold; no "raw-numeric:" segment
                                     (that mechanism is for normalized numeric text, not absence) — the raw
                                     token lives in quality.reason instead (Decision 5).
observation-id behavior            : unchanged — auto-assigned by missingDataObservation() via
                                     newObservationId(), exactly as every other Observation kind (Decision 6).
admission/counting behavior        : counts toward acceptedCount automatically via the EXISTING observations
                                     array/count logic; no new count concept (Decision 7).
status derivation behavior         : falls out of the existing generic limitations.length check; no
                                     Trial-044-D-specific branch anywhere (Decision 8).
malformed-value regression plan    : "abc"/"1,6"/"12,34"/"1,23,456"/"1.234,56"/"1,600.5"/"1, 600" all remain
                                     unparseable-numeric-value, untouched (Decision 9).
numeric-normalization regression plan : "1,600"/"3,200"/"1,125" grouped-thousands behavior fully unaffected
                                     (Decision 10).
Trial 044-D expected assertion changes : status -> accepted; acceptedCount 40 -> 41; limitations -> [];
                                     044-D.3 rewritten to prove the MissingDataObservation directly; 044-D.11
                                     re-shaped to a three-way (measured/missing-data/limitation) partition
                                     (Decision 11).
Trial 044-C regression expectation : remains accepted / 21 / [] — explicitly re-verified, zero code path
                                     affects it (Decision 12).
negative-capability guard plan     : focused additions confirming no missing-token registry/Set/array, no
                                     new domain-type token, no config/file/db/remote token source, no
                                     source-format-specific branching — all EXISTING guards stay untouched
                                     (§8).
next implementation slice          : Implementation 044-D2A — Exact Missing-Value Observation Intake (§9).
```

`[RECOMMENDATION] Next mission: Implementation 044-D2A — Exact Missing-Value Observation Intake.` Exactly the
scope in §9 — a one-conditional addition inside `mapEntry`'s existing `"measured-value"` branch, its focused
behavior tests, the Trial 044-D assertion update, the Trial 044-C regression re-check, and minimal
negative-capability guard additions only where genuinely needed. No dependency, no domain model change, no
new limitation value, no registry. The timestamp/provenance finding and the near-duplicate-row observation
each remain **separate** candidate missions, untouched by this plan, exactly as Spec 044-D2 §8 left them.

---

## 14. Validation & Invariants at This Tech Spec

`tsc --noEmit` clean; `node --test` **1057/1057** (unchanged — this tech spec is docs-only). No code/test/
package/lockfile/tsconfig change; no dependency added; no guard weakened; AC20 untouched.
