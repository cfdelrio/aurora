# Spec 016 — Delivery Boundary

> The **downstream exposure** edge: how a *display-eligible* rendered message may be **delivered or exposed** to a target without delivery becoming domain authority, channel success becoming evidence, or display eligibility becoming domain approval. Delivery makes a reviewed presentation artifact **available**; it never decides what the message means.
>
> Behavioral specification. Not implementation; no real provider/channel; no UI; no API; no scheduler/event-bus/queue; no production DB; no changes to existing module *behavior*.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code, no provider, no UI/API, no real channel, no scheduler/event-bus) |
| **Slice** | `RenderedMessageRecord (Impl 015) → DisplayEligibility → DeliveryRequest → DeliveryEligibilityCheck → DeliveryAttempt → DeliveryOutcome → (optional) DeliveryRecord — never source truth, never reasoning, never authority` |
| **Builds on** | Spec/Impl 015 (rendered-message review/persistence + display eligibility) · 014 (rendering boundary) · 005 (voice/terminal output) · 011 (event records) · 012 (reprojection harness) · 013 (manual input adapter) |
| **Produces (behavior)** | a `DeliveryRequest`, `DeliveryEligibilityCheck`, `DeliveryAttempt`, closed `DeliveryOutcome`, closed `DeliveryFailureReason`, `DeliveryTarget` abstraction, optional `DeliveryRecord`; downstream-only exposure rules; the test contract |
| **Explicitly does not produce** | a real provider/channel (email/SMS/push/WhatsApp), UI, API, authentication, consent/preferences, a scheduler/retry, queues/background jobs, an event bus, a production DB/schema, analytics, read receipts, prompt templates, a real LLM provider |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict request/attempt/outcome shapes, whether delivery lives in a new `delivery` module or inside `rendering/application`, whether a test-only sink and/or repository port is used, the closed outcome/reason/target catalogs, whether a ref-only event is emitted) follows separately as **016A**. Implementation does not begin from this document, and **no provider, channel, UI/API, scheduler, event bus, storage, or delivery technology is chosen here**.

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

[FACT] **Central question:** *How can Aurora deliver or expose a reviewed rendered message without letting delivery become domain authority, channel success become evidence, or display eligibility become domain approval?*

[FACT] Impl 015 closed the first auditable *output-out* cycle:

```text
DecisionSupport
→ RenderableDomainOutput
→ FakeRenderer + mandatory validator
→ RenderedMessage
→ RenderedMessageRecord
→ append-only RenderReview
→ derived DisplayEligibility
```

The next missing boundary is **delivery / exposure**: making an *approved-for-display* message **available to a recipient or channel**. This slice adds what happens **after** display eligibility exists — strictly downstream of rendering review. The danger guarded is the mirror of the ingestion danger (Impl 013) and the persistence danger (Impl 015): just as **manual input must not become meaning** and a **persisted/approved rendering must not become truth**, a **delivered message must not become authority** and a **delivery result must not become evidence**.

