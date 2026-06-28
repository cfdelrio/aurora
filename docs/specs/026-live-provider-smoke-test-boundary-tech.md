# Aurora — Technical Spec 026A — Live Provider Smoke-Test Implementation Plan

> Phase: **Technical Specification** (TS-strict plan, no code).
> Translates: `docs/specs/026-live-provider-smoke-test-boundary.md`.
> Status: this document fixes the **mechanism** for a manually-invoked, opt-in live-provider smoke test that exercises **one** real provider call through the *existing* rendering/provider seam (`requestRealProviderRendering(...) → validateDraft`) — and the minimal TS-strict shape for Implementation 026. **No code, no SDK, no dependency, no CI live tests, no real credentials, no prompt templates, no telemetry/model-eval, no retry/scheduler/event bus, no delivery, no persistence, no provider-behavior change, no validation-behavior change.**

---

## 0. Phase confirmation

This is the **Technical Specification** phase, not Implementation.

- `[FACT]` This document plans; it changes no file under `src/`. No dependency is installed; `package.json` / `package-lock.json` are untouched by 026A (devDeps stay `typescript` + `@types/node`).
- `[DECISION]` 026A picks: the smoke surface form + location; the opt-in / CI mechanism; the credential + live-policy wiring through the existing chain; the provider path; the closed result/status union + redaction rules; the import-boundary + guard plan; the deterministic test strategy — and stops there.

---

## 1. Context recap

Spec 026 is complete. Every surface the smoke composes already exists and is individually proven (Impl 014–025); validation is **`583/583`**. Spec 026's behavioral rule: **a smoke test proves wiring, not wisdom** — it is **manual / opt-in / out of the default suite / out of CI by default / credential-free unless the operator supplies one / fail-closed / raw-free / non-domain-authoritative**, and it is **not** a default test, a CI test, a production rollout, model evaluation, telemetry, or a retry/scheduler/workflow system.

Spec 026's approved scope decision: **the first live smoke targets the rendering/provider seam, not delivery and not `application-orchestration`'s delivery path.** It creates **no** rendered-message record, review, delivery record, event, evidence, athlete decision, or domain mutation.

`[GAP]` (Spec 026 §1) **No live link has ever been exercised against a real provider.** The live boundary (Impl 021) is disabled by default; the default suite and CI make no live call and need no credential. 026A specifies the smallest surface that lets an operator deliberately verify the wiring **once**, while proving — deterministically, with fakes, and **without making a live call** — that the guard behavior (skip / fail-closed / redaction) holds.

---

## 2. Central Question

> How can Aurora implement **one** manually-invoked, opt-in live-provider smoke boundary through the existing rendering/provider seam while guaranteeing that **default tests remain deterministic**, **CI remains credential-free**, **no live call happens accidentally**, **validation remains mandatory**, **output remains redacted**, **no raw provider payload/secret leaks**, and **no delivery/event/domain side effect occurs**?

Answer shape (proven below): a **pure, injected, testable smoke helper** `liveProviderSmoke(command, deps)` inside **`rendering/application`** — it **reads no `process.env`** (opt-in + CI are **injected** indicators; the credential arrives via an **injected** `ProviderCredentialResolver`), runs its **explicit fail-closed guards in order** (opt-in → CI → credential → live policy), and **only then** builds a `LiveProviderClient` over an **injected** transport and calls the **unchanged** `requestRealProviderRendering(...)` (which ends at the **unchanged** `validateDraft`). It returns a **closed, redacted `LiveProviderSmokeResult`**. The **operator entrypoint that reads the real opt-in/CI env flags and wires the real transport/credential adapter is deferred** (it cannot live in `src/` without tripping the one-file `process.env` guard — §5). Tests inject fakes; **no live call, no real env, no CI credential, no dependency.**

---

## 3. Required Technical Decisions

### `[DECISION]` Decision 1 — Smoke location/form → **a pure helper inside `rendering/application` (Option C); operator script deferred**

