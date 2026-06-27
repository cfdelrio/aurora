# Tech Spec 015A — Rendered Message Review / Persistence — Implementation Plan

> The TS-strict plan for Spec 015: an **append-only `RenderedMessageRecord`** + a **display-safety `RenderReview`** living **inside the `rendering` module**, with a **repository port + in-memory adapter** and a **derived `DisplayEligibility`** — proving auditability and review **without** events, a real provider, UI/API, delivery, or any domain mutation. Persisting rendered text never makes it authority; approving a render never strengthens the domain; reviewing presentation is never reviewing reasoning.
>
> Technical Specification. **No code in this slice.** Implementation begins only from the approved plan as Implementation 015.

| Field | Value |
|---|---|
| **Status** | Technical Spec · *Accepted pending review* |
| **Phase** | Technical Specification (no code; no provider; no UI/API/delivery) |
| **Implements** | [Spec 015](./015-rendered-message-review-persistence.md) |
| **Builds on** | Spec/Impl 014 (rendering) · 005 (voice/terminal output) · 010 (repository pattern) · 011 (event records — deferred here) · 012 (reprojection) · 013 (manual input) |
| **Produces (plan for)** | `rendering/domain/rendered-message-record.ts` + `render-review.ts` + `display-eligibility.ts` + `rendering/application/` repository port + in-memory adapter + tests |
| **Explicitly excludes** | rendered-message **event records**, a real LLM provider/prompt templates, UI/API, delivery/notification, a production DB/schema/ORM/migration, search/analytics, gate changes, re-running reasoning |

[ASSUMPTION] This is **Technical Specification phase**, not Implementation. It fixes TS-strict shapes, the boundary location (inside `rendering`), the repository contract, the append-only review/audit rules, the closed catalogs, and the test contract so Implementation 015 contains **no open design or domain decisions** — only typing and wiring.

---

## How to Read This Document

| Tag | Meaning |
|---|---|
| **[FACT]** | Follows necessarily from an accepted spec/architecture/implementation. |
| **[DECISION]** | A technical commitment for this slice. |
| **[ASSUMPTION]** | A stance chosen for this slice. |
| **[QUESTION]** | Open; does not block. |

Principal **[DECISION]**s use **Decision · Why · Consequence · Risk · Reversal Point**.

---

## 1. Central Question

[FACT] *How can Aurora implement persisted/reviewable rendered-message records without letting generated text become domain authority, review approval become evidence, or presentation review modify reasoning?*

[FACT] The answer in code: a `RenderedMessageRecord` (append-only review history, ref to the source domain output) + a `RenderReview` entry, **inside `rendering`**, behind a **repository port + in-memory adapter** (the Impl 010 pattern), with **`DisplayEligibility` derived** (never stored as authority). It imports only `shared-kernel` + read-only `decision-support` types; it mutates no domain aggregate, appends no event, and triggers no delivery.

---

## 2. Surface Gap Analysis (read from current code)

[FACT] Verified against the repository so the plan reuses real shapes and invents nothing.

| # | Surface | Found in code | How 015 uses it |
|---|---|---|---|
| 1 | **RenderedMessage** | `rendering`: `RenderedMessage { text; sourceRef; kind: RenderableKind; voice?: VoiceMode; uncertaintyPreserved; limitationsPreserved; traceabilityPreserved; warnings }` | The successful-render input to a record; its fields are copied into the record. |
| 2 | **RenderOutcome** | `{ status:"rendered"; message } \| { status:"failed"; failures: readonly RenderingFailure[] }` | A record is built from either branch (rendered → displayable; failed → audit-only). |
| 3 | **RenderableKind** | `"support" \| "inquiry" \| "withholding"` (rendering-local) | The record's `terminalOutputKind`. |
| 4 | **RenderingFailure** | closed 12-value union (rendering-local) | A failed record's `failures`; also informs the `RenderReviewReason` alignment. |
| 5 | **VoiceMode** | `decision-support` (read-only type already imported by `rendering`) | `voice` at render time (present for support). |
| 6 | **Source ref** | `RenderedMessage.sourceRef` (= `RenderableDomainOutput.sourceCaseRef`) | The record's **`sourceDomainOutputRef`** — always preserved. |
| 7 | **Repository pattern** | Impl 010: `interface XRepository { save; findById; exists }`; `InMemoryXRepository` with `Map`, `structuredClone(e.toState())` on save, `reconstitute(structuredClone(state))` on load; `clear()` | Reused verbatim for `RenderedMessageRecordRepository` (+ a `findBySourceDomainOutputRef`). |
| 8 | **`toState()`/`reconstitute()`** | Impl 010: private ctor + explicit fields + `toState()` (frozen plain state) + `static reconstitute(state)` (re-validates) | The record gets the same additive surface. |
| 9 | **Mutation isolation** | Impl 010: deep-copy on save *and* load → two finds independent | The record repo proves the same. |
| 10 | **rendering exports** | `index.ts` re-exports `* from domain`; closed catalogs (`RENDERING_FAILURES`, `SAFE_STYLES`) exported | Records/reviews are **added additively** to `domain/index.ts` + a new `application/index.ts` surfaced from `rendering/index.ts`. |
| 11 | **Event catalog** | `event-recording`: closed 26-type catalog; **no** `RenderedMessageRecorded`/`RenderReviewed` | **Not extended** this slice (Decision 3); `rendering` does not import `event-recording`. |
| 12 | **Boundary guards** | `rendering` negative-capability test asserts rendering imports only `shared-kernel` + read-only `decision-support`; persistence-boundary test scans `*-repository`/`in-memory-*` files | The new repo files must import only **own module + `shared-kernel`**; `rendering` stays off `event-recording`/upstream modules. |

