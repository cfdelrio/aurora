# Tech Spec 017A — Provider Adapter Boundary — Implementation Plan

> The TS-strict plan for Spec 017: a **provider-adapter seam inside `rendering`** that replaces **only** the draft-text step the `FakeRenderer` performs today. A provider produces an **untrusted `ProviderDraft`**; the **existing `validateDraft({ draft, renderable, request })`** then decides; only on success does a `RenderedMessage` exist. Proven with a **deterministic fake provider port** — **no** real provider/SDK/network/prompt/secret, **no** persistence/review/display-eligibility/delivery/event side effect, **no** new top-level module.
>
> Technical Specification. **No code in this slice.** Implementation begins only from the approved plan as Implementation 017.

| Field | Value |
|---|---|
| **Status** | Technical Spec · *Accepted pending review* |
| **Phase** | Technical Specification (no code; no provider/SDK; no prompts-as-code; no UI/API; no external call) |
| **Implements** | [Spec 017](./017-provider-adapter-boundary.md) |
| **Builds on** | Spec/Impl 014 (rendering + mandatory `validateDraft`) · 015 (record/review) · 016 (delivery) · 005 (voice/terminal output) · 010 (port pattern) · 011 (events — none here) · 013 (manual input) |
| **Produces (plan for)** | `rendering/domain/` provider-rendering-request·provider-draft·provider-failure + `rendering/application/` provider-adapter (port)·fake-provider-adapter·provider-rendering-service + tests; additive index updates |
| **Explicitly excludes** | a real provider choice/SDK, API keys, network/streaming, retries/rate-limits/billing, model selection/fine-tuning, prompt templates as production code, prompt optimization, eval infra, UI/API, delivery side effects, event records, a production DB/schema |

[ASSUMPTION] This is **Technical Specification phase**, not Implementation. It fixes the TS-strict shapes, the boundary location (inside `rendering`), the request-construction guard, the draft→`validateDraft` handoff, the closed failure catalog, the deterministic fake provider, and the test contract so Implementation 017 contains **no open design or domain decisions** — only typing and wiring.

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

[FACT] *How can Aurora implement a provider-adapter seam that replaces only the draft-text generation step while keeping `validateDraft` mandatory and preventing provider output from becoming authority, reasoning, persistence, review, display eligibility, or delivery?*

[FACT] The answer in code: a `ProviderAdapter` **port** + a deterministic **`FakeProviderAdapter`** + a **`ProviderRenderingService`**, all **inside `rendering`**. The service does exactly what `render()` does today — but swaps the draft source: it builds a **constrained `ProviderRenderingRequest`**, asks the adapter for a draft, and feeds that draft string into the **unchanged `validateDraft({ draft, renderable, request })`**. The provider never constructs a `RenderedMessage`, never persists/reviews/delivers, and never mutates anything; any failure or unsafe draft degrades to safe non-rendering.

---

## 2. Surface Gap Analysis (read from current code)

[FACT] Verified against the repository so the plan reuses real shapes and invents nothing.

