# Tech Spec 010A — Persistence Ports and In-Memory Repositories Implementation Plan

> The smallest TypeScript-strict plan for Spec 010 — module-owned repository **ports**, **in-memory** adapters, and an additive, validated **`toState()` / `reconstitute(state)`** surface per persisted aggregate — proving round-trip safety **without a DB, ORM, schema, event bus, cache, or infrastructure layer**.
>
> Technical spec, not production code. No technology is chosen. No existing behavior changes.

| Field | Value |
|---|---|
| **Status** | Tech Spec · *Drafted — ready for approval* |
| **Phase** | Technical Specification → (gateway to) Implementation |
| **Implements** | [Spec 010](./010-persistence-ports-in-memory-repositories.md) (first part of [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md)) |
| **Builds on** | Implementations 001–009 (212/212 green) |
| **New module** | **None.** Ports + adapters live inside each owning module. |
| **Language** | TypeScript strict (established; no decision reopened) |

[FACT] Language and toolchain already decided. This slice adds, per persisted boundary: a **port interface**, an **in-memory adapter**, and an **additive `toState()`/`reconstitute()` pair** (the aggregates have private constructors + private `toProps()` today — no public rehydration path). It chooses **no** database and changes **no** existing behavior.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows from an accepted spec/architecture decision or the existing code. |
| **[DECISION]** | A technical-spec commitment. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open, does not block. |

[FACT] **Central question:** *How can Aurora add persistence ports and in-memory repositories while preserving aggregate invariants, append-only history, traceability, projection freshness, and ownership boundaries?*

[FACT] **Borders to guard:** rehydration validates (never a raw field bag) · the store holds **state copies**, not live references · append-only/supersession/traceability/freshness survive · the decision stays **referenced not owned** · **the domain shape drives the store**, never the reverse.

---

## 0. Technical Conventions Carried Forward

[FACT] From Implementations 001–009: no constructor parameter properties; `import type` + explicit `.ts` extensions; smart constructors; branded opaque ids (strings at runtime → serializable); frozen value objects; aggregates immutable-by-operation; `node:test` + `node:assert/strict`; casts via `as unknown as T`; conditional spreads for `exactOptionalPropertyTypes`; no `Date.now()` in domain. No new dependencies; reuse `typecheck`/`test`/`check`.

---

## 1. Key Architectural Decisions

### Decision 1 — Reconstitution surface (`toState()` / `reconstitute(state)`)
[DECISION] Add an explicit, **additive** `toState(): <Aggregate>State` and `static reconstitute(state): <Aggregate>` to each persisted boundary.
- **Why:** constructors are private and `toProps()` is private — repositories have **no** validated round-trip path today. The architecture paper sanctions an "explicit reconstitution API that enforces invariants."
- **Consequence:** persistence round-trips through a **validated** path — no raw field bags, no blind operation-replay. `static create/open/initialize/empty` stay the *birth* path; `reconstitute` is the *rebirth* path (same invariant checks).
- **Risk:** `reconstitute` could become a permissive backdoor that skips invariants.
- **Mitigation:** `reconstitute` runs the **same aggregate-level validation** as construction and rebuilds value objects through their **existing smart constructors/helpers** where they carry invariants (e.g. `requireValidPurpose`, falsifier-non-empty, `athleteRef` present). A negative test reconstitutes an invalid state and expects rejection.
- **Reversal Point:** if event sourcing / operation-replay is specified later, reduce or replace state reconstitution with a fold over a persisted operation log.

### Decision 2 — Ports live inside the owning module
[DECISION] Each repository **port** (interface) lives in its owning module's `application/` layer.
- **Why:** each module owns its aggregate invariants and its reconstitution.
- **Consequence:** ports import only their own domain + `shared-kernel`.
- **Reversal Point:** extract a `shared-kernel` `Repository<T, Id>` *type* only if the contract proves identical across modules — never a shared implementation.

### Decision 3 — In-memory adapters are module-local application support, not infrastructure
[DECISION] In-memory adapters live in the owning module's `application/` (beside the port) so they can be reused by that module's tests; **no `src/infrastructure/`, no `src/modules/persistence/`, no `src/modules/repositories/`.**
- **Why:** adapters prove the ports; they are not shipped storage. Co-locating with the port keeps the boundary legible.
- **Consequence:** `Map`-backed, deterministic, disposable adapters.
- **Reversal Point:** a real adapter (later spec) implements the same port; the in-memory one remains the test double.

