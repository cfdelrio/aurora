# Aurora — Specification 022 — Environment Secret Resolver Boundary

> Phase: **Specification** (behavioral; no code).
> Builds on: `021-live-provider-call-enablement-boundary.md` (+ `-tech.md`), `020-real-provider-adapter-implementation-boundary.md`, `019-real-provider-integration-boundary.md`, `018-provider-attempt-audit-boundary.md`, `017-provider-adapter-boundary.md`, `014-llm-rendering-boundary.md`.
> Output of this document: a behavioral contract for the **first environment/config credential resolver** — what becomes possible, what stays forbidden, and the gate that must hold before an environment-derived secret may be used. **No code, no API key, no live call, no SDK, no dependency, no production prompt template, no event-catalog change, no broad guard weakening.**

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation.

- `[FACT]` This document describes behavior. It names no environment variable, defines no types, picks no secret manager, writes no file layout — those belong to **022A** (Technical Spec) and the implementation slice.
- `[DECISION]` Spec 022 opens **one** edge only: making a credential *resolvable from environment/config* behind the existing `ProviderCredentialResolver` port. It does **not** enable live calls, provision secrets, choose a cloud secret manager, or open delivery/events.

---

## 1. Context

Aurora's implemented modules: `observation`, `reasoning`, `understanding`, `decision-support`, `athlete`, `event-recording`, `rendering`, `delivery`. The provider edge is fully built and fail-closed: the rendering boundary + mandatory `validateDraft` (014); rendered-message record/review + display eligibility (015); the `delivery` boundary + test sink (016); the provider seam + `FakeProviderAdapter` (017); the raw-free provider-attempt audit (018); the real-provider-ready async `ProviderClientBoundary` + `FakeProviderClient` + operational `ProviderSecretRef` + `ProviderOperationalFailure → toProviderFailure` (019); the selected-provider shell — `ConcreteProviderClient` + deterministic serializer/parser/error-mapper, vendor doc-level (020); and the **opt-in live-provider boundary** — `LiveProviderClient`, `LiveCallPolicy` (disabled by default), an **injected `ProviderCredentialResolver`** with a deterministic `StaticProviderCredentialResolver`, and native `fetch` isolated in exactly one approved file `live-provider-http-transport.ts` (021).

What does **not** exist: an **environment resolver**, any `process.env` read, a real secret manager, API keys, a real SDK / dependency, production prompts, provider events, UI/API, scheduler/event bus, production DB.

Implementation 021 prepared exactly this shape (the `ProviderCredentialResolver` is **injected** — the static one returns a non-secret sentinel):

```text
ProviderClientRequest
  → LiveProviderClient
  → LiveCallPolicy gate
  → ProviderCredentialResolver          ← Spec 022 supplies the first ENVIRONMENT implementation here
  → serializeProviderInstruction(...)
  → LiveProviderHttpTransport           (the only network file)
  → parseProviderResponse(...) / mapProviderError(...)
  → ProviderClientResponse
  → RealProviderAdapter
  → ProviderDraftOutcome
  → validateDraft(...)                  (the unchanged gate)
  → ProviderRenderOutcome
  → optional raw-free ProviderAttemptRecord
```

`[FACT]` The current state is **live-call capable but not production-secret capable.** The credential resolver port exists and is injected, but the only implementation is a deterministic test sentinel. Spec 022 governs the first implementation that may touch a *real* secret source.

---

## 2. Central Question

> How can Aurora add an environment/config credential resolver without letting `process.env`, raw credentials, secret variable names, secret values, logs, errors, tests, audit records, persistence, live-call policy, transport invocation, or domain state become part of Aurora's **domain model or authority chain**?

---

## 3. Core Principle

`[DECISION]` **A secret resolver is an operational boundary. It supplies a credential transiently to the provider transport path; it creates no domain fact and changes no authority.**

A resolver:
- **may** supply a credential transiently to the provider transport path;
- **does not** create domain facts; **does not** create evidence; **does not** enable live calls by itself; **does not** validate provider output; **does not** persist secrets; **does not** audit secrets; **does not** log secrets; **does not** alter `VoiceMode`, support quality, reasoning, athlete state, delivery, or events.

The resolver answers only one question:

```text
Is a credential available for this provider boundary right now?
```

- If **yes** → it returns an **opaque transient credential token** to the application path (the same `ProviderCredentialToken` the transport already consumes).
- If **no** → it returns a safe **missing / invalid** credential result.

---

## 4. Scope / Non-Scope

**In scope (behavioral):** environment/config credential-resolution behavior; secret-variable naming policy; raw-secret handling; secret-redaction rules; missing/empty/malformed credential behavior; relationship to `ProviderCredentialResolver`, `LiveProviderClient`, `LiveCallPolicy`, `LiveProviderHttpTransport`, and the provider-attempt audit; the structural-guard strategy for `process.env`; the deterministic test strategy; no-side-effect rules.

