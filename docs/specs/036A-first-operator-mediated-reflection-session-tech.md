# Aurora — Technical Spec 036A — First Operator-Mediated Reflection Session Implementation Plan

> **Status (2026-06-29).** Technical Specification phase for Spec 036 (`f44c9d6`). It translates the session
> contract into a TS-strict implementation plan **grounded in the real code**. It is **plan only**: it
> implements no code, modifies no production code/test, edits no package file, adds no script/CLI/runtime
> shell, adds no API/UI/worker/DB/auth/deployment/CI/SDK file, amends no guard (AC20 untouched), and creates
> no production whole-core composer / `reflection-composition` module. Recent sequence: `268ccf2` (Impl 035-B)
> → `0c6f8d2` (Docs) → `e80e2d8` (Roadmap) → `f44c9d6` (Spec 036). Validation at authorship: `tsc --noEmit`
> clean; `node --test` 779/779.

---

## 0. Phase confirmation

This is the **Technical Specification** phase — not Implementation. It plans **Implementation 036-A** and
writes no code/test.

---

## 1. Context recap

`[FACT]` Spec 036 selected an offline operator-mediated session: a trusted operator supplies athlete manual
input + a caller-assembled, admission-gated `RenderingRequest` to `offlineReflectionRuntime`; preferred
assembly path is `TerminalOutput → renderableFromTerminalOutput`. AC20 keeps whole-core composition a test
harness; no production whole-core composer.

---

## 2. Surface Gap Analysis (grounded in real code)

1. **`offlineReflectionRuntime` command (Q1).** `OfflineReflectionRuntimeCommand<TSubmission>`:
   `{ submission, athleteRef, request: RenderingRequest, operatorMediation: { operatorRef, mediatedAt },
   timing: OrchestrationTiming, ids? }`.
2. **Deps (Q2).** `OfflineReflectionRuntimeDependencies<TSubmission>`: `{ runManualIntake, client, config,
   secret, rendererKind, providerAdapterKind, renderedMessageRecordRepository }`.
3. **Outcome (Q3).** `OfflineReflectionRuntimeOutcome`: `{ status, reflection?, deliveryWithheld: true,
   mediation: { operatorRef }, decisionCapture, intake: { status }, admissionReason?, trace, rawRetained:
   false }`.
4. **`renderable-inadmissible` (Q4).** Status set when Tier 2 rejects; carries `admissionReason?`
   (`ExternalRenderableRejectionReason`), `deliveryWithheld: true`, `trace.stoppedAt: "stopped"`, no
   `reflection`.
5. **`reflection-ready` (Q5).** Carries `reflection: SafeReflectionProjection`
   (`{ text, kind, voice?, presentedAs: "reflection", uncertaintyPreserved, limitationsPreserved,
   traceabilityPreserved, validationPassed: true }`), `deliveryWithheld: true`.
6. **not-rendered / validation failure (Q6).** Orchestration `provider-not-rendered` (incl. `validateDraft`
   failure, e.g. FakeProviderClient `"voice-escalating"`, or credential `secret.status: "missing"`) →
   runtime `not-rendered`; no record, no `reflection`.
7. **`admitExternalRenderable` (Q7).** `admitExternalRenderable(request): ExternalRenderableAdmission`
   (`{ status, admitted, reason? }`); runs in the runtime **after** intake, **before** orchestration.
8. **`RenderingRequest` (Q8).** `{ renderable: RenderableDomainOutput; ...optional style }`; tests build via
   `req(renderable)`.
9. **`RenderableDomainOutput` (Q9).** `sourceCaseRef`, `kind`, `voice?`, `intent?`, `contentAtoms`,
   `allowedClaims`, `forbiddenClaims`, `uncertaintyVisibleRequired`, `limitations`, `traceability?`,
   `agencyRequired`, `conditions`.
10. **`TerminalOutput` (Q10).** `DecisionSupport | Inquiry | Withholding` (`.outcome` discriminator), from
    decision-support; DecisionSupport carries `VoiceMode` (Reflection in the reflection path).
11. **`renderableFromTerminalOutput` (Q11).** `renderableFromTerminalOutput({ sourceCaseRef, output:
    TerminalOutput, ... }): RenderableDomainOutput` — production rendering surface.
