# Spec 019 — Real Provider Integration Boundary

> How Aurora can, for the first time, accept **secrets, network calls, provider errors, and prompt/instruction material** — a *real* LLM provider behind the **existing** `ProviderAdapter` seam — **without** the provider becoming authority, bypassing validation, leaking private reasoning or secrets, persisting unsafe drafts, or creating downstream side effects. **A real provider changes the draft source, not the authority model.** The contract is unchanged: `real provider → ProviderAdapter → untrusted draft → validateDraft → RenderOutcome`, audited with **no raw draft retention**.
>
> Behavioral specification. Not implementation; no SDK; no network call; no API keys/secrets; no prompt templates as production code; no concrete provider chosen (examples are examples only); no UI/API; no event-catalog change; no changes to existing module *behavior*.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code, no SDK/network/secrets, no prompts-as-code, no provider chosen, no UI/API, no event-catalog change) |
| **Slice** | `RealProviderAdapter (behind the existing ProviderAdapter seam) → untrusted ProviderDraft → validateDraft (unchanged, mandatory) → RenderOutcome → ProviderAttemptRecord (safe summary, no raw draft)` |
| **Builds on** | Spec/Impl 017 (provider adapter seam) · 018 (provider-attempt audit) · 014 (rendering + mandatory `validateDraft`) · 015 (record/review) · 016 (delivery) · 011 (event records) · 013 (manual input) |
| **Produces (behavior)** | a `RealProviderAdapter`, `ProviderClientBoundary`, `ProviderSecret`, `ProviderInstruction`/prompt-material rules, `ProviderResponse`, `ProviderOperationalFailure`; provider-agnostic integration rules; the test contract |
| **Explicitly does not produce** | a concrete provider choice, an SDK, API keys/secrets, network/HTTP clients, env-var reads, prompt templates as production code, prompt optimization, streaming, a real retry scheduler, queues/jobs, provider telemetry/eval, billing enforcement, UI/API, delivery changes, an event-catalog change/event bus, a production DB/schema |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (the `RealProviderAdapter` shape behind the existing `ProviderAdapter` port, the sync-vs-async call shape, the `ProviderClientBoundary` isolation, secret/config handling, the provider-error→`ProviderFailure` mapping, whether a real provider is chosen) follows separately as **019A**. Implementation does not begin from this document, and **no provider, SDK, secret, network, prompt, or storage technology is chosen here**.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture/implementation. |
| **[DECISION]** | A specification commitment for this slice. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open; does not block. |

Principal **[DECISION]**s use **Decision · Why · Consequence · Risk · Reversal Point**.

---

## 1. Summary & Central Question

[FACT] **Central question:** *How can Aurora integrate a real provider behind the existing provider adapter seam without letting secrets, network calls, prompts, provider responses, retries, or provider metadata become domain authority, source truth, evidence, review, display eligibility, delivery, events, or reasoning?*

[FACT] Impl 017 built the provider **seam** (the `ProviderAdapter` port + a deterministic fake), Impl 018 made provider attempts **auditable** with **no raw draft retention**. The contract is already proven *with a fake mouth*. This slice specifies the first integration of a **real mouth** — the first time Aurora accepts **secrets, network, provider errors, and prompt material** — and its whole job is to make that addition **change only the draft source**, never the authority model.

[FACT] This is the boundary the Core Completion Review names as the **most dangerous next shortcut**: *wiring a real LLM provider in a way that bypasses the validator, leaks secrets/prompts into the domain, or lets the audit start retaining raw drafts.* The danger guarded is precise: a real provider's response (or its secrets, prompts, latency, cost, finish-reason, refusal) becoming authority/evidence, skipping `validateDraft`, persisting raw, or firing a downstream effect.

[FACT] Three rules, restated:
- **A real provider changes the draft source, not the authority model.**
- **The existing `validateDraft` remains mandatory; the domain remains the source of truth.**
- **Provider attempts may be audited without raw draft retention — and no provider response bypasses validation, persists, delivers, mutates, or triggers events/retries unless a later spec explicitly defines that boundary.**

---

## 2. Core Principle

[FACT] **The provider may generate draft text; Aurora still decides whether that draft can become a `RenderedMessage`.** A `RealProviderAdapter` implements the **same** `ProviderAdapter` interface (Impl 017): it receives a **constrained `ProviderRenderingRequest`**, calls a provider through an isolated client boundary, and returns a `ProviderDraftOutcome`. The existing **`validateDraft` remains the mandatory gate**; the **domain remains the source of truth**.

