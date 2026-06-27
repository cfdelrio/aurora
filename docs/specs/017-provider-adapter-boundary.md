# Spec 017 — Provider Adapter Boundary

> How a future LLM provider may **draft** human-facing language **behind the rendering boundary** without the provider ever selecting voice, inventing claims, bypassing validation, becoming domain authority, or mutating the system. **A provider drafts; Aurora's mandatory validator decides; the domain stays the source of truth.** Provider output is an **untrusted draft** that must pass the *same* `validateDraft` contract as the deterministic fake renderer — or safe non-rendering wins.
>
> Behavioral specification. Not implementation; no provider/SDK; no API keys; no network calls; no prompt templates as production code; no UI/API; no changes to existing module *behavior*.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code, no provider/SDK, no prompts-as-code, no UI/API, no external call) |
| **Slice** | `RenderableDomainOutput → ProviderRenderingRequest (constrained) → ProviderAdapter → ProviderDraft (untrusted) → ProviderValidationGate (= validateDraft) → RenderedMessage (or safe RenderingFailure)` |
| **Builds on** | Spec/Impl 014 (rendering boundary + mandatory validator) · 015 (rendered-message record/review) · 016 (delivery boundary) · 005 (voice/terminal output) · 011 (event records) · 012 (reprojection) · 013 (manual input) |
| **Produces (behavior)** | a `ProviderAdapter`, `ProviderRenderingRequest`, `ProviderDraft`, `ProviderValidationGate`, closed `ProviderFailure`; untrusted-draft rules; the test contract |
| **Explicitly does not produce** | a real provider choice (OpenAI/Anthropic/local/any), an SDK, API keys, network/streaming, retries/rate-limits/billing, model selection/fine-tuning, prompt templates as production code, prompt optimization, eval infra, UI/API, delivery channels, event recording, a production DB/schema |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict provider-request/draft shapes, where the adapter lives inside `rendering`, a **fake provider port** for tests, how `validateDraft` is reused as the gate, the closed failure catalog) follows separately as **017A**. Implementation does not begin from this document, and **no provider, SDK, prompt, secret, or network technology is chosen here**.

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

[FACT] **Central question:** *How can Aurora introduce a provider adapter for generated language while ensuring provider output remains an untrusted draft that can never select voice, create claims, bypass validation, become domain authority, or trigger downstream effects?*

[FACT] Impl 014 made *output out* safe with a **deterministic fake renderer behind a mandatory validator** (`validateDraft`) — and the validator, **not** the renderer, was deliberately made the safety guarantee. Impl 015 made the cycle auditable (record/review/display-eligibility); Impl 016 added a delivery boundary to a test sink. The output-out path is now structurally closed *with a fake mouth*. This slice specifies the boundary for swapping in a **real (future) mouth** — an LLM provider — **without** weakening any of it.

[FACT] This is the boundary the Core Completion Review names as the **most dangerous next shortcut**: *wiring a real LLM provider that bypasses the rendering validator (or treats generated text as truth)*. The danger guarded is precise: **provider output skipping the validator, selecting/escalating voice, inventing a claim or citation, hiding uncertainty, turning a `Withholding`/`Inquiry` into advice, or being treated as source truth.**

