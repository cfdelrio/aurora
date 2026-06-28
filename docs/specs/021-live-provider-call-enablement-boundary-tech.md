# Aurora — Technical Spec 021A — Live Provider Call Enablement Implementation Plan

> Phase: **Technical Specification** (TS-strict plan, no code).
> Translates: `docs/specs/021-live-provider-call-enablement-boundary.md`.
> Status: this document fixes the **technical mechanism** for the first explicitly opt-in live provider call and the minimal TS-strict shape for Implementation 021. **No code, no SDK install, no live call, no API key, no production prompt template, no event-catalog change, and no broad guard weakening.**

---

## 0. Phase confirmation

This is the **Technical Specification** phase, not Implementation.

- `[FACT]` This document plans; it changes no file under `src/`. No dependency is installed; `package.json`/`package-lock.json` are untouched by 021A.
- `[DECISION]` 021A picks the transport mechanism (HTTP vs SDK), the opt-in/credential/env boundaries, the file layout, the **narrow** guard exception, and the test strategy — and stops there.

---

## 1. Context recap

Spec 021 (`021-live-provider-call-enablement-boundary.md`) is complete. Aurora (post Impl 020) has the entire provider edge built and fake/deterministic: the rendering boundary + mandatory `validateDraft` (014); rendered-message record/review + display eligibility (015); the `delivery` boundary + test sink (016); the provider seam + `FakeProviderAdapter` (017); the raw-free provider-attempt audit (018); the real-provider-ready async `ProviderClientBoundary` + `FakeProviderClient`, operational `ProviderSecretRef`, structured `ProviderInstruction`, `ProviderOperationalFailure → toProviderFailure` (019); and the selected-provider **shell** — `ConcreteProviderClient` (disabled by default) + `serializeProviderInstruction` / `parseProviderResponse` / `mapProviderError`, OpenAI chosen doc-level (020A), code vendor-neutral (020).

What does **not** exist: a real SDK, network calls, **live calls**, API keys / a real secret mechanism, `process.env` reads, production prompt templates, provider events, UI/API, scheduler/event bus, production DB.

Spec 021's boundary: a live call is **operational I/O** that does not change the authority model — the provider stays a draft source behind `ProviderClientBoundary`; `validateDraft` stays mandatory; audit stays raw-free; **live calls disabled by default**; default tests/CI make no live call.

---

## 2. Central Question

> How can Aurora enable an explicitly opt-in live provider call through **one isolated transport boundary** without installing an SDK, requiring credentials in CI, running live calls by default, weakening domain boundaries, bypassing `validateDraft`, retaining raw drafts/prompts/secrets/payloads, or creating persistence/review/delivery/event side effects?

Answer shape (proven below): add a **`LiveProviderClient`** implementing the existing async `ProviderClientBoundary`, composing a **fail-closed `LiveCallPolicy`** + an injected **`ProviderCredentialResolver`** + the **unchanged** `serializeProviderInstruction` + a single **`LiveProviderHttpTransport`** (the only file permitted a `fetch(` token) + the **unchanged** `parseProviderResponse`/`mapProviderError`. It terminates at the **unchanged** `requestRealProviderRendering → validateDraft`, maps every failure onto the **unchanged** `ProviderOperationalFailure → ProviderFailure`, retains no raw draft/prompt/secret, and adds **no SDK dependency, no `process.env`, no default live call, and no domain side effect**.

---

## 3. Required Technical Decisions

### `[DECISION]` Decision 1 — SDK vs HTTP → **native HTTP `fetch`, no SDK**

Use Node's **native `fetch`** for Implementation 021. **Do not install an SDK; do not add any runtime dependency.**

Rationale: the first live-call slice should minimize dependency/lockfile risk; native `fetch` behavior is isolatable and fake-testable; an SDK abstraction can be evaluated later; the live call stays operational I/O behind `ProviderClientBoundary`.

Feasibility (verified — §5.18–5.20): `tsconfig` is `target: ES2022`, `lib: ["ES2022"]`, `types: ["node"]` with **`@types/node ^22`** (and `undici-types` present), so the **global `fetch`/`Request`/`Response`/`Headers`/`AbortSignal` types resolve from `@types/node` without adding `"DOM"` to `lib`**; **Node 22.22** has native `fetch` and **`AbortSignal.timeout(ms)`** at runtime. **No TS lib change, no `node:https`, no dependency** is required.

