# Tech Spec 012A — Reprojection Harness — Implementation Plan

> The TS-strict plan for Spec 012: a **neutral coordination/test seam** (no production `reprojection` module) that recomputes `UnderstandingAssessment`, recalculates the 5-state `ProjectionFreshness`, verifies traceability, detects candidates from `DomainEventRecord`s, and **reports drift/findings** — **check-only** by default, **mutating no repository**, **never** rebuilding aggregates from the log, **never** asserting a projection `current`.
>
> Technical Specification. **No code in this slice.** Implementation begins only from the approved plan as Implementation 012.

| Field | Value |
|---|---|
| **Status** | Technical Spec · *Accepted pending review* |
| **Phase** | Technical Specification (no code; no scheduler; no infra) |
| **Implements** | [Spec 012](./012-reprojection-harness.md) |
| **Builds on** | Spec/Impl 008 (freshness) · 010 (repositories) · 011 (event records) · 004 (understanding policy) · 005 (gates) · 009 (athlete-decision) |
| **Produces (plan for)** | `src/modules/__tests__/reprojection-harness/` — `ReprojectionRun`/`Result`/`Finding`/`Mode`/`Target`/`InputSet`, the harness runner, the event→candidate map, the understanding recompute adapter, validation/boundary tests |
| **Explicitly excludes** | production `reprojection` module, scheduler/cron/background jobs, event bus/queue consumers, event sourcing, aggregate rebuild from logs, projection repository, generic projection engine, production service layer, DB/schema/migrations, API, UI, LLM |

[ASSUMPTION] This is **Technical Specification phase**, not Implementation. It fixes TS-strict shapes, the seam location, the recompute/candidate/freshness rules, the check-only safety proof, and the test contract so Implementation 012 contains **no open design decisions** — only typing and wiring against existing module surfaces.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture/implementation. |
| **[DECISION]** | A technical commitment for this slice. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open; does not block. |

Principal **[DECISION]**s use **Decision · Why · Consequence · Risk · Reversal Point**.

---

## 1. Central Question

[FACT] *How can Aurora implement a controlled reprojection harness that recomputes and verifies derived artifacts without turning events into commands, projections into truth, or reprojection into event sourcing?*

[FACT] The answer in code: a **dependency-spanning seam in the neutral test/coordination layer** that **reads** repositories + event records + projection metadata, **recomputes** derived views by calling the **owning module's existing functions** (never re-implementing reasoning), **recalculates** freshness via the existing Impl 008 machinery, and **returns** an auditable `ReprojectionRun` of `ReprojectionResult`s + `ReprojectionFinding`s — mutating nothing in `check-only` (the default and only implemented mode this slice).

---

## 2. Surface Gap Analysis (read from current code)

[FACT] Verified against the repository so the plan reuses real signatures and invents nothing.

