# Aurora — Technical Spec 035A — External Renderable Assembly Contract Admission Check Plan

> **Status (2026-06-29).** Technical Specification phase for Spec 035 (`bc3e561`). This document translates the
> Spec 035 contract's **Tier 2 (runtime admission check)** into a TS-strict implementation plan **grounded in
> the real code**. It is **plan only**: it implements no code, modifies no production code/test, edits no
> package file, amends no guard (AC20 untouched), revives no `reflection-composition` module, creates no
> top-level module, and builds no whole-core composer. Recent sequence: `52a93f4` (Impl 032R-A) → `b34f317`
> (Spec 034R) → `bc3e561` (Spec 035). Validation at authorship: `tsc --noEmit` clean; `node --test` 737/737.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — not Implementation. It plans **Implementation 035-A** and
writes no production code/test. It plans **Tier 2 only** (the structural admission pre-screen); Tier 1 stays a
caller guarantee and Tier 3 (`validateDraft`) stays the unchanged downstream gate.

---

## 1. Context recap

`[FACT]` Spec 035 (`bc3e561`) chose Option B + C: a three-tier contract for caller-supplied renderables.
Tier 2 is the **runtime admission check** — a structural pre-screen that fails closed on unsafe renderables
**before** rendering. `offlineReflectionRuntime` today performs **no** such pre-screen (it passes
`command.request` straight into render-only orchestration). This plan adds Tier 2 without owning the whole
core, calling a provider, delivering, or weakening AC20.

---

## 2. Surface Gap Analysis (grounded in real code)

Exact answers to the 18 required questions.

### 2.1 `offlineReflectionRuntime` command shape (Q1, Q2)
`OfflineReflectionRuntimeCommand<TSubmission>`: `{ submission, athleteRef, request: RenderingRequest,
operatorMediation, timing, ids? }`. The renderable enters via **`request`** (Impl 032R-A).

### 2.2 `RenderableDomainOutput` shape (Q3, Q5–Q11)
`rendering/domain/renderable-domain-output.ts`:
```ts
interface RenderableDomainOutput {
  readonly sourceCaseRef: string;            // provenance handle
  readonly kind: RenderableKind;             // "support" | "inquiry" | "withholding"
  readonly voice?: VoiceMode;                // "Silence" | "Reflection" | "Framing" | "Warning" | "Recommendation"
  readonly intent?: SupportIntent;
  readonly contentAtoms: readonly string[];
  readonly allowedClaims: readonly string[];
  readonly forbiddenClaims: readonly string[];
  readonly uncertaintyVisibleRequired: boolean;
  readonly limitations: readonly string[];
  readonly freshness?: RenderableFreshness;
  readonly traceability?: RenderableTraceability;  // { status: TraceabilityStatus; summary: string; observationSetId? } — OPTIONAL
  readonly agencyRequired: boolean;
  readonly conditions: readonly string[];
}
```

### 2.3 `RenderingRequest` shape (Q4)
`{ renderable: RenderableDomainOutput; ...optional style }`.

### 2.4 `renderableFromTerminalOutput` (Q12)
`renderableFromTerminalOutput({ sourceCaseRef, output: TerminalOutput, ... }): RenderableDomainOutput`
(rendering public surface) — the preferred production assembly path (Spec 035 Option C). It preserves
voice/kind/uncertainty/traceability from a real decision-support `TerminalOutput`.

### 2.5 `validateDraft` downstream path (Q13)
Runs **inside** `requestRealProviderRendering` (called by render-only `orchestrateRenderDeliver`): it checks
the rendered *draft* against the renderable's `allowedClaims`/`forbiddenClaims`/voice/uncertainty. Tier 3 —
unchanged, mandatory, after provider rendering.

### 2.6 Render-only orchestration behavior (Q14)
`offlineReflectionRuntime` calls `orchestrateRenderDeliver` with NO delivery input/sink, NO review, NO audit
repo, NO events → stops at `rendered` / `display-ineligible`; the runtime keys `reflection-ready` off the
rendered record. Delivery withheld; no `AthleteDecision`.

### 2.7 Current `offlineReflectionRuntime` outcome statuses (Q15)
`OfflineReflectionStatus = "reflection-ready" | "input-rejected" | "not-rendered" | "recording-failed" |
"unexpected-failure"`. `OfflineReflectionRuntimeOutcome` carries `status`, optional `reflection`,
`deliveryWithheld: true`, `mediation`, `decisionCapture`, `intake`, `trace`, `rawRetained: false`.

