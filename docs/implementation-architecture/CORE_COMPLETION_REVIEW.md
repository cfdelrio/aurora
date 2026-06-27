# Aurora — Core Completion Review

> A consolidation of what Aurora's reasoning core has proven in code, what it deliberately does not yet do, and the boundaries future work must not collapse.
>
> Review / Consolidation phase. No code, no production-module changes. This document summarizes; it does not decide.

| Field | Value |
|---|---|
| **Status** | Review / Consolidation · *Accepted snapshot* |
| **Phase** | Review (no implementation) |
| **Covers** | Implementations 001–006 |
| **Validation at writing** | `tsc --noEmit` clean · `node --test` **145/145 pass** |
| **Modules** | `observation`, `reasoning`, `understanding`, `decision-support` (+ `shared-kernel`) |

[FACT] **Central question:** *What exactly has Aurora's reasoning core proven in code, what does it intentionally not do yet, and what boundaries must future work not violate?*

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from the implemented code, tests, or an accepted spec/model. |
| **[DECISION]** | A consolidation commitment recorded here. |
| **[ASSUMPTION]** | A stance taken for this review. |
| **[QUESTION]** | Open; carried forward, does not block. |

---

## 1. Executive Summary

[FACT]
- **The reasoning core is implemented end-to-end.** All five ladder stages exist in code (`observation → reasoning → understanding → decision-support`) and Implementation 006 composes them into one demonstrated chain.
- **The first full output is `Reflection`, not `Recommendation`.** The end-to-end integration test proves a complete chain that lands on a modest voice.
- **The system demonstrates restraint *by construction*.** Even with complete traceability and clean gates, a single chain tops out at Reflection because the understanding ceiling caps the voice — restraint is structural, not a runtime preference.
- **The current suite proves the core can compose without overreaching.** 145 tests pass, including module-boundary tests, negative-capability ("defining") tests, and the end-to-end Reflection proof.
- **What does not exist yet:** no UI, API, DB / persistence, LLM rendering, event bus, notification layer, Garmin/FIT adapter, production orchestration service, or real `athlete` module. These are **intentional absences** (see §6), not gaps left by mistake.

[ASSUMPTION] The one-sentence claim this review defends: **Aurora can run the full reasoning core end-to-end and still refuse to overreach.**

---

## 2. Implemented Core Flow

[FACT] The implemented flow, stage by stage. "Refuses to" names what is *unrepresentable or rejected* at that stage, not merely untested.

```
ObservationSet → Observation → ContextualizedObservation → Signal/SignalRejection
   → EvidenceCase → Hypothesis lifecycle → UnderstandingProfile update
   → UnderstandingAssessment → DecisionSupportCase → Terminal Output (DecisionSupport: Reflection)
```

