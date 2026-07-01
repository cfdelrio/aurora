# Aurora — Specification 044-B — Observation Review / Admission UX Boundary

> **Status (2026-07-01).** Specification phase, building on Impl 044-A1 (`2a86012`) and its guard hardening
> (`0741ab9`). It is **behavioral / docs-only**: it implements no code, adds no UI, no API/server, no CLI, no
> dependency, no package/test change, adds no delivery, no live-provider default, no Garmin parser/integration,
> no scheduler/worker loop, creates no `Evidence`/`Signal`/`RenderingRequest` directly, calls no
> `runOperatorSession` automatically, creates no `AthleteDecision` automatically, introduces no production
> whole-core composer, and amends no AC20. Base: `tsc --noEmit` clean; `node --test` **1019/1019**. It decides
> the approved boundary for reviewing/admitting candidate observations produced from manual/CSV rows.

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation. It decides a boundary
and routes the build to a next slice. No review-record type, no runbook, no UI, no code is created here.

---

## 1. Context

`[FACT]` Impl 044-A1 (`2a86012`) added the `measured-value` mapping path: a manual/CSV
`TrainingSummaryRow`/`TrainingRowSubmission` maps into the existing `ManualInputSubmission` shape, and
`ingestManualInput` (Impl 013) validates/maps it into candidate `MeasuredObservation`s inside an
`ObservationSet` — returning `accepted` / `partially-accepted` / `rejected` (`ManualInputIngestionOutcome`),
with row-level `limitations` (`missing-unit`, `unparseable-numeric-value`, `ambiguous-field`, …) and a per-
observation `ObservationQuality` (`complete` for a recognized metric name, `suspicious` for an unrecognized
one). None of this creates `Signal`/`Evidence`/`RenderingRequest`/`AthleteDecision`.

`[FACT]` Nothing beyond this exists yet: **once an observation is `accepted`, it is already persisted** — there
is no later, separate, human "I looked at this and confirm/correct/reject it" act. Ingestion-time technical
validation and admission into the `ObservationSet` are, today, the same event.

`[GAP]` No boundary yet answers: how does a human (operator or, later, athlete) *review* what a candidate
observation actually says, distinguish "this is well-formed" from "this is right," and correct or flag it —
without any of that review being mistaken for `Evidence`, a `Signal`, or truth?

---

## 2. Central Question

> How are candidate observations reviewed/admitted by an operator or athlete without treating technical
> acceptance as truth, Evidence, Signal, recommendation, or AthleteDecision?

