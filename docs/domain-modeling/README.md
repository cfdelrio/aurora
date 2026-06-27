# Aurora — Domain Modeling Index

> The canonical map of Aurora's accepted domain model: the conceptual objects, the invariants they protect, and the boundaries implementation must never collapse.
>
> Consolidation, not new decisions. No code, APIs, schemas, or frameworks.

This index connects the five Domain Modeling papers that translate Aurora's [foundation](../README.md) into a conceptual domain model. If you are a new contributor or an AI agent, read this first — it lets you answer one question before touching anything:

> **What are Aurora's core domain objects, what invariants do they protect, and what must implementation never collapse?**

[FACT] Where this index and a source paper appear to differ, the **source paper governs**; flag the discrepancy rather than treating this summary as authoritative.

---

## 1. Purpose of Domain Modeling

[FACT] The Domain Modeling layer translates Aurora's discovery papers (the *why/what/how/who*) into a conceptual model of *which objects carry the reasoning and what they guarantee*. It **does not implement the system.**

It defines: **aggregates, value objects, entities, projections, policies, domain services, invariants, accepted boundaries, and unresolved questions.**

It deliberately does **not** define: database tables, APIs, types, frameworks, infrastructure, UI, scoring formulas, or ML behavior (see §9).

[ASSUMPTION] The discipline throughout: an object earns the name *aggregate* only by protecting an invariant across a consistency boundary. If it protects no independent invariant, it is a value object, entity, projection, or policy — never an aggregate. DDD is not forced.

---

## 2. Reading Order

The five papers form a chain. The reasoning core was built upstream-to-downstream, with the Athlete as cross-cutting context.

| # | Paper | Resolves | Key decision | Main invariant | Implementation must preserve |
|---|---|---|---|---|---|
| 001 | [Core Reasoning Model](./CORE_REASONING_MODEL.md) | Evidence → Hypothesis → Decision Support objects | `Reasoning` is one bounded context; `Hypothesis` is the aggregate root owning `EvidenceCase`; an impact claim *is* a Hypothesis | No `DecisionSupportCase` reaches a recommendation without a complete `TraceabilityChain` | Traceability enforced by construction; Decision Support never authors claims |
| 002 | [Athlete Aggregate](./ATHLETE_AGGREGATE.md) | What the athlete is, inside Aurora | `Athlete` is a *thin* aggregate; boundary = *given* (owned) vs. *inferred* (projected) | Inferred state/capacity are never stored as authoritative attributes on the athlete | The athlete is never reduced to a cached profile of conclusions |
| 003 | [Observation & Signal Model](./OBSERVATION_SIGNAL_MODEL.md) | The upstream data → meaning boundary | Four stages: Observation → ContextualizedObservation → Signal / SignalRejection; `ObservationSet` is the only aggregate here | Raw observation is never treated as meaning | The data/meaning seam; provenance and quality travel from the root |
| 004 | [Understanding Profile Model](./UNDERSTANDING_PROFILE_MODEL.md) | How understanding matures, decays, revises | `UnderstandingProfile` aggregate, per-dimension; promotion only by *survived challenge* | A level never exceeds survived, athlete-specific evidence; population knowledge never promotes | Understanding is dimension-specific and caps voice; never global |
| 005 | [Decision Support Model](./DECISION_SUPPORT_MODEL.md) | How inference becomes responsible advice | `DecisionSupportCase` aggregate gates each voice; five `VoiceMode`s; `Inquiry` separate | Voice is gated by evidence × understanding × risk × purpose × agency; the decision is returned to the athlete | Voice is *gated, not derived*; Aurora owns support integrity, never the decision |

---

## 3. Accepted Aggregate Map

[FACT] Five aggregates, and only five, across the modeled core.

### `ObservationSet` *(Ingestion)*
- **Responsibility:** the consistency boundary for everything observed about one occasion.
- **Invariant:** every observation retains source/time/provenance; observations are immutable (corrections supersede, never overwrite); quality limitations travel downstream; completeness status is recorded.
- **Owns:** observations and their provenance, quality, and completeness.
- **Must not own:** signals, meaning, or any interpretation.

### `Hypothesis` *(Reasoning)*
- **Responsibility:** the single source of truth for one defeasible impact claim; aggregate root of the reasoning core.
- **Invariant:** always carries a falsifier and calibrated confidence; always traceable to its `EvidenceCase`; never transitions silently; never marked certain (KNOWLEDGE = justified-and-defeasible).
- **Owns:** the claim, its dimension/timescale, confidence, falsifier, revision history, and its `EvidenceCase`.
- **Must not own:** the decision to communicate it; raw observations (only links).

