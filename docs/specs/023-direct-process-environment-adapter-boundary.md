# Aurora — Specification 023 — Direct Process-Environment Adapter Boundary

> Phase: **Specification** (behavioral; no code).
> Builds on: `022-environment-secret-resolver-boundary.md` (+ `-tech.md`), `021-live-provider-call-enablement-boundary.md`, `020-real-provider-adapter-implementation-boundary.md`, `019-real-provider-integration-boundary.md`, `018-provider-attempt-audit-boundary.md`, `017-provider-adapter-boundary.md`, `014-llm-rendering-boundary.md`.
> Output of this document: a behavioral contract for the **first adapter that may read the real process environment** — what becomes possible, what stays forbidden, and the gate that must hold before any real environment value is used. **No code, no API key, no live call, no SDK, no dependency, no production prompt template, no event-catalog change, no broad guard weakening.**

---

## 0. Phase confirmation

This is the **Specification** phase — not Technical Specification, not Implementation.

- `[FACT]` This document describes behavior. It names no environment variable, defines no types, picks no secret manager, writes no file layout — those belong to **023A** (Technical Spec) and the implementation slice.
- `[DECISION]` Spec 023 opens **one** edge only: letting **one approved adapter** read the real process environment and **feed the existing injected `EnvironmentCredentialSource` shape**. It does **not** enable live calls, provision secrets, choose a cloud secret manager, or open delivery/events.

---

## 1. Context

Aurora's implemented modules: `observation`, `reasoning`, `understanding`, `decision-support`, `athlete`, `event-recording`, `rendering`, `delivery`. The provider edge is fully built and fail-closed, and now includes **credential resolution from an injected source**: the rendering boundary + mandatory `validateDraft` (014); rendered-message record/review + display eligibility (015); the `delivery` boundary + test sink (016); the provider seam + `FakeProviderAdapter` (017); the raw-free provider-attempt audit (018); the real-provider-ready async `ProviderClientBoundary` + `FakeProviderClient` + operational `ProviderSecretRef` (019); the selected-provider shell — `ConcreteProviderClient` + serializer/parser/error-mapper, vendor doc-level (020); the **opt-in live-provider boundary** — `LiveProviderClient`, `LiveCallPolicy` (disabled by default), an **injected `ProviderCredentialResolver`**, and native `fetch` isolated in exactly one approved file (021); and the **injected environment credential resolver** — `EnvironmentProviderCredentialResolver` reading **one configured key** from an **injected `EnvironmentCredentialSource`** (`Readonly<Record<string, string | undefined>>`), returning the existing resolution states with an opaque transient `ProviderCredentialToken` (022).

What does **not** exist: **any direct process-environment access** — **`process.env` appears nowhere in `src/`** — a production secret manager, API keys, a real SDK/dependency, production prompts, provider events, UI/API, scheduler/event bus, production DB.

Implementation 022 prepared exactly this shape (the `EnvironmentCredentialSource` is **injected** — a deterministic map in tests):

```text
Injected EnvironmentCredentialSource         ← Spec 023 supplies the first REAL-ENVIRONMENT producer of this shape
  → EnvironmentProviderCredentialResolver
  → ProviderCredentialResolution
  → LiveProviderClient
  → LiveCallPolicy gate
  → LiveProviderHttpTransport  (only if policy enabled AND credential available)
  → ProviderClientResponse → RealProviderAdapter → ProviderDraftOutcome → validateDraft → ProviderRenderOutcome
  → optional raw-free ProviderAttemptRecord
```

`[FACT]` The current state is **credential-resolution capable, but not bound to the real process environment.** The resolver consumes an injected source; nothing in `src/` reads `process.env`. Spec 023 governs the first adapter that may read it.

---

## 2. Central Question

> How can Aurora bind the existing injected environment credential resolver to the **real process environment** through **one approved adapter** without letting process-environment access, secret values, secret names, real credentials, tests, CI, logs, audit records, errors, persistence, live-call policy, transport invocation, or domain state become part of Aurora's **authority model**?

---

## 3. Core Principle

`[DECISION]` **Direct process-environment access is an operational adapter. It adapts the real environment into the existing injected `EnvironmentCredentialSource` shape; it creates no domain fact and changes no authority.**

An adapter:
- **may** adapt the real process environment into the existing injected `EnvironmentCredentialSource` shape;
- **does not** create domain facts; **does not** create evidence; **does not** enable live calls by itself; **does not** call provider transport; **does not** call the provider; **does not** call `validateDraft`; **does not** persist secrets; **does not** audit secrets; **does not** log secrets; **does not** alter `VoiceMode`, support quality, reasoning, athlete state, delivery, or events.

The adapter answers only one question:

```text
What is the value of this explicitly approved operational key right now?
```

That value may be passed **transiently** into `EnvironmentProviderCredentialResolver`. The **resolver still classifies** the credential; **`LiveCallPolicy` still gates** transport invocation; provider output **still must pass `validateDraft`**.

---

## 4. Scope / Non-Scope

**In scope (behavioral):** direct process-environment adapter behavior; the approved-file boundary; the approved process-environment token exception; env-key naming policy; real-secret redaction rules; relationship to `EnvironmentProviderCredentialResolver`, `EnvironmentCredentialSource`, `ProviderCredentialResolver`, `LiveProviderClient`, `LiveCallPolicy`, `LiveProviderHttpTransport`, and the provider-attempt audit; the deterministic test strategy; no-side-effect rules.

**Out of scope (this spec):** implementing code; provisioning real secrets; choosing a cloud secret manager; deploying/rotating secrets; installing SDKs; changing dependencies; making live calls; enabling live calls by default; live smoke tests; prompt templates; production telemetry; model evaluation; UI/API; delivery changes; event-catalog implementation; event bus; production DB/schema.

---

## 5. What changes vs Implementation 022 — and what stays forbidden

**Changes (the entire delta this spec authorizes):**
- **One approved adapter file** *may* read the real process environment — for **explicitly approved keys only** — and **produce the existing `EnvironmentCredentialSource` shape**.
- The structural guards *may* allow the **process-environment token in that one file only** (a surgical exception, mirroring the Impl 021 single-file network exception).

**Stays exactly as in Impl 022 (unchanged, non-negotiable):**
- `EnvironmentProviderCredentialResolver`, the `EnvironmentCredentialSource` shape, `ProviderCredentialResolver`, `LiveProviderClient`, `LiveCallPolicy`, `LiveProviderHttpTransport`, the serializer/parser/error-mapper, the audit, and `validateDraft` are unchanged contracts — **the adapter feeds the resolver; it does not replace it**.
- **Credential availability is not live-call enablement** — the `LiveCallPolicy` stays a separate, explicit, fail-closed gate.
- The **raw secret stays transient** and never enters domain/audit/errors/logs/persistence/tests.
- `ProviderFailure` / `ProviderOperationalFailure` **not expanded**; the event catalog **not expanded**; **no SDK/dependency/lockfile change**; **no prompt template**.
- `process.env` stays **forbidden everywhere except** the one approved adapter file.

---

## 6. Required Process-Environment Adapter Gate

`[DECISION]` Before direct process-environment access may be used, **all** of the following must be true. If **any** condition fails, Aurora **fails closed before transport** or produces a **safe credential failure**:

1. The adapter lives in **exactly one approved application file**.
2. The process-environment token is allowed **only in that file**.
3. The adapter reads **only explicitly approved keys**.
4. **No key name is inferred from domain data.**
5. **No environment scan** occurs.
6. **No fallback search** occurs unless explicitly specified and justified.
7. The raw value is returned **only into the injected environment source shape**.
8. The raw value is **not logged**.
9. The raw value is **not audited**.
10. The raw value is **not persisted**.
11. The raw value is **not included in errors**.
12. **Default tests do not require** a real environment value.
13. **CI does not require** a real credential.
14. **Credential availability does not enable live calls.**
15. **Live calls remain disabled by default.**

`[FACT]` The gate is **fail-closed**: the safe path is "no scan / value flows only into the resolver via the injected shape / safe credential failure on absence," and any uncertainty (unconfigured key, missing value, the token appearing elsewhere) resolves to it. Conditions 1–6 and 12–15 are structural/configuration constraints; 7–11 govern how a read value is handled.

---

## 7. Domain Rules To Preserve (invariants)

`[DECISION]` This spec preserves every invariant the prior slices established. At minimum:

1. A process-environment value is **not** domain data.
2. A process-environment value is **not** `Evidence`.
3. A process-environment value is **not** `Observation`.
4. A process-environment value is **not** `Understanding`.
5. A process-environment value is **not** `AthleteDecision`.
6. A process-environment value is **not** `DecisionSupport`.
7. A process-environment value is **not** `RenderedMessage`.
8. A process-environment value is **not** provider metadata.
9. A process-environment value is **not** provider-attempt audit payload.
10. A process-environment value is **not** traceability evidence.
11. Secret **availability does not enable live calls** by itself.
12. Secret **absence does not invalidate** domain output.
13. Secret **failure does not weaken** support quality.
14. Secret **names do not derive** from athlete/domain values.
15. Secret **values do not appear** in logs/errors/tests/docs examples.
16. Process-environment access **does not call provider transport**.
17. Process-environment access **does not call `validateDraft`**.
18. Process-environment access **does not create** records/review/display/delivery/events.
19. Process-environment access **does not mutate** domain state.
20. Process-environment access **does not expand `ProviderFailure`**.