```text
candidate observation ≠ truth · technical validation ≠ truth · technical acceptance ≠ Evidence ·
Observation ≠ Signal · Signal ≠ Evidence · Evidence ≠ recommendation ·
review admitted ≠ recommendation quality · operator review ≠ athlete decision ·
athlete confirmation ≠ automatic AthleteDecision unless explicitly declared · raw artifact ≠ truth ·
parsed metric ≠ Evidence · TrainingSessionRecord ≠ Evidence · manual/CSV row ≠ proof ·
ObservationSet ≠ whole-core reflection · review surface ≠ product UI · review state ≠ delivery ·
Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 3. Required inputs consulted

```text
docs/specs/044-training-artifact-intake-boundary.md
docs/specs/044-A-manual-csv-candidate-observation-intake-plan.md
src/modules/observation/application/manual-input-adapter.ts
src/modules/observation/application/training-row-submission.ts
src/modules/observation/domain/observation.ts
src/modules/observation/domain/observation-set.ts   (SupersessionRecord / supersede())
src/modules/observation/domain/observation-quality.ts
src/modules/observation/index.ts
docs/specs/001-observation-set-intake.md   (matches "001-observation-set-intake-and-provenance")
docs/specs/002-signal-detection.md
docs/specs/003-hypothesis-lifecycle.md   (matches "003-hypothesis-lifecycle-and-evidencecase")
docs/specs/035-external-renderable-assembly-contract-boundary.md
docs/specs/043F-operator-session-input-contract.md
```

`[FACT]` A decisive finding: `ObservationSet` already has `supersede(originalId, replacement, reason, at):
ObservationSet` — the *original observation remains in history*, a `SupersessionRecord { originalId,
replacementId, reason, at }` is appended, and nothing is ever mutated in place (Spec 001 AC5.1–AC5.4). This
mechanism, built for Spec 001's "a later correction arrives," is **exactly** what Decision 4's "correct
value/unit/metric manually / preserve original row as provenance / append correction note / never overwrite
raw artifact" requirements ask for — it does not need to be invented.

---

## 4. Required Analysis

```text
 1. What 044-A1 now produces          : candidate MeasuredObservations from manual/CSV rows, folded into an
                                        ObservationSet via the same accepted/partially-accepted/rejected outcome
                                        Impl 013 already used; row-level limitations and per-observation
                                        ObservationQuality (complete/suspicious) travel with every result.
 2. What accepted/partially-accepted/rejected currently means : TECHNICAL/STRUCTURAL admission only — whether
                                        the input could be FAITHFULLY REPRESENTED as an Observation (well-formed
                                        number, present unit, non-empty label) — never a judgment that the
                                        recorded value is correct, plausible, or meaningful.
 3. Does accepted mean true           : NO. A row can be technically well-formed (a valid number + unit + label)
                                        while describing something erroneous or implausible (e.g. "heart-rate:
                                        999 bpm") — the adapter has no opinion on this. This is the central
                                        distinction this spec exists to keep legible at the human-review layer.
 4. Does reviewed mean admitted into ObservationSet : TODAY, YES — ingestion-time technical validation and
                                        admission are the SAME event; there is no later, separate review step.
                                        Whether Aurora needs one is exactly what this spec decides (§6).
 5. Are operator review and athlete review the same : NO. Operator review is technical/transcription-level
                                        ("did I record this correctly?"); athlete review is experiential/
                                        ownership-level ("does this reflect what happened to me?") — mirroring
                                        the existing operator-mediation-vs-athlete-decision-ownership split
                                        already established (Specs 037/038/043).
 6. Do candidate observations need a separate review state : NOT a new one on the Observation itself. Two of
                                        the three needed capabilities already exist in the domain: (a) technical
                                        quality is `ObservationQuality` (already present, already travels); (b)
                                        correction is `ObservationSet.supersede()` (already present, already
                                        preserves history). The one genuinely MISSING capability is: retracting/
                                        invalidating an already-admitted observation without replacing it with a
                                        corrected value (a pure "ignore this" act) — Spec 001 has no such
                                        concept (only supersession = replace, and quality flags attached at
                                        construction). This gap is real and is explicitly NOT resolved here
                                        (§4 item 20 / §10).
 7. Can review be represented as existing quality/provenance metadata : PARTIALLY. `ObservationQuality`
                                        already surfaces a machine-detected trust signal (e.g. "suspicious" for
                                        an unrecognized metric name) at INGESTION time. A human's later "I
                                        looked at this and agree" is a DIFFERENT, higher-trust signal that must
                                        not be conflated with the machine's structural flag — collapsing them
                                        would blur "candidate observation ≠ truth" into "operator eyeballed it,
                                        so now it's truth," which this spec explicitly forbids (§2).
 8. Should review outcome be a domain event, record, or just the ingestion result : for THIS FIRST SLICE, the
                                        EXISTING ingestion result (`ManualInputIngestionOutcome`) is sufficient
                                        for the technical layer, and `SupersessionRecord` is sufficient for the
                                        correction layer — no new domain event or record type (§6 Decision 3).
 9-14. Can review trigger Signal/EvidenceCase/RenderingRequest/runOperatorSession/delivery/AthleteDecision : NO
                                        to all six, unchanged from every prior spec in this arc (§8).
15. Is UI/API required now            : NO — no product-surface evidence exists (the same Spec 031/032 "runtime
                                        fit" gate this entire arc has consistently found unmet).
16. Is a review runbook or test harness sufficient first : YES. A docs-only runbook (mirroring Spec 038's
                                        operator runbook and Docs 043-I1's manual-host runbook) makes the review
                                        PROCEDURE explicit; Impl 044-A1's own test suite
                                        (`training-row-submission.test.ts`) already IS the executable proof that
                                        limitations/quality/provenance travel correctly — no new harness needed.
17. Is operator-mediated review enough for the first product loop : YES — consistent with the manual, offline,
                                        operator-mediated model this entire arc has maintained (Specs 038/042/
                                        043/043I).
18. How row-level warnings/provenance are preserved after review : unchanged — they ALREADY travel
                                        (`ObservationQuality`, `Provenance.reference` folding in
                                        `sourceRowRef`/`artifactRef`/`deviceLabel` per Impl 044-A1). A runbook
                                        need only instruct the operator to actually READ `limitations` /
                                        `quality.reason` / `provenance.reference` before treating output as
                                        usable — no new field is required to "preserve" what already persists.
19. How corrections/rejections are represented : CORRECTION → the operator (or a future athlete-facing flow)
                                        submits a NEW row/entry with the corrected value through the SAME
                                        pipeline, and the resulting observation SUPERSEDES the original via the
                                        EXISTING `ObservationSet.supersede()` — the correction reason IS the
                                        `SupersessionRecord.reason`; the original stays retrievable
                                        ("never overwrite"). INGESTION-TIME REJECTION is unchanged (a limitation/
                                        rejection reason, nothing persisted). POST-HOC RETRACTION (ignore an
                                        already-admitted observation without replacing it) remains an open gap
                                        (§4 item 6/20) — not resolved by this spec.
20. What evidence is missing before building a UI : the same gap this whole arc has repeatedly found: no named
                                        product runtime surface, no identified remote/sessionful user, no
                                        demonstrated review-volume/scale problem a runbook + existing test
                                        harness cannot handle. Additionally, specific to review: no evidence yet
                                        that post-hoc retraction (§4 item 6) is actually needed in practice —
                                        real usage of the runbook is the evidence that would surface it.
```

---

## 5. Options Evaluated

| Option | Verdict |
| --- | --- |
| **A — no new review boundary; existing manual input outcome is enough** | **Selected, combined with B.** For the TECHNICAL layer, `ManualInputIngestionOutcome` + `ObservationQuality` already carry everything needed (§4 items 2/6/8). |
| **B — docs/runbook-only operator review protocol** | **Selected, combined with A.** A runbook is still needed to make the review PROCEDURE explicit (how to read limitations, when/how to correct via supersession) — "no new type" (A) does not mean "no guidance" (B). |
| C — in-src review/admission record type + pure validator, no UI/API | **Deferred, not rejected.** Expected-pressure confirmed: cautious, since `ManualInputIngestionOutcome` + `SupersessionRecord` already carry enough state for the first slice. Worth revisiting only if real runbook use demonstrates a repeated need (e.g. for post-hoc retraction, §4 item 6). |
| D — test harness for review/admission flow only | **Already satisfied.** Impl 044-A1's own test suite already demonstrates accepted/partially-accepted/rejected + limitation/quality/provenance preservation — the runbook (B) references it rather than duplicating it, exactly as Spec 038's runbook references its own test proof. |
| E — build a review UI | **Rejected.** No product-surface evidence (§4 item 15/20). |
| F — build an API endpoint | **Rejected.** Same reasoning as E. |
| G — review automatically triggers Signal/Evidence/RenderingRequest | **Rejected.** Unchanged from every prior spec — review is a human act, not an automation trigger. |
| H — review automatically triggers runOperatorSession | **Rejected.** Session execution stays manual/operator-triggered (Spec 043I Decision 2); review is not a trigger. |
| I — review creates AthleteDecision | **Rejected.** `AthleteDecision` stays athlete-declared/reported only (Impl 037-A), never a side effect of review. |

---

## 6. Required Decision Areas

### `[DECISION]` Decision 1 — Review state → **no new state; existing outcomes are sufficient**
`accepted` / `partially-accepted` / `rejected` (technical layer) + `ObservationQuality.status`
(`complete`/`suspicious`/…) remain the full state model for this slice. No `pending-review` /
`operator-admitted` / `operator-rejected` / `athlete-confirmed` / `athlete-corrected` field or type is added.
The one acknowledged gap — a pure post-hoc "retract without replacing" act — is named but explicitly **not**
built here (§4 item 6/20); it requires its own future evidence-based decision.

### `[DECISION]` Decision 2 — Reviewer → **operator, first**
Expected pressure confirmed: the first review is operator-mediated (matching every prior operator-mediated
slice in this arc). Athlete-facing confirmation is explicitly a **later, separate, deferred** product-surface
decision requiring its own evidence (no UI/API exists to present anything to an athlete today).

### `[DECISION]` Decision 3 — Review output → **existing `ManualInputIngestionOutcome` + existing `SupersessionRecord`**
No new output type. The technical layer's output stays `ManualInputIngestionOutcome` (unchanged, Impl 013/
044-A1); a correction's output stays a `SupersessionRecord` produced by `ObservationSet.supersede()`
(unchanged, Spec 001). An operator's free-text note, if any, is already representable via the EXISTING
`context-note` `ManualInputEntry` kind — no new "operator note" type is needed.

### `[DECISION]` Decision 4 — Correction/rejection → **supersession for correction; unchanged ingestion-time rejection**
```text
reject a row (ingestion-time)  -> unchanged: a limitation/rejection reason, nothing persisted (Impl 013/044-A1).
correct a value/unit/metric    -> the operator submits a NEW row/entry with the corrected value through the
                                   SAME pipeline; the resulting observation calls the EXISTING
                                   ObservationSet.supersede(originalId, replacement, reason, at).
preserve original row          -> automatic — supersede() never deletes; the original stays in .observations
  as provenance                   (full history) even though .active() excludes it going forward.
append correction note         -> the EXISTING SupersessionRecord.reason field carries it verbatim.
never overwrite raw artifact   -> unchanged; TrainingArtifactObjectStore's opaque bytes are never touched by
                                   any review/correction/supersession act.
```

### `[DECISION]` Decision 5 — Automation → **none**
Expected pressure confirmed: review triggers **no** automatic Signal detection, EvidenceCase creation,
RenderingRequest creation, `runOperatorSession`, delivery, or `AthleteDecision`. Every one of those remains a
separate, explicit, later, caller-or-operator-triggered step — unchanged from every prior spec in this arc.

### `[DECISION]` Decision 6 — Surface → **docs/runbook only, backed by the existing test harness**
Expected pressure confirmed: no CLI, no API, no UI. The surface is a docs-only runbook (the recommended next
mission, §10) that documents the review procedure and points to Impl 044-A1's existing test suite as its
executable proof — exactly the pattern Spec 038 and Docs 043-I1 already established for this codebase.

---

## 7. Required Acceptance Criteria (Given / When / Then)

```text
Given candidate observations from manual/CSV rows, when reviewed, then review must preserve provenance and
  warnings. ✅ (§4 item 18 — unchanged, already true of ObservationQuality/Provenance.)
Given a row is technically accepted, when reported, then it must not be presented as truth. ✅ (§4 item 3;
  central distinction, §2.)
Given an observation is admitted, when later reasoning uses it, then it remains Observation, not Evidence. ✅
  (unchanged; Evidence requires detectSignals + attachSignalAsEvidence, neither touched by review.)
Given a row is corrected, when stored, then the original source row remains provenance. ✅ (Decision 4 —
  ObservationSet.supersede() never deletes the original.)
Given a row is rejected, when reported, then no Signal/Evidence/RenderingRequest is created. ✅ (unchanged;
  Option G rejected, §5.)
Given review completes, when no automation boundary is approved, then runOperatorSession is not called. ✅
  (Decision 5; Option H rejected, §5.)
Given no delivery boundary is approved, when review completes, then no delivery occurs. ✅ (unchanged from
  every prior spec in this arc.)
Given no AthleteDecision boundary is approved, when review completes, then no AthleteDecision is created. ✅
  (Decision 5; Option I rejected, §5.)
Given no product UI is selected, when review is specified, then UI/API remain deferred. ✅ (Decision 6; Options
  E/F rejected, §5.)
Given AC20, when review/admission boundary is specified, then no production whole-core composer is
  introduced. ✅ (this spec is docs-only and adds no composer of any kind.)
```

---

## 8. Required Forbidden Behaviors (this spec)

```text
implementation code · UI · API/server · CLI · new dependency · package changes · Garmin parser/integration ·
FIT/TCX parser · automatic Signal creation · automatic EvidenceCase creation · automatic RenderingRequest
creation · automatic runOperatorSession · delivery channel · automatic AthleteDecision · live-provider default ·
scheduler/worker loop · registry/IaC/deploy · production whole-core composer · reflection-composition ·
AC20 amendment
```

---

## 9. Relationship to Existing Architecture

- **Spec 001 / Impl 013 / Impl 044-A1** — this spec adds no new domain concept; it clarifies that
  `ObservationQuality` (technical trust signal) and `ObservationSet.supersede()` (correction mechanism) already
  cover the review boundary's structural needs, and names the one genuine gap (post-hoc retraction) without
  resolving it.
- **Spec 002 / 003** — Signal detection and the Hypothesis/EvidenceCase lifecycle remain untouched and
  downstream; review never triggers either.
- **Spec 035** — `RenderingRequest`/`admitExternalRenderable` stay caller-supplied and unrelated to observation
  review; a reviewed/corrected `ObservationSet` is not, by itself, a renderable.
- **Spec 043F** — the caller-composes/Aurora-validates split extends naturally: a future caller MAY choose to
  incorporate reviewed/corrected observations into a session's manual intake, but that remains the caller's
  choice, never automatic.
- **Spec 037/038** — decision capture (athlete-declared/reported) and the operator runbook precedent are the
  direct models this spec's Decision 2/6 follow.
- **AC20** — unchanged; no composer of any kind is introduced by a docs-only spec.

---

## 10. Decision & Next Mission

`[DECISION] Observation review/admission boundary: Option A+B — no new domain review-state or record type; the
existing accepted/partially-accepted/rejected ingestion outcome (technical layer) plus the existing
ObservationSet.supersede() mechanism (correction layer) are sufficient for this slice. A docs-only operator
review runbook makes the review PROCEDURE explicit, backed by Impl 044-A1's existing test suite as its
executable proof. No UI/API/CLI. Post-hoc retraction of an already-admitted observation is named as a genuine,
unresolved gap, explicitly deferred to a future evidence-based spec.`

```text
selected review state          : none new — existing accepted/partially-accepted/rejected + ObservationQuality.
selected reviewer               : operator, first; athlete-facing review deferred (its own product-surface
                                   decision, no evidence yet).
selected review output          : existing ManualInputIngestionOutcome (technical) + existing
                                   SupersessionRecord (correction) — no new type.
correction/rejection decision   : correction = ObservationSet.supersede() (existing); ingestion-time rejection
                                   unchanged; post-hoc retraction (ignore without replacing) is an open gap,
                                   not resolved here.
automation decision             : none — no automatic Signal/EvidenceCase/RenderingRequest/runOperatorSession/
                                   delivery/AthleteDecision.
surface decision                : docs/runbook only, referencing the existing 044-A1 test harness as proof —
                                   no CLI, no API, no UI.
```

`[RECOMMENDATION] Next mission: Docs 044-B1 — Operator Observation Review Protocol.` A docs-only runbook
(mirroring `docs/runbooks/operator-session-runbook.md` and `docs/runbooks/operator-runtime-manual-private-host.md`)
that walks an operator through: reading `ManualInputIngestionOutcome.limitations` and each observation's
`ObservationQuality`/`Provenance.reference` before treating candidate observations as usable; how to submit a
correction (a new row through the same pipeline, resulting in a `supersede()` call) with a required correction
reason; and the explicit reminder that acceptance is never truth. No code, no new type, no UI/API is
recommended — that stays deferred until real runbook use surfaces a demonstrated need (e.g. for post-hoc
retraction), per §4 item 20.

---

## 11. Validation & Invariants at This Spec

`tsc --noEmit` clean; `node --test` **1019/1019** (unchanged — this spec is docs-only). No code/test/package/
lockfile/tsconfig change; no dependency added; no guard weakened; AC20 untouched.
