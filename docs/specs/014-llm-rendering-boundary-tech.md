# Tech Spec 014A — LLM Rendering Boundary — Implementation Plan

> The TS-strict plan for Spec 014: a new minimal **`rendering`** module that turns a domain-approved `TerminalOutput` into a `RenderedMessage` via a **deterministic fake renderer** + a **mandatory strict validator** — **no real LLM provider, prompt templates, UI, API, or external call**. The renderer may **express**; the validator guarantees it never **decides, escalates voice, strengthens a claim, hides uncertainty, or invents a fact**.
>
> Technical Specification. **No code in this slice.** Implementation begins only from the approved plan as Implementation 014.

| Field | Value |
|---|---|
| **Status** | Technical Spec · *Accepted pending review* |
| **Phase** | Technical Specification (no code; no provider; no UI/API) |
| **Implements** | [Spec 014](./014-llm-rendering-boundary.md) |
| **Builds on** | Spec/Impl 005 (voice gates) · 006 (end-to-end Reflection) · 008 (freshness) · 011 (event records) · 012 (reprojection harness) · 013 (manual input adapter) |
| **Produces (plan for)** | `src/modules/rendering/` — `RenderableDomainOutput`/`RenderingRequest`/`RenderedMessage`/`RenderingPolicy`/`RenderingFailure`/`RenderingValidator` + a deterministic fake renderer + boundary/negative tests + a neutral decision-support↔rendering integration test |
| **Explicitly excludes** | real LLM provider/API call, prompt templates as production code, UI/chat, streaming, delivery, provider adapters, rendered-message persistence, event records, model-eval infra |

[ASSUMPTION] This is **Technical Specification phase**, not Implementation. It fixes TS-strict shapes, the module location, the deterministic fake renderer, the validation rules, and the test contract so Implementation 014 contains **no open design or domain decisions** — only typing and wiring.

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

[FACT] *How can Aurora implement a rendering boundary that turns domain-approved terminal outputs into human-facing text without letting generated language become reasoning, authority, voice selection, or a source of truth?*

[FACT] The answer in code: a **dependency-minimal `rendering` module** that reads a **read-only projection** of a completed `TerminalOutput` (`RenderableDomainOutput`), runs a **deterministic fake renderer** (no model, no randomness), and passes every draft through a **mandatory validator** that can only **preserve or constrain** — rejecting any draft that escalates voice, strengthens a claim, hides uncertainty/limitations, invents a fact/citation, or turns `Inquiry`/`Withholding` into advice. It imports only `shared-kernel` + **read-only `decision-support` types**; it mutates nothing.

---

## 2. Surface Gap Analysis (read from current code)

[FACT] Verified against the repository so the plan reuses real shapes and invents nothing.

