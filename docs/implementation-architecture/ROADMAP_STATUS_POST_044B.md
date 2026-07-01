# Aurora — Roadmap Status Checkpoint (post Docs 044-B1)

> **Status (2026-07-01).** Docs-only roadmap checkpoint. **Not a spec.** No code, no technical spec, no
> test/package change, no parser/Garmin/FIT/TCX file, no API/UI/server/scheduler/CI/SDK file, no guard weakened,
> AC20 untouched. It closes the **manual/CSV observation-intake and review arc** (Specs 044 → 044-B, Impl
> 044-A1 + guard hardening, Docs 044-B1) and states, per lane, exactly what evidence is required before
> continuing. Validation at authorship: `tsc --noEmit` clean; `node --test` **1019/1019**. Prior checkpoint:
> `...POST_043I.md`.

---

## 1. The arc just closed

```text
Spec 044 (training artifact intake boundary — Option B, d6e4f36)
  → Tech Spec 044-A (manual/CSV candidate observation intake plan, 57a53f4)
  → Impl 044-A1 (manual/CSV row-to-ManualInput mapper, 2a86012)
  → 044-A1 guard hardening (fit/tcx/garmin/reflection-composition/bare Signal, 0741ab9)
  → Spec 044-B (observation review/admission UX boundary — Option A+B, 0522b8d)
  → Docs 044-B1 (operator observation review protocol, d69ca8d)
```

`[FACT]` This is the **entire evidence-gated arc** the "Aurora needs a boundary to turn real training
artifacts into observations" trigger opened (recommended by the post-043I checkpoint). Every step was gated by
explicit prior approval; every domain extension reused existing types rather than inventing parallel ones
(`RawObservationInput`/`MeasuredObservation`/`Measurement`/`Provenance`/`ObservationQuality`/
`ObservationSet.supersede`); every review/automation boundary was the smallest one the available evidence
supported. **1019/1019**; `tsc --noEmit` clean; AC20 untouched throughout.

---

## 2. Current architectural state

### 2.1 What is now proven
1. **Manual/CSV summary rows can be represented as already-parsed plain data.** `TrainingSummaryRow`/
   `TrainingRowSubmission` (Impl 044-A1) are plain data shapes — no file I/O, no CSV library, no dependency.
2. **`TrainingSummaryRow`/`TrainingRowSubmission` can map into the existing `ManualInputSubmission`.**
   `trainingRowSubmissionToManualInput(...)` is a pure function producing `measured-value`/`context-note`
   entries — no new observation model.
3. **`measured-value` is now a valid `ManualInputEntry` path.** The Manual Input Adapter's (Impl 013) reserved
   branch is implemented — mechanical parse only, no unit conversion, no unit-catalog validation.
4. **Measured rows can become Observation material through existing Manual Input Adapter semantics.** A valid
   row builds a real `MeasuredObservation` via the existing `measuredObservation()`/`Measurement` constructors —
   no bypass adapter, no parallel domain type.
5. **`accepted` / `partially-accepted` / `rejected` outcomes work for row-level intake.** The same
   `ManualInputIngestionOutcome` pattern Impl 013 established now governs measured rows too.
6. **Unknown metrics are accepted with a warning, never treated as truth.** A `RECOGNIZED_METRICS`
   name-recognition aid flags an unfamiliar-but-well-formed metric name as `quality.status: "suspicious"` —
   it is still recorded, never rejected for being unfamiliar, and never silently trusted either.
7. **Invalid values / missing units are rejected at the row level.** `"unparseable-numeric-value"` and
   `"missing-unit"` are new, explicit `ManualInputLimitation` catalog entries — nothing is invented or guessed.
8. **Provenance/context can preserve `artifactRef`/`sourceRowId`/`deviceLabel`/`notes` without becoming
   truth.** All four fold into the existing `Provenance.reference` string (or, for `notes`, a separate
   `context-note` entry) — no new domain field, no content ever embedded as a measurement value.
9. **Operator review can use existing outcomes without a new domain review state.** Spec 044-B found
   `ManualInputIngestionOutcome` + `ObservationQuality` already sufficient for the technical review layer.
10. **Corrections can use `ObservationSet.supersede(...)`, preserving originals.** The Spec-001-era supersession
    mechanism — built for exactly this purpose — needed no extension.
11. **Negative guards prevent parser/Signal/Evidence/RenderingRequest/runtime/delivery/AthleteDecision
    creep.** Both the original Impl 044-A1 negative-capability suite and its hardening pass (fit/tcx/garmin/
    reflection-composition/bare `Signal`, word-boundary-checked to avoid false positives) are green.