[DECISION] **No gap blocks the slice, and no new module is created** (so **no e2e `ALLOWED_MODULES` blocker** — `rendering` is already allowlisted). Names above are authoritative; Implementation 015 must not rename them.

---

## 3. Key Architectural Decisions

### Decision 1 — The boundary lives inside `rendering`
[DECISION] Records/review live in `rendering` (`rendering/domain/rendered-message-record.ts`, `render-review.ts`, `display-eligibility.ts`; `rendering/application/` for the port + adapter).
- **Why:** rendered messages are **presentation artifacts**; `rendering` owns presentation safety; the boundary is **downstream of `decision-support`**. Putting it in `decision-support` would mix review with domain voice/terminal-output authority; putting it in `event-recording` would treat presentation records as event records.
- **Consequence:** `rendering` owns rendered-message records + review status; **domain modules stay upstream and unaware**.
- **Risk:** persisted rendered text may *look* like source truth.
- **Mitigation:** explicit types/tests/docs make record authority impossible (no domain fields, no domain-write APIs); **no import from `rendering` into upstream modules**.
- **Reversal Point:** if a production review service emerges, it consumes the same record/port contract.

### Decision 2 — Repository port + in-memory adapter
[DECISION] Implement `RenderedMessageRecordRepository` (port) + `InMemoryRenderedMessageRecordRepository` (adapter), reusing the Impl 010 pattern (deep-copy on save/load; validated `reconstitute`).
- **Why:** this slice is explicitly about persistence/auditability; prior slices established the port + in-memory pattern; no production DB is needed.
- **Consequence:** saved records are retrievable; mutation-isolation and append-only review are testable.
- **Risk/Reversal:** a real backend later implements the same port; the in-memory one remains the test double. **No DB/ORM/schema/migration/infrastructure.**

### Decision 3 — Event records deferred
[DECISION] **No** `RenderedMessageRecorded`/`RenderReviewed` event records in Impl 015; **`rendering` does not import `event-recording`**.
- **Why:** the event catalog is closed; widening the event surface isn't needed to prove record/review persistence; events are occurrence history, not commands.
- **Consequence:** rendered-record events remain future work (ref-only/inert if ever).
- **Risk:** none material. **Reversal Point:** a later spec adds ref-only `RenderedMessageRecorded`/`RenderReviewed` to the catalog, composed in a neutral harness.

### Decision 4 — Review is append-only inside the record
[DECISION] A review decision is **appended** to the record's review history; it **never silently overwrites** prior review state. **Current review status is derived** from the latest entry.
- **Why:** auditability is the purpose; presentation review must stay inspectable over time.
- **Consequence:** the record is **immutable-by-operation** (`appendReview` returns a new record); history grows, nothing is edited.

### Decision 5 — Display eligibility is derived, not stored authority
[DECISION] `DisplayEligibility` is **derived** from: `renderingStatus === "rendered"` · latest review decision `approved-for-display` · not superseded · validation/preservation flags intact · source ref present. It is **not** domain approval, **not** delivery, **not** recommendation creation.
- **Why:** eligibility must follow from the audited facts, never be set as a standalone authority.
- **Consequence:** a function `displayEligibilityOf(record)` returns `{ eligible, reasons, recordRef, currentReviewStatus }`.

