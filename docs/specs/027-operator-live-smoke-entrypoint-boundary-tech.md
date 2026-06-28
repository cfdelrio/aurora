# Aurora — Technical Spec 027A — Operator Live-Smoke Entry Point Implementation Plan

> Phase: **Technical Specification** (TS-strict plan, no code).
> Translates: `docs/specs/027-operator-live-smoke-entrypoint-boundary.md`.
> Status: this document fixes the **mechanism** for a manually-invoked operator entrypoint that wires the **real** opt-in / CI / credential inputs and the **real** live-provider collaborators into the *existing* `liveProviderSmoke(command, deps)` helper — and the minimal TS-strict shape for Implementation 027. **No code, no SDK, no dependency, no `package.json`/lockfile edit, no npm script, no CI live test, no real credentials, no production secret manager, no telemetry/model-eval, no retry/scheduler/event bus, no delivery, no persistence, no domain mutation.**

---

## 0. Phase confirmation

This is the **Technical Specification** phase, not Implementation.

- `[FACT]` This document plans; it changes no file under `src/`, adds no script, edits no `package.json`/`package-lock.json`, installs no dependency (devDeps stay `typescript` + `@types/node`).
- `[DECISION]` 027A picks: the entrypoint's placement + language/runtime; the opt-in / CI / credential / endpoint env mechanism; how it reads env **without** breaching the production `process.env` seal; the wiring of the existing live collaborators; the output format + exit-code policy; the testability split (pure `src` helpers vs. the thin script); the guard plan — and stops there.

---

## 1. Context recap

Spec 027 is complete. The helper the entrypoint wraps already exists and is proven (Impl 026); validation is `606/606`. Spec 027's behavioral rule: **the operator entrypoint is a manual adapter *around* `liveProviderSmoke` — it connects the wiring, it does not change what the wiring means.** It must keep the default suite deterministic, CI credential-free, output redacted, persist/deliver/record/mutate nothing, weaken no guard, and add no dependency. **Smoke proves wiring, not wisdom.**

`[GAP]` (Spec 027 §1) **There is no operator entrypoint** — the helper is proven with fakes, but nothing reads the real opt-in/CI flags or wires the real transport/credential adapter and invokes it. 026A §14 deferred this because the entrypoint that reads real env flags **cannot live inside `src/`** (the repo-wide `process.env` one-file guard), and `scripts/` is outside `tsconfig.include = ["src"]` and the test glob.

`[FACT]` **027A corrects 026A's pessimistic premise with empirical evidence (§5.20–5.29).** The repo already runs `.ts` directly (`node --test "src/**/*.test.ts"`), and **Node 22.22.2 natively type-strips and resolves `.ts` import specifiers** — verified: a plain `node scripts/x.mjs` (or `node scripts/x.ts`) **can import the real `src/modules/rendering/index.ts` and call `liveProviderSmoke` with no build and no dependency**. So an **executable operator entrypoint can ship now**; deferral to a "build-output slice" is **not** required. 027A therefore plans an **executable `.mjs` entrypoint + pure, typechecked, tested `src` support helpers**, not a runbook-only stub.

---

## 2. Central Question

> How can Aurora implement a **manual operator entrypoint** for `liveProviderSmoke(command, deps)` while guaranteeing that **default tests never invoke it**, **`npm run check` never invokes it by default**, **CI blocks before credential/transport**, **missing/malformed opt-in blocks before credential/transport**, **credentials/secrets and raw provider/rendered content are never printed**, **no persistence/delivery/event/orchestration/domain-mutation occurs**, **no SDK/dependency/package churn occurs (unless explicitly justified)**, and **the production `process.env` one-file guard is preserved**?

