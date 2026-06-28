# Tech Spec 016A — Delivery Boundary — Implementation Plan

> The TS-strict plan for Spec 016: a **new minimal downstream module `delivery`** that exposes a *display-eligible* `RenderedMessageRecord` to a **test-only sink**, behind a **`DeliveryRecordRepository` port + in-memory adapter**, reusing rendering's `displayEligibilityOf(record)` as the gate — proving exposure semantics and auditability **without** a real provider/channel, UI/API, scheduler, event bus, events, production DB, or any domain mutation. Delivery is downstream exposure; success is not evidence; failure is not domain invalidation; display eligibility is not delivery.
>
> Technical Specification. **No code in this slice.** Implementation begins only from the approved plan as Implementation 016.

| Field | Value |
|---|---|
| **Status** | Technical Spec · *Accepted pending review* |
| **Phase** | Technical Specification (no code; no real provider/channel; no UI/API; no scheduler/event-bus; no events) |
| **Implements** | [Spec 016](./016-delivery-boundary.md) |
| **Builds on** | Spec/Impl 015 (rendered-message record/review + `displayEligibilityOf`) · 014 (rendering) · 005 (voice/terminal output) · 010 (repository pattern) · 011 (event records — deferred here) · 012 (reprojection) · 013 (manual input) |
| **Produces (plan for)** | new `src/modules/delivery/` (`domain/` request·target·outcome·failure·eligibility-check·sink·record + `application/` port·in-memory adapter·service) + tests + a documented test-only `ALLOWED_MODULES` allowlist fix |
| **Explicitly excludes** | real provider/channel (email/SMS/push/WhatsApp), UI/API, authentication, consent/preferences, scheduler/retry, queues/background jobs, an event bus, **delivery event records**, event-catalog expansion, a production DB/schema/ORM/migration, analytics, read receipts, prompt templates, a real LLM provider |

[ASSUMPTION] This is **Technical Specification phase**, not Implementation. It fixes the TS-strict shapes, the boundary location (a new `delivery` module), the eligibility-reuse rule, the test-sink contract, the repository contract, the closed catalogs, the state transitions, and the test contract so Implementation 016 contains **no open design or domain decisions** — only typing and wiring.

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

[FACT] *How can Aurora implement a delivery boundary that exposes only display-eligible rendered messages through a test-only abstraction without letting delivery become domain authority, evidence, reasoning, provider integration, UI, or API?*

[FACT] The answer in code: a new **`delivery` module**, **downstream of `rendering`**, that resolves a `RenderedMessageRecord`, **reuses `displayEligibilityOf(record)`** to gate exposure, calls a **deterministic test-only `DeliverySink`** only when eligible + the target is supported, and persists an auditable **`DeliveryRecord`** behind a **repository port + in-memory adapter** (the Impl 010/015 pattern). It imports **only** `shared-kernel` + **read-only `rendering`** types/functions; it imports **no** other module (no `event-recording`), mutates **no** domain aggregate, appends **no** event, and triggers **no** reasoning/reprojection/retry.

---

## 2. Surface Gap Analysis (read from current code)

[FACT] Verified against the repository so the plan reuses real shapes and invents nothing.