12. **Impl 006 harness steps producing a `TerminalOutput` (Q12).** `recordObservationSet` → `detectSignals` →
    `openHypothesis`/`attachSignalAsEvidence` → `reasoningOutcomeFrom`/`updateUnderstandingFromOutcome`/
    `produceUnderstandingAssessment` → `verifyTraceability`/`claimStateOf`/`openDecisionSupportCase`/
    `evaluateDecisionSupportCase` → `evaluated.selectedOutput` (a `TerminalOutput`).
13. **Steps that must stay test-only (Q13).** The whole-core composition above (it imports all four core
    surfaces) — AC20 forbids it in a production file; it lives in `__tests__/` only.
14. **Fake provider / deterministic rendering (Q14).** `FakeProviderClient({ scenario: "safe" })`,
    `config: { providerKind: "fake" }`, `secret: { status: "present", ref: "ref:fake" }`,
    `InMemoryRenderedMessageRecordRepository`.
15. **Manual input / `runManualIntake` (Q15).** Wrap the real `ingestManualInput({ submission,
    observationSetRepository })` (with an `InMemoryObservationSetRepository`) into the injected
    `runManualIntake` step, adapting `ManualInputIngestionOutcome` → `ManualReflectionIntakeOutcome`.
16. **Decision-capture prompt (Q16).** `{ kind: "athlete-decision-invitation", athleteRef, acceptableSources:
    ["athlete-declared", "athlete-reported"] }` — an invitation, never an `AthleteDecision`.
17. **`deliveryWithheld` (Q17).** Always `true`; the runtime wires no `DeliverySink`/`DeliveryRecordRepository`.
18. **AC20 guard (Q18).** AC20a (no new top-level module) + AC20b (no production file imports all four core
    surfaces); `__tests__/` files are **excluded** from AC20b's production scan.
19. **Script/package/CLI guards (Q19).** `scripts/` may contain only `operator-live-smoke.mjs`; no npm script
    invokes product entrypoints; devDependencies fixed.
20. **Module export conventions (Q20).** Public via module `index.ts`; tests import from `../index.ts` /
    `../../<module>/index.ts` and `../../rendering/tests/fixtures.ts`.

`[FACT]` Decisive consequence: the session's **only** novel element vs. existing tests is *composing the
real-`TerminalOutput` assembly path into `offlineReflectionRuntime` end-to-end*. Because that assembly imports
all four cores, it **must** live in `__tests__/` (AC20). No production code is needed — `offlineReflectionRuntime`
is already the product-runtime surface.

---

## 3. Central Question

> Should the first operator-mediated reflection session be a deterministic test-level session harness, a thin
> production wrapper, or documented usage only — preserving AC20, delivery-withheld, mandatory admission,
> mandatory `validateDraft`, and athlete decision ownership?

**Answer:** a **deterministic test-level session harness** under `src/modules/__tests__/` — **no production
wrapper, no CLI**. The harness composes a real `TerminalOutput` (Impl 006 pattern) → `renderableFromTerminalOutput`
→ `RenderingRequest`, runs `offlineReflectionRuntime` end-to-end, and proves the safe / inadmissible /
validation-failure / input-rejected sessions. Whole-core composition stays test-only; AC20 intact.

---

## 4. Required Technical Decisions (Engineering Playbook format)

### `[DECISION]` Decision 1 — Scope → **Option A: deterministic test-level session harness only**

Implementation 036-A is a **single new test** proving the first operator-mediated reflection session
end-to-end. Rejected: **B** (thin production wrapper) — adds no safety beyond `offlineReflectionRuntime` and
risks importing upstream cores; **C** (documented usage only) — the contract deserves executable proof; **D**
(CLI/operator command) — premature runtime shell (Roadmap §3); **E** (production whole-core session composer)
— AC20 forbids it. Option A proves the session while keeping whole-core assembly in tests.

### `[DECISION]` Decision 2 — Placement → **`src/modules/__tests__/first-operator-mediated-reflection-session.test.ts`**

