# Aurora — Specification 027 — Operator Live-Smoke Entry Point Boundary

> Phase: **Specification** (behavioral; no code).
> Builds on: `026-live-provider-smoke-test-boundary.md`, `026-live-provider-smoke-test-boundary-tech.md`, `025-explicit-application-orchestration-boundary.md`, `024-provider-rendering-delivery-event-surface.md`, `023-direct-process-environment-adapter-boundary.md`, `022-environment-secret-resolver-boundary.md`, `021-live-provider-call-enablement-boundary.md`, `020-real-provider-adapter-implementation-boundary.md`, `019-real-provider-integration-boundary.md`, `018-provider-attempt-audit-boundary.md`, `017-provider-adapter-boundary.md`, `014-llm-rendering-boundary.md`, `015-rendered-message-review-persistence.md`, `016-delivery-boundary.md`, `011-domain-event-outcome-records-traceability-envelope.md`, `013-manual-input-adapter.md`.
> Output of this document: a behavioral contract for a **manually-invoked operator entrypoint** that wires the **real** opt-in / CI / credential inputs and the **real** live-provider collaborators into the *existing* `liveProviderSmoke(command, deps)` helper — while preserving every Impl 026 guarantee: **no default/CI live call, redacted output, no credential leakage, no persistence/delivery/event/domain mutation, no package/dependency churn (unless 027A explicitly justifies it), and no weakening of the production `process.env` one-file seal.** **No code, no technical-spec decisions, no script, no npm script, no `package.json`/lockfile edit, no SDK/dependency, no CI live test, no real credentials, no production secret manager, no telemetry/model-eval, no retry/scheduler/event bus.**

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification (027A), not Implementation.

- `[FACT]` This document describes **behavior**. It names a **candidate** operator flow and its rules; it defines no script, no file layout, no opt-in/CI mechanism, no output format, and resolves no technical placement (deferred to 027A, §14).
- `[DECISION]` Spec 027 opens **one** edge only: a **thin, manual operator adapter** *around* the *already-existing* `liveProviderSmoke` helper. It **wires** the real collaborators; it **does not** add, change, or duplicate smoke semantics, and it introduces no runtime that runs on its own.

---

## 1. Context

Implementation 026 and the post-Impl 026 documentation refresh are complete. Every collaborator the entrypoint wires already exists and is individually proven (Impl 014–026); validation is `606/606`.

Aurora has: the deterministic `rendering` boundary + **mandatory `validateDraft({ draft, renderable, request })`**; the provider seam; the **real-provider-ready** async path (`requestRealProviderRendering(...) → ProviderRenderOutcome`); the **raw-free provider-attempt audit**; rendered-message record/review/derived display eligibility; the **opt-in live-provider boundary** (the disabled-by-default `LiveCallPolicy`, the injected `ProviderCredentialResolver` family, the `LiveProviderClient`, and the single `LiveProviderHttpTransport` — the only network-token file); the **credential chain** (`StaticProviderCredentialResolver` / `EnvironmentProviderCredentialResolver` / `ProcessEnvironmentCredentialSourceAdapter`, with `process.env` **sealed to one approved production file**); the provider/rendering/delivery occurrence event surface; `application-orchestration` (`orchestrateRenderDeliver`); and — the subject this spec extends — the **injected live-provider smoke-test boundary helper**:

- **`liveProviderSmoke(command, deps)`** in `src/modules/rendering/application/live-provider-smoke.ts` — a **pure, fully-injected** wiring check that exercises **one** live provider call through the existing `requestRealProviderRendering(...) → validateDraft` seam, **only** behind explicit, ordered, fail-closed gates (**opt-in → CI → credential → live policy**, each stopping before any call), returning a **closed, redacted `LiveProviderSmokeResult`** (`rawRetained: false`; 9 closed statuses). It **reads no `process.env`** (opt-in/CI are injected indicators; the credential arrives via the injected resolver), makes **at most one call (no loops, no re-issue)**, imports no transport/adapter/delivery/event/orchestration internal, and **persists/delivers/records/mutates nothing**.