### Decision 6 — One record type, two rendering statuses (no separate attempt aggregate)
[DECISION] `RenderedMessageRecord` carries `renderingStatus: "rendered" | "failed"`; a **failed** attempt is the same type with `failures` set, **no displayable text**, and **never display-eligible**. No separate `RenderingAttemptRecord` aggregate.
- **Why:** one type keeps the audit log uniform; a failed attempt is just a non-displayable record.
- **Reversal Point:** split only if failed attempts grow their own lifecycle.

---

## 4. Proposed Layout

[DECISION]
```text
src/modules/rendering/
  domain/
    ids.ts                        # RenderedMessageRecordId + RenderReviewId (branded) — additive
    rendered-message-record.ts    # RenderedMessageRecord (+ State) + recordRenderedMessage/recordFailedAttempt
    render-review.ts              # RenderReview + RenderReviewDecision/Reason (closed) + renderReview()
    display-eligibility.ts        # DisplayEligibility + displayEligibilityOf(record)
    index.ts                      # (additive re-exports)
  application/
    rendered-message-record-repository.ts            # port
    in-memory-rendered-message-record-repository.ts  # adapter
    index.ts
  tests/
    rendered-message-record.test.ts
    render-review.test.ts
    rendered-message-record-persistence.test.ts
    rendered-message-review-negative-capability.test.ts
```

[DECISION] Update `rendering/domain/index.ts` and `rendering/index.ts` **additively** (surface the new types + the application port/adapter). **Must not create:** `src/modules/{rendered-message,review,delivery,llm,provider}/`, `src/{api,ui,infrastructure}/`.

[FACT] TS-strict house rules: no constructor parameter properties (private ctor + explicit fields + props object); `import type` for `VoiceMode`; `.ts` extensions; `Object.freeze`; conditional spreads for `exactOptionalPropertyTypes`; no `Date.now()` (timestamps passed in).

---

## 5. Types (TS-strict shapes)

### 5.1 Ids (`domain/ids.ts`)
```ts
declare const renderedMessageRecordIdBrand: unique symbol;
export type RenderedMessageRecordId = string & { readonly [renderedMessageRecordIdBrand]: true };
export function renderedMessageRecordId(value: string): RenderedMessageRecordId; // non-empty
export function newRenderedMessageRecordId(): RenderedMessageRecordId; // crypto.randomUUID()

declare const renderReviewIdBrand: unique symbol;
export type RenderReviewId = string & { readonly [renderReviewIdBrand]: true };
export function renderReviewId(value: string): RenderReviewId;
export function newRenderReviewId(): RenderReviewId;
```

### 5.2 Review (`domain/render-review.ts`)
```ts
export type RenderReviewDecision =
  | "approved-for-display" | "rejected-for-display" | "needs-revision" | "not-reviewed" | "superseded";
export const RENDER_REVIEW_DECISIONS: readonly RenderReviewDecision[] = [/* …5… */];

export type RenderReviewReason =
  | "faithful-to-domain-output" | "voice-escalation" | "uncertainty-hidden" | "limitation-hidden"
  | "invented-fact" | "traceability-overstated" | "style-unsafe" | "tone-unsafe"
  | "stale-source-visible" | "manual-review-required" | "superseded-by-new-render";
export const RENDER_REVIEW_REASONS: readonly RenderReviewReason[] = [/* …11… */];

export type ReviewerKind = "system" | "human" | "test";

export interface RenderReview {
  readonly id: RenderReviewId;
  readonly recordRef: RenderedMessageRecordId;
  readonly decision: RenderReviewDecision;
  readonly reasons: readonly RenderReviewReason[];
  readonly reviewedAt: Timestamp;
  readonly reviewerKind: ReviewerKind;
  readonly notes?: string; // explicit single string; never an arbitrary bag
}

export function renderReview(input: RenderReview): RenderReview; // validate closed decision/reasons; freeze
```
[DECISION] `not-reviewed` is **the initial derived status**, not an appended decision (Decision 4 clarification): the review history may be empty; `currentReviewStatus` is `not-reviewed` until a real review is appended. `renderReview` rejects `"not-reviewed"` as an *appended* decision.

