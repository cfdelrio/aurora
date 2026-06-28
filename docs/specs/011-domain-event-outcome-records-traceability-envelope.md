# Spec 011 — Domain Event / Outcome Records and Traceability Envelope

> The first event slice: an **append-only, ref-only** record that a domain occurrence *happened* — with a reusable **traceability envelope** — so Aurora can record *what happened* **without** turning a record into a command, an aggregate, a projection, or source truth, and **without** an event bus, broker, queue, schema, or event-sourcing commitment.
>
> Behavioral specification. Not implementation; no event bus; no infrastructure; no changes to existing module *behavior*.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code, no bus, no infra) |
| **Slice** | `domain occurrence → append-only DomainEventRecord (ref-only payload + TraceabilityEnvelope) → never a command, aggregate, projection, or source truth` |
| **Implements (part of)** | [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) §1.2, §1.5, §4, §5 |
| **Builds on** | Spec/Impl 010 (records persist via append-only ports) · Implementations 001–010 (235/235 green) |
| **Produces (behavior)** | a `DomainEventRecord` envelope (occurrence + outcome categories), a `TraceabilityEnvelope`, `EventPayloadRef` rules, causation/correlation refs, a first candidate event surface, append-only behavior + ref-only validation, the test contract |
| **Explicitly does not produce** | event bus, broker, queue, async delivery, production event store, serialization format, DB, schema, migrations, event sourcing, projections-driven-by-events, scheduler, API, UI, LLM, notifications |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict record/envelope shapes, the append-only record port, the in-memory log adapter, the exact record-type catalog) follows separately as **011A**. Implementation does not begin from this document, and **no transport, store, or serialization technology is chosen here**.

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

[FACT] **Central question:** *How can Aurora record domain occurrences in a stable, append-only, traceable way without turning event records into commands, copied state, projections, or source truth?*

[FACT] This is the second executable step of the Persistence & Event Surface paper. Spec 010 made **aggregate state** persist through ports (the store *preserves* the model). This slice makes **occurrence history** persist through ports (the store *remembers what happened*) — and the two never merge: a repository answers *"what is this aggregate now?"*, an event record answers *"what happened, and from what?"*. The danger this slice guards is the paper's named one for events — **an event becoming a command, a copy, or a truth** — so the contract is written to make each of those a test failure.

[FACT] The next step is **not** an event bus. It is the *record shape*: an append-only, ref-only envelope with traceability. Delivery, transport, and consumption are deliberately out of scope (§3, §12).

---

## 2. Core Principle

[FACT] A domain event / outcome record says:

> **This happened.**

It does **not** say:

> Therefore do this.

[FACT] A record therefore:
- **is not a command** — it owns no downstream effect and instructs nothing;
- **is not an aggregate** — it has no invariants of its own to enforce on the domain, no behavior, no lifecycle beyond being appended;
- **is not a projection** — it is not a derived view and is never read as "current";
- **is not source truth by itself** — it references the artifacts that *are* the source, and the current state is always resolved from them;
- **is append-only** — a correction appends a new record; history is never overwritten or deleted;
- **carries refs, not copies** — its payload points at artifacts; it never embeds their state.

[ASSUMPTION] The guiding sentence: *a record is a timestamped, traceable finger pointing at what happened — never the thing itself, and never an order to act.* If a reader can mistake a record for the aggregate, the projection, the decision, or an instruction, the record is wrong.

---

## 3. Scope & Non-Scope

### In scope
[DECISION] the `DomainEventRecord` envelope (one envelope, two **categories** — *occurrence* and *outcome* — see Decision 1); event identity, type, `occurredAt`, `recordedAt`, producing module, aggregate/artifact reference; the reusable `TraceabilityEnvelope`; `EventPayloadRef` (ref-only payload entries); optional actor/source; optional causation/correlation refs; optional freshness/reprojection-relevance refs; **append-only** record behavior; the first **candidate event surface** for the implemented modules (§7); the behavioral **record contract** and its **test strategy** (§11) — all satisfiable by an in-memory, append-only log behind a port.

