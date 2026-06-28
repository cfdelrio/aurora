# Aurora — Specification 024 — Provider / Rendering / Delivery Event Surface

> Phase: **Specification** (behavioral; no code).
> Builds on: `011-domain-event-outcome-records-traceability-envelope.md`, `018-provider-attempt-audit-boundary.md`, `017-provider-adapter-boundary.md`, `014-llm-rendering-boundary.md`, `015-rendered-message-review-persistence.md`, `016-delivery-boundary.md`, `019`–`023` (real-provider/credential chain).
> Output of this document: a behavioral contract for **which provider / rendering / review-display / delivery occurrences Aurora may record as ref-only event/outcome records**, and the rules that keep those records inert. **No code, no event-catalog change, no event bus, no retry/scheduler, no telemetry, no DB/schema.**

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation.

- `[FACT]` This document describes behavior. It names **candidate** event categories behaviorally; it defines no types, no catalog entries, no file layout, no implementation.
- `[DECISION]` Spec 024 opens **one** edge only: the **occurrence-history** of the output-out chain (provider → rendering → review/display → delivery). It records *that things happened*; it makes *nothing happen*.

---

## 1. Context

Aurora's implemented modules: `observation`, `reasoning`, `understanding`, `decision-support`, `athlete`, `event-recording`, `rendering`, `delivery`. The provider/credential chain is **complete end-to-end and fail-closed** (Impl 014–023):

```text
process.env → ProcessEnvironmentCredentialSourceAdapter → EnvironmentCredentialSource
  → EnvironmentProviderCredentialResolver → ProviderCredentialResolution
  → LiveProviderClient → LiveCallPolicy → LiveProviderHttpTransport → ProviderClientResponse
  → RealProviderAdapter → ProviderDraftOutcome → validateDraft(...) → ProviderRenderOutcome
  → optional raw-free ProviderAttemptRecord
```

Each boundary stays separate: reading the environment classifies nothing; classifying a credential enables no live call; a live call validates no output; a provider draft is not a message; a message is not delivered without review + display eligibility. Persistence exists for the **provider-attempt audit** (Impl 018), the **rendered-message record/review** (Impl 015), and **delivery records** (Impl 016) — each a port + in-memory adapter, raw-free where applicable.

`[FACT]` The **event surface is intentionally incomplete**: Aurora can *persist* attempt/render/delivery records, but there is **no behavioral specification** for which provider/rendering/review/display/delivery **occurrences** should become ref-only event/outcome records, how they reference existing artifacts, or how they stay inert. The Impl 011 `event-recording` log exists but its **closed catalogs are scoped to the reasoning core** (see §3 `[GAP]`).

---

## 2. Central Question

> How can Aurora record provider, rendering, review/display, and delivery occurrences as **traceable event/outcome records** without making events cause **retries, deliveries, reviews, domain mutations, evidence creation, or authority over recommendation quality**?

---

## 3. Core Principle

`[DECISION]` **Events record that something happened. Events do not make something happen.** For this slice:

```text
event = ref-only occurrence history
event ≠ command          event ≠ retry trigger     event ≠ delivery trigger
event ≠ evidence         event ≠ quality judgment  event ≠ domain mutation
event ≠ raw provider content store
```

Provider output remains an **untrusted draft**; a validated rendered output remains a **presentation artifact**; delivery success remains an **exposure audit**. **None of these becomes evidence that a recommendation was correct.**

`[GAP]` **The existing `event-recording` catalogs cannot represent this surface today.** The closed `DomainEventType` catalog and the closed `EventArtifactKind` set (Impl 011) cover only `observation`/`reasoning`/`understanding`/`decision-support`/`athlete` artifacts — there is **no** `RenderedMessageRecord`, `RenderReview`, `DisplayEligibility`, `DeliveryRequest`, `DeliveryRecord`, or `ProviderAttemptRecord` artifact kind, and **no** `rendering`/`delivery` producing module. Realizing this surface will therefore require **additive** catalog/artifact-kind/producing-module entries (and/or adapter functions near rendering/delivery) — **all deferred to 024A**. **Spec 024 changes no catalog**; it only specifies the behavior those future entries must obey. The Impl 011 discipline (append-only, ref-only, inert, no copied state, no bus) is inherited unchanged.

---

## 4. Scope / Non-Scope

**In scope (behavioral):** rules for recording occurrences around (1) provider-attempt lifecycle, (2) provider client success/failure, (3) provider-draft validation success/failure, (4) rendered-message record creation, (5) render-review decision, (6) display-eligibility derivation/change, (7) delivery request accepted/rejected, (8) delivery outcome success/failure, (9) explicit audit composition between the provider-attempt audit and event recording, (10) ref-only traceability across these artifacts. May name **candidate** event/outcome names behaviorally; must not implement them.

