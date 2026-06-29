# Aurora — Specification 029 — Cloud-Specific Secret Adapter Boundary

> Phase: **Specification** (behavioral; no code).
> Builds on: `028-production-secret-manager-boundary.md`, `028-production-secret-manager-boundary-tech.md`, `027-operator-live-smoke-entrypoint-boundary.md`, `026-live-provider-smoke-test-boundary.md`, `025-explicit-application-orchestration-boundary.md`, `024-provider-rendering-delivery-event-surface.md`, `023-direct-process-environment-adapter-boundary.md`, `022-environment-secret-resolver-boundary.md`, `021-live-provider-call-enablement-boundary.md`, `020-real-provider-adapter-implementation-boundary.md`, `019-real-provider-integration-boundary.md`, `018-provider-attempt-audit-boundary.md`, `017-provider-adapter-boundary.md`, `014-llm-rendering-boundary.md`, `015-rendered-message-review-persistence.md`, `016-delivery-boundary.md`, `011-domain-event-outcome-records-traceability-envelope.md`, `013-manual-input-adapter.md`.
> Output of this document: a behavioral contract for a **future cloud-specific managed-secret adapter** that implements the provider-neutral `ManagedSecretStoreClient` interface introduced in Impl 028 — what becomes possible, what stays forbidden, how cloud-specific failures must be handled safely, and how the adapter coexists with the existing seam without leaking secrets, coupling domain code to cloud infrastructure, enabling automatic live calls, weakening any existing guard, or claiming production rollout. **No code, no SDK installation, no cloud-provider selection (unless Option B is explicitly chosen and justified below), no dependency change, no real secrets, no CI credentials, no live calls, no production rollout, no retry/scheduler/event bus, no telemetry/model evaluation, no DB/schema.**

---

## 0. Phase Confirmation

This is the **Specification** phase — not Technical Specification (029A), not Implementation.

- `[FACT]` This document describes **behavior**. It defines the rules a future cloud-specific adapter must satisfy to implement `ManagedSecretStoreClient`; it defines no file layout, no SDK, no cloud provider identity, no IAM configuration, no deployment mechanism, and resolves no technical placement (deferred to 029A, §18).
- `[DECISION]` Spec 029 opens **one** edge only: making the `ManagedSecretStoreClient` seam backed by a **real cloud secret store** behind the `ManagedSecretCredentialSource` / `EnvironmentProviderCredentialResolver` chain already in place (Impl 028). It does **not** enable live calls, provision real secrets, choose a cloud SDK, change the operator smoke entrypoint, weaken the process-env seal, introduce source precedence logic, or open delivery/events.

---

## 1. Context

Documentation / Consolidation post Impl 028 is complete. Current validation: `tsc --noEmit` clean; `node --test` 672/672.

Aurora has a complete, individually-proven managed-secret credential-source seam (Impl 028) wired into the existing synchronous credential resolution and live-provider chain:

- **Provider-neutral managed-secret seam (Impl 028):**
  - `ManagedSecretStoreClient` — pure TypeScript async interface; `retrieve(secretName: string): Promise<ManagedSecretResolution>`; always resolves (never rejects); implementations must catch all exceptions internally; no cloud SDK; injected in all usage
  - `ManagedSecretResolution` — 4-state closed union: `{ status: "available"; value: string } | { status: "missing" } | { status: "invalid" } | { status: "unavailable" }`
  - `ManagedSecretCredentialSource` — async pre-fetch class; `toEnvironmentCredentialSource()` retrieves one configured secret, maps `available` → `{ [secretName]: value }` (the existing `EnvironmentCredentialSource` shape), non-`available` → `{}` → downstream resolver classifies as `missing` → no provider call
  - `FakeManagedSecretStoreClient` — deterministic test double; 4 scenarios; sentinel `"opaque:test-managed-secret"`; no real secret; no SDK; constructed explicitly
  - `ManagedSecretSourceConfig` — `{ secretName: string; storeClient: ManagedSecretStoreClient }`

- **Pre-fetch integration pattern (Impl 028 — downstream chain unchanged):**
  ```text
  await managedSecretSource.toEnvironmentCredentialSource()
    → EnvironmentCredentialSource map
    → new EnvironmentProviderCredentialResolver({ keyName, source })   ← synchronous; unchanged
    → ProviderCredentialToken (opaque, transient)
    → LiveProviderClient + LiveCallPolicy gate + LiveProviderHttpTransport (if policy enabled)
    → provider response → validateDraft → ProviderRenderOutcome
  ```

- **Credential resolution seam (Impl 021–023, unchanged):**
  - `ProcessEnvironmentCredentialSourceAdapter` — the **only** approved direct `process.env` read site inside `src/`; sealed by a repo-wide guard
  - `EnvironmentProviderCredentialResolver` — synchronous; classifies one injected key; unchanged
  - `StaticProviderCredentialResolver` — deterministic sentinel; unchanged
  - `LiveCallPolicy` — disabled by default; explicit opt-in; unchanged

- **Operator smoke (Impl 026/027, unchanged):**
  - `liveProviderSmoke(command, deps)` — pure, injected; redacted `LiveProviderSmokeResult`; at most one call; reads no `process.env`
  - `scripts/operator-live-smoke.mjs` — manual only; no npm script; uses `ProcessEnvironmentCredentialSourceAdapter → EnvironmentProviderCredentialResolver` chain; unchanged

`[FACT]` What does **not** exist: any cloud-specific implementation of `ManagedSecretStoreClient`; any cloud SDK dependency; any real secret retrieval; any network secret-manager call; any IAM/runtime identity configuration; any source-precedence mechanism; any CI-live lane; any production rollout.

