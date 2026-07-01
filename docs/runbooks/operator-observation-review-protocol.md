# Aurora — Operator Observation Review Protocol

> **Status (2026-07-01).** Operational checklist — **docs-only**, realizing Spec 044-B
> (`docs/specs/044-B-observation-review-admission-ux-boundary.md`, `0522b8d`) Decision: no new review-state or
> record type. This runbook makes the review PROCEDURE explicit using two mechanisms that already exist —
> `ManualInputIngestionOutcome` (Impl 013/044-A1) for technical acceptance, and `ObservationSet.supersede(...)`
> (Spec 001) for correction. It introduces no code, no UI, no API, no CLI. It is a companion to, not a
> replacement for, `docs/specs/044-A-manual-csv-candidate-observation-intake-plan.md` and the executable proof
> at `src/modules/observation/tests/training-row-submission.test.ts`.

---

## 1. Purpose

This runbook tells an operator how to review candidate observations produced from a manual/CSV training-row
submission (Impl 044-A1) — what the ingestion outcome means, how to read warnings, how to correct a mistake,
and — most importantly — what reviewing candidate observations does **not** prove.

## 2. Scope

Covers: reviewing the output of `ingestManualInput` when fed rows via `trainingRowSubmissionToManualInput`
(manual-summary or CSV-summary sourced). Does **not** cover: Garmin/FIT/TCX parsing (not built), an
athlete-facing review surface (deferred, §15), a UI/API/CLI (none exists), or any product delivery.

## 3. Approved reviewer

**Operator, first.** A trusted human reviews the ingestion outcome before treating any candidate observation as
usable input elsewhere (e.g. before a caller composes it into an `OperatorSessionRequestEnvelope` per Spec
043F). Athlete-facing review is explicitly **deferred** (§15) — there is no product surface for an athlete to
review anything today.

## 4. Inputs to review

- The `ManualInputIngestionOutcome` returned by `ingestManualInput` (status, `acceptedCount`, `limitations`,
  and — for accepted/partially-accepted — the resulting `observationSet`).
- Each resulting observation's `provenance` (source, captureTime, recordingTime, reference) and `quality`
  (status + reason).
- The original `TrainingRowSubmission` rows (kept by the operator/caller — not persisted separately by Aurora)
  for cross-checking against the outcome.

## 5. Review outcomes

```text
accepted             = every row that could be faithfully represented was recorded; observationSet exists.
partially-accepted   = some rows were recorded; some rows became limitations (row-level, listed explicitly).
rejected             = nothing was faithfully representable; nothing was persisted; reasons are explicit.
```

## 6. How to interpret accepted / partially-accepted / rejected

- [ ] **`accepted` means technically admitted into observation material — it does NOT mean truth.** A
      well-formed number with a unit and a label can still describe something wrong, mistyped, or
      physiologically implausible. Aurora records what was reported; it does not verify it happened.
- [ ] **`partially-accepted` means some rows were recorded and some were not** — read `limitations` for exactly
      which rows failed and why (`missing-unit`, `unparseable-numeric-value`, `ambiguous-field`, …). The
      accepted rows are still only technically admitted, not verified true.
- [ ] **`rejected` means nothing was recorded** — no `ObservationSet` was created or persisted, and nothing
      downstream (Signal/Evidence/anything) can reference it, because it does not exist.

## 7. How to review warnings

- [ ] Read `outcome.limitations` (partially-accepted) for row-level reasons an entry could not be faithfully
      represented.
- [ ] Read each resulting observation's `quality.status`/`quality.reason` — `"complete"` means the metric name
      was recognized; `"suspicious"` means it was not (§8) — neither is a judgment on whether the *value* is
      correct.
- [ ] Never discard or "clean up" a warning before acting on it — a limitation or a `"suspicious"` quality flag
      is the signal that this row needs a closer look, not an inconvenience to suppress.

## 8. How to handle unknown metrics

- [ ] An unrecognized metric name (per Impl 044-A1) is **accepted**, not rejected — Aurora owns no canonical
      metric catalog, so an unfamiliar-but-well-formed name is still faithfully recorded, flagged with
      `quality.status: "suspicious"` and a reason (`"unrecognized metric name"`).
- [ ] Operator action: check the metric name for a typo or an unconventional label; if it is legitimate, no
      further action is required — the observation stands, flagged for downstream awareness.

## 9. How to handle missing units / invalid values

- [ ] A row with a **missing/empty unit** is a row-level limitation (`"missing-unit"`) — that row is **not**
      recorded; the rest of the submission may still be accepted/partially-accepted.
- [ ] A row with a **non-numeric or non-finite value** is a row-level limitation (`"unparseable-numeric-value"`)
      — that row is **not** recorded.
- [ ] A **present-but-unrecognized unit** (e.g. an unusual or nonstandard string) **is accepted** — Impl 044-A1
      performs no unit-catalog/conversion validation in this slice; presence, not correctness, is what's
      checked.
- [ ] Operator action: for a missing-unit or unparseable-value limitation, go back to the source row, find or
      correct the missing/malformed field, and resubmit that row (§11) — never invent a value to force
      acceptance.

## 10. How to preserve provenance

- [ ] Provenance already travels automatically — do not attempt to "clean" or shorten
      `observation.provenance.reference`; it already carries the submission reference, the row reference
      (`row:<sourceRowId>`), the observed time, and — when present — the device label and artifact reference.
