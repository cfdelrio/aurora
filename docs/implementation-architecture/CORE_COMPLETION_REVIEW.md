# Aurora — Core Completion Review

> A consolidation of what Aurora's reasoning core has proven in code, what it deliberately does not yet do, and the boundaries future work must not collapse.
>
> Review / Consolidation phase. No code, no production-module changes. This document summarizes; it does not decide.

| Field | Value |
|---|---|
| **Status** | Review / Consolidation · *Accepted snapshot* |
| **Phase** | Review (no implementation) |
| **Covers** | Implementations 001–006 (core) · **updated for Implementation 007 (Purpose-first `athlete`)** |
| **Validation at writing** | core: `145/145` · **post-007: `tsc --noEmit` clean · `node --test` 175/175 pass** |
| **Modules** | `observation`, `reasoning`, `understanding`, `decision-support`, **`athlete` (Purpose-first)** (+ `shared-kernel`) |

[FACT] **Central question:** *What exactly has Aurora's reasoning core proven in code, what does it intentionally not do yet, and what boundaries must future work not violate?*

---

## Update — Implementation 007 (Purpose-first `athlete`)

[FACT] Since this review was first written for Implementations 001–006, **Implementation 007** added a thin, **Purpose-first `athlete` module** — Aurora's first real *given* context. The body below has been corrected where it is affected; this banner is the at-a-glance summary of *what changed after Implementation 007*.

[FACT] **Now true:**
- `athlete` is an **implemented upstream module** (imports only `shared-kernel`; imports no `observation`/`reasoning`/`understanding`/`decision-support`).
- The implemented slice is **Purpose-only**: `Athlete` (thin root), `Purpose`/`DeclaredPurpose`, `PurposeVersion`, `PurposeVersionRef`, `PurposeHistory`, `PurposeChanged`, `PurposeChangeReason`, `PurposeSource`, `PurposeStatus`, `PurposeReinterpretationStatus` (type only), and a `RevealedPurposeSignal` placeholder.
- **`PurposeHistory` is append-only**; a change appends an immutable `PurposeVersion` and never overwrites the past.
- **`PurposeChanged` is a domain outcome/value** (returned/derived), **not** an event bus.
- **`PurposeVersionRef` can flow into `Hypothesis.purposeContextRef`** (the slot already existed — no reasoning refactor).
- **Purpose maps to decision-support `PurposeContext`** (missing→unknown, ambiguous→ambiguous, declared→declared) through a **neutral harness adapter**.
- **A purpose change can selectively stale understanding** via `markUnderstandingStale("purpose-change")` through a neutral harness adapter — `athlete` never mutates `UnderstandingProfile` directly and never resets it globally.
- **`Athlete` owns declared context, not inferred truth** — no state, capacity, readiness, fatigue, constraints, or path-dependent memory were implemented.

[FACT] **Distinctions this update makes explicit** (do not collapse):
- **thin Athlete/Purpose module ≠ full Athlete aggregate** — only the Purpose slice exists.
- **declared Purpose ≠ inferred athlete state** — `athlete` holds the *given*, never the *inferred*.
- **`PurposeChanged` ≠ reasoning rewrite** — prior hypotheses are never edited or auto-falsified.
- **`PurposeVersionRef` ≠ proof that old reasoning used the new purpose** — it is a context handle, tagging which purpose was in force; it does not retroactively re-evaluate.
- **Revealed behavior ≠ declared purpose** — only an athlete-sourced declaration creates a version; behavior never silently overwrites it.
- **Purpose context ≠ decision-support voice** — purpose feeds the `PurposeGate`; the case still selects the `VoiceMode`.
- **selective staleness ≠ global understanding reset** — only the named dimension(s) go stale.

[ASSUMPTION] The headline: **Aurora now has athlete-owned, versioned Purpose as real upstream context — but not a full Athlete model.** Purpose can constrain future reasoning and decision-support through explicit seams, while prior reasoning stays historically traceable and is never rewritten.

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
- **What does not exist yet:** no UI, API, DB / persistence, LLM rendering, event bus, notification layer, Garmin/FIT adapter, or production orchestration service. The `athlete` module now exists **but only as a Purpose-first slice** (Impl 007) — full Athlete (state/capacity/constraints/path-memory) is still absent. These are **intentional absences** (see §6), not gaps left by mistake.

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

