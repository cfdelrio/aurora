# Aurora — Specification 025 — Explicit Application Orchestration Boundary

> Phase: **Specification** (behavioral; no code).
> Builds on: `024-provider-rendering-delivery-event-surface.md`, `016-delivery-boundary.md`, `015-rendered-message-review-persistence.md`, `014-llm-rendering-boundary.md`, `017`–`023` (provider seam / audit / real-provider / credential chain), `011-domain-event-outcome-records-traceability-envelope.md`, `013-manual-input-adapter.md`.
> Output of this document: a behavioral contract for the **smallest explicit application composition boundary** that may coordinate provider rendering, validation, provider-attempt audit, rendered-message record/review/display eligibility, delivery, and occurrence-event recording — while preserving every existing boundary. **No code, no new module decision, no event bus, no scheduler, no retry engine, no workflow engine, no telemetry/model-evaluation, no DB/schema, no SDK, no live smoke test.**

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation.

- `[FACT]` This document describes **behavior**. It names the **candidate** orchestration steps and their ordering rules; it defines no module, no types, no file layout, no implementation, and resolves no technical placement (deferred to 025A).
- `[DECISION]` Spec 025 opens **one** edge only: a **thin, explicit, ordered composition** of *already-existing* application services. It **coordinates boundaries; it does not dissolve them**, add reasoning, or introduce any runtime that makes a step happen on its own.

---

## 1. Context

Aurora's implemented surfaces (Impl 001–024) are all present and individually proven:

- core reasoning modules: `observation`, `reasoning`, `understanding`, `decision-support`, `athlete`;
- `event-recording` (append-only, ref-only `DomainEventRecord` log) **+ the additive provider/rendering/delivery occurrence event factories (Impl 024)**;
- `rendering`: the deterministic boundary + **mandatory `validateDraft({ draft, renderable, request })`**, the provider seam (`requestProviderRendering`), the **real-provider-ready** async path (`requestRealProviderRendering` → `ProviderRenderOutcome`), the **raw-free provider-attempt audit** (`auditProviderAttempt` → `ProviderAttemptRecord`), the **rendered-message record** (`RenderedMessageRecord.fromRenderedMessage(...)` / `.fromFailedOutcome(...)`), the **render review** (`renderReview(...)`), and **derived `displayEligibilityOf(record)`**;
- `delivery`: `deliveryRequest(...)` / `deliveryEligibilityCheck(...)` / **`requestDelivery(...)` → `DeliveryRecord`**, gating on `displayEligibilityOf` and the closed `DeliveryTarget` (only `test-sink`);
- the credential chain (fail-closed, opt-in): `StaticProviderCredentialResolver` / `EnvironmentProviderCredentialResolver` / `ProcessEnvironmentCredentialSourceAdapter`, behind the disabled-by-default `LiveCallPolicy`, with `process.env` sealed to one approved file.

Current validation after Impl 024 docs: `tsc --noEmit` clean; full suite `563/563`.

`[GAP]` **There is no explicit composition boundary.** Every piece above can be *called*, but **who composes them — and in what order, with what failure handling — is unspecified and exists today only implicitly**: in tests and the neutral `src/modules/__tests__/` harnesses, composition is ad-hoc and test-scoped. There is **no production-intended, behaviorally-specified seam** that says "render → validate → audit → record → review → display → deliver → record occurrences," nor one that guarantees each of those steps stays **explicit, ordered, fail-closed, ref-only, raw-free, and non-domain-authoritative**. Spec 025 specifies that behavioral contract. **It changes no module and chooses no placement** (new module vs. existing — deferred to 025A).

---

## 2. Central Question

> How can Aurora add an **explicit application orchestration boundary** that coordinates the already-existing rendering, provider, audit, review, display, delivery, and event-recording surfaces — so that **each step remains an explicit, ordered call, fail-closed, ref-only where appropriate, raw-free, and non-domain-authoritative** — **without** becoming a workflow engine, event bus, scheduler, retry engine, hidden side effect, automatic delivery, or recommendation-quality judge?

---

## 3. Core Principle

