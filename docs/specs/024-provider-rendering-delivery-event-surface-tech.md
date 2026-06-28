# Aurora — Technical Spec 024A — Provider / Rendering / Delivery Event Surface Implementation Plan

> Phase: **Technical Specification** (TS-strict plan, no code).
> Translates: `docs/specs/024-provider-rendering-delivery-event-surface.md`.
> Status: this document fixes the **mechanism** for recording provider/rendering/review-display/delivery occurrences as ref-only event/outcome records, and the minimal TS-strict shape for Implementation 024. **No code, no event bus, no retry/scheduler, no telemetry, no DB/schema, no SDK, no dependency.**

---

## 0. Phase confirmation

This is the **Technical Specification** phase, not Implementation.

- `[FACT]` This document plans; it changes no file under `src/`. No dependency is installed; `package.json`/`package-lock.json` are untouched by 024A.
- `[DECISION]` 024A picks: additive catalog expansion vs external adapter; the exact event-type / artifact-kind / producing-module names; the factory surface; the ref shapes; the guard updates; the test strategy — and stops there.

---

## 1. Context recap

Spec 024 is complete. The provider/credential chain is end-to-end and fail-closed (Impl 014–023); persistence exists for the provider-attempt audit (018, raw-free), rendered-message record/review (015), and delivery records (016). The Impl 011 `event-recording` log exists — append-only, **ref-only `EventPayloadRef`**, inert, dependency-neutral (imports only `shared-kernel`; no domain module imports it).

Spec 024's behavioral rule: `event = ref-only occurrence history`; `event ≠ command / retry / delivery / evidence / quality judgment / domain mutation / raw content store`. The recorded surface covers provider-attempt, provider-draft validation, rendered-message record, review/display, and delivery occurrences.

`[GAP]` (Spec 024 §3) The existing closed catalogs are **scoped to the reasoning core**: `DomainEventType` (25 reasoning-core members), `EventArtifactKind` (14 reasoning-core kinds), `ProducingModule` (`observation`/`reasoning`/`understanding`/`decision-support`/`athlete`) — **none** cover provider/rendering/delivery. Realizing the surface needs **additive** catalog entries; this tech spec specifies exactly which.

---

## 2. Central Question

> How can Aurora implement provider/rendering/review/display/delivery occurrence events as **additive, ref-only, raw-free, inert** event/outcome records while preserving explicit composition and preventing events from becoming commands, retries, evidence, delivery triggers, or domain mutations?

Answer shape (proven below): **additively expand** the `event-recording` closed catalogs (string-literal `EventArtifactKind` + `ProducingModule` + `DomainEventType` + catalog entries) and add **pure factory functions** in `event-recording/application` that take **ids/refs (strings) only** and return a `DomainEventRecord` via the unchanged `record(...)` — **persisting nothing**, importing **no** rendering/delivery/provider module, and reusing the Impl 011 ref-only + inert discipline. Rendering/delivery/provider code is **not** touched and never auto-emits.

---

## 3. Required Technical Decisions

### `[DECISION]` Decision 1 — Catalog expansion vs external adapter → **additive catalog expansion + pure factories**

Add provider/rendering/delivery occurrence entries to the **existing `event-recording` catalogs**, and add **pure factory functions** (in `event-recording/application`) that *return* records but never persist. Rationale: event vocabulary belongs to `event-recording`; the new surface is still occurrence/outcome history; additive expansion is explicit and testable; pure factories avoid automatic persistence/side effects. `[FACT]` This is feasible **without any cross-module import** because `EventArtifactKind`/`ProducingModule`/`EventPayloadRef` are **string literals + ids** (§5) — the factories reference rendering/delivery artifacts by `kind`+`id` strings, so `event-recording` stays dependency-neutral.

### `[DECISION]` Decision 2 — Producing modules → add `rendering` + `delivery`

Add **`"rendering"`** and **`"delivery"`** to `ProducingModule` (union + `PRODUCING_MODULES` array + the hand-written `isProducingModule` predicate — see §5.3 `[GAP]`). **Do not** create a `provider` producing module: provider integration lives **inside `rendering`**, so provider-related events are produced by **`rendering`**.

### `[DECISION]` Decision 3 — Artifact kinds → add five id-bearing kinds only