`[GAP]` The provider-neutral seam is in place, but **only `FakeManagedSecretStoreClient` implements it**. A real cloud-backed adapter implementing `ManagedSecretStoreClient` does not exist. Until one does, Aurora's credential chain can be wired from the real process environment (via `ProcessEnvironmentCredentialSourceAdapter`) or from injected fakes (tests), but it has no path to retrieve a credential from a managed cloud secret store. Spec 029 defines the behavioral contract that any such adapter must satisfy — **without choosing a cloud provider, SDK, or deployment mechanism** (deferred to 029A), and **without changing any existing module, guard, resolver, smoke helper, operator script, or domain behavior**.

---

## 2. Central Question

> How can Aurora add a **cloud-specific managed-secret adapter** behind the `ManagedSecretStoreClient` interface introduced in Impl 028, without leaking secrets in any output or audit record, without coupling domain code to cloud infrastructure, without enabling automatic live calls, without weakening the existing `process.env` one-file seal, without changing the operator smoke entrypoint, and without choosing a cloud SDK, vendor, or deployment identity prematurely?

---

## 3. Core Principle

`[DECISION]` **A cloud adapter retrieves a credential; it does not authorize meaning, trust, or execution.**

A cloud-specific adapter implementing `ManagedSecretStoreClient`:
- **may** connect to an injected cloud secret store client; retrieve exactly the configured secret by its `secretName` reference; return the value as `{ status: "available"; value: string }` (raw string stays inside the `ManagedSecretCredentialSource` boundary); map all failure modes to safe `missing`/`invalid`/`unavailable` states
- **does not** call provider transport; call `validateDraft`; persist secrets; audit secrets; log secrets; change `LiveCallPolicy`; alter `VoiceMode`, support quality, reasoning, athlete state, delivery, or events; mutate domain state; import domain modules; expand any existing catalog

The distinctions that must not be collapsed:

```text
cloud adapter = implementation of ManagedSecretStoreClient
cloud adapter ≠ provider-neutral seam
cloud adapter ≠ production wiring / production rollout
cloud adapter ≠ live-call enablement
cloud adapter ≠ live-call gate
cloud adapter ≠ credential-policy override
cloud adapter ≠ operator opt-in
cloud adapter ≠ CI credential lane
cloud adapter ≠ provider trust
cloud adapter ≠ smoke success
cloud adapter ≠ validation pass
cloud adapter ≠ recommendation quality
cloud adapter ≠ evidence
cloud adapter ≠ athlete decision
cloud adapter ≠ delivery trigger
cloud adapter ≠ event recording
cloud adapter ≠ telemetry
cloud adapter ≠ model evaluation

secret ref ≠ secret value
cloud error body ≠ safe failure code
credential available ≠ LiveCallPolicy approval
credential available ≠ provider output trusted
cloud source unavailable ≠ domain failure
smoke passed ≠ product ready
```

Credential availability must remain separate from: opt-in · live policy · operator invocation · provider output validation · delivery · domain mutation.

`[DECISION]` The adapter answers only one question per call:

```text
Is a valid credential for this provider boundary retrievable from the cloud store right now?
```

- If **yes** → it returns `{ status: "available"; value: string }` — the raw value stays inside `ManagedSecretCredentialSource` and is immediately wrapped in an opaque `ProviderCredentialToken`
- If **no** (missing, invalid, unavailable, permission-denied, timeout, throttled, unexpected error) → it returns `{ status: "missing" | "invalid" | "unavailable" }` — **never the raw cloud response body**, never the raw secret

---

## 4. Three Layers (do not collapse)

This spec defines the behavioral boundary for the second layer only:

```text
Layer 1 — Provider-neutral seam         already in place (Impl 028)
           ManagedSecretStoreClient interface
           ManagedSecretCredentialSource pre-fetch class
           FakeManagedSecretStoreClient test double

Layer 2 — Cloud-specific adapter        defined by Spec 029 (this document)
           A real implementation of ManagedSecretStoreClient
           Backed by a real cloud secret store (AWS / GCP / Azure / Vault / ...)
           No cloud provider chosen in this behavioral spec

Layer 3 — Production wiring / rollout   still future after Spec 029
           Operator script integration
           CI-live lane (if ever)
           Source precedence mechanism
           IAM/deployment identity configuration
           Secret rotation / cache / TTL
```

A cloud-specific adapter (Layer 2) is only an implementation of `ManagedSecretStoreClient`. It is **not** Layer 1 (the seam) and **not** Layer 3 (production wiring). Confusing the layers is the source of every forbidden behavior below.

---

## 5. Scope / Non-Scope

**In scope (behavioral):**
- Behavioral contract for a future cloud-specific adapter implementing `ManagedSecretStoreClient`
- How the adapter fits behind the existing Impl 028 provider-neutral seam
- Safe secret reference handling (`SecretRef ≠ SecretValue`)
- Safe value handling — the raw value stays inside `ManagedSecretCredentialSource`; never crosses the boundary
- Cloud response redaction requirements
- Safe error classification for all cloud-specific failure modes
- Permission-denied behavior
- Timeout and cloud service unavailability behavior
- Malformed / empty secret payload behavior
- Throttling / rate-limit behavior
- Cloud SDK / network exception behavior
- Unexpected-exception behavior
- IAM / runtime identity boundary at a behavioral level
- What must remain out of domain modules
- What must remain out of event / audit / trace records
- What must remain independent from `LiveCallPolicy`
- What must remain future production wiring (Layer 3)
- Source-precedence rules (must be explicit; mechanism deferred to 029A)
- Existing process-env adapter remains valid and sealed

**Out of scope (this spec):**
- Implementing code; technical file layout; SDK selection; dependency installation; concrete SDK code; real cloud calls; real secret creation; IAM policy authoring; cloud deployment; secret rotation implementation; cache / TTL; source precedence implementation; CI secret injection; CI live lane; production rollout; automatic live provider calls; retry / backoff; scheduler; queue; event bus; telemetry / model evaluation; DB / schema / migration; UI / API; delivery-provider integration; changing `liveProviderSmoke`; changing `operator-live-smoke.mjs`; changing `LiveCallPolicy`; changing `requestRealProviderRendering`; changing `validateDraft`; changing `ManagedSecretCredentialSource`; changing `ManagedSecretStoreClient`; changing the existing `EnvironmentProviderCredentialResolver`; changing any domain logic

