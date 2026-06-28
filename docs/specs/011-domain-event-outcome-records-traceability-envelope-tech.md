# Tech Spec 011A — Domain Event / Outcome Records and Traceability Envelope — Implementation Plan

> The TS-strict plan for Spec 011: a new minimal **`event-recording`** module owning an append-only, ref-only **`DomainEventRecord`** (one envelope, two categories), a reusable **`TraceabilityEnvelope`**, a closed **`DomainEventType`** catalog, and an **append-only in-memory log + repository** — importing **only `shared-kernel`**, depending on **no** domain module, and choosing **no** bus, broker, queue, store, serialization, or event-sourcing.
>
> Technical Specification. **No code in this slice.** Implementation begins only from the approved plan as Implementation 011.

| Field | Value |
|---|---|
| **Status** | Technical Spec · *Accepted pending review* |
| **Phase** | Technical Specification (no code; no bus; no infra) |
| **Implements** | [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) |
| **Builds on** | [Spec 010](./010-persistence-ports-in-memory-repositories.md) / [010A](./010-persistence-ports-in-memory-repositories-tech.md) · Implementations 001–010 (235/235 green) |
| **Produces (plan for)** | `src/modules/event-recording/` — `DomainEventRecord` + envelope + closed catalog + append-only `DomainEventRecordLog` + repository port + in-memory adapter + validation/boundary tests |
| **Explicitly excludes** | event bus, broker, queue, pub/sub, handlers, async delivery, production event store, serialization format, DB, schema, migrations, event sourcing, projection engine, scheduler, API, UI, LLM |

[ASSUMPTION] This is **Technical Specification phase**, not Implementation. It fixes TS-strict shapes, the module layout, validation rules, and the test contract so Implementation 011 contains **no open design or domain decisions** — only typing and wiring.

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

[FACT] *How can Aurora implement append-only event/outcome records with traceability envelopes and ref-only payloads without creating commands, infrastructure, copied state, projections, or source truth?*

[FACT] The answer in code: a **new dependency-neutral module** that owns the record envelope and an append-only log; records are **constructed by the harness/application layer** (never emitted automatically by aggregates in this slice); every record is **refs + timestamps + closed-catalog type**, validated on construction and on reconstitution; the log can only **append**. No domain module imports it; it imports only `shared-kernel`.

---

## 2. Surface Gap Analysis (read from current code)

[FACT] Verified against the repository so the plan reuses real shapes and invents no incompatible names.

| # | Surface | Found in code | How 011 uses it |
|---|---|---|---|
| 1 | **shared-kernel id helper** | `src/shared-kernel/ids.ts` — branded `string & { readonly [brand]: true }`, `crypto.randomUUID()` | Same **pattern** for `DomainEventRecordId`, but **module-local** (in `event-recording/domain/ids.ts`), not added to `shared-kernel` (Decision 2). |
| 2 | **shared-kernel time** | `src/shared-kernel/time.ts` — `Timestamp { epochMillis; iso }`, `timestamp(v)`, `timestampLeq(a,b)`, `earliest`, `latest` | **Reused directly** for `occurredAt`/`recordedAt`; ordering via `timestampLeq` / `latest`. **No `Date.now()`** — caller passes timestamps. |
| 3 | **shared-kernel provenance** | `src/shared-kernel/provenance.ts` — `Provenance`, `Source` union, `provenance()` | Not required by records (records carry **refs**, not provenance copies); `Source` may inform the optional `actor/source` union only if needed. |
| 4 | **ref shape convention** | `ProjectionSourceRef { kind; id }` + `projectionSourceRef(kind,id)` (frozen, non-empty id) | `EventPayloadRef` follows the **`{ kind; id }` + frozen smart-constructor** convention. |
| 5 | **branded handle refs** | `PurposeVersionRef = string & {…}`; `AthleteDecisionRef { decisionId; at; divergedFromSupport? }` | `CorrelationRef` is a **branded string handle**; `CausationRef` is a small interface (Decision-level §5.7). |
| 6 | **terminal output names** | decision-support: `"support"` / `"inquiry"` / `"withholding"` | `TerminalOutputSelected` payload carries the **output kind string** (not text). |
| 7 | **projection freshness states** | understanding: `"current"`/`"stale"`/`"partial"`/`"invalid"`/`"unknown"` | `ProjectionFreshnessChanged` / envelope freshness carries a **local copy of this 5-state union** as a status label (Decision 8). |
| 8 | **repository port convention** | `interface XRepository { save; findById; exists }` (Impl 010) | Event repo **diverges deliberately**: `append`/`findById`/`all` (+ optional `findByCorrelation`) — **append-only**, no `save` (Decision 5). |
| 9 | **in-memory adapter convention** | `Map<string, XState>`; `structuredClone(e.toState())` on save; `reconstitute(structuredClone(state))` on load; `clear()` | Same deep-copy discipline; insertion-ordered storage; **dedup by id**; **no update/delete**. |
| 10 | **toState/reconstitute** | private constructor + explicit fields + `Object.freeze(this)`; `toState()` returns frozen plain state; `reconstitute(state)` re-validates then calls the private ctor | **Same pattern** for `DomainEventRecord` and `DomainEventRecordLog`. |
| 11 | **test convention** | `node:test` + `node:assert/strict`; import from `../index.ts`; `timestamp` from shared-kernel; structural guards via `node:fs` (`persistence-boundary.test.ts`) | Same; a new boundary guard for `event-recording` (§13). |