`[DECISION]` **Application orchestration coordinates boundaries. It does not dissolve them.** For this slice:

```text
orchestration = explicit composition (existing services, called in a defined order)
orchestration ≠ domain reasoning        orchestration ≠ event bus
orchestration ≠ scheduler               orchestration ≠ retry engine
orchestration ≠ workflow engine         orchestration ≠ hidden side effect
orchestration ≠ automatic delivery      orchestration ≠ recommendation-quality judgment
```

`[DECISION]` The orchestrator may call **existing** application services **in a defined order**. It must make **no** step implicit; it must let **no** event (or repository save) cause the next step; it must treat **provider success as not evidence** and **delivery success as not athlete understanding/decision**. The authority model is unchanged: **`validateDraft` is the only thing that turns a provider draft into a `RenderedMessage`**, display eligibility is **derived not asserted**, and delivery consumes **only** display-eligible records.

`[ASSUMPTION]` The smallest useful boundary is a **single, synchronous, deterministic, explicit composition** that (a) calls existing services in order, (b) stops safely at the first failing/blocking step, (c) optionally records occurrence events **after** the steps they describe (never before, never as a trigger), and (d) returns a **result and/or a ref-only trace** — adding **no** new domain decision of its own.

---

## 4. Scope / Non-Scope

**In scope (behavioral):** ordering, explicitness, fail-closed, and ref-only/raw-free rules for a future composition boundary that *may* coordinate — (1) rendering-request creation, (2) provider client invocation through the existing rendering boundary, (3) provider-draft validation through the existing `validateDraft`, (4) provider-attempt audit through the existing raw-free audit, (5) rendered-message record persistence, (6) render-review creation, (7) display-eligibility derivation, (8) delivery request + outcome, (9) provider/rendering/delivery occurrence-event recording, (10) explicit failure handling / safe stop points, (11) ref-only traceability across artifacts. May describe **candidate** steps behaviorally; must not implement them.

**Out of scope (this spec):** implementing code; live smoke tests; an event bus / queue / broker; a workflow engine; a scheduler / background jobs; automatic retry; a telemetry platform; model evaluation; production analytics; DB schema / migrations; UI / API; delivery-provider integration; SDK installation; prompt templates; **changing** provider, validation, review/display, or delivery behavior; treating provider output as evidence; treating events as commands; choosing the orchestrator's **module placement / return shape / transactional semantics** (deferred to 025A, §14).

---

## 5. Existing Artifacts To Reference (accurately)

The orchestrator composes these — it adds none of their logic.

- **Provider rendering (Impl 017/019):** sync `requestProviderRendering(...)` and async **`requestRealProviderRendering(...)` → `ProviderRenderOutcome`**; both reuse the unchanged `providerRenderingRequestFrom` guard and end at the **mandatory `validateDraft(...)`**. Provider output is an **untrusted draft**; only `validateDraft` yields a `RenderedMessage`. Live calls run only behind a non-default `LiveCallPolicy` and a resolved credential — otherwise the path **fails closed** (`provider-unavailable` / `missing-credential` / `invalid-credential`).
- **Provider-attempt audit (Impl 018):** observe-only **`auditProviderAttempt(...)` → `ProviderAttemptRecord`** (+ id), `rawDraftRetained: false`; it **does not call** the provider/`requestProviderRendering`/`validateDraft`; port + in-memory adapter.
- **Rendered-message record / review / display (Impl 014/015):** `RenderedMessage`/`RenderOutcome`; **`RenderedMessageRecord.fromRenderedMessage(...)` / `.fromFailedOutcome(...)`** (+ `RenderedMessageRecordId`); **`renderReview(...)` → `RenderReview`** (+ id, closed decision/reason catalogs, display-safety only); **derived `displayEligibilityOf(record)` → `DisplayEligibility`**; repository ports + in-memory adapters.
- **Delivery (Impl 016):** `deliveryRequest(...)` (+ `DeliveryRequestId`), `deliveryEligibilityCheck(...)`, **`requestDelivery(...)` → `DeliveryRecord`** (+ id, closed `DeliveryOutcome`/`DeliveryFailureReason`); verifies eligibility via `displayEligibilityOf` (**never re-derives**); calls the deterministic test sink **only** when eligible *and* the target is the supported `test-sink`; **success/failure is an exposure audit, not evidence/decision**.
- **Occurrence events (Impl 011/024):** the eight **pure, ref-only** factories — `providerAttemptRecordedEvent`, `providerDraftValidationFailedEvent`, `providerDraftValidationPassedEvent`, `renderedMessageRecordedEvent`, `renderReviewRecordedEvent`, `displayEligibilityDerivedEvent`, `deliveryRequestRecordedEvent`, `deliveryOutcomeRecordedEvent` — each **returns** a `DomainEventRecord` (via `DomainEventRecord.record(...)`) and **persists/triggers nothing**; payloads obey the ref-only `EventPayloadRef` discipline.
- **Credential chain (Impl 021–023):** injected `ProviderCredentialResolver` family; the credential is **operational and transient** — never persisted/audited/logged, never in an event/trace; `process.env` is read in **one approved file** only.