| # | Surface | Found in code | How 014 uses it |
|---|---|---|---|
| 1 | **Terminal outputs** | `decision-support`: `TerminalOutput = DecisionSupport \| Inquiry \| Withholding` (discriminant `outcome`: `"support"`/`"inquiry"`/`"withholding"`) | The renderable kind + the source of all renderable content. |
| 2 | `DecisionSupport` | `{ outcome:"support"; voice: VoiceMode; intent: SupportIntent; preservesAgency: true; uncertaintyVisible: boolean; trace: TraceabilityVerificationResult; reasons: readonly string[] }` | Supplies voice, intent, agency, uncertainty-visible, trace, reasons → renderable atoms + constraints. |
| 3 | `Inquiry` | `{ outcome:"inquiry"; question: string; whatNeeded: string; reasons: readonly string[] }` | Renderable as a **question** only; never answered. |
| 4 | `Withholding` | `{ outcome:"withholding"; reason: string }` | Renderable as a **refusal** preserving the reason. |
| 5 | `VoiceMode` | `"Silence" \| "Reflection" \| "Framing" \| "Warning" \| "Recommendation"` | The voice that may only be **matched or softened**, never escalated. |
| 6 | `SupportIntent` | `"reflect" \| "frame" \| "warn" \| "recommend"` | Tone hint for `support`; consistent with `voice`. |
| 7 | **Traceability** | `TraceabilityVerificationResult { status: TraceabilityStatus; reason: string; resolvedTo?: { observationSetId; observationIds } }` | The **only** traceability the renderer may summarize; gaps (`status`) stay visible; refs come from `resolvedTo`, never invented. |
| 8 | **Support quality / degradation** | `SupportQuality { gatesPassed; traceability: TraceabilityStatus; degraded }`; `DegradationReason`, `GateResult` | Degradation reasons → renderable **limitations**. |
| 9 | **Freshness** | `understanding`: `ProjectionFreshness { status; reasons }`; status `current/stale/partial/invalid/unknown`; `safeVoiceCeiling` | Carried into the renderable as a **local label** (Decision 3) — `rendering` does **not** import `understanding`. |
| 10 | **decision-support exports** | `decisionSupport`/`inquiry`/`withholding`, `TerminalOutput`, `VoiceMode`, `SupportIntent`, `TraceabilityVerificationResult`/`TraceabilityStatus`, `SupportQuality`, `DegradationReason`, `maxVoiceForCeiling` | `rendering` imports the **types** read-only; it never calls the gates or `selectTerminalOutput`. |
| 11 | **Module-list guard** | e2e `ALLOWED_MODULES` set rejects any new top-level module dir (tripped by `athlete`/`event-recording` before) | Impl 014 will add `"rendering"` to that allowlist — a **documented test-only blocker** (§12). |

[DECISION] **No gap blocks the slice.** Names above are authoritative; freshness rides as a local label so `rendering` stays off `understanding`. Implementation 014 must not rename them.

---

## 3. Key Architectural Decisions

### Decision 1 — No real LLM provider; a deterministic fake renderer only
[DECISION] Implement **only a deterministic fake/test renderer**. **No** call to OpenAI/Anthropic/local models/any provider; **no** prompt templates as production code.
- **Why:** this slice proves the **boundary contract**, not model quality; a provider would add infrastructure + nondeterminism; tests must be deterministic.
- **Consequence:** rendering safety is proven with **no** LLM dependency; the validator is **provider-independent**.
- **Risk:** a fake renderer hides future provider risks.
- **Mitigation:** the **validator** (not the renderer) is the guarantee — it rejects unsafe drafts regardless of origin; a future real provider must pass the **same** validator.
- **Reversal Point:** a later spec introduces a provider adapter **behind** this boundary, validated by the same contract.

### Decision 2 — A new minimal `rendering` module (downstream presentation)
[DECISION] Create `src/modules/rendering/` owning `RenderableDomainOutput`, `RenderingRequest`, `RenderedMessage`, `RenderingPolicy`, `RenderingFailure`, `RenderingValidator`, the deterministic fake renderer, and the render result types.
- **Why:** rendering is **downstream presentation, not decision-support domain**; placing it inside `decision-support` risks mixing voice selection with phrasing; rendering must not reason over or mutate aggregates.
- **Consequence:** `rendering` may import **read-only `decision-support` types**; **no existing domain module imports `rendering`**.
- **Risk:** a new module may look like production LLM integration.
- **Mitigation:** no provider/API/UI/external call; the module name + docs emphasize **boundary/presentation only**; structural guards.
- **Alternative considered:** place the first fake renderer under the neutral harness only. **Rejected** for this slice — a named module makes the boundary explicit and reusable; but the **builder/adapter that needs both a real terminal output and freshness lives in a neutral integration test** (Decision 3), keeping `rendering` off `understanding`.