### `athlete` *(Purpose-first slice — Implementation 007)*
[FACT] Implements a thin `Athlete` aggregate root (+ `AthleteId`) owning an **append-only `PurposeHistory`** of immutable `PurposeVersion`s; `Purpose`/`DeclaredPurpose`, `PurposeStatus`, `PurposeSource`, `PurposeChangeReason`; `PurposeVersionRef`; `PurposeChanged` (a derived/returned value, **no event bus**); `PurposeReinterpretationStatus` + result value type (**type only — no engine**); a `RevealedPurposeSignal` placeholder. Coordinators: `declarePurpose`, `changePurpose`. Imports **only `shared-kernel`**.
- **Clarify:** **`Athlete` owns declared context, not inferred truth** — no state/capacity/readiness/fatigue/constraints/path-memory; **purpose changes the future lens, it does not repaint the past** — history is append-only, prior reasoning is never rewritten; **`athlete` reaches no downstream module** — purpose flows to `decision-support` (as `PurposeContext`) and to `understanding` (as selective staleness) only through **neutral harness/application adapters**, never by `athlete` importing them; **declared ≠ revealed** — only an athlete-sourced declaration creates a version.

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
| 14 | `athlete` reaching a downstream module | `athlete` imports only `shared-kernel`; `athlete-boundary` test asserts no `observation`/`reasoning`/`understanding`/`decision-support` import (Impl 007) |
| 15 | Purpose history being overwritten / a purpose change rewriting the past | `PurposeHistory` append-only; `Athlete` immutable-by-operation; `PurposeChanged` carries no hypothesis mutation; never mutates `UnderstandingProfile` (Impl 007 tests) |
| 16 | Revealed behavior becoming declared purpose / inferred purpose | only an athlete-sourced declaration creates a version; runtime guard rejects non-purpose/non-athlete-sourced values; `RevealedPurposeSignal` has no change path (Impl 007 declared-vs-revealed test) |

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
| **Full** `athlete` aggregate | **Intentional** | A thin **Purpose-first** `athlete` module now exists (Impl 007); state/capacity/constraints/path-memory/identity-detail/reports are still absent. |
| Real `Purpose` source | **Implemented (Impl 007)** | Now a real, athlete-owned, versioned, append-only source; reaches `decision-support` as `PurposeContext` via a neutral adapter. The decision-support `PurposeContext` *placeholder* is **partly retired** (§7). |
| Real `Constraints` source | **Intentional** | Belongs to a future `athlete` slice (not in the Purpose-first slice). |
| Inferred athlete state / capacity / readiness / fatigue | **Intentional** | Never implemented; `athlete` owns the *given*, never the *inferred*. |
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
| `PurposeContext` placeholder (input to `decision-support`) | **Partly retired (Impl 007).** A real, versioned purpose now exists in `athlete`; the decision-support input is still a passed-in `PurposeContext` value (no `decision-support`→`athlete` import) | Lets `PurposeGate` run without `decision-support` importing/owning purpose | A production coordinator that snapshots current purpose into `PurposeContext` (the harness adapter is the current seam) |
| `RiskAssessment` placeholder (input to `decision-support`) | No diagnostic/risk engine yet | Lets `RiskGate` run (caution-only) without inventing risk inside the case | Real risk assessment service, still caution-only |
| `AthleteDecisionRef` (field on `DecisionSupportCase`) | The athlete acts *after* support; the loop is not built | Keeps the decision **referenced, never owned**; `SupportQuality` ≠ outcome | The `AthleteDecision` feedback loop (Spec 009), re-entering as observation |
| Purpose harness adapters (`src/modules/__tests__/purpose-adapters.ts`) | Converting purpose → `PurposeContext` / applying `PurposeChanged` → `markUnderstandingStale` requires importing downstream; `athlete` must not | Keeps `athlete` a pure upstream leaf; coordination lives outside it (Impl 006 precedent) | A production application service when a real entrypoint is specified |
| `PurposeReinterpretationStatus` / result (type only) | The reinterpretation *engine* is deferred | Gives a stable shape for future reinterpretation without deciding statuses now | A reinterpretation pipeline once reasoning is purpose-version-aware |
| Synthetic end-to-end fixture (`__tests__`) | No real ingestion adapter; first proof must be deterministic | Proves composition + restraint without committing to an input format | A real input-adapter spec (synthetic/manual/FIT) |
| No production orchestration service (test harness is the seam) | No external entrypoint boundary specified | Avoids implying a use-case boundary; keeps invariants inside aggregates | A production application service when a real entrypoint is specified |