### Non-Scope
[FACT] event bus; message broker; queue; pub/sub; async delivery; background jobs; scheduler; production event store; event serialization format (JSON/Avro/protobuf); database; schema; migrations; **event sourcing** (rebuilding aggregates from the log); **projections driven by events**; consumers / subscribers / handlers (who reacts and how); API; UI; LLM output; notifications; cloud infrastructure; external integrations; retention/privacy/deletion policy.

[DECISION] **No transport, store, or serialization technology is chosen.** Every contract here is satisfiable by an in-memory append-only list behind a port (as Spec 010's repositories are `Map`-backed) and verified by tests. *Who consumes a record, and how delivery happens, is explicitly a future concern.*

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] Carried from the prompt, the Persistence & Event Surface paper (§1.2, §1.5, §4, §5), and the module invariants. A record must satisfy **all**:

1. **A record is not a command** — it triggers no downstream mutation by itself.
2. **A record is not an aggregate** — it does not replace or stand in for the aggregate it references.
3. **A record is not a projection** — it is never read as a derived "current" view.
4. **A record is not source truth by itself** — meaning is resolved from the referenced artifacts.
5. **A record is append-only** — never overwritten, never deleted.
6. **A record references source artifacts rather than copying them** — ref-only payload by default.
7. **A record preserves traceability** — it carries a `TraceabilityEnvelope` of real refs and **never invents** them.
8. **A record identifies its producing module.**
9. **A record identifies its event type.**
10. **A record identifies the relevant aggregate / artifact reference.**
11. **A record's payload is minimal and ref-only by default** — kind + id (+ optional role/owner), not copied state.
12. **A record does not trigger downstream mutation by itself** — a coordinator may *react*; the record does not act.
13. **A record does not bypass aggregate invariants** — it cannot be used to write a state a constructor would reject.
14. **A record does not imply a recommendation or decision** — recording ≠ advising.
15. **A record does not turn athlete behavior into inferred identity** — a recorded decision/purpose is *given*, never read as readiness/capacity.
16. **A record does not treat outcome as proof of support correctness** — a good outcome never rewrites `SupportQuality`.
17. **A record does not make a projection current by assertion** — a freshness-change record carries freshness refs; it cannot promote a view to `current`.
18. **A record does not replace repository persistence** — the aggregate is still the source of current state; the log is occurrence history.

[ASSUMPTION] The *defining* invariants are **1, 6, 7, 12, 16** — together they make "an event quietly became a command, a copy, a fabricated trace, an actor, or a verdict on correctness" a failing test.

---

## 5. Key Concepts (defined behaviorally)

### 5.1 DomainEventRecord
[DECISION] An **append-only record that a domain occurrence happened.** It **includes**:
- **event id** — stable, unique identity of the record (a ref handle, opaque string at runtime);
- **event type** — a closed, named occurrence kind (§7), e.g. `SignalDetected`, `TerminalOutputSelected`;
- **category** — `occurrence` or `outcome` (Decision 1);
- **`occurredAt`** — when the domain occurrence happened (domain time);
- **`recordedAt`** — when the record was appended (record time);
- **producing module** — the module that owns the occurrence (`observation` / `reasoning` / `understanding` / `decision-support` / `athlete`);
- **aggregate / artifact reference** — the primary subject (kind + id);
- **`TraceabilityEnvelope`** (§5.3) — refs to what the record depends on / came from;
- **payload refs** — zero or more `EventPayloadRef` (§5.4);
- *(optional)* **actor / source** — who/what produced the occurrence, **only where applicable** (e.g. the athlete for `AthleteDecisionRecorded`);
- *(optional)* **causation ref** — the record that led to this one (§5.5);
- *(optional)* **correlation ref** — the flow/scenario grouping this record (§5.5);
- *(optional)* **freshness / reprojection-relevance refs** — for occurrences that bear on projection freshness (§5.3, §7 understanding).

