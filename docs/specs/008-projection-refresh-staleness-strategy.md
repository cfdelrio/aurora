# Spec 008 — Projection Refresh and Staleness Strategy

> How Aurora keeps derived read models honest: a projection is a *view*, never a fact. When its sources change it must refresh from source, be marked stale, constrain downstream use, or withhold stronger output — but it must never silently become domain truth.
>
> Behavioral specification. Not implementation; no changes to existing code.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code) |
| **Slice** | `Projection (derived view) → freshness/staleness → refresh-from-source or constrained downstream use` |
| **Modules touched (conceptually)** | `understanding` (owns `UnderstandingAssessment`), `decision-support` (consumes freshness), `reasoning`/`observation`/`athlete` (sources of refresh/invalidation triggers) |
| **Builds on** | Implementations 001–007 + [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md). Generalizes the **selective purpose-change staleness** Impl 007 introduced. |
| **Produces (behavior)** | projection identity + source references, an explicit `ProjectionFreshness`, `StalenessReason`/`RefreshTrigger` taxonomies, a `RefreshPolicy` contract, and freshness-aware downstream gating |
| **Explicitly does not produce** | DB/persistence, cache infra, event bus, background jobs, a full projection engine, UI, API, LLM, or `ImpactAssessment` itself |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict shape — a generic projection envelope vs. per-module freshness, retention without persistence, sync vs. queued refresh) follows separately as 008A, as with 001A–007A. Implementation does not begin from this document.

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

[FACT] **Central question:** *How should Aurora refresh or invalidate derived projections when underlying evidence, hypotheses, understanding, purpose, or context changes — without letting stale projections become domain truth?*

[FACT] Aurora already has projection-like outputs — most concretely `UnderstandingAssessment` (a read model carrying `level`, `fragility`, `staleness`, `safeVoiceCeiling`, `reasons`, and a `trace` to hypothesis outcomes), and conceptually a future `ImpactAssessment` and athlete-facing summaries. These are *useful* and *consumable*, but the next architectural risk is exactly the one the Domain Modeling index named the most dangerous misreading: **a projection quietly becoming a stored fact** (Boundary Map failure mode #1).

[ASSUMPTION] **Guiding sentence:** *A projection is a derived view, never a source of truth. When its sources change, Aurora refreshes it from source, marks it stale, constrains its use, or withholds — but never silently treats an old view as current fact.*

---

## 2. Core Principle

[FACT]
- A projection is a **derived view**. It may be useful, consumed, and (later) cached — but it is **never the source of truth**.
- When the sources behind a projection change, Aurora must do one of: **refresh from source**, **mark stale**, **constrain downstream use**, or **withhold stronger outputs**.
- **Refresh = recompute from sources**, not edit the old result in place.
- **Aurora must never silently treat an old projection as current fact.**

[ASSUMPTION] The safety asymmetry (consistent with staleness and purpose-change today): a freshness change can only push Aurora **toward caution** — lower the voice, force inquiry, or withhold. Stale or partial data may **never** raise assertiveness.

---

## 3. Scope & Non-Scope

### In scope
[DECISION] projection identity + source references; projection freshness; staleness; refresh triggers; invalidation triggers; selective refresh; how staleness affects `UnderstandingAssessment`; how staleness affects `DecisionSupportCase` and `VoiceSelectionPolicy`; how purpose changes interact with projection freshness; how superseded observations or revised hypotheses affect projections; how downstream modules expose stale/limited status; how projections stay traceable to source artifacts.

### Non-Scope
[FACT] database schema; persistence implementation; event bus implementation; cache infrastructure; background jobs; UI rendering; API endpoints; LLM copy generation; notification delivery; Garmin/FIT import; production scheduler; a full projection engine; training-plan generation. (Introducing `ImpactAssessment` as a concrete projection is out of scope here — this spec governs *how any projection behaves*, not which new ones exist.)

[DECISION] **No existing module source is modified by this spec.** It defines behavior a future slice implements, building on real seams: `UnderstandingAssessment` already carries `staleness` + `trace`; `deriveSafeVoiceCeiling` already lowers the ceiling when stale; `markUnderstandingStale("purpose-change")` already stales selectively; the decision-support `TraceabilityVerification` already returns a status the policy consults.

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] This slice must preserve (from the Boundary Map §5/§12, Understanding Profile Model, Decision Support Model, Athlete Aggregate):