`[FACT]` A provider response is **not source material** unless the athlete separately reports it via the manual adapter (Impl 013). Orchestration changes nothing about that.

---

## 6. Required Orchestration Rules (behavioral)

`[DECISION]` A future orchestration boundary must obey **all** of:

1. **Every step is an explicit call.** No step runs as a side effect of another.
2. **No event causes the next step.** Occurrence events are descriptive history, never control flow.
3. **No repository save causes the next step.** Persisting a record triggers nothing.
4. **Provider output must pass the existing `validateDraft` before becoming a `RenderedMessage`** — the orchestrator never constructs a message from an unvalidated draft.
5. **A `RenderedMessage` is recorded (Impl 015) before review/display/delivery** wherever existing rules require a persisted record as the subject of review/eligibility/delivery.
6. **Review / display eligibility gates delivery** — delivery is reachable only through a display-eligible record.
7. **Delivery consumes only display-eligible records** (verified via `displayEligibilityOf`, never re-derived by the orchestrator).
8. **The provider-attempt audit stays raw-free** and is invoked **only by explicit composition** (it is never automatic).
9. **Occurrence-event recording stays ref-only and explicit** — recorded **after** the step it describes, by an explicit call, never as a trigger.
10. **Failure at any step stops or returns a safe outcome; it never retries automatically** and never escalates to a different, more assertive path.
11. **No step mutates `athlete` / `understanding` / `reasoning` / `decision-support`** state. (Any such domain workflow remains a separate, explicit domain operation outside this orchestration.)
12. **Delivery success creates no `AthleteDecision`.**
13. **Provider success creates no `Evidence`** (and no `Signal`/`Hypothesis`/`Understanding`).
14. **Reading event/trace history re-runs no orchestration** — history is inert.
15. **Credentials remain operational** and never enter the audit, an event, persisted state, the trace, or any raw output.

`[ASSUMPTION]` **Partial composition is first-class.** An application may compose a *prefix* of the flow (e.g. render + audit only, no delivery); skipping a step produces **no** artifact or event for the skipped step. Orchestration imposes the *ordering and gating* rules above, not a mandatory all-the-way-to-delivery path.

### Candidate explicit flow (illustrative; 025A refines)

Each arrow is an **explicit application call**, not an automatic transition:

```text
RenderableDomainOutput
  → (build) RenderingRequest
  → requestRealProviderRendering(...)            → ProviderRenderOutcome   [fail-closed if disabled/uncredentialed]
  → auditProviderAttempt(...)                    → ProviderAttemptRecord   [explicit, raw-free; only if provider path used]
  → if rendered: RenderedMessageRecord.fromRenderedMessage(...)            [explicit persist]
  → optionally: renderReview(...)                → RenderReview            [explicit]
  → derive displayEligibilityOf(record)          → DisplayEligibility      [explicit, derived]
  → if eligible: requestDelivery(...)            → DeliveryRecord          [explicit; only display-eligible]
  → record occurrence events explicitly          (provider/validation/record/review/display/delivery)
```