### 5.3 Record (`domain/rendered-message-record.ts`)
```ts
export interface RenderedMessageRecordState {
  readonly id: RenderedMessageRecordId;
  readonly sourceDomainOutputRef: string;
  readonly terminalOutputKind: RenderableKind;
  readonly voice?: VoiceMode;
  readonly renderingStatus: "rendered" | "failed";
  readonly text?: string;                       // present iff rendered
  readonly preserved?: {                        // present iff rendered
    readonly uncertaintyPreserved: boolean;
    readonly limitationsPreserved: boolean;
    readonly traceabilityPreserved: boolean;
  };
  readonly warnings: readonly string[];
  readonly failures?: readonly RenderingFailure[]; // present iff failed
  readonly rendererKind: string;                // e.g. "fake"
  readonly createdAt: Timestamp;
  readonly revisedFrom?: RenderedMessageRecordId;
  readonly supersededBy?: RenderedMessageRecordId;
  readonly reviews: readonly RenderReview[];     // append-only history
}

export class RenderedMessageRecord {
  // explicit readonly fields; private constructor; Object.freeze(this)
  static fromRenderedMessage(input: {
    readonly id: RenderedMessageRecordId;
    readonly message: RenderedMessage;           // a successful render
    readonly rendererKind: string;
    readonly createdAt: Timestamp;
    readonly revisedFrom?: RenderedMessageRecordId;
  }): RenderedMessageRecord;
  static fromFailedOutcome(input: {
    readonly id: RenderedMessageRecordId;
    readonly sourceDomainOutputRef: string;
    readonly terminalOutputKind: RenderableKind;
    readonly voice?: VoiceMode;
    readonly failures: readonly RenderingFailure[];
    readonly rendererKind: string;
    readonly createdAt: Timestamp;
  }): RenderedMessageRecord;

  appendReview(review: RenderReview): RenderedMessageRecord; // immutable-by-operation; validates
  markSupersededBy(id: RenderedMessageRecordId): RenderedMessageRecord; // sets supersededBy + appends a `superseded` review
  get reviews(): readonly RenderReview[];
  currentReviewStatus(): RenderReviewDecision; // latest review decision, else "not-reviewed"; "superseded" if supersededBy set

  toState(): RenderedMessageRecordState;
  static reconstitute(state: RenderedMessageRecordState): RenderedMessageRecord; // re-validate (§7)
}
```

### 5.4 Display eligibility (`domain/display-eligibility.ts`)
```ts
export interface DisplayEligibility {
  readonly eligible: boolean;
  readonly reasons: readonly string[];           // why eligible / why not
  readonly recordRef: RenderedMessageRecordId;
  readonly currentReviewStatus: RenderReviewDecision;
}
export function displayEligibilityOf(record: RenderedMessageRecord): DisplayEligibility;
```
[DECISION] `eligible === true` **iff** `renderingStatus === "rendered"` AND `currentReviewStatus === "approved-for-display"` AND `supersededBy === undefined` AND `sourceDomainOutputRef` present AND `preserved` flags all true. Otherwise `eligible === false` with reasons. **Never** triggers delivery.

---

## 6. Construction & Operation Rules

[DECISION]
- **From a successful `RenderedMessage`** (`fromRenderedMessage`): preserve `text`, `sourceRef → sourceDomainOutputRef`, `kind → terminalOutputKind`, `voice`, preservation flags, `warnings`; `renderingStatus = "rendered"`; `reviews = []` (→ `currentReviewStatus = "not-reviewed"`); **not display-eligible** until approved.
- **From a failed `RenderOutcome`** (`fromFailedOutcome`): record `failures`; **no `text`**; `renderingStatus = "failed"`; **never display-eligible** (and `appendReview("approved-for-display")` on a failed record is **rejected**).
- **Append review:** creates a new review entry; **does not** mutate the source domain output / `VoiceMode` / `SupportQuality` / traceability / limitations; **may** change derived eligibility.
- **Revision:** a **new** record (`fromRenderedMessage` with `revisedFrom = oldId`); the old record stays auditable; **no silent overwrite**.
- **Supersession:** `oldRecord.markSupersededBy(newId)` sets `supersededBy` + appends a `{ decision:"superseded", reasons:["superseded-by-new-render"] }` review — the old record stays immutable/auditable and is no longer eligible.

---

## 7. Persistence & Reconstitution Rules

