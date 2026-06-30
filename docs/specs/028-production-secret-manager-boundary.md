# Aurora — Specification 028 — Production Secret Manager Boundary

> Phase: **Specification** (behavioral; no code).
> Builds on: `027-operator-live-smoke-entrypoint-boundary.md`, `027-operator-live-smoke-entrypoint-boundary-tech.md`, `026-live-provider-smoke-test-boundary.md`, `026-live-provider-smoke-test-boundary-tech.md`, `025-explicit-application-orchestration-boundary.md`, `024-provider-rendering-delivery-event-surface.md`, `023-direct-process-environment-adapter-boundary.md`, `022-environment-secret-resolver-boundary.md`, `021-live-provider-call-enablement-boundary.md`, `020-real-provider-adapter-implementation-boundary.md`, `019-real-provider-integration-boundary.md`, `018-provider-attempt-audit-boundary.md`, `017-provider-adapter-boundary.md`, `014-llm-rendering-boundary.md`, `015-rendered-message-review-persistence.md`, `016-delivery-boundary.md`, `011-domain-event-outcome-records-traceability-envelope.md`, `013-manual-input-adapter.md`.
> Output of this document: a behavioral contract for a **future production secret manager credential source** behind Aurora's existing provider credential resolution architecture — what becomes possible, what stays forbidden, how failure must be handled, and how the new source coexists with the existing process-environment adapter without weakening any guard or enabling automatic live calls. **No code, no SDK, no cloud-provider choice, no dependency, no API key, no live call, no production rollout, no CI live lane, no retry/scheduler/event bus, no telemetry/model evaluation, no DB/schema.**

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification (028A), not Implementation.

- `[FACT]` This document describes **behavior**. It names a **candidate** managed-secret credential source and its rules; it defines no file layout, no SDK, no cloud provider, no configuration mechanism, no source-precedence implementation, and resolves no technical placement or deployment identity (deferred to 028A, §15).
- `[DECISION]` Spec 028 opens **one** edge only: making a credential *resolvable from a production-managed secret source* behind the existing `ProviderCredentialResolver` / `EnvironmentCredentialSource` seam. It does **not** enable live calls, provision secrets, choose a cloud vendor, change the operator smoke entrypoint, weaken the process-env seal, or open delivery/events.

---

## 1. Context

Documentation / Consolidation post Impl 027 is complete. Current validation: `tsc --noEmit` clean; `node --test` 633/633.

Aurora has a complete, individually-proven credential resolution and live-provider chain:

- **Credential resolution seam (Impl 021–023):**
  - `StaticProviderCredentialResolver` — deterministic sentinel (tests + disabled-default path)
  - `EnvironmentProviderCredentialResolver` — classifies **one** injected key from an `EnvironmentCredentialSource` (`Readonly<Record<string, string | undefined>>`) into `missing`/`invalid`/`available`; returns an opaque transient `ProviderCredentialToken`
  - `ProcessEnvironmentCredentialSourceAdapter` — the **only** approved `process.env` read site inside `src/`; reads exactly the configured key (`AURORA_PROVIDER_CREDENTIAL`); produces the `EnvironmentCredentialSource` shape; **sealed by a repo-wide guard (no other in-`src/` token site)**
- **Live-provider boundary (Impl 021):** disabled-by-default `LiveCallPolicy`; `LiveProviderClient` behind the `ProviderClientBoundary`; `LiveProviderHttpTransport` — the **only** network-token file
- **Provider output path (Impl 014/017/019/020):** mandatory `validateDraft` is the only path to a `RenderedMessage`; serializer/parser/error-mapper unchanged
- **Raw-free audit (Impl 018):** `ProviderAttemptRecord` — closed status catalog; `rawDraftRetained: false` invariant
- **Smoke wiring check (Impl 026):** `liveProviderSmoke(command, deps)` — pure, injected, redacted `LiveProviderSmokeResult`; no `process.env`; at most one call
- **Operator smoke entrypoint (Impl 027):** `scripts/operator-live-smoke.mjs` — manual only; no npm script; excluded from default suite; `scripts/` guard reconciled; production `process.env` seal untouched; output redacted; no persistence/delivery/event/domain mutation

The resolved state of the credential chain before each live call:

```text
EnvironmentCredentialSource (injected)
  → EnvironmentProviderCredentialResolver (classifies → available/missing/invalid)
  → ProviderCredentialToken (transient, opaque)
  → LiveProviderClient
  → LiveCallPolicy gate
  → LiveProviderHttpTransport (only if policy enabled AND credential available)
  → provider response → validateDraft → ProviderRenderOutcome
```

`[FACT]` The current state is **real-environment-bound, but limited to process-environment as the credential source**. The `ProcessEnvironmentCredentialSourceAdapter` reads from the local process environment — an adequate mechanism for local developer / operator manual invocation, but not a production-managed secret store with scoped access, rotation, auditing, or IAM-controlled retrieval.

`[GAP]` **There is no behavioral contract for a production managed-secret source.** The `ProviderCredentialResolver` port and `EnvironmentCredentialSource` seam are already designed for injection — but no spec defines the behavioral rules a managed-secret source must obey: how it fails closed, what it must never log or persist, how it stays independent from live-call enablement, and how it coexists with the existing process-env adapter without displacing it or weakening the production guard. Spec 028 specifies that behavioral contract. **It changes no module, no guard, no validator, no smoke helper, no operator entrypoint, no live-call policy, and no existing resolver behavior** — and chooses no SDK, cloud provider, or deployment mechanism (deferred to 028A).

---

## 2. Central Question

> How can Aurora support a **production managed-secret credential source** behind the existing provider credential resolution seam without making any live call automatic, without leaking secrets in any output or audit record, without coupling domain code to infrastructure, without weakening the existing `process.env` one-file seal, and without choosing a cloud SDK, vendor, or deployment identity prematurely?

---

## 3. Core Principle

`[DECISION]` **A secret manager supplies credentials; it does not authorize meaning, trust, or execution.**

A production secret manager credential source:
- **may** supply a credential transiently into the existing `ProviderCredentialResolver` port — so the same `EnvironmentProviderCredentialResolver` classification path runs (or a sibling resolver that feeds the same `ProviderCredentialToken` shape)
- **does not** create domain facts; **does not** create evidence; **does not** enable live calls by itself; **does not** call the provider; **does not** call `validateDraft`; **does not** persist secrets; **does not** audit secrets; **does not** log secrets; **does not** alter `VoiceMode`, support quality, reasoning, athlete state, delivery, or events

The distinctions that must not be collapsed:

```text
secret manager = credential source
secret manager ≠ live-call enablement
secret manager ≠ provider trust
secret manager ≠ recommendation quality
secret manager ≠ smoke success
secret manager ≠ domain evidence
secret manager ≠ athlete decision
secret manager ≠ production rollout
secret manager ≠ telemetry
secret manager ≠ model evaluation
secret manager ≠ process-env adapter replacement
```

Credential availability must remain separate from: opt-in · live policy · operator invocation · provider output validation · delivery · domain mutation.

`[DECISION]` The source answers only one question:

```text
Is a valid credential for this provider boundary available from the managed store right now?
```

- If **yes** → it supplies an **opaque transient credential token** via the existing resolution path
- If **no** (missing, invalid, unavailable, permission-denied, timeout) → it returns a **safe failure classification** — never the raw secret, never the managed-store response body

---

## 4. Scope / Non-Scope

**In scope (behavioral):** rules for a future production-managed-secret credential source; how it fits behind the existing `ProviderCredentialResolver` port; what it may return; what it must never log, persist, or emit; failure semantics for each failure mode; how it remains independent from live-call enablement; how it remains independent from CI by default; how it avoids SDK/provider coupling in this behavioral spec; how it preserves the existing process-env adapter boundary; how it supports the operator live-smoke path without making it automatic; how it coexists with existing `StaticProviderCredentialResolver` and `EnvironmentProviderCredentialResolver` without replacing them; how source precedence must be explicit; how identity/reference to a secret is represented safely (ref ≠ value).

**Out of scope (this spec):** implementing code; SDK selection; AWS/GCP/Azure/HashiCorp choice; dependency installation; production IAM configuration; secret rotation implementation; secret cache/TTL; CI secret injection; production deployment; production rollout; automatic live provider calls; retry/backoff; scheduler; queue; event bus; telemetry/model evaluation; DB/schema/migration; UI/API; delivery-provider integration; changing `liveProviderSmoke`; changing `operator-live-smoke.mjs`; changing `LiveCallPolicy`; changing `requestRealProviderRendering`; changing `validateDraft`; changing domain logic; changing the existing process-env guard; changing the `ProcessEnvironmentCredentialSourceAdapter`; changing any existing resolver.

