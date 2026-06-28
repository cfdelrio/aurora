# Tech Spec 018A — Provider Attempt Audit Boundary — Implementation Plan

> The TS-strict plan for Spec 018: an **append-only `ProviderAttemptRecord`** **inside `rendering`**, behind a **repository port + in-memory adapter**, that **observes** a `ProviderRenderOutcome` (Impl 017) and records *what the seam did* — **with no raw draft retention**, no events, and no downstream effect. The audit **does not call** the provider/validator; it **remembers the attempt, never the draft**. Validated messages remain the only path to a `RenderedMessage`.
>
> Technical Specification. **No code in this slice.** Implementation begins only from the approved plan as Implementation 018.

| Field | Value |
|---|---|
| **Status** | Technical Spec · *Accepted pending review* |
| **Phase** | Technical Specification (no code; no provider/SDK; no network; no prompts-as-code; no event-catalog change) |
| **Implements** | [Spec 018](./018-provider-attempt-audit-boundary.md) |
| **Builds on** | Spec/Impl 017 (provider seam: `ProviderRenderingRequest`/`ProviderRenderOutcome`/`ProviderFailure`) · 014 (rendering + `validateDraft`/`RenderingFailure`) · 015 (record/review repo pattern) · 016 (delivery audit repo pattern) · 010 (ports) · 011 (events — deferred) · 013 (manual input) |
| **Produces (plan for)** | `rendering/domain/` provider-attempt-record·status·failure-reason·draft-summary + `rendering/application/` repository port·in-memory adapter·audit service + tests; additive index updates |
| **Explicitly excludes** | a real provider/SDK, API keys/secrets, network/streaming, retries/rate-limits/billing, prompt templates as production code, model evaluation, telemetry, a production DB/schema, an event-catalog change/event bus, a scheduler, UI/API, delivery changes, **raw draft retention** |

[ASSUMPTION] This is **Technical Specification phase**, not Implementation. It fixes the TS-strict shapes, the boundary location (inside `rendering`), the no-raw-retention summary, the closed catalogs, the `ProviderRenderOutcome`→record mapping, the repository contract, the deferred events, and the test contract so Implementation 018 contains **no open design or domain decisions** — only typing and wiring.

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

[FACT] *How can Aurora implement provider-attempt audit records without retaining raw unsafe drafts, without making provider history source truth, and without triggering review, display eligibility, delivery, events, retries, reasoning, or domain mutation?*

[FACT] The answer in code: an append-only **`ProviderAttemptRecord`** (a **safe summary** of one provider seam attempt — status + reasons + refs, **no raw draft**), built by a **`provider-attempt-audit-service`** that **observes** an already-computed `ProviderRenderOutcome` (it never calls `requestProviderRendering`/`ProviderAdapter`/`validateDraft`), and persisted behind a **`ProviderAttemptRecordRepository` port + in-memory adapter** (the Impl 010/015/016 pattern). It lives **inside `rendering`**, imports only its own module + `shared-kernel` (+ read-only `decision-support` *types* for `VoiceMode`), appends no event, and triggers no downstream effect.

---

## 2. Surface Gap Analysis (read from current code)

[FACT] Verified against the repository so the plan reuses real shapes and invents nothing.