---

## 8. Key Concepts To Define (behavioral)

### `ProcessEnvironmentCredentialSourceAdapter`
An adapter that **may read the real process environment** and produce the existing injected `EnvironmentCredentialSource` shape.
- **May:** read a fixed, **explicitly approved operational key**; return a source/map containing that key and value; omit missing keys; pass the value (via the source) to `EnvironmentProviderCredentialResolver`.
- **Must not:** scan all environment variables; infer key names from domain input; expose a raw secret in a public result beyond the injected-source boundary; persist a raw secret; log a raw secret; audit a raw secret; call provider transport; call the provider; call `validateDraft`; change the live-call policy; mutate domain state.
- `[FACT]` It **feeds** `EnvironmentProviderCredentialResolver` (which still performs classification); it is **not** a resolver itself and does **not** replace it.

### `ApprovedProcessEnvFile`
The one file where the process-environment token may appear.
- **Exactly one file**; application boundary only; **no domain module**, **no `shared-kernel`**, **no event/delivery/reasoning/athlete module**; **no tests requiring real values**; a structural guard must **positively assert this is the only file**.

### `ApprovedSecretKey`
The configured operational key name.
- **Explicit**; **neutral** if vendor tokens are guarded; **not derived from domain data**; **not logged/audited/persisted**; **no fallback scan**.

### `EnvironmentCredentialSource`
The injected source shape already used by `EnvironmentProviderCredentialResolver` (`Readonly<Record<string, string | undefined>>`). This adapter **feeds** that shape; it does **not** replace the resolver.

### `SecretRedactionPolicy`
Defines what must **never** appear in: errors · audit summaries · provider-attempt records · rendered messages · logs · tests · docs examples · snapshots.
- **Required:** the raw secret never appears; auth-like prefixes never appear in user-facing errors; error messages use **stable, non-secret reason codes** (the existing `missing`/`invalid` states + `ProviderOperationalFailure` members).

---

## 9. Required Use Cases (Given / When / Then)

**UC1 — Adapter reads one approved key.** *Given* an approved key is configured, *when* the adapter runs, *then* it reads **only** that key and returns an injected environment source containing **only** that key.

**UC2 — Missing key.** *Given* the approved key is absent, *when* the adapter runs and the resolver classifies the source, *then* the result is **missing** credential and **no transport call** occurs.

**UC3 — Present key.** *Given* the approved key is present, *when* the adapter runs, *then* the value is passed **transiently** into the existing resolver path and **classified there**.

**UC4 — Live policy disabled.** *Given* a present credential resolves as available but `LiveCallPolicy` is disabled, *when* live provider rendering is requested, *then* **no transport call** occurs.

**UC5 — Live policy enabled but invalid credential.** *Given* live policy is enabled but the resolver classifies the credential as invalid, *when* live provider rendering is requested, *then* **no transport call** occurs.

**UC6 — Secret redaction.** *Given* a real-like secret value exists in the environment source, *when* failures, audit, or provider-client outcomes are produced, *then* the raw value is **absent**.

**UC7 — Default tests are deterministic.** *Given* the default suite runs, *when* tests execute, *then* **no real process-environment credential is required** and **no live call** is made.

**UC8 — Structural guard catches leakage.** *Given* any file outside the approved adapter contains the process-environment token, *when* structural tests run, *then* the **suite fails**.

**UC9 — Adapter does not replace resolver.** *Given* the adapter produces a source map, *when* credential resolution is needed, *then* `EnvironmentProviderCredentialResolver` still performs the classification.

**UC10 — Adapter has no side effects.** *Given* the adapter is invoked, *when* it returns a source map, *then* it creates **no** provider attempt, rendered record, review, delivery, event, or domain mutation.

---

## 10. Acceptance Criteria

- Given an approved key configured → **only that key is read**.
- Given the key missing → the resolver produces a **missing** credential.
- Given the key present → the resolver **classifies through the existing path**.
- Given a credential available but live policy disabled → **no transport invocation**.
- Given a credential invalid → **no transport invocation**.
- Given error/audit/log output → the raw secret is **absent**.
- Given a provider attempt is audited → **no raw credential / env value / prompt / payload** is retained.
- Given default tests run → **no real credential or live call** is required.
- Given structural guards run → the process-environment token appears **only in the approved adapter file**.
- Given the future implementation runs → **all existing tests from Implementations 001–022 continue to pass**.

---

## 11. Explicit Forbidden Behaviors