[FACT] Three rules, restated (the user's framing):
- **Delivering rendered text ≠ making it authority.**
- **Channel success ≠ evidence that the guidance was good.**
- **Display eligibility ≠ domain approval; delivery ≠ reasoning.**

[ASSUMPTION] This is the *output edge of the system, before any real edge exists*. We define the behavioral contract for exposure so that when a real UI/channel/provider arrives (a later slice), it plugs in **behind** a boundary that already forbids it from feeding back into the domain.

---

## 2. Core Principle

[FACT] **Delivery is downstream exposure.** Delivery may **make a reviewed rendered message available** to a recipient or channel, and may **record that exposure was attempted or completed**.

[FACT] Delivery **may not**:
- decide what the message means;
- change the domain output;
- strengthen `VoiceMode`, confidence, traceability, freshness, `SupportQuality`, or recommendation status.

[FACT] **Delivery success is not evidence** that the guidance was good. **Delivery failure is not evidence** that the domain output was wrong. A **delivered message is still a presentation artifact**, not source truth.

[ASSUMPTION] The guiding sentence: *delivery asks "may this already-approved presentation be made available, and was it?" — never "is this message good?" or "is the domain right?"* If a delivery request, attempt, outcome, or failure could change anything upstream of the renderer — or could re-enter as evidence/observation — the boundary is wrong.

---

## 3. Scope & Non-Scope

### In scope
[DECISION] delivery/exposure **boundary behavior**; the **delivery request**; **eligibility verification** before delivery (reusing the derived `DisplayEligibility` from Impl 015); a safe **delivery target/channel abstraction**; the **delivery attempt**; the closed **delivery outcome**; the closed **delivery failure reason**; **delivery audit** (optional `DeliveryRecord`); the **relationship to `RenderedMessageRecord`** and to **display eligibility**; **optional** ref-only event-recording behavior (inert); **safe no-op / rejection** behavior; **non-delivery when not eligible**; and the guarantee of **no upstream domain effects**.

### Non-Scope
[FACT] UI implementation; API endpoints; mobile/web app; email/SMS/WhatsApp/push providers; production notification system; authentication; user account routing; consent/preferences; real external delivery; retry scheduler; queues; background jobs; event bus; production DB/schema; analytics; read receipts; user feedback; provider integration; LLM integration; prompt templates.

[DECISION] **No provider, channel, UI/API, scheduler, event bus, storage, or delivery technology is chosen.** "Delivery" here means an **exposure boundary contract** (satisfiable against a **test/manual/future-channel abstraction**, like the in-memory ports of Impl 010/011/015); *a delivery attempt against a test-sink is not a real channel call.*

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] The boundary must satisfy **all**:

1. `DeliveryRequest` is **not** `DecisionSupport`.
2. `DeliveryAttempt` is **not** `Evidence`.
3. `DeliveryAttempt` is **not** `Observation`.
4. `DeliveryAttempt` is **not** `Understanding`.
5. `DeliveryAttempt` is **not** `AthleteDecision`.
6. `DeliveryOutcome` is **not** `SupportQuality`.
7. Delivery success does **not** validate the domain output.
8. Delivery failure does **not** invalidate the domain output.
9. Delivery does **not** change `VoiceMode`.
10. Delivery does **not** create a `Recommendation`.
11. Delivery does **not** repair traceability.
12. Delivery does **not** remove limitations.
13. Delivery does **not** update the rendered-message review.
14. Delivery does **not** update display eligibility.
15. Delivery **requires** display eligibility.
16. Non-eligible messages **must not** be delivered.
17. Delivery does **not** mutate upstream aggregates.
18. Delivery does **not** trigger reasoning or reprojection.
19. Event records, if used, are **ref-only occurrence records, not commands**.
20. Delivery approval/execution is **not** UI/API/channel implementation.

[ASSUMPTION] The *defining* invariants are **7, 8, 13/14, 15/16, 17/18** — together they make "delivery (its success, failure, request, or outcome) changed the domain, validated/invalidated the output, mutated the review/eligibility, fired reasoning/reprojection, or delivered something ineligible" a failing test.

---

## 5. Key Concepts (defined behaviorally)

### 5.1 DeliveryRequest
[DECISION] A request to **expose a specific rendered-message record to a target.**
- **Should include:** a **rendered message record ref** (the `RenderedMessageRecordId` from Impl 015); a **requested target/channel abstraction**; **`requestedAt`**; a **requester kind** if relevant (`system`/`human`/`test`, aligned with `ReviewerKind`); a **reason/context** if safe; **delivery constraints** if relevant.
- **Must not include:** new domain claims; voice overrides; instructions to change the text; instructions to ignore eligibility; provider-specific payloads/secrets; arbitrary prompt/channel metadata.
- [FACT] A `DeliveryRequest` is a request to *expose what already exists* — never to *produce or alter* it (invariant 1).

