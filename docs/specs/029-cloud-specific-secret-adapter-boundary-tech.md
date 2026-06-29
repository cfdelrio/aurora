# Aurora — Technical Spec 029A — Cloud-Specific Secret Adapter Boundary Implementation Plan

> **Status (2026-06-29).** Technical Specification phase for Spec 029
> (`f0ff8c1 — Spec 029 — Cloud-Specific Secret Adapter Boundary`). This document translates the
> behavioral-only Spec 029 into a **TS-strict implementation plan grounded in the real code**. It selects
> **no** cloud provider, adds **no** SDK, adds **no** dependency, changes **no** live-provider behavior,
> changes **no** operator smoke behavior, weakens **no** `process.env` guard, adds **no** source-precedence
> implementation, and writes **no** production code or test. Recent completed sequence:
> `b560b25` (Spec 028) → `f598ad6` (Tech Spec 028A) → `0f63928` (Impl 028) → `9cabc18` (Docs post Impl 028)
> → `f0ff8c1` (Spec 029). Validation at authorship: `tsc --noEmit` clean; `node --test` 672/672.

---

## 0. Phase confirmation

This is the **Technical Specification** phase, not Implementation.

- This document **plans** Implementation 029; it writes no production code and no test.
- It opens exactly one technical question: *what is the smallest safe slice after Spec 029, given the real
  code?*
- It does **not** choose AWS / GCP / Azure, does **not** add an SDK, does **not** add a dependency, does
  **not** change `package.json` / `package-lock.json`, does **not** read the process environment, does
  **not** change the operator smoke script, and does **not** implement source precedence.
- Spec 029 is behavioral-only and deliberately did not select a provider or an SDK. This tech spec inherits
  that discipline and proves — from the real code — whether a *provider-neutral* cloud-adapter slice adds
  distinct value, or whether provider selection must come first.

---

## 1. Context recap (grounded in the real surface)

Implementation 028 (`0f63928`) added a **provider-neutral, async managed-secret credential-source seam**
inside `rendering/application/`. The real, current facts (verified against the source):

- `src/modules/rendering/application/managed-secret-credential-source.ts` exists and exports:
  - `ManagedSecretResolution` — a 4-state discriminated union (see §2.1).
  - `ManagedSecretStoreClient` — a **pure TypeScript async interface**; `retrieve(secretName): Promise<…>`;
    **always resolves, never rejects** (implementations catch all exceptions internally); no cloud SDK.
  - `ManagedSecretSourceConfig` — `{ secretName: string; storeClient: ManagedSecretStoreClient }`.
  - `ManagedSecretCredentialSource` — class with `async toEnvironmentCredentialSource()`.
  - `FakeManagedSecretStoreClient` — deterministic, scenario-driven; default `"available"`; sentinel
    value `"opaque:test-managed-secret"`; no real secret; no SDK; constructed explicitly.
  - `ManagedSecretClientScenario` — `"available" | "missing" | "invalid" | "unavailable"`.
- Tests: `managed-secret-credential-source.test.ts`, `managed-secret-negative-capability.test.ts`.
- `EnvironmentProviderCredentialResolver` (Impl 022) is **synchronous** and unchanged; the managed-secret
  source feeds it via the **pre-fetch pattern**.
- `ProcessEnvironmentCredentialSourceAdapter` (Impl 023) remains the **one** approved `process.env` read
  site. The repo-wide one-file seal is enforced by a negative-capability test.
- `scripts/operator-live-smoke.mjs` (Impl 027) is unchanged and does **not** reference
  `ManagedSecretCredentialSource` (asserted by the Impl 028 guard).

What does **not** exist (confirmed): cloud SDK; cloud-specific adapter; real secret access; network secret
retrieval; dependency/package change; CI live lane; default live call; runtime source precedence; provider
selection.

Spec 029 (`f0ff8c1`) is **behavioral-only**: it defined the cloud-adapter contract, the fail-closed
invariant, the Cloud Redaction Policy, 15 use cases, 10 failure semantics, and 18 open questions for this
tech spec — but selected **no** provider and **no** SDK.

**Core principle (carried verbatim from Spec 029):**

```text
cloud adapter = implementation of ManagedSecretStoreClient
cloud adapter ≠ provider-neutral seam
cloud adapter ≠ production wiring
cloud adapter ≠ live-call enablement
cloud adapter ≠ operator opt-in
cloud adapter ≠ CI credential lane
cloud adapter ≠ provider trust
cloud adapter ≠ smoke success
cloud adapter ≠ validation pass
cloud adapter ≠ evidence ≠ athlete decision ≠ delivery trigger
secret ref ≠ secret value
cloud error body ≠ safe failure code
credential available ≠ LiveCallPolicy approval
Smoke proves wiring, not wisdom.
```

