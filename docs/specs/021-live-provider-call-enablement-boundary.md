# Aurora — Specification 021 — Live Provider Call Enablement Boundary

> Phase: **Specification** (behavioral; no code).
> Builds on: `020-real-provider-adapter-implementation-boundary.md` (+ `-tech.md`), `019-real-provider-integration-boundary.md`, `018-provider-attempt-audit-boundary.md`, `017-provider-adapter-boundary.md`, `014-llm-rendering-boundary.md`.
> Output of this document: a behavioral contract for the **first explicitly opt-in live provider call** — what becomes possible, what stays forbidden, and the gate that must hold before any byte leaves the process. **No code, no SDK, no network call, no real secret, no production prompt template, no event-catalog change, no guard weakened.**

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation.

- `[FACT]` This document describes behavior. It defines no types, no file layout, no SDK choice, no env-variable names — those belong to **021A** (Technical Spec) and the implementation slice.
- `[DECISION]` Spec 021 opens **one** edge only: making a provider call *able to be live*, under explicit opt-in, behind the existing seam. It does **not** open delivery, events, telemetry, retries, or a UI/API.

---

## 1. Context

Aurora's implemented modules: `observation`, `reasoning`, `understanding`, `decision-support`, `athlete`, `event-recording`, `rendering`, `delivery`. The output-out edge is mature and fully fake/deterministic:

- a deterministic rendering boundary + the mandatory `validateDraft({ draft, renderable, request })` (Impl 014);
- rendered-message record/review persistence + derived display eligibility (Impl 015);
- a downstream `delivery` boundary with a deterministic test sink + audit records (Impl 016);
- a provider adapter **seam** inside `rendering` with a deterministic `FakeProviderAdapter` (Impl 017);
- a raw-free **provider-attempt audit** (`ProviderAttemptRecord`; `rawDraftRetained` literal `false`) + repository port + in-memory adapter (Impl 018);
- a **real-provider-ready** async `ProviderClientBoundary` + deterministic `FakeProviderClient`, operational `ProviderSecretRef`s, structured `ProviderInstruction`, `ProviderOperationalFailure` mapped **down** to the existing `ProviderFailure`, and async `requestRealProviderRendering(...)` (Impl 019);
- a **selected-provider adapter shell** inside `rendering/application` — `ConcreteProviderClient` (disabled by default) + deterministic `serializeProviderInstruction` / `parseProviderResponse` / `mapProviderError`; **OpenAI selected at the doc/decision level (020A) only**; production/test code kept **vendor-neutral** (`concrete-provider-*`) (Impl 020).

The synchronous seam is untouched. What does **not** exist: a real provider SDK, network calls, **live provider calls**, API keys / a real secret mechanism, environment-variable reads in code, production prompt templates, provider event records, UI/API, scheduler/event bus, production DB.

Implementation 020 prepared exactly this shape (the **fixture transport** is the only non-default behavior, and it is test-only):

```text
RenderingRequest + RenderableDomainOutput
  → providerRenderingRequestFrom(...)
  → ProviderInstruction
  → concrete-provider serializer            (serializeProviderInstruction)
  → ConcreteProviderClient                  (disabled by default; fixture transport in tests)
  → concrete-provider parser / error mapper (parseProviderResponse / mapProviderError)
  → ProviderClientResponse
  → ProviderDraftOutcome
  → validateDraft(...)                       (the unchanged gate)
  → ProviderRenderOutcome
  → optional raw-free ProviderAttemptRecord  (explicit composition only)
```

`[FACT]` The current state is **selected-provider shell, not live provider integration.** The shell has every part *except* the one thing Spec 021 governs: an actual, opt-in, real I/O call to a provider.

---

## 2. Central Question

> How can Aurora enable a **first live provider call** only under **explicit opt-in** conditions without letting SDKs, network calls, environment reads, credentials, prompt payloads, provider responses, logs, metadata, retries, or errors become **source truth, evidence, persistence, review, delivery, events, or domain mutation**?

