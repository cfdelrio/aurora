# Aurora — Core Completion Review

> A consolidation of what Aurora's reasoning core has proven in code, what it deliberately does not yet do, and the boundaries future work must not collapse.
>
> Review / Consolidation phase. No code, no production-module changes. This document summarizes; it does not decide.

| Field | Value |
|---|---|
| **Status** | Review / Consolidation · *Accepted snapshot* |
| **Phase** | Review (no implementation) |
| **Covers** | Implementations 001–006 (core) · **updated for 007 (Purpose `athlete`), 008 (projection freshness), 009 (AthleteDecision feedback), 010 (persistence ports + in-memory repositories), 011 (event/outcome records + traceability envelope), 012 (check-only reprojection harness), 013 (manual input adapter)** |
| **Validation at writing** | core: `145/145` · 007: `175/175` · 008: `196/196` · 009: `212/212` · 010: `235/235` · 011: `275/275` · 012: `295/295` · **post-013: `tsc --noEmit` clean · `node --test` 317/317 pass** |
| **Modules** | `observation` (intake **+ Manual Input Adapter**, Impl 013), `reasoning`, `understanding` (projection freshness), `decision-support`, **`athlete` (Purpose + AthleteDecision)** (+ `shared-kernel`) — each with **repository ports + in-memory adapters** (Impl 010) — **plus the dependency-neutral `event-recording` module** (append-only, ref-only `DomainEventRecord` log) (Impl 011) — **plus a neutral check-only `reprojection-harness`** (test-support seam, not a module) (Impl 012) |

[FACT] **Central question:** *What exactly has Aurora's reasoning core proven in code, what does it intentionally not do yet, and what boundaries must future work not violate?*

---

## Update — Implementation 007 (Purpose-first `athlete`)

[FACT] Since this review was first written for Implementations 001–006, **Implementation 007** added a thin, **Purpose-first `athlete` module** — Aurora's first real *given* context. The body below has been corrected where it is affected; this banner is the at-a-glance summary of *what changed after Implementation 007*.

[FACT] **Now true:**
- `athlete` is an **implemented upstream module** (imports only `shared-kernel`; imports no `observation`/`reasoning`/`understanding`/`decision-support`).
- The implemented slice is **Purpose-only**: `Athlete` (thin root), `Purpose`/`DeclaredPurpose`, `PurposeVersion`, `PurposeVersionRef`, `PurposeHistory`, `PurposeChanged`, `PurposeChangeReason`, `PurposeSource`, `PurposeStatus`, `PurposeReinterpretationStatus` (type only), and a `RevealedPurposeSignal` placeholder.
- **`PurposeHistory` is append-only**; a change appends an immutable `PurposeVersion` and never overwrites the past.
- **`PurposeChanged` is a domain outcome/value** (returned/derived), **not** an event bus.
- **`PurposeVersionRef` can flow into `Hypothesis.purposeContextRef`** (the slot already existed — no reasoning refactor).
- **Purpose maps to decision-support `PurposeContext`** (missing→unknown, ambiguous→ambiguous, declared→declared) through a **neutral harness adapter**.
- **A purpose change can selectively stale understanding** via `markUnderstandingStale("purpose-change")` through a neutral harness adapter — `athlete` never mutates `UnderstandingProfile` directly and never resets it globally.
- **`Athlete` owns declared context, not inferred truth** — no state, capacity, readiness, fatigue, constraints, or path-dependent memory were implemented.

[FACT] **Distinctions this update makes explicit** (do not collapse):
- **thin Athlete/Purpose module ≠ full Athlete aggregate** — only the Purpose slice exists.
- **declared Purpose ≠ inferred athlete state** — `athlete` holds the *given*, never the *inferred*.
- **`PurposeChanged` ≠ reasoning rewrite** — prior hypotheses are never edited or auto-falsified.
- **`PurposeVersionRef` ≠ proof that old reasoning used the new purpose** — it is a context handle, tagging which purpose was in force; it does not retroactively re-evaluate.
- **Revealed behavior ≠ declared purpose** — only an athlete-sourced declaration creates a version; behavior never silently overwrites it.
- **Purpose context ≠ decision-support voice** — purpose feeds the `PurposeGate`; the case still selects the `VoiceMode`.
- **selective staleness ≠ global understanding reset** — only the named dimension(s) go stale.

[ASSUMPTION] The headline: **Aurora now has athlete-owned, versioned Purpose as real upstream context — but not a full Athlete model.** Purpose can constrain future reasoning and decision-support through explicit seams, while prior reasoning stays historically traceable and is never rewritten.

---

## Update — Implementation 008 (Projection Freshness on `UnderstandingAssessment`)

[FACT] **Implementation 008** made projection freshness **explicit** on `UnderstandingAssessment` (the one concrete projection today) and added a pure, selective refresh policy — all inside `understanding`, with **no `decision-support` change**.

[FACT] **Now true:**
- `UnderstandingAssessment` carries explicit **`freshness`** (`current`/`stale`/`partial`/`invalid`/`unknown`), **`derivedAt`**, **`sourceRefs`** (a `ProjectionTrace`), and **`limitations`** — all additive/optional, so 001–007 call sites are unchanged.
- New `understanding` surface: `ProjectionFreshness`/`Status`, `StalenessReason`, `ProjectionSourceRef`/`Kind`, `ProjectionTrace`, `ProjectionLimitations`, `RefreshTrigger`/`Kind`, `ProjectionRefreshDecision`/`Kind`, `ProjectionRefreshPolicy`, plus `clampCeilingByFreshness`/`applyFreshness`.
- **`current` preserves the Impl 006 Reflection scenario** byte-for-byte.
- **No non-current freshness can raise the voice;** `stale`/`partial` lower the ceiling one step; **`invalid`/`unknown` clamp `safeVoiceCeiling` to `none`** (→ `Withholding`).
- **`decision-support` was not modified** — freshness reaches it **only through the existing `safeVoiceCeiling`**; `understandingGate` still reads only the ceiling.
- **Refresh = recompute** (a new assessment); `applyFreshness` produces a **new** view and never mutates the old one; the prior assessment stays auditable if retained.
- The refresh policy is **pure, deterministic, selective** (only projections whose source refs intersect the trigger are affected), and **conservative** under uncertainty — it never globally invalidates and never invents traceability.
- **Still absent (intentional):** no generic projection engine, no top-level `projection` module, no persistence, no DB, no cache, no event bus, no UI/API/LLM, no `ImpactAssessment`.

[FACT] **Distinctions this update makes explicit** (do not collapse):
- **Projection ≠ source of truth** — `UnderstandingAssessment` is a derived read model of the `UnderstandingProfile` aggregate.
- **`ProjectionFreshness` ≠ traceability** — freshness says *how safe to consume*; trace/source refs say *what it came from*.
- **source refs ≠ copied source state** — references back to real artifacts, never embedded/re-authored truth.
- **refresh ≠ mutate old projection** — refresh recomputes a new view; the old one is never edited.
- **stale/partial/invalid/unknown ≠ permission to recommend** — non-current freshness can only constrain.
- **`safeVoiceCeiling` clamp ≠ decision-support owning freshness** — the consumer reads the (clamped) ceiling; it does not read freshness.
- **`UnderstandingAssessment` projection ≠ `UnderstandingProfile` aggregate** — the aggregate is the source of truth; the assessment is its labeled view.
- **local freshness slice ≠ generic projection engine** — freshness lives in `understanding` for one projection; no engine exists.

[ASSUMPTION] The headline: **Aurora now makes projection freshness explicit for `UnderstandingAssessment`; non-current freshness can only constrain downstream voice through `safeVoiceCeiling`, projections stay derived views, and there is still no generic projection engine or persistence.**

---

## Update — Implementation 009 (AthleteDecision Feedback Loop)

[FACT] **Implementation 009** closed the decision feedback loop: an athlete-owned, append-only `AthleteDecision` slice was added **inside `athlete`**, and a neutral harness adapter re-enters a reported decision as a `SubjectiveObservation` — **no `decision-support` / `observation` / `reasoning` / `understanding` change**.

[FACT] **Now true:**
- `AthleteDecision` is **implemented inside `athlete`** (athlete-owned, append-only); the `AthleteDecisionRef` placeholder is **retired** (it now references a real decision).
- New `athlete` surface: `AthleteDecisionId`, `AthleteDecision` (+ athlete-local `AthleteDecisionRef`, `DecisionReportSource`), `DecisionChoice`, `DecisionRationale`, `DecisionContext`, `DecisionOutcomeRef`, `AthleteDecisionRecord` (+ `amend`/supersede). Coordinators: `recordAthleteDecision`, `amendAthleteDecision`.
- **`DecisionSupportCase` records only an `AthleteDecisionRef`** — it references the decision, never owns or mutates it.
- The decision is **append-only**: corrections **amend/supersede**, the original stays auditable; `DecisionChoice` keeps a **modification** as free text (no binary compliance); `DecisionRationale` is athlete-reported context, not truth.
- **`DecisionOutcomeRef` is a reference only** — no full `DecisionOutcome` object; "no outcome" is the default.
- The decision **re-enters as a `SubjectiveObservation`** (via the neutral `__tests__` adapter, since `athlete` must not import `observation`) — an `Observation`, **never** `Signal`/`Evidence`/`Hypothesis`/`Understanding`. Future learning still passes the full ladder.
- **`divergedFromSupport` is neutral factual metadata**, not a compliance score; **good/bad outcome does not grade `SupportQuality`**.
- **Still absent (intentional):** no full `DecisionOutcome` object, no pattern engine, no compliance/obedience/shame/reward scoring, no outcome-based validation, no UI/API/DB/event-bus/persistence/LLM/training-plan.

[FACT] **Distinctions this update makes explicit** (do not collapse):
- **`AthleteDecision` ≠ Aurora output** — it is the athlete's fact, not Aurora's product.
- **`AthleteDecisionRef` ≠ ownership** — a reference recorded after the fact.
- **divergence ≠ noncompliance**, **following ≠ obedience-success**, **not-following ≠ failure** — no valence anywhere.
- **`DecisionOutcomeRef` ≠ outcome judgement** — a handle to a separate, later observation.
- **`AthleteDecision → Observation` ≠ `AthleteDecision → Evidence`** — re-entry is observation only.
- **`SupportQuality` ≠ outcome quality** — integrity at the time of support.
- **decision pattern ≠ athlete label** — a pattern must become a falsifiable hypothesis first.
- **decision rationale ≠ declared-purpose overwrite** — behavior never rewrites purpose.

