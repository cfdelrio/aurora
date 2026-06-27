# Aurora — Core Completion Review

> A consolidation of what Aurora's reasoning core has proven in code, what it deliberately does not yet do, and the boundaries future work must not collapse.
>
> Review / Consolidation phase. No code, no production-module changes. This document summarizes; it does not decide.

| Field | Value |
|---|---|
| **Status** | Review / Consolidation · *Accepted snapshot* |
| **Phase** | Review (no implementation) |
| **Covers** | Implementations 001–006 (core) · **updated for 007 (Purpose-first `athlete`), 008 (projection freshness), 009 (AthleteDecision feedback)** |
| **Validation at writing** | core: `145/145` · post-007: `175/175` · post-008: `196/196` · **post-009: `tsc --noEmit` clean · `node --test` 212/212 pass** |
| **Modules** | `observation`, `reasoning`, `understanding` (now with projection freshness), `decision-support`, **`athlete` (Purpose + AthleteDecision)** (+ `shared-kernel`) |

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

## Update — Implementation 008 (Projection Freshness on `UnderstandingAssessment`)

[FACT] **Implementation 008** made projection freshness **explicit** on `UnderstandingAssessment` (the one concrete projection today) and added a pure, selective refresh policy — all inside `understanding`, with **no `decision-support` change**.

[FACT] **Now true:**
- `UnderstandingAssessment` carries explicit **`freshness`** (`current`/`stale`/`partial`/`invalid`/`unknown`), **`derivedAt`**, **`sourceRefs`** (a `ProjectionTrace`), and **`limitations`** — all additive/optional, so 001–007 call sites are unchanged.
- New `understanding` surface: `ProjectionFreshness`/`Status`, `StalenessReason`, `ProjectionSourceRef`/`Kind`, `ProjectionTrace`, `ProjectionLimitations`, `RefreshTrigger`/`Kind`, `ProjectionRefreshDecision`/`Kind`, `ProjectionRefreshPolicy`, plus `clampCeilingByFreshness`/`applyFreshness`.
- **`current` preserves the Impl 006 Reflection scenario** byte-for-byte.
- **No non-current freshness can raise the voice;** `stale`/`partial` lower the ceiling one step; **`invalid`/`unknown` clamp `safeVoiceCeiling` to `none`** (→ `Withholding`).
- **`decision-support` was not modified** — freshness reaches it **only through the existing `safeVoiceCeiling`**; `understandingGate` still reads only the ceiling.
- **Refresh = recompute** (a new assessment); `applyFreshness` produces a **new** view and never mutates the old one; the prior assessment stays auditable if retained.
- The refresh policy is **pure, deterministic, selective** (only projections whose source refs intersect the trigger are affected), and **conservative** under uncertainty — it never globally invalidates and never invents traceability.
- **Still absent (intentional):** no generic projection engine, no top-level `projection` module, no persistence, no DB, no cache, no event bus, no UI/API/LLM, no `ImpactAssessment`.

[FACT] **Distinctions this update makes explicit** (do not collapse):
- **Projection ≠ source of truth** — `UnderstandingAssessment` is a derived read model of the `UnderstandingProfile` aggregate.
- **`ProjectionFreshness` ≠ traceability** — freshness says *how safe to consume*; trace/source refs say *what it came from*.
- **source refs ≠ copied source state** — references back to real artifacts, never embedded/re-authored truth.
- **refresh ≠ mutate old projection** — refresh recomputes a new view; the old one is never edited.
- **stale/partial/invalid/unknown ≠ permission to recommend** — non-current freshness can only constrain.
- **`safeVoiceCeiling` clamp ≠ decision-support owning freshness** — the consumer reads the (clamped) ceiling; it does not read freshness.
- **`UnderstandingAssessment` projection ≠ `UnderstandingProfile` aggregate** — the aggregate is the source of truth; the assessment is its labeled view.
- **local freshness slice ≠ generic projection engine** — freshness lives in `understanding` for one projection; no engine exists.

[ASSUMPTION] The headline: **Aurora now makes projection freshness explicit for `UnderstandingAssessment`; non-current freshness can only constrain downstream voice through `safeVoiceCeiling`, projections stay derived views, and there is still no generic projection engine or persistence.**