---

## 6. Cloud Provider Decision Policy

`[DECISION]` **Option A — Provider-selection-neutral boundary.**

Spec 028 (§18), Tech Spec 028A (§14), and all existing canonical docs confirm that cloud provider selection is **explicitly deferred**: no deployment platform is named in the repository documentation, no cloud SDK is installed, and no ADR records a vendor commitment. No repository file, operator script, or CI configuration reveals a cloud deployment context that would justify choosing a first target now.

Therefore, Spec 029 defines the **rules any future cloud-specific adapter must satisfy**, without choosing AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault, SSM Parameter Store, or any other provider. A concrete provider selection, SDK analysis, and dependency evaluation belong in **029A** (Technical Specification).

`[DECISION]` This does not mean a provider is permanently deferred — it means the behavioral contract must be provider-agnostic so that the first concrete implementation (whichever provider 029A chooses) slots behind it without reopening this spec.

---

## 7. Required Cloud Adapter Gate

`[DECISION]` Before a cloud-backed credential may enter the pre-fetch flow, **all** of the following must be true. If **any** condition fails, the adapter must return a safe `ManagedSecretResolution` (`missing`/`invalid`/`unavailable`) and the caller must not proceed to transport:

1. The cloud adapter implements **`ManagedSecretStoreClient`** — the existing pure TypeScript interface from Impl 028 — and does not introduce a parallel or replacement interface
2. The cloud adapter lives in an **explicitly approved application boundary** — outside domain modules; not in `observation`, `reasoning`, `understanding`, `decision-support`, `athlete`, `event-recording`, `delivery`, `application-orchestration`, or `shared-kernel`
3. **Domain modules must not import** cloud adapter code; the domain-boundary invariant is preserved
4. The cloud adapter is **injected** into `ManagedSecretCredentialSource` — never constructed automatically by domain code or resolved from a global
5. All exceptions thrown by the cloud SDK or network layer must be **caught internally** and returned as `{ status: "unavailable" }` — the adapter's `retrieve()` must **always resolve**, never reject
6. A **raw cloud secret value must never leave the adapter boundary** — the value is returned as `ManagedSecretResolution.available.value` and stays inside `ManagedSecretCredentialSource.toEnvironmentCredentialSource()` where it is wrapped by `EnvironmentProviderCredentialResolver` into an opaque `ProviderCredentialToken`
7. The raw secret is **not logged**
8. The raw secret is **not persisted** (no raw value in any domain state, record, repository, or file)
9. The raw secret is **not audited** (no raw value in `ProviderAttemptRecord`, any `DomainEventRecord`, or any trace)
10. The raw secret is **not printed** (not in smoke output, not in operator output, not in logs, not in exception messages surfaced to callers)
11. The **raw cloud provider response body** is never surfaced to callers — cloud SDK errors are mapped to safe closed-status codes before crossing the adapter boundary
12. **Permission denied** maps to `{ status: "unavailable" }` — the cloud response body or IAM error detail is not exposed beyond the adapter
13. **Secret missing** maps to `{ status: "missing" }` — no cloud-store metadata is surfaced
14. **Secret malformed / failed expected format** maps to `{ status: "invalid" }` — the raw payload is not exposed
15. **Cloud service unavailable / network error / timeout** maps to `{ status: "unavailable" }` — no retry/scheduler/event bus unless a future spec explicitly defines it
16. **Throttling / rate-limiting** maps to `{ status: "unavailable" }` — no automatic back-off in this slice unless a future spec defines it
17. **Unexpected exception** maps to `{ status: "unavailable" }` — no raw stack trace containing secret material is surfaced
18. **Cloud adapter must read no `process.env`** — it communicates with its store through an injected cloud client boundary; the process-env one-file guard is not weakened and no new `process.env` token is introduced inside `src/`
19. **Credential availability does not enable live calls** — `LiveCallPolicy` stays a separate, explicit, fail-closed gate unchanged from Impl 021
20. **Credential availability does not bypass operator opt-in**
21. **Credential availability does not bypass the CI guard** in `liveProviderSmoke`
22. **Credential availability does not bypass `validateDraft`**
23. **Source precedence over other credential sources must be explicit** — never inferred from runtime environment state; mechanism deferred to 029A
24. **Default tests must not require** a real cloud store, real network, real credential, or CI secret
25. **CI must not require** a real cloud credential by default
26. The **`process.env` one-file seal remains intact** — no new in-`src/` token site

`[FACT]` The gate is **fail-closed**: the safe path is "retrieval not possible → safe `ManagedSecretResolution` status → `ManagedSecretCredentialSource` returns empty `EnvironmentCredentialSource` → resolver classifies `missing` → no transport." Any uncertainty resolves to it.

---

## 8. Domain Rules To Preserve (invariants)

`[DECISION]` This spec preserves every invariant established by Impl 001–028. At minimum:

1. A cloud-retrieved credential value is **not** domain data
2. A cloud-retrieved credential value is **not** `Evidence`
3. A cloud-retrieved credential value is **not** `Observation`
4. A cloud-retrieved credential value is **not** `Understanding`
5. A cloud-retrieved credential value is **not** `AthleteDecision`
6. A cloud-retrieved credential value is **not** `DecisionSupport`
7. A cloud-retrieved credential value is **not** `RenderedMessage`
8. A cloud-retrieved credential value is **not** provider metadata
9. A cloud-retrieved credential value is **not** provider-attempt audit payload
10. A cloud-retrieved credential value is **not** traceability evidence
11. Cloud credential **availability does not enable live calls** by itself
12. Cloud credential **absence does not invalidate** domain output
13. Cloud retrieval **failure does not weaken** support quality
14. Secret **names / reference ids do not derive** from athlete or domain values
15. Secret **values do not appear** in logs / errors / tests / docs examples
16. Cloud adapter resolution **does not call provider transport**
17. Cloud adapter resolution **does not call `validateDraft`**
18. Cloud adapter resolution **does not create** records / review / display / delivery / events
19. Cloud adapter resolution **does not mutate** domain state
20. Cloud adapter resolution **does not expand `ProviderFailure`** or any existing closed catalog
21. **Smoke success** (operator smoke using the cloud adapter) is **wiring success only** — not product readiness, not domain evidence
22. **Cloud source unavailability is not a domain failure** — it is an operational failure at the credential boundary only