---

## 2. Surface Gap Analysis (grounded in real code)

Exact answers to the 24 required gap-analysis questions. No invented names; no assumed signatures.

### 2.1 Exact `ManagedSecretResolution` (Q5)

```ts
export type ManagedSecretResolution =
  | { readonly status: "available"; readonly value: string }
  | { readonly status: "missing" }
  | { readonly status: "invalid" }
  | { readonly status: "unavailable" };
```

Four states. The raw value appears **only** on `available`; non-`available` carries no payload.

### 2.2 Exact `ManagedSecretStoreClient` interface (Q1)

```ts
export interface ManagedSecretStoreClient {
  /** Always resolves — never rejects. Implementations must catch all exceptions internally. */
  retrieve(secretName: string): Promise<ManagedSecretResolution>;
}
```

A real cloud adapter is an **implementation of this interface** (Spec 029 core principle). The interface is
already provider-neutral and async — a cloud adapter does not need a new outward shape.

### 2.3 Exact `ManagedSecretCredentialSource` constructor/signature & return shape (Q2, Q3)

```ts
constructor(config: ManagedSecretSourceConfig)   // { secretName: string; storeClient: ManagedSecretStoreClient }

async toEnvironmentCredentialSource(): Promise<EnvironmentCredentialSource>
// available  → Object.freeze({ [secretName]: value })
// otherwise  → Object.freeze({})   → resolver classifies "missing" → no provider call
```

`EnvironmentCredentialSource = Readonly<Record<string, string | undefined>>`.

### 2.4 Exact `FakeManagedSecretStoreClient` API (Q4)

```ts
new FakeManagedSecretStoreClient(opts?: { scenario?: "available" | "missing" | "invalid" | "unavailable" })
// default scenario "available" → { status: "available", value: "opaque:test-managed-secret" }
// otherwise → { status: scenario }
```

`retrieve()` ignores its `secretName` argument (`_secretName`); it is a pure scenario emitter.

### 2.5 Exact managed-secret statuses / failure codes currently implemented (Q5)

Exactly four: `available`, `missing`, `invalid`, `unavailable`. There is **no** distinct
`permission-denied`, `timeout`, `throttled`, `unauthenticated`, or `malformed` state. All non-available
cloud outcomes today collapse to one of `missing` / `invalid` / `unavailable`.

### 2.6 Exact redaction behavior currently implemented (Q6)

The managed-secret source carries **no metadata bag and no error object**. Redaction is *structural*: the
raw value is only ever placed inside the frozen `EnvironmentCredentialSource` map on `available`, then
immediately wrapped by `EnvironmentProviderCredentialResolver` into the opaque, transient
`ProviderCredentialToken`. Non-available paths return an empty frozen object — there is no failure message,
no stack, no response body, nothing to leak. There is **no** dedicated `SecretRedactionPolicy` *class* in
code today; the Spec 028 / Spec 029 redaction policy is an enforced **discipline**, asserted by
negative-capability tests, not a runtime object.

### 2.7 Exact exports from `application/index.ts` and `rendering/index.ts` (Q7, Q8)

`application/index.ts` re-exports the full Impl 017→028 surface, ending with the Impl 028 block:

```ts
export { ManagedSecretCredentialSource, FakeManagedSecretStoreClient } from "./managed-secret-credential-source.ts";
export type {
  ManagedSecretResolution, ManagedSecretStoreClient, ManagedSecretSourceConfig, ManagedSecretClientScenario,
} from "./managed-secret-credential-source.ts";
```

`rendering/index.ts` is `export * from "./domain/index.ts"; export * from "./application/index.ts";`. Any
new cloud-adapter symbols would be exported through the same `application/index.ts` block.

### 2.8 Exact `EnvironmentProviderCredentialResolver` integration path (Q9)

Synchronous, injected, single-key, fail-closed. Pre-fetch pattern is mandatory:

```ts
const source = await managedSecretSource.toEnvironmentCredentialSource(); // async pre-fetch
const resolver = new EnvironmentProviderCredentialResolver({ keyName: secretName, source }); // synchronous
```

A cloud adapter changes **nothing** here: it is injected *into* `ManagedSecretCredentialSource` as the
`storeClient`, upstream of this synchronous chain.

### 2.9 Exact process-env guard constraints (Q10)

Repo-wide seal (asserted in `managed-secret-negative-capability.test.ts` and
`process-environment-negative-capability.test.ts`): **exactly one** production file may contain the
`process.env` token — `process-environment-credential-source-adapter.ts`. The cloud adapter must read **no**
process environment.

### 2.10 Exact operator script constraints (Q11)

