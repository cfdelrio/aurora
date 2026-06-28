# Aurora — Specification 026 — Live Provider Smoke-Test Boundary

> Phase: **Specification** (behavioral; no code).
> Builds on: `025-explicit-application-orchestration-boundary.md`, `024-provider-rendering-delivery-event-surface.md`, `023-direct-process-environment-adapter-boundary.md`, `022-environment-secret-resolver-boundary.md`, `021-live-provider-call-enablement-boundary.md`, `020-real-provider-adapter-implementation-boundary.md`, `019-real-provider-integration-boundary.md`, `018-provider-attempt-audit-boundary.md`, `017-provider-adapter-boundary.md`, `014-llm-rendering-boundary.md`, `015-rendered-message-review-persistence.md`, `016-delivery-boundary.md`, `011-domain-event-outcome-records-traceability-envelope.md`, `013-manual-input-adapter.md`.
> Output of this document: a behavioral contract for a **manually-invoked, opt-in live-provider smoke test** that proves **one real provider call** can pass through the *existing* live-provider boundary and still be validated by Aurora — while the **default test suite stays deterministic, CI stays credential-free, outputs stay raw-free, the path stays fail-closed, and no domain/persistence/audit/event/delivery side effect occurs**. **No code, no SDK, no dependency, no CI live tests, no real credentials, no production prompt templates, no telemetry/model-evaluation, no retry/scheduler/event bus, no provider-behavior change, no validation-behavior change.**

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification (026A), not Implementation.

- `[FACT]` This document describes **behavior**. It names a **candidate** smoke flow and its rules; it defines no script, no test file, no opt-in mechanism, no file layout, no CI-detection mechanism, and resolves no technical placement (deferred to 026A, §15).
- `[DECISION]` Spec 026 opens **one** edge only: a **manual, opt-in operational wiring check** that may exercise the *already-existing* live-provider path **once**. It **uses the existing boundaries; it does not add, bypass, loosen, or productionize them**, and it introduces no runtime that runs on its own.

---

## 1. Context

Aurora's implemented surfaces (Impl 001–025) are all present and individually proven:

- core reasoning modules: `observation`, `reasoning`, `understanding`, `decision-support`, `athlete`;
- `event-recording` (append-only, ref-only `DomainEventRecord` log) **+ the additive provider/rendering/delivery occurrence event factories (Impl 024)**;
- `rendering`: the deterministic boundary + **mandatory `validateDraft({ draft, renderable, request })`**, the provider seam (`requestProviderRendering`), the **real-provider-ready** async path (**`requestRealProviderRendering(...)` → `ProviderRenderOutcome`**), the **raw-free provider-attempt audit** (`auditProviderAttempt` → `ProviderAttemptRecord`), the **rendered-message record** (`RenderedMessageRecord.fromRenderedMessage(...)`), the **render review** (`renderReview(...)`), and **derived `displayEligibilityOf(record)`**;
- the **opt-in live-provider boundary (Impl 021)**: the disabled-by-default **`LiveCallPolicy`**, the injected **`ProviderCredentialResolver`** family, the **`LiveProviderClient`** (a sibling of `ConcreteProviderClient`, reusing the unchanged serializer/parser/error-mapper), and the **single `LiveProviderHttpTransport`** — native `fetch` behind an injected endpoint, the **only** network-token file;
- the **selected-provider shell (Impl 020)**: `serializeProviderInstruction` / `parseProviderResponse` / `mapProviderError`, vendor-neutral (`concrete-provider-*`), the vendor chosen doc-level only;
- the **credential chain (Impl 021–023)**, fail-closed and opt-in: `StaticProviderCredentialResolver` / `EnvironmentProviderCredentialResolver` / `ProcessEnvironmentCredentialSourceAdapter`, with `process.env` **sealed to one approved file**;
- `delivery`: `deliveryRequest(...)` / `requestDelivery(...)` → `DeliveryRecord`, gating on `displayEligibilityOf` and the closed `DeliveryTarget` (only `test-sink`);
- `application-orchestration` (Impl 025): **`orchestrateRenderDeliver(command, deps)`** — explicit, ordered composition over injected collaborators, returning a **closed `OrchestrationOutcome`** + a **ref-only `OrchestrationTrace`**.

