# Aurora — Technical Spec 023A — Direct Process-Environment Adapter Implementation Plan

> Phase: **Technical Specification** (TS-strict plan, no code).
> Translates: `docs/specs/023-direct-process-environment-adapter-boundary.md`.
> Status: this document fixes the **technical mechanism** for the first adapter that reads the real process environment and the minimal TS-strict shape for Implementation 023. **No code, no API key, no live call, no SDK, no dependency, no production prompt template, no event-catalog change, no broad guard weakening.**

---

## 0. Phase confirmation

This is the **Technical Specification** phase, not Implementation.

- `[FACT]` This document plans; it changes no file under `src/`. No dependency is installed; `package.json`/`package-lock.json` are untouched by 023A.
- `[DECISION]` 023A picks the adapter layout, the single approved process-environment file, the accessor mechanism (injectable + one default accessor), the key/redaction policies, the guard strategy, and the test strategy — and stops there.

---

## 1. Context recap

Spec 023 (`023-direct-process-environment-adapter-boundary.md`) is complete. Aurora (post Impl 022) has the full provider edge plus **credential resolution from an injected source**: `EnvironmentProviderCredentialResolver` reads one configured key from an injected `EnvironmentCredentialSource` (`Readonly<Record<string, string | undefined>>`) and returns the existing `ProviderCredentialResolution` with an opaque transient `ProviderCredentialToken`; `LiveProviderClient` + `LiveCallPolicy` (disabled by default) gate the transport; `validateDraft` is the authority; the audit is raw-free.

What does **not** exist: **any direct process-environment access** — **`process.env` appears nowhere in `src/`** (verified) — a production secret manager, API keys, a real SDK/dependency, production prompts, provider events, UI/API, scheduler/event bus, production DB.

Spec 023's boundary: a process-environment adapter is **operational** — it adapts the real environment into the existing `EnvironmentCredentialSource` shape, **feeds** (does not replace) the resolver, **enables no live call by itself**, and **never persists/audits/logs a secret**; the env token must live in **one approved file** only.

---

## 2. Central Question

> How can Aurora implement a single approved adapter from the real process environment into the existing injected `EnvironmentCredentialSource` shape while preserving deterministic tests, avoiding real CI credentials, keeping live calls separately gated, and preventing secret leakage or domain contamination?

Answer shape (proven below): add a **`ProcessEnvironmentCredentialSourceAdapter`** that takes an **injected `ProcessEnvironmentAccessor`** (`(key: string) => string | undefined`) and produces an `EnvironmentCredentialSource` containing **only** the one approved key; a single **`defaultProcessEnvironmentAccessor`** in the **same one approved file** is the only place the `process.env` token appears (it reads the real environment, used only in production wiring, never by the default suite). Tests inject a fake accessor; the resolver still classifies; the `LiveCallPolicy` still gates; `validateDraft` remains the authority. A **new repo-wide guard** asserts the env token appears in **exactly** that one production file.

---

## 3. Required Technical Decisions

### `[DECISION]` Decision 1 — Direct read vs injectable accessor → **injectable accessor + one default accessor**

Use a **two-layer adapter**: (1) `ProcessEnvironmentCredentialSourceAdapter` accepts an **injected accessor** for deterministic tests; (2) a single **`defaultProcessEnvironmentAccessor`** function reads the real process environment and is the **only** place the process-environment token appears.

Rationale: tests use a fake accessor (no real env, no CI credential, no live call); the real binding boundary is introduced and **sealed** to one file; the guard assertion is **positive and narrow**; `EnvironmentProviderCredentialResolver` is unchanged; process access stays separate from secret classification.

> `[DECISION]` The adapter constructor **requires** an accessor (no implicit default), so a test can never accidentally read the real environment; production wiring uses a named factory that supplies `defaultProcessEnvironmentAccessor`. (See §7.)

### `[DECISION]` Decision 2 — Approved file

```text
src/modules/rendering/application/process-environment-credential-source-adapter.ts
```
This is the **only** production file where the process-environment token may appear — **not in any other file, including comments**.

### `[DECISION]` Decision 3 — Adapter responsibility

The adapter produces an `EnvironmentCredentialSource`. It must **not** classify credentials, call `EnvironmentProviderCredentialResolver`, call `LiveProviderClient`, call the transport, call the provider, call `validateDraft`, or persist/audit/log.

### `[DECISION]` Decision 4 — Approved key policy → neutral, explicit, configured

