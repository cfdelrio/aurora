# Aurora — Technical Spec 040A — Session Envelope / Redaction Contract Implementation Plan

> **Status (2026-06-29).** Technical Specification phase for Spec 040 (`fa829e2`). It translates the session
> envelope / redaction contract into a TS-strict implementation plan **grounded in the real code**. It is **plan
> only**: it implements no code, modifies no production code/test, edits no package file, adds no CLI/runtime
> shell/script/package command, adds no API/UI/worker/DB/auth/deployment/CI/SDK file, amends no guard (AC20
> untouched), and creates no production whole-core composer. Recent sequence: `cba9ec4` (Impl 039-A) → `bfb9c98`
> (Docs) → `dbc3e00` (Roadmap checkpoint) → `fa829e2` (Spec 040). Validation at authorship: `tsc --noEmit` clean;
> `node --test` 810/810.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — not Implementation. It plans **Implementation 040-A** and writes
no code/test.

---

## 1. Context recap

`[FACT]` Spec 040 decided (Option A + B-deferred): a future operator invocation surface must expose a **stable,
whitelisted, reference-only envelope** derived from `OfflineReflectionRuntimeOutcome` — preserving exact
disposition, `deliveryWithheld: true`, `rawRetained: false`, safe refs/reason codes, and a redacted trace summary,
while always excluding raw provider output, hidden reasoning, secrets, delivery artifacts, and any
`AthleteDecision`. This plan decides *how* (if at all) to realize that contract in code.

---

## 2. Real-Code Gap Analysis (grounded; no invented type names)

1. **`OfflineReflectionRuntimeOutcome` shape (Q1).** `{ status: OfflineReflectionStatus; reflection?:
   SafeReflectionProjection; deliveryWithheld: true; mediation: { operatorRef: string }; decisionCapture:
   DecisionCapturePrompt; intake: { status: ManualReflectionIntakeOutcome["status"] }; admissionReason?:
   ExternalRenderableRejectionReason; trace: OrchestrationTrace; rawRetained: false }`
   (`application-orchestration/application/offline-reflection-runtime.ts`).
2. **`OfflineReflectionStatus` union (Q2).** `reflection-ready | input-rejected | renderable-inadmissible |
   not-rendered | recording-failed | unexpected-failure` (+ `OFFLINE_REFLECTION_STATUSES`).
3. **`reflection-ready` outcome (Q3).** `reflection` present, `deliveryWithheld: true`, `decisionCapture`
   invitation, `trace.renderedMessageRecordId` set, `rawRetained: false`.
4. **`renderable-inadmissible` outcome (Q4).** `admissionReason` (safe code), `deliveryWithheld: true`,
   `trace.stoppedAt: "stopped"`, `trace.renderedMessageRecordId: undefined`, no `reflection`.
5. **`not-rendered` outcome (Q5).** no `reflection`, `deliveryWithheld: true`, `decisionCapture` invitation,
   `trace` reflecting provider-not-rendered (safe `trace.reasonCode` may be set).
6. **`input-rejected` outcome (Q6).** no `reflection`, `deliveryWithheld: true`, `intake.status` safe summary,
   stops before admission/rendering (`trace.renderedMessageRecordId: undefined`).
7. **`recording-failed` outcome (Q7).** safe stop; no `reflection`; `deliveryWithheld: true`; `decisionCapture`
   invitation; safe `trace`/code only (not deterministically reachable without production changes).
8. **`unexpected-failure` outcome (Q8).** safe stop; safe result, no raw content; same safe-field posture as Q7
   (not deterministically reachable without production changes).
9. **`SafeReflectionProjection` shape (Q9).** `{ text: string; kind: RenderableKind; voice?: string; presentedAs:
   "reflection"; uncertaintyPreserved: boolean; limitationsPreserved: boolean; traceabilityPreserved: boolean;
   validationPassed: true }` — note the `text` (display-eligible) must **not** be carried into the envelope.
10. **`decisionCapture` shape (Q10).** `DecisionCapturePrompt = { kind: "athlete-decision-invitation"; athleteRef:
    string; acceptableSources: readonly ["athlete-declared", "athlete-reported"] }` — invitation/ref only.
11. **`mediation` shape (Q11).** `{ operatorRef: string }` — operational marker, never decision ownership.
12. **`intake` shape (Q12).** `{ status: ManualReflectionIntakeOutcome["status"] }` — safe summary only.
13. **`OrchestrationTrace` shape (Q13).** `{ stoppedAt: OrchestrationStage; providerAttemptRecordId?;
    renderedMessageRecordId?; renderReviewId?; displayEligibility?: "eligible"|"ineligible"; deliveryRequestId?;
    deliveryRecordId?; eventRecordIds?; reasonCode? }` — all ref ids / safe codes.