[FACT] **Provider output remains untrusted.** **Provider prompts are instructions for phrasing, not reasoning.** **Provider metadata is operational, not epistemic** (model id, latency, token count, finish reason, cost, rate-limit headers are operational — never `Evidence`/`Observation`/`Understanding`/`SupportQuality`/athlete state). **Secrets are operational credentials, never domain data.** **Every provider failure degrades to safe non-rendering.**

[ASSUMPTION] The guiding sentence: *making the mouth real must change nothing an auditor would call "the truth" — only where the words come from.* If a real provider's response, secret, prompt, retry, or metadata could change what the domain meant, skip validation, be persisted raw, or fire a downstream effect, the boundary is wrong.

---

## 3. Scope & Non-Scope

### In scope
[DECISION] real-provider-adapter **behavior**; **provider-agnostic** integration rules; provider request construction (unchanged constrained `ProviderRenderingRequest`); **network boundary** behavior; **secret/configuration boundary** behavior; **prompt/instruction boundary** behavior; **response handling**; **provider-error mapping** (to the existing closed `ProviderFailure`); **timeout/rate-limit** behavior; **retry constraints** (deferred this slice); safe-failure behavior; the relationships to the existing `ProviderAdapter`, `validateDraft`, and the provider-attempt audit; **no-raw-draft-retention preservation**; and **no downstream side effects**.

### Non-Scope
[FACT] choosing a concrete provider; installing an SDK; writing code; network clients; API keys; env-var reads; prompt-template implementation; prompt optimization; streaming; a real retry scheduler; queues/background jobs; provider telemetry infrastructure; model evaluation; billing/cost enforcement implementation; UI/API; delivery changes; a production DB/schema; an event-catalog implementation; an event bus; deployment/secrets infrastructure.

[DECISION] **No provider, SDK, secret, network, prompt, or storage technology is chosen.** A concrete provider name, if it appears, is an **example only**. The boundary is defined behaviorally; a future implementation may still prove it with a **fake/in-process client** (no real network) behind the `ProviderClientBoundary` — *exactly* as Impl 017/018 proved the seam with a fake.

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] The boundary must satisfy **all**:

1. Real provider output is **not** domain authority.
2. …is **not** a `TerminalOutput`.
3. …is **not** `DecisionSupport`.
4. …is **not** a `Recommendation`.
5. …is **not** `Evidence`.
6. …is **not** `Observation`.
7. …is **not** `Understanding`.
8. …is **not** an `AthleteDecision`.
9. …is **not** a `RenderedMessage` **until it passes `validateDraft`**.
10. …is **not** a `RenderedMessageRecord`.
11. Provider **metadata is not evidence**.
12. Provider **success does not validate** recommendation quality.
13. Provider **failure does not weaken** `SupportQuality`.
14. Provider **latency/cost/rate-limit is not athlete state**.
15. Provider does **not** select or change `VoiceMode`.
16. Provider request **must not expose** raw private reasoning or chain-of-thought.
17. Provider prompt/instructions **must not override** domain constraints.
18. Provider output **must pass the same mandatory validator** as fake-provider output.
19. Provider attempts **must preserve the no-raw-draft-retention** audit policy unless a later spec changes it.
20. Provider integration **must not create** review, display eligibility, delivery, events, retries, or domain mutation as side effects.

[ASSUMPTION] The *defining* invariants are **1, 9, 16/17, 18, 19, 20** — together they make "a real provider's response/secret/prompt/metadata became authority, skipped the validator, leaked reasoning, was retained raw, or fired a downstream effect" a failing test.

---

## 5. Key Concepts (defined behaviorally)

### 5.1 RealProviderAdapter
[DECISION] A **concrete adapter behind the existing `ProviderAdapter` seam** (Impl 017) — same interface, different draft source.
- **May:** receive a **constrained `ProviderRenderingRequest`**; call a provider through a **future SDK/network boundary** (the `ProviderClientBoundary`, §5.2); return a `ProviderDraftOutcome`; **map provider failures** to the existing closed `ProviderFailure` categories.
- **Must not:** receive raw domain internals; receive chain-of-thought; select `VoiceMode`; create a `RenderedMessage`; create a `RenderedMessageRecord`; create review/display-eligibility/delivery; persist provider output; append events; mutate domain state.
- [FACT] Because it implements the **same `ProviderAdapter` interface**, the surrounding flow (`requestProviderRendering` → `validateDraft`) and the provider-attempt audit are **unchanged** — the real adapter is strictly an alternate draft source.