Use an explicit configured key; recommended neutral name **`AURORA_PROVIDER_CREDENTIAL`**. No vendor token (guards forbid it); no dynamic key construction from domain data; no fallback scan; no list of alternatives.

### `[DECISION]` Decision 5 — Accessor shape

```text
type ProcessEnvironmentAccessor = (key: string) => string | undefined;
```
The adapter calls it **once** for the configured key. The **default production accessor** reads the real process environment (the one token site). Tests inject a fake accessor.

### `[DECISION]` Decision 6 — Structural guard exception → **add a positive repo-wide guard, weaken nothing**

`[FACT]` (Surface-gap, §5.) **No existing guard forbids the env token repo-wide** — each provider/credential guard scans only its own selector's file set, and the new adapter filename (`process-environment-credential-source-adapter.ts`) matches **none** of those selectors (`/provider-/`, the real-provider set, `/concrete-provider/`, `/(live-call|live-provider|provider-credential)/`, `/environment-provider-credential/`). So the env token in the new file trips **no existing guard**, and **nothing needs weakening**.

`[DECISION]` Impl 023 **adds** a new guard (in `process-environment-negative-capability.test.ts`) that scans **all production `src/` files** (excluding `.test.ts` / `/tests/`) and asserts the process-environment token appears in **exactly** `process-environment-credential-source-adapter.ts` and **nowhere else** — a positive, repo-wide assertion that is *stronger* than today's per-selector coverage. Vendor/SDK/network/prompt-template guards stay unchanged; the network token stays confined to the Impl 021 transport file.

### `[DECISION]` Decision 7 — Default tests

Default tests use a **fake accessor**, require no real env, no real credential, and make no live call; they assert the default-accessor file is the only token site and that no secret leaks through the adapter → resolver → client → audit composition.

### `[DECISION]` Decision 8 — Live-call separation

The adapter does **not** enable live calls. Even with the key present: the resolver classifies, `LiveCallPolicy.disabled()` still prevents the transport, no transport is invoked unless the policy is enabled **and** the credential is available, and provider output still passes `validateDraft`.

---

## 4. Integration Flow

```text
processEnvironmentCredentialSourceAdapter(keyName, defaultProcessEnvironmentAccessor)  // production wiring
  → ProcessEnvironmentCredentialSourceAdapter.toEnvironmentCredentialSource()
       → accessor(keyName) called ONCE                    // the only real-env read, in the one approved file
       → EnvironmentCredentialSource { [keyName]: value } // only that key, when defined; empty otherwise
  → new EnvironmentProviderCredentialResolver({ keyName, source })   // UNCHANGED — still classifies
  → ProviderCredentialResolution (missing | invalid | available+token)
  → LiveProviderClient
       → LiveCallPolicy gate            // disabled → failed(provider-unavailable); NO transport
       → resolver.resolve()             // missing/invalid → failed(...); NO transport
       → serialize → LiveProviderHttpTransport (only if enabled AND available)
       → parse/map → ProviderClientResponse → RealProviderAdapter → validateDraft → ProviderRenderOutcome
  → optional raw-free auditProviderAttempt(...)
```

Rules: (1) the adapter does not classify; (2) it does not enable a live call; (3) it does not call the transport; (4) it does not call the resolver (the caller composes them) unless 023A chose a composed helper — **it did not**; (5) its output contains only the approved key; (6) the resolver still classifies; (7) policy disabled prevents transport even if the source has a value; (8) credential failure prevents transport even when the policy is enabled; (9) no raw credential enters audit/errors/domain; (10) no persistence/review/display/delivery/event.

---

## 5. Surface Gap Analysis (from real code)