[DECISION] It **must not include**: copied aggregate state; a command/instruction; any downstream mutation; generated user-facing text; a compliance/obedience score; a projection result asserted as truth; recomputed `SupportQuality`.

### 5.2 DomainOutcomeRecord
[DECISION] A record of the **result of a domain operation** (e.g. `PurposeChanged`, `AthleteDecisionRecorded`, `HypothesisRevised`, `UnderstandingMarkedStale`, `TerminalOutputSelected`).

**Decision 1 — One envelope, two categories.** `DomainOutcomeRecord` is **not a separate type**; it is the **`outcome` category** of `DomainEventRecord`. The `occurrence` category records *that something was observed/created* (e.g. `ObservationSetRecorded`); the `outcome` category records *the result of an operation* (e.g. `HypothesisFalsified`). Both share the identical envelope, refs, append-only, and ref-only rules.
- **Why:** the prompt asks to clarify event-vs-outcome; a single envelope with a discriminating `category` keeps one append-only log, one set of invariants, one test contract — while still letting consumers (later) filter by category. Two parallel types would duplicate every rule and invite drift.
- **Consequence:** one record shape, one port, one log; `category` is metadata, never behavior.
- **Risk:** the distinction blurs and the category is ignored.
- **Reversal Point:** if a real consumer needs hard type-separation (distinct ports/streams), split `outcome` into its own record type behind its own port — only on demonstrated need.

### 5.3 TraceabilityEnvelope
[DECISION] A **standard, reusable envelope** carried by every record, referencing what the record depends on or came from. It may include (only those **relevant** to the record, never fabricated):
- aggregate id + artifact kind + artifact id;
- **source refs** (the existing kind+id provenance handles: observation → signal → evidence → hypothesis → outcome → assessment → support);
- **`PurposeVersionRef`** where the occurrence is purpose-relative (e.g. reasoning under a purpose, `PurposeChanged`);
- **hypothesis id** / **evidence-case id** where reasoning is involved;
- **observation-set id** / **signal id** where observation is involved;
- **decision-support-case id** where decision-support is involved;
- **athlete-decision id** (`AthleteDecisionRef`) where the athlete's decision is involved;
- **projection freshness ref + status** (`ProjectionRef`/`ProjectionSourceRef` + the 5-state `ProjectionFreshness`) where projection freshness is relevant.

[FACT] It **must not invent traceability** — it carries only refs that already exist on the source artifacts (Impl 008 already forbids invented projection traceability; this extends the rule to records). It is the **same `kind+id` handle model** the domain already uses (paper §5) — the domain trace is the reference handles, **not** any future store's foreign keys.

### 5.4 EventPayloadRef
[DECISION] A **minimal payload entry that points to another artifact.** It contains:
- **kind** — the artifact kind (e.g. `"ObservationSet"`, `"Hypothesis"`, `"EvidenceCase"`, `"Signal"`, `"DecisionSupportCase"`, `"AthleteDecision"`, `"PurposeVersion"`);
- **id** — the artifact's ref handle;
- *(optional)* **role** — the ref's role in the occurrence (e.g. `"subject"`, `"cause"`, `"evidence"`, `"supersedes"`);
- *(optional)* **module owner** — the owning module of the referenced artifact.