[DECISION] **No gap blocks the slice.** The only new shared-kernel-adjacent need is an id, satisfied module-locally. Names above are authoritative; Implementation 011 must not rename them.

---

## 3. Key Architectural Decisions

### Decision 1 — A new minimal `event-recording` module owns the record surface
[DECISION] Create `src/modules/event-recording/`, owning `DomainEventRecord`, `DomainEventRecordId`, `DomainEventType`, `DomainEventCategory`, `TraceabilityEnvelope`, `EventPayloadRef`, `CausationRef`, `CorrelationRef`, `DomainEventRecordLog`, `DomainEventRecordRepository`, `InMemoryDomainEventRecordRepository`.
- **Why:** event records are **cross-module occurrences**; no existing domain module owns all of them, and putting the catalog in `shared-kernel` would make the kernel domain-aware. A small, dependency-neutral module keeps the catalog in one place while importing **only `shared-kernel`**.
- **Consequence:** the five domain modules **do not import** `event-recording`; records are **created by application/harness coordination** (the neutral `src/modules/__tests__/` harness composes refs from domain objects), **not emitted automatically by aggregates** in this slice.
- **Risk:** a new top-level module can look like an event bus / infrastructure layer.
- **Mitigation:** a negative-capability test asserts `event-recording` is **not a bus** (no publish/subscribe/dispatch/handler), **not async**, **not infrastructure**, and performs **no downstream mutation**.
- **Reversal Point:** if a production event store / event sourcing is later specified, this module becomes the **domain-facing record contract**; infrastructure adapters live elsewhere, behind the same port.

### Decision 2 — Reuse shared-kernel primitives; keep the catalog out of shared-kernel
[DECISION] Reuse `Timestamp`/`timestamp()` from `shared-kernel/time.ts`. Define `DomainEventRecordId` **in the module** (module-local `ids.ts`, same branded-UUID pattern). **Do not** add `DomainEventType`, the catalog, the envelope, or the log to `shared-kernel`.
- **Why:** `shared-kernel` stays minimal and **domain-agnostic**; event types are Aurora-domain concepts, not universal primitives.
- **Consequence:** `shared-kernel` gains nothing; `event-recording` imports `time.ts` (and, if needed, nothing else).
- **Risk:** none material.
- **Reversal Point:** if a second consumer ever needs the envelope as a primitive, extract only the **ref `{kind,id}` shape** (not the catalog) to `shared-kernel`.

### Decision 3 — One record type, two categories
[DECISION] Implement **one** `DomainEventRecord` class with `category: DomainEventCategory` (`"occurrence" | "outcome"`). **No** parallel `DomainOutcomeRecord` class.
- **Why:** Spec 011 chose one envelope, two categories; one log avoids contract drift and duplicated invariants.
- **Consequence:** `category` is metadata for filtering, never behavior; the catalog pins each type's category.
- **Risk:** the category is ignored. **Mitigation:** type↔category is validated against the catalog (§9).
- **Reversal Point:** split only on a demonstrated need for hard type-separation (distinct ports/streams).

### Decision 4 — Ref-only payload (no copied state, no open bags)
[DECISION] Payload is `readonly EventPayloadRef[]`. An `EventPayloadRef` has **only** `kind`, `id`, optional `role`, optional `ownerModule`. **No** `payload: unknown`, **no** `metadata: Record<string, unknown>`, **no** copied observations/claims/terminal-output-text/decision-objects/projection-contents. If `actor/source` is needed it is modeled **explicitly** (a narrow union), never an open bag.
- **Why:** the structural guarantee that a record can't carry shadow-truth.
- **Consequence:** copying aggregate state is **unrepresentable** in the type; a test asserts it.
- **Risk:** a future need for richer payload. **Reversal Point:** add a *named, typed* field for that need — never a generic bag.

### Decision 5 — Append-only log + append-only repository
[DECISION] `DomainEventRecordRepository` exposes **`append`**, **`findById`**, **`all`** (+ optional `findByCorrelation`). **Forbidden:** `update`, `delete`, `replace`, `markProcessed`, `dispatch`, `publish`, `subscribe`, `execute`. The in-memory adapter stores deep-copied state, rejects **duplicate ids**, preserves **insertion order**.
- **Why:** an occurrence log is history; history is append-only.
- **Consequence:** corrections are **new records**; nothing is ever mutated or removed.
- **Risk:** callers want querying. **Reversal Point:** add read-only query ports later; never a mutation API.

### Decision 6 — No event bus
[DECISION] **No** event bus / queue / broker / async dispatch / handler registry / subscription. A record is **stored**; **nothing is executed**.
- **Why:** Spec 011 §3 non-scope; an event is not a command.
- **Consequence:** delivery/consumption is a future, separable concern.
- **Risk/Reversal:** transport is chosen only when a real entrypoint requires it, behind a port, outside this module.

### Decision 7 — Closed event-type catalog
[DECISION] `DomainEventType` is a **closed string union** of exactly the 26 Spec 011 types (§8). **No** arbitrary strings. A `DOMAIN_EVENT_CATALOG` lookup pins each type's producing module, category, required primary-ref kind, and minimum payload refs (§9); construction validates against it.
- **Why:** prevents typos, drift, and undeclared events; makes type↔module / type↔category checkable.
- **Consequence:** adding an event type is a deliberate catalog edit + test.
- **Risk:** none material.

