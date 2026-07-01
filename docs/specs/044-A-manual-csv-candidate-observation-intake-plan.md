# Aurora — Technical Specification 044-A — Manual/CSV Candidate Observation Intake Plan

> **Status (2026-07-01).** Technical Specification phase, building on Spec 044 (`d6e4f36`). It is **behavioral /
> docs-only**: it implements no code, adds no parser, no dependency, no package/test change, adds no Garmin API/
> FIT/TCX integration, no delivery, no live-provider default, no scheduler/worker loop, no registry/IaC/deploy,
> creates no `Evidence`/`Signal`/`RenderingRequest` directly, triggers no `runOperatorSession`, creates no
> `AthleteDecision`, introduces no production whole-core composer, and amends no AC20. Base: `tsc --noEmit`
> clean; `node --test` **995/995**. It plans the exact adapter that fills Spec 044's approved gap.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — one level more concrete than Spec 044, still no code. It names
exact files, exact types, and exact mapping rules; the following **Implementation** (044-A1) writes them.

---

## 1. Context

`[FACT]` Spec 044 (`d6e4f36`) selected Option B — a manual/CSV-summary candidate-observation intake boundary —
and made one decisive finding: the gap is **adapter-level, not domain-level**. `MeasuredObservation` /
`Measurement { quantity, magnitude, unit }` already exist and are fully constructible. This tech spec verifies
that finding against the exact current source and goes one step further: **the existing Manual Input Adapter's
`ManualInputEntry` union already has a `"measured-value"` kind** —

```ts
// src/modules/observation/application/manual-input-submission.ts (verbatim, current)
| { readonly kind: "measured-value"; readonly label: string; readonly rawValue: string; readonly unit?: string }
```

— and its handler is the **only** place the reservation lives:

```ts
// src/modules/observation/application/manual-input-adapter.ts mapEntry(), current
case "measured-value":
  // Reserved this slice: no unit interpretation. Ignored as a limitation (rejection handled upstream).
  return { limitation: "unsupported-field-ignored" };
```

`[FACT]` This means a CSV/manual-summary row (`metric`, `value`, `unit`) maps **almost one-to-one** onto the
already-existing `measured-value` entry shape (`label`, `rawValue`, `unit`). No new `ManualInputEntry` kind, no
new `Observation` kind, and no bypass of `ingestManualInput` is needed — only (a) a pure mapper that turns rows
into a `ManualInputSubmission`, and (b) implementing the currently-stubbed `measured-value` branch of the
existing adapter's `mapEntry()`. This is a materially smaller, more precedent-respecting design than a new
sibling adapter would be.

---

## 2. Central Question

> How should Aurora implement a manual/CSV-summary intake adapter that converts structured training rows into
> existing observation-domain candidate measured observations, while preserving provenance, units,
> confidence/warnings, and operator review?

```text
candidate row ≠ Evidence · candidate row ≠ Signal · parsed metric ≠ Evidence ·
faithful mapping ≠ interpretation · unfamiliar metric name ≠ invalid metric ·
row-level rejection ≠ submission-level failure · Aurora advises; the athlete decides ·
Aurora never presents inference as fact
```

---

## 3. Required inputs consulted (exact current types/functions verified against source)

```text
docs/specs/044-training-artifact-intake-boundary.md
docs/specs/001-observation-set-intake.md
docs/specs/013-manual-input-adapter.md
src/modules/observation/index.ts
src/modules/observation/application/manual-input-adapter.ts
src/modules/observation/application/manual-input-submission.ts
src/modules/observation/application/manual-input-ingestion-outcome.ts
src/modules/observation/application/record-observation-set.ts
src/modules/observation/domain/observation.ts
src/modules/observation/domain/observation-quality.ts
src/shared-kernel/provenance.ts
src/shared-kernel/ids.ts
src/operator-runtime/application/training-session-record.ts
src/operator-runtime/application/training-artifact-object-store.ts
```

`[FACT]` Exact current names (verified — none invented, none renamed):

