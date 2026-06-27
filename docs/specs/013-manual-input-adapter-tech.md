# Tech Spec 013A — Manual Input Adapter — Implementation Plan

> The TS-strict plan for Spec 013: an **`observation`-owned** application adapter that turns a `ManualInputSubmission` into a `ManualInputIngestionOutcome` (`accepted`/`partially-accepted`/`rejected`) by **building the existing `RawObservationInput`s**, calling **`recordObservationSet`**, and persisting via **`ObservationSetRepository`** — **without** importing `event-recording` or any downstream module, **without** detecting a `Signal`, and **without** inferring meaning.
>
> Technical Specification. **No code in this slice.** Implementation begins only from the approved plan as Implementation 013.

| Field | Value |
|---|---|
| **Status** | Technical Spec · *Accepted pending review* |
| **Phase** | Technical Specification (no code; no UI/API/LLM) |
| **Implements** | [Spec 013](./013-manual-input-adapter.md) |
| **Builds on** | Spec/Impl 001 (intake) · 002 (Signal boundary) · 009 (athlete-decision) · 010 (repositories) · 011 (event records) · 012 (reprojection harness) |
| **Produces (plan for)** | `observation/application/manual-input-*` (adapter + submission + outcome + closed catalogs) + adapter/negative tests + a neutral cross-module event-recording integration test |
| **Explicitly excludes** | UI/forms, API/endpoints, auth, LLM extraction, FIT/wearable import, DB/schema, Signal detection, Evidence/Hypothesis/Understanding/DecisionSupport, recommendations, `AthleteDecisionRecord` mutation, event bus, scheduler |

[ASSUMPTION] This is **Technical Specification phase**, not Implementation. It fixes TS-strict shapes, the adapter location, the mapping rules, the closed catalogs, and the test contract so Implementation 013 contains **no open design or domain decisions** — only typing and wiring against existing `observation` surfaces.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture/implementation. |
| **[DECISION]** | A technical commitment for this slice. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open; does not block. |

Principal **[DECISION]**s use **Decision · Why · Consequence · Risk · Reversal Point**.

---

## 1. Central Question

[FACT] *How can Aurora implement a manual input adapter that faithfully records manually supplied input as `ObservationSet`s without interpreting it as meaning or triggering reasoning?*

[FACT] The answer in code: an **`observation/application` boundary** that validates and **meaning-neutrally normalizes** a submission, **maps clear reports into the existing observation forms**, calls the existing **`recordObservationSet`** coordinator, and **persists through `ObservationSetRepository`** — returning an outcome. It imports **only `observation` + `shared-kernel`**; the optional `ObservationSetRecorded` append is composed **outside** `observation` in a neutral harness.

---

## 2. Surface Gap Analysis (read from current code)

[FACT] Verified against the repository so the plan reuses real shapes and invents nothing.