---

## 9. Key Concepts (behavioral)

### Cloud-Specific `ManagedSecretStoreClient` Implementation
A concrete TypeScript class implementing the `ManagedSecretStoreClient` interface from Impl 028. It:
- **May** accept an injected cloud store client (the cloud SDK boundary, if any); retrieve exactly the configured `secretName` reference from the cloud store; return the raw value as `{ status: "available"; value: string }` (raw value stays inside `ManagedSecretCredentialSource`); return a safe status for any failure mode
- **Must** catch all exceptions internally and return `{ status: "unavailable" }` rather than rejecting
- **Must not** read `process.env`; read any config beyond the injected `secretName` and cloud client; log the raw value; persist the raw value; surface the cloud response body; call transport; call `validateDraft`; mutate domain state; import domain modules

### Cloud Store Client Boundary
The injected interface through which the cloud-specific adapter communicates with the cloud secret service. It:
- Is **injected** — never constructed automatically; test doubles replace it in the default suite
- Returns either a raw-credential value (handled transiently inside the adapter) or a failure signal
- **No cloud provider SDK is chosen in this behavioral spec** (deferred to 029A)

### `SecretRef` (safe reference)
An opaque identifier for a secret in the cloud store — a name, path, ARN, version handle, or equivalent. It:
- **May** appear in safe operational config, safe audit references (as `secretRef`), or operator-visible configuration
- **Must not** carry the raw secret value; must not be treated as a credential; must not be logged in a way that exposes the value
- `[FACT]` `SecretRef ≠ SecretValue` — the reference id may be safe to record; the value is never safe to record

### Cloud-Adapter Resolution Boundary
The raw cloud secret value enters at `ManagedSecretResolution.available.value` and is consumed immediately inside `ManagedSecretCredentialSource.toEnvironmentCredentialSource()`, where it becomes part of the `EnvironmentCredentialSource` map. It then passes to `EnvironmentProviderCredentialResolver`, which wraps it in an opaque `ProviderCredentialToken`. The raw string **never crosses a public API boundary** and **never appears in any return type visible to callers of `toEnvironmentCredentialSource()`** as a raw secret — only as part of the already-established `EnvironmentCredentialSource` shape the resolver consumes.

### Cloud Redaction Policy (extends Impl 028 `SecretRedactionPolicy`)
Extends the existing policy from Spec 028 with cloud-specific prohibitions:
- **Forbidden in any output, audit, event, trace, log, or error:** raw secret value; cloud response body; cloud SDK request / response payload; IAM error detail; permission-denied error message containing account / role / ARN detail; full cloud metadata payload; stack trace containing secret material; throttling response body
- **Permitted (safe refs):** stable secret reference id if non-sensitive; source kind label (`"cloud-store"` or similar); safe failure code (`"missing"` / `"invalid"` / `"unavailable"`); `secretRetained: false` statement; cloud target kind if non-sensitive and chosen; retrieval duration if safe

### `SourcePrecedence` (explicit, not inferred)
The explicit ordering in which credential sources (`ProcessEnvironmentCredentialSourceAdapter`, `ManagedSecretCredentialSource` backed by the cloud adapter, etc.) are consulted. Any source precedence:
- **Must be explicit** — never inferred from environment state at runtime
- **Must not silently demote** the existing process-env adapter (the local/manual path remains valid)
- Mechanism (config, injection order, named resolver chain) is deferred to 029A

---

## 10. Candidate Behavioral Flow

`[ASSUMPTION]` The smallest useful behavioral unit is a **single, explicit pre-fetch call** through the cloud adapter:

```text
caller (production wiring OR test composition) configures ManagedSecretCredentialSource with:
  - secretName: the configured safe reference
  - storeClient: a CloudSpecificManagedSecretStoreClient (OR FakeManagedSecretStoreClient in tests)

caller awaits managedSecretSource.toEnvironmentCredentialSource()
  → ManagedSecretCredentialSource calls storeClient.retrieve(secretName)
      → cloud adapter calls cloud store client
          → permission denied / missing / malformed / unavailable / timeout / throttled
              → adapter catches exception internally
              → returns ManagedSecretResolution: { status: "missing" | "invalid" | "unavailable" }
              → ManagedSecretCredentialSource returns {} (empty EnvironmentCredentialSource)
          → secret available
              → adapter returns { status: "available"; value: "<raw credential>" }
              → ManagedSecretCredentialSource returns { [secretName]: "<raw credential>" }
                (raw value placed in existing EnvironmentCredentialSource map; stays transient)
  → caller feeds EnvironmentCredentialSource into new EnvironmentProviderCredentialResolver
      → resolve() — synchronous; unchanged from Impl 022
          empty source / absent key → ProviderCredentialResolution: missing
          value present, valid → ProviderCredentialResolution: available (opaque ProviderCredentialToken)
  → caller passes synchronous resolver into LiveProviderClient (or liveProviderSmoke)
  → LiveCallPolicy gate (separate, explicit; disabled by default; unchanged from Impl 021)
      → if policy disabled → safe failure; no transport
      → if policy enabled AND credential available → LiveProviderHttpTransport
          → provider response → validateDraft → ProviderRenderOutcome
  → audit / smoke / operator output → safe status only; rawRetained: false; no secret value
```

`[FACT]` In this flow: **no automatic live call on secret resolution**, **no domain mutation on secret resolution**, **no event emission required by secret resolution**, **no delivery**, **no telemetry**, **no raw secret in any output**. The cloud adapter is a single-step implementation of an existing interface — everything upstream and downstream is unchanged.