### Decision 8 — Projection freshness travels as a status label, not the projection
[DECISION] Where freshness is relevant, the envelope carries `{ ref: EventPayloadRef; status: ProjectionFreshnessStatus }` where `ProjectionFreshnessStatus` is a **module-local copy of the 5-state union** (`"current" | "stale" | "partial" | "invalid" | "unknown"`).
- **Why:** a short status label is metadata about a view, not the view's contents; it mirrors how `AthleteDecisionRef` carries `at`/`divergedFromSupport`. It lets a `ProjectionFreshnessChanged` record state old/new freshness **without** importing `understanding` or copying the assessment.
- **Consequence:** the record can **never assert `current` as truth** — it only labels a transition; reading it still constrains, never promotes.
- **Risk:** the label drifts from `understanding`'s union. **Mitigation:** it's a closed union; a test pins the five members.
- **Reversal Point:** if shared, extract the freshness union to `shared-kernel` — not the catalog.

---

## 4. Proposed Module Layout

[DECISION]
```text
src/modules/event-recording/
  domain/
    ids.ts                       # DomainEventRecordId (branded) + smart ctor + newDomainEventRecordId()
    domain-event-category.ts     # DomainEventCategory union
    domain-event-type.ts         # DomainEventType union + DOMAIN_EVENT_CATALOG + ProducingModule
    event-payload-ref.ts         # EventArtifactKind, EventPayloadRef + eventPayloadRef()
    traceability-envelope.ts     # TraceabilityEnvelope + ProjectionFreshnessStatus + traceabilityEnvelope()
    causation-ref.ts             # CausationRef + causationRef()
    correlation-ref.ts           # CorrelationRef (branded) + correlationRef()
    domain-event-record.ts       # DomainEventRecord (private ctor, create/reconstitute/toState) + DomainEventRecordState
    domain-event-record-log.ts   # DomainEventRecordLog (append-only) + DomainEventRecordLogState
    index.ts
  application/
    domain-event-record-repository.ts            # port
    in-memory-domain-event-record-repository.ts  # adapter
    index.ts
  tests/
    domain-event-record.test.ts
    domain-event-record-log.test.ts
    domain-event-record-repository.test.ts
    event-recording-negative-capability.test.ts
  index.ts
```

[DECISION] **Must not create:** `src/infrastructure/`, `src/event-bus/`, `src/modules/event-bus/`, `src/modules/event-sourcing/`, `src/modules/message-broker/`, `src/modules/queue/`. **No** handlers, subscriptions, or async delivery.

[FACT] TS-strict house rules apply: no constructor parameter properties; explicit field declarations + private constructor + props object; `import type` for type-only imports; `.ts` extensions on relative imports; `Object.freeze` on value objects; native type-strip compatible.

---

## 5. Domain Objects (TS-strict shapes)

### 5.1 `DomainEventRecordId` (`domain/ids.ts`)
```ts
declare const domainEventRecordIdBrand: unique symbol;
export type DomainEventRecordId = string & { readonly [domainEventRecordIdBrand]: true };

/** From a non-empty string (caller-supplied; deterministic for tests). */
export function domainEventRecordId(value: string): DomainEventRecordId {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("DomainEventRecordId requires a non-empty string");
  }
  return value as DomainEventRecordId;
}

/** Fresh opaque id. No timestamp embedded. */
export function newDomainEventRecordId(): DomainEventRecordId {
  return crypto.randomUUID() as DomainEventRecordId;
}
```
[DECISION] No timestamp is generated by id construction; `occurredAt`/`recordedAt` are **always passed in**.

### 5.2 `DomainEventCategory` (`domain/domain-event-category.ts`)
```ts
export type DomainEventCategory = "occurrence" | "outcome";
export const DOMAIN_EVENT_CATEGORIES: readonly DomainEventCategory[] = ["occurrence", "outcome"];
```

### 5.3 `ProducingModule` + `DomainEventType` + catalog (`domain/domain-event-type.ts`)
```ts
export type ProducingModule =
  | "observation" | "reasoning" | "understanding" | "decision-support" | "athlete";

export type DomainEventType =
  // observation
  | "ObservationSetRecorded" | "ObservationSuperseded" | "SignalDetected" | "SignalRejected"
  // reasoning
  | "HypothesisOpened" | "EvidenceAttached" | "HypothesisRevised" | "HypothesisWeakened"
  | "HypothesisContradicted" | "HypothesisFalsified" | "HypothesisRetired"
  // understanding
  | "UnderstandingUpdated" | "UnderstandingMarkedStale" | "UnderstandingAssessmentProjected"
  | "ProjectionFreshnessChanged"
  // decision-support
  | "DecisionOpportunityOpened" | "DecisionSupportCaseOpened" | "DecisionSupportEvaluated"
  | "TerminalOutputSelected" | "DecisionSupportWithheld" | "AthleteDecisionRefRecorded"
  // athlete
  | "PurposeDeclared" | "PurposeChanged" | "AthleteDecisionRecorded"
  | "AthleteDecisionAmended" | "AthleteDecisionSuperseded";

export interface DomainEventCatalogEntry {
  readonly module: ProducingModule;
  readonly category: DomainEventCategory;
  readonly primaryKind: EventArtifactKind;        // required primary artifact ref kind
  readonly requiredRefKinds: readonly EventArtifactKind[]; // minimum payload/envelope refs
}

export const DOMAIN_EVENT_CATALOG: Readonly<Record<DomainEventType, DomainEventCatalogEntry>> = { /* §8 */ };
```
[DECISION] `DOMAIN_EVENT_CATALOG` is the single source for type↔module, type↔category, and required-ref validation (§9). It is **metadata, not behavior** (no functions, no effects).