| # | Surface | Found in code | How 013 uses it |
|---|---|---|---|
| 1 | **Intake coordinator** | `observation`: `recordObservationSet({ id?, occasion, expected?, observations: RawObservationInput[] }) → ObservationSet` | The **only** construction path the adapter uses — it never builds an `ObservationSet` directly. |
| 2 | **Raw observation union** | `RawObservationInput = ({kind:"measured"} & MeasuredObservationInput) \| ({kind:"subjective"} & SubjectiveObservationInput) \| ({kind:"missing-data"} & MissingDataObservationInput)` | The adapter maps each faithful entry to one of these. |
| 3 | **Subjective input** | `SubjectiveObservationInput { id?; provenance: Provenance\|ProvenanceInput; quality: ObservationQuality; words: string; inquiryRef? }` (constructor **requires non-empty verbatim `words`**) | Subjective/context/athlete-decision reports map here; **`words` preserved verbatim**. |
| 4 | **Missing-data input** | `MissingDataObservationInput { id?; provenance; quality; expected: string }` (requires non-empty `expected`) | Missing/unknown fields map here — **explicit, never invented**. |
| 5 | **Measured input** | `MeasuredObservationInput { id?; provenance; quality; measurement: Measurement }` | **Reserved** this slice (Decision 5) — measured entries are not yet mapped (no unit interpretation); they become a limitation/rejection. |
| 6 | **Provenance / source** | `Provenance/ProvenanceInput { source: Source; captureTime: Timestamp; recordingTime: Timestamp; reference: string }`; `Source` includes **`"manual"`** | The adapter builds `ProvenanceInput` with `source: "manual"`, `captureTime` = reported occurrence time, `recordingTime` = `submittedAt`, `reference` = submission reference. |
| 7 | **Quality** | `ObservationQuality { status; reason }`; `ObservationQualityStatus = complete\|partial\|missing\|inconsistent\|corrupted\|suspicious\|stale\|source-conflicted\|context-missing`; `observationQuality(status, reason)`, `qualityComplete()` | **Reused directly** for per-observation quality (Decision 6) — **no parallel quality value object**. |
| 8 | **Repository port** | `ObservationSetRepository { save; findById; exists }` + `InMemoryObservationSetRepository` | Accepted/partial outcomes persist via `save`; no bypass, no DB. |
| 9 | **Event** | `event-recording`: `ObservationSetRecorded` (module `observation`, category `occurrence`, primary kind `ObservationSet`, `requiredRefKinds: []`) | Built **only** in the neutral harness from the outcome's ref data — ref-only, inert. |
| 10 | **Observation exports** | `recordObservationSet`, `RawObservationInput`, `RecordObservationSetInput`, `detectSignals`, `ObservationSetRepository`, `InMemoryObservationSetRepository`, `* from domain` (incl. `subjectiveObservation`/`missingDataObservation`/`observationQuality`/`provenance`) | The adapter is **added** to this surface; it never touches `detectSignals`. |
| 11 | **No-signal-from-intake proof** | observation tests assert intake builds no `Signal`/`Evidence`; `observation` imports only `shared-kernel` | The adapter must keep both true (negative + boundary tests). |

[DECISION] **No gap blocks the slice, and no existing module behavior changes** — the adapter is additive glue around `recordObservationSet` + the repository. Names above are authoritative; Implementation 013 must not rename them.

---

## 3. Key Architectural Decisions

### Decision 1 — The core adapter lives in `observation/application`
[DECISION] Implement the adapter under `src/modules/observation/application/` (`manual-input-adapter.ts`, `manual-input-submission.ts`, `manual-input-ingestion-outcome.ts`), exported from `observation/index.ts`.
- **Why:** the adapter's **only domain output is an `ObservationSet`**; `observation` owns intake invariants and the repository; reusing `recordObservationSet` keeps the adapter from duplicating or weakening them; `observation` stays the first domain boundary.
- **Consequence:** the adapter is an **observation application boundary**, not UI/API/infrastructure; it imports **no downstream module**.
- **Risk:** the adapter could drift toward interpretation/reasoning.
- **Mitigation:** strict negative tests — no `Signal`/`Evidence`/`Hypothesis`/`Understanding`/`DecisionSupport` import or output; the adapter never calls `detectSignals`.
- **Reversal Point:** if adapters multiply, extract a future ingestion boundary while keeping `ObservationSet` as the domain entry point.

### Decision 2 — Event-recording is composed outside `observation` (never imported)
[DECISION] **`observation` does not import `event-recording`.** The adapter returns enough **ref data** (an `eventCandidate`) for a **neutral harness** to append an `ObservationSetRecorded`; the integration is proven in `src/modules/__tests__/manual-input-event-recording.test.ts`.
- **Why:** Impl 011 made `event-recording` dependency-neutral; domain modules must not depend on the log; events are occurrence history, not commands.
- **Consequence:** the adapter is event-recording-agnostic; the optional append is harness-composed, ref-only, inert.
- **Risk:** none material. **Reversal Point:** a production application layer (later) composes the same way, behind unchanged contracts.