---

## 3. Core Principle

`[DECISION]` **A live provider call is operational I/O. It does not change Aurora's authority model.**

- The provider remains **only a draft source**.
- The existing **`ProviderClientBoundary`** remains the boundary — a live client is just another implementation of it.
- The existing **`validateDraft`** remains the gate — a live draft becomes a `RenderedMessage` only by passing it.
- Provider output remains **untrusted**.
- Provider payloads are a **constrained serialization of already-approved instruction material** (`ProviderInstruction`), never arbitrary prompt text.
- Provider **credentials remain outside** domain, audit, persistence, logs, and errors.
- Provider **metadata remains operational** (never evidence/athlete state).
- Provider **failures degrade to safe non-rendering**.
- Provider **attempts remain auditable without raw draft, prompt, payload, or secret retention**.
- **Live calls are disabled by default.** No live call may run in the default test suite or CI.
- A live call may **never** create records, review, display eligibility, delivery, events, retries, or domain mutation — unless a *later* spec explicitly defines that boundary.

---

## 4. Scope / Non-Scope

**In scope (behavioral):** live-call enablement behavior; opt-in live-call policy; credential-access boundary; environment/config boundary; the SDK-vs-HTTP *decision* boundary (deferred to 021A, but its constraints are set here); network-failure behavior; request-payload safety; response handling; provider-metadata handling; failure mapping; test isolation; safe-disable behavior; relationship to the concrete-provider shell, `ProviderClientBoundary`, and the provider-attempt audit; no-side-effect rules.

**Out of scope (this spec):** implementing code; installing a package; making a real call; provisioning secrets; choosing a production deployment mechanism; creating prompt-template files; prompt optimization; streaming; automatic retries; queues/background jobs; billing/cost-enforcement implementation; telemetry infrastructure; model evaluation; UI/API; delivery changes; production DB/schema; event-catalog implementation; event bus.

---

## 5. What changes vs Implementation 020 — and what stays forbidden

**Changes (the entire delta this spec authorizes):**
- A provider client *may* be **capable of a real call** — but only behind the existing `ProviderClientBoundary`, only when the **live-call gate** (§7) passes, and only as **operational I/O**.
- An **approved credential boundary** *may* resolve a credential for that call. Whether the first implementation reads from the environment/config or whether that is deferred to 021A is an **open question (§14)** — this spec only fixes the *rules* such a boundary must obey.
- Live-call behavior (timeout / rate-limit / network failure / refusal / malformed) *may* be exercised against a **real** endpoint — but its outcomes must map onto the **existing** failure surfaces (§11).

**Stays exactly as in Impl 020 (unchanged, non-negotiable):**
- The seam, the async boundary, the serializer/parser/error-mapper, the audit, and `validateDraft` are unchanged contracts.
- Vendor stays **doc-level**; code stays **vendor-neutral**; **no negative-capability guard is weakened**; **no vendor token leaks into a guarded file**.
- The default state is **disabled** — Impl 020's disabled-by-default behavior remains the default; live is the **opt-in exception**, never the baseline.
- `ProviderFailure` is **not expanded**; the event catalog is **not expanded**.
- No automatic persistence/review/display-eligibility/delivery/event/retry/domain mutation.

---

## 6. What "opt-in" means

`[DECISION]` **Opt-in is an explicit, caller/environment-supplied enablement that is absent by default and must be affirmatively present for any live call to occur.**

- **Absent by default:** with no opt-in, the live-capable client behaves exactly like the Impl 020 disabled shell — it performs **no external call** and returns a safe failure.
- **Explicit, not inferred:** opt-in is a deliberate signal (a policy flag / configuration toggle / explicit parameter — mechanism deferred to 021A), never implied by the presence of a credential, a config file, or a network being reachable.
- **Narrow:** opt-in enables *the live call*; it does **not** enable persistence, delivery, events, retries, or any side effect.
- **Reversible (safe-disable):** turning opt-in off returns the system to the disabled-default behavior with **no domain-behavior change** — the only difference is whether a live call is attempted; the gate, the validator, the outcome shape, and all invariants are identical either way.
- **CI/default-suite-safe:** the default test suite and CI run with opt-in **absent**, so they never make a live call and never require a credential.