**Out of scope (this spec):** implementing code; provisioning real secrets; choosing a cloud secret manager; deploying/rotating secrets; installing SDKs; changing dependencies; making live calls; enabling live calls by default; live smoke tests; prompt templates; production telemetry; model evaluation; UI/API; delivery changes; event-catalog implementation; event bus; production DB/schema.

---

## 5. What changes vs Implementation 021 — and what stays forbidden

**Changes (the entire delta this spec authorizes):**
- A new `ProviderCredentialResolver` implementation **may read a credential from environment/config** — through an **explicitly approved boundary** (one file), reading **one explicitly configured variable name**, **transiently**.
- That resolver **may** return `available` with an opaque transient token derived from the real secret — but the token is the same operational handle the transport already takes, never the raw secret exposed to anything else.

**Stays exactly as in Impl 021 (unchanged, non-negotiable):**
- The `ProviderCredentialResolver` port, `LiveProviderClient`, `LiveCallPolicy`, `LiveProviderHttpTransport`, the serializer/parser/error-mapper, the audit, and `validateDraft` are unchanged contracts.
- **Live calls remain disabled by default** — resolving a credential does **not** enable a live call (the `LiveCallPolicy` is a separate, explicit, fail-closed gate).
- **No SDK / dependency / lockfile change**; **no prompt template**; `ProviderFailure` / `ProviderOperationalFailure` **not expanded**; the event catalog **not expanded**.
- The native-network token stays sealed in `live-provider-http-transport.ts`; the credential resolver is **not** a network file.

---

## 6. Required Secret Resolver Gate

`[DECISION]` Before an **environment-derived** credential may be used, **all** of the following must be true. If **any** condition fails, Aurora **fails closed before transport** or produces a **safe credential failure**:

1. The resolver lives behind **`ProviderCredentialResolver`**.
2. The resolver is inside an **explicitly approved application boundary**.
3. Environment access is **isolated to exactly one approved file** (if allowed at all).
4. The secret variable name is **explicit** and **not inferred from domain data**.
5. The raw secret is read **only transiently**.
6. An **empty** credential maps to a safe **missing/invalid** failure.
7. A **malformed** credential maps to a safe **invalid** failure.
8. The raw secret is **never** returned in errors.
9. The raw secret is **never** returned in audit.
10. The raw secret is **never** persisted.
11. The raw secret is **never** logged.
12. The raw secret is **never** included in provider metadata.
13. **Default tests do not require** the real environment variable.
14. **CI does not require** a real credential.
15. The **live-call policy remains separate and disabled by default**.

`[FACT]` The gate is **fail-closed**: the safe path is "no environment scan / no transport / safe credential failure," and any uncertainty (no approved name, missing/empty/malformed value, unconfigured boundary) resolves to it. Conditions 1–5 and 13–15 are structural/configuration constraints checked before any read; 6–12 govern how a read result is handled.

---

## 7. Domain Rules To Preserve (invariants)

`[DECISION]` This spec preserves every invariant the prior slices established. At minimum:

1. A credential is **not** domain data.
2. A credential is **not** `Evidence`.
3. A credential is **not** `Observation`.
4. A credential is **not** `Understanding`.
5. A credential is **not** `AthleteDecision`.
6. A credential is **not** `DecisionSupport`.
7. A credential is **not** `RenderedMessage`.
8. A credential is **not** provider metadata.
9. A credential is **not** provider-attempt audit payload.
10. A credential is **not** traceability evidence.
11. Secret **availability does not enable live calls** by itself.
12. Secret **absence does not invalidate** domain output.
13. Secret **failure does not weaken** support quality.
14. Secret **names do not derive** from athlete/domain values.
15. Secret **values do not appear** in logs/errors/tests/docs examples.
16. Credential resolution **does not call the provider**.
17. Credential resolution **does not call `validateDraft`**.
18. Credential resolution **does not create** records/review/display/delivery/events.
19. Credential resolution **does not mutate** domain state.
20. Credential resolution **does not expand `ProviderFailure`**.

---

## 8. Key Concepts To Define (behavioral)

### `EnvironmentProviderCredentialResolver`
An implementation of `ProviderCredentialResolver` that **may read from environment/config**.
- **May:** read **one** explicitly configured environment key; validate presence; validate a simple credential shape (if defined); return `available`/`missing`/`invalid`; return an **opaque transient credential token**.
- **Must not:** read arbitrary environment variables; infer env-var names from domain input; expose a raw secret in its public result; persist a raw secret; log a raw secret; audit a raw secret; create provider attempts; call the transport; call the provider; call `validateDraft`; change the live-call policy; mutate domain state.
- `[FACT]` It implements the **same `ProviderCredentialResolver` port** as `StaticProviderCredentialResolver` — a sibling implementation, injected exactly where the static one is today. When unconfigured it behaves like a safe failure (it never scans).