`scripts/operator-live-smoke.mjs` must still exist, must still reference
`processEnvironmentCredentialSourceAdapter` + `EnvironmentProviderCredentialResolver`, must **not** reference
`ManagedSecretCredentialSource`, and `scripts/` may contain **only** that one file (asserted). The cloud
adapter must not be wired into the operator script in Impl 029.

### 2.11 Exact managed-secret negative-capability guard pattern (Q12)

The guard asserts, against the production file and the tree: file exists at the right path; no `process.env`
token; one-file seal intact; no vendor/SDK/network/retry/scheduler token
(`openai|anthropic|axios|node:https|node:http|fetch(|https?://`, `setTimeout|setInterval|queueMicrotask|EventEmitter|scheduler|retry`);
no forbidden module import; no module outside `rendering` references the symbols; no forbidden directory
created (`modules/{secrets,secret-manager,infrastructure,aws,gcp,azure,workflow,orchestrator,event-bus,
events-bus,queue,scheduler,retry,telemetry,evaluation,provider,llm,openai,anthropic}`, `api`,
`infrastructure`, `db`, `database`, `migrations`, `ui`, `providers`, `prompts`); devDependencies remain
exactly `["@types/node","typescript"]`; no cloud token
(`amazonaws.com|googleapis.com|azure.com|hashicorp|vault|@aws-sdk|@google-cloud|@azure/`); no
event/delivery/persistence/domain reference; operator script unchanged. **This is the exact template the
Impl 029 negative-capability guard must extend.**

### 2.12 Exact package / dependency state (Q13, Q14, Q22)

`package.json`: `"type": "module"`; scripts `typecheck` / `test` / `check`; **no** `dependencies` key;
`devDependencies` = `{ "@types/node": "^22.20.0", "typescript": "^5.9.3" }`. **No** cloud provider package
exists. Package/lockfile **can and must remain unchanged**.

### 2.13 Whether repo deployment docs identify AWS / GCP / Azure (Q15)

**No.** No spec, tech spec, `CORE_COMPLETION_REVIEW.md`, `SYSTEM_MAP.md`, `TECHNICAL_BOUNDARY_MAP.md`, or
`PERSISTENCE_AND_EVENT_SURFACE.md` names a concrete cloud provider, deployment platform, region, or runtime
identity model. The repo has no IaC, no Dockerfile cloud target, no CI deploy lane. There is **no factual
basis** to select a provider now. This is the same finding that justified Spec 029 §6 Option A.

### 2.14 Whether a cloud-specific adapter can be meaningfully planned without provider selection (Q16)

**Yes — but only as a failure-mapping + redaction boundary, not as a vendor adapter.** A provider-neutral
slice can introduce (a) a *transport-level* cloud-client boundary distinct from the Aurora seam, and (b) a
deterministic mapping from a **richer set of generic cloud outcomes** into the existing 4-state
`ManagedSecretResolution`, with cloud redaction and a fail-closed catch-all. That logic is provider-neutral
and testable with a fake. A *vendor* adapter (real SDK, endpoints, IAM) cannot be planned without provider
selection and is therefore deferred.

### 2.15 Whether an injected minimal cloud client would duplicate `ManagedSecretStoreClient` (Q17)

**No — if and only if it is a genuinely different boundary.** Spec 029 §9 draws the distinction:

```text
ManagedSecretStoreClient = Aurora provider-neutral seam (returns the 4-state ManagedSecretResolution)
CloudSecretValueClient   = cloud SDK / transport boundary hidden BEHIND the adapter (returns a richer,
                           lower-level outcome the adapter must map + redact)
```

If the new client merely returned `ManagedSecretResolution`, it would duplicate the seam → then **Option C**
is correct. The plan below gives `CloudSecretValueClient` a distinct, richer outcome type
(`CloudSecretLookupResult` with `CloudSecretAdapterFailureCode`) so the adapter's *mapping* is the new
behavior, not a rename.

### 2.16 Whether cloud failure mapping fits existing statuses (Q18)

**Yes — by design, and that is the point of the slice.** Spec 029 §11's 10 failure modes all map onto the
existing 4 states (no new state is added to `ManagedSecretResolution`):

| Generic cloud failure | maps to `ManagedSecretResolution` |
| --- | --- |
| not configured / no secret ref | `missing` |
| secret missing in store | `missing` |
| malformed / empty payload | `invalid` |
| invalid returned credential | `invalid` |
| permission denied | `unavailable` |
| unauthenticated runtime identity | `unavailable` |
| SDK unavailable / misconfigured | `unavailable` |
| cloud service unavailable | `unavailable` |
| timeout | `unavailable` |
| throttling / rate limiting | `unavailable` |
| unexpected exception (thrown) | `unavailable` (caught internally) |
| provider later rejects credential | out of scope here — handled downstream by `LiveCallPolicy` / live client, unchanged |