---

## 5. What changes vs Impl 023/027 — and what stays forbidden

**Changes (the entire delta this spec authorizes):**
- A new credential source type **may** retrieve a secret from a managed secret store — behind the existing `ProviderCredentialResolver` port (or via a new injected port that feeds the same `ProviderCredentialToken` shape) — in exactly one new, approved boundary, subject to all gates below
- Source precedence over `ProcessEnvironmentCredentialSourceAdapter` / `EnvironmentProviderCredentialResolver` must be **explicit** (mechanism deferred to 028A)

**Stays exactly as in Impl 027 (unchanged, non-negotiable):**
- `ProcessEnvironmentCredentialSourceAdapter` — the **only** approved direct `process.env` read site inside `src/` — **is not removed, not demoted, not weakened**; the production process-env guard is **not touched**
- `EnvironmentProviderCredentialResolver`, `StaticProviderCredentialResolver`, `LiveProviderClient`, `LiveCallPolicy`, `LiveProviderHttpTransport`, the serializer/parser/error-mapper, the raw-free audit, `validateDraft`, `liveProviderSmoke`, `operator-live-smoke.mjs` — all **unchanged contracts**
- **Credential availability is not live-call enablement** — `LiveCallPolicy` stays a separate, explicit, fail-closed gate
- **Live calls remain disabled by default** — a configured managed-secret source does not change that
- No automatic live call on credential resolution, no retry/scheduler/event bus, no telemetry/model evaluation, no domain mutation
- `ProviderFailure` / `ProviderOperationalFailure` **not expanded** in this behavioral spec; the event catalog **not expanded**; **no SDK/dependency/lockfile change**; **no prompt template**
- `process.env` stays **forbidden inside `src/` everywhere except the one approved adapter file**

---

## 6. Required Secret Manager Gate

`[DECISION]` Before a managed-secret credential may be used, **all** of the following must be true. If **any** condition fails, Aurora **fails closed before transport** or produces a **safe credential failure**:

1. The managed-secret source implementation lives behind an **injected port** (a `ProviderCredentialResolver` sibling or a new `SecretCredentialSource` shape that feeds the existing resolver)
2. The source lives in an **explicitly approved application boundary** — no domain module, no `shared-kernel`, no `event-recording`, no `delivery`, no `application-orchestration`, no `athlete`/`reasoning`/`observation`/`understanding`/`decision-support`
3. **Domain modules must not import** managed-secret source code
4. The managed-secret source is **injected** — not imported by rendering domain objects, not constructed automatically
5. A **raw secret value must never leave the approved credential-source boundary**
6. The raw secret is **not logged**
7. The raw secret is **not audited** (no raw value in `ProviderAttemptRecord` or any event)
8. The raw secret is **not persisted** (no raw value in any domain state, record, or repository)
9. The raw secret is **not included in errors** returned to callers
10. The raw secret is **not printed** (not in smoke output, not in operator output, not in logs)
11. The raw secret is **not surfaced in exceptions** thrown to callers
12. A **missing secret** maps to safe `credential-missing` failure; **no transport call**
13. An **invalid or malformed secret** maps to safe `credential-invalid` failure; **no transport call**
14. **Source unavailable** (network, managed-store not reachable, timeout) maps to safe `credential-unavailable` failure; **no transport call**; **no retry/scheduler/event bus** unless a future spec explicitly defines it
15. **Permission denied** maps to safe `credential-unavailable` failure; **no cloud provider response body** surfaced
16. **Unexpected exception** maps to safe failure; **no raw secret / store response body** in the error
17. **Default tests do not require** a real managed-secret source
18. **CI does not require** a real managed-secret credential by default
19. **Credential availability does not enable live calls** — `LiveCallPolicy` stays a separate gate
20. **Credential availability does not bypass operator opt-in**
21. **Credential availability does not bypass CI guard**
22. **Credential availability does not bypass `validateDraft`**
23. **Source precedence over other resolvers must be explicit** and not inferred from runtime environment state
24. The **process-env one-file guard remains sealed** — no new `process.env` token inside `src/` beyond the one approved adapter file

