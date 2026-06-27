# Implementation Architecture — Persistence and Event Surface

> How should Aurora eventually store aggregates, domain outcomes/events, projections, and traceability — without turning a snapshot, a projection, or an event into source truth?
>
> Implementation architecture, not production code. No database, ORM, schema, event bus, queue, cache, serialization format, or deployment is chosen here.

| Field | Value |
|---|---|
| **Status** | Implementation Architecture · *Accepted snapshot* |
| **Phase** | Implementation Architecture (no code, no schema) |
| **Covers** | Persistence + event-surface boundaries for Implementations 001–009 |
| **Validation at writing** | `tsc --noEmit` clean · `node --test` **212/212 pass** (docs-only; no module modified) |
| **Decides** | *boundaries, categories, rules* — **not** technology |

[FACT] **Central question:** *How should Aurora persist source artifacts, reasoning artifacts, projections, and domain events so that traceability, revision, freshness, and athlete agency remain intact?*

[FACT] The risk has shifted. Through Implementation 009 the danger was *how Aurora reasons*; the boundaries that keep reasoning honest are now in code. From here the danger is **how Aurora stores the reasoning without corrupting it** — the moment a projection, snapshot, or event is persisted as if it were a fact, every guarantee the core earned can quietly leak away through the storage layer.

> **Implementation status (post Impl 012).** **Three parts of this paper are now realized.**
> **(1) Impl 010** realized §1.1/§1.7 — aggregate persistence via module-owned **repository ports +
> in-memory adapters** + validated `toState()`/`reconstitute()` for the six persisted boundaries
> (round-trip / mutation-isolation / invalid-state-rejection tests; **no technology chosen**).
> **(2) Impl 011** realized §1.2/§1.5/§4/§5 — **event/outcome records + a traceability envelope** as a
> new **dependency-neutral `event-recording` module**: one `DomainEventRecord` (categories
> `occurrence`/`outcome`) over a **closed 26-type catalog**, a reusable `TraceabilityEnvelope`,
> **ref-only** `EventPayloadRef` payloads, an **append-only** `DomainEventRecordLog` + repository port +
> in-memory adapter, and `causation`/`correlation` as lineage/grouping only. Records are **append-only,
> ref-only, non-command, non-bus**: appending executes nothing; payloads carry refs, never copied
> aggregate state; records do **not** replace aggregate repositories.
> **(3) Impl 012** realized §1.6/§7 — a **neutral, check-only reprojection harness** (test-support under
> `src/modules/__tests__/reprojection-harness/`, **not a production module**): it recomputes
> `UnderstandingAssessment` through the owning `understanding` function, **recalculates** the 5-state
> freshness, **verifies** traceability, **detects candidates** from `DomainEventRecord`s (context only),
> and **reports** drift/findings. It **mutates no repository**, **never replays events as commands**,
> **never rebuilds aggregates from the log** (empty repos → `event-record-only`/`missing-source`),
> **never promotes freshness** or strengthens voice, and creates **no** `TerminalOutput`/recommendation/
> `SupportQuality` rewrite/`Purpose` overwrite/`DomainEventRecord`.
> **(4) Impl 013** added the first **manual ingress** using the repository ports — an **`observation`-owned
> Manual Input Adapter** (`ingestManualInput`) that records manually supplied input faithfully as an
> `ObservationSet` (via `recordObservationSet`), persists through **`ObservationSetRepository`**, preserves
> provenance (`source: "manual"`)/quality/verbatim words, represents missing data explicitly, and rejects
> the unrepresentable (saving nothing). It **imports no `event-recording`**; an optional `ObservationSetRecorded`
> is composed only in a neutral harness from a **ref-only** candidate. **Still future work:** a **production
> scheduler**, **event bus**, **event sourcing**, a **projection repository** (§6), a **production
> orchestration/service layer**, **UI/API/external (FIT/wearable) ingestion**, and any **production event
> store / serialization format / DB / ORM / cache / persistence backend**. This paper is otherwise unchanged.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/model/implementation. |
| **[DECISION]** | An architectural commitment (boundaries only — no technology). |
| **[ASSUMPTION]** | A stance chosen for this paper. |
| **[QUESTION]** | Open; carried forward. |

Each principal **[DECISION]** carries **Why · Consequence · Risk · Reversal Point**.

---