### Decision 3 — No `athlete`-module writes in this slice
[DECISION] A manually-reported athlete decision is recorded as a **`SubjectiveObservation`** (with optional relation refs), or limited/rejected if ambiguous. The adapter **does not** create or mutate `AthleteDecisionRecord`.
- **Why:** this adapter is a boundary **into `observation`**; creating athlete decisions belongs to the athlete-decision slice (Impl 009) or a future workflow.
- **Consequence:** `athlete` is **not imported**; no compliance/outcome grading is possible here.
- **Reversal Point:** a future workflow may route a decision report to `AthleteDecisionRecord` behind its own boundary.

### Decision 4 — Persistence only through the repository port
[DECISION] Accepted/partially-accepted outcomes persist via **`ObservationSetRepository.save`**; no direct state writes, no `toState()` use by the adapter, no DB/schema.
- **Why:** the repository owns the persistence boundary (Impl 010); the adapter must not bypass aggregate construction.

### Decision 5 — Meaning-neutral normalization only; measured entries reserved
[DECISION] Normalization is **mechanical**: timestamp parsing, explicit-and-safe unit handling, trimming/structuring while preserving raw form, mapping known field names. **No** semantic interpretation, causal inference, or readiness/fatigue/impact/capacity labels. **`measured-value` entries are reserved** this slice (no `Measurement` mapping yet) — a measured entry yields an `unsupported-field-ignored` limitation (partial-accept) or `unsupported-entry-kind` rejection if it is the only entry.
- **Why:** measured values need explicit unit semantics that risk interpretation; defer until a real measured ingestion is specified.
- **Reversal Point:** add measured mapping when explicit value+unit+time handling is specified (no inference).

### Decision 6 — Reuse `ObservationQuality`; no parallel quality value object
[DECISION] Per-observation quality is the existing `ObservationQuality` (`observationQuality(status, reason)`). `ManualInputQuality` (the *outcome-level* summary, §5.5 of the spec) is a **thin label derived from** the observations' statuses — not a new value object stored on observations.
- **Why:** Spec 013 §5.5 says quality describes the *input* and must map onto existing quality; inventing a parallel type would split the contract.

---

## 4. Proposed Layout

[DECISION]
```text
src/modules/observation/
  application/
    manual-input-submission.ts       # ManualInputSubmission + ManualInputEntry (closed union)
    manual-input-ingestion-outcome.ts# Outcome union + Rejection/Limitation/Quality closed catalogs
    manual-input-adapter.ts          # ingestManualInput(...)
  tests/
    manual-input-adapter.test.ts             # UC1-UC10
    manual-input-adapter-negative-capability.test.ts  # negative + boundary guards
src/modules/__tests__/
  manual-input-event-recording.test.ts       # neutral integration: ObservationSetRecorded (ref-only)
```

[DECISION] **Must not create:** `src/modules/manual-input/`, `src/modules/ingestion/`, `src/adapters/`, `src/api/`, `src/ui/`, `src/infrastructure/`. The adapter is exported additively from `observation/index.ts`.

[FACT] TS-strict house rules: no constructor parameter properties; explicit fields; `import type`; `.ts` extensions; `Object.freeze` on returned values; conditional spreads for `exactOptionalPropertyTypes`; no `Date.now()` (timestamps passed in).

---

## 5. Types (TS-strict shapes)