[FACT] Three rules, restated (the user's framing):
- **A provider drafts; Aurora decides whether the draft is acceptable.**
- **The provider is never the source of truth, and never selects voice.**
- **Provider output passes the same mandatory validator as the deterministic fake renderer — or safe non-rendering wins.**

---

## 2. Core Principle

[FACT] **The provider drafts; the validator decides.** A `ProviderAdapter` asks a future provider for a *draft phrasing* of an **already-approved** `RenderableDomainOutput`. The provider **may** produce draft text, warnings, and failure status. The provider **may not**: select/change `VoiceMode`; create a `TerminalOutput`/`Recommendation`/allowed claim; remove a forbidden claim; repair traceability; remove freshness limitations; update `SupportQuality`; mutate anything; persist; mark display-eligible; or deliver.

[FACT] **Provider output is an untrusted draft.** It becomes a `RenderedMessage` **only** by passing the **same** mandatory validator (`validateDraft`, Impl 014) that the fake renderer's draft must pass. The provider receives **no raw domain internals** — only a constrained, domain-approved request — and never sees chain-of-thought, hypotheses beyond the approved output, or mutable handles.

[ASSUMPTION] The guiding sentence: *the provider is a faithful drafting tool, not a participant in reasoning — it finds words for a decision already made and already bounded, and if its words are unfaithful the validator refuses them and Aurora renders nothing rather than something unsafe.* If provider output could change what the domain meant — its voice, certainty, claims, silence — or skip validation, the boundary is wrong.

---

## 3. Scope & Non-Scope

### In scope
[DECISION] the **provider-adapter boundary** behind `rendering`; **provider request constraints** (what a provider may receive); **provider response constraints** (what it may return); **untrusted-draft semantics**; **validator enforcement** as the unchanged authority; **safe failure modes**; **prompt/instruction constraints** (no override fields, no chain-of-thought, no injection); **no authority escalation**; **no domain mutation**; the relationship to **rendering, rendered-message records, review, and delivery**; provider **observability/audit at a behavioral level**; and the non-goals for real SDK/API integration.

### Non-Scope
[FACT] choosing OpenAI/Anthropic/local/any provider; SDK installation; API keys; network calls; streaming; retries; rate limits; billing; model selection; prompt templates as production code; prompt optimization; fine-tuning; evaluation infrastructure; UI/API; delivery channels; production deployment; secret management; telemetry implementation; event recording; production DB/schema.

[DECISION] **No provider, SDK, prompt, secret, or network technology is chosen.** The boundary is behavioral; a future implementation may prove it with a **fake provider port** (a deterministic in-process draft source, no model call) — exactly as Impl 014 proved rendering with a fake renderer. *How* a real provider is wired (SDK/keys/network) is explicitly future work.

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] The boundary must satisfy **all**:

1. Provider output is **not** domain authority.
2. Provider output is **not** a `TerminalOutput`.
3. Provider output is **not** `DecisionSupport`.
4. Provider output is **not** a `Recommendation`.
5. Provider output is **not** `Evidence`.
6. Provider output is **not** `Observation`.
7. Provider output is **not** `Understanding`.
8. Provider output is **not** an `AthleteDecision`.
9. Provider does **not** select `VoiceMode`.
10. Provider does **not** change `VoiceMode`.
11. Provider does **not** create allowed claims.
12. Provider does **not** remove forbidden claims.
13. Provider does **not** repair traceability.
14. Provider does **not** remove freshness limitations.
15. Provider does **not** update `SupportQuality`.
16. Provider does **not** mutate rendered-message records.
17. Provider does **not** mark messages display-eligible.
18. Provider does **not** deliver messages.
19. Provider output **must pass mandatory validation** before becoming a `RenderedMessage`.
20. Provider failure or unsafe output **must degrade to safe non-rendering**.

[ASSUMPTION] The *defining* invariants are **1, 9, 19, 20** — together they make "provider output became authority, selected voice, skipped the validator, or failed unsafely" a failing test. (Everything else is a specific way one of those four could be violated.)

---

## 5. Key Concepts (defined behaviorally)

### 5.1 ProviderAdapter
[DECISION] A boundary component that asks a **future** external/internal generation provider for a **draft phrasing** of an already-approved `RenderableDomainOutput`.
- **May:** receive a **constrained** rendering request; produce a **text draft**; return **provider failure** information; expose **provider warnings/limitations**.
- **Must not:** select voice; create domain claims; mutate state; persist records; approve display; deliver messages.
- [FACT] It sits **behind `rendering`**, **not** behind `decision-support`. It is a *draft source* the renderer can use in place of the fake renderer's draft step — the surrounding rendering flow (and `validateDraft`) is unchanged.