**Out of scope (this spec):** event bus / queue / broker / scheduler / automatic retry / background jobs; telemetry platform; model evaluation; production analytics; DB schema / migrations; UI/API; delivery-provider integration; live-provider smoke test; SDK installation; prompt templates; changing provider or validation behavior; expanding provider-failure catalogs (unless strictly required behaviorally — it is not, this slice); treating provider output as evidence.

---

## 5. Existing Artifacts To Reference (accurately)

- **Event / Outcome (Impl 011):** one append-only `DomainEventRecord` over a **closed catalog** (categories `occurrence`/`outcome`); a `TraceabilityEnvelope` (records occurrence, not meaning); **ref-only `EventPayloadRef`** (`kind`+`id`+`role?`+`ownerModule?` only — no `payload`/`data`/`metadata` field; `assertRefOnly` rejects smuggled state); appending executes nothing; causation=lineage, correlation=grouping. **The catalog is scoped to the reasoning core today (§3 `[GAP]`).**
- **Provider attempt (Impl 018):** `ProviderAttemptRecord` (+ `ProviderAttemptRecordId`), `ProviderAttemptStatus`, `ProviderAttemptFailureReason`, `ProviderDraftSummary` with **`rawDraftRetained: false`**; repository port + in-memory adapter; **observe-only `auditProviderAttempt(...)`** — **no raw draft/prompt/payload/secret**.
- **Rendering (Impl 014/015):** `RenderableDomainOutput`, `RenderingRequest`, `RenderedMessage`/`RenderOutcome`, closed `RenderingFailure`, mandatory `validateDraft(...)`; `RenderedMessageRecord` (+ `RenderedMessageRecordId`), `RenderReview` (+ `RenderReviewId`, closed decision/reason catalogs), derived `DisplayEligibility` + `displayEligibilityOf(...)`.
- **Delivery (Impl 016):** `DeliveryRequest` (+ `DeliveryRequestId`), `DeliveryRecord` (+ `DeliveryRecordId`), closed `DeliveryOutcome`/`DeliveryFailureReason`, `DeliveryEligibilityCheck`, `DeliverySink` + deterministic test sink; **delivery success/failure is an exposure audit, not evidence**.
- **Live provider / credentials (Impl 019–023):** `ProviderClientBoundary`, `LiveProviderClient`, `LiveCallPolicy` (disabled by default), the injected `ProviderCredentialResolver` + `StaticProviderCredentialResolver` + `EnvironmentProviderCredentialResolver` + `ProcessEnvironmentCredentialSourceAdapter` (the one `process.env` site); provider response remains **untrusted**; `validateDraft` remains **mandatory**; credential availability is **not** live-call enablement.

---

## 6. Required Event Surface Categories (behavioral)

For each: what the record **may reference** (ids/safe refs only) and what it **must not** contain.

### Category 1 — Provider Attempt Occurrence
Records that a provider attempt was requested or completed. **May reference:** the `ProviderAttemptRecordId` (if created), the rendering-request ref / renderable-output ref (if such a safe ref exists), the provider-client-boundary kind (operational label), a status/failure **reason code**, occurrence/timestamp metadata. **Must not include:** raw draft, raw provider response, provider prompt/payload, credential, process-env key/value, chain-of-thought, hidden reasoning, an arbitrary metadata bag.

### Category 2 — Provider Draft Validation Occurrence
Records that a provider draft passed or failed `validateDraft`. **Must distinguish:** draft produced · draft rejected by `validateDraft` · draft accepted into a `RenderedMessage`. **Must not imply:** the provider was correct · recommendation quality increased · athlete state changed · support quality changed.

### Category 3 — Rendered Message Record Occurrence
Records that a **validated** rendered message was persisted as a presentation artifact. **May reference:** `RenderedMessageRecordId`, the source rendered-message ref (if safe), review/display refs **only if already existing**. **Must not include** a raw unvalidated draft.

### Category 4 — Review / Display Occurrence
Records that a review decision was made or display eligibility was derived/changed. **May reference:** `RenderReviewId`, `RenderedMessageRecordId`, reviewer kind, review decision/reason code, the display-eligibility value. **Must not trigger delivery.**

### Category 5 — Delivery Request / Outcome Occurrence
Records that a delivery request was accepted/rejected and/or that a delivery outcome occurred. **May reference:** `DeliveryRequestId`, `DeliveryRecordId`, `RenderedMessageRecordId`, the delivery-target ref or safe target summary (only as already allowed by the delivery model), an outcome/failure reason. **Must not include** a raw message body if the existing delivery model avoids it; **must not imply** the athlete saw, accepted, understood, or benefited from the message.