Consequence: exactly **one** narrowly approved file (`live-provider-http-transport.ts`) may contain a `fetch(` token; the network-token guard gets a **single-file** exception (§9); **no `package.json`/lockfile change**.

> `[DECISION]` If a later slice chooses an SDK, it must justify the added package + lockfile + guard + dependency risk explicitly. 021A does **not** authorize that.

### `[DECISION]` Decision 2 — Transport boundary location

```text
src/modules/rendering/application/live-provider-http-transport.ts
```
This is the **only** file allowed to perform native HTTP. No other production file may contain a network-call token. No domain file may import it; no `delivery`/`event-recording`/`reasoning`/`understanding`/`observation`/`athlete` module may import it.

### `[DECISION]` Decision 3 — Live-capable client location

```text
src/modules/rendering/application/live-provider-client.ts
```
`LiveProviderClient` implements the existing **async `ProviderClientBoundary`**. It composes: the `LiveCallPolicy`, the `ProviderCredentialResolver`, the **unchanged** `serializeProviderInstruction`, the `LiveProviderHttpTransport`, and the **unchanged** `parseProviderResponse` + `mapProviderError`.

> `[GAP] LiveProviderClient is a sibling of ConcreteProviderClient, not a reuse of it.` Impl 020's `ConcreteProviderClient` takes a **synchronous** fixture transport (`payload → ConcreteProviderFixture`); a live call is **async network I/O**. So `LiveProviderClient` is its own `ProviderClientBoundary` implementation with an **async** transport, **reusing the same pure `serializeProviderInstruction`/`parseProviderResponse`/`mapProviderError`** functions — no duplication of serialization/parsing/mapping logic, and the sync shell stays untouched.

### `[DECISION]` Decision 4 — Live-call opt-in → **injected value object, no global state**

A `LiveCallPolicy` value object is **injected** into `LiveProviderClient` (not read from a global, not inferred from the environment inside application logic). Required behavior: **disabled by default** (a default factory returns `enabled: false`); **explicit opt-in required** (`enabled: true` must be set deliberately by the composer); disabled in CI/local default tests; **policy disabled → no live call → safe `provider-unavailable`**; **safe-disable changes no domain behavior** (outcome shape and invariants are identical whether enabled or not).

### `[DECISION]` Decision 5 — Credential boundary → **injected resolver port; env deferred**

```text
src/modules/rendering/application/provider-credential-resolver.ts          # the port
src/modules/rendering/application/static-provider-credential-resolver.ts   # deterministic, test/composition only
```
Rules: no credential resolver in `domain`; the resolver returns a **resolution state** (presence/absence/invalid), never stores a raw credential into domain state; no raw credential appears in audit/records/errors/logs/tests; a missing credential maps to safe failure; the static resolver is for tests/composition only.

> `[DECISION]` **No environment resolver in Implementation 021.** The credential is supplied via the injected `StaticProviderCredentialResolver` in composition/tests. A real env/secret-manager resolver is **deferred** (its own infra decision). This keeps CI/default tests credential-free and avoids widening the `process.env` guard.

### `[DECISION]` Decision 6 — Environment access → **none in Impl 021**

**No `process.env` reads in Implementation 021.** Rationale: the credential arrives via the injected resolver in composition tests; this avoids widening the env guard; a production secret mechanism deserves its own infra decision; CI/default tests stay credential-free. The `process.env` token therefore stays **forbidden in every file** (no env exception is opened this slice).

### `[DECISION]` Decision 7 — Default tests + optional smoke tests

The default suite must **never** make a live call; CI must **not** require credentials. **Implementation 021 ships no live smoke test.** If a smoke test is ever added (later), it is a **separate script** (`scripts/live-provider-smoke-test.ts`), **opt-in only**, **excluded from the `node --test "src/**/*.test.ts"` default glob**, requires an explicit credential + live flag, and asserts only boundary/failure behavior — never content quality. 021A does **not** add it.

### `[DECISION]` Decision 8 — Timeout / abort behavior

A `timeoutMs` is carried on the `LiveCallPolicy` (config-injected). The transport uses **`AbortSignal.timeout(timeoutMs)`** (Node 22 native). A timeout maps to the existing operational failure **`provider-timeout`** → `provider-timeout`. A timeout **triggers no automatic retry**, **mutates no domain**, and **leaks no payload/secret** in its error.