### Decision 4 — First-slice boundaries (and the two clarifications)
[DECISION] Ports for: **`ObservationSet`**, **`Hypothesis`**, **`UnderstandingProfile`**, **`DecisionSupportCase`**, **`Athlete`**, and **`AthleteDecisionRecord`**.
- **`PurposeHistory` is persisted *through* `Athlete`** — it is owned by the `Athlete` aggregate (its `_history`), not a separate aggregate → no separate port.
- **`AthleteDecisionRecord` gets its *own* port** — in the current code it is a **separate** stateful record (constructed via `AthleteDecisionRecord.empty(athleteRef)`, not held inside `Athlete`). Keyed by `athleteRef`. (If a later slice nests it inside `Athlete`, the port collapses into `AthleteRepository`.)
- **`UnderstandingAssessment` gets *no* repository** — only an in-memory test helper to prove freshness survival (UC7).

### Decision 5 — Minimal port API: `save` / `findById` / `exists`
[DECISION] `save(entity): void`, `findById(id): Entity | undefined`, `exists(id): boolean`. An `append(...)` operation is **not** added — append-only semantics are enforced by the *aggregate/record* (`AthleteDecisionRecord.record/amend`, `Athlete.changePurpose`), and the repository simply `save`s the resulting value. **No query, filter, or transaction API.**

### Decision 6 — No production DB
[DECISION] No DB / ORM / schema / migration / serialization-format / cache / event-bus in this slice. State is plain in-memory JS objects; "serializable" means *structurally plain* (branded strings, numbers, frozen value objects), not a chosen wire format.

---

## 2. Required Surface Gap Analysis

[FACT] Per boundary: (a) construction API · (b) private ctor/props · (c) current state export · (d) state needed for round-trip · (e) identity access · (f) immutability · (g) invariants reconstitution must enforce · (h) existing defending tests · (i) new tests.

### `ObservationSet` (observation)
- (a) `ObservationSet.create({id?, occasion, expected?})` + `add`, `supersede`. (b) private ctor; fields `_observations`, `_supersessions`, `_expected` private. (c) getters `observations`, `supersessions`, `active()`, `completeness()`, `id`, `occasion` — **read access exists, no single state export**. (d) id, occasion, expected[], full observations[] (each: kind, id, provenance, quality, + measurement/words/inquiryRef?/expected), supersessions[] (originalId, replacementId, reason, at). (e) `.id`. (f) immutable-by-operation. (g) every observation provenance/quality present; supersession references existing ids. (h) Impl 001/002 set + supersession tests. (i) round-trip incl. active/superseded + mutation isolation.
- **Gap:** add `toState()` (snapshot of observations + supersessions + expected) and `static reconstitute(state)` rebuilding via the private ctor after validating each observation through its smart constructor.

### `Hypothesis` (reasoning)
- (a) `Hypothesis.open(input)` + `attachEvidence`, `transition`, `promote`, `retire`. (b) private ctor; `HypothesisProps` private (id, claim, scope, athleteRef, purposeContextRef, state, confidence, limitations, falsifiers, evidence, revisions). (c) getters `evidence`, `revisions`, public fields id/claim/scope/state/confidence/falsifiers/limitations/athleteRef/purposeContextRef — **most state readable; `toProps()` private**. (d) all of `HypothesisProps`; evidence cases carry `TraceToSignal` (signal + observationSetId + observationIds). (e) `.id`. (f) immutable-by-operation. (g) ≥1 falsifier; state/confidence consistent with evidence; trace preserved. (h) Impl 003 lifecycle + traceability-adapter tests. (i) supported/contradicted/falsified round-trip; evidence trace survives; invalid (no falsifier) rejected.
- **Gap:** add `toState()`/`reconstitute()`; reconstitution re-validates the falsifier-non-empty invariant.