## Core Principle

[FACT] **Persistence must preserve epistemic boundaries.** It must never turn:
- a **projection** into truth,
- an **event** into a command,
- a **snapshot** into a source,
- a **read model** into an aggregate,
- an **output** into the athlete's decision,
- **athlete behavior** into inferred identity.

[ASSUMPTION] Aurora stores *what happened*, *what was inferred*, *what was projected*, and *what was shown* — but the store must always preserve **which is which**. The persistence layer's only job, beyond durability, is to keep the epistemic status of every record legible: a stored hypothesis is still defeasible, a stored assessment is still a freshness-bound view, a stored decision is still the athlete's.

---

## 1. Architectural Decision Summary

### 1.1 Aggregate persistence — *persist state via owned-shape repositories behind ports*
[DECISION] Each aggregate is persisted **as its own consistency boundary**, through a **repository port** owned by its module, reconstructing the aggregate via its existing smart constructors (`toProps()`/`fromProps()`-shaped), never by writing arbitrary fields.
- **Why:** the aggregate's invariants live in its constructors (immutable-by-operation, smart constructors). Persistence must rehydrate *through* them so a loaded aggregate cannot exist in a state the domain forbids.
- **Consequence:** one repository per aggregate root (`ObservationSet`, `Hypothesis`, `UnderstandingProfile`, `DecisionSupportCase`, `Athlete`); the store is an adapter, the domain stays pure.
- **Risk:** a persistence shape that drifts from the domain shape tempts "just write the fields" shortcuts.
- **Reversal Point:** if rehydration-through-constructors proves too costly, introduce an explicit, tested `*Snapshot` value object per aggregate — still rebuilt through validation, never a raw row mapped to a field bag.

### 1.2 Domain event / outcome persistence — *append-only outcome records, refs not copies*
[DECISION] Domain outcomes/events are persisted as an **append-only log of records**, each carrying **references** to the artifacts involved, never copies of their state.
- **Why:** outcomes are *what happened* (a signal detected, a hypothesis promoted, a decision recorded); they are historical facts and must never be rewritten. Copying source state into a payload would create a second, drift-prone truth.
- **Consequence:** events are immutable history; consumers resolve refs to read current artifact state.
- **Risk:** fat payloads creep in for convenience and become stale shadow-truth.
- **Reversal Point:** if a frozen point-in-time view is genuinely needed, store an explicit immutable `*Snapshot` (clearly labeled, never read as current) — not a denormalized event payload.

### 1.3 Projection persistence — *cache with freshness, never a source*
[DECISION] Projections may later be **stored as caches/read models**, always carrying `derivedAt`, `freshness`, `sourceRefs`, `limitations`, and owner module; a stored projection is **never** read as truth.
- **Why:** Impl 008 already made `UnderstandingAssessment` a freshness-bound view; persisting it must carry that metadata so "stored" can never silently read as "current/true".
- **Consequence:** a persisted projection is indistinguishable in status from a freshly computed one — both are labeled views.
- **Risk:** a read path that returns the cached projection *without* its freshness re-introduces projection-as-fact.
- **Reversal Point:** if cache coherence is hard, drop the cache and recompute on read — recomputation is always allowed; a stale unlabeled cache is not.

### 1.4 Traceability persistence — *stable reference handles, verified not invented*
[DECISION] Traceability is persisted as **stable reference handles** (kind + id) carried by every derived artifact; the chain is **verified** from these handles, never **authored** by the store.
- **Why:** the Boundary Map makes traceability a structural invariant; the store must carry the handles so the chain can be re-walked, but verification stays in `decision-support` (`TraceabilityVerification`).
- **Consequence:** foreign keys (if any) are an implementation detail of the adapter; the *domain* trace is the reference handles, independent of storage.
- **Risk:** using DB foreign keys *as* the domain trace couples meaning to schema.
- **Reversal Point:** if handle assembly is fragile, make a provenance handle a mandatory construction parameter of every artifact — turning a convention into an impossibility-to-omit.

