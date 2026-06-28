# Tech Spec 019A — Real Provider Integration Boundary — Implementation Plan

> The TS-strict plan for Spec 019: a **real-provider-*ready*** boundary **inside `rendering`** that changes only the **draft source** — an **async-capable `ProviderClientBoundary`** (proven with a deterministic **fake/in-process client**, no real SDK/network/secrets), a `RealProviderAdapter`, and an async `requestRealProviderRendering` service that **reuses the unchanged `providerRenderingRequestFrom` guard and the mandatory `validateDraft`** and returns the **existing `ProviderRenderOutcome`** (so the Impl 018 raw-free audit observes it unchanged). Secrets are **operational references only**; operational failures **map down** to the existing closed `ProviderFailure`. The real provider stays **pluggable but untouched**.
>
> Technical Specification. **No code in this slice.** Implementation begins only from the approved plan as Implementation 019.

| Field | Value |
|---|---|
| **Status** | Technical Spec · *Accepted pending review* |
| **Phase** | Technical Specification (no code; no real SDK/network/API keys; no prompts-as-code; no provider chosen; no event-catalog change) |
| **Implements** | [Spec 019](./019-real-provider-integration-boundary.md) |
| **Builds on** | Spec/Impl 017 (provider seam: `ProviderAdapter`/`ProviderRenderingRequest`/`ProviderRenderOutcome`/`ProviderFailure`/`providerRenderingRequestFrom`) · 018 (raw-free provider-attempt audit) · 014 (rendering + `validateDraft`) · 015 (record/review) · 016 (delivery) · 011 (events — deferred) · 013 (manual input) |
| **Produces (plan for)** | `rendering/domain/` provider-client-config·client-response·operational-failure·instruction·secret-ref + `rendering/application/` provider-client-boundary·fake-provider-client·real-provider-adapter·real-provider-rendering-service + tests; additive index updates |
| **Explicitly excludes** | a concrete provider, an SDK, API keys/secrets, real network/HTTP clients, `process.env` reads, prompt-template files, prompt optimization, streaming, a real retry scheduler, queues/jobs, provider telemetry/eval, billing enforcement, UI/API, delivery changes, an event-catalog change/event bus, a production DB/schema |

[ASSUMPTION] This is **Technical Specification phase**, not Implementation. It fixes the TS-strict shapes, the boundary location (inside `rendering`), the **sync-vs-async** decision, the fake-client contract, the secret-reference rules, the instruction-material rules, the operational-failure→`ProviderFailure` mapping, the validator/audit relationships, and the test contract so Implementation 019 contains **no open design or domain decisions** — only typing and wiring.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture/implementation. |
| **[DECISION]** | A technical commitment for this slice. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open; does not block. |

Principal **[DECISION]**s use **Decision · Why · Consequence · Risk · Reversal Point**.

---

## 1. Central Question

[FACT] *How can Aurora implement a real-provider-ready boundary — with async client shape, secret/config references, instruction construction, provider response mapping, and operational failures — without adding a real SDK/network call and without letting provider behavior bypass validation, persist unsafe drafts, or affect domain/review/display/delivery/event state?*

[FACT] The answer in code: a **new async-capable `ProviderClientBoundary`** (the only place network/SDK/secret concerns would ever live) + a deterministic **`FakeProviderClient`** + a **`RealProviderAdapter`** (request→client→`ProviderDraftOutcome`) + an async **`requestRealProviderRendering`** service that **reuses** the Impl 017 `providerRenderingRequestFrom` guard and the **unchanged** `validateDraft`, returning the **existing `ProviderRenderOutcome`**. The existing **synchronous** `ProviderAdapter`/`FakeProviderAdapter`/`requestProviderRendering` (Impl 017) stay **untouched**; the slice is **purely additive**.

---

## 2. Surface Gap Analysis (read from current code)

[FACT] Verified against the repository so the plan reuses real shapes and invents nothing.

