# Spec 010 — Persistence Ports and In-Memory Repositories

> The first persistence slice: **repository ports + in-memory adapters** for Aurora's implemented aggregate roots and stateful records, with round-trip and boundary tests — making persistence behavior explicit and testable **without choosing a DB, ORM, schema, cache, event bus, or any infrastructure**.
>
> Behavioral specification. Not implementation; no database; no changes to existing module *behavior*.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code, no DB) |
| **Slice** | `aggregate/stateful-record → repository port → in-memory adapter → round-trip preserves invariants/traceability/freshness/history` |
| **Implements (first part of)** | [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) §1.1, §1.7, §8, §11 |
| **Builds on** | Implementations 001–009 (212/212 green) |
| **Produces (behavior)** | per-aggregate repository **ports**, **in-memory** adapters, a validated **reconstitution + state-export** surface, round-trip + boundary tests |
| **Explicitly does not produce** | DB, ORM, schema, migrations, event bus, queue, cache, serialization format, API, UI, LLM, event records, projection engine |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict port shapes, the exact reconstitution/state-export APIs, adapter layout) follows separately as 010A. Implementation does not begin from this document, and **no production technology is chosen here**.

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

[FACT] **Central question:** *How can Aurora persist and retrieve its implemented aggregates and stateful records through ports while preserving domain invariants, traceability, freshness, append-only history, and epistemic boundaries?*

[FACT] This is the first executable step of the Persistence & Event Surface paper: it turns that paper's rules into **ports + in-memory adapters** so persistence behavior is proven *before* any database, ORM, or event bus exists. The danger this slice guards is the paper's named one — **the persistence shape driving the domain** — so the contract is written to make a corrupting round-trip a test failure.

---

## 2. Core Principle

[FACT]
- **Persistence is not domain authority.** A repository **preserves and restores** domain objects; it does not create meaning.
- A repository must **not**: bypass constructors, weaken invariants, invent traceability, turn a projection into source truth, overwrite append-only history, or collapse source / inference / projection / output into one stored blob.
- The first implementation proves persistence behavior through **in-memory repositories only**.

[ASSUMPTION] The guiding sentence: *a saved-then-loaded aggregate must be indistinguishable, in invariants and epistemic status, from the original — or the round-trip is wrong.*

---

## 3. Scope & Non-Scope

### In scope
[DECISION] repository **ports** (interfaces) for approved persistence boundaries; **in-memory** repository adapters; aggregate/stateful-record **round-trip**; identity lookup; **append-only** preservation; **supersession** preservation; **traceability** preservation; **projection-freshness** preservation *only where a projection is stored in-memory for a test*; no-production-DB **boundary tests**; an additive, validated **reconstitution + state-export** surface per aggregate (so rehydration never uses raw field bags).

### Non-Scope
[FACT] production database; ORM; database schema; migrations; event bus; queue; cache; cloud infrastructure; API; UI; LLM output; background jobs; production scheduler; event serialization format; full event sourcing; read-model storage backend; authentication; multi-tenant storage; Garmin/FIT import; **event/outcome records** (Spec 011); a **projection repository/engine** (deferred).

[DECISION] **No production technology is chosen.** Every contract here is satisfiable by an in-memory `Map`-backed adapter and verified by tests.

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] Carried from the Persistence & Event Surface paper (§1–§9) and the module invariants:

1. **Rehydration goes through validating constructors/factories** — never raw field bags.
2. **A repository cannot save or load an invalid domain object.**
3. **Append-only histories stay append-only** across a round-trip (`PurposeHistory`, `AthleteDecisionRecord`, hypothesis revisions, observation supersession).
4. **Superseded records remain traceable** after a round-trip (originals retained, not deleted).
5. **Traceability reference handles survive** a round-trip (kind + id), and the repository **never invents** them.
6. **A projection round-trips as a labeled view** — `derivedAt` + `freshness` + `sourceRefs` + `limitations` survive; loading never makes it `current`.
7. **`DecisionSupportCase` round-trips referencing — never owning — the decision** (only `AthleteDecisionRef`).
8. **`Athlete` round-trips owning only the *given*** — purpose + decisions; never inferred state/capacity/readiness.
9. **Mutation isolation** — mutating a loaded copy must not retroactively change the stored object (and vice versa); aggregates are immutable-by-operation, so a load yields an independent value.
10. **A repository creates no domain meaning** — no claim, signal, evidence, projection, or voice is produced by saving/loading.