| # | Surface | Found in code | How 018 uses it |
|---|---|---|---|
| 1 | **ProviderRenderingRequest** | `rendering/domain/provider-rendering-request.ts`: `{ sourceCaseRef; kind: RenderableKind; voice?: VoiceMode; contentAtoms; allowedClaims; forbiddenClaims; uncertaintyVisibleRequired; limitations; traceabilitySummary?; traceabilityStatus?; style?; locale?; maxLength? }` | The source of the **safe request summary** (sourceCaseRef, kind, voice, style/locale) and the renderable ref. |
| 2 | **ProviderDraft / ProviderDraftOutcome** | `provider-draft.ts`: `ProviderDraft { text; providerKind; warnings }`; `ProviderDraftOutcome = {status:"drafted";draft} \| {status:"failed";failure}` | **Not** consumed directly by the audit (the audit observes the *outcome*, not the raw draft) — confirming raw draft text is never reached by the audit. |
| 3 | **ProviderFailure** | `provider-failure.ts`: closed **10-value** union + `PROVIDER_FAILURES` + `isProviderFailure` | Reused **verbatim** as the provider-failure half of the attempt reason vocabulary. |
| 4 | **ProviderRenderOutcome** | `provider-rendering-service.ts`: `{status:"rendered"; message: RenderedMessage; providerKind; providerWarnings} \| {status:"failed"; failure: ProviderFailure; renderingFailures?: readonly RenderingFailure[]}` | The **single input** the audit maps to a record (§6). It carries the validated `message` (rendered) or the failure + optional rendering failures (failed). |
| 5 | **RenderingFailure** | `rendering-failure.ts`: closed **12-value** union + `RENDERING_FAILURES` | Reused **verbatim** as the validation-failure half of the reason vocabulary. **Gap:** Spec 018's *illustrative* names (`inquiry-answered`, `withholding-as-advice`, `traceability-overstated`) do **not** match the real catalog (`inquiry-rendered-as-answer`, `withholding-rendered-as-advice`, `missing-traceability`). **018A resolves this by reusing the real `RenderingFailure` names** — no parallel/invented catalog. |
| 6 | **RenderingRequest** | `rendering-request.ts`: `{ renderable; locale?; style?; maxLength?; audience? }` | The audit caller passes this (or the `ProviderRenderingRequest`) for the safe summary; the renderable supplies `sourceCaseRef`/`kind`/`voice`. |
| 7 | **RenderableDomainOutput** | `renderable-domain-output.ts`: `{ sourceCaseRef; kind; voice?; …; traceability?; … }` | Source refs: `sourceCaseRef` (the renderable output ref) + `kind` + domain `voice`. |
| 8 | **RenderedMessage** | `rendered-message.ts`: `{ text; sourceRef; kind; voice?; …Preserved; warnings }` | On a **rendered** outcome, supplies `sourceRef`/`kind`/`voice` and a `producedRenderedMessage = true`; its **text is never stored**. |
| 9 | **requestProviderRendering** | `provider-rendering-service.ts` | Run by the **caller**; the audit observes its returned `ProviderRenderOutcome`. The audit **does not** call it (Decision 5). |
| 10 | **rendering exports** | `rendering/index.ts` = `export * from "./domain/index.ts"` + `export * from "./application/index.ts"`; `domain/index.ts` exports `RENDERING_FAILURES`/`RenderingFailure`, `PROVIDER_FAILURES`/`ProviderFailure`, provider request/draft types; `application/index.ts` exports the record repo + provider service | Audit types/repo/service are **added additively** to `domain/index.ts` + `application/index.ts` (already surfaced via `rendering/index.ts`). |
| 11 | **Repository conventions** | Impl 010/015/016: `interface XRepository { save; findById; exists; <finder(s)> }`; `InMemoryX` with `Map<string, XState>`, `save` stores `structuredClone(toState())`, reads `reconstitute(structuredClone(state))`, `clear()` | Reused verbatim for `ProviderAttemptRecordRepository` (+ `findByRenderableOutputRef` / `findByProviderAdapterKind`). |
| 12 | **toState()/reconstitute()** | Impl 010/015/016: private ctor + explicit fields + props object; `toState()` frozen plain state; `reconstitute(state)` re-validates, **throws** on invalid | `ProviderAttemptRecord` gets the same surface. |
| 13 | **Event catalog** | `event-recording/domain/domain-event-type.ts`: closed catalog; **no** `ProviderAttempt*`/`ProviderDraft*` types | **Not extended** (Decision 4); the audit imports no `event-recording`. |
| 14 | **Boundary guards** | `rendering-negative-capability.test.ts` (rendering imports only `shared-kernel` + read-only `decision-support` *types*; no SDK/network token; no `src/modules/{llm,openai,provider}` / `src/{api,ui,infrastructure}`); `persistence-boundary.test.ts` (repo-named files import only own module + `shared-kernel`; forbidden-tech token scan) | Audit files live **inside `rendering`**; the repo-named files import only own `rendering` domain + `shared-kernel`; the network-token regex doesn't match "provider"/"attempt"/"audit"; **no new module** → no e2e allowlist trip. |
| 15 | **Persistence-boundary token scan** | forbidden regex includes `migration`/`event-bus`/DB tokens | The audit files (and their comments) must avoid those tokens (a known Impl 016 footgun). |

[DECISION] **No gap blocks the slice, and no new module is created** — audit files are additive inside `rendering`, importing only own module + `shared-kernel` (+ read-only `decision-support` types), with no SDK/network token. **No e2e allowlist or structural-guard blocker is expected.** The only authoritative naming correction: **reason names come from the real `ProviderFailure` + `RenderingFailure` catalogs**, not Spec 018's illustrative spellings. Names above are authoritative; Implementation 018 must not rename them.

---

## 3. Key Architectural Decisions