1. **`EnvironmentCredentialSource`** (`application/environment-provider-credential-resolver.ts`): `Readonly<Record<string, string | undefined>>`. The adapter produces exactly this. **Reused as-is.**
2. **`EnvironmentProviderCredentialResolver` config** (same file): `EnvironmentResolverConfig { keyName: string; source: EnvironmentCredentialSource; validation?: CredentialValidationPolicy }`; `resolve(): ProviderCredentialResolution`. **Unchanged** — the adapter feeds `source` with the same `keyName`.
3. **`ProviderCredentialResolver`** (`application/provider-credential-resolver.ts`): `{ resolve(): ProviderCredentialResolution }`.
4. **`ProviderCredentialResolution`** (same file): `{ status:"available"; token } | { status:"missing" } | { status:"invalid" }`. **Closed; reused.**
5. **`ProviderCredentialToken`** (same file): branded `string` via `providerCredentialToken(...)`. The adapter does **not** create tokens (the resolver does); the adapter only passes through the raw value inside the source.
6. **`LiveProviderClient`** (`application/live-provider-client.ts`): checks `policy.enabled` first (disabled → `provider-unavailable`, no resolve/transport), then `resolver.resolve()` (missing/invalid → fail before transport). **Unchanged.**
7. **`LiveCallPolicy`** (`application/live-call-policy.ts`): `disabled()` / `enabled({timeoutMs})`; separate from credential resolution. **Unchanged.**
8. **Provider-attempt audit** (`application/provider-attempt-audit-service.ts`): pure, observe-only, raw-free. A credential/env value never enters it. **Unchanged; explicit composition only.**
9. **No-raw-secret tests already present** (Impl 019/021/022): outcomes/audit assert no `secret`/`apikey`/`credential`/token leak; Impl 022's `environment-secret-negative-capability.test.ts` asserts no env token in `/environment-provider-credential/` files. Impl 023 extends the posture to the real-env value.
10. **Structural guard selectors + token regexes** (verified): `provider-negative-capability` (`/provider-/`; nonNetwork `\b(openai|anthropic|axios)\b|process\.env`), `real-provider-negative-capability` (real-provider set; combined incl. `process\.env`), `concrete-provider-negative-capability` (`/concrete-provider/`; `sdkNetEnv` incl. `process\.env`), `live-provider-negative-capability` (`/(live-call|live-provider|provider-credential)/`; incl. `process\.env`), `environment-secret-negative-capability` (`/environment-provider-credential/`; `process\s*\.\s*env`). All exclude `.test.ts` / `/tests/`.
11. `[FACT]` **`process.env` currently appears nowhere in `src/`** — but **no single guard forbids it repo-wide**; each guard forbids it only within its own file set. **No guard's selector matches the new adapter filename** (§3 Decision 6), so adding the token there trips nothing — and Impl 023 **adds** the repo-wide positive guard.
12. **Package state**: devDeps only `@types/node ^22.20.0` + `typescript ^5.9.3`; no runtime deps; lockfile present. **No dependency added.**
13. `[GAP]` **The adapter filename matches none of the existing selectors** — so the existing guards neither scan nor protect it. The new negative-capability test must therefore (a) add the repo-wide env-token assertion and (b) add the adapter's own import-boundary checks (no upstream/`delivery`/`event-recording`; nothing outside `rendering` imports it).
14. `[FACT]` **The process-environment token appears nowhere today** (a clean baseline for the positive "exactly one file" assertion).
15. `[FACT]` **The guard exception is naturally limited to one file** — only the default accessor reads the real environment; the adapter logic and the injected-accessor path contain no token.
16. `[FACT]` **Tests can fake the accessor with zero real-env access** — the accessor is `(key) => string | undefined`, so a test passes a deterministic closure; the default real-env accessor is never invoked by the default suite.

> `[GAP]` No name conflicts. Impl 023 is additive — one adapter file + tests + index exports + one new repo-wide guard — with **no existing-guard weakening** and **no dependency change**.

---

## 6. Proposed File Layout

Production:
```text
src/modules/rendering/application/process-environment-credential-source-adapter.ts
```
Tests:
```text
src/modules/rendering/tests/process-environment-credential-source-adapter.test.ts
src/modules/rendering/tests/process-environment-negative-capability.test.ts
```
Additive index updates if needed: `src/modules/rendering/application/index.ts` (+ `rendering/index.ts` via `export *`).

**Do not** create an env adapter outside `rendering`; **do not** create a config/infrastructure/secrets module; **do not** edit `package.json`/lockfile; **do not** add an SDK, prompt templates, or live smoke tests.

---

## 7. Types / Surfaces To Plan

All TS-strict, `readonly` fields, explicit declarations, **no constructor parameter properties**, `import type` where applicable, no arbitrary bags.

### `ProcessEnvironmentAccessor`
```text
type ProcessEnvironmentAccessor = (key: string) => string | undefined;
```
Called **once** per approved key; tests inject a fake; the default accessor is the only real-env read site.

### `ProcessEnvironmentCredentialSourceAdapter`
```text
interface ProcessEnvironmentAdapterConfig {
  readonly keyName: string;                       // explicit, neutral, non-empty
  readonly accessor: ProcessEnvironmentAccessor;  // REQUIRED — no implicit default
}
class ProcessEnvironmentCredentialSourceAdapter {
  // private ctor + explicit fields + factory
  toEnvironmentCredentialSource(): EnvironmentCredentialSource
}
```
Behavior: validate the configured key name (non-empty, trimmed); call the accessor **once** with that key; return a source containing **only** that key when the value is defined, else an empty source. It must **not**: scan keys; infer the key; classify the value; validate credential shape; call the resolver/live client/transport/provider/validator; persist/audit/log.