1. **A projection is not a source of truth.**
2. **A projection must reference the source artifacts used to derive it.**
3. **Projection freshness must be explicit.**
4. **A stale projection must be visible to downstream consumers.**
5. **A stale projection must not silently enable a stronger voice.**
6. **Projection refresh recomputes from sources; it does not edit history.**
7. **Projection invalidation does not delete source artifacts.**
8. **Purpose changes may stale affected projections.**
9. **Hypothesis revision may stale affected projections.**
10. **Observation supersession may stale affected projections.**
11. **Source-quality changes may stale affected projections.**
12. **Time alone may stale projections when recency matters.**
13. **Staleness is selective, not global by default.**
14. **A stale `UnderstandingAssessment` may lower `SafeVoiceCeiling`.**
15. **DecisionSupport must not recommend from a stale or invalid projection** unless explicitly allowed by gates and traceability.
16. **Projection consumers must know whether they are consuming a current, stale, partial, or invalid projection.**

[ASSUMPTION] The *defining* invariants are **1, 5, 6, 13, 15** — together they make "an old view became a fact" and "any change nukes everything" both structurally visible: a projection is always labeled and source-linked, refresh is recomputation (so the old view is never silently mutated into a new truth), staleness is selective, and stale data can never buy a recommendation.

---

## 5. Key Concepts (behavioral definitions)

### 5.1 Projection
[DECISION] A **derived read model** produced from domain sources. Examples: `UnderstandingAssessment` (today), a future `ImpactAssessment`, future athlete-facing summaries, future decision-support read views.

**A projection includes:** a **derived-at** time; **source references**; a **freshness status**; **limitations**; **traceability**; and the **owner module**.

**A projection must NOT include:** new domain truth; a hidden inference source; untraceable claims; or overwritten source state.

