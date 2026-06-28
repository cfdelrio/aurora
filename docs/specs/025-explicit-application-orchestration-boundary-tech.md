# Aurora — Technical Spec 025A — Explicit Application Orchestration Implementation Plan

> Phase: **Technical Specification** (TS-strict plan, no code).
> Translates: `docs/specs/025-explicit-application-orchestration-boundary.md`.
> Status: this document fixes the **mechanism** for an explicit application composition boundary that coordinates provider rendering, validation, provider-attempt audit, rendered-message record/review, display eligibility, delivery, and occurrence-event recording — and the minimal TS-strict shape for Implementation 025. **No code, no event bus, no queue, no scheduler, no retry, no telemetry/model-eval, no DB/schema, no SDK, no dependency, no live smoke test.**

---

## 0. Phase confirmation

This is the **Technical Specification** phase, not Implementation.

- `[FACT]` This document plans; it changes no file under `src/`. No dependency is installed; `package.json`/`package-lock.json` are untouched by 025A (devDeps stay `typescript` + `@types/node`).
- `[DECISION]` 025A picks: module placement; the orchestration surface (one async function + closed result/trace/stage types); dependency injection; persistence/event/audit/failure semantics; the import-boundary + guard plan; the deterministic test strategy — and stops there.

---

## 1. Context recap

Spec 025 is complete. Every surface the orchestrator composes already exists and is individually proven (Impl 014–024); validation is `563/563`. Spec 025's behavioral rule: **`orchestration = explicit composition`**; it coordinates boundaries and **never** becomes domain reasoning / event bus / scheduler / retry engine / workflow engine / hidden side effect / automatic delivery / recommendation-quality judge. Each step is an explicit, ordered call; **no event or repository save triggers the next step**; failure is a **safe stop or safe partial outcome (never auto-retry)**; **provider success ≠ evidence**, **delivery success ≠ athlete understanding/decision**; **`validateDraft` stays the only thing that turns a draft into a `RenderedMessage`**.

`[GAP]` (Spec 025 §1) **There is no composition seam today.** Composition exists only implicitly in tests and the neutral `src/modules/__tests__/` harnesses. 025A specifies the smallest production-intended seam and proves it stays explicit/fail-closed/ref-only/raw-free/non-authoritative.

---

## 2. Central Question

> How can Aurora implement an explicit application orchestration boundary that composes provider rendering, validation, audit, rendered-message record persistence, review/display eligibility, delivery, and occurrence-event recording while keeping each step explicit, fail-closed, raw-free, ref-only where appropriate, and non-domain-authoritative?

Answer shape (proven below): a **new application-only module `src/modules/application-orchestration`** with **no domain model and no repository of its own**, exposing **one async function** `orchestrateRenderDeliver(command, deps)` that calls the **existing** services (`requestRealProviderRendering` → `auditProviderAttempt` → `RenderedMessageRecord.from*` + repo `save` → `appendReview` + `save` → `displayEligibilityOf` → `requestDelivery` → the eight Impl 024 event factories + repo `append`) **in a fixed order, each step explicit, stopping safely at the first failure/block**, and returns a **closed `OrchestrationOutcome` union + a ref-only `OrchestrationTrace`**. All side-effecting collaborators are **injected**; partial composition (e.g. render-only) is selected by **which optional inputs/deps are provided**. The module imports only the **public** surfaces of `rendering` / `delivery` / `event-recording` (+ `shared-kernel`); nothing imports it; no live network, no real env, no dependency.

---

## 3. Required Technical Decisions

### `[DECISION]` Decision 1 — Module placement → **new top-level `src/modules/application-orchestration` (application-only)**

Create `src/modules/application-orchestration/` as an **application composition module**: **no domain model, no repository, no persistence of its own, no scheduler, no retry, no event bus, no domain authority.** It imports the **public application/domain surfaces** of `rendering`, `delivery`, `event-recording` (+ `shared-kernel`, + read-only `decision-support` types only if needed for input refs). **No domain module imports it**; `rendering`/`delivery`/`event-recording` **must not** depend on it (no import inversion).

Rationale (Spec 025 §3 / prompt): it composes *multiple* existing modules — placing it inside `rendering` would make delivery/event-recording look downstream of rendering; inside `delivery` would subordinate rendering/provider to delivery; inside `event-recording` would confuse occurrence history with orchestration. A separate module makes composition **explicit without dissolving boundaries**.

`[GAP]` **AC20 blocks this today.** `src/modules/__tests__/end-to-end-responsible-reflection.test.ts:405` (`AC20 — no new top-level module`) asserts every `src/modules/*` dir is in a hard-coded `ALLOWED_MODULES` set (currently the 8: observation, reasoning, understanding, decision-support, athlete, event-recording, rendering, delivery). Adding `application-orchestration` **requires adding it to `ALLOWED_MODULES`** — a **documented, additive, test-only allowlist update**, exactly the precedent set by Impl 016 (which added `delivery` with a documenting comment). `[DECISION]` This is **not** a guard weakening: AC20's purpose is "no *unapproved* UI/API/DB/LLM/event-bus/scheduler module," and `application-orchestration` is an **approved application-composition module**; the guard keeps rejecting everything else.

