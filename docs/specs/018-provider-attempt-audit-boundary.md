# Spec 018 — Provider Attempt Audit Boundary

> How Aurora can **record and audit** what happened when it asked the provider seam for a draft — **without** letting provider drafts become source truth, failed/unsafe drafts become evidence, or provider history become reasoning. **A provider attempt is an audit artifact, never authority.** It records *that Aurora asked the seam and what happened at that boundary*; the **only** path to a `RenderedMessage` remains the mandatory validator. By default, **no raw provider draft is retained**.
>
> Behavioral specification. Not implementation; no provider/SDK; no network; no prompts-as-code; no event-catalog implementation; no UI/API; no changes to existing module *behavior*.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code, no provider/SDK, no network, no prompts-as-code, no event-catalog change) |
| **Slice** | `ProviderRenderingRequest + ProviderDraft/ProviderFailure + RenderOutcome → ProviderAttempt → ProviderAttemptRecord (auditability, not authority) — no raw-draft retention; never source truth/evidence/review/display/delivery/reasoning` |
| **Builds on** | Spec/Impl 017 (provider adapter seam) · 014 (rendering + mandatory validator) · 015 (rendered-message record/review) · 016 (delivery boundary) · 011 (event records) · 012 (reprojection) · 013 (manual input) |
| **Produces (behavior)** | a `ProviderAttempt`, `ProviderAttemptRecord`, closed `ProviderAttemptStatus`, closed `ProviderAttemptFailureReason`, a `DraftRetentionPolicy`, a `ProviderAttemptAudit` surface; auditability-not-authority rules; the test contract |
| **Explicitly does not produce** | a real provider/SDK, API keys/secrets, network/streaming, retries/rate-limits/billing, prompt templates as production code, prompt optimization, model evaluation, telemetry implementation, a production DB/schema, an event-catalog change/event bus, a scheduler, UI/API, delivery changes |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict attempt/record shapes, where the audit lives inside `rendering`, the closed status/reason catalogs, the chosen retention policy, whether a repository port + in-memory adapter is used, whether a ref-only event is emitted) follows separately as **018A**. Implementation does not begin from this document, and **no provider, SDK, secret, network, event-catalog, or storage technology is chosen here**.

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

[FACT] **Central question:** *How can Aurora audit provider attempts without letting provider drafts become domain truth, failed drafts become evidence, validation history become reasoning, or provider attempt records trigger review, display eligibility, delivery, events, retries, or domain mutation?*

[FACT] Impl 017 closed the provider seam: a (fake, deterministic) provider produces an **untrusted draft** that becomes a `RenderedMessage` **only** by passing the mandatory `validateDraft`; everything else degrades to safe non-rendering. That seam currently leaves **no trace** — a provider attempt happens and vanishes. This slice adds what should be **remembered** about an attempt — for debugging, safety review, and traceability of *rendering attempts* — **without** the remembering becoming a new way for untrusted provider content to leak back in as authority.