`[FACT]` The gate is **fail-closed**: the safe path is "secret not available → safe failure → no transport," and any uncertainty (unconfigured source, managed-store unreachable, permission denied, malformed payload) resolves to it. Conditions 1–5 and 17–24 are structural/configuration constraints; 6–16 govern how a retrieved value is handled.

---

## 7. Domain Rules To Preserve (invariants)

`[DECISION]` This spec preserves every invariant established by Impl 001–027. At minimum:

1. A managed secret value is **not** domain data
2. A managed secret value is **not** `Evidence`
3. A managed secret value is **not** `Observation`
4. A managed secret value is **not** `Understanding`
5. A managed secret value is **not** `AthleteDecision`
6. A managed secret value is **not** `DecisionSupport`
7. A managed secret value is **not** `RenderedMessage`
8. A managed secret value is **not** provider metadata
9. A managed secret value is **not** provider-attempt audit payload
10. A managed secret value is **not** traceability evidence
11. Secret **availability does not enable live calls** by itself
12. Secret **absence does not invalidate** domain output
13. Secret **failure does not weaken** support quality
14. Secret **names / reference ids do not derive** from athlete/domain values
15. Secret **values do not appear** in logs/errors/tests/docs examples
16. Managed-secret resolution **does not call provider transport**
17. Managed-secret resolution **does not call `validateDraft`**
18. Managed-secret resolution **does not create** records/review/display/delivery/events
19. Managed-secret resolution **does not mutate** domain state
20. Managed-secret resolution **does not expand `ProviderFailure`**
21. **Smoke success** (operator smoke using the managed-secret source) is **wiring success only** — not product readiness, not domain evidence
22. **Source unavailability is not a domain failure** — it is an operational failure at the credential boundary only

---

## 8. Key Concepts To Define (behavioral)

### `ManagedSecretCredentialSource`
A credential source that **may retrieve a secret from a production managed secret store** and produce the existing `EnvironmentCredentialSource` shape (or an equivalent `ProviderCredentialToken` directly via a new `SecretCredentialSource` port — mechanism deferred to 028A).
- **May:** connect to an injected managed-store client; retrieve exactly the configured secret reference; return a source containing the retrieved credential; return a safe failure classification if unavailable/missing/invalid
- **Must not:** scan all available secrets; infer secret references from domain data; expose a raw secret in any public result beyond the token boundary; persist a raw secret; log a raw secret; audit a raw secret; call provider transport; call the provider; call `validateDraft`; change the live-call policy; mutate domain state; be imported by any module outside the approved application boundary

### `ManagedSecretStoreClient`
The injected boundary through which the managed-secret source communicates with the secret store.
- **Injected** (never constructed automatically; the default suite uses a deterministic fake)
- Returns either a raw-credential value (handled transiently inside the source boundary) or a failure signal
- **No cloud-provider SDK is chosen in this spec** (deferred to 028A)

### `SecretRef`
A safe reference to a secret in the managed store (a name, path, ARN, or version — not the value itself).
- **May** be recorded as a safe operational reference (e.g. in a non-sensitive config structure or in a safe audit record as `secretRef`)
- **Must not** carry the raw secret value; must not be treated as a credential; must not be logged in a way that exposes the value
- `[FACT]` `SecretRef ≠ SecretValue` — the reference id may be safe to record; the value is never safe to record

### `CredentialAvailabilityStatus`
The closed result of managed-secret resolution — extending the existing `ProviderCredentialResolution` pattern:
- `available` — with an opaque transient `ProviderCredentialToken` (raw value never leaves the source boundary)
- `missing` — secret reference exists but no secret value found
- `invalid` — secret value is present but fails the expected format/shape check
- `unavailable` — managed store unreachable, timeout, permission denied, or unexpected error (safe catch-all for infrastructure failure)

### `SecretRedactionPolicy` (extended from Impl 022)
Defines what must **never** appear in: errors · audit summaries · provider-attempt records · rendered messages · event records · logs · tests · docs examples · snapshots · smoke output.
- **Required:** raw secret value never appears; bearer/auth-like prefixes never appear in user-facing errors; error messages use **stable, non-secret reason codes** (`missing`/`invalid`/`unavailable`)
- **Permitted (safe refs):** a stable secret reference id, a source kind label (`"managed-store"`), a safe failure code, a `secretRetained: false` statement