[DECISION] It **must not copy the artifact** — no fields of the referenced object are embedded. A reader resolves a `EventPayloadRef` against the owning repository to get current state (or against the record's `occurredAt` for "as of", later).

### 5.5 Causation / Correlation
[DECISION] How one record references another **without becoming an execution chain**:
- **Causation** identifies *what led to* this record (a single prior record ref). It is **descriptive lineage**, not a trigger: "this record exists because that one happened" — it does **not** mean "that record commanded this one".
- **Correlation** groups records in the **same scenario or flow** (a shared correlation ref across an end-to-end run). It is a **grouping label**, not an order to execute.
- **Neither implies automatic command execution.** Reading a causation/correlation graph reconstructs *what happened in what order*; it never *makes anything happen*.

[ASSUMPTION] Causation answers "why is this here?"; correlation answers "what flow was this part of?". A coordinator may *choose* to react to a record — but that reaction is the coordinator's behavior (already how `PurposeChanged → markUnderstandingStale` works via the neutral harness), **never** the record's.

---

## 6. Relationship to Spec 010 (records vs. repositories)

[FACT] Two distinct, non-substitutable mechanisms:

| | **Repository (Spec 010)** | **Event record (Spec 011)** |
|---|---|---|
| Answers | "what is this aggregate **now**?" | "what **happened**, and from what?" |
| Shape | aggregate state via `toState()`/`reconstitute()` | append-only ref-only envelope |
| Mutability | latest state replaces prior (history kept *inside* the aggregate, e.g. `PurposeHistory`) | **append-only**; never overwritten |
| Payload | the aggregate's validated state | **refs only**; no copied state |
| Source of truth | **yes** — for current aggregate state | **no** — points at the sources |
| Reacts downstream | no | **no** (a record is not a command) |

[DECISION] Records **persist via the same kind of append-only port** introduced in Spec 010 (in-memory adapter first). A record store **does not replace** an aggregate repository, and an aggregate repository **does not** absorb the event log. The append-only histories that already live *inside* aggregates (`PurposeHistory`, `AthleteDecisionRecord`, hypothesis revisions, observation supersession) are **not** the event log — the log records *that those occurrences happened*, referencing them; it does not duplicate or replace them.

---

## 7. Candidate Event / Outcome Surface

[DECISION] The first **conceptual** record surface for the implemented modules — derived from the paper's §4 surface and the actual artifacts in code. For each: **producing module · source aggregate/artifact · required refs · forbidden payload · why it matters.** *(Public/internal is the paper's §4 split; this slice records both — it chooses no transport, so "public" only means "intended cross-module-legible", not "delivered".)* The exact closed catalog is finalized in 011A; this is the behavioral set.

### observation
| Type | Category | Source | Required refs | Forbidden payload | Why |
|---|---|---|---|---|---|
| `ObservationSetRecorded` | occurrence | `ObservationSet` | set id; provenance/source refs | copied observations | provenance is born here; downstream trace starts here |
| `ObservationSuperseded` | outcome | `ObservationSet` | new set id; superseded set id (role `supersedes`) | copied observations | supersession is a refresh trigger; **original retained** |
| `SignalDetected` | occurrence | `Signal` | signal id; observation-set + observation roots | copied signal/observation state | a signal exists, not yet evidence |
| `SignalRejected` | outcome | `SignalRejection` | rejection id; candidate roots; reason ref | copied data | auditable rejection, **not an absence** |

### reasoning
| Type | Category | Source | Required refs | Forbidden payload | Why |
|---|---|---|---|---|---|
| `HypothesisOpened` | occurrence | `Hypothesis` | hypothesis id; `PurposeVersionRef`; trace roots | copied claim/evidence | a raw, untested claim — not consumable as meaning |
| `EvidenceAttached` | occurrence | `Hypothesis` (owns `EvidenceCase`) | hypothesis id; evidence-case id; signal id | copied evidence state | mid-lifecycle attachment |
| `HypothesisRevised` | outcome | `Hypothesis` | hypothesis id; revision cause ref | copied state | revision is a refresh trigger; recorded with cause |
| `HypothesisWeakened` | outcome | `Hypothesis` | hypothesis id; cause ref | copied state | lifecycle transition |
| `HypothesisContradicted` | outcome | `Hypothesis` | hypothesis id; contradicting evidence ref | copied state | lifecycle transition |
| `HypothesisFalsified` | outcome | `Hypothesis` | hypothesis id; falsifier/evidence ref | copied state | refresh trigger → invalid projections; **falsified ≠ deleted** |
| `HypothesisRetired` | outcome | `Hypothesis` | hypothesis id; reason ref | copied state | retired, **retained for trace** |