| # | Surface | Found in code | How 017 uses it |
|---|---|---|---|
| 1 | **RenderingRequest** | `rendering/domain/rendering-request.ts`: `{ renderable: RenderableDomainOutput; locale?: string; style?: string; maxLength?: number; audience?: string }` — **no** override/voice/prompt/metadata field | The authoritative request; the `ProviderRenderingService` takes it and passes it **unchanged** to `validateDraft`. The `ProviderRenderingRequest` is a *constrained projection* of it for the provider. |
| 2 | **SAFE_STYLES** | `["shorter","longer","clearer","warmer","more-formal"]` (5) + `isSafeStyle` | A request `style` outside this set is rejected **before** the provider call (`unsupported-style`). "be decisive" is not a member. |
| 3 | **SUPPORTED_LOCALES** | `["en"]` + `isSupportedLocale` | A request `locale` outside this set is rejected before the provider call (`unsupported-locale`). |
| 4 | **RenderableDomainOutput** | `{ sourceCaseRef; kind: "support"\|"inquiry"\|"withholding"; voice?: VoiceMode; intent?; contentAtoms; allowedClaims; forbiddenClaims; uncertaintyVisibleRequired; limitations; freshness?; traceability?; agencyRequired; conditions }` | The source of the **constrained** provider request fields (kind, voice, allowed/forbidden claims, uncertainty/limitation/traceability constraints). |
| 5 | **RenderedMessage** | `{ text; sourceRef; kind; voice?; uncertaintyPreserved; limitationsPreserved; traceabilityPreserved; warnings }` | The **only** success artifact — produced **solely** by `validateDraft`, never by the provider. |
| 6 | **RenderOutcome** | `{ status:"rendered"; message } \| { status:"failed"; failures: readonly RenderingFailure[] }` | The validator's result; the provider service wraps it (Decision 7) but the `rendered` branch is byte-for-byte the existing path. |
| 7 | **RenderingFailure** | closed **12-value** union (`voice-escalation`, `invented-fact`, `uncertainty-hidden`, `limitation-hidden`, `inquiry-rendered-as-answer`, `withholding-rendered-as-advice`, `missing-terminal-output`, `unsupported-style-request`, `unsupported-language-request`, `unsafe-rendering-request`, `missing-traceability`, `recommendation-created-by-renderer`) | Carried through on a validation failure; **not** extended this slice. |
| 8 | **validateDraft** | `rendering/domain/rendering-validator.ts`: `validateDraft({ draft, renderable, request }) → RenderOutcome` — the **mandatory** gate (string/structural; the safety guarantee) | **Reused unchanged** as the `ProviderValidationGate`. The provider draft string is the `draft`; `renderable`/`request` come from the authoritative `RenderingRequest`. |
| 9 | **FakeRenderer** | `fake-renderer.ts`: `fakeRenderText(renderable) → string`, `fakeRender(request) → {status:"draft",text}\|{status:"failed",failures}`, and `render(request)=fakeRender→validateDraft` | The seam to mirror: the provider **replaces `fakeRender`** as the draft source; `render` shows the exact draft→validate flow the provider service copies. The fake provider's *safe* scenario may reuse `fakeRenderText` (same module) for a deterministic passing draft. |
| 10 | **rendering exports** | `rendering/index.ts` = `export * from "./domain/index.ts"` + `export * from "./application/index.ts"`; `domain/index.ts` exports renderer/validator/types; `application/index.ts` exports the record repo port/adapter | Provider types/service are **added additively** to `domain/index.ts` + `application/index.ts` (already surfaced via `rendering/index.ts`). |
| 11 | **Boundary guards** | `rendering-negative-capability.test.ts`: rendering production files import no `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`, any `decision-support` import is **type-only**; **no `src/modules/{llm,openai,provider}` / `src/{api,ui,infrastructure}`**; **no token** matching `/\b(openai\|anthropic\|axios\|node:https\|node:http)\b\|fetch\s*\(\|https?:\/\//i` | Provider files live **inside `rendering`** (not a new module) and import only own module + `shared-kernel` (+ read-only `decision-support` *types* if needed). The token regex matches specific provider/network names — **not** the bare word "provider"/`ProviderAdapter` — so the names are safe. |
| 12 | **e2e module allowlist** | `ALLOWED_MODULES` (9 modules) | **Not tripped** — no new top-level module is created (provider lives inside `rendering`), so **no documented blocker is expected** (as in Impl 015). |

[DECISION] **No gap blocks the slice, and no new module is created** — provider files are additive inside `rendering`, importing only own module + `shared-kernel` (+ read-only `decision-support` types), with no network/SDK token. **No e2e allowlist or structural-guard blocker is expected.** Names above are authoritative; Implementation 017 must not rename them.

---

## 3. Key Architectural Decisions

### Decision 1 — The boundary lives inside `rendering`
[DECISION] Provider files live in `rendering`: `domain/provider-rendering-request.ts`, `domain/provider-draft.ts`, `domain/provider-failure.ts`; `application/provider-adapter.ts` (port), `application/fake-provider-adapter.ts`, `application/provider-rendering-service.ts`.
- **Why:** provider drafting **is** a rendering concern — it replaces only the draft step the `FakeRenderer` performs. It must **never** sit behind `decision-support` (that would let generation touch voice/terminal output), **never** in `delivery`, and **never** become its own authority module.
- **Consequence:** `rendering` owns provider request constraints and the validation handoff; **no new top-level `provider`/`llm` module**.
- **Risk:** provider code can *look* like real integration.
- **Mitigation:** **fake provider port only**; no SDK, network, API keys, environment-variable reads, prompt files, or external calls; structural guards (§9–§11).
- **Reversal Point:** a real provider adapter later implements the **same `ProviderAdapter` port** behind the same `validateDraft` gate — with secrets/network isolated outside the domain — only after a separate spec.