### 2.8 application-orchestration negative-capability guards (Q16)
`explicit-orchestration-negative-capability.test.ts`: production files must not import
`observation`/`reasoning`/`understanding`/`athlete`; rendering/delivery/event-recording only via public index;
no live transport/credential-resolver/process-env-adapter/concrete-provider internals; module owns no domain
model/repository. (Plus the Impl 032R-A offline-runtime negative-capability guard.)

### 2.9 AC20 guard constraints (Q17)
`__tests__/end-to-end-responsible-reflection.test.ts`: AC20a (no new top-level module beyond the nine
allowlisted) + AC20b (no production file imports all four core surfaces). The admission check must satisfy
both — it inspects only **rendering** types, imports no core, and adds no module.

### 2.10 Test style for fail-closed admission (Q18)
`node:test` + `node:assert/strict`; deterministic; renderables built via `req(supportRenderable(...))` /
hand-built edge cases (`noVoiceSupportRenderable`); functional + negative-capability pair.

`[FACT]` Key consequence: Tier 2 inspects **only rendering-layer structural fields** already on the
`RenderableDomainOutput` — it needs **no** upstream import, **no** whole-core ownership, and trips **neither**
AC20 nor the Impl 025 guard.

---

## 3. Central Question

> What is the smallest safe slice that pre-screens a caller-supplied `RenderableDomainOutput` /
> `RenderingRequest` before `offlineReflectionRuntime` renders it — rejecting/withholding unsafe renderables
> without owning the whole core, calling a provider, delivering, or weakening AC20?

**Answer:** a pure, synchronous `admitExternalRenderable(request)` in `application-orchestration/application/`
that inspects only the renderable's structural contract fields and returns a closed `ExternalRenderableAdmission`
(admitted / a specific rejection code). It imports only rendering types (via public index), owns no core, and
is delivered with tests; runtime wiring is a deliberately separate slice (035-B).

---

## 4. Required Technical Decisions (Engineering Playbook format)

### `[DECISION]` Decision 1 — Scope → **pure synchronous admission function + tests (Tier 2 only)**

Implementation 035-A adds a pure, synchronous structural admission check. It inspects only the contract fields
present on the renderable/request; it does **not** attempt to prove Tier 1 evidence truth and does **not**
own/sequence the whole core. `admitted` means *structurally admissible for downstream rendering validation* —
nothing more.

### `[DECISION]` Decision 2 — Placement → **`application-orchestration/application/external-renderable-admission.ts`**

It inspects only `RenderingRequest` / `RenderableDomainOutput` (rendering types via `../../rendering/index.ts`,
already allowed for application-orchestration) and is consumed by `offlineReflectionRuntime` (same module). It
imports **no** observation/reasoning/understanding/athlete → Impl 025 guard intact; adds **no** module → AC20
intact. **Not** rendering (it encodes product-runtime admission policy, e.g. the reflection voice ceiling, not
a rendering-domain rule); **not** decision-support (runtime-concern leakage + would invert nothing but is the
wrong layer); **not** a new top-level module (AC20a).

### `[DECISION]` Decision 3 — Function shape → **`admitExternalRenderable(request: RenderingRequest): ExternalRenderableAdmission` (pure, synchronous)**

Takes the `RenderingRequest` (matching the runtime command field), inspects `request.renderable`, returns the
closed admission result. No deps, no globals, no `process.env`.

### `[DECISION]` Decision 4 — Integration point → **add the pure check + tests now; wire into the runtime in 035-B**

Wiring `admitExternalRenderable` into `offlineReflectionRuntime` requires adding a new outcome disposition to
the runtime's **closed** `OfflineReflectionStatus` union (a contract change). To keep 035-A the *smallest
safe* slice and leave the runtime's outcome contract untouched, **035-A delivers the standalone, fully-tested
admission function**; **Implementation 035-B** then wires it in (calling it before render-only orchestration
and mapping a rejection to a new additive `renderable-inadmissible` runtime status — §6). This isolates the
contract change from the verifiable Tier 2 logic.

### `[DECISION]` Decision 5 — Admission outcomes → **closed `ExternalRenderableAdmission` union**

```ts
type ExternalRenderableAdmissionStatus =
  | "admitted"
  | "rejected-missing-provenance"      // sourceCaseRef empty/blank
  | "rejected-missing-traceability"    // support/inquiry without traceability.status + summary
  | "rejected-unsupported-kind"        // kind not in { support, inquiry, withholding }
  | "rejected-unsafe-voice"            // support voice missing, "Silence", or "Recommendation" (prescriptive)
  | "rejected-uncertainty-hidden"      // support/inquiry with uncertaintyVisibleRequired === false
  | "rejected-agency-missing"          // agencyRequired === false
  | "rejected-claim-fields-missing";   // allowedClaims/forbiddenClaims absent/non-array
// ExternalRenderableAdmission = { status; reason: ExternalRenderableAdmissionStatus }  — reason is the safe
// closed code only; never hidden reasoning, never raw content.
```
(Final names confirmed against code in implementation; the catalog is closed and exhaustive over the
structural checks.)