[ASSUMPTION] The *defining* invariants are **1, 5, 6, 7, 9** — together they make "the store quietly corrupted the model" a failing test: invalid states are unrepresentable on load, traceability and freshness survive intact, the decision stays referenced-not-owned, and loads are independent values.

---

## 5. Candidate Persistence Boundaries

[DECISION] The aggregate roots / stateful records evaluated, and what each must preserve.

| Module | Persistence boundary | Must preserve across round-trip |
|---|---|---|
| **observation** | `ObservationSet` | observations (measured/subjective/missing-data), provenance, source, quality, **active vs. superseded** behavior, observation ids, completeness/expected |
| **reasoning** | `Hypothesis` (owns `EvidenceCase`) | claim, scope, falsifiers, evidence cases + directions, lifecycle state, revisions, `ClaimConfidence`, `purposeContextRef`, **trace to Signal → Observation → ObservationSet** |
| **understanding** | `UnderstandingProfile` | dimensions, levels, survived-challenge history, surprises, fragility, staleness, traces |
| understanding *(test-only)* | `UnderstandingAssessment` *(projection)* | `derivedAt`, `freshness`, `sourceRefs`, `limitations`, `safeVoiceCeiling` — **only stored in-memory inside a test** to prove freshness survival (UC7); no projection repository is created |
| **decision-support** | `DecisionSupportCase` | opportunity, gate results, `TraceabilityVerification` result, terminal output, degradation reasons, `SupportQuality`, **`AthleteDecisionRef` only** |
| **athlete** | `Athlete` (owns `PurposeHistory`, `AthleteDecisionRecord`) | purpose versions **append-only** + current-from-latest; `PurposeChanged` derivation; `AthleteDecision` **append-only / amend / supersede**; **no inferred state** |

[DECISION] **Ports in this first slice:** `ObservationSetRepository`, `HypothesisRepository`, `UnderstandingProfileRepository`, `DecisionSupportCaseRepository`, `AthleteRepository`. **Deferred:** any projection repository, any event-record store, any cross-aggregate/query port.

---

## 6. Required Design Decisions

### Decision 1 — Repository ports live in the owning module
[DECISION] Each port (interface) lives in the **owning module** (its application/port layer), beside the aggregate whose invariants it serves.
- **Why:** the aggregate's invariants and reconstitution belong to its module; a shared persistence module would scatter them and invite a generic framework.
- **Consequence:** five ports, one per aggregate, each importing only its own domain + `shared-kernel`.
- **Risk:** five small ports feel repetitive.
- **Reversal Point:** if a genuinely shared port contract emerges (identical across modules), extract a `shared-kernel` `Repository<T, Id>` *type* — never a shared implementation.

### Decision 2 — In-memory adapters live in the test/neutral layer
[DECISION] In-memory adapters live under each module's **`tests/`** (or a module-local `application/in-memory` *only* if reused across that module's tests). **No `infrastructure/` layer is created.**
- **Why:** in-memory adapters exist to *prove the ports*, not to ship storage; keeping them test-adjacent avoids implying a production persistence layer.
- **Consequence:** adapters are `Map`-backed, deterministic, and disposable.
- **Risk:** a reusable in-memory adapter drifts toward looking like production infra.
- **Reversal Point:** when a real adapter is specified (a later spec), it implements the *same port*; the in-memory one remains the test double.

### Decision 3 — Rehydration via an explicit, validated reconstitution + state-export surface
[DECISION] Repositories restore objects through an **explicit reconstitution factory** that runs the **same invariant validation as construction**, paired with a **state-export accessor**; **never** raw field bags, and **never** by re-running mutating operations blindly.
- **Why:** every aggregate today has a **private constructor and private `toProps()`** — there is no public rehydration path. The architecture paper sanctions "explicit reconstitution APIs that enforce invariants." So the future implementation **adds** a minimal, validated `reconstitute(state)` + `toState()` (or equivalent) per aggregate — an **additive** surface, not a behavior change.
- **Consequence:** the persisted shape is the exported state; loading re-validates it, so an invalid state cannot be reconstituted. `static create/open/initialize/empty` remain the *birth* path; `reconstitute` is the *rebirth* path.
- **Risk:** `reconstitute` could become a back door that skips invariants if written carelessly.
- **Reversal Point:** if reconstitution proves error-prone, fall back to **operation-replay from a persisted operation/history log** (rebuild via the public op methods) — heavier but uses only existing surfaces; chosen only if the validated factory can't hold the invariants.