Answer shape (proven below): a **thin executable `scripts/operator-live-smoke.mjs`** (plain ESM, outside `src`, outside `tsconfig.include` and the test glob, outside every guard's scan root) that **reads the real operator env flags** (opt-in / CI / endpoint) and **wires the existing public surfaces** (`processEnvironmentCredentialSourceAdapter` → `EnvironmentProviderCredentialResolver`, `LiveCallPolicy.enabled()`, `LiveProviderClient` + `liveProviderHttpTransport({ endpoint })`) into a **single** `liveProviderSmoke(...)` call, then prints the helper's **redacted** result as JSON and sets an exit code. All **testable logic** (env→`{optIn,ci}` parsing, the synthetic request, the output projection, the exit-code mapping) lives in a **pure `src` support helper** that **reads no `process.env`** (typechecked + unit-tested via the default suite); the `.mjs` script is a trivial wrapper covered by a **structural-scan** test. **No npm script, no package/lockfile change, no dependency** — the operator runs `node scripts/operator-live-smoke.mjs`.

---

## 3. Required Technical Decisions

### `[DECISION]` Decision 1 — Entrypoint placement → **`scripts/operator-live-smoke.mjs`**
Outside `src` (so it can legitimately read `process.env` — §5.22/§5.23 show no guard scans it), outside `tsconfig.include = ["src"]`, outside the test glob `src/**/*.test.ts`, and outside the scan roots of **both** the process-env guard (`collectTsFiles(srcDir)`) and the live-provider guard (`collectTsFiles(renderingDir)`) — verified in §5. The name distinguishes the **operator entrypoint** from the pure `rendering/application` smoke helper. (No `ops/` — `scripts/` is the conventional, discoverable place for a manual dev tool and keeps it clearly non-production.)

### `[DECISION]` Decision 2 — Language/runtime → **plain `.mjs` ESM, run via `node scripts/operator-live-smoke.mjs` (no build, no dependency)**
`[FACT]` **Empirically verified (Node 22.22.2):** `node` runs `.ts` directly via native type-stripping, and a `.mjs` (or `.ts`) entry **imports the real `src` `.ts` modules** (with their `.ts` specifiers + `verbatimModuleSyntax`) and calls `liveProviderSmoke` — **no `tsc` build, no compiled output, no tooling, no dependency**. A `.mjs` is chosen over a `.ts` script so it is **plain JS by design** (never expected under `tsc --noEmit`, which only covers `src`): the **typed, checkable logic lives in `src` helpers** (Decision 13), and the script stays trivial glue. `[GAP]` A `.mjs` (or any `scripts/*`) is **not typechecked** by the default `typecheck` and **not run** by the default suite — that is exactly why all non-trivial logic moves into typechecked `src` helpers and the script is kept to wiring + I/O (Decision 13, §5.20). **This slice ships an executable entrypoint — it does not defer.**

### `[DECISION]` Decision 3 — npm script → **none in Implementation 027**
Do **not** modify `package.json`. The operator runs **`node scripts/operator-live-smoke.mjs`** directly (documented in a short header comment / the Implementation 027 task note). Reasons: an npm script would (a) churn `package.json`, (b) risk discoverability as a normal command, and (c) is unnecessary since the file runs directly. A package guard already asserts `dependencies` empty + `devDependencies == ["@types/node","typescript"]` (kept green). **No lockfile change** (none triggered without a dependency/script edit).

### `[DECISION]` Decision 4 — Env reading boundary → **the `.mjs` (outside `src`) reads non-secret operator flags directly; the credential flows through the approved adapter**
`[FACT]` The process-env one-file guard scans **`collectTsFiles(srcDir)`** (production `.ts` under `src`, excluding tests) — a `scripts/*.mjs` is **doubly out of scope** (not `.ts`, not under `src`). So the script may read `process.env.<opt-in>` / `process.env.CI` / `process.env.<endpoint>` directly **without adding a new in-`src/` token site and without weakening the guard**. The **credential value** is **not** read ad hoc: the script wires **`processEnvironmentCredentialSourceAdapter()`** (the **one approved in-`src` env read site**, Impl 023) → `EnvironmentProviderCredentialResolver`, so the secret read stays in the approved adapter. `[DECISION]` Non-secret operator flags (opt-in, CI, endpoint) are read in the script; the **secret credential is read only by the approved adapter**. The pure `src` support helper reads **no** `process.env` (it takes an injected map).

### `[DECISION]` Decision 5 — Opt-in flag → **`AURORA_LIVE_PROVIDER_SMOKE`, accepted value exactly `"1"`**
Absent or any value `!== "1"` → the parser yields `optIn: false` → `liveProviderSmoke` returns `not-enabled` **before** credential resolution/transport. No truthy variants (`"true"`/`"yes"` do **not** enable). Opt-in is **separate** from credential availability and **separate** from live-policy enablement.

### `[DECISION]` Decision 6 — CI detection → **`process.env.CI` truthy blocks**
A non-empty, non-`"false"`, non-`"0"` `CI` value → `ci: true` → `liveProviderSmoke` returns `ci-disabled` **before** credential resolution/transport. **No CI-live exception / allowlist in this slice** (a future CI-live lane is a separate spec, §14).

### `[DECISION]` Decision 7 — Credential key → **the existing `APPROVED_PROVIDER_CREDENTIAL_KEY` (`"AURORA_PROVIDER_CREDENTIAL"`)**
`[FACT]` Confirmed in real code (`process-environment-credential-source-adapter.ts`). The script calls `processEnvironmentCredentialSourceAdapter()` (defaults to that key) → `EnvironmentProviderCredentialResolver`. The secret is **never printed** (it lives only in the transient token / transport header); a missing/invalid credential → `liveProviderSmoke` returns `credential-missing`/`credential-invalid` **before** transport. **No env dump.**

### `[DECISION]` Decision 8 — Live policy → **`LiveCallPolicy.enabled({ timeoutMs })` for this invocation only**
The script constructs an **enabled** policy **after** the opt-in/CI gates would pass, and passes the **same** policy into both the `LiveProviderClient` and `liveProviderSmoke`'s deps (so the helper's explicit policy gate and the client's internal gate agree). It is a plain value object — **not global, not persisted, not a production rollout**; a disabled policy remains testable (in the helper's own tests) without transport.