---

## 11. Required Failure Semantics

`[DECISION]` Define a **safe outcome** for each failure mode. No raw cloud response body, no raw secret, no retry/scheduler/event bus unless a future spec explicitly defines it:

| Failure mode | `ManagedSecretResolution` | `EnvironmentCredentialSource` | Transport call? | Raw cloud response retained? | Retry in this slice? | Event recorded? | Domain mutation? |
|---|---|---|---|---|---|---|---|
| Cloud adapter not configured (no `storeClient`) | — (construction fails or empty source) | `{}` | No | No | No | No | No |
| Secret missing (not in store) | `{ status: "missing" }` | `{}` | No | No | No | No | No |
| Secret malformed / failed expected format | `{ status: "invalid" }` | `{}` | No | No | No | No | No |
| Cloud store unavailable / network error | `{ status: "unavailable" }` | `{}` | No | No | No | No | No |
| Cloud store timeout | `{ status: "unavailable" }` | `{}` | No | No | No | No | No |
| Permission denied / IAM error | `{ status: "unavailable" }` | `{}` | No | No | No | No | No |
| Throttling / rate limited | `{ status: "unavailable" }` | `{}` | No | No | No | No | No |
| Cloud SDK / client unexpected exception | `{ status: "unavailable" }` | `{}` | No | No | No | No | No |
| Unauthenticated runtime identity | `{ status: "unavailable" }` | `{}` | No | No | No | No | No |
| Invalid returned credential (provider rejects) | upstream: `available` → token | — | Yes (already through LiveCallPolicy) | No | No (this slice) | No | No |

`[DECISION]` Every outcome before transport is a **safe skip, safe stop, or safe failure**. The distinction between `missing`, `invalid`, and `unavailable` is captured in `ManagedSecretResolution` (observable in tests via deterministic cloud-adapter fakes) but all three collapse to an empty `EnvironmentCredentialSource` at the `ManagedSecretCredentialSource` level — the downstream resolver classifies them all as `missing` ("no call"). **Source unavailability is not a domain failure.** Missing secret is not a `ProviderFailure` — it is a pre-transport credential failure.

---

## 12. Required Output / Trace Rules

**Allowed in any output, audit, event, or trace:**
- Safe credential status (`available` / `missing` / `invalid` / `unavailable`)
- Safe source kind label (`"cloud-store"` or similar non-sensitive label)
- Safe secret reference id / path — **only if it does not expose the secret value** (e.g. a non-sensitive ARN prefix or name that carries no credential material)
- Safe failure code (from the closed catalog above)
- A `secretRetained: false` statement
- Cloud target kind if non-sensitive and chosen in 029A
- Retrieval duration if safe and not sensitive

**Forbidden in any output, audit, event, or trace:**
- Raw secret value
- Bearer token / API key / credential token / cloud access token
- Cloud provider response body (full or partial)
- Cloud SDK request / response payload
- IAM error detail containing account / role / ARN / service account specifics
- Permission-denied error messages with identifying infrastructure detail
- Full cloud metadata payload
- `process.env` value / full env dump
- Provider request / response / draft
- Rendered message body
- Chain-of-thought / hidden reasoning
- Delivery target / body
- Stack trace containing secret material
- Arbitrary metadata bag

`[FACT]` The existing `liveProviderSmoke` helper already guarantees `rawRetained: false` and a closed redacted result — any operator smoke path using the cloud-backed adapter inherits this redaction, by construction. The cloud adapter contributes nothing to the smoke result beyond the existing credential-resolution status codes.

---

## 13. Required Behavioral Rules

`[DECISION]` A future cloud-specific adapter must obey **all** of:

1. Implements the existing `ManagedSecretStoreClient` interface — no new interface, no parallel seam
2. Lives outside domain modules — no `observation`, `reasoning`, `understanding`, `decision-support`, `athlete`, `event-recording`, `delivery`, `application-orchestration`, `shared-kernel`
3. Domain modules must not import cloud adapter code
4. Rendering domain objects must not store raw secret values
5. Raw cloud secret values must never be logged
6. Raw cloud secret values must never be printed
7. Raw cloud secret values must never be persisted
8. Raw cloud provider response bodies must never be exposed beyond the adapter boundary
9. Raw SDK errors must be mapped to safe closed-status codes before crossing the boundary
10. Permission denied → `{ status: "unavailable" }` — fails closed
11. Secret missing → `{ status: "missing" }` — fails closed
12. Secret malformed → `{ status: "invalid" }` — fails closed
13. Cloud service unavailable → `{ status: "unavailable" }` — fails closed
14. Cloud timeout → `{ status: "unavailable" }` — fails closed
15. Throttling → `{ status: "unavailable" }` — fails closed
16. Unexpected exception → `{ status: "unavailable" }` — fails closed; no raw stack with secret material surfaced
17. Credential availability must not enable live calls by itself
18. Credential availability must not bypass `LiveCallPolicy`
19. Credential availability must not bypass operator opt-in
20. Credential availability must not bypass the CI guard in `liveProviderSmoke`
21. Credential availability must not bypass `validateDraft`
22. Credential availability must not create evidence
23. Credential availability must not create athlete decisions
24. Credential availability must not trigger delivery
25. Credential availability must not mutate domain state
26. Cloud adapter must not create event bus / scheduler / retry behavior by default
27. Cloud adapter must not introduce telemetry / model evaluation
28. Cloud adapter must not require DB / schema / migration
29. Cloud adapter must not read `process.env` — it communicates with its store through an injected cloud client; the process-env one-file guard is not weakened
30. Existing `ProcessEnvironmentCredentialSourceAdapter` remains valid and sealed
31. Existing process-env one-file guard remains intact
32. Source precedence over other credential sources must be explicit — never inferred at runtime
33. Operator smoke remains manual unless a future spec changes it
34. CI remains no-live by default

---

## 14. Required Use Cases (Given / When / Then)