### 5.2 ProviderClientBoundary
[DECISION] The **narrow operational boundary** that would eventually perform a provider call — **isolated** from domain modules and from delivery.
- **May know:** the provider endpoint/client; the provider authentication mechanism; timeout configuration; a model/deployment identifier *if a future tech spec allows it*.
- **Must not know:** domain aggregate mutation APIs; reasoning internals; raw hypotheses/evidence beyond approved renderable content; athlete state beyond what `ProviderRenderingRequest` safely exposes; display/review/delivery state.
- [DECISION] It lives **behind `rendering`** (where the seam lives) and is the **only** place network/SDK/secret concerns exist; everything domain-facing sees only a `ProviderDraftOutcome`.

### 5.3 ProviderSecret
[DECISION] An **operational credential** (or reference) used to authenticate with a real provider. Rules:
- secrets are **never domain data**;
- secrets are **never persisted** in domain/application records;
- secrets are **never included** in provider-attempt audit records;
- secrets are **never logged**;
- secrets are **never exposed in errors**;
- a **missing/invalid secret maps to a safe provider failure** (no network call, no rendered message).

### 5.4 ProviderInstruction / Prompt Material
[DECISION] A **constrained phrasing instruction** derived from already-approved rendering inputs.
- **May specify:** a **safe style**; a **supported locale**; the **terminal output kind**; **required uncertainty/limitation visibility**; **allowed claims**; **forbidden claims**; **traceability constraints**.
- **Must not include:** arbitrary caller-provided prompt text; chain-of-thought requests; instructions to hide uncertainty; instructions to escalate voice; instructions to ignore validation; hidden reasoning; mutable aggregate handles.
- [FACT] This is the same discipline as `ProviderRenderingRequest` (Impl 017): prompt material is *derived from* the constrained request, never an open caller-supplied prompt. **Prompts are for phrasing, not reasoning** (invariant 17).

### 5.5 ProviderResponse
[DECISION] The **raw provider response before validation** — **untrusted**.
- **May contain:** draft text; provider refusal/failure information; operational metadata.
- **Must not be treated as:** source truth; `Evidence`; a `RenderedMessage`; a record; a review; a delivery. It is mapped to a `ProviderDraftOutcome` and (on the drafted branch) fed to the **unchanged** `validateDraft`.

### 5.6 ProviderOperationalFailure
[DECISION] A **provider integration failure**, mapped to the existing closed `ProviderFailure` set (so it degrades to safe non-rendering). Examples → mapping:
- missing/invalid credential, unsupported model/deployment, request rejected by provider → **`provider-refused`** (or a future reserved reason if 019A adds one) — *no domain leak*;
- provider unavailable → **`provider-unavailable`**;
- timeout → **`provider-timeout`**;
- rate limited → **`provider-rate-limited`**;
- malformed/empty response → **`provider-returned-invalid-draft`** / **`provider-returned-empty-draft`**;
- unsafe request blocked before the call → **`unsafe-provider-request`** / **`unsupported-style`** / **`unsupported-locale`**.
- [DECISION] Any provider-specific code/detail may be **captured operationally** (for debugging) but **must not leak into domain authority** and must **map down** to the closed `ProviderFailure`. **Every** failure → **safe non-rendering** (invariant 20).

---

## 6. What changes, what stays (the whole point)

[FACT] The real surface today (Impl 017/018): `ProviderAdapter.draft(request) → ProviderDraftOutcome`; `requestProviderRendering` runs `providerRenderingRequestFrom` → `provider.draft(...)` → `validateDraft(...)`; `auditProviderAttempt` observes the `ProviderRenderOutcome` and records a safe summary with `rawDraftRetained: false`.

[DECISION] **What stays unchanged:**
- the `ProviderAdapter` **interface** and the `requestProviderRendering` flow;
- the **mandatory `validateDraft`** gate (the *only* path to a `RenderedMessage`);
- the **constrained `ProviderRenderingRequest`** (no raw reasoning / chain-of-thought / override fields);
- the **provider-attempt audit** with **no raw draft retention**;
- the fact that nothing downstream (record/review/display/delivery/event) is created by the provider path.

[DECISION] **What changes (and only this):** the **draft source** — a `RealProviderAdapter` + an isolated `ProviderClientBoundary` that *may* touch secrets/network/prompt material — replaces the deterministic fake as one possible `ProviderAdapter`.