[FACT] This is the **last safety belt before a real provider** (the user's framing): before any SDK, secret, or network exists, Aurora defines *what is auditable about an attempt and what must never be retained or promoted*. The danger guarded is the mirror of the ingestion/persistence dangers (Impl 013/015): just as **manual input must not become meaning** and a **persisted/approved rendering must not become truth**, a **recorded provider attempt must not become source truth, evidence, or reasoning** — and an **unsafe draft, even when retained to explain a failure, must never become source material**.

[FACT] Three rules, restated:
- **A provider attempt is an audit artifact, not authority.**
- **Unsafe drafts may explain *why rendering failed*; they never become source material.**
- **Validated messages remain the only path to a `RenderedMessage`** — auditing changes nothing about that.

---

## 2. Core Principle

[FACT] **A provider attempt audit records that Aurora asked the seam for a draft, and what happened at that boundary — nothing more.** A `ProviderAttemptRecord` is **not**: a source of truth, `Evidence`, an `Observation`, a `RenderedMessage`, a `RenderedMessageRecord`, a `RenderReview`, display eligibility, delivery, or reasoning. It records the **attempt's outcome** (requested / draft-produced / validation passed-or-failed / provider failed / unsafe-request blocked) and a **safe summary** of why — never the untrusted content as authority.

[FACT] **Unsafe drafts do not become source material.** A draft that fails validation may have its *failure reasons* recorded (so a human can debug why rendering refused it), but the **raw unsafe draft text is not retained by default** (§6). **Validated `RenderedMessage`s remain the only path** from a draft to anything downstream (record/review/display/delivery) — and that path is unchanged: auditing an attempt **creates none of those**.

[ASSUMPTION] The guiding sentence: *the audit answers "what did the provider seam do, and did the validator accept it?" — never "is the draft true?" or "what does the draft tell us about the athlete?"* If a provider attempt record could be read as `Observation`/`Evidence`/`Understanding`, grade `SupportQuality`, fire a retry/event, or make an unsafe draft re-usable, the boundary is wrong.

---

## 3. Scope & Non-Scope

### In scope
[DECISION] provider-attempt **audit behavior**; a **provider request reference / safe request summary**; a **provider draft summary** (safe, non-authoritative); **validation result association**; **provider failure association**; **safe retention rules** and **redaction / non-retention** rules; **provider attempt status**; the relationships to `ProviderRenderingRequest`, `ProviderDraft`, `RenderOutcome`, and rendered-message records; the relationship to event-recording **if** future events are used (ref-only/inert); and the explicit **no-upstream-effects** rules.

### Non-Scope
[FACT] real provider SDK integration; provider selection; API keys; secrets; network calls; streaming; retries; rate limits; billing; prompt templates as production code; prompt optimization; model evaluation; telemetry implementation; production DB/schema; event-catalog implementation; event bus; scheduler; UI/API; delivery changes.

[DECISION] **No provider, SDK, secret, network, event-catalog, or storage technology is chosen.** "Audit" here means an **auditable record contract** (satisfiable in-memory behind a port, like Impl 010/011/015/016) — *a provider attempt record is not delivery, not an event record, and not rendered-message persistence.*

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] The boundary must satisfy **all**:

1. A `ProviderAttemptRecord` is **not** domain authority.
2. …is **not** `Evidence`.
3. …is **not** `Observation`.
4. …is **not** `Understanding`.
5. …is **not** `AthleteDecision`.
6. …is **not** `DecisionSupport`.
7. …is **not** a `TerminalOutput`.
8. …is **not** a `RenderedMessage`.
9. …is **not** a `RenderedMessageRecord`.
10. …is **not** a `RenderReview`.
11. A `ProviderAttemptRecord` does **not** create display eligibility.
12. …does **not** trigger delivery.
13. …does **not** create a `Recommendation`.
14. …does **not** change `VoiceMode`.
15. …does **not** repair traceability.
16. …does **not** remove limitations.
17. …does **not** update `SupportQuality`.
18. A **failed provider draft is not evidence of athlete state**.
19. **Validation failure is not domain invalidation**.
20. Recording a provider attempt does **not** trigger retry, an event command, reprojection, or reasoning.

[ASSUMPTION] The *defining* invariants are **1, 2/3, 18, 19, 20** — together they make "the attempt record (or an unsafe draft inside it) became authority/evidence/observation, invalidated the domain on a validation failure, or fired a downstream effect" a failing test.

---

## 5. Key Concepts (defined behaviorally)

### 5.1 ProviderAttempt
[DECISION] The **occurrence** of asking the provider seam for a draft for a specific renderable output + rendering request.
- **Should reference:** the **provider rendering request ref or safe summary**; the **renderable output ref**; the **terminal output kind**; the **domain-selected `VoiceMode`**; the **provider adapter kind**; **`requestedAt`**; **`completedAt`** if completed; the **attempt status**; the **validation outcome** if validation happened.
- **Must not include:** raw private reasoning; chain-of-thought; mutable aggregate handles; new domain claims; provider-specific secret/config; a delivery target; a review/display decision.