### Decision 2 — Fake provider port only
[DECISION] Implementation 017 ships **only** a deterministic `FakeProviderAdapter` / test provider port. **No** OpenAI/Anthropic/local model/HTTP client/SDK/provider-specific config.
- **Why:** this slice proves the **seam**, not provider quality; a real provider introduces secrets, networking, retries, latency, nondeterminism — all out of scope. The validator contract must stay **provider-independent**.
- **Consequence:** every behavior (safe draft + each unsafe draft + each failure) is provable deterministically in-process.
- **Reversal Point:** a real adapter implements the same port later.

### Decision 3 — Provider replaces draft generation only
[DECISION] Provider output plugs into **exactly** the existing draft→validate seam:
```text
provider produces draft text
  → validateDraft({ draft, renderable, request })
  → RenderedMessage only if validation passes
```
The provider **must not**: bypass `validateDraft`; create a `RenderedMessage` directly; create a `RenderedMessageRecord`; mark display-eligible; deliver.
- **Why:** the validator, not the draft source, is the safety guarantee (Impl 014). Keeping the gate unchanged makes "a provider earned a message the fake renderer couldn't" unrepresentable.

### Decision 4 — Provider request is constrained and derived
[DECISION] `ProviderRenderingRequest` is **derived** from `RenderingRequest` + `RenderableDomainOutput` and carries **only** safe, domain-approved presentation inputs (§5.1). It **must not** include raw private reasoning, chain-of-thought, mutable aggregate handles, override fields, arbitrary prompt-injection fields, provider-specific payloads, or hidden instructions to escalate voice/hide uncertainty.
- **Why:** the provider may see only what the domain already approved; anything more is a path to authority leakage.

### Decision 5 — Provider failure maps to safe non-rendering
[DECISION] Provider failures produce a **safe** provider/rendering failure outcome: **no** fallback unsafe text, **no** automatic retry, **no** scheduler, **no** event, **no** persistence, **no** delivery.
- **Why:** invariant 20 (Spec 017) — failure must degrade to safe non-rendering.

### Decision 6 — Closed `ProviderFailure`: fake-configurable, no real semantics
[DECISION] The closed `ProviderFailure` catalog (§5.5) is implemented as **fake-configurable** behavioral reasons. The network-flavored members (`provider-unavailable`, `provider-timeout`, `provider-rate-limited`) carry **no real semantics** — the `FakeProviderAdapter` can be told to return them so they are testable catalog members, but **no real network/provider** produces them this slice.
- **Why:** every closed-union value should be reachable/testable in the fake seam without introducing real provider behavior.
- **Reversal Point:** a real adapter maps real provider errors down to this same closed set (provider-specific codes captured for audit, never leaked into domain authority).

### Decision 7 — A thin provider outcome wraps `RenderOutcome` (existing `RenderingFailure` not expanded)
[DECISION] The service returns a small **`ProviderRenderOutcome`** (§5.6) that surfaces provider-level detail **around** the existing `RenderOutcome`; the **`rendered` branch's `message` is exactly the `validateDraft` output** (the existing rendering path, unchanged). The 12-value `RenderingFailure` union is **not** expanded.
- **Why:** provider failures (request-rejection, provider error, validation failure) need to be visible without polluting the renderer's closed failure catalog; the final message path must remain identical.

---

## 4. Proposed Layout