### `SecretNamePolicy`
Defines the allowed secret variable name.
- The secret env-var name **must be explicit**; **no dynamic construction** from athlete/domain/provider response; **no fallback scan** over the environment; **no list of alternative variables** unless explicitly justified; the variable name itself is **operational config, not domain data**.

### `CredentialResolution`
A **closed** result (the existing `ProviderCredentialResolution` shape): `available` (with opaque transient token) · `missing` · `invalid`.
- It must **not** carry a raw secret in any failure; must **not** carry a raw secret in stringified form; must **not** expose the secret through equality/debug helpers.

### `OpaqueCredentialToken`
The application-layer value used **only** to call the transport (the existing `ProviderCredentialToken`).
- **Transient**; **not serializable into state**; **not** included in audit; **not** included in errors; **not** included in metadata; **not** exposed to domain modules.

### `SecretRedactionPolicy`
Defines what must **never** appear in: errors · audit summaries · provider-attempt records · rendered messages · logs · tests · docs examples · snapshots.
- **Required:** the raw secret never appears; bearer/auth-like prefixes never appear in user-facing errors; error messages use **stable, non-secret reason codes** (the existing `ProviderOperationalFailure` members).

---

## 9. Required Use Cases (Given / When / Then)

**UC1 — Env resolver not configured.** *Given* the environment resolver is constructed without an approved variable name, *when* resolution is attempted, *then* it returns a safe **invalid-configuration** failure and **no environment scan** occurs.

**UC2 — Missing environment value.** *Given* the approved variable name is configured but absent, *when* resolution runs, *then* it returns **missing** and **no transport call** occurs.

**UC3 — Empty environment value.** *Given* the approved variable exists but is empty/blank, *when* resolution runs, *then* it returns **invalid or missing** and **no transport call** occurs.

**UC4 — Malformed environment value.** *Given* the approved variable exists but fails the allowed credential shape, *when* resolution runs, *then* it returns **invalid** and **no transport call** occurs.

**UC5 — Available environment value.** *Given* the approved variable exists and passes validation, *when* resolution runs, *then* it returns **available** with an **opaque transient token** and **does not expose the raw secret** in errors, audit, logs, metadata, or state.

**UC6 — Credential available but live policy disabled.** *Given* a credential resolves successfully but `LiveCallPolicy` is disabled, *when* live provider rendering is requested, *then* **no transport call** occurs.

**UC7 — Credential available and live policy enabled.** *Given* a credential resolves successfully and live policy is explicitly enabled, *when* live provider rendering is requested, *then* the resolver may supply a transient credential to the transport, **but provider output remains untrusted and must pass `validateDraft`**.

**UC8 — Audit composition after credential use.** *Given* a provider attempt is audited after credential resolution, *when* `auditProviderAttempt(...)` records it, *then* **no raw credential, env-variable name, prompt payload, or raw provider response** is retained.

**UC9 — Default tests remain credential-free.** *Given* the full default suite runs in CI or local mode, *when* tests execute, *then* **no real environment variable is required** and **no live call** is made.

**UC10 — Structural guard catches env leakage.** *Given* any file outside the approved resolver contains `process.env`, *when* structural tests run, *then* the **suite fails**.

---

## 10. Acceptance Criteria

- Given no approved env-var name → the resolver **fails closed**.
- Given the env var missing → a **missing** credential result.
- Given the env var blank → a **missing/invalid** credential result.
- Given the env var malformed → an **invalid** credential result.
- Given the env var present → **only an opaque transient token** is produced.
- Given a credential resolves → **live calls remain disabled** unless `LiveCallPolicy` is enabled.
- Given live policy disabled → the transport is **not invoked** even with a credential.
- Given credential resolution fails → the transport is **not invoked**.
- Given error/audit/log output → the raw secret is **absent**.
- Given a provider attempt is audited → **no raw credential / env-var name / prompt / payload** is retained.
- Given default tests run → **no real credential or live call** is required.
- Given structural guards run → **`process.env` appears only in the approved resolver file** (if implemented).
- Given the future implementation runs → **all existing tests from Implementations 001–021 continue to pass**.

---

## 11. Explicit Forbidden Behaviors

This spec forbids: environment reads **outside** the approved resolver file; arbitrary environment scanning; dynamic env-var construction from domain data; a raw credential in a domain object / repository state / provider-attempt audit / event record / rendered message / delivery record / error message / logs / tests / docs examples; the secret resolver enabling live calls by itself; the secret resolver calling the provider transport / the provider / `validateDraft`; the secret resolver creating records/review/display/delivery/events; the secret resolver mutating domain state; a secret failure invalidating domain output; secret availability validating provider output; secret handling expanding `ProviderFailure`; **and broad weakening of structural guards**.