### 5.2 ProviderAttemptRecord
[DECISION] An **auditable persisted record** of a provider attempt.
- **May preserve:** an **attempt id**; the **renderable output ref**; the **rendering request constraints** (safe summary); the **provider adapter kind**; the **attempt status**; the **provider failure reason** if any; the **validation result summary**; the **rendering failure reasons** if any; **whether a validated `RenderedMessage` was produced**; and a **safe draft summary** *if allowed by the retention policy* (§6).
- **Must not become:** source truth; `Evidence`; a rendered-message record; a review record; a delivery record.
- [FACT] Like the Impl 015/016 records, it is **auditability, not authority** — it carries no domain field and no domain-write handle.

### 5.3 ProviderAttemptStatus
[DECISION] A **closed** status set. Expected examples:
- `requested`
- `draft-produced`
- `validation-passed`
- `validation-failed`
- `provider-failed`
- `unsafe-request-blocked`

### 5.4 ProviderAttemptFailureReason
[DECISION] A **closed** reason set, aligned with the Impl 017 `ProviderFailure` catalog **and** the rendering `RenderingFailure` catalog (so a recorded reason maps to a real failure the seam can produce). Examples:
- *(provider)* `provider-unavailable` · `provider-timeout` · `provider-rate-limited` · `provider-returned-empty-draft` · `provider-returned-invalid-draft` · `provider-refused` · `unsafe-provider-request` · `provider-output-failed-validation`
- *(validation)* `voice-escalation` · `invented-fact` · `uncertainty-hidden` · `limitation-hidden` · `traceability-overstated` · `inquiry-answered` · `withholding-as-advice`

[FACT] The network-flavored provider reasons remain **fake-configurable** (Impl 017) — no real network produces them this slice. A recorded validation reason is the **renderer's own** `RenderingFailure`, captured for debugging, never a domain claim.

### 5.5 DraftRetentionPolicy
[DECISION] A **behavioral policy** for what draft content may be retained — **chosen** for this slice:
- **Decision · No raw draft retention in Implementation 018.** Record only a **safe summary** (e.g. status, length, validation/failure reasons, whether a message was produced) — **never the raw provider draft text** (safe or unsafe).
- **Why:** provider drafts are **untrusted**; they may contain hallucinations or unsafe language; retaining raw text risks future misuse as source truth (the exact collapse this whole edge guards against).
- **Consequence:** an attempt record explains *why* rendering passed/failed without ever holding re-usable untrusted content.
- **Risk:** a debugging need for raw text later.
- **Reversal Point:** a future spec may allow **unsafe-draft redaction** (safe summaries only) or, only if explicitly justified and guarded, narrow raw retention — never as source material, always clearly marked untrusted.

### 5.6 ProviderAttemptAudit
[DECISION] The **audit surface** that lets Aurora inspect provider behavior **without promoting provider content** — for **debugging, safety review, and traceability of rendering attempts**. It is **not** reasoning input, **not** model evaluation, and **not** a source of athlete state.

---

## 6. Retention & where the audit sits (constrain-only, downstream)

[FACT] The real seam (Impl 017): `requestProviderRendering` returns a `ProviderRenderOutcome` — `{ status:"rendered", message, providerKind, providerWarnings }` or `{ status:"failed", failure: ProviderFailure, renderingFailures?: RenderingFailure[] }`. The audit observes **exactly this** outcome (plus the constrained request) — it does not call the provider itself and adds no new provider capability.

[DECISION] The audit sits **beside/behind rendering** (downstream of the provider seam), **not** behind reasoning, and **not** in delivery. It records the attempt's **status + safe summary**; by §5.5 it retains **no raw draft**. It is **one-way**: observing an attempt **creates no `RenderedMessage`/record/review/eligibility/delivery**, **appends no event**, **fires no retry/reprojection/reasoning**, and **mutates no aggregate**. A **validated** message still flows through the unchanged Impl 014/015 paths *separately*; the audit never substitutes for them.

[ASSUMPTION] "Remember the attempt, not the draft." The audit captures enough to debug and trace *what the seam did*, and deliberately **not** enough to ever reconstitute untrusted content as authority.

---

## 7. Required Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§9). **Negative criteria are defining.**