### `[DECISION]` Decision 9 — Provider wiring → **existing public surfaces only; never bypass the helper/validator**
The script wires, from `rendering`'s public index (all confirmed exported, §5): `liveProviderHttpTransport({ endpoint })` → `LiveProviderClient({ policy, resolver, transport })`; `processEnvironmentCredentialSourceAdapter()` + `EnvironmentProviderCredentialResolver`; `LiveCallPolicy`; and **calls `liveProviderSmoke(command, deps)`**. It does **not** duplicate provider-call semantics, **not** call `requestRealProviderRendering`/`validateDraft`/the serializer/parser/error-mapper directly, **not** re-implement the gates or the one-call rule. The serializer/parser/error-mapper stay **inside** `LiveProviderClient`, unchanged.

### `[DECISION]` Decision 10 — Smoke input fixture → **a pure `src` `syntheticSmokeRenderingRequest()` builder**
A bounded, deterministic, **synthetic** `RenderingRequest` built in the `src` support helper (typechecked + reusable) — clearly non-athlete content (e.g. a `support`/`Reflection` renderable whose claims are `"operational smoke check — synthetic content"`), `uncertaintyVisibleRequired: true`, complete synthetic traceability, `agencyRequired: true`. **No** athlete-sensitive/real training data, **no** chain-of-thought, **no** production prompt template. The script does **not** import the test `fixtures.ts` (a test-only file); it imports the `src` builder.

### `[DECISION]` Decision 11 — Output format → **JSON only, one redacted object, to stdout**
The script prints `JSON.stringify(operatorSmokeOutput(result))` — one object. `operatorSmokeOutput` is a **pure `src` projection** of the (already redacted) `LiveProviderSmokeResult`. Allowed fields: `status`, `rawRetained: false`, `reason?`, `providerFailureCode?`, `validationPassed?`, `durationMs?` (if present), `wiringOnly: true` (when `status === "passed"`), and a `sideEffects: "none"` note. **Forbidden:** rendered-message body, raw provider response/request/draft, prompt/payload, secret/credential token, `process.env` value, chain-of-thought, delivery target/body, metadata bag. `[FACT]` The helper already guarantees redaction (`rawRetained: false`; no body/secret), so the projection cannot surface more than the closed result carries.

### `[DECISION]` Decision 12 — Exit codes → **0 for `passed` + safe skips; 1 for operational failures**
`operatorSmokeExitCode(status)` (pure `src`): **`0`** for `passed`, `not-enabled`, `ci-disabled` (the operator chose not to run / CI correctly blocked — not failures); **`1`** for `credential-missing`, `credential-invalid`, `live-policy-disabled`, `provider-failed`, `validation-failed`, `unexpected-failure` (operational failures an operator should notice). The status is always in the JSON regardless. (Rationale: distinguishes "didn't run / clean wiring" from "ran and something operational failed" without conflating either with a domain verdict.)

### `[DECISION]` Decision 13 — Testing the outside-`src` script → **pure `src` support helpers (unit-tested) + a structural scan of the script**
All decidable/redaction logic lives in a **pure, typechecked `src` support module** that **reads no `process.env`** (it takes an injected env `Record`): `parseOperatorSmokeEnv(env)`, `syntheticSmokeRenderingRequest()`, `operatorSmokeOutput(result)`, `operatorSmokeExitCode(status)`. These are **unit-tested deterministically** in the default suite (no env, no live call). The thin `.mjs` script is covered by a **structural-scan test** (read its text): it imports the support helpers + the wiring surfaces from `rendering`'s public index; imports **no** `delivery`/`event-recording`/`application-orchestration`/upstream-domain; references `liveProviderSmoke`; contains **no raw-secret/print-of-credential** pattern. **The script duplicates no `liveProviderSmoke` semantics** — it wires + delegates.

### `[DECISION]` Decision 14 — Package/lockfile policy → **no change**
No `package.json`/`package-lock.json` change in Implementation 027 (no npm script per Decision 3; no dependency). A package guard asserts this.

---

## 4. Live Surface Flow (operator script wires real inputs; the helper owns the gates)

```text
node scripts/operator-live-smoke.mjs           // manual; NEVER run by the suite / check / CI-by-default
 1. read real env: AURORA_LIVE_PROVIDER_SMOKE, CI, AURORA_LIVE_PROVIDER_ENDPOINT   (outside src — no guard breach)
 2. { optIn, ci } = parseOperatorSmokeEnv(process.env)                              // pure src helper
 3. source   = processEnvironmentCredentialSourceAdapter().toEnvironmentCredentialSource()   // approved src adapter
    resolver = new EnvironmentProviderCredentialResolver({ keyName: APPROVED_PROVIDER_CREDENTIAL_KEY, source })
 4. policy    = LiveCallPolicy.enabled({ timeoutMs })                               // this invocation only
    transport = liveProviderHttpTransport({ endpoint })
    client    = new LiveProviderClient({ policy, resolver, transport })
 5. result = await liveProviderSmoke(
        { optIn, ci, request: syntheticSmokeRenderingRequest() },                   // pure src builder
        { client, policy, resolver, config: { providerKind: "live" } })             // helper owns gates + ONE call
 6. process.stdout.write(JSON.stringify(operatorSmokeOutput(result)))               // pure src projection (redacted)
 7. process.exitCode = operatorSmokeExitCode(result.status)                         // pure src mapping
```