### 5.1 Submission + entries (`manual-input-submission.ts`)
```ts
import type { Timestamp } from "../../../shared-kernel/time.ts";
import type { Source } from "../../../shared-kernel/provenance.ts";

export type ManualInputEntry =
  | { readonly kind: "subjective-report"; readonly words: string; readonly fieldLabel?: string }
  | { readonly kind: "context-note"; readonly words: string; readonly fieldLabel?: string }
  | { readonly kind: "athlete-decision-report"; readonly words: string;
      readonly decisionSupportCaseRef?: string; readonly athleteDecisionRef?: string }
  | { readonly kind: "missing-data"; readonly expected: string; readonly reason?: string }
  | { readonly kind: "measured-value"; readonly label: string; readonly rawValue: string; readonly unit?: string }; // reserved

export interface ManualInputSubmission {
  readonly submissionRef: string;          // external reference / id of this submission
  readonly athleteRef: string;             // subject (required)
  readonly submittedAt: Timestamp;
  readonly occurredAt: Timestamp;          // reported occurrence time
  readonly occasion: string;               // session label / context (the ObservationSet occasion)
  readonly reporter: Source;               // who/what reported (athlete-report/coach-report/manual/...)
  readonly entries: readonly ManualInputEntry[];
  readonly expected?: readonly string[];   // expected-but-maybe-missing fields for the occasion
  readonly purposeVersionRef?: string;     // optional relation refs (carried, not interpreted)
  readonly decisionSupportCaseRef?: string;
  readonly athleteDecisionRef?: string;
}
```
[DECISION] The submission carries **no interpreted-meaning field** (no readiness/fatigue/impact). Implemented entry kinds: **`subjective-report`, `context-note`, `athlete-decision-report`, `missing-data`**; **`measured-value` is reserved** (Decision 5).

### 5.2 Outcome + closed catalogs (`manual-input-ingestion-outcome.ts`)
```ts
import type { ObservationSet } from "../domain/index.ts";
import type { ObservationSetId } from "../../../shared-kernel/ids.ts";
import type { ObservationQualityStatus } from "../domain/index.ts";

export type ManualInputRejectionReason =
  | "missing-athlete-ref" | "missing-occurrence-time" | "invalid-timestamp"
  | "unsupported-entry-kind" | "ambiguous-unrepresentable" | "no-faithful-observation"
  | "malformed-provenance" | "inference-smuggled-as-fact" | "empty-submission";

export type ManualInputLimitation =
  | "missing-duration" | "missing-intensity" | "ambiguous-field" | "source-limited"
  | "partial-report" | "unverified-self-report" | "unsupported-field-ignored";

/** Outcome-level summary, derived from the recorded observations' quality. Not stored on observations. */
export type ManualInputQuality =
  | "complete" | "partial" | "ambiguous" | "conflicting" | "low-confidence" | "unverified" | "source-limited";

/** A ref-only hint enabling a neutral harness to append ObservationSetRecorded. The adapter builds NO event. */
export interface ObservationSetRecordedCandidate {
  readonly type: "ObservationSetRecorded";
  readonly observationSetId: ObservationSetId;
  readonly occasion: string;
}

export type ManualInputIngestionOutcome =
  | {
      readonly status: "accepted" | "partially-accepted";
      readonly observationSet: ObservationSet;
      readonly observationSetId: ObservationSetId;
      readonly acceptedCount: number;
      readonly quality: ManualInputQuality;
      readonly limitations: readonly ManualInputLimitation[];
      readonly eventCandidate: ObservationSetRecordedCandidate;
    }
  | {
      readonly status: "rejected";
      readonly reasons: readonly ManualInputRejectionReason[];
      // no observationSet, no save, no eventCandidate
    };

export const MANUAL_INPUT_REJECTION_REASONS: readonly ManualInputRejectionReason[] = [/* …all… */];
export const MANUAL_INPUT_LIMITATIONS: readonly ManualInputLimitation[] = [/* …all… */];
export const MANUAL_INPUT_QUALITIES: readonly ManualInputQuality[] = [/* …all… */];

/** Map the outcome-level summary onto the existing per-observation quality status. */
export function observationQualityStatusFor(quality: ManualInputQuality): ObservationQualityStatus;
```
[DECISION] `partially-accepted` requires `limitations.length ≥ 1` and `acceptedCount ≥ 1`; `accepted` has `limitations.length === 0`; `rejected` persists nothing and carries `reasons.length ≥ 1`.