### `Athlete` *(Athlete)*
- **Responsibility:** the context through which training acquires meaning; a thin root over the *given*.
- **Invariant:** identity continuity; purpose always present or explicitly unknown; purpose history versioned and intact; hard constraints and path-dependent memory never silently lost; agency (decisions recorded without judgment).
- **Owns:** identity, purpose (+ versioned history), constraints, path-dependent memory, accepted declarations.
- **Must not own:** inferred state, inferred capacity, hypotheses, understanding, raw evidence, external context, or rankings.

### `UnderstandingProfile` *(Understanding)*
- **Responsibility:** Aurora's per-dimension, revisable confidence in its *understanding of this athlete* (distinct from confidence in any claim).
- **Invariant:** dimension-specific, never global; a level never exceeds survived athlete-specific evidence; population knowledge never promotes; every change recorded with cause; always revisable.
- **Owns:** per-dimension understanding levels and the evidence trail (hypothesis outcomes) behind each.
- **Must not own:** the athlete's attributes; individual claim confidence.

### `DecisionSupportCase` *(Decision Support)*
- **Responsibility:** guardian of one unit of decision support, from opportunity to terminal output.
- **Invariant:** emits a given voice only if its gates pass — complete traceability for Recommendation, voice ≤ understanding ceiling, explicit uncertainty, purpose reference, risk awareness, preserved agency; shortfall degrades voice or routes to Inquiry/Withholding (recorded).
- **Owns:** the chosen `VoiceMode`, the support content, its `TraceabilityChain`, the outcome (spoken/asked/withheld).
- **Must not own:** the athlete's decision; the underlying hypotheses (only links); the generation of new claims.

---

## 4. Accepted Value Objects / Entities / Projections / Policies

[FACT] Consolidated from the five papers. Categories reflect what each paper decided.

### Value Objects
- `Observation` (immutable, with `Provenance`) · `Signal` · `ContextualizedObservation` · `ObservationQuality` · `Source` · `SourceTrust` (contextual) · `SignalRejection` · `MissingDataObservation` · `SubjectiveObservation` / `AthleteReport` / `InquiryResponse` · `ExpectedRange` *(Observation & Signal)*
- `Purpose` (+ `PurposeVersion`, with owned `PurposeHistory`) · `AthleteIdentity` (+ `SportIdentity`, `CompetitiveCategory`, `ExperienceProfile`, `PhysiologyArchetype`) · `Constraint` *(Athlete)*
- `UnderstandingDimension` · `UnderstandingLevel` (Unknown<Thin<Working<Trusted<Mature) · `Surprise` · `Contradiction` · `PersonalPattern` · `Fragility` · `Staleness` *(Understanding)*
- `TraceabilityChain` · `VoiceMode` (Silence<Reflection<Framing<Warning≈Recommendation) · `RiskAssessment` · `PurposeAlignment` · gate-result objects *(Decision Support)*