### `UnderstandingProfile` (understanding)
- (a) `UnderstandingProfile.initialize({id?, athleteRef})` + `updateFromOutcome`, `markStale`. (b) private ctor; `_dimensions: Map<string, DimensionUnderstanding>` private (each: dimension, level, fragility, staleness, survivedChallenges, surprises, changes, traces). (c) `levelOf`, `dimension`, `dimensionKeys`, `assess` — **derived reads; no full export**. (d) id, athleteRef, all dimension entries. (e) `.id`. (f) immutable-by-operation. (g) per-dimension; level ≤ survived evidence (preserved by storing computed dimension state, not recomputing). (h) Impl 004 + 008 tests. (i) dimension/staleness round-trip; `assess()` yields same level/ceiling/freshness after rehydrate.
- **Gap:** add `toState()` (id, athleteRef, dimensions[]) and `reconstitute()` rebuilding the map. Reconstitution stores dimension state verbatim (it was computed by the policy at save time — **do not re-run promotion** on load).

### `DecisionSupportCase` (decision-support)
- (a) `DecisionSupportCase.open(input)` + `evaluate`, `recordAthleteDecisionRef`. (b) private ctor; `CaseProps` private (id, opportunity, assessment, purpose, risk, candidate, trace, claimState, gateResults, degradations, selectedOutput, supportQuality, athleteDecisionRef). (c) all fields are public readonly — **state readable; `toProps()` private**. (d) all of `CaseProps`. (e) `.id`. (f) immutable-by-operation. (g) terminal output + gate integrity consistent; **only `AthleteDecisionRef`, never a decision object**. (h) Impl 005/009 tests. (i) evaluated case round-trip; terminal output + degradation reasons survive; `AthleteDecisionRef` survives without ownership.
- **Gap:** add `toState()`/`reconstitute()`. Reconstitution does **not** re-run `evaluate()` (it stores the already-selected output); it asserts the case is well-formed.

### `Athlete` (athlete) — incl. `PurposeHistory`
- (a) `Athlete.create({id?, identityRef})` + `declarePurpose`, `changePurpose`. (b) private ctor; `_history: PurposeVersion[]` private. (c) `purposeHistory()`, `currentPurpose()`, `currentVersion()`, `versionByRef()`, `lastPurposeChange()`, `currentPurposeView()` — **rich reads**. (d) id, identityRef, history[] (each: id, purpose, version, reason?, supersedesRef?). (e) `.id`. (f) immutable-by-operation. (g) append-only; current = latest; `requireValidPurpose` per version. (h) Impl 007 tests. (i) purpose-history round-trip; current-from-latest survives; append-only preserved.
- **Gap:** add `toState()`/`reconstitute()`; reconstitution re-runs `requireValidPurpose` on each version's purpose.

### `AthleteDecisionRecord` (athlete) — its own port
- (a) `AthleteDecisionRecord.empty(athleteRef)` + `record`, `amend`. (b) private ctor; `_decisions[]`, `_amendments[]` private. (c) `decisions`, `amendments`, `byId`, `supersededIds`, `active`. (d) athleteRef, decisions[], amendments[]. (e) `athleteRef` (the key). (f) immutable-by-operation. (g) append-only; amendments reference existing decisions; original retained. (h) Impl 009 tests. (i) append-only history round-trip; superseded/active behavior survives.
- **Gap:** add `toState()`/`reconstitute()`; reconstitution validates each `AthleteDecision` through `athleteDecision(...)` (athlete-source guard) and preserves amendment order.

### `UnderstandingAssessment` (understanding) — optional, test-helper only
- (a) produced by `produceUnderstandingAssessment`/`assess`. (b) frozen value object (already plain). (c) all fields public readonly. (d) dimension, level, fragility, staleness, safeVoiceCeiling, reasons, trace, freshness, derivedAt?, sourceRefs?, limitations?. (e) n/a (no id; keyed by dimension in a test map). (f) immutable. (g) freshness/ceiling consistency. (h) Impl 008 tests. (i) freshness survival through an in-memory helper.
- **Gap:** **no repository, no `reconstitute`** — it is already a plain frozen value; a test stores/loads it via a `Map` and asserts `derivedAt`/`freshness`/`sourceRefs`/`limitations` survive.

---

## 3. Proposed File / Module Layout

[FACT] Existing layout untouched except the additive files below. **No `src/infrastructure/`, no `src/modules/persistence/`, no DB/schema/migration folders.**