---

## Update — Implementation 009 (AthleteDecision Feedback Loop)

[FACT] **Implementation 009** closed the decision feedback loop: an athlete-owned, append-only `AthleteDecision` slice was added **inside `athlete`**, and a neutral harness adapter re-enters a reported decision as a `SubjectiveObservation` — **no `decision-support` / `observation` / `reasoning` / `understanding` change**.

[FACT] **Now true:**
- `AthleteDecision` is **implemented inside `athlete`** (athlete-owned, append-only); the `AthleteDecisionRef` placeholder is **retired** (it now references a real decision).
- New `athlete` surface: `AthleteDecisionId`, `AthleteDecision` (+ athlete-local `AthleteDecisionRef`, `DecisionReportSource`), `DecisionChoice`, `DecisionRationale`, `DecisionContext`, `DecisionOutcomeRef`, `AthleteDecisionRecord` (+ `amend`/supersede). Coordinators: `recordAthleteDecision`, `amendAthleteDecision`.
- **`DecisionSupportCase` records only an `AthleteDecisionRef`** — it references the decision, never owns or mutates it.
- The decision is **append-only**: corrections **amend/supersede**, the original stays auditable; `DecisionChoice` keeps a **modification** as free text (no binary compliance); `DecisionRationale` is athlete-reported context, not truth.
- **`DecisionOutcomeRef` is a reference only** — no full `DecisionOutcome` object; "no outcome" is the default.
- The decision **re-enters as a `SubjectiveObservation`** (via the neutral `__tests__` adapter, since `athlete` must not import `observation`) — an `Observation`, **never** `Signal`/`Evidence`/`Hypothesis`/`Understanding`. Future learning still passes the full ladder.
- **`divergedFromSupport` is neutral factual metadata**, not a compliance score; **good/bad outcome does not grade `SupportQuality`**.
- **Still absent (intentional):** no full `DecisionOutcome` object, no pattern engine, no compliance/obedience/shame/reward scoring, no outcome-based validation, no UI/API/DB/event-bus/persistence/LLM/training-plan.

[FACT] **Distinctions this update makes explicit** (do not collapse):
- **`AthleteDecision` ≠ Aurora output** — it is the athlete's fact, not Aurora's product.
- **`AthleteDecisionRef` ≠ ownership** — a reference recorded after the fact.
- **divergence ≠ noncompliance**, **following ≠ obedience-success**, **not-following ≠ failure** — no valence anywhere.
- **`DecisionOutcomeRef` ≠ outcome judgement** — a handle to a separate, later observation.
- **`AthleteDecision → Observation` ≠ `AthleteDecision → Evidence`** — re-entry is observation only.
- **`SupportQuality` ≠ outcome quality** — integrity at the time of support.
- **decision pattern ≠ athlete label** — a pattern must become a falsifiable hypothesis first.
- **decision rationale ≠ declared-purpose overwrite** — behavior never rewrites purpose.