14. **`admissionReason` type (Q14).** `ExternalRenderableRejectionReason = Exclude<ExternalRenderableAdmissionStatus,
    "admitted">` (8 closed codes), exported from `external-renderable-admission.ts`.
15. **`rawRetained` type/value (Q15).** literal `false` on the outcome — redacted-by-design.
16. **Local `OperatorInvocationResult` (Q16).** Defined **inside** `__tests__/thin-operator-invocation-surface.test.ts`:
    `{ status; deliveryWithheld: true; rawRetained: false; reflectionRef?; decisionCapture: { kind; athleteRef;
    acceptableSources }; admissionReason?; safeReason?; traceSummary: { stoppedAt; renderedMessageRecordId?;
    displayEligibility? } }`. **Local test type — not exported, free to drift.**
17. **Local `traceSummary` mapping (Q17).** `{ stoppedAt: String(trace.stoppedAt), renderedMessageRecordId?,
    displayEligibility? }`; `reflectionRef` = `trace.renderedMessageRecordId` (reflection-ready only); `safeReason`
    = `trace.reasonCode`.
18. **Current application-orchestration exports (Q18).** `index.ts` → `application/index.ts` re-exports
    `offlineReflectionRuntime`, `OFFLINE_REFLECTION_STATUSES`, `OfflineReflectionRuntimeOutcome`,
    `OfflineReflectionStatus`, `admitExternalRenderable`, `EXTERNAL_RENDERABLE_ADMISSION_STATUSES`,
    `ExternalRenderableRejectionReason`, etc. **All envelope inputs are already publicly exported there.**
19. **Negative-capability guard style (Q19).** Sibling `*-negative-capability.test.ts` files read the production
    source as text (with a `stripComments` helper to scan code-only) and assert forbidden imports/symbols absent;
    harnesses also JSON-scan outcomes for banned substrings. The Impl 025 guard:
    `application-orchestration/application/*` production files import **no** upstream core (observation/reasoning/
    understanding/athlete) — confirmed still true.
20. **Redaction utilities today (Q20).** **None dedicated.** Redaction is **structural** (the outcome is already
    safe). A mapper would be the first dedicated whitelist projection.

`[FACT]` Decisive consequence: every envelope input is already publicly exported from `application-orchestration`,
and that module's production files import no upstream core — so a **pure, synchronous mapper + a small type** can
live there **import-safe**, owning no domain and calling nothing (no runtime/provider/delivery/whole-core). The
mapper turns Spec 040's contract from a *local test type* into an **enforceable whitelist** — concrete safety, not
ceremony — independent of any caller. (A *helper that invokes the runtime* would still be ceremony without a
caller; the **mapper is not that** — it is a pure projection.)

---

## 3. Central Question

> Should the session envelope/redaction contract be implemented now as a **production type/mapper**, remain
> **test-fixtured**, or stay **documented-only** — preserving whitelist exposure, reference-only output, no raw
> provider output / hidden reasoning / secrets / delivery artifact / `AthleteDecision`, no default live call,
> delivery-withheld semantics, and AC20?

**Answer:** implement now as a **production application-level pure type + mapper** in `application-orchestration`
(`OperatorSessionEnvelope` + `toOperatorSessionEnvelope(outcome): OperatorSessionEnvelope`), with tests +
negative-capability guards. It makes the whitelist **enforceable** before any helper/CLI/API exists, calls
nothing, and depends only on already-exported types. A production **invocation helper** (that runs the runtime)
stays **deferred** (no caller yet); the mapper is a pure projection, not a helper.

---

## 4. Required Technical Decisions (Engineering Playbook format)

### `[DECISION]` Decision 1 — Implementation scope → **Option C: production type + pure mapper (no helper)**

Implementation 040-A adds a **pure, synchronous** production mapper `toOperatorSessionEnvelope(outcome:
OfflineReflectionRuntimeOutcome): OperatorSessionEnvelope` + the `OperatorSessionEnvelope` type, in
`application-orchestration/application/`, with tests + a negative-capability guard. Rejected: **A**
(documented-only) — leaves the whitelist unenforceable and the 039-A type local/drifting; **B** (test-fixtured
only) — same drift risk; a *pure* mapper carries no caller-dependency, so the "no caller yet" reason that deferred
a helper does **not** apply; **D** (production invocation helper that returns the envelope) — a helper *invokes*
the runtime and is ceremony without a caller (deferred to a future spec that may use this mapper); **E** (CLI/
script/API) — premature surface; **F** (persistence/session-record) — persistence deferred. The mapper adds real
safety (one enforced whitelist) while calling no runtime/provider/delivery and assembling no whole-core.