[FACT] This is the one place Spec 010's *implementation* will touch existing modules — **additively** (new `reconstitute`/`toState` methods), preserving all current behavior and tests. The spec flags it explicitly rather than pretending the current surface suffices.

### Decision 4 — No projection repository in this slice
[DECISION] **Do not create a projection repository.** `UnderstandingAssessment` freshness survival (UC7) is proven by storing it in an **in-memory `Map` inside a test** and asserting its metadata round-trips — not by a production projection store.
- **Why:** projections recompute from sources; persisting them is a later performance concern (paper §6). Proving freshness *survives* storage is enough now.
- **Consequence:** no projection-as-cache infrastructure; the freshness contract is validated, not productionized.
- **Risk:** a test-only store is mistaken for a sanctioned projection repository.
- **Reversal Point:** a projection repository arrives only when a second projection (`ImpactAssessment`) and a real performance need justify it.

### Decision 5 — No event records in this slice
[DECISION] **Do not implement event/outcome records.** This slice may **reserve** the *names* of repository operations but adds no event store; event records are **Spec 011**.
- **Why:** the paper sequences event records after ports; conflating them bloats this slice.
- **Consequence:** repositories persist *state*, not a log of occurrences (yet).
- **Risk:** none material.
- **Reversal Point:** Spec 011 adds the append-only, ref-only event records behind their own ports.

### Decision 6 — Minimal port API: `save` / `findById` (+ `exists`; `append` only where natural)
[DECISION] The minimal operations are **`save(aggregate)`** and **`findById(id): aggregate | undefined`**, optionally **`exists(id)`**. **No query language, no filtering, no transactional API.** An **`append`**-style operation is allowed **only** where the boundary is itself append-only and it reads more honestly than `save` (e.g. appending to an `AthleteDecisionRecord`); even then it must preserve append-only semantics.
- **Why:** the smallest surface that proves round-trip + identity; query/transaction concerns are storage-technology-shaped and deferred.
- **Consequence:** ports are tiny and uniform; adapters are trivial to write and test.
- **Risk:** teams want querying immediately.
- **Reversal Point:** query/transaction ports are specified when a real read pattern or consistency need exists (a later spec), behind the same module ownership.

---

## 7. Required Repository Contracts

[DECISION] Behavioral contracts every repository must satisfy (these become the port-contract test suite, run against the in-memory adapter):

1. **Save then retrieve by id** returns an equal aggregate.
2. **The retrieved object preserves domain invariants** (it is a valid, fully-formed aggregate).
3. **The retrieved object is an independent value** — not the same mutable reference (unless an immutable shared value object).
4. **Mutating a retrieved copy does not mutate the stored object** (and vice versa).
5. **Append-only history remains append-only** after a round-trip.
6. **Superseded records remain traceable** after a round-trip.
7. **Traceability refs survive** a round-trip.
8. **Projection freshness survives** a round-trip *where projection storage is tested* (UC7).
9. **The repository cannot save an invalid domain object** (only well-formed aggregates enter).
10. **The repository creates no domain meaning** (no claim/signal/evidence/projection/voice is produced by save/load).

---

## 8. Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§10). Negative criteria are defining.

### UC1 — ObservationSet round-trip
- **AC1.1** — *Given* an `ObservationSet` with subjective, missing-data, and superseded observations, *when* saved and retrieved, *then* provenance, quality, **active vs. superseded** behavior, and observation ids are preserved.

### UC2 — Hypothesis round-trip
- **AC2.1** — *Given* a `Hypothesis` with `EvidenceCase`s and revisions, *when* saved and retrieved, *then* lifecycle state, evidence directions, falsifiers, `ClaimConfidence`, and **traceability** (to Signal → Observation → ObservationSet) are preserved.