```text
RawObservationInput = { kind: "measured" } & MeasuredObservationInput
                     | { kind: "subjective" } & SubjectiveObservationInput
                     | { kind: "missing-data" } & MissingDataObservationInput
MeasuredObservationInput { id?, provenance: Provenance | ProvenanceInput, quality: ObservationQuality,
                            measurement: Measurement }
Measurement { quantity: string, magnitude: number, unit: string }
Provenance { source: Source, captureTime: Timestamp, recordingTime: Timestamp, reference: string }
Source = "device" | "athlete-report" | "coach-report" | "manual" | "imported-plan" | "competition-result"
       | "system-derived"
ObservationQuality { status: ObservationQualityStatus, reason: string }
ObservationQualityStatus = "complete" | "partial" | "missing" | "inconsistent" | "corrupted" | "suspicious"
                          | "stale" | "source-conflicted" | "context-missing"
ingestManualInput(input: IngestManualInputInput): ManualInputIngestionOutcome     // NOT "...Result" — the
                                                                                    real name is Outcome
ManualInputSubmission { submissionRef, athleteRef, submittedAt, occurredAt, occasion, reporter: Source,
                         entries: readonly ManualInputEntry[], expected?, purposeVersionRef?,
                         decisionSupportCaseRef?, athleteDecisionRef? }
ManualInputEntry = subjective-report | context-note | athlete-decision-report | missing-data
                 | measured-value { label, rawValue, unit? }        // currently reserved/ignored
TrainingSessionRecord { id, athleteRef, source: "garmin" | "manual", artifact?: TrainingSessionRawArtifactRef,
                         label?, capturedAt?, recordedAt }
TrainingSessionRawArtifactRef { source, reference, mediaType?, capturedAt? }
```

`[FACT]` Correction to the mission's naming: the outcome type is `ManualInputIngestionOutcome`, not
`ManualInputIngestionResult` — this plan uses the real name throughout, per Spec 044/this spec's own rule to
never invent a name that conflicts with existing code.

---

## 4. Design Target

`[DECISION]` No new `Observation` kind, no new `ManualInputEntry` kind, no bypass adapter. The plan is:

1. **A new pure row/submission shape** — `src/modules/observation/application/training-row-submission.ts` —
   defining `TrainingSummaryRow` and `TrainingRowSubmission` (§5) and a PURE mapper
   `trainingRowSubmissionToManualInput(input: TrainingRowSubmission): ManualInputSubmission` (§6) that produces
   `measured-value` / `context-note` / `missing-data` entries from rows — **zero** file I/O, **zero** dependency.
2. **Implementing the existing reserved branch** — in `src/modules/observation/application/manual-input-adapter.ts`,
   `mapEntry()`'s `case "measured-value"` currently returns `{ limitation: "unsupported-field-ignored" }`
   unconditionally. This plan replaces that stub with: parse `rawValue` as a finite number, require a non-empty
   `unit`, and on success call `measuredObservation({ provenance: prov, quality, measurement: { quantity: label,
   magnitude: parsedNumber, unit } })`; on failure, return a specific new `ManualInputLimitation` or
   `ManualInputRejectionReason` (§6/§9) instead of the generic `"unsupported-field-ignored"`.
3. Both live inside `src/modules/observation/application/` — the SAME module Impl 013 already occupies. No new
   top-level `src/modules` entry (AC20a); no `reasoning`/`understanding`/`decision-support` import (AC20b).

`[FACT]` This satisfies Spec 044 Decision 3 ("observation module application/adapter layer") precisely, and
resolves Spec 044's open path-(a)-vs-(b) question in favor of **path (a)**: extend `ingestManualInput` itself,
because `ManualInputSubmission` already represents measured values cleanly (§1) — Option C (a bypass adapter)
is therefore not needed (§8).

---

## 5. Row Shape (derived strictly from existing types)

```ts
/** One structured training-summary/CSV-derived measurement. Plain data — no file I/O, no parsing library. */
export interface TrainingSummaryRow {
  readonly sourceRowId: string;        // row/line reference — preserved in Provenance.reference, never dropped
  readonly metric: string;             // -> ManualInputEntry.measured-value.label -> Measurement.quantity
  readonly value: string;              // -> ManualInputEntry.measured-value.rawValue (string; parsed downstream)
  readonly unit: string;               // -> ManualInputEntry.measured-value.unit / Measurement.unit — REQUIRED
  readonly observedAt: Timestamp;      // -> Provenance.captureTime (existing shared-kernel Timestamp)
  readonly deviceLabel?: string;       // advisory only; folded into Provenance.reference, never a new field
  readonly notes?: string;             // -> a separate "context-note" ManualInputEntry (never merged into value)
}

/** The set of rows from one manual/CSV summary for one occasion. */
export interface TrainingRowSubmission {
  readonly submissionRef: string;                       // -> ManualInputSubmission.submissionRef
  readonly athleteRef: string;                           // -> ManualInputSubmission.athleteRef
  readonly occasion: string;                              // -> ManualInputSubmission.occasion
  readonly source: "manual" | "device";                   // -> ManualInputSubmission.reporter (a Source value)
  readonly sourceFormat: "manual-summary" | "csv-summary"; // advisory; folded into Provenance.reference
  readonly artifactRef?: string;                           // -> TrainingSessionRawArtifactRef.reference, if any
  readonly submittedAt: Timestamp;                         // -> ManualInputSubmission.submittedAt
  readonly occurredAt: Timestamp;                          // -> ManualInputSubmission.occurredAt
  readonly rows: readonly TrainingSummaryRow[];
}
```