[DECISION]
```text
src/modules/rendering/
  domain/
    provider-rendering-request.ts   # ProviderRenderingRequest + providerRenderingRequestFrom(...)
    provider-draft.ts               # ProviderDraft + ProviderDraftOutcome
    provider-failure.ts             # ProviderFailure (closed) + PROVIDER_FAILURES + isProviderFailure
    index.ts                        # (additive re-exports)
  application/
    provider-adapter.ts             # ProviderAdapter port
    fake-provider-adapter.ts        # deterministic FakeProviderAdapter (+ scenario config)
    provider-rendering-service.ts   # requestProviderRendering(...) — builds request, drafts, validates
    index.ts                        # (additive re-exports)
  tests/
    provider-adapter-boundary.test.ts
    provider-rendering-service.test.ts
    provider-negative-capability.test.ts
```
[DECISION] Update `rendering/domain/index.ts` and `rendering/application/index.ts` **additively** (both already surfaced via `rendering/index.ts`). **Must not create:** `src/modules/{provider,llm,openai,anthropic,model}`, `src/{api,ui,infrastructure,providers,prompts}`, any SDK config, env-var read, or network client.

[FACT] TS-strict house rules: no constructor parameter properties (explicit fields; the deterministic `FakeProviderAdapter` is the one test-double constructor); `import type` for `decision-support`/`shared-kernel`/rendering types; `.ts` extensions; `Object.freeze`; conditional spreads for `exactOptionalPropertyTypes`; no `Date.now()` (timestamps passed in if needed); no arbitrary payload bags.

---

## 5. Types (TS-strict shapes)

### 5.1 ProviderRenderingRequest (`domain/provider-rendering-request.ts`)
```ts
import type { RenderableKind } from "./renderable-domain-output.ts";
import type { VoiceMode } from "../../decision-support/index.ts";
import type { RenderingStyle } from "./rendering-request.ts";

export interface ProviderRenderingRequest {
  readonly sourceCaseRef: string;            // = renderable.sourceCaseRef (ref, not a handle)
  readonly kind: RenderableKind;             // terminal-output kind
  readonly voice?: VoiceMode;                // domain-SELECTED voice (the ceiling), never set by provider
  readonly contentAtoms: readonly string[];  // domain-approved content
  readonly allowedClaims: readonly string[];
  readonly forbiddenClaims: readonly string[];
  readonly uncertaintyVisibleRequired: boolean;
  readonly limitations: readonly string[];
  readonly traceabilitySummary?: string;     // taken from renderable.traceability.summary; never invented
  readonly traceabilityStatus?: string;      // status label so gaps stay visible
  readonly style?: RenderingStyle;           // only a SAFE_STYLES member
  readonly locale?: string;                  // only a SUPPORTED_LOCALES member
  readonly maxLength?: number;
}

export function providerRenderingRequestFrom(request: RenderingRequest):
  | { readonly status: "built"; readonly providerRequest: ProviderRenderingRequest }
  | { readonly status: "rejected"; readonly failure: ProviderFailure };
```
[DECISION] `providerRenderingRequestFrom` is the **request-construction guard** (Decision 4 + §7): it **rejects before any provider call** when the request is unsafe — `style` ∉ `SAFE_STYLES` → `unsupported-style`; `locale` ∉ `SUPPORTED_LOCALES` → `unsupported-locale`; empty `contentAtoms`/missing kind → `unsafe-provider-request`. It copies only the **safe, domain-approved** fields above. There is **no field** for raw reasoning, chain-of-thought, mutable handles, override voice, hide-uncertainty, ignore-validation, arbitrary prompt text, or a provider payload — they are **unrepresentable**, mirroring `RenderingRequest`.

### 5.2 ProviderDraft + outcome (`domain/provider-draft.ts`)
```ts
export interface ProviderDraft {
  readonly text: string;
  readonly providerKind: string;             // e.g. "fake"
  readonly warnings: readonly string[];
}

export type ProviderDraftOutcome =
  | { readonly status: "drafted"; readonly draft: ProviderDraft }
  | { readonly status: "failed"; readonly failure: ProviderFailure };
```
[FACT] A `ProviderDraft` is **untrusted text** — it is **not** a `RenderedMessage`/`RenderedMessageRecord`/`Evidence`/`Observation`/`Understanding`/`AthleteDecision`/`DecisionSupport`, carries **no** preservation flags it sets itself, and has **no** aggregate-write path.