[QUESTION] **Sync vs async:** the current `ProviderAdapter.draft(...)` is **synchronous** (returns `ProviderDraftOutcome`, not a `Promise`). A real network call is asynchronous. Whether the real adapter requires an **async variant of the port** (and an async `requestProviderRendering`) or an injected client is a **technical-shape question deferred to 019A** — it does **not** change this behavioral contract (untrusted draft → `validateDraft` → `RenderOutcome`, audited raw-free). 019A must resolve it without weakening any invariant here.

[ASSUMPTION] "Make the mouth real, keep every gate." If integrating a real provider requires changing anything other than the draft source (and the isolated client/secret boundary), the design has drifted.

---

## 7. Required Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§9). **Negative criteria are defining.**

### UC1 — Real provider returns a safe draft
- **AC1.1** — *Given* a `RealProviderAdapter` receives a constrained provider request and returns draft text preserving voice, uncertainty, limitations, and allowed claims, *when* the draft passes `validateDraft`, *then* Aurora may produce a `RenderedMessage` **without** creating records, review, display eligibility, delivery, or domain mutation.

### UC2 — Real provider escalates voice
- **AC2.1** — *Given* the domain-selected `VoiceMode` is `Reflection`, *when* the provider returns advice/recommendation-like text, *then* `validateDraft` **rejects** the draft and the outcome is **safe non-rendering**.

### UC3 — Provider response invents facts
- **AC3.1** — *Given* provider output includes content outside the allowed claims, *when* validated, *then* Aurora **rejects** it and **does not persist the raw draft**.

### UC4 — Missing credential
- **AC4.1** — *Given* no valid provider credential is available, *when* provider rendering is requested, *then* the adapter returns a **provider failure** and **no network call or rendered message** occurs.

### UC5 — Timeout / rate limit
- **AC5.1** — *Given* the provider times out or rate-limits, *when* rendering is attempted, *then* Aurora maps it to a **provider failure**, produces **no rendered message**, and **does not retry automatically** in this slice.

### UC6 — Unsafe prompt instruction
- **AC6.1** — *Given* a caller attempts to inject "hide uncertainty" or "be decisive" into provider instructions, *when* the provider request is constructed, *then* the unsafe instruction is **rejected before the provider call**.

### UC7 — Provider returns a malformed response
- **AC7.1** — *Given* the provider response lacks usable text or has an unexpected shape, *when* handled, *then* it maps to a **safe provider failure** and **no final message** is produced.

### UC8 — Provider attempt audit preserves the no-raw-draft policy
- **AC8.1** — *Given* the provider returns unsafe text, *when* the attempt is audited, *then* **only a safe summary / failure reasons** are retained; **raw draft text is not stored**.

### UC9 — Provider success does not deliver
- **AC9.1** — *Given* provider rendering succeeds and a `RenderedMessage` is produced, *when* the flow completes, *then* **no** rendered-message record, review, display eligibility, delivery, or event is created automatically.

### UC10 — Provider metadata does not become evidence
- **AC10.1** — *Given* the provider returns metadata (model id, latency, token count, finish reason), *when* recorded or handled, *then* it remains **operational metadata** and is **not** `Evidence`/`Observation`/`Understanding`/`SupportQuality`/athlete state.

---

## 8. Acceptance Criteria (consolidated)

[DECISION] At minimum:
- Given a safe real-provider draft, when it passes validation, then it **may become a `RenderedMessage`**.
- Given a provider draft fails validation, then **no `RenderedMessage` exists**.
- Given missing/invalid credentials, then a **provider failure is returned safely**.
- Given timeout/rate-limit, then a **provider failure is returned safely**.
- Given an unsafe prompt instruction, then the **provider call is blocked**.
- Given a malformed response, then a **provider failure is returned safely**.
- Given the provider succeeds, then **no record/review/display/delivery/event/domain mutation** is created.
- Given a provider attempt is audited, then **raw draft is not retained**.
- Given provider metadata exists, then it is **operational only**, not domain evidence.
- Given this spec is implemented later, then **all 441 Impl 001–018 tests continue to pass**.

---

## 9. Explicit Forbidden Behaviors