### understanding
| Type | Category | Source | Required refs | Forbidden payload | Why |
|---|---|---|---|---|---|
| `UnderstandingUpdated` | outcome | `UnderstandingProfile` | profile id; dimension; tested-outcome ref | copied profile/level | from a *tested* outcome only |
| `UnderstandingMarkedStale` | outcome | `UnderstandingProfile` | profile id; dimension; staleness-reason ref (e.g. `PurposeChanged`) | copied profile | **selective** staleness; reason carried; mutates nothing |
| `UnderstandingAssessmentProjected` | occurrence | `UnderstandingAssessment` (view) | profile id; `sourceRefs`; `derivedAt`; `freshness` | the assessment *as truth* | a freshness-bound **view** was produced |
| `ProjectionFreshnessChanged` | outcome | `UnderstandingAssessment` (view) | `ProjectionRef`; old/new `ProjectionFreshness`; source refs | "now current" assertion | freshness changed; **cannot assert `current`** |

### decision-support
| Type | Category | Source | Required refs | Forbidden payload | Why |
|---|---|---|---|---|---|
| `DecisionOpportunityOpened` | occurrence | `DecisionOpportunity` | opportunity id | copied state | a candidate moment |
| `DecisionSupportCaseOpened` | occurrence | `DecisionSupportCase` | case id; opportunity ref | copied case | a case began |
| `DecisionSupportEvaluated` | outcome | `DecisionSupportCase` | case id; gate-result refs; `TraceabilityVerification` result | copied gate internals | gates ran (internal-leaning) |
| `TerminalOutputSelected` | outcome | `DecisionSupportCase` | case id; output type (`support`/`inquiry`/`withholding`); degradation reasons | the rendered output text; **not an `AthleteDecision`** | what Aurora *showed* — never what the athlete *chose* |
| `DecisionSupportWithheld` | outcome | `DecisionSupportCase` | case id; withholding reason refs | copied state | **responsible silence**, auditable (a `withholding` terminal output) |
| `AthleteDecisionRefRecorded` | occurrence | `DecisionSupportCase` | case id; `AthleteDecisionRef` only | the `AthleteDecision` object | the case **references, never owns** the decision |

### athlete
| Type | Category | Source | Required refs | Forbidden payload | Why |
|---|---|---|---|---|---|
| `PurposeDeclared` | outcome | `Athlete` (`PurposeHistory`) | athlete id; `PurposeVersionRef` | copied profile/inferred state | append-only version born |
| `PurposeChanged` | outcome | `Athlete` (`PurposeHistory`) | athlete id; new + prior `PurposeVersionRef`; change reason | inferred capacity/readiness | append-only; refresh trigger; **never inferred identity** |
| `AthleteDecisionRecorded` | outcome | `AthleteDecisionRecord` | decision id; optional support-case ref; **actor = athlete** | obedience/compliance score; outcome-correctness | athlete-owned; re-enters as `SubjectiveObservation` (Impl 009) |
| `AthleteDecisionAmended` | outcome | `AthleteDecisionRecord` | new decision id; amended decision id (role `amends`) | copied decision | append-only correction; **original retained** |
| `AthleteDecisionSuperseded` | outcome | `AthleteDecisionRecord` | new decision id; superseded id (role `supersedes`) | copied decision | append-only; **original retained** |

[FACT] Across all of the above: **payloads are refs**, **records mutate nothing**, **no record carries copied aggregate state, a compliance score, an outcome-correctness verdict, generated text, or a `current`-by-assertion projection.**

---

## 8. Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§11). **Negative criteria are defining.**

### UC1 — Record an ObservationSet occurrence
- **AC1.1** — *Given* an `ObservationSet` is recorded, *when* a record is created, *then* it is an `ObservationSetRecorded` record referencing the set id and provenance refs, **without copying all observations**.