### 5.2 ProviderRenderingRequest
[DECISION] A **constrained** request derived from `RenderingRequest` / `RenderableDomainOutput`.
- **Should include only:** the **domain-approved content atoms**; the **`VoiceMode` already selected by the domain**; the **terminal output kind**; the **allowed claims**; the **forbidden claims**; the **uncertainty/limitation requirements**; the **traceability summary constraints**; the **safe style/locale constraints** (i.e. only the `SAFE_STYLES`/`SUPPORTED_LOCALES` already enforced by `RenderingRequest`).
- **Must not include:** raw private reasoning internals; **chain-of-thought**; hidden domain hypotheses beyond the approved output; **mutable aggregate handles**; instructions to ignore validation; instructions to escalate voice; instructions to hide uncertainty; **arbitrary prompt-injection fields**.
- [FACT] This mirrors the existing `RenderingRequest`, which already has **no field** to override voice, hide uncertainty, or inject a prompt/metadata bag — the provider request inherits that discipline and adds nothing that could loosen it.

### 5.3 ProviderDraft
[DECISION] The **raw, untrusted** output returned by the provider.
- **May include:** draft text; provider warnings; provider metadata **if safe**; **failure status** if generation failed.
- **Must not** be persisted or delivered as final output **unless** transformed into a **validated `RenderedMessage`** through the rendering boundary. A `ProviderDraft` that never passes `validateDraft` is **not** a `RenderedMessage`, **not** a `RenderedMessageRecord`, **not** `Evidence`/`Observation`, and **not** source truth.

### 5.4 ProviderValidationGate
[DECISION] The **mandatory** step that applies the **existing `RenderingValidator` contract** (`validateDraft`) to a provider draft — **the same gate, unchanged**, that the fake renderer's draft passes.
- **Must reject:** invented facts; voice escalation; hidden uncertainty; hidden limitations; invented traceability/citations; `Inquiry`-as-answer; `Withholding`-as-advice; unsafe style/compliance.
- [FACT] Because the gate is the *existing* validator, a provider cannot earn a `RenderedMessage` by any path the fake renderer could not — the provider is strictly an alternate **draft source**, never an alternate **authority**.

### 5.5 ProviderFailure
[DECISION] A **closed** behavioral failure set. Examples:
- `provider-unavailable`
- `provider-timeout`
- `provider-returned-empty-draft`
- `provider-returned-invalid-draft`
- `provider-refused`
- `provider-output-failed-validation`
- `unsafe-provider-request`
- `unsupported-locale`
- `unsupported-style`
- `provider-rate-limited`

[FACT] Provider-specific codes **may be captured later** (for audit), but **must not leak into domain authority** and must map down to this closed behavioral set. Every failure **degrades to safe non-rendering** (invariant 20).

---

## 6. Where the boundary sits (constrain-only, behind rendering)

[FACT] The real surface (Impl 014): `validateDraft({ draft, renderable, request }) → RenderOutcome` is the **mandatory** gate; `RenderingRequest` carries only safe constraints (`SAFE_STYLES`/`SUPPORTED_LOCALES`, no override fields); the fake renderer produces a `draft` string and then calls `validateDraft`.

[DECISION] The provider adapter **replaces only the draft-text step**: where the fake renderer composes a deterministic string, a provider returns a `ProviderDraft`; the **same `validateDraft`** then decides. Therefore:
- the provider **never** constructs a `RenderedMessage` directly — only `validateDraft` can;
- a **`ProviderRenderingRequest`** can carry **no** constraint the existing `RenderingRequest` cannot already express safely (an escalation like "be decisive" is simply not a `SAFE_STYLE` → `unsupported-style-request`, *before* any provider call);
- the asymmetry holds at the mouth: the provider may only ever produce text the validator would accept as **the same or less** than the domain authorized — never more.

[ASSUMPTION] The boundary is "swap the draft source, keep the gate." Nothing downstream of `validateDraft` (records, review, display eligibility, delivery) changes; nothing upstream (decision-support voice/terminal output) is reachable by the provider.

---

## 7. Required Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§9). **Negative criteria are defining.**