**UC1 — Cloud adapter not configured.**
*Given* no cloud-specific adapter is configured (only `FakeManagedSecretStoreClient` or process-env sources), *when* credential resolution is requested, *then* the system uses only explicitly configured existing sources (process-env path or fails closed) and **no cloud lookup occurs by the absence of an adapter alone**.

**UC2 — Secret missing in cloud store.**
*Given* the cloud adapter is configured and the `secretName` reference does not exist in the store, *when* `retrieve(secretName)` is called, *then* the adapter returns `{ status: "missing" }`, `ManagedSecretCredentialSource` returns `{}`, the resolver classifies `missing`, and **no live call happens by that fact alone**.

**UC3 — Permission denied.**
*Given* the runtime identity lacks permission to read the secret, *when* `retrieve(secretName)` is called, *then* the adapter catches the permission error internally and returns `{ status: "unavailable" }` — **no raw cloud response body or IAM error detail is surfaced**; no transport call occurs.

**UC4 — Cloud service unavailable.**
*Given* the cloud secret service is unreachable (network error, service outage), *when* `retrieve(secretName)` is called, *then* the adapter catches the error internally and returns `{ status: "unavailable" }` — **no retry / scheduler / event bus is created**; no transport call occurs.

**UC5 — Timeout.**
*Given* cloud secret retrieval times out, *when* `retrieve(secretName)` is called, *then* the adapter catches the timeout internally and returns `{ status: "unavailable" }` — **no raw transport detail is surfaced**; no transport call occurs.

**UC6 — Malformed secret payload.**
*Given* the cloud store returns a payload that is present but fails the expected format check (empty string, wrong structure, unparseable), *when* `retrieve(secretName)` is called, *then* the adapter returns `{ status: "invalid" }` — **the raw payload is not exposed**; no transport call occurs.

**UC7 — Throttling / rate limiting.**
*Given* the cloud store throttles the request, *when* `retrieve(secretName)` is called, *then* the adapter catches the throttling signal and returns `{ status: "unavailable" }` — **no automatic retry in this slice**; no raw throttling response surfaced; no transport call occurs.

**UC8 — Unauthenticated runtime identity.**
*Given* the runtime environment has no valid identity to present to the cloud store (no service account, no role, no workload identity), *when* `retrieve(secretName)` is called, *then* the adapter returns `{ status: "unavailable" }` — **no authentication detail is surfaced**; no transport call occurs.

**UC9 — Secret available.**
*Given* the cloud adapter returns `{ status: "available"; value: "<raw credential>" }`, *when* `ManagedSecretCredentialSource.toEnvironmentCredentialSource()` is called, *then* the credential **may be supplied only through the approved pre-fetch pattern** (into `EnvironmentProviderCredentialResolver` → `ProviderCredentialToken` → `LiveProviderClient`) and **does not by itself enable a live call** — `LiveCallPolicy` and operator opt-in still gate transport independently.

**UC10 — Operator smoke remains manual.**
*Given* a cloud adapter exists, *when* the operator does not explicitly run `scripts/operator-live-smoke.mjs` with the opt-in flag, *then* **no smoke or provider call occurs** — nothing in the cloud adapter changes the manual-only contract of the operator entrypoint.

**UC11 — CI default remains no-live.**
*Given* a CI environment (`CI` truthy), *when* a cloud adapter is configured, *then* the CI guard in `liveProviderSmoke` fires before credential resolution and before transport — **no live call occurs by default**.

**UC12 — Domain isolation.**
*Given* cloud adapter code exists, *when* domain modules (`observation` / `reasoning` / `understanding` / `decision-support` / `athlete`) are inspected, *then* **none of those modules imports the cloud adapter** or any cloud SDK.

**UC13 — Audit / output / event / trace inspection.**
*Given* any cloud secret resolution outcome (any status), *when* audit records, event records, smoke output, operator output, or logs are inspected, *then* **no raw secret value and no raw cloud response body appears** anywhere.

**UC14 — Unexpected exception.**
*Given* the cloud SDK throws an unexpected exception (null pointer, unexpected response shape, unhandled error), *when* `retrieve(secretName)` is called, *then* the adapter catches the exception internally and returns `{ status: "unavailable" }` — **no raw exception message containing secret material is surfaced**; `retrieve()` never rejects.

**UC15 — Existing tests remain green.**
*Given* a future implementation of the cloud adapter, *when* the full test suite is run (`node --test`), *then* **all Impl 001–028 tests (672/672) remain green** and the new tests are deterministic with injected fakes.

---

## 15. Acceptance Criteria

- Given no cloud adapter configured → no cloud secret lookup occurs; behavior is **fail-closed or explicit fallback only**.
- Given cloud adapter configured but secret missing → **no live call happens by that fact alone**.
- Given permission denied → **raw cloud response body and IAM error detail are not exposed** in any result, error, or log.
- Given cloud service unavailable → **no retry / scheduler / event bus is created**.
- Given timeout or throttling → **adapter fails closed** without exposing raw transport details.
- Given malformed payload → **raw payload is not exposed** in any output, error, or log.
- Given unauthenticated runtime identity → adapter returns `{ status: "unavailable" }` without surfacing authentication detail.
- Given secret available → **`LiveCallPolicy` and operator opt-in still gate provider call**; credential availability alone enables nothing.
- Given CI context → **no default live call occurs** regardless of cloud adapter configuration.
- Given smoke output (any scenario) → **no raw secret value or raw cloud response appears** in `OperatorSmokeOutput`.
- Given event / audit / trace records → **no raw secret value or raw cloud response appears**.
- Given domain module imports are inspected → **no cloud adapter import exists** in `observation` / `reasoning` / `understanding` / `decision-support` / `athlete`.
- Given the production `src/` process-env guard is run → **the one-file seal remains intact**; cloud adapter adds no new `process.env` token inside `src/`.
- Given source precedence is inspected → **precedence is explicit** and not inferred from runtime state.
- Given `retrieve()` is called in any failure scenario → `retrieve()` **always resolves** (never rejects).
- Given a future implementation → **all Impl 001–028 tests (672/672) remain green**.