### 5.3 Adapter (`manual-input-adapter.ts`)
```ts
import { recordObservationSet } from "./record-observation-set.ts";
import type { ObservationSetRepository } from "./observation-set-repository.ts";
import type { ManualInputSubmission } from "./manual-input-submission.ts";
import type { ManualInputIngestionOutcome } from "./manual-input-ingestion-outcome.ts";

export interface IngestManualInputInput {
  readonly submission: ManualInputSubmission;
  readonly observationSetRepository: ObservationSetRepository;
}

export function ingestManualInput(input: IngestManualInputInput): ManualInputIngestionOutcome;
```
[DECISION] Imports **only** `observation` (domain + application) + `shared-kernel`. **No** `event-recording`/`reasoning`/`understanding`/`decision-support`/`athlete`. The only effect beyond pure computation is `observationSetRepository.save(...)` on accept/partial.

---

## 6. Adapter Behavior (`ingestManualInput`)

[DECISION] Steps:
1. **Validate** the submission. Reject (with reasons; nothing saved) on: no `athleteRef` (`missing-athlete-ref`); no/invalid `occurredAt` (`missing-occurrence-time`/`invalid-timestamp`); `submittedAt < occurredAt` is allowed (a report after the fact) but an **impossible** timestamp (`invalid-timestamp`); empty `entries` (`empty-submission`); any entry asserting an inferred state as a measured fact (`inference-smuggled-as-fact`).
2. **Map** each entry to a `RawObservationInput` (§7), collecting **limitations** for entries that cannot be faithfully mapped (e.g. reserved `measured-value` → `unsupported-field-ignored`; ambiguous → `ambiguous-field`).
3. If **no** entry produced a faithful observation → **`rejected`** (`no-faithful-observation`); save nothing.
4. **Record** via `recordObservationSet({ occasion, expected, observations })`.
5. **Persist** via `observationSetRepository.save(set)`.
6. **Return** `accepted` (no limitations) or `partially-accepted` (≥1 limitation), with the set, id, `acceptedCount`, derived `quality`, `limitations`, and the ref-only `eventCandidate`.

[DECISION] **No downstream calls**: no `detectSignals`, no reasoning/understanding/decision-support, no event append, no reprojection. The adapter is pure except the single repository `save`.

---

## 7. Mapping Rules (entry → observation form)

[DECISION]
- **`subjective-report` / `context-note`** → `subjective` `RawObservationInput`: **verbatim `words`** preserved; `provenance` (`source: "manual"`, `captureTime: occurredAt`, `recordingTime: submittedAt`, `reference: submissionRef`); `quality` via `observationQuality(...)`. **Never** summarized; **never** labeled fatigue/readiness.
- **`missing-data`** → `missing-data` `RawObservationInput`: `expected` = the missing field; optional `reason`; provenance/source/quality preserved. **No value invented.**
- **`athlete-decision-report`** → a `subjective` observation (verbatim `words` = the reported choice), carrying the optional relation refs **as provenance reference context only**. **No** `AthleteDecisionRecord` write, **no** compliance/outcome grading (Decision 3).
- **`measured-value`** (reserved) → **not mapped** this slice: contributes an `unsupported-field-ignored` limitation (partial-accept) or, if it is the only entry, `unsupported-entry-kind` rejection.

[FACT] Every produced observation carries provenance + quality (the constructors require them); the adapter therefore **cannot** create a meaning-bearing or provenance-less observation.

---

## 8. Event-Recording Rule

[DECISION] `observation` **does not import `event-recording`.** The adapter returns an `eventCandidate` (`{ type: "ObservationSetRecorded", observationSetId, occasion }`). The neutral test (`src/modules/__tests__/manual-input-event-recording.test.ts`) builds the actual `DomainEventRecord` from that candidate (primary `ObservationSet` ref; ref-only payload), appends it to a `DomainEventRecordLog`/repository, and asserts it is **ref-only and inert** (no downstream command, no `Signal`, no reprojection side effect).

---

## 9. Persistence Rules