### `defaultProcessEnvironmentAccessor` (the one token site)
A `ProcessEnvironmentAccessor` isolated in the **same approved file** — the only direct real-env read; not used by the default suite; no logging; no fallback scan; no domain input.

### `processEnvironmentCredentialSourceAdapter(keyName)` (production factory, same file)
A convenience factory that wires the default accessor for production composition — so the only construction that reads the real environment is explicit and confined to this file.

### `ApprovedSecretKey`
A neutral constant/configured value (e.g. `AURORA_PROVIDER_CREDENTIAL`) — no vendor token, no domain-derived name, no fallback list, no raw-secret example.

### `SecretRedactionPolicy` (implicit via result types + tests)
The raw secret/env value is absent from: errors; audit summaries; provider-attempt records; rendered messages; logs; tests; docs examples; snapshots.

---

## 8. Structural Guard Strategy

`[DECISION]` Impl 023 **adds** a new guard; it weakens none.
- The new `process-environment-negative-capability.test.ts` scans **all production `src/` files** (recursively from `srcDir`, excluding `.test.ts` / `/tests/`) and asserts the process-environment token (`/process\s*\.\s*env/`) appears in **exactly** `process-environment-credential-source-adapter.ts` and **nowhere else** (a positive `deepEqual` on the matching basenames).
- Vendor / SDK / network / prompt-template guards stay **unchanged**; the network token stays confined to the Impl 021 transport file; the env-resolver (Impl 022) and provider guards stay green (the adapter filename is outside their selectors, and they hold no token).
- The adapter file must keep the token to the **default accessor only** — not in the adapter class, not in comments elsewhere.
- `[FACT]` The negative-capability **test file** legitimately contains the regex `process\s*\.\s*env`; because the repo-wide scan excludes `/tests/`, test files are not falsely flagged.

---

## 9. Test Strategy

Default tests: **fake accessor only, no real env, no real credential, no live call, deterministic.**
1. the adapter reads **only** the approved key (an unrelated key the fake accessor would return is never requested);
2. the adapter calls the accessor **exactly once**;
3. a missing value → an **empty** injected source;
4. a present value → a source containing **only** the approved key;
5. the adapter does **not** classify malformed/blank values (it passes them through; the resolver decides);
6. the resolver still classifies the adapter output (missing/invalid/available end-to-end);
7. credential availability does **not** enable a live call if the policy is disabled (spy transport never called);
8. policy disabled prevents transport even with an adapter-provided credential;
9. credential failure prevents transport when the policy is enabled;
10. the raw secret never appears in adapter errors/results;
11. the raw secret never appears in the provider-client outcome;
12. the raw secret never appears in the audit when composed;
13. the default suite requires **no real env**;
14. the process-environment token appears **only** in the approved adapter file (repo-wide assertion);
15. **no SDK/dependency change**;
16. **no prompt-template files**;
17. **no persistence/review/display/delivery/event side effects**;
18. **all existing tests from Implementations 001–022 continue to pass** (≈532).

The negative tests are defining tests.

---

## 10. Persistence / Review / Delivery / Event rules

Implementation 023 must **not**: create/save a `RenderedMessageRecord`; append a review; mark display-eligible; call delivery; create a `DeliveryRecord`; append event records; expand the event catalog; create provider-attempt event records; trigger retry/scheduler; persist provider attempts automatically; persist a raw provider response; persist a prompt payload; **persist a secret**; or persist env variable names where they could become audit/domain payload. The adapter ends at an `EnvironmentCredentialSource`.

---

## 11. Negative Capability (structurally impossible / test-failing)

The process-environment token outside the approved adapter file; a real env required in the default suite; arbitrary env scan; a dynamic env-var name from domain data; the adapter classifying credential values; the adapter enabling live calls; the adapter invoking transport/provider/`validateDraft`; a raw credential in audit/state/errors/tests/docs; a raw credential in provider metadata; an SDK dependency; prompt-template files; the adapter importing `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`; a secret failure invalidating domain output; secret handling expanding `ProviderFailure`; broad guard weakening.

---

## 12. Boundary Rules