### `[DECISION]` Decision 9 — Failure mapping → existing surfaces, no expansion

Do **not** expand `ProviderOperationalFailure` or `ProviderFailure`. Expected mapping (all into existing members; the transport produces a neutral result the client/`mapProviderError` translate):

| live condition | `ProviderOperationalFailure` | → `ProviderFailure` |
|---|---|---|
| live disabled / no opt-in | `provider-unavailable` | `provider-unavailable` |
| missing credential | `missing-credential` | `provider-unavailable` |
| invalid credential | `invalid-credential` | `provider-unavailable` |
| network unavailable | `provider-unavailable` | `provider-unavailable` |
| timeout | `provider-timeout` | `provider-timeout` |
| rate limit (HTTP 429) | `provider-rate-limited` | `provider-rate-limited` |
| provider refusal | `provider-refused` | `provider-refused` |
| empty response | `provider-returned-empty-response` | `provider-returned-empty-draft` |
| malformed response | `provider-returned-malformed-response` | `provider-returned-invalid-draft` |
| unsupported config | `unsupported-provider-config` | `provider-unavailable` |
| unknown / unclassified | `provider-unavailable` (safe default) | `provider-unavailable` |

### `[DECISION]` Decision 10 — Validator + audit unchanged

`LiveProviderClient.requestDraft` returns a `ProviderClientResponse`; `requestRealProviderRendering(...)` (via `realProviderAdapter`) still owns conversion + the mandatory `validateDraft`; the provider-attempt audit stays **explicit composition** and **raw-free**; **no automatic persistence**.

---

## 4. Live Call Flow

```text
requestRealProviderRendering(input)            // UNCHANGED service (Impl 019)
  → providerRenderingRequestFrom(request)      // UNCHANGED guard (rejects unsafe before any client call)
  → credential fast-path on input.secret       // UNCHANGED (non-present ProviderSecretRef → safe failure)
  → realProviderAdapter(client, config, secret).draft(...)   // UNCHANGED adapter
     → client.requestDraft(ProviderClientRequest)            // client = LiveProviderClient
        → LiveCallPolicy check         // disabled → return failed(provider-unavailable); NO transport
        → ProviderCredentialResolver   // missing/invalid → return failed(missing-/invalid-credential); NO transport
        → serializeProviderInstruction(instruction)          // UNCHANGED pure serializer (safe payload only)
        → LiveProviderHttpTransport.send(payload, credential, policy)  // the ONLY network file
        → parseProviderResponse(body, providerKind) | mapProviderError(error)  // UNCHANGED pure fns
        → ProviderClientResponse  (draft | failed)
  → ProviderDraftOutcome                         // untrusted draft
  → validateDraft({ draft, renderable, request })   // UNCHANGED mandatory gate
  → ProviderRenderOutcome
  → optional auditProviderAttempt(...)          // UNCHANGED, raw-free, explicit composition
```

Rules: (1) policy disabled → **no transport call**; (2) credential missing → **no transport call**; (3) payload construction is safe (serializer carries only approved fields); (4) transport success still yields an **untrusted draft**; (5) transport failure maps to existing failures; (6) **no retry**; (7) **no persistence**; (8) **no review/display/delivery/event**; (9) **no domain mutation**; (10) audit is explicit + raw-free if composed.

---

## 5. Surface Gap Analysis (from real code)

Reuse these verbatim; do not invent incompatible names.