| # | Surface | Found in code | How 016 uses it |
|---|---|---|---|
| 1 | **RenderedMessageRecord** | `rendering/domain/rendered-message-record.ts`: readonly fields `id`, `sourceDomainOutputRef`, `terminalOutputKind`, `voice?`, `renderingStatus: "rendered"\|"failed"`, `text?`, `preserved?`, `warnings`, `failures?`, `rendererKind`, `createdAt`, `revisedFrom?`, `supersededBy?`, `reviews`; methods `fromRenderedMessage`/`fromFailedOutcome`/`appendReview`/`markSupersededBy`/`currentReviewStatus`/`toState`/`reconstitute` | The exposure target. Delivery **reads only** (`id`, `sourceDomainOutputRef`, `renderingStatus`, `text`, via `displayEligibilityOf`). It never calls a mutator. |
| 2 | **RenderedMessageRecordId** | `rendering/domain/ids.ts`: branded `string`; `renderedMessageRecordId(value)` (non-empty smart ctor) + `newRenderedMessageRecordId()` | The `DeliveryRequest.renderedMessageRecordRef` type — re-exported through `rendering/index.ts`. |
| 3 | **DisplayEligibility** | `rendering/domain/display-eligibility.ts`: `{ eligible: boolean; reasons: readonly string[]; recordRef: RenderedMessageRecordId; currentReviewStatus: RenderReviewDecision }` | Carried verbatim inside `DeliveryEligibilityCheck` (no re-derivation). |
| 4 | **displayEligibilityOf(record)** | Same file. `eligible` iff **no** reasons; reasons pushed: `"not-rendered"` (status≠rendered), `` `review-status:${status}` `` (status≠approved-for-display), `"superseded"` (supersededBy set), `"missing-source-ref"`, `"validation-not-preserved"` (any preservation flag false/undefined) | The **single source of eligibility**. Delivery calls it and **maps its specific reasons** to `DeliveryFailureReason` (§5.5) — never collapses them to a generic failure. |
| 5 | **RenderReviewDecision** | `rendering/domain/render-review.ts`: `approved-for-display` · `rejected-for-display` · `needs-revision` · `not-reviewed` · `superseded` | Read via `DisplayEligibility.currentReviewStatus`; drives the `review-not-approved`/`superseded-record` mapping. |
| 6 | **Repository conventions** | Impl 010/015: `interface XRepository { save; findById; exists; <finder> }`; `InMemoryX` with `Map<string, XState>`, `save` stores `structuredClone(record.toState())`, reads `reconstitute(structuredClone(state))`, plus `clear()` | Reused verbatim for `DeliveryRecordRepository` (+ `findByRenderedMessageRecordRef`). |
| 7 | **toState()/reconstitute()** | Impl 010/015: private ctor + explicit readonly fields + props object; `toState()` returns frozen plain state; `static reconstitute(state)` re-validates and **throws** on invalid | `DeliveryRecord` gets the same shape. |
| 8 | **Mutation isolation** | Impl 010/015: deep-copy on save *and* load → two finds independent | `DeliveryRecord` repo proves the same. |
| 9 | **rendering exports** | `rendering/index.ts` = `export * from "./domain/index.ts"` + `export * from "./application/index.ts"` → `RenderedMessageRecord`, `RenderedMessageRecordId`, `renderedMessageRecordId`, `DisplayEligibility`, `displayEligibilityOf` are all on the public surface | `delivery` imports these from `../rendering/index.ts` (types via `import type`; `displayEligibilityOf` as a value). |
| 10 | **shared-kernel time** | `shared-kernel/time.ts`: `Timestamp { epochMillis; iso }`, `timestamp(value)`. **No `Instant` type exists** | **Gap:** Spec 016 / the prompt say "Instant"; the real type is **`Timestamp`**. Implementation 016 uses **`Timestamp`** everywhere; timestamps are passed in (no `Date.now()`). |
| 11 | **Event catalog** | `event-recording`: closed catalog; **no** `DeliveryRequested`/`DeliveryAttempted`/`DeliveryCompleted` | **Not extended** this slice (Decision 4); `delivery` does **not** import `event-recording`. |
| 12 | **e2e module allowlist** | `__tests__/end-to-end-responsible-reflection.test.ts`: `ALLOWED_MODULES = {observation, reasoning, understanding, decision-support, athlete, event-recording, rendering}`; AC20 rejects any other top-level module dir | **Gap/blocker:** adding `delivery` trips AC20 → Impl 016 adds `"delivery"` to that set — a **documented test-only fix** (§11), no production module modified. |
| 13 | **Persistence-boundary guard** | `persistence-boundary.test.ts`: files named `*-repository`/`in-memory-*` must import only **own module + shared-kernel** (+ forbidden-tech token scan) | `delivery-record-repository.ts` / `in-memory-delivery-record-repository.ts` import only `delivery` domain + `shared-kernel`. The **`rendering` import lives only in `delivery-service.ts`** (not a repo-named file), so the guard is **not** tripped. |

[DECISION] **One gap is a known blocker** (the e2e `ALLOWED_MODULES` set, item 12) — handled exactly as `athlete`/`event-recording`/`rendering` were: a one-line, test-only allowlist addition. The `Instant`→`Timestamp` naming gap (item 10) is resolved in favor of the real `Timestamp`. **No other gap blocks the slice; no existing production module is modified.** Names above are authoritative; Implementation 016 must not rename them.

---

## 3. Key Architectural Decisions

### Decision 1 — A new minimal downstream module `delivery`
[DECISION] Delivery lives in **`src/modules/delivery/`**, separate from `rendering`.
- **Why:** delivery is **exposure**, not rendering. `rendering` owns phrasing, validation, rendered-message records, review, and **display eligibility**; `delivery` owns **attempts to expose an already-eligible message**. Putting delivery inside `rendering` risks channel/provider concerns creeping into rendering; putting it inside `decision-support` would collapse exposure into domain authority.
- **Consequence:** `delivery` imports **read-only** `rendering` types/functions (`RenderedMessageRecord`, `RenderedMessageRecordId`, `DisplayEligibility`, `displayEligibilityOf`) + `shared-kernel`; it **must not** import `decision-support`/`observation`/`reasoning`/`understanding`/`athlete`/`event-recording`; **no existing module imports `delivery`**.
- **Risk:** a new module may *look* like production delivery infrastructure.
- **Mitigation:** no real provider/channel; no UI/API; no scheduler/event bus; **test-only sink** abstraction only; explicit structural guards (§9–§11).
- **Reversal Point:** future provider/channel adapters may be added **behind delivery ports**, but only after a separate spec.