`[FACT]` Crucially: the flow is **not automatic**; **events may be recorded after steps but never trigger steps**; **delivery is not automatic just because display eligibility is true**; **review is not automatic just because a record exists**; **audit is not automatic unless explicitly composed**; a **provider/validation failure stops before rendered-message-record creation**; a **display-ineligible** result stops before delivery.

---

## 7. Required Distinctions (do not collapse)

orchestration ≠ domain reasoning · orchestration ≠ workflow engine · orchestration ≠ event bus · orchestration ≠ retry/scheduler · orchestration ≠ delivery automation · explicit composition ≠ hidden side effect · provider success ≠ evidence · provider validation pass ≠ recommendation quality · rendered-message record ≠ display permission · display eligibility ≠ automatic delivery · delivery success ≠ athlete understanding · delivery success ≠ athlete decision · event recording ≠ event triggering · provider-attempt audit ≠ provider event · audit record ≠ event record · event record ≠ repository command · traceability refs ≠ raw content storage · partial composition ≠ broken flow · safe stop ≠ retry.

---

## 8. Required No-Raw & Traceability Rules

`[DECISION]` The orchestrator's **trace state** (anything it returns or links) is **ref-only**.

**Allowed refs (ids / safe summaries already permitted by the owning model):** `ProviderAttemptRecordId`, `RenderedMessageRecordId`, `RenderReviewId`, `DeliveryRequestId`, `DeliveryRecordId`, the occurrence-event record id, the source renderable-output / decision-support-output ref **if safe and already existing**, and a status/outcome **reason code**.

**Forbidden in orchestration trace state (and in any event it records):** a raw provider draft; a raw provider response; a provider prompt/payload; a credential token; a secret; a process-env **value**; a process-env **key** if unsafe; chain-of-thought; hidden reasoning; an arbitrary metadata bag; the **full rendered-message / delivery body** **unless** it is already part of a safe persisted artifact referenced **by id**; raw athlete-sensitive input beyond existing safe refs.

`[FACT]` Occurrence events recorded by the orchestrator inherit the Impl 011/024 ref-only `EventPayloadRef` discipline unchanged (`kind`+`id`+`role?`+`ownerModule?`; no `payload`/`data`/`metadata`). The orchestrator copies **no** state into the event or trace that the underlying artifact does not already expose safely by reference.

---

## 9. Required Failure Semantics

- **Provider unavailable** → safe orchestration stop; no record/review/delivery; no provider-success event.
- **Live policy disabled** → fail closed **before transport**; no transport call; no record/delivery.
- **Credential missing/invalid** → fail closed **before transport**; no transport call; no record/delivery.
- **Provider transport failure** → safe stop **before** rendered-message-record creation.
- **Provider draft validation failure** → safe stop **before** rendered-message-record creation; any event/audit is **raw-free**.
- **Rendered-message-record persistence failure** → safe stop **before** review/delivery.
- **Review rejection** → **no delivery** (display eligibility is ineligible).
- **Display ineligible** → **no delivery**.
- **Delivery failure** → recorded as a delivery outcome; **no automatic retry**.
- **Event-recording failure** → must **not** retroactively invalidate the domain / provider / render / delivery outcome **unless** 025A deliberately chooses transactional semantics later; it must **not** mutate domain state.
- **Audit failure** → must **not** leak a raw draft/prompt/payload/secret; it must not corrupt the rest of the result.

`[DECISION]` Every failure is a **safe stop or a safe partial outcome**, never an automatic retry, never an escalation to a more assertive path, never a domain mutation.

---

## 10. Required Use Cases (Given / When / Then)

**UC1 — Successful explicit composition to delivery.** *Given* a renderable domain output and all gates pass, *when* orchestration explicitly calls rendering, audit, persistence, review/display, delivery, and event recording, *then* each artifact is created **only** by its explicit step and all traceability is by **safe refs**.

**UC2 — Live policy disabled.** *Given* `LiveCallPolicy` is disabled, *when* orchestration attempts provider rendering, *then* the provider path **fails closed before transport** and **no** rendered-message record, review, delivery, or provider-success event is created.