### Decision 3 — A read-only renderable builder; freshness as a local label
[DECISION] `rendering` exposes `renderableFromTerminalOutput(...)` that converts a completed `TerminalOutput` (read-only type) **plus** an optional **freshness label** + allowed/forbidden claims + limitations into a `RenderableDomainOutput`. Freshness is a **module-local union** (`RenderableFreshness = "current"|"stale"|"partial"|"invalid"|"unknown"`), **not** `understanding`'s type.
- **Why:** keeps `rendering` importing only `shared-kernel` + read-only `decision-support` types; the neutral integration test composes a real case + freshness.
- **It may use:** terminal output kind, `VoiceMode`, `SupportIntent`, `TraceabilityVerificationResult`, `uncertaintyVisible`, freshness label, limitations, allowed/forbidden claims, source case ref. **It must not:** evaluate gates, select voice, create a terminal output, modify a case, or inspect raw reasoning beyond what the terminal output exposes.

### Decision 4 — The rendering policy is restrictive (constrain-only)
[DECISION] The policy can only **preserve or constrain**: it **cannot** strengthen, make hidden uncertainty invisible, or turn `Inquiry`/`Withholding` into advice. Voice may **match or soften**, never **escalate** (`maxVoice` = the domain `voice`).

### Decision 5 — Validation is mandatory
[DECISION] **Every draft** (including fake-rendered text) **must pass the validator** before becoming a `RenderedMessage`. The validator **rejects**: invented facts; voice escalation; missing uncertainty/limitations; recommendation language where not allowed; advice in `Inquiry`/`Withholding`; traceability claims not present; unsupported style/language requests that violate domain constraints. Validation is **structural/string-based** (no NLP/LLM).

---

## 4. Proposed Layout

[DECISION]
```text
src/modules/rendering/
  domain/
    renderable-domain-output.ts   # RenderableDomainOutput + RenderableFreshness + renderableFromTerminalOutput
    rendering-request.ts          # RenderingRequest + SAFE_STYLES
    rendered-message.ts           # RenderedMessage + RenderOutcome (rendered | failed)
    rendering-failure.ts          # RenderingFailure closed catalog
    rendering-policy.ts           # the constrain-only policy (voice ceiling, allowed claims, visibility)
    rendering-validator.ts        # validateDraft(...) -> RenderOutcome (the mandatory gate)
    fake-renderer.ts              # deterministic fakeRender(request) -> draft | failure; render(request) = validate(fakeRender)
    index.ts
  tests/
    rendering-boundary.test.ts            # UC1-UC4, UC6, UC8 (happy + preservation)
    rendering-validator.test.ts           # adversarial drafts: invented fact, escalation, hidden uncertainty...
    rendering-negative-capability.test.ts # structural + boundary guards
  index.ts
src/modules/__tests__/
  decision-support-rendering.test.ts      # neutral: real DecisionSupportCase -> terminal output -> renderable -> render
```

[DECISION] **Must not create:** `src/llm/`, `src/modules/{llm,openai,provider}/`, `src/api/`, `src/ui/`, `src/infrastructure/`, or any provider adapter / external call.

[FACT] TS-strict house rules: no constructor parameter properties; explicit fields; `import type` for the decision-support types; `.ts` extensions; `Object.freeze` on returned values; conditional spreads for `exactOptionalPropertyTypes`; no `Date.now()`/randomness (renderer is deterministic).

---

## 5. Types (TS-strict shapes)

