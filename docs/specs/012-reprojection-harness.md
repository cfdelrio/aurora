# Spec 012 — Reprojection Harness

> A controlled, auditable **recompute-and-compare** seam: given current aggregate/source state and occurrence history, it **recomputes derived views**, **recalculates freshness**, **verifies traceability**, and **reports drift** — **without** replaying the event log as a rebuild path, **without** making a projection current by assertion, and **without** mutating aggregates by default.
>
> Behavioral specification. Not implementation; no scheduler; no event sourcing; no projection repository; no changes to existing module *behavior*.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code, no scheduler, no infra) |
| **Slice** | `source/aggregate state + occurrence history → recompute derived view → recalc freshness + verify trace → report drift/findings (check-only default; no mutation)` |
| **Implements (part of)** | [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) §1.6, §7 |
| **Builds on** | Spec/Impl 008 (projection freshness) · 010 (repositories) · 011 (event records) · 004 (understanding update policy) · 005 (decision-support gates) · 009 (athlete-decision feedback) |
| **Produces (behavior)** | a `ReprojectionHarness` + `ReprojectionRun`/`Target`/`InputSet`/`Result`/`Finding`/`Mode`; recompute-and-compare semantics; freshness recalculation; traceability verification; drift reporting; the non-mutating default + the test contract |
| **Explicitly does not produce** | scheduler/cron/background jobs, event bus/queue consumers, event sourcing, aggregate rebuild from logs, a projection repository, a generic projection engine, DB/schema/migrations, API, UI, LLM, training plans, athlete notifications |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict run/result/finding shapes, the harness seam, the recompute adapters, the test layout) follows separately as **012A**. Implementation does not begin from this document, and **no scheduler, store, or transport technology is chosen here**.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture/implementation. |
| **[DECISION]** | A specification commitment for this slice. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open; does not block. |

Principal **[DECISION]**s use **Decision · Why · Consequence · Risk · Reversal Point**.

---

## 1. Summary & Central Question

[FACT] **Central question:** *How can Aurora recompute derived artifacts and detect stale or inconsistent projections without treating event records as commands, without replaying events as source truth, and without letting stored projections become domain authority?*

[FACT] This is the third executable step of the Persistence & Event Surface paper, and it closes the loop the prior two opened:
- **Impl 010** answered *"can Aurora save/retrieve aggregates without corruption?"* (state round-trip).
- **Impl 011** answered *"can Aurora record what happened without events becoming commands?"* (occurrence log).
- **Spec 012** answers *"can Aurora **recompute** derived views and **verify** consistency without turning event records into a rebuild mechanism or projections into truth?"*

[FACT] The danger this slice guards is the paper's named one for reprojection (§1.6/§7): **treating an event log as a literal re-run of understanding promotions, or manufacturing a fresher/stronger result than the sources support.** So the harness is written so that *recompute may only re-derive the same or a more cautious result*, and a corrupting reprojection — a blind replay, a projection asserted `current`, a silent overwrite — is a test failure.

---

## 2. Core Principle

[FACT] Reprojection **recomputes derived views from source artifacts and current aggregate state.** It:
- **does not decide truth** — it re-derives views; the aggregates remain the source of truth;
- **does not replay the event log as commands** — events are context/candidates, never a rebuild path;
- **does not mutate aggregates by default** — the default mode is `check-only`;
- **does not make a projection current by assertion** — freshness is *recalculated*, never granted because a run finished.

[FACT] It produces an **auditable result**: *what* was recomputed, *from what* sources, *with what* freshness, *what changed*, *what became stale/invalid/partial*, *what traceability was missing or verified*, and *what downstream voice must be constrained.*

[ASSUMPTION] The guiding sentence: *a reprojection harness is a safety mechanism, not a reasoning shortcut.* If a run can make Aurora **more** assertive than its sources justify, the harness is wrong. The **asymmetry** from Impl 008 holds here: recomputation may only re-derive the **same or more cautious** view — never a stronger claim, a higher level, or a fresher projection than the sources support.