### 2.2 What is now usable
```text
manual or CSV-derived rows already parsed by an external/operator process
  -> pure mapping into ManualInputSubmission (trainingRowSubmissionToManualInput)
  -> measured-value observation intake (through the existing, now-extended Manual Input Adapter)
  -> technical admission outcomes (accepted / partially-accepted / rejected, with row-level limitations)
  -> operator review protocol (docs/runbooks/operator-observation-review-protocol.md)
  -> correction via supersession (ObservationSet.supersede(...), never overwrite)
```

`[FACT]` This is explicitly **NOT**:
```text
a CSV parser (rows must already be parsed by the caller/operator before reaching Aurora)
a Garmin parser (no FIT/TCX/Garmin support of any kind exists)
a product UI (no API/UI/CLI — everything here is a library boundary + a docs runbook)
an automated training-analysis pipeline (no Signal/Evidence/RenderingRequest/session is ever automatic)
```

### 2.3 What is intentionally NOT selected
```text
no filesystem CSV parser · no CSV library · no FIT parser · no TCX parser · no Garmin API ·
no automatic Garmin sync · no automatic Signal detection · no automatic EvidenceCase creation ·
no automatic RenderingRequest creation · no automatic runOperatorSession · no delivery ·
no AthleteDecision creation · no athlete-facing review UI · no API/server · no scheduler/worker loop ·
no production whole-core composer
```
Each of these was evaluated at least once across Specs 044/044-A/044-B and explicitly deferred for lack of
evidence — not overlooked.