### 5.4 `EventPayloadRef` + `EventArtifactKind` (`domain/event-payload-ref.ts`)
```ts
export type EventArtifactKind =
  | "ObservationSet" | "Observation" | "Signal" | "SignalRejection"
  | "Hypothesis" | "EvidenceCase"
  | "UnderstandingProfile" | "UnderstandingDimension" | "UnderstandingAssessment"
  | "DecisionOpportunity" | "DecisionSupportCase"
  | "Athlete" | "PurposeVersion" | "AthleteDecision";

export interface EventPayloadRef {
  readonly kind: EventArtifactKind;
  readonly id: string;
  readonly role?: string;           // e.g. "subject" | "supersedes" | "amends" | "cause" | "evidence"
  readonly ownerModule?: ProducingModule;
}

export function eventPayloadRef(input: EventPayloadRef): EventPayloadRef {
  if (typeof input.id !== "string" || input.id.length === 0) {
    throw new Error("EventPayloadRef requires a non-empty id");
  }
  // kind validated against the closed EventArtifactKind union at the type level + a runtime membership check
  return Object.freeze(/* conditional-spread role/ownerModule for exactOptionalPropertyTypes */ { ...input });
}
```
[DECISION] **Closed `kind`** prevents arbitrary artifact kinds; **only** `kind`/`id`/`role`/`ownerModule` exist — copying state is unrepresentable.

### 5.5 `TraceabilityEnvelope` + `ProjectionFreshnessStatus` (`domain/traceability-envelope.ts`)
```ts
export type ProjectionFreshnessStatus = "current" | "stale" | "partial" | "invalid" | "unknown";

export interface ProjectionFreshnessMarker {
  readonly ref: EventPayloadRef;            // the projection / source ref
  readonly status: ProjectionFreshnessStatus;
}

export interface TraceabilityEnvelope {
  readonly primaryArtifactRef: EventPayloadRef;     // required
  readonly sourceRefs: readonly EventPayloadRef[];  // may be empty only where the type allows (§9)
  readonly purposeVersionRef?: EventPayloadRef;     // kind "PurposeVersion"
  readonly hypothesisRef?: EventPayloadRef;         // kind "Hypothesis"
  readonly observationSetRef?: EventPayloadRef;     // kind "ObservationSet"
  readonly decisionSupportCaseRef?: EventPayloadRef;// kind "DecisionSupportCase"
  readonly athleteDecisionRef?: EventPayloadRef;    // kind "AthleteDecision"
  readonly projectionFreshness?: ProjectionFreshnessMarker;
  readonly limitations?: readonly string[];         // short labels, not copied content
}

export function traceabilityEnvelope(input: TraceabilityEnvelope): TraceabilityEnvelope { /* validate + freeze */ }
```
[DECISION] The envelope **invents no traceability**: it carries only refs the caller composed from **real** artifacts; the smart constructor validates each present ref is well-formed and (where typed) of the expected kind. Empty `sourceRefs` is rejected **except** for the origin/occurrence types the catalog marks as source-originating (§9).

### 5.6 `CorrelationRef` (`domain/correlation-ref.ts`)
```ts
declare const correlationRefBrand: unique symbol;
export type CorrelationRef = string & { readonly [correlationRefBrand]: true };

export function correlationRef(value: string): CorrelationRef {
  if (typeof value !== "string" || value.length === 0) throw new Error("CorrelationRef requires a non-empty handle");
  return value as CorrelationRef;
}
```
[DECISION] A **grouping label** for a scenario/flow; carries **no** ordering authority and **no** execution semantics.

### 5.7 `CausationRef` (`domain/causation-ref.ts`)
```ts
export interface CausationRef {
  readonly causedByRecordId?: DomainEventRecordId; // the prior record that led here
  readonly causedByRef?: EventPayloadRef;          // or the artifact that led here
}

export function causationRef(input: CausationRef): CausationRef {
  if (input.causedByRecordId === undefined && input.causedByRef === undefined) {
    throw new Error("CausationRef requires at least one of causedByRecordId / causedByRef");
  }
  return Object.freeze({ ...input });
}
```
[DECISION] **Descriptive lineage** ("this exists because that happened") — **never** a trigger. Resolving a causation graph reconstructs order; it executes nothing.