---

## 16. Explicit Forbidden Behaviors

**Secret and cloud response handling:**
- Raw secret logging
- Raw secret persistence (any record, state, repository, file)
- Raw secret in event / audit / trace records
- Raw secret in smoke output
- Raw secret in thrown user-facing error or exception message
- Raw secret in provider-attempt audit
- Raw cloud response body exposed to callers
- Cloud SDK request / response payload surfaced to callers
- IAM error detail (account, role, ARN) in caller-facing messages
- Full env dump
- Full cloud metadata payload dump
- Stack trace containing secret material surfaced to callers

**Coupling and enablement:**
- Cloud adapter importing domain module code
- Domain modules importing cloud adapter code
- Automatic live call on secret retrieval (policy + opt-in still required)
- Bypassing `LiveCallPolicy`
- Bypassing operator opt-in
- Bypassing CI guard
- Bypassing `validateDraft`
- Delivery on credential availability
- Event recording triggered by secret retrieval
- Evidence creation on credential availability
- Athlete-decision creation on credential availability
- Domain mutation on credential availability
- Source precedence inferred from runtime environment state (must be explicit)

**Infrastructure:**
- Cloud provider selection in this behavioral spec
- SDK installation in this spec
- Dependency change in this spec
- Retry / backoff unless a future spec explicitly defines it
- Scheduler / queue / event bus
- Telemetry / model evaluation
- IAM policy authoring in this spec
- CI credential injection in this spec

**Guard integrity:**
- Weakening the process-env one-file guard
- Cloud adapter reading `process.env` inside `src/` (connects to cloud through an injected client boundary)
- Replacing the existing `ProcessEnvironmentCredentialSourceAdapter` without explicit migration plan
- Implicit source precedence
- Adding a new `process.env` token inside `src/` for the cloud adapter

**Default behavior:**
- Default CI live calls
- Default live calls on cloud adapter configuration
- Automatic credential-driven execution of any kind
- Operator smoke running automatically

---

## 17. Validation Strategy (defining tests for a future implementation)

`[DECISION]` The **negative tests are defining**, and they prove their guarantees **without making a live call and without a real cloud store**. A future implementation (029A / Impl 029) must prove deterministically, with injected fakes, in the default suite:

1. **No domain module imports** cloud adapter code (`observation` / `reasoning` / `understanding` / `decision-support` / `athlete` each scanned)
2. **Secret missing → `{ status: "missing" }`** (no transport, no live call)
3. **Secret malformed → `{ status: "invalid" }`** (no transport, no raw payload exposed)
4. **Cloud store unavailable → `{ status: "unavailable" }`** (no transport, no retry / scheduler / event bus)
5. **Permission denied → `{ status: "unavailable" }`** (no transport, no cloud response body surfaced)
6. **Timeout → `{ status: "unavailable" }`** (no transport, no raw transport detail)
7. **Throttling → `{ status: "unavailable" }`** (no transport, no retry, no raw throttling response)
8. **Unexpected exception → `{ status: "unavailable" }`** (adapter never rejects; `retrieve()` always resolves)
9. **Unauthenticated runtime identity → `{ status: "unavailable" }`** (no authentication detail surfaced)
10. **Cloud adapter available → no automatic live call** (policy disabled → no transport even with credential)
11. **Cloud adapter available → no automatic live call** (opt-in absent → no transport even with credential)
12. **CI gate fires before cloud retrieval** (CI truthy → `ci-disabled` before store query)
13. **No raw secret in any output / audit / event / trace** (across all scenarios including `passed`)
14. **No raw cloud response body in any output / error / log** (across all scenarios)
15. **No raw secret in any thrown error or exception message** (none propagate to callers)
16. **`retrieve()` never rejects** (always returns a resolved `Promise<ManagedSecretResolution>`)
17. **No new `process.env` token inside `src/`** (process-env one-file guard scans the new file and passes)
18. **No SDK / cloud package dependency added** (package guard: devDeps remain `typescript` + `@types/node` unless 029A explicitly justifies)
19. **Source precedence is explicit** (no implicit runtime inference)
20. **`ManagedSecretCredentialSource` and `EnvironmentProviderCredentialResolver` unchanged** and still pass their own tests
21. **`liveProviderSmoke` with a fake cloud adapter** still redacts all output (`rawRetained: false`)
22. **Operator smoke output** (any scenario) contains no raw secret value and no raw cloud response
23. **Default suite remains deterministic** — no real cloud store, no real credential, no network
24. **All Impl 001–028 tests (672/672) remain green**

`[FACT]` How tests exercise a cloud adapter without a real store is a 029A concern — e.g. a deterministic `FakeCloudSecretStoreClient` (or equivalent) injected into the cloud adapter, analogous to `FakeManagedSecretStoreClient` for the seam itself. The behavioral requirement is that all guarantees are provable **with fakes, deterministically, with no live call and no real secret**.

---

## 18. Open Design Questions (for 029A — do not resolve here)