1. **`ProviderClientBoundary`** (`application/provider-client-boundary.ts`): `{ readonly kind: string; requestDraft(input: ProviderClientRequest): Promise<ProviderClientResponse> }`. `LiveProviderClient` implements exactly this.
2. **`ConcreteProviderClient`** (`application/concrete-provider-client.ts`): class implementing `ProviderClientBoundary`; constructor `{ kind?, transport? }` where `transport` is a **sync** `(payload) => ConcreteProviderFixture`; disabled-by-default → `provider-unavailable`; credential fast-path inside. **Not reused** for live (sync transport) — see §3 Decision 3 `[GAP]`.
3. **`serializeProviderInstruction(instruction: ProviderInstruction): ConcreteProviderRequestPayload`** (`concrete-provider-prompt-serializer.ts`): pure, frozen; only safe fields (terminalOutputKind, voice?, style?, locale?, maxLength?, allowedClaims, forbiddenClaims, uncertaintyVisibleRequired, limitationsVisible, traceabilitySummary?, traceabilityStatus?). **Reused unchanged** by the live client.
4. **`parseProviderResponse(raw: unknown, providerKind: string): ProviderClientResponse`** (`concrete-provider-response-parser.ts`): malformed → `provider-returned-malformed-response`; empty → `provider-returned-empty-response`; success → `{status:"draft", text, metadata?}`; retains no raw payload. **Reused unchanged.**
5. **`mapProviderError(error: unknown): ProviderOperationalFailure`** (`concrete-provider-error-mapper.ts`): neutral `ConcreteProviderErrorKind` discriminant → operational failure; unknown → `provider-unavailable`; no payload/secret copied. **Reused unchanged** (the transport emits a neutral error shape it understands).
6. **`ProviderOperationalFailure`** (`domain/provider-operational-failure.ts`): `missing-credential` · `invalid-credential` · `provider-unavailable` · `provider-timeout` · `provider-rate-limited` · `provider-refused` · `provider-returned-empty-response` · `provider-returned-malformed-response` · `unsupported-provider-config` · `unsafe-provider-request`. **Not expanded.**
7. **`toProviderFailure(op): ProviderFailure`** (same file): maps down per §3 Decision 9. **Not expanded** (`PROVIDER_FAILURES.length === 10`).
8. **`ProviderClientRequest`/`ProviderClientResponse`/`ProviderClientMetadata`** (`domain/provider-client-response.ts`): request = `{sourceCaseRef, instruction, config, secret}`; response = `{status:"draft", text, metadata?} | {status:"failed", failure: ProviderOperationalFailure, metadata?}`; metadata = `{providerKind, latencyMs?, tokenCount?, finishReason?}` (operational only).
9. **`ProviderSecretRef`** (`domain/provider-secret-ref.ts`): `{status: "present"|"missing"|"invalid"; ref?: string}` — opaque ref, never a raw key. The operational reference that crosses into rendering; the **raw** credential the transport uses comes from the `ProviderCredentialResolver`, never from here and never persisted.
10. **`ProviderInstruction`** (`domain/provider-instruction.ts`): structured/derived; no arbitrary-prompt/chain-of-thought/voice-override/secret field. Sole input to the serializer.
11. **`RealProviderAdapter` / `realProviderAdapter(client, config, secret)`** (`application/real-provider-adapter.ts`): async `draft(request): Promise<ProviderDraftOutcome>`; builds `ProviderClientRequest`, calls `client.requestDraft`, maps failed via `toProviderFailure`; never calls `validateDraft`. **Reused unchanged** — the live client plugs in as `client`.
12. **`requestRealProviderRendering(input)`** (`application/real-provider-rendering-service.ts`): guard → credential fast-path → `realProviderAdapter(...).draft` → `validateDraft` → `ProviderRenderOutcome`; persists/reviews/delivers/mutates nothing. **Reused unchanged.**
13. **`validateDraft({draft, renderable, request}): RenderOutcome`** (`domain/rendering-validator.ts`): unchanged, mandatory, structural/string checks.
14. **`auditProviderAttempt(input): ProviderAttemptRecord`** (`application/provider-attempt-audit-service.ts`): pure, observe-only mapping of a `ProviderRenderOutcome`; raw-free. **Reused unchanged** (explicit composition).
15. **No-raw-draft-retention** (`domain/provider-draft-summary.ts`): `rawDraftRetained` literal `false`; no content fields. Holds for live attempts too.
16. **Package state**: `package.json` devDeps only `@types/node ^22.20.0` + `typescript ^5.9.3`; no runtime deps; lockfile present; `node_modules` has `typescript`, `@types/node`, `undici-types`. **No HTTP/SDK dependency — and none added.**
17. **Structural guard tokens + selectors** (verified):
    - `provider-negative-capability.test.ts` (Impl 017): scans `providerFiles()` = production files matching **`/provider-/`**; forbidden content regex **`/\b(openai|anthropic|axios|node:https|node:http)\b|fetch\s*\(|https?:\/\/|process\.env/i`**.
    - `real-provider-negative-capability.test.ts` (Impl 019): scans `realProviderFiles()` = files matching **`(real-provider|provider-client|provider-instruction|provider-secret-ref|provider-operational-failure)`**; same forbidden regex (+ `process.env`).
    - `concrete-provider-negative-capability.test.ts` (Impl 020): scans `concreteFiles()` = files matching **`/concrete-provider/`**; `sdkNetEnv` regex (same) + `schedRetry`.
    - All three exclude `.test.ts` and `/tests/`.