[ASSUMPTION] The headline: **the athlete's decision now returns as athlete-owned learning material — referenced not owned, re-entering only as `Observation` through the ladder — with no obedience tracking, no shame, and no outcome-based grading of the support.**

---

## Update — Implementation 010 (Persistence Ports & In-Memory Repositories)

[FACT] **Implementation 010** added the first persistence slice: **repository ports + in-memory adapters** and an additive, validated **`toState()` / `reconstitute(state)`** surface per persisted boundary — proving round-trip safety with **no DB, ORM, schema, migrations, event bus, cache, or infrastructure**, and **no technology chosen**. All domain changes are **additive** (no behavior change; the prior tests stayed green).

[FACT] **Now true:**
- Persisted boundaries gained `toState()` (plain, serializable) + `static reconstitute(state)` (**validates invariants; rejects invalid state; rebuilds via existing constructors/helpers** — never a raw field bag): `ObservationSet`, `Hypothesis`, `UnderstandingProfile`, `DecisionSupportCase`, `Athlete`, `AthleteDecisionRecord`.
- Each has a **module-owned repository port** (`save`/`findById`/`exists`) and an **in-memory adapter** (module-local `application/`, **not** infrastructure). `AthleteDecisionRecord` is keyed by `athleteRef`; **`PurposeHistory` persists *through* `Athlete`**.
- In-memory repositories **store state copies, not live references** (deep-copy via `structuredClone` on save *and* load), so **two finds return independent objects** and **mutating a retrieved object never touches the store** (mutation isolation proven).
- **Round-trip preserves**: identity, provenance, **append-only history**, **supersession**, **traceability refs**, terminal output + support integrity, and **`AthleteDecisionRef` (referenced, not owned)**.
- **Projection freshness survival** is proven via an **in-memory test helper** — there is **no projection repository**; a stored assessment loads still as a labeled view (invalid/unknown → ceiling `none`).
- **Still absent (intentional):** no production DB/ORM/schema/migrations, no event bus, no cache, no `src/infrastructure`, no `persistence`/`repositories` module, no projection repository, no event records.

[FACT] **Distinctions this update makes explicit** (do not collapse):
- **persistence ports ≠ production database** · **in-memory repository ≠ infrastructure layer**.
- **`toState()` ≠ domain authority** · **`reconstitute(state)` ≠ a raw field-bag bypass** (it validates).
- **persisted state ≠ current truth** · **repository round-trip ≠ event sourcing**.
- **traceability refs ≠ database foreign keys** · **projection-freshness survival helper ≠ projection repository**.
- **`DecisionSupportCase` repository ≠ `AthleteDecision` ownership** · **a state copy ≠ a live domain-object reference**.

[ASSUMPTION] The headline: **Aurora can now save and reload its aggregates and stateful records through validated ports + in-memory adapters without corrupting invariants, traceability, freshness, append-only history, or ownership — while production persistence, event records, and all infrastructure remain intentionally absent.**

---

## Update — Implementation 011 (Domain Event/Outcome Records & Traceability Envelope)

[FACT] **Implementation 011** added a new **dependency-neutral `event-recording` module** that records *what happened* as an **append-only, ref-only** log — turning the persistence paper's §4 event surface from conceptual into code, while staying **non-command, non-bus, non-infrastructure**. It is **additive**: the only existing-file change is a documented one-line test allowlist for the new module directory; **no production module was modified**.

[FACT] **Now true:**
- A new module `src/modules/event-recording/` exists and **imports only `shared-kernel`**; **no domain module imports it**; the **event catalog lives outside `shared-kernel`** (the kernel never becomes event-aware).
- **One `DomainEventRecord`** carries two categories — **`occurrence`** (something was observed/created) and **`outcome`** (the result of an operation) — over a **closed 26-type catalog** (`DOMAIN_EVENT_TYPE`); there is **no parallel `DomainOutcomeRecord` class**.
- A record carries: id, type, category, `occurredAt`, `recordedAt`, producing module, a **`TraceabilityEnvelope`** (primary artifact ref + source refs + typed slots + optional projection-freshness *status label* + limitations), **ref-only `EventPayloadRef[]`**, and optional `EventActor` / `CausationRef` / `CorrelationRef`.
- **Payloads are ref-only by construction** — `EventPayloadRef` carries only `kind`/`id`/`role?`/`ownerModule?`; **copied aggregate state and arbitrary `metadata`/`payload` bags are unrepresentable**, and reconstitution rejects smuggled extra keys.
- **Records are append-only** — `DomainEventRecordLog` is immutable-by-operation (`append` returns a new log; duplicate ids rejected; order preserved); corrections/supersessions are **new records**. The **in-memory repository stores copies, not live references** (deep-copy on append/find/all) and exposes **no** `update`/`delete`/`dispatch`/`publish`/`subscribe`/`markProcessed`.
- **Catalog-driven validation** runs on both construction *and* `reconstitute(state)`: type↔module, type↔category, required primary-ref kind, required refs, required freshness marker, required output-kind role, required athlete actor, and `occurredAt ≤ recordedAt`. Reconstitution **re-validates and rejects invalid state**, executes nothing, and changes no timestamp.
- **Causation = lineage, correlation = grouping** — neither forms an execution chain; appending a record triggers no downstream mutation.
- **Still absent (intentional):** no event bus, no publish/subscribe, no handlers, no async delivery, no DB/schema/serialization tech, no `src/infrastructure`, no event sourcing, no projection engine, no production event store.

[FACT] **Distinctions this update makes explicit** (do not collapse):
- **event record ≠ command** · **event record ≠ aggregate** · **event record ≠ projection** · **event record ≠ source truth**.
- **event record ≠ event-bus message** · **event log ≠ event sourcing** (it records occurrences; it does not rebuild aggregates — `reconstitute` does).
- **correlation ≠ command chain** · **causation ≠ handler trigger**.
- **payload ref ≠ copied state** · **traceability envelope ≠ database foreign key**.
- **`DomainEventRecordRepository` ≠ production event store** · **occurrence/outcome record ≠ downstream mutation**.
- **`TerminalOutputSelected` event ≠ `AthleteDecision`** · **`AthleteDecisionRecorded` event ≠ compliance score** · **`ProjectionFreshnessChanged` event ≠ projection made current by assertion**.

[ASSUMPTION] The headline: **Aurora now records *what happened* in an append-only, ref-only, traceable log — complementing the aggregate repositories (which answer *what is the aggregate now?*) without replacing them, and without becoming a command, copied state, a projection, source truth, a bus, or event sourcing.**

---

## Update — Implementation 012 (Check-Only Reprojection Harness)

[FACT] **Implementation 012** added a **neutral, check-only reprojection harness** — a recompute-and-compare *safety mechanism* that re-derives derived views, recalculates freshness, verifies traceability, detects candidates from event records, and **reports** drift/findings. It is **test-support / coordination seam, not production architecture**: it lives under `src/modules/__tests__/reprojection-harness/`, **no production `reprojection` module exists**, and **no existing module was modified**.

[FACT] **Now true:**
- A check-only harness (`runReprojection`) exists under `src/modules/__tests__/reprojection-harness/` — composed of `ReprojectionRun`/`Result`/`Finding`/`Mode`/`Target`/`InputSet`, a pure event→candidate map, and an `understanding` recompute adapter.
- It **recomputes `UnderstandingAssessment`** *through the owning module's existing function* (`produceUnderstandingAssessment` + `applyFreshness` + the Impl 008 freshness helpers) — the harness **coordinates, it does not reason**; it never derives a level or applies a transition.
- It **recalculates the 5-state freshness** (and may only re-derive the **same or a more cautious** view — never promotes freshness, never raises a ceiling).
- It **detects candidate targets from `DomainEventRecord`s** via a **pure** map (`PurposeChanged`→stale, `ObservationSuperseded`→invalid/source-superseded, hypothesis events→`requires-policy-transition`, etc.) — events **identify what to check**, they **execute nothing**.
- It **reports drift** (`changed` + a differences summary) instead of overwriting; **reports** `missing-traceability`/`stale`/`invalid`/`requires-policy-transition`/`manual-review-required`; and attaches a diagnostic `SafeActionCategory` (never athlete-facing).
- **`check-only` is the default and only implemented mode**; `refresh-derived`/`mark-stale` are **reserved and throw**. A run **mutates no repository, appends no event record, creates no decision-support output, and calls no write method** (proven by a before/after deep-equality snapshot and a throwing-`save` that is never reached).
- **Empty repositories are never rebuilt from the event log** — an event referencing an absent aggregate yields `event-record-only`/`missing-source`, never synthesized state.
- **Still absent (intentional):** no production `reprojection` module, no scheduler, no event bus, no event sourcing, no projection repository, no production service/orchestration layer.

[FACT] **Distinctions this update makes explicit** (do not collapse):
- **reprojection harness ≠ production service** · **check-only ≠ a write path** · **reprojection ≠ event sourcing**.
- **event records ≠ aggregate-rebuild commands** · **events-as-candidates ≠ event execution** · **repository state ≠ event log**.
- **recomputed projection ≠ source truth** · **drift report ≠ overwrite** · **freshness recalculation ≠ freshness promotion**.
- **stale/invalid finding ≠ recommendation** · **DecisionSupport review finding ≠ `TerminalOutput`** · **`AthleteDecision` outcome ≠ `SupportQuality` rewrite** · **purpose-related stale finding ≠ `Purpose` overwrite** · **reserved mode ≠ implemented mode**.

[ASSUMPTION] The headline: **Aurora can now recompute and verify its derived views — recalculating freshness, identifying candidates from occurrence history, and reporting drift — while provably mutating no aggregate, executing no event, rebuilding nothing from the log, and turning no projection into truth; and it does so as a neutral check-only harness, not production architecture.**

---

## Update — Implementation 013 (Manual Input Adapter)