| # | Surface | Found in code | How 019 uses it |
|---|---|---|---|
| 1 | **ProviderAdapter** | `rendering/application/provider-adapter.ts`: `interface ProviderAdapter { readonly kind: string; draft(request: ProviderRenderingRequest): ProviderDraftOutcome }` — **synchronous** | **Left untouched.** The real path adds a *separate async* adapter/service (Decision 2 / §6); it does **not** change this sync port. |
| 2 | **FakeProviderAdapter** | `fake-provider-adapter.ts`: deterministic sync scenarios | Untouched; the new `FakeProviderClient` is its async analog for the client boundary. |
| 3 | **ProviderRenderingRequest** | `provider-rendering-request.ts`: `{ sourceCaseRef; kind; voice?; contentAtoms; allowedClaims; forbiddenClaims; uncertaintyVisibleRequired; limitations; traceabilitySummary?; traceabilityStatus?; style?; locale?; maxLength? }` + **`providerRenderingRequestFrom(request)`** guard (rejects unsafe style/locale/empty before any call) | The **input** the real path also builds from (via the **same** `providerRenderingRequestFrom`); the source for `ProviderInstruction`/`ProviderClientRequest`. |
| 4 | **ProviderDraftOutcome** | `provider-draft.ts`: `{status:"drafted"; draft: ProviderDraft} \| {status:"failed"; failure: ProviderFailure}`; `ProviderDraft { text; providerKind; warnings }` | The `RealProviderAdapter` returns `Promise<ProviderDraftOutcome>` (same shape, async). |
| 5 | **ProviderFailure** | `provider-failure.ts`: closed **10-value** union + `PROVIDER_FAILURES` + `isProviderFailure` | The **mapping target** for `ProviderOperationalFailure` (§10). **Not expanded** (Decision 6). |
| 6 | **ProviderRenderOutcome** | `provider-rendering-service.ts`: `{status:"rendered"; message; providerKind; providerWarnings} \| {status:"failed"; failure: ProviderFailure; renderingFailures?}` | The **return type** of `requestRealProviderRendering` (`Promise<ProviderRenderOutcome>`), so the **Impl 018 `auditProviderAttempt` observes it unchanged**. |
| 7 | **requestProviderRendering** | `provider-rendering-service.ts`: sync `providerRenderingRequestFrom → provider.draft → validateDraft` | The **template** the async path mirrors exactly (swapping the draft source for the async client). Untouched. |
| 8 | **validateDraft** | `rendering-validator.ts`: `validateDraft({ draft, renderable, request }) → RenderOutcome` — the **mandatory** gate | **Reused unchanged** as the only path from a draft to a `RenderedMessage`. |
| 9 | **Provider-attempt audit** | `provider-attempt-audit-service.ts`: `auditProviderAttempt({ request, outcome, providerAdapterKind, … }) → ProviderAttemptRecord` (observe-only; **raw-free**) | Composed **outside** the real path (by the caller/test) over the returned `ProviderRenderOutcome` — **no automatic persistence** (Decision 7). |
| 10 | **RenderingRequest / RenderableDomainOutput / RenderingFailure** | `rendering-request.ts` (`{renderable; locale?; style?; maxLength?; audience?}`), `renderable-domain-output.ts`, `rendering-failure.ts` (12-value) | Source of refs/constraints; `RenderingFailure[]` surfaced on a validation failure (unchanged). |
| 11 | **rendering exports** | `rendering/index.ts` = `export * from "./domain/index.ts"` + `export * from "./application/index.ts"` | New types/service added **additively** to `domain/index.ts` + `application/index.ts`. |
| 12 | **Structural guards** | `rendering-negative-capability.test.ts`: network regex `/\b(openai\|anthropic\|axios\|node:https\|node:http)\b\|fetch\s*\(\|https?:\/\//i` over rendering production files; type-only `decision-support`; no `src/modules/{llm,openai,provider}` / `src/{api,ui,infrastructure}`. `persistence-boundary.test.ts`: repo-named files import own module + `shared-kernel`; forbidden DB/`event-bus`/`migration` tokens | The new files contain **no** network/SDK token and **no `process.env`**; the names `provider-client-*`/`real-provider-*`/`provider-secret-ref` match **no** existing forbidden token/dir, so **no guard trips** and **no new module** is created. |

[DECISION] **No gap blocks the slice, and no new module is created.** The real path is additive inside `rendering`; the **sync seam is untouched**; reasons map to the **existing** `ProviderFailure` (not expanded); the names trip no structural guard. **No e2e allowlist or guard blocker is expected.** Names above are authoritative; Implementation 019 must not rename them. **Note:** this slice introduces Aurora's **first `Promise`/`async` surface** — isolated to the real-provider-ready path; the Node test runner supports async tests.

---

## 3. Key Architectural Decisions

### Decision 1 — The boundary lives inside `rendering`
[DECISION] Real-provider-ready integration lives in `rendering`: `domain/` (`provider-client-config.ts`, `provider-client-response.ts`, `provider-operational-failure.ts`, `provider-instruction.ts`, `provider-secret-ref.ts`); `application/` (`provider-client-boundary.ts`, `fake-provider-client.ts`, `real-provider-adapter.ts`, `real-provider-rendering-service.ts`).
- **Why:** provider integration is still **draft generation for rendering**; `rendering` already owns the seam, the constrained request, the validation handoff, and the attempt audit. Putting it behind `decision-support` risks domain-authority leakage; in `delivery` risks channel concerns; a new `provider`/`llm`/`infrastructure` module overstates the slice.
- **Consequence:** `rendering` owns the real-provider-ready boundary; **no upstream module imports provider-client code**; **no new top-level module**.
- **Risk:** provider code may *look* like real integration.
- **Mitigation:** **fake/in-process client only**; no SDK, network, `process.env`, API keys, or prompt files; structural guards (§13).
- **Reversal Point:** a future real client implements the same `ProviderClientBoundary` (secrets/network isolated there), only after a separate spec.