[DECISION] Port (`application/rendered-message-record-repository.ts`):
```ts
export interface RenderedMessageRecordRepository {
  save(record: RenderedMessageRecord): void;
  findById(id: RenderedMessageRecordId): RenderedMessageRecord | undefined;
  exists(id: RenderedMessageRecordId): boolean;
  findBySourceDomainOutputRef(ref: string): readonly RenderedMessageRecord[];
}
```
[DECISION] In-memory adapter: `Map<string, RenderedMessageRecordState>`; `save` stores `structuredClone(record.toState())`; reads `reconstitute(structuredClone(state))` (deep-copy in *and* out → **mutation isolation**); `findBySourceDomainOutputRef` filters reconstituted records; `clear()` for tests. **No DB/schema/ORM/migration/infrastructure; no delivery side effect; no event append.**

[DECISION] `reconstitute` **re-validates**: source ref present; `terminalOutputKind` ∈ `RenderableKind`; `renderingStatus` ∈ {rendered, failed}; rendered ⇒ `text` + `preserved` present; failed ⇒ `failures` non-empty + no `text`; every review has a closed `decision`/`reasons`; **a failed record carries no `approved-for-display` review**; `supersededBy`/`revisedFrom` are not self-referential; `voice` present only when meaningful. Invalid state **throws**.

---

## 8. Event Recording Rule

[DECISION] **No event records in Impl 015.** `rendering` does **not** import `event-recording`; **no** `RenderedMessageRecorded`/`RenderReviewed` catalog entry; **no** event-as-command. Future event recording, if specified, is ref-only/inert.

---

## 9. Negative Capability

[DECISION] Structurally impossible / test-failing: a record becomes `Evidence`/`Observation`/`Understanding`/`AthleteDecision`/`DecisionSupport`; review approval changes `VoiceMode`/creates a `Recommendation`/strengthens confidence/repairs traceability/removes freshness limitations/updates `SupportQuality`; review rejection invalidates the domain output; revision overwrites the old record silently; a failed render becomes display-eligible; display eligibility triggers delivery; `save` appends an event; `rendering` imports `event-recording`/upstream modules; a real provider/API/UI/delivery appears; prompt templates as production code appear. Enforced by TS-strict types (no domain fields/write paths; closed unions) + §10 tests.

---

## 10. Validation Strategy (tests before implementation)

[ASSUMPTION] Negative tests are **defining**.

1. a validated rendered message can be recorded.
2. source domain output ref preserved.
3. `VoiceMode` + terminal output kind preserved.
4. validation/preservation flags preserved.
5. initial record is `not-reviewed` and **not display-eligible**.
6. review approval makes it display-eligible **without mutating the source output**.
7. review approval **does not change `VoiceMode`**.
8. review approval **does not repair traceability/freshness/limitations**.
9. review rejection **does not invalidate** the domain output.
10. a failed attempt **cannot be display-eligible** (and approving it is rejected).
11. `needs-revision` does not overwrite text.
12. supersession preserves the old record and links the new one.
13. revision links (`revisedFrom`) are append-only.
14. repository port persists and rehydrates a record.
15. repository **mutation isolation** (two finds independent).
16. invalid state rejected on `reconstitute`.
17. a record is **not usable as** `Evidence`/`Observation`/`Understanding`/`AthleteDecision`/`DecisionSupport` (no such fields/handles).
18. **`rendering` does not import `event-recording`** (structural).
19. **no UI/API/provider/delivery/DB/schema** file or token (structural); **no real LLM provider**.
20. **all 349 Impl 001–014 tests continue to pass.**

[DECISION] Tests 18–19 are structural guards (`node:fs`); the repo files are named `*-repository`/`in-memory-*` and must import only **own module + `shared-kernel`** (persistence-boundary guard already enforces this).

---

## 11. Boundary Rules

[DECISION]
- `rendering` may import **only** `shared-kernel` + read-only `decision-support` types.
- `rendering` **must not import** `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`.
- **No existing domain module imports `rendering`.**
- **No** provider/API/UI/infrastructure/delivery layer; **no** rendered-message event records this slice.
- The new repo files import only `rendering` domain + `shared-kernel` (persistence-boundary compliant).

---

## 12. Relationship To Existing Architecture