---

## 3. Scope & Non-Scope

### In scope
[DECISION] the `ReprojectionHarness` behavior; `ReprojectionRun` (one auditable execution); `ReprojectionTarget` (what is recomputed/checked); `ReprojectionInputSet` (the explicit, traceable artifact set); `ReprojectionResult`; `ReprojectionFinding`; `ReprojectionMode` (default `check-only`); recomputation of derived artifacts (initially `UnderstandingAssessment`); **freshness recalculation** (the 5-state `ProjectionFreshness`); **traceability verification** during recompute; **drift detection** (recomputed vs. existing view); difference reporting; the **non-mutating default**; the rules for any later controlled mutation; the repositories-vs-events-vs-reprojection boundary; the test contract (§13) — all satisfiable by an **in-memory, in-process** harness used from the neutral test layer.

### Non-Scope
[FACT] production scheduler; cron; background jobs; event bus / queue / broker consumers; production projection store; generic projection engine; UI; API; LLM rendering; database schema; migrations; cloud infrastructure; **event sourcing**; **rebuilding aggregates from event logs**; automatic downstream recommendations; automatic athlete notification; training-plan generation.

[DECISION] **No scheduler, store, or transport technology is chosen.** Every contract here is satisfiable by an in-memory harness invoked by a caller/test (as Impl 008's refresh policy is caller-applied), and verified by tests. *When and how often* reprojection runs is explicitly a future concern.

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] Carried from the prompt, the persistence paper (§1.6/§7), and the module invariants. The harness must satisfy **all**:

1. **Reprojection is not event sourcing.**
2. **Event records are occurrence history, not aggregate-rebuild commands.**
3. **Aggregate repositories remain the source of current aggregate state.**
4. **Stored projections are read models/caches, not source truth.**
5. **Reprojection recomputes derived artifacts from source artifacts + aggregate state.**
6. **Reprojection preserves traceability** (it carries/verifies real refs; it invents none).
7. **Missing traceability constrains downstream use.**
8. **Reprojection recalculates freshness; it never assumes it.**
9. **A projection cannot become current merely because a run says so.**
10. **Reprojection does not mutate aggregates by default.**
11. **Reprojection does not update `UnderstandingProfile` through blind replay.**
12. **Understanding changes still require the existing transition/update policy.**
13. **Findings may mark a projection stale/invalid/partial, but must not strengthen claims by shortcut.**
14. **Reprojection must not bypass Signal → EvidenceCase → Hypothesis → Understanding.**
15. **Reprojection must not treat an `AthleteDecision` outcome as support correctness.**
16. **Reprojection must not overwrite `Purpose` from behavior.**
17. **Reprojection must not create recommendations.**
18. **Reprojection must not introduce production infrastructure.**

[ASSUMPTION] The *defining* invariants are **1, 9, 10, 11, 13** — together they make "a run rebuilt state from events, asserted a projection current, mutated an aggregate, blindly replayed understanding, or strengthened a claim by shortcut" a failing test.

---

## 5. Key Concepts (defined behaviorally)

### 5.1 ReprojectionHarness
[DECISION] A controlled **application/test seam** that recomputes derived artifacts and reports consistency/freshness findings.
- **May read:** aggregate repositories (Impl 010 ports), current domain objects, `DomainEventRecord`s (Impl 011 log), traceability refs, projection metadata (`derivedAt`/`freshness`/`sourceRefs`/`limitations`).
- **Must not:** act as an event bus; execute commands from events; rebuild aggregates from events; mutate aggregates by default; create recommendations; render user-facing text.