### Decision 2 — Async-capable boundary, sync seam untouched (Option B)
[DECISION] **Keep the existing synchronous `ProviderAdapter`/`FakeProviderAdapter`/`requestProviderRendering` (Impl 017) untouched.** Add a **separate async-capable** real-provider-ready path: an async **`ProviderClientBoundary`**, a **`RealProviderAdapter`** (`Promise<ProviderDraftOutcome>`), and an async **`requestRealProviderRendering(...) → Promise<ProviderRenderOutcome>`**, all proven with a **`FakeProviderClient`**.
- **Why:** real provider calls are naturally **async** — pretending the sync `draft(...)` suffices would hide that. Option B is **minimal and additive**: it adds the async shape where it belongs without migrating the proven sync seam (and its 24 Impl 017 tests).
- **Tradeoffs considered:** **Option A** (make `ProviderAdapter` async/maybe-promise) — churns the proven seam + all its tests; rejected. **Option C** (adapter wraps an async client behind a normalized service) — essentially what Option B's `RealProviderAdapter` does; folded in. **Option B chosen.**
- **Consequence:** two coexisting paths — sync `requestProviderRendering` (fake seam) and async `requestRealProviderRendering` (real-ready) — **both** ending at the **same `validateDraft`** and the **same `ProviderRenderOutcome`**.
- **Reversal Point:** if the sync seam is later retired, migrate `requestProviderRendering` onto the async path; until then, both stand.

### Decision 3 — Fake/in-process provider client only
[DECISION] Implementation 019 calls **no real provider**. It ships **only** a deterministic **`FakeProviderClient`** simulating: safe draft · malformed response · empty response · missing credential · invalid credential · timeout · rate limit · provider refusal · provider unavailable.
- **Why:** this slice proves the **boundary + failure mapping**, not provider quality; real choice/SDK/secrets/deployment/cost/retry/network are separate risks; all tests stay **deterministic**.
- **Reversal Point:** a real client implements the same `ProviderClientBoundary` later.

### Decision 4 — Secret references, never secrets
[DECISION] Credentials are represented **only** as a safe operational reference / availability state — a **`ProviderSecretRef`** with a **`ProviderCredentialStatus`** (`present` / `missing` / `invalid`). **No raw secret value** anywhere.
- **Rules:** no API-key string in domain/application records; no secret in the provider-attempt audit; no secret in errors; no secret in test fixtures (a sentinel like `"ref:fake"` only); **no `process.env` read** in Impl 019.
- **Why:** secrets are operational, never domain data; this keeps the leak surface zero before any real secret exists.
- **Consequence:** the fake client decides `missing`/`invalid` from the `ProviderSecretRef.status`, simulating credential failures with no real secret.

### Decision 5 — Instruction material is structured, not arbitrary prompt text
[DECISION] A **`ProviderInstruction`** is **derived** from the constrained `ProviderRenderingRequest` — style, locale, terminal-output kind, selected `VoiceMode`, allowed/forbidden claims, uncertainty/limitation requirements, traceability constraints. It is **structured data**, **not** a prompt-template file.
- **Must not include:** arbitrary caller prompt text; chain-of-thought requests; hidden reasoning; mutable aggregate handles; override-voice / hide-uncertainty / ignore-validation instructions; raw private reasoning; a provider-specific payload bag.
- **Why:** prompts are **for phrasing, not reasoning** (Spec 019 invariant 17); deriving from the already-constrained request means nothing unsafe is representable.
- **Consequence:** **no `src/prompts`**, no production prompt-template files; the instruction is serializable for tests and safe by construction.

### Decision 6 — Operational failures map to the existing `ProviderFailure` (not expanded)
[DECISION] Define a **`ProviderOperationalFailure`** catalog (client-level) and **map it into the existing `ProviderFailure`** used by `ProviderRenderOutcome`. **Do not expand `ProviderFailure`.**
- **Why:** the tension is that `ProviderFailure` has **no** `missing-credential`/`invalid-credential` values; expanding the core catalog would churn Impl 017/018 tests and leak operational detail into the domain-facing failure set. A separate operational catalog + a mapping keeps the domain-facing surface stable and credential detail operational.
- **Consequence:** the mapping (§10) collapses credential/config failures to `provider-unavailable`; the operational reason may be kept **operationally** in the client response for debugging, never surfaced as a domain-facing `ProviderFailure` beyond the mapped value.
- **Reversal Point:** a later spec may add ref-only operational reasons to a dedicated audit field — never to `ProviderFailure`.

### Decision 7 — Validator and raw-free audit unchanged; no automatic persistence
[DECISION] The real path **calls the existing `validateDraft`** (unchanged) and **creates no records itself**. The Impl 018 **`auditProviderAttempt`** stays **raw-free** and is composed **outside** the service (by the caller/test) over the returned `ProviderRenderOutcome`.
- **Why:** audit records *what happened*; the rendering service should not silently persist. Keeping audit a separate composition point preserves observe-only semantics and avoids a hidden side effect.
- **Consequence:** `requestRealProviderRendering` returns a `ProviderRenderOutcome`; persistence (if any) is the caller's explicit choice, using the existing `InMemoryProviderAttemptRecordRepository`.

---

## 4. Proposed Layout

