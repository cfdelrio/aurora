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

> **Implementation status (post Impl 026).** **Eight parts of this paper are now realized** (Impl 020–023 add no persistence; **Impl 024 additively extends the realized event surface — §1.5/§4 — and adds no persistence**: the event factories *return* records and persist nothing; **Impl 025 adds no persistence infrastructure either** — the new `application-orchestration` module owns **no repository** and **composes the existing persistence steps explicitly** where selected; **Impl 026 adds no persistence either** — the new `rendering/application` `liveProviderSmoke` helper owns **no repository**, calls **no** rendered-message-record / review / display / delivery / event repository, and **returns a redacted result only**).
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
> is composed only in a neutral harness from a **ref-only** candidate.
> **(5) Impl 014** added the first **output-out** boundary — a **deterministic `rendering` module** that turns
> a domain-approved `TerminalOutput` into human-facing text **downstream of the domain**: a `RenderableDomainOutput`
> (read-only projection), a deterministic **fake renderer** (no provider), and a **mandatory validator** that
> preserves voice/uncertainty/limitations/freshness/traceability/agency and refuses any draft that escalates
> voice, strengthens a claim, hides uncertainty, or invents a fact/citation (safe non-render on failure). It
> writes no event and mutates no aggregate; it imports only `shared-kernel` + read-only `decision-support` types.
> **(6) Impl 015** added a **rendered-message record/review repository** — **inside `rendering`** (not a new
> module): an **append-only `RenderedMessageRecord`** (auditable presentation artifact, source-domain-output ref
> preserved), an **append-only `RenderReview`** history (display-safety only) with **derived** current status and
> **derived `DisplayEligibility`**, behind a **repository port + in-memory adapter** (deep-copy round-trip,
> mutation isolation, validated reconstitution). Persistence is **auditability, not authority**: a record is not
> source truth / `Evidence` / `Observation` / `Understanding` / `DecisionSupport` / `AthleteDecision`; approval
> changes no domain (voice/traceability/freshness/`SupportQuality`); rejection invalidates nothing; failed
> attempts are auditable but never display-eligible; a **`RenderedMessageRecord` is not an event record** —
> **`rendering` imports no `event-recording`** and **auto-emits nothing** (Impl 024 later added a ref-only
> `RenderedMessageRecorded`/`RenderReviewRecorded` event type that may *reference* such a record by id, but
> `rendering` neither imports `event-recording` nor emits one); nothing triggers delivery.
> **(7) Impl 016** added a **delivery audit repository** — a **new downstream `delivery` module** that
> **exposes** a *display-eligible* `RenderedMessageRecord` to a **deterministic test-only sink** and records
> the attempt as an **auditable `DeliveryRecord`** behind a **repository port + in-memory adapter** (deep-copy
> round-trip, mutation isolation, validated reconstitution). Delivery **verifies** eligibility by calling
> `rendering`'s `displayEligibilityOf(record)` — it does **not** re-derive or reinterpret it — and the sink is
> called **only** when the record is eligible *and* the target is the supported `test-sink`; ineligible
> (not-reviewed / rejected / superseded / failed-render / missing-ref) requests and unsupported targets are
> **blocked** without calling the sink. Persistence is **auditability, not authority**: a `DeliveryRecord` is
> not source truth / `Evidence` / `Observation` / `Understanding` / `DecisionSupport` / `AthleteDecision`;
> **delivery success is not evidence** and **delivery failure is not domain invalidation**; delivery **mutates
> no rendered-message record and no domain aggregate** and **triggers no reasoning/reprojection/retry**. A
> **`DeliveryRecord` is not an event record** — **`delivery` imports no `event-recording`** and **auto-emits
> nothing** (Impl 024 later added ref-only `DeliveryRequestRecorded`/`DeliveryOutcomeRecorded` event types that
> may *reference* such a record by id, but `delivery` neither imports `event-recording` nor emits one).
> **(Impl 017 — provider adapter seam; no persistence change.)** Impl 017 added a **provider adapter seam
> inside `rendering`** (a deterministic **fake provider** behind the unchanged mandatory `validateDraft`): a
> provider produces an **untrusted `ProviderDraft`**, and a `RenderedMessage` exists **only** if that draft
> passes `validateDraft`. This slice **adds no persistence**: **provider drafts are not persisted** (they are
> not source truth and not event records), **only validated `RenderedMessage`s** may *later* be persisted as
> rendered-message records (Impl 015), and provider success/failure **triggers no review / display-eligibility /
> delivery / event / domain mutation**.
> **(8) Impl 018** added a **provider-attempt audit repository** — **inside `rendering`** (not a new module):
> an append-only **`ProviderAttemptRecord`** built by **observing** a `ProviderRenderOutcome` (Impl 017),
> behind a **`ProviderAttemptRecordRepository` port + in-memory adapter** (deep-copy round-trip, mutation
> isolation, validated reconstitution). It records a **safe summary** — status (`validation-passed`/
> `validation-failed`/`provider-failed`/`unsafe-request-blocked`) + reasons (reusing the real `ProviderFailure`
> + `RenderingFailure` catalogs) — and **retains no raw draft** (`rawDraftRetained` is literal `false`;
> reconstitution rejects raw draft/text/content/prompt fields). **Provider-attempt persistence is
> auditability, not source truth**: a record is not a `ProviderDraft`/`RenderedMessage`/`RenderedMessageRecord`
> /`Evidence`/`Observation`/`Understanding`/`DecisionSupport`/`AthleteDecision`; the audit **observes** the
> outcome and **does not call** the provider/`requestProviderRendering`/`validateDraft`; a **validation failure
> is not domain invalidation**; and recording **triggers no review / display-eligibility / delivery / event /
> retry / reprojection / reasoning / domain mutation**. A **`ProviderAttemptRecord` is not an event record** —
> the audit **imports no `event-recording`** and **auto-emits nothing** (Impl 024 later added a ref-only
> `ProviderAttemptRecorded` event type that may *reference* the audit record by id, but the audit neither
> imports `event-recording` nor emits one); **only validated `RenderedMessage`s** may *later* be persisted as
> rendered-message records (Impl 015).
> **(Impl 019 — real-provider-ready boundary; no persistence change.)** Impl 019 added a **real-provider-*ready***
> async client boundary **inside `rendering`** — an async `ProviderClientBoundary` + a deterministic **fake
> in-process client**, `ProviderSecretRef` (operational refs), structured `ProviderInstruction`, and a
> `ProviderOperationalFailure` catalog mapped **down** to the existing `ProviderFailure`. This slice **adds no
> persistence**: the async `requestRealProviderRendering` reuses the unchanged `providerRenderingRequestFrom`
> guard + the mandatory `validateDraft` and returns the existing `ProviderRenderOutcome` (so the Impl 018
> raw-free audit observes it unchanged, by **explicit composition** — **no automatic provider-attempt
> persistence**). **No provider response is persisted raw**; **secret refs are not secrets and are not
> persisted as domain data** (no raw secret in records/responses/errors; no `process.env`); **provider
> operational metadata is not evidence**; and the real-provider-ready path **triggers no review /
> display-eligibility / delivery / event / retry / reprojection / reasoning / domain mutation**. A **real
> SDK/API/network/secret mechanism, production prompt templates, and provider events remain future.**
> **(Impl 020 — concrete-provider adapter shell; no persistence change.)** Impl 020 added the first
> **selected-provider adapter shell** **inside `rendering/application`** behind the Impl 019 async
> `ProviderClientBoundary` — a **disabled-by-default `ConcreteProviderClient`** + pure
> `serializeProviderInstruction` / `parseProviderResponse` / `mapProviderError`. The provider target (**OpenAI**)
> is selected at the **doc/decision level (020A) only**; code stays **vendor-neutral** (`concrete-provider-*`).
> This slice **adds no persistence**: it makes **no live call** (the client is disabled by default; deterministic
> fixture transport is test-only), reaches a `RenderedMessage` only via the unchanged `validateDraft`, and the
> Impl 018 raw-free audit observes the outcome by **explicit composition** (**no automatic provider-attempt
> persistence**). **No provider response is persisted raw** and **no prompt payload is persisted** (the serializer
> emits a transient structured payload, not a stored template); **secret refs are not secrets and are not
> persisted as domain data** (no raw secret, no `process.env`); **provider operational metadata is not evidence**;
> and the shell **triggers no review / display-eligibility / delivery / event / retry / reprojection / reasoning /
> domain mutation**. **No SDK/package dependency was added** (`package.json`/lockfile unchanged). A **real (live)
> provider call, real SDK/secret/network mechanism, production prompt templates, and provider events remain
> future.**
> **(Impl 021 — opt-in live-provider boundary; no persistence change.)** Impl 021 added an opt-in live-provider
> boundary **inside `rendering/application`** behind the Impl 019 async `ProviderClientBoundary` — a
> **`LiveProviderClient`** (sibling of `ConcreteProviderClient`, reusing the unchanged serializer/parser/error-mapper)
> driven by an injected **`LiveCallPolicy`** (disabled by default; explicit opt-in; no env inference), an injected
> **`ProviderCredentialResolver`** + deterministic **`StaticProviderCredentialResolver`** (no env, non-secret
> sentinel), and a single **`LiveProviderHttpTransport`** (native `fetch` behind an injected endpoint — the only
> network-token file; no SDK/dependency). This slice **adds no persistence**: it reaches a `RenderedMessage` only
> via the unchanged `validateDraft`, and the Impl 018 raw-free audit observes the outcome by **explicit composition**
> (**no automatic provider-attempt persistence**). **No provider response is persisted raw** and **no prompt payload
> is persisted** (the serializer emits a transient structured payload, not a stored template); **secrets are not
> persisted as domain data** (no raw secret in records/responses/errors; no `process.env`; the credential is a
> non-secret sentinel used transiently); **provider operational metadata is not evidence**; and the live boundary
> **triggers no review / display-eligibility / delivery / event / retry / reprojection / reasoning / domain
> mutation**. **No SDK/package dependency was added** (`package.json`/lockfile unchanged). A **production secret/
> environment resolver, a real endpoint/SDK rollout, and provider events remain future.**
> **(Impl 022 — injected environment credential resolver; no persistence change.)** Impl 022 added an
> **`EnvironmentProviderCredentialResolver`** **inside `rendering/application`** behind the **unchanged** injected
> `ProviderCredentialResolver` port (a sibling of `StaticProviderCredentialResolver`). It reads **one explicitly
> configured key** from an **injected `EnvironmentCredentialSource`** (`Readonly<Record<string,string|undefined>>`)
> — **not the real `process.env`**, no scan, no fallback, no domain-derived name — and classifies
> missing/invalid/available with the existing opaque transient `ProviderCredentialToken`. This slice **adds no
> persistence**: **no raw credential is persisted**, **no env key name or value is persisted as domain/audit data**,
> **no provider response is persisted raw**, and **no prompt payload is persisted**. **Provider operational metadata
> is not evidence.** Credential availability is **not** live-call enablement (a disabled `LiveCallPolicy` and a
> missing/invalid credential each still block the transport); the resolver **calls no transport/provider/
> `validateDraft`** and **triggers no event / retry / reprojection / reasoning / review / display-eligibility /
> delivery / domain mutation**. **`process.env` appears nowhere in `src/`** (no guard exception); **no SDK/package
> dependency was added** (`package.json`/lockfile unchanged). A **direct `process.env` adapter, a production secret
> manager, and provider events remain future.**
> **(Impl 023 — one-file process-environment source adapter; no persistence change.)** Impl 023 added a
> **`ProcessEnvironmentCredentialSourceAdapter`** **inside `rendering/application`** that binds the **real process
> environment** to the resolver's **unchanged** injected `EnvironmentCredentialSource` shape — it **feeds, does not
> replace,** `EnvironmentProviderCredentialResolver`. It reads **one explicitly configured neutral key** via an
> **injected `ProcessEnvironmentAccessor`** (called once; no scan/fallback/domain-derived name) and returns a source
> with only that key when present (else empty); it **classifies nothing** (the resolver still does). This slice
> **adds no persistence**: **no raw credential is persisted**, **no env key name or value is persisted as
> domain/audit data**, **no provider response is persisted raw**, and **no prompt payload is persisted**. **Provider
> operational metadata is not evidence.** The direct `process.env` token is sealed to **exactly one approved file**
> (`defaultProcessEnvironmentAccessor`) by a **new repo-wide guard**; the accessor is **required** (no implicit
> default) so the default suite uses a fake and reads no real environment. Credential availability is **not**
> live-call enablement (a disabled `LiveCallPolicy` and a missing/invalid credential each still block the transport);
> the adapter **calls no resolver(unless composed)/live-client/transport/provider/`validateDraft`** and **triggers no
> event / retry / reprojection / reasoning / review / display-eligibility / delivery / domain mutation**. **No
> existing guard was weakened; no SDK/package dependency was added** (`package.json`/lockfile unchanged). A
> **production secret manager and a production event-recording composition remain future.**
> **(9) Impl 024** additively extended the realized **event surface (§1.5/§4)** — **inside `event-recording`**
> (the first slice to touch it since Impl 011; **no new module**, **no persistence added**): the closed catalogs
> gained a **provider/rendering/delivery occurrence vocabulary** (`ProducingModule` += `rendering`/`delivery` —
> provider events are produced by `rendering`, **no `provider` module**; `EventArtifactKind` += the five
> output-out artifact kinds — `DisplayEligibility` stays a ref **`role`**, not a kind; `DomainEventType` += eight
> occurrence/outcome types, so the catalog is now **34 types: 26 reasoning-core + 8 output-out**), and
> `application/` gained **eight pure factories** that build a `DomainEventRecord` through the **existing**
> `DomainEventRecord.record(...)` and **return** it. **The factories persist nothing** and **call no
> provider/transport/validator/renderer/delivery sink**, **create no rendered-message record/review/delivery
> record/provider attempt**, **mutate no domain**, and **auto-emit from nothing** (recording is **explicit
> application composition only**). Payloads stay **ref-only and raw-free** (`kind`/`id`/`role?`/`ownerModule?`;
> no raw draft/prompt/payload/secret/env value/copied body/metadata bag). `event-recording` stays
> **dependency-neutral** (imports only `shared-kernel`; a kind string is **not** a cross-module import), and
> **rendering/delivery/provider import no `event-recording` and emit nothing automatically**. The two earlier
> "catalog not extended" guards (Impl 015/018) were **reconciled, not weakened** (the rendering-internal audit
> symbols stay forbidden outside `rendering`; the factories stay pure). **No event bus / queue / scheduler /
> telemetry / DB / auto-emission / persistence-as-events**, and **no SDK/package dependency** (`package.json`/
> lockfile unchanged). **Events record what happened; they make nothing happen** — an event is never a
> command/retry/delivery trigger, evidence, recommendation quality, an athlete decision, or a domain mutation.
> **(Impl 025 — explicit application orchestration boundary; no persistence infrastructure added, persistence
> steps composed explicitly.)** Impl 025 added a **new application-composition module** `application-orchestration`
> whose one surface, **`orchestrateRenderDeliver(command, deps)`**, composes the **existing** rendering/delivery/
> event-recording services in a **fixed, explicit order** over **injected** collaborators. It **owns no repository**
> and **adds no persistence infrastructure**; instead it **explicitly calls the existing persistence steps where
> selected**, honoring the real-surface asymmetry: `auditProviderAttempt(...)` and
> `RenderedMessageRecord.fromRenderedMessage(...)` **return** records that the orchestrator **persists explicitly**
> (`providerAttemptRepository.save(...)`, `renderedMessageRecordRepository.save(...)`); a review is **appended to the
> rendered-message record** (`record.appendReview(review)` returns a new record, then an **explicit
> `renderedMessageRecordRepository.save(...)`** — there is **no separate review repository**); **`requestDelivery(...)`
> self-persists** through the injected delivery repository; and the **event repository `append` is explicit** (the
> terminal step). **No repository save triggers the next step** — each step is an explicit call in the function's
> control flow; **delivery is never automatic** (display eligibility is necessary, not sufficient); a **delivery
> failure does not retry**; and a **required-persistence failure** (audit/record/review) is a **safe stop**
> (`recording-failed`) **before** delivery. The **`OrchestrationTrace`/result carry safe refs only** — string ids /
> closed enums / safe codes — so **no raw draft/prompt/payload/provider-response/secret/env value/message body is
> persisted through the trace**, and **no value is persisted at all by orchestration** beyond what the injected
> repositories already store. An **occurrence-event-append failure is a non-invalidating partial result**
> (`partial-success`): the completed domain steps stand and their refs remain in the trace. Orchestration **does not
> trigger** reasoning, review, display eligibility, delivery, retry, provider calls, or domain mutation **except
> through its explicit selected steps**; `validateDraft` stays the only path to a `RenderedMessage`; **provider
> success is not evidence**, **delivery success is not an athlete decision**. The slice was **additive** (the only
> existing-file change is a documented AC20 allowlist update) and **adds no dependency** (`package.json`/lockfile
> unchanged).
> **(Impl 026 — opt-in live-provider smoke-test boundary; no persistence infrastructure added, returns a redacted
> result only.)** Impl 026 added a **pure, fully-injected smoke-test boundary helper** inside `rendering/application`,
> **`liveProviderSmoke(command, deps)`** — a manual operational **wiring check** that exercises **one** live provider
> call through the **existing** `requestRealProviderRendering(...)` seam (so the unchanged mandatory `validateDraft`
> stays the only path to a `RenderedMessage`), **only** behind explicit fail-closed gates (opt-in → CI → credential →
> live policy, each stopping before any call). It **owns no repository** and **adds no persistence infrastructure**; it
> **calls no rendered-message-record / review / display-eligibility / delivery / event repository** and **no
> `application-orchestration` delivery path**; it **persists nothing and delivers nothing**. It returns a **closed,
> redacted `LiveProviderSmokeResult`** (`rawRetained: false`) carrying safe codes only — **no raw draft / prompt /
> payload / provider-response / secret / env value / rendered-message body is persisted or surfaced through the smoke
> result**. It **reads no `process.env`** (opt-in/CI injected; credential via the injected `ProviderCredentialResolver`),
> makes **at most one call (no loops, no re-issue)**, and **does not trigger** reasoning, review, display eligibility,
> delivery, retry, provider events, or domain mutation. **Smoke success is not evidence; smoke failure is not domain
> failure.** The slice was **additive** (the only existing-file change is the `rendering/application/index.ts` exports)
> and **adds no dependency** (`package.json`/lockfile unchanged); the default suite + CI make **no live call** and need
> **no credential**.
> **(Impl 027 — manual operator live-smoke entrypoint; no persistence infrastructure added, returns a redacted
> result only.)** Impl 027 added a **manual, executable operator live-smoke entrypoint** —
> `scripts/operator-live-smoke.mjs` (plain ESM, **outside `src`/`tsconfig.include`/the default test glob/both guard
> scan roots**; verified runnable via Node 22 native type-stripping with no build and no dependency) and a **pure, env-free
> `src` support helper** (`rendering/application/operator-live-smoke-entrypoint.ts`) — without adding any module,
> repository, package dependency, npm script, or production DB. The script **adds no persistence infrastructure**: it
> **calls no rendered-message-record / review / display-eligibility / delivery / event repository** and **owns no
> repository**; it calls `liveProviderSmoke` exactly once, which itself persists nothing. It reads narrowly-scoped
> operator flags outside `src/` (so no new in-`src` `process.env` token site), resolves the credential through the
> approved adapter chain (`ProcessEnvironmentCredentialSourceAdapter → EnvironmentProviderCredentialResolver`), and
> prints **one redacted `OperatorSmokeOutput` JSON** (`rawRetained: false`, `wiringOnly`, `sideEffects: "none"`) before
> exiting. **No raw credential / draft / prompt / payload / provider-response / secret / env value is persisted or
> surfaced** through the operator output. **No event is recorded**, **no domain aggregate is mutated**, and **no delivery
> path is triggered**. The production `process.env` seal (exactly one approved in-`src` file) is **untouched** — the
> script's env reads live outside `src/` by design. Validation: **633/633 tests pass** · `tsc --noEmit` clean. *Smoke
> proves wiring, not wisdom; operator success is not evidence; a redacted exit code is not domain truth.*
> **Still future work:** **a production secret manager (with rotation) behind the injected-source seam**; **a production
> live-call rollout (real endpoint + deliberate opt-in)**; a **production orchestration *entrypoint*** (a UI/API
> use-case surface, or a scheduler/event-driven trigger, that *invokes* the now-built explicit composition — Impl 025
> — `orchestrateRenderDeliver`, which already records occurrences explicitly via the Impl 024 factories), **plus an
> eventual event-bus / event persistence / runtime delivery** (the explicit composition and the ref-only occurrence
> *surface* now exist; auto-emission, an event bus, and event persistence do not); a **real provider/channel adapter**
> (email/SMS/push/WhatsApp/web) behind the `DeliverySink` interface; **UI / API / a real LLM provider / prompt
> templates**; a **production scheduler / retry layer**, **event bus**, **event sourcing**, a **projection repository**
> (§6), **external (FIT/wearable) ingestion**, and any **production event store / serialization format / DB / ORM /
> cache / persistence backend**. This paper is otherwise unchanged.

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
| `ProviderAttemptRecorded` | rendering | **Public** | realized ref-only (Impl 024); refs the raw-free `ProviderAttemptRecord` — no draft/prompt/payload/secret |
| `ProviderDraftValidationFailed` / `ProviderDraftValidationPassed` | rendering | Internal-leaning | realized ref-only (Impl 024); outcome of `validateDraft` over a provider draft; not evidence, not recommendation quality |
| `RenderedMessageRecorded` | rendering | **Public** | realized ref-only (Impl 024); a validated presentation artifact was recorded; no raw unvalidated draft |
| `RenderReviewRecorded` | rendering | **Public** | realized ref-only (Impl 024); display-safety review decision (via ref `role`); triggers no display/delivery |
| `DisplayEligibilityDerived` | rendering | Internal-leaning | realized ref-only (Impl 024); eligibility is id-less → carried as the record ref's `role`; triggers no delivery |
| `DeliveryRequestRecorded` | delivery | **Public** | realized ref-only (Impl 024); a delivery was requested for a display-eligible record; calls no sink |
| `DeliveryOutcomeRecorded` | delivery | **Public** | realized ref-only (Impl 024); exposure outcome (audit); no auto-retry; implies no athlete reception/decision |

[FACT] **Realized (Impl 011 + Impl 024).** The reasoning-core rows are realized as `DomainEventType`s in the `event-recording` module (Impl 011); the **rendering/delivery output-out rows are realized additively in Impl 024** (catalogs + eight pure, ref-only factories — events produced by `rendering`/`delivery`; provider events by `rendering`; `DisplayEligibility` is a ref `role`, not an artifact kind). All factories **return** records and **persist nothing**, call nothing, and auto-emit from nothing; `event-recording` stays dependency-neutral. The exact public/internal split here remains conceptual (no event bus); realization records occurrences, it does not deliver them.

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
