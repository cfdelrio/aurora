# Spec 003 — Hypothesis Lifecycle & EvidenceCase

> How Aurora turns something that may matter into evidence for a falsifiable claim — without pretending it has found truth.
>
> Behavioral specification for the first **reasoning** slice. Not implementation; no changes to existing code.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code) |
| **Slice** | First reasoning slice — `Signal → EvidenceCase → Hypothesis` |
| **Module** | **`reasoning`** (new bounded context — Evidence + Impact subdomains; [CRM 001](../domain-modeling/CORE_REASONING_MODEL.md)) |
| **Builds on** | [Spec 002](./002-signal-detection.md) + Implementation 002 (Signal is the input) |
| **Produces** | `Hypothesis` (aggregate root), `EvidenceCase` (entity inside it), lifecycle, confidence, falsifiers |
| **Explicitly produces nothing downstream** | no `UnderstandingProfile`, `DecisionSupportCase`, `VoiceMode`, recommendation, warning, `AthleteDecision` |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict shape, where the `reasoning` module sits, enforcement detail) follows separately, mirroring Spec 001 → 001A and Spec 002 → 002A. Implementation does not begin from this document.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/model. |
| **[DECISION]** | A specification commitment. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open, does not block. |

---

## 1. Summary & Central Question

[FACT] **Central question:** *How can Aurora attach Signals to falsifiable Hypotheses as EvidenceCases without turning inference into fact, confidence into certainty, or evidence into decision support?*

[FACT] This is the **first step into the `reasoning` module**. Until now Aurora could record (Spec 001) and notice possible relevance (Spec 002). This slice adds the first *claim*: a `Signal` becomes `Evidence` — but **only** by being attached to a specific, falsifiable `Hypothesis` through an `EvidenceCase`.

[ASSUMPTION] **Guiding sentence:** *A Signal does not become Evidence by being strong. It becomes Evidence only when attached to a falsifiable Hypothesis — with traceability, direction, and explicit limits.* The whole spec defends that sentence.

---

## 2. Core Principle

[FACT]
- A `Signal` is only a **candidate** for reasoning.
- A `Signal` becomes `Evidence` **only** when attached to a specific `Hypothesis` through an `EvidenceCase`.
- A `Hypothesis` is **not a fact**. It is a revisable claim with: explicit supporting evidence, explicit weakening/contradictory evidence, explicit uncertainty, explicit falsifiers, an explicit lifecycle state, and traceability back to Signals and Observations.

[FACT] (Evidence Model) Every Aurora claim about impact is, by nature, a *hypothesis* — because impact is unobservable. The question is never "fact or hypothesis?" but "how well-supported is this hypothesis, and what would change my mind?"

---

## 3. Scope & Non-Scope

### In scope
[DECISION] Creating a `Hypothesis`; `Hypothesis` as aggregate root; `EvidenceCase` as entity inside `Hypothesis`; attaching a `Signal` as an `EvidenceCase`; classifying evidence **direction**; preserving traceability `EvidenceCase → Signal → Observation → ObservationSet`; tracking the **lifecycle**; supporting / weakening / contradicting / falsifying / retiring / promoting; **confidence as claim-specific** (not athlete-understanding); explicit **falsifiers**; **revision** when new evidence arrives.

### Out of scope
[FACT] `UnderstandingProfile` updates; `DecisionSupportCase`; `VoiceMode`; recommendations; warnings; athlete-facing advice; `AthleteDecision`; `ImpactAssessment` projection *implementation*; database schema; API; UI; ML models; scoring formulas; Garmin/FIT parsing; production implementation.

[ASSUMPTION] Crucially, **promotion of understanding is out of scope.** A hypothesis "promoted to working knowledge" here is a *reasoning-internal* lifecycle state — it does **not** touch `UnderstandingProfile` (that is Spec 004, and the Understanding Model insists understanding rises only from *tested hypothesis outcomes over time*, consumed there, not written here).

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] This slice must preserve (from CRM 001, Evidence Model, Observation & Signal Model, Domain Modeling index):