[DECISION] The harness is **dependency-direction-respecting**: it lives in the neutral coordination/test layer (like the existing `src/modules/__tests__/` adapters), because recomputing an `UnderstandingAssessment` and reading events/repositories spans modules — and no module may depend on all the others. It **coordinates, never reasons**: a recomputed view is produced by the **owning module's existing function** (e.g. `understanding`'s `produceUnderstandingAssessment`), never re-implemented in the harness.

### 5.2 ReprojectionRun
[DECISION] A single **auditable execution** of the harness. It records: `runId`, `startedAt`, `completedAt` (if applicable), requested **targets**, **input refs**, **event records considered**, **source artifacts considered**, **recomputed artifacts**, **findings**, **limitations**, and **errors**.
- **It is not a domain event by itself** unless a future spec says so. (A run *may* be recorded as a `DomainEventRecord` later — out of scope here.)

### 5.3 ReprojectionTarget
[DECISION] The thing being recomputed or checked. **Initial targets:** `UnderstandingAssessment`, `ProjectionFreshness`; **future:** `ImpactAssessment`, an athlete-facing read model.
- **No generic projection repository** is implemented in this spec.

### 5.4 ReprojectionInputSet
[DECISION] The **explicit, traceable** set of artifacts used for a run. May include refs to: `ObservationSet`, `Hypothesis`, `UnderstandingProfile`, `PurposeVersion`, `AthleteDecision`, `DecisionSupportCase`, `DomainEventRecord`, `ProjectionRef`.
- The input set **must be explicit and traceable** — no implicit global scan, no hidden inputs. (It reuses the existing `kind`+`id` ref handles, including the Impl 011 `EventPayloadRef`/`TraceabilityEnvelope`.)

### 5.5 ReprojectionResult
[DECISION] The output for one target: `target`, **recomputed view or summary**, **freshness result** (5-state), **source refs**, **traceability status**, **differences from the existing view** (if compared), **limitations**, and a **recommended safe action category** (see §5.6 findings; e.g. *constrain-voice*, *requires-policy-transition*, *manual-review*).
- **It must not be a recommendation to the athlete.** "Safe action category" is a diagnostic label for an operator/future coordinator, never athlete-facing copy.

### 5.6 ReprojectionFinding
[DECISION] A finding about consistency/freshness/drift/missing-traceability/invalid-derivation. The closed initial set:
`unchanged` · `changed` · `stale` · `partial` · `invalid` · `missing-source` · `missing-traceability` · `source-superseded` · `event-record-only` · `requires-policy-transition` · `manual-review-required`.
- `event-record-only` = an occurrence is recorded but the backing aggregate/source state is **absent** — the harness reports it; it **does not** synthesize the aggregate from the record (invariant 2/6).

### 5.7 ReprojectionMode
[DECISION] Behavioral modes; **default `check-only`**:
- **`check-only`** — recompute and compare; **no domain mutation**. *(Default.)*
- **`refresh-derived`** — recompute a derived **view/projection only** (never an aggregate); produces a new labeled view, never mutating the old one (mirrors Impl 008 `applyFreshness` = recompute, not edit).
- **`mark-stale`** — produce or apply a **staleness marker** *only if a future implementation explicitly allows that write path* (defaults to producing the marker as a finding, not applying it).

[DECISION] **No mode may replay event records as commands.** No mode may mutate an aggregate. `refresh-derived`/`mark-stale` are scoped to **derived views/markers**, never to `UnderstandingProfile`/`Hypothesis`/`ObservationSet`/`Athlete` state.

---

## 6. Relationship to Repositories and Event Records (the three answers)

[FACT] Three distinct questions, three distinct mechanisms — none replaces the others:

| Mechanism | Answers | Source of truth? | Mutates? |
|---|---|---|---|
| **Repository (Impl 010)** | "what **is** the aggregate now?" | **yes** (current aggregate state) | replaces current state on `save` |
| **Event record (Impl 011)** | "what **happened**?" | no (refs the sources) | append-only; never |
| **Reprojection (Spec 012)** | "given current state + occurrence history, what derived views should be **recomputed or considered stale**?" | **no** (re-derives views) | **no** (check-only default) |