18. `[FACT]` **Single-file native-HTTP exception is feasible.** `live-provider-http-transport.ts` contains `provider-` → matched **only** by `providerFiles()` (Impl 017 guard); it does **not** match `realProviderFiles()` (no `provider-client`/`real-provider`/… token) nor `concreteFiles()`. So the network-token exception is needed in **exactly one** guard, for **exactly one** file (§9). `live-provider-client.ts` contains `provider-client` → matched by **both** Impl 017 + Impl 019 guards, but it makes **no** `fetch(` call (it composes the transport), so it needs **no** exception and stays token-clean.
19. `[FACT]` **`fetch` is available under the TS target.** `lib: ["ES2022"]` lacks DOM, but `types: ["node"]` (`@types/node ^22`, `undici-types` present) provides global `fetch`/`Request`/`Response`/`Headers`/`AbortController`/`AbortSignal`. No `"DOM"` lib entry is needed.
20. `[FACT]` **`node:https` is not needed** (so no `node:http(s)` guard exception is needed); native `fetch` covers the call. Using `node:https` would *also* require a guard exception and more code — rejected.
21. `[FACT]` **Tests can fake the transport without network.** The transport is an injected dependency of `LiveProviderClient` (an interface), so tests supply a deterministic fake transport — proving policy/credential/parse/error behavior with **zero** real network and **zero** credentials. Only the real `live-provider-http-transport.ts` touches `fetch`, and it is never invoked by the default suite.

> `[GAP]` None of the existing names conflict. The only structural change Impl 021 needs is the **one-file network-token exception** in the Impl 017 guard (§9) — everything else is additive and reuses unchanged surfaces.

---

## 6. Proposed File Layout

Production (all inside `rendering/application`):
```text
src/modules/rendering/application/live-call-policy.ts                      # LiveCallPolicy (default = disabled)
src/modules/rendering/application/provider-credential-resolver.ts         # ProviderCredentialResolver port + resolution type
src/modules/rendering/application/static-provider-credential-resolver.ts  # deterministic resolver (tests/composition only)
src/modules/rendering/application/live-provider-http-transport.ts         # the ONLY native-HTTP file (fetch); transport port + real impl
src/modules/rendering/application/live-provider-client.ts                 # LiveProviderClient implements ProviderClientBoundary
```
Tests:
```text
src/modules/rendering/tests/live-provider-call-gate.test.ts
src/modules/rendering/tests/live-provider-failure-mapping.test.ts
src/modules/rendering/tests/live-provider-negative-capability.test.ts
```
Additive index updates if needed: `src/modules/rendering/application/index.ts` (and `rendering/index.ts` via `export *`).

**Do not** add: `scripts/live-provider-smoke-test.ts` (deferred); a package dependency; an env resolver; prompt-template files; any `src/{providers,prompts,api,ui,infrastructure}` or `src/modules/{provider,llm,openai,anthropic,model,telemetry,evaluation}`.

---

## 7. Types / Surfaces To Plan

All TS-strict, `readonly` fields, explicit declarations, **no constructor parameter properties**, `import type` where applicable, no arbitrary bags, no raw-bag rehydration without validation.

### `LiveCallPolicy`
```text
interface LiveCallPolicy { readonly enabled: boolean; readonly timeoutMs: number; readonly source?: string }
```
- A default factory returns `{ enabled: false, timeoutMs: <sane default> }`. `enabled: true` must be set deliberately by the composer. Never inferred from the environment in application logic. `source` is an optional descriptive label (never a secret).

### `ProviderCredentialResolver` (port) + `ProviderCredentialResolution`
```text
type ProviderCredentialResolution =
  | { readonly status: "available"; /* opaque handle the transport may use transiently; never persisted/audited */ }
  | { readonly status: "missing" }
  | { readonly status: "invalid" };
interface ProviderCredentialResolver { resolve(): ProviderCredentialResolution }
```
- The raw credential is **not** exposed to audit/state/errors; it may be held **transiently** only inside the transport call boundary. `StaticProviderCredentialResolver` is deterministic for tests/composition (configurable to return available/missing/invalid). Tests use **no real credentials**.