`[FACT]` No field is invented beyond what §6's mapping requires; every field has a named destination in an
EXISTING type. `sourceFormat` and `deviceLabel` are advisory-only (never a new `Source` value, never a new
`Provenance` field) — they fold into the `Provenance.reference` handle exactly as `manual-input-adapter.ts`'s
existing `provenanceFor()` already folds `submissionRef`+`reporter` into one reference string.

---

## 6. Required Mapping Decisions

```text
 1. Required row fields          : sourceRowId, metric, value, unit, observedAt — ALL required. unit is
                                    REQUIRED (stricter than ManualInputEntry.measured-value.unit, which is
                                    optional today) — a numeric measurement with no unit is not faithfully
                                    representable and must be rejected at the row level, never invented.
 2. Metric name -> Measurement    : `row.metric` maps verbatim to `Measurement.quantity` (free-text, not a
                                    closed enum in this slice) — same convention `ManualInputEntry.measured-value
                                    .label` already uses.
 3. Unit mapping/validation       : `row.unit` maps verbatim to `Measurement.unit`; validated ONLY as a
                                    non-empty string in this first slice — NO unit-conversion/unit-catalog
                                    check (that needs a units library — explicitly deferred, keeps zero deps).
 4. Time/timestamp representation : `row.observedAt: Timestamp` (the EXISTING shared-kernel type) maps to
                                    `Provenance.captureTime`; the submission-level `submittedAt` maps to
                                    `Provenance.recordingTime` (when Aurora ingested it — injected, never
                                    Date.now()).
 5. Duration representation       : NOT a special field. A duration value is just another row with
                                    `metric: "duration"` (or similar) — keeps the row shape uniform (one row =
                                    one measurement); avoids inventing a parallel time-range concept.
 6. Source artifact ref -> Provenance : `Provenance.reference` = a composed opaque string, e.g.
                                    `${submissionRef}|row:${sourceRowId}${artifactRef ? "|artifact:" +
                                    artifactRef : ""}` — mirrors the existing `provenanceFor()` composition
                                    pattern exactly (`${s.submissionRef}|reporter:${s.reporter}`).
 7. Warnings -> ObservationQuality / outcome warnings : BOTH. A row that maps successfully but is uncertain
                                    (e.g. an unrecognized metric name) carries `ObservationQuality{status:
                                    "suspicious", reason}` on the resulting `MeasuredObservation`; a row that
                                    fails to map at all becomes a row-level LIMITATION in the ingestion outcome
                                    (mirroring `ManualInputLimitation`), never silently dropped.
 8. Confidence via ObservationQuality : reuses the EXISTING `ObservationQualityStatus` catalog — a cleanly
                                    parsed row with a recognized metric/valid unit -> `qualityComplete()`; an
                                    unrecognized-but-well-formed metric -> `observationQuality("suspicious",
                                    "unrecognized metric name")`. NO numeric confidence score; `ClaimConfidence`
                                    (reasoning-level) is never reused here (Spec 044 Decision 4).
 9. Unknown metric behavior       : ACCEPTED with a quality warning (`"suspicious"`), not rejected. Aurora owns
                                    no canonical metric catalog yet; refusing an unfamiliar-but-well-formed
                                    metric name would be the adapter "understanding" the input — exactly what
                                    Spec 001/013 forbid. Record what was reported, flag it, do not refuse it for
                                    being unfamiliar.
10. Invalid unit behavior         : a MISSING/empty unit -> row-level REJECTION (unit is required, §item 1); a
                                    present-but-unrecognized unit string -> ACCEPTED (no unit catalog exists in
                                    this slice, §item 3) — the distinction is presence, not correctness.
11. Mixed valid/invalid rows      : `partially-accepted`, mirroring `ingestManualInput`'s existing logic exactly
                                    — faithfully-mapped rows become observations; unmapped rows become
                                    limitations; if ZERO rows are representable, the whole submission is
                                    REJECTED with `"no-faithful-observation"` (the same existing reason).
12. Grouping into observation sets : ONE `ManualInputSubmission` (and thus one `ObservationSet`) per
                                    `(athleteRef, occasion)` — all rows from one artifact/upload sharing a
                                    training session map into ONE set, matching Spec 001's "occasion" grouping
                                    unit and `TrainingSessionRecord`'s 1:1 relationship to a training session.
```