Add to `EventArtifactKind` (union + `EVENT_ARTIFACT_KINDS` array; `isEventArtifactKind` is array-driven so it auto-covers):
```text
ProviderAttemptRecord · RenderedMessageRecord · RenderReview · DeliveryRequest · DeliveryRecord
```
`[DECISION]` **Do not** add a `DisplayEligibility` artifact kind — it is a **derived value with no id**, and `EventPayloadRef` requires a non-empty id. The display-eligibility occurrence instead uses `RenderedMessageRecord` as its primary ref and encodes the eligibility state in the ref's **`role`** (e.g. `"display-eligible"` / `"display-ineligible"`). This refines Spec 024's candidate list to fit the ref-only shape.
**Never** add kinds for: `raw-provider-draft`, `raw-provider-response`, `provider-prompt`, `provider-payload`, `credential`, `secret`, `process-env-value`, `chain-of-thought`.

### `[DECISION]` Decision 4 — Event types → eight PascalCase members (matching the existing convention)

`[GAP]` Existing `DomainEventType` members are **PascalCase** (e.g. `ObservationSetRecorded`); Spec 024's kebab-case names were illustrative. To match the closed catalog (and `isDomainEventType`), use **PascalCase**:

| `DomainEventType` | module | category | primaryKind | requiredRefKinds |
|---|---|---|---|---|
| `ProviderAttemptRecorded` | `rendering` | `occurrence` | `ProviderAttemptRecord` | — |
| `ProviderDraftValidationFailed` | `rendering` | `outcome` | `ProviderAttemptRecord` | — |
| `ProviderDraftValidationPassed` | `rendering` | `outcome` | `ProviderAttemptRecord` | — |
| `RenderedMessageRecorded` | `rendering` | `occurrence` | `RenderedMessageRecord` | — |
| `RenderReviewRecorded` | `rendering` | `outcome` | `RenderReview` | `RenderedMessageRecord` |
| `DisplayEligibilityDerived` | `rendering` | `occurrence` | `RenderedMessageRecord` | — |
| `DeliveryRequestRecorded` | `delivery` | `occurrence` | `DeliveryRequest` | `RenderedMessageRecord` |
| `DeliveryOutcomeRecorded` | `delivery` | `outcome` | `DeliveryRecord` | `DeliveryRequest` |