[DECISION]
```text
src/modules/observation/
  domain/observation-set.ts            # + toState()/static reconstitute()
  application/
    observation-set-repository.ts       # port: ObservationSetRepository
    in-memory-observation-set-repository.ts
  tests/observation-set-repository.test.ts

src/modules/reasoning/
  domain/hypothesis.ts                  # + toState()/static reconstitute()
  application/
    hypothesis-repository.ts
    in-memory-hypothesis-repository.ts
  tests/hypothesis-repository.test.ts

src/modules/understanding/
  domain/understanding-profile.ts       # + toState()/static reconstitute()
  application/
    understanding-profile-repository.ts
    in-memory-understanding-profile-repository.ts
  tests/understanding-profile-repository.test.ts
  tests/assessment-freshness-survival.test.ts   # in-memory Map helper (UC7); no repo

src/modules/decision-support/
  domain/decision-support-case.ts       # + toState()/static reconstitute()
  application/
    decision-support-case-repository.ts
    in-memory-decision-support-case-repository.ts
  tests/decision-support-case-repository.test.ts

src/modules/athlete/
  domain/athlete.ts                     # + toState()/static reconstitute()
  domain/athlete-decision-record.ts     # + toState()/static reconstitute()
  application/
    athlete-repository.ts
    in-memory-athlete-repository.ts
    athlete-decision-record-repository.ts
    in-memory-athlete-decision-record-repository.ts
  tests/athlete-repository.test.ts
  tests/athlete-decision-record-repository.test.ts
```
[DECISION] Each module's `index.ts` exports the **port type** and (optionally) the in-memory adapter for cross-module test reuse; **state types are exported only if the adapter needs them** (Decision in §4), never as the primary domain API.

---

## 4. State Export / Reconstitution Contracts

[DECISION] For every `toState()`/`reconstitute(state)` pair:
- `toState()` returns **structurally plain, serializable** state (branded-string ids, numbers, strings, and frozen value objects) — **no live mutable internal references** (the in-memory adapter additionally deep-copies, §6).
- `reconstitute(state)` returns a **valid** domain object, or **throws** (typed `Error`) on invalid state.
- `reconstitute` **validates aggregate invariants** and rebuilds invariant-bearing value objects through their **existing smart constructors** (it does not trust the blob blindly).
- A reconstituted object **behaves identically** to one built through the public factory + operations (same getters, same `assess()`/`active()`/`currentPurpose()` results).
- Round-trip **preserves**: identity · traceability refs · append-only history · supersession · terminal output + support integrity · projection freshness (where stored).
- `reconstitute` **creates no new domain events/outcomes** and **does not update timestamps** — every timestamp comes from the input state.

[DECISION] **State-type export rule:** export each `<Aggregate>State` type from its module **only because the repository/adapter signatures need it**; it is an *adapter contract*, not the primary public domain surface. Mark it clearly as the persistence shape.

[QUESTION] Whether `<Aggregate>State` should be **versioned** (a `schemaVersion` field) — deferred; not needed for in-memory, flagged for the first real serialization.

---

## 5. Repository Port Contracts

[DECISION] Each port is a tiny interface in the owning module, e.g.:
```ts
export interface ObservationSetRepository {
  save(set: ObservationSet): void;
  findById(id: ObservationSetId): ObservationSet | undefined;
  exists(id: ObservationSetId): boolean;
}
```
(Analogous: `HypothesisRepository`/`HypothesisId`, `UnderstandingProfileRepository`/`UnderstandingProfileId`, `DecisionSupportCaseRepository`/`DecisionSupportCaseId`, `AthleteRepository`/`AthleteId`, `AthleteDecisionRecordRepository` keyed by `athleteRef: string`.)

[DECISION] Rules every repository obeys:
- it stores via `toState()` and loads via `reconstitute(state)`;
- the in-memory repository stores **copies of state**, not object references;
- **retrieving twice returns independent objects**; mutating a retrieved object never mutates stored state;
- it **creates no domain meaning** (no claim/signal/evidence/projection/voice);
- it **does not create projections** from aggregates;
- it **does not silently fix** invalid state (reconstitution throws);
- `save` for an existing id **replaces** that id's stored state (the aggregate already enforced append-only internally; the repository never edits history itself).