### 5.2 DeliveryEligibilityCheck
[DECISION] A check that the rendered message is **safe to expose.** It **reuses** the Impl 015 `DisplayEligibility` derivation rather than re-deriving safety, verifying:
- the **record exists**;
- it **rendered successfully** (`renderingStatus === "rendered"`);
- its **latest review approved it for display** (`approved-for-display`);
- it is **not superseded**;
- **preservation flags intact** (uncertainty/limitations/traceability preserved);
- a **source domain output ref is present**;
- **no blocking limitation** in the rendered record.
- [FACT] It **must not** re-run reasoning; **must not** repair the rendering review; **must not** decide domain truth (invariants 11, 13, 18).

### 5.3 DeliveryAttempt
[DECISION] An **auditable attempt to expose an eligible rendered message.**
- **May include:** an **attempt id**; the **rendered message record ref**; the **target/channel abstraction**; **`requestedAt`**; **`attemptedAt`**; a **delivery status**; a **failure reason** if any; a **delivery actor/system kind**; **no** provider-specific secret or payload.
- [FACT] It **must not** be treated as evidence or as outcome validation (invariants 2–6).

### 5.4 DeliveryOutcome
[DECISION] A **closed** outcome set. Expected examples:
- `accepted-for-delivery`
- `blocked-not-eligible`
- `delivered`
- `failed`
- `cancelled`
- `not-attempted`

[ASSUMPTION] Names align with the eventual tech spec; the behavioral distinction that matters is **"made available / recorded as attempted"** vs **"blocked / not done"** — and that *none* of these values feed back into the domain.

### 5.5 DeliveryFailureReason
[DECISION] A **closed** reason set. Examples:
- `rendered-message-not-found`
- `not-display-eligible`
- `superseded-record`
- `failed-render-record`
- `missing-source-ref`
- `review-not-approved`
- `unsupported-channel`
- `unsafe-target`
- `provider-unavailable`
- `delivery-cancelled`

[FACT] Provider-related reasons (e.g. `provider-unavailable`) **may exist behaviorally**, but **no provider is implemented** in this spec; they describe the *shape* of a future failure, not a real call.

### 5.6 DeliveryTarget
[DECISION] A **safe abstraction of where the message would be exposed.** Examples:
- `test-sink`
- `manual-review-surface`
- `future-ui`
- `future-notification-channel`

[DECISION] This spec **must not** choose real provider semantics. A target is a **label for an exposure surface**, not a channel implementation; an **unknown/unsafe target** yields `unsupported-channel`/`unsafe-target`, never a real call.

### 5.7 DeliveryRecord (optional)
[DECISION] *If* the spec chooses persistence behaviorally, a **delivery audit record** preserving: the **rendered message record ref**; the **delivery request**; the **eligibility result**; the **delivery attempt/outcome**; **`createdAt` / `attemptedAt`**; and **no domain mutation**.
- [FACT] Like the Impl 015 record, a `DeliveryRecord` is **auditability, not authority** — it carries **no** domain field and **no** domain-write handle.

---

## 6. Required Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§9). **Negative criteria are defining.**

### UC1 — Deliver eligible reviewed message
- **AC1.1** — *Given* a rendered message record is **rendered**, **approved-for-display**, **not superseded**, and **display-eligible**, *when* delivery is requested, *then* Aurora **may create a delivery attempt/exposure record** with outcome `accepted-for-delivery`/`delivered` — **without changing the source domain output**.

### UC2 — Block non-reviewed message
- **AC2.1** — *Given* a rendered message record is **not reviewed** (`not-reviewed`), *when* delivery is requested, *then* delivery is **blocked** with `not-display-eligible` (failure `review-not-approved`) and **no exposure occurs**.

### UC3 — Block rejected message
- **AC3.1** — *Given* a rendered message record was **rejected for display**, *when* delivery is requested, *then* delivery is **blocked** and the **source domain output remains unchanged**.