### 5.1 RenderableDomainOutput (`domain/renderable-domain-output.ts`)
```ts
import type { TerminalOutput, VoiceMode, SupportIntent, TraceabilityStatus } from "../../decision-support/index.ts";

export type RenderableKind = "support" | "inquiry" | "withholding";
export type RenderableFreshness = "current" | "stale" | "partial" | "invalid" | "unknown"; // local label

export interface RenderableTraceability {
  readonly status: TraceabilityStatus;
  readonly summary: string;                 // human-readable, from the domain reason — never invented
  readonly observationSetId?: string;       // only if resolvedTo present
}

export interface RenderableDomainOutput {
  readonly sourceCaseRef: string;
  readonly kind: RenderableKind;
  readonly voice?: VoiceMode;               // present for support
  readonly intent?: SupportIntent;          // present for support
  readonly contentAtoms: readonly string[]; // domain-approved content (reasons / question+whatNeeded / reason)
  readonly allowedClaims: readonly string[];
  readonly forbiddenClaims: readonly string[];
  readonly uncertaintyVisibleRequired: boolean;
  readonly limitations: readonly string[];  // degradation reasons / freshness reasons
  readonly freshness?: RenderableFreshness;
  readonly traceability: RenderableTraceability;
  readonly agencyRequired: boolean;         // from preservesAgency
  readonly conditions: readonly string[];   // qualifiers a Recommendation must keep
  readonly maxVoice: VoiceMode;             // the ceiling: rendered tone may not exceed this
}

export function renderableFromTerminalOutput(input: {
  readonly sourceCaseRef: string;
  readonly output: TerminalOutput;
  readonly freshness?: RenderableFreshness;
  readonly limitations?: readonly string[];
  readonly allowedClaims?: readonly string[];
  readonly forbiddenClaims?: readonly string[];
}): RenderableDomainOutput;
```
[DECISION] It **must not** include raw private reasoning internals, arbitrary hidden facts, unbounded prompt text, new recommendations, or mutable aggregate refs. `maxVoice` = the output's `voice` (or `Silence`/none for inquiry/withholding).

### 5.2 RenderingRequest (`domain/rendering-request.ts`)
```ts
export type RenderingStyle = "shorter" | "longer" | "clearer" | "warmer" | "more-formal";
export const SAFE_STYLES: readonly RenderingStyle[] = ["shorter", "longer", "clearer", "warmer", "more-formal"];

export interface RenderingRequest {
  readonly renderable: RenderableDomainOutput;
  readonly locale?: string;        // only a supported locale; else unsupported-language-request
  readonly style?: string;         // validated against SAFE_STYLES; unknown (e.g. "be decisive") -> failure
  readonly maxLength?: number;
  readonly audience?: string;      // domain-approved context only
}
```
[DECISION] The request type has **no** field for overriding voice / hiding uncertainty / ignoring traceability / "being decisive", and **no** open prompt/bag. `style` is a string validated against the closed `SAFE_STYLES`; an escalation request like `"be decisive"` is **not** in the set → `unsupported-style-request` (UC5).

### 5.3 RenderedMessage + outcome (`domain/rendered-message.ts`)
```ts
export interface RenderedMessage {
  readonly text: string;
  readonly sourceRef: string;            // = renderable.sourceCaseRef
  readonly kind: RenderableKind;         // preserved
  readonly voice?: VoiceMode;            // preserved
  readonly uncertaintyPreserved: boolean;
  readonly limitationsPreserved: boolean;
  readonly traceabilityPreserved: boolean;
  readonly warnings: readonly string[];
}

export type RenderOutcome =
  | { readonly status: "rendered"; readonly message: RenderedMessage }
  | { readonly status: "failed"; readonly failures: readonly RenderingFailure[] };
```
[DECISION] A `RenderedMessage` is **not domain authority** — downstream presentation only; it is never re-ingested as truth (Spec 014 §7).

### 5.4 RenderingFailure (`domain/rendering-failure.ts`)
```ts
export type RenderingFailure =
  | "missing-terminal-output"
  | "missing-traceability"
  | "voice-escalation"
  | "invented-fact"
  | "uncertainty-hidden"
  | "limitation-hidden"
  | "withholding-rendered-as-advice"
  | "inquiry-rendered-as-answer"
  | "recommendation-created-by-renderer"
  | "unsupported-style-request"
  | "unsupported-language-request"
  | "unsafe-rendering-request";

export const RENDERING_FAILURES: readonly RenderingFailure[] = [/* …all 12… */];
```

