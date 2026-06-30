# Aurora — Technical Spec 039A — Thin Operator Invocation Surface Implementation Plan

> **Status (2026-06-29).** Technical Specification phase for Spec 039 (`28d2356`). It translates the thin
> operator invocation surface boundary into a TS-strict implementation plan **grounded in the real code**. It is
> **plan only**: it implements no code, modifies no production code/test, edits no package file, adds no
> CLI/runtime shell/script/package command, adds no API/UI/worker/DB/auth/deployment/CI/SDK file, amends no guard
> (AC20 untouched), and creates no production whole-core composer. Recent sequence: `aebb11c` (Impl 038-A) →
> `85b8132` (Docs) → `d448b4b` (Roadmap checkpoint) → `28d2356` (Spec 039). Validation at authorship:
> `tsc --noEmit` clean; `node --test` 803/803.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — not Implementation. It plans **Implementation 039-A** and writes
no code/test.

---

## 1. Context recap

`[FACT]` Spec 039 decided (Option A + B-deferred + C-likely): the thin operator invocation surface is a
**reusable behavioral seam** meaning "invoke the operator session runbook once" — accepting only a
caller-assembled `OfflineReflectionRuntimeCommand` + injected deterministic deps, calling only
`admitExternalRenderable` + `offlineReflectionRuntime`, and returning a **safe, redacted session result
envelope** mirroring the existing runtime dispositions; delivery withheld; no live provider / real secret /
`process.env` by default; no `AthleteDecision` (later capture stays separate); no whole-core composition. CLI,
script, package command, API/UI, deployment, provider, persistence, and a forward-only production wrapper are
out of scope. This plan decides *how to prove the seam* (and how little to build).

---

## 2. Real-Code Gap Analysis (grounded; no invented type names)

1. **`offlineReflectionRuntime` command shape (Q1).** `OfflineReflectionRuntimeCommand<TSubmission> = {
   submission: TSubmission; athleteRef: string; request: RenderingRequest; operatorMediation:
   OperatorMediationMarker; timing: OrchestrationTiming; ids?: OrchestrationIds }`.
2. **Deps shape (Q2).** `OfflineReflectionRuntimeDependencies<TSubmission> = { runManualIntake:
   ManualIntakeStep<TSubmission>; client: ProviderClientBoundary; config: ProviderClientConfig; secret:
   ProviderSecretRef; rendererKind: string; providerAdapterKind: string; renderedMessageRecordRepository:
   RenderedMessageRecordRepository }`.
3. **Outcome shape (Q3).** `OfflineReflectionRuntimeOutcome = { status: OfflineReflectionStatus; reflection?:
   SafeReflectionProjection; deliveryWithheld: true; mediation: { operatorRef: string }; decisionCapture:
   DecisionCapturePrompt; intake: { status: ManualReflectionIntakeOutcome["status"] }; admissionReason?:
   ExternalRenderableRejectionReason; trace: OrchestrationTrace; rawRetained: false }`.
4. **`OfflineReflectionStatus` union (Q4).** `reflection-ready | input-rejected | renderable-inadmissible |
   not-rendered | recording-failed | unexpected-failure` (with `OFFLINE_REFLECTION_STATUSES`).
5. **`reflection-ready` fields (Q5).** `reflection` present (`SafeReflectionProjection = { text, kind, voice?,
   presentedAs: "reflection", uncertaintyPreserved, limitationsPreserved, traceabilityPreserved, validationPassed:
   true }`), `deliveryWithheld: true`, `decisionCapture` invitation, `trace.renderedMessageRecordId` set.
6. **`renderable-inadmissible` fields (Q6).** `admissionReason` (safe closed `ExternalRenderableRejectionReason`),
   `deliveryWithheld: true`, `trace.stoppedAt: "stopped"`, `trace.renderedMessageRecordId: undefined`, no
   `reflection`, `decisionCapture` invitation.
7. **`not-rendered` fields (Q7).** no `reflection`, `deliveryWithheld: true`, `decisionCapture` invitation,
   `trace` reflecting provider-not-rendered (incl. `validateDraft` failure; safe `trace.reasonCode` may be set).
8. **`input-rejected` fields (Q8).** no `reflection`, `deliveryWithheld: true`, `decisionCapture` invitation;
   stops before admission/rendering (`trace.renderedMessageRecordId: undefined`).