| # | Surface | Found in code | How 012 uses it |
|---|---|---|---|
| 1 | **Recompute an assessment** | `understanding`: `produceUnderstandingAssessment({ profile, dimensionKey, at? }) → UnderstandingAssessment \| undefined` (delegates to `profile.assess(dimensionKey, at)`) | The **only** recompute path for the `UnderstandingAssessment` target — the harness calls it; it never re-derives a level itself. |
| 2 | **Assessment shape** | `UnderstandingAssessment { dimension, level, fragility, staleness, safeVoiceCeiling, reasons, trace, freshness?, derivedAt?, sourceRefs?, limitations? }` | The recomputed view + the basis for **drift** comparison (level / safeVoiceCeiling / freshness). |
| 3 | **Freshness** | `ProjectionFreshness { status, reasons }`; `ProjectionFreshnessStatus = current\|stale\|partial\|invalid\|unknown`; `currentFreshness()`, `projectionFreshness(status, reasons)`, `isFullyEnabling()` | Freshness is **recalculated** and attached; the harness never assumes/promotes it. |
| 4 | **Apply freshness (pure, new view)** | `applyFreshness(assessment, freshness) → UnderstandingAssessment` (recomputes the clamped ceiling from a freshness-free base; **never mutates** the original) · `clampCeilingByFreshness`, `deriveSafeVoiceCeiling` | Produces the **constrained view** for a `stale`/`partial`/`invalid`/`unknown` finding — a new value, no mutation. |
| 5 | **Refresh policy / triggers** | `projectionRefreshPolicy(...)`, `freshnessFromDecision(...)`, `RefreshTrigger`/`RefreshTriggerKind`, `StalenessReason`, `ProjectionTrace`, `ProjectionSourceRef` | Reused as a **read input** to map a detected change (purpose change, supersession) → a freshness/`RefreshTrigger`; never applied as a write. |
| 6 | **Staleness transition (returns a NEW profile)** | `markUnderstandingStale({ profile, dimensionKey, reason, at }) → UnderstandingProfile` | **Not called in check-only.** A staleness *transition* is reported as a `requires-policy-transition`/`stale` finding, not applied. |
| 7 | **Understanding update policy** | `reasoningOutcomeFrom(...)` + `updateUnderstandingFromOutcome({ profile, outcome }) → UnderstandingProfile` (survived-challenge promotion in the aggregate/policy) | The harness **never** updates understanding; new reasoning outcomes → a `requires-policy-transition` finding. |
| 8 | **Repositories (read)** | `UnderstandingProfileRepository` (`save`/`findById`/`exists`) + `InMemoryUnderstandingProfileRepository`; same shape for the other five boundaries (Impl 010) | The harness reads **current aggregate state** via `findById`; it **never calls `save`** (check-only safety). |
| 9 | **Event records** | `event-recording`: `DomainEventRecord` (+ `DomainEventType` closed catalog, `DomainEventCategory`), `TraceabilityEnvelope`, `EventPayloadRef`, `CausationRef`, `CorrelationRef`, `DomainEventRecordLog`, `InMemoryDomainEventRecordRepository` | Source of **candidate detection** + context refs; **never replayed**, never executed. |
| 10 | **Neutral cross-module seam precedent** | `src/modules/__tests__/purpose-adapters.ts`, `decision-observation-adapter.ts` (compose across modules without any module importing another) | The harness lives **here**, as test-support — not a production module. |
| 11 | **Structural guards to respect** | `persistence-boundary.test.ts` (repo files matching `-repository`/`in-memory-` must import only own module + shared-kernel; forbidden-tech tokens); e2e `ALLOWED_MODULES` (top-level module dirs only) | Harness files **must not** be named `*-repository`/`in-memory-*` (they span modules); they live **under `__tests__/`** so they trip **no** top-level-module or production-import guard. |

[DECISION] **No gap blocks the slice, and no existing module needs modification.** The harness composes existing public functions; names above are authoritative.

---

## 3. Key Architectural Decisions

### Decision 1 — Harness lives as a neutral coordination/test seam (no production `reprojection` module)
[DECISION] Implement the first harness under `src/modules/__tests__/reprojection-harness/` (neutral test-support), **not** a production `src/modules/reprojection/`.
- **Why:** reprojection crosses repositories, event records, and multiple domain modules; **no production application layer exists yet**; a production module now risks looking like a **scheduler / projection engine / application service** before any is specified. Prior cross-module seams (purpose, decision re-entry) already live in the neutral harness.
- **Consequence:** the harness proves behavior **without becoming architecture**; existing domain modules stay **untouched** (no documented blocker expected — a new `__tests__/` subdir trips no guard).
- **Risk:** test-harness code may later need promotion to production.
- **Reversal Point:** when a production orchestration/application layer is specified, **promote the harness concepts into it with unchanged contracts**.

### Decision 2 — First implemented targets: `UnderstandingAssessment` + freshness + candidate detection
[DECISION] First slice targets **only**: `UnderstandingAssessment`, its `ProjectionFreshness` verification, and **candidate-target detection** from `DomainEventRecord`s. **Not** implemented: `ImpactAssessment`, a generic projection engine, an athlete-facing read model, DecisionSupport recomputation, production projection storage.
- **Why:** `UnderstandingAssessment` is the only real projection-like surface today; Impl 008 already made its freshness explicit; prove the **safety seam** before broadening.
- **Consequence:** `ReprojectionTarget` is a small discriminated union with the others as **reserved** (not implemented) kinds.
- **Risk:** broadening later needs more recompute adapters — additive, behind the same `ReprojectionResult` contract.
- **Reversal Point:** add a target kind + its recompute adapter when a second projection (`ImpactAssessment`) lands.