---

## 7. Review/Admission Posture (reaffirmed, unchanged from Spec 044)

```text
candidate rows are not Evidence — a MeasuredObservation never becomes Evidence without detectSignals +
  attachSignalAsEvidence, neither of which this plan touches.
candidate rows are not Signals — Signal detection stays observation's own separate, later step.
candidate rows are admitted/rejected through the EXISTING observation/manual-input boundary — the SAME
  accepted / partially-accepted / rejected outcome ingestManualInput already produces (ManualInputIngestionOutcome).
partial acceptance is allowed and expected for mixed-quality files (§6 item 11).
warnings are preserved — never stripped, never silently resolved (mirrors Spec 001 AC4.2/AC4.5).
```

---

## 8. Options Evaluated (implementation strategy)

| Option | Verdict |
| --- | --- |
| A — no code yet; docs only | **This document itself.** The plan below targets Implementation 044-A1; nothing here is code. |
| **B — pure row-to-ManualInputSubmission mapper + existing (extended) `ingestManualInput`** | **Selected.** `ManualInputSubmission` already represents measured values cleanly via the existing `measured-value` entry kind (§1) — no bypass needed. |
| C — pure row-to-`RawObservationInput` mapper bypassing the manual input adapter | **Not needed.** Per the expected-pressure rule ("use C only if `ManualInputSubmission` cannot represent measured values cleanly") — it can, via `measured-value` (§1/§4). |
| D — filesystem CSV parser + mapper | **Deferred.** First slice takes ALREADY-PARSED row objects (plain `TrainingSummaryRow[]` data) — no file I/O anywhere in this plan. |
| E — dependency-backed CSV parser | **Deferred**, same reasoning as D — zero new dependency in this slice. |
| F — parser creates Signals/Evidence/RenderingRequest directly | **Rejected.** Unchanged from Spec 044 — those stay separate, later, deliberately-gated steps. |

---

## 9. Required Test Plan (for Implementation 044-A1 — not written here)

```text
1. a valid row (recognized-shape metric/value/unit/observedAt) maps into a measured RawObservationInput
2. multiple valid rows in one submission are all accepted into one ObservationSet
3. a row missing a required field (sourceRowId/metric/value/unit/observedAt) is rejected/limited at the row level
4. a row whose value is not a finite number is rejected/limited, never coerced or guessed
5. unknown/unrecognized metric name is accepted with a "suspicious" quality warning (not rejected)
6. missing/empty unit is rejected at the row level (unit required); a present-but-unrecognized unit is accepted
7. a submission with mixed valid/invalid rows returns "partially-accepted" with row-level limitations
8. artifactRef, when present, is preserved inside Provenance.reference — never embedded as content
9. sourceRowId is preserved inside Provenance.reference for every resulting observation
10. deviceLabel, when present, is preserved (advisory) inside Provenance.reference, never a new field/Source value
11. warnings/limitations are preserved in the ingestion outcome and never silently dropped
12. the mapper/adapter creates no Evidence, no EvidenceCase
13. the mapper/adapter creates no Signal, calls no detectSignals
14. the mapper/adapter creates no RenderingRequest
15. the mapper/adapter calls no runOperatorSession, no invokeOperatorSession
16. the mapper/adapter delivers nothing (no delivery channel reference)
17. the mapper/adapter creates no AthleteDecision
18. no file I/O occurs anywhere in the mapper/adapter (structural guard: no fs/node:fs import)
19. no new dependency is imported (structural guard: only shared-kernel + within-module imports)
20. AC20 unchanged — the module allowlist and no-whole-core-import guards stay green
```

---

## 10. Required Acceptance Criteria (Given / When / Then)

```text
Given a valid manual/CSV summary row, when mapped, then it becomes a candidate measured observation using the
  existing MeasuredObservation/Measurement/Provenance/ObservationQuality domain types. ✅ (§4/§5/§6.)
Given a raw artifact ref, when included, then it is preserved as provenance (Provenance.reference), not
  truth. ✅ (§6 item 6.)
Given a parsed metric, when admitted, then it remains Observation material, not Evidence. ✅ (§7.)
Given an unknown metric/unit, when encountered, then the adapter returns a warning (unknown metric, accepted)
  or a rejection (missing unit) according to the selected rule. ✅ (§6 items 9–10.)
Given mixed rows, when ingested, then the result is partially accepted with row-level reasons. ✅ (§6 item 11.)
Given the adapter runs, when complete, then it does not create Signal/EvidenceCase/RenderingRequest. ✅ (§7;
  Option F rejected, §8.)
Given the adapter runs, when complete, then it does not call runOperatorSession or deliver. ✅ (§7; unchanged
  from Spec 044/043I.)
Given no Garmin API boundary is approved, when the adapter is implemented, then no Garmin API code is
  added. ✅ (unchanged from Spec 044.)
Given no FIT/TCX boundary is approved, when implemented, then no FIT/TCX parser is added. ✅ (unchanged from
  Spec 044; Options D/E of Spec 044 remain deferred.)
Given AC20, when implemented, then no production whole-core composer is introduced. ✅ (§4 item 3; this plan
  stays inside `observation/application/`, imports nothing from reasoning/understanding/decision-support.)
```