The richer *cause* is captured by a private `CloudSecretAdapterFailureCode` for the adapter's own (redacted)
reasoning/tests; the *outward* contract stays the 4-state union.

### 2.17 Whether a new adapter class adds value beyond the current fake (Q19)

**Yes.** `FakeManagedSecretStoreClient` returns a resolution **directly** — it has no transport boundary, no
mapping, no redaction-on-failure, no catch-all. The proposed cloud adapter adds four things that do not
exist: (1) a distinct transport boundary type; (2) failure-code → 4-state mapping; (3) cloud redaction
(never retain the raw cloud response body); (4) a catch-all that converts any thrown transport exception
into `unavailable` with `rawRetained: false`. This is the contract every future real vendor adapter reuses.

### 2.18 Whether source precedence is needed before cloud adapter wiring (Q20)

**No.** A single cloud adapter implementing `ManagedSecretStoreClient` needs no precedence — it resolves one
configured secret. Precedence (process-env vs managed vs cloud, ordering, override) is a separate concern.
It must **not** be smuggled into Impl 029 → recommend a future **Spec 030 — Secret Source Precedence
Boundary** (Decision 9).

### 2.19 Whether operator smoke should remain unchanged (Q21)

**Yes — unchanged.** No cloud adapter is wired into `scripts/operator-live-smoke.mjs` in Impl 029. The
existing guard already asserts the script does not reference `ManagedSecretCredentialSource`; the Impl 029
guard extends that to the new cloud-adapter symbols.

### 2.20 Whether implementation can be tested entirely with fakes (Q23)

**Yes.** A `FakeCloudSecretValueClient` (scenario-driven, returning the richer `CloudSecretLookupResult`,
including a thrown-exception scenario) exercises every mapping path deterministically. No network, no real
cloud, no real secret, no SDK, no CI credential.

### 2.21 Whether package / lockfile can remain unchanged (Q22)

**Yes — and must.** The slice is pure TypeScript: an interface, a small mapping class, and a fake. No
runtime dependency; devDependencies stay `["@types/node","typescript"]`.

### 2.22 Whether the right next mission is Implementation 029 or a provider-selection spec (Q24)

**Implementation 029 (Option A)** — the provider-neutral cloud-adapter *contract + failure-mapping +
redaction* slice — because it adds distinct, defining behavior (§2.17) without inventing provider policy.
Provider selection itself is deferred to a later **Spec 029B / 030 — Secret Provider Selection Boundary**,
to be written only when a real deployment target exists.

---

## 3. Central Question

> What is the smallest safe technical slice after Spec 029 that advances toward a cloud-specific secret
> adapter while preserving: no raw secret leakage; no raw cloud response leakage; no domain coupling to
> cloud infrastructure; no automatic live calls; no default CI live lane; no process-env seal weakening; no
> operator smoke semantic change; no delivery / event / orchestration / domain mutation; and no production
> rollout claim?

**Answer:** A provider-neutral **cloud-secret-store adapter** that implements the existing
`ManagedSecretStoreClient` by calling an **injected, minimal, transport-level cloud client**
(`CloudSecretValueClient`, fed by a `FakeCloudSecretValueClient` in tests) and **mapping** its richer
generic outcomes — including any thrown exception — into the existing 4-state `ManagedSecretResolution`,
with cloud redaction (`rawRetained: false`) and a fail-closed catch-all. No provider, no SDK, no dependency,
no network, no real secret, no operator-smoke change, no source-precedence implementation.

---

## 4. Required Technical Decisions

Engineering Playbook decision format.

### `[DECISION]` Decision 1 — Implementation 029 scope → **Option A (adapter-contract + failure-mapping slice with injected fake cloud client)**

```text
Option A — Add adapter-contract-only cloud secret source using injected client/fake, no SDK.   ← CHOSEN
Option B — Add first concrete provider adapter.                                                  rejected
Option C — No implementation yet; first write provider-selection spec.                           rejected (conditionally)
```

**Why A.** It adds distinct behavior beyond Impl 028 (§2.17): a transport-level boundary, failure mapping,
cloud redaction, and a catch-all — none of which exist. It is provider-neutral and fully testable with
fakes. **Guardrail:** if, during implementation, the adapter collapses to merely re-emitting
`ManagedSecretResolution` with no mapping/redaction value (i.e. it would only rename
`FakeManagedSecretStoreClient`), the team must stop and switch to **Option C**. The plan in §5–§7 is
specifically shaped so that the adapter's *mapping + redaction* is the deliverable, which keeps it distinct.

**Why not B.** No repo/deployment fact names a provider (§2.13). Choosing one now would invent policy,
require an SDK, and risk a package/lockfile change.