### UC4 — Block superseded message
- **AC4.1** — *Given* a rendered message record has been **superseded**, *when* delivery is requested, *then* delivery is **blocked** (failure `superseded-record`) and the **newer record is not inferred/delivered automatically** unless explicitly requested.

### UC5 — Delivery success does not validate advice
- **AC5.1** — *Given* an eligible message is **delivered successfully**, *when* the delivery outcome is recorded, *then* `SupportQuality`, `VoiceMode`, traceability, confidence, and understanding **remain unchanged**.

### UC6 — Delivery failure does not invalidate domain output
- **AC6.1** — *Given* an eligible message **delivery fails** (e.g. `provider-unavailable`), *when* the failure is recorded, *then* the source `DecisionSupportCase` and the rendered-message review **remain unchanged**.

### UC7 — No reasoning side effect
- **AC7.1** — *Given* any delivery request, *when* it is **accepted, blocked, delivered, failed, or cancelled**, *then* **no** `Signal`, `Evidence`, `Hypothesis`, `Understanding`, `DecisionSupport`, `Recommendation`, or reprojection is created.

### UC8 — Optional event record
- **AC8.1** — *Given* a delivery attempt or outcome is recorded, *when* event recording is available, *then* a future **ref-only occurrence record may be appended**, but it **must not** trigger delivery/retry/reasoning. In this spec, event implementation **may be deferred**.

### UC9 — No real channel
- **AC9.1** — *Given* delivery is requested in this slice, *when* **no real provider/channel is implemented**, *then* **only a test/manual/future-channel abstraction is allowed**; **no** email/SMS/push/WhatsApp/API is called.

### UC10 — Delivered text not re-ingested as source truth
- **AC10.1** — *Given* a message has been delivered, *when* later reasoning runs, *then* the delivered text is **not** treated as `Observation`/`Evidence`/`Understanding`/`AthleteDecision` **unless** the athlete **separately reports it** through the manual input adapter (Impl 013).

---

## 7. Acceptance Criteria (consolidated)

[DECISION] At minimum:
- Given a **display-eligible** record, when delivery is requested, then an **attempt may be recorded**.
- Given a **not-reviewed** record, when delivery is requested, then delivery is **blocked**.
- Given a **rejected** record, when delivery is requested, then delivery is **blocked**.
- Given a **superseded** record, when delivery is requested, then delivery is **blocked**.
- Given a **failed render** record, when delivery is requested, then delivery is **blocked**.
- Given delivery **succeeds**, then **no domain output is changed**.
- Given delivery **fails**, then **no domain output is invalidated**.
- Given delivery completes, then **no `Signal`/`Evidence`/`Hypothesis`/`Understanding`/`DecisionSupport`** is created.
- Given event recording is later used, then **events are ref-only and inert**.
- Given this slice is implemented later, then **no real provider/UI/API/channel/scheduler/event bus/DB schema** is created **unless** a later tech spec explicitly allows a **test-only sink or in-memory store**.

---

## 8. Explicit Forbidden Behaviors

[FACT] This spec forbids:
- delivery of **non-display-eligible** records;
- delivery of **failed render** records;
- delivery of **rejected** records;
- delivery of **superseded** records *unless explicitly targeting historical display*;
- delivery changing **`VoiceMode`**;
- delivery creating a **`Recommendation`**;
- delivery validating **`SupportQuality`**;
- delivery repairing **traceability**;
- delivery removing **limitations**;
- delivery **invalidating** the domain output;
- delivery creating **`Evidence`**;
- delivery creating **`Observation`**;
- delivery updating **`Understanding`**;
- delivery creating **`AthleteDecision`**;
- delivery triggering **reprojection**;
- delivery triggering a **retry scheduler**;
- delivery using **event records as commands**;
- delivery calling a **real provider/channel**;
- delivery creating **UI/API**;
- delivery treating a **read receipt or success as athlete outcome**.

[DECISION] These are **testable negative requirements** (§9).

---

## 9. Validation Strategy

[ASSUMPTION] Tests to the contract; **negative tests are defining.**