### Category 6 — Explicit Composition Occurrence
Records that a higher-level application flow **intentionally composed** provider audit, render record, review, display, and delivery. **Must not imply:** automatic event propagation · an event bus · retry · a workflow engine · hidden side effects.

---

## 7. Required Distinctions (do not collapse)

provider-attempt event ≠ provider-attempt record · provider-attempt audit ≠ event recording · event record ≠ retry command · event record ≠ delivery command · delivery-outcome event ≠ successful coaching · rendered-message-record event ≠ recommendation correctness · review event ≠ display command · display-eligibility event ≠ delivery command · provider-validation-failure event ≠ domain failure · provider-success event ≠ evidence · event metadata ≠ raw payload bag · event traceability ≠ hidden chain-of-thought · event occurrence ≠ athlete understanding · delivery success ≠ athlete decision · provider failure ≠ domain-output invalidation · process-env-adapter event (if any) ≠ secret logging · credential-availability event (if any) ≠ live-call enablement.

---

## 8. Required No-Raw Rules

`[DECISION]` Event records must **never** contain: a raw provider draft; a raw provider response; a provider prompt/payload; a secret value; a process-env value; a process-env **key** if it could leak operational secrets; bearer/auth-like strings; chain-of-thought; hidden reasoning; an arbitrary provider metadata bag; the full rendered-message body **unless** it is already part of a safe persisted presentation artifact referenced by id; a delivery body copy **unless** already allowed by the delivery model; athlete-sensitive raw input beyond existing safe refs. **Events reference existing records by id/ref** — inheriting the Impl 011 ref-only `EventPayloadRef` discipline (no `payload`/`data`/`metadata` field; `assertRefOnly`).

---

## 9. Required Failure Semantics

- A **provider-failure** event does not invalidate domain output and creates no evidence.
- A **validation-failure** event does not create a rendered-message record.
- A **review-rejection** event does not delete the original record (unless an existing explicit command already does).
- A **display-ineligible** event does not trigger retry.
- A **delivery-failure** event does not retry automatically.
- A **delivery-success** event does not prove the athlete received/read/accepted the message.
- A **credential-failure** event (if recorded later) does not expose a secret or imply domain failure.

---

## 10. Required Use Cases (Given / When / Then)

**UC1 — Provider attempt audited and event-recorded.** *Given* a provider attempt is explicitly audited, *when* an application flow explicitly records an occurrence event, *then* the event references the provider-attempt record id and contains **no** raw draft/prompt/payload/secret.

**UC2 — Provider draft fails validation.** *Given* a provider draft fails `validateDraft`, *when* the validation occurrence is recorded, *then* the event records a **safe failure reason** and **does not** create a rendered-message record.

**UC3 — Provider draft passes validation.** *Given* a provider draft passes `validateDraft`, *when* the occurrence is recorded, *then* the event references the resulting rendered message / rendered-message record **only through safe refs**.

**UC4 — Render review rejected.** *Given* a rendered-message record is rejected by review, *when* the occurrence is recorded, *then* the event references the review id + reason code and **triggers no delivery**.

**UC5 — Display eligibility derived as ineligible.** *Given* display eligibility is derived as not eligible, *when* the occurrence is recorded, *then* the event records the state and **triggers no retry/delivery**.

**UC6 — Delivery succeeds.** *Given* delivery succeeds, *when* the outcome occurrence is recorded, *then* the event references the delivery record id + outcome and **does not** assert athlete understanding or decision.

**UC7 — Delivery fails.** *Given* delivery fails, *when* the outcome occurrence is recorded, *then* the event references the **safe failure reason** and **does not retry automatically**.

**UC8 — Credential unavailable.** *Given* credential resolution fails, *if* an occurrence is recorded, *then* it records only a **safe operational reason code** and **never** an env key/value/secret.

**UC9 — Explicit composition only.** *Given* provider audit, render record, review, display, and delivery all exist, *when* an application records their flow, *then* each occurrence is recorded **only by explicit calls** — no event creates the next artifact.

**UC10 — Reprojection / history reading.** *Given* event history is read later, *when* a replay/check process inspects it, *then* it can **explain what happened** but **cannot re-trigger** provider calls, rendering, review, or delivery.

---

## 11. Acceptance Criteria

- Given a provider-attempt record exists → an event may reference its id.
- Given a provider-attempt event exists → it contains no raw draft/prompt/payload/secret.
- Given a validation failure → no rendered-message record is created by the event.
- Given a review rejection → no delivery is triggered by the event.
- Given a delivery failure → no retry is triggered by the event.
- Given a delivery success → no athlete decision is inferred by the event.
- Given a credential failure → no env key/value/secret is recorded.
- Given event history → no provider call/retry/delivery happens from reading it.
- Given all event records → they are **ref-only and raw-free**.
- Given the future implementation → **all Impl 001–023 tests remain green**.