The pieces now form a complete, individually-proven chain from the real environment to a validated draft:

```text
process-env adapter → environment credential resolver → live policy → live provider client
  → provider response parser → RealProviderAdapter → validateDraft → explicit orchestration
  → raw-free audit / ref-only event trace
```

Current validation after Impl 025 docs: `tsc --noEmit` clean; full suite **`583/583`**.

`[GAP]` **Every link in that chain is proven deterministically and in isolation — but no link has ever been exercised against a *real* provider.** The live-provider boundary (Impl 021) is **disabled by default**, the default suite and CI make **no live call and require no credential**, and that is exactly the property the project has guarded since Impl 014. There is **no surface — and no behavioral contract for one — that lets an operator deliberately verify, once, that the live path is wired correctly end-to-end** (transport reachable, response parsed, draft validated) **without** contaminating the default suite, CI, the domain model, persistence, the audit, events, logs, or docs with real secrets or raw provider payloads. Spec 026 specifies that behavioral contract. **It changes no module, adds no dependency, and chooses no placement** (script vs. skipped test, location, opt-in representation, CI detection — all deferred to 026A).

---

## 2. Central Question

> How can Aurora add a **live-provider smoke-test boundary** that is **manual**, **opt-in**, **excluded from the default suite**, **excluded from CI by default**, **credential-free unless explicitly supplied by the operator**, **fail-closed**, **raw-free in persisted/audited/test/log output**, and **non-domain-authoritative** — that exercises **one** real provider call through the *existing* live-provider boundary and the *unchanged* `validateDraft`, and returns a **safe operational result only** — **without** becoming a default test, a CI test, a production rollout, model evaluation, telemetry, or a retry/scheduler/workflow system?

---

## 3. Core Principle

`[DECISION]` **A smoke test proves wiring, not wisdom.** For this slice:

```text
live smoke test = manual operational wiring check
live smoke test ≠ default test            live smoke test ≠ CI test
live smoke test ≠ production behavior      live smoke test ≠ model evaluation
live smoke test ≠ recommendation quality   live smoke test ≠ domain evidence
live smoke test ≠ telemetry                live smoke test ≠ retry engine
```

`[DECISION]` The smoke test may verify that **one** live provider call can pass through the **existing** live-provider boundary and **still be validated** by Aurora's unchanged `validateDraft`. It must **not** make provider output more authoritative, **not** loosen validation, **not** store or print secrets, **not** persist or log raw provider payloads, and **not** run accidentally.

`[ASSUMPTION]` The smallest useful boundary is a **single, manual, bounded, opt-in invocation** that (a) refuses to run unless an explicit operator opt-in is present, (b) fails closed **before transport** when opt-in / policy / credential is absent, (c) makes **at most one** call through the existing live boundary, (d) feeds the result through the **unchanged** parser and `validateDraft`, and (e) returns a **redacted, operator-readable safe result** — adding **no** domain decision, **no** persistence, **no** event, and **no** delivery of its own.

---

## 4. Scope / Non-Scope

**In scope (behavioral):** rules for a future smoke boundary that may — (1) be manually invoked by an operator; (2) require explicit operator opt-in; (3) require an explicit, non-default `LiveCallPolicy`; (4) require an explicit credential source resolved through the existing chain; (5) verify the provider transport can be reached through the **existing** `LiveProviderHttpTransport`; (6) verify the provider response parses through the **existing** `parseProviderResponse` / `mapProviderError`; (7) verify the **unchanged** `validateDraft` remains mandatory; (8) define safe failure behavior for every stage; (9) keep the default suite deterministic; (10) keep CI credential-free; (11) guarantee no raw prompt/payload/response/secret/env value leaks into logs, records, events, traces, or test output; (12) guarantee the smoke run creates no domain evidence, athlete decision, delivery, retry, or production state. May describe the **candidate** flow behaviorally; must not implement it.