### Decision 3 — `check-only` is the default and only implemented mode
[DECISION] `ReprojectionMode = "check-only" | "refresh-derived" | "mark-stale"`; **only `check-only` is implemented** this slice (default). `refresh-derived`/`mark-stale` are **reserved enum values**; requesting them throws `"<mode> is not implemented in this slice"`. **No mode may write to an aggregate repository.**
- **Why:** check-only proves drift/freshness detection with **zero mutation risk**; the other modes need a justified, explicit write path a later spec must define.
- **Consequence:** the harness exposes **no `save`/apply** path; a check-only run is provably inert (§9).
- **Risk:** callers may want `refresh-derived` immediately. **Reversal Point:** implement `refresh-derived` as a thin wrapper over `applyFreshness`/`produceUnderstandingAssessment` returning a **new derived view** (never an aggregate write) once a consumer needs it.

### Decision 4 — Event records are candidates/context only
[DECISION] `DomainEventRecord`s **identify candidate targets** and provide context refs (causation/correlation/traceability). They are **never** replayed to rebuild aggregates, **never** execute commands, **never** mutate repositories, **never** make a projection current.
- **Why:** invariants 1/2 of Spec 012 — events are occurrence history, not a rebuild path.
- **Consequence:** the event→candidate step is a **pure function** `DomainEventRecord[] → ReprojectionTarget[]`; with empty repositories it yields candidates whose recompute reports `event-record-only`/`missing-source` — **never** a synthesized aggregate.