### `[DECISION]` Decision 6 — Runtime mapping (planned for 035-B) → **new additive `renderable-inadmissible` status**

When wired (035-B), `offlineReflectionRuntime` calls `admitExternalRenderable(command.request)` **before**
orchestration. On any rejection it returns **`renderable-inadmissible`** (a new additive
`OfflineReflectionStatus`) carrying the safe admission reason, with `deliveryWithheld: true`, no provider
call, no delivery, no `AthleteDecision`, no events. (Additive to the union — no existing disposition changes.)
035-A itself does not touch the runtime.

### `[DECISION]` Decision 7 — What Tier 2 can / cannot verify

**Can (structural):** `sourceCaseRef` present; `traceability` (status + summary) present for support/inquiry;
`allowedClaims`/`forbiddenClaims` present; `uncertaintyVisibleRequired === true` for support/inquiry;
`agencyRequired === true`; `kind` ∈ the safe set; `voice` within the reflection ceiling (support must not be
`Recommendation` (prescription) or `Silence`). **Cannot (Tier 1, requires the whole core):** whether evidence
actually supports `allowedClaims`; whether the caller truly followed the harness; whether confidence is
semantically justified; whether a claim is wise; whether a recommendation is high quality. Therefore:
**`admitted ≠ true`**, **`admitted ≠ evidence-backed fact`**, **`admitted ≠ recommendation quality`** —
`admitted` means only *structurally admissible for downstream rendering validation*.

### `[DECISION]` Decision 8 — Relationship to `validateDraft` → **admission is additive, never a replacement**

Order: **admission check (Tier 2) → provider rendering → `validateDraft` (Tier 3)**. Both fail closed; neither
proves recommendation quality. The admission check never bypasses or weakens `validateDraft`.

### `[DECISION]` Decision 9 — Guards / negative tests

A negative-capability test proves: AC20 unchanged; no new top-level module; no whole-core composer;
application-orchestration (incl. the new file) imports no observation/reasoning/understanding/athlete; no
`reflection-composition` module; no provider/live-transport/cloud-secret/process-env reference; no
delivery/event side effect; no `AthleteDecision` construction; package/lockfile unchanged.

---

## 5. Required File Layout (Implementation 035-A)

```text
src/modules/application-orchestration/application/external-renderable-admission.ts                 (new — production)
src/modules/application-orchestration/application/index.ts                                         (additive export)
src/modules/application-orchestration/tests/external-renderable-admission.test.ts                  (new — functional)
src/modules/application-orchestration/tests/external-renderable-admission-negative-capability.test.ts (new — guard)
```

**Must NOT create:** `src/modules/{reflection-composition,api,server,ui,frontend,worker,auth,session,db,
database,migrations}/`, `scripts/external-renderable-admission.mjs`. **Must NOT edit:** `package.json`,
`package-lock.json`, `scripts/operator-live-smoke.mjs`. (`offline-reflection-runtime.ts` is **not** edited in
035-A — wiring is 035-B.)

---

## 6. Required Functional Test Plan (035-A)

Deterministic, renderables built via the rendering fixtures + hand-built edge cases:

1. A safe renderable with all required contract fields → `admitted`.
2. (035-B) an admitted renderable still goes through downstream `validateDraft` — asserted at the runtime
   level in 035-B; in 035-A, assert `admitExternalRenderable` does not itself render/validate.
3. Empty/blank `sourceCaseRef` → `rejected-missing-provenance`.
4. support/inquiry without `traceability` (or missing status/summary) → `rejected-missing-traceability`.
5. `kind` outside { support, inquiry, withholding } → `rejected-unsupported-kind`.
6. support with `voice` = `Recommendation` (or `Silence`, or absent) → `rejected-unsafe-voice`.
7. support/inquiry with `uncertaintyVisibleRequired === false` → `rejected-uncertainty-hidden`.
8. `agencyRequired === false` → `rejected-agency-missing`.
9. missing `allowedClaims`/`forbiddenClaims` → `rejected-claim-fields-missing`.
10. a `withholding` renderable (no claims/voice) → `admitted` (a safe non-claim disposition).
11. the admission result carries only a safe closed reason code (no renderable body, no hidden reasoning).
12. the function is pure/synchronous (returns a value, not a Promise; no side effects).
13. `admitted` does not imply truth / evidence-backed fact / recommendation quality (documented assertion).