### UC1 — Valid provider draft becomes a rendered message
- **AC1.1** — *Given* a domain-approved `RenderableDomainOutput` and a provider draft that preserves voice, uncertainty, limitations, traceability, and allowed claims, *when* the draft passes mandatory validation, *then* it may become a `RenderedMessage` **without changing the domain output**.

### UC2 — Provider draft escalates voice
- **AC2.1** — *Given* source `VoiceMode` is `Reflection`, *when* the provider returns recommendation-like language, *then* validation **rejects** the draft (`voice-escalation`) and **no `RenderedMessage`** is produced.

### UC3 — Provider invents a fact
- **AC3.1** — *Given* provider output includes a fact in the **forbidden claims** (not in allowed claims), *when* validated, *then* it is **rejected** (`invented-fact`).

### UC4 — Provider hides uncertainty
- **AC4.1** — *Given* the renderable requires uncertainty visible, *when* provider output omits/downplays it, *then* validation **rejects** the draft (`uncertainty-hidden`).

### UC5 — Provider fails or times out
- **AC5.1** — *Given* the provider does not return a usable draft, *when* rendering is attempted, *then* Aurora returns a **safe rendering failure** and produces **no final message**.

### UC6 — Provider request cannot override domain constraints
- **AC6.1** — *Given* a caller asks for a style like "be decisive" or "hide caveats", *when* the `ProviderRenderingRequest` is built, *then* the unsafe instruction is **rejected before reaching the provider** (`unsafe-provider-request`/`unsupported-style`).

### UC7 — Inquiry remains inquiry
- **AC7.1** — *Given* the terminal output is `Inquiry`, *when* the provider drafts an answer, *then* validation **rejects** it (`inquiry-rendered-as-answer`).

### UC8 — Withholding remains withholding
- **AC8.1** — *Given* the terminal output is `Withholding`, *when* the provider drafts advice, *then* validation **rejects** it (`withholding-rendered-as-advice`).

### UC9 — Provider draft not persisted as source truth
- **AC9.1** — *Given* a provider draft exists, *when* rendering fails validation, *then* that draft is **not** a `RenderedMessageRecord`, **not** `Evidence`, **not** `Observation`, and **not** source truth.

### UC10 — No downstream side effect
- **AC10.1** — *Given* provider rendering succeeds, *when* a `RenderedMessage` is produced, *then* it is **not** automatically recorded, reviewed, marked display-eligible, or delivered, and **no** event is appended and **no** aggregate is mutated.

---

## 8. Acceptance Criteria (consolidated)

[DECISION] At minimum:
- Given a safe provider draft, when validated, then it **may become a `RenderedMessage`**.
- Given a provider draft escalates voice, when validated, then it is **rejected**.
- Given a provider draft invents facts, when validated, then it is **rejected**.
- Given uncertainty is required, when the provider hides it, then the draft is **rejected**.
- Given the provider fails, then **no final rendered message** is produced.
- Given unsafe style instructions, then the **provider request is rejected before the provider call**.
- Given `Inquiry` output, the provider **may not answer** it.
- Given `Withholding` output, the provider **may not turn it into advice**.
- Given a provider draft exists, then it is **not source truth**.
- Given provider rendering succeeds, then **no review, display eligibility, delivery, event, or domain mutation** is triggered.
- Given this slice is implemented later, then **no provider SDK/API/UI/external-call** is created (a later tech spec may allow a **fake provider port** only).

---

## 9. Explicit Forbidden Behaviors

[FACT] This spec forbids:
- provider output **bypassing the validator**;
- provider output becoming **domain authority**;
- provider output **selecting `VoiceMode`**;
- provider output creating a **`TerminalOutput`**;
- provider output creating a **`Recommendation`**;
- provider output becoming **`Evidence`**;
- provider output becoming **`Observation`**;
- provider output becoming **`Understanding`**;
- provider output becoming an **`AthleteDecision`**;
- provider request exposing **raw private reasoning**;
- provider prompt containing **chain-of-thought**;
- provider request including **mutable aggregate handles**;
- provider **hiding uncertainty**;
- provider **inventing traceability**;
- provider **citing unavailable sources**;
- provider **marking messages display-eligible**;
- provider **writing rendered-message records**;
- provider **delivering messages**;
- provider **appending event records**;
- provider **mutating any aggregate**;
- provider failure triggering **retries/scheduler/event bus** in this slice;
- a **real provider SDK/API** implementation in this spec.