[FACT] **Implementation 013** added Aurora's first **real "data in" boundary**: an **`observation`-owned Manual Input Adapter** that records manually supplied athlete/training information faithfully as an `ObservationSet` — and refuses what it cannot represent. It records *source material*, never *meaning*. It is **additive**: `observation/index.ts` gained exports only (no behavior change); the one other change is a documented test-only guard-precision fix.

[FACT] **Now true:**
- `src/modules/observation/application/manual-input-*` implements `ManualInputSubmission`, `ManualInputEntry` (closed union), `ManualInputIngestionOutcome` (`accepted`/`partially-accepted`/`rejected`), closed **rejection/limitation/quality** catalogs, and **`ingestManualInput({ submission, observationSetRepository })`**.
- The adapter's **only domain output is an `ObservationSet`** — built via the existing **`recordObservationSet`** and persisted **only** through **`ObservationSetRepository`** (no bypass, no DB).
- It preserves **verbatim subjective `words`**, records **explicit missing data** (never invents values), and preserves **provenance/quality** with **`source: "manual"`** (the reporter is preserved in the provenance reference).
- **Rejection saves nothing** (a throwing `save` is never reached); **partial acceptance** records only the faithful entries and reports limitations for the rest; ambiguity becomes a limitation or a rejection, never an inference.
- `measured-value` is **reserved** (no unit interpretation yet → limitation/rejection); `athlete-decision-report` is recorded **only as a subjective/context observation** — **no `AthleteDecisionRecord` mutation**, no compliance score.
- The adapter **imports no downstream module** (`reasoning`/`understanding`/`decision-support`/`athlete`) and **no `event-recording`**; **`observation` stays `event-recording`-free**. An optional `ObservationSetRecorded` is composed **only in a neutral harness** from a **ref-only** event candidate, and is inert.
- **Still absent (intentional):** no UI, API, LLM, external/FIT/wearable integration, DB/schema, event bus, scheduler.

[FACT] **Distinctions this update makes explicit** (do not collapse):
- **manual input ≠ meaning** · **adapter ≠ reasoning** · **saved `ObservationSet` ≠ `Signal` detection**.
- **subjective words ≠ inferred fatigue/readiness** · **missing data ≠ invented value** · **partial acceptance ≠ silent interpretation** · **rejection ≠ accidental data loss**.
- **source quality ≠ athlete quality** · **event candidate ≠ event command** · **`ObservationSetRecorded` ≠ downstream execution**.
- **athlete-decision report as observation ≠ `AthleteDecisionRecord` mutation** · **Manual Input Adapter ≠ UI/API/LLM/external integration**.

[ASSUMPTION] The headline: **Aurora now accepts manually supplied input as faithful `ObservationSet`s — preserving provenance/source/quality and verbatim words, representing missing data explicitly, rejecting the unrepresentable, and persisting through the repository port — without interpreting input, detecting signals, reasoning, mutating athlete records, or triggering any downstream effect; the adapter is a scribe, not an interpreter.**

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from the implemented code, tests, or an accepted spec/model. |
| **[DECISION]** | A consolidation commitment recorded here. |
| **[ASSUMPTION]** | A stance taken for this review. |
| **[QUESTION]** | Open; carried forward, does not block. |

---

## 1. Executive Summary

[FACT]
- **The reasoning core is implemented end-to-end.** All five ladder stages exist in code (`observation → reasoning → understanding → decision-support`) and Implementation 006 composes them into one demonstrated chain.
- **The first full output is `Reflection`, not `Recommendation`.** The end-to-end integration test proves a complete chain that lands on a modest voice.
- **The system demonstrates restraint *by construction*.** Even with complete traceability and clean gates, a single chain tops out at Reflection because the understanding ceiling caps the voice — restraint is structural, not a runtime preference.
- **The current suite proves the core can compose without overreaching.** 145 tests pass, including module-boundary tests, negative-capability ("defining") tests, and the end-to-end Reflection proof.
- **Persistence exists now, but only as ports + in-memory adapters (Impl 010):** validated `toState()`/`reconstitute()` + repository ports for the six persisted boundaries, all in-memory. **Production persistence remains absent** — no **production DB/ORM/schema/migrations**, no **event bus**, no **cache**, no **`src/infrastructure`**, no **projection repository**.
- **Event/outcome records exist now, as a dependency-neutral append-only log (Impl 011):** the `event-recording` module records *what happened* — one ref-only `DomainEventRecord` (occurrence/outcome) over a closed catalog, with a `TraceabilityEnvelope` and an append-only in-memory log/repository — **complementing the aggregate repositories, not replacing them**. It remains **non-command, non-bus**: no event bus, publish/subscribe, handlers, async delivery, serialization tech, or **event sourcing**.
- **Reprojection exists now, as a neutral check-only harness (Impl 012):** a recompute-and-compare *safety mechanism* (test-support under `__tests__/reprojection-harness/`, **not a production module**) that re-derives `UnderstandingAssessment` through the owning module, recalculates freshness, detects candidates from event records, and **reports** drift/findings — **mutating nothing, executing no event, rebuilding nothing from the log, and turning no projection into truth**. No scheduler, event sourcing, or projection repository exists.
- **A real "data in" boundary exists now (Impl 013):** an `observation`-owned **Manual Input Adapter** records manually supplied input faithfully as an `ObservationSet` (via `recordObservationSet`, persisted through `ObservationSetRepository`), preserving provenance/source/quality and verbatim words, representing missing data explicitly, and rejecting the unrepresentable — **without interpreting, detecting a `Signal`, reasoning, mutating athlete records, or triggering downstream effects**. No UI/API/LLM/external integration exists; `observation` imports no `event-recording`.
- **What does not exist yet:** no UI, API, **production DB/persistence**, LLM rendering, event bus, notification layer, Garmin/FIT adapter, or production orchestration service. The `athlete` module now holds **Purpose (Impl 007) + AthleteDecision (Impl 009)** — but **full Athlete** (state/capacity/constraints/path-memory), a **full `DecisionOutcome` object**, a **pattern engine**, and any **compliance/outcome-based validation** are still absent. These are **intentional absences** (see §6), not gaps left by mistake.

[ASSUMPTION] The one-sentence claim this review defends: **Aurora can run the full reasoning core end-to-end and still refuse to overreach.**

---

## 2. Implemented Core Flow

[FACT] The implemented flow, stage by stage. "Refuses to" names what is *unrepresentable or rejected* at that stage, not merely untested.

```
ObservationSet → Observation → ContextualizedObservation → Signal/SignalRejection
   → EvidenceCase → Hypothesis lifecycle → UnderstandingProfile update
   → UnderstandingAssessment → DecisionSupportCase → Terminal Output (DecisionSupport: Reflection)
```

| Step | Owning module | Implemented object(s) | Protected invariant | Handoff downstream | Refuses to |
|---|---|---|---|---|---|
| **ObservationSet / Observation** | `observation` | `ObservationSet`, `MeasuredObservation`, `SubjectiveObservation`, `MissingDataObservation`, `Provenance`, `Source`, `ObservationQuality` | Provenance/quality born at capture and immutable; corrections supersede, never overwrite; incompleteness explicit | raw, provenance-bearing observations | hold any interpretation/meaning field |
| **ContextualizedObservation** | `observation/signal` | `ContextualFrame`, `ContextualizedObservation`, `TraceToObservation` | Frame is context, not conclusion; the original is never mutated; trace to the set/observation is born here | a contextualized observation | assign meaning or direction |
| **Signal / SignalRejection** | `observation/signal` | `Signal`, `SignalRejection`, `SignalDetectionPolicy` (`expectedRangeDeviationPolicy`) | Relevance-without-meaning; every outcome is a Signal *or* an auditable rejection (nothing silently dropped); quality/provenance travel forward | a `Signal` (or recorded rejection) | become evidence; resolve a source conflict |
| **EvidenceCase** | `reasoning` | `EvidenceCase`, `TraceToSignal`, `EvidenceDirection` | An `EvidenceCase` is created **only** by `Hypothesis.attachEvidence`; a `SignalRejection` can never become evidence | evidence attached to a claim | exist standalone; outside a hypothesis |
| **Hypothesis lifecycle** | `reasoning` | `Hypothesis` (aggregate root), `Falsifier`, `ClaimConfidence`, lifecycle states/transitions | Always falsifiable; calibrated, defeasible confidence; no silent transitions; never "certain" | a settled lifecycle **outcome** | become a fact; be certain |
| **UnderstandingProfile update** | `understanding` | `UnderstandingProfile` (aggregate), `UnderstandingDimension`, `ReasoningOutcome` adapter, `SurvivedChallenge`, `Surprise`, `Staleness`, `Fragility` | Per-dimension, never global; promotion only by survived challenge across ≥2 distinct conditions; population/repetition never promote; history never deleted | a per-dimension level + trail | read raw signals; store claim confidence; go global |
| **UnderstandingAssessment** | `understanding` | `UnderstandingAssessment`, `SafeVoiceCeiling`, `deriveSafeVoiceCeiling` | Read-only projection; staleness/fragility can only **lower** the ceiling; the ceiling is **not** a `VoiceMode` | a `SafeVoiceCeiling` (max assertiveness) | select a voice; recommend |
| **DecisionSupportCase** | `decision-support` | `DecisionOpportunity`, `DecisionSupportCase` (aggregate), 5 gates, `TraceabilityVerification`, `VoiceSelectionPolicy`, `VoiceMode`, terminal outputs, `SupportQuality` | No output before gates run; voice gated not derived; Recommendation needs complete trace + confident ceiling; agency preserved; `AthleteDecision` referenced, never owned | a terminal output | own the decision; author claims; command |
| **Terminal Output** | `decision-support` | `DecisionSupport` (with `VoiceMode`), `Inquiry`, `Withholding` | `DecisionSupport` requires `preservesAgency: true` (literal); `Inquiry` is not a `VoiceMode`; `Withholding` carries an auditable reason | (the athlete-facing edge) | emit a command; hide uncertainty |

---

## 3. Module Inventory