**UC3 — Credential missing.** *Given* credential resolution fails, *when* orchestration attempts provider rendering, *then* **no transport call occurs** and **no** rendered-message record or delivery is created.

**UC4 — Provider draft validation fails.** *Given* a provider returns a draft that fails `validateDraft`, *when* orchestration runs, *then* **no** rendered-message record is created and any event/audit is **raw-free**.

**UC5 — Review rejection.** *Given* a rendered-message record exists but review rejects it, *when* orchestration reaches display/delivery, *then* display eligibility is **ineligible** and **no delivery** occurs.

**UC6 — Delivery fails.** *Given* display eligibility allows delivery but the sink fails, *when* orchestration requests delivery, *then* the **delivery failure is recorded** and **no retry** is triggered.

**UC7 — Event-recording failure.** *Given* a prior step succeeded but occurrence-event recording fails, *when* orchestration handles the failure, *then* the event failure **does not mutate domain state** and **does not imply** provider/render/delivery failure unless 025A explicitly defines transactional semantics.

**UC8 — Audit / event separation.** *Given* a provider-attempt audit record exists, *when* an occurrence event is also recorded, *then* the **audit record and the event record remain distinct artifacts** (neither is the other).

**UC9 — Read history.** *Given* an orchestration trace/event history is read later, *when* a replay/check process inspects it, *then* **no** provider/render/review/delivery action is triggered.

**UC10 — Partial composition.** *Given* an application wants rendering + audit but **not** delivery, *when* it composes only those steps, *then* **no** delivery record and **no** delivery event exist.

---

## 11. Acceptance Criteria

- Given each successful step → the next step occurs **only** by an explicit call.
- Given a provider failure → **no** rendered-message record is created.
- Given a validation failure → **no** rendered-message record is created.
- Given a review rejection → **no** delivery occurs.
- Given a display-ineligible result → **no** delivery occurs.
- Given a delivery failure → **no** retry occurs.
- Given event recording → **no** downstream action is triggered.
- Given event/trace history read → **no** replay side effect occurs.
- Given audit and event recording → both remain **distinct and raw-free**.
- Given an orchestration trace → it contains **safe refs only** (no raw draft/prompt/payload/secret/env value).
- Given live policy disabled / credential missing → the provider path fails closed **before transport**.
- Given a future implementation → **all Impl 001–024 tests remain green**.

---

## 12. Explicit Forbidden Behaviors

The future boundary must forbid: hidden side effects between steps; an event bus / queue / scheduler; automatic retry; automatic delivery; an event-triggered provider call / rendering / validation / review / delivery; provider success creating evidence; provider failure invalidating domain output; a validation pass proving recommendation quality; delivery success creating an `AthleteDecision`; delivery failure triggering retry; orchestration mutating `athlete` / `understanding` / `reasoning` / `decision-support`; orchestration storing a raw draft/prompt/payload/secret/env value; orchestration copying a full message body into trace state when it is not already a safe persisted artifact referenced by id; SDK/dependency additions; production DB/schema decisions; telemetry/model-evaluation infrastructure.

---

## 13. Validation Strategy (defining tests for the future implementation)

`[DECISION]` The **negative tests are defining**. A future implementation must prove: orchestration steps are **explicit** (a step does not run unless called); provider failure stops **before** record/review/delivery; validation failure stops **before** record/review/delivery; review rejection stops delivery; display-ineligible stops delivery; delivery failure does **not** retry; event factories **do not trigger** the next step; occurrence events are recorded **only** by an explicit orchestration call; audit and event records remain **distinct**; trace state contains **safe refs only** with **no** raw draft/prompt/payload/secret/env value; **no** event bus/scheduler/queue; **no** telemetry/model evaluation; **no** DB/schema/migration; **package/dependency unchanged**; **import boundaries remain intact**; reading history triggers no side effect; and **all Impl 001–024 tests stay green**.

---

## 14. Open Design Questions (for 025A — do not resolve here)

