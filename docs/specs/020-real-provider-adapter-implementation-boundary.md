# Spec 020 — Real Provider Adapter Implementation Boundary

> How Aurora can implement the **first concrete real provider adapter** behind the already-ready async `ProviderClientBoundary` (Impl 019) — finally permitting an external draft-generation call with **SDK/network/credentials/prompt material** — **without** vendor SDKs, network calls, API keys, prompts, provider responses, metadata, retries, or vendor behavior becoming domain authority or bypassing the validator. **A concrete real provider adapter may perform an external call; it may not change the authority model.** The provider is still only a draft source; `validateDraft` is still the gate; secrets stay out of the domain and the audit; **and no concrete provider is selected here.**
>
> Behavioral specification. Not implementation; no SDK install; no network call; no API keys; no env reads; no production prompt templates; **no vendor chosen** (the provider-selection gate is defined, the choice deferred); no event-catalog change; no changes to existing module *behavior*.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code, no SDK/network/secrets, no prompts-as-code, **no vendor chosen**, no UI/API, no event-catalog change) |
| **Slice** | `(after a recorded ProviderSelectionDecision) ConcreteProviderAdapter behind the existing async ProviderClientBoundary → untrusted ProviderClientResponse → ProviderDraftOutcome → unchanged validateDraft → ProviderRenderOutcome → raw-free audit (explicit) — live calls disabled by default` |
| **Builds on** | Spec/Impl 019 (real-provider-ready async client boundary) · 018 (raw-free attempt audit) · 017 (provider seam) · 014 (rendering + mandatory `validateDraft`) · 015 (record/review) · 016 (delivery) · 011 (event records) · 013 (manual input) |
| **Produces (behavior)** | a `ProviderSelectionDecision` gate, a `ConcreteProviderAdapter`, a `ProviderCredentialBoundary`, a `ProviderPromptSerializer`, a `ProviderResponseParser`, a `LiveCallPolicy`; provider-agnostic real-adapter rules; the no-live-call test contract |
| **Explicitly does not produce** | a chosen vendor, an SDK, API keys/secrets, real network/HTTP clients, env-var reads, prompt-template files, model evaluation, telemetry, streaming, automatic retries, billing enforcement, UI/API, delivery changes, an event-catalog change/event bus, a production DB/schema |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (the provider-selection decision itself, SDK-vs-HTTP, where the concrete client lives, the credential/live-call mechanism, the response-parsing and error-mapping shapes, the no-live-call test doubles) follows separately as **020A** — and **020A is the first place a concrete vendor may be named**. Implementation does not begin from this document, and **no provider, SDK, secret, network, prompt, or storage technology is chosen here.**

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

[FACT] **Central question:** *How can Aurora permit a first concrete real provider adapter without letting provider SDKs, network calls, API keys, prompt payloads, provider responses, provider metadata, retries, logs, or vendor-specific behavior become source truth, evidence, persistence, review, delivery, events, or domain mutation?*

[FACT] Impl 019 built the real-provider-**ready** boundary: an async `ProviderClientBoundary`, a deterministic `FakeProviderClient`, operational `ProviderSecretRef`s, structured `ProviderInstruction`s, and a `ProviderOperationalFailure → ProviderFailure` mapping — all behind the **unchanged** `validateDraft`, with the **sync seam untouched**. Everything is in place *except an actual external call*. This slice specifies the first boundary that may **fill that seam with a real vendor** — and its only job is to make that filling **change the draft source, never the authority model**.

[FACT] This is the boundary the Core Completion Review names as the **most dangerous next shortcut**: *implementing a real client that bypasses the validator, leaks secrets/prompts into the domain or the audit, or lets the audit start retaining raw drafts.* The danger guarded is precise: a vendor's SDK, response, secret, prompt, latency, cost, finish-reason, or error becoming authority/evidence, skipping `validateDraft`, being persisted raw, or firing a downstream effect — and the *new* danger of **a live external call** happening by default, in tests, or in CI.