### UC1 — Record a successful provider attempt
- **AC1.1** — *Given* a provider produces a safe draft and validation **passes**, *when* the attempt is audited, *then* Aurora records **`validation-passed`** and that a `RenderedMessage` was produced — **without** making the provider draft source truth or retaining raw text.

### UC2 — Record a validation failure
- **AC2.1** — *Given* a provider draft **fails validation** for voice escalation, *when* the attempt is audited, *then* Aurora records **`validation-failed`** with reason `voice-escalation` — **without** treating the draft as evidence or rendered output.

### UC3 — Record a provider failure
- **AC3.1** — *Given* the provider returns unavailable/timeout/refused/empty, *when* the attempt is audited, *then* Aurora records **`provider-failed`** with the provider reason and **no `RenderedMessage` exists**.

### UC4 — Unsafe request blocked before the provider call
- **AC4.1** — *Given* provider request construction **rejects** an unsafe request, *when* auditing occurs, *then* Aurora may record **`unsafe-request-blocked`** **without** claiming a provider was called.

### UC5 — No raw unsafe draft retained
- **AC5.1** — *Given* an unsafe provider draft includes invented claims, *when* the attempt is recorded, *then* **raw unsafe draft content is not retained** (only a safe summary + failure reasons) unless a future policy explicitly allows it.

### UC6 — Audit does not create a rendered-message record
- **AC6.1** — *Given* a provider attempt is recorded, *when* the draft validated successfully, *then* **no `RenderedMessageRecord` is created automatically** by the audit.

### UC7 — Audit does not affect review/display/delivery
- **AC7.1** — *Given* any provider attempt record, *when* it is saved or read, *then* **no review, display eligibility, or delivery** is created or changed.

### UC8 — Audit does not influence the domain
- **AC8.1** — *Given* any provider attempt record, *when* later reasoning runs, *then* the attempt is **not** used as `Observation`/`Evidence`/`Understanding`/`AthleteDecision`/`SupportQuality`/`DecisionSupport`.

### UC9 — Optional future event
- **AC9.1** — *Given* provider attempts are audited, *when* event recording is later considered, *then* any event is **ref-only occurrence history** — never a provider command or retry trigger. In this spec, event implementation **may be deferred**.

### UC10 — Attempt history is not provider evaluation
- **AC10.1** — *Given* multiple provider attempts exist, *when* reviewing attempt history, *then* Aurora may inspect failures for **safety debugging** but **must not** infer athlete state, recommendation quality, or domain truth from provider behavior.

---

## 8. Acceptance Criteria (consolidated)

[DECISION] At minimum:
- Given a successful provider attempt, when audited, then the record **references the renderable/request and validation success**.
- Given validation fails, then the record **captures the failure reason without creating a `RenderedMessage`**.
- Given the provider fails, then the record **captures the provider failure without retry/event/delivery**.
- Given an unsafe request is blocked, then the audit records **no provider call occurred**.
- Given unsafe draft content exists, then **raw content is not retained by default**.
- Given an attempt record exists, then it is **not** `Evidence`/`Observation`/`Understanding`/`AthleteDecision`/`DecisionSupport`.
- Given an attempt record exists, then **no review/display eligibility/delivery** is created.
- Given attempt history exists, then it is **not used as domain truth**.
- Given future events are considered, they remain **ref-only and inert**.
- Given this slice is implemented later, then **all 421 Impl 001–017 tests continue to pass**.

---

## 9. Explicit Forbidden Behaviors

[FACT] This spec forbids:
- a provider attempt record becoming **source truth**;
- a provider attempt record becoming **`Evidence`**;
- an unsafe draft becoming an **`Observation`**;
- a failed draft becoming **`Understanding`**;
- a validation failure **invalidating** the domain output;
- attempt **success validating recommendation quality**;
- attempt **failure weakening `SupportQuality`**;
- **raw unsafe draft retained without an explicit policy**;
- a provider attempt creating a **`RenderedMessageRecord`**;
- a provider attempt creating a **review**;
- a provider attempt **marking display eligible**;
- a provider attempt **triggering delivery**;
- a provider attempt **appending event commands**;
- a provider attempt **triggering retry/scheduler**;
- a provider attempt **mutating domain aggregates**;
- a provider attempt **exposing chain-of-thought / private reasoning**;
- provider history **used as athlete state**;
- provider history **used as model evaluation** unless separately specified;
- provider attempt persistence **requiring a production DB/schema** in this slice.