[DECISION] These are **testable negative requirements** (§10) — verifiable with a **fake provider port** (no model needed).

---

## 10. Validation Strategy

[ASSUMPTION] Tests to the contract; **negative tests are defining.** A future fake provider port lets every case be tested without a real provider.

**Positive:**
- a **safe provider draft passes through the validator** and may become a `RenderedMessage` (source-domain-output ref preserved);
- a **safe `ProviderRenderingRequest`** carries only domain-approved content + safe style/locale.

**Negative (must prove absence):**
- an **unsafe provider request is rejected before the provider call** (`unsafe-provider-request`/`unsupported-style`/`unsupported-locale`);
- **voice escalation rejected**; **invented fact rejected**; **uncertainty-hidden rejected**; **limitation-hidden rejected**; **missing/invalid traceability preserved** (completeness claim over an incomplete chain rejected);
- **`Inquiry`-as-answer rejected**; **`Withholding`-as-advice rejected**;
- **provider failure returns safe non-rendering** (no final message);
- a **provider draft is not persisted as source truth** (a failed draft is not a record/`Evidence`/`Observation`);
- a **successful provider rendering does not create a record/review/display-eligibility/delivery**, appends **no event**, and **mutates no aggregate**;
- **no event-as-command**;
- **no UI/API/provider-SDK/external-call file** is introduced (structural guard) — a later tech spec may allow a **fake provider port** only.

**Dependency-boundary:**
- the provider adapter lives **behind `rendering`** and imports only what it needs to build a `ProviderRenderingRequest` from a `RenderableDomainOutput` + run `validateDraft` (own module + `shared-kernel`); it **never** imports `reasoning`/`understanding`/`decision-support` internals to re-derive, **never** imports `delivery`/`event-recording`, and upstream modules never import it;
- **all 397 Impl 001–016 tests continue to pass.**

[ASSUMPTION] The negative tests are the contract that *the provider drafts and the validator decides*. If they cannot be written/passed, the boundary design is wrong.

---

## 11. Relationship To Existing Architecture

[FACT] Builds on, without altering:
- **Spec/Impl 014 (rendering boundary)** — the **mandatory validator is provider-independent**; the provider is an alternate **draft source**, and `validateDraft` is reused **unchanged** as the `ProviderValidationGate`.
- **Spec/Impl 015 (rendered-message record/review)** — records persist **only validated `RenderedMessage`s**, never unsafe provider drafts; provider success does not record/review.
- **Spec/Impl 016 (delivery boundary)** — delivery consumes only **display-eligible records**; provider success does **not** deliver (and does not even produce a record).
- **Spec/Impl 005 (decision-support)** — `decision-support` owns voice + the `TerminalOutput`; the provider reads a **read-only `RenderableDomainOutput`** and drafts phrasing only.
- **Spec/Impl 011 (event records)** — event records are occurrence history, **not** provider commands; the provider appends none.
- **Spec/Impl 013 (manual input adapter)** — symmetry: a **provider draft is not source material** unless the athlete separately reports it back via the manual adapter.

[DECISION] The boundary picture: **the provider adapter sits behind `rendering`, not behind `decision-support` · provider output is draft text only · the validator remains mandatory and unchanged · records/review/delivery remain separate downstream steps · provider integration is not UI/API/delivery.**

---

## 12. Open Questions (do not block this spec)

[QUESTION]
- whether the first implementation uses a **fake provider port only**;
- whether a **real SDK** is ever introduced (and behind what isolation);
- the **provider choice**; the **prompt format**; **secret management**;
- **retries / rate limits / streaming**;
- **audit of failed provider drafts** (whether provider attempts get records/events);
- **model-evaluation** strategy; **safety evaluation beyond deterministic validation**;
- **localization**; **cost/billing limits**.