[DECISION] Accepted/partial: **save through `ObservationSetRepository`** only; no bypass of aggregate construction; no raw-state write; no `toState()` by the adapter; no DB/schema/infrastructure. Rejected: **save nothing, append nothing**, return explicit reasons.

---

## 10. Negative Capability

[DECISION] The implementation makes these structurally impossible or test-failing: the adapter creates a `Signal`/`Evidence`/`Hypothesis`; updates `UnderstandingProfile`; creates a `DecisionSupportCase`/`TerminalOutput`/recommendation; infers fatigue/readiness/impact/capacity; overwrites `Purpose`; mutates `AthleteDecisionRecord`; scores compliance; validates support correctness; summarizes subjective words; invents missing values; imports `reasoning`/`understanding`/`decision-support`/`athlete`; `observation` imports `event-recording`; uses LLM/API/UI/DB/event-bus/scheduler. Enforced by TS-strict types + the §11 tests.

---

## 11. Validation Strategy (tests before implementation)

[ASSUMPTION] Negative + boundary tests are **defining**. Mapped to Spec 013 UC1–UC10:

1. valid subjective manual input creates an `ObservationSet` (UC1).
2. raw subjective `words` preserved verbatim (UC5).
3. provenance/source/quality preserved; **source is `manual`** (UC1).
4. missing data represented explicitly (UC2).
5. partial acceptance records only faithful entries + reports limitations (UC3).
6. ambiguous/unrepresentable pieces become limitations, not inferences (UC3/UC6).
7. unrepresentable input is **rejected** and **saves nothing** (UC4).
8. persistence goes through `ObservationSetRepository` (UC9).
9. accepted input creates **no** `Signal`/`Evidence`/`Hypothesis`/`Understanding`/`DecisionSupport` (UC10).
10. athlete-reported exhaustion → subjective report, **no** fatigue/readiness/impact field (UC6).
11. athlete-decision report → observation/context only; **no** `AthleteDecisionRecord` mutation, **no** compliance score (UC7).
12. optional `ObservationSetRecorded` via the neutral harness is **ref-only and inert** (UC8).
13. **no `Purpose` overwrite**; **no `UnderstandingProfile` create/mutate**.

**Negative / structural:**
- `observation` production code **does not import `event-recording`** (or any downstream module) — including the new adapter (structural guard);
- the adapter file imports no `reasoning`/`understanding`/`decision-support`/`athlete`;
- **no** UI/API/LLM/DB/event-bus/scheduler file or token; **no** `src/modules/{manual-input,ingestion}` / `src/{adapters,api,ui,infrastructure}`;
- closed catalogs hold exactly the specified values;
- **all 295 Impl 001–012 tests continue to pass.**

---

## 12. Boundary Rules

[DECISION]
- `observation/application/manual-input-*` imports **only** `observation` domain/application + `shared-kernel`.
- It **must not** import `reasoning`/`understanding`/`decision-support`/`athlete`/`event-recording`.
- **Neutral cross-module tests** (`__tests__/`) may compose `observation` + `event-recording`.
- **No production adapter outside `observation`** this slice; **no** UI/API/LLM/infrastructure layer.

---

## 13. Relationship To Existing Architecture

[FACT] Builds on, without altering: **Impl 001** (the adapter uses ObservationSet intake, not a parallel path), **Impl 002** (Signal detection stays separate — `detectSignals` never called), **Impl 009** (decision reports are not compliance scores), **Impl 010** (accepted sets persist through the port), **Impl 011** (event records are optional, ref-only occurrence records, never commands — composed outside `observation`), **Impl 012** (reprojection is never an ingestion side effect).

---

## 14. Open Questions (do not block implementation)

[QUESTION] exact future UI/API payload shape; authentication/source identity; richer measured-value/unit handling; duplicate-submission detection; whether a future ingestion module is needed; whether decision reports route to `AthleteDecisionRecord` via a separate workflow; whether LLM extraction is ever allowed behind a separate boundary; privacy/deletion; timezone strategy.