### 5.3 ProviderFailure (`domain/provider-failure.ts`)
```ts
export type ProviderFailure =
  | "provider-unavailable"          // fake-configurable; no real network semantics
  | "provider-timeout"              // fake-configurable; no real network semantics
  | "provider-rate-limited"         // fake-configurable; no real network semantics
  | "provider-returned-empty-draft"
  | "provider-returned-invalid-draft"
  | "provider-refused"
  | "provider-output-failed-validation"
  | "unsafe-provider-request"
  | "unsupported-locale"
  | "unsupported-style";
export const PROVIDER_FAILURES: readonly ProviderFailure[] = [/* …10… */];
export function isProviderFailure(value: unknown): value is ProviderFailure;
```
[FACT] `provider-unavailable`/`provider-timeout`/`provider-rate-limited` are **fake-configurable** (Decision 6) — testable catalog members with **no** real network behavior.

### 5.4 ProviderAdapter port (`application/provider-adapter.ts`)
```ts
import type { ProviderRenderingRequest } from "../domain/index.ts";
import type { ProviderDraftOutcome } from "../domain/index.ts";

export interface ProviderAdapter {
  readonly kind: string;                                  // descriptive, e.g. "fake"
  draft(request: ProviderRenderingRequest): ProviderDraftOutcome;
}
```
[FACT] The port returns a **draft or a failure** — never a `RenderedMessage`. A real adapter implements the same interface later.