### 5.5 FakeRenderer (`domain/fake-renderer.ts`)
```ts
export function fakeRender(request: RenderingRequest): { readonly status: "draft"; readonly text: string }
  | { readonly status: "failed"; readonly failures: readonly RenderingFailure[] };

/** The public entry: deterministic draft, then MANDATORY validation. */
export function render(request: RenderingRequest): RenderOutcome; // = validateDraft(fakeRender(...), request)
```
[DECISION] The fake renderer is **deterministic** (no external call, no model, no randomness): it composes the draft from `renderable.contentAtoms` via fixed per-kind/voice templates (e.g. inquiry → "<question> (<whatNeeded>)"; withholding → "Aurora is not offering guidance here: <reason>"; reflection → reflective framing of `reasons`). It produces only faithful drafts; the **validator** is what proves safety against adversarial drafts (tested directly).

### 5.6 RenderingValidator (`domain/rendering-validator.ts`)
```ts
export function validateDraft(input: {
  readonly draft: string;
  readonly renderable: RenderableDomainOutput;
  readonly request: RenderingRequest;
}): RenderOutcome;
```
[DECISION] Structural/string-based checks (§7); returns `rendered` (with the preserved flags + any warnings) or `failed` (with the closed failures).

---

## 6. Terminal Output Mapping Rules

[DECISION]
- **`support` + `Reflection`/`Framing`** → reflective/framing language; **no** command/advice ("you should", "must", "do") — those tokens are allowed **only** when `voice === "Recommendation"`.
- **`support` + `Warning`** → preserve caution + the domain reason; **no** recommendation created.
- **`support` + `Recommendation`** → may phrase a clear recommendation, but **must** preserve `conditions`, uncertainty, traceability, and agency (`agencyRequired`).
- **`inquiry`** → render the question(s)/clarification request only; **do not** answer, recommend, or infer a likely answer.
- **`withholding`** → render a safe withholding explanation preserving the reason/limitation; **no** advice, **no** implied hidden recommendation.

---

## 7. Validation Rules (the mandatory gate)

[DECISION] `validateDraft` enforces (structural; no NLP):
1. **kind preserved** — inquiry draft reads as a question (and is not an answer); withholding draft states non-guidance; support draft matches its voice.
2. **voice preserved or softened, never escalated** — recommendation-cue tokens (`RECOMMENDATION_CUES`) appear **only** if `renderable.voice === "Recommendation"`; else → `voice-escalation` (support) / `recommendation-created-by-renderer`.
3. **`Inquiry` stays inquiry** — answer/recommendation cues in an inquiry draft → `inquiry-rendered-as-answer`.
4. **`Withholding` stays withholding** — advice cues in a withholding draft → `withholding-rendered-as-advice`.
5. **uncertainty visible** — if `uncertaintyVisibleRequired`, the draft must include an uncertainty marker (echo a limitation / known marker); else → `uncertainty-hidden`.
6. **limitations visible** — if `limitations` non-empty, the draft must reference them; else → `limitation-hidden`.
7. **traceability gaps visible** — if `traceability.status` is incomplete/missing, the draft must not claim completeness; missing required trace → `missing-traceability`.
8. **no invented facts** — the draft must not contain any `forbiddenClaims` string (and, for citations, no source id outside `traceability.observationSetId`); violation → `invented-fact`.
9. **request safety** — `style` ∉ `SAFE_STYLES` → `unsupported-style-request`; unsupported `locale` → `unsupported-language-request`; a structurally impossible request → `unsafe-rendering-request`.
10. **missing inputs** — absent/empty terminal content → `missing-terminal-output`.

[DECISION] On success it returns `{ status:"rendered", message }` with `uncertaintyPreserved`/`limitationsPreserved`/`traceabilityPreserved` set true and any soft notes in `warnings`. On any check failing → `{ status:"failed", failures }` (safe non-render; **invariant 20**).

---

## 8. Event Recording & Persistence Rules

[DECISION] **No event records** in Implementation 014 (no `RenderedMessageCreated`); if ever added, it is **future work**, ref-only, never a command. **No rendered-message persistence** (no repository); a `RenderedMessage` is **returned as an output object only**. The renderer **mutates no aggregate** and writes nothing.