1. Should 029A choose a concrete cloud provider, or define only a cloud-adapter port that a later slice implements for a specific provider?
2. If a provider is chosen, which one (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault, SSM Parameter Store, Doppler, other) and why does the repository's deployment context justify that choice?
3. Should the first implementation use a real cloud SDK or an injected minimal HTTP client port (keeping `package.json` devDeps-only)?
4. Where should the cloud-specific adapter live — inside `rendering/application/` (alongside `ManagedSecretCredentialSource`) or a new approved adapter location?
5. Should cloud adapter code go in `rendering/application/` or would a separate `src/modules/secret-manager/` or `src/infrastructure/` boundary be justified (and does that require `AC20` expansion)?
6. How should the runtime identity be configured — service account file path, ambient workload identity, instance metadata, injected credential, other?
7. How should the `secretName` / `SecretRef` be represented safely — a plain string, a branded type, a typed wrapper with cloud-specific fields resolved in 029A?
8. Should the cloud adapter introduce a `CloudSecretStoreClientBoundary` interface that the SDK wraps (keeping SDK code behind another port), or should it directly import the SDK?
9. Should source precedence (managed cloud store vs. process-env adapter) be introduced in the same slice as the cloud adapter, or in a separate subsequent spec?
10. Should the cloud adapter be reachable from `scripts/operator-live-smoke.mjs` in the same slice, or remain independent (operator wiring deferred)?
11. Should there be a separate cloud-secret smoke (a dedicated check that the cloud store is reachable, independent of a live provider call)?
12. Should `permission-denied` and `cloud-store-unavailable` be distinct codes in the closed status catalog, or remain merged as `unavailable`?
13. Should `timeout` and `throttling` be distinct codes, or both map to `unavailable`?
14. Is a cache / TTL for retrieved credentials in scope for 029 or a later slice?
15. Should secret rotation be observable (e.g. via a re-fetch on each call vs. cached result with background refresh)?
16. Should a CI-live lane ever be allowed, and which secret source would it use?
17. Should the cloud adapter be tested with a local emulator (LocalStack, Fake GCS, etc.) or only injected-fake patterns?
18. Should 029A define an approved new top-level module (requiring `AC20` update) or remain inside `rendering/application/`?

`[QUESTION]` None of these block this behavioral spec. Technical implementation choices are not resolved here.

---

## 19. Relationship To Existing Architecture

- **Spec/Impl 028:** the provider-neutral managed-secret seam exists — `ManagedSecretStoreClient`, `ManagedSecretCredentialSource`, `FakeManagedSecretStoreClient`; the cloud adapter **implements the existing interface, not a parallel one**; `ManagedSecretCredentialSource` is **unchanged**
- **Spec/Impl 027:** the operator smoke entrypoint exists and is manual-only; a cloud adapter **must not make it automatic**; the entrypoint's gates (opt-in → CI → credential → live policy) all still apply; the operator script is **unchanged**
- **Spec/Impl 026:** `liveProviderSmoke` owns smoke semantics; the cloud adapter **does not duplicate or change them**; cloud credential availability is **not** smoke success; `liveProviderSmoke` is **unchanged**
- **Spec/Impl 025:** `orchestrateRenderDeliver` exists; the cloud adapter **must not be triggered as an orchestration step**; credential availability does not trigger a delivery step
- **Spec/Impl 024:** event factories are ref-only and inert; the cloud adapter **appends no event** on retrieval
- **Spec/Impl 023:** `ProcessEnvironmentCredentialSourceAdapter` is the **only** approved direct `process.env` read site inside `src/`; the cloud adapter is a **sibling** (different retrieval mechanism), **not a replacement**; the process-env guard is **not weakened**
- **Spec/Impl 022:** `EnvironmentProviderCredentialResolver` classifies an injected `EnvironmentCredentialSource`; the cloud adapter feeds `ManagedSecretCredentialSource.toEnvironmentCredentialSource()`, which produces that exact shape; the resolver is **unchanged**
- **Spec/Impl 021:** `LiveCallPolicy` stays **fail-closed and disabled by default**; the cloud adapter is a **new credential retrieval mechanism**, not a policy change; availability alone does not enable any call
- **Spec/Impl 020:** the serializer / parser / error-mapper stay **unchanged**; the cloud adapter touches only the credential retrieval step, not the provider call payload
- **Spec/Impl 019:** `ProviderClientBoundary` is the **only place** a raw credential may be consumed as a transient token; the cloud adapter feeds the `ManagedSecretCredentialSource` → `EnvironmentProviderCredentialResolver` path that reaches this boundary; it does not bypass it
- **Spec/Impl 018:** the provider-attempt audit stays **raw-free**; the cloud adapter contributes no raw secret to any `ProviderAttemptRecord`
- **Spec/Impl 024:** event records stay **ref-only and raw-free**; the cloud adapter creates no event record and contributes no secret value to any ref
- **Spec/Impl 014:** `validateDraft` remains the only path to a `RenderedMessage`; the cloud adapter does not bypass the validator

---

## 20. Persistence / Review / Delivery / Event Rules

The cloud-specific adapter must **not**: create or save a `RenderedMessageRecord`; append a review; mark display-eligible; call delivery; create a `DeliveryRecord`; append `DomainEventRecord` entries; expand the `DomainEventType` or `EventArtifactKind` catalogs; create provider-attempt event records; trigger retry / scheduler; persist provider attempts automatically; persist a raw secret; persist a raw cloud response; persist a prompt payload. Retrieval ends at a `ManagedSecretResolution`; everything downstream is the unchanged Impl 022–028 path.

---

## 21. Success Criteria

When this spec is complete, a future **029A** (Technical Specification) should be able to answer:

> "Can Aurora add a cloud-backed secret adapter behind the provider-neutral `ManagedSecretStoreClient` seam without leaking secrets, coupling domain code to cloud infrastructure, enabling automatic live calls, weakening the process-env seal, changing the operator smoke entrypoint, or claiming production rollout?"

— and by the cloud adapter gate (§7), the preserved domain invariants (§8), the cloud redaction policy (§9), the candidate behavioral flow (§10), the failure semantics (§11), the output rules (§12), the required behavioral rules (§13), the use cases (§14), the acceptance criteria (§15), and the defining negative tests (§17), the answer is **yes**: a cloud-specific adapter is a concrete implementation of an existing pure TypeScript interface, injected into the already-implemented `ManagedSecretCredentialSource` pre-fetch class; domain modules never import it; raw secret values and raw cloud response bodies never cross the adapter boundary; every failure mode returns a safe closed status; `LiveCallPolicy` and operator opt-in still gate every live call; `validateDraft` remains mandatory; the process-env one-file guard is untouched; the existing local / manual credential path is preserved; all existing tests (672/672) remain green; and SDK selection, cloud-provider choice, source precedence mechanism, deployment identity, and operator-script wiring are deferred to 029A. If the spec cannot answer that, it is incomplete.