### `observation` *(intake + Manual Input Adapter — Impl 013)*
[FACT] Implements `ObservationSet` (aggregate), `MeasuredObservation` / `SubjectiveObservation` / `MissingDataObservation`, `Provenance` / `Source` / `ObservationQuality`, `ContextualFrame` + `contextualize`, `Signal` / `SignalRejection`, and `expectedRangeDeviationPolicy` (the `SignalDetectionPolicy`). Coordinators: `recordObservationSet`, `detectSignals`. **Plus the Manual Input Adapter (Impl 013):** `ManualInputSubmission`, `ManualInputEntry`, `ManualInputIngestionOutcome` + closed rejection/limitation/quality catalogs, and `ingestManualInput({ submission, observationSetRepository })`.
- **Clarify:** `observation` still does **not reason** — it imports only `shared-kernel`; `Hypothesis`/`Evidence`/`Impact`/`Understanding`/`DecisionSupport` are not reachable here. **A `Signal` is not `Evidence`** — it asserts only *possible relevance to a future reasoning question*, with no slot for cause/impact/state.
- **Manual Input Adapter (Impl 013):** the first real **"data in"** boundary — it records manual input **faithfully as an `ObservationSet`** (via `recordObservationSet`, persisted through `ObservationSetRepository`), preserving **verbatim subjective `words`**, **explicit missing data**, and **provenance/quality** (`source: "manual"`). It returns `accepted`/`partially-accepted`/`rejected` (rejection saves nothing); `measured-value` is reserved; an `athlete-decision-report` is recorded **only as a subjective observation** (no `AthleteDecisionRecord` write). It **detects no `Signal`**, **infers nothing**, and **imports no downstream module or `event-recording`** — the optional `ObservationSetRecorded` is composed only in a neutral harness from a ref-only candidate. **Manual input is source material, never meaning.**

### `reasoning`
[FACT] Implements `Hypothesis` (aggregate root) owning `EvidenceCase` (entity), `EvidenceDirection`, `ClaimConfidence`, `Falsifier`, and the lifecycle (`proposed → supported/weakened/contradicted/falsified/retired/promoted-to-working-knowledge`). Coordinators: `openHypothesis`, `attachSignalAsEvidence`, `transitionHypothesis`.
- **Clarify:** a `Hypothesis` is **not fact** and never reaches a "certain"/"proven" state; **confidence is not certainty** (it is calibrated and defeasible); **an `EvidenceCase` exists only inside a `Hypothesis`** — `createEvidenceCase` is deliberately *not* exported, and a `SignalRejection` is rejected as evidence at runtime and by type.

### `understanding`
[FACT] Implements `UnderstandingProfile` (aggregate, per-dimension), `UnderstandingDimension`, `UnderstandingLevel` (Unknown < Thin < Working < Trusted < Mature), the `ReasoningOutcome` anti-corruption adapter (`reasoningOutcomeFrom`), `SurvivedChallenge`, `Surprise`, `Staleness`, `Fragility`, `UnderstandingAssessment`, and `SafeVoiceCeiling`. **Plus projection freshness (Impl 008):** `ProjectionFreshness`/`Status`, `StalenessReason`, `ProjectionSourceRef`/`Kind`, `ProjectionTrace`, `ProjectionLimitations`, `RefreshTrigger`/`Kind`, `ProjectionRefreshDecision`/`Kind`, `ProjectionRefreshPolicy`, `clampCeilingByFreshness`, `applyFreshness`. Coordinators: `updateUnderstandingFromOutcome`, `produceUnderstandingAssessment` (now `at`-aware), `markUnderstandingStale`.
- **Clarify:** **claim confidence is not understanding** — the adapter deliberately drops `ClaimConfidence` and raw `EvidenceCase`s; **repetition does not promote** — promotion requires survived challenge across ≥2 distinct conditions; **`SafeVoiceCeiling` is not a `VoiceMode`** — it is understanding's own vocabulary for *maximum permitted assertiveness*.
- **Projection freshness (Impl 008):** `UnderstandingAssessment` is a **projection/read model** carrying explicit `freshness` (`current`/`stale`/`partial`/`invalid`/`unknown`), `derivedAt`, and `sourceRefs`. Non-current freshness can only **lower** the ceiling; `invalid`/`unknown` clamp it to `none`. The refresh policy is **pure, selective, conservative**; **refresh = recompute** (new view, old one auditable, never mutated). Freshness reaches `decision-support` **only via the clamped `safeVoiceCeiling`** — no `decision-support` change.

### `decision-support`
[FACT] Implements `DecisionOpportunity`, `DecisionSupportCase` (aggregate root), the five gates (`EvidenceGate`, `UnderstandingGate`, `PurposeGate`, `RiskGate`, `AgencyGate`), `TraceabilityVerification` (`verifyTraceability`), `VoiceSelectionPolicy` (`selectTerminalOutput`), `VoiceMode`, terminal outputs (`DecisionSupport`/`Inquiry`/`Withholding`), `RiskAssessment`, `PurposeContext`, `SupportQuality`, and `AthleteDecisionRef`. Coordinators: `openDecisionSupportCase`, `evaluateDecisionSupportCase`, `recordAthleteDecisionRef`.
- **Clarify:** **voice is gated, not derived** — `VoiceSelectionInputs` carries **no claim-confidence field**, so confidence→voice is unrepresentable; **`Recommendation` is hard to construct** — it requires `confident` ceiling + complete traceability + all gates passing; **`AthleteDecision` is referenced, not owned** — only an `AthleteDecisionRef` field exists, recorded after the fact, and `SupportQuality` reflects gate integrity, not outcome.

### `athlete` *(Purpose — Impl 007 · AthleteDecision — Impl 009)*
[FACT] Implements a thin `Athlete` aggregate root (+ `AthleteId`) owning an **append-only `PurposeHistory`** of immutable `PurposeVersion`s; `Purpose`/`DeclaredPurpose`, `PurposeStatus`, `PurposeSource`, `PurposeChangeReason`; `PurposeVersionRef`; `PurposeChanged` (a derived/returned value, **no event bus**); `PurposeReinterpretationStatus` + result value type (**type only — no engine**); a `RevealedPurposeSignal` placeholder. **Plus the AthleteDecision slice (Impl 009):** `AthleteDecisionId`, `AthleteDecision` (+ athlete-local `AthleteDecisionRef`, `DecisionReportSource`), `DecisionChoice`, `DecisionRationale`, `DecisionContext`, `DecisionOutcomeRef`, `AthleteDecisionRecord` (append-only; `amend`/supersede). Coordinators: `declarePurpose`, `changePurpose`, `recordAthleteDecision`, `amendAthleteDecision`. Imports **only `shared-kernel`**.
- **Clarify (Purpose):** **`Athlete` owns declared context, not inferred truth** — no state/capacity/readiness/fatigue/constraints/path-memory; **purpose changes the future lens, it does not repaint the past** — history is append-only, prior reasoning is never rewritten; **`athlete` reaches no downstream module** — purpose flows to `decision-support` (as `PurposeContext`) and to `understanding` (as selective staleness) only through **neutral harness/application adapters**; **declared ≠ revealed**.
- **Clarify (AthleteDecision, Impl 009):** the decision is **athlete-owned** and **append-only** (corrections amend/supersede, original retained); `DecisionSupportCase` records **only an `AthleteDecisionRef`** (referenced, never owned); a `DecisionChoice` keeps a **modification** as free text (**no binary compliance**), and `divergedFromSupport` is **neutral fact, not a score**; there is **no compliance/obedience/shame/reward field**; `DecisionOutcomeRef` is a **reference only** (no full outcome object); the decision **re-enters as a `SubjectiveObservation`** via a neutral adapter (`athlete` never imports `observation`) — **never** directly as Signal/Evidence/Understanding.

### Persistence (Impl 010) — across modules
[FACT] Each persisted boundary gained an additive `toState()` / `static reconstitute(state)` and a module-owned repository **port** + **in-memory adapter** (in `application/`): `observation/ObservationSetRepository`, `reasoning/HypothesisRepository`, `understanding/UnderstandingProfileRepository`, `decision-support/DecisionSupportCaseRepository`, `athlete/AthleteRepository`, `athlete/AthleteDecisionRecordRepository`.
- **Clarify:** **persistence is a boundary around aggregates, not a driver of the domain** — `reconstitute` **validates invariants and rejects invalid state** (never a raw field bag); the in-memory adapter **stores deep-copied state, not live references**, so loads are independent (mutation isolation); `PurposeHistory` persists **through `Athlete`**; there is **no projection repository** (freshness survival is a test helper); and **no technology is chosen** (no DB/ORM/schema/event-bus/cache/infrastructure).

### `event-recording` *(Impl 011 — append-only event/outcome records)*
[FACT] Implements a **dependency-neutral** occurrence log: `DomainEventRecord` (+ `DomainEventRecordId`), `DomainEventType` (closed 26-type catalog) + `DomainEventCategory` (`occurrence`/`outcome`), `TraceabilityEnvelope` (+ `ProjectionFreshnessStatus` label), `EventPayloadRef` (+ `EventArtifactKind`), `CausationRef`, `CorrelationRef`, `EventActor`, `DomainEventRecordLog`; and in `application/`, the `DomainEventRecordRepository` **port** (`append`/`findById`/`all`/`findByCorrelation`) + `InMemoryDomainEventRecordRepository`. Imports **only `shared-kernel`**.
- **Clarify:** the module records **what happened**, never **what should execute** — a record **is not a command** (appending mutates nothing), **is not an aggregate / projection / source truth**, and **does not replace** the Impl 010 repositories (those answer *what is the aggregate now?*). Payloads are **ref-only** (`kind`/`id`/`role?`/`ownerModule?`) — **copied aggregate state and arbitrary bags are unrepresentable**; the log is **append-only** (corrections are new records; duplicate ids rejected); the in-memory repository **stores copies, not live references** and has **no** update/delete/dispatch/publish/subscribe surface; `toState()`/`reconstitute()` **re-validate** the closed catalog (type↔module/category, required refs, `occurredAt ≤ recordedAt`) and execute nothing on rehydrate. **No domain module imports `event-recording`; the catalog stays out of `shared-kernel`; no event bus / event sourcing / serialization tech exists.**