### 5.8 `DomainEventRecord` (`domain/domain-event-record.ts`)
```ts
export interface DomainEventRecordState {
  readonly id: DomainEventRecordId;
  readonly type: DomainEventType;
  readonly category: DomainEventCategory;
  readonly occurredAt: Timestamp;
  readonly recordedAt: Timestamp;
  readonly producingModule: ProducingModule;
  readonly traceability: TraceabilityEnvelope;     // carries primaryArtifactRef
  readonly payloadRefs: readonly EventPayloadRef[];
  readonly actor?: EventActor;                      // explicit narrow type, not a bag (§6)
  readonly causation?: CausationRef;
  readonly correlation?: CorrelationRef;
}

export class DomainEventRecord {
  readonly id: DomainEventRecordId;
  readonly type: DomainEventType;
  readonly category: DomainEventCategory;
  readonly occurredAt: Timestamp;
  readonly recordedAt: Timestamp;
  readonly producingModule: ProducingModule;
  readonly traceability: TraceabilityEnvelope;
  private readonly _payloadRefs: readonly EventPayloadRef[];
  readonly actor?: EventActor;
  readonly causation?: CausationRef;
  readonly correlation?: CorrelationRef;

  private constructor(props: DomainEventRecordProps) { /* assign + Object.freeze(this) */ }

  static record(input: RecordDomainEventInput): DomainEventRecord { /* full validation (§9) */ }
  get payloadRefs(): readonly EventPayloadRef[] { return this._payloadRefs; }

  toState(): DomainEventRecordState { /* frozen plain state; no live refs */ }
  static reconstitute(state: DomainEventRecordState): DomainEventRecord { /* re-validate (§9); no execution; no timestamp change */ }
}
```
[DECISION] **No behavior beyond being recorded** — no methods that act, dispatch, or mutate anything. `static record(...)` is the *birth* path; `reconstitute(...)` is the *rebirth* path (same validation), mirroring Spec 010.

### 5.9 `EventActor` (explicit, narrow — §6)
```ts
export type EventActor =
  | { readonly kind: "athlete"; readonly athleteRef: string }
  | { readonly kind: "system" }
  | { readonly kind: "coach"; readonly coachRef: string };
```
[DECISION] Used **only where applicable** (e.g. `AthleteDecisionRecorded` ⇒ `{ kind: "athlete" }`). Not an open bag; carries a **ref**, never a copied actor object.

### 5.10 `DomainEventRecordLog` (`domain/domain-event-record-log.ts`)
```ts
export interface DomainEventRecordLogState {
  readonly records: readonly DomainEventRecordState[];
}

export class DomainEventRecordLog {
  private readonly _records: readonly DomainEventRecord[];
  private constructor(records: readonly DomainEventRecord[]) { /* freeze */ }

  static empty(): DomainEventRecordLog;
  append(record: DomainEventRecord): DomainEventRecordLog;   // returns a NEW log; rejects duplicate id
  findById(id: DomainEventRecordId): DomainEventRecord | undefined;
  all(): readonly DomainEventRecord[];                       // insertion order
  findByCorrelation(ref: CorrelationRef): readonly DomainEventRecord[];

  toState(): DomainEventRecordLogState;
  static reconstitute(state: DomainEventRecordLogState): DomainEventRecordLog; // each record re-validated; dup ids rejected
}
```
[DECISION] **Immutable-by-operation** (like every aggregate): `append` returns a new log; **no** in-place mutation, **no** remove/replace. Order is **append order**; ties broken by `recordedAt` only for `findByCorrelation` presentation, never to reorder history.

---

## 6. Application Layer

### 6.1 Port (`application/domain-event-record-repository.ts`)
```ts
export interface DomainEventRecordRepository {
  append(record: DomainEventRecord): void;
  findById(id: DomainEventRecordId): DomainEventRecord | undefined;
  all(): readonly DomainEventRecord[];
  findByCorrelation(ref: CorrelationRef): readonly DomainEventRecord[]; // optional in Spec; included
}
```
[DECISION] **Append-only.** No `save`/`update`/`delete`/`dispatch`/`publish`/`subscribe`/`markProcessed`. Diverges from Spec 010's `save/findById/exists` **on purpose** — there is no "current state" to overwrite.

### 6.2 In-memory adapter (`application/in-memory-domain-event-record-repository.ts`)
```ts
export class InMemoryDomainEventRecordRepository implements DomainEventRecordRepository {
  private readonly store = new Map<string, DomainEventRecordState>(); // insertion-ordered
  append(record: DomainEventRecord): void {
    const key = String(record.id);
    if (this.store.has(key)) throw new Error("DomainEventRecord ids are append-only and unique");
    this.store.set(key, structuredClone(record.toState()));
  }
  findById(id: DomainEventRecordId): DomainEventRecord | undefined {
    const s = this.store.get(String(id));
    return s === undefined ? undefined : DomainEventRecord.reconstitute(structuredClone(s));
  }
  all(): readonly DomainEventRecord[] { /* map values → reconstitute(clone) in insertion order */ }
  findByCorrelation(ref: CorrelationRef): readonly DomainEventRecord[] { /* filter all() by correlation */ }
  clear(): void { this.store.clear(); } // test convenience only
}
```
[DECISION] Same **deep-copy discipline** as Spec 010 (`structuredClone(toState())` in, `reconstitute(structuredClone(state))` out) — the repository stores **copies, not live references**, and reconstitution **re-validates** every load. **No update/delete/dispatch** methods exist.

---

## 7. occurredAt / recordedAt Rule

[DECISION] Both required. **`recordedAt` must be ≥ `occurredAt`** — validated with `timestampLeq(occurredAt, recordedAt)`; a record where the occurrence is *after* it was recorded is rejected (no exception in this slice). `occurredAt` may be earlier than `recordedAt` (the normal case). **No `Date.now()`** anywhere — both are caller-supplied `Timestamp`s (deterministic tests).

---

## 8. Event Type Catalog (the closed set)