---

## 7. Required Live-Call Gate

`[DECISION]` Before **any** live call may occur, **all** of the following must be true. If **any** condition fails, Aurora returns **safe non-rendering** (a `ProviderRenderOutcome` failure mapped onto the existing surfaces — §11):

1. A provider has been **explicitly selected** (recorded at the decision level — OpenAI, per 020A).
2. The call path is **behind `ProviderClientBoundary`**.
3. Live calls are **disabled by default**.
4. The caller/environment **explicitly opts in** (§6).
5. A credential is available through an **approved credential boundary** (§9 `CredentialBoundary`).
6. A **missing** credential maps to safe failure.
7. An **invalid** credential maps to safe failure.
8. **Default tests do not make live calls.**
9. **CI does not require credentials.**
10. The provider payload is produced **only** by the approved serializer (`serializeProviderInstruction`).
11. The provider response is parsed into **`ProviderClientResponse`** (existing union).
12. The provider draft still passes through **`validateDraft`**.
13. The provider-attempt audit remains **raw-free** if composed.
14. **No** automatic persistence/review/display/delivery/event occurs.
15. Live calls can be **disabled without changing domain behavior**.

`[FACT]` The gate is **fail-closed**: the safe path is "no live call, safe failure," and any uncertainty (missing opt-in, missing/invalid credential, unconstructable payload) resolves to it. Conditions checkable *before* the call (1–10) must be checked before any byte leaves the process; conditions about the *result* (11–14) govern how a returned response/error is handled.

---

## 8. Domain Rules To Preserve (invariants)

`[DECISION]` This spec preserves every invariant the prior slices established. At minimum:

1. Live provider output is **not** domain authority.
2. Live provider output is **not** `TerminalOutput`.
3. Live provider output is **not** `DecisionSupport`.
4. Live provider output is **not** `Recommendation`.
5. Live provider output is **not** `Evidence`.
6. Live provider output is **not** `Observation`.
7. Live provider output is **not** `Understanding`.
8. Live provider output is **not** `AthleteDecision`.
9. Live provider output is **not** a `RenderedMessage` until it passes `validateDraft`.
10. Provider metadata is **not** evidence.
11. Provider success does **not** validate recommendation quality.
12. Provider failure does **not** weaken `SupportQuality`.
13. Provider latency/cost/rate-limit/token-count is **not** athlete state.
14. The provider does **not** select or change `VoiceMode`.
15. The provider request must **not** expose raw private reasoning or chain-of-thought.
16. Provider payload serialization must **not** override domain constraints.
17. Provider output must pass the **same** mandatory validator as all other provider output.
18. Provider attempts must preserve the **no-raw-draft-retention** audit policy.
19. Provider secrets must **never** be domain data, persisted records, audit payloads, logs, errors, or tests.
20. Live provider integration must **not** create review, display eligibility, delivery, events, retries, or domain mutation as side effects.

---

## 9. Key Concepts To Define (behavioral)

### `LiveProviderClient`
A concrete client capable of making a real provider call **only when explicitly enabled**.

- **May:** receive a `ProviderClientRequest`; obtain a credential through the approved `CredentialBoundary`; serialize the request payload through the approved serializer; perform the provider call **only if the opt-in gate passes**; parse the provider response; return a `ProviderClientResponse`.
- **Must not:** import domain modules; receive raw domain internals; receive chain-of-thought; receive arbitrary prompt strings; select `VoiceMode`; call `validateDraft` (the service owns validation); create a `RenderedMessage`; create records/review/display/delivery/events; persist provider output; mutate domain state.
- `[FACT]` It implements the **same `ProviderClientBoundary`** as the `FakeProviderClient` / `ConcreteProviderClient` — it is a sibling, not a new authority. When opt-in is absent it is behaviorally identical to the disabled shell.

