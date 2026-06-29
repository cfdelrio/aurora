# Aurora — Technical Spec 028A — Production Secret Manager Boundary Implementation Plan

> Phase: **Technical Specification** (TS-strict plan, no code).
> Translates: `docs/specs/028-production-secret-manager-boundary.md`.
> Status: this document fixes the **mechanism** for a provider-neutral managed-secret credential-source boundary and a deterministic fake/in-memory store client — the minimal TS-strict shape for Implementation 028. **No code, no SDK, no cloud-provider adapter, no dependency, no real secret, no CI credential, no live-call change, no operator-smoke change, no delivery/event/persistence change, no domain mutation.**

---

## 0. Phase confirmation

This is the **Technical Specification** phase, not Implementation.

- `[FACT]` This document plans; it changes no file under `src/`. No dependency is installed; `package.json`/`package-lock.json` are untouched by 028A (devDeps stay `typescript` + `@types/node`).
- `[DECISION]` 028A picks: the new port shapes and their location; the async retrieval boundary; the mapping from internal `ManagedSecretResolution` to the existing synchronous `EnvironmentCredentialSource`/`ProviderCredentialResolution` chain; the deterministic fake; the guard strategy; the test strategy — and stops there. No cloud vendor is chosen; no SDK is selected; no operator script is changed.

---

## 1. Context recap

Spec 028 (`028-production-secret-manager-boundary.md`) is complete. Aurora (post Impl 027) has the full credential resolution and operator smoke chain:

- **Credential resolution seam (Impl 021–023):**
  - `ProviderCredentialResolver` (synchronous interface: `resolve(): ProviderCredentialResolution`) — the downstream port
  - `ProviderCredentialResolution` — three-state union: `{ status: "available"; token: ProviderCredentialToken } | { status: "missing" } | { status: "invalid" }`
  - `ProviderCredentialToken` — branded opaque string, transient, used only in transport
  - `StaticProviderCredentialResolver` — deterministic sentinel (tests)
  - `EnvironmentCredentialSource` — `Readonly<Record<string, string | undefined>>` (injected source map)
  - `EnvironmentResolverConfig` — `{ keyName: string; source: EnvironmentCredentialSource; validation?: CredentialValidationPolicy }`
  - `EnvironmentProviderCredentialResolver` — classifies one key from an injected source into `missing`/`invalid`/`available`; synchronous; reads no process environment; unchanged
  - `ProcessEnvironmentAdapterConfig` — `{ keyName: string; accessor: ProcessEnvironmentAccessor }`
  - `ProcessEnvironmentAccessor` — `(key: string) => string | undefined`
  - `ProcessEnvironmentCredentialSourceAdapter` — reads exactly one key via an injected accessor; `toEnvironmentCredentialSource(): EnvironmentCredentialSource` (synchronous)
  - `defaultProcessEnvironmentAccessor` — the **only** direct `process.env` read site in `src/`; sealed by a repo-wide positive guard
  - `APPROVED_PROVIDER_CREDENTIAL_KEY = "AURORA_PROVIDER_CREDENTIAL"` — the approved operational key
- **Live-provider boundary (Impl 021):** `LiveCallPolicy` (disabled by default); `LiveProviderClient` takes `ProviderCredentialResolver` synchronously; `LiveProviderHttpTransport` — the only network file
- **Smoke + operator (Impl 026/027):** `liveProviderSmoke(command, deps)` — injected, fully synchronous-compatible collaborators (resolver is `ProviderCredentialResolver`; `LiveProviderClient` accepts a synchronous resolver)
- **Operator script (Impl 027):** `scripts/operator-live-smoke.mjs` — manual only; reads real env outside `src/`; uses approved adapter chain; unchanged in this slice

What does **not** exist: any production-managed-secret source, cloud-specific SDK, cloud-specific adapter, async credential resolution in the existing path, or any second `process.env` token inside `src/`.

---

## 2. Surface Gap Analysis (grounded in real code)

### 2.1 `ProviderCredentialResolver` interface
```typescript
// provider-credential-resolver.ts (Impl 021)
export interface ProviderCredentialResolver {
  resolve(): ProviderCredentialResolution;    // SYNCHRONOUS — no Promise
}
export type ProviderCredentialResolution =
  | { readonly status: "available"; readonly token: ProviderCredentialToken }
  | { readonly status: "missing" }
  | { readonly status: "invalid" };
```
`[FACT]` The port is **synchronous**. A managed-secret client is inherently **async** (network retrieval). This creates a **synchrony mismatch** that is the central design problem for this slice.

### 2.2 `EnvironmentCredentialSource` and `EnvironmentProviderCredentialResolver`
```typescript
// environment-provider-credential-resolver.ts (Impl 022)
export type EnvironmentCredentialSource = Readonly<Record<string, string | undefined>>;
export class EnvironmentProviderCredentialResolver implements ProviderCredentialResolver {
  constructor(config: EnvironmentResolverConfig) { ... }  // { keyName, source, validation? }
  resolve(): ProviderCredentialResolution { ... }          // synchronous
}
```
`[FACT]` `EnvironmentProviderCredentialResolver` is fed an **already-resolved** synchronous source map; it is the right consumer for a pre-fetched credential value. The managed-secret source must produce this same `EnvironmentCredentialSource` shape after async retrieval.

