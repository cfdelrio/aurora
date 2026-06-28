# Spec 015 — Rendered Message Review / Persistence Boundary

> An **auditable** record of rendered presentation artifacts and their **display-safety** review — append-only, ref-only, downstream of the domain. Persisting rendered text does **not** make it true; approving a render does **not** strengthen the domain; reviewing presentation is **not** reviewing reasoning.
>
> Behavioral specification. Not implementation; no real LLM provider; no UI; no API; no delivery; no repository design; no changes to existing module *behavior*.

| Field | Value |
|---|---|
| **Status** | Domain/Behavioral Spec · *Accepted pending review* |
| **Phase** | Specification (no code, no provider, no UI/API/delivery) |
| **Slice** | `RenderedMessage (Impl 014) → RenderedMessageRecord (append-only, ref-only) → RenderReview (display-safety) → DisplayEligibility — never source truth, never reasoning` |
| **Builds on** | Spec/Impl 014 (rendering boundary) · 005 (voice/terminal output) · 011 (event records) · 012 (reprojection harness) · 013 (manual input adapter) |
| **Produces (behavior)** | a `RenderedMessageRecord`, `RenderingAttempt`, `RenderReview`/`Decision`/`Reason`, `RenderedMessageRevision`, `DisplayEligibility`; append-only audit rules; the test contract |
| **Explicitly does not produce** | a real LLM provider, prompt templates, UI review screens, API, delivery/notification, a production DB/schema, search/analytics, content-moderation, retraining, gate changes, re-running reasoning |

[ASSUMPTION] Behavioral/domain spec only. The technical spec (TS-strict record/review shapes, where the boundary lives, whether a test-only repository/event is used, the closed decision/reason catalogs) follows separately as **015A**. Implementation does not begin from this document, and **no provider, UI/API, storage, or delivery technology is chosen here**.

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

[FACT] **Central question:** *How can Aurora persist and review rendered messages without letting generated text become domain authority, review approval become evidence, or presentation review modify reasoning?*

[FACT] Impl 014 made *output out* safe at the moment of generation (a deterministic renderer behind a mandatory validator). This slice adds what happens **after** a render exists: an **auditable record** of the presentation artifact and a **display-safety review** — both kept strictly downstream. The danger guarded is the symmetric one to ingestion: just as manual input must not become meaning (Impl 013), a **persisted/approved rendering must not become truth**.