[DECISION]
```text
src/modules/rendering/
  domain/
    provider-secret-ref.ts          # ProviderSecretRef + ProviderCredentialStatus (closed)
    provider-client-config.ts       # ProviderClientConfig (non-secret, provider-agnostic)
    provider-instruction.ts         # ProviderInstruction + providerInstructionFrom(providerRequest)
    provider-client-response.ts     # ProviderClientRequest + ProviderClientResponse (draft|failed)
    provider-operational-failure.ts # ProviderOperationalFailure (closed) + toProviderFailure(...) mapping
    index.ts                        # (additive re-exports)
  application/
    provider-client-boundary.ts     # ProviderClientBoundary async port
    fake-provider-client.ts         # deterministic FakeProviderClient (+ scenario)
    real-provider-adapter.ts        # RealProviderAdapter (request -> client -> Promise<ProviderDraftOutcome>)
    real-provider-rendering-service.ts # requestRealProviderRendering(...) -> Promise<ProviderRenderOutcome>
    index.ts                        # (additive re-exports)
  tests/
    real-provider-boundary.test.ts
    provider-client-failure-mapping.test.ts
    real-provider-negative-capability.test.ts
```
[DECISION] Update `rendering/domain/index.ts` + `rendering/application/index.ts` **additively** (both surfaced via `rendering/index.ts`). **Must not create:** `src/modules/{provider,llm,openai,anthropic,model,telemetry,evaluation}`, `src/{api,ui,infrastructure,providers,prompts}`, any SDK config, network/HTTP client, `process.env` read, or prompt-template file.

[FACT] TS-strict house rules: no constructor parameter properties (the deterministic `FakeProviderClient` is the one test-double constructor, explicit fields); `import type` for `VoiceMode`/rendering types; `.ts` extensions; `Object.freeze`; conditional spreads for `exactOptionalPropertyTypes`; no `Date.now()`; no arbitrary payload bags. **`async`/`Promise` is permitted** on the real-provider-ready path only.

---

## 5. Types (TS-strict shapes)

### 5.1 Secret reference (`domain/provider-secret-ref.ts`)
```ts
export type ProviderCredentialStatus = "present" | "missing" | "invalid";
export const PROVIDER_CREDENTIAL_STATUSES: readonly ProviderCredentialStatus[] = ["present", "missing", "invalid"];

export interface ProviderSecretRef {
  readonly status: ProviderCredentialStatus;
  readonly ref?: string; // an OPAQUE operational handle (e.g. "ref:fake") — NEVER a raw secret value
}
export function isProviderCredentialStatus(value: unknown): value is ProviderCredentialStatus;
```
[FACT] `ProviderSecretRef` carries **no raw secret** — only a status + an opaque ref. There is **no field** that could hold a key, and reconstitution/validation (where used) rejects a `ref` that looks like a secret is out of scope — the type simply offers nowhere to put one.

### 5.2 Client config (`domain/provider-client-config.ts`)
```ts
export interface ProviderClientConfig {
  readonly providerKind: string;      // descriptive label, e.g. "fake" — NOT a chosen real provider
  readonly timeoutMs?: number;        // operational; advisory only this slice
  readonly modelRef?: string;         // opaque deployment/model label if a future tech spec allows; no default
}
```
[FACT] Provider-agnostic and **non-secret**. `providerKind`/`modelRef` are opaque labels; no concrete provider is chosen.

### 5.3 Instruction (`domain/provider-instruction.ts`)
```ts
import type { VoiceMode } from "../../decision-support/index.ts";
import type { RenderableKind } from "./renderable-domain-output.ts";
import type { RenderingStyle } from "./rendering-request.ts";
import type { ProviderRenderingRequest } from "./provider-rendering-request.ts";

export interface ProviderInstruction {
  readonly kind: RenderableKind;
  readonly voice?: VoiceMode;
  readonly allowedClaims: readonly string[];
  readonly forbiddenClaims: readonly string[];
  readonly uncertaintyVisibleRequired: boolean;
  readonly limitations: readonly string[];
  readonly traceabilitySummary?: string;
  readonly traceabilityStatus?: string;
  readonly style?: RenderingStyle;
  readonly locale?: string;
  readonly maxLength?: number;
}
export function providerInstructionFrom(request: ProviderRenderingRequest): ProviderInstruction;
```
[DECISION] `providerInstructionFrom` is a **pure projection** of the already-constrained `ProviderRenderingRequest` — it copies only the safe fields; there is **no** field for arbitrary prompt text, chain-of-thought, override-voice, hide-uncertainty, ignore-validation, or a mutable handle (unrepresentable). It is **not** a prompt-template file.

### 5.4 Client request/response (`domain/provider-client-response.ts`)
```ts
import type { RenderedMessageRecordId } from "./ids.ts"; // (illustrative; refs are strings here)
import type { ProviderInstruction } from "./provider-instruction.ts";
import type { ProviderClientConfig } from "./provider-client-config.ts";
import type { ProviderSecretRef } from "./provider-secret-ref.ts";
import type { ProviderOperationalFailure } from "./provider-operational-failure.ts";

export interface ProviderClientRequest {
  readonly sourceCaseRef: string;
  readonly instruction: ProviderInstruction;   // structured, derived
  readonly config: ProviderClientConfig;        // non-secret
  readonly secret: ProviderSecretRef;           // status + opaque ref only
}

export interface ProviderClientMetadata {       // OPERATIONAL only — never domain authority
  readonly providerKind: string;
  readonly latencyMs?: number;
  readonly tokenCount?: number;
  readonly finishReason?: string;
}

export type ProviderClientResponse =
  | { readonly status: "draft"; readonly text: string; readonly metadata?: ProviderClientMetadata }
  | { readonly status: "failed"; readonly failure: ProviderOperationalFailure; readonly metadata?: ProviderClientMetadata };
```
[FACT] `ProviderClientResponse` carries **no** secret, **no** raw provider payload bag, and **no** authority field. `metadata` is **operational only** (it never becomes `Evidence`/`Observation`/`SupportQuality`/athlete state — invariant 11/14) and is **not** retained in the raw-free audit.