`[FACT]` The helper (`liveProviderSmoke`) still enforces **opt-in → CI → credential → live policy, each before any provider call**, the **one call (no loops/no re-issue)**, the **mandatory `validateDraft`**, and the **redacted result** — the script adds **no** gate, **no** retry, **no** delivery, **no** event, **no** persistence, **no** domain mutation. `validateDraft` is reached **only** through the helper → `requestRealProviderRendering`.

---

## 5. Surface Gap Analysis (from real code — exact signatures + verified runtime facts)

1. **`liveProviderSmoke(command, deps): Promise<LiveProviderSmokeResult>`** — `src/modules/rendering/application/live-provider-smoke.ts`, exported via `rendering/application/index.ts` (re-exported by `rendering/index.ts`). Owns the gates + one-call + redaction.
2. **`LiveProviderSmokeCommand`** = `{ optIn: boolean; ci: boolean; request: RenderingRequest }`. The script supplies all three (opt-in/ci parsed from env; request synthetic).
3. **`LiveProviderSmokeDependencies`** = `{ client: ProviderClientBoundary; policy: LiveCallPolicy; resolver: ProviderCredentialResolver; config: ProviderClientConfig; now?: () => number }`. The script wires the real client/policy/resolver/config.
4. **`LiveProviderSmokeResult`** = `{ status: LiveProviderSmokeStatus; rawRetained: false; validationPassed?: boolean; providerFailureCode?: string; reason?: string; durationMs?: number }`; `LiveProviderSmokeStatus` (9 closed). The projection/exit-code helpers consume these.
5. **`requestRealProviderRendering(...)`** is reached **only** inside `liveProviderSmoke` — the script never calls it directly.
6. **`processEnvironmentCredentialSourceAdapter(keyName = APPROVED_PROVIDER_CREDENTIAL_KEY): ProcessEnvironmentCredentialSourceAdapter`** + `.toEnvironmentCredentialSource(): EnvironmentCredentialSource`; `APPROVED_PROVIDER_CREDENTIAL_KEY = "AURORA_PROVIDER_CREDENTIAL"`; `defaultProcessEnvironmentAccessor` is the **only** in-`src` `process.env` read site. All exported from `rendering`'s index.
7. **`EnvironmentProviderCredentialResolver`** — `constructor(config: EnvironmentResolverConfig)`, `EnvironmentResolverConfig = { keyName: string; source: EnvironmentCredentialSource; validation?: CredentialValidationPolicy }`. Exported.
8. **Approved credential key** = `"AURORA_PROVIDER_CREDENTIAL"` (confirmed). Reused — no new key.
9. **`LiveCallPolicy`** = `{ enabled: boolean; timeoutMs: number; source? }` + factory `LiveCallPolicy.disabled()` / `LiveCallPolicy.enabled({ timeoutMs?, source? })`. Exported.
10. **`LiveProviderClient`** — `constructor(deps: LiveProviderClientDeps)`, `LiveProviderClientDeps = { policy: LiveCallPolicy; resolver: ProviderCredentialResolver; transport: LiveProviderTransport; kind? }`. Exported.
11. **`liveProviderHttpTransport({ endpoint: string }): LiveProviderTransport`** — native `fetch`, the **only** network-token file. Exported. The endpoint is an operator input (env), read by the script.
12. **Serializer/parser/error-mapper** (`serializeProviderInstruction` / `parseProviderResponse` / `mapProviderError`) stay **inside** `LiveProviderClient`; the script does not touch them.
13. **`ProviderClientConfig`** = `{ providerKind: string; timeoutMs?; modelRef? }` — non-secret. The script passes `{ providerKind: "live" }`.
14. **`ProviderSecretRef`** = `{ status: "present"|"missing"|"invalid"; ref? }` — set **inside** `liveProviderSmoke` (to `{ status: "present", ref: "ref:live" }`); the script does not construct it.
15. **Synthetic renderable** — the test `fixtures.ts` (`req`/`supportRenderable`) are **test-only**; the script must use a **new pure `src` builder** `syntheticSmokeRenderingRequest()` (Decision 10), not the fixtures.
16. **Default test command/glob** — `package.json` → `"test": "node --test \"src/**/*.test.ts\""`. `scripts/*.mjs` is **never matched** → the script never runs in the suite.
17. **`npm run check`** = `"npm run typecheck && npm run test"` — neither runs `scripts/`.
18. **`tsconfig.include = ["src"]`** — `scripts/` is **not typechecked** by `tsc --noEmit` (Decision 2 gap; mitigated by keeping logic in `src` helpers).
19. **`package.json` `"type": "module"`** — so a `.mjs` (and `.ts`) is ESM; native ESM `import` of `.ts` works.
20. `[FACT]` **Scripts outside `src` are NOT typechecked** by the default `typecheck` (`include: ["src"]`). Known limitation; the `.mjs` carries only trivial wiring.
21. `[FACT]` **Scripts outside `src` are NOT in the default test glob** (`src/**/*.test.ts`) → never auto-run.
22. `[FACT]` **The process-env one-file guard does NOT scan `scripts/`** — it scans `collectTsFiles(srcDir)` (verified: `srcDir = src`, filtered to non-test `.ts`). A `scripts/*.mjs` is doubly out of scope.
23. `[FACT]` **The process-env guard is scoped to production `.ts` under `src`** (excludes `*.test.ts` and `/tests/`) — confirmed.
24. `[FACT]` **The live-provider guard does NOT scan `scripts/`** — it scans `collectTsFiles(renderingDir)` (verified: `renderingDir = src/modules/rendering`). A `scripts/*.mjs` is out of scope.
25. `[FACT]` **No `package.json` manual-script convention exists** (only `typecheck`/`test`/`check`) → Decision 3 adds none.
26. `[FACT]` **Adding an npm script is unnecessary** (the file runs directly) and would be the only thing that could touch `package.json`/lockfile → avoided (Decision 14).
27. `[FACT]` **A `.mjs` CAN import current TypeScript `src` directly** — **verified empirically**: `node scripts/x.mjs` importing `src/modules/rendering/index.ts` and calling `liveProviderSmoke` returned `{ status: "passed", rawRetained: false }`, no build, no dependency (Node 22.22.2 native type-stripping + `.ts` specifier resolution).
28. `[FACT]` **No compiled output exists / is needed** — `tsc --noEmit` emits nothing, and **none is required** because Node strips types at runtime (the default test command already relies on this).
29. `[FACT]` **A script can safely import from `src` without build tooling** (same verification). The only caveat is §5.18/§5.20 (the script itself is untypechecked) — handled by Decision 13.
30. `[DECISION]` **Deterministic test coverage without live calls** — the pure `src` support helpers are unit-tested (injected env map; no live call); the `.mjs` script is structurally scanned (read, not executed). The default suite never makes a live call.