### `[DECISION]` Decision 2 — Placement → **`src/modules/application-orchestration/application/operator-session-envelope.ts`** (+ `application/index.ts` export)

The envelope projects an **application runtime outcome**, so it belongs in the `application-orchestration`
application layer (where `OfflineReflectionRuntimeOutcome` / `ExternalRenderableRejectionReason` already live and
are exported). **Not** `rendering` (not a rendering artifact); **not** a new `src/modules/session` top-level module
(AC20a); **not** inside `offline-reflection-runtime.ts` (keep the pure projection separate from the runtime). The
production file must import **only** its own application/runtime outcome + admission-reason types (+ shared-kernel
if needed) — **no upstream core** (Impl 025 guard).

### `[DECISION]` Decision 3 — Type and mapper names → **`OperatorSessionEnvelope` + `toOperatorSessionEnvelope(...)`**

`export interface OperatorSessionEnvelope { ... }` and `export function toOperatorSessionEnvelope(outcome:
OfflineReflectionRuntimeOutcome): OperatorSessionEnvelope`. The mapper is **pure and synchronous** (no async, no
I/O, no `Date.now`, no `process.env`). (Repo-consistent with `renderableFromTerminalOutput`-style
`toX(input): X` naming.)

### `[DECISION]` Decision 4 — Envelope field shape → **stable, whitelisted, reference-only**

```text
export interface OperatorSessionEnvelope {
  readonly status: OfflineReflectionStatus;        // exact runtime status — no rename
  readonly deliveryWithheld: true;                 // always true
  readonly rawRetained: false;                     // always false
  readonly reflectionRef?: string;                 // reflection-ready only — a REF (trace.renderedMessageRecordId), never reflection.text
  readonly reflectionFlags?: {                     // reflection-ready only — safe booleans, no text
    readonly validationPassed: true;
    readonly uncertaintyPreserved: boolean;
    readonly limitationsPreserved: boolean;
    readonly traceabilityPreserved: boolean;
  };
  readonly decisionCapture: {                      // invitation/ref ONLY — never an AthleteDecision
    readonly kind: "athlete-decision-invitation";
    readonly athleteRef: string;
    readonly acceptableSources: readonly ["athlete-declared", "athlete-reported"];
  };
  readonly admissionReason?: ExternalRenderableRejectionReason; // renderable-inadmissible only — safe closed code
  readonly safeReason?: string;                    // closed code from trace.reasonCode — never raw text
  readonly intakeStatus: string;                   // intake.status — safe summary code only
  readonly mediation: { readonly operatorRef: string }; // operational marker — not decision ownership
  readonly traceSummary: {                         // ref-only whitelist subset of OrchestrationTrace
    readonly stoppedAt: string;
    readonly renderedMessageRecordId?: string;
    readonly displayEligibility?: "eligible" | "ineligible";
  };
}
```

The mapper **constructs a new object field-by-field** (whitelist) — it **never spreads** the raw outcome. It
exposes **no** `reflection.text`, raw provider output, hidden reasoning, secret, delivery id
(`deliveryRecordId`/`deliveryRequestId`), `eventRecordIds`, raw exception/stack, or `AthleteDecision`.

### `[DECISION]` Decision 5 — Disposition mapping → **per §040 §7, exact statuses, no rename**

- **reflection-ready** → `reflectionRef` (= `trace.renderedMessageRecordId`) + `reflectionFlags`; `decisionCapture`
  invitation; `traceSummary` with `renderedMessageRecordId`/`displayEligibility`. Operator: a validated, withheld
  reflection exists; review manually; invite (never create) a decision.
- **renderable-inadmissible** → `admissionReason`; `traceSummary.stoppedAt: "stopped"`; no `reflectionRef`.
  Operator: stop; do not strip safety to force admission.
- **not-rendered** → `safeReason?` (closed); no `reflectionRef`. Operator: stop/revise; provider output not safe;
  no delivery.
- **input-rejected** → `intakeStatus`; no admission/render fields; no `reflectionRef`. Operator: correct input.
- **recording-failed** / **unexpected-failure** → `safeReason?` (closed) only; no `reflectionRef`, no raw
  exception/stack. Operator: safe stop; nothing delivered or decided. (Mapped by shape; mapper handles them even
  though they are not deterministically forced in tests — see Decision 6.)