---

## 11. Required Forbidden Behaviors (this tech spec)

```text
implementation code in this tech spec · new dependencies · package changes · filesystem parser in the first
slice · CSV library · FIT parser · TCX parser · Garmin API integration · automatic Garmin sync ·
Evidence creation · Signal creation · RenderingRequest creation · runOperatorSession · delivery ·
automatic AthleteDecision · live-provider default · API/UI/server · scheduler/worker loop · registry/IaC/deploy ·
new top-level src/modules module · production whole-core composer · reflection-composition · AC20 amendment
```

---

## 12. Relationship to Existing Architecture

- **Spec 001 / Impl 013** — this plan extends, never replaces, the Manual Input Adapter's discipline: faithful
  scribe, never interpreter; reject what cannot be faithfully represented; preserve provenance and quality.
- **Spec 044** — this is its recommended follow-up; it resolves the open path-(a)-vs-(b) question in favor of
  extending `ingestManualInput` (path a), since `ManualInputSubmission` cleanly represents measured values.
- **Spec 002 / 003** — Signal detection and Evidence/Hypothesis lifecycle remain untouched and downstream; this
  plan's output is plain `ObservationSet` material, nothing more.
- **AC20** — unchanged; the plan adds files only inside the existing `observation` module's `application/`
  directory, never a new top-level module, never a cross-core import.

---

## 13. Decision & Next Mission

`[DECISION] Implementation 044-A1 plan: extend the existing Manual Input Adapter's reserved "measured-value"
branch + add a pure TrainingSummaryRow/TrainingRowSubmission -> ManualInputSubmission mapper, both inside
src/modules/observation/application/ — no bypass adapter, no file I/O, no new dependency.`

```text
selected adapter location       : src/modules/observation/application/ — a new file
                                   (training-row-submission.ts, exact name TBD by 044-A1) for the row shape +
                                   pure mapper, plus an edit to the EXISTING manual-input-adapter.ts's
                                   mapEntry() "measured-value" branch (currently a stub).
selected input row shape        : TrainingSummaryRow { sourceRowId, metric, value, unit, observedAt,
                                   deviceLabel?, notes? } grouped by TrainingRowSubmission { submissionRef,
                                   athleteRef, occasion, source, sourceFormat, artifactRef?, submittedAt,
                                   occurredAt, rows } — §5.
selected mapping strategy       : Option B — pure row-to-ManualInputSubmission mapper (measured-value entries)
                                   + the existing (extended) ingestManualInput; Option C (bypass adapter) not
                                   needed.
selected review/admission flow  : unchanged — accepted / partially-accepted / rejected via
                                   ManualInputIngestionOutcome, row-level limitations preserved.
selected unknown metric/unit behavior : unknown metric -> accepted with a "suspicious" quality warning; missing
                                   unit -> rejected at the row level; unrecognized-but-present unit -> accepted.
selected dependency/file IO decision : none — rows are already-parsed plain data handed to the mapper; no fs,
                                   no CSV library, no new dependency in this slice.
```

`[RECOMMENDATION] Next mission: Implementation 044-A1 — Manual/CSV Row-to-ManualInput Mapper.` Scope: the
`TrainingSummaryRow`/`TrainingRowSubmission` types + the pure `trainingRowSubmissionToManualInput` mapper +
implementing `manual-input-adapter.ts`'s `measured-value` branch (parse/validate/build `measuredObservation`) +
the new/extended rejection and limitation catalog entries this requires + the test plan in §9 — types, pure
mapper, validators, tests only. No file I/O, no dependency, no Evidence/Signal/RenderingRequest, no
`runOperatorSession`.

---

## 14. Validation & Invariants at This Tech Spec

`tsc --noEmit` clean; `node --test` **995/995** (unchanged — this tech spec is docs-only). No code/test/package/
lockfile/tsconfig change; no dependency added; no guard weakened; AC20 untouched.