[FACT] **`reasoning` already carries `Hypothesis.purposeContextRef`** (a string slot), so a `PurposeVersionRef` flows in with no reasoning refactor — but **reasoning is not yet purpose-version-aware** (it stores the handle opaquely; it does not reinterpret past hypotheses on a purpose change). That deeper integration is a later spec.

---

## 8. Boundary Rules Going Forward

[DECISION] Future work must preserve these (consolidated from the Boundary Map and the domain index):

1. **`observation` remains upstream** — it imports only `shared-kernel`; it never learns about signals-as-meaning, hypotheses, or voice.
2. **`reasoning` may depend on `observation`, not vice versa** — reasoning consumes signals; observation never imports reasoning.
3. **`understanding` consumes reasoning *outcomes*, not raw `Signal`s** — only via the `ReasoningOutcome` adapter; never reads claim confidence or raw evidence.
4. **`decision-support` consumes `reasoning` and `understanding`, not vice versa** — the upstream modules must never import `decision-support`.
5. **`athlete` is the upstream context of meaning** — it imports only `shared-kernel` and must never import `observation`/`reasoning`/`understanding`/`decision-support` (the *given* must not depend on the *inferred*). Purpose reaches downstream only through neutral adapters/inputs, never by `athlete` reaching out.
6. **`Athlete` must not own inferred state or capacity** — those remain projections (defeasible, traceable), never authoritative attributes; the Purpose-first slice holds only the *given* (declared, versioned purpose).
7. **A purpose change never rewrites the past** — `PurposeHistory` is append-only; prior reasoning is never edited/auto-falsified; understanding is staled *selectively* through a coordinator, never reset globally, and never mutated by `athlete` directly.
8. **UI / LLM must not become domain authority** — generated text is a rendering of domain values, never their source of truth.
9. **Persistence must not turn projections into facts** — a stored `CurrentState`/`UnderstandingLevel` must keep its staleness/confidence; never a plain attribute.
10. **No production service may bypass aggregates or gates** — application services *coordinate, never reason*; a voice/level/verdict is produced only inside its owning module. (Boundary Map's named "most dangerous shortcut.")

---

## 9. Next Responsible Missions

[ASSUMPTION] Ranked. Each names why it matters, what it must **not** do, and what it depends on.

0. **✅ Spec 007 — Athlete Purpose Change and Reasoning Reinterpretation — DONE (Impl 007).**
   - *Delivered:* a thin, Purpose-first `athlete` module (declared, versioned, append-only purpose; `PurposeChanged`; `PurposeVersionRef`); purpose flows to `decision-support`/`understanding` via neutral adapters; selective staleness; no reasoning rewrite.
   - *Deferred (carried forward):* reasoning becoming **purpose-version-aware** and the **reinterpretation engine** (status type ships, engine does not); the **full** `athlete` aggregate (state/capacity/constraints/path-memory).

1. **Spec 008 — Projection Refresh and Staleness Strategy** *(recommended next)*
   - *Why:* Projections (`UnderstandingAssessment`, future `CurrentState`/`CapacityProfile`) must refresh and always expose staleness so "stale" can only lower the voice.
   - *Must not:* allow a projection to become an authoritative input or to outlive its source without re-derivation.
   - *Depends on:* understanding (done); the persistence-architecture question (open).

2. **Spec 009 — AthleteDecision Feedback Loop**
   - *Why:* Closes the cycle — the athlete's decision returns as a future observation; replaces the `AthleteDecisionRef` placeholder.
   - *Must not:* let `DecisionSupportCase` own the decision; judge decision quality by outcome.
   - *Depends on:* decision-support (done); an observation re-entry path; an `athlete` reference (now available, Purpose-first).

3. **Reasoning Purpose-Version Awareness & Reinterpretation Engine** *(the deferred half of Spec 007)*
   - *Why:* Impl 007 ships `PurposeVersionRef` and the reinterpretation *status type* but not the engine; this makes reasoning version-aware and produces real reinterpretation verdicts on a purpose change.
   - *Must not:* rewrite or auto-falsify prior hypotheses — reinterpretation is a new, traceable artifact.
   - *Depends on:* `athlete` (Purpose-first, done) + `reasoning` (done).

4. **Implementation Architecture — Persistence and Event Surface**
   - *Why:* Everything is in-memory and immutable-by-operation; durable storage and a public/internal event split are needed before real ingestion. `PurposeChanged` becoming a *public* domain event belongs here.
   - *Must not:* turn projections into stored facts; expose internal process events as public contracts; bypass aggregates.
   - *Depends on:* the Boundary Map's open questions (§11 there); chosen after the domain loops are clearer.

5. **Input Adapter Spec — Synthetic / Manual / Garmin FIT**
   - *Why:* Replaces the synthetic fixture with a real ingestion boundary that produces faithful, provenance-bearing `ObservationSet`s.
   - *Must not:* assign meaning at ingestion; drop provenance/quality; let the parser reason.
   - *Depends on:* observation (done); a persistence decision for what it writes.

[DECISION] **Recommended next mission: Spec 008 — Projection Refresh and Staleness Strategy.** With purpose now a real upstream source (Impl 007), the highest-leverage next step is generalizing how derived knowledge ages and refreshes — so "stale" always lowers the voice — building directly on the selective purpose-change staleness Impl 007 introduced, and depending only on cores already built (no premature commitment to persistence, transport, or UI).

---

## 10. Final Assessment

[ASSUMPTION] **What has Aurora proven?**
That the reasoning core can run **end-to-end with restraint**: raw observations become signals without becoming meaning, signals become evidence only inside falsifiable hypotheses, tested outcomes earn dimension-specific understanding without repetition or confidence leaking in, and a gated decision-support case turns all of it into a *modest, traceable, agency-preserving* `Reflection` — refusing to recommend even when the chain is complete and the gates are clean. The dangerous collapses (data→meaning, inference→attribute, claim-strength→voice) are unrepresentable, defended by negative-capability and boundary tests.

[ASSUMPTION] **What has Aurora not proven yet?**
Anything involving **real data, durability, transport, or the full feedback cycle**: real ingestion (FIT/manual), persistence, projection refresh under time, a production orchestration entrypoint, the **full** `athlete` model (state/capacity/constraints/path-memory), risk from real data, reasoning that is **purpose-version-aware** with a reinterpretation engine, and the `AthleteDecision` loop that makes the system *learn over time*. Purpose itself **is** now a real, versioned upstream source (Impl 007). The linear path is proven and the **purpose-change loop is partly exercised** (selective staleness, no rewrite); the remaining **loops** (surprise-driven revision, deep purpose reinterpretation, decision feedback) are specified in the model but not yet exercised in code.

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

[ASSUMPTION] Answerable from this page: **closed** — the five-stage reasoning core (§2–3) with sixteen structural guarantees (§4), an end-to-end Reflection proof (§5), and a **Purpose-first `athlete`** module (Impl 007) giving Aurora real, versioned, append-only declared context; **deliberately absent** — UI/API/DB/LLM/event-bus, real ingestion, persistence, a production service, the **full** `athlete` model (state/capacity/constraints/path-memory), a reinterpretation engine, and the risk/decision-feedback sources, each a placeholder or intentional gap (§6–7); **must not collapse** — observation into meaning, inference into attribute, claim-strength into voice, the upstream→downstream dependency direction, and **purpose's past into its present** (declared ≠ inferred; append-only; no rewrite) (§4, §8). The core is complete and restrained, with purpose now a real upstream source; what remains is the deeper loops, the boundaries, and the real world — to be added without eroding any of the above.

---

*This is the first Review / Consolidation paper after the reasoning core was completed in code. It summarizes Implementations 001–006 and is **updated for Implementation 007 (Purpose-first `athlete`)**; it makes no new domain or architectural decisions and modifies no module.*

*Inputs: [Foundation Index](../README.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Technical Boundary Map](./TECHNICAL_BOUNDARY_MAP.md) · [System Map](../diagrams/SYSTEM_MAP.md) · [Spec 001](../specs/001-observation-set-intake.md) · [Spec 002](../specs/002-signal-detection.md) · [Spec 003](../specs/003-hypothesis-lifecycle.md) · [Spec 004](../specs/004-understanding-update.md) · [Spec 005](../specs/005-decision-support-voice.md) · [Spec 006](../specs/006-end-to-end-responsible-reflection.md)*