| Step | Owning module | Implemented object(s) | Protected invariant | Handoff downstream | Refuses to |
|---|---|---|---|---|---|
| **ObservationSet / Observation** | `observation` | `ObservationSet`, `MeasuredObservation`, `SubjectiveObservation`, `MissingDataObservation`, `Provenance`, `Source`, `ObservationQuality` | Provenance/quality born at capture and immutable; corrections supersede, never overwrite; incompleteness explicit | raw, provenance-bearing observations | hold any interpretation/meaning field |
| **ContextualizedObservation** | `observation/signal` | `ContextualFrame`, `ContextualizedObservation`, `TraceToObservation` | Frame is context, not conclusion; the original is never mutated; trace to the set/observation is born here | a contextualized observation | assign meaning or direction |
| **Signal / SignalRejection** | `observation/signal` | `Signal`, `SignalRejection`, `SignalDetectionPolicy` (`expectedRangeDeviationPolicy`) | Relevance-without-meaning; every outcome is a Signal *or* an auditable rejection (nothing silently dropped); quality/provenance travel forward | a `Signal` (or recorded rejection) | become evidence; resolve a source conflict |
| **EvidenceCase** | `reasoning` | `EvidenceCase`, `TraceToSignal`, `EvidenceDirection` | An `EvidenceCase` is created **only** by `Hypothesis.attachEvidence`; a `SignalRejection` can never become evidence | evidence attached to a claim | exist standalone; outside a hypothesis |
| **Hypothesis lifecycle** | `reasoning` | `Hypothesis` (aggregate root), `Falsifier`, `ClaimConfidence`, lifecycle states/transitions | Always falsifiable; calibrated, defeasible confidence; no silent transitions; never "certain" | a settled lifecycle **outcome** | become a fact; be certain |
| **UnderstandingProfile update** | `understanding` | `UnderstandingProfile` (aggregate), `UnderstandingDimension`, `ReasoningOutcome` adapter, `SurvivedChallenge`, `Surprise`, `Staleness`, `Fragility` | Per-dimension, never global; promotion only by survived challenge across ≥2 distinct conditions; population/repetition never promote; history never deleted | a per-dimension level + trail | read raw signals; store claim confidence; go global |
| **UnderstandingAssessment** | `understanding` | `UnderstandingAssessment`, `SafeVoiceCeiling`, `deriveSafeVoiceCeiling` | Read-only projection; staleness/fragility can only **lower** the ceiling; the ceiling is **not** a `VoiceMode` | a `SafeVoiceCeiling` (max assertiveness) | select a voice; recommend |
| **DecisionSupportCase** | `decision-support` | `DecisionOpportunity`, `DecisionSupportCase` (aggregate), 5 gates, `TraceabilityVerification`, `VoiceSelectionPolicy`, `VoiceMode`, terminal outputs, `SupportQuality` | No output before gates run; voice gated not derived; Recommendation needs complete trace + confident ceiling; agency preserved; `AthleteDecision` referenced, never owned | a terminal output | own the decision; author claims; command |
| **Terminal Output** | `decision-support` | `DecisionSupport` (with `VoiceMode`), `Inquiry`, `Withholding` | `DecisionSupport` requires `preservesAgency: true` (literal); `Inquiry` is not a `VoiceMode`; `Withholding` carries an auditable reason | (the athlete-facing edge) | emit a command; hide uncertainty |

---

## 3. Module Inventory

### `observation`
[FACT] Implements `ObservationSet` (aggregate), `MeasuredObservation` / `SubjectiveObservation` / `MissingDataObservation`, `Provenance` / `Source` / `ObservationQuality`, `ContextualFrame` + `contextualize`, `Signal` / `SignalRejection`, and `expectedRangeDeviationPolicy` (the `SignalDetectionPolicy`). Coordinators: `recordObservationSet`, `detectSignals`.
- **Clarify:** `observation` still does **not reason** — it imports only `shared-kernel`; `Hypothesis`/`Evidence`/`Impact`/`Understanding`/`DecisionSupport` are not reachable here. **A `Signal` is not `Evidence`** — it asserts only *possible relevance to a future reasoning question*, with no slot for cause/impact/state.

### `reasoning`
[FACT] Implements `Hypothesis` (aggregate root) owning `EvidenceCase` (entity), `EvidenceDirection`, `ClaimConfidence`, `Falsifier`, and the lifecycle (`proposed → supported/weakened/contradicted/falsified/retired/promoted-to-working-knowledge`). Coordinators: `openHypothesis`, `attachSignalAsEvidence`, `transitionHypothesis`.
- **Clarify:** a `Hypothesis` is **not fact** and never reaches a "certain"/"proven" state; **confidence is not certainty** (it is calibrated and defeasible); **an `EvidenceCase` exists only inside a `Hypothesis`** — `createEvidenceCase` is deliberately *not* exported, and a `SignalRejection` is rejected as evidence at runtime and by type.

### `understanding`
[FACT] Implements `UnderstandingProfile` (aggregate, per-dimension), `UnderstandingDimension`, `UnderstandingLevel` (Unknown < Thin < Working < Trusted < Mature), the `ReasoningOutcome` anti-corruption adapter (`reasoningOutcomeFrom`), `SurvivedChallenge`, `Surprise`, `Staleness`, `Fragility`, `UnderstandingAssessment`, and `SafeVoiceCeiling`. Coordinators: `updateUnderstandingFromOutcome`, `produceUnderstandingAssessment`, `markUnderstandingStale`.
- **Clarify:** **claim confidence is not understanding** — the adapter deliberately drops `ClaimConfidence` and raw `EvidenceCase`s; **repetition does not promote** — promotion requires survived challenge across ≥2 distinct conditions; **`SafeVoiceCeiling` is not a `VoiceMode`** — it is understanding's own vocabulary for *maximum permitted assertiveness*.