1. Whether orchestration lives in a **new application module** or inside an existing module.
2. Whether a **new top-level `application` module** is acceptable (vs. composing within `rendering`/`delivery` application layers, vs. a neutral seam).
3. Whether orchestration owns a **repository** of its own (likely not — it composes existing ports).
4. Whether orchestration returns a **trace object** or only a **result union**.
5. Whether **event-recording failure** fails the whole orchestration or is returned as a **partial failure**.
6. Whether **audit failure** fails the whole orchestration.
7. Whether **review is required before delivery** in every orchestration path, or only some.
8. Whether **manual review** is separate from automated eligibility.
9. Whether orchestration supports a **provider-disabled fallback** to the deterministic fake renderer.
10. Whether to support **rendering-only orchestration** before delivery orchestration (partial composition).
11. Whether a **correlation id** is needed (and whether it stays ref-only/non-secret).
12. Whether **transactional semantics** (all-or-nothing across steps) are needed later.
13. Whether a future **live smoke test** composes *through* this boundary or remains separate.

`[QUESTION]` These are carried forward; none blocks this behavioral spec. Technical implementation choices are not resolved here.

---

## 15. Relationship to Existing Architecture

- **Spec/Impl 024:** the provider/rendering/delivery occurrence event surface exists as **pure ref-only factories** — orchestration records occurrences by **calling them explicitly**, after the steps they describe.
- **Spec/Impl 023:** the process-env adapter exists; secret binding is **operational and one-file confined** — orchestration never reads `process.env` and never holds a secret.
- **Spec/Impl 022:** the environment resolver **classifies** the credential source — orchestration consumes a resolution, it does not classify.
- **Spec/Impl 021:** the opt-in live-provider boundary exists, **fail-closed** — orchestration honors `LiveCallPolicy` and stops safely when disabled/uncredentialed.
- **Spec/Impl 020:** the selected-provider shell + serializer/parser/error-mapper exist — orchestration calls the client, it does not reshape payloads.
- **Spec/Impl 019:** the async `ProviderClientBoundary` exists — orchestration calls `requestRealProviderRendering`, ending at `validateDraft`.
- **Spec/Impl 018:** the provider-attempt audit remains **raw-free and explicit** — orchestration composes it explicitly, never automatically.
- **Spec/Impl 017:** the provider seam exists; provider drafts are **untrusted** — orchestration never trusts a draft pre-validation.
- **Spec/Impl 014:** only validated drafts become a `RenderedMessage` — orchestration never bypasses the validator.
- **Spec/Impl 015:** rendered-message record/review/display eligibility exist — orchestration persists/reviews/derives by explicit calls.
- **Spec/Impl 016:** delivery request/outcome records exist — orchestration delivers **only** display-eligible records and never re-derives eligibility.
- **Spec/Impl 011:** event/outcome records + the traceability envelope exist (ref-only, inert) — orchestration adds no event behavior of its own.
- **Spec/Impl 013:** a provider response is **not source material** unless separately reported by the athlete — orchestration changes nothing about ingestion.

Clarifications: orchestration **coordinates** existing boundaries; it does **not** replace them, and it is **not** domain reasoning, **not** event recording itself, **not** delivery, **not** provider logic, **not** review, **not** retry/scheduler, **not** model evaluation.

---

## 16. Success Criteria

When this spec is complete, **025A** (Technical Spec) should be able to answer:

> "Can Aurora **explicitly compose** provider rendering, validation, audit, records, review/display, delivery, and event recording while keeping **every step explicit, ordered, fail-closed, ref-only where appropriate, raw-free, and non-domain-authoritative**?"

— and by the orchestration rules (§6), the no-raw/traceability rules (§8), the failure semantics (§9), and the defining negative tests (§13), the answer is **yes**: a thin, explicit, ordered composition calls existing services in turn, stops safely at the first failure/block, records occurrences only by explicit ref-only calls **after** their steps, never lets an event or a save trigger the next step, never retries or delivers automatically, never mutates domain state, and never turns provider/delivery success into evidence or an athlete decision — with the boundary's **placement, return shape, and transactional semantics** deferred to 025A. If the spec cannot answer that, it is incomplete.