### 2.4 What remains operator-mediated
- **Row sourcing** — a human (or a caller's own process) turns a real file into `TrainingSummaryRow[]`; Aurora
  never opens, downloads, or parses a file itself.
- **Review** — an operator reads the ingestion outcome, checks limitations/quality warnings, and decides
  whether/how to correct, following `docs/runbooks/operator-observation-review-protocol.md`.
- **Correction** — an operator (not an automated process) builds the replacement observation and supplies the
  supersession reason in plain language.
- **Everything downstream** — Signal detection, Evidence attachment, session execution, delivery, and
  AthleteDecision all remain separate, explicit, later, caller-or-operator-triggered acts, exactly as in the
  operator-runtime deployability arc this one continues.

### 2.5 What must NOT be inferred from the current state
- That "accepted" or "complete quality" means the recorded value is **true** — it means only that Aurora could
  faithfully represent what was reported (Spec 044-B §4 item 3).
- That an unrecognized metric being **accepted** implies Aurora validates or endorses it — the `"suspicious"`
  flag is a name-recognition aid, not a correctness judgment.
- That `ObservationSet.supersede(...)` existing means Aurora can **retract** an observation without replacing
  it — no such mechanism exists (Spec 044-B §4 item 6/§16 of the runbook); this is an acknowledged, open gap.
- That any of the above imply a **CSV/FIT/TCX parser**, a **Garmin integration**, an **athlete-facing
  surface**, an **automatic Signal/Evidence/RenderingRequest/session/delivery/AthleteDecision**, or an **AC20
  amendment** is imminent, implied, or half-decided. None is.

---

## 3. Evidence gates for future work

| Lane | Evidence required before reopening |
| --- | --- |
| **Real CSV/manual data run** | Sample rows, expected metric labels, units, source artifacts, and operator review feedback from an actual (not synthetic) dataset. |
| **Post-hoc retraction** | A real case where an already-admitted observation must be withdrawn without a replacement value. |
| **TCX parser** | Sample TCX exports, a field-mapping decision, a dependency/no-dependency decision, and provenance rules for XML-sourced data. |
| **FIT parser** | Sample FIT files, an approved parser dependency, binary-safety review, and provenance/unit mapping rules for a binary format. |
| **Garmin API** | A product reason, an OAuth/privacy/rate-limit handling plan, and a source-of-truth decision (device vs. manual precedence). |
| **Athlete-facing review** | A product-surface decision (Spec 031/032's still-unmet "runtime fit" criterion) and an athlete consent/confirmation model. |
| **Signal-detection automation** | A separate signal-trigger boundary spec and confidence rules for when detection may run automatically. |
| **EvidenceCase automation** | A separate reasoning-boundary spec and evidence-attachment rules. |
| **RenderingRequest automation** | A separate composition-boundary spec that respects AC20 (no whole-core composer). |
| **`runOperatorSession` automation** | An operator-runtime trigger-boundary spec (still unselected per Spec 043I). |
| **Delivery** | A delivery-boundary spec and a recipient/consent model. |
| **AthleteDecision automation** | Remains **forbidden** unless the athlete-declared/reported decision-capture boundary (Impl 037-A) is itself revisited and changed. |
| **Whole-core composition** | Remains **forbidden by AC20** unless explicitly amended in its own, separate architecture-decision spec (per 034R's standing conclusion). |

---

## 4. Allowed next missions — only if evidence appears

```text
Manual Data Trial 044-C   — Run Real Training Rows Through Intake        (needs: real-data-run evidence, §3)
Spec 044-C                — Post-Hoc Retraction Boundary                 (needs: retraction-case evidence, §3)
Spec 044-D                — TCX Export Parser Boundary                   (needs: TCX-lane evidence, §3)
Spec 044-E                — FIT Export Parser Boundary                   (needs: FIT-lane evidence, §3)
Spec [TBD]                — Garmin API Integration Boundary              (needs: Garmin-lane evidence, §3)
Spec [TBD]                — Athlete-Facing Observation Review Boundary   (needs: athlete-review evidence, §3)
Spec [TBD]                — Observation-to-Signal Trigger Boundary       (needs: Signal-automation evidence, §3)
```

None of these is recommended **now** — each requires its own future evidence, documented in its own spec, per
the gates in §3. Listing them here is not a queue; it is a map of *where* re-entry is legible if and when
evidence appears.

---

## 5. Forbidden next missions without evidence

```text
CSV parser library · FIT parser dependency · TCX parser implementation · Garmin API/OAuth ·
automatic Signal creation · automatic EvidenceCase creation · automatic RenderingRequest ·
automatic runOperatorSession · delivery · AthleteDecision creation · athlete-facing UI/API ·
scheduler/worker loop · production whole-core composer
```

Each requires a **separate spec** with its own evidence (§3) — never a direct implementation jump from this
checkpoint or from any future "seems like the next logical step" instinct.

---

## 6. Central distinctions (carried through the whole arc)

```text
manual/CSV row ≠ truth · parsed metric ≠ Evidence · technical acceptance ≠ truth ·
Observation ≠ Signal · Signal ≠ Evidence · Evidence ≠ recommendation · review ≠ athlete decision ·
correction ≠ overwrite · supersession ≠ AthleteDecision · provenance ≠ proof · artifactRef ≠ truth ·
operator protocol ≠ product UI · Aurora advises; the athlete decides · Aurora never presents inference as fact
```

---

## 7. Recommendation

`[RECOMMENDATION] Pause until real manual/CSV training data, post-hoc retraction evidence, TCX/FIT/Garmin
evidence, or athlete-facing review evidence appears.`

- **Current confirmed state.** The manual/CSV row-to-observation intake chain — row shape → pure mapper →
  extended Manual Input Adapter → technical admission outcome → operator review protocol → correction via
  supersession — is **complete and proven**, reusing existing domain types throughout; no parser, no Garmin
  integration, no automation, no UI/API, no AC20 amendment exists or is implied. **1019/1019**; `tsc --noEmit`
  clean; AC20 intact.
- **Why pause, not another build.** Every remaining lane (§3) is gated on evidence that does not exist in this
  repository today. Building a CSV parser, a Garmin integration, or an athlete-facing surface now — the way
  every prior step in this arc and the operator-runtime deployability arc before it explicitly declined to do —
  would repeat the premature-commitment mistake this whole Engineering Playbook discipline exists to prevent.
- **What is NOT lost by pausing.** The row mapper, the extended adapter, the review protocol, and the
  correction mechanism all keep working exactly as documented. Nothing here decays while idle.
- **What would restart each lane.** See §3 (evidence gates) and §4 (the map of specs each lane would open).
- **What must remain protected during the pause.** AC20 intact (no production whole-core composer, no
  `reflection-composition` revival); no automatic Signal/EvidenceCase/RenderingRequest/`runOperatorSession`/
  delivery/AthleteDecision; the caller-composes/Aurora-validates split (never inverted); technical acceptance
  never conflated with truth; corrections always via supersession, never overwrite.

---

## 8. Validation & invariants at checkpoint

`tsc --noEmit` clean; `node --test` **1019/1019**. AC20 unchanged; no production whole-core composer; no
`reflection-composition` module; no Signal/EvidenceCase/RenderingRequest created automatically; no
`runOperatorSession`/delivery/AthleteDecision triggered by intake or review; no parser (CSV/FIT/TCX) or Garmin
integration of any kind; no package/dependency/runtime/API/UI/CLI/worker/deployment/CI/SDK change. This
checkpoint is docs-only.