- [ ] When cross-referencing a reviewed observation back to its source file/row, use
      `provenance.reference` — it is the durable link back to *where this came from*, not an interpretation of
      what it means.

## 11. How to correct an admitted observation using `ObservationSet.supersede(...)`

- [ ] **Never overwrite** the raw source row or the artifact reference — the original stays exactly as
      submitted.
- [ ] **Never mutate** the already-persisted observation — Aurora's domain forbids in-place edits.
- [ ] To correct a value: build a new, correct observation (through the same
      `trainingRowSubmissionToManualInput` → `ingestManualInput` path, or directly via the domain constructors),
      then call `observationSet.supersede(originalId, replacement, reason, at)`:
      - `originalId` — the id of the observation being corrected.
      - `replacement` — the new, corrected `Observation` (still just an `Observation` — never `Evidence`).
      - `reason` — a plain-language operator note explaining the correction (e.g. `"transcription error —
        source row read 24.0, not 240"`). This is the durable "correction note."
      - `at` — the correction's own timestamp (injected, never `Date.now()`).
- [ ] The **original observation remains in `observationSet.observations`** (full history) — only
      `observationSet.active()` excludes it going forward. Nothing is deleted.
- [ ] The replacement is still an `Observation`, never `Evidence`, `Signal`, or anything else — supersession
      changes *which observation is active*, not *what kind of thing an observation is*.
- [ ] Supersession creates **no** `Signal`, **no** `EvidenceCase`, **no** `RenderingRequest`, and **no**
      `AthleteDecision` — it is a pure, domain-level correction of the observation record, nothing more.

## 12. How to reject without creating downstream objects

- [ ] A rejection (ingestion-time, §6) or a row-level limitation (§9) requires **no further action** to "clean
      up" — nothing was created, so nothing needs to be un-created.
- [ ] Do **not** manually construct a `Signal`, `EvidenceCase`, or any downstream object to "represent" a
      rejected row — a rejected row is simply absent from the `ObservationSet`; its absence is itself explicit
      (via the rejection reasons / limitations already reported).

## 13. What review must not trigger

```text
Signal detection · EvidenceCase creation · RenderingRequest creation · runOperatorSession ·
delivery · AthleteDecision · Garmin sync · live-provider call
```

None of these are ever a side effect of reviewing, correcting, or rejecting a candidate observation. Every one
of them remains a separate, explicit, later, caller-or-operator-triggered step outside this protocol.

## 14. What review does not prove

```text
truth · recommendation quality · training causality · athlete decision · delivery success ·
device accuracy · Garmin correctness · Evidence validity · Signal relevance
```

Reviewing and even correcting a candidate observation only ever proves that Aurora faithfully recorded (or
re-recorded) what was reported, with its provenance and quality intact — nothing more.

## 15. Deferred: athlete-facing review

No athlete-facing review surface exists. An athlete does not today see, confirm, or dispute a candidate
observation directly — that requires its own product-surface decision (a UI/API), which has no evidence yet
(Spec 044-B §4 item 15/20). Until then, review stays operator-only.

## 16. Deferred: post-hoc retraction gap

Aurora has no mechanism to purely **retract** an already-admitted observation without replacing it with a
corrected value — `supersede(...)` always requires a `replacement`. If an operator determines a row should
never have counted at all (not merely have the wrong value), there is currently no domain-level "ignore this"
act; this gap is acknowledged (Spec 044-B §4 item 6) and explicitly **not** resolved by this runbook or by any
code — it requires its own future evidence-based decision. Until then, operators should treat this as a known
limitation and document such cases outside Aurora (e.g. in their own operator notes) rather than inventing a
workaround.

## 17. Checklist

```text
[ ] Read the ManualInputIngestionOutcome status (accepted / partially-accepted / rejected).
[ ] For partially-accepted, read every limitation and match it to its row.
[ ] For each resulting observation, read quality.status/quality.reason.
[ ] Treat "accepted" and "complete" quality as technical admission only — never as truth.
[ ] For an unrecognized ("suspicious") metric, check for a typo; otherwise no action needed.
[ ] For a missing-unit / unparseable-value limitation, fix the source row and resubmit — never invent a value.
[ ] Use provenance.reference to trace any observation back to its source row/file, never to "clean" it.
[ ] To correct a value, build a replacement Observation and call ObservationSet.supersede(...) with a
    plain-language reason — never overwrite, never mutate in place.
[ ] Confirm the original observation is still present in .observations (history) after a supersession.
[ ] Confirm review triggered no Signal/EvidenceCase/RenderingRequest/runOperatorSession/delivery/
    AthleteDecision.
[ ] Remember: review proves faithful recording, never truth, recommendation quality, or athlete decision.
```

---

## Distinctions (keep legible)

```text
technical acceptance ≠ truth · operator review ≠ athlete decision · Observation ≠ Evidence ·
Observation ≠ Signal · Signal ≠ Evidence · Evidence ≠ recommendation · correction ≠ overwrite ·
supersession ≠ AthleteDecision · manual/CSV row ≠ proof · raw artifact ≠ truth ·
review protocol ≠ product UI · Aurora advises; the athlete decides · Aurora never presents inference as fact
```