### Decision 2 — Test-only sink, no real channel
[DECISION] Implementation 016 supports **only** an abstract/test sink: **no** email/SMS/WhatsApp/push, **no** web UI, **no** API, **no** external calls.
- **Why:** this slice proves **eligibility gating and delivery semantics**, not channel integration. Real channels require auth, consent, retry, provider errors, and delivery-lifecycle policy — all out of scope.
- **Consequence:** the `DeliverySink` is a deterministic in-process interface (§5.6); the default adapter records the exposure to an in-memory list and returns a configured deterministic result.
- **Reversal Point:** a real provider/channel later implements the same `DeliverySink` interface behind the same delivery service.

### Decision 3 — Repository port + in-memory adapter
[DECISION] Implement `DeliveryRecordRepository` (port) + `InMemoryDeliveryRecordRepository` (adapter), reusing the Impl 010/015 pattern (deep-copy on save/load; validated `reconstitute`).
- **Why:** delivery attempts/outcomes need **auditability**; prior persistence slices established the port + in-memory pattern; no production DB is needed.
- **Consequence:** delivery records are retrievable; mutation isolation is testable; **delivery is auditability, not authority**.
- **Risk/Reversal:** a real backend later implements the same port; the in-memory one remains the test double. **No DB/ORM/schema/migration/infrastructure.**

### Decision 4 — Event records deferred
[DECISION] **No** delivery event records in Impl 016; **no** event-catalog expansion; **`delivery` does not import `event-recording`**.
- **Why:** delivery is audited through its **own** record repository; the event catalog is closed; events are occurrence history, not commands; event records must never become retry/delivery triggers.
- **Consequence:** delivery events remain future work (ref-only/inert if ever).
- **Reversal Point:** a later spec adds ref-only `DeliveryAttempted`/`DeliveryOutcomeRecorded` to the catalog, composed in a neutral harness.

### Decision 5 — Eligibility check reuses rendering (no parallel rule set)
[DECISION] Delivery **calls `displayEligibilityOf(record)`** from `rendering` and **must not** re-derive display eligibility with its own rule set. The returned `DisplayEligibility` is **carried verbatim** inside the `DeliveryEligibilityCheck`; delivery only **maps** its specific reasons to `DeliveryFailureReason`.
- **Why:** rendering/review **owns** presentation safety; delivery is allowed to **verify, not reinterpret**. A second eligibility rule set would drift and could expose something rendering judged unsafe.
- **Consequence:** if rendering's eligibility rule changes, delivery follows automatically; there is exactly one definition of "display-eligible".

### Decision 6 — `provider-unavailable` excluded; a test-sink failure reason instead
[DECISION] The closed `DeliveryFailureReason` catalog for Impl 016 **excludes `provider-unavailable`** (no provider exists → it would be dead/untestable) and **adds `sink-unavailable`** for a deterministic test-sink failure. `provider-unavailable` is **reserved for a future provider slice**, not part of this closed union.
- **Why:** every value in a closed catalog should be reachable and testable in this slice; a configurable test sink makes `sink-unavailable` testable, whereas `provider-unavailable` could not be produced without a provider.
- **Reversal Point:** a provider slice extends the catalog with `provider-unavailable` (and any provider-specific reasons) additively.

---

## 4. Proposed Layout

[DECISION]
```text
src/modules/delivery/
  domain/
    ids.ts                      # DeliveryRequestId, DeliveryRecordId (branded) + smart ctors
    delivery-target.ts          # DeliveryTarget (closed) + DELIVERY_TARGETS + SUPPORTED/RESERVED + isSupportedTarget
    delivery-outcome.ts         # DeliveryOutcome (closed) + DELIVERY_OUTCOMES
    delivery-failure.ts         # DeliveryFailureReason (closed) + DELIVERY_FAILURE_REASONS
    delivery-request.ts         # DeliveryRequest + RequesterKind + deliveryRequest() smart ctor
    delivery-eligibility-check.ts # DeliveryEligibilityCheck + failureReasonFor(eligibility) mapping
    delivery-sink.ts            # DeliverySink interface + SinkResult + InMemoryTestSink (deterministic)
    delivery-record.ts          # DeliveryRecord (+ State) + toState/reconstitute
    index.ts
  application/
    delivery-record-repository.ts            # port
    in-memory-delivery-record-repository.ts  # adapter
    delivery-service.ts                      # requestDelivery(...) — imports read-only rendering here
    index.ts
  tests/
    delivery-boundary.test.ts
    delivery-record-persistence.test.ts
    delivery-negative-capability.test.ts
  index.ts
```
[DECISION] A neutral integration test that composes `rendering` + `delivery` lives at `src/modules/__tests__/delivery-rendering.test.ts` (cross-module seam; not inside either module).

[DECISION] **Must not create:** `src/api/`, `src/ui/`, `src/infrastructure/`, `src/modules/{provider,notification,channel,scheduler,event-bus,llm}/`.

[FACT] TS-strict house rules: no constructor parameter properties (private ctor + explicit fields + props object); `import type` for `rendering`/`shared-kernel` types; `.ts` extensions; `Object.freeze`; conditional spreads for `exactOptionalPropertyTypes`; no `Date.now()` (timestamps passed in); no arbitrary payload bags.