[DECISION] These are **testable negative requirements** (§10).

---

## 10. Validation Strategy

[ASSUMPTION] Tests to the contract; **negative tests are defining.**

**Positive:**
- a **successful** provider attempt can be audited (status `validation-passed`; renderable/request refs preserved; "message produced" = true);
- a **validation-failure** attempt can be audited (status `validation-failed`; the `RenderingFailure` reasons captured; no message);
- a **provider-failure** attempt can be audited (status `provider-failed`; the `ProviderFailure` reason captured; no message);
- an **unsafe-request-blocked** attempt can be audited (no provider call claimed);
- an attempt record **preserves renderable/request refs** and the **validation/failure summary**.

**Negative (must prove absence):**
- **raw unsafe draft is not retained** by default (only a safe summary);
- the attempt record **does not create a `RenderedMessageRecord`**;
- the attempt record **does not create review/display eligibility/delivery**;
- the attempt record is **not usable as** `Evidence`/`Observation`/`Understanding`/`AthleteDecision`/`DecisionSupport`/`SupportQuality`;
- recording **does not trigger retry/scheduler/event bus/reprojection/reasoning**;
- a **validation failure does not invalidate** the domain output;
- any optional future event is **ref-only and inert**;
- **no real provider SDK/API/network/prompt file** is introduced (structural guard).

**Persistence/boundary (if a repo is implemented later):**
- **repository mutation isolation**; **invalid-state rejection** on reconstitution;
- the audit lives **inside `rendering`** (or a clearly downstream seam), imports only its own rendering surfaces + `shared-kernel` (+ read-only `decision-support` types), and **no upstream module imports it**;
- **all 421 Impl 001–017 tests continue to pass.**

[ASSUMPTION] The negative tests are the contract that *the audit remembers the attempt, never promotes the draft*. If they cannot be written/passed, the boundary design is wrong.

---

## 11. Relationship To Existing Architecture

[FACT] Builds on, without altering:
- **Spec/Impl 017 (provider adapter seam)** — the provider produces an untrusted draft and the validator decides; this slice **audits that occurrence**, observing the `ProviderRenderOutcome` (it adds no provider capability and calls no provider itself).
- **Spec/Impl 014 (rendering)** — **only validated drafts become a `RenderedMessage`**; the audit never changes that path.
- **Spec/Impl 015 (rendered-message record/review)** — **only a validated `RenderedMessage` may become a rendered-message record**; a provider attempt record is a **different artifact** and never substitutes for it.
- **Spec/Impl 016 (delivery boundary)** — delivery consumes only display-eligible records; **provider audit does not deliver**.
- **Spec/Impl 011 (event records)** — any future provider-attempt event is **occurrence history, not a command** (ref-only, inert).
- **Spec/Impl 013 (manual input adapter)** — symmetry: a **provider draft is not source material** unless the athlete separately reports it back via the manual adapter.

[DECISION] The boundary picture: **provider attempt audit sits beside/behind rendering (not behind reasoning) · it is not rendered-message persistence · it is not delivery audit · it is not event sourcing · it is not model evaluation · it remembers the attempt, never the draft.**

---

## 12. Open Questions (do not block this spec)

[QUESTION]
- whether Implementation 018 uses a **repository port + in-memory adapter**;
- whether provider attempts become **event records** later (ref-only);
- whether **raw draft retention** is ever allowed (and under what guard);
- whether safe draft summaries need **hashing**;
- **retention/deletion** policy;
- **model evaluation** strategy; **provider telemetry**;
- a future **real SDK** integration; **secret management**;
- **retries / rate limits / streaming**;
- **cost/billing** limits; **localization** quality.