The harness composes the real whole-core chain to obtain a `TerminalOutput` (imports all four core surfaces),
so it **must** live in the neutral `__tests__/` root (AC20b excludes test files; this mirrors
`end-to-end-responsible-reflection.test.ts`). **Not** `application-orchestration/tests/` (those files must not
import all four cores) and **not** a production module.

### `[DECISION]` Decision 3 — Production wrapper → **none**

No production wrapper in 036-A. `offlineReflectionRuntime` is already the product-runtime surface; a wrapper
would either add nothing or risk importing upstream cores. The session is **documented usage proven by a test
harness**. (If a future, non-test caller needs a wrapper that takes an *already-assembled* `RenderingRequest`,
that is a separate, later slice — and even then it must import no upstream core.)

### `[DECISION]` Decision 4 — Assembly path → **`TerminalOutput → renderableFromTerminalOutput → req(...)`**

In the harness: run the Impl 006 chain to a real `TerminalOutput`, then
`renderableFromTerminalOutput({ sourceCaseRef, output })` → `req(renderable)` → `RenderingRequest`. This is
the preferred Tier-1-satisfying assembly. It preserves: whole-core assembly in harness ≠ production composer;
`renderableFromTerminalOutput` preferred ≠ machine proof of Tier 1 truth; admission still required; `validateDraft`
still required. (For negative cases, the harness may also hand-build inadmissible renderables via the rendering
fixtures.)

### `[DECISION]` Decision 5 — Session outcome expectations → **existing statuses only**

```text
safe session (real TerminalOutput → admitted → rendered + validated) → reflection-ready
inadmissible renderable (fails Tier 2)                                → renderable-inadmissible
admitted but invalid draft (e.g. voice-escalating fake / missing secret) → not-rendered
manual input rejected                                                  → input-rejected
```

No new status is introduced (036-A adds no production change).

### `[DECISION]` Decision 6 — Delivery & decision behavior → **withheld; no decision created**

Prove: `deliveryWithheld: true` on all paths; no `DeliverySink` wired/invoked; no `AthleteDecision` created;
`decisionCapture` is an `athlete-decision-invitation` (not a decision); `mediation.operatorRef` is operational
(operator mediation ≠ athlete decision).

### `[DECISION]` Decision 7 — Provider behavior → **deterministic fake only**

`FakeProviderClient` (`"safe"` for reflection-ready; `"voice-escalating"` for the validation-failure case);
no live provider; no real secret (sentinel `ref:fake`); no `process.env`.

### `[DECISION]` Decision 8 — Guards

The harness itself (in `__tests__/`) plus the existing AC20 test keep the invariants. 036-A adds **no
production file**, so the existing negative-capability guards (application-orchestration, scripts/package, AC20)
continue to pass unchanged. The new test re-asserts, inline, that it introduces no script/CLI/package change
and creates no `AthleteDecision`.

---

## 5. Required File Layout (Implementation 036-A)

```text
src/modules/__tests__/first-operator-mediated-reflection-session.test.ts   (new — test-level session harness)
```

**No production file changes.** **Must NOT create:** `src/modules/{reflection-composition,session,runtime,
api,server,ui,frontend,worker,auth,db}/`, `scripts/operator-reflection-session.mjs`. **Must NOT edit:**
`package.json`, `package-lock.json`, `scripts/operator-live-smoke.mjs`.

---

## 6. Required Test Plan (Implementation 036-A)

Deterministic; the harness composes the Impl 006 chain → real `TerminalOutput` → `renderableFromTerminalOutput`
→ `RenderingRequest`, then runs `offlineReflectionRuntime`:

1. A first operator-mediated session produces `reflection-ready`.
2. The session uses a caller-assembled `RenderingRequest` (built in the harness, not by a production composer).
3. The preferred assembly path is `TerminalOutput → renderableFromTerminalOutput` (the renderable's
   `sourceCaseRef`/voice/uncertainty derive from the real `TerminalOutput`).
