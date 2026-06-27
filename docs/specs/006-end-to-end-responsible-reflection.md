# Spec 006 — First End-to-End Responsible Reflection

> The first time Aurora runs the whole reasoning core as one chain — observation → signal → hypothesis → understanding → decision support — and proves it can reach the end and still choose a modest voice.
>
> The point of the first full path is not that Aurora *can* recommend. It is that Aurora can reason all the way through and **still answer with a Reflection, not a Recommendation**.
>
> Behavioral specification. Not implementation; no changes to existing code.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code) |
| **Slice** | `ObservationSet → Signal → Hypothesis/EvidenceCase → UnderstandingAssessment → DecisionSupportCase → DecisionSupport(Reflection)` |
| **Modules touched** | `observation`, `reasoning`, `understanding`, `decision-support` (all existing; **read-only consumption only**) + a new **orchestration seam** (application service or test harness) |
| **Builds on** | Implementations 001–005 (every module surface already exists and is tested) |
| **Produces (behavior)** | One traceable end-to-end path whose terminal output is `DecisionSupport` with `VoiceMode = Reflection` |
| **Explicitly does not produce** | UI, API, DB, event bus, LLM text, notification, FIT/Garmin parsing, persistence, training-plan change, an owned `AthleteDecision`, or any `Recommendation` |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict orchestration shape — whether the seam is an application service or a test-level harness, the fixture shape, the integration-test layout) follows separately as 006A, mirroring 001A–005A. Implementation does not begin from this document.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/model/implementation. |
| **[DECISION]** | A specification commitment for this slice. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open; does not block. |

---

## 1. Summary & Central Question

[FACT] **Central question:** *Can Aurora run the complete reasoning core end-to-end and produce a responsible Reflection — without collapsing observation into meaning, signal into evidence, evidence into certainty, understanding into authority, or support into decision ownership?*

[FACT] Each module already works and is independently tested (001 intake, 002 signal detection, 003 hypothesis lifecycle, 004 understanding update, 005 decision-support voice). What has **never** been demonstrated is the **full chain wired together**: one ObservationSet flowing forward until Aurora speaks.

[ASSUMPTION] **Guiding sentence:** *The first full path is a proof of restraint, not of capability.* Aurora reaches the speaking edge and chooses the modest, traceable, agency-preserving voice that the gates permit — `Reflection` — and that modesty is the success condition, not a shortfall.

---

## 2. Core Principle

[FACT]
- The first end-to-end slice must **not** prove Aurora can recommend.
- It must prove Aurora can reason through the full chain and **still choose a modest voice**.
- The correct first full output is **`Reflection`**, *not* `Recommendation`.
- Every boundary crossed in 001–005 must **survive** the composition: composing the modules must not create a back door that any single module already forbids.

[ASSUMPTION] **Reflection is not the weak answer. It is the correct answer.** A system that reaches the end of its reasoning and overreaches into advice has failed; a system that reaches the end and speaks within its means has succeeded.

---

## 3. Scope & Non-Scope

### In scope
[DECISION]
- The **first cross-module orchestration path** — one seam that calls each module's existing public surface *in order*, passing each module's output forward as the next module's input.
- One **concrete minimal scenario** (§5) with a defined fixture.
- How **each module contributes** to the chain and what it must *not* be asked to do.
- How **traceability flows across modules** (observation → signal → evidence → hypothesis → and is *verified*, not re-authored, at the decision-support edge).
- How **quality and uncertainty survive** the whole chain (a quality-limited or missing observation does not silently become clean data downstream).
- Why the selected output is **`Reflection`** and why **stronger voices are not allowed** in this scenario.
- How the **athlete's decision remains outside** the case.
- Acceptance criteria and the future validation strategy (§7, §8).

### Non-Scope
[FACT] This spec does **not** cover: UI; API; DB / persistence; event bus; LLM output; final user-facing copy; notification delivery; Garmin/FIT parsing; production persistence; automatic training-plan changes; automatic `AthleteDecision`; `Recommendation` generation; `Warning` generation *unless* risk explicitly requires caution; full `athlete`-module implementation.

[DECISION] **No existing module source is modified.** The slice composes the *existing* public surfaces of `observation`, `reasoning`, `understanding`, and `decision-support`. If the chain reveals a missing surface, that is a finding to record (§11), not a license to edit a completed module inside this slice.