### 5.5 Operational failure + mapping (`domain/provider-operational-failure.ts`)
```ts
import { isProviderFailure } from "./provider-failure.ts";
import type { ProviderFailure } from "./provider-failure.ts";

export type ProviderOperationalFailure =
  | "missing-credential"
  | "invalid-credential"
  | "provider-unavailable"
  | "provider-timeout"
  | "provider-rate-limited"
  | "provider-refused"
  | "provider-returned-empty-response"
  | "provider-returned-malformed-response"
  | "unsupported-provider-config"
  | "unsafe-provider-request";
export const PROVIDER_OPERATIONAL_FAILURES: readonly ProviderOperationalFailure[] = [/* …10… */];
export function isProviderOperationalFailure(value: unknown): value is ProviderOperationalFailure;

/** Map a client-level operational failure DOWN to the existing closed ProviderFailure (no expansion). */
export function toProviderFailure(op: ProviderOperationalFailure): ProviderFailure;
```
[DECISION] `toProviderFailure` (§10) is the **only** bridge from operational detail to the domain-facing closed `ProviderFailure` — credential/config detail is collapsed (never leaked).

### 5.6 Client boundary + fake (`application/provider-client-boundary.ts`, `fake-provider-client.ts`)
```ts
export interface ProviderClientBoundary {
  readonly kind: string;
  requestDraft(input: ProviderClientRequest): Promise<ProviderClientResponse>;
}

export type FakeProviderClientScenario =
  | "safe" | "malformed" | "empty" | "missing-credential" | "invalid-credential"
  | "timeout" | "rate-limited" | "refused" | "unavailable";

export class FakeProviderClient implements ProviderClientBoundary {
  readonly kind = "fake";
  constructor(opts?: { readonly scenario?: FakeProviderClientScenario });
  requestDraft(input: ProviderClientRequest): Promise<ProviderClientResponse>;
}
```
[DECISION] **Deterministic**, in-process, **no network / no `process.env` / no secret**. The `safe` scenario returns draft text composed from the `instruction` (reusing the same faithful-phrasing shape the fake renderer uses, so it passes `validateDraft`); credential scenarios are driven by `input.secret.status` (and/or the configured scenario); each failure scenario returns `{status:"failed", failure: <ProviderOperationalFailure>}`. It performs **no** external I/O. (The unsafe-request case is caught earlier by `providerRenderingRequestFrom`, not by the client.)

### 5.7 Real adapter + service (`application/real-provider-adapter.ts`, `real-provider-rendering-service.ts`)
```ts
import type { ProviderRenderingRequest, ProviderDraftOutcome } from "../domain/index.ts";

export interface RealProviderAdapter {
  readonly kind: string;
  draft(request: ProviderRenderingRequest): Promise<ProviderDraftOutcome>; // async analog of ProviderAdapter
}
export function realProviderAdapter(client: ProviderClientBoundary, config: ProviderClientConfig, secret: ProviderSecretRef): RealProviderAdapter;

export interface RequestRealProviderRenderingInput {
  readonly request: RenderingRequest;
  readonly client: ProviderClientBoundary;
  readonly config: ProviderClientConfig;
  readonly secret: ProviderSecretRef;
}
export function requestRealProviderRendering(input: RequestRealProviderRenderingInput): Promise<ProviderRenderOutcome>;
```
[DECISION] `realProviderAdapter(...)` builds a `ProviderClientRequest` (via `providerInstructionFrom`), calls `client.requestDraft(...)`, and maps the `ProviderClientResponse` to a `ProviderDraftOutcome` (`draft → {status:"drafted", draft:{text, providerKind, warnings:[]}}`; `failed → {status:"failed", failure: toProviderFailure(op)}`). It **never** calls `validateDraft` and **never** constructs a `RenderedMessage`.

---

## 6. Flow (the async real-ready path, mirroring `requestProviderRendering`)

[DECISION] `requestRealProviderRendering({ request, client, config, secret })` (async):
1. **Build + guard the constrained request** — `providerRenderingRequestFrom(request)` (the **unchanged** Impl 017 guard). If `rejected` → return `{ status:"failed", failure }` (`unsafe-provider-request`/`unsupported-style`/`unsupported-locale`) — **the client is never called**.
2. *(Optional fast-path)* if `secret.status !== "present"` → return `{ status:"failed", failure: toProviderFailure(secret.status === "missing" ? "missing-credential" : "invalid-credential") }` — **no client call** (UC4).
3. **Build the client request** — `providerInstructionFrom(built.providerRequest)` → `ProviderClientRequest { sourceCaseRef, instruction, config, secret }`.
4. **Call the async client** — `const response = await client.requestDraft(clientRequest)`.
5. **Map a failure** — if `response.status === "failed"` → return `{ status:"failed", failure: toProviderFailure(response.failure) }`.
6. **Mandatory validation (unchanged gate)** — `validateDraft({ draft: response.text, renderable: request.renderable, request })`.
   - `rendered` → `{ status:"rendered", message, providerKind: config.providerKind, providerWarnings: [] }`.
   - `failed` → `{ status:"failed", failure: "provider-output-failed-validation", renderingFailures: outcome.failures }`.