### 1.5 Event surface — *public outcome records; internal process events stay internal*
[DECISION] Define a **conceptual outcome/event surface** (§4) split into **public** (cross-module, trust-critical) and **internal** (single-module process) records; **no event bus is chosen**. Public outcomes are the only legitimate cross-module coupling besides explicit reads.
- **Why:** the Boundary Map's event split (§8 there) keeps modules coupled to *what* a peer concluded, not *how*. Persistence makes that split durable.
- **Consequence:** an outcome is a *record of a domain occurrence*, not an instruction; it owns no downstream effect.
- **Risk:** internal process events leak as public contracts; events get read as commands.
- **Reversal Point:** the surface is validated against the first persistence slice; an event mistakenly public is demoted, not worked around.

### 1.6 Refresh / reprojection model — *recompute from sources; never blind-replay understanding*
[DECISION] Derived state is recomputed from **current source + aggregate state**; understanding moves by **explicit transitions** (its lifecycle), not by blind event replay; projection freshness is **recalculated**, never assumed.
- **Why:** understanding is earned by *survived challenge* and may decay — replaying events as if they re-occur would fabricate promotions. Projections are pure functions of current state + freshness.
- **Consequence:** reprojection is safe and repeatable; understanding reconstruction respects its promotion/demotion/decay policy.
- **Risk:** treating an event log as a literal re-run of understanding promotions.
- **Reversal Point:** if event-sourcing is later adopted for understanding, fold the promotion policy into the fold function — never a naive append-replays-the-level scheme.

### 1.7 No production DB chosen — *ports first, in-memory adapters, technology deferred*
[DECISION] **No database, ORM, event bus, cache, queue, migration tool, serialization format, or cloud is chosen.** The first persistence slice is **ports + in-memory adapters** (Spec 010).
- **Why:** the domain must not be shaped by a storage technology; in-memory adapters prove the ports preserve invariants before any infrastructure exists.
- **Consequence:** every persistence rule here is testable with in-memory repositories; tech is a later, reversible adapter choice.
- **Risk:** premature tech choice leaks schema concerns into the domain.
- **Reversal Point:** technology is chosen only when a real entrypoint/persistence requirement is specified, behind the same ports.

---

## 2. Persistence Categories

[DECISION] What Aurora may eventually persist, by epistemic category. Each category has a **status rule** the store must preserve.

### 2.1 Source artifacts
Examples: `ObservationSet`, `Observation`, `SubjectiveObservation`, `MissingDataObservation`, `Provenance`/`Source`/`ObservationQuality`, `Athlete` `PurposeVersion`/`PurposeHistory`, `AthleteDecision`/`AthleteDecisionRecord`.
- **Rule:** source artifacts are **not necessarily "truth," but they are source records** — immutable, append-only (corrections supersede, never overwrite), provenance-bearing. They are *what was recorded/declared*, faithfully, with their own fallibility.

### 2.2 Reasoning artifacts
Examples: `Hypothesis`, `EvidenceCase`, `HypothesisRevision`, `Falsifier`, `ClaimConfidence`.
- **Rule:** reasoning artifacts are **inferential and revisable** — never facts; every revision is recorded with cause; a falsified/retired hypothesis is preserved, not deleted.

### 2.3 Understanding artifacts
Examples: `UnderstandingProfile`, per-`UnderstandingDimension` state, `Surprise`, `Staleness`, `Fragility`, `UnderstandingAssessment`.
- **Rule:** the `UnderstandingProfile` **may be stateful** (an aggregate with history); the `UnderstandingAssessment` is a **projection/read model** (freshness-bound, §6). The two are stored differently and must not be conflated.

### 2.4 Decision-support artifacts
Examples: `DecisionOpportunity`, `DecisionSupportCase`, gate results, `TraceabilityVerification` result, terminal output (`DecisionSupport`/`Inquiry`/`Withholding`), `SupportQuality`, `AthleteDecisionRef`.
- **Rule:** `DecisionSupportCase` persists **support integrity, not the athlete's decision** — it stores only an `AthleteDecisionRef`; `SupportQuality` is integrity-at-the-time and is never recomputed from outcome.

### 2.5 Projections / read models
Examples: `UnderstandingAssessment`, future `ImpactAssessment`, future athlete-facing summaries.
- **Rule:** a projection is **derived, freshness-bound, and never source truth**; if stored, it is a cache that always carries its freshness + source refs (§6).

---

## 3. Source of Truth Rules

[FACT] The store must keep these non-identities legible at all times:

| Not the same | Why the store must keep them distinct |
|---|---|
| `ObservationSet` **≠** meaning | raw records carry provenance/quality; meaning is earned later via signal detection. |
| `Signal` **≠** `Evidence` | a signal becomes evidence only inside a `Hypothesis`; the store never promotes it by association. |
| `Hypothesis` **≠** fact | always defeasible, falsifiable, revisable; a stored hypothesis is not a stored truth. |
| `UnderstandingAssessment` **≠** `UnderstandingProfile` | the assessment is a view; the profile is the aggregate (source of truth for understanding). |
| projection **≠** source of truth | a stored projection is a labeled cache, never authoritative. |
| terminal output **≠** `AthleteDecision` | what Aurora *showed* is not what the athlete *chose*. |
| `AthleteDecision` **≠** outcome | the decision and its later outcome are separate records. |
| `Purpose` **≠** inferred state | purpose is athlete-declared/given; never stored as readiness/capacity. |
| source record **≠** objective truth | a faithful record of a fallible report is still fallible; the store preserves provenance, not certainty. |
| persisted snapshot **≠** current truth | a snapshot is "as of" a moment; reading it as current re-introduces staleness-as-fact. |

---

## 4. Event Surface

[DECISION] A first **conceptual** outcome/event surface. An event/outcome is **a record of a domain occurrence** — not an instruction, owning no downstream effect; payloads carry **refs, not copied source truth**. **No event bus implementation.**

| Outcome / event | Owner module | Public or internal | Notes |
|---|---|---|---|
| `ObservationSetRecorded` | observation | **Public** | refs the set id; provenance born here |
| `ObservationSuperseded` | observation | **Public** | supersession is a refresh trigger; original retained |
| `SignalDetected` | observation | **Public** | refs the signal + observation roots |
| `SignalRejected` | observation | **Public** | auditable rejection, not an absence |
| `HypothesisOpened` | reasoning | Internal | a raw, untested claim — others must not react as if meaningful |
| `EvidenceAttached` | reasoning | Internal | mid-lifecycle |
| `HypothesisRevised` | reasoning | Internal-leaning | refresh trigger for dependent projections |
| `HypothesisPromotedToWorkingKnowledge` | reasoning | **Public** | a settled, consumable outcome |
| `HypothesisFalsified` | reasoning | **Public** | refresh trigger → invalid projections |
| `UnderstandingUpdated` | understanding | **Public** | from a tested outcome only |
| `UnderstandingMarkedStale` | understanding | **Public** | selective staleness (reason carried) |
| `AssessmentProjected` | understanding | Internal-leaning | a derived view was produced (carries freshness) |
| `DecisionOpportunityOpened` | decision-support | **Public** | a candidate moment |
| `DecisionSupportEvaluated` | decision-support | Internal | gates ran |
| `TerminalOutputSelected` | decision-support | **Public** | `DecisionSupport`/`Inquiry`/`Withholding` (+ degradation reasons) |
| `RecommendationWithheld` | decision-support | **Public** | responsible silence, auditable |
| `PurposeDeclared` / `PurposeChanged` | athlete | **Public** | append-only version; refresh trigger |
| `AthleteDecisionRecorded` | athlete | **Public** | athlete-owned; referenced by the case |
| `AthleteDecisionAmended` / `AthleteDecisionSuperseded` | athlete | **Public** | append-only correction; original retained |

[FACT] Clarifications the surface must not obscure: an event **does not own downstream effects** (a `PurposeChanged` *may* trigger selective staleness via a coordinator — it does not itself mutate understanding); an event **is not a command**; payloads are **reference handles**, so the current state is always resolved from the owning aggregate, never from a frozen payload.

---

## 5. Traceability Persistence

[DECISION] Rules the store must honor for traceability:
- **Every derived artifact carries source refs** (kind + id) — observation→signal→evidence→hypothesis→outcome→assessment→support.
- **Reference handles are stable** across persistence (an id that resolves later).
- **Projections never invent traceability** — they reference only real artifacts (already enforced in Impl 008).
- **The trace chain is verifiable later** by walking handles (`TraceabilityVerification` in `decision-support`).
- **Missing traceability constrains downstream voice** — a broken/incomplete chain degrades or withholds, never silently passes.
- **Source references preserve artifact kind and id** — not just an opaque pointer.
- **Purpose version and projection freshness are traceable** — `PurposeVersionRef` (in `Hypothesis.purposeContextRef`) and a projection's `sourceRefs`/`derivedAt` survive persistence.