1. A `Signal` is **not Evidence** until attached to a `Hypothesis`.
2. `EvidenceCase` is **not an aggregate root**.
3. `Hypothesis` **is the aggregate root** for reasoning claims.
4. `Hypothesis` must remain **falsifiable**.
5. `Hypothesis` must remain **revisable**.
6. Evidence must preserve **traceability** back to `Signal` and `Observation`.
7. Evidence **direction** must be explicit: supports, weakens, contradicts, falsifies, or contextualizes.
8. Evidence **quality and limitations** must travel from upstream.
9. **Source conflict** must not be hidden.
10. **Confidence belongs to a claim**, not to global athlete understanding.
11. Confidence must **never** be presented as certainty.
12. **Falsified hypotheses remain traceable**, not deleted.
13. **No `UnderstandingProfile`** is updated in this slice.
14. **No `DecisionSupport`** is generated in this slice.
15. **No recommendation** is generated in this slice.

[ASSUMPTION] Rules 1, 4, 11, 13–15 are the *defining* constraints — the slice's correctness is judged first by what it refuses (no evidence without a falsifiable hypothesis; no certainty; no understanding/decision/recommendation).

---

## 5. Key Concepts (behavioral definitions)

### 5.1 Hypothesis *(aggregate root)*
[DECISION] A **falsifiable, revisable claim** about a possible impact, state relation, response pattern, or interpretation.

**A Hypothesis includes:**
- the **claim** (what is asserted, as defeasible);
- **scope** (what it covers / does not);
- **athlete reference** (whose claim it is);
- **purpose-context reference** (if relevant — a snapshot ref, read-only; the Athlete owns purpose);
- **lifecycle state** (§5.4);
- **evidence cases** (its `EvidenceCase`s);
- **confidence** (claim-specific; §5.6);
- **known limitations**;
- **explicit falsifiers** (§5.7);
- **revision history** (every transition, with cause).

**A Hypothesis must NOT be:** a fact · a diagnosis · a recommendation · an Athlete profile attribute · global understanding · decision support.

[FACT] (CRM 001) The `Hypothesis` is the **single source of truth** for one impact/reasoning claim; `ImpactAssessment` is a *projection* over hypotheses, never a separate store (its implementation is out of scope here).

### 5.2 EvidenceCase *(entity inside Hypothesis)*
[DECISION] An entity, **owned by a `Hypothesis`**, explaining **why a Signal matters to this specific claim**.