[FACT] This spec forbids:
- real provider output **bypassing `validateDraft`**;
- provider **SDK/network code inside domain modules**;
- provider code **importing** `reasoning`/`understanding`/`athlete`/`observation`;
- provider output creating a **`TerminalOutput`**;
- provider output **selecting or changing `VoiceMode`**;
- provider output creating a **`Recommendation`**;
- provider output creating **`Evidence`**;
- provider output becoming **`Observation`**;
- provider output becoming **`Understanding`**;
- provider output becoming an **`AthleteDecision`**;
- provider prompt containing **chain-of-thought**;
- provider request exposing **raw private reasoning**;
- provider request exposing **mutable aggregate handles**;
- **arbitrary caller prompt** reaching the provider;
- provider **metadata becoming a domain signal**;
- provider **success validating support quality**;
- provider **failure invalidating the domain output**;
- provider **failure triggering an automatic retry/scheduler**;
- a provider call **creating event records**;
- a provider call **creating rendered-message records**;
- a provider call **creating review/display/delivery**;
- **secrets persisted in records**;
- **secrets logged or included in errors**;
- **raw unsafe draft retained in the audit**;
- real provider integration **changing delivery behavior**.

[DECISION] These are **testable negative requirements** (§10).

---

## 10. Validation Strategy

[ASSUMPTION] Tests to the contract; **negative tests are defining.** A future fake/in-process client behind the `ProviderClientBoundary` lets every case be tested **without real network/secrets**.

**Positive:**
- a **safe real-provider draft passes only through the validator** and may become a `RenderedMessage`;
- provider **operational metadata** (if surfaced) is carried operationally, never as a domain field.

**Negative (must prove absence):**
- a provider draft **cannot bypass validation** (the only path to a message is `validateDraft`);
- **voice escalation / invented fact / hidden uncertainty rejected** (the unchanged validator);
- **missing credential / invalid credential / timeout / rate-limit / malformed response → safe failure** (no network on missing-credential; no message);
- an **unsafe prompt instruction is rejected before the call**;
- the **provider attempt audit retains no raw draft**;
- provider **metadata is operational, not evidence**;
- provider **success creates no record/review/display/delivery/event**;
- provider **failure mutates no domain** and **triggers no automatic retry/scheduler/event bus**;
- **secrets are not persisted/logged** (not in records, errors, or audit);
- **no provider SDK/API/network/prompt file** leaks into a domain module (structural guard).

**Dependency-boundary:**
- the `RealProviderAdapter` + `ProviderClientBoundary` live **behind `rendering`**, implement the existing `ProviderAdapter` interface, and import only what the seam already allows (own `rendering` surfaces + `shared-kernel` + read-only `decision-support` *types*) — **never** `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`; upstream modules never import them;
- **all 441 Impl 001–018 tests continue to pass.**

[ASSUMPTION] The negative tests are the contract that *a real provider changes the draft source, not the authority model*. If they cannot be written/passed, the boundary design is wrong.

---

## 11. Relationship To Existing Architecture

[FACT] Builds on, without altering:
- **Spec/Impl 017 (provider seam)** — the `ProviderAdapter` seam and untrusted-draft semantics already exist; a `RealProviderAdapter` implements the **same** interface.
- **Spec/Impl 018 (provider-attempt audit)** — provider attempts are audited with **no raw draft retention**; this slice **preserves** that policy for real attempts.
- **Spec/Impl 014 (rendering)** — **only validated drafts become a `RenderedMessage`**; `validateDraft` is unchanged and mandatory.
- **Spec/Impl 015 (record/review)** — **only a validated `RenderedMessage` may become a rendered-message record**; the provider path creates none automatically.
- **Spec/Impl 016 (delivery)** — delivery consumes only display-eligible records; **provider success does not deliver**.
- **Spec/Impl 011 (event records)** — event records are occurrence history, not provider commands; the provider path appends none.
- **Spec/Impl 013 (manual input)** — a provider response is **not source material** unless the athlete separately reports it via the manual adapter.

[DECISION] The boundary picture: **real provider integration stays behind `rendering` · provider output is draft text only · `validateDraft` remains mandatory · the provider-attempt audit stays raw-free · real integration is not delivery, not eventing, not model evaluation · secrets/network/prompts live only in the isolated client boundary.**

---

## 12. Open Questions (do not block this spec)

[QUESTION]
- which provider, if any, to integrate first; **SDK vs HTTP client**;
- the **sync-vs-async** call shape (§6) — does the `ProviderAdapter` port need an async variant?;
- **secret management** mechanism; **model/deployment** configuration; **timeout** limits;
- **retry policy** / **rate-limit handling**; **streaming** support;
- **provider metadata retention** (what operational metadata, if any, is kept);
- **cost/billing** limits; **prompt material storage**; **localization** quality;
- **model evaluation**; **production telemetry**; **provider event records**.