**Why not C (outright).** A meaningful, defining, provider-neutral slice *does* exist (§2.14, §2.16). C is
held only as the guardrail fallback above.

### `[DECISION]` Decision 2 — Provider selection → **do NOT select a provider in 029A**

No AWS / GCP / Azure / Vault is selected. Implementation 029 **must not** introduce provider-specific names,
SDK imports, endpoints, region strings, IAM concepts, or package changes. The cloud client boundary is
abstract (`CloudSecretValueClient`) and is exercised only by a deterministic fake. Provider selection is
deferred to a future **Spec 029B / Spec 030 — Secret Provider Selection Boundary**, written when a real
deployment target exists.

### `[DECISION]` Decision 3 — Adapter placement → **`rendering/application`, single new file; no new module directory**

```text
src/modules/rendering/application/cloud-secret-store-adapter.ts        ← CHOSEN
```

Rejected name candidates (functionally fine, but the chosen name reads clearest against the seam):
`cloud-managed-secret-store-client.ts`, `cloud-secret-adapter.ts`, `managed-secret-cloud-adapter.ts`.

**Forbidden** (asserted by the negative-capability guard; would only be allowed with explicit, justified
approval that does not exist today): `src/modules/aws/`, `src/modules/gcp/`, `src/modules/azure/`,
`src/modules/infrastructure/`, `src/modules/secrets/`, `src/modules/secret-manager/`.

### `[DECISION]` Decision 4 — SDK / dependency policy → **none**

```text
No SDK. No dependency. No package.json change. No package-lock.json change.
```

devDependencies stay exactly `["@types/node","typescript"]` (asserted). No dependency is proposed; none can
be justified at this provider-neutral stage.

### `[DECISION]` Decision 5 — Cloud client abstraction → **introduce a distinct transport boundary, NOT a duplicate seam**

```text
ManagedSecretStoreClient  = Aurora provider-neutral seam (Impl 028; returns ManagedSecretResolution)
CloudSecretValueClient    = NEW: cloud SDK/transport boundary hidden behind the adapter (returns the
                            richer CloudSecretLookupResult; injected; no SDK; fake in tests)
```

Proposed new names (provider-neutral; no vendor terms):

- `CloudSecretValueClient` — `interface { lookup(ref: CloudSecretRef): Promise<CloudSecretLookupResult> }`.
- `CloudSecretRef` — opaque, non-sensitive reference (`{ readonly name: string }`; ARN/path/version
  representation is deferred — see open questions). It is a **secret ref, not a secret value**.
- `CloudSecretLookupResult` — richer outcome union:
  `{ status: "found"; value: string } | { status: "not_found" } | { status: "denied" } |
  { status: "unauthenticated" } | { status: "unavailable" } | { status: "timeout" } |
  { status: "throttled" } | { status: "malformed" }`.
- `CloudSecretAdapterFailureCode` — the private mapping key the adapter uses internally (and exposes only as
  a redacted, non-sensitive classification, never a raw cause).
- `FakeCloudSecretValueClient` — deterministic scenario emitter, including a `"throws"` scenario that
  *rejects/throws* so the adapter's catch-all is provably exercised. Sentinel found-value reuses the
  established opaque pattern (e.g. `"opaque:test-cloud-secret"`); no real secret.

The adapter `CloudSecretStoreAdapter implements ManagedSecretStoreClient` wraps an injected
`CloudSecretValueClient`, calls `lookup`, **maps** the rich result → `ManagedSecretResolution`, **catches**
any thrown error → `unavailable`, and **retains no raw cloud response** (`rawRetained: false`). `retrieve`
never rejects.

### `[DECISION]` Decision 6 — Failure mapping → **rich cloud outcomes → 4-state, fail-closed**

Exact planned mapping (matches §2.16). Every non-`found` outcome carries `rawRetained: false`, **no**
live-call enablement, **no** retry, **no** event recording, **no** domain mutation:

| Cloud-like cause (`CloudSecretLookupResult` / thrown) | → `ManagedSecretResolution` |
| --- | --- |
| `found` + valid value | `available` (value flows into the existing source map only) |
| not configured / `not_found` | `missing` |
| `malformed` / empty / invalid returned credential | `invalid` |
| `denied` (permission denied) | `unavailable` |
| `unauthenticated` (runtime identity) | `unavailable` |
| SDK unavailable / misconfigured | `unavailable` |
| `unavailable` (cloud service) | `unavailable` |
| `timeout` | `unavailable` |
| `throttled` / rate limiting | `unavailable` |
| any thrown exception | `unavailable` (caught internally; never rejects) |
| provider later rejects credential | **out of scope** — unchanged downstream `LiveCallPolicy`/live client |