### Decision 5 — Existing module behavior owns recomputation
[DECISION] The harness **must call existing module functions** to recompute (`produceUnderstandingAssessment`, `applyFreshness`, the Impl 008 freshness/policy helpers); it **must not** re-implement level derivation, promotion, or voice. Understanding *transitions* (`markUnderstandingStale`, `updateUnderstandingFromOutcome`) are **not applied** in check-only — they surface as findings.
- **Why:** the seam **coordinates, never reasons** (the Boundary Map's load-bearing rule); recompute must go through the owning invariant guardian so it can only re-derive the same or a more cautious result.
- **Consequence:** the harness is thin glue; all reasoning stays in `understanding`.
- **Risk:** none material. **Reversal Point:** if a recompute needs a function the module doesn't expose, add it **in that module** (additive) — never inline reasoning in the harness.

### Decision 6 — Recompute may only re-derive the same or a more cautious result
[DECISION] A run **never strengthens** voice/level/freshness. Freshness is **recalculated** (and may only equal or lower the ceiling); a completed run **never** promotes freshness to `current`. Drift is **reported** (`changed`), never silently applied.
- **Why:** the Impl 008 asymmetry carried into reprojection (Spec 012 §2/§8).
- **Consequence:** a negative test asserts no run output exceeds the source-justified ceiling/freshness.

### Decision 7 — Reserved, not invented
[DECISION] `ReprojectionFinding`, `ReprojectionMode`, and `ReprojectionTarget` kinds are **closed unions** from Spec 012; adding a value is a deliberate edit + test. No open-ended status strings.

---

## 4. Proposed Layout

[DECISION]
```text
src/modules/__tests__/reprojection-harness/
  reprojection.ts                 # ReprojectionMode/Target/InputSet/Run/Result/Finding/SafeActionCategory + smart ctors
  candidate-detection.ts          # pure DomainEventRecord[] -> ReprojectionTarget[] (no execution)
  understanding-reprojection.ts   # recompute adapter: calls produceUnderstandingAssessment + freshness helpers
  reprojection-harness.ts         # runReprojection(input): ReprojectionRun (check-only)
  index.ts
  reprojection-harness.test.ts            # UC1-UC10
  reprojection-negative-capability.test.ts# structural + negative guards
```

[DECISION] **Must not create:** `src/modules/reprojection/` (production module), `src/infrastructure/`, any scheduler/cron/job/event-bus/queue/projection-store file. **No** new top-level module; **no** existing module modified.

[FACT] TS-strict house rules apply: no constructor parameter properties; explicit fields + private constructor where a class is used; `import type` for type-only imports; `.ts` extensions; `Object.freeze` on value objects; conditional spreads for `exactOptionalPropertyTypes`. The harness files **import** the domain modules' public surfaces (allowed: they are neutral `__tests__/` support, not a domain module) and **must not** be named `*-repository`/`in-memory-*` (so the persistence-boundary repo-import guard does not apply to them).

---

## 5. Types (TS-strict shapes)

### 5.1 Mode, finding, target, safe-action
```ts
export type ReprojectionMode = "check-only" | "refresh-derived" | "mark-stale"; // only check-only implemented

export type ReprojectionFinding =
  | "unchanged" | "changed" | "stale" | "partial" | "invalid"
  | "missing-source" | "missing-traceability" | "source-superseded"
  | "event-record-only" | "requires-policy-transition" | "manual-review-required";

export type TraceabilityStatus = "verified" | "incomplete" | "missing";

/** Diagnostic only — never athlete-facing copy, never a recommendation. */
export type SafeActionCategory = "none" | "constrain-voice" | "requires-policy-transition" | "manual-review";

export type ReprojectionTargetKind =
  | "UnderstandingAssessment"
  | "ProjectionFreshness"
  // reserved (not implemented this slice):
  | "ImpactAssessment"
  | "AthleteReadModel";

export interface ReprojectionTarget {
  readonly kind: ReprojectionTargetKind;
  /** the aggregate/projection this target derives from (e.g. UnderstandingProfile id) */
  readonly primaryRef: EventPayloadRef;     // reuse Impl 011 ref shape (kind + id)
  /** dimension for UnderstandingAssessment targets */
  readonly dimensionKey?: string;
}
```

### 5.2 Input set
```ts
export interface ReprojectionInputSet {
  readonly mode: ReprojectionMode;                       // defaults to "check-only" if omitted by the runner
  readonly requestedTargets: readonly ReprojectionTarget[]; // explicit + traceable
  /** read-only access to current aggregate state (Impl 010 ports) */
  readonly understandingProfiles?: UnderstandingProfileRepository;
  /** occurrence history used for candidate detection + context (never replayed) */
  readonly events?: readonly DomainEventRecord[];
  /** existing stored/current derived views, for drift comparison (keyed by target) */
  readonly existingViews?: readonly { readonly target: ReprojectionTarget; readonly view: UnderstandingAssessment }[];
  /** stamp for recomputed derivedAt (passed in; no Date.now()) */
  readonly at?: Timestamp;
}
```
[DECISION] The input set is **explicit and traceable** — no implicit global scan; the harness reads only what it is given. Repositories are passed as **read access** (the harness calls `findById`/`exists`, never `save`).

### 5.3 Result + run
```ts
export interface ReprojectionResult {
  readonly target: ReprojectionTarget;
  readonly recomputed?: UnderstandingAssessment;   // the recomputed view (omitted if source missing)
  readonly freshness?: ProjectionFreshness;        // recalculated (5-state)
  readonly sourceRefs: readonly ProjectionSourceRef[]; // preserved from the artifact; never invented
  readonly traceability: TraceabilityStatus;
  readonly differences?: readonly string[];        // drift summary vs existing view (no silent overwrite)
  readonly findings: readonly ReprojectionFinding[];
  readonly limitations: readonly string[];
  readonly safeAction: SafeActionCategory;
}

export interface ReprojectionRun {
  readonly runId: string;                          // caller-supplied or newDomainEventRecordId()-style; no time embedded
  readonly mode: ReprojectionMode;
  readonly startedAt: Timestamp;                    // passed in
  readonly completedAt?: Timestamp;                 // passed in
  readonly requestedTargets: readonly ReprojectionTarget[];
  readonly inputRefs: readonly EventPayloadRef[];   // every artifact ref considered
  readonly eventsConsidered: readonly DomainEventRecordId[];
  readonly sourcesConsidered: readonly EventPayloadRef[];
  readonly results: readonly ReprojectionResult[];
  readonly findings: readonly ReprojectionFinding[]; // union across results
  readonly limitations: readonly string[];
  readonly errors: readonly string[];
}
```
[DECISION] A `ReprojectionRun` **is not a `DomainEventRecord`** in this slice (Spec 012 §5.2). It is a plain, frozen, serializable value returned to the caller; persisting it is a future concern.

### 5.4 Runner
```ts
export function runReprojection(input: ReprojectionInputSet): ReprojectionRun;
```
[DECISION] `runReprojection` defaults `mode` to `"check-only"`; for `"refresh-derived"`/`"mark-stale"` it throws `"<mode> is not implemented in this slice"`. It **never** calls any repository `save`, **never** calls `markUnderstandingStale`/`updateUnderstandingFromOutcome` as applied writes, **never** constructs a `DecisionSupportCase`/`TerminalOutput`, **never** writes to `Athlete`.

---

## 6. Candidate Detection (events → targets, pure, no execution)

[DECISION] `detectCandidates(events: readonly DomainEventRecord[], known: readonly ReprojectionTarget[]): readonly ReprojectionTarget[]` — a **pure** map from occurrence types to affected targets, using the closed Impl 011 catalog:

| Event type | Implies candidate(s) | Finding bias on recompute |
|---|---|---|
| `PurposeChanged` / `PurposeDeclared` | `UnderstandingAssessment`s whose trace references the affected purpose/dimension | `stale` (purpose-change trigger) |
| `ObservationSuperseded` | derived artifacts whose `sourceRefs` include the superseded `ObservationSet` | `source-superseded` → `invalid`/`stale`; original refs preserved |
| `HypothesisFalsified` / `HypothesisRevised` / `HypothesisWeakened` / `HypothesisContradicted` | `UnderstandingAssessment`s tracing that hypothesis | `requires-policy-transition` (understanding moves only by policy) |
| `UnderstandingMarkedStale` / `UnderstandingUpdated` | the named profile/dimension assessment | `stale` / re-check |
| `UnderstandingAssessmentProjected` / `ProjectionFreshnessChanged` | that assessment's freshness | recompute + freshness re-check |

[FACT] The map **returns a list, never executes** — it produces `ReprojectionTarget`s to check (UC5). With **empty repositories**, recompute of those candidates yields `event-record-only`/`missing-source` (UC6) — it **never** synthesizes an aggregate from the record.

---

## 7. Recompute, Freshness & Traceability (per `UnderstandingAssessment` target)

[DECISION] `reprojectUnderstandingAssessment(target, input): ReprojectionResult` steps:
1. **Load source** — `input.understandingProfiles?.findById(profileId)`. If absent → `findings: ["missing-source"]` (or `event-record-only` if the target came from an event with no backing aggregate); `safeAction: "manual-review"`; **no recompute**.
2. **Recompute** — `produceUnderstandingAssessment({ profile, dimensionKey, at: input.at })`. If `undefined` (unknown dimension) → `missing-source`.
3. **Verify traceability** — inspect the assessment's `sourceRefs`/`trace`; classify `verified` / `incomplete` / `missing`. Incomplete/missing → `findings: ["missing-traceability"]`, `safeAction: "constrain-voice"`, and the **constrained view** via `applyFreshness(view, projectionFreshness("partial"|"invalid", reasons))` (a new view; ceiling lowered).
4. **Recalculate freshness** — derive a `ProjectionFreshness` from detected triggers (purpose change / supersession / time / quality) using the Impl 008 helpers as a **read** (`freshnessFromDecision`/`projectionRefreshPolicy`), else `currentFreshness()`. Apply via `applyFreshness` to get the clamped view. **Never** promote to `current` because the run finished.
5. **Drift** — if an `existingViews` entry matches, compare `level` / `safeVoiceCeiling` / `freshness.status`: equal → `unchanged`; differ → `changed` with a `differences` summary. **No overwrite** — drift is reported only.
6. **Assemble** `ReprojectionResult` (recomputed view, freshness, preserved `sourceRefs`, traceability status, findings, limitations, safe action).

[DECISION] **Asymmetry guard:** the result's `safeVoiceCeiling` (via `applyFreshness`) is **≤** the freshness-free base; a test asserts no result raises the ceiling or sets freshness `current` when the sources are not.

---

## 8. Relationship boundaries enforced in code

[DECISION]
- **Repositories** (Impl 010) — read current state via `findById`; **never `save`**.
- **Event records** (Impl 011) — read for candidates/context; **never replayed/executed**; empty repos never yield a synthesized aggregate.
- **Understanding** — recompute the **assessment** via the module's function; **never** apply `markStale`/`update`; understanding changes → `requires-policy-transition` finding.
- **Freshness** (Impl 008) — recalculated; non-current only **constrains**; never promoted.
- **Decision-support** (Impl 005) — a stale-dependency surfaces as `manual-review-required`/`changed`; **no `TerminalOutput`**, **no `SupportQuality` rewrite**.
- **Athlete/Purpose** (Impl 007/009) — input refs only; **no write to `Athlete`**, **no `Purpose` overwrite**, **outcome never validates support**.

---

## 9. Check-Only Mutation-Safety Proof

[DECISION] The defining safety test: snapshot every input repository's state **before** the run (`toState()` of each held aggregate via `findById`), run `runReprojection`, snapshot **after**, and assert **deep equality** — plus assert the event log length/order is unchanged. A second test wraps a repository whose `save` throws and asserts a check-only run **never calls it**. Together these prove a run **mutates no aggregate and appends no record**.

---

## 10. Validation Strategy (tests before implementation)

[ASSUMPTION] Negative + boundary tests are **defining**. Mapped to Spec 012 UC1–UC10:

1. **UC1** — check-only recompute of `UnderstandingAssessment` includes freshness / source refs / `derivedAt` / limitations; profile unmutated.
2. **UC2** — `PurposeChanged` candidate → `stale` finding on the affected dimension; Purpose + profile untouched.
3. **UC3** — `ObservationSuperseded` → `source-superseded`/`invalid`; original `sourceRefs` preserved.
4. **UC4** — incomplete source refs → `missing-traceability`; constrained view (lower ceiling).
5. **UC5** — events produce a **candidate list**, not executed commands (no state change).
6. **UC6** — empty repositories + event log → `event-record-only`/`missing-source`; **no aggregate rebuilt**.
7. **UC7** — new reasoning outcomes → `requires-policy-transition`; `UnderstandingProfile` not updated.
8. **UC8** — stale-dependent prior `DecisionSupportCase` → review finding; **no `TerminalOutput`**.
9. **UC9** — `AthleteDecision` + later outcome → support **not** marked correct/incorrect.
10. **UC10** — no explicit mode → `check-only`; **mutates nothing** (the §9 proof).

**Negative / structural:**
- a completed run **never** sets freshness `current` by assertion / never raises a ceiling (asymmetry);
- **no silent overwrite** of an existing view (drift reported only);
- requesting `refresh-derived`/`mark-stale` **throws** "not implemented in this slice";
- **no `src/modules/reprojection/`** production module; **no scheduler/cron/job/event-bus/queue/projection-store/DB/API/UI/LLM/event-sourcing** file or token (structural guard, `node:fs`);
- **boundary:** harness files live under `__tests__/`, trip no top-level-module guard, and are not named `*-repository`/`in-memory-*`;
- **all 275 Impl 001–011 tests continue to pass.**

---

## 11. Boundary Rules

[DECISION]
- The harness lives in **`src/modules/__tests__/reprojection-harness/`** (neutral test-support), like the existing purpose/decision adapters.
- It **may import** the public surfaces of `observation`/`reasoning`/`understanding`/`decision-support`/`athlete`/`event-recording` + `shared-kernel` (it is the neutral coordinator, not a domain module).
- **No domain module imports the harness.** **No production module is created or modified.**
- The harness introduces **no new dependency edge between domain modules** and **no new top-level module**.

---

## 12. Relationship To Existing Architecture

[FACT] Builds on: **Impl 010 repositories** (read current state), **Impl 011 event records** (candidates/context), **Impl 008 freshness** (recalculated, never assumed), **Impl 009 athlete-decision** (input ref; outcome never validates support), **Impl 005 gates** (review finding feeds a future *gated* case), **Impl 004 update policy** (understanding moves only by transition). The three-way clarity holds: **repositories preserve state · event records preserve occurrence history · reprojection recomputes derived views and reports drift/freshness — none replaces the others.**

---

## 13. Open Questions (do not block implementation)

[QUESTION] whether a future reprojection **service** becomes production code; whether a **projection repository** is ever needed; whether event records drive **async** refresh; how to **persist** `ReprojectionRun`s; how to **display** findings; **scheduling** periodic checks; large-volume handling; projection **retention**; privacy/deletion; whether **state/export versions** are needed; whether `refresh-derived`/`mark-stale` are ever implemented and behind what write path.

[ASSUMPTION] None block Implementation 012: Aurora can recompute-and-compare in-process, check-only, regardless of how these resolve.

---

## 14. Implementation Task Preview

**Implementation 012 — Add a check-only reprojection harness (neutral seam) that recomputes `UnderstandingAssessment`, recalculates freshness, verifies traceability, detects candidates from event records, and reports drift/findings.**

[DECISION] Scope: create `src/modules/__tests__/reprojection-harness/` per §4; implement the types (§5), candidate detection (§6), the understanding recompute adapter (§7), the runner (§5.4), and the tests (§10). **Additive only** — no existing module modified.

**Acceptance criteria:**
- a `runReprojection(input)` returns a frozen `ReprojectionRun` with targets, input/source refs, recomputed view(s), recalculated freshness, traceability status, findings, limitations, and errors;
- recompute goes **only** through `produceUnderstandingAssessment` + the Impl 008 freshness helpers; understanding transitions surface as `requires-policy-transition`, never applied;
- candidate detection is a **pure** events→targets map; events are never replayed/executed;
- **check-only mutates nothing** (the §9 before/after proof; a throwing `save` is never called);
- a completed run **never** asserts freshness `current` / never raises a ceiling; drift is **reported**, never overwritten;
- empty repositories never yield a synthesized aggregate (`event-record-only`/`missing-source`);
- a stale-dependent prior `DecisionSupportCase` yields a review finding, not a `TerminalOutput`; `SupportQuality` is never rewritten from outcome; `Purpose` is never overwritten;
- **boundary:** harness under `__tests__/`, no production `reprojection` module, no new top-level module, no domain module imports it;
- **all 275 existing tests stay green**; the new tests pass.

**The implementation must explicitly create none of:** production `reprojection` module · scheduler / cron / background job · event bus / queue / broker consumer · event sourcing / aggregate rebuild from logs · projection repository · generic projection engine · production service layer · DB / schema / migrations · API · UI · LLM.

---

## 15. Technical Constraints

[FACT] TypeScript strict; Node native test runner (`node:test` + `node:assert/strict`); **no** external test framework/framework/DB/event-bus/LLM. **No constructor parameter properties.** `import type` where appropriate. `.ts` extensions. Pure values + `Object.freeze`. **No** `Date.now()` (timestamps passed in). Recompute reuses existing module functions — **no inlined reasoning**. Check-only writes nothing.

---

## 16. Success Criterion

> After this tech spec, Implementation 012 can be built **without** deciding scheduler, store, event-sourcing, projection-repository, or domain questions in code.

[ASSUMPTION] Answerable: the plan fixes every shape (`Run`/`Result`/`Finding`/`Mode`/`Target`/`InputSet`), the neutral seam location, the pure events→candidates map, the recompute path through existing module functions, the freshness recalculation, the drift report, the check-only safety proof, the boundary, and the test contract — all satisfiable **in-process, check-only**, reusing existing surfaces and modifying no module. The future implementation answers Spec 012's question: **"Can Aurora recompute and verify derived artifacts without turning events into commands, projections into truth, or reprojection into event sourcing?"** — yes: recompute-and-compare, check-only, asymmetric, inert.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the technical plan for the first reprojection slice. It defines a neutral, check-only recompute-and-compare harness that reuses existing module behavior; it creates no production `reprojection` module, no scheduler, no event sourcing, and no projection repository, and it keeps reprojection a safety mechanism that re-derives and verifies — never a rebuild path, a command channel, or a way to make a projection true.*

*Inputs: [Spec 012](./012-reprojection-harness.md) · [Spec 008](./008-projection-refresh-staleness-strategy.md) · [Spec 010](./010-persistence-ports-in-memory-repositories.md) · [Spec 010A](./010-persistence-ports-in-memory-repositories-tech.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 011A](./011-domain-event-outcome-records-traceability-envelope-tech.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