> `[GAP]` Net: the prompt's premise "Node cannot import `.ts` without tooling / `tsc --noEmit` produces no runnable output" is **false for this repo** — verified. 027A therefore **ships an executable `.mjs` entrypoint** (not a runbook-only deferral), with the **untypechecked-script** caveat mitigated by moving all real logic into typechecked, tested `src` helpers and keeping the script trivial.

---

## 6. Proposed File Layout

```text
scripts/operator-live-smoke.mjs                                              # thin executable adapter (plain ESM)
src/modules/rendering/application/operator-live-smoke-support.ts             # PURE helpers (no process.env read)
src/modules/rendering/application/index.ts                                   # + export the support helpers
src/modules/rendering/tests/operator-live-smoke-support.test.ts              # unit tests (deterministic, injected env)
src/modules/rendering/tests/operator-live-smoke-entrypoint-negative-capability.test.ts  # structural scan of the script + boundary
```

Must **not** create: a new top-level `src/modules/*` module; `src/{api,db,…}`; any event-bus/queue/scheduler/retry/telemetry/evaluation module. Must **not** edit `package.json`/`package-lock.json`; add no SDK/dependency; add no npm script. `[FACT]` The support file lives **inside `rendering`** → **no new top-level module → AC20 untouched**. Its filename (`operator-live-smoke-support.ts`) does **not** match the live-provider guard's `/(live-call|live-provider|provider-credential)/` (it is `live-smoke`), and it contains no `process.env`/network/vendor token regardless.

---

## 7. Types / Surfaces To Plan

All TS-strict (the `src` support file): `readonly` fields, explicit declarations, **no constructor parameter properties**, `import type` for type-only imports, no arbitrary bags. The pure helpers (the `.mjs` script imports these; it declares no types):

### `operator-live-smoke-support.ts` (pure; reads NO `process.env`)
```text
parseOperatorSmokeEnv(env: Readonly<Record<string, string | undefined>>): { readonly optIn: boolean; readonly ci: boolean }
   // optIn  = env["AURORA_LIVE_PROVIDER_SMOKE"] === "1"   (exact; no truthy variants)
   // ci     = isCiTruthy(env["CI"])                       (non-empty & not "false"/"0")

syntheticSmokeRenderingRequest(): RenderingRequest        // bounded, synthetic, no athlete data, no prompt template

operatorSmokeExitCode(status: LiveProviderSmokeStatus): 0 | 1
   // 0: passed | not-enabled | ci-disabled
   // 1: credential-missing | credential-invalid | live-policy-disabled | provider-failed | validation-failed | unexpected-failure

operatorSmokeOutput(result: LiveProviderSmokeResult): OperatorSmokeOutput   // pure, redacted projection
```