Implement **`src/modules/rendering/application/live-provider-smoke.ts`** — a pure, deterministic, **fully-injected** helper (Spec 026's recommended **Option C**). Do **not** add a `scripts/` operator entrypoint or an npm script in Implementation 026.

Rationale (grounded in real code, §5):
- The `process.env` **one-file guard** (`process-environment-negative-capability.test.ts`) seals the `process.env` token to **exactly** `process-environment-credential-source-adapter.ts` across **all production `.ts` under `src/`**. A smoke helper in `src/` therefore **cannot read `process.env`** — not the opt-in flag, not `CI`. So the helper takes **injected** `optIn` / `ci` indicators and an **injected** credential resolver; it never reads env.
- `tsconfig.json` has `"include": ["src"]`, and the test glob is `"src/**/*.test.ts"`. A helper under `src/modules/rendering/application/` is **typechecked** and its **tests run in the default suite** (with fakes — no live call); a `scripts/` file would be **outside** both the typecheck and the suite, creating run/typecheck ambiguity. Option C keeps the boundary fully under the gate.
- The **operator script** (which must read the real `AURORA_LIVE_PROVIDER_SMOKE` / `CI` env flags and wire `processEnvironmentCredentialSourceAdapter()` + `liveProviderHttpTransport({ endpoint })` + `LiveCallPolicy.enabled()`) is **deferred** to a later, deliberate slice: it belongs **outside `src/`** (so it does not become a second `process.env` token site), and its placement/convention (and any second approved env-read site) is an open question (§14). `[DECISION]` Implementation 026 documents that **the smoke boundary exists but no operator script exists yet.**

`[FACT]` Because the helper lives inside `rendering`, it **adds no new top-level module** → **AC20 is not triggered** (`ALLOWED_MODULES` already includes the existing modules; no allowlist edit is needed). It is **not** placed in `application-orchestration` (Spec 026 §10: the first smoke is provider/rendering wiring, not the delivery composition path).

### `[DECISION]` Decision 2 — npm script → **none in Implementation 026**

Do **not** modify `package.json`. The repo's only scripts are `typecheck` / `test` / `check`; there is **no manual-script convention**, and adding `smoke:provider:live` would (a) churn `package.json`, (b) risk discoverability as a normal command, and (c) imply an operator entrypoint that is deferred (Decision 1). A package guard asserts `dependencies` empty and `devDependencies == ["@types/node","typescript"]` (it already exists in the live/process-env guards — §11).

### `[DECISION]` Decision 3 — Opt-in mechanism → **an injected boolean indicator this slice; the env flag is read only by the deferred operator script**

The helper takes an **injected** `optIn: boolean`. Absent/`false` → it returns `not-enabled` **before** credential resolution and **before** any client/transport construction. `[DECISION]` The **representation of the env opt-in flag** (recommended `AURORA_LIVE_PROVIDER_SMOKE=1`, with any non-exact value failing closed) is the **operator script's** responsibility (deferred) — because reading it in `src/` would trip the one-file `process.env` guard. The helper models the **guard logic** (given `optIn`, behave correctly), deterministically testable without env. Opt-in is **distinct** from credential availability and **distinct** from the live policy.

### `[DECISION]` Decision 4 — CI guard → **an injected boolean indicator this slice; `ci=true` ⇒ `ci-disabled` before credential/transport**

The helper takes an **injected** `ci: boolean`. `ci === true` → it returns `ci-disabled` **before** credential resolution and **before** any client/transport construction. Unless a future explicit CI-live policy is separately specified, CI always blocks. `[DECISION]` The **detection of `CI`** from the environment is again the **operator script's** responsibility (deferred), for the same one-file-guard reason. Do **not** add the CI-live policy in this slice.

### `[DECISION]` Decision 5 — Credential wiring → **injected `ProviderCredentialResolver`; real env binding only through the approved Impl 023 adapter (in the deferred script)**

The helper takes an **injected** `ProviderCredentialResolver` and resolves **once** as its explicit pre-transport guard: `resolve()` → `missing` ⇒ `credential-missing`; `invalid` ⇒ `credential-invalid` — both **before** any transport construction. In production the resolver is the existing `EnvironmentProviderCredentialResolver` fed by `processEnvironmentCredentialSourceAdapter().toEnvironmentCredentialSource()` (the **one approved `process.env` read site**, Impl 023, wired by the **deferred** operator script). The helper itself **never reads `process.env`**, **never scans env**, **never prints an env key/value**, and the **raw secret never appears** in the result/output/error (only the opaque transient token flows, and only inside the transport header). `[FACT]` The resolver is **deterministic and idempotent**, so the helper's early resolve and the `LiveProviderClient`'s call-time resolve agree.

### `[DECISION]` Decision 6 — Live policy wiring → **injected `LiveCallPolicy`; `enabled` checked before transport; passed into the client unchanged**

The helper takes an **injected** `LiveCallPolicy`. After opt-in / CI / credential pass, it checks `policy.enabled`: `false` ⇒ `live-policy-disabled` **before** transport construction. When enabled it passes the **same** policy into the `LiveProviderClient` it builds. `[FACT]` Enabling the policy **for the smoke call** does not enable any global production behavior — `LiveCallPolicy` is a plain injected value object, disabled by default, never inferred from the environment. The disabled-policy outcome is provable **without transport** (the helper short-circuits).

### `[DECISION]` Decision 7 — Provider path → **`requestRealProviderRendering(...)` with the `LiveProviderClient` as the injected client; never a transport bypass**

When all guards pass, the helper builds **`new LiveProviderClient({ policy, resolver, transport, kind })`** (transport **injected**), sets a safe **`ProviderSecretRef { status: "present", ref: "ref:live" }`** (an opaque operational handle, **never** a secret), and calls **`requestRealProviderRendering({ request, client, config, secret })`**. This reuses — unchanged — the `providerRenderingRequestFrom` guard, the credential fast-path, the `serializeProviderInstruction` / `parseProviderResponse` / `mapProviderError` inside `LiveProviderClient`, the `realProviderAdapter`, and the **mandatory `validateDraft`**. The helper **never** calls the transport directly, **never** calls `LiveProviderClient.requestDraft` directly, and **never** calls `validateDraft` itself.

### `[DECISION]` Decision 8 — Smoke input → **a synthetic, bounded `RenderingRequest`; no athlete-sensitive data**

The command carries a **synthetic `RenderingRequest`** (built from a synthetic, bounded `RenderableDomainOutput` — reuse an existing rendering test fixture or `renderableFromTerminalOutput` over a synthetic terminal output). It contains **no** real athlete data, **no** raw private training data, **no** chain-of-thought, and **no** production prompt template. (The `ProviderInstruction` is derived by the existing serializer, unchanged.)

### `[DECISION]` Decision 9 — Output format → **a closed, redacted `LiveProviderSmokeResult`; rendered-message body suppressed**

Return a **closed `LiveProviderSmokeResult`** (a plain value object, redacted). **Allowed fields:** a closed `status`; a safe `reason?` (closed/derived, never raw); `validationPassed?: boolean`; `providerFailureCode?: string` (a closed `ProviderFailure` code, only for `provider-failed`); `durationMs?: number` (if safe); `rawRetained: false` (literal — the explicit "no raw payload retained" statement). **Forbidden:** the rendered-message **body** (suppressed this slice — Spec 026 §15/§8), a raw draft, a raw provider response, a prompt/payload, a secret/env value, a provider metadata bag. `[DECISION]` Output is a returned **value** (the helper does not `console.log`); any printing is the **deferred operator script's** concern. (026A recommends a JSON-serializable value; human formatting is deferred.)

### `[DECISION]` Decision 10 — No persistence / no delivery / no event → **the helper composes only the seam**

The helper **persists nothing and delivers nothing**. It must **not** call: the rendered-message record repository, `renderReview`, `displayEligibilityOf` (for delivery), `deliveryRequest` / `requestDelivery`, any event factory / `DomainEventRecordRepository`, or `orchestrateRenderDeliver`. It reaches **only** `requestRealProviderRendering` and maps its `ProviderRenderOutcome` to the redacted result.

### `[DECISION]` Decision 11 — Timeout / boundedness → **one call; the existing `policy.timeoutMs`; no retry**

Exactly **one** provider call (`requestRealProviderRendering` calls the client once; `LiveProviderClient` calls the transport once; the transport applies `AbortSignal.timeout(policy.timeoutMs)`). **No loops, no retries, no backoff, no scheduler.** The timeout budget reuses the existing `LiveCallPolicy.timeoutMs` (no new primitive).

---

## 4. Live Surface Flow (explicit guards first; one bounded call; nothing self-triggers)

```text
liveProviderSmoke(command, deps):                                   // async; deterministic with fakes
 1. if !command.optIn:           return { status: "not-enabled", rawRetained: false }        // before credential/transport
 2. if command.ci:               return { status: "ci-disabled", rawRetained: false }        // before credential/transport
 3. res = deps.resolver.resolve()
       if res.status === "missing":  return { status: "credential-missing", rawRetained: false }   // before transport
       if res.status === "invalid":  return { status: "credential-invalid", rawRetained: false }   // before transport
 4. if !deps.policy.enabled:     return { status: "live-policy-disabled", rawRetained: false }       // before transport
 5. client = new LiveProviderClient({ policy: deps.policy, resolver: deps.resolver, transport: deps.transport, kind })
    secret = { status: "present", ref: "ref:live" }                 // opaque handle; NEVER a secret
    outcome = await requestRealProviderRendering({ request: command.request, client, config: deps.config, secret })
 6. map outcome:
       rendered                                   → { status: "passed", validationPassed: true, rawRetained: false, durationMs? }
       failed & "provider-output-failed-validation" → { status: "validation-failed", validationPassed: false, rawRetained: false }
       failed & (any other ProviderFailure)       → { status: "provider-failed", providerFailureCode: failure, rawRetained: false }
 7. (any thrown error)            → { status: "unexpected-failure", rawRetained: false }     // no secret / no raw body
 8. return the redacted result    // never the rendered-message body, never a secret, never a payload
```

`[FACT]` Steps 1–4 short-circuit **before the transport is constructed or called** — so "no live call without opt-in / in CI / without a credential / with a disabled policy" is provable **with fakes, without a network call**. Step 5 is the **only** call site, and it is **bounded to one** request with no retry. The helper records **nothing**, delivers **nothing**, mutates **nothing**.

---

## 5. Surface Gap Analysis (from real code — exact signatures + the guard findings)

1. **`requestRealProviderRendering(input): Promise<ProviderRenderOutcome>`** (`rendering/application/real-provider-rendering-service.ts`), `RequestRealProviderRenderingInput = { request: RenderingRequest; client: ProviderClientBoundary; config: ProviderClientConfig; secret: ProviderSecretRef }`. Reuses `providerRenderingRequestFrom` (rejects unsafe requests before the client call), a **credential fast-path** (`secret.status !== "present"` ⇒ `failed` before any client call, mapping `missing`/`invalid` via `toProviderFailure`), the async `realProviderAdapter(client, config, secret)`, and the mandatory **`validateDraft({ draft, renderable, request })`**. **Persists/reviews/delivers/emits/mutates nothing; never retries.**
2. **`ProviderRenderOutcome`** (`rendering/application/provider-rendering-service.ts`): `{ status: "rendered"; message: RenderedMessage; providerKind: string; providerWarnings: readonly string[] } | { status: "failed"; failure: ProviderFailure; renderingFailures?: readonly RenderingFailure[] }`. `[FACT]` The smoke branches on `status`; on `"failed"` with `failure === "provider-output-failed-validation"` ⇒ `validation-failed`; on any other `failure` ⇒ `provider-failed` carrying the closed `failure` code. `[GAP]` The outcome exposes only a closed `ProviderFailure` — it does **not** distinguish `timeout` / `malformed-response` / `unavailable` (those map **down** to `ProviderFailure`; unknown → `provider-unavailable`). The smoke therefore folds them into **`provider-failed` + `providerFailureCode`** rather than inventing finer statuses the outcome cannot produce (finer granularity deferred — §14).
3. **`LiveProviderClient`** (`rendering/application/live-provider-client.ts`): `class LiveProviderClient implements ProviderClientBoundary`, constructor `(deps: LiveProviderClientDeps)` where `LiveProviderClientDeps = { policy: LiveCallPolicy; resolver: ProviderCredentialResolver; transport: LiveProviderTransport; kind?: string }`. `requestDraft(input): Promise<ProviderClientResponse>` **fails closed before transport** when `!policy.enabled` (→ `mapProviderError({ kind: "live-disabled" })`) or `resolver.resolve()` is `missing`/`invalid`; otherwise serializes (unchanged), calls `transport.send(payload, token, policy)` **once**, and parses/maps (unchanged). **Never calls `validateDraft`.**
4. **`LiveCallPolicy`** (`rendering/application/live-call-policy.ts`): `interface { enabled: boolean; timeoutMs: number; source?: string }` + the factory `LiveCallPolicy.disabled()` / `LiveCallPolicy.enabled({ timeoutMs?, source? })` (default `timeoutMs` 30_000). Plain value object; disabled by default; never inferred from env.
5. **`ProviderCredentialResolver`** (`rendering/application/provider-credential-resolver.ts`): `interface { resolve(): ProviderCredentialResolution }`; `ProviderCredentialResolution = { status: "available"; token: ProviderCredentialToken } | { status: "missing" } | { status: "invalid" }`; `ProviderCredentialToken` is an **opaque branded string** (transient handle). The smoke injects this port and resolves once for its guard.
6. **`EnvironmentProviderCredentialResolver`** (`rendering/application/environment-provider-credential-resolver.ts`): `constructor(config: EnvironmentResolverConfig)` where `EnvironmentResolverConfig = { keyName: string; source: EnvironmentCredentialSource; validation?: CredentialValidationPolicy }`, `EnvironmentCredentialSource = Readonly<Record<string, string | undefined>>`. Classifies absent → `missing`; blank/control/too-short (`minLength` default 8) → `invalid`; else → `available` with the opaque token. Reads the **injected** source, never `process.env`.
7. **`ProcessEnvironmentCredentialSourceAdapter`** + exports (`rendering/application/process-environment-credential-source-adapter.ts`): `class …({ keyName: string; accessor: ProcessEnvironmentAccessor })` with `toEnvironmentCredentialSource(): EnvironmentCredentialSource`; `ProcessEnvironmentAccessor = (key: string) => string | undefined`; `APPROVED_PROVIDER_CREDENTIAL_KEY = "AURORA_PROVIDER_CREDENTIAL"`; `defaultProcessEnvironmentAccessor = (key) => process.env[key]` (**the ONLY direct `process.env` read site**); factory `processEnvironmentCredentialSourceAdapter(keyName = APPROVED_PROVIDER_CREDENTIAL_KEY)`. `[GAP]` The smoke helper **must not** construct/import this in a way that reads env in `src/`; the real binding is done by the **deferred operator script** (outside `src/`).
8. **`ProviderClientConfig`** (`rendering/domain/provider-client-config.ts`): `{ providerKind: string; timeoutMs?: number; modelRef?: string }` — provider-agnostic, **non-secret**. The smoke injects a config with a neutral `providerKind` (e.g. `"live"`); no API key, no endpoint, no SDK config.
9. **`ProviderSecretRef`** (`rendering/domain/provider-secret-ref.ts`): `{ status: "present" | "missing" | "invalid"; ref?: string }` — an **opaque operational handle**, never a raw secret (there is no field for a key). The smoke sets `{ status: "present", ref: "ref:live" }` only after its credential guard passes; the **actual** credential flows only through the resolver→transport header.
10. **Serializer / parser / error-mapper** (`rendering/application/concrete-provider-*.ts`): `serializeProviderInstruction(instruction): ConcreteProviderRequestPayload` (safe constraints only; no prompt/CoT/secret field); `parseProviderResponse(body, kind): ProviderClientResponse` (untrusted draft + operational metadata; empty/malformed → safe failures; **no raw payload retained**); `mapProviderError(error): ProviderOperationalFailure`. All reused **unchanged inside `LiveProviderClient`** — the smoke never calls them directly.
11. **`LiveProviderTransport`** (`rendering/application/live-provider-http-transport.ts`): `interface { send(payload: ConcreteProviderRequestPayload, credential: ProviderCredentialToken, policy: LiveCallPolicy): Promise<LiveProviderTransportResult> }`; `LiveProviderTransportResult = { outcome: "response"; body: unknown } | { outcome: "error"; error: ConcreteProviderErrorShape }`; factory `liveProviderHttpTransport({ endpoint })` (native `fetch` + `AbortSignal.timeout`, the **only** network-token file). `[FACT]` The smoke **injects** a `LiveProviderTransport` (a fake in tests; the real `liveProviderHttpTransport({ endpoint })` in the deferred operator script) — it never imports `liveProviderHttpTransport` and contains **no** `fetch`/URL token.
12. **Safe failure codes:** `ProviderFailure` (closed, 10 members; `provider-output-failed-validation` among them; unknown → `provider-unavailable`); `ProviderOperationalFailure` (`missing-credential` / `invalid-credential` / `live-disabled` / network-flavored, mapped **down** to `ProviderFailure`). The redacted result carries a `ProviderFailure` code only.
13. **Default test command/glob:** `package.json` → `"test": "node --test \"src/**/*.test.ts\""`; `"typecheck": "tsc --noEmit"`; `"check": "npm run typecheck && npm run test"`. `[FACT]` Only `*.test.ts` under `src/` run; a `scripts/` file never runs in the default suite.
14. **`tsconfig.json`:** `"include": ["src"]`; strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`, `allowImportingTsExtensions`, `noEmit`, `noPropertyAccessFromIndexSignature`, nodenext). `[GAP]` **`scripts/` is not typechecked** by `tsc --noEmit` (only `src`) and not run by the suite — so an operator entrypoint there is outside the gate; this is the second reason the script is **deferred** (Decision 1).
15. **Manual run of `.ts`:** Node 22 runs `.ts` directly via type-stripping (the suite already does). So a future operator script may be `node scripts/live-provider-smoke.ts` with **no build**; but it would still need a way to be typechecked and to read env without tripping the one-file guard — deferred (§14).
16. **`process.env` one-file guard** (`rendering/tests/process-environment-negative-capability.test.ts`): scans **all production `.ts` under `src/`** (excludes `*.test.ts` and `/tests/`) and asserts the `process.env` token appears in **exactly** `["process-environment-credential-source-adapter.ts"]`. `[GAP]` **Decisive:** the smoke helper (a production `.ts` under `src/`) **must contain no `process.env` token** — hence injected `optIn`/`ci`/resolver (Decisions 3–5).
17. **Live-provider guard** (`rendering/tests/live-provider-negative-capability.test.ts`): scans production files matching `/(live-call|live-provider|provider-credential)/` and asserts (a) the native network token (`fetch(` / `https?://` / `node:http(s)`) lives **only** in `live-provider-http-transport.ts`; (b) **no** `openai`/`anthropic`/`axios`/`process.env` token in any such file; (c) **no** retry/scheduler primitive (`setTimeout`/`setInterval`/`queueMicrotask`/`EventEmitter`/`scheduler`/`retry`); (d) no module outside `rendering` references `LiveProviderClient`/`LiveCallPolicy`/`liveProviderHttpTransport`/`StaticProviderCredentialResolver`/`ProviderCredentialResolver`. `[FACT]` Naming the helper **`live-provider-smoke.ts`** puts it under this scan — which is **good**: it must (and will, by injection) contain no network/vendor/env/retry token. It lives **inside `rendering`**, so it may import `LiveProviderClient`/`LiveCallPolicy`.
18. **AC20** (`src/modules/__tests__/end-to-end-responsible-reflection.test.ts`): `ALLOWED_MODULES` already includes the nine modules **+ `application-orchestration`**. `[FACT]` The smoke helper lives **inside `rendering`** → **no new top-level module** → **AC20 is not triggered and needs no edit.**
19. **Package guard** (present in the live + process-env guards): `dependencies` empty/absent; `devDependencies == ["@types/node","typescript"]`. `[FACT]` Implementation 026 changes neither.
20. `[FACT]` **All smoke tests run deterministically with fakes** — an injected fake `LiveProviderTransport` (returning a good body / an error / a malformed body), an injected fake or `StaticProviderCredentialResolver` (available/missing/invalid), `LiveCallPolicy.disabled()`/`.enabled()`, injected `optIn`/`ci` booleans, and a synthetic `RenderingRequest`. **No `fetch`, no real env, no CI credential, no SDK, no network.** The "passed" path uses a fake transport `body` shaped so `parseProviderResponse` yields a draft that `validateDraft` **accepts** (reuse the existing concrete-provider good-body fixture); "validation-failed" uses a body whose draft `validateDraft` **rejects**.

> `[GAP]` Net constraints the plan must honor: **(a)** the helper reads no `process.env` (injected indicators + resolver); **(b)** the helper contains no network/vendor/retry token (injected transport); **(c)** the operator env-reading entrypoint is **deferred** (outside `src/`, outside the gate, possibly needing a second approved env-read site — §14); **(d)** there are **two** credential gates (`ProviderSecretRef.status` fast-path in the service + the resolver inside `LiveProviderClient`) — the smoke's explicit early resolve produces the precise `credential-missing`/`-invalid` status and proves "stops before transport," while the service/client fast-paths remain backstops.

---

## 6. Proposed File Layout

Inside the existing `rendering` module (no new module; **no `scripts/`** this slice):

```text
src/modules/rendering/application/live-provider-smoke.ts                     # the pure helper + its command/deps/result types
src/modules/rendering/application/index.ts                                   # + export liveProviderSmoke + types
src/modules/rendering/tests/live-provider-smoke-boundary.test.ts             # behavior (deterministic, fakes)
src/modules/rendering/tests/live-provider-smoke-negative-capability.test.ts  # defining negatives (no env/network/raw/import)
```

Must **not** create: `src/modules/{workflow,orchestrator,events-bus,event-bus,queue,scheduler,retry,telemetry,evaluation,provider,llm}`, `src/{api,ui,infrastructure,providers,prompts,db,database,migrations}`. Do **not** edit `package.json` / lockfile; add no SDK, no DB/schema/migrations, no `scripts/` entrypoint (deferred). No AC20 edit (no new module).

---

## 7. Types / Surfaces To Plan

All TS-strict: `readonly` fields, **explicit field declarations**, **no constructor parameter properties** (the helper is a function over injected deps + plain value objects), `import type` for type-only imports, no arbitrary bags, no raw-bag rehydration.

### `LiveProviderSmokeCommand` (input — data, not collaborators)
```text
readonly optIn: boolean                 // injected operator opt-in indicator (NOT read from env by the helper)
readonly ci: boolean                    // injected CI indicator (NOT read from env by the helper)
readonly request: RenderingRequest      // synthetic, bounded; no athlete-sensitive data
```
**Must not contain:** a raw credential, a process-env value, a provider prompt/payload, chain-of-thought, hidden reasoning.

### `LiveProviderSmokeDependencies` (injected — all collaborators; explicit, no globals, no env reads)
```text
readonly policy: LiveCallPolicy                 // injected; disabled-by-default value object
readonly resolver: ProviderCredentialResolver   // injected; deterministic in tests; real env-fed in the deferred script
readonly transport: LiveProviderTransport        // injected; fake in tests; liveProviderHttpTransport in the deferred script
readonly config: ProviderClientConfig            // non-secret; neutral providerKind
readonly clientKind?: string                     // neutral label for LiveProviderClient ("live")
readonly now?: () => Timestamp                    // optional, for durationMs; or omit duration
```
**No** service locator, **no** event bus, **no** scheduler, **no** implicit lookup, **no** `process.env` read. `requestRealProviderRendering`, `LiveProviderClient` are **imported** (the helper is inside `rendering`); the transport/resolver/policy are **injected**.

### `LiveProviderSmokeResult` (closed discriminated-ish value object; redacted)
```text
readonly status: LiveProviderSmokeStatus
readonly rawRetained: false                       // literal — explicit "no raw payload retained"
readonly validationPassed?: boolean               // set on passed / validation-failed
readonly providerFailureCode?: string             // a closed ProviderFailure code; only on provider-failed
readonly durationMs?: number                      // only if safe
readonly reason?: string                          // safe, closed/derived; never raw text
```
**Must not include:** the rendered-message body, a raw draft, a raw provider response, a prompt/payload, a secret/env value, a metadata bag.

### `LiveProviderSmokeStatus` (closed catalog)
```text
not-enabled · ci-disabled · credential-missing · credential-invalid · live-policy-disabled
  · provider-failed · validation-failed · passed · unexpected-failure
```
(`provider-failed` folds timeout/malformed/unavailable, distinguished by `providerFailureCode` — §5.2 `[GAP]`.)

### Entry point
`liveProviderSmoke(command: LiveProviderSmokeCommand, deps: LiveProviderSmokeDependencies): Promise<LiveProviderSmokeResult>` — async (because `requestRealProviderRendering` is async); deterministic given fakes + injected indicators.

---

## 8. Required Flow Semantics (exact order)

The order is §4 steps 1–8. Invariants restated as TS-checkable rules: **opt-in is checked first** (no credential read / transport construction before it); **CI is checked second**; **credential resolution is the third gate** (`missing`/`invalid` stop **before transport**); **policy is the fourth gate** (`disabled` stops **before transport**); the **transport/client are constructed only after all four guards pass**; the **one** call goes through `requestRealProviderRendering` (so `validateDraft` is mandatory and the serializer/parser/error-mapper are reused); **no second call, no retry**; the result is **redacted**; **no persistence / review / display-eligibility / delivery / event / evidence / domain mutation** occurs on any path.

---

## 9. Required Failure Semantics (exact)

| Condition | Behavior | `status` |
|---|---|---|
| Opt-in absent/false | stop before credential/transport | `not-enabled` |
| Opt-in malformed (operator script: value ≠ approved) | fail closed; treated as not-enabled | `not-enabled` |
| CI indicator true | stop before credential/transport | `ci-disabled` |
| Credential missing | resolve → `missing`; stop before transport | `credential-missing` |
| Credential invalid | resolve → `invalid`; stop before transport | `credential-invalid` |
| Live policy disabled | `!policy.enabled`; stop before transport | `live-policy-disabled` |
| Provider unavailable / timeout / malformed | one call; `outcome.failed`; **no retry**; **no raw body** | `provider-failed` (+ `providerFailureCode`) |
| Provider draft validation failure | `outcome.failed` = `provider-output-failed-validation` | `validation-failed` |
| Provider draft valid | `outcome.rendered`; **body suppressed**; no record/delivery/event | `passed` |
| Unexpected exception | safe result; **no secret / no raw body in the error** | `unexpected-failure` |

**No automatic retry. No scheduler. No delivery. No domain mutation. No raw leakage. No secret in any error.** Every outcome is a safe skip/stop/failure.

---

## 10. Boundary / Import Rules

**Allowed imports** for `live-provider-smoke.ts` (it lives inside `rendering`): the `rendering` application surfaces it composes — `requestRealProviderRendering`, `LiveProviderClient`, `LiveCallPolicy` (type), `ProviderCredentialResolver` (type), `LiveProviderTransport` (type), `ProviderRenderOutcome` (type), `RenderingRequest` / `ProviderClientConfig` / `ProviderSecretRef` (types); `shared-kernel` (e.g. `Timestamp`); **read-only `decision-support` types** only if a type is needed for the synthetic request. **Forbidden imports:** `delivery`, `event-recording`, `application-orchestration`, any `observation`/`reasoning`/`understanding`/`athlete` internal; `liveProviderHttpTransport` (the **transport is injected** — the helper carries no `fetch`/URL token); the **process-env adapter** (`processEnvironmentCredentialSourceAdapter` / `defaultProcessEnvironmentAccessor`) — the helper reads no env; any event-bus/scheduler/retry/telemetry/DB module. **The helper must not be imported by any module outside `rendering`.**

---

## 11. Structural Guard Strategy (additive; nothing weakened)

A new `live-provider-smoke-negative-capability.test.ts` asserts:
- the helper source contains **no** `process.env` token (it stays absent from the one-file-guard scan — and the existing repo-wide guard continues to pass, since the only env site remains the approved adapter);
- the helper source contains **no** native-network token (`fetch(` / `https?://` / `node:http(s)`), **no** vendor/SDK token (`openai`/`anthropic`/`axios`), and **no** retry/scheduler primitive (`setTimeout`/`setInterval`/`queueMicrotask`/`EventEmitter`/`scheduler`/`retry`) — it is held to the existing live-provider guard since its filename matches `live-provider`;
- the helper imports **no** `delivery` / `event-recording` / `application-orchestration` / upstream-domain module, and not `liveProviderHttpTransport` / the process-env adapter;
- **no module outside `rendering`** imports `liveProviderSmoke`;
- the **redacted result** contains **no** raw draft/prompt/payload/response/secret/env value/rendered-message body (a sentinel-absence scan over `JSON.stringify(result)` on every path — build any sensitive token-regex from fragments so the test is not itself a token site, per the Impl 023/024 precedent);
- **no new top-level module** and none of the forbidden `src/modules/{workflow,event-bus,queue,scheduler,retry,telemetry,evaluation,provider,llm}` / `src/{api,db,…}` dirs;
- a **package guard**: `dependencies` empty/absent, `devDependencies == ["@types/node","typescript"]`.

`[FACT]` Existing guards stay green **unchanged**: the `process.env` one-file guard (helper adds no token), the live-provider network guard (helper adds no network/vendor/env/retry token), AC20 (no new module). **No guard is weakened.**

---

## 12. Test Strategy (deterministic; negatives are defining)

Default: deterministic, **fakes/in-memory only**, **no live call, no real env, no CI credential, no SDK**, no event bus/scheduler/retry. Required tests (≥ the prompt's 16):
1. **no opt-in** → `not-enabled` **before** credential resolve / transport (spy: resolver never called, transport never constructed/called).
2. **CI** → `ci-disabled` **before** credential resolve / transport.
3. **malformed opt-in** (modeled as `optIn=false`) → fails closed (`not-enabled`). *(The env-flag parsing itself is the deferred script's concern; the helper's contract is the boolean.)*
4. **missing credential** → `credential-missing` **before** transport (fake resolver `missing`; transport never called).
5. **invalid credential** → `credential-invalid` **before** transport.
6. **disabled policy** → `live-policy-disabled` **before** transport (`LiveCallPolicy.disabled()`; transport never called).
7. **provider failure** → `provider-failed` (+ `providerFailureCode`); **one** call; **no retry** (fake transport returns `{ outcome: "error", … }`, asserted called once).
8. **malformed provider response** → `provider-failed`; **no raw body** in the result (fake transport returns a malformed/erroring body).
9. **validation failure** → `validation-failed`; **no** rendered message accepted (fake transport body → draft that `validateDraft` rejects).
10. **validation success** → `passed`; **no** evidence/delivery/decision/record/event created; **body not present** in the result (fake transport body → draft that `validateDraft` accepts).
11. **redacted output** — on **every** path, `JSON.stringify(result)` contains **no** raw draft/prompt/payload/response/secret/env value/rendered-message body (sentinel scan, incl. the credential token / `ref:live` not leaking a secret).
12. helper imports **no** `delivery` / `event-recording` / `application-orchestration` (import scan).
13. **no** event-bus/queue/scheduler/retry module; **no** telemetry/model-eval/DB module.
14. `package.json` / lockfile unchanged; `devDependencies == ["@types/node","typescript"]`.
15. default suite remains **`583 + new deterministic tests`** (no live call added to the suite).
16. **all Impl 001–025 tests continue to pass.**

`[FACT]` Every test achieves its guarantee **without a live call**: it verifies the guard behavior (skip / fail-closed / redaction / one-call / no-retry) deterministically against fakes and the existing fail-closed boundary — exactly as Impl 021–023 already do.

---

## 13. Persistence / Delivery / Event rules

Implementation 026 must **not**: persist rendered-message records; create render reviews; derive display eligibility for delivery; request delivery; create delivery records; record occurrence events; append event records; create evidence; create an athlete decision; mutate `athlete`/`understanding`/`decision-support`/`reasoning` state; create an event bus / scheduler / retry / queue / broker / telemetry-eval infra / production DB-schema; alter provider live-call gates, credential resolution, validation, or any rendering/delivery behavior. It composes **only** `requestRealProviderRendering` and maps the outcome.

---

## 14. Open Questions (carried forward, non-blocking)

- the **operator script / runbook** (its placement outside `src/`; how it reads `AURORA_LIVE_PROVIDER_SMOKE` / `CI`; whether a **second approved `process.env` read site** is introduced — deliberately, with its own guard — or whether the script is excluded from the `src/` guard by living in `scripts/`; how it is typechecked given `tsconfig.include = ["src"]`);
- whether the smoke result should be **printed** (JSON vs. human-readable) — output formatting is the script's concern;
- a **future CI-live lane** (separately specified);
- a **production secret manager** / production rollout / real endpoint;
- an **`application-orchestration` end-to-end live smoke** (a separate, later boundary, delivery still off);
- **delivery-provider integration**; telemetry/model evaluation; production DB/schema; UI/API;
- whether to surface **finer provider failure granularity** (timeout/malformed) by exposing `ProviderOperationalFailure` through the outcome;
- whether to ever print/persist a **validated rendered-message body** (suppressed this slice).

None resolved beyond this slice.

---

## 15. Relationship to Existing Architecture

- **Spec/Impl 025:** explicit orchestration exists — but the smoke targets the **provider/rendering seam** (`requestRealProviderRendering → validateDraft`), **not** the delivery orchestration path; it does not import `application-orchestration`.
- **Spec/Impl 024:** event factories exist — the smoke **records no event** (it is not an event/telemetry surface).
- **Spec/Impl 023:** the process-env adapter is the **only** approved direct env binding — the smoke helper reads **no** env; the real binding (deferred script) goes through `processEnvironmentCredentialSourceAdapter()`.
- **Spec/Impl 022:** the environment resolver **classifies** an injected source — the smoke consumes a `ProviderCredentialResolution`, it does not classify.
- **Spec/Impl 021:** the opt-in live boundary exists and is **disabled by default** — the smoke enables a policy **explicitly, for one call**, after its guards, and injects the transport (fake in tests).
- **Spec/Impl 020:** the selected-provider shell + serializer/parser/error-mapper exist — reused **unchanged inside `LiveProviderClient`**; the smoke reshapes nothing.
- **Spec/Impl 019:** the async `ProviderClientBoundary` exists — the smoke calls through `requestRealProviderRendering`, ending at `validateDraft`.
- **Spec/Impl 018:** the provider-attempt audit stays **raw-free** — the smoke does **not** audit (not required); if a later slice adds it, it stays raw-free.
- **Spec/Impl 017/014:** provider drafts are **untrusted**; only `validateDraft` yields a `RenderedMessage` — the smoke never bypasses the validator and never trusts a draft.
- **Spec/Impl 015:** rendered-message persistence exists — the smoke **persists nothing**.
- **Spec/Impl 016:** delivery exists — the smoke **must not deliver**.
- **Spec/Impl 011:** event/outcome records exist — the smoke is **not** an event bus / telemetry.
- **Spec/Impl 013:** a provider response is **not source material** unless separately reported by the athlete — the smoke creates no observation/evidence.

Clarifications: the smoke is an **operational wiring check** — **not** domain reasoning, **not** event recording, **not** delivery, **not** application delivery orchestration, **not** a production rollout, **not** model evaluation, **not** telemetry.

---

## 16. Implementation Task Preview

**Implementation 026 — Add opt-in live provider smoke-test boundary**

Acceptance criteria:
- a **pure, injected smoke helper** `liveProviderSmoke(command, deps)` inside **`rendering/application`** (no new module; AC20 untouched) that composes **only** `requestRealProviderRendering(...)` through an injected `LiveProviderClient` over an injected transport;
- **no default live call** (the helper's tests run with fakes; the default suite makes no network call) and **no CI live call** (CI indicator ⇒ `ci-disabled` before transport);
- **opt-in required** (absent ⇒ `not-enabled` before credential/transport); **credential required** (missing/invalid ⇒ stop before transport); **live policy required** (disabled ⇒ stop before transport);
- **rendering/provider seam only** — no delivery, no event recording, no orchestration delivery path;
- **`validateDraft` mandatory** (reached only via `requestRealProviderRendering`; a failing draft ⇒ `validation-failed`, never trusted);
- **redacted result/output** — a closed `LiveProviderSmokeResult` with **no** rendered-message body, raw draft, raw response, prompt/payload, secret, or env value; `rawRetained: false`;
- **no persistence, no delivery, no event recording, no evidence, no domain mutation**;
- **one bounded call, no retry, no scheduler**; the helper reads **no `process.env`** and contains **no** network/vendor/retry token;
- **no SDK/dependency change** (`package.json`/lockfile unchanged); **deterministic tests** (fakes/in-memory, injected opt-in/CI/resolver/policy/transport, synthetic request); **no real env, no CI credential**;
- the **operator script + real env-flag reading is deferred** (documented); and **all existing tests remain green** (`583`), plus the new smoke boundary + negative-capability tests pass.

---

## 17. Technical Constraints

TypeScript strict; Node native test runner; no external test framework; no framework; no DB; no event bus; no scheduler; no queue; no retry; no telemetry/model-eval infra; no SDK dependency; no default live network; no CI credentials; no prompt templates as production code; no raw secrets. **No constructor parameter properties** (the helper is a function over injected deps + plain value objects with explicit `readonly` fields). `import type` where appropriate. **No arbitrary payload bags; no raw-bag rehydration without validation.** Smoke-boundary tests must be **deterministic** (injected indicators + fakes/in-memory only; no `Date.now`/random unless an injected clock; no live network; no real env).

---

## 18. Success Criteria

After this tech spec, Implementation 026 can add a smoke-test boundary that verifies live-provider wiring only through **explicit opt-in** and the **existing** rendering/provider boundaries — **without** introducing default live calls, CI credentials, raw output, persistence, delivery, event recording, evidence, domain mutation, SDKs, retry, scheduler, or telemetry.

The implementation must answer:

> "Can Aurora run **one** manually-invoked, opt-in live-provider smoke test through the **existing** provider/rendering boundary while guaranteeing that **default tests and CI remain deterministic and credential-free**, **validation remains mandatory**, **outputs remain redacted**, and **no domain/delivery/event side effect occurs**?"

— and, by the pure injected helper inside `rendering/application` (Decision 1), the injected opt-in/CI/credential/policy guards that all stop **before transport** (Decisions 3–6, §4), the seam-only provider path through the unchanged `requestRealProviderRendering → validateDraft` (Decisions 7/10), the closed redacted result (Decision 9), the one-bounded-call/no-retry rule (Decision 11), the real-code constraints honored (the `process.env` one-file guard, the live-provider network guard, `tsconfig.include`, AC20 — §5), the additive guards with nothing weakened (§11), and the deterministic defining negative tests that make **no live call** (§12), the answer is **yes** — with the **operator entrypoint and real env-flag reading deferred** to a later, deliberate slice (§14).