### Entities
- `EvidenceCase` — entity **inside** the `Hypothesis` aggregate (not its own aggregate; its invariant protects the hypothesis's support: every evidence relation names direction/weight/grade/falsifier; convergence only across genuinely independent signals).
- `PathDependentMemory` — owned, append-only, **permanent** within `Athlete` (entity-like; never decays).

### Projections / Read Models
- `ImpactAssessment` — rollup of current impact hypotheses *(Reasoning)*; an impact claim itself is a Hypothesis, never a separate store.
- `CurrentState` (+ `StateSnapshot`, `StateStaleness`) — assembled from inference + reports; expires to `unknown` *(Athlete)*.
- `CapacityProfile` (+ `CapacityEstimate`) — projected over Reasoning hypotheses, with confidence + staleness *(Athlete)*.
- `UnderstandingAssessment` — level + fragility + staleness + **safe voice ceiling** + reasons, handed to Decision Support *(Understanding)*.

### Policies / Domain Services
- `SignalDetectionPolicy` (service) — judges meaning (four-way coincidence/noise/artifact/real) *(Observation & Signal)*.
- `SignalEligibility` (gate) — the four-part precondition (which hypothesis / direction / quality / source) for a signal to become evidence.
- `SurpriseDetection` (service) + `ContradictionResponsePolicy` + `UnderstandingPromotionPolicy` / `UnderstandingDemotionPolicy` / `UnderstandingDecay` *(Understanding)*.
- `VoiceSelectionPolicy` (policy) + the five gates as policies/services — `EvidenceGate`, `UnderstandingGate`, `PurposeGate`, `RiskGate`, `AgencyGate` + `TraceabilityVerification` (service) *(Decision Support)*.

[ASSUMPTION] `Noise` is **not an object** — it is the recorded *outcome* of a `SignalRejection`. `PersonalKnowledge` and `TestedHypothesis` are **not new objects** — the first is the *state* of an earned understanding level; the second is a `Hypothesis` in a tested lifecycle state.

---

## 5. Core Reasoning Flow

[FACT] The accepted flow from capture to the athlete's choice:

```
   ObservationSet                       (aggregate: provenance/quality/completeness)
        │
        ▼
   Observation                          (immutable, with provenance; superseded, never overwritten)
        │  + context (baseline, purpose, expected range, history)
        ▼
   ContextualizedObservation            (the explicit "number → means something" step)
        │  judged by SignalDetectionPolicy
        ├──► Signal                      (value object: meaningful for Reasoning)
        └──► SignalRejection             (recorded, auditable — not an absence)
        │  passes SignalEligibility gate
        ▼
   Hypothesis + EvidenceCase            (Reasoning: defeasible impact claim, falsifier, confidence)
        │  hypothesis lifecycle outcomes (promoted / falsified / surprised)
        ▼
   UnderstandingProfile update          (per-dimension level; survived challenge only)
        │  exposes UnderstandingAssessment (safe voice ceiling)
        ▼
   DecisionSupportCase                  (aggregate: gates evidence × understanding × risk × purpose × agency)
        │  VoiceSelectionPolicy → maximum responsible voice
        ▼
   Terminal Output ── DecisionSupport (VoiceMode) | Inquiry | Withholding
        │
        ▼
   AthleteDecision                      (the athlete's — referenced, never owned)
```

[FACT] Clarifications the flow must not obscure:
- **`Athlete` is not a pipeline stage.** It is the cross-cutting context every stage consults — providing **purpose, identity, constraints, and path-dependent memory** (baselines for Signal, priors for Evidence, purpose for Decision Support).
- **`UnderstandingProfile` is not global knowledge.** It is **dimension-specific**, sits *above* the flow, and *caps* the voice Decision Support may use.
- **`DecisionSupportCase` owns only the integrity of support, never the athlete's decision.**
- The flow is **cyclic**: surprise loops back to Understanding (and may revise the Athlete model); a purpose change can reinterpret past hypotheses; the `AthleteDecision` becomes a future Observation.

---

## 6. Non-Negotiable Invariants

[FACT] Consolidated across the five papers. Implementation may not violate any of these.

1. **Raw observation is never meaning.** Meaning is earned via contextualization and an explicit signal judgment — never read off a raw value.
2. **Observation provenance is never lost.** Every observation carries source/time; `ObservationSet` guarantees it; observations are immutable (corrections supersede).
3. **A Signal is not Evidence until attached to a Hypothesis.** Evidence exists only relative to a claim, with direction and weight.
4. **A Hypothesis remains falsifiable and revisable.** Always a named falsifier and calibrated confidence; KNOWLEDGE ≠ certainty; no silent transitions.
5. **Purpose changes are versioned.** Append-only, immutable versions; the past is readable "as of" any moment.
6. **Athlete does not own inferred state or capacity.** These are projections, defeasible and traceable — never authoritative attributes on the person.
7. **Understanding is dimension-specific, never global.** No object yields "Aurora understands this athlete."
8. **Population knowledge never promotes personal understanding.** Priors may seed hypotheses; only survived athlete-specific evidence raises a level.
9. **Recommendation-level output requires a complete traceability chain.** Weaker voices have proportionally weaker — but always *labeled* — requirements.
10. **Voice is gated, not derived.** It is bounded by evidence, the understanding ceiling, risk (which may raise to Warning for safety only), purpose, and agency — never by claim-strength alone.
11. **Aurora owns support integrity, not the athlete's decision.** Every assertive output returns the decision to the athlete; no commands (non-safety), no shame.

[ASSUMPTION] If one had to name the spine: **1–3** keep data honest, **4–6** keep the model defeasible and the person un-reduced, **7–8** keep understanding earned, **9–11** keep advice traceable and agency intact.

---

## 7. Terminal Outputs

[FACT] A `DecisionSupportCase` ends in exactly one of three outputs:

- **`DecisionSupport`** — support emitted in a `VoiceMode` (Silence < Reflection < Framing < Warning ≈ Recommendation), carrying confidence + falsifier and returning the decision.
- **`Inquiry`** — a question to the athlete when only they hold the missing input. **`Inquiry` is not a VoiceMode** — it sits on a different axis (acquiring input, not asserting). An answered Inquiry re-enters as a `SubjectiveObservation`/`InquiryResponse`.
- **`Withholding`** — recorded silence, always with a reason; the `Silence` VoiceMode realized; emits `RecommendationWithheld` when a recommendation was genuinely considered.

[FACT] **Responsible silence is auditable.** A withholding leaves a recorded reason precisely so "Aurora considered and chose not to speak" is distinguishable from "Aurora missed it."

---

## 8. Open Questions Before Implementation Architecture

[QUESTION] These remain genuinely unresolved and belong to the next phase. (Resolved decisions are not reopened here.)

- **Module boundaries:** does `Reasoning` become one package or multiple modules? Are the seven candidate contexts the right granularity, or do some collapse (e.g., Evidence+Impact already merged into Reasoning)?
- **Projection refresh:** how are `CurrentState`, `CapacityProfile`, `ImpactAssessment`, and `UnderstandingAssessment` refreshed — on read, on event, or maintained? (DM-002/004 left this to implementation.)
- **Traceability enforcement:** how much of the traceability invariant is enforced at compile-time vs. runtime?
- **Event surface:** which domain events are public (cross-context) vs. internal, and how are event names finalized?
- **Spec slicing:** how will the first implementation be sliced into specs (which behavior ships first)?
- **Aggregate granularity under load:** does `Athlete` split into identity vs. volatile-state aggregates, or `UnderstandingProfile` into per-(athlete×dimension) aggregates, if writes contend? (Both flagged with reversal points.)

[QUESTION] Cross-paper questions still open at the *domain* level (not implementation), carried for resolution: when stated vs. revealed purpose diverge, which does Impact evaluate against; how far back a `PurposeChanged` reinterprets past hypotheses; the qualitative gate rules per voice; whether `Inquiry` and `Reflection` stay distinct.

---

## 9. Things This Index Does Not Do

[FACT] This index — and the domain modeling layer it maps — does **not**:
- define database tables,
- define APIs,
- define TypeScript types,
- choose frameworks,
- choose infrastructure,
- define UI,
- implement scoring formulas,
- define ML behavior.

It is the conceptual model. Implementation architecture is the next, separate phase.

---

## Final Reflection

> **What must implementation architecture preserve from the domain model above all else?**

[ASSUMPTION] **Traceability as a structural invariant — and, inseparable from it, the gated path by which inference becomes advice.**

Above every other concern, implementation must make it *impossible by construction* for athlete-facing decision support to exist without a complete chain back to provenance-bearing observations, and impossible for a voice to exceed what evidence, understanding, purpose, and agency permit. Every other property can be reconstructed if degraded: a stale projection recomputes, a thin understanding deepens, a wrong hypothesis revises. But if untraceable or un-gated advice becomes *possible even once*, then every recommendation Aurora makes becomes indistinguishable from a guess — because none can prove its provenance or its right to the strength it claimed. Trust here does not erode gradually; it collapses. The domain model spent five papers ensuring data stays honest, the model stays defeasible, understanding stays earned, and advice stays gated — all of it converges on this one guarantee. Preserve it in construction, not in hope.

> **What would be the most dangerous way to misread this domain model when writing code?**

[ASSUMPTION] **Treating the projections as stored facts and the inferences as attributes — collapsing "what Aurora infers about the athlete" into "what the athlete is."**

The most dangerous misreading is the one that looks like good engineering: storing `CurrentState`, `CapacityProfile`, or an `UnderstandingLevel` as a plain attribute on the athlete because it is convenient to read. The moment that happens, the inference loses its confidence, its falsifier, and its traceability; a defeasible hypothesis becomes a label; the athlete becomes a cached summary of conclusions; and downstream code silently trusts a number that was supposed to be a question. The same misreading at the speaking boundary — deriving voice from claim-strength instead of gating it — turns a companion into a commander with a single `if (confidence > 0.8) recommend()`. Both errors share one root: forgetting that Aurora's objects encode *epistemic status*, not just data. A `Hypothesis` is not a fact; an `UnderstandingLevel` is not a permission; a projection is not a record. Code that strips the epistemic status to get at the value will be confidently, untraceably wrong — and it will not look wrong from the inside.

---

## Success Criterion

> **"What are Aurora's core domain objects, what invariants do they protect, and what must implementation never collapse?"**

[ASSUMPTION] Answerable from this page: **five aggregates** (`ObservationSet`, `Hypothesis`, `Athlete`, `UnderstandingProfile`, `DecisionSupportCase`) carrying the reasoning core, supported by value objects, entities, projections, and policies (§3–4); **eleven non-negotiable invariants** (§6) that keep data honest, the model defeasible, understanding earned, and advice traceable and agency-preserving; and **three things implementation must never collapse** — *observation into meaning*, *inference into attribute*, and *claim-strength into voice*. The reasoning core is complete and conceptually closed; what remains (§8) is implementation architecture, deliberately not begun here.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*Inputs: [Foundation Index](../README.md) · [Core Reasoning](./CORE_REASONING_MODEL.md) · [Athlete Aggregate](./ATHLETE_AGGREGATE.md) · [Observation & Signal](./OBSERVATION_SIGNAL_MODEL.md) · [Understanding Profile](./UNDERSTANDING_PROFILE_MODEL.md) · [Decision Support](./DECISION_SUPPORT_MODEL.md)*
