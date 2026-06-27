# Spec 009 — AthleteDecision Feedback Loop

> How the athlete's actual decision — after receiving support — re-enters Aurora as *new athlete-owned fact*, learned from only by walking the same epistemic ladder, **without owning the decision, scoring obedience, or letting the outcome retroactively prove Aurora right or wrong**.
>
> Behavioral specification. Not implementation; no changes to existing code.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code) |
| **Slice** | `AthleteDecision (athlete-owned) → Observation → Signal → EvidenceCase → Hypothesis → Understanding → future DecisionSupport` |
| **Modules touched (conceptually)** | a new home for `AthleteDecision` (likely `athlete` or a future interaction/feedback module); `observation` (re-entry), `reasoning`/`understanding` (learn via the ladder), `decision-support` (references only) |
| **Builds on** | Implementations 001–008 + [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md). Replaces the `AthleteDecisionRef` placeholder with a real, athlete-owned decision. |
| **Produces (behavior)** | `AthleteDecision`, `DecisionRationale`, `DecisionOutcome` (later, separate), `DecisionFeedback` re-entry, and a `SupportQuality` review that ignores outcome |
| **Explicitly does not produce** | UI, API, DB, event bus, LLM, compliance/obedience scoring, training-plan changes, automatic judgement, or an `Understanding` update direct from a decision |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict shape — where `AthleteDecision` lives, whether `DecisionOutcome` is a specialized `Observation`, the re-entry seam) follows separately as 009A, as with 001A–008A. Implementation does not begin from this document.

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

[FACT] **Central question:** *How should Aurora incorporate what the athlete actually decided and did after receiving support — without treating the decision as obedience, without owning the decision, and without using the outcome to retroactively justify or condemn the support?*