### 2.3 `ProcessEnvironmentCredentialSourceAdapter` (synchronous, one approved file)
```typescript
// process-environment-credential-source-adapter.ts (Impl 023)
export class ProcessEnvironmentCredentialSourceAdapter {
  constructor(config: ProcessEnvironmentAdapterConfig) { ... }
  toEnvironmentCredentialSource(): EnvironmentCredentialSource { ... }  // synchronous
}
export const defaultProcessEnvironmentAccessor: ProcessEnvironmentAccessor = (key) => process.env[key];
```
`[FACT]` This is the synchronous analogue. The new managed-secret source is the **async** analogue: it retrieves the value via an injected async client, then produces the same `EnvironmentCredentialSource` shape. It reads **no `process.env`**.

### 2.4 `StaticProviderCredentialResolver` (test sentinel)
```typescript
// static-provider-credential-resolver.ts (Impl 021)
export class StaticProviderCredentialResolver implements ProviderCredentialResolver {
  constructor(opts?: { readonly status?: StaticCredentialStatus }) { ... }
  resolve(): ProviderCredentialResolution { ... }
}
```
`[FACT]` Implements `ProviderCredentialResolver` directly (synchronous). The new managed-secret resolver does **not** follow this pattern; instead, it feeds the existing `EnvironmentProviderCredentialResolver` after async retrieval (see Decision 3 below).

### 2.5 `LiveProviderClient` dependency on credential resolver
```typescript
// live-provider-client.ts (Impl 021)
export interface LiveProviderClientDeps {
  readonly policy: LiveCallPolicy;
  readonly resolver: ProviderCredentialResolver;  // synchronous
  readonly transport: LiveProviderTransport;
}
```
`[FACT]` `LiveProviderClient` calls `resolver.resolve()` **synchronously** inside `async requestDraft(...)`. Any managed-secret integration must supply a **synchronous `ProviderCredentialResolver`** — which means the async retrieval must be completed **before** the resolver is constructed and injected.

### 2.6 `liveProviderSmoke` and operator entrypoint
```typescript
// live-provider-smoke.ts (Impl 026)
export interface LiveProviderSmokeDependencies {
  readonly resolver: ProviderCredentialResolver;  // synchronous
  // ...
}
export async function liveProviderSmoke(command, deps): Promise<LiveProviderSmokeResult> { ... }
```
`[FACT]` The smoke helper's resolver is also synchronous. The operator entrypoint (`scripts/operator-live-smoke.mjs`) calls `processEnvironmentCredentialSourceAdapter()` and passes `EnvironmentProviderCredentialResolver` to the smoke call. This pattern remains **unchanged** in Impl 028 — the operator script continues on the process-env path. A future slice may introduce a managed-secret operator path.

### 2.7 Process-env guard test
```typescript
// process-environment-negative-capability.test.ts (Impl 023)
// scans ALL production .ts files under src/ (excl. .test.ts / /tests/)
// asserts process.env token appears ONLY in "process-environment-credential-source-adapter.ts"
```
`[FACT]` Any new production `src/` file that reads `process.env` **would trip this guard and break the suite**. The managed-secret source must read **no `process.env`** (it connects to its store through an injected client, not via process environment).

### 2.8 Package/lockfile state
```json
// package.json — current state
"scripts": { "typecheck": "tsc --noEmit", "test": "node --test \"src/**/*.test.ts\"", "check": "..." },
"devDependencies": { "@types/node": "^22.20.0", "typescript": "^5.9.3" }
// no runtime dependencies
```
`[FACT]` No dependency change is permitted in Impl 028. The managed-secret store client is a **pure TypeScript interface** with a **fake in-memory implementation** — no package is needed.

### 2.9 Forbidden module directories (from existing negative-capability guards)
Guards already forbid creating: `src/modules/secrets`, `src/modules/config`, `src/modules/infrastructure`, `src/modules/provider`, `src/modules/llm`, `src/modules/openai`, `src/modules/anthropic`, `src/modules/telemetry`, `src/modules/evaluation`, `src/api`, `src/ui`, `src/providers`, `src/prompts`.

### 2.10 Synchrony mismatch — core design problem
`[FACT]` **The existing `ProviderCredentialResolver` port is synchronous. A real secret-manager client is async.** 028A must resolve this without:
- Adding `async resolve()` to `ProviderCredentialResolver` (breaks all existing implementations and callers)
- Changing `LiveProviderClient` (unchanged contract)
- Changing `liveProviderSmoke` (unchanged contract)
- Introducing a secret cached at module load time (global state, untestable)

`[DECISION]` The resolution is the **pre-fetch pattern**: async retrieval completes **before** the synchronous `ProviderCredentialResolver` is constructed. The new `ManagedSecretCredentialSource` has an `async toEnvironmentCredentialSource()` method that produces the existing `EnvironmentCredentialSource` map, which is then fed into the existing synchronous `EnvironmentProviderCredentialResolver`. The caller pre-fetches, then passes the resulting synchronous resolver into `LiveProviderClient` or `liveProviderSmoke`. This is the exact analogue of the synchronous `processEnvironmentCredentialSourceAdapter().toEnvironmentCredentialSource()` pattern — just async.

---

## 3. Central Question

> How can Aurora implement the first production-secret-manager boundary slice — a provider-neutral async retrieval seam + deterministic fake — while the downstream credential path remains **synchronous**, the process-env guard remains **sealed**, no SDK or dependency is added, the operator script stays unchanged, and all 633/633 tests pass?