[FACT] Three rules, restated (the user's framing):
- **Persisting rendered text ≠ making it authority.**
- **Approving a render ≠ strengthening the domain.**
- **Reviewing presentation ≠ reviewing reasoning.**

---

## 2. Core Principle

[FACT] **Rendered text is a presentation artifact.** A review decision is about **display safety and faithfulness** — not whether the domain output is true.

[FACT] **Persisting rendered text does not make it true.** **Approving** rendered text does **not** strengthen `VoiceMode`, confidence, traceability, understanding, `SupportQuality`, recommendation status, athlete state, purpose, or evidence. A **rejected** rendered message does **not** invalidate the domain output. A **revised** rendered message is a **new presentation attempt**, not a new reasoning result.

[ASSUMPTION] The guiding sentence: *the review asks "is this a faithful, safe way to show what the domain already decided?" — never "is the domain right?"* If a review decision could change anything upstream of the renderer, the boundary is wrong.

---

## 3. Scope & Non-Scope

### In scope
[DECISION] rendered-message **record** behavior; rendered-message **source refs**; **rendering-attempt identity** (success/failure); **review status / decisions / reasons**; the **revision / re-render** relationship; **append-only audit** rules; **source-domain-output traceability**; **optional** event-recording behavior (ref-only occurrence, inert); **safe persistence semantics**; the forbidden feedback into domain reasoning; and the distinction between a **presentation artifact** and a **domain artifact**.

### Non-Scope
[FACT] real LLM provider integration; prompt templates as production code; UI review screens; API endpoints; message delivery; notifications; user accounts; authentication; production database schema; search/indexing of rendered messages; analytics; model evaluation; content-moderation provider; automatic retraining; automatic coaching; changing `DecisionSupport` gates; re-running reasoning; rendering-provider selection.

[DECISION] **No provider, UI/API, storage, or delivery technology is chosen.** Persistence here means an **auditable record contract** (satisfiable in-memory, behind a port, like Impl 010/011); *display eligibility is not delivery.*

---

## 4. Domain Rules To Preserve (Invariants)

[FACT] The boundary must satisfy **all**:

1. A `RenderedMessageRecord` is **not** source truth.
2. …is **not** `Evidence`.
3. …is **not** `Observation`.
4. …is **not** `Understanding`.
5. …is **not** `AthleteDecision`.
6. …is **not** `DecisionSupport`.
7. Review approval does **not** change `VoiceMode`.
8. Review approval does **not** create a `Recommendation`.
9. Review approval does **not** strengthen confidence.
10. Review approval does **not** repair traceability.
11. Review approval does **not** remove freshness limitations.
12. Review approval does **not** update `SupportQuality`.
13. Review rejection does **not** invalidate the domain output.
14. Review rejection does **not** falsify the hypothesis.
15. Revision creates a **new** rendered artifact/attempt; it does **not** silently overwrite the old one.
16. Persisted rendered text **keeps a source domain output ref**.
17. Persisted rendered text **keeps the rendering validation result**.
18. Persisted rendered text **keeps the review status** if reviewed.
19. Event records, if used, are **occurrence records, not commands**.
20. Rendering persistence **must not trigger** delivery, reasoning, reprojection, or recommendations.

[ASSUMPTION] The *defining* invariants are **1, 7, 10, 13, 20** — together they make "the persisted/approved/rejected render changed the domain (its truth, voice, traceability, validity) or fired a downstream effect" a failing test.

---

## 5. Key Concepts (defined behaviorally)

### 5.1 RenderedMessageRecord
[DECISION] An **auditable record of a rendered presentation artifact.** It should include: a **rendered message id**; the **source domain output ref**; the **source terminal output kind**; the **`VoiceMode` at render time**; the **rendered text**; the **rendering status**; the **rendering validation result** (+ warnings/failures); the **uncertainty/limitations/traceability preservation flags** (from the `RenderedMessage`); the **renderer kind** (e.g. `fake`); **`createdAt`**; **`supersedes`/`revisedFrom`** if relevant; and the **review status** if any.
- It **must not** be treated as domain truth (invariants 1–6).

### 5.2 RenderingAttempt
[DECISION] A single **attempt** to render a domain-approved output; it may **succeed or fail**. A **failed** attempt **may** be recorded for audit but **must not be displayable**. A **successful** attempt may become a `RenderedMessageRecord`.

### 5.3 RenderReview
[DECISION] A **review of the rendered presentation artifact** — whether it **faithfully and safely presents** the domain output. It is **not** about whether the domain output is true.

### 5.4 RenderReviewDecision
[DECISION] A **closed** decision set: `approved-for-display` · `rejected-for-display` · `needs-revision` · `not-reviewed` · `superseded`.
- **`approved-for-display` means display-eligible, not domain-true.**

### 5.5 RenderReviewReason
[DECISION] A **closed** reason set (aligned to the renderer's own failure vocabulary so review and validation speak the same language): `faithful-to-domain-output` · `voice-escalation` · `uncertainty-hidden` · `limitation-hidden` · `invented-fact` · `traceability-overstated` · `style-unsafe` · `tone-unsafe` · `stale-source-visible` · `manual-review-required` · `superseded-by-new-render`.

### 5.6 RenderedMessageRevision
[DECISION] A **new** rendered artifact derived from the **same** source domain output (or a later domain output). Revision **preserves the old record** and **must not mutate it silently** — the link (`revisedFrom`/`supersedes`) is append-only.

### 5.7 DisplayEligibility
[DECISION] Whether a rendered message **may be shown** by a future UI/delivery layer. **Display eligibility is not delivery**, **not** user notification, and **not** domain approval. It is a property of the record (derived from review status), nothing more.

---

## 6. Required Use Cases & Acceptance Criteria

[DECISION] Given/When/Then; these become the test suite (§8). **Negative criteria are defining.**

### UC1 — Record a validated rendered message
- **AC1.1** — *Given* a `RenderedMessage` that passed validation, *when* it is recorded, *then* Aurora stores it as a presentation artifact with source domain output ref, `VoiceMode`, terminal output kind, validation result, text, and `createdAt` — **without mutating any domain aggregate**.

### UC2 — Approve for display
- **AC2.1** — *Given* a message that faithfully preserves voice, uncertainty, limitations, traceability, and agency, *when* reviewed, *then* it may be marked **`approved-for-display`** **without changing** the source `DecisionSupportCase` or `VoiceMode`.

### UC3 — Reject for voice escalation
- **AC3.1** — *Given* a message that sounds like a recommendation but the source `VoiceMode` was `Reflection`, *when* reviewed, *then* it is **`rejected-for-display`** and the **domain output remains unchanged**.

### UC4 — Needs revision
- **AC4.1** — *Given* a message that hides a limitation or is stylistically unsafe, *when* reviewed, *then* it may be marked **`needs-revision`**; a future render attempt may be **linked**, but the **old record remains auditable**.

### UC5 — Failed rendering attempt
- **AC5.1** — *Given* the renderer produced unsafe/invalid text, *when* persistence is considered, *then* Aurora may record a **failed attempt for audit**, but it **must not be display-eligible**.

### UC6 — Supersede
- **AC6.1** — *Given* a new rendering replaces an earlier one, *when* superseded, *then* the previous record **remains immutable/auditable** and is **marked `superseded`**, not overwritten.

### UC7 — Review does not repair traceability
- **AC7.1** — *Given* source traceability was partial/missing, *when* a reviewer approves the message as faithful, *then* traceability **remains** partial/missing — approval does **not** make it complete.

### UC8 — Rendered text not re-ingested as truth
- **AC8.1** — *Given* a `RenderedMessageRecord` exists, *when* later reasoning runs, *then* that text is **not** treated as `Observation`/`Evidence`/`Understanding`/`AthleteDecision` **unless** separately and explicitly reported by the athlete through the manual input adapter.

### UC9 — Optional event record
- **AC9.1** — *Given* a message is recorded or reviewed, *when* event recording is available, *then* a **ref-only** occurrence record may be appended, but it **must not** trigger delivery, reasoning, reprojection, or domain mutation.

### UC10 — No delivery side effect
- **AC10.1** — *Given* a message is `approved-for-display`, *when* review completes, *then* **no** UI/API/notification/delivery occurs in this slice.

---

## 7. Acceptance Criteria (consolidated)

[DECISION] At minimum:
- Given a validated rendered message, when recorded, then **text and source domain output ref are preserved**.
- Given a recorded rendered message, then it is **not** `Evidence`/`Observation`/`Understanding`/`DecisionSupport`/`AthleteDecision`.
- Given review approves a message, then **domain `VoiceMode` remains unchanged**.
- Given review approves a message, then **traceability and freshness limitations remain unchanged**.
- Given review rejects a message, then **the source domain output remains unchanged**.
- Given a message is revised, then **the old record remains auditable**.
- Given a failed rendering attempt, then it **cannot be display-eligible**.
- Given event recording is used, then the **event payload is ref-only and inert**.
- Given review completes, then **no delivery occurs**.
- Given this slice is implemented later, then **no real LLM provider/API/UI/external delivery/DB schema** is created (a later tech spec may allow a **test-only repository**).

---

## 8. Explicit Forbidden Behaviors

[FACT] This spec forbids: rendered text becoming source truth / `Evidence` / `Observation` / `Understanding` / `AthleteDecision` / `DecisionSupport`; review approval changing `VoiceMode`; creating a `Recommendation`; strengthening confidence; repairing traceability; removing freshness limitations; updating `SupportQuality`; review rejection invalidating the domain output; revision overwriting old rendered text silently; an event record triggering delivery / reasoning / reprojection; rendered-message persistence triggering UI/API/notification; a real LLM provider integration; and prompt templates as production code.

[DECISION] These are **testable negative requirements** (§9).

---

## 9. Validation Strategy

[ASSUMPTION] Tests to the contract; **negative tests are defining.**

**Positive:**
- a validated rendered message can be recorded; source domain output ref preserved;
- `VoiceMode` + terminal output kind preserved; validation result preserved;
- a `needs-revision`/`superseded` chain is append-only (old record auditable);
- a ref-only `RenderedMessageRecorded`/`RenderReviewed` event (if used) is well-formed.

**Negative (must prove absence):**
- review **approval mutates no domain output** (no `VoiceMode`/`SupportQuality`/traceability/freshness change);
- review **approval does not repair traceability** (partial/missing stays so);
- review **rejection does not invalidate** the domain output or falsify a hypothesis;
- a **failed attempt is never display-eligible**;
- supersession/revision **never overwrites** the old record;
- a `RenderedMessageRecord` is **not usable as** `Evidence`/`Observation`/`Understanding`/`AthleteDecision`;
- an optional event record is **ref-only and inert** (no delivery/reasoning/reprojection/mutation);
- **no UI/API/provider/delivery/DB-schema** file or token (structural guard); **no real LLM provider**.

**Dependency-boundary:**
- the review/persistence boundary imports only what holds a `RenderedMessage` (read-only over `rendering`) + `shared-kernel` (+ optionally a neutral harness for events); it **never** imports `reasoning`/`understanding`/`decision-support` to *write*; upstream modules never import it;
- **all 349 Impl 001–014 tests continue to pass.**

[ASSUMPTION] The negative tests are the contract that *persistence is auditability, not authority, and review is display-safety, not reasoning*. If they cannot be written/passed, the boundary design is wrong.

---

## 10. Relationship To Existing Architecture

[FACT] Builds on, without altering:
- **Spec/Impl 014 (rendering boundary)** — rendering creates validated presentation artifacts; this slice **records and reviews** them, strictly downstream.
- **Spec/Impl 005 (decision-support)** — the domain owns the terminal output and voice; review never touches them.
- **Spec/Impl 011 (event records)** — any `RenderedMessageRecorded`/`RenderReviewed` is an **occurrence record, not a command** (ref-only, inert).
- **Spec/Impl 012 (reprojection harness)** — reprojection may inspect stale derived views but is **not triggered** by render review.
- **Spec/Impl 013 (manual input adapter)** — symmetry: **rendered text is not source material** unless the athlete separately reports it back via the manual adapter.

[DECISION] The boundary picture: **rendering generates · review/persistence audits display-safety · the domain output stays the source of truth · review is presentation, not reasoning · display eligibility is not delivery · event records are occurrence history, not commands.**

---

## 11. Open Questions (do not block this spec)

[QUESTION] whether the first implementation uses a repository port; whether failed render attempts are persisted; whether review records are separate from rendered-message records; whether rendered-message events are implemented now or later; whether review requires a human actor; how a UI will display review status later; how delivery will work later; retention/deletion policies for rendered messages; how localization affects revision; how a future real LLM provider fits **behind** the validated rendering boundary.

[ASSUMPTION] None block this slice: Aurora can define what a faithful record/review boundary must and must not do regardless of how these resolve. Technical-implementation questions are deferred to 015A.

---

## 12. Success Criterion

> **"Can Aurora persist and review rendered messages without letting generated text become domain truth or review approval modify reasoning?"**

[ASSUMPTION] Answerable from this spec: a **`RenderedMessageRecord`** captures a presentation artifact (source domain output ref, terminal output kind, `VoiceMode` at render time, text, validation result, preservation flags, `createdAt`, optional `supersedes`/`revisedFrom`/review status) as an **append-only, ref-only** audit entry; a **`RenderReview`** assigns a **closed** `RenderReviewDecision` (`approved-for-display`/`rejected-for-display`/`needs-revision`/`not-reviewed`/`superseded`) with a **closed** reason — judging **display safety/faithfulness only**. Persisting **never** makes the text true; approval **never** strengthens voice/confidence/traceability/freshness/`SupportQuality` or creates a `Recommendation`; rejection **never** invalidates the domain output; revision/supersession **preserve** the old record; a failed attempt is **never** display-eligible; and recording/reviewing **triggers no** delivery, reasoning, reprojection, or domain mutation (any event is ref-only and inert). **No real LLM provider/UI/API/delivery/DB-schema** is chosen, and **all 349 existing tests stay green** — proving the record audits the presentation without it ever becoming authority, and the review judges display without it ever becoming reasoning.

---

## Known Risks

[ASSUMPTION]
- **Risk:** persistence/approval makes the text authoritative. **Defense:** invariants 1–6/7–12 + UC2/UC7 — the record is a presentation artifact with a source ref; approval changes nothing upstream; negative tests assert no domain mutation.
- **Risk:** rejection invalidates the domain output / falsifies a hypothesis. **Defense:** invariants 13/14 + UC3 — rejection is display-only; the domain output is unchanged.
- **Risk:** revision silently overwrites history. **Defense:** invariant 15 + UC4/UC6 — append-only; old record retained and marked.
- **Risk:** a failed attempt leaks to display. **Defense:** §5.2 + UC5 — failed attempts are never display-eligible.
- **Risk:** recording fires a downstream effect (delivery/reasoning/reprojection). **Defense:** invariant 20 + UC9/UC10 — any event is ref-only and inert; no delivery in this slice.
- **Risk:** rendered text re-enters as truth. **Defense:** invariant 1 + UC8 — not re-ingested unless the athlete reports it via the manual adapter.
- **Risk:** the slice drifts into a provider/UI/delivery. **Defense:** §3 non-scope + §8 forbidden + structural guard — record/review only; no provider/UI/API/delivery chosen.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the fifteenth Specification and the first rendered-message review/persistence boundary. It defines an append-only, ref-only record of presentation artifacts and a display-safety review, kept strictly downstream of the domain; it chooses no provider, UI/API, storage, or delivery technology. Persisting rendered text does not make it authority; approving a render does not strengthen the domain; reviewing presentation is not reviewing reasoning.*

*Inputs: [Spec 014](./014-llm-rendering-boundary.md) · [Spec 014A](./014-llm-rendering-boundary-tech.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 012](./012-reprojection-harness.md) · [Spec 013](./013-manual-input-adapter.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