### `reprojection-harness` *(Impl 012 — neutral check-only recompute-and-compare seam, NOT a module)*
[FACT] Lives under `src/modules/__tests__/reprojection-harness/` as **test-support / coordination**, not a production module: `runReprojection` + `ReprojectionRun`/`Result`/`Finding`/`Mode`/`Target`/`InputSet`, a **pure** event→candidate map, and an `understanding` recompute adapter. It is the neutral cross-module coordinator (like the existing purpose/decision adapters); it imports the modules it coordinates, and **no production module imports it**.
- **Clarify:** the harness **recomputes** derived views *only through the owning module's existing functions* (`produceUnderstandingAssessment`, `applyFreshness`) — it **coordinates, never reasons**; **recalculates** freshness (never promotes it, never raises a ceiling); reads **event records as candidates/context only** (never replayed/executed, never rebuilding an aggregate — empty repos → `event-record-only`/`missing-source`); **reports drift** (never overwrites); and in `check-only` (default and only mode; `refresh-derived`/`mark-stale` reserved and throwing) **mutates no repository, appends no record, and creates no `TerminalOutput`/recommendation/`SupportQuality` rewrite/`Purpose` overwrite/`DomainEventRecord`**. **Repositories remain the source of aggregate state; event records remain occurrence history; reprojection recomputes views and reports findings — none replaces the others.**

---

## 4. Structural Guarantees

[FACT] What is **impossible to construct today**, with the defense that makes it so. (These are enforced by module surface design + the negative-capability and boundary tests, not by convention.)

| # | Made impossible | Defense (module / test) |
|---|---|---|
| 1 | Raw `Observation` becoming meaning directly | `Observation` has no meaning field; meaning requires `contextualize` + `SignalDetectionPolicy`; `observation` cannot import `reasoning` (boundary test) |
| 2 | `Signal` becoming `Evidence` without a `Hypothesis` | `createEvidenceCase` not exported; `EvidenceCase` only via `Hypothesis.attachEvidence` (reasoning negative tests) |
| 3 | An `EvidenceCase` existing standalone | same as #2 — no constructor on the public surface |
| 4 | A `Hypothesis` becoming certainty | no "certain/proven" lifecycle state; confidence always calibrated/defeasible (reasoning lifecycle tests) |
| 5 | Understanding promoting from repetition alone | promotion gated on survived challenge across ≥2 distinct conditions in `update-policy` (understanding tests) |
| 6 | Claim confidence mapping to understanding | `reasoningOutcomeFrom` adapter drops `ClaimConfidence` (understanding adapter test) |
| 7 | `SafeVoiceCeiling` becoming a `VoiceMode` | distinct types in distinct modules; `maxVoiceForCeiling` maps ceiling→voice in `decision-support` (negative test) |
| 8 | Claim confidence selecting voice | `VoiceSelectionInputs` has no confidence field (decision-support negative test) |
| 9 | `Recommendation` without complete traceability + confident ceiling | final guard in `VoiceSelectionPolicy`; degrades to Framing otherwise (decision-support + e2e tests) |
| 10 | Risk escalating toward `Recommendation` | `RiskGate` yields only `caution-warning`; policy routes risk to `Warning`, never up (decision-support negative test) |
| 11 | `Inquiry` being a `VoiceMode` | `Inquiry` has no `voice` field; separate output type (decision-support negative test) |
| 12 | `DecisionSupportCase` owning `AthleteDecision` | only an `AthleteDecisionRef`; asserted `undefined` in the e2e proof (gates-and-quality + e2e tests) |
| 13 | Upstream depending on downstream | dependency-boundary tests per module + the e2e structural guard that no production file imports all four surfaces |
| 14 | `athlete` reaching a downstream module | `athlete` imports only `shared-kernel`; `athlete-boundary` test asserts no `observation`/`reasoning`/`understanding`/`decision-support` import (Impl 007) |
| 15 | Purpose history being overwritten / a purpose change rewriting the past | `PurposeHistory` append-only; `Athlete` immutable-by-operation; `PurposeChanged` carries no hypothesis mutation; never mutates `UnderstandingProfile` (Impl 007 tests) |
| 16 | Revealed behavior becoming declared purpose / inferred purpose | only an athlete-sourced declaration creates a version; runtime guard rejects non-purpose/non-athlete-sourced values; `RevealedPurposeSignal` has no change path (Impl 007 declared-vs-revealed test) |
| 17 | A non-current projection raising the voice | freshness only clamps the ceiling down; `clampCeilingByFreshness` never raises; `invalid`/`unknown` → `none` (Impl 008 freshness tests) |
| 18 | A stale/invalid projection earning a `Recommendation` | `Recommendation` needs `confident`; non-current freshness caps below it (→ `Withholding` for invalid/unknown); integration test |
| 19 | Refresh mutating an old projection / inventing traceability | `applyFreshness` returns a new frozen assessment; the old stays auditable; source refs derive only from the real trace (Impl 008 tests) |
| 20 | A trigger globally staling unrelated projections | `projectionRefreshPolicy` is selective by source-ref intersection; non-matching → `keep-current` (Impl 008 refresh-policy tests) |
| 21 | `DecisionSupportCase` owning the athlete's decision | the case holds only an `AthleteDecisionRef`; the `AthleteDecision` lives in `athlete`; integration test asserts no decision object on the case (Impl 009) |
| 22 | An `AthleteDecision` becoming `Evidence`/`Understanding` directly | the only re-entry is `decisionAsObservation` → `SubjectiveObservation`; no decision→Evidence/Understanding adapter exists; the ladder is intact (Impl 009 tests) |
| 23 | Obedience/compliance scoring of a decision | `AthleteDecision` carries no compliance/obedience/noncompliance/shame/reward field; `divergedFromSupport` is neutral; following ≠ success, not-following ≠ failure (Impl 009 negative tests) |
| 24 | An outcome retroactively grading the support | `DecisionOutcomeRef` is separate; recording a (divergent) decision leaves `SupportQuality` unchanged — integrity-at-the-time (Impl 009 test) |
| 25 | Reconstituting an invalid persisted object | `reconstitute` validates and **throws** on invalid state (no falsifier, empty occasion, missing athleteRef, out-of-order purpose history, orphan amendment); never a raw field bag (Impl 010 negative tests) |
| 26 | A repository handing out a live internal reference | adapters store deep-copied `toState()` and load via `reconstitute` (deep-copied); two finds are independent; mutating a load never touches the store (Impl 010 mutation-isolation tests) |
| 27 | Persistence silently dropping history/traceability/freshness | round-trip preserves append-only history, supersession, traceability refs, and (via helper) projection freshness (Impl 010 round-trip tests) |
| 28 | A production persistence layer / infrastructure leaking in | no `src/infrastructure`, no `persistence`/`repositories` module, no DB/ORM/event-bus token in production code (Impl 010 persistence-boundary guard) |
| 29 | An event record carrying copied aggregate state / an arbitrary payload bag | `EventPayloadRef` has only `kind`/`id`/`role?`/`ownerModule?`; no `payload`/`data`/`metadata: unknown`; reconstitution rejects extra keys (Impl 011 ref-only tests) |
| 30 | An event record acting as a command / executing or mutating downstream | a `DomainEventRecord` has no behavior beyond being recorded; appending mutates nothing; causation/correlation are lineage/grouping, not triggers (Impl 011 negative tests) |
| 31 | Overwriting/deleting event history; an event record bypassing the closed catalog | `DomainEventRecordLog`/repository are append-only (duplicate ids rejected; no update/delete); `record()`/`reconstitute()` validate type↔module/category + required refs against the closed catalog (Impl 011 append-only + validation tests) |
| 32 | `event-recording` coupling to domain modules / the kernel becoming event-aware / a bus or event sourcing | `event-recording` imports only `shared-kernel`; no domain module imports it; the catalog lives outside `shared-kernel`; no bus/publish/subscribe/handler/event-sourcing/serialization token or dir exists (Impl 011 boundary + negative-capability guards) |
| 33 | A reprojection run mutating an aggregate / calling a write method | `check-only` is the only implemented mode; the harness calls only reads; before/after deep-equality snapshot is unchanged and a throwing `save` is never reached (Impl 012 mutation-safety tests) |
| 34 | Rebuilding aggregate state from the event log / replaying events as commands | an event referencing an absent aggregate yields `event-record-only`/`missing-source`, never synthesized state; candidate detection is a pure events→targets map that executes nothing (Impl 012 empty-repo + candidate tests) |
| 35 | A reprojection run promoting freshness / strengthening voice / overwriting a stored view / emitting an output | recompute may only re-derive the same-or-more-cautious view (stale→ceiling lowered, never raised); drift is reported (`changed`), never overwritten; no `TerminalOutput`/`SupportQuality` rewrite/`Purpose` overwrite/`DomainEventRecord` is produced (Impl 012 drift + ceiling + negative tests) |
| 36 | A production `reprojection` module / scheduler / event sourcing / projection repository leaking in | the harness lives under `__tests__/`; structural guard asserts no `src/modules/{reprojection,projection,scheduler,event-sourcing}` and no scheduler/bus/DB/serialization token; no domain module imports the harness (Impl 012 structural guards) |
| 37 | Manual input becoming meaning / a `Signal` / inferred state at ingestion | the adapter's only output is an `ObservationSet` built via `recordObservationSet`; it never calls `detectSignals`; subjective words are verbatim; no readiness/fatigue/impact/capacity field; negative tests assert no Signal/Evidence/Hypothesis/Understanding/DecisionSupport (Impl 013) |
| 38 | The adapter inventing a value / silently interpreting ambiguity / losing rejected input | missing data is an explicit `missing-data` observation (never invented); ambiguity → a limitation or rejection; rejection saves nothing (a throwing `save` is never reached) (Impl 013 partial/rejection tests) |
| 39 | `observation` coupling to `event-recording` or a downstream module / the adapter mutating athlete records | the adapter imports only `observation` + `shared-kernel`; structural guard asserts `observation` imports no `event-recording`/`reasoning`/`understanding`/`decision-support`/`athlete`; an athlete-decision report is observation-only (no `AthleteDecisionRecord` write); the optional `ObservationSetRecorded` is harness-composed, ref-only (Impl 013 boundary + neutral-integration tests) |

---

## 5. End-to-End Reflection Proof (Implementation 006)