This spec forbids: process-environment access **outside the approved adapter file**; arbitrary environment scanning; dynamic key construction from domain data; fallback scanning over the environment; a raw credential in a domain object / repository state / provider-attempt audit / event record / rendered message / delivery record / error message / logs / tests / docs examples; the adapter enabling live calls by itself; the adapter calling provider transport / the provider / `validateDraft`; the adapter creating records/review/display/delivery/events; the adapter mutating domain state; a secret failure invalidating domain output; secret availability validating provider output; secret handling expanding `ProviderFailure`; **and broad weakening of structural guards**.

---

## 12. Validation Strategy (defining tests for the future implementation)

`[DECISION]` The **negative tests are defining**. The future implementation must prove (deterministically, with **no real environment value and no network** in the default suite):

1. the adapter reads **only** the approved key;
2. the adapter does **not** scan the environment;
3. the adapter output feeds the existing resolver path;
4. a missing key → **missing** credential through the resolver;
5. a present key → available/invalid through the resolver rules;
6. the raw secret never appears in a provider-client outcome;
7. the raw secret never appears in an audit record when composed;
8. the raw secret never appears in logs/errors/test snapshots;
9. credential availability does **not** enable a live call if the policy is disabled;
10. policy disabled prevents transport even with a credential;
11. credential failure prevents transport;
12. the default suite does **not** require a real environment variable;
13. CI does **not** require a credential;
14. the process-environment token appears **only** in the approved adapter file;
15. **no SDK/dependency change**;
16. **no prompt-template files**;
17. **no persistence/review/display/delivery/event side effects**;
18. **all existing tests from Implementations 001–022 continue to pass.**

`[DECISION]` Because the adapter is the one file that reads the real environment, the default suite must exercise it **without** depending on a real value — the technical spec should consider whether the adapter accepts an **injectable environment accessor** (so tests drive it deterministically) or is tested only through the resolver with a fabricated source. Either way the gate and redaction rules above are absolute.

---

## 13. Relationship to Existing Architecture

- **Spec/Impl 022:** the injected environment credential resolver exists; **no direct process-environment access yet** — Spec 023 supplies the first **real-environment producer** of the `EnvironmentCredentialSource` shape the resolver already consumes.
- **Spec/Impl 021:** the opt-in live-provider boundary exists; the `LiveCallPolicy` still gates the transport.
- **Spec/Impl 020:** the selected-provider shell + serializer/parser/error-mapper exist and are unchanged.
- **Spec/Impl 019:** the async `ProviderClientBoundary` exists; the resolved credential feeds the same boundary.
- **Spec/Impl 018:** provider attempts are audited **raw-free**; a credential never enters that audit.
- **Spec/Impl 017:** the provider seam exists; provider drafts are **untrusted**.
- **Spec/Impl 014:** only validated drafts become a `RenderedMessage`.
- **Spec/Impl 015:** only validated `RenderedMessage`s may become records — the adapter creates none.
- **Spec/Impl 016:** delivery only consumes display-eligible records; **provider success does not deliver**.
- **Spec/Impl 011:** event records are occurrence history, **not provider commands**; the adapter appends none.
- **Spec/Impl 013:** a provider response is **not source material** unless separately reported by the athlete.

Clarifications: the process-environment adapter **remains behind `rendering/application`**; it **feeds the injected resolver shape** (the resolver still classifies); **credential availability is not live-call enablement**; provider output remains **draft text only**; `validateDraft` stays **mandatory**; the provider-attempt audit stays **raw-free**; secret handling is **not** delivery, **not** eventing, **not** model evaluation, **not** domain reasoning.

---

## 14. Open Questions (carried forward, non-blocking)

The exact environment variable name; whether a **production secret manager** replaces the process env later; secret rotation; deployment environment; live smoke tests outside the default suite; timeout limits; rate-limit behavior; streaming support; provider-metadata retention; cost/billing limits; production telemetry; provider event records. None resolved here; none blocks this behavioral spec.

---

## 15. Success Criteria

When this spec is complete, **023A** (Technical Spec) should be able to answer:

> "Can Aurora bind the injected environment credential resolver to the real process environment through one approved adapter while keeping secrets transient, tests deterministic, live calls separately gated, and all domain boundaries intact?"

— and by the adapter gate (§6), the preserved invariants (§7), the redaction policy (§8), and the defining negative tests (§12), the answer is **yes**: the adapter is an operational boundary that reads only an approved key and feeds the existing `EnvironmentCredentialSource` shape; the process-environment token is sealed in one approved file; the secret is read transiently and never enters domain/audit/persistence/logs/errors/tests; the resolver still classifies, the `LiveCallPolicy` still gates, and `validateDraft` remains the authority. If the spec cannot answer that, it is incomplete.