`[DECISION]` **Module-count framing:** `application-orchestration` is an **application composition module, not a domain/integration capability module.** Docs (CORE/TBM/SYSTEM_MAP) will distinguish **domain + integration modules** (the existing nine: the reasoning-core + `event-recording`/`rendering`/`delivery`) from the **application-orchestration** layer, so the "nine modules" count stays meaningful and the new module is clearly labeled as composition, not a new capability.

### `[DECISION]` Decision 2 — Orchestration shape → **one explicit composition covering the happy path + main fail-closed stops, fakes-only by default**

Implement (prompt option 3/4 minimally) a single explicit composition that can coordinate the **full happy path** (render → audit → record → review → display → delivery → events) **and the main fail-closed stops**, exercised **only** through **injected dependencies and deterministic fakes** (`FakeProviderClient`, `InMemoryTestSink`, in-memory repositories, injected timestamps/ids). **No live network by default; no real credentials; no smoke behavior.** **Partial composition** (e.g. render + audit, no delivery) is first-class — see Decision 9.

### `[DECISION]` Decision 3 — Result / trace → **closed `OrchestrationOutcome` union + ref-only `OrchestrationTrace`**

A closed discriminated union on `kind` (kebab-case, matching codebase status conventions), each carrying a `trace`:

```text
delivered                 // rendered + (optionally) recorded/reviewed + delivery succeeded
delivery-failed           // delivery attempted; sink failed/cancelled; NO retry
rendered                  // rendered + recorded; delivery not selected (partial composition)
review-rejected           // record exists; review rejected → display-ineligible → no delivery
display-ineligible        // record exists; not eligible (no explicit rejection) → no delivery
provider-not-rendered     // provider/validation/live-disabled/credential failed → NO record
recording-failed          // a record/audit persistence step threw → safe stop before review/delivery
partial-success           // prior steps succeeded but an occurrence-event append failed (non-invalidating)
```

The **`OrchestrationTrace`** carries **safe refs only**: `providerAttemptRecordId?`, `renderedMessageRecordId?`, `renderReviewId?`, `displayEligibility?` (`"eligible"`/`"ineligible"`), `deliveryRequestId?`, `deliveryRecordId?`, `eventRecordIds?: readonly string[]`, `stoppedAt: OrchestrationStage`, and a **safe `reasonCode?`** (a `ProviderFailure`/`RenderingFailure`/`DeliveryFailureReason`/review-reason **code** — never raw text). All ids are carried as **strings** (`String(id)`). The trace **must not** contain a raw provider draft / raw provider response / provider prompt/payload / credential token / secret / process-env value / chain-of-thought / hidden reasoning / arbitrary metadata bag / copied full message or delivery body.

### `[DECISION]` Decision 4 — Dependency injection → **all side-effecting collaborators injected; pure functions imported**

The orchestrator **imports** the **pure** functions/constructors it composes (`requestRealProviderRendering`, `auditProviderAttempt`, `RenderedMessageRecord`, `renderReview`, `displayEligibilityOf`, `deliveryRequest`, `requestDelivery`, the eight event factories) and **injects** every **stateful/side-effecting** collaborator via a single `OrchestrationDependencies` object: the `ProviderClientBoundary` (+ `ProviderClientConfig` + `ProviderSecretRef`), the `RenderedMessageRecordRepository`, the (optional) `ProviderAttemptRecordRepository`, the (optional) `DeliverySink` + `DeliveryRecordRepository`, the (optional) `DomainEventRecordRepository`, and **id/timestamp providers** (or explicit ids/timestamps in the command — for determinism). **No globals, no service locator, no implicit repository lookup, no event bus, no scheduler.**

### `[DECISION]` Decision 5 — Persistence policy → **explicit, named steps; each represented in the trace; account for the existing asymmetry**

Orchestration calls existing persistence **only as explicit, named steps** (never a hidden side effect), and each persistence step appears in the trace. `[GAP]` The existing services are **asymmetric** and 025A respects them as-is:
- **`auditProviderAttempt(...)` returns a record and does NOT persist** → if the audit step is selected, the orchestrator **explicitly** calls `providerAttemptRepository.save(record)`.
- **`RenderedMessageRecord.fromRenderedMessage(...)` returns a record and does NOT persist** → the orchestrator **explicitly** calls `renderedMessageRecordRepository.save(record)`.
- **Reviews live on the record** (`record.appendReview(review)` returns a *new* record) → the orchestrator **explicitly** appends then `save`s the new record. There is **no separate review repository** (§5.7).
- **`requestDelivery(...)` persists the `DeliveryRecord` internally** (it takes `deliveryRecordRepository` and calls `.save`) → the orchestrator passes the injected repo and does **not** double-persist.
The orchestrator adds **no new persistence semantics**; it composes the existing ones explicitly.