[FACT] The integration test (`src/modules/__tests__/end-to-end-responsible-reflection.test.ts`) runs a synthetic scenario ("I felt unusually heavy": an elevated HR measurement + a subjective report + a missing power datum) through all four modules and asserts the terminal output is `DecisionSupport` with `VoiceMode = Reflection`.

[FACT] **Why the first full output is `Reflection` — by the modules' own logic, not by force:**
1. A single **`supported`** outcome is first contact: `applyOutcome` sets `level = higherOf("Unknown","Working") = Working`; with one distinct condition (`< 2`) it does not reach `Trusted`/`Mature`.
2. `deriveSafeVoiceCeiling(Working, low fragility, fresh)` = **`tentative`**.
3. `maxVoiceForCeiling("tentative")` = **`Reflection`**.
4. **Complete traceability is not enough for Recommendation** — the Recommendation guard also requires a `confident` ceiling.
5. **Clean gates do not override the understanding ceiling** — all five gates pass, yet the ceiling still caps the voice at Reflection.

[FACT] The proof also asserts the chain's honesty: the quality limitation survives as an auditable `SignalRejection`; traceability resolves back to the `ObservationSet`; agency is preserved; and no `AthleteDecision` is owned.

> [ASSUMPTION] **Aurora can complete the reasoning chain and still refuse to overreach.**

---

## 6. What Does Not Exist Yet

[FACT] Aurora does **not** yet have, and this is by design at this stage:

| Absent | Intentional? | Note |
|---|---|---|
| **Full** `athlete` aggregate | **Intentional** | A thin **Purpose-first** `athlete` module now exists (Impl 007); state/capacity/constraints/path-memory/identity-detail/reports are still absent. |
| Real `Purpose` source | **Implemented (Impl 007)** | Now a real, athlete-owned, versioned, append-only source; reaches `decision-support` as `PurposeContext` via a neutral adapter. The decision-support `PurposeContext` *placeholder* is **partly retired** (§7). |
| Real `Constraints` source | **Intentional** | Belongs to a future `athlete` slice (not in the Purpose-first slice). |
| Inferred athlete state / capacity / readiness / fatigue | **Intentional** | Never implemented; `athlete` owns the *given*, never the *inferred*. |
| Real `RiskAssessment` source | **Intentional** | Provided as input placeholder; no diagnostic engine. |
| **Manual input boundary (real "data in")** | **Implemented (Impl 013)** | An `observation`-owned Manual Input Adapter records manual input faithfully as an `ObservationSet` (provenance/source/quality preserved; verbatim words; explicit missing data; rejection/partial outcomes), persisted via the repository port — no interpretation. |
| UI / API / external ingestion entrypoint | **Intentional** | The adapter is an in-process boundary; how input is *collected* (UI) or *submitted* (API), auth, and external/FIT/wearable import remain future. |
| Garmin/FIT importer | **Intentional** | First real input is the **manual adapter** (Impl 013); device/FIT adapters are a later spec, behind the same `ObservationSet` entry point. |
| **Repository ports + in-memory persistence** | **Implemented (Impl 010)** | Validated `toState()`/`reconstitute()` + ports + in-memory adapters for the six boundaries; round-trip preserves invariants/traceability/freshness/history. |
| Production DB / ORM / schema / migrations | **Intentional** | Persistence is **ports + in-memory only**; no technology chosen. The domain's `toState()` drives the (future) store, never the reverse. |
| Cache | **Intentional** | Projections recompute; no cache layer. |
| Projection **freshness** on `UnderstandingAssessment` | **Implemented (Impl 008)** | Explicit `current`/`stale`/`partial`/`invalid`/`unknown` + `derivedAt` + source refs; non-current only lowers the voice (invalid/unknown → ceiling `none`), via the existing ceiling. |
| Generic projection **engine** / top-level `projection` module | **Intentional** | Freshness is local to `understanding` for the one concrete projection; a shared kernel/engine waits for a second projection (`ImpactAssessment`). |
| `ImpactAssessment` (second projection) | **Intentional** | Not introduced; Spec 008 governs *how any projection behaves*, not which exist. |
| **Domain event/outcome records + traceability envelope** | **Implemented (Impl 011)** | The `event-recording` module records *what happened* — append-only, ref-only `DomainEventRecord` (occurrence/outcome) over a closed catalog, with a `TraceabilityEnvelope` + in-memory log/repository. Complements aggregate repositories; does not replace them. |
| Event bus / publish-subscribe / handlers / async delivery | **Intentional** | Records are stored, never delivered or executed. `PurposeChanged`/refresh triggers and event records are values, not bus messages; there is no runtime bus, subscriber, or handler. |
| Event sourcing / production event store / serialization format | **Intentional** | The log records occurrences; aggregates rebuild via `reconstitute`, not by replaying the log. No event-sourcing rebuild path, production store, or serialization tech is chosen. |
| **Reprojection (recompute-and-compare)** | **Implemented (Impl 012)** | A **neutral, check-only** harness (`__tests__/reprojection-harness/`, **not a production module**) recomputes `UnderstandingAssessment`, recalculates freshness, detects candidates from event records, and reports drift/findings — mutating nothing. |
| Production `reprojection` module / scheduler / projection repository / production service | **Intentional** | Reprojection is proven as a check-only harness; a production recompute *service*, a scheduler/background refresh, a projection store, and an orchestration layer are deferred (each behind the same contracts when specified). |
| UI | **Intentional** | No rendering; outputs are domain values, not copy. |
| API | **Intentional** | No external entrypoint boundary specified yet. |
| LLM rendering boundary | **Intentional** | Deliberately absent so generated text never becomes domain truth. |
| Notification layer | **Intentional** | Delivery is out of scope. |
| `AthleteDecision` feedback loop | **Implemented (Impl 009)** | Athlete-owned, append-only `AthleteDecision` in `athlete`; referenced (not owned) by the case; re-enters as `SubjectiveObservation`. The `AthleteDecisionRef` placeholder is **retired**. |
| Full `DecisionOutcome` object / pattern engine | **Intentional** | Only `DecisionOutcomeRef` exists; outcome modeling and decision-pattern→hypothesis inference are deferred. |
| Compliance / obedience / outcome-based validation | **Intentional (forbidden)** | No score is produced; the outcome never grades `SupportQuality`. |
| Training-plan generator | **Intentional** | Explicitly forbidden at this stage. |
| Real-world ingestion adapter | **Intentional** | Synthetic fixture only. |

[ASSUMPTION] None of the above is a failure. Each was excluded so the core's invariants could be proven *before* the surfaces most likely to erode them are introduced.

---

## 7. Known Placeholders / Adapters

[FACT] Current placeholders and adapters, each with why it exists, what it protects, and its eventual replacement.

| Placeholder / adapter | Why it exists | What it protects | Future replacement |
|---|---|---|---|
| `ReasoningOutcome` adapter (`reasoningOutcomeFrom`, local to `understanding`) | Lets understanding consume reasoning **outcomes** without importing reasoning internals (type-only import) | Keeps claim confidence + raw evidence out of understanding; "understanding earned from tested outcomes" | Stable cross-module outcome contract / event when an event surface lands |
| `PurposeContext` placeholder (input to `decision-support`) | **Partly retired (Impl 007).** A real, versioned purpose now exists in `athlete`; the decision-support input is still a passed-in `PurposeContext` value (no `decision-support`→`athlete` import) | Lets `PurposeGate` run without `decision-support` importing/owning purpose | A production coordinator that snapshots current purpose into `PurposeContext` (the harness adapter is the current seam) |
| `RiskAssessment` placeholder (input to `decision-support`) | No diagnostic/risk engine yet | Lets `RiskGate` run (caution-only) without inventing risk inside the case | Real risk assessment service, still caution-only |
| `AthleteDecisionRef` (field on `DecisionSupportCase`) | **Retired as a placeholder (Impl 009).** It now references a real, athlete-owned `AthleteDecision` in `athlete` | Keeps the decision **referenced, never owned**; `SupportQuality` ≠ outcome | — (the loop is built; production persistence/event surface is the remaining piece) |
| `DecisionOutcomeRef` (reference only, Impl 009) | The outcome is later/separate; a full `DecisionOutcome` object is deferred | Keeps outcome distinct from the decision; outcome never grades support | A specialized `DecisionOutcome`/observation type when outcome modeling is specified |
| Decision harness adapters (`src/modules/__tests__/decision-observation-adapter.ts`) | Converting `AthleteDecision` → `SubjectiveObservation` / adapting the ref needs `observation`/`decision-support`; `athlete` must not import them | Keeps `athlete` a pure upstream leaf; re-entry is observation-only (Impl 006 precedent) | A production application service when a real entrypoint is specified |
| Purpose harness adapters (`src/modules/__tests__/purpose-adapters.ts`) | Converting purpose → `PurposeContext` / applying `PurposeChanged` → `markUnderstandingStale` requires importing downstream; `athlete` must not | Keeps `athlete` a pure upstream leaf; coordination lives outside it (Impl 006 precedent) | A production application service when a real entrypoint is specified |
| `ProjectionRefreshPolicy` applied via harness/caller (Impl 008) | Refresh has no scheduler/event surface yet; the policy is a pure decision | Keeps refresh deterministic and selective without infrastructure; `understanding` owns freshness, the caller applies triggers | An event-driven/maintained refresh when the event surface + persistence land |
| `PurposeReinterpretationStatus` / result (type only) | The reinterpretation *engine* is deferred | Gives a stable shape for future reinterpretation without deciding statuses now | A reinterpretation pipeline once reasoning is purpose-version-aware |
| In-memory repositories (Impl 010, module-local `application/`) | Persistence proven without a DB; the in-memory adapter is the test double for each port | Proves round-trip safety + invariant preservation with no technology committed | A real adapter behind the **same port** when a DB/persistence requirement is specified |
| `<Aggregate>State` types + `reconstitute()` (Impl 010) | Validated rebirth path (constructors/`toProps()` are private); persistence shape is an adapter contract | Keeps rehydration validating, never a raw field bag; keeps state out of the primary public domain API | Possibly a versioned `<Aggregate>State` (`schemaVersion`) at the first real serialization |
| Synthetic end-to-end fixture (`__tests__`) | The e2e composition proof must be deterministic | Proves composition + restraint without committing to an input format | **Partly retired (Impl 013):** a real **manual** ingestion boundary now exists; the synthetic fixture remains the deterministic e2e driver until a real entrypoint is specified |
| Manual Input Adapter (Impl 013, `observation/application/manual-input-*`) | First real "data in" must be proven *before* any UI/API/parser is built on top | Keeps ingestion a faithful scribe — records source material, never meaning; persists via the port; imports no downstream module or `event-recording` | A production entrypoint (UI/API) and external (FIT/wearable) adapters that submit to the same `ObservationSet` boundary |
| Reprojection harness (Impl 012, `__tests__/reprojection-harness/`) | Reprojection must be proven *before* any production recompute service/scheduler is specified; it crosses repositories/events/modules and no production application layer exists | Keeps reprojection a check-only safety mechanism — recompute-and-report, no mutation — without implying a scheduler/projection-engine/service | A production orchestration/application layer that promotes the harness concepts behind unchanged contracts when a real entrypoint is specified |
| No production orchestration service (test harness is the seam) | No external entrypoint boundary specified | Avoids implying a use-case boundary; keeps invariants inside aggregates | A production application service when a real entrypoint is specified |

