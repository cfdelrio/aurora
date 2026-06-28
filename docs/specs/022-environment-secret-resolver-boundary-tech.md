# Aurora — Technical Spec 022A — Environment Secret Resolver Implementation Plan

> Phase: **Technical Specification** (TS-strict plan, no code).
> Translates: `docs/specs/022-environment-secret-resolver-boundary.md`.
> Status: this document fixes the **technical mechanism** for the first environment/config credential resolver and the minimal TS-strict shape for Implementation 022. **No code, no API key, no live call, no SDK, no dependency, no production prompt template, no event-catalog change, and no broad guard weakening.**

---

## 0. Phase confirmation

This is the **Technical Specification** phase, not Implementation.

- `[FACT]` This document plans; it changes no file under `src/`. No dependency is installed; `package.json`/`package-lock.json` are untouched by 022A.
- `[DECISION]` 022A picks the environment-source mechanism (injected map vs direct `process.env`), the resolver file/layout, the secret-name + validation + redaction policies, the guard strategy, and the test strategy — and stops there.

---

## 1. Context recap

Spec 022 (`022-environment-secret-resolver-boundary.md`) is complete. Aurora (post Impl 021) has the full provider edge, including the **opt-in live-provider boundary**: `LiveProviderClient` (implements the async `ProviderClientBoundary`), `LiveCallPolicy` (disabled by default), an **injected `ProviderCredentialResolver`** with a deterministic `StaticProviderCredentialResolver`, and native `fetch` isolated in exactly one approved file `live-provider-http-transport.ts`. Validation stays in `requestRealProviderRendering → validateDraft`; the provider-attempt audit is raw-free.

What does **not** exist: an **environment resolver**, any `process.env` read, a real secret manager, API keys, a real SDK/dependency, production prompts, provider events, UI/API, scheduler/event bus, production DB.

Spec 022's boundary: a secret resolver is **operational** — it supplies a transient credential to the transport path; **credential availability ≠ live-call enablement**; the **raw secret never enters domain/audit/errors/logs/persistence/tests**; the `LiveCallPolicy` stays separate and disabled by default.

---

## 2. Central Question

> How can Aurora implement an environment/config credential resolver behind `ProviderCredentialResolver` **without reading the real process environment by default**, requiring real credentials in tests, leaking raw secrets into errors/audit/logs/persistence, enabling live calls by itself, or weakening domain boundaries?

Answer shape (proven below): add an **`EnvironmentProviderCredentialResolver`** implementing the existing `ProviderCredentialResolver` port, fed an **injected `EnvironmentCredentialSource`** (a read-only string map) and an **explicit configured key name** — it reads **only that one key**, classifies missing/blank/malformed/available, and returns the existing `ProviderCredentialResolution` (the `available` branch wraps the value in the existing opaque transient `ProviderCredentialToken`). It reads **no `process.env`** (so **no guard exception is needed** — `process.env` stays forbidden everywhere), exposes no raw secret, calls no transport/provider/`validateDraft`, and creates no side effect.

---

## 3. Required Technical Decisions

### `[DECISION]` Decision 1 — Injected env map vs direct `process.env` → **injected env map**

Implementation 022 uses an **injected environment map**, **not** direct `process.env`.

Rationale: deterministic tests; no real CI credential; no real process-environment dependency; **no structural-guard exception for `process.env` is needed**; a later infra slice can adapt `process.env` into the injected map if approved.

> `[DECISION]` If a later slice chooses direct `process.env`, it must define exactly one approved resolver file, the exact env variable name, a surgical guard exception, a positive "only that file contains it" assertion, and no default-suite dependency on the real environment. 022A does **not** authorize that.

### `[DECISION]` Decision 2 — Resolver location

```text
src/modules/rendering/application/environment-provider-credential-resolver.ts
```
It implements the existing `ProviderCredentialResolver` and lives **inside `rendering/application`**. Must **not** create `src/modules/{secrets,config,infrastructure,provider,llm}`, `src/api`, `src/providers`, or `src/prompts`.