### `LiveCallPolicy`
The policy governing whether live calls are allowed. Required defaults:
- **disabled by default**;
- **explicit opt-in required**;
- **disabled in CI / default tests**;
- **missing opt-in maps to safe failure**;
- **safe-disable must be possible** at the runtime/config boundary;
- **no domain behavior changes when disabled** (the outcome shape and all invariants are identical whether live is on or off).

### `CredentialBoundary`
The **only** place where credentials may be resolved. Rules:
- a raw credential must **not** be represented in domain types;
- must **not** be serialized into state;
- must **not** appear in audit;
- must **not** appear in errors;
- must **not** appear in tests;
- must **not** appear in logs;
- a **missing/invalid** credential maps to safe failure.

`[QUESTION]` This spec leaves to **021A** whether the *first* implementation may read from the environment/config, or whether environment access stays deferred behind an injected resolver. Either way, the rules above are absolute, and **`ProviderSecretRef` stays the only operational reference that crosses into the rendering surfaces** (status + opaque ref; never a raw key).

### `ProviderPayload`
The provider-specific request payload **derived from `ProviderInstruction`** (via the approved serializer).
- **May include:** approved rendering constraints, allowed claims, forbidden claims, uncertainty/limitation requirements, locale/style, terminal-output kind, selected voice.
- **Must not include:** arbitrary caller prompt; chain-of-thought; hidden reasoning; raw private reasoning; secrets; mutable aggregate handles; delivery/review/display state.

### `LiveProviderResponse`
The raw provider response **before parsing**. It is **untrusted**.
- **May contain:** draft text, operational metadata, provider-failure information.
- **Must not be:** persisted raw; used as evidence; used as a rendered message; used as review/display/delivery input; stored in the provider-attempt audit.

### `LiveProviderMetadata`
Operational data only: model/deployment id, request id, latency, token count, finish reason, rate-limit metadata, cost estimate.
- It is **operational only** — not athlete state, not evidence.
- It must **not** affect `VoiceMode`, support quality, recommendation quality, or domain confidence.
- `[FACT]` It maps onto the existing operational `ProviderClientMetadata` shape (Impl 019); it must never surface as a domain field on the outcome.

---

## 10. Required Use Cases (Given / When / Then)

**UC1 — Live calls disabled by default.** *Given* no explicit live-call opt-in exists, *when* provider rendering is requested through the live-capable client, *then* **no external call occurs** and Aurora returns a safe provider failure.

**UC2 — Missing credential.** *Given* live calls are explicitly enabled but the credential is missing, *when* provider rendering is requested, *then* **no external call occurs** (the credential is checkable before the call) and Aurora returns a safe provider failure.

**UC3 — Invalid credential.** *Given* live calls are enabled but the provider rejects the credential, *when* the provider error is handled, *then* Aurora maps it to a safe provider failure and **exposes no secret** in the error.

**UC4 — Safe live draft.** *Given* live calls are enabled and the credential is valid, *when* the provider returns safe draft text, *then* Aurora treats it as an **untrusted draft** and it must pass `validateDraft` before becoming a `RenderedMessage`.

**UC5 — Unsafe live draft.** *Given* the provider returns voice escalation, invented facts, or hidden uncertainty, *when* validation runs, *then* Aurora **rejects** the draft (`provider-output-failed-validation` + underlying `RenderingFailure[]`) and **does not retain raw draft text**.

**UC6 — Network timeout / rate-limit / unavailable.** *Given* the provider call times out, rate-limits, or fails, *when* handled, *then* Aurora maps it to the **existing** failure surfaces and produces safe non-rendering.