`[DECISION]` Provider events use **`ProviderAttemptRecord` as the primary artifact** — i.e. recording a provider event is composed **after** `auditProviderAttempt(...)` produced an attempt record (consistent with "explicit composition only" and giving every provider event a stable id'd primary). The alternative (a neutral `RenderingRequest` artifact kind) is **deferred** (§14). `[DECISION]` **Defer credential-resolution events** — they would add no value without risking env/secret leakage; not in this slice.

### `[DECISION]` Decision 5 — Event-creation surface → pure factories, no persistence

Pure factory functions in `event-recording/application/provider-rendering-delivery-events.ts` that **return** a `DomainEventRecord` (built via the unchanged `record(...)`). They take ids/refs + timestamps + a fresh event id. They must **not** call: a provider, the renderer, `validateDraft`, the review/render repositories, the delivery sink, the delivery repository, or the event repository's `save`/`append` (creation is separate from persistence — §6).

### `[DECISION]` Decision 6 — Ref-only payload shape

Reuse the unchanged `EventPayloadRef` (`kind`+`id`+`role?`+`ownerModule?`; `assertRefOnly`). Each event carries **ids/refs only** — no arbitrary bag, no copied state, no raw content, no secret, no provider body, no prompt, no chain-of-thought.

### `[DECISION]` Decision 7 — Persistence behavior

Implementation 024 creates **records/factories only**; persistence stays **explicit** via the existing `DomainEventRecordRepository` + in-memory adapter (the caller, or a test, may `save` a returned record). The factories never persist and never trigger a downstream artifact.

### `[DECISION]` Decision 8 — Import boundaries

`event-recording` stays **dependency-neutral**: it imports only `shared-kernel`; the factories reference rendering/delivery artifacts by **`kind`+`id` strings**, never by importing those modules. **Rendering/delivery/provider code is not modified and never imports `event-recording`** to auto-emit — recording is explicit application composition only (exercised by tests this slice).

### `[DECISION]` Decision 9 — Correlation / composition id → defer

Do not add a correlation id this slice (the existing optional `CorrelationRef` already exists if a caller wants to group records; no new semantics). No workflow-engine semantics.

---

## 4. Live Surface Flow (recording is observation, not control)

```text
(existing, unchanged) auditProviderAttempt(outcome) → ProviderAttemptRecord            // explicit, raw-free
(existing, unchanged) RenderedMessageRecord / RenderReview / displayEligibilityOf(...)  // Impl 015
(existing, unchanged) DeliveryRequest / DeliveryRecord                                  // Impl 016
        │  (an application flow, or a test, explicitly chooses to record an occurrence)
        ▼
providerAttemptRecordedEvent({ attemptRecordId, ... , occurredAt, recordedAt, id })     // PURE factory
        → DomainEventRecord (ref-only; primary = ProviderAttemptRecord)
        │  (the caller MAY then persist it)
        ▼
DomainEventRecordRepository.save(record)   // existing, explicit — NOT called by the factory
```

Rules: the factory references existing artifacts by id; it calls nothing; it persists nothing; reading the log later explains history but triggers no provider call / validation / render / review / delivery (the records are inert).

---

## 5. Surface Gap Analysis (from real code)

1. **`DomainEventType`** (`domain/domain-event-type.ts`): 25 PascalCase reasoning-core members + `DOMAIN_EVENT_CATALOG` (entry per type: `module`, `category`, `primaryKind`, `requiredRefKinds`, optional `requiresFreshness`/`requiredPrimaryRole`/`requiredActorKind`/`notes`); `isDomainEventType` = `hasOwnProperty` on the catalog (**auto-covers** new entries). Add 8 members **+ catalog entries** (§3 Decision 4).
2. **`EventArtifactKind`** (`domain/event-payload-ref.ts`): 14 PascalCase kinds in a union **+** `EVENT_ARTIFACT_KINDS` array; `isEventArtifactKind` is **array-driven** (auto-covers). Add 5 kinds to **both** the union and the array (§3 Decision 3).
3. **`ProducingModule`** (`domain/producing-module.ts`): union + `PRODUCING_MODULES` array + a **hand-written `||` predicate**. `[GAP]` `isProducingModule` is **not array-driven** — adding `rendering`/`delivery` requires editing **all three** (union, array, predicate), or refactoring the predicate to be array-driven. Plan: edit all three (or make the predicate array-driven, additive and safe).
4. **`EventPayloadRef`** (`domain/event-payload-ref.ts`): `{ kind, id, role?, ownerModule? }`; `assertRefOnly` rejects any other key. Reused unchanged for all new events.
5. **`record(...)` / `reconstitute(...)`** (`domain/domain-event-record.ts`): `RecordDomainEventInput { id, type, category, occurredAt, recordedAt, producingModule, traceability, payloadRefs?, actor?, causation?, correlation? }`; `buildProps` enforces type↔category, type↔module, `traceability.primaryArtifactRef.kind === entry.primaryKind`, `requiredRefKinds ⊆ (envelope refs ∪ payload refs)`, timestamp order. Factories build a valid `TraceabilityEnvelope` + payload refs to satisfy each event's catalog entry.
6. **`TraceabilityEnvelope`** (`domain/traceability-envelope.ts`): carries `primaryArtifactRef` (kind+id+role?), `sourceRefs`, typed slots, optional `projectionFreshness`/`limitations`. The new events need **no** freshness/actor. The factory sets `primaryArtifactRef` to the event's primary kind+id (+ `role` for display-eligibility state).
7. **Repository / application** (`application/`): `DomainEventRecordRepository` port + `InMemoryDomainEventRecordRepository` (append-only). `save`/persistence stays **explicit and separate** from factory creation.
8. **Ref-only tests already present** (`tests/domain-event-record.test.ts`, `…-negative-capability.test.ts`): `assertRefOnly`, no copied state, "imports only shared-kernel". `[FACT]` **No test asserts an exact catalog size** (the only `length` assertions are on logs/payload-refs) — so additive expansion breaks no size guard.
9. **`ProviderAttemptRecordId`** (`rendering/domain`): branded id; referenced by **string value** (`String(id)`) in `EventPayloadRef.id` — no import needed.
10. **`RenderedMessageRecordId`** (`rendering/domain/ids.ts`): branded id; referenced by string.
11. **`RenderReviewId`** (`rendering/domain/ids.ts`): branded id; referenced by string.
12. **`DisplayEligibility`** (`rendering/domain/display-eligibility.ts`): a **derived value, not an id'd artifact** — hence Decision 3 encodes its state as a ref `role` on the `RenderedMessageRecord` primary, not as an artifact kind.
13. **`DeliveryRequestId`** (`delivery/domain`): branded id; referenced by string.
14. **`DeliveryRecordId`** (`delivery/domain`): branded id; referenced by string.
15. `[DECISION]` **Delivery target refs:** the `DeliveryTarget` is a closed enum (only `test-sink`); it carries no secret/body, so a delivery event MAY carry the target as the primary ref's `role` (a safe summary), never a raw body.
16. `[FACT]` **`event-recording` can reference rendering/delivery artifacts without importing them** — kinds are string literals, ids are strings; the dependency-neutral boundary holds.
17. `[FACT]` **Rendering/delivery do NOT import `event-recording`** today (verified by the Impl 011 boundary test "no domain module imports it"); this slice keeps it that way — no auto-emit.
18. `[DECISION]` **Pure factories live in `event-recording/application`** (a new `provider-rendering-delivery-events.ts`), exported additively.
19. `[DECISION]` **Guards needing additive update:** the event-recording test that lists/uses producing modules + artifact kinds (extend its fixtures for the new entries); no guard is *weakened*. The "imports only shared-kernel" boundary test stays green (no new imports).
20. `[FACT]` **No package/dependency change**; all new event types are testable with deterministic fixtures (ids + injected timestamps) and **no side effects**.

> `[GAP]` Summary of the three edits to make the predicate/catalog consistent: (a) `EventArtifactKind` union + array; (b) `ProducingModule` union + array + predicate (array-driven refactor recommended); (c) `DomainEventType` union + `DOMAIN_EVENT_CATALOG` entries. All additive; no member removed; no existing entry changed.

---

## 6. Proposed File Layout

Additive edits (existing files):
```text
src/modules/event-recording/domain/event-payload-ref.ts       # + 5 EventArtifactKind members (union + array)
src/modules/event-recording/domain/producing-module.ts        # + "rendering","delivery" (union + array + predicate)
src/modules/event-recording/domain/domain-event-type.ts       # + 8 DomainEventType members + catalog entries
src/modules/event-recording/application/index.ts              # additive export of the factories
src/modules/event-recording/index.ts                          # (export * already re-exports)
```
New files:
```text
src/modules/event-recording/application/provider-rendering-delivery-events.ts   # pure factories
src/modules/event-recording/tests/provider-rendering-delivery-event-surface.test.ts
src/modules/event-recording/tests/provider-rendering-delivery-negative-capability.test.ts
```
Must **not** create: `src/modules/{events-bus,queue,scheduler,telemetry,evaluation,provider,llm}`, `src/{api,infrastructure}`. Do **not** edit `package.json`/lockfile; add no SDK; add no DB/schema/migrations.

---

## 7. Types / Surfaces To Plan — pure factory functions

All TS-strict, `readonly` inputs, `import type` where applicable, no arbitrary bags. Each returns a `DomainEventRecord`; **none persists**. Inputs are **ids/refs (strings) + timestamps + a fresh event id** (no aggregate objects, no raw content). Names are **occurrence-oriented, past tense** (Decision: never imperative — see §8).

- **`providerAttemptRecordedEvent`** — primary `ProviderAttemptRecord` (id); optional safe refs (renderable/source ref by id). Carries **no** draft/prompt/payload/provider-response/credential.
- **`providerDraftValidationFailedEvent`** — primary `ProviderAttemptRecord`; carries a **safe failure reason code** in the primary ref's `role` (a `RenderingFailure`/`ProviderFailure` code, not raw text); creates **no** `RenderedMessageRecord`.
- **`providerDraftValidationPassedEvent`** — primary `ProviderAttemptRecord`; optional `RenderedMessageRecord` payload ref **only if already created**; asserts no quality.
- **`renderedMessageRecordedEvent`** — primary `RenderedMessageRecord`; no raw unvalidated draft.
- **`renderReviewRecordedEvent`** — primary `RenderReview`; required `RenderedMessageRecord` ref; review decision/reason code + reviewer kind via `role`; triggers no display/delivery.
- **`displayEligibilityDerivedEvent`** — primary `RenderedMessageRecord`; eligibility state (`display-eligible`/`display-ineligible`) via `role`; triggers no delivery.
- **`deliveryRequestRecordedEvent`** — primary `DeliveryRequest`; required `RenderedMessageRecord` ref; safe target summary via `role`.
- **`deliveryOutcomeRecordedEvent`** — primary `DeliveryRecord`; required `DeliveryRequest` ref; outcome/failure reason via `role`; implies **nothing** about athlete reception/decision; no auto-retry.

---

## 8. Event Naming Constraints

Names are **occurrence-oriented / past-tense**, never commands/imperatives/workflow triggers. Good: `ProviderAttemptRecorded`, `DeliveryOutcomeRecorded`, `RenderReviewRecorded`. Bad: `RetryProvider`, `SendDelivery`, `ApproveRender`, `CreateReview`. (Factory function names mirror this: `…RecordedEvent`, `…DerivedEvent`.)

---

## 9. No-Raw + Side-Effect Test Strategy

**No-raw** (defining): assert serialized event state (`record.toState()` / JSON) contains **no** raw provider draft, raw provider response, provider prompt, provider payload, secret, env value, credential/auth-like string, chain-of-thought, hidden reasoning, arbitrary metadata bag, raw message body, or delivery body copy. Use **sentinel strings** in fixtures and assert their absence; assert each event is **ref-only** (every payload ref passes `assertRefOnly`; the primary ref is kind+id+role only).

**Side-effect** (defining): the factories are **pure** — assert they do not call a provider/transport/`validateDraft`/render/review/delivery sink (use throwing spies wired nowhere — the factories take no such collaborators), do not `save` automatically (a throwing repository is never reached), do not retry/schedule/mutate, and that reading/replaying recorded events triggers nothing.

---

## 10. Persistence / Review / Delivery / Event rules

Implementation 024 must **not**: create an event bus / scheduler / retry / queue / broker / telemetry-eval infra / production DB-schema; alter provider live-call gates, credential resolution, validation, rendered-message record creation, review behavior, display-eligibility rules, or delivery behavior; cause delivery / provider calls / validation from event recording.

---

## 11. Negative Capability (structurally impossible / test-failing)

An event payload containing a raw draft / prompt / payload / secret / env value / chain-of-thought / arbitrary bag; event creation calling a provider / validator / delivery; event recording triggering retry/scheduler; event recording creating evidence or mutating athlete/understanding/decision-support; a delivery-success event becoming an athlete decision; a provider-success event becoming recommendation quality; a provider-failure event invalidating domain output; a credential-failure event logging a secret/env key/value; an SDK/dependency appearing; an event-bus/queue/scheduler module appearing; a DB/schema/migration appearing; an import-boundary violation (`event-recording` importing a domain/provider/delivery module, or those auto-importing `event-recording`).

---

## 12. Boundary Rules

`event-recording` **owns** the event vocabulary and stays **dependency-neutral** (imports only `shared-kernel`); the factories reference rendering/delivery artifacts by **string `kind`+`id`**, never by import. `rendering`/`delivery`/the provider path **must not** auto-emit events as side effects and **must not** import `event-recording`. No upstream module becomes dependent on `event-recording` for core behavior. Do not weaken guards broadly; extend the event-recording fixtures additively for the new catalog entries.

---

## 13. Validation Strategy (tests before implementation; negatives defining)

1. the catalog has the 8 additive event types (with correct module/category/primaryKind); 2. the 5 additive artifact kinds; 3. the 2 additive producing modules (`isProducingModule` accepts them); 4. a provider-attempt event references the attempt record id only; 5. a validation-failure event is raw-free and creates no rendered record; 6. a validation-passed event is raw-free and asserts no quality; 7. a rendered-message-record event references the record id only; 8. a review event references review id + record id + reason code only; 9. a display-eligibility event delivers nothing; 10. delivery request/outcome events reference delivery ids and retry nothing; 11. credential-resolution events deferred (or, if added, redacted/raw-free); 12. factories do not save automatically; 13. factories call no provider/transport/validator/delivery sink; 14. reading/replaying events creates no side effect; 15. no raw draft/prompt/payload/secret/env value in serialized event state; 16. no event-bus/scheduler/queue/telemetry/DB module; 17. import boundaries intact (`event-recording` imports only `shared-kernel`); 18. **package/lockfile unchanged**; 19. **all Impl 001–023 tests continue to pass** (≈547).

The negative tests are defining tests.

---

## 14. Open Questions (carried forward, non-blocking)

A future event bus (if ever); read-model projection; operational correlation ids; production telemetry; provider event records beyond this surface; model evaluation; delivery-provider integration; production DB/schema; live smoke tests; whether a neutral `RenderingRequest`/`ProviderRenderingRequest` artifact kind is later worth adding so provider events need no pre-existing attempt record. None resolved beyond this slice.

---

## 15. Relationship to Existing Architecture

- **Spec/Impl 023–019:** the credential chain + live boundary + provider seam exist; **event recording observes them, never drives them**.
- **Spec/Impl 018:** the provider-attempt audit is the id'd primary for provider events; it stays raw-free and explicit.
- **Spec/Impl 015/016:** rendered-message record/review/display + delivery records supply the id'd artifacts events reference.
- **Spec/Impl 011:** the `DomainEventRecord`, ref-only `EventPayloadRef`, traceability envelope, and append-only repository are reused **unchanged** (only the catalogs grow, additively).
- **Spec/Impl 013:** a provider response is **not source material** unless separately reported by the athlete.

Clarifications: event recording is **explicit application composition** — not provider logic, not rendering validation, not review, not delivery, not retry/scheduler, not domain reasoning, not an athlete decision, not evidence creation.

---

## 16. Implementation Task Preview

**Implementation 024 — Add ref-only provider/rendering/delivery occurrence event surface**

Acceptance criteria:
- **additive catalog entries only** — 8 `DomainEventType` (PascalCase) + catalog entries, 5 `EventArtifactKind`, 2 `ProducingModule` (`rendering`/`delivery`); no member removed/changed;
- **pure ref-only event factories** in `event-recording/application` that return records and **persist nothing**;
- **no raw draft/prompt/payload/secret/env value** in any event (ref-only `EventPayloadRef`; sentinel-absence tests);
- **no event bus / retry / scheduler / queue / telemetry / model-eval / DB-schema**;
- **no provider/delivery side effect**, no automatic persistence, no evidence creation, no domain mutation;
- `event-recording` stays **dependency-neutral** (imports only `shared-kernel`); rendering/delivery/provider unchanged and never auto-emit;
- **no SDK/dependency change** (`package.json`/lockfile unchanged);
- all existing tests remain green (≈547), and the new event-surface + negative-capability tests pass.

---

## 17. Technical Constraints

TypeScript strict; Node native test runner; no external test framework; no framework; no DB; no event bus; no scheduler; no queue; no telemetry/model-eval infra; no SDK dependency; no default live network; no CI credentials; no prompt templates as production code; no raw secrets. No constructor parameter properties (the factories are plain functions). `import type` where appropriate. Explicit field declarations. No arbitrary payload bags; no raw-bag rehydration without validation. Event-surface tests must be deterministic (injected ids + timestamps).

---

## 18. Success Criteria

After this tech spec, Implementation can add a ref-only provider/rendering/delivery occurrence event surface **without** introducing raw content, side effects, retries, delivery triggers, evidence creation, domain mutation, or infrastructure.

The implementation must answer:

> "Can Aurora record provider, rendering, review/display, and delivery occurrences as ref-only event/outcome records while preventing raw content, secrets, side effects, retries, delivery triggers, evidence creation, and domain mutation?"

— and, by the additive catalog expansion (string-literal kinds/modules + PascalCase types + catalog entries), the pure ref-only factories that persist nothing and import no domain module, the unchanged Impl 011 ref-only/inert discipline, and the defining no-raw + side-effect tests, the answer is **yes**.