### `OperatorSmokeOutput` (closed, redacted; JSON-safe)
```text
readonly status: LiveProviderSmokeStatus
readonly rawRetained: false
readonly wiringOnly: boolean            // true iff status === "passed" — "wiring success only", not product readiness
readonly sideEffects: "none"            // literal — no persistence/delivery/event/domain mutation occurred
readonly validationPassed?: boolean
readonly providerFailureCode?: string
readonly reason?: string
readonly durationMs?: number
```
**Must not include:** a rendered-message body, raw draft/prompt/payload/response, a secret/credential token, a `process.env` value, chain-of-thought, a delivery target/body, an arbitrary metadata bag.

### `scripts/operator-live-smoke.mjs` (plain ESM; the only file that reads `process.env`)
Reads `AURORA_LIVE_PROVIDER_SMOKE` / `CI` / `AURORA_LIVE_PROVIDER_ENDPOINT` from `process.env`; imports the support helpers + `liveProviderSmoke` + `LiveCallPolicy` / `LiveProviderClient` / `liveProviderHttpTransport` / `EnvironmentProviderCredentialResolver` / `processEnvironmentCredentialSourceAdapter` / `APPROVED_PROVIDER_CREDENTIAL_KEY` from `rendering`'s public index; wires §4 steps 3–7. **No types declared, no env read in `src`, no gate logic of its own.**

---

## 8. Required Flow Semantics (exact order)

§4 steps 1–7. Invariants restated as checkable rules: the script reads env **only outside `src`**; the **credential is read only by the approved adapter**; the **pure support helpers read no `process.env`**; the script **calls `liveProviderSmoke` exactly once** and adds **no** gate/retry/loop; `validateDraft` is reached **only** via the helper; the output is the helper's **redacted** result projected by a pure function; the exit code is a pure function of the status; **nothing** is persisted/delivered/recorded/mutated; the script imports **no** `delivery`/`event-recording`/`application-orchestration`/upstream-domain module.

---

## 9. Required Failure Semantics (exact)

| Condition | Helper status (the script just projects it) | Exit code |
|---|---|---|
| Missing opt-in | `not-enabled` (before credential/transport) | 0 |
| Malformed opt-in (`!== "1"`) | `not-enabled` | 0 |
| CI detected | `ci-disabled` (before credential/transport) | 0 |
| Missing credential | `credential-missing` (before transport) | 1 |
| Invalid credential | `credential-invalid` (before transport) | 1 |
| Live policy disabled | `live-policy-disabled` (before transport) | 1 |
| Provider unavailable/timeout/malformed | `provider-failed` (+ `providerFailureCode`); **no retry** | 1 |
| Provider draft validation failure | `validation-failed`; provider output not trusted | 1 |
| Smoke passed | `passed` (`wiringOnly: true`) | 0 |
| Unexpected exception (in the helper) | `unexpected-failure` | 1 |
| Output/stdout write failure (script) | print nothing sensitive; non-zero exit; **no secret/raw body in any error** | 1 |

**No retry, no scheduler, no delivery, no persistence, no event, no domain mutation, no secret/raw body in output or errors** on any path.

---

## 10. Boundary / Import Rules

**Allowed** — the `.mjs` script: `process.env` (opt-in/CI/endpoint, outside `src`); `rendering`'s **public index** (`liveProviderSmoke`, `LiveCallPolicy`, `LiveProviderClient`, `liveProviderHttpTransport`, `EnvironmentProviderCredentialResolver`, `processEnvironmentCredentialSourceAdapter`, `APPROVED_PROVIDER_CREDENTIAL_KEY`); the new `operator-live-smoke-support.ts` (via the index). The `src` support helper: `rendering` types it projects (`LiveProviderSmokeResult`/`Status`, `RenderingRequest`) + `shared-kernel` if needed. **Forbidden** (both): a new **production `src` `process.env` read**; a **direct provider call** bypassing `liveProviderSmoke`; **`validateDraft` bypass**; imports of `delivery` / `event-recording` / `application-orchestration` (delivery path) / `observation`/`reasoning`/`understanding`/`athlete`; telemetry/model-evaluation; DB/schema/infrastructure; event-bus/scheduler/retry modules; SDK/dependency; a raw-output logger. The support helper must contain **no** `process.env` token (it takes an injected map).

---

## 11. Structural Guard Strategy (additive; nothing weakened)

A new `operator-live-smoke-entrypoint-negative-capability.test.ts` asserts:
- the **`src` support helper** contains **no `process.env` token** (assembled-from-fragments regex) → the repo-wide one-file guard stays green; and no network/vendor token.
- the support helper imports **no** `delivery`/`event-recording`/`application-orchestration`/upstream-domain module (import-spec scan).
- the **`scripts/operator-live-smoke.mjs`** file **exists**, **imports `liveProviderSmoke`** + the support helpers + the wiring surfaces from `rendering`'s index, imports **no** `delivery`/`event-recording`/`application-orchestration`/upstream-domain module, references **no** raw-secret print (no `console.log(process.env…)` / token dump pattern), and contains **no** retry/loop construct around the call.
- **no new top-level `src/modules/*` module**; none of the forbidden dirs; a **package guard** (`dependencies` empty, `devDependencies == ["@types/node","typescript"]`; `scripts` unchanged).