The process-env adapter file **may** import: its own `rendering` application types (`EnvironmentCredentialSource`); `shared-kernel` if needed. It **must not** import `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`. No upstream module imports it. No `src/modules/{secrets,config,infrastructure,provider,llm}`; no `src/{api,providers,prompts}`. **No SDK dependency; no prompt-template files; no raw secrets.** The process-environment token is allowed **only** in the approved adapter file; the network token remains **only** in the approved transport file. Do not weaken guards broadly.

---

## 13. Relationship to Existing Architecture

- **Spec/Impl 022:** the injected environment credential resolver exists; Impl 023 supplies the first **real-environment producer** of the `EnvironmentCredentialSource` shape it consumes — the resolver is unchanged and still classifies.
- **Spec/Impl 021:** the opt-in live boundary exists; the `LiveCallPolicy` still gates the transport.
- **Spec/Impl 020:** the selected-provider shell + serializer/parser/error-mapper exist and are unchanged.
- **Spec/Impl 019:** the async `ProviderClientBoundary` exists; the resolved credential feeds the same boundary.
- **Spec/Impl 018:** provider attempts are audited **raw-free**; a credential/env value never enters that audit.
- **Spec/Impl 017:** the provider seam exists; provider drafts are **untrusted**.
- **Spec/Impl 014:** only validated drafts become a `RenderedMessage`.
- **Spec/Impl 015:** only validated `RenderedMessage`s may become records — the adapter creates none.
- **Spec/Impl 016:** delivery only consumes display-eligible records; **provider success does not deliver**.
- **Spec/Impl 011:** event records are occurrence history, **not provider commands**; the adapter appends none.
- **Spec/Impl 013:** a provider response is **not source material** unless separately reported by the athlete.

Clarifications: the process-env adapter **remains behind `rendering/application`**; it **feeds the injected source shape** (the resolver still classifies); **credential availability is not live-call enablement**; provider output remains **draft text only**; `validateDraft` stays **mandatory**; the provider-attempt audit stays **raw-free**; secret handling is **not** delivery, **not** eventing, **not** model evaluation, **not** domain reasoning.

---

## 14. Open Questions (carried forward, non-blocking)

A production secret manager; secret rotation; deployment environment; live smoke tests outside the default suite; timeout limits; rate-limit behavior; streaming support; provider-metadata retention; cost/billing limits; production telemetry; provider event records. None resolved beyond this slice.

---

## 15. Implementation Task Preview

**Implementation 023 — Add one-file process-environment source adapter for the credential resolver**

Acceptance criteria:
- the adapter (`ProcessEnvironmentCredentialSourceAdapter`) lives **inside `rendering/application`** and produces an `EnvironmentCredentialSource`;
- it **does not replace** `EnvironmentProviderCredentialResolver` (the resolver still classifies);
- the direct process-read token appears **only** in the approved adapter file (`process-environment-credential-source-adapter.ts`) — a repo-wide guard asserts it is the only file;
- default tests use a **fake accessor**; **no real env** is required;
- **no SDK/dependency change** (`package.json`/lockfile unchanged);
- **no live calls by default**; **credential availability does not enable live calls**; **policy disabled still prevents transport**;
- the **raw secret never appears** in errors/audit/state/tests/metadata;
- **no persistence/review/display/delivery/event side effects**; no domain mutation; `ProviderFailure` not expanded;
- `validateDraft` remains mandatory (via the unchanged live path); the provider-attempt audit stays raw-free when composed;
- all existing tests remain green (≈532), and the new adapter + negative-capability tests pass.

---

## 16. Technical Constraints

TypeScript strict; Node native test runner (`node --test`); no external test framework; no framework; no DB; no event bus; no automatic retry/scheduler; **no SDK dependency**; **no default live network**; **no CI credentials**; no prompt templates as production code; no raw secrets. No constructor parameter properties (private ctor + explicit fields, or frozen factory). `import type` where appropriate. Explicit field declarations. No arbitrary payload bags; no raw-bag rehydration without validation. Process-env adapter tests must be deterministic (fake accessor; no real env).

---

## 17. Success Criteria

After this tech spec, Implementation can build one direct process-environment adapter **without** requiring real env in tests, enabling live calls by itself, leaking raw secrets, weakening guards broadly, or creating persistence/review/delivery/event side effects.

The implementation must answer:

> "Can Aurora bind the injected environment credential resolver to the real process environment through exactly one approved adapter while keeping secrets transient, tests deterministic, live calls separately gated, and all domain boundaries intact?"

— and, by the plan above (an injectable accessor + a single default accessor confined to one approved file, the unchanged resolver doing classification, a new positive repo-wide env-token guard, the unchanged live-call separation, and the defining negative tests), the answer is **yes**.