**Out of scope (this spec):** implementing code; SDK installation; dependency changes; production rollout; a production secret manager; CI live tests; automatic/scheduled smoke runs; retry/backoff; queue/scheduler; event bus; telemetry/model evaluation; model benchmarking; prompt engineering; prompt-template productionization; UI/API; DB/schema/migration; delivery-provider integration; changing domain logic; **changing `validateDraft`**; **changing provider failure catalogs** (unless a later slice strictly requires it); **changing application-orchestration behavior**; choosing the smoke boundary's **placement / opt-in mechanism / CI-detection mechanism / output format** (deferred to 026A, §15).

---

## 5. Existing Artifacts To Reference (accurately)

The smoke test composes these — it adds, bypasses, and loosens **none** of them.

- **Opt-in live boundary (Impl 021):** the disabled-by-default **`LiveCallPolicy`** (`disabled()` / `enabled({timeoutMs})`; never inferred from the environment; no global state); the injected **`ProviderCredentialResolver`** port; the **`LiveProviderClient`** (implements the async `ProviderClientBoundary`; reuses the unchanged serializer/parser/error-mapper; **never calls `validateDraft`**); the single **`LiveProviderHttpTransport`** (native `fetch` + `AbortSignal.timeout`, injected endpoint, the **only** network-token file; no retry/persist/validate; no secret in errors). It **fails closed before any transport call** when the policy is disabled or the credential is missing/invalid.
- **Credential chain (Impl 022/023):** `EnvironmentProviderCredentialResolver` **classifies** an injected `EnvironmentCredentialSource` (one configured key; absent → `missing`, blank/control/too-short → `invalid`, else → `available` with an **opaque transient `ProviderCredentialToken`**); `ProcessEnvironmentCredentialSourceAdapter` **binds the real `process.env`** (one neutral key, `AURORA_PROVIDER_CREDENTIAL`, via an injected accessor called once) into that source — the **only direct `process.env` read site**, sealed by a repo-wide guard. The credential is **operational and transient** — never persisted/audited/logged, never in an event/trace/error.
- **Provider client + serialization (Impl 019/020):** the async **`ProviderClientBoundary`**; the pure **`serializeProviderInstruction`** (structured payload; no arbitrary prompt / chain-of-thought / secret field), **`parseProviderResponse`** (**untrusted draft + operational metadata only**; empty/malformed → safe failures; **no raw payload retained**), and **`mapProviderError`** (provider-shaped errors → `ProviderOperationalFailure` → existing `ProviderFailure`, **not expanded**; unknown → safe `provider-unavailable`).
- **Real-provider rendering + validation (Impl 014/017/019):** **`requestRealProviderRendering(...)` → `ProviderRenderOutcome`** reuses the unchanged `providerRenderingRequestFrom` guard + a credential fast-path and ends at the **mandatory `validateDraft(...)`**. Provider output is an **untrusted draft**; **only `validateDraft` yields a `RenderedMessage`**; a validation failure → `provider-output-failed-validation` + the underlying `RenderingFailure[]`.
- **Provider-attempt audit (Impl 018):** observe-only **`auditProviderAttempt(...)` → `ProviderAttemptRecord`**, `rawDraftRetained: false`. The smoke test is **not required to audit**; if it does, the audit stays **raw-free**.
- **Occurrence events (Impl 011/024):** the eight **pure, ref-only** factories. The smoke test is **not required to record an event**; if a later slice wires one, it stays ref-only/raw-free and inert.
- **Application orchestration (Impl 025):** **`orchestrateRenderDeliver(...)`** composes the full flow explicitly, including delivery. The smoke test **does not need delivery** (see §10).

`[FACT]` A provider response is **not source material** unless the athlete separately reports it via the manual adapter (Impl 013). The smoke test changes nothing about that — a live draft that passes validation is an **operational wiring success**, never domain evidence.

---

## 6. Required Behavioral Rules

`[DECISION]` A future live-provider smoke-test boundary must obey **all** of:

1. **Never runs in the default test suite.** The default test command makes **no** live provider call.
2. **Never runs in CI by default.** Unless a future explicit CI-live policy is **separately specified**, a CI-like environment runs no live smoke.
3. **Requires explicit operator opt-in.** Absent the opt-in, the smoke path does not read a credential, does not enable the policy, and does not reach transport.
4. **Requires explicit credential availability.** The credential must resolve through the **existing** chain; a missing/invalid credential stops the run.
5. **Missing credential → safe skip / fail-closed before transport.** No transport call occurs.
6. **Disabled live policy → safe skip / fail-closed before transport.** No transport call occurs.
7. **Uses the existing live-provider boundary, never a bypass.** No alternate transport, no direct network call, no second authority.
8. **Uses the existing credential resolver chain; reads `process.env` only through the one approved adapter** — never directly anywhere else.
9. **Uses the existing provider serializer / parser / error mapper** — it reshapes no payload and invents no parse path.
10. **Uses the existing `validateDraft`** — unchanged, mandatory.
11. **Accepts provider output only if validation passes** — a failing draft is reported as a validation failure, never treated as trusted.
12. **Persists no raw provider request / response / draft.**
13. **Logs no raw provider request / response / draft.**
14. **Prints no secret** (credential token, bearer, env value, or env key dump).
15. **Creates no `Evidence`** (and no `Signal` / `Hypothesis` / `Understanding`).
16. **Mutates no `athlete` / `understanding` / `decision-support` / `reasoning`** state.
17. **Delivers no message.** No `delivery` step runs (see §10).
18. **Triggers no event bus / scheduler / retry.** There is none, and the smoke test introduces none.
19. **Returns a safe operational result only** — a status + safe codes, redacted.
20. **Is cheap and bounded:** **one** call, **no** loops, **no** retries, with a single bounded timeout.

`[ASSUMPTION]` Each rule is a **defining negative**: the future implementation is correct only if a test can demonstrate the rule holds (see §14).

---

## 7. Required Distinctions (do not collapse)

smoke test ≠ unit test · smoke test ≠ default test · smoke test ≠ CI test · smoke test ≠ production rollout · smoke test ≠ model evaluation · smoke test ≠ telemetry · smoke test ≠ domain evidence · smoke test ≠ recommendation quality · smoke test ≠ application-orchestration delivery path · live policy enabled **for the smoke call** ≠ live policy enabled **globally** · credential available ≠ smoke should run automatically · provider reachable ≠ provider output trusted · validation pass ≠ recommendation correct · smoke success ≠ product ready · smoke failure ≠ domain failure · smoke output ≠ raw provider transcript · operator opt-in ≠ default behavior · one bounded call ≠ a retry loop · wiring check ≠ wisdom.

---

## 8. Required Trace / Output Rules

`[DECISION]` The smoke result is **operational and redacted**.

**Allowed smoke output:**
- a safe **status code** (e.g. `skipped-no-opt-in` / `skipped-ci` / `stopped-policy-disabled` / `stopped-credential-missing` / `stopped-credential-invalid` / `provider-unavailable` / `provider-timeout` / `malformed-response` / `validation-failed` / `wiring-ok`);
- a safe **failure reason** and the existing **`ProviderOperationalFailure` / `ProviderFailure` code**;
- the **validation pass/fail** result (boolean / closed reason);
- a **duration** if safe;
- the **provider/model label** *only if* it is non-secret and **already** in config;
- a **request id** *only if* it is safe and not provider-sensitive;
- an explicit **statement that no raw payload was retained**.

**Forbidden in smoke output (and in any log/record/event/trace it touches):**
- a raw provider **prompt**; a raw provider **request payload**; a raw provider **response**; a raw provider **draft**;
- a **bearer token**; a **credential token**; a **`process.env` value**; a **full `process.env` key dump**;
- **chain-of-thought** / hidden reasoning; an **arbitrary provider metadata bag**;
- the **rendered-message body** if not necessary (suppressed by default — see §15);
- a **delivery target / body** (there is no delivery);
- **raw athlete-sensitive input** beyond existing safe refs.

`[FACT]` If a later slice wires an occurrence event or an audit record into the smoke path, it inherits the Impl 011/024 ref-only `EventPayloadRef` discipline and the Impl 018 `rawDraftRetained: false` discipline unchanged. The smoke test copies **no** raw provider content into any output, by construction.

---

## 9. Required Failure Semantics

Define a **safe outcome** for each:

- **Opt-in flag absent** → safe `skipped` result; **no** credential read, policy enablement, or transport.
- **CI environment detected** → safe `skipped` result; **no** live call (absent a future explicit CI-live policy).
- **Live policy disabled** → fail closed **before transport**; no transport call.
- **Credential missing** → fail closed **before transport**; no transport call.
- **Credential invalid** → fail closed **before transport**; no transport call.
- **Provider unavailable** → safe `provider-unavailable`; **no retry**; **no raw response**.
- **Provider timeout** → safe `provider-timeout` (single bounded timeout); **no retry**.
- **Provider malformed response** → parser/error-mapper returns a safe failure; **no raw body retained**.
- **Provider response parsed but draft invalid** → `validateDraft` rejects → `validation-failed`; the provider is **not** treated as trusted; no `RenderedMessage` accepted.
- **Validation failure** → reported as validation failure; **no** rendered message, evidence, delivery, or domain mutation.
- **Unexpected exception** → safe failure result; **no** secret in the error; **no** raw provider body in the error; **no retry**.

`[DECISION]` Every outcome is a **safe skip, safe stop, or safe failure** — never an automatic retry, never a scheduler, never a delivery, never a domain mutation, never raw leakage. **Smoke failure is not domain failure.**

---

## 10. Candidate Smoke Flow (illustrative; 026A refines)

Each arrow is an **explicit, manual** step, not an automatic transition:

```text
operator explicitly invokes smoke test
  → live-smoke guard verifies operator opt-in flag        [else: skipped-no-opt-in, before anything]
  → CI guard: not a CI-like environment                   [else: skipped-ci]
  → credential source resolves the approved credential key [else: stopped-credential-missing/invalid, before transport]
  → LiveCallPolicy explicitly enabled FOR THIS CALL ONLY   [else: stopped-policy-disabled, before transport]
  → LiveProviderClient uses the existing LiveProviderHttpTransport (one bounded call)
  → provider response parsed through the existing parseProviderResponse / mapProviderError
  → RealProviderAdapter returns a ProviderDraftOutcome (untrusted draft or safe failure)
  → requestRealProviderRendering(...) invokes the unchanged validateDraft
  → smoke result reports a safe status only (redacted)
```

`[FACT]` In this flow: **no event is required**; **no delivery is allowed**; **no domain mutation is allowed**; **no retry is allowed**; **no smoke run by default tests**; **no smoke run in CI by default**.

`[DECISION]` **The smoke test targets the rendering/provider seam first, not delivery.** It composes **through `requestRealProviderRendering(...)` → `validateDraft`** (the provider/render seam), **not** through `application-orchestration`'s delivery path. Application orchestration may be used **later** for a **separate** end-to-end smoke boundary, specified on its own.