---

## 6. In-Memory Repository Rules

[DECISION]
- Back each adapter with a `Map<idString, State>` storing the **result of `toState()`**.
- **Deep-copy state on `save`** and **on `findById`** (e.g. `structuredClone`, available in Node 22) so neither the caller's object nor a second read shares references with the store.
- No global mutable singleton — a repository instance is created per test/use; an optional `clear()` may exist for tests.
- `save` replaces stored state for the same id only with a **valid** object (it received a real aggregate, so it is valid by construction).
- **Append-only behavior is enforced by the aggregate/record**, never by repository mutation tricks; the repository persists whatever valid value the aggregate produced.
- The repository **emits no events**.

[FACT] Because aggregates are already immutable-by-operation and frozen, the deep-copy is belt-and-suspenders for mutation isolation (UC: a loaded copy is independent of the stored state and of other loads).

---

## 7. Projection Storage Rule

[DECISION] **No projection repository.** UC7 is proven by a test that puts an `UnderstandingAssessment` into a local `Map` and reads it back, asserting `derivedAt`, `freshness`, `sourceRefs`, `trace`, and `limitations` survive and the loaded value is **still a view** (its `safeVoiceCeiling` still reflects its freshness). No query/read-model store; no projection-as-truth.

---

## 8. Negative Capability — what must remain impossible

[DECISION] Enforced by types + tests:

| Must remain impossible | How |
|---|---|
| Repository stores a live object reference | adapter stores `toState()` output; deep-copy on save/find; mutation-isolation test |
| Mutating a retrieved object mutates stored state | deep-copy + immutable aggregates; negative test |
| Invalid state rehydrates successfully | `reconstitute` validates + rebuilds via smart constructors; negative test expects throw |
| Repository bypasses aggregate invariants | the only load path is `reconstitute` (validating); no field-bag constructor is public |
| Append-only history / supersession lost | enforced by aggregate; round-trip test asserts originals retained |
| Traceability refs lost | `toState` carries refs verbatim; survival test re-verifies the chain |
| Projection freshness lost (where stored) | UC7 helper test |
| `Athlete` persists inferred state/capacity/readiness | no such field exists; state-shape test asserts absence |
| `DecisionSupportCase` owns an `AthleteDecision` object | only `AthleteDecisionRef` in state; negative test |
| Production DB/ORM/schema/migration/event-bus/cache/`infrastructure` created | none added; structural guard test |
| Persistence shape drives the domain | the domain's `toState()` defines the shape; reconstitution validates; forbidden-behavior test |

---

## 9. Validation Strategy (the gate)

[ASSUMPTION] Tests to the contracts; **negative + boundary tests are defining.**

**Positive:**
- **port-contract tests** per repository (against the in-memory adapter);
- **round-trip** per boundary (UC1–UC6): `ObservationSet` (active/superseded, provenance/quality), `Hypothesis` (state/evidence-trace/falsifiers/confidence), `UnderstandingProfile` (dimensions/staleness; `assess()` equal after rehydrate), `DecisionSupportCase` (terminal output + degradation + `AthleteDecisionRef`), `Athlete` (purpose history + current-from-latest), `AthleteDecisionRecord` (amend/supersede + active);
- **mutation-isolation** (independent loads; mutating one never affects the store);
- **projection-freshness survival** (UC7 helper).

**Negative (must prove absence):**
- `reconstitute` **throws on invalid state** (e.g. hypothesis with no falsifier; non-athlete-sourced purpose);
- a loaded **projection is never `current`/source truth**;
- **append-only/supersession/traceability never lost**;
- **no `AthleteDecision` object** on a case; **no inferred state** on `Athlete`;
- **no DB/ORM/schema/migration/event-bus/cache/`infrastructure` file** (structural guard).

**Dependency-boundary:**
- each port + adapter imports only its **owning module + `shared-kernel`**; existing upstream→downstream and `athlete ⇏ downstream` boundaries stay green;
- **all 212 Impl 001–009 tests continue to pass**, and the `toState()`/`reconstitute()` additions are **additive** (no existing test changes).

**Gate before commit:** `typecheck` strict clean · full suite green incl. new tests · no new top-level module · no `infrastructure`/`persistence` folder · no DB/ORM/schema/migration/event-bus/cache file · `git status` clean except intended additions.