---

## 12. Validation Strategy (defining tests for the future implementation)

`[DECISION]` The **negative tests are defining**. The future implementation must prove (deterministically, with **no real environment variable and no network** in the default suite):

1. the env resolver is disabled/absent unless explicitly constructed;
2. a missing env var → missing credential;
3. a blank env var → missing/invalid credential;
4. a malformed env var → invalid credential;
5. an available env var → opaque token only;
6. the raw secret never appears in a resolution failure;
7. the raw secret never appears in a provider-client outcome;
8. the raw secret never appears in an audit record when composed;
9. the raw secret never appears in logs/errors/test snapshots;
10. credential availability does **not** enable a live call if the policy is disabled;
11. policy disabled prevents transport **even with** a credential;
12. credential failure prevents transport;
13. the default suite does **not** require a real env var;
14. CI does **not** require a credential;
15. `process.env` appears **only** in the approved resolver file;
16. **no SDK/dependency change**;
17. **no prompt-template files**;
18. **no persistence/review/display/delivery/event side effects**;
19. **all existing tests from Implementations 001–021 continue to pass.**

`[DECISION]` So the default suite can exercise resolution deterministically **without** depending on the real process environment, the technical spec should consider whether the resolver reads `process.env` **directly** (guard-isolated to one file) or accepts an **injected environment map** (testable with zero `process.env`). That choice is **022A's** (see Open Questions); either way the **gate and redaction rules above are absolute**.

---

## 13. Persistence / Review / Delivery / Event rules

The environment resolver must **not**: create/save a `RenderedMessageRecord`; append a review; mark display-eligible; call delivery; create a `DeliveryRecord`; append event records; expand the event catalog; create provider-attempt event records; trigger retry/scheduler; persist provider attempts automatically; persist a raw provider response; persist a prompt payload; **persist a secret**. Resolution ends at a `CredentialResolution`; everything downstream is the unchanged Impl 021 path.

---

## 14. Relationship to Existing Architecture

- **Spec/Impl 021:** the opt-in live-provider boundary exists with an **injected** `ProviderCredentialResolver`; Spec 022 supplies the first **environment** implementation of that port — nothing else in the live path changes.
- **Spec/Impl 020:** the selected-provider shell + serializer/parser/error-mapper exist and are reused unchanged.
- **Spec/Impl 019:** the async `ProviderClientBoundary` exists; the resolver feeds the same boundary.
- **Spec/Impl 018:** provider attempts are audited **raw-free**; a credential never enters that audit.
- **Spec/Impl 017:** the provider seam exists; provider drafts are **untrusted**.
- **Spec/Impl 014:** only validated drafts become a `RenderedMessage`.
- **Spec/Impl 015:** only validated `RenderedMessage`s may become records — credential resolution creates none.
- **Spec/Impl 016:** delivery only consumes display-eligible records; **provider success does not deliver**.
- **Spec/Impl 011:** event records are occurrence history, **not provider commands**; resolution appends none.
- **Spec/Impl 013:** a provider response is **not source material** unless separately reported by the athlete.

Clarifications: the secret resolver **remains behind `rendering/application`**; **credential availability is not live-call enablement**; provider output remains **draft text only**; `validateDraft` stays **mandatory**; the provider-attempt audit stays **raw-free**; secret handling is **not** delivery, **not** eventing, **not** model evaluation, **not** domain reasoning.

---

## 15. Open Questions (carried forward, non-blocking)

Exact environment variable name; exact credential-shape validation; whether the resolver accepts an **injected env map** or reads `process.env` directly (guard-isolated); whether a **production secret manager** replaces env later; secret rotation; deployment environment; live smoke tests outside the default suite; timeout limits; rate-limit behavior; streaming support; provider-metadata retention; cost/billing limits; production telemetry; provider event records. None resolved here; none blocks this behavioral spec.

---

## 16. Success Criteria

When this spec is complete, **022A** (Technical Spec) should be able to answer:

> "Can Aurora resolve a provider credential from environment/config without letting secrets, env access, variable names, logs, errors, audit records, persistence, live-call policy, transport invocation, or domain state become part of Aurora's authority model?"

— and by the resolver gate (§6), the preserved invariants (§7), the redaction policy (§8), and the defining negative tests (§12), the answer is **yes**: the resolver is an operational boundary behind the unchanged `ProviderCredentialResolver` port, `process.env` is sealed in one approved file, the secret is read transiently and never enters domain/audit/persistence/logs/errors/tests, live calls stay separately gated and disabled by default, and `validateDraft` remains the authority. If the spec cannot answer that, it is incomplete.