---

## 9. Negative Capability

[DECISION] The implementation makes these structurally impossible or test-failing: the renderer selects `VoiceMode`; creates a `TerminalOutput`/`Recommendation`/`AthleteDecision`; turns `Inquiry`/`Withholding` into advice; strengthens `Reflection`/`Framing` into `Recommendation`; hides uncertainty/freshness limitations; invents facts/traceability; cites unavailable sources; mutates aggregates; writes event-as-command; turns text into `Evidence`; overwrites `Purpose`; scores compliance; imports `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`; or introduces a real LLM provider/API/UI/external integration. Enforced by TS-strict types (no override/escalate fields; closed unions) + the §10 tests.

---

## 10. Validation Strategy (tests before implementation)

[ASSUMPTION] Negative tests are **defining**.

1. `Reflection` renders without recommendation language.
2. `Inquiry` remains inquiry (question preserved, not answered).
3. `Withholding` remains withholding (reason preserved).
4. `Recommendation` preserves conditions + agency.
5. a style request `"be decisive"` cannot escalate voice → `unsupported-style-request`.
6. uncertainty/freshness/limitations preserved and visible.
7. an invented fact (a `forbiddenClaims` phrase in a hand-crafted draft) → `invented-fact` (validator tested directly).
8. missing/incomplete traceability preserved → `missing-traceability` / gaps kept.
9. incomplete traceability constrains rendering (no completeness claim).
10. a rendered message **references its source domain output** (`sourceRef`).
11. a rendered message is **not** domain truth (type carries no aggregate write path; not re-ingested).
12. **no aggregate mutation** (a neutral test: rendering a real case leaves repos unchanged).
13. **no event-as-command** (no event API used by rendering).
14. the **fake renderer is deterministic** (same request → same text).
15. the **validator rejects** an adversarial unsafe draft for each failure kind.
16. **no real LLM provider/API/UI file** (structural guard; no `src/{llm,api,ui}` / `src/modules/{llm,openai,provider}`).
17. **boundary/import** tests (§11).
18. **all 317 Impl 001–013 tests continue to pass.**

---

## 11. Boundary Rules

[DECISION]
- `rendering` **must not import** `observation`/`reasoning`/`understanding`/`athlete`/`event-recording`.
- `rendering` **may import only** `shared-kernel` + **read-only `decision-support` types** (`import type`).
- `decision-support` **must not import** `rendering`; **no existing domain module imports `rendering`**.
- **Neutral integration tests** (`__tests__/`) may compose `decision-support` + `rendering` (+ a freshness label).
- **No** LLM/API/UI/infrastructure layer.

[FACT] Adding a top-level `rendering` module will trip the e2e `ALLOWED_MODULES` guard (as `athlete`/`event-recording` did) → Impl 014 adds `"rendering"` to that allowlist: a **documented, test-only blocker fix**, no production module modified.

---

## 12. Relationship To Existing Architecture

[FACT] Builds on, without altering: **Impl 005** (`decision-support` owns voice + terminal output; the renderer reads, never constructs), **Impl 006** (the demonstrated `Reflection` output is exactly a `RenderableDomainOutput`; rendering it stays Reflection), **Impl 008** (freshness limitations stay visible), **Impl 011/012** (rendering writes no event and triggers no reprojection), **Impl 013** (manual input is source material; **rendered text is not source material** unless the athlete reports it back via the manual adapter).

---

## 13. Open Questions (do not block implementation)

[QUESTION] future provider choice + isolation; prompt format; localization strategy; tone/style catalog; rendered-message persistence; rendered-output event records; a human approval workflow; UI display of traceability/limitations; API delivery; safety evaluation beyond deterministic tests.

[ASSUMPTION] None block Implementation 014: the boundary + validator are fully testable with a deterministic fake renderer.

---

## 14. Implementation Task Preview

**Implementation 014 — Add a deterministic rendering boundary and validator.**