Answer (proven by §2 and the decisions below): a **`ManagedSecretCredentialSource`** class takes an injected **`ManagedSecretStoreClient`** (async) + a configured secret name, retrieves the value via `async toEnvironmentCredentialSource(): Promise<EnvironmentCredentialSource>`, and the caller pre-fetches once before constructing the existing synchronous `EnvironmentProviderCredentialResolver`. A **`FakeManagedSecretStoreClient`** supplies deterministic scenarios to tests. The managed source reads no `process.env`, imports no cloud SDK, introduces no dependency, changes no existing file except `application/index.ts` to add exports, and the downstream synchronous path is **unchanged**.

---

## 4. Required Technical Decisions

### `[DECISION]` Decision 1 — Scope of Implementation 028 → **provider-neutral boundary + deterministic fake only**

Implementation 028 adds:
1. A `ManagedSecretStoreClient` interface (pure TypeScript, no cloud SDK)
2. A `ManagedSecretCredentialSource` class (async async retrieval → `EnvironmentCredentialSource`)
3. A `ManagedSecretResolution` closed union (4 states; internal to the managed-source boundary)
4. A `FakeManagedSecretStoreClient` (deterministic scenarios; tests only)
5. Functional tests + negative-capability guard tests

It does **not** add:
- AWS/GCP/Azure/HashiCorp adapters
- Any SDK package dependency
- Any `process.env` read in `src/`
- Changes to `operator-live-smoke.mjs`
- Changes to `liveProviderSmoke`, `EnvironmentProviderCredentialResolver`, `ProcessEnvironmentCredentialSourceAdapter`, `LiveCallPolicy`, or `validateDraft`
- New top-level modules

Rationale: Spec 028 defines the **behavioral boundary**; the first implementation slice proves the seam exists and is provably correct with fakes before any cloud SDK is chosen. Cloud-specific adapters belong in a later slice (Spec 029 or 030A).

### `[DECISION]` Decision 2 — Placement → **`rendering/application`, not domain; single new file**

```text
src/modules/rendering/application/managed-secret-credential-source.ts   ← new
src/modules/rendering/tests/managed-secret-credential-source.test.ts    ← new
src/modules/rendering/tests/managed-secret-negative-capability.test.ts  ← new
src/modules/rendering/application/index.ts                              ← updated (exports only)
```

Rationale:
- Secret retrieval is an **application/integration concern**, not domain
- Follows the established pattern: `environment-provider-credential-resolver.ts`, `process-environment-credential-source-adapter.ts`, `live-provider-smoke.ts`, `operator-live-smoke-entrypoint.ts` — all live in `rendering/application`
- `rendering/domain` must not import secret-manager code (domain invariant)
- No new top-level module is created — does **not** trigger `AC20` (`ALLOWED_MODULES` check)

### `[DECISION]` Decision 3 — Port shape → **async `ManagedSecretStoreClient` + `async toEnvironmentCredentialSource()` producing existing `EnvironmentCredentialSource`; pre-fetch pattern preserves the synchronous downstream**

`[FACT]` (Surface-gap §2.10) The synchrony mismatch forces the design.

`[DECISION]` Implementation 028 **does not** add an async variant of `ProviderCredentialResolver`. Instead, the managed source exposes a `async toEnvironmentCredentialSource(secretName: string): Promise<EnvironmentCredentialSource>` method — the **async analogue** of `ProcessEnvironmentCredentialSourceAdapter.toEnvironmentCredentialSource()` (which is synchronous because `process.env` is synchronous).

The caller (production wiring or test) uses the **pre-fetch pattern**:

```text
const source = await managedSecretSource.toEnvironmentCredentialSource(secretName);
const resolver = new EnvironmentProviderCredentialResolver({ keyName: secretName, source });
// now `resolver` is synchronous and compatible with LiveProviderClient / liveProviderSmoke
```

This keeps the entire downstream synchronous chain **unchanged** — `ProviderCredentialResolver.resolve()`, `LiveProviderClient`, `liveProviderSmoke` — while the async retrieval happens in one explicit pre-fetch step before injection.

### `[DECISION]` Decision 4 — Internal resolution type → **`ManagedSecretResolution` (4 states); maps to `EnvironmentCredentialSource`**

```typescript
export type ManagedSecretResolution =
  | { readonly status: "available"; readonly value: string }   // raw string — stays inside this boundary
  | { readonly status: "missing" }                             // not in store
  | { readonly status: "invalid" }                             // malformed / failed-shape value
  | { readonly status: "unavailable" };                        // store unreachable / permission denied / timeout / unexpected
```

Mapping to `EnvironmentCredentialSource` (for `EnvironmentProviderCredentialResolver`):

| `ManagedSecretResolution` | `EnvironmentCredentialSource` | `EnvironmentProviderCredentialResolver` result |
|---|---|---|
| `available` | `{ [secretName]: value }` | `available` (token) |
| `missing` | `{}` (empty) | `missing` |
| `invalid` | `{}` (empty) | `missing` (safe; resolver never sees a malformed value) |
| `unavailable` | `{}` (empty) | `missing` (safe; store failure → no credential → no call) |