---

## 5. Types (TS-strict shapes)

### 5.1 Ids (`domain/ids.ts`)
```ts
declare const deliveryRequestIdBrand: unique symbol;
export type DeliveryRequestId = string & { readonly [deliveryRequestIdBrand]: true };
export function deliveryRequestId(value: string): DeliveryRequestId;     // non-empty
export function newDeliveryRequestId(): DeliveryRequestId;               // crypto.randomUUID()

declare const deliveryRecordIdBrand: unique symbol;
export type DeliveryRecordId = string & { readonly [deliveryRecordIdBrand]: true };
export function deliveryRecordId(value: string): DeliveryRecordId;
export function newDeliveryRecordId(): DeliveryRecordId;
```

### 5.2 Target (`domain/delivery-target.ts`)
```ts
export type DeliveryTarget =
  | "test-sink"                 // the only SUPPORTED target this slice
  | "manual-review-surface"     // RESERVED (future)
  | "future-ui"                 // RESERVED (future)
  | "future-notification-channel"; // RESERVED (future)
export const DELIVERY_TARGETS: readonly DeliveryTarget[] = [/* …4… */];
export const SUPPORTED_TARGETS: readonly DeliveryTarget[] = ["test-sink"];
export function isSupportedTarget(t: DeliveryTarget): boolean; // t === "test-sink"
```
[DECISION] A target is a **label for an exposure surface**, never a channel implementation. Only `test-sink` is supported in Impl 016; the reserved labels are **valid union members** (so `reconstitute` accepts a historical record) but yield `unsupported-channel` if requested. An **unknown** string is not a `DeliveryTarget` at all (rejected at the smart ctor / `reconstitute`).

### 5.3 Outcome (`domain/delivery-outcome.ts`)
```ts
export type DeliveryOutcome =
  | "accepted-for-delivery"   // RESERVED for a future two-phase flow (not produced by the single-shot path)
  | "blocked-not-eligible"
  | "delivered"
  | "failed"
  | "cancelled"
  | "not-attempted";
export const DELIVERY_OUTCOMES: readonly DeliveryOutcome[] = [/* …6… */];
```
[DECISION] Spec 016 vocabulary kept verbatim. The single-shot `requestDelivery` (§6) produces `not-attempted` (missing record), `blocked-not-eligible` (ineligible record **or** unsupported/unsafe target), `delivered`, `failed`, `cancelled`. **`accepted-for-delivery` is reserved** for a future request-then-attempt split; it is a valid catalog/`reconstitute` value but is **not produced** by Impl 016 (documented, not dead at the type level).

### 5.4 Failure reason (`domain/delivery-failure.ts`)
```ts
export type DeliveryFailureReason =
  | "rendered-message-not-found"
  | "not-display-eligible"
  | "superseded-record"
  | "failed-render-record"
  | "missing-source-ref"
  | "review-not-approved"
  | "unsupported-channel"
  | "unsafe-target"
  | "sink-unavailable"        // deterministic test-sink failure (replaces provider-unavailable this slice)
  | "delivery-cancelled";
export const DELIVERY_FAILURE_REASONS: readonly DeliveryFailureReason[] = [/* …10… */];
```
[FACT] **`provider-unavailable` is intentionally excluded** (Decision 6); reserved for a future provider slice.