[ASSUMPTION] The headline: **the athlete's decision now returns as athlete-owned learning material — referenced not owned, re-entering only as `Observation` through the ladder — with no obedience tracking, no shame, and no outcome-based grading of the support.**

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
- **What does not exist yet:** no UI, API, DB / persistence, LLM rendering, event bus, notification layer, Garmin/FIT adapter, or production orchestration service. The `athlete` module now holds **Purpose (Impl 007) + AthleteDecision (Impl 009)** — but **full Athlete** (state/capacity/constraints/path-memory), a **full `DecisionOutcome` object**, a **pattern engine**, and any **compliance/outcome-based validation** are still absent. These are **intentional absences** (see §6), not gaps left by mistake.

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
[FACT] Implements `UnderstandingProfile` (aggregate, per-dimension), `UnderstandingDimension`, `UnderstandingLevel` (Unknown < Thin < Working < Trusted < Mature), the `ReasoningOutcome` anti-corruption adapter (`reasoningOutcomeFrom`), `SurvivedChallenge`, `Surprise`, `Staleness`, `Fragility`, `UnderstandingAssessment`, and `SafeVoiceCeiling`. **Plus projection freshness (Impl 008):** `ProjectionFreshness`/`Status`, `StalenessReason`, `ProjectionSourceRef`/`Kind`, `ProjectionTrace`, `ProjectionLimitations`, `RefreshTrigger`/`Kind`, `ProjectionRefreshDecision`/`Kind`, `ProjectionRefreshPolicy`, `clampCeilingByFreshness`, `applyFreshness`. Coordinators: `updateUnderstandingFromOutcome`, `produceUnderstandingAssessment` (now `at`-aware), `markUnderstandingStale`.
- **Clarify:** **claim confidence is not understanding** — the adapter deliberately drops `ClaimConfidence` and raw `EvidenceCase`s; **repetition does not promote** — promotion requires survived challenge across ≥2 distinct conditions; **`SafeVoiceCeiling` is not a `VoiceMode`** — it is understanding's own vocabulary for *maximum permitted assertiveness*.
- **Projection freshness (Impl 008):** `UnderstandingAssessment` is a **projection/read model** carrying explicit `freshness` (`current`/`stale`/`partial`/`invalid`/`unknown`), `derivedAt`, and `sourceRefs`. Non-current freshness can only **lower** the ceiling; `invalid`/`unknown` clamp it to `none`. The refresh policy is **pure, selective, conservative**; **refresh = recompute** (new view, old one auditable, never mutated). Freshness reaches `decision-support` **only via the clamped `safeVoiceCeiling`** — no `decision-support` change.

### `decision-support`
[FACT] Implements `DecisionOpportunity`, `DecisionSupportCase` (aggregate root), the five gates (`EvidenceGate`, `UnderstandingGate`, `PurposeGate`, `RiskGate`, `AgencyGate`), `TraceabilityVerification` (`verifyTraceability`), `VoiceSelectionPolicy` (`selectTerminalOutput`), `VoiceMode`, terminal outputs (`DecisionSupport`/`Inquiry`/`Withholding`), `RiskAssessment`, `PurposeContext`, `SupportQuality`, and `AthleteDecisionRef`. Coordinators: `openDecisionSupportCase`, `evaluateDecisionSupportCase`, `recordAthleteDecisionRef`.
- **Clarify:** **voice is gated, not derived** — `VoiceSelectionInputs` carries **no claim-confidence field**, so confidence→voice is unrepresentable; **`Recommendation` is hard to construct** — it requires `confident` ceiling + complete traceability + all gates passing; **`AthleteDecision` is referenced, not owned** — only an `AthleteDecisionRef` field exists, recorded after the fact, and `SupportQuality` reflects gate integrity, not outcome.