### `[DECISION]` Decision 3 — Environment source type → narrow read-only map

```text
type EnvironmentCredentialSource = Readonly<Record<string, string | undefined>>;
```
Rules: **explicit key lookup only**; **no scanning**; **no fallback list**; **no dynamic key construction from domain data**; **no raw secret returned in failure**. Tests supply a deterministic literal map; production may later pass a snapshot of `process.env` from an infra adapter (deferred).

### `[DECISION]` Decision 4 — Secret variable name policy → neutral, explicit, configured

The secret key name is **explicit configuration** passed to the resolver, not hard-coded and not vendor-named (the vendor stays doc-level; `openai`/`anthropic` are guarded tokens). Allowed examples (neutral): `PROVIDER_CREDENTIAL`, `AURORA_PROVIDER_CREDENTIAL`. No real API keys in docs/tests; no key name derived from athlete/domain data.

### `[DECISION]` Decision 5 — Credential shape validation → minimal, neutral

- configured key **absent** (`undefined`) → **missing**;
- value **empty / whitespace-only** → **invalid**;
- value containing **line breaks / control characters** → **invalid**;
- value **below a minimum safe length** (small, neutral; e.g. a few chars) → **invalid**;
- otherwise → **available** with an opaque `ProviderCredentialToken`.

No vendor-specific secret format is encoded (deferred unless a later slice justifies it). No validation reason leaks the raw value.

### `[DECISION]` Decision 6 — Opaque token handling → reuse `ProviderCredentialToken`