**Positive:**
- an **eligible** rendered message may be **accepted for delivery** / produce a delivery attempt with a recorded outcome;
- the delivery attempt **preserves the rendered message record ref + target**;
- an optional ref-only `DeliveryAttempted`/`DeliveryOutcomeRecorded` event (if used) is **well-formed**.

**Negative (must prove absence):**
- a **not-reviewed** record is **blocked**;
- a **rejected** record is **blocked**;
- a **superseded** record is **blocked**;
- a **failed render** record is **blocked**;
- delivery **success does not mutate** the domain output (no `VoiceMode`/`SupportQuality`/traceability/freshness/confidence change);
- delivery **failure does not invalidate** the domain output or the rendered-message review;
- a `DeliveryOutcome`/`DeliveryAttempt` is **not usable as** `Evidence`/`Observation`/`Understanding`/`AthleteDecision`/`SupportQuality`;
- **no** `Signal`/`Evidence`/`Hypothesis`/`Understanding`/`DecisionSupport`/reprojection side effect;
- an optional event record is **ref-only and inert** (**no event-as-command**: no delivery/retry/reasoning fired);
- **no real provider/API/UI/channel** file or token (structural guard);
- **no scheduler / event bus**;
- **rendered text still not source truth** (delivered text not re-ingested unless reported via the manual adapter).

**Dependency-boundary:**
- the delivery boundary imports only what it needs to **read** a `RenderedMessageRecord` / `DisplayEligibility` (read-only over `rendering`) + `shared-kernel` (+ optionally a neutral harness for events); it **never** imports `reasoning`/`understanding`/`decision-support`/`observation` to *write*; upstream modules never import it;
- **all 374 Impl 001–015 tests continue to pass.**

[ASSUMPTION] The negative tests are the contract that *delivery is downstream exposure — auditability, not authority — and a delivery result is never evidence and never reasoning*. If they cannot be written/passed, the boundary design is wrong.

---

## 10. Relationship To Existing Architecture

[FACT] Builds on, without altering:
- **Spec/Impl 015 (rendered-message review/persistence)** — **display eligibility is derived** from rendered-message review/preservation state; delivery **consumes** that derivation and is **strictly downstream** of it (delivery never edits the review or the eligibility).
- **Spec/Impl 014 (rendering boundary)** — rendered text is **validated presentation**; delivery exposes it, it never re-generates or re-validates meaning.
- **Spec/Impl 005 (decision-support)** — `DecisionSupport` **owns the terminal output and voice**; delivery never touches them.
- **Spec/Impl 011 (event records)** — any `DeliveryAttempted`/`DeliveryOutcomeRecorded` is an **occurrence record, not a command** (ref-only, inert).
- **Spec/Impl 012 (reprojection harness)** — reprojection is **not triggered** by delivery.
- **Spec/Impl 013 (manual input adapter)** — symmetry: **delivered text is not source material** unless the athlete separately reports it back via the manual adapter.

[DECISION] The boundary picture: **rendering generates · review/persistence audits display-safety · display eligibility is derived · delivery exposes (downstream only) · the domain output stays the source of truth · a delivery attempt/outcome is auditability, not authority, and never evidence · display eligibility is not delivery and not domain approval · event records are occurrence history, not commands · provider/channel/UI/API integration remains future.**

---

## 11. Open Questions (do not block this spec)

[QUESTION]
- whether Implementation 016 creates a **delivery module** or keeps delivery **inside `rendering/application`**;
- whether delivery records get **repository ports** now or later;
- whether **event records for delivery** are needed later;
- how a **real UI/API/channel/provider** integration will work;
- whether **user consent/preferences** are required before delivery;
- whether delivery should support **cancellation/retry**;
- how delivery attempts are **retained/deleted**;
- whether **read receipts / user actions** become observations later (if so, only via the manual adapter, per invariant symmetry);
- how delivery interacts with **future provider adapters**.