[FACT] **`reasoning` already carries `Hypothesis.purposeContextRef`** (a string slot), so a `PurposeVersionRef` flows in with no reasoning refactor — but **reasoning is not yet purpose-version-aware** (it stores the handle opaquely; it does not reinterpret past hypotheses on a purpose change). That deeper integration is a later spec.

---

## 8. Boundary Rules Going Forward

[DECISION] Future work must preserve these (consolidated from the Boundary Map and the domain index):

1. **`observation` remains upstream** — it imports only `shared-kernel`; it never learns about signals-as-meaning, hypotheses, or voice.
2. **`reasoning` may depend on `observation`, not vice versa** — reasoning consumes signals; observation never imports reasoning.
3. **`understanding` consumes reasoning *outcomes*, not raw `Signal`s** — only via the `ReasoningOutcome` adapter; never reads claim confidence or raw evidence.
4. **`decision-support` consumes `reasoning` and `understanding`, not vice versa** — the upstream modules must never import `decision-support`.
5. **`athlete` is the upstream context of meaning** — it imports only `shared-kernel` and must never import `observation`/`reasoning`/`understanding`/`decision-support` (the *given* must not depend on the *inferred*). Purpose reaches downstream only through neutral adapters/inputs, never by `athlete` reaching out.
6. **`Athlete` must not own inferred state or capacity** — those remain projections (defeasible, traceable), never authoritative attributes; the slice holds only the *given* (declared, versioned purpose; athlete-recorded decisions).
7. **A purpose change never rewrites the past** — `PurposeHistory` is append-only; prior reasoning is never edited/auto-falsified; understanding is staled *selectively* through a coordinator, never reset globally, and never mutated by `athlete` directly.
7b. **The athlete owns the decision; Aurora references and learns, never grades (Impl 009)** — `AthleteDecision` is athlete-owned and append-only; `decision-support` records only an `AthleteDecisionRef`; the decision re-enters **only as `Observation`** (then the full ladder), never as Evidence/Understanding directly; **no compliance/obedience scoring**, and the outcome never grades `SupportQuality`.
8. **UI / LLM must not become domain authority** — generated text is a rendering of domain values, never their source of truth.
9. **Persistence must not turn projections into facts** — a stored `CurrentState`/`UnderstandingLevel` must keep its staleness/confidence; never a plain attribute.
10. **A projection is a derived view, never a source of truth (Impl 008)** — it carries explicit freshness + source references; non-current freshness can only *lower* downstream assertiveness; refresh *recomputes* (never edits the old view); a trigger stales *selectively*, never globally. Consumers honor freshness through the owning module's output (e.g. the clamped `safeVoiceCeiling`), not by owning refresh.
11. **No production service may bypass aggregates or gates** — application services *coordinate, never reason*; a voice/level/verdict is produced only inside its owning module. (Boundary Map's named "most dangerous shortcut.")
12. **Persistence preserves the model; it never becomes the model (Impl 010)** — repositories `save`/`findById` only; rehydration goes through a **validating `reconstitute()`** (never a raw field bag); they store **state copies, not live references**; they **create no domain meaning**; the **domain's `toState()` drives the store, never the reverse**; and a repository **never owns** what its aggregate only references (e.g. a `DecisionSupportCase` repo never persists an `AthleteDecision` object).
13. **Event records remember what happened; they never command it (Impl 011)** — a `DomainEventRecord` is **append-only, ref-only, and inert**: it is **not** a command/aggregate/projection/source-truth, payloads carry **refs not copied state**, appending **executes nothing**, and **causation/correlation are lineage/grouping, never an execution chain**. The log **complements, never replaces**, the aggregate repositories; **`event-recording` imports only `shared-kernel`**, **no domain module imports it**, the **catalog stays out of `shared-kernel`**, and there is **no event bus / publish-subscribe / handler / async delivery / event sourcing / serialization tech**.
14. **Reprojection recomputes and verifies; it never mutates, executes, or asserts truth (Impl 012)** — a run is **check-only**: it recomputes derived views *only through the owning module's functions*, **recalculates** freshness (re-deriving only the same-or-more-cautious view — never promotes), reads **event records as candidates/context only** (never replayed/executed; never rebuilds an aggregate from the log), and **reports drift** instead of overwriting. It **mutates no repository**, creates **no** `TerminalOutput`/recommendation/`SupportQuality` rewrite/`Purpose` overwrite/`DomainEventRecord`, and stays a **neutral test-support seam** — **no production `reprojection` module, scheduler, event sourcing, projection repository, or service layer**, and **no domain module imports it**.
15. **Ingestion records source material; it never interprets (Impl 013)** — the Manual Input Adapter lives in `observation/application`; its **only output is an `ObservationSet`** (via `recordObservationSet`, persisted through `ObservationSetRepository`); it preserves **verbatim words / explicit missing data / provenance (`source: "manual"`) / quality**, **rejects** the unrepresentable (saving nothing), and **partially accepts** only faithful entries. It **detects no `Signal`**, **infers no state**, **invents no value**, **mutates no `AthleteDecisionRecord`**, **scores no compliance**, and **imports no downstream module or `event-recording`** — `observation` stays `event-recording`-free, and any `ObservationSetRecorded` is harness-composed, ref-only, and inert. **Manual input is source material, never meaning.**

---

## 9. Next Responsible Missions

[ASSUMPTION] Ranked. Each names why it matters, what it must **not** do, and what it depends on.

0. **✅ Spec 007 — Athlete Purpose Change and Reasoning Reinterpretation — DONE (Impl 007).**
   - *Delivered:* a thin, Purpose-first `athlete` module (declared, versioned, append-only purpose; `PurposeChanged`; `PurposeVersionRef`); purpose flows to `decision-support`/`understanding` via neutral adapters; selective staleness; no reasoning rewrite.
   - *Deferred (carried forward):* reasoning becoming **purpose-version-aware** and the **reinterpretation engine** (status type ships, engine does not); the **full** `athlete` aggregate (state/capacity/constraints/path-memory).

0b. **✅ Spec 008 — Projection Refresh and Staleness Strategy — DONE (Impl 008).**
   - *Delivered:* explicit `ProjectionFreshness` (5 states) + `derivedAt` + source refs on `UnderstandingAssessment`; a pure, selective, conservative `ProjectionRefreshPolicy`; non-current freshness only lowers the ceiling (invalid/unknown → `none` → Withholding); `decision-support` unchanged.
   - *Deferred (carried forward):* a generic projection kernel/engine; `ImpactAssessment` as a second projection; event-driven/persisted refresh; `Inquiry`-on-unknown (currently Withholding).

0c. **✅ Spec 009 — AthleteDecision Feedback Loop — DONE (Impl 009).**
   - *Delivered:* athlete-owned, append-only `AthleteDecision` in `athlete` (choice/rationale/context/source; amend-supersede); `DecisionSupportCase` references only an `AthleteDecisionRef`; re-entry as `SubjectiveObservation` via a neutral adapter; no compliance/obedience scoring; outcome never grades `SupportQuality`. The `AthleteDecisionRef` placeholder is retired.
   - *Deferred (carried forward):* a full `DecisionOutcome` object; a decision-pattern→hypothesis engine; a feedback/interaction bounded context if interaction history grows.

0d. **✅ Implementation Architecture — Persistence and Event Surface — DONE (paper).** Defines persistence/event-surface boundaries (ports, append-only ref-only events, projections-as-caches, traceability handles); chooses no technology.

0e. **✅ Spec 010 — Persistence Ports and In-Memory Repositories — DONE (Impl 010).**
   - *Delivered:* validated `toState()`/`reconstitute()` + module-owned ports + in-memory adapters for the six boundaries; round-trip preserves invariants/traceability/freshness/append-only history; mutation isolation; invalid-state rejection; no technology chosen.
   - *Deferred (carried forward):* domain **event/outcome records** + traceability envelope (Spec 011); reprojection harness; production DB/event-bus/persistence backend.

0f. **✅ Spec 011 — Domain Event/Outcome Records and Traceability Envelope — DONE (Impl 011).**
   - *Delivered:* a dependency-neutral `event-recording` module — one append-only, ref-only `DomainEventRecord` (occurrence/outcome) over a closed 26-type catalog, a reusable `TraceabilityEnvelope`, an append-only in-memory log + repository port + adapter; catalog-driven validation on construct *and* reconstitute; causation/correlation as lineage/grouping; imports only `shared-kernel`; no domain module imports it.
   - *Deferred (carried forward):* the **reprojection harness** (Spec 012); a **projection repository**; an **event bus / production event store / serialization format**; whether **event sourcing** is ever appropriate.

0g. **✅ Spec 012 — Reprojection Harness — DONE (Impl 012).**
   - *Delivered:* a neutral, check-only recompute-and-compare harness (`__tests__/reprojection-harness/`) that recomputes `UnderstandingAssessment` via the owning module, recalculates freshness, detects candidates from event records (context only), and reports drift/findings — mutating nothing, rebuilding nothing from the log, promoting no freshness, creating no output. Reserved modes throw.
   - *Deferred (carried forward):* a **production recompute service / orchestration layer**, a **scheduler / event-driven refresh**, a **projection repository**, `ImpactAssessment` as a second projection, and any `refresh-derived`/`mark-stale` write path.

0h. **✅ Spec 013 — Manual Input Adapter — DONE (Impl 013).**
   - *Delivered:* an `observation`-owned Manual Input Adapter (`ingestManualInput`) that records manual input faithfully as an `ObservationSet` (verbatim words, explicit missing data, provenance `source: "manual"`, quality), persists via `ObservationSetRepository`, and returns accept/partial/reject — detecting no `Signal`, inferring nothing, mutating no athlete record, importing no downstream module or `event-recording`.
   - *Deferred (carried forward):* a **UI/API entrypoint** that collects/submits input; **auth/source identity**; **external (FIT/wearable) ingestion**; richer measured-value/unit handling; duplicate detection.

1. **Spec 014 — LLM Rendering Boundary** *(recommended next)*
   - *Why:* defines how a generated *rendering* of a terminal output is produced **downstream of the domain**, with the domain value as the source of truth — the last major boundary before any user-facing surface.
   - *Must not:* let generated text become domain authority; derive voice from the renderer; bypass the gates/freshness; read or invent anything the domain value didn't carry.
   - *Depends on:* `decision-support` (done); a strict read-only contract over terminal outputs.

2. **Reasoning Purpose-Version Awareness & Reinterpretation Engine** *(the deferred half of Spec 007)*
   - *Why:* Impl 007 ships `PurposeVersionRef` and the reinterpretation *status type* but not the engine; this makes reasoning version-aware and produces real reinterpretation verdicts on a purpose change. It can reuse the Impl 008 freshness/refresh machinery (a purpose change is a `RefreshTrigger`).
   - *Must not:* rewrite or auto-falsify prior hypotheses — reinterpretation is a new, traceable artifact.
   - *Depends on:* `athlete` (Purpose, done) + `reasoning` (done) + projection freshness (done).

3. **Production Reprojection / Refresh layer** *(the deferred half of Spec 012)*
   - *Why:* Impl 012 proved reprojection as a check-only harness; a production recompute *service* (and, later, a scheduler / event-driven refresh and a projection repository) would promote those concepts behind unchanged contracts once a real entrypoint exists.
   - *Must not:* become event sourcing; introduce a write path that bypasses the understanding transition policy; promote freshness or strengthen voice.
   - *Depends on:* Specs 010–012; a real production orchestration boundary.

[DECISION] **Recommended next mission: Spec 014 — LLM Rendering Boundary.** With *real data in* now proven (Impl 013) and the full pipeline round-trippable/recordable/recompute-verified (Impl 010–012), the remaining major boundary is *output out*: how a generated rendering of a terminal output is produced **downstream of the domain**, with the domain value as the source of truth — so generated text can never become domain authority, derive voice, or bypass the gates/freshness. (An explicitly chosen alternative next slice is fine; this is the boundary the core was built to make safe before a surface gets a mouth.)

---

## 10. Final Assessment

[ASSUMPTION] **What has Aurora proven?**
That the reasoning core can run **end-to-end with restraint**: raw observations become signals without becoming meaning, signals become evidence only inside falsifiable hypotheses, tested outcomes earn dimension-specific understanding without repetition or confidence leaking in, and a gated decision-support case turns all of it into a *modest, traceable, agency-preserving* `Reflection` — refusing to recommend even when the chain is complete and the gates are clean. The dangerous collapses (data→meaning, inference→attribute, claim-strength→voice) are unrepresentable, defended by negative-capability and boundary tests.

[ASSUMPTION] **What has Aurora not proven yet?**
Anything involving **a user-facing surface, durable storage, transport, and production recomputation**: a **rendering/LLM boundary** (output out), a **UI/API entrypoint** and **external (FIT/wearable) ingestion**, a **production** persistence backend / event store, a production orchestration entrypoint, the **full** `athlete` model (state/capacity/constraints/path-memory), risk from real data, reasoning that is **purpose-version-aware** with a reinterpretation engine, a **generic projection engine** (`ImpactAssessment`, event-driven/persisted refresh), a **full `DecisionOutcome` / decision-pattern engine**, and a **production reprojection service / scheduler / projection repository**. Purpose **is** a real, versioned upstream source (Impl 007), **projection freshness is explicit** (Impl 008), the **decision feedback loop is built** (Impl 009), **aggregates now round-trip through validated ports + in-memory repositories** (Impl 010), **occurrences are now recorded as an append-only, ref-only event/outcome log** (Impl 011), **derived state can now be recomputed and verified by a neutral check-only harness** (Impl 012), and **real manual data now enters as faithful `ObservationSet`s through an observation-owned adapter** (Impl 013) — all with **no technology chosen**. The linear path is proven, **three domain loops are exercised** (purpose-change staleness, projection freshness/refresh, decision feedback — all no-rewrite), **persistence is proven safe in-memory**, **the event surface is realized as inert, ref-only records**, **reprojection is proven to recompute-and-verify without mutating, executing, or asserting truth**, and **the first real ingress records source material without interpreting it**; the remaining work (a rendering boundary, a production entrypoint/transport/storage backend, deep purpose reinterpretation, and learning *over time*) is specified or scoped but not yet built.

[ASSUMPTION] **What is the most dangerous next shortcut?**
**Adding UI / LLM / advice-rendering before purpose, persistence, and the feedback boundaries are specified.** A rendering or recommendation surface introduced now would be the fastest way to let generated text become domain truth, derive voice from convenience instead of gates, and reintroduce the exact collapses the core was built to prevent — and it would not look wrong from the inside. The discipline that produced restraint by construction must hold precisely when a demo-able surface becomes tempting: **build the loops and the boundaries before the voice has a mouth.**

---

## Validation

[FACT] Run at the time of writing, with no implementation modified:
- `npm run typecheck` (`tsc --noEmit`) — **clean**.
- `npm test` (`node --test "src/**/*.test.ts"`) — **317 / 317 pass**, 0 fail (was 145 at the 006 baseline; +30 for Impl 007, +21 for Impl 008, +16 for Impl 009, +23 for Impl 010, +40 for Impl 011, +20 for Impl 012, +22 for Impl 013), including all module/negative/boundary tests, the Implementation 006 end-to-end Reflection proof, and the Impl 007/008/009/010/011/012/013 purpose + projection-freshness + decision-feedback + persistence-round-trip + event-record + reprojection-harness + manual-input tests.

---

## Success Criterion

> **"What is closed, what is still deliberately absent, and what must future work not collapse?"**

[ASSUMPTION] Answerable from this page: **closed** — the five-stage reasoning core (§2–3) with thirty-nine structural guarantees (§4), an end-to-end Reflection proof (§5), a **Purpose `athlete`** module (Impl 007), **explicit projection freshness** on `UnderstandingAssessment` (Impl 008), the **AthleteDecision feedback loop** (Impl 009), **validated persistence ports + in-memory repositories** (Impl 010) so every aggregate round-trips without corruption, a **dependency-neutral append-only, ref-only event/outcome record log** (Impl 011) that records *what happened*, a **neutral check-only reprojection harness** (Impl 012) that recomputes-and-verifies derived views without mutating, executing, or asserting truth, and a **real `observation`-owned Manual Input Adapter** (Impl 013) that records manual data faithfully as `ObservationSet`s; **deliberately absent** — a **rendering/LLM boundary**, a **UI/API entrypoint** and external (FIT/wearable) ingestion, a **production** persistence/event-store backend (DB/ORM/schema/migrations/serialization), a production service / reprojection service / scheduler / projection repository, the **full** `athlete` model (state/capacity/constraints/path-memory), a reinterpretation engine, a **generic projection engine**/`ImpactAssessment`, a **full `DecisionOutcome`/pattern engine**, and **event sourcing**, each a placeholder or intentional gap (§6–7); **must not collapse** — observation into meaning, inference into attribute, claim-strength into voice, the upstream→downstream dependency direction, **purpose's past into its present** (declared ≠ inferred; append-only; no rewrite), **a projection into a source of truth** (freshness explicit; non-current only constrains; refresh recomputes), **the athlete's decision into Aurora's verdict** (referenced not owned; Observation-only re-entry; no obedience/outcome grading), **the persistence shape into the domain** (validated reconstitution; state copies not live refs; the store preserves the model, never becomes it), **an event record into a command, copy, projection, or source truth** (append-only; ref-only; inert; complements repositories, never replaces them), **reprojection into event sourcing, a write path, or a way to make a projection true** (check-only; recompute-and-report; mutates nothing; rebuilds nothing from the log), and **manual input into meaning** (faithful `ObservationSet`; verbatim words; explicit missing data; rejects the unrepresentable; detects no signal; infers nothing) (§4, §8). The core is complete and restrained — purpose real, freshness explicit, the decision loop closed, persistence proven safe in-memory, occurrences recorded as an inert ref-only log, reprojection proven to recompute-and-verify without mutation, and the first real data entering as source material without interpretation; what remains is a rendering boundary, a production entrypoint/transport/storage backend, the deeper loops, and learning over time — to be added without eroding any of the above.

---

*This is the first Review / Consolidation paper after the reasoning core was completed in code. It summarizes Implementations 001–006 and is **updated for Implementation 007 (Purpose-first `athlete`), 008 (projection freshness), 009 (AthleteDecision feedback), 010 (persistence ports + in-memory repositories), 011 (domain event/outcome records + traceability envelope), 012 (check-only reprojection harness), and 013 (manual input adapter)**; it makes no new domain or architectural decisions and modifies no module.*

*Inputs: [Foundation Index](../README.md) · [Domain Modeling Index](../domain-modeling/README.md) · [Technical Boundary Map](./TECHNICAL_BOUNDARY_MAP.md) · [System Map](../diagrams/SYSTEM_MAP.md) · [Spec 001](../specs/001-observation-set-intake.md) · [Spec 002](../specs/002-signal-detection.md) · [Spec 003](../specs/003-hypothesis-lifecycle.md) · [Spec 004](../specs/004-understanding-update.md) · [Spec 005](../specs/005-decision-support-voice.md) · [Spec 006](../specs/006-end-to-end-responsible-reflection.md)*