9. **`recording-failed` / `unexpected-failure` (Q9).** Both safe stops in the union; safe result, no raw content;
   `deliveryWithheld: true`, `decisionCapture` invitation, no `reflection`.
10. **`deliveryWithheld` behavior (Q10).** Always `true`; `trace.deliveryRecordId`/`deliveryRequestId` stay
    `undefined`. Delivery withheld ≠ delivery failure.
11. **`decisionCapture` prompt/ref shape (Q11).** `DecisionCapturePrompt = { kind:
    "athlete-decision-invitation"; athleteRef: string; acceptableSources: readonly ["athlete-declared",
    "athlete-reported"] }` — invitation only.
12. **`mediation` field shape (Q12).** `{ operatorRef: string }` — operational only; never decision ownership.
13. **`intake` field shape (Q13).** `{ status: ManualReflectionIntakeOutcome["status"] }` — safe summary only
    (no raw observation content).
14. **`trace` shape (Q14).** `OrchestrationTrace = { stoppedAt: OrchestrationStage; providerAttemptRecordId?;
    renderedMessageRecordId?; renderReviewId?; displayEligibility?: "eligible"|"ineligible"; deliveryRequestId?;
    deliveryRecordId?; eventRecordIds?; reasonCode? }` — **all ref ids / safe codes**, no raw content.
15. **`rawRetained` behavior (Q15).** Always `false` on the outcome — the runtime is already redacted-by-design
    (no raw provider draft/response/prompt/payload/secret/env retained).
16. **Package scripts today (Q16).** `typecheck` (`tsc --noEmit`), `test` (`node --test "src/**/*.test.ts"`),
    `check`. No operator-session/invocation script.
17. **Absence of CLI/operator-session script (Q17).** None; the only `scripts/` file is `operator-live-smoke.mjs`
    (separate operational smoke). No invocation entrypoint.
18. **Test-only runbook proof sequence (Q18).** `src/modules/__tests__/operator-session-runbook.test.ts` (+8)
    composes whole-core → `renderableFromTerminalOutput` → `req` → runs `admitExternalRenderable` +
    `offlineReflectionRuntime`, asserting per-outcome obligations + cross-path no-delivery/no-decision; the
    app-orch `tests/offline-reflection-runtime.test.ts` exercises the runtime with **fixture** renderables
    (`req`/`supportRenderable`/`noVoiceSupportRenderable`) and a fake provider.
19. **Current redaction utilities (Q19).** No dedicated redaction helper; redaction is **structural** — the
    outcome already carries only safe fields (`rawRetained: false`; ref-only `trace`; `SafeReflectionProjection`;
    safe `intake.status`/`admissionReason`). The 036-A/038-A harnesses additionally JSON-scan for banned
    substrings (`athletedecision`, `"choice"`, `ref:fake`, `bearer`, `process.env`).
20. **AC20 guard constraints (Q20).** AC20a — no new top-level production module beyond the nine allowlisted +
    `__tests__`; AC20b — no **production** file imports all four core surfaces (test files excluded from the
    scan). Impl 025 guard: `application-orchestration` production files must not import
    observation/reasoning/understanding/athlete.

`[FACT]` Decisive consequence: the runtime outcome is **already safe and disposition-bearing** (`rawRetained:
false`, ref-only `trace`, `SafeReflectionProjection`, safe `intake`/`admissionReason`). A *forward-only*
production wrapper would add **no safety**. The seam's only safety-adding move is to **narrow** the outcome to a
**reference-only envelope** (a reflection *ref* instead of the full reflection text; a decision-capture *ref*
instead of the full prompt; a ref-only trace summary) and to **normalize** dispositions — value worth **proving
first in a test**, not shipping as production code yet.

---

## 3. Central Question

> Should the thin operator invocation seam be implemented first as a **test-only helper/proof**, a **production
> application-level helper**, or remain **documented usage** — preserving caller-assembled `RenderingRequest`,
> AC20, no-default-live-call, delivery withheld, a safe redacted envelope, and no automatic `AthleteDecision`?

**Answer:** a **test-only invocation helper/proof** that defines and exercises the **safe reference-only envelope
semantics** (a local helper + envelope type inside the test) over the existing `admitExternalRenderable` +
`offlineReflectionRuntime` — **no production code**. A production application-level helper is **deferred** to a
later slice, warranted **only** if a real caller needs the narrowed envelope as a shipped surface (and only if it
adds the envelope/redaction value, imports no upstream core, and assembles nothing).