### `[DECISION]` Decision 6 — Event-recording policy → **explicit, ref-only, after the step; failure is partial, never a trigger**

Occurrence events are recorded **only** when an explicit "record occurrence" step runs, **after** the step they describe, by calling a **pure Impl 024 factory** then the injected `DomainEventRecordRepository.append(record)`. **Events never trigger subsequent steps.** An event-factory or `append` failure **returns an orchestration partial result** (`partial-success`) and **does not** retry, mutate domain, or invalidate the already-completed provider/render/delivery steps (Decision 8). If no `eventRepository` is injected, the event step is simply not run (partial composition).

### `[DECISION]` Decision 7 — Audit-failure semantics → **stop before delivery; safe partial**

If the audit step is selected and either `auditProviderAttempt` or its `save` throws, the orchestrator **stops before delivery** and returns **`recording-failed`** with a safe trace (no raw content). Rationale: audit is the raw-free record of *what the seam did*; delivering without the selected audit would lose that guarantee. (A future slice may justify delivery-without-audit; not this one.)

### `[DECISION]` Decision 8 — Event-recording-failure semantics → **non-invalidating partial success**

An occurrence-event failure **must not** retroactively invalidate a successful provider/render/delivery step. It is surfaced as **`partial-success`** (with the completed-step ids in the trace + a safe `reasonCode`). No transactional rollback this slice (transactional semantics deferred — §14).

### `[DECISION]` Decision 9 — Review/display/delivery policy → **delivery requires an explicit step AND display eligibility**

Display eligibility being `eligible` is **necessary but not sufficient**: delivery runs **only** when the delivery step is explicitly selected (delivery inputs/deps provided) **and** `displayEligibilityOf(record)` is eligible. Review is **optional** per path; when a review input is provided the orchestrator records it explicitly before deriving eligibility. **Partial composition:** omit the delivery inputs → terminal `rendered`; omit review → eligibility derived from the record's current state. A skipped step produces **no** artifact/event for that step.

### `[DECISION]` Decision 10 — Provider-disabled fallback → **none this slice; fail closed**

Do **not** add a deterministic-renderer fallback when the provider path is disabled/uncredentialed/failed. The orchestrator **fails closed** → **`provider-not-rendered`** (with a safe `reasonCode`), creating no record/review/delivery/provider-success event. (Whether to support fallback is deferred — §14.)

### `[DECISION]` Decision 11 — Correlation id → **defer**

Do not introduce a correlation id or any workflow/ordering engine. A caller that wants to group records may use the **existing optional `CorrelationRef`** on `DomainEventRecord`; the orchestrator adds no new grouping semantics.

---

## 4. Live Surface Flow (composition is explicit; nothing self-triggers)

```text
orchestrateRenderDeliver(command, deps):                                   // async, deterministic with fakes
 1. build RenderingRequest from command.renderable + safe config
 2. outcome = await requestRealProviderRendering({ request, client, config, secret })   // fail-closed inside
 3. if deps.providerAttemptRepository selected:
       rec = auditProviderAttempt({ request, outcome, providerAdapterKind, ...ts, id })  // returns; raw-free
       providerAttemptRepository.save(rec)            // EXPLICIT persist (audit returns, doesn't persist)
 4. if outcome.status !== "rendered": STOP → provider-not-rendered (safe reasonCode)     // no record/review/delivery
 5. record = RenderedMessageRecord.fromRenderedMessage({ id, message, rendererKind, createdAt })
       renderedMessageRecordRepository.save(record)   // EXPLICIT persist
 6. if command.review present:
       record = record.appendReview(renderReview({ id, recordRef, decision, reasons, ... }))
       renderedMessageRecordRepository.save(record)   // EXPLICIT persist (review lives on the record)
 7. eligibility = displayEligibilityOf(record)        // derived, never asserted
 8. if delivery NOT selected: STOP → rendered
    if eligibility ineligible: STOP → review-rejected | display-ineligible (no delivery)
 9. deliveryRecord = requestDelivery({ request: deliveryRequest(...), renderedMessageRecord: record,
                                       sink, now, deliveryRecordRepository })  // PERSISTS internally
    → delivered | delivery-failed (NO retry)
10. if deps.eventRepository selected: for each completed step, append factory record EXPLICITLY
       eventRepository.append(providerAttemptRecordedEvent({...}))  // etc. — ref-only, after the step
       (a factory/append failure → partial-success; never retried; never invalidates steps 2–9)
11. return { kind, trace }                            // trace = safe refs + stage + reasonCode only
```