### `LiveProviderHttpTransport` (port + real impl) — the only network file
```text
interface LiveProviderTransport {
  send(payload: ConcreteProviderRequestPayload, credential: <opaque>, policy: LiveCallPolicy): Promise<LiveProviderTransportResult>
}
```
Rules: only approved network file; maps HTTP status / transport errors to a **safe neutral result**; does **not** parse into domain types directly (it returns a neutral body/error the client hands to `parseProviderResponse`/`mapProviderError`); does **not** call `validateDraft`; does **not** persist; does **not** log secrets; does **not** retry. Uses `fetch` + `AbortSignal.timeout(policy.timeoutMs)`.

### `LiveProviderTransportResult` (closed)
```text
type LiveProviderTransportResult =
  | { readonly outcome: "response"; readonly body: unknown }                    // provider-shaped body for parseProviderResponse
  | { readonly outcome: "error"; readonly error: ConcreteProviderErrorShape };  // neutral kind for mapProviderError
```
- Must contain **no** raw secret; must **not** be persisted. HTTP 429 → `{kind:"rate-limit"}`, timeout/abort → `{kind:"timeout"}`, network failure → `{kind:"network-unavailable"}`, auth rejection → `{kind:"invalid-credential"}`, 5xx/unknown → `{kind:"unknown"}` (→ safe `provider-unavailable`).

### `LiveProviderClient` — implements `ProviderClientBoundary`
```text
class LiveProviderClient implements ProviderClientBoundary {
  readonly kind: string;          // neutral, e.g. "live" (NEVER a vendor token)
  // injected: LiveCallPolicy, ProviderCredentialResolver, LiveProviderTransport
  requestDraft(input): Promise<ProviderClientResponse>  // flow per §4; fail-closed before transport
}
```
- Private constructor + explicit field declarations + a factory (mirroring `realProviderAdapter`/`ConcreteProviderClient` style). Fails closed (returns `failed(...)`) **before** the transport when policy is disabled or the credential is missing/invalid.

> `[FACT]` `kind` and every identifier stay **vendor-neutral** (`"live"`, not `"openai"`) — the vendor remains doc-level (020A); no guard is touched on that account.

---

## 8. Structural Guard Strategy (the one narrow change)

`[DECISION]` Implementation 021 opens **exactly one** narrow exception: the native-HTTP token (`fetch(` / `https?://`) is allowed in **`live-provider-http-transport.ts` only**. Everything else stays forbidden, everywhere, including in that file.

Mechanics (in `provider-negative-capability.test.ts` — the only guard whose selector matches the transport file, §5.18):
- Split the current single forbidden regex into **(a) a network regex** `/(\bnode:https?\b|fetch\s*\(|https?:\/\/)/i` and **(b) a non-network regex** `/\b(openai|anthropic|axios)\b|process\.env/i`.
- Apply **(b) to every `providerFiles()` entry, with no exception** (vendor/SDK/env stay forbidden everywhere, including the transport file).
- Apply **(a) to every entry except the single approved path** `live-provider-http-transport.ts`.
- Add a **positive assertion**: the approved transport file is the **only** production file under `rendering` permitted a network token, and it contains **no** `process.env` / `openai` / `anthropic` / `axios` token.

Constraints on the exception:
- It is **single-file and network-token-only**. No env exception (Decision 6). No vendor-token exception (vendor stays doc-level). No SDK exception (no dependency).
- The Impl 019/020 guards (`real-provider-negative-capability`, `concrete-provider-negative-capability`) are **untouched** — their selectors don't match the transport file, and no `concrete-provider-*`/`real-provider`/`provider-client` file gains a network token.
- The new `live-provider-negative-capability.test.ts` re-asserts the whole posture (one network file; no env/vendor/SDK anywhere; import boundaries; no package dependency).

`[DECISION]` If a guard fails during implementation, **first assume a leaked token/behavior**, not a stale guard. The guard is modified **only** for the narrow, documented network-token exception above; any broader change is out of scope for Impl 021.

---

## 9. Test Strategy