[FACT] The reasoning core is complete and the loops for purpose-change (007) and projection freshness (008) are partly exercised. The remaining unexercised loop is the **decision feedback loop**: today `DecisionSupportCase` carries an `AthleteDecisionRef` (`decisionId`, `at`, optional `divergedFromSupport`), but the domain has not specified *what the decision is*, *who owns it*, or *how it re-enters reasoning*. This slice specifies that — closing the cycle the Foundation named (*the athlete's decision becomes future observation*).

[ASSUMPTION] **Guiding sentence:** *The athlete's decision is not Aurora's output and not a verdict on Aurora — it is a new athlete-owned fact Aurora may learn from only by sending it back up the same ladder.*

---

## 2. Core Principle

[FACT]
- The athlete's decision is **not Aurora's output**, **not compliance**, **not proof Aurora was right**, and **not proof Aurora was wrong**.
- It is a **new athlete-owned fact** about what the athlete chose — possibly with rationale, context, and a later outcome.
- Aurora may learn from it **only by bringing it back through the same epistemic ladder**:
  `AthleteDecision → Observation → Signal → EvidenceCase → Hypothesis → Understanding update → future DecisionSupport`.
- **Aurora must not skip the ladder.**

[ASSUMPTION] The safety asymmetry carried from the whole system: a decision (or its outcome) can prompt **more caution, better questions, or a new falsifiable hypothesis** — it can never, by itself, *raise* Aurora's assertiveness or *retroactively validate* a past output.

---

## 3. Scope & Non-Scope

### In scope
[DECISION] `AthleteDecision` as an athlete-owned record; its relation to `DecisionSupportCase`; `AthleteDecisionRef`; `DecisionRationale`; decision context; `DecisionOutcome` as a *separate, later* observation; decision feedback re-entering the observation/reasoning pipeline; the difference between **decision quality**, **support quality**, and **outcome**; how future understanding may learn from decisions (only via the ladder); how agency is preserved *after* the decision; how *not following* Aurora is treated safely; how support can be reviewed **without obedience scoring**.

### Non-Scope
[FACT] UI for collecting decisions; API endpoints; database schema; event bus; notification delivery; LLM copy generation; training-plan generation; automatic judgement of athlete choices; automatic compliance scoring; automatic reward optimization; production persistence; full `athlete` module expansion; coach-marketplace behavior.

[DECISION] **No existing module source is modified by this spec.** It defines behavior a future slice implements, building on the real seam: `decision-support` already has an `AthleteDecisionRef` (referenced, never owned) and `recordAthleteDecisionRef`, and `SupportQuality` is already integrity-not-outcome.

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] This slice must preserve (from the Decision Support Model, Athlete Aggregate, Understanding Profile Model, Core Reasoning Model, and the Foundation's agency principle):

1. **`AthleteDecision` is owned by the athlete, not by `DecisionSupportCase`.**
2. **`DecisionSupportCase` may reference `AthleteDecision`, but must not own it.**
3. **`AthleteDecision` is append-only once recorded** — corrections supersede or amend, never overwrite.
4. **`AthleteDecision` may become `Observation`, but not `Evidence` directly.**
5. **`AthleteDecision` outcome is distinct from the `AthleteDecision` itself.**
6. **A good outcome does not prove good decision support.**
7. **A bad outcome does not prove bad decision support.**
8. **`SupportQuality` is judged by integrity at the time of support, not by outcome.**
9. **`DecisionQuality` is not reducible to outcome.**
10. **Not following Aurora is not failure.**
11. **Following Aurora is not obedience success.**
12. **Athlete rationale is evidence, not noise.**
13. **Aurora must not shame, score, or coerce the athlete based on the decision.**
14. **`AthleteDecision` may inform future hypotheses only through a traceable `EvidenceCase`.**
15. **Future `DecisionSupport` may consider decision patterns only with uncertainty and agency preserved.**

[ASSUMPTION] The *defining* invariants are **1, 4, 6–8, 13, 14** — together they make "Aurora owns/grades the decision" and "the outcome graded the advice" structurally impossible: the decision is the athlete's, it re-enters only as observation (never evidence-by-fiat), support quality is fixed at support time, and learning is gated behind a traceable evidence case.

---

## 5. Key Concepts (behavioral definitions)

### 5.1 AthleteDecision
[DECISION] A record that the athlete made a choice in response to a context.

**It may reference:** the `DecisionSupportCase`; the `DecisionOpportunity`; the current `PurposeVersionRef`; the chosen action; not-chosen alternatives (if known); the athlete's rationale; the decision time; the source; the report's confidence/uncertainty; context limitations.

**It must NOT include:** a compliance score; an obedience flag; a moral judgement; automatic correctness; a hidden system reward; inferred athlete state.

[FACT] The existing `AthleteDecisionRef.divergedFromSupport` is a **neutral factual flag** (the athlete chose differently than the support framed) — **not** a compliance/obedience score; it carries no valence and feeds no reward.

### 5.2 AthleteDecisionRef
[DECISION] A reference to an `AthleteDecision` from another aggregate or read model (e.g. `DecisionSupportCase`). It **must not imply ownership** — it is a handle recorded after the fact.

### 5.3 DecisionRationale
[DECISION] The athlete's *stated reason* for the choice. It may include: preference; perceived risk; fatigue concern; purpose alignment; emotional state; external constraints; uncertainty; disagreement with Aurora. **Rationale is an observation/evidence *candidate*, not final truth** (it travels the ladder like any self-report — fallible, irreplaceable, never noise).

### 5.4 DecisionOutcome
[DECISION] A *later* observation about what happened after the decision — e.g. completed/skipped/modified the session; symptoms changed; performance changed; reported satisfaction or regret; **or no outcome data available**. **Outcome is not the decision**, and **"no outcome" is first-class** (absence of evidence ≠ evidence of absence).

### 5.5 SupportQuality
[FACT] Whether Aurora's support honored **traceability, uncertainty, purpose, risk, freshness, and agency at the time** — already implemented as integrity-not-outcome. **`SupportQuality` is not outcome quality**, and a review may *not* use outcome as its criterion.

### 5.6 DecisionFeedback
[DECISION] The *process* by which an `AthleteDecision` and any later `DecisionOutcome` re-enter the reasoning loop **through `Observation`**. It is **not** a direct update to `Understanding` (understanding still updates only from tested hypothesis outcomes) and **not** a direct `Evidence` write.

---

## 6. Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§8). Negative criteria are defining.

### UC1 — Record AthleteDecision after DecisionSupport
- **AC1.1** — *Given* Aurora produced `DecisionSupport`, *when* the athlete later records what they chose, *then* the `AthleteDecision` is recorded **separately** from the `DecisionSupportCase`, the case may reference it via `AthleteDecisionRef`, the case **does not own or mutate** it, and the decision can be **represented as an `Observation`** for future reasoning.

### UC2 — Athlete follows support
- **AC2.1** — *Given* the athlete chooses the action Aurora framed/recommended, *when* recorded, *then* the decision is captured as a choice, **no obedience score** is produced, it **does not prove the support correct**, and it may become evidence about preference/trust/feasibility/purpose-alignment **only through reasoning**.

### UC3 — Athlete does not follow support
- **AC3.1** — *Given* the athlete chooses differently, *when* recorded, *then* it is **not treated as failure**, Aurora **does not shame or penalize**, the rationale may reveal missing context / purpose mismatch / risk concern / constraint, and future support may become **more cautious or ask better questions**.

### UC4 — Athlete modifies support
- **AC4.1** — *Given* the athlete partially follows, adapts, or combines options, *when* recorded, *then* the decision captures the chosen action **and the modification**, the modification is treated as **meaningful information**, and **no binary followed/not-followed score** is produced.

### UC5 — Later outcome arrives
- **AC5.1** — *Given* new observations arrive after the decision, *when* recorded, *then* the **outcome is separate** from the `AthleteDecision`, it may support/weaken **future** hypotheses, it **does not retroactively** make prior support valid/invalid by itself, and it is linked **traceably** to the decision context if known.

### UC6 — SupportQuality review
- **AC6.1** — *Given* a prior `DecisionSupportCase` is reviewed after the decision/outcome, *when* evaluated, *then* the review judges whether **support honored its gates at the time**, may identify missing context or weak traceability, **does not judge the athlete**, and **does not use outcome as the sole criterion**.

### UC7 — Decision pattern becomes hypothesis
- **AC7.1** — *Given* multiple decisions suggest a pattern, *when* Aurora considers it, *then* it may **open a falsifiable `Hypothesis`**, the pattern is **not** a personality label, evidence stays **traceable** to decisions/observations, and the understanding update stays **dimension-specific**.

### UC8 — Decision reveals purpose ambiguity
- **AC8.1** — *Given* an athlete decision conflicts with the declared purpose, *when* processed, *then* Aurora **does not overwrite purpose**, it may create an **`Inquiry` or a hypothesis about the mismatch**, and any **purpose change still requires athlete declaration/acceptance** (Spec 007).

---

## 7. Explicit Forbidden Behaviors

[FACT] The implementation of this spec must **not**: let `DecisionSupportCase` own `AthleteDecision`; overwrite `AthleteDecision` history; treat the decision as `Evidence` directly; treat the outcome as proof of advice correctness; score obedience; score noncompliance; shame the athlete; reward agreement with Aurora; penalize disagreement with Aurora; label the athlete from a decision pattern; overwrite declared purpose from behavior; update `UnderstandingProfile` directly from an `AthleteDecision`; generate training changes automatically; add UI/API/DB/LLM/event-bus behavior.

[DECISION] These are **testable negative requirements** (§8).

---

## 8. Validation Strategy

[ASSUMPTION] Tests to these acceptance criteria; **negative + dependency-boundary tests are defining.**

**Positive:**
- `AthleteDecision` is recorded **separately** from `DecisionSupportCase`; the case stores only an `AthleteDecisionRef`;
- an `AthleteDecision` can be **represented as an `Observation`** for future reasoning;
- append-only / supersession behavior (a correction supersedes, the original remains);
- a followed decision records the choice with **no obedience score**;
- a not-followed decision records it with **no failure/shame marker**;
- a modified decision preserves the modification with **no binary compliance**;
- `DecisionOutcome` is recorded **separately** from `AthleteDecision`; "no outcome" is representable;
- a `SupportQuality` review evaluates gates-at-the-time, not outcome.

**Negative (must prove absence):**
- `DecisionSupportCase` never **owns/mutates** an `AthleteDecision`;
- an `AthleteDecision` is never turned into `Evidence` **without** a `Hypothesis` + traceable `EvidenceCase`;
- a good/bad outcome **does not** set `SupportQuality`;
- a decision pattern **never** becomes a fixed athlete label (only a falsifiable hypothesis);
- declared purpose is **never** overwritten from decision behavior;
- `UnderstandingProfile` is **never** updated **directly** from an `AthleteDecision`;
- no compliance/obedience/reward score is produced anywhere;
- no UI/API/DB/LLM/event-bus/training-plan artifact.

**Dependency-boundary:**
- whichever module owns `AthleteDecision` (likely `athlete`) stays an **upstream leaf** — it must not import `reasoning`/`understanding`/`decision-support`; the decision re-enters downstream only via `observation` and explicit adapters;
- existing upstream→downstream and `athlete ⇏ downstream` boundaries stay green;
- **all Implementation 001–008 tests continue to pass.**

[ASSUMPTION] The negative + boundary tests are the contract that *the decision stays the athlete's, re-enters only via the ladder, and the outcome never grades the advice*. If they cannot be written/passed, the model is wrong.

---

## 9. Relationship To Existing Core

[FACT] This slice builds on, and does not change, Implementations 001–008:
- **`decision-support`** already has `AthleteDecisionRef` + `recordAthleteDecisionRef` (referenced, never owned) and a `SupportQuality` that is integrity-not-outcome — this slice gives the *referent* real shape and a re-entry path.
- **`observation`** can record athlete-reported decisions and outcomes as `SubjectiveObservation`s (the existing intake path; `DecisionOutcome` may be a specialized observation — deferred to 009A).
- **`reasoning`** can turn decision-derived signals into `EvidenceCase`s **only inside a `Hypothesis`** (the ladder is unchanged).
- **`understanding`** learns **only from reasoning outcomes** — never directly from a decision.
- **`athlete`** owns declared `Purpose`, not behavioral inference — a decision conflicting with purpose triggers inquiry/hypothesis, never an overwrite (Spec 007).
- **projection freshness** (Spec 008) may be affected by new decision/outcome observations (a `RefreshTrigger` such as `new-contradictory-evidence`), constraining future support — only ever toward caution.
- **future `DecisionSupport`** may consider decision-derived understanding only **through the gates and the voice ceiling**.

[DECISION] No edits to 001–008 source. `AthleteDecision` and the re-entry adapters are **additive**; the decision re-enters via `observation`, never by a downstream module reaching into the athlete's record.

---

## 10. Open Questions (do not block this spec)

[QUESTION]
- the exact **module ownership** of `AthleteDecision` (inside `athlete`, or a future interaction/feedback module);
- whether `DecisionOutcome` is a **specialized `Observation`** type;
- how to **reference `DecisionSupportCase` from `AthleteDecision`** without coupling modules;
- whether decision feedback becomes a **domain event** later;
- how **persistence** retains decision/outcome history;
- how **UI** collects rationale without biasing the athlete;
- how to distinguish **action taken** from **action intended**;
- how repeated decisions should **influence understanding safely**;
- how to **avoid behavioral labeling** over time.

[ASSUMPTION] None block the behavioral spec: Aurora can record an athlete-owned, append-only decision (with rationale), keep a later outcome separate, let both re-enter only through `observation`, review support by its gates-at-the-time, and learn only via traceable hypotheses — regardless of how these resolve. Technical-implementation questions are deferred to 009A.

---

## 11. Success Criterion

> **"How does the athlete's decision return to Aurora as learning material without becoming obedience tracking or proof that Aurora was right?"**

[ASSUMPTION] Answerable from this spec: an `AthleteDecision` is recorded as an **athlete-owned, append-only** fact (chosen action, optional alternatives, rationale, context, source, uncertainty), **referenced — never owned** — by the `DecisionSupportCase`. It re-enters reasoning **only as an `Observation`** (not `Evidence`), travels the unchanged ladder, and may inform future hypotheses **only through a traceable `EvidenceCase`**; `Understanding` is never updated directly from it. A later `DecisionOutcome` is a **separate** observation (and "no outcome" is first-class) that may move **future** hypotheses but **never retroactively grades** the support — `SupportQuality` stays integrity-at-the-time. **Following Aurora is not obedience-success and not-following is not failure**; modifications are meaningful, not binary; rationale is evidence, not noise; patterns become **falsifiable hypotheses**, never labels; and a purpose conflict yields **inquiry**, never an overwrite. Aurora learns from what the athlete did — without ever owning it, scoring it, or letting the result prove it right.

---

## Known Risks

[ASSUMPTION]
- **Risk:** the decision quietly becomes a compliance/obedience metric. **Defense:** invariants 10,11,13 + UC2/UC3/UC4 — no score produced; `divergedFromSupport` is a neutral fact; negative tests.
- **Risk:** the outcome retroactively grades the advice. **Defense:** invariants 5–8 + UC5/UC6 — outcome separate; `SupportQuality` is integrity-at-the-time; negative tests.
- **Risk:** the decision short-circuits the ladder into `Evidence`/`Understanding`. **Defense:** invariants 4,14 + §6 — re-enters as observation only; understanding via reasoning outcomes only; negative tests.
- **Risk:** a decision pattern becomes a personality label. **Defense:** invariant 15 + UC7 — patterns are falsifiable hypotheses, dimension-specific, traceable.
- **Risk:** behavior overwrites declared purpose. **Defense:** invariant (Spec 007) + UC8 — inquiry/hypothesis, never overwrite.
- **Risk:** the owner of `AthleteDecision` reaches downstream. **Defense:** dependency-boundary test (the owning module stays an upstream leaf; re-entry via `observation`).

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the ninth Specification. It closes the decision feedback loop: the athlete's decision returns as athlete-owned observation, learned from only via the ladder, never owned, scored, or used to grade past support; it defers `AthleteDecision`'s module home, `DecisionOutcome`'s shape, persistence, events, and UI to later specs.*

*Inputs: [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [System Map](../diagrams/SYSTEM_MAP.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Decision Support Model](../domain-modeling/DECISION_SUPPORT_MODEL.md) · [Athlete Aggregate](../domain-modeling/ATHLETE_AGGREGATE.md) · [Understanding Profile Model](../domain-modeling/UNDERSTANDING_PROFILE_MODEL.md) · [Core Reasoning Model](../domain-modeling/CORE_REASONING_MODEL.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 006](./006-end-to-end-responsible-reflection.md) · [Spec 007](./007-athlete-purpose-change-reinterpretation.md) · [Spec 008](./008-projection-refresh-staleness-strategy.md) · Process: [spec-process.md](./spec-process.md)*