No new `ManagedSecretResolution` state is added. The distinct causes survive only as a private, redacted
`CloudSecretAdapterFailureCode` for the adapter's tests — never as raw cloud detail.

### `[DECISION]` Decision 7 — Redaction and serialization → **structural, asserted by tests**

Implementation 029 tests must prove: no raw secret in result; no raw secret in any error/message; no raw
cloud response body in result; no raw cloud response body in any error/message; no raw token in JSON
serialization (`JSON.stringify(resolution)` on non-available carries no value/body); no arbitrary metadata
bag (the adapter exposes only the 4-state union outward; any internal failure code is a closed enum, not a
free-form object). Mirrors the Spec 029 Cloud Redaction Policy and the existing structural-redaction
discipline (§2.6).

### `[DECISION]` Decision 8 — Operator smoke impact → **no change**

```text
No change to scripts/operator-live-smoke.mjs.   No change to operator smoke semantics.
No cloud adapter wired into operator smoke by default.
```

The existing guard (operator script references the approved chain, not `ManagedSecretCredentialSource`) is
extended to also forbid the new cloud-adapter symbols in the script.

### `[DECISION]` Decision 9 — Source precedence → **deferred to a separate spec**

```text
No source-precedence implementation in Impl 029.
```

If/when precedence between process-env, managed, and cloud sources is needed, it gets its own
**Spec 030 — Secret Source Precedence Boundary**, not a smuggled change in Impl 029 (§2.18).

### `[DECISION]` Decision 10 — Tests and guards → **deterministic, fakes only; defining negative guards**

No network, no real cloud, no real secret, no CI credential, no SDK, no live provider call. Two test files
(functional + negative-capability), modeled exactly on the Impl 028 pair. Negative tests are defining
tests.

---

## 5. Integration Flow (pre-fetch pattern, unchanged downstream)

```text
caller (future operator/wiring, NOT this slice)
  └─ new CloudSecretStoreAdapter({ cloudClient: <injected CloudSecretValueClient>, ref })   // implements ManagedSecretStoreClient
       └─ used as storeClient:
          new ManagedSecretCredentialSource({ secretName, storeClient: cloudAdapter })
            └─ await source.toEnvironmentCredentialSource()        // async pre-fetch (UNCHANGED Impl 028)
                 └─ new EnvironmentProviderCredentialResolver({ keyName, source })   // synchronous (UNCHANGED Impl 022)
                      └─ resolver.resolve() → available | missing | invalid          // UNCHANGED
                           └─ LiveCallPolicy (separate, disabled-by-default gate)     // UNCHANGED — credential ≠ enablement
```

The cloud adapter sits **upstream** of the existing seam as a `ManagedSecretStoreClient` implementation.
Everything from `ManagedSecretCredentialSource` downward is untouched. `available` does **not** enable a
live call, does **not** bypass `LiveCallPolicy`, operator opt-in, or the CI guard.

---

## 6. Proposed File Layout (Option A — confirmed)

```text
src/modules/rendering/application/cloud-secret-store-adapter.ts                    (new — production)
src/modules/rendering/tests/cloud-secret-store-adapter.test.ts                     (new — functional)
src/modules/rendering/tests/cloud-secret-store-adapter-negative-capability.test.ts (new — guard)
```

Export the new symbols through the existing `application/index.ts` Impl 028 region (add an Impl 029 block):
`CloudSecretStoreAdapter`, `FakeCloudSecretValueClient`, and the types `CloudSecretValueClient`,
`CloudSecretRef`, `CloudSecretLookupResult`, `CloudSecretAdapterFailureCode`. No new module directory. No
change to `rendering/index.ts` (it already `export *`s).

**Must NOT create** (asserted by guards): `src/modules/{aws,gcp,azure,infrastructure,secrets,secret-manager,
workflow,orchestrator,event-bus,events-bus,queue,scheduler,retry,telemetry,evaluation}/`, `src/api/`,
`src/db/`, `src/database/`, `src/migrations/`.

---

## 7. Type Shapes (TS-strict; explicit field declarations; no constructor parameter properties)

Planned shapes for `cloud-secret-store-adapter.ts` (names provider-neutral; **plan only, not code**):