**UC7 — Provider payload injection attempt.** *Given* unsafe prompt/payload material is attempted, *when* the payload is constructed, *then* unsafe material is **rejected or excluded before any live call** (the serializer carries only structured, approved fields — there is no field for it).

**UC8 — Provider metadata remains operational.** *Given* the provider returns metadata, *when* handled, *then* the metadata remains operational and is **not** Evidence/Observation/Understanding/SupportQuality/athlete state/review/display/delivery.

**UC9 — Raw-free audit composition.** *Given* a live provider attempt is audited, *when* `auditProviderAttempt(...)` records it, *then* it records a **safe summary / failure reasons only** and **never** raw draft, prompt, payload, secret-leaking metadata, or credentials.

**UC10 — Default suite remains deterministic.** *Given* tests run in CI or local default mode, *when* the full suite runs, *then* **no live call occurs**, **no credential is required**, and deterministic tests prove the live-call gate and failure behavior.

---

## 11. Failure Mapping

`[DECISION]` Live-call conditions map onto the **existing** surfaces — **no new failure type, no `ProviderFailure` expansion**:

| Live condition | existing `ProviderOperationalFailure` | → existing `ProviderFailure` |
|---|---|---|
| live calls disabled / no opt-in | `provider-unavailable` | `provider-unavailable` |
| missing credential | `missing-credential` | `provider-unavailable` |
| invalid credential | `invalid-credential` | `provider-unavailable` |
| network unavailable | `provider-unavailable` | `provider-unavailable` |
| timeout | `provider-timeout` | `provider-timeout` |
| rate limit | `provider-rate-limited` | `provider-rate-limited` |
| provider refusal | `provider-refused` | `provider-refused` |
| empty response | `provider-returned-empty-response` | `provider-returned-empty-draft` |
| malformed response | `provider-returned-malformed-response` | `provider-returned-invalid-draft` |
| unsupported config | `unsupported-provider-config` | `provider-unavailable` |
| unknown / unclassified provider error | `provider-unavailable` (safe default) | `provider-unavailable` |

`[FACT]` An **unknown** provider error must map to the safe default **without leaking** the raw provider payload or any secret into the failure/message. A draft that *reaches the validator and fails* still maps to `provider-output-failed-validation` (with the underlying `RenderingFailure[]`), exactly as today.

---

## 12. Persistence / Review / Delivery / Event rules

A live provider call must **not**: create or save a `RenderedMessageRecord`; append a review; mark display-eligible; call delivery; create a `DeliveryRecord`; append an event record; expand the event catalog; create provider-attempt event records; trigger retry/scheduler; persist a provider attempt automatically; persist a raw provider response; persist a prompt payload; persist a secret. The live path ends at the returned `ProviderRenderOutcome`; any audit is an explicit, **raw-free** composition by the caller.

---

## 13. Explicit Forbidden Behaviors

This spec forbids: live calls enabled by default; default tests making live calls; CI requiring credentials; domain modules importing provider SDK/network/client code; provider code importing `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`; provider output bypassing `validateDraft`; provider output creating `TerminalOutput`; provider output selecting/changing `VoiceMode`; provider output creating `Recommendation`; provider output becoming `Evidence`/`Observation`/`Understanding`/`AthleteDecision`; a provider prompt containing chain-of-thought; a provider payload exposing raw private reasoning; arbitrary caller prompt reaching the provider; provider metadata becoming a domain signal; provider success validating support quality; provider failure invalidating domain output; provider failure triggering automatic retry/scheduler; a provider call creating event records / rendered-message records / review / display / delivery; secrets persisted in records; secrets logged or in errors; raw unsafe draft retained in audit; raw provider payload retained; live provider integration changing delivery behavior; **and weakening any structural guard or leaking a vendor token into a guarded provider file**.

---

## 14. Validation Strategy (defining tests for the future implementation)

`[DECISION]` The **negative tests are defining**. The future implementation must prove (deterministically, with **no credentials and no network** in the default suite):