Default suite: **no live call, no credential, fake transport only, deterministic.** The real transport (`fetch`) is never invoked by `node --test "src/**/*.test.ts"`.
- **Gate tests** (`live-provider-call-gate.test.ts`): policy disabled → transport **never invoked** (a throwing/spy fake transport proves it) → safe `provider-unavailable`; missing credential → transport **never invoked** → `missing-credential`; invalid credential → safe failure; valid credential + enabled + fake "response" → untrusted draft → through `requestRealProviderRendering` → `validateDraft` renders; unsafe drafts (voice-escalating/invented-fact/hidden-uncertainty fixtures) → `provider-output-failed-validation`, no raw draft retained.
- **Failure-mapping tests** (`live-provider-failure-mapping.test.ts`): timeout/rate-limit/network-unavailable/refusal/empty/malformed/unknown transport results → the §3 Decision 9 mappings; no secret in any failure; metadata operational only.
- **Negative-capability tests** (`live-provider-negative-capability.test.ts`): one network file only; no `process.env`/vendor/SDK token anywhere; live-provider files import only own `rendering` surfaces + read-only `decision-support` *types*, never upstream/`delivery`/`event-recording`; no module outside `rendering` imports them; **package dependency unchanged** (no runtime dep; devDeps remain `typescript` + `@types/node`); raw-free audit when composed; no record/review/display/delivery/event side effect; no domain mutation.

A fake `LiveProviderTransport` (deterministic) is the test seam; no external network, no API key, no smoke test in the default suite.

---

## 10. Persistence / Review / Delivery / Event rules

Implementation 021 must **not**: create/save a `RenderedMessageRecord`; append a review; mark display-eligible; call delivery; create a `DeliveryRecord`; append event records; expand the event catalog; create provider-attempt event records; trigger retry/scheduler; persist provider attempts automatically; persist a raw provider response; persist a prompt payload; persist secrets. The live path ends at the returned `ProviderRenderOutcome`; any audit is explicit and raw-free.

---

## 11. Negative Capability (structurally impossible / test-failing)

Live calls enabled by default; default tests make network calls; CI requires credentials; a raw credential in audit/state/errors/tests; `process.env` anywhere (deferred); a network token outside the single approved transport file; an SDK dependency; a vendor token in a guarded provider file; prompt-template files; an arbitrary prompt / chain-of-thought / hidden reasoning reaching the payload; provider output bypassing `validateDraft`; provider output creating `RenderedMessage`/`RenderedMessageRecord`/review/display/delivery directly; provider metadata becoming Evidence/Observation/Understanding/AthleteDecision/SupportQuality; provider success validating recommendation quality; provider failure invalidating domain output; automatic retry/scheduler/event bus; live-provider files importing `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`; domain mutation; raw provider response/draft/prompt/secret retained in audit or persistence.

---

## 12. Validation Strategy (tests before implementation; negatives defining)

1. live calls disabled by default; 2. disabled policy prevents transport invocation; 3. missing credential prevents transport invocation; 4. missing credential → safe failure; 5. invalid credential → safe failure; 6. timeout → safe failure; 7. rate-limit → safe failure; 8. network unavailable → safe failure; 9. malformed response → safe failure; 10. empty response → safe failure; 11. a successful transport response still passes only through the validator; 12. a provider draft cannot bypass validation; 13. voice escalation rejected; 14. invented fact rejected; 15. hidden uncertainty rejected; 16. payload injection rejected/excluded **before** transport; 17. provider metadata remains operational, not evidence; 18. provider-attempt audit retains no raw draft/prompt/payload/secret when composed; 19. provider success creates no record/review/display/delivery/event automatically; 20. provider failure does not mutate the domain; 21. no automatic retry/scheduler/event bus; 22. secrets not persisted/logged/exposed in errors; 23. boundary/import tests; 24. **package dependency unchanged** (HTTP native chosen); 25. **all existing Impl 001–020 tests continue to pass** (≈493).

The negative tests are defining tests.

---

## 13. Boundary Rules

Live-provider files **may** import: their own `rendering` domain/application types; `shared-kernel` if needed; read-only (`import type`) `decision-support` types already permitted to `rendering`. They **must not** import `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`. No upstream module imports them. No `src/modules/{provider,llm,anthropic,model,telemetry,evaluation}`; no `src/{api,ui,infrastructure,providers,prompts}`. **No SDK dependency; no prompt-template files; no raw secrets.** A network token is allowed **only** in `live-provider-http-transport.ts`; an env token is allowed **nowhere** (env deferred). Do not weaken guards broadly — the only change is the single-file network-token exception (§8).

---

## 14. Relationship to Existing Architecture