### `decision-support`
[FACT] Implements `DecisionOpportunity`, `DecisionSupportCase` (aggregate root), the five gates (`EvidenceGate`, `UnderstandingGate`, `PurposeGate`, `RiskGate`, `AgencyGate`), `TraceabilityVerification` (`verifyTraceability`), `VoiceSelectionPolicy` (`selectTerminalOutput`), `VoiceMode`, terminal outputs (`DecisionSupport`/`Inquiry`/`Withholding`), `RiskAssessment`, `PurposeContext`, `SupportQuality`, and `AthleteDecisionRef`. Coordinators: `openDecisionSupportCase`, `evaluateDecisionSupportCase`, `recordAthleteDecisionRef`.
- **Clarify:** **voice is gated, not derived** — `VoiceSelectionInputs` carries **no claim-confidence field**, so confidence→voice is unrepresentable; **`Recommendation` is hard to construct** — it requires `confident` ceiling + complete traceability + all gates passing; **`AthleteDecision` is referenced, not owned** — only an `AthleteDecisionRef` field exists, recorded after the fact, and `SupportQuality` reflects gate integrity, not outcome.

---

## 4. Structural Guarantees

[FACT] What is **impossible to construct today**, with the defense that makes it so. (These are enforced by module surface design + the negative-capability and boundary tests, not by convention.)

| # | Made impossible | Defense (module / test) |
|---|---|---|
| 1 | Raw `Observation` becoming meaning directly | `Observation` has no meaning field; meaning requires `contextualize` + `SignalDetectionPolicy`; `observation` cannot import `reasoning` (boundary test) |
| 2 | `Signal` becoming `Evidence` without a `Hypothesis` | `createEvidenceCase` not exported; `EvidenceCase` only via `Hypothesis.attachEvidence` (reasoning negative tests) |
| 3 | An `EvidenceCase` existing standalone | same as #2 — no constructor on the public surface |
| 4 | A `Hypothesis` becoming certainty | no "certain/proven" lifecycle state; confidence always calibrated/defeasible (reasoning lifecycle tests) |
| 5 | Understanding promoting from repetition alone | promotion gated on survived challenge across ≥2 distinct conditions in `update-policy` (understanding tests) |
| 6 | Claim confidence mapping to understanding | `reasoningOutcomeFrom` adapter drops `ClaimConfidence` (understanding adapter test) |
| 7 | `SafeVoiceCeiling` becoming a `VoiceMode` | distinct types in distinct modules; `maxVoiceForCeiling` maps ceiling→voice in `decision-support` (negative test) |
| 8 | Claim confidence selecting voice | `VoiceSelectionInputs` has no confidence field (decision-support negative test) |
| 9 | `Recommendation` without complete traceability + confident ceiling | final guard in `VoiceSelectionPolicy`; degrades to Framing otherwise (decision-support + e2e tests) |
| 10 | Risk escalating toward `Recommendation` | `RiskGate` yields only `caution-warning`; policy routes risk to `Warning`, never up (decision-support negative test) |
| 11 | `Inquiry` being a `VoiceMode` | `Inquiry` has no `voice` field; separate output type (decision-support negative test) |
| 12 | `DecisionSupportCase` owning `AthleteDecision` | only an `AthleteDecisionRef`; asserted `undefined` in the e2e proof (gates-and-quality + e2e tests) |
| 13 | Upstream depending on downstream | dependency-boundary tests per module + the e2e structural guard that no production file imports all four surfaces |

---

## 5. End-to-End Reflection Proof (Implementation 006)