### `SourcePrecedence`
The explicit ordering in which credential sources are consulted.
- **Must be explicit** — never inferred from environment state at runtime
- **Must not silently replace** the existing process-env adapter (the local/manual path remains valid)
- Mechanism (config, injection order, named resolver chain) deferred to 028A

---

## 9. Required Candidate Behavioral Flow

`[ASSUMPTION]` The smallest useful behavioral contract is a **single, explicit retrieval** that:

```text
operator or production adapter requests credential resolution
  → resolver consults the configured managed-secret source (injected client)
  → source calls managed-store client with the configured SecretRef
      → if unavailable/timeout/permission-denied → safe unavailable; stop
      → if missing → safe missing; stop
      → if malformed → safe invalid; stop
      → if available → opaque ProviderCredentialToken (raw value stays transient inside boundary)
  → ProviderCredentialToken returned to resolver
  → LiveCallPolicy still decides whether call may happen (separate gate)
  → if policy enabled AND other gates pass → LiveProviderClient → LiveProviderHttpTransport
  → provider response → validateDraft → ProviderRenderOutcome
  → audit/smoke/output → safe status only; rawRetained: false; no secret value
```

`[FACT]` In this flow: **no automatic live call on secret resolution**, **no domain mutation on secret resolution**, **no event emission required by secret resolution**, **no delivery**, **no telemetry**, **no raw secret in any output**.

---

## 10. Required Failure Semantics

`[DECISION]` Define a **safe outcome** for each failure mode. No raw secret, no cloud-provider response body, no retry unless a future spec explicitly defines it:

| Failure mode | Safe classification | Transport call? | Retry? | Notes |
|---|---|---|---|---|
| Secret missing (not in store) | `credential-missing` | No | No | Same as env adapter missing |
| Secret invalid / malformed | `credential-invalid` | No | No | Same as env adapter invalid |
| Managed store unreachable | `credential-unavailable` | No | No | Map to existing `provider-unavailable` |
| Managed store timeout | `credential-unavailable` | No | No | No transport; no retry this slice |
| Permission denied | `credential-unavailable` | No | No | Never expose cloud response body |
| Malformed store response payload | `credential-unavailable` | No | No | Never expose store payload |
| SDK / client unexpected exception | `credential-unavailable` | No | No | Never expose stack with secret |
| Provider rejects the credential | existing `ProviderOperationalFailure.invalid-credential` | — | No | Provider error path unchanged |

`[DECISION]` Every outcome is a **safe skip, safe stop, or safe failure** — never an automatic retry, never a scheduler, never a delivery, never a domain mutation, never raw leakage. **Source unavailability is not a domain failure.** Missing secret is not a `ProviderFailure` — it is a pre-transport credential failure.

---

## 11. Required Output / Trace Rules

**Allowed in any output, audit, event, or trace:**
- Safe credential status (`available`/`missing`/`invalid`/`unavailable`)
- Safe source kind label (`"managed-store"` or similar)
- Safe secret reference id / path — **only if it does not expose the secret value**
- Safe failure code (from the closed catalog above)
- A `secretRetained: false` statement
- Duration (if not sensitive and safe to record)

**Forbidden in any output, audit, event, or trace:**
- Raw secret value
- Bearer token / API key / credential token
- `process.env` value / full env dump
- Full managed-store response body
- Cloud provider response headers / metadata bag
- Provider request / response / draft
- Rendered message body
- Chain-of-thought / hidden reasoning
- Delivery target / body
- Arbitrary metadata bag

`[FACT]` The existing `liveProviderSmoke` helper already guarantees `rawRetained: false` and a closed redacted result — any operator smoke path using the managed-secret source inherits this redaction, by construction.

---

## 12. Required Use Cases (Given / When / Then)

**UC1 — Secret manager not configured.**
*Given* no managed-secret source is configured, *when* credential resolution is requested, *then* the system falls back only according to explicit configured source precedence (or fails closed if no source is configured), and **no live call occurs by the absence of configuration alone**.