**It includes:**
- the **source `Signal` reference**;
- **traceability** to `ObservationSet`/`Observation` (inherited through the Signal's `TraceToObservation`);
- **evidence direction** (§5.3);
- **evidence quality** (carried from the Signal/observation);
- **limitations**;
- a **reasoning note** (why this bears on the claim);
- a **timestamp**;
- whether it **supports / weakens / contradicts / falsifies / contextualizes** the claim.

[FACT] (CRM 001) `EvidenceCase` exists only inside its `Hypothesis` — its invariant protects *that* claim's support, so it lives in that consistency boundary. It is **never** an aggregate of its own.

### 5.3 Evidence Direction
[DECISION] Allowed directions: **`supports` · `weakens` · `contradicts` · `falsifies` · `contextualizes`.**

[FACT] **Contradiction vs. falsification — the critical distinction:**
- A **contradiction** *challenges* the claim — it pushes against it, lowers confidence, but the claim survives as weakened.
- A **falsifier** *defeats* the claim under its **declared falsification rules** — when a falsifier is satisfied, the hypothesis moves to `falsified`.

[ASSUMPTION] `contextualizes` is for evidence that neither supports nor opposes but bears on *interpretation* (e.g., "this happened during a heatwave") — it changes how other evidence reads without itself being for/against.

### 5.4 Hypothesis Lifecycle
[DECISION] States: **`proposed` → `active` → (`supported` | `weakened` | `contradicted`) → (`falsified` | `retired` | `promoted-to-working-knowledge`)**, with revision recorded on every transition.

```
                         (a falsifiable claim is opened)
                                    │
                                    ▼
   ┌────────────┐  first evidence  ┌──────────┐  supporting, survives challenge
   │  PROPOSED  │ ───────────────► │  ACTIVE  │ ──────────────────────────────┐
   │ (claim +   │                  └────┬─────┘                                │
   │  falsifier)│                       │  evidence attached                   ▼
   └────────────┘            ┌──────────┼───────────┐            ┌────────────────────────────┐
                             ▼          ▼           ▼            │ PROMOTED-TO-WORKING-KNOWLEDGE│
                       ┌──────────┐ ┌──────────┐ ┌────────────┐ │ (survived challenge;         │
                       │SUPPORTED │ │ WEAKENED │ │CONTRADICTED│ │  NOT certainty; reversible)  │
                       └────┬─────┘ └────┬─────┘ └─────┬──────┘ └──────────────┬───────────────┘
                            │            │             │  declared falsifier   │ new contradicting
                            │            │             │  satisfied            │ evidence
                            │            ▼             ▼                       ▼
                            │      ┌───────────────────────────┐   demoted (recorded, never silent)
                            │      │        FALSIFIED           │
                            │      │ (defeated; PRESERVED,      │
                            │      │  traceable, not deleted)   │
                            │      └───────────────────────────┘
                            ▼
                       ┌───────────┐  no longer useful/current (explicit reason)
                       │  RETIRED  │  (preserved; not active support)
                       └───────────┘
```

[FACT] **Promotion ≠ certainty.** `promoted-to-working-knowledge` means the claim has survived enough challenge to be treated as reasoning-internal working knowledge — it remains **defeasible and reversible**, and it does **not** update `UnderstandingProfile` in this slice.

### 5.5 *(reserved — see Confidence below)*

### 5.6 Confidence
[DECISION] **Claim-specific.** It is the calibrated degree to which *this hypothesis's* evidence justifies *this claim* — **never** Aurora's confidence in its understanding of the athlete (that is the Understanding Model's separate quantity, Spec 004).

**Confidence may change because of:** stronger supporting evidence · contradictory evidence · source conflict · evidence quality limitations · repeated survival of falsifiers · staleness · changed purpose/context.

[FACT] Confidence **always exposes its limitations** and is **never** certainty (Evidence Model: knowledge ≠ certainty). A confidence that nothing could lower is not confidence.

### 5.7 Falsifier
[DECISION] An **explicit condition that would weaken, defeat, or require revision** of the hypothesis.

[FACT] A hypothesis **without a possible falsifier is not acceptable reasoning** (Evidence Model: a claim no observation could contradict is belief immune to evidence). [ASSUMPTION] At creation a hypothesis must declare at least one falsifier, or an explicit, recorded reason why falsification is *pending* (e.g., "falsifier depends on a retest not yet scheduled").

---

## 6. Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§8). Negative criteria are defining.

### UC1 — Create a Hypothesis
- **AC1.1** — *Given* a reasoning question, *when* a `Hypothesis` is created, *then* its **claim**, **scope**, and **≥1 explicit falsifier** (or a recorded "falsification-pending" reason) exist.
- **AC1.2** — *Given* a new `Hypothesis`, *then* initial **confidence is limited** and it is **not presented as fact**.
- **AC1.3** — *Given* creation, *then* no `EvidenceCase` is required yet (unless a policy requires one).

### UC2 — Attach Signal as supporting EvidenceCase
- **AC2.1** — *Given* a `Signal` relevant to a `Hypothesis`, *when* attached, *then* an `EvidenceCase` is created **inside** that hypothesis with direction `supports`.
- **AC2.2** — *Then* the Signal's traceability (`→ Observation → ObservationSet`) and its **quality/limitations** are preserved on the `EvidenceCase`.
- **AC2.3** — *Then* confidence **may increase but never becomes certainty**; the hypothesis stays defeasible.
- **AC2.4** — *Then* **no `UnderstandingProfile` is updated.**

### UC3 — Attach Signal as weakening / contradictory EvidenceCase
- **AC3.1** — *Given* a `Signal` that challenges a `Hypothesis`, *when* attached, *then* an `EvidenceCase` with direction `weakens` or `contradicts` is created.
- **AC3.2** — *Then* the hypothesis **state and confidence are revised**, the **contradiction remains visible** (never dropped), and the hypothesis stays traceable.

### UC4 — Falsify a Hypothesis
- **AC4.1** — *Given* a `Signal` satisfying a **declared falsifier**, *when* attached, *then* an `EvidenceCase` with direction `falsifies` is created and the lifecycle moves to `falsified`.
- **AC4.2** — *Then* the falsified hypothesis is **preserved** (not deleted), downstream consumers can **see why it died**, and it no longer acts as active support.

### UC5 — Retire a stale Hypothesis
- **AC5.1** — *Given* a hypothesis no longer useful/current, *when* retired, *then* a **retirement reason is explicit** and evidence history remains traceable.
- **AC5.2** — *Then* a `retired` hypothesis **must not be used as active support**.

### UC6 — Promote to working knowledge
- **AC6.1** — *Given* a hypothesis that survives sufficient challenge, *when* promoted, *then* the state is `promoted-to-working-knowledge`, **promotion is not certainty**, and **`UnderstandingProfile` is not updated**.
- **AC6.2** — *Then* the **promotion reason and survived challenges are recorded**, and **reversal remains possible**.

### UC7 — Preserve source conflict
- **AC7.1** — *Given* `EvidenceCase`s pointing to Signals with conflicting sources, *then* the **conflict remains visible**, confidence is **limited/reduced**, and the hypothesis **may remain active but constrained** — the conflict is **not silently resolved**.

### UC8 — Missing data as EvidenceCase
- **AC8.1** — *Given* a `Signal` derived from missing expected data, *when* attached, *then* the **missing-data origin remains traceable**, the **direction is explicit**, missing data **does not automatically support** the claim, and **limitations are explicit**.
- **AC8.2** — *Then* absence is **never read as "no impact"** (Evidence Model).

### UC9 — Self-report as EvidenceCase
- **AC9.1** — *Given* a `Signal` derived from athlete self-report, *when* attached, *then* the **original wording remains traceable** (through the Signal → SubjectiveObservation), self-report is **neither unquestioned truth nor dismissed noise**, and **quality/limitations are explicit**.

---

## 7. Explicit Forbidden Behaviors

[FACT] The implementation of this spec must **not**: treat a `Signal` as Evidence without a `Hypothesis`; create an `EvidenceCase` outside a `Hypothesis`; create unfalsifiable hypotheses; present a `Hypothesis` as fact; drop contradictory evidence; delete falsified hypotheses; hide source conflict; convert confidence into certainty; update `UnderstandingProfile`; create `DecisionSupportCase`; choose `VoiceMode`; generate recommendations; generate warnings; record `AthleteDecision`; store inferred athlete state as an `Athlete` attribute.

[DECISION] These are **testable negative requirements** (§8), not aspirations.

---

## 8. Validation Strategy

[ASSUMPTION] Tests to these acceptance criteria; **negative + dependency-boundary tests are defining.**

**Positive:**
- Create a **falsifiable** `Hypothesis`; an **unfalsifiable** one is rejected or flagged (no silent acceptance).
- Attach `Signal` as `EvidenceCase`; traceability `Signal → Observation → ObservationSet` preserved.
- Evidence **direction** recorded correctly for each case.
- Supporting evidence **changes confidence without certainty**; contradictory evidence **stays visible**.
- **Falsification** moves lifecycle and preserves the hypothesis.
- **Retired** hypotheses do **not** act as active support.
- **Promotion without certainty**; revision history records every transition's cause.
- **Source conflict** preserved; **missing-data origin** preserved; **self-report wording** preserved.

**Negative (must prove absence):**
- No `UnderstandingProfile`, `DecisionSupportCase`, `VoiceMode`, `Recommendation`, `Warning`, or `AthleteDecision` object is created.
- No `Hypothesis` is marked certain / fact; no `EvidenceCase` exists outside a `Hypothesis`.
- No falsified hypothesis is deleted; no contradiction is dropped; no source conflict silently resolved.

**Dependency-boundary:**
- `reasoning` **may depend on** `observation` (it consumes `Signal`).
- `observation` **must still NOT depend on** `reasoning` (Boundary Map §2) — re-checked over the import graph.
- `reasoning` **must not depend on** `understanding` or `decision-support` in this slice.

[ASSUMPTION] The negative + boundary tests are the contract that *Aurora reasons toward a defeasible claim without pretending it found truth*. If they cannot be written/passed, the model is wrong.

---

## 9. Relationship To Implementation 002

[FACT] This slice **builds on, and does not change,** Implementation 002:
- `Signal` is the **input to reasoning**.
- A `Signal` **remains not-evidence** until attached to a `Hypothesis`.
- Signal **traceability** is preserved into the `EvidenceCase`.
- Signal **quality and salience** travel into the `EvidenceCase`.
- A `SignalRejection` **does not enter** a hypothesis as evidence (only `Signal`s do).
- The `observation` module **remains upstream and must not know about reasoning** (`observation ⇏ reasoning`).

[DECISION] No edits to Spec 002 files or to the `observation` module source. The `reasoning` module is **new and additive**; it imports the `observation` Signal surface (read-only) and `shared-kernel`.

---

## 10. Out-of-Scope Follow-Up Specs

[ASSUMPTION]
- **Spec 004 — Understanding Update from Hypothesis Lifecycle** (where promoted/falsified/surprised outcomes finally move `UnderstandingProfile`).
- **Spec 005 — DecisionSupportCase Gate & Voice Selection.**
- **Spec 006 — First End-to-End Responsible Reflection.**
- **Spec 007 — Athlete Purpose Change and Reasoning Reinterpretation.**

---

## 11. Open Questions (do not block this spec)

[QUESTION]
- Exact confidence representation (qualitative vs. calibrated — likely qualitative first; no scoring formula).
- Exact promotion threshold (what "sufficient challenge" means concretely).
- Whether "working knowledge" is a `Hypothesis` lifecycle state or a projection. *([ASSUMPTION] a lifecycle state here; a projection view may come later.)*
- How falsifiers are represented (declarative condition shape) — tech-spec concern.
- How much purpose context belongs inside a `Hypothesis` (a snapshot reference vs. richer).
- How stale hypotheses decay (and whether decay is automatic).
- Whether an `EvidenceCase` can aggregate multiple `Signal`s, or is one-Signal-per-case.
- Event names for lifecycle transitions.
- First concrete hypothesis type to implement (likely a simple impact/response claim driven by an "above-expected" Signal).
- Compile-time vs. runtime enforcement depth (carried from Boundary Map §11).

[ASSUMPTION] None block the behavioral spec: Aurora can open a falsifiable claim, attach signals as directional evidence with preserved traceability/quality/conflict, revise across the lifecycle, and refuse certainty/understanding/decision — regardless of how the above resolve.

---

## 12. Success Criterion

> **"How does Aurora turn something that may matter into evidence for a falsifiable claim without pretending it has found truth?"**

[ASSUMPTION] Answerable from this spec: Aurora opens a `Hypothesis` — a defeasible claim with scope, an athlete reference, and **at least one explicit falsifier** — and a `Signal` becomes `Evidence` **only** by being attached as an `EvidenceCase` *inside* that hypothesis, carrying explicit **direction** (supports/weakens/contradicts/falsifies/contextualizes) and the Signal's preserved **traceability, quality, and limitations**. Confidence is **claim-specific** and **never certainty**; contradiction stays visible; a satisfied falsifier moves the claim to `falsified` but never deletes it; promotion to working knowledge is reversible and **does not touch `UnderstandingProfile`**. And it pretends nothing because a hypothesis is structurally a *revisable claim with a falsifier*, the reasoning module produces **no** understanding/decision/recommendation object, and `observation` still cannot depend on `reasoning` — proven by negative and boundary tests. A claim is reasoned toward; truth is never declared.

---

## Known Risks

[ASSUMPTION]
- **Risk:** a hypothesis quietly becomes "fact" via an over-confident state. **Defense:** invariant 11 + AC: no certainty; confidence always exposes limitations; promotion ≠ certainty.
- **Risk:** an `EvidenceCase` leaks out as its own aggregate. **Defense:** invariant 2 + a test that no `EvidenceCase` exists/constructs outside a `Hypothesis`.
- **Risk:** promotion silently writes to understanding. **Defense:** invariant 13 + negative test (no `UnderstandingProfile` object touched); Spec 004 owns that path.
- **Risk:** `reasoning` reaches "down" and mutates observations, or `observation` reaches "up". **Defense:** Signals are read-only inputs; dependency-boundary test (`observation ⇏ reasoning`).
- **Risk:** falsified/retired hypotheses keep acting as support. **Defense:** AC4.2 / AC5.2 + tests that such states are excluded from active support.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the third Specification and the first into the reasoning module. It defines the behavioral contract for the hypothesis lifecycle and EvidenceCase; it defers the technical spec, persistence, understanding, and decision support to later specs.*

*Inputs: [Spec 001](./001-observation-set-intake.md) · [Spec 002](./002-signal-detection.md) · [Tech Spec 002A](./002-signal-detection-tech.md) · [Core Reasoning Model](../domain-modeling/CORE_REASONING_MODEL.md) · [Observation & Signal Model](../domain-modeling/OBSERVATION_SIGNAL_MODEL.md) · [Understanding Profile Model](../domain-modeling/UNDERSTANDING_PROFILE_MODEL.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Evidence Model](../domain/EVIDENCE_MODEL.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · Process: [spec-process.md](./spec-process.md)*