### Decision 1 — The boundary lives inside `rendering`
[DECISION] Provider-attempt audit lives in `rendering`: `domain/provider-attempt-record.ts`, `provider-attempt-status.ts`, `provider-attempt-failure-reason.ts`, `provider-draft-summary.ts`; `application/provider-attempt-record-repository.ts`, `in-memory-provider-attempt-record-repository.ts`, `provider-attempt-audit-service.ts`.
- **Why:** provider attempts are **rendering-boundary artifacts** — they observe the Impl 017 seam. They are **not** delivery attempts, **not** event records, **not** reasoning artifacts; a top-level `provider-audit`/`telemetry`/`evaluation` module would overstate the boundary.
- **Consequence:** `rendering` owns provider-attempt audit; records stay **downstream presentation/audit artifacts**; **no upstream module imports the audit**.
- **Risk:** the audit may *look* like model evaluation or source truth.
- **Mitigation:** **no raw draft retention** (Decision 3); explicit audit-only types; no event/catalog expansion; negative tests (§9–§10).
- **Reversal Point:** if a production telemetry/eval need emerges, it consumes the same record/port contract — never by promoting provider content to authority.

### Decision 2 — Repository port + in-memory adapter
[DECISION] Implement `ProviderAttemptRecordRepository` (port) + `InMemoryProviderAttemptRecordRepository` (adapter), reusing the Impl 010/015/016 pattern (deep-copy on save/load; validated `reconstitute`).
- **Why:** this slice is about **auditability**; prior slices established the port + in-memory pattern; provider attempts need mutation-isolated retrieval; **no production DB is needed**.
- **Consequence:** attempts are auditable in tests; mutation isolation + invalid-state rejection are testable.
- **Risk/Reversal:** a real backend later implements the same port. **No DB/schema/ORM/migration/telemetry-store/infrastructure.**

### Decision 3 — No raw draft retention
[DECISION] Impl 018 **must not** retain raw provider draft text in `ProviderAttemptRecordState`. Record only a **safe summary** (`ProviderDraftSummary`, §5.4): `draftProduced`, `rawDraftRetained: false` (always), `providerWarningCount?`, `validationFailureCount?`, `renderingFailureReasons?`, `providerFailureReason?`. **No** draft text / unsafe excerpt / prompt content / request-payload dump.
- **Why:** drafts are **untrusted** (may contain invented facts or unsafe language); retaining raw text risks future misuse as source truth — the exact collapse this edge guards.
- **Consequence:** debugging is **reason-based, not text-based**.
- **Reversal Point:** a future spec may allow redaction or guarded raw retention — never as source material.
- [DECISION] **`draftCharacterCount` is reserved, not populated** in Impl 018: the audit observes the `ProviderRenderOutcome`, which does **not** expose the raw draft (only a validated `message` on success, whose text the audit deliberately does not measure or store). Keeping the summary strictly **reason/count-based** avoids any draft-derived field. (Optional field may exist in the type for a future policy; Impl 018 leaves it `undefined`.)

### Decision 4 — Event records deferred
[DECISION] **No** provider-attempt events in Impl 018; **no** event-catalog expansion; the audit imports **no `event-recording`**.
- **Why:** repository audit is sufficient; the catalog is closed; provider attempts must never become event commands or retry triggers.
- **Reversal Point:** a later spec adds ref-only `ProviderAttemptRecorded` (occurrence history, inert) composed in a neutral harness.

### Decision 5 — Audit observes provider outcomes; it does not call providers
[DECISION] The audit **consumes already-created** request/outcome data. It **must not** call `ProviderAdapter`, `requestProviderRendering`, or `validateDraft`.
- **Why:** the audit **records what happened**; calling the provider/validator would make it **active** rather than **observational** (and could double-invoke a real provider later).
- **Consequence:** the audit service signature takes a `ProviderRenderOutcome` (+ the request/summary + timestamps + adapter kind) and returns a `ProviderAttemptRecord` — pure mapping, no behavior.

---

## 4. Proposed Layout