[DECISION] Each type's catalog entry. **Producing module · Category · Primary ref kind · Min required refs · Forbidden payload.** (Real module/artifact names per §2.)

### observation
| Type | Cat. | Primary kind | Min refs | Forbidden payload |
|---|---|---|---|---|
| `ObservationSetRecorded` | occurrence | `ObservationSet` | provenance/source refs (sourceRefs may originate here) | copied observations |
| `ObservationSuperseded` | outcome | `ObservationSet` | superseded `ObservationSet` ref (role `supersedes`) | copied observations |
| `SignalDetected` | occurrence | `Signal` | `ObservationSet` + `Observation` roots | copied signal/observation state |
| `SignalRejected` | outcome | `SignalRejection` | candidate roots | copied data |

### reasoning
| Type | Cat. | Primary kind | Min refs | Forbidden payload |
|---|---|---|---|---|
| `HypothesisOpened` | occurrence | `Hypothesis` | `PurposeVersion` ref + trace roots | copied claim/evidence |
| `EvidenceAttached` | occurrence | `Hypothesis` | `EvidenceCase` + `Signal` | copied evidence body |
| `HypothesisRevised` | outcome | `Hypothesis` | cause ref | copied state |
| `HypothesisWeakened` | outcome | `Hypothesis` | cause ref | copied state |
| `HypothesisContradicted` | outcome | `Hypothesis` | contradicting `EvidenceCase` ref | copied state |
| `HypothesisFalsified` | outcome | `Hypothesis` | falsifier/`EvidenceCase` ref | copied state |
| `HypothesisRetired` | outcome | `Hypothesis` | reason ref | copied state |

### understanding
| Type | Cat. | Primary kind | Min refs | Forbidden payload |
|---|---|---|---|---|
| `UnderstandingUpdated` | outcome | `UnderstandingProfile` | dimension + tested-outcome ref | copied profile/level |
| `UnderstandingMarkedStale` | outcome | `UnderstandingProfile` | dimension + staleness-reason ref | copied profile |
| `UnderstandingAssessmentProjected` | occurrence | `UnderstandingAssessment` | `sourceRefs` + freshness marker | the assessment as truth |
| `ProjectionFreshnessChanged` | outcome | `UnderstandingAssessment` | freshness marker (old→new) + source refs | `current`-by-assertion |

### decision-support
| Type | Cat. | Primary kind | Min refs | Forbidden payload |
|---|---|---|---|---|
| `DecisionOpportunityOpened` | occurrence | `DecisionOpportunity` | — | copied state |
| `DecisionSupportCaseOpened` | occurrence | `DecisionSupportCase` | `DecisionOpportunity` ref | copied case |
| `DecisionSupportEvaluated` | outcome | `DecisionSupportCase` | gate-result refs | copied gate internals |
| `TerminalOutputSelected` | outcome | `DecisionSupportCase` | output-kind label (`support`/`inquiry`/`withholding`) via `role` | rendered output text; an `AthleteDecision` |
| `DecisionSupportWithheld` | outcome | `DecisionSupportCase` | withholding-reason refs | copied state |
| `AthleteDecisionRefRecorded` | occurrence | `DecisionSupportCase` | `AthleteDecision` ref only | the `AthleteDecision` object |

### athlete
| Type | Cat. | Primary kind | Min refs | Forbidden payload |
|---|---|---|---|---|
| `PurposeDeclared` | outcome | `Athlete` | `PurposeVersion` ref | copied profile / inferred state |
| `PurposeChanged` | outcome | `Athlete` | new + prior `PurposeVersion` refs | inferred capacity/readiness |
| `AthleteDecisionRecorded` | outcome | `AthleteDecision` | optional `DecisionSupportCase` ref; `actor.kind="athlete"` | obedience/compliance score; outcome-correctness |
| `AthleteDecisionAmended` | outcome | `AthleteDecision` | amended `AthleteDecision` ref (role `amends`) | copied decision |
| `AthleteDecisionSuperseded` | outcome | `AthleteDecision` | superseded `AthleteDecision` ref (role `supersedes`) | copied decision |

[FACT] **No** infrastructure/UI/LLM event types. The output kind for `TerminalOutputSelected` is carried as a **`role` string on a `DecisionSupportCase` ref** (`"support"`/`"inquiry"`/`"withholding"`), not as rendered text.

---

## 9. Record Validation Rules (construction + reconstitution)

[DECISION] `DomainEventRecord.record(...)` and `.reconstitute(...)` run the **same** checks; invalid input **throws** (typed `Error`). Required:

1. `id` present (non-empty `DomainEventRecordId`).
2. `type` ∈ closed catalog (`DomainEventType`).
3. `category` ∈ `{occurrence, outcome}`.
4. `occurredAt` and `recordedAt` present and valid; **`timestampLeq(occurredAt, recordedAt)`** (§7).
5. `producingModule` present and **equal to `DOMAIN_EVENT_CATALOG[type].module`** (type↔module match).
6. `category` **equals `DOMAIN_EVENT_CATALOG[type].category`** (type↔category match).
7. `traceability.primaryArtifactRef` present and its `kind` **equals `catalog[type].primaryKind`**.
8. all `catalog[type].requiredRefKinds` are present (in `payloadRefs` or the typed envelope slots).
9. every `payloadRef`/envelope ref is a valid `EventPayloadRef` (non-empty id; `kind` ∈ `EventArtifactKind`).
10. **payload is ref-only** — the type makes copied state unrepresentable; reconstitution additionally rejects any extra keys on payload entries (only `kind`/`id`/`role`/`ownerModule`).
11. `traceability.sourceRefs` **non-empty**, **unless** `type` is catalog-marked source-originating (`ObservationSetRecorded`, `SignalDetected`, `DecisionOpportunityOpened`, `PurposeDeclared`) — empty envelope otherwise rejected.
12. duplicate refs allowed **only** when roles differ (e.g. a supersession referencing same kind twice with `supersedes`/`subject`); otherwise rejected.
13. `actor` (if present) is a valid `EventActor` variant; **required `{kind:"athlete"}`** for `AthleteDecisionRecorded`.
14. **no execution / no mutation** on construct or reconstitute; **no timestamp regeneration** on reconstitute (timestamps are carried verbatim).