### 5.2 ProjectionSourceReference
[DECISION] A reference to the artifacts a projection was derived from — e.g. `Hypothesis` id, `EvidenceCase` id, `Signal` id, `ObservationSet` id, `UnderstandingProfile` id, `PurposeVersionRef`, a `PurposeChanged` ref, a staleness marker, a source/provenance reference. [FACT] These are **references, not copies** — the projection points back to the truth; it does not embed and re-author it (consistent with the Boundary Map's reference-handle traceability).

### 5.3 ProjectionFreshness
[DECISION] The current usability state of a projection. Exactly five:
- **`current`** — derived from sources that have not changed since; safe to consume at full strength (still subject to the consumer's own gates).
- **`stale`** — a source changed (or time elapsed where recency matters) since derivation; **consumable only with caution/degradation**, never at full strength.
- **`partial`** — derived from incomplete or quality-limited sources; **usable but explicitly limited** (some of what it should cover is missing).
- **`invalid`** — a source it depended on was contradicted/falsified/removed such that the view no longer holds; **must not be consumed as support** (route to refresh / inquiry / withholding).
- **`unknown`** — freshness cannot be determined (e.g. a source reference cannot be resolved); **treated as not-current** (caution), never as `current`.

[FACT] Ordering for safety: `current` is the only full-strength state; `partial` and `stale` constrain; `invalid` and `unknown` forbid assertive use. Freshness can only *lower* what a consumer may do.

### 5.4 StalenessReason
[DECISION] Why a projection should be constrained. The taxonomy: `purpose-change` · `hypothesis-revised` · `hypothesis-falsified` · `observation-superseded` · `source-quality-changed` · `new-contradictory-evidence` · `time-decay` · `context-changed` · `missing-source` · `projection-source-unavailable`. [FACT] Every non-`current` freshness carries at least one reason — staleness is never anonymous (mirrors `Staleness.reason` today and the auditable-silence principle).

### 5.5 RefreshTrigger
[DECISION] A domain occurrence that *may* require refresh or staleness marking: `PurposeChanged`; a hypothesis revised; a hypothesis contradicted/falsified; a new `EvidenceCase` attached; an observation superseded; a source-quality change; an `UnderstandingProfile` marked stale; (later) `AthleteDecision` feedback; an elapsed-time threshold exceeded. [FACT] A trigger is a *candidate* cause — the `RefreshPolicy` decides the actual effect; a trigger never directly edits a projection.

### 5.6 RefreshPolicy
[DECISION] A policy that, given a projection and a trigger, decides whether the projection is: **kept current**, **marked stale**, **marked partial**, **invalidated**, **recomputed**, or **withheld from stronger downstream use**. [FACT] The policy decides *behavior*; this spec defines that behavior, not the mechanism (sync/queued/maintained is deferred to 008A). The policy must honor invariant 13 — **selective by default**: only projections whose source references intersect the trigger are affected.

---

## 6. Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§8). Negative criteria are defining.

### UC1 — Produce a current projection
- **AC1.1** — *Given* a projection derived from current sources, *when* produced, *then* freshness is **`current`**, source references are stored, the derived-at time is recorded, limitations are explicit, and downstream consumers can inspect freshness.

### UC2 — PurposeChanged stales an affected projection
- **AC2.1** — *Given* a `PurposeChanged` affecting a dimension, *when* freshness is evaluated, *then* affected projections become **stale/limited** (reason `purpose-change`), **unaffected projections remain `current`**, and **no global reset occurs**.

### UC3 — Hypothesis revised after a projection
- **AC3.1** — *Given* a projection derived from a `Hypothesis` that is later revised/weakened/contradicted/falsified, *when* the projection is evaluated, *then* it becomes **stale or invalid** (depending on the revision — falsified ⇒ `invalid`), the **prior projection remains auditable** as an old view, refresh **recomputes from the current hypothesis state**, and **no source history is overwritten**.

### UC4 — Observation superseded after a projection
- **AC4.1** — *Given* an `Observation` used (indirectly) by a projection is superseded, *when* the projection is evaluated, *then* it becomes **stale or invalid**, **traceability still reaches the old source**, refresh **uses the active/superseding observation**, and downstream consumers see the freshness limitation.

### UC5 — Source quality changes
- **AC5.1** — *Given* a source/observation quality limitation changes, *when* a dependent projection is evaluated, *then* it may become **`partial` or `stale`**, downstream **voice is constrained**, and **uncertainty remains visible**.

### UC6 — Time decay
- **AC6.1** — *Given* a projection becomes old relative to its purpose, *when* evaluated, *then* it may become **`stale` due to age**, the staleness is **dimension/context-specific**, and **not all projections decay equally**.

### UC7 — DecisionSupport consumes a stale UnderstandingAssessment
- **AC7.1** — *Given* a `DecisionSupportCase` consumes an `UnderstandingAssessment` with `stale`/`partial` freshness, *when* `VoiceSelectionPolicy` runs, *then* the voice is **constrained**, **`Recommendation` is denied unless rules explicitly permit**, **`Inquiry` or `Withholding`** may be selected, and the **degradation reason is recorded**.

### UC8 — Refresh a projection
- **AC8.1** — *Given* a stale projection, *when* it is refreshed, *then* refresh is a **recomputation from source artifacts**, the **old projection is not overwritten as if it never existed**, the new projection has a **new derived-at time** and **updated source references**, and the **prior projection remains auditable if retained**.

---

## 7. Explicit Forbidden Behaviors

[FACT] The implementation of this spec must **not**: treat a projection as a source of truth; silently use a stale projection as current; overwrite an old projection without trace; delete source artifacts on invalidation; let a stale projection enable a `Recommendation`; let a projection invent traceability; refresh by mutating the projection result rather than recomputing from sources; globally stale all projections for every trigger; let UI/LLM output become projection authority; persist projections as facts without source references; bypass aggregates/gates because a projection exists.

[DECISION] These are **testable negative requirements** (§8).

---

## 8. Validation Strategy

[ASSUMPTION] Tests to these acceptance criteria; **negative + dependency-boundary tests are defining.**

**Positive:**
- a projection records **source references** and a **derived-at** timestamp;
- freshness is **`current`** when no source changed;
- **`PurposeChanged` selective staleness** — affected stale, unaffected current;
- **hypothesis-revision** staleness/invalidation;
- **observation-supersession** staleness/invalidation;
- **source-quality downgrade** → `partial`/`stale`;
- **time-decay** staleness (dimension/context-specific);
- a **stale `UnderstandingAssessment` constrains voice** (lower `SafeVoiceCeiling`);
- **refresh recomputes from sources** (new derived-at, updated refs);
- **old projection traceability remains available** after refresh.

**Negative (must prove absence):**
- a projection is never consumable as a **source of truth**;
- a stale projection **never enables a `Recommendation`**;
- refresh **never mutates the old result in place** (it recomputes);
- invalidation **never deletes source artifacts**;
- a projection **cannot invent traceability** (only references real sources);
- a single trigger **never globally stales** unrelated projections;
- no UI/API/DB/LLM/event-bus/persistence artifact is introduced (absent a future tech spec).

**Dependency-boundary:**
- freshness logic lives with the **owning module** of each projection (`understanding` for `UnderstandingAssessment`); consumers (`decision-support`) **read** freshness, never set it;
- the existing upstream→downstream direction and `athlete ⇏ downstream` boundaries stay green;
- **all Implementation 001–007 tests continue to pass.**

[ASSUMPTION] The negative + boundary tests are the contract that *a projection stays a view, refresh is recomputation, and stale never buys strength*. If they cannot be written/passed, the model is wrong.

---

## 9. Relationship To Existing Core

[FACT] This slice builds on, and does not change, Implementations 001–007:
- **`observation`** owns source facts and supersession (an observation is superseded, never overwritten) — a supersession is a `RefreshTrigger`.
- **`reasoning`** owns the hypothesis lifecycle and revisions — a revision/contradiction/falsification is a `RefreshTrigger`.
- **`understanding`** owns `UnderstandingProfile` and `UnderstandingAssessment`; the assessment **already carries `staleness` + `trace`**, and `deriveSafeVoiceCeiling` **already lowers the ceiling when stale** — this slice formalizes the freshness contract around it.
- **`decision-support`** **consumes** freshness-constrained assessments; `VoiceSelectionPolicy`/`TraceabilityVerification` already degrade/withhold — this slice makes freshness an explicit input it must honor.
- **`athlete`** owns `Purpose`/`PurposeChanged`; **`PurposeChanged` already creates a reason for selective staleness** (Impl 007) — this slice generalizes that pattern to all projections.
- **`SafeVoiceCeiling` responds to stale/partial understanding** — staleness can only lower it.
- **Projections do not replace aggregates** — the aggregate remains the source of truth; the projection is a derived, labeled view of it.

[DECISION] No edits to 001–007 source. Freshness/refresh is introduced *additively*; each projection's freshness is owned by its module, consumed read-only downstream.

---

## 10. Open Questions (do not block this spec)

[QUESTION]
- the exact **projection base type** (a shared envelope vs. per-module freshness fields);
- whether projection freshness is **generic or per-module**;
- how **old projections are retained** without persistence (in-memory audit vs. nothing yet);
- whether refresh is **synchronous or queued**;
- how **deep dependency tracking** should go (direct refs vs. transitive);
- how to represent **source-quality changes** as a trigger;
- how **time-decay thresholds** are configured (per dimension/context);
- whether **`ImpactAssessment`** should be introduced before persistence;
- how projection refresh interacts with the future **event surface**;
- how **UI/LLM rendering** will consume freshness safely later.

[ASSUMPTION] None block the behavioral spec: Aurora can label a projection's freshness, reference its sources, decide refresh-vs-stale-vs-invalidate selectively, and constrain downstream use — regardless of how these resolve. Technical-implementation questions are deferred to 008A.

---

## 11. Success Criterion

> **"How does Aurora know whether a projection is still safe to consume, and what must happen when it is not?"**

[ASSUMPTION] Answerable from this spec: every projection carries a **derived-at time, source references, and an explicit `ProjectionFreshness`** (`current`/`stale`/`partial`/`invalid`/`unknown`), so a consumer always **knows** what it is consuming. When a `RefreshTrigger` (purpose change, hypothesis revision, observation supersession, source-quality change, contradiction, time decay, missing source) intersects a projection's source references, the `RefreshPolicy` **selectively** marks it stale/partial/invalid or recomputes it — **never globally, never by editing the old result**. A non-`current` projection is **visible** to downstream, can only **lower** what they may do (stale `UnderstandingAssessment` lowers `SafeVoiceCeiling`; `Recommendation` is denied from stale/invalid), and **refresh is recomputation from sources** that leaves the prior view auditable and never deletes a source artifact. A projection stays a view; the aggregate stays the truth.

---

## Known Risks

[ASSUMPTION]
- **Risk:** a useful projection quietly becomes a stored fact (Boundary Map #1). **Defense:** invariants 1,2,3,16 — always labeled, source-linked, freshness explicit; negative test that it is never a source of truth.
- **Risk:** refresh edits the old result in place, erasing the prior view. **Defense:** invariant 6 + UC8 — refresh recomputes; old view auditable; negative test that the old result is not mutated.
- **Risk:** any trigger nukes all projections (over-invalidation). **Defense:** invariant 13 + UC2 — selective by source-reference intersection; test that unaffected projections stay current.
- **Risk:** stale data is used to recommend. **Defense:** invariants 5,14,15 + UC7 — stale lowers ceiling, Recommendation denied; negative test.
- **Risk:** invalidation deletes source artifacts. **Defense:** invariant 7 — invalidation never deletes; traceability to the old source remains (UC3/UC4).
- **Risk:** a projection invents traceability it cannot back. **Defense:** invariant 2 — references real sources only; negative test.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the eighth Specification. It defines how derived projections expose freshness, refresh from source, and constrain downstream use so they never become hidden facts; it defers the projection base type, retention, refresh mechanism, persistence, event surface, and any new concrete projection to later specs.*

*Inputs: [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [System Map](../diagrams/SYSTEM_MAP.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Core Reasoning Model](../domain-modeling/CORE_REASONING_MODEL.md) · [Understanding Profile Model](../domain-modeling/UNDERSTANDING_PROFILE_MODEL.md) · [Decision Support Model](../domain-modeling/DECISION_SUPPORT_MODEL.md) · [Athlete Aggregate](../domain-modeling/ATHLETE_AGGREGATE.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Spec 004](./004-understanding-update.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 006](./006-end-to-end-responsible-reflection.md) · [Spec 007](./007-athlete-purpose-change-reinterpretation.md) · Process: [spec-process.md](./spec-process.md)*