---

## 4. Domain Rules To Preserve Across The Whole Chain (Invariants)

[FACT] The composition must preserve, *simultaneously*, every boundary the individual slices already protect. The five collapses named across the domain model and the Technical Boundary Map are the contract:

1. **Observation is not meaning.** Raw observations enter with provenance and quality; meaning appears only after contextualization + signal detection (002). The orchestrator must not treat a recorded observation as a signal.
2. **Signal is not evidence.** A `Signal` (or `SignalRejection`) is produced by `observation`; it becomes an `EvidenceCase` *only* when attached inside a `Hypothesis` (003). The orchestrator must not skip the hypothesis and attach a signal as evidence directly.
3. **Evidence is not certainty.** A `Hypothesis` carries a defeasible claim state and a falsifier; confidence is never certainty (003). Understanding must not read claim confidence as truth.
4. **Understanding is not authority.** The `UnderstandingProfile` updates only from *tested hypothesis lifecycle outcomes* — never from a raw signal or a raw `EvidenceCase`, and never promoted by repetition alone (004). It yields a per-dimension `SafeVoiceCeiling`, which **is not a `VoiceMode`**.
5. **Support is not decision ownership.** The `DecisionSupportCase` runs gates, selects the maximum *responsible* voice (005), preserves agency, and **never owns the `AthleteDecision`**.
6. **Traceability is verified, not re-authored.** The terminal output must trace back through hypothesis → evidence → signal → observation → ObservationSet. `decision-support` *verifies* the chain that the lower modules already built; it does not invent it.
7. **The dependency direction is unbroken.** The orchestration seam may read all modules, but `observation`, `reasoning`, and `understanding` must still not import `decision-support`; lower modules never learn how they will be used.

[ASSUMPTION] The *defining* composition invariants are **1, 2, 4, 5, 6**: together they make "the orchestrator quietly shortcut the ladder" structurally visible — each forward step consumes only the previous module's legitimate output type, so a skipped rung cannot typecheck or cannot trace.

---

## 5. The Scenario (one concrete minimal path)

[DECISION] **Scenario — "I felt unusually heavy."** An athlete completes a workout-like session. The available inputs are deliberately *thin but real*:

- a **measured** observation (e.g. an elevated heart-rate or load reading for the session),
- a **subjective self-report** ("I felt unusually heavy"),
- **one missing or quality-limited** observation (e.g. a dropped/incomplete data field), so the chain must carry a known gap forward,
- enough **context** to justify detecting *possible* relevance (a Signal, not noise),
- **insufficient understanding** to recommend — the dimension is new/low, so the `SafeVoiceCeiling` is modest.

[DECISION] The end-to-end result of this scenario must be:

| Stage | Required artifact |
|---|---|
| Intake (001) | one `ObservationSet` with the measured + subjective observations, provenance, source, quality, and the missing/limited datum recorded as such |
| Signal detection (002) | **at least one `Signal`** (and the missing/limited datum legitimately surfaces as a `SignalRejection` or a recorded gap — not silently dropped) |
| Reasoning (003) | one **falsifiable `Hypothesis`** with one **`EvidenceCase`** created by attaching the Signal |
| Understanding (004) | one **cautious `UnderstandingAssessment`** — a low/early level with a **modest `SafeVoiceCeiling`** (`tentative` / `qualified`, not `confident`) |
| Decision support (005) | one `DecisionSupportCase`, gates run, terminal output **`DecisionSupport` with `VoiceMode = Reflection`** |