[DECISION] Event-record rules under reprojection:
- Event records **may** provide context, causation, correlation, and refs.
- Event records **may** help identify *what to check* (the candidate targets).
- Event records **must not** be replayed to rebuild aggregates.
- Event records **must not** be treated as source truth by themselves.
- Event records **must not** execute downstream mutations.
- Event records **must not** make projections current.

---

## 7. Relationship to Understanding

[FACT] `UnderstandingProfile` is **stateful and policy-driven** (Impl 004); `UnderstandingAssessment` is its **freshness-bound projection** (Impl 008).

[DECISION] Rules:
- `UnderstandingProfile` is **not** blindly recomputed from an event log.
- Understanding changes require **reasoning outcomes + the existing update policy** (`reasoningOutcomeFrom` → `updateUnderstandingFromOutcome`; survived-challenge promotion).
- A run **may** recompute an `UnderstandingAssessment` from an **existing** `UnderstandingProfile` (via the module's `produceUnderstandingAssessment`, `at`-aware).
- A run **may** detect that an assessment is `stale`/`invalid`/`partial`.
- A run **may** report `requires-policy-transition` (new reasoning outcomes might change understanding).
- A run **must not** update `UnderstandingProfile` directly **unless a future spec explicitly defines that write path.**

---

## 8. Relationship to Projection Freshness

[FACT] Freshness is explicit (Impl 008): `current`/`stale`/`partial`/`invalid`/`unknown`, clamped into `safeVoiceCeiling`.

[DECISION] Rules:
- `ProjectionFreshness` **remains explicit**; the 5 states are preserved.
- **Non-current freshness can only constrain** downstream voice; `invalid`/`unknown` are **not** usable truth (ceiling `none` → Withholding).
- Reprojection **may** detect source changes, supersession, purpose changes, missing data, quality changes, or time decay (reusing the Impl 008 `RefreshTrigger`/`projectionRefreshPolicy` machinery as a **read** input).
- Reprojection **must not** promote freshness merely because a run completed. **Recompute may re-derive the same or a more cautious freshness; never a fresher one than sources support.**

---

## 9. Relationship to Decision Support

[FACT] Voice is gated (Impl 005); `SupportQuality` is integrity-at-the-time (Impl 009).

[DECISION] Rules:
- Reprojection **may** identify that a prior `DecisionSupportCase` depended on a now-`stale`/`invalid` derived view, and **flag it for review** (a `manual-review-required`/`changed` finding).
- Reprojection **must not** retroactively rewrite `SupportQuality` from outcome alone.
- Reprojection **must not** turn a review into an athlete recommendation, and **must not** create a new `TerminalOutput`.
- **Future `DecisionSupport` must still pass through the gates** — a reprojection finding is an input to a *future, gated* case, never a shortcut around it.

---

## 10. Relationship to AthleteDecision and Purpose

[FACT] `AthleteDecision` is athlete-owned, referenced-not-owned (Impl 009); `Purpose` is declared, append-only (Impl 007).

[DECISION] Rules:
- `AthleteDecision` **may** be an input ref or event context.
- An `AthleteDecision` (or its outcome) **does not** become proof that Aurora was right; **outcome does not validate support by itself** (invariant 15).
- `PurposeVersion` **may** be an input ref; a **purpose change can make prior derived views stale** (a `RefreshTrigger` → `stale`/`source-superseded` finding).
- Behavior **may** suggest purpose ambiguity but **cannot overwrite declared `Purpose`** (invariant 16); the **declared-vs-inferred boundary is preserved** — reprojection never writes inferred state into `Athlete`.

---

## 11. Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§13). **Negative criteria are defining.**

### UC1 — Recompute current `UnderstandingAssessment`
- **AC1.1** — *Given* an `UnderstandingProfile` + source refs, *when* a **check-only** run recomputes the assessment, *then* the result includes **freshness, source refs, `derivedAt`, traceability status, and limitations**, and the **profile is not mutated**.

### UC2 — Detect stale projection after `PurposeChanged`
- **AC2.1** — *Given* a `PurposeChanged` record and an assessment derived under an earlier `PurposeVersion`, *when* reprojection checks it, *then* it reports **`stale`/affected dimensions** **without overwriting `Purpose` or `UnderstandingProfile`**.

### UC3 — Detect invalid projection after source supersession
- **AC3.1** — *Given* an `ObservationSuperseded` record affecting a source referenced by a derived artifact, *when* reprojection checks that artifact, *then* it reports **`invalid`/`stale`** (or `source-superseded`) and **preserves the original source refs**.

### UC4 — Missing traceability constrains downstream use
- **AC4.1** — *Given* a projection with incomplete source refs, *when* reprojection checks it, *then* it reports **`missing-traceability`** and **safe downstream use is constrained** (ceiling lowered, not raised).

### UC5 — Event records identify what to check but do not execute
- **AC5.1** — *Given* a sequence of `DomainEventRecord`s, *when* reprojection identifies affected targets, *then* it produces a **list of targets to check**, **not commands to execute** (no aggregate changes).

### UC6 — Reprojection does not rebuild aggregates from events
- **AC6.1** — *Given* an event log and **empty** aggregate repositories, *when* a run starts, *then* it **must not** rebuild aggregate state from the log (it reports `event-record-only`/`missing-source`).

### UC7 — Understanding requires policy transition
- **AC7.1** — *Given* new reasoning outcomes that might affect understanding, *when* reprojection inspects them, *then* it reports **`requires-policy-transition`** instead of blindly updating `UnderstandingProfile`.

### UC8 — DecisionSupport review is not recommendation
- **AC8.1** — *Given* a prior `DecisionSupportCase` that depended on a now-stale assessment, *when* reprojection flags it, *then* the result is a **review finding**, **not** a new recommendation or `TerminalOutput`.

### UC9 — AthleteDecision outcome does not validate support
- **AC9.1** — *Given* an `AthleteDecision` and a later outcome event, *when* reprojection checks related support, *then* it **does not** mark support correct/incorrect from the outcome alone.

### UC10 — Check-only default
- **AC10.1** — *Given* no explicit write mode, *when* reprojection runs, *then* it produces **findings only** and **mutates no repositories**.

---

## 12. Acceptance Criteria (consolidated)

[DECISION] At minimum:
- Given a run, when it completes, then it reports **targets, input refs, source refs, freshness, traceability status, findings, and limitations**.
- Given event records, when used, then they **identify candidates to check** but **do not execute commands**.
- Given a stored projection, when the recomputed result differs, then reprojection **reports drift** rather than silently overwriting.
- Given missing traceability, when a run executes, then **downstream voice is constrained**.
- Given `stale`/`invalid` freshness, when a run executes, then it **must not strengthen voice**.
- Given an event log only (no aggregate state), then reprojection **must not rebuild aggregates from events**.
- Given new reasoning outcomes, when understanding may change, then reprojection **requests a policy transition** rather than updating directly.
- Given a prior support case + later outcome, when checked, then **`SupportQuality` is not rewritten from outcome alone**.
- Given this slice is implemented later, then **no scheduler, event bus, projection repository, DB, API, UI, LLM, or event sourcing** is created.
- Given the slice, then **all 275 existing tests (Impl 001–011) remain green**, and any added harness surface is **additive** (no behavior change to existing modules).

---

## 13. Explicit Forbidden Behaviors

[FACT] This spec forbids: event-sourcing rebuild; event replay as command execution; event records mutating aggregates; projections treated as source truth; reprojection making projections current by assertion; silent overwrite of stored derived state; blind `UnderstandingProfile` replay; direct `UnderstandingProfile` mutation from events; bypassing `EvidenceCase`/`Hypothesis`; recommendation creation; `TerminalOutput` creation; `SupportQuality` rewrite from outcome alone; `Purpose` overwrite from behavior; compliance scoring; a generic projection repository; a scheduler / background job; an event bus / queue / broker; DB/schema/ORM; UI/API/LLM behavior.

[DECISION] These are **testable negative requirements** (§14).

---

## 14. Validation Strategy

[ASSUMPTION] Tests to the contract; **negative + boundary tests are defining.**

**Positive:**
- **check-only run mutates nothing** (repositories + aggregates unchanged before/after);
- **recomputed `UnderstandingAssessment`** includes freshness / source refs / `derivedAt` / limitations;
- **stale detection after `PurposeChanged`** (affected dimensions reported; Purpose/profile untouched);
- **invalid/stale detection after `ObservationSuperseded`** (original refs preserved);
- **`missing-traceability` finding** lowers safe downstream use;
- **event records identify targets** (candidate list) but do not execute;
- **policy-transition-required** finding for understanding changes;
- **DecisionSupport review finding** is a finding, not a `TerminalOutput`;
- **drift reporting** when recomputed ≠ stored (no silent overwrite).

**Negative (must prove absence):**
- an **event log alone cannot rebuild aggregate state** (empty repos → `event-record-only`/`missing-source`, never a synthesized aggregate);
- a **projection never loads/recomputes as `current` by assertion**; a run never promotes freshness;
- **no silent overwrite** of stored derived state;
- **no direct `UnderstandingProfile` mutation** from a run/events; no blind replay;
- **`SupportQuality` is never rewritten** from outcome alone;
- **`Purpose` is never overwritten** from behavior;
- **no recommendation / `TerminalOutput`** is produced;
- **no scheduler / event bus / queue / projection repository / DB / API / UI / LLM / event-sourcing** file or token is introduced (structural guard).

**Dependency-boundary:**
- the harness lives in the **neutral coordination/test layer** and reuses the owning modules' existing recompute functions; it introduces **no new module dependency edge** and **no new top-level production module** unless 012A justifies one (and if so, it imports only what it coordinates — never the reverse);
- **all 275 Impl 001–011 tests continue to pass.**

[ASSUMPTION] The negative + boundary tests are the contract that *reprojection recomputes and verifies without becoming event sourcing, a command path, or a way to make a projection true.* If they cannot be written/passed, the harness design is wrong.

---

## 15. Relationship To Existing Architecture

[FACT] This spec implements the persistence paper's **reprojection strategy** (§7) and **refresh model** (§1.6), building on:
- **Impl 010 repositories** — read current aggregate state (source of truth);
- **Impl 011 event records** — read occurrence history (candidates/context, never a rebuild path);
- **Impl 008 `ProjectionFreshness`** — recalculated, never assumed; the `RefreshTrigger`/`projectionRefreshPolicy` machinery is reused as a read input;
- **Impl 009 AthleteDecision feedback** — decision/outcome as input ref, never proof of correctness;
- **Impl 005 DecisionSupport gates** — a review finding feeds a *future, gated* case, never a shortcut;
- **Impl 004 understanding update policy** — understanding still moves only by survived-challenge transitions.

[DECISION] The three-way clarity stays intact: **repositories preserve aggregate state · event records preserve occurrence history · reprojection recomputes derived views and reports drift/freshness — none replaces the others.**

---

## 16. Open Questions (do not block this spec)

[QUESTION] whether a future reprojection *service* becomes production code; whether a projection repository will ever be needed; whether event records drive **async** refresh later; how to **persist** `ReprojectionRun` records; how to **display** findings; how to **schedule** periodic checks; how to handle large data volumes; how to **retain** old projections; privacy/deletion; whether state/export **versions** are needed.

[ASSUMPTION] None block this slice: Aurora can recompute-and-compare derived views in-process, check-only, regardless of how these resolve. Technical-implementation questions are deferred to 012A.

---

## 17. Success Criterion

> **"Can Aurora recompute and verify derived artifacts without turning events into commands, projections into truth, or reprojection into event sourcing?"**

[ASSUMPTION] Answerable from this spec: a **`ReprojectionHarness`** runs an auditable **`ReprojectionRun`** over an explicit, traceable **`ReprojectionInputSet`** against declared **`ReprojectionTarget`s** (initially `UnderstandingAssessment` + `ProjectionFreshness`), in **`check-only`** mode by default. It **recomputes** derived views via the owning modules' existing functions, **recalculates** the 5-state freshness, **verifies** traceability, and **reports** `ReprojectionResult`s + `ReprojectionFinding`s (`unchanged`/`changed`/`stale`/`partial`/`invalid`/`missing-source`/`missing-traceability`/`source-superseded`/`event-record-only`/`requires-policy-transition`/`manual-review-required`). It **mutates no aggregate**, **never rebuilds state from the event log**, **never asserts a projection `current`**, **never strengthens voice**, **never rewrites `SupportQuality` from outcome**, **never overwrites `Purpose`**, and **creates no recommendation/`TerminalOutput`** — and **no scheduler/event-bus/projection-repository/DB/API/UI/LLM/event-sourcing** is chosen, with **all 275 existing tests green** — proving reprojection is a *safety mechanism that re-derives and verifies*, never a *rebuild path or a way to make a view true*.

---

## Known Risks

[ASSUMPTION]
- **Risk:** the harness becomes event sourcing (rebuilds aggregates from the log). **Defense:** invariants 1/2 + UC6 — empty repos yield `event-record-only`/`missing-source`, never a synthesized aggregate; negative test.
- **Risk:** a run asserts a projection `current`. **Defense:** invariant 8/9 + §8 — freshness is recalculated; recompute may only equal/lower it; negative test that a completed run never promotes freshness.
- **Risk:** a run mutates an aggregate / blindly replays understanding. **Defense:** invariants 10/11/12 + UC7 — `check-only` default; understanding needs the policy transition; `requires-policy-transition` finding instead of a write; negative test.
- **Risk:** silent overwrite of stored derived state. **Defense:** invariant 13 + AC — drift is *reported* (`changed`), never silently applied; `refresh-derived` recomputes a new view, never edits the old.
- **Risk:** outcome rewrites `SupportQuality` / a review becomes a recommendation. **Defense:** invariants 15/17 + UC8/UC9 — review findings only; gates still own any future voice; negative tests.
- **Risk:** behavior overwrites `Purpose` / inferred state leaks into `Athlete`. **Defense:** invariant 16 + §10 — declared-vs-inferred preserved; reprojection writes nothing to `Athlete`.
- **Risk:** the harness drifts into a scheduler / projection engine / production service. **Defense:** §3 non-scope + §13 forbidden + structural guard — in-process, caller-invoked, no new infra; check-only default.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the twelfth Specification and the first reprojection slice. It defines a controlled, auditable recompute-and-compare harness; it chooses no scheduler, store, or transport, adds no event sourcing or projection repository, and keeps reprojection a safety mechanism that re-derives and verifies — never a rebuild path, a command channel, or a way to make a projection true.*

*Inputs: [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [Spec 008](./008-projection-refresh-staleness-strategy.md) · [Spec 010](./010-persistence-ports-in-memory-repositories.md) · [Spec 010A](./010-persistence-ports-in-memory-repositories-tech.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 011A](./011-domain-event-outcome-records-traceability-envelope-tech.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [System Map](../diagrams/SYSTEM_MAP.md) · [Spec 004](./004-understanding-update.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 009](./009-athlete-decision-feedback-loop.md) · Process: [spec-process.md](./spec-process.md)*