`[FACT]` Crucially: **no event triggers steps 2–9**; **no `save`/`append` triggers the next step** (the orchestrator's explicit control flow does); **display eligibility does not auto-deliver**; **provider success creates no evidence**; **delivery success creates no `AthleteDecision`**; reading the trace/event log later **triggers nothing**.

---

## 5. Surface Gap Analysis (from real code — exact signatures)

1. **`requestRealProviderRendering(input): Promise<ProviderRenderOutcome>`** (`rendering/application/real-provider-rendering-service.ts`), `RequestRealProviderRenderingInput = { request: RenderingRequest; client: ProviderClientBoundary; config: ProviderClientConfig; secret: ProviderSecretRef }`. Reuses `providerRenderingRequestFrom` + a **credential fast-path** (non-`present` secret fails before any client call) + the mandatory `validateDraft`. **Persists/reviews/delivers/emits/mutates nothing; never retries.**
2. **`ProviderRenderOutcome`** (`rendering/application/provider-rendering-service.ts`): `{ status: "rendered"; message: RenderedMessage; providerKind: string; providerWarnings: readonly string[] } | { status: "failed"; failure: ProviderFailure; renderingFailures?: readonly RenderingFailure[] }`. `[FACT]` The orchestrator branches on `status`; on `"failed"` it stops at `provider-not-rendered` carrying `failure` (a closed code) as the safe `reasonCode`.
3. **`auditProviderAttempt(input): ProviderAttemptRecord`** (`rendering/application/provider-attempt-audit-service.ts`), `AuditProviderAttemptInput = { request: RenderingRequest; outcome: ProviderRenderOutcome; providerAdapterKind: string; requestedAt; completedAt; createdAt: Timestamp; id?: ProviderAttemptRecordId }`. `[GAP]` **Pure mapping — returns a record, does NOT persist** (no repo param); persistence is the orchestrator's explicit step (Decision 5). `rawDraftRetained: false`.
4. **`ProviderAttemptRecordRepository`** (`rendering/application/`): port + `InMemory…` adapter (`save`/`findById`/…). Injected (optional).
5. **`RenderedMessageRecord.fromRenderedMessage({ id, message, rendererKind, createdAt, revisedFrom? }): RenderedMessageRecord`** and **`.fromFailedOutcome({ id, sourceDomainOutputRef, terminalOutputKind, voice?, failures, rendererKind, … })`** (`rendering/domain/rendered-message-record.ts`). `[GAP]` **Returns a record; does NOT persist.** Reviews are appended via **`record.appendReview(review): RenderedMessageRecord`** (immutable-by-operation, returns a new record).
6. **`RenderedMessageRecordRepository`** (`rendering/application/rendered-message-record-repository.ts`): `save / findById / exists / findBySourceDomainOutputRef`. Injected (required).
7. **`renderReview(input: RenderReview): RenderReview`** (`rendering/domain/render-review.ts`): validates `id`, `recordRef` (non-empty), `decision` ∈ appendable decisions, non-empty `reasons`. `[GAP]` **There is NO `RenderReviewRepository`** — review persistence = `record.appendReview(review)` + `renderedMessageRecordRepository.save(newRecord)`.
8. **`displayEligibilityOf(record: RenderedMessageRecord): DisplayEligibility`** (`rendering/domain/display-eligibility.ts`): **derived** from `renderingStatus`, `currentReviewStatus()`, `supersededBy`, source ref. `[FACT]` The orchestrator **calls it, never re-derives** eligibility, and maps it to `"eligible"`/`"ineligible"` for the trace.
9. **`deliveryRequest(...)`** + **`requestDelivery(input): DeliveryRecord`** (`delivery/application/delivery-service.ts`), `RequestDeliveryInput = { request: DeliveryRequest; renderedMessageRecord: RenderedMessageRecord | undefined; sink: DeliverySink; now: Timestamp; deliveryRecordRepository: DeliveryRecordRepository; recordId?: DeliveryRecordId }`. `[GAP]` **`requestDelivery` PERSISTS internally** (`deliveryRecordRepository.save(record)`); it verifies eligibility via `displayEligibilityOf` and calls the sink **only** when eligible *and* target is `test-sink`. The orchestrator passes the injected repo/sink and does **not** double-persist.
10. **`DeliveryRecordRepository`** (`delivery/application/`): port + in-memory adapter. Injected (optional, for the delivery step).
11. **`DeliverySink`** (`delivery/domain/delivery-sink.ts`): `{ kind: string; deliver(input): SinkResult }`; deterministic `InMemoryTestSink` (`TestSinkBehavior = "deliver" | "fail" | "cancel"`); `SinkResult = { status: "delivered" } | { status: "failed"; reason: "sink-unavailable" } | { status: "cancelled" }`. Injected; **no real channel**.
12. **Event factories (8, Impl 024)** (`event-recording/application/provider-rendering-delivery-events.ts`): `providerAttemptRecordedEvent`, `providerDraftValidationFailedEvent`, `providerDraftValidationPassedEvent`, `renderedMessageRecordedEvent`, `renderReviewRecordedEvent`, `displayEligibilityDerivedEvent`, `deliveryRequestRecordedEvent`, `deliveryOutcomeRecordedEvent` — **pure**, each takes ids (strings) + `OccurrenceTiming { occurredAt; recordedAt; id? }` and **returns** a `DomainEventRecord`; **persists/triggers nothing**.
13. **`DomainEventRecordRepository`** (`event-recording/application/domain-event-record-repository.ts`): `append / findById / all / findByCorrelation`. `[GAP]` The persistence method is **`append`** (not `save`). Injected (optional, for the event step).
14. **In-memory adapters exist** for provider-attempt, rendered-message record, delivery, and event records — all deterministic; usable directly in tests.
15. **Id/ref types** (branded; referenced by **string** in the trace): `ProviderAttemptRecordId`, `RenderedMessageRecordId`, `RenderReviewId`, `DeliveryRequestId`, `DeliveryRecordId`, `DomainEventRecordId`. No import of internals needed beyond their public type exports.
16. **`RenderingRequest` / `RenderableDomainOutput` / `renderableFromTerminalOutput` / `ProviderClientConfig` / `ProviderSecretRef`** are public from `rendering`; `ProviderClientBoundary` + `FakeProviderClient` are public application surfaces. `[FACT]` The orchestrator injects a **`ProviderClientBoundary`** — it does **not** import `LiveProviderClient`, `LiveProviderHttpTransport`, `LiveCallPolicy`, the credential resolvers, or the process-env adapter. Fail-closed (policy disabled / credential missing) is already **inside the client + the credential fast-path**; the orchestrator only sees a `"failed"` outcome → safe stop.
17. **Import-boundary guards present:** AC20 (no new top-level module — §3 `[GAP]`); per-module dependency-boundary tests; the event-recording "imports only `shared-kernel`" + "no domain module imports it" guards; the rendering/delivery negative-capability guards ("no module outside `rendering` imports the seam", "no upstream imports `delivery`").
18. `[GAP]` **A new top-level module is NOT allowed by AC20 today** → add `application-orchestration` to `ALLOWED_MODULES` (documented, additive, test-only — Impl 016 precedent). No other guard is touched or weakened.
19. `[FACT]` **No package/dependency change needed** (devDeps remain `typescript` + `@types/node`; everything composes existing modules + native test runner).
20. `[FACT]` **All orchestration tests run deterministically with fakes** — `FakeProviderClient`, `InMemoryTestSink`, in-memory repositories, **injected ids + timestamps** (no `Date.now`/random; no live network; no real env; no CI credentials).

> `[GAP]` Net asymmetry the orchestrator must encode explicitly: **audit + rendered-message-record + review** return records the orchestrator persists (`save`/`appendReview`+`save`); **delivery** self-persists inside `requestDelivery`; **events** persist via `append`. None is a hidden side effect — each is a named step represented in the trace.

---

## 6. Proposed File Layout

New module (application-only; **no `domain/`** — it owns no domain model):

```text
src/modules/application-orchestration/application/orchestrate-render-deliver.ts   # the one async function
src/modules/application-orchestration/application/orchestration-command.ts        # ExplicitOrchestrationCommand
src/modules/application-orchestration/application/orchestration-dependencies.ts   # OrchestrationDependencies (injected)
src/modules/application-orchestration/application/orchestration-result.ts         # OrchestrationOutcome (closed union)
src/modules/application-orchestration/application/orchestration-trace.ts          # OrchestrationTrace + OrchestrationStage
src/modules/application-orchestration/application/index.ts                        # public application surface
src/modules/application-orchestration/index.ts                                    # re-export
src/modules/application-orchestration/tests/explicit-orchestration.test.ts
src/modules/application-orchestration/tests/explicit-orchestration-negative-capability.test.ts
```

Additive edit (documented test-only allowlist):

```text
src/modules/__tests__/end-to-end-responsible-reflection.test.ts   # + "application-orchestration" in ALLOWED_MODULES (AC20), with a comment
```

Must **not** create: `src/modules/{workflow,orchestrator,events-bus,event-bus,queue,scheduler,retry,telemetry,evaluation,provider,llm}`, `src/{api,infrastructure,db,database,migrations}`. Do **not** edit `package.json`/lockfile; add no SDK, no DB/schema/migrations.

---

## 7. Types / Surfaces To Plan

All TS-strict: `readonly` fields, **explicit field declarations**, **no constructor parameter properties**, `import type` for type-only imports, no arbitrary bags, no raw-bag rehydration without validation.

### `ExplicitOrchestrationCommand` (input — data, not collaborators)
```text
readonly renderable: <RenderableDomainOutput or the inputs to build a RenderingRequest>
readonly request: <RenderingRequest config: style?/locale?/maxLength? — safe constraints only>
readonly review?: { decision; reasons; reviewerKind?; id? }      // present ⇒ run the review step
readonly delivery?: { target /* closed DeliveryTarget */; requestId? }  // present ⇒ run the delivery step
readonly recordEvents?: boolean                                  // explicit opt-in to the event step
readonly ids?: { … deterministic ids for record/review/attempt/delivery/event }   // for tests
readonly timing: { occurredAt; recordedAt; requestedAt; completedAt; createdAt; now }  // injected Timestamps
```
**Must not contain:** a raw credential, a process-env value, a provider prompt/payload, chain-of-thought, hidden reasoning.

### `OrchestrationDependencies` (injected — all side-effecting collaborators; explicit, no globals)
```text
readonly client: ProviderClientBoundary
readonly config: ProviderClientConfig
readonly secret: ProviderSecretRef
readonly rendererKind: string
readonly providerAdapterKind: string
readonly renderedMessageRecordRepository: RenderedMessageRecordRepository
readonly providerAttemptRepository?: ProviderAttemptRecordRepository   // present ⇒ audit step
readonly deliverySink?: DeliverySink                                   // present (with repo) ⇒ delivery step
readonly deliveryRecordRepository?: DeliveryRecordRepository
readonly eventRepository?: DomainEventRecordRepository                 // present + recordEvents ⇒ event step
```
**No** service locator, **no** event bus, **no** scheduler, **no** implicit repository lookup. The pure functions (`requestRealProviderRendering`, `auditProviderAttempt`, `RenderedMessageRecord`, `renderReview`, `displayEligibilityOf`, `deliveryRequest`, `requestDelivery`, the eight event factories) are **imported**, not injected.

### `OrchestrationOutcome` (closed discriminated union on `kind`)
`delivered` · `delivery-failed` · `rendered` · `review-rejected` · `display-ineligible` · `provider-not-rendered` · `recording-failed` · `partial-success` — each `{ kind; trace: OrchestrationTrace }`. **No** raw draft/prompt/payload/secret/env value anywhere.

### `OrchestrationTrace` (safe refs only)
```text
readonly stoppedAt: OrchestrationStage
readonly providerAttemptRecordId?: string
readonly renderedMessageRecordId?: string
readonly renderReviewId?: string
readonly displayEligibility?: "eligible" | "ineligible"
readonly deliveryRequestId?: string
readonly deliveryRecordId?: string
readonly eventRecordIds?: readonly string[]
readonly reasonCode?: string   // a closed ProviderFailure/RenderingFailure/DeliveryFailureReason/review-reason code
```
**Must not include** raw content of any kind.

### `OrchestrationStage` (closed catalog)
`rendering-requested` · `provider-rendering-completed` · `provider-attempt-audited` · `rendered-message-recorded` · `review-recorded` · `display-eligibility-derived` · `delivery-requested` · `delivery-completed` · `occurrence-event-recorded` · `stopped`.

### Entry point
`orchestrateRenderDeliver(command: ExplicitOrchestrationCommand, deps: OrchestrationDependencies): Promise<OrchestrationOutcome>` — async (because `requestRealProviderRendering` is async); deterministic given fakes + injected ids/timestamps.

---

## 8. Required Flow Semantics (exact order)

The order is §4 steps 1–11. Invariants restated as TS-checkable rules: each step runs **only** by the orchestrator's explicit call; **step N+1 never runs as a side effect of step N's save/append/event**; **display eligibility never auto-delivers**; **provider success creates no evidence**; **delivery success creates no `AthleteDecision`**; a **provider/validation failure stops before step 5 (record)**; a **selected-audit failure stops before step 9 (delivery)**; a **record-persistence failure stops before step 6/9**; a **review rejection / display-ineligible stops before step 9**; a **delivery failure does not retry**; an **event failure (step 10) is partial-success and invalidates nothing**. Partial composition: absent `delivery` input → terminal `rendered`; absent `review` → eligibility from current record; absent `eventRepository`/`recordEvents` → no event step.

---

## 9. Required Failure Semantics (exact)

| Condition | Behavior | Terminal `kind` |
|---|---|---|
| Live policy disabled (inside client) | outcome `"failed"`; **no transport**; stop before record | `provider-not-rendered` |
| Credential missing/invalid | credential fast-path / outcome `"failed"`; **no transport**; stop before record | `provider-not-rendered` |
| Provider transport failure | outcome `"failed"`; stop before record | `provider-not-rendered` |
| Provider draft validation failure | outcome `"failed"` (`renderingFailures`); stop before record; any audit/event raw-free | `provider-not-rendered` |
| Provider-attempt audit failure (selected) | stop before delivery; safe trace | `recording-failed` |
| Rendered-message-record persistence failure | stop before review/delivery | `recording-failed` |
| Review persistence failure (selected) | stop before display/delivery | `recording-failed` |
| Review rejection | eligibility ineligible; no delivery | `review-rejected` |
| Display ineligible | no delivery | `display-ineligible` |
| Delivery failure (sink failed/cancelled) | delivery record persisted by `requestDelivery`; **no retry** | `delivery-failed` |
| Event-factory / `append` failure (after success) | non-invalidating; completed-step ids in trace | `partial-success` |

**No automatic retry. No scheduler. No event replay.** Every failure is a safe stop or safe partial outcome; none mutates `athlete`/`understanding`/`reasoning`/`decision-support`.

---

## 10. Boundary / Import Rules

**Allowed imports** for `application-orchestration`: the **public** surfaces of `rendering` (`index.ts` / `application`), `delivery`, `event-recording`; `shared-kernel`; **read-only `decision-support` types** only if needed as input refs. **Forbidden imports:** any internal of `observation`/`reasoning`/`understanding`/`athlete`; provider **transport** internals (`live-provider-http-transport`), `LiveCallPolicy`, the credential resolvers, or the **process-env adapter** directly (the client + secret + config are injected, already composed by the caller); the delivery sink internals except via the injected `DeliverySink`; any test-only fake in a production file. **No domain module imports `application-orchestration`**; **`rendering`/`delivery`/`event-recording` must not depend on it** (no import inversion).

---

## 11. Structural Guard Strategy (additive; nothing weakened)

A new `application-orchestration-negative-capability.test.ts` (+ the AC20 allowlist edit) asserts:
- AC20: `application-orchestration` is the **only** added module; no `src/modules/{workflow,orchestrator,event-bus,events-bus,queue,scheduler,retry,telemetry,evaluation,provider,llm}` and no `src/{api,infrastructure,db,database,migrations}`.
- the orchestration files import **only** allowed public surfaces (scan `from "…"` specifiers); they **do not** import `live-provider-http-transport` / `live-call-policy` / `*credential-resolver*` / `process-environment-*` / a delivery-sink internal / provider concrete internals directly.
- **`rendering`/`delivery`/`event-recording` do not import `application-orchestration`** (reverse-import scan).
- **no raw prompt/payload/secret/env token** in orchestration source/state (token scan; build any sensitive token-regex from fragments so the test is not itself a token site — Impl 023/024 precedent).
- a **package guard**: `dependencies` empty/absent, `devDependencies` == `["@types/node","typescript"]`.

Existing guards stay green: the event-recording "imports only `shared-kernel`" guard is unaffected (orchestration imports event-recording, not vice-versa); the rendering/delivery "no module outside imports the seam" guards are unaffected (orchestration uses **public** surfaces, not the provider seam internals — to be verified, else use only the public service exports).

---

## 12. Test Strategy (deterministic; negatives are defining)

Default: deterministic, **fakes/in-memory only**, no live call, no real env, no CI credentials, no SDK, no event bus/scheduler/retry. Required tests (≥ the prompt's 20):
1. successful explicit composition creates each artifact **only** through its explicit dependency call (spy each repo/sink: called exactly when its step runs).
2. a step does **not** run unless explicitly selected/called (omit a dep/input → no artifact/event for it).
3. live policy disabled → stop before transport/record/delivery (`provider-not-rendered`).
4. credential missing → stop before transport/record/delivery (`provider-not-rendered`).
5. provider draft validation failure → no rendered-message record.
6. selected-audit failure → stop before delivery (`recording-failed`).
7. record-persistence failure → stop before review/delivery (`recording-failed`).
8. review rejection → no delivery (`review-rejected`).
9. display-ineligible → no delivery (`display-ineligible`).
10. delivery failure → **no retry** (sink called once; `delivery-failed`).
11. event-recording failure → `partial-success`; completed steps intact; no side effect.
12. provider-attempt **audit record and event record remain distinct** artifacts.
13. trace contains **refs only** (every field is a string id / closed enum / safe code).
14. **no** raw draft/prompt/payload/secret/env value in trace/result/recorded events (sentinel-absence scan).
15. reading event/trace history triggers **no** orchestration (inertness).
16. `rendering`/`delivery`/`event-recording` do **not** import `application-orchestration`.
17. **no** event-bus/queue/scheduler/retry module.
18. **no** telemetry/model-evaluation/DB/schema module.
19. `package.json`/lockfile unchanged.
20. **all Impl 001–024 tests continue to pass** (563 → 563 + new).

---

## 13. Persistence / Review / Delivery / Event rules

Implementation 025 must **not**: create an event bus / scheduler / retry / queue / broker / telemetry-eval infra / production DB-schema; alter provider live-call gates, credential resolution, validation, rendered-message record creation, review behavior, display-eligibility rules, or delivery behavior; cause delivery / provider calls / validation **from event recording**; save event records except through the **explicit** event step; mutate `athlete`/`understanding`/`decision-support`/`reasoning` state.

---

## 14. Open Questions (carried forward, non-blocking)

A live-provider smoke-test boundary (whether it composes *through* this seam or stays separate); a production secret manager; production DB/schema; a UI/API boundary; delivery-provider integration; correlation id; **transactional semantics** (all-or-nothing across steps); read-model projection; telemetry/model evaluation; whether a future slice justifies **delivery-without-audit** or a **provider-disabled deterministic-renderer fallback**. None resolved beyond this slice.

---

## 15. Relationship to Existing Architecture

- **Spec/Impl 024:** the provider/rendering/delivery occurrence event surface exists as **pure ref-only factories** — orchestration records occurrences by **calling them explicitly**, after the steps, then `append`s.
- **Spec/Impl 023/022/021:** the credential chain + live boundary exist and are **fail-closed** — orchestration injects a `ProviderClientBoundary` + secret + config and **never** touches `process.env`/transport/policy internals.
- **Spec/Impl 020/019:** the selected-provider shell + async `ProviderClientBoundary` exist — orchestration calls `requestRealProviderRendering`, ending at `validateDraft`.
- **Spec/Impl 018:** the provider-attempt audit stays **raw-free and explicit** — orchestration composes it explicitly and persists its returned record.
- **Spec/Impl 017/014:** provider drafts are **untrusted**; only `validateDraft` yields a `RenderedMessage` — orchestration never bypasses the validator.
- **Spec/Impl 015:** rendered-message record/review/display eligibility exist — orchestration persists/reviews/derives by explicit calls (review lives on the record).
- **Spec/Impl 016:** delivery request/outcome records exist — orchestration delivers **only** display-eligible records via `requestDelivery` (which self-persists) and never re-derives eligibility.
- **Spec/Impl 011:** event/outcome records + the traceability envelope are reused **unchanged**.
- **Spec/Impl 013:** a provider response is **not source material** unless separately reported by the athlete — orchestration changes nothing about ingestion.

Clarifications: orchestration **coordinates** existing boundaries; it does **not** replace them, and it is **not** domain reasoning, **not** event recording itself, **not** delivery, **not** provider logic, **not** review, **not** retry/scheduler, **not** model evaluation.

---

## 16. Implementation Task Preview

**Implementation 025 — Add explicit application orchestration boundary**

Acceptance criteria:
- a **new application-only module `src/modules/application-orchestration`** (no domain model, no repository, no persistence of its own) exposing **one async `orchestrateRenderDeliver(command, deps)`** that composes the existing services in the fixed §4 order;
- **orchestration is explicit composition** — every step runs only by an explicit call; **no event bus, no scheduler, no retry, no queue, no hidden side effects, no automatic delivery, no domain mutation**;
- **provider success ≠ evidence**; **delivery success ≠ athlete decision**; `validateDraft` stays the only path to a `RenderedMessage`; display eligibility is **necessary but not sufficient** for delivery;
- a **closed `OrchestrationOutcome` union** + a **ref-only `OrchestrationTrace`** (safe ids / closed enums / safe reason codes only — **no** raw draft/prompt/payload/secret/env value);
- **fail-closed** stops (provider/validation → before record; selected-audit/record/review failure → before delivery; review-rejected/ineligible → no delivery; delivery failure → no retry; event failure → non-invalidating `partial-success`);
- all collaborators **injected**; **deterministic tests** with fakes/in-memory + injected ids/timestamps; **no live network, no real env, no CI credentials**;
- **AC20 allowlist** additively updated (documented) for the new module; **no other guard weakened**; `rendering`/`delivery`/`event-recording` do not import it;
- **no SDK/dependency change** (`package.json`/lockfile unchanged); and **all existing tests remain green** (563), plus the new orchestration + negative-capability tests pass.

---

## 17. Technical Constraints

TypeScript strict; Node native test runner; no external test framework; no framework; no DB; no event bus; no scheduler; no queue; no retry; no telemetry/model-eval infra; no SDK dependency; no default live network; no CI credentials; no prompt templates as production code; no raw secrets. **No constructor parameter properties** (the orchestrator is a function over injected deps + plain value objects with explicit `readonly` fields). `import type` where appropriate. **No arbitrary payload bags; no raw-bag rehydration without validation.** Orchestration tests must be **deterministic** (injected ids + timestamps; fakes/in-memory only).

---

## 18. Success Criteria

After this tech spec, Implementation 025 can add an explicit orchestration boundary **without** introducing hidden side effects, event-bus behavior, retry/scheduler semantics, delivery automation, raw-content trace state, evidence creation, or domain mutation.

The implementation must answer:

> "Can Aurora **explicitly compose** provider rendering, validation, audit, records, review/display, delivery, and event recording while keeping **every step explicit, fail-closed, ref-only where appropriate, raw-free, and non-domain-authoritative**?"

— and, by the new application-only module (Decision 1), the single explicit async composition over **injected** collaborators (Decisions 2/4), the closed result + ref-only trace (Decision 3), the explicit persistence/event/audit/failure semantics that respect the existing surface asymmetry (Decisions 5–10, §5 `[GAP]`s), the additive AC20 allowlist update with no guard weakened (§3/§11), and the deterministic defining negative tests (§12), the answer is **yes**.