[ASSUMPTION] The load-bearing rule: **the domain trace is the reference handles, not the storage's foreign keys.** A relational FK may *implement* a link, but the meaning lives in the domain refs — so the model is portable across any backend and verification never depends on schema.

---

## 6. Projection Persistence and Refresh

[DECISION] Projection storage rules:
- Projections **may be stored later for performance** — as a cache/read model, **not** truth.
- A persisted projection **must include**: `derivedAt`, `freshness` (the 5-state `ProjectionFreshness`), `sourceRefs`, `limitations`, and owner module.
- **Refresh recomputes from sources** (re-derive from the aggregate); it does **not** mutate the old projection as if it were always current.
- **Invalidation does not delete source artifacts** — it marks the projection `invalid`/`unknown`; the sources remain.
- **No generic projection engine yet** — freshness/refresh stays local to the owning module (per Impl 008) until a second concrete projection (`ImpactAssessment`) justifies a shared kernel.

[FACT] This extends Impl 008 to the store: the freshness machinery already exists in `understanding`; persistence must carry it so a *stored* assessment is, like a computed one, only ever a labeled view whose non-current states can only lower the voice.

---

## 7. Reprojection Strategy

[DECISION] First principles for recomputing derived state (no implementation):
- **Source artifacts are replayable / re-readable** — observations and their supersession history reconstruct "what was known as of" any moment.
- **Reasoning artifacts are revisable** — re-derivation respects current lifecycle state + recorded revisions.
- **Understanding needs explicit transitions, not blind replay** — its level moves by survived-challenge/surprise/decay policy; reprojection reconstructs via that policy, never by naively re-applying events.
- **Projections recompute from current source + aggregate state** — pure functions; same inputs → same view.
- **Staleness is derived from triggers** — a stored trigger (purpose change, supersession, falsification, time) re-derives freshness; freshness is **recalculated, never assumed**.
- **Event ordering matters** — outcomes are append-only and time-ordered; reprojection respects order.

[ASSUMPTION] The asymmetry persists into reprojection: recomputation may only re-derive the *same or more cautious* result; it must never manufacture a stronger claim, a higher level, or a fresher projection than the sources support.

---

## 8. Aggregate Persistence Boundaries

[DECISION] The eventual persistence boundary per module (conceptual; no schema).

| Module | Aggregate root(s) | Entities / value objects | Outcomes / events | Projections | Forbidden persistence shortcut |
|---|---|---|---|---|---|
| **observation** | `ObservationSet` (one boundary per occasion) | `Observation`(measured/subjective/missing-data), `Provenance`, `Source`, `ObservationQuality`, `Signal`/`SignalRejection`, `ContextualizedObservation` | `ObservationSetRecorded`, `ObservationSuperseded`, `SignalDetected`, `SignalRejected` | (none owned) | overwriting an observation; dropping provenance/quality; storing a signal as evidence |
| **reasoning** | `Hypothesis` (owns `EvidenceCase`) | `Falsifier`, `ClaimConfidence`, `TraceToSignal`, `HypothesisRevision` | `HypothesisOpened`, `EvidenceAttached`, `HypothesisRevised/Falsified/PromotedToWorkingKnowledge` | `ImpactAssessment` (future) | deleting a falsified hypothesis; storing a claim as fact; persisting evidence outside its hypothesis |
| **understanding** | `UnderstandingProfile` (per athlete, per-dimension internally) | `UnderstandingDimension` state, `Surprise`, `Staleness`, `Fragility`, `SurvivedChallenge` | `UnderstandingUpdated`, `UnderstandingMarkedStale` | `UnderstandingAssessment` (freshness-bound, §6) | storing the assessment as the profile; persisting a level above survived evidence |
| **decision-support** | `DecisionSupportCase` (per case) | `DecisionOpportunity`, gate results, `TraceabilityVerificationResult`, terminal output, `SupportQuality`, `AthleteDecisionRef` | `DecisionOpportunityOpened`, `TerminalOutputSelected`, `RecommendationWithheld` | (none owned) | owning/mutating `AthleteDecision`; recomputing `SupportQuality` from outcome; storing LLM text as authority |
| **athlete** | `Athlete` (thin; owns `PurposeHistory`, `AthleteDecisionRecord`) | `Purpose`/`PurposeVersion`, `PurposeChanged`, `AthleteDecision`/`DecisionChoice`/`DecisionRationale`/`DecisionContext`/`DecisionOutcomeRef` | `PurposeDeclared/Changed`, `AthleteDecisionRecorded/Amended/Superseded` | (none owned) | storing inferred state/capacity in `Athlete`; overwriting purpose/decision history; persisting behavior as inferred identity |