[DECISION]
```text
src/modules/rendering/
  domain/
    provider-attempt-status.ts         # ProviderAttemptStatus (closed) + PROVIDER_ATTEMPT_STATUSES
    provider-attempt-failure-reason.ts # ProviderAttemptFailureReason = ProviderFailure | RenderingFailure (+ catalog/guard)
    provider-draft-summary.ts          # ProviderDraftSummary (safe; no raw text)
    provider-attempt-record.ts         # ProviderAttemptRecord (+ State) + toState/reconstitute
    index.ts                           # (additive re-exports)
  application/
    provider-attempt-record-repository.ts            # port
    in-memory-provider-attempt-record-repository.ts  # adapter
    provider-attempt-audit-service.ts                # auditProviderAttempt(...) — observes outcome only
    index.ts                           # (additive re-exports)
  tests/
    provider-attempt-record.test.ts
    provider-attempt-persistence.test.ts
    provider-attempt-negative-capability.test.ts
```
[DECISION] Update `rendering/domain/index.ts` + `rendering/application/index.ts` **additively** (both surfaced via `rendering/index.ts`). **Must not create:** `src/modules/{provider-audit,provider,llm,telemetry,evaluation,openai,anthropic,model}`, `src/{api,ui,infrastructure,providers,prompts}`, any SDK config, env-var read, or network client.

[FACT] TS-strict house rules: no constructor parameter properties (private ctor + explicit fields + props object); `import type` for `VoiceMode`/`RenderingFailure`/`ProviderFailure`; `.ts` extensions; `Object.freeze`; conditional spreads for `exactOptionalPropertyTypes`; no `Date.now()` (timestamps passed in); no arbitrary payload bags.

---

## 5. Types (TS-strict shapes)

### 5.1 Id (`domain/provider-attempt-record.ts`)
```ts
declare const providerAttemptRecordIdBrand: unique symbol;
export type ProviderAttemptRecordId = string & { readonly [providerAttemptRecordIdBrand]: true };
export function providerAttemptRecordId(value: string): ProviderAttemptRecordId;     // non-empty
export function newProviderAttemptRecordId(): ProviderAttemptRecordId;               // crypto.randomUUID()
```

### 5.2 Status (`domain/provider-attempt-status.ts`)
```ts
export type ProviderAttemptStatus =
  | "requested"             // RESERVED (future two-phase flow; not produced by the single-shot audit)
  | "draft-produced"        // RESERVED (future; not produced)
  | "validation-passed"
  | "validation-failed"
  | "provider-failed"
  | "unsafe-request-blocked";
export const PROVIDER_ATTEMPT_STATUSES: readonly ProviderAttemptStatus[] = [/* …6… */];
export function isProviderAttemptStatus(value: unknown): value is ProviderAttemptStatus;
```
[DECISION] Impl 018 **persists terminal records only**; the single-shot audit produces **`validation-passed` / `validation-failed` / `provider-failed` / `unsafe-request-blocked`**. **`requested` / `draft-produced` are reserved** (valid catalog/`reconstitute` members for a future two-phase flow, **not produced** this slice) — documented, not dead.