## 7. Required Negative-Capability Test Plan (035-A)

- AC20 re-asserted green (no new top-level module; no production file imports all four cores).
- The new file imports no observation/reasoning/understanding/athlete; rendering only via public index.
- No `reflection-composition` module exists.
- No provider/live-transport/cloud-secret/process-env reference; no delivery/event import; no `AthleteDecision`
  construction; no new persistence.
- No forbidden directory/script created; operator script unchanged; package/lockfile + devDependencies
  unchanged; no npm script added.

## 8. Boundary / Import Rules

**Allowed:** application-orchestration inspecting `RenderingRequest`/`RenderableDomainOutput`/`VoiceMode`/
`RenderableKind` types via `rendering/index.ts` (and `decision-support` voice type only if re-exported through
rendering — prefer rendering's re-exports to avoid a decision-support import); shared-kernel if already used;
deterministic fakes in tests. **Forbidden:** importing observation/reasoning/understanding/athlete; owning
whole-core composition; a new top-level module; reviving `reflection-composition`; provider/live-transport
import; delivery/event side effect; `AthleteDecision` creation; `process.env`; cloud-secret adapter;
package/dependency changes.

## 9. Required Distinctions

```text
external renderable ≠ truth · caller guarantee ≠ machine proof · admitted ≠ evidence-backed fact ·
admitted ≠ recommendation quality · admission check ≠ validateDraft · validateDraft ≠ recommendation quality ·
RenderableDomainOutput ≠ RenderedMessage · RenderingRequest ≠ provider call · renderable-ready ≠ validated draft ·
validated reflection ≠ AthleteDecision · delivery withheld ≠ delivery failure · delivery success ≠ athlete decision ·
provider output ≠ truth · reflection ≠ prescription · AC20 seam ≠ whole-core composer
```

## 10. Relationship To Existing Architecture

- **Spec 035** — implements its Tier 2 (admission check); Tier 1 stays a caller guarantee, Tier 3
  (`validateDraft`) unchanged.
- **Spec 034R / AC20** — no whole-core owner, no new module; the check inspects rendering types only.
- **Impl 032R-A** — the runtime keeps its injected-renderable seam; wiring the check is 035-B (additive
  `renderable-inadmissible` status).
- **Impl 025** — application-orchestration guard preserved (no upstream-core import).
- **Impl 014** — `validateDraft` remains the mandatory downstream gate.
- **decision-support voice ceiling** — `Recommendation` is the prescriptive ceiling the admission check
  rejects for an athlete-facing support reflection (Impl 006 standard: Reflection, never Recommendation).

## 11. Open Questions (deferred to Implementation 035-A / 035-B)

1. Whether to also reject a `Warning` voice or allow it (advisory, not prescriptive) — default: allow Warning,
   reject Recommendation/Silence for `support`.
2. Exact handling of `inquiry` voice (often absent) — likely voice not required for inquiry/withholding.
3. Whether `intent` carries a structurally-detectable prescription marker worth a dedicated reject code, or
   whether voice-ceiling + validateDraft suffice (default: voice-ceiling suffices; revisit if needed).
4. The exact additive runtime status name in 035-B (`renderable-inadmissible`) and its outcome fields.
5. Whether 035-B also surfaces the admission reason in the runtime trace (safe code only).

## 12. Implementation Task Preview

**Next mission: Implementation 035-A — pure external-renderable admission check.** Add
`admitExternalRenderable(request)` + `ExternalRenderableAdmission` in
`application-orchestration/application/external-renderable-admission.ts` (exported additively), with the two
test files. No runtime edit, no provider, no delivery, no `AthleteDecision`, no new module, AC20 intact.
Then **Implementation 035-B** wires it into `offlineReflectionRuntime` (additive `renderable-inadmissible`
status; admission before provider rendering; delivery withheld).

---

## 13. Success Criteria

Can Aurora plan the smallest safe slice for the Tier 2 admission check — a pure, synchronous structural
pre-screen that fails closed on unsafe caller-supplied renderables — **without** owning the whole core, calling
a provider, delivering, creating an `AthleteDecision`, adding a module, or weakening AC20? **Yes — as planned
above:** `admitExternalRenderable(request)` in `application-orchestration/application/`, inspecting only
rendering-layer contract fields, returning a closed admission result; runtime wiring isolated to 035-B; Tier 3
`validateDraft` unchanged. Validation at authorship: `tsc --noEmit` clean; `node --test` 737/737; no code,
test, package, runtime, deployment, CI, SDK, or dependency change; AC20 untouched.