`[ASSUMPTION]` Rationale: the first live risk is **provider transport / credential / parse / validation**; delivery is a **separate operational concern**; the smoke test must stay **minimal and cheap**; and **no automatic delivery must be possible**. Because the candidate flow stops at `validateDraft`, **no delivery step exists in this slice** — so the "delivery disabled" requirement is satisfied *structurally* (delivery is simply not composed), not by a runtime flag. If 026A ever chooses to route the smoke call **through `orchestrateRenderDeliver`** instead, it must explain **why** and must guarantee delivery is **not selected** (no delivery sink / delivery repository / delivery input supplied → the orchestrator's `rendered` partial-composition outcome, never `delivered`); if it composes only through the rendering seam, it must state that the smoke test is **provider wiring only**, not an end-to-end product flow.

---

## 11. Required Use Cases (Given / When / Then)

**UC1 — Default suite never runs smoke.** *Given* the default test command is executed, *when* no explicit smoke opt-in is present, *then* **no** live provider call is attempted and the suite remains deterministic.

**UC2 — CI does not run smoke.** *Given* the environment is CI-like, *when* smoke-test code is present, *then* it **does not run** unless a future explicit CI-live policy exists.

**UC3 — Missing opt-in.** *Given* no operator opt-in flag is present, *when* the smoke command is invoked, *then* it returns a safe `skipped`/`not-enabled` result **before** any credential read or transport.

**UC4 — Missing credential.** *Given* opt-in is present but the credential is missing, *when* the smoke command runs, *then* it stops **before transport** with a safe `credential-missing` result.

**UC5 — Disabled live policy.** *Given* opt-in is present but the live policy is disabled, *when* the smoke command runs, *then* it stops **before transport**.

**UC6 — Provider unavailable.** *Given* the provider transport fails, *when* the smoke command runs, *then* it returns a safe `provider-unavailable` result, **no retry**, **no raw response**.

**UC7 — Malformed provider response.** *Given* the provider returns a malformed payload, *when* the smoke command runs, *then* the parser/error mapper returns a safe failure and **no raw body is retained**.

**UC8 — Provider returns an invalid draft.** *Given* the provider returns a draft that fails `validateDraft`, *when* the smoke command runs, *then* smoke reports a **validation failure** and **does not** treat the provider as trusted.

**UC9 — Provider returns a valid draft.** *Given* the provider returns a draft that passes `validateDraft`, *when* the smoke command runs, *then* smoke reports **wiring success** but creates **no** evidence, delivery, athlete decision, or production state.

**UC10 — Output redaction.** *Given* any failure or success path, *when* the smoke output is inspected, *then* it contains **no** raw prompt/payload/response/secret/env value.

---

## 12. Acceptance Criteria

- Given the default tests → **no** live call occurs.
- Given no opt-in → **no** credential read or transport occurs.
- Given a CI-like environment → **no** live smoke runs (absent a future explicit CI-live policy).
- Given a missing credential → **no** transport occurs.
- Given an invalid credential → **no** transport occurs.
- Given a disabled policy → **no** transport occurs.
- Given a provider failure → **no** retry occurs.
- Given a malformed provider response → **no** raw body is retained.
- Given a validation failure → **no** rendered message is accepted.
- Given a validation success → **no** evidence / delivery / athlete decision / domain mutation is created.
- Given smoke output → **no** raw prompt/payload/response/secret/env value is present.
- Given a future implementation → **all Impl 001–025 tests remain green**, with **no SDK/dependency change** and **no package-lock surprise** (a script choice notwithstanding).

---

## 13. Explicit Forbidden Behaviors

The future boundary must forbid: **default** live provider calls; **CI** live provider calls by default; **implicit** opt-in; a raw credential in command-line history **if avoidable**; **direct `process.env` reads outside the one approved adapter**; SDK installation; dependency changes; production prompt templates; **raw prompt logging**; **raw provider request logging**; **raw provider response logging**; **raw draft persistence**; **secret / env value output**; chain-of-thought / hidden-reasoning output; **automatic retry**; a scheduler; a queue; an event bus; telemetry / model evaluation; **delivery**; **athlete-decision creation**; **evidence creation**; **domain mutation**; **validation bypass** (or any loosening of `validateDraft`); treating **provider success as recommendation quality**; and treating **smoke success as product readiness**.

---

## 14. Validation Strategy (defining tests for the future implementation)

`[DECISION]` The **negative tests are defining.** A future implementation must prove:

- the **default suite does not execute** live smoke (no live call under the default command);
- a **CI-like environment does not execute** live smoke;
- **no opt-in** stops **before** credential/transport;
- a **missing credential** stops **before** transport;
- an **invalid credential** stops **before** transport;
- a **disabled policy** stops **before** transport;
- a **provider failure** returns a safe result and **no retry**;
- a **malformed provider response** returns a safe result and **no raw body**;
- a **validation failure** does **not** become a rendered message;
- a **validation success** creates **no** evidence / delivery / athlete decision / domain mutation;
- **smoke output is redacted** — **no** raw prompt/payload/response/secret/env value;
- **no SDK/dependency change** (and **no package-lock surprise** if no package script is chosen);
- **no** event bus / scheduler / retry / telemetry / DB;
- and **all Impl 001–025 tests stay green**.

`[FACT]` These tests must achieve their guarantees **without making a live call** — they verify the *guard* behavior (skip/fail-closed/redaction) deterministically, against fakes and the existing fail-closed boundary, exactly as Impl 021–023 already do.

---

## 15. Open Design Questions (for 026A — do not resolve here)

1. Whether the smoke test is a **separate npm script** or a **Node test file skipped by default**.
2. Whether it lives under `src/modules/rendering/tests-live`, `scripts/`, or another **explicit** location.
3. How **operator opt-in** is represented (env flag, CLI arg, dedicated file — and how to avoid a raw credential in shell history).
4. Whether **CI detection** is purely environmental or command-driven.
5. Whether **live-policy enablement** is separate from **smoke opt-in** (two gates vs. one).
6. Whether to use the **process-env adapter through the existing resolver chain** or a **static resolver from an injected credential**.
7. Whether smoke output is **JSON** or **human-readable**.
8. Whether smoke uses the **rendering seam only** or **`application-orchestration` with delivery not selected** (and, if the latter, how delivery is guaranteed off).
9. Whether a **validated rendered-message body** may be printed or must be **suppressed**.
10. Whether a **provider request id** is safe to show.
11. Whether a **timeout budget** belongs in this slice.
12. Whether a future **CI-live lane** should exist.
13. Whether to add a **README/runbook** for local smoke invocation.

`[QUESTION]` These are carried forward; none blocks this behavioral spec. Technical implementation choices are not resolved here.

---

## 16. Relationship to Existing Architecture

- **Spec/Impl 025:** explicit orchestration exists — but the smoke test should **initially target the provider/rendering seam** (`requestRealProviderRendering` → `validateDraft`), not the delivery path (unless 026A decides otherwise, with delivery guaranteed off).
- **Spec/Impl 024:** the event factories exist — but the smoke test **does not require event recording** (it is not an event/telemetry surface).
- **Spec/Impl 023:** the process-env adapter exists and is the **only** approved direct env binding — the smoke test reads `process.env` **only** through it.
- **Spec/Impl 022:** the environment resolver **classifies** an injected source — the smoke test consumes a resolution, it does not classify.
- **Spec/Impl 021:** the opt-in live-provider boundary exists and is **disabled by default** — the smoke test enables it **explicitly, for one call only**, and honors fail-closed.
- **Spec/Impl 020:** the selected-provider shell + serializer/parser/error-mapper exist — the smoke test uses them, reshaping nothing.
- **Spec/Impl 019:** the async `ProviderClientBoundary` exists — the smoke test calls through it.
- **Spec/Impl 018:** the provider-attempt audit exists — the smoke test, **if** it audits, stays **raw-free**; auditing is not required.
- **Spec/Impl 017:** the provider seam exists and provider drafts are **untrusted** — the smoke test never trusts a draft pre-validation.
- **Spec/Impl 014:** only validated drafts become a `RenderedMessage` — the smoke test never bypasses `validateDraft`.
- **Spec/Impl 015:** rendered-message persistence exists — the smoke test **need not persist** (and persists no raw draft if it does).
- **Spec/Impl 016:** delivery exists — the smoke test **must not deliver**.
- **Spec/Impl 011:** event/outcome records exist — the smoke test is **not** an event bus / telemetry.
- **Spec/Impl 013:** a provider response is **not source material** unless the athlete separately reports it — the smoke test creates no observation/evidence.

Clarifications: the smoke test is an **operational wiring check** — it is **not** domain reasoning, **not** event recording, **not** delivery, **not** application delivery orchestration, **not** a production rollout, **not** model evaluation, and **not** telemetry.

---

## 17. Success Criteria

When this spec is complete, **026A** (Technical Spec) should be able to answer:

> "Can Aurora run **one** manually-invoked, opt-in live-provider smoke test through the **existing** provider/rendering boundary while guaranteeing that **default tests and CI remain deterministic and credential-free**, **validation remains mandatory**, **outputs remain redacted**, and **no domain/delivery/event side effect occurs**?"

— and by the behavioral rules (§6), the trace/output rules (§8), the failure semantics (§9), the candidate flow's seam-first decision (§10), and the defining negative tests (§14), the answer is **yes**: a manual, opt-in, bounded invocation refuses to run without explicit opt-in, fails closed before transport when opt-in/policy/credential is absent, makes at most one call through the existing live boundary, feeds the result through the unchanged parser and `validateDraft`, returns a redacted safe result only, and never persists/logs a secret or raw payload, never delivers, never creates evidence or an athlete decision, and never mutates domain state — with the smoke boundary's **placement, opt-in mechanism, CI-detection mechanism, and output format** deferred to 026A. If the spec cannot answer that, it is incomplete.