### UC3 — UnderstandingProfile round-trip
- **AC3.1** — *Given* an `UnderstandingProfile` with dimensions, staleness, surprise, and survived-challenge history, *when* saved and retrieved, *then* understanding state and staleness behavior are preserved (a later `assess()` yields the same level/ceiling).

### UC4 — DecisionSupportCase round-trip
- **AC4.1** — *Given* a `DecisionSupportCase` with a terminal output and an `AthleteDecisionRef`, *when* saved and retrieved, *then* the case still **references the athlete decision without owning it** (only the ref; no decision object), and `SupportQuality`/degradation reasons survive.

### UC5 — Athlete PurposeHistory round-trip
- **AC5.1** — *Given* an `Athlete` with multiple purpose versions, *when* saved and retrieved, *then* history remains **append-only** and the current purpose derives from the latest active version.

### UC6 — AthleteDecisionRecord round-trip
- **AC6.1** — *Given* an `AthleteDecisionRecord` with amended/superseded decisions, *when* saved and retrieved, *then* original decisions remain traceable and active decisions derive correctly.

### UC7 — Projection freshness survival (test-only)
- **AC7.1** — *Given* an `UnderstandingAssessment` with freshness metadata, *when* stored and retrieved in an in-memory test store, *then* `derivedAt`, `freshness`, `sourceRefs`, and `limitations` survive, and the loaded assessment is **still a view** (its ceiling still reflects its freshness).

### UC8 — No production DB introduced
- **AC8.1** — *Given* this slice, *when* implemented, *then* **no** production DB, ORM, schema, migrations, event bus, cache, or `infrastructure/` layer exists.

---

## 9. Acceptance Criteria (consolidated)

[DECISION] At minimum:
- repository **ports exist only for the approved boundaries** (§5);
- **in-memory adapters** implement those ports;
- round-trip preserves **identity, provenance, traceability refs, append-only histories, supersession**;
- round-trip preserves **terminal output + support integrity**, and the **`AthleteDecisionRef` without owning the decision**;
- round-trip preserves **projection freshness** where projection storage is tested;
- repositories **cannot bypass aggregate invariants** (reconstitution validates);
- repositories **do not create domain claims or projections**;
- **no** production DB/ORM/schema/event-bus/cache/infra is created;
- **all 212 existing tests (Impl 001–009) remain green**, and any added `reconstitute`/`toState` surface is **additive** (no behavior change).

---

## 10. Explicit Forbidden Behaviors

[FACT] This spec must forbid: choosing a production database; creating ORM models; creating database schema; creating migrations; creating an event bus; creating cache infrastructure; creating a generic persistence framework; storing projections as source truth; persisting invalid objects via raw field bags; bypassing constructors/factories; overwriting append-only history; losing traceability refs; letting DB foreign keys substitute for domain traceability; storing `AthleteDecision` inside `DecisionSupportCase`; storing inferred state/capacity/readiness in `Athlete`; adding UI/API/LLM behavior.

[DECISION] These are **testable negative requirements** (§11).

---

## 11. Validation Strategy

[ASSUMPTION] Tests to the contracts; **negative + boundary tests are defining.**

**Positive:**
- **port-contract tests** per repository (run against the in-memory adapter);
- **round-trip tests** per aggregate/stateful record (UC1–UC6);
- **mutation-isolation tests** (a loaded copy is independent of the stored value);
- **append-only preservation** (`PurposeHistory`, `AthleteDecisionRecord`, hypothesis revisions);
- **supersession preservation** (observation + decision originals retained);
- **traceability survival** (refs intact; chain still verifies for a loaded `Hypothesis`/case);
- **projection-freshness survival** (UC7, in-memory test store).

**Negative (must prove absence):**
- a repository **cannot persist/reconstitute an invalid object** (validation rejects a malformed state);
- a **projection never loads as `current`/as source truth**;
- **append-only history is never overwritten** by a save;
- **traceability refs are never lost or invented**;
- **no `AthleteDecision` object** is stored on a `DecisionSupportCase`; **no inferred state** on `Athlete`;
- **no DB/ORM/schema/migration/event-bus/cache/`infrastructure` file** is introduced (structural guard).

**Dependency-boundary:**
- each port + adapter imports only its **owning module + `shared-kernel`**; the existing upstream→downstream and `athlete ⇏ downstream` boundaries stay green;
- **all 212 Impl 001–009 tests continue to pass.**