[ASSUMPTION] None block this slice: Aurora can define what a safe attempt-audit boundary must and must not do regardless of how these resolve. Technical-implementation questions are deferred to 018A.

---

## 13. Success Criterion

> **"Can Aurora audit provider attempts without letting provider drafts become source truth, evidence, review, display eligibility, delivery, or reasoning?"**

[ASSUMPTION] Answerable from this spec: a **`ProviderAttempt`** captures the occurrence of asking the seam (renderable/request refs, terminal-output kind, domain `VoiceMode`, provider adapter kind, `requestedAt`/`completedAt`, status, validation outcome) and a **`ProviderAttemptRecord`** persists it as an **auditability-not-authority** entry with a **closed `ProviderAttemptStatus`** (`requested`/`draft-produced`/`validation-passed`/`validation-failed`/`provider-failed`/`unsafe-request-blocked`) and a **closed `ProviderAttemptFailureReason`** (aligned to the `ProviderFailure` + `RenderingFailure` catalogs). By the chosen **`DraftRetentionPolicy`**, **no raw provider draft is retained** — only a safe summary + reasons. The record is **never** source truth / `Evidence` / `Observation` / `Understanding` / `AthleteDecision` / `DecisionSupport` / a `RenderedMessage`/record / a review / display eligibility / a delivery; a **failed draft is not evidence of athlete state**; a **validation failure does not invalidate** the domain output; and recording **triggers no** review/display/delivery/event/retry/reprojection/reasoning/mutation (any future event is ref-only and inert). **Validated messages remain the only path to a `RenderedMessage`**, and **no real provider/SDK/network/prompt or production DB/event-catalog** is chosen (a later tech spec may allow a **test-only repository**) — with **all 421 existing tests staying green** — proving Aurora can remember *what the provider seam did* without the draft ever becoming authority, evidence, or reasoning.

---

## Known Risks

[ASSUMPTION]
- **Risk:** the attempt record (or a retained draft) becomes source truth/evidence. **Defense:** invariants 1–10/18 + §5.5 retention + UC5/UC8 — auditability-not-authority; no raw draft retained; negative tests assert no domain usability.
- **Risk:** a validation failure is read as domain invalidation / a success as recommendation quality. **Defense:** invariants 17/19 + UC2/UC10 — failure is a *rendering-attempt* fact; it never grades `SupportQuality` or the domain output.
- **Risk:** auditing fires a downstream effect (record/review/display/delivery/event/retry). **Defense:** invariants 11/12/20 + §6 + UC6/UC7/UC9 — the audit is one-way; any event is ref-only and inert; no scheduler/bus.
- **Risk:** an unsafe draft re-enters as source material. **Defense:** §5.5 + invariant 3 + UC5 + the Impl 013 symmetry — raw unsafe text is not retained; a draft is not source material unless the athlete separately reports it.
- **Risk:** provider history becomes athlete state / model evaluation. **Defense:** §5.6 + UC10 — the audit is for safety debugging/traceability only; inferring athlete state or eval from provider behavior is forbidden.
- **Risk:** the slice drifts into a real provider/SDK/event store. **Defense:** §3 non-scope + §9 forbidden + structural guard — behavioral boundary only; no provider/SDK/network/prompt/event-catalog chosen; persistence (if any) is in-memory.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the eighteenth Specification and the first provider-attempt-audit boundary. It defines how Aurora may record what the provider seam did — auditability, not authority — without retaining raw drafts or letting an attempt become source truth, evidence, review, display eligibility, delivery, or reasoning; it chooses no provider, SDK, secret, network, event-catalog, or storage technology. A provider attempt is an audit artifact; validated messages remain the only path to a rendered message.*

*Inputs: [Spec 017](./017-provider-adapter-boundary.md) · [Spec 017A](./017-provider-adapter-boundary-tech.md) · [Spec 014](./014-llm-rendering-boundary.md) · [Spec 015](./015-rendered-message-review-persistence.md) · [Spec 016](./016-delivery-boundary.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 012](./012-reprojection-harness.md) · [Spec 013](./013-manual-input-adapter.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