### 5.5 FakeProviderAdapter (`application/fake-provider-adapter.ts`)
```ts
export type FakeProviderScenario =
  | "safe"
  | "voice-escalating"
  | "invented-fact"
  | "uncertainty-hidden"
  | "limitation-hidden"
  | "inquiry-as-answer"
  | "withholding-as-advice"
  | "empty-draft"
  | "unavailable"
  | "refused";

export class FakeProviderAdapter implements ProviderAdapter {
  readonly kind = "fake";
  constructor(opts?: { readonly scenario?: FakeProviderScenario }); // default "safe"
  draft(request: ProviderRenderingRequest): ProviderDraftOutcome;
}
```
[DECISION] **Deterministic**, no randomness, no external call. Per scenario: `safe` → a faithful draft (it **may reuse `fakeRenderText`**-style composition from the request's atoms so the draft passes the real validator); `voice-escalating` → recommendation-cue text when `voice !== "Recommendation"`; `invented-fact` → text containing a `forbiddenClaims` member; `uncertainty-hidden` → omits the uncertainty marker when `uncertaintyVisibleRequired`; `limitation-hidden` → omits a required limitation; `inquiry-as-answer` → declarative advice for an `inquiry`; `withholding-as-advice` → advice for a `withholding`; `empty-draft` → `{status:"failed", failure:"provider-returned-empty-draft"}`; `unavailable` → `provider-unavailable`; `refused` → `provider-refused`. (The network-flavored `provider-timeout`/`provider-rate-limited` are reachable via the same failure path if a scenario is added; they carry no real semantics.)

### 5.6 ProviderRenderOutcome + service (`application/provider-rendering-service.ts`)
```ts
import type { RenderedMessage, RenderOutcome } from "../domain/index.ts";
import type { RenderingFailure } from "../domain/index.ts";
import type { ProviderFailure } from "../domain/index.ts";

export type ProviderRenderOutcome =
  | { readonly status: "rendered"; readonly message: RenderedMessage; readonly providerKind: string;
      readonly providerWarnings: readonly string[] }
  | { readonly status: "failed"; readonly failure: ProviderFailure;
      readonly renderingFailures?: readonly RenderingFailure[] };

export function requestProviderRendering(input: {
  readonly request: RenderingRequest;        // authoritative renderable + safe constraints
  readonly provider: ProviderAdapter;
}): ProviderRenderOutcome;
```
[DECISION] `requestProviderRendering` is the application service (Decision 3/7). The `rendered` branch's `message` is **exactly** the `validateDraft` output's `message` — the existing rendering path, unchanged. On a validation failure it returns `failure: "provider-output-failed-validation"` **with** `renderingFailures` = the validator's `RenderingFailure[]` (so the specific reason is visible without expanding that union).

---

## 6. Flow (the seam, step by step)

[DECISION] `requestProviderRendering({ request, provider })`:
1. **Build + guard the provider request:** `providerRenderingRequestFrom(request)`. If `rejected` → return `{ status:"failed", failure }` (`unsafe-provider-request`/`unsupported-style`/`unsupported-locale`) — **the provider is never called**.
2. **Ask the provider for a draft:** `provider.draft(providerRequest)`. If `failed` → return `{ status:"failed", failure }` (the provider's `ProviderFailure`).
3. **Mandatory validation (unchanged gate):** `validateDraft({ draft: drafted.draft.text, renderable: request.renderable, request })`.
   - if `rendered` → return `{ status:"rendered", message, providerKind: provider.kind, providerWarnings: drafted.draft.warnings }`.
   - if `failed` → return `{ status:"failed", failure:"provider-output-failed-validation", renderingFailures: outcome.failures }`.
4. **No side effects:** the service **persists no record**, **appends no review**, **marks nothing display-eligible**, **calls no delivery**, **appends no event**, and **mutates no aggregate**. The returned `RenderedMessage` is **transient** unless a *separate* caller/workflow explicitly records it (Impl 015) — out of scope here.

[FACT] This mirrors `render(request)` exactly, with `provider.draft(...)` substituted for `fakeRender(...)` as the draft source and the same `validateDraft` as the gate.

---

## 7. Request-Construction Rules

[DECISION] `providerRenderingRequestFrom` rejects unsafe requests **before** the provider call:
- `request.style` present and not a `SAFE_STYLES` member → `unsupported-style`;
- `request.locale` present and not a `SUPPORTED_LOCALES` member → `unsupported-locale`;
- `request.renderable.contentAtoms` empty (nothing faithful to draft) → `unsafe-provider-request`;
- (kind is always present on a `RenderableDomainOutput`; a malformed renderable → `unsafe-provider-request`).

[DECISION] Unsafe instructions are **unrepresentable**, not merely rejected: because `ProviderRenderingRequest` (like `RenderingRequest`) has **no** field for override-voice / hide-uncertainty / ignore-validation / arbitrary prompt text, a caller **cannot construct** such a request except via a forced cast or invalid input — and the guard + validator catch the consequences regardless. Tests prove unsafe values cannot pass except via deliberate forced casts.

---

## 8. Validation, Persistence, Event Rules

[DECISION] **Validation:** a provider draft becomes a `RenderedMessage` **only** through the existing `validateDraft`. The provider/service **must not** call lower-level constructors to bypass validation, return a `RenderedMessage` directly, set preservation flags itself, or claim traceability preservation itself. A draft that fails validation → `provider-output-failed-validation` (+ the underlying `RenderingFailure[]`).

[DECISION] **Persistence/review/delivery:** Implementation 017 **must not** create a `RenderedMessageRecord`, save any record, append a review, mark display-eligible, call delivery, create a `DeliveryRecord`, or append event records. Provider rendering output is **transient** unless a later workflow explicitly persists a validated `RenderedMessage`. **This slice proves drafting only.**

[DECISION] **Events:** **no** event records; provider/rendering adapter files import **no `event-recording`**; **no** provider event-catalog entries; **no** event-as-command; **no** retry/telemetry event.

---

## 9. Negative Capability

[DECISION] Structurally impossible / test-failing in Impl 017: provider output **bypassing the validator**; the provider **creating a `RenderedMessage`/`RenderedMessageRecord`/`TerminalOutput`/`Recommendation`** directly; the provider **selecting/changing `VoiceMode`**, **creating allowed claims**, **removing forbidden claims**, **repairing traceability**, **removing freshness limitations**, or **updating `SupportQuality`**; provider output becoming **`Evidence`/`Observation`/`Understanding`/`AthleteDecision`**; the provider **mutating rendered-message records**, **marking display-eligible**, **calling delivery**, or **appending events**; the provider **triggering scheduler/retry/event bus**; **provider SDK/API/network code** or **prompt templates as production code**; **raw private reasoning / chain-of-thought / mutable aggregate handles / arbitrary prompt-injection fields** in the provider request. Enforced by TS-strict types (the port returns only a draft/failure; `ProviderRenderingRequest` has no unsafe field; `RenderedMessage` is only built by `validateDraft`) + §10 tests + the existing rendering structural guards.

---

## 10. Validation Strategy (tests before implementation)

[ASSUMPTION] Negative tests are **defining.**

1. a **safe** fake provider draft becomes a `RenderedMessage` **only after** `validateDraft` (source ref preserved; `providerKind` surfaced).
2. provider **voice escalation** is rejected (`provider-output-failed-validation` + `voice-escalation`).
3. provider **invented fact** is rejected (`invented-fact`).
4. provider **hidden uncertainty** is rejected (`uncertainty-hidden`).
5. provider **hidden limitation** is rejected (`limitation-hidden`).
6. provider **inquiry-as-answer** is rejected (`inquiry-rendered-as-answer`).
7. provider **withholding-as-advice** is rejected (`withholding-rendered-as-advice`).
8. provider **empty draft / failure** returns safe non-rendering (`provider-returned-empty-draft`/`provider-unavailable`/`provider-refused`; no message).
9. **unsafe provider request is rejected before the provider call** (a spy/forced-cast confirms `provider.draft` is never invoked → `unsupported-style`/`unsupported-locale`/`unsafe-provider-request`).
10. a provider draft is **not persisted as source truth** (no record/`Evidence`/`Observation` on failure).
11. a **successful** provider rendering creates **no** record/review/display-eligibility/delivery (and appends no event).
12. the provider adapter **cannot return a `RenderedMessage` directly** (the port type returns only `ProviderDraftOutcome`).
13. the provider request **exposes no** raw private reasoning / chain-of-thought / mutable aggregate handle (the type has no such field; structural).
14. **no domain mutation** (renderable/`RenderingRequest` unchanged before/after).
15. **no event-as-command** (no `event-recording` import; no event appended).
16. **no real provider SDK/API/network/prompt file** (structural guard: no `openai`/`anthropic`/`axios`/`node:http(s)`/`fetch(`/`http(s)://` token; no `src/{prompts,providers}`/`src/modules/{provider,llm,…}`).
17. **boundary/import tests:** provider files import only own `rendering` domain/application + `shared-kernel` (+ read-only `decision-support` *types*); no `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery`; no upstream module imports them.
18. **all 397 Impl 001–016 tests continue to pass.**

[DECISION] Tests 9, 12, 13, 16, 17 are the structural/typed guards; the safe-path test (1) plus the six rejection tests (2–7) prove the gate is mandatory and provider-independent.

---

## 11. Boundary Rules

[DECISION]
- Provider adapter files may import **only** their own `rendering` domain/application types + `shared-kernel` (+ read-only `decision-support` *types* if needed, type-only).
- They **must not import** `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`/`delivery` (and any `decision-support` import is **type-only**, per the existing rendering guard).
- **No upstream module imports** the provider adapter; **`rendering` is still imported by no domain module**.
- **No** `provider`/`llm`/`openai`/`anthropic`/`model` top-level module; **no** `src/{api,ui,infrastructure,providers,prompts}`; **no** external call / env-var read / network client.

[FACT] Because provider files live **inside `rendering`** and respect the above, the **existing** rendering negative-capability guard already covers them, and **no e2e `ALLOWED_MODULES` change is needed** — **no documented blocker is expected** this slice.

---

## 12. Relationship To Existing Architecture

[FACT] Builds on, without altering:
- **Impl 014** — the provider **replaces fake draft generation only**; `validateDraft` remains the mandatory, provider-independent gate.
- **Impl 015** — records persist **only validated `RenderedMessage`s**, never unsafe provider drafts; provider success does not record/review.
- **Impl 016** — delivery consumes only display-eligible records; **provider success does not deliver** (and produces no record).
- **Impl 005** — `decision-support` owns voice + terminal output; the provider reads a read-only `RenderableDomainOutput` and drafts phrasing only.
- **Impl 011** — event records are occurrence history; the provider appends none.
- **Impl 013** — a provider draft is not source material unless the athlete separately reports it back via the manual adapter.

[DECISION] The picture: **the provider sits behind `rendering` (not `decision-support`) · provider output is draft text only · the validator remains mandatory and unchanged · records/review/delivery remain separate downstream steps · the fake provider is not a real provider integration.**

---

## 13. Open Questions (do not block implementation)

[QUESTION] a future real SDK/provider choice; secret management; provider retries/rate limits; streaming; prompt format and storage; provider telemetry/audit; cost/billing limits; localization quality; provider safety evaluation beyond deterministic validation; whether provider attempts need persistence/events later.

[ASSUMPTION] None block Implementation 017: the seam is fully provable in-memory with a deterministic fake provider behind the unchanged validator.

---

## 14. Implementation Task Preview

**Implementation 017 — Add provider adapter seam with fake provider and mandatory validation.**

[DECISION] Scope: create the `rendering/domain` provider request/draft/failure types + the `rendering/application` `ProviderAdapter` port, `FakeProviderAdapter`, and `requestProviderRendering` service per §4–§8, the tests (§10), and additive index exports. **Additive only** — no existing module behavior changes; **no new top-level module** (so no e2e allowlist blocker expected).

**Acceptance criteria:**
- the **provider adapter lives inside `rendering`**; **fake provider only** (no real SDK/API/network);
- **no prompt templates as production code**, **no persistence**, **no events**, **no review/display-eligibility/delivery side effect**;
- **provider output passes `validateDraft`** — a `RenderedMessage` exists **only** via the validator; the `rendered` branch's `message` is the existing rendering path unchanged;
- the **request-construction guard rejects unsafe requests before the provider call**; provider failures + validation failures **degrade to safe non-rendering** (closed `ProviderFailure`; underlying `RenderingFailure[]` surfaced on validation failure);
- the provider request exposes **no** raw reasoning / chain-of-thought / mutable handles / override fields; the adapter **cannot** return a `RenderedMessage` directly;
- provider files import only own module + `shared-kernel` (+ read-only `decision-support` types); no `delivery`/`event-recording`/upstream import; no upstream module imports them;
- **all 397 existing tests stay green**; the new tests pass.

**The implementation must explicitly create none of:** a real provider/SDK · API keys/env reads · network/streaming · prompt templates as production code · UI/API · a `RenderedMessageRecord`/review/display-eligibility/delivery side effect · event records · a `provider`/`llm` top-level module · domain mutation.

---

## 15. Technical Constraints

[FACT] TypeScript strict; Node native test runner (`node:test` + `node:assert/strict`); **no** external test framework/framework/DB/event-bus/LLM-provider SDK/external call/real provider/prompt-templates-as-code. **No constructor parameter properties** (the deterministic `FakeProviderAdapter` is the one test-double constructor, with explicit fields). `import type` where appropriate. Explicit fields; `Object.freeze`. **No** arbitrary payload bags. **No** raw field-bag rehydration without validation. The **fake provider must be deterministic**.

---

## 16. Success Criterion

> After this tech spec, Implementation 017 can be built **without** deciding a real provider, SDK, secrets, prompts, UI, API, persistence, events, delivery, retries, or domain questions in code.

[ASSUMPTION] Answerable: the plan fixes every shape (`ProviderRenderingRequest` + the construction guard, `ProviderDraft`/`ProviderDraftOutcome`, the closed `ProviderFailure` catalog, the `ProviderAdapter` port, the deterministic `FakeProviderAdapter` scenarios, the `ProviderRenderOutcome` + `requestProviderRendering` service), the boundary location (inside `rendering`), the draft→`validateDraft` handoff (the gate reused unchanged), the safe-failure mapping, the deferred persistence/events/delivery, the boundary/guard handling, and the test contract — all satisfiable **in-memory** with a fake provider, modifying no module behavior. The future implementation answers Spec 017's question: **"Can Aurora use a provider to draft rendered text without letting the provider become the source of truth, bypass validation, or affect domain/delivery state?"** — yes: a provider drafts, the unchanged mandatory validator decides, and nothing the provider does touches the domain, records, review, display eligibility, or delivery.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the technical plan for the provider-adapter boundary. It defines a provider seam inside `rendering` that replaces only the draft-text step behind the unchanged mandatory `validateDraft`, proven with a deterministic fake provider; it adds no real provider/SDK/network/prompt/secret, no persistence/events/delivery side effect, and no new module. A provider drafts; Aurora's validator decides; the domain stays the source of truth.*

*Inputs: [Spec 017](./017-provider-adapter-boundary.md) · [Spec 014](./014-llm-rendering-boundary.md) · [Spec 014A](./014-llm-rendering-boundary-tech.md) · [Spec 015](./015-rendered-message-review-persistence.md) · [Spec 016](./016-delivery-boundary.md) · [Spec 016A](./016-delivery-boundary-tech.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 013](./013-manual-input-adapter.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [Persistence and Event Surface](../implementation-architecture/PERSISTENCE_AND_EVENT_SURFACE.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