**UC2 — Secret missing.**
*Given* a configured managed-secret source without the required provider credential in the store, *when* credential resolution occurs, *then* it returns a safe `credential-missing` result, **no transport call occurs**, and no raw store response is surfaced.

**UC3 — Secret invalid / malformed.**
*Given* a configured source returns malformed or invalid credential material, *when* credential resolution occurs, *then* it returns a safe `credential-invalid` result, **the raw value is not exposed**, and no transport call occurs.

**UC4 — Managed store unavailable.**
*Given* the managed store is unreachable (network error, service outage), *when* credential resolution occurs, *then* it returns safe `credential-unavailable`, **no retry/scheduler/event bus is created**, and no transport call occurs.

**UC5 — Permission denied.**
*Given* the runtime identity cannot access the secret (IAM policy denied, insufficient scope), *when* credential resolution occurs, *then* it returns safe `credential-unavailable`, **the cloud provider response body is not surfaced**, and no transport call occurs.

**UC6 — Secret available.**
*Given* the managed secret is available, *when* credential resolution occurs, *then* the credential **may be supplied only to the provider client boundary** as an opaque transient token, and **does not by itself enable a live call** (the `LiveCallPolicy` and opt-in still gate the call).

**UC7 — Operator smoke with managed-secret source.**
*Given* operator opt-in (`AURORA_LIVE_PROVIDER_SMOKE=1`) and non-CI context, *when* the operator smoke uses a future managed-secret source, *then* **all existing smoke gates still apply** (opt-in → CI → credential → live policy, each stopping before any provider call), and output remains **redacted** (`rawRetained: false`; no secret value in the printed `OperatorSmokeOutput`).

**UC8 — CI default.**
*Given* CI context (`CI` truthy), *when* a managed-secret source is configured, *then* the CI guard in `liveProviderSmoke` fires before credential resolution and before transport — **no live call occurs by default**.

**UC9 — Audit / output / event / trace inspection.**
*Given* any secret resolution outcome (any status), *when* audit records, event records, smoke output, operator output, or logs are inspected, *then* **no raw secret value appears** anywhere.

**UC10 — Domain isolation.**
*Given* domain modules (`observation`/`reasoning`/`understanding`/`decision-support`/`athlete`) are inspected, *when* managed-secret source code exists, *then* **none of those modules imports it**.

---

## 13. Acceptance Criteria

- Given no managed-secret source configured → behavior is **fail-closed or explicit fallback only**; no inferred fallback behavior.
- Given secret missing → **no live call happens by that fact alone**.
- Given secret invalid → **raw value is not exposed** in any result, error, or log.
- Given managed store unavailable → **no retry/scheduler/event bus is created**.
- Given secret available → **`LiveCallPolicy` and operator opt-in still gate provider call**.
- Given CI context → **no default live call occurs** regardless of secret availability.
- Given smoke output (any scenario) → **no secret value appears** in `OperatorSmokeOutput`.
- Given event/audit/trace records → **no secret value appears**.
- Given domain module imports are inspected → **no managed-secret source import exists** in `observation`/`reasoning`/`understanding`/`decision-support`/`athlete`.
- Given the production `src/` process-env guard is run → **the one-file seal remains intact**; no new `process.env` token inside `src/` is introduced.
- Given a future implementation → **all Impl 001–027 tests (633/633) remain green**.

---

## 14. Explicit Forbidden Behaviors

This spec forbids:

**Secret handling:**
- Raw secret logging
- Raw secret persistence (any record, state, repository, file)
- Raw secret in event/audit/trace records
- Raw secret in smoke output
- Raw secret in thrown user-facing error or exception
- Raw secret in provider-attempt audit
- Full env dump
- Full managed-store response body dump
- Cloud provider response headers surfaced to callers

**Coupling and enablement:**
- Managed-secret source importing domain module code
- Domain modules importing managed-secret source code
- Automatic live call on secret resolution (policy + opt-in still required)
- Bypassing `LiveCallPolicy`
- Bypassing operator opt-in
- Bypassing CI guard
- Bypassing `validateDraft`
- Delivery on secret availability
- Event recording triggered by secret resolution
- Evidence creation on secret availability
- Athlete-decision creation on secret availability
- Domain mutation on secret availability