[DECISION] Scope: create `src/modules/rendering/` per §4–§7, the deterministic fake renderer + mandatory validator, the tests (§10), and the neutral decision-support↔rendering integration test. **Additive** — the only existing-file change expected is the **documented `ALLOWED_MODULES` allowlist fix** (test-only).

**Acceptance criteria:**
- `render(request)` returns `RenderOutcome` (`rendered` with a `RenderedMessage`, or `failed` with closed `RenderingFailure`s);
- `Reflection`/`Framing`/`Warning` never render as a recommendation; `Recommendation` preserves conditions + agency;
- `Inquiry` stays a question; `Withholding` stays a refusal;
- uncertainty/freshness/limitations/traceability gaps stay visible; invented facts/citations and voice escalation are **rejected**;
- a `"be decisive"` style → `unsupported-style-request`; the fake renderer is **deterministic**; the **validator is mandatory** (no `RenderedMessage` without passing it);
- a `RenderedMessage` references its source output, is **not** domain truth, and rendering **mutates no aggregate** and writes **no event**;
- `rendering` imports only `shared-kernel` + read-only `decision-support` types; no domain module imports `rendering`;
- **all 317 existing tests stay green**; the new tests pass.

**The implementation must explicitly create none of:** real LLM provider · API · UI · external call · prompt templates as production code · event records · rendered-message repository · voice selection · `TerminalOutput` creation · domain mutation.

---

## 15. Technical Constraints

[FACT] TypeScript strict; Node native test runner (`node:test` + `node:assert/strict`); **no** external test framework/framework/DB/event-bus/LLM/external call. **No constructor parameter properties.** `import type` for decision-support types. Explicit fields; `Object.freeze` on returned values. **No** arbitrary payload bags. **No** raw field-bag rehydration without validation. Renderer **deterministic** (no `Date.now()`/randomness).

---

## 16. Success Criterion

> After this tech spec, Implementation 014 can be built **without** deciding provider, prompt, UI, API, persistence, or domain questions in code.

[ASSUMPTION] Answerable: the plan fixes every shape (`RenderableDomainOutput`/`RenderingRequest`/`RenderedMessage`/`RenderingPolicy`/`RenderingFailure`/`RenderOutcome`), the module location, the deterministic fake renderer, the mandatory constrain-only validator (voice never escalates; claims bounded; uncertainty/limitations/traceability visible; inquiry/withholding preserved; invented facts/citations rejected; unsafe requests refused; safe non-render on failure), the boundary, and the test contract — all satisfiable **with no provider** and modifying no module behavior. The future implementation answers Spec 014's question: **"Can Aurora render domain-approved output into human-facing text without letting generated language become reasoning, authority, or voice selection?"** — yes: a deterministic, validated renderer that expresses the domain's decision and never makes one.

---

*Discovery is incomplete by nature. The tags exist so we know where it is incomplete.*

*This is the technical plan for the first output-rendering boundary. It defines a dependency-minimal `rendering` module with a deterministic fake renderer and a mandatory constrain-only validator; it chooses no LLM provider, prompt, UI, or API, persists nothing, writes no event, and keeps rendering downstream presentation — express the domain's decision, never make one.*

*Inputs: [Spec 014](./014-llm-rendering-boundary.md) · [Spec 005](./005-decision-support-voice.md) · [Spec 006](./006-end-to-end-responsible-reflection.md) · [Spec 008](./008-projection-refresh-staleness-strategy.md) · [Spec 011](./011-domain-event-outcome-records-traceability-envelope.md) · [Spec 012](./012-reprojection-harness.md) · [Spec 013](./013-manual-input-adapter.md) · [Core Completion Review](../implementation-architecture/CORE_COMPLETION_REVIEW.md) · [Technical Boundary Map](../implementation-architecture/TECHNICAL_BOUNDARY_MAP.md) · [System Map](../diagrams/SYSTEM_MAP.md) · Process: [spec-process.md](./spec-process.md)*