---

## 4. Required Technical Decisions (Engineering Playbook format)

### `[DECISION]` Decision 1 — Implementation scope → **Option B (test-only invocation helper/proof); no production code**

Implementation 039-A adds **one test-only proof** that defines a **local** invocation helper + safe envelope type
(inside the test file) and exercises the seam across every disposition. Rejected: **A** (documented usage alone)
— Spec 039's *reference-only envelope semantics* (narrowing the full reflection/prompt to refs) benefit from
executable proof; **C** (production application-level helper) — **deferred**: the runtime outcome is already safe,
so a helper adds value only as a *narrowed* envelope a real caller needs; not yet justified, and it must be its
own later slice with strict guards; **D/E** (CLI/script/package, API/UI) — premature surfaces (Spec 039 rejected);
**F** (production whole-core invocation composer) — AC20b forbids it. If, during implementation, a concrete caller
demonstrably needs the envelope as a shipped surface, escalate to **C** with the §4.4 safety conditions.

### `[DECISION]` Decision 2 — Placement → **`src/modules/__tests__/thin-operator-invocation-surface.test.ts`**

The proof reuses the **whole-core / runbook setup** (the preferred assembly path needs a real `TerminalOutput`),
so it must live in the neutral `src/modules/__tests__/` root where AC20 excludes test files from the production
import scan (as 036-A/038-A do). **Not** `application-orchestration/tests/thin-operator-invocation-surface.test.ts`
— that location is for tests using already-supplied/fixture renderables without whole-core imports. **No**
production module; **no** `src/modules/session`; **no** new top-level module.

### `[DECISION]` Decision 3 — Safe result envelope → **a `[PROPOSED]` local, reference-only envelope (test-defined)**

The proof defines a **local** envelope type inside the test file (not a production type). `[PROPOSED]` name/shape
(final names deferred to implementation):

```text
OperatorInvocationResult = {
  status: OfflineReflectionStatus;            // exact runtime status (no rename)
  deliveryWithheld: true;                     // mirrored
  rawRetained: false;                         // mirrored / re-asserted
  reflectionRef?: string;                     // present only on reflection-ready; a REF (e.g. trace.renderedMessageRecordId), NOT reflection.text
  decisionCapture: DecisionCapturePrompt;     // invitation/ref only (never an AthleteDecision)
  admissionReason?: ExternalRenderableRejectionReason; // present only on renderable-inadmissible (safe closed code)
  safeReason?: string;                        // safe closed code on failure (e.g. trace.reasonCode); never raw content
  traceSummary: { stoppedAt: OrchestrationStage; renderedMessageRecordId?: string; displayEligibility?: "eligible"|"ineligible" }; // ref-only subset
}
```

The envelope **must exclude**: raw provider output, hidden reasoning, secret material, delivery artifact, any
`AthleteDecision` (`choice`/`rationale`), and any unsafe raw runtime internals. The proof asserts these via
field checks **and** a JSON-scan for banned substrings (mirroring 036-A/038-A).

### `[DECISION]` Decision 4 — Wrapper value → **safety only via narrowing; a forward-only wrapper is rejected**

The seam adds safety **only** if it: normalizes runtime outcomes; **narrows** `reflection` → `reflectionRef` and
the full `trace` → a ref-only `traceSummary`; re-asserts `rawRetained: false`; mirrors `deliveryWithheld`;
exposes the decision-capture invitation **only** as invitation/ref; and prevents a caller from treating the
outcome as delivery or decision. A wrapper that merely forwards the outcome unchanged adds **no** safety and is
**rejected**. 039-A proves these semantics in a test; a production helper that owns them is a deferred,
separately-guarded slice.

### `[DECISION]` Decision 5 — Dependency behavior → **deterministic fakes only; nothing live by default**

The proof uses the existing deterministic deps: `FakeProviderClient`, in-memory repos, a **fake**
`ProviderSecretRef`, and the injected `runManualIntake`. **No** live provider, **no** real-secret resolution,
**no** `process.env` read, **no** delivery sink, **no** cloud-secret adapter — by default and throughout.