[ASSUMPTION] Defining checks: **5, 6, 7, 10, 14** — they make "an event in the wrong module/category, with the wrong subject, carrying copied state, or that acts on rehydrate" a failing test.

---

## 10. Ref-Only Payload Enforcement

[DECISION] Three layers:
1. **Type:** `payloadRefs: readonly EventPayloadRef[]`; `EventPayloadRef` has only `kind`/`id`/`role`/`ownerModule`; **no** `payload: unknown`, **no** `metadata: Record<string, unknown>`.
2. **Construction:** `eventPayloadRef()` validates non-empty id + `kind` membership and **freezes**.
3. **Reconstitution:** rejects payload entries with **unknown keys** (guards against a hand-crafted state smuggling copied fields).

[DECISION] **No arbitrary metadata** in this slice. `actor/source` is the only non-ref field, modeled as the explicit `EventActor` union (§5.9).

---

## 11. Reconstitution / State Rules

[DECISION] Following Impl 010:
- `DomainEventRecord.toState()` / `static reconstitute(state)` and `DomainEventRecordLog.toState()` / `static reconstitute(state)`.
- State is **plain serializable** (timestamps as `{epochMillis, iso}`; refs as plain `{kind,id,role?,ownerModule?}`; ids/branded handles as strings).
- `reconstitute` runs **all §9 checks**; invalid stored state is **rejected**.
- **No execution** on rehydrate; **no timestamp change**; log reconstitution **rejects duplicate ids** and preserves order.

---

## 12. Use Cases → Implementation Tests

[DECISION] Spec 011 UC1–UC8 become concrete tests (composed in `event-recording/tests/` using harness-built refs; no domain-module import):

- **UC1** — `ObservationSetRecorded`: primary `ObservationSet` ref + provenance refs; assert **no copied observations**.
- **UC2** — `EvidenceAttached`: refs to `Hypothesis`/`EvidenceCase`/`Signal` + trace; assert **no copied bodies**.
- **UC3** — `UnderstandingMarkedStale`: refs to `UnderstandingProfile`/dimension + `PurposeChanged` (as a payload ref); assert **no profile mutation** (the record holds only refs; nothing to mutate).
- **UC4** — `TerminalOutputSelected`: ref to `DecisionSupportCase` + output kind (`support`/`inquiry`/`withholding`) via role; assert it is **not an `AthleteDecision`** (no decision fields).
- **UC5** — `AthleteDecisionRecorded`: ref to `AthleteDecision` (+ optional case) + `actor.kind="athlete"`; assert **no compliance/obedience score**.
- **UC6** — Correlation: many records share a `CorrelationRef`; `findByCorrelation` groups them; assert **no execution chain** (appending one never appends/changes another).
- **UC7** — Ref-only: a state with an extra payload key **fails reconstitution**.
- **UC8** — Append-only correction: `AthleteDecisionAmended`/`...Superseded` **appends a new record**; the prior record is unchanged and still present.

---

## 13. Validation Strategy (tests before implementation)

[ASSUMPTION] Negative + boundary tests are **defining**.