```ts
export interface CloudSecretRef { readonly name: string; }   // ref ≠ value; ARN/path/version deferred

export type CloudSecretLookupResult =
  | { readonly status: "found"; readonly value: string }
  | { readonly status: "not_found" }
  | { readonly status: "denied" }
  | { readonly status: "unauthenticated" }
  | { readonly status: "unavailable" }
  | { readonly status: "timeout" }
  | { readonly status: "throttled" }
  | { readonly status: "malformed" };

export interface CloudSecretValueClient {           // transport boundary hidden behind the adapter
  lookup(ref: CloudSecretRef): Promise<CloudSecretLookupResult>;  // MAY reject; the adapter catches.
}

export type CloudSecretAdapterFailureCode =         // private redacted classification; never a raw cause
  | "not-configured" | "missing" | "malformed" | "denied" | "unauthenticated"
  | "service-unavailable" | "timeout" | "throttled" | "transport-error";

export class CloudSecretStoreAdapter implements ManagedSecretStoreClient {
  // explicit private fields; injected CloudSecretValueClient + CloudSecretRef
  // async retrieve(secretName): Promise<ManagedSecretResolution>
  //   try { const r = await cloudClient.lookup(ref); return map(r); }
  //   catch { return { status: "unavailable" }; }   // catch-all; never rejects; rawRetained:false
}

export class FakeCloudSecretValueClient implements CloudSecretValueClient {
  // scenario: "found" | each failure status | "throws"; default "found" → "opaque:test-cloud-secret"
}
```

The adapter imports **only** `ManagedSecretResolution` / `ManagedSecretStoreClient` types from
`./managed-secret-credential-source.ts`. No other rendering import; no cloud SDK; no `process.env`; no
network token; no retry/scheduler primitive.

---

## 8. Required Test Contract — `cloud-secret-store-adapter.test.ts` (functional)

All with `FakeCloudSecretValueClient`; no network, no SDK, no CI credential, no real secret:

1. `found` → `retrieve` resolves `{ status: "available", value }`.
2. `not_found` → `missing`.
3. `denied` (permission denied) → `unavailable`.
4. `unauthenticated` (runtime identity) → `unavailable`.
5. `unavailable` (service) → `unavailable`.
6. `timeout` → `unavailable`.
7. `throttled` (rate limiting) → `unavailable`.
8. `malformed` → `invalid`.
9. `"throws"` (client rejects/throws) → `retrieve` still **resolves** `unavailable` (never rejects).
10. End-to-end pre-fetch: adapter → `ManagedSecretCredentialSource.toEnvironmentCredentialSource()` →
    `EnvironmentProviderCredentialResolver.resolve()` returns `available` only on `found`, else `missing`.
11. `available` does **not** construct/enable a live client, does not flip `LiveCallPolicy`, does not call a
    transport.
12. Result/serialization inspection: `JSON.stringify` of every non-available resolution contains **no**
    value and **no** cloud body; the available value appears only inside the frozen source map.

## 9. Required Test Contract — `cloud-secret-store-adapter-negative-capability.test.ts` (defining guards)

Extend the Impl 028 template (§2.11) to the new file(s):

- New file exists at `rendering/application/cloud-secret-store-adapter.ts`.
- No `process.env` token in the new file; **one-file seal still exactly**
  `["process-environment-credential-source-adapter.ts"]`.
- No vendor/SDK/network/retry/scheduler token; **no** cloud token
  (`amazonaws.com|googleapis.com|azure.com|hashicorp|vault|@aws-sdk|@google-cloud|@azure/`) — proves
  provider-neutrality.
- No forbidden import (delivery / event-recording / application-orchestration / observation / reasoning /
  understanding / athlete / decision; not `live-provider-http-transport`, `process-environment-…`,
  `concrete-provider`, `live-provider-client`).
- No module outside `rendering` references the new symbols.
- No forbidden directory created.
- devDependencies remain exactly `["@types/node","typescript"]`; no `dependencies` key.
- Operator script unchanged **and** does not reference the new cloud-adapter symbols; `scripts/` still
  contains only `operator-live-smoke.mjs`.
- No event/delivery/persistence/domain-mutation reference in the new file.

## 10. Failure Semantics — Implementation Plan

Per §4 Decision 6: every non-`found` cloud outcome and every thrown exception resolves to a safe
`ManagedSecretResolution` status (`missing` / `invalid` / `unavailable`) with `rawRetained: false`, **no**
retry, **no** scheduler, **no** event recording, **no** live-call enablement, **no** domain mutation. The
adapter `retrieve` honors the Impl 028 contract: **always resolves, never rejects.** "Provider later rejects
the credential" is explicitly **downstream** (the unchanged `LiveCallPolicy` / live client) and out of this
adapter's scope.

## 11. Guard Strategy

- **All existing guards remain green** — process-env seal, managed-secret negative capability, operator
  smoke, no-default-live-call, no-CI-live-lane, no-raw-secret-leakage, Impl 001–028 suites.
- **New guard** mirrors `managed-secret-negative-capability.test.ts` exactly, adding the cloud-neutrality
  assertion (no AWS/GCP/Azure/Vault token) and the new-symbol containment/operator-script assertions.

## 12. Boundary / Import Rules for Implementation 029