[FACT] Three rules, restated:
- **A concrete real provider adapter may perform an external draft-generation call; it may not change Aurora's authority model.**
- **The existing `ProviderClientBoundary` remains the boundary; the existing `validateDraft` remains the gate; provider output remains untrusted.**
- **No concrete provider is chosen here** — this spec defines the **provider-selection gate**; the vendor and mechanism are deferred to **020A**.

---

## 2. Core Principle

[FACT] **The real provider is still only a draft source.** A `ConcreteProviderAdapter` implements the **existing** async `ProviderClientBoundary`: it transforms a `ProviderClientRequest` into a vendor payload, calls the vendor (via an approved SDK/HTTP client *if 020A permits*), parses the response, and returns a `ProviderClientResponse`. The **`validateDraft` gate is unchanged and mandatory**; the **domain remains the source of truth**.

[FACT] **What stays operational, never epistemic:** provider **output** is untrusted draft text; provider **metadata** (model id, tokens, finish reason, latency, request id, cost) is operational, never `Evidence`/`Observation`/`Understanding`/`SupportQuality`/athlete state; provider **configuration** is operational; **secrets** stay outside the domain *and* the audit *and* logs *and* errors; provider **prompts** are a constrained serialization of approved instruction material, **not a new reasoning surface**; provider **failures** degrade to safe non-rendering; provider **attempts** remain auditable **without raw draft retention**.

[ASSUMPTION] The guiding sentence: *attaching a real mouth must change nothing an auditor would call "the truth," nothing that runs without explicit opt-in, and nothing a CI box needs a credential for — only where the words come from, and only when someone deliberately turns it on.* If a real client could become authority, skip validation, leak a secret, retain a raw draft, call out by default, or fire a downstream effect, the boundary is wrong.

---

## 3. Scope & Non-Scope

### In scope
[DECISION] the **real-provider-adapter boundary** behavior; the **provider-selection gate**; the **SDK-vs-HTTP decision boundary**; the **secret/config boundary**; **provider request payload construction**; **prompt serialization** rules; **network-failure** behavior; **response parsing**; **provider-metadata handling**; **operational-failure mapping**; the relationships to `ProviderClientBoundary`, `ProviderInstruction`, `ProviderSecretRef`, `ProviderRenderOutcome`, and the provider-attempt audit; and the **no-live-call test strategy**.

### Non-Scope
[FACT] implementing code; installing a specific SDK; making live external calls; creating real API keys; provisioning secrets; deployment configuration; production prompt-template files; model evaluation; telemetry infrastructure; streaming; automatic retries; background jobs; cost/billing enforcement implementation; UI/API; delivery changes; a production DB/schema; an event-catalog implementation; an event bus.

[DECISION] **No vendor, SDK, secret, network, prompt, or storage technology is chosen.** The boundary is behavioral; even after 020A names a vendor, the contract must remain **provable without any live call** (deterministic test doubles behind the same `ProviderClientBoundary`).

---

## 4. Provider Selection Gate

[FACT] **No concrete provider is selected yet** — verified against the repository: every vendor-name occurrence in `src/` is a **negative-capability guard** that *forbids* vendor/network tokens (`openai`/`anthropic`/`axios`/`node:http(s)`/`fetch(`/`process.env`); **none** is a selection.

[DECISION] Therefore, this spec records the gate verbatim:

> **No concrete provider is selected yet. Implementation 020 may only add a concrete provider adapter after 020A records an explicit provider-selection decision.**

[DECISION] Before Implementation 020 may touch a real SDK/network/provider, **020A must answer** (the `ProviderSelectionDecision`, §5.2):
1. **Which provider** is being integrated?
2. **Why this provider first?**
3. **SDK or HTTP client?**
4. **Where does the provider client live?** (behind `ProviderClientBoundary`, isolated from domain modules)
5. **How are credentials supplied?** (the `ProviderCredentialBoundary`, §5.3)
6. **How are credentials absent in tests?** (deterministic doubles; no real secret)
7. **How are live calls disabled by default?** (the `LiveCallPolicy`, §5.6)
8. **How is deterministic testing preserved?** (no-live-call doubles)
9. **How are network/SDK tokens excluded from domain modules?** (structural guards)
10. **How are provider-specific errors mapped** to the existing `ProviderOperationalFailure` (and then to `ProviderFailure`)?