### 5.3 Failure reason (`domain/provider-attempt-failure-reason.ts`)
```ts
import { PROVIDER_FAILURES } from "./provider-failure.ts";
import type { ProviderFailure } from "./provider-failure.ts";
import { RENDERING_FAILURES } from "./rendering-failure.ts";
import type { RenderingFailure } from "./rendering-failure.ts";

export type ProviderAttemptFailureReason = ProviderFailure | RenderingFailure;
export const PROVIDER_ATTEMPT_FAILURE_REASONS: readonly ProviderAttemptFailureReason[] =
  [...PROVIDER_FAILURES, ...RENDERING_FAILURES];
export function isProviderAttemptFailureReason(value: unknown): value is ProviderAttemptFailureReason;
```
[DECISION] **Reuse the real catalogs verbatim** (§2 gap #5) — no invented names. The record carries the **precisely typed** halves: `providerFailureReason?: ProviderFailure` and `renderingFailureReasons?: readonly RenderingFailure[]` (so a reason maps 1:1 from the observed `ProviderRenderOutcome`).

### 5.4 Draft summary (`domain/provider-draft-summary.ts`)
```ts
import type { ProviderFailure } from "./provider-failure.ts";
import type { RenderingFailure } from "./rendering-failure.ts";

export interface ProviderDraftSummary {
  readonly draftProduced: boolean;
  readonly rawDraftRetained: false;                 // literal false — raw text is never retained
  readonly draftCharacterCount?: number;            // RESERVED — not populated in Impl 018 (Decision 3)
  readonly providerWarningCount?: number;
  readonly validationFailureCount?: number;
  readonly renderingFailureReasons?: readonly RenderingFailure[];
  readonly providerFailureReason?: ProviderFailure;
}
```
[FACT] The summary has **no** `draft`/`text`/`content`/`raw`/`excerpt`/`prompt` field — raw/unsafe content is **unrepresentable**. `rawDraftRetained` is the literal type `false`.

### 5.5 Record (`domain/provider-attempt-record.ts`)
```ts
export interface ProviderAttemptRecordState {
  readonly id: ProviderAttemptRecordId;
  readonly renderableOutputRef: string;             // = renderable.sourceCaseRef
  readonly terminalOutputKind: RenderableKind;
  readonly voice?: VoiceMode;                        // domain-selected (read-only)
  readonly requestSummary: {                         // safe constraints only — no prompt/payload dump
    readonly style?: string;
    readonly locale?: string;
    readonly maxLength?: number;
  };
  readonly providerAdapterKind: string;             // e.g. "fake"
  readonly status: ProviderAttemptStatus;
  readonly providerFailureReason?: ProviderFailure;
  readonly renderingFailureReasons?: readonly RenderingFailure[];
  readonly draftSummary: ProviderDraftSummary;
  readonly producedRenderedMessage: boolean;
  readonly requestedAt: Timestamp;
  readonly completedAt?: Timestamp;
  readonly createdAt: Timestamp;
}

export class ProviderAttemptRecord {
  // explicit readonly fields; private ctor; Object.freeze(this)
  static create(state: ProviderAttemptRecordState): ProviderAttemptRecord;       // validates (§7)
  toState(): ProviderAttemptRecordState;
  static reconstitute(state: ProviderAttemptRecordState): ProviderAttemptRecord; // re-validate (§7)
}
```
[FACT] A `ProviderAttemptRecord` carries **no** raw draft/prompt/chain-of-thought, **no** mutable handle, **no** `Evidence`/`Observation`/`Understanding`/`AthleteDecision`/`DecisionSupport` field, **no** `RenderedMessage` text / `RenderedMessageRecord` field, **no** review/display/delivery field, **no** provider secret/config, **no** arbitrary metadata bag — it is **auditability, not authority**.

### 5.6 Audit service (`application/provider-attempt-audit-service.ts`)
```ts
export interface AuditProviderAttemptInput {
  readonly request: RenderingRequest;               // authoritative; for renderable ref + safe summary
  readonly outcome: ProviderRenderOutcome;          // observed (already computed by the caller)
  readonly providerAdapterKind: string;             // e.g. provider.kind
  readonly requestedAt: Timestamp;
  readonly completedAt: Timestamp;
  readonly createdAt: Timestamp;
  readonly id?: ProviderAttemptRecordId;            // else newProviderAttemptRecordId()
}

export function auditProviderAttempt(input: AuditProviderAttemptInput): ProviderAttemptRecord;
```
[DECISION] `auditProviderAttempt` is a **pure mapping** (Decision 5): it reads `input.outcome` + `input.request` and builds a `ProviderAttemptRecord`. It **does not** call `requestProviderRendering`/`ProviderAdapter`/`validateDraft`, **persists nothing itself** (the caller saves via the repo), and **mutates nothing**. (A separate `unsafe-request-blocked` constructor/path is unnecessary: `requestProviderRendering` already returns a `failed` outcome for a rejected request, which the mapping in §6 classifies — but the mapping never claims a provider was called for those reasons.)

---

## 6. ProviderRenderOutcome → record mapping

[DECISION] `auditProviderAttempt` derives the record from the observed `ProviderRenderOutcome`:

| Observed outcome | `status` | `producedRenderedMessage` | `draftSummary.draftProduced` | reasons captured |
|---|---|---|---|---|
| `{status:"rendered", message, providerWarnings}` | `validation-passed` | `true` | `true` | none; `providerWarningCount = providerWarnings.length` |
| `{status:"failed", failure:"provider-output-failed-validation", renderingFailures}` | `validation-failed` | `false` | `true` | `renderingFailureReasons = renderingFailures`; `validationFailureCount = renderingFailures.length` |
| `{status:"failed", failure ∈ {unsupported-style, unsupported-locale, unsafe-provider-request}}` | `unsafe-request-blocked` | `false` | `false` | `providerFailureReason = failure` (provider **not** called) |
| `{status:"failed", failure ∈ other ProviderFailure}` (`provider-unavailable`/`-timeout`/`-rate-limited`/`-returned-empty-draft`/`-returned-invalid-draft`/`-refused`) | `provider-failed` | `false` | `false` | `providerFailureReason = failure` |

[FACT] Refs/labels come from `request.renderable` (`renderableOutputRef = sourceCaseRef`, `terminalOutputKind = kind`, `voice`) and `request` (`requestSummary` = `{style?, locale?, maxLength?}`); `providerAdapterKind` is passed in. **No draft text is read or stored** in any branch (the `rendered` branch's `message.text` is deliberately not measured/retained — Decision 3). The `rendered` branch produces a transient validated message **elsewhere**; the audit only records that one was produced.

---

## 7. Persistence & Reconstitution Rules

[DECISION] Port (`application/provider-attempt-record-repository.ts`):
```ts
export interface ProviderAttemptRecordRepository {
  save(record: ProviderAttemptRecord): void;
  findById(id: ProviderAttemptRecordId): ProviderAttemptRecord | undefined;
  exists(id: ProviderAttemptRecordId): boolean;
  findByRenderableOutputRef(ref: string): readonly ProviderAttemptRecord[];
  findByProviderAdapterKind(kind: string): readonly ProviderAttemptRecord[];
}
```
[DECISION] In-memory adapter: `Map<string, ProviderAttemptRecordState>`; `save` stores `structuredClone(record.toState())`; reads `reconstitute(structuredClone(state))` (deep-copy in *and* out → **mutation isolation**); finders filter reconstituted records; `clear()` for tests. The repo-named files import only `rendering` domain + `shared-kernel`. **No DB/schema/ORM/migration/infrastructure; no event append; no retry/scheduler/provider-call side effect.**

[DECISION] `create`/`reconstitute` **re-validate** (throwing on violation):
- `renderableOutputRef` present (non-empty); `terminalOutputKind` ∈ `RenderableKind`; valid `Timestamp`s;
- `status` ∈ `PROVIDER_ATTEMPT_STATUSES`; `providerFailureReason` (if present) ∈ `PROVIDER_FAILURES`; every `renderingFailureReasons` member ∈ `RENDERING_FAILURES`;
- **`draftSummary.rawDraftRetained === false`** (reject `true`); **no** `draft`/`text`/`content`/`prompt`/`raw`/`excerpt` key anywhere in the state (reject smuggled raw content);
- **`validation-passed` ⇒ `producedRenderedMessage === true`** and a `renderableOutputRef` is present;
- **`validation-failed` ⇒ `producedRenderedMessage === false`** and `renderingFailureReasons` non-empty;
- **`provider-failed` ⇒ `producedRenderedMessage === false`**, `draftSummary.draftProduced === false`, and a `providerFailureReason` present;
- **`unsafe-request-blocked` ⇒ `producedRenderedMessage === false`** and `draftSummary.draftProduced === false`;
- **no** delivered/review/display field; **no** unknown status/reason; **no** arbitrary provider payload bag.

---

## 8. Event Recording Rule

[DECISION] **No event records in Impl 018.** The audit imports **no `event-recording`**; **no** `ProviderAttemptRecorded`/`ProviderDraftRejected` catalog entry; **no** event-as-command/retry/telemetry event. Future event recording, if specified, is ref-only/inert.

---

## 9. Negative Capability

[DECISION] Structurally impossible / test-failing in Impl 018: a **raw provider draft / unsafe text / prompt / chain-of-thought / private reasoning retained** (no such field; `rawDraftRetained` is literal `false`; reconstitute rejects smuggled raw keys); a `ProviderAttemptRecord` becoming **source truth / `Evidence` / `Observation` / `Understanding` / `AthleteDecision` / `DecisionSupport` / `TerminalOutput` / `RenderedMessage` / `RenderedMessageRecord`** (no such field/handle); the record **creating a review / display eligibility / delivery / `Recommendation`**, **changing `VoiceMode`**, **repairing traceability**, **removing limitations**, or **updating `SupportQuality`**; a **validation failure invalidating the domain output**; attempt **success validating recommendation quality** / **failure weakening `SupportQuality`**; the audit **triggering retry/scheduler/event bus**, **importing `event-recording`**, or **calling the provider/validator**; **a real provider SDK/API/network/prompt file** appearing. Enforced by TS-strict types (closed unions; literal `false`; no raw/domain fields; observe-only service) + §10 tests + the existing rendering/persistence guards.

---

## 10. Validation Strategy (tests before implementation)

[ASSUMPTION] Negative tests are **defining.**

1. a **successful** provider attempt can be audited (`validation-passed`; `producedRenderedMessage = true`; renderable/request refs preserved).
2. a **validation-failure** attempt can be audited (`validation-failed`; `renderingFailureReasons` captured; no message).
3. a **provider-failure** attempt can be audited (`provider-failed`; `providerFailureReason` captured; `draftProduced = false`).
4. an **unsafe-request-blocked** attempt can be audited (`unsafe-request-blocked`; provider not called; `draftProduced = false`).
5. **raw unsafe draft is not retained** (no `draft`/`text`/`content`/`prompt` field; `rawDraftRetained === false`).
6. the attempt record **preserves renderable/request refs** (and the safe request summary).
7. the attempt record **preserves the validation/failure summary** (reasons + counts).
8. the attempt record **does not create a `RenderedMessageRecord`** (the audit produces only a `ProviderAttemptRecord`).
9. the attempt record **does not create review/display eligibility/delivery**.
10. the attempt record is **not usable as** `Evidence`/`Observation`/`Understanding`/`AthleteDecision`/`DecisionSupport` (no such fields — structural JSON scan).
11. recording **does not trigger retry/scheduler/event bus** (no such call/import).
12. the repository port **persists and rehydrates** records (`save`/`findById`/finders).
13. repository **mutation isolation** (two finds independent; mutating one returned record does not affect the store).
14. **invalid state rejected** on `reconstitute`/`create` (each §7 rule, incl. `rawDraftRetained: true` and status/flag mismatches).
15. **the audit imports no `event-recording`** (structural).
16. **no event-catalog expansion** (the `event-recording` catalog has no `ProviderAttempt*` type).
17. **no real provider SDK/API/network/prompt file** (structural: no `openai`/`anthropic`/`axios`/`node:http(s)`/`fetch(`/`process.env` token; no `src/{providers,prompts,…}` / `src/modules/{provider,llm,telemetry,evaluation,…}`).
18. **boundary/import tests:** audit files import only own `rendering` domain/application + `shared-kernel` (+ read-only `decision-support` *types*); no `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`; no upstream module imports the audit; **the audit service does not import/call `ProviderAdapter`/`requestProviderRendering`/`validateDraft`**.
19. **all 421 Impl 001–017 tests continue to pass.**

[DECISION] Tests 5, 10, 15–18 are the structural/typed guards; the four mapping tests (1–4) prove the `ProviderRenderOutcome`→status mapping; 12–14 prove the persistence contract.

---

## 11. Boundary Rules

[DECISION]
- Audit files may import **only** their own `rendering` domain/application types + `shared-kernel` (+ read-only `decision-support` *types* for `VoiceMode`, type-only).
- They **must not import** `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`; the audit service **must not import/call** `ProviderAdapter`/`requestProviderRendering`/`validateDraft`.
- **No upstream module imports** the audit; **`rendering` remains imported by no domain module** (delivery's read-only `rendering` import is unaffected).
- The repo-named files import only `rendering` domain + `shared-kernel` (persistence-boundary compliant); audit files avoid the forbidden persistence-tech tokens (`migration`/`event-bus`/DB) **in code and comments** (Impl 016 footgun).
- **No** `src/modules/{provider-audit,provider,llm,openai,anthropic,model,telemetry,evaluation}`; **no** `src/{api,ui,infrastructure,providers,prompts}`; **no** SDK/network/env-var read.

[FACT] Because audit files live **inside `rendering`** and respect the above, the **existing** rendering + persistence guards already cover them, and **no e2e `ALLOWED_MODULES` change is needed** — **no documented blocker is expected** this slice.

---

## 12. Relationship To Existing Architecture

[FACT] Builds on, without altering:
- **Impl 017** — the provider produces an untrusted draft and the validator decides; this slice **audits that occurrence**, observing the `ProviderRenderOutcome` (it calls no provider/validator).
- **Impl 014** — **only validated drafts become a `RenderedMessage`**; the audit changes nothing about that path.
- **Impl 015** — **only a validated `RenderedMessage` may become a rendered-message record**; a `ProviderAttemptRecord` is a **different artifact** and never substitutes for it.
- **Impl 016** — delivery consumes only display-eligible records; **provider audit does not deliver** (and the delivery audit repo is a separate concern).
- **Impl 011** — any future provider-attempt event is occurrence history, not a command; **none added here**.
- **Impl 013** — a provider draft is not source material unless the athlete separately reports it.

[DECISION] The picture: **provider-attempt audit sits inside `rendering`, observes provider outcomes (calls no provider), is not rendered-message persistence, not delivery audit, not event sourcing, not model evaluation — and remembers the attempt, never the draft.**

---

## 13. Open Questions (do not block implementation)

[QUESTION] whether provider attempts become event records later; whether raw draft retention is ever allowed (and under what guard); whether safe summaries need hashing; retention/deletion policy; model-evaluation strategy; provider telemetry; a future real SDK integration; secret management; retries/rate limits/streaming; cost/billing limits; localization quality.

[ASSUMPTION] None block Implementation 018: the audit contract is fully provable in-memory from observed outcomes, with no provider call and no raw retention.

---

## 14. Implementation Task Preview

**Implementation 018 — Add provider attempt audit records without raw draft retention.**

[DECISION] Scope: create the `rendering/domain` attempt record/status/failure-reason/draft-summary types + the `rendering/application` repository port + in-memory adapter + the `auditProviderAttempt` service per §4–§7, the tests (§10), and additive index exports. **Additive only** — no existing module behavior changes; **no new top-level module** (so no e2e allowlist blocker expected).

**Acceptance criteria:**
- the **audit lives inside `rendering`**; **repository port + in-memory adapter** (mutation isolation; validated reconstitution);
- **no raw draft retention** (`rawDraftRetained` literal `false`; no draft/text/prompt field; reconstitute rejects smuggled raw content);
- the **`ProviderRenderOutcome`→status mapping** (§6) is exact (`validation-passed`/`validation-failed`/`provider-failed`/`unsafe-request-blocked`; `requested`/`draft-produced` reserved);
- reasons reuse the **real `ProviderFailure` + `RenderingFailure`** catalogs; a record is **not** `Evidence`/`Observation`/`Understanding`/`AthleteDecision`/`DecisionSupport`/`RenderedMessage`/`RenderedMessageRecord`;
- the audit **observes the outcome but does not call** the provider/validator; it **creates no review/display-eligibility/delivery**, **appends no event**, **triggers no retry/scheduler/reprojection/reasoning**, and **mutates no aggregate**; a **validation failure does not invalidate** the domain output;
- audit files import only own `rendering` surfaces + `shared-kernel` (+ read-only `decision-support` types); no `event-recording`/`delivery`/upstream import; no upstream module imports the audit;
- **all 421 existing tests stay green**; the new tests pass.

**The implementation must explicitly create none of:** a real provider/SDK · API keys/env reads · network/streaming · prompt templates as production code · UI/API · a `RenderedMessageRecord`/review/display-eligibility/delivery side effect · event records / event-catalog change · a provider/telemetry/evaluation module · raw draft retention · domain mutation.

---

## 15. Technical Constraints

[FACT] TypeScript strict; Node native test runner (`node:test` + `node:assert/strict`); **no** external test framework/framework/DB/event-bus/LLM-provider SDK/external call/real provider/prompt-templates-as-code. **No constructor parameter properties.** `import type` where appropriate. Explicit fields; `Object.freeze`. **No** arbitrary payload bags. **No** raw field-bag rehydration without validation. Repository preserves **mutation isolation**. The audit is **deterministic** (timestamps passed in; no `Date.now()`).

---

## 16. Success Criterion

> After this tech spec, Implementation 018 can be built **without** deciding a real provider, SDK, secrets, prompts, UI, API, event catalog, delivery, retries, model evaluation, or domain questions in code.

[ASSUMPTION] Answerable: the plan fixes every shape (`ProviderAttemptRecord` + state, `ProviderAttemptStatus`, the `ProviderFailure`|`RenderingFailure` reason reuse, the raw-free `ProviderDraftSummary`, the id, the `auditProviderAttempt` service), the boundary location (inside `rendering`), the **observe-only** rule (no provider/validator call), the **no-raw-retention** policy, the exact `ProviderRenderOutcome`→record mapping, the repository contract (+ mutation isolation + validated reconstitution + raw-content rejection), the deferred events, the boundary/guard handling, and the test contract — all satisfiable **in-memory** from observed outcomes, modifying no module behavior. The future implementation answers Spec 018's question: **"Can Aurora audit provider attempts without letting provider drafts become source truth, evidence, review, display eligibility, delivery, or reasoning?"** — yes: an append-only safe-summary record that remembers the attempt, retains no raw draft, and triggers nothing.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the technical plan for the provider-attempt-audit boundary. It defines an append-only, raw-free `ProviderAttemptRecord` inside `rendering`, behind a repository port + in-memory adapter, built by observing a `ProviderRenderOutcome`; it adds no events, no real provider/SDK/network/prompt, and no DB. A provider attempt is an audit artifact; validated messages remain the only path to a rendered message.*

*Inputs: [Spec 018](./018-provider-attempt-audit-boundary.md) · [Spec 017](./017-provider-adapter-boundary.md) · [Spec 017A](./017-provider-adapter-boundary-tech.md) · [Spec 014](./014-llm-rendering-boundary.md) · [Spec 015](./015-rendered-message-review-persistence.md) · [Spec 016](./016-delivery-boundary.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 012](./012-reprojection-harness.md) · [Spec 013](./013-manual-input-adapter.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