The invariant Spec/Impl 026 established and proved in deterministic code:

```text
Smoke proves wiring, not wisdom.
```

`[GAP]` **There is no operator entrypoint.** The helper exists and is proven with fakes, but **nothing reads the real opt-in/CI flags or wires the real transport/credential adapter and invokes it** — so the live path has never actually been driven end-to-end, on purpose, by a developer. Tech Spec 026A **deliberately deferred** this (§14): the operator entrypoint that reads the real env flags **cannot live inside `src/`** without breaching the repo-wide `process.env` one-file guard, and `scripts/` is outside both `tsconfig.include = ["src"]` and the test glob `src/**/*.test.ts`. Spec 027 specifies the behavioral contract for that manual entrypoint — **it changes no module, the helper, the validator, the resolver chain, or any guard**, and it chooses no placement (deferred to 027A).

---

## 2. Central Question

> How can Aurora expose a **manually-invoked operator entrypoint** for the existing `liveProviderSmoke` helper such that it can be **invoked intentionally** by a developer, can read the **real** opt-in and credential inputs **without weakening the production `process.env` seal**, **never runs in the default suite or `npm run check`**, **never runs in CI by default** (CI fails closed), produces **only redacted output**, and **persists nothing / delivers nothing / records no event / creates no evidence or athlete decision / mutates no domain** — and **introduces no dependency, SDK, telemetry, retry, scheduler, queue, or workflow engine**?

---

## 3. Core Principle

`[DECISION]` **The operator entrypoint may connect the wiring, but it must not change what the wiring means.**

```text
operator smoke entrypoint = manual adapter around the existing smoke helper
operator smoke entrypoint ≠ new smoke semantics     operator smoke entrypoint ≠ default test
operator smoke entrypoint ≠ CI live lane            operator smoke entrypoint ≠ production rollout
operator smoke entrypoint ≠ production secret mgr    operator smoke entrypoint ≠ model evaluation
operator smoke entrypoint ≠ telemetry               operator smoke entrypoint ≠ retry/scheduler
operator smoke entrypoint ≠ delivery                operator smoke entrypoint ≠ event recording
operator smoke entrypoint ≠ evidence                operator smoke entrypoint ≠ athlete decision
```

`[DECISION]` The entrypoint **calls `liveProviderSmoke(command, deps)`** — it does not re-implement the gates, the one-call rule, the validation step, or the redaction. It **reads operator-provided environment inputs only outside the production `src/` seal** (or otherwise only through the **approved `ProcessEnvironmentCredentialSourceAdapter`** for the credential), so the existing one-file guard is **honored, not weakened**. It preserves, unchanged:

```text
Smoke proves wiring, not wisdom.
```

`[ASSUMPTION]` The smallest useful boundary is a **single, manual invocation** that (a) reads the real opt-in indicator and CI indicator, (b) resolves the credential through the **existing approved chain**, (c) wires the existing `LiveCallPolicy` / `LiveProviderClient` / transport for **this invocation only**, (d) calls the helper **once**, and (e) prints/returns the helper's **redacted result** — adding **no** new semantics, persistence, side effect, or dependency of its own.

---

## 4. Scope / Non-Scope

**In scope (behavioral):** rules for a future operator entrypoint that may — (1) be manually invoked by a developer/operator; (2) read an explicit smoke opt-in flag; (3) detect a CI-like environment and **fail closed**; (4) resolve the credential through the **approved** `ProcessEnvironmentCredentialSourceAdapter` → `EnvironmentProviderCredentialResolver` chain; (5) wire the existing `LiveCallPolicy` (enabled for this invocation only) + `LiveProviderClient` (+ the existing transport) and call `liveProviderSmoke`; (6) produce **redacted, operator-readable** output; (7) keep the default suite deterministic; (8) keep CI credential-free; (9) avoid package/dependency churn (unless 027A explicitly justifies it later); (10) prevent any persistence, delivery, event recording, evidence creation, or domain mutation. May describe the **candidate** flow behaviorally; must not implement it.