[DECISION] **Do not silently select a vendor.** A vendor name appearing in any production file *before* a recorded `ProviderSelectionDecision` is a spec violation. (When a vendor is chosen, the relevant negative-capability guard is the documented, test-only place that changes — and only to *permit the chosen adapter's isolated client file*, never to loosen the domain modules.)

---

## 5. Key Concepts (defined behaviorally)

### 5.1 ConcreteProviderAdapter
[DECISION] A **provider-specific implementation behind the existing `ProviderClientBoundary`** (Impl 019).
- **May:** transform a `ProviderClientRequest` into a vendor-specific request payload (via the `ProviderPromptSerializer`); **call a vendor through an approved SDK or HTTP client *if 020A permits and live calls are enabled***; parse the response (via the `ProviderResponseParser`); return a `ProviderClientResponse`; **map vendor-specific errors** to `ProviderOperationalFailure`.
- **Must not:** import domain modules; receive raw domain internals; receive chain-of-thought; select `VoiceMode`; create a `RenderedMessage`; call `validateDraft` (the existing service owns that step); create records/review/display/delivery/events; persist provider output; mutate domain state.
- [FACT] It is just another implementation of the **same** async `ProviderClientBoundary` — the surrounding `requestRealProviderRendering` flow and the validator are unchanged; the concrete adapter is strictly an alternate, real draft source.

### 5.2 ProviderSelectionDecision
[DECISION] The **explicit decision** (recorded in 020A) that names the first real provider and the mechanism. It should include: the **provider name**; the **adapter name**; the **SDK-vs-HTTP** mechanism; the **secret-reference mechanism**; the **live-call disablement rule**; the **test-double strategy**; the **failure-mapping plan**; and a **rollback/safe-disable strategy**. Absent this decision, no concrete adapter exists.

### 5.3 ProviderCredentialBoundary
[DECISION] The boundary that **supplies credentials** to the concrete adapter. Rules:
- a **raw secret must not** be represented in domain types, serialized into state, appear in the audit, appear in errors, or appear in tests;
- a **missing/invalid credential maps to safe failure**;
- **live calls are disabled by default** in test and local deterministic paths.
- [FACT] This sits **at/behind the `ProviderClientBoundary`**, outside the domain; the domain continues to see only the operational `ProviderSecretRef` (status + opaque ref) from Impl 019.

### 5.4 ProviderPromptSerializer
[DECISION] A serializer from a structured `ProviderInstruction` (Impl 019) to vendor-specific prompt/request fields.
- **May serialize:** approved style; locale; terminal output kind; selected voice; allowed claims; forbidden claims; uncertainty/limitation visibility; traceability constraints.
- **Must not:** accept arbitrary prompt strings; request chain-of-thought; hide uncertainty; override voice; remove limitations; instruct the provider to ignore the validator; include secrets; include mutable aggregate handles.
- [FACT] It serializes *only* what the constrained `ProviderInstruction` already permits — prompts are a **rendering of approved instruction material, not a new reasoning surface** (invariant 16).

### 5.5 ProviderResponseParser
[DECISION] A parser from a vendor-specific response to a `ProviderClientResponse`.
- **Must:** extract draft text **only as an untrusted draft**; map empty/malformed responses to an operational failure; keep metadata **operational**; **never** create a `RenderedMessage`; **never** persist a raw provider payload; **never** treat the response as evidence.

### 5.6 LiveCallPolicy
[DECISION] A policy governing when real external calls are permitted. This spec **requires**:
- **live calls disabled by default**;
- **deterministic tests make no live calls**;
- live calls require **explicit opt-in** configuration;
- **missing opt-in maps to safe disabled / `provider-unavailable` behavior**;
- **CI must not require credentials**;
- **local dev must not require credentials**.
- [ASSUMPTION] The default posture is *off*: the system behaves exactly as Impl 019's fake path unless a human explicitly enables a live call with a valid credential.

---

## 6. What changes vs. Impl 019, what stays

[FACT] Impl 019 left a fully-shaped seam with a **fake** client. This slice may, **after 020A's selection decision**, add a **real** client behind the same `ProviderClientBoundary`.

[DECISION] **Newly allowed (only after the gate, only with explicit opt-in):** a `ConcreteProviderAdapter` that performs a **real external call** through an approved SDK/HTTP client; vendor-specific payload construction (via the serializer); vendor-specific response parsing; vendor-error → `ProviderOperationalFailure` mapping; a real `ProviderCredentialBoundary`.

[DECISION] **Unchanged (the whole point):** the async `ProviderClientBoundary` interface; `requestRealProviderRendering`'s flow (guard → credential fast-path → client → `validateDraft`); the **mandatory `validateDraft`**; the `ProviderRenderOutcome` shape; the `ProviderOperationalFailure → ProviderFailure` mapping (catalog **not** expanded); the **raw-free** provider-attempt audit; the **untouched sync seam**; and the fact that nothing downstream (record/review/display/delivery/event) is created by the provider path.

[ASSUMPTION] "Fill the seam, keep every gate, default to off." If a real adapter requires changing anything other than the draft source + the isolated client/credential boundary (and a documented test-only guard relaxation for the chosen adapter's client file), the design has drifted.

---

## 7. Domain Rules To Preserve (Invariants)

[FACT] The boundary must satisfy **all**:

1. Real provider output is **not** domain authority.
2. …is **not** a `TerminalOutput`.
3. …is **not** `DecisionSupport`.
4. …is **not** a `Recommendation`.
5. …is **not** `Evidence`.
6. …is **not** `Observation`.
7. …is **not** `Understanding`.
8. …is **not** an `AthleteDecision`.
9. …is **not** a `RenderedMessage` until it passes `validateDraft`.
10. Provider **metadata is not evidence**.
11. Provider **success does not validate** recommendation quality.
12. Provider **failure does not weaken** `SupportQuality`.
13. Provider **latency/cost/rate-limit/token-count is not athlete state**.
14. Provider does **not** select or change `VoiceMode`.
15. Provider request **must not expose** raw private reasoning or chain-of-thought.
16. Provider prompt serialization **must not override** domain constraints.
17. Provider output **must pass the same mandatory validator** as all other provider output.
18. Provider attempts **must preserve the no-raw-draft-retention** audit policy.
19. Provider **secrets must never** be domain data, persisted records, audit payloads, logs, errors, or tests.
20. Provider integration **must not create** review, display eligibility, delivery, events, retries, or domain mutation as side effects.

[ASSUMPTION] The *defining* invariants are **1, 9, 17, 18, 19, 20** — plus the new operational ones from the `LiveCallPolicy`: **a live call must never happen by default, in a deterministic test, or in CI.**

---

## 8. Required Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§10). **Negative criteria are defining.**

### UC1 — No provider selected yet
- **AC1.1** — *Given* no explicit `ProviderSelectionDecision` exists, *when* Spec 020 is reviewed, *then* Implementation 020 **must not silently choose a provider** and must defer concrete SDK/network work to 020A.

### UC2 — Provider selected, live calls disabled by default
- **AC2.1** — *Given* a provider is selected in 020A, *when* the adapter is used **without** explicit live-call enablement, *then* **no external call occurs** and the system returns a safe provider failure or uses the deterministic fake path as defined.

### UC3 — Real provider returns a safe draft
- **AC3.1** — *Given* live calls are explicitly enabled and credentials are available, *when* the provider returns safe draft text, *then* the draft **still passes through `validateDraft`** before becoming a `RenderedMessage`.

### UC4 — Provider returns an unsafe draft
- **AC4.1** — *Given* a real provider returns voice escalation, invented facts, or hidden uncertainty, *when* the draft is validated, *then* Aurora **rejects** it and **does not persist the raw draft**.

### UC5 — Missing/invalid credential
- **AC5.1** — *Given* a credential is missing or invalid, *when* a provider call is requested, *then* **no domain mutation** occurs and the failure **maps to safe non-rendering**.

### UC6 — Network timeout / rate-limit / provider failure
- **AC6.1** — *Given* the SDK/network returns timeout, rate-limit, refusal, unavailable, or a malformed response, *when* handled, *then* Aurora maps the vendor-specific error to `ProviderOperationalFailure` and then to the existing `ProviderFailure`.

### UC7 — Prompt injection attempt
- **AC7.1** — *Given* a caller attempts to inject arbitrary prompt material or to ask the provider to hide uncertainty, *when* the provider payload is constructed, *then* the unsafe instruction is **rejected or excluded before any provider call**.

### UC8 — Provider metadata remains operational
- **AC8.1** — *Given* the provider returns a model id, token count, finish reason, latency, request id, or cost estimate, *when* Aurora handles it, *then* the metadata remains **operational** and is **not** `Evidence`/`Observation`/`Understanding`/`SupportQuality`/athlete state/review/delivery.

### UC9 — Raw-free audit composition
- **AC9.1** — *Given* a real provider attempt is audited, *when* `auditProviderAttempt(...)` records it, *then* it records **safe summary/failure reasons only** and **never** raw draft, prompt, secret, or provider payload.

### UC10 — Provider success does not trigger downstream effects
- **AC10.1** — *Given* provider rendering succeeds, *when* a `ProviderRenderOutcome` is returned, *then* **no** rendered-message record, review, display eligibility, delivery, event, retry, or domain mutation is created automatically.

---

## 9. Acceptance Criteria (consolidated)

[DECISION] At minimum:
- Given no provider decision exists, then **no concrete provider is silently selected**.
- Given live calls are disabled, then **no external call occurs**.
- Given credentials are missing/invalid, then a **safe provider failure** occurs.
- Given the provider returns a safe draft, then **`validateDraft` remains mandatory**.
- Given the provider returns an unsafe draft, then **no `RenderedMessage` exists**.
- Given the provider returns a malformed/empty response, then a **safe provider failure** occurs.
- Given vendor-specific errors occur, then they **map to the existing failure surfaces**.
- Given provider metadata exists, then it is **operational only**.
- Given a provider attempt is audited, then **raw draft/prompt/secret/payload is not retained**.
- Given the provider succeeds, then **no persistence/review/display/delivery/event/domain mutation** happens automatically.
- Given future tests run, **CI must not require real credentials or live network**.

---

## 10. Explicit Forbidden Behaviors

[FACT] This spec forbids:
- **silently choosing** a real provider;
- **live calls enabled by default**;
- **tests requiring real credentials**;
- **CI requiring network access**;
- provider **SDK/network code inside domain modules**;
- provider code **importing** `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`;
- provider output **bypassing `validateDraft`**;
- provider output creating a **`TerminalOutput`** / **`Recommendation`**;
- provider output **selecting or changing `VoiceMode`**;
- provider output becoming **`Evidence`/`Observation`/`Understanding`/`AthleteDecision`**;
- provider prompt containing **chain-of-thought**; provider request exposing **raw private reasoning**; **arbitrary caller prompt** reaching the provider;
- provider **metadata becoming a domain signal**;
- provider **success validating `SupportQuality`**; provider **failure invalidating the domain output**;
- provider **failure triggering an automatic retry/scheduler**;
- a provider call **creating event records / rendered-message records / review/display/delivery**;
- **secrets persisted in records**; **secrets logged or in errors**;
- **raw unsafe draft retained in the audit**; **raw provider payload retained**;
- real provider integration **changing delivery behavior**.

[DECISION] These are **testable negative requirements** (§11).

---

## 11. Validation Strategy

[ASSUMPTION] Tests to the contract; **negative tests are defining.** Every behavior is provable with deterministic doubles behind the `ProviderClientBoundary` — **no live external call**, ever, in the test suite.

**Gate / live-call:**
- a `ProviderSelectionDecision` is **required before** a concrete adapter;
- **live calls disabled by default**; deterministic tests require **no real credentials**; **CI requires no network**.

**Failure mapping / safety:**
- missing/invalid credential → safe failure; timeout/rate-limit/refused/unavailable/malformed/empty → safe failure; vendor-specific errors → existing `ProviderOperationalFailure` → `ProviderFailure`.

**Validation / untrusted draft:**
- a safe provider draft **passes only through `validateDraft`**; a draft **cannot bypass validation**; voice escalation / invented fact / hidden uncertainty **rejected**; a **prompt-injection attempt is rejected/excluded before the call**.

**Operational / audit:**
- provider **metadata remains operational, not evidence**; the **provider-attempt audit retains no raw draft/prompt/secret/payload**; provider **success creates no record/review/display/delivery/event**; provider **failure mutates no domain**; **no automatic retry/scheduler/event bus**; **secrets not persisted/logged/in errors**.

**Dependency-boundary:**
- the concrete adapter + credential/client boundary live **behind `rendering`**, implement the existing `ProviderClientBoundary`, and import no domain module (no `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`); upstream modules never import them;
- **all 462 Impl 001–019 tests continue to pass.**

[ASSUMPTION] The negative tests are the contract that *a real provider changes the draft source, not the authority model — and never calls out by default*. If they cannot be written/passed, the boundary design is wrong.

---

## 12. Relationship To Existing Architecture

[FACT] Builds on, without altering:
- **Spec/Impl 019 (real-provider-ready boundary)** — the async `ProviderClientBoundary` already exists; a `ConcreteProviderAdapter` implements it.
- **Spec/Impl 018 (provider-attempt audit)** — attempts are audited with **no raw draft retention**; this slice **preserves** that for real attempts.
- **Spec/Impl 017 (provider seam)** — provider drafts are untrusted; the seam is unchanged.
- **Spec/Impl 014 (rendering)** — **only validated drafts become a `RenderedMessage`**; `validateDraft` is unchanged and mandatory.
- **Spec/Impl 015 (record/review)** — **only a validated `RenderedMessage` may become a record**; the provider path creates none automatically.
- **Spec/Impl 016 (delivery)** — delivery consumes only display-eligible records; **provider success does not deliver**.
- **Spec/Impl 011 (event records)** — event records are occurrence history, not provider commands; the provider path appends none.
- **Spec/Impl 013 (manual input)** — a provider response is **not source material** unless the athlete separately reports it.

[DECISION] The boundary picture: **the concrete provider adapter stays behind `rendering` (behind `ProviderClientBoundary`) · provider output is draft text only · `validateDraft` remains mandatory · the attempt audit stays raw-free · provider metadata stays operational · live calls are off by default · real integration is not delivery, eventing, model evaluation, or domain reasoning · secrets/network/prompts live only in the isolated client/credential boundary.**

---

## 13. Open Questions (do not block this spec)

[QUESTION] which provider to integrate first; SDK vs HTTP; the exact secret-management mechanism; the exact env-var naming; whether the live-call adapter ships disabled by default (this spec says **yes**); model/deployment configuration; timeout limits; retry policy; rate-limit behavior; streaming; provider-metadata retention; cost/billing limits; prompt-material storage; localization quality; model evaluation; production telemetry; provider event records.

[ASSUMPTION] None block this slice: Aurora can define what a safe real-adapter boundary + selection gate must and must not do regardless of how these resolve. The vendor choice and technical mechanism are deferred to **020A**.

---

## 14. Success Criterion

> **"Can Aurora add a concrete real provider adapter without letting vendor SDKs, network calls, API keys, prompts, provider responses, metadata, retries, or errors become authority, evidence, persistence, review, delivery, events, or domain mutation?"**

[ASSUMPTION] Answerable from this spec: a **`ConcreteProviderAdapter`** implements the **existing** async `ProviderClientBoundary` (Impl 019) and may perform a real external call **only after** a recorded **`ProviderSelectionDecision`** and **only with explicit live-call opt-in** (the **`LiveCallPolicy`**: off by default, no live calls in deterministic tests or CI, missing opt-in → safe `provider-unavailable`); credentials flow through a **`ProviderCredentialBoundary`** that keeps **raw secrets out of domain types, state, audit, logs, errors, and tests** (the domain still sees only the operational `ProviderSecretRef`); a **`ProviderPromptSerializer`** renders the constrained `ProviderInstruction` into vendor fields **without** arbitrary prompt/chain-of-thought/voice-override/hide-uncertainty/secret/handle; a **`ProviderResponseParser`** yields an **untrusted draft** (and maps empty/malformed/vendor errors to `ProviderOperationalFailure` → the existing `ProviderFailure`, **catalog unchanged**); the draft becomes a `RenderedMessage` **only** via the **unchanged mandatory `validateDraft`**; **provider metadata stays operational** (never evidence/athlete-state); **success validates no recommendation quality** and **failure invalidates no domain output** and **triggers no automatic retry**; the **provider-attempt audit stays raw-free** (no draft/prompt/secret/payload); and the integration **creates no record/review/display-eligibility/delivery/event and mutates no domain** — with **no vendor/SDK/secret/network/prompt chosen here** (the gate defers it to 020A) and **all 462 existing tests staying green** (deterministic doubles only) — proving a concrete real provider can change the *draft source* without ever changing the *authority model* or calling out by default.

---

## Known Risks

[ASSUMPTION]
- **Risk:** a live call happens by default / in tests / in CI. **Defense:** §5.6 `LiveCallPolicy` + invariants + UC2 — off by default; missing opt-in → safe disabled; deterministic doubles; CI needs no credentials.
- **Risk:** a vendor is silently chosen. **Defense:** §4 provider-selection gate + UC1 — no concrete adapter without a recorded `ProviderSelectionDecision`; a vendor name in production before that is a violation.
- **Risk:** a real response bypasses the validator / becomes authority. **Defense:** invariants 1/9/17 + UC3 — the concrete adapter is just a `ProviderClientBoundary`; `validateDraft` is the only path to a message.
- **Risk:** secrets leak (records/audit/logs/errors/tests). **Defense:** §5.3 + invariant 19 + UC5 — the credential boundary keeps raw secrets out of every domain/audit/error surface; the domain sees only `ProviderSecretRef`.
- **Risk:** prompts carry reasoning / override constraints / arbitrary text. **Defense:** §5.4 + invariants 15/16 + UC7 — the serializer renders only approved instruction fields; unsafe instructions are excluded before the call.
- **Risk:** metadata becomes a domain signal / failures retry or grade the domain. **Defense:** invariants 10–13/20 + UC6/UC8 — metadata is operational; every failure degrades to safe non-rendering with no automatic retry; success/failure never grade the domain.
- **Risk:** the audit starts retaining raw drafts / payloads "to debug" a real vendor. **Defense:** invariant 18 + UC9 — the Impl 018 raw-free policy is preserved; only safe summaries/reasons are kept.
- **Risk:** the slice drifts into delivery/eventing/eval or leaks SDK/network into the domain. **Defense:** §3 non-scope + §10 forbidden + structural guard — integration stays behind `rendering`/`ProviderClientBoundary` in an isolated client; a documented test-only guard relaxation (if any) permits only the chosen adapter's client file, never the domain modules.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the twentieth Specification and the first real-provider-adapter-implementation boundary. It defines how a concrete real provider may be implemented behind the existing async `ProviderClientBoundary` — changing only the draft source, behind a provider-selection gate, with live calls off by default and the unchanged validator/raw-free audit — and chooses no vendor, SDK, secret, network, prompt, or storage technology. A concrete real provider may perform an external call; it may not change the authority model.*

*Inputs: [Spec 019](./019-real-provider-integration-boundary.md) · [Spec 019A](./019-real-provider-integration-boundary-tech.md) · [Spec 018](./018-provider-attempt-audit-boundary.md) · [Spec 017](./017-provider-adapter-boundary.md) · [Spec 014](./014-llm-rendering-boundary.md) · [Spec 015](./015-rendered-message-review-persistence.md) · [Spec 016](./016-delivery-boundary.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 013](./013-manual-input-adapter.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