**Infrastructure:**
- SDK selection in this behavioral spec
- Dependency installation in this spec
- Cloud provider choice in this spec
- Retry/backoff unless a future spec explicitly defines it
- Scheduler/queue/event bus
- Telemetry/model evaluation

**Guard integrity:**
- Weakening the process-env one-file guard
- Adding a new `process.env` token inside `src/` for the managed-secret source (the source connects to its store through an injected boundary, not via process-env)
- Replacing the existing `ProcessEnvironmentCredentialSourceAdapter` without explicit migration plan
- Implicit source precedence (precedence must be explicit)

**Default behavior:**
- Default CI live calls
- Default live calls on secret configuration
- Automatic credential-driven execution of any kind

---

## 15. Validation Strategy (defining tests for the future implementation)

`[DECISION]` The **negative tests are defining**, and they prove their guarantees **without making a live call and without a real managed store**. A future implementation (028A / Impl 028) must prove deterministically, with injected fakes, in the default suite:

1. **No domain module imports** managed-secret source code
2. **Missing secret → credential-missing** (no transport, no live call)
3. **Invalid/malformed secret → credential-invalid** (no transport, no raw value exposed)
4. **Unavailable source → credential-unavailable** (no transport, no retry/scheduler/event bus)
5. **Permission denied → credential-unavailable** (no cloud response body surfaced)
6. **Secret available → no automatic live call** (policy disabled → no transport even with credential)
7. **Secret available → no automatic live call** (opt-in absent → no transport even with credential)
8. **CI gate fires before credential resolution** (CI truthy → `ci-disabled` before store query)
9. **No raw secret in any output/audit/event/trace** (across all scenarios including `passed`)
10. **No raw secret in any thrown error or exception message**
11. **No SDK / package dependency added** (unless explicitly chosen in 028A)
12. **Process-env one-file guard remains sealed** (no new `process.env` in `src/`)
13. **Source precedence is explicit** (no implicit runtime inference)
14. **Existing `ProcessEnvironmentCredentialSourceAdapter` and `EnvironmentProviderCredentialResolver` are unchanged** and still pass their own tests
15. **`liveProviderSmoke` with a fake managed-secret source** still redacts all output
16. **Operator smoke output** (any scenario) contains no secret value
17. **Default suite remains deterministic** — no real store, no real credential, no network
18. **All Impl 001–027 tests (633/633) remain green**

`[FACT]` How tests reach a managed-secret source without a real store is a 028A concern (e.g. a deterministic `FakeManagedSecretClient` injected into the source boundary, analogous to `FakeProviderClient` for the live provider). The behavioral requirement is that all guarantees are provable **with fakes, deterministically, with no live call and no real secret**.

---

## 16. Persistence / Review / Delivery / Event rules

The managed-secret credential source must **not**: create or save a `RenderedMessageRecord`; append a review; mark display-eligible; call delivery; create a `DeliveryRecord`; append event records; expand the event catalog; create provider-attempt event records; trigger retry/scheduler; persist provider attempts automatically; persist a raw secret; persist a raw provider response; persist a prompt payload. Resolution ends at a `ProviderCredentialResolution` (or equivalent `ProviderCredentialToken` output); everything downstream is the unchanged Impl 021–027 path.

---

## 17. Relationship to Existing Architecture