[FACT] The integration test (`src/modules/__tests__/end-to-end-responsible-reflection.test.ts`) runs a synthetic scenario ("I felt unusually heavy": an elevated HR measurement + a subjective report + a missing power datum) through all four modules and asserts the terminal output is `DecisionSupport` with `VoiceMode = Reflection`.

[FACT] **Why the first full output is `Reflection` — by the modules' own logic, not by force:**
1. A single **`supported`** outcome is first contact: `applyOutcome` sets `level = higherOf("Unknown","Working") = Working`; with one distinct condition (`< 2`) it does not reach `Trusted`/`Mature`.
2. `deriveSafeVoiceCeiling(Working, low fragility, fresh)` = **`tentative`**.
3. `maxVoiceForCeiling("tentative")` = **`Reflection`**.
4. **Complete traceability is not enough for Recommendation** — the Recommendation guard also requires a `confident` ceiling.
5. **Clean gates do not override the understanding ceiling** — all five gates pass, yet the ceiling still caps the voice at Reflection.

[FACT] The proof also asserts the chain's honesty: the quality limitation survives as an auditable `SignalRejection`; traceability resolves back to the `ObservationSet`; agency is preserved; and no `AthleteDecision` is owned.

> [ASSUMPTION] **Aurora can complete the reasoning chain and still refuse to overreach.**

---

## 6. What Does Not Exist Yet

[FACT] Aurora does **not** yet have, and this is by design at this stage:

| Absent | Intentional? | Note |
|---|---|---|
| `athlete` module implementation | **Intentional** | The Boundary Map names it; not needed to prove the reasoning core. Purpose/risk enter as placeholders (§7). |
| Real `Purpose` source | **Intentional** | Provided as `PurposeContext` placeholder input. |
| Real `Constraints` source | **Intentional** | Belongs to the future `athlete` module. |
| Real `RiskAssessment` source | **Intentional** | Provided as input placeholder; no diagnostic engine. |
| Garmin/FIT importer | **Intentional** | First input is a synthetic fixture; real adapters are a later spec. |
| Persistence / DB | **Intentional** | Aggregates are immutable-by-operation in memory; persistence is a separate architecture phase. |
| Projection refresh strategy | **Intentional** | Projections expose staleness; refresh mechanism deferred (Boundary Map §5/§11). |
| Event bus | **Intentional** | Public/internal event split is specified conceptually; no runtime bus. |
| UI | **Intentional** | No rendering; outputs are domain values, not copy. |
| API | **Intentional** | No external entrypoint boundary specified yet. |
| LLM rendering boundary | **Intentional** | Deliberately absent so generated text never becomes domain truth. |
| Notification layer | **Intentional** | Delivery is out of scope. |
| `AthleteDecision` feedback loop | **Intentional** | Only an `AthleteDecisionRef` placeholder exists (Spec 009 territory). |
| Training-plan generator | **Intentional** | Explicitly forbidden at this stage. |
| Real-world ingestion adapter | **Intentional** | Synthetic fixture only. |

[ASSUMPTION] None of the above is a failure. Each was excluded so the core's invariants could be proven *before* the surfaces most likely to erode them are introduced.

---

## 7. Known Placeholders / Adapters

[FACT] Current placeholders and adapters, each with why it exists, what it protects, and its eventual replacement.

| Placeholder / adapter | Why it exists | What it protects | Future replacement |
|---|---|---|---|
| `ReasoningOutcome` adapter (`reasoningOutcomeFrom`, local to `understanding`) | Lets understanding consume reasoning **outcomes** without importing reasoning internals (type-only import) | Keeps claim confidence + raw evidence out of understanding; "understanding earned from tested outcomes" | Stable cross-module outcome contract / event when an event surface lands |
| `PurposeContext` placeholder (input to `decision-support`) | No `athlete` module to source real, versioned purpose yet | Lets `PurposeGate` run without `decision-support` importing/owning purpose | Real purpose snapshot from the future `athlete` module (passed in by a coordinator) |
| `RiskAssessment` placeholder (input to `decision-support`) | No diagnostic/risk engine yet | Lets `RiskGate` run (caution-only) without inventing risk inside the case | Real risk assessment service, still caution-only |
| `AthleteDecisionRef` (field on `DecisionSupportCase`) | The athlete acts *after* support; the loop is not built | Keeps the decision **referenced, never owned**; `SupportQuality` ≠ outcome | The `AthleteDecision` feedback loop (Spec 009), re-entering as observation |
| Synthetic end-to-end fixture (`__tests__`) | No real ingestion adapter; first proof must be deterministic | Proves composition + restraint without committing to an input format | A real input-adapter spec (synthetic/manual/FIT) |
| No production orchestration service (test harness is the seam) | No external entrypoint boundary specified | Avoids implying a use-case boundary; keeps invariants inside aggregates | A production application service when a real entrypoint is specified |