Reuse the existing `ProviderCredentialToken` (+ `providerCredentialToken(...)` factory). The `available` branch wraps the validated value as the token. The token is **application-layer and transient**: not serializable into state; not in errors/audit/metadata; not exposed to domain modules; no custom `toString()` exposing the value (it remains a branded `string`, used only by the transport's `Bearer ${credential}` header). **Tests must not use real secret strings** (e.g. `"test-secret-value"`).

### `[DECISION]` Decision 7 — Redaction and error behavior → stable non-secret reason codes

Failures use the existing `ProviderCredentialResolution` states (`missing`/`invalid`) and the existing `ProviderOperationalFailure` reason codes downstream — **never** the raw secret, the env value, a bearer/auth prefix, a credential length that could leak information, the full environment key map, the provider payload, or the raw provider response.

### `[DECISION]` Decision 8 — Live-call separation

Credential resolution **does not enable live calls**. Even when a credential is available: `LiveCallPolicy.disabled()` still prevents transport invocation (the `LiveProviderClient` checks the policy *before* resolving); the resolver does not call the transport / the provider / `validateDraft`, and creates no audit/persistence/events.

### `[DECISION]` Decision 9 — Structural guards → keep `process.env` forbidden everywhere

With the injected-map decision: **keep `process.env` forbidden everywhere**; **no guard exception is required**. The new negative-capability test re-asserts no `process.env` token in the resolver files (and the existing Impl 017/021 guards already scan the new file — see §5).

---

## 4. Integration Flow

```text
EnvironmentProviderCredentialResolver.resolve()
  → validate configured key name (non-empty, trimmed)
  → read ONLY that key from the injected EnvironmentCredentialSource
  → classify: absent → missing · blank/control/too-short → invalid · else → available(token)
  → ProviderCredentialResolution
        ↓ (injected where StaticProviderCredentialResolver is today)
LiveProviderClient.requestDraft(...)
  → LiveCallPolicy gate          // disabled → failed(provider-unavailable); NO resolve/transport
  → resolver.resolve()           // missing/invalid → failed(...); NO transport
  → serializeProviderInstruction(...)
  → LiveProviderHttpTransport    // only if policy enabled AND credential available
  → parse/map → ProviderClientResponse → RealProviderAdapter → validateDraft → ProviderRenderOutcome
  → optional raw-free auditProviderAttempt(...)   // explicit composition; no credential retained
```

Rules: (1) the resolver alone calls no transport; (2) the resolver alone enables no live call; (3) policy disabled prevents transport even if a credential resolves; (4) missing/invalid credential prevents transport even if the policy is enabled; (5) the token is transient and not persisted; (6) no raw credential enters audit; (7) no raw credential enters errors; (8) no raw credential enters the domain.

---

## 5. Surface Gap Analysis (from real code)

Reuse these verbatim; do not invent incompatible names.

1. **`ProviderCredentialResolver`** (`application/provider-credential-resolver.ts`): `interface ProviderCredentialResolver { resolve(): ProviderCredentialResolution }`. The env resolver implements exactly this.
2. **`ProviderCredentialResolution`** (same file): `{ status: "available"; token: ProviderCredentialToken } | { status: "missing" } | { status: "invalid" }`. **Closed; reused as-is.**
3. **`ProviderCredentialToken`** (same file): `string & { readonly [brand]: "provider-credential" }`, built via `providerCredentialToken(handle: string)`. Reused for the `available` branch.
4. **`StaticProviderCredentialResolver`** (`application/static-provider-credential-resolver.ts`): class implementing the port; constructor `{ status?: "available"|"missing"|"invalid" }`; returns frozen resolutions; the available token is a non-secret sentinel. The env resolver is its **sibling** (same port, injected the same way).
5. **`LiveProviderClient`** (`application/live-provider-client.ts`): checks `policy.enabled` **first** (disabled → `failed(provider-unavailable)`, no resolve/transport), then `resolver.resolve()` (missing → `missing-credential`; invalid → `invalid-credential`; both **before** any transport call), then serialize → `transport.send(payload, credential.token, policy)` → parse/map. It **never calls `validateDraft`**. **Unchanged** — the env resolver simply replaces the injected resolver.
6. **`LiveCallPolicy`** (`application/live-call-policy.ts`): `{ enabled: boolean; timeoutMs: number; source? }`; `LiveCallPolicy.disabled()` / `.enabled({timeoutMs})`. Separate from credential resolution. **Unchanged.**
7. **`LiveProviderTransport.send`** (`application/live-provider-http-transport.ts`): `send(payload, credential: ProviderCredentialToken, policy): Promise<LiveProviderTransportResult>`. The credential input is exactly the token the env resolver produces. **Unchanged.**
8. **Provider-attempt audit** (`application/provider-attempt-audit-service.ts`): `auditProviderAttempt(...)` is pure, observe-only, raw-free (`rawDraftRetained` literal `false`). A credential never enters it. **Unchanged; explicit composition only.**
9. **No-raw-secret tests already present** (Impl 019/021): `real-provider-boundary.test.ts` asserts an outcome leaks no `secret`/`apikey`/`credential`/ref; `live-provider-call-gate.test.ts` asserts no `opaque:test-credential`/`bearer`/`authorization`/`ref:live` in outcome or audit. Impl 022 extends this posture to the env-derived token.
10. **Structural guard tokens + selectors** (verified):
    - `provider-negative-capability.test.ts` (Impl 017): scans `/provider-/` files; **nonNetwork** regex `/\b(openai|anthropic|axios)\b|process\.env/i` enforced on **all** of them (network split is single-file for the transport only).
    - `real-provider-negative-capability.test.ts` (Impl 019): scans `(real-provider|provider-client|provider-instruction|provider-secret-ref|provider-operational-failure)`; combined regex incl. `process.env`.
    - `concrete-provider-negative-capability.test.ts` (Impl 020): scans `/concrete-provider/`; `sdkNetEnv` incl. `process.env`.
    - `live-provider-negative-capability.test.ts` (Impl 021): scans `/(live-call|live-provider|provider-credential)/`; a "no vendor/SDK/env token" test with `process\.env`.
    - All exclude `.test.ts` and `/tests/`.
11. **Package state**: devDeps only `@types/node ^22.20.0` + `typescript ^5.9.3`; no runtime deps; lockfile present. **No dependency added.**
12. `[FACT]` **`process.env` appears nowhere** in production code today (the Impl 021 transport uses only `fetch`/`AbortSignal.timeout`; no env read exists).
13. `[FACT]` **No env-guard change is needed** for the injected-map path: the resolver reads no `process.env`, so every guard that forbids it stays green unmodified.
14. `[FACT]` **Vendor tokens are guarded** in provider-matched files — the resolver stays vendor-neutral (neutral key name; no `openai`/`anthropic`).
15. `[FACT]` The **selected provider target is doc-level only** (020A); nothing here names a vendor in code.
16. `[GAP]` **Direct env access *would* trip existing guards.** `environment-provider-credential-resolver.ts` matches **both** the `/provider-/` selector (Impl 017 guard) **and** the `/provider-credential/` selector (Impl 021 live guard) — both forbid `process.env`. Reading `process.env` there would fail two guards. The injected-map decision sidesteps this entirely (and the implementation must keep the literal `process.env` out of even the file's comments — word them "the process environment" / "environment variables").
17. `[FACT]` **Default tests can simulate the environment through the injected map** — the resolver takes an `EnvironmentCredentialSource` argument, so tests pass a deterministic literal map with zero `process.env` and zero real secret.

> `[GAP]` No name conflicts. Impl 022 is **purely additive** — one resolver file + tests + index exports — with **no guard change** and **no dependency change**.

---

## 6. Proposed File Layout

Production:
```text
src/modules/rendering/application/environment-provider-credential-resolver.ts
```
Tests:
```text
src/modules/rendering/tests/environment-provider-credential-resolver.test.ts
src/modules/rendering/tests/environment-secret-negative-capability.test.ts
```
Additive index updates if needed: `src/modules/rendering/application/index.ts` (+ `rendering/index.ts` via `export *`).

**Do not** create an env resolver outside `rendering`; **do not** create a config/infrastructure/secrets module; **do not** edit `package.json`/lockfile; **do not** add an SDK, prompt templates, or live smoke tests.

---

## 7. Types / Surfaces To Plan

All TS-strict, `readonly` fields, explicit declarations, **no constructor parameter properties**, `import type` where applicable, no arbitrary bags, no raw-bag rehydration without validation.

### `EnvironmentProviderCredentialResolver` — implements `ProviderCredentialResolver`
```text
interface EnvironmentResolverConfig {
  readonly keyName: string;                       // explicit, neutral, non-empty
  readonly source: EnvironmentCredentialSource;   // injected read-only map (no process.env)
  readonly validation?: CredentialValidationPolicy; // optional; sensible defaults
}
class EnvironmentProviderCredentialResolver implements ProviderCredentialResolver {
  // private ctor + explicit fields + factory, mirroring existing application classes
  resolve(): ProviderCredentialResolution
}
```
Flow: validate the configured key name → read **only** that key from the injected map → classify missing/blank/malformed/available → return `ProviderCredentialResolution`. It must **not**: scan the environment; infer the key name; read `process.env`; expose a raw secret in a public failure; call the transport/provider/`validateDraft`; persist; audit; mutate domain.

### `EnvironmentCredentialSource`
`Readonly<Record<string, string | undefined>>` — no mutation, no scanning; the resolver reads only the configured key; tests supply a deterministic map.

### `SecretNamePolicy` (behavioral; may be enforced inline)
Non-empty key name required; a whitespace-only / untrimmed name is rejected (safe **invalid-configuration** result, no scan); no dynamic construction from domain values; no fallback list; an optional allowed prefix only if a later slice wants one; **no vendor token** (guards forbid it).

### `CredentialValidationPolicy` (behavioral; may be a small value object with defaults)
Blank/whitespace → invalid; line breaks/control chars → invalid; a minimal length check if useful → invalid; **no provider-specific regex** unless justified; **no returned reason leaks the raw value**.

### `RedactionPolicy` (implicit via result types + tests)
The raw secret is absent from: resolution failures; provider-client outcomes; audit records; thrown errors (if any); test snapshots; docs examples.

> `[FACT]` The `available` token *is* derived from the real value (so the transport can use it), but it travels **only** inside the `available` resolution and into the transport header — never into a failure, the audit, an error, metadata, or the domain.

---

## 8. Structural Guard Strategy

`[DECISION]` Keep `process.env` **forbidden everywhere** in Implementation 022 — **no guard exception**. Add a new `environment-secret-negative-capability.test.ts` proving:
- no `process.env` token in the new resolver file(s);
- no env access outside the approved boundary (there is none — injected map only);
- no raw-secret example / no vendor token / no SDK dependency / no prompt-template path;
- the resolver imports only its own `rendering` surfaces + `shared-kernel` (if needed) — never upstream/`delivery`/`event-recording`.

The existing Impl 017 + Impl 021 guards already scan `environment-provider-credential-resolver.ts` (it matches `/provider-/` and `/provider-credential/`) and will fail if `process.env`/a vendor token appears — so the posture is enforced **without touching those guards**. The implementation must keep the literal `process.env` out of even the file's comments (word them neutrally).

---

## 9. Test Strategy

Default tests: **no real env, no live call, no credential required, deterministic injected map.**

1. the resolver rejects a missing/blank configured key name (safe invalid-configuration; no scan);
2. the resolver reads **only** the explicitly configured key (an unrelated key in the map is ignored);
3. a missing key → `missing`;
4. a blank/whitespace value → `invalid` (or `missing` per the chosen classification — Decision 5 picks `invalid` for empty);
5. a malformed value (control chars / too short) → `invalid`;
6. an available value → `available` with an opaque token;
7. the token / raw secret never appears in a resolution failure or a provider-client outcome;
8. the raw secret never appears in an audit record when composed;
9. credential availability does **not** enable a live call if the policy is disabled (compose the env resolver into a `LiveProviderClient` with `LiveCallPolicy.disabled()` + a spy transport → transport never called);
10. policy disabled prevents transport even with an available credential;
11. credential failure prevents transport when policy enabled;
12. the default suite requires **no real environment variable**;
13. **no `process.env` token** appears in the resolver files;
14. **no SDK/dependency change** (devDeps remain `typescript` + `@types/node`; no runtime deps);
15. **no prompt-template files**;
16. **no persistence/review/display/delivery/event side effects**;
17. **all existing Impl 001–021 tests continue to pass** (≈514).

The negative tests are defining tests.

---

## 10. Persistence / Review / Delivery / Event rules

Implementation 022 must **not**: create/save a `RenderedMessageRecord`; append a review; mark display-eligible; call delivery; create a `DeliveryRecord`; append event records; expand the event catalog; create provider-attempt event records; trigger retry/scheduler; persist provider attempts automatically; persist a raw provider response; persist a prompt payload; **persist a secret**; or persist env variable names where they could become audit/domain payload. Resolution ends at a `ProviderCredentialResolution`.

---

## 11. Negative Capability (structurally impossible / test-failing)

A real environment required in the default suite; a direct `process.env` read (injected-map decision holds); env access outside the approved boundary; arbitrary env scan; a dynamic env-var name from domain data; a raw credential in audit/state/errors/tests/docs; a raw credential in provider metadata; the resolver enabling live calls by itself; the resolver invoking the transport/provider/`validateDraft`; the resolver creating persistence/review/display/delivery/event; the resolver mutating domain state; an SDK dependency; prompt-template files; the resolver importing `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`; a secret failure invalidating domain output; secret handling expanding `ProviderFailure`; broad guard weakening.

---

## 12. Boundary Rules

The environment-resolver files **may** import: their own `rendering` application types (the `ProviderCredentialResolver` port + token factory); `shared-kernel` if needed. They **must not** import `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`. No upstream module imports them. No `src/modules/{secrets,config,infrastructure,provider,llm}`; no `src/{api,providers,prompts}`. **No SDK dependency; no prompt-template files; no raw secrets; no `process.env`** (injected-map decision). Do not weaken guards broadly.

---

## 13. Relationship to Existing Architecture

- **Spec/Impl 021:** the opt-in live boundary exists with an **injected** `ProviderCredentialResolver`; Impl 022 supplies the first **environment** implementation of that port — nothing else in the live path changes.
- **Spec/Impl 020:** the selected-provider shell + serializer/parser/error-mapper exist and are reused unchanged.
- **Spec/Impl 019:** the async `ProviderClientBoundary` exists; the resolver feeds the same boundary.
- **Spec/Impl 018:** provider attempts are audited **raw-free**; a credential never enters that audit.
- **Spec/Impl 017:** the provider seam exists; provider drafts are **untrusted**.
- **Spec/Impl 014:** only validated drafts become a `RenderedMessage`.
- **Spec/Impl 015:** only validated `RenderedMessage`s may become records — resolution creates none.
- **Spec/Impl 016:** delivery only consumes display-eligible records; **provider success does not deliver**.
- **Spec/Impl 011:** event records are occurrence history; resolution appends none.
- **Spec/Impl 013:** a provider response is **not source material** unless separately reported by the athlete.

Clarifications: the secret resolver **remains behind `rendering/application`**; **credential availability is not live-call enablement**; provider output remains **draft text only**; `validateDraft` stays **mandatory**; the provider-attempt audit stays **raw-free**; secret handling is **not** delivery, **not** eventing, **not** model evaluation, **not** domain reasoning.

---

## 14. Open Questions (carried forward, non-blocking)

Whether/when a direct-`process.env` adapter is needed (and the one approved file for it); a production secret manager; deployment environment; secret rotation; live smoke tests outside the default suite; timeout limits; rate-limit behavior; streaming support; provider-metadata retention; cost/billing limits; production telemetry; provider event records. None resolved beyond this slice.

---

## 15. Implementation Task Preview

**Implementation 022 — Add injected environment credential resolver without `process.env` access**

Acceptance criteria:
- the resolver (`EnvironmentProviderCredentialResolver`) lives **inside `rendering/application`** and implements the existing `ProviderCredentialResolver`;
- it uses an **injected environment map** (`EnvironmentCredentialSource`), **not** direct `process.env` (no env token in the file or its comments);
- **no real environment variable is required in tests**; the default suite is deterministic;
- **no SDK/dependency change** (`package.json`/lockfile unchanged);
- **no live calls by default**; **credential availability does not enable live calls**; **policy disabled still prevents transport**;
- missing key → `missing`; blank/malformed → `invalid`; available → opaque `ProviderCredentialToken`;
- the **raw secret never appears** in errors/audit/state/tests/metadata;
- **no persistence/review/display/delivery/event side effects**; no domain mutation; `ProviderFailure` not expanded;
- `validateDraft` remains mandatory (via the unchanged live path); the provider-attempt audit stays raw-free when composed;
- **no `process.env` token** anywhere; **no guard exception**; all existing tests remain green (≈514), and the new resolver + negative-capability tests pass.

---

## 16. Technical Constraints

TypeScript strict; Node native test runner (`node --test`); no external test framework; no framework; no DB; no event bus; no automatic retry/scheduler; **no SDK dependency**; **no default live network**; **no CI credentials**; **no direct `process.env`** (injected-map decision); no prompt templates as production code; no raw secrets. No constructor parameter properties (private ctor + explicit fields, or frozen factory). `import type` where appropriate. Explicit field declarations. No arbitrary payload bags; no raw-bag rehydration without validation. Environment-resolver tests must be deterministic.

---

## 17. Success Criteria

After this tech spec, Implementation can build an injected environment credential resolver **without** relying on the real process environment, requiring credentials in CI, enabling live calls by itself, leaking raw secrets, or creating persistence/review/delivery/event side effects.

The implementation must answer:

> "Can Aurora resolve a provider credential from an injected environment source while keeping secrets transient, tests deterministic, live calls separately gated, and all domain boundaries intact?"

— and, by the plan above (injected `EnvironmentCredentialSource`, single configured key, the existing `ProviderCredentialResolution`/token, no `process.env` and thus no guard exception, the unchanged live-call separation, and the defining negative tests), the answer is **yes**.