### 5.5 Eligibility → failure mapping (`domain/delivery-eligibility-check.ts`)
```ts
export interface DeliveryEligibilityCheck {
  readonly renderedMessageRecordRef: RenderedMessageRecordId;
  readonly eligible: boolean;
  readonly eligibility: DisplayEligibility;   // carried verbatim from rendering (Decision 5)
  readonly reasons: readonly string[];        // = eligibility.reasons (nothing lost)
  readonly checkedAt: Timestamp;
}

// Maps a rendering eligibility reason to a specific DeliveryFailureReason (never a generic catch-all):
//   "superseded"                       -> "superseded-record"      (takes precedence)
//   "not-rendered"                     -> "failed-render-record"
//   "missing-source-ref"               -> "missing-source-ref"
//   "review-status:not-reviewed"       -> "review-not-approved"
//   "review-status:rejected-for-display" -> "review-not-approved"
//   "review-status:needs-revision"     -> "review-not-approved"
//   "review-status:superseded"         -> "superseded-record"
//   "validation-not-preserved"         -> "not-display-eligible"
export function primaryFailureReasonFor(eligibility: DisplayEligibility): DeliveryFailureReason | undefined;
```
[DECISION] `primaryFailureReasonFor` returns `undefined` when `eligibility.eligible === true`; otherwise the **most specific** reason (supersession first, then failed-render, then missing-source-ref, then review-not-approved, then not-display-eligible). The **full raw `eligibility.reasons`** are always retained on the record, so specificity is never lost (per the user's "do not silently map all to a generic failure" rule). [FACT] `displayEligibilityOf` pushes both `review-status:superseded` and `"superseded"` when superseded; the mapping resolves both to `superseded-record`. The check **does not** re-run rendering validation, repair review, decide domain truth, or mutate the record.

### 5.6 Sink (`domain/delivery-sink.ts`)
```ts
export type SinkResult =
  | { readonly status: "delivered" }
  | { readonly status: "failed"; readonly reason: "sink-unavailable" }
  | { readonly status: "cancelled" };

export interface DeliverySink {
  readonly kind: string; // e.g. "test-sink" — descriptive, not a channel
  deliver(input: {
    readonly recordRef: RenderedMessageRecordId;
    readonly target: DeliveryTarget;
    readonly text: string;        // the already-eligible rendered text (read-only)
  }): SinkResult;
}

// Deterministic, in-process, test-only. No external call, no retry, no scheduling.
export class InMemoryTestSink implements DeliverySink {
  readonly kind = "test-sink";
  constructor(opts?: { readonly behavior?: "deliver" | "fail" | "cancel" }); // default "deliver"
  deliver(input: ...): SinkResult;          // returns per configured behavior; records the exposure
  readonly delivered: ReadonlyArray<{ recordRef: RenderedMessageRecordId; target: DeliveryTarget }>;
}
```
[DECISION] `InMemoryTestSink` is the **only** sink in Impl 016. Its `behavior` is fixed at construction (deterministic; varied per test). It records each exposure in an in-memory list for assertions. It performs **no** external I/O. (This is the single allowed constructor-with-arg in the slice — a test double, not a domain aggregate — and it still declares an explicit field.)

### 5.7 Request (`domain/delivery-request.ts`)
```ts
export type RequesterKind = "system" | "human" | "test";

export interface DeliveryRequest {
  readonly id: DeliveryRequestId;
  readonly renderedMessageRecordRef: RenderedMessageRecordId;
  readonly target: DeliveryTarget;
  readonly requestedAt: Timestamp;
  readonly requesterKind: RequesterKind;
  readonly reason?: string;   // optional, single explicit string; never an arbitrary bag
}
export function deliveryRequest(input: DeliveryRequest): DeliveryRequest; // validate target ∈ catalog; freeze
```
[FACT] A `DeliveryRequest` carries **no** new domain claim, **no** voice override, **no** text-mutation instruction, **no** provider payload/secret, **no** prompt/channel injection field, **no** arbitrary metadata bag. It references *what already exists*; it cannot *alter* it.

### 5.8 Record (`domain/delivery-record.ts`)
```ts
export interface DeliveryRecordState {
  readonly id: DeliveryRecordId;
  readonly renderedMessageRecordRef: RenderedMessageRecordId;
  readonly target: DeliveryTarget;
  readonly request: DeliveryRequest;
  readonly eligibility: DeliveryEligibilityCheck;
  readonly outcome: DeliveryOutcome;
  readonly failureReason?: DeliveryFailureReason; // present iff outcome ∈ {blocked-not-eligible, failed, cancelled, not-attempted}
  readonly sinkKind?: string;                      // present iff the sink was called
  readonly requestedAt: Timestamp;
  readonly attemptedAt?: Timestamp;                // present iff the sink was called
  readonly completedAt?: Timestamp;                // present iff outcome === "delivered"
}

export class DeliveryRecord {
  // explicit readonly fields; private ctor; Object.freeze(this)
  static create(state: DeliveryRecordState): DeliveryRecord; // validates (§7); the only builder
  toState(): DeliveryRecordState;
  static reconstitute(state: DeliveryRecordState): DeliveryRecord; // re-validate (§7)
}
```
[FACT] A `DeliveryRecord` carries **no** `Evidence`/`Observation`/`Understanding`/`AthleteDecision` field, **no** `DecisionSupport` mutation handle, **no** channel secret, **no** provider payload, **no** arbitrary metadata bag — it is **auditability, not authority**, exactly like the Impl 015 record.

---

## 6. Delivery Behavior (`application/delivery-service.ts`)

[DECISION] One synchronous, deterministic entry point:
```ts
export function requestDelivery(input: {
  readonly request: DeliveryRequest;
  readonly renderedMessageRecord: RenderedMessageRecord | undefined; // resolved by the caller
  readonly sink: DeliverySink;
  readonly now: Timestamp;                       // passed in (no Date.now())
  readonly deliveryRecordRepository: DeliveryRecordRepository;
  readonly recordId?: DeliveryRecordId;          // optional; else newDeliveryRecordId()
}): DeliveryRecord;
```
[DECISION] `delivery-service.ts` is the **only** file that imports `rendering` (read-only: `displayEligibilityOf`, the `RenderedMessageRecord`/`DisplayEligibility`/`RenderedMessageRecordId` types) — keeping the repo-named files import-clean for the persistence guard (§2 item 13).

[DECISION] Algorithm (each branch persists exactly one `DeliveryRecord` and returns it):
1. **Record missing** (`renderedMessageRecord === undefined`) → outcome `not-attempted`, `failureReason: "rendered-message-not-found"`; **sink not called**; no `attemptedAt`.
2. Else compute `eligibility = displayEligibilityOf(record)` and build the `DeliveryEligibilityCheck` (`checkedAt = now`, carrying the verbatim `DisplayEligibility`).
3. **Not eligible** → outcome `blocked-not-eligible`, `failureReason = primaryFailureReasonFor(eligibility)`; **sink not called**; no `attemptedAt`.
4. **Eligible but target unsupported/unsafe** → outcome `blocked-not-eligible`, `failureReason: "unsupported-channel"` (unknown-but-reserved target) or `"unsafe-target"` (a target deemed unsafe by policy); **sink not called**.
5. **Eligible + supported target** → call `sink.deliver({ recordRef, target, text })` with `attemptedAt = now`, `sinkKind = sink.kind`:
   - `delivered` → outcome `delivered`, `completedAt = now`, no `failureReason`;
   - `failed` → outcome `failed`, `failureReason: "sink-unavailable"`, no `completedAt`;
   - `cancelled` → outcome `cancelled`, `failureReason: "delivery-cancelled"`, no `completedAt`.
6. Persist the `DeliveryRecord` (`deliveryRecordRepository.save(...)`) and return it.
7. **Mutate no upstream record/domain aggregate**; **create no event record**; **trigger no retry/reprojection/reasoning.**

[FACT] The service **never** calls a `RenderedMessageRecord` mutator (`appendReview`/`markSupersededBy`) and never touches review or eligibility — delivery is downstream-only.

---

## 7. Persistence & Reconstitution Rules

[DECISION] Port (`application/delivery-record-repository.ts`):
```ts
export interface DeliveryRecordRepository {
  save(record: DeliveryRecord): void;
  findById(id: DeliveryRecordId): DeliveryRecord | undefined;
  exists(id: DeliveryRecordId): boolean;
  findByRenderedMessageRecordRef(ref: RenderedMessageRecordId): readonly DeliveryRecord[];
}
```
[DECISION] In-memory adapter: `Map<string, DeliveryRecordState>`; `save` stores `structuredClone(record.toState())`; reads `reconstitute(structuredClone(state))` (deep-copy in *and* out → **mutation isolation**); `findByRenderedMessageRecordRef` filters reconstituted records; `clear()` for tests. The repo-named files import only `delivery` domain + `shared-kernel`. **No DB/schema/ORM/migration/infrastructure; no event append; no retry/scheduler side effect.**

[DECISION] `create`/`reconstitute` **re-validate** (throwing on violation):
- `renderedMessageRecordRef` present (non-empty);
- `target` ∈ `DELIVERY_TARGETS`;
- `outcome` ∈ `DELIVERY_OUTCOMES`;
- `failureReason` (if present) ∈ `DELIVERY_FAILURE_REASONS`;
- `failureReason` **required** when `outcome ∈ {blocked-not-eligible, failed, cancelled, not-attempted}`; **forbidden** when `outcome === "delivered"` (or `accepted-for-delivery`);
- `cancelled` ⇒ `failureReason === "delivery-cancelled"`; `failed` ⇒ `failureReason === "sink-unavailable"`;
- `outcome === "delivered"` ⇒ `attemptedAt` **and** `completedAt` present;
- `outcome === "failed"` ⇒ `attemptedAt` present, `completedAt` absent;
- `outcome ∈ {blocked-not-eligible, not-attempted}` ⇒ `attemptedAt` **absent** (sink not called) and never claims `delivered`;
- `sinkKind` present **iff** `attemptedAt` present;
- valid `Timestamp`s (`epochMillis`/`iso`); `eligibility` well-formed (its `eligible` consistent with empty/non-empty `reasons`);
- **no unknown** target/outcome/reason/status.

---

## 8. Event Recording Rule

[DECISION] **No event records in Impl 016.** `delivery` does **not** import `event-recording`; **no** `DeliveryRequested`/`DeliveryAttempted`/`DeliveryCompleted` catalog entry; **no** event-as-command. Future event recording, if specified, is ref-only/inert and added additively to the catalog under a later spec.

---

## 9. Negative Capability

[DECISION] Structurally impossible / test-failing in Impl 016: delivery of a **non-display-eligible / not-reviewed / rejected / superseded / failed-render / missing-source-ref** record (sink never called — §6 steps 1–4); delivery changing `VoiceMode`/creating a `Recommendation`/validating `SupportQuality`/repairing traceability/removing limitations/invalidating the domain output; delivery creating `Evidence`/`Observation`/updating `Understanding`/creating `AthleteDecision`; delivery triggering reprojection/a retry scheduler; delivery using event records as commands; delivery calling a **real provider/channel**; delivery creating UI/API; delivery treating success/read-receipt as an athlete outcome; **`delivery` importing `event-recording`**; **upstream modules importing `delivery`**. Enforced by TS-strict types (no domain fields/write paths; closed unions; read-only `rendering` import; deterministic in-process sink) + §10 tests.

---

## 10. Validation Strategy (tests before implementation)

[ASSUMPTION] Negative tests are **defining**.

1. a display-eligible rendered message is **delivered** to the test sink (outcome `delivered`, `attemptedAt`+`completedAt` set; sink recorded the exposure).
2. a **not-reviewed** record is **blocked** (`blocked-not-eligible` / `review-not-approved`) and the **sink is not called**.
3. a **rejected** record is **blocked** and the sink is not called.
4. a **superseded** record is **blocked** (`superseded-record`) and the sink is not called.
5. a **failed-render** record is **blocked** (`failed-render-record`) and the sink is not called.
6. a **missing** record is **`not-attempted`** (`rendered-message-not-found`); sink not called.
7. an **unsupported/reserved** target is **blocked** (`unsupported-channel`); sink not called.
8. delivery **success does not mutate** the rendered record or any domain output (record `toState()` unchanged; no `VoiceMode`/`SupportQuality`/traceability/freshness change).
9. delivery **failure** (`sink-unavailable`) does **not invalidate** the rendered record or domain output (and `cancelled` likewise).
10. a `DeliveryRecord`/`DeliveryOutcome` is **not usable as** `Evidence`/`Observation`/`Understanding`/`AthleteDecision`/`SupportQuality` (no such fields/handles — structural).
11. **no** `Signal`/`Evidence`/`Hypothesis`/`Understanding`/`DecisionSupport`/reprojection side effect from any branch.
12. repository port **persists and rehydrates** delivery records (`save`/`findById`/`findByRenderedMessageRecordRef`).
13. repository **mutation isolation** (two finds independent; mutating one returned record does not affect the store).
14. **invalid state rejected** on `reconstitute`/`create` (each §7 rule).
15. **`delivery` does not import `event-recording`** (structural, `node:fs`).
16. **no event-catalog expansion** (the `event-recording` catalog contains no `Delivery*` type).
17. **no provider/API/UI/channel/scheduler/event-bus** file or token (structural guard).
18. **all 374 Impl 001–015 tests continue to pass.**

[DECISION] Tests 15–17 are structural guards (`node:fs`): `delivery` files import only `shared-kernel` + read-only `rendering`; the repo-named files import only own module + `shared-kernel`; no forbidden top-level layer/token exists. The neutral `__tests__/delivery-rendering.test.ts` composes rendering (build a record, review it) + delivery (request delivery) to exercise the eligible/blocked paths end-to-end.

---

## 11. Boundary Rules

[DECISION]
- `delivery` may import **only** `shared-kernel` + **read-only `rendering`** types/functions (`RenderedMessageRecord`, `RenderedMessageRecordId`, `DisplayEligibility`, `displayEligibilityOf`).
- `delivery` **must not import** `observation`/`reasoning`/`understanding`/`decision-support`/`athlete`/`event-recording`.
- `rendering` **must not import** `delivery`; **no existing upstream module imports `delivery`**.
- Neutral integration tests (`__tests__/`) may compose `rendering` + `delivery`.
- The repo-named files (`*-repository`/`in-memory-*`) import only `delivery` domain + `shared-kernel`; the **rendering import lives only in `delivery-service.ts`** (persistence-boundary guard not tripped).
- **No** provider/API/UI/infrastructure layer; **no** scheduler/event bus; **no** event-catalog expansion; **no** real channel.

[FACT] Adding a top-level `delivery` module will trip the e2e `ALLOWED_MODULES` guard (as `athlete`/`event-recording`/`rendering` did) → Impl 016 adds `"delivery"` to that allowlist: a **documented, test-only blocker fix**, no production module modified.

---

## 12. Relationship To Existing Architecture

[FACT] Builds on, without altering:
- **Impl 015** — display eligibility is **derived** from the rendered-message record/review state; delivery **reuses `displayEligibilityOf`** and is strictly downstream (never edits review/eligibility).
- **Impl 014** — rendered text is **validated presentation**; delivery exposes it, never re-generates/re-validates meaning.
- **Impl 005** — `decision-support` owns the terminal output + voice; delivery never touches them.
- **Impl 011** — event records are occurrence history, not commands; **no delivery events** in this slice.
- **Impl 012** — reprojection is **not triggered** by delivery.
- **Impl 013** — **delivered text is not source material** unless the athlete separately reports it via the manual input adapter.

[DECISION] The picture: **rendering generates · the record audits display-safety · display eligibility is derived · delivery exposes (downstream only, behind a test sink) · the domain stays source of truth · a delivery attempt/outcome is auditability, not authority, and never evidence · display eligibility is not delivery · the test sink is not real provider integration · event records are occurrence history, not commands.**

---

## 13. Open Questions (do not block implementation)

[QUESTION] future real UI/API/channel/provider integration; consent/preferences before delivery; retry/cancellation policies; whether delivery events are added later (ref-only); retention/deletion policy for delivery records; whether read receipts/user actions become observations later (only via the manual adapter if so); whether delivery status should be visible in a UI; provider-adapter design; scheduling/background jobs; localization/channel formatting; whether a future two-phase flow uses `accepted-for-delivery`.

[ASSUMPTION] None block Implementation 016: the request/eligibility-check/attempt/outcome/record contract is fully testable in-memory against a deterministic sink.

---

## 14. Implementation Task Preview

**Implementation 016 — Add delivery boundary with test sink and audit records.**

[DECISION] Scope: create `src/modules/delivery/` per §4–§7 (request, target, outcome, failure, eligibility-check, deterministic test sink, record + `toState`/`reconstitute`; repository port + in-memory adapter; the `requestDelivery` service), the tests (§10), additive index exports, and the **documented test-only `ALLOWED_MODULES` allowlist fix** (add `"delivery"`). **Additive** — no existing production module behavior changes.

**Acceptance criteria:**
- a **new minimal `delivery` module** exists, importing only `shared-kernel` + read-only `rendering`;
- `requestDelivery(...)` **delivers** an eligible record to the **test-only sink** and **blocks** every ineligible path (not-reviewed/rejected/superseded/failed-render/missing-ref/unsupported-target), mapping rendering's specific eligibility reasons to specific `DeliveryFailureReason`s (raw reasons retained);
- delivery **success never validates** and **failure/cancellation never invalidates** the domain output or the rendered record (no mutation of any upstream aggregate);
- delivery **triggers no** reasoning/reprojection/retry; **creates no** `Signal`/`Evidence`/`Hypothesis`/`Understanding`/`DecisionSupport`/`AthleteDecision`/`Recommendation`; **changes no** `VoiceMode`/`SupportQuality`/traceability/limitations;
- the **repository port + in-memory adapter** persist via `structuredClone(toState())` ↔ `reconstitute(structuredClone(state))`, prove **mutation isolation**, and **reject invalid state**;
- **no real provider/channel**, **no UI/API**, **no scheduler/event bus**, **no event records**, **no `event-recording` import from `delivery`**, **no upstream module import of `delivery`**;
- **all 374 existing tests stay green**; the new tests pass.

**The implementation must explicitly create none of:** real provider/channel · UI/API · scheduler/event bus · delivery event records · event-catalog expansion · production DB · domain mutation · an `event-recording` import from `delivery` · an upstream import of `delivery`.

---

## 15. Technical Constraints

[FACT] TypeScript strict; Node native test runner (`node:test` + `node:assert/strict`); **no** external test framework/framework/DB/event-bus/LLM/external call/real channel-provider. **No constructor parameter properties** (the deterministic `InMemoryTestSink` is the one test-double constructor, with explicit fields). `import type` where appropriate. Explicit fields; `Object.freeze`. **No** arbitrary payload bags. **No** raw field-bag rehydration without validation. Repository preserves **mutation isolation**. Sink is **deterministic/test-only**. **No** `Date.now()` (timestamps passed in as `Timestamp`).

---

## 16. Success Criterion

> After this tech spec, Implementation 016 can be built **without** deciding UI, API, provider, channel, scheduler, event recording, production DB, or domain questions in code.

[ASSUMPTION] Answerable: the plan fixes every shape (`DeliveryRequest`, `DeliveryTarget` closed catalog, `DeliveryOutcome` closed catalog, `DeliveryFailureReason` closed catalog, `DeliveryEligibilityCheck` + the reason mapping, `DeliverySink` + `InMemoryTestSink`, `DeliveryRecord` + state, ids), the boundary location (a new `delivery` module), the **eligibility-reuse** rule (`displayEligibilityOf`, no parallel rules), the test-sink contract, the repository contract (+ mutation isolation + validated reconstitution), the deferred events, the boundary/allowlist handling, and the test contract — all satisfiable **in-memory** against a deterministic sink, modifying no production module behavior. The future implementation answers Spec 016's question: **"Can Aurora expose a reviewed rendered message without letting delivery become domain authority, evidence, or reasoning?"** — yes: a downstream exposure boundary that delivers only display-eligible messages to a test sink, records the attempt as auditability (never authority), and never feeds success/failure back into the domain.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the technical plan for the delivery boundary. It defines a new minimal `delivery` module that exposes display-eligible rendered messages to a test-only sink, behind a repository port + in-memory adapter, reusing rendering's `displayEligibilityOf`; it adds no real provider/channel, no UI/API, no scheduler/event bus, no events, and no DB. Delivering rendered text does not make it authority; channel success is not evidence; display eligibility is not domain approval, and delivery is not reasoning.*

*Inputs: [Spec 016](./016-delivery-boundary.md) · [Spec 015](./015-rendered-message-review-persistence.md) · [Spec 015A](./015-rendered-message-review-persistence-tech.md) · [Spec 014](./014-llm-rendering-boundary.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 010](./010-persistence-ports-in-memory-repositories.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 012](./012-reprojection-harness.md) · [Spec 013](./013-manual-input-adapter.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