4. Admission runs before rendering (a renderable that fails Tier 2 never reaches the provider).
5. An inadmissible renderable → `renderable-inadmissible`.
6. An inadmissible renderable does not call the provider (throwing client never invoked).
7. An admitted renderable still goes through `validateDraft` (reflection-ready carries `validationPassed: true`).
8. A validation/credential failure → `not-rendered` (fail-closed via existing runtime behavior).
9. Delivery is withheld (`deliveryWithheld: true`) on every path.
10. No `DeliverySink` is invoked (none wired).
11. No `AthleteDecision` is created.
12. The decision-capture prompt/ref is an invitation, not an `AthleteDecision`.
13. Operator mediation is not an athlete decision (`mediation.operatorRef` is operational; athlete remains owner).
14. No live provider / real secret / `process.env` is required.
15. Whole-core composition remains test-only (the harness lives in `__tests__/`).
16. No production whole-core composer is introduced (no production file change).
17. No CLI/script/package command is introduced (asserted inline).
18. AC20 remains green (the existing AC20 test still passes).
19. All existing tests remain green (779 + new).

---

## 7. Boundary / Import Rules

**Allowed (in the `__tests__/` harness):** imports from observation/reasoning/understanding/decision-support/
rendering (whole-core assembly is allowed in `__tests__/`); imports from the application-orchestration runtime;
the deterministic fake provider; the rendering test fixtures. **Forbidden (production):** a production file
importing all four core surfaces; a `reflection-composition` module; application-orchestration upstream
imports; a CLI/runtime shell; a script; a package command; deployment/CI/SDK files; DB/auth implementation.

---

## 8. Required Distinctions

```text
operator-mediated session ≠ operator smoke · operator mediation ≠ athlete decision ·
session harness ≠ production whole-core composer · test harness ≠ production service ·
caller-supplied RenderingRequest ≠ truth · admitted ≠ evidence-backed fact ·
validateDraft ≠ recommendation quality · reflection-ready ≠ delivered · delivery withheld ≠ delivery failure ·
decision-capture prompt ≠ AthleteDecision · AC20 seam ≠ whole-core composer
```

---

## 9. Relationship To Existing Architecture

- **Spec 036** — realizes the session contract as a test-level harness.
- **Impl 032R-A / 035-A / 035-B** — the harness drives `offlineReflectionRuntime` with its wired Tier 2
  admission; no runtime change.
- **Impl 006 / AC20** — reuses the whole-core harness pattern in `__tests__/`; no production whole-core owner.
- **rendering** — `renderableFromTerminalOutput` is the production assembly surface used by the harness.
- **Impl 014 / 009** — `validateDraft` mandatory; `AthleteDecision` athlete-declared/reported, none created.

---

## 10. Open Questions (deferred to Implementation 036-A / later)

1. Whether to also assert the reflection text is non-empty + inference-marked (likely yes).
2. Whether to cover a `withholding` `TerminalOutput` path (decision-support withholds → no renderable / or a
   withholding renderable) as an additional safe case.
3. Whether a later non-test caller ever needs a thin wrapper over an *already-assembled* `RenderingRequest`
   (separate slice; must import no upstream core).
4. How later athlete decision capture is positioned (out of scope for 036-A).

---

## 11. Implementation Task Preview

**Next mission: Implementation 036-A — first operator-mediated reflection session harness (test-only).** Add
`src/modules/__tests__/first-operator-mediated-reflection-session.test.ts` composing a real `TerminalOutput`
→ `renderableFromTerminalOutput` → `RenderingRequest` and running `offlineReflectionRuntime` to prove the safe
/ inadmissible / validation-failure / input-rejected sessions; no production change. After it lands, **Docs
consolidation post 036** (the session is now proven end-to-end; the four canonical docs note the first
operator-mediated reflection session exists as a test-level proof).

---

## 12. Success Criteria

Can Aurora plan the first operator-mediated reflection session as a deterministic, AC20-respecting proof —
composing a real `TerminalOutput` → `renderableFromTerminalOutput` → `RenderingRequest` and running
`offlineReflectionRuntime` end-to-end — **without** a production wrapper, CLI, script, whole-core composer, or
any deployment/provider/DB/auth/CI change, and preserving delivery-withheld, mandatory admission, mandatory
`validateDraft`, and athlete decision ownership? **Yes — via Option A** (a single `__tests__/` session
harness; no production code). Next: `Implementation 036-A`. Validation at authorship: `tsc --noEmit` clean;
`node --test` 779/779; no code, test, package, runtime, CLI, deployment, CI, SDK, or dependency change
introduced by this document; AC20 untouched.