1. live calls disabled by default;
2. default tests make no network call;
3. CI requires no credentials;
4. missing credential → safe failure;
5. invalid credential → safe failure;
6. timeout → safe failure;
7. rate-limit → safe failure;
8. malformed response → safe failure;
9. empty response → safe failure;
10. provider-specific errors map to the existing operational failures;
11. a safe provider draft passes **only** through the validator;
12. a provider draft cannot bypass validation;
13. voice escalation rejected;
14. invented fact rejected;
15. hidden uncertainty rejected;
16. payload injection rejected/excluded **before** the call;
17. provider metadata remains operational, not evidence;
18. provider-attempt audit retains **no** raw draft/prompt/payload/secret;
19. provider success creates **no** record/review/display/delivery/event automatically;
20. provider failure does **not** mutate the domain;
21. **no** automatic retry/scheduler/event bus;
22. secrets not persisted/logged/exposed in errors;
23. boundary/import tests (provider files stay inside `rendering`; vendor-neutral; no SDK/network/env token in guarded files; no SDK package dependency);
24. **all existing tests from Implementations 001–020 continue to pass.**

`[DECISION]` If any **live-call smoke test** ever exists (against a real endpoint), it must be **explicitly opt-in and excluded from the default suite** — it never runs in CI by default and never gates the build. (Whether such a test exists at all is an open question — §15.)

---

## 15. Relationship to Existing Architecture

- **Spec/Impl 020:** the selected-provider **shell** exists and live calls are **disabled**; Spec 021 only adds the *ability* to go live behind the same shell + boundary.
- **Spec/Impl 019:** the async **`ProviderClientBoundary`** exists; the live client is just another implementation of it; the **sync seam stays untouched**.
- **Spec/Impl 018:** provider attempts are audited **raw-free**; live attempts audit the same way, by explicit composition.
- **Spec/Impl 017:** the provider seam exists and provider drafts are **untrusted**; a live draft is equally untrusted.
- **Spec/Impl 014:** only validated drafts become a `RenderedMessage` — `validateDraft` stays mandatory.
- **Spec/Impl 015:** only validated `RenderedMessage`s may become rendered-message records — a live call creates none.
- **Spec/Impl 016:** delivery only consumes display-eligible records; **provider success does not deliver**.
- **Spec/Impl 011:** event records are occurrence history, **not provider commands**; a live call appends none.
- **Spec/Impl 013:** a provider response is **not source material** unless separately reported by the athlete.

Clarifications: live provider integration **remains behind `rendering`**; provider output is **draft text only**; `validateDraft` is **mandatory**; the provider-attempt audit stays **raw-free**; provider metadata stays **operational**; live provider integration is **not** delivery, **not** eventing, **not** model evaluation, **not** domain reasoning.

---

## 16. Open Questions (carried forward, non-blocking)

Whether **021A** installs an SDK or uses an HTTP client; the exact secret-management mechanism; exact environment-variable naming; the exact live opt-in mechanism; timeout limits; retry policy; rate-limit behavior; streaming support; provider-metadata retention; cost/billing limits; prompt-material storage; localization quality; model evaluation; production telemetry; provider event records; whether any **live-call smoke test** exists outside the default suite. None of these is resolved here; none blocks this behavioral spec.

---

## 17. Success Criteria

When this spec is complete, **021A** (Technical Spec) should be able to answer:

> "Can Aurora enable an explicitly opt-in live provider call without letting SDKs, network calls, credentials, prompts, provider responses, metadata, retries, logs, or errors become authority, evidence, persistence, review, delivery, events, or domain mutation?"

— and by the gate (§7), the preserved invariants (§8), the failure mapping (§11), and the defining negative tests (§14), the answer is **yes**: a live call is operational I/O behind the unchanged `ProviderClientBoundary` and the unchanged `validateDraft`, disabled by default, credential-free in CI, raw-free in audit, and side-effect-free in the domain. If the spec cannot answer that, it is incomplete.