### `[DECISION]` Decision 6 — Status mapping → **preserve exact runtime statuses (no rename)**

The envelope's `status` is the **exact** `OfflineReflectionStatus` (`reflection-ready`,
`renderable-inadmissible`, `not-rendered`, `input-rejected`, `recording-failed`, `unexpected-failure`). No rename
— "runtime status" and "invocation disposition" are the **same** value; the envelope adds *narrowing/redaction*,
not a new vocabulary. (If a future production helper ever needs to distinguish them, that rename must be
justified then; 039-A does not.)

### `[DECISION]` Decision 7 — Later decision capture → **invitation/ref in the envelope; capture stays separate**

The envelope carries the `decisionCapture` invitation/ref **only**; it never carries an `AthleteDecision`. Later
capture remains the **separate** explicit Impl 037-A flow (`athleteDecision(...)` + `decisionContext({
decisionSupportCaseRef })` + `recordAthleteDecision(...)`), and operator-scribe rules stay **outside** invocation.
The proof asserts invocation creates no decision and that capture, when done separately, links via the session's
`sourceCaseRef`.

### `[DECISION]` Decision 8 — Guards → **reuse the existing negative-capability style; no new production guard needed**

Because 039-A is **test-only**, all existing guards (AC20, Impl 025 application-orchestration import guard,
scripts/package guards) stay green unchanged. The proof additionally asserts (in-harness): no `AthleteDecision`
on any path; `offlineReflectionRuntime` exercised unchanged; `deliveryWithheld` preserved; no live provider /
real secret / `process.env` / delivery sink; the envelope excludes raw output/reasoning/secrets. No new
`*-negative-capability.test.ts` is required (none would be — there is no new production file); **no production
file is read/modified**.

---

## 5. Required File Layout (Implementation 039-A)

```text
src/modules/__tests__/thin-operator-invocation-surface.test.ts   (new — test-only proof; local helper + envelope type inside the file)
```

**No production file changes.** **Must NOT create:** `src/modules/{session,runtime,api,server,ui,frontend,
worker,auth,db}/`, `application-orchestration/application/operator-invocation-surface.ts` (deferred to a future
production-helper slice, if ever), `scripts/operator-session.mjs`, `scripts/run-operator-session.mjs`. **Must NOT
edit:** `package.json`, `package-lock.json`, `scripts/operator-live-smoke.mjs`. **Must NOT integrate with:** a
deployment target, provider selection, cloud-secret adapters, delivery sinks, event persistence, an
auth/session/user system.

*(If Decision 1 were ever escalated to Option C, the production-helper layout would be
`application-orchestration/application/operator-invocation-surface.ts` + its `index.ts` export +
`application-orchestration/tests/operator-invocation-surface.test.ts` +
`...-negative-capability.test.ts` — importing no upstream core, assembling nothing, reading no env, calling no
delivery. **Not built in 039-A.**)*

---

## 6. Required Test Plan (Implementation 039-A)

Deterministic; the local helper invokes the seam once and returns the narrowed envelope:

1. Safe invocation returns a `reflection-ready` envelope.
2. Envelope preserves `deliveryWithheld: true`.
3. Envelope preserves `rawRetained: false`.
4. Envelope exposes a safe reflection **ref**/summary only (never `reflection.text` raw provider output).
5. Envelope exposes the decision-capture invitation/ref only.
6. Envelope excludes any `AthleteDecision`.
7. Envelope excludes raw provider output.
8. Envelope excludes hidden reasoning.
9. Envelope excludes secret material.
10. `renderable-inadmissible` maps to a safe reason / `admissionReason`.
11. `not-rendered` maps without raw provider output.
12. `input-rejected` stops before admission/rendering.
13. `recording-failed` / `unexpected-failure` map safely if exercised.
14. No live provider is called by default.
15. No real secret is resolved by default.
16. No `process.env` is read.
17. No delivery sink is called.
18. No CLI/script/package command is added.
19. `offlineReflectionRuntime` remains unchanged.
20. No production whole-core composer; 21. AC20 remains green; 22. all existing tests remain green.

---

## 7. Boundary / Import Rules