---

## 9. Forbidden Persistence Shortcuts

[FACT] The eventual persistence layer must **not**:
- store inferred athlete state in `Athlete`;
- persist a projection as fact **without** its source refs + freshness;
- overwrite event/outcome history;
- mutate historical decisions (corrections amend/supersede);
- use an outcome to rewrite `SupportQuality`;
- persist LLM text as domain authority;
- bypass `Hypothesis`/`EvidenceCase` because a decision/outcome exists;
- store "current truth" without provenance;
- store **freshness-less** projections;
- use database foreign keys as a **substitute** for domain traceability;
- allow the **persistence shape to drive the domain model** (the domain shape drives the store, never the reverse).

[ASSUMPTION] The single most dangerous shortcut, named: **letting the persistence shape drive the domain.** Every other item on this list is a symptom of it — once "what's easy to store" outranks "what the domain means," projections become rows-of-truth, history becomes mutable, and the epistemic boundaries dissolve invisibly.

---

## 10. What Is Still Not Chosen

[FACT] Deliberately **not** chosen here, and why each is deferred:

| Deferred | Why |
|---|---|
| database technology | the domain must not be shaped by a store; choose behind a port when a real requirement exists |
| ORM | same — an ORM's mapping conventions must not leak into aggregates |
| event bus / queue | the event surface is conceptual; runtime delivery is a transport concern, separable |
| cache | projections recompute correctly without a cache; caching is a performance optimization, later |
| migration tooling | no schema exists to migrate |
| cloud infrastructure | deployment is orthogonal to the model |
| API shape | no external entrypoint boundary specified yet |
| production scheduler | refresh is currently caller/harness-driven; scheduling is later |
| event serialization format | premature until a transport/store is chosen |
| full event-sourcing strategy | understanding needs policy-based reconstruction, not naive replay; commit only after §7 is validated |
| read-model storage backend | projections are labeled views; their backend is a later, reversible choice |

[ASSUMPTION] All are deferred for one reason: **none changes what Aurora *means*, only how it is *stored or moved*** — and the model must be provably correct (via in-memory ports) before any of them is bound.

---

## 11. Validation Strategy For Future Implementation

[ASSUMPTION] Expected tests for the future persistence slices (negative tests are defining):
- **aggregate round-trip** — save then load each aggregate; the loaded value equals the original and passes its invariants (rehydrated through constructors);
- **traceability survival** — source refs survive a round-trip; the chain still verifies;
- **projection freshness persistence** — a stored projection carries `derivedAt`/`freshness`/`sourceRefs`; loading it does not make it `current`;
- **no projection-as-truth** — a consumer reading a stored projection still sees its freshness and is constrained by the ceiling;
- **event payload ref-only** — outcome records carry refs, not copied source state;
- **`AthleteDecision` append-only** — a correction amends/supersedes; the original is still loadable;
- **`PurposeHistory` append-only** — round-trip preserves all versions, none overwritten;
- **`SupportQuality` not outcome-derived** — recording a later outcome leaves a persisted `SupportQuality` unchanged;
- **reprojection from source** — recomputing a projection/understanding from stored sources reproduces the same (or more cautious) result;
- **stale projection voice-degradation** — a loaded stale/invalid assessment still lowers the voice (→ Withholding for invalid/unknown);
- **no accidental layer** — no UI/API/DB/LLM is introduced until explicitly specified (structural guard).

---

## 12. Recommended Next Specs

[ASSUMPTION] After this paper, in order. Each: why it matters · what it must not do · dependencies.

1. **Spec 010 — Persistence Ports and In-Memory Repositories**
   - *Why:* makes persistence real and testable without choosing a database; proves the ports preserve invariants via round-trip tests.
   - *Must not:* choose a DB/ORM; let a repository write fields bypassing constructors; persist a projection without freshness.
   - *Depends on:* all five modules (done); §1.1/§1.7.