7. **No side effects** — persists nothing, reviews nothing, marks nothing display-eligible, delivers nothing, appends no event, **mutates no aggregate**, and **does not retry**.

[FACT] The returned `ProviderRenderOutcome` is **identical in shape** to `requestProviderRendering`'s, so the Impl 018 `auditProviderAttempt` observes a real attempt **without any change** — composed by the caller (Decision 7).

---

## 7. Sync vs Async Decision (required)

[FACT] **The tension:** the current `ProviderAdapter.draft(request)` is **synchronous** (`ProviderDraftOutcome`, not a `Promise`); real provider calls are **async**.

[DECISION] **Resolution — Option B (additive async path; sync seam untouched):**
- keep the synchronous `ProviderAdapter` + `FakeProviderAdapter` + `requestProviderRendering` (Impl 017) **exactly as-is**;
- add an **async** `ProviderClientBoundary.requestDraft(...) → Promise<…>`, a `RealProviderAdapter` (`Promise<ProviderDraftOutcome>`), and `requestRealProviderRendering(...) → Promise<ProviderRenderOutcome>`;
- prove all behavior with the **`FakeProviderClient`**; a future real SDK implements `ProviderClientBoundary`.

[DECISION] **Acceptance:** the **existing 441 tests continue to pass**; the fake-provider **sync** seam remains stable; the real-provider-ready path is **additive**; the **validator remains mandatory**. This is the first `async` surface in the codebase — confined to the real-ready path.

---

## 8. Secret / Config Rules

[DECISION]
- **No `process.env` read** in Impl 019; **no raw secret string** in records, responses, errors, tests, or logs; **no API key** in code; **no provider-specific SDK config**; **no concrete provider chosen**.
- missing/invalid credential is **simulated** via `ProviderSecretRef.status` (and/or a `FakeProviderClient` scenario); **secret availability is operational, not domain data**; **secrets are not audited** (the Impl 018 record has no field for them, and `ProviderClientMetadata` carries none).
- the only secret-shaped value permitted in a fixture is an **opaque sentinel** (`"ref:fake"`), never a key.

---

## 9. Prompt / Instruction Rules

[DECISION]
- **No production prompt-template files**; **no `src/prompts`**; **no arbitrary caller prompt field**.
- instruction material is **structured and derived** (`providerInstructionFrom`); **no** chain-of-thought request, hidden reasoning, voice override, hide-uncertainty instruction, ignore-validation instruction, or provider-specific payload bag.
- `ProviderInstruction` is serializable for tests and **safe by construction** (it has no field for unsafe content).

---

## 10. Provider Failure Mapping

[DECISION] `toProviderFailure(op: ProviderOperationalFailure): ProviderFailure` — using the **exact real `ProviderFailure` values**, **no expansion**:

| `ProviderOperationalFailure` | → `ProviderFailure` |
|---|---|
| `missing-credential` | `provider-unavailable` |
| `invalid-credential` | `provider-unavailable` |
| `provider-unavailable` | `provider-unavailable` |
| `provider-timeout` | `provider-timeout` |
| `provider-rate-limited` | `provider-rate-limited` |
| `provider-refused` | `provider-refused` |
| `provider-returned-empty-response` | `provider-returned-empty-draft` |
| `provider-returned-malformed-response` | `provider-returned-invalid-draft` |
| `unsupported-provider-config` | `provider-unavailable` |
| `unsafe-provider-request` | `unsafe-provider-request` |

[DECISION] **Do not expand `ProviderFailure`.** Credential/config detail is collapsed to `provider-unavailable` (operational detail may be kept in `ProviderClientMetadata` for debugging, never surfaced as a domain-facing failure beyond the mapped value). `unsafe-provider-request` is normally produced **before** the client by `providerRenderingRequestFrom`; the mapping covers a client that also reports it.

---

## 11. Audit Relationship

[DECISION] Impl 018's `auditProviderAttempt` is **composed outside** the real path (by the caller/test) over the returned `ProviderRenderOutcome`; the real service **creates no audit record automatically** (Decision 7). The audit stays **raw-free** (it never sees the raw `ProviderClientResponse.text`; it observes only the mapped `ProviderRenderOutcome`); **provider metadata is operational, not source truth**; **no raw provider response/draft is retained**.

---

## 12. Persistence / Review / Delivery / Event Rules

[DECISION] Implementation 019 **must not**: create a `RenderedMessageRecord`; save a rendered-message record; append a review; mark display-eligible; call delivery; create a `DeliveryRecord`; append event records; expand the event catalog; create provider-attempt event records; trigger a retry/scheduler. **No automatic persistence at all** in the provider-integration path (a test may compose the existing provider-attempt audit repository explicitly).

---

## 13. Negative Capability