`[FACT]` The raw `value` from `available` is **only visible inside the `ManagedSecretCredentialSource` boundary** — it is placed in the `EnvironmentCredentialSource` map and immediately consumed by `EnvironmentProviderCredentialResolver`, which wraps it in the opaque `ProviderCredentialToken`. The raw string is never returned through `toEnvironmentCredentialSource()`'s return type annotation as anything other than part of the `EnvironmentCredentialSource` shape (which `EnvironmentProviderCredentialResolver` already handles). Tests using `FakeManagedSecretStoreClient` never use real secret strings.

`[DECISION]` The `ManagedSecretResolution` type is **internal to the `managed-secret-credential-source.ts` file** (not exported beyond what's needed). The `FakeManagedSecretStoreClient` returns it so tests can assert which scenario ran — the fake carries no raw secret value in non-`available` scenarios.

### `[DECISION]` Decision 5 — `ManagedSecretStoreClient` → **pure TypeScript interface; async; injected; no cloud SDK**

```typescript
export interface ManagedSecretStoreClient {
  retrieve(secretName: string): Promise<ManagedSecretResolution>;
}
```

Rules:
- The interface has **no SDK import**, **no network token**, **no cloud-provider identifier**
- `secretName` is an opaque `string` reference — what the store calls the secret (ARN, path, name — deferred to 028A tech detail or cloud adapter)
- Returns `ManagedSecretResolution` (the rich 4-state union); the source maps it to `EnvironmentCredentialSource`
- All exceptions (network errors, permission denied, timeout) must be caught inside the **implementation** and returned as `{ status: "unavailable" }` — the interface contract is that `retrieve()` never rejects; it returns a `Promise` that always resolves to a `ManagedSecretResolution`
- Tests use `FakeManagedSecretStoreClient`; no real implementation exists in this slice

### `[DECISION]` Decision 6 — `ManagedSecretCredentialSource` class

```typescript
export interface ManagedSecretSourceConfig {
  /** the configured secret reference (path, name, ARN — opaque; no cloud-specific type) */
  readonly secretName: string;
  /** the injected async client — never constructed automatically; tests use the fake */
  readonly storeClient: ManagedSecretStoreClient;
}

export class ManagedSecretCredentialSource {
  private readonly secretName: string;
  private readonly storeClient: ManagedSecretStoreClient;

  constructor(config: ManagedSecretSourceConfig) {
    this.secretName = config.secretName;
    this.storeClient = config.storeClient;
  }

  /**
   * Retrieve the managed secret and produce an EnvironmentCredentialSource compatible with
   * EnvironmentProviderCredentialResolver. Async because the store is a network boundary.
   * Always resolves (never rejects): store failures map to empty source (resolver: missing).
   * The raw value is never returned in failures; it is placed in the source map only on available.
   */
  async toEnvironmentCredentialSource(): Promise<EnvironmentCredentialSource> {
    const resolution = await this.storeClient.retrieve(this.secretName);
    if (resolution.status === "available") {
      return Object.freeze({ [this.secretName]: resolution.value });
    }
    // missing / invalid / unavailable → empty source → resolver classifies as "missing" → no call
    return Object.freeze({});
  }
}
```

`[FACT]` The method always resolves — it never rejects and never throws to the caller. All store errors are caught inside `retrieve()` (implementation responsibility). The caller does not need a `try/catch` around `toEnvironmentCredentialSource()`.

`[DECISION]` This class reads **no `process.env`** (zero env token), imports no cloud SDK, imports no delivery/event/orchestration/domain module, and adds no new dependencies. Guard tests will verify this positively.

### `[DECISION]` Decision 7 — `FakeManagedSecretStoreClient` → **deterministic, scenario-driven; never uses real secrets**

```typescript
export type ManagedSecretClientScenario = "available" | "missing" | "invalid" | "unavailable";

export class FakeManagedSecretStoreClient implements ManagedSecretStoreClient {
  private readonly scenario: ManagedSecretClientScenario;

  constructor(opts?: { readonly scenario?: ManagedSecretClientScenario }) {
    this.scenario = opts?.scenario ?? "available";
  }

  async retrieve(secretName: string): Promise<ManagedSecretResolution> {
    if (this.scenario === "available") {
      // non-secret sentinel — proves the available path without a real key
      return Object.freeze({ status: "available", value: "opaque:test-managed-secret" });
    }
    // missing / invalid / unavailable — no value field in the result
    return Object.freeze({ status: this.scenario });
  }
}
```

`[FACT]` The fake uses `"opaque:test-managed-secret"` — a clearly-not-real sentinel matching the `StaticProviderCredentialResolver` precedent (`"opaque:test-credential"`). Tests must **never** use a real API key or real secret string; guards must assert no credential-like string appears in test files.

### `[DECISION]` Decision 8 — Redaction policy implementation

The raw secret value from `available` resolution:
1. Enters `toEnvironmentCredentialSource()` as `resolution.value`
2. Is placed in the `EnvironmentCredentialSource` map as `{ [this.secretName]: resolution.value }`
3. Is consumed by `EnvironmentProviderCredentialResolver`, which wraps it in `ProviderCredentialToken` (branded string, opaque)
4. The token is used only inside `LiveProviderHttpTransport` (as a `Bearer ${token}` header)
5. The raw string **never returns to any caller** of `ManagedSecretCredentialSource` — it is embedded in the opaque source map and wrapped again by the resolver

`[DECISION]` The `ManagedSecretResolution` type's `available` branch carries `value: string` (the raw credential). This field is **internal** — tests using `FakeManagedSecretStoreClient` never assign a real credential to it. No test should serialize a `ManagedSecretResolution` object to JSON and inspect it for credential values; instead, tests assert on the downstream `ProviderCredentialResolution` (which carries only the opaque token) and the final `ProviderRenderOutcome` (which carries no credential at all).

### `[DECISION]` Decision 9 — Source precedence → **not introduced in Impl 028; explicitly deferred**

`[DECISION]` Implementation 028 does **not** introduce a source-precedence mechanism. The managed source and the existing process-env adapter are independent; precedence is a caller/wiring responsibility. The tech spec for a precedence mechanism belongs in a later slice (e.g. 028B or a dedicated config-management spec). Operator smoke continues on the existing `processEnvironmentCredentialSourceAdapter()` path.

### `[DECISION]` Decision 10 — Operator script → **unchanged in Impl 028**

`scripts/operator-live-smoke.mjs` is **not modified** in Impl 028. It continues to use `processEnvironmentCredentialSourceAdapter() → EnvironmentProviderCredentialResolver`. Connecting the managed-secret source to the operator script requires a separate operational decision about which source to use for manual invocations — a concern for a future slice. Rationale: the operator script is stable and validated; the managed-secret seam should be proven independently before being wired into the operator path.

### `[DECISION]` Decision 11 — No cloud SDK, no dependency change

The `ManagedSecretStoreClient` interface is a pure TypeScript boundary. No implementation exists in this slice. `package.json` and `package-lock.json` are **untouched** in Impl 028 — no dependency is added. The existing guard (`devDependencies == ["@types/node","typescript"]`) remains green.

### `[DECISION]` Decision 12 — Process-env guard → **intact; new file reads no `process.env`**

`managed-secret-credential-source.ts` contains **no `process.env` token**. The existing repo-wide positive guard (`process-environment-negative-capability.test.ts`) continues to pass because the new file is a production `.ts` file under `src/` — it will be scanned, and the guard will confirm no `process.env` token in it. No guard weakening, no new exception.

### `[DECISION]` Decision 13 — Testing strategy → **fakes only; no real store; no network; no SDK; no CI credential**

All tests inject `FakeManagedSecretStoreClient`. No test requires a real managed-secret store, a real network call, real credentials, or a CI secret. Tests run in the default suite deterministically. The full test contract is specified in §6.

### `[DECISION]` Decision 14 — Export via `application/index.ts`

Add a new section to `src/modules/rendering/application/index.ts` exporting:
- `ManagedSecretCredentialSource`
- `ManagedSecretSourceConfig`
- `ManagedSecretStoreClient`
- `ManagedSecretResolution`
- `ManagedSecretClientScenario`
- `FakeManagedSecretStoreClient`

No other file is modified. `rendering/index.ts` already re-exports `application/index.ts` — no change needed.

---

## 5. Integration Flow (pre-fetch pattern)

```text
// ——— Async retrieval (pre-fetch before synchronous path) ———
ManagedSecretCredentialSource({ secretName, storeClient: FakeManagedSecretStoreClient })
  → async toEnvironmentCredentialSource()
       → storeClient.retrieve(secretName)
           → FakeManagedSecretStoreClient: returns ManagedSecretResolution
               available  → { [secretName]: "opaque:test-managed-secret" }
               missing    → {}
               invalid    → {}
               unavailable → {}
       → EnvironmentCredentialSource (the existing read-only map shape)

// ——— Synchronous downstream (UNCHANGED from Impl 022/023) ———
new EnvironmentProviderCredentialResolver({ keyName: secretName, source })
  → resolve() — synchronous
      absent/empty key → missing
      blank/control/too-short → invalid
      else → available(token: ProviderCredentialToken)   // opaque transient token

// ——— Live path (UNCHANGED from Impl 021) ———
LiveProviderClient({ policy: LiveCallPolicy.enabled(...), resolver, transport })
  → requestDraft(...)
       if !policy.enabled → failed("provider-unavailable")
       if credential.missing → failed("missing-credential")
       if credential.invalid → failed("invalid-credential")
       else → LiveProviderHttpTransport.send(payload, token, policy)
           → parseProviderResponse / mapProviderError
           → ProviderClientResponse

// ——— Validation (UNCHANGED) ———
requestRealProviderRendering → validateDraft → ProviderRenderOutcome

// ——— Smoke (UNCHANGED) ———
liveProviderSmoke(command, { client: LiveProviderClient, policy, resolver, config })
  → opt-in / CI / credential / policy gates in order
  → at most one provider call
  → closed, redacted LiveProviderSmokeResult
```

`[FACT]` The only new step is the `await toEnvironmentCredentialSource()` pre-fetch before constructing the resolver. Everything downstream is **unchanged**.

---

## 6. Proposed File Layout (Option A — confirmed)

```text
src/modules/rendering/application/
  managed-secret-credential-source.ts           ← NEW (Impl 028)
  index.ts                                      ← UPDATED (exports only)
  [all existing files unchanged]

src/modules/rendering/tests/
  managed-secret-credential-source.test.ts      ← NEW (Impl 028)
  managed-secret-negative-capability.test.ts    ← NEW (Impl 028)
  [all existing tests unchanged]
```

**Forbidden (must not create):**
```text
src/modules/secrets/
src/modules/secret-manager/
src/modules/infrastructure/
src/modules/aws/
src/modules/gcp/
src/modules/azure/
src/modules/workflow/
src/modules/orchestrator/
src/modules/event-bus/
src/modules/queue/
src/modules/scheduler/
src/modules/retry/
src/modules/telemetry/
src/modules/evaluation/
src/modules/provider/
src/modules/llm/
src/api/
src/db/
src/database/
src/migrations/
```

---

## 7. Type Shapes (TS-strict, no constructor parameter properties, explicit field declarations)

### `managed-secret-credential-source.ts`

```typescript
// Closed internal resolution — 4 states; ManagedSecretStoreClient returns this; never exposed raw to callers.
export type ManagedSecretResolution =
  | { readonly status: "available"; readonly value: string }
  | { readonly status: "missing" }
  | { readonly status: "invalid" }
  | { readonly status: "unavailable" };

// Async retrieval boundary — pure TypeScript; no SDK import; injected in all usage.
export interface ManagedSecretStoreClient {
  retrieve(secretName: string): Promise<ManagedSecretResolution>;
}

export interface ManagedSecretSourceConfig {
  readonly secretName: string;          // opaque store reference — path, name, ARN (deferred to cloud adapter)
  readonly storeClient: ManagedSecretStoreClient;
}

export class ManagedSecretCredentialSource {
  private readonly secretName: string;
  private readonly storeClient: ManagedSecretStoreClient;

  constructor(config: ManagedSecretSourceConfig) {
    this.secretName = config.secretName;
    this.storeClient = config.storeClient;
  }

  // Returns EnvironmentCredentialSource — the existing shape consumed by EnvironmentProviderCredentialResolver.
  // Always resolves (never rejects): store errors return empty source → resolver classifies as "missing" → no call.
  async toEnvironmentCredentialSource(): Promise<EnvironmentCredentialSource> { ... }
}

// Deterministic test scenarios — no real secret, no SDK, no network.
export type ManagedSecretClientScenario = "available" | "missing" | "invalid" | "unavailable";

export class FakeManagedSecretStoreClient implements ManagedSecretStoreClient {
  private readonly scenario: ManagedSecretClientScenario;
  constructor(opts?: { readonly scenario?: ManagedSecretClientScenario }) {
    this.scenario = opts?.scenario ?? "available";
  }
  async retrieve(secretName: string): Promise<ManagedSecretResolution> { ... }
}
```

`[FACT]` `EnvironmentCredentialSource` is imported from `environment-provider-credential-resolver.ts` (already in the same `rendering/application/` directory) — no new cross-module import.

---

## 8. Required Test Contract (`managed-secret-credential-source.test.ts`)

### Functional tests (all with `FakeManagedSecretStoreClient`, no network, no SDK, no CI credential)

| Test | Scenario | Expected |
|---|---|---|
| `available` scenario | fake returns `available` with sentinel value | `toEnvironmentCredentialSource()` → map with key present |
| `available` + resolver | feed source into `EnvironmentProviderCredentialResolver` | resolver returns `available` + `ProviderCredentialToken` |
| `available` + policy disabled | resolver `available`, `LiveCallPolicy.disabled()` | `LiveProviderClient` returns safe failure; no transport |
| `missing` scenario | fake returns `missing` | source map is empty; resolver returns `missing` |
| `invalid` scenario | fake returns `invalid` | source map is empty; resolver returns `missing` (collapsed) |
| `unavailable` scenario | fake returns `unavailable` | source map is empty; resolver returns `missing` (collapsed) |
| no raw value in empty-source | missing/invalid/unavailable | source map must not contain any value for the secret key |
| no raw sentinel in `available` result | `toEnvironmentCredentialSource()` return | the return value is an `EnvironmentCredentialSource` map — value may be present there (classified by resolver); but the `ManagedSecretResolution.value` field must NOT appear beyond the source boundary |
| secret availability ≠ live call | fake `available` + `LiveCallPolicy.disabled()` | no transport invocation |
| smoke with managed source (`passed`) | `liveProviderSmoke` with managed-source resolver + `FakeProviderClient` | returns `passed`; `rawRetained: false` |
| smoke with managed source (`credential-missing`) | missing managed source → resolver returns `missing` | smoke returns `credential-missing` before provider call |
| `toEnvironmentCredentialSource()` never rejects | `unavailable` scenario | must return `Promise<EnvironmentCredentialSource>` (not throw) |

### Result/output inspection tests
- JSON-serialized `toEnvironmentCredentialSource()` result: for `missing`/`invalid`/`unavailable` must be `{}` or `{ [key]: undefined-absent }` — the sentinel `"opaque:test-managed-secret"` must NOT appear in the empty-case serializations
- JSON-serialized `LiveProviderSmokeResult` (for `credential-missing` path): must contain no credential-like string

---

## 9. Required Test Contract (`managed-secret-negative-capability.test.ts`)

| Test | Assertion |
|---|---|
| new file exists | `managed-secret-credential-source.ts` exists in `rendering/application/` |
| no `process.env` token | the new file contains no `process.env` token (indirectly constructed to avoid being a token site itself) |
| no vendor / SDK / network token | no `openai`/`anthropic`/`axios`/`node:https`/`fetch(`/`https://` in the new file |
| no upstream / delivery / event / orchestration import | no `from ... /observation/`, `/reasoning/`, `/understanding/`, `/athlete/`, `/event-recording/`, `/delivery/`, `/application-orchestration/` |
| no module outside `rendering` imports the new source | `observation`/`reasoning`/`understanding`/`decision-support`/`athlete`/`event-recording`/`delivery` do not reference `ManagedSecretCredentialSource` / `ManagedSecretStoreClient` / `FakeManagedSecretStoreClient` |
| no forbidden module created | same pattern as existing guards — `src/modules/secrets`, `src/modules/secret-manager`, `src/modules/infrastructure`, etc. must not exist |
| no SDK / dependency change | `package.json` `dependencies` empty; `devDependencies` == `["@types/node","typescript"]` |
| process-env one-file guard still passes | (re-run or reference: the existing `process-environment-negative-capability.test.ts` must still pass; the new file must not be the second token site) |
| operator smoke tests still pass | (no change to `liveProviderSmoke`, `operator-live-smoke-entrypoint.ts`, or the script) |

---

## 10. Failure Semantics — Implementation Plan

| Failure mode | `storeClient.retrieve()` returns | `toEnvironmentCredentialSource()` | `EnvironmentProviderCredentialResolver.resolve()` | Call occurs? |
|---|---|---|---|---|
| Not configured (no client) | — | error at construction time | — | No |
| Secret missing | `{ status: "missing" }` | `{}` | `missing` | No |
| Secret invalid / malformed | `{ status: "invalid" }` | `{}` | `missing` (collapsed) | No |
| Store unavailable / unreachable | `{ status: "unavailable" }` | `{}` | `missing` (collapsed) | No |
| Permission denied | `{ status: "unavailable" }` | `{}` | `missing` (collapsed) | No |
| Timeout | `{ status: "unavailable" }` | `{}` | `missing` (collapsed) | No |
| Unexpected exception | `{ status: "unavailable" }` | `{}` | `missing` (collapsed) | No |
| Provider rejects credential | (store returns available) | map with value | `available` | `LiveProviderClient` → `invalid-credential` from provider error → mapped to `ProviderOperationalFailure` |

`[FACT]` All non-`available` outcomes result in `{}` (empty source) → resolver returns `missing` → `LiveProviderClient` returns `failed("missing-credential")` → no transport. The distinction between `missing`, `invalid`, and `unavailable` is captured in `ManagedSecretResolution` (observable in tests via `FakeManagedSecretStoreClient`) but collapses to `missing` in the downstream resolver. This is safe: the effect is identical ("no call") and the distinction between "store down" and "secret absent" is an operational concern for logging (in a future production adapter), not a behavioral concern for the provider boundary.

---

## 11. Guard Strategy

### Existing guards — all remain green

| Existing guard | Effect on new file |
|---|---|
| `process-environment-negative-capability.test.ts` — env token in one file only | New file scanned; token absent; guard passes |
| `environment-secret-negative-capability.test.ts` — env resolver isolation | New file not named `environment-provider-credential`; not scanned; guard unaffected |
| `live-provider-negative-capability.test.ts` — live provider isolation | New file not in the scanned set; guard unaffected |
| `live-provider-smoke-negative-capability.test.ts` — smoke helper isolation | New symbols not in the smoke helper; guard unaffected |
| `operator-live-smoke-entrypoint-negative-capability.test.ts` — operator support isolation | No changes to entrypoint; guard unaffected |
| All existing module-boundary guards | New file imports no upstream / delivery / event / orchestration module |

### New guard (`managed-secret-negative-capability.test.ts`)

The new guard provides positive assertions for the new file:
- No `process.env` token (the pattern for the regex is assembled from fragments so the guard test file is not itself a token site)
- No vendor/SDK/network token
- No forbidden module import
- No module outside `rendering` imports the new symbols
- No forbidden new top-level module created
- Package guard: no dependency change

---

## 12. Boundary / Import Rules for Implementation 028

**Allowed imports in `managed-secret-credential-source.ts`:**
- `import type { EnvironmentCredentialSource } from "./environment-provider-credential-resolver.ts"` — the existing source map type
- Node built-in types from `@types/node` if needed for type assertions (not for `process.env`)

**Forbidden imports in `managed-secret-credential-source.ts`:**
- `process.env` (any usage)
- Any cloud SDK (`@aws-sdk/...`, `@google-cloud/...`, `@azure/...`, etc.)
- `node:https`, `node:http`, `fetch(...)`
- Any module from `delivery`, `event-recording`, `application-orchestration`
- Any upstream domain module (`observation`, `reasoning`, `understanding`, `decision-support`, `athlete`)
- Any file outside `rendering/`

**Allowed imports in test files:**
- `import { ..., FakeManagedSecretStoreClient, ManagedSecretCredentialSource } from "../index.ts"`
- `import type { ... } from "../index.ts"`
- Node test runner + assert
- Test fixtures from `./fixtures.ts`
- `FakeProviderClient`, `LiveCallPolicy`, `StaticProviderCredentialResolver`, `EnvironmentProviderCredentialResolver`, `liveProviderSmoke` — all existing public surfaces

---

## 13. Relationship To Existing Architecture

- **Spec/Impl 027:** operator entrypoint exists and is unchanged; managed-secret source is independent — it is NOT wired into the operator script in this slice
- **Spec/Impl 026:** `liveProviderSmoke` helper is unchanged; the managed-source can feed it through the pre-fetch pattern (proved by `liveProviderSmoke` tests in the new test file)
- **Spec/Impl 025:** `orchestrateRenderDeliver` is unchanged; credential availability is not a trigger
- **Spec/Impl 024:** event factories are unchanged; the managed source creates no event
- **Spec/Impl 023:** `ProcessEnvironmentCredentialSourceAdapter` remains the only `process.env` read site; the new file reads no `process.env`; the positive one-file guard continues to assert exactly one file
- **Spec/Impl 022:** `EnvironmentProviderCredentialResolver` is **reused unchanged** — the managed source produces `EnvironmentCredentialSource`, which the resolver already consumes; no new resolver type is needed
- **Spec/Impl 021:** `LiveCallPolicy` and `LiveProviderClient` are unchanged; credential availability does not enable live calls
- **Spec/Impl 019:** `ProviderClientBoundary` is unchanged; the `ManagedSecretCredentialSource` does not touch the provider call boundary
- **Spec/Impl 018:** provider-attempt audit is unchanged; no raw secret enters any audit record
- **Spec/Impl 024:** events remain ref-only and raw-free; the managed source creates none
- **Spec/Impl 014:** `validateDraft` remains mandatory; unchanged

---

## 14. Open Questions (non-blocking; deferred to later slices)

1. Which cloud provider adapter to implement first (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, SSM Parameter Store, HashiCorp Vault)
2. Whether the cloud adapter lives in `rendering/application` or a new approved adapter module (Spec 029 would decide)
3. Whether the `secretName` parameter should use a typed wrapper (`SecretRef` branding) to distinguish it from raw values at the type level
4. Whether to introduce a `ManagedSecretCredentialSourceAdapter` factory function (analogous to `processEnvironmentCredentialSourceAdapter(keyName?)`) for standard construction
5. Whether `unavailable` and `invalid` should ultimately produce different downstream `ProviderCredentialResolution` states (requiring an extension to `ProviderCredentialResolution` in a future slice)
6. Whether the source precedence mechanism (managed store vs. process-env adapter) lives in a new config/resolver-chain type or in composition code
7. Whether the operator script should gain a `--use-managed-secret` mode (or similar) in a later operational slice
8. Whether the `secretName` should be configurable per-environment or hard-coded to `APPROVED_PROVIDER_CREDENTIAL_KEY`
9. Whether secret rotation is handled at the `ManagedSecretStoreClient` level (each call re-fetches) or at the source level (TTL cache)
10. Whether CI-live lanes ever exist and which secret source they use

---

## 15. Implementation Task Preview

**Task title:** `Implementation 028 — Add provider-neutral managed secret credential-source boundary`

**Files to create:**
1. `src/modules/rendering/application/managed-secret-credential-source.ts`
2. `src/modules/rendering/tests/managed-secret-credential-source.test.ts`
3. `src/modules/rendering/tests/managed-secret-negative-capability.test.ts`

**File to update:**
4. `src/modules/rendering/application/index.ts` — add export section for Impl 028 (analogous to existing sections)

**Strict constraints for the implementation:**
- **No cloud SDK** (AWS/GCP/Azure/HashiCorp/Vault — none)
- **No dependency change** — `package.json` and `package-lock.json` untouched
- **No cloud-specific adapter** in this slice
- **No real secret access** — `FakeManagedSecretStoreClient` only; tests use the sentinel value `"opaque:test-managed-secret"`
- **Deterministic fake source only** — all tests pass without network, real credentials, or CI secrets
- **No operator script change** — `scripts/operator-live-smoke.mjs` unchanged
- **No `process.env` in `managed-secret-credential-source.ts`** — the existing one-file guard must stay green
- **No live-call enablement** — all tests with `FakeManagedSecretStoreClient`/`"available"` verify that `LiveCallPolicy.disabled()` still blocks the transport
- **No raw secret in any output** — tests verify JSON-serialized results contain no credential-like values for non-available paths; the `available` sentinel stays opaque through the resolver
- **No persistence / delivery / event / domain mutation** — the managed source is a pre-fetch-and-resolve step only
- **All 633/633 existing tests remain green** — no existing file is changed except `application/index.ts` (exports only)

**Success check:** After implementation, a future cloud-adapter slice (Spec 029) should be able to implement `ManagedSecretStoreClient` against a real cloud SDK and inject it into `ManagedSecretCredentialSource` without changing any other file — the seam is already in place.

---

## 16. Success Criteria

When this tech spec is complete, **Implementation 028** should be able to answer:

> "Can Aurora implement the first production-secret-manager credential-source boundary slice — a provider-neutral `ManagedSecretStoreClient` interface, a `ManagedSecretCredentialSource` class with async `toEnvironmentCredentialSource()`, and a `FakeManagedSecretStoreClient` — while guaranteeing no SDK dependency, no `process.env` token in the new file, no raw secret leakage, no automatic live call, no domain coupling, no operator-script change, and all 633/633 existing tests green?"

— and by the pre-fetch integration flow (§5), the type shapes (§7), the test contracts (§8/§9), the failure semantics (§10), the guard strategy (§11), and the import rules (§12), the answer is **yes**: the managed-secret boundary is a pure TypeScript seam, injected and async at the retrieval step and synchronous at every downstream step, proven entirely with fakes in the default suite, with no new module, no dependency, no cloud SDK, and no guard weakened. If the tech spec cannot answer that, it is incomplete.
