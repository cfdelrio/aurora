# Aurora — Technical Spec 020A — Provider Selection and Concrete Adapter Implementation Plan

> Phase: **Technical Specification** (TS-strict plan, no code).
> Translates: `docs/specs/020-real-provider-adapter-implementation-boundary.md`.
> Status: this document records an explicit **provider-selection decision** and the concrete-adapter implementation plan behind the existing async `ProviderClientBoundary`. **No code, no SDK install, no network, no API keys, no `process.env` reads, no production prompt templates, no event-catalog expansion.**

---

## 0. Phase confirmation

This is the **Technical Specification** phase, not Implementation.

- `[FACT]` This document plans; it does not implement. No file under `src/` is created or changed by 020A.
- `[FACT]` No dependency is installed and no entry is added to `package.json` / `package-lock.json` by 020A.
- `[DECISION]` 020A records the provider-selection decision (Spec 020's gate) **and** the minimal TS-strict shape for Implementation 020 — and stops there.

---

## 1. Context recap

Spec 020 (`020-real-provider-adapter-implementation-boundary.md`) is complete and introduced the provider-selection gate:

```text
No concrete provider is selected yet.
Implementation 020 may only add a concrete provider adapter after 020A records an explicit provider-selection decision.
```

Aurora today (post Impl 019) has eight implemented modules — `observation`, `reasoning`, `understanding`, `decision-support`, `athlete`, `event-recording`, `rendering`, `delivery` — a deterministic rendering boundary, a mandatory `validateDraft(...)`, rendered-message record/review persistence, derived display eligibility, a downstream delivery boundary with a deterministic test sink + audit records, a provider adapter seam inside `rendering` with a deterministic `FakeProviderAdapter`, a raw-free provider-attempt audit (port + in-memory adapter), and a real-provider-**ready** async client boundary (`ProviderClientBoundary`) with a deterministic `FakeProviderClient`, operational secret refs, structured provider instructions, operational-failure mapping into the existing `ProviderFailure`, and async `requestRealProviderRendering(...)`. The synchronous provider seam is untouched.

What does **not** exist (verified in §5): no concrete provider selected in repo, no real provider SDK, no network calls, no API keys / real secret mechanism, no production prompt templates, no provider event records, no UI/API, no scheduler/event bus, no production DB.

---

## 2. Central Question

> How can Aurora **select and plan** the first concrete provider adapter behind `ProviderClientBoundary` without allowing vendor SDKs, network calls, credentials, prompt serialization, provider responses, metadata, retries, or errors to become **authority, evidence, persistence, review, delivery, events, or domain mutation**?

Answer shape (proven below): keep the concrete adapter a **disabled-by-default shell** that implements the existing async `ProviderClientBoundary`, drives a deterministic **serializer / parser / error-mapper** over local fixtures, terminates at the **unchanged** `validateDraft`, maps every failure DOWN into the **unchanged** `ProviderOperationalFailure → ProviderFailure`, retains no raw draft/prompt/secret/payload, and adds **no** live call, **no** credential requirement, and **no** persistence/review/delivery/event side effect.

---

## 3. Required Provider-Selection Decision

### `[DECISION]` First concrete provider

| Field | Value |
|---|---|
| **Selected provider** | **OpenAI** — selected as the *target vendor* for the first concrete adapter. |
| **Why this provider first** | It is the ecosystem most aligned with this project's AI-tooling context; it can be fully isolated behind the existing `ProviderClientBoundary`; the selection is reversible because vendor behavior stays behind that port; no domain module learns the vendor; live calls remain disabled by default; deterministic tests use fakes/fixtures, never real calls. |
| **Integration mechanism (Impl 020)** | **Explicit defer.** No installed SDK and no real network call yet. Implementation 020 adds a **disabled-by-default concrete adapter skeleton** plus provider-shaped **serializer / parser / error-mapper** exercised by deterministic local fixtures. The first live-call implementation is a **later slice**, not 020. |
| **Package / dependency impact** | **None in Impl 020.** No SDK, no HTTP library, no `package.json` / `package-lock.json` change. (Current deps: only `typescript` + `@types/node`; see §5.14.) |
| **Secret mechanism** | **None real in Impl 020.** Keep `ProviderSecretRef` (status + opaque ref). Model `present` / `missing` / `invalid` via deterministic test doubles. Defer any real env / secret-manager reader to a later infra slice. |
| **Live-call policy** | **Live calls not implemented.** Disabled by default, opt-in only if a future slice authorizes it, never in the default test suite, no credentials required in CI or locally. |
| **Deterministic test strategy** | Provider-shaped request/response/error **fixtures** drive serializer/parser/error-mapper and the concrete client shell. No network, no credentials, no `Math.random`/`Date.now`. |
| **Safe-disable strategy** | The concrete client's default state returns a safe operational failure (`provider-unavailable`) without attempting any I/O; live behavior cannot turn on implicitly. |
| **Failure-mapping strategy** | Provider-shaped errors → existing `ProviderOperationalFailure` → existing `toProviderFailure(...)` → existing `ProviderFailure`. **No catalog expansion** (see §10). |
| **Rollback strategy** | All concrete-provider code is additive, vendor-neutral in name (§6 Decision 1), and isolated under `rendering/application`. Reverting = deleting those files + their tests; nothing upstream imports them, and the existing sync seam, async boundary, validator, and audit are untouched. |
| **What remains forbidden** | Vendor SDK, network, real credentials/`process.env`, arbitrary prompt text, chain-of-thought, prompt-template files, provider/llm/openai modules, automatic persistence/review/display/delivery/events, retries/scheduler, raw draft/prompt/secret/payload retention, any provider value becoming domain authority/evidence. |

> `[DECISION]` OpenAI is the **named target**, but Implementation 020 introduces **no SDK / network / live-call / credential** code. The vendor is recorded at the **doc/decision level**; it does **not** appear as a code token (see §5.15 and §6 Decision 1 — the structural guards forbid the literal token in provider files). Selection stays reversible precisely because the vendor name lives in this document and behind the boundary, not in the call sites.

> `[ASSUMPTION]` "OpenAI" here designates only the eventual live target. If a later slice's live integration reveals a blocking constraint (deployment, licensing, data-handling), the selection can be re-recorded without touching any committed Impl 020 code, because Impl 020 contains no vendor-specific token.

---

## 4. Integration mechanism for Implementation 020

`[DECISION]` Implementation 020 uses **no installed SDK and no real network call**. It adds:

1. a **disabled-by-default concrete client** implementing `ProviderClientBoundary` (returns a safe failure unless explicitly fed a deterministic fixture transport in tests),
2. a pure **prompt serializer** (`ProviderInstruction` → provider-shaped request payload object),
3. a pure **response parser** (provider-shaped response fixture → `ProviderClientResponse`),
4. a pure **error mapper** (provider-shaped error fixture → `ProviderOperationalFailure`),

all proven with deterministic local fixtures.

Why this mechanism:

- keeps CI deterministic and credential-free;
- avoids introducing real credentials in the same slice as provider selection;
- proves provider-specific request / response / error mapping in isolation;
- keeps `validateDraft` mandatory and the audit raw-free;
- keeps the provider reversible.

`[DECISION]` If a future slice decides to allow SDK installation or live network, it must separately justify the added risk and specify exact containment + test-disablement rules. Impl 020 does **not** grant that.

---

## 5. Surface Gap Analysis (from real code)

All shapes below are read verbatim from the current tree. Implementation 020 must reuse them; it must **not** invent incompatible names.

**5.1 `ProviderClientBoundary`** — `src/modules/rendering/application/provider-client-boundary.ts`
```ts
export interface ProviderClientBoundary {
  readonly kind: string;                                            // descriptive label, e.g. "fake"
  requestDraft(input: ProviderClientRequest): Promise<ProviderClientResponse>;
}
```
The concrete client implements exactly this. No other method, no domain handle.

**5.2 `ProviderClientRequest`** — `domain/provider-client-response.ts`
```ts
interface ProviderClientRequest {
  readonly sourceCaseRef: string;
  readonly instruction: ProviderInstruction;   // structured, derived
  readonly config: ProviderClientConfig;        // non-secret
  readonly secret: ProviderSecretRef;           // status + opaque ref only
}
```

**5.3 `ProviderClientResponse` / `ProviderClientMetadata`** — same file
```ts
interface ProviderClientMetadata { readonly providerKind: string; readonly latencyMs?: number; readonly tokenCount?: number; readonly finishReason?: string; }
type ProviderClientResponse =
  | { readonly status: "draft";  readonly text: string;                       readonly metadata?: ProviderClientMetadata }
  | { readonly status: "failed"; readonly failure: ProviderOperationalFailure; readonly metadata?: ProviderClientMetadata };
```
The parser returns this union; metadata is **operational only** and `?optional`.

**5.4 `ProviderSecretRef` / `ProviderCredentialStatus`** — `domain/provider-secret-ref.ts`
```ts
type ProviderCredentialStatus = "present" | "missing" | "invalid";
interface ProviderSecretRef { readonly status: ProviderCredentialStatus; readonly ref?: string; } // opaque handle only — NEVER a raw key
```
There is no field for a raw key — by construction.

**5.5 `ProviderInstruction` / `providerInstructionFrom`** — `domain/provider-instruction.ts`
```ts
interface ProviderInstruction {
  readonly kind: RenderableKind; readonly voice?: VoiceMode;
  readonly allowedClaims: readonly string[]; readonly forbiddenClaims: readonly string[];
  readonly uncertaintyVisibleRequired: boolean; readonly limitations: readonly string[];
  readonly traceabilitySummary?: string; readonly traceabilityStatus?: string;
  readonly style?: RenderingStyle; readonly locale?: string; readonly maxLength?: number;
}
```
The serializer's **only** input is a `ProviderInstruction`. There is no field for arbitrary caller prompt text, chain-of-thought, hidden reasoning, voice override, hide-uncertainty/ignore-validation, or a mutable handle — they are unrepresentable upstream.

**5.6 `ProviderOperationalFailure`** — `domain/provider-operational-failure.ts`
```ts
type ProviderOperationalFailure =
  | "missing-credential" | "invalid-credential" | "provider-unavailable"
  | "provider-timeout" | "provider-rate-limited" | "provider-refused"
  | "provider-returned-empty-response" | "provider-returned-malformed-response"
  | "unsupported-provider-config" | "unsafe-provider-request";
```

**5.7 `toProviderFailure(op)`** — same file; maps DOWN into the existing closed `ProviderFailure`:
| operational | → ProviderFailure |
|---|---|
| `missing-credential`, `invalid-credential`, `unsupported-provider-config`, `provider-unavailable` | `provider-unavailable` |
| `provider-timeout` | `provider-timeout` |
| `provider-rate-limited` | `provider-rate-limited` |
| `provider-refused` | `provider-refused` |
| `provider-returned-empty-response` | `provider-returned-empty-draft` |
| `provider-returned-malformed-response` | `provider-returned-invalid-draft` |
| `unsafe-provider-request` | `unsafe-provider-request` |

**5.8 `RealProviderAdapter` / `realProviderAdapter(client, config, secret)`** — `application/real-provider-adapter.ts`. Async `draft(request: ProviderRenderingRequest): Promise<ProviderDraftOutcome>`; builds the `ProviderClientRequest` via `providerInstructionFrom`, calls `client.requestDraft`, maps a failed response via `toProviderFailure`, returns an **untrusted** `drafted` outcome. It **never** calls `validateDraft` and **never** constructs a `RenderedMessage`. The concrete client plugs in **here**, as the `client` argument — the adapter is reused unchanged.

**5.9 `requestRealProviderRendering(input)`** — `application/real-provider-rendering-service.ts`. Steps: (1) `providerRenderingRequestFrom` guard (rejects unsafe before any client call); (2) credential fast-path — non-`present` secret fails safely before any client call; (3) `realProviderAdapter(...).draft(...)`; (4) **mandatory** `validateDraft`; a `RenderedMessage` exists only if validation passes. Persists nothing, reviews nothing, marks nothing display-eligible, delivers nothing, appends no event, mutates nothing, never retries. Returns `ProviderRenderOutcome` (same shape as the sync path). **Impl 020 reuses this coordinator unchanged** — the concrete client is supplied as `input.client`.

**5.10 `validateDraft(input)`** — `domain/rendering-validator.ts`
```ts
validateDraft({ draft: string, renderable: RenderableDomainOutput, request: RenderingRequest }): RenderOutcome
```
Unchanged and mandatory. Structural/string checks only (no NLP). The authority — not the provider.

**5.11 Provider-attempt audit** — `application/provider-attempt-audit-service.ts`: `auditProviderAttempt(input)` is a **pure, observe-only** mapping from an already-computed `ProviderRenderOutcome` to a `ProviderAttemptRecord`. It calls no provider, no `validateDraft`, persists nothing itself, appends no event, mutates nothing, and stores **no** raw draft. Impl 020 reuses it **by explicit composition only**.

**5.12 No-raw-draft-retention rules** — `domain/provider-draft-summary.ts`: `ProviderDraftSummary` is reason/count-based; `rawDraftRetained` is the **literal `false`**; there is no `draft`/`text`/`content`/`raw`/`excerpt`/`prompt` field. `draftCharacterCount` is reserved/not populated. Raw or unsafe provider output is structurally unrepresentable in the audit.

**5.13 Existing structural guard tokens** — `tests/real-provider-negative-capability.test.ts` and `tests/provider-negative-capability.test.ts`. The content guard regex applied to every provider-matched production file is:
```text
/\b(openai|anthropic|axios|node:https|node:http)\b|fetch\s*\(|https?:\/\/|process\.env/i
```
Forbidden top-level paths: `src/modules/{provider,llm,openai,anthropic,model,telemetry,evaluation}`, `src/{api,ui,infrastructure,providers,prompts}`. Forbidden imports in provider files: `observation|reasoning|understanding|athlete|event-recording|delivery`. `decision-support` imports must be `import type`. No module outside `rendering` may reference the boundary symbols. The sync seam must stay synchronous (no `Promise<` in `provider-adapter.ts`).

**5.14 Current package/dependency state** — `package.json`: `type: module`; scripts `typecheck`/`test`/`check`; devDeps **only** `@types/node ^22.20.0` + `typescript ^5.9.3`; **no** runtime deps. `package-lock.json` present; `node_modules` contains only `typescript`, `@types/node`, `undici-types` (transitive). **No SDK, no HTTP client installed.**

**5.15 `[GAP] Vendor-specific filenames are currently FORBIDDEN.`** The content guard (§5.13) scans **file content** of every file matching `provider-` / the real-provider set. A file named `openai-provider-client.ts` puts the literal token `openai` into: (a) its own header/identifiers, and (b) the `import ... from "./openai-provider-client.ts"` line in `index.ts` and any sibling provider file. Both files match the guard's selector, so the token `openai` (and `anthropic`) trips `assert.equal(forbidden.test(...), false)`. **Conclusion:** vendor-named files/identifiers are not allowed without weakening a guard. **Resolution (no weakening):** use neutral names (§6 Decision 1) and keep the vendor name doc-level only. The neutral `providerKind` label is e.g. `"concrete"`, never `"openai"`.

**5.16 `[FACT] Adding a dependency is not needed and not done in Impl 020.`** Repo policy is implicit (only TS + @types/node, lockfile committed). Since Impl 020 makes no live call, no SDK/HTTP dependency is required; none is added. Any future dependency is a separate, justified slice.

**5.17 `[FACT] Live network is already structurally forbidden`** by the §5.13 content guard (`fetch(`, `https?://`, `node:http(s)`) and `process.env`. Impl 020 keeps these green by performing no I/O.

---

## 6. Key Architectural Decisions

### `[DECISION]` Decision 1 — Provider-specific code location & naming

Keep all concrete-provider code inside **`rendering/application`**. Because of `[GAP] §5.15`, use **neutral filenames** (vendor name stays doc-level):

```text
src/modules/rendering/application/concrete-provider-client.ts          # implements ProviderClientBoundary; disabled-by-default
src/modules/rendering/application/concrete-provider-prompt-serializer.ts
src/modules/rendering/application/concrete-provider-response-parser.ts
src/modules/rendering/application/concrete-provider-error-mapper.ts
```

Rationale: keeps the existing guards **intact** (no token weakening), keeps the vendor reversible, and keeps every domain module ignorant of the vendor. Vendor-named files (`openai-provider-client.ts`) are **rejected** by the current guards (§5.15); we choose isolation over weakening guards.

Must **not** create (existing forbidden set, §5.13): `src/modules/{provider,llm,openai,anthropic,model,telemetry,evaluation}`, `src/{api,ui,infrastructure,providers,prompts}`.

### `[DECISION]` Decision 2 — Live calls disabled by default

No live provider call runs by default. CI requires no credentials; the local default test suite requires no credentials. Any future live-call harness must be opt-in and **excluded** from the default `node --test "src/**/*.test.ts"` suite. **Impl 020 remains no-live-call.**

### `[DECISION]` Decision 3 — Secret mechanism

No raw API key in domain types, attempt records, errors, logs, tests, or doc examples. Keep `ProviderSecretRef` (status + opaque ref). Model `missing`/`invalid`/`present` with deterministic test doubles. **No** real env/secret reader; **no** `process.env`. Defer a real secret resolver port to a later infra slice.

### `[DECISION]` Decision 4 — Prompt serialization

The serializer consumes a `ProviderInstruction` and returns a **structured provider-shaped request payload object** — not a prompt-template file, not an arbitrary string from a caller. No `src/prompts`. No chain-of-thought / hidden-reasoning / voice-override / hide-uncertainty / ignore-validation request (all unrepresentable in `ProviderInstruction`, §5.5). The payload carries only safe constraints: kind/terminal-output-kind, selected voice, style, locale, allowed claims, forbidden claims, uncertainty-visible requirement, limitations, traceability summary/status, maxLength.

### `[DECISION]` Decision 5 — Response parsing

The parser maps a provider-shaped response **fixture** into `ProviderClientResponse`. It extracts **only** draft text (untrusted) + safe operational metadata; maps malformed/empty to `provider-returned-malformed-response` / `provider-returned-empty-response`. It **never** creates a `RenderedMessage` and **never** stores the raw provider payload.

### `[DECISION]` Decision 6 — Error mapping

Provider-shaped error fixtures → `ProviderOperationalFailure` (the mapper), then the existing `toProviderFailure(...)` → `ProviderFailure`. **No expansion** of `ProviderFailure`. Deterministic mappings exist for: live-disabled, missing/invalid credential, network-unavailable, timeout, rate-limit, refusal, empty, malformed, unsupported-config, unknown — see §10.

### `[DECISION]` Decision 7 — Validator and audit unchanged

The concrete path runs through the **unchanged** `requestRealProviderRendering(...)` → **unchanged** `validateDraft`. Provider-attempt audit stays explicit composition (`auditProviderAttempt`), with no automatic persistence and no raw draft/prompt/secret/payload retention.

---

## 7. Proposed Implementation Shape

Production (neutral names, per Decision 1):
```text
src/modules/rendering/application/concrete-provider-client.ts
src/modules/rendering/application/concrete-provider-prompt-serializer.ts
src/modules/rendering/application/concrete-provider-response-parser.ts
src/modules/rendering/application/concrete-provider-error-mapper.ts
```

Tests:
```text
src/modules/rendering/tests/concrete-provider-selection.test.ts
src/modules/rendering/tests/concrete-provider-prompt-serialization.test.ts
src/modules/rendering/tests/concrete-provider-response-parsing.test.ts
src/modules/rendering/tests/concrete-provider-negative-capability.test.ts
```
(Error-mapping assertions may live in `concrete-provider-response-parsing.test.ts` or a dedicated `concrete-provider-error-mapping.test.ts`; either is acceptable as long as every §11 case is covered.)

Must **not** create: provider modules, SDK config outside `rendering`, network clients, env readers, prompt-template directories, or live-call tests in the default suite.

> `[FACT]` New `concrete-provider-*` files match the existing negative-capability selectors (`provider-` and the real-provider set), so the guards in §5.13 automatically apply to them with no test change. The new `concrete-provider-negative-capability.test.ts` adds the slice-specific defining tests.

---

## 8. Types / Surfaces To Plan

### `ProviderSelectionDecision` (doc/decision level — this document)
Provider name (OpenAI, doc-level), mechanism (defer — no SDK/network in Impl 020), live-call policy (disabled / opt-in / not-in-default-tests / no-credentials-in-ci), credential policy (no real secret reader; `ProviderSecretRef` only), dependency policy (none added), deterministic-test policy (fixtures), rollback policy (delete additive files). **Not** a required code artifact. If a code-level marker is ever wanted, it must use a **neutral** label (e.g. `providerKind: "concrete"`), never the vendor token (§5.15).

### `concreteProviderClient(...)` — implements `ProviderClientBoundary`
- `readonly kind: string` (neutral, e.g. `"concrete"`), `requestDraft(input): Promise<ProviderClientResponse>`.
- **Disabled by default:** with no injected deterministic transport it returns `{ status: "failed", failure: "provider-unavailable" }` (a safe operational failure) without any I/O.
- For tests, it accepts an injected **deterministic fixture transport** (a pure function `payload → provider-shaped response/error fixture`) so serializer→parser→error-mapper can be exercised end-to-end with zero network.
- Composes serializer (build payload) → fixture transport → parser/error-mapper (interpret) → `ProviderClientResponse`. **No network, no `process.env`, no secret read.**
- Follows the no-constructor-parameter-properties rule: a factory (`concreteProviderClient(deps)`) returning a frozen object, mirroring `realProviderAdapter` / `fakeProviderAdapter` style; or a class with explicit field declarations + private constructor if state is needed.

### `serializeProviderInstruction(instruction: ProviderInstruction): ConcreteProviderRequestPayload`
Pure, deterministic. Returns a structured, frozen, provider-shaped payload object carrying only the safe constraints in Decision 4. Excludes/rejects any unsafe material (none is representable, but the serializer must not fabricate prompt text beyond the structured fields). No arbitrary caller string reaches the payload.

### `parseProviderResponse(fixture: ConcreteProviderResponseShape): ProviderClientResponse`
Pure, deterministic. Returns the existing union; empty → `provider-returned-empty-response`, malformed → `provider-returned-malformed-response`; success → `{ status: "draft", text, metadata? }` (untrusted). Retains no raw payload in any returned state.

### `mapProviderError(fixture: ConcreteProviderErrorShape): ProviderOperationalFailure`
Pure, deterministic; preserves no secret in messages; unknown → safe failure (§10). Output feeds the existing `toProviderFailure`.

### `LiveCallPolicy` (policy, documented; optional small literal type if useful)
```text
disabled-by-default · requires-explicit-opt-in · not-used-in-default-tests · no-credentials-required-in-ci
```
**Impl 020 value: `live calls not implemented`.**

> All new payload/response/error fixture **shapes** (`ConcreteProviderRequestPayload`, etc.) are local, neutral, TS-strict interfaces with `readonly` fields, explicit declarations, no parameter properties, no arbitrary bag, and no raw-bag rehydration without validation.

---

## 9. Live Call / Secret / Prompt / Response policies (required)

**Live Call Policy.** Impl 020 makes **no** live calls. Code shape may *anticipate* live calls later, but the concrete client is **disabled by default** and returns a safe failure unless explicitly given a deterministic fixture transport (tests) or replaced/configured in a later slice. No live network tests; no CI credentials; no local credentials required; no env reads (unless a future 020-series slice explicitly authorizes an infra boundary — Impl 020 does not).

**Secret Policy.** No raw API keys anywhere (code, tests, doc examples, errors, audit records, provider metadata). No direct `process.env`. Missing/invalid credentials → safe provider failure (§10). Secret **refs are not secrets**. Impl 020 ships **no real secret reader**.

**Prompt / Payload Policy.** Serializer consumes `ProviderInstruction`; no arbitrary prompt input; no chain-of-thought; no hidden reasoning; no voice override; no hide-uncertainty; no ignore-validator; no mutable aggregate handle; no secrets in payload. Payload **must** include the safety constraints: style, locale, terminal-output kind, selected voice, allowed claims, forbidden claims, uncertainty visibility, limitation visibility, traceability requirements.

**Response / Metadata Policy.** Raw provider response is never persisted and never an audit payload. The parser extracts draft text only, as **untrusted** draft. Safe metadata (`providerKind`/`latencyMs`/`tokenCount`/`finishReason`) is **operational only** — never Evidence/Observation/Understanding/AthleteDecision/SupportQuality, cannot alter `VoiceMode`; token count/cost/model/latency/failure is **not** athlete state.

---

## 10. Failure Mapping (required)

Provider-shaped error → `ProviderOperationalFailure` → existing `ProviderFailure`. **No `ProviderFailure` expansion.**

| Condition | `ProviderOperationalFailure` | → `ProviderFailure` (via existing `toProviderFailure`) |
|---|---|---|
| live calls disabled (default shell) | `provider-unavailable` | `provider-unavailable` |
| missing credential | `missing-credential` | `provider-unavailable` |
| invalid credential | `invalid-credential` | `provider-unavailable` |
| network unavailable | `provider-unavailable` | `provider-unavailable` |
| timeout | `provider-timeout` | `provider-timeout` |
| rate limit | `provider-rate-limited` | `provider-rate-limited` |
| provider refusal | `provider-refused` | `provider-refused` |
| empty response | `provider-returned-empty-response` | `provider-returned-empty-draft` |
| malformed response | `provider-returned-malformed-response` | `provider-returned-invalid-draft` |
| unsupported provider config | `unsupported-provider-config` | `provider-unavailable` |
| unknown provider error | `provider-unavailable` (safe default) | `provider-unavailable` |

> `[DECISION]` "Live calls disabled" and "unknown error" both map to the safe `provider-unavailable`, reusing the catalog without expansion. Unknown errors must map **without** leaking raw provider payload or secrets in any message.

---

## 11. Persistence / Review / Delivery / Event rules

Implementation 020 must **not**: create or save a `RenderedMessageRecord`; append a review; mark display-eligible; call delivery; create a `DeliveryRecord`; append event records; expand the event catalog; create provider-attempt event records; trigger retry/scheduler; persist provider attempts automatically; persist a raw provider response; persist a prompt payload; persist secrets. The concrete path ends at the returned `ProviderRenderOutcome`; any audit is an explicit, raw-free composition by the caller (§5.11–5.12).

---

## 12. Negative Capability (must be structurally impossible / test-failing)

- provider selected without explicit decision (this doc is the gate);
- live calls enabled by default; CI requires credentials; default tests make network calls;
- a raw API key appears; `process.env` appears (Impl 020 not authorized);
- an arbitrary prompt string / chain-of-thought / hidden reasoning reaches the payload;
- provider output bypasses `validateDraft`, or directly creates `RenderedMessage` / `RenderedMessageRecord` / review / display / delivery;
- provider metadata becomes Evidence/Observation/Understanding/AthleteDecision/SupportQuality;
- provider success "validates" recommendation quality; provider failure invalidates domain output;
- automatic retry/scheduler/event-bus appears;
- provider integration imports `observation|reasoning|understanding|athlete|event-recording|delivery`, or mutates domain state;
- raw provider response/draft/prompt/secret retained in audit or persistence;
- prompt-template files appear; a provider module appears outside `rendering`;
- the vendor token (`openai`/`anthropic`) appears in a provider code file (§5.15 — keep it doc-level).

---

## 13. Validation Strategy (tests before implementation; negatives are defining)

1. provider-selection decision is explicit (this doc; a `concrete-provider-selection.test.ts` asserts the concrete client + serializer/parser/error-mapper exist and are wired through `requestRealProviderRendering`).
2. live calls disabled by default (default shell → safe failure; no I/O).
3. deterministic tests require no real credentials.
4. missing credential → safe failure. 5. invalid credential → safe failure.
6. timeout → safe failure. 7. rate-limit → safe failure.
8. malformed response → safe failure. 9. empty response → safe failure.
10. provider-shaped errors map to existing operational failures (every §10 row).
11. a safe provider draft passes **only** through the validator (no bypass path exists).
12. a provider draft cannot bypass validation (a failing draft yields a failure + no message — mirror of the Impl 017/019 tests).
13. voice escalation rejected. 14. invented fact rejected. 15. hidden uncertainty rejected (drive the concrete client with the unsafe fixtures; `validateDraft` refuses).
16. prompt injection rejected/excluded **before** payload (serializer carries only structured fields; no arbitrary string field exists).
17. provider metadata remains operational, not evidence (outcome carries no metadata into domain authority).
18. when the attempt is composed with `auditProviderAttempt`, the record retains no raw draft/prompt/secret/payload (`rawDraftRetained === false`; no content fields).
19. provider success creates no record/review/display/delivery/event automatically.
20. provider failure does not mutate domain.
21. no automatic retry/scheduler/event bus.
22. secrets not persisted/logged/exposed in errors (stringified outcome leaks no `ref`/`secret`/`apikey`/`credential` — mirror of `real-provider-negative-capability` test).
23. boundary/import tests (the new `concrete-provider-*` files inherit the §5.13 guards automatically; the new negative-capability test re-asserts them).
24. **all existing Impl 001–019 tests continue to pass** (≈462).

---

## 14. Boundary Rules

Concrete-provider files **may** import: their own `rendering` domain/application types; `shared-kernel` if needed; read-only (`import type`) `decision-support` types already permitted to `rendering`. They **must not** import `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`. No upstream module imports them. No `src/modules/{provider,llm,anthropic,model,telemetry,evaluation}`; no `src/{api,ui,infrastructure,providers,prompts}`. No live network in default tests; no env reads (not authorized in Impl 020); no prompt-template files; no raw secrets.

> `[DECISION]` We do **not** weaken any negative-capability guard. Selecting OpenAI does **not** require changing the `openai`/`anthropic` content guard, because the vendor name stays doc-level and the code uses neutral `concrete-provider-*` names (§5.15, §6 Decision 1). No guard is identified as stale.

---

## 15. Relationship to Existing Architecture

- **Spec/Impl 019:** the async `ProviderClientBoundary` + `requestRealProviderRendering` + `realProviderAdapter` already exist; the concrete client is just another `ProviderClientBoundary` implementation injected at the same seam — no new coordinator.
- **Spec/Impl 018:** provider-attempt audit stays raw-free and explicit; Impl 020 only *composes* it, never auto-persists.
- **Spec/Impl 017:** the provider seam exists and provider drafts are untrusted; the concrete draft is equally untrusted.
- **Spec/Impl 014:** only validated drafts become `RenderedMessage` — `validateDraft` stays mandatory.
- **Spec/Impl 015:** only validated `RenderedMessage`s may become records — Impl 020 creates none.
- **Spec/Impl 016:** delivery only consumes display-eligible records; provider success does not deliver.
- **Spec/Impl 011:** event records are occurrence history; provider integration appends none.
- **Spec/Impl 013:** provider response is not source material unless separately reported by the athlete.

Clarifications: the concrete provider stays behind `rendering`; provider output is draft text only; `validateDraft` is mandatory; audit stays raw-free; metadata stays operational; the real provider adapter is **not** delivery, **not** eventing, **not** model evaluation, **not** domain reasoning.

---

## 16. Open Questions (carried forward, non-blocking)

SDK-vs-HTTP for the eventual live call; exact secret-management mechanism; exact env-variable naming; when live calls become enabled; model/deployment configuration; timeout limits; retry policy; rate-limit behavior; streaming support; provider-metadata retention; cost/billing limits; prompt-material storage; localization quality; model evaluation; production telemetry; provider event records. None resolved beyond this slice.

---

## 17. Implementation Task Preview

**Implementation 020 — Add selected-provider adapter shell with deterministic serializer/parser/error mapping and live calls disabled**

Acceptance criteria:
- the selected provider is recorded (this doc; OpenAI, doc-level; code stays vendor-neutral);
- the concrete adapter (`concrete-provider-*`) lives **inside `rendering/application`** and implements the existing `ProviderClientBoundary`;
- **no live calls by default** (default shell → safe `provider-unavailable`, no I/O);
- **no CI credentials**, no local credentials required;
- **no raw secrets** anywhere; no `process.env`;
- **no production prompt templates**; serializer emits a structured payload object from `ProviderInstruction` only;
- **no automatic persistence/review/display/delivery/event** side effects;
- `validateDraft` remains mandatory (path runs through the unchanged `requestRealProviderRendering`);
- provider-attempt audit remains raw-free when composed;
- serializer/parser/error-mapper are pure, deterministic, fixture-driven; every §10 failure mapping is covered;
- all existing tests remain green (≈462), and the new `concrete-provider-*` defining/negative tests pass.

---

## 18. Technical Constraints

TypeScript strict; Node native test runner (`node --test`); no external test framework; no framework; no DB; no event bus; no automatic retry/scheduler; no prompt templates as production code; no raw secrets; no default live network; no CI credentials. No constructor parameter properties (private ctor + explicit field declarations, or frozen factory). `import type` where appropriate. Explicit field declarations. No arbitrary payload bags; no raw-bag rehydration without validation. Concrete-provider tests must be deterministic.

---

## 19. Success Criteria

After this tech spec, Implementation can build the first concrete provider adapter shell **without** making real live calls, requiring credentials, weakening domain boundaries, bypassing validation, retaining raw prompts/responses/secrets, or creating persistence/review/delivery/event side effects.

The implementation must answer:

> "Can Aurora select and prepare a concrete real provider adapter without letting vendor SDKs, network calls, API keys, prompts, provider responses, metadata, retries, or errors become authority, evidence, persistence, review, delivery, events, or domain mutation?"

— and, by the plan above, the answer is **yes**.