- **Spec/Impl 027:** the operator smoke entrypoint exists and is manual-only — a future managed-secret source **must not make it automatic**; the entrypoint's gates (opt-in → CI → credential → live policy) all still apply
- **Spec/Impl 026:** `liveProviderSmoke` owns smoke semantics — the managed-secret source **does not duplicate or change them**; secret availability is **not** smoke success
- **Spec/Impl 025:** `orchestrateRenderDeliver` exists — the managed-secret source **must not be called from the orchestration path** as a step trigger; credential availability does not trigger a delivery step
- **Spec/Impl 024:** event factories are ref-only and inert — the managed-secret source appends **no event** on resolution
- **Spec/Impl 023:** the `ProcessEnvironmentCredentialSourceAdapter` is the **only** approved direct `process.env` read site inside `src/` — the managed-secret source is a **sibling** (different retrieval mechanism), **not a replacement**, and the process-env guard is **not weakened**
- **Spec/Impl 022:** the `EnvironmentProviderCredentialResolver` classifies an injected `EnvironmentCredentialSource` — the managed-secret source may feed a compatible shape into this existing classifier, or a sibling resolver may be added (mechanism deferred to 028A); classification rules are **unchanged**
- **Spec/Impl 021:** the `LiveCallPolicy` stays **fail-closed and disabled by default** — the managed-secret source is a **new credential source**, not a policy change; availability alone does not enable the call
- **Spec/Impl 020:** the serializer/parser/error-mapper stay **unchanged** — the managed-secret source touches only the credential resolution step, not the provider call payload
- **Spec/Impl 019:** the `ProviderClientBoundary` is **the only place** a raw credential may be consumed as a transient token — the managed-secret source feeds that boundary; it does not bypass it
- **Spec/Impl 018:** the provider-attempt audit stays **raw-free** — the managed-secret source contributes no raw secret to any `ProviderAttemptRecord`
- **Spec/Impl 024:** event records stay **ref-only and raw-free** — the managed-secret source creates no event record and contributes no secret value to any ref
- **Spec/Impl 014:** `validateDraft` remains the only path to a `RenderedMessage` — the managed-secret source does not bypass the validator

---

## 18. Open Design Questions (for 028A — do not resolve here)

1. Whether the production source implements `ProviderCredentialResolver` directly (same port as `StaticProviderCredentialResolver` / `EnvironmentProviderCredentialResolver`) or introduces a new `SecretCredentialSource` port that feeds `EnvironmentProviderCredentialResolver` (consistent with the existing `EnvironmentCredentialSource` injection seam)
2. Whether the production source should live in `rendering/application` or a separate infrastructure adapter location
3. Whether a cloud-specific adapter should be deferred to a later slice (028B or beyond)
4. Whether AWS Secrets Manager, SSM Parameter Store, GCP Secret Manager, Azure Key Vault, HashiCorp Vault, or another provider is preferred
5. Whether any SDK dependency is justified and which
6. Whether the local process-env / operator-manual path remains the **default** fallback or becomes explicitly opt-out
7. How source precedence is configured (e.g. ordered list of resolvers, explicit named config, injection order)
8. How secret reference ids are represented safely (path, ARN, name — and whether they are recorded in operator-visible config)
9. Whether secret rotation is in scope for 028 or deferred
10. Whether a cache/TTL for retrieved credentials is allowed (and whether expiry triggers any behavior)
11. Whether `credential-unavailable` and `permission-denied` need **distinct** codes in the closed catalog (vs. mapping both to the existing `unavailable` classification)
12. Whether the production deployment identity (service account, role, workload identity) should be specified now or in a later operational spec
13. Whether a CI-live lane is ever allowed (currently: no — remains deferred)
14. Whether a managed-secret smoke (i.e. a dedicated check that the managed store is reachable, separate from a live provider call) is ever in scope
15. Whether the `ManagedSecretStoreClient` boundary is synchronous (returns immediate secret value) or asynchronous (returns a Promise), and how that interacts with `EnvironmentCredentialSource`'s `Readonly<Record<string, string | undefined>>` shape

`[QUESTION]` These are carried forward; none blocks this behavioral spec. Technical implementation choices are not resolved here.

---

## 19. Success Criteria

When this spec is complete, a future **028A** (Technical Spec) should be able to answer:

> "Can Aurora add a production managed-secret credential source behind the existing resolver seam without leaking secrets, triggering automatic live calls, coupling domain code to infrastructure, weakening the process-env seal, breaking the operator smoke entrypoint, or choosing a cloud SDK prematurely?"

— and by the secret manager gate (§6), the preserved invariants (§7), the redaction policy (§8), the failure semantics (§10), the output rules (§11), and the defining negative tests (§15), the answer is **yes**: a managed-secret source is an injected operational boundary that retrieves a credential and supplies it transiently to the existing `ProviderCredentialResolver` path; domain modules never import it; raw secret values never leave the source boundary; every failure mode returns a safe closed status; `LiveCallPolicy` and operator opt-in still gate every live call; `validateDraft` remains mandatory; the process-env one-file guard is untouched; the existing local/manual credential path is preserved; and all Impl 001–027 tests remain green — with SDK selection, cloud-provider choice, source precedence mechanism, and deployment identity deferred to 028A. If the spec cannot answer that, it is incomplete.