[ASSUMPTION] None block this slice: Aurora can define what a safe real-provider boundary must and must not do regardless of how these resolve. Technical-implementation questions are deferred to 019A.

---

## 13. Success Criterion

> **"Can Aurora introduce a real provider behind the existing provider seam without letting secrets, network calls, prompts, provider responses, retries, or metadata become authority, evidence, persistence, review, delivery, events, or domain mutation?"**

[ASSUMPTION] Answerable from this spec: a **`RealProviderAdapter`** implements the **same `ProviderAdapter` interface** (Impl 017) and returns a `ProviderDraftOutcome` from an isolated **`ProviderClientBoundary`** (the only place secrets/network/SDK exist); a **`ProviderSecret`** is operational-only (never domain data, never persisted/logged/in-audit/in-errors; missing/invalid → safe failure); **`ProviderInstruction`/prompt material** is derived from the constrained `ProviderRenderingRequest` (safe style/locale, kind, allowed/forbidden claims, uncertainty/limitation/traceability constraints) and **never** carries arbitrary prompt text, chain-of-thought, override-voice/hide-uncertainty/ignore-validation, or mutable handles; a **`ProviderResponse`** is **untrusted** and becomes a `RenderedMessage` **only** by passing the **unchanged mandatory `validateDraft`**; a **`ProviderOperationalFailure`** (missing/invalid credential, unavailable, timeout, rate-limit, malformed/empty, refused, unsafe-request-blocked) maps to the closed `ProviderFailure` and **degrades to safe non-rendering** with **no automatic retry**; provider **metadata is operational, not evidence**; provider **success validates no recommendation quality** and **failure weakens no `SupportQuality`** and **invalidates no domain output**; the **provider-attempt audit stays raw-free**; and provider integration **creates no record/review/display-eligibility/delivery/event and mutates no domain** — with **no provider/SDK/secret/network/prompt/storage chosen** (a fake/in-process client suffices to prove it) and **all 441 existing tests staying green** — proving a real provider can change the *draft source* without ever changing the *authority model*.

---

## Known Risks

[ASSUMPTION]
- **Risk:** a real provider response bypasses the validator / becomes authority. **Defense:** invariants 1/9/18 + UC1/§6 — the real adapter is just another `ProviderAdapter`; `validateDraft` is the only path to a message; negative test that no message exists without validation.
- **Risk:** secrets leak (into records, audit, logs, errors). **Defense:** §5.3 + invariants on secrets + UC4 — secrets are operational-only, never persisted/logged/audited; missing/invalid → safe failure; negative test asserts no secret in any record/error.
- **Risk:** prompts carry reasoning / override constraints / arbitrary caller text. **Defense:** §5.4 + invariants 16/17 + UC6 — prompt material is derived from the constrained request; unsafe instructions are refused before the call.
- **Risk:** provider metadata becomes a domain signal. **Defense:** invariants 11/14 + UC10 — metadata is operational; never `Evidence`/`Observation`/`SupportQuality`/athlete state.
- **Risk:** failures trigger retries / weaken support / invalidate the domain. **Defense:** invariants 12/13/20 + UC5 — every failure degrades to safe non-rendering; no automatic retry/scheduler; success/failure never grade the domain.
- **Risk:** the audit starts retaining raw drafts "to debug" a real provider. **Defense:** invariant 19 + UC8 — the no-raw-draft policy (Impl 018) is preserved; only safe summaries/reasons are kept.
- **Risk:** the slice drifts into delivery/eventing/eval or leaks SDK/network into the domain. **Defense:** §3 non-scope + §9 forbidden + structural guard — integration stays behind `rendering` in an isolated client boundary; no delivery/event/eval; a fake client proves it.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the nineteenth Specification and the first real-provider integration boundary. It defines how Aurora may accept secrets, network, provider errors, and prompt material behind the existing provider seam — changing only the draft source, never the authority model — and chooses no provider, SDK, secret, network, prompt, or storage technology. The provider drafts; the unchanged validator decides; the domain stays the source of truth; the audit stays raw-free.*

*Inputs: [Spec 018](./018-provider-attempt-audit-boundary.md) · [Spec 018A](./018-provider-attempt-audit-boundary-tech.md) · [Spec 017](./017-provider-adapter-boundary.md) · [Spec 017A](./017-provider-adapter-boundary-tech.md) · [Spec 014](./014-llm-rendering-boundary.md) · [Spec 015](./015-rendered-message-review-persistence.md) · [Spec 016](./016-delivery-boundary.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 013](./013-manual-input-adapter.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