- **Spec/Impl 020:** the selected-provider **shell** exists and live calls are disabled; 021 adds the *opt-in ability* to go live behind the same shell + boundary, reusing the serializer/parser/error-mapper unchanged.
- **Spec/Impl 019:** the async `ProviderClientBoundary` exists; `LiveProviderClient` is another implementation; the sync seam stays untouched.
- **Spec/Impl 018:** provider attempts audited **raw-free**; live attempts audit the same way, by explicit composition.
- **Spec/Impl 017:** the provider seam exists; provider drafts are **untrusted**; a live draft is equally untrusted.
- **Spec/Impl 014:** only validated drafts become a `RenderedMessage`.
- **Spec/Impl 015:** only validated `RenderedMessage`s may become records — a live call creates none.
- **Spec/Impl 016:** delivery only consumes display-eligible records; **provider success does not deliver**.
- **Spec/Impl 011:** event records are occurrence history; a live call appends none.
- **Spec/Impl 013:** a provider response is **not source material** unless separately reported by the athlete.

Clarifications: the live provider client **remains behind `rendering`**; provider output is **draft text only**; `validateDraft` is **mandatory**; the audit stays **raw-free**; metadata stays **operational**; live provider integration is **not** delivery, **not** eventing, **not** model evaluation, **not** domain reasoning.

---

## 15. Open Questions (carried forward, non-blocking)

Exact production secret-management mechanism; exact env-variable naming (if an env resolver is later added); whether an SDK becomes worthwhile later; timeout limits; retry policy; rate-limit behavior; streaming support; provider-metadata retention; cost/billing limits; prompt-material storage; localization quality; model evaluation; production telemetry; provider event records; whether live-call smoke tests exist outside the default suite. None resolved beyond this slice.

---

## 16. Implementation Task Preview

**Implementation 021 — Add opt-in live-provider client boundary with fail-closed policy and no default live calls**

Acceptance criteria:
- the live-provider client (`LiveProviderClient`) lives **inside `rendering/application`** and implements the existing async `ProviderClientBoundary`;
- **live calls disabled by default** (injected `LiveCallPolicy`; default factory disabled; fail-closed before transport);
- **native HTTP `fetch`** transport in the single approved file `live-provider-http-transport.ts`; **no SDK / no package dependency** (`package.json`/lockfile unchanged);
- **no CI credentials**; **no default live tests** (fake transport only; deterministic);
- **no `process.env` reads** anywhere (env resolver deferred; credential via injected `StaticProviderCredentialResolver`);
- **no raw secrets** in audit/state/errors/tests; secret refs stay operational;
- the **network guard exception is narrow** — one file, network-token only; env/vendor/SDK stay forbidden everywhere;
- `validateDraft` remains **mandatory** (via the unchanged `requestRealProviderRendering`); reuses the unchanged serializer/parser/error-mapper;
- the provider-attempt audit remains **raw-free** when composed;
- **no automatic persistence/review/display/delivery/event side effects**, no retry/scheduler, no domain mutation;
- failure mapping uses the existing `ProviderOperationalFailure → ProviderFailure` (no expansion);
- all existing tests remain green (≈493), and the new live-provider gate / failure-mapping / negative-capability tests pass.

---

## 17. Technical Constraints

TypeScript strict; Node native test runner (`node --test`); no external test framework; no framework; no DB; no event bus; no automatic retry/scheduler; **no SDK dependency**; **no default live network**; **no CI credentials**; no prompt templates as production code; no raw secrets. No constructor parameter properties (private ctor + explicit field declarations, or frozen factory). `import type` where appropriate. Explicit field declarations. No arbitrary payload bags; no raw-bag rehydration without validation. Live-provider tests must be deterministic (fake transport; no real network).

---

## 18. Success Criteria

After this tech spec, Implementation can build an explicitly opt-in live provider call boundary **without** requiring credentials in CI, enabling live calls by default, bypassing validation, retaining raw prompts/responses/secrets, weakening domain boundaries broadly, or creating persistence/review/delivery/event side effects.

The implementation must answer:

> "Can Aurora allow a live provider call only when explicitly enabled, while keeping the provider a draft source, the validator mandatory, audit raw-free, tests deterministic, and all domain boundaries intact?"

— and, by the plan above (native `fetch` in one approved file, fail-closed injected policy, injected credential resolver with env deferred, the single narrow network-token guard exception, the unchanged validator/audit, and the defining negative tests), the answer is **yes**.