### UC2 — Record evidence attachment
- **AC2.1** — *Given* a `Signal` is attached as an `EvidenceCase` inside a `Hypothesis`, *when* a record is created, *then* it references hypothesis id, evidence-case id, signal id, and trace refs — **no copied evidence/claim state**.

### UC3 — Record Understanding staleness
- **AC3.1** — *Given* an `UnderstandingDimension` is marked stale due to `PurposeChanged`, *when* a record is created, *then* it references the profile/dimension and the `PurposeChanged` ref **without mutating either** the profile or the purpose.

### UC4 — Record terminal output selection
- **AC4.1** — *Given* a `DecisionSupportCase` selects a terminal output, *when* a record is created, *then* it references the case and the output type (`support`/`inquiry`/`withholding`) **without becoming the output itself** and **without being an `AthleteDecision`**.

### UC5 — Record AthleteDecision feedback
- **AC5.1** — *Given* an `AthleteDecision` is recorded, *when* a record is created, *then* it references the decision id and any support-case ref, with **actor = the athlete**, and carries **no obedience score and no outcome-correctness verdict**.

### UC6 — Correlate an end-to-end flow
- **AC6.1** — *Given* an end-to-end scenario, *when* records are created across modules, *then* a shared **correlation ref** groups them and **causation refs** link cause→effect, **without** any record executing or commanding another.

### UC7 — Ref-only payload rule
- **AC7.1** — *Given* any record is inspected, *then* its payload contains **refs and minimal metadata only**, never copied aggregate state.

### UC8 — Append-only behavior
- **AC8.1** — *Given* a record has been appended, *when* a later correction or supersession happens, *then* a **new** record is appended and the prior record is **unchanged and still present** — never overwritten or deleted.

---

## 9. Acceptance Criteria (consolidated)

[DECISION] At minimum:
- Given a domain occurrence, when a record is created, then it has **id, type, category, `occurredAt`, `recordedAt`, producing module, aggregate/artifact ref, and a `TraceabilityEnvelope`**.
- Given a payload, when inspected, then it contains **refs, not copied aggregate state**.
- Given a record, when stored, then it is **append-only**.
- Given a correction, when recorded, then a **new** record is appended (original retained).
- Given a record, when consumed later, then it **does not execute or command** downstream mutation.
- Given a `TerminalOutputSelected` record, when inspected, then it is **not an `AthleteDecision`**.
- Given an `AthleteDecisionRecorded` record, when inspected, then it has **no compliance/obedience score**.
- Given an outcome record, when inspected, then it **does not prove support correctness** (it cannot rewrite `SupportQuality`).
- Given a projection-freshness change, when recorded, then it references **freshness + source refs** and **does not make the projection `current` by assertion**.
- Given this slice is implemented later, then **no event bus, broker, queue, DB, schema, migration, serialization format, API, UI, LLM, scheduler, or event-sourcing infrastructure** is created.
- Given the slice, then **all 235 existing tests (Impl 001–010) remain green**, and any record/envelope surface is **additive** (no behavior change to existing modules).

---

## 10. Explicit Forbidden Behaviors

[FACT] This spec forbids:
- **event-as-command** (a record triggers downstream mutation by itself);
- **event-as-aggregate** (a record replaces/stands in for the aggregate);
- **event-as-projection** (a record read as a current derived view);
- **event-as-source-truth** (meaning taken from the record, not the referenced artifact);
- **copied aggregate payloads** (state embedded instead of referenced);
- **hidden downstream mutation** caused by appending a record;
- **overwriting / deleting event history**;
- using records to **bypass repository invariants**;
- using records to **bypass `EvidenceCase`/`Hypothesis`** (a recorded outcome does not promote a signal to evidence);
- using records to **update `Understanding` directly** (a record references staleness; a coordinator transitions the profile);
- using records to **mark support correct because the outcome was good**;
- using records to **score obedience / compliance**;
- treating **correlation as an execution chain** (or causation as a trigger);
- creating an **event bus / broker / queue / pub-sub / async delivery**;
- creating **event-sourcing infrastructure** (rebuilding aggregates from the log);
- choosing **DB / schema / serialization technology**;
- turning **athlete behavior into inferred identity** via a record.