1. construct a valid record with required envelope.
2. reject an invalid `type` (not in catalog).
3. reject type/module mismatch.
4. reject type/category mismatch.
5. reject missing `primaryArtifactRef`.
6. reject missing/empty traceability envelope (where the type requires sources).
7. enforce ref-only payload shape (type-level + runtime).
8. reject a copied aggregate-like payload (extra keys) on reconstitute.
9. append-only log preserves order.
10. duplicate record id rejected (log + repository).
11. assert **no** `update`/`delete`/`replace`/`dispatch`/`publish`/`subscribe`/`markProcessed` methods exist (structural).
12. repository stores **copies, not live references** (mutating a returned record/ref doesn't change the stored one).
13. reconstitution rejects invalid stored state.
14. causation/correlation **execute nothing** (append is inert).
15. `TerminalOutputSelected` is **not an `AthleteDecision`**.
16. `AthleteDecisionRecorded` has **no compliance score** field.
17. `ProjectionFreshnessChanged` **does not assert `current`** (carries a status label; cannot promote).
18. correction/supersession **appends a new record**.
19. **no event bus/queue/broker files** (structural; extends `persistence-boundary.test.ts` tokens).
20. **no DB/schema/serialization tech** token leak (structural).
21. **boundary/import** test: `event-recording` imports only `shared-kernel` + stdlib; **no domain module imports `event-recording`**.
22. **all 235 existing tests continue to pass.**

[DECISION] Tests 11, 19, 20, 21 are **structural guards** (via `node:fs`), mirroring `persistence-boundary.test.ts`. Test 21 adds the new module to the import-graph rules.

---

## 14. Boundary Rules

[DECISION]
- `event-recording` imports **only** `shared-kernel` (`time.ts`; module-local `ids.ts`) and the TS standard library.
- `event-recording` **does not import** `observation` / `reasoning` / `understanding` / `decision-support` / `athlete`.
- the five domain modules **do not import** `event-recording` in this slice.
- **no** `infrastructure/` layer; **no** event bus; **no** handler registry.
- the **neutral harness** (`src/modules/__tests__/`) may compose refs from domain objects for cross-module tests (it already imports all modules); the `event-recording/tests/` build refs from plain literals.

[FACT] This keeps `event-recording` a **dependency-neutral leaf** beside `shared-kernel`: it knows the *names* of modules/artifacts (string unions) but imports **none of them**, so the kernel never becomes event-aware and the domain never depends on the recorder.

---

## 15. Relationship To Existing Architecture

[FACT] Records vs. repositories (Spec 010): repositories answer *"what is the aggregate now?"* and are source-of-truth; event records answer *"what happened?"*, are append-only and ref-only, and are **never** source truth. Event records **do not replace** repositories and are **not** an event-sourcing rebuild mechanism — aggregate rebuild stays via `toState()`/`reconstitute()` (Spec 010). Event records **preserve occurrence history**; **future reprojection (Spec 012) may consume them**, but **not in this slice**. The append-only histories already *inside* aggregates (`PurposeHistory`, `AthleteDecisionRecord`, hypothesis revisions, observation supersession) are **referenced**, not duplicated.

---

## 16. Open Questions (do not block implementation)

[QUESTION] production event-store backend; serialization format; event-id strategy (UUID vs. content-addressed); retention policy; privacy/deletion policy; whether event sourcing is ever appropriate; how records drive future reprojection (Spec 012); UI/observability exposure; record-schema versioning; cross-athlete/multi-tenant scoping; the exact public/internal split per record.

[ASSUMPTION] None block Implementation 011: Aurora can record what happened — append-only, ref-only, traceable — regardless of how these resolve.

---

## 17. Implementation Task Preview

**Implementation 011 — Add `event-recording` module with traceability envelope and append-only in-memory log.**

[DECISION] Scope: create the module per §4; implement the domain objects (§5), the catalog (§8), validation (§9–§11), the append-only port + in-memory adapter (§6), and the tests (§12–§13). **Additive only** — no existing module is modified.

**Acceptance criteria:**
- the `event-recording` module exists with the §4 layout;
- `DomainEventRecord` is **one type, two categories**, validated against the **closed catalog**;
- payloads are **ref-only** (`EventPayloadRef[]`); copied state is unrepresentable and reconstitution rejects extra keys;
- the **`TraceabilityEnvelope`** carries real refs (primary + sources + typed slots + freshness marker), inventing none;
- the **log + repository are append-only** (`append`/`findById`/`all`/`findByCorrelation`); duplicate ids rejected; copies stored, not live refs;
- `toState()`/`reconstitute()` exist for record + log and **re-validate**; no execution/no timestamp change on rehydrate;
- `TerminalOutputSelected` **is not an `AthleteDecision`**; `AthleteDecisionRecorded` has **no compliance score**; `ProjectionFreshnessChanged` **cannot assert `current`**;
- **boundary**: `event-recording` imports only `shared-kernel`; no domain module imports it;
- **all 235 existing tests stay green**; the new tests (§13) pass.

**The implementation must explicitly create none of:** event bus · publish/subscribe · handlers · async delivery · DB · schema · serialization tech · event sourcing · projection engine · UI · API · LLM.

---

## 18. Technical Constraints

[FACT] TypeScript strict; Node native test runner (`node:test` + `node:assert/strict`); **no** external test framework; **no** framework/DB/event-bus/LLM. **No constructor parameter properties** (explicit field declarations + private constructor + props object). `import type` where appropriate. `.ts` extensions on relative imports. Pure domain objects; `Object.freeze` on value objects. **No** arbitrary payload bags. **No** raw field-bag rehydration without validation. **No** `Date.now()` (timestamps passed in).

---

## 19. Success Criterion

> After this tech spec, Implementation 011 can be built **without** deciding infrastructure, bus, event sourcing, serialization, or domain questions in code.

[ASSUMPTION] Answerable: the plan fixes every shape (record, envelope, refs, catalog, log, port, adapter), every validation rule, the boundary, and the test contract — all satisfiable by an **in-memory, append-only** module importing **only `shared-kernel`**. The future implementation answers Spec 011's question: **"Can Aurora record what happened without turning event records into commands, copied state, projections, or source truth?"** — yes: append-only, ref-only, traceable, validated, inert.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the technical plan for the first event slice. It defines a dependency-neutral `event-recording` module with an append-only, ref-only `DomainEventRecord`, a reusable traceability envelope, and a closed type catalog; it chooses no bus, store, serialization, or event sourcing, keeps the catalog out of `shared-kernel`, and makes a record a validated finger pointing at what happened — never a command, an aggregate, a projection, or source truth.*

*Inputs: [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 010](./010-persistence-ports-in-memory-repositories.md) · [Spec 010A](./010-persistence-ports-in-memory-repositories-tech.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