`[FACT]` Existing guards stay green **unchanged**: the process-env one-file guard (the support helper adds no token; the `.mjs` is out of its scan root), the live-provider guard (out of its scan root; the support filename doesn't match), AC20 (no new module). **No guard is weakened.**

---

## 12. Test Strategy (deterministic; no live call; negatives are defining)

Default: deterministic, **no live call, no real env, no CI credential, no dependency**. Required tests (≥ the prompt's 17), all in `src` (so they run in the default suite):
1. `parseOperatorSmokeEnv` — missing opt-in / malformed opt-in (`"true"`, `"0"`, `""`) → `optIn: false`; exact `"1"` → `optIn: true` (proves **no live invocation without exact opt-in**, at the parsing layer).
2. `parseOperatorSmokeEnv` — CI truthy → `ci: true`; CI absent/`"false"`/`"0"` → `ci: false`.
3. `operatorSmokeExitCode` — `passed`/`not-enabled`/`ci-disabled` → `0`; the six failures → `1`.
4. `operatorSmokeOutput` — every status projects a **redacted** object (`rawRetained: false`; `wiringOnly` true only for `passed`; `sideEffects: "none"`); a sentinel-absence scan over `JSON.stringify` proves no body/secret/env/draft token (build sensitive tokens from fragments).
5. `syntheticSmokeRenderingRequest()` — returns a bounded, synthetic, athlete-data-free request that **passes through `liveProviderSmoke` with a `FakeProviderClient({ scenario: "safe" })`** → `passed` (proves the synthetic input is valid wiring input, **with a fake**, no live call).
6. end-to-end **with fakes** — feed `parseOperatorSmokeEnv` + `syntheticSmokeRenderingRequest` + fake client/resolver/policy through `liveProviderSmoke` + `operatorSmokeOutput` + `operatorSmokeExitCode`: assert `passed` → exit `0`, redacted; `voice-escalating` → `validation-failed` → exit `1`; `unavailable` → `provider-failed` → exit `1`; missing-credential resolver → `credential-missing` → exit `1` (no transport).
7. structural — the `.mjs` script imports only allowed surfaces; imports no delivery/event/orchestration; references `liveProviderSmoke`; no raw-secret print; no retry/loop.
8. the **default suite does not invoke** the script and **does not make a live call** (it is not in the glob; the tests use fakes); `npm run check` runs only typecheck + the suite.
9. the **support helper contains no `process.env` token**; the production process-env one-file guard remains green.
10. **no** event-bus/queue/scheduler/retry/telemetry/DB module; **no** package/lockfile change.
11. **all Impl 001–026 tests continue to pass** (`606` → `606 + new`).

`[FACT]` Every test achieves its guarantee **without a live call** — the pure helpers + fakes carry the behavior, and the script is read, not executed.

---

## 13. Persistence / Delivery / Event rules

Implementation 027 must **not**: persist anything (no rendered-message record / review / display eligibility / delivery record / event append); call `delivery` or the `application-orchestration` delivery path; record an occurrence event; create evidence or an athlete decision; mutate `athlete`/`understanding`/`decision-support`/`reasoning`; create an event bus / scheduler / retry / queue / telemetry-eval infra / DB-schema; alter `liveProviderSmoke` / `requestRealProviderRendering` / `validateDraft` / the serializer-parser-error-mapper / the credential resolvers / the process-env guard. The script **wires and delegates**; the support helpers **parse/project**.

---

## 14. Open Questions (carried forward, non-blocking)

- a **production secret manager** behind the same injected resolver/source seam; a **future CI-live lane** (separate spec); a **production live-call rollout** (real endpoint policy); an **`application-orchestration` end-to-end live smoke**; a **delivery-provider integration**; **telemetry/model evaluation**; production **DB/schema**; **UI/API**;
- whether to later **typecheck `scripts/`** (e.g. a `tsconfig.scripts.json` or extending `include`) so the `.mjs`/`.ts` adapter is gated — deferred to keep this slice's diff minimal;
- whether the operator **endpoint** belongs in env (`AURORA_LIVE_PROVIDER_ENDPOINT`) or a CLI arg, and whether a **runbook doc** (`docs/operations/…`) should accompany the script.

None resolved beyond this slice.

---

## 15. Relationship to Existing Architecture

- **Spec/Impl 026:** the script **calls `liveProviderSmoke(command, deps)`** and **duplicates no smoke semantics** (gates/one-call/validation/redaction stay in the helper).
- **Spec/Impl 025:** the script does **not** call the `application-orchestration` delivery path.
- **Spec/Impl 024:** the script records **no** occurrence event.
- **Spec/Impl 023:** the production `src` env seal stays intact — the credential is read **only** by the approved `ProcessEnvironmentCredentialSourceAdapter`; the script reads non-secret operator flags **outside `src`**, breaching no guard.
- **Spec/Impl 022:** the env source is classified by `EnvironmentProviderCredentialResolver` (unchanged).
- **Spec/Impl 021:** `LiveCallPolicy` stays **fail-closed**; enabled **for this invocation only**.
- **Spec/Impl 020/019:** the serializer/parser/error-mapper + async `ProviderClientBoundary` stay **unchanged**, used via `LiveProviderClient`.
- **Spec/Impl 018:** **no** provider-attempt audit persistence.
- **Spec/Impl 017/014:** provider drafts stay **untrusted**; `validateDraft` stays **mandatory** (via the helper).
- **Spec/Impl 015/016:** **no** rendered-message persistence; **no** delivery.
- **Spec/Impl 011:** **no** event/outcome record.
- **Spec/Impl 013:** a provider response is **not** source material — the script creates no observation/evidence.

Clarifications: the operator entrypoint is a **manual adapter around the existing wiring check** — not new smoke semantics, not domain reasoning, not delivery, not event recording, not a production rollout, not model evaluation, not telemetry, not a secret manager.

---

## 16. Implementation Task Preview

**Implementation 027 — Add manual operator live-smoke entrypoint**

Acceptance criteria:
- a thin executable **`scripts/operator-live-smoke.mjs`** (runs via `node scripts/operator-live-smoke.mjs`; no build, no dependency, no npm script) that **calls `liveProviderSmoke(command, deps)`** — it **does not duplicate smoke semantics**;
- pure, typechecked **`src` support helpers** (`parseOperatorSmokeEnv` / `syntheticSmokeRenderingRequest` / `operatorSmokeOutput` / `operatorSmokeExitCode`) that **read no `process.env`** and are unit-tested in the default suite;
- **no default live call**, **no CI live call**: the script is outside the test glob; the suite uses fakes; **CI blocks** (`ci-disabled`) before credential/transport;
- **opt-in required** (`AURORA_LIVE_PROVIDER_SMOKE === "1"`; else `not-enabled` before credential/transport); **credential required** (via the approved adapter; missing/invalid stop before transport);
- **output redacted** (JSON, `rawRetained: false`, `wiringOnly`/`sideEffects: "none"`; no rendered body / raw draft / payload / response / secret / env value); **exit 0** for `passed`/`not-enabled`/`ci-disabled`, **1** for operational failures;
- **no persistence, no delivery, no event recording, no orchestration delivery path, no evidence/athlete-decision/domain mutation**;
- **no SDK/dependency, no `package.json`/lockfile change**; the production `process.env` one-file guard + the live-provider guard stay green; **AC20 untouched**;
- **deterministic tests** (pure helpers + fakes + a structural scan of the script), **no live call**; and **all Impl 001–026 tests remain green** (`606` + new).

---

## 17. Technical Constraints

TypeScript strict for `src` code; Node native test runner; no external test framework; no framework; no DB; no event bus; no scheduler; no queue; no retry; no telemetry/model-eval infra; no SDK dependency; no default live network; no CI credentials; no prompt templates as production code; no raw secrets. **No constructor parameter properties** (the support helpers are pure functions + plain value objects with explicit `readonly` fields). `import type` where appropriate. **No arbitrary payload bags; no raw-bag rehydration without validation.** Tests are **deterministic** and make **no live calls**. The `.mjs` script is plain ESM (no types); all type-checked logic lives in `src`.

---

## 18. Success Criteria

After this tech spec, Implementation 027 can ship an **honest, executable** operator-entrypoint slice — a thin `scripts/operator-live-smoke.mjs` that invokes `liveProviderSmoke` through a **dependency-free runtime path verified to work** (Node 22.22 native type-stripping) — preserving every guard, with all testable logic in pure `src` helpers. It does **not** pretend a non-runnable script is a working entrypoint, and it does **not** falsely defer on a premise that is empirically untrue for this repo.

The implementation must answer:

> "Can Aurora provide a manual operator entrypoint for live-provider smoke **without** default/CI live calls, **without** raw output, **without** persistence/delivery/event/domain side effects, **without** package/dependency churn (unless justified), and **without** weakening the production env guard?"

— and, by the executable `.mjs` outside every guard's scan root (Decisions 1/2, §5.20–5.29), the env-reading boundary that keeps the secret in the approved adapter and the production `src` seal intact (Decisions 4/7), the wiring that delegates entirely to the unchanged `liveProviderSmoke` → `validateDraft` (Decisions 8/9), the redacted JSON output + exit-code policy (Decisions 11/12), the pure-`src`-helper testability split with a structural script scan (Decision 13, §12), and additive guards with nothing weakened (§11), the answer is **yes**.