[ASSUMPTION] None block this slice: Aurora can define what a safe exposure boundary must and must not do regardless of how these resolve. Technical-implementation questions are deferred to 016A.

---

## 12. Success Criterion

> **"Can Aurora expose a reviewed rendered message without letting delivery become domain authority, evidence, or reasoning?"**

[ASSUMPTION] Answerable from this spec: a **`DeliveryRequest`** references an existing `RenderedMessageRecord` and a safe `DeliveryTarget` abstraction (no domain claims, no voice override, no provider payload); a **`DeliveryEligibilityCheck`** reuses the Impl 015 `DisplayEligibility` derivation to require **rendered + approved-for-display + not-superseded + source-ref-present + preservation-flags-intact** before any exposure; a **`DeliveryAttempt`** records an auditable exposure against a **test/manual/future-channel** abstraction with a **closed** `DeliveryOutcome` (`accepted-for-delivery`/`blocked-not-eligible`/`delivered`/`failed`/`cancelled`/`not-attempted`) and a **closed** `DeliveryFailureReason`. Non-eligible (not-reviewed / rejected / superseded / failed-render / missing-ref) messages are **blocked**; delivery **success never validates** and **failure never invalidates** the domain output; delivery **never** changes `VoiceMode`, creates a `Recommendation`, repairs traceability, removes limitations, updates the review or eligibility, or mutates any upstream aggregate; delivery **triggers no** reasoning, reprojection, `Signal`/`Evidence`/`Hypothesis`/`Understanding`/`DecisionSupport`, retry scheduler, or event bus (any event is ref-only and inert); delivered text is **not re-ingested** as source truth unless the athlete reports it via the manual adapter; and **no real provider/channel/UI/API/scheduler/event-bus/DB-schema** is chosen (a later tech spec may allow a **test-only sink and/or in-memory store**) — with **all 374 existing tests staying green**, proving delivery is downstream exposure (auditability, not authority), and a delivery result is never evidence and never reasoning.

---

## Known Risks

[ASSUMPTION]
- **Risk:** delivery (or its success) makes the message authoritative / validates the advice. **Defense:** invariants 7/9–12 + UC1/UC5 — delivery exposes an already-approved artifact; success changes nothing upstream; negative tests assert no domain mutation.
- **Risk:** delivery failure invalidates the domain output. **Defense:** invariant 8 + UC6 — failure is exposure-only; the domain output and review are unchanged.
- **Risk:** an ineligible message leaks to a target. **Defense:** invariants 15/16 + UC2/UC3/UC4 + the failed-render block — delivery requires `DisplayEligibility`; not-reviewed/rejected/superseded/failed-render are blocked.
- **Risk:** delivery fires a downstream effect (reasoning/reprojection/retry/event-as-command). **Defense:** invariants 18/19 + UC7/UC8 — any event is ref-only and inert; no scheduler/event bus.
- **Risk:** a read receipt / delivery success re-enters as evidence or athlete outcome. **Defense:** invariants 2–6 + UC10 + the manual-adapter symmetry — a delivery result is never `Evidence`/`Observation`; delivered text is not source truth unless separately reported.
- **Risk:** the slice drifts into a real provider/channel/UI/API. **Defense:** §3 non-scope + §8 forbidden + structural guard + UC9 — only a test/manual/future-channel abstraction; no provider/UI/API/scheduler chosen.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the sixteenth Specification and the first delivery/exposure boundary. It defines how a display-eligible rendered message may be exposed to a target — downstream of rendering review, auditability not authority — and chooses no provider, channel, UI/API, scheduler, event bus, storage, or delivery technology. Delivering rendered text does not make it authority; channel success is not evidence; display eligibility is not domain approval, and delivery is not reasoning.*

*Inputs: [Spec 015](./015-rendered-message-review-persistence.md) · [Spec 015A](./015-rendered-message-review-persistence-tech.md) · [Spec 014](./014-llm-rendering-boundary.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 012](./012-reprojection-harness.md) · [Spec 013](./013-manual-input-adapter.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