---

## 12. Explicit Forbidden Behaviors

Event records must not: contain a raw provider draft / raw provider response / provider prompt-payload / secret / env value / chain-of-thought / hidden reasoning / arbitrary metadata bag; cause a provider call; cause validation; cause rendered-message persistence; cause review/display/delivery; cause retry/scheduler; create evidence; mutate athlete state; change understanding; validate recommendation quality; expand provider-failure catalogs; require an SDK/dependency; require a production DB/schema decision; create an event bus/queue/broker.

---

## 13. Validation Strategy (defining tests for the future implementation)

`[DECISION]` The **negative tests are defining**. A future implementation must prove: event records reference ids only (ref-only); no raw draft/prompt/payload/secret; a provider-attempt event calls no provider; a validation event calls no validator; a render-record event creates no review; a review event changes no display (unless explicitly modeled); a display event delivers nothing; a delivery event retries nothing; reading/replaying event history triggers no side effect; a credential-failure event (if implemented) is redacted; a delivery-success event becomes no evidence/athlete decision; **package/dependency unchanged**; no event bus/scheduler/queue created; no import-boundary violation; **all Impl 001–023 tests stay green**.

---

## 14. Open Design Questions (for 024A — do not resolve here)

1. Whether the event surface is implemented as **additive new event kinds in the existing `event-recording` module** (expanding the closed catalog + `EventArtifactKind` + `ProducingModule` — §3 `[GAP]`) **or** as adapter functions near `rendering`/`delivery` that compose ref-only records.
2. Exact event names.
3. Exact id/ref shapes for provider attempt, render outcome, review, display, and delivery (new `EventArtifactKind`s).
4. Whether delivery-target refs need redaction / safe summaries.
5. Whether display-eligibility derivation should be event-recorded or only review/delivery.
6. Whether credential-resolution occurrence should be event-recorded at all.
7. Whether provider-attempt-audit record creation should itself emit an event or require explicit application composition.
8. Whether the `event-recording` repository should remain completely separate from the provider-attempt/render/delivery repositories.
9. Whether events are created before or after persistence commits in future orchestration.
10. Whether event ordering / correlation id is needed.
11. Whether event history should support read-model projection later.
12. Whether event records should include operational correlation ids.

---

## 15. Relationship to Existing Architecture

- **Spec/Impl 023:** the process-env adapter exists; secret binding is operational and one-file confined.
- **Spec/Impl 022:** the environment resolver classifies the credential source.
- **Spec/Impl 021:** the opt-in live-provider boundary exists.
- **Spec/Impl 020:** the selected-provider shell + serializer/parser/error-mapper exist.
- **Spec/Impl 019:** the async `ProviderClientBoundary` exists.
- **Spec/Impl 018:** provider-attempt audit remains **raw-free and explicit**.
- **Spec/Impl 017:** the provider seam exists; provider drafts are **untrusted**.
- **Spec/Impl 014:** only validated drafts become a `RenderedMessage`.
- **Spec/Impl 015:** rendered-message record/review/display eligibility exist.
- **Spec/Impl 016:** delivery request/outcome records exist.
- **Spec/Impl 011:** event/outcome records + the traceability envelope exist (ref-only, inert) — and their catalogs are **scoped to the reasoning core** (§3 `[GAP]`).
- **Spec/Impl 013:** a provider response is **not source material** unless separately reported by the athlete.

Clarifications: event recording remains behind **explicit application composition**; it is **not** provider logic, **not** rendering validation, **not** review, **not** delivery, **not** retry/scheduler, **not** domain reasoning, **not** an athlete decision, **not** evidence creation.

---

## 16. Success Criteria

When this spec is complete, **024A** (Technical Spec) should be able to answer:

> "Can Aurora record provider, rendering, review/display, and delivery occurrences as **ref-only event/outcome records** while preventing raw content, secrets, side effects, retries, delivery triggers, evidence creation, and domain mutation?"

— and by the categories (§6), the no-raw rules (§8), the failure semantics (§9), and the defining negative tests (§13), the answer is **yes**: occurrences are recorded as append-only, ref-only, inert records (reusing the Impl 011 discipline), referencing existing artifacts by id, never carrying raw content/secrets, never commanding the next step, and never becoming evidence or domain authority — with the catalog/artifact-kind expansion that realizing them requires deferred to 024A. If the spec cannot answer that, it is incomplete.