[ASSUMPTION] None block Implementation 013: the adapter records faithful `ObservationSet`s (or rejects) regardless of how these resolve.

---

## 15. Implementation Task Preview

**Implementation 013 — Add an `observation`-owned Manual Input Adapter.**

[DECISION] Scope: create the `observation/application/manual-input-*` files per §4–§9, the tests (§11), and the neutral event-recording integration test. **Additive only** — no existing module behavior changes; the adapter is exported from `observation/index.ts`.

**Acceptance criteria:**
- `ingestManualInput({ submission, observationSetRepository })` returns `accepted`/`partially-accepted`/`rejected`;
- accepted/partial build observations via `recordObservationSet`, persist via `ObservationSetRepository`, preserve verbatim subjective `words`, provenance (`source: "manual"`), and quality, and represent missing data explicitly;
- partial reports limitations for what was not faithfully recorded; ambiguity is a limitation or rejection, never an inference;
- rejected saves nothing and appends nothing, with explicit reasons;
- **no** `Signal`/`Evidence`/`Hypothesis`/`Understanding`/`DecisionSupport`/recommendation/projection side effect; **no** inferred fatigue/readiness/impact/capacity; **no** `Purpose` overwrite; **no** `AthleteDecisionRecord` mutation; **no** compliance/outcome scoring; **no** summarization of subjective words; **no** invented values;
- `observation` does **not** import `event-recording`; the optional `ObservationSetRecorded` is composed in a neutral harness, ref-only and inert;
- **all 295 existing tests stay green**; the new tests pass.

**The implementation must explicitly create none of:** UI · API · LLM · external integration · Signal detection · Evidence/Hypothesis/Understanding/DecisionSupport · event bus · scheduler · production DB · `AthleteDecisionRecord` mutation · an `event-recording` import from `observation`.

---

## 16. Technical Constraints

[FACT] TypeScript strict; Node native test runner (`node:test` + `node:assert/strict`); **no** external test framework/framework/DB/event-bus/LLM. **No constructor parameter properties.** `import type` where appropriate. Explicit fields; `Object.freeze` on returned values. **No** arbitrary payload bags. **No** raw field-bag rehydration without validation. **No** `Date.now()` (timestamps passed in). The adapter is pure except the single repository `save`.

---

## 17. Success Criterion

> After this tech spec, Implementation 013 can be built **without** deciding UI/API/LLM/infrastructure or domain questions in code.

[ASSUMPTION] Answerable: the plan fixes every shape (`ManualInputSubmission`/`Entry`/`IngestionOutcome` + closed rejection/limitation/quality catalogs), the adapter location (`observation/application`), the mapping rules (entry → existing observation forms, verbatim words, explicit missing data, reserved measured), the persistence path (`ObservationSetRepository`), the event-recording composition (outside `observation`, neutral harness, ref-only), the boundary, and the test contract — all satisfiable **in-process**, reusing existing surfaces and modifying no module behavior. The future implementation answers Spec 013's question: **"Can Aurora accept manually supplied input as faithful `ObservationSet`s without interpreting it as meaning or triggering reasoning?"** — yes: a faithful scribe in `observation/application`, not an interpreter.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the technical plan for the first real ingestion boundary. It defines an `observation`-owned manual input adapter that records source material faithfully as `ObservationSet`s through `recordObservationSet` + `ObservationSetRepository`; it imports no `event-recording` or downstream module, detects no signal, infers no meaning, and chooses no UI/API/LLM/storage technology. Manual input is source material; the adapter is a scribe.*

*Inputs: [Spec 013](./013-manual-input-adapter.md) · [Spec 001](./001-observation-set-intake.md) · [Spec 002](./002-signal-detection.md) · [Spec 009](./009-athlete-decision-feedback-loop.md) · [Spec 010](./010-persistence-ports-in-memory-repositories.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 012](./012-reprojection-harness.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