[DECISION] Structurally impossible / test-failing in Impl 019: a **provider SDK/API/network/real-HTTP/`fetch(`/`node:http(s)`/concrete-SDK-token/`process.env`** appears; a **raw secret** appears in code/test/errors/records; a **production prompt-template file** appears; an **arbitrary prompt / chain-of-thought / raw private reasoning / mutable handle** reaches the client (the `ProviderClientRequest`/`ProviderInstruction` have no such field); **provider output bypasses `validateDraft`** or **creates a `RenderedMessage`/`RenderedMessageRecord`/review/display/delivery** directly; **provider metadata becomes `Evidence`/`Observation`/`Understanding`/`AthleteDecision`/`SupportQuality`**; **provider success validates recommendation quality** / **failure invalidates the domain**; an **automatic retry/scheduler/event bus** appears; the integration **imports `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`** or **mutates domain state**; a **raw provider response/draft is retained in the audit**. Enforced by TS-strict types (closed unions; no unsafe fields; async returns only `ProviderDraftOutcome`/`ProviderRenderOutcome`) + §14 tests + the existing rendering/persistence guards.

---

## 14. Validation Strategy (tests before implementation)

[ASSUMPTION] Negative tests are **defining.** (All async tests use the `FakeProviderClient`; no network/secrets.)

1. a **safe** fake-client draft passes **only through `validateDraft`** and may become a `RenderedMessage` (refs preserved).
2. a provider draft **cannot bypass validation** (the only path to a message is `validateDraft`).
3. **voice escalation** rejected (the unchanged validator).
4. **invented fact** rejected.
5. **hidden uncertainty** rejected.
6. **missing credential** → safe failure (`provider-unavailable`); **no client call** (a spy client confirms).
7. **invalid credential** → safe failure (`provider-unavailable`); no client call.
8. **timeout** → safe failure (`provider-timeout`).
9. **rate-limit** → safe failure (`provider-rate-limited`).
10. **malformed response** → safe failure (`provider-returned-invalid-draft`).
11. **empty response** → safe failure (`provider-returned-empty-draft`).
12. an **unsafe instruction/request is rejected before the client call** (`providerRenderingRequestFrom`; spy client never invoked).
13. the **provider-attempt audit retains no raw draft** when composed over a real outcome.
14. **provider metadata remains operational, not evidence** (the record state carries no metadata-as-domain-field).
15. provider **success creates no record/review/display/delivery/event** automatically.
16. provider **failure mutates no domain**.
17. **no automatic retry/scheduler/event bus**.
18. **no secrets persisted/logged/in errors** (no raw secret in any returned outcome/record/error).
19. **no SDK/API/network/prompt/`process.env` file** (structural: no `openai`/`anthropic`/`axios`/`node:http(s)`/`fetch(`/`process.env` token; no `src/{providers,prompts,…}` / `src/modules/{provider,llm,telemetry,evaluation,…}`).
20. **boundary/import tests:** real-provider files import only own `rendering` surfaces + `shared-kernel` (+ read-only `decision-support` *types*); no `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`; no upstream module imports them.
21. **all 441 Impl 001–018 tests continue to pass.**

[DECISION] Tests 6/7/12 use a **spy client** (throws if `requestDraft` is called) to prove the pre-call guards; the failure-mapping test exercises every `ProviderOperationalFailure → ProviderFailure` row (§10).

---

## 15. Boundary Rules

[DECISION]
- Real-provider files may import **only** own `rendering` domain/application types + `shared-kernel` (+ read-only `decision-support` *types* for `VoiceMode`, type-only).
- They **must not import** `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`; **no upstream module imports** them.
- **No** `src/modules/{provider,llm,openai,anthropic,model,telemetry,evaluation}`; **no** `src/{api,ui,infrastructure,providers,prompts}`; **no** `fetch(`/`node:http(s)`/provider-SDK token/`process.env`/prompt-template file.
- The new files are **not** repo-named (`-repository`/`in-memory-`), so the persistence-boundary guard does not constrain their imports; they still avoid forbidden DB/`event-bus`/`migration` tokens in code and comments.

[FACT] The names `provider-client-*`/`real-provider-*`/`provider-secret-ref`/`provider-operational-failure` match **no** existing forbidden token or directory; the network-token regex does not match "real-provider"/"secret"/"credential". **No documented blocker is expected** (additive inside `rendering`).

---

## 16. Relationship To Existing Architecture

[FACT] Builds on, without altering:
- **Impl 017** — the provider seam exists; the real-ready path **changes the draft source only** (async), reusing `providerRenderingRequestFrom` and returning the same `ProviderRenderOutcome`.
- **Impl 018** — the provider-attempt audit stays **raw-free and observe-only**; it observes the real outcome unchanged.
- **Impl 014** — **only validated drafts become a `RenderedMessage`**; `validateDraft` is unchanged and mandatory.
- **Impl 015** — **only a validated `RenderedMessage` may become a rendered-message record**; the real path creates none automatically.
- **Impl 016** — delivery consumes only display-eligible records; **provider success does not deliver**.
- **Impl 011** — event records are occurrence history; the real path appends none.
- **Impl 013** — a provider response is **not source material** unless the athlete separately reports it.

[DECISION] The picture: **real-provider-ready integration stays behind `rendering` · the fake/in-process client is not real integration · provider output is draft text only · `validateDraft` remains mandatory · the audit stays raw-free · integration is not delivery, eventing, model evaluation, or prompt-engineering infrastructure · secrets/network/prompts live only in the isolated client boundary.**

---

## 17. Open Questions (do not block implementation)