**Out of scope (this spec):** implementing code; technical file-layout / placement decisions; SDK installation; dependency changes; a production secret manager; a CI-live lane; scheduled smoke runs; retry/backoff; queue/scheduler; event bus; telemetry/model evaluation; provider benchmarking; prompt engineering; prompt-template productionization; UI/API; DB/schema/migration; delivery-provider integration; **changing** `liveProviderSmoke` / `requestRealProviderRendering` / `validateDraft` / the serializer-parser-error-mapper / the credential-resolver behavior / the `process.env` guard / domain logic; an `application-orchestration` end-to-end live smoke; choosing the entrypoint's **placement / language / opt-in & CI mechanism / output format / exit codes / runbook** (deferred to 027A, §14).

---

## 5. Existing Artifacts To Reference (accurately)

The entrypoint **wires and calls** these — it adds, changes, and duplicates **none** of them.

- **The smoke helper (Impl 026):** **`liveProviderSmoke(command: LiveProviderSmokeCommand, deps: LiveProviderSmokeDependencies): Promise<LiveProviderSmokeResult>`** — owns the gates (opt-in → CI → credential → live policy, each before any call), the **one-call** rule, the call through `requestRealProviderRendering` (so `validateDraft` stays mandatory), and the **closed, redacted result** (`rawRetained: false`; statuses `not-enabled`/`ci-disabled`/`credential-missing`/`credential-invalid`/`live-policy-disabled`/`provider-failed`/`validation-failed`/`passed`/`unexpected-failure`). `[FACT]` The command carries **injected** `optIn`/`ci` indicators + a synthetic `request`; the deps carry the **injected** `ProviderClientBoundary` client, `LiveCallPolicy`, `ProviderCredentialResolver`, non-secret `ProviderClientConfig`, and an optional clock. The entrypoint **supplies the real values** for these injected inputs.
- **The credential chain (Impl 022/023):** `ProcessEnvironmentCredentialSourceAdapter` (the **only** approved direct `process.env` read site, sealed by a repo-wide guard inside `src/`) → `EnvironmentProviderCredentialResolver` (classifies one configured key into `missing`/`invalid`/`available` with an opaque transient token). `[FACT]` The entrypoint resolves the credential **through this existing chain** — the secret read stays in the one approved adapter; the entrypoint never adds a second credential env-read site inside `src/`.
- **The live boundary (Impl 021):** the disabled-by-default `LiveCallPolicy` (`enabled({timeoutMs})` for an explicit opt-in), the `LiveProviderClient` (implements the async `ProviderClientBoundary`; reuses the unchanged serializer/parser/error-mapper; never calls `validateDraft`), and the single `LiveProviderHttpTransport` (`liveProviderHttpTransport({ endpoint })`, native `fetch`, the only network-token file). `[FACT]` The entrypoint **wires these for one invocation**; it does not re-implement transport, policy, or credential logic, and enabling the policy here enables nothing globally.
- **`requestRealProviderRendering` + `validateDraft` (Impl 014/017/019):** reached **only through `liveProviderSmoke`**; the entrypoint never calls them directly and never bypasses the validator.

`[FACT]` A provider response is **not source material** unless the athlete separately reports it via the manual adapter (Impl 013). The entrypoint changes nothing about that — a `passed` smoke is an **operational wiring success**, never domain evidence.

---

## 6. Required Behavioral Rules

`[DECISION]` A future operator entrypoint must obey **all** of:

1. **Manually invoked.** It runs only when a developer/operator deliberately invokes it.
2. **Never part of the default suite.** The default test command never executes it (no live call in the suite).
3. **Never part of `npm run check`** unless a future explicit policy says so.
4. **Never runs in CI by default.** A CI-like environment makes no live call.
5. **CI-like environment → fail closed before credential resolution and before transport.**
6. **Missing opt-in → fail closed before credential resolution and before transport.**
7. **Malformed opt-in → fail closed.**
8. **The credential input is never printed.**
9. **Secret values are never printed.**
10. **Raw provider request/response/draft is never printed.**
11. **The rendered-message body is never printed** unless a future spec explicitly allows it.
12. **Output is redacted.**
13. **Output includes a safe status/result code.**
14. **Output includes `rawRetained: false` (or equivalent).**
15. **It calls `liveProviderSmoke(command, deps)`** rather than duplicating smoke semantics.
16. **It preserves the mandatory `validateDraft`** (through the existing helper).
17. **It makes at most one provider call** (through the helper).
18. **It adds no retry/loop/re-issue** around the helper.
19. **It persists nothing.**
20. **It delivers nothing.**
21. **It records no events.**
22. **It does not call the `application-orchestration` delivery path.**
23. **It creates no evidence.**
24. **It creates no athlete decisions.**
25. **It mutates no `Athlete`/`Understanding`/`DecisionSupport`/`Reasoning` state.**
26. **It installs no SDK or dependency.**
27. **It requires no `package.json`/lockfile churn** unless 027A explicitly justifies it.
28. **It does not weaken the production `process.env` one-file guard** — it reads operator env inputs **outside** the production `src/` seal, and the credential flows through the **approved adapter**.
29. **It requires no real credentials in CI.**
30. **Smoke success remains wiring success only** (not product readiness, not evidence).

`[ASSUMPTION]` Each rule is a **defining negative**: the future implementation is correct only if a test can demonstrate the rule holds **without making a live call** (see §13).

---

## 7. Candidate Operator Flow (illustrative; 027A refines)

Each step is **manual** and **explicit**, not an automatic transition:

```text
operator manually invokes the entrypoint
  → entrypoint reads the explicit operator opt-in indicator        [else: not-enabled, before credential/transport]
  → entrypoint detects a CI-like environment                       [if CI: ci-disabled, before credential/transport]
  → entrypoint resolves the credential through the APPROVED chain (ProcessEnvironmentCredentialSourceAdapter
        → EnvironmentProviderCredentialResolver)                   [the secret read stays in the one approved adapter]
  → entrypoint wires LiveCallPolicy.enabled(...) FOR THIS INVOCATION ONLY
  → entrypoint wires LiveProviderClient (+ the existing transport) behind the async ProviderClientBoundary
  → entrypoint calls liveProviderSmoke(command, deps)              [the helper owns the gates + the one call]
        → helper calls requestRealProviderRendering(...)           [validateDraft stays mandatory]
  → entrypoint prints/returns the helper's REDACTED result only
```

`[FACT]` In this flow: **no delivery**, **no event recording**, **no persistence**, **no domain mutation**, **no retry**, **no scheduler**, **no default-suite execution**, **no CI execution by default**, **no raw output**. The entrypoint **adds no gate of its own** beyond reading the real inputs — the helper enforces opt-in → CI → credential → live policy and the one-call rule; the entrypoint's own opt-in/CI reading is a **fail-fast convenience** that must agree with (never bypass) the helper's gates.

`[DECISION]` The entrypoint composes **only** through the helper and the rendering/provider seam — it **does not** route through `orchestrateRenderDeliver` (no delivery composition) and **does not** touch `delivery`/`event-recording`.

---

## 8. Required Failure Semantics

Define a **safe outcome** for each:

- **Invoked without opt-in** → safe `not-enabled`; no credential resolution, no transport.
- **Malformed opt-in** → fail closed (`not-enabled`); no credential resolution, no transport.
- **CI environment detected** → safe `ci-disabled`; no credential resolution, no transport.
- **Credential missing** → safe `credential-missing`; no transport.
- **Credential invalid** → safe `credential-invalid`; no transport.
- **Live policy disabled** → safe `live-policy-disabled`; no transport. *(In the operator path the policy is enabled for the invocation; this remains the helper's backstop.)*
- **Provider unavailable / timeout / malformed response** → safe `provider-failed`; **no retry**; **no raw provider body**.
- **Provider draft validation failure** → `validation-failed`; provider output **not** trusted; no rendered message accepted.
- **Unexpected exception** → safe `unexpected-failure`; **no secret / no raw provider body** in the error.
- **Operator output write failure (if relevant)** → fail safely; **no secret / no raw content** leaked through the error path.

`[DECISION]` Every outcome is a **safe skip, safe stop, or safe failure** — never an automatic retry, never a scheduler, never a delivery, never a domain mutation, never raw leakage. **Smoke failure is not domain failure.**

---

## 9. Required Output Rules

`[DECISION]` The operator output is **operational and redacted**.

**Allowed output:**
- the smoke **status** (the helper's closed status);
- a safe **reason** code; a **provider failure code** if safe; a **validation status** if safe;
- **`rawRetained: false`** (or equivalent);
- a **duration** if safe and not sensitive;
- a statement that **no delivery / persistence / event recording occurred**;
- a statement that **smoke success is wiring success only**.

**Forbidden output:**
- a raw **credential**; a **secret** value; a **`process.env` value**; a **bearer token**; a **full env dump**;
- a raw provider **request**; a raw provider **response**; a raw provider **draft**; a provider **prompt/payload**;
- the **rendered-message body**; **chain-of-thought** / hidden reasoning;
- a **delivery target/body**; **athlete-sensitive source material**; an **arbitrary provider metadata bag**.

`[FACT]` The entrypoint's output is the helper's redacted result (plus safe operator framing) — it cannot surface more than the closed result already carries, by construction.

---

## 10. Required Distinctions (do not collapse)

operator entrypoint ≠ smoke helper · operator entrypoint ≠ smoke semantics · operator entrypoint ≠ default test · operator entrypoint ≠ CI live lane · operator entrypoint ≠ production rollout · operator entrypoint ≠ production secret manager · operator entrypoint ≠ model evaluation · operator entrypoint ≠ telemetry · operator entrypoint ≠ retry/scheduler · operator entrypoint ≠ delivery · operator entrypoint ≠ event recording · operator entrypoint ≠ evidence · operator entrypoint ≠ athlete decision · operator entrypoint success ≠ product readiness · provider reachable ≠ provider output trusted · validation pass ≠ recommendation quality · credential available ≠ automatic execution · env flag present ≠ global live enablement · smoke result ≠ raw transcript.

---

## 11. Required Use Cases (Given / When / Then)

**UC1 — Default suite never invokes the entrypoint.** *Given* the default test command is executed, *when* the operator entrypoint exists, *then* it is **not** executed and **no** live provider call is attempted.

**UC2 — `check` remains deterministic.** *Given* `npm run check` is executed, *when* the entrypoint exists, *then* it is **not** executed unless a future explicit policy says so.

**UC3 — CI blocks live smoke.** *Given* a CI-like environment, *when* the entrypoint is invoked, *then* it returns/prints a safe `ci-disabled` result **before** credential resolution and **before** transport.

**UC4 — Missing opt-in.** *Given* no explicit opt-in flag, *when* the entrypoint is invoked, *then* it returns/prints a safe `not-enabled` result **before** credential resolution and **before** transport.

**UC5 — Malformed opt-in.** *Given* a malformed opt-in value, *when* the entrypoint is invoked, *then* it **fails closed** before credential resolution and before transport.

**UC6 — Missing credential.** *Given* valid opt-in and a non-CI context but a missing credential, *when* the entrypoint is invoked, *then* it returns/prints a safe `credential-missing` result **before** transport.

**UC7 — Provider failure.** *Given* valid opt-in, non-CI context, and an available credential but a provider failure, *when* the entrypoint is invoked, *then* it returns/prints a safe `provider-failed` result **without retry** and **without raw provider body**.

**UC8 — Validation failure.** *Given* the provider returns a draft that fails validation, *when* the entrypoint is invoked, *then* it prints `validation-failed` and does **not** treat provider output as trusted.

**UC9 — Smoke passed.** *Given* provider output passes validation, *when* the entrypoint is invoked, *then* it prints `passed` as **wiring success only** and creates **no** evidence, delivery, event record, athlete decision, or domain mutation.

**UC10 — Output redaction.** *Given* any entrypoint outcome, *when* the output is inspected, *then* it contains **no** raw credential, env value, provider request/response/draft, rendered body, or hidden reasoning.

---

## 12. Acceptance Criteria

- Given the default tests → the entrypoint is **not** invoked.
- Given `npm run check` → the entrypoint is **not** invoked by default.
- Given CI → **no** credential is resolved and **no** transport occurs.
- Given no opt-in → **no** credential is resolved and **no** transport occurs.
- Given malformed opt-in → **fail closed**.
- Given a missing credential → **no** transport occurs.
- Given a provider failure → **no** retry occurs.
- Given a validation failure → provider output is **not** trusted.
- Given smoke `passed` → **no** evidence/delivery/event/domain mutation occurs.
- Given the output → **no** raw secret/env/provider/rendered content appears.
- Given a future implementation → **all Impl 001–026 tests remain green**, and the production `process.env` one-file guard stays intact.

---

## 13. Validation Strategy (defining tests for the future implementation)

`[DECISION]` The **negative tests are defining**, and they prove their guarantees **without making a live call**. A future implementation must prove:

- the **default suite does not invoke** the entrypoint; **`npm run check` does not invoke** it by default;
- a **CI-like environment blocks before credential/transport**;
- a **missing opt-in blocks before credential/transport**; a **malformed opt-in fails closed**;
- a **missing credential blocks before transport**;
- a **provider failure** prints a safe result and **no retry**;
- a **validation failure** prints a safe result and **trusts nothing**;
- a **passed** smoke prints **wiring success only**;
- the **output is redacted** — **no** raw credential/env/provider/rendered body;
- the entrypoint makes **no** delivery/event/orchestration import or call, and **no** persistence call;
- **no** event bus/queue/scheduler/retry/telemetry/DB;
- **no** SDK/dependency change unless explicitly chosen;
- the **production `process.env` one-file guard stays green** (the entrypoint adds no in-`src/` token site);
- and **all Impl 001–026 tests remain green**.

`[FACT]` How these tests reach an entrypoint that may live **outside `src/`** (so it is outside the default test glob) is a 027A concern — e.g. testing a pure, exported decision/redaction function the entrypoint calls, or inspecting the entrypoint's text — but the **behavioral requirement** is that the guarantees are provable deterministically, with fakes, and **no live call**.

---

## 14. Open Design Questions (for 027A — do not resolve here)

1. Whether the entrypoint is a plain `.mjs` script **outside `src`**.
2. Whether it is a TypeScript source requiring a build step.
3. Whether an **npm script** is added or deliberately avoided.
4. Whether `package.json` can be changed safely (and how the package guard treats it).
5. Whether it lives under `scripts/`, `ops/`, or another folder.
6. Whether it reads Node's `process.env` **directly** (legitimate **outside** the production `src/` guard) for the opt-in/CI flags.
7. Whether it resolves the credential through the existing `ProcessEnvironmentCredentialSourceAdapter` from compiled/run `src`.
8. How to avoid TypeScript/runtime ambiguity given `tsconfig.include = ["src"]`.
9. The exact **opt-in flag name** and approved value.
10. The exact **credential env key** to read (vs. reusing `AURORA_PROVIDER_CREDENTIAL`).
11. The exact **CI-detection rule**.
12. Whether output is **JSON only** or **human-readable + JSON**.
13. Whether **duration** is printed.
14. Whether **exit codes** distinguish skip/fail/pass.
15. Whether an **operator runbook/README** is added.
16. Whether the **default tests inspect the script text** if it lives outside `src`.
17. Whether a **future CI-live lane** is ever allowed.
18. Whether a **production secret manager** should precede or follow this entrypoint in implementation order.

`[QUESTION]` These are carried forward; none blocks this behavioral spec. Technical implementation choices are not resolved here.

---

## 15. Relationship to Existing Architecture

- **Spec/Impl 026:** the `liveProviderSmoke` helper **owns smoke semantics** — the entrypoint **calls it, never duplicates it**.
- **Spec/Impl 025:** `application-orchestration` exists — the operator smoke **must not** call the delivery path (it composes only the rendering/provider seam via the helper).
- **Spec/Impl 024:** event factories exist — the operator smoke **records no event**.
- **Spec/Impl 023:** the process-env adapter is the **only** approved direct env binding inside production `src` — the credential flows through it; the entrypoint reads the **opt-in/CI flags outside the `src/` seal**, weakening no guard.
- **Spec/Impl 022:** the environment resolver **classifies** an injected source — the operator smoke consumes a resolution, it does not classify.
- **Spec/Impl 021:** the opt-in live boundary + `LiveCallPolicy` stay **fail-closed** — the entrypoint enables the policy **for one invocation only**, never globally.
- **Spec/Impl 020:** the serializer/parser/error-mapper stay **unchanged**.
- **Spec/Impl 019:** the async `ProviderClientBoundary` exists — reached **only** through the helper → `requestRealProviderRendering`.
- **Spec/Impl 018:** the provider-attempt audit stays **raw-free** — the operator smoke **persists no audit record** unless a future spec says so.
- **Spec/Impl 017/014:** provider drafts are **untrusted**; only `validateDraft` makes a `RenderedMessage` — the entrypoint never bypasses the validator.
- **Spec/Impl 015:** rendered-message persistence exists — the operator smoke **persists nothing**.
- **Spec/Impl 016:** delivery exists — the operator smoke **must not deliver**.
- **Spec/Impl 011:** event/outcome records exist — the operator smoke is **not** event recording / telemetry.
- **Spec/Impl 013:** a provider response is **not source material** unless separately reported by the athlete — the operator smoke creates no observation/evidence.

Clarifications: the operator entrypoint is a **manual adapter around the existing wiring check** — **not** new smoke semantics, **not** domain reasoning, **not** delivery, **not** event recording, **not** a production rollout, **not** model evaluation, **not** telemetry, **not** a production secret manager.

---

## 16. Explicit Forbidden Behaviors

The future entrypoint must forbid: **default** live calls; **CI** live calls by default; invocation **by the default suite**; invocation **by `npm run check`** by default; **implicit** opt-in; **global** live enablement; **weakening the production `process.env` guard**; **reading env from a new production `src` file**; printing **env values / credentials / secrets / tokens**; printing a **raw provider request/response/draft**; printing the **rendered-message body**; a **raw provider transcript**; **package/dependency churn** unless 027A explicitly chooses it; **SDK installation**; **production prompt templates**; **persistence**; **rendered-message record / review** creation; **display eligibility** derivation; **delivery**; **event recording**; **provider-attempt audit persistence**; the **`application-orchestration` delivery path**; **evidence** creation; **athlete-decision** creation; **domain mutation**; **retry/re-issue/loop** around the provider call; a **scheduler/queue/event bus**; **telemetry/model evaluation**; and any **product-readiness claim**.

---

## 17. Success Criteria

When this spec is complete, **027A** (Technical Spec) should be able to answer:

> "Can Aurora provide a **manual operator entrypoint** that invokes the existing live-provider smoke helper with **real** environment inputs while preserving **deterministic default tests**, **CI safety**, **redacted output**, **no persistence / delivery / event recording / domain mutation**, and **no weakening of the production `process.env` guard**?"

— and by the behavioral rules (§6), the candidate flow that wires real inputs but composes **only** through the helper (§7), the failure semantics (§8), the output rules (§9), and the defining negative tests that make **no live call** (§13), the answer is **yes**: a manual adapter reads the real opt-in/CI flags **outside** the production `src/` seal, resolves the credential through the **approved** adapter chain, wires the existing policy/client/transport for one invocation, calls `liveProviderSmoke` once (so `validateDraft` stays mandatory and the gates/one-call/redaction are the helper's), and prints a redacted result — never running in the default suite or CI, never persisting/delivering/recording/mutating, never leaking a secret or raw body, and never weakening a guard — with the entrypoint's **placement, language, opt-in/CI mechanism, output format, exit codes, and runbook** deferred to 027A. If the spec cannot answer that, it is incomplete.