**Allowed:** rendering application surfaces; the existing managed-secret types
(`ManagedSecretResolution`, `ManagedSecretStoreClient`); deterministic fakes in tests; shared-kernel if
already allowed. **Forbidden:** domain modules importing the cloud adapter; observation / reasoning /
understanding / decision-support / athlete / delivery / event-recording / application-orchestration imports;
operator script changes; process-env guard weakening; any new production `process.env` read; AWS/GCP/Azure
SDK imports; real cloud endpoints; network transport; retry / scheduler / event bus; telemetry /
model-evaluation; DB / schema / infrastructure modules; raw secret logging / printing / persistence.

## 13. Required Output / Trace Rules

**Allowed:** safe source kind; safe (non-sensitive) secret reference name; safe failure code (the closed
`CloudSecretAdapterFailureCode`); safe availability classification (the 4-state union); `rawRetained: false`;
provider-neutral cloud-target kind only if non-sensitive (none is selected in this slice).
**Forbidden:** raw secret value; bearer token; API key; credential token; cloud access token; raw cloud
response body; SDK request/response payload; full env dump; full cloud metadata payload; rendered provider
response; arbitrary metadata bag; stack trace containing secret material; hidden reasoning.

---

## 14. Relationship To Existing Architecture

- **Impl 028** — the cloud adapter *implements* its `ManagedSecretStoreClient`; the seam is unchanged.
- **Impl 022 / 023** — `EnvironmentProviderCredentialResolver` and the one-file `process.env` seal are
  untouched.
- **Impl 026 / 027** — `liveProviderSmoke` and the operator script are untouched; `available` ≠ smoke
  success ≠ product ready.
- **Impl 021** — `LiveCallPolicy` stays the separate, disabled-by-default gate; credential available ≠
  enablement.
- **Impl 019 / 020** — provider client boundary and concrete-provider shell unchanged; a cloud *secret*
  adapter is not a cloud *provider* adapter.

---

## 15. Open Design Questions (deferred to Implementation 029 / a later spec)

1. Concrete provider selection (AWS Secrets Manager / GCP Secret Manager / Azure Key Vault / Vault) —
   deferred to **Spec 029B / 030**; requires a real deployment target.
2. Whether `CloudSecretRef` needs ARN / path / version / stage fields, or stays `{ name }`.
3. Runtime identity / authentication model (IAM role, workload identity) — out of scope until a provider
   exists.
4. Source precedence between process-env, managed, and cloud sources — **Spec 030**.
5. Operator-script wiring of a cloud adapter — a later, explicitly-approved slice; not Impl 029.
6. Cloud-secret smoke / live retrieval — far-future; requires provider + credentials + a guarded lane.
7. Whether `permission denied` and `service unavailable` should ever become distinct
   `ManagedSecretResolution` states (today both → `unavailable`) — revisit only if a consumer needs the
   distinction.
8. Cache / TTL / rotation handling — out of scope; no scheduler/retry in this architecture yet.
9. Local emulator for tests — unnecessary while everything is fake-driven.

---

## 16. Implementation Task Preview

**Next mission (recommended): Implementation 029 — Cloud-secret adapter contract with injected fake cloud client.**

Add `CloudSecretStoreAdapter` (implements the existing `ManagedSecretStoreClient`) wrapping an injected
`CloudSecretValueClient`, mapping a richer set of generic cloud outcomes — and any thrown exception — into
the existing 4-state `ManagedSecretResolution`, with cloud redaction and a fail-closed catch-all; plus a
deterministic `FakeCloudSecretValueClient` (including a throwing scenario) and the two test files.

Explicitly:

```text
no SDK · no dependency/package/lockfile change · no AWS/GCP/Azure · no real cloud · no real secret ·
no network · no operator-smoke change · no source-precedence implementation · no live-call enablement ·
no CI live lane · no process-env seal weakening · no delivery/event/orchestration/domain mutation
```

**Guardrail:** if implementation reveals the adapter would only re-emit `ManagedSecretResolution` with no
mapping/redaction value (a rename of `FakeManagedSecretStoreClient`), stop and instead write
**Spec 029B / 030 — Secret Provider Selection Boundary** before any cloud-specific code.

---

## 17. Success Criteria

Can Aurora plan the smallest safe slice after Spec 029 — a provider-neutral cloud-secret adapter that maps
rich cloud failures into the existing 4-state resolution, fail-closed and fully redacted — **without**
selecting a provider, adding an SDK, adding a dependency, reading the process environment, weakening the
one-file seal, changing the operator smoke entrypoint, implementing source precedence, enabling live calls,
or claiming production rollout? **Yes — via Option A, as planned above.** Validation at authorship:
`tsc --noEmit` clean; `node --test` 672/672; no code, test, package, SDK, provider, or dependency change
introduced by this document.