[DECISION] These are **testable negative requirements** (§11).

---

## 11. Validation Strategy

[ASSUMPTION] Tests to the contract; **negative + boundary tests are defining.**

**Positive:**
- **record construction** — each candidate type builds with id/type/category/`occurredAt`/`recordedAt`/producing module/aggregate ref/`TraceabilityEnvelope`;
- **traceability envelope** — required refs present per type (§7); refs are real handles (kind+id);
- **ref-only payload** — payload entries are `EventPayloadRef` (kind+id+optional role/owner), never copied state;
- **append-only log** — appending preserves order; prior records unchanged;
- **correction/supersession appends a new record** — original still loadable;
- **causation/correlation** — a flow groups by correlation; causation links resolve; neither executes anything.

**Negative (must prove absence):**
- a record **does not execute / command** downstream mutation (appending mutates no aggregate);
- a record **cannot overwrite or delete** a prior record;
- a payload **carries no copied aggregate state** (structural check of payload entries);
- a `TerminalOutputSelected` record **is not an `AthleteDecision`** (no decision object/fields);
- an `AthleteDecisionRecorded` record **has no compliance/obedience score**;
- an outcome record **cannot rewrite `SupportQuality`** / does not prove support correctness;
- a `ProjectionFreshnessChanged` record **cannot assert `current`** (loaded record still constrains, never promotes);
- a record **never invents traceability** (only existing refs);
- **no event bus / broker / queue / DB / schema / migration / serialization / event-sourcing** file or token is introduced (structural guard, extending `persistence-boundary.test.ts`).

**Dependency-boundary:**
- record types + the append-only record port import only their **owning module + `shared-kernel`** (the envelope/ref *types* may live in `shared-kernel` as pure value types — never a shared event store or bus);
- existing upstream→downstream and `athlete ⇏ downstream` boundaries stay green;
- **all 235 Impl 001–010 tests continue to pass.**

[ASSUMPTION] The negative + boundary tests are the contract that *a record remembers what happened and never becomes a command, a copy, or a truth.* If they cannot be written/passed, the record design is wrong.

---

## 12. Relationship To Existing Architecture

[FACT] This spec gives concrete behavioral shape to the **Persistence & Event Surface** paper:
- **§1.2** (append-only outcome records, refs not copies) and **§4** (the event surface) → the `DomainEventRecord` envelope + candidate catalog (§5, §7);
- **§5** (traceability persistence) → the reusable `TraceabilityEnvelope` (§5.3), reusing the existing kind+id handle model, **never** store foreign keys;
- **§1.5** (public/internal split, **no event bus**) → §7's surface records both, choosing no transport.

[DECISION] It **builds on Spec/Impl 010**: records persist via the **same append-only port pattern** (module-owned port + in-memory adapter), and the record store **never replaces** an aggregate repository. It **reuses, does not duplicate**, the append-only histories already inside aggregates (`PurposeHistory`, `AthleteDecisionRecord`, hypothesis revisions, observation supersession), the existing **traceability refs**, **projection freshness** (Impl 008), and the **`DecisionSupportCase` terminal outputs** + **`AthleteDecisionRef`** (Impl 005/009).