---

## 10. Relationship To Existing Architecture

[FACT] This implements the **first part** of [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md):
- **ports = the first persistence boundary** (§1.1); **in-memory adapters = safe test implementations** (§1.7);
- **no production persistence tech** chosen; **events/outcomes remain conceptual** (no event bus, no records — Spec 011);
- **no projection engine** (§6 — freshness only proven to survive);
- **no API/UI**;
- **persistence preserves epistemic roles** — reconstitution-through-validation + "domain shape drives the store" enforce the paper's named most-dangerous shortcut as a forbidden behavior.

[DECISION] The only module-touching work is the **additive `toState()`/`reconstitute()`** per boundary — no existing behavior or test changes.

---

## 11. Open Questions (do not block implementation)

[QUESTION] production DB technology; whether event sourcing is needed; event-record envelope (Spec 011); serialization format; schema design; migration strategy; transaction boundaries; read-model storage; projection retention; multi-athlete tenancy; privacy/deletion policy; whether `<Aggregate>State` should later be **versioned**.

[ASSUMPTION] None blocks this slice: ports + in-memory adapters + validated reconstitution prove the round-trip safely regardless of how these resolve.

---

## 12. Implementation Task Preview

[DECISION] **Implementation 010 — Add repository ports, in-memory repositories, and validated reconstitution APIs.**

**Scope:** add per boundary (`ObservationSet`, `Hypothesis`, `UnderstandingProfile`, `DecisionSupportCase`, `Athlete`, `AthleteDecisionRecord`): an additive `toState()`/`static reconstitute()`, a module-owned port, an in-memory adapter, and repository tests; plus the UC7 freshness-survival helper test. Consume only the owning module + `shared-kernel`.

**Acceptance criteria:**
- each boundary round-trips through `save`/`findById` preserving identity, provenance, traceability, append-only history, supersession, terminal output + support integrity, and `AthleteDecisionRef` (referenced, not owned);
- `reconstitute` rejects invalid state; loads are independent values (mutation isolation);
- projection freshness survives the in-memory helper; a loaded projection is still a labeled view;
- no inferred state on `Athlete`; no decision object on a case;
- the validation gate (§9) passes; all 212 existing tests stay green; additions are additive.

**The preview explicitly states this slice introduces:**
- **no** production DB · **no** ORM · **no** schema · **no** migrations · **no** event bus · **no** cache · **no** infrastructure layer · **no** API · **no** UI · **no** LLM · **no** event records · **no** projection repository.

---

## 13. Technical Constraints

[FACT] TypeScript strict · Node native test runner (`node:test` + `node:assert/strict`) · no external test framework · no framework · no DB · no event bus · no LLM. No constructor parameter properties. `import type` where appropriate; explicit `.ts` extensions; explicit field declarations; pure domain objects. **No raw field-bag rehydration without validation.** Deep-copy via `structuredClone` (Node 22).

---

## 14. Success Criteria

[ASSUMPTION] After this tech spec, Implementation 010 can be written **without deciding any database, schema, event-bus, or domain question in code** — the port shapes, the `toState()`/`reconstitute()` contracts, the in-memory adapter rules, and the per-module state shapes are specified. The future implementation answers:

> **"Can Aurora save and retrieve its implemented domain objects without corrupting invariants, traceability, freshness, or ownership boundaries?"**

Provable: each aggregate gains an additive, validated `toState()`/`reconstitute()`; a module-owned port with `save`/`findById`/`exists`; and a `Map`-backed, deep-copying in-memory adapter — so a saved-then-loaded object is an **independent, fully-valid value** with provenance, traceability, append-only history, supersession, support integrity, referenced-not-owned decision, and projection freshness intact, **invalid state is rejected on load**, **no technology is chosen**, and **all 212 existing tests stay green**.

---

*This is the tenth Technical Specification and the first persistence implementation plan. It defines ports + in-memory adapters + a validated reconstitution surface; it chooses no technology, adds no event bus / projection engine / infrastructure layer, and keeps persistence a boundary around aggregates, never a driver of the domain.*

*Inputs: [Spec 010](./010-persistence-ports-in-memory-repositories.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