[QUESTION] **Doc drift to fix in a future consolidation:** `docs/diagrams/SYSTEM_MAP.md` still marks `decision-support` as "Spec 005 (not implemented)" and predates Impl 006. It should be refreshed to show all five stages implemented and the end-to-end Reflection. (Recorded here; not changed in this review to keep scope to the single deliverable.)

---

## 8. Boundary Rules Going Forward

[DECISION] Future work must preserve these (consolidated from the Boundary Map and the domain index):

1. **`observation` remains upstream** — it imports only `shared-kernel`; it never learns about signals-as-meaning, hypotheses, or voice.
2. **`reasoning` may depend on `observation`, not vice versa** — reasoning consumes signals; observation never imports reasoning.
3. **`understanding` consumes reasoning *outcomes*, not raw `Signal`s** — only via the `ReasoningOutcome` adapter; never reads claim confidence or raw evidence.
4. **`decision-support` consumes `reasoning` and `understanding`, not vice versa** — the upstream modules must never import `decision-support`.
5. **`Athlete` must not own inferred state or capacity** — those remain projections (defeasible, traceable), never authoritative attributes.
6. **UI / LLM must not become domain authority** — generated text is a rendering of domain values, never their source of truth.
7. **Persistence must not turn projections into facts** — a stored `CurrentState`/`UnderstandingLevel` must keep its staleness/confidence; never a plain attribute.
8. **No production service may bypass aggregates or gates** — application services *coordinate, never reason*; a voice/level/verdict is produced only inside its owning module. (Boundary Map's named "most dangerous shortcut.")

---

## 9. Next Responsible Missions

[ASSUMPTION] Ranked. Each names why it matters, what it must **not** do, and what it depends on.

1. **Spec 007 — Athlete Purpose Change and Reasoning Reinterpretation**
   - *Why:* Purpose is the one referent Aurora must never lose; a purpose change can reinterpret past evidence. It also begins to replace the purpose placeholder with a real, versioned source.
   - *Must not:* let Aurora choose purpose; silently rewrite past hypotheses (revisions are recorded, "as-of" preserved).
   - *Depends on:* the reasoning + understanding cores (done); the beginnings of an `athlete` purpose representation.

2. **Spec 008 — Projection Refresh and Staleness Strategy**
   - *Why:* Projections (`UnderstandingAssessment`, future `CurrentState`/`CapacityProfile`) must refresh and always expose staleness so "stale" can only lower the voice.
   - *Must not:* allow a projection to become an authoritative input or to outlive its source without re-derivation.
   - *Depends on:* understanding (done); the persistence-architecture question (open).

3. **Spec 009 — AthleteDecision Feedback Loop**
   - *Why:* Closes the cycle — the athlete's decision returns as a future observation; replaces the `AthleteDecisionRef` placeholder.
   - *Must not:* let `DecisionSupportCase` own the decision; judge decision quality by outcome.
   - *Depends on:* decision-support (done); an observation re-entry path; an `athlete` reference.

4. **Implementation Architecture — Persistence and Event Surface**
   - *Why:* Everything is in-memory and immutable-by-operation; durable storage and a public/internal event split are needed before real ingestion.
   - *Must not:* turn projections into stored facts; expose internal process events as public contracts; bypass aggregates.
   - *Depends on:* the Boundary Map's open questions (§11 there); chosen after the domain loops (007–009) are clearer.

5. **Input Adapter Spec — Synthetic / Manual / Garmin FIT**
   - *Why:* Replaces the synthetic fixture with a real ingestion boundary that produces faithful, provenance-bearing `ObservationSet`s.
   - *Must not:* assign meaning at ingestion; drop provenance/quality; let the parser reason.
   - *Depends on:* observation (done); a persistence decision for what it writes.

[DECISION] **Recommended next mission: Spec 007 — Athlete Purpose Change and Reasoning Reinterpretation.** It is the highest-leverage next step: it exercises the cyclic, revision-making part of the model the linear core has not yet proven, begins retiring the most consequential placeholder (purpose), and depends only on cores already built — without prematurely committing to persistence, transport, or UI.

---

## 10. Final Assessment

[ASSUMPTION] **What has Aurora proven?**
That the reasoning core can run **end-to-end with restraint**: raw observations become signals without becoming meaning, signals become evidence only inside falsifiable hypotheses, tested outcomes earn dimension-specific understanding without repetition or confidence leaking in, and a gated decision-support case turns all of it into a *modest, traceable, agency-preserving* `Reflection` — refusing to recommend even when the chain is complete and the gates are clean. The dangerous collapses (data→meaning, inference→attribute, claim-strength→voice) are unrepresentable, defended by negative-capability and boundary tests.

[ASSUMPTION] **What has Aurora not proven yet?**
Anything involving **real data, durability, transport, or the feedback cycle**: real ingestion (FIT/manual), persistence, projection refresh under time, a production orchestration entrypoint, a real `athlete`/purpose source, risk from real data, and the `AthleteDecision` loop that makes the system *learn over time*. The linear path is proven; the **loops** (surprise-driven revision, purpose reinterpretation, decision feedback) are specified in the model but not yet exercised in code.

[ASSUMPTION] **What is the most dangerous next shortcut?**
**Adding UI / LLM / advice-rendering before purpose, persistence, and the feedback boundaries are specified.** A rendering or recommendation surface introduced now would be the fastest way to let generated text become domain truth, derive voice from convenience instead of gates, and reintroduce the exact collapses the core was built to prevent — and it would not look wrong from the inside. The discipline that produced restraint by construction must hold precisely when a demo-able surface becomes tempting: **build the loops and the boundaries before the voice has a mouth.**

---

## Validation

[FACT] Run at the time of writing, with no implementation modified:
- `npm run typecheck` (`tsc --noEmit`) — **clean**.
- `npm test` (`node --test "src/**/*.test.ts"`) — **145 / 145 pass**, 0 fail, including all 001–005 module/negative/boundary tests and the Implementation 006 end-to-end Reflection proof.

---

## Success Criterion

> **"What is closed, what is still deliberately absent, and what must future work not collapse?"**

[ASSUMPTION] Answerable from this page: **closed** — the five-stage reasoning core (§2–3) with thirteen structural guarantees (§4) and an end-to-end Reflection proof (§5); **deliberately absent** — UI/API/DB/LLM/event-bus, real ingestion, persistence, a production service, and the `athlete`/purpose/risk/decision-feedback sources, each a placeholder or intentional gap (§6–7); **must not collapse** — observation into meaning, inference into attribute, claim-strength into voice, and the upstream→downstream dependency direction (§4, §8). The core is complete and restrained; what remains is the loops, the boundaries, and the real world — to be added without eroding any of the above.

---

*This is the first Review / Consolidation paper after the reasoning core was completed in code. It summarizes Implementations 001–006; it makes no new domain or architectural decisions and modifies no module.*

*Inputs: [Foundation Index](../README.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Technical Boundary Map](./TECHNICAL_BOUNDARY_MAP.md) · [System Map](../diagrams/SYSTEM_MAP.md) · [Spec 001](../specs/001-observation-set-intake.md) · [Spec 002](../specs/002-signal-detection.md) · [Spec 003](../specs/003-hypothesis-lifecycle.md) · [Spec 004](../specs/004-understanding-update.md) · [Spec 005](../specs/005-decision-support-voice.md) · [Spec 006](../specs/006-end-to-end-responsible-reflection.md)*