[FACT] The Reflection must **preserve uncertainty** (the visible gap and the modest level travel into the output) and **preserve athlete agency** (no command, no shame, the decision stays the athlete's).

[ASSUMPTION] `purpose` and `risk` enter at placeholder fidelity (a declared-but-thin purpose; low/assessed risk), because no full `athlete` module exists yet (Technical Boundary Map §2). Placeholder context is itself a *reason to stay modest*, not a reason to overreach — consistent with the safety asymmetry (Boundary Map §10: stale/thin context may only push toward caution).

---

## 6. Required Flow (step by step)

[DECISION] The seam calls existing surfaces in order. Each step lists what it **produces** and what it **must preserve**. (Surface names below are the *real* exported names from the module indexes, used illustratively — the technical spec 006A pins the exact call shape.)

### Step 1 — Intake  *(`observation`: `recordObservationSet`)*
Create an `ObservationSet` with the measured observation, the subjective observation, the missing/quality-limited datum, provenance, source, and quality.

**Must preserve:** raw observation is **not** meaning; **no Signal yet**; **no Hypothesis yet**; the quality limitation/gap is recorded, not discarded.

### Step 2 — Contextualization & Signal Detection  *(`observation`: `detectSignals`)*
Contextualize the relevant observations and run detection.

**Produces:** a `Signal` where relevance is justified; a `SignalRejection` (or recorded gap) where it is not.

**Must preserve:** **Signal is not Evidence**; `SignalRejection` is **auditable**; **quality and provenance travel forward** with the signal.

### Step 3 — Hypothesis & EvidenceCase  *(`reasoning`: `openHypothesis`, `attachSignalAsEvidence`)*
Open a falsifiable `Hypothesis`; attach the `Signal` as an `EvidenceCase`.

**Must preserve:** the `EvidenceCase` exists **only inside the `Hypothesis`**; the `Hypothesis` has a **falsifier**; **confidence is not certainty**; **traceability** back to Signal / Observation / ObservationSet is intact.

### Step 4 — Understanding Update  *(`understanding`: `reasoningOutcomeFrom` → `updateUnderstandingFromOutcome` → `produceUnderstandingAssessment`)*
Consume the hypothesis lifecycle outcome; update/produce an `UnderstandingAssessment`.

**Must preserve:** understanding is **dimension-specific**; **claim confidence is not understanding level**; **no promotion from repetition alone**; the **`SafeVoiceCeiling` stays modest** for this scenario.

### Step 5 — DecisionSupportCase  *(`decision-support`: open → `evaluate`)*
Open a `DecisionSupportCase` from a `DecisionOpportunity`; run the gates; select the terminal output.

**Expected result:** `DecisionSupport` with `VoiceMode = Reflection`.

**Must preserve:** **`Recommendation` is denied**; a stronger voice is **degraded** with a **recorded reason**; **agency is preserved**; **`AthleteDecision` is not owned**.

[FACT] If, in any run, the scenario lacks enough context for even a Reflection, the legitimate terminal outputs `Inquiry` (only the athlete holds the missing input) or `Withholding` (speaking would be irresponsible) are **valid, not failures** (005 §5.3). The scenario is *designed* to reach Reflection, but the chain must not be forced past a gate to get there.

---

## 7. Why Reflection Is The Correct Output

[FACT] Reflection — not Recommendation — is correct here because:

1. **Understanding is not yet Trusted/Mature.** A single chain produces an early, low-level, dimension-specific assessment; its `SafeVoiceCeiling` is modest by construction (004).
2. **Traceability may be complete, but the ceiling still governs.** Even a fully traceable chain cannot lift the voice above what understanding permits — strong evidence does not buy strong voice (005, invariant: voice is gated, not derived).
3. **Purpose/risk context is placeholder-level.** Thin purpose and assessed-low risk constrain, not enable; placeholder context is a reason for modesty.
4. **One chain is not enough for strong advice.** A first observation-to-claim pass is exactly the situation where reflecting what is known — without directing action — is the responsible voice.
5. **Restraint is the product's core value.** Aurora reflects what it can responsibly say and leaves the action to the athlete.

[ASSUMPTION] **This is not a failure mode. It is the first proof of restraint** — the whole point of the slice.

---

## 8. Acceptance Criteria

[DECISION] Given/When/Then; these become the integration + negative test suite (§9). Negative criteria are **defining**.

- **AC1 — Intake preserves, does not interpret.** *Given* a workout-like `ObservationSet`, *when* the flow starts, *then* observations are preserved with provenance and quality and **no meaning** (no Signal, no Hypothesis yet).
- **AC2 — Detection produces signals, not evidence.** *Given* contextualized observations, *when* signal detection runs, *then* `Signal`(s) and/or `SignalRejection`(s) are produced and **no `EvidenceCase` exists yet**.
- **AC3 — Evidence lives only inside a hypothesis.** *Given* a `Signal`, *when* reasoning attaches it, *then* an `EvidenceCase` is created **inside a falsifiable `Hypothesis`** (never standalone).
- **AC4 — Understanding is dimension-specific and earned.** *Given* the hypothesis lifecycle outcome, *when* understanding updates, *then* only a **dimension-specific `UnderstandingAssessment`** is produced, with a **modest `SafeVoiceCeiling`**.
- **AC5 — The ceiling denies Recommendation.** *Given* a modest `SafeVoiceCeiling`, *when* the `DecisionSupportCase` evaluates gates, *then* **`Recommendation` is not selected**.
- **AC6 — End-to-end traceability survives.** *Given* the produced Reflection, *when* it is inspected, *then* it traces **back through hypothesis → evidence → signal → observation → `ObservationSet`**.
- **AC7 — Thin context constrains voice.** *Given* placeholder purpose/risk context, *when* a stronger voice is considered, *then* the voice is **degraded or constrained**, with the reason recorded.
- **AC8 — Quality/uncertainty survives the chain.** *Given* the missing/quality-limited observation at intake, *when* the terminal output is produced, *then* the **uncertainty is still visible** (not silently cleaned).
- **AC9 — Agency preserved, decision not owned.** *Given* the terminal output, *when* inspected, *then* it contains **no command, no shame, no certainty claim, and no owned `AthleteDecision`**.
- **AC10 — No regression of module boundaries.** *Given* the full chain, *when* the suite runs, *then* **all 001–005 boundary tests still pass** (`observation`/`reasoning`/`understanding` ⇏ `decision-support`).
- **AC11 — No new layers.** *Given* this slice, *when* implemented, *then* it creates **no UI, API, DB, event bus, LLM output, or production integration**.

---

## 9. Explicit Forbidden Behaviors

[FACT] The implementation of this spec must **not**:

- produce a **`Recommendation`** in the first end-to-end slice;
- treat **`Reflection` as weak or failed** output;
- **skip the Signal** and attach an `Observation` directly to a `Hypothesis`;
- create an **`EvidenceCase` without a `Hypothesis`**;
- update the **`UnderstandingProfile` from a raw Signal or raw `EvidenceCase`** (only from lifecycle outcomes);
- choose **`VoiceMode` from claim confidence**;
- **exceed the `SafeVoiceCeiling`**;
- **hide degradation reasons**;
- **hide uncertainty** (the intake gap must remain visible at the edge);
- create an **`AthleteDecision`**;
- use **generated text as domain truth**;
- add **UI/API/DB** to make the demo feel complete.

[DECISION] These are **testable negative requirements** (§10).

---

## 10. Validation Strategy

[ASSUMPTION] Tests to the acceptance criteria; **the negative and boundary tests are the defining tests.**

**Positive / integration:**
- **one end-to-end integration test** that runs the scenario fixture through all four modules and asserts the terminal output is `DecisionSupport` with `VoiceMode = Reflection`;
- a test proving **traceability from the terminal output back to the `ObservationSet`**;
- a test proving the **quality limitation survives** the whole chain (uncertainty visible at the edge);
- a test proving the chain produces **at least one `Signal`, one `Hypothesis`, one `EvidenceCase`, one `UnderstandingAssessment`, one `DecisionSupportCase`**.

**Negative (must prove absence):**
- **`Recommendation` is not selected** for this scenario (modest ceiling caps it);
- a **stronger voice is degraded** with a recorded reason when considered;
- the **`AthleteDecision` is not owned** by the case;
- **no `EvidenceCase` exists before a `Hypothesis`**, and **no understanding update from a raw signal/evidence**;
- **no UI/API/DB/LLM** layer is introduced by the slice.

**Dependency-boundary (re-run, must still pass):**
- `observation`, `reasoning`, `understanding` **⇏** `decision-support` over the import graph;
- **all existing tests from Implementations 001–005 continue to pass** (no regression).

[ASSUMPTION] If the integration test cannot reach `Reflection` *through the real surfaces* without editing a completed module or skipping a rung, the composition is wrong — that failure is the signal, not an inconvenience to route around.

---

## 11. Relationship To Implementation 005

[FACT] This slice **builds on, and does not change,** Implementation 005:
- `DecisionSupportCase` is the **final gate** of the chain.
- `VoiceSelectionPolicy` **chooses `Reflection`** because the modest `SafeVoiceCeiling` caps the voice and no gate permits more.
- `SafeVoiceCeiling` (from `understanding`) **constrains** voice; it is consumed, never set, here.
- `TraceabilityVerification` must **pass or constrain** the output — it verifies the chain the lower modules built.
- The `AgencyGate` must **pass** — the Reflection preserves the decision.
- **`Withholding` and `Inquiry` remain valid alternatives** if the scenario, as run, lacks enough context.

[DECISION] No edits to 001–005 source. The orchestration seam imports the four module surfaces **read-only**. Whether the seam is a first **application service** or a **test harness** is deferred to 006A (§12).

---

## 12. Open Questions (do not block this spec)

[QUESTION] Carried forward; resolved only if 006A requires it.

- Exact **scenario fixture shape** (concrete observation values, the precise quality-limited field).
- Whether orchestration lives in an **application service** or a **test helper first** (006A decides; the behavioral contract holds either way).
- Whether **purpose/risk placeholders** should become richer in the next slice (likely tied to a future `athlete`-module spec).
- How to **render `Reflection` later** without making UI copy domain truth.
- How to **persist the chain** later.
- How the **`AthleteDecision` feedback loop** enters later (Spec 009).
- Whether the first real-world data source is **Garmin/FIT, manual entry, or synthetic fixture** (this slice uses a synthetic fixture).

[ASSUMPTION] None block the behavioral contract: Aurora can run the full chain and choose a modest, traceable, agency-preserving Reflection regardless of how the above resolve.

---

## 13. Success Criterion

> **"Can Aurora run the full reasoning core and still choose a modest, traceable, agency-preserving Reflection instead of overreaching into advice?"**

[ASSUMPTION] Answerable from this spec: a single synthetic `ObservationSet` (measured + subjective + a recorded gap) flows forward — detection yields a `Signal` (not evidence), reasoning attaches it as an `EvidenceCase` inside a falsifiable `Hypothesis` (not certainty), the lifecycle outcome earns a **dimension-specific, low-level `UnderstandingAssessment`** with a **modest `SafeVoiceCeiling`** (not authority), and a `DecisionSupportCase` runs its gates and selects **`DecisionSupport` with `VoiceMode = Reflection`** (not a `Recommendation`, not an owned decision). The output **traces back to the `ObservationSet`**, the intake **uncertainty is still visible**, **agency is preserved**, and **every 001–005 boundary test still passes**. The first full path proves restraint: Aurora reaches the end of its reasoning and speaks within its means.

---

## Known Risks

[ASSUMPTION]
- **Risk:** the orchestrator "just computes" a recommendation across modules (Boundary Map §12 #9 carrying #5/#6/#7). **Defense:** the seam only *coordinates* — every verdict, level, and voice is produced inside its owning module; a negative test proves `Recommendation` is not selected.
- **Risk:** a rung is skipped to make the demo flow (signal→hypothesis bypass; understanding from raw evidence). **Defense:** each step consumes only the previous module's legitimate output; AC2/AC3/AC4 + negative tests make a skipped rung visible.
- **Risk:** the intake gap is silently cleaned, so uncertainty disappears by the edge. **Defense:** AC8 + a test that the quality limitation survives to the terminal output.
- **Risk:** `Reflection` is read as a weak/failed result and someone "fixes" it toward Recommendation. **Defense:** §2/§7 make modesty the success condition; the spec forbids Recommendation in this slice.
- **Risk:** composing the modules opens a back door an individual module forbids (e.g. an upstream import of `decision-support`). **Defense:** AC10 re-runs the dependency-boundary tests over the import graph.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the sixth Specification and the first end-to-end vertical slice. It defines the behavioral contract for composing the reasoning core into one responsible Reflection; it defers the orchestration shape, fixture detail, persistence, delivery, and all generation/UI to later specs.*

*Inputs: [Spec 001](./001-observation-set-intake.md) · [Spec 002](./002-signal-detection.md) · [Spec 003](./003-hypothesis-lifecycle.md) · [Spec 004](./004-understanding-update.md) · [Spec 005](./005-decision-support-voice.md) · [Tech Spec 005A](./005-decision-support-voice-tech.md) · [Decision Support Model](../domain-modeling/DECISION_SUPPORT_MODEL.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · Process: [spec-process.md](./spec-process.md)*