[ASSUMPTION] The negative + boundary tests are the contract that *the store preserves the model and never becomes it*. If they cannot be written/passed, the persistence design is wrong.

---

## 12. Relationship To Existing Architecture

[FACT] This spec implements the **first part** of [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md):
- **ports + in-memory only** (paper §1.7) — no DB technology, no ORM;
- **no event bus / no event records** yet (paper §1.5 / §4 — those are Spec 011);
- **no projection engine** (paper §6 — projection freshness is proven to *survive* storage, not productionized);
- **no API/UI**;
- **persistence is a boundary around aggregates, not a driver of domain design** (paper §9's named most-dangerous shortcut) — enforced by reconstitution-through-validation and the "domain shape drives the store" rule.

[DECISION] The only module-touching work the future Impl 010 entails is the **additive** `reconstitute`/`toState` surface per aggregate (Decision 3) — no existing behavior or test changes.

---

## 13. Open Questions (do not block this spec)

[QUESTION] exact production DB technology; whether event sourcing is ever needed; the event-record envelope shape (Spec 011); serialization format; schema design; migrations; transaction boundaries; projection storage strategy; read-model storage backend; retention policy; audit-log policy; privacy/deletion policy; multi-athlete tenancy.

[ASSUMPTION] None block this slice: Aurora can save and load its aggregates through ports + in-memory adapters, preserving every invariant, regardless of how these resolve. Technical-implementation questions are deferred to 010A.

---

## 14. Success Criterion

> **"Can Aurora save and retrieve its implemented domain objects without corrupting invariants, traceability, freshness, or ownership boundaries?"**

[ASSUMPTION] Answerable from this spec: each implemented aggregate (`ObservationSet`, `Hypothesis`, `UnderstandingProfile`, `DecisionSupportCase`, `Athlete` with its `PurposeHistory`/`AthleteDecisionRecord`) gains a **module-owned repository port** with a **`save`/`findById`** surface and an **in-memory adapter**; rehydration runs through an **explicit, validated reconstitution factory** (never a raw field bag), so a loaded aggregate is an **independent, fully-valid value** with its **provenance, traceability refs, append-only history, supersession, support-integrity, referenced-not-owned decision, and projection freshness all intact**, and a projection still loads as a **labeled view, never source truth**. **No DB/ORM/schema/event-bus/cache/infra is chosen**, the only module change is the **additive** reconstitution surface, and **all 212 existing tests stay green** — proving the store *preserves* the reasoning without ever *becoming* it.

---

## Known Risks

[ASSUMPTION]
- **Risk:** `reconstitute` becomes a back door that skips invariants. **Defense:** Decision 3 — reconstitution runs the same validation as construction; a negative test reconstitutes an invalid state and expects rejection.
- **Risk:** a projection loads as truth. **Defense:** invariant 6 + UC7 — freshness survives and still constrains; negative test that a loaded stale/invalid assessment lowers the voice.
- **Risk:** the in-memory adapter is mistaken for production infra. **Defense:** Decision 2 — adapters live test-adjacent; no `infrastructure/` layer; boundary test.
- **Risk:** a save overwrites append-only history. **Defense:** invariant 3 + UC5/UC6 — append-only preserved across round-trip; negative test.
- **Risk:** the decision gets stored on the case. **Defense:** invariant 7 + UC4 — only `AthleteDecisionRef`; negative test that no decision object is present.
- **Risk:** persistence shape drives the domain. **Defense:** the domain's exported state drives the store; reconstitution validates; the paper's named shortcut is a forbidden behavior (§10).

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the tenth Specification and the first persistence slice. It defines repository ports + in-memory adapters with a validated reconstitution surface; it chooses no technology, adds no event bus or projection engine, and keeps persistence a boundary around aggregates, never a driver of the domain.*

*Inputs: [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [System Map](../diagrams/SYSTEM_MAP.md) · [Spec 001](./001-observation-set-intake.md) · [Spec 003](./003-hypothesis-lifecycle.md) · [Spec 004](./004-understanding-update.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 007](./007-athlete-purpose-change-reinterpretation.md) · [Spec 008](./008-projection-refresh-staleness-strategy.md) · [Spec 009](./009-athlete-decision-feedback-loop.md) · Process: [spec-process.md](./spec-process.md)*