### `[DECISION]` Decision 6 — Redaction rule implementation → **whitelist construction + tests**

The mapper builds the envelope by **explicit field assignment** (never `{ ...outcome }`). Tests prove: no
`reflection`/`text` field; no raw provider output; no error-stack field; no secrets; no `AthleteDecision` field; no
delivery id; no `eventRecordIds`. A JSON banned-substring scan (as 036-A/038-A/039-A) backstops the field checks.
`recording-failed`/`unexpected-failure` are exercised by **constructing outcome fixtures** of those statuses
(plain objects matching the type) and asserting the mapper redacts to safe codes only — no production change
needed to reach them.

### `[DECISION]` Decision 7 — Relationship to invocation helper → **none (mapper/type only)**

Implementation 040-A adds **no** invocation helper. The mapper is a pure projection; a future Spec/Tech Spec may
define a helper (or wire it into the 039-A-style seam) **using** this mapper. The local 039-A
`OperatorInvocationResult` stays as-is (its own test); 040-A does not modify it.

### `[DECISION]` Decision 8 — Guards → **a new negative-capability test mirroring the existing style**

Add `operator-session-envelope-negative-capability.test.ts` proving the production file: imports no upstream core
(observation/reasoning/understanding/athlete); imports no delivery/provider/event production internals beyond the
types it needs; reads no `process.env`; references no `Date.now`/`Math.random`; is pure/synchronous; and is not a
whole-core composer. Plus the mapper tests assert no raw leakage. All existing guards (AC20, Impl 025,
scripts/package) stay green unchanged.

---

## 5. Required File Layout (Implementation 040-A)

```text
src/modules/application-orchestration/application/operator-session-envelope.ts                 (new — OperatorSessionEnvelope + pure toOperatorSessionEnvelope)
src/modules/application-orchestration/application/index.ts                                      (edit — export the type + mapper)
src/modules/application-orchestration/tests/operator-session-envelope.test.ts                   (new — mapping + redaction tests)
src/modules/application-orchestration/tests/operator-session-envelope-negative-capability.test.ts (new — guard)
```

**Must NOT create:** `src/modules/{session,runtime,api,server,ui,frontend,worker,auth,db}/`,
`scripts/operator-session.mjs`, `scripts/run-operator-session.mjs`. **Must NOT edit:** `package.json`,
`package-lock.json`, `scripts/operator-live-smoke.mjs`. **Must NOT integrate with:** a deployment target, provider
selection, cloud-secret adapters, delivery sinks, event persistence, an auth/session/user system. **Must NOT
modify** `offline-reflection-runtime.ts` (the mapper is separate; it only consumes the exported outcome type).

*(If Decision 1 were ever downgraded to Option B, the layout would instead be a single
`src/modules/__tests__/session-envelope-redaction-contract.test.ts` test-fixtured mapper — not chosen here, since
a pure production mapper adds enforceable safety with no caller dependency.)*

---

## 6. Required Test Plan (Implementation 040-A)

1. `reflection-ready` maps to a reference-only envelope.
2. `reflection-ready` excludes `reflection.text`.
3. `reflection-ready` includes only `reflectionRef` + safe `reflectionFlags`.
4. `decisionCapture` is invitation/ref only.
5. `renderable-inadmissible` maps `admissionReason` safely.
6. `not-rendered` maps without raw provider output or invalid draft.
7. `input-rejected` maps `intakeStatus` (safe code) only.
8. `recording-failed` maps safe code only (constructed fixture).
9. `unexpected-failure` maps safe code only and excludes any stack (constructed fixture).
10. `deliveryWithheld` is preserved (`true`).
11. `rawRetained` is `false`.
12. the mapper does not spread the raw outcome (field-by-field whitelist).
13. excludes raw provider output; 14. excludes hidden reasoning; 15. excludes secrets; 16. excludes delivery
    artifact (ids); 17. excludes `AthleteDecision`.
18. the mapper is pure/synchronous (same input → same output; no async).
19. no provider/live call; 20. no delivery sink; 21. no decision capture; 22. no event persistence; 23. no
    `process.env`.
24. `offlineReflectionRuntime` unchanged; 25. package/lockfile unchanged; 26. AC20 remains green; all existing
    tests remain green.

---

## 7. Boundary / Import Rules