[FACT] Builds on, without altering: **Impl 014** (rendering creates validated presentation artifacts; this slice records/reviews them), **Impl 005** (`decision-support` owns terminal output + voice), **Impl 010** (repository port + in-memory + `toState`/`reconstitute` pattern reused), **Impl 011** (event records deferred; none added), **Impl 012** (reprojection not triggered by review), **Impl 013** (rendered text is not source material unless reported back by the athlete). The picture: **rendering generates · the record audits · review judges display-safety · the domain stays source of truth · display eligibility is not delivery · persistence is auditability, not authority.**

---

## 13. Open Questions (do not block implementation)

[QUESTION] whether rendered events are added later; whether failed attempts become a separate aggregate later; whether review requires a human actor in production; how a UI displays review status; how delivery works; retention/deletion policy; localization revision behavior; a real provider behind the validator; whether review notes need stricter structure.

[ASSUMPTION] None block Implementation 015: the record/review/eligibility contract is fully testable in-memory.

---

## 14. Implementation Task Preview

**Implementation 015 — Add rendered-message record and review persistence.**

[DECISION] Scope: create the `rendering/domain` record/review/eligibility types + the `rendering/application` port + in-memory adapter per §4–§7, the tests (§10), and additive index exports. **Additive only** — no existing module behavior changes; **no new top-level module** (so no e2e allowlist blocker expected).

**Acceptance criteria:**
- `RenderedMessageRecord.fromRenderedMessage(...)` / `fromFailedOutcome(...)` build records preserving source ref, terminal-output kind, voice, text/flags (or failures), `createdAt`;
- review is **append-only** (`appendReview` returns a new record; history retained); `currentReviewStatus` derives from the latest entry (`not-reviewed` initially);
- `displayEligibilityOf` is **derived** (rendered + approved + not superseded + flags intact); a **failed** record is never eligible and cannot be approved;
- **approval mutates no domain output** (voice/traceability/freshness/`SupportQuality` unchanged); **rejection invalidates nothing**; **revision/supersession preserve** the old record;
- the **repository port + in-memory adapter** persist via `structuredClone(toState())` ↔ `reconstitute(structuredClone(state))`, prove **mutation isolation**, and **reject invalid state**;
- `rendering` imports no `event-recording`/upstream module; no domain module imports `rendering`; no provider/UI/API/delivery/DB; no event records;
- **all 349 existing tests stay green**; the new tests pass.

**The implementation must explicitly create none of:** real LLM provider · prompt templates · UI/API · delivery · event records · production DB · voice selection · domain mutation · an `event-recording` import from `rendering`.

---

## 15. Technical Constraints

[FACT] TypeScript strict; Node native test runner (`node:test` + `node:assert/strict`); **no** external test framework/framework/DB/event-bus/LLM/external call. **No constructor parameter properties.** `import type` where appropriate. Explicit fields; `Object.freeze`. **No** arbitrary payload bags. **No** raw field-bag rehydration without validation. Repository preserves **mutation isolation**. **No** `Date.now()` (timestamps passed in).

---

## 16. Success Criterion

> After this tech spec, Implementation 015 can be built **without** deciding provider, prompt, UI, API, delivery, event recording, or domain questions in code.

[ASSUMPTION] Answerable: the plan fixes every shape (`RenderedMessageRecord` + state, `RenderReview` + closed decision/reason catalogs, `DisplayEligibility`, ids), the boundary location (inside `rendering`), the append-only review model, the derived eligibility, the repository contract (+ mutation isolation + validated reconstitution), the deferred events, the boundary, and the test contract — all satisfiable **in-memory**, modifying no module behavior. The future implementation answers Spec 015's question: **"Can Aurora persist and review rendered messages without letting generated text become domain truth or review approval modify reasoning?"** — yes: an auditable, append-only record + a display-safety review that never touch the domain.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the technical plan for the rendered-message review/persistence boundary. It defines an append-only record + a display-safety review inside `rendering`, behind a repository port + in-memory adapter, with derived display eligibility; it adds no events, no provider, no UI/API, no delivery, and no DB. Persisting rendered text does not make it authority; approving a render does not strengthen the domain; reviewing presentation is not reviewing reasoning.*

*Inputs: [Spec 015](./015-rendered-message-review-persistence.md) · [Spec 014](./014-llm-rendering-boundary.md) · [Spec 014A](./014-llm-rendering-boundary-tech.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 010](./010-persistence-ports-in-memory-repositories.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 012](./012-reprojection-harness.md) · [Spec 013](./013-manual-input-adapter.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
