# Aurora — Specification 044 — Training Artifact Intake Boundary

> **Status (2026-07-01).** Specification phase, building on the stable post-043I checkpoint
> (`docs/implementation-architecture/ROADMAP_STATUS_POST_043I.md`, `d1340b5`). It is **behavioral / docs-only**:
> it implements no code, adds no parser, no Garmin SDK/API integration, no dependency, no package/test change,
> builds no API/UI/server, adds no delivery, no live-provider default, no scheduler/worker loop, no registry/
> IaC/deploy, creates no `AthleteDecision`, introduces no production whole-core composer, and amends no AC20.
> Base: `tsc --noEmit` clean; `node --test` **995/995**. It decides the **approved boundary** for turning a raw
> training artifact into Aurora-safe intake material.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It decides a boundary
and routes the build to a next slice. No parser code, no new type, no Garmin integration is created here.

---

## 1. Context

`[FACT]` Aurora is at a stable checkpoint: the operator-runtime persistence + execution + packaging arc (Specs
043→043I) is complete and paused; the domain kernel (observation → reasoning → understanding → decision-support
→ rendering, behind `invokeOperatorSession`) is complete and governed (Spec 042). Neither arc has yet defined
**how a real training artifact becomes something the observation module can safely accept.**

`[FACT]` Two facts from the operator-runtime layer bound this question tightly:
- `TrainingSessionRawArtifactRef` / `TrainingArtifactObjectStore` (Impl C1/C2/D3) store a raw Garmin/manual
  artifact as **opaque bytes with provenance** — never parsed, never interpreted. This is *storage*, not
  *intake*.
- `operator-runtime`'s own negative-capability guard (`operator-runtime-negative-capability.test.ts` test 8)
  **forbids** it from importing `observation`/`reasoning`/`understanding`/`decision-support` internals directly
  — so any artifact-to-observation transform cannot live inside `operator-runtime`.

`[FACT]` A second, decisive fact from the **observation module itself**: Aurora already has a proven precedent
for exactly this class of boundary — the **Manual Input Adapter** (Impl 013, `ingestManualInput`). It accepts a
`ManualInputSubmission` (a set of `ManualInputEntry` — `subjective-report` / `context-note` /
`athlete-decision-report` / `missing-data` / `measured-value`), validates it, and produces a closed
`accepted` / `partially-accepted` / `rejected` outcome (`ManualInputIngestionOutcome`) that maps faithfully into
an `ObservationSet` — never inferring meaning, never creating a `Signal`/`Evidence`. Its `measured-value` entry
kind is **explicitly reserved and currently ignored inside that one adapter** ("no unit interpretation yet" —
`manual-input-adapter.ts` `mapEntry()`).

`[FACT]` Critically, this reservation is an **adapter-level** limitation, not a domain-model gap: the
`observation` module's core `Observation` union already includes a fully-implemented `MeasuredObservation`
(`kind: "measured"`, carrying `measurement: Measurement { quantity, magnitude, unit }`), constructible today via
`measuredObservation()` and recordable via `recordObservationSet({ observations: RawObservationInput[] })` with
a `{ kind: "measured", ... }` entry. **The domain already knows how to hold a faithful, provenance-bearing,
quality-flagged measured value** — what is missing is a boundary that turns a real file (CSV row, Garmin field)
into that shape. Spec 001 (`001-observation-set-intake.md` §11) explicitly left this open: *"Will Garmin/FIT
parsing be implemented directly or through an adapter? (The model must not preclude an adapter; the choice is
deferred.)"* This spec is that deferred choice.

`[GAP]` Aurora can store a raw artifact opaquely and can accept faithful manual reports, but has **no approved
path** connecting "a real Garmin/CSV export exists" to "a candidate observation the observation module can
review and admit." This spec closes that gap at the **decision** level only.

---

## 2. Central Question

> How does Aurora ingest a real training artifact — Garmin/FIT/TCX/CSV/manual export — without treating it as
> truth, Evidence, recommendation, or `AthleteDecision`?

The central distinctions below must stay legible regardless of the answer:

```text
raw training artifact ≠ truth · Garmin session ≠ truth · FIT/TCX/CSV parse result ≠ Evidence ·
parsed metric ≠ Evidence · TrainingSessionRecord ≠ Evidence · TrainingSessionRawArtifactRef ≠ truth ·
Observation ≠ Signal · Signal ≠ Evidence · Evidence ≠ recommendation · artifact parser ≠ whole-core composer ·
intake adapter ≠ reasoning engine · caller-supplied RenderingRequest ≠ recommendation-quality proof ·
operator runtime output ≠ AthleteDecision · session run ≠ AthleteDecision ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 3. Required inputs consulted

```text
docs/implementation-architecture/ROADMAP_STATUS_POST_043I.md
docs/specs/043-cloud-operator-runtime-training-session-persistence-boundary.md   (matches "043-...-cloud-start-boundary")
docs/specs/043F-operator-session-input-contract.md
docs/specs/043I-non-public-compute-target-boundary.md
src/operator-runtime/application/training-session-record.ts
src/operator-runtime/application/training-artifact-object-store.ts
src/operator-runtime/application/operator-session-request.ts
src/operator-runtime/deployment/operator-session-module-runner.ts
fixtures/operator-runtime/reference-caller-module.mjs
src/modules/observation/index.ts
src/modules/observation/domain/observation.ts (Observation / MeasuredObservation / Measurement)
src/modules/observation/application/manual-input-adapter.ts
src/modules/observation/application/manual-input-ingestion-outcome.ts
src/modules/observation/application/manual-input-submission.ts
src/modules/observation/application/record-observation-set.ts (RawObservationInput)
src/modules/reasoning/index.ts
src/modules/application-orchestration/application/offline-reflection-runtime.ts (ManualIntakeStep<T>)
docs/specs/001-observation-set-intake.md   (matches "001-observation-set-intake-and-provenance")
docs/specs/002-signal-detection.md
docs/specs/003-hypothesis-lifecycle.md   (matches "003-hypothesis-lifecycle-and-evidencecase")
docs/specs/034R-observation-to-renderable-composition-boundary-ac20-redecision.md
docs/specs/035-external-renderable-assembly-contract-boundary.md
```

`[FACT]` `ManualIntakeStep<TSubmission> = (submission: TSubmission) => ManualReflectionIntakeOutcome` is the
generic seam `application-orchestration` already exposes — it imports **no** observation type (kept generic on
purpose), and the **caller** wires it to the real `ingestManualInput` (see
`operator-session-invocation.test.ts`'s `realIntake()`). This confirms the caller-composes/Aurora-validates
split already established across Specs 043F/043G extends naturally to intake: **the caller, not Aurora's core,
is the one who may eventually parse a file and shape a submission** — Aurora's job is to define what a
faithful, reviewable submission may look like and to validate it structurally, never to parse binary formats
inside its own production module boundary without its own approval.

---

## 4. Required Analysis

```text
 1. What Aurora can already store about a training session : TrainingSessionRecord — operational metadata only
                                   (id, athleteRef, source "garmin"|"manual", optional
                                   TrainingSessionRawArtifactRef, label, capturedAt, recordedAt). No measurements,
                                   no derived meaning (Impl C1/D4A).
 2. What raw artifact storage means today : TrainingArtifactObjectStore stores OPAQUE bytes (`payload: string`)
                                   + descriptive metadata (mediaType/filename/createdAt) via put/get/head. It
                                   never parses, infers, or interprets (Impl C2/043-D3).
 3. What is missing before real training data can influence reflections : NOT a domain-model gap — `Observation`
                                   already includes a fully-implemented `MeasuredObservation` (`measurement:
                                   Measurement { quantity, magnitude, unit }`), constructible via
                                   `measuredObservation()`/`recordObservationSet`. What is missing is a boundary
                                   that turns real file bytes (or an already-structured export like CSV) into
                                   that existing shape — i.e. a FILE-to-domain adapter, analogous to but distinct
                                   from the Manual Input Adapter (Impl 013), whose own `measured-value` entry
                                   kind is separately reserved/ignored (an adapter-level, not domain-level, gap).
 4. Where FIT/TCX/CSV parsing belongs : NOT operator-runtime — its own guard forbids importing
                                   observation/reasoning/understanding/decision-support internals. It belongs
                                   either (a) as a NEW ADAPTER inside the observation module's application layer
                                   (parallel to `manual-input-adapter.ts`, importing only shared-kernel, same as
                                   the existing adapter), or (b) entirely CALLER-SIDE (outside `src`, like the
                                   reference caller module), hand-mapping parsed values into the EXISTING
                                   `ManualInputSubmission` shape using ALREADY-SUPPORTED entry kinds. Reasoning
                                   module is never a candidate — it is downstream of Signal/Evidence, two gates
                                   past raw intake.
 5. Is Garmin API integration in scope : NO. Same conclusion as Spec 043 §4.4: automatic Garmin API integration
                                   adds OAuth/rate-limit/privacy surface unjustified by any current evidence.
 6. Is manual export upload/import in scope : YES — this is the direction Spec 043 already selected ("manual/
                                   exported artifacts first") and exactly what TrainingSessionRawArtifactRef/
                                   TrainingArtifactObjectStore already structurally support.
 7. Is CSV/manual summary a safer first format : YES — text/tabular, human-producible and human-readable, no
                                   binary-format library needed, and maps directly onto the EXISTING
                                   `ManualInputEntry` shape (once `measured-value` is faithfully supported)
                                   rather than requiring an invented new contract.
 8. What provenance must be preserved : maps onto the EXISTING `Provenance { source, captureTime, recordingTime,
                                   reference }` — `reference` carries the source artifact ref (the
                                   `TrainingSessionRawArtifactRef.reference`) plus a parser-version marker;
                                   `source` carries the `"device"` origin (already a `Source` union member — no
                                   new field). Additionally: a time range, `Measurement.unit` for units, a
                                   pointer to the source field/row (never the raw payload embedded in the
                                   observation), and known limitations — see Decision 4 for the full list and
                                   how each maps onto an existing type.
 9. How parse confidence should be represented : as `ObservationQuality { status, reason }` — the SAME field
                                   every `Observation`/`Signal`/`EvidenceCase` already carries — populated via a
                                   closed catalog analogous to the EXISTING `ManualInputQuality`/
                                   `ManualInputLimitation` (complete/partial/ambiguous/conflicting/low-confidence/
                                   unverified/source-limited), mapped through a function analogous to
                                   `observationQualityStatusFor`. Note: `ClaimConfidence`/`ConfidenceLevel` is
                                   reserved for `Hypothesis`-level claims in `reasoning` and must NOT be reused
                                   here — observation-level material carries `quality`, never `confidence`.
10. How device/source uncertainty should be represented : as the EXISTING `Provenance.source` value `"device"`
                                   (no new field) — advisory only, never used to auto-rank trust between sources
                                   (Spec 001 AC4.5: "no source auto-wins").
11. Should parsed data become Observation directly or candidate observations : CANDIDATE observations requiring
                                   review before being treated as part of a faithful `ObservationSet` — exactly
                                   the `accepted` / `partially-accepted` / `rejected` outcome pattern
                                   `ingestManualInput` already uses. Never silently auto-accepted as truth.
12. Should parsed data ever become Evidence directly : NO. `Evidence`/`EvidenceCase` requires the SEPARATE
                                   reasoning-module step (`attachSignalAsEvidence`), which itself requires a
                                   `Signal` (from observation's `detectSignals`) — two deliberate gates past raw
                                   intake that this spec does not touch or shortcut.
13. How an athlete/operator can review parsed observations : through the SAME accepted/partially-accepted/
                                   rejected outcome + limitations catalog an operator already reviews for manual
                                   input today (Spec 038's operator-runbook precedent) — no new review UI/API is
                                   created or implied by this spec.
14. Does ingestion create Signals automatically : NO.
15. Does ingestion create EvidenceCases automatically : NO.
16. Does ingestion create a RenderingRequest automatically : NO — the `RenderingRequest` remains caller-supplied
                                   per Spec 043F; artifact intake never derives one.
17. Can ingestion trigger runOperatorSession automatically : NO — session execution remains a caller-triggered,
                                   manual, one-shot action per Spec 043I; parsing an artifact does not, by
                                   itself, run a session.
18. Does ingestion create AthleteDecision automatically : NO — structurally impossible from this layer, exactly
                                   as it is impossible from every other layer in the current architecture.
19. Does this need new dependencies : NO for CSV/manual-summary parsing (plain text/tabular parsing needs no
                                   library). FIT/TCX binary formats would likely need a dependency eventually —
                                   explicitly out of scope and deferred by this spec (see §5 Options C/D).
20. Does this risk AC20 whole-core composition : NO, provided the adapter stays inside the observation module's
                                   existing "imports only shared-kernel" boundary and produces ONLY
                                   observation-level output (never itself calling `detectSignals`,
                                   `attachSignalAsEvidence`, or any rendering/decision-support function). That
                                   composition risk is exactly what this spec's Decision 6 (no automation)
                                   forecloses.
```

---

## 5. Options Evaluated

| Option | Verdict |
| --- | --- |
| A — no artifact parsing yet; continue with caller-supplied renderables only | **Superseded by this spec's purpose.** Describes today's status quo; this spec exists precisely to decide the boundary A leaves undecided — without implementing anything. |
| **B — manual CSV/summary intake adapter producing candidate observations** | **Selected (decision-level only).** The smallest, dependency-free, precedent-following first format — maps file rows into the ALREADY-EXISTING `MeasuredObservation`/`Measurement` domain shape rather than inventing a new contract. |
| C — TCX export parser adapter | **Deferred.** A reasonable second format once B is proven; XML parsing is more format-complex than CSV and not yet justified. |
| D — FIT export parser adapter | **Deferred, cautious.** Binary format; would very likely require a new dependency (its own future dependency-approval spec, per the D2-R/D3 precedent) and materially more parsing complexity than CSV. |
| E — Garmin API integration | **Rejected/deferred.** No OAuth/rate-limit/privacy/product evidence exists (§4 item 5; unchanged from Spec 043 §4.4). |
| F — artifact parser produces Evidence directly | **Rejected.** Would skip the Signal-detection and reasoning-attachment gates entirely — a direct violation of the observation/reasoning boundary Spec 001/002/003 establish. |
| G — artifact parser produces Signals directly | **Rejected.** Signal detection is `observation`'s own separate, already-existing step (`detectSignals`) with its own contextualization requirements — a raw-artifact adapter does not get to skip it. |
| H — artifact parser produces RenderingRequest/reflection directly | **Rejected.** `RenderingRequest` stays caller-supplied (Spec 043F); an intake adapter is not a rendering composer. |
| I — artifact parser triggers `runOperatorSession` automatically | **Rejected.** Session execution stays manual/operator-triggered (Spec 043I Decision 2); parsing is not a trigger. |
| J — artifact parser becomes a production whole-core composer | **Rejected.** Direct AC20b violation — an intake adapter must never itself own observation+reasoning+rendering+delivery. |

---

## 6. Required Decision Areas

### `[DECISION]` Decision 1 — First supported source → **CSV / manual structured summary**
Expected pressure confirmed: prefer a simple manual/export-based input before Garmin API integration. CSV/manual
summary is selected as the first format — TCX and FIT stay candidate future formats (Options C/D), Garmin API
stays rejected/deferred (Option E) pending its own explicit evidence.

### `[DECISION]` Decision 2 — Output type → **candidate/draft observations via the existing Observation/quality contract**
The intake boundary produces **candidate observations**, expressed through the ALREADY-EXISTING
`RawObservationInput` shape `recordObservationSet` accepts (`{ kind: "measured", measurement: Measurement
{ quantity, magnitude, unit }, provenance: Provenance, quality: ObservationQuality }` — plus `"missing-data"`/
`"subjective"` where applicable) — never inventing a parallel `CandidateObservation` type. The Tech Spec this
routes to (§10) chooses between two equally AC20-safe implementation paths, neither decided here: (a) lift the
`measured-value` reservation inside `ingestManualInput` itself so CSV summaries reuse that one adapter, or (b) a
new sibling adapter (structurally different input, same "faithful scribe" discipline as Impl 013) that maps CSV
rows into `RawObservationInput[]` and calls `recordObservationSet` + `ObservationSetRepository.save` directly.
Either way, the outcome is reviewed through an `accepted` / `partially-accepted` / `rejected` pattern matching
`ManualInputIngestionOutcome`. It explicitly does **not** produce `Evidence`, `Signal`, `RenderingRequest`, or
`AthleteDecision` — those remain separate, later, deliberately-gated steps requiring `detectSignals`/
`attachSignalAsEvidence`/a caller-supplied `RenderingRequest`/an athlete-declared decision, respectively.

### `[DECISION]` Decision 3 — Location → **observation module application/adapter layer**
The boundary belongs inside `src/modules/observation/application/` — beside (or, per path (a) above, inside)
`manual-input-adapter.ts` — a new or extended adapter file (not created by this spec), importing only
shared-kernel, exactly like its precedent. It does **not** belong in `operator-runtime` (guarded against
importing observation internals), does **not** create a new top-level `src/modules` entry (AC20a), and does
**not** touch `reasoning`/`understanding`/`decision-support` (AC20b; "intake adapter ≠ reasoning engine"). A
smaller first slice remains open to the follow-up Tech Spec: the raw CSV-row parsing (text → structured rows)
could stay entirely CALLER-SIDE (outside `src`, as the reference caller module demonstrates for
`RenderingRequest`), with only the final mapping into `RawObservationInput` needing an in-`src` boundary.

### `[DECISION]` Decision 4 — Provenance and confidence → **required fields**
A candidate/draft observation produced from a training artifact must carry the following, each mapped onto an
EXISTING type rather than a new parallel one:

| Required field (conceptual) | Maps onto |
| --- | --- |
| source artifact ref | `Provenance.reference` (carries the `TrainingSessionRawArtifactRef.reference` + a source-field/row pointer) |
| source format | advisory, carried alongside `Provenance.reference` (mirrors `TrainingSessionRawArtifactRef.mediaType`) |
| device/platform label (if known) | `Provenance.source = "device"` (an EXISTING `Source` union member — no new field) |
| parsedAt / parser version | `Provenance.recordingTime` (+ an advisory version marker in `reference`) |
| field-level confidence/warnings | `ObservationQuality { status, reason }` — the SAME field every Observation carries |
| units | `Measurement.unit` (on the existing `MeasuredObservation`) |
| time range | `Provenance.captureTime` (+ an `ObservationSet`-level `timeRange()` once recorded) |
| reference to the source value (never the raw payload embedded) | `Provenance.reference` — never `Measurement`/observation content |
| known limitations | a closed catalog analogous to `ManualInputLimitation` |
| operator review status | the intake outcome's own `accepted`/`partially-accepted`/`rejected` status (Decision 5) — not a field stored on the `Observation` itself |

No new provenance/confidence model is invented; `ClaimConfidence`/`ConfidenceLevel` (reasoning-level, on
`Hypothesis`) is explicitly NOT reused here — observation-level material stays `quality`, never `confidence`.

### `[DECISION]` Decision 5 — Review/admission → **required**
Expected pressure confirmed: **yes.** Parsed candidate observations are admitted/reviewed through the existing
accepted/partially-accepted/rejected pattern — never treated as final truth on arrival. A partial or ambiguous
parse must be representable and visible, never silently dropped or silently upgraded to "complete."

### `[DECISION]` Decision 6 — Automation → **none**
Expected pressure confirmed: ingestion triggers **no** automatic Signal, EvidenceCase, RenderingRequest,
`runOperatorSession`, delivery, or `AthleteDecision`. Every one of those remains a separate, explicit, later,
caller-or-operator-triggered step.

---

## 7. Required Acceptance Criteria (Given / When / Then)

```text
Given a raw training artifact, when stored, then it is provenance, not truth. ✅ (§4 item 2, unchanged
  TrainingArtifactObjectStore behavior.)
Given a parsed metric, when produced, then it is a candidate observation, not Evidence. ✅ (Decision 2.)
Given a candidate observation, when reviewed, then it may be admitted through the observation boundary. ✅
  (Decision 5; the existing accepted/partially-accepted/rejected pattern.)
Given source confidence is low, when parsing succeeds partially, then warnings/provenance must be
  preserved. ✅ (Decision 4; the existing ManualInputLimitation catalog pattern.)
Given a parser exists, when it processes a file, then it must not create Signal/EvidenceCase/RenderingRequest
  directly. ✅ (Decision 2; Options F/G/H rejected, §5.)
Given a training artifact exists, when operator runtime runs, then it must not infer recommendation quality
  from artifact presence. ✅ (central distinction, §2; unchanged operator-runtime behavior.)
Given no Garmin API boundary is approved, when artifact intake is selected, then Garmin API integration
  remains deferred. ✅ (Decision 1; Option E rejected, §5.)
Given no delivery boundary is approved, when intake succeeds, then no delivery occurs. ✅ (unchanged from
  Specs 043/043G/043H/043I; this spec adds nothing to delivery.)
Given no AthleteDecision boundary is approved, when intake succeeds, then no AthleteDecision is created. ✅
  (Decision 6; §4 item 18.)
Given AC20, when intake is implemented, then no production whole-core composer is introduced. ✅ (Decision 3;
  Option J rejected, §5; this spec is docs-only and adds no composer of any kind.)
```

---

## 8. Required Forbidden Behaviors (this spec)

```text
implementation code · new dependencies · package changes · FIT parser implementation · TCX parser
implementation · Garmin API integration · automatic Garmin sync · new top-level src/modules module (unless
explicitly separately approved) · direct Evidence creation · direct Signal creation · direct RenderingRequest
creation · automatic runOperatorSession · delivery channel · automatic AthleteDecision · live-provider default ·
API/UI/server · scheduler/worker loop · registry/IaC/deploy · production whole-core composer ·
reflection-composition · AC20 amendment
```

---

## 9. Relationship to Existing Architecture

- **Spec 001** — `ObservationSet` intake/provenance: this spec answers §11's explicitly deferred question
  ("through an adapter") and stays within Spec 001's invariants (no meaning at intake, no Signal, no Evidence).
- **Impl 013** — the Manual Input Adapter is the direct precedent and intended extension point; this spec does
  not replace it, it fills its already-reserved `measured-value` gap.
- **Spec 002 / 003** — Signal detection and the Hypothesis/EvidenceCase lifecycle remain untouched and
  downstream; this spec's boundary produces nothing they consume directly without the existing `detectSignals`/
  `attachSignalAsEvidence` gates in between.
- **Spec 034R / 035** — whole-core composition stays a test harness (AC20); `RenderingRequest` stays
  caller-supplied (`admitExternalRenderable`); this spec's adapter is never a candidate for either role.
- **Spec 043 / 043F** — the cloud operator runtime's `TrainingSessionRawArtifactRef`/`TrainingArtifactObjectStore`
  (opaque storage) and the caller-factory input contract (`ManualIntakeStep<TSubmission>`, generic and
  observation-free) are exactly the seams this spec's boundary would eventually plug into — via the caller, not
  via new operator-runtime core code.
- **AC20** — unchanged; this spec selects no new top-level module and no whole-core composer.

---

## 10. Decision & Next Mission

`[DECISION] Training artifact intake boundary: Option B — a manual/CSV-summary candidate-observation intake
boundary (decision-level only; no implementation), landing on the existing `RawObservationInput`/
`MeasuredObservation` domain shape (via the Manual Input Adapter, Impl 013, or a sibling adapter — chosen by the
follow-up Tech Spec), producing candidate/draft observations reviewed through the SAME accepted/
partially-accepted/rejected outcome pattern — never Evidence, Signal, RenderingRequest, or AthleteDecision
directly.`

```text
selected first source format   : CSV / manual structured summary (not TCX/FIT/Garmin API).
selected output type           : candidate/draft observations via the existing RawObservationInput/
                                  MeasuredObservation/Provenance/ObservationQuality shape, reviewed through the
                                  same accepted/partially-accepted/rejected outcome pattern as
                                  ingestManualInput — never Evidence/Signal/RenderingRequest/AthleteDecision.
selected boundary location     : observation module application/adapter layer (parallel to Impl 013's
                                  manual-input-adapter.ts) — not operator-runtime, not a new top-level module,
                                  not core reasoning; a caller-side-only first slice remains open to the
                                  follow-up Tech Spec.
review/admission decision      : required — parsed candidate observations must be reviewed/admitted through the
                                  existing accept/partial/reject pattern before use.
automation decision            : none — no automatic Signal/EvidenceCase/RenderingRequest/runOperatorSession/
                                  delivery/AthleteDecision.
Garmin API decision            : rejected/deferred — no OAuth/rate-limit/privacy/product evidence exists.
dependency decision            : none needed for CSV/manual-summary; FIT/TCX (if ever pursued) would need its
                                  own future dependency-approval spec, deferred.
```

`[RECOMMENDATION] Next mission: Tech Spec 044-A — Manual/CSV Candidate Observation Intake Plan.` A technical
spec (still no implementation) that names the exact CSV/summary shape, the exact extension to `ManualInputEntry`
(lifting the `measured-value` reservation with units/confidence/provenance), and the exact adapter file location
— followed only then by `Implementation 044-A1 — Candidate Observation Intake Types & Validator`. TCX parsing
(`Spec 044B`) and Garmin API integration (its own future spec) are **not** recommended now — each requires its
own evidence, per §5's deferrals. Parser implementation of any kind is **not** recommended directly from this
spec, per the mission's explicit constraint.

---

## 11. Validation & Invariants at This Spec

`tsc --noEmit` clean; `node --test` **995/995** (unchanged — this spec is docs-only). No code/test/package/
lockfile/tsconfig/Dockerfile/workflow change; no dependency added; no guard weakened; AC20 untouched.