### `athlete` *(Purpose — Impl 007 · AthleteDecision — Impl 009)*
[FACT] Implements a thin `Athlete` aggregate root (+ `AthleteId`) owning an **append-only `PurposeHistory`** of immutable `PurposeVersion`s; `Purpose`/`DeclaredPurpose`, `PurposeStatus`, `PurposeSource`, `PurposeChangeReason`; `PurposeVersionRef`; `PurposeChanged` (a derived/returned value, **no event bus**); `PurposeReinterpretationStatus` + result value type (**type only — no engine**); a `RevealedPurposeSignal` placeholder. **Plus the AthleteDecision slice (Impl 009):** `AthleteDecisionId`, `AthleteDecision` (+ athlete-local `AthleteDecisionRef`, `DecisionReportSource`), `DecisionChoice`, `DecisionRationale`, `DecisionContext`, `DecisionOutcomeRef`, `AthleteDecisionRecord` (append-only; `amend`/supersede). Coordinators: `declarePurpose`, `changePurpose`, `recordAthleteDecision`, `amendAthleteDecision`. Imports **only `shared-kernel`**.
- **Clarify (Purpose):** **`Athlete` owns declared context, not inferred truth** — no state/capacity/readiness/fatigue/constraints/path-memory; **purpose changes the future lens, it does not repaint the past** — history is append-only, prior reasoning is never rewritten; **`athlete` reaches no downstream module** — purpose flows to `decision-support` (as `PurposeContext`) and to `understanding` (as selective staleness) only through **neutral harness/application adapters**; **declared ≠ revealed**.
- **Clarify (AthleteDecision, Impl 009):** the decision is **athlete-owned** and **append-only** (corrections amend/supersede, original retained); `DecisionSupportCase` records **only an `AthleteDecisionRef`** (referenced, never owned); a `DecisionChoice` keeps a **modification** as free text (**no binary compliance**), and `divergedFromSupport` is **neutral fact, not a score**; there is **no compliance/obedience/shame/reward field**; `DecisionOutcomeRef` is a **reference only** (no full outcome object); the decision **re-enters as a `SubjectiveObservation`** via a neutral adapter (`athlete` never imports `observation`) — **never** directly as Signal/Evidence/Understanding.

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
| 17 | A non-current projection raising the voice | freshness only clamps the ceiling down; `clampCeilingByFreshness` never raises; `invalid`/`unknown` → `none` (Impl 008 freshness tests) |
| 18 | A stale/invalid projection earning a `Recommendation` | `Recommendation` needs `confident`; non-current freshness caps below it (→ `Withholding` for invalid/unknown); integration test |
| 19 | Refresh mutating an old projection / inventing traceability | `applyFreshness` returns a new frozen assessment; the old stays auditable; source refs derive only from the real trace (Impl 008 tests) |
| 20 | A trigger globally staling unrelated projections | `projectionRefreshPolicy` is selective by source-ref intersection; non-matching → `keep-current` (Impl 008 refresh-policy tests) |
| 21 | `DecisionSupportCase` owning the athlete's decision | the case holds only an `AthleteDecisionRef`; the `AthleteDecision` lives in `athlete`; integration test asserts no decision object on the case (Impl 009) |
| 22 | An `AthleteDecision` becoming `Evidence`/`Understanding` directly | the only re-entry is `decisionAsObservation` → `SubjectiveObservation`; no decision→Evidence/Understanding adapter exists; the ladder is intact (Impl 009 tests) |
| 23 | Obedience/compliance scoring of a decision | `AthleteDecision` carries no compliance/obedience/noncompliance/shame/reward field; `divergedFromSupport` is neutral; following ≠ success, not-following ≠ failure (Impl 009 negative tests) |
| 24 | An outcome retroactively grading the support | `DecisionOutcomeRef` is separate; recording a (divergent) decision leaves `SupportQuality` unchanged — integrity-at-the-time (Impl 009 test) |

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
| Projection **freshness** on `UnderstandingAssessment` | **Implemented (Impl 008)** | Explicit `current`/`stale`/`partial`/`invalid`/`unknown` + `derivedAt` + source refs; non-current only lowers the voice (invalid/unknown → ceiling `none`), via the existing ceiling. |
| Generic projection **engine** / top-level `projection` module | **Intentional** | Freshness is local to `understanding` for the one concrete projection; a shared kernel/engine waits for a second projection (`ImpactAssessment`). |
| `ImpactAssessment` (second projection) | **Intentional** | Not introduced; Spec 008 governs *how any projection behaves*, not which exist. |
| Event bus | **Intentional** | Public/internal event split is specified conceptually; no runtime bus. `PurposeChanged`/refresh triggers are values, not bus events. |
| UI | **Intentional** | No rendering; outputs are domain values, not copy. |
| API | **Intentional** | No external entrypoint boundary specified yet. |
| LLM rendering boundary | **Intentional** | Deliberately absent so generated text never becomes domain truth. |
| Notification layer | **Intentional** | Delivery is out of scope. |
| `AthleteDecision` feedback loop | **Implemented (Impl 009)** | Athlete-owned, append-only `AthleteDecision` in `athlete`; referenced (not owned) by the case; re-enters as `SubjectiveObservation`. The `AthleteDecisionRef` placeholder is **retired**. |
| Full `DecisionOutcome` object / pattern engine | **Intentional** | Only `DecisionOutcomeRef` exists; outcome modeling and decision-pattern→hypothesis inference are deferred. |
| Compliance / obedience / outcome-based validation | **Intentional (forbidden)** | No score is produced; the outcome never grades `SupportQuality`. |
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
| `AthleteDecisionRef` (field on `DecisionSupportCase`) | **Retired as a placeholder (Impl 009).** It now references a real, athlete-owned `AthleteDecision` in `athlete` | Keeps the decision **referenced, never owned**; `SupportQuality` ≠ outcome | — (the loop is built; production persistence/event surface is the remaining piece) |
| `DecisionOutcomeRef` (reference only, Impl 009) | The outcome is later/separate; a full `DecisionOutcome` object is deferred | Keeps outcome distinct from the decision; outcome never grades support | A specialized `DecisionOutcome`/observation type when outcome modeling is specified |
| Decision harness adapters (`src/modules/__tests__/decision-observation-adapter.ts`) | Converting `AthleteDecision` → `SubjectiveObservation` / adapting the ref needs `observation`/`decision-support`; `athlete` must not import them | Keeps `athlete` a pure upstream leaf; re-entry is observation-only (Impl 006 precedent) | A production application service when a real entrypoint is specified |
| Purpose harness adapters (`src/modules/__tests__/purpose-adapters.ts`) | Converting purpose → `PurposeContext` / applying `PurposeChanged` → `markUnderstandingStale` requires importing downstream; `athlete` must not | Keeps `athlete` a pure upstream leaf; coordination lives outside it (Impl 006 precedent) | A production application service when a real entrypoint is specified |
| `ProjectionRefreshPolicy` applied via harness/caller (Impl 008) | Refresh has no scheduler/event surface yet; the policy is a pure decision | Keeps refresh deterministic and selective without infrastructure; `understanding` owns freshness, the caller applies triggers | An event-driven/maintained refresh when the event surface + persistence land |
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
6. **`Athlete` must not own inferred state or capacity** — those remain projections (defeasible, traceable), never authoritative attributes; the slice holds only the *given* (declared, versioned purpose; athlete-recorded decisions).
7. **A purpose change never rewrites the past** — `PurposeHistory` is append-only; prior reasoning is never edited/auto-falsified; understanding is staled *selectively* through a coordinator, never reset globally, and never mutated by `athlete` directly.
7b. **The athlete owns the decision; Aurora references and learns, never grades (Impl 009)** — `AthleteDecision` is athlete-owned and append-only; `decision-support` records only an `AthleteDecisionRef`; the decision re-enters **only as `Observation`** (then the full ladder), never as Evidence/Understanding directly; **no compliance/obedience scoring**, and the outcome never grades `SupportQuality`.
8. **UI / LLM must not become domain authority** — generated text is a rendering of domain values, never their source of truth.
9. **Persistence must not turn projections into facts** — a stored `CurrentState`/`UnderstandingLevel` must keep its staleness/confidence; never a plain attribute.
10. **A projection is a derived view, never a source of truth (Impl 008)** — it carries explicit freshness + source references; non-current freshness can only *lower* downstream assertiveness; refresh *recomputes* (never edits the old view); a trigger stales *selectively*, never globally. Consumers honor freshness through the owning module's output (e.g. the clamped `safeVoiceCeiling`), not by owning refresh.
11. **No production service may bypass aggregates or gates** — application services *coordinate, never reason*; a voice/level/verdict is produced only inside its owning module. (Boundary Map's named "most dangerous shortcut.")

---

## 9. Next Responsible Missions

[ASSUMPTION] Ranked. Each names why it matters, what it must **not** do, and what it depends on.

0. **✅ Spec 007 — Athlete Purpose Change and Reasoning Reinterpretation — DONE (Impl 007).**
   - *Delivered:* a thin, Purpose-first `athlete` module (declared, versioned, append-only purpose; `PurposeChanged`; `PurposeVersionRef`); purpose flows to `decision-support`/`understanding` via neutral adapters; selective staleness; no reasoning rewrite.
   - *Deferred (carried forward):* reasoning becoming **purpose-version-aware** and the **reinterpretation engine** (status type ships, engine does not); the **full** `athlete` aggregate (state/capacity/constraints/path-memory).

0b. **✅ Spec 008 — Projection Refresh and Staleness Strategy — DONE (Impl 008).**
   - *Delivered:* explicit `ProjectionFreshness` (5 states) + `derivedAt` + source refs on `UnderstandingAssessment`; a pure, selective, conservative `ProjectionRefreshPolicy`; non-current freshness only lowers the ceiling (invalid/unknown → `none` → Withholding); `decision-support` unchanged.
   - *Deferred (carried forward):* a generic projection kernel/engine; `ImpactAssessment` as a second projection; event-driven/persisted refresh; `Inquiry`-on-unknown (currently Withholding).

0c. **✅ Spec 009 — AthleteDecision Feedback Loop — DONE (Impl 009).**
   - *Delivered:* athlete-owned, append-only `AthleteDecision` in `athlete` (choice/rationale/context/source; amend-supersede); `DecisionSupportCase` references only an `AthleteDecisionRef`; re-entry as `SubjectiveObservation` via a neutral adapter; no compliance/obedience scoring; outcome never grades `SupportQuality`. The `AthleteDecisionRef` placeholder is retired.
   - *Deferred (carried forward):* a full `DecisionOutcome` object; a decision-pattern→hypothesis engine; a feedback/interaction bounded context if interaction history grows.

1. **Reasoning Purpose-Version Awareness & Reinterpretation Engine** *(the deferred half of Spec 007 — recommended next)*
   - *Why:* Impl 007 ships `PurposeVersionRef` and the reinterpretation *status type* but not the engine; this makes reasoning version-aware and produces real reinterpretation verdicts on a purpose change. It can reuse the Impl 008 freshness/refresh machinery (a purpose change is a `RefreshTrigger`).
   - *Must not:* rewrite or auto-falsify prior hypotheses — reinterpretation is a new, traceable artifact.
   - *Depends on:* `athlete` (Purpose-first, done) + `reasoning` (done) + projection freshness (done).

2. **Implementation Architecture — Persistence and Event Surface**
   - *Why:* Everything is in-memory and immutable-by-operation; durable storage and a public/internal event split are needed before real ingestion. `PurposeChanged` becoming a *public* domain event belongs here.
   - *Must not:* turn projections into stored facts; expose internal process events as public contracts; bypass aggregates.
   - *Depends on:* the Boundary Map's open questions (§11 there); chosen after the domain loops are clearer.

3. **Input Adapter Spec — Synthetic / Manual / Garmin FIT**
   - *Why:* Replaces the synthetic fixture with a real ingestion boundary that produces faithful, provenance-bearing `ObservationSet`s.
   - *Must not:* assign meaning at ingestion; drop provenance/quality; let the parser reason.
   - *Depends on:* observation (done); a persistence decision for what it writes.

[DECISION] **Recommended next mission: Reasoning Purpose-Version Awareness & Reinterpretation Engine** (the deferred half of Spec 007). With purpose real (007), projection freshness in place (008), and the decision loop closed (009), the remaining specified-but-unexercised loop is **reinterpretation**: making `reasoning` purpose-version-aware and producing real reinterpretation verdicts when purpose changes — reusing the Impl 008 refresh machinery, depending only on cores already built, and **never rewriting or auto-falsifying** prior hypotheses (reinterpretation is a new, traceable artifact). Persistence/event surface and input adapters remain the larger follow-ups once the domain loops are fully exercised.

---

## 10. Final Assessment

[ASSUMPTION] **What has Aurora proven?**
That the reasoning core can run **end-to-end with restraint**: raw observations become signals without becoming meaning, signals become evidence only inside falsifiable hypotheses, tested outcomes earn dimension-specific understanding without repetition or confidence leaking in, and a gated decision-support case turns all of it into a *modest, traceable, agency-preserving* `Reflection` — refusing to recommend even when the chain is complete and the gates are clean. The dangerous collapses (data→meaning, inference→attribute, claim-strength→voice) are unrepresentable, defended by negative-capability and boundary tests.

[ASSUMPTION] **What has Aurora not proven yet?**
Anything involving **real data, durability, and transport**: real ingestion (FIT/manual), persistence, a production orchestration entrypoint, the **full** `athlete` model (state/capacity/constraints/path-memory), risk from real data, reasoning that is **purpose-version-aware** with a reinterpretation engine, a **generic projection engine** (`ImpactAssessment`, event-driven/persisted refresh), and a **full `DecisionOutcome` / decision-pattern engine**. Purpose **is** a real, versioned upstream source (Impl 007), **projection freshness is explicit** (Impl 008 — non-current only lowers the voice), and the **decision feedback loop is built** (Impl 009 — the athlete's decision returns as `Observation`, referenced not owned, with no obedience scoring). The linear path is proven and **three loops are now exercised** (purpose-change selective staleness, projection freshness/refresh, and decision feedback — all no-rewrite); the remaining loops (surprise-driven revision, **deep purpose reinterpretation**, and learning *over time* from accumulated decisions/outcomes) are specified in the model but not yet exercised in code.

[ASSUMPTION] **What is the most dangerous next shortcut?**
**Adding UI / LLM / advice-rendering before purpose, persistence, and the feedback boundaries are specified.** A rendering or recommendation surface introduced now would be the fastest way to let generated text become domain truth, derive voice from convenience instead of gates, and reintroduce the exact collapses the core was built to prevent — and it would not look wrong from the inside. The discipline that produced restraint by construction must hold precisely when a demo-able surface becomes tempting: **build the loops and the boundaries before the voice has a mouth.**

---

## Validation

[FACT] Run at the time of writing, with no implementation modified:
- `npm run typecheck` (`tsc --noEmit`) — **clean**.
- `npm test` (`node --test "src/**/*.test.ts"`) — **212 / 212 pass**, 0 fail (was 145 at the 006 baseline; +30 for Impl 007, +21 for Impl 008, +16 for Impl 009), including all module/negative/boundary tests, the Implementation 006 end-to-end Reflection proof, and the Impl 007/008/009 purpose + projection-freshness + decision-feedback tests.

---

## Success Criterion

> **"What is closed, what is still deliberately absent, and what must future work not collapse?"**

[ASSUMPTION] Answerable from this page: **closed** — the five-stage reasoning core (§2–3) with twenty-four structural guarantees (§4), an end-to-end Reflection proof (§5), a **Purpose `athlete`** module (Impl 007) giving Aurora real, versioned, append-only declared context, **explicit projection freshness** on `UnderstandingAssessment` (Impl 008) so a derived view can never quietly become a fact, and the **AthleteDecision feedback loop** (Impl 009) so the athlete's decision returns as referenced-not-owned `Observation` with no obedience scoring; **deliberately absent** — UI/API/DB/LLM/event-bus, real ingestion, persistence, a production service, the **full** `athlete` model (state/capacity/constraints/path-memory), a reinterpretation engine, a **generic projection engine**/`ImpactAssessment`, a **full `DecisionOutcome`/pattern engine**, and the risk source, each a placeholder or intentional gap (§6–7); **must not collapse** — observation into meaning, inference into attribute, claim-strength into voice, the upstream→downstream dependency direction, **purpose's past into its present** (declared ≠ inferred; append-only; no rewrite), **a projection into a source of truth** (freshness explicit; non-current only constrains; refresh recomputes), and **the athlete's decision into Aurora's verdict** (referenced not owned; Observation-only re-entry; no obedience/outcome grading) (§4, §8). The core is complete and restrained, with purpose real, freshness explicit, and the decision loop closed; what remains is the deeper loops, the boundaries, and the real world — to be added without eroding any of the above.

---

*This is the first Review / Consolidation paper after the reasoning core was completed in code. It summarizes Implementations 001–006 and is **updated for Implementation 007 (Purpose-first `athlete`), 008 (projection freshness), and 009 (AthleteDecision feedback)**; it makes no new domain or architectural decisions and modifies no module.*

*Inputs: [Foundation Index](../README.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Technical Boundary Map](./TECHNICAL_BOUNDARY_MAP.md) · [System Map](../diagrams/SYSTEM_MAP.md) · [Spec 001](../specs/001-observation-set-intake.md) · [Spec 002](../specs/002-signal-detection.md) · [Spec 003](../specs/003-hypothesis-lifecycle.md) · [Spec 004](../specs/004-understanding-update.md) · [Spec 005](../specs/005-decision-support-voice.md) · [Spec 006](../specs/006-end-to-end-responsible-reflection.md)*