2. **Spec 011 — Domain Event/Outcome Records and Traceability Envelope**
   - *Why:* gives the §4 surface a concrete, append-only, ref-only record shape and a reusable traceability envelope.
   - *Must not:* add an event bus; put copied source state in payloads; let an event own downstream effects.
   - *Depends on:* Spec 010 (records persist via ports); §4/§5.

3. **Spec 012 — Reprojection Harness**
   - *Why:* proves derived state recomputes from sources (projections + understanding via policy, not blind replay).
   - *Must not:* replay events as literal understanding promotions; manufacture fresher/stronger results than sources support.
   - *Depends on:* Specs 010–011; §6/§7.

4. **Spec 013 — Manual Input Adapter**
   - *Why:* replaces the synthetic fixture with a real, provenance-bearing ingestion boundary (manual entry first; FIT later).
   - *Must not:* assign meaning at ingestion; drop provenance/quality; let the adapter reason.
   - *Depends on:* observation (done); Spec 010 (what it writes).

5. **Spec 014 — LLM Rendering Boundary**
   - *Why:* defines how a generated rendering of a terminal output is produced *downstream of the domain*, with the domain value as the source of truth.
   - *Must not:* let generated text become domain authority; derive voice from the renderer; bypass gates/freshness.
   - *Depends on:* decision-support (done); a strict read-only contract over terminal outputs.

[DECISION] **Recommended next step: Spec 010 — Persistence Ports and In-Memory Repositories.** It is the smallest move that makes persistence *real and provably safe* — repository ports per aggregate with in-memory adapters and round-trip + traceability-survival + no-projection-as-truth tests — committing to **no** technology while turning every rule in this paper into an executable guarantee. Everything else (event records, reprojection, ingestion, rendering) builds on those ports.

---

## Success Criterion

> **"What can Aurora persist, what may be replayed or projected, and what must never become source truth?"**

[ASSUMPTION] Answerable from this page: Aurora may persist **source artifacts** (immutable, provenance-bearing, append-only), **reasoning artifacts** (inferential, revisable, never deleted), the **`UnderstandingProfile`** (stateful aggregate), **decision-support cases** (support integrity, referencing — not owning — the decision), **athlete-owned purpose and decisions** (append-only, given not inferred), and **projections** (labeled caches with freshness). It may **replay** source artifacts and **reproject** derived state — recomputing projections from current state and reconstructing understanding via its transition policy (never blind replay), always **recalculating** freshness. And it must **never** let a projection, snapshot, event, or stored value become source truth, an instruction, an owned decision, or an inferred identity — because the store carries **refs not copies**, **freshness not assumptions**, and **history not overwrites**, with the **domain shape driving persistence, never the reverse**.

---

## Open Questions Carried Forward

[QUESTION]
- whether `UnderstandingProfile` reconstruction is policy-fold or stored-state (validate in Spec 012);
- whether any aggregate needs an explicit immutable `*Snapshot` value (introduce only on demonstrated need);
- the exact public/internal split of the §4 surface (validate against Spec 010/011);
- whether `ImpactAssessment` (the second projection) arrives before or after persistence;
- how "as of" historical queries are expressed at the port level;
- when event-sourcing (if ever) is adopted for any aggregate;
- how the LLM rendering boundary consumes freshness + agency markers safely (Spec 014).

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the second Implementation Architecture paper. It defines persistence and event-surface boundaries for Implementations 001–009; it chooses no technology and modifies no module. The danger it guards: storing the reasoning without corrupting it.*

*Inputs: [Foundation Index](../README.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Core Completion Review](./CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](./TECHNICAL_BOUNDARY_MAP.md) · [System Map](../diagrams/SYSTEM_MAP.md) · [Spec 001](../specs/001-observation-set-intake.md) · [Spec 002](../specs/002-signal-detection.md) · [Spec 003](../specs/003-hypothesis-lifecycle.md) · [Spec 004](../specs/004-understanding-update.md) · [Spec 005](../specs/005-decision-support-voice.md) · [Spec 006](../specs/006-end-to-end-responsible-reflection.md) · [Spec 007](../specs/007-athlete-purpose-change-reinterpretation.md) · [Spec 008](../specs/008-projection-refresh-staleness-strategy.md) · [Spec 009](../specs/009-athlete-decision-feedback-loop.md)*