[ASSUMPTION] None block this slice: Aurora can define what a faithful provider boundary must and must not do regardless of how these resolve. Technical-implementation questions are deferred to 017A.

---

## 13. Success Criterion

> **"Can Aurora use a provider to draft rendered text without letting the provider become the source of truth, bypass validation, or affect domain/delivery state?"**

[ASSUMPTION] Answerable from this spec: a **`ProviderAdapter`** behind `rendering` turns a **constrained `ProviderRenderingRequest`** (domain-approved content atoms, the domain-selected `VoiceMode`, terminal-output kind, allowed/forbidden claims, uncertainty/limitation requirements, traceability constraints, only `SAFE_STYLES`/`SUPPORTED_LOCALES`; **no** chain-of-thought, mutable handles, override/injection fields) into an **untrusted `ProviderDraft`** that becomes a `RenderedMessage` **only** by passing the **same mandatory `validateDraft`** the fake renderer must pass. The provider **selects no voice**, **creates no `TerminalOutput`/`Recommendation`/claim**, **repairs no traceability**, **hides no uncertainty/limitation**, **updates no `SupportQuality`**, **mutates nothing**, **marks nothing display-eligible**, and **delivers nothing**; an **unsafe request is refused before the provider call**; any **provider failure or unsafe draft degrades to safe non-rendering**; a draft that fails validation is **not** a record/`Evidence`/`Observation`/source truth; and a **successful** rendering triggers **no** record/review/display-eligibility/delivery/event/mutation. **No provider/SDK/API/prompt/secret/network technology is chosen** (a **fake provider port** suffices to prove it), with **all 397 existing tests green** — proving a provider can draft language without ever becoming the source of truth, bypassing the validator, or affecting domain/delivery state.

---

## Known Risks

[ASSUMPTION]
- **Risk:** provider output bypasses the validator / becomes authority. **Defense:** invariants 1/19 + UC1/§6 — the provider is only a draft source; `validateDraft` (the existing gate) is the only path to a `RenderedMessage`; negative test that an unvalidated draft never becomes one.
- **Risk:** provider selects/escalates voice. **Defense:** invariants 9/10 + UC2/UC6 + §6 — the request carries the domain `VoiceMode` and only safe styles; "be decisive" is refused before the call; the validator rejects `voice-escalation`.
- **Risk:** provider invents a fact/citation or hides uncertainty/limitations. **Defense:** invariants 11–14 + UC3/UC4 — the validator rejects `invented-fact`/`uncertainty-hidden`/`limitation-hidden`/`missing-traceability`.
- **Risk:** `Inquiry`/`Withholding` become advice. **Defense:** invariants 2–4 + UC7/UC8 — the validator keeps inquiry a question and withholding a refusal.
- **Risk:** unsafe failure (something wrong when the provider errors). **Defense:** invariant 20 + UC5 — every failure degrades to safe non-rendering; the closed `ProviderFailure` set maps provider errors down to behavioral reasons.
- **Risk:** provider draft re-enters as truth / mutates state / fires downstream. **Defense:** invariants 5–8/15–18 + UC9/UC10 — a draft is never source truth, never a record/review/delivery, never an event; provider integration mutates nothing.
- **Risk:** the slice drifts into a real SDK/provider/UI. **Defense:** §3 non-scope + §9 forbidden + structural guard — behavioral boundary only; a **fake provider port** proves it; no SDK/API/UI/secret/network chosen.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the seventeenth Specification and the first provider-adapter boundary. It defines how a future LLM provider may draft human-facing language behind the rendering boundary — as an untrusted draft that becomes a message only by passing the same mandatory validator — and chooses no provider, SDK, prompt, secret, or network technology. A provider drafts; Aurora's validator decides; the domain stays the source of truth.*

*Inputs: [Spec 014](./014-llm-rendering-boundary.md) · [Spec 014A](./014-llm-rendering-boundary-tech.md) · [Spec 015](./015-rendered-message-review-persistence.md) · [Spec 016](./016-delivery-boundary.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 012](./012-reprojection-harness.md) · [Spec 013](./013-manual-input-adapter.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