[QUESTION] which real provider to integrate first; SDK vs HTTP client; the actual secret-management mechanism and env-var naming; model/deployment configuration; timeout limits; retry policy; rate-limit handling; streaming support; provider-metadata retention; cost/billing limits; prompt-material storage; localization quality; model evaluation; production telemetry; provider event records.

[ASSUMPTION] None block Implementation 019: the boundary + failure mapping are fully provable in-memory with the `FakeProviderClient`, no network/secrets, behind the unchanged validator and raw-free audit.

---

## 18. Implementation Task Preview

**Implementation 019 — Add real-provider-ready client boundary with fake in-process client.**

[DECISION] Scope: create the `rendering/domain` secret-ref/config/instruction/client-response/operational-failure types + the `rendering/application` async `ProviderClientBoundary`, deterministic `FakeProviderClient`, `RealProviderAdapter`, and `requestRealProviderRendering` service per §4–§10, the tests (§14), and additive index exports. **Additive only** — the sync Impl 017 seam is untouched; **no new top-level module** (no e2e allowlist blocker expected).

**Acceptance criteria:**
- the real-provider-ready boundary **lives inside `rendering`**; **async-capable client boundary**; **fake/in-process client only**;
- **no real SDK/API/network**, **no `process.env` reads**, **no raw secrets**, **no production prompt templates**;
- the async path **reuses `providerRenderingRequestFrom`** and the **unchanged mandatory `validateDraft`**, returns the **existing `ProviderRenderOutcome`**; operational failures **map to the existing `ProviderFailure`** (catalog **not expanded**); every failure **degrades to safe non-rendering** with **no automatic retry**;
- **no persistence/review/display-eligibility/delivery/event side effect**; the **raw-free provider-attempt audit** remains unchanged (composed outside);
- real-provider files import only own `rendering` surfaces + read-only `decision-support` types; no `delivery`/`event-recording`/upstream import; no upstream module imports them;
- **the existing synchronous fake-provider seam (Impl 017) remains stable**; **all 441 existing tests stay green**; the new tests pass.

**The implementation must explicitly create none of:** a real provider/SDK · API keys / `process.env` reads / raw secrets · network/HTTP clients · prompt-template files · UI/API · a `RenderedMessageRecord`/review/display-eligibility/delivery side effect · event records / event-catalog change / provider-attempt event · a provider/llm/telemetry/evaluation module · an automatic retry/scheduler · domain mutation.

---

## 19. Technical Constraints

[FACT] TypeScript strict; Node native test runner (`node:test` + `node:assert/strict`, **async tests permitted**); **no** external test framework/framework/DB/event-bus/LLM-provider SDK/external call/real provider/prompt-templates-as-code/`process.env`/raw secrets. **No constructor parameter properties** (the deterministic `FakeProviderClient` is the one test-double constructor, with explicit fields). `import type` where appropriate. Explicit fields; `Object.freeze`. **No** arbitrary payload bags. **No** raw field-bag rehydration without validation. The **`FakeProviderClient` is deterministic**.

---

## 20. Success Criterion

> After this tech spec, Implementation 019 can be built **without** choosing a real provider, SDK, secrets, prompts, UI, API, persistence, events, delivery, retries, telemetry, model evaluation, or domain questions in code.

[ASSUMPTION] Answerable: the plan fixes every shape (`ProviderSecretRef`/`ProviderCredentialStatus`, `ProviderClientConfig`, `ProviderInstruction` + `providerInstructionFrom`, `ProviderClientRequest`/`ProviderClientResponse`/`ProviderClientMetadata`, the closed `ProviderOperationalFailure` + `toProviderFailure` mapping, the async `ProviderClientBoundary` + deterministic `FakeProviderClient`, the `RealProviderAdapter`, the async `requestRealProviderRendering` service), the boundary location (inside `rendering`), the **sync-untouched / async-added** decision, the secret-reference and instruction rules, the **validator-unchanged** and **raw-free-audit** relationships, the failure mapping (no `ProviderFailure` expansion), and the test contract — all satisfiable **in-memory** with a fake client, no network/secrets, modifying no existing behavior. The future implementation answers Spec 019's question: **"Can Aurora prepare for a real provider without letting secrets, network concerns, prompts, provider responses, retries, or metadata become authority, evidence, persistence, review, delivery, events, or domain mutation?"** — yes: a real provider becomes pluggable behind an isolated async client boundary, the unchanged validator still decides, the audit stays raw-free, and nothing real (SDK/network/secret) is touched yet.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the technical plan for the real-provider integration boundary. It defines a real-provider-ready async client boundary inside `rendering` — proven with a deterministic fake/in-process client — that changes only the draft source behind the unchanged mandatory `validateDraft` and the raw-free attempt audit; it adds no real SDK/network/secret/prompt, no new module, and no downstream side effect. A real provider changes the draft source, not the authority model.*

*Inputs: [Spec 019](./019-real-provider-integration-boundary.md) · [Spec 018](./018-provider-attempt-audit-boundary.md) · [Spec 018A](./018-provider-attempt-audit-boundary-tech.md) · [Spec 017](./017-provider-adapter-boundary.md) · [Spec 017A](./017-provider-adapter-boundary-tech.md) · [Spec 014](./014-llm-rendering-boundary.md) · [Spec 015](./015-rendered-message-review-persistence.md) · [Spec 016](./016-delivery-boundary.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 013](./013-manual-input-adapter.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