[FACT] Clarified non-identities the slice preserves:
- **repositories preserve aggregate state; records preserve occurrence history** — neither replaces the other;
- **no event bus exists yet** — delivery/consumption is future;
- **no event-sourcing commitment exists yet** — the log is *history*, not the rebuild path for aggregates (Spec 010's `reconstitute` remains the rebuild path; reprojection is Spec 012).

---

## 13. Open Questions (do not block this spec)

[QUESTION]
- exact **module ownership** of record types (per-producing-module vs. a future `event-surface` module) — leaning per-module + `shared-kernel` envelope *types*, finalized in 011A;
- whether the envelope/ref types live in **`shared-kernel`**, per module, or a future event-surface module;
- **event id format**; **event type naming** convention (the closed catalog);
- **event serialization format**; **storage backend**; **retention policy**; **privacy/deletion policy**;
- whether **event sourcing** is ever appropriate for any aggregate (deferred to Spec 012 validation);
- how events **drive future reprojection** (Spec 012);
- how events are **exposed to UI / observability** later;
- the precise **public/internal** split per record (validate against the first record implementation).

[ASSUMPTION] None block this slice: Aurora can record what happened — append-only, ref-only, traceable — regardless of how these resolve. Technical-implementation questions are deferred to 011A.

---

## 14. Success Criterion

> **"Can Aurora record what happened without turning event records into commands, copied state, projections, or source truth?"**

[ASSUMPTION] Answerable from this spec: every domain occurrence in the implemented modules gains an **append-only `DomainEventRecord`** (one envelope, `occurrence`/`outcome` categories) carrying **id, type, `occurredAt`, `recordedAt`, producing module, an aggregate/artifact ref, a `TraceabilityEnvelope` of real refs, and ref-only `EventPayloadRef` payloads** — optionally actor, causation, correlation, and freshness refs. A record **triggers nothing**, **copies nothing**, **overwrites nothing**, **invents no traceability**, **asserts no projection current**, **scores no obedience**, and **proves no support correctness**; a `TerminalOutputSelected` record is **never an `AthleteDecision`**; corrections **append**. **No event bus, broker, queue, DB, schema, serialization, scheduler, or event-sourcing** is chosen, the records persist via the **same append-only port pattern as Spec 010** without replacing repositories, and **all 235 existing tests stay green** — proving the log *remembers* the reasoning without ever *commanding*, *copying*, or *becoming* it.

---

## Known Risks

[ASSUMPTION]
- **Risk:** a record becomes a command (appending causes a mutation). **Defense:** invariants 1/12 + UC3/UC6 — appending mutates nothing; coordinators react, records don't; negative test that no aggregate changes on append.
- **Risk:** a fat payload copies aggregate state. **Defense:** invariant 6/11 + UC7 — `EventPayloadRef` is kind+id only; structural negative test rejects copied state.
- **Risk:** history is overwritten. **Defense:** invariant 5 + UC8 — append-only; correction appends; negative test that priors are unchanged.
- **Risk:** an outcome rewrites `SupportQuality` / proves correctness. **Defense:** invariant 16 + AC — records carry no correctness verdict; `SupportQuality` is integrity-at-the-time.
- **Risk:** a freshness record asserts `current`. **Defense:** invariant 17 + §7 understanding — `ProjectionFreshnessChanged` carries freshness; cannot promote a view.
- **Risk:** `TerminalOutputSelected` is read as the athlete's decision. **Defense:** invariant 14 + UC4 — output type only; never an `AthleteDecision`.
- **Risk:** correlation is treated as an execution chain. **Defense:** §5.5 — correlation groups, causation describes lineage; neither executes.
- **Risk:** the log drifts into an event bus / event sourcing. **Defense:** §3 non-scope + §10 forbidden + structural guard — append-only in-memory log behind a port; no transport; aggregates rebuild via Spec 010 `reconstitute`, not the log.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the eleventh Specification and the first event slice. It defines an append-only, ref-only `DomainEventRecord` envelope with a reusable traceability envelope; it chooses no transport, store, or serialization, adds no event bus or event sourcing, and keeps a record a finger pointing at what happened — never a command, an aggregate, a projection, or source truth.*

*Inputs: [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [Spec 010](./010-persistence-ports-in-memory-repositories.md) · [Spec 010A](./010-persistence-ports-in-memory-repositories-tech.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [System Map](../diagrams/SYSTEM_MAP.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 008](./008-projection-refresh-staleness-strategy.md) · [Spec 009](./009-athlete-decision-feedback-loop.md) · Process: [spec-process.md](./spec-process.md)*