**Allowed (in the `__tests__/` proof):** a **local** helper/envelope type defined inside the test file; whole-core
surfaces (for the preferred assembly path) + `rendering` + `application-orchestration` (`offlineReflectionRuntime`,
`admitExternalRenderable`, `OFFLINE_REFLECTION_STATUSES`) + athlete decision machinery + `decisionAsObservation`
+ deterministic fakes; reuse/reproduce the runbook setup. **Forbidden:** a production whole-core composer; a
`reflection-composition` module; `application-orchestration` **production** files importing upstream core; a
CLI/runtime shell; a script/package command; an API/UI/operator tool; automatic delivery / live provider /
real-secret resolution / `AthleteDecision` creation; DB/auth/session/deployment files; SDK/dependency changes.

---

## 8. Required Distinctions

```text
invocation surface ≠ CLI · invocation surface ≠ script · invocation surface ≠ package command ·
invocation surface ≠ deployment · invocation surface ≠ API/UI · invocation surface ≠ live-provider enablement ·
invocation surface ≠ delivery mechanism · invocation surface ≠ whole-core composer ·
invocation surface ≠ AthleteDecision creator · safe envelope ≠ raw runtime dump · reflection-ready ≠ delivered ·
reflection-ready ≠ AthleteDecision · deliveryWithheld ≠ delivery failure · admission success ≠ truth ·
validateDraft success ≠ recommendation quality · decision-capture invitation ≠ AthleteDecision ·
Aurora advises, the athlete decides · Aurora never presents inference as fact
```

---

## 9. Relationship To Existing Architecture

- **Spec 039** — implements its invocation seam as a test-only proof (envelope semantics), production helper deferred.
- **Spec 038 / Impl 038-A** — the runbook the seam invokes once; the proof reuses its setup.
- **Spec 037 / Impl 037-A** — post-reflection capture; stays a separate flow after invocation.
- **Spec 036 / Impl 036-A** — the session path the seam runs.
- **Spec 035 / Impl 035-A/B** — `admitExternalRenderable` the seam runs before rendering.
- **Impl 032R-A** — `offlineReflectionRuntime`, invoked unchanged; its safe outcome is what the envelope narrows.
- **Impl 027 / 021/022/023/028/029** — operator live smoke + live-provider/secret boundaries stay
  operational/opt-in/deferred; the seam never enables them by default.
- **Spec 034R / AC20** — whole-core composition stays a test harness; no production whole-core composer.

---

## 10. Open Questions (deferred to Implementation 039-A / a later slice)

1. The exact local helper/envelope name in the proof (final production name deferred).
2. Whether `reflectionRef` derives from `trace.renderedMessageRecordId` or a dedicated safe ref.
3. Whether a production application-level helper (Option C) is ever warranted (only if a real caller needs the
   shipped narrowed envelope) — and its strict guard set.
4. Whether redaction utilities should be extracted (default: no — the outcome is already safe; the proof narrows
   locally).
5. Whether a CLI/API remains deferred until after the helper proof (Spec 039: yes, deferred).

---

## 11. Implementation Task Preview

**Next mission: Implementation 039-A — thin operator invocation surface proof (test-only).** Add
`src/modules/__tests__/thin-operator-invocation-surface.test.ts` defining a local invocation helper + safe
reference-only envelope type and exercising the seam across every disposition (`reflection-ready` /
`renderable-inadmissible` / `not-rendered` / `input-rejected`, plus the no-live/no-delivery/no-decision/redaction
invariants), reusing the runbook setup; no production change. After it lands, **Docs consolidation post 039**.

---

## 12. Success Criteria

Can Aurora prove the thin operator invocation seam — caller-assembled command + injected deterministic deps →
`admitExternalRenderable` + `offlineReflectionRuntime` → a **safe, narrowed, reference-only result envelope**
mirroring the exact runtime dispositions, delivery withheld, no live provider/real secret/`process.env`/delivery
by default, no `AthleteDecision`, capture kept separate — **without** new production code, a forward-only wrapper,
a CLI/shell/script/package command, an API/UI, persistence/auth, a deployment/provider decision, a production
whole-core composer, or an AC20 amendment? **Yes — via Option B:** one `__tests__/` proof defining and exercising
the envelope semantics; production helper (Option C) deferred; implementation is `Implementation 039-A`.
Validation at authorship: `tsc --noEmit` clean; `node --test` 803/803; no code, test, package, runtime, CLI,
deployment, CI, SDK, or dependency change introduced by this document; AC20 untouched.