**Allowed (production mapper):** `application-orchestration` importing its own `OfflineReflectionRuntimeOutcome` /
`OfflineReflectionStatus` / `ExternalRenderableRejectionReason` (already exported) + shared-kernel if needed; tests
using **deterministic outcome fixtures** (plain objects matching the types — no runtime invocation needed, though
the existing runtime may be invoked in a test to produce a real outcome). **Forbidden:** a production whole-core
composer; a `reflection-composition` module; `application-orchestration` production files importing upstream core;
a CLI/runtime shell; a script/package command; an API/UI/operator tool; automatic delivery / live provider /
real-secret resolution / `AthleteDecision` creation; DB/auth/session/deployment files; SDK/dependency changes.

---

## 8. Required Distinctions

```text
safe envelope ≠ raw runtime dump · safe envelope ≠ rendered message persistence · safe envelope ≠ delivery artifact ·
safe envelope ≠ provider output · safe envelope ≠ hidden reasoning · safe envelope ≠ secret material ·
safe envelope ≠ AthleteDecision · safe envelope ≠ recommendation quality proof · safe envelope ≠ truth proof ·
reflection-ready ≠ delivered ≠ AthleteDecision · deliveryWithheld ≠ delivery failure ·
decisionCapture invitation ≠ AthleteDecision · admission success ≠ truth · validateDraft success ≠ recommendation quality ·
Aurora advises, the athlete decides · Aurora never presents inference as fact
```

---

## 9. Relationship To Existing Architecture

- **Spec 040** — implements its envelope/redaction contract as a pure production type + mapper.
- **Spec 039 / Impl 039-A** — the local test envelope; 040-A promotes the *contract* (not the local type) to an
  enforceable production projection; the 039-A test type is left unchanged.
- **Impl 032R-A** — `offlineReflectionRuntime`, whose exported `OfflineReflectionRuntimeOutcome` the mapper
  consumes (runtime unchanged).
- **Spec 035 / Impl 035-A/B** — `ExternalRenderableRejectionReason` is the safe `admissionReason` code.
- **Spec 037 / Impl 037-A** — decision capture stays separate; the envelope carries only the invitation/ref.
- **Impl 025** — the application-orchestration import guard the mapper must honor (no upstream core).
- **Spec 034R / AC20** — whole-core composition stays a test harness; the mapper owns no core and composes nothing.

---

## 10. Open Questions (deferred to Implementation 040-A / a later slice)

1. Whether `reflectionFlags` is worth carrying or `reflectionRef` alone suffices (default: include the safe flags).
2. Whether a future invocation **helper** should wrap the runtime or only call this mapper (deferred).
3. Whether `safeReason` should be a closed union later rather than `string` (default: `string` from
   `trace.reasonCode`, documented).
4. When a CLI/API should be considered (deferred until a real caller appears).
5. Whether envelope persistence is ever needed (deferred; out of scope).

---

## 11. Implementation Task Preview

**Next mission: Implementation 040-A — session envelope mapper + type (production, pure).** Add
`operator-session-envelope.ts` (`OperatorSessionEnvelope` + pure `toOperatorSessionEnvelope`), export it from
`application/index.ts`, and add `operator-session-envelope.test.ts` + `…-negative-capability.test.ts` proving the
whitelist mapping, the redaction excludes, purity, and the guards; no runtime/provider/delivery/whole-core/CLI
change. After it lands, **Docs consolidation post 040**.

---

## 12. Success Criteria

Can Aurora realize the session envelope/redaction contract as a **pure production type + mapper** —
`toOperatorSessionEnvelope(outcome)` producing a stable, whitelisted, reference-only `OperatorSessionEnvelope`
(exact disposition, `deliveryWithheld`, `rawRetained: false`, `reflectionRef?` + safe flags, decision-capture
invitation/ref, `admissionReason?`, `safeReason?`, `intakeStatus`, `mediation`, ref-only `traceSummary`), always
excluding raw provider output / hidden reasoning / secrets / delivery artifact / `AthleteDecision` — **without**
invoking the runtime, a provider, or delivery; **without** a helper/CLI/API/persistence; **without** importing
upstream core; and **without** an AC20 amendment? **Yes — via Option C:** an import-safe pure mapper + type in
`application-orchestration`, with tests + a negative-capability guard; the invocation helper stays deferred;
implementation is `Implementation 040-A`. Validation at authorship: `tsc --noEmit` clean; `node --test` 810/810;
no code, test, package, runtime, CLI, deployment, CI, SDK, or dependency change introduced by this document; AC20
untouched.
